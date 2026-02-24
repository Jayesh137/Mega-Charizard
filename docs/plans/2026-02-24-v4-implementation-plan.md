# Mega Charizard Academy v4 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the session into an evolution journey with live-evolving sprites, Ash Ketchum AI voice, rich anime clip library, new Phonics Arena + Evolution Challenge games, visual overhaul, and parental controls.

**Architecture:** Evolution Manager tracks session progress through 4 stages (Charmander → Charmeleon → Charizard → MCX). Clip Manager handles smart rotation of ~25-30 anime clips. Session Limiter enforces timeout, cooldowns, and daily limits via localStorage. All games get visual upgrades with themed backgrounds and Fredoka typography. Phonics Arena replaces Sky Writer tracing with recognition/phonics choices. Evolution Challenge is a new game about the evolution chain.

**Tech Stack:** Svelte 5 (Runes), TypeScript, HTML5 Canvas 2D, Web Audio API, Vite 7

**Design doc:** `docs/plans/2026-02-24-v4-design.md`

---

## Phase 1: Core Systems (Tasks 1-4)

These provide the foundation everything else depends on.

---

### Task 1: Evolution Manager

Creates the central system that tracks which evolution stage the player is at and triggers evolution transitions.

**Files:**
- Create: `src/engine/systems/evolution-manager.ts`
- Modify: `src/state/session.svelte.ts` — add evolution state fields
- Modify: `src/state/types.ts` — add EvolutionStage type

**Step 1: Add evolution types to `src/state/types.ts`**

Add after existing types:
```typescript
export type EvolutionStage = 'charmander' | 'charmeleon' | 'charizard' | 'megax';
```

**Step 2: Add evolution state to `src/state/session.svelte.ts`**

Add new state fields:
```typescript
let _evolutionStage = $state<EvolutionStage>('charmander');
let _evolutionMeter = $state(0);        // 0-100
let _evolutionMeterMax = $state(100);
let _gamesCompleted = $state(0);         // 0-4 this session
```

Expose as getters/setters. Update `reset()` to zero them.

**Step 3: Create `src/engine/systems/evolution-manager.ts`**

```typescript
import { session } from '../../state/session.svelte';
import type { EvolutionStage } from '../../state/types';

const THRESHOLDS: { stage: EvolutionStage; at: number }[] = [
  { stage: 'charmeleon', at: 33 },
  { stage: 'charizard', at: 66 },
  { stage: 'megax', at: 100 },
];

export class EvolutionManager {
  private lastStage: EvolutionStage = 'charmander';

  /** Add charge to evolution meter. Returns new stage if evolution triggered, null otherwise. */
  addCharge(amount: number): EvolutionStage | null {
    session.evolutionMeter = Math.min(
      session.evolutionMeter + amount,
      session.evolutionMeterMax,
    );
    const pct = (session.evolutionMeter / session.evolutionMeterMax) * 100;

    for (const t of THRESHOLDS) {
      if (pct >= t.at && this.lastStage !== t.stage && this.stageIndex(t.stage) > this.stageIndex(this.lastStage)) {
        this.lastStage = t.stage;
        session.evolutionStage = t.stage;
        return t.stage;
      }
    }
    return null;
  }

  /** Get sprite key for current evolution stage */
  get spriteKey(): string {
    switch (session.evolutionStage) {
      case 'charmander': return 'charmander';
      case 'charmeleon': return 'charmeleon';
      case 'charizard': return 'charizard';
      case 'megax': return 'charizard-megax';
    }
  }

  /** Get sprite scale — earlier stages are smaller */
  get spriteScale(): number {
    switch (session.evolutionStage) {
      case 'charmander': return 2;
      case 'charmeleon': return 2.5;
      case 'charizard': return 3;
      case 'megax': return 3;
    }
  }

  reset(): void {
    this.lastStage = 'charmander';
    session.evolutionStage = 'charmander';
    session.evolutionMeter = 0;
  }

  private stageIndex(stage: EvolutionStage): number {
    const order: EvolutionStage[] = ['charmander', 'charmeleon', 'charizard', 'megax'];
    return order.indexOf(stage);
  }
}
```

**Step 4: Build and verify**

Run: `npm run build`
Expected: Clean build, no errors.

**Step 5: Commit**

```bash
git add src/state/types.ts src/state/session.svelte.ts src/engine/systems/evolution-manager.ts
git commit -m "feat: add evolution manager system with stage tracking"
```

---

### Task 2: Session Limiter (Timeout + Daily Limits)

Creates the parental control system: 3-min timeout, 2hr cooldowns, 4 sessions/day max.

**Files:**
- Create: `src/engine/systems/session-limiter.ts`
- Modify: `src/state/settings.svelte.ts` — add persisted limit fields
- Modify: `src/engine/input.ts` — add `T` hotkey and `U+O` override

**Step 1: Add persisted fields to `src/state/settings.svelte.ts`**

Add to PersistedSettings interface and defaults:
```typescript
sessionsToday: number          // 0-4
lastSessionEnd: number         // Date.now() timestamp
dailyResetDate: string         // 'YYYY-MM-DD'
```

**Step 2: Create `src/engine/systems/session-limiter.ts`**

