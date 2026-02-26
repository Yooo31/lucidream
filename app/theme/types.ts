export const THEME_NAMES = ['dark', 'infrared'] as const;

export type ThemeName = (typeof THEME_NAMES)[number];

export interface SleepWindow {
  startMinutes: number;
  endMinutes: number;
}

export interface ThemeSettings {
  sleepWindow: SleepWindow;
  autoInfraredEnabled: boolean;
}

export interface ThemePalette {
  background: string;
  textPrimary: string;
  textSecondary: string;
}

const MINUTES_PER_DAY = 24 * 60;
export const DEFAULT_SLEEP_WINDOW: SleepWindow = {
  startMinutes: 23 * 60,
  endMinutes: 7 * 60,
};
export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  sleepWindow: DEFAULT_SLEEP_WINDOW,
  autoInfraredEnabled: true,
};

export function isValidMinuteOfDay(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < MINUTES_PER_DAY;
}

export function assertSleepWindow(window: SleepWindow): void {
  if (!isValidMinuteOfDay(window.startMinutes)) {
    throw new Error('Sleep window startMinutes must be between 0 and 1439.');
  }

  if (!isValidMinuteOfDay(window.endMinutes)) {
    throw new Error('Sleep window endMinutes must be between 0 and 1439.');
  }
}
