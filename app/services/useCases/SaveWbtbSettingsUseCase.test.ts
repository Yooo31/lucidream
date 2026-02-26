import type { WbtbSettings } from '../../domain';
import type { WbtbSettingsRepository } from '../repositories';

import type { ScheduleWbtbAlarmUseCase } from './ScheduleWbtbAlarmUseCase';
import { SaveWbtbSettingsUseCase } from './SaveWbtbSettingsUseCase';

function createRepositoryMock(): jest.Mocked<WbtbSettingsRepository> {
  return {
    getWbtbSettings: jest.fn(async () => null),
    saveWbtbSettings: jest.fn<Promise<void>, [WbtbSettings]>(async () => undefined),
  };
}

describe('SaveWbtbSettingsUseCase', () => {
  it('saves settings and runs WBTB scheduling', async () => {
    const settings: WbtbSettings = {
      enabled: true,
      afterSleepHours: 6,
      alarmDurationSeconds: 45,
    };
    const repository = createRepositoryMock();
    const scheduleWbtbAlarmUseCase = {
      execute: jest.fn(async () => ({
        scheduled: true,
        skippedByQuota: false,
        maxWbtbUsesLast7Days: 1,
        scheduledFor: Date.parse('2026-02-27T04:00:00.000Z'),
        autoStopAt: Date.parse('2026-02-27T04:00:45.000Z'),
      })),
    } as unknown as jest.Mocked<ScheduleWbtbAlarmUseCase>;
    const useCase = new SaveWbtbSettingsUseCase(repository, scheduleWbtbAlarmUseCase);

    await expect(useCase.execute(settings)).resolves.toEqual({
      scheduled: true,
      skippedByQuota: false,
      maxWbtbUsesLast7Days: 1,
      scheduledFor: Date.parse('2026-02-27T04:00:00.000Z'),
      autoStopAt: Date.parse('2026-02-27T04:00:45.000Z'),
    });
    expect(repository.saveWbtbSettings).toHaveBeenCalledWith(settings);
    expect(scheduleWbtbAlarmUseCase.execute).toHaveBeenCalledWith(settings);
  });

  it('throws on invalid settings and skips persistence/scheduling', async () => {
    const repository = createRepositoryMock();
    const scheduleWbtbAlarmUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ScheduleWbtbAlarmUseCase>;
    const useCase = new SaveWbtbSettingsUseCase(repository, scheduleWbtbAlarmUseCase);
    const invalidSettings: WbtbSettings = {
      enabled: true,
      afterSleepHours: 0,
      alarmDurationSeconds: 45,
    };

    await expect(useCase.execute(invalidSettings)).rejects.toThrow(
      'WBTB afterSleepHours must be between 1 and 12.',
    );
    expect(repository.saveWbtbSettings).not.toHaveBeenCalled();
    expect(scheduleWbtbAlarmUseCase.execute).not.toHaveBeenCalled();
  });
});
