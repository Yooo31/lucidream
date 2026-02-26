import type { SleepWindow } from './types';

export interface ThemeSettingsRepository {
  getSleepWindow(): Promise<SleepWindow | null>;
  saveSleepWindow(sleepWindow: SleepWindow): Promise<void>;
}
