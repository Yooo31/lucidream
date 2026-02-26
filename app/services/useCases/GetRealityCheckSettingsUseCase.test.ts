import { DEFAULT_REALITY_CHECK_SETTINGS, type RealityCheckSettings } from '../../domain';
import type { RealityCheckSettingsRepository } from '../repositories';

import { GetRealityCheckSettingsUseCase } from './GetRealityCheckSettingsUseCase';

function createRepositoryMock(
  settings: RealityCheckSettings | null,
): jest.Mocked<RealityCheckSettingsRepository> {
  return {
    getRealityCheckSettings: jest.fn(async () => settings),
    saveRealityCheckSettings: jest.fn<Promise<void>, [RealityCheckSettings]>(async () => undefined),
  };
}

describe('GetRealityCheckSettingsUseCase', () => {
  it('returns stored settings when available', async () => {
    const storedSettings: RealityCheckSettings = {
      mode: 'INTERVAL',
      intervalHours: 4,
      activeWindow: {
        startMinutes: 8 * 60,
        endMinutes: 22 * 60,
      },
      notificationText: 'Check your state.',
    };
    const repository = createRepositoryMock(storedSettings);
    const useCase = new GetRealityCheckSettingsUseCase(repository);

    await expect(useCase.execute()).resolves.toEqual(storedSettings);
  });

  it('returns defaults when no settings are stored', async () => {
    const repository = createRepositoryMock(null);
    const useCase = new GetRealityCheckSettingsUseCase(repository);

    await expect(useCase.execute()).resolves.toEqual(DEFAULT_REALITY_CHECK_SETTINGS);
  });
});
