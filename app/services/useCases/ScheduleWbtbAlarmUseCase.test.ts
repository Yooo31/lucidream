import { FakeClock, type WbtbSettings } from '../../domain';
import {
  createLicenseRepositoryMock,
  createUsageLogRepositoryMock,
} from './testing/createRepositoryMocks';

import {
  ScheduleWbtbAlarmUseCase,
  WBTB_ALARM_NOTIFICATION_IDENTIFIER,
  type WbtbAlarmNotificationsClient,
} from './ScheduleWbtbAlarmUseCase';

function createNotificationsClientMock(): jest.Mocked<WbtbAlarmNotificationsClient> {
  return {
    scheduleNotification: jest.fn<
      Promise<string>,
      [Parameters<WbtbAlarmNotificationsClient['scheduleNotification']>[0]]
    >(async () => WBTB_ALARM_NOTIFICATION_IDENTIFIER),
    cancelNotification: jest.fn<Promise<void>, [string]>(async () => undefined),
  };
}

describe('ScheduleWbtbAlarmUseCase', () => {
  it('schedules a WBTB alarm when weekly quota allows it', async () => {
    const now = Date.parse('2026-02-26T22:00:00.000Z');
    const clock = new FakeClock(now);
    const settings: WbtbSettings = {
      enabled: true,
      afterSleepHours: 6,
      alarmDurationSeconds: 45,
    };
    const notificationsClient = createNotificationsClientMock();
    const usageLogRepository = createUsageLogRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('FREE');

    usageLogRepository.countByTypeAndCreatedAtRange.mockResolvedValueOnce(0);

    const useCase = new ScheduleWbtbAlarmUseCase(
      notificationsClient,
      usageLogRepository,
      licenseRepository,
      clock,
    );

    await expect(useCase.execute(settings)).resolves.toEqual({
      scheduled: true,
      skippedByQuota: false,
      maxWbtbUsesLast7Days: 1,
      scheduledFor: Date.parse('2026-02-27T04:00:00.000Z'),
      autoStopAt: Date.parse('2026-02-27T04:00:45.000Z'),
    });
    expect(notificationsClient.cancelNotification).toHaveBeenCalledWith(
      WBTB_ALARM_NOTIFICATION_IDENTIFIER,
    );
    expect(notificationsClient.scheduleNotification).toHaveBeenCalledWith({
      identifier: WBTB_ALARM_NOTIFICATION_IDENTIFIER,
      content: {
        title: 'WBTB Alarm',
        body: 'Wake up for your wake-back-to-bed session.',
        data: {
          type: 'wbtb-alarm',
          autoStopAt: Date.parse('2026-02-27T04:00:45.000Z'),
          alarmDurationSeconds: 45,
        },
      },
      trigger: {
        type: 'date',
        date: new Date('2026-02-27T04:00:00.000Z'),
      },
    });
    expect(usageLogRepository.create).toHaveBeenCalledTimes(1);
    expect(usageLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'WBTB_SCHEDULED',
        createdAt: now,
      }),
    );
  });

  it('blocks scheduling when weekly quota is already reached', async () => {
    const clock = new FakeClock(Date.parse('2026-02-26T22:00:00.000Z'));
    const settings: WbtbSettings = {
      enabled: true,
      afterSleepHours: 5,
      alarmDurationSeconds: 30,
    };
    const notificationsClient = createNotificationsClientMock();
    const usageLogRepository = createUsageLogRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('FREE');

    usageLogRepository.countByTypeAndCreatedAtRange.mockResolvedValueOnce(1);

    const useCase = new ScheduleWbtbAlarmUseCase(
      notificationsClient,
      usageLogRepository,
      licenseRepository,
      clock,
    );

    await expect(useCase.execute(settings)).resolves.toEqual({
      scheduled: false,
      skippedByQuota: true,
      maxWbtbUsesLast7Days: 1,
      scheduledFor: null,
      autoStopAt: null,
    });
    expect(notificationsClient.cancelNotification).not.toHaveBeenCalled();
    expect(notificationsClient.scheduleNotification).not.toHaveBeenCalled();
    expect(usageLogRepository.create).not.toHaveBeenCalled();
  });

  it('allows scheduling for PRO license even with high weekly usage count', async () => {
    const clock = new FakeClock(Date.parse('2026-02-26T22:00:00.000Z'));
    const settings: WbtbSettings = {
      enabled: true,
      afterSleepHours: 6,
      alarmDurationSeconds: 45,
    };
    const notificationsClient = createNotificationsClientMock();
    const usageLogRepository = createUsageLogRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('PRO');

    usageLogRepository.countByTypeAndCreatedAtRange.mockResolvedValueOnce(999);

    const useCase = new ScheduleWbtbAlarmUseCase(
      notificationsClient,
      usageLogRepository,
      licenseRepository,
      clock,
    );

    await expect(useCase.execute(settings)).resolves.toEqual({
      scheduled: true,
      skippedByQuota: false,
      maxWbtbUsesLast7Days: null,
      scheduledFor: Date.parse('2026-02-27T04:00:00.000Z'),
      autoStopAt: Date.parse('2026-02-27T04:00:45.000Z'),
    });
    expect(notificationsClient.scheduleNotification).toHaveBeenCalled();
  });

  it('cancels existing WBTB alarm when settings disable WBTB', async () => {
    const clock = new FakeClock(Date.parse('2026-02-26T22:00:00.000Z'));
    const settings: WbtbSettings = {
      enabled: false,
      afterSleepHours: 6,
      alarmDurationSeconds: 45,
    };
    const notificationsClient = createNotificationsClientMock();
    const usageLogRepository = createUsageLogRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('PRO');
    const useCase = new ScheduleWbtbAlarmUseCase(
      notificationsClient,
      usageLogRepository,
      licenseRepository,
      clock,
    );

    await expect(useCase.execute(settings)).resolves.toEqual({
      scheduled: false,
      skippedByQuota: false,
      maxWbtbUsesLast7Days: null,
      scheduledFor: null,
      autoStopAt: null,
    });
    expect(notificationsClient.cancelNotification).toHaveBeenCalledWith(
      WBTB_ALARM_NOTIFICATION_IDENTIFIER,
    );
    expect(notificationsClient.scheduleNotification).not.toHaveBeenCalled();
    expect(usageLogRepository.countByTypeAndCreatedAtRange).not.toHaveBeenCalled();
  });
});
