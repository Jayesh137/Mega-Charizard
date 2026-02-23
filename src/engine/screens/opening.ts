// src/engine/screens/opening.ts
// Opening screen: video clip with sprite-based fallback for mega evolution intro.
// First visit: tries video, falls back to sprite sequence if video file missing.
// Return visits: skip straight to hub.

import type { GameScreen, GameContext } from '../screen-manager';
import { Background } from '../entities/backgrounds';
import { ParticlePool, setActivePool } from '../entities/particles';
import { SpriteAnimator } from '../entities/sprite-animator';
import { SPRITES } from '../../config/sprites';
import { VIDEOS } from '../../config/videos';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../../config/constants';
import { settings } from '../../state/settings.svelte';

type Phase = 'video' | 'charmander' | 'charmeleon' | 'charizard' | 'flash' | 'megax' | 'title' | 'done';

export class OpeningScreen implements GameScreen {
  private bg = new Background();
  private particles = new ParticlePool();
  private gameContext!: GameContext;
  private phase: Phase = 'video';
  private phaseTime = 0;
  private flashAlpha = 0;

  // Sprites for fallback animation
  private sprites: Record<string, SpriteAnimator> = {
    charmander: new SpriteAnimator(SPRITES.charmander),
    charmeleon: new SpriteAnimator(SPRITES.charmeleon),
    charizard: new SpriteAnimator(SPRITES.charizard),
    megax: new SpriteAnimator(SPRITES['charizard-megax']),
  };

  enter(ctx: GameContext): void {
    this.gameContext = ctx;
    this.phaseTime = 0;
    this.flashAlpha = 0;
    setActivePool(this.particles);
    this.particles.clear();

    // Return visits: skip to hub
    if (!settings.isFirstVisit) {
      ctx.screenManager.goTo('hub');
      return;
    }

    // First visit: try video first
    this.phase = 'video';
    ctx.events.emit({ type: 'play-video', src: VIDEOS.megaEvolution, onEnd: 'hub' });

    // If video doesn't play (file missing), start sprite fallback after 500ms
    setTimeout(() => {
      if (this.phase === 'video') {
        this.phase = 'charmander';
        this.phaseTime = 0;
      }
    }, 500);

    settings.isFirstVisit = false;
  }

  update(dt: number): void {
    if (this.phase === 'video' || this.phase === 'done') return;

    this.phaseTime += dt;
    this.bg.update(dt);
    this.particles.update(dt);

    // Update all sprites
    for (const sprite of Object.values(this.sprites)) {
      sprite.update(dt);
    }

    // Phase transitions (sprite fallback only)
    switch (this.phase) {
      case 'charmander':
        if (this.phaseTime >= 2.0) { this.phase = 'charmeleon'; this.phaseTime = 0; }
        break;
      case 'charmeleon':
        if (this.phaseTime >= 2.0) { this.phase = 'charizard'; this.phaseTime = 0; }
        break;
      case 'charizard':
        if (this.phaseTime >= 2.0) { this.phase = 'flash'; this.phaseTime = 0; this.flashAlpha = 1; }
        break;
      case 'flash':
        this.flashAlpha = 1 - this.phaseTime / 0.5;
        if (this.phaseTime >= 0.5) { this.phase = 'megax'; this.phaseTime = 0; }
        break;
      case 'megax':
        if (this.phaseTime >= 3.0) { this.phase = 'title'; this.phaseTime = 0; }
        break;
      case 'title':
        if (this.phaseTime >= 2.0) {
          this.phase = 'done';
          this.gameContext.screenManager.goTo('hub');
        }
        break;
    }

    // Ambient blue flame particles
    if (Math.random() < 0.2) {
      this.particles.flame(
        DESIGN_WIDTH / 2 + (Math.random() - 0.5) * 200,
        DESIGN_HEIGHT * 0.7,
        1,
        ['#37B1E2', '#E0F7FF', '#FFFFFF'],
        30,
      );
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.bg.render(ctx);

    if (this.phase === 'video' || this.phase === 'done') return; // Video overlay handles rendering

    const cx = DESIGN_WIDTH / 2;
    const cy = DESIGN_HEIGHT * 0.5;
    const scale = 8; // Pixel art upscaling

    // Draw current evolution stage
    switch (this.phase) {
      case 'charmander':
        this.sprites.charmander.render(ctx, cx, cy, scale);
        this.drawLabel(ctx, 'Charmander');
        break;
      case 'charmeleon':
        this.sprites.charmeleon.render(ctx, cx, cy, scale);
        this.drawLabel(ctx, 'Charmeleon');
        break;
      case 'charizard':
        this.sprites.charizard.render(ctx, cx, cy, scale);
        this.drawLabel(ctx, 'Charizard');
        break;
      case 'flash':
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, this.flashAlpha)})`;
        ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
        ctx.restore();
        break;
      case 'megax':
      case 'title':
        this.sprites.megax.render(ctx, cx, cy, scale);
        if (this.phase === 'title') {
          this.drawTitle(ctx);
        }
        break;
    }

    this.particles.render(ctx);

    // Skip hint
    if (this.phaseTime > 1.0) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText('Tap to skip', DESIGN_WIDTH - 60, DESIGN_HEIGHT - 40);
      ctx.restore();
    }
  }

  private drawLabel(ctx: CanvasRenderingContext2D, name: string): void {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px system-ui';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(55, 177, 226, 0.8)';
    ctx.shadowBlur = 20;
    ctx.fillText(name, DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.8);
    ctx.restore();
  }

  private drawTitle(ctx: CanvasRenderingContext2D): void {
    const alpha = Math.min(this.phaseTime / 1.0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px system-ui';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(55, 177, 226, 0.8)';
    ctx.shadowBlur = 30;
    ctx.fillText('MEGA CHARIZARD', DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.25);
    ctx.fillText('ACADEMY', DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.35);
    ctx.restore();
  }

  exit(): void {
    this.particles.clear();
  }

  handleClick(_x: number, _y: number): void {
    // Skip to hub on click during sprite fallback
    if (this.phase !== 'video' && this.phase !== 'done') {
      this.phase = 'done';
      this.gameContext.screenManager.goTo('hub');
    }
  }

  handleKey(_key: string): void {
    // Skip to hub on any key during sprite fallback
    if (this.phase !== 'video' && this.phase !== 'done') {
      this.phase = 'done';
      this.gameContext.screenManager.goTo('hub');
    }
  }
}
