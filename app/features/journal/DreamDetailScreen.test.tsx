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

function createAudioPlaybackDecision() {
  return {
    maxAudioPlaysLast7Days: 1,
    maxAudioPlaysPerDay: null,
  };
}

function createAudioControllers() {
  const recordDreamAudioUseCase = {
    start: jest.fn(async () => ({ ok: true as const })),
    stopAndAttach: jest.fn(async () => ({
      ok: true as const,
      dream: {
        ...BASE_DREAM,
        audioPath: 'file:///sandbox/lucidream/audio/dream-1.m4a',
      },
      audioPath: 'file:///sandbox/lucidream/audio/dream-1.m4a',
    })),
  };

  const playDreamAudioUseCase = {
    execute: jest.fn<
      Promise<{
        ok: boolean;
        code?: string;
        dream?: Dream;
        decision?: {
          maxAudioPlaysLast7Days: number | null;
          maxAudioPlaysPerDay: number | null;
        };
      }>,
      [{ dreamId: string }]
    >(async () => ({
      ok: true,
      dream: {
        ...BASE_DREAM,
        audioPath: 'file:///sandbox/lucidream/audio/dream-1.m4a',
      },
      decision: createAudioPlaybackDecision(),
    })),
    stop: jest.fn(async () => undefined),
  };

  return {
    recordDreamAudioUseCase,
    playDreamAudioUseCase,
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
    const { recordDreamAudioUseCase, playDreamAudioUseCase } = createAudioControllers();

    render(
      <DreamDetailScreenView
        activeThemePalette={THEME_PALETTES.dark}
        dream={BASE_DREAM}
        searchTagsUseCase={searchTagsUseCase}
        createTagUseCase={createTagUseCase}
        addTagToDreamUseCase={addTagToDreamUseCase}
        listDreamTagsUseCase={listDreamTagsUseCase}
        recordDreamAudioUseCase={recordDreamAudioUseCase}
        playDreamAudioUseCase={playDreamAudioUseCase}
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
    const { recordDreamAudioUseCase, playDreamAudioUseCase } = createAudioControllers();

    render(
      <DreamDetailScreenView
        activeThemePalette={THEME_PALETTES.dark}
        dream={BASE_DREAM}
        searchTagsUseCase={searchTagsUseCase}
        createTagUseCase={createTagUseCase}
        addTagToDreamUseCase={addTagToDreamUseCase}
        listDreamTagsUseCase={listDreamTagsUseCase}
        recordDreamAudioUseCase={recordDreamAudioUseCase}
        playDreamAudioUseCase={playDreamAudioUseCase}
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

  it('records and attaches audio to the dream', async () => {
    const searchTagsUseCase = {
      execute: jest.fn(async () => createSearchResult([])),
    };
    const createTagUseCase = {
      execute: jest.fn(async () => ({ ok: false as const })),
    };
    const addTagToDreamUseCase = {
      execute: jest.fn(async () => ({ ok: false as const })),
    };
    const listDreamTagsUseCase = {
      execute: jest.fn(async () => ({
        ok: true as const,
        tags: [],
      })),
    };
    const { recordDreamAudioUseCase, playDreamAudioUseCase } = createAudioControllers();

    render(
      <DreamDetailScreenView
        activeThemePalette={THEME_PALETTES.dark}
        dream={BASE_DREAM}
        searchTagsUseCase={searchTagsUseCase}
        createTagUseCase={createTagUseCase}
        addTagToDreamUseCase={addTagToDreamUseCase}
        listDreamTagsUseCase={listDreamTagsUseCase}
        recordDreamAudioUseCase={recordDreamAudioUseCase}
        playDreamAudioUseCase={playDreamAudioUseCase}
      />,
    );

    fireEvent.press(screen.getByTestId('dream-detail-audio-record-toggle'));

    await waitFor(() => {
      expect(recordDreamAudioUseCase.start).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Stop')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('dream-detail-audio-record-toggle'));

    await waitFor(() => {
      expect(recordDreamAudioUseCase.stopAndAttach).toHaveBeenCalledWith({
        dreamId: BASE_DREAM.id,
      });
      expect(screen.getByTestId('dream-detail-audio-item')).toHaveTextContent('dream-1.m4a');
    });
  });

  it('blocks playback when license gate quota is reached', async () => {
    const searchTagsUseCase = {
      execute: jest.fn(async () => createSearchResult([])),
    };
    const createTagUseCase = {
      execute: jest.fn(async () => ({ ok: false as const })),
    };
    const addTagToDreamUseCase = {
      execute: jest.fn(async () => ({ ok: false as const })),
    };
    const listDreamTagsUseCase = {
      execute: jest.fn(async () => ({
        ok: true as const,
        tags: [],
      })),
    };
    const { recordDreamAudioUseCase, playDreamAudioUseCase } = createAudioControllers();

    playDreamAudioUseCase.execute.mockResolvedValueOnce({
      ok: false,
      code: 'PLAYBACK_QUOTA_REACHED',
      decision: {
        maxAudioPlaysLast7Days: 1,
        maxAudioPlaysPerDay: null,
      },
    });

    render(
      <DreamDetailScreenView
        activeThemePalette={THEME_PALETTES.dark}
        dream={{
          ...BASE_DREAM,
          audioPath: 'file:///sandbox/lucidream/audio/dream-1.m4a',
        }}
        searchTagsUseCase={searchTagsUseCase}
        createTagUseCase={createTagUseCase}
        addTagToDreamUseCase={addTagToDreamUseCase}
        listDreamTagsUseCase={listDreamTagsUseCase}
        recordDreamAudioUseCase={recordDreamAudioUseCase}
        playDreamAudioUseCase={playDreamAudioUseCase}
      />,
    );

    fireEvent.press(screen.getByTestId('dream-detail-audio-play-button'));

    await waitFor(() => {
      expect(playDreamAudioUseCase.execute).toHaveBeenCalledWith({
        dreamId: BASE_DREAM.id,
      });
      expect(screen.getByText('Playback limit reached (1 per 7 days).')).toBeTruthy();
    });
  });

  it('plays attached audio when license gate allows playback', async () => {
    const searchTagsUseCase = {
      execute: jest.fn(async () => createSearchResult([])),
    };
    const createTagUseCase = {
      execute: jest.fn(async () => ({ ok: false as const })),
    };
    const addTagToDreamUseCase = {
      execute: jest.fn(async () => ({ ok: false as const })),
    };
    const listDreamTagsUseCase = {
      execute: jest.fn(async () => ({
        ok: true as const,
        tags: [],
      })),
    };
    const { recordDreamAudioUseCase, playDreamAudioUseCase } = createAudioControllers();

    render(
      <DreamDetailScreenView
        activeThemePalette={THEME_PALETTES.dark}
        dream={{
          ...BASE_DREAM,
          audioPath: 'file:///sandbox/lucidream/audio/dream-1.m4a',
        }}
        searchTagsUseCase={searchTagsUseCase}
        createTagUseCase={createTagUseCase}
        addTagToDreamUseCase={addTagToDreamUseCase}
        listDreamTagsUseCase={listDreamTagsUseCase}
        recordDreamAudioUseCase={recordDreamAudioUseCase}
        playDreamAudioUseCase={playDreamAudioUseCase}
      />,
    );

    fireEvent.press(screen.getByTestId('dream-detail-audio-play-button'));

    await waitFor(() => {
      expect(playDreamAudioUseCase.execute).toHaveBeenCalledWith({
        dreamId: BASE_DREAM.id,
      });
      expect(screen.getByText('Playback started.')).toBeTruthy();
    });
  });
});
