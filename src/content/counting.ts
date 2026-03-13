// src/content/counting.ts

// ---------------------------------------------------------------------------
// Digit constellation paths (normalised 0-1 coordinates, like letterPaths)
// ---------------------------------------------------------------------------

export const digitPaths: Record<number, { x: number; y: number }[]> = {
  0: [
    { x: 0.50, y: 0.08 }, { x: 0.25, y: 0.20 }, { x: 0.20, y: 0.50 },
    { x: 0.25, y: 0.80 }, { x: 0.50, y: 0.92 }, { x: 0.75, y: 0.80 },
    { x: 0.80, y: 0.50 }, { x: 0.75, y: 0.20 }, { x: 0.50, y: 0.08 },
  ],
  1: [
    { x: 0.35, y: 0.25 }, { x: 0.50, y: 0.08 }, { x: 0.50, y: 0.50 },
    { x: 0.50, y: 0.92 },
  ],
  2: [
    { x: 0.25, y: 0.20 }, { x: 0.50, y: 0.08 }, { x: 0.75, y: 0.20 },
    { x: 0.75, y: 0.40 }, { x: 0.25, y: 0.80 }, { x: 0.25, y: 0.92 },
    { x: 0.75, y: 0.92 },
  ],
  3: [
    { x: 0.25, y: 0.08 }, { x: 0.75, y: 0.08 }, { x: 0.75, y: 0.30 },
    { x: 0.50, y: 0.48 }, { x: 0.75, y: 0.65 }, { x: 0.75, y: 0.85 },
    { x: 0.50, y: 0.92 }, { x: 0.25, y: 0.85 },
  ],
  4: [
    { x: 0.65, y: 0.92 }, { x: 0.65, y: 0.08 }, { x: 0.20, y: 0.65 },
    { x: 0.80, y: 0.65 },
  ],
  5: [
    { x: 0.75, y: 0.08 }, { x: 0.25, y: 0.08 }, { x: 0.25, y: 0.45 },
    { x: 0.60, y: 0.40 }, { x: 0.75, y: 0.55 }, { x: 0.75, y: 0.75 },
    { x: 0.50, y: 0.92 }, { x: 0.25, y: 0.85 },
  ],
  6: [
    { x: 0.65, y: 0.12 }, { x: 0.45, y: 0.08 }, { x: 0.25, y: 0.25 },
    { x: 0.20, y: 0.55 }, { x: 0.25, y: 0.82 }, { x: 0.50, y: 0.92 },
    { x: 0.75, y: 0.78 }, { x: 0.75, y: 0.58 }, { x: 0.50, y: 0.45 },
    { x: 0.25, y: 0.55 },
  ],
  7: [
    { x: 0.20, y: 0.08 }, { x: 0.80, y: 0.08 }, { x: 0.55, y: 0.50 },
    { x: 0.45, y: 0.92 },
  ],
  8: [
    { x: 0.50, y: 0.48 }, { x: 0.30, y: 0.30 }, { x: 0.30, y: 0.15 },
    { x: 0.50, y: 0.08 }, { x: 0.70, y: 0.15 }, { x: 0.70, y: 0.30 },
    { x: 0.50, y: 0.48 }, { x: 0.25, y: 0.65 }, { x: 0.25, y: 0.82 },
    { x: 0.50, y: 0.92 }, { x: 0.75, y: 0.82 }, { x: 0.75, y: 0.65 },
    { x: 0.50, y: 0.48 },
  ],
  9: [
    { x: 0.75, y: 0.45 }, { x: 0.50, y: 0.55 }, { x: 0.25, y: 0.42 },
    { x: 0.25, y: 0.22 }, { x: 0.50, y: 0.08 }, { x: 0.75, y: 0.22 },
    { x: 0.80, y: 0.50 }, { x: 0.75, y: 0.78 }, { x: 0.55, y: 0.92 },
    { x: 0.35, y: 0.88 },
  ],
};

// ---------------------------------------------------------------------------
// Counting difficulty
// ---------------------------------------------------------------------------

export interface CountingDifficulty {
  minNumber: number;
  maxNumber: number;
  pillarsMatchCount: boolean; // true = exact pillars, false = more pillars than needed
}

export const countingDifficulty: Record<'little' | 'big', CountingDifficulty> = {
  little: { minNumber: 1, maxNumber: 3, pillarsMatchCount: true },
  big: { minNumber: 1, maxNumber: 10, pillarsMatchCount: false },
};

// ---------------------------------------------------------------------------
// Addition mode difficulty (Kian)
// ---------------------------------------------------------------------------

