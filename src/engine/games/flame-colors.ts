// src/engine/games/flame-colors.ts
// Mini-game 1: Dragon Gem Hunt — Color Recognition
//
// MCX hovers in a dark sky. Colored gems float slowly across the screen.
// MCX holds up a colored flame indicator and says "Find the [COLOR] gem!"
// The player taps the matching gem. MCX breathes fire at the gem,
// the gem flies to MCX, particles burst, and everyone celebrates.
//
// Dual difficulty:
//   Owen (little): 2 gems, primary colors, hints, slow drift (10px/s)
//   Kian (big):    3-4 gems, extended palette, no hints, faster drift (20px/s)
//
// Fail-safe:
//   1 miss  -> correct gem gently bounces
//   2 misses -> correct gem glows + bounces
//   3 misses -> auto-complete with celebration

import type { GameScreen, GameContext } from '../screen-manager';
import { Background } from '../entities/backgrounds';
import { ParticlePool, setActivePool } from '../entities/particles';
import { Charizard } from '../entities/charizard';
import { TweenManager, easing } from '../utils/tween';
import { FeedbackSystem } from '../entities/feedback';
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
  FAILSAFE_HINT_1,
  FAILSAFE_HINT_2,
  FAILSAFE_AUTO,
} from '../../config/constants';
import { session } from '../../state/session.svelte';
import { randomRange } from '../utils/math';

// ---------------------------------------------------------------------------
// Constants local to this game
// ---------------------------------------------------------------------------

/** Time (seconds) to linger on the celebration before moving to the next prompt */
const CELEBRATION_LINGER = 1.4;

/** Duration of the fire-breath beam animation */
const BEAM_DURATION = 0.35;

/** Duration of the intro phase where MCX announces the color */
const INTRO_DURATION = 2.0;

/** Duration of the banner phase showing whose turn it is */
const BANNER_DURATION = 2.0;

/** Charizard positioning — left side, slightly elevated */
const CHAR_X = DESIGN_WIDTH * 0.14;
const CHAR_Y = DESIGN_HEIGHT * 0.52;
const CHAR_SCALE = 0.55;

/** Flame indicator position (near the mouth) */
const FLAME_INDICATOR_X = DESIGN_WIDTH * 0.26;
const FLAME_INDICATOR_Y = DESIGN_HEIGHT * 0.36;

/** Gem radius (120px diameter -> 60px radius) */
const GEM_RADIUS = 60;

// Flame particle palette for the breath beam
const BEAM_COLORS = ['#FFFFFF', '#FFE066', '#FF9933', '#FF5533'];

// ---------------------------------------------------------------------------
// Gem interface
// ---------------------------------------------------------------------------

interface Gem {
  x: number;
  y: number;
  color: string;       // hex color
  colorName: string;
  radius: number;       // 60 (120px diameter)
  vx: number;           // horizontal drift velocity
  vy: number;           // vertical drift velocity
  alive: boolean;
  dimmed: boolean;      // true after wrong click
  hintLevel: number;    // 0=none, 1=bounce, 2=glow+bounce
  bobPhase: number;     // gentle float phase
  sparklePhase: number; // sparkle animation phase
  scale: number;        // for pop-in/pop-out animation
}

// ---------------------------------------------------------------------------
// Game phases
// ---------------------------------------------------------------------------

type GamePhase = 'banner' | 'intro' | 'play' | 'beam' | 'celebrate' | 'complete';

// ---------------------------------------------------------------------------
// FlameColorsGame (Dragon Gem Hunt)
// ---------------------------------------------------------------------------

export class FlameColorsGame implements GameScreen {
  // Sub-systems (each game gets its own instances)
  private bg = new Background();
  private particles = new ParticlePool();
  private tweens = new TweenManager();
  private charizard = new Charizard(this.particles, this.tweens);
  private feedback = new FeedbackSystem(this.particles);
  private gameContext!: GameContext;

  // Game state
  private gems: Gem[] = [];
  private currentColor: ColorItem | null = null;
  private promptsRemaining = 0;
  private missCount = 0;
  private gemsCollected = 0;
  private inputLocked = false;

  // Phase management
  private phase: GamePhase = 'banner';
  private phaseTimer = 0;

