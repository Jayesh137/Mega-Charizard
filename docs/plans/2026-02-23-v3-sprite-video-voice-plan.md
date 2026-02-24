# V3: Sprites, Video Clips, Ash Voice & Simplified Games

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace procedural Charizard drawing with animated pixel sprites, add anime video clips at key moments, integrate Ash Ketchum AI voice, simplify to 4 core games, and update hub to 4-gem system.

**Architecture:** Swap the 1400-line procedural `Charizard` entity with a `SpriteAnimator` that renders Showdown animated sprite sheets on canvas. Add a `VideoPlayer` component (Svelte DOM overlay) for anime clips at opening/gem-collection/finale. Replace Web Speech API fallback with pre-generated Ash Ketchum TTS MP3s. Remove Dragon Egg Sort and Charizard's Kitchen games, simplify hub to 4 gems.

**Tech Stack:** Svelte 5 + Vite 7 + TypeScript, HTML5 Canvas sprite sheets, HTML5 `<video>` overlay, Web Audio API for voice clips

---

## Asset Preparation (Manual — Before Coding)

These steps must be done by the user before or during implementation:

### Sprites (do first)
1. Download Mega Charizard X animated GIF from `https://play.pokemonshowdown.com/sprites/ani/charizard-megax.gif`
2. Also download: `charizard-megax.gif` (back: `/sprites/ani-back/charizard-megax.gif`)
3. Also download regular Charizard: `/sprites/ani/charizard.gif` (for opening sequence pre-mega form)
4. Also download Charmander: `/sprites/ani/charmander.gif` and Charmeleon: `/sprites/ani/charmeleon.gif`
5. Convert each GIF to a horizontal sprite sheet PNG using https://ezgif.com/gif-to-sprite
6. Save sprite sheets to `public/sprites/` as:
   - `public/sprites/charmander.png` + note frame count & frame dimensions
   - `public/sprites/charmeleon.png`
   - `public/sprites/charizard.png`
   - `public/sprites/charizard-megax.png`
   - `public/sprites/charizard-megax-back.png`

### Video Clips (do second)
1. Source 3-5 short clips from Pokemon XY Mega Evolution Specials:
   - `mega-evolution.mp4` (~8-10s) — the Mega Evolution transformation
   - `victory-roar.mp4` (~3-5s) — MCX roaring/celebrating
   - `blast-burn.mp4` (~3-5s) — MCX fire attack
2. Convert to WebM (VP9) + MP4 (H.264) for browser compatibility:
   ```bash
   ffmpeg -i source.mp4 -c:v libvpx-vp9 -b:v 1M -vf "scale=960:540" -an clip.webm
   ffmpeg -i source.mp4 -c:v libx264 -crf 23 -vf "scale=960:540" -movflags +faststart -an clip.mp4
   ```
3. Save to `public/video/`

### Ash Voice Clips (do third)
1. Go to https://www.101soundboards.com/tts/72434-ash-ketchum-original-4kids-tts-computer-ai-voice
2. Generate and download these phrases as MP3:
   - `ash-i-choose-you.mp3` — "I choose you!"
   - `ash-alright.mp3` — "Alright!"
   - `ash-yeah.mp3` — "Yeah!"
   - `ash-great-job.mp3` — "Great job, trainer!"
   - `ash-awesome.mp3` — "Awesome!"
   - `ash-try-again.mp3` — "Try again!"
   - `ash-not-quite.mp3` — "Not quite! Try again!"
   - `ash-owen-turn.mp3` — "Owen's turn!"
   - `ash-kian-turn.mp3` — "Kian's turn!"
   - `ash-team-turn.mp3` — "Team time! Let's go!"
   - `ash-power-gem.mp3` — "You earned a Power Gem!"
   - `ash-find-color.mp3` — "Find the right color!"
   - `ash-count-them.mp3` — "Count them up!"
   - `ash-match-shape.mp3` — "Match the shape!"
   - `ash-trace-letter.mp3` — "Trace the letter!"
   - `ash-welcome.mp3` — "Welcome to Mega Charizard Academy!"
   - `ash-amazing.mp3` — "Amazing training, trainers!"
   - `ash-lets-go.mp3` — "Let's go!"
   - `ash-ready.mp3` — "Are you ready?"
