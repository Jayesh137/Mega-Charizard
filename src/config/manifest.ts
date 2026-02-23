// src/config/manifest.ts

export interface AssetEntry {
  path: string;
  type: 'audio';
  priority: 'critical' | 'deferred';
}

// Asset manifest — only list files that actually exist on disk.
// When audio files are added to public/audio/, add entries here.
export const assetManifest: AssetEntry[] = [];

// Voice key → file path mapping (used by AudioManager.registerDefaultVoices)
// These use Web Speech API fallback until actual TTS clips are generated.
export const voiceManifest = [
  'turn-owen', 'turn-kian', 'turn-team',
  'welcome-trainers', 'great-training',
  'color-red', 'color-blue', 'color-yellow',
  'color-green', 'color-orange', 'color-purple',
  'number-1', 'number-2', 'number-3',
  'number-4', 'number-5', 'number-6', 'number-7',
] as const;
