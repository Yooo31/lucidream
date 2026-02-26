import { DEFAULT_WBTB_SETTINGS, type WbtbSettings } from '../../domain';
import type { WbtbSettingsRepository } from '../repositories';

export class GetWbtbSettingsUseCase {
  constructor(private readonly wbtbSettingsRepository: WbtbSettingsRepository) {}

  async execute(): Promise<WbtbSettings> {
    const settings = await this.wbtbSettingsRepository.getWbtbSettings();
    return settings ?? DEFAULT_WBTB_SETTINGS;
  }
}
