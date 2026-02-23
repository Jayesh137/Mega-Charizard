# Mega Charizard Academy - Design Document

> Educational spectacle game for two boys (ages 2.5 and 4) featuring Mega Charizard X.
> Displayed on TV via HDMI from laptop. Uncle-controlled.

---

## 1. Overview

**Mega Charizard Academy** is a browser-based educational game where Mega Charizard X trains two young boys to become Pokemon Trainers through fire-powered mini-challenges. The game runs as a single HTML page opened in Chrome, displayed fullscreen on a TV via HDMI. The uncle sits with the laptop and controls all interactions based on what the boys shout and point at.

**Target audience:** Owen (age 2.5) and Kian (age 4), two boys obsessed with Mega Charizard X (black body, blue flames, red eyes).

**Educational focus (priority order):**
1. Colors + Counting (core)
2. Shapes + Sizes (secondary)
3. Letters + Phonics (secondary)

**Session length:** 5-6 mini-game activities per session. ~8-15 minutes total.

---

## 2. Experience Flow

### Energy Curve

```
SPECTACLE (30-90s) → Calm Reset (5-10s) → SPECTACLE → Calm Reset → ... → Finale
```

High-energy bursts with calm "power up" resets in between. Prevents overstimulation while keeping engagement high.

### Session Flow

1. **Audio unlock screen** - Static Mega Charizard X silhouette with pulsing glow. Text: "Click anywhere to begin." Uncle clicks to unlock browser audio and start asset preload.
2. **Opening spectacle** - Mega Evolution transformation sequence (~22s). First session: full sequence. Return sessions: short intro (5s Mega Charizard X entrance) with full replay available from hub.
3. **Hub screen** - Mega Charizard X perches on volcanic mountain. 3-4 glowing orbs float around it (one per mini-game). Uncle clicks an orb to enter an activity.
4. **Mini-game** (30-90 seconds) - Educational challenge with Charizard spectacle. Ends with replay/next choice.
5. **Calm reset** (5-10 seconds) - Passive breathing room. No interaction. Transitions back to hub.
6. **Repeat** steps 3-5 for 5-6 activities.
7. **Finale** - Charizard victory lap across the sky trailing blue flames. Voice: "Great training, Trainers!" Natural stopping point.

---

## 3. Opening Spectacle (~22 seconds)

### Seconds 0-3: "The Egg"
Black screen with a subtle ember glow in the center from frame one (never feels frozen). A point of orange light pulses. Twice. Low rumble begins. Light expands into a glowing egg shape crackling with energy.

### Seconds 3-6: "Charmander"
Egg cracks with a flash. Small, cute Charmander stands center-screen, blinking. Tail flame flickers to life. Looks at camera, does a happy hop. Warm orange glow. Cheerful chirp.

### Seconds 6-9: "First Evolution"
Charmander's tail flame flares. White light envelops it. Silhouette stretches taller - horn appears. Light shatters. Charmeleon stands in its place, dark red and fierce. Snarls, swipes claw leaving spark trail. Punchy drum hit.

### Seconds 9-13: "Charizard Rises"
Charmeleon roars. Flames spiral around body. Silhouette expands - wings burst out. Light explodes. Charizard spreads wings wide, throws head back, unleashes fire column straight up. Deep resonant roar.

### Seconds 13-20: "MEGA EVOLUTION"
Mega Stone appears, pulses with rainbow energy. Streams of light connect stone to Charizard. DNA-helix Mega Evolution symbol spins. Body goes white-hot. Silhouette transforms - color drains to BLACK. Blue flames erupt from mouth. Eyes snap open GLOWING RED. Light cocoon shatters. Mega Charizard X stands in full glory. Deepest roar. Blue fire fills screen edges. Screen shakes (on Normal/Hype).

### Seconds 20-22: "Title"
Fire clears. Mega Charizard X hovers center-screen. Title appears in flame-edged letters: **MEGA CHARIZARD ACADEMY**. Voice: "Welcome, Trainers!" Hub orbs fade in.

### Replay
Small flame icon on hub screen replays the full opening on demand.

---

## 4. Hub Screen

Mega Charizard X perches on a volcanic mountain against a dark sky. 3-4 glowing orbs float around it, each a distinct color with an icon inside:

| Orb | Color | Icon | Mini-Game |
|-----|-------|------|-----------|
| 1 | Blue | Flame blob | Flame Colors (color recognition) |
| 2 | Red | Number pips | Fireball Count (counting) |
| 3 | Green | Shape outline | Evolution Tower (shapes + sizes) |
| 4 | Orange | Letter spark | Sky Writer (letters + phonics) |

