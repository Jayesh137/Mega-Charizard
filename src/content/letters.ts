// src/content/letters.ts
// Research: Systematic phonics with one vowel sound at a time (Florida CRC)
// Research: CVC words are the foundation of phonics instruction (FCRR)
// Research: Letter recognition in pre-K is a strong predictor of future literacy (NAEYC)

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
  { letter: 'M', word: 'Mega', phonicsSound: 'mm', icon: 'star', voiceFile: 'letter-m', starCount: { little: 5, big: 8 } },
  { letter: 'P', word: 'Pikachu', phonicsSound: 'pp', icon: 'flame', voiceFile: 'letter-p', starCount: { little: 5, big: 9 } },
  { letter: 'T', word: 'Thunder', phonicsSound: 'tt', icon: 'star', voiceFile: 'letter-t', starCount: { little: 6, big: 9 } },
  { letter: 'R', word: 'Raichu', phonicsSound: 'rr', icon: 'flame', voiceFile: 'letter-r', starCount: { little: 5, big: 8 } },
  { letter: 'D', word: 'Dragon', phonicsSound: 'dd', icon: 'star', voiceFile: 'letter-d', starCount: { little: 6, big: 10 } },
  { letter: 'A', word: 'Ash', phonicsSound: 'ah', icon: 'character', voiceFile: 'letter-a', starCount: { little: 5, big: 8 } },
];

/** New letters — Phase 2 expansion */
export const expandedLetters: LetterItem[] = [
  { letter: 'E', word: 'Eevee', phonicsSound: 'eh', icon: 'character', voiceFile: 'letter-e', starCount: { little: 5, big: 8 } },
  { letter: 'G', word: 'Gengar', phonicsSound: 'gg', icon: 'character', voiceFile: 'letter-g', starCount: { little: 6, big: 9 } },
  { letter: 'H', word: 'Ho-Oh', phonicsSound: 'hh', icon: 'flame', voiceFile: 'letter-h', starCount: { little: 5, big: 8 } },
  { letter: 'I', word: 'Ivysaur', phonicsSound: 'ih', icon: 'character', voiceFile: 'letter-i', starCount: { little: 5, big: 9 } },
  { letter: 'N', word: 'Ninetales', phonicsSound: 'nn', icon: 'flame', voiceFile: 'letter-n', starCount: { little: 6, big: 9 } },
  { letter: 'O', word: 'Onix', phonicsSound: 'oh', icon: 'star', voiceFile: 'letter-o', starCount: { little: 5, big: 8 } },
];

export const allLetters = [...starterLetters, ...expandedLetters];

export const letterDifficulty: Record<'little' | 'big', LetterDifficulty> = {
  little: { includePhonics: false, includeFirstLetterMatch: false, autoAdvanceNearClick: true },
  big: { includePhonics: true, includeFirstLetterMatch: true, autoAdvanceNearClick: false },
};

// ---------------------------------------------------------------------------
// Curved letter paths for Magic Runes (8-15 points per letter, normalised 0-1)
// ---------------------------------------------------------------------------

