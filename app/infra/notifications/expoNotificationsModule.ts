import type { ExpoNotificationsModule } from './types';

type RequireFunction = (moduleName: string) => unknown;
declare const require: RequireFunction | undefined;

type ExpoNotificationsNamespace = ExpoNotificationsModule;

function loadExpoNotificationsNamespace(): ExpoNotificationsNamespace {
  if (typeof require !== 'function') {
    throw new Error(
      'Module loader is unavailable. Ensure expo-notifications is installed and bundled.',
    );
  }

  // Use a direct require call so Metro includes expo-notifications in the module graph.
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const moduleValue = require('expo-notifications');
  const namespace = moduleValue as Partial<ExpoNotificationsNamespace>;

  if (
    !namespace.scheduleNotificationAsync ||
    !namespace.cancelScheduledNotificationAsync ||
    !namespace.cancelAllScheduledNotificationsAsync ||
    !namespace.getPermissionsAsync ||
    !namespace.requestPermissionsAsync
  ) {
    throw new Error('expo-notifications API is unavailable.');
  }

  return namespace as ExpoNotificationsNamespace;
}

function createUnavailableNotificationsModule(error: unknown): ExpoNotificationsModule {
  const message =
    error instanceof Error && error.message.length > 0
      ? error.message
      : 'Notifications are unavailable in this build.';
  const unavailable = async (): Promise<never> => {
    throw new Error(message);
  };

  return {
    scheduleNotificationAsync: unavailable,
    cancelScheduledNotificationAsync: unavailable,
    cancelAllScheduledNotificationsAsync: unavailable,
    getPermissionsAsync: unavailable,
    requestPermissionsAsync: unavailable,
  };
}

export function createDefaultExpoNotificationsModule(): ExpoNotificationsModule {
  try {
    const notifications = loadExpoNotificationsNamespace();

    return {
      scheduleNotificationAsync: notifications.scheduleNotificationAsync,
      cancelScheduledNotificationAsync: notifications.cancelScheduledNotificationAsync,
      cancelAllScheduledNotificationsAsync: notifications.cancelAllScheduledNotificationsAsync,
      getPermissionsAsync: notifications.getPermissionsAsync,
      requestPermissionsAsync: notifications.requestPermissionsAsync,
    };
  } catch (error) {
    return createUnavailableNotificationsModule(error);
  }
}