  // Fire-breath beam state
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

  // Track last color to avoid repeats
  private lastColorName = '';

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  enter(ctx: GameContext): void {
    this.gameContext = ctx;
    setActivePool(this.particles);
    this.particles.clear();
    this.tweens.clear();
    this.charizard.setPose('fly');
    this.promptsRemaining = PROMPTS_PER_ROUND.flameColors;
    this.gemsCollected = 0;
    this.inputLocked = true;
    this.shakeIntensity = 0;
    this.phase = 'banner';
    this.lastColorName = '';

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
  // Gem creation
  // -------------------------------------------------------------------------

  private makeGem(hex: string, name: string, driftSpeed: number): Gem {
    // Halve the drift speed per the task spec (Owen 10px/s, Kian 20px/s)
    const speed = driftSpeed * 0.5;
    return {
      x: 0,
      y: 0,
      color: hex,
      colorName: name,
      radius: GEM_RADIUS,
      vx: randomRange(-speed, speed),
      vy: randomRange(-speed * 0.5, speed * 0.5),
      alive: true,
      dimmed: false,
      hintLevel: 0,
      bobPhase: randomRange(0, Math.PI * 2),
      sparklePhase: randomRange(0, Math.PI * 2),
      scale: 0, // will animate in
    };
  }

  private createGems(): void {
    const diff = this.getDifficulty();
    const available = this.getAvailableColors();

    // Pick target color — avoid repeating last
    let pick: ColorItem;
    if (available.length > 1 && this.lastColorName) {
      const filtered = available.filter(c => c.name !== this.lastColorName);
      pick = filtered[Math.floor(Math.random() * filtered.length)];
    } else {
      pick = available[Math.floor(Math.random() * available.length)];
    }
    this.currentColor = pick;
    this.lastColorName = pick.name;

    this.gems = [];

    // Correct gem
    this.gems.push(this.makeGem(pick.hex, pick.name, diff.driftSpeed));

    // Wrong gems
    const wrongPool = available.filter(c => c.name !== pick.name);
    const shuffled = [...wrongPool].sort(() => Math.random() - 0.5);
    const wrongCount = diff.targetCount - 1;
    for (let i = 0; i < wrongCount; i++) {
      const wrong = shuffled[i % shuffled.length];
      this.gems.push(this.makeGem(wrong.hex, wrong.name, diff.driftSpeed));
    }

    // Position gems spread across the right portion of screen
    this.spreadGems();

    // Animate gems popping in
    for (const gem of this.gems) {
      this.tweens.add({
        from: 0,
        to: 1,
        duration: 0.4,
        easing: easing.easeOutBack,
        onUpdate: (v) => { gem.scale = v; },
      });
    }
  }

  private spreadGems(): void {
    const startX = DESIGN_WIDTH * 0.35;
    const endX = DESIGN_WIDTH * 0.85;
    const startY = DESIGN_HEIGHT * 0.2;
    const endY = DESIGN_HEIGHT * 0.75;

    const rows = Math.ceil(this.gems.length / 2);
    for (let i = 0; i < this.gems.length; i++) {
      const gem = this.gems[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      gem.x = startX + (endX - startX) * (col + 0.5) / 2 + randomRange(-40, 40);
      gem.y = startY + (endY - startY) * (row + 0.5) / rows + randomRange(-30, 30);
    }

    // Shuffle so correct isn't always first
    this.gems.sort(() => Math.random() - 0.5);
  }

  // -------------------------------------------------------------------------
  // Hit detection
  // -------------------------------------------------------------------------

  private isGemHit(gem: Gem, x: number, y: number): boolean {
    const dx = x - gem.x;
    const dy = y - gem.y;
    // Generous hit area: radius + 20px
    return dx * dx + dy * dy <= (gem.radius + 20) * (gem.radius + 20);
  }

  // -------------------------------------------------------------------------
  // Prompt flow
  // -------------------------------------------------------------------------

  private nextPrompt(): void {
    if (this.promptsRemaining <= 0) {
      this.phase = 'complete';
      session.activitiesCompleted++;
      this.gameContext.events.emit({ type: 'show-game-end', allowReplay: true });
      return;
    }

    // --- Banner phase ---
    const turn = session.nextTurn();
    session.currentTurn = turn;
    this.gameContext.events.emit({ type: 'show-banner', turn });

    this.phase = 'banner';
    this.phaseTimer = 0;
    this.missCount = 0;
    this.inputLocked = true;
    this.gems = [];
    this.promptsRemaining--;

    // Charizard flies idle during banner
    this.charizard.setPose('fly');

    // Reset flame indicator
    this.flameIndicatorScale = 0;
    this.colorTextAlpha = 0;
    this.colorTextScale = 0;
  }

  private startIntroPhase(): void {
    this.phase = 'intro';
    this.phaseTimer = 0;

    // Create gems now
    this.createGems();

    // Hide banner
    this.gameContext.events.emit({ type: 'hide-banner' });

    // MCX voice says "Find the [COLOR] gem!"
    const colorName = this.currentColor!.name;
    (this.gameContext as any).audio?.speakFallback('Find the ' + colorName + ' gem!');
    (this.gameContext as any).audio?.playSynth('pop');

    // Emit prompt event for any overlay UI
    this.gameContext.events.emit({
      type: 'show-prompt',
      promptType: 'color',
      value: colorName,
      icon: 'flame',
    });

    // Animate flame indicator appearing
    this.tweens.add({
      from: 0,
      to: 1,
      duration: 0.35,
      easing: easing.easeOutBack,
      onUpdate: (v) => { this.flameIndicatorScale = v; },
    });

    // Color text pop
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
  }

  private startPlayPhase(): void {
    this.phase = 'play';
    this.phaseTimer = 0;
    this.inputLocked = false;

    // Set hint on correct gem if Owen's turn
    const diff = this.getDifficulty();
    if (diff.showHint) {
      const correct = this.gems.find(g => g.colorName === this.currentColor?.name && g.alive);
      if (correct) correct.hintLevel = 1;
    }
  }

  // -------------------------------------------------------------------------
  // Correct / Wrong / Auto-complete handlers
  // -------------------------------------------------------------------------

  private handleCorrect(gem: Gem): void {
    this.inputLocked = true;
    this.phase = 'beam';
    this.phaseTimer = 0;

    // Start fire-breath beam animation
    this.beamTimer = 0;
    this.beamTarget = { x: gem.x, y: gem.y, color: gem.color };

    // Audio
    (this.gameContext as any).audio?.playSynth('whoosh');

    // Charizard attack pose
    this.charizard.setPose('attack');

    // FeedbackSystem correct
    this.feedback.correct(gem.x, gem.y);

    // After beam reaches gem — explode!
    setTimeout(() => {
      gem.alive = false;
      this.gemsCollected++;

      // Audio for impact and correct chime
      (this.gameContext as any).audio?.playSynth('impact');
      (this.gameContext as any).audio?.playSynth('correct-chime');

      // MASSIVE colored explosion
      this.particles.burst(gem.x, gem.y, 60, gem.color, 280, 1.2);
      // Secondary white core burst
      this.particles.burst(gem.x, gem.y, 20, '#ffffff', 150, 0.6);
      // Tertiary spark ring
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const dist = 80;
        this.particles.spawn({
          x: gem.x + Math.cos(angle) * dist,
          y: gem.y + Math.sin(angle) * dist,
          vx: Math.cos(angle) * 200,
          vy: Math.sin(angle) * 200,
          color: gem.color,
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

      // Charizard happy pose
      this.charizard.setPose('happy');

      // Celebration event
      this.gameContext.events.emit({
        type: 'celebration',
        intensity: session.currentTurn === 'team' ? 'hype' : 'normal',
      });
      this.gameContext.events.emit({ type: 'hide-prompt' });

      // Charizard back to fly after a beat
      setTimeout(() => this.charizard.setPose('fly'), 600);

      // Move to celebrate phase
      this.phase = 'celebrate';
      this.phaseTimer = 0;
    }, BEAM_DURATION * 1000);
  }

  private handleWrong(gem: Gem): void {
    this.missCount++;

    // Audio
    (this.gameContext as any).audio?.playSynth('wrong-bonk');

    // Feedback: wrong marker
    this.feedback.wrong(gem.x, gem.y);

    // Dim the wrong gem
    gem.dimmed = true;

    // Brief shake (subtle — not punishing)
    this.shakeIntensity = 4;

    // MCX nudge pose
    this.charizard.setPose('nudge');
    setTimeout(() => this.charizard.setPose('fly'), 500);

    // Escalate hints on the correct gem
    const correctGem = this.gems.find(
      g => g.colorName === this.currentColor?.name && g.alive,
    );
    if (correctGem) {
      if (this.missCount >= FAILSAFE_HINT_2) {
        correctGem.hintLevel = 2;
      } else if (this.missCount >= FAILSAFE_HINT_1) {
        correctGem.hintLevel = 1;
      }
    }

    // Auto-complete after too many misses
    if (this.missCount >= FAILSAFE_AUTO) {
      this.autoComplete();
    }
  }

  private autoComplete(): void {
    const correctGem = this.gems.find(
      g => g.colorName === this.currentColor?.name && g.alive,
    );
    if (correctGem) {
      this.feedback.autoComplete(correctGem.x, correctGem.y);
      this.handleCorrect(correctGem);
    }
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  update(dt: number): void {
    this.bg.update(dt);
    this.particles.update(dt);
    this.tweens.update(dt);
    this.charizard.update(dt);
    this.feedback.update(dt);

    // Phase timer
    this.phaseTimer += dt;

    // Screen shake decay
    if (this.shakeIntensity > 0) {
      this.shakeIntensity *= 0.88;
      if (this.shakeIntensity < 0.3) this.shakeIntensity = 0;
      this.shakeOffsetX = randomRange(-this.shakeIntensity, this.shakeIntensity);
      this.shakeOffsetY = randomRange(-this.shakeIntensity, this.shakeIntensity);
    }

    // Phase-specific updates
    switch (this.phase) {
      case 'banner':
        if (this.phaseTimer >= BANNER_DURATION) {
          this.startIntroPhase();
        }
        break;

      case 'intro':
        // Update gems (they appear and float during intro)
        this.updateGems(dt);
        if (this.phaseTimer >= INTRO_DURATION) {
          this.startPlayPhase();
        }
        break;

      case 'play':
        this.updateGems(dt);
        break;

      case 'beam':
        this.updateGems(dt);
        this.updateBeam(dt);
        break;

      case 'celebrate':
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
        if (this.phaseTimer >= CELEBRATION_LINGER) {
          this.nextPrompt();
        }
        break;

      case 'complete':
        // Round is done, do nothing
        break;
    }
  }

  private updateGems(dt: number): void {
    for (const gem of this.gems) {
      if (!gem.alive) continue;

      // Floating drift
      gem.x += gem.vx * dt;
      gem.y += gem.vy * dt;

      // Bob phase for gentle floating
      gem.bobPhase += dt * 1.5;
      gem.sparklePhase += dt * 2.0;

      // Bounce off screen edges (keep gems in playable area)
      const margin = gem.radius + 20;
      const leftBound = DESIGN_WIDTH * 0.25;
      const rightBound = DESIGN_WIDTH - margin;
      const topBound = margin;
      const bottomBound = DESIGN_HEIGHT - margin;

      if (gem.x < leftBound) { gem.x = leftBound; gem.vx = Math.abs(gem.vx); }
      if (gem.x > rightBound) { gem.x = rightBound; gem.vx = -Math.abs(gem.vx); }
      if (gem.y < topBound) { gem.y = topBound; gem.vy = Math.abs(gem.vy); }
      if (gem.y > bottomBound) { gem.y = bottomBound; gem.vy = -Math.abs(gem.vy); }

      // Hint animations
      if (gem.hintLevel >= 1) {
        // Gentle bounce effect applied via bobPhase (already updating)
      }
    }
  }

  private updateBeam(dt: number): void {
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
    if (this.phase === 'beam' && this.beamTarget) {
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

    // Draw gems
    for (const gem of this.gems) {
      if (!gem.alive) continue;
      this.renderGem(ctx, gem);
    }

    // Particles on top of everything
    this.particles.render(ctx);

    // Color flame indicator near Charizard's mouth
    if (this.currentColor && this.phase !== 'celebrate' && this.phase !== 'complete' && this.phase !== 'banner') {
      this.renderFlameIndicator(ctx);
    }

    // Color name text (floating above the flame indicator)
    if (this.currentColor && this.phase !== 'celebrate' && this.phase !== 'complete' && this.phase !== 'banner' && this.colorTextAlpha > 0) {
      this.renderColorNameText(ctx);
    }

    // Feedback overlay text (GREAT!, Try again!, etc.)
    this.feedback.render(ctx);

    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // Gem rendering
  // -------------------------------------------------------------------------

  private renderGem(ctx: CanvasRenderingContext2D, gem: Gem): void {
    const s = gem.scale;
    if (s <= 0.01) return;

    ctx.save();

    // Apply dimming for wrong-clicked gems
    if (gem.dimmed) {
      ctx.globalAlpha = 0.4;
    }

    // Hint bounce animation
    let yOffset = Math.sin(gem.bobPhase) * 6; // gentle float
    if (gem.hintLevel >= 1) {
      // More pronounced bounce for hinted gems
      yOffset += Math.sin(gem.bobPhase * 2) * 12;
    }

    const gx = gem.x;
    const gy = gem.y + yOffset;
    const r = gem.radius * s;

    // 1. Outer glow: radial gradient from color center to transparent
    const outerGlow = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 1.8);
    outerGlow.addColorStop(0, gem.color + 'aa');
    outerGlow.addColorStop(0.5, gem.color + '44');
    outerGlow.addColorStop(1, gem.color + '00');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(gx, gy, r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 2. Main body: radial gradient — white center at 20%, full color at 60%, darker at edge
    const bodyGrad = ctx.createRadialGradient(gx - r * 0.15, gy - r * 0.15, 0, gx, gy, r);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.2, '#ffffffcc');
    bodyGrad.addColorStop(0.6, gem.color);
    bodyGrad.addColorStop(1, this.darkenColor(gem.color, 0.5));
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(gx, gy, r, 0, Math.PI * 2);
    ctx.fill();

    // Inner specular highlight (top-left)
    const specGrad = ctx.createRadialGradient(gx - r * 0.25, gy - r * 0.25, 0, gx - r * 0.15, gy - r * 0.15, r * 0.5);
    specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = specGrad;
    ctx.beginPath();
    ctx.arc(gx, gy, r, 0, Math.PI * 2);
    ctx.fill();

    // 3. Sparkle overlay: 4-6 small white dots rotating slowly around the gem
    const sparkleCount = 5;
    const sparkleBaseAngle = gem.sparklePhase;
    for (let i = 0; i < sparkleCount; i++) {
      const angle = sparkleBaseAngle + (i / sparkleCount) * Math.PI * 2;
      const dist = r * 0.7;
      const sx = gx + Math.cos(angle) * dist;
      const sy = gy + Math.sin(angle) * dist;
      const sparkleSize = 3 + Math.sin(gem.sparklePhase * 3 + i * 1.2) * 1.5;
      const sparkleAlpha = 0.5 + Math.sin(gem.sparklePhase * 2 + i * 0.8) * 0.3;

      ctx.save();
      ctx.globalAlpha = (gem.dimmed ? 0.4 : 1) * sparkleAlpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy, sparkleSize * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Hint level 2: pulsing blue outline
    if (gem.hintLevel >= 2) {
      const pulseSize = 1 + Math.sin(gem.bobPhase * 3) * 0.15;
      ctx.save();
      ctx.strokeStyle = '#37B1E2';
      ctx.lineWidth = 4 * pulseSize;
      ctx.shadowColor = '#37B1E2';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(gx, gy, r * pulseSize, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  /** Darken a hex color by a factor (0 = black, 1 = original) */
  private darkenColor(hex: string, factor: number): string {
    // Parse hex
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const dr = Math.round(r * factor);
    const dg = Math.round(g * factor);
    const db = Math.round(b * factor);
    return '#' + [dr, dg, db].map(c => c.toString(16).padStart(2, '0')).join('');
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
    if (this.phase !== 'play' || this.inputLocked) return;

    for (const gem of this.gems) {
      if (!gem.alive) continue;
      if (this.isGemHit(gem, x, y)) {
        if (gem.colorName === this.currentColor?.name) {
          this.handleCorrect(gem);
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