export const letterPaths: Record<string, { x: number; y: number }[]> = {
  C: [
    { x: 0.70, y: 0.15 }, { x: 0.50, y: 0.06 }, { x: 0.30, y: 0.10 },
    { x: 0.15, y: 0.22 }, { x: 0.10, y: 0.40 }, { x: 0.10, y: 0.60 },
    { x: 0.15, y: 0.78 }, { x: 0.30, y: 0.90 }, { x: 0.50, y: 0.94 },
    { x: 0.70, y: 0.85 },
  ],
  S: [
    { x: 0.65, y: 0.12 }, { x: 0.45, y: 0.06 }, { x: 0.25, y: 0.12 },
    { x: 0.18, y: 0.25 }, { x: 0.25, y: 0.38 }, { x: 0.45, y: 0.48 },
    { x: 0.65, y: 0.58 }, { x: 0.72, y: 0.72 }, { x: 0.65, y: 0.85 },
    { x: 0.45, y: 0.92 }, { x: 0.25, y: 0.88 },
  ],
  B: [
    { x: 0.25, y: 0.08 }, { x: 0.25, y: 0.28 }, { x: 0.25, y: 0.48 },
    { x: 0.25, y: 0.68 }, { x: 0.25, y: 0.92 }, { x: 0.45, y: 0.90 },
    { x: 0.62, y: 0.78 }, { x: 0.62, y: 0.62 }, { x: 0.40, y: 0.50 },
    { x: 0.62, y: 0.38 }, { x: 0.62, y: 0.22 }, { x: 0.45, y: 0.10 },
  ],
  F: [
    { x: 0.25, y: 0.92 }, { x: 0.25, y: 0.72 }, { x: 0.25, y: 0.50 },
    { x: 0.25, y: 0.30 }, { x: 0.25, y: 0.08 }, { x: 0.45, y: 0.08 },
    { x: 0.70, y: 0.08 }, { x: 0.45, y: 0.08 }, { x: 0.25, y: 0.08 },
    { x: 0.25, y: 0.30 }, { x: 0.25, y: 0.50 }, { x: 0.45, y: 0.50 },
    { x: 0.62, y: 0.50 },
  ],
  M: [
    { x: 0.15, y: 0.92 }, { x: 0.15, y: 0.08 }, { x: 0.50, y: 0.55 },
    { x: 0.85, y: 0.08 }, { x: 0.85, y: 0.92 },
  ],
  P: [
    { x: 0.25, y: 0.92 }, { x: 0.25, y: 0.08 }, { x: 0.50, y: 0.08 },
    { x: 0.70, y: 0.20 }, { x: 0.70, y: 0.38 }, { x: 0.25, y: 0.48 },
  ],
  T: [
    { x: 0.15, y: 0.08 }, { x: 0.50, y: 0.08 }, { x: 0.85, y: 0.08 },
    { x: 0.50, y: 0.08 }, { x: 0.50, y: 0.50 }, { x: 0.50, y: 0.92 },
  ],
  R: [
    { x: 0.25, y: 0.92 }, { x: 0.25, y: 0.08 }, { x: 0.50, y: 0.08 },
    { x: 0.70, y: 0.20 }, { x: 0.70, y: 0.35 }, { x: 0.25, y: 0.48 },
    { x: 0.70, y: 0.92 },
  ],
  D: [
    { x: 0.25, y: 0.08 }, { x: 0.25, y: 0.50 }, { x: 0.25, y: 0.92 },
    { x: 0.50, y: 0.92 }, { x: 0.75, y: 0.70 }, { x: 0.75, y: 0.30 },
    { x: 0.50, y: 0.08 }, { x: 0.25, y: 0.08 },
  ],
  A: [
    { x: 0.15, y: 0.92 }, { x: 0.50, y: 0.08 }, { x: 0.85, y: 0.92 },
    { x: 0.68, y: 0.52 }, { x: 0.32, y: 0.52 },
  ],
  // --- New letters ---
  E: [
    { x: 0.70, y: 0.08 }, { x: 0.25, y: 0.08 }, { x: 0.25, y: 0.50 },
    { x: 0.60, y: 0.50 }, { x: 0.25, y: 0.50 }, { x: 0.25, y: 0.92 },
    { x: 0.70, y: 0.92 },
  ],
  G: [
    { x: 0.70, y: 0.15 }, { x: 0.50, y: 0.06 }, { x: 0.30, y: 0.10 },
    { x: 0.15, y: 0.25 }, { x: 0.10, y: 0.50 }, { x: 0.15, y: 0.75 },
    { x: 0.30, y: 0.90 }, { x: 0.50, y: 0.94 }, { x: 0.70, y: 0.85 },
    { x: 0.70, y: 0.55 }, { x: 0.50, y: 0.55 },
  ],
  H: [
    { x: 0.25, y: 0.08 }, { x: 0.25, y: 0.50 }, { x: 0.25, y: 0.92 },
    { x: 0.25, y: 0.50 }, { x: 0.75, y: 0.50 }, { x: 0.75, y: 0.08 },
    { x: 0.75, y: 0.50 }, { x: 0.75, y: 0.92 },
  ],
  I: [
    { x: 0.30, y: 0.08 }, { x: 0.50, y: 0.08 }, { x: 0.70, y: 0.08 },
    { x: 0.50, y: 0.08 }, { x: 0.50, y: 0.50 }, { x: 0.50, y: 0.92 },
    { x: 0.30, y: 0.92 }, { x: 0.70, y: 0.92 },
  ],
  N: [
    { x: 0.25, y: 0.92 }, { x: 0.25, y: 0.08 }, { x: 0.75, y: 0.92 },
    { x: 0.75, y: 0.08 },
  ],
  O: [
    { x: 0.50, y: 0.06 }, { x: 0.30, y: 0.10 }, { x: 0.15, y: 0.25 },
    { x: 0.10, y: 0.50 }, { x: 0.15, y: 0.75 }, { x: 0.30, y: 0.90 },
    { x: 0.50, y: 0.94 }, { x: 0.70, y: 0.90 }, { x: 0.85, y: 0.75 },
    { x: 0.90, y: 0.50 }, { x: 0.85, y: 0.25 }, { x: 0.70, y: 0.10 },
    { x: 0.50, y: 0.06 },
  ],
};

