// src/content/shapes.ts

export interface ShapeItem {
  name: string;
  voiceFile: string;
  introducedAfterRounds: number; // 0 = available from start
}

export interface ShapeDifficulty {
  choiceCount: number;
  availableShapes: string[]; // shape names available at this level
  sizeComparison: 'big-small' | 'small-medium-big';
}

export const shapes: ShapeItem[] = [
  { name: 'circle', voiceFile: 'shape-circle', introducedAfterRounds: 0 },
  { name: 'square', voiceFile: 'shape-square', introducedAfterRounds: 0 },
  { name: 'triangle', voiceFile: 'shape-triangle', introducedAfterRounds: 0 },
  { name: 'star', voiceFile: 'shape-star', introducedAfterRounds: 3 },
  { name: 'heart', voiceFile: 'shape-heart', introducedAfterRounds: 5 },
  { name: 'diamond', voiceFile: 'shape-diamond', introducedAfterRounds: 7 },
  { name: 'oval', voiceFile: 'shape-oval', introducedAfterRounds: 9 },
];

export const shapeDifficulty: Record<'little' | 'big', ShapeDifficulty> = {
  little: {
    choiceCount: 2,
    availableShapes: ['circle', 'square', 'triangle'],
    sizeComparison: 'big-small',
  },
  big: {
    choiceCount: 3,
    availableShapes: ['circle', 'square', 'triangle', 'star', 'diamond', 'heart', 'oval'],
    sizeComparison: 'small-medium-big',
  },
};

// ---------------------------------------------------------------------------
// Pattern Completion (Kian only — teaches sequencing + logical thinking)
// ---------------------------------------------------------------------------

export interface ShapePattern {
  name: string;
  sequence: string[];  // shape names (4 items shown)
  answer: string;      // what comes next
}

export const shapePatterns: ShapePattern[] = [
  { name: 'ABAB', sequence: ['circle', 'square', 'circle', 'square'], answer: 'circle' },
  { name: 'ABAB', sequence: ['triangle', 'circle', 'triangle', 'circle'], answer: 'triangle' },
  { name: 'ABAB', sequence: ['star', 'triangle', 'star', 'triangle'], answer: 'star' },
  { name: 'AABB', sequence: ['circle', 'circle', 'square', 'square'], answer: 'circle' },
  { name: 'AABB', sequence: ['triangle', 'triangle', 'star', 'star'], answer: 'triangle' },
  { name: 'ABC', sequence: ['circle', 'triangle', 'square', 'circle'], answer: 'triangle' },
  { name: 'ABC', sequence: ['square', 'star', 'circle', 'square'], answer: 'star' },
];
