export const REALITY_CHECK_MODES = ['RANDOM', 'INTERVAL'] as const;

export type RealityCheckMode = (typeof REALITY_CHECK_MODES)[number];

export interface RealityCheckActiveWindow {
  startMinutes: number;
  endMinutes: number;
}

interface RealityCheckSettingsBase {
  activeWindow: RealityCheckActiveWindow;
  notificationText: string;
}

export interface RandomRealityCheckSettings extends RealityCheckSettingsBase {
  mode: 'RANDOM';
}

export interface IntervalRealityCheckSettings extends RealityCheckSettingsBase {
  mode: 'INTERVAL';
  intervalHours: number;
}

export type RealityCheckSettings = RandomRealityCheckSettings | IntervalRealityCheckSettings;

const MINUTES_PER_DAY = 24 * 60;
const MAX_NOTIFICATION_TEXT_LENGTH = 140;

export const DEFAULT_REALITY_CHECK_SETTINGS: RealityCheckSettings = {
  mode: 'RANDOM',
  activeWindow: {
    startMinutes: 9 * 60,
    endMinutes: 22 * 60,
  },
  notificationText: 'Reality check: Am I dreaming right now?',
};

export function isRealityCheckMode(value: string): value is RealityCheckMode {
  return (REALITY_CHECK_MODES as readonly string[]).includes(value);
}

function isValidMinuteOfDay(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < MINUTES_PER_DAY;
}

export function assertRealityCheckActiveWindow(window: RealityCheckActiveWindow): void {
  if (!isValidMinuteOfDay(window.startMinutes)) {
    throw new Error('Reality check activeWindow.startMinutes must be between 0 and 1439.');
  }

  if (!isValidMinuteOfDay(window.endMinutes)) {
    throw new Error('Reality check activeWindow.endMinutes must be between 0 and 1439.');
  }
}

function assertNotificationText(notificationText: string): void {
  if (notificationText.trim().length === 0) {
    throw new Error('Reality check notification text is required.');
  }

  if (notificationText.length > MAX_NOTIFICATION_TEXT_LENGTH) {
    throw new Error('Reality check notification text must be 140 characters or fewer.');
  }
}

export function assertRealityCheckSettings(settings: RealityCheckSettings): void {
  assertRealityCheckActiveWindow(settings.activeWindow);
  assertNotificationText(settings.notificationText);

  if (settings.mode === 'INTERVAL') {
    if (!Number.isInteger(settings.intervalHours) || settings.intervalHours <= 0) {
      throw new Error('Reality check intervalHours must be a positive integer.');
    }

    if (settings.intervalHours > 24) {
      throw new Error('Reality check intervalHours must be less than or equal to 24.');
    }
  }
}
