import type { Dream, LicenseType, UsageLog, UsageLogType } from '../../domain';
import { FakeClock } from '../../domain';
import {
  SqliteDreamRepository,
  SqliteLicenseRepository,
  SqliteUsageLogRepository,
} from '../../storage/sqlite';
import { InMemorySqliteTestDatabase } from '../../storage/sqlite/testing/InMemorySqliteTestDatabase';

import { CreateDreamUseCase } from './CreateDreamUseCase';
import { ListDreamsUseCase } from './ListDreamsUseCase';
import { resolveFeatureGateFromRepositories } from './featureGateResolver';

const MATRIX_TIMESTAMP = Date.parse('2026-02-26T12:00:00.000Z');
const TODAY_START = Date.parse('2026-02-26T00:00:00.000Z');
const SIX_DAYS_AGO_START = Date.parse('2026-02-20T00:00:00.000Z');

interface MonetizationMatrixCase {
  licenseType: LicenseType;
  dreamsCreatedToday: number;
  audioPlaysLast7Days: number;
  audioPlaysToday: number;
  rcSentToday: number;
  wbtbUsedLast7Days: number;
  drawingsPerDreamCount: number;
  expected: {
    canCreateDream: boolean;
    canPlayAudio: boolean;
    canSendRC: boolean;
    canUseWBTB: boolean;
    canAddDrawing: boolean;
    maxHistoryDays: number | null;
    maxDreamsPerDay: number | null;
    maxAudioPlaysLast7Days: number | null;
    maxAudioPlaysPerDay: number | null;
    maxRcPerDay: number | null;
    maxWbtbUsesLast7Days: number | null;
    maxDrawingsPerDream: number;
    exportEnabled: boolean;
  };
}

const MONETIZATION_MATRIX_CASES: readonly MonetizationMatrixCase[] = [
  {
    licenseType: 'FREE',
    dreamsCreatedToday: 2,
    audioPlaysLast7Days: 1,
    audioPlaysToday: 1,
    rcSentToday: 3,
    wbtbUsedLast7Days: 1,
    drawingsPerDreamCount: 1,
    expected: {
      canCreateDream: false,
      canPlayAudio: false,
      canSendRC: false,
      canUseWBTB: false,
      canAddDrawing: false,
      maxHistoryDays: 7,
      maxDreamsPerDay: 2,
      maxAudioPlaysLast7Days: 1,
      maxAudioPlaysPerDay: null,
      maxRcPerDay: 3,
      maxWbtbUsesLast7Days: 1,
      maxDrawingsPerDream: 1,
      exportEnabled: false,
    },
  },
  {
    licenseType: 'MEDIUM',
    dreamsCreatedToday: 5,
    audioPlaysLast7Days: 4,
    audioPlaysToday: 2,
    rcSentToday: 8,
    wbtbUsedLast7Days: 4,
    drawingsPerDreamCount: 3,
    expected: {
      canCreateDream: false,
      canPlayAudio: false,
      canSendRC: false,
      canUseWBTB: false,
      canAddDrawing: false,
      maxHistoryDays: 30,
      maxDreamsPerDay: 5,
      maxAudioPlaysLast7Days: 4,
      maxAudioPlaysPerDay: null,
      maxRcPerDay: 8,
      maxWbtbUsesLast7Days: 4,
      maxDrawingsPerDream: 3,
      exportEnabled: true,
    },
  },
  {
    licenseType: 'PRO',
    dreamsCreatedToday: 20,
    audioPlaysLast7Days: 6,
    audioPlaysToday: 2,
    rcSentToday: 12,
    wbtbUsedLast7Days: 9,
    drawingsPerDreamCount: 5,
    expected: {
      canCreateDream: true,
      canPlayAudio: false,
      canSendRC: true,
      canUseWBTB: true,
      canAddDrawing: false,
      maxHistoryDays: null,
      maxDreamsPerDay: null,
      maxAudioPlaysLast7Days: null,
      maxAudioPlaysPerDay: 2,
      maxRcPerDay: null,
      maxWbtbUsesLast7Days: null,
      maxDrawingsPerDream: 5,
      exportEnabled: true,
    },
  },
];