3. Save all to `public/audio/voice/`

---

## Task 1: Create SpriteAnimator Entity

**Files:**
- Create: `src/engine/entities/sprite-animator.ts`

**Step 1: Write the SpriteAnimator class**

```typescript
// src/engine/entities/sprite-animator.ts
// Renders an animated sprite sheet on canvas.
// Loads a horizontal strip PNG where each frame is side-by-side.

export interface SpriteConfig {
  src: string;           // path to sprite sheet PNG
  frameWidth: number;    // width of a single frame in pixels
  frameHeight: number;   // height of a single frame in pixels
  frameCount: number;    // total number of frames
  fps: number;           // playback speed
  loop?: boolean;        // default true
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
  get paused(): boolean { return this._paused; }

  pause(): void { this._paused = true; }
  resume(): void { this._paused = false; }

  /** Reset to first frame */
  reset(): void {
    this.currentFrame = 0;
    this.elapsed = 0;
  }

  /** Set a specific frame (0-indexed) */
  setFrame(frame: number): void {
    this.currentFrame = Math.max(0, Math.min(frame, this.config.frameCount - 1));
  }

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

  /**
   * Render the current frame centered at (cx, cy) with given scale.
   * The sprite is drawn centered (not top-left).
   */
  render(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number = 1): void {
    if (!this._loaded) return;

    const fw = this.config.frameWidth;
    const fh = this.config.frameHeight;
    const sx = this.currentFrame * fw;
    const dw = fw * scale;
    const dh = fh * scale;

    ctx.imageSmoothingEnabled = false; // keep pixel art crisp
    ctx.drawImage(
      this.image,
      sx, 0, fw, fh,          // source rectangle
      cx - dw / 2, cy - dh / 2, dw, dh,  // destination (centered)
    );
    ctx.imageSmoothingEnabled = true;
  }
}
```

**Step 2: Commit**

```bash
git add src/engine/entities/sprite-animator.ts
git commit -m "feat: add SpriteAnimator entity for sprite sheet rendering"
```

---

## Task 2: Create Sprite Config & Replace Charizard Usage

**Files:**
- Create: `src/config/sprites.ts`
- Modify: `src/engine/screens/hub.ts`
- Modify: `src/engine/screens/opening.ts`
- Modify: `src/engine/screens/calm-reset.ts`
- Modify: `src/engine/screens/finale.ts`
- Modify: `src/engine/games/flame-colors.ts`
- Modify: `src/engine/games/fireball-count.ts`
- Modify: `src/engine/games/evolution-tower.ts`
- Modify: `src/engine/games/sky-writer.ts`

**Step 1: Create sprite configuration**

```typescript
// src/config/sprites.ts
// Central config for all sprite sheets.
// Frame dimensions and counts must be updated after converting GIFs to sprite sheets.
// These are placeholder values — update them with actual values from ezgif output.

import type { SpriteConfig } from '../engine/entities/sprite-animator';

export const SPRITES: Record<string, SpriteConfig> = {
  charmander: {
    src: './sprites/charmander.png',
    frameWidth: 96,    // UPDATE after conversion
    frameHeight: 96,   // UPDATE after conversion
    frameCount: 28,    // UPDATE after conversion
    fps: 12,
  },
  charmeleon: {
    src: './sprites/charmeleon.png',
    frameWidth: 96,
    frameHeight: 96,
    frameCount: 20,
    fps: 12,
  },
  charizard: {
    src: './sprites/charizard.png',
    frameWidth: 96,
    frameHeight: 96,
    frameCount: 30,
    fps: 12,
  },
  'charizard-megax': {
    src: './sprites/charizard-megax.png',
    frameWidth: 96,
    frameHeight: 96,
    frameCount: 40,
    fps: 12,
  },
  'charizard-megax-back': {
    src: './sprites/charizard-megax-back.png',
    frameWidth: 96,
    frameHeight: 96,
    frameCount: 40,
    fps: 12,
  },
};
```

**Step 2: Replace Charizard entity in hub.ts**

