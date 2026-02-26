import type { WbtbSettings } from '../../domain';

export interface WbtbSettingsRepository {
  getWbtbSettings(): Promise<WbtbSettings | null>;
  saveWbtbSettings(settings: WbtbSettings): Promise<void>;
}
