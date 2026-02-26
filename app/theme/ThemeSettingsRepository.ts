import type { ThemeSettings } from './types';

export interface ThemeSettingsRepository {
  getThemeSettings(): Promise<ThemeSettings | null>;
  saveThemeSettings(themeSettings: ThemeSettings): Promise<void>;
}
