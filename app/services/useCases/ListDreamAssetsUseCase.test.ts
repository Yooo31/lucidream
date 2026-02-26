import type { DreamAsset } from '../../domain';

import { ListDreamAssetsUseCase } from './ListDreamAssetsUseCase';
import { createDreamRepositoryMock } from './testing/createRepositoryMocks';

describe('ListDreamAssetsUseCase', () => {
  it('returns assets from the repository for a valid dream id', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const assets: readonly DreamAsset[] = [
      {
        id: 'dream-1:AUDIO',
        dreamId: 'dream-1',
        type: 'AUDIO',
        filePath: 'file:///sandbox/lucidream/audio/dream-1.m4a',
        createdAt: Date.parse('2026-02-26T05:30:00.000Z'),
      },
    ];

    dreamRepository.listAssetsByDreamId.mockResolvedValue(assets);

    const useCase = new ListDreamAssetsUseCase(dreamRepository);

    await expect(useCase.execute({ dreamId: 'dream-1' })).resolves.toEqual({
      ok: true,
      assets,
    });
    expect(dreamRepository.listAssetsByDreamId).toHaveBeenCalledWith('dream-1');
  });
});
