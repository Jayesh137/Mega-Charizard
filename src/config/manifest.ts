// src/config/manifest.ts

export interface AssetEntry {
  path: string;
  type: 'audio';
  priority: 'critical' | 'deferred';
}

// Critical assets load before the opening sequence.
// Deferred assets load in the background during the opening.
export const assetManifest: AssetEntry[] = [
  // Critical — needed for opening sequence
  { path: '/audio/sfx/roar-small.wav', type: 'audio', priority: 'critical' },
  { path: '/audio/sfx/roar-medium.wav', type: 'audio', priority: 'critical' },
  { path: '/audio/sfx/roar-mega.wav', type: 'audio', priority: 'critical' },
  { path: '/audio/sfx/fire-breath.wav', type: 'audio', priority: 'critical' },

  // Deferred — loaded during opening
  { path: '/audio/sfx/fireball-impact.wav', type: 'audio', priority: 'deferred' },
  { path: '/audio/sfx/correct-chime.wav', type: 'audio', priority: 'deferred' },
  { path: '/audio/sfx/wrong-bonk.wav', type: 'audio', priority: 'deferred' },
  { path: '/audio/sfx/whoosh.wav', type: 'audio', priority: 'deferred' },
  { path: '/audio/sfx/team-fanfare.wav', type: 'audio', priority: 'deferred' },
  { path: '/audio/sfx/orb-select.wav', type: 'audio', priority: 'deferred' },
  { path: '/audio/sfx/flame-crackle.wav', type: 'audio', priority: 'deferred' },

  // Voice prompts (TTS clips to be generated — placeholder entries)
  { path: '/audio/voice/turn-owen.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/turn-kian.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/turn-team.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/welcome-trainers.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/great-training.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/color-red.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/color-blue.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/color-yellow.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/number-1.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/number-2.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/number-3.mp3', type: 'audio', priority: 'deferred' },
];
