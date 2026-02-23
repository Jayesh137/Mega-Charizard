# PRD: Mega Charizard Academy

## Product Summary

An educational browser game where Mega Charizard X teaches Owen (2.5) and Kian (4) colors, counting, shapes, and letters through spectacular fire-powered mini-challenges. Runs fullscreen in Chrome, displayed on a TV via HDMI, controlled by their uncle on the laptop.

## Users

| User | Role | Interaction |
|------|------|------------|
| Owen | Player (age 2.5) | Watches TV, shouts answers, points at screen |
| Kian | Player (age 4) | Watches TV, shouts answers, points at screen |
| Uncle | Controller | Sits at laptop, clicks/presses keys based on what boys shout |

## Goals

### Educational (by priority)
1. **Colors + Counting** (core) - Owen learns primary colors; Kian counts to 7
2. **Shapes + Sizes** (secondary) - Both learn basic shapes; size ordering via evolution chain
3. **Letters + Phonics** (secondary) - Kian learns letter recognition + sounds; Owen gets exposure

### Experience
- High-energy spectacle that keeps two Mega Charizard-obsessed boys glued to the TV
- Calm resets between activities to prevent overstimulation
- Both boys stay engaged with personalized turn-cues (Owen's turn / Kian's turn / Team turn)
- Age-appropriate difficulty: Owen gets easier prompts with hints; Kian gets harder prompts
- No failure states - only encouragement and escalating hints

## Requirements

### R1: Opening Spectacle
- ~22-second Mega Evolution transformation: Egg → Charmander → Charmeleon → Charizard → Mega Charizard X
- Subtle ember glow from frame one (no frozen black screen)
- Full sequence on first visit; short 5s intro on return visits with full replay available from hub
- Ends with title "MEGA CHARIZARD ACADEMY" and voice: "Welcome, Trainers!"

### R2: Hub Screen
- Mega Charizard X perched on volcanic mountain
- 3-4 glowing orbs (one per mini-game), each with distinct color and icon
- Hover brightens orb; click triggers Charizard fire breath + transition to mini-game
- Hidden controls: gear icon (settings), flame icon (replay opening), keyboard shortcuts

### R3: Mini-Game — Flame Colors (Color Recognition)
- Charizard shows a colored flame, voice names the color
- Uncle clicks matching colored target from 2-4 floating targets
- Charizard blasts target with fire breath; target explodes in colored sparks
- Owen mode: 2 targets, primary colors (red/blue/yellow), hint glow on correct target
- Kian mode: 3-4 targets, adds orange/purple/green, no hints, faster drift
- 4-5 targets per round, ~45 seconds

### R4: Mini-Game — Fireball Count (Counting)
- Number appears as glowing numeral + dot pips; voice says the number
- Uncle clicks to launch fireballs one at a time, each smashing a stone pillar
- Overshoot: fireball fizzles with "pffft" sound + gentle "too many" redirect
- Owen mode: numbers 1-3, pillars match the count exactly
- Kian mode: numbers 1-7, more pillars than needed (must stop at correct count)
- 4-5 numbers per round, ~60 seconds

### R5: Mini-Game — Evolution Tower (Shapes + Sizes)
- Charizard forges shape blocks with blue flame; shape outline glows on tower
- Uncle clicks matching shape; Charizard slams it into place, tower grows
- Shape introduction is gradual: circle/square/triangle first, then star/heart one at a time
- Size mode (every other round): visually distinct open-field scene, "which is bigger?" prompts
- Final size round: order Charmander/Charmeleon/Charizard smallest→biggest (always Team Turn)
- Owen mode: 3 shapes, 2 choices, big-vs-small only
- Kian mode: up to 7 shapes, 3 choices, small/medium/big sorting
- ~60 seconds per round

### R6: Mini-Game — Sky Writer (Letters + Phonics)
- Night sky with constellation letter outlines; Charizard draws blue fire trails between stars
- Uncle clicks numbered stars in sequence to trace the letter
- Starter letters: C (Charizard), F (fire), S (star), B (blue)
- Constellation targets: very thick, bright glow halos, generous click regions
- Phonics timeout: Charizard models the answer after ~4 seconds of no input
- Owen mode: 2-3 dots per letter, stars auto-advance on near-click, just recognition
- Kian mode: 4-5 dots in order, phonics questions after tracing, first-letter matching
- Team Turn finale: both boys trace a big letter filling the whole sky
- 3-4 letters per round, ~60-75 seconds

### R7: Turn-Cue System
- Three turn types: Owen's Turn (orange banner, Charmander icon), Kian's Turn (blue banner, Charizard icon), Team Turn (gold banner, MCX icon)
- Strict alternation: Owen → Kian → Owen → Kian → ... → Team (finale)
- Voice cue on each banner: "Owen's turn!" / "Kian's turn!" / "Team turn!"
- Banners show names + icons prominently, role label secondary
- Hidden overrides: `L` = force Owen, `B` = force Kian, `T` = force Team Turn

### R8: Fail-Safe & Pacing
- Miss once → correct target gently bounces
- Miss twice → target glows brighter and bounces
- Miss three times → Charizard taps the answer, voice says it, auto-completes with full celebration
- Timeout (~5 seconds no input) → Charizard models/demonstrates the answer
- Pacing never stalls; no dead ends ever

