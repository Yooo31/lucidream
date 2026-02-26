import type { UsageLogType } from './UsageLogType';

export interface UsageLog {
  id: string;
  type: UsageLogType;
  createdAt: number;
}
