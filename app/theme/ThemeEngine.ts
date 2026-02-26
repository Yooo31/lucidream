import type { Clock } from '../domain';

import { assertSleepWindow, type SleepWindow, type ThemeName } from './types';

interface ResolveThemeOptions {
  sleepWindow: SleepWindow;
  manualThemeOverride?: ThemeName | null;
}

function toLocalMinuteOfDay(timestamp: number): number {
  const now = new Date(timestamp);
  return now.getHours() * 60 + now.getMinutes();
}

export function isMinuteWithinSleepWindow(minuteOfDay: number, sleepWindow: SleepWindow): boolean {
  assertSleepWindow(sleepWindow);

  if (!Number.isInteger(minuteOfDay) || minuteOfDay < 0 || minuteOfDay > 1439) {
    throw new Error('minuteOfDay must be between 0 and 1439.');
  }

  const { startMinutes, endMinutes } = sleepWindow;

  if (startMinutes === endMinutes) {
    return true;
  }

  if (startMinutes < endMinutes) {
    return minuteOfDay >= startMinutes && minuteOfDay < endMinutes;
  }

  return minuteOfDay >= startMinutes || minuteOfDay < endMinutes;
}

export class ThemeEngine {
  constructor(private readonly clock: Clock) {}

  resolveActiveTheme(options: ResolveThemeOptions): ThemeName {
    const { manualThemeOverride = null, sleepWindow } = options;

    if (manualThemeOverride !== null) {
      return manualThemeOverride;
    }

    const minuteOfDay = toLocalMinuteOfDay(this.clock.now());

    return isMinuteWithinSleepWindow(minuteOfDay, sleepWindow) ? 'infrared' : 'dark';
  }
}