Orbs pulse gently. When uncle hovers, the orb brightens and Charizard turns toward it. On click, Charizard roars/breathes blue fire and the screen transitions to the mini-game.

Hidden controls on hub:
- Gear icon (top-right): parent settings (names, difficulty, celebration intensity)
- Flame icon (bottom-left): replay opening sequence
- Keys `1`/`2`/`3`: switch celebration intensity (Calm/Normal/Hype)

---

## 5. Mini-Games

### 5.1 Shared Design Rules

- **Duration:** 30-90 seconds per round.
- **Charizard instructions:** 2-4 seconds max. Spoken prompt + big visual cue together.
- **Prompts are icon-first:** Color flame blob, number with dot pips, shape outline. Text is secondary overlay.
- **Two difficulty levels per game in the same scene:** Little Trainer (2.5yo) and Big Trainer (4yo), controlled by the turn system.
- **Quick replay option:** After each round, a pulsing replay flame icon appears alongside a "next" arrow.
- **Fail-safe escalation:** Miss once → correct target gently bounces. Miss twice → target glows brighter and bounces. Miss three times → Charizard flies over and taps the correct answer, voice says the answer, auto-completes with full celebration. No dead ends ever.
- **Timeout on prompts:** If no input for ~5 seconds, Charizard models the answer (points, demonstrates, says it again). Pacing never stalls.

### 5.2 Flame Colors (Blue Orb - Color Recognition)

**Scene:** Mega Charizard X hovers in dark sky. Colored targets (floating rocks, ice blocks, crystal orbs) drift slowly across screen.

**Prompt:** Charizard roars. A colored flame appears in its mouth. Voice says the color name. Flame and background both pulse that color.

**Gameplay:** Uncle clicks the matching colored target. Charizard blasts it with massive blue fire breath. Target explodes in colored sparks. Screen shakes.

**Dual difficulty:**
- **Little Trainer:** 2 targets on screen. Primary colors only (red, blue, yellow) - high contrast, very distinct on TV. Correct target subtly glows/bounces as hint.
- **Big Trainer:** 3-4 targets. Adds orange, purple, green. No hint glow. Targets drift faster.

**Round length:** 4-5 targets. ~45 seconds.

### 5.3 Fireball Count (Red Orb - Counting)

**Scene:** Row of stone pillars against mountainous backdrop. Mega Charizard X crouches at left.

**Prompt:** Number appears as big glowing numeral with dot pips beside it (3 = three dots). Voice says the number. Numeral pulses that many times.

**Gameplay:** Uncle clicks to launch fireballs one at a time. Each click = one fireball streaking across, smashing a pillar in spectacular explosion. Boys count along.

**Overshoot (Big Trainer):** Extra fireball fizzles mid-air with a funny "pffft" sound. Voice gently says "That was too many! Let's try again." No punishment.

**Dual difficulty:**
- **Little Trainer:** Numbers 1-3. Pillars pre-placed to match count (ask for 2, show 2 pillars).
- **Big Trainer:** Numbers 1-7. More pillars than needed - must stop at the right count.

**Round length:** 4-5 numbers. ~60 seconds.

### 5.4 Evolution Tower (Green Orb - Shapes + Sizes)

**Scene:** Vertical build zone with empty pedestal. Mega Charizard X hovers to the side, breathing blue flame that "forges" shape blocks.

**Prompt:** Shape outline glows on pedestal (or top of growing tower). Voice says shape name. Large shape icon pulses on-screen. 2-3 shape blocks float above as choices.

**Gameplay:** Uncle clicks matching shape. Charizard grabs it, swoops down, slams it into place with fiery impact. Tower grows. After 3-4 blocks, tower complete - Charizard perches on top roaring.

**Shape introduction is gradual:**
- First plays: circle, square, triangle only.
- After completing a few rounds: star and heart added one at a time.
- Never more than one new shape introduced per round.

**Size mode (every other round):** Visually distinct from shape mode - background shifts to a wider open field instead of the vertical tower. Voice says "Which is BIGGER?" Two versions of same shape appear (small vs big). On the final size round: three evolution silhouettes appear (small Charmander, medium Charmeleon, big Charizard). Voice says "Put them in order - smallest to biggest!" Always a Team Turn.

**Dual difficulty:**
- **Little Trainer:** Circle, square, triangle. 2 choices per prompt. Size rounds are "big vs small" only.
- **Big Trainer:** Adds star, diamond, heart, oval. 3 choices. Size rounds add "small, medium, big" three-way sorting.

