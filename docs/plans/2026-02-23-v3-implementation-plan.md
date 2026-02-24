# V3 Implementation Plan — Educational + Sprite + Voice + Video Overhaul

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Mega Charizard Academy from a spectacle-first game into an evidence-based educational game that keeps MCX spectacle at maximum. Replace procedural Charizard with animated sprites, add anime video clips, integrate Ash voice, implement 3x concept repetition, MCX coach hints, adaptive difficulty, and reward meter — across 4 simplified core games.

**Architecture:** New shared systems (voice, hints, tracking, sprites, video) are built first as reusable modules, then wired into each game and screen. Games are simplified to core mechanics while adding educational depth through voice labeling, concept repetition, and adaptive scaffolding.

**Tech Stack:** Svelte 5 + Vite 7 + TypeScript, HTML5 Canvas sprite sheets, HTML5 `<video>` overlay, Web Audio API

---

## Phase 1: Foundation Systems (Tasks 1-6)

Build all shared systems that games depend on before touching any game code.

### Task 1: SpriteAnimator Entity

Create the sprite sheet rendering system that replaces the 1400-line procedural Charizard.

**Files:**
- Create: `src/engine/entities/sprite-animator.ts`
- Create: `src/config/sprites.ts`

**Step 1: Write SpriteAnimator**

```typescript
// src/engine/entities/sprite-animator.ts

export interface SpriteConfig {
  src: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop?: boolean;
}

export class SpriteAnimator {
  private image: HTMLImageElement;
  private config: SpriteConfig;
  private currentFrame = 0;
  private elapsed = 0;
  private _loaded = false;
  private _paused = false;

  constructor(config: SpriteConfig) {
    this.config = { loop: true, ...config };
    this.image = new Image();
    this.image.onload = () => { this._loaded = true; };
    this.image.src = config.src;
  }

  get loaded(): boolean { return this._loaded; }

  pause(): void { this._paused = true; }
  resume(): void { this._paused = false; }
  reset(): void { this.currentFrame = 0; this.elapsed = 0; }

  update(dt: number): void {
    if (!this._loaded || this._paused) return;
    this.elapsed += dt;
    const frameDuration = 1 / this.config.fps;
    while (this.elapsed >= frameDuration) {
      this.elapsed -= frameDuration;
      if (this.config.loop) {
        this.currentFrame = (this.currentFrame + 1) % this.config.frameCount;
      } else {
        this.currentFrame = Math.min(this.currentFrame + 1, this.config.frameCount - 1);
      }
    }
  }

  /** Render centered at (cx, cy) with pixel-art crisp scaling */
  render(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale = 1): void {
    if (!this._loaded) return;
    const fw = this.config.frameWidth;
    const fh = this.config.frameHeight;
    const sx = this.currentFrame * fw;
    const dw = fw * scale;
    const dh = fh * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.image, sx, 0, fw, fh, cx - dw / 2, cy - dh / 2, dw, dh);
    ctx.imageSmoothingEnabled = true;
  }
}
```

**Step 2: Write sprite config**

```typescript
// src/config/sprites.ts
// Frame dimensions are placeholders — update after converting GIFs to sprite sheets via ezgif.com

import type { SpriteConfig } from '../engine/entities/sprite-animator';

export const SPRITES: Record<string, SpriteConfig> = {
  charmander:          { src: './sprites/charmander.png',          frameWidth: 96, frameHeight: 96, frameCount: 28, fps: 12 },
  charmeleon:          { src: './sprites/charmeleon.png',          frameWidth: 96, frameHeight: 96, frameCount: 20, fps: 12 },
  charizard:           { src: './sprites/charizard.png',           frameWidth: 96, frameHeight: 96, frameCount: 30, fps: 12 },
  'charizard-megax':   { src: './sprites/charizard-megax.png',     frameWidth: 96, frameHeight: 96, frameCount: 40, fps: 12 },
};
```

**Step 3: Commit**

```bash
git add src/engine/entities/sprite-animator.ts src/config/sprites.ts
git commit -m "feat: add SpriteAnimator entity and sprite config"
```

---

### Task 2: Educational Voice System