```typescript
import { settings } from '../../state/settings.svelte';

const TIMEOUT_DURATION = 3 * 60;     // 3 minutes in seconds
const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours in ms
const MAX_SESSIONS_PER_DAY = 4;
const DAILY_RESET_HOUR = 6;          // 6:00 AM

export class SessionLimiter {
  private _timedOut = false;
  private _timeoutRemaining = 0;

  get timedOut(): boolean { return this._timedOut; }
  get timeoutRemaining(): number { return this._timeoutRemaining; }
  get timeoutRemainingFormatted(): string {
    const m = Math.floor(this._timeoutRemaining / 60);
    const s = Math.floor(this._timeoutRemaining % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /** Check if daily counter needs reset (past 6AM on a new day) */
  checkDailyReset(): void {
    const today = new Date();
    const resetDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    if (today.getHours() >= DAILY_RESET_HOUR && settings.dailyResetDate !== resetDate) {
      settings.sessionsToday = 0;
      settings.dailyResetDate = resetDate;
    }
  }

  /** Can a new session start? */
  canStartSession(): { allowed: boolean; reason?: string; waitUntil?: number } {
    this.checkDailyReset();

    if (settings.sessionsToday >= MAX_SESSIONS_PER_DAY) {
      return { allowed: false, reason: 'daily-limit' };
    }

    const elapsed = Date.now() - settings.lastSessionEnd;
    if (settings.lastSessionEnd > 0 && elapsed < COOLDOWN_MS) {
      return { allowed: false, reason: 'cooldown', waitUntil: settings.lastSessionEnd + COOLDOWN_MS };
    }

    return { allowed: true };
  }

  /** Record a completed session */
  recordSessionEnd(): void {
    settings.sessionsToday++;
    settings.lastSessionEnd = Date.now();
  }

  /** Start timeout (discipline) */
  startTimeout(): void {
    this._timedOut = true;
    this._timeoutRemaining = TIMEOUT_DURATION;
  }

  /** End timeout early (uncle unlock) */
  endTimeout(): void {
    this._timedOut = false;
    this._timeoutRemaining = 0;
  }

  /** Toggle timeout on/off */
  toggleTimeout(): void {
    if (this._timedOut) {
      this.endTimeout();
    } else {
      this.startTimeout();
    }
  }

  /** Update timeout countdown. Returns true when timeout just ended. */
  update(dt: number): boolean {
    if (!this._timedOut) return false;
    this._timeoutRemaining -= dt;
    if (this._timeoutRemaining <= 0) {
      this._timedOut = false;
      this._timeoutRemaining = 0;
      return true; // timeout just ended
    }
    return false;
  }

  /** Uncle override — bypass all limits */
  override(): void {
    this.endTimeout();
    settings.sessionsToday = 0;
    settings.lastSessionEnd = 0;
  }
}
```

**Step 3: Add T hotkey and U+O override to `src/engine/input.ts`**

Add timeout callback injection:
```typescript
let timeoutToggleCb: (() => void) | null = null;
let overrideCb: (() => void) | null = null;
let uHeld = false;

export function registerTimeoutToggle(cb: () => void): void { timeoutToggleCb = cb; }
export function registerOverride(cb: () => void): void { overrideCb = cb; }
```

In `handleHotkey`, remap `'t'` from team turn to timeout:
```typescript
case 't': timeoutToggleCb?.(); return true;
```

For U+O override, track key states in onKeyDown/onKeyUp:
```typescript
// In onKeyDown: if key === 'u', start 3s timer. If 'o' pressed while u held, trigger override after 3s.
```

**Step 4: Build and verify**

Run: `npm run build`

**Step 5: Commit**

```bash
git add src/engine/systems/session-limiter.ts src/state/settings.svelte.ts src/engine/input.ts
git commit -m "feat: add session limiter with timeout, cooldown, and daily limits"
```

---

### Task 3: Clip Manager

Smart rotation system for the anime clip library.

**Files:**
- Create: `src/config/clips.ts` — clip metadata
- Create: `src/engine/systems/clip-manager.ts` — rotation logic

**Step 1: Create `src/config/clips.ts`**

