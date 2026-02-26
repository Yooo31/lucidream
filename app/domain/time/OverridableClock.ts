import type { Clock } from './Clock';
import { toUtcDayKey } from './Clock';

function assertFiniteNumber(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number.`);
  }
}

type ClockListener = () => void;

export interface ClockOverrideController {
  getNowOverride(): number | null;
  setNowOverride(timestamp: number | null): void;
  subscribe(listener: ClockListener): () => void;
}

export class OverridableClock implements Clock, ClockOverrideController {
  private nowOverride: number | null = null;

  private readonly listeners = new Set<ClockListener>();

  constructor(
    private readonly nowProvider: () => number = Date.now,
    initialNowOverride: number | null = null,
  ) {
    if (initialNowOverride !== null) {
      assertFiniteNumber(initialNowOverride, 'initialNowOverride');
      this.nowOverride = initialNowOverride;
    }
  }

  now(): number {
    return this.nowOverride ?? this.nowProvider();
  }

  todayKey(): string {
    return toUtcDayKey(this.now());
  }

  getNowOverride(): number | null {
    return this.nowOverride;
  }

  setNowOverride(timestamp: number | null): void {
    if (timestamp !== null) {
      assertFiniteNumber(timestamp, 'timestamp');
    }

    this.nowOverride = timestamp;
    this.listeners.forEach((listener) => {
      listener();
    });
  }

  subscribe(listener: ClockListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}

export function isClockOverrideController(clock: Clock): clock is Clock & ClockOverrideController {
  const candidate = clock as Partial<ClockOverrideController>;

  return (
    typeof candidate.getNowOverride === 'function' &&
    typeof candidate.setNowOverride === 'function' &&
    typeof candidate.subscribe === 'function'
  );
}
