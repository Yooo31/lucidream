import { validateDream, type Clock, type Dream, type ValidationIssue } from '../../domain';
import type { DreamRepository, UsageLogRepository } from '../repositories';

import { RecordUsageLogUseCase, type UsageLogIdGenerator } from './RecordUsageLogUseCase';

export interface DreamAudioRecorder {
  start(): Promise<void>;
  stop(): Promise<string>;
}

export interface DreamAudioFileStore {
  saveFromUri(input: { dreamId: string; sourceUri: string }): Promise<string>;
}

interface StartDreamAudioRecordingSuccess {
  ok: true;
}

interface StartDreamAudioRecordingFailure {
  ok: false;
  code: 'RECORDING_START_FAILED';
}

export type StartDreamAudioRecordingResult =
  | StartDreamAudioRecordingSuccess
  | StartDreamAudioRecordingFailure;

export interface StopDreamAudioRecordingInput {
  dreamId: string;
}

interface StopDreamAudioRecordingSuccess {
  ok: true;
  dream: Dream;
  audioPath: string;
}

interface StopDreamAudioRecordingDreamNotFound {
  ok: false;
  code: 'DREAM_NOT_FOUND';
}

interface StopDreamAudioRecordingFailure {
  ok: false;
  code: 'RECORDING_STOP_FAILED' | 'AUDIO_SAVE_FAILED';
}

interface StopDreamAudioRecordingValidationFailure {
  ok: false;
  code: 'VALIDATION_FAILED';
  issues: readonly ValidationIssue[];
}

export type StopDreamAudioRecordingResult =
  | StopDreamAudioRecordingSuccess
  | StopDreamAudioRecordingDreamNotFound
  | StopDreamAudioRecordingFailure
  | StopDreamAudioRecordingValidationFailure;

export class RecordDreamAudioUseCase {
  private readonly recordUsageLogUseCase: RecordUsageLogUseCase;

  constructor(
    private readonly dreamRepository: DreamRepository,
    usageLogRepository: UsageLogRepository,
    clock: Clock,
    private readonly audioRecorder: DreamAudioRecorder,
    private readonly audioFileStore: DreamAudioFileStore,
    usageLogIdGenerator?: UsageLogIdGenerator,
  ) {
    this.recordUsageLogUseCase = new RecordUsageLogUseCase(
      usageLogRepository,
      clock,
      usageLogIdGenerator,
    );
  }

  async start(): Promise<StartDreamAudioRecordingResult> {
    try {
      await this.audioRecorder.start();
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        code: 'RECORDING_START_FAILED',
      };
    }
  }

  async stopAndAttach(input: StopDreamAudioRecordingInput): Promise<StopDreamAudioRecordingResult> {
    let sourceUri: string;

    try {
      sourceUri = await this.audioRecorder.stop();
    } catch {
      return {
        ok: false,
        code: 'RECORDING_STOP_FAILED',
      };
    }

    const dream = await this.dreamRepository.getById(input.dreamId);

    if (!dream) {
      return {
        ok: false,
        code: 'DREAM_NOT_FOUND',
      };
    }

    let audioPath: string;

    try {
      audioPath = await this.audioFileStore.saveFromUri({
        dreamId: dream.id,
        sourceUri,
      });
    } catch {
      return {
        ok: false,
        code: 'AUDIO_SAVE_FAILED',
      };
    }

    const updatedDream: Dream = {
      ...dream,
      audioPath,
    };

    const issues = validateDream(updatedDream);

    if (issues.length > 0) {
      return {
        ok: false,
        code: 'VALIDATION_FAILED',
        issues,
      };
    }

    await this.dreamRepository.update(updatedDream);

    const usageResult = await this.recordUsageLogUseCase.execute({
      type: 'AUDIO_RECORDED',
    });

    if (!usageResult.ok) {
      throw new Error('RecordUsageLogUseCase returned a validation error after audio recording.');
    }

    return {
      ok: true,
      dream: updatedDream,
      audioPath,
    };
  }
}
