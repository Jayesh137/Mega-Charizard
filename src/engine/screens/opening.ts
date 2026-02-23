// src/engine/screens/opening.ts
// 22-second Mega Evolution Transformation — the opening spectacle
// Timeline: Egg(0-3) -> Charmander(3-6) -> Charmeleon(6-9) -> Charizard(9-13)
//           -> MEGA EVOLUTION(13-20) -> Title(20-22)
// Procedural drawings for pre-evolution forms, real Charizard entity for MCX.

import type { GameScreen, GameContext } from '../screen-manager';
import { DESIGN_WIDTH, DESIGN_HEIGHT, FONT } from '../../config/constants';
import { theme } from '../../config/theme';
import { Background } from '../entities/backgrounds';
import { ParticlePool } from '../entities/particles';
import { Charizard } from '../entities/charizard';
import { TweenManager, easing } from '../utils/tween';
import { randomRange } from '../utils/math';

// ---------------------------------------------------------------------------
// Phase timeline
// ---------------------------------------------------------------------------

type OpeningPhase = 'egg' | 'charmander' | 'evolution1' | 'charizard' | 'mega-evolution' | 'title';

interface PhaseEntry {
  name: OpeningPhase;
  start: number;
  end: number;
}

const PHASES: PhaseEntry[] = [
  { name: 'egg',            start: 0,  end: 3  },
  { name: 'charmander',     start: 3,  end: 6  },
  { name: 'evolution1',     start: 6,  end: 9  },
  { name: 'charizard',      start: 9,  end: 13 },
  { name: 'mega-evolution', start: 13, end: 20 },
  { name: 'title',          start: 20, end: 22 },
];

const TOTAL_DURATION = 22;
const SHORT_DURATION = 5; // Quick version for return visits

// ---------------------------------------------------------------------------
// Color palettes for each evolution form (from theme)
// ---------------------------------------------------------------------------

const CHARM_COL = theme.forms[0].colors;   // Charmander
const CHARML_COL = theme.forms[1].colors;  // Charmeleon
const CHARIZ_COL = theme.forms[2].colors;  // Charizard
const MCX_COL = theme.forms[3].colors;     // Mega Charizard X

// Fire color arrays
const ORANGE_FIRE = ['#FFFFFF', '#FFD700', '#FF8C00', '#FF4500', '#F15F3E'];
const BLUE_FIRE = ['#FFFFFF', '#91CCEC', '#37B1E2', '#1a5fc4'];
const MEGA_FIRE = ['#FFFFFF', '#91CCEC', '#37B1E2', '#1a5fc4', '#7B68EE'];

// Outline width (chunky silhouette style)
const OL = 5;

// ---------------------------------------------------------------------------
// OpeningScreen
// ---------------------------------------------------------------------------

export class OpeningScreen implements GameScreen {
  private gameContext!: GameContext;

  // Sub-systems (own instances — isolated from main game)
  private bg = new Background(60);
  private particles = new ParticlePool();
  private tweens = new TweenManager();
  private mcx = new Charizard(this.particles, this.tweens);

  // Timeline state
  private time = 0;
  private phase: OpeningPhase = 'egg';
  private phaseLocalTime = 0;        // seconds into the current phase
  private skipped = false;
  private completed = false;
  private shortMode = false;         // true = 5s quick intro for return visits

  // Animated values
  private flashAlpha = 0;            // white flash overlay
  private titleAlpha = 0;            // title text fade
  private subtitleAlpha = 0;         // "Welcome, Trainers!" fade
  private megaStoneAngle = 0;        // rotating mega stone
  private megaStoneAlpha = 0;        // mega stone visibility
  private dnaHelixPhase = 0;         // DNA helix rotation
  private whiteOutAlpha = 0;         // mega evolution white-out
  private mcxAlpha = 0;              // MCX reveal fade
  private mcxScale = 0;              // MCX scale-up on reveal
  private screenShake = 0;           // screen shake intensity

  // Cached center point
  private readonly cx = DESIGN_WIDTH / 2;
  private readonly cy = DESIGN_HEIGHT / 2;

  // -------------------------------------------------------------------------
  // GameScreen interface
  // -------------------------------------------------------------------------

  enter(ctx: GameContext): void {
    this.gameContext = ctx;
    this.time = 0;
    this.phase = 'egg';
    this.phaseLocalTime = 0;
    this.skipped = false;
    this.completed = false;

    this.flashAlpha = 0;
    this.titleAlpha = 0;
    this.subtitleAlpha = 0;
    this.megaStoneAngle = 0;
    this.megaStoneAlpha = 0;
    this.dnaHelixPhase = 0;
    this.whiteOutAlpha = 0;
    this.mcxAlpha = 0;
    this.mcxScale = 0;
    this.screenShake = 0;

    this.particles.clear();
    this.tweens.clear();
    this.mcx.setPose('idle');
  }

  update(dt: number): void {
    if (this.completed) return;

    this.time += dt;
    this.tweens.update(dt);
    this.bg.update(dt);
    this.particles.update(dt);

    // Determine current phase
    const duration = this.shortMode ? SHORT_DURATION : TOTAL_DURATION;

    if (this.time >= duration && !this.skipped) {
      this._completeSequence();
      return;
    }

    // Map time to phase
    if (!this.shortMode) {
      for (const entry of PHASES) {
        if (this.time >= entry.start && this.time < entry.end) {
          if (this.phase !== entry.name) {
            this._onPhaseEnter(entry.name);
          }
          this.phase = entry.name;
          this.phaseLocalTime = this.time - entry.start;
          break;
        }
      }
      // After last phase boundary
      if (this.time >= PHASES[PHASES.length - 1].end) {
        this._completeSequence();
        return;
      }
    } else {
      // Short mode: quick MCX reveal
      this._updateShortMode(dt);
      return;
    }

    // Phase-specific updates
    this._updatePhase(dt);

    // Flash decay
    this.flashAlpha = Math.max(0, this.flashAlpha - dt * 3);

    // Screen shake decay
    this.screenShake = Math.max(0, this.screenShake - dt * 8);

    // MCX update (only relevant during mega-evolution + title)
    if (this.phase === 'mega-evolution' || this.phase === 'title') {
      this.mcx.update(dt);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Screen shake offset
    if (this.screenShake > 0.01) {
      const shakeX = randomRange(-this.screenShake, this.screenShake) * 8;
      const shakeY = randomRange(-this.screenShake, this.screenShake) * 8;
      ctx.translate(shakeX, shakeY);
    }

    // Background (dark sky with stars)
    this.bg.render(ctx);

    // Render current phase content
    if (this.shortMode) {
      this._renderShortMode(ctx);
    } else {
      switch (this.phase) {
        case 'egg':
          this._renderEgg(ctx);
          break;
        case 'charmander':
          this._renderCharmander(ctx);
          break;
        case 'evolution1':
          this._renderCharmeleon(ctx);
          break;
        case 'charizard':
          this._renderCharizard(ctx);
          break;
        case 'mega-evolution':
          this._renderMegaEvolution(ctx);
          break;
        case 'title':
          this._renderTitle(ctx);
          break;
      }
    }

    // Particles on top of characters
    this.particles.render(ctx);

    // White flash overlay (transitions between phases)
    if (this.flashAlpha > 0.01) {
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-20, -20, DESIGN_WIDTH + 40, DESIGN_HEIGHT + 40);
      ctx.globalAlpha = 1;
    }

    // White-out overlay for mega evolution
    if (this.whiteOutAlpha > 0.01) {
      ctx.globalAlpha = this.whiteOutAlpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-20, -20, DESIGN_WIDTH + 40, DESIGN_HEIGHT + 40);
      ctx.globalAlpha = 1;
    }

