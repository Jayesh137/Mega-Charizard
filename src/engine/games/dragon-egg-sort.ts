// src/engine/games/dragon-egg-sort.ts
// Mini-game 5: Dragon Egg Sort — Color Sorting
//
// Story: "Sort the dragon eggs into the right nests before they hatch!"
//
// Flow:
//   1. 2-3 colored nests at bottom of screen
//   2. Dragon eggs roll in one at a time from the right side
//   3. Each egg has a clear color with small sparkles matching
//   4. Voice: "This is a BLUE egg! Which nest?"
//   5. Player clicks the matching nest
//   6. Correct: egg rolls into nest, settles with glow, MCX breathes warm flame, correct-chime
//   7. Wrong: egg bounces back, "That's the RED nest! Find the BLUE nest!"
//   8. After all eggs sorted: eggs wobble and crack — baby dragon heads peek out! Celebration!
//
// Dual difficulty:
//   Owen (2.5): 2 nests (red/blue), eggs are one color, very clear
//   Kian (4):   3-4 nests, some eggs have stripes/spots (sort by primary color)

import type { GameScreen, GameContext } from '../screen-manager';
import { Background } from '../entities/backgrounds';
import { ParticlePool, setActivePool } from '../entities/particles';
import { Charizard } from '../entities/charizard';
import { TweenManager, easing } from '../utils/tween';
import { FeedbackSystem } from '../entities/feedback';
import { drawNest } from '../entities/nest';
import { DESIGN_WIDTH, DESIGN_HEIGHT, FONT } from '../../config/constants';
import { session } from '../../state/session.svelte';
import { settings } from '../../state/settings.svelte';
import { randomRange } from '../utils/math';

// ---------------------------------------------------------------------------
// speakFallback (same pattern as other games)
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
// Constants
// ---------------------------------------------------------------------------

const BANNER_DURATION = 2.0;
const EGGS_PER_ROUND = 6;
const EGG_WIDTH = 100;
const EGG_HEIGHT = 130;
const NEST_WIDTH = 280;
const NEST_HEIGHT = 160;
const CELEBRATION_DURATION = 2.5;
const HATCH_DURATION = 2.5;
const EGG_ROLL_IN_DURATION = 0.8;
const EGG_ROLL_TO_NEST_DURATION = 0.5;
const SETTLE_DURATION = 0.6;
const WRONG_BOUNCE_DURATION = 0.5;

// MCX position: right side
const CHAR_X = DESIGN_WIDTH * 0.82;
const CHAR_Y = DESIGN_HEIGHT * 0.45;
const CHAR_SCALE = 0.50;

// Where the current egg waits for player input
const EGG_WAIT_X = DESIGN_WIDTH * 0.5;
const EGG_WAIT_Y = DESIGN_HEIGHT * 0.35;

// Nest baseline Y
const NEST_Y = DESIGN_HEIGHT * 0.78;

// ---------------------------------------------------------------------------
// Color data
// ---------------------------------------------------------------------------

const NEST_COLORS = [
  { name: 'RED', hex: '#E74C3C', light: '#FF7675', dark: '#A93226' },
  { name: 'BLUE', hex: '#3498DB', light: '#74B9FF', dark: '#2471A3' },
  { name: 'GREEN', hex: '#2ECC71', light: '#55EFC4', dark: '#1E8449' },
  { name: 'YELLOW', hex: '#F1C40F', light: '#FFEAA7', dark: '#B7950B' },
  { name: 'PURPLE', hex: '#9B59B6', light: '#A29BFE', dark: '#6C3483' },
];

// Flame particle palette
const FLAME_COLORS = ['#FFFFFF', '#E0F7FF', '#37B1E2', '#1A5C8A'];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GamePhase =
  | 'banner'
  | 'egg-rolling-in'
  | 'waiting'
  | 'rolling-to-nest'
  | 'settling'
  | 'wrong-bounce'
  | 'hatching'
  | 'celebrating'
  | 'complete';

interface Egg {
  colorIndex: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  rotation: number;
  scale: number;
  wobble: number;
  sorted: boolean;
  hatching: boolean;
  hatchProgress: number;
}

interface Nest {
  colorIndex: number;
  x: number;
  y: number;
  eggs: Egg[];
  glowing: boolean;
}

// ---------------------------------------------------------------------------
// DragonEggSortGame
// ---------------------------------------------------------------------------

export class DragonEggSortGame implements GameScreen {
  // Systems
  private bg = new Background(30);
  private particles = new ParticlePool();
  private feedback = new FeedbackSystem(this.particles);
  private tweens = new TweenManager();
  private charizard = new Charizard(this.particles, this.tweens);
  private gameContext!: GameContext;

