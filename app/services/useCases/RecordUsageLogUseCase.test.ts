import { FakeClock } from '../../domain';

import { RecordUsageLogUseCase } from './RecordUsageLogUseCase';
import { createUsageLogRepositoryMock } from './testing/createRepositoryMocks';

describe('RecordUsageLogUseCase', () => {
  it('creates a usage log with generated defaults', async () => {
    const usageLogRepository = createUsageLogRepositoryMock();
    const clock = new FakeClock(Date.parse('2026-02-26T12:00:00.000Z'));
    const useCase = new RecordUsageLogUseCase(usageLogRepository, clock, () => 'usage-log-1');

    const result = await useCase.execute({
      type: 'WBTB_SCHEDULED',
    });

    expect(result).toEqual({
      ok: true,
      usageLog: {
        id: 'usage-log-1',
        type: 'WBTB_SCHEDULED',
        createdAt: Date.parse('2026-02-26T12:00:00.000Z'),
      },
    });
    expect(usageLogRepository.create).toHaveBeenCalledWith({
      id: 'usage-log-1',
      type: 'WBTB_SCHEDULED',
      createdAt: Date.parse('2026-02-26T12:00:00.000Z'),
    });
  });

  it('returns validation errors for invalid inputs', async () => {
    const usageLogRepository = createUsageLogRepositoryMock();
    const useCase = new RecordUsageLogUseCase(usageLogRepository, new FakeClock(1), () => ' ');

    const result = await useCase.execute({
      type: 'BAD' as never,
      createdAt: 0,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected validation failure.');
    }

    expect(result.code).toBe('VALIDATION_FAILED');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'id' }),
        expect.objectContaining({ field: 'type' }),
        expect.objectContaining({ field: 'createdAt' }),
      ]),
    );
    expect(usageLogRepository.create).not.toHaveBeenCalled();
  });
});
