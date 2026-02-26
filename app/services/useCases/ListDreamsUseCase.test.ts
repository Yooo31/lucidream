import type { Dream } from '../../domain';
import { FakeClock } from '../../domain';

import { ListDreamsUseCase } from './ListDreamsUseCase';
import {
  createDreamRepositoryMock,
  createLicenseRepositoryMock,
  createUsageLogRepositoryMock,
} from './testing/createRepositoryMocks';

describe('ListDreamsUseCase', () => {
  it('applies FREE history limit through feature gate', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('FREE');
    const usageLogRepository = createUsageLogRepositoryMock();
    const clock = new FakeClock(Date.parse('2026-02-26T12:00:00.000Z'));

    const returnedDreams: readonly Dream[] = [
      {
        id: 'dream-1',
        createdAt: Date.parse('2026-02-25T12:00:00.000Z'),
        quality: 'CLEAR',
        tagIds: [],
        content: 'A dream',
      },
    ];
    dreamRepository.listByCreatedAtRange.mockResolvedValue(returnedDreams);

    const useCase = new ListDreamsUseCase(
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      clock,
    );

    const result = await useCase.execute({
      startCreatedAt: Date.parse('2026-01-01T00:00:00.000Z'),
      endCreatedAt: Date.parse('2026-02-26T23:59:59.999Z'),
      limit: 50,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected successful result.');
    }

    expect(result.appliedStartCreatedAt).toBe(Date.parse('2026-02-20T00:00:00.000Z'));
    expect(result.appliedEndCreatedAt).toBe(Date.parse('2026-02-26T23:59:59.999Z'));
    expect(result.decision.maxHistoryDays).toBe(7);
    expect(result.dreams).toEqual(returnedDreams);
    expect(dreamRepository.listByCreatedAtRange).toHaveBeenCalledWith({
      startCreatedAt: Date.parse('2026-02-20T00:00:00.000Z'),
      endCreatedAt: Date.parse('2026-02-26T23:59:59.999Z'),
      limit: 50,
    });
  });

  it('does not clamp start range for PRO license', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('PRO');
    const usageLogRepository = createUsageLogRepositoryMock();
    const clock = new FakeClock(Date.parse('2026-02-26T12:00:00.000Z'));

    const useCase = new ListDreamsUseCase(
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      clock,
    );

    await useCase.execute({
      startCreatedAt: Date.parse('2025-01-01T00:00:00.000Z'),
      endCreatedAt: Date.parse('2026-02-26T23:59:59.999Z'),
      offset: 3,
    });

    expect(dreamRepository.listByCreatedAtRange).toHaveBeenCalledWith({
      startCreatedAt: Date.parse('2025-01-01T00:00:00.000Z'),
      endCreatedAt: Date.parse('2026-02-26T23:59:59.999Z'),
      offset: 3,
    });
  });

  it('returns validation failure for invalid pagination or timestamps', async () => {
    const useCase = new ListDreamsUseCase(
      createDreamRepositoryMock(),
      createLicenseRepositoryMock('FREE'),
      createUsageLogRepositoryMock(),
      new FakeClock(1),
    );

    const result = await useCase.execute({
      startCreatedAt: 0,
      limit: -1,
      offset: 2.5,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected validation failure.');
    }

    expect(result.code).toBe('VALIDATION_FAILED');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'startCreatedAt' }),
        expect.objectContaining({ field: 'limit' }),
        expect.objectContaining({ field: 'offset' }),
      ]),
    );
  });
});
