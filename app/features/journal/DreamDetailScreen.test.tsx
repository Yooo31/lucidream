import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { FakeClock, type Dream, type Tag } from '../../domain';
import {
  PlayDreamAudioUseCase,
  SaveDreamDrawingUseCase,
  type DreamAudioPlayer,
} from '../../services';
import {
  createDreamRepositoryMock,
  createLicenseRepositoryMock,
  createUsageLogRepositoryMock,
} from '../../services/useCases/testing/createRepositoryMocks';
import {
  SqliteDreamRepository,
  SqliteLicenseRepository,
  SqliteUsageLogRepository,
} from '../../storage/sqlite';
import { InMemorySqliteTestDatabase } from '../../storage/sqlite/testing/InMemorySqliteTestDatabase';
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
    pause: jest.fn(async () => undefined),
    stop: jest.fn(async () => undefined),
  };

  return {
    recordDreamAudioUseCase,
    playDreamAudioUseCase,
  };
}

function createDrawingController() {
  return {
    execute: jest.fn(async () => ({
      ok: true as const,
      dream: {
        ...BASE_DREAM,
        drawingPath: 'file:///sandbox/lucidream/drawings/dream-1-drawing-1.png',
      },
      drawingPath: 'file:///sandbox/lucidream/drawings/dream-1-drawing-1.png',
      decision: {
        maxDrawingsPerDream: 1,
      },
    })),
  };
}

