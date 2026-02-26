import { createDefaultAudioModule } from './expoAudioModule';
import type { AudioModule, AudioPlayerStatusCallback, AudioSound } from './types';

interface AudioPlayerOptions {
  audioModule?: AudioModule;
}

export class AudioPlayer {
  private readonly audioModule: AudioModule;

  private sound: AudioSound | null = null;

  constructor(options: AudioPlayerOptions = {}) {
    this.audioModule = options.audioModule ?? createDefaultAudioModule();
  }

  async play(uri: string, onStatusUpdate?: AudioPlayerStatusCallback): Promise<void> {
    await this.stop();

    const { sound } = await this.audioModule.createSoundAsync({ uri }, onStatusUpdate);
    this.sound = sound;

    await sound.playAsync();
  }

  async stop(): Promise<void> {
    if (!this.sound) {
      return;
    }

    const currentSound = this.sound;
    this.sound = null;

    currentSound.setOnPlaybackStatusUpdate(null);
    await currentSound.stopAsync();
    await currentSound.unloadAsync();
  }
}