**Round length:** ~60 seconds. 4-5 shape placements + 1-2 size comparisons.

### 5.5 Sky Writer (Orange Orb - Letters + Phonics)

**Scene:** Night sky. Stars scattered across dark blue-black backdrop. Mega Charizard X flies slowly across top, blue tail flame leaving glowing trail.

**Prompt:** Large letter appears as dotted constellation outline. Familiar object icon appears beside it. Voice says: "C! C is for Charizard!" Icon animates.

**Starter letters (concrete, familiar):** C (Charizard), F (fire/flame), S (star), B (blue).

**Gameplay:** Uncle clicks stars in sequence (numbered with big pulsing dots: 1, 2, 3). Each click lights up star and Charizard flies to it, drawing blue fire trail between stars. When letter complete, constellation blazes bright and icon comes alive (mini Charizard flies out of C, flames erupt from F, etc.).

**Constellation targets:** Very thick outlines, bright glow halos, large click regions. Clearly visible from couch distance on any TV.

**Phonics timeout:** If no response to a phonics question within ~4 seconds, Charizard "speaks" the answer - voice models the sound ("Ffffff... Fire!") and the letter pulses. Pacing never stalls.

**Dual difficulty:**
- **Little Trainer:** 2-3 dots to connect per letter. Focus on hearing the letter and seeing the icon. Stars auto-advance if clicked anywhere near them. Letters from their world: C, B, S.
- **Big Trainer:** 4-5 dots to connect in order. After tracing, voice asks "What does F sound like? Fffff..." Includes first-letter matching: two icons appear, voice says "Which one starts with F?"

**Team Turn finale:** Last letter each round is always Team Turn. Both boys help trace a big letter filling the whole sky. Double fire on completion.

**Round length:** ~60-75 seconds. 3-4 letters per round.

---

## 6. Turn-Cue System

### Turn Types

**Little Trainer Turn (Owen)**
- Banner: "Owen" + small Charmander icon. Role label "Little Trainer" secondary. Warm orange banner.
- Short voice cue: "Owen's turn!"
- Difficulty drops to easier tier.
- Kian becomes "coach" - can shout answers to help his little brother.

**Big Trainer Turn (Kian)**
- Banner: "Kian" + Charizard icon. Role label "Big Trainer" secondary. Deep blue banner.
- Short voice cue: "Kian's turn!"
- Difficulty is harder tier.
- Owen watches spectacle and absorbs passively.

**Team Turn**
- Banner: "Owen & Kian" + Mega Charizard X icon. "TEAM!" label. Bright gold banner. Special fanfare sound.
- Short voice cue: "Team turn!"
- Used for finale moments in each mini-game.
- Celebration reward is bigger: double fire, double screen shake.

### Turn Order
Strictly alternating: Little → Big → Little → Big → ... → Team (finale).
~40% Little Trainer, ~40% Big Trainer, ~20% Team Turn.

### Banner Behavior
- Slides in from top (0.5s). Stays for 1.5s. Slides out.
- Small persistent icon in bottom corner always shows whose turn it is.
- Voice cue plays on banner entrance.
- Banners prioritize names + icons. Role label is smaller secondary text.

### Hidden Turn Controls (uncle only)
- **Manual turn override:** Press `L` to force next prompt to Little Trainer, `B` for Big Trainer, `T` for Team. No visual indicator to boys.
- **Emergency Team Turn:** Press `T` at any time to trigger an immediate Team Turn. Useful when one child is dysregulated or distracted - shared participation re-engages.

---

## 7. Celebration Intensity

Hidden from boys. Accessible via gear icon on hub or keyboard shortcuts.

### Levels

| Setting | Key | Screen Shake | Particles | Charizard Reaction |
|---------|-----|-------------|-----------|-------------------|
| **Calm** | `1` | None | Gentle sparkles | Nods, small flame puff |
| **Normal** | `2` | Subtle | Fire sparks + embers | Short flight loop, medium fire breath |
| **Hype** | `3` | Full | Massive explosions, screen-filling sparks | Full victory lap, screen-filling fire, wings flare |

### Audio Gain per Level

| Channel | Calm | Normal | Hype | Silent |
|---------|------|--------|------|--------|
| SFX | 40% | 70% | 90% | 0% |
| Voice | 80% | 80% | 85% | 80%* |
| Music | 30% | 50% | 60% | 0% |
| Sub-bass/rumble | Off | 30% | 80% | 0% |
| Reverb wet mix | 10% | 30% | 60% | 0% |