In `src/engine/screens/hub.ts`:
- Remove import of `Charizard` from `../entities/charizard`
- Import `SpriteAnimator` from `../entities/sprite-animator`
- Import `SPRITES` from `../../config/sprites`
- Replace `private charizard = new Charizard(this.particles, this.tweens)` with `private mcxSprite = new SpriteAnimator(SPRITES['charizard-megax'])`
- In `enter()`: remove `this.charizard.setPose('perch')` — sprite has built-in idle animation
- In `update()`: replace `this.charizard.update(dt)` with `this.mcxSprite.update(dt)`
- Remove all MCX pose change logic (setPose calls) — the animated sprite handles its own animation
- In `render()`: replace `this.charizard.render(ctx, ...)` with `this.mcxSprite.render(ctx, DESIGN_WIDTH * 0.72, DESIGN_HEIGHT * 0.55, 5)` (scale ~5x for 96px → 480px display)

**Step 3: Replace Charizard in all 4 game files**

Apply the same pattern to each game file (`flame-colors.ts`, `fireball-count.ts`, `evolution-tower.ts`, `sky-writer.ts`):
- Remove `Charizard` import, add `SpriteAnimator` + `SPRITES` imports
- Replace `new Charizard(this.particles, this.tweens)` with `new SpriteAnimator(SPRITES['charizard-megax'])`
- Replace all `this.charizard.update(dt)` calls with `this.mcxSprite.update(dt)`
- Replace all `this.charizard.render(ctx, x, y, scale)` with `this.mcxSprite.render(ctx, x, y, scale * 8)` (adjust scale to match visual size)
- Remove all `setPose()` calls (sprite has single idle animation)
- Remove `TweenManager` imports and usage if only used for Charizard pose tweens

**Step 4: Replace Charizard in opening.ts**

This is special because opening.ts shows the evolution sequence:
- Import all sprite configs: charmander, charmeleon, charizard, charizard-megax
- Create a sprite for each form
- In `render()`, based on `this.phase`, draw the appropriate sprite:
  - `'egg'` phase: draw a simple procedural egg (keep existing code)
  - `'charmander'` phase: render charmander sprite
  - `'evolution1'` phase: render charmeleon sprite
  - `'charizard'` phase: render charizard sprite
  - `'mega-evolution'` phase: white flash transition, then render charizard-megax sprite
  - `'title'` phase: render charizard-megax sprite + title text
- Update each sprite in `update()` based on active phase

**Step 5: Replace Charizard in calm-reset.ts and finale.ts**

Same pattern — replace Charizard entity with SpriteAnimator using megax config.

**Step 6: Commit**

```bash
git add src/config/sprites.ts src/engine/screens/ src/engine/games/
git commit -m "feat: replace procedural Charizard with animated sprite sheets"
```

---

## Task 3: Add Video Player Component

**Files:**
- Create: `src/components/VideoOverlay.svelte`
- Modify: `src/App.svelte`
- Modify: `src/engine/events.ts`

**Step 1: Add video event types**

In `src/engine/events.ts`, add to the `GameEvent` union:

```typescript
| { type: 'play-video'; src: string; onEnd?: string }
| { type: 'stop-video' }
```

`onEnd` is an optional screen name to transition to after the video ends.

**Step 2: Create VideoOverlay.svelte**

```svelte
<!-- src/components/VideoOverlay.svelte -->
<script lang="ts">
  let videoEl: HTMLVideoElement | undefined = $state();
  let visible = $state(false);
  let currentOnEnd: string | undefined = $state();

  export function play(src: string, onEnd?: string) {
    currentOnEnd = onEnd;
    visible = true;
    // Wait for element to mount, then play
    requestAnimationFrame(() => {
      if (!videoEl) return;
      // Try WebM first, fallback to MP4
      const webmSrc = src.replace(/\.\w+$/, '.webm');
      const mp4Src = src.replace(/\.\w+$/, '.mp4');
      videoEl.innerHTML = '';
      const source1 = document.createElement('source');
      source1.src = webmSrc;
      source1.type = 'video/webm';
      const source2 = document.createElement('source');
      source2.src = mp4Src;
      source2.type = 'video/mp4';
      videoEl.appendChild(source1);
      videoEl.appendChild(source2);
      videoEl.load();
      videoEl.play().catch(() => { /* autoplay blocked — hide */ hide(); });
    });
  }

  export function hide() {
    visible = false;
    if (videoEl) {
      videoEl.pause();
      videoEl.currentTime = 0;
    }
  }

  function handleEnded() {
    const onEnd = currentOnEnd;
    hide();
    if (onEnd) {
      // Dispatch custom event for App.svelte to handle screen transition
      window.dispatchEvent(new CustomEvent('video-ended', { detail: { screen: onEnd } }));
    }
  }

  function handleClick() {
    // Click to skip video
    handleEnded();
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="video-overlay" onclick={handleClick}>
    <!-- svelte-ignore a11y_media_has_caption -->
    <video
      bind:this={videoEl}
      class="video-player"
      playsinline
      onended={handleEnded}
    ></video>
    <div class="skip-hint">Tap to skip</div>
  </div>
{/if}

<style>
  .video-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 200;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .video-player {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .skip-hint {
    position: absolute;
    bottom: 5%;
    right: 5%;
    color: rgba(255, 255, 255, 0.5);
    font-size: 24px;
    font-family: 'Fredoka', system-ui;
    pointer-events: none;
  }
</style>
```

