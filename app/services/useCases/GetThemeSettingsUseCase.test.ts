import type { ThemeSettingsRepository } from '../../theme/ThemeSettingsRepository';
import { DEFAULT_THEME_SETTINGS, type ThemeSettings } from '../../theme/types';

import { GetThemeSettingsUseCase } from './GetThemeSettingsUseCase';

function createThemeSettingsRepositoryMock(): jest.Mocked<ThemeSettingsRepository> {
  return {
    getThemeSettings: jest.fn(async () => null),
    saveThemeSettings: jest.fn<Promise<void>, [ThemeSettings]>(async () => undefined),
  };
}

describe('GetThemeSettingsUseCase', () => {
  it('returns defaults when repository has no saved settings', async () => {
    const repository = createThemeSettingsRepositoryMock();
    repository.getThemeSettings.mockResolvedValue(null);
    const useCase = new GetThemeSettingsUseCase(repository);

    await expect(useCase.execute()).resolves.toEqual(DEFAULT_THEME_SETTINGS);
  });

  it('returns repository settings when available', async () => {
    const repository = createThemeSettingsRepositoryMock();
    const savedSettings = {
      sleepWindow: {
        startMinutes: 21 * 60,
        endMinutes: 6 * 60,
      },
      autoInfraredEnabled: false,
    };
    repository.getThemeSettings.mockResolvedValue(savedSettings);
    const useCase = new GetThemeSettingsUseCase(repository);

    await expect(useCase.execute()).resolves.toEqual(savedSettings);
  });
});
