import { createDefaultAudioModule } from './expoAudioModule';
import type { AudioModule, AudioRecording } from './types';

const RECORDING_MODE_ENABLED = {
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true,
} as const;

const RECORDING_MODE_DISABLED = {
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,
} as const;

interface AudioRecorderOptions {
  audioModule?: AudioModule;
}

export class AudioRecorder {
  private readonly audioModule: AudioModule;

  private recording: AudioRecording | null = null;

  constructor(options: AudioRecorderOptions = {}) {
    this.audioModule = options.audioModule ?? createDefaultAudioModule();
  }

  async start(): Promise<void> {
    if (this.recording) {
      throw new Error('Audio recording is already in progress.');
    }

    const permission = await this.audioModule.requestPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Microphone permission is required to record audio.');
    }

    await this.audioModule.setAudioModeAsync(RECORDING_MODE_ENABLED);

    const recording = this.audioModule.createRecording();

    try {
      await recording.prepareToRecordAsync(this.audioModule.recordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      this.recording = recording;
    } catch (error) {
      await this.audioModule.setAudioModeAsync(RECORDING_MODE_DISABLED);
      throw error;
    }
  }

  async stop(): Promise<string> {
    if (!this.recording) {
      throw new Error('Audio recording is not in progress.');
    }

    const { recording } = this;
    this.recording = null;

    await recording.stopAndUnloadAsync();

    const uri = recording.getURI();

    await this.audioModule.setAudioModeAsync(RECORDING_MODE_DISABLED);

    if (!uri) {
      throw new Error('Recorded audio URI is unavailable.');
    }

    return uri;
  }
}
