// src/engine/games/fireball-count.ts
// Fireball Count Mini-Game — counting game where players launch fireballs to smash stone pillars.
// Owen (little): numbers 1-3, pillars match count exactly.
// Kian (big): numbers 1-7, more pillars than needed, must stop at the right count.

import type { GameScreen, GameContext } from '../screen-manager';
import { Background } from '../entities/backgrounds';
import { ParticlePool, setActivePool } from '../entities/particles';
import { Charizard } from '../entities/charizard';
import { TweenManager, easing } from '../utils/tween';
import { countingDifficulty } from '../../content/counting';
import { randomInt, randomRange } from '../utils/math';
import {
  DESIGN_WIDTH,
  DESIGN_HEIGHT,
  PROMPTS_PER_ROUND,
  PROMPT_TIMEOUT,
  FONT,
} from '../../config/constants';
import { theme } from '../../config/theme';
import { session } from '../../state/session.svelte';
import { settings } from '../../state/settings.svelte';
import { handleHotkey } from '../input';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHARIZARD_X = 280;
const CHARIZARD_Y = 580;
const CHARIZARD_SCALE = 0.55;

// Fireball origin: approximate mouth position at attack pose
const FIREBALL_ORIGIN_X = 340;
const FIREBALL_ORIGIN_Y = 420;

// Pillar layout: evenly spaced across the right 60% of screen
const PILLAR_ZONE_LEFT = DESIGN_WIDTH * 0.38;
const PILLAR_ZONE_RIGHT = DESIGN_WIDTH * 0.92;
const PILLAR_GROUND_Y = DESIGN_HEIGHT * 0.82;
const PILLAR_WIDTH = 70;
const PILLAR_MIN_HEIGHT = 140;
const PILLAR_MAX_HEIGHT = 200;

// Fireball flight duration
const FIREBALL_FLIGHT_TIME = 0.3;

// Timing
const BANNER_DURATION = 1.8;
const NUMBER_REVEAL_DURATION = 0.6;
const CELEBRATION_DURATION = 1.8;
const POST_COUNT_PAUSE = 0.6; // pause after correct count before celebration
const FIZZLE_DURATION = 0.5;
const AUTO_COMPLETE_DELAY = PROMPT_TIMEOUT; // seconds before auto-completing

// Screen shake
const SHAKE_INTENSITY = 12;
const SHAKE_DECAY = 0.88;

// Stone colors for pillar particles
const STONE_COLORS = ['#5a5a7a', '#8a8aaa', '#FFD700', '#b0b0cc', '#4a4a66'];
const DEBRIS_COLORS = ['#5a5a7a', '#6a6a8a', '#4a4a66', '#3a3a56', '#8a8a9a'];

// Fireball colors (blue-white flame theme matching MCX)
const FIREBALL_COLORS = ['#FFFFFF', '#91CCEC', '#37B1E2', '#1a5fc4'];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pillar {
  x: number;
  y: number; // top of pillar
  width: number;
  height: number;
  destroyed: boolean;
  exploding: boolean;
  explodeTimer: number;
  crumbleY: number; // how far down the pillar has crumbled (0 = intact)
}

interface Fireball {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number; // 0..1
  targetPillarIndex: number;
  active: boolean;
  fizzling: boolean; // true = overshoot fireball that fizzles
  fizzleTimer: number;
  trail: Array<{ x: number; y: number; age: number }>; // flame trail points
}

type GamePhase =
  | 'banner'          // showing turn banner
  | 'number-reveal'   // number animating in with pips
  | 'awaiting-clicks' // player clicking to launch fireballs
  | 'fireball-flying' // fireball in transit to pillar
  | 'celebrating'     // correct count reached
  | 'complete';       // round over, transitioning out

// ---------------------------------------------------------------------------
// FireballCountGame
// ---------------------------------------------------------------------------

export class FireballCountGame implements GameScreen {
  // Systems
  private bg = new Background(30);
  private particles = new ParticlePool();
  private tweens = new TweenManager();
  private charizard = new Charizard(this.particles, this.tweens);
  private gameContext!: GameContext;

  // Game state
  private phase: GamePhase = 'banner';
  private phaseTimer = 0;
  private targetNumber = 0;
  private pillarCount = 0;
  private launchCount = 0;
  private promptsRemaining = 0;
  private difficulty: 'little' | 'big' = 'little';

  // Visual state
  private pillars: Pillar[] = [];
  private fireballs: Fireball[] = [];
  private numberScale = 0;      // animated scale for number reveal
  private numberGlowPhase = 0;  // pulsing glow phase
  private dotPipFills: boolean[] = [];