**Step 3: Wire VideoOverlay into App.svelte**

In `src/App.svelte`:
- Import `VideoOverlay`
- Add `let videoOverlay: VideoOverlay;` ref
- Add `<VideoOverlay bind:this={videoOverlay} />` to the template
- In `wireEventBus()`, add cases:
  ```typescript
  case 'play-video':
    videoOverlay?.play(event.src, event.onEnd);
    break;
  case 'stop-video':
    videoOverlay?.hide();
    break;
  ```
- Listen for `video-ended` custom event to handle screen transitions:
  ```typescript
  window.addEventListener('video-ended', (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.screen) {
      session.currentScreen = detail.screen;
      gameCanvas?.goToScreen(detail.screen);
    }
  });
  ```

**Step 4: Commit**

```bash
git add src/components/VideoOverlay.svelte src/App.svelte src/engine/events.ts
git commit -m "feat: add VideoOverlay component for anime clip playback"
```

---

## Task 4: Integrate Video Clips into Game Flow

**Files:**
- Modify: `src/engine/screens/opening.ts`
- Modify: `src/engine/screens/hub.ts`
- Modify: `src/engine/screens/finale.ts`
- Create: `src/config/videos.ts`

**Step 1: Create video config**

```typescript
// src/config/videos.ts
// Video clip paths — files must exist in public/video/
// Each entry has a webm and mp4 version (VideoOverlay tries webm first)

export const VIDEOS = {
  megaEvolution: './video/mega-evolution.mp4',
  victoryRoar: './video/victory-roar.mp4',
  blastBurn: './video/blast-burn.mp4',
} as const;
```

**Step 2: Opening screen — play mega evolution video**

In `src/engine/screens/opening.ts`:
- At the start of the `mega-evolution` phase (around time=13s), emit:
  ```typescript
  this.gameContext.events.emit({ type: 'play-video', src: VIDEOS.megaEvolution });
  ```
- OR simpler approach: replace the entire opening screen with just a video play.
  In `enter()`:
  ```typescript
  // Play the mega evolution video, then transition to hub
  ctx.events.emit({ type: 'play-video', src: VIDEOS.megaEvolution, onEnd: 'hub' });
  ```
  This makes the opening just the video clip. The `onEnd` handler triggers transition to hub.
  For return visits (shortMode), skip straight to hub without video.

**Step 3: Hub screen — play celebration video on gem collection**

In `src/engine/screens/hub.ts`, in `enter()` where it detects a just-collected gem:
```typescript
if (session.currentGame && !session.gemsCollected.includes(session.currentGame)) {
  session.gemsCollected = [...session.gemsCollected, session.currentGame];
  this.justCollectedGem = session.currentGame;
  this.gemCollectAnimTime = 0;
  // Play a short celebration video
  ctx.events.emit({ type: 'play-video', src: VIDEOS.victoryRoar });
  this.audio?.playSynth('cheer');
}
```

**Step 4: Finale screen — play blast burn video**

In `src/engine/screens/finale.ts`, in `enter()`:
```typescript
ctx.events.emit({ type: 'play-video', src: VIDEOS.blastBurn });
```

**Step 5: Commit**

