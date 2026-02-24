// src/engine/systems/focus-weight.ts
// Weights game selection toward each kid's learning focus.
// Owen (little): colors → flame-colors weighted higher
// Kian (big): phonics → phonics-arena weighted higher
// Game 3 is always evolution-challenge.

import { session } from '../../state/session.svelte';
import type { GameName } from '../../state/types';

/** Owen-weighted pool: more color games */
const OWEN_POOL: GameName[] = [
  'flame-colors',
  'flame-colors',
  'fireball-count',
  'evolution-tower',
  'phonics-arena',
];

/** Kian-weighted pool: more phonics games */
const KIAN_POOL: GameName[] = [
  'phonics-arena',
  'phonics-arena',
  'fireball-count',
  'evolution-tower',
  'flame-colors',
];

/** Pick the next game based on session progress and current turn */
export function pickNextGame(gamesCompleted: number): GameName {
  // Game 3 (index 2) is always evolution-challenge
  if (gamesCompleted === 2) return 'evolution-challenge';

  const isOwen = session.currentTurn === 'owen';
  const pool = isOwen ? OWEN_POOL : KIAN_POOL;

  return pool[Math.floor(Math.random() * pool.length)];
}
