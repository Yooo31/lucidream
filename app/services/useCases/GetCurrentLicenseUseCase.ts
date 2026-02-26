import type { LicenseType } from '../../domain';
import type { LicenseRepository } from '../repositories';

export class GetCurrentLicenseUseCase {
  constructor(private readonly licenseRepository: LicenseRepository) {}

  async execute(): Promise<LicenseType> {
    const licenseType = await this.licenseRepository.getCurrent();
    return licenseType ?? 'FREE';
  }
}