```typescript
export type ClipCategory = 'intro' | 'evolution' | 'celebration' | 'calm' | 'encouragement' | 'finale';

export interface ClipDef {
  id: string;
  src: string;
  category: ClipCategory;
  duration: number;       // seconds
  description: string;
  evolutionStage?: string; // for evolution clips: which transition
}

export const CLIPS: ClipDef[] = [
  // Evolution clips (one per transition — these are sacred)
  { id: 'evo-charmander-charmeleon', src: './video/evo-charmander-charmeleon.mp4', category: 'evolution', duration: 6, description: 'Charmander evolves into Charmeleon', evolutionStage: 'charmeleon' },
  { id: 'evo-charmeleon-charizard', src: './video/evo-charmeleon-charizard.mp4', category: 'evolution', duration: 6, description: 'Charmeleon evolves into Charizard', evolutionStage: 'charizard' },
  { id: 'evo-mega-evolution', src: './video/evo-mega-charizard-x.mp4', category: 'evolution', duration: 10, description: 'Charizard Mega Evolves into Mega Charizard X', evolutionStage: 'megax' },

  // Intro clips (session start, rotated)
  { id: 'intro-i-choose-you', src: './video/intro-i-choose-you.mp4', category: 'intro', duration: 4, description: 'Ash throws Pokeball' },
  { id: 'intro-charmander-meet', src: './video/intro-charmander-meet.mp4', category: 'intro', duration: 4, description: 'Charmander first appearance' },
  { id: 'intro-team-ready', src: './video/intro-team-ready.mp4', category: 'intro', duration: 4, description: 'Ash and team ready to go' },

  // Celebration clips (correct answers, random)
  { id: 'cel-flamethrower', src: './video/cel-flamethrower.mp4', category: 'celebration', duration: 3, description: 'Charizard Flamethrower' },
  { id: 'cel-blast-burn', src: './video/cel-blast-burn.mp4', category: 'celebration', duration: 3, description: 'MCX Blast Burn' },
  { id: 'cel-ash-fistpump', src: './video/cel-ash-fistpump.mp4', category: 'celebration', duration: 2, description: 'Ash fist pump celebration' },
  { id: 'cel-victory-roar', src: './video/cel-victory-roar.mp4', category: 'celebration', duration: 2, description: 'Charizard victory roar' },
  { id: 'cel-dragon-claw', src: './video/cel-dragon-claw.mp4', category: 'celebration', duration: 3, description: 'MCX Dragon Claw' },
  { id: 'cel-seismic-toss', src: './video/cel-seismic-toss.mp4', category: 'celebration', duration: 4, description: 'Charizard Seismic Toss' },
  { id: 'cel-blue-aura', src: './video/cel-blue-aura.mp4', category: 'celebration', duration: 3, description: 'MCX blue flame aura ignite' },
  { id: 'cel-high-five', src: './video/cel-high-five.mp4', category: 'celebration', duration: 3, description: 'Ash and Charizard high five' },

  // Calm/transition clips
  { id: 'calm-flying-sunset', src: './video/calm-flying-sunset.mp4', category: 'calm', duration: 7, description: 'Charizard flying at sunset' },
  { id: 'calm-riding', src: './video/calm-riding.mp4', category: 'calm', duration: 7, description: 'Ash riding Charizard through clouds' },
  { id: 'calm-campfire', src: './video/calm-campfire.mp4', category: 'calm', duration: 7, description: 'Charmander by campfire' },
  { id: 'calm-sleeping', src: './video/calm-sleeping.mp4', category: 'calm', duration: 6, description: 'Charizard sleeping peacefully' },
  { id: 'calm-stargazing', src: './video/calm-stargazing.mp4', category: 'calm', duration: 7, description: 'Ash and Charizard stargazing' },

  // Encouragement clips (wrong answer, gentle)
  { id: 'enc-determined', src: './video/enc-determined.mp4', category: 'encouragement', duration: 2, description: 'Ash determined face' },
  { id: 'enc-shake-off', src: './video/enc-shake-off.mp4', category: 'encouragement', duration: 3, description: 'Charizard shakes it off' },
  { id: 'enc-encouraging', src: './video/enc-encouraging.mp4', category: 'encouragement', duration: 2, description: 'Ash warm encouragement' },

  // Finale clips
  { id: 'fin-blast-burn', src: './video/fin-blast-burn.mp4', category: 'finale', duration: 8, description: 'MCX ultimate Blast Burn' },
  { id: 'fin-victory-lap', src: './video/fin-victory-lap.mp4', category: 'finale', duration: 8, description: 'Victory celebration montage' },
];
```

**Step 2: Create `src/engine/systems/clip-manager.ts`**

```typescript
import { CLIPS, type ClipCategory, type ClipDef } from '../../config/clips';

export class ClipManager {
  private playedThisSession = new Set<string>();
  private lastPlayedId = '';

  /** Get a random clip from a category. Never repeats consecutively. Prefers unseen clips. */
  pick(category: ClipCategory, evolutionStage?: string): ClipDef | null {
    let pool = CLIPS.filter(c => c.category === category);

    if (evolutionStage) {
      pool = pool.filter(c => c.evolutionStage === evolutionStage);
    }

    if (pool.length === 0) return null;

    // Prefer clips not yet played this session
    const unseen = pool.filter(c => !this.playedThisSession.has(c.id));
    const candidates = unseen.length > 0 ? unseen : pool;

    // Never repeat last clip
    const filtered = candidates.length > 1
      ? candidates.filter(c => c.id !== this.lastPlayedId)
      : candidates;

    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    this.playedThisSession.add(pick.id);
    this.lastPlayedId = pick.id;
    return pick;
  }

  /** Get a specific evolution clip */
  getEvolutionClip(stage: string): ClipDef | null {
    return this.pick('evolution', stage);
  }

  /** Reset for new session */
  reset(): void {
    this.playedThisSession.clear();
    this.lastPlayedId = '';
  }
}
```

**Step 3: Build and verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/config/clips.ts src/engine/systems/clip-manager.ts
git commit -m "feat: add clip manager with smart rotation and clip metadata"
```

---

### Task 4: Ash Voice Line Config

Defines all Ash voice lines and updates the VoiceSystem to use them.

**Files:**
- Create: `src/config/ash-lines.ts` — all voice line definitions
- Modify: `src/engine/voice.ts` — use ash-lines config, prefer MP3 files over TTS

**Step 1: Create `src/config/ash-lines.ts`**

Define all ~80-100 Ash voice lines with categories, text, and file paths:

```typescript
export interface AshLine {
  id: string;
  text: string;
  file: string;        // path under public/audio/voice/ash/
  category: 'turn' | 'color' | 'number' | 'shape' | 'letter' | 'correct' | 'wrong' | 'evolution' | 'encourage' | 'iconic';
}

