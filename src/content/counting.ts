// src/content/counting.ts
// Research: Subitizing (dice/domino patterns) is fundamental to number sense (NAEYC, HeadStart)
// Research: Finger counting at ages 4-6.5 → better addition by age 7 (APA 2025)
// Research: Ten-frames are a core visual for developing number sense (Stanford DREME)
// Research: Conceptual subitizing: children see 2+2=4, 3+3=6 in arranged patterns

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
// Research: Start with doubles and near-doubles for easiest entry
// ---------------------------------------------------------------------------

export interface AdditionDifficulty {
  maxSum: number;
  addends: [number, number][];
}

export const additionDifficulty: AdditionDifficulty = {
  maxSum: 10,
  addends: [
    // Doubles first (research: easiest to learn)
    [1, 1], [2, 2], [3, 3], [4, 4], [5, 5],
    // Near-doubles
    [1, 2], [2, 1], [2, 3], [3, 2], [3, 4], [4, 3], [4, 5], [5, 4],
    // Other sums to 5
    [1, 3], [3, 1], [1, 4], [4, 1],
    // Sums to 6-7
    [2, 4], [4, 2], [2, 5], [5, 2], [3, 4], [4, 3],
    // Sums to 8-10
    [3, 5], [5, 3], [4, 6], [6, 4], [5, 5],
    [1, 5], [5, 1], [1, 6], [6, 1],
  ],
};

// ---------------------------------------------------------------------------
// Doubles facts (research: entry point to addition fluency)
// ---------------------------------------------------------------------------

export const doublesFacts = [
  { a: 1, b: 1, sum: 2 },
  { a: 2, b: 2, sum: 4 },
  { a: 3, b: 3, sum: 6 },
  { a: 4, b: 4, sum: 8 },
  { a: 5, b: 5, sum: 10 },
] as const;

// ---------------------------------------------------------------------------
// Subitizing mode patterns
// Research: Dice/domino patterns support conceptual subitizing (NAEYC, HeadStart)
// ---------------------------------------------------------------------------

export interface SubitizingPattern {
  count: number;
  /** Offsets from center in design-space units */
  positions: { dx: number; dy: number }[];
  /** Visual label for pattern type */
  style: 'dice' | 'domino' | 'random' | 'line';
}

export const subitizingPatterns: SubitizingPattern[] = [
  // 1: single center dot
  { count: 1, positions: [{ dx: 0, dy: 0 }], style: 'dice' },
  // 2: side by side (dice)
  { count: 2, positions: [{ dx: -60, dy: 0 }, { dx: 60, dy: 0 }], style: 'dice' },
  // 2: vertical (domino)
  { count: 2, positions: [{ dx: 0, dy: -50 }, { dx: 0, dy: 50 }], style: 'domino' },
  // 3: triangle (dice)
  { count: 3, positions: [{ dx: 0, dy: -50 }, { dx: -55, dy: 40 }, { dx: 55, dy: 40 }], style: 'dice' },
  // 3: line
  { count: 3, positions: [{ dx: -60, dy: 0 }, { dx: 0, dy: 0 }, { dx: 60, dy: 0 }], style: 'line' },
  // 4: square pattern (dice) — conceptual: 2+2
  { count: 4, positions: [{ dx: -50, dy: -50 }, { dx: 50, dy: -50 }, { dx: -50, dy: 50 }, { dx: 50, dy: 50 }], style: 'dice' },
  // 4: domino 2+2
  { count: 4, positions: [{ dx: -50, dy: -40 }, { dx: 50, dy: -40 }, { dx: -50, dy: 40 }, { dx: 50, dy: 40 }], style: 'domino' },
  // 5: quincunx (dice) — conceptual: 4+1
  { count: 5, positions: [{ dx: -50, dy: -50 }, { dx: 50, dy: -50 }, { dx: 0, dy: 0 }, { dx: -50, dy: 50 }, { dx: 50, dy: 50 }], style: 'dice' },
  // 5: domino 3+2
  { count: 5, positions: [{ dx: -55, dy: -40 }, { dx: 0, dy: -40 }, { dx: 55, dy: -40 }, { dx: -30, dy: 40 }, { dx: 30, dy: 40 }], style: 'domino' },
  // 6: dice (3+3)
  { count: 6, positions: [{ dx: -50, dy: -55 }, { dx: -50, dy: 0 }, { dx: -50, dy: 55 }, { dx: 50, dy: -55 }, { dx: 50, dy: 0 }, { dx: 50, dy: 55 }], style: 'dice' },
  // 6: domino 3+3
  { count: 6, positions: [{ dx: -55, dy: -40 }, { dx: 0, dy: -40 }, { dx: 55, dy: -40 }, { dx: -55, dy: 40 }, { dx: 0, dy: 40 }, { dx: 55, dy: 40 }], style: 'domino' },
];

