# Mega Charizard Academy — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Svelte 5 + Vite educational game where Mega Charizard X teaches Owen (2.5) and Kian (4) colors, counting, shapes, and letters through fire-powered mini-challenges on a TV.

**Architecture:** Two-layer model — HTML5 Canvas game engine (rAF loop at 60fps) for Charizard, particles, and backgrounds; Svelte 5 DOM overlay for UI (banners, prompts, settings). Engine and Svelte communicate via typed EventEmitter. State lives in Svelte rune stores.

**Tech Stack:** Svelte 5 (Runes), Vite 6, TypeScript, HTML5 Canvas 2D, Web Audio API. Zero runtime dependencies.

**Environment:** Ubuntu WSL terminal. GitHub repo: https://github.com/Jayesh137/Mega-Charizard

**Reference docs:**
- `PRD.md` — requirements
- `architecture.md` — technical architecture
- `docs/plans/2026-02-23-mega-charizard-academy-design.md` — full design spec
- `docs/plans/ui-ux-visual-design-research.md` — UI/UX visual design research

---

## Phase 1: Project Scaffold & Foundation

### Task 1: Scaffold Vite + Svelte 5 + TypeScript Project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `svelte.config.js`, `index.html`
- Create: `src/main.ts`, `src/App.svelte`, `src/app.css`
- Create: `src/vite-env.d.ts`

**Step 1: Initialize the project**

```bash
cd "/mnt/c/Users/jayes/Documents/Mega Charizard"
npm create vite@latest . -- --template svelte-ts
```

If prompted about existing files, select to proceed (scaffolding will not overwrite docs/).

**Step 2: Install dependencies**

```bash
npm install
```

**Step 3: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts at http://localhost:5173. Open in browser, see default Svelte app.

**Step 4: Clean scaffolded defaults**

Remove default Svelte counter app content. Replace `src/App.svelte` with a minimal shell:

```svelte
<script lang="ts">
</script>

<div class="game-container">
  <p>Mega Charizard Academy</p>
</div>

<style>
  .game-container {
    width: 100vw;
    height: 100vh;
    background: #0a0a1a;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
</style>
```

Replace `src/app.css` with global reset:

```css
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0a0a1a;
  font-family: system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

Remove any leftover default files (`src/lib/Counter.svelte`, default assets, etc.).

**Step 5: Update vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  base: './',
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
```

**Step 6: Create public audio directory structure**

```bash
mkdir -p public/audio/{sfx,music,voice/{prompts,feedback,turns,instructions}}
```

**Step 7: Add .gitignore entries**

Ensure `node_modules/` and `dist/` are in `.gitignore` (Vite scaffold should handle this).

**Step 8: Verify clean state**

```bash
npm run dev
```

Expected: Dark blue-black screen with "Mega Charizard Academy" centered. No errors in console.

**Step 9: Commit**

```bash
git add -A && git commit -m "feat: scaffold Vite + Svelte 5 + TypeScript project"
```

---

### Task 2: Config Layer — Constants, Theme, and Manifest

**Files:**
- Create: `src/config/constants.ts`
- Create: `src/config/theme.ts`
- Create: `src/config/manifest.ts`

**Step 1: Create constants.ts**

All tunable numbers in one file. Reference: `architecture.md` §6.3 (canvas scaling), design doc §10 (performance budgets), UI/UX research §8 (element sizing).

```typescript
// src/config/constants.ts

// Canvas
export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;
export const MAX_DPR = 2;

// TV Safe Area (5% margin for overscan)
export const SAFE_AREA = {
  left: 0.05,
  right: 0.95,
  top: 0.05,
  bottom: 0.95,
} as const;

// Performance
export const TARGET_FPS = 60;
export const MAX_PARTICLES = 300;
export const FPS_THRESHOLD_MEDIUM = 55; // Below this: reduce particles 50%
export const FPS_THRESHOLD_LOW = 40;    // Below this: reduce particles 75%
export const MAX_FRAME_DT = 0.05;       // Cap delta-time at 50ms

// Timing (seconds)
export const BANNER_SLIDE_IN = 0.4;
export const BANNER_HOLD = 1.5;
export const BANNER_SLIDE_OUT = 0.3;
export const TRANSITION_DURATION = 0.8;
export const FREEZE_FRAME_DURATION = 0.1;
export const CALM_RESET_DURATION = { calm: 10, normal: 7, hype: 5 } as const;
export const CALM_RESET_EXTEND_INCREMENT = 3;
export const PROMPT_TIMEOUT = 5;       // Seconds before Charizard models the answer
export const FAILSAFE_HINT_1 = 1;     // After 1 miss: gentle bounce
export const FAILSAFE_HINT_2 = 2;     // After 2 misses: glow + bounce
export const FAILSAFE_AUTO = 3;       // After 3 misses: auto-complete

// Element Sizes (in 1920x1080 design space)
export const HUB_ORB_DIAMETER = 240;
export const HUB_ORB_SPACING = 120;
export const TARGET_SIZE = 200;
export const STAR_DOT_DIAMETER = 65;
export const STAR_GLOW_RADIUS = 30;
export const CHARIZARD_HUB_SCALE = 0.72; // 72% of screen height

// Session
export const ACTIVITIES_PER_SESSION = 6;
export const PROMPTS_PER_ROUND = { flameColors: 5, fireballCount: 5, evolutionTower: 5, skyWriter: 4 } as const;

// Font sizes (px at 1080p)
export const FONT = {
  title: 96,
  bannerName: 72,
  bannerRole: 40,
  numberPrompt: 180,
  subtitle: 52,
  settingsText: 28,
} as const;
```

**Step 2: Create theme.ts**

Reference: `architecture.md` §4.2, design doc §9 (theming layer), UI/UX research §3 (Night Sky Warmth palette), §7 (dark theme rules).

