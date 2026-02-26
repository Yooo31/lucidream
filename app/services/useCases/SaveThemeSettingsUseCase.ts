import type { ThemeSettingsRepository } from '../../theme/ThemeSettingsRepository';
import { assertSleepWindow, type ThemeSettings } from '../../theme/types';

export class SaveThemeSettingsUseCase {
  constructor(private readonly themeSettingsRepository: ThemeSettingsRepository) {}

  async execute(settings: ThemeSettings): Promise<void> {
    assertSleepWindow(settings.sleepWindow);
    await this.themeSettingsRepository.saveThemeSettings(settings);
  }
}
