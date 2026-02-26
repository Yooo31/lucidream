import { AudioPlayer } from './AudioPlayer';
import type {
  AudioMode,
  AudioModule,
  AudioPermissionResponse,
  AudioPlayerStatusCallback,
  AudioRecording,
  AudioSound,
} from './types';

interface MockAudioSound extends AudioSound {
  setOnPlaybackStatusUpdateMock: jest.Mock<void, [AudioPlayerStatusCallback | null]>;
  playAsyncMock: jest.Mock<Promise<void>, []>;
  stopAsyncMock: jest.Mock<Promise<void>, []>;
  unloadAsyncMock: jest.Mock<Promise<void>, []>;
}

interface MockAudioModule extends AudioModule {
  requestPermissionsAsyncMock: jest.Mock<Promise<AudioPermissionResponse>, []>;
  setAudioModeAsyncMock: jest.Mock<Promise<void>, [AudioMode]>;
  createRecordingMock: jest.Mock<AudioRecording, []>;
  createSoundAsyncMock: jest.Mock<
    Promise<{ sound: AudioSound }>,
    [{ uri: string }, AudioPlayerStatusCallback?]
  >;
}

function createMockAudioRecording(): AudioRecording {
  return {
    prepareToRecordAsync: async () => undefined,
    startAsync: async () => undefined,
    stopAndUnloadAsync: async () => undefined,
    getURI: () => 'file:///sandbox/unused.m4a',
  };
}

function createMockAudioSound(): MockAudioSound {
  const setOnPlaybackStatusUpdateMock = jest.fn<void, [AudioPlayerStatusCallback | null]>();
  const playAsyncMock = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
  const stopAsyncMock = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
  const unloadAsyncMock = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);

  return {
    setOnPlaybackStatusUpdate: (callback: AudioPlayerStatusCallback | null) =>
      setOnPlaybackStatusUpdateMock(callback),
    playAsync: () => playAsyncMock(),
    stopAsync: () => stopAsyncMock(),
    unloadAsync: () => unloadAsyncMock(),
    setOnPlaybackStatusUpdateMock,
    playAsyncMock,
    stopAsyncMock,
    unloadAsyncMock,
  };
}

function createMockAudioModule(sound: MockAudioSound): MockAudioModule {
  const requestPermissionsAsyncMock = jest
    .fn<Promise<AudioPermissionResponse>, []>()
    .mockResolvedValue({
      granted: true,
      status: 'granted',
    });
  const setAudioModeAsyncMock = jest.fn<Promise<void>, [AudioMode]>().mockResolvedValue(undefined);
  const createRecordingMock = jest
    .fn<AudioRecording, []>()
    .mockReturnValue(createMockAudioRecording());
  const createSoundAsyncMock = jest
    .fn<Promise<{ sound: AudioSound }>, [{ uri: string }, AudioPlayerStatusCallback?]>()
    .mockResolvedValue({ sound });

  return {
    requestPermissionsAsync: () => requestPermissionsAsyncMock(),
    setAudioModeAsync: (mode: AudioMode) => setAudioModeAsyncMock(mode),
    createRecording: () => createRecordingMock(),
    recordingOptionsPresets: { HIGH_QUALITY: { quality: 'high' } },
    createSoundAsync: (
      source: { uri: string },
      onPlaybackStatusUpdate?: AudioPlayerStatusCallback,
    ) => createSoundAsyncMock(source, onPlaybackStatusUpdate),
    requestPermissionsAsyncMock,
    setAudioModeAsyncMock,
    createRecordingMock,
    createSoundAsyncMock,
  };
}

describe('AudioPlayer', () => {
  it('plays a local audio URI', async () => {
    const sound = createMockAudioSound();
    const audioModule = createMockAudioModule(sound);
    const player = new AudioPlayer({ audioModule });

    await player.play('file:///sandbox/dream-1.m4a');

    expect(audioModule.createSoundAsyncMock).toHaveBeenCalledWith(
      { uri: 'file:///sandbox/dream-1.m4a' },
      undefined,
    );
    expect(sound.playAsyncMock).toHaveBeenCalledTimes(1);
  });

  it('forwards an optional status callback', async () => {
    const sound = createMockAudioSound();
    const audioModule = createMockAudioModule(sound);
    const player = new AudioPlayer({ audioModule });
    const onStatusUpdate = jest.fn<void, [Parameters<AudioPlayerStatusCallback>[0]]>();

    await player.play('file:///sandbox/dream-2.m4a', onStatusUpdate);

    expect(audioModule.createSoundAsyncMock).toHaveBeenCalledWith(
      { uri: 'file:///sandbox/dream-2.m4a' },
      onStatusUpdate,
    );
  });

  it('stops and unloads previous sound before playing a new one', async () => {
    const firstSound = createMockAudioSound();
    const secondSound = createMockAudioSound();
    const audioModule = createMockAudioModule(firstSound);
    const player = new AudioPlayer({ audioModule });

    audioModule.createSoundAsyncMock
      .mockResolvedValueOnce({ sound: firstSound })
      .mockResolvedValueOnce({ sound: secondSound });

    await player.play('file:///sandbox/first.m4a');
    await player.play('file:///sandbox/second.m4a');

    expect(firstSound.setOnPlaybackStatusUpdateMock).toHaveBeenCalledWith(null);
    expect(firstSound.stopAsyncMock).toHaveBeenCalledTimes(1);
    expect(firstSound.unloadAsyncMock).toHaveBeenCalledTimes(1);
    expect(secondSound.playAsyncMock).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when stop is called without an active sound', async () => {
    const sound = createMockAudioSound();
    const audioModule = createMockAudioModule(sound);
    const player = new AudioPlayer({ audioModule });

    await expect(player.stop()).resolves.toBeUndefined();
    expect(sound.stopAsyncMock).not.toHaveBeenCalled();
  });

  it('clears callback and unloads active sound on stop', async () => {
    const sound = createMockAudioSound();
    const audioModule = createMockAudioModule(sound);
    const player = new AudioPlayer({ audioModule });

    await player.play('file:///sandbox/dream-stop.m4a');
    await player.stop();

    expect(sound.setOnPlaybackStatusUpdateMock).toHaveBeenCalledWith(null);
    expect(sound.stopAsyncMock).toHaveBeenCalledTimes(1);
    expect(sound.unloadAsyncMock).toHaveBeenCalledTimes(1);
  });
});
