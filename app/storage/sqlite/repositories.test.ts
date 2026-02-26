import type { Dream, Tag, UsageLog } from '../../domain';

import { SqliteDreamRepository } from './SqliteDreamRepository';
import { SqliteLicenseRepository } from './SqliteLicenseRepository';
import { SqliteTagRepository } from './SqliteTagRepository';
import { SqliteThemeSettingsRepository } from './SqliteThemeSettingsRepository';
import { SqliteUsageLogRepository } from './SqliteUsageLogRepository';
import { InMemorySqliteTestDatabase } from './testing/InMemorySqliteTestDatabase';

function createTestDatabase(): InMemorySqliteTestDatabase {
  return new InMemorySqliteTestDatabase();
}

describe('sqlite repositories integration', () => {
  let database: InMemorySqliteTestDatabase;

  beforeEach(() => {
    database = createTestDatabase();
  });

  it('supports dream CRUD and history/quota queries', async () => {
    const dreamRepository = new SqliteDreamRepository(database);
    const tagRepository = new SqliteTagRepository(database);
    const startCreatedAt = Date.parse('2026-02-20T00:00:00.000Z');
    const middleCreatedAt = Date.parse('2026-02-23T00:00:00.000Z');
    const endCreatedAt = Date.parse('2026-02-26T23:59:59.000Z');

    const tagA: Tag = {
      id: 'tag-a',
      name: 'Flying',
      type: 'ACTION',
      createdAt: startCreatedAt,
    };
    const tagB: Tag = {
      id: 'tag-b',
      name: 'City',
      type: 'LOCATION',
      createdAt: middleCreatedAt,
    };

    await tagRepository.create(tagA);
    await tagRepository.create(tagB);

    const dreamOne: Dream = {
      id: 'dream-1',
      createdAt: startCreatedAt,
      quality: 'CLEAR',
      tagIds: [tagA.id, tagB.id],
      title: 'First',
      content: 'Dream one',
      audioPath: 'file:///dream-1.m4a',
      drawingPath: 'file:///dream-1.png',
    };
    const dreamTwo: Dream = {
      id: 'dream-2',
      createdAt: middleCreatedAt,
      quality: 'VIVID',
      tagIds: [tagB.id],
      title: 'Second',
      content: 'Dream two',
    };

    await dreamRepository.create(dreamOne);
    await dreamRepository.create(dreamTwo);

    expect(await dreamRepository.getById(dreamOne.id)).toEqual(dreamOne);
    expect(await dreamRepository.countByCreatedAtRange(startCreatedAt, endCreatedAt)).toBe(2);
    expect(await dreamRepository.countDrawingsByDreamId(dreamOne.id)).toBe(1);

    const pagedHistory = await dreamRepository.listByCreatedAtRange({
      startCreatedAt,
      endCreatedAt,
      limit: 1,
      offset: 1,
    });
    expect(pagedHistory).toEqual([dreamOne]);

    const { drawingPath: ignoredDrawingPath, ...dreamOneWithoutDrawing } = dreamOne;
    expect(ignoredDrawingPath).toBeDefined();

    const updatedDreamOne: Dream = {
      ...dreamOneWithoutDrawing,
      title: 'First updated',
      tagIds: [tagB.id],
      audioPath: 'file:///dream-1-updated.m4a',
    };

    await dreamRepository.update(updatedDreamOne);

    expect(await dreamRepository.getById(dreamOne.id)).toEqual(updatedDreamOne);
    expect(await dreamRepository.countDrawingsByDreamId(dreamOne.id)).toBe(0);

    await dreamRepository.delete(dreamOne.id);

    expect(await dreamRepository.getById(dreamOne.id)).toBeNull();
    expect(await tagRepository.listByDreamId(dreamOne.id)).toEqual([]);
  });

  it('supports tag CRUD and dream-tag queries', async () => {
    const dreamRepository = new SqliteDreamRepository(database);
    const tagRepository = new SqliteTagRepository(database);
    const createdAt = Date.parse('2026-02-26T12:00:00.000Z');

    const tagOne: Tag = {
      id: 'tag-1',
      name: 'Night',
      type: 'THEME',
      createdAt,
    };
    const tagTwo: Tag = {
      id: 'tag-2',
      name: 'Running',
      type: 'ACTION',
      createdAt: createdAt + 1000,
    };

    await tagRepository.create(tagOne);
    await tagRepository.create(tagTwo);

    expect(await tagRepository.getById(tagOne.id)).toEqual(tagOne);
    expect((await tagRepository.listAll()).map((tag) => tag.id)).toEqual([tagTwo.id, tagOne.id]);
    expect(await tagRepository.listByType('THEME')).toEqual([tagOne]);
    expect(await tagRepository.findByNormalizedNameAndType('THEME', 'night')).toEqual(tagOne);
    expect((await tagRepository.searchByTypeAndName('ACTION', 'run')).map((tag) => tag.id)).toEqual(
      [tagTwo.id],
    );
    expect(
      (await tagRepository.searchByTypeAndName('ACTION', 'run', 1)).map((tag) => tag.id),
    ).toEqual([tagTwo.id]);

    await dreamRepository.create({
      id: 'dream-with-tags',
      createdAt,
      quality: 'LUCID',
      tagIds: [tagTwo.id, tagOne.id],
      content: 'Tagged dream',
    });

    expect((await tagRepository.listByDreamId('dream-with-tags')).map((tag) => tag.id)).toEqual([
      tagTwo.id,
      tagOne.id,
    ]);

    const updatedTagOne: Tag = {
      ...tagOne,
      name: 'Nightmare',
      createdAt: createdAt + 2000,
    };
    await tagRepository.update(updatedTagOne);
    expect(await tagRepository.getById(tagOne.id)).toEqual(updatedTagOne);

    await tagRepository.delete(tagTwo.id);
    expect(await tagRepository.getById(tagTwo.id)).toBeNull();
  });

  it('keeps drawing asset history and resolves latest drawing path', async () => {
    const dreamRepository = new SqliteDreamRepository(database);
    const createdAt = Date.parse('2026-02-26T12:00:00.000Z');

    await dreamRepository.create({
      id: 'dream-drawing-history',
      createdAt,
      quality: 'CLEAR',
      tagIds: [],
      content: 'Dream with drawing history',
      drawingPath: 'file:///sandbox/lucidream/drawings/dream-drawing-history-1.png',
    });

    await dreamRepository.update({
      id: 'dream-drawing-history',
      createdAt,
      quality: 'CLEAR',
      tagIds: [],
      content: 'Dream with drawing history',
      drawingPath: 'file:///sandbox/lucidream/drawings/dream-drawing-history-2.png',
    });

    await dreamRepository.update({
      id: 'dream-drawing-history',
      createdAt,
      quality: 'CLEAR',
      tagIds: [],
      content: 'Dream with drawing history',
      drawingPath: 'file:///sandbox/lucidream/drawings/dream-drawing-history-2.png',
    });

    expect(await dreamRepository.countDrawingsByDreamId('dream-drawing-history')).toBe(2);
    expect((await dreamRepository.getById('dream-drawing-history'))?.drawingPath).toBe(
      'file:///sandbox/lucidream/drawings/dream-drawing-history-2.png',
    );
  });

  it('supports usage log CRUD and quota queries', async () => {
    const usageLogRepository = new SqliteUsageLogRepository(database);
    const startCreatedAt = Date.parse('2026-02-20T00:00:00.000Z');
    const endCreatedAt = Date.parse('2026-02-26T23:59:59.000Z');

    const usageLogOne: UsageLog = {
      id: 'log-1',
      type: 'DREAM_CREATED',
      createdAt: startCreatedAt,
    };
    const usageLogTwo: UsageLog = {
      id: 'log-2',
      type: 'DREAM_CREATED',
      createdAt: endCreatedAt,
    };
    const usageLogThree: UsageLog = {
      id: 'log-3',
      type: 'WBTB_SCHEDULED',
      createdAt: endCreatedAt,
    };

    await usageLogRepository.create(usageLogOne);
    await usageLogRepository.create(usageLogTwo);
    await usageLogRepository.create(usageLogThree);

    expect(await usageLogRepository.getById(usageLogOne.id)).toEqual(usageLogOne);
    expect(
      await usageLogRepository.countByTypeAndCreatedAtRange(
        'DREAM_CREATED',
        startCreatedAt,
        endCreatedAt,
      ),
    ).toBe(2);
    expect(
      (
        await usageLogRepository.listByTypeAndCreatedAtRange(
          'DREAM_CREATED',
          startCreatedAt,
          endCreatedAt,
        )
      ).map((usageLog) => usageLog.id),
    ).toEqual([usageLogTwo.id, usageLogOne.id]);

    const updatedUsageLogOne: UsageLog = {
      ...usageLogOne,
      type: 'AUDIO_RECORDED',
      createdAt: startCreatedAt + 1000,
    };

    await usageLogRepository.update(updatedUsageLogOne);
    expect(await usageLogRepository.getById(usageLogOne.id)).toEqual(updatedUsageLogOne);

    await usageLogRepository.delete(usageLogTwo.id);
    expect(await usageLogRepository.getById(usageLogTwo.id)).toBeNull();
  });

  it('supports license CRUD operations', async () => {
    const licenseRepository = new SqliteLicenseRepository(database);

    expect(await licenseRepository.getCurrent()).toBeNull();

    await licenseRepository.create('FREE');
    expect(await licenseRepository.getCurrent()).toBe('FREE');

    await licenseRepository.create('PRO');
    expect(await licenseRepository.getCurrent()).toBe('PRO');

    await licenseRepository.update('MEDIUM');
    expect(await licenseRepository.getCurrent()).toBe('MEDIUM');

    await licenseRepository.delete();
    expect(await licenseRepository.getCurrent()).toBeNull();
  });

  it('supports theme settings persistence for sleep window and auto infrared mode', async () => {
    const settingsRepository = new SqliteThemeSettingsRepository(database);
    const firstThemeSettings = {
      sleepWindow: {
        startMinutes: 23 * 60,
        endMinutes: 7 * 60,
      },
      autoInfraredEnabled: true,
    };
    const secondThemeSettings = {
      sleepWindow: {
        startMinutes: 21 * 60,
        endMinutes: 5 * 60,
      },
      autoInfraredEnabled: false,
    };

    expect(await settingsRepository.getThemeSettings()).toBeNull();

    await settingsRepository.saveThemeSettings(firstThemeSettings);
    expect(await settingsRepository.getThemeSettings()).toEqual(firstThemeSettings);

    await settingsRepository.saveThemeSettings(secondThemeSettings);
    expect(await settingsRepository.getThemeSettings()).toEqual(secondThemeSettings);
  });
});
