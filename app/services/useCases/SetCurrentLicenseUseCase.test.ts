import { createLicenseRepositoryMock } from './testing/createRepositoryMocks';
import { SetCurrentLicenseUseCase } from './SetCurrentLicenseUseCase';

describe('SetCurrentLicenseUseCase', () => {
  it('creates license when no license exists yet', async () => {
    const repository = createLicenseRepositoryMock(null);
    const useCase = new SetCurrentLicenseUseCase(repository);

    await useCase.execute('FREE');

    expect(repository.create).toHaveBeenCalledWith('FREE');
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('updates license when a different license exists', async () => {
    const repository = createLicenseRepositoryMock('FREE');
    const useCase = new SetCurrentLicenseUseCase(repository);

    await useCase.execute('PRO');

    expect(repository.update).toHaveBeenCalledWith('PRO');
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('does not write when selected license matches current value', async () => {
    const repository = createLicenseRepositoryMock('MEDIUM');
    const useCase = new SetCurrentLicenseUseCase(repository);

    await useCase.execute('MEDIUM');

    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });
});
