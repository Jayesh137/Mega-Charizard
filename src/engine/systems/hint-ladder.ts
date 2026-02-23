// src/engine/systems/hint-ladder.ts
// 5-level MCX Coach Mode hint ladder.
// Owen gets faster hint escalation than Kian.

import { session } from '../../state/session.svelte';

export type HintLevel = 0 | 1 | 2 | 3 | 4;

interface HintConfig {
  /** Seconds before first timeout hint */
  timeoutDelay: number;
  /** Seconds between escalating timeout hints */
  escalateDelay: number;
  /** Number of misses before auto-complete */
  autoCompleteAfter: number;
}

const HINT_CONFIGS: Record<string, HintConfig> = {
  owen: { timeoutDelay: 5, escalateDelay: 5, autoCompleteAfter: 3 },
  kian: { timeoutDelay: 8, escalateDelay: 7, autoCompleteAfter: 4 },
};

export class HintLadder {
  private level: HintLevel = 0;
  private missCount = 0;
  private timeSincePrompt = 0;
  private concept = '';
  private _autoCompleted = false;

  get hintLevel(): HintLevel { return this.level; }
  get autoCompleted(): boolean { return this._autoCompleted; }

  /** Start a new prompt — resets hint state */
  startPrompt(concept: string): void {
    this.level = 0;
    this.missCount = 0;
    this.timeSincePrompt = 0;
    this.concept = concept;
    this._autoCompleted = false;
  }

  /** Call on wrong answer. Returns new hint level. */
  onMiss(): HintLevel {
    this.missCount++;
    const config = this.getConfig();

    if (this.missCount >= config.autoCompleteAfter) {
      this.level = 4;
      this._autoCompleted = true;
    } else if (this.missCount >= 2) {
      this.level = Math.max(this.level, 3) as HintLevel;
    } else {
      this.level = Math.max(this.level, 2) as HintLevel;
    }
    return this.level;
  }

  /** Call every frame. Returns true if hint level escalated from timeout. */
  update(dt: number): boolean {
    if (this.level >= 4) return false;

    this.timeSincePrompt += dt;
    const config = this.getConfig();
    const prevLevel = this.level;

    if (this.level === 0 && this.timeSincePrompt >= config.timeoutDelay) {
      this.level = 1; // Voice repeat
    } else if (this.level === 1 && this.timeSincePrompt >= config.timeoutDelay + config.escalateDelay) {
      this.level = 2; // Visual pulse
    } else if (this.level === 2 && this.timeSincePrompt >= config.timeoutDelay + config.escalateDelay * 2) {
      this.level = 3; // MCX looks at target
    }

    return this.level !== prevLevel;
  }

  private getConfig(): HintConfig {
    const turn = session.currentTurn;
    return HINT_CONFIGS[turn] ?? HINT_CONFIGS.kian;
  }
}
