import { assertWbtbSettings, type WbtbSettings } from '../../domain';
import type { WbtbSettingsRepository } from '../repositories';

import type { ScheduleWbtbAlarmResult, ScheduleWbtbAlarmUseCase } from './ScheduleWbtbAlarmUseCase';

export type SaveWbtbSettingsResult = ScheduleWbtbAlarmResult;

export class SaveWbtbSettingsUseCase {
  constructor(
    private readonly wbtbSettingsRepository: WbtbSettingsRepository,
    private readonly scheduleWbtbAlarmUseCase: ScheduleWbtbAlarmUseCase,
  ) {}

  async execute(settings: WbtbSettings): Promise<SaveWbtbSettingsResult> {
    assertWbtbSettings(settings);
    await this.wbtbSettingsRepository.saveWbtbSettings(settings);
    return this.scheduleWbtbAlarmUseCase.execute(settings);
  }
}
