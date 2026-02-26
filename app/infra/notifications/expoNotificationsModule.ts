import type { ExpoNotificationsModule } from './types';

type RequireFunction = (moduleName: string) => unknown;
declare const require: RequireFunction | undefined;

type ExpoNotificationsNamespace = ExpoNotificationsModule;

function resolveRequireFunction(): RequireFunction | undefined {
  if (typeof require === 'function') {
    return require;
  }

  const candidate = (globalThis as Record<string, unknown>).require;
  return typeof candidate === 'function' ? (candidate as RequireFunction) : undefined;
}

function loadExpoNotificationsNamespace(): ExpoNotificationsNamespace {
  const requireFunction = resolveRequireFunction();
  if (!requireFunction) {
    throw new Error(
      'Module loader is unavailable. Ensure expo-notifications is installed and bundled.',
    );
  }

  const moduleValue = requireFunction('expo-notifications');
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

export function createDefaultExpoNotificationsModule(): ExpoNotificationsModule {
  const notifications = loadExpoNotificationsNamespace();

  return {
    scheduleNotificationAsync: notifications.scheduleNotificationAsync,
    cancelScheduledNotificationAsync: notifications.cancelScheduledNotificationAsync,
    cancelAllScheduledNotificationsAsync: notifications.cancelAllScheduledNotificationsAsync,
    getPermissionsAsync: notifications.getPermissionsAsync,
    requestPermissionsAsync: notifications.requestPermissionsAsync,
  };
}