```typescript
// src/config/theme.ts

export interface CharacterForm {
  name: string;
  colors: Record<string, string>;
  scale: number;
  eyeStyle: 'cute-round' | 'fierce-narrow' | 'determined' | 'glowing-red';
}

export interface Theme {
  name: string;
  title: string;
  characterName: string;
  forms: CharacterForm[];
  palette: {
    background: { dark: string; mid: string; accent: string; warmGlow: string };
    fire: { core: string; mid: string; outer: string; spark: string };
    ui: {
      bannerOrange: string;
      bannerBlue: string;
      bannerGold: string;
      correct: string;
      incorrect: string;
    };
    celebration: { gold: string; hotOrange: string; cyan: string };
  };
  audio: Record<string, string>;
}

export const theme: Theme = {
  name: 'mega-charizard-x',
  title: 'Mega Charizard Academy',
  characterName: 'Charizard',

  forms: [
    {
      name: 'Charmander',
      colors: { body: '#F08030', belly: '#FCF0DE', flame: '#F15F3E' },
      scale: 0.3,
      eyeStyle: 'cute-round',
    },
    {
      name: 'Charmeleon',
      colors: { body: '#D45137', belly: '#905C42', flame: '#FF6B35' },
      scale: 0.45,
      eyeStyle: 'fierce-narrow',
    },
    {
      name: 'Charizard',
      colors: { body: '#F08030', belly: '#FCC499', wings: '#58A8B8', flame: '#FF4500' },
      scale: 0.65,
      eyeStyle: 'determined',
    },
    {
      name: 'Mega Charizard X',
      colors: {
        body: '#1a1a2e',
        belly: '#91CCEC',
        flames: '#37B1E2',
        eyes: '#ff1a1a',
        hornTips: '#37B1E2',
        wingEdge: '#37B1E2',
      },
      scale: 1.0,
      eyeStyle: 'glowing-red',
    },
  ],

  palette: {
    background: {
      dark: '#0a0a1a',
      mid: '#1a1a3e',
      accent: '#2a1a4e',
      warmGlow: '#F08030',
    },
    fire: { core: '#FFFFFF', mid: '#37B1E2', outer: '#1a5fc4', spark: '#91CCEC' },
    ui: {
      bannerOrange: '#F08030',
      bannerBlue: '#1a3a6e',
      bannerGold: '#FFD700',
      correct: '#33cc33',
      incorrect: '#ff6666',
    },
    celebration: { gold: '#FFD700', hotOrange: '#FF6B35', cyan: '#91CCEC' },
  },

  audio: {
    roarSmall: '/audio/sfx/roar-small.wav',
    roarMedium: '/audio/sfx/roar-medium.wav',
    roarMega: '/audio/sfx/roar-mega.wav',
    fireBreath: '/audio/sfx/fire-breath.wav',
    fireballImpact: '/audio/sfx/fireball-impact.wav',
    flameCrackle: '/audio/sfx/flame-crackle.wav',
    correctChime: '/audio/sfx/correct-chime.wav',
    wrongBonk: '/audio/sfx/wrong-bonk.wav',
    whoosh: '/audio/sfx/whoosh.wav',
    teamFanfare: '/audio/sfx/team-fanfare.wav',
    orbSelect: '/audio/sfx/orb-select.wav',
  },
};
```

**Step 3: Create manifest.ts**

```typescript
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
```

**Step 4: Verify TypeScript compiles**

```bash
npx svelte-check
```

Expected: No errors.

**Step 5: Commit**

```bash
git add src/config/ && git commit -m "feat: add config layer (constants, theme, manifest)"
```

---

### Task 3: Educational Content Data Layer

**Files:**
- Create: `src/content/colors.ts`
- Create: `src/content/counting.ts`
- Create: `src/content/shapes.ts`
- Create: `src/content/letters.ts`

**Step 1: Create colors.ts**

Reference: design doc §5.2, PRD R3.

```typescript
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
```

**Step 2: Create counting.ts**

Reference: design doc §5.3, PRD R4.

```typescript
// src/content/counting.ts

export interface CountingDifficulty {
  minNumber: number;
  maxNumber: number;
  pillarsMatchCount: boolean; // true = exact pillars, false = more pillars than needed
}

export const countingDifficulty: Record<'little' | 'big', CountingDifficulty> = {
  little: { minNumber: 1, maxNumber: 3, pillarsMatchCount: true },
  big: { minNumber: 1, maxNumber: 7, pillarsMatchCount: false },
};

// Voice file: `number-${n}` maps to /audio/voice/prompts/number-1.mp3, etc.
export function getNumberVoiceFile(n: number): string {
  return `number-${n}`;
}
```

**Step 3: Create shapes.ts**

Reference: design doc §5.4, PRD R5.

```typescript
// src/content/shapes.ts

export interface ShapeItem {
  name: string;
  voiceFile: string;
  introducedAfterRounds: number; // 0 = available from start
}

export interface ShapeDifficulty {
  choiceCount: number;
  availableShapes: string[]; // shape names available at this level
  sizeComparison: 'big-small' | 'small-medium-big';
}

export const shapes: ShapeItem[] = [
  { name: 'circle', voiceFile: 'shape-circle', introducedAfterRounds: 0 },
  { name: 'square', voiceFile: 'shape-square', introducedAfterRounds: 0 },
  { name: 'triangle', voiceFile: 'shape-triangle', introducedAfterRounds: 0 },
  { name: 'star', voiceFile: 'shape-star', introducedAfterRounds: 3 },
  { name: 'heart', voiceFile: 'shape-heart', introducedAfterRounds: 5 },
  { name: 'diamond', voiceFile: 'shape-diamond', introducedAfterRounds: 7 },
  { name: 'oval', voiceFile: 'shape-oval', introducedAfterRounds: 9 },
];

export const shapeDifficulty: Record<'little' | 'big', ShapeDifficulty> = {
  little: {
    choiceCount: 2,
    availableShapes: ['circle', 'square', 'triangle'],
    sizeComparison: 'big-small',
  },
  big: {
    choiceCount: 3,
    availableShapes: ['circle', 'square', 'triangle', 'star', 'diamond', 'heart', 'oval'],
    sizeComparison: 'small-medium-big',
  },
};
```

**Step 4: Create letters.ts**

Reference: design doc §5.5, PRD R6.

```typescript
// src/content/letters.ts

export interface LetterItem {
  letter: string;
  word: string;
  phonicsSound: string;
  icon: string; // key into icon drawing registry
  voiceFile: string;
  starCount: { little: number; big: number };
}

export interface LetterDifficulty {
  includePhonics: boolean;
  includeFirstLetterMatch: boolean;
  autoAdvanceNearClick: boolean; // forgiving click zones for younger kids
}

export const starterLetters: LetterItem[] = [
  { letter: 'C', word: 'Charizard', phonicsSound: 'ch', icon: 'character', voiceFile: 'letter-c', starCount: { little: 2, big: 5 } },
  { letter: 'F', word: 'Fire', phonicsSound: 'ff', icon: 'flame', voiceFile: 'letter-f', starCount: { little: 2, big: 4 } },
  { letter: 'S', word: 'Star', phonicsSound: 'ss', icon: 'star', voiceFile: 'letter-s', starCount: { little: 3, big: 5 } },
  { letter: 'B', word: 'Blue', phonicsSound: 'bb', icon: 'colorBlob', voiceFile: 'letter-b', starCount: { little: 2, big: 4 } },
];

export const letterDifficulty: Record<'little' | 'big', LetterDifficulty> = {
  little: { includePhonics: false, includeFirstLetterMatch: false, autoAdvanceNearClick: true },
  big: { includePhonics: true, includeFirstLetterMatch: true, autoAdvanceNearClick: false },
};
```

**Step 5: Verify TypeScript compiles**

```bash
npx svelte-check
```

Expected: No errors.

**Step 6: Commit**

```bash
git add src/content/ && git commit -m "feat: add educational content data (colors, counting, shapes, letters)"
```

---

### Task 4: State Stores — Settings + Session

**Files:**
- Create: `src/state/types.ts`
- Create: `src/state/settings.svelte.ts`
- Create: `src/state/session.svelte.ts`

**Step 1: Create types.ts**

Reference: `architecture.md` §5.

