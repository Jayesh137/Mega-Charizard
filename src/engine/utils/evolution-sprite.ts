// src/engine/utils/evolution-sprite.ts
// Helper to resolve the current evolution stage's sprite key and scale.

import { session } from '../../state/session.svelte';

/** Returns the SPRITES key for the current evolution stage */
export function evolutionSpriteKey(): string {
  return session.evolutionStage === 'megax' ? 'charizard-megax' : session.evolutionStage;
}

/** Returns the appropriate display scale for the current evolution stage */
export function evolutionSpriteScale(): number {
  switch (session.evolutionStage) {
    case 'charmander': return 2;
    case 'charmeleon': return 2.5;
    case 'charizard': return 3;
    case 'megax': return 3;
    default: return 3;
  }
}