### R9: Celebration Intensity
- Three levels: Calm (key `1`), Normal (key `2`), Hype (key `3`)
- Calm: no shake, gentle sparkles, soft sounds
- Normal: subtle shake, fire sparks, medium sounds
- Hype: full shake, massive explosions, epic fanfare (visuals emphasized, audio peaks capped)
- Silent mode (key `0`): mutes all except voice prompts
- Quick-switch via keyboard at any time; no visual indicator to boys

### R10: Calm Reset Sequences
- 5-10 second passive breathing room between mini-games (no interaction)
- Three rotating variations: Power Up (pulsing glow), Stargazing (stars fading in), Flame Rest (cozy ember)
- "Ready, Owen?" / "Ready, Kian?" cue near end (~80% through)
- Duration scales with intensity: Calm=10s, Normal=7s, Hype=5s
- Hidden extend: hold `Space` for +3s increments
- Audio crossfade: game audio out, calm ambient in over 2 seconds

### R11: Session Structure
- Audio unlock screen → Opening → Hub → (Mini-game → Calm Reset) × 5-6 → Finale
- Finale: Charizard victory lap + "Great training, Trainers!" = natural stopping point
- Quick replay option after each mini-game (replay flame icon + next arrow)
- Total session: ~8-15 minutes

### R12: Prompt & UI Design
- All prompts icon-first (color flame blob, number + dot pips, shape outline). Text secondary.
- Charizard instructions: 2-4 seconds max
- Voice prompts + big visual cues always paired together
- Optional subtitles overlay (toggled in settings) for noisy rooms / low volume
- All critical readable text in DOM overlays (not canvas)

## Technical Constraints

### Stack
- Svelte 5 (Runes) + Vite 6 + TypeScript + HTML5 Canvas + Web Audio API
- Two-layer architecture: Canvas for game rendering, Svelte DOM overlay for UI
- `npm run build` → `npx serve dist` → Chrome fullscreen → HDMI → done
- Vite dev server for development with HMR

### Display
- Design resolution: 1920×1080 (16:9)
- Canvas scales to viewport with aspect ratio lock
- 5% safe area margin on all sides for TV overscan
- All interactive elements within safe area; backgrounds bleed to edges

### Performance
- Target: consistent 60fps on mid-range laptop
- Global particle cap: 300 active particles
- Adaptive spawn rate if FPS drops below 55
- Offscreen canvas pre-rendering for reusable visuals (glows, embers, orbs)
- Pre-allocated particle pools (no per-frame allocations)

### Art Style: "Chunky Silhouette"
- Procedural Canvas drawing (no copyrighted sprites)
- Thick outlines (4-6px at 1080p), flat color fills, exaggerated key features
- Mega Charizard X built from ~12 independently animatable body parts
- 6 signature poses: idle, roar, attack, perch, calm-rest, fly
- Layered procedural fire particle system (core/mid/outer/spark layers)

### Audio
- Web Audio API for SFX (low-latency, gain nodes per category)
- HTML `<audio>` for music/ambient loops (crossfading)
- AI TTS voice prompts (warm child narrator voice) addressing Owen and Kian by name
- ~40 pre-generated voice clips + Web Speech API fallback for dynamic text
- Strict voice file naming: `{category}-{word}.mp3` (e.g., `color-red.mp3`, `owen-turn.mp3`)

### Architecture
- Two-layer model: Canvas game engine (rAF loop) + Svelte DOM overlay (reactive UI)
- Engine ↔ Svelte communication via typed EventEmitter (discrete events, not per-frame)
- Standard GameScreen interface: `enter() / update(dt) / render() / exit() / handleClick() / handleKey()`
- Split state: `settings.svelte.ts` (persistent/localStorage) + `session.svelte.ts` (live) using Svelte 5 runes
- `config/theme.ts` for visual/audio identity (reskinnable)
- `content/*.ts` for educational data (colors, counting, shapes, letters) - tuning without code changes
- `config/manifest.ts` asset list + preloader with audio unlock on first click

### Reskinning
- To create a non-Pokemon version: replace `theme.js` + `content/*.js` + voice assets
- Zero game logic changes needed
- Theme boundary is strict: only `theme.js` and `content/` reference the franchise

## Hidden Controls (Uncle Cheat Sheet)

| Key | Action |
|-----|--------|
| `1` | Celebration: Calm |
| `2` | Celebration: Normal |
| `3` | Celebration: Hype |
| `0` | Silent mode (voice stays on) |
| `L` | Force Owen's turn |
| `B` | Force Kian's turn |
| `T` | Force Team turn |
| `Space` (hold) | Extend calm reset +3s |
| `R` | Replay current mini-game |
| `Esc` | Return to hub |
| `F` | Toggle fullscreen |

## Success Criteria

1. Owen and Kian are excited to play and ask for it again
2. Both boys stay engaged for a full 5-6 activity session
3. Owen (2.5) can participate meaningfully with Little Trainer prompts
4. Kian (4) feels challenged and proud with Big Trainer prompts
5. The uncle can smoothly control pacing, intensity, and turns in real-time
6. Educational concepts are absorbed through repetition across sessions
7. The calm resets successfully regulate energy between high-spectacle moments
8. The game loads instantly with zero setup friction (open file, click, fullscreen)

## Reference

Full technical design: [docs/plans/2026-02-23-mega-charizard-academy-design.md](docs/plans/2026-02-23-mega-charizard-academy-design.md)
Architecture: [architecture.md](architecture.md)
