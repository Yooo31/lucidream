import { createLicenseRepositoryMock } from './testing/createRepositoryMocks';
import { GetCurrentLicenseUseCase } from './GetCurrentLicenseUseCase';

describe('GetCurrentLicenseUseCase', () => {
  it('returns FREE when no license is saved', async () => {
    const repository = createLicenseRepositoryMock(null);
    const useCase = new GetCurrentLicenseUseCase(repository);

    await expect(useCase.execute()).resolves.toBe('FREE');
  });

  it('returns saved license when available', async () => {
    const repository = createLicenseRepositoryMock('MEDIUM');
    const useCase = new GetCurrentLicenseUseCase(repository);

    await expect(useCase.execute()).resolves.toBe('MEDIUM');
  });
});