```typescript
// src/state/types.ts

export type Intensity = 'calm' | 'normal' | 'hype';
export type TurnType = 'owen' | 'kian' | 'team';
export type ScreenName = 'loading' | 'opening' | 'hub' | 'game' | 'calm-reset' | 'finale';
export type GameName = 'flame-colors' | 'fireball-count' | 'evolution-tower' | 'sky-writer';
```

**Step 2: Create settings.svelte.ts**

```typescript
// src/state/settings.svelte.ts
import type { Intensity } from './types';

const STORAGE_KEY = 'mca-settings';

interface PersistedSettings {
  littleTrainerName: string;
  bigTrainerName: string;
  intensity: Intensity;
  silentMode: boolean;
  showSubtitles: boolean;
  isFirstVisit: boolean;
  shapesUnlocked: string[];
  roundsCompleted: number;
}

function loadFromStorage(): PersistedSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {
    littleTrainerName: 'Owen',
    bigTrainerName: 'Kian',
    intensity: 'normal',
    silentMode: false,
    showSubtitles: false,
    isFirstVisit: true,
    shapesUnlocked: ['circle', 'square', 'triangle'],
    roundsCompleted: 0,
  };
}

function createSettings() {
  const initial = loadFromStorage();

  let littleTrainerName = $state(initial.littleTrainerName);
  let bigTrainerName = $state(initial.bigTrainerName);
  let intensity = $state<Intensity>(initial.intensity);
  let silentMode = $state(initial.silentMode);
  let showSubtitles = $state(initial.showSubtitles);
  let isFirstVisit = $state(initial.isFirstVisit);
  let shapesUnlocked = $state(initial.shapesUnlocked);
  let roundsCompleted = $state(initial.roundsCompleted);

  function persist() {
    const data: PersistedSettings = {
      littleTrainerName, bigTrainerName, intensity,
      silentMode, showSubtitles, isFirstVisit,
      shapesUnlocked, roundsCompleted,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  return {
    get littleTrainerName() { return littleTrainerName; },
    set littleTrainerName(v: string) { littleTrainerName = v; persist(); },
    get bigTrainerName() { return bigTrainerName; },
    set bigTrainerName(v: string) { bigTrainerName = v; persist(); },
    get intensity() { return intensity; },
    set intensity(v: Intensity) { intensity = v; persist(); },
    get silentMode() { return silentMode; },
    set silentMode(v: boolean) { silentMode = v; persist(); },
    get showSubtitles() { return showSubtitles; },
    set showSubtitles(v: boolean) { showSubtitles = v; persist(); },
    get isFirstVisit() { return isFirstVisit; },
    set isFirstVisit(v: boolean) { isFirstVisit = v; persist(); },
    get shapesUnlocked() { return shapesUnlocked; },
    set shapesUnlocked(v: string[]) { shapesUnlocked = v; persist(); },
    get roundsCompleted() { return roundsCompleted; },
    set roundsCompleted(v: number) { roundsCompleted = v; persist(); },
  };
}

export const settings = createSettings();
```

**Step 3: Create session.svelte.ts**

```typescript
// src/state/session.svelte.ts
import type { TurnType, ScreenName, GameName } from './types';

function createSession() {
  let currentScreen = $state<ScreenName>('loading');
  let currentTurn = $state<TurnType>('owen');
  let turnOverride = $state<TurnType | null>(null);
  let turnsCompleted = $state(0);
  let currentGame = $state<GameName | null>(null);
  let roundNumber = $state(0);
  let promptIndex = $state(0);
  let missCount = $state(0);
  let activitiesCompleted = $state(0);
  let resetExtended = $state(false);
  let currentFps = $state(60);
  let audioUnlocked = $state(false);
  let assetsLoaded = $state(false);

  function reset() {
    currentScreen = 'loading';
    currentTurn = 'owen';
    turnOverride = null;
    turnsCompleted = 0;
    currentGame = null;
    roundNumber = 0;
    promptIndex = 0;
    missCount = 0;
    activitiesCompleted = 0;
    resetExtended = false;
  }

  function nextTurn(): TurnType {
    if (turnOverride) {
      const override = turnOverride;
      turnOverride = null;
      return override;
    }
    turnsCompleted++;
    return turnsCompleted % 2 === 1 ? 'owen' : 'kian';
  }

  return {
    get currentScreen() { return currentScreen; },
    set currentScreen(v: ScreenName) { currentScreen = v; },
    get currentTurn() { return currentTurn; },
    set currentTurn(v: TurnType) { currentTurn = v; },
    get turnOverride() { return turnOverride; },
    set turnOverride(v: TurnType | null) { turnOverride = v; },
    get turnsCompleted() { return turnsCompleted; },
    get currentGame() { return currentGame; },
    set currentGame(v: GameName | null) { currentGame = v; },
    get roundNumber() { return roundNumber; },
    set roundNumber(v: number) { roundNumber = v; },
    get promptIndex() { return promptIndex; },
    set promptIndex(v: number) { promptIndex = v; },
    get missCount() { return missCount; },
    set missCount(v: number) { missCount = v; },
    get activitiesCompleted() { return activitiesCompleted; },
    set activitiesCompleted(v: number) { activitiesCompleted = v; },
    get resetExtended() { return resetExtended; },
    set resetExtended(v: boolean) { resetExtended = v; },
    get currentFps() { return currentFps; },
    set currentFps(v: number) { currentFps = v; },
    get audioUnlocked() { return audioUnlocked; },
    set audioUnlocked(v: boolean) { audioUnlocked = v; },
    get assetsLoaded() { return assetsLoaded; },
    set assetsLoaded(v: boolean) { assetsLoaded = v; },
    nextTurn,
    reset,
  };
}

export const session = createSession();
```

**Step 4: Verify TypeScript compiles**

```bash
npx svelte-check
```

**Step 5: Commit**

```bash
git add src/state/ && git commit -m "feat: add state stores (settings + session) with localStorage persistence"
```

---

### Task 5: Engine Foundation — Game Loop, Canvas Utils, Event Emitter, Screen Manager

**Files:**
- Create: `src/engine/events.ts`
- Create: `src/engine/utils/math.ts`
- Create: `src/engine/utils/tween.ts`
- Create: `src/engine/utils/canvas.ts`
- Create: `src/engine/game-loop.ts`
- Create: `src/engine/screen-manager.ts`

**Step 1: Create events.ts**

Reference: `architecture.md` §4.4.

```typescript
// src/engine/events.ts
import type { TurnType, Intensity } from '../state/types';

export type GameEvent =
  | { type: 'show-banner'; turn: TurnType }
  | { type: 'hide-banner' }
  | { type: 'show-prompt'; promptType: string; value: string; icon: string }
  | { type: 'hide-prompt' }
  | { type: 'celebration'; intensity: Intensity }
  | { type: 'screen-changed'; screen: string }
  | { type: 'show-subtitle'; text: string }
  | { type: 'hide-subtitle' }
  | { type: 'show-game-end'; allowReplay: boolean }
  | { type: 'hide-game-end' }
  | { type: 'loading-progress'; percent: number };

type EventHandler = (event: GameEvent) => void;

export class EventEmitter {
  private handlers = new Map<string, Set<EventHandler>>();

  on(type: string, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  emit(event: GameEvent): void {
    this.handlers.get(event.type)?.forEach((h) => h(event));
    this.handlers.get('*')?.forEach((h) => h(event)); // wildcard listeners
  }
}
```

