import type { Dream } from '../../domain';
import { FakeClock } from '../../domain';

import {
  ExportDreamsCsvUseCase,
  createDreamsCsv,
  type DreamsCsvFileStore,
} from './ExportDreamsCsvUseCase';
import {
  createDreamRepositoryMock,
  createLicenseRepositoryMock,
  createTagRepositoryMock,
  createUsageLogRepositoryMock,
} from './testing/createRepositoryMocks';

function createCsvFileStoreMock(): jest.Mocked<DreamsCsvFileStore> {
  return {
    saveUtf8Csv: jest.fn<Promise<string>, [{ fileId: string; content: string }]>(
      async () => 'file:///sandbox/lucidream/exports/dreams-2026-02-26-123.csv',
    ),
  };
}

describe('createDreamsCsv', () => {
  it('generates CSV header and escapes commas, quotes, and new lines', () => {
    const content = createDreamsCsv([
      {
        date: '2026-02-26T05:40:00.000Z',
        title: 'Sky, bridge',
        story: 'He said "look"\nThen we flew',
        lucidity: 'LUCID',
        quality: 'LUCID',
        tags: 'location|action',
      },
    ]);

    expect(content).toBe(
      [
        'date,title,story,lucidity,quality,tags',
        '2026-02-26T05:40:00.000Z,"Sky, bridge","He said ""look""',
        'Then we flew",LUCID,LUCID,location|action',
        '',
      ].join('\n'),
    );
  });
});

describe('ExportDreamsCsvUseCase', () => {
  it('blocks export when FREE license has export disabled', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const tagRepository = createTagRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('FREE');
    const usageLogRepository = createUsageLogRepositoryMock();
    const fileStore = createCsvFileStoreMock();
    const clock = new FakeClock(Date.parse('2026-02-26T10:00:00.000Z'));
    const useCase = new ExportDreamsCsvUseCase(
      dreamRepository,
      tagRepository,
      licenseRepository,
      usageLogRepository,
      clock,
      fileStore,
    );

    const result = await useCase.execute();

    expect(result).toEqual({
      ok: false,
      code: 'EXPORT_NOT_AVAILABLE',
      decision: expect.objectContaining({
        exportEnabled: false,
      }),
    });
    expect(dreamRepository.listByCreatedAtRange).not.toHaveBeenCalled();
    expect(tagRepository.listAll).not.toHaveBeenCalled();
    expect(fileStore.saveUtf8Csv).not.toHaveBeenCalled();
  });

  it('exports dreams to a local CSV file for MEDIUM', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const tagRepository = createTagRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('MEDIUM');
    const usageLogRepository = createUsageLogRepositoryMock();
    const fileStore = createCsvFileStoreMock();
    const now = Date.parse('2026-02-26T10:00:00.000Z');
    const clock = new FakeClock(now);
    const dreams: readonly Dream[] = [
      {
        id: 'dream-2',
        createdAt: Date.parse('2026-02-25T06:10:00.000Z'),
        quality: 'CLEAR',
        tagIds: ['tag-unknown'],
        content: 'Foggy city walk.',
      },
      {
        id: 'dream-1',
        createdAt: Date.parse('2026-02-26T05:40:00.000Z'),
        quality: 'LUCID',
        tagIds: ['tag-1', 'tag-2'],
        title: 'Sky bridge',
        content: 'I stabilized the dream and stayed aware.',
      },
    ];

    dreamRepository.listByCreatedAtRange.mockResolvedValue(dreams);
    tagRepository.listAll.mockResolvedValue([
      {
        id: 'tag-1',
        name: 'Flight',
        type: 'ACTION',
        createdAt: Date.parse('2026-02-24T05:00:00.000Z'),
      },
      {
        id: 'tag-2',
        name: 'City',
        type: 'LOCATION',
        createdAt: Date.parse('2026-02-24T06:00:00.000Z'),
      },
    ]);

    const useCase = new ExportDreamsCsvUseCase(
      dreamRepository,
      tagRepository,
      licenseRepository,
      usageLogRepository,
      clock,
      fileStore,
    );

    const result = await useCase.execute();

    expect(dreamRepository.listByCreatedAtRange).toHaveBeenCalledWith({
      startCreatedAt: Date.parse('2026-01-28T00:00:00.000Z'),
      endCreatedAt: now,
    });
    expect(fileStore.saveUtf8Csv).toHaveBeenCalledWith({
      fileId: 'dreams-2026-02-26-1772100000000',
      content: [
        'date,title,story,lucidity,quality,tags',
        '2026-02-25T06:10:00.000Z,,Foggy city walk.,NOT_LUCID,CLEAR,',
        [
          '2026-02-26T05:40:00.000Z,Sky bridge,',
          'I stabilized the dream and stayed aware.,',
          'LUCID,LUCID,Flight|City',
        ].join(''),
        '',
      ].join('\n'),
    });
    expect(result).toEqual({
      ok: true,
      filePath: 'file:///sandbox/lucidream/exports/dreams-2026-02-26-123.csv',
      exportedDreamCount: 2,
      decision: expect.objectContaining({
        exportEnabled: true,
      }),
    });
  });
});