export const ASH_LINES: Record<string, AshLine[]> = {
  // Turn calls
  turn_owen: [
    { id: 'turn-owen-1', text: "Owen, it's your turn! Let's GO!", file: 'turn-owen-1.mp3', category: 'turn' },
    { id: 'turn-owen-2', text: "Owen! Show me what you got!", file: 'turn-owen-2.mp3', category: 'turn' },
    { id: 'turn-owen-3', text: "Your turn Owen! I believe in you!", file: 'turn-owen-3.mp3', category: 'turn' },
  ],
  turn_kian: [
    { id: 'turn-kian-1', text: "Kian, you're up! Let's GO!", file: 'turn-kian-1.mp3', category: 'turn' },
    { id: 'turn-kian-2', text: "Kian! Show me what you got!", file: 'turn-kian-2.mp3', category: 'turn' },
    { id: 'turn-kian-3', text: "Your turn Kian! Let's do this!", file: 'turn-kian-3.mp3', category: 'turn' },
  ],

  // Color prompts
  color_red: [
    { id: 'color-red-1', text: "Find the RED one!", file: 'color-red-1.mp3', category: 'color' },
    { id: 'color-red-2', text: "Where's RED? Find red!", file: 'color-red-2.mp3', category: 'color' },
  ],
  color_blue: [
    { id: 'color-blue-1', text: "Find the BLUE one!", file: 'color-blue-1.mp3', category: 'color' },
    { id: 'color-blue-2', text: "Where's BLUE? Find blue!", file: 'color-blue-2.mp3', category: 'color' },
  ],
  color_yellow: [
    { id: 'color-yellow-1', text: "Find the YELLOW one!", file: 'color-yellow-1.mp3', category: 'color' },
    { id: 'color-yellow-2', text: "Where's YELLOW? Find yellow!", file: 'color-yellow-2.mp3', category: 'color' },
  ],
  color_green: [
    { id: 'color-green-1', text: "Find the GREEN one!", file: 'color-green-1.mp3', category: 'color' },
  ],
  color_orange: [
    { id: 'color-orange-1', text: "Find the ORANGE one!", file: 'color-orange-1.mp3', category: 'color' },
  ],
  color_purple: [
    { id: 'color-purple-1', text: "Find the PURPLE one!", file: 'color-purple-1.mp3', category: 'color' },
  ],

  // Number prompts
  number_1: [{ id: 'num-1', text: "Count to ONE!", file: 'num-1.mp3', category: 'number' }],
  number_2: [{ id: 'num-2', text: "Count to TWO!", file: 'num-2.mp3', category: 'number' }],
  number_3: [{ id: 'num-3', text: "Count to THREE!", file: 'num-3.mp3', category: 'number' }],
  number_4: [{ id: 'num-4', text: "Count to FOUR!", file: 'num-4.mp3', category: 'number' }],
  number_5: [{ id: 'num-5', text: "Count to FIVE!", file: 'num-5.mp3', category: 'number' }],
  number_6: [{ id: 'num-6', text: "Count to SIX!", file: 'num-6.mp3', category: 'number' }],
  number_7: [{ id: 'num-7', text: "Count to SEVEN!", file: 'num-7.mp3', category: 'number' }],

  // Shape prompts
  shape_circle: [{ id: 'shape-circle', text: "Find the CIRCLE!", file: 'shape-circle.mp3', category: 'shape' }],
  shape_square: [{ id: 'shape-square', text: "Find the SQUARE!", file: 'shape-square.mp3', category: 'shape' }],
  shape_triangle: [{ id: 'shape-triangle', text: "Find the TRIANGLE!", file: 'shape-triangle.mp3', category: 'shape' }],
  shape_star: [{ id: 'shape-star', text: "Find the STAR!", file: 'shape-star.mp3', category: 'shape' }],
  shape_diamond: [{ id: 'shape-diamond', text: "Find the DIAMOND!", file: 'shape-diamond.mp3', category: 'shape' }],
  shape_hexagon: [{ id: 'shape-hexagon', text: "Find the HEXAGON!", file: 'shape-hexagon.mp3', category: 'shape' }],

  // Letter/phonics prompts
  letter_c: [{ id: 'letter-c', text: "What letter is this? C! C for Charizard!", file: 'letter-c.mp3', category: 'letter' }],
  letter_f: [{ id: 'letter-f', text: "What letter is this? F! F for Fire!", file: 'letter-f.mp3', category: 'letter' }],
  letter_s: [{ id: 'letter-s', text: "What letter is this? S! S for Star!", file: 'letter-s.mp3', category: 'letter' }],
  letter_b: [{ id: 'letter-b', text: "What letter is this? B! B for Blue!", file: 'letter-b.mp3', category: 'letter' }],

  // Correct answer reactions
  correct: [
    { id: 'correct-1', text: "YEAH! That's it!", file: 'correct-1.mp3', category: 'correct' },
    { id: 'correct-2', text: "AWESOME!", file: 'correct-2.mp3', category: 'correct' },
    { id: 'correct-3', text: "You did it!", file: 'correct-3.mp3', category: 'correct' },
    { id: 'correct-4', text: "ALRIGHT!", file: 'correct-4.mp3', category: 'correct' },
    { id: 'correct-5', text: "Amazing work!", file: 'correct-5.mp3', category: 'correct' },
    { id: 'correct-6', text: "That's the one!", file: 'correct-6.mp3', category: 'correct' },
    { id: 'correct-7', text: "INCREDIBLE!", file: 'correct-7.mp3', category: 'correct' },
    { id: 'correct-8', text: "Now THAT'S a trainer!", file: 'correct-8.mp3', category: 'correct' },
  ],

  // Wrong answer redirects
  wrong: [
    { id: 'wrong-1', text: "Not quite! Try again!", file: 'wrong-1.mp3', category: 'wrong' },
    { id: 'wrong-2', text: "Almost! Keep looking!", file: 'wrong-2.mp3', category: 'wrong' },
    { id: 'wrong-3', text: "Hmm, not that one!", file: 'wrong-3.mp3', category: 'wrong' },
    { id: 'wrong-4', text: "Try the other one!", file: 'wrong-4.mp3', category: 'wrong' },
  ],

  // Evolution hype
  evolution: [
    { id: 'evo-1', text: "Wait... something's happening!", file: 'evo-1.mp3', category: 'evolution' },
    { id: 'evo-2', text: "IT'S EVOLVING!!", file: 'evo-2.mp3', category: 'evolution' },
    { id: 'evo-charmeleon', text: "CHARMELEON!! We're getting stronger!", file: 'evo-charmeleon.mp3', category: 'evolution' },
    { id: 'evo-charizard', text: "CHARIZARD!! I CHOOSE YOU!!", file: 'evo-charizard.mp3', category: 'evolution' },
    { id: 'evo-mega', text: "MEGA EVOLUTION!!! MEGA CHARIZARD X!!!", file: 'evo-mega.mp3', category: 'evolution' },
    { id: 'evo-power', text: "I can feel the power!!", file: 'evo-power.mp3', category: 'evolution' },
  ],

  // Encouragement
  encourage: [
    { id: 'enc-1', text: "Don't give up!", file: 'enc-1.mp3', category: 'encourage' },
    { id: 'enc-2', text: "I believe in you!", file: 'enc-2.mp3', category: 'encourage' },
    { id: 'enc-3', text: "You can do it!", file: 'enc-3.mp3', category: 'encourage' },
    { id: 'enc-4', text: "We never give up! That's our way!", file: 'enc-4.mp3', category: 'encourage' },
    { id: 'enc-5', text: "Keep trying trainer!", file: 'enc-5.mp3', category: 'encourage' },
  ],

  // Iconic Ash lines
  iconic: [
    { id: 'iconic-1', text: "I choose you!", file: 'iconic-1.mp3', category: 'iconic' },
    { id: 'iconic-2', text: "Let's win this together!", file: 'iconic-2.mp3', category: 'iconic' },
    { id: 'iconic-3', text: "This is just the beginning!", file: 'iconic-3.mp3', category: 'iconic' },
    { id: 'iconic-4', text: "We're gonna be the very best!", file: 'iconic-4.mp3', category: 'iconic' },
    { id: 'iconic-5', text: "Let's GO!", file: 'iconic-5.mp3', category: 'iconic' },
  ],

  // Timeout
  timeout_start: [{ id: 'timeout-start', text: "Charizard needs a rest.", file: 'timeout-start.mp3', category: 'iconic' }],
  timeout_end: [{ id: 'timeout-end', text: "Welcome back trainers! Let's be good this time!", file: 'timeout-end.mp3', category: 'iconic' }],

  // Session limit
  session_end: [{ id: 'session-end', text: "Great training today!", file: 'session-end.mp3', category: 'iconic' }],
  daily_limit: [{ id: 'daily-limit', text: "Charizard gave it everything today! See you tomorrow!", file: 'daily-limit.mp3', category: 'iconic' }],
};
```

**Step 2: Update `src/engine/voice.ts`**

Modify VoiceSystem to check for MP3 files first, fall back to Web Speech API:

```typescript
// Add method: playAshLine(key: string) — looks up ASH_LINES[key], picks random,
// tries to play MP3 file, falls back to TTS with the text.
```

**Step 3: Build and verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/config/ash-lines.ts src/engine/voice.ts
git commit -m "feat: add Ash voice line config and MP3-first voice system"
```

