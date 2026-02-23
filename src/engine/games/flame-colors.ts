// src/engine/games/flame-colors.ts
// Mini-game 1: Flame Colors — Color Recognition
//
// MCX hovers in a dark sky. Colored blobs drift across the screen.
// A colored flame appears near Charizard's mouth to indicate the target color.
// The player taps the matching colored blob. Charizard blasts it with fire breath,
// the blob explodes in colored sparks, and everyone celebrates.
//
// Dual difficulty:
//   Owen (little): 2 targets, primary colors, subtle hint pulse, slow drift
//   Kian (big):    3-4 targets, extended palette, no hints, faster drift
//
// Fail-safe:
//   1 miss  -> correct target gently bounces
//   2 misses -> correct target glows + bounces
//   3 misses -> auto-complete with celebration

import type { GameScreen, GameContext } from '../screen-manager';
import { Background } from '../entities/backgrounds';
import { ParticlePool } from '../entities/particles';
import { Charizard } from '../entities/charizard';
import { TweenManager, easing } from '../utils/tween';
import {
  type Target,
  createTarget,
  updateTarget,
  renderTarget,
  isTargetHit,
  spreadTargets,
} from '../entities/targets';
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
  TARGET_SIZE,
  PROMPT_TIMEOUT,
  FAILSAFE_HINT_1,
  FAILSAFE_HINT_2,
  FAILSAFE_AUTO,
} from '../../config/constants';
import { theme } from '../../config/theme';
import { session } from '../../state/session.svelte';
import { randomRange } from '../utils/math';

// ---------------------------------------------------------------------------
// Constants local to this game
// ---------------------------------------------------------------------------

/** Time (seconds) to linger on the celebration before moving to the next prompt */
const CELEBRATION_LINGER = 1.4;

/** Duration of the fire-breath beam animation */
const BEAM_DURATION = 0.35;

/** Charizard positioning — left side, slightly elevated */
const CHAR_X = DESIGN_WIDTH * 0.14;
const CHAR_Y = DESIGN_HEIGHT * 0.52;
const CHAR_SCALE = 0.55;

/** Flame indicator position (near the mouth) */
const FLAME_INDICATOR_X = DESIGN_WIDTH * 0.26;
const FLAME_INDICATOR_Y = DESIGN_HEIGHT * 0.36;

// Flame particle palette for the breath beam
const BEAM_COLORS = ['#FFFFFF', '#FFE066', '#FF9933', '#FF5533'];

// ---------------------------------------------------------------------------
// FlameColorsGame
// ---------------------------------------------------------------------------

export class FlameColorsGame implements GameScreen {
  // Sub-systems (each game gets its own instances)
  private bg = new Background();
  private particles = new ParticlePool();
  private tweens = new TweenManager();
  private charizard = new Charizard(this.particles, this.tweens);
  private gameContext!: GameContext;

  // Game state
  private targets: Target[] = [];
  private currentColor: ColorItem | null = null;
  private promptsRemaining = 0;
  private missCount = 0;
  private timeSinceInput = 0;
  private roundComplete = false;
  private waitingForNext = false;
  private celebrationTimer = 0;
  private inputLocked = false; // lock during beam / celebration

  // Fire-breath beam state
  private beamActive = false;
  private beamTimer = 0;
  private beamTarget: { x: number; y: number; color: string } | null = null;

  // Flame indicator animation
  private flameIndicatorScale = 0;

  // Color name text float animation
  private colorTextAlpha = 0;
  private colorTextScale = 0;

  // Screen shake
  private shakeIntensity = 0;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  enter(ctx: GameContext): void {
    this.gameContext = ctx;
    this.particles.clear();
    this.tweens.clear();
    this.charizard.setPose('fly');
    this.promptsRemaining = PROMPTS_PER_ROUND.flameColors;
    this.roundComplete = false;
    this.waitingForNext = false;
    this.inputLocked = false;
    this.beamActive = false;
    this.shakeIntensity = 0;

    // Brief pause then first prompt
    setTimeout(() => this.nextPrompt(), 600);
  }

