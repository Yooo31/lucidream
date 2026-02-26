import {
  isNonEmptyString,
  isPositiveUnixTimestamp,
  isUsageLogType,
  type Clock,
  type UsageLog,
  type UsageLogType,
  type ValidationIssue,
} from '../../domain';
import type { UsageLogRepository } from '../repositories';

export type UsageLogIdGenerator = () => string;

function createDefaultUsageLogId(): string {
  return `usage-log-${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`;
}

export interface RecordUsageLogInput {
  id?: string;
  type: UsageLogType;
  createdAt?: number;
}

interface RecordUsageLogSuccess {
  ok: true;
  usageLog: UsageLog;
}

interface RecordUsageLogValidationFailure {
  ok: false;
  code: 'VALIDATION_FAILED';
  issues: readonly ValidationIssue[];
}

export type RecordUsageLogResult = RecordUsageLogSuccess | RecordUsageLogValidationFailure;

function validateUsageLog(usageLog: UsageLog): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isNonEmptyString(usageLog.id)) {
    issues.push({
      field: 'id',
      message: 'Usage log id is required.',
    });
  }

  if (!isUsageLogType(usageLog.type)) {
    issues.push({
      field: 'type',
      message: 'Usage log type is invalid.',
    });
  }

  if (!isPositiveUnixTimestamp(usageLog.createdAt)) {
    issues.push({
      field: 'createdAt',
      message: 'Usage log createdAt must be a positive integer.',
    });
  }

  return issues;
}

export class RecordUsageLogUseCase {
  constructor(
    private readonly usageLogRepository: UsageLogRepository,
    private readonly clock: Clock,
    private readonly usageLogIdGenerator: UsageLogIdGenerator = createDefaultUsageLogId,
  ) {}

  async execute(input: RecordUsageLogInput): Promise<RecordUsageLogResult> {
    const usageLog: UsageLog = {
      id: input.id ?? this.usageLogIdGenerator(),
      type: input.type,
      createdAt: input.createdAt ?? this.clock.now(),
    };

    const issues = validateUsageLog(usageLog);

    if (issues.length > 0) {
      return {
        ok: false,
        code: 'VALIDATION_FAILED',
        issues,
      };
    }

    await this.usageLogRepository.create(usageLog);

    return {
      ok: true,
      usageLog,
    };
  }
}
