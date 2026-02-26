export const USAGE_LOG_TYPES = [
  'DREAM_CREATED',
  'AUDIO_RECORDED',
  'DRAWING_EXPORTED',
  'REALITY_CHECK_SCHEDULED',
  'WBTB_SCHEDULED',
] as const;

export type UsageLogType = (typeof USAGE_LOG_TYPES)[number];
