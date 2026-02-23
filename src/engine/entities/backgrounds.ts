// src/engine/entities/backgrounds.ts
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../../config/constants';
import { theme } from '../../config/theme';
import { randomRange } from '../utils/math';

interface BackgroundStar {
  x: number;
  y: number;
  radius: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export class Background {
  private stars: BackgroundStar[] = [];
  private time = 0;

  // Offscreen canvas for static mountain silhouette
  private mountainCanvas: OffscreenCanvas | null = null;

  constructor(private starCount = 40) {
    this.generateStars();
    this.prerenderMountains();
  }

  private generateStars(): void {
    this.stars = Array.from({ length: this.starCount }, () => ({
      x: randomRange(0, DESIGN_WIDTH),
      y: randomRange(0, DESIGN_HEIGHT * 0.6),
      radius: randomRange(1, 3),
      twinkleSpeed: randomRange(0.5, 2),
      twinkleOffset: randomRange(0, Math.PI * 2),
    }));
  }

  private prerenderMountains(): void {
    if (typeof OffscreenCanvas === 'undefined') return;
    this.mountainCanvas = new OffscreenCanvas(DESIGN_WIDTH, DESIGN_HEIGHT);
    const ctx = this.mountainCanvas.getContext('2d')!;

    // Mountain silhouettes
    ctx.fillStyle = '#0d0d2a';
    ctx.beginPath();
    ctx.moveTo(0, DESIGN_HEIGHT);
    ctx.lineTo(0, 750);
    ctx.bezierCurveTo(200, 650, 400, 700, 500, 680);
    ctx.bezierCurveTo(650, 600, 750, 620, 900, 640);
    ctx.bezierCurveTo(1000, 580, 1150, 550, 1300, 600);
    ctx.bezierCurveTo(1450, 640, 1600, 620, 1700, 660);
    ctx.bezierCurveTo(1800, 690, 1920, 720, 1920, 720);
    ctx.lineTo(1920, DESIGN_HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  update(dt: number): void {
    this.time += dt;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { dark, mid, accent } = theme.palette.background;

    // Gradient background (never flat black — Rule 1 of dark theme)
    const grad = ctx.createRadialGradient(
      DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.4, 100,
      DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.4, DESIGN_HEIGHT,
    );
    grad.addColorStop(0, mid);
    grad.addColorStop(0.5, accent);
    grad.addColorStop(1, dark);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Mountains
    if (this.mountainCanvas) {
      ctx.drawImage(this.mountainCanvas, 0, 0);
    }

    // Stars with twinkle
    for (const star of this.stars) {
      const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(this.time * star.twinkleSpeed + star.twinkleOffset));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
