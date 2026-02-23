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
    this.registerDefaultVoices();
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
      if (!response.ok) return; // File doesn't exist yet — skip silently
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      this.buffers.set(path, audioBuffer);
    } catch {
      // Audio file not available — will fall back to speech synthesis or silence
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
    if (path) {
      const buffer = this.buffers.get(path);
      if (buffer) {
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.connect(this.voiceGain);
        source.start();
        return;
      }
    }
    // Fallback to speech synthesis
    const text = key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    this.speakFallback(text);
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

  /** Use Web Speech API as a fallback when no audio file is loaded. */
  speakFallback(text: string): void {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;   // Slightly slower for kids
    utterance.pitch = 1.1;   // Slightly higher pitch
    utterance.volume = 0.8;
    speechSynthesis.speak(utterance);
  }

  /** Register default voice key-to-file mappings for future TTS clips. */
  registerDefaultVoices(): void {
    const voices = [
      ['turn-owen', '/audio/voice/turn-owen.mp3'],
      ['turn-kian', '/audio/voice/turn-kian.mp3'],
      ['turn-team', '/audio/voice/turn-team.mp3'],
      ['welcome-trainers', '/audio/voice/welcome-trainers.mp3'],
      ['great-training', '/audio/voice/great-training.mp3'],
      // Colors
      ['color-red', '/audio/voice/color-red.mp3'],
      ['color-blue', '/audio/voice/color-blue.mp3'],
      ['color-yellow', '/audio/voice/color-yellow.mp3'],
      ['color-green', '/audio/voice/color-green.mp3'],
      ['color-orange', '/audio/voice/color-orange.mp3'],
      ['color-purple', '/audio/voice/color-purple.mp3'],
      // Numbers
      ['number-1', '/audio/voice/number-1.mp3'],
      ['number-2', '/audio/voice/number-2.mp3'],
      ['number-3', '/audio/voice/number-3.mp3'],
      ['number-4', '/audio/voice/number-4.mp3'],
      ['number-5', '/audio/voice/number-5.mp3'],
      ['number-6', '/audio/voice/number-6.mp3'],
      ['number-7', '/audio/voice/number-7.mp3'],
    ] as const;
    for (const [key, path] of voices) {
      this.registerVoice(key, path);
    }
  }
}
