import { AudioRecorder } from './AudioRecorder';
import type {
  AudioMode,
  AudioModule,
  AudioPermissionResponse,
  AudioPlayerStatusCallback,
  AudioRecording,
  AudioSound,
} from './types';

interface MockAudioRecording extends AudioRecording {
  prepareToRecordAsyncMock: jest.Mock<Promise<void>, [unknown]>;
  startAsyncMock: jest.Mock<Promise<void>, []>;
  stopAndUnloadAsyncMock: jest.Mock<Promise<void>, []>;
  getURIMock: jest.Mock<string | null, []>;
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

function createMockAudioRecording(
  uri: string | null = 'file:///sandbox/dream-1.m4a',
): MockAudioRecording {
  const prepareToRecordAsyncMock = jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined);
  const startAsyncMock = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
  const stopAndUnloadAsyncMock = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
  const getURIMock = jest.fn<string | null, []>().mockReturnValue(uri);

  return {
    prepareToRecordAsync: (options: unknown) => prepareToRecordAsyncMock(options),
    startAsync: () => startAsyncMock(),
    stopAndUnloadAsync: () => stopAndUnloadAsyncMock(),
    getURI: () => getURIMock(),
    prepareToRecordAsyncMock,
    startAsyncMock,
    stopAndUnloadAsyncMock,
    getURIMock,
  };
}

function createMockAudioSound(): AudioSound {
  return {
    setOnPlaybackStatusUpdate: () => undefined,
    playAsync: async () => undefined,
    pauseAsync: async () => undefined,
    stopAsync: async () => undefined,
    unloadAsync: async () => undefined,
  };
}

function createMockAudioModule(recording: MockAudioRecording): MockAudioModule {
  const requestPermissionsAsyncMock = jest
    .fn<Promise<AudioPermissionResponse>, []>()
    .mockResolvedValue({
      granted: true,
      status: 'granted',
    });

  const setAudioModeAsyncMock = jest.fn<Promise<void>, [AudioMode]>().mockResolvedValue(undefined);
  const createRecordingMock = jest.fn<AudioRecording, []>().mockReturnValue(recording);
  const createSoundAsyncMock = jest
    .fn<Promise<{ sound: AudioSound }>, [{ uri: string }, AudioPlayerStatusCallback?]>()
    .mockResolvedValue({ sound: createMockAudioSound() });

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

describe('AudioRecorder', () => {
  it('starts recording with granted permission', async () => {
    const recording = createMockAudioRecording();
    const audioModule = createMockAudioModule(recording);
    const recorder = new AudioRecorder({ audioModule });

    await recorder.start();

    expect(audioModule.requestPermissionsAsyncMock).toHaveBeenCalledTimes(1);
    expect(audioModule.setAudioModeAsyncMock).toHaveBeenCalledWith({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    expect(recording.prepareToRecordAsyncMock).toHaveBeenCalledWith(
      audioModule.recordingOptionsPresets.HIGH_QUALITY,
    );
    expect(recording.startAsyncMock).toHaveBeenCalledTimes(1);
  });

  it('throws when permission is denied', async () => {
    const recording = createMockAudioRecording();
    const audioModule = createMockAudioModule(recording);
    const recorder = new AudioRecorder({ audioModule });

    audioModule.requestPermissionsAsyncMock.mockResolvedValueOnce({
      granted: false,
      status: 'denied',
    });

    await expect(recorder.start()).rejects.toThrow(
      'Microphone permission is required to record audio.',
    );
    expect(audioModule.setAudioModeAsyncMock).not.toHaveBeenCalled();
    expect(audioModule.createRecordingMock).not.toHaveBeenCalled();
  });

  it('throws when start is called while already recording', async () => {
    const recording = createMockAudioRecording();
    const audioModule = createMockAudioModule(recording);
    const recorder = new AudioRecorder({ audioModule });

    await recorder.start();

    await expect(recorder.start()).rejects.toThrow('Audio recording is already in progress.');
    expect(audioModule.requestPermissionsAsyncMock).toHaveBeenCalledTimes(1);
  });

  it('stops recording and returns a local URI', async () => {
    const recording = createMockAudioRecording('file:///sandbox/dream-42.m4a');
    const audioModule = createMockAudioModule(recording);
    const recorder = new AudioRecorder({ audioModule });

    await recorder.start();
    const uri = await recorder.stop();

    expect(uri).toBe('file:///sandbox/dream-42.m4a');
    expect(recording.stopAndUnloadAsyncMock).toHaveBeenCalledTimes(1);
    expect(audioModule.setAudioModeAsyncMock).toHaveBeenNthCalledWith(2, {
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });
  });

  it('throws when stop is called without an active recording', async () => {
    const recording = createMockAudioRecording();
    const audioModule = createMockAudioModule(recording);
    const recorder = new AudioRecorder({ audioModule });

    await expect(recorder.stop()).rejects.toThrow('Audio recording is not in progress.');
  });

  it('throws when stop cannot resolve a recording URI', async () => {
    const recording = createMockAudioRecording(null);
    const audioModule = createMockAudioModule(recording);
    const recorder = new AudioRecorder({ audioModule });

    await recorder.start();

    await expect(recorder.stop()).rejects.toThrow('Recorded audio URI is unavailable.');
    expect(audioModule.setAudioModeAsyncMock).toHaveBeenNthCalledWith(2, {
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });
  });
});
