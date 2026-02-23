// src/config/manifest.ts

export interface AssetEntry {
  path: string;
  type: 'audio';
  priority: 'critical' | 'deferred';
}

// Asset manifest — only list files that actually exist on disk.
// When audio files are added to public/audio/, add entries here.
export const assetManifest: AssetEntry[] = [
  // Ash voice clips — critical (needed at session start)
  { path: '/audio/voice/ash-welcome.mp3', type: 'audio', priority: 'critical' },
  { path: '/audio/voice/ash-i-choose-you.mp3', type: 'audio', priority: 'critical' },
  { path: '/audio/voice/ash-owen-turn.mp3', type: 'audio', priority: 'critical' },
  { path: '/audio/voice/ash-kian-turn.mp3', type: 'audio', priority: 'critical' },
  { path: '/audio/voice/ash-team-turn.mp3', type: 'audio', priority: 'critical' },
  { path: '/audio/voice/ash-lets-go.mp3', type: 'audio', priority: 'critical' },
  { path: '/audio/voice/ash-ready.mp3', type: 'audio', priority: 'critical' },

  // Ash voice clips — deferred (loaded after session starts)
  { path: '/audio/voice/ash-great-job.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-awesome.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-alright.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-yeah.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-try-again.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-not-quite.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-amazing.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-power-gem.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-find-color.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-count-them.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-match-shape.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-trace-letter.mp3', type: 'audio', priority: 'deferred' },
];

// Voice key → file path mapping (used by AudioManager.registerDefaultVoices)
// These use Web Speech API fallback until actual TTS clips are generated.
export const voiceManifest = [
  'turn-owen', 'turn-kian', 'turn-team',
  'welcome-trainers', 'great-training',
  'color-red', 'color-blue', 'color-yellow',
  'color-green', 'color-orange', 'color-purple',
  'number-1', 'number-2', 'number-3',
  'number-4', 'number-5', 'number-6', 'number-7',
  // Ash Ketchum voice clips
  'ash-i-choose-you', 'ash-great-job', 'ash-awesome',
  'ash-alright', 'ash-yeah', 'ash-try-again', 'ash-not-quite',
  'ash-owen-turn', 'ash-kian-turn', 'ash-team-turn',
  'ash-power-gem', 'ash-find-color', 'ash-count-them',
  'ash-match-shape', 'ash-trace-letter',
  'ash-welcome', 'ash-amazing', 'ash-lets-go', 'ash-ready',
] as const;