    // Skip hint (small text in bottom-right corner)
    if (!this.completed && this.time > 1.0) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText('Tap or press any key to skip', DESIGN_WIDTH - 60, DESIGN_HEIGHT - 40);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  exit(): void {
    this.particles.clear();
    this.tweens.clear();
  }

  handleClick(_x: number, _y: number): void {
    this.skipToEnd();
  }

  handleKey(_key: string): void {
    this.skipToEnd();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Skip directly to title phase, then auto-transition to hub */
  skipToEnd(): void {
    if (this.completed || this.skipped) return;
    this.skipped = true;

    // Flash and reveal MCX + title immediately
    this.flashAlpha = 1.0;
    this.titleAlpha = 1.0;
    this.subtitleAlpha = 1.0;
    this.mcxAlpha = 1.0;
    this.mcxScale = 0.75;
    this.whiteOutAlpha = 0;
    this.phase = 'title';
    this.phaseLocalTime = 0;
    this.mcx.setPose('idle');

    // Auto-transition after a brief moment
    this.tweens.add({
      from: 1.0, to: 0, duration: 0.5, easing: easing.easeOut,
      onUpdate: (v) => { this.flashAlpha = v; },
      onComplete: () => {
        // Wait 1.5s on title, then go to hub
        setTimeout(() => {
          this._completeSequence();
        }, 1500);
      },
    });
  }

  /** Play a short 5-second version (MCX quick reveal for return visits) */
  playShort(): void {
    this.shortMode = true;
    this.time = 0;
    this.mcxAlpha = 0;
    this.mcxScale = 0;
    this.titleAlpha = 0;
    this.subtitleAlpha = 0;
    this.flashAlpha = 0;
    this.mcx.setPose('idle');
  }

  // -------------------------------------------------------------------------
  // Phase transitions
  // -------------------------------------------------------------------------

  private _onPhaseEnter(phase: OpeningPhase): void {
    switch (phase) {
      case 'charmander':
        // Flash for Charmander appearing
        this.flashAlpha = 1.0;
        this.screenShake = 0.3;
        this.particles.burst(this.cx, this.cy, 30, '#F08030', 200, 0.6);
        break;

      case 'evolution1':
        // White flash for Charmeleon evolution
        this.flashAlpha = 1.0;
        this.screenShake = 0.5;
        this.particles.burst(this.cx, this.cy, 50, '#FFFFFF', 300, 0.8);
        this.particles.burst(this.cx, this.cy, 25, '#FF6B35', 250, 0.7);
        break;

      case 'charizard':
        // Big flash for Charizard
        this.flashAlpha = 1.0;
        this.screenShake = 0.8;
        this.particles.burst(this.cx, this.cy, 70, '#FFFFFF', 400, 1.0);
        this.particles.burst(this.cx, this.cy, 40, '#FF4500', 350, 0.8);
        break;

      case 'mega-evolution':
        // Mega stone appears (gradual)
        this.megaStoneAlpha = 0;
        this.tweens.add({
          from: 0, to: 1, duration: 1.5, easing: easing.easeOut,
          onUpdate: (v) => { this.megaStoneAlpha = v; },
        });
        break;

      case 'title':
        // MCX is fully revealed, fire settles
        this.mcx.setPose('idle');
        this.tweens.add({
          from: 0, to: 1, duration: 1.0, easing: easing.easeOut,
          onUpdate: (v) => { this.titleAlpha = v; },
        });
        this.tweens.add({
          from: 0, to: 1, duration: 1.2, easing: easing.easeOut,
          onUpdate: (v) => { this.subtitleAlpha = v; },
        });
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Phase updates
  // -------------------------------------------------------------------------

  private _updatePhase(dt: number): void {
    const t = this.phaseLocalTime;

    switch (this.phase) {
      case 'egg': {
        // Ember particles drifting upward from center
        const intensity = 0.3 + t * 0.3;
        if (Math.random() < intensity) {
          this.particles.spawn({
            x: this.cx + randomRange(-40, 40),
            y: this.cy + randomRange(-20, 20),
            vx: randomRange(-15, 15),
            vy: randomRange(-60, -20),
            color: ORANGE_FIRE[Math.floor(Math.random() * ORANGE_FIRE.length)],
            size: randomRange(2, 6),
            lifetime: randomRange(0.5, 1.2),
            drag: 0.97,
            fadeOut: true,
            shrink: true,
          });
        }
        break;
      }

      case 'charmander': {
        // Tail flame particles
        const tailX = this.cx - 50;
        const tailY = this.cy + 30;
        if (Math.random() < 0.6) {
          this.particles.spawn({
            x: tailX + randomRange(-5, 5),
            y: tailY + randomRange(-3, 3),
            vx: randomRange(-20, 5),
            vy: randomRange(-60, -25),
            color: ORANGE_FIRE[Math.floor(Math.random() * ORANGE_FIRE.length)],
            size: randomRange(2, 5),
            lifetime: randomRange(0.3, 0.6),
            drag: 0.96,
            fadeOut: true,
            shrink: true,
          });
        }
        break;
      }

      case 'evolution1': {
        // Bigger tail flame for Charmeleon
        const tailX = this.cx - 80;
        const tailY = this.cy + 20;
        if (Math.random() < 0.7) {
          this.particles.spawn({
            x: tailX + randomRange(-8, 8),
            y: tailY + randomRange(-5, 5),
            vx: randomRange(-30, 10),
            vy: randomRange(-80, -30),
            color: ORANGE_FIRE[Math.floor(Math.random() * ORANGE_FIRE.length)],
            size: randomRange(3, 7),
            lifetime: randomRange(0.3, 0.7),
            drag: 0.95,
            fadeOut: true,
            shrink: true,
          });
        }
        break;
      }

      case 'charizard': {
        // Fire column shooting upward
        const fireX = this.cx;
        const fireY = this.cy - 180;
        const columnIntensity = Math.min(t * 0.5, 1.0);
        for (let i = 0; i < 3; i++) {
          if (Math.random() < columnIntensity) {
            this.particles.spawn({
              x: fireX + randomRange(-30, 30),
              y: fireY + randomRange(-20, 40),
              vx: randomRange(-25, 25),
              vy: randomRange(-200, -80),
              color: ORANGE_FIRE[Math.floor(Math.random() * ORANGE_FIRE.length)],
              size: randomRange(4, 12),
              lifetime: randomRange(0.3, 0.8),
              drag: 0.94,
              fadeOut: true,
              shrink: true,
            });
          }
        }

        // Tail flame too
        if (Math.random() < 0.8) {
          this.particles.flame(
            this.cx - 120, this.cy + 60, 2, ORANGE_FIRE, 15,
          );
        }
        break;
      }

      case 'mega-evolution': {
        this.megaStoneAngle += dt * 2;
        this.dnaHelixPhase += dt * 3;

        // Phase sub-timeline within mega-evolution (7 seconds total: 13-20)
        const megaT = t;

        // 0-2s: Mega stone appears + DNA helix
        if (megaT < 2) {
          // Rainbow shimmer particles around the mega stone
          if (Math.random() < 0.5) {
            const angle = randomRange(0, Math.PI * 2);
            const dist = randomRange(30, 60);
            this.particles.spawn({
              x: this.cx + Math.cos(angle) * dist,
              y: (this.cy - 100) + Math.sin(angle) * dist,
              vx: randomRange(-10, 10),
              vy: randomRange(-30, -10),
              color: MEGA_FIRE[Math.floor(Math.random() * MEGA_FIRE.length)],
              size: randomRange(2, 5),
              lifetime: randomRange(0.4, 0.8),
              drag: 0.98,
              fadeOut: true,
              shrink: true,
            });
          }
        }

        // 2-3s: Light streams from mega stone to character
        if (megaT >= 2 && megaT < 3) {
          const streamProgress = (megaT - 2);
          for (let i = 0; i < 3; i++) {
            if (Math.random() < 0.6) {
              const startAngle = randomRange(0, Math.PI * 2);
              this.particles.spawn({
                x: this.cx + Math.cos(startAngle) * 50 * (1 - streamProgress),
                y: (this.cy - 100) + Math.sin(startAngle) * 50 * (1 - streamProgress),
                vx: randomRange(-80, 80) * streamProgress,
                vy: randomRange(-120, 120) * streamProgress,
                color: MEGA_FIRE[Math.floor(Math.random() * MEGA_FIRE.length)],
                size: randomRange(3, 8),
                lifetime: randomRange(0.3, 0.6),
                drag: 0.93,
                fadeOut: true,
                shrink: true,
              });
            }
          }
          this.screenShake = Math.min(streamProgress * 0.5, 0.4);
        }

        // 3-4.5s: White-out flash
        if (megaT >= 3 && megaT < 4.5) {
          const flashT = (megaT - 3) / 1.5;
          if (flashT < 0.3) {
            this.whiteOutAlpha = flashT / 0.3;
          } else if (flashT < 0.6) {
            this.whiteOutAlpha = 1.0;
          } else {
            this.whiteOutAlpha = 1.0 - (flashT - 0.6) / 0.4;
          }
          this.screenShake = 0.6 * (1 - flashT);
        } else if (megaT >= 4.5) {
          this.whiteOutAlpha = Math.max(0, this.whiteOutAlpha - dt * 2);
        }

        // 4s: MCX revealed — fade in
        if (megaT >= 4 && this.mcxAlpha < 1) {
          this.mcxAlpha = Math.min(1, this.mcxAlpha + dt * 1.2);
          this.mcxScale = Math.min(0.75, this.mcxScale + dt * 0.6);
        }

        // 4.5-7s: MCX present, blue flames erupt
        if (megaT >= 4.5) {
          this.mcx.update(dt);

          // Set roar pose on first reveal for dramatic effect
          if (megaT >= 4.5 && megaT < 4.6) {
            this.mcx.setPose('roar');
          }
          // Settle to idle before title
          if (megaT >= 6.5 && megaT < 6.6) {
            this.mcx.setPose('idle');
          }

          // Blue fire particles at screen edges
          const edgeIntensity = megaT < 5.5 ? (megaT - 4.5) : Math.max(0.3, 1 - (megaT - 5.5) * 0.3);
          for (let i = 0; i < 4; i++) {
            if (Math.random() < edgeIntensity * 0.7) {
              const side = Math.random() < 0.5;
              this.particles.spawn({
                x: side ? randomRange(0, 200) : randomRange(DESIGN_WIDTH - 200, DESIGN_WIDTH),
                y: randomRange(DESIGN_HEIGHT * 0.3, DESIGN_HEIGHT),
                vx: side ? randomRange(20, 80) : randomRange(-80, -20),
                vy: randomRange(-120, -40),
                color: BLUE_FIRE[Math.floor(Math.random() * BLUE_FIRE.length)],
                size: randomRange(4, 12),
                lifetime: randomRange(0.5, 1.0),
                drag: 0.95,
                fadeOut: true,
                shrink: true,
              });
            }
          }
        }

        // Mega stone fades out once white-out happens
        if (megaT >= 3) {
          this.megaStoneAlpha = Math.max(0, this.megaStoneAlpha - dt * 2);
        }
        break;
      }

      case 'title': {
        // Gentle ambient blue flame
        if (Math.random() < 0.3) {
          this.particles.flame(
            this.cx, this.cy + 100, 1,
            BLUE_FIRE, 60,
          );
        }
        this.mcx.update(dt);
        break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Short mode (5s quick intro for return visits)
  // -------------------------------------------------------------------------

  private _updateShortMode(dt: number): void {
    const t = this.time;

    this.bg.update(dt);
    this.particles.update(dt);
    this.tweens.update(dt);

    // 0-1s: Dark with blue glow building
    if (t < 1) {
      if (Math.random() < t * 0.5) {
        this.particles.flame(this.cx, this.cy, 1, BLUE_FIRE, 40);
      }
    }

    // 1-1.5s: Flash + MCX appears
    if (t >= 1 && t < 1.5) {
      this.flashAlpha = Math.max(0, 1.0 - (t - 1) * 4);
      this.mcxAlpha = Math.min(1, (t - 1) * 3);
      this.mcxScale = Math.min(0.75, (t - 1) * 2);
    }

    // 1.5-3s: MCX roars
    if (t >= 1.5 && t < 1.6) {
      this.mcx.setPose('roar');
      this.screenShake = 0.5;
    }

    // 3-3.5: settle to idle
    if (t >= 3 && t < 3.1) {
      this.mcx.setPose('idle');
    }

    // 3.5-5: Title text
    if (t >= 3.5) {
      this.titleAlpha = Math.min(1, (t - 3.5) * 2);
      this.subtitleAlpha = Math.min(1, (t - 4) * 2);
    }

    if (t >= 1.5) {
      this.mcx.update(dt);
    }

    // Blue edge flames throughout
    if (t >= 1.5 && Math.random() < 0.4) {
      const side = Math.random() < 0.5;
      this.particles.spawn({
        x: side ? randomRange(0, 150) : randomRange(DESIGN_WIDTH - 150, DESIGN_WIDTH),
        y: randomRange(DESIGN_HEIGHT * 0.4, DESIGN_HEIGHT),
        vx: side ? randomRange(15, 60) : randomRange(-60, -15),
        vy: randomRange(-90, -30),
        color: BLUE_FIRE[Math.floor(Math.random() * BLUE_FIRE.length)],
        size: randomRange(3, 10),
        lifetime: randomRange(0.4, 0.8),
        drag: 0.95,
        fadeOut: true,
        shrink: true,
      });
    }

    // Flash decay + shake decay
    this.flashAlpha = Math.max(0, this.flashAlpha - dt * 3);
    this.screenShake = Math.max(0, this.screenShake - dt * 5);

    if (t >= SHORT_DURATION) {
      this._completeSequence();
    }
  }

  private _renderShortMode(ctx: CanvasRenderingContext2D): void {
    // Blue glow behind center
    this._drawBlueAura(ctx, this.cx, this.cy + 40, Math.min(this.time * 0.5, 1));

    // MCX
    if (this.mcxAlpha > 0.01) {
      ctx.globalAlpha = this.mcxAlpha;
      this.mcx.render(ctx, this.cx, this.cy + 40, this.mcxScale);
      ctx.globalAlpha = 1;
    }

    // Title text
    this._renderTitleText(ctx);
  }

  // -------------------------------------------------------------------------
  // Phase renderers
  // -------------------------------------------------------------------------

  /** Phase 1: "The Egg" — pulsing orange ember glow in center */
  private _renderEgg(ctx: CanvasRenderingContext2D): void {
    const t = this.phaseLocalTime;

    // Dark vignette overlay
    this._drawVignette(ctx, 0.6);

    // Pulsing orange/amber glow — breathing rhythm
    const breathe = 0.5 + 0.5 * Math.sin(t * 2.5);
    const glowSize = 60 + breathe * 80 + t * 40; // grows over time
    const alpha = 0.15 + breathe * 0.2 + t * 0.05;

    // Outer warm glow
    const grad1 = ctx.createRadialGradient(
      this.cx, this.cy, 10,
      this.cx, this.cy, glowSize * 2,
    );
    grad1.addColorStop(0, `rgba(240, 128, 48, ${alpha})`);
    grad1.addColorStop(0.4, `rgba(255, 100, 20, ${alpha * 0.5})`);
    grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Inner bright core
    const coreGrad = ctx.createRadialGradient(
      this.cx, this.cy, 5,
      this.cx, this.cy, glowSize * 0.6,
    );
    coreGrad.addColorStop(0, `rgba(255, 220, 150, ${alpha * 1.5})`);
    coreGrad.addColorStop(0.5, `rgba(255, 160, 60, ${alpha * 0.8})`);
    coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // At ~2s, the glow starts forming into an egg shape
    if (t > 1.5) {
      const eggProgress = (t - 1.5) / 1.5; // 0 to 1 over the last 1.5s
      const eggH = 80 * eggProgress;
      const eggW = 55 * eggProgress;
      const eggAlpha = 0.2 + eggProgress * 0.4;

      ctx.save();
      ctx.translate(this.cx, this.cy);

      // Egg shape glow
      const eggGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, Math.max(eggH, eggW));
      eggGrad.addColorStop(0, `rgba(255, 240, 200, ${eggAlpha})`);
      eggGrad.addColorStop(0.6, `rgba(255, 180, 80, ${eggAlpha * 0.6})`);
      eggGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = eggGrad;

      ctx.beginPath();
      ctx.ellipse(0, 0, eggW, eggH, 0, 0, Math.PI * 2);
      ctx.fill();

      // Egg outline (subtle)
      ctx.strokeStyle = `rgba(255, 200, 100, ${eggAlpha * 0.6})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.restore();
    }

    // At ~2.5s, intensify
    if (t > 2.5) {
      const intensify = (t - 2.5) / 0.5;
      ctx.globalAlpha = intensify * 0.3;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
      ctx.globalAlpha = 1;
    }
  }

  /** Phase 2: "Charmander" — cute little orange critter with tail flame */
  private _renderCharmander(ctx: CanvasRenderingContext2D): void {
    const t = this.phaseLocalTime;
    const cx = this.cx;
    // Hop animation — little sine bounce
    const hopOffset = Math.sin(t * 4) * 12;
    const cy = this.cy + 60 + hopOffset;

    // Warm glow behind Charmander
    this._drawWarmGlow(ctx, cx, cy - 40, 250, 0.2);

    const s = 1.0; // scale factor
    const bodyColor = CHARM_COL.body ?? '#F08030';
    const bellyColor = CHARM_COL.belly ?? '#FCF0DE';

    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineWidth = OL;
    ctx.strokeStyle = '#000000';
    ctx.lineJoin = 'round';

    // -- Tail (behind body) --
    ctx.save();
    const tailWag = Math.sin(t * 5) * 0.1;
    ctx.rotate(tailWag);
    ctx.beginPath();
    ctx.moveTo(-35 * s, 20 * s);
    ctx.bezierCurveTo(
      -55 * s, 30 * s,
      -70 * s, 15 * s,
      -65 * s, -5 * s,
    );
    ctx.bezierCurveTo(
      -62 * s, -15 * s,
      -50 * s, -10 * s,
      -45 * s, 5 * s,
    );
    ctx.bezierCurveTo(-40 * s, 15 * s, -35 * s, 25 * s, -30 * s, 20 * s);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // -- Tail flame --
    const flamePulse = 0.8 + 0.4 * Math.sin(t * 12);
    ctx.save();
    ctx.translate(-65 * s, -5 * s);
    ctx.beginPath();
    ctx.moveTo(-8 * s, 5 * s);
    ctx.quadraticCurveTo(-2 * s, -25 * s * flamePulse, 4 * s, -20 * s * flamePulse);
    ctx.quadraticCurveTo(8 * s, -15 * s * flamePulse, 10 * s, 5 * s);
    ctx.closePath();
    ctx.fillStyle = '#FF4500';
    ctx.fill();
    // Inner flame
    ctx.beginPath();
    ctx.moveTo(-4 * s, 4 * s);
    ctx.quadraticCurveTo(0, -14 * s * flamePulse, 3 * s, -10 * s * flamePulse);
    ctx.quadraticCurveTo(5 * s, -7 * s * flamePulse, 6 * s, 4 * s);
    ctx.closePath();
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    ctx.restore();

    // -- Legs --
    for (const lx of [-18, 18]) {
      ctx.beginPath();
      ctx.moveTo((lx - 10) * s, 55 * s);
      ctx.lineTo((lx + 10) * s, 55 * s);
      ctx.lineTo((lx + 12) * s, 80 * s);
      ctx.lineTo((lx - 12) * s, 80 * s);
      ctx.closePath();
      ctx.fillStyle = bodyColor;
      ctx.fill();
      ctx.stroke();
    }

    // -- Body (round orange blob) --
    ctx.beginPath();
    ctx.ellipse(0, 20 * s, 48 * s, 55 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.stroke();

    // -- Belly --
    ctx.beginPath();
    ctx.ellipse(3 * s, 28 * s, 30 * s, 35 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = bellyColor;
    ctx.fill();

    // -- Arms (small stubs) --
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * 42 * s, 10 * s, 12 * s, 8 * s, side * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = bodyColor;
      ctx.fill();
      ctx.stroke();
    }

    // -- Head (bigger round head for cuteness) --
    ctx.beginPath();
    ctx.ellipse(0, -45 * s, 42 * s, 38 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.stroke();

    // -- Eyes (big and cute!) --
    for (const side of [-1, 1]) {
      const eyeX = side * 16 * s;
      const eyeY = -50 * s;

      // White of eye
      ctx.beginPath();
      ctx.ellipse(eyeX, eyeY, 12 * s, 13 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.stroke();

      // Pupil (looking at viewer)
      ctx.beginPath();
      ctx.ellipse(eyeX + side * 2 * s, eyeY + 1 * s, 7 * s, 8 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a2e';
      ctx.fill();

      // Highlight (sparkle!)
      ctx.beginPath();
      ctx.ellipse(eyeX + side * 5 * s, eyeY - 4 * s, 3 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      // Second small highlight
      ctx.beginPath();
      ctx.arc(eyeX + side * 1 * s, eyeY + 3 * s, 1.5 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }

    // -- Mouth (happy smile) --
    ctx.beginPath();
    ctx.arc(0, -35 * s, 10 * s, 0.1, Math.PI - 0.1);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineWidth = OL;

    ctx.restore();
  }

  /** Phase 3: "Charmeleon" — taller, fiercer, darker red */
  private _renderCharmeleon(ctx: CanvasRenderingContext2D): void {
    const t = this.phaseLocalTime;
    const cx = this.cx;
    const cy = this.cy + 20;

    // Warm glow
    this._drawWarmGlow(ctx, cx, cy - 50, 300, 0.25);

    const bodyColor = CHARML_COL.body ?? '#D45137';
    const bellyColor = CHARML_COL.belly ?? '#905C42';

    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineWidth = OL;
    ctx.strokeStyle = '#000000';
    ctx.lineJoin = 'round';

    // -- Tail (behind body, bigger) --
    ctx.save();
    const tailSway = Math.sin(t * 3) * 0.08;
    ctx.rotate(tailSway);
    ctx.beginPath();
    ctx.moveTo(-45 * 1, 40 * 1);
    ctx.bezierCurveTo(-80, 55, -110, 30, -105, 0);
    ctx.bezierCurveTo(-100, -15, -85, -10, -75, 10);
    ctx.bezierCurveTo(-65, 25, -50, 40, -40, 35);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // -- Tail flame (bigger!) --
    const flamePulse = 0.7 + 0.5 * Math.sin(t * 10);
    ctx.save();
    ctx.translate(-105, 0);
    ctx.beginPath();
    ctx.moveTo(-12, 8);
    ctx.quadraticCurveTo(-4, -40 * flamePulse, 6, -32 * flamePulse);
    ctx.quadraticCurveTo(12, -22 * flamePulse, 14, 8);
    ctx.closePath();
    ctx.fillStyle = '#FF6B35';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-6, 6);
    ctx.quadraticCurveTo(0, -22 * flamePulse, 4, -16 * flamePulse);
    ctx.quadraticCurveTo(7, -10 * flamePulse, 8, 6);
    ctx.closePath();
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    ctx.restore();

    // -- Legs (chunkier) --
    for (const lx of [-22, 22]) {
      ctx.beginPath();
      ctx.moveTo(lx - 13, 70);
      ctx.lineTo(lx + 13, 70);
      ctx.lineTo(lx + 15, 110);
      ctx.lineTo(lx - 15, 110);
      ctx.closePath();
      ctx.fillStyle = bodyColor;
      ctx.fill();
      ctx.stroke();

      // Claws
      for (let c = 0; c < 3; c++) {
        const clawX = lx - 10 + c * 10;
        ctx.beginPath();
        ctx.moveTo(clawX - 3, 110);
        ctx.lineTo(clawX + 3, 110);
        ctx.lineTo(clawX, 118);
        ctx.closePath();
        ctx.fillStyle = '#cccccc';
        ctx.fill();
      }
    }

    // -- Body (taller, more angular) --
    ctx.beginPath();
    ctx.moveTo(-50, -55);
    ctx.lineTo(50, -55);
    ctx.quadraticCurveTo(58, -50, 55, -30);
    ctx.lineTo(42, 70);
    ctx.lineTo(-42, 70);
    ctx.lineTo(-55, -30);
    ctx.quadraticCurveTo(-58, -50, -50, -55);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.stroke();

    // -- Belly --
    ctx.beginPath();
    ctx.ellipse(3, 15, 28, 42, 0, 0, Math.PI * 2);
    ctx.fillStyle = bellyColor;
    ctx.fill();

    // -- Arms (more defined) --
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 50, -10);
      ctx.rotate(side * 0.2);
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(side * 30, -15);
      ctx.lineTo(side * 35, -5);
      ctx.lineTo(side * 28, 5);
      ctx.lineTo(0, 10);
      ctx.closePath();
      ctx.fillStyle = bodyColor;
      ctx.fill();
      ctx.stroke();

      // Claw at end
      ctx.beginPath();
      ctx.moveTo(side * 30, -15);
      ctx.lineTo(side * 42, -18);
      ctx.lineTo(side * 35, -5);
      ctx.closePath();
      ctx.fillStyle = '#cccccc';
      ctx.fill();
      ctx.restore();
    }

    // -- Head (more angular, fiercer) --
    ctx.beginPath();
    ctx.moveTo(-38, -55);
    ctx.lineTo(38, -55);
    ctx.quadraticCurveTo(48, -60, 50, -80);
    ctx.lineTo(52, -100);
    ctx.quadraticCurveTo(48, -115, 30, -115);
    ctx.lineTo(-30, -115);
    ctx.quadraticCurveTo(-48, -115, -52, -100);
    ctx.lineTo(-50, -80);
    ctx.quadraticCurveTo(-48, -60, -38, -55);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.stroke();

    // -- Snout bump --
    ctx.beginPath();
    ctx.moveTo(28, -80);
    ctx.lineTo(58, -85);
    ctx.lineTo(55, -70);
    ctx.lineTo(28, -68);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.stroke();

    // -- Horn (single, on top) --
    ctx.beginPath();
    ctx.moveTo(-8, -115);
    ctx.lineTo(8, -115);
    ctx.lineTo(2, -155);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.stroke();

    // -- Eyes (narrow and fierce!) --
    for (const side of [-1, 1]) {
      const eyeX = side * 18;
      const eyeY = -92;

      // Fierce narrow shape
      ctx.beginPath();
      ctx.ellipse(eyeX, eyeY, 10, 5, side * -0.15, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.stroke();

      // Narrow slit pupil
      ctx.beginPath();
      ctx.ellipse(eyeX + side * 2, eyeY, 4, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a2e';
      ctx.fill();

      // Angry brow ridge
      ctx.beginPath();
      ctx.moveTo(eyeX - side * 12, eyeY - 10);
      ctx.lineTo(eyeX + side * 8, eyeY - 6);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000000';
      ctx.stroke();
      ctx.lineWidth = OL;
    }

    ctx.restore();
  }

  /** Phase 4: "Charizard Rises" — wings burst out, fire column */
  private _renderCharizard(ctx: CanvasRenderingContext2D): void {
    const t = this.phaseLocalTime;
    const cx = this.cx;
    const cy = this.cy + 10;

    // Dramatic warm glow
    this._drawWarmGlow(ctx, cx, cy - 60, 400, 0.3 + t * 0.02);

    const bodyColor = CHARIZ_COL.body ?? '#F08030';
    const bellyColor = CHARIZ_COL.belly ?? '#FCC499';
    const wingColor = CHARIZ_COL.wings ?? '#58A8B8';

    // Wing spread animation
    const wingSpread = Math.min(1, t * 0.7);
    const wingFlap = Math.sin(t * 4) * 0.1;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineWidth = OL;
    ctx.strokeStyle = '#000000';
    ctx.lineJoin = 'round';

    // -- Back wing (right, behind body) --
    this._drawSimpleWing(ctx, -1, wingSpread, wingFlap, wingColor, 0.8);

    // -- Tail --
    ctx.save();
    const tailSway = Math.sin(t * 2.5) * 0.06;
    ctx.rotate(tailSway);
    ctx.beginPath();
    ctx.moveTo(-50, 50);
    ctx.bezierCurveTo(-90, 70, -130, 40, -130, 0);
    ctx.bezierCurveTo(-128, -15, -110, -10, -100, 10);
    ctx.bezierCurveTo(-85, 30, -60, 50, -45, 45);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // -- Tail flame --
    const flamePulse = 0.7 + 0.5 * Math.sin(t * 8);
    ctx.save();
    ctx.translate(-130, 0);
    ctx.beginPath();
    ctx.moveTo(-15, 10);
    ctx.quadraticCurveTo(-5, -50 * flamePulse, 8, -40 * flamePulse);
    ctx.quadraticCurveTo(15, -28 * flamePulse, 18, 10);
    ctx.closePath();
    ctx.fillStyle = '#FF4500';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-8, 8);
    ctx.quadraticCurveTo(0, -30 * flamePulse, 5, -22 * flamePulse);
    ctx.quadraticCurveTo(9, -14 * flamePulse, 10, 8);
    ctx.closePath();
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    ctx.restore();

    // -- Legs --
    for (const lx of [-28, 28]) {
      ctx.beginPath();
      ctx.moveTo(lx - 16, 85);
      ctx.lineTo(lx + 16, 85);
      ctx.lineTo(lx + 18, 130);
      ctx.lineTo(lx - 18, 130);
      ctx.closePath();
      ctx.fillStyle = bodyColor;
      ctx.fill();
      ctx.stroke();

      for (let c = 0; c < 3; c++) {
        const clawX = lx - 12 + c * 12;
        ctx.beginPath();
        ctx.moveTo(clawX - 4, 130);
        ctx.lineTo(clawX + 4, 130);
        ctx.lineTo(clawX, 140);
        ctx.closePath();
        ctx.fillStyle = '#cccccc';
        ctx.fill();
      }
    }

    // -- Body (big and proud) --
    ctx.beginPath();
    ctx.moveTo(-60, -70);
    ctx.lineTo(60, -70);
    ctx.quadraticCurveTo(70, -65, 68, -40);
    ctx.lineTo(52, 85);
    ctx.lineTo(-52, 85);
    ctx.lineTo(-68, -40);
    ctx.quadraticCurveTo(-70, -65, -60, -70);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.stroke();

    // -- Belly --
    ctx.beginPath();
    ctx.ellipse(4, 15, 34, 50, 0, 0, Math.PI * 2);
    ctx.fillStyle = bellyColor;
    ctx.fill();

    // -- Arms --
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 60, -20);
      ctx.rotate(side * 0.15);
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(side * 38, -18);
      ctx.lineTo(side * 42, -6);
      ctx.lineTo(side * 35, 8);
      ctx.lineTo(0, 12);
      ctx.closePath();
      ctx.fillStyle = bodyColor;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // -- Neck --
    ctx.beginPath();
    ctx.moveTo(-35, -70);
    ctx.lineTo(35, -70);
    ctx.lineTo(25, -95);
    ctx.lineTo(-25, -95);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();

    // -- Head --
    ctx.beginPath();
    ctx.moveTo(-40, -90);
    ctx.quadraticCurveTo(-50, -95, -52, -110);
    ctx.lineTo(-48, -135);
    ctx.quadraticCurveTo(-45, -148, -28, -148);
    ctx.lineTo(28, -148);
    ctx.quadraticCurveTo(45, -148, 48, -135);
    ctx.lineTo(52, -110);
    ctx.quadraticCurveTo(50, -95, 40, -90);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.stroke();

    // -- Snout --
    ctx.beginPath();
    ctx.moveTo(32, -115);
    ctx.lineTo(65, -120);
    ctx.lineTo(62, -105);
    ctx.lineTo(32, -100);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.stroke();

    // -- Horns (two small ones) --
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 15, -148);
      ctx.lineTo(side * 20 + side * 10, -180);
      ctx.lineTo(side * 25, -148);
      ctx.closePath();
      ctx.fillStyle = bodyColor;
      ctx.fill();
      ctx.stroke();
    }

    // -- Eyes (determined) --
    for (const side of [-1, 1]) {
      const eyeX = side * 18;
      const eyeY = -122;

      ctx.beginPath();
      ctx.ellipse(eyeX, eyeY, 9, 7, side * -0.1, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.stroke();

      // Blue-ish pupil
      ctx.beginPath();
      ctx.ellipse(eyeX + side * 2, eyeY, 5, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#2266AA';
      ctx.fill();

      // Highlight
      ctx.beginPath();
      ctx.arc(eyeX + side * 4, eyeY - 2, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }

    // -- Front wing (left, on top) --
    this._drawSimpleWing(ctx, 1, wingSpread, wingFlap, wingColor, 1.0);

    ctx.restore();
  }

  /** Phase 5: "MEGA EVOLUTION" — mega stone, DNA helix, MCX reveal */
  private _renderMegaEvolution(ctx: CanvasRenderingContext2D): void {
    const t = this.phaseLocalTime;

    // Blue aura behind everything
    this._drawBlueAura(ctx, this.cx, this.cy + 40, Math.min(t * 0.3, 1));

    // Mega stone (appears 0-3s of this phase)
    if (this.megaStoneAlpha > 0.01) {
      this._drawMegaStone(ctx, this.cx, this.cy - 100, this.megaStoneAlpha);
    }

    // DNA helix (0-3s)
    if (t < 3 && t > 0.5) {
      this._drawDNAHelix(ctx, this.cx, this.cy, t);
    }

    // Light streams from mega stone to character (2-3s)
    if (t >= 2 && t < 3) {
      this._drawLightStreams(ctx, this.cx, this.cy - 100, this.cx, this.cy + 40, (t - 2));
    }

    // MCX character (fades in from ~4s)
    if (this.mcxAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.mcxAlpha;
      this.mcx.render(ctx, this.cx, this.cy + 40, this.mcxScale);
      ctx.globalAlpha = 1;
      ctx.restore();

      // Red eye glow bloom (extra dramatic)
      if (this.mcxAlpha > 0.5 && t >= 5) {
        this._drawEyeGlowBloom(ctx, this.cx, this.cy + 40, this.mcxScale, t);
      }
    }
  }

  /** Phase 6: "Title" — MCX hovers, title fades in */
  private _renderTitle(ctx: CanvasRenderingContext2D): void {
    // Blue aura
    this._drawBlueAura(ctx, this.cx, this.cy + 40, 1.0);

    // MCX in idle pose
    this.mcx.render(ctx, this.cx, this.cy + 40, 0.75);

    // Title text
    this._renderTitleText(ctx);
  }

  // -------------------------------------------------------------------------
  // Shared drawing helpers
  // -------------------------------------------------------------------------

  /** Dark vignette overlay */
  private _drawVignette(ctx: CanvasRenderingContext2D, intensity: number): void {
    const grad = ctx.createRadialGradient(
      this.cx, this.cy, DESIGN_WIDTH * 0.15,
      this.cx, this.cy, DESIGN_WIDTH * 0.7,
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  }

  /** Warm orange glow behind a character */
  private _drawWarmGlow(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, radius: number, alpha: number,
  ): void {
    const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, radius);
    grad.addColorStop(0, `rgba(240, 128, 48, ${alpha})`);
    grad.addColorStop(0.6, `rgba(255, 100, 20, ${alpha * 0.4})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  }

  /** Blue MCX aura glow */
  private _drawBlueAura(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, intensity: number,
  ): void {
    const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 450 * intensity);
    grad.addColorStop(0, `rgba(55, 177, 226, ${0.25 * intensity})`);
    grad.addColorStop(0.4, `rgba(26, 95, 196, ${0.15 * intensity})`);
    grad.addColorStop(0.7, `rgba(26, 26, 80, ${0.08 * intensity})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  }

  /** Simplified wing for pre-evolution Charizard form */
  private _drawSimpleWing(
    ctx: CanvasRenderingContext2D,
    side: number,          // 1 = front/right, -1 = back/left
    spread: number,        // 0-1 spread progress
    flapAngle: number,     // oscillation
    wingColor: string,
    scaleMultiplier: number,
  ): void {
    ctx.save();

    const ws = scaleMultiplier;
    const anchorX = side * 55;
    const anchorY = -50;
    ctx.translate(anchorX, anchorY);
    ctx.rotate(side * (spread * 0.3 + flapAngle));

    // Wing membrane (bat-like triangle)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(side * 40 * ws, -55 * ws * spread);
    ctx.lineTo(side * 95 * ws, -115 * ws * spread);
    ctx.lineTo(side * 140 * ws, -75 * ws * spread);
    ctx.lineTo(side * 155 * ws, -20 * ws * spread);
    ctx.lineTo(side * 120 * ws, 25 * ws);
    ctx.lineTo(side * 60 * ws, 35 * ws);
    ctx.lineTo(0, 15 * ws);
    ctx.closePath();

    ctx.fillStyle = wingColor;
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = OL;
    ctx.stroke();

    // Wing bone lines
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(side * 95 * ws, -115 * ws * spread);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(side * 155 * ws, -20 * ws * spread);
    ctx.stroke();

    ctx.restore();
  }

  /** Pulsing mega stone with rainbow shimmer */
  private _drawMegaStone(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, alpha: number,
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = alpha;

    const pulse = 0.9 + 0.1 * Math.sin(this.time * 5);
    const radius = 35 * pulse;

    // Outer glow
    ctx.save();
    ctx.shadowColor = '#7B68EE';
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(123, 104, 238, 0.2)';
    ctx.fill();
    ctx.restore();

    // Stone body with rainbow shimmer
    const shimmerAngle = this.megaStoneAngle;
    const grad = ctx.createLinearGradient(
      Math.cos(shimmerAngle) * radius, Math.sin(shimmerAngle) * radius,
      -Math.cos(shimmerAngle) * radius, -Math.sin(shimmerAngle) * radius,
    );
    grad.addColorStop(0, '#FF69B4');
    grad.addColorStop(0.2, '#7B68EE');
    grad.addColorStop(0.4, '#00BFFF');
    grad.addColorStop(0.6, '#FFD700');
    grad.addColorStop(0.8, '#FF69B4');
    grad.addColorStop(1, '#7B68EE');

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Inner bright core
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // DNA-like symbol etched inside
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -15);
    ctx.bezierCurveTo(-4, -5, 4, -5, 8, -15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8, 15);
    ctx.bezierCurveTo(-4, 5, 4, 5, 8, 15);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** DNA double-helix animation */
  private _drawDNAHelix(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, t: number,
  ): void {
    ctx.save();
    ctx.translate(cx, cy);

    const helixAlpha = Math.min(1, (t - 0.5) * 1.5) * Math.max(0, 1 - (t - 2) * 2);
    if (helixAlpha < 0.01) { ctx.restore(); return; }
    ctx.globalAlpha = helixAlpha * 0.6;

    const height = 300;
    const halfH = height / 2;
    const amplitude = 60;
    const speed = this.dnaHelixPhase;
    const segments = 40;

    for (let strand = 0; strand < 2; strand++) {
      const offset = strand * Math.PI;
      ctx.beginPath();
      ctx.strokeStyle = strand === 0 ? '#37B1E2' : '#7B68EE';
      ctx.lineWidth = 3;

      for (let i = 0; i <= segments; i++) {
        const frac = i / segments;
        const y = -halfH + frac * height;
        const x = Math.sin(frac * Math.PI * 4 + speed + offset) * amplitude;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Cross-rungs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const frac = (i + 0.5) / 10;
      const y = -halfH + frac * height;
      const x1 = Math.sin(frac * Math.PI * 4 + speed) * amplitude;
      const x2 = Math.sin(frac * Math.PI * 4 + speed + Math.PI) * amplitude;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** Light streams connecting mega stone to character */
  private _drawLightStreams(
    ctx: CanvasRenderingContext2D,
    fromX: number, fromY: number,
    toX: number, toY: number,
    progress: number,
  ): void {
    ctx.save();

    const streamCount = 6;
    const alpha = Math.min(1, progress * 2) * Math.max(0, 1 - (progress - 0.7) * 3);
    if (alpha < 0.01) { ctx.restore(); return; }

    for (let i = 0; i < streamCount; i++) {
      const angle = (i / streamCount) * Math.PI * 2 + this.time * 3;
      const spread = 40;

      const sx = fromX + Math.cos(angle) * spread * 0.5;
      const sy = fromY + Math.sin(angle) * spread * 0.5;
      const ex = toX + Math.cos(angle + Math.PI) * spread;
      const ey = toY + Math.sin(angle + Math.PI) * spread * 0.5;

      // Stream as a curved line
      const midX = (sx + ex) / 2 + Math.sin(this.time * 5 + i) * 30;
      const midY = (sy + ey) / 2;

      const grad = ctx.createLinearGradient(sx, sy, ex, ey);
      grad.addColorStop(0, `rgba(123, 104, 238, ${alpha * 0.8})`);
      grad.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.6})`);
      grad.addColorStop(1, `rgba(55, 177, 226, ${alpha * 0.8})`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 2 + Math.sin(this.time * 8 + i * 2) * 1;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(midX, midY, ex * progress + sx * (1 - progress), ey * progress + sy * (1 - progress));
      ctx.stroke();
    }

    ctx.restore();
  }

  /** Extra dramatic red eye glow bloom for MCX during mega evolution */
  private _drawEyeGlowBloom(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, scale: number, t: number,
  ): void {
    const pulse = 0.7 + 0.3 * Math.sin(t * 6);
    const headY = cy - 130 * scale;
    const glowR = 30 * scale * pulse;

    // Two eye positions (approximate from Charizard entity)
    for (const eyeOffsetX of [12, 38]) {
      const eyeX = cx + eyeOffsetX * scale;
      const eyeY = headY - 4 * scale;

      ctx.save();
      ctx.shadowColor = '#ff1a1a';
      ctx.shadowBlur = 50 * scale * pulse;
      ctx.globalAlpha = 0.4 * pulse;
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, glowR, 0, Math.PI * 2);
      ctx.fillStyle = '#ff1a1a';
      ctx.fill();
      ctx.restore();
    }
  }

  /** Render title text and subtitle */
  private _renderTitleText(ctx: CanvasRenderingContext2D): void {
    if (this.titleAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.titleAlpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Title shadow (for depth)
      ctx.shadowColor = 'rgba(55, 177, 226, 0.5)';
      ctx.shadowBlur = 30;

      // Main title
      ctx.font = `bold ${FONT.title}px system-ui`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('MEGA CHARIZARD ACADEMY', this.cx, 140);

      // Second pass for glow
      ctx.shadowBlur = 60;
      ctx.shadowColor = 'rgba(55, 177, 226, 0.3)';
      ctx.fillText('MEGA CHARIZARD ACADEMY', this.cx, 140);

      ctx.shadowBlur = 0;
      ctx.restore();
    }

    if (this.subtitleAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.subtitleAlpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${FONT.subtitle}px system-ui`;
      ctx.fillStyle = '#91CCEC';
      ctx.fillText('Welcome, Trainers!', this.cx, 220);
      ctx.restore();
    }
  }

  // -------------------------------------------------------------------------
  // Completion
  // -------------------------------------------------------------------------

  private _completeSequence(): void {
    if (this.completed) return;
    this.completed = true;
    this.gameContext.screenManager.goTo('hub');
  }
}
