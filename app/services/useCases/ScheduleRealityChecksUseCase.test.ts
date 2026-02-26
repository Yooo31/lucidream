import { FakeClock, type RealityCheckSettings } from '../../domain';
import {
  createLicenseRepositoryMock,
  createUsageLogRepositoryMock,
} from './testing/createRepositoryMocks';

import {
  ScheduleRealityChecksUseCase,
  type RealityCheckNotificationsClient,
} from './ScheduleRealityChecksUseCase';

function createNotificationsClientMock(): jest.Mocked<RealityCheckNotificationsClient> {
  return {
    scheduleNotification: jest.fn<
      Promise<string>,
      [Parameters<RealityCheckNotificationsClient['scheduleNotification']>[0]]
    >(async () => 'notification-id'),
    cancelAll: jest.fn(async () => undefined),
  };
}

describe('ScheduleRealityChecksUseCase', () => {
  it('enforces daily RC quota with per-day counting based on Clock windows', async () => {
    const clock = new FakeClock(Date.parse('2026-02-26T10:00:00.000Z'));
    const settings: RealityCheckSettings = {
      mode: 'INTERVAL',
      intervalHours: 1,
      activeWindow: {
        startMinutes: 0,
        endMinutes: 0,
      },
      notificationText: 'Check reality now.',
    };
    const notificationsClient = createNotificationsClientMock();
    const usageLogRepository = createUsageLogRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock();
    const dayOneStart = Date.parse('2026-02-26T00:00:00.000Z');
    const dayOneEnd = Date.parse('2026-02-26T23:59:59.999Z');
    const dayTwoStart = Date.parse('2026-02-27T00:00:00.000Z');
    const dayTwoEnd = Date.parse('2026-02-27T23:59:59.999Z');

    usageLogRepository.countByTypeAndCreatedAtRange.mockImplementation(
      async (_type, startCreatedAt, endCreatedAt) => {
        if (startCreatedAt === dayOneStart && endCreatedAt === dayOneEnd) {
          return 2;
        }

        if (startCreatedAt === dayTwoStart && endCreatedAt === dayTwoEnd) {
          return 1;
        }

        return 0;
      },
    );

    const useCase = new ScheduleRealityChecksUseCase(
      notificationsClient,
      usageLogRepository,
      licenseRepository,
      clock,
      () => 0.5,
    );

    await expect(useCase.execute(settings)).resolves.toEqual({
      scheduledCount: 3,
      skippedByQuotaCount: 21,
      maxRcPerDay: 3,
    });
    expect(notificationsClient.cancelAll).toHaveBeenCalledTimes(1);
    expect(usageLogRepository.countByTypeAndCreatedAtRange).toHaveBeenCalledTimes(2);
    expect(usageLogRepository.countByTypeAndCreatedAtRange).toHaveBeenCalledWith(
      'REALITY_CHECK_SCHEDULED',
      dayOneStart,
      dayOneEnd,
    );
    expect(usageLogRepository.countByTypeAndCreatedAtRange).toHaveBeenCalledWith(
      'REALITY_CHECK_SCHEDULED',
      dayTwoStart,
      dayTwoEnd,
    );
    expect(notificationsClient.scheduleNotification).toHaveBeenCalledTimes(3);
    expect(usageLogRepository.create).toHaveBeenCalledTimes(3);
  });
});