---

## Phase 2: New Games (Tasks 5-6)

---

### Task 5: Phonics Arena (Replaces Sky Writer)

Constellation letters draw themselves. Kids choose what letter or what sound — no tracing.

**Files:**
- Create: `src/engine/games/phonics-arena.ts`
- Modify: `src/components/GameCanvas.svelte` — register new game, remove sky-writer
- Modify: `src/state/types.ts` — update GameName type

**Step 1: Update `src/state/types.ts`**

Replace `'sky-writer'` with `'phonics-arena'` in GameName union.

**Step 2: Create `src/engine/games/phonics-arena.ts`**

Implements GameScreen. Key phases: banner → engage → show-letter (constellation draws itself over 3s) → choice (2-3 buttons) → celebrate → next.

Owen mode: "What letter is this?" — 2 letter choices.
Kian mode: alternates letter recognition and "What sound does this make?" — 2 sound choices.

The constellation rendering reuses `letterPaths` from `content/letters.ts` but draws ALL points automatically (not player-traced). Stars appear one by one with blue fire trails connecting them.

Choice buttons are large rounded cards (360×110px) with bold text, positioned in lower third.

**Step 3: Update `src/components/GameCanvas.svelte`**

Replace sky-writer import and registration with phonics-arena:
```typescript
import { PhonicsArenaGame } from '../engine/games/phonics-arena';
// ...
screenManagerRef.register('phonics-arena', new PhonicsArenaGame());
```

