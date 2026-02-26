import { DEFAULT_REALITY_CHECK_SETTINGS, type RealityCheckSettings } from '../../domain';
import type { RealityCheckSettingsRepository } from '../repositories';

export class GetRealityCheckSettingsUseCase {
  constructor(private readonly realityCheckSettingsRepository: RealityCheckSettingsRepository) {}

  async execute(): Promise<RealityCheckSettings> {
    const settings = await this.realityCheckSettingsRepository.getRealityCheckSettings();
    return settings ?? DEFAULT_REALITY_CHECK_SETTINGS;
  }
}
