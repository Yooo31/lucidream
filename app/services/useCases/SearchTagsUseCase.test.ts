import { FakeClock, type Tag } from '../../domain';

import { SearchTagsUseCase } from './SearchTagsUseCase';
import {
  createDreamRepositoryMock,
  createLicenseRepositoryMock,
  createTagRepositoryMock,
  createUsageLogRepositoryMock,
} from './testing/createRepositoryMocks';

const FIXED_NOW = Date.parse('2026-02-26T12:00:00.000Z');

describe('SearchTagsUseCase', () => {
  it('applies FREE tag search limit when no explicit limit is requested', async () => {
    const tagRepository = createTagRepositoryMock();
    const dreamRepository = createDreamRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('FREE');
    const usageLogRepository = createUsageLogRepositoryMock();

    const returnedTags: readonly Tag[] = [
      {
        id: 'tag-1',
        name: 'Flying',
        type: 'ACTION',
        createdAt: FIXED_NOW,
      },
    ];
    tagRepository.searchByTypeAndName.mockResolvedValue(returnedTags);

    const useCase = new SearchTagsUseCase(
      tagRepository,
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      new FakeClock(FIXED_NOW),
    );

    const result = await useCase.execute({
      type: 'ACTION',
      query: 'fly',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected successful search result.');
    }

    expect(result.appliedLimit).toBe(5);
    expect(result.decision.maxTagSearchResults).toBe(5);
    expect(result.tags).toEqual(returnedTags);
    expect(tagRepository.searchByTypeAndName).toHaveBeenCalledWith('ACTION', 'fly', 5);
  });

  it('clamps explicit limit to MEDIUM gate limit', async () => {
    const tagRepository = createTagRepositoryMock();
    const useCase = new SearchTagsUseCase(
      tagRepository,
      createDreamRepositoryMock(),
      createLicenseRepositoryMock('MEDIUM'),
      createUsageLogRepositoryMock(),
      new FakeClock(FIXED_NOW),
    );

    await useCase.execute({
      type: 'CHARACTER',
      query: 'guide',
      limit: 99,
    });

    expect(tagRepository.searchByTypeAndName).toHaveBeenCalledWith('CHARACTER', 'guide', 15);
  });

  it('keeps explicit limit for PRO license', async () => {
    const tagRepository = createTagRepositoryMock();
    const useCase = new SearchTagsUseCase(
      tagRepository,
      createDreamRepositoryMock(),
      createLicenseRepositoryMock('PRO'),
      createUsageLogRepositoryMock(),
      new FakeClock(FIXED_NOW),
    );

    const result = await useCase.execute({
      type: 'EMOTION',
      query: 'joy',
      limit: 7,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected successful search result.');
    }

    expect(result.appliedLimit).toBe(7);
    expect(tagRepository.searchByTypeAndName).toHaveBeenCalledWith('EMOTION', 'joy', 7);
  });

  it('passes undefined limit for PRO when no limit is requested', async () => {
    const tagRepository = createTagRepositoryMock();
    const useCase = new SearchTagsUseCase(
      tagRepository,
      createDreamRepositoryMock(),
      createLicenseRepositoryMock('PRO'),
      createUsageLogRepositoryMock(),
      new FakeClock(FIXED_NOW),
    );

    const result = await useCase.execute({
      type: 'LOCATION',
      query: 'forest',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected successful search result.');
    }

    expect(result.appliedLimit).toBeNull();
    expect(result.decision.maxTagSearchResults).toBeNull();
    expect(tagRepository.searchByTypeAndName).toHaveBeenCalledWith('LOCATION', 'forest', undefined);
  });
});
