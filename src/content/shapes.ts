// src/content/shapes.ts
// Research: Shape recognition develops spatial reasoning skills
// Research: Shape properties (sides, corners) are key math vocabulary

export interface ShapeItem {
  name: string;
  voiceFile: string;
  introducedAfterRounds: number; // 0 = available from start
  sides: number;                 // 0 = round shape (circle, oval)
  canRoll: boolean;              // For properties questions
}

export interface ShapeDifficulty {
  choiceCount: number;
  availableShapes: string[]; // shape names available at this level
  sizeComparison: 'big-small' | 'small-medium-big';
}

export const shapes: ShapeItem[] = [
  { name: 'circle', voiceFile: 'shape-circle', introducedAfterRounds: 0, sides: 0, canRoll: true },
  { name: 'square', voiceFile: 'shape-square', introducedAfterRounds: 0, sides: 4, canRoll: false },
  { name: 'triangle', voiceFile: 'shape-triangle', introducedAfterRounds: 0, sides: 3, canRoll: false },
  { name: 'star', voiceFile: 'shape-star', introducedAfterRounds: 3, sides: 10, canRoll: false },
  { name: 'heart', voiceFile: 'shape-heart', introducedAfterRounds: 5, sides: 0, canRoll: false },
  { name: 'diamond', voiceFile: 'shape-diamond', introducedAfterRounds: 7, sides: 4, canRoll: false },
  { name: 'oval', voiceFile: 'shape-oval', introducedAfterRounds: 9, sides: 0, canRoll: true },
  { name: 'rectangle', voiceFile: 'shape-rectangle', introducedAfterRounds: 11, sides: 4, canRoll: false },
  { name: 'pentagon', voiceFile: 'shape-pentagon', introducedAfterRounds: 13, sides: 5, canRoll: false },
  { name: 'crescent', voiceFile: 'shape-crescent', introducedAfterRounds: 15, sides: 0, canRoll: false },
];

export const shapeDifficulty: Record<'little' | 'big', ShapeDifficulty> = {
  little: {
    choiceCount: 2,
    availableShapes: ['circle', 'square', 'triangle'],
    sizeComparison: 'big-small',
  },
  big: {
    choiceCount: 3,
    availableShapes: ['circle', 'square', 'triangle', 'star', 'diamond', 'heart', 'oval', 'rectangle', 'pentagon'],
    sizeComparison: 'small-medium-big',
  },
};

// ---------------------------------------------------------------------------
// Pattern Completion (teaches sequencing + logical thinking)
// ---------------------------------------------------------------------------

export interface ShapePattern {
  name: string;
  sequence: string[];  // shape names (4 items shown)
  answer: string;      // what comes next
  difficulty: 'easy' | 'medium' | 'hard';
}

export const shapePatterns: ShapePattern[] = [
  // ABAB — easy
  { name: 'ABAB', sequence: ['circle', 'square', 'circle', 'square'], answer: 'circle', difficulty: 'easy' },
  { name: 'ABAB', sequence: ['triangle', 'circle', 'triangle', 'circle'], answer: 'triangle', difficulty: 'easy' },
  { name: 'ABAB', sequence: ['star', 'triangle', 'star', 'triangle'], answer: 'star', difficulty: 'easy' },
  { name: 'ABAB', sequence: ['heart', 'circle', 'heart', 'circle'], answer: 'heart', difficulty: 'easy' },
  // AABB — medium
  { name: 'AABB', sequence: ['circle', 'circle', 'square', 'square'], answer: 'circle', difficulty: 'medium' },
  { name: 'AABB', sequence: ['triangle', 'triangle', 'star', 'star'], answer: 'triangle', difficulty: 'medium' },
  { name: 'AABB', sequence: ['heart', 'heart', 'diamond', 'diamond'], answer: 'heart', difficulty: 'medium' },
  // ABC — hard
  { name: 'ABC', sequence: ['circle', 'triangle', 'square', 'circle'], answer: 'triangle', difficulty: 'hard' },
  { name: 'ABC', sequence: ['square', 'star', 'circle', 'square'], answer: 'star', difficulty: 'hard' },
  { name: 'ABC', sequence: ['diamond', 'heart', 'triangle', 'diamond'], answer: 'heart', difficulty: 'hard' },
  { name: 'ABC', sequence: ['star', 'circle', 'diamond', 'star'], answer: 'circle', difficulty: 'hard' },
  // ABB — medium
  { name: 'ABB', sequence: ['circle', 'square', 'square', 'circle'], answer: 'square', difficulty: 'medium' },
  { name: 'ABB', sequence: ['triangle', 'star', 'star', 'triangle'], answer: 'star', difficulty: 'medium' },
];

// ---------------------------------------------------------------------------
// Shape-color combinations for compound challenges (Kian)
// ---------------------------------------------------------------------------

export interface ShapeColorCombo {
  shape: string;
  color: string;
  description: string;
}

export const shapeColorCombos: ShapeColorCombo[] = [
  { shape: 'circle', color: 'red', description: 'red circle' },
  { shape: 'circle', color: 'blue', description: 'blue circle' },
  { shape: 'square', color: 'yellow', description: 'yellow square' },
  { shape: 'square', color: 'green', description: 'green square' },
  { shape: 'triangle', color: 'orange', description: 'orange triangle' },
  { shape: 'triangle', color: 'purple', description: 'purple triangle' },
  { shape: 'star', color: 'red', description: 'red star' },
  { shape: 'star', color: 'yellow', description: 'yellow star' },
  { shape: 'heart', color: 'pink', description: 'pink heart' },
  { shape: 'heart', color: 'red', description: 'red heart' },
  { shape: 'diamond', color: 'blue', description: 'blue diamond' },
  { shape: 'diamond', color: 'purple', description: 'purple diamond' },
];

// ---------------------------------------------------------------------------
// Shape properties questions (Kian — "How many sides?")
// ---------------------------------------------------------------------------

export interface ShapePropertyQuestion {
  shape: string;
  question: string;
  answer: string;
  answerNumber?: number;
}

export const shapePropertyQuestions: ShapePropertyQuestion[] = [
  { shape: 'triangle', question: 'How many sides?', answer: '3', answerNumber: 3 },
  { shape: 'square', question: 'How many sides?', answer: '4', answerNumber: 4 },
  { shape: 'pentagon', question: 'How many sides?', answer: '5', answerNumber: 5 },
  { shape: 'circle', question: 'Can it roll?', answer: 'yes' },
  { shape: 'square', question: 'Can it roll?', answer: 'no' },
  { shape: 'triangle', question: 'How many corners?', answer: '3', answerNumber: 3 },
  { shape: 'rectangle', question: 'How many sides?', answer: '4', answerNumber: 4 },
];
