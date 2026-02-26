export const THEME_NAMES = ['dark', 'infrared'] as const;

export type ThemeName = (typeof THEME_NAMES)[number];

export interface SleepWindow {
  startMinutes: number;
  endMinutes: number;
}

export interface ThemePalette {
  background: string;
  textPrimary: string;
  textSecondary: string;
}

const MINUTES_PER_DAY = 24 * 60;

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