**Step 4: Update hub.ts gem references**

Change the 4th gem's game from `'sky-writer'` to `'phonics-arena'`.

**Step 5: Build and verify**

Run: `npm run build`

**Step 6: Commit**

```bash
git add src/engine/games/phonics-arena.ts src/components/GameCanvas.svelte src/state/types.ts src/engine/screens/hub.ts
git commit -m "feat: add Phonics Arena game replacing Sky Writer tracing"
```

---

### Task 6: Evolution Challenge (New Game)

"Who evolves into who?" and "Put them in order!" game.

**Files:**
- Create: `src/engine/games/evolution-challenge.ts`
- Modify: `src/components/GameCanvas.svelte` — register
- Modify: `src/state/types.ts` — add to GameName

**Step 1: Update `src/state/types.ts`**

Add `'evolution-challenge'` to GameName union.

**Step 2: Create `src/engine/games/evolution-challenge.ts`**

Two alternating modes:
- **Recognition mode:** Shows a sprite (e.g. Charmander), asks "Who does Charmander become?" — 2-3 SpriteAnimator choices render as interactive cards. Correct = Charmeleon.
- **Order mode:** Shows 2-4 scrambled sprite cards. Player taps them in evolution order. Owen: 2 stages, Kian: 4 stages.

Uses SpriteAnimator instances for each evolution stage. Visual: stadium/arena background with energy particles.

**Step 3: Register in GameCanvas.svelte**

**Step 4: Build and verify**

Run: `npm run build`

**Step 5: Commit**

```bash
git add src/engine/games/evolution-challenge.ts src/components/GameCanvas.svelte src/state/types.ts
git commit -m "feat: add Evolution Challenge game with recognition and ordering modes"
```

---

## Phase 3: Session Flow Integration (Tasks 7-9)

---

### Task 7: Evolving Corner Sprite

Replace the static MCX sprite in all games with a dynamic sprite that matches the current evolution stage.

**Files:**
- Modify: `src/engine/games/flame-colors.ts`
- Modify: `src/engine/games/fireball-count.ts`
- Modify: `src/engine/games/evolution-tower.ts`
- Modify: `src/engine/games/phonics-arena.ts`
- Modify: `src/engine/games/evolution-challenge.ts`

**Step 1: In each game**

Replace the hardcoded `new SpriteAnimator(SPRITES['charizard-megax'])` with dynamic lookup:

```typescript
import { session } from '../../state/session.svelte';
import { SPRITES } from '../../config/sprites';

// In enter():
const spriteKey = session.evolutionStage === 'megax' ? 'charizard-megax' : session.evolutionStage;
this.sprite = new SpriteAnimator(SPRITES[spriteKey]);
```

Also adjust sprite scale per stage (Charmander smaller, MCX bigger).

**Step 2: Build and verify**

Run: `npm run build`

**Step 3: Commit**

```bash
git commit -m "feat: dynamic corner sprite matches current evolution stage"
```

---

### Task 8: Hub Screen Overhaul

Replace gem-collection hub with evolution journey hub. Show current evolution stage, evolution meter, and next game button.

**Files:**
- Modify: `src/engine/screens/hub.ts` — major rework

**Step 1: Rework hub.ts**

Replace 4-gem grid with:
- Large center sprite (current evolution stage, animated)
- Evolution meter bar below sprite (shows progress to next evolution)
- "Start Training!" button or auto-launch next game
- Session info: "Session 2 of 4" in corner
- After all 4 games: auto-transition to finale

**Step 2: Integrate SessionLimiter**

On hub enter, check `sessionLimiter.canStartSession()`. If blocked, show cooldown/limit screen instead.

