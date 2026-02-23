// src/engine/games/fireball-count.ts
// Feed the Charmanders — counting game where players launch fireballs to feed baby Charmanders.
// Owen (little): numbers 1-3, Charmanders match count exactly.
// Kian (big): numbers 1-7, more Charmanders than needed, must stop at the right count.

import type { GameScreen, GameContext } from '../screen-manager';
import { Background } from '../entities/backgrounds';
import { ParticlePool, setActivePool } from '../entities/particles';
import { Charizard } from '../entities/charizard';
import { TweenManager, easing } from '../utils/tween';
import { FeedbackSystem } from '../entities/feedback';
import { drawBabyCharmander } from '../entities/charmander';
import { countingDifficulty } from '../../content/counting';
import { randomInt, randomRange } from '../utils/math';
import {
  DESIGN_WIDTH,
  DESIGN_HEIGHT,
  PROMPTS_PER_ROUND,
  FONT,
} from '../../config/constants';
import { session } from '../../state/session.svelte';
import { settings } from '../../state/settings.svelte';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHARIZARD_X = 280;
const CHARIZARD_Y = 580;
const CHARIZARD_SCALE = 0.55;

// Fireball origin: approximate mouth position at attack pose
const FIREBALL_ORIGIN_X = 340;
const FIREBALL_ORIGIN_Y = 420;

// Fireball flight duration (slow for toddlers)
const FIREBALL_FLIGHT_TIME = 1.8;

// Timing
const BANNER_DURATION = 1.8;
const INTRO_DURATION = 2.0;
const CELEBRATION_DURATION = 1.8;
const POST_COUNT_PAUSE = 0.6;
const FIZZLE_DURATION = 0.5;

// Fireball colors (blue-white flame theme matching MCX)
const FIREBALL_COLORS = ['#FFFFFF', '#91CCEC', '#37B1E2', '#1a5fc4'];

// Number words for voice
const NUMBER_WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'];

// Celebration colors
const CELEBRATION_COLORS = ['#FFD700', '#FF6B35', '#91CCEC'];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BabyCharmander {
  x: number;
  y: number;           // bottom (feet) position
  scale: number;
  fed: boolean;        // has been hit by fireball
  waddleTimer: number; // waddle-in animation progress
  targetX: number;     // final x position (waddles from right to here)
  visible: boolean;
}

interface Fireball {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number; // 0..1
  targetCharmanderIndex: number;
  active: boolean;
  fizzling: boolean;
  fizzleTimer: number;
  trail: Array<{ x: number; y: number; age: number }>;
}

