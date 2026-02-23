// src/engine/games/sky-writer.ts
// Mini-game 4: Magic Runes — Letter Tracing via Star Constellations
//
// Night sky with glowing star constellations forming letters.
// Stars are numbered; player taps them in order to trace the magic rune.
// MCX sprite hovers in the corner. Lines connect completed stars.
//
// Owen (2.5yo): Giant letter silhouette, 2-3 star dots, 120px auto-snap,
//               auto-demo after 8s, NO phonics, 4 prompts per round.
//               Voice: "This is C! C for Charizard!"
// Kian (4yo):   4-5 star dots, 80px snap, alternating phonics (trace-only,
//               trace+phonics, trace-only, trace+phonics...), 6 prompts per round.
//               2 phonics choices only. Voice: "What sound does C make?"
//
// Systems: SpriteAnimator, VoiceSystem, HintLadder, tracker, FlameMeter

import type { GameScreen, GameContext } from '../screen-manager';
import { Background } from '../entities/backgrounds';
import { ParticlePool, setActivePool } from '../entities/particles';
import { SpriteAnimator } from '../entities/sprite-animator';
import { SPRITES } from '../../config/sprites';
import { VoiceSystem } from '../voice';
import { HintLadder } from '../systems/hint-ladder';
import { FlameMeter } from '../entities/flame-meter';
import { tracker } from '../../state/tracker.svelte';
import { starterLetters, letterPaths, type LetterItem } from '../../content/letters';
import {
  DESIGN_WIDTH,
  DESIGN_HEIGHT,
  PROMPTS_PER_ROUND,
} from '../../config/constants';
import { session } from '../../state/session.svelte';
import { settings } from '../../state/settings.svelte';
import { distance, randomRange } from '../utils/math';
import { theme } from '../../config/theme';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BANNER_DURATION = 1.5;
const ENGAGE_DURATION = 1.0;
const SHOW_LETTER_DURATION = 1.8;
const CELEBRATE_DURATION = 1.5;

/** MCX sprite position (top-right corner) */
const SPRITE_X = DESIGN_WIDTH - 140;
const SPRITE_Y = 160;
const SPRITE_SCALE = 5;

/** Letter bounding box in design space */
const LETTER_BOX = {
  x: DESIGN_WIDTH * 0.25,
  y: DESIGN_HEIGHT * 0.18,
  w: DESIGN_WIDTH * 0.5,
  h: DESIGN_HEIGHT * 0.6,
} as const;

/** Star dot diameter */
const STAR_DIAMETER = 65;

/** Auto-snap radius per difficulty */
const SNAP_RADIUS_OWEN = 120;
const SNAP_RADIUS_KIAN = 80;

/** Owen auto-demo timeout (seconds) */
const AUTO_DEMO_TIMEOUT = 8;

/** Number labels for voice counting */
const COUNT_WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];

/** Phonics data: letter -> { sound, wrong sound } */
const PHONICS: Record<string, { sound: string; wrongSound: string; wordExample: string }> = {
  C: { sound: 'Cuh', wrongSound: 'Sss', wordExample: 'Charizard' },
  F: { sound: 'Fff', wrongSound: 'Buh', wordExample: 'Fire' },
  S: { sound: 'Sss', wrongSound: 'Fff', wordExample: 'Star' },
  B: { sound: 'Buh', wrongSound: 'Duh', wordExample: 'Blue' },
};

/** Owen star counts (simplified, 2-3 stars) */
const OWEN_STAR_COUNT: Record<string, number> = { C: 3, F: 2, S: 3, B: 3 };
/** Kian star counts (4-5 stars) */
const KIAN_STAR_COUNT: Record<string, number> = { C: 5, F: 4, S: 5, B: 5 };

/** Blue fire palette */
const FIRE_COLORS = ['#FFFFFF', '#91CCEC', '#37B1E2', '#5ED4FC'];

/** Phonics option button size */
const PHONICS_BTN_W = 360;
const PHONICS_BTN_H = 110;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActiveStar {
  x: number;
  y: number;
  number: number; // 1-indexed display
  connected: boolean;
  pulseOffset: number;
  scale: number;  // pop-in animation 0..1
}

interface PhonicsChoice {
  label: string;
  correct: boolean;
  x: number;
  y: number;
}

type GamePhase =
  | 'banner'
  | 'engage'
  | 'show-letter'
  | 'trace'
  | 'celebrate'
  | 'phonics'
  | 'next';

// ---------------------------------------------------------------------------
// SkyWriterGame (Magic Runes)
// ---------------------------------------------------------------------------