  // Audio accessor
  private get audio(): any { return (this.gameContext as any).audio; }

  // Phase / flow
  private phase: GamePhase = 'banner';
  private phaseTimer = 0;
  private difficulty: 'little' | 'big' = 'little';
  private time = 0;

  // Banner
  private bannerName = '';
  private bannerAlpha = 0;

  // Nests
  private nests: Nest[] = [];

  // Egg queue
  private eggQueue: Egg[] = [];
  private currentEgg: Egg | null = null;
  private eggsRemaining = 0;

  // Input
  private inputLocked = false;
  private missCount = 0;

  // Hatching
  private hatchTimer = 0;

  // Celebration
  private celebrationTimer = 0;

  // Screen shake
  private shakeAmount = 0;
  private shakeX = 0;
  private shakeY = 0;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  enter(ctx: GameContext): void {
    this.gameContext = ctx;
    setActivePool(this.particles);
    this.particles.clear();
    this.tweens.clear();
    this.time = 0;

    const turn = session.currentTurn;
    this.difficulty = turn === 'kian' ? 'big' : 'little';
    this.bannerName = turn === 'kian'
      ? settings.bigTrainerName
      : settings.littleTrainerName;

    this.charizard.setPose('fly');
    this.missCount = 0;

    // Set up nests based on difficulty
    this.setupNests();

    // Generate egg sequence
    this.generateEggQueue();

    this.startBanner();
  }

