import { FakeClock, type Dream } from '../../domain';

import { PlayDreamAudioUseCase, type DreamAudioPlayer } from './PlayDreamAudioUseCase';
import {
  createDreamRepositoryMock,
  createLicenseRepositoryMock,
  createUsageLogRepositoryMock,
} from './testing/createRepositoryMocks';

function createAudioPlayerMock(): jest.Mocked<DreamAudioPlayer> {
  return {
    play: jest.fn<Promise<void>, [string]>(async () => undefined),
    pause: jest.fn<Promise<void>, []>(async () => undefined),
    stop: jest.fn<Promise<void>, []>(async () => undefined),
  };
}

const DREAM_WITH_AUDIO: Dream = {
  id: 'dream-audio-1',
  createdAt: Date.parse('2026-02-26T05:30:00.000Z'),
  quality: 'VIVID',
  tagIds: [],
  content: 'Audio dream',
  audioPath: 'file:///sandbox/lucidream/audio/dream-audio-1.m4a',
};

describe('PlayDreamAudioUseCase', () => {
  it('blocks playback for FREE license at 7-day playback quota', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('FREE');
    const usageLogRepository = createUsageLogRepositoryMock();
    const audioPlayer = createAudioPlayerMock();

    dreamRepository.getById.mockResolvedValue(DREAM_WITH_AUDIO);
    usageLogRepository.countByTypeAndCreatedAtRange.mockImplementation(async (type) => {
      if (type === 'AUDIO_PLAYED') {
        return 1;
      }

      return 0;
    });

    const useCase = new PlayDreamAudioUseCase(
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      new FakeClock(Date.parse('2026-02-26T12:00:00.000Z')),
      audioPlayer,
      () => 'usage-log-audio-1',
    );

    const result = await useCase.execute({
      dreamId: DREAM_WITH_AUDIO.id,
    });

    expect(result).toEqual({
      ok: false,
      code: 'PLAYBACK_QUOTA_REACHED',
      decision: expect.objectContaining({
        canPlayAudio: false,
        maxAudioPlaysLast7Days: 1,
      }),
    });
    expect(audioPlayer.play).not.toHaveBeenCalled();
    expect(usageLogRepository.create).not.toHaveBeenCalled();
  });

  it('blocks playback for PRO license at daily playback quota', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('PRO');
    const usageLogRepository = createUsageLogRepositoryMock();
    const audioPlayer = createAudioPlayerMock();

    dreamRepository.getById.mockResolvedValue(DREAM_WITH_AUDIO);
    usageLogRepository.countByTypeAndCreatedAtRange.mockImplementation(
      async (type, startCreatedAt) => {
        if (type !== 'AUDIO_PLAYED') {
          return 0;
        }

        if (startCreatedAt === Date.parse('2026-02-26T00:00:00.000Z')) {
          return 2;
        }

        return 9;
      },
    );

    const useCase = new PlayDreamAudioUseCase(
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      new FakeClock(Date.parse('2026-02-26T12:00:00.000Z')),
      audioPlayer,
      () => 'usage-log-audio-2',
    );

    const result = await useCase.execute({
      dreamId: DREAM_WITH_AUDIO.id,
    });

    expect(result).toEqual({
      ok: false,
      code: 'PLAYBACK_QUOTA_REACHED',
      decision: expect.objectContaining({
        canPlayAudio: false,
        maxAudioPlaysPerDay: 2,
      }),
    });
    expect(audioPlayer.play).not.toHaveBeenCalled();
    expect(usageLogRepository.create).not.toHaveBeenCalled();
  });

  it('plays audio and records AUDIO_PLAYED usage when quota allows playback', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('FREE');
    const usageLogRepository = createUsageLogRepositoryMock();
    const audioPlayer = createAudioPlayerMock();

    dreamRepository.getById.mockResolvedValue(DREAM_WITH_AUDIO);

    const useCase = new PlayDreamAudioUseCase(
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      new FakeClock(Date.parse('2026-02-26T12:00:00.000Z')),
      audioPlayer,
      () => 'usage-log-audio-3',
    );

    const result = await useCase.execute({
      dreamId: DREAM_WITH_AUDIO.id,
    });

    expect(result).toEqual({
      ok: true,
      dream: DREAM_WITH_AUDIO,
      decision: expect.objectContaining({
        canPlayAudio: true,
      }),
    });
    expect(audioPlayer.play).toHaveBeenCalledWith(
      'file:///sandbox/lucidream/audio/dream-audio-1.m4a',
    );
    expect(usageLogRepository.create).toHaveBeenCalledWith({
      id: 'usage-log-audio-3',
      type: 'AUDIO_PLAYED',
      createdAt: Date.parse('2026-02-26T12:00:00.000Z'),
    });
  });

  it('resumes paused playback without creating an additional AUDIO_PLAYED usage log', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('FREE');
    const usageLogRepository = createUsageLogRepositoryMock();
    const audioPlayer = createAudioPlayerMock();

    dreamRepository.getById.mockResolvedValue(DREAM_WITH_AUDIO);

    const useCase = new PlayDreamAudioUseCase(
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      new FakeClock(Date.parse('2026-02-26T12:00:00.000Z')),
      audioPlayer,
      () => 'usage-log-audio-4',
    );

    await useCase.execute({
      dreamId: DREAM_WITH_AUDIO.id,
    });
    await useCase.pause();
    await useCase.execute({
      dreamId: DREAM_WITH_AUDIO.id,
    });

    expect(audioPlayer.play).toHaveBeenCalledTimes(2);
    expect(audioPlayer.pause).toHaveBeenCalledTimes(1);
    expect(usageLogRepository.create).toHaveBeenCalledTimes(1);
  });

  it('clears playback session on stop so replay records usage again', async () => {
    const dreamRepository = createDreamRepositoryMock();
    const licenseRepository = createLicenseRepositoryMock('FREE');
    const usageLogRepository = createUsageLogRepositoryMock();
    const audioPlayer = createAudioPlayerMock();

    dreamRepository.getById.mockResolvedValue(DREAM_WITH_AUDIO);

    const useCase = new PlayDreamAudioUseCase(
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      new FakeClock(Date.parse('2026-02-26T12:00:00.000Z')),
      audioPlayer,
      () => 'usage-log-audio-5',
    );

    await useCase.execute({
      dreamId: DREAM_WITH_AUDIO.id,
    });
    await useCase.stop();
    await useCase.execute({
      dreamId: DREAM_WITH_AUDIO.id,
    });

    expect(audioPlayer.stop).toHaveBeenCalledTimes(1);
    expect(audioPlayer.play).toHaveBeenCalledTimes(2);
    expect(usageLogRepository.create).toHaveBeenCalledTimes(2);
  });
});