**Step 2: Create math.ts**

```typescript
// src/engine/utils/math.ts

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
```

**Step 3: Create tween.ts**

Reference: UI/UX research §4 (easing functions).

```typescript
// src/engine/utils/tween.ts

export type EasingFn = (t: number) => number;

export const easing = {
  linear: (t: number) => t,
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2,
  easeOut: (t: number) => 1 - (1 - t) ** 3,
  easeIn: (t: number) => t * t * t,
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
} as const;

export interface TweenConfig {
  from: number;
  to: number;
  duration: number; // seconds
  easing: EasingFn;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}

export class Tween {
  private elapsed = 0;
  private config: TweenConfig;
  public done = false;

  constructor(config: TweenConfig) {
    this.config = config;
  }

  update(dt: number): void {
    if (this.done) return;
    this.elapsed += dt;
    const t = Math.min(this.elapsed / this.config.duration, 1);
    const easedT = this.config.easing(t);
    this.config.onUpdate(this.config.from + (this.config.to - this.config.from) * easedT);
    if (t >= 1) {
      this.done = true;
      this.config.onComplete?.();
    }
  }
}

export class TweenManager {
  private tweens: Tween[] = [];

  add(config: TweenConfig): Tween {
    const tween = new Tween(config);
    this.tweens.push(tween);
    return tween;
  }

  update(dt: number): void {
    for (const tween of this.tweens) tween.update(dt);
    this.tweens = this.tweens.filter((t) => !t.done);
  }

  clear(): void {
    this.tweens = [];
  }
}
```

**Step 4: Create canvas.ts**

Reference: `architecture.md` §6.3.

```typescript
// src/engine/utils/canvas.ts
import { DESIGN_WIDTH, DESIGN_HEIGHT, MAX_DPR, SAFE_AREA } from '../../config/constants';

let scaleX = 1;
let scaleY = 1;
let offsetX = 0;
let offsetY = 0;

export function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')!;
  const parent = canvas.parentElement!;
  const parentWidth = parent.clientWidth;
  const parentHeight = parent.clientHeight;

  const designRatio = DESIGN_WIDTH / DESIGN_HEIGHT;
  const windowRatio = parentWidth / parentHeight;

  let width: number, height: number;
  if (windowRatio > designRatio) {
    height = parentHeight;
    width = height * designRatio;
  } else {
    width = parentWidth;
    height = width / designRatio;
  }

  offsetX = (parentWidth - width) / 2;
  offsetY = (parentHeight - height) / 2;

  const dpr = Math.min(window.devicePixelRatio, MAX_DPR);
  canvas.width = DESIGN_WIDTH * dpr;
  canvas.height = DESIGN_HEIGHT * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.position = 'absolute';
  canvas.style.left = `${offsetX}px`;
  canvas.style.top = `${offsetY}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scaleX = width / DESIGN_WIDTH;
  scaleY = height / DESIGN_HEIGHT;

  return ctx;
}

export function mapClickToDesignSpace(canvas: HTMLCanvasElement, e: MouseEvent): [number, number] {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * DESIGN_WIDTH;
  const y = ((e.clientY - rect.top) / rect.height) * DESIGN_HEIGHT;
  return [x, y];
}

export function isInSafeArea(x: number, y: number): boolean {
  return (
    x >= DESIGN_WIDTH * SAFE_AREA.left &&
    x <= DESIGN_WIDTH * SAFE_AREA.right &&
    y >= DESIGN_HEIGHT * SAFE_AREA.top &&
    y <= DESIGN_HEIGHT * SAFE_AREA.bottom
  );
}

export function safeAreaBounds() {
  return {
    x: DESIGN_WIDTH * SAFE_AREA.left,
    y: DESIGN_HEIGHT * SAFE_AREA.top,
    width: DESIGN_WIDTH * (SAFE_AREA.right - SAFE_AREA.left),
    height: DESIGN_HEIGHT * (SAFE_AREA.bottom - SAFE_AREA.top),
  };
}
```

**Step 5: Create game-loop.ts**

Reference: `architecture.md` §6.2.

```typescript
// src/engine/game-loop.ts
import { MAX_FRAME_DT } from '../config/constants';
import { session } from '../state/session.svelte';
import type { ScreenManager } from './screen-manager';

export class GameLoop {
  private running = false;
  private lastTime = 0;
  private frameCount = 0;
  private fpsTimer = 0;
  public screenManager!: ScreenManager;

  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D,
  ) {}

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.tick(t));
  }

  stop(): void {
    this.running = false;
  }

  private tick(now: number): void {
    if (!this.running) return;

    const dt = Math.min((now - this.lastTime) / 1000, MAX_FRAME_DT);
    this.lastTime = now;

    // FPS tracking
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1) {
      session.currentFps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    // Clear
    this.ctx.clearRect(0, 0, 1920, 1080);

    // Update + render current screen
    this.screenManager.update(dt);
    this.screenManager.render(this.ctx);

    requestAnimationFrame((t) => this.tick(t));
  }

  handleClick(x: number, y: number): void {
    this.screenManager.handleClick(x, y);
  }

  handleKey(key: string): void {
    this.screenManager.handleKey(key);
  }
}
```

**Step 6: Create screen-manager.ts**

Reference: `architecture.md` §4.1, §10.

```typescript
// src/engine/screen-manager.ts
import type { EventEmitter } from './events';
import type { TweenManager } from './utils/tween';

export interface GameScreen {
  enter(ctx: GameContext): void;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  exit(): void;
  handleClick(x: number, y: number): void;
  handleKey(key: string): void;
}

export interface GameContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  events: EventEmitter;
  tweens: TweenManager;
  screenManager: ScreenManager;
}

export class ScreenManager {
  private currentScreen: GameScreen | null = null;
  private screens = new Map<string, GameScreen>();
  private gameContext: GameContext;

  constructor(context: GameContext) {
    this.gameContext = context;
  }

  register(name: string, screen: GameScreen): void {
    this.screens.set(name, screen);
  }

  goTo(name: string): void {
    if (this.currentScreen) {
      this.currentScreen.exit();
    }
    const screen = this.screens.get(name);
    if (!screen) throw new Error(`Screen "${name}" not registered`);
    this.currentScreen = screen;
    this.currentScreen.enter(this.gameContext);
    this.gameContext.events.emit({ type: 'screen-changed', screen: name });
  }

  update(dt: number): void {
    this.gameContext.tweens.update(dt);
    this.currentScreen?.update(dt);
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.currentScreen?.render(ctx);
  }

  handleClick(x: number, y: number): void {
    this.currentScreen?.handleClick(x, y);
  }

