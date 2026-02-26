import type { UsageLog, UsageLogType } from '../../domain';

export interface UsageLogRepository {
  create(usageLog: UsageLog): Promise<void>;
  getById(id: string): Promise<UsageLog | null>;
  update(usageLog: UsageLog): Promise<void>;
  delete(id: string): Promise<void>;
  listByTypeAndCreatedAtRange(
    type: UsageLogType,
    startCreatedAt: number,
    endCreatedAt: number,
  ): Promise<readonly UsageLog[]>;
  countByTypeAndCreatedAtRange(
    type: UsageLogType,
    startCreatedAt: number,
    endCreatedAt: number,
  ): Promise<number>;
}