```bash
git add src/config/videos.ts src/engine/screens/
git commit -m "feat: integrate anime video clips into opening, hub and finale"
```

---

## Task 5: Add Ash Ketchum Voice Integration

**Files:**
- Modify: `src/engine/audio.ts`
- Modify: `src/config/manifest.ts`
- Modify: `src/engine/preloader.ts`

**Step 1: Register Ash voice clips in AudioManager**

In `src/engine/audio.ts`, expand `registerDefaultVoices()` to add Ash clips:

```typescript
registerDefaultVoices(): void {
  const voices = [
    // Ash Ketchum voice clips
    ['ash-i-choose-you', '/audio/voice/ash-i-choose-you.mp3'],
    ['ash-alright', '/audio/voice/ash-alright.mp3'],
    ['ash-yeah', '/audio/voice/ash-yeah.mp3'],
    ['ash-great-job', '/audio/voice/ash-great-job.mp3'],
    ['ash-awesome', '/audio/voice/ash-awesome.mp3'],
    ['ash-try-again', '/audio/voice/ash-try-again.mp3'],
    ['ash-not-quite', '/audio/voice/ash-not-quite.mp3'],
    ['ash-owen-turn', '/audio/voice/ash-owen-turn.mp3'],
    ['ash-kian-turn', '/audio/voice/ash-kian-turn.mp3'],
    ['ash-team-turn', '/audio/voice/ash-team-turn.mp3'],
    ['ash-power-gem', '/audio/voice/ash-power-gem.mp3'],
    ['ash-find-color', '/audio/voice/ash-find-color.mp3'],
    ['ash-count-them', '/audio/voice/ash-count-them.mp3'],
    ['ash-match-shape', '/audio/voice/ash-match-shape.mp3'],
    ['ash-trace-letter', '/audio/voice/ash-trace-letter.mp3'],
    ['ash-welcome', '/audio/voice/ash-welcome.mp3'],
    ['ash-amazing', '/audio/voice/ash-amazing.mp3'],
    ['ash-lets-go', '/audio/voice/ash-lets-go.mp3'],
    ['ash-ready', '/audio/voice/ash-ready.mp3'],
    // Legacy voice keys (keep for fallback)
    ['turn-owen', '/audio/voice/ash-owen-turn.mp3'],
    ['turn-kian', '/audio/voice/ash-kian-turn.mp3'],
    ['turn-team', '/audio/voice/ash-team-turn.mp3'],
    ['welcome-trainers', '/audio/voice/ash-welcome.mp3'],
    ['great-training', '/audio/voice/ash-amazing.mp3'],
    // Colors (still use Web Speech fallback until specific clips made)
    ['color-red', '/audio/voice/color-red.mp3'],
    ['color-blue', '/audio/voice/color-blue.mp3'],
    ['color-yellow', '/audio/voice/color-yellow.mp3'],
    ['color-green', '/audio/voice/color-green.mp3'],
    ['color-orange', '/audio/voice/color-orange.mp3'],
    ['color-purple', '/audio/voice/color-purple.mp3'],
    // Numbers
    ['number-1', '/audio/voice/number-1.mp3'],
    ['number-2', '/audio/voice/number-2.mp3'],
    ['number-3', '/audio/voice/number-3.mp3'],
    ['number-4', '/audio/voice/number-4.mp3'],
    ['number-5', '/audio/voice/number-5.mp3'],
    ['number-6', '/audio/voice/number-6.mp3'],
    ['number-7', '/audio/voice/number-7.mp3'],
  ] as const;
  for (const [key, path] of voices) {
    this.registerVoice(key, path);
  }
}
```

**Step 2: Update asset manifest to preload Ash voice clips**

In `src/config/manifest.ts`:

```typescript
export const assetManifest: AssetEntry[] = [
  // Ash voice clips — critical (play early in session)
  { path: '/audio/voice/ash-welcome.mp3', type: 'audio', priority: 'critical' },
  { path: '/audio/voice/ash-i-choose-you.mp3', type: 'audio', priority: 'critical' },
  { path: '/audio/voice/ash-owen-turn.mp3', type: 'audio', priority: 'critical' },
  { path: '/audio/voice/ash-kian-turn.mp3', type: 'audio', priority: 'critical' },
  // Deferred (loaded in background)
  { path: '/audio/voice/ash-great-job.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-awesome.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-try-again.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-not-quite.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-team-turn.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-power-gem.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-find-color.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-count-them.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-match-shape.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-trace-letter.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-alright.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-yeah.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-amazing.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-lets-go.mp3', type: 'audio', priority: 'deferred' },
  { path: '/audio/voice/ash-ready.mp3', type: 'audio', priority: 'deferred' },
];
```

