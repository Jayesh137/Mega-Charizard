// src/engine/screens/finale.ts
// Victory lap after completing a session of activities.
// Charizard flies across the sky trailing blue flames; celebratory particles.
// "GREAT TRAINING, TRAINERS!" title, then "Play Again?" prompt after ~5s.
// Any click/key restarts the session.

import type { GameScreen, GameContext } from '../screen-manager';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../../config/constants';
import { theme } from '../../config/theme';
import { Background } from '../entities/backgrounds';
import { ParticlePool } from '../entities/particles';
import { Charizard } from '../entities/charizard';
import { TweenManager } from '../utils/tween';
import { randomRange } from '../utils/math';
import { settings } from '../../state/settings.svelte';
import { session } from '../../state/session.svelte';

export class FinaleScreen implements GameScreen {
  private bg = new Background(60); // many stars for celebratory feel
  private particles = new ParticlePool();
  private tweens = new TweenManager();
  private charizard = new Charizard(this.particles, this.tweens);
  private elapsed = 0;
  private charizardX = -300; // start offscreen left
  private showPlayAgain = false;
  private gameContext!: GameContext;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  enter(ctx: GameContext): void {
    this.gameContext = ctx;
    this.elapsed = 0;
    this.charizardX = -300;
    this.showPlayAgain = false;
    this.particles.clear();
    this.tweens.clear();
    this.charizard.setPose('fly');
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.bg.update(dt);
    this.particles.update(dt);
    this.tweens.update(dt);
    this.charizard.update(dt);

    // Charizard flies across the screen
    this.charizardX += 200 * dt;

    // Spawn trailing flame particles behind Charizard
    if (this.charizardX < DESIGN_WIDTH + 300) {
      this.particles.flame(
        this.charizardX - 100,
        DESIGN_HEIGHT * 0.35,
        3,
        [theme.palette.fire.mid, theme.palette.fire.spark, theme.palette.fire.outer],
        60,
      );
    }

    // Celebration burst particles periodically
    if (Math.random() < 0.1) {
      const burstX = randomRange(DESIGN_WIDTH * 0.05, DESIGN_WIDTH * 0.95);
      const burstY = randomRange(DESIGN_HEIGHT * 0.05, DESIGN_HEIGHT * 0.6);
      const colors = [
        theme.palette.celebration.gold,
        theme.palette.celebration.hotOrange,
        theme.palette.celebration.cyan,
      ];
      this.particles.burst(
        burstX, burstY, 5,
        colors[Math.floor(Math.random() * colors.length)],
        80, 1.0,
      );
    }

    // Show "Play Again?" prompt after 5 seconds
    if (this.elapsed > 5) {
      this.showPlayAgain = true;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.bg.render(ctx);

    // Warm celebratory glow behind the flight path
    const glowY = DESIGN_HEIGHT * 0.35;
    const glowGrad = ctx.createRadialGradient(
      DESIGN_WIDTH / 2, glowY, 50,
      DESIGN_WIDTH / 2, glowY, 500,
    );
    glowGrad.addColorStop(0, 'rgba(255, 215, 0, 0.15)');
    glowGrad.addColorStop(0.5, 'rgba(240, 128, 48, 0.08)');
    glowGrad.addColorStop(1, 'rgba(240, 128, 48, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Draw Charizard flying across with a gentle sine-wave bob
    const charizardY = DESIGN_HEIGHT * 0.35 + Math.sin(this.elapsed * 2) * 20;
    this.charizard.render(ctx, this.charizardX, charizardY, 0.5);

    // Particles on top of Charizard
    this.particles.render(ctx);

    // --- Title text ---
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title shadow for depth
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.font = 'bold 80px system-ui';
    ctx.fillText('GREAT TRAINING, TRAINERS!', DESIGN_WIDTH / 2 + 3, DESIGN_HEIGHT * 0.6 + 3);

    // Title
    ctx.fillStyle = theme.palette.ui.bannerGold;
    ctx.fillText('GREAT TRAINING, TRAINERS!', DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.6);

    // Subtitle with actual trainer names
    const littleName = settings.littleTrainerName;
    const bigName = settings.bigTrainerName;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 40px system-ui';
    ctx.fillText(`${littleName} & ${bigName} did amazing!`, DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.68);

    // "Play Again?" prompt (pulses gently)
    if (this.showPlayAgain) {
      const pulseAlpha = 0.5 + 0.5 * Math.sin(this.elapsed * 3);
      ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha})`;
      ctx.font = 'bold 32px system-ui';
      ctx.fillText('Click anywhere to play again', DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.82);
    }

    ctx.restore();
  }

  exit(): void {
    this.particles.clear();
    this.tweens.clear();
  }

  handleClick(_x: number, _y: number): void {
    if (this.showPlayAgain) {
      session.reset();
      this.gameContext.screenManager.goTo('hub');
    }
  }

  handleKey(_key: string): void {
    if (this.showPlayAgain) {
      session.reset();
      this.gameContext.screenManager.goTo('hub');
    }
  }
}
