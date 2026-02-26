import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Dream } from '../../domain';
import type { ListDreamsResult } from '../../services';
import { THEME_PALETTES } from '../../theme';
import { DreamHistoryScreenView } from './DreamHistoryScreen';

type SuccessfulListDreamsResult = Extract<ListDreamsResult, { ok: true }>;

function createGateDecision(maxHistoryDays: number | null) {
  return {
    evaluatedAt: Date.parse('2026-02-26T06:30:00.000Z'),
    todayKey: '2026-02-26',
    last7DaysWindowStartKey: '2026-02-20',
    canCreateDream: true,
    canPlayAudio: true,
    canSendRC: true,
    canUseWBTB: true,
    canAddDrawing: true,
    maxHistoryDays,
    maxDreamsPerDay: 2,
    maxAudioPlaysLast7Days: 1,
    maxAudioPlaysPerDay: null,
    maxRcPerDay: 3,
    maxWbtbUsesLast7Days: 1,
    maxDrawingsPerDream: 1,
    exportEnabled: false,
  };
}

function createListResult(
  dreams: readonly Dream[],
  maxHistoryDays: number | null,
): SuccessfulListDreamsResult {
  return {
    ok: true,
    dreams,
    decision: createGateDecision(maxHistoryDays),
    appliedStartCreatedAt: Date.parse('2026-02-20T00:00:00.000Z'),
    appliedEndCreatedAt: Date.parse('2026-02-26T23:59:59.999Z'),
  };
}

describe('DreamHistoryScreenView', () => {
  it('renders dream list from ListDreams use-case', async () => {
    const dreams: readonly Dream[] = [
      {
        id: 'dream-1',
        createdAt: Date.parse('2026-02-26T05:40:00.000Z'),
        quality: 'LUCID',
        tagIds: [],
        title: 'Sky bridge',
        content: 'I stabilized the dream and stayed aware.',
      },
      {
        id: 'dream-2',
        createdAt: Date.parse('2026-02-25T06:10:00.000Z'),
        quality: 'CLEAR',
        tagIds: [],
        content: 'Foggy city walk.',
      },
    ];
    const listDreamsUseCase = {
      execute: jest.fn(async () => createListResult(dreams, 30)),
    };

    render(
      <DreamHistoryScreenView
        activeThemePalette={THEME_PALETTES.dark}
        listDreamsUseCase={listDreamsUseCase}
        onOpenDream={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(listDreamsUseCase.execute).toHaveBeenCalledWith();
    });
    expect(screen.getByText('Sky bridge')).toBeTruthy();
    expect(screen.getByText('Untitled dream')).toBeTruthy();
  });

  it('shows FREE history limit label in UI', async () => {
    const listDreamsUseCase = {
      execute: jest.fn(async () => createListResult([], 7)),
    };

    render(
      <DreamHistoryScreenView
        activeThemePalette={THEME_PALETTES.dark}
        listDreamsUseCase={listDreamsUseCase}
        onOpenDream={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('dream-history-limit-label')).toHaveTextContent(
        'Limited to last 7 days',
      );
    });
  });

  it('opens dream detail callback when selecting a dream', async () => {
    const onOpenDream = jest.fn();
    const dream: Dream = {
      id: 'dream-1',
      createdAt: Date.parse('2026-02-26T05:40:00.000Z'),
      quality: 'LUCID',
      tagIds: ['tag-1'],
      title: 'Sky bridge',
      content: 'I stabilized the dream and stayed aware.',
    };
    const listDreamsUseCase = {
      execute: jest.fn(async () => createListResult([dream], 7)),
    };

    render(
      <DreamHistoryScreenView
        activeThemePalette={THEME_PALETTES.dark}
        listDreamsUseCase={listDreamsUseCase}
        onOpenDream={onOpenDream}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('dream-history-item-dream-1')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('dream-history-item-dream-1'));
    expect(onOpenDream).toHaveBeenCalledWith(dream);
  });
});
