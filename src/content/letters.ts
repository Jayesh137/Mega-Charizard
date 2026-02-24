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
  { letter: 'C', word: 'Charizard', phonicsSound: 'ch', icon: 'character', voiceFile: 'letter-c', starCount: { little: 5, big: 8 } },
  { letter: 'F', word: 'Fire', phonicsSound: 'ff', icon: 'flame', voiceFile: 'letter-f', starCount: { little: 6, big: 10 } },
  { letter: 'S', word: 'Star', phonicsSound: 'ss', icon: 'star', voiceFile: 'letter-s', starCount: { little: 5, big: 9 } },
  { letter: 'B', word: 'Blue', phonicsSound: 'bb', icon: 'colorBlob', voiceFile: 'letter-b', starCount: { little: 6, big: 10 } },
];

export const letterDifficulty: Record<'little' | 'big', LetterDifficulty> = {
  little: { includePhonics: false, includeFirstLetterMatch: false, autoAdvanceNearClick: true },
  big: { includePhonics: true, includeFirstLetterMatch: true, autoAdvanceNearClick: false },
};

// ---------------------------------------------------------------------------
// Curved letter paths for Magic Runes (8-15 points per letter, normalised 0-1)
// ---------------------------------------------------------------------------

// Letter paths are traced as dot-to-dot constellations. Stars connect
// sequentially with straight lines, so each path must be a SINGLE continuous
// stroke that produces a recognisable letter shape. For letters with multiple
// strokes (F, B) we route back along the spine so the line retraces.
//
// All coordinates are normalised 0-1 within the letter bounding box.
// More points = smoother curves for Kian; Owen samples a subset.

export const letterPaths: Record<string, { x: number; y: number }[]> = {
  C: [
    // Open curve from top-right, around the left, to bottom-right
    { x: 0.70, y: 0.15 },
    { x: 0.50, y: 0.06 },
    { x: 0.30, y: 0.10 },
    { x: 0.15, y: 0.22 },
    { x: 0.10, y: 0.40 },
    { x: 0.10, y: 0.60 },
    { x: 0.15, y: 0.78 },
    { x: 0.30, y: 0.90 },
    { x: 0.50, y: 0.94 },
    { x: 0.70, y: 0.85 },
  ],
  S: [
    // Smooth S: top-right → curves left → crosses center → curves right → bottom-left
    { x: 0.65, y: 0.12 },
    { x: 0.45, y: 0.06 },
    { x: 0.25, y: 0.12 },
    { x: 0.18, y: 0.25 },
    { x: 0.25, y: 0.38 },
    { x: 0.45, y: 0.48 },
    { x: 0.65, y: 0.58 },
    { x: 0.72, y: 0.72 },
    { x: 0.65, y: 0.85 },
    { x: 0.45, y: 0.92 },
    { x: 0.25, y: 0.88 },
  ],
  B: [
    // Single continuous stroke: down the spine, up around top bump, back to
    // mid-spine, out around bottom bump, back to bottom of spine.
    { x: 0.25, y: 0.08 },  // top of spine
    { x: 0.25, y: 0.28 },  // mid-upper spine
    { x: 0.25, y: 0.48 },  // mid spine
    { x: 0.25, y: 0.68 },  // mid-lower spine
    { x: 0.25, y: 0.92 },  // bottom of spine
    { x: 0.45, y: 0.90 },  // bottom bump starts
    { x: 0.62, y: 0.78 },  // bottom bump peak
    { x: 0.62, y: 0.62 },  // bottom bump ends
    { x: 0.40, y: 0.50 },  // back to mid spine
    { x: 0.62, y: 0.38 },  // top bump starts
    { x: 0.62, y: 0.22 },  // top bump peak
    { x: 0.45, y: 0.10 },  // top bump ends, connects near top of spine
  ],
  F: [
    // Single continuous stroke: bottom of stem → top of stem → across top
    // bar → back to stem junction → across middle bar.
    { x: 0.25, y: 0.92 },  // bottom of stem
    { x: 0.25, y: 0.72 },  // lower stem
    { x: 0.25, y: 0.50 },  // mid stem (middle bar junction)
    { x: 0.25, y: 0.30 },  // upper stem
    { x: 0.25, y: 0.08 },  // top of stem
    { x: 0.45, y: 0.08 },  // top bar middle
    { x: 0.70, y: 0.08 },  // top bar end
    { x: 0.45, y: 0.08 },  // retrace top bar back
    { x: 0.25, y: 0.08 },  // back to stem top
    { x: 0.25, y: 0.30 },  // retrace down to mid area
    { x: 0.25, y: 0.50 },  // mid stem junction
    { x: 0.45, y: 0.50 },  // middle bar middle
    { x: 0.62, y: 0.50 },  // middle bar end
  ],
};
