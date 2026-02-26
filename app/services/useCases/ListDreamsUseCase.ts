import {
  isPositiveUnixTimestamp,
  type Clock,
  type Dream,
  type FeatureGateDecision,
  type ValidationIssue,
} from '../../domain';
import type {
  DreamHistoryQuery,
  DreamRepository,
  LicenseRepository,
  UsageLogRepository,
} from '../repositories';

import {
  getUtcTrailingDayRange,
  resolveFeatureGateFromRepositories,
  type FeatureGateResolverDependencies,
} from './featureGateResolver';

export interface ListDreamsInput {
  startCreatedAt?: number;
  endCreatedAt?: number;
  limit?: number;
  offset?: number;
}

interface ListDreamsSuccess {
  ok: true;
  dreams: readonly Dream[];
  decision: FeatureGateDecision;
  appliedStartCreatedAt: number;
  appliedEndCreatedAt: number;
}

interface ListDreamsValidationFailure {
  ok: false;
  code: 'VALIDATION_FAILED';
  issues: readonly ValidationIssue[];
}

export type ListDreamsResult = ListDreamsSuccess | ListDreamsValidationFailure;

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function validateInput(input: ListDreamsInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (input.startCreatedAt !== undefined && !isPositiveUnixTimestamp(input.startCreatedAt)) {
    issues.push({
      field: 'startCreatedAt',
      message: 'startCreatedAt must be a positive integer.',
    });
  }

  if (input.endCreatedAt !== undefined && !isPositiveUnixTimestamp(input.endCreatedAt)) {
    issues.push({
      field: 'endCreatedAt',
      message: 'endCreatedAt must be a positive integer.',
    });
  }

  if (input.limit !== undefined && !isNonNegativeInteger(input.limit)) {
    issues.push({
      field: 'limit',
      message: 'limit must be a non-negative integer.',
    });
  }

  if (input.offset !== undefined && !isNonNegativeInteger(input.offset)) {
    issues.push({
      field: 'offset',
      message: 'offset must be a non-negative integer.',
    });
  }

  return issues;
}

export class ListDreamsUseCase {
  private readonly featureGateDependencies: FeatureGateResolverDependencies;

  constructor(
    private readonly dreamRepository: DreamRepository,
    licenseRepository: LicenseRepository,
    usageLogRepository: UsageLogRepository,
    private readonly clock: Clock,
  ) {
    this.featureGateDependencies = {
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      clock,
    };
  }

  async execute(input: ListDreamsInput = {}): Promise<ListDreamsResult> {
    const issues = validateInput(input);

    if (issues.length > 0) {
      return {
        ok: false,
        code: 'VALIDATION_FAILED',
        issues,
      };
    }

    const decision = await resolveFeatureGateFromRepositories(this.featureGateDependencies);
    const requestedStartCreatedAt = input.startCreatedAt ?? 1;
    const requestedEndCreatedAt = input.endCreatedAt ?? this.clock.now();

    let appliedStartCreatedAt = requestedStartCreatedAt;
    let appliedEndCreatedAt = requestedEndCreatedAt;

    if (decision.maxHistoryDays !== null) {
      const range = getUtcTrailingDayRange(this.clock.now(), decision.maxHistoryDays);
      appliedStartCreatedAt = Math.max(requestedStartCreatedAt, range.startCreatedAt);
      appliedEndCreatedAt = Math.min(requestedEndCreatedAt, range.endCreatedAt);
    }

    if (appliedEndCreatedAt < appliedStartCreatedAt) {
      return {
        ok: true,
        dreams: [],
        decision,
        appliedStartCreatedAt,
        appliedEndCreatedAt,
      };
    }

    const query: DreamHistoryQuery = {
      startCreatedAt: appliedStartCreatedAt,
      endCreatedAt: appliedEndCreatedAt,
    };

    if (input.limit !== undefined) {
      query.limit = input.limit;
    }

    if (input.offset !== undefined) {
      query.offset = input.offset;
    }

    const dreams = await this.dreamRepository.listByCreatedAtRange(query);

    return {
      ok: true,
      dreams,
      decision,
      appliedStartCreatedAt,
      appliedEndCreatedAt,
    };
  }
}
