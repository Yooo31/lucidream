import type { ThemeSettingsRepository } from '../../theme/ThemeSettingsRepository';
import type { ThemeSettings } from '../../theme/types';

import { SaveThemeSettingsUseCase } from './SaveThemeSettingsUseCase';

function createThemeSettingsRepositoryMock(): jest.Mocked<ThemeSettingsRepository> {
  return {
    getThemeSettings: jest.fn(async () => null),
    saveThemeSettings: jest.fn<Promise<void>, [ThemeSettings]>(async () => undefined),
  };
}

describe('SaveThemeSettingsUseCase', () => {
  it('persists valid settings', async () => {
    const repository = createThemeSettingsRepositoryMock();
    const useCase = new SaveThemeSettingsUseCase(repository);
    const settings = {
      sleepWindow: {
        startMinutes: 22 * 60,
        endMinutes: 6 * 60,
      },
      autoInfraredEnabled: true,
    };

    await useCase.execute(settings);

    expect(repository.saveThemeSettings).toHaveBeenCalledWith(settings);
  });

  it('throws on invalid sleep window and does not persist', async () => {
    const repository = createThemeSettingsRepositoryMock();
    const useCase = new SaveThemeSettingsUseCase(repository);
    const settings = {
      sleepWindow: {
        startMinutes: -1,
        endMinutes: 6 * 60,
      },
      autoInfraredEnabled: true,
    };

    await expect(useCase.execute(settings)).rejects.toThrow(
      'Sleep window startMinutes must be between 0 and 1439.',
    );
    expect(repository.saveThemeSettings).not.toHaveBeenCalled();
  });
});