  exit(): void {
    this.particles.clear();
    this.tweens.clear();
    this.gameContext.events.emit({ type: 'hide-prompt' });
    this.gameContext.events.emit({ type: 'hide-banner' });
  }

  // -------------------------------------------------------------------------
  // Difficulty helpers
  // -------------------------------------------------------------------------

  private getDifficulty() {
    return session.currentTurn === 'owen'
      ? colorDifficulty.little
      : colorDifficulty.big;
  }

  private getAvailableColors(): ColorItem[] {
    const diff = this.getDifficulty();
    return diff.useSet === 'primary' ? primaryColors : allColors;
  }

  // -------------------------------------------------------------------------
  // Prompt flow
  // -------------------------------------------------------------------------

  private nextPrompt(): void {
    if (this.promptsRemaining <= 0) {
      this.roundComplete = true;
      // Bump activities completed for session tracking
      session.activitiesCompleted++;
      this.gameContext.events.emit({ type: 'show-game-end', allowReplay: true });
      return;
    }

    // Advance turn
    const turn = session.nextTurn();
    session.currentTurn = turn;
    this.gameContext.events.emit({ type: 'show-banner', turn });

    const diff = this.getDifficulty();
    const available = this.getAvailableColors();

    // Pick a random color for this prompt (avoid repeating last if possible)
    let pick: ColorItem;
    if (available.length > 1 && this.currentColor) {
      const filtered = available.filter(c => c.name !== this.currentColor!.name);
      pick = filtered[Math.floor(Math.random() * filtered.length)];
    } else {
      pick = available[Math.floor(Math.random() * available.length)];
    }
    this.currentColor = pick;

    // Create targets
    this.targets = [];

    // One correct target
    this.targets.push(
      createTarget(pick.hex, pick.name, TARGET_SIZE / 2, diff.driftSpeed),
    );

    // Wrong targets — pick distinct colors
    const wrongPool = available.filter(c => c.name !== pick.name);
    const shuffled = [...wrongPool].sort(() => Math.random() - 0.5);
    const wrongCount = diff.targetCount - 1;
    for (let i = 0; i < wrongCount; i++) {
      const wrong = shuffled[i % shuffled.length];
      this.targets.push(
        createTarget(wrong.hex, wrong.name, TARGET_SIZE / 2, diff.driftSpeed),
      );
    }

    // Spread targets so they don't overlap
    spreadTargets(this.targets);

    // Shuffle array so correct target isn't always index 0 visually
    this.targets.sort(() => Math.random() - 0.5);

    // Set hint on correct target if Owen's turn
    if (diff.showHint) {
      const correct = this.targets.find(t => t.colorName === pick.name);
      if (correct) correct.hintLevel = 1;
    }

    // Emit prompt event for any overlay UI
    this.gameContext.events.emit({
      type: 'show-prompt',
      promptType: 'color',
      value: pick.name,
      icon: 'flame',
    });

    // Reset per-prompt state
    this.missCount = 0;
    this.timeSinceInput = 0;
    this.waitingForNext = false;
    this.inputLocked = false;
    this.beamActive = false;
    this.promptsRemaining--;

    // Animate flame indicator appearing
    this.flameIndicatorScale = 0;
    this.tweens.add({
      from: 0,
      to: 1,
      duration: 0.35,
      easing: easing.easeOutBack,
      onUpdate: (v) => { this.flameIndicatorScale = v; },
    });

    // Color text pop
    this.colorTextAlpha = 0;
    this.colorTextScale = 0;
    this.tweens.add({
      from: 0,
      to: 1,
      duration: 0.4,
      easing: easing.easeOutBack,
      onUpdate: (v) => {
        this.colorTextAlpha = v;
        this.colorTextScale = v;
      },
    });

    // Charizard roar briefly then idle-fly
    this.charizard.setPose('roar');
    setTimeout(() => this.charizard.setPose('fly'), 700);

    // Hide banner after delay
    setTimeout(() => this.gameContext.events.emit({ type: 'hide-banner' }), 2000);
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  update(dt: number): void {
    this.bg.update(dt);
    this.particles.update(dt);
    this.tweens.update(dt);
    this.charizard.update(dt);

    // Update all targets
    for (const t of this.targets) updateTarget(t, dt);

    // Screen shake decay
    if (this.shakeIntensity > 0) {
      this.shakeIntensity *= 0.88;
      if (this.shakeIntensity < 0.3) this.shakeIntensity = 0;
      this.shakeOffsetX = randomRange(-this.shakeIntensity, this.shakeIntensity);
      this.shakeOffsetY = randomRange(-this.shakeIntensity, this.shakeIntensity);
    }

    // Fire-breath beam update
    if (this.beamActive) {
      this.beamTimer += dt;
      // Spawn beam particles along the line from charizard mouth to target
      if (this.beamTarget) {
        const progress = Math.min(this.beamTimer / BEAM_DURATION, 1);
        const bx = FLAME_INDICATOR_X + (this.beamTarget.x - FLAME_INDICATOR_X) * progress;
        const by = FLAME_INDICATOR_Y + (this.beamTarget.y - FLAME_INDICATOR_Y) * progress;
        // Dense particle stream
        for (let i = 0; i < 6; i++) {
          const spread = 25 * (1 - progress * 0.5);
          this.particles.spawn({
            x: bx + randomRange(-spread, spread),
            y: by + randomRange(-spread, spread),
            vx: randomRange(-60, 60),
            vy: randomRange(-60, 60),
            color: BEAM_COLORS[Math.floor(Math.random() * BEAM_COLORS.length)],
            size: randomRange(4, 12),
            lifetime: randomRange(0.2, 0.5),
            drag: 0.92,
            fadeOut: true,
            shrink: true,
          });
        }
        // Also spawn colored particles matching the target color
        if (Math.random() < 0.5) {
          this.particles.spawn({
            x: bx + randomRange(-20, 20),
            y: by + randomRange(-20, 20),
            vx: randomRange(-40, 40),
            vy: randomRange(-80, -20),
            color: this.beamTarget.color,
            size: randomRange(3, 8),
            lifetime: randomRange(0.3, 0.6),
            drag: 0.94,
            fadeOut: true,
            shrink: true,
          });
        }
      }
      if (this.beamTimer >= BEAM_DURATION) {
        this.beamActive = false;
      }
    }

    // Waiting for celebration to finish
    if (this.waitingForNext) {
      this.celebrationTimer -= dt;

      // Ambient celebration sparks
      if (this.currentColor && Math.random() < 0.4) {
        this.particles.spawn({
          x: randomRange(300, DESIGN_WIDTH - 300),
          y: randomRange(200, DESIGN_HEIGHT - 200),
          vx: randomRange(-30, 30),
          vy: randomRange(-80, -30),
          color: this.currentColor.hex,
          size: randomRange(2, 6),
          lifetime: randomRange(0.4, 0.8),
          drag: 0.96,
          fadeOut: true,
          shrink: true,
        });
      }

      if (this.celebrationTimer <= 0) {
        this.nextPrompt();
      }
      return;
    }

    if (this.roundComplete) return;

    // Timeout logic — auto-complete if player takes too long
    if (!this.inputLocked) {
      this.timeSinceInput += dt;
      if (this.timeSinceInput >= PROMPT_TIMEOUT) {
        this.autoComplete();
      }
    }

    // Ambient flame embers near Charizard
    if (Math.random() < 0.15) {
      this.particles.flame(
        CHAR_X + 40,
        CHAR_Y - 20,
        1,
        [theme.palette.fire.mid, theme.palette.fire.spark],
        25,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Correct / Wrong / Auto-complete handlers
  // -------------------------------------------------------------------------

  private handleCorrect(target: Target): void {
    this.inputLocked = true;

    // Start fire-breath beam animation
    this.beamActive = true;
    this.beamTimer = 0;
    this.beamTarget = { x: target.x, y: target.y, color: target.color };

    // Charizard attack pose
    this.charizard.setPose('attack');

    // After beam reaches target — explode!
    setTimeout(() => {
      // Trigger pop animation on target
      target.popping = true;
      target.popTimer = 0;

      // MASSIVE colored explosion (juicy!)
      this.particles.burst(target.x, target.y, 60, target.color, 280, 1.2);
      // Secondary white core burst
      this.particles.burst(target.x, target.y, 20, '#ffffff', 150, 0.6);
      // Tertiary spark ring
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const dist = 80;
        this.particles.spawn({
          x: target.x + Math.cos(angle) * dist,
          y: target.y + Math.sin(angle) * dist,
          vx: Math.cos(angle) * 200,
          vy: Math.sin(angle) * 200,
          color: target.color,
          size: randomRange(6, 14),
          lifetime: 0.8,
          gravity: 60,
          drag: 0.95,
          fadeOut: true,
          shrink: true,
        });
      }

      // Screen shake for impact
      this.shakeIntensity = 12;

      // Celebration event
      this.gameContext.events.emit({
        type: 'celebration',
        intensity: session.currentTurn === 'team' ? 'hype' : 'normal',
      });
      this.gameContext.events.emit({ type: 'hide-prompt' });

      // Charizard back to fly after a beat
      setTimeout(() => this.charizard.setPose('fly'), 600);

      // Wait then move to next prompt
      this.waitingForNext = true;
      this.celebrationTimer = CELEBRATION_LINGER;
    }, BEAM_DURATION * 1000);
  }

  private handleWrong(target: Target): void {
    this.missCount++;
    this.timeSinceInput = 0;

    // Feedback: small red-ish "nope" burst on wrong target
    this.particles.burst(target.x, target.y, 8, theme.palette.ui.incorrect, 60, 0.4);

    // Brief shake (subtle — not punishing)
    this.shakeIntensity = 4;

    // Escalate hints on the correct target
    const correctTarget = this.targets.find(
      t => t.colorName === this.currentColor?.name && t.alive && !t.popping,
    );
    if (correctTarget) {
      if (this.missCount >= FAILSAFE_HINT_2) {
        correctTarget.hintLevel = 2;
      } else if (this.missCount >= FAILSAFE_HINT_1) {
        correctTarget.hintLevel = 1;
      }
    }

    // Auto-complete after too many misses
    if (this.missCount >= FAILSAFE_AUTO) {
      this.autoComplete();
    }
  }

  private autoComplete(): void {
    const correctTarget = this.targets.find(
      t => t.colorName === this.currentColor?.name && t.alive && !t.popping,
    );
    if (correctTarget) {
      this.handleCorrect(correctTarget);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Apply screen shake
    if (this.shakeIntensity > 0) {
      ctx.translate(this.shakeOffsetX, this.shakeOffsetY);
    }

    // Background
    this.bg.render(ctx);

    // Warm atmospheric glow behind Charizard
    const atmoGlow = ctx.createRadialGradient(
      CHAR_X + 60, CHAR_Y - 40, 30,
      CHAR_X + 60, CHAR_Y - 40, 350,
    );
    atmoGlow.addColorStop(0, 'rgba(55, 177, 226, 0.15)');
    atmoGlow.addColorStop(0.5, 'rgba(55, 177, 226, 0.05)');
    atmoGlow.addColorStop(1, 'rgba(55, 177, 226, 0)');
    ctx.fillStyle = atmoGlow;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Draw Charizard
    this.charizard.render(ctx, CHAR_X, CHAR_Y, CHAR_SCALE);

    // Fire-breath beam (drawn as a glowing line + particles handle the rest)
    if (this.beamActive && this.beamTarget) {
      const progress = Math.min(this.beamTimer / BEAM_DURATION, 1);
      const endX = FLAME_INDICATOR_X + (this.beamTarget.x - FLAME_INDICATOR_X) * progress;
      const endY = FLAME_INDICATOR_Y + (this.beamTarget.y - FLAME_INDICATOR_Y) * progress;

      // Glowing beam line
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = this.beamTarget.color;
      ctx.lineWidth = 18;
      ctx.shadowColor = this.beamTarget.color;
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.moveTo(FLAME_INDICATOR_X, FLAME_INDICATOR_Y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // White core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(FLAME_INDICATOR_X, FLAME_INDICATOR_Y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();
    }

    // Draw targets
    for (const t of this.targets) renderTarget(ctx, t);

    // Particles on top of everything
    this.particles.render(ctx);

    // Color flame indicator near Charizard's mouth
    if (this.currentColor && !this.waitingForNext && !this.roundComplete) {
      this.renderFlameIndicator(ctx);
    }

    // Color name text (floating above the flame indicator)
    if (this.currentColor && !this.waitingForNext && !this.roundComplete && this.colorTextAlpha > 0) {
      this.renderColorNameText(ctx);
    }

    ctx.restore();
  }

  /** Render the colored flame indicator near Charizard's mouth */
  private renderFlameIndicator(ctx: CanvasRenderingContext2D): void {
    if (!this.currentColor) return;

    const s = this.flameIndicatorScale;
    if (s <= 0) return;

    const x = FLAME_INDICATOR_X;
    const y = FLAME_INDICATOR_Y;
    const baseR = 45 * s;

    // Pulsing animation
    const pulse = 1 + 0.08 * Math.sin(Date.now() * 0.005);
    const r = baseR * pulse;

    // Outer glow
    ctx.save();
    ctx.shadowColor = this.currentColor.hex;
    ctx.shadowBlur = 40 * s;
    const outerGrad = ctx.createRadialGradient(x, y, r * 0.1, x, y, r * 1.6);
    outerGrad.addColorStop(0, this.currentColor.hex + 'cc');
    outerGrad.addColorStop(0.5, this.currentColor.hex + '55');
    outerGrad.addColorStop(1, this.currentColor.hex + '00');
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Core flame
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.35, this.currentColor.hex);
    coreGrad.addColorStop(1, this.currentColor.hex + '00');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Spawn ambient flame particles from the indicator
    if (Math.random() < 0.4) {
      this.particles.spawn({
        x: x + randomRange(-15, 15),
        y: y + randomRange(-10, 5),
        vx: randomRange(-15, 15),
        vy: randomRange(-50, -20),
        color: this.currentColor.hex,
        size: randomRange(2, 6),
        lifetime: randomRange(0.2, 0.5),
        drag: 0.95,
        fadeOut: true,
        shrink: true,
      });
    }
  }

  /** Render the color name text floating above the flame indicator */
  private renderColorNameText(ctx: CanvasRenderingContext2D): void {
    if (!this.currentColor) return;

    const x = FLAME_INDICATOR_X;
    const y = FLAME_INDICATOR_Y - 90;
    const s = this.colorTextScale;

    ctx.save();
    ctx.globalAlpha = this.colorTextAlpha;
    ctx.font = `bold ${Math.round(56 * s)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text shadow/outline for readability
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeText(this.currentColor.name.toUpperCase(), x, y);

    // Fill with the actual color
    ctx.fillStyle = this.currentColor.hex;
    ctx.fillText(this.currentColor.name.toUpperCase(), x, y);

    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // Input
  // -------------------------------------------------------------------------

  handleClick(x: number, y: number): void {
    if (this.roundComplete || this.waitingForNext || this.inputLocked) return;
    this.timeSinceInput = 0;

    for (const t of this.targets) {
      if (isTargetHit(t, x, y)) {
        if (t.colorName === this.currentColor?.name) {
          this.handleCorrect(t);
        } else {
          this.handleWrong(t);
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