export class SkyWriterGame implements GameScreen {
  // Systems
  private bg = new Background(80);
  private particles = new ParticlePool();
  private sprite = new SpriteAnimator(SPRITES['charizard-megax']);
  private hintLadder = new HintLadder();
  private flameMeter = new FlameMeter();
  private voice!: VoiceSystem;
  private gameContext!: GameContext;

  // Game state
  private phase: GamePhase = 'banner';
  private phaseTimer = 0;
  private totalTime = 0;
  private promptIndex = 0;
  private promptsTotal = 4;
  private inputLocked = true;

  // Per-letter state
  private currentLetter: LetterItem | null = null;
  private stars: ActiveStar[] = [];
  private nextStarIndex = 0;
  private autoAdvanceTimer = 0;

  // Phonics state
  private phonicsChoices: PhonicsChoice[] = [];
  private phonicsAnswered = false;
  private phonicsFlashTimer = 0;

  // Star pop-in animation
  private starsAppearIndex = 0;
  private starsAppearTimer = 0;

  // Audio shortcut
  private get audio(): any { return (this.gameContext as any).audio; }

  // Difficulty helpers
  private get isOwen(): boolean { return session.currentTurn === 'owen'; }
  private get snapRadius(): number { return this.isOwen ? SNAP_RADIUS_OWEN : SNAP_RADIUS_KIAN; }

