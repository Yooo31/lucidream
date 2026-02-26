import { DEFAULT_WBTB_SETTINGS, type WbtbSettings } from '../../domain';
import type { WbtbSettingsRepository } from '../repositories';

import { GetWbtbSettingsUseCase } from './GetWbtbSettingsUseCase';

function createRepositoryMock(settings: WbtbSettings | null): jest.Mocked<WbtbSettingsRepository> {
  return {
    getWbtbSettings: jest.fn(async () => settings),
    saveWbtbSettings: jest.fn<Promise<void>, [WbtbSettings]>(async () => undefined),
  };
}

describe('GetWbtbSettingsUseCase', () => {
  it('returns stored settings when available', async () => {
    const storedSettings: WbtbSettings = {
      enabled: true,
      afterSleepHours: 5,
      alarmDurationSeconds: 30,
    };
    const repository = createRepositoryMock(storedSettings);
    const useCase = new GetWbtbSettingsUseCase(repository);

    await expect(useCase.execute()).resolves.toEqual(storedSettings);
  });

  it('returns defaults when no settings are stored', async () => {
    const repository = createRepositoryMock(null);
    const useCase = new GetWbtbSettingsUseCase(repository);

    await expect(useCase.execute()).resolves.toEqual(DEFAULT_WBTB_SETTINGS);
  });
});