**Step 3: Wire Ash voice into game screens**

In each game file, replace `playVoice('turn-owen')` style calls to use the new Ash keys where appropriate. Key replacements in game flow:

- **Turn announcements**: Already handled — `turn-owen` now maps to `ash-owen-turn.mp3`
- **Correct answer**: Add `this.audio?.playVoice('ash-great-job')` or randomly pick from `['ash-great-job', 'ash-awesome', 'ash-alright', 'ash-yeah']`
- **Wrong answer**: Add `this.audio?.playVoice('ash-try-again')` or `'ash-not-quite'`
- **Game intro**: Each game can play a context-specific Ash clip:
  - Flame Colors: `ash-find-color`
  - Fireball Count: `ash-count-them`
  - Evolution Tower: `ash-match-shape`
  - Sky Writer: `ash-trace-letter`
- **Hub welcome**: `ash-welcome` on first hub entry, `ash-lets-go` on subsequent
- **Gem collected**: `ash-power-gem`
- **Finale**: `ash-amazing`

**Step 4: Commit**

```bash
git add src/engine/audio.ts src/config/manifest.ts
git commit -m "feat: add Ash Ketchum voice integration with 19 TTS clips"
```

---

## Task 6: Remove Dragon Egg Sort & Charizard Kitchen

**Files:**
- Modify: `src/components/GameCanvas.svelte` (remove 2 game registrations)
- Modify: `src/state/types.ts` (remove 2 game names)
- Modify: `src/engine/screens/hub.ts` (update to 4 gems)
- Modify: `src/config/constants.ts` (update ACTIVITIES_PER_SESSION to 4)
- Delete (or leave unused): `src/engine/games/dragon-egg-sort.ts`, `src/engine/games/charizard-kitchen.ts`
- Delete (or leave unused): `src/engine/entities/charmander.ts`, `src/engine/entities/nest.ts`

**Step 1: Update types.ts**

```typescript
export type GameName = 'flame-colors' | 'fireball-count' | 'evolution-tower' | 'sky-writer';
```

**Step 2: Remove game registrations in GameCanvas.svelte**

Remove lines 19-20 (imports of DragonEggSortGame and CharizardKitchenGame) and lines 65-66 (registrations).

**Step 3: Update hub.ts to 4 gems**

Replace the GEMS array:

```typescript
const GEMS: GemDef[] = [
  { color: '#FF3333', name: 'Colors',  game: 'flame-colors',    icon: 'flame',  x: 260, y: 420 },
  { color: '#FF8833', name: 'Count',   game: 'fireball-count',  icon: 'dragon', x: 560, y: 420 },
  { color: '#33CC33', name: 'Shapes',  game: 'evolution-tower', icon: 'shield', x: 260, y: 650 },
  { color: '#3377FF', name: 'Letters', game: 'sky-writer',      icon: 'star',   x: 560, y: 650 },
];
```

Remove the `'egg'` and `'cauldron'` icon cases from `drawGemIcon()`.

Update the finale trigger: change `session.gemsCollected.length >= 6` to `>= 4`.

**Step 4: Update constants.ts**

Change `ACTIVITIES_PER_SESSION` from 6 to 4.

**Step 5: Delete unused game files**

Remove:
- `src/engine/games/dragon-egg-sort.ts`
- `src/engine/games/charizard-kitchen.ts`
- `src/engine/entities/charmander.ts` (only used by fireball-count for baby charmanders — check if still needed, remove if not)
- `src/engine/entities/nest.ts` (only used by dragon-egg-sort)

**Note:** Check if `fireball-count.ts` imports `BabyCharmander` from `charmander.ts`. If so, keep `charmander.ts` or simplify the fireball count game to not use baby charmanders (use simple targets instead — part of the "remove faff" goal).

