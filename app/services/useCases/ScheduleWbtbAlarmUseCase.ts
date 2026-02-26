import {
  assertWbtbSettings,
  resolveFeatureGateDecision,
  type Clock,
  type FeatureGateCounts,
  type LicenseType,
  type WbtbSettings,
} from '../../domain';
import type { NotificationsClient } from '../../infra/notifications';
import type { LicenseRepository, UsageLogRepository } from '../repositories';

import { getUtcTrailingDayRange } from './featureGateResolver';
import { RecordUsageLogUseCase } from './RecordUsageLogUseCase';

export const WBTB_ALARM_NOTIFICATION_IDENTIFIER = 'wbtb-alarm-start';

export type WbtbAlarmNotificationsClient = Pick<
  NotificationsClient,
  'scheduleNotification' | 'cancelNotification'
>;

export interface ScheduleWbtbAlarmResult {
  scheduled: boolean;
  skippedByQuota: boolean;
  maxWbtbUsesLast7Days: number | null;
  scheduledFor: number | null;
  autoStopAt: number | null;
}

function createWbtbCounts(wbtbUsedLast7Days: number): FeatureGateCounts {
  return {
    dreamsCreatedToday: 0,
    audioPlaysLast7Days: 0,
    audioPlaysToday: 0,
    rcSentToday: 0,
    wbtbUsedLast7Days,
    drawingsPerDreamCount: 0,
  };
}

async function getLicenseTypeOrFree(licenseRepository: LicenseRepository): Promise<LicenseType> {
  return (await licenseRepository.getCurrent()) ?? 'FREE';
}

export class ScheduleWbtbAlarmUseCase {
  private readonly recordUsageLogUseCase: RecordUsageLogUseCase;

  constructor(
    private readonly notificationsClient: WbtbAlarmNotificationsClient,
    private readonly usageLogRepository: UsageLogRepository,
    private readonly licenseRepository: LicenseRepository,
    private readonly clock: Clock,
  ) {
    this.recordUsageLogUseCase = new RecordUsageLogUseCase(usageLogRepository, clock);
  }

  private async cancelExistingAlarm(): Promise<void> {
    try {
      await this.notificationsClient.cancelNotification(WBTB_ALARM_NOTIFICATION_IDENTIFIER);
    } catch {
      // Keep save resilient even if no previously scheduled identifier exists.
    }
  }

  async execute(settings: WbtbSettings): Promise<ScheduleWbtbAlarmResult> {
    assertWbtbSettings(settings);

    if (!settings.enabled) {
      await this.cancelExistingAlarm();

      return {
        scheduled: false,
        skippedByQuota: false,
        maxWbtbUsesLast7Days: null,
        scheduledFor: null,
        autoStopAt: null,
      };
    }

    const now = this.clock.now();
    const licenseType = await getLicenseTypeOrFree(this.licenseRepository);
    const last7DaysRange = getUtcTrailingDayRange(now, 7);
    const wbtbUsedLast7Days = await this.usageLogRepository.countByTypeAndCreatedAtRange(
      'WBTB_SCHEDULED',
      last7DaysRange.startCreatedAt,
      last7DaysRange.endCreatedAt,
    );
    const decision = resolveFeatureGateDecision(
      licenseType,
      createWbtbCounts(wbtbUsedLast7Days),
      this.clock,
    );

    if (!decision.canUseWBTB) {
      return {
        scheduled: false,
        skippedByQuota: true,
        maxWbtbUsesLast7Days: decision.maxWbtbUsesLast7Days,
        scheduledFor: null,
        autoStopAt: null,
      };
    }

    const scheduledFor = now + settings.afterSleepHours * 60 * 60 * 1000;
    const autoStopAt = scheduledFor + settings.alarmDurationSeconds * 1000;

    await this.cancelExistingAlarm();
    await this.notificationsClient.scheduleNotification({
      identifier: WBTB_ALARM_NOTIFICATION_IDENTIFIER,
      content: {
        title: 'WBTB Alarm',
        body: 'Wake up for your wake-back-to-bed session.',
        data: {
          type: 'wbtb-alarm',
          autoStopAt,
          alarmDurationSeconds: settings.alarmDurationSeconds,
        },
      },
      trigger: {
        type: 'date',
        date: new Date(scheduledFor),
      },
    });

    const usageLogResult = await this.recordUsageLogUseCase.execute({
      type: 'WBTB_SCHEDULED',
      createdAt: now,
    });

    if (!usageLogResult.ok) {
      throw new Error(
        'RecordUsageLogUseCase returned a validation error after scheduling a WBTB alarm.',
      );
    }

    return {
      scheduled: true,
      skippedByQuota: false,
      maxWbtbUsesLast7Days: decision.maxWbtbUsesLast7Days,
      scheduledFor,
      autoStopAt,
    };
  }
}
