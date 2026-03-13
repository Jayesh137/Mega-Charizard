// src/content/colors.ts
// Research: Color sorting/categorization builds cognitive foundations (Busy Toddler, 2024)
// Research: Real-world associations strengthen color concept mapping (Teaching 2&3 Year Olds)
// Research: Color mixing from primary → secondary develops scientific thinking

export interface ColorItem {
  name: string;
  hex: string;
  voiceFile: string;
}

export interface ColorDifficulty {
  targetCount: number;
  useSet: 'primary' | 'both' | 'all';
  showHint: boolean;
  driftSpeed: number; // pixels per second in design space
}

export const primaryColors: ColorItem[] = [
  { name: 'red', hex: '#ff3333', voiceFile: 'color-red' },
  { name: 'blue', hex: '#3377ff', voiceFile: 'color-blue' },
  { name: 'yellow', hex: '#ffdd00', voiceFile: 'color-yellow' },
];

export const extendedColors: ColorItem[] = [
  { name: 'green', hex: '#33cc33', voiceFile: 'color-green' },
  { name: 'orange', hex: '#ff8833', voiceFile: 'color-orange' },
  { name: 'purple', hex: '#9933ff', voiceFile: 'color-purple' },
];

export const advancedColors: ColorItem[] = [
  { name: 'pink', hex: '#FF69B4', voiceFile: 'color-pink' },
  { name: 'brown', hex: '#8B6914', voiceFile: 'color-brown' },
  { name: 'white', hex: '#FFFFFF', voiceFile: 'color-white' },
  { name: 'black', hex: '#333333', voiceFile: 'color-black' },
];

export const allColors = [...primaryColors, ...extendedColors];
export const allColorsExpanded = [...primaryColors, ...extendedColors, ...advancedColors];

export const colorDifficulty: Record<'little' | 'big', ColorDifficulty> = {
  little: { targetCount: 2, useSet: 'primary', showHint: true, driftSpeed: 20 },
  big: { targetCount: 4, useSet: 'both', showHint: false, driftSpeed: 40 },
};

// ---------------------------------------------------------------------------
// Color mixing pairs (primary → secondary discovery)
// ---------------------------------------------------------------------------

export interface ColorMixPair {
  a: string;       // first primary color name
  b: string;       // second primary color name
  result: string;  // resulting secondary color name
}

export const colorMixing: ColorMixPair[] = [
  { a: 'blue', b: 'yellow', result: 'green' },
  { a: 'red', b: 'yellow', result: 'orange' },
  { a: 'red', b: 'blue', result: 'purple' },
  { a: 'red', b: 'white', result: 'pink' },
];

// ---------------------------------------------------------------------------
// Color shades (light / dark variants for shade matching)
// ---------------------------------------------------------------------------

export interface ColorShade {
  light: string;  // hex
  dark: string;   // hex
}

export const colorShades: Record<string, ColorShade> = {
  red:    { light: '#ff6666', dark: '#cc0000' },
  blue:   { light: '#6699ff', dark: '#0033cc' },
  yellow: { light: '#ffff66', dark: '#ccaa00' },
  green:  { light: '#66ff66', dark: '#009900' },
  orange: { light: '#ffaa66', dark: '#cc6600' },
  purple: { light: '#cc66ff', dark: '#6600cc' },
  pink:   { light: '#FFB6C1', dark: '#FF1493' },
  brown:  { light: '#D2A679', dark: '#5C3317' },
};

// ---------------------------------------------------------------------------
// Color patterns (what-comes-next sequences)
// ---------------------------------------------------------------------------

export interface ColorPattern {
  sequence: string[];  // color names (4 shown + answer is next)
  answer: string;      // correct next color
  difficulty: 'easy' | 'medium' | 'hard';
}