*Voice stays audible in Silent mode since prompts are essential. Silent mode toggled with `0` key.

Hype mode increases impact mostly through visuals. Audio peaks are capped to protect ears on TV speakers.

### Quick Switch
Press `1`, `2`, `3`, or `0` on keyboard at any time. No visual indicator to boys. Next celebration adjusts immediately.

---

## 8. Calm Reset Sequences

### Purpose
5-10 second breathing room between mini-games. Prevents overstimulation. Builds anticipation.

### Three Variations (rotate automatically)

**1. "Power Up"**
Charizard closes eyes. Body pulses with slow rhythmic blue glow (bright 2s, dim 2s). Small blue ember particles drift upward like fireflies. Deep warm hum. After 3-4 pulses, transition cue.

**2. "Stargazing"**
Charizard looks up. Stars fade in one by one with soft twinkle sounds. Tail flame flickers gently. Quiet wind-chime melody. A shooting star trails blue, and Charizard follows it with its eyes back toward the hub.

**3. "Flame Rest"**
Charizard curls up, tucking wings. Tail flame shrinks to small steady candle glow. Low crackling fire ambient sound. Blue embers drift in slow spirals. Flame gradually grows back to full size.

### Design Rules

- **Passive.** No interaction required. No clicking.
- **"Ready, Owen?" / "Ready, Kian?" cue** plays near the end of the reset (at ~80% duration), so the reset stays calming first, then transitions with purpose. Uses whichever boy's turn is next.
- **Duration adjusts with celebration intensity:** Calm mode = 10s. Normal = 7s. Hype = 5s.
- **Hidden extend control:** Uncle holds `Space` to extend the reset by 3-second increments. For real-life regulation moments. No visual change - reset simply continues its ambient loop.
- **Audio crossfade:** Mini-game audio fades out over first 2s. Calm ambient fades in simultaneously. No jarring silence.
- **Subtle progress indicator:** Tail flame slowly refilling, or stars counting up. Gives "almost ready" sense so boys don't get restless.

---

## 9. Technical Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Game rendering | HTML5 Canvas (2D context) | All animations, characters, particles, fire |
| UI overlays | HTML + CSS | Banners, settings, hub orbs, title, subtitles |
| Animation loop | `requestAnimationFrame` | 60fps, delta-time based |
| Sound effects | Web Audio API | Low-latency SFX, pitch control, gain nodes |
| Music/ambient | HTML `<audio>` elements | Background loops, crossfading |
| State | Plain JS objects | Settings (persistent) + session (live) |
| Persistence | `localStorage` | Settings, names, unlocked content |
| Fullscreen | Fullscreen API | One click for TV display |

**No build step.** No framework. Open `index.html` in Chrome, fullscreen, HDMI. Zero friction.

**Local server fallback:** Include a one-line server script (`npx serve .` or `python3 -m http.server`) for environments where `file://` causes CORS issues with audio loading.

### File Structure

```
mega-charizard-academy/
├── index.html
├── css/
│   └── styles.css                  # UI overlays, banners, subtitles
├── js/
│   ├── main.js                     # Init, game loop, screen manager
│   ├── config.js                   # Tunable constants (timings, particle caps, sizes)
│   ├── theme.js                    # Visual/audio theme identity (reskinnable)
│   ├── settings.js                 # Persistent state (names, intensity, preferences)
│   ├── session.js                  # Live state (current screen, turn, score)
│   ├── input.js                    # Click/keyboard handlers, hotkey map
│   ├── audio.js                    # Sound manager, gain nodes, intensity control
│   ├── preloader.js                # Asset manifest, preload flow, loading screen
│   ├── content/
│   │   ├── colors.js               # Color sets, difficulty tiers, prompt data
│   │   ├── counting.js             # Number ranges, difficulty tiers
│   │   ├── shapes.js               # Shape definitions, introduction order
│   │   └── letters.js              # Letter sets, phonics data, icon mappings
│   ├── screens/
│   │   ├── opening.js              # Mega Evolution sequence
│   │   ├── hub.js                  # Hub screen with orbs
│   │   ├── calm-reset.js           # 3 reset variations
│   │   └── finale.js               # Session-end victory lap
│   ├── games/
│   │   ├── flame-colors.js         # Mini-game 1
│   │   ├── fireball-count.js       # Mini-game 2
│   │   ├── evolution-tower.js      # Mini-game 3
│   │   └── sky-writer.js           # Mini-game 4
│   ├── entities/
│   │   ├── charizard.js            # Character rendering, poses, animation states
│   │   ├── particles.js            # Fire, sparks, embers, explosions
│   │   └── ui-elements.js          # Orbs, targets, banners (canvas-drawn)
│   └── utils/
│       ├── animation.js            # Tweening, easing, timers
│       └── canvas-helpers.js       # Drawing, text, scaling, safe-area
├── assets/
│   ├── audio/
│   │   ├── sfx/                    # Roars, impacts, chimes, fanfares (.wav)
│   │   ├── music/                  # Ambient loops, calm reset (.mp3)
│   │   └── voice/                  # AI TTS voice prompts (.mp3)
│   └── manifest.json               # Asset list for preloader
└── docs/
    └── plans/
        └── 2026-02-23-mega-charizard-academy-design.md
```

