// src/engine/audio.ts
import type { Intensity } from '../state/types';

const GAIN_PRESETS: Record<Intensity, { sfx: number; voice: number; music: number }> = {
  calm: { sfx: 0.4, voice: 0.8, music: 0.3 },
  normal: { sfx: 0.7, voice: 0.8, music: 0.5 },
  hype: { sfx: 0.9, voice: 0.85, music: 0.6 },
};

export class AudioManager {
  private context: AudioContext;
  private masterGain: GainNode;
  private sfxGain: GainNode;
  private voiceGain: GainNode;
  private musicGain: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private voiceMap = new Map<string, string>();
  private _unlocked = false;

  constructor() {
    this.context = new AudioContext();

    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);

    this.sfxGain = this.context.createGain();
    this.sfxGain.connect(this.masterGain);

    this.voiceGain = this.context.createGain();
    this.voiceGain.connect(this.masterGain);

    this.musicGain = this.context.createGain();
    this.musicGain.connect(this.masterGain);

    this.setIntensity('normal');
  }

  get unlocked(): boolean {
    return this._unlocked;
  }

  async unlock(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
    this._unlocked = true;
  }

  async loadBuffer(path: string): Promise<void> {
    if (this.buffers.has(path)) return;
    try {
      const response = await fetch(path);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      this.buffers.set(path, audioBuffer);
    } catch (e) {
      console.warn(`Failed to load audio: ${path}`, e);
    }
  }

  playSfx(path: string, options?: { pitch?: number; volume?: number }): void {
    const buffer = this.buffers.get(path);
    if (!buffer) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    if (options?.pitch) source.playbackRate.value = options.pitch;

    if (options?.volume !== undefined) {
      const gainNode = this.context.createGain();
      gainNode.gain.value = options.volume;
      source.connect(gainNode);
      gainNode.connect(this.sfxGain);
    } else {
      source.connect(this.sfxGain);
    }

    source.start();
  }

  playVoice(key: string): void {
    const path = this.voiceMap.get(key);
    if (!path) return;
    const buffer = this.buffers.get(path);
    if (!buffer) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.voiceGain);
    source.start();
  }

  registerVoice(key: string, path: string): void {
    this.voiceMap.set(key, path);
  }

  setIntensity(level: Intensity): void {
    const preset = GAIN_PRESETS[level];
    this.sfxGain.gain.setTargetAtTime(preset.sfx, this.context.currentTime, 0.1);
    this.voiceGain.gain.setTargetAtTime(preset.voice, this.context.currentTime, 0.1);
    this.musicGain.gain.setTargetAtTime(preset.music, this.context.currentTime, 0.1);
  }

  setSilent(silent: boolean): void {
    this.sfxGain.gain.setTargetAtTime(silent ? 0 : GAIN_PRESETS.normal.sfx, this.context.currentTime, 0.1);
    this.musicGain.gain.setTargetAtTime(silent ? 0 : GAIN_PRESETS.normal.music, this.context.currentTime, 0.1);
    // Voice stays audible in silent mode
    this.voiceGain.gain.setTargetAtTime(silent ? 0.8 : GAIN_PRESETS.normal.voice, this.context.currentTime, 0.1);
  }
}
