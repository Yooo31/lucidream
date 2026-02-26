import type { LicenseType } from '../../domain';
import type { LicenseRepository } from '../repositories';

export class SetCurrentLicenseUseCase {
  constructor(private readonly licenseRepository: LicenseRepository) {}

  async execute(licenseType: LicenseType): Promise<void> {
    const currentLicenseType = await this.licenseRepository.getCurrent();

    if (currentLicenseType === licenseType) {
      return;
    }

    if (currentLicenseType === null) {
      await this.licenseRepository.create(licenseType);
      return;
    }

    await this.licenseRepository.update(licenseType);
  }
}
