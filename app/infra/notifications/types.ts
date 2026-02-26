import type { NotificationContentInput } from './NotificationsClient';

export interface ExpoNotificationPermissionsResponse {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

export type ExpoNotificationTriggerInput = null | Date | { seconds: number; repeats?: boolean };

export interface ExpoNotificationRequestInput {
  content: NotificationContentInput;
  trigger: ExpoNotificationTriggerInput;
}

export interface ExpoNotificationsModule {
  scheduleNotificationAsync(request: ExpoNotificationRequestInput): Promise<string>;
  cancelScheduledNotificationAsync(identifier: string): Promise<void>;
  cancelAllScheduledNotificationsAsync(): Promise<void>;
  getPermissionsAsync(): Promise<ExpoNotificationPermissionsResponse>;
  requestPermissionsAsync(): Promise<ExpoNotificationPermissionsResponse>;
}