// ---------------------------------------------------------------------------
// CVC word data — expanded with short-E and short-I vowels
// Research: Start with one vowel family at a time (FCRR)
// ---------------------------------------------------------------------------

export interface CVCWord {
  word: string;
  letters: string[];
  voiceBlend: string;
  vowelSound: 'a' | 'e' | 'i';
}

export const cvcWords: CVCWord[] = [
  // Short-A family (-AT)
  { word: 'CAT', letters: ['C', 'A', 'T'], voiceBlend: "Cuh Ah Tuh... Cat!", vowelSound: 'a' },
  { word: 'BAT', letters: ['B', 'A', 'T'], voiceBlend: "Buh Ah Tuh... Bat!", vowelSound: 'a' },
  { word: 'SAT', letters: ['S', 'A', 'T'], voiceBlend: "Sss Ah Tuh... Sat!", vowelSound: 'a' },
  { word: 'MAT', letters: ['M', 'A', 'T'], voiceBlend: "Mmm Ah Tuh... Mat!", vowelSound: 'a' },
  { word: 'RAT', letters: ['R', 'A', 'T'], voiceBlend: "Rrr Ah Tuh... Rat!", vowelSound: 'a' },
  { word: 'PAT', letters: ['P', 'A', 'T'], voiceBlend: "Puh Ah Tuh... Pat!", vowelSound: 'a' },
  { word: 'FAT', letters: ['F', 'A', 'T'], voiceBlend: "Fff Ah Tuh... Fat!", vowelSound: 'a' },
  { word: 'HAT', letters: ['H', 'A', 'T'], voiceBlend: "Huh Ah Tuh... Hat!", vowelSound: 'a' },
  // Short-A family (-AD)
  { word: 'DAD', letters: ['D', 'A', 'D'], voiceBlend: "Duh Ah Duh... Dad!", vowelSound: 'a' },
  { word: 'BAD', letters: ['B', 'A', 'D'], voiceBlend: "Buh Ah Duh... Bad!", vowelSound: 'a' },
  { word: 'SAD', letters: ['S', 'A', 'D'], voiceBlend: "Sss Ah Duh... Sad!", vowelSound: 'a' },
  { word: 'MAD', letters: ['M', 'A', 'D'], voiceBlend: "Mmm Ah Duh... Mad!", vowelSound: 'a' },
  { word: 'RAD', letters: ['R', 'A', 'D'], voiceBlend: "Rrr Ah Duh... Rad!", vowelSound: 'a' },
  { word: 'PAD', letters: ['P', 'A', 'D'], voiceBlend: "Puh Ah Duh... Pad!", vowelSound: 'a' },
  // Short-A family (-AP)
  { word: 'TAP', letters: ['T', 'A', 'P'], voiceBlend: "Tuh Ah Puh... Tap!", vowelSound: 'a' },
  { word: 'MAP', letters: ['M', 'A', 'P'], voiceBlend: "Mmm Ah Puh... Map!", vowelSound: 'a' },
  { word: 'CAP', letters: ['C', 'A', 'P'], voiceBlend: "Cuh Ah Puh... Cap!", vowelSound: 'a' },
  { word: 'RAP', letters: ['R', 'A', 'P'], voiceBlend: "Rrr Ah Puh... Rap!", vowelSound: 'a' },
  { word: 'SAP', letters: ['S', 'A', 'P'], voiceBlend: "Sss Ah Puh... Sap!", vowelSound: 'a' },
  { word: 'NAP', letters: ['N', 'A', 'P'], voiceBlend: "Nnn Ah Puh... Nap!", vowelSound: 'a' },
  // Short-A family (-AM, -AB, -AN, -AG)
  { word: 'DAM', letters: ['D', 'A', 'M'], voiceBlend: "Duh Ah Mmm... Dam!", vowelSound: 'a' },
  { word: 'RAM', letters: ['R', 'A', 'M'], voiceBlend: "Rrr Ah Mmm... Ram!", vowelSound: 'a' },
  { word: 'CAB', letters: ['C', 'A', 'B'], voiceBlend: "Cuh Ah Buh... Cab!", vowelSound: 'a' },
  { word: 'TAB', letters: ['T', 'A', 'B'], voiceBlend: "Tuh Ah Buh... Tab!", vowelSound: 'a' },
  { word: 'MAN', letters: ['M', 'A', 'N'], voiceBlend: "Mmm Ah Nnn... Man!", vowelSound: 'a' },
  { word: 'PAN', letters: ['P', 'A', 'N'], voiceBlend: "Puh Ah Nnn... Pan!", vowelSound: 'a' },
  { word: 'RAN', letters: ['R', 'A', 'N'], voiceBlend: "Rrr Ah Nnn... Ran!", vowelSound: 'a' },
  { word: 'BAG', letters: ['B', 'A', 'G'], voiceBlend: "Buh Ah Guh... Bag!", vowelSound: 'a' },
  { word: 'TAG', letters: ['T', 'A', 'G'], voiceBlend: "Tuh Ah Guh... Tag!", vowelSound: 'a' },

  // Short-E family (-ED, -EN, -ET)
  { word: 'BED', letters: ['B', 'E', 'D'], voiceBlend: "Buh Eh Duh... Bed!", vowelSound: 'e' },
  { word: 'RED', letters: ['R', 'E', 'D'], voiceBlend: "Rrr Eh Duh... Red!", vowelSound: 'e' },
  { word: 'PEN', letters: ['P', 'E', 'N'], voiceBlend: "Puh Eh Nnn... Pen!", vowelSound: 'e' },
  { word: 'TEN', letters: ['T', 'E', 'N'], voiceBlend: "Tuh Eh Nnn... Ten!", vowelSound: 'e' },
  { word: 'HEN', letters: ['H', 'E', 'N'], voiceBlend: "Huh Eh Nnn... Hen!", vowelSound: 'e' },
  { word: 'MEN', letters: ['M', 'E', 'N'], voiceBlend: "Mmm Eh Nnn... Men!", vowelSound: 'e' },
  { word: 'MET', letters: ['M', 'E', 'T'], voiceBlend: "Mmm Eh Tuh... Met!", vowelSound: 'e' },
  { word: 'SET', letters: ['S', 'E', 'T'], voiceBlend: "Sss Eh Tuh... Set!", vowelSound: 'e' },
  { word: 'PET', letters: ['P', 'E', 'T'], voiceBlend: "Puh Eh Tuh... Pet!", vowelSound: 'e' },
  { word: 'NET', letters: ['N', 'E', 'T'], voiceBlend: "Nnn Eh Tuh... Net!", vowelSound: 'e' },
  { word: 'GET', letters: ['G', 'E', 'T'], voiceBlend: "Guh Eh Tuh... Get!", vowelSound: 'e' },

  // Short-I family (-IG, -IT, -IP, -IN)
  { word: 'BIG', letters: ['B', 'I', 'G'], voiceBlend: "Buh Ih Guh... Big!", vowelSound: 'i' },
  { word: 'DIG', letters: ['D', 'I', 'G'], voiceBlend: "Duh Ih Guh... Dig!", vowelSound: 'i' },
  { word: 'PIG', letters: ['P', 'I', 'G'], voiceBlend: "Puh Ih Guh... Pig!", vowelSound: 'i' },
  { word: 'SIT', letters: ['S', 'I', 'T'], voiceBlend: "Sss Ih Tuh... Sit!", vowelSound: 'i' },
  { word: 'HIT', letters: ['H', 'I', 'T'], voiceBlend: "Huh Ih Tuh... Hit!", vowelSound: 'i' },
  { word: 'BIT', letters: ['B', 'I', 'T'], voiceBlend: "Buh Ih Tuh... Bit!", vowelSound: 'i' },
  { word: 'TIP', letters: ['T', 'I', 'P'], voiceBlend: "Tuh Ih Puh... Tip!", vowelSound: 'i' },
  { word: 'RIP', letters: ['R', 'I', 'P'], voiceBlend: "Rrr Ih Puh... Rip!", vowelSound: 'i' },
  { word: 'HIP', letters: ['H', 'I', 'P'], voiceBlend: "Huh Ih Puh... Hip!", vowelSound: 'i' },
  { word: 'PIN', letters: ['P', 'I', 'N'], voiceBlend: "Puh Ih Nnn... Pin!", vowelSound: 'i' },
  { word: 'BIN', letters: ['B', 'I', 'N'], voiceBlend: "Buh Ih Nnn... Bin!", vowelSound: 'i' },
  { word: 'TIN', letters: ['T', 'I', 'N'], voiceBlend: "Tuh Ih Nnn... Tin!", vowelSound: 'i' },
];

