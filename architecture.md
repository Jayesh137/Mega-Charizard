# Architecture: Mega Charizard Academy

> Svelte 5 + Vite + HTML5 Canvas — how the pieces fit together.

---

## 1. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Svelte 5 (Runes) | Reactive UI overlays, component composition, zero-runtime overhead for DOM layer |
| **Build** | Vite 6 | Instant HMR in dev, optimized static build for prod, native ES modules |
| **Game rendering** | HTML5 Canvas (2D) | All animations, characters, particles, fire — performance-critical, runs outside Svelte's reactivity |
| **UI overlays** | Svelte components | Banners, settings panel, hub orbs, subtitles, loading screen — DOM layer on top of canvas |
| **Animation loop** | `requestAnimationFrame` | 60fps delta-time game loop, decoupled from Svelte's render cycle |
| **SFX** | Web Audio API | Low-latency sound effects, gain nodes per channel, pitch shifting |
| **Music/ambient** | HTML `<audio>` via Svelte bindings | Background loops, crossfading, volume control via reactive state |
| **State** | Svelte stores (runes) + `localStorage` | Reactive UI state + persistent settings |
| **Fullscreen** | Fullscreen API | One-click TV display |
| **Language** | TypeScript | Type safety for game engine, content data, and theme interfaces |

### Why Svelte + Canvas (not pure Canvas)

The game has two distinct layers with different needs:

**Canvas layer (game engine):** Charizard rendering, fire particles, animations, backgrounds. This runs in a tight `requestAnimationFrame` loop at 60fps. It needs raw Canvas 2D performance — no framework overhead.

**DOM layer (UI):** Turn banners, settings panel, hub orb labels, loading screen, subtitles, celebration text. These are standard UI elements that benefit from Svelte's reactivity, CSS animations, accessibility, and component composition. Writing animated banners in CSS is far simpler than canvas text rendering.

Svelte's near-zero runtime means the DOM layer adds negligible overhead. The canvas game loop runs independently — Svelte never touches it per-frame.

### Why Not SvelteKit

This is a single-page game with no routing, no SSR, no API, no SEO needs. Plain Svelte + Vite is the right scope. SvelteKit would add unused complexity.

---

## 2. Project Structure