**Step 6: Commit**

```bash
git add -u
git commit -m "feat: simplify to 4 core games, remove egg sort and kitchen"
```

---

## Task 7: Simplify Remaining 4 Games (Remove Faff)

**Files:**
- Modify: `src/engine/games/flame-colors.ts`
- Modify: `src/engine/games/fireball-count.ts`
- Modify: `src/engine/games/evolution-tower.ts`
- Modify: `src/engine/games/sky-writer.ts`

The goal is to strip each game down to its core mechanic: **see prompt → click answer → celebration**. Remove story wrappers, slow narrative intros, character-driven elements, and multi-phase complexity.

**Step 1: Simplify Flame Colors**

Current: Gems float, MCX holds flame indicator, fire-breath beam animation, gems fly to MCX.
Simplified:
- Colored blobs appear on screen (no drift, just gentle bob)
- Voice says "Find [COLOR]!"
- Player clicks correct blob
- Correct: particles burst, chime, "GREAT!" text, next prompt
- Wrong: bonk, "Try again!", hint escalation
- Remove: fire-breath beam animation, gem-fly-to-MCX animation, flame indicator
- Remove all phases except: `banner` (1.5s) → `play` → `celebrate` → repeat → `complete`

**Step 2: Simplify Fireball Count**

Current: Baby Charmanders waddle in, player clicks to launch fireballs one-at-a-time with arc trajectory.
Simplified:
- Number displayed big on screen
- Simple targets (colored dots) arranged in a row
- Player clicks targets to count them
- Each click lights up a target with a pop sound and count-up text
- When target count matches the number: celebration
- Remove: Baby Charmander entities, fireball launching, arc trajectories
- Remove: BabyCharmander import entirely

**Step 3: Simplify Evolution Tower**

Current: MCX forge animation, blocks fly to tower with screen shake, MCX perches on completed tower.
Simplified:
- Shape outline shown (circle/square/triangle)
- 2-3 choice shapes displayed
- Player clicks matching shape
- Correct: shape pops into place, celebration
- Wrong: bonk, hint
- Remove: tower building animation, forge flames, block flying, slam impact, MCX perch

**Step 4: Simplify Sky Writer**

Current: Stars appear one-by-one, MCX flies between them with bezier fire trails, phonics questions.
Simplified:
- Star dots appear for a letter
- Player clicks stars in numbered order
- Lines connect between clicked stars
- When all stars clicked: letter complete, celebration
- Remove: MCX flight animation, bezier fire trails, phonics questions overlay
- Keep: star glow, pop sound on connect

**Step 5: Commit**

```bash
git add src/engine/games/
git commit -m "feat: simplify all 4 games to core mechanics, remove narrative faff"
```

---

## Task 8: Wire Ash Voice Into Simplified Games

**Files:**
- Modify: `src/engine/games/flame-colors.ts`
- Modify: `src/engine/games/fireball-count.ts`
- Modify: `src/engine/games/evolution-tower.ts`
- Modify: `src/engine/games/sky-writer.ts`
- Modify: `src/engine/screens/hub.ts`
- Modify: `src/engine/screens/opening.ts`
- Modify: `src/engine/screens/finale.ts`

**Step 1: Add voice helper for random celebration clips**

Add to each game or create a shared helper:

```typescript
const ASH_CORRECT = ['ash-great-job', 'ash-awesome', 'ash-alright', 'ash-yeah'];
const ASH_WRONG = ['ash-try-again', 'ash-not-quite'];

function randomAshCorrect(): string {
  return ASH_CORRECT[Math.floor(Math.random() * ASH_CORRECT.length)];
}
function randomAshWrong(): string {
  return ASH_WRONG[Math.floor(Math.random() * ASH_WRONG.length)];
}
```

**Step 2: Wire into each game's correct/wrong handlers**

In each game, after the correct answer:
```typescript
this.audio?.playVoice(randomAshCorrect());
```

After a wrong answer:
```typescript
this.audio?.playVoice(randomAshWrong());
```

At game start (banner phase):
```typescript
this.audio?.playVoice('ash-i-choose-you');
```

**Step 3: Wire into hub and screens**