// ---------------------------------------------------------------------------
// Rhyming word groups (same word families, for rhyme awareness mode)
// Research: Phonological awareness (#1 predictor of reading success)
// ---------------------------------------------------------------------------

export interface RhymeGroup {
  family: string;  // e.g., '-AT'
  words: string[];
}

export const rhymeGroups: RhymeGroup[] = [
  // Short-A
  { family: '-AT', words: ['CAT', 'BAT', 'SAT', 'MAT', 'RAT', 'PAT', 'FAT', 'HAT'] },
  { family: '-AD', words: ['DAD', 'BAD', 'SAD', 'MAD', 'RAD', 'PAD'] },
  { family: '-AP', words: ['TAP', 'MAP', 'CAP', 'RAP', 'SAP', 'NAP'] },
  { family: '-AM', words: ['DAM', 'RAM'] },
  { family: '-AB', words: ['CAB', 'TAB'] },
  { family: '-AN', words: ['MAN', 'PAN', 'RAN'] },
  { family: '-AG', words: ['BAG', 'TAG'] },
  // Short-E
  { family: '-ED', words: ['BED', 'RED'] },
  { family: '-EN', words: ['PEN', 'TEN', 'HEN', 'MEN'] },
  { family: '-ET', words: ['MET', 'SET', 'PET', 'NET', 'GET'] },
  // Short-I
  { family: '-IG', words: ['BIG', 'DIG', 'PIG'] },
  { family: '-IT', words: ['SIT', 'HIT', 'BIT'] },
  { family: '-IP', words: ['TIP', 'RIP', 'HIP'] },
  { family: '-IN', words: ['PIN', 'BIN', 'TIN'] },
];