type GamePhase =
  | 'banner'          // showing turn banner
  | 'intro'           // Charmanders waddling in, number shown
  | 'awaiting-clicks' // player clicking to launch fireballs
  | 'fireball-flying' // fireball in transit to Charmander
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
  private feedback = new FeedbackSystem(this.particles);
  private gameContext!: GameContext;

  // Game state
  private phase: GamePhase = 'banner';
  private phaseTimer = 0;
  private totalTime = 0;
  private targetNumber = 0;
  private charmanderCount = 0;
  private launchCount = 0;
  private promptsRemaining = 0;
  private difficulty: 'little' | 'big' = 'little';

  // Visual state
  private charmanders: BabyCharmander[] = [];
  private fireballs: Fireball[] = [];
  private numberScale = 0;
  private numberGlowPhase = 0;
  private dotPipFills: boolean[] = [];

  // Banner text
  private bannerName = '';
  private bannerAlpha = 0;

  // Celebration
  private celebrationTimer = 0;

  // Count-up text
  private countText = '';
  private countTextAlpha = 0;
  private countTextScale = 0;

  // Overshoot feedback text
  private overshootText = '';
  private overshootAlpha = 0;
  private overshootX = 0;
  private overshootY = 0;

  // Ground rendering
  private groundStones: Array<{ x: number; y: number; w: number; h: number; color: string }> = [];

  // Audio helper
  private get audio(): any {
    return (this.gameContext as any).audio;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  enter(ctx: GameContext): void {
    this.gameContext = ctx;
    setActivePool(this.particles);
    this.particles.clear();
    this.tweens.clear();
    this.totalTime = 0;

    // Determine difficulty from current turn
    const turn = session.currentTurn;
    this.difficulty = turn === 'kian' ? 'big' : 'little';
    this.bannerName = turn === 'kian' ? settings.bigTrainerName : settings.littleTrainerName;

    this.promptsRemaining = PROMPTS_PER_ROUND.fireballCount;
    this.charizard.setPose('perch');

    // Generate random ground stones for the grassy terrain
    this.generateGroundStones();

    // Start first prompt
    this.startBanner();
  }

  update(dt: number): void {
    this.totalTime += dt;
    this.phaseTimer += dt;
    this.bg.update(dt);
    this.tweens.update(dt);
    this.charizard.update(dt);
    this.particles.update(dt);
    this.feedback.update(dt);
    this.numberGlowPhase += dt;

    // Fade count-up text
    if (this.countTextAlpha > 0) {
      this.countTextAlpha -= dt * 0.8;
    }

    // Fade overshoot text
    if (this.overshootAlpha > 0) {
      this.overshootAlpha -= dt * 0.6;
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
      case 'intro':
        this.updateIntro(dt);
        break;
      case 'awaiting-clicks':
        // Patiently wait for player click — no auto-timeout
        break;
      case 'fireball-flying':
        this.updateFireballFlying(dt);
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

    // Background
    this.bg.render(ctx);

    // Ground / grassy terrain
    this.renderGround(ctx);

    // Baby Charmanders (behind MCX's fireballs)
    this.renderCharmanders(ctx);

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

    // Count-up text
    if (this.countTextAlpha > 0 && this.countText) {
      this.renderCountText(ctx);
    }

    // Feedback system (GREAT!, etc.)
    this.feedback.render(ctx);

    // Turn banner overlay
    if (this.phase === 'banner') {
      this.renderBanner(ctx);
    }

    // Celebration overlay
    if (this.phase === 'celebrating') {
      this.renderCelebration(ctx);
    }

    // Overshoot feedback text
    if (this.overshootAlpha > 0) {
      this.renderOvershootText(ctx);
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
    // Space/Enter also launches a fireball
    if ((key === ' ' || key === 'Enter') && this.phase === 'awaiting-clicks') {
      this.launchFireball();
    }
    if (key === 'Escape') {
      this.gameContext.screenManager.goTo('hub');
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

    // Name text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${FONT.bannerName}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.bannerName}'s Turn!`, DESIGN_WIDTH / 2, bannerY + bannerH * 0.42);

    // Sub text
    ctx.font = `bold ${FONT.bannerRole}px system-ui`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('Feed the Charmanders!', DESIGN_WIDTH / 2, bannerY + bannerH * 0.75);

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Phase: New Prompt Setup
  // ---------------------------------------------------------------------------

  private startNewPrompt(): void {
    const diff = countingDifficulty[this.difficulty];
    this.targetNumber = randomInt(diff.minNumber, diff.maxNumber);

    // Charmander count: exact for Owen, +2 (or more) for Kian
    if (diff.pillarsMatchCount) {
      this.charmanderCount = this.targetNumber;
    } else {
      this.charmanderCount = Math.min(this.targetNumber + randomInt(2, 3), 9);
    }

    this.launchCount = 0;
    this.fireballs = [];
    this.dotPipFills = Array(this.targetNumber).fill(false);
    this.overshootAlpha = 0;

    // Create baby Charmanders (offscreen, ready to waddle in)
    this.createCharmanders();

    // Transition to intro phase (waddle-in animation)
    this.phase = 'intro';
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

    // Voice announcement
    const numberWord = NUMBER_WORDS[this.targetNumber] || String(this.targetNumber);
    this.audio?.speakFallback(numberWord + ' baby dragons are hungry!');
  }

  private createCharmanders(): void {
    const groundY = DESIGN_HEIGHT * 0.82;
    const startX = DESIGN_WIDTH * 0.38;
    const endX = DESIGN_WIDTH * 0.88;
    const spacing = (endX - startX) / (this.charmanderCount + 1);

    this.charmanders = [];
    for (let i = 0; i < this.charmanderCount; i++) {
      const targetX = startX + spacing * (i + 1);
      this.charmanders.push({
        x: DESIGN_WIDTH + 100, // start offscreen right
        y: groundY,
        scale: 0.9 + randomRange(-0.1, 0.1),
        fed: false,
        waddleTimer: 0,
        targetX,
        visible: true,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Phase: Intro (Charmanders waddle in)
  // ---------------------------------------------------------------------------

  private updateIntro(dt: number): void {
    // Stagger: each Charmander starts waddling 0.3s after the previous
    for (let i = 0; i < this.charmanders.length; i++) {
      const charm = this.charmanders[i];
      charm.waddleTimer += dt;
      const delay = i * 0.3;
      if (charm.waddleTimer > delay) {
        const t = Math.min((charm.waddleTimer - delay) / 0.8, 1);
        const eased = easing.easeOut(t);
        charm.x = DESIGN_WIDTH + 100 + (charm.targetX - (DESIGN_WIDTH + 100)) * eased;
      }
    }

    if (this.phaseTimer >= INTRO_DURATION) {
      // Ensure all Charmanders are at their target positions
      for (const charm of this.charmanders) {
        charm.x = charm.targetX;
      }
      this.phase = 'awaiting-clicks';
      this.phaseTimer = 0;
      this.charizard.setPose('attack');
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

    // Find next unfed Charmander
    const targetIndex = this.charmanders.findIndex(
      (c, i) => !c.fed && i >= this.launchCount,
    );
    if (targetIndex === -1) return;

    const charm = this.charmanders[targetIndex];

    const fb: Fireball = {
      x: FIREBALL_ORIGIN_X,
      y: FIREBALL_ORIGIN_Y,
      startX: FIREBALL_ORIGIN_X,
      startY: FIREBALL_ORIGIN_Y,
      targetX: charm.targetX,
      targetY: charm.y - 40, // aim at body center
      progress: 0,
      targetCharmanderIndex: targetIndex,
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

    // Audio: fireball launch
    this.audio?.playSynth('fireball');

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
      targetCharmanderIndex: -1,
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
        // Audio: wrong bonk
        this.audio?.playSynth('wrong-bonk');
        // Voice: "That's enough! They're full!"
        this.audio?.speakFallback("That's enough! They're full!");
        // Show overshoot text
        this.overshootText = "That's enough!\nThey're full!";
        this.overshootAlpha = 1;
        this.overshootX = fb.x;
        this.overshootY = fb.y;
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
    if (fb.targetCharmanderIndex < 0 || fb.targetCharmanderIndex >= this.charmanders.length) return;

    const charm = this.charmanders[fb.targetCharmanderIndex];
    if (charm.fed) return;

    // Feed the Charmander!
    charm.fed = true;

    // Impact particles (warm, friendly — not destructive)
    const impactX = charm.targetX;
    const impactY = charm.y - 40;

    // Sparkle burst around the Charmander
    for (let i = 0; i < 15; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(40, 150);
      this.particles.spawn({
        x: impactX + randomRange(-10, 10),
        y: impactY + randomRange(-10, 10),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: FIREBALL_COLORS[Math.floor(Math.random() * FIREBALL_COLORS.length)],
        size: randomRange(3, 8),
        lifetime: randomRange(0.3, 0.6),
        drag: 0.92,
        fadeOut: true,
        shrink: true,
      });
    }

    // Gold sparkles (feeding celebration)
    for (let i = 0; i < 10; i++) {
      this.particles.spawn({
        x: impactX + randomRange(-15, 15),
        y: impactY + randomRange(-20, 0),
        vx: randomRange(-40, 40),
        vy: randomRange(-100, -40),
        color: '#FFD700',
        size: randomRange(2, 5),
        lifetime: randomRange(0.4, 0.8),
        gravity: 100,
        drag: 0.97,
        fadeOut: true,
        shrink: true,
      });
    }

    // Show count-up text
    this.countText = `${this.launchCount}!`;
    this.countTextAlpha = 1;
    this.countTextScale = 0;
    this.tweens.add({
      from: 0,
      to: 1,
      duration: 0.3,
      easing: easing.easeOutBack,
      onUpdate: (v) => { this.countTextScale = v; },
    });

    // Audio: correct chime + voice count
    this.audio?.playSynth('correct-chime');
    const countWord = NUMBER_WORDS[this.launchCount];
    if (countWord) {
      this.audio?.speakFallback(countWord + '!');
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

    // Audio: cheer
    this.audio?.playSynth('cheer');

    // FeedbackSystem celebration
    this.feedback.correct(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.4);

    // Big celebration burst
    for (let i = 0; i < 40; i++) {
      const x = randomRange(DESIGN_WIDTH * 0.2, DESIGN_WIDTH * 0.8);
      const y = randomRange(DESIGN_HEIGHT * 0.1, DESIGN_HEIGHT * 0.5);
      this.particles.burst(
        x, y, 3,
        CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)],
        120, 0.8,
      );
    }
  }

  private updateCelebrating(dt: number): void {
    this.celebrationTimer += dt;

    // Spawn ongoing celebration particles
    if (Math.random() < 0.3) {
      this.particles.burst(
        randomRange(DESIGN_WIDTH * 0.1, DESIGN_WIDTH * 0.9),
        randomRange(DESIGN_HEIGHT * 0.1, DESIGN_HEIGHT * 0.4),
        2,
        CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)],
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
    const textY = DESIGN_HEIGHT * 0.35;

    // Glow
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 40;
    ctx.font = `bold ${Math.round(96 * scale)}px system-ui`;
    ctx.fillStyle = '#FFD700';
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
    const groundY = DESIGN_HEIGHT * 0.82;
    for (let i = 0; i < 30; i++) {
      this.groundStones.push({
        x: randomRange(0, DESIGN_WIDTH),
        y: randomRange(groundY - 5, DESIGN_HEIGHT),
        w: randomRange(20, 80),
        h: randomRange(10, 35),
        color: ['#2a4a2a', '#3a5a3a', '#1e3e1e', '#2d4d2d', '#3e5e3e'][Math.floor(Math.random() * 5)],
      });
    }
  }

  private renderGround(ctx: CanvasRenderingContext2D): void {
    const groundY = DESIGN_HEIGHT * 0.82;

    // Ground fill — green-tinted for a meadow feel
    const groundGrad = ctx.createLinearGradient(0, groundY - 30, 0, DESIGN_HEIGHT);
    groundGrad.addColorStop(0, '#1a3a1a');
    groundGrad.addColorStop(0.3, '#162e16');
    groundGrad.addColorStop(1, '#0e200e');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY - 30, DESIGN_WIDTH, DESIGN_HEIGHT - groundY + 30);

    // Grassy edge along the top of the ground
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x <= DESIGN_WIDTH; x += 40) {
      ctx.lineTo(x, groundY + Math.sin(x * 0.03) * 8 - Math.cos(x * 0.07) * 5);
    }
    ctx.lineTo(DESIGN_WIDTH, DESIGN_HEIGHT);
    ctx.lineTo(0, DESIGN_HEIGHT);
    ctx.closePath();
    ctx.fillStyle = '#1a3518';
    ctx.fill();

    // Scattered ground elements (small stones/tufts)
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
  // Rendering: Baby Charmanders
  // ---------------------------------------------------------------------------

  private renderCharmanders(ctx: CanvasRenderingContext2D): void {
    for (const charm of this.charmanders) {
      if (!charm.visible) continue;
      drawBabyCharmander(ctx, charm.x, charm.y, charm.scale, charm.fed, this.totalTime);
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
  // Rendering: Count-Up Text
  // ---------------------------------------------------------------------------

  private renderCountText(ctx: CanvasRenderingContext2D): void {
    const x = DESIGN_WIDTH * 0.65;
    const y = DESIGN_HEIGHT * 0.45;

    ctx.save();
    ctx.globalAlpha = Math.max(0, this.countTextAlpha);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const fontSize = Math.round(120 * this.countTextScale);
    ctx.font = `bold ${fontSize}px Fredoka, system-ui`;

    // Glow
    ctx.shadowColor = '#37B1E2';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(this.countText, x, y);

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Rendering: Overshoot Text
  // ---------------------------------------------------------------------------

  private renderOvershootText(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.overshootAlpha);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 44px system-ui';

    const lines = this.overshootText.split('\n');
    const lineHeight = 52;
    const baseY = DESIGN_HEIGHT * 0.35;

    for (let i = 0; i < lines.length; i++) {
      const ly = baseY + i * lineHeight;
      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillText(lines[i], DESIGN_WIDTH / 2 + 3, ly + 3);
      // Text
      ctx.fillStyle = '#ff6666';
      ctx.fillText(lines[i], DESIGN_WIDTH / 2, ly);
    }

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
