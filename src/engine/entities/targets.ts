// src/engine/entities/targets.ts
// Reusable floating color-blob targets for mini-games.
// Each target drifts lazily, bounces off edges, pulses, and can escalate
// hints (bounce / glow+bounce) via the failsafe system.

import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../../config/constants';
import { randomRange } from '../utils/math';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Target {
  x: number;
  y: number;
  color: string;
  colorName: string;
  radius: number;
  vx: number;
  vy: number;
  alive: boolean;
  hintLevel: number; // 0=none, 1=bounce, 2=glow+bounce
  pulseTime: number;
  /** Internal: per-target wobble phase so blobs feel organic, not synced */
  wobblePhase: number;
  /** Scale multiplier animated on spawn (0 -> 1) and death (1 -> 0) */
  scale: number;
  /** Track whether this target is currently popping (death animation) */
  popping: boolean;
  popTimer: number;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createTarget(
  color: string,
  colorName: string,
  radius: number,
  driftSpeed: number,
): Target {
  // Position in safe area, avoiding edges and top/bottom margins
  const margin = radius + 160;
  return {
    x: randomRange(margin, DESIGN_WIDTH - margin),
    y: randomRange(margin, DESIGN_HEIGHT - margin),
    color,
    colorName,
    radius,
    vx: randomRange(-driftSpeed, driftSpeed) || driftSpeed * 0.5,
    vy: randomRange(-driftSpeed, driftSpeed) || driftSpeed * 0.5,
    alive: true,
    hintLevel: 0,
    pulseTime: 0,
    wobblePhase: randomRange(0, Math.PI * 2),
    scale: 0, // will animate in
    popping: false,
    popTimer: 0,
  };
}

// ---------------------------------------------------------------------------
// Spacing helper — push targets apart so they don't overlap on spawn
// ---------------------------------------------------------------------------

export function spreadTargets(targets: Target[], iterations = 8): void {
  const minDist = 250; // minimum px between centres at design resolution
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < targets.length; i++) {
      for (let j = i + 1; j < targets.length; j++) {
        const a = targets[i];
        const b = targets[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < minDist) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
          // Clamp back into safe area
          const m = 180;
          a.x = Math.max(m, Math.min(DESIGN_WIDTH - m, a.x));
          a.y = Math.max(m, Math.min(DESIGN_HEIGHT - m, a.y));
          b.x = Math.max(m, Math.min(DESIGN_WIDTH - m, b.x));
          b.y = Math.max(m, Math.min(DESIGN_HEIGHT - m, b.y));
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export function updateTarget(t: Target, dt: number): void {
  // Pop animation
  if (t.popping) {
    t.popTimer += dt;
    // Quick expand-then-shrink over 0.3s
    const popDur = 0.3;
    const p = t.popTimer / popDur;
    if (p < 0.35) {
      t.scale = 1 + p * 1.2; // expand to ~1.42x
    } else {
      t.scale = Math.max(0, 1.42 * (1 - (p - 0.35) / 0.65));
    }
    if (p >= 1) {
      t.alive = false;
      t.scale = 0;
    }
    return;
  }

  if (!t.alive) return;

  t.pulseTime += dt;

  // Animate spawn-in: grow from 0 to 1 over 0.4s
  if (t.scale < 1) {
    t.scale = Math.min(1, t.scale + dt * 2.5);
  }

  // Drift
  t.x += t.vx * dt;
  t.y += t.vy * dt;

  // Bounce off screen edges (with generous margin)
  const margin = 150;
  if (t.x < margin) { t.x = margin; t.vx = Math.abs(t.vx); }
  if (t.x > DESIGN_WIDTH - margin) { t.x = DESIGN_WIDTH - margin; t.vx = -Math.abs(t.vx); }
  if (t.y < margin) { t.y = margin; t.vy = Math.abs(t.vy); }
  if (t.y > DESIGN_HEIGHT - margin) { t.y = DESIGN_HEIGHT - margin; t.vy = -Math.abs(t.vy); }
}

// ---------------------------------------------------------------------------
// Render — juicy glow + body + wobble + hints
// ---------------------------------------------------------------------------

export function renderTarget(ctx: CanvasRenderingContext2D, t: Target): void {
  if (!t.alive && !t.popping) return;
  if (t.scale <= 0) return;

  const s = t.scale;

  // Organic wobble: radius oscillates slightly per-target
  const wobble = 1 + 0.04 * Math.sin(t.pulseTime * 2.5 + t.wobblePhase);
  const r = t.radius * s * wobble;

  // Hint: bounce offset (vertical sine bob)
  const bounceOffset =
    t.hintLevel > 0 ? Math.sin(t.pulseTime * 4) * 10 * s : 0;

  // Hint level 2: pulsing glow intensity
  const glowPulse =
    t.hintLevel >= 2 ? 0.5 + 0.5 * Math.sin(t.pulseTime * 5) : 0;

  const drawX = t.x;
  const drawY = t.y + bounceOffset;

  ctx.save();

  // --- Outer glow halo ---
  const glowRadius = r * 2.0;
  const glowAlpha = t.hintLevel >= 2 ? 'bb' : '50';
  const glow = ctx.createRadialGradient(drawX, drawY, r * 0.3, drawX, drawY, glowRadius);
  glow.addColorStop(0, t.color + glowAlpha);
  glow.addColorStop(0.6, t.color + '30');
  glow.addColorStop(1, t.color + '00');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(drawX, drawY, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // --- Extra bloom ring for hint level 2 ---
  if (t.hintLevel >= 2) {
    const bloomR = r * (1.5 + glowPulse * 0.5);
    ctx.save();
    ctx.globalAlpha = 0.2 + glowPulse * 0.3;
    ctx.strokeStyle = t.color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(drawX, drawY, bloomR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // --- Main body (3D-ish sphere gradient) ---
  const bodyGrad = ctx.createRadialGradient(
    drawX - r * 0.25,
    drawY - r * 0.25,
    r * 0.08,
    drawX,
    drawY,
    r,
  );
  bodyGrad.addColorStop(0, '#ffffff');
  bodyGrad.addColorStop(0.25, lightenColor(t.color, 40));
  bodyGrad.addColorStop(0.6, t.color);
  bodyGrad.addColorStop(1, darkenColor(t.color, 40));
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(drawX, drawY, r, 0, Math.PI * 2);
  ctx.fill();

  // --- Thick cartoon outline ---
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 5 * s;
  ctx.stroke();

  // --- Specular highlight (shiny blob feel) ---
  const specGrad = ctx.createRadialGradient(
    drawX - r * 0.3,
    drawY - r * 0.35,
    r * 0.05,
    drawX - r * 0.15,
    drawY - r * 0.2,
    r * 0.5,
  );
  specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
  specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = specGrad;
  ctx.beginPath();
  ctx.arc(drawX - r * 0.15, drawY - r * 0.2, r * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Hit Detection — generous hit area for small children
// ---------------------------------------------------------------------------

export function isTargetHit(t: Target, x: number, y: number): boolean {
  if (!t.alive || t.popping) return false;
  const dx = t.x - x;
  const dy = t.y - y;
  // 1.4x radius for forgiving touch area (toddler-friendly)
  return Math.sqrt(dx * dx + dy * dy) <= t.radius * 1.4;
}

// ---------------------------------------------------------------------------
// Color Helpers — lighten / darken hex colors for gradients
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}

function lightenColor(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + amount, g + amount, b + amount);
}

function darkenColor(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r - amount, g - amount, b - amount);
}