// ---------------------------------------------------------------------------
// Sight words for Kian (high-frequency words)
// Research: Most common words in children's books
// ---------------------------------------------------------------------------

export const sightWords = [
  'THE', 'AND', 'IS', 'IT', 'IN', 'A', 'TO', 'I',
  'HE', 'GO', 'ME', 'MY', 'NO', 'UP', 'WE',
] as const;

// ---------------------------------------------------------------------------
// Centralised phonics data — expanded with new letters
// ---------------------------------------------------------------------------

export const PHONICS: Record<string, { sound: string; wrongSound: string; wordExample: string }> = {
  C: { sound: 'Cuh', wrongSound: 'Sss', wordExample: 'Charizard' },
  F: { sound: 'Fff', wrongSound: 'Buh', wordExample: 'Fire' },
  S: { sound: 'Sss', wrongSound: 'Fff', wordExample: 'Star' },
  B: { sound: 'Buh', wrongSound: 'Duh', wordExample: 'Blue' },
  M: { sound: 'Mmm', wrongSound: 'Nnn', wordExample: 'Mega' },
  P: { sound: 'Puh', wrongSound: 'Buh', wordExample: 'Pikachu' },
  T: { sound: 'Tuh', wrongSound: 'Duh', wordExample: 'Thunder' },
  R: { sound: 'Rrr', wrongSound: 'Lll', wordExample: 'Raichu' },
  D: { sound: 'Duh', wrongSound: 'Tuh', wordExample: 'Dragon' },
  A: { sound: 'Ahh', wrongSound: 'Ehh', wordExample: 'Ash' },
  // New letters
  E: { sound: 'Ehh', wrongSound: 'Ahh', wordExample: 'Eevee' },
  G: { sound: 'Guh', wrongSound: 'Kuh', wordExample: 'Gengar' },
  H: { sound: 'Huh', wrongSound: 'silent', wordExample: 'Ho-Oh' },
  I: { sound: 'Ihh', wrongSound: 'Ehh', wordExample: 'Ivysaur' },
  N: { sound: 'Nnn', wrongSound: 'Mmm', wordExample: 'Ninetales' },
  O: { sound: 'Ohh', wrongSound: 'Ahh', wordExample: 'Onix' },
};
