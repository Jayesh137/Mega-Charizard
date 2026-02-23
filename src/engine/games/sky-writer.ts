// src/engine/games/sky-writer.ts
// Mini-game 4: Magic Runes — Letter Tracing via Star Constellations
//
// Night sky with glowing star constellations forming letters.
// Stars are numbered; player taps them in order to trace the magic rune.
// Charizard flies between stars, drawing bezier blue fire trails as each star is connected.
// When all stars are connected the completed letter blazes in blue flame — magical!
//
// Dual difficulty:
//   Owen (little): fewer stars per letter, auto-advance on near-click, no phonics
//   Kian (big):    full star paths, strict order, phonics question after tracing
//
// Audio: pop on star connect, correct-chime on letter complete, wrong-bonk on wrong click, cheer on celebration
// Voice: "Trace the magic rune!" at start, phonics call-out after tracing
// MCX poses: fly during tracing, happy on star connect, roar on completion, nudge on wrong click

import type { GameScreen, GameContext } from '../screen-manager';
import { Background } from '../entities/backgrounds';
import { ParticlePool, setActivePool } from '../entities/particles';
import { Charizard } from '../entities/charizard';
import { TweenManager, easing } from '../utils/tween';
import { FeedbackSystem } from '../entities/feedback';
import { distance, randomRange } from '../utils/math';
import { starterLetters, letterDifficulty, letterPaths } from '../../content/letters';
import {
  DESIGN_WIDTH,
  DESIGN_HEIGHT,
  PROMPTS_PER_ROUND,
  STAR_GLOW_RADIUS,
  FONT,
} from '../../config/constants';
import { theme } from '../../config/theme';
import { session } from '../../state/session.svelte';
import { settings } from '../../state/settings.svelte';

// ---------------------------------------------------------------------------
// Module-level voice helper (fallback when audio system unavailable)
// ---------------------------------------------------------------------------

function speakFallback(text: string): void {
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    u.pitch = 1.1;
    speechSynthesis.speak(u);
  }
}

// ---------------------------------------------------------------------------
// Star data types
// ---------------------------------------------------------------------------

interface ActiveStar {
  /** Canvas X */
  x: number;
  /** Canvas Y */
  y: number;
  /** Display number (1-indexed) */
  number: number;
  /** Has this star been connected? */
  connected: boolean;
  /** Glow pulse phase offset */
  pulseOffset: number;
  /** Scale tween for pop-in animation */
  scale: number;
}

// Phonics matching data for Kian's post-trace question
interface PhonicsOption {
  word: string;
  correct: boolean;
}

