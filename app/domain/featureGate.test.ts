import { FakeClock } from './time';
import {
  LICENSE_GATE_LIMITS,
  resolveFeatureGateDecision,
  type FeatureGateCounts,
} from './featureGate';

const FIXED_NOW = Date.parse('2026-02-26T12:00:00.000Z');

function createCounts(overrides: Partial<FeatureGateCounts> = {}): FeatureGateCounts {
  return {
    dreamsCreatedToday: 0,
    audioPlaysLast7Days: 0,
    audioPlaysToday: 0,
    rcSentToday: 0,
    wbtbUsedLast7Days: 0,
    drawingsPerDreamCount: 0,
    ...overrides,
  };
}

describe('LICENSE_GATE_LIMITS', () => {
  it('matches monetization matrix from spec', () => {
    expect(LICENSE_GATE_LIMITS).toEqual({
      FREE: {
        historyDays: 7,
        dreamsPerDay: 2,
        audioPlaysPer7Days: 1,
        audioPlaysPerDay: null,
        tagSearchResults: 5,
        drawingsPerDream: 1,
        rcPerDay: 3,
        wbtbPer7Days: 1,
        exportEnabled: false,
      },
      MEDIUM: {
        historyDays: 30,
        dreamsPerDay: 5,
        audioPlaysPer7Days: 4,
        audioPlaysPerDay: null,
        tagSearchResults: 15,
        drawingsPerDream: 3,
        rcPerDay: 8,
        wbtbPer7Days: 4,
        exportEnabled: true,
      },
      PRO: {
        historyDays: null,
        dreamsPerDay: null,
        audioPlaysPer7Days: null,
        audioPlaysPerDay: 2,
        tagSearchResults: null,
        drawingsPerDream: 5,
        rcPerDay: null,
        wbtbPer7Days: null,
        exportEnabled: true,
      },
    });
  });
});