  update(dt: number): void {
    this.time += dt;
    this.phaseTimer += dt;
    this.bg.update(dt);
    this.tweens.update(dt);
    this.charizard.update(dt);
    this.particles.update(dt);
    this.feedback.update(dt);

    // Screen shake decay
    if (this.shakeAmount > 0.5) {
      this.shakeX = (Math.random() - 0.5) * 2 * this.shakeAmount;
      this.shakeY = (Math.random() - 0.5) * 2 * this.shakeAmount;
      this.shakeAmount *= 0.86;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
      this.shakeAmount = 0;
    }

    // Ambient flame particles from MCX
    if (this.phase !== 'complete' && Math.random() < 0.15) {
      this.particles.flame(
        CHAR_X - 50, CHAR_Y - 30, 1,
        FLAME_COLORS, 20,
      );
    }

    // Phase logic
    switch (this.phase) {
      case 'banner':
        this.updateBanner();
        break;
      case 'egg-rolling-in':
        this.updateEggRollingIn();
        break;
      case 'waiting':
        this.updateWaiting(dt);
        break;
      case 'rolling-to-nest':
        // Tween handles animation
        break;
      case 'settling':
        this.updateSettling(dt);
        break;
      case 'wrong-bounce':
        // Tween handles animation
        break;
      case 'hatching':
        this.updateHatching(dt);
        break;
      case 'celebrating':
        this.updateCelebrating(dt);
        break;
      case 'complete':
        break;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    // Background with earthy dark overlay
    this.bg.render(ctx);

    // Earthy dark overlay
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#1a0e0a';
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    ctx.restore();

    // Ground area
    this.renderGround(ctx);

    // Draw nests
    this.renderNests(ctx);

    // Draw sorted eggs in nests
    this.renderSortedEggs(ctx);

    // Draw current egg (rolling in or waiting)
    if (this.currentEgg && !this.currentEgg.sorted) {
      this.drawEgg(ctx, this.currentEgg, this.time);
    }

    // Charizard on right side
    this.charizard.render(ctx, CHAR_X, CHAR_Y, CHAR_SCALE);

    // Particles
    this.particles.render(ctx);

    // Feedback text overlay
    this.feedback.render(ctx);

    // Prompt text
    if (this.phase === 'waiting' && this.currentEgg) {
      this.renderPromptText(ctx);
    }

    // Banner overlay
    if (this.phase === 'banner') {
      this.renderBanner(ctx);
    }

    // Celebration overlay
    if (this.phase === 'celebrating') {
      this.renderCelebrationText(ctx);
    }

    ctx.restore();
  }

  exit(): void {
    this.particles.clear();
    this.tweens.clear();
  }

  handleClick(x: number, y: number): void {
    if (this.inputLocked) return;
    if (this.phase !== 'waiting') return;
    if (!this.currentEgg) return;

    // Check if click is within any nest
    for (const nest of this.nests) {
      const halfW = NEST_WIDTH / 2;
      const halfH = NEST_HEIGHT / 2;
      if (
        x >= nest.x - halfW && x <= nest.x + halfW &&
        y >= nest.y - halfH - 20 && y <= nest.y + halfH + 40
      ) {
        const eggColorIndex = this.currentEgg.colorIndex;
        if (nest.colorIndex === eggColorIndex) {
          this.handleCorrectNest(nest);
        } else {
          this.handleWrongNest(nest);
        }
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
  // Setup
  // ---------------------------------------------------------------------------

  private setupNests(): void {
    this.nests = [];

    let nestCount: number;
    let colorIndices: number[];

    if (this.difficulty === 'little') {
      // Owen: 2 nests (red and blue)
      nestCount = 2;
      colorIndices = [0, 1]; // RED, BLUE
    } else {
      // Kian: 3-4 nests
      nestCount = Math.random() < 0.5 ? 3 : 4;
      // Shuffle and pick from all colors
      const shuffled = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
      colorIndices = shuffled.slice(0, nestCount);
    }

    // Position nests evenly along the bottom
    const totalWidth = nestCount * NEST_WIDTH + (nestCount - 1) * 40;
    const startX = DESIGN_WIDTH * 0.45 - totalWidth / 2 + NEST_WIDTH / 2;

    for (let i = 0; i < nestCount; i++) {
      this.nests.push({
        colorIndex: colorIndices[i],
        x: startX + i * (NEST_WIDTH + 40),
        y: NEST_Y,
        eggs: [],
        glowing: false,
      });
    }
  }

  private generateEggQueue(): void {
    this.eggQueue = [];
    const availableColors = this.nests.map(n => n.colorIndex);

    for (let i = 0; i < EGGS_PER_ROUND; i++) {
      const colorIndex = availableColors[Math.floor(Math.random() * availableColors.length)];
      this.eggQueue.push({
        colorIndex,
        x: DESIGN_WIDTH + 100,
        y: EGG_WAIT_Y,
        targetX: EGG_WAIT_X,
        targetY: EGG_WAIT_Y,
        rotation: 0,
        scale: 1,
        wobble: Math.random() * Math.PI * 2,
        sorted: false,
        hatching: false,
        hatchProgress: 0,
      });
    }

    this.eggsRemaining = EGGS_PER_ROUND;
  }

  // ---------------------------------------------------------------------------
  // Banner
  // ---------------------------------------------------------------------------

  private startBanner(): void {
    this.phase = 'banner';
    this.phaseTimer = 0;
    this.bannerAlpha = 0;
  }

  private updateBanner(): void {
    const t = this.phaseTimer / BANNER_DURATION;
    if (t < 0.3) {
      this.bannerAlpha = t / 0.3;
    } else if (t < 0.8) {
      this.bannerAlpha = 1;
    } else {
      this.bannerAlpha = 1 - (t - 0.8) / 0.2;
    }

    if (this.phaseTimer >= BANNER_DURATION) {
      this.startNextEgg();
    }
  }

  private renderBanner(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.bannerAlpha;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    const bannerY = DESIGN_HEIGHT * 0.4;
    const bannerH = 140;
    const bannerColor = this.difficulty === 'little' ? '#F08030' : '#1a3a6e';

    ctx.fillStyle = bannerColor;
    ctx.fillRect(0, bannerY, DESIGN_WIDTH, bannerH);

    // Glow edge
    const edgeGrad = ctx.createLinearGradient(0, bannerY, 0, bannerY + bannerH);
    edgeGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
    edgeGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
    edgeGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, bannerY, DESIGN_WIDTH, bannerH);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${FONT.bannerName}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.bannerName}'s Turn!`, DESIGN_WIDTH / 2, bannerY + bannerH * 0.42);

    ctx.font = `bold ${FONT.bannerRole}px system-ui`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('Sort the dragon eggs!', DESIGN_WIDTH / 2, bannerY + bannerH * 0.75);

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Egg rolling in
  // ---------------------------------------------------------------------------

  private startNextEgg(): void {
    if (this.eggQueue.length === 0) {
      // All eggs sorted -- start hatching
      this.startHatching();
      return;
    }

    this.currentEgg = this.eggQueue.shift()!;
    this.currentEgg.x = DESIGN_WIDTH + 100;
    this.currentEgg.y = EGG_WAIT_Y;
    this.currentEgg.rotation = 0;
    this.currentEgg.scale = 1;
    this.missCount = 0;

    this.phase = 'egg-rolling-in';
    this.phaseTimer = 0;
    this.inputLocked = true;

    // Roll egg in with tween
    const egg = this.currentEgg;
    this.tweens.add({
      from: DESIGN_WIDTH + 100,
      to: EGG_WAIT_X,
      duration: EGG_ROLL_IN_DURATION,
      easing: easing.easeOut,
      onUpdate: (v) => {
        egg.x = v;
        // Rolling rotation
        egg.rotation = ((DESIGN_WIDTH + 100 - v) / (EGG_WIDTH * Math.PI)) * Math.PI * 2;
      },
      onComplete: () => {
        egg.rotation = 0;
        this.phase = 'waiting';
        this.phaseTimer = 0;
        this.inputLocked = false;

        // Voice prompt
        const colorName = NEST_COLORS[egg.colorIndex].name;
        const voiceText = `This is a ${colorName} egg! Which nest?`;
        this.audio?.speakFallback?.(voiceText);
        if (!this.audio?.speakFallback) {
          speakFallback(voiceText);
        }
      },
    });
  }

  private updateEggRollingIn(): void {
    // Tween handles the animation; nothing extra needed
  }

  // ---------------------------------------------------------------------------
  // Waiting for player input
  // ---------------------------------------------------------------------------

  private updateWaiting(_dt: number): void {
    // Egg wobbles impatiently but never auto-sorts
    if (this.currentEgg) {
      this.currentEgg.wobble += _dt * 3;
    }
  }

  // ---------------------------------------------------------------------------
  // Correct nest
  // ---------------------------------------------------------------------------

  private handleCorrectNest(nest: Nest): void {
    this.inputLocked = true;
    const egg = this.currentEgg!;

    // Audio feedback
    this.audio?.playSynth('correct-chime');

    // Visual feedback at nest
    this.feedback.correct(nest.x, nest.y - 40);

    // Make nest glow
    nest.glowing = true;

    // Calculate egg position inside the nest
    const nestEggCount = nest.eggs.length;
    const offsetX = (nestEggCount - 1) * 20 - 10;
    const targetX = nest.x + offsetX;
    const targetY = nest.y - 20;

    this.phase = 'rolling-to-nest';
    this.phaseTimer = 0;

    // Tween egg to nest
    const startX = egg.x;
    const startY = egg.y;
    this.tweens.add({
      from: 0,
      to: 1,
      duration: EGG_ROLL_TO_NEST_DURATION,
      easing: easing.easeInOut,
      onUpdate: (t) => {
        egg.x = startX + (targetX - startX) * t;
        // Arc: parabolic upward
        const arcHeight = -80 * (1 - (2 * t - 1) ** 2);
        egg.y = startY + (targetY - startY) * t + arcHeight;
        egg.rotation = t * Math.PI * 2;
        egg.scale = 1 - t * 0.15; // slightly smaller in nest
      },
      onComplete: () => {
        egg.x = targetX;
        egg.y = targetY;
        egg.rotation = 0;
        egg.scale = 0.85;
        egg.sorted = true;
        nest.eggs.push(egg);

        // Settling phase
        this.phase = 'settling';
        this.phaseTimer = 0;

        // Settle bounce
        this.tweens.add({
          from: 0.85,
          to: 0.85,
          duration: SETTLE_DURATION,
          easing: easing.easeOutBack,
          onUpdate: (v) => {
            // Small bounce effect
            const bt = this.phaseTimer / SETTLE_DURATION;
            egg.scale = 0.85 + Math.sin(bt * Math.PI * 3) * 0.05 * (1 - bt);
          },
          onComplete: () => {
            egg.scale = 0.85;
          },
        });

        // MCX breathes warm flame (attack pose briefly)
        this.charizard.setPose('attack');
        // Fire breath particles toward the nest
        for (let i = 0; i < 15; i++) {
          this.particles.spawn({
            x: CHAR_X - 60 + randomRange(-10, 10),
            y: CHAR_Y - 20 + randomRange(-10, 10),
            vx: (nest.x - CHAR_X) * randomRange(0.3, 0.8),
            vy: (nest.y - CHAR_Y) * randomRange(0.3, 0.6) + randomRange(-30, 0),
            color: FLAME_COLORS[Math.floor(Math.random() * FLAME_COLORS.length)],
            size: randomRange(4, 10),
            lifetime: randomRange(0.3, 0.6),
            drag: 0.93,
            fadeOut: true,
            shrink: true,
          });
        }

        // Glow particles at the egg
        this.particles.burst(targetX, targetY, 20, NEST_COLORS[egg.colorIndex].hex, 120, 0.6);

        setTimeout(() => {
          this.charizard.setPose('fly');
          nest.glowing = false;
        }, 600);
      },
    });
  }

  private updateSettling(_dt: number): void {
    if (this.phaseTimer >= SETTLE_DURATION + 0.3) {
      this.eggsRemaining--;
      this.currentEgg = null;
      this.startNextEgg();
    }
  }

  // ---------------------------------------------------------------------------
  // Wrong nest
  // ---------------------------------------------------------------------------

  private handleWrongNest(nest: Nest): void {
    this.inputLocked = true;
    this.missCount++;
    const egg = this.currentEgg!;

    // Audio feedback
    this.audio?.playSynth('wrong-bonk');

    // Visual feedback
    this.feedback.wrong(nest.x, nest.y - 40);

    // Small shake
    this.shakeAmount = 5;

    // MCX nudge pose
    this.charizard.setPose('nudge');

    // Red burst at wrong nest
    this.particles.burst(nest.x, nest.y, 10, '#FF6B6B', 80, 0.4);

    // Voice: "That's the [WRONG] nest! Find the [CORRECT] nest!"
    const wrongName = NEST_COLORS[nest.colorIndex].name;
    const correctName = NEST_COLORS[egg.colorIndex].name;
    const voiceText = `That's the ${wrongName} nest! Find the ${correctName} nest!`;
    this.audio?.speakFallback?.(voiceText);
    if (!this.audio?.speakFallback) {
      speakFallback(voiceText);
    }

    // Wrong bounce: egg bounces back to center
    this.phase = 'wrong-bounce';
    this.phaseTimer = 0;

    const startX = egg.x;
    const startY = egg.y;
    // Bounce toward the wrong nest slightly then back
    const bounceX = nest.x;
    const bounceY = nest.y - 60;

    // Quick bounce toward nest then back to center
    this.tweens.add({
      from: 0,
      to: 1,
      duration: WRONG_BOUNCE_DURATION * 0.4,
      easing: easing.easeOut,
      onUpdate: (t) => {
        egg.x = startX + (bounceX - startX) * t * 0.3;
        egg.y = startY + (bounceY - startY) * t * 0.3;
      },
      onComplete: () => {
        // Bounce back to wait position
        const midX = egg.x;
        const midY = egg.y;
        this.tweens.add({
          from: 0,
          to: 1,
          duration: WRONG_BOUNCE_DURATION * 0.6,
          easing: easing.easeOutBack,
          onUpdate: (t) => {
            egg.x = midX + (EGG_WAIT_X - midX) * t;
            egg.y = midY + (EGG_WAIT_Y - midY) * t;
            egg.rotation = Math.sin(t * Math.PI * 4) * 0.2 * (1 - t);
          },
          onComplete: () => {
            egg.x = EGG_WAIT_X;
            egg.y = EGG_WAIT_Y;
            egg.rotation = 0;
            this.phase = 'waiting';
            this.phaseTimer = 0;
            this.inputLocked = false;

            this.charizard.setPose('fly');
          },
        });
      },
    });

    // Auto-complete after 3 misses
    if (this.missCount >= 3) {
      setTimeout(() => {
        if (this.phase === 'waiting' || this.phase === 'wrong-bounce') {
          const correctNest = this.nests.find(n => n.colorIndex === egg.colorIndex);
          if (correctNest) {
            this.feedback.autoComplete(correctNest.x, correctNest.y - 40);
            // Wait for wrong bounce to complete, then auto-sort
            setTimeout(() => {
              if (this.currentEgg && !this.currentEgg.sorted) {
                this.handleCorrectNest(correctNest);
              }
            }, 600);
          }
        }
      }, 800);
    }
  }

  // ---------------------------------------------------------------------------
  // Hatching
  // ---------------------------------------------------------------------------

  private startHatching(): void {
    this.phase = 'hatching';
    this.phaseTimer = 0;
    this.hatchTimer = 0;
    this.currentEgg = null;

    // MCX roar of excitement
    this.charizard.setPose('roar');
    this.audio?.playSynth('whoosh');

    // Voice
    const voiceText = 'The eggs are hatching!';
    this.audio?.speakFallback?.(voiceText);
    if (!this.audio?.speakFallback) {
      speakFallback(voiceText);
    }

    // Mark all sorted eggs as hatching
    for (const nest of this.nests) {
      for (const egg of nest.eggs) {
        egg.hatching = true;
        egg.hatchProgress = 0;
      }
    }
  }

  private updateHatching(dt: number): void {
    this.hatchTimer += dt;

    // Progress all eggs toward hatching
    for (const nest of this.nests) {
      for (const egg of nest.eggs) {
        if (egg.hatching) {
          egg.hatchProgress = Math.min(1, this.hatchTimer / HATCH_DURATION);
          // Wobble increases with progress
          egg.wobble += dt * (3 + egg.hatchProgress * 10);
        }
      }
    }

    // Emit sparkle particles during hatching
    if (Math.random() < 0.3) {
      for (const nest of this.nests) {
        if (nest.eggs.length > 0) {
          this.particles.spawn({
            x: nest.x + randomRange(-40, 40),
            y: nest.y - 30 + randomRange(-20, 10),
            vx: randomRange(-20, 20),
            vy: randomRange(-60, -20),
            color: NEST_COLORS[nest.colorIndex].light,
            size: randomRange(2, 5),
            lifetime: randomRange(0.3, 0.7),
            drag: 0.95,
            fadeOut: true,
            shrink: true,
          });
        }
      }
    }

    if (this.hatchTimer >= HATCH_DURATION + 0.5) {
      this.startCelebration();
    }
  }

  // ---------------------------------------------------------------------------
  // Celebration
  // ---------------------------------------------------------------------------

  private startCelebration(): void {
    this.phase = 'celebrating';
    this.phaseTimer = 0;
    this.celebrationTimer = 0;

    // MCX happy roar
    this.charizard.setPose('happy');
    this.audio?.playSynth('cheer');

    // Big particle bursts
    for (let i = 0; i < 40; i++) {
      const x = randomRange(DESIGN_WIDTH * 0.1, DESIGN_WIDTH * 0.9);
      const y = randomRange(DESIGN_HEIGHT * 0.1, DESIGN_HEIGHT * 0.5);
      const colors = ['#FFD700', '#FF6B35', '#91CCEC', '#FF7675', '#55EFC4'];
      this.particles.burst(
        x, y, 3,
        colors[Math.floor(Math.random() * colors.length)],
        140, 0.9,
      );
    }

    this.shakeAmount = 10;
  }

  private updateCelebrating(dt: number): void {
    this.celebrationTimer += dt;

    // Ongoing celebration sparks
    if (Math.random() < 0.35) {
      const colors = ['#FFD700', '#FF6B35', '#91CCEC'];
      this.particles.burst(
        randomRange(DESIGN_WIDTH * 0.1, DESIGN_WIDTH * 0.9),
        randomRange(DESIGN_HEIGHT * 0.1, DESIGN_HEIGHT * 0.4),
        2,
        colors[Math.floor(Math.random() * colors.length)],
        80, 0.6,
      );
    }

    if (this.celebrationTimer >= CELEBRATION_DURATION) {
      this.endRound();
    }
  }

  private renderCelebrationText(ctx: CanvasRenderingContext2D): void {
    const t = Math.min(this.celebrationTimer / 0.3, 1);
    const scale = 0.5 + 0.5 * easing.easeOutBack(t);
    const alpha = t < 0.7 ? 1 : 1 - (this.celebrationTimer - CELEBRATION_DURATION * 0.7) / (CELEBRATION_DURATION * 0.3);

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textX = DESIGN_WIDTH / 2;
    const textY = DESIGN_HEIGHT * 0.25;

    // Glow
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 40;
    ctx.font = `bold ${Math.round(96 * scale)}px system-ui`;
    ctx.fillStyle = '#FFD700';
    ctx.fillText('AMAZING!', textX, textY);
    ctx.restore();

    ctx.font = `bold ${Math.round(96 * scale)}px system-ui`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('AMAZING!', textX, textY);

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
    settings.roundsCompleted++;
    session.currentScreen = 'calm-reset';

    setTimeout(() => {
      this.gameContext.screenManager.goTo('calm-reset');
    }, 500);
  }

  // ---------------------------------------------------------------------------
  // Rendering: Ground
  // ---------------------------------------------------------------------------

  private renderGround(ctx: CanvasRenderingContext2D): void {
    const groundY = DESIGN_HEIGHT * 0.68;

    // Ground gradient -- earthy tones
    const groundGrad = ctx.createLinearGradient(0, groundY - 20, 0, DESIGN_HEIGHT);
    groundGrad.addColorStop(0, '#2a1a0e');
    groundGrad.addColorStop(0.3, '#1e1208');
    groundGrad.addColorStop(1, '#140e06');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY - 20, DESIGN_WIDTH, DESIGN_HEIGHT - groundY + 20);

    // Horizon glow line
    const horizonGlow = ctx.createLinearGradient(0, groundY - 30, 0, groundY + 10);
    horizonGlow.addColorStop(0, 'rgba(240, 128, 48, 0.08)');
    horizonGlow.addColorStop(1, 'rgba(240, 128, 48, 0)');
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, groundY - 30, DESIGN_WIDTH, 40);
  }

  // ---------------------------------------------------------------------------
  // Rendering: Nests
  // ---------------------------------------------------------------------------

  private renderNests(ctx: CanvasRenderingContext2D): void {
    for (const nest of this.nests) {
      const c = NEST_COLORS[nest.colorIndex];
      drawNest(
        ctx,
        nest.x, nest.y,
        NEST_WIDTH, NEST_HEIGHT,
        c.hex,
        c.name,
        nest.glowing,
        this.time,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering: Sorted eggs in nests
  // ---------------------------------------------------------------------------

  private renderSortedEggs(ctx: CanvasRenderingContext2D): void {
    for (const nest of this.nests) {
      for (let i = 0; i < nest.eggs.length; i++) {
        const egg = nest.eggs[i];
        // Position eggs slightly staggered inside the nest
        const offsetX = (i - (nest.eggs.length - 1) / 2) * 35;
        const displayEgg: Egg = {
          ...egg,
          x: nest.x + offsetX,
          y: nest.y - 15,
          scale: 0.7,
        };
        this.drawEgg(ctx, displayEgg, this.time);

        // Draw hatching effects
        if (egg.hatching && egg.hatchProgress > 0) {
          this.drawHatchEffect(ctx, nest.x + offsetX, nest.y - 15, egg, this.time);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Egg drawing
  // ---------------------------------------------------------------------------

  private drawEgg(ctx: CanvasRenderingContext2D, egg: Egg, time: number): void {
    const c = NEST_COLORS[egg.colorIndex];
    ctx.save();
    ctx.translate(egg.x, egg.y);

    // Wobble animation
    const wobbleAngle = egg.sorted
      ? Math.sin(time * 3 + egg.wobble) * 0.03
      : Math.sin(time * 3 + egg.wobble) * 0.05;
    ctx.rotate(egg.rotation + wobbleAngle);
    ctx.scale(egg.scale, egg.scale);

    // Egg oval shape
    ctx.beginPath();
    ctx.ellipse(0, 0, EGG_WIDTH / 2, EGG_HEIGHT / 2, 0, 0, Math.PI * 2);

    // Gradient fill
    const grad = ctx.createRadialGradient(-10, -20, 10, 0, 0, EGG_HEIGHT / 2);
    grad.addColorStop(0, c.light);
    grad.addColorStop(0.6, c.hex);
    grad.addColorStop(1, c.dark);
    ctx.fillStyle = grad;
    ctx.fill();

    // Outline
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Highlight
    ctx.beginPath();
    ctx.ellipse(-15, -25, 12, 20, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();

    // Sparkles on the egg
    for (let i = 0; i < 3; i++) {
      const sx = Math.cos(time * 2 + i * 2.1) * 25;
      const sy = Math.sin(time * 1.5 + i * 1.7) * 35;
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fill();
    }

    // Kian difficulty: add stripe/spot patterns
    if (this.difficulty === 'big') {
      this.drawEggPattern(ctx, egg, time);
    }

    ctx.restore();
  }

  /** Draw stripe or spot pattern on eggs for Kian difficulty */
  private drawEggPattern(ctx: CanvasRenderingContext2D, egg: Egg, _time: number): void {
    const c = NEST_COLORS[egg.colorIndex];
    ctx.save();
    ctx.globalAlpha = 0.3;

    // Alternating stripes and spots based on color index
    if (egg.colorIndex % 2 === 0) {
      // Horizontal stripes
      ctx.strokeStyle = c.dark;
      ctx.lineWidth = 4;
      for (let i = -2; i <= 2; i++) {
        const stripeY = i * 20;
        const stripeW = Math.sqrt(1 - (stripeY / (EGG_HEIGHT / 2)) ** 2) * (EGG_WIDTH / 2) * 0.8;
        if (stripeW > 0) {
          ctx.beginPath();
          ctx.moveTo(-stripeW, stripeY);
          ctx.lineTo(stripeW, stripeY);
          ctx.stroke();
        }
      }
    } else {
      // Spots
      ctx.fillStyle = c.dark;
      const spots = [
        { x: 15, y: -15, r: 8 },
        { x: -20, y: 10, r: 6 },
        { x: 10, y: 25, r: 7 },
        { x: -10, y: -30, r: 5 },
        { x: 25, y: 5, r: 5 },
      ];
      for (const spot of spots) {
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Hatch effect drawing
  // ---------------------------------------------------------------------------

  private drawHatchEffect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    egg: Egg,
    time: number,
  ): void {
    const p = egg.hatchProgress;
    const scale = 0.7; // match sorted egg scale

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Wobble the egg during hatching
    const wobbleIntensity = p * 0.15;
    ctx.rotate(Math.sin(time * 12 + egg.wobble) * wobbleIntensity);

    // Crack lines
    if (p > 0.3) {
      const crackAlpha = Math.min(1, (p - 0.3) / 0.3);
      ctx.save();
      ctx.globalAlpha = crackAlpha;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;

      // Main crack
      ctx.beginPath();
      ctx.moveTo(-15, -10);
      ctx.lineTo(-5, 0);
      ctx.lineTo(5, -5);
      ctx.lineTo(15, 5);
      ctx.lineTo(20, -2);
      ctx.stroke();

      // Secondary crack
      if (p > 0.5) {
        ctx.beginPath();
        ctx.moveTo(-20, 5);
        ctx.lineTo(-8, 10);
        ctx.lineTo(0, 5);
        ctx.lineTo(12, 12);
        ctx.stroke();
      }

      ctx.restore();
    }

    // Crack widens -- dark gap visible
    if (p > 0.6) {
      const gapAlpha = Math.min(1, (p - 0.6) / 0.2);
      ctx.save();
      ctx.globalAlpha = gapAlpha * 0.8;
      ctx.strokeStyle = '#1a0e0a';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-15, -10);
      ctx.lineTo(-5, 0);
      ctx.lineTo(5, -5);
      ctx.lineTo(15, 5);
      ctx.stroke();
      ctx.restore();
    }

    // Baby dragon head peeks out
    if (p > 0.85) {
      const peekAlpha = Math.min(1, (p - 0.85) / 0.15);
      const peekY = -EGG_HEIGHT / 2 * 0.6 - 10 + (1 - peekAlpha) * 20;
      const c = NEST_COLORS[egg.colorIndex];

      ctx.save();
      ctx.globalAlpha = peekAlpha;

      // Top half of egg lifts up
      ctx.save();
      ctx.translate(0, -peekAlpha * 15);
      ctx.rotate(peekAlpha * 0.2);
      ctx.beginPath();
      ctx.ellipse(0, -EGG_HEIGHT * 0.15, EGG_WIDTH / 2 * 0.8, EGG_HEIGHT / 4, 0, Math.PI, Math.PI * 2);
      const topGrad = ctx.createRadialGradient(-5, -EGG_HEIGHT * 0.2, 5, 0, -EGG_HEIGHT * 0.15, EGG_HEIGHT / 4);
      topGrad.addColorStop(0, c.light);
      topGrad.addColorStop(1, c.hex);
      ctx.fillStyle = topGrad;
      ctx.fill();
      ctx.restore();

      // Baby dragon head (simple cute circle)
      const headSize = 22;

      // Head
      ctx.fillStyle = c.hex;
      ctx.beginPath();
      ctx.arc(0, peekY, headSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = c.dark;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Eyes (cute dot eyes)
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-8, peekY - 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(8, peekY - 3, 4, 0, Math.PI * 2);
      ctx.fill();

      // Eye highlights
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-6, peekY - 5, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(10, peekY - 5, 2, 0, Math.PI * 2);
      ctx.fill();

      // Tiny cute mouth
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, peekY + 4, 5, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();

      // Tiny flame tail (just a small flame wiggle)
      const flameX = 18;
      const flameY = peekY + 5;
      const flameWiggle = Math.sin(time * 8) * 3;
      ctx.fillStyle = c.light;
      ctx.beginPath();
      ctx.moveTo(flameX, flameY);
      ctx.quadraticCurveTo(flameX + 8 + flameWiggle, flameY - 6, flameX + 12, flameY + 2);
      ctx.quadraticCurveTo(flameX + 6, flameY + 4, flameX, flameY);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Prompt text
  // ---------------------------------------------------------------------------

  private renderPromptText(ctx: CanvasRenderingContext2D): void {
    if (!this.currentEgg) return;
    const colorName = NEST_COLORS[this.currentEgg.colorIndex].name;
    const colorHex = NEST_COLORS[this.currentEgg.colorIndex].hex;

    const x = DESIGN_WIDTH / 2;
    const y = 80;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${FONT.subtitle}px system-ui`;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillText(`Find the ${colorName} nest!`, x + 2, y + 2);

    // Glow text
    ctx.save();
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`Find the ${colorName} nest!`, x, y);
    ctx.restore();

    // Color name highlighted
    const preText = 'Find the ';
    const postText = ' nest!';
    const preWidth = ctx.measureText(preText).width;
    const colorWidth = ctx.measureText(colorName).width;
    const totalWidth = ctx.measureText(`Find the ${colorName} nest!`).width;
    const startX = x - totalWidth / 2;

    // Redraw just the color name in its color
    ctx.fillStyle = colorHex;
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 15;
    ctx.textAlign = 'left';
    ctx.fillText(colorName, startX + preWidth, y);

    ctx.restore();
  }
}
