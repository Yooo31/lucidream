import type { Dream } from '../../domain';
import { FakeClock } from '../../domain';

import {
  ExportDreamsPdfUseCase,
  createDreamJournalPdf,
  type DreamPdfGenerator,
  type DreamsPdfFileStore,
} from './ExportDreamsPdfUseCase';
import {
  createDreamRepositoryMock,
  createLicenseRepositoryMock,
  createTagRepositoryMock,
  createUsageLogRepositoryMock,
} from './testing/createRepositoryMocks';

function createPdfFileStoreMock(): jest.Mocked<DreamsPdfFileStore> {
  return {
    saveUtf8Pdf: jest.fn<Promise<string>, [{ fileId: string; content: string }]>(
      async () => 'file:///sandbox/lucidream/exports/dreams-2026-02-26-123.pdf',
    ),
  };
}

describe('createDreamJournalPdf', () => {
  it('builds a valid PDF header with readable journal sections', () => {
    const content = createDreamJournalPdf({
      generatedAtIso: '2026-02-26T10:00:00.000Z',
      records: [
        {
          date: '2026-02-26T05:40:00.000Z',
          title: 'Sky bridge',
          story: 'I stabilized the dream and stayed aware.',
          lucidity: 'LUCID',
          quality: 'LUCID',
          tags: 'Flight | City',
        },
      ],
    });

    expect(content.startsWith('%PDF-1.4\n')).toBe(true);
    expect(content).toContain('LuciDream Dream Journal');
    expect(content).toContain('Dream 1');
    expect(content).toContain('Quality: LUCID');
    expect(content).toContain('startxref');
  });
});

describe('ExportDreamsPdfUseCase', () => {
  it('blocks PDF export when FREE license has export disabled', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const tagRepository = createTagRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('FREE');
    const usageLogRepository = createUsageLogRepositoryMock();
    const fileStore = createPdfFileStoreMock();
    const clock = new FakeClock(Date.parse('2026-02-26T10:00:00.000Z'));
    const useCase = new ExportDreamsPdfUseCase(
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
    expect(fileStore.saveUtf8Pdf).not.toHaveBeenCalled();
  });

  it('invokes PDF generator and saves exported PDF locally for MEDIUM', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const tagRepository = createTagRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('MEDIUM');
    const usageLogRepository = createUsageLogRepositoryMock();
    const fileStore = createPdfFileStoreMock();
    const generator = jest.fn<ReturnType<DreamPdfGenerator>, Parameters<DreamPdfGenerator>>(
      () => '%PDF-1.4\n% mocked\n',
    );
    const now = Date.parse('2026-02-26T10:00:00.000Z');
    const clock = new FakeClock(now);
    const dreams: readonly Dream[] = [
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

    const useCase = new ExportDreamsPdfUseCase(
      dreamRepository,
      tagRepository,
      licenseRepository,
      usageLogRepository,
      clock,
      fileStore,
      { generator },
    );

    const result = await useCase.execute();

    expect(dreamRepository.listByCreatedAtRange).toHaveBeenCalledWith({
      startCreatedAt: Date.parse('2026-01-28T00:00:00.000Z'),
      endCreatedAt: now,
    });
    expect(generator).toHaveBeenCalledWith({
      generatedAtIso: '2026-02-26T10:00:00.000Z',
      records: [
        {
          date: '2026-02-26T05:40:00.000Z',
          title: 'Sky bridge',
          story: 'I stabilized the dream and stayed aware.',
          lucidity: 'LUCID',
          quality: 'LUCID',
          tags: 'Flight | City',
        },
      ],
    });
    expect(fileStore.saveUtf8Pdf).toHaveBeenCalledWith({
      fileId: 'dreams-2026-02-26-1772100000000',
      content: '%PDF-1.4\n% mocked\n',
    });
    expect(result).toEqual({
      ok: true,
      filePath: 'file:///sandbox/lucidream/exports/dreams-2026-02-26-123.pdf',
      exportedDreamCount: 1,
      decision: expect.objectContaining({
        exportEnabled: true,
      }),
    });
  });
});
