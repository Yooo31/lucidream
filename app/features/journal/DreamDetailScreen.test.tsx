import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Dream, Tag } from '../../domain';
import { THEME_PALETTES } from '../../theme';
import { DreamDetailScreenView } from './DreamDetailScreen';

const BASE_DREAM: Dream = {
  id: 'dream-1',
  createdAt: Date.parse('2026-02-26T05:40:00.000Z'),
  quality: 'CLEAR',
  tagIds: [],
  title: 'Night walk',
  content: 'I walked through a glowing forest.',
};

function createSearchResult(tags: readonly Tag[]) {
  return {
    ok: true as const,
    tags,
    decision: {
      maxTagSearchResults: 5,
    },
  };
}

describe('DreamDetailScreenView', () => {
  it('adds an existing suggested tag to the dream', async () => {
    const suggestedTag: Tag = {
      id: 'tag-action-flying',
      name: 'Flying',
      type: 'ACTION',
      createdAt: Date.parse('2026-02-26T04:00:00.000Z'),
    };
    const searchTagsUseCase = {
      execute: jest.fn(async () => createSearchResult([suggestedTag])),
    };
    const createTagUseCase = {
      execute: jest.fn(async () => ({
        ok: true as const,
        tag: suggestedTag,
      })),
    };
    const addTagToDreamUseCase = {
      execute: jest.fn(async () => ({
        ok: true as const,
        dream: {
          ...BASE_DREAM,
          tagIds: [suggestedTag.id],
        },
      })),
    };
    const listDreamTagsUseCase = {
      execute: jest.fn(async () => ({
        ok: true as const,
        tags: [],
      })),
    };

    render(
      <DreamDetailScreenView
        activeThemePalette={THEME_PALETTES.dark}
        dream={BASE_DREAM}
        searchTagsUseCase={searchTagsUseCase}
        createTagUseCase={createTagUseCase}
        addTagToDreamUseCase={addTagToDreamUseCase}
        listDreamTagsUseCase={listDreamTagsUseCase}
      />,
    );

    await waitFor(() => {
      expect(listDreamTagsUseCase.execute).toHaveBeenCalledWith({ dreamId: BASE_DREAM.id });
    });

    fireEvent.press(screen.getByTestId('dream-detail-tag-type-ACTION'));
    fireEvent.changeText(screen.getByTestId('dream-detail-tag-search-input'), 'fly');

    await waitFor(() => {
      expect(searchTagsUseCase.execute).toHaveBeenCalledWith({ type: 'ACTION', query: 'fly' });
    });

    fireEvent.press(screen.getByTestId('dream-detail-tag-suggestion-tag-action-flying'));

    await waitFor(() => {
      expect(addTagToDreamUseCase.execute).toHaveBeenCalledWith({
        dreamId: BASE_DREAM.id,
        tagId: suggestedTag.id,
      });
    });
    expect(screen.getByText('Attached tag: Flying')).toBeTruthy();
  });

  it('creates and attaches a new tag when no suggestion matches', async () => {
    const createdTag: Tag = {
      id: 'tag-place-castle',
      name: 'Castle',
      type: 'LOCATION',
      createdAt: Date.parse('2026-02-26T04:30:00.000Z'),
    };
    const searchTagsUseCase = {
      execute: jest.fn(async () => createSearchResult([])),
    };
    const createTagUseCase = {
      execute: jest.fn(async () => ({
        ok: true as const,
        tag: createdTag,
      })),
    };
    const addTagToDreamUseCase = {
      execute: jest.fn(async () => ({
        ok: true as const,
        dream: {
          ...BASE_DREAM,
          tagIds: [createdTag.id],
        },
      })),
    };
    const listDreamTagsUseCase = {
      execute: jest.fn(async () => ({
        ok: true as const,
        tags: [],
      })),
    };

    render(
      <DreamDetailScreenView
        activeThemePalette={THEME_PALETTES.dark}
        dream={BASE_DREAM}
        searchTagsUseCase={searchTagsUseCase}
        createTagUseCase={createTagUseCase}
        addTagToDreamUseCase={addTagToDreamUseCase}
        listDreamTagsUseCase={listDreamTagsUseCase}
      />,
    );

    fireEvent.press(screen.getByTestId('dream-detail-tag-type-LOCATION'));
    fireEvent.changeText(screen.getByTestId('dream-detail-tag-search-input'), 'Castle');

    await waitFor(() => {
      expect(screen.getByTestId('dream-detail-tag-create-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('dream-detail-tag-create-button'));

    await waitFor(() => {
      expect(createTagUseCase.execute).toHaveBeenCalledWith({
        type: 'LOCATION',
        name: 'Castle',
      });
    });
    expect(addTagToDreamUseCase.execute).toHaveBeenCalledWith({
      dreamId: BASE_DREAM.id,
      tagId: createdTag.id,
    });
    expect(screen.getByText('Attached tag: Castle')).toBeTruthy();
  });
});
