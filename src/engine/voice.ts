// src/engine/voice.ts
// Centralized educational voice system.
// Implements the Three-Label Rule: prompt label -> action label -> success echo.
// All voice calls go through here for consistency.

import type { AudioManager } from './audio';

const ASH_CORRECT = ['ash-great-job', 'ash-awesome', 'ash-alright', 'ash-yeah'];
const ASH_WRONG = ['ash-try-again', 'ash-not-quite'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class VoiceSystem {
  constructor(private audio: AudioManager) {}

  /** Prompt label: "Red. Find red!" */
  prompt(concept: string, instruction: string): void {
    this.audio.playVoice(`${concept}. ${instruction}`);
  }

  /** Pre-prompt engagement: "Owen, point!" */
  engage(name: string, action: string): void {
    this.audio.playVoice(`${name}, ${action}!`);
  }

  /** Success echo: "Red! Red flame!" */
  successEcho(concept: string, celebration?: string): void {
    const text = celebration ? `${concept}! ${celebration}` : `${concept}!`;
    this.audio.playVoice(text);
  }

  /** Wrong redirect: "That's blue. Find red!" */
  wrongRedirect(wrongConcept: string, correctConcept: string): void {
    this.audio.playVoice(`That's ${wrongConcept}. Find ${correctConcept}!`);
  }

  /** Play a random Ash celebration clip */
  ashCorrect(): void {
    this.audio.playVoice(pick(ASH_CORRECT));
  }

  /** Play a random Ash encouragement clip */
  ashWrong(): void {
    this.audio.playVoice(pick(ASH_WRONG));
  }

  /** Play a specific Ash clip by key */
  ash(key: string): void {
    this.audio.playVoice(key);
  }

  /** Narration frame for game intro */
  narrate(text: string): void {
    this.audio.playVoice(text);
  }

  /** Hint repeat: just say the concept again */
  hintRepeat(concept: string): void {
    this.audio.playVoice(concept);
  }
}