  handleKey(key: string): void {
    this.currentScreen?.handleKey(key);
  }
}
```

**Step 7: Verify TypeScript compiles**

```bash
npx svelte-check
```

**Step 8: Commit**

```bash
git add src/engine/ && git commit -m "feat: add engine foundation (game loop, canvas utils, events, screen manager)"
```

---

### Task 6: GameCanvas Svelte Component + App Integration

**Files:**
- Modify: `src/App.svelte`
- Create: `src/components/GameCanvas.svelte`

**Step 1: Create GameCanvas.svelte**

Reference: `architecture.md` §6.1.

```svelte
<!-- src/components/GameCanvas.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { setupCanvas, mapClickToDesignSpace } from '../engine/utils/canvas';
  import { GameLoop } from '../engine/game-loop';
  import { ScreenManager } from '../engine/screen-manager';
  import { EventEmitter } from '../engine/events';
  import { TweenManager } from '../engine/utils/tween';

  let canvasEl: HTMLCanvasElement;
  let gameLoop: GameLoop | null = null;

  // Expose for parent component
  export function getEvents(): EventEmitter | null {
    return events;
  }

  let events: EventEmitter | null = null;

  onMount(() => {
    const ctx = setupCanvas(canvasEl);
    events = new EventEmitter();
    const tweens = new TweenManager();

    gameLoop = new GameLoop(canvasEl, ctx);

    const screenManager = new ScreenManager({
      canvas: canvasEl,
      ctx,
      events,
      tweens,
      screenManager: null!, // circular — set below
    });
    // Fix circular reference
    (screenManager as any).gameContext.screenManager = screenManager;
    gameLoop.screenManager = screenManager;

    // TODO: Register screens here as they are implemented

    gameLoop.start();

    const onResize = () => {
      setupCanvas(canvasEl);
    };
    window.addEventListener('resize', onResize);

    return () => {
      gameLoop?.stop();
      window.removeEventListener('resize', onResize);
    };
  });

  function handleClick(e: MouseEvent) {
    if (!canvasEl || !gameLoop) return;
    const [x, y] = mapClickToDesignSpace(canvasEl, e);
    gameLoop.handleClick(x, y);
  }

  function handleKeyDown(e: KeyboardEvent) {
    gameLoop?.handleKey(e.key);
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<canvas
  bind:this={canvasEl}
  onclick={handleClick}
  class="game-canvas"
></canvas>

<style>
  .game-canvas {
    display: block;
    image-rendering: auto;
  }
</style>
```

**Step 2: Update App.svelte**

```svelte
<!-- src/App.svelte -->
<script lang="ts">
  import GameCanvas from './components/GameCanvas.svelte';
</script>

<div class="game-container">
  <GameCanvas />
  <!-- UI overlay components will be added here -->
</div>

<style>
  .game-container {
    width: 100vw;
    height: 100vh;
    background: #0a0a1a;
    position: relative;
    overflow: hidden;
  }
</style>
```

**Step 3: Verify renders**

```bash
npm run dev
```

Expected: Dark screen with no errors. Canvas fills viewport. Console shows no errors.

**Step 4: Commit**

```bash
git add src/components/GameCanvas.svelte src/App.svelte && git commit -m "feat: add GameCanvas component with engine integration"
```

---

### Task 7: Input System + Hotkeys

**Files:**
- Create: `src/engine/input.ts`

**Step 1: Create input.ts**

Reference: `architecture.md` §9, PRD hidden controls table.

```typescript
// src/engine/input.ts
import { settings } from '../state/settings.svelte';
import { session } from '../state/session.svelte';

export type HotkeyAction = () => void;

const hotkeys: Record<string, HotkeyAction> = {
  '1': () => { settings.intensity = 'calm'; },
  '2': () => { settings.intensity = 'normal'; },
  '3': () => { settings.intensity = 'hype'; },
  '0': () => { settings.silentMode = !settings.silentMode; },
  'l': () => { session.turnOverride = 'owen'; },
  'b': () => { session.turnOverride = 'kian'; },
  't': () => { session.turnOverride = 'team'; },
  'f': () => toggleFullscreen(),
};

function toggleFullscreen(): void {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
}

export function handleHotkey(key: string): boolean {
  const action = hotkeys[key.toLowerCase()];
  if (action) {
    action();
    return true;
  }
  return false;
}

// Space hold detection for calm reset extension
let spaceHeld = false;

export function onKeyDown(key: string): void {
  if (key === ' ' && !spaceHeld) {
    spaceHeld = true;
    session.resetExtended = true;
  }
}

export function onKeyUp(key: string): void {
  if (key === ' ') {
    spaceHeld = false;
    session.resetExtended = false;
  }
}
```

**Step 2: Commit**

```bash
git add src/engine/input.ts && git commit -m "feat: add input system with hotkeys and space-hold detection"
```

---

### Task 8: Audio Manager

**Files:**
- Create: `src/engine/audio.ts`

**Step 1: Create audio.ts**

Reference: `architecture.md` §7, design doc §11.

```typescript
// src/engine/audio.ts
import type { Intensity } from '../state/types';

const GAIN_PRESETS: Record<Intensity, { sfx: number; voice: number; music: number }> = {
  calm: { sfx: 0.4, voice: 0.8, music: 0.3 },
  normal: { sfx: 0.7, voice: 0.8, music: 0.5 },
  hype: { sfx: 0.9, voice: 0.85, music: 0.6 },
};

export class AudioManager {
  private context: AudioContext;
  private masterGain: GainNode;
  private sfxGain: GainNode;
  private voiceGain: GainNode;
  private musicGain: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private voiceMap = new Map<string, string>();
  private _unlocked = false;

  constructor() {
    this.context = new AudioContext();

    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);

    this.sfxGain = this.context.createGain();
    this.sfxGain.connect(this.masterGain);

    this.voiceGain = this.context.createGain();
    this.voiceGain.connect(this.masterGain);

    this.musicGain = this.context.createGain();
    this.musicGain.connect(this.masterGain);

    this.setIntensity('normal');
  }

  get unlocked(): boolean {
    return this._unlocked;
  }

  async unlock(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
    this._unlocked = true;
  }

  async loadBuffer(path: string): Promise<void> {
    if (this.buffers.has(path)) return;
    try {
      const response = await fetch(path);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      this.buffers.set(path, audioBuffer);
    } catch (e) {
      console.warn(`Failed to load audio: ${path}`, e);
    }
  }

  playSfx(path: string, options?: { pitch?: number; volume?: number }): void {
    const buffer = this.buffers.get(path);
    if (!buffer) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    if (options?.pitch) source.playbackRate.value = options.pitch;

    if (options?.volume !== undefined) {
      const gainNode = this.context.createGain();
      gainNode.gain.value = options.volume;
      source.connect(gainNode);
      gainNode.connect(this.sfxGain);
    } else {
      source.connect(this.sfxGain);
    }

    source.start();
  }

  playVoice(key: string): void {
    const path = this.voiceMap.get(key);
    if (!path) return;
    const buffer = this.buffers.get(path);
    if (!buffer) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.voiceGain);
    source.start();
  }

  registerVoice(key: string, path: string): void {
    this.voiceMap.set(key, path);
  }

  setIntensity(level: Intensity): void {
    const preset = GAIN_PRESETS[level];
    this.sfxGain.gain.setTargetAtTime(preset.sfx, this.context.currentTime, 0.1);
    this.voiceGain.gain.setTargetAtTime(preset.voice, this.context.currentTime, 0.1);
    this.musicGain.gain.setTargetAtTime(preset.music, this.context.currentTime, 0.1);
  }

  setSilent(silent: boolean): void {
    this.sfxGain.gain.setTargetAtTime(silent ? 0 : GAIN_PRESETS.normal.sfx, this.context.currentTime, 0.1);
    this.musicGain.gain.setTargetAtTime(silent ? 0 : GAIN_PRESETS.normal.music, this.context.currentTime, 0.1);
    // Voice stays audible in silent mode
    this.voiceGain.gain.setTargetAtTime(silent ? 0.8 : GAIN_PRESETS.normal.voice, this.context.currentTime, 0.1);
  }
}
```

**Step 2: Commit**

```bash
git add src/engine/audio.ts && git commit -m "feat: add AudioManager with gain nodes and intensity presets"
```

---

### Task 9: Preloader

**Files:**
- Create: `src/engine/preloader.ts`

**Step 1: Create preloader.ts**

```typescript
// src/engine/preloader.ts
import { assetManifest } from '../config/manifest';
import type { AudioManager } from './audio';
import type { EventEmitter } from './events';