- Hub `enter()` first time: `this.audio?.playVoice('ash-welcome')`
- Hub `enter()` subsequent: `this.audio?.playVoice('ash-lets-go')`
- Hub gem collection: `this.audio?.playVoice('ash-power-gem')`
- Finale: `this.audio?.playVoice('ash-amazing')`

**Step 4: Commit**

```bash
git add src/engine/games/ src/engine/screens/
git commit -m "feat: wire Ash voice clips into all games and screens"
```

---

## Task 9: Update Preloader for Sprites + Clean Up

**Files:**
- Modify: `src/engine/preloader.ts`
- Modify: `src/config/manifest.ts`

**Step 1: Add sprite preloading**

Expand the preloader to also preload sprite sheet images:

```typescript
// In preloader.ts, add sprite preloading
import { SPRITES } from '../config/sprites';

async loadSprites(): Promise<void> {
  const spritePromises = Object.values(SPRITES).map(config => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve(); // Don't fail on missing sprites
      img.src = config.src;
    });
  });
  await Promise.all(spritePromises);
}
```

Call `loadSprites()` in the load sequence in `App.svelte`.

**Step 2: Update manifest voice entries**

Ensure the voice manifest matches the new Ash voice keys:

```typescript
export const voiceManifest = [
  'ash-i-choose-you', 'ash-alright', 'ash-yeah', 'ash-great-job',
  'ash-awesome', 'ash-try-again', 'ash-not-quite',
  'ash-owen-turn', 'ash-kian-turn', 'ash-team-turn',
  'ash-power-gem', 'ash-find-color', 'ash-count-them',
  'ash-match-shape', 'ash-trace-letter',
  'ash-welcome', 'ash-amazing', 'ash-lets-go', 'ash-ready',
] as const;
```

**Step 3: Commit**

```bash
git add src/engine/preloader.ts src/config/manifest.ts
git commit -m "feat: add sprite preloading and update voice manifest for Ash clips"
```

---

## Task 10: Build, Test & Fix

**Files:**
- All modified files from previous tasks

**Step 1: Run TypeScript check**

```bash
npm run check
```

Fix any type errors. Common issues:
- Missing sprite files (the build won't fail, but check console warnings)
- Removed Charizard entity type references
- Updated GameName type may cause errors in files still referencing old names

**Step 2: Run build**

```bash
npm run build
```

Verify clean build with no errors.

**Step 3: Run dev server and manually test**

```bash
npm run dev
```

Test checklist:
- [ ] Loading screen appears and click-to-start works
- [ ] Opening plays video clip (or falls back gracefully if no video file)
- [ ] Hub shows 4 gem orbs (not 6)
- [ ] MCX sprite renders on hub (animated, correct position/scale)
- [ ] Each game loads and MCX sprite is visible
- [ ] Click mechanics work in all 4 games
- [ ] Correct/wrong answers trigger Ash voice (or Web Speech fallback)
- [ ] Gem collection triggers celebration video (or graceful fallback)
- [ ] Finale triggers after 4 gems
- [ ] Settings panel still works
- [ ] No console errors

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix: resolve build issues and verify v3 integration"
```

---

## Summary of Changes

| Area | Before (v2) | After (v3) |
|------|-------------|------------|
| Charizard visual | 1400-line procedural canvas (19 colors, 8 poses) | Animated pixel sprite from Pokemon Showdown (~96x96, scaled up) |
| Opening | 22-second procedural evolution sequence | Anime video clip of Mega Evolution |
| Games | 6 games with story wrappers + narrative | 4 core games, pure mechanic: prompt → click → celebrate |
| Hub | 6 gem orbs | 4 gem orbs |
| Voice | Web Speech API fallback (robotic) | Ash Ketchum AI TTS clips (19 phrases) |
| Video clips | None | 3 clips: opening, gem celebration, finale |
| Files removed | — | dragon-egg-sort.ts, charizard-kitchen.ts, nest.ts, charmander.ts |
| Files added | — | sprite-animator.ts, sprites.ts, videos.ts, VideoOverlay.svelte |

## .gitignore Additions

Add to `.gitignore` to keep copyrighted assets out of the public repo:

```
# Pokemon assets (copyrighted — local use only)
public/sprites/
public/video/
public/audio/voice/ash-*.mp3
```
