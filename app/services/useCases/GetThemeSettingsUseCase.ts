import type { ThemeSettingsRepository } from '../../theme/ThemeSettingsRepository';
import { DEFAULT_THEME_SETTINGS, type ThemeSettings } from '../../theme/types';

export class GetThemeSettingsUseCase {
  constructor(private readonly themeSettingsRepository: ThemeSettingsRepository) {}

  async execute(): Promise<ThemeSettings> {
    const settings = await this.themeSettingsRepository.getThemeSettings();
    return settings ?? DEFAULT_THEME_SETTINGS;
  }
}
