import { FakeClock, type Tag } from '../../domain';

import { CreateTagUseCase } from './CreateTagUseCase';
import { createTagRepositoryMock } from './testing/createRepositoryMocks';

const FIXED_NOW = Date.parse('2026-02-26T12:00:00.000Z');

describe('CreateTagUseCase', () => {
  it('returns existing tag when same normalized name/type already exists', async () => {
    const tagRepository = createTagRepositoryMock();
    const existingTag: Tag = {
      id: 'tag-existing',
      name: 'Forest Path',
      type: 'LOCATION',
      createdAt: FIXED_NOW - 1000,
    };
    tagRepository.findByNormalizedNameAndType.mockResolvedValue(existingTag);

    const useCase = new CreateTagUseCase(tagRepository, new FakeClock(FIXED_NOW));
    const result = await useCase.execute({
      name: '  forest    path ',
      type: 'LOCATION',
    });

    expect(result).toEqual({
      ok: true,
      created: false,
      tag: existingTag,
    });
    expect(tagRepository.create).not.toHaveBeenCalled();
  });

  it('creates new tag with normalized name when none exists', async () => {
    const tagRepository = createTagRepositoryMock();
    const useCase = new CreateTagUseCase(tagRepository, new FakeClock(FIXED_NOW), () => 'tag-1');

    const result = await useCase.execute({
      name: '  moon   city  ',
      type: 'LOCATION',
    });

    expect(result).toEqual({
      ok: true,
      created: true,
      tag: {
        id: 'tag-1',
        name: 'moon city',
        type: 'LOCATION',
        createdAt: FIXED_NOW,
      },
    });
    expect(tagRepository.create).toHaveBeenCalledWith({
      id: 'tag-1',
      name: 'moon city',
      type: 'LOCATION',
      createdAt: FIXED_NOW,
    });
  });

  it('returns validation failure for blank name', async () => {
    const tagRepository = createTagRepositoryMock();
    const useCase = new CreateTagUseCase(tagRepository, new FakeClock(FIXED_NOW));
    const result = await useCase.execute({
      name: '   ',
      type: 'ACTION',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected validation failure.');
    }

    expect(result.code).toBe('VALIDATION_FAILED');
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'name' })]),
    );
  });
});