Create the shared voice/label system that implements the "Three-Label Rule" and Ash voice integration.

**Files:**
- Create: `src/engine/voice.ts`
- Modify: `src/engine/audio.ts` (add Ash voice registrations)
- Modify: `src/config/manifest.ts` (add Ash voice assets)

**Step 1: Write the voice system**

```typescript
// src/engine/voice.ts
// Centralized educational voice system.
// Implements the Three-Label Rule: prompt label → action label → success echo.
// All voice calls go through here for consistency.

import type { AudioManager } from './audio';

const ASH_CORRECT = ['ash-great-job', 'ash-awesome', 'ash-alright', 'ash-yeah'];
const ASH_WRONG = ['ash-try-again', 'ash-not-quite'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class VoiceSystem {
  constructor(private audio: AudioManager) {}

  /** Prompt label: "Red. Find red!" */
  prompt(concept: string, instruction: string): void {
    this.audio.playVoice(`${concept}. ${instruction}`);
  }

  /** Pre-prompt engagement: "Owen, point!" */
  engage(name: string, action: string): void {
    this.audio.playVoice(`${name}, ${action}!`);
  }

  /** Success echo: "Red! Red flame!" */
  successEcho(concept: string, celebration?: string): void {
    const text = celebration ? `${concept}! ${celebration}` : `${concept}!`;
    this.audio.playVoice(text);
  }

  /** Wrong redirect: "That's blue. Find red!" */
  wrongRedirect(wrongConcept: string, correctConcept: string): void {
    this.audio.playVoice(`That's ${wrongConcept}. Find ${correctConcept}!`);
  }

  /** Play a random Ash celebration clip */
  ashCorrect(): void {
    this.audio.playVoice(pick(ASH_CORRECT));
  }

  /** Play a random Ash encouragement clip */
  ashWrong(): void {
    this.audio.playVoice(pick(ASH_WRONG));
  }

  /** Play a specific Ash clip by key */
  ash(key: string): void {
    this.audio.playVoice(key);
  }

  /** Narration frame for game intro */
  narrate(text: string): void {
    this.audio.playVoice(text);
  }

  /** Hint repeat: just say the concept again */
  hintRepeat(concept: string): void {
    this.audio.playVoice(concept);
  }
}
```

**Step 2: Add Ash voice registrations to AudioManager**

In `src/engine/audio.ts`, expand `registerDefaultVoices()` to include all Ash voice keys (ash-i-choose-you, ash-great-job, ash-awesome, ash-alright, ash-yeah, ash-try-again, ash-not-quite, ash-owen-turn, ash-kian-turn, ash-team-turn, ash-power-gem, ash-find-color, ash-count-them, ash-match-shape, ash-trace-letter, ash-welcome, ash-amazing, ash-lets-go, ash-ready). Also map legacy keys (turn-owen → ash-owen-turn, etc.).

**Step 3: Update asset manifest**

In `src/config/manifest.ts`, add critical Ash voice assets (welcome, i-choose-you, turn clips) and deferred ones (all others).

**Step 4: Commit**

```bash
git add src/engine/voice.ts src/engine/audio.ts src/config/manifest.ts
git commit -m "feat: add educational voice system with Ash Ketchum integration"
```

---

### Task 3: Concept Tracker (Adaptive Difficulty + Spaced Repetition)

Track per-child performance for adaptive micro-adjustments and within-session spaced repetition.

**Files:**
- Create: `src/state/tracker.svelte.ts`

**Step 1: Write the tracker**

```typescript
// src/state/tracker.svelte.ts
// Tracks per-child, per-concept performance for adaptive difficulty
// and within-session spaced repetition.

interface ConceptRecord {
  concept: string;       // e.g., 'red', '3', 'circle', 'C'
  domain: string;        // 'color' | 'number' | 'shape' | 'letter'
  attempts: number;
  misses: number;
  lastSeen: number;      // prompt index when last seen
  needsRepeat: boolean;  // flagged for spaced repetition
}

