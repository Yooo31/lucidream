import type { UsageLog, UsageLogType } from '../../domain';
import type { UsageLogRepository } from '../../services';

import type { SqliteDatabase, SqliteRow } from './types';

interface UsageLogRow extends SqliteRow {
  id: string;
  type: UsageLogType;
  created_at: number;
}

interface CountRow extends SqliteRow {
  count: number | string;
}

function mapUsageLogRow(row: UsageLogRow): UsageLog {
  return {
    id: row.id,
    type: row.type,
    createdAt: row.created_at,
  };
}

function getCountValue(row: CountRow | null): number {
  if (!row) {
    return 0;
  }

  if (typeof row.count === 'number') {
    return row.count;
  }

  const parsed = Number.parseInt(row.count, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export class SqliteUsageLogRepository implements UsageLogRepository {
  constructor(private readonly database: SqliteDatabase) {}

  async create(usageLog: UsageLog): Promise<void> {
    await this.database.runAsync(
      `
INSERT INTO usage_logs (id, type, created_at)
VALUES (?, ?, ?);
`,
      [usageLog.id, usageLog.type, usageLog.createdAt],
    );
  }

  async getById(id: string): Promise<UsageLog | null> {
    const row = await this.database.getFirstAsync<UsageLogRow>(
      `
SELECT id, type, created_at
FROM usage_logs
WHERE id = ?;
`,
      [id],
    );

    return row ? mapUsageLogRow(row) : null;
  }

  async update(usageLog: UsageLog): Promise<void> {
    await this.database.runAsync(
      `
UPDATE usage_logs
SET type = ?, created_at = ?
WHERE id = ?;
`,
      [usageLog.type, usageLog.createdAt, usageLog.id],
    );
  }

  async delete(id: string): Promise<void> {
    await this.database.runAsync('DELETE FROM usage_logs WHERE id = ?;', [id]);
  }

  async listByTypeAndCreatedAtRange(
    type: UsageLogType,
    startCreatedAt: number,
    endCreatedAt: number,
  ): Promise<readonly UsageLog[]> {
    const rows = await this.database.getAllAsync<UsageLogRow>(
      `
SELECT id, type, created_at
FROM usage_logs
WHERE type = ? AND created_at >= ? AND created_at <= ?
ORDER BY created_at DESC, id DESC;
`,
      [type, startCreatedAt, endCreatedAt],
    );

    return rows.map(mapUsageLogRow);
  }

  async countByTypeAndCreatedAtRange(
    type: UsageLogType,
    startCreatedAt: number,
    endCreatedAt: number,
  ): Promise<number> {
    const row = await this.database.getFirstAsync<CountRow>(
      `
SELECT COUNT(*) AS count
FROM usage_logs
WHERE type = ? AND created_at >= ? AND created_at <= ?;
`,
      [type, startCreatedAt, endCreatedAt],
    );

    return getCountValue(row);
  }
}