async function seedDreamsCreatedToday(
  dreamRepository: SqliteDreamRepository,
  count: number,
  prefix: string,
): Promise<void> {
  const dreams = Array.from({ length: count }, (_, index): Dream => {
    return {
      id: `${prefix}-dream-${index + 1}`,
      createdAt: TODAY_START + index * 1000,
      quality: 'CLEAR',
      tagIds: [],
      content: `${prefix} dream ${index + 1}`,
    };
  });

  await Promise.all(dreams.map((dream) => dreamRepository.create(dream)));
}

async function seedUsageLogs(
  usageLogRepository: SqliteUsageLogRepository,
  type: UsageLogType,
  count: number,
  startCreatedAt: number,
  prefix: string,
): Promise<void> {
  const usageLogs: UsageLog[] = Array.from({ length: count }, (_, index) => {
    return {
      id: `${prefix}-${type.toLowerCase()}-${index + 1}`,
      type,
      createdAt: startCreatedAt + index * 1000,
    };
  });

  await Promise.all(usageLogs.map((usageLog) => usageLogRepository.create(usageLog)));
}

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

  it.each(MONETIZATION_MATRIX_CASES)(
    'covers monetization matrix gates for $licenseType',
    async (testCase) => {
      const database = new InMemorySqliteTestDatabase();
      const dreamRepository = new SqliteDreamRepository(database);
      const licenseRepository = new SqliteLicenseRepository(database);
      const usageLogRepository = new SqliteUsageLogRepository(database);
      const clock = new FakeClock(MATRIX_TIMESTAMP);

      await licenseRepository.create(testCase.licenseType);
      await seedDreamsCreatedToday(
        dreamRepository,
        testCase.dreamsCreatedToday,
        testCase.licenseType.toLowerCase(),
      );

      await seedUsageLogs(
        usageLogRepository,
        'AUDIO_PLAYED',
        testCase.audioPlaysToday,
        TODAY_START + 5000,
        `${testCase.licenseType.toLowerCase()}-audio-today`,
      );

      const pastAudioCount = testCase.audioPlaysLast7Days - testCase.audioPlaysToday;
      if (pastAudioCount < 0) {
        throw new Error('audioPlaysLast7Days must be >= audioPlaysToday.');
      }

      await seedUsageLogs(
        usageLogRepository,
        'AUDIO_PLAYED',
        pastAudioCount,
        SIX_DAYS_AGO_START + 10_000,
        `${testCase.licenseType.toLowerCase()}-audio-past`,
      );
      await seedUsageLogs(
        usageLogRepository,
        'REALITY_CHECK_SCHEDULED',
        testCase.rcSentToday,
        TODAY_START + 20_000,
        `${testCase.licenseType.toLowerCase()}-rc`,
      );
      await seedUsageLogs(
        usageLogRepository,
        'WBTB_SCHEDULED',
        testCase.wbtbUsedLast7Days,
        SIX_DAYS_AGO_START + 30_000,
        `${testCase.licenseType.toLowerCase()}-wbtb`,
      );

      const decision = await resolveFeatureGateFromRepositories(
        {
          dreamRepository,
          licenseRepository,
          usageLogRepository,
          clock,
        },
        {
          drawingsPerDreamCount: testCase.drawingsPerDreamCount,
        },
      );

      expect(decision).toEqual(
        expect.objectContaining({
          canCreateDream: testCase.expected.canCreateDream,
          canPlayAudio: testCase.expected.canPlayAudio,
          canSendRC: testCase.expected.canSendRC,
          canUseWBTB: testCase.expected.canUseWBTB,
          canAddDrawing: testCase.expected.canAddDrawing,
          maxHistoryDays: testCase.expected.maxHistoryDays,
          maxDreamsPerDay: testCase.expected.maxDreamsPerDay,
          maxAudioPlaysLast7Days: testCase.expected.maxAudioPlaysLast7Days,
          maxAudioPlaysPerDay: testCase.expected.maxAudioPlaysPerDay,
          maxRcPerDay: testCase.expected.maxRcPerDay,
          maxWbtbUsesLast7Days: testCase.expected.maxWbtbUsesLast7Days,
          maxDrawingsPerDream: testCase.expected.maxDrawingsPerDream,
          exportEnabled: testCase.expected.exportEnabled,
        }),
      );
    },
  );
});
