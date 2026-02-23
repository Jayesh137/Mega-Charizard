// src/content/counting.ts

export interface CountingDifficulty {
  minNumber: number;
  maxNumber: number;
  pillarsMatchCount: boolean; // true = exact pillars, false = more pillars than needed
}

export const countingDifficulty: Record<'little' | 'big', CountingDifficulty> = {
  little: { minNumber: 1, maxNumber: 3, pillarsMatchCount: true },
  big: { minNumber: 1, maxNumber: 7, pillarsMatchCount: false },
};

// Voice file: `number-${n}` maps to /audio/voice/prompts/number-1.mp3, etc.
export function getNumberVoiceFile(n: number): string {
  return `number-${n}`;
}