  // Screen shake
  private shakeX = 0;
  private shakeY = 0;
  private shakeAmount = 0;

  // Timeout tracking
  private awaitTimer = 0;
  private autoCompleting = false;

  // Banner text
  private bannerName = '';
  private bannerAlpha = 0;

  // Celebration
  private celebrationTimer = 0;

  // Ground rendering
  private groundStones: Array<{ x: number; y: number; w: number; h: number; color: string }> = [];

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  enter(ctx: GameContext): void {
    this.gameContext = ctx;
    setActivePool(this.particles);
    this.particles.clear();
    this.tweens.clear();

    // Determine difficulty from current turn
    const turn = session.currentTurn;
    this.difficulty = turn === 'kian' ? 'big' : 'little';
    this.bannerName = turn === 'kian' ? settings.bigTrainerName : settings.littleTrainerName;

    this.promptsRemaining = PROMPTS_PER_ROUND.fireballCount;
    this.charizard.setPose('perch');

    // Generate random ground stones for the rocky terrain
    this.generateGroundStones();

    // Start first prompt
    this.startBanner();
  }

  update(dt: number): void {
    this.phaseTimer += dt;
    this.bg.update(dt);
    this.tweens.update(dt);
    this.charizard.update(dt);
    this.particles.update(dt);
    this.numberGlowPhase += dt;

    // Screen shake decay
    if (this.shakeAmount > 0.5) {
      this.shakeX = (Math.random() - 0.5) * 2 * this.shakeAmount;
      this.shakeY = (Math.random() - 0.5) * 2 * this.shakeAmount;
      this.shakeAmount *= SHAKE_DECAY;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
      this.shakeAmount = 0;
    }

    // Update exploding pillars
    for (const pillar of this.pillars) {
      if (pillar.exploding) {
        pillar.explodeTimer += dt;
        // Crumble animation: pillar height shrinks over 0.4s
        pillar.crumbleY = Math.min(pillar.explodeTimer / 0.4, 1) * pillar.height;
        if (pillar.explodeTimer > 0.5) {
          pillar.exploding = false;
          pillar.destroyed = true;
        }
      }
    }

    // Update active fireballs
    for (const fb of this.fireballs) {
      if (!fb.active) continue;

      if (fb.fizzling) {
        fb.fizzleTimer += dt;
        // Fizzle: fireball slows down, shrinks, drifts up
        fb.y -= 60 * dt;
        fb.x += 20 * dt;
        // Spawn sputtering particles
        if (Math.random() < 0.5) {
          this.particles.spawn({
            x: fb.x + randomRange(-10, 10),
            y: fb.y + randomRange(-10, 10),
            vx: randomRange(-40, 40),
            vy: randomRange(-60, -20),
            color: '#888899',
            size: randomRange(2, 5),
            lifetime: randomRange(0.2, 0.5),
            drag: 0.94,
            fadeOut: true,
            shrink: true,
          });
        }
        if (fb.fizzleTimer >= FIZZLE_DURATION) {
          fb.active = false;
        }
        continue;
      }

      // Normal fireball flight
      fb.progress += dt / FIREBALL_FLIGHT_TIME;
      if (fb.progress >= 1) {
        fb.progress = 1;
        fb.active = false;
        this.onFireballImpact(fb);
      } else {
        // Eased position with a slight arc upward
        const t = easing.easeIn(fb.progress);
        fb.x = fb.startX + (fb.targetX - fb.startX) * t;
        // Arc: parabolic offset peaking at 0.5 progress
        const arcHeight = -80 * (1 - (2 * fb.progress - 1) ** 2);
        fb.y = fb.startY + (fb.targetY - fb.startY) * t + arcHeight;
      }

      // Flame trail
      fb.trail.push({ x: fb.x, y: fb.y, age: 0 });
      // Age and cull trail
      for (let i = fb.trail.length - 1; i >= 0; i--) {
        fb.trail[i].age += dt;
        if (fb.trail[i].age > 0.15) fb.trail.splice(i, 1);
      }

      // Spawn fire particles along the trail
      if (Math.random() < 0.7) {
        this.particles.spawn({
          x: fb.x + randomRange(-8, 8),
          y: fb.y + randomRange(-8, 8),
          vx: randomRange(-50, 50),
          vy: randomRange(-80, -20),
          color: FIREBALL_COLORS[Math.floor(Math.random() * FIREBALL_COLORS.length)],
          size: randomRange(3, 8),
          lifetime: randomRange(0.15, 0.35),
          drag: 0.93,
          fadeOut: true,
          shrink: true,
        });
      }
    }

    // Phase logic
    switch (this.phase) {
      case 'banner':
        this.updateBanner(dt);
        break;
      case 'number-reveal':
        this.updateNumberReveal(dt);
        break;
      case 'awaiting-clicks':
        this.updateAwaitingClicks(dt);
        break;
      case 'fireball-flying':
        this.updateFireballFlying(dt);
        break;
      case 'celebrating':
        this.updateCelebrating(dt);
        break;
      case 'complete':
        // Handled by transition timeout
        break;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    // Apply screen shake
    ctx.translate(this.shakeX, this.shakeY);

    // Background
    this.bg.render(ctx);

    // Ground / rocky terrain
    this.renderGround(ctx);

    // Pillars (behind Charizard)
    this.renderPillars(ctx);

    // Charizard
    this.charizard.render(ctx, CHARIZARD_X, CHARIZARD_Y, CHARIZARD_SCALE);

    // Fireball trails and fireballs
    this.renderFireballs(ctx);

    // Particles on top
    this.particles.render(ctx);

    // UI: number display + dot pips
    if (this.phase !== 'banner' && this.phase !== 'complete') {
      this.renderNumberDisplay(ctx);
      this.renderDotPips(ctx);
    }

    // Turn banner overlay
    if (this.phase === 'banner') {
      this.renderBanner(ctx);
    }

    // Celebration overlay
    if (this.phase === 'celebrating') {
      this.renderCelebration(ctx);
    }

    // Overshoot feedback
    if (this.phase === 'awaiting-clicks' || this.phase === 'fireball-flying') {
      this.renderOvershootFeedback(ctx);
    }

    ctx.restore();
  }

  exit(): void {
    this.particles.clear();
    this.tweens.clear();
  }

  handleClick(_x: number, _y: number): void {
    if (this.phase === 'awaiting-clicks') {
      this.launchFireball();
    }
  }

  handleKey(key: string): void {
    handleHotkey(key);
    // Space/Enter also launches a fireball
    if ((key === ' ' || key === 'Enter') && this.phase === 'awaiting-clicks') {
      this.launchFireball();
    }
  }

  // ---------------------------------------------------------------------------
  // Phase: Banner
  // ---------------------------------------------------------------------------

  private startBanner(): void {
    this.phase = 'banner';
    this.phaseTimer = 0;
    this.bannerAlpha = 0;
  }

  private updateBanner(_dt: number): void {
    const t = this.phaseTimer / BANNER_DURATION;
    // Fade in for first 30%, hold, fade out last 20%
    if (t < 0.3) {
      this.bannerAlpha = t / 0.3;
    } else if (t < 0.8) {
      this.bannerAlpha = 1;
    } else {
      this.bannerAlpha = 1 - (t - 0.8) / 0.2;
    }

    if (this.phaseTimer >= BANNER_DURATION) {
      this.startNewPrompt();
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

    // Name text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${FONT.bannerName}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.bannerName}'s Turn!`, DESIGN_WIDTH / 2, bannerY + bannerH * 0.42);

    // Sub text
    ctx.font = `bold ${FONT.bannerRole}px system-ui`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('Count the fireballs!', DESIGN_WIDTH / 2, bannerY + bannerH * 0.75);

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Phase: New Prompt Setup
  // ---------------------------------------------------------------------------

  private startNewPrompt(): void {
    const diff = countingDifficulty[this.difficulty];
    this.targetNumber = randomInt(diff.minNumber, diff.maxNumber);

    // Pillar count: exact for Owen, +2 (or more) for Kian
    if (diff.pillarsMatchCount) {
      this.pillarCount = this.targetNumber;
    } else {
      this.pillarCount = Math.min(this.targetNumber + randomInt(2, 3), 9);
    }

    this.launchCount = 0;
    this.awaitTimer = 0;
    this.autoCompleting = false;
    this.fireballs = [];
    this.dotPipFills = Array(this.targetNumber).fill(false);

    // Create pillars
    this.createPillars();

    // Transition to number reveal
    this.phase = 'number-reveal';
    this.phaseTimer = 0;
    this.numberScale = 0;

    // Animate number scale in
    this.tweens.add({
      from: 0,
      to: 1,
      duration: 0.4,
      easing: easing.easeOutBack,
      onUpdate: (v) => { this.numberScale = v; },
    });

    this.charizard.setPose('idle');
  }

  private createPillars(): void {
    this.pillars = [];
    const spacing = (PILLAR_ZONE_RIGHT - PILLAR_ZONE_LEFT) / (this.pillarCount + 1);

    for (let i = 0; i < this.pillarCount; i++) {
      const x = PILLAR_ZONE_LEFT + spacing * (i + 1);
      const height = randomRange(PILLAR_MIN_HEIGHT, PILLAR_MAX_HEIGHT);
      this.pillars.push({
        x,
        y: PILLAR_GROUND_Y - height,
        width: PILLAR_WIDTH,
        height,
        destroyed: false,
        exploding: false,
        explodeTimer: 0,
        crumbleY: 0,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Phase: Number Reveal
  // ---------------------------------------------------------------------------

  private updateNumberReveal(_dt: number): void {
    if (this.phaseTimer >= NUMBER_REVEAL_DURATION) {
      this.phase = 'awaiting-clicks';
      this.phaseTimer = 0;
      this.charizard.setPose('attack');
    }
  }

  // ---------------------------------------------------------------------------
  // Phase: Awaiting Clicks
  // ---------------------------------------------------------------------------

  private updateAwaitingClicks(dt: number): void {
    this.awaitTimer += dt;

    // Auto-complete failsafe
    if (this.awaitTimer >= AUTO_COMPLETE_DELAY && !this.autoCompleting) {
      this.autoCompleting = true;
      this.autoCompleteLaunch();
    }
  }

  private autoCompleteLaunch(): void {
    // Auto-launch remaining fireballs with staggered timing
    const remaining = this.targetNumber - this.launchCount;
    for (let i = 0; i < remaining; i++) {
      setTimeout(() => {
        if (this.phase === 'awaiting-clicks' || this.phase === 'fireball-flying') {
          this.launchFireball();
        }
      }, i * 400);
    }
  }

  // ---------------------------------------------------------------------------
  // Fireball Launch
  // ---------------------------------------------------------------------------

  private launchFireball(): void {
    // Determine if this is an overshoot (Kian only, already at target)
    const isOvershoot = this.launchCount >= this.targetNumber;

    if (isOvershoot && this.difficulty === 'little') {
      // Owen: ignore extra clicks
      return;
    }

    if (isOvershoot) {
      // Kian: fireball fizzles
      this.launchFizzleFireball();
      return;
    }

    // Find next undestroyed pillar
    const targetPillarIndex = this.pillars.findIndex(
      (p, i) => !p.destroyed && !p.exploding && i >= this.launchCount,
    );
    if (targetPillarIndex === -1) return;

    const pillar = this.pillars[targetPillarIndex];

    const fb: Fireball = {
      x: FIREBALL_ORIGIN_X,
      y: FIREBALL_ORIGIN_Y,
      startX: FIREBALL_ORIGIN_X,
      startY: FIREBALL_ORIGIN_Y,
      targetX: pillar.x,
      targetY: pillar.y + pillar.height * 0.3, // hit upper portion
      progress: 0,
      targetPillarIndex,
      active: true,
      fizzling: false,
      fizzleTimer: 0,
      trail: [],
    };

    this.fireballs.push(fb);
    this.launchCount++;

    // Fill the dot pip
    if (this.launchCount - 1 < this.dotPipFills.length) {
      this.dotPipFills[this.launchCount - 1] = true;
    }

    this.phase = 'fireball-flying';
    this.phaseTimer = 0;

    // Charizard attack animation: brief roar then back to attack
    this.charizard.setPose('roar');
    setTimeout(() => {
      if (this.phase !== 'complete') {
        this.charizard.setPose('attack');
      }
    }, 250);

    // Spawn launch burst at origin
    for (let i = 0; i < 8; i++) {
      this.particles.spawn({
        x: FIREBALL_ORIGIN_X + randomRange(-5, 15),
        y: FIREBALL_ORIGIN_Y + randomRange(-10, 10),
        vx: randomRange(30, 120),
        vy: randomRange(-60, 60),
        color: FIREBALL_COLORS[Math.floor(Math.random() * FIREBALL_COLORS.length)],
        size: randomRange(3, 7),
        lifetime: randomRange(0.2, 0.4),
        drag: 0.92,
        fadeOut: true,
        shrink: true,
      });
    }
  }

  private launchFizzleFireball(): void {
    // Launch a fireball that fizzles mid-air
    const fb: Fireball = {
      x: FIREBALL_ORIGIN_X,
      y: FIREBALL_ORIGIN_Y,
      startX: FIREBALL_ORIGIN_X,
      startY: FIREBALL_ORIGIN_Y,
      targetX: FIREBALL_ORIGIN_X + 300,
      targetY: FIREBALL_ORIGIN_Y - 50,
      progress: 0,
      targetPillarIndex: -1,
      active: true,
      fizzling: false,
      fizzleTimer: 0,
      trail: [],
    };

    this.fireballs.push(fb);

    // After a short flight, start fizzling
    setTimeout(() => {
      if (fb.active) {
        fb.fizzling = true;
        // Spawn puff of grey smoke
        for (let i = 0; i < 12; i++) {
          this.particles.spawn({
            x: fb.x + randomRange(-10, 10),
            y: fb.y + randomRange(-10, 10),
            vx: randomRange(-30, 30),
            vy: randomRange(-40, 10),
            color: '#888899',
            size: randomRange(4, 10),
            lifetime: randomRange(0.4, 0.8),
            drag: 0.96,
            fadeOut: true,
            shrink: true,
          });
        }
      }
    }, 150);

    // Brief roar
    this.charizard.setPose('roar');
    setTimeout(() => {
      if (this.phase !== 'complete') {
        this.charizard.setPose('attack');
      }
    }, 200);
  }

  // ---------------------------------------------------------------------------
  // Fireball Impact
  // ---------------------------------------------------------------------------

  private onFireballImpact(fb: Fireball): void {
    if (fb.targetPillarIndex < 0 || fb.targetPillarIndex >= this.pillars.length) return;

    const pillar = this.pillars[fb.targetPillarIndex];
    if (pillar.destroyed) return;

    // Start pillar destruction
    pillar.exploding = true;
    pillar.explodeTimer = 0;

    // SCREEN SHAKE - make it feel POWERFUL
    this.shakeAmount = SHAKE_INTENSITY;

    // MASSIVE particle burst at impact point
    const impactX = pillar.x;
    const impactY = pillar.y + pillar.height * 0.3;

    // 1. Stone debris explosion - big chunks flying everywhere
    for (let i = 0; i < 35; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(100, 450);
      this.particles.spawn({
        x: impactX + randomRange(-pillar.width / 2, pillar.width / 2),
        y: impactY + randomRange(-20, 20),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80, // bias upward
        color: DEBRIS_COLORS[Math.floor(Math.random() * DEBRIS_COLORS.length)],
        size: randomRange(4, 14),
        lifetime: randomRange(0.6, 1.4),
        gravity: 350,
        drag: 0.97,
        fadeOut: true,
        shrink: false,
      });
    }

    // 2. Fire/explosion flash - bright blue-white particles
    for (let i = 0; i < 25; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(60, 250);
      this.particles.spawn({
        x: impactX + randomRange(-5, 5),
        y: impactY + randomRange(-5, 5),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: FIREBALL_COLORS[Math.floor(Math.random() * FIREBALL_COLORS.length)],
        size: randomRange(5, 16),
        lifetime: randomRange(0.2, 0.5),
        drag: 0.9,
        fadeOut: true,
        shrink: true,
      });
    }

    // 3. Sparks / embers shooting upward
    for (let i = 0; i < 15; i++) {
      this.particles.spawn({
        x: impactX + randomRange(-20, 20),
        y: impactY,
        vx: randomRange(-80, 80),
        vy: randomRange(-350, -150),
        color: '#FFD700',
        size: randomRange(2, 5),
        lifetime: randomRange(0.5, 1.0),
        gravity: 200,
        drag: 0.98,
        fadeOut: true,
        shrink: true,
      });
    }

    // 4. Dust cloud at base of pillar
    const baseY = PILLAR_GROUND_Y;
    for (let i = 0; i < 20; i++) {
      this.particles.spawn({
        x: impactX + randomRange(-pillar.width, pillar.width),
        y: baseY + randomRange(-10, 5),
        vx: randomRange(-100, 100),
        vy: randomRange(-50, -10),
        color: ['#8a8aaa', '#b0b0cc', '#6a6a8a'][Math.floor(Math.random() * 3)],
        size: randomRange(6, 18),
        lifetime: randomRange(0.5, 1.2),
        drag: 0.95,
        fadeOut: true,
        shrink: false,
      });
    }

    // 5. Falling rubble chunks (larger, heavier particles with more gravity)
    for (let i = 0; i < 10; i++) {
      this.particles.spawn({
        x: impactX + randomRange(-pillar.width / 2, pillar.width / 2),
        y: pillar.y + randomRange(0, pillar.height * 0.5),
        vx: randomRange(-60, 60),
        vy: randomRange(-120, -30),
        color: STONE_COLORS[Math.floor(Math.random() * STONE_COLORS.length)],
        size: randomRange(8, 18),
        lifetime: randomRange(0.8, 1.5),
        gravity: 500,
        drag: 0.99,
        fadeOut: true,
        shrink: false,
      });
    }

    // Check if correct count reached
    if (this.launchCount >= this.targetNumber) {
      // Pause briefly then celebrate
      setTimeout(() => {
        this.startCelebration();
      }, POST_COUNT_PAUSE * 1000);
    } else {
      // Back to awaiting clicks
      this.phase = 'awaiting-clicks';
      this.phaseTimer = 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Phase: Fireball Flying
  // ---------------------------------------------------------------------------

  private updateFireballFlying(_dt: number): void {
    // Check if all fireballs have landed
    const anyActive = this.fireballs.some((fb) => fb.active);
    if (!anyActive && this.phase === 'fireball-flying') {
      // Check if we need more clicks or are done
      if (this.launchCount < this.targetNumber) {
        this.phase = 'awaiting-clicks';
        this.phaseTimer = 0;
      }
      // If launchCount >= targetNumber, the onFireballImpact will handle celebration
    }
  }

  // ---------------------------------------------------------------------------
  // Phase: Celebration
  // ---------------------------------------------------------------------------

  private startCelebration(): void {
    this.phase = 'celebrating';
    this.phaseTimer = 0;
    this.celebrationTimer = 0;
    this.charizard.setPose('roar');

    // Big celebration burst
    for (let i = 0; i < 40; i++) {
      const x = randomRange(DESIGN_WIDTH * 0.2, DESIGN_WIDTH * 0.8);
      const y = randomRange(DESIGN_HEIGHT * 0.1, DESIGN_HEIGHT * 0.5);
      const colors = [
        theme.palette.celebration.gold,
        theme.palette.celebration.hotOrange,
        theme.palette.celebration.cyan,
      ];
      this.particles.burst(x, y, 3, colors[Math.floor(Math.random() * colors.length)], 120, 0.8);
    }
  }

  private updateCelebrating(dt: number): void {
    this.celebrationTimer += dt;

    // Spawn ongoing celebration particles
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
      if (this.promptsRemaining <= 0) {
        this.endRound();
      } else {
        // Next turn
        session.currentTurn = session.nextTurn();
        this.difficulty = session.currentTurn === 'kian' ? 'big' : 'little';
        this.bannerName = session.currentTurn === 'kian'
          ? settings.bigTrainerName
          : settings.littleTrainerName;
        this.startBanner();
      }
    }
  }

  private renderCelebration(ctx: CanvasRenderingContext2D): void {
    // "GREAT!" text with gold glow
    const t = Math.min(this.celebrationTimer / 0.3, 1);
    const scale = 0.5 + 0.5 * easing.easeOutBack(t);
    const alpha = t < 0.8 ? 1 : 1 - (this.celebrationTimer - CELEBRATION_DURATION * 0.8) / (CELEBRATION_DURATION * 0.2);

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textX = DESIGN_WIDTH / 2;
    const textY = DESIGN_HEIGHT * 0.4;

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

    // Transition after brief delay
    setTimeout(() => {
      this.gameContext.screenManager.goTo('calm-reset');
    }, 500);
  }

  // ---------------------------------------------------------------------------
  // Rendering: Ground
  // ---------------------------------------------------------------------------

  private generateGroundStones(): void {
    this.groundStones = [];
    for (let i = 0; i < 30; i++) {
      this.groundStones.push({
        x: randomRange(0, DESIGN_WIDTH),
        y: randomRange(PILLAR_GROUND_Y - 5, DESIGN_HEIGHT),
        w: randomRange(20, 80),
        h: randomRange(10, 35),
        color: DEBRIS_COLORS[Math.floor(Math.random() * DEBRIS_COLORS.length)],
      });
    }
  }

  private renderGround(ctx: CanvasRenderingContext2D): void {
    // Ground fill
    const groundGrad = ctx.createLinearGradient(0, PILLAR_GROUND_Y - 30, 0, DESIGN_HEIGHT);
    groundGrad.addColorStop(0, '#2a2a44');
    groundGrad.addColorStop(0.3, '#1e1e36');
    groundGrad.addColorStop(1, '#14142a');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, PILLAR_GROUND_Y - 30, DESIGN_WIDTH, DESIGN_HEIGHT - PILLAR_GROUND_Y + 30);

    // Rocky edge along the top of the ground
    ctx.beginPath();
    ctx.moveTo(0, PILLAR_GROUND_Y);
    for (let x = 0; x <= DESIGN_WIDTH; x += 40) {
      ctx.lineTo(x, PILLAR_GROUND_Y + Math.sin(x * 0.03) * 8 - Math.cos(x * 0.07) * 5);
    }
    ctx.lineTo(DESIGN_WIDTH, DESIGN_HEIGHT);
    ctx.lineTo(0, DESIGN_HEIGHT);
    ctx.closePath();
    ctx.fillStyle = '#222240';
    ctx.fill();

    // Scattered stones
    for (const stone of this.groundStones) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = stone.color;
      ctx.beginPath();
      const r = Math.min(stone.w, stone.h) * 0.3;
      this.roundedRect(ctx, stone.x - stone.w / 2, stone.y - stone.h / 2, stone.w, stone.h, r);
      ctx.fill();
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering: Pillars
  // ---------------------------------------------------------------------------

  private renderPillars(ctx: CanvasRenderingContext2D): void {
    for (const pillar of this.pillars) {
      if (pillar.destroyed) continue;

      ctx.save();

      const px = pillar.x - pillar.width / 2;
      const py = pillar.y;
      const pw = pillar.width;
      const visibleHeight = pillar.height - pillar.crumbleY;

      if (visibleHeight <= 0) {
        ctx.restore();
        continue;
      }

      // Shadow beneath pillar
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(
        pillar.x,
        PILLAR_GROUND_Y + 5,
        pw * 0.6,
        8,
        0, 0, Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();

      // Main pillar body (only draw visible portion from crumble top)
      const drawY = py + pillar.crumbleY;
      const drawH = visibleHeight;

      // Stone texture gradient
      const stoneGrad = ctx.createLinearGradient(px, drawY, px + pw, drawY);
      stoneGrad.addColorStop(0, '#4a4a6a');
      stoneGrad.addColorStop(0.3, '#5a5a7a');
      stoneGrad.addColorStop(0.7, '#5a5a7a');
      stoneGrad.addColorStop(1, '#3a3a5a');
      ctx.fillStyle = stoneGrad;

      // Rounded rectangle for pillar
      const cornerR = 8;
      this.roundedRect(ctx, px, drawY, pw, drawH, cornerR);
      ctx.fill();

      // Outline
      ctx.strokeStyle = '#2a2a4a';
      ctx.lineWidth = 4;
      this.roundedRect(ctx, px, drawY, pw, drawH, cornerR);
      ctx.stroke();

      // Top cap (slightly wider)
      const capH = 14;
      const capExtra = 8;
      ctx.fillStyle = '#6a6a8a';
      this.roundedRect(ctx, px - capExtra / 2, drawY - 2, pw + capExtra, capH, 5);
      ctx.fill();
      ctx.strokeStyle = '#2a2a4a';
      ctx.lineWidth = 3;
      this.roundedRect(ctx, px - capExtra / 2, drawY - 2, pw + capExtra, capH, 5);
      ctx.stroke();

      // Horizontal stone-line cracks
      ctx.strokeStyle = '#3a3a5a';
      ctx.lineWidth = 2;
      const lineCount = Math.floor(drawH / 30);
      for (let i = 1; i <= lineCount; i++) {
        const ly = drawY + i * 30;
        if (ly > PILLAR_GROUND_Y) break;
        ctx.beginPath();
        ctx.moveTo(px + 4, ly);
        ctx.lineTo(px + pw - 4, ly);
        ctx.stroke();
      }

      // If exploding, draw cracks radiating from impact point
      if (pillar.exploding) {
        const crackProgress = Math.min(pillar.explodeTimer / 0.2, 1);
        ctx.save();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 1 - pillar.explodeTimer / 0.5;
        const cx = pillar.x;
        const cy = pillar.y + pillar.height * 0.3;
        const crackLen = 60 * crackProgress;
        for (let a = 0; a < 8; a++) {
          const angle = (a / 8) * Math.PI * 2 + 0.3;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(
            cx + Math.cos(angle) * crackLen,
            cy + Math.sin(angle) * crackLen,
          );
          ctx.stroke();
        }
        ctx.restore();

        // Impact flash
        if (pillar.explodeTimer < 0.15) {
          const flashAlpha = 1 - pillar.explodeTimer / 0.15;
          ctx.save();
          ctx.globalAlpha = flashAlpha * 0.6;
          const flashGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 100);
          flashGrad.addColorStop(0, '#FFFFFF');
          flashGrad.addColorStop(0.3, '#91CCEC');
          flashGrad.addColorStop(1, 'rgba(55, 177, 226, 0)');
          ctx.fillStyle = flashGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, 100, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering: Fireballs
  // ---------------------------------------------------------------------------

  private renderFireballs(ctx: CanvasRenderingContext2D): void {
    for (const fb of this.fireballs) {
      if (!fb.active) continue;

      // Trail
      for (let i = 0; i < fb.trail.length; i++) {
        const point = fb.trail[i];
        const trailAlpha = 1 - point.age / 0.15;
        const trailSize = (1 - point.age / 0.15) * 12;
        if (trailAlpha <= 0 || trailSize <= 0) continue;

        ctx.save();
        ctx.globalAlpha = trailAlpha * 0.6;
        ctx.fillStyle = '#37B1E2';
        ctx.beginPath();
        ctx.arc(point.x, point.y, trailSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (fb.fizzling) {
        // Fizzling fireball: smaller, grey-ish
        const fizzleAlpha = 1 - fb.fizzleTimer / FIZZLE_DURATION;
        const fizzleSize = 8 * fizzleAlpha;
        ctx.save();
        ctx.globalAlpha = fizzleAlpha;
        ctx.fillStyle = '#888899';
        ctx.beginPath();
        ctx.arc(fb.x, fb.y, fizzleSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      // Fireball glow
      ctx.save();
      ctx.shadowColor = '#37B1E2';
      ctx.shadowBlur = 30;

      // Outer glow
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#37B1E2';
      ctx.beginPath();
      ctx.arc(fb.x, fb.y, 22, 0, Math.PI * 2);
      ctx.fill();

      // Mid layer
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#91CCEC';
      ctx.beginPath();
      ctx.arc(fb.x, fb.y, 14, 0, Math.PI * 2);
      ctx.fill();

      // Bright core
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(fb.x, fb.y, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering: Number Display
  // ---------------------------------------------------------------------------

  private renderNumberDisplay(ctx: CanvasRenderingContext2D): void {
    const numX = DESIGN_WIDTH / 2;
    const numY = 130;

    ctx.save();

    // Pulsing glow behind the number
    const pulse = 0.7 + 0.3 * Math.sin(this.numberGlowPhase * 3);
    const glowSize = 100 * pulse * this.numberScale;

    ctx.save();
    ctx.globalAlpha = 0.3 * this.numberScale;
    const numGlow = ctx.createRadialGradient(numX, numY, 10, numX, numY, glowSize);
    numGlow.addColorStop(0, '#37B1E2');
    numGlow.addColorStop(0.5, 'rgba(55, 177, 226, 0.3)');
    numGlow.addColorStop(1, 'rgba(55, 177, 226, 0)');
    ctx.fillStyle = numGlow;
    ctx.beginPath();
    ctx.arc(numX, numY, glowSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Number text with scale animation
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(numX, numY);
    ctx.scale(this.numberScale, this.numberScale);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.font = `bold ${FONT.numberPrompt}px system-ui`;
    ctx.fillText(String(this.targetNumber), 3, 3);

    // Main text with blue-white glow
    ctx.save();
    ctx.shadowColor = '#37B1E2';
    ctx.shadowBlur = 25 * pulse;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${FONT.numberPrompt}px system-ui`;
    ctx.fillText(String(this.targetNumber), 0, 0);
    ctx.restore();

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Rendering: Dot Pips
  // ---------------------------------------------------------------------------

  private renderDotPips(ctx: CanvasRenderingContext2D): void {
    const pipCount = this.targetNumber;
    const pipSize = 18;
    const pipSpacing = 48;
    const startX = DESIGN_WIDTH / 2 - ((pipCount - 1) * pipSpacing) / 2;
    const pipY = 230;

    for (let i = 0; i < pipCount; i++) {
      const px = startX + i * pipSpacing;
      const filled = this.dotPipFills[i];

      ctx.save();

      if (filled) {
        // Filled pip: bright blue with glow
        ctx.save();
        ctx.shadowColor = '#37B1E2';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#37B1E2';
        ctx.beginPath();
        ctx.arc(px, pipY, pipSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // White center
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(px, pipY, pipSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Empty pip: grey outline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px, pipY, pipSize, 0, Math.PI * 2);
        ctx.stroke();

        // Dim inner circle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.arc(px, pipY, pipSize - 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering: Overshoot Feedback
  // ---------------------------------------------------------------------------

  private renderOvershootFeedback(ctx: CanvasRenderingContext2D): void {
    // Show "too many!" text briefly when a fizzle fireball is active
    const fizzling = this.fireballs.find((fb) => fb.active && fb.fizzling);
    if (!fizzling) return;

    const alpha = Math.max(0, 1 - fizzling.fizzleTimer / FIZZLE_DURATION);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 48px system-ui';

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText('Oops! Too many!', fizzling.x + 3, fizzling.y - 50 + 3);

    ctx.fillStyle = theme.palette.ui.incorrect;
    ctx.fillText('Oops! Too many!', fizzling.x, fizzling.y - 50);

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Utility: Rounded Rectangle Path
  // ---------------------------------------------------------------------------

  private roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
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
