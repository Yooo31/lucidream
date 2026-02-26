import { FakeClock } from '../../domain';

import { CreateDreamUseCase } from './CreateDreamUseCase';
import {
  createDreamRepositoryMock,
  createLicenseRepositoryMock,
  createUsageLogRepositoryMock,
} from './testing/createRepositoryMocks';

describe('CreateDreamUseCase', () => {
  it('creates a dream and records DREAM_CREATED usage', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('FREE');
    const usageLogRepository = createUsageLogRepositoryMock();
    const clock = new FakeClock(Date.parse('2026-02-26T12:00:00.000Z'));

    const useCase = new CreateDreamUseCase(
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      clock,
      () => 'dream-1',
      () => 'usage-log-1',
    );

    const result = await useCase.execute({
      quality: 'VIVID',
      content: 'I became lucid and started flying.',
    });

    expect(result).toEqual({
      ok: true,
      dream: {
        id: 'dream-1',
        createdAt: Date.parse('2026-02-26T12:00:00.000Z'),
        quality: 'VIVID',
        tagIds: [],
        content: 'I became lucid and started flying.',
      },
      decision: expect.objectContaining({
        canCreateDream: true,
        maxDreamsPerDay: 2,
      }),
    });

    expect(dreamRepository.create).toHaveBeenCalledWith({
      id: 'dream-1',
      createdAt: Date.parse('2026-02-26T12:00:00.000Z'),
      quality: 'VIVID',
      tagIds: [],
      content: 'I became lucid and started flying.',
    });
    expect(usageLogRepository.create).toHaveBeenCalledWith({
      id: 'usage-log-1',
      type: 'DREAM_CREATED',
      createdAt: Date.parse('2026-02-26T12:00:00.000Z'),
    });
  });

  it('enforces creation quota using feature gate + usage log counts', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('FREE');
    const usageLogRepository = createUsageLogRepositoryMock();

    dreamRepository.countByCreatedAtRange.mockResolvedValue(1);
    usageLogRepository.countByTypeAndCreatedAtRange.mockImplementation(async (type) => {
      if (type === 'DREAM_CREATED') {
        return 2;
      }

      return 0;
    });

    const useCase = new CreateDreamUseCase(
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      new FakeClock(Date.parse('2026-02-26T12:00:00.000Z')),
      () => 'dream-2',
      () => 'usage-log-2',
    );

    const result = await useCase.execute({
      quality: 'CLEAR',
      content: 'Another dream.',
    });

    expect(result).toEqual({
      ok: false,
      code: 'DREAM_QUOTA_REACHED',
      decision: expect.objectContaining({
        canCreateDream: false,
        maxDreamsPerDay: 2,
      }),
    });
    expect(dreamRepository.create).not.toHaveBeenCalled();
    expect(usageLogRepository.create).not.toHaveBeenCalled();
  });

  it('returns validation failure for invalid dream payload', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const usageLogRepository = createUsageLogRepositoryMock();

    const useCase = new CreateDreamUseCase(
      dreamRepository,
      createLicenseRepositoryMock('FREE'),
      usageLogRepository,
      new FakeClock(Date.parse('2026-02-26T12:00:00.000Z')),
      () => ' ',
    );

    const result = await useCase.execute({
      quality: 'LUCID',
      content: '   ',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected validation failure.');
    }

    expect(result.code).toBe('VALIDATION_FAILED');
    if (result.code !== 'VALIDATION_FAILED') {
      throw new Error('Expected VALIDATION_FAILED.');
    }

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'id' }),
        expect.objectContaining({ field: 'content' }),
      ]),
    );
    expect(dreamRepository.create).not.toHaveBeenCalled();
    expect(usageLogRepository.create).not.toHaveBeenCalled();
  });
});
