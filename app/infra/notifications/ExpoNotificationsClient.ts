import type {
  NotificationPermissions,
  NotificationsClient,
  NotificationTriggerInput,
  ScheduleNotificationInput,
} from './NotificationsClient';
import { createDefaultExpoNotificationsModule } from './expoNotificationsModule';
import type { ExpoNotificationTriggerInput, ExpoNotificationsModule } from './types';

interface ExpoNotificationsClientOptions {
  notificationsModule?: ExpoNotificationsModule;
}

function assertUnreachable(value: never): never {
  throw new Error(`Unsupported notification trigger: ${JSON.stringify(value)}`);
}

function toExpoTrigger(trigger: NotificationTriggerInput): ExpoNotificationTriggerInput {
  switch (trigger.type) {
    case 'immediate':
      return null;
    case 'date':
      return trigger.date;
    case 'timeInterval':
      if (typeof trigger.repeats === 'boolean') {
        return {
          seconds: trigger.seconds,
          repeats: trigger.repeats,
        };
      }

      return {
        seconds: trigger.seconds,
      };
    default:
      return assertUnreachable(trigger);
  }
}

export class ExpoNotificationsClient implements NotificationsClient {
  private readonly notificationsModule: ExpoNotificationsModule;

  constructor(options: ExpoNotificationsClientOptions = {}) {
    this.notificationsModule =
      options.notificationsModule ?? createDefaultExpoNotificationsModule();
  }

  scheduleNotification(input: ScheduleNotificationInput): Promise<string> {
    const request = {
      content: input.content,
      trigger: toExpoTrigger(input.trigger),
    };

    if (input.identifier !== undefined) {
      return this.notificationsModule.scheduleNotificationAsync({
        ...request,
        identifier: input.identifier,
      });
    }

    return this.notificationsModule.scheduleNotificationAsync(request);
  }

  cancelNotification(identifier: string): Promise<void> {
    return this.notificationsModule.cancelScheduledNotificationAsync(identifier);
  }

  cancelAll(): Promise<void> {
    return this.notificationsModule.cancelAllScheduledNotificationsAsync();
  }

  async getPermissions(): Promise<NotificationPermissions> {
    const response = await this.notificationsModule.getPermissionsAsync();
    return {
      granted: response.granted,
      canAskAgain: response.canAskAgain,
      status: response.status,
    };
  }

  async requestPermissions(): Promise<NotificationPermissions> {
    const response = await this.notificationsModule.requestPermissionsAsync();
    return {
      granted: response.granted,
      canAskAgain: response.canAskAgain,
      status: response.status,
    };
  }
}