function createTracker() {
  let rollingWindow = $state<boolean[]>([]);  // last N answers (true=correct)
  let concepts = $state<Map<string, ConceptRecord>>(new Map());
  let promptCounter = $state(0);

  function recordAnswer(concept: string, domain: string, correct: boolean): void {
    // Rolling window (last 5)
    rollingWindow = [...rollingWindow.slice(-4), correct];

    // Per-concept tracking
    const key = `${domain}:${concept}`;
    const existing = concepts.get(key) ?? {
      concept, domain, attempts: 0, misses: 0, lastSeen: 0, needsRepeat: false,
    };
    existing.attempts++;
    if (!correct) {
      existing.misses++;
      existing.needsRepeat = true;
    }
    existing.lastSeen = promptCounter;
    concepts.set(key, existing);
    concepts = new Map(concepts); // trigger reactivity
    promptCounter++;
  }

  /** Get difficulty adjustment: -1 (easier), 0 (maintain), +1 (harder) */
  function getDifficultyAdjustment(): number {
    if (rollingWindow.length < 3) return 0;
    const recent = rollingWindow.slice(-5);
    const correctCount = recent.filter(Boolean).length;
    if (correctCount >= 4) return 1;   // doing great → slightly harder
    if (correctCount <= 1) return -1;  // struggling → slightly easier
    return 0;
  }

  /** Get concepts that need spaced repetition (missed + not seen for 2+ prompts) */
  function getRepeatConcepts(domain: string): string[] {
    const repeats: string[] = [];
    for (const [, record] of concepts) {
      if (record.domain === domain && record.needsRepeat && promptCounter - record.lastSeen >= 2) {
        repeats.push(record.concept);
      }
    }
    return repeats;
  }

  /** Mark a concept as repeated (clear needsRepeat flag) */
  function markRepeated(concept: string, domain: string): void {
    const key = `${domain}:${concept}`;
    const record = concepts.get(key);
    if (record) {
      record.needsRepeat = false;
      record.lastSeen = promptCounter;
      concepts.set(key, record);
      concepts = new Map(concepts);
    }
  }

  function reset(): void {
    rollingWindow = [];
    concepts = new Map();
    promptCounter = 0;
  }

  return {
    recordAnswer,
    getDifficultyAdjustment,
    getRepeatConcepts,
    markRepeated,
    reset,
    get recentCorrectRate() {
      if (rollingWindow.length === 0) return 1;
      return rollingWindow.filter(Boolean).length / rollingWindow.length;
    },
  };
}

export const tracker = createTracker();
```

**Step 2: Commit**

```bash
git add src/state/tracker.svelte.ts
git commit -m "feat: add concept tracker for adaptive difficulty and spaced repetition"
```

---

### Task 4: Mega Flame Charge Meter

Session-wide reward meter that triggers MCX spectacle at thresholds.

**Files:**
- Modify: `src/state/session.svelte.ts` (add flameCharge state)
- Create: `src/engine/entities/flame-meter.ts` (renderer)

**Step 1: Add state to session**

In `src/state/session.svelte.ts`, add:
```typescript
let flameCharge = $state(0);        // 0-100
let flameChargeMax = $state(100);
let lastThreshold = $state(0);      // tracks which threshold was last triggered
```

Add getter/setter, add to reset().

**Step 2: Write flame meter renderer**

```typescript
// src/engine/entities/flame-meter.ts
// Renders the Mega Flame Charge bar in games.
// Triggers MCX spectacle events at 25/50/75/100% thresholds.

import { session } from '../../state/session.svelte';
import { DESIGN_WIDTH } from '../../config/constants';
import type { ParticlePool } from './particles';

export type FlameEvent = 'wing-flare' | 'flame-burst' | 'aura-pulse' | 'mega-roar' | null;

export class FlameMeter {
  private displayCharge = 0; // smoothed display value

  /** Add charge. Returns a threshold event if one was crossed. */
  addCharge(amount: number): FlameEvent {
    session.flameCharge = Math.min(session.flameCharge + amount, session.flameChargeMax);
    const percent = (session.flameCharge / session.flameChargeMax) * 100;

    if (percent >= 100 && session.lastThreshold < 100) {
      session.lastThreshold = 100;
      return 'mega-roar';
    } else if (percent >= 75 && session.lastThreshold < 75) {
      session.lastThreshold = 75;
      return 'aura-pulse';
    } else if (percent >= 50 && session.lastThreshold < 50) {
      session.lastThreshold = 50;
      return 'flame-burst';
    } else if (percent >= 25 && session.lastThreshold < 25) {
      session.lastThreshold = 25;
      return 'wing-flare';
    }
    return null;
  }

