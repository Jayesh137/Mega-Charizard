// src/engine/games/charizard-kitchen.ts
// Mini-game 6: Charizard's Kitchen — Potion Brewing
//
// Story: "Help MCX brew a power potion! Follow the recipe!"
//
// Flow:
//   1. MCX stands next to a large bubbling cauldron
//   2. Recipe scroll appears: "3 RED berries!" (with number + color dot + berry icon)
//   3. Various colored berries bounce gently around the screen (large, easy to click)
//   4. Player clicks correct-color berries one at a time
//   5. Each berry flies into the cauldron — cauldron bubbles, voice counts: "One! Two! Three!"
//   6. Wrong color: Berry bounces back. "That's BLUE! We need RED!"
//   7. After correct recipe: Potion glows, MCX tastes it, power-up animation
//
// Dual difficulty:
//   Owen (2.5): 1-3 of ONE color, big berries, slow bounce
//   Kian (4):   Multi-ingredient recipes (stretch: currently single-ingredient for both)

import type { GameScreen, GameContext } from '../screen-manager';
import { Background } from '../entities/backgrounds';
import { ParticlePool, setActivePool } from '../entities/particles';
import { Charizard } from '../entities/charizard';
import { TweenManager, easing } from '../utils/tween';
import { FeedbackSystem } from '../entities/feedback';
import { DESIGN_WIDTH, DESIGN_HEIGHT, FONT } from '../../config/constants';
import { session } from '../../state/session.svelte';
import { settings } from '../../state/settings.svelte';
import { randomRange, randomInt, distance, lerp } from '../utils/math';

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
const RECIPES_PER_ROUND = 4;
const BERRY_RADIUS = 45; // 90px diameter — VERY large for toddlers
const CELEBRATION_DURATION = 2.5;
const RECIPE_REVEAL_DURATION = 2.0;
const FLY_TO_CAULDRON_DURATION = 0.8;
const WRONG_BOUNCE_DURATION = 0.6;
const RECIPE_COMPLETE_DURATION = 2.0;

// MCX position: left side next to cauldron
const CHAR_X = DESIGN_WIDTH * 0.15;
const CHAR_Y = DESIGN_HEIGHT * 0.5;
const CHAR_SCALE = 0.5;

// Cauldron position: center-left
const CAULDRON_X = DESIGN_WIDTH * 0.35;
const CAULDRON_Y = DESIGN_HEIGHT * 0.7;
const CAULDRON_WIDTH = 250;
const CAULDRON_HEIGHT = 200;

// Berry bouncing area: right half of screen
const BERRY_MIN_X = DESIGN_WIDTH * 0.5;
const BERRY_MAX_X = DESIGN_WIDTH * 0.95;
const BERRY_MIN_Y = DESIGN_HEIGHT * 0.15;
const BERRY_MAX_Y = DESIGN_HEIGHT * 0.65;

// Number words for voice counting
const NUMBER_WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'];

// Flame particle palette (MCX blue flames)
const FLAME_COLORS = ['#FFFFFF', '#E0F7FF', '#37B1E2', '#1A5C8A'];

// Celebration colors
const CELEBRATION_COLORS = ['#FFD700', '#FF6B35', '#91CCEC', '#FF7675', '#55EFC4'];

// ---------------------------------------------------------------------------
// Berry Colors
// ---------------------------------------------------------------------------

