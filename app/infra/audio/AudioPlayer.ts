import { createDefaultAudioModule } from './expoAudioModule';
import type { AudioModule, AudioPlayerStatusCallback, AudioSound } from './types';

interface AudioPlayerOptions {
  audioModule?: AudioModule;
}

export class AudioPlayer {
  private readonly audioModule: AudioModule;

  private sound: AudioSound | null = null;

  private currentUri: string | null = null;

  constructor(options: AudioPlayerOptions = {}) {
    this.audioModule = options.audioModule ?? createDefaultAudioModule();
  }

  async play(uri: string, onStatusUpdate?: AudioPlayerStatusCallback): Promise<void> {
    if (this.sound && this.currentUri === uri) {
      if (onStatusUpdate) {
        this.sound.setOnPlaybackStatusUpdate(onStatusUpdate);
      }

      await this.sound.playAsync();
      return;
    }

    await this.stop();

    const { sound } = await this.audioModule.createSoundAsync({ uri }, onStatusUpdate);
    this.sound = sound;
    this.currentUri = uri;

    await sound.playAsync();
  }

  async pause(): Promise<void> {
    if (!this.sound) {
      return;
    }

    await this.sound.pauseAsync();
  }

  async stop(): Promise<void> {
    if (!this.sound) {
      return;
    }

    const currentSound = this.sound;
    this.sound = null;
    this.currentUri = null;

    currentSound.setOnPlaybackStatusUpdate(null);
    await currentSound.stopAsync();
    await currentSound.unloadAsync();
  }
}