**Step 3: Build and verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git commit -m "feat: overhaul hub screen with evolution journey display"
```

---

### Task 9: Session Flow Wiring

Wire the complete session flow: intro → game1 → evolution → game2 → evolution → game3 → mega evolution → game4 → finale.

**Files:**
- Modify: `src/engine/screens/hub.ts` — game sequencing logic
- Modify: `src/engine/screens/calm-reset.ts` — evolution transitions between games
- Modify: `src/engine/screens/opening.ts` — intro clip rotation
- Modify: `src/engine/screens/finale.ts` — enhanced finale

**Step 1: Game sequencing in hub**

Hub tracks `session.gamesCompleted` (0-4). Each time a game completes and returns to hub:
- gamesCompleted++
- Evolution manager checks meter, triggers evolution if threshold crossed
- If evolution triggered: play evolution clip → show new sprite → then present next game
- If gamesCompleted === 4: transition to finale

**Step 2: Integrate ClipManager into calm-reset**

Replace static breathing with clip-enhanced transitions. After game completes: play random calm/transition clip → evolution tease if close to threshold → then back to hub.

**Step 3: Intro clip rotation in opening.ts**

Use ClipManager to pick a random intro clip instead of always playing mega-evolution.mp4.

**Step 4: Enhanced finale**

Play finale clip from ClipManager. Show all 4 evolution stages. Ash celebrates.

**Step 5: Build and verify**

Run: `npm run build`

**Step 6: Commit**

```bash
git commit -m "feat: wire complete evolution journey session flow"
```

---

## Phase 4: Parental Control UI (Tasks 10-11)

---

### Task 10: Timeout Overlay

Visual timeout screen with sleeping Charizard and countdown.

**Files:**
- Create: `src/components/TimeoutOverlay.svelte`
- Modify: `src/App.svelte` — mount overlay, wire events

**Step 1: Create `src/components/TimeoutOverlay.svelte`**

Full-screen overlay (z-index 200, above everything):
- Dark dimmed background
- Large sleeping Charizard sprite (eyes closed, dimmed flame, gentle breathing animation via CSS)
- Big countdown timer in center: "2:47" format, Fredoka font, 120px
- "Charizard needs a rest" text above timer
- When timer ends: wake-up animation, fade out

**Step 2: Wire in App.svelte**

Add TimeoutOverlay component. Connect to SessionLimiter via events or direct state polling. T hotkey toggles timeout.

**Step 3: Build and verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git commit -m "feat: add timeout overlay with sleeping Charizard countdown"
```

---

### Task 11: Session Limit Overlay

"Come back later" and "See you tomorrow" screens.

**Files:**
- Create: `src/components/SessionLimitOverlay.svelte`
- Modify: `src/App.svelte` — mount overlay

**Step 1: Create `src/components/SessionLimitOverlay.svelte`**

Two modes:
- **Cooldown mode:** "Charizard is resting! Come back at 3:00 PM" with sleeping sprite and clock
- **Daily limit mode:** "Charizard gave it everything today! See you tomorrow, trainers!" with night scene, moon, sleeping sprite

**Step 2: Wire in App.svelte**

Hub checks SessionLimiter on enter. If blocked, shows this overlay instead of game content.

**Step 3: Build and verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git commit -m "feat: add session limit overlays for cooldown and daily cap"
```

---

## Phase 5: Visual Overhaul (Tasks 12-14)

---

### Task 12: Typography — Fredoka Font

Replace all `system-ui` with Fredoka across the entire codebase.

**Files:**
- Modify: `index.html` — add Google Fonts link for Fredoka
- Modify: All game files, all screen files, all components — replace font references
- Modify: `src/config/theme.ts` — add font constants

**Step 1: Add Fredoka to `index.html`**

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Step 2: Add font constant to `src/config/theme.ts`**

```typescript
export const FONT = "'Fredoka', 'Nunito', sans-serif";
```

**Step 3: Find-and-replace all canvas font references**

Replace all `'bold Npx system-ui'` with `'bold Npx Fredoka, Nunito, sans-serif'` (or use FONT constant).

**Step 4: Update CSS in all Svelte components**

Replace `font-family` references.

**Step 5: Build and verify**

Run: `npm run build`

**Step 6: Commit**

```bash
git commit -m "feat: replace system-ui with Fredoka font throughout"
```

---

### Task 13: Per-Game Visual Improvements

Upgrade backgrounds, choice rendering, and effects for each game.

**Files:**
- Modify: `src/engine/games/flame-colors.ts` — Mega Stone gems, volcanic cave background
- Modify: `src/engine/games/fireball-count.ts` — fire pillars, arena background
- Modify: `src/engine/games/evolution-tower.ts` — armor forge, stone pedestals
- Modify: `src/engine/entities/backgrounds.ts` — add themed background variants

**Step 1: Add themed backgrounds to `backgrounds.ts`**

Add methods or subclasses for:
- `renderVolcanicCave(ctx)` — deep red/orange gradient, stalactites, lava glow
- `renderArena(ctx)` — rocky terrain, dramatic sky, torches
- `renderForge(ctx)` — dark interior, anvil silhouette, orange ember glow
- `renderMountainNight(ctx)` — deep blue, stars, moon, mountain silhouette

**Step 2: Update each game**

Replace `new Background()` with themed variant. Update choice rendering with glowing platforms, larger touch targets, better visual hierarchy.

**Step 3: Build and verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git commit -m "feat: add themed backgrounds and visual upgrades for all games"
```

---

### Task 14: Evolution Meter Visual

Replace the thin flame meter bar with a Mega Stone evolution meter.

**Files:**
- Modify: `src/engine/entities/flame-meter.ts` → refactor into evolution meter visual

**Step 1: Redesign render method**

Replace the thin bar with:
- Mega Stone shape (diamond/gem icon) that fills with blue energy
- Glow intensity increases as meter fills
- Stage markers at 33%, 66%, 100% with small sprite icons
- Current stage label below

**Step 2: Build and verify**

Run: `npm run build`

**Step 3: Commit**

```bash
git commit -m "feat: redesign evolution meter as Mega Stone visual"
```

---

## Phase 6: Focus Weighting + Polish (Tasks 15-16)

---

### Task 15: Focus Area Weighting

Weight game selection toward each kid's learning focus.

**Files:**
- Create: `src/engine/systems/focus-weight.ts`
- Modify: Hub game selection logic

