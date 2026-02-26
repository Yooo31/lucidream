import type { Clock } from './Clock';
import { toUtcDayKey } from './Clock';

export class SystemClock implements Clock {
  private readonly nowProvider: () => number = Date.now;

  now(): number {
    return this.nowProvider();
  }

  todayKey(): string {
    return toUtcDayKey(this.now());
  }
}
