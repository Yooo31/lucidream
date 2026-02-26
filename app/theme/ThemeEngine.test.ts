import { FakeClock } from '../domain';

import { isMinuteWithinSleepWindow, ThemeEngine } from './ThemeEngine';
import type { SleepWindow } from './types';

describe('ThemeEngine', () => {
  it('returns dark when clock is outside the sleep window', () => {
    const clock = new FakeClock(Date.parse('2026-02-26T12:30:00'));
    const engine = new ThemeEngine(clock);
    const sleepWindow: SleepWindow = {
      startMinutes: 23 * 60,
      endMinutes: 7 * 60,
    };

    expect(engine.resolveActiveTheme({ sleepWindow })).toBe('dark');
  });

  it('returns infrared inside an overnight sleep window', () => {
    const clock = new FakeClock(Date.parse('2026-02-26T23:30:00'));
    const engine = new ThemeEngine(clock);
    const sleepWindow: SleepWindow = {
      startMinutes: 23 * 60,
      endMinutes: 7 * 60,
    };

    expect(engine.resolveActiveTheme({ sleepWindow })).toBe('infrared');

    clock.setNow(Date.parse('2026-02-27T01:30:00'));
    expect(engine.resolveActiveTheme({ sleepWindow })).toBe('infrared');
  });

  it('supports sleep windows that do not cross midnight', () => {
    const clock = new FakeClock(Date.parse('2026-02-26T13:30:00'));
    const engine = new ThemeEngine(clock);
    const sleepWindow: SleepWindow = {
      startMinutes: 13 * 60,
      endMinutes: 14 * 60,
    };

    expect(engine.resolveActiveTheme({ sleepWindow })).toBe('infrared');

    clock.setNow(Date.parse('2026-02-26T14:30:00'));
    expect(engine.resolveActiveTheme({ sleepWindow })).toBe('dark');
  });

  it('uses manual override when set', () => {
    const clock = new FakeClock(Date.parse('2026-02-26T23:30:00'));
    const engine = new ThemeEngine(clock);
    const sleepWindow: SleepWindow = {
      startMinutes: 23 * 60,
      endMinutes: 7 * 60,
    };

    expect(
      engine.resolveActiveTheme({
        sleepWindow,
        manualThemeOverride: 'dark',
      }),
    ).toBe('dark');
  });
});

describe('isMinuteWithinSleepWindow', () => {
  it('throws on invalid minute input', () => {
    expect(() =>
      isMinuteWithinSleepWindow(1500, {
        startMinutes: 23 * 60,
        endMinutes: 7 * 60,
      }),
    ).toThrow('minuteOfDay must be between 0 and 1439.');
  });
});