**Step 1: Create `src/engine/systems/focus-weight.ts`**

```typescript
import { session } from '../../state/session.svelte';
import type { GameName } from '../../state/types';

/** Owen-weighted: more color games. Kian-weighted: more phonics games. */
export function pickNextGame(gamesCompleted: number): GameName {
  const isOwen = session.currentTurn === 'owen';

  // Game 3 is always evolution-challenge
  if (gamesCompleted === 2) return 'evolution-challenge';

  const owenWeighted: GameName[] = ['flame-colors', 'flame-colors', 'fireball-count', 'evolution-tower', 'phonics-arena'];
  const kianWeighted: GameName[] = ['phonics-arena', 'phonics-arena', 'fireball-count', 'evolution-tower', 'flame-colors'];

  const pool = isOwen ? owenWeighted : kianWeighted;
  return pool[Math.floor(Math.random() * pool.length)];
}
```

**Step 2: Integrate into hub game selection**

Replace direct gem-click game selection with `pickNextGame()`.

**Step 3: Build and verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git commit -m "feat: add focus area weighting for Owen (colors) and Kian (phonics)"
```

---

### Task 16: Cross-Game Reinforcement in Voice

Add color echoes for Owen and letter echoes for Kian in non-focus games.

**Files:**
- Modify: `src/engine/voice.ts` — add cross-reinforcement methods
- Modify: Each game's handleCorrect — call cross-reinforcement after success echo

**Step 1: Add methods to VoiceSystem**

```typescript
/** Owen reinforcement: echo a color name after any correct answer */
crossReinforcColor(colorWord: string): void { ... }

/** Kian reinforcement: echo a letter/sound after any correct answer */
crossReinforcPhonics(letter: string, sound: string): void { ... }
```

**Step 2: Call in each game's handleCorrect**

After the main success echo, if Owen's turn → voice.crossReinforcColor(). If Kian's turn → voice.crossReinforcPhonics().

**Step 3: Build and verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git commit -m "feat: add cross-game reinforcement for focus areas"
```

---

## Phase 7: Assets (Tasks 17-18)

---

### Task 17: Source and Add Video Clips

Download, trim, and add all ~25-30 anime clips.

**Work:**
1. Source clips from Pokemon XY&Z, Mega Evolution Specials, Journeys, Original Series
2. Trim to specified durations (2-12s per clip)
3. Crop to 16:9, scale to 720p minimum
4. Strip audio tracks (voice system handles audio)
5. Encode as MP4 h264, <2MB per clip
6. Save to `public/video/` with naming convention from clips.ts

**Naming convention:** Category prefix + descriptor:
```
public/video/
  evo-charmander-charmeleon.mp4
  evo-charmeleon-charizard.mp4
  evo-mega-charizard-x.mp4
  intro-i-choose-you.mp4
  intro-charmander-meet.mp4
  cel-flamethrower.mp4
  cel-blast-burn.mp4
  ...etc
```

**Step 1: Source and process all clips**
**Step 2: Add to public/video/**
**Step 3: Verify all paths in clips.ts match actual files**
**Step 4: Commit**

```bash
git add public/video/
git commit -m "feat: add 25+ anime video clips for evolution journey"
```

---

### Task 18: Generate Ash Voice Lines

Generate all ~80-100 Ash voice lines using ElevenLabs.

**Work:**
1. Set up ElevenLabs account with Ash voice clone
2. Train clone on clean Ash audio from Pokemon XY/XYZ
3. Generate all lines from `ash-lines.ts` config
4. Save as MP3 to `public/audio/voice/ash/`
5. Test playback in game

**Step 1: Generate all MP3 files**
**Step 2: Add to `public/audio/voice/ash/`**
**Step 3: Verify VoiceSystem plays them correctly**
**Step 4: Commit**

```bash
git add public/audio/voice/ash/
git commit -m "feat: add Ash Ketchum AI voice lines"
```

---

## Phase 8: Cleanup (Task 19)

---

### Task 19: Remove Sky Writer + Legacy Cleanup

**Files:**
- Delete: `src/engine/games/sky-writer.ts`
- Modify: Any remaining references to sky-writer
- Update: `docs/plans/` with v4 completion notes

**Step 1: Delete sky-writer.ts**
**Step 2: Search for and remove all sky-writer references**
**Step 3: Final build verification**

Run: `npm run build`
Expected: Clean build with 0 errors.

**Step 4: Commit**

```bash
git commit -m "chore: remove sky-writer and legacy cleanup for v4"
```

---

## Task Dependency Graph

```
Phase 1 (Foundation):  Task 1 → Task 2 → Task 3 → Task 4
                            ↓
Phase 2 (Games):       Task 5 (Phonics Arena)
                       Task 6 (Evolution Challenge)
                            ↓
Phase 3 (Integration): Task 7 → Task 8 → Task 9
                            ↓
Phase 4 (Controls):    Task 10, Task 11 (parallel)
                            ↓
Phase 5 (Visual):      Task 12 → Task 13, Task 14 (parallel)
                            ↓
Phase 6 (Polish):      Task 15, Task 16 (parallel)
                            ↓
Phase 7 (Assets):      Task 17, Task 18 (parallel, can start anytime)
                            ↓
Phase 8 (Cleanup):     Task 19
```

**Total: 19 tasks across 8 phases.**
