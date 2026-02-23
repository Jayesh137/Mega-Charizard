// src/content/letters.ts

export interface LetterItem {
  letter: string;
  word: string;
  phonicsSound: string;
  icon: string; // key into icon drawing registry
  voiceFile: string;
  starCount: { little: number; big: number };
}

export interface LetterDifficulty {
  includePhonics: boolean;
  includeFirstLetterMatch: boolean;
  autoAdvanceNearClick: boolean; // forgiving click zones for younger kids
}

export const starterLetters: LetterItem[] = [
  { letter: 'C', word: 'Charizard', phonicsSound: 'ch', icon: 'character', voiceFile: 'letter-c', starCount: { little: 4, big: 8 } },
  { letter: 'F', word: 'Fire', phonicsSound: 'ff', icon: 'flame', voiceFile: 'letter-f', starCount: { little: 3, big: 8 } },
  { letter: 'S', word: 'Star', phonicsSound: 'ss', icon: 'star', voiceFile: 'letter-s', starCount: { little: 5, big: 10 } },
  { letter: 'B', word: 'Blue', phonicsSound: 'bb', icon: 'colorBlob', voiceFile: 'letter-b', starCount: { little: 4, big: 12 } },
];

export const letterDifficulty: Record<'little' | 'big', LetterDifficulty> = {
  little: { includePhonics: false, includeFirstLetterMatch: false, autoAdvanceNearClick: true },
  big: { includePhonics: true, includeFirstLetterMatch: true, autoAdvanceNearClick: false },
};

// ---------------------------------------------------------------------------
// Curved letter paths for Magic Runes (8-15 points per letter, normalised 0-1)
// ---------------------------------------------------------------------------

export const letterPaths: Record<string, { x: number; y: number }[]> = {
  C: [
    // Smooth C curve, 8 points, clockwise from top-right
    { x: 0.65, y: 0.15 }, { x: 0.40, y: 0.08 }, { x: 0.20, y: 0.18 },
    { x: 0.12, y: 0.35 }, { x: 0.10, y: 0.55 }, { x: 0.15, y: 0.75 },
    { x: 0.30, y: 0.88 }, { x: 0.55, y: 0.90 },
  ],
  S: [
    // Proper S curve, 10 points
    { x: 0.60, y: 0.12 }, { x: 0.40, y: 0.08 }, { x: 0.22, y: 0.15 },
    { x: 0.18, y: 0.30 }, { x: 0.30, y: 0.42 }, { x: 0.55, y: 0.50 },
    { x: 0.70, y: 0.62 }, { x: 0.72, y: 0.78 }, { x: 0.55, y: 0.90 },
    { x: 0.32, y: 0.88 },
  ],
  B: [
    // B with two bumps, 12 points
    { x: 0.25, y: 0.10 }, { x: 0.25, y: 0.25 }, { x: 0.25, y: 0.40 },
    { x: 0.45, y: 0.38 }, { x: 0.60, y: 0.30 }, { x: 0.55, y: 0.15 },
    { x: 0.25, y: 0.10 }, // back to spine for second bump
    { x: 0.25, y: 0.55 }, { x: 0.25, y: 0.70 },
    { x: 0.50, y: 0.72 }, { x: 0.65, y: 0.60 }, { x: 0.50, y: 0.48 },
  ],
  F: [
    // F shape, 8 points — spine then top bar then middle bar
    { x: 0.25, y: 0.90 }, { x: 0.25, y: 0.70 }, { x: 0.25, y: 0.50 },
    { x: 0.25, y: 0.30 }, { x: 0.25, y: 0.10 },
    { x: 0.45, y: 0.10 }, { x: 0.65, y: 0.10 },
    { x: 0.25, y: 0.50 }, // middle bar handled by connecting back to spine point
  ],
};