const BERRY_COLORS = [
  { name: 'RED', hex: '#E74C3C', light: '#FF7675', dark: '#C0392B' },
  { name: 'BLUE', hex: '#3498DB', light: '#74B9FF', dark: '#2980B9' },
  { name: 'YELLOW', hex: '#F1C40F', light: '#FFEAA7', dark: '#F39C12' },
  { name: 'GREEN', hex: '#2ECC71', light: '#55EFC4', dark: '#27AE60' },
  { name: 'PURPLE', hex: '#9B59B6', light: '#A29BFE', dark: '#8E44AD' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Recipe {
  colorIndex: number;
  count: number;
}

interface Berry {
  colorIndex: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  collected: boolean;
  flyingToCauldron: boolean;
  flyProgress: number;
  startX: number;
  startY: number;
  wobbleOffset: number; // unique wobble phase per berry
  bounceBackTimer: number; // > 0 means bouncing back after wrong click
}

type GamePhase =
  | 'banner'
  | 'recipe-reveal'
  | 'collecting'
  | 'berry-flying'
  | 'wrong-bounce'
  | 'recipe-complete'
  | 'celebrating'
  | 'complete';

// ---------------------------------------------------------------------------
// CharizardKitchenGame
// ---------------------------------------------------------------------------

export class CharizardKitchenGame implements GameScreen {
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

  // Recipe state
  private currentRecipe: Recipe | null = null;
  private recipesCompleted = 0;
  private collectedCount = 0;
  private berries: Berry[] = [];

  // Input
  private inputLocked = false;
  private missCount = 0;

  // Cauldron visual state
  private cauldronBubbleIntensity = 0.5; // 0-1, ramps up as berries added
  private potionColorIndex = -1; // -1 = default green, else berry color
  private cauldronGlowing = false;
  private cauldronOverflow = false;
  private cauldronOverflowTimer = 0;

  // Bubble particles that float up from the cauldron surface
  private bubbles: Array<{
    x: number; y: number; r: number;
    speed: number; alpha: number; age: number; maxAge: number;
  }> = [];

  // Screen shake
  private shakeAmount = 0;
  private shakeX = 0;
  private shakeY = 0;

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
    this.time = 0;
    this.recipesCompleted = 0;

    const turn = session.currentTurn;
    this.difficulty = turn === 'kian' ? 'big' : 'little';
    this.bannerName = turn === 'kian'
      ? settings.bigTrainerName
      : settings.littleTrainerName;

    this.charizard.setPose('perch');
    this.missCount = 0;
    this.cauldronBubbleIntensity = 0.5;
    this.potionColorIndex = -1;
    this.cauldronGlowing = false;
    this.cauldronOverflow = false;
    this.cauldronOverflowTimer = 0;
    this.bubbles = [];

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

    // Cauldron overflow timer
    if (this.cauldronOverflow) {
      this.cauldronOverflowTimer += dt;
      if (this.cauldronOverflowTimer > 1.5) {
        this.cauldronOverflow = false;
        this.cauldronOverflowTimer = 0;
      }
    }

    // Update cauldron bubbles
    this.updateCauldronBubbles(dt);

    // Ambient flame particles from MCX
    if (this.phase !== 'complete' && Math.random() < 0.12) {
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
      case 'recipe-reveal':
        this.updateRecipeReveal();
        break;
      case 'collecting':
        this.updateCollecting(dt);
        break;
      case 'berry-flying':
        this.updateBerryFlying(dt);
        break;
      case 'wrong-bounce':
        this.updateWrongBounce(dt);
        break;
      case 'recipe-complete':
        this.updateRecipeComplete(dt);
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

    // Background with warm kitchen overlay
    this.bg.render(ctx);

    // Warm dark overlay for kitchen atmosphere
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#1a0a05';
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    ctx.restore();

    // Ground / stone floor
    this.renderGround(ctx);

    // Cauldron (drawn behind MCX)
    this.drawCauldron(ctx, this.time);

    // Charizard on left side
    this.charizard.render(ctx, CHAR_X, CHAR_Y, CHAR_SCALE);

    // Berries
    this.renderBerries(ctx);

    // Particles
    this.particles.render(ctx);

    // Feedback text overlay
    this.feedback.render(ctx);

    // Recipe scroll
    if (this.phase !== 'banner' && this.phase !== 'complete' && this.currentRecipe) {
      this.renderRecipeScroll(ctx);
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
    if (this.phase !== 'collecting') return;
    if (!this.currentRecipe) return;

    // Check if click hits any uncollected berry (generous hitbox)
    const hitRadius = BERRY_RADIUS + 15;
    for (const berry of this.berries) {
      if (berry.collected || berry.flyingToCauldron || berry.bounceBackTimer > 0) continue;

      const dist = distance(x, y, berry.x, berry.y);
      if (dist < hitRadius * berry.scale) {
        if (berry.colorIndex === this.currentRecipe.colorIndex) {
          // Correct color
          if (this.collectedCount < this.currentRecipe.count) {
            this.handleCorrectBerry(berry);
          } else {
            // Already have enough — overflow
            this.handleTooMany(berry);
          }
        } else {
          // Wrong color
          this.handleWrongBerry(berry);
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
      this.startNextRecipe();
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
    ctx.fillText('Brew a power potion!', DESIGN_WIDTH / 2, bannerY + bannerH * 0.75);

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Recipe Setup
  // ---------------------------------------------------------------------------

  private startNextRecipe(): void {
    if (this.recipesCompleted >= RECIPES_PER_ROUND) {
      this.startCelebration();
      return;
    }

    // Generate recipe based on difficulty
    let colorIndex: number;
    let count: number;

    if (this.difficulty === 'little') {
      // Owen: single ingredient, count 1-3, pick from first 3 colors (RED, BLUE, YELLOW)
      colorIndex = randomInt(0, 2);
      count = randomInt(1, 3);
    } else {
      // Kian: single ingredient for now, count 2-4, all colors available
      colorIndex = randomInt(0, 4);
      count = randomInt(2, 4);
    }

    this.currentRecipe = { colorIndex, count };
    this.collectedCount = 0;
    this.missCount = 0;
    this.inputLocked = true;
    this.potionColorIndex = -1;
    this.cauldronGlowing = false;
    this.cauldronBubbleIntensity = 0.5;

    // Spawn berries
    this.spawnBerries();

    // Start recipe reveal phase
    this.phase = 'recipe-reveal';
    this.phaseTimer = 0;

    // Voice prompt
    const colorName = BERRY_COLORS[colorIndex].name;
    const voiceText = `We need ${count} ${colorName} berries!`;
    this.audio?.speakFallback?.(voiceText);
    if (!this.audio?.speakFallback) {
      speakFallback(voiceText);
    }
  }

  private spawnBerries(): void {
    this.berries = [];
    if (!this.currentRecipe) return;

    const targetColor = this.currentRecipe.colorIndex;
    const targetCount = this.currentRecipe.count;

    // Spawn 6-8 berries total
    const totalBerries = this.difficulty === 'little' ? 6 : 8;

    // Ensure we have enough target-color berries (at least count + 1)
    const targetBerryCount = Math.min(targetCount + 1, totalBerries);
    const distractorCount = totalBerries - targetBerryCount;

    // Build color list
    const berryColorIndices: number[] = [];

    // Target color berries
    for (let i = 0; i < targetBerryCount; i++) {
      berryColorIndices.push(targetColor);
    }

    // Distractor berries (any color except target)
    const distractorColors = BERRY_COLORS.map((_, i) => i).filter(i => i !== targetColor);
    for (let i = 0; i < distractorCount; i++) {
      berryColorIndices.push(distractorColors[randomInt(0, distractorColors.length - 1)]);
    }

    // Shuffle
    for (let i = berryColorIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [berryColorIndices[i], berryColorIndices[j]] = [berryColorIndices[j], berryColorIndices[i]];
    }

    // Create berry objects with random positions in the berry area
    for (let i = 0; i < berryColorIndices.length; i++) {
      const bx = randomRange(BERRY_MIN_X + BERRY_RADIUS, BERRY_MAX_X - BERRY_RADIUS);
      const by = randomRange(BERRY_MIN_Y + BERRY_RADIUS, BERRY_MAX_Y - BERRY_RADIUS);

      // Slow velocities for toddlers: 30-60 px/s
      const speed = this.difficulty === 'little' ? randomRange(25, 50) : randomRange(35, 65);
      const angle = randomRange(0, Math.PI * 2);

      this.berries.push({
        colorIndex: berryColorIndices[i],
        x: bx,
        y: by,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        scale: 1.0,
        collected: false,
        flyingToCauldron: false,
        flyProgress: 0,
        startX: bx,
        startY: by,
        wobbleOffset: randomRange(0, Math.PI * 2),
        bounceBackTimer: 0,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Recipe Reveal Phase
  // ---------------------------------------------------------------------------

  private updateRecipeReveal(): void {
    if (this.phaseTimer >= RECIPE_REVEAL_DURATION) {
      this.phase = 'collecting';
      this.phaseTimer = 0;
      this.inputLocked = false;
      this.charizard.setPose('idle');
    }
  }

  // ---------------------------------------------------------------------------
  // Collecting Phase — berries bounce around, player clicks
  // ---------------------------------------------------------------------------

  private updateCollecting(dt: number): void {
    this.updateBerryPhysics(dt);
  }

  private updateBerryPhysics(dt: number): void {
    for (const berry of this.berries) {
      if (berry.collected || berry.flyingToCauldron) continue;

      // Bounce-back animation (wrong berry was clicked)
      if (berry.bounceBackTimer > 0) {
        berry.bounceBackTimer -= dt;
        if (berry.bounceBackTimer <= 0) {
          berry.bounceBackTimer = 0;
        }
        continue;
      }

      // Move berry
      berry.x += berry.vx * dt;
      berry.y += berry.vy * dt;

      // Add gentle wobble with sin
      berry.x += Math.sin(this.time * 2 + berry.wobbleOffset) * 0.3;
      berry.y += Math.cos(this.time * 1.5 + berry.wobbleOffset * 1.3) * 0.3;

      // Bounce off berry area edges
      if (berry.x - BERRY_RADIUS < BERRY_MIN_X) {
        berry.x = BERRY_MIN_X + BERRY_RADIUS;
        berry.vx = Math.abs(berry.vx);
      }
      if (berry.x + BERRY_RADIUS > BERRY_MAX_X) {
        berry.x = BERRY_MAX_X - BERRY_RADIUS;
        berry.vx = -Math.abs(berry.vx);
      }
      if (berry.y - BERRY_RADIUS < BERRY_MIN_Y) {
        berry.y = BERRY_MIN_Y + BERRY_RADIUS;
        berry.vy = Math.abs(berry.vy);
      }
      if (berry.y + BERRY_RADIUS > BERRY_MAX_Y) {
        berry.y = BERRY_MAX_Y - BERRY_RADIUS;
        berry.vy = -Math.abs(berry.vy);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Correct Berry — fly to cauldron
  // ---------------------------------------------------------------------------

  private handleCorrectBerry(berry: Berry): void {
    this.inputLocked = true;
    berry.flyingToCauldron = true;
    berry.flyProgress = 0;
    berry.startX = berry.x;
    berry.startY = berry.y;

    this.audio?.playSynth('pop');
    this.charizard.setPose('attack');

    this.phase = 'berry-flying';
    this.phaseTimer = 0;

    // Tween the fly progress
    this.tweens.add({
      from: 0,
      to: 1,
      duration: FLY_TO_CAULDRON_DURATION,
      easing: easing.easeInOut,
      onUpdate: (v) => {
        berry.flyProgress = v;
        // Lerp position with arc
        berry.x = lerp(berry.startX, CAULDRON_X, v);
        // Arc: dip down then curve up into cauldron
        const arcHeight = -120 * Math.sin(v * Math.PI);
        berry.y = lerp(berry.startY, CAULDRON_Y - CAULDRON_HEIGHT * 0.3, v) + arcHeight;
        // Shrink as it enters the cauldron
        berry.scale = 1.0 - v * 0.5;
      },
      onComplete: () => {
        berry.collected = true;
        berry.flyingToCauldron = false;
        this.collectedCount++;

        // Cauldron bubbles on impact
        this.audio?.playSynth('bubble');
        this.cauldronBubbleIntensity = Math.min(1.0, 0.5 + this.collectedCount * 0.15);

        // Splash particles at cauldron
        const recipeColor = this.currentRecipe ? BERRY_COLORS[this.currentRecipe.colorIndex] : BERRY_COLORS[0];
        this.particles.burst(
          CAULDRON_X, CAULDRON_Y - CAULDRON_HEIGHT * 0.3,
          15, recipeColor.hex, 100, 0.6,
        );

        // Voice count
        const countWord = NUMBER_WORDS[this.collectedCount];
        if (countWord) {
          const voiceText = countWord + '!';
          this.audio?.speakFallback?.(voiceText);
          if (!this.audio?.speakFallback) {
            speakFallback(voiceText);
          }
        }

        // Update potion color
        this.potionColorIndex = this.currentRecipe?.colorIndex ?? -1;

        // Reset MCX pose
        setTimeout(() => {
          if (this.phase !== 'complete' && this.phase !== 'celebrating') {
            this.charizard.setPose('idle');
          }
        }, 400);

        // Check if recipe is complete
        if (this.currentRecipe && this.collectedCount >= this.currentRecipe.count) {
          setTimeout(() => {
            this.startRecipeComplete();
          }, 600);
        } else {
          // Continue collecting
          this.phase = 'collecting';
          this.phaseTimer = 0;
          this.inputLocked = false;
        }
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Berry Flying Phase
  // ---------------------------------------------------------------------------

  private updateBerryFlying(dt: number): void {
    // Tweens handle animation; also keep other berries bouncing
    this.updateBerryPhysics(dt);
  }

  // ---------------------------------------------------------------------------
  // Wrong Berry — bounce back
  // ---------------------------------------------------------------------------

  private handleWrongBerry(berry: Berry): void {
    this.inputLocked = true;
    this.missCount++;

    // Audio + feedback
    this.audio?.playSynth('wrong-bonk');
    this.feedback.wrong(berry.x, berry.y - 40);

    // Small shake
    this.shakeAmount = 4;

    // MCX nudge pose
    this.charizard.setPose('nudge');

    // Red burst at berry
    this.particles.burst(berry.x, berry.y, 8, '#FF6B6B', 60, 0.4);

    // Voice feedback
    const wrongColor = BERRY_COLORS[berry.colorIndex].name;
    const rightColor = this.currentRecipe ? BERRY_COLORS[this.currentRecipe.colorIndex].name : '';
    const voiceText = `That's ${wrongColor}! We need ${rightColor}!`;
    this.audio?.speakFallback?.(voiceText);
    if (!this.audio?.speakFallback) {
      speakFallback(voiceText);
    }

    // Bounce berry away from click
    berry.bounceBackTimer = WRONG_BOUNCE_DURATION;
    const bounceAngle = randomRange(0, Math.PI * 2);
    const bounceSpeed = 150;
    berry.vx = Math.cos(bounceAngle) * bounceSpeed;
    berry.vy = Math.sin(bounceAngle) * bounceSpeed;

    this.phase = 'wrong-bounce';
    this.phaseTimer = 0;
  }

  private updateWrongBounce(dt: number): void {
    // Update physics for the bouncing berry + others
    this.updateBerryPhysics(dt);

    if (this.phaseTimer >= WRONG_BOUNCE_DURATION) {
      this.phase = 'collecting';
      this.phaseTimer = 0;
      this.inputLocked = false;
      this.charizard.setPose('idle');

      // Auto-complete hint after 3 misses
      if (this.missCount >= 3 && this.currentRecipe) {
        // Highlight a correct berry
        const correctBerry = this.berries.find(
          b => !b.collected && !b.flyingToCauldron && b.colorIndex === this.currentRecipe!.colorIndex
        );
        if (correctBerry) {
          this.feedback.hint(correctBerry.x, correctBerry.y - 50);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Too Many — already collected enough
  // ---------------------------------------------------------------------------

  private handleTooMany(berry: Berry): void {
    this.audio?.playSynth('bubble');

    // Cauldron bubbles over briefly
    this.cauldronOverflow = true;
    this.cauldronOverflowTimer = 0;

    // Voice feedback
    const voiceText = "That's enough! The recipe is done!";
    this.audio?.speakFallback?.(voiceText);
    if (!this.audio?.speakFallback) {
      speakFallback(voiceText);
    }

    // Small shake
    this.shakeAmount = 3;

    // Berry bounces away
    berry.bounceBackTimer = 0.3;
    berry.vx = randomRange(-100, 100);
    berry.vy = randomRange(-100, -50);
  }

  // ---------------------------------------------------------------------------
  // Recipe Complete
  // ---------------------------------------------------------------------------

  private startRecipeComplete(): void {
    this.phase = 'recipe-complete';
    this.phaseTimer = 0;
    this.inputLocked = true;
    this.cauldronGlowing = true;

    // MCX roar (tasting the potion!)
    this.charizard.setPose('roar');
    this.audio?.playSynth('correct-chime');

    // Feedback
    this.feedback.correct(CAULDRON_X, CAULDRON_Y - 100);

    // Potion glow particles
    if (this.currentRecipe) {
      const color = BERRY_COLORS[this.currentRecipe.colorIndex];
      for (let i = 0; i < 30; i++) {
        this.particles.spawn({
          x: CAULDRON_X + randomRange(-60, 60),
          y: CAULDRON_Y - CAULDRON_HEIGHT * 0.3 + randomRange(-30, 10),
          vx: randomRange(-40, 40),
          vy: randomRange(-100, -40),
          color: color.light,
          size: randomRange(3, 8),
          lifetime: randomRange(0.5, 1.2),
          drag: 0.95,
          fadeOut: true,
          shrink: true,
        });
      }
    }

    // Power-up sparkle particles around MCX
    for (let i = 0; i < 20; i++) {
      this.particles.spawn({
        x: CHAR_X + randomRange(-60, 60),
        y: CHAR_Y + randomRange(-80, 20),
        vx: randomRange(-30, 30),
        vy: randomRange(-80, -30),
        color: CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)],
        size: randomRange(2, 6),
        lifetime: randomRange(0.4, 0.9),
        drag: 0.96,
        fadeOut: true,
        shrink: true,
      });
    }
  }

  private updateRecipeComplete(dt: number): void {
    if (this.phaseTimer >= RECIPE_COMPLETE_DURATION) {
      this.recipesCompleted++;
      this.cauldronGlowing = false;
      this.charizard.setPose('idle');

      if (this.recipesCompleted >= RECIPES_PER_ROUND) {
        this.startCelebration();
      } else {
        // Alternate turns for multi-prompt games
        session.currentTurn = session.nextTurn();
        this.difficulty = session.currentTurn === 'kian' ? 'big' : 'little';
        this.bannerName = session.currentTurn === 'kian'
          ? settings.bigTrainerName
          : settings.littleTrainerName;
        this.startBanner();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Celebration
  // ---------------------------------------------------------------------------

  private startCelebration(): void {
    this.phase = 'celebrating';
    this.phaseTimer = 0;
    this.celebrationTimer = 0;

    // MCX happy!
    this.charizard.setPose('happy');
    this.audio?.playSynth('cheer');

    // Big particle bursts
    for (let i = 0; i < 40; i++) {
      const x = randomRange(DESIGN_WIDTH * 0.1, DESIGN_WIDTH * 0.9);
      const y = randomRange(DESIGN_HEIGHT * 0.1, DESIGN_HEIGHT * 0.5);
      this.particles.burst(
        x, y, 3,
        CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)],
        140, 0.9,
      );
    }

    this.shakeAmount = 10;
  }

  private updateCelebrating(dt: number): void {
    this.celebrationTimer += dt;

    // Ongoing celebration sparks
    if (Math.random() < 0.35) {
      this.particles.burst(
        randomRange(DESIGN_WIDTH * 0.1, DESIGN_WIDTH * 0.9),
        randomRange(DESIGN_HEIGHT * 0.1, DESIGN_HEIGHT * 0.4),
        2,
        CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)],
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
    ctx.fillText('POWER UP!', textX, textY);
    ctx.restore();

    ctx.font = `bold ${Math.round(96 * scale)}px system-ui`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('POWER UP!', textX, textY);

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
  // Cauldron Bubbles
  // ---------------------------------------------------------------------------

  private updateCauldronBubbles(dt: number): void {
    // Spawn new bubbles
    const spawnRate = this.cauldronBubbleIntensity * 2;
    if (Math.random() < spawnRate * dt * 3) {
      this.bubbles.push({
        x: CAULDRON_X + randomRange(-CAULDRON_WIDTH * 0.35, CAULDRON_WIDTH * 0.35),
        y: CAULDRON_Y - CAULDRON_HEIGHT * 0.3,
        r: randomRange(4, 12),
        speed: randomRange(20, 50),
        alpha: randomRange(0.4, 0.8),
        age: 0,
        maxAge: randomRange(0.5, 1.5),
      });
    }

    // Update existing bubbles
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.age += dt;
      b.y -= b.speed * dt;
      b.x += Math.sin(this.time * 3 + i) * 0.5;
      if (b.age >= b.maxAge) {
        this.bubbles.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering: Ground
  // ---------------------------------------------------------------------------

  private renderGround(ctx: CanvasRenderingContext2D): void {
    const groundY = DESIGN_HEIGHT * 0.78;

    // Stone floor gradient
    const groundGrad = ctx.createLinearGradient(0, groundY - 20, 0, DESIGN_HEIGHT);
    groundGrad.addColorStop(0, '#2a1a10');
    groundGrad.addColorStop(0.3, '#1e1208');
    groundGrad.addColorStop(1, '#140e06');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY - 20, DESIGN_WIDTH, DESIGN_HEIGHT - groundY + 20);

    // Warm horizon glow (fire light from cauldron)
    const horizonGlow = ctx.createRadialGradient(
      CAULDRON_X, groundY, 50,
      CAULDRON_X, groundY, 400,
    );
    horizonGlow.addColorStop(0, 'rgba(240, 128, 48, 0.15)');
    horizonGlow.addColorStop(1, 'rgba(240, 128, 48, 0)');
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, groundY - 50, DESIGN_WIDTH, DESIGN_HEIGHT - groundY + 50);
  }

  // ---------------------------------------------------------------------------
  // Rendering: Cauldron
  // ---------------------------------------------------------------------------

  private drawCauldron(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    ctx.translate(CAULDRON_X, CAULDRON_Y);

    // Fire underneath the cauldron
    this.drawFire(ctx, time);

    // Pot body — elliptical iron cauldron
    ctx.beginPath();
    // Bottom half of cauldron (elliptical)
    ctx.ellipse(0, 0, CAULDRON_WIDTH / 2, CAULDRON_HEIGHT / 2, 0, 0, Math.PI);
    // Straight sides up to rim
    ctx.lineTo(-CAULDRON_WIDTH / 2, -CAULDRON_HEIGHT * 0.3);
    // Rim (top ellipse)
    ctx.ellipse(0, -CAULDRON_HEIGHT * 0.3, CAULDRON_WIDTH / 2, 20, 0, Math.PI, 0);
    ctx.closePath();

    // Dark iron gradient
    const bodyGrad = ctx.createLinearGradient(-CAULDRON_WIDTH / 2, 0, CAULDRON_WIDTH / 2, 0);
    bodyGrad.addColorStop(0, '#2C2C2C');
    bodyGrad.addColorStop(0.3, '#4A4A4A');
    bodyGrad.addColorStop(0.7, '#3A3A3A');
    bodyGrad.addColorStop(1, '#1A1A1A');
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Cauldron glow when recipe is complete
    if (this.cauldronGlowing) {
      ctx.save();
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(time * 6);
      const glowColor = this.potionColorIndex >= 0
        ? BERRY_COLORS[this.potionColorIndex].light
        : '#55EFC4';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 50;
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.ellipse(0, -CAULDRON_HEIGHT * 0.3, CAULDRON_WIDTH / 2 + 20, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Liquid surface (ellipse at top of cauldron)
    const liquidColor = this.potionColorIndex >= 0
      ? BERRY_COLORS[this.potionColorIndex].hex
      : '#2ECC71'; // Default green potion
    const liquidLight = this.potionColorIndex >= 0
      ? BERRY_COLORS[this.potionColorIndex].light
      : '#55EFC4';

    ctx.beginPath();
    ctx.ellipse(0, -CAULDRON_HEIGHT * 0.3, CAULDRON_WIDTH / 2 - 5, 18, 0, 0, Math.PI * 2);
    const liquidGrad = ctx.createRadialGradient(0, -CAULDRON_HEIGHT * 0.3, 10, 0, -CAULDRON_HEIGHT * 0.3, CAULDRON_WIDTH / 2);
    liquidGrad.addColorStop(0, liquidLight);
    liquidGrad.addColorStop(0.6, liquidColor);
    liquidGrad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = liquidGrad;
    ctx.fill();

    // Bubbling on liquid surface
    for (const bubble of this.bubbles) {
      const bAlpha = bubble.alpha * (1 - bubble.age / bubble.maxAge);
      ctx.save();
      ctx.globalAlpha = bAlpha;
      ctx.fillStyle = liquidLight;
      ctx.beginPath();
      ctx.arc(bubble.x - CAULDRON_X, bubble.y - CAULDRON_Y, bubble.r, 0, Math.PI * 2);
      ctx.fill();
      // Highlight on bubble
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(bubble.x - CAULDRON_X - bubble.r * 0.3, bubble.y - CAULDRON_Y - bubble.r * 0.3, bubble.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Overflow effect
    if (this.cauldronOverflow) {
      const overflowAlpha = 0.6 * (1 - this.cauldronOverflowTimer / 1.5);
      ctx.save();
      ctx.globalAlpha = Math.max(0, overflowAlpha);
      ctx.fillStyle = liquidColor;
      // Dripping over the sides
      for (let i = 0; i < 5; i++) {
        const ox = (i - 2) * 40;
        const dripY = this.cauldronOverflowTimer * 60;
        ctx.beginPath();
        ctx.ellipse(ox, -CAULDRON_HEIGHT * 0.2 + dripY, 15, 25 + dripY * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Iron handles on sides
    ctx.strokeStyle = '#3A3A3A';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    // Left handle
    ctx.beginPath();
    ctx.arc(-CAULDRON_WIDTH / 2 - 15, -CAULDRON_HEIGHT * 0.15, 20, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.stroke();
    // Right handle
    ctx.beginPath();
    ctx.arc(CAULDRON_WIDTH / 2 + 15, -CAULDRON_HEIGHT * 0.15, 20, Math.PI * 0.7, Math.PI * 1.3);
    ctx.stroke();

    // Iron rim
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, -CAULDRON_HEIGHT * 0.3, CAULDRON_WIDTH / 2 + 3, 22, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawFire(ctx: CanvasRenderingContext2D, time: number): void {
    // Flickering flames under the cauldron
    const fireBaseY = CAULDRON_HEIGHT / 2 - 10;
    const fireColors = ['#FF6B35', '#FF9A56', '#FFD700', '#FF4500'];

    for (let i = 0; i < 7; i++) {
      const fx = (i - 3) * 30;
      const flicker = Math.sin(time * 8 + i * 1.7) * 10;
      const flameHeight = 30 + Math.sin(time * 5 + i * 2.3) * 15;

      ctx.save();
      ctx.globalAlpha = 0.7 + Math.sin(time * 6 + i) * 0.2;
      ctx.fillStyle = fireColors[i % fireColors.length];
      ctx.beginPath();
      ctx.moveTo(fx - 15, fireBaseY);
      ctx.quadraticCurveTo(fx + flicker, fireBaseY - flameHeight, fx + 5, fireBaseY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Fire glow on ground
    ctx.save();
    ctx.globalAlpha = 0.2 + Math.sin(time * 4) * 0.05;
    const fireGlow = ctx.createRadialGradient(0, fireBaseY, 10, 0, fireBaseY, 120);
    fireGlow.addColorStop(0, 'rgba(255, 107, 53, 0.4)');
    fireGlow.addColorStop(1, 'rgba(255, 107, 53, 0)');
    ctx.fillStyle = fireGlow;
    ctx.beginPath();
    ctx.arc(0, fireBaseY, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Rendering: Berries
  // ---------------------------------------------------------------------------

  private renderBerries(ctx: CanvasRenderingContext2D): void {
    for (const berry of this.berries) {
      if (berry.collected) continue;
      this.drawBerry(ctx, berry, this.time);
    }
  }

  private drawBerry(ctx: CanvasRenderingContext2D, berry: Berry, time: number): void {
    const c = BERRY_COLORS[berry.colorIndex];
    ctx.save();
    ctx.translate(berry.x, berry.y);

    // Gentle scale pulse
    const pulse = 1.0 + Math.sin(time * 2 + berry.wobbleOffset) * 0.03;
    ctx.scale(berry.scale * pulse, berry.scale * pulse);

    // Berry body — circle with gradient
    const grad = ctx.createRadialGradient(-8, -10, 5, 0, 0, BERRY_RADIUS);
    grad.addColorStop(0, c.light);
    grad.addColorStop(0.7, c.hex);
    grad.addColorStop(1, c.dark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, BERRY_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Subtle outline
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Highlight (shiny spot)
    ctx.beginPath();
    ctx.ellipse(-10, -12, 10, 14, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();

    // Leaf on top
    ctx.save();
    ctx.translate(0, -BERRY_RADIUS + 5);
    ctx.fillStyle = '#27AE60';
    ctx.beginPath();
    ctx.ellipse(8, -8, 12, 6, 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Second smaller leaf
    ctx.fillStyle = '#2ECC71';
    ctx.beginPath();
    ctx.ellipse(-5, -6, 8, 4, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // Small stem
    ctx.strokeStyle = '#1E8449';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(5, -10);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Rendering: Recipe Scroll
  // ---------------------------------------------------------------------------

  private renderRecipeScroll(ctx: CanvasRenderingContext2D): void {
    if (!this.currentRecipe) return;

    const scrollX = DESIGN_WIDTH / 2;
    const scrollY = 75;
    const scrollW = 450;
    const scrollH = 100;

    ctx.save();

    // Fade in during recipe reveal
    if (this.phase === 'recipe-reveal') {
      const fadeIn = Math.min(1, this.phaseTimer / 0.5);
      ctx.globalAlpha = fadeIn;
    }

    // Parchment background
    ctx.fillStyle = '#F5E6C8';
    this.roundedRect(ctx, scrollX - scrollW / 2, scrollY - scrollH / 2, scrollW, scrollH, 15);
    ctx.fill();

    // Brown border
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 3;
    this.roundedRect(ctx, scrollX - scrollW / 2, scrollY - scrollH / 2, scrollW, scrollH, 15);
    ctx.stroke();

    // Parchment texture (subtle darker edges)
    const parchGrad = ctx.createLinearGradient(
      scrollX - scrollW / 2, scrollY - scrollH / 2,
      scrollX - scrollW / 2, scrollY + scrollH / 2,
    );
    parchGrad.addColorStop(0, 'rgba(139, 105, 20, 0.1)');
    parchGrad.addColorStop(0.5, 'rgba(139, 105, 20, 0)');
    parchGrad.addColorStop(1, 'rgba(139, 105, 20, 0.15)');
    ctx.fillStyle = parchGrad;
    this.roundedRect(ctx, scrollX - scrollW / 2, scrollY - scrollH / 2, scrollW, scrollH, 15);
    ctx.fill();

    // Recipe text
    const recipe = this.currentRecipe;
    const colorName = BERRY_COLORS[recipe.colorIndex].name;
    const colorHex = BERRY_COLORS[recipe.colorIndex].hex;

    // Main text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 38px system-ui';

    // Draw colored dot before the text
    const dotX = scrollX - 160;
    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.arc(dotX, scrollY - 5, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = BERRY_COLORS[recipe.colorIndex].dark;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Recipe text: "{count} {COLOR} berries!"
    const text = `${recipe.count} ${colorName} berries!`;
    ctx.fillStyle = '#3E2723';
    ctx.fillText(text, scrollX + 20, scrollY - 5);

    // Progress: "2/3"
    ctx.font = 'bold 28px system-ui';
    ctx.fillStyle = '#8B6914';
    ctx.fillText(`${this.collectedCount}/${recipe.count}`, scrollX, scrollY + 32);

    // Progress dots
    const dotSpacing = 24;
    const dotsStartX = scrollX - ((recipe.count - 1) * dotSpacing) / 2 + 100;
    for (let i = 0; i < recipe.count; i++) {
      const dx = dotsStartX + i * dotSpacing;
      const dy = scrollY + 32;
      ctx.beginPath();
      ctx.arc(dx, dy, 6, 0, Math.PI * 2);
      if (i < this.collectedCount) {
        ctx.fillStyle = colorHex;
        ctx.fill();
      } else {
        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Utility: Rounded Rectangle Path
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
