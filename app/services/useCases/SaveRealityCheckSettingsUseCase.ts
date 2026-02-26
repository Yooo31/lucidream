import { assertRealityCheckSettings, type RealityCheckSettings } from '../../domain';
import type { RealityCheckSettingsRepository } from '../repositories';

import type {
  ScheduleRealityChecksUseCase,
  ScheduleRealityChecksResult,
} from './ScheduleRealityChecksUseCase';

export type SaveRealityCheckSettingsResult = ScheduleRealityChecksResult;

export class SaveRealityCheckSettingsUseCase {
  constructor(
    private readonly realityCheckSettingsRepository: RealityCheckSettingsRepository,
    private readonly scheduleRealityChecksUseCase: ScheduleRealityChecksUseCase,
  ) {}

  async execute(settings: RealityCheckSettings): Promise<SaveRealityCheckSettingsResult> {
    assertRealityCheckSettings(settings);
    await this.realityCheckSettingsRepository.saveRealityCheckSettings(settings);
    return this.scheduleRealityChecksUseCase.execute(settings);
  }
}
