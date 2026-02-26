import type { Dream, DreamAsset } from '../../domain';

import { DeleteDreamAssetUseCase } from './DeleteDreamAssetUseCase';
import { createDreamRepositoryMock } from './testing/createRepositoryMocks';

const BASE_DREAM: Dream = {
  id: 'dream-1',
  createdAt: Date.parse('2026-02-26T05:30:00.000Z'),
  quality: 'VIVID',
  tagIds: [],
  content: 'Dream with assets',
};

describe('DeleteDreamAssetUseCase', () => {
  it('deletes asset row before deleting local file and returns updated dream assets', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const assetFileStore = {
      delete: jest.fn<Promise<void>, [string]>(async () => undefined),
    };
    const deletedAsset: DreamAsset = {
      id: 'dream-1:AUDIO',
      dreamId: BASE_DREAM.id,
      type: 'AUDIO',
      filePath: 'file:///sandbox/lucidream/audio/dream-1.m4a',
      createdAt: BASE_DREAM.createdAt,
    };

    dreamRepository.listAssetsByDreamId
      .mockResolvedValueOnce([deletedAsset])
      .mockResolvedValueOnce([]);
    dreamRepository.getById.mockResolvedValue({ ...BASE_DREAM });

    const useCase = new DeleteDreamAssetUseCase(dreamRepository, assetFileStore);

    const result = await useCase.execute({
      dreamId: BASE_DREAM.id,
      assetId: deletedAsset.id,
    });

    expect(result).toEqual({
      ok: true,
      dream: BASE_DREAM,
      assets: [],
      deletedAsset,
    });
    expect(dreamRepository.deleteAsset).toHaveBeenCalledWith(BASE_DREAM.id, deletedAsset.id);
    expect(assetFileStore.delete).toHaveBeenCalledWith(deletedAsset.filePath);
    const repositoryDeleteOrder = dreamRepository.deleteAsset.mock.invocationCallOrder.at(0);
    const fileDeleteOrder = assetFileStore.delete.mock.invocationCallOrder.at(0);

    expect(repositoryDeleteOrder).toBeDefined();
    expect(fileDeleteOrder).toBeDefined();

    if (repositoryDeleteOrder === undefined || fileDeleteOrder === undefined) {
      throw new Error('Expected both delete calls to be invoked.');
    }

    expect(repositoryDeleteOrder).toBeLessThan(fileDeleteOrder);
  });
});
