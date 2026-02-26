import type { LicenseType } from './LicenseType';
import { toUtcDayKey, type Clock } from './time';

type GateLimit = number | null;

interface LicenseGateLimits {
  readonly historyDays: GateLimit;
  readonly dreamsPerDay: GateLimit;
  readonly audioPlaysPer7Days: GateLimit;
  readonly audioPlaysPerDay: GateLimit;
  readonly drawingsPerDream: number;
  readonly rcPerDay: GateLimit;
  readonly wbtbPer7Days: GateLimit;
  readonly exportEnabled: boolean;
}

export const LICENSE_GATE_LIMITS: Record<LicenseType, LicenseGateLimits> = {
  FREE: {
    historyDays: 7,
    dreamsPerDay: 2,
    audioPlaysPer7Days: 1,
    audioPlaysPerDay: null,
    drawingsPerDream: 1,
    rcPerDay: 3,
    wbtbPer7Days: 1,
    exportEnabled: false,
  },
  MEDIUM: {
    historyDays: 30,
    dreamsPerDay: 5,
    audioPlaysPer7Days: 4,
    audioPlaysPerDay: null,
    drawingsPerDream: 3,
    rcPerDay: 8,
    wbtbPer7Days: 4,
    exportEnabled: true,
  },
  PRO: {
    historyDays: null,
    dreamsPerDay: null,
    audioPlaysPer7Days: null,
    audioPlaysPerDay: 2,
    drawingsPerDream: 5,
    rcPerDay: null,
    wbtbPer7Days: null,
    exportEnabled: true,
  },
};

export interface FeatureGateCounts {
  dreamsCreatedToday: number;
  audioPlaysLast7Days: number;
  audioPlaysToday?: number;
  rcSentToday: number;
  wbtbUsedLast7Days: number;
  drawingsPerDreamCount: number;
}

export interface FeatureGateDecision {
  evaluatedAt: number;
  todayKey: string;
  last7DaysWindowStartKey: string;
  canCreateDream: boolean;
  canPlayAudio: boolean;
  canSendRC: boolean;
  canUseWBTB: boolean;
  canAddDrawing: boolean;
  maxHistoryDays: GateLimit;
  maxDreamsPerDay: GateLimit;
  maxAudioPlaysLast7Days: GateLimit;
  maxAudioPlaysPerDay: GateLimit;
  maxRcPerDay: GateLimit;
  maxWbtbUsesLast7Days: GateLimit;
  maxDrawingsPerDream: number;
  exportEnabled: boolean;
}

function normalizeCount(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function isUnderLimit(count: number, limit: GateLimit): boolean {
  return limit === null || count < limit;
}

function sevenDaysAgoDayKey(clock: Clock): string {
  const startTimestamp = new Date(clock.now());
  startTimestamp.setUTCDate(startTimestamp.getUTCDate() - 6);
  return toUtcDayKey(startTimestamp.getTime());
}

export function resolveFeatureGateDecision(
  licenseType: LicenseType,
  counts: FeatureGateCounts,
  clock: Clock,
): FeatureGateDecision {
  const limits = LICENSE_GATE_LIMITS[licenseType];

  const dreamsCreatedToday = normalizeCount(counts.dreamsCreatedToday);
  const audioPlaysLast7Days = normalizeCount(counts.audioPlaysLast7Days);
  const audioPlaysToday = normalizeCount(counts.audioPlaysToday);
  const rcSentToday = normalizeCount(counts.rcSentToday);
  const wbtbUsedLast7Days = normalizeCount(counts.wbtbUsedLast7Days);
  const drawingsPerDreamCount = normalizeCount(counts.drawingsPerDreamCount);

  return {
    evaluatedAt: clock.now(),
    todayKey: clock.todayKey(),
    last7DaysWindowStartKey: sevenDaysAgoDayKey(clock),
    canCreateDream: isUnderLimit(dreamsCreatedToday, limits.dreamsPerDay),
    canPlayAudio:
      isUnderLimit(audioPlaysLast7Days, limits.audioPlaysPer7Days) &&
      isUnderLimit(audioPlaysToday, limits.audioPlaysPerDay),
    canSendRC: isUnderLimit(rcSentToday, limits.rcPerDay),
    canUseWBTB: isUnderLimit(wbtbUsedLast7Days, limits.wbtbPer7Days),
    canAddDrawing: isUnderLimit(drawingsPerDreamCount, limits.drawingsPerDream),
    maxHistoryDays: limits.historyDays,
    maxDreamsPerDay: limits.dreamsPerDay,
    maxAudioPlaysLast7Days: limits.audioPlaysPer7Days,
    maxAudioPlaysPerDay: limits.audioPlaysPerDay,
    maxRcPerDay: limits.rcPerDay,
    maxWbtbUsesLast7Days: limits.wbtbPer7Days,
    maxDrawingsPerDream: limits.drawingsPerDream,
    exportEnabled: limits.exportEnabled,
  };
}
