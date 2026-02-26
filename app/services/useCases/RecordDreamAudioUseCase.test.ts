import type { Dream } from '../../domain';
import { FakeClock } from '../../domain';

import {
  RecordDreamAudioUseCase,
  type DreamAudioFileStore,
  type DreamAudioRecorder,
} from './RecordDreamAudioUseCase';
import {
  createDreamRepositoryMock,
  createUsageLogRepositoryMock,
} from './testing/createRepositoryMocks';

function createAudioRecorderMock(): jest.Mocked<DreamAudioRecorder> {
  return {
    start: jest.fn<Promise<void>, []>(async () => undefined),
    stop: jest.fn<Promise<string>, []>(async () => 'file:///cache/dream-audio-temp.m4a'),
  };
}

function createAudioFileStoreMock(): jest.Mocked<DreamAudioFileStore> {
  return {
    saveFromUri: jest.fn<Promise<string>, [{ dreamId: string; sourceUri: string }]>(
      async () => 'file:///sandbox/lucidream/audio/dream-1.m4a',
    ),
  };
}

const BASE_DREAM: Dream = {
  id: 'dream-1',
  createdAt: Date.parse('2026-02-26T05:30:00.000Z'),
  quality: 'CLEAR',
  tagIds: [],
  content: 'Dream with audio',
};

describe('RecordDreamAudioUseCase', () => {
  it('starts recording when microphone flow succeeds', async () => {
    const useCase = new RecordDreamAudioUseCase(
      createDreamRepositoryMock(),
      createUsageLogRepositoryMock(),
      new FakeClock(Date.parse('2026-02-26T12:00:00.000Z')),
      createAudioRecorderMock(),
      createAudioFileStoreMock(),
    );

    await expect(useCase.start()).resolves.toEqual({ ok: true });
  });

  it('stops recording, saves local audio, and attaches it to dream', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const usageLogRepository = createUsageLogRepositoryMock();
    const audioRecorder = createAudioRecorderMock();
    const audioFileStore = createAudioFileStoreMock();

    dreamRepository.getById.mockResolvedValue(BASE_DREAM);

    const useCase = new RecordDreamAudioUseCase(
      dreamRepository,
      usageLogRepository,
      new FakeClock(Date.parse('2026-02-26T12:00:00.000Z')),
      audioRecorder,
      audioFileStore,
      () => 'usage-log-record-1',
    );

    const result = await useCase.stopAndAttach({
      dreamId: BASE_DREAM.id,
    });

    expect(result).toEqual({
      ok: true,
      dream: {
        ...BASE_DREAM,
        audioPath: 'file:///sandbox/lucidream/audio/dream-1.m4a',
      },
      audioPath: 'file:///sandbox/lucidream/audio/dream-1.m4a',
    });
    expect(audioRecorder.stop).toHaveBeenCalledTimes(1);
    expect(audioFileStore.saveFromUri).toHaveBeenCalledWith({
      dreamId: BASE_DREAM.id,
      sourceUri: 'file:///cache/dream-audio-temp.m4a',
    });
    expect(dreamRepository.update).toHaveBeenCalledWith({
      ...BASE_DREAM,
      audioPath: 'file:///sandbox/lucidream/audio/dream-1.m4a',
    });
    expect(usageLogRepository.create).toHaveBeenCalledWith({
      id: 'usage-log-record-1',
      type: 'AUDIO_RECORDED',
      createdAt: Date.parse('2026-02-26T12:00:00.000Z'),
    });
  });
});
