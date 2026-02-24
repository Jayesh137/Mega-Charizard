# Mega Charizard Academy v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the game into an adventure-story educational experience with an accurate Mega Charizard X, synthesized sound, 6 mini-games (4 redesigned + 2 new), and always-wait-for-player pacing.

**Architecture:** Same two-layer model (Canvas engine + Svelte DOM overlay). Rewrite charizard.ts for accuracy. Add SFX synthesizer to audio.ts. Redesign all 4 existing games for story context + patience. Add 2 new games. Update hub with gem power-up system.

**Tech Stack:** Svelte 5 (Runes), Vite 7, TypeScript, HTML5 Canvas 2D, Web Audio API

**Reference docs:**
- `docs/plans/2026-02-23-v2-design.md` — full v2 design spec
- `RESEARCH-toddler-educational-games.md` — educational game research
- `PRD.md` — original requirements
- `architecture.md` — technical architecture

**IMPORTANT Svelte 5 syntax:** Use `$state`, `$props()`, `$effect` runes. Use `onclick` not `on:click`. Use `export function` for component methods.

---

## Phase 1: Core Fixes & Sound (Tasks 1-3)

### Task 1: Add Synthesized Sound Effects

Replace the empty audio file approach with Web Audio API procedural sound synthesis. No external audio files needed.

**Files:**
- Modify: `src/engine/audio.ts` — add SfxSynthesizer class and methods

**What to build:**

Add a `SfxSynthesizer` class inside `audio.ts` that generates sounds procedurally using OscillatorNode, GainNode, and noise buffers. The AudioManager should create an instance and expose `playSynth(name)`.

**Sounds to synthesize:**
1. `correct-chime` — Two ascending sine tones (C5 → E5, 100ms each, 0.3s total)
2. `wrong-bonk` — Short low triangle wave (100Hz, 80ms) with fast decay
3. `whoosh` — Filtered white noise sweep (highpass 2000→500Hz over 200ms)
4. `fireball` — Noise burst + descending sine (800→200Hz, 300ms)
5. `impact` — Short noise burst (50ms) + low sine thud (80Hz, 100ms)
6. `roar` — Layered: sawtooth (100Hz) + noise, 500ms, with vibrato
7. `pop` — Very short sine ping (880Hz, 40ms, fast attack/decay)
8. `bubble` — Frequency-modulated sine (300Hz base, 5Hz modulation, 200ms)
9. `hatch-crack` — Rapid noise crackles (3 short bursts, 30ms each)
10. `cheer` — Three ascending chime tones (C5, E5, G5, 80ms each)
11. `fire-crackle` — Ongoing filtered noise (call repeatedly for ambience)

**Implementation approach:**
```typescript
class SfxSynthesizer {
  private ctx: AudioContext;
  private output: GainNode;

  constructor(ctx: AudioContext, output: GainNode) {
    this.ctx = ctx;
    this.output = output;
  }

  play(name: string): void {
    switch (name) {
      case 'correct-chime': this.chime(); break;
      case 'wrong-bonk': this.bonk(); break;
      // ... etc
    }
  }

  private chime(): void {
    const now = this.ctx.currentTime;
    // Note 1: C5 (523Hz)
    this.tone(523, now, 0.12, 0.3);
    // Note 2: E5 (659Hz)
    this.tone(659, now + 0.12, 0.12, 0.3);
  }

  private bonk(): void {
    const now = this.ctx.currentTime;
    this.tone(100, now, 0.08, 0.25, 'triangle');
  }

  private tone(freq: number, startTime: number, duration: number, volume: number, type: OscillatorType = 'sine'): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(this.output);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  // ... noise(), whoosh(), roar() etc using similar patterns
}
```

Add to AudioManager:
```typescript
private synth: SfxSynthesizer;
// In constructor:
this.synth = new SfxSynthesizer(this.context, this.sfxGain);
// Public method:
playSynth(name: string): void { this.synth.play(name); }
```