export class Preloader {
  constructor(
    private audio: AudioManager,
    private events: EventEmitter,
  ) {}

  async loadCritical(): Promise<void> {
    const critical = assetManifest.filter((a) => a.priority === 'critical');
    let loaded = 0;
    for (const asset of critical) {
      await this.audio.loadBuffer(asset.path);
      loaded++;
      this.events.emit({
        type: 'loading-progress',
        percent: (loaded / assetManifest.length) * 100,
      });
    }
  }

  async loadDeferred(): Promise<void> {
    const deferred = assetManifest.filter((a) => a.priority === 'deferred');
    let loaded = assetManifest.filter((a) => a.priority === 'critical').length;
    for (const asset of deferred) {
      await this.audio.loadBuffer(asset.path);
      loaded++;
      this.events.emit({
        type: 'loading-progress',
        percent: (loaded / assetManifest.length) * 100,
      });
    }
  }
}
```

**Step 2: Commit**

```bash
git add src/engine/preloader.ts && git commit -m "feat: add asset preloader with priority loading"
```

---

### Task 10: Particle System

**Files:**
- Create: `src/engine/entities/particles.ts`

**Step 1: Create particles.ts**

Reference: design doc §10 (fire particle system), architecture.md §11 (performance).

```typescript
// src/engine/entities/particles.ts
import { MAX_PARTICLES } from '../../config/constants';
import { randomRange } from '../utils/math';

export interface ParticleConfig {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  color: string;
  size: number;
  lifetime: number;
  gravity?: number;
  drag?: number;
  fadeOut?: boolean;
  shrink?: boolean;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  initialSize: number;
  lifetime: number;
  maxLifetime: number;
  gravity: number;
  drag: number;
  fadeOut: boolean;
  shrink: boolean;
}

export class ParticlePool {
  private particles: Particle[];
  private activeCount = 0;
  public spawnRateMultiplier = 1.0;

  constructor() {
    this.particles = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0,
      color: '#fff', size: 4, initialSize: 4,
      lifetime: 0, maxLifetime: 1,
      gravity: 0, drag: 0.98, fadeOut: true, shrink: false,
    }));
  }

  spawn(config: ParticleConfig): void {
    if (Math.random() > this.spawnRateMultiplier) return;
    if (this.activeCount >= MAX_PARTICLES) this.killOldest();

    const p = this.particles.find((p) => !p.active);
    if (!p) return;

    p.active = true;
    p.x = config.x;
    p.y = config.y;
    p.vx = config.vx ?? 0;
    p.vy = config.vy ?? 0;
    p.color = config.color;
    p.size = config.size;
    p.initialSize = config.size;
    p.lifetime = config.lifetime;
    p.maxLifetime = config.lifetime;
    p.gravity = config.gravity ?? 0;
    p.drag = config.drag ?? 0.98;
    p.fadeOut = config.fadeOut ?? true;
    p.shrink = config.shrink ?? false;
    this.activeCount++;
  }

  /** Spawn multiple particles in a radial burst. */
  burst(x: number, y: number, count: number, color: string, speed: number, lifetime: number): void {
    for (let i = 0; i < count; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const spd = randomRange(speed * 0.5, speed);
      this.spawn({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color, size: randomRange(2, 6), lifetime,
        gravity: 50, drag: 0.96, fadeOut: true, shrink: true,
      });
    }
  }

  /** Spawn flame-style particles drifting upward. */
  flame(x: number, y: number, count: number, colors: string[], spread: number): void {
    for (let i = 0; i < count; i++) {
      this.spawn({
        x: x + randomRange(-spread, spread),
        y: y + randomRange(-spread * 0.5, 0),
        vx: randomRange(-10, 10),
        vy: randomRange(-80, -30),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: randomRange(2, 8),
        lifetime: randomRange(0.3, 0.8),
        drag: 0.95, fadeOut: true, shrink: true,
      });
    }
  }

  update(dt: number): void {
    this.activeCount = 0;
    for (const p of this.particles) {
      if (!p.active) continue;
      p.lifetime -= dt;
      if (p.lifetime <= 0) { p.active = false; continue; }
      p.vy += p.gravity * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.shrink) {
        p.size = p.initialSize * (p.lifetime / p.maxLifetime);
      }
      this.activeCount++;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      const alpha = p.fadeOut ? p.lifetime / p.maxLifetime : 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(p.size, 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    for (const p of this.particles) p.active = false;
    this.activeCount = 0;
  }

  private killOldest(): void {
    let oldest: Particle | null = null;
    let lowestLifetime = Infinity;
    for (const p of this.particles) {
      if (p.active && p.lifetime < lowestLifetime) {
        oldest = p;
        lowestLifetime = p.lifetime;
      }
    }
    if (oldest) oldest.active = false;
  }

  get count(): number {
    return this.activeCount;
  }
}
```

**Step 2: Commit**

```bash
git add src/engine/entities/particles.ts && git commit -m "feat: add pool-based particle system with flame and burst presets"
```

---

### Task 11: Background Renderer

**Files:**
- Create: `src/engine/entities/backgrounds.ts`

**Step 1: Create backgrounds.ts**

Reference: design doc §10 (non-character art), UI/UX research §7 (dark theme rules — never leave darkness empty).

```typescript
// src/engine/entities/backgrounds.ts
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../../config/constants';
import { theme } from '../../config/theme';
import { randomRange } from '../utils/math';

