import { toUtcDayKey } from './Clock';
import { FakeClock } from './FakeClock';
import { SystemClock } from './SystemClock';

describe('time domain clock utilities', () => {
  it('formats UTC day keys as YYYY-MM-DD', () => {
    const timestamp = Date.parse('2026-02-26T07:30:00.000Z');

    expect(toUtcDayKey(timestamp)).toBe('2026-02-26');
  });

  it('throws for non-finite timestamps when creating day keys', () => {
    expect(() => toUtcDayKey(Number.NaN)).toThrow('Timestamp must be a finite number.');
  });
});

describe('SystemClock', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns Date.now() for now()', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1760000000000);
    const clock = new SystemClock();

    expect(clock.now()).toBe(1760000000000);
    expect(nowSpy).toHaveBeenCalledTimes(1);
  });

  it('builds todayKey from the current timestamp', () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-02-26T07:30:00.000Z'));
    const clock = new SystemClock();

    expect(clock.todayKey()).toBe('2026-02-26');
  });
});

describe('FakeClock', () => {
  it('returns configured initial time and key', () => {
    const clock = new FakeClock(Date.parse('2026-02-26T05:00:00.000Z'));

    expect(clock.now()).toBe(Date.parse('2026-02-26T05:00:00.000Z'));
    expect(clock.todayKey()).toBe('2026-02-26');
  });

  it('supports setting and advancing time', () => {
    const clock = new FakeClock(Date.parse('2026-02-26T23:50:00.000Z'));

    clock.advanceBy(20 * 60 * 1000);
    expect(clock.todayKey()).toBe('2026-02-27');

    clock.setNow(Date.parse('2026-03-01T10:00:00.000Z'));
    expect(clock.now()).toBe(Date.parse('2026-03-01T10:00:00.000Z'));
    expect(clock.todayKey()).toBe('2026-03-01');
  });

  it('throws for non-finite inputs', () => {
    expect(() => new FakeClock(Number.POSITIVE_INFINITY)).toThrow(
      'initialTimestamp must be a finite number.',
    );

    const clock = new FakeClock();

    expect(() => clock.setNow(Number.NaN)).toThrow('timestamp must be a finite number.');
    expect(() => clock.advanceBy(Number.POSITIVE_INFINITY)).toThrow(
      'deltaMs must be a finite number.',
    );
  });
});
