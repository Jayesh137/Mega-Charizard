// src/config/sprites.ts
// Sprite sheet configurations for animated Pokemon sprites.
// Frame dimensions are placeholders — update after converting GIFs to sprite sheets via ezgif.com

import type { SpriteConfig } from '../engine/entities/sprite-animator';

export const SPRITES: Record<string, SpriteConfig> = {
  charmander:          { src: './sprites/charmander.png',          frameWidth: 96, frameHeight: 96, frameCount: 28, fps: 12 },
  charmeleon:          { src: './sprites/charmeleon.png',          frameWidth: 96, frameHeight: 96, frameCount: 20, fps: 12 },
  charizard:           { src: './sprites/charizard.png',           frameWidth: 96, frameHeight: 96, frameCount: 30, fps: 12 },
  'charizard-megax':   { src: './sprites/charizard-megax.png',     frameWidth: 96, frameHeight: 96, frameCount: 40, fps: 12 },
};