export const colorPatterns: ColorPattern[] = [
  // ABAB patterns (both kids) — easy
  { sequence: ['red', 'blue', 'red', 'blue'], answer: 'red', difficulty: 'easy' },
  { sequence: ['yellow', 'red', 'yellow', 'red'], answer: 'yellow', difficulty: 'easy' },
  { sequence: ['blue', 'yellow', 'blue', 'yellow'], answer: 'blue', difficulty: 'easy' },
  { sequence: ['red', 'yellow', 'red', 'yellow'], answer: 'red', difficulty: 'easy' },
  { sequence: ['blue', 'red', 'blue', 'red'], answer: 'blue', difficulty: 'easy' },
  // AABB patterns (both kids) — medium
  { sequence: ['red', 'red', 'blue', 'blue'], answer: 'red', difficulty: 'medium' },
  { sequence: ['yellow', 'yellow', 'red', 'red'], answer: 'yellow', difficulty: 'medium' },
  { sequence: ['blue', 'blue', 'yellow', 'yellow'], answer: 'blue', difficulty: 'medium' },
  { sequence: ['green', 'green', 'orange', 'orange'], answer: 'green', difficulty: 'medium' },
  // ABC patterns (Kian only) — hard
  { sequence: ['red', 'blue', 'yellow', 'red'], answer: 'blue', difficulty: 'hard' },
  { sequence: ['blue', 'green', 'orange', 'blue'], answer: 'green', difficulty: 'hard' },
  { sequence: ['purple', 'red', 'yellow', 'purple'], answer: 'red', difficulty: 'hard' },
  { sequence: ['orange', 'blue', 'red', 'orange'], answer: 'blue', difficulty: 'hard' },
  // ABCA patterns (Kian challenge) — hard
  { sequence: ['red', 'blue', 'yellow', 'red'], answer: 'blue', difficulty: 'hard' },
  { sequence: ['green', 'purple', 'orange', 'green'], answer: 'purple', difficulty: 'hard' },
];

// ---------------------------------------------------------------------------
// Real-world color associations (research: concrete anchoring)
// ---------------------------------------------------------------------------

export interface ColorObject {
  name: string;       // object name
  color: string;      // color name
  emoji: string;      // for display (rendered as canvas icon)
}

export const colorObjects: ColorObject[] = [
  // Red objects
  { name: 'apple', color: 'red', emoji: 'apple' },
  { name: 'fire truck', color: 'red', emoji: 'truck' },
  { name: 'strawberry', color: 'red', emoji: 'berry' },
  // Blue objects
  { name: 'sky', color: 'blue', emoji: 'sky' },
  { name: 'ocean', color: 'blue', emoji: 'wave' },
  { name: 'blueberry', color: 'blue', emoji: 'berry' },
  // Yellow objects
  { name: 'banana', color: 'yellow', emoji: 'banana' },
  { name: 'sun', color: 'yellow', emoji: 'sun' },
  { name: 'Pikachu', color: 'yellow', emoji: 'pikachu' },
  // Green objects
  { name: 'grass', color: 'green', emoji: 'grass' },
  { name: 'frog', color: 'green', emoji: 'frog' },
  { name: 'Bulbasaur', color: 'green', emoji: 'bulbasaur' },
  // Orange objects
  { name: 'orange', color: 'orange', emoji: 'orange' },
  { name: 'Charmander', color: 'orange', emoji: 'charmander' },
  { name: 'carrot', color: 'orange', emoji: 'carrot' },
  // Purple objects
  { name: 'grapes', color: 'purple', emoji: 'grapes' },
  { name: 'Gengar', color: 'purple', emoji: 'gengar' },
  // Pink objects
  { name: 'flamingo', color: 'pink', emoji: 'flamingo' },
  { name: 'Jigglypuff', color: 'pink', emoji: 'jigglypuff' },
  // Brown objects
  { name: 'chocolate', color: 'brown', emoji: 'chocolate' },
  { name: 'Eevee', color: 'brown', emoji: 'eevee' },
];

// ---------------------------------------------------------------------------
// Color families for sorting (warm vs cool)
// ---------------------------------------------------------------------------

export const colorFamilies = {
  warm: ['red', 'orange', 'yellow', 'pink'],
  cool: ['blue', 'green', 'purple'],
  neutral: ['brown', 'white', 'black'],
} as const;

// ---------------------------------------------------------------------------
// Color memory pairs (for Memory Match game)
// ---------------------------------------------------------------------------

export interface MemoryPair {
  id: string;
  color: string;
  hex: string;
}

export const colorMemoryPairs: MemoryPair[] = [
  { id: 'mem-red', color: 'red', hex: '#ff3333' },
  { id: 'mem-blue', color: 'blue', hex: '#3377ff' },
  { id: 'mem-yellow', color: 'yellow', hex: '#ffdd00' },
  { id: 'mem-green', color: 'green', hex: '#33cc33' },
  { id: 'mem-orange', color: 'orange', hex: '#ff8833' },
  { id: 'mem-purple', color: 'purple', hex: '#9933ff' },
  { id: 'mem-pink', color: 'pink', hex: '#FF69B4' },
  { id: 'mem-brown', color: 'brown', hex: '#8B6914' },
];

// ---------------------------------------------------------------------------
// Color words for Kian spelling mode
// ---------------------------------------------------------------------------

export const colorWords = ['RED', 'BLUE', 'GREEN', 'PINK'] as const;
