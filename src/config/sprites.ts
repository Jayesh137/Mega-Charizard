// src/config/sprites.ts
// Sprite sheet configurations for animated Pokemon sprites.
// Converted from Pokemon Showdown GIFs via scripts/gif-to-spritesheet.mjs

import type { SpriteConfig } from '../engine/entities/sprite-animator';

export const SPRITES: Record<string, SpriteConfig> = {
  charmander:          { src: './sprites/charmander.png',          frameWidth: 48,  frameHeight: 57,  frameCount: 69, fps: 12 },
  charmeleon:          { src: './sprites/charmeleon.png',          frameWidth: 60,  frameHeight: 70,  frameCount: 59, fps: 12 },
  charizard:           { src: './sprites/charizard.png',           frameWidth: 133, frameHeight: 140, frameCount: 47, fps: 12 },
  'charizard-megax':   { src: './sprites/charizard-megax.png',     frameWidth: 161, frameHeight: 107, frameCount: 64, fps: 12 },
};
