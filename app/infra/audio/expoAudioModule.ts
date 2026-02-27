import type {
  AudioMode,
  AudioModule,
  AudioPermissionResponse,
  AudioPlayerStatusCallback,
  AudioRecording,
  AudioRecordingOptionsPresets,
  AudioSound,
} from './types';

type RequireFunction = (moduleName: string) => unknown;
declare const require: RequireFunction | undefined;

interface ExpoAudioNamespace {
  Audio: {
    requestPermissionsAsync(): Promise<AudioPermissionResponse>;
    setAudioModeAsync(mode: AudioMode): Promise<void>;
    Recording: new () => AudioRecording;
    RecordingOptionsPresets: AudioRecordingOptionsPresets;
    Sound: {
      createAsync(
        source: { uri: string },
        initialStatus?: Record<string, unknown>,
        onPlaybackStatusUpdate?: AudioPlayerStatusCallback,
      ): Promise<{ sound: AudioSound }>;
    };
  };
}

function resolveRequireFunction(): RequireFunction | undefined {
  if (typeof require === 'function') {
    return require;
  }

  const candidate = (globalThis as Record<string, unknown>).require;
  return typeof candidate === 'function' ? (candidate as RequireFunction) : undefined;
}

function loadExpoAudioNamespace(): ExpoAudioNamespace {
  const requireFunction = resolveRequireFunction();
  if (!requireFunction) {
    throw new Error('Module loader is unavailable. Ensure expo-av is installed and bundled.');
  }

  const moduleValue = requireFunction('expo-av');
  const namespace = moduleValue as Partial<ExpoAudioNamespace>;

  if (!namespace.Audio) {
    throw new Error('expo-av Audio API is unavailable.');
  }

  return namespace as ExpoAudioNamespace;
}

function createUnavailableAudioModule(error: unknown): AudioModule {
  const message =
    error instanceof Error && error.message.length > 0
      ? error.message
      : 'Audio features are unavailable in this build.';
  const unavailable = async (): Promise<never> => {
    throw new Error(message);
  };

  return {
    requestPermissionsAsync: unavailable,
    setAudioModeAsync: unavailable,
    createRecording: () => ({
      prepareToRecordAsync: unavailable,
      startAsync: unavailable,
      stopAndUnloadAsync: unavailable,
      getURI: () => null,
    }),
    recordingOptionsPresets: {
      HIGH_QUALITY: {},
    },
    createSoundAsync: unavailable,
  };
}

export function createDefaultAudioModule(): AudioModule {
  try {
    const { Audio } = loadExpoAudioNamespace();

    return {
      requestPermissionsAsync: Audio.requestPermissionsAsync,
      setAudioModeAsync: Audio.setAudioModeAsync,
      createRecording: () => new Audio.Recording(),
      recordingOptionsPresets: Audio.RecordingOptionsPresets,
      createSoundAsync: (source, onPlaybackStatusUpdate) =>
        Audio.Sound.createAsync(source, undefined, onPlaybackStatusUpdate),
    };
  } catch (error) {
    return createUnavailableAudioModule(error);
  }
}
