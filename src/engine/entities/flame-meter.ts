// src/engine/entities/flame-meter.ts
// Renders the Mega Flame Charge bar in games.
// Triggers MCX spectacle events at 25/50/75/100% thresholds.

import { session } from '../../state/session.svelte';
import { DESIGN_WIDTH } from '../../config/constants';

export type FlameEvent = 'wing-flare' | 'flame-burst' | 'aura-pulse' | 'mega-roar' | null;

export class FlameMeter {
  private displayCharge = 0; // smoothed display value

  /** Add charge. Returns a threshold event if one was crossed. */
  addCharge(amount: number): FlameEvent {
    session.flameCharge = Math.min(session.flameCharge + amount, session.flameChargeMax);
    const percent = (session.flameCharge / session.flameChargeMax) * 100;

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
    // Smooth display toward actual value
    const target = session.flameCharge;
    this.displayCharge += (target - this.displayCharge) * dt * 5;
  }

  /** Render a small meter bar at the top of the screen */
  render(ctx: CanvasRenderingContext2D): void {
    const barWidth = 300;
    const barHeight = 16;
    const x = DESIGN_WIDTH - barWidth - 40;
    const y = 30;
    const fill = this.displayCharge / session.flameChargeMax;

    ctx.save();
    // Background
    ctx.fillStyle = 'rgba(20, 15, 40, 0.6)';
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 8);
    ctx.fill();

    // Fill
    if (fill > 0) {
      const grad = ctx.createLinearGradient(x, y, x + barWidth * fill, y);
      grad.addColorStop(0, '#37B1E2');
      grad.addColorStop(1, '#91CCEC');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth * fill, barHeight, 8);
      ctx.fill();
    }

    // Border
    ctx.strokeStyle = 'rgba(55, 177, 226, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 8);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#8888aa';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('MEGA CHARGE', x - 10, y + 12);
    ctx.restore();
  }
}