// ---------------------------------------------------------------------------
// Ten-frame patterns (research: fundamental number sense tool)
// A 2×5 grid where filled circles represent the number
// ---------------------------------------------------------------------------

export interface TenFramePattern {
  count: number;
  /** Which cells are filled (0-9, row-major: 0-4 = top, 5-9 = bottom) */
  filled: number[];
}

export const tenFramePatterns: TenFramePattern[] = [
  { count: 1, filled: [0] },
  { count: 2, filled: [0, 1] },
  { count: 3, filled: [0, 1, 2] },
  { count: 4, filled: [0, 1, 2, 3] },
  { count: 5, filled: [0, 1, 2, 3, 4] },
  { count: 6, filled: [0, 1, 2, 3, 4, 5] },
  { count: 7, filled: [0, 1, 2, 3, 4, 5, 6] },
  { count: 8, filled: [0, 1, 2, 3, 4, 5, 6, 7] },
  { count: 9, filled: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  { count: 10, filled: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
];

// ---------------------------------------------------------------------------
// Number bonds (Kian) — expanded to 10
// Research: Part-part-whole understanding is foundational (CIS Australia, 2025)
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
  // Bonds for 8
  { whole: 8, partA: 1, partB: 7 },
  { whole: 8, partA: 2, partB: 6 },
  { whole: 8, partA: 3, partB: 5 },
  { whole: 8, partA: 4, partB: 4 },
  { whole: 8, partA: 5, partB: 3 },
  { whole: 8, partA: 6, partB: 2 },
  { whole: 8, partA: 7, partB: 1 },
  // Bonds for 9
  { whole: 9, partA: 1, partB: 8 },
  { whole: 9, partA: 2, partB: 7 },
  { whole: 9, partA: 3, partB: 6 },
  { whole: 9, partA: 4, partB: 5 },
  { whole: 9, partA: 5, partB: 4 },
  { whole: 9, partA: 6, partB: 3 },
  { whole: 9, partA: 7, partB: 2 },
  { whole: 9, partA: 8, partB: 1 },
  // Bonds for 10 (key milestone)
  { whole: 10, partA: 1, partB: 9 },
  { whole: 10, partA: 2, partB: 8 },
  { whole: 10, partA: 3, partB: 7 },
  { whole: 10, partA: 4, partB: 6 },
  { whole: 10, partA: 5, partB: 5 },
  { whole: 10, partA: 6, partB: 4 },
  { whole: 10, partA: 7, partB: 3 },
  { whole: 10, partA: 8, partB: 2 },
  { whole: 10, partA: 9, partB: 1 },
];

// ---------------------------------------------------------------------------
// Comparison mode (Kian) — expanded
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
  // Extended for bigger numbers
  { a: 8, b: 3, answer: 'more' },
  { a: 2, b: 9, answer: 'less' },
  { a: 6, b: 6, answer: 'same' },
  { a: 10, b: 4, answer: 'more' },
  { a: 3, b: 8, answer: 'less' },
  { a: 7, b: 7, answer: 'same' },
  { a: 9, b: 5, answer: 'more' },
  { a: 1, b: 10, answer: 'less' },
];

// ---------------------------------------------------------------------------
// Number words (for digit-to-word matching)
// ---------------------------------------------------------------------------

export const numberWords: Record<number, string> = {
  1: 'ONE', 2: 'TWO', 3: 'THREE', 4: 'FOUR', 5: 'FIVE',
  6: 'SIX', 7: 'SEVEN', 8: 'EIGHT', 9: 'NINE', 10: 'TEN',
};

// Voice file: `number-${n}` maps to /audio/voice/prompts/number-1.mp3, etc.
export function getNumberVoiceFile(n: number): string {
  return `number-${n}`;
}