**Verify:** `npm run build` passes. Manually test: click to unlock audio, then trigger sounds via browser console.

**Commit:** `feat: add procedural SFX synthesizer with 11 sound effects`

---

### Task 2: Fix All Game Pacing — Always Wait for Player

Remove auto-timeouts from all 4 existing games. Games must patiently wait for the uncle to click.

**Files:**
- Modify: `src/engine/games/flame-colors.ts`
- Modify: `src/engine/games/fireball-count.ts`
- Modify: `src/engine/games/evolution-tower.ts`
- Modify: `src/engine/games/sky-writer.ts`
- Modify: `src/config/constants.ts` — remove or increase PROMPT_TIMEOUT

**What to change in each game:**

In each game, find the timeout/auto-advance logic and remove it. Specifically:
- Remove any `setTimeout` that auto-completes or auto-advances after X seconds
- Remove any `phaseTimer` checks that auto-transition from "awaiting input" states
- Keep the fail-safe escalation (1 miss → bounce, 2 miss → glow, 3 miss → auto-complete) — this is click-triggered, not time-triggered
- MCX should idle patiently (flame flicker, gentle bob) while waiting

In `constants.ts`, change `PROMPT_TIMEOUT` from 5 to 999 (effectively infinite):
```typescript
export const PROMPT_TIMEOUT = 999; // Games wait for player — no auto-timeout
```

**For fireball-count specifically:** Also slow down fireballs:
- Change fireball flight duration from current speed to 1.5-2 seconds
- Add a 0.5s pause between consecutive fireball impacts
- Add visible count-up text as each fireball hits (rendered on canvas: "1!", "2!", "3!")

Search each game file for patterns like:
- `if (this.phaseTimer > PROMPT_TIMEOUT)` → remove or comment out
- `setTimeout(() => { this.autoComplete() }` → remove
- Any auto-advance timer in "awaiting" phases → remove

**Verify:** `npm run build`. Manually test: start a game, wait 30+ seconds — it should NOT auto-advance.

**Commit:** `fix: remove auto-timeouts, games always wait for player input`

---

### Task 3: Add Answer Feedback System

Create a reusable answer feedback system that all games use for right/wrong visual+audio feedback.

**Files:**
- Create: `src/engine/entities/feedback.ts`
- Modify: `src/engine/audio.ts` (if not already done in Task 1 — use `playSynth`)

**What to build:**

```typescript
// src/engine/entities/feedback.ts
import { ParticlePool } from './particles';

export class FeedbackSystem {
  private particles: ParticlePool;
  private feedbackText = '';
  private feedbackAlpha = 0;
  private feedbackScale = 1;
  private feedbackX = 0;
  private feedbackY = 0;
  private feedbackColor = '#FFD700';
  private feedbackTimer = 0;

  constructor(particles: ParticlePool) {
    this.particles = particles;
  }

  /** Show correct answer feedback at position */
  correct(x: number, y: number): void {
    this.feedbackText = 'GREAT!';
    this.feedbackColor = '#FFD700';
    this.feedbackAlpha = 1;
    this.feedbackScale = 0.5;
    this.feedbackX = x;
    this.feedbackY = y;
    this.feedbackTimer = 0;
    // Gold particle burst
    this.particles.burst(x, y, 25, '#FFD700', 200, 0.8);
    this.particles.burst(x, y, 15, '#FFFFFF', 150, 0.6);
  }

  /** Show wrong answer feedback at position */
  wrong(x: number, y: number): void {
    this.feedbackText = 'Try again!';
    this.feedbackColor = '#FF6B6B';
    this.feedbackAlpha = 1;
    this.feedbackScale = 0.5;
    this.feedbackX = x;
    this.feedbackY = y;
    this.feedbackTimer = 0;
  }

  /** Show hint feedback */
  hint(x: number, y: number): void {
    this.feedbackText = 'Look here!';
    this.feedbackColor = '#37B1E2';
    this.feedbackAlpha = 1;
    this.feedbackScale = 0.5;
    this.feedbackX = x;
    this.feedbackY = y;
    this.feedbackTimer = 0;
    // Blue glow particles
    this.particles.burst(x, y, 10, '#37B1E2', 80, 1.0);
  }

  update(dt: number): void {
    if (this.feedbackAlpha <= 0) return;
    this.feedbackTimer += dt;
    // Scale up quickly, then fade out
    this.feedbackScale = Math.min(1.0, this.feedbackScale + dt * 4);
    if (this.feedbackTimer > 0.8) {
      this.feedbackAlpha = Math.max(0, this.feedbackAlpha - dt * 2);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.feedbackAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.feedbackAlpha;
    ctx.font = `bold ${72 * this.feedbackScale}px Fredoka, sans-serif`;
    ctx.fillStyle = this.feedbackColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Text shadow/glow
    ctx.shadowColor = this.feedbackColor;
    ctx.shadowBlur = 20;
    ctx.fillText(this.feedbackText, this.feedbackX, this.feedbackY);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
```