  /** Kian phonics: every other prompt starting at index 1 (0-indexed) */
  private get isPhonicsRound(): boolean {
    return !this.isOwen && this.promptIndex % 2 === 1;
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  enter(ctx: GameContext): void {
    this.gameContext = ctx;
    setActivePool(this.particles);
    this.particles.clear();
    this.promptIndex = 0;
    this.inputLocked = true;
    this.totalTime = 0;

    if (this.audio) {
      this.voice = new VoiceSystem(this.audio);
    }

    // Owen: 4 prompts, Kian: 6 prompts (from PROMPTS_PER_ROUND or spec)
    this.promptsTotal = PROMPTS_PER_ROUND.skyWriter;

    this.startBanner();
  }

  exit(): void {
    this.particles.clear();
    this.gameContext.events.emit({ type: 'hide-prompt' });
    this.gameContext.events.emit({ type: 'hide-banner' });
  }

  // -----------------------------------------------------------------------
  // Phase: Banner
  // -----------------------------------------------------------------------

  private startBanner(): void {
    if (this.promptIndex >= this.promptsTotal) {
      this.endRound();
      return;
    }

    // Alternate turns
    const turn = session.nextTurn();
    session.currentTurn = turn;

    this.phase = 'banner';
    this.phaseTimer = 0;
    this.inputLocked = true;
    this.stars = [];

    this.gameContext.events.emit({ type: 'show-banner', turn });

    if (this.promptIndex === 0) {
      this.voice?.narrate('Trace the magic rune!');
    }
  }

  // -----------------------------------------------------------------------
  // Phase: Engage
  // -----------------------------------------------------------------------

  private startEngage(): void {
    this.phase = 'engage';
    this.phaseTimer = 0;

    this.gameContext.events.emit({ type: 'hide-banner' });

    // Three-Label Rule step 1: engagement
    const name = this.isOwen ? settings.littleTrainerName : settings.bigTrainerName;
    const action = this.isOwen ? 'point' : 'trace';
    this.voice?.engage(name, action);
  }

  // -----------------------------------------------------------------------
  // Phase: Show Letter
  // -----------------------------------------------------------------------

  private startShowLetter(): void {
    this.phase = 'show-letter';
    this.phaseTimer = 0;

    // Pick letter (cycle through starterLetters)
    this.currentLetter = starterLetters[this.promptIndex % starterLetters.length];

    // Check for spaced repetition first
    const repeats = tracker.getRepeatConcepts('letter');
    if (repeats.length > 0) {
      const found = starterLetters.find(l => repeats.includes(l.letter));
      if (found) {
        this.currentLetter = found;
        tracker.markRepeated(found.letter, 'letter');
      }
    }

    // Build star positions for this letter
    this.buildStars();

    // Initialize hint ladder
    this.hintLadder.startPrompt(this.currentLetter.letter);

    // Three-Label Rule step 2: "This is C!"
    this.voice?.prompt(
      `This is ${this.currentLetter.letter}`,
      `${this.currentLetter.letter} for ${this.currentLetter.word}!`,
    );

    this.audio?.playSynth('pop');
  }

  private buildStars(): void {
    const letter = this.currentLetter!.letter;
    const fullPath = letterPaths[letter];
    if (!fullPath) return;

    // Star count based on difficulty
    const starCount = this.isOwen
      ? (OWEN_STAR_COUNT[letter] ?? 3)
      : (KIAN_STAR_COUNT[letter] ?? 5);

    // Evenly sample points from the full path
    const step = Math.max(1, Math.floor(fullPath.length / starCount));
    const sampled: { x: number; y: number }[] = [];
    for (let i = 0; i < fullPath.length && sampled.length < starCount; i += step) {
      sampled.push(fullPath[i]);
    }
    // Ensure we have exactly starCount (pad with last if needed)
    while (sampled.length < starCount && fullPath.length > 0) {
      sampled.push(fullPath[fullPath.length - 1]);
    }

    // Convert normalised coordinates to canvas positions
    this.stars = sampled.map((sp, i) => ({
      x: LETTER_BOX.x + sp.x * LETTER_BOX.w,
      y: LETTER_BOX.y + sp.y * LETTER_BOX.h,
      number: i + 1,
      connected: false,
      pulseOffset: Math.random() * Math.PI * 2,
      scale: 0,
    }));

    this.nextStarIndex = 0;
    this.autoAdvanceTimer = 0;
    this.starsAppearIndex = 0;
    this.starsAppearTimer = 0;
  }

  // -----------------------------------------------------------------------
  // Phase: Trace
  // -----------------------------------------------------------------------

  private startTrace(): void {
    this.phase = 'trace';
    this.phaseTimer = 0;
    this.inputLocked = false;
    this.autoAdvanceTimer = 0;
    this.starsAppearTimer = 0;
    this.starsAppearIndex = 0;

    // Count voice: "One..."
    if (this.stars.length > 0) {
      this.voice?.hintRepeat(COUNT_WORDS[0] ?? '');
    }
  }

  private updateTrace(dt: number): void {
    // Animate stars appearing one by one
    this.starsAppearTimer += dt;
    while (
      this.starsAppearIndex < this.stars.length &&
      this.starsAppearTimer >= this.starsAppearIndex * 0.12
    ) {
      const idx = this.starsAppearIndex;
      // Simple scale pop-in
      this.stars[idx].scale = 0;
      this.starsAppearIndex++;
    }

    // Animate scales toward 1 for appeared stars
    for (let i = 0; i < this.starsAppearIndex; i++) {
      if (this.stars[i].scale < 1) {
        this.stars[i].scale = Math.min(1, this.stars[i].scale + dt * 4);
      }
    }

    // Owen auto-demo: after 8s of no input, auto-connect next star
    if (this.isOwen && this.nextStarIndex < this.stars.length) {
      this.autoAdvanceTimer += dt;
      if (this.autoAdvanceTimer >= AUTO_DEMO_TIMEOUT) {
        this.connectStar(this.nextStarIndex, true);
        this.autoAdvanceTimer = 0;
      }
    }

    // Hint escalation
    const escalated = this.hintLadder.update(dt);
    if (escalated) {
      const level = this.hintLadder.hintLevel;
      if (level === 1 && this.currentLetter) {
        this.voice?.hintRepeat(this.currentLetter.letter);
      }
    }
  }

  private connectStar(starIdx: number, wasAuto = false): void {
    if (starIdx !== this.nextStarIndex) return;
    if (starIdx >= this.stars.length) return;

    const star = this.stars[starIdx];
    star.connected = true;

    // Audio: pop on star connect
    this.audio?.playSynth('pop');

    // Particles at star
    this.particles.burst(star.x, star.y, 15, '#37B1E2', 100, 0.6);
    this.particles.burst(star.x, star.y, 8, '#FFFFFF', 60, 0.4);

    this.nextStarIndex++;
    this.autoAdvanceTimer = 0;

    // Voice: count ("Two... Three...")
    if (this.nextStarIndex < this.stars.length) {
      const countWord = COUNT_WORDS[this.nextStarIndex] ?? '';
      this.voice?.hintRepeat(countWord);
    }

    // Also say the letter occasionally while tracing
    if (this.nextStarIndex % 2 === 0 && this.currentLetter) {
      // Slight delay to not overlap count
      setTimeout(() => {
        this.voice?.hintRepeat(this.currentLetter!.letter);
      }, 400);
    }

    // Check completion
    if (this.nextStarIndex >= this.stars.length) {
      // All stars connected!
      this.inputLocked = true;

      // Record in tracker
      const correct = !wasAuto;
      tracker.recordAnswer(this.currentLetter!.letter, 'letter', correct);

      // FlameMeter charge
      this.flameMeter.addCharge(wasAuto ? 0.5 : 2);

      // Celebration voice: "C! C for Charizard!"
      this.voice?.successEcho(
        this.currentLetter!.letter,
        `${this.currentLetter!.letter} for ${this.currentLetter!.word}!`,
      );

      this.audio?.playSynth('correct-chime');

      // Big particle burst
      for (let i = 0; i < 25; i++) {
        const bx = randomRange(LETTER_BOX.x, LETTER_BOX.x + LETTER_BOX.w);
        const by = randomRange(LETTER_BOX.y, LETTER_BOX.y + LETTER_BOX.h);
        this.particles.burst(bx, by, 3,
          FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)], 80, 0.7);
      }

      setTimeout(() => this.startCelebrate(), 400);
    }
  }

  // -----------------------------------------------------------------------
  // Phase: Celebrate
  // -----------------------------------------------------------------------

  private startCelebrate(): void {
    this.phase = 'celebrate';
    this.phaseTimer = 0;
    this.inputLocked = true;

    this.gameContext.events.emit({ type: 'celebration', intensity: 'normal' });
  }

  // -----------------------------------------------------------------------
  // Phase: Phonics (Kian only)
  // -----------------------------------------------------------------------

  private startPhonics(): void {
    this.phase = 'phonics';
    this.phaseTimer = 0;
    this.inputLocked = false;
    this.phonicsAnswered = false;
    this.phonicsFlashTimer = 0;

    const letter = this.currentLetter!.letter;
    const phonicsData = PHONICS[letter];
    if (!phonicsData) {
      // No phonics data, skip
      this.startNext();
      return;
    }

    // "What sound does C make?"
    this.voice?.prompt(
      `What sound does ${letter} make`,
      `Point to the sound!`,
    );

    // Build 2 choices: correct + one wrong
    const centerY = DESIGN_HEIGHT * 0.65;
    const gap = 60;
    const totalW = 2 * PHONICS_BTN_W + gap;
    const startX = (DESIGN_WIDTH - totalW) / 2;

    const correctChoice: PhonicsChoice = {
      label: phonicsData.sound,
      correct: true,
      x: startX,
      y: centerY,
    };
    const wrongChoice: PhonicsChoice = {
      label: phonicsData.wrongSound,
      correct: false,
      x: startX + PHONICS_BTN_W + gap,
      y: centerY,
    };

    // Shuffle order
    this.phonicsChoices = Math.random() < 0.5
      ? [correctChoice, wrongChoice]
      : [wrongChoice, correctChoice];

    // Reposition after shuffle
    for (let i = 0; i < this.phonicsChoices.length; i++) {
      this.phonicsChoices[i].x = startX + i * (PHONICS_BTN_W + gap);
    }

    this.hintLadder.startPrompt(phonicsData.sound);
  }

  private handlePhonicsClick(x: number, y: number): void {
    if (this.phonicsAnswered) return;

    for (const choice of this.phonicsChoices) {
      if (
        x >= choice.x && x <= choice.x + PHONICS_BTN_W &&
        y >= choice.y && y <= choice.y + PHONICS_BTN_H
      ) {
        if (choice.correct) {
          this.phonicsAnswered = true;
          this.phonicsFlashTimer = 1.0;

          tracker.recordAnswer(this.currentLetter!.letter, 'letter', true);
          this.flameMeter.addCharge(2);

          this.audio?.playSynth('correct-chime');

          // "Cuh! C says cuh!"
          const phonicsData = PHONICS[this.currentLetter!.letter];
          if (phonicsData) {
            this.voice?.successEcho(
              phonicsData.sound,
              `${this.currentLetter!.letter} says ${phonicsData.sound}!`,
            );
          }

          this.particles.burst(
            choice.x + PHONICS_BTN_W / 2,
            choice.y + PHONICS_BTN_H / 2,
            30, theme.palette.celebration.gold, 150, 0.8,
          );
        } else {
          tracker.recordAnswer(this.currentLetter!.letter, 'letter', false);
          this.audio?.playSynth('wrong-bonk');

          const phonicsData = PHONICS[this.currentLetter!.letter];
          if (phonicsData) {
            this.voice?.wrongRedirect(choice.label, phonicsData.sound);
          }

          this.hintLadder.onMiss();

          this.particles.burst(
            choice.x + PHONICS_BTN_W / 2,
            choice.y + PHONICS_BTN_H / 2,
            6, theme.palette.ui.incorrect, 40, 0.3,
          );

          // Check auto-complete
          if (this.hintLadder.autoCompleted) {
            this.phonicsAnswered = true;
            this.phonicsFlashTimer = 1.0;
            this.flameMeter.addCharge(0.5);
            this.audio?.playSynth('pop');
          }
        }
        return;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Phase: Next / End
  // -----------------------------------------------------------------------

  private startNext(): void {
    this.phase = 'next';
    this.promptIndex++;

    if (this.promptIndex >= this.promptsTotal) {
      this.endRound();
    } else {
      this.startBanner();
    }
  }

  private endRound(): void {
    session.activitiesCompleted++;
    session.currentScreen = 'calm-reset';
    setTimeout(() => {
      this.gameContext.screenManager.goTo('calm-reset');
    }, 500);
  }

  // -----------------------------------------------------------------------
  // Update
  // -----------------------------------------------------------------------

  update(dt: number): void {
    this.totalTime += dt;
    this.phaseTimer += dt;
    this.bg.update(dt);
    this.particles.update(dt);
    this.sprite.update(dt);
    this.flameMeter.update(dt);

    switch (this.phase) {
      case 'banner':
        if (this.phaseTimer >= BANNER_DURATION) this.startEngage();
        break;

      case 'engage':
        if (this.phaseTimer >= ENGAGE_DURATION) this.startShowLetter();
        break;

      case 'show-letter':
        if (this.phaseTimer >= SHOW_LETTER_DURATION) this.startTrace();
        break;

      case 'trace':
        this.updateTrace(dt);
        break;

      case 'celebrate':
        // Ambient celebration sparks
        if (Math.random() < 0.3) {
          this.particles.spawn({
            x: randomRange(200, DESIGN_WIDTH - 200),
            y: randomRange(200, DESIGN_HEIGHT - 200),
            vx: randomRange(-30, 30),
            vy: randomRange(-60, -20),
            color: FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)],
            size: randomRange(2, 6),
            lifetime: randomRange(0.3, 0.7),
            drag: 0.96,
            fadeOut: true,
            shrink: true,
          });
        }
        if (this.phaseTimer >= CELEBRATE_DURATION) {
          // After celebration, decide phonics or next
          if (this.isPhonicsRound) {
            this.startPhonics();
          } else {
            this.startNext();
          }
        }
        break;

      case 'phonics':
        if (this.phonicsFlashTimer > 0) {
          this.phonicsFlashTimer -= dt;
          if (this.phonicsFlashTimer <= 0) {
            this.startNext();
          }
        }
        // Hint escalation during phonics
        if (!this.phonicsAnswered) {
          const escalated = this.hintLadder.update(dt);
          if (escalated && this.hintLadder.hintLevel === 1 && this.currentLetter) {
            const pd = PHONICS[this.currentLetter.letter];
            if (pd) this.voice?.hintRepeat(pd.sound);
          }
          if (this.hintLadder.autoCompleted && !this.phonicsAnswered) {
            this.phonicsAnswered = true;
            this.phonicsFlashTimer = 1.0;
            this.flameMeter.addCharge(0.5);
            this.audio?.playSynth('pop');
          }
        }
        break;
    }

    // Ambient blue embers near the constellation during tracing
    if (
      (this.phase === 'trace' || this.phase === 'show-letter') &&
      Math.random() < 0.1
    ) {
      this.particles.spawn({
        x: LETTER_BOX.x + randomRange(0, LETTER_BOX.w),
        y: LETTER_BOX.y + randomRange(0, LETTER_BOX.h),
        vx: randomRange(-10, 10),
        vy: randomRange(-40, -15),
        color: FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)],
        size: randomRange(1.5, 4),
        lifetime: randomRange(0.4, 1.0),
        drag: 0.97,
        fadeOut: true,
        shrink: true,
      });
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  render(ctx: CanvasRenderingContext2D): void {
    // Night sky background
    this.bg.render(ctx);

    // Extra dark overlay for deeper night sky
    ctx.fillStyle = 'rgba(0, 0, 20, 0.3)';
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Dim background during trace/show-letter to highlight stars
    if (this.phase === 'trace' || this.phase === 'show-letter') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    }

    // Atmospheric glow behind constellation area
    this.renderAtmosphericGlow(ctx);

    // MCX sprite in top-right corner
    this.sprite.render(ctx, SPRITE_X, SPRITE_Y, SPRITE_SCALE);

    // Warm glow behind sprite
    const glowGrad = ctx.createRadialGradient(SPRITE_X, SPRITE_Y, 20, SPRITE_X, SPRITE_Y, 200);
    glowGrad.addColorStop(0, 'rgba(55, 177, 226, 0.12)');
    glowGrad.addColorStop(1, 'rgba(55, 177, 226, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(SPRITE_X - 200, SPRITE_Y - 200, 400, 400);

    // Letter silhouette (show-letter and trace phases)
    if (
      this.currentLetter &&
      (this.phase === 'show-letter' || this.phase === 'trace' || this.phase === 'celebrate')
    ) {
      this.renderLetterSilhouette(ctx);
    }

    // Connecting lines between completed stars
    this.renderConnectingLines(ctx);

    // Stars
    this.renderStars(ctx);

    // Hint level 3: draw line from sprite toward next star
    if (this.phase === 'trace' && this.hintLadder.hintLevel >= 3) {
      const nextStar = this.stars[this.nextStarIndex];
      if (nextStar) {
        this.renderHintLine(ctx, nextStar);
      }
    }

    // Particles
    this.particles.render(ctx);

    // Flame meter at top
    this.flameMeter.render(ctx);

    // Letter title during tracing
    if (
      this.currentLetter &&
      (this.phase === 'show-letter' || this.phase === 'trace' || this.phase === 'celebrate')
    ) {
      this.renderLetterTitle(ctx);
    }

    // Phase-specific overlays
    if (this.phase === 'engage') {
      this.renderEngageText(ctx);
    }

    if (this.phase === 'phonics') {
      this.renderPhonics(ctx);
    }

    if (this.phase === 'celebrate') {
      this.renderCelebration(ctx);
    }

    // Progress dots
    if (this.phase !== 'banner' && this.phase !== 'next') {
      this.renderProgress(ctx);
    }
  }

  // -----------------------------------------------------------------------
  // Render: Atmospheric Glow
  // -----------------------------------------------------------------------

  private renderAtmosphericGlow(ctx: CanvasRenderingContext2D): void {
    const cx = LETTER_BOX.x + LETTER_BOX.w / 2;
    const cy = LETTER_BOX.y + LETTER_BOX.h / 2;
    const atmoGlow = ctx.createRadialGradient(cx, cy, 50, cx, cy, LETTER_BOX.w * 0.8);
    atmoGlow.addColorStop(0, 'rgba(55, 177, 226, 0.06)');
    atmoGlow.addColorStop(0.5, 'rgba(55, 177, 226, 0.02)');
    atmoGlow.addColorStop(1, 'rgba(55, 177, 226, 0)');
    ctx.fillStyle = atmoGlow;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  }

  // -----------------------------------------------------------------------
  // Render: Letter Silhouette (large font, faint)
  // -----------------------------------------------------------------------

  private renderLetterSilhouette(ctx: CanvasRenderingContext2D): void {
    if (!this.currentLetter) return;

    const cx = LETTER_BOX.x + LETTER_BOX.w / 2;
    const cy = LETTER_BOX.y + LETTER_BOX.h / 2;

    // Determine opacity based on phase
    let alpha = 0.12;
    if (this.phase === 'show-letter') {
      // Fade in during show-letter
      alpha = Math.min(this.phaseTimer / 0.5, 1) * 0.25;
    } else if (this.phase === 'celebrate') {
      // Bright during celebration
      alpha = 0.4;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#37B1E2';
    ctx.font = 'bold 500px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shadow glow for silhouette effect
    ctx.shadowColor = '#37B1E2';
    ctx.shadowBlur = 40;
    ctx.fillText(this.currentLetter.letter, cx, cy + 20);

    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // Render: Connecting Lines
  // -----------------------------------------------------------------------

  private renderConnectingLines(ctx: CanvasRenderingContext2D): void {
    for (let i = 1; i < this.stars.length; i++) {
      if (!this.stars[i].connected) break;
      const prev = this.stars[i - 1];
      const cur = this.stars[i];

      ctx.save();

      // Outer glow
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#37B1E2';
      ctx.lineWidth = 18;
      ctx.shadowColor = '#37B1E2';
      ctx.shadowBlur = 25;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(cur.x, cur.y);
      ctx.stroke();

      // Core line
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#91CCEC';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(cur.x, cur.y);
      ctx.stroke();

      // White-hot center
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(cur.x, cur.y);
      ctx.stroke();

      ctx.restore();
    }
  }

  // -----------------------------------------------------------------------
  // Render: Stars
  // -----------------------------------------------------------------------

  private renderStars(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      if (star.scale <= 0) continue;

      const isNext = i === this.nextStarIndex && this.phase === 'trace';
      const isConnected = star.connected;
      const s = star.scale;

      ctx.save();
      ctx.translate(star.x, star.y);
      ctx.scale(s, s);

      const pulse = isNext
        ? 1 + 0.15 * Math.sin(this.totalTime * 4 + star.pulseOffset)
        : 1;

      const bodyR = (STAR_DIAMETER / 2) * pulse;

      // Outer glow halo
      const glowR = bodyR + 30;
      const outerGlow = ctx.createRadialGradient(0, 0, bodyR * 0.5, 0, 0, glowR);
      if (isConnected) {
        outerGlow.addColorStop(0, 'rgba(55, 177, 226, 0.2)');
        outerGlow.addColorStop(1, 'rgba(55, 177, 226, 0)');
      } else if (isNext) {
        outerGlow.addColorStop(0, 'rgba(94, 212, 252, 0.5)');
        outerGlow.addColorStop(0.5, 'rgba(55, 177, 226, 0.25)');
        outerGlow.addColorStop(1, 'rgba(55, 177, 226, 0)');
      } else {
        outerGlow.addColorStop(0, 'rgba(145, 204, 236, 0.15)');
        outerGlow.addColorStop(1, 'rgba(145, 204, 236, 0)');
      }
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(0, 0, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Extra bright halo for next star (hint level 2)
      if (isNext && this.hintLadder.hintLevel >= 2) {
        const hintPulse = 1 + Math.sin(this.totalTime * 6) * 0.2;
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.shadowColor = '#5ED4FC';
        ctx.shadowBlur = 30 * hintPulse;
        ctx.fillStyle = '#37B1E2';
        ctx.beginPath();
        ctx.arc(0, 0, bodyR * 1.4 * hintPulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Star body
      const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, bodyR);
      if (isConnected) {
        bodyGrad.addColorStop(0, 'rgba(145, 204, 236, 0.5)');
        bodyGrad.addColorStop(1, 'rgba(55, 177, 226, 0.2)');
      } else if (isNext) {
        bodyGrad.addColorStop(0, '#FFFFFF');
        bodyGrad.addColorStop(0.4, '#5ED4FC');
        bodyGrad.addColorStop(1, '#37B1E2');
      } else {
        bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        bodyGrad.addColorStop(0.5, 'rgba(145, 204, 236, 0.5)');
        bodyGrad.addColorStop(1, 'rgba(55, 177, 226, 0.3)');
      }
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(0, 0, bodyR, 0, Math.PI * 2);
      ctx.fill();

      // Cross-glint sparkle (unconnected stars)
      if (!isConnected) {
        const glintLen = bodyR * 1.6 * pulse;
        ctx.save();
        ctx.globalAlpha = isNext ? 0.6 : 0.25;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -glintLen); ctx.lineTo(0, glintLen);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-glintLen, 0); ctx.lineTo(glintLen, 0);
        ctx.stroke();
        ctx.restore();
      }

      // Number label
      ctx.save();
      ctx.font = `bold ${isNext ? 30 : 24}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (isConnected) {
        ctx.fillStyle = 'rgba(145, 204, 236, 0.7)';
        ctx.font = 'bold 28px system-ui';
        ctx.fillText('\u2713', 0, 1);
      } else {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.strokeText(String(star.number), 0, 1);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(String(star.number), 0, 1);
      }
      ctx.restore();

      ctx.restore();
    }
  }

  // -----------------------------------------------------------------------
  // Render: Hint Line from sprite to next star
  // -----------------------------------------------------------------------

  private renderHintLine(ctx: CanvasRenderingContext2D, star: ActiveStar): void {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#37B1E2';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(SPRITE_X, SPRITE_Y + 60);
    ctx.lineTo(star.x, star.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // Render: Letter Title
  // -----------------------------------------------------------------------

  private renderLetterTitle(ctx: CanvasRenderingContext2D): void {
    if (!this.currentLetter) return;

    const x = DESIGN_WIDTH / 2;
    const y = 80;
    const pulse = 0.7 + 0.3 * Math.sin(this.totalTime * 2.5);

    ctx.save();

    // Glow behind text
    ctx.save();
    ctx.globalAlpha = 0.3 * pulse;
    const glow = ctx.createRadialGradient(x, y, 10, x, y, 120);
    glow.addColorStop(0, '#37B1E2');
    glow.addColorStop(1, 'rgba(55, 177, 226, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Letter text
    ctx.save();
    ctx.shadowColor = '#37B1E2';
    ctx.shadowBlur = 25 * pulse;
    ctx.font = 'bold 96px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeText(this.currentLetter.letter, x, y);
    ctx.fillText(this.currentLetter.letter, x, y);
    ctx.restore();

    // Word below
    ctx.font = 'bold 40px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(145, 204, 236, 0.8)';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    const subtitle = `${this.currentLetter.letter} is for ${this.currentLetter.word}`;
    ctx.strokeText(subtitle, x, y + 55);
    ctx.fillText(subtitle, x, y + 55);

    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // Render: Engage Text
  // -----------------------------------------------------------------------

  private renderEngageText(ctx: CanvasRenderingContext2D): void {
    const name = this.isOwen ? settings.littleTrainerName : settings.bigTrainerName;
    const action = this.isOwen ? 'point!' : 'trace!';
    const text = `${name}, ${action}`;

    ctx.save();
    ctx.font = 'bold 64px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(55, 177, 226, 0.5)';
    ctx.shadowBlur = 20;
    ctx.fillText(text, DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.45);
    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // Render: Phonics UI
  // -----------------------------------------------------------------------

  private renderPhonics(ctx: CanvasRenderingContext2D): void {
    if (!this.currentLetter) return;

    // Dim overlay
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    ctx.restore();

    // Question text
    ctx.save();
    ctx.font = 'bold 52px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    const question = `What sound does "${this.currentLetter.letter}" make?`;
    ctx.strokeText(question, DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.45);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(question, DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.45);
    ctx.restore();

    // Phonics buttons
    for (const choice of this.phonicsChoices) {
      const highlighted = this.phonicsAnswered && choice.correct && this.phonicsFlashTimer > 0;
      const bgColor = highlighted ? theme.palette.celebration.gold : 'rgba(20, 20, 50, 0.85)';
      const borderColor = highlighted ? '#FFFFFF' : 'rgba(55, 177, 226, 0.6)';

      ctx.save();
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(choice.x, choice.y, PHONICS_BTN_W, PHONICS_BTN_H, 16);
      ctx.fill();

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(choice.x, choice.y, PHONICS_BTN_W, PHONICS_BTN_H, 16);
      ctx.stroke();

      ctx.fillStyle = highlighted ? '#000000' : '#FFFFFF';
      ctx.font = 'bold 48px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(choice.label, choice.x + PHONICS_BTN_W / 2, choice.y + PHONICS_BTN_H / 2);
      ctx.restore();
    }
  }

  // -----------------------------------------------------------------------
  // Render: Celebration
  // -----------------------------------------------------------------------

  private renderCelebration(ctx: CanvasRenderingContext2D): void {
    const t = Math.min(this.phaseTimer / 0.3, 1);
    const scale = 0.5 + 0.5 * t; // simple ease
    const fadeStart = CELEBRATE_DURATION * 0.75;
    const alpha = this.phaseTimer < fadeStart
      ? 1
      : 1 - (this.phaseTimer - fadeStart) / (CELEBRATE_DURATION - fadeStart);

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textX = DESIGN_WIDTH / 2;
    const textY = DESIGN_HEIGHT * 0.35;

    // Glow
    ctx.save();
    ctx.shadowColor = theme.palette.celebration.gold;
    ctx.shadowBlur = 40;
    ctx.font = `bold ${Math.round(96 * scale)}px system-ui`;
    ctx.fillStyle = theme.palette.celebration.gold;
    ctx.fillText('GREAT!', textX, textY);
    ctx.restore();

    // Solid text
    ctx.font = `bold ${Math.round(96 * scale)}px system-ui`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('GREAT!', textX, textY);

    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // Render: Progress Dots
  // -----------------------------------------------------------------------

  private renderProgress(ctx: CanvasRenderingContext2D): void {
    const total = this.promptsTotal;
    const completed = this.promptIndex;
    const dotR = 10;
    const spacing = 36;
    const startX = DESIGN_WIDTH / 2 - ((total - 1) * spacing) / 2;
    const y = DESIGN_HEIGHT - 50;

    for (let i = 0; i < total; i++) {
      const dx = startX + i * spacing;
      const isCurrent = i === completed;

      ctx.save();

      if (i < completed) {
        ctx.fillStyle = '#37B1E2';
        ctx.shadowColor = '#37B1E2';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(dx, y, dotR, 0, Math.PI * 2);
        ctx.fill();
      } else if (isCurrent) {
        const pulse = 0.5 + 0.5 * Math.sin(this.totalTime * 3);
        ctx.strokeStyle = `rgba(94, 212, 252, ${0.5 + pulse * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(dx, y, dotR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(55, 177, 226, ${0.3 + pulse * 0.2})`;
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(dx, y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // -----------------------------------------------------------------------
  // Input
  // -----------------------------------------------------------------------

  handleClick(x: number, y: number): void {
    if (this.phase === 'phonics') {
      this.handlePhonicsClick(x, y);
      return;
    }

    if (this.phase !== 'trace' || this.inputLocked) return;
    if (this.nextStarIndex >= this.stars.length) return;

    const nextStar = this.stars[this.nextStarIndex];
    const dist = distance(x, y, nextStar.x, nextStar.y);

    if (dist <= this.snapRadius) {
      this.connectStar(this.nextStarIndex);
      return;
    }

    // For Owen: even more forgiving — check 1.5x snap radius
    if (this.isOwen && dist <= this.snapRadius * 1.5) {
      this.connectStar(this.nextStarIndex);
      return;
    }

    // Wrong area
    this.audio?.playSynth('wrong-bonk');

    this.hintLadder.onMiss();

    this.particles.burst(x, y, 4, 'rgba(255, 255, 255, 0.3)', 30, 0.3);

    // Auto-complete on too many misses
    if (this.hintLadder.autoCompleted) {
      this.connectStar(this.nextStarIndex, true);
    }
  }

  handleKey(key: string): void {
    if (key === 'Escape') {
      this.gameContext.screenManager.goTo('hub');
    }
  }
}
