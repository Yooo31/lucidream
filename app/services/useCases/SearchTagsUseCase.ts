import {
  isNonEmptyString,
  type Clock,
  type FeatureGateDecision,
  type Tag,
  type TagType,
  type ValidationIssue,
} from '../../domain';
import type {
  DreamRepository,
  LicenseRepository,
  TagRepository,
  UsageLogRepository,
} from '../repositories';

import {
  resolveFeatureGateFromRepositories,
  type FeatureGateResolverDependencies,
} from './featureGateResolver';

export interface SearchTagsInput {
  type: TagType;
  query: string;
  limit?: number;
}

interface SearchTagsSuccess {
  ok: true;
  tags: readonly Tag[];
  decision: FeatureGateDecision;
  appliedLimit: number | null;
}

interface SearchTagsValidationFailure {
  ok: false;
  code: 'VALIDATION_FAILED';
  issues: readonly ValidationIssue[];
}

export type SearchTagsResult = SearchTagsSuccess | SearchTagsValidationFailure;

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function validateInput(input: SearchTagsInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isNonEmptyString(input.query)) {
    issues.push({
      field: 'query',
      message: 'query is required.',
    });
  }

  if (input.limit !== undefined && !isNonNegativeInteger(input.limit)) {
    issues.push({
      field: 'limit',
      message: 'limit must be a non-negative integer.',
    });
  }

  return issues;
}

function resolveAppliedLimit(
  requestedLimit: number | undefined,
  gateLimit: number | null,
): number | null {
  if (requestedLimit === undefined && gateLimit === null) {
    return null;
  }

  if (requestedLimit === undefined) {
    return gateLimit;
  }

  if (gateLimit === null) {
    return requestedLimit;
  }

  return Math.min(requestedLimit, gateLimit);
}

export class SearchTagsUseCase {
  private readonly featureGateDependencies: FeatureGateResolverDependencies;

  constructor(
    private readonly tagRepository: TagRepository,
    dreamRepository: DreamRepository,
    licenseRepository: LicenseRepository,
    usageLogRepository: UsageLogRepository,
    clock: Clock,
  ) {
    this.featureGateDependencies = {
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      clock,
    };
  }

  async execute(input: SearchTagsInput): Promise<SearchTagsResult> {
    const issues = validateInput(input);

    if (issues.length > 0) {
      return {
        ok: false,
        code: 'VALIDATION_FAILED',
        issues,
      };
    }

    const decision = await resolveFeatureGateFromRepositories(this.featureGateDependencies);
    const appliedLimit = resolveAppliedLimit(input.limit, decision.maxTagSearchResults);
    const tags = await this.tagRepository.searchByTypeAndName(
      input.type,
      input.query,
      appliedLimit === null ? undefined : appliedLimit,
    );

    return {
      ok: true,
      tags,
      decision,
      appliedLimit,
    };
  }
}