  update(dt: number): void {
    // Smooth display toward actual value
    const target = session.flameCharge;
    this.displayCharge += (target - this.displayCharge) * dt * 5;
  }

  /** Render a small meter bar at the top of the screen */
  render(ctx: CanvasRenderingContext2D): void {
    const barWidth = 300;
    const barHeight = 16;
    const x = DESIGN_WIDTH - barWidth - 40;
    const y = 30;
    const fill = this.displayCharge / session.flameChargeMax;

    ctx.save();
    // Background
    ctx.fillStyle = 'rgba(20, 15, 40, 0.6)';
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 8);
    ctx.fill();

    // Fill
    if (fill > 0) {
      const grad = ctx.createLinearGradient(x, y, x + barWidth * fill, y);
      grad.addColorStop(0, '#37B1E2');
      grad.addColorStop(1, '#91CCEC');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth * fill, barHeight, 8);
      ctx.fill();
    }

    // Border
    ctx.strokeStyle = 'rgba(55, 177, 226, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 8);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#8888aa';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('MEGA CHARGE', x - 10, y + 12);
    ctx.restore();
  }
}
```

**Step 3: Commit**

```bash
git add src/state/session.svelte.ts src/engine/entities/flame-meter.ts
git commit -m "feat: add Mega Flame Charge meter with threshold spectacle events"
```

---

### Task 5: MCX Coach Hint System

Replace the current simple hint escalation with the 5-level MCX-personality-driven coach system.

**Files:**
- Create: `src/engine/systems/hint-ladder.ts`

**Step 1: Write the hint ladder**

```typescript
// src/engine/systems/hint-ladder.ts
// 5-level MCX Coach Mode hint ladder.
// Owen gets faster hint escalation than Kian.

import { settings } from '../../state/settings.svelte';
import type { VoiceSystem } from '../voice';

export type HintLevel = 0 | 1 | 2 | 3 | 4;

interface HintConfig {
  /** Seconds before first timeout hint */
  timeoutDelay: number;
  /** Seconds between escalating timeout hints */
  escalateDelay: number;
  /** Number of misses before auto-complete */
  autoCompleteAfter: number;
}

const HINT_CONFIGS: Record<string, HintConfig> = {
  little: { timeoutDelay: 5, escalateDelay: 5, autoCompleteAfter: 3 },
  big:    { timeoutDelay: 8, escalateDelay: 7, autoCompleteAfter: 4 },
};

export class HintLadder {
  private level: HintLevel = 0;
  private missCount = 0;
  private timeSincePrompt = 0;
  private concept = '';
  private _autoCompleted = false;

  get hintLevel(): HintLevel { return this.level; }
  get autoCompleted(): boolean { return this._autoCompleted; }

  /** Start a new prompt — resets hint state */
  startPrompt(concept: string): void {
    this.level = 0;
    this.missCount = 0;
    this.timeSincePrompt = 0;
    this.concept = concept;
    this._autoCompleted = false;
  }

  /** Call on wrong answer. Returns new hint level. */
  onMiss(): HintLevel {
    this.missCount++;
    const config = this.getConfig();

    if (this.missCount >= config.autoCompleteAfter) {
      this.level = 4;
      this._autoCompleted = true;
    } else if (this.missCount >= 2) {
      this.level = Math.max(this.level, 3) as HintLevel;
    } else {
      this.level = Math.max(this.level, 2) as HintLevel;
    }
    return this.level;
  }

  /** Call every frame. Returns true if hint level escalated from timeout. */
  update(dt: number): boolean {
    if (this.level >= 4) return false;

    this.timeSincePrompt += dt;
    const config = this.getConfig();
    const prevLevel = this.level;

    if (this.level === 0 && this.timeSincePrompt >= config.timeoutDelay) {
      this.level = 1; // Voice repeat
    } else if (this.level === 1 && this.timeSincePrompt >= config.timeoutDelay + config.escalateDelay) {
      this.level = 2; // Visual pulse
    } else if (this.level === 2 && this.timeSincePrompt >= config.timeoutDelay + config.escalateDelay * 2) {
      this.level = 3; // MCX looks at target
    }

    return this.level !== prevLevel;
  }

