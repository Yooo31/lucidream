import type { Dream, UsageLog } from '../../domain';
import { FakeClock } from '../../domain';
import {
  SqliteDreamRepository,
  SqliteLicenseRepository,
  SqliteUsageLogRepository,
} from '../../storage/sqlite';
import { InMemorySqliteTestDatabase } from '../../storage/sqlite/testing/InMemorySqliteTestDatabase';

import { CreateDreamUseCase } from './CreateDreamUseCase';
import { ListDreamsUseCase } from './ListDreamsUseCase';

describe('app use-cases integration', () => {
  it('enforces create quota from FeatureGate + UsageLogRepository counts', async () => {
    const database = new InMemorySqliteTestDatabase();
    const dreamRepository = new SqliteDreamRepository(database);
    const licenseRepository = new SqliteLicenseRepository(database);
    const usageLogRepository = new SqliteUsageLogRepository(database);
    const clock = new FakeClock(Date.parse('2026-02-26T12:00:00.000Z'));

    await licenseRepository.create('FREE');

    const existingDream: Dream = {
      id: 'dream-existing',
      createdAt: Date.parse('2026-02-26T10:00:00.000Z'),
      quality: 'CLEAR',
      tagIds: [],
      content: 'Existing dream for count baseline.',
    };
    await dreamRepository.create(existingDream);

    const usageLogs: readonly UsageLog[] = [
      {
        id: 'usage-log-1',
        type: 'DREAM_CREATED',
        createdAt: Date.parse('2026-02-26T08:00:00.000Z'),
      },
      {
        id: 'usage-log-2',
        type: 'DREAM_CREATED',
        createdAt: Date.parse('2026-02-26T09:00:00.000Z'),
      },
    ];

    await Promise.all(usageLogs.map((usageLog) => usageLogRepository.create(usageLog)));

    const useCase = new CreateDreamUseCase(
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      clock,
      () => 'dream-new',
      () => 'usage-log-3',
    );

    const result = await useCase.execute({
      quality: 'VAGUE',
      content: 'Should be blocked by quota.',
    });

    expect(result).toEqual({
      ok: false,
      code: 'DREAM_QUOTA_REACHED',
      decision: expect.objectContaining({
        canCreateDream: false,
        maxDreamsPerDay: 2,
      }),
    });

    const todayStart = Date.parse('2026-02-26T00:00:00.000Z');
    const todayEnd = Date.parse('2026-02-26T23:59:59.999Z');
    expect(await dreamRepository.countByCreatedAtRange(todayStart, todayEnd)).toBe(1);
  });

  it('applies FREE history limit when listing dreams', async () => {
    const database = new InMemorySqliteTestDatabase();
    const dreamRepository = new SqliteDreamRepository(database);
    const licenseRepository = new SqliteLicenseRepository(database);
    const usageLogRepository = new SqliteUsageLogRepository(database);
    const clock = new FakeClock(Date.parse('2026-02-26T12:00:00.000Z'));

    await licenseRepository.create('FREE');

    const oldDream: Dream = {
      id: 'dream-old',
      createdAt: Date.parse('2026-02-10T10:00:00.000Z'),
      quality: 'VAGUE',
      tagIds: [],
      content: 'Old dream',
    };
    const recentDream: Dream = {
      id: 'dream-recent',
      createdAt: Date.parse('2026-02-25T10:00:00.000Z'),
      quality: 'VIVID',
      tagIds: [],
      content: 'Recent dream',
    };

    await dreamRepository.create(oldDream);
    await dreamRepository.create(recentDream);

    const useCase = new ListDreamsUseCase(
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      clock,
    );

    const result = await useCase.execute({
      startCreatedAt: Date.parse('2026-02-01T00:00:00.000Z'),
      endCreatedAt: Date.parse('2026-02-26T23:59:59.999Z'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected successful list result.');
    }

    expect(result.decision.maxHistoryDays).toBe(7);
    expect(result.appliedStartCreatedAt).toBe(Date.parse('2026-02-20T00:00:00.000Z'));
    expect(result.dreams).toEqual([recentDream]);
  });
});