interface BackgroundStar {
  x: number;
  y: number;
  radius: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export class Background {
  private stars: BackgroundStar[] = [];
  private time = 0;

  // Offscreen canvas for static mountain silhouette
  private mountainCanvas: OffscreenCanvas | null = null;

  constructor(private starCount = 40) {
    this.generateStars();
    this.prerenderMountains();
  }

  private generateStars(): void {
    this.stars = Array.from({ length: this.starCount }, () => ({
      x: randomRange(0, DESIGN_WIDTH),
      y: randomRange(0, DESIGN_HEIGHT * 0.6),
      radius: randomRange(1, 3),
      twinkleSpeed: randomRange(0.5, 2),
      twinkleOffset: randomRange(0, Math.PI * 2),
    }));
  }

  private prerenderMountains(): void {
    if (typeof OffscreenCanvas === 'undefined') return;
    this.mountainCanvas = new OffscreenCanvas(DESIGN_WIDTH, DESIGN_HEIGHT);
    const ctx = this.mountainCanvas.getContext('2d')!;

    // Mountain silhouettes
    ctx.fillStyle = '#0d0d2a';
    ctx.beginPath();
    ctx.moveTo(0, DESIGN_HEIGHT);
    ctx.lineTo(0, 750);
    ctx.bezierCurveTo(200, 650, 400, 700, 500, 680);
    ctx.bezierCurveTo(650, 600, 750, 620, 900, 640);
    ctx.bezierCurveTo(1000, 580, 1150, 550, 1300, 600);
    ctx.bezierCurveTo(1450, 640, 1600, 620, 1700, 660);
    ctx.bezierCurveTo(1800, 690, 1920, 720, 1920, 720);
    ctx.lineTo(1920, DESIGN_HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  update(dt: number): void {
    this.time += dt;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { dark, mid, accent } = theme.palette.background;

    // Gradient background (never flat black — Rule 1 of dark theme)
    const grad = ctx.createRadialGradient(
      DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.4, 100,
      DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.4, DESIGN_HEIGHT,
    );
    grad.addColorStop(0, mid);
    grad.addColorStop(0.5, accent);
    grad.addColorStop(1, dark);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Mountains
    if (this.mountainCanvas) {
      ctx.drawImage(this.mountainCanvas, 0, 0);
    }

    // Stars with twinkle
    for (const star of this.stars) {
      const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(this.time * star.twinkleSpeed + star.twinkleOffset));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
```

**Step 2: Commit**

```bash
git add src/engine/entities/backgrounds.ts && git commit -m "feat: add background renderer with gradient sky, mountains, and twinkling stars"
```

---

### Task 12: Placeholder Hub Screen + First Visual Test

This task creates a minimal hub screen so we can see something on the TV. It proves the entire pipeline works: Vite → Svelte → Canvas → game loop → screen → render.

**Files:**
- Create: `src/engine/screens/hub.ts`
- Modify: `src/components/GameCanvas.svelte`

**Step 1: Create a minimal hub.ts**

```typescript
// src/engine/screens/hub.ts
import type { GameScreen, GameContext } from '../screen-manager';
import { Background } from '../entities/backgrounds';
import { ParticlePool } from '../entities/particles';
import { theme } from '../../config/theme';
import { DESIGN_WIDTH, DESIGN_HEIGHT, HUB_ORB_DIAMETER } from '../../config/constants';

const ORBS = [
  { color: '#3377ff', label: 'Colors', x: 560, y: 450 },
  { color: '#ff3333', label: 'Count', x: 860, y: 350 },
  { color: '#33cc33', label: 'Shapes', x: 1160, y: 450 },
  { color: '#ff8833', label: 'Letters', x: 960, y: 600 },
];

export class HubScreen implements GameScreen {
  private bg = new Background();
  private particles = new ParticlePool();
  private time = 0;

  enter(_ctx: GameContext): void {
    this.time = 0;
    this.particles.clear();
  }

  update(dt: number): void {
    this.time += dt;
    this.bg.update(dt);
    this.particles.update(dt);

    // Ambient embers (Rule 2: always have warm light)
    if (Math.random() < 0.3) {
      this.particles.flame(
        DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.75, 1,
        [theme.palette.fire.mid, theme.palette.fire.spark],
        40,
      );
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.bg.render(ctx);

    // Warm glow behind character position (Rule 2: warm light source)
    const glowGrad = ctx.createRadialGradient(
      DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.55, 50,
      DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.55, 400,
    );
    glowGrad.addColorStop(0, 'rgba(240, 128, 48, 0.25)');
    glowGrad.addColorStop(1, 'rgba(240, 128, 48, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Placeholder orbs
    for (const orb of ORBS) {
      const r = HUB_ORB_DIAMETER / 2;
      const pulse = 1 + 0.03 * Math.sin(this.time * 2 + orb.x);

      // Glow halo
      const orbGlow = ctx.createRadialGradient(orb.x, orb.y, r * 0.5, orb.x, orb.y, r * 1.5);
      orbGlow.addColorStop(0, orb.color + '60');
      orbGlow.addColorStop(1, orb.color + '00');
      ctx.fillStyle = orbGlow;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, r * 1.5 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Orb body
      const orbGrad = ctx.createRadialGradient(orb.x - r * 0.2, orb.y - r * 0.2, r * 0.1, orb.x, orb.y, r);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.3, orb.color);
      orbGrad.addColorStop(1, orb.color + 'aa');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, r * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Outline
      ctx.strokeStyle = '#ffffff44';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    this.particles.render(ctx);

    // Placeholder title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('MEGA CHARIZARD ACADEMY', DESIGN_WIDTH / 2, 160);
  }

  exit(): void {
    this.particles.clear();
  }

  handleClick(x: number, y: number): void {
    // TODO: orb click detection
  }

  handleKey(_key: string): void {
    // TODO: handled by input system
  }
}
```

**Step 2: Wire hub screen into GameCanvas.svelte**

In `GameCanvas.svelte`, after creating the `screenManager`, add:

```typescript
import { HubScreen } from '../engine/screens/hub';

// Inside onMount, after screenManager creation:
screenManager.register('hub', new HubScreen());
screenManager.goTo('hub');
```

**Step 3: Run and verify**

```bash
npm run dev
```

Expected: Dark blue gradient background with twinkling stars, silhouette mountains, warm orange glow in the center, 4 glowing pulsing orbs, floating blue embers, and the title text. This is the first real visual of the game.

**Step 4: Commit**

```bash
git add src/engine/screens/hub.ts src/components/GameCanvas.svelte && git commit -m "feat: add hub screen with background, glowing orbs, and ambient particles"
```

---

### Task 13: Push to GitHub

**Step 1: Push**

```bash
cd "/mnt/c/Users/jayes/Documents/Mega Charizard" && git push -u origin main
```

**Step 2: Verify on GitHub**

Open https://github.com/Jayesh137/Mega-Charizard and confirm all files are present.

---

## Phase 2: Entities & Core Systems (Tasks 14-19)

### Task 14: Charizard Entity — Body Parts, Poses, Rendering

Build the procedural Mega Charizard X from 12 canvas-drawn body parts with 6 animation states.

**Files:**
- Create: `src/engine/entities/charizard.ts`

Reference: design doc §10 (MCX construction, body parts, poses), UI/UX research §7 Rule 3 (friendly eyes).

This is the largest single implementation task. The Charizard entity needs:
- 12 body parts each with anchor points and transform values
- 6 pose definitions: idle, roar, attack, perch, calm-rest, fly
- 4 form variants: Charmander, Charmeleon, Charizard, Mega Charizard X
- Idle animation: body bob, wing flap, eye blink, flame flicker
- Pose transitions via tweening

**Implementation approach:** Start with Mega Charizard X only (the primary form). Add other forms later for the opening sequence. Define poses as target values for body part transforms. Use the TweenManager for smooth transitions.

---

### Task 15: Charizard Integration — Hub Screen with Character

Wire Charizard into the hub screen in idle pose. Charizard perches on the mountain with ambient flame particles.

**Files:**
- Modify: `src/engine/screens/hub.ts`

---

### Task 16: Loading Screen (Svelte + Canvas)

Audio unlock flow, preload progress bar, pulsing MCX silhouette.

**Files:**
- Create: `src/components/LoadingScreen.svelte`
- Create: `src/engine/screens/loading.ts`
- Modify: `src/App.svelte`
- Modify: `src/components/GameCanvas.svelte`

---

### Task 17: Turn Banner Component

Animated slide-in/out banner with name + icon + voice cue trigger.

**Files:**
- Create: `src/components/TurnBanner.svelte`
- Modify: `src/App.svelte`

Reference: UI/UX research §4 (banner timing: 400ms ease-out-back in, 300ms ease-in out).

---

### Task 18: Celebration Overlay Component

CSS screen shake, white flash, particle effects tied to intensity levels.

**Files:**
- Create: `src/components/CelebrationOverlay.svelte`
- Modify: `src/App.svelte`

Reference: UI/UX research §6 (freeze frame, screen shake, juice techniques).

---

### Task 19: Prompt Display + Subtitle Components

Icon-first prompt overlay and optional subtitle bar.

**Files:**
- Create: `src/components/PromptDisplay.svelte`
- Create: `src/components/SubtitleBar.svelte`
- Modify: `src/App.svelte`

---

## Phase 3: Screens & Flow (Tasks 20-24)

### Task 20: Opening Sequence

The 22-second Mega Evolution transformation. Requires all 4 Charizard forms.

**Files:**
- Modify: `src/engine/entities/charizard.ts` (add all 4 forms)
- Modify: `src/engine/screens/opening.ts`

Reference: design doc §3.

---

### Task 21: Calm Reset Screen

3 variations: Power Up, Stargazing, Flame Rest. Passive, no interaction.

**Files:**
- Create: `src/engine/screens/calm-reset.ts`

Reference: design doc §8.

---

### Task 22: Finale Screen

Victory lap, "Great training, Trainers!" natural stopping point.

**Files:**
- Create: `src/engine/screens/finale.ts`

---

### Task 23: Game End Controls + Hub Orb Click Detection

Replay/next buttons after mini-games. Hub orb click → game transition.

**Files:**
- Create: `src/components/GameEndControls.svelte`
- Modify: `src/engine/screens/hub.ts`

---

### Task 24: Full Session Flow Integration

Wire all screens together: Loading → Opening → Hub → Game → Calm Reset → Hub → ... → Finale.

**Files:**
- Modify: `src/components/GameCanvas.svelte` (register all screens)
- Modify: `src/engine/screen-manager.ts` (transition logic)

---

## Phase 4: Mini-Games (Tasks 25-28)

### Task 25: Flame Colors Mini-Game

Color recognition. Charizard fire breath on correct target.

**Files:**
- Create: `src/engine/games/flame-colors.ts`
- Create: `src/engine/entities/targets.ts`

Reference: design doc §5.2, PRD R3.

---

### Task 26: Fireball Count Mini-Game

Counting with fireball launching and pillar destruction.

**Files:**
- Create: `src/engine/games/fireball-count.ts`

Reference: design doc §5.3, PRD R4.

---

### Task 27: Evolution Tower Mini-Game

Shape matching + size comparison. Tower building mechanic.

**Files:**
- Create: `src/engine/games/evolution-tower.ts`

Reference: design doc §5.4, PRD R5.

---

### Task 28: Sky Writer Mini-Game

Letter tracing through star constellations. Charizard draws fire trails.

**Files:**
- Create: `src/engine/games/sky-writer.ts`

Reference: design doc §5.5, PRD R6.

---

## Phase 5: Polish & Settings (Tasks 29-32)

### Task 29: Settings Panel

Hidden parent settings: names, intensity, subtitles toggle.

**Files:**
- Create: `src/components/SettingsPanel.svelte`
- Create: `src/components/TurnIndicator.svelte`

---

### Task 30: Font Integration (Fredoka + Nunito)

Load Google Fonts, apply to all DOM overlays per UI/UX research §5.

**Files:**
- Modify: `index.html` (font link)
- Modify: `src/app.css` (font-family rules)
- Modify all Svelte components (font classes)

---

### Task 31: Performance Tuning

Adaptive particle reduction, offscreen canvas caching, FPS monitoring.

**Files:**
- Modify: `src/engine/game-loop.ts` (adaptive performance)
- Modify: `src/engine/entities/particles.ts` (spawn rate control)

Reference: architecture.md §11.

---

### Task 32: Voice Prompt Placeholder + TTS Integration

Create voice file stubs, set up the voice map, add Web Speech API fallback.

**Files:**
- Modify: `src/engine/audio.ts` (voice map registration)
- Modify: `src/config/manifest.ts` (voice asset entries)

---

## Phase 6: Final Integration & Ship (Tasks 33-34)

### Task 33: Full Playthrough Testing

Manual testing checklist:
- [ ] Loading screen → audio unlock → opening plays
- [ ] Hub screen shows 4 orbs, Charizard in idle pose
- [ ] Each mini-game starts, plays through, ends with replay/next
- [ ] Turn banners alternate correctly (Owen → Kian → Owen → ... → Team)
- [ ] Celebration intensity changes with 1/2/3 keys
- [ ] Calm reset plays between activities
- [ ] Fail-safe escalation works (miss 1/2/3 times)
- [ ] Session ends after 6 activities with finale
- [ ] Fullscreen works via F key
- [ ] All hotkeys work (L/B/T/0/R/Esc/Space)
- [ ] Settings persist across page reload
- [ ] Performance stays at 60fps throughout

### Task 34: Production Build + Push

```bash
npm run build
npx serve dist  # Test the production build locally
git add -A && git commit -m "feat: complete Mega Charizard Academy v1.0"
git push
```

---

## Implementation Order Summary

```
Phase 1: Foundation (Tasks 1-13)
  Scaffold → Config → Content → State → Engine → Canvas → Input → Audio → Preloader → Particles → Background → Hub → Push

Phase 2: Entities & Core Systems (Tasks 14-19)
  Charizard Entity → Hub Integration → Loading Screen → Turn Banner → Celebration → Prompts

Phase 3: Screens & Flow (Tasks 20-24)
  Opening → Calm Reset → Finale → Game End UI → Session Flow

Phase 4: Mini-Games (Tasks 25-28)
  Flame Colors → Fireball Count → Evolution Tower → Sky Writer

Phase 5: Polish (Tasks 29-32)
  Settings → Fonts → Performance → Voice

Phase 6: Ship (Tasks 33-34)
  Full Test → Build + Push
```

Each phase produces a working, testable increment. Phase 1 ends with a visible hub screen on the TV. Phase 2 adds Charizard and UI components. Phase 3 connects the flow. Phase 4 adds all gameplay. Phase 5 polishes. Phase 6 ships.
