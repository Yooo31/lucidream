import { assertWbtbSettings, type WbtbSettings } from '../../domain';
import type { WbtbSettingsRepository } from '../../services';

import type { SqliteDatabase, SqliteRow } from './types';

interface WbtbSettingsRow extends SqliteRow {
  enabled: number | string;
  after_sleep_hours: number | string;
  alarm_duration_seconds: number | string;
}

function parseInteger(value: number | string): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export class SqliteWbtbSettingsRepository implements WbtbSettingsRepository {
  constructor(private readonly database: SqliteDatabase) {}

  async getWbtbSettings(): Promise<WbtbSettings | null> {
    const row = await this.database.getFirstAsync<WbtbSettingsRow>(
      `
SELECT enabled, after_sleep_hours, alarm_duration_seconds
FROM wbtb_settings
WHERE id = 1;
`,
    );

    if (!row) {
      return null;
    }

    const enabledValue = parseInteger(row.enabled);
    const afterSleepHours = parseInteger(row.after_sleep_hours);
    const alarmDurationSeconds = parseInteger(row.alarm_duration_seconds);

    if (enabledValue === null || afterSleepHours === null || alarmDurationSeconds === null) {
      return null;
    }

    const settings: WbtbSettings = {
      enabled: enabledValue === 1,
      afterSleepHours,
      alarmDurationSeconds,
    };

    try {
      assertWbtbSettings(settings);
      return settings;
    } catch {
      return null;
    }
  }

  async saveWbtbSettings(settings: WbtbSettings): Promise<void> {
    assertWbtbSettings(settings);
    await this.database.execAsync('BEGIN IMMEDIATE TRANSACTION;');

    try {
      await this.database.runAsync('DELETE FROM wbtb_settings;');
      await this.database.runAsync(
        `
INSERT INTO wbtb_settings (id, enabled, after_sleep_hours, alarm_duration_seconds)
VALUES (1, ?, ?, ?);
`,
        [settings.enabled ? 1 : 0, settings.afterSleepHours, settings.alarmDurationSeconds],
      );
      await this.database.execAsync('COMMIT;');
    } catch (error) {
      await this.database.execAsync('ROLLBACK;');
      throw error;
    }
  }
}
