export interface AudioPermissionResponse {
  granted: boolean;
  status: string;
}

export interface AudioMode {
  allowsRecordingIOS: boolean;
  playsInSilentModeIOS: boolean;
}

export interface AudioRecording {
  prepareToRecordAsync(options: unknown): Promise<void>;
  startAsync(): Promise<void>;
  stopAndUnloadAsync(): Promise<void>;
  getURI(): string | null;
}

export interface AudioRecordingOptionsPresets {
  HIGH_QUALITY: unknown;
}

export interface AudioPlayerStatus {
  isLoaded: boolean;
  isPlaying?: boolean;
  didJustFinish?: boolean;
  error?: string;
}

export type AudioPlayerStatusCallback = (status: AudioPlayerStatus) => void;

export interface AudioSound {
  setOnPlaybackStatusUpdate(callback: AudioPlayerStatusCallback | null): void;
  playAsync(): Promise<void>;
  stopAsync(): Promise<void>;
  unloadAsync(): Promise<void>;
}

export interface AudioModule {
  requestPermissionsAsync(): Promise<AudioPermissionResponse>;
  setAudioModeAsync(mode: AudioMode): Promise<void>;
  createRecording(): AudioRecording;
  recordingOptionsPresets: AudioRecordingOptionsPresets;
  createSoundAsync(
    source: { uri: string },
    onPlaybackStatusUpdate?: AudioPlayerStatusCallback,
  ): Promise<{ sound: AudioSound }>;
}
