export interface Clock {
  now(): number;
  todayKey(): string;
}

export function toUtcDayKey(timestamp: number): string {
  if (!Number.isFinite(timestamp)) {
    throw new Error('Timestamp must be a finite number.');
  }

  return new Date(timestamp).toISOString().slice(0, 10);
}