```
mega-charizard-academy/
├── index.html                          # Vite entry point
├── vite.config.ts                      # Vite config (static asset handling, build output)
├── tsconfig.json
├── package.json
├── svelte.config.js
│
├── public/                             # Static assets (copied as-is to build output)
│   └── audio/
│       ├── sfx/                        # Roars, impacts, chimes (.wav)
│       ├── music/                      # Ambient loops, calm reset (.mp3)
│       └── voice/                      # AI TTS voice prompts (.mp3)
│           ├── prompts/                # color-red.mp3, number-3.mp3, shape-circle.mp3, ...
│           ├── feedback/               # great-job.mp3, you-did-it.mp3, wow.mp3, ...
│           ├── turns/                  # owen-turn.mp3, kian-turn.mp3, team-turn.mp3, ...
│           └── instructions/           # hit-the-color.mp3, count-with-me.mp3, ...
│
├── src/
│   ├── main.ts                         # Svelte app mount
│   ├── App.svelte                      # Root: canvas + UI overlay composition
│   ├── app.css                         # Global styles, TV safe-area, fonts
│   │
│   ├── config/
│   │   ├── constants.ts                # Tunable numbers: timings, particle caps, sizes
│   │   ├── theme.ts                    # Visual/audio theme identity (reskinnable)
│   │   └── manifest.ts                 # Asset paths + preload priority list
│   │
│   ├── content/                        # Educational data (tuning = editing data, not logic)
│   │   ├── colors.ts                   # Color sets, difficulty tiers, prompt data
│   │   ├── counting.ts                 # Number ranges, difficulty tiers
│   │   ├── shapes.ts                   # Shape definitions, introduction order
│   │   └── letters.ts                  # Letter sets, phonics data, icon mappings
│   │
│   ├── state/
│   │   ├── settings.svelte.ts          # Persistent state (localStorage): names, intensity pref
│   │   ├── session.svelte.ts           # Live state: current screen, turn, round progress
│   │   └── types.ts                    # Shared type definitions for state
│   │
│   ├── engine/                         # Pure TypeScript game engine (no Svelte imports)
│   │   ├── game-loop.ts                # rAF loop, delta-time, FPS tracking
│   │   ├── screen-manager.ts           # Screen stack, transitions, enter/exit lifecycle
│   │   ├── input.ts                    # Click coord mapping, keyboard hotkeys
│   │   ├── audio.ts                    # Web Audio manager, gain nodes, voice map, unlock
│   │   ├── preloader.ts                # Asset loading, progress tracking
│   │   │
│   │   ├── screens/                    # Each implements GameScreen interface
│   │   │   ├── opening.ts              # Mega Evolution sequence
│   │   │   ├── hub.ts                  # Hub with orb hit detection
│   │   │   ├── calm-reset.ts           # 3 variations: power-up, stargazing, flame-rest
│   │   │   └── finale.ts              # Session-end victory lap
│   │   │
│   │   ├── games/                      # Each implements GameScreen interface
│   │   │   ├── flame-colors.ts         # Mini-game 1: color recognition
│   │   │   ├── fireball-count.ts       # Mini-game 2: counting
│   │   │   ├── evolution-tower.ts      # Mini-game 3: shapes + sizes
│   │   │   └── sky-writer.ts           # Mini-game 4: letters + phonics
│   │   │
│   │   ├── entities/                   # Canvas-drawn game objects
│   │   │   ├── charizard.ts            # Body parts, poses, form transitions
│   │   │   ├── particles.ts            # Pool-based particle system (fire, sparks, embers)
│   │   │   ├── targets.ts              # Clickable targets (colored orbs, shapes, stars)
│   │   │   └── backgrounds.ts          # Mountains, sky gradients, star fields
│   │   │
│   │   └── utils/
│   │       ├── canvas.ts               # Scaling, safe-area, coord mapping, offscreen cache
│   │       ├── tween.ts                # Easing functions, value interpolation
│   │       └── math.ts                 # Random ranges, vector ops, distance
│   │
│   └── components/                     # Svelte UI components (DOM overlay layer)
│       ├── GameCanvas.svelte           # Canvas element + engine bridge
│       ├── LoadingScreen.svelte        # Audio unlock + asset preload
│       ├── TurnBanner.svelte           # Animated turn cue banner
│       ├── HubOrbs.svelte             # Clickable orb buttons (DOM, not canvas)
│       ├── PromptDisplay.svelte        # Icon-first prompt overlay
│       ├── SubtitleBar.svelte          # Optional voice prompt captions
│       ├── CelebrationOverlay.svelte   # Screen shake, flash effects via CSS
│       ├── GameEndControls.svelte      # Replay / next buttons after each mini-game
│       ├── SettingsPanel.svelte        # Hidden parent settings (names, intensity, subtitles)
│       └── TurnIndicator.svelte        # Persistent small icon in bottom corner
│
├── docs/
│   └── plans/
│       └── 2026-02-23-mega-charizard-academy-design.md
├── PRD.md
└── architecture.md
```

---

## 3. Architectural Layers

### 3.1 The Two-Layer Model

