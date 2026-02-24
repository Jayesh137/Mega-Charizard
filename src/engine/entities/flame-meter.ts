// src/engine/entities/flame-meter.ts
// Renders the Evolution Meter as a Mega Stone gem that fills with blue energy.
// Also retains flame-charge threshold events for in-game spectacle triggers.

import { session } from '../../state/session.svelte';
import { DESIGN_WIDTH } from '../../config/constants';

export type FlameEvent = 'wing-flare' | 'flame-burst' | 'aura-pulse' | 'mega-roar' | null;

// Stage marker labels at evolution thresholds
const STAGE_MARKERS = [
  { pct: 33, label: 'Charmeleon', color: '#FF6B35' },
  { pct: 66, label: 'Charizard', color: '#FFD700' },
  { pct: 100, label: 'Mega X', color: '#37B1E2' },
];

export class FlameMeter {
  private displayCharge = 0; // smoothed display value
  private time = 0;

  /** Add charge. Returns a threshold event if one was crossed. */
  addCharge(amount: number): FlameEvent {
    session.flameCharge = Math.min(session.flameCharge + amount, session.flameChargeMax);
    const percent = (session.flameCharge / session.flameChargeMax) * 100;

    // Also feed the evolution meter
    session.evolutionMeter = Math.min(session.evolutionMeter + amount, session.evolutionMeterMax);

    if (percent >= 100 && session.lastThreshold < 100) {
      session.lastThreshold = 100;
      return 'mega-roar';
    } else if (percent >= 75 && session.lastThreshold < 75) {
      session.lastThreshold = 75;
      return 'aura-pulse';
    } else if (percent >= 50 && session.lastThreshold < 50) {
      session.lastThreshold = 50;
      return 'flame-burst';
    } else if (percent >= 25 && session.lastThreshold < 25) {
      session.lastThreshold = 25;
      return 'wing-flare';
    }
    return null;
  }

  update(dt: number): void {
    this.time += dt;
    // Smooth display toward actual value
    const target = session.flameCharge;
    this.displayCharge += (target - this.displayCharge) * dt * 5;
  }

  /** Render the Mega Stone evolution meter at top-right of screen */
  render(ctx: CanvasRenderingContext2D): void {
    const centerX = DESIGN_WIDTH - 80;
    const centerY = 55;
    const gemH = 40; // half-height of diamond
    const gemW = 28; // half-width of diamond
    const fill = this.displayCharge / session.flameChargeMax;
    const evoPct = (session.evolutionMeter / session.evolutionMeterMax) * 100;

    ctx.save();

    // Glow behind gem — intensity scales with charge
    const glowIntensity = 0.08 + fill * 0.2;
    const glowGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 60 + fill * 20);
    glowGrad.addColorStop(0, `rgba(55, 177, 226, ${glowIntensity})`);
    glowGrad.addColorStop(1, 'rgba(55, 177, 226, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 60 + fill * 20, 0, Math.PI * 2);
    ctx.fill();

    // Diamond/gem shape — clip to fill from bottom
    ctx.save();

    // Draw full gem outline first (background)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - gemH);
    ctx.lineTo(centerX + gemW, centerY);
    ctx.lineTo(centerX, centerY + gemH);
    ctx.lineTo(centerX - gemW, centerY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(15, 10, 30, 0.7)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(55, 177, 226, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Filled portion — clip to gem shape, fill from bottom
    if (fill > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - gemH);
      ctx.lineTo(centerX + gemW, centerY);
      ctx.lineTo(centerX, centerY + gemH);
      ctx.lineTo(centerX - gemW, centerY);
      ctx.closePath();
      ctx.clip();

      const fillTop = centerY + gemH - fill * gemH * 2;
      const fillGrad = ctx.createLinearGradient(centerX, centerY + gemH, centerX, fillTop);
      fillGrad.addColorStop(0, '#1A5C8A');
      fillGrad.addColorStop(0.5, '#37B1E2');
      fillGrad.addColorStop(1, '#91CCEC');
      ctx.fillStyle = fillGrad;
      ctx.fillRect(centerX - gemW - 2, fillTop, gemW * 2 + 4, gemH * 2 + 4);

      // Animated shimmer line
      const shimmerY = centerY + gemH - (this.time * 30 % (gemH * 2));
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - gemW, shimmerY);
      ctx.lineTo(centerX + gemW, shimmerY);
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    }

    // Bright gem outline on top
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - gemH);
    ctx.lineTo(centerX + gemW, centerY);
    ctx.lineTo(centerX, centerY + gemH);
    ctx.lineTo(centerX - gemW, centerY);
    ctx.closePath();
    ctx.strokeStyle = fill >= 1 ? '#FFD700' : 'rgba(55, 177, 226, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Stage marker dots along the side
    const barX = centerX - gemW - 20;
    for (const marker of STAGE_MARKERS) {
      const passed = evoPct >= marker.pct;
      const dotY = centerY + gemH - (marker.pct / 100) * gemH * 2;

      ctx.fillStyle = passed ? marker.color : 'rgba(60, 50, 80, 0.5)';
      ctx.beginPath();
      ctx.arc(barX, dotY, 4, 0, Math.PI * 2);
      ctx.fill();

      if (passed) {
        ctx.shadowColor = marker.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(barX, dotY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Tiny label
      ctx.fillStyle = passed ? marker.color : '#555566';
      ctx.font = '11px Fredoka, Nunito, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(marker.label, barX - 8, dotY + 4);
    }

    // "EVO" label below gem
    ctx.fillStyle = '#8888aa';
    ctx.font = 'bold 12px Fredoka, Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EVO', centerX, centerY + gemH + 16);

    ctx.restore();
  }
}
