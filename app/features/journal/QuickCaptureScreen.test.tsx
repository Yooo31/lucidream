import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { CreateDreamResult, ListDreamsResult } from '../../services';
import { THEME_PALETTES, type ThemePalette } from '../../theme';
import { QuickCaptureScreenView } from './QuickCaptureScreen';

type SuccessfulListDreamsResult = Extract<ListDreamsResult, { ok: true }>;

function createGateDecision(canCreateDream: boolean, maxDreamsPerDay: number | null) {
  return {
    evaluatedAt: Date.parse('2026-02-26T06:30:00.000Z'),
    todayKey: '2026-02-26',
    last7DaysWindowStartKey: '2026-02-20',
    canCreateDream,
    canPlayAudio: true,
    canSendRC: true,
    canUseWBTB: true,
    canAddDrawing: true,
    maxHistoryDays: 7,
    maxDreamsPerDay,
    maxAudioPlaysLast7Days: 1,
    maxAudioPlaysPerDay: null,
    maxTagSearchResults: 5,
    maxRcPerDay: 3,
    maxWbtbUsesLast7Days: 1,
    maxDrawingsPerDream: 1,
    exportEnabled: false,
  };
}

function renderQuickCaptureView({
  activeThemePalette = THEME_PALETTES.dark,
  createResult = {
    ok: true as const,
    dream: {
      id: 'dream-1',
      createdAt: Date.parse('2026-02-26T05:45:00.000Z'),
      quality: 'LUCID' as const,
      tagIds: [],
      title: 'Sky city',
      content: 'I took off and stayed lucid.',
    },
    decision: createGateDecision(true, 2),
  },
  gateResult = {
    ok: true as const,
    dreams: [],
    decision: createGateDecision(true, 2),
    appliedStartCreatedAt: 1,
    appliedEndCreatedAt: Date.parse('2026-02-26T06:30:00.000Z'),
  },
}: {
  activeThemePalette?: ThemePalette;
  createResult?: CreateDreamResult;
  gateResult: SuccessfulListDreamsResult;
}) {
  const createDreamUseCase = {
    execute: jest.fn(async () => createResult),
  };

  const listDreamsUseCase = {
    execute: jest.fn(async () => gateResult),
  };

  render(
    <QuickCaptureScreenView
      activeThemePalette={activeThemePalette}
      createDreamUseCase={createDreamUseCase}
      listDreamsUseCase={listDreamsUseCase}
      now={() => Date.parse('2026-02-26T05:40:00.000Z')}
    />,
  );

  return {
    createDreamUseCase,
    listDreamsUseCase,
  };
}

describe('QuickCaptureScreenView', () => {
  it('saves dream by calling CreateDream use-case', async () => {
    const { createDreamUseCase, listDreamsUseCase } = renderQuickCaptureView({
      gateResult: {
        ok: true,
        dreams: [],
        decision: createGateDecision(true, 2),
        appliedStartCreatedAt: 1,
        appliedEndCreatedAt: Date.parse('2026-02-26T06:30:00.000Z'),
      },
    });

    await waitFor(() => {
      expect(listDreamsUseCase.execute).toHaveBeenCalledWith({ limit: 0 });
    });

    fireEvent.changeText(screen.getByTestId('quick-capture-title-input'), 'Sky city');
    fireEvent.changeText(
      screen.getByTestId('quick-capture-story-input'),
      'I took off and stayed lucid.',
    );
    fireEvent.press(screen.getByTestId('quick-capture-quality-top-button'));
    fireEvent.press(screen.getByTestId('quick-capture-lucidity-track'), {
      nativeEvent: { locationX: 200 },
    });
    fireEvent.press(screen.getByTestId('quick-capture-save-button'));

    await waitFor(() => {
      expect(createDreamUseCase.execute).toHaveBeenCalledTimes(1);
    });
    expect(createDreamUseCase.execute).toHaveBeenCalledWith({
      createdAt: Date.parse('2026-02-26T05:40:00.000Z'),
      quality: 'LUCID',
      title: 'Sky city',
      content: 'I took off and stayed lucid.',
    });
  });

  it('shows gate message and does not call create when quota blocks', async () => {
    const gateResult = {
      ok: true as const,
      dreams: [],
      decision: createGateDecision(false, 2),
      appliedStartCreatedAt: 1,
      appliedEndCreatedAt: Date.parse('2026-02-26T06:30:00.000Z'),
    };
    const { createDreamUseCase } = renderQuickCaptureView({
      gateResult,
    });

    await waitFor(() => {
      expect(screen.getByTestId('quick-capture-gate-message')).toHaveTextContent(
        'Dream quota reached (2 per day). Try again tomorrow.',
      );
    });

    fireEvent.changeText(screen.getByTestId('quick-capture-story-input'), 'Blocked save attempt.');
    fireEvent.press(screen.getByTestId('quick-capture-save-button'));

    expect(createDreamUseCase.execute).not.toHaveBeenCalled();
  });
});
