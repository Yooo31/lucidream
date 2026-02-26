import {
  resolveFeatureGateDecision,
  toUtcDayKey,
  type Clock,
  type FeatureGateCounts,
  type FeatureGateDecision,
  type LicenseType,
} from '../../domain';
import type { DreamRepository, LicenseRepository, UsageLogRepository } from '../repositories';

export interface UtcRange {
  startCreatedAt: number;
  endCreatedAt: number;
}

function toUtcDayRange(dayKey: string): UtcRange {
  const startCreatedAt = Date.parse(`${dayKey}T00:00:00.000Z`);
  const endCreatedAt = Date.parse(`${dayKey}T23:59:59.999Z`);

  return {
    startCreatedAt,
    endCreatedAt,
  };
}

function normalizeNonNegativeInteger(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

export function getUtcDayRangeForTimestamp(timestamp: number): UtcRange {
  return toUtcDayRange(toUtcDayKey(timestamp));
}

export function getUtcTrailingDayRange(endTimestamp: number, days: number): UtcRange {
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error('days must be a positive integer.');
  }

  const endDayRange = getUtcDayRangeForTimestamp(endTimestamp);
  const startDate = new Date(endDayRange.startCreatedAt);
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1));

  const startDayRange = toUtcDayRange(toUtcDayKey(startDate.getTime()));

  return {
    startCreatedAt: startDayRange.startCreatedAt,
    endCreatedAt: endDayRange.endCreatedAt,
  };
}

export interface FeatureGateResolverDependencies {
  dreamRepository: DreamRepository;
  licenseRepository: LicenseRepository;
  usageLogRepository: UsageLogRepository;
  clock: Clock;
}

export interface ResolveFeatureGateOptions {
  drawingsPerDreamCount?: number;
}

async function getLicenseTypeOrFree(licenseRepository: LicenseRepository): Promise<LicenseType> {
  return (await licenseRepository.getCurrent()) ?? 'FREE';
}

export async function resolveFeatureGateFromRepositories(
  dependencies: FeatureGateResolverDependencies,
  options: ResolveFeatureGateOptions = {},
): Promise<FeatureGateDecision> {
  const now = dependencies.clock.now();
  const todayRange = getUtcDayRangeForTimestamp(now);
  const last7DaysRange = getUtcTrailingDayRange(now, 7);

  const [
    licenseType,
    dreamsCreatedTodayByDreams,
    dreamsCreatedTodayByUsageLogs,
    audioPlaysLast7Days,
    audioPlaysToday,
    rcSentToday,
    wbtbUsedLast7Days,
  ] = await Promise.all([
    getLicenseTypeOrFree(dependencies.licenseRepository),
    dependencies.dreamRepository.countByCreatedAtRange(
      todayRange.startCreatedAt,
      todayRange.endCreatedAt,
    ),
    dependencies.usageLogRepository.countByTypeAndCreatedAtRange(
      'DREAM_CREATED',
      todayRange.startCreatedAt,
      todayRange.endCreatedAt,
    ),
    dependencies.usageLogRepository.countByTypeAndCreatedAtRange(
      'AUDIO_RECORDED',
      last7DaysRange.startCreatedAt,
      todayRange.endCreatedAt,
    ),
    dependencies.usageLogRepository.countByTypeAndCreatedAtRange(
      'AUDIO_RECORDED',
      todayRange.startCreatedAt,
      todayRange.endCreatedAt,
    ),
    dependencies.usageLogRepository.countByTypeAndCreatedAtRange(
      'REALITY_CHECK_SCHEDULED',
      todayRange.startCreatedAt,
      todayRange.endCreatedAt,
    ),
    dependencies.usageLogRepository.countByTypeAndCreatedAtRange(
      'WBTB_SCHEDULED',
      last7DaysRange.startCreatedAt,
      todayRange.endCreatedAt,
    ),
  ]);

  const counts: FeatureGateCounts = {
    dreamsCreatedToday: Math.max(dreamsCreatedTodayByDreams, dreamsCreatedTodayByUsageLogs),
    audioPlaysLast7Days,
    audioPlaysToday,
    rcSentToday,
    wbtbUsedLast7Days,
    drawingsPerDreamCount: normalizeNonNegativeInteger(options.drawingsPerDreamCount),
  };

  return resolveFeatureGateDecision(licenseType, counts, dependencies.clock);
}