```
┌──────────────────────────────────────────────────┐
│                   Browser Window                  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │          Svelte DOM Overlay (z-index: 10)   │  │
│  │  ┌──────────┐ ┌────────────┐ ┌───────────┐ │  │
│  │  │  Banner   │ │  Prompts   │ │ Settings  │ │  │
│  │  │ Component │ │  Display   │ │  Panel    │ │  │
│  │  └──────────┘ └────────────┘ └───────────┘ │  │
│  │  ┌──────────┐ ┌────────────┐ ┌───────────┐ │  │
│  │  │ Subtitle │ │  Hub Orbs  │ │ Game End  │ │  │
│  │  │   Bar    │ │  (DOM)     │ │ Controls  │ │  │
│  │  └──────────┘ └────────────┘ └───────────┘ │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │        HTML5 Canvas (z-index: 1)            │  │
│  │                                              │  │
│  │   ┌──────────────────────────────────────┐   │  │
│  │   │         Game Engine (rAF loop)       │   │  │
│  │   │                                      │   │  │
│  │   │  Charizard ← Particles ← Backgrounds│   │  │
│  │   │  Targets  ← Transitions ← Effects   │   │  │
│  │   └──────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

**Canvas (bottom):** Full-viewport canvas. Owns the game loop. Draws Charizard, fire, backgrounds, targets, transitions. Runs at 60fps via `requestAnimationFrame`. Pure TypeScript — no Svelte reactivity in the render path.

**DOM overlay (top):** Svelte components absolutely positioned over the canvas. Handles all text, buttons, banners, settings. Uses CSS animations for banner slides, screen shake, flash effects. Pointer events pass through to canvas except on interactive DOM elements.

### 3.2 Communication: Engine ↔ Svelte

The engine and Svelte talk through a thin bridge — **not** by sharing state directly in the render loop.

```
┌─────────────┐         events          ┌──────────────┐
│             │ ──────────────────────→ │              │
│   Engine    │   'show-banner'          │   Svelte     │
│  (Canvas)   │   'show-prompt'          │   (DOM)      │
│             │   'celebration'          │              │
│             │   'screen-changed'       │              │
│             │ ←────────────────────── │              │
│             │   click coords           │              │
│             │   keyboard events        │              │
│             │   settings changes       │              │
└─────────────┘                          └──────────────┘
         │                                       │
         └──────────┐           ┌────────────────┘
                    ▼           ▼
              ┌─────────────────────┐
              │   Shared State      │
              │  (Svelte runes)     │
              │                     │
              │  session.svelte.ts  │
              │  settings.svelte.ts │
              └─────────────────────┘
```

**Engine → Svelte:** The engine emits typed events via a lightweight `EventEmitter`. Svelte components subscribe in `onMount` and update reactive state. Examples:
- `show-banner { turn: 'owen', type: 'little' }` → TurnBanner animates in
- `show-prompt { type: 'color', value: 'blue', icon: 'flame' }` → PromptDisplay renders
- `celebration { intensity: 'hype' }` → CelebrationOverlay triggers CSS shake + flash
- `screen-changed { to: 'hub' }` → HubOrbs become visible

**Svelte → Engine:** Click events on the canvas element are forwarded to the engine's input handler (with design-space coordinate mapping). Keyboard events are captured globally and routed to the engine. Settings changes (from SettingsPanel) update the shared settings store, which the engine reads.

**Shared state** lives in Svelte rune-based stores (`$state`). The engine reads from these (one-way for settings), and writes to session state (which Svelte components react to). The engine never triggers Svelte re-renders in its per-frame loop — only on discrete game events.

---

## 4. Core Interfaces

### 4.1 GameScreen Interface

Every screen and mini-game implements this contract:

```typescript
interface GameScreen {
  /** Called once when transitioning to this screen. */
  enter(ctx: GameContext): void;

  /** Called every frame. dt = delta time in seconds. */
  update(dt: number): void;

  /** Called every frame after update. Draw to canvas. */
  render(ctx: CanvasRenderingContext2D): void;

  /** Called once when transitioning away. Cleanup timers, particles. */
  exit(): void;

  /** Called on mouse/touch click. Coords in design-space (1920x1080). */
  handleClick(x: number, y: number): void;

  /** Called on keyboard press. */
  handleKey(key: string): void;
}
```

```typescript
interface GameContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  audio: AudioManager;
  events: EventEmitter;          // Emit events to Svelte DOM layer
  settings: SettingsState;       // Read-only access to persistent settings
  session: SessionState;         // Read/write live session state
  theme: Theme;                  // Visual/audio theme data
  screenManager: ScreenManager;  // For transitioning between screens
}
```

### 4.2 Theme Interface (Reskinnable)

```typescript
interface Theme {
  name: string;                  // "mega-charizard-x"
  title: string;                 // "Mega Charizard Academy"
  characterName: string;         // "Charizard"

