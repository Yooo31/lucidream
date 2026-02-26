import type { Dream } from '../../domain';
import { FakeClock } from '../../domain';

import {
  SaveDreamDrawingUseCase,
  type DreamDrawingExporter,
  type DreamDrawingFileStore,
} from './SaveDreamDrawingUseCase';
import {
  createDreamRepositoryMock,
  createLicenseRepositoryMock,
  createUsageLogRepositoryMock,
} from './testing/createRepositoryMocks';

const BASE_DREAM: Dream = {
  id: 'dream-1',
  createdAt: Date.parse('2026-02-26T05:30:00.000Z'),
  quality: 'VIVID',
  tagIds: [],
  content: 'Dream with drawing',
};

function createDrawingExporterMock(
  base64Png: string = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
): jest.Mocked<DreamDrawingExporter> {
  return {
    exportToPngBase64: jest.fn<Promise<string>, []>(async () => base64Png),
  };
}

function createDrawingFileStoreMock(): jest.Mocked<DreamDrawingFileStore> {
  return {
    saveBase64Png: jest.fn<Promise<string>, [{ drawingId: string; base64Png: string }]>(
      async () => 'file:///sandbox/lucidream/drawings/dream-1-drawing-1.png',
    ),
  };
}

describe('SaveDreamDrawingUseCase', () => {
  it('blocks drawing save when FREE drawings-per-dream limit is reached', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('FREE');
    const usageLogRepository = createUsageLogRepositoryMock();
    const drawingFileStore = createDrawingFileStoreMock();
    const drawingExporter = createDrawingExporterMock();

    dreamRepository.getById.mockResolvedValue(BASE_DREAM);
    dreamRepository.countDrawingsByDreamId.mockResolvedValue(1);

    const useCase = new SaveDreamDrawingUseCase(
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      new FakeClock(Date.parse('2026-02-26T12:00:00.000Z')),
      drawingFileStore,
    );

    const result = await useCase.execute({
      dreamId: BASE_DREAM.id,
      exporter: drawingExporter,
    });

    expect(result).toEqual({
      ok: false,
      code: 'DRAWING_QUOTA_REACHED',
      decision: expect.objectContaining({
        canAddDrawing: false,
        maxDrawingsPerDream: 1,
      }),
    });
    expect(drawingExporter.exportToPngBase64).not.toHaveBeenCalled();
    expect(drawingFileStore.saveBase64Png).not.toHaveBeenCalled();
    expect(dreamRepository.update).not.toHaveBeenCalled();
  });

  it('allows drawing save while MEDIUM drawings-per-dream limit is not reached', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('MEDIUM');
    const usageLogRepository = createUsageLogRepositoryMock();
    const drawingFileStore = createDrawingFileStoreMock();
    const drawingExporter = createDrawingExporterMock();

    dreamRepository.getById.mockResolvedValue(BASE_DREAM);
    dreamRepository.countDrawingsByDreamId.mockResolvedValue(2);

    const useCase = new SaveDreamDrawingUseCase(
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      new FakeClock(Date.parse('2026-02-26T12:00:00.000Z')),
      drawingFileStore,
    );

    const result = await useCase.execute({
      dreamId: BASE_DREAM.id,
      exporter: drawingExporter,
    });

    expect(result).toEqual({
      ok: true,
      dream: {
        ...BASE_DREAM,
        drawingPath: 'file:///sandbox/lucidream/drawings/dream-1-drawing-1.png',
      },
      drawingPath: 'file:///sandbox/lucidream/drawings/dream-1-drawing-1.png',
      decision: expect.objectContaining({
        canAddDrawing: true,
        maxDrawingsPerDream: 3,
      }),
    });
    expect(drawingExporter.exportToPngBase64).toHaveBeenCalledTimes(1);
    expect(drawingFileStore.saveBase64Png).toHaveBeenCalledWith({
      drawingId: 'dream-1-drawing-3',
      base64Png: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
    });
    expect(dreamRepository.update).toHaveBeenCalledWith({
      ...BASE_DREAM,
      drawingPath: 'file:///sandbox/lucidream/drawings/dream-1-drawing-1.png',
    });
  });

  it('blocks drawing save when MEDIUM drawings-per-dream limit is reached', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('MEDIUM');
    const usageLogRepository = createUsageLogRepositoryMock();
    const drawingFileStore = createDrawingFileStoreMock();
    const drawingExporter = createDrawingExporterMock();

    dreamRepository.getById.mockResolvedValue(BASE_DREAM);
    dreamRepository.countDrawingsByDreamId.mockResolvedValue(3);

    const useCase = new SaveDreamDrawingUseCase(
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      new FakeClock(Date.parse('2026-02-26T12:00:00.000Z')),
      drawingFileStore,
    );

    const result = await useCase.execute({
      dreamId: BASE_DREAM.id,
      exporter: drawingExporter,
    });

    expect(result).toEqual({
      ok: false,
      code: 'DRAWING_QUOTA_REACHED',
      decision: expect.objectContaining({
        canAddDrawing: false,
        maxDrawingsPerDream: 3,
      }),
    });
    expect(drawingExporter.exportToPngBase64).not.toHaveBeenCalled();
    expect(drawingFileStore.saveBase64Png).not.toHaveBeenCalled();
    expect(dreamRepository.update).not.toHaveBeenCalled();
  });
});
