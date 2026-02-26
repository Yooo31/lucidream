import {
  validateDream,
  type Clock,
  type Dream,
  type DreamQuality,
  type FeatureGateDecision,
  type ValidationIssue,
} from '../../domain';
import type { DreamRepository, LicenseRepository, UsageLogRepository } from '../repositories';

import {
  resolveFeatureGateFromRepositories,
  type FeatureGateResolverDependencies,
} from './featureGateResolver';
import { RecordUsageLogUseCase, type UsageLogIdGenerator } from './RecordUsageLogUseCase';

export type DreamIdGenerator = () => string;

function createDefaultDreamId(): string {
  return `dream-${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`;
}

export interface CreateDreamInput {
  id?: string;
  createdAt?: number;
  quality: DreamQuality;
  tagIds?: readonly string[];
  title?: string;
  content?: string;
  audioPath?: string;
  drawingPath?: string;
}

interface CreateDreamSuccess {
  ok: true;
  dream: Dream;
  decision: FeatureGateDecision;
}

interface CreateDreamValidationFailure {
  ok: false;
  code: 'VALIDATION_FAILED';
  issues: readonly ValidationIssue[];
}

interface CreateDreamQuotaFailure {
  ok: false;
  code: 'DREAM_QUOTA_REACHED';
  decision: FeatureGateDecision;
}

export type CreateDreamResult =
  | CreateDreamSuccess
  | CreateDreamValidationFailure
  | CreateDreamQuotaFailure;

export class CreateDreamUseCase {
  private readonly featureGateDependencies: FeatureGateResolverDependencies;

  private readonly recordUsageLogUseCase: RecordUsageLogUseCase;

  constructor(
    private readonly dreamRepository: DreamRepository,
    licenseRepository: LicenseRepository,
    usageLogRepository: UsageLogRepository,
    clock: Clock,
    private readonly dreamIdGenerator: DreamIdGenerator = createDefaultDreamId,
    usageLogIdGenerator?: UsageLogIdGenerator,
  ) {
    this.featureGateDependencies = {
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      clock,
    };

    this.recordUsageLogUseCase = new RecordUsageLogUseCase(
      usageLogRepository,
      clock,
      usageLogIdGenerator,
    );
  }

  async execute(input: CreateDreamInput): Promise<CreateDreamResult> {
    const dream: Dream = {
      id: input.id ?? this.dreamIdGenerator(),
      createdAt: input.createdAt ?? this.featureGateDependencies.clock.now(),
      quality: input.quality,
      tagIds: [...(input.tagIds ?? [])],
    };

    if (input.title !== undefined) {
      dream.title = input.title;
    }

    if (input.content !== undefined) {
      dream.content = input.content;
    }

    if (input.audioPath !== undefined) {
      dream.audioPath = input.audioPath;
    }

    if (input.drawingPath !== undefined) {
      dream.drawingPath = input.drawingPath;
    }

    const issues = validateDream(dream);

    if (issues.length > 0) {
      return {
        ok: false,
        code: 'VALIDATION_FAILED',
        issues,
      };
    }

    const decision = await resolveFeatureGateFromRepositories(this.featureGateDependencies);

    if (!decision.canCreateDream) {
      return {
        ok: false,
        code: 'DREAM_QUOTA_REACHED',
        decision,
      };
    }

    await this.dreamRepository.create(dream);

    const recordUsageResult = await this.recordUsageLogUseCase.execute({
      type: 'DREAM_CREATED',
      createdAt: dream.createdAt,
    });

    if (!recordUsageResult.ok) {
      throw new Error('RecordUsageLogUseCase returned a validation error after dream creation.');
    }

    return {
      ok: true,
      dream,
      decision,
    };
  }
}
