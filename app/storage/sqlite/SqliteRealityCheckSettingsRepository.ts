import {
  assertRealityCheckSettings,
  isRealityCheckMode,
  type RealityCheckSettings,
} from '../../domain';
import type { RealityCheckSettingsRepository } from '../../services';

import type { SqliteDatabase, SqliteRow } from './types';

interface RealityCheckSettingsRow extends SqliteRow {
  mode: string;
  interval_hours: number | string | null;
  active_start_minutes: number | string;
  active_end_minutes: number | string;
  notification_text: string;
}

function parseInteger(value: number | string | null): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

export class SqliteRealityCheckSettingsRepository implements RealityCheckSettingsRepository {
  constructor(private readonly database: SqliteDatabase) {}

  async getRealityCheckSettings(): Promise<RealityCheckSettings | null> {
    const row = await this.database.getFirstAsync<RealityCheckSettingsRow>(
      `
SELECT mode, interval_hours, active_start_minutes, active_end_minutes, notification_text
FROM reality_check_settings
WHERE id = 1;
`,
    );

    if (!row || !isRealityCheckMode(row.mode)) {
      return null;
    }

    const startMinutes = parseInteger(row.active_start_minutes);
    const endMinutes = parseInteger(row.active_end_minutes);

    if (startMinutes === null || endMinutes === null || typeof row.notification_text !== 'string') {
      return null;
    }

    if (row.mode === 'INTERVAL') {
      const intervalHours = parseInteger(row.interval_hours);

      if (intervalHours === null) {
        return null;
      }

      const settings: RealityCheckSettings = {
        mode: row.mode,
        intervalHours,
        activeWindow: {
          startMinutes,
          endMinutes,
        },
        notificationText: row.notification_text,
      };

      try {
        assertRealityCheckSettings(settings);
        return settings;
      } catch {
        return null;
      }
    }

    const settings: RealityCheckSettings = {
      mode: 'RANDOM',
      activeWindow: {
        startMinutes,
        endMinutes,
      },
      notificationText: row.notification_text,
    };

    try {
      assertRealityCheckSettings(settings);
      return settings;
    } catch {
      return null;
    }
  }

  async saveRealityCheckSettings(settings: RealityCheckSettings): Promise<void> {
    assertRealityCheckSettings(settings);
    await this.database.execAsync('BEGIN IMMEDIATE TRANSACTION;');

    try {
      await this.database.runAsync('DELETE FROM reality_check_settings;');
      await this.database.runAsync(
        `
INSERT INTO reality_check_settings (
  id,
  mode,
  interval_hours,
  active_start_minutes,
  active_end_minutes,
  notification_text
)
VALUES (1, ?, ?, ?, ?, ?);
`,
        [
          settings.mode,
          settings.mode === 'INTERVAL' ? settings.intervalHours : null,
          settings.activeWindow.startMinutes,
          settings.activeWindow.endMinutes,
          settings.notificationText,
        ],
      );
      await this.database.execAsync('COMMIT;');
    } catch (error) {
      await this.database.execAsync('ROLLBACK;');
      throw error;
    }
  }
}
