import type { SqliteDatabase, SqliteRow } from './types';

import type { ThemeSettingsRepository } from '../../theme/ThemeSettingsRepository';
import { assertSleepWindow, type SleepWindow } from '../../theme/types';

interface ThemeSettingsRow extends SqliteRow {
  sleep_start_minutes: number | string;
  sleep_end_minutes: number | string;
}

function parseMinuteValue(value: number | string): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export class SqliteThemeSettingsRepository implements ThemeSettingsRepository {
  constructor(private readonly database: SqliteDatabase) {}

  async getSleepWindow(): Promise<SleepWindow | null> {
    const row = await this.database.getFirstAsync<ThemeSettingsRow>(
      `
SELECT sleep_start_minutes, sleep_end_minutes
FROM theme_settings
WHERE id = 1;
`,
    );

    if (!row) {
      return null;
    }

    const startMinutes = parseMinuteValue(row.sleep_start_minutes);
    const endMinutes = parseMinuteValue(row.sleep_end_minutes);

    if (startMinutes === null || endMinutes === null) {
      return null;
    }

    const sleepWindow: SleepWindow = { startMinutes, endMinutes };

    try {
      assertSleepWindow(sleepWindow);
      return sleepWindow;
    } catch {
      return null;
    }
  }

  async saveSleepWindow(sleepWindow: SleepWindow): Promise<void> {
    assertSleepWindow(sleepWindow);

    await this.database.execAsync('BEGIN IMMEDIATE TRANSACTION;');

    try {
      await this.database.runAsync('DELETE FROM theme_settings;');
      await this.database.runAsync(
        `
INSERT INTO theme_settings (id, sleep_start_minutes, sleep_end_minutes)
VALUES (1, ?, ?);
`,
        [sleepWindow.startMinutes, sleepWindow.endMinutes],
      );
      await this.database.execAsync('COMMIT;');
    } catch (error) {
      await this.database.execAsync('ROLLBACK;');
      throw error;
    }
  }
}