Each game will create a `FeedbackSystem` instance and call `correct()`/`wrong()` on answer clicks, then `update(dt)` and `render(ctx)` in their main loops.

**Verify:** `npm run build`.

**Commit:** `feat: add reusable answer feedback system with particles`

---

## Phase 2: Accurate MCX Rebuild (Task 4)

### Task 4: Rewrite Mega Charizard X Procedural Drawing

Complete rewrite of `src/engine/entities/charizard.ts` to match the official Mega Charizard X design. This is the biggest single task — the MCX is the star of the game.

**Files:**
- Rewrite: `src/engine/entities/charizard.ts` (full file replacement)

**Design reference (from research):**

**Color palette:**
```typescript
const COL = {
  bodyDark:    '#1B1B2F',   // primary dark charcoal-black
  bodyMid:     '#2D2D44',   // midtone body
  bodyLight:   '#3A3A52',   // highlights on lit surfaces
  belly:       '#91CCEC',   // sky blue underbelly (jaw to tail)
  bellyLight:  '#B3E1F1',   // lighter belly highlights
  wingMembrane:'#3675AB',   // deep blue wing interior
  wingLight:   '#37B1E2',   // lighter wing membrane
  flameCore:   '#FFFFFF',   // white-hot flame center
  flameInner:  '#E0F7FF',   // ice white-blue
  flameMid:    '#37B1E2',   // bright blue
  flameOuter:  '#1A5C8A',   // deep blue
  eyeRed:      '#CC0000',   // crimson red iris
  eyeBright:   '#FF1A1A',   // bright red eye glow
  eyePupil:    '#FFFFFF',   // white vertical slit
  hornTip:     '#37B1E2',   // blue horn/spike tips
  spikeTip:    '#91CCEC',   // lighter blue spike tips
  claw:        '#D4C8A8',   // bone-white claws
  teeth:       '#F0E8D8',   // off-white teeth
  mouthInner:  '#0E0E1A',   // dark mouth interior
  outline:     '#0A0A14',   // near-black outlines
};
```