  forms: CharacterForm[];        // Evolution line (4 forms)
  palette: {
    background: { dark: string; mid: string; accent: string };
    fire: { core: string; mid: string; outer: string; spark: string };
    ui: { bannerOrange: string; bannerBlue: string; bannerGold: string };
  };
  audio: Record<string, string>; // Sound key → asset path
}

interface CharacterForm {
  name: string;                  // "Mega Charizard X"
  colors: Record<string, string>;
  scale: number;                 // 0.3 (Charmander) → 1.0 (MCX)
  eyeStyle: 'cute-round' | 'fierce-narrow' | 'determined' | 'glowing-red';
}
```

### 4.3 Content Interface (Educational Data)

```typescript
interface ContentSet<T> {
  primary: T[];
  extended: T[];
  difficulty: {
    little: DifficultyTier;
    big: DifficultyTier;
  };
}

interface ColorItem {
  name: string;                  // "red"
  hex: string;                   // "#ff3333"
  voiceFile: string;             // "color-red" → resolved via voice map
}

interface ShapeItem {
  name: string;                  // "circle"
  drawFn: string;                // Key into shape drawing registry
  voiceFile: string;
  introducedAfterRounds: number; // 0 = available from start
}

interface LetterItem {
  letter: string;                // "C"
  word: string;                  // "Charizard"
  phonicsSound: string;          // "ch" (for voice file)
  icon: string;                  // Key into icon drawing registry
  voiceFile: string;             // "letter-c"
  starCount: { little: number; big: number }; // 2-3 / 4-5
}
```

### 4.4 Event Types (Engine → Svelte)

```typescript
type GameEvent =
  | { type: 'show-banner'; turn: 'owen' | 'kian' | 'team' }
  | { type: 'hide-banner' }
  | { type: 'show-prompt'; promptType: string; value: string; icon: string }
  | { type: 'hide-prompt' }
  | { type: 'celebration'; intensity: 'calm' | 'normal' | 'hype' }
  | { type: 'screen-changed'; screen: string }
  | { type: 'show-subtitle'; text: string }
  | { type: 'hide-subtitle' }
  | { type: 'show-game-end'; allowReplay: boolean }
  | { type: 'hide-game-end' }
  | { type: 'loading-progress'; percent: number };
```

---

## 5. State Architecture

### 5.1 Settings (Persistent — `localStorage`)

```typescript
// state/settings.svelte.ts
class SettingsState {
  // Player names
  littleTrainerName = $state('Owen');
  bigTrainerName = $state('Kian');

  // Celebration intensity: 'calm' | 'normal' | 'hype'
  intensity = $state<'calm' | 'normal' | 'hype'>('normal');

  // Audio
  silentMode = $state(false);
  showSubtitles = $state(false);

  // Session tracking
  isFirstVisit = $state(true);
  shapesUnlocked = $state<string[]>(['circle', 'square', 'triangle']);

  // Persist to localStorage on change
  // Hydrate from localStorage on init
}
```

### 5.2 Session (Live — resets each session)

```typescript
// state/session.svelte.ts
class SessionState {
  // Screen management
  currentScreen = $state<string>('loading');

  // Turn system
  currentTurn = $state<'owen' | 'kian' | 'team'>('owen');
  turnOverride = $state<'owen' | 'kian' | 'team' | null>(null);
  turnsCompleted = $state(0);

  // Round tracking
  currentGame = $state<string | null>(null);
  roundNumber = $state(0);
  promptIndex = $state(0);
  missCount = $state(0);
  activitiesCompleted = $state(0);

  // Calm reset
  resetExtended = $state(false);

