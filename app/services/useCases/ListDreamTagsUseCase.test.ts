import type { Tag } from '../../domain';

import { ListDreamTagsUseCase } from './ListDreamTagsUseCase';
import { createTagRepositoryMock } from './testing/createRepositoryMocks';

describe('ListDreamTagsUseCase', () => {
  it('returns tags for dream id', async () => {
    const tagRepository = createTagRepositoryMock();
    const tags: readonly Tag[] = [
      {
        id: 'tag-1',
        name: 'Forest',
        type: 'LOCATION',
        createdAt: Date.parse('2026-02-26T12:00:00.000Z'),
      },
    ];
    tagRepository.listByDreamId.mockResolvedValue(tags);

    const useCase = new ListDreamTagsUseCase(tagRepository);
    const result = await useCase.execute({
      dreamId: 'dream-1',
    });

    expect(result).toEqual({
      ok: true,
      tags,
    });
  });

  it('returns validation failure for invalid dream id', async () => {
    const useCase = new ListDreamTagsUseCase(createTagRepositoryMock());
    const result = await useCase.execute({
      dreamId: '   ',
    });

    expect(result).toEqual({
      ok: false,
      code: 'VALIDATION_FAILED',
      issues: [
        {
          field: 'dreamId',
          message: 'dreamId is required.',
        },
      ],
    });
  });
});
