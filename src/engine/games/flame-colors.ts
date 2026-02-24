// src/engine/games/flame-colors.ts
// Mini-game 1: Dragon Gem Hunt — Color Recognition
//
// MCX sprite hovers in the top-right corner. Colored gem targets appear on screen.
// Voice says "Red. Find red!" — player taps the matching gem.
// Educational voice follows the Three-Label Rule throughout.
//
// Owen (2.5yo): 2 choices, primary colors, 200px gems, stable positions, glow hints
// Kian (4yo):   3-4 choices, extended palette, 160px gems, gentle drift, speed rounds
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
import {
  primaryColors,
  allColors,
  colorDifficulty,
  type ColorItem,
} from '../../content/colors';
import {
  DESIGN_WIDTH,
  DESIGN_HEIGHT,
  PROMPTS_PER_ROUND,
} from '../../config/constants';
import { session } from '../../state/session.svelte';
import { settings } from '../../state/settings.svelte';
import { randomRange } from '../utils/math';
import { evolutionSpriteKey, evolutionSpriteScale } from '../utils/evolution-sprite';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROMPTS_TOTAL = PROMPTS_PER_ROUND.flameColors; // 5
const BANNER_DURATION = 1.5;
const ENGAGE_DURATION = 1.0;
const CELEBRATE_DURATION = 1.2;

/** MCX sprite position (top-right corner, centered in visible area) */
const SPRITE_X = DESIGN_WIDTH - 260;
const SPRITE_Y = 180;

/** Gem radius per difficulty */
const GEM_RADIUS_OWEN = 100; // 200px diameter
const GEM_RADIUS_KIAN = 80;  // 160px diameter

/** Success echo celebrations */
const SUCCESS_ECHOES = ['flame!', 'gem!', 'power!'];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GemTarget {
  x: number;
  y: number;
  color: string;       // hex
  colorName: string;
  radius: number;
  alive: boolean;
  dimmed: boolean;
  bobPhase: number;
  sparklePhase: number;
  vx: number;          // drift velocity (0 for Owen)
  vy: number;
}

type GamePhase = 'banner' | 'engage' | 'prompt' | 'play' | 'celebrate' | 'next';

// ---------------------------------------------------------------------------
// FlameColorsGame (Dragon Gem Hunt)
// ---------------------------------------------------------------------------

export class FlameColorsGame implements GameScreen {
  // New systems
  private bg = new Background();
  private particles = new ParticlePool();
  private sprite!: SpriteAnimator;
  private spriteScale = 3;
  private hintLadder = new HintLadder();
  private flameMeter = new FlameMeter();
  private voice!: VoiceSystem;
  private gameContext!: GameContext;

  // Game state
  private phase: GamePhase = 'banner';
  private phaseTimer = 0;
  private gems: GemTarget[] = [];
  private currentColor: ColorItem | null = null;
  private promptIndex = 0;
  private consecutiveCorrect = 0;
  private inputLocked = true;
  private lastColorName = '';

  // Audio shortcut
  private get audio() { return this.gameContext.audio; }

