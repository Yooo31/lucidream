import type { Clock } from './Clock';
import { toUtcDayKey } from './Clock';

function assertFiniteNumber(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number.`);
  }
}

export class FakeClock implements Clock {
  private timestamp: number;

  constructor(initialTimestamp: number = 0) {
    assertFiniteNumber(initialTimestamp, 'initialTimestamp');
    this.timestamp = initialTimestamp;
  }

  now(): number {
    return this.timestamp;
  }

  todayKey(): string {
    return toUtcDayKey(this.timestamp);
  }

  setNow(timestamp: number): void {
    assertFiniteNumber(timestamp, 'timestamp');
    this.timestamp = timestamp;
  }

  advanceBy(deltaMs: number): void {
    assertFiniteNumber(deltaMs, 'deltaMs');
    this.timestamp += deltaMs;
  }
}