  // Performance
  currentFps = $state(60);
}
```

### 5.3 Why Svelte Runes for State

- Settings store is reactive: when the uncle changes intensity via keyboard, the `$state` update triggers CelebrationOverlay and AudioManager to react automatically.
- Session state drives UI visibility: `currentScreen` changing to `'hub'` makes HubOrbs visible via `{#if}` blocks. No manual DOM toggling.
- The engine reads/writes state directly (no event round-trip for state changes). Svelte components react to the same `$state` references.
- `$derived` handles computed values: e.g., `currentDifficulty` derives from `currentTurn` automatically.

---

## 6. Game Loop & Canvas Bridge

### 6.1 GameCanvas.svelte

The critical bridge component:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { GameLoop } from '../engine/game-loop';
  import { ScreenManager } from '../engine/screen-manager';
  import { setupCanvas, mapClickToDesignSpace } from '../engine/utils/canvas';

  let canvasEl: HTMLCanvasElement;
  let gameLoop: GameLoop;

  onMount(() => {
    const ctx = canvasEl.getContext('2d')!;
    setupCanvas(canvasEl, ctx);  // Scale to viewport, set up safe area

    gameLoop = new GameLoop(canvasEl, ctx);
    gameLoop.start();

    // Resize handler
    const onResize = () => setupCanvas(canvasEl, ctx);
    window.addEventListener('resize', onResize);

    return () => {
      gameLoop.stop();
      window.removeEventListener('resize', onResize);
    };
  });

  function handleCanvasClick(e: MouseEvent) {
    const [x, y] = mapClickToDesignSpace(canvasEl, e);
    gameLoop.handleClick(x, y);
  }
</script>

<canvas
  bind:this={canvasEl}
  onclick={handleCanvasClick}
  class="game-canvas"
></canvas>
```

### 6.2 Game Loop

```typescript
// engine/game-loop.ts
export class GameLoop {
  private running = false;
  private lastTime = 0;
  private screenManager: ScreenManager;

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.tick(this.lastTime);
  }

  private tick(now: number) {
    if (!this.running) return;

    const dt = Math.min((now - this.lastTime) / 1000, 0.05); // Cap at 50ms
    this.lastTime = now;

    this.screenManager.update(dt);
    this.screenManager.render(this.ctx);

    requestAnimationFrame((t) => this.tick(t));
  }
}
```

### 6.3 Canvas Scaling

```typescript
// engine/utils/canvas.ts
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const SAFE_AREA = {
  left: 0.05,
  right: 0.95,
  top: 0.05,
  bottom: 0.95,
};

export function setupCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  // Size canvas to fill viewport at 16:9
  const windowRatio = window.innerWidth / window.innerHeight;
  const designRatio = DESIGN_WIDTH / DESIGN_HEIGHT;

  let width: number, height: number;
  if (windowRatio > designRatio) {
    height = window.innerHeight;
    width = height * designRatio;
  } else {
    width = window.innerWidth;
    height = width / designRatio;
  }

  // Set actual canvas pixel dimensions (for crisp rendering)
  const dpr = Math.min(window.devicePixelRatio, 2); // Cap DPR for perf
  canvas.width = DESIGN_WIDTH * dpr;
  canvas.height = DESIGN_HEIGHT * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  // Scale context so all drawing uses 1920x1080 coordinates
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function mapClickToDesignSpace(canvas: HTMLCanvasElement, e: MouseEvent): [number, number] {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * DESIGN_WIDTH;
  const y = ((e.clientY - rect.top) / rect.height) * DESIGN_HEIGHT;
  return [x, y];
}
```

---

## 7. Audio Architecture

### 7.1 AudioManager

```typescript
// engine/audio.ts
export class AudioManager {
  private context: AudioContext;

  // Gain node chain: source → category → master → destination
  private masterGain: GainNode;
  private sfxGain: GainNode;
  private voiceGain: GainNode;
  private musicGain: GainNode;

  // Pre-decoded audio buffers (loaded by preloader)
  private buffers = new Map<string, AudioBuffer>();

  // Voice file lookup
  private voiceMap = new Map<string, string>();

  /** Must be called from a user gesture (click) */
  async unlock(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  /** Play a one-shot SFX */
  playSfx(key: string, options?: { pitch?: number }): void { ... }

  /** Play a voice prompt */
  playVoice(key: string): void { ... }

  /** Apply intensity level to all gain nodes */
  setIntensity(level: 'calm' | 'normal' | 'hype'): void { ... }

  /** Silent mode — mute everything except voice */
  setSilent(silent: boolean): void { ... }
}
```

### 7.2 Gain Node Graph

```
                        ┌──────────┐
                   ┌───→│ SFX Gain │───┐
                   │    └──────────┘   │
                   │                   │    ┌─────────────┐    ┌─────────────┐
  Audio Sources ───┤    ┌────────────┐ ├───→│ Master Gain │───→│ Destination │
                   ├───→│ Voice Gain │─┤    └─────────────┘    └─────────────┘
                   │    └────────────┘ │
                   │                   │
                   │    ┌────────────┐ │
                   └───→│ Music Gain │─┘
                        └────────────┘