**Body structure to draw (back to front):**
1. **Back wing** — large, scalloped lower edge (3-4 rounded points), deep blue membrane, dark frame. No visible finger strut.
2. **Tail** — thick at base with 1 large spike, narrows to tip with 3 small spikes. Blue underside. Blue flame at tip (always burning).
3. **Legs** — muscular thighs, digitigrade (walks on toes like dinosaur), sky-blue soles, bone-white claws.
4. **Torso** — elongated oval, thinner than typical Charizard, dark body with blue undertone.
5. **Belly patch** — sky blue from lower jaw down chest and belly to tail. Lighter at center.
6. **Arms** — thin, with fused claw-hands (shortened fingers, not separated). Small wrist wing flaps. Larger claws than regular Charizard.
7. **Shoulder spikes** — 2 per shoulder (4 total), curving upward. Blue tips, dark bases.
8. **Neck** — shorter than regular Charizard. 2 small fin-spikes going down the lower neck. Blue underside.
9. **Head** — shorter snout, larger brow ridge, nose ridge, larger fangs visible.
10. **Horns** — 3 on back of head. Middle is longest. Blue tips, curve upward. 2 fin-spikes under each horn.
11. **Eyes** — crimson red with white vertical slit pupils. Red glow effect (shadowBlur).
12. **Jaw** — opens for roar/attack. Blue flames come from CORNERS of mouth (like draconic whiskers) — NOT from center.
13. **Mouth corner flames** — ALWAYS present. Two small blue flame jets from left and right corners of the mouth. These are MCX's signature feature.
14. **Front wing** — overlaps body, same scalloped style. Claw-like spike at 3rd wing joint.

**8 poses** (add 2 new: 'happy' and 'nudge'):
```typescript
export type CharizardPose = 'idle' | 'roar' | 'attack' | 'perch' | 'calm-rest' | 'fly' | 'happy' | 'nudge';
```
- `happy`: bouncy body bob (faster, bigger amplitude), wing flutter, brighter flames
- `nudge`: head tilts toward a direction, one arm extends pointing

**Key drawing improvements:**
- Use `bezierCurveTo` extensively for smooth organic curves (not angular polygons)
- Draw scalloped wing edges with alternating arcs
- Horns should be slightly curved, not straight triangles
- Belly patch should follow the torso contour naturally
- All body parts should use thick outlines (5px) as specified in art style
- Mouth corner flames: always spawn 1-2 small blue flame particles from each mouth corner, drifting slightly outward and upward
- The overall silhouette should be unmistakably a dragon standing upright

**The render method organization stays the same** — `render(ctx, cx, cy, scale)` draws all parts in order. Each `_draw*` method handles one body part with `ctx.save()/restore()`.

**Approximate proportions at scale=1.0 (design space pixels):**
- Total height including horns: ~350px
- Torso: 130px tall, 140px wide at shoulders
- Head: 70px tall, 80px wide (shorter/wider than regular)
- Wings: 250px span each side from shoulder
- Tail: 200px long including flame
- Legs: 90px from hip to foot
- Horns: middle 60px, sides 40px

**IMPORTANT:** Keep the exact same public API:
```typescript
export class Charizard {
  constructor(particles: ParticlePool, tweens: TweenManager)
  setPose(pose: CharizardPose): void
  getPose(): CharizardPose
  update(dt: number): void
  render(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void
}
```

This ensures all existing screens that use Charizard continue to work without changes.

**Verify:** `npm run build`. Open in browser — MCX should now look like a recognizable dark dragon with blue flames, red eyes, horns, shoulder spikes, scalloped wings.

**Commit:** `feat: rewrite MCX procedural drawing for accurate Mega Charizard X design`

---

## Phase 3: Redesign Existing Games (Tasks 5-8)

### Task 5: Redesign Flame Colors → Dragon Gem Hunt

Redesign the color recognition game with the adventure story wrapper.

**Files:**
- Rewrite: `src/engine/games/flame-colors.ts` (rename conceptually to "Dragon Gem Hunt")
- Modify: `src/content/colors.ts` (if needed for gem data)

**New game flow:**
1. **Banner phase** (2s): Turn banner shows whose turn it is
2. **Intro phase** (2s): MCX voice: "Find the [COLOR] gem!" — MCX holds up colored flame
3. **Play phase** (waits for click): 2-4 colored gems float SLOWLY across screen. Each gem is a large glowing circle (120px diameter) with a radial gradient and sparkle effect. Uncle clicks the matching gem.
4. **Correct**: MCX breathes fire at gem → gem flies to MCX → particles burst, `correct-chime` sound, feedback "GREAT!"
5. **Wrong**: Gem bounces back, `wrong-bonk` sound, MCX shakes head (nudge pose briefly), feedback "Try again!", wrong gem dims 30%
6. **After 3 misses**: MCX breathes fire toward correct gem (hint glow), auto-completes with gentler celebration
7. **Complete phase**: After 5 gems collected, "Gem collected!" celebration, transition to calm-reset

