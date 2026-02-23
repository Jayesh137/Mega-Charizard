// src/engine/screens/finale.ts
// Victory lap after completing a session of activities.
// Plays blast-burn video, then MCX sprite flies across trailing blue flames.
// "AMAZING TRAINING, TRAINERS!" title, then "Play Again?" prompt after ~5s.
// Any click/key restarts the session.

import type { GameScreen, GameContext } from '../screen-manager';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../../config/constants';
import { theme } from '../../config/theme';
import { Background } from '../entities/backgrounds';
import { ParticlePool, setActivePool } from '../entities/particles';
import { SpriteAnimator } from '../entities/sprite-animator';
import { SPRITES } from '../../config/sprites';
import { VoiceSystem } from '../voice';
import { VIDEOS } from '../../config/videos';
import { randomRange } from '../utils/math';
import { settings } from '../../state/settings.svelte';
import { session } from '../../state/session.svelte';

export class FinaleScreen implements GameScreen {
  private bg = new Background(60); // many stars for celebratory feel
  private particles = new ParticlePool();
  private sprite = new SpriteAnimator(SPRITES['charizard-megax']);
  private elapsed = 0;
  private spriteX = -300; // start offscreen left
  private showPlayAgain = false;
  private gameContext!: GameContext;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  enter(ctx: GameContext): void {
    this.gameContext = ctx;
    this.elapsed = 0;
    this.spriteX = -300;
    this.showPlayAgain = false;
    setActivePool(this.particles);
    this.particles.clear();

    // Play blast-burn video clip over the finale screen
    ctx.events.emit({ type: 'play-video', src: VIDEOS.blastBurn });

    // Play Ash "amazing" voice clip
    const audio = (ctx as any).audio;
    if (audio) {
      const voice = new VoiceSystem(audio);
      voice.ash('ash-amazing');
    }
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.bg.update(dt);
    this.particles.update(dt);
    this.sprite.update(dt);

    // MCX sprite flies across the screen
    this.spriteX += 200 * dt;

    // Spawn trailing BLUE flame particles behind sprite (MCX blue fire)
    if (this.spriteX < DESIGN_WIDTH + 300) {
      this.particles.flame(
        this.spriteX - 100,
        DESIGN_HEIGHT * 0.35,
        3,
        ['#37B1E2', '#91CCEC', '#5ED4FC', '#FFFFFF'],
        60,
      );
    }

    // Celebration burst particles periodically — blue + gold theme
    if (Math.random() < 0.1) {
      const burstX = randomRange(DESIGN_WIDTH * 0.05, DESIGN_WIDTH * 0.95);
      const burstY = randomRange(DESIGN_HEIGHT * 0.05, DESIGN_HEIGHT * 0.6);
      const colors = [
        '#37B1E2',   // MCX blue
        '#91CCEC',   // light blue
        '#5ED4FC',   // cyan blue
        '#FFD700',   // gold
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

    // Blue celebratory glow behind the flight path (MCX blue flames)
    const glowY = DESIGN_HEIGHT * 0.35;
    const glowGrad = ctx.createRadialGradient(
      DESIGN_WIDTH / 2, glowY, 50,
      DESIGN_WIDTH / 2, glowY, 500,
    );
    glowGrad.addColorStop(0, 'rgba(55, 177, 226, 0.18)');
    glowGrad.addColorStop(0.5, 'rgba(94, 212, 252, 0.08)');
    glowGrad.addColorStop(1, 'rgba(55, 177, 226, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Draw MCX sprite flying across with a gentle sine-wave bob
    const spriteY = DESIGN_HEIGHT * 0.35 + Math.sin(this.elapsed * 2) * 20;
    this.sprite.render(ctx, this.spriteX, spriteY, 8);

    // Particles on top of sprite
    this.particles.render(ctx);

    // --- Title text ---
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title shadow for depth
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.font = 'bold 76px system-ui';
    ctx.fillText('AMAZING TRAINING, TRAINERS!', DESIGN_WIDTH / 2 + 3, DESIGN_HEIGHT * 0.58 + 3);

    // Title
    ctx.fillStyle = theme.palette.ui.bannerGold;
    ctx.fillText('AMAZING TRAINING, TRAINERS!', DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.58);

    // Subtitle — gem collection acknowledgment
    ctx.fillStyle = 'rgba(94, 212, 252, 0.9)';
    ctx.font = 'bold 42px system-ui';
    ctx.fillText('You collected all 4 Power Gems!', DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.66);

    // "You're the best!" with trainer names
    const littleName = settings.littleTrainerName;
    const bigName = settings.bigTrainerName;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 38px system-ui';
    ctx.fillText(`${littleName} & ${bigName} — You're the best!`, DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.73);

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
