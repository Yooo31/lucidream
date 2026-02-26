import type { RealityCheckSettings } from '../../domain';

export interface RealityCheckSettingsRepository {
  getRealityCheckSettings(): Promise<RealityCheckSettings | null>;
  saveRealityCheckSettings(settings: RealityCheckSettings): Promise<void>;
}