describe('resolveFeatureGateDecision', () => {
  it('includes deterministic clock metadata', () => {
    const clock = new FakeClock(FIXED_NOW);

    const decision = resolveFeatureGateDecision('FREE', createCounts(), clock);

    expect(decision.evaluatedAt).toBe(FIXED_NOW);
    expect(decision.todayKey).toBe('2026-02-26');
    expect(decision.last7DaysWindowStartKey).toBe('2026-02-20');
  });

  describe('FREE', () => {
    it('allows actions while under all limits', () => {
      const decision = resolveFeatureGateDecision(
        'FREE',
        createCounts({
          dreamsCreatedToday: 1,
          audioPlaysLast7Days: 0,
          rcSentToday: 2,
          wbtbUsedLast7Days: 0,
          drawingsPerDreamCount: 0,
        }),
        new FakeClock(FIXED_NOW),
      );

      expect(decision.canCreateDream).toBe(true);
      expect(decision.canPlayAudio).toBe(true);
      expect(decision.canSendRC).toBe(true);
      expect(decision.canUseWBTB).toBe(true);
      expect(decision.canAddDrawing).toBe(true);
      expect(decision.maxHistoryDays).toBe(7);
      expect(decision.maxDreamsPerDay).toBe(2);
      expect(decision.maxAudioPlaysLast7Days).toBe(1);
      expect(decision.maxAudioPlaysPerDay).toBeNull();
      expect(decision.maxTagSearchResults).toBe(5);
      expect(decision.maxRcPerDay).toBe(3);
      expect(decision.maxWbtbUsesLast7Days).toBe(1);
      expect(decision.maxDrawingsPerDream).toBe(1);
      expect(decision.exportEnabled).toBe(false);
    });

    it('blocks actions at each hard limit boundary', () => {
      const decision = resolveFeatureGateDecision(
        'FREE',
        createCounts({
          dreamsCreatedToday: 2,
          audioPlaysLast7Days: 1,
          rcSentToday: 3,
          wbtbUsedLast7Days: 1,
          drawingsPerDreamCount: 1,
        }),
        new FakeClock(FIXED_NOW),
      );

      expect(decision.canCreateDream).toBe(false);
      expect(decision.canPlayAudio).toBe(false);
      expect(decision.canSendRC).toBe(false);
      expect(decision.canUseWBTB).toBe(false);
      expect(decision.canAddDrawing).toBe(false);
    });
  });

  describe('MEDIUM', () => {
    it('allows actions while under all limits', () => {
      const decision = resolveFeatureGateDecision(
        'MEDIUM',
        createCounts({
          dreamsCreatedToday: 4,
          audioPlaysLast7Days: 3,
          rcSentToday: 7,
          wbtbUsedLast7Days: 3,
          drawingsPerDreamCount: 2,
        }),
        new FakeClock(FIXED_NOW),
      );

      expect(decision.canCreateDream).toBe(true);
      expect(decision.canPlayAudio).toBe(true);
      expect(decision.canSendRC).toBe(true);
      expect(decision.canUseWBTB).toBe(true);
      expect(decision.canAddDrawing).toBe(true);
      expect(decision.maxHistoryDays).toBe(30);
      expect(decision.maxDreamsPerDay).toBe(5);
      expect(decision.maxAudioPlaysLast7Days).toBe(4);
      expect(decision.maxAudioPlaysPerDay).toBeNull();
      expect(decision.maxTagSearchResults).toBe(15);
      expect(decision.maxRcPerDay).toBe(8);
      expect(decision.maxWbtbUsesLast7Days).toBe(4);
      expect(decision.maxDrawingsPerDream).toBe(3);
      expect(decision.exportEnabled).toBe(true);
    });

    it('blocks actions at each hard limit boundary', () => {
      const decision = resolveFeatureGateDecision(
        'MEDIUM',
        createCounts({
          dreamsCreatedToday: 5,
          audioPlaysLast7Days: 4,
          rcSentToday: 8,
          wbtbUsedLast7Days: 4,
          drawingsPerDreamCount: 3,
        }),
        new FakeClock(FIXED_NOW),
      );

      expect(decision.canCreateDream).toBe(false);
      expect(decision.canPlayAudio).toBe(false);
      expect(decision.canSendRC).toBe(false);
      expect(decision.canUseWBTB).toBe(false);
      expect(decision.canAddDrawing).toBe(false);
    });
  });

  describe('PRO', () => {
    it('keeps unlimited gates open and enforces per-day audio + drawings limits', () => {
      const decision = resolveFeatureGateDecision(
        'PRO',
        createCounts({
          dreamsCreatedToday: 999,
          audioPlaysLast7Days: 999,
          audioPlaysToday: 1,
          rcSentToday: 999,
          wbtbUsedLast7Days: 999,
          drawingsPerDreamCount: 4,
        }),
        new FakeClock(FIXED_NOW),
      );

      expect(decision.canCreateDream).toBe(true);
      expect(decision.canPlayAudio).toBe(true);
      expect(decision.canSendRC).toBe(true);
      expect(decision.canUseWBTB).toBe(true);
      expect(decision.canAddDrawing).toBe(true);
      expect(decision.maxHistoryDays).toBeNull();
      expect(decision.maxDreamsPerDay).toBeNull();
      expect(decision.maxAudioPlaysLast7Days).toBeNull();
      expect(decision.maxAudioPlaysPerDay).toBe(2);
      expect(decision.maxTagSearchResults).toBeNull();
      expect(decision.maxRcPerDay).toBeNull();
      expect(decision.maxWbtbUsesLast7Days).toBeNull();
      expect(decision.maxDrawingsPerDream).toBe(5);
      expect(decision.exportEnabled).toBe(true);
    });

    it('blocks audio at daily limit and drawings at per-dream limit', () => {
      const decision = resolveFeatureGateDecision(
        'PRO',
        createCounts({
          audioPlaysToday: 2,
          drawingsPerDreamCount: 5,
        }),
        new FakeClock(FIXED_NOW),
      );

      expect(decision.canPlayAudio).toBe(false);
      expect(decision.canAddDrawing).toBe(false);
      expect(decision.canCreateDream).toBe(true);
      expect(decision.canSendRC).toBe(true);
      expect(decision.canUseWBTB).toBe(true);
    });
  });

  it('normalizes invalid count inputs to 0', () => {
    const decision = resolveFeatureGateDecision(
      'FREE',
      createCounts({
        dreamsCreatedToday: Number.NaN,
        audioPlaysLast7Days: -1,
        audioPlaysToday: Number.POSITIVE_INFINITY,
        rcSentToday: -3,
        wbtbUsedLast7Days: -4,
        drawingsPerDreamCount: -5,
      }),
      new FakeClock(FIXED_NOW),
    );

    expect(decision.canCreateDream).toBe(true);
    expect(decision.canPlayAudio).toBe(true);
    expect(decision.canSendRC).toBe(true);
    expect(decision.canUseWBTB).toBe(true);
    expect(decision.canAddDrawing).toBe(true);
  });
});