### Standard Screen/Game Interface

Every screen and mini-game module exports the same interface:

```js
export default {
  enter(ctx)          // Called when transitioning to this screen. Setup state.
  update(dt)          // Called every frame. dt = delta time in ms.
  render(canvas, ctx) // Called every frame after update. Draw to canvas.
  exit()              // Called when transitioning away. Cleanup.
  handleClick(x, y)   // Called on mouse/touch click.
  handleKey(key)       // Called on keyboard press.
}
```

This keeps the screen manager simple: it holds a reference to the current screen and delegates the game loop and input events to it.

### Canvas Scaling & TV Safe Area

```js
// Design resolution: 1920x1080
// Canvas scales to fill viewport while maintaining 16:9 aspect ratio
// All game coordinates use the 1920x1080 design space
// canvas-helpers.js maps design coords to actual screen pixels

const SAFE_AREA = {
  left: 0.05,    // 5% margin on each side
  right: 0.95,
  top: 0.05,
  bottom: 0.95
};
// All interactive elements and critical visuals stay within safe area
// Backgrounds and decorative fire can bleed to edges
```

TV overscan can crop 2-5% of edges. The 5% safe area handles worst-case overscan. Background art and fire effects extend to full canvas edges.

### Preloader & Audio Unlock

1. Page loads → shows Mega Charizard X silhouette with pulsing ember glow.
2. Preloader reads `assets/manifest.json`, begins loading all assets.
3. Text: "Click anywhere to begin" (DOM overlay).
4. Uncle clicks → `audioContext.resume()` unlocks browser audio.
5. Loading progress bar fills (canvas-drawn, styled as a blue flame bar).
6. Once complete: transition to opening sequence (or short intro on return visits).

`manifest.json` lists every asset with path, type, and priority (critical vs deferred). Critical assets (opening sequence audio, Charizard base sprites) load first. Deferred assets (mini-game-specific sounds) load in background during opening.

### Theming Layer (theme.js)

Controls all presentation identity. To reskin: replace this one file.

```js
export const theme = {
  name: "mega-charizard-x",
  title: "Mega Charizard Academy",

  forms: [
    {
      name: "Charmander",
      colors: { body: "#F08030", belly: "#FCF0DE", flame: "#F15F3E" },
      scale: 0.3,
      eyeStyle: "cute-round"
    },
    {
      name: "Charmeleon",
      colors: { body: "#D45137", belly: "#905C42", flame: "#FF6B35" },
      scale: 0.45,
      eyeStyle: "fierce-narrow"
    },
    {
      name: "Charizard",
      colors: { body: "#F08030", belly: "#FCC499", wings: "#58A8B8", flame: "#FF4500" },
      scale: 0.65,
      eyeStyle: "determined"
    },
    {
      name: "Mega Charizard X",
      colors: {
        body: "#1a1a2e", belly: "#91CCEC", flames: "#37B1E2",
        eyes: "#ff1a1a", hornTips: "#37B1E2", wingEdge: "#37B1E2"
      },
      scale: 1.0,
      eyeStyle: "glowing-red"
    }
  ],

  characterName: "Charizard",

  palette: {
    background: { dark: "#0a0a1a", mid: "#1a1a3e", accent: "#37B1E2" },
    fire: { core: "#FFFFFF", mid: "#37B1E2", outer: "#1a5fc4", spark: "#91CCEC" },
    ui: { bannerOrange: "#F08030", bannerBlue: "#1a3a6e", bannerGold: "#FFD700" }
  },

  audio: {
    roarSmall: "assets/audio/sfx/roar-small.wav",
    roarMedium: "assets/audio/sfx/roar-medium.wav",
    roarMega: "assets/audio/sfx/roar-mega.wav",
    fireBreath: "assets/audio/sfx/fire-breath.wav",
    // ... etc
  }
};
```

