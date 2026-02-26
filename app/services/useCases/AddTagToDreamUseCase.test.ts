import type { Dream, Tag } from '../../domain';

import { AddTagToDreamUseCase } from './AddTagToDreamUseCase';
import {
  createDreamRepositoryMock,
  createTagRepositoryMock,
} from './testing/createRepositoryMocks';

const BASE_DREAM: Dream = {
  id: 'dream-1',
  createdAt: Date.parse('2026-02-26T12:00:00.000Z'),
  quality: 'CLEAR',
  tagIds: [],
  content: 'I was flying over a city.',
};

const BASE_TAG: Tag = {
  id: 'tag-1',
  name: 'Flying',
  type: 'ACTION',
  createdAt: Date.parse('2026-02-25T12:00:00.000Z'),
};

describe('AddTagToDreamUseCase', () => {
  it('returns DREAM_NOT_FOUND when the dream does not exist', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const tagRepository = createTagRepositoryMock();
    tagRepository.getById.mockResolvedValue(BASE_TAG);

    const useCase = new AddTagToDreamUseCase(dreamRepository, tagRepository);
    const result = await useCase.execute({
      dreamId: 'missing',
      tagId: BASE_TAG.id,
    });

    expect(result).toEqual({
      ok: false,
      code: 'DREAM_NOT_FOUND',
    });
    expect(dreamRepository.update).not.toHaveBeenCalled();
  });

  it('returns TAG_NOT_FOUND when the tag does not exist', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const tagRepository = createTagRepositoryMock();
    dreamRepository.getById.mockResolvedValue(BASE_DREAM);

    const useCase = new AddTagToDreamUseCase(dreamRepository, tagRepository);
    const result = await useCase.execute({
      dreamId: BASE_DREAM.id,
      tagId: 'missing',
    });

    expect(result).toEqual({
      ok: false,
      code: 'TAG_NOT_FOUND',
    });
    expect(dreamRepository.update).not.toHaveBeenCalled();
  });

  it('adds the tag to the dream and persists update', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const tagRepository = createTagRepositoryMock();
    dreamRepository.getById.mockResolvedValue(BASE_DREAM);
    tagRepository.getById.mockResolvedValue(BASE_TAG);

    const useCase = new AddTagToDreamUseCase(dreamRepository, tagRepository);
    const result = await useCase.execute({
      dreamId: BASE_DREAM.id,
      tagId: BASE_TAG.id,
    });

    expect(result).toEqual({
      ok: true,
      added: true,
      dream: {
        ...BASE_DREAM,
        tagIds: [BASE_TAG.id],
      },
    });
    expect(dreamRepository.update).toHaveBeenCalledWith({
      ...BASE_DREAM,
      tagIds: [BASE_TAG.id],
    });
  });

  it('is idempotent when the tag is already attached', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const tagRepository = createTagRepositoryMock();
    const dreamWithTag: Dream = {
      ...BASE_DREAM,
      tagIds: [BASE_TAG.id],
    };
    dreamRepository.getById.mockResolvedValue(dreamWithTag);
    tagRepository.getById.mockResolvedValue(BASE_TAG);

    const useCase = new AddTagToDreamUseCase(dreamRepository, tagRepository);
    const result = await useCase.execute({
      dreamId: BASE_DREAM.id,
      tagId: BASE_TAG.id,
    });

    expect(result).toEqual({
      ok: true,
      added: false,
      dream: dreamWithTag,
    });
    expect(dreamRepository.update).not.toHaveBeenCalled();
  });
});
