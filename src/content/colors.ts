// src/content/colors.ts

export interface ColorItem {
  name: string;
  hex: string;
  voiceFile: string;
}

export interface ColorDifficulty {
  targetCount: number;
  useSet: 'primary' | 'both';
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

export const allColors = [...primaryColors, ...extendedColors];

export const colorDifficulty: Record<'little' | 'big', ColorDifficulty> = {
  little: { targetCount: 2, useSet: 'primary', showHint: true, driftSpeed: 20 },
  big: { targetCount: 4, useSet: 'both', showHint: false, driftSpeed: 40 },
};