### Educational Content (js/content/)

Separated from theme so curriculum can be tuned without touching presentation code.

```js
// content/colors.js
export const colorContent = {
  primary: [
    { name: "red",    hex: "#ff3333", voiceFile: "color-red" },
    { name: "blue",   hex: "#3377ff", voiceFile: "color-blue" },
    { name: "yellow", hex: "#ffdd00", voiceFile: "color-yellow" }
  ],
  extended: [
    { name: "green",  hex: "#33cc33", voiceFile: "color-green" },
    { name: "orange", hex: "#ff8833", voiceFile: "color-orange" },
    { name: "purple", hex: "#9933ff", voiceFile: "color-purple" }
  ],
  difficulty: {
    little: { targetCount: 2, useSet: "primary", showHint: true },
    big:    { targetCount: 4, useSet: "both",    showHint: false }
  }
};
```

Similar structure for `counting.js`, `shapes.js`, and `letters.js`. Each file contains all prompt data, difficulty tiers, and voice file references. Tuning educational progression = editing data files, not game logic.

---

## 10. Art Approach

### Style: "Chunky Silhouette"

Bold geometric shapes, exaggerated proportions, thick outlines. Like a talented 4-year-old's drawing of Mega Charizard X. Not pixel art, not realistic. Iconic.

**Principles:**
- Thick black outlines (4-6px at 1080p) on everything. Reads clearly from 10ft.
- Flat color fills, one or two tones per body part. No gradients.
- Exaggerated key features: black body, blue mouth flames, red eyes, big wings, tail flame, horns. These five things = instant recognition.
- All critical readable text rendered as DOM overlays (not canvas text).

### Mega Charizard X Construction (~12 body parts)

Each part is a canvas-drawn shape with an anchor point for independent animation:

```
1.  Torso         - rounded trapezoid, #1a1a2e
2.  Belly patch   - oval overlay, #91CCEC
3.  Head          - rounded rectangle, #1a1a2e
4.  Jaw           - hinged triangle (opens for roar/fire)
5.  Left horn     - triangle, blue-tipped (#37B1E2)
6.  Right horn    - triangle, blue-tipped
7.  Eyes          - small ovals, red glow (#ff1a1a) with bloom
8.  Left wing     - large angular polygon, dark with blue edges
9.  Right wing    - mirrored
10. Tail          - bezier curve, tapered, #1a1a2e
11. Tail flame    - procedural particle flame, blue
12. Mouth flames  - procedural particle, blue, streams from jaw sides
```

### Signature Poses / Animation States (charizard.js)

| State | Description | Used In |
|-------|-------------|---------|
| **idle** | Gentle body bob (Y ±3px, 2s), slow wing flap (±8°, 3s), constant flame flicker | Hub, waiting for input |
| **roar** | Head tilts back, jaw opens wide, mouth flames flare to 3x size, wings snap open, subtle screen shake | Game intros, celebrations |
| **attack** | Lunges forward, jaw opens, sustained fire stream from mouth, wings pulled back | Fire breath in Flame Colors, Fireball Count |
| **perch** | Wings folded at sides, standing upright on surface, tail curled, small idle flame | Hub (on mountain), Evolution Tower (on completed tower) |
| **calm-rest** | Wings tucked, eyes half-closed or closed, body slightly curled, tail flame small and steady | All calm reset variations |
| **fly** | Wings in active flap cycle (larger amplitude), body tilted forward, trailing flame | Sky Writer, victory laps, transitions |

Each pose defines target values for all 12 body parts. Transitions between poses are tweened over 0.3-0.5s using easing functions.

### Evolution Form Proportions

| Form | Screen Height | Visual Shorthand |
|------|--------------|-----------------|
| Charmander | 30% | Round head, big cute eyes, tiny arms, orange, small tail flame |
| Charmeleon | 45% | Longer snout, single horn, crimson, angry eyes, bigger flame |
| Charizard | 65% | Wings appear, orange, turquoise wing undersides, proud stance |
| Mega Charizard X | 75% | Black body, blue flames from mouth, red glowing eyes, multiple horns |

Opening transformation: white-out flash (0.3s), tween each body part to next form's values (0.5s), flash clears to reveal.

### Fire Particle System

The star visual. Layered procedural particles redrawn every frame:

