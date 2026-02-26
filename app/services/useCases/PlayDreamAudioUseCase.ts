import type { Clock, Dream, FeatureGateDecision } from '../../domain';
import type { DreamRepository, LicenseRepository, UsageLogRepository } from '../repositories';

import {
  resolveFeatureGateFromRepositories,
  type FeatureGateResolverDependencies,
} from './featureGateResolver';
import { RecordUsageLogUseCase, type UsageLogIdGenerator } from './RecordUsageLogUseCase';

export interface DreamAudioPlayer {
  play(uri: string): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
}

export interface PlayDreamAudioInput {
  dreamId: string;
}

interface PlayDreamAudioSuccess {
  ok: true;
  dream: Dream;
  decision: FeatureGateDecision;
}

interface PlayDreamAudioDreamNotFound {
  ok: false;
  code: 'DREAM_NOT_FOUND';
}

interface PlayDreamAudioUnavailable {
  ok: false;
  code: 'AUDIO_NOT_AVAILABLE';
}

interface PlayDreamAudioQuotaReached {
  ok: false;
  code: 'PLAYBACK_QUOTA_REACHED';
  decision: FeatureGateDecision;
}

interface PlayDreamAudioFailure {
  ok: false;
  code: 'PLAYBACK_FAILED';
}

export type PlayDreamAudioResult =
  | PlayDreamAudioSuccess
  | PlayDreamAudioDreamNotFound
  | PlayDreamAudioUnavailable
  | PlayDreamAudioQuotaReached
  | PlayDreamAudioFailure;

export class PlayDreamAudioUseCase {
  private readonly featureGateDependencies: FeatureGateResolverDependencies;

  private readonly recordUsageLogUseCase: RecordUsageLogUseCase;

  private activePlayback: {
    dreamId: string;
    audioPath: string;
    isPaused: boolean;
  } | null = null;

  constructor(
    private readonly dreamRepository: DreamRepository,
    licenseRepository: LicenseRepository,
    usageLogRepository: UsageLogRepository,
    clock: Clock,
    private readonly audioPlayer: DreamAudioPlayer,
    usageLogIdGenerator?: UsageLogIdGenerator,
  ) {
    this.featureGateDependencies = {
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      clock,
    };

    this.recordUsageLogUseCase = new RecordUsageLogUseCase(
      usageLogRepository,
      clock,
      usageLogIdGenerator,
    );
  }

  async execute(input: PlayDreamAudioInput): Promise<PlayDreamAudioResult> {
    const dream = await this.dreamRepository.getById(input.dreamId);

    if (!dream) {
      return {
        ok: false,
        code: 'DREAM_NOT_FOUND',
      };
    }

    if (!dream.audioPath) {
      return {
        ok: false,
        code: 'AUDIO_NOT_AVAILABLE',
      };
    }

    const { activePlayback } = this;
    const hasActivePlayback =
      activePlayback !== null &&
      activePlayback.dreamId === dream.id &&
      activePlayback.audioPath === dream.audioPath;

    if (hasActivePlayback && activePlayback) {
      if (!activePlayback.isPaused) {
        return {
          ok: true,
          dream,
          decision: await resolveFeatureGateFromRepositories(this.featureGateDependencies),
        };
      }

      try {
        await this.audioPlayer.play(dream.audioPath);
      } catch {
        this.activePlayback = null;
        return {
          ok: false,
          code: 'PLAYBACK_FAILED',
        };
      }

      this.activePlayback = {
        dreamId: activePlayback.dreamId,
        audioPath: activePlayback.audioPath,
        isPaused: false,
      };

      return {
        ok: true,
        dream,
        decision: await resolveFeatureGateFromRepositories(this.featureGateDependencies),
      };
    }

    const decision = await resolveFeatureGateFromRepositories(this.featureGateDependencies);

    if (!decision.canPlayAudio) {
      return {
        ok: false,
        code: 'PLAYBACK_QUOTA_REACHED',
        decision,
      };
    }

    try {
      await this.audioPlayer.play(dream.audioPath);
    } catch {
      this.activePlayback = null;
      return {
        ok: false,
        code: 'PLAYBACK_FAILED',
      };
    }

    const usageResult = await this.recordUsageLogUseCase.execute({
      type: 'AUDIO_PLAYED',
    });

    if (!usageResult.ok) {
      throw new Error('RecordUsageLogUseCase returned a validation error after audio playback.');
    }

    this.activePlayback = {
      dreamId: dream.id,
      audioPath: dream.audioPath,
      isPaused: false,
    };

    return {
      ok: true,
      dream,
      decision,
    };
  }

  async pause(): Promise<void> {
    if (!this.activePlayback || this.activePlayback.isPaused) {
      return;
    }

    await this.audioPlayer.pause();
    this.activePlayback = {
      ...this.activePlayback,
      isPaused: true,
    };
  }

  async stop(): Promise<void> {
    await this.audioPlayer.stop();
    this.activePlayback = null;
  }
}
