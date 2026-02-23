// src/engine/screens/loading.ts
import type { GameScreen, GameContext } from '../screen-manager';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../../config/constants';
import { theme } from '../../config/theme';

export class LoadingCanvasScreen implements GameScreen {
  private time = 0;

  enter(_ctx: GameContext): void {
    this.time = 0;
  }

  update(dt: number): void {
    this.time += dt;
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Dark background
    ctx.fillStyle = theme.palette.background.dark;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Pulsing ember glow in center (never a frozen black screen)
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 1.5);
    const glowRadius = 200 + pulse * 100;
    const glowAlpha = 0.15 + pulse * 0.1;

    const glow = ctx.createRadialGradient(
      DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, 20,
      DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, glowRadius,
    );
    glow.addColorStop(0, `rgba(55, 177, 226, ${glowAlpha})`);
    glow.addColorStop(0.5, `rgba(26, 95, 196, ${glowAlpha * 0.5})`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // MCX silhouette with subtle blue outline
    this.drawSilhouette(ctx, DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, pulse);
  }

  private drawSilhouette(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    pulse: number,
  ): void {
    const scale = 0.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // Body silhouette - dark shape with pulsing blue outline
    ctx.fillStyle = '#0d0d2a';
    ctx.strokeStyle = `rgba(55, 177, 226, ${0.2 + pulse * 0.15})`;
    ctx.lineWidth = 4;

    // Torso
    ctx.beginPath();
    ctx.ellipse(0, 20, 80, 110, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.ellipse(0, -110, 55, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Left wing
    ctx.beginPath();
    ctx.moveTo(-60, -20);
    ctx.lineTo(-200, -120);
    ctx.lineTo(-220, -40);
    ctx.lineTo(-180, 20);
    ctx.lineTo(-60, 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right wing (mirrored)
    ctx.beginPath();
    ctx.moveTo(60, -20);
    ctx.lineTo(200, -120);
    ctx.lineTo(220, -40);
    ctx.lineTo(180, 20);
    ctx.lineTo(60, 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Left horn
    ctx.beginPath();
    ctx.moveTo(-30, -140);
    ctx.lineTo(-50, -200);
    ctx.lineTo(-20, -160);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right horn
    ctx.beginPath();
    ctx.moveTo(30, -140);
    ctx.lineTo(50, -200);
    ctx.lineTo(20, -160);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing red eyes
    const eyeGlow = 0.5 + pulse * 0.5;
    ctx.shadowColor = '#ff1a1a';
    ctx.shadowBlur = 15 * eyeGlow;
    ctx.fillStyle = `rgba(255, 26, 26, ${eyeGlow})`;
    ctx.beginPath();
    ctx.ellipse(-20, -115, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(20, -115, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Tail
    ctx.strokeStyle = `rgba(55, 177, 226, ${0.2 + pulse * 0.15})`;
    ctx.fillStyle = '#0d0d2a';
    ctx.beginPath();
    ctx.moveTo(40, 80);
    ctx.bezierCurveTo(80, 120, 120, 160, 100, 200);
    ctx.bezierCurveTo(90, 180, 70, 130, 30, 100);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  exit(): void {}
  handleClick(_x: number, _y: number): void {}
  handleKey(_key: string): void {}
}