  Intensity level adjusts individual gain values.
  Silent mode: SFX=0, Music=0, Voice=80%.
  Voice always audible.
```

### 7.3 Intensity Gain Map

```typescript
const GAIN_PRESETS = {
  calm:   { sfx: 0.4, voice: 0.8, music: 0.3 },
  normal: { sfx: 0.7, voice: 0.8, music: 0.5 },
  hype:   { sfx: 0.9, voice: 0.85, music: 0.6 },
} as const;
```

---

## 8. Svelte Component Architecture

### 8.1 App.svelte (Root)

```svelte
<!-- Simplified structure -->
<div class="game-container" class:shake={shaking}>

  <!-- Bottom layer: game canvas -->
  <GameCanvas />

  <!-- Top layer: DOM overlays -->
  {#if $session.currentScreen === 'loading'}
    <LoadingScreen />
  {/if}

  <TurnBanner />
  <PromptDisplay />
  <SubtitleBar />
  <CelebrationOverlay />
  <GameEndControls />
  <TurnIndicator />
  <SettingsPanel />
</div>
```

### 8.2 Component Responsibilities

| Component | What It Does | Visibility |
|-----------|-------------|-----------|
| **GameCanvas** | Mounts `<canvas>`, bridges input to engine, manages resize | Always |
| **LoadingScreen** | Audio unlock button, preload progress bar, MCX silhouette | `screen === 'loading'` |
| **TurnBanner** | Slides in from top with name + icon + role, voice cue trigger | On `show-banner` event |
| **HubOrbs** | 4 large clickable DOM buttons with pulse animation, icons | `screen === 'hub'` |
| **PromptDisplay** | Large icon-first prompt (flame blob, shape, number pips) | On `show-prompt` event |
| **SubtitleBar** | Large bold text at bottom showing current voice line | When `showSubtitles` setting enabled |
| **CelebrationOverlay** | CSS screen shake, white flash, particle burst overlay | On `celebration` event |
| **GameEndControls** | Replay flame icon + next arrow after each mini-game | On `show-game-end` event |
| **SettingsPanel** | Names, intensity, subtitles toggle, hidden behind gear icon | Toggled via gear icon |
| **TurnIndicator** | Small persistent icon in bottom corner showing current turn | During mini-games |

### 8.3 Why Some Things Are DOM, Not Canvas

| Element | Layer | Reason |
|---------|-------|--------|
| Turn banners | DOM | CSS `slide-in` animation is simpler and crisper than canvas text |
| Prompt icons | DOM | Need to scale cleanly with text, support aria labels |
| Subtitles | DOM | Text rendering on canvas is blurry at non-integer scales; DOM text is always crisp |
| Hub orbs | DOM | Need hover states, click handlers, focus rings — standard interactive elements |
| Settings panel | DOM | Form inputs (text fields, toggles) are native DOM elements |
| Game End buttons | DOM | Large clickable targets with hover/active states |
| Screen shake | DOM | CSS `transform: translate()` on the container is GPU-accelerated and trivial |
| Charizard | Canvas | 12 animated body parts + procedural fire = canvas territory |
| Fire particles | Canvas | 300 particles redrawn per frame = canvas territory |
| Backgrounds | Canvas | Full-screen gradient fills + bezier mountains = canvas territory |
| Targets | Canvas | Floating, drifting, clickable game objects with hit detection |

---

## 9. Input Architecture

### 9.1 Input Flow

```
User Input
    │
    ├── Mouse click on Canvas element
    │       ↓
    │   mapClickToDesignSpace()
    │       ↓
    │   screenManager.currentScreen.handleClick(x, y)
    │
    ├── Mouse click on DOM element (orb, button, settings)
    │       ↓
    │   Svelte component's onclick handler
    │       ↓
    │   Updates state or emits event to engine
    │
    └── Keyboard press (global)
            ↓
        input.ts handleKey()
            │
            ├── Hotkeys (1/2/3/0/L/B/T/F/R/Esc/Space)
            │       ↓
            │   Direct state mutations or engine commands
            │
            └── Game keys
                    ↓
                screenManager.currentScreen.handleKey(key)
```

### 9.2 Hotkey Map

```typescript
const HOTKEYS: Record<string, () => void> = {
  '1': () => settings.intensity = 'calm',
  '2': () => settings.intensity = 'normal',
  '3': () => settings.intensity = 'hype',
  '0': () => settings.silentMode = !settings.silentMode,
  'l': () => session.turnOverride = 'owen',
  'b': () => session.turnOverride = 'kian',
  't': () => session.turnOverride = 'team',
  'f': () => toggleFullscreen(),
  'r': () => screenManager.replayCurrent(),
  'Escape': () => screenManager.goTo('hub'),
};

// Space is special: hold detection for calm reset extension
// Tracked via keydown/keyup events, not single press
```

---

## 10. Screen Transitions

### Transition Flow

```
┌──────────┐   click   ┌──────────┐  complete  ┌────────────┐  complete  ┌──────────┐
│ Loading  │ ────────→ │ Opening  │ ─────────→ │    Hub     │ ←─────── │  Calm    │
│ Screen   │           │ Sequence │            │   Screen   │           │  Reset   │
└──────────┘           └──────────┘            └──────┬─────┘           └────┬─────┘
                                                      │ orb click            │
                                                      ▼                     │
                                                ┌──────────┐   complete    │
                                                │ Mini-Game │ ────────────→┘
                                                └──────────┘
                                                      │ after 5-6 games
                                                      ▼
                                                ┌──────────┐
                                                │  Finale  │
                                                └──────────┘
```

### Transition Types

| Transition | Visual | Duration |
|-----------|--------|----------|
| Loading → Opening | Fade from silhouette to opening scene | 0.5s |
| Opening → Hub | Fire clears, orbs fade in | 1.0s |
| Hub → Mini-game | Charizard fire breath, screen wipe | 0.8s |
| Mini-game → Calm Reset | Audio crossfade, scene dissolve | 0.5s |
| Calm Reset → Hub | Orbs fade in around resting Charizard | 0.5s |
| Hub → Finale | Charizard launches into sky | 1.0s |

Implemented in `screen-manager.ts` with a transition state that blends the outgoing and incoming screens' render calls.

---

## 11. Performance Strategy

### Budgets

| Metric | Budget | Fallback |
|--------|--------|----------|
| Frame time | < 16.7ms (60fps) | Adaptive particle reduction |
| Active particles | ≤ 300 global | Kill oldest when cap hit |
| Offscreen canvases | ≤ 10 cached | Reuse for similar visuals |
| Audio buffers in memory | ≤ 20MB total | Defer non-critical assets |
| DOM overlay nodes | ≤ 30 elements | Svelte conditionally renders |

### Adaptive Performance

```typescript
// In game-loop.ts
private adaptPerformance(frameTime: number) {
  if (frameTime > 18) {
    // Below 55fps: reduce particle spawn to 50%
    this.particleSpawnRate = 0.5;
  } else if (frameTime > 25) {
    // Below 40fps: aggressive reduction
    this.particleSpawnRate = 0.25;
    this.disableOuterParticleLayers = true;
  } else {
    this.particleSpawnRate = 1.0;
    this.disableOuterParticleLayers = false;
  }
}
```

### Offscreen Canvas Cache

Pre-render static visuals once at init:

```typescript
const CACHED_VISUALS = [
  'glow-halo',       // Radial gradient circle
  'ember-sprite',    // Single ember particle
  'star-shape',      // 4-point cross bloom
  'orb-base',        // Hub orb without color
  'mountain-bg',     // Silhouette mountain range
] as const;

// Rendered to offscreen canvases at init
// Stamped via drawImage() each frame — no gradient recalculation
```

### Particle Pool

```typescript
// Pre-allocated, zero-GC particle system
class ParticlePool {
  private particles: Particle[];   // Fixed-size array
  private activeCount = 0;

  spawn(config: ParticleConfig): void {
    if (this.activeCount >= MAX_PARTICLES) {
      this.killOldest();
    }
    // Reuse dead particle slot — no `new`
  }
}
```

---

## 12. Build & Deploy

### Development

```bash
npm create vite@latest mega-charizard-academy -- --template svelte-ts
cd mega-charizard-academy
npm install
npm run dev          # http://localhost:5173 with HMR
```

Vite dev server serves `public/audio/` as static assets. HMR updates Svelte components instantly. Canvas engine changes trigger full-page reload (acceptable — canvas state isn't preservable).

### Production Build

```bash
npm run build        # Outputs to dist/
npx serve dist       # Serve locally for TV
```

The `dist/` folder is a self-contained static site:

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js      # Bundled app (Svelte + engine)
│   └── index-[hash].css     # Bundled styles
└── audio/                    # Copied from public/ (not bundled)
    ├── sfx/
    ├── music/
    └── voice/
```

### Vite Config

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  base: './',                    // Relative paths (works from file:// too)
  build: {
    target: 'esnext',            // Chrome on your laptop — no legacy compat needed
    outDir: 'dist',
    assetsInlineLimit: 0,        // Never inline audio files as base64
  },
});
```

### Running on TV

```bash
npm run build && npx serve dist
# Open http://localhost:3000 in Chrome
# Press F for fullscreen
# Plug in HDMI
```

Or for quick dev sessions:

```bash
npm run dev
# Open http://localhost:5173 in Chrome
# Fullscreen + HDMI
```

---

## 13. Reskinning Boundary

The strict theme/content split ensures only two directories need changes to reskin:

```
Files that reference "Charizard" / Pokemon:
├── src/config/theme.ts          ← Replace: colors, names, form definitions
├── src/content/*.ts             ← Replace: letter associations, word references
└── public/audio/voice/          ← Replace: voice clips with new character name

Files that are 100% generic:
├── src/engine/**                ← "Flying fire creature" — no franchise references
├── src/components/**            ← "Banner", "Prompt", "Orb" — no franchise references
├── src/state/**                 ← "littleTrainer", "bigTrainer" — generic roles
└── src/config/constants.ts      ← Timings, sizes, caps — franchise-agnostic
```

---

## 14. Dependency List

Minimal dependencies. The game is mostly self-contained.

```json
{
  "devDependencies": {
    "vite": "^6.x",
    "@sveltejs/vite-plugin-svelte": "^5.x",
    "svelte": "^5.x",
    "typescript": "^5.x",
    "svelte-check": "^4.x"
  }
}
```

Zero runtime dependencies. No UI library, no animation library, no audio library. The Canvas engine, particle system, tweening, and audio management are all hand-rolled — they're small, game-specific, and avoid dependency bloat.

---

## 15. Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Svelte for UI, Canvas for game | Two-layer model | Each layer uses the right tool: Svelte for reactive DOM, Canvas for 60fps rendering |
| Svelte 5 Runes (`$state`) | Over stores API | Simpler, more performant, future-proof — runes are the Svelte 5 direction |
| TypeScript | Over JavaScript | Type safety on the GameScreen interface, theme/content contracts, and event types prevents runtime bugs |
| No SvelteKit | Plain Svelte + Vite | Single-page game needs no routing, SSR, or server logic |
| Hand-rolled engine | Over Phaser/PixiJS | The game is 4 mini-games with a particle system. A game framework would add 500KB+ for features we don't use (physics, tilemaps, spritesheets) |
| Events for engine→DOM | Over shared reactive state in render loop | Prevents Svelte from re-rendering every frame. Events fire on discrete game moments only |
| Offscreen canvas caching | For static visuals | Radial gradients and complex shapes are expensive to compute per-frame. Pre-render once, stamp with drawImage |
| `public/` for audio | Over `src/assets/` | Audio files should not be bundled/hashed by Vite — they're loaded dynamically by the preloader via known paths |
| Relative base (`./`) | Over absolute paths | Allows serving from any directory, including `file://` as last resort |
