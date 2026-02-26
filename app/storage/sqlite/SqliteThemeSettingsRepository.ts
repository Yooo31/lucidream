import type { SqliteDatabase, SqliteRow } from './types';

import type { ThemeSettingsRepository } from '../../theme/ThemeSettingsRepository';
import { assertSleepWindow, type ThemeSettings } from '../../theme/types';

interface ThemeSettingsRow extends SqliteRow {
  sleep_start_minutes: number | string;
  sleep_end_minutes: number | string;
  auto_infrared_enabled: number | string;
}

function parseMinuteValue(value: number | string): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseBooleanValue(value: number | string): boolean | null {
  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }

    return null;
  }

  if (value === '1') {
    return true;
  }

  if (value === '0') {
    return false;
  }

  return null;
}

export class SqliteThemeSettingsRepository implements ThemeSettingsRepository {
  constructor(private readonly database: SqliteDatabase) {}

  async getThemeSettings(): Promise<ThemeSettings | null> {
    const row = await this.database.getFirstAsync<ThemeSettingsRow>(
      `
SELECT sleep_start_minutes, sleep_end_minutes, auto_infrared_enabled
FROM theme_settings
WHERE id = 1;
`,
    );

    if (!row) {
      return null;
    }

    const startMinutes = parseMinuteValue(row.sleep_start_minutes);
    const endMinutes = parseMinuteValue(row.sleep_end_minutes);
    const autoInfraredEnabled = parseBooleanValue(row.auto_infrared_enabled);

    if (startMinutes === null || endMinutes === null || autoInfraredEnabled === null) {
      return null;
    }

    const themeSettings: ThemeSettings = {
      sleepWindow: {
        startMinutes,
        endMinutes,
      },
      autoInfraredEnabled,
    };

    try {
      assertSleepWindow(themeSettings.sleepWindow);
      return themeSettings;
    } catch {
      return null;
    }
  }

  async saveThemeSettings(themeSettings: ThemeSettings): Promise<void> {
    assertSleepWindow(themeSettings.sleepWindow);

    await this.database.execAsync('BEGIN IMMEDIATE TRANSACTION;');

    try {
      await this.database.runAsync('DELETE FROM theme_settings;');
      await this.database.runAsync(
        `
INSERT INTO theme_settings (id, sleep_start_minutes, sleep_end_minutes, auto_infrared_enabled)
VALUES (1, ?, ?, ?);
`,
        [
          themeSettings.sleepWindow.startMinutes,
          themeSettings.sleepWindow.endMinutes,
          themeSettings.autoInfraredEnabled ? 1 : 0,
        ],
      );
      await this.database.execAsync('COMMIT;');
    } catch (error) {
      await this.database.execAsync('ROLLBACK;');
      throw error;
    }
  }
}
