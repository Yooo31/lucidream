import type { LicenseType } from '../../domain';

export interface LicenseRepository {
  create(licenseType: LicenseType): Promise<void>;
  getCurrent(): Promise<LicenseType | null>;
  update(licenseType: LicenseType): Promise<void>;
  delete(): Promise<void>;
}