| Layer | Color | Count | Behavior |
|-------|-------|-------|----------|
| Core | White → bright blue (#FFF → #37B1E2) | 5-8 | Tight cluster, small random offset |
| Mid | Blue → cyan (#37B1E2 → #1a8fc4) | 8-12 | Wider spread, more drift |
| Outer | Dark blue → purple (#1a5fc4 → #0d1b3e) | 5-8 | Largest spread, fast fade-out |
| Sparks | Bright dots (#91CCEC) | 3-5 | Shoot outward and fade |

Each particle has: position, velocity, lifetime, size, opacity.

**Fire variations:**

| Context | Total Particles | Speed | Feel |
|---------|----------------|-------|------|
| Idle mouth flame | 15 | Slow drift up | Smoldering |
| Fire breath attack | 40-60 | Fast horizontal | Powerful |
| Celebration explosion | 80-100 | Radial burst | Fireworks |
| Calm reset ember | 5-8 | Very slow upward | Cozy |
| Tail flame | 10-15 | Slow upward flicker | Steady |

### Performance Budgets

- **Target:** Consistent 60fps on a mid-range laptop.
- **Global particle cap:** 300 active particles max across all systems. If the cap is hit, oldest particles are killed first.
- **Adaptive spawn rate:** If frame time exceeds 18ms (below 55fps), particle spawn rates drop by 50%. If frame time exceeds 25ms (below 40fps), drop to 25% spawn rate and reduce outer/spark layers.
- **Offscreen canvas pre-rendering:** Reusable visuals (glow halos, ember sprites, star shapes, orb base, hub mountain) rendered once to offscreen canvases at init and stamped via `drawImage` each frame. Avoids recalculating gradients/arcs every frame.
- **No per-frame allocations:** Particle pools are pre-allocated arrays. No `new` in the render loop.

### Non-Character Art

- **Hub orbs:** Glowing circles with radial gradients. Pre-rendered to offscreen canvas.
- **Targets:** Bold geometric shapes with thick outlines. Flat-color, same style as character.
- **Backgrounds:** Layered gradient fills with silhouette mountains/clouds as bezier paths.
- **Stars (Sky Writer):** Large circles with 4-point cross bloom + thick glow halo. Very bright. Unmissable from couch.
- **Banners/UI:** CSS-styled DOM overlays for crisp text at any resolution.

---

## 11. Audio Approach

### Architecture

Two parallel systems:

**Web Audio API** - Sound effects. Low-latency. Gain nodes per category (SFX, Voice, Music). Master gain controlled by celebration intensity. Pitch shifting for variety.

**HTML `<audio>`** - Background music and ambient loops. Crossfading between tracks with volume tweening.

### Audio Unlock Flow

1. Page loads → static silhouette with pulsing glow.
2. "Click anywhere to begin" (DOM overlay).
3. Uncle clicks → `audioContext.resume()`.
4. Asset preload begins. Loading bar fills.
5. Complete → transition to opening.

### Sound Design

**Charizard sounds:**

| Sound | Approach |
|-------|----------|
| Roar (Charmander) | High-pitched filtered noise burst. Cute, squeaky. |
| Roar (Charizard) | Mid-pitch noise + low rumble. Powerful, not scary. |
| Roar (Mega) | Deep layered noise + sub-bass + reverb. The big one. |
| Fire breath | Filtered white noise with rising pitch sweep. |
| Fireball impact | Short noise burst + low thud. Punchy. |
| Flame crackle | Looping bandpass-filtered noise. Ambient warmth. |

**UI/Feedback sounds:**

| Sound | Approach |
|-------|----------|
| Correct answer | Ascending 3-note chime (C-E-G), bright bell |
| Wrong / fizzle | Single soft low tone. "Bonk" not "buzz" |
| Turn banner | Quick whoosh (noise burst with fast pitch drop) |
| Team Turn fanfare | 4-note brass-like stab (synth sawtooth + filter) |
| Hub orb select | Deep resonant gong/chime |
| Calm reset ambient | Low pad drone + slow wind texture |

### Voice Prompts

**Approach: AI text-to-speech with a warm, friendly child narrator voice.**

Use a high-quality TTS service (ElevenLabs, OpenAI TTS, or the free Kokoro TTS) to generate all voice clips. Select a voice that is warm, slightly young-sounding, enthusiastic but not hyperactive - think a friendly older kid encouraging a younger one. Not robotic, not overly dramatic.

**~30-40 short clips needed:**
- 10-15 word prompts: "Blue!", "Three!", "Circle!", "C!"
- 5-6 encouragement: "Great job!", "You did it!", "Wow!", "Try again!", "Amazing!"
- 4-5 turn cues: "Owen's turn!", "Kian's turn!", "Team turn!", "Ready, Owen?", "Ready, Kian?"
- 3-4 instructions per mini-game: "Hit the blue one!", "Count with me!"

**Generation workflow:** Write all prompt scripts including Owen and Kian's names, batch-generate through TTS API, normalize volume, export as .mp3. All ~40 clips can be generated in minutes and regenerated easily if the voice or wording needs tuning.

**Names are hardcoded as Owen and Kian** in the voice assets. The settings screen still allows name customization (for reskinning or if other kids play), with Web Speech API (`speechSynthesis`) as fallback for non-pre-generated names.

**Fallback:** Web Speech API for any prompts that aren't pre-generated. Functional but less warm.

### Voice File Naming Convention

```
assets/audio/voice/
├── prompts/
│   ├── color-red.mp3
│   ├── color-blue.mp3
│   ├── color-yellow.mp3
│   ├── number-1.mp3
│   ├── number-2.mp3
│   ├── shape-circle.mp3
│   ├── shape-square.mp3
│   ├── letter-c.mp3
│   ├── letter-f.mp3
│   └── ...
├── feedback/
│   ├── great-job.mp3
│   ├── you-did-it.mp3
│   ├── wow.mp3
│   ├── try-again.mp3
│   ├── amazing.mp3
│   └── ...
├── turns/
│   ├── owen-turn.mp3          # "Owen's turn!"
│   ├── kian-turn.mp3          # "Kian's turn!"
│   ├── team-turn.mp3          # "Team turn!"
│   ├── ready-owen.mp3         # "Ready, Owen?"
│   └── ready-kian.mp3         # "Ready, Kian?"
└── instructions/
    ├── hit-the-color.mp3      # "Hit the [color] one!"
    ├── count-with-me.mp3
    ├── find-the-shape.mp3
    └── fly-through-letter.mp3
```

**Lookup map** in `audio.js`:

```js
const voiceMap = {
  "color-red":     "assets/audio/voice/prompts/color-red.mp3",
  "color-blue":    "assets/audio/voice/prompts/color-blue.mp3",
  "great-job":     "assets/audio/voice/feedback/great-job.mp3",
  "owen-turn":     "assets/audio/voice/turns/owen-turn.mp3",
  "kian-turn":     "assets/audio/voice/turns/kian-turn.mp3",
  // ... generated from manifest.json at preload
};
```

### Prompt Subtitles (optional fallback)

For noisy rooms or low TV volume: a DOM overlay at the bottom of the screen shows the current voice prompt as large, bold text (48px+, white with dark outline). Toggled via parent settings. Off by default to keep the screen clean.

---

## 12. Hidden Controls Reference (Uncle Cheat Sheet)

| Key | Action |
|-----|--------|
| `1` | Celebration intensity: Calm |
| `2` | Celebration intensity: Normal (default) |
| `3` | Celebration intensity: Hype |
| `0` | Silent mode (voice prompts still audible) |
| `L` | Force next turn: Little Trainer |
| `B` | Force next turn: Big Trainer |
| `T` | Force next turn: Team Turn |
| `Space` (hold) | Extend current calm reset (+3s increments) |
| `R` | Replay current mini-game |
| `Esc` | Return to hub |
| `F` | Toggle fullscreen |

---

## 13. Reskinning Strategy

To create a non-Pokemon version (e.g. "Dragon Academy"):

1. **Replace `theme.js`:** New character name, new color palettes, new form names (Hatchling → Drake → Dragon → Elder Dragon).
2. **Replace `content/*.js`:** New letter associations (D is for Dragon), new icons.
3. **Replace `assets/audio/voice/`:** Re-record prompts with new character name.
4. **Replace `assets/audio/sfx/`:** New roar sounds if desired (or keep them - they're generic "dragon" sounds).
5. **No game logic changes.** All four mini-games, the turn system, the hub, the calm resets - all work identically. Only the skin changes.

The theming boundary is strict: `theme.js` and `content/` are the only files that reference the franchise. Everything else is generic "flying fire creature academy."

---

## 14. Summary

A four-mini-game educational spectacle built for Owen (2.5) and Kian (4) with vanilla HTML5 Canvas + JS, designed for TV display, uncle-controlled, with a Mega Charizard X theme that can be reskinned. The energy curve alternates between high-spectacle bursts and calm regulation resets. Turn-cues keep both boys engaged at appropriate difficulty levels (Owen as Little Trainer, Kian as Big Trainer). Celebration intensity is adjustable on the fly. The procedural art style is bold, iconic, and copyright-safe. Voice prompts use AI TTS with a warm child narrator voice that addresses Owen and Kian by name.
