export interface NotificationPermissions {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

export interface NotificationContentInput {
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

export type NotificationTriggerInput =
  | { type: 'immediate' }
  | { type: 'date'; date: Date }
  | { type: 'timeInterval'; seconds: number; repeats?: boolean };

export interface ScheduleNotificationInput {
  content: NotificationContentInput;
  trigger: NotificationTriggerInput;
}

export interface NotificationsClient {
  scheduleNotification(input: ScheduleNotificationInput): Promise<string>;
  cancelNotification(identifier: string): Promise<void>;
  cancelAll(): Promise<void>;
  getPermissions(): Promise<NotificationPermissions>;
  requestPermissions(): Promise<NotificationPermissions>;
}