export interface AdditionDifficulty {
  maxSum: number;
  addends: [number, number][];
}

export const additionDifficulty: AdditionDifficulty = {
  maxSum: 7,
  addends: [
    [1, 1], [1, 2], [2, 1], [2, 2], [1, 3], [3, 1], [2, 3], [3, 2],
    [1, 4], [4, 1], [2, 4], [3, 3], [1, 5], [5, 1], [3, 4], [4, 3],
    [2, 5], [5, 2],
  ],
};

// ---------------------------------------------------------------------------
// Subitizing mode patterns (Owen)
// ---------------------------------------------------------------------------

export interface SubitizingPattern {
  count: number;
  /** Offsets from center in design-space units */
  positions: { dx: number; dy: number }[];
}

/**
 * Dice-style dot patterns for 1-3.
 * Positions are offsets from a center point, spaced for easy recognition.
 */
export const subitizingPatterns: SubitizingPattern[] = [
  // 1: single center dot
  { count: 1, positions: [{ dx: 0, dy: 0 }] },
  // 2: side by side
  { count: 2, positions: [{ dx: -60, dy: 0 }, { dx: 60, dy: 0 }] },
  // 3: triangle (like dice)
  { count: 3, positions: [{ dx: 0, dy: -50 }, { dx: -55, dy: 40 }, { dx: 55, dy: 40 }] },
  // 4: square pattern (like dice)
  { count: 4, positions: [{ dx: -50, dy: -50 }, { dx: 50, dy: -50 }, { dx: -50, dy: 50 }, { dx: 50, dy: 50 }] },
  // 5: quincunx (like dice, center + 4 corners)
  { count: 5, positions: [{ dx: -50, dy: -50 }, { dx: 50, dy: -50 }, { dx: 0, dy: 0 }, { dx: -50, dy: 50 }, { dx: 50, dy: 50 }] },
];

// ---------------------------------------------------------------------------
// Number bonds (Kian)
// ---------------------------------------------------------------------------

export interface NumberBond {
  whole: number;
  partA: number;
  partB: number;
}

export const numberBonds: NumberBond[] = [
  { whole: 2, partA: 1, partB: 1 },
  { whole: 3, partA: 1, partB: 2 },
  { whole: 3, partA: 2, partB: 1 },
  { whole: 4, partA: 1, partB: 3 },
  { whole: 4, partA: 2, partB: 2 },
  { whole: 4, partA: 3, partB: 1 },
  { whole: 5, partA: 1, partB: 4 },
  { whole: 5, partA: 2, partB: 3 },
  { whole: 5, partA: 3, partB: 2 },
  { whole: 5, partA: 4, partB: 1 },
  // Bonds for 6
  { whole: 6, partA: 1, partB: 5 },
  { whole: 6, partA: 2, partB: 4 },
  { whole: 6, partA: 3, partB: 3 },
  { whole: 6, partA: 4, partB: 2 },
  { whole: 6, partA: 5, partB: 1 },
  // Bonds for 7
  { whole: 7, partA: 1, partB: 6 },
  { whole: 7, partA: 2, partB: 5 },
  { whole: 7, partA: 3, partB: 4 },
  { whole: 7, partA: 4, partB: 3 },
  { whole: 7, partA: 5, partB: 2 },
  { whole: 7, partA: 6, partB: 1 },
];

// ---------------------------------------------------------------------------
// Comparison mode (Kian)
// ---------------------------------------------------------------------------

export interface ComparisonPair {
  a: number;
  b: number;
  answer: 'more' | 'less' | 'same';
}

export const comparisonPairs: ComparisonPair[] = [
  { a: 3, b: 1, answer: 'more' },
  { a: 1, b: 4, answer: 'less' },
  { a: 2, b: 2, answer: 'same' },
  { a: 5, b: 2, answer: 'more' },
  { a: 1, b: 3, answer: 'less' },
  { a: 4, b: 4, answer: 'same' },
  { a: 3, b: 5, answer: 'less' },
  { a: 2, b: 1, answer: 'more' },
  { a: 3, b: 3, answer: 'same' },
  { a: 1, b: 5, answer: 'less' },
  { a: 6, b: 3, answer: 'more' },
  { a: 2, b: 7, answer: 'less' },
  { a: 5, b: 5, answer: 'same' },
  { a: 4, b: 6, answer: 'less' },
  { a: 7, b: 2, answer: 'more' },
];

// Voice file: `number-${n}` maps to /audio/voice/prompts/number-1.mp3, etc.
export function getNumberVoiceFile(n: number): string {
  return `number-${n}`;
}