const phonicsQuestions: Record<string, PhonicsOption[]> = {
  C: [
    { word: 'Charizard', correct: true },
    { word: 'Fire', correct: false },
    { word: 'Cat', correct: true },
  ],
  F: [
    { word: 'Fire', correct: true },
    { word: 'Star', correct: false },
    { word: 'Fish', correct: true },
  ],
  S: [
    { word: 'Star', correct: true },
    { word: 'Blue', correct: false },
    { word: 'Sun', correct: true },
  ],
  B: [
    { word: 'Blue', correct: true },
    { word: 'Cat', correct: false },
    { word: 'Ball', correct: true },
  ],
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Bigger stars for Magic Runes (80px vs 65px default)
const RUNE_STAR_DIAMETER = 80;

// Blue fire palette for trails
const FIRE_TRAIL_COLORS = ['#FFFFFF', '#91CCEC', '#37B1E2', '#1a5fc4', '#5ED4FC'];

// Letter bounding box inside the play area (in design space)
const LETTER_BOX = {
  x: DESIGN_WIDTH * 0.3,
  y: DESIGN_HEIGHT * 0.2,
  w: DESIGN_WIDTH * 0.4,
  h: DESIGN_HEIGHT * 0.6,
} as const;

// Charizard sizing & starting position (upper left, flying)
const CHAR_SCALE = 0.42;

// Banner timing
const BANNER_DURATION = 1.8;

// Celebration timing
const CELEBRATION_DURATION = 2.0;

// Charizard flight speed (pixels per second in design space)
const CHAR_FLIGHT_SPEED = 900;

// Click radius: generous for toddlers (half of RUNE_STAR_DIAMETER + glow)
const CLICK_RADIUS = RUNE_STAR_DIAMETER / 2 + STAR_GLOW_RADIUS;

// Auto-advance radius for Owen (even more generous)
const AUTO_ADVANCE_RADIUS = CLICK_RADIUS * 1.6;

// Phonics display
const PHONICS_OPTION_WIDTH = 320;
const PHONICS_OPTION_HEIGHT = 90;

// ---------------------------------------------------------------------------
// Trail segment — stores bezier control points for smooth curves
// ---------------------------------------------------------------------------

interface TrailSegment {
  x1: number; y1: number;
  x2: number; y2: number;
  // Bezier control points for curved trail
  cx1: number; cy1: number;
  cx2: number; cy2: number;
  age: number;
}

// ---------------------------------------------------------------------------
// Game Phase
// ---------------------------------------------------------------------------

type GamePhase =
  | 'banner'
  | 'stars-appearing'     // stars pop in one by one
  | 'tracing'             // player clicking stars in order
  | 'charizard-flying'    // Charizard animating between stars
  | 'letter-complete'     // letter glowing, celebration
  | 'phonics'             // Kian's phonics question (big only)
  | 'celebrating'         // final celebration before next
  | 'complete';           // round over

// ---------------------------------------------------------------------------
// SkyWriterGame (Magic Runes)
// ---------------------------------------------------------------------------

export class SkyWriterGame implements GameScreen {
  // Sub-systems
  private bg = new Background(80); // extra stars for night sky feel
  private particles = new ParticlePool();
  private tweens = new TweenManager();
  private charizard = new Charizard(this.particles, this.tweens);
  private feedback = new FeedbackSystem(this.particles);
  private gameContext!: GameContext;

  // Audio shortcut
  private get audio(): any {
    return (this.gameContext as any).audio;
  }

  // Game state
  private phase: GamePhase = 'banner';
  private phaseTimer = 0;
  private letterIndex = 0;        // index into starterLetters
  private promptsRemaining = 0;
  private difficulty: 'little' | 'big' = 'little';

  // Per-letter state
  private stars: ActiveStar[] = [];
  private nextStarIndex = 0;        // which star to click next (0-indexed into this.stars)
  private connectedPairs: [ActiveStar, ActiveStar][] = [];
  private currentLetter = '';
  private currentWord = '';
  private currentPhonicsSound = '';

  // Charizard position (flies to each star)
  private charX = DESIGN_WIDTH * 0.15;
  private charY = DESIGN_HEIGHT * 0.45;
  private charTargetX = 0;
  private charTargetY = 0;
  private charFlying = false;

  // Trail fire segments — bezier curves between connected stars
  private trailSegments: TrailSegment[] = [];

  // Letter completion glow
  private letterGlowAlpha = 0;
  private letterCompleteTime = 0;

  // Screen shake
  private shakeAmount = 0;
  private shakeX = 0;
  private shakeY = 0;

  // Banner
  private bannerAlpha = 0;
  private bannerName = '';

  // Phonics state
  private phonicsOptions: PhonicsOption[] = [];
  private phonicsAnswered = false;
  private phonicsCorrectFlash = 0;
  private phonicsTimer = 0;

  // Timeout tracking
  private inputTimer = 0;

  // Total time for animation
  private totalTime = 0;

  // Stars appearing timer
  private starsAppearIndex = 0;
  private starsAppearTimer = 0;

  // Celebration
  private celebrationTimer = 0;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  enter(ctx: GameContext): void {
    this.gameContext = ctx;
    setActivePool(this.particles);
    this.particles.clear();
    this.tweens.clear();
    this.feedback.clear();

    this.promptsRemaining = PROMPTS_PER_ROUND.skyWriter;
    this.letterIndex = 0;
    this.totalTime = 0;
    this.charizard.setPose('fly');

    // Determine difficulty from current turn
    const turn = session.currentTurn;
    this.difficulty = turn === 'kian' ? 'big' : 'little';
    this.bannerName = turn === 'kian' ? settings.bigTrainerName : settings.littleTrainerName;

    this.startBanner();
  }

  exit(): void {
    this.particles.clear();
    this.tweens.clear();
    this.feedback.clear();
  }

  // ---------------------------------------------------------------------------
  // Phase: Banner
  // ---------------------------------------------------------------------------

  private startBanner(): void {
    this.phase = 'banner';
    this.phaseTimer = 0;
    this.bannerAlpha = 0;

    const turn = session.currentTurn;
    this.difficulty = turn === 'kian' ? 'big' : 'little';
    this.bannerName = turn === 'kian' ? settings.bigTrainerName : settings.littleTrainerName;
  }

  private updateBanner(_dt: number): void {
    const t = this.phaseTimer / BANNER_DURATION;
    if (t < 0.3) {
      this.bannerAlpha = t / 0.3;
    } else if (t < 0.8) {
      this.bannerAlpha = 1;
    } else {
      this.bannerAlpha = 1 - (t - 0.8) / 0.2;
    }

    if (this.phaseTimer >= BANNER_DURATION) {
      this.startNewLetter();
    }
  }

  private renderBanner(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.bannerAlpha;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Banner bar
    const bannerY = DESIGN_HEIGHT * 0.4;
    const bannerH = 140;
    const bannerColor = this.difficulty === 'little'
      ? theme.palette.ui.bannerOrange
      : theme.palette.ui.bannerBlue;

    ctx.fillStyle = bannerColor;
    ctx.fillRect(0, bannerY, DESIGN_WIDTH, bannerH);

    // Glow edge
    const edgeGrad = ctx.createLinearGradient(0, bannerY, 0, bannerY + bannerH);
    edgeGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
    edgeGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
    edgeGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, bannerY, DESIGN_WIDTH, bannerH);

    // Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${FONT.bannerName}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.bannerName}'s Turn!`, DESIGN_WIDTH / 2, bannerY + bannerH * 0.42);

    // Subtitle — Magic Runes story text
    ctx.font = `bold ${FONT.bannerRole}px system-ui`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('Trace the magic rune!', DESIGN_WIDTH / 2, bannerY + bannerH * 0.75);

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Phase: New Letter Setup
  // ---------------------------------------------------------------------------

  private startNewLetter(): void {
    const letterItem = starterLetters[this.letterIndex % starterLetters.length];
    this.currentLetter = letterItem.letter;
    this.currentWord = letterItem.word;
    this.currentPhonicsSound = letterItem.phonicsSound;

    // Get full path from the shared letterPaths in letters.ts
    const fullPath = letterPaths[this.currentLetter];
    if (!fullPath) {
      // Fallback — skip if letter not defined
      this.endRound();
      return;
    }

    // Trim stars to difficulty
    const starCount = this.difficulty === 'little'
      ? letterItem.starCount.little
      : letterItem.starCount.big;

    // Take first N stars and re-number them
    const pathSubset = fullPath.slice(0, starCount);

    // Convert normalised coordinates to canvas positions within LETTER_BOX
    this.stars = pathSubset.map((sp, i) => ({
      x: LETTER_BOX.x + sp.x * LETTER_BOX.w,
      y: LETTER_BOX.y + sp.y * LETTER_BOX.h,
      number: i + 1,
      connected: false,
      pulseOffset: Math.random() * Math.PI * 2,
      scale: 0, // will animate in
    }));

    this.nextStarIndex = 0;
    this.connectedPairs = [];
    this.trailSegments = [];
    this.letterGlowAlpha = 0;
    this.letterCompleteTime = 0;
    this.inputTimer = 0;
    this.phonicsAnswered = false;
    this.phonicsCorrectFlash = 0;
    this.phonicsTimer = 0;
    this.feedback.clear();

    // Position Charizard near the first star (slightly offset)
    if (this.stars.length > 0) {
      this.charX = this.stars[0].x - 120;
      this.charY = this.stars[0].y - 40;
    }

    // Voice: "Trace the magic rune!"
    if (this.audio) {
      this.audio.speakFallback('Trace the magic rune!');
    } else {
      speakFallback('Trace the magic rune!');
    }

    // Start stars appearing animation
    this.phase = 'stars-appearing';
    this.phaseTimer = 0;
    this.starsAppearIndex = 0;
    this.starsAppearTimer = 0;
  }

  // ---------------------------------------------------------------------------
  // Phase: Stars Appearing
  // ---------------------------------------------------------------------------

  private updateStarsAppearing(dt: number): void {
    this.starsAppearTimer += dt;

    // Pop in each star with a staggered delay (0.15s between each)
    while (this.starsAppearIndex < this.stars.length &&
           this.starsAppearTimer >= this.starsAppearIndex * 0.15) {
      const idx = this.starsAppearIndex;
      // Animate scale from 0 to 1 with overshoot
      this.tweens.add({
        from: 0,
        to: 1,
        duration: 0.35,
        easing: easing.easeOutBack,
        onUpdate: (v) => {
          if (this.stars[idx]) this.stars[idx].scale = v;
        },
      });

      // Spawn arrival sparkle
      const star = this.stars[idx];
      this.particles.burst(star.x, star.y, 8, '#91CCEC', 60, 0.5);

      this.starsAppearIndex++;
    }

    // All stars appeared — transition to tracing
    if (this.starsAppearIndex >= this.stars.length &&
        this.starsAppearTimer >= this.stars.length * 0.15 + 0.4) {
      this.phase = 'tracing';
      this.phaseTimer = 0;
      this.inputTimer = 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Phase: Tracing
  // ---------------------------------------------------------------------------

  private updateTracing(_dt: number): void {
    // Patiently wait for player to click next star — no auto-timeout
  }

  private autoAdvanceStar(): void {
    if (this.nextStarIndex >= this.stars.length) return;
    this.connectStar(this.nextStarIndex);
  }

  /**
   * Compute bezier control points for a smooth curve between two stars.
   * Uses perpendicular offset to create a gentle arc.
   */
  private computeBezierControlPoints(
    x1: number, y1: number, x2: number, y2: number,
  ): { cx1: number; cy1: number; cx2: number; cy2: number } {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Perpendicular offset for curvature (20% of segment length)
    const curvature = dist * 0.2;
    // Perpendicular direction
    const px = -dy / (dist || 1);
    const py = dx / (dist || 1);
    // Alternate curve direction based on segment count for visual variety
    const sign = (this.trailSegments.length % 2 === 0) ? 1 : -1;

    return {
      cx1: mx + px * curvature * sign * 0.6 - dx * 0.15,
      cy1: my + py * curvature * sign * 0.6 - dy * 0.15,
      cx2: mx + px * curvature * sign * 0.4 + dx * 0.15,
      cy2: my + py * curvature * sign * 0.4 + dy * 0.15,
    };
  }

  private connectStar(starIdx: number): void {
    if (starIdx !== this.nextStarIndex) return;
    if (starIdx >= this.stars.length) return;

    const star = this.stars[starIdx];
    star.connected = true;

    // Audio: pop when each star is connected
    this.audio?.playSynth('pop');

    // MCX pose: happy on star connect
    this.charizard.setPose('happy');
    setTimeout(() => this.charizard.setPose('fly'), 400);

    // Add trail segment from previous star (or from Charizard's position)
    if (starIdx > 0) {
      const prev = this.stars[starIdx - 1];
      this.connectedPairs.push([prev, star]);
      const cp = this.computeBezierControlPoints(prev.x, prev.y, star.x, star.y);
      this.trailSegments.push({
        x1: prev.x, y1: prev.y,
        x2: star.x, y2: star.y,
        cx1: cp.cx1, cy1: cp.cy1,
        cx2: cp.cx2, cy2: cp.cy2,
        age: 0,
      });
    }

    // Spawn burst at star
    this.particles.burst(star.x, star.y, 15, '#37B1E2', 100, 0.6);
    this.particles.burst(star.x, star.y, 8, '#FFFFFF', 60, 0.4);

    // Feedback: correct on star connect
    this.feedback.correct(star.x, star.y - 60);

    // Screen shake (gentle)
    this.shakeAmount = 6;

    // Fly Charizard to this star
    this.charTargetX = star.x - 80;
    this.charTargetY = star.y - 30;
    this.charFlying = true;

    this.nextStarIndex++;
    this.inputTimer = 0;

    // Check completion
    if (this.nextStarIndex >= this.stars.length) {
      // All stars connected!
      setTimeout(() => this.onLetterComplete(), 400);
    }
  }

  private onLetterComplete(): void {
    this.phase = 'letter-complete';
    this.phaseTimer = 0;
    this.letterCompleteTime = 0;

    // Audio: correct-chime on letter completion
    this.audio?.playSynth('correct-chime');

    // MCX pose: roar on letter completion
    this.charizard.setPose('roar');

    // Voice: "{Letter} says {phonicsSound}! {Letter} is for {word}!"
    const voiceText = `${this.currentLetter} says ${this.currentPhonicsSound}! ${this.currentLetter} is for ${this.currentWord}!`;
    if (this.audio) {
      this.audio.speakFallback(voiceText);
    } else {
      speakFallback(voiceText);
    }

    // Animate letter glow
    this.tweens.add({
      from: 0,
      to: 1,
      duration: 0.8,
      easing: easing.easeOut,
      onUpdate: (v) => { this.letterGlowAlpha = v; },
    });

    // Massive celebration burst
    for (let i = 0; i < 30; i++) {
      const sx = randomRange(LETTER_BOX.x, LETTER_BOX.x + LETTER_BOX.w);
      const sy = randomRange(LETTER_BOX.y, LETTER_BOX.y + LETTER_BOX.h);
      this.particles.burst(sx, sy, 3, FIRE_TRAIL_COLORS[Math.floor(Math.random() * FIRE_TRAIL_COLORS.length)], 80, 0.7);
    }

    // Screen shake
    this.shakeAmount = 10;

    // After glow, decide phonics or celebrate
    setTimeout(() => {
      const diff = letterDifficulty[this.difficulty];
      if (diff.includePhonics) {
        this.startPhonics();
      } else {
        this.startCelebration();
      }
    }, 1200);
  }

  // ---------------------------------------------------------------------------
  // Phase: Phonics (Kian only)
  // ---------------------------------------------------------------------------

  private startPhonics(): void {
    this.phase = 'phonics';
    this.phaseTimer = 0;
    this.phonicsTimer = 0;
    this.phonicsAnswered = false;
    this.phonicsCorrectFlash = 0;

    // Get phonics options for this letter, shuffle them
    const options = phonicsQuestions[this.currentLetter] || [];
    this.phonicsOptions = [...options].sort(() => Math.random() - 0.5);

    this.charizard.setPose('idle');

    // Voice: "What starts with {letter}?" for Kian's phonics
    const voiceText = `What starts with ${this.currentLetter}?`;
    if (this.audio) {
      this.audio.speakFallback(voiceText);
    } else {
      speakFallback(voiceText);
    }
  }

  private updatePhonics(dt: number): void {
    if (this.phonicsCorrectFlash > 0) {
      this.phonicsCorrectFlash -= dt;
      if (this.phonicsCorrectFlash <= 0) {
        this.startCelebration();
      }
      return;
    }

    // Patiently wait for player to answer — no auto-timeout
  }

  private handlePhonicsClick(x: number, y: number): void {
    if (this.phonicsAnswered) return;

    const optionStartY = DESIGN_HEIGHT * 0.7;
    const totalW = this.phonicsOptions.length * (PHONICS_OPTION_WIDTH + 20) - 20;
    const startX = (DESIGN_WIDTH - totalW) / 2;

    for (let i = 0; i < this.phonicsOptions.length; i++) {
      const ox = startX + i * (PHONICS_OPTION_WIDTH + 20);
      const oy = optionStartY;

      if (x >= ox && x <= ox + PHONICS_OPTION_WIDTH &&
          y >= oy && y <= oy + PHONICS_OPTION_HEIGHT) {
        const option = this.phonicsOptions[i];
        if (option.correct) {
          this.phonicsAnswered = true;
          this.phonicsCorrectFlash = 1.2;

          // Audio: correct-chime on correct phonics answer
          this.audio?.playSynth('correct-chime');

          // Celebration burst on correct answer
          this.particles.burst(ox + PHONICS_OPTION_WIDTH / 2, oy + PHONICS_OPTION_HEIGHT / 2,
            20, theme.palette.celebration.gold, 120, 0.7);

          // Feedback: correct
          this.feedback.correct(ox + PHONICS_OPTION_WIDTH / 2, oy - 30);

          this.charizard.setPose('roar');
          setTimeout(() => this.charizard.setPose('fly'), 500);
        } else {
          // Audio: wrong-bonk on wrong phonics answer
          this.audio?.playSynth('wrong-bonk');

          // Wrong answer — gentle shake + small red burst
          this.particles.burst(ox + PHONICS_OPTION_WIDTH / 2, oy + PHONICS_OPTION_HEIGHT / 2,
            6, theme.palette.ui.incorrect, 40, 0.3);

          // Feedback: wrong
          this.feedback.wrong(ox + PHONICS_OPTION_WIDTH / 2, oy - 30);

          // MCX pose: nudge on wrong answer
          this.charizard.setPose('nudge');
          setTimeout(() => this.charizard.setPose('idle'), 400);

          this.shakeAmount = 4;
        }
        return;
      }
    }
  }

  private renderPhonics(ctx: CanvasRenderingContext2D): void {
    // Question text
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${FONT.subtitle}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text outline for readability
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeText(`What starts with "${this.currentLetter}"?`, DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.62);
    ctx.fillText(`What starts with "${this.currentLetter}"?`, DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.62);

    // Option boxes
    const optionStartY = DESIGN_HEIGHT * 0.7;
    const totalW = this.phonicsOptions.length * (PHONICS_OPTION_WIDTH + 20) - 20;
    const startX = (DESIGN_WIDTH - totalW) / 2;

    for (let i = 0; i < this.phonicsOptions.length; i++) {
      const option = this.phonicsOptions[i];
      const ox = startX + i * (PHONICS_OPTION_WIDTH + 20);
      const oy = optionStartY;

      // Background
      const isHighlighted = this.phonicsAnswered && option.correct && this.phonicsCorrectFlash > 0;
      const bgColor = isHighlighted ? theme.palette.celebration.gold : 'rgba(20, 20, 50, 0.85)';
      const borderColor = isHighlighted ? '#FFFFFF' : 'rgba(55, 177, 226, 0.6)';

      ctx.fillStyle = bgColor;
      this.roundedRect(ctx, ox, oy, PHONICS_OPTION_WIDTH, PHONICS_OPTION_HEIGHT, 16);
      ctx.fill();

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      this.roundedRect(ctx, ox, oy, PHONICS_OPTION_WIDTH, PHONICS_OPTION_HEIGHT, 16);
      ctx.stroke();

      // Text
      ctx.fillStyle = isHighlighted ? '#000000' : '#FFFFFF';
      ctx.font = `bold 44px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(option.word, ox + PHONICS_OPTION_WIDTH / 2, oy + PHONICS_OPTION_HEIGHT / 2);
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Phase: Celebration
  // ---------------------------------------------------------------------------

  private startCelebration(): void {
    this.phase = 'celebrating';
    this.phaseTimer = 0;
    this.celebrationTimer = 0;

    // Audio: cheer on celebration
    this.audio?.playSynth('cheer');

    // MCX pose: roar during celebration
    this.charizard.setPose('roar');

    // Big fireworks
    for (let i = 0; i < 40; i++) {
      const bx = randomRange(DESIGN_WIDTH * 0.1, DESIGN_WIDTH * 0.9);
      const by = randomRange(DESIGN_HEIGHT * 0.1, DESIGN_HEIGHT * 0.5);
      const colors = [
        theme.palette.celebration.gold,
        theme.palette.celebration.hotOrange,
        theme.palette.celebration.cyan,
      ];
      this.particles.burst(bx, by, 3, colors[Math.floor(Math.random() * colors.length)], 120, 0.8);
    }
  }

  private updateCelebrating(dt: number): void {
    this.celebrationTimer += dt;

    // Ongoing celebration sparks
    if (Math.random() < 0.3) {
      const colors = [
        theme.palette.celebration.gold,
        theme.palette.celebration.hotOrange,
        theme.palette.celebration.cyan,
      ];
      this.particles.burst(
        randomRange(DESIGN_WIDTH * 0.1, DESIGN_WIDTH * 0.9),
        randomRange(DESIGN_HEIGHT * 0.1, DESIGN_HEIGHT * 0.4),
        2,
        colors[Math.floor(Math.random() * colors.length)],
        80, 0.6,
      );
    }

    if (this.celebrationTimer >= CELEBRATION_DURATION) {
      this.promptsRemaining--;
      this.letterIndex++;
      if (this.promptsRemaining <= 0) {
        this.endRound();
      } else {
        // Next turn
        session.currentTurn = session.nextTurn();
        this.startBanner();
      }
    }
  }

  private renderCelebration(ctx: CanvasRenderingContext2D): void {
    const t = Math.min(this.celebrationTimer / 0.3, 1);
    const scale = 0.5 + 0.5 * easing.easeOutBack(t);
    const fadeStart = CELEBRATION_DURATION * 0.8;
    const alpha = this.celebrationTimer < fadeStart
      ? 1
      : 1 - (this.celebrationTimer - fadeStart) / (CELEBRATION_DURATION - fadeStart);

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

  // ---------------------------------------------------------------------------
  // End Round
  // ---------------------------------------------------------------------------

  private endRound(): void {
    this.phase = 'complete';
    this.phaseTimer = 0;
    this.charizard.setPose('perch');

    session.activitiesCompleted++;
    session.currentScreen = 'calm-reset';

    setTimeout(() => {
      this.gameContext.screenManager.goTo('calm-reset');
    }, 500);
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  update(dt: number): void {
    this.phaseTimer += dt;
    this.totalTime += dt;
    this.bg.update(dt);
    this.tweens.update(dt);
    this.charizard.update(dt);
    this.particles.update(dt);
    this.feedback.update(dt);

    // Screen shake decay
    if (this.shakeAmount > 0.5) {
      this.shakeX = (Math.random() - 0.5) * 2 * this.shakeAmount;
      this.shakeY = (Math.random() - 0.5) * 2 * this.shakeAmount;
      this.shakeAmount *= 0.88;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
      this.shakeAmount = 0;
    }

    // Animate Charizard flight
    if (this.charFlying) {
      const dx = this.charTargetX - this.charX;
      const dy = this.charTargetY - this.charY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) {
        this.charFlying = false;
        this.charX = this.charTargetX;
        this.charY = this.charTargetY;
      } else {
        const step = CHAR_FLIGHT_SPEED * dt;
        const ratio = Math.min(step / dist, 1);
        this.charX += dx * ratio;
        this.charY += dy * ratio;
      }
    }

    // Age trail segments
    for (const seg of this.trailSegments) {
      seg.age += dt;
    }

    // Ambient blue embers near the constellation
    if (this.phase !== 'banner' && this.phase !== 'complete' && Math.random() < 0.15) {
      const cx = LETTER_BOX.x + LETTER_BOX.w / 2 + randomRange(-LETTER_BOX.w / 2, LETTER_BOX.w / 2);
      const cy = LETTER_BOX.y + LETTER_BOX.h / 2 + randomRange(-LETTER_BOX.h / 2, LETTER_BOX.h / 2);
      this.particles.spawn({
        x: cx,
        y: cy,
        vx: randomRange(-10, 10),
        vy: randomRange(-40, -15),
        color: FIRE_TRAIL_COLORS[Math.floor(Math.random() * FIRE_TRAIL_COLORS.length)],
        size: randomRange(1.5, 4),
        lifetime: randomRange(0.4, 1.0),
        drag: 0.97,
        fadeOut: true,
        shrink: true,
      });
    }

    // Spawn trail particles along connected segments (fire trails stay alive)
    // Sample points along bezier curves for particle spawning
    for (const seg of this.trailSegments) {
      if (Math.random() < 0.35) {
        // Pick a random parameter t along the bezier curve
        const t = Math.random();
        const t2 = t * t;
        const t3 = t2 * t;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        // Cubic bezier: B(t) = (1-t)^3*P0 + 3(1-t)^2*t*CP1 + 3(1-t)*t^2*CP2 + t^3*P1
        const px = mt3 * seg.x1 + 3 * mt2 * t * seg.cx1 + 3 * mt * t2 * seg.cx2 + t3 * seg.x2;
        const py = mt3 * seg.y1 + 3 * mt2 * t * seg.cy1 + 3 * mt * t2 * seg.cy2 + t3 * seg.y2;
        this.particles.spawn({
          x: px + randomRange(-4, 4),
          y: py + randomRange(-4, 4),
          vx: randomRange(-12, 12),
          vy: randomRange(-50, -20),
          color: FIRE_TRAIL_COLORS[Math.floor(Math.random() * FIRE_TRAIL_COLORS.length)],
          size: randomRange(2, 6),
          lifetime: randomRange(0.2, 0.5),
          drag: 0.95,
          fadeOut: true,
          shrink: true,
        });
      }
    }

    // Phase-specific updates
    switch (this.phase) {
      case 'banner':
        this.updateBanner(dt);
        break;
      case 'stars-appearing':
        this.updateStarsAppearing(dt);
        break;
      case 'tracing':
        this.updateTracing(dt);
        break;
      case 'charizard-flying':
        // Handled by charFlying animation; auto-transition in render check
        break;
      case 'letter-complete':
        this.letterCompleteTime += dt;
        break;
      case 'phonics':
        this.updatePhonics(dt);
        break;
      case 'celebrating':
        this.updateCelebrating(dt);
        break;
      case 'complete':
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Screen shake
    if (this.shakeAmount > 0) {
      ctx.translate(this.shakeX, this.shakeY);
    }

    // Night sky background (extra dark for constellation contrast)
    this.bg.render(ctx);

    // Extra dark overlay for deeper night sky
    ctx.fillStyle = 'rgba(0, 0, 20, 0.3)';
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Subtle blue atmospheric glow behind constellation area
    const atmoGlow = ctx.createRadialGradient(
      LETTER_BOX.x + LETTER_BOX.w / 2,
      LETTER_BOX.y + LETTER_BOX.h / 2,
      50,
      LETTER_BOX.x + LETTER_BOX.w / 2,
      LETTER_BOX.y + LETTER_BOX.h / 2,
      LETTER_BOX.w * 0.8,
    );
    atmoGlow.addColorStop(0, 'rgba(55, 177, 226, 0.06)');
    atmoGlow.addColorStop(0.5, 'rgba(55, 177, 226, 0.02)');
    atmoGlow.addColorStop(1, 'rgba(55, 177, 226, 0)');
    ctx.fillStyle = atmoGlow;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Letter name in top area
    if (this.phase !== 'banner' && this.phase !== 'complete') {
      this.renderLetterTitle(ctx);
    }

    // Fire trails (drawn behind stars) — bezier curves
    this.renderFireTrails(ctx);

    // Stars
    this.renderStars(ctx);

    // Letter completion glow overlay
    if (this.letterGlowAlpha > 0) {
      this.renderLetterGlow(ctx);
    }

    // Charizard
    this.charizard.render(ctx, this.charX, this.charY, CHAR_SCALE);

    // Particles on top
    this.particles.render(ctx);

    // Feedback system overlay
    this.feedback.render(ctx);

    // Banner overlay
    if (this.phase === 'banner') {
      this.renderBanner(ctx);
    }

    // Phonics UI
    if (this.phase === 'phonics') {
      this.renderPhonics(ctx);
    }

    // Celebration overlay
    if (this.phase === 'celebrating') {
      this.renderCelebration(ctx);
    }

    // Progress indicator (dots showing letters remaining)
    if (this.phase !== 'banner' && this.phase !== 'complete') {
      this.renderProgress(ctx);
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Render: Letter Title
  // ---------------------------------------------------------------------------

  private renderLetterTitle(ctx: CanvasRenderingContext2D): void {
    const x = DESIGN_WIDTH / 2;
    const y = 80;

    ctx.save();

    // Pulsing blue glow behind text
    const pulse = 0.7 + 0.3 * Math.sin(this.totalTime * 2.5);
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

    // Letter text with glow
    ctx.save();
    ctx.shadowColor = '#37B1E2';
    ctx.shadowBlur = 25 * pulse;
    ctx.font = `bold ${FONT.title}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';

    // Outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeText(this.currentLetter, x, y);
    ctx.fillText(this.currentLetter, x, y);
    ctx.restore();

    // Word below
    ctx.font = `bold ${FONT.bannerRole}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(145, 204, 236, 0.8)';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeText(`${this.currentLetter} is for ${this.currentWord}`, x, y + 60);
    ctx.fillText(`${this.currentLetter} is for ${this.currentWord}`, x, y + 60);

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Render: Fire Trails between connected stars (bezier curves)
  // ---------------------------------------------------------------------------

  private renderFireTrails(ctx: CanvasRenderingContext2D): void {
    for (const seg of this.trailSegments) {
      // Intensity ramps up over the first 0.3s, stays vivid
      const intensity = Math.min(seg.age / 0.3, 1);

      ctx.save();

      // === Outer glow (wide, soft blue) ===
      ctx.save();
      ctx.globalAlpha = 0.25 * intensity;
      ctx.strokeStyle = '#37B1E2';
      ctx.lineWidth = 28;
      ctx.shadowColor = '#37B1E2';
      ctx.shadowBlur = 40;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.bezierCurveTo(seg.cx1, seg.cy1, seg.cx2, seg.cy2, seg.x2, seg.y2);
      ctx.stroke();
      ctx.restore();

      // === Second glow layer (medium cyan) ===
      ctx.save();
      ctx.globalAlpha = 0.4 * intensity;
      ctx.strokeStyle = '#5ED4FC';
      ctx.lineWidth = 16;
      ctx.shadowColor = '#91CCEC';
      ctx.shadowBlur = 25;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.bezierCurveTo(seg.cx1, seg.cy1, seg.cx2, seg.cy2, seg.x2, seg.y2);
      ctx.stroke();
      ctx.restore();

      // === Core fire line (bright blue-white) ===
      ctx.save();
      ctx.globalAlpha = 0.75 * intensity;
      ctx.strokeStyle = '#91CCEC';
      ctx.lineWidth = 8;
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 15;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.bezierCurveTo(seg.cx1, seg.cy1, seg.cx2, seg.cy2, seg.x2, seg.y2);
      ctx.stroke();
      ctx.restore();

      // === White-hot center (thin, brightest) ===
      ctx.save();
      ctx.globalAlpha = 0.9 * intensity;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.bezierCurveTo(seg.cx1, seg.cy1, seg.cx2, seg.cy2, seg.x2, seg.y2);
      ctx.stroke();
      ctx.restore();

      // === Flickering heat distortion (animated offset on bezier) ===
      const flicker = Math.sin(this.totalTime * 12 + seg.x1) * 2;
      ctx.save();
      ctx.globalAlpha = 0.15 * intensity;
      ctx.strokeStyle = '#5ED4FC';
      ctx.lineWidth = 20;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1 + flicker);
      ctx.bezierCurveTo(
        seg.cx1, seg.cy1 + flicker,
        seg.cx2, seg.cy2 - flicker,
        seg.x2, seg.y2 - flicker,
      );
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Render: Stars (using bigger 80px diameter)
  // ---------------------------------------------------------------------------

  private renderStars(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      if (star.scale <= 0) continue;

      const isNext = i === this.nextStarIndex && (this.phase === 'tracing' || this.phase === 'stars-appearing');
      const isConnected = star.connected;
      const s = star.scale;

      ctx.save();
      ctx.translate(star.x, star.y);
      ctx.scale(s, s);

      // --- Pulse for next star ---
      const pulse = isNext
        ? 1 + 0.15 * Math.sin(this.totalTime * 4 + star.pulseOffset)
        : 1;

      // --- Outer glow halo ---
      const glowR = (RUNE_STAR_DIAMETER / 2 + STAR_GLOW_RADIUS) * pulse;
      const outerGlow = ctx.createRadialGradient(0, 0, RUNE_STAR_DIAMETER / 4, 0, 0, glowR);

      if (isConnected) {
        // Connected stars: dimmer blue-green glow
        outerGlow.addColorStop(0, 'rgba(55, 177, 226, 0.25)');
        outerGlow.addColorStop(0.5, 'rgba(55, 177, 226, 0.08)');
        outerGlow.addColorStop(1, 'rgba(55, 177, 226, 0)');
      } else if (isNext) {
        // Next star: bright pulsing blue-white glow
        outerGlow.addColorStop(0, 'rgba(94, 212, 252, 0.55)');
        outerGlow.addColorStop(0.4, 'rgba(55, 177, 226, 0.3)');
        outerGlow.addColorStop(1, 'rgba(55, 177, 226, 0)');
      } else {
        // Future stars: subtle glow
        outerGlow.addColorStop(0, 'rgba(145, 204, 236, 0.2)');
        outerGlow.addColorStop(0.5, 'rgba(145, 204, 236, 0.06)');
        outerGlow.addColorStop(1, 'rgba(145, 204, 236, 0)');
      }

      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(0, 0, glowR, 0, Math.PI * 2);
      ctx.fill();

      // --- Second glow pass for next-star extra brightness ---
      if (isNext) {
        ctx.save();
        ctx.shadowColor = '#5ED4FC';
        ctx.shadowBlur = 30 * pulse;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, RUNE_STAR_DIAMETER / 2 * 1.2 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = '#37B1E2';
        ctx.fill();
        ctx.restore();
      }

      // --- Star body ---
      const bodyR = RUNE_STAR_DIAMETER / 2 * pulse;
      const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, bodyR);

      if (isConnected) {
        // Connected: dimmer, greenish-blue
        bodyGrad.addColorStop(0, 'rgba(145, 204, 236, 0.6)');
        bodyGrad.addColorStop(0.5, 'rgba(55, 177, 226, 0.4)');
        bodyGrad.addColorStop(1, 'rgba(26, 95, 196, 0.2)');
      } else if (isNext) {
        // Next: bright white-blue
        bodyGrad.addColorStop(0, '#FFFFFF');
        bodyGrad.addColorStop(0.3, '#5ED4FC');
        bodyGrad.addColorStop(0.7, '#37B1E2');
        bodyGrad.addColorStop(1, '#1a5fc4');
      } else {
        // Future: medium blue
        bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        bodyGrad.addColorStop(0.3, 'rgba(145, 204, 236, 0.6)');
        bodyGrad.addColorStop(0.7, 'rgba(55, 177, 226, 0.4)');
        bodyGrad.addColorStop(1, 'rgba(26, 95, 196, 0.2)');
      }

      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(0, 0, bodyR, 0, Math.PI * 2);
      ctx.fill();

      // --- Star cross-glint (4-pointed star sparkle) ---
      if (!isConnected) {
        const glintLen = bodyR * 1.8 * pulse;
        const glintW = 2;
        ctx.save();
        ctx.globalAlpha = isNext ? 0.7 : 0.3;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = glintW;
        // Vertical
        ctx.beginPath();
        ctx.moveTo(0, -glintLen);
        ctx.lineTo(0, glintLen);
        ctx.stroke();
        // Horizontal
        ctx.beginPath();
        ctx.moveTo(-glintLen, 0);
        ctx.lineTo(glintLen, 0);
        ctx.stroke();
        ctx.restore();
      }

      // --- Number label ---
      ctx.save();
      ctx.font = `bold ${isNext ? 32 : 26}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (isConnected) {
        // Checkmark instead of number
        ctx.fillStyle = 'rgba(145, 204, 236, 0.7)';
        ctx.font = `bold 30px system-ui`;
        ctx.fillText('\u2713', 0, 1); // Unicode checkmark
      } else {
        // Outline for readability
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
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

  // ---------------------------------------------------------------------------
  // Render: Letter Completion Glow
  // ---------------------------------------------------------------------------

  private renderLetterGlow(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.letterGlowAlpha * 0.4;

    // Radial glow over the whole letter area
    const cx = LETTER_BOX.x + LETTER_BOX.w / 2;
    const cy = LETTER_BOX.y + LETTER_BOX.h / 2;
    const pulse = 1 + 0.1 * Math.sin(this.totalTime * 6);
    const r = Math.max(LETTER_BOX.w, LETTER_BOX.h) * 0.7 * pulse;

    const glow = ctx.createRadialGradient(cx, cy, 30, cx, cy, r);
    glow.addColorStop(0, 'rgba(55, 177, 226, 0.5)');
    glow.addColorStop(0.4, 'rgba(94, 212, 252, 0.2)');
    glow.addColorStop(1, 'rgba(55, 177, 226, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw all trail segments extra bright (bezier curves)
    if (this.letterGlowAlpha > 0.5) {
      for (const seg of this.trailSegments) {
        ctx.save();
        ctx.globalAlpha = (this.letterGlowAlpha - 0.5) * 0.6;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 5;
        ctx.shadowColor = '#5ED4FC';
        ctx.shadowBlur = 30;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.bezierCurveTo(seg.cx1, seg.cy1, seg.cx2, seg.cy2, seg.x2, seg.y2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Render: Progress Dots (bottom of screen)
  // ---------------------------------------------------------------------------

  private renderProgress(ctx: CanvasRenderingContext2D): void {
    const total = PROMPTS_PER_ROUND.skyWriter;
    const completed = total - this.promptsRemaining;
    const dotR = 10;
    const spacing = 36;
    const startX = DESIGN_WIDTH / 2 - ((total - 1) * spacing) / 2;
    const y = DESIGN_HEIGHT - 50;

    for (let i = 0; i < total; i++) {
      const dx = startX + i * spacing;
      const isCurrent = i === completed;

      ctx.save();

      if (i < completed) {
        // Completed dot: bright blue
        ctx.fillStyle = '#37B1E2';
        ctx.shadowColor = '#37B1E2';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(dx, y, dotR, 0, Math.PI * 2);
        ctx.fill();
      } else if (isCurrent) {
        // Current: pulsing outline
        const pulse = 0.5 + 0.5 * Math.sin(this.totalTime * 3);
        ctx.strokeStyle = `rgba(94, 212, 252, ${0.5 + pulse * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(dx, y, dotR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(55, 177, 226, ${0.3 + pulse * 0.2})`;
        ctx.fill();
      } else {
        // Future dot: dim
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(dx, y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  handleClick(x: number, y: number): void {
    if (this.phase === 'phonics') {
      this.handlePhonicsClick(x, y);
      return;
    }

    if (this.phase !== 'tracing') return;
    if (this.nextStarIndex >= this.stars.length) return;

    const diff = letterDifficulty[this.difficulty];
    const nextStar = this.stars[this.nextStarIndex];

    // Check click against the next star
    const dist = distance(x, y, nextStar.x, nextStar.y);
    const hitRadius = diff.autoAdvanceNearClick ? AUTO_ADVANCE_RADIUS : CLICK_RADIUS;

    if (dist <= hitRadius) {
      this.connectStar(this.nextStarIndex);
      return;
    }

    // For Owen (auto-advance), also check nearby any unconnected star in order
    if (diff.autoAdvanceNearClick) {
      // Check if they clicked reasonably close to the next star (even more forgiving)
      if (dist <= AUTO_ADVANCE_RADIUS * 1.5) {
        this.connectStar(this.nextStarIndex);
        return;
      }
    }

    // Wrong area — audio: wrong-bonk on wrong click
    this.audio?.playSynth('wrong-bonk');

    // MCX pose: nudge when clicking wrong area
    this.charizard.setPose('nudge');
    setTimeout(() => this.charizard.setPose('fly'), 400);

    // Feedback: wrong at click position
    this.feedback.wrong(x, y - 40);

    // Gentle particle feedback
    this.particles.burst(x, y, 4, 'rgba(255, 255, 255, 0.3)', 30, 0.3);

    // If close to a future star (not next), give a gentle nudge hint
    for (let i = this.nextStarIndex + 1; i < this.stars.length; i++) {
      const s = this.stars[i];
      if (distance(x, y, s.x, s.y) <= CLICK_RADIUS) {
        // Flash the next star brighter to hint
        this.feedback.hint(nextStar.x, nextStar.y - 60);
        this.shakeAmount = 3;
        return;
      }
    }
  }

  handleKey(key: string): void {
    if (key === 'Escape') {
      this.gameContext.screenManager.goTo('hub');
    }
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  private roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