**Key changes from v1:**
- Gems float MUCH slower (half current speed)
- Gems are MUCH bigger (120px diameter vs current)
- Always waits for click — no timeout
- Uses FeedbackSystem for right/wrong
- Uses AudioManager.playSynth for sounds
- MCX is visible and reactive throughout

**Owen mode:** 2 gems, primary colors, hint glow after 5s idle
**Kian mode:** 3-4 gems, extended colors, no auto-hints

**Commit:** `feat: redesign flame colors as Dragon Gem Hunt with story wrapper`

---

### Task 6: Redesign Fireball Count → Feed the Charmanders

Redesign counting game with baby Charmanders and much slower pacing.

**Files:**
- Rewrite: `src/engine/games/fireball-count.ts`
- Create: `src/engine/entities/charmander.ts` — simple procedural baby Charmander drawing

**Baby Charmander entity:**
A much simpler, cuter version of the drawing. Small orange body, big head, big eyes, tiny flame tail. About 80px tall. Draws with ~5 shapes (head circle, body oval, eyes, tiny arms, tail flame).

```typescript
export function drawBabyCharmander(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, happy: boolean): void {
  // Simple cute baby dragon: orange body, big head, big sparkly eyes, tiny orange flame tail
  // When happy=true: eyes become stars, bounces slightly
}
```

