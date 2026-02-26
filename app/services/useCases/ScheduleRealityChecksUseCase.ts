import {
  assertRealityCheckSettings,
  toUtcDayKey,
  type Clock,
  type RealityCheckSettings,
} from '../../domain';
import type { NotificationsClient } from '../../infra/notifications';
import type { LicenseRepository, UsageLogRepository } from '../repositories';

import {
  getUtcDayRangeForTimestamp,
  resolveFeatureGateFromLicenseAndCounts,
  resolveLicenseTypeOrFree,
} from './featureGateResolver';
import { RecordUsageLogUseCase } from './RecordUsageLogUseCase';

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export type RealityCheckNotificationsClient = Pick<
  NotificationsClient,
  'scheduleNotification' | 'cancelAll'
>;

export interface ScheduleRealityChecksResult {
  scheduledCount: number;
  skippedByQuotaCount: number;
  maxRcPerDay: number | null;
}

type RandomNumberGenerator = () => number;

function toLocalMinuteOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
}

function isWithinActiveWindow(
  minuteOfDay: number,
  startMinutes: number,
  endMinutes: number,
): boolean {
  if (startMinutes === endMinutes) {
    return true;
  }

  if (startMinutes < endMinutes) {
    return minuteOfDay >= startMinutes && minuteOfDay < endMinutes;
  }

  return minuteOfDay >= startMinutes || minuteOfDay < endMinutes;
}

function sortUniqueTimestamps(timestamps: readonly number[]): readonly number[] {
  return [...new Set(timestamps)].sort((left, right) => left - right);
}

function generateIntervalCandidates(
  settings: RealityCheckSettings,
  now: number,
): readonly number[] {
  if (settings.mode !== 'INTERVAL') {
    return [];
  }

  const intervalMs = settings.intervalHours * ONE_HOUR_MS;
  const horizonEnd = now + ONE_DAY_MS;
  const candidates: number[] = [];

  for (let timestamp = now + intervalMs; timestamp <= horizonEnd; timestamp += intervalMs) {
    if (
      isWithinActiveWindow(
        toLocalMinuteOfDay(timestamp),
        settings.activeWindow.startMinutes,
        settings.activeWindow.endMinutes,
      )
    ) {
      candidates.push(timestamp);
    }
  }

  return candidates;
}

function generateRandomCandidates(
  settings: RealityCheckSettings,
  now: number,
  random: RandomNumberGenerator,
): readonly number[] {
  if (settings.mode !== 'RANDOM') {
    return [];
  }

  const horizonEnd = now + ONE_DAY_MS;
  const candidates: number[] = [];

  for (let cursor = now + ONE_HOUR_MS; cursor <= horizonEnd; cursor += ONE_HOUR_MS) {
    const jitter = Math.floor(random() * ONE_HOUR_MS);
    const timestamp = Math.min(cursor + jitter, horizonEnd);

    if (
      isWithinActiveWindow(
        toLocalMinuteOfDay(timestamp),
        settings.activeWindow.startMinutes,
        settings.activeWindow.endMinutes,
      )
    ) {
      candidates.push(timestamp);
    }
  }

  return sortUniqueTimestamps(candidates);
}

function uniqueDayKeys(timestamps: readonly number[]): readonly string[] {
  return [...new Set(timestamps.map((timestamp) => toUtcDayKey(timestamp)))];
}

export class ScheduleRealityChecksUseCase {
  private readonly recordUsageLogUseCase: RecordUsageLogUseCase;

  constructor(
    private readonly notificationsClient: RealityCheckNotificationsClient,
    private readonly usageLogRepository: UsageLogRepository,
    private readonly licenseRepository: LicenseRepository,
    private readonly clock: Clock,
    random: RandomNumberGenerator = Math.random,
  ) {
    this.recordUsageLogUseCase = new RecordUsageLogUseCase(usageLogRepository, clock);
    this.random = random;
  }

  private readonly random: RandomNumberGenerator;

  async execute(settings: RealityCheckSettings): Promise<ScheduleRealityChecksResult> {
    assertRealityCheckSettings(settings);

    const now = this.clock.now();
    const licenseType = await resolveLicenseTypeOrFree(this.licenseRepository);
    const { maxRcPerDay } = await resolveFeatureGateFromLicenseAndCounts(
      {
        licenseRepository: this.licenseRepository,
        clock: this.clock,
      },
      {},
      {
        evaluatedAt: now,
        licenseType,
      },
    );
    const candidates =
      settings.mode === 'INTERVAL'
        ? generateIntervalCandidates(settings, now)
        : generateRandomCandidates(settings, now, this.random);
    const dayKeys = uniqueDayKeys(candidates);
    const initialDailyCounts = await Promise.all(
      dayKeys.map(async (dayKey) => {
        const dayRange = getUtcDayRangeForTimestamp(Date.parse(`${dayKey}T00:00:00.000Z`));
        const count = await this.usageLogRepository.countByTypeAndCreatedAtRange(
          'REALITY_CHECK_SCHEDULED',
          dayRange.startCreatedAt,
          dayRange.endCreatedAt,
        );

        return [dayKey, count] as const;
      }),
    );
    const dailyCountsByDayKey = new Map<string, number>(initialDailyCounts);

    await this.notificationsClient.cancelAll();

    const result = await candidates.reduce<
      Promise<{ scheduledCount: number; skippedByQuotaCount: number }>
    >(
      async (accumulatorPromise, timestamp) => {
        const accumulator = await accumulatorPromise;
        const dayKey = toUtcDayKey(timestamp);
        const currentCount = dailyCountsByDayKey.get(dayKey) ?? 0;
        const decision = await resolveFeatureGateFromLicenseAndCounts(
          {
            licenseRepository: this.licenseRepository,
            clock: this.clock,
          },
          {
            rcSentToday: currentCount,
          },
          {
            evaluatedAt: timestamp,
            licenseType,
          },
        );

        if (!decision.canSendRC) {
          return {
            scheduledCount: accumulator.scheduledCount,
            skippedByQuotaCount: accumulator.skippedByQuotaCount + 1,
          };
        }

        await this.notificationsClient.scheduleNotification({
          content: {
            title: 'Reality Check',
            body: settings.notificationText,
            data: {
              type: 'reality-check',
            },
          },
          trigger: {
            type: 'date',
            date: new Date(timestamp),
          },
        });

        const usageLogResult = await this.recordUsageLogUseCase.execute({
          type: 'REALITY_CHECK_SCHEDULED',
          createdAt: timestamp,
        });

        if (!usageLogResult.ok) {
          throw new Error(
            'RecordUsageLogUseCase returned a validation error after scheduling reality checks.',
          );
        }

        dailyCountsByDayKey.set(dayKey, currentCount + 1);

        return {
          scheduledCount: accumulator.scheduledCount + 1,
          skippedByQuotaCount: accumulator.skippedByQuotaCount,
        };
      },
      Promise.resolve({ scheduledCount: 0, skippedByQuotaCount: 0 }),
    );

    return {
      scheduledCount: result.scheduledCount,
      skippedByQuotaCount: result.skippedByQuotaCount,
      maxRcPerDay,
    };
  }
}