  // Difficulty helpers
  private get isOwen(): boolean { return session.currentTurn === 'owen'; }
  private get difficulty() {
    return this.isOwen ? colorDifficulty.little : colorDifficulty.big;
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  enter(ctx: GameContext): void {
    this.gameContext = ctx;
    setActivePool(this.particles);
    this.particles.clear();
    this.promptIndex = 0;
    this.consecutiveCorrect = 0;
    this.lastColorName = '';
    this.inputLocked = true;

    // Dynamic corner sprite for current evolution stage
    this.sprite = new SpriteAnimator(SPRITES[evolutionSpriteKey()]);
    this.spriteScale = evolutionSpriteScale();

    // Create voice system
    if (this.audio) {
      this.voice = new VoiceSystem(this.audio);
    }

    // Start first prompt cycle
    this.startBanner();
  }

  exit(): void {
    this.particles.clear();
    this.gameContext.events.emit({ type: 'hide-banner' });
  }

  // -----------------------------------------------------------------------
  // Phase transitions
  // -----------------------------------------------------------------------

  private startBanner(): void {
    if (this.promptIndex >= PROMPTS_TOTAL) {
      this.endRound();
      return;
    }

    // Alternate turns
    const turn = session.nextTurn();
    session.currentTurn = turn;

    this.phase = 'banner';
    this.phaseTimer = 0;
    this.inputLocked = true;
    this.gems = [];

    // Show banner overlay
    this.gameContext.events.emit({ type: 'show-banner', turn });

    // Narrate intro on first prompt
    if (this.promptIndex === 0) {
      this.voice?.narrate('Help tune my flame!');
    }
  }

  private startEngage(): void {
    this.phase = 'engage';
    this.phaseTimer = 0;

    this.gameContext.events.emit({ type: 'hide-banner' });

    // Pre-prompt engagement (Three-Label Rule step 1)
    const name = this.isOwen ? settings.littleTrainerName : settings.bigTrainerName;
    const action = this.isOwen ? 'point' : 'find it';
    this.voice?.engage(name, action);
  }

  private startPrompt(): void {
    this.phase = 'prompt';
    this.phaseTimer = 0;

    // Pick target color
    this.pickColor();
    this.createGems();

    // Initialize hint ladder
    this.hintLadder.startPrompt(this.currentColor!.name);

    // Three-Label Rule step 2: "Red. Find red!"
    const colorName = this.currentColor!.name;
    this.voice?.prompt(colorName, `Find ${colorName}!`);

    // SFX pop
    this.audio?.playSynth('pop');

    // Transition to play phase after voice finishes (~0.8s)
    setTimeout(() => {
      if (this.phase === 'prompt') {
        this.startPlay();
      }
    }, 800);
  }

  private startPlay(): void {
    this.phase = 'play';
    this.phaseTimer = 0;
    this.inputLocked = false;
  }

  private startCelebrate(): void {
    this.phase = 'celebrate';
    this.phaseTimer = 0;
    this.inputLocked = true;

    // Celebration event for overlay
    this.gameContext.events.emit({
      type: 'celebration',
      intensity: 'normal',
    });
  }

  private startNext(): void {
    this.phase = 'next';
    this.promptIndex++;

    // Check if more prompts or end
    if (this.promptIndex >= PROMPTS_TOTAL) {
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
  // Color & gem creation
  // -----------------------------------------------------------------------

  private pickColor(): void {
    const available = this.difficulty.useSet === 'primary' ? primaryColors : allColors;

    // Check for spaced repetition concepts
    const repeats = tracker.getRepeatConcepts('color');
    let pick: ColorItem | undefined;

    if (repeats.length > 0) {
      // Try to revisit a previously-missed color
      pick = available.find(c => repeats.includes(c.name));
      if (pick) {
        tracker.markRepeated(pick.name, 'color');
      }
    }

    if (!pick) {
      // Pick random, avoiding repeat of last color
      const pool = available.length > 1
        ? available.filter(c => c.name !== this.lastColorName)
        : available;
      pick = pool[Math.floor(Math.random() * pool.length)];
    }

    this.currentColor = pick;
    this.lastColorName = pick.name;
  }

  private createGems(): void {
    const diff = this.difficulty;
    const available = diff.useSet === 'primary' ? primaryColors : allColors;
    this.gems = [];

    const radius = this.isOwen ? GEM_RADIUS_OWEN : GEM_RADIUS_KIAN;

    // Correct gem
    this.gems.push(this.makeGem(this.currentColor!, radius));

    // Wrong gems
    const wrongPool = available.filter(c => c.name !== this.currentColor!.name);
    const shuffled = [...wrongPool].sort(() => Math.random() - 0.5);
    const wrongCount = diff.targetCount - 1;
    for (let i = 0; i < wrongCount; i++) {
      const wrong = shuffled[i % shuffled.length];
      this.gems.push(this.makeGem(wrong, radius));
    }

    // Shuffle so correct isn't always first
    this.gems.sort(() => Math.random() - 0.5);

    // Position gems
    this.positionGems();
  }

  private makeGem(item: ColorItem, radius: number): GemTarget {
    const driftSpeed = this.isOwen ? 0 : this.difficulty.driftSpeed * 0.3;
    return {
      x: 0, y: 0,
      color: item.hex,
      colorName: item.name,
      radius,
      alive: true,
      dimmed: false,
      bobPhase: randomRange(0, Math.PI * 2),
      sparklePhase: randomRange(0, Math.PI * 2),
      vx: randomRange(-driftSpeed, driftSpeed),
      vy: randomRange(-driftSpeed * 0.5, driftSpeed * 0.5),
    };
  }

  private positionGems(): void {
    const count = this.gems.length;
    // Center gems in the lower 2/3 of the screen, spread horizontally
    const centerY = DESIGN_HEIGHT * 0.55;
    const totalWidth = (count - 1) * 400;
    const startX = (DESIGN_WIDTH - totalWidth) / 2;

    for (let i = 0; i < count; i++) {
      const gem = this.gems[i];
      if (count <= 2) {
        // Owen: 2 gems, 400px apart, centered
        gem.x = DESIGN_WIDTH / 2 + (i === 0 ? -200 : 200);
        gem.y = centerY;
      } else {
        // Kian: spread evenly
        gem.x = startX + i * 400;
        gem.y = centerY + randomRange(-40, 40);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Hit detection
  // -----------------------------------------------------------------------

  private isGemHit(gem: GemTarget, x: number, y: number): boolean {
    const dx = x - gem.x;
    const dy = y - gem.y;
    // Generous hit area: radius + 25px
    return dx * dx + dy * dy <= (gem.radius + 25) * (gem.radius + 25);
  }

  // -----------------------------------------------------------------------
  // Correct / Wrong / Auto-complete
  // -----------------------------------------------------------------------

  private handleCorrect(gem: GemTarget, hinted: boolean): void {
    this.inputLocked = true;
    gem.alive = false;

    const colorName = gem.colorName;

    // Record in tracker
    tracker.recordAnswer(colorName, 'color', true);

    // FlameMeter charge
    const charge = hinted ? 1 : 2;
    this.flameMeter.addCharge(charge);

    // Consecutive correct tracking (for Kian speed rounds)
    this.consecutiveCorrect++;

    // Audio
    this.audio?.playSynth('correct-chime');

    // Three-Label Rule step 3: success echo "Red! Red flame!"
    const echo = SUCCESS_ECHOES[Math.floor(Math.random() * SUCCESS_ECHOES.length)];
    this.voice?.successEcho(colorName, `${colorName} ${echo}`);

    // Particles: colored burst at gem position
    this.particles.burst(gem.x, gem.y, 40, gem.color, 200, 1.0);
    // White core burst
    this.particles.burst(gem.x, gem.y, 15, '#ffffff', 120, 0.5);

    this.startCelebrate();
  }

  private handleWrong(gem: GemTarget): void {
    const colorName = this.currentColor!.name;

    // Record in tracker
    tracker.recordAnswer(colorName, 'color', false);

    // Reset consecutive correct
    this.consecutiveCorrect = 0;

    // Dim the wrong gem visually
    gem.dimmed = true;

    // Audio
    this.audio?.playSynth('wrong-bonk');

    // Three-Label Rule step 4: "That's blue. Find red!"
    this.voice?.wrongRedirect(gem.colorName, colorName);

    // Escalate hint ladder
    const newLevel = this.hintLadder.onMiss();

    // Check for auto-complete
    if (this.hintLadder.autoCompleted) {
      this.autoComplete();
    }
  }

  private autoComplete(): void {
    const correctGem = this.gems.find(
      g => g.colorName === this.currentColor?.name && g.alive,
    );
    if (!correctGem) return;

    // Record as auto-complete
    tracker.recordAnswer(this.currentColor!.name, 'color', true);
    this.flameMeter.addCharge(0.5);

    correctGem.alive = false;

    // Gentler celebration
    this.audio?.playSynth('pop');
    this.voice?.successEcho(this.currentColor!.name);
    this.particles.burst(correctGem.x, correctGem.y, 20, correctGem.color, 120, 0.8);

    this.startCelebrate();
  }

  // -----------------------------------------------------------------------
  // Update
  // -----------------------------------------------------------------------

  update(dt: number): void {
    this.bg.update(dt);
    this.particles.update(dt);
    this.sprite.update(dt);
    this.flameMeter.update(dt);
    this.phaseTimer += dt;

    switch (this.phase) {
      case 'banner':
        if (this.phaseTimer >= BANNER_DURATION) {
          this.startEngage();
        }
        break;

      case 'engage':
        if (this.phaseTimer >= ENGAGE_DURATION) {
          this.startPrompt();
        }
        break;

      case 'prompt':
        this.updateGems(dt);
        break;

      case 'play':
        this.updateGems(dt);
        this.updateHints(dt);
        break;

      case 'celebrate':
        // Ambient celebration sparks
        if (this.currentColor && Math.random() < 0.3) {
          this.particles.spawn({
            x: randomRange(200, DESIGN_WIDTH - 200),
            y: randomRange(200, DESIGN_HEIGHT - 200),
            vx: randomRange(-30, 30),
            vy: randomRange(-60, -20),
            color: this.currentColor.hex,
            size: randomRange(2, 6),
            lifetime: randomRange(0.3, 0.7),
            drag: 0.96,
            fadeOut: true,
            shrink: true,
          });
        }
        if (this.phaseTimer >= CELEBRATE_DURATION) {
          this.startNext();
        }
        break;
    }
  }

  private updateGems(dt: number): void {
    for (const gem of this.gems) {
      if (!gem.alive) continue;

      // Bob animation
      gem.bobPhase += dt * 1.5;
      gem.sparklePhase += dt * 2.0;

      // Drift (Kian only — Owen has vx/vy = 0)
      gem.x += gem.vx * dt;
      gem.y += gem.vy * dt;

      // Bounce off screen edges
      const margin = gem.radius + 30;
      const left = margin;
      const right = DESIGN_WIDTH - margin;
      const top = DESIGN_HEIGHT * 0.2;
      const bottom = DESIGN_HEIGHT * 0.85;

      if (gem.x < left) { gem.x = left; gem.vx = Math.abs(gem.vx); }
      if (gem.x > right) { gem.x = right; gem.vx = -Math.abs(gem.vx); }
      if (gem.y < top) { gem.y = top; gem.vy = Math.abs(gem.vy); }
      if (gem.y > bottom) { gem.y = bottom; gem.vy = -Math.abs(gem.vy); }
    }
  }

  private updateHints(dt: number): void {
    const escalated = this.hintLadder.update(dt);

    if (escalated) {
      const level = this.hintLadder.hintLevel;

      // Level 1: voice repeat
      if (level === 1 && this.currentColor) {
        this.voice?.hintRepeat(this.currentColor.name);
      }
    }

    // Check auto-complete from timeout escalation
    if (this.hintLadder.autoCompleted && !this.inputLocked) {
      this.inputLocked = true;
      this.autoComplete();
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  render(ctx: CanvasRenderingContext2D): void {
    // Background
    this.bg.render(ctx);

    // Dim background during play phase to highlight choices
    if (this.phase === 'play' || this.phase === 'prompt') {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
      ctx.restore();
    }

    // MCX sprite in top-right corner
    this.sprite.render(ctx, SPRITE_X, SPRITE_Y, this.spriteScale);

    // Warm glow behind sprite
    const glowGrad = ctx.createRadialGradient(SPRITE_X, SPRITE_Y, 20, SPRITE_X, SPRITE_Y, 200);
    glowGrad.addColorStop(0, 'rgba(55, 177, 226, 0.12)');
    glowGrad.addColorStop(1, 'rgba(55, 177, 226, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(SPRITE_X - 200, SPRITE_Y - 200, 400, 400);

    // Draw gem targets
    for (const gem of this.gems) {
      if (!gem.alive) continue;
      this.renderGem(ctx, gem);
    }

    // Hint level 3: draw line from sprite toward correct target
    if (this.phase === 'play' && this.hintLadder.hintLevel >= 3) {
      const correctGem = this.gems.find(
        g => g.colorName === this.currentColor?.name && g.alive,
      );
      if (correctGem) {
        this.renderHintLine(ctx, correctGem);
      }
    }

    // Particles
    this.particles.render(ctx);

    // Flame meter at top
    this.flameMeter.render(ctx);

    // Color name label (during prompt/play phases)
    if (this.currentColor && (this.phase === 'prompt' || this.phase === 'play')) {
      this.renderColorLabel(ctx);
    }

    // Banner text during banner/engage phases
    if (this.phase === 'banner' || this.phase === 'engage') {
      this.renderPhaseText(ctx);
    }
  }

  private renderGem(ctx: CanvasRenderingContext2D, gem: GemTarget): void {
    ctx.save();

    if (gem.dimmed) {
      ctx.globalAlpha = 0.35;
    }

    const yOffset = Math.sin(gem.bobPhase) * 6;
    const gx = gem.x;
    const gy = gem.y + yOffset;
    const r = gem.radius;

    // Hint level 2+: pulsing glow on correct gem
    const isCorrect = gem.colorName === this.currentColor?.name;
    const hintGlow = isCorrect && this.hintLadder.hintLevel >= 2;

    if (hintGlow) {
      const pulse = 1 + Math.sin(gem.bobPhase * 3) * 0.15;
      // Bright glow halo
      ctx.save();
      ctx.shadowColor = '#37B1E2';
      ctx.shadowBlur = 30 * pulse;
      const haloGrad = ctx.createRadialGradient(gx, gy, r * 0.5, gx, gy, r * 1.8);
      haloGrad.addColorStop(0, '#37B1E2' + '66');
      haloGrad.addColorStop(1, '#37B1E2' + '00');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(gx, gy, r * 1.8 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Outer glow
    const outerGlow = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 1.6);
    outerGlow.addColorStop(0, gem.color + 'aa');
    outerGlow.addColorStop(0.5, gem.color + '44');
    outerGlow.addColorStop(1, gem.color + '00');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(gx, gy, r * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Main body gradient
    const bodyGrad = ctx.createRadialGradient(gx - r * 0.15, gy - r * 0.15, 0, gx, gy, r);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.2, '#ffffffcc');
    bodyGrad.addColorStop(0.6, gem.color);
    bodyGrad.addColorStop(1, this.darkenColor(gem.color, 0.5));
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(gx, gy, r, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight
    const specGrad = ctx.createRadialGradient(gx - r * 0.25, gy - r * 0.25, 0, gx - r * 0.15, gy - r * 0.15, r * 0.5);
    specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = specGrad;
    ctx.beginPath();
    ctx.arc(gx, gy, r, 0, Math.PI * 2);
    ctx.fill();

    // Sparkles
    const sparkleCount = 5;
    for (let i = 0; i < sparkleCount; i++) {
      const angle = gem.sparklePhase + (i / sparkleCount) * Math.PI * 2;
      const dist = r * 0.7;
      const sx = gx + Math.cos(angle) * dist;
      const sy = gy + Math.sin(angle) * dist;
      const size = 3 + Math.sin(gem.sparklePhase * 3 + i * 1.2) * 1.5;
      const alpha = 0.5 + Math.sin(gem.sparklePhase * 2 + i * 0.8) * 0.3;

      ctx.save();
      ctx.globalAlpha = (gem.dimmed ? 0.35 : 1) * alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Thick outline for chunky silhouette style
    ctx.strokeStyle = this.darkenColor(gem.color, 0.3);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(gx, gy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private renderHintLine(ctx: CanvasRenderingContext2D, gem: GemTarget): void {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#37B1E2';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(SPRITE_X, SPRITE_Y + 60);
    ctx.lineTo(gem.x, gem.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  private renderColorLabel(ctx: CanvasRenderingContext2D): void {
    if (!this.currentColor) return;

    const x = DESIGN_WIDTH / 2;
    const y = DESIGN_HEIGHT * 0.15;
    const text = `Find ${this.currentColor.name}!`;

    ctx.save();
    ctx.font = 'bold 72px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Outline for readability
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);

    // White fill (no color hint)
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(55, 177, 226, 0.5)';
    ctx.shadowBlur = 20;
    ctx.fillText(text, x, y);

    ctx.restore();
  }

  private renderPhaseText(ctx: CanvasRenderingContext2D): void {
    // Simple centered text during engage phase
    if (this.phase !== 'engage') return;

    const name = this.isOwen ? settings.littleTrainerName : settings.bigTrainerName;
    const text = `${name}, ${this.isOwen ? 'point!' : 'find it!'}`;

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

  /** Darken a hex color by a factor (0 = black, 1 = original) */
  private darkenColor(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return '#' + [
      Math.round(r * factor),
      Math.round(g * factor),
      Math.round(b * factor),
    ].map(c => c.toString(16).padStart(2, '0')).join('');
  }

  // -----------------------------------------------------------------------
  // Input
  // -----------------------------------------------------------------------

  handleClick(x: number, y: number): void {
    if (this.phase !== 'play' || this.inputLocked) return;

    for (const gem of this.gems) {
      if (!gem.alive || gem.dimmed) continue;
      if (this.isGemHit(gem, x, y)) {
        if (gem.colorName === this.currentColor?.name) {
          const hinted = this.hintLadder.hintLevel > 0;
          this.handleCorrect(gem, hinted);
        } else {
          this.handleWrong(gem);
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
}