**New game flow:**
1. **Banner phase**: Turn banner
2. **Intro phase**: Baby Charmanders waddle onto screen from the right, settling in a row. Number appears big: "3". Voice: "THREE baby dragons are hungry!"
3. **Play phase**: Uncle clicks anywhere to launch a fireball from MCX. Fireball arcs SLOWLY (2 second flight) to the next unfed Charmander. On impact:
   - Charmander catches the fireball (it's "food")
   - Charmander does a happy dance animation
   - Count-up text appears: "1!", then "2!", then "3!"
   - Voice counts along: "One! Two! Three!"
4. **After correct count**: All Charmanders cheer, MCX roars proudly, "GREAT!" feedback
5. **Overshoot (Kian mode)**: Extra fireball fizzles in mid-air, gentle "pffft" sound, "That's enough! They're full!"

**Key changes from v1:**
- Fireballs are MUCH slower (2s flight arc, not instant)
- 1-2 second pause between each fireball — uncle must click each time
- Visible count-up with each hit
- Baby Charmanders as visual targets (not stone pillars)
- Voice counts along

**Owen mode:** 1-3, Charmanders match count exactly
**Kian mode:** 1-7, more Charmanders than needed (must stop at right count)

**Commit:** `feat: redesign fireball count as Feed the Charmanders`

---

### Task 7: Redesign Evolution Tower → Build the Fortress

Lighter redesign — keep the tower-building mechanic but add story wrapper and fix pacing.

**Files:**
- Modify: `src/engine/games/evolution-tower.ts`

**Key changes:**
- Story context: "Build MCX's fortress!"
- Always waits for player click (remove any auto-timeout)
- Use FeedbackSystem for right/wrong
- Use playSynth for sounds
- MCX reacts to correct (happy pose) and wrong (nudge pose)
- Wrong answer: shape wobbles, voice says "That's a [SHAPE]! Find the [TARGET]!"
- Correct answer: MCX grabs block, flies up, SLAMS into wall with impact effect + sound
- After tower complete: MCX perches on top proudly

**No structural rewrite needed** — just pacing fixes, feedback integration, and story text.

**Commit:** `feat: redesign evolution tower as Build the Fortress with story wrapper`

---

### Task 8: Redesign Sky Writer → Magic Runes (with proper letter paths)

Major redesign of letter tracing with proper curved paths.

**Files:**
- Rewrite: `src/engine/games/sky-writer.ts`
- Modify: `src/content/letters.ts` — new letter path data with many more points

**New letter path data (curved, 8-15 points per letter):**
```typescript
// src/content/letters.ts additions
export const letterPaths: Record<string, { x: number; y: number }[]> = {
  C: [
    // Smooth C curve, 8 points, clockwise from top-right
    { x: 0.65, y: 0.15 }, { x: 0.40, y: 0.08 }, { x: 0.20, y: 0.18 },
    { x: 0.12, y: 0.35 }, { x: 0.10, y: 0.55 }, { x: 0.15, y: 0.75 },
    { x: 0.30, y: 0.88 }, { x: 0.55, y: 0.90 },
  ],
  S: [
    // Proper S curve, 10 points
    { x: 0.60, y: 0.12 }, { x: 0.40, y: 0.08 }, { x: 0.22, y: 0.15 },
    { x: 0.18, y: 0.30 }, { x: 0.30, y: 0.42 }, { x: 0.55, y: 0.50 },
    { x: 0.70, y: 0.62 }, { x: 0.72, y: 0.78 }, { x: 0.55, y: 0.90 },
    { x: 0.32, y: 0.88 },
  ],
  B: [
    // B with two bumps, 12 points
    { x: 0.25, y: 0.10 }, { x: 0.25, y: 0.25 }, { x: 0.25, y: 0.40 },
    { x: 0.45, y: 0.38 }, { x: 0.60, y: 0.30 }, { x: 0.55, y: 0.15 },
    { x: 0.25, y: 0.10 }, // back to spine for second bump
    { x: 0.25, y: 0.55 }, { x: 0.25, y: 0.70 },
    { x: 0.50, y: 0.72 }, { x: 0.65, y: 0.60 }, { x: 0.50, y: 0.48 },
  ],
  F: [
    // F shape, 8 points
    { x: 0.25, y: 0.90 }, { x: 0.25, y: 0.70 }, { x: 0.25, y: 0.50 },
    { x: 0.25, y: 0.30 }, { x: 0.25, y: 0.10 },
    { x: 0.45, y: 0.10 }, { x: 0.65, y: 0.10 }, // top bar
    // Back to spine, then middle bar
    // (handled as separate segment in game logic)
  ],
};
// Note: coordinates are 0-1 normalized, mapped to the star field area in the game
```

**Key changes from v1:**
- Letter paths have 8-15 points with proper curves (not 3-4 angular points)
- Stars are bigger (STAR_DOT_DIAMETER: 80px) and glow more
- MCX flies between stars leaving a blue fire trail (smooth bezier, not straight lines)
- After tracing: letter GLOWS brilliantly, voice says phonics
- Kian phonics mode: "What starts with S?" with 3 clickable word buttons (DOM overlay)
- Always waits for player — stars pulse gently to show next one
- Owen mode: very forgiving clicks (1.5x hit radius), stars auto-connect on near-click

**Commit:** `feat: redesign sky writer as Magic Runes with proper curved letter paths`

---

## Phase 4: New Mini-Games (Tasks 9-10)

### Task 9: Dragon Egg Sort (NEW game)

**Files:**
- Create: `src/engine/games/dragon-egg-sort.ts`
- Create: `src/engine/entities/nest.ts` — simple colored nest drawing

**Game structure:**
- Screen layout: 2-3 colored nests at bottom, eggs roll in from the right
- Each egg is a large oval (100px) with the nest's color + sparkle particles
- Voice announces: "This is a BLUE egg! Which nest?"
- Uncle clicks the matching nest
- Correct: egg rolls/bounces into nest, settles with glow, MCX breathes warm flame on it, `correct-chime`
- Wrong: egg bounces back, `wrong-bonk`, "That's the RED nest! Find the BLUE nest!"
- After all eggs sorted: eggs wobble, crack, baby dragon heads peek out, celebration!

**Implements GameScreen interface** with enter/update/render/exit/handleClick/handleKey.

Register in `GameCanvas.svelte` as `'dragon-egg-sort'`.

**Owen mode:** 2 nests (red/blue), one property
**Kian mode:** 3-4 nests, size sorting variant

**Commit:** `feat: add Dragon Egg Sort mini-game`

---

### Task 10: Charizard's Kitchen (NEW game)

**Files:**
- Create: `src/engine/games/charizard-kitchen.ts`

**Game structure:**
- MCX stands next to a large bubbling cauldron (left side of screen)
- Recipe scroll appears top-center: "3 RED berries!" (number + color blob + text)
- Colored berries (large circles with leaf detail, 90px) bounce gently around screen
- Uncle clicks berries matching the recipe color, one at a time
- Each correct berry flies into cauldron → cauldron bubbles → voice counts: "One! Two! Three!"
- Wrong color: berry bounces back, `wrong-bonk`, "That's BLUE! We need RED!"
- Too many: cauldron bubbles over, "Oops, too many!"
- Correct recipe complete: potion glows, MCX tastes it, power-up animation, celebration

**Owen mode:** 1-3 of ONE color, big berries, slow
**Kian mode:** Multi-ingredient: "2 BLUE berries AND 1 YELLOW star!"

**Commit:** `feat: add Charizard's Kitchen mini-game`

---

## Phase 5: Hub Redesign & Session Flow (Tasks 11-12)

### Task 11: Hub Redesign with Power Gem System

**Files:**
- Rewrite: `src/engine/screens/hub.ts`
- Modify: `src/state/session.svelte.ts` — add `gemsCollected: string[]` field
- Modify: `src/state/types.ts` — add new game names to GameName type

**New hub layout:**
- MCX perched center-right on volcanic mountain (existing position works)
- 6 gem orbs in an arc on the left side (replacing 4 orbs)
- Each orb shows: game icon, gem color, game name (small text below)
- Completed gems glow brightly and fill in; uncompleted ones are dim outlines
- Power meter at bottom: 6 slots showing collected gems
- MCX visibly reacts: more gems = brighter flames, bigger wing spread

**Gem orbs data:**
```typescript
const GEMS = [
  { color: '#FF3333', label: 'Gem Hunt', game: 'dragon-gem-hunt', icon: '🔥' },
  { color: '#FF8833', label: 'Feed', game: 'feed-charmanders', icon: '🐉' },
  { color: '#33CC33', label: 'Fortress', game: 'build-fortress', icon: '🛡️' },
  { color: '#3377FF', label: 'Runes', game: 'magic-runes', icon: '⭐' },
  { color: '#9933FF', label: 'Egg Sort', game: 'dragon-egg-sort', icon: '🥚' },
  { color: '#FFD700', label: 'Kitchen', game: 'charizard-kitchen', icon: '🧪' },
];
```

**When all 6 gems collected:** Auto-trigger finale (or uncle can trigger early with hidden control).

**Update types.ts:**
```typescript
export type GameName = 'dragon-gem-hunt' | 'feed-charmanders' | 'build-fortress' | 'magic-runes' | 'dragon-egg-sort' | 'charizard-kitchen';
```

**Commit:** `feat: redesign hub with 6-gem power-up system`

---

### Task 12: Update Session Flow & Screen Registration

Wire everything together: register all new screens, update game names, fix transitions.

**Files:**
- Modify: `src/components/GameCanvas.svelte` — register new screens, rename old ones
- Modify: `src/engine/screens/calm-reset.ts` — after calm reset, return to hub
- Modify: `src/engine/screens/finale.ts` — trigger when all 6 gems collected
- Modify: `src/App.svelte` — update handleGameReplay/handleGameNext for new game names

**Screen registration in GameCanvas.svelte:**
```typescript
screenManager.register('loading', new LoadingCanvasScreen());
screenManager.register('opening', new OpeningScreen());
screenManager.register('hub', new HubScreen());
screenManager.register('calm-reset', new CalmResetScreen());
screenManager.register('finale', new FinaleScreen());
screenManager.register('dragon-gem-hunt', new DragonGemHuntGame());
screenManager.register('feed-charmanders', new FeedCharmandersGame());
screenManager.register('build-fortress', new BuildFortressGame());
screenManager.register('magic-runes', new MagicRunesGame());
screenManager.register('dragon-egg-sort', new DragonEggSortGame());
screenManager.register('charizard-kitchen', new CharizardKitchenGame());
```

**Flow:** Hub → click gem orb → Game intro → Game → Victory (gem collected) → Calm Reset → Hub (gem now filled in) → ... → All 6 gems → Finale

**Commit:** `feat: wire v2 session flow with 6 games and gem collection`

---

## Phase 6: Polish & Ship (Tasks 13-14)

### Task 13: Visual Polish Pass

**Files:**
- All game files — ensure consistent visual quality
- `src/engine/entities/backgrounds.ts` — enhance backgrounds per game
- `src/engine/screens/opening.ts` — update to use new accurate MCX for the mega evolution finale

**Polish checklist:**
- [ ] All games use FeedbackSystem for right/wrong
- [ ] All games use playSynth for sounds
- [ ] All games wait for player click (no auto-timeout)
- [ ] MCX reactions: happy pose on correct, nudge on wrong
- [ ] Voice (Web Speech API) announces all prompts
- [ ] Gem collection animation when returning to hub
- [ ] Power meter fills visually
- [ ] Calm resets reference the adventure: "Great gem hunting!" / "Nice fortress building!"
- [ ] Opening sequence uses accurate MCX for the final mega evolution form

**Commit:** `feat: visual polish pass across all games and screens`

---

### Task 14: Final Build & Integration Test

**Verify:**
```bash
npm run build
npx serve dist -l 8080
```

**Manual testing checklist:**
- [ ] Loading screen → click → audio unlocks → transitions to opening/hub
- [ ] Opening Mega Evolution plays (first visit)
- [ ] Hub shows 6 gem orbs, MCX in idle pose
- [ ] Each mini-game starts, plays through with correct/wrong feedback, ends
- [ ] Games WAIT for player — no auto-advancing
- [ ] Turn banners alternate (Owen → Kian → Owen → ... → Team)
- [ ] Sound effects play on correct/wrong/celebration
- [ ] Voice prompts speak via Web Speech API
- [ ] Calm reset plays between activities
- [ ] Gems fill in on hub after completing games
- [ ] Finale triggers after 6 gems (or manual trigger)
- [ ] All hotkeys work (1/2/3/0/L/B/T/F/G/Esc/Space)
- [ ] Settings panel opens with G, all settings persist
- [ ] Performance stays at 60fps

**Commit:** `feat: complete Mega Charizard Academy v2`

---

## Implementation Order Summary

```
Phase 1: Core Fixes (Tasks 1-3)
  Synth SFX → Game Pacing → Feedback System

Phase 2: MCX Rebuild (Task 4)
  Accurate Mega Charizard X procedural drawing

Phase 3: Redesign Games (Tasks 5-8)
  Dragon Gem Hunt → Feed Charmanders → Build Fortress → Magic Runes

Phase 4: New Games (Tasks 9-10)
  Dragon Egg Sort → Charizard's Kitchen

Phase 5: Hub & Flow (Tasks 11-12)
  Hub Redesign → Session Wiring

Phase 6: Polish & Ship (Tasks 13-14)
  Visual Polish → Final Build
```

Each phase produces a working, buildable increment. Phase 1 fixes the core issues. Phase 2 makes MCX look right. Phase 3-4 rebuild/add the games. Phase 5 wires the flow. Phase 6 polishes and ships.
