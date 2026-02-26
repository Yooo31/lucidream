import { ExpoNotificationsClient } from './ExpoNotificationsClient';
import type {
  NotificationPermissions,
  NotificationTriggerInput,
  ScheduleNotificationInput,
} from './NotificationsClient';
import type {
  ExpoNotificationPermissionsResponse,
  ExpoNotificationRequestInput,
  ExpoNotificationsModule,
} from './types';

interface MockExpoNotificationsModule extends ExpoNotificationsModule {
  scheduleNotificationAsyncMock: jest.Mock<Promise<string>, [ExpoNotificationRequestInput]>;
  cancelScheduledNotificationAsyncMock: jest.Mock<Promise<void>, [string]>;
  cancelAllScheduledNotificationsAsyncMock: jest.Mock<Promise<void>, []>;
  getPermissionsAsyncMock: jest.Mock<Promise<ExpoNotificationPermissionsResponse>, []>;
  requestPermissionsAsyncMock: jest.Mock<Promise<ExpoNotificationPermissionsResponse>, []>;
}

function createPermissionsResponse(overrides?: {
  granted?: boolean;
  canAskAgain?: boolean;
  status?: string;
}): ExpoNotificationPermissionsResponse {
  return {
    granted: overrides?.granted ?? true,
    canAskAgain: overrides?.canAskAgain ?? true,
    status: overrides?.status ?? 'granted',
  };
}

function createScheduleInput(trigger: NotificationTriggerInput): ScheduleNotificationInput {
  return {
    content: {
      title: 'Reality Check',
      body: 'Pause and verify if you are dreaming.',
      data: {
        source: 'test',
      },
    },
    trigger,
  };
}

function createMockNotificationsModule(): MockExpoNotificationsModule {
  const scheduleNotificationAsyncMock = jest
    .fn<Promise<string>, [ExpoNotificationRequestInput]>()
    .mockResolvedValue('notification-id-1');
  const cancelScheduledNotificationAsyncMock = jest
    .fn<Promise<void>, [string]>()
    .mockResolvedValue(undefined);
  const cancelAllScheduledNotificationsAsyncMock = jest
    .fn<Promise<void>, []>()
    .mockResolvedValue(undefined);
  const getPermissionsAsyncMock = jest
    .fn<Promise<ExpoNotificationPermissionsResponse>, []>()
    .mockResolvedValue(createPermissionsResponse());
  const requestPermissionsAsyncMock = jest
    .fn<Promise<ExpoNotificationPermissionsResponse>, []>()
    .mockResolvedValue(createPermissionsResponse());

  return {
    scheduleNotificationAsync: (request: ExpoNotificationRequestInput) =>
      scheduleNotificationAsyncMock(request),
    cancelScheduledNotificationAsync: (identifier: string) =>
      cancelScheduledNotificationAsyncMock(identifier),
    cancelAllScheduledNotificationsAsync: () => cancelAllScheduledNotificationsAsyncMock(),
    getPermissionsAsync: () => getPermissionsAsyncMock(),
    requestPermissionsAsync: () => requestPermissionsAsyncMock(),
    scheduleNotificationAsyncMock,
    cancelScheduledNotificationAsyncMock,
    cancelAllScheduledNotificationsAsyncMock,
    getPermissionsAsyncMock,
    requestPermissionsAsyncMock,
  };
}

describe('ExpoNotificationsClient', () => {
  it('schedules an immediate notification', async () => {
    const notificationsModule = createMockNotificationsModule();
    const client = new ExpoNotificationsClient({ notificationsModule });

    const identifier = await client.scheduleNotification(
      createScheduleInput({ type: 'immediate' }),
    );

    expect(identifier).toBe('notification-id-1');
    expect(notificationsModule.scheduleNotificationAsyncMock).toHaveBeenCalledWith({
      content: {
        title: 'Reality Check',
        body: 'Pause and verify if you are dreaming.',
        data: {
          source: 'test',
        },
      },
      trigger: null,
    });
  });

  it('schedules a date-triggered notification', async () => {
    const notificationsModule = createMockNotificationsModule();
    const client = new ExpoNotificationsClient({ notificationsModule });
    const triggerDate = new Date('2026-02-26T07:30:00.000Z');

    await client.scheduleNotification(createScheduleInput({ type: 'date', date: triggerDate }));

    expect(notificationsModule.scheduleNotificationAsyncMock).toHaveBeenCalledWith({
      content: {
        title: 'Reality Check',
        body: 'Pause and verify if you are dreaming.',
        data: {
          source: 'test',
        },
      },
      trigger: triggerDate,
    });
  });

  it('schedules a time-interval notification', async () => {
    const notificationsModule = createMockNotificationsModule();
    const client = new ExpoNotificationsClient({ notificationsModule });

    await client.scheduleNotification(
      createScheduleInput({
        type: 'timeInterval',
        seconds: 600,
        repeats: true,
      }),
    );

    expect(notificationsModule.scheduleNotificationAsyncMock).toHaveBeenCalledWith({
      content: {
        title: 'Reality Check',
        body: 'Pause and verify if you are dreaming.',
        data: {
          source: 'test',
        },
      },
      trigger: {
        seconds: 600,
        repeats: true,
      },
    });
  });

  it('schedules a non-repeating time-interval notification without repeats field', async () => {
    const notificationsModule = createMockNotificationsModule();
    const client = new ExpoNotificationsClient({ notificationsModule });

    await client.scheduleNotification(
      createScheduleInput({
        type: 'timeInterval',
        seconds: 120,
      }),
    );

    expect(notificationsModule.scheduleNotificationAsyncMock).toHaveBeenCalledWith({
      content: {
        title: 'Reality Check',
        body: 'Pause and verify if you are dreaming.',
        data: {
          source: 'test',
        },
      },
      trigger: {
        seconds: 120,
      },
    });
  });

  it('cancels a scheduled notification by identifier', async () => {
    const notificationsModule = createMockNotificationsModule();
    const client = new ExpoNotificationsClient({ notificationsModule });

    await client.cancelNotification('scheduled-id-42');

    expect(notificationsModule.cancelScheduledNotificationAsyncMock).toHaveBeenCalledWith(
      'scheduled-id-42',
    );
  });

  it('cancels all scheduled notifications', async () => {
    const notificationsModule = createMockNotificationsModule();
    const client = new ExpoNotificationsClient({ notificationsModule });

    await client.cancelAll();

    expect(notificationsModule.cancelAllScheduledNotificationsAsyncMock).toHaveBeenCalledTimes(1);
  });

  it('returns current notification permissions', async () => {
    const notificationsModule = createMockNotificationsModule();
    const client = new ExpoNotificationsClient({ notificationsModule });
    const expectedPermissions: NotificationPermissions = {
      granted: false,
      canAskAgain: true,
      status: 'denied',
    };

    notificationsModule.getPermissionsAsyncMock.mockResolvedValueOnce(expectedPermissions);

    await expect(client.getPermissions()).resolves.toEqual(expectedPermissions);
  });

  it('requests and returns notification permissions', async () => {
    const notificationsModule = createMockNotificationsModule();
    const client = new ExpoNotificationsClient({ notificationsModule });
    const expectedPermissions: NotificationPermissions = {
      granted: true,
      canAskAgain: false,
      status: 'granted',
    };

    notificationsModule.requestPermissionsAsyncMock.mockResolvedValueOnce(expectedPermissions);

    await expect(client.requestPermissions()).resolves.toEqual(expectedPermissions);
  });
});
