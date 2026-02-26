import type { RealityCheckSettings } from '../../domain';
import type { RealityCheckSettingsRepository } from '../repositories';

import type { ScheduleRealityChecksUseCase } from './ScheduleRealityChecksUseCase';
import { SaveRealityCheckSettingsUseCase } from './SaveRealityCheckSettingsUseCase';

function createRepositoryMock(): jest.Mocked<RealityCheckSettingsRepository> {
  return {
    getRealityCheckSettings: jest.fn(async () => null),
    saveRealityCheckSettings: jest.fn<Promise<void>, [RealityCheckSettings]>(async () => undefined),
  };
}

describe('SaveRealityCheckSettingsUseCase', () => {
  it('saves settings and runs scheduling', async () => {
    const settings: RealityCheckSettings = {
      mode: 'INTERVAL',
      intervalHours: 3,
      activeWindow: {
        startMinutes: 8 * 60,
        endMinutes: 22 * 60,
      },
      notificationText: 'Am I dreaming?',
    };
    const repository = createRepositoryMock();
    const scheduleRealityChecksUseCase = {
      execute: jest.fn(async () => ({
        scheduledCount: 3,
        skippedByQuotaCount: 1,
        maxRcPerDay: 3,
      })),
    } as unknown as jest.Mocked<ScheduleRealityChecksUseCase>;
    const useCase = new SaveRealityCheckSettingsUseCase(repository, scheduleRealityChecksUseCase);

    await expect(useCase.execute(settings)).resolves.toEqual({
      scheduledCount: 3,
      skippedByQuotaCount: 1,
      maxRcPerDay: 3,
    });
    expect(repository.saveRealityCheckSettings).toHaveBeenCalledWith(settings);
    expect(scheduleRealityChecksUseCase.execute).toHaveBeenCalledWith(settings);
  });

  it('throws on invalid settings and skips persistence/scheduling', async () => {
    const repository = createRepositoryMock();
    const scheduleRealityChecksUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ScheduleRealityChecksUseCase>;
    const useCase = new SaveRealityCheckSettingsUseCase(repository, scheduleRealityChecksUseCase);
    const invalidSettings: RealityCheckSettings = {
      mode: 'INTERVAL',
      intervalHours: 0,
      activeWindow: {
        startMinutes: 8 * 60,
        endMinutes: 22 * 60,
      },
      notificationText: 'Am I dreaming?',
    };

    await expect(useCase.execute(invalidSettings)).rejects.toThrow(
      'Reality check intervalHours must be a positive integer.',
    );
    expect(repository.saveRealityCheckSettings).not.toHaveBeenCalled();
    expect(scheduleRealityChecksUseCase.execute).not.toHaveBeenCalled();
  });
});