  private getConfig(): HintConfig {
    const turn = settings.littleTrainerName ? 'little' : 'big';
    // Use current turn to determine config
    return HINT_CONFIGS[turn] ?? HINT_CONFIGS.big;
  }
}
```

Note: The actual turn-based config lookup will be refined during game integration (Task 7+) to use session.currentTurn.

**Step 2: Commit**

```bash
git add src/engine/systems/hint-ladder.ts
git commit -m "feat: add MCX Coach hint ladder with 5-level escalation"
```

---

### Task 6: VideoOverlay Component + Event Wiring

Add the video player overlay for anime clips at opening/gem/finale.

**Files:**
- Create: `src/components/VideoOverlay.svelte`
- Create: `src/config/videos.ts`
- Modify: `src/engine/events.ts` (add video event types)
- Modify: `src/App.svelte` (wire VideoOverlay)

**Step 1: Add video event types to events.ts**

Add to the GameEvent union type:
```typescript
| { type: 'play-video'; src: string; onEnd?: string }
| { type: 'stop-video' }
```

**Step 2: Create VideoOverlay.svelte**

A full-screen video overlay with tap-to-skip. Manages `<video>` element, auto-hides on end, dispatches `video-ended` custom event if `onEnd` screen name provided. Dark background, centered video, "Tap to skip" hint at bottom-right.

**Step 3: Create video config**

```typescript
// src/config/videos.ts
export const VIDEOS = {
  megaEvolution: './video/mega-evolution.mp4',
  victoryRoar: './video/victory-roar.mp4',
  blastBurn: './video/blast-burn.mp4',
} as const;
```

**Step 4: Wire into App.svelte**

Import VideoOverlay, add ref, bind:this. Add cases in wireEventBus for 'play-video' and 'stop-video'. Listen for 'video-ended' custom event to trigger screen transitions.

**Step 5: Commit**

```bash
git add src/components/VideoOverlay.svelte src/config/videos.ts src/engine/events.ts src/App.svelte
git commit -m "feat: add VideoOverlay component for anime clips"
```

---

## Phase 2: Remove Old Games + Simplify Hub (Tasks 7-8)

### Task 7: Remove Dragon Egg Sort, Charizard Kitchen, Update Types

**Files:**
- Modify: `src/state/types.ts` — remove 2 game names
- Modify: `src/components/GameCanvas.svelte` — remove 2 imports and registrations
- Modify: `src/config/constants.ts` — ACTIVITIES_PER_SESSION = 4
- Delete: `src/engine/games/dragon-egg-sort.ts`
- Delete: `src/engine/games/charizard-kitchen.ts`
- Delete: `src/engine/entities/nest.ts`

**Step 1:** Update GameName type to only include 4 games.

**Step 2:** Remove imports and `screenManager.register()` lines for the 2 deleted games in GameCanvas.svelte.

**Step 3:** Update ACTIVITIES_PER_SESSION from 6 to 4.

**Step 4:** Delete the 3 files.

**Step 5: Commit**

```bash
git add -u && git add src/state/types.ts src/components/GameCanvas.svelte src/config/constants.ts
git commit -m "feat: remove egg sort and kitchen games, simplify to 4 core games"
```

---

### Task 8: Update Hub to 4 Gems + Educational Enhancements

**Files:**
- Modify: `src/engine/screens/hub.ts`

**Step 1:** Replace GEMS array with 4 entries (Colors, Count, Shapes, Letters) at new positions (2×2 grid, left side).

**Step 2:** Remove egg/cauldron icon cases from drawGemIcon.

**Step 3:** Change finale trigger from `>= 6` to `>= 4`.

**Step 4:** Add named greeting: In enter(), play `ash-welcome` on first visit, `ash-lets-go` on subsequent. Use the VoiceSystem.

**Step 5:** Replace `Charizard` entity with `SpriteAnimator` using SPRITES['charizard-megax']. Remove Charizard import, TweenManager usage for poses.

**Step 6:** Add gem collection video trigger: When a gem is collected, emit play-video event for victoryRoar clip.

**Step 7: Commit**

```bash
git add src/engine/screens/hub.ts
git commit -m "feat: update hub to 4 gems with sprites, named greeting, and video"
```

---

## Phase 3: Rewrite 4 Games with Educational Systems (Tasks 9-12)

Each game gets the same treatment:
1. Replace Charizard entity with SpriteAnimator
2. Wire VoiceSystem (Three-Label Rule)
3. Wire HintLadder (MCX Coach Mode)
4. Wire ConceptTracker (adaptive + spaced rep)
5. Wire FlameMeter (reward charge)
6. Add pre-prompt engagement ("Owen, point!")
7. Add narration frame
8. Educational non-interactive moments (colored particles, voice during animations)
9. Dim background during choice moments
10. Game-specific educational improvements per design doc

### Task 9: Rewrite Flame Colors Game

**Files:**
- Modify: `src/engine/games/flame-colors.ts`

**Key Changes:**
- Replace Charizard with SpriteAnimator
- Replace simple hint flags with HintLadder
- Add VoiceSystem for Three-Label Rule:
  - Prompt: "Red. Find red!"
  - During beam: voice stretches "Reeeed..."
  - On success: "Red! Red flame!"
- Add engagement line before each prompt: "Owen, point!"
- Add narration on enter: "Help tune my flame!"
- During intro animation: particles match target color
- During choice moment: dim background particles 50%, pause gem drift
- Owen: 2 choices, 400px apart, no drift (stable positions), primary colors, initial soft glow on correct
- Kian: 3-4 choices, progressive challenge (after 3 correct: speed round or recall)
- Wire tracker.recordAnswer() on correct/wrong
- Wire flameMeter.addCharge() on correct (2 for independent, 1 for hinted, 0.5 for auto-complete)
- Check for repeat concepts from tracker and prioritize them
- On wrong: "That's blue. Find red!" (label the wrong one AND redirect)
- Remove FeedbackSystem text rendering (replace with voice-driven specific praise)

**Step 1:** Rewrite the game following the pattern above. Keep the core mechanic (colored targets on screen, click matching one). Simplify phases to: banner → play → celebrate → next. Remove beam animation phase (voice label handles the educational moment during brief celebration).

**Step 2: Commit**

```bash
git add src/engine/games/flame-colors.ts
git commit -m "feat: rewrite Flame Colors with educational voice, hints, and adaptive tracking"
```

---

### Task 10: Rewrite Fireball Count Game

**Files:**
- Modify: `src/engine/games/fireball-count.ts`

**Key Changes:**
- Replace Charizard with SpriteAnimator
- Replace BabyCharmander with simple colored targets (circles/flames)
- **Core change: count feedback is INSTANT.** Click → pip lights up + voice says number IMMEDIATELY. Fireball animation is reward, not feedback.
- VoiceSystem: "Three. Count three!" → each click "One... Two... Three!" → "Three! Perfect charge!"
- During waddle-in/intro: rhythmic beats matching target number
- Owen: 1-3 only, exact targets, slow rhythmic counting, 5 prompts
- Kian: 1-7, overshoot is educational ("Oops — too many. We needed five."), 7 prompts
- Wire all shared systems (tracker, flame meter, hint ladder)
- Engagement line: "Owen, point!" / "Kian, count!"
- Narration: "Charge the right number!"

**Step 1:** Rewrite the game. Keep click-to-count mechanic. Remove BabyCharmander import. Use simple targets.

**Step 2: Commit**

```bash
git add src/engine/games/fireball-count.ts
git commit -m "feat: rewrite Fireball Count with instant feedback and educational voice"
```

---

### Task 11: Rewrite Evolution Tower Game

**Files:**
- Modify: `src/engine/games/evolution-tower.ts`

**Key Changes:**
- Replace Charizard with SpriteAnimator
- Make modes visually distinct: "Shape Forge" vs "Size Training"
- VoiceSystem: "Circle. Find circle." → "Circle... forging..." → "Circle forged!"
- Target shape appears as large 1s preview before choices
- Owen: circle/square/triangle only, 2 choices, no rotation/skew, big-vs-small for size
- Kian: extended shapes, negative prompts after 3 correct ("Which is NOT a triangle?")
- Shape → MCX anatomy tie-ins occasionally: "Triangle — like wings!"
- Wire all shared systems
- Engagement + narration: "Forge my armor!"
- Simplify: remove tower-perch finale (too long). Just celebrate on last block.

**Step 1:** Rewrite the game.

**Step 2: Commit**

```bash
git add src/engine/games/evolution-tower.ts
git commit -m "feat: rewrite Evolution Tower with educational voice and clearer modes"
```

---

### Task 12: Rewrite Sky Writer Game

**Files:**
- Modify: `src/engine/games/sky-writer.ts`

**Key Changes:**
- Replace Charizard with SpriteAnimator
- **Owen mode is letter EXPOSURE, not precision tracing:**
  - Giant letter silhouette first: "This is C!"
  - 2-3 stars only, 120px auto-snap radius
  - Auto-demo after 8s timeout
  - NO phonics quiz
  - "C! C for Charizard!"
  - 4 prompts
- **Kian mode alternates phonics to prevent fatigue:**
  - Letter 1: trace only
  - Letter 2: trace + phonics (2 choices, not 3)
  - Letter 3: trace only
  - 6 prompts
- While tracing: voice counts "One... two..." and repeats letter "C... C..."
- Completed letters become "power runes" (brief glow near sprite)
- Narration: "Write power runes!"
- Wire all shared systems

**Step 1:** Rewrite the game.

**Step 2: Commit**

```bash
git add src/engine/games/sky-writer.ts
git commit -m "feat: rewrite Sky Writer with letter exposure for Owen and paced phonics for Kian"
```

---

## Phase 4: Screen Updates (Tasks 13-15)

### Task 13: Opening Screen with Video + Sprites

**Files:**
- Modify: `src/engine/screens/opening.ts`

**Key Changes:**
- Simplify dramatically. On first visit: emit `play-video` for mega-evolution clip, then transition to hub when video ends.
- If no video file exists (graceful fallback): use simplified sprite-based opening:
  - Show charmander sprite (2s) → charmeleon sprite (2s) → charizard sprite (2s) → white flash → charizard-megax sprite (3s) → title
  - Much simpler than current 1674-line procedural animation
- On return visits: skip straight to hub

**Step 1:** Rewrite opening.ts to be much simpler (target: ~200 lines max).

**Step 2: Commit**

```bash
git add src/engine/screens/opening.ts
git commit -m "feat: simplify opening to video clip with sprite fallback"
```

---

### Task 14: Educational Calm Resets

**Files:**
- Modify: `src/engine/screens/calm-reset.ts`

**Key Changes:**
- Replace Charizard entity with SpriteAnimator
- Add light-touch educational reinforcement to each variation:
  - Power Up: slow color naming "Blue glow... blue..."
  - Stargazing: soft counting "One star... two stars... three..."
  - Flame Rest: size words "Small flame... big flame..."
- Voice is slow, gentle, whispered tempo
- Keep the regulation focus (no interactive elements, auto-transition)

**Step 1:** Update calm-reset.ts.

**Step 2: Commit**

```bash
git add src/engine/screens/calm-reset.ts
git commit -m "feat: add educational reinforcement to calm resets"
```

---

### Task 15: Finale with Video + Sprites

**Files:**
- Modify: `src/engine/screens/finale.ts`

**Key Changes:**
- Replace Charizard entity with SpriteAnimator
- On enter: play blast-burn video clip if available, then show sprite-based celebration
- Play ash-amazing voice
- Update to reference 4 gems (not 6)

**Step 1:** Update finale.ts.

**Step 2: Commit**

```bash
git add src/engine/screens/finale.ts
git commit -m "feat: update finale with video clip and sprites"
```

---

## Phase 5: Uncle Assist + Polish (Tasks 16-18)

### Task 16: Uncle Assist Overlays

**Files:**
- Modify: `src/engine/input.ts` (add H/D/M hotkeys)
- Modify: `src/state/session.svelte.ts` (add uncle assist state flags)

**Key Changes:**
- `H` key: Toggle correct-answer highlight (tiny corner dot on correct target)
- `D` key: Toggle debug overlay (current mode, hint level, success rate, concept tracking)
- All games check these flags during render and draw subtle indicators

**Step 1:** Add state flags and hotkey handlers.

**Step 2: Commit**

```bash
git add src/engine/input.ts src/state/session.svelte.ts
git commit -m "feat: add uncle assist hotkey overlays"
```

---

### Task 17: Delete Unused Entities + Clean Imports

**Files:**
- Delete: `src/engine/entities/charizard.ts` (1400 lines — replaced by sprites)
- Delete: `src/engine/entities/charmander.ts` (replaced by simple targets)
- Delete: `src/engine/entities/targets.ts` (replaced by inline game rendering)
- Clean up all import statements across all files

**Step 1:** Delete files.

**Step 2:** Run `npm run check` and fix any import errors.

**Step 3: Commit**

```bash
git add -u
git commit -m "chore: remove unused procedural entities (charizard, charmander, targets)"
```

---

### Task 18: Build, Test, Fix

**Files:** All

**Step 1: TypeScript check**
```bash
npm run check
```
Fix all type errors.

**Step 2: Build**
```bash
npm run build
```
Verify clean build.

**Step 3: Manual test checklist**
- [ ] Loading screen works
- [ ] Opening plays video (or sprite fallback)
- [ ] Hub shows 4 gem orbs with MCX sprite
- [ ] Flame Colors: voice labels 3x, hints escalate, Owen/Kian differences work
- [ ] Fireball Count: instant count feedback, voice counts along
- [ ] Evolution Tower: shape/size modes distinct, voice labels
- [ ] Sky Writer: Owen = exposure, Kian = trace + phonics alternating
- [ ] Calm resets have soft educational voice
- [ ] Gem collection triggers video
- [ ] Finale plays video + ash-amazing voice
- [ ] Mega Flame Charge meter fills and triggers spectacle
- [ ] Uncle assist: H shows correct answer, D shows debug
- [ ] Settings panel still works
- [ ] No console errors

**Step 4: Commit**
```bash
git add -A
git commit -m "fix: resolve all build issues and verify v3 integration"
```

---

## Asset Preparation (Manual — User Does These)

### Before Implementation Can Fully Work:

**Sprites (Required for Tasks 1-2):**
1. Download GIFs from `play.pokemonshowdown.com/sprites/ani/` (charmander, charmeleon, charizard, charizard-megax)
2. Convert to horizontal sprite sheet PNGs via https://ezgif.com/gif-to-sprite
3. Save to `public/sprites/` and update frame dimensions in `src/config/sprites.ts`

**Video Clips (Required for Task 6):**
1. Source 3 clips from Pokemon XY Mega Evolution Specials
2. Convert to MP4 (H.264): `ffmpeg -i source.mp4 -c:v libx264 -crf 23 -vf "scale=960:540" -movflags +faststart -an clip.mp4`
3. Save to `public/video/`

**Ash Voice Clips (Required for Task 2):**
1. Go to https://www.101soundboards.com/tts/72434-ash-ketchum-original-4kids-tts-computer-ai-voice
2. Generate ~19 phrases as MP3
3. Save to `public/audio/voice/`

**Note:** All code has graceful fallbacks. Sprites fall back to colored rectangles. Videos skip if missing. Voice falls back to Web Speech API. The game is fully functional without assets — they just make it better.

---

## Summary: 18 Tasks Across 5 Phases

| Phase | Tasks | What |
|-------|-------|------|
| 1. Foundation | 1-6 | SpriteAnimator, VoiceSystem, Tracker, FlameMeter, HintLadder, VideoOverlay |
| 2. Simplify | 7-8 | Remove 2 games, update hub to 4 gems + sprites |
| 3. Game Rewrites | 9-12 | Flame Colors, Fireball Count, Evolution Tower, Sky Writer |
| 4. Screens | 13-15 | Opening, Calm Reset, Finale |
| 5. Polish | 16-18 | Uncle assist, cleanup, build + test |
