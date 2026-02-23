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
];

// Voice assets will be added to this manifest once TTS clips are generated.
// They follow the naming convention: /audio/voice/{category}/{name}.mp3
