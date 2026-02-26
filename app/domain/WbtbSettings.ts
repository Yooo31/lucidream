export interface WbtbSettings {
  enabled: boolean;
  afterSleepHours: number;
  alarmDurationSeconds: number;
}

const MIN_AFTER_SLEEP_HOURS = 1;
const MAX_AFTER_SLEEP_HOURS = 12;
const MIN_ALARM_DURATION_SECONDS = 5;
const MAX_ALARM_DURATION_SECONDS = 300;

export const DEFAULT_WBTB_SETTINGS: WbtbSettings = {
  enabled: false,
  afterSleepHours: 6,
  alarmDurationSeconds: 45,
};

export function assertWbtbSettings(settings: WbtbSettings): void {
  if (typeof settings.enabled !== 'boolean') {
    throw new Error('WBTB enabled must be a boolean.');
  }

  if (!Number.isInteger(settings.afterSleepHours)) {
    throw new Error('WBTB afterSleepHours must be an integer.');
  }

  if (
    settings.afterSleepHours < MIN_AFTER_SLEEP_HOURS ||
    settings.afterSleepHours > MAX_AFTER_SLEEP_HOURS
  ) {
    throw new Error(
      `WBTB afterSleepHours must be between ${MIN_AFTER_SLEEP_HOURS} and ${MAX_AFTER_SLEEP_HOURS}.`,
    );
  }

  if (!Number.isInteger(settings.alarmDurationSeconds)) {
    throw new Error('WBTB alarmDurationSeconds must be an integer.');
  }

  if (
    settings.alarmDurationSeconds < MIN_ALARM_DURATION_SECONDS ||
    settings.alarmDurationSeconds > MAX_ALARM_DURATION_SECONDS
  ) {
    throw new Error(
      `WBTB alarmDurationSeconds must be between ${MIN_ALARM_DURATION_SECONDS} and ${MAX_ALARM_DURATION_SECONDS}.`,
    );
  }
}