function createPlayUseCaseWithMockAudioPlayer() {
  const dreamRepository = createDreamRepositoryMock();
  const licenseRepository = createLicenseRepositoryMock('FREE');
  const usageLogRepository = createUsageLogRepositoryMock();
  const audioPlayer: jest.Mocked<DreamAudioPlayer> = {
    play: jest.fn<Promise<void>, [string]>(async () => undefined),
    pause: jest.fn<Promise<void>, []>(async () => undefined),
    stop: jest.fn<Promise<void>, []>(async () => undefined),
  };

  dreamRepository.getById.mockResolvedValue({
    ...BASE_DREAM,
    audioPath: 'file:///sandbox/lucidream/audio/dream-1.m4a',
  });

  const playDreamAudioUseCase = new PlayDreamAudioUseCase(
    dreamRepository,
    licenseRepository,
    usageLogRepository,
    new FakeClock(Date.parse('2026-02-26T12:00:00.000Z')),
    audioPlayer,
    () => 'usage-log-audio-component-test',
  );

  return {
    playDreamAudioUseCase,
    audioPlayer,
    usageLogRepository,
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
        saveDreamDrawingUseCase={createDrawingController()}
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
        saveDreamDrawingUseCase={createDrawingController()}
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
        saveDreamDrawingUseCase={createDrawingController()}
      />,
    );

    fireEvent.press(screen.getByTestId('dream-detail-audio-record-toggle'));

    await waitFor(() => {
      expect(recordDreamAudioUseCase.start).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('dream-detail-audio-record-toggle')).toHaveTextContent('Stop');
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
        saveDreamDrawingUseCase={createDrawingController()}
      />,
    );

    fireEvent.press(screen.getByTestId('dream-detail-audio-play-button'));

    await waitFor(() => {
      expect(playDreamAudioUseCase.execute).toHaveBeenCalledWith({
        dreamId: BASE_DREAM.id,
      });
      expect(screen.getByText('Playback limit reached (1 per 7 days).')).toBeTruthy();
      expect(screen.getByText('Plays remaining in 7 days: 0 of 1.')).toBeTruthy();
    });
  });

  it('transitions play, pause, and stop with a mocked audio player', async () => {
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
    const recordDreamAudioUseCase = {
      start: jest.fn(async () => ({ ok: true as const })),
      stopAndAttach: jest.fn(async () => ({ ok: false as const })),
    };
    const { playDreamAudioUseCase, audioPlayer, usageLogRepository } =
      createPlayUseCaseWithMockAudioPlayer();

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
        saveDreamDrawingUseCase={createDrawingController()}
      />,
    );

    fireEvent.press(screen.getByTestId('dream-detail-audio-play-button'));

    await waitFor(() => {
      expect(audioPlayer.play).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('dream-detail-audio-playback-state')).toHaveTextContent(
        'Playback state: Playing',
      );
      expect(usageLogRepository.create).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(screen.getByTestId('dream-detail-audio-pause-button'));

    await waitFor(() => {
      expect(audioPlayer.pause).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('dream-detail-audio-playback-state')).toHaveTextContent(
        'Playback state: Paused',
      );
      expect(screen.getByText('Playback paused.')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('dream-detail-audio-play-button'));

    await waitFor(() => {
      expect(audioPlayer.play).toHaveBeenCalledTimes(2);
      expect(usageLogRepository.create).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Playback resumed.')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('dream-detail-audio-stop-button'));

    await waitFor(() => {
      expect(audioPlayer.stop).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('dream-detail-audio-playback-state')).toHaveTextContent(
        'Playback state: Idle',
      );
      expect(screen.getByText('Playback stopped.')).toBeTruthy();
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
        saveDreamDrawingUseCase={createDrawingController()}
      />,
    );

    fireEvent.press(screen.getByTestId('dream-detail-audio-play-button'));

    await waitFor(() => {
      expect(playDreamAudioUseCase.execute).toHaveBeenCalledWith({
        dreamId: BASE_DREAM.id,
      });
      expect(screen.getByText('Playback started.')).toBeTruthy();
      expect(screen.getByTestId('dream-detail-audio-playback-state')).toHaveTextContent(
        'Playback state: Playing',
      );
    });

    fireEvent.press(screen.getByTestId('dream-detail-audio-stop-button'));

    await waitFor(() => {
      expect(playDreamAudioUseCase.stop).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Playback stopped.')).toBeTruthy();
      expect(screen.getByTestId('dream-detail-audio-playback-state')).toHaveTextContent(
        'Playback state: Idle',
      );
    });
  });

  it('saves drawing PNG locally and creates a dream asset record', async () => {
    const database = new InMemorySqliteTestDatabase();
    const dreamRepository = new SqliteDreamRepository(database);
    const licenseRepository = new SqliteLicenseRepository(database);
    const usageLogRepository = new SqliteUsageLogRepository(database);

    await licenseRepository.create('FREE');
    await dreamRepository.create(BASE_DREAM);

    const drawingExporter = {
      exportToPngBase64: jest.fn(async () => 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'),
      clear: jest.fn(),
    };
    const drawingFileStore = {
      saveBase64Png: jest.fn<
        Promise<string>,
        [
          {
            drawingId: string;
            base64Png: string;
          },
        ]
      >(async ({ drawingId }) => `file:///sandbox/lucidream/drawings/${drawingId}.png`),
    };
    const saveDreamDrawingUseCase = new SaveDreamDrawingUseCase(
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      new FakeClock(Date.parse('2026-02-26T12:00:00.000Z')),
      drawingFileStore,
    );
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
        saveDreamDrawingUseCase={saveDreamDrawingUseCase}
        drawingExporter={drawingExporter}
      />,
    );

    fireEvent.press(screen.getByTestId('dream-detail-drawing-save-button'));

    await waitFor(() => {
      expect(drawingExporter.exportToPngBase64).toHaveBeenCalledTimes(1);
      expect(drawingFileStore.saveBase64Png).toHaveBeenCalledWith({
        drawingId: 'dream-1-drawing-1',
        base64Png: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
      });
      expect(screen.getByTestId('dream-detail-drawing-item')).toHaveTextContent(
        'dream-1-drawing-1.png',
      );
    });

    expect(await dreamRepository.countDrawingsByDreamId(BASE_DREAM.id)).toBe(1);
    expect((await dreamRepository.getById(BASE_DREAM.id))?.drawingPath).toBe(
      'file:///sandbox/lucidream/drawings/dream-1-drawing-1.png',
    );
    expect(drawingExporter.clear).toHaveBeenCalledTimes(1);
  });
});
