// src/engine/entities/charizard.ts
// Procedural Mega Charizard X entity -- accurate MCX design
// 14 canvas-drawn body parts, 8 animation poses, blue flames, red eyes
// Upright bipedal dark dragon with scalloped wings, shoulder spikes, mouth corner flames

import { ParticlePool } from './particles';
import { TweenManager, easing } from '../utils/tween';
import { randomRange } from '../utils/math';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CharizardPose = 'idle' | 'roar' | 'attack' | 'perch' | 'calm-rest' | 'fly' | 'happy' | 'nudge';

interface PoseDefinition {
  bodyY: number;
  headTilt: number;
  jawOpen: number;
  wingAngle: number;
  wingFlapAmplitude: number;
  wingFlapSpeed: number;
  tailCurl: number;
  flameIntensity: number;
  eyeOpenness: number;
  bodyLean: number;
  mouthFlameActive: boolean;
}

// ---------------------------------------------------------------------------
// MCX Accurate Color Palette
// ---------------------------------------------------------------------------

const COL = {
  bodyDark:     '#1B1B2F',
  bodyMid:      '#2D2D44',
  bodyLight:    '#3A3A52',
  belly:        '#91CCEC',
  bellyLight:   '#B3E1F1',
  wingMembrane: '#3675AB',
  wingLight:    '#37B1E2',
  flameCore:    '#FFFFFF',
  flameInner:   '#E0F7FF',
  flameMid:     '#37B1E2',
  flameOuter:   '#1A5C8A',
  eyeRed:       '#CC0000',
  eyeBright:    '#FF1A1A',
  eyePupil:     '#FFFFFF',
  hornTip:      '#37B1E2',
  claw:         '#D4C8A8',
  teeth:        '#F0E8D8',
  mouthInner:   '#0E0E1A',
  outline:      '#0A0A14',
};

// Flame particle palette (blue fire theme)
const FLAME_COLORS = ['#FFFFFF', '#E0F7FF', '#37B1E2', '#1A5C8A'];

// Outline width at design resolution
const OUTLINE_W = 5;

// ---------------------------------------------------------------------------
// Pose Definitions
// ---------------------------------------------------------------------------

const POSES: Record<CharizardPose, PoseDefinition> = {
  idle: {
    bodyY: 0, headTilt: 0, jawOpen: 0,
    wingAngle: 0.15, wingFlapAmplitude: 0.14, wingFlapSpeed: 1.0,
    tailCurl: 1.0, flameIntensity: 1.0, eyeOpenness: 1.0,
    bodyLean: 0, mouthFlameActive: false,
  },
  roar: {
    bodyY: -8, headTilt: -0.3, jawOpen: 1.0,
    wingAngle: 0.6, wingFlapAmplitude: 0.05, wingFlapSpeed: 0.5,
    tailCurl: 1.3, flameIntensity: 3.0, eyeOpenness: 1.0,
    bodyLean: -0.05, mouthFlameActive: true,
  },
  attack: {
    bodyY: -4, headTilt: 0.1, jawOpen: 0.7,
    wingAngle: -0.2, wingFlapAmplitude: 0.03, wingFlapSpeed: 0.3,
    tailCurl: 0.7, flameIntensity: 2.5, eyeOpenness: 1.0,
    bodyLean: 0.15, mouthFlameActive: true,
  },
  perch: {
    bodyY: 10, headTilt: 0.05, jawOpen: 0,
    wingAngle: -0.5, wingFlapAmplitude: 0, wingFlapSpeed: 0,
    tailCurl: 1.5, flameIntensity: 0.5, eyeOpenness: 1.0,
    bodyLean: -0.05, mouthFlameActive: false,
  },
  'calm-rest': {
    bodyY: 15, headTilt: 0.1, jawOpen: 0,
    wingAngle: -0.6, wingFlapAmplitude: 0, wingFlapSpeed: 0,
    tailCurl: 1.6, flameIntensity: 0.3, eyeOpenness: 0.35,
    bodyLean: 0.05, mouthFlameActive: false,
  },
  fly: {
    bodyY: -20, headTilt: 0.12, jawOpen: 0.1,
    wingAngle: 0.35, wingFlapAmplitude: 0.45, wingFlapSpeed: 2.2,
    tailCurl: 0.5, flameIntensity: 1.8, eyeOpenness: 1.0,
    bodyLean: 0.2, mouthFlameActive: false,
  },
  happy: {
    bodyY: -5, headTilt: -0.1, jawOpen: 0.3,
    wingAngle: 0.3, wingFlapAmplitude: 0.25, wingFlapSpeed: 3.0,
    tailCurl: 1.2, flameIntensity: 2.0, eyeOpenness: 1.0,
    bodyLean: 0, mouthFlameActive: false,
  },
  nudge: {
    bodyY: 2, headTilt: 0.2, jawOpen: 0.1,
    wingAngle: -0.1, wingFlapAmplitude: 0.05, wingFlapSpeed: 0.5,
    tailCurl: 1.0, flameIntensity: 1.0, eyeOpenness: 1.0,
    bodyLean: 0.1, mouthFlameActive: false,
  },
};

// ---------------------------------------------------------------------------
// Charizard Entity
// ---------------------------------------------------------------------------

export class Charizard {
  private particles: ParticlePool;
  private tweens: TweenManager;

  private pose: CharizardPose = 'idle';
  private p: PoseDefinition = { ...POSES.idle };

  // Continuous animation accumulators
  private bobTimer = 0;
  private wingTimer = 0;
  private blinkTimer = 0;
  private nextBlink = 3;
  private blinkProgress = 0;
  private totalTime = 0;

  constructor(particles: ParticlePool, tweens: TweenManager) {
    this.particles = particles;
    this.tweens = tweens;
    this.nextBlink = randomRange(2, 5);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  setPose(newPose: CharizardPose): void {
    if (newPose === this.pose) return;
    const prev = { ...this.p };
    const target = POSES[newPose];
    this.pose = newPose;

    const duration = 0.4;
    const numericKeys: (keyof PoseDefinition)[] = [
      'bodyY', 'headTilt', 'jawOpen', 'wingAngle', 'wingFlapAmplitude',
      'wingFlapSpeed', 'tailCurl', 'flameIntensity', 'eyeOpenness', 'bodyLean',
    ];

    for (const key of numericKeys) {
      const fromVal = prev[key] as number;
      const toVal = target[key] as number;
      if (fromVal === toVal) continue;

      this.tweens.add({
        from: fromVal,
        to: toVal,
        duration,
        easing: easing.easeInOut,
        onUpdate: (v: number) => {
          (this.p as Record<string, number | boolean>)[key] = v;
        },
      });
    }

    this.p.mouthFlameActive = target.mouthFlameActive;
  }

  getPose(): CharizardPose {
    return this.pose;
  }

  update(dt: number): void {
    this.totalTime += dt;
    this.bobTimer += dt;
    this.wingTimer += dt * this.p.wingFlapSpeed;

    // Blink state machine
    this.blinkTimer += dt;
    if (this.blinkProgress > 0) {
      this.blinkProgress += dt * 6;
      if (this.blinkProgress >= 1) {
        this.blinkProgress = 0;
        this.nextBlink = randomRange(2, 5);
        this.blinkTimer = 0;
      }
    } else if (this.blinkTimer >= this.nextBlink && this.p.eyeOpenness > 0.5) {
      this.blinkProgress = 0.001;
    }
  }

  render(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void {
    const bobOffset = Math.sin(this.bobTimer * Math.PI) * 3;
    const wingFlap = Math.sin(this.wingTimer * Math.PI * 0.667) * this.p.wingFlapAmplitude;

    // Blink modulates eye openness
    let eyeMod = this.p.eyeOpenness;
    if (this.blinkProgress > 0) {
      const blinkCurve = this.blinkProgress < 0.5
        ? 1 - this.blinkProgress * 2
        : (this.blinkProgress - 0.5) * 2;
      eyeMod *= blinkCurve;
    }

    const wingAngle = this.p.wingAngle + wingFlap;
    const jawOpen = this.p.jawOpen;
    const headTilt = this.p.headTilt;
    const bodyLean = this.p.bodyLean;
    const tailCurl = this.p.tailCurl;
    const intensity = this.p.flameIntensity;
    const s = scale;
    const lw = OUTLINE_W * s;

    // Spawn flame particles
    this._spawnFlameParticles(cx, cy + (this.p.bodyY + bobOffset) * s, s, intensity, jawOpen);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(bodyLean);
    ctx.translate(0, (this.p.bodyY + bobOffset) * s);

    ctx.lineWidth = lw;
    ctx.strokeStyle = COL.outline;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Draw order: back wing -> tail -> legs -> torso -> belly -> arms ->
    // shoulder spikes -> neck -> head -> horns -> eyes -> jaw -> mouth flames -> front wing

    this._drawWing(ctx, s, lw, wingAngle, false);
    this._drawTail(ctx, s, lw, tailCurl);
    this._drawLegs(ctx, s, lw);
    this._drawTorso(ctx, s, lw);
    this._drawBelly(ctx, s);
    this._drawArms(ctx, s, lw);
    this._drawShoulderSpikes(ctx, s, lw);
    this._drawNeck(ctx, s, lw);
    this._drawHead(ctx, s, lw, headTilt);
    this._drawHorns(ctx, s, lw, headTilt);
    this._drawEyes(ctx, s, headTilt, eyeMod);
    this._drawJaw(ctx, s, lw, headTilt, jawOpen);
    this._drawMouthCornerFlames(ctx, s, headTilt, jawOpen);
    this._drawWing(ctx, s, lw, wingAngle, true);

    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // Flame Particle Spawning
  // -------------------------------------------------------------------------

  private _spawnFlameParticles(
    cx: number, bodyY: number, s: number,
    intensity: number, jawOpen: number,
  ): void {
    // Tail flame particles
    const tailTipX = cx - 120 * s;
    const tailTipY = bodyY + 55 * s;
    const tailCount = Math.max(1, Math.round(2 * intensity));
    for (let i = 0; i < tailCount; i++) {
      if (Math.random() > 0.65 * intensity) continue;
      this.particles.spawn({
        x: tailTipX + randomRange(-6, 6) * s,
        y: tailTipY + randomRange(-4, 4) * s,
        vx: randomRange(-35, 10) * s,
        vy: randomRange(-100, -35) * s,
        color: FLAME_COLORS[Math.floor(Math.random() * FLAME_COLORS.length)],
        size: randomRange(3, 9) * s,
        lifetime: randomRange(0.25, 0.7),
        drag: 0.95,
        fadeOut: true,
        shrink: true,
      });
    }

    // Mouth corner flame particles (always a small amount, more when active)
    const headAnchorY = bodyY - 120 * s;
    const mouthLeftX = cx + 50 * s;
    const mouthRightX = cx + 52 * s;
    const mouthY = headAnchorY + 32 * s;
    const cornerRate = this.p.mouthFlameActive ? 0.7 * intensity : 0.15;
    for (let side = -1; side <= 1; side += 2) {
      const mx = side < 0 ? mouthLeftX : mouthRightX;
      const my = mouthY + side * 8 * s;
      if (Math.random() < cornerRate) {
        this.particles.spawn({
          x: mx + randomRange(-2, 4) * s,
          y: my + randomRange(-2, 2) * s,
          vx: randomRange(20, 60) * s,
          vy: randomRange(-20, 20) * s * (side < 0 ? -1 : 1),
          color: FLAME_COLORS[Math.floor(Math.random() * FLAME_COLORS.length)],
          size: randomRange(2, 5) * s,
          lifetime: randomRange(0.15, 0.4),
          drag: 0.93,
          fadeOut: true,
          shrink: true,
        });
      }
    }

    // Full mouth flame blast when active
    if (this.p.mouthFlameActive && jawOpen > 0.2) {
      const mouthX = cx + 58 * s;
      const mY = headAnchorY + 30 * s;
      const mouthCount = Math.max(1, Math.round(3 * intensity * jawOpen));
      for (let i = 0; i < mouthCount; i++) {
        if (Math.random() > 0.55 * intensity) continue;
        this.particles.spawn({
          x: mouthX + randomRange(0, 25) * s,
          y: mY + randomRange(-12, 12) * s * jawOpen,
          vx: randomRange(70, 200) * s * intensity,
          vy: randomRange(-45, 45) * s,
          color: FLAME_COLORS[Math.floor(Math.random() * FLAME_COLORS.length)],
          size: randomRange(4, 14) * s * jawOpen,
          lifetime: randomRange(0.2, 0.5),
          drag: 0.92,
          fadeOut: true,
          shrink: true,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Body Part Drawing Methods
  // All coordinates are relative to the translated+rotated origin (torso center)
  // -------------------------------------------------------------------------

  /** 1. Wing -- large scalloped bat-wing with blue membrane */
  private _drawWing(
    ctx: CanvasRenderingContext2D,
    s: number, lw: number,
    wingAngle: number, isFront: boolean,
  ): void {
    ctx.save();

    const side = isFront ? 1 : -1;
    const anchorX = side * 50 * s;
    const anchorY = -70 * s;
    ctx.translate(anchorX, anchorY);
    ctx.rotate(side * wingAngle);

    // Back wing slightly smaller for depth
    const ws = isFront ? 1.0 : 0.82;

    // Wing frame (dark outline shape)
    ctx.beginPath();
    ctx.moveTo(0, 0);

    // Leading edge up to wing tip
    ctx.bezierCurveTo(
      side * 30 * s * ws, -40 * s * ws,
      side * 70 * s * ws, -100 * s * ws,
      side * 110 * s * ws, -130 * s * ws,
    );
    // Wing tip curve
    ctx.bezierCurveTo(
      side * 140 * s * ws, -125 * s * ws,
      side * 170 * s * ws, -100 * s * ws,
      side * 190 * s * ws, -60 * s * ws,
    );

    // Scalloped bottom edge (4 wavy bumps)
    const scX0 = side * 190 * ws;
    const scY0 = -60 * ws;
    const scX4 = 0;
    const scY4 = 20 * ws;

    // Scallop control points (4 bumps along the trailing edge)
    const scallops = [
      { x: side * 170 * ws, y: -20 * ws, cx: side * 185 * ws, cy: -35 * ws },
      { x: side * 140 * ws, y: 10 * ws, cx: side * 160 * ws, cy: 0 * ws },
      { x: side * 95 * ws, y: 20 * ws, cx: side * 120 * ws, cy: 22 * ws },
      { x: scX4, y: scY4, cx: side * 50 * ws, cy: 28 * ws },
    ];

    let prevX = scX0;
    let prevY = scY0;
    for (const sc of scallops) {
      // Each scallop: curve outward then back
      const midX = (prevX + sc.x) / 2;
      const midY = (prevY + sc.y) / 2;
      const bulgeFactor = 18 * ws;
      ctx.bezierCurveTo(
        (prevX * 0.6 + sc.cx * 0.4) * s, (prevY * 0.6 + sc.cy * 0.4) * s + side * bulgeFactor * s * 0.3,
        sc.cx * s, sc.cy * s + bulgeFactor * s,
        sc.x * s, sc.y * s,
      );
      prevX = sc.x;
      prevY = sc.y;
    }

    ctx.closePath();

    // Wing membrane fill: gradient from wingMembrane to wingLight
    if (isFront) {
      const grad = ctx.createLinearGradient(0, -100 * s * ws, side * 120 * s * ws, 20 * s * ws);
      grad.addColorStop(0, COL.wingMembrane);
      grad.addColorStop(0.6, COL.wingLight);
      grad.addColorStop(1, COL.wingMembrane);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = COL.wingMembrane;
      ctx.globalAlpha = 0.85;
    }
    ctx.lineWidth = lw;
    ctx.strokeStyle = COL.outline;
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Wing frame bones (dark struts from shoulder to major points)
    ctx.strokeStyle = COL.bodyDark;
    ctx.lineWidth = 3.5 * s * ws;
    ctx.globalAlpha = 0.6;

    // Strut to wing tip
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(
      side * 50 * s * ws, -60 * s * ws,
      side * 80 * s * ws, -110 * s * ws,
      side * 110 * s * ws, -130 * s * ws,
    );
    ctx.stroke();

    // Strut to outer edge mid
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(
      side * 100 * s * ws, -50 * s * ws,
      side * 190 * s * ws, -60 * s * ws,
    );
    ctx.stroke();

    // Strut to lower trailing edge
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(
      side * 70 * s * ws, 0,
      side * 140 * s * ws, 10 * s * ws,
    );
    ctx.stroke();

    ctx.globalAlpha = 1;

    // Blue highlight along leading edge
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(
      side * 30 * s * ws, -40 * s * ws,
      side * 70 * s * ws, -100 * s * ws,
      side * 110 * s * ws, -130 * s * ws,
    );
    ctx.strokeStyle = COL.wingLight;
    ctx.lineWidth = 4 * s * ws;
    ctx.stroke();

    ctx.restore();
  }

  /** 2. Tail -- thick at base, narrows, spikes, blue underside, flame tip */
  private _drawTail(
    ctx: CanvasRenderingContext2D,
    s: number, lw: number, curl: number,
  ): void {
    ctx.save();

    // Tail originates from lower-left of torso
    const sx = -40 * s;
    const sy = 55 * s;

    // Bezier control points
    const c1x = sx - 50 * s * curl;
    const c1y = sy + 30 * s;
    const c2x = sx - 95 * s * curl;
    const c2y = sy - 15 * s * curl;
    const ex = sx - 125 * s;
    const ey = sy - 45 * s + 20 * s * curl;

    const baseThick = 22 * s;
    const tipThick = 5 * s;

    // Main tail shape (dark upper, blue lower)
    ctx.beginPath();
    // Upper edge (dark body color side)
    ctx.moveTo(sx, sy - baseThick / 2);
    ctx.bezierCurveTo(
      c1x, c1y - baseThick / 2,
      c2x, c2y - baseThick / 3,
      ex, ey - tipThick / 2,
    );
    // Round tip
    ctx.arc(ex, ey, tipThick / 2, -Math.PI / 2, Math.PI / 2);
    // Lower edge (reverse)
    ctx.bezierCurveTo(
      c2x, c2y + baseThick / 3,
      c1x, c1y + baseThick / 2,
      sx, sy + baseThick / 2,
    );
    ctx.closePath();

    ctx.fillStyle = COL.bodyDark;
    ctx.lineWidth = lw;
    ctx.strokeStyle = COL.outline;
    ctx.fill();
    ctx.stroke();

    // Blue underside strip on tail
    ctx.beginPath();
    ctx.moveTo(sx, sy + baseThick * 0.15);
    ctx.bezierCurveTo(
      c1x, c1y + baseThick * 0.2,
      c2x, c2y + baseThick * 0.15,
      ex, ey + tipThick * 0.2,
    );
    ctx.lineTo(ex, ey + tipThick / 2);
    ctx.bezierCurveTo(
      c2x, c2y + baseThick / 3,
      c1x, c1y + baseThick / 2,
      sx, sy + baseThick / 2,
    );
    ctx.closePath();
    ctx.fillStyle = COL.belly;
    ctx.fill();

    // Base spike (large)
    this._drawSpike(ctx, sx - 10 * s, sy - baseThick / 2 - 2 * s, 10 * s, 22 * s, -0.3, s);

    // Three small spikes near tip
    for (let i = 0; i < 3; i++) {
      const t = 0.55 + i * 0.14;
      const spkX = sx + (ex - sx) * t;
      const spkY = sy + (ey - sy) * t - baseThick / 3 * (1 - t) - tipThick / 3 * t;
      this._drawSpike(ctx, spkX, spkY - 2 * s, 5 * s, 12 * s, -0.2 - i * 0.1, s);
    }

    // Tail tip flame (teardrop with gradient)
    this._drawTailFlame(ctx, ex, ey, s);

    ctx.restore();
  }

  /** Helper: draw a spike with blue tip */
  private _drawSpike(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, halfW: number, height: number,
    angle: number, s: number,
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(-halfW, 0);
    ctx.quadraticCurveTo(-halfW * 0.3, -height * 0.6, 0, -height);
    ctx.quadraticCurveTo(halfW * 0.3, -height * 0.6, halfW, 0);
    ctx.closePath();

    ctx.fillStyle = COL.bodyDark;
    ctx.fill();
    ctx.strokeStyle = COL.outline;
    ctx.lineWidth = 2.5 * s;
    ctx.stroke();

    // Blue tip (upper 40%)
    ctx.beginPath();
    const tipFrac = 0.4;
    const tipBase = -height * (1 - tipFrac);
    const tipHalfW = halfW * tipFrac;
    ctx.moveTo(-tipHalfW, tipBase);
    ctx.quadraticCurveTo(-tipHalfW * 0.3, tipBase + (tipBase - (-height)) * 0.4, 0, -height);
    ctx.quadraticCurveTo(tipHalfW * 0.3, tipBase + (tipBase - (-height)) * 0.4, tipHalfW, tipBase);
    ctx.closePath();
    ctx.fillStyle = COL.hornTip;
    ctx.fill();

    ctx.restore();
  }

  /** Tail tip flame: teardrop shape with gradient */
  private _drawTailFlame(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, s: number,
  ): void {
    ctx.save();
    ctx.translate(x, y);

    const flicker = Math.sin(this.totalTime * 8) * 0.15 + 1;
    const fh = 30 * s * flicker * this.p.flameIntensity * 0.5;
    const fw = 10 * s * flicker;

    // Flame gradient
    const grad = ctx.createRadialGradient(0, -fh * 0.3, 0, 0, -fh * 0.3, fh * 0.7);
    grad.addColorStop(0, COL.flameCore);
    grad.addColorStop(0.3, COL.flameInner);
    grad.addColorStop(0.6, COL.flameMid);
    grad.addColorStop(1, COL.flameOuter);

    // Teardrop shape
    ctx.beginPath();
    ctx.moveTo(0, fw * 0.5);
    ctx.bezierCurveTo(
      -fw, fw * 0.2,
      -fw * 1.2, -fh * 0.5,
      0, -fh,
    );
    ctx.bezierCurveTo(
      fw * 1.2, -fh * 0.5,
      fw, fw * 0.2,
      0, fw * 0.5,
    );
    ctx.closePath();

    ctx.fillStyle = grad;
    ctx.fill();

    ctx.restore();
  }

  /** 3. Legs -- muscular thighs, digitigrade stance, blue soles, bone-white claws */
  private _drawLegs(
    ctx: CanvasRenderingContext2D,
    s: number, lw: number,
  ): void {
    ctx.save();

    const hipY = 50 * s;

    // Two legs offset left and right
    for (const leg of [{ xOff: -22, back: true }, { xOff: 15, back: false }]) {
      const lx = leg.xOff * s;

      // Thigh -- large oval
      ctx.save();
      ctx.translate(lx, hipY);
      ctx.beginPath();
      ctx.ellipse(0, 15 * s, 20 * s, 28 * s, leg.back ? -0.1 : 0.05, 0, Math.PI * 2);
      ctx.fillStyle = leg.back ? COL.bodyMid : COL.bodyDark;
      ctx.lineWidth = lw;
      ctx.strokeStyle = COL.outline;
      ctx.fill();
      ctx.stroke();

      // Shin -- digitigrade angle (angled forward like dinosaur)
      const kneeY = 35 * s;
      const ankleX = (leg.back ? -5 : 8) * s;
      const ankleY = kneeY + 30 * s;
      ctx.beginPath();
      ctx.moveTo(-8 * s, kneeY);
      ctx.quadraticCurveTo(ankleX - 5 * s, ankleY - 10 * s, ankleX - 10 * s, ankleY);
      ctx.lineTo(ankleX + 10 * s, ankleY);
      ctx.quadraticCurveTo(ankleX + 5 * s, ankleY - 10 * s, 8 * s, kneeY);
      ctx.closePath();
      ctx.fillStyle = leg.back ? COL.bodyMid : COL.bodyDark;
      ctx.fill();
      ctx.stroke();

      // Foot -- wide flat shape with blue sole
      const footX = ankleX;
      const footY = ankleY;
      ctx.beginPath();
      ctx.moveTo(footX - 15 * s, footY);
      ctx.quadraticCurveTo(footX - 18 * s, footY + 8 * s, footX - 12 * s, footY + 12 * s);
      ctx.lineTo(footX + 18 * s, footY + 12 * s);
      ctx.quadraticCurveTo(footX + 22 * s, footY + 8 * s, footX + 16 * s, footY);
      ctx.closePath();
      ctx.fillStyle = COL.belly;
      ctx.fill();
      ctx.stroke();

      // Toe claws (3 per foot)
      ctx.fillStyle = COL.claw;
      for (let t = 0; t < 3; t++) {
        const clawX = footX + (-10 + t * 11) * s;
        const clawY = footY + 12 * s;
        ctx.beginPath();
        ctx.moveTo(clawX - 3 * s, clawY);
        ctx.quadraticCurveTo(clawX, clawY + 9 * s, clawX + 1 * s, clawY + 8 * s);
        ctx.quadraticCurveTo(clawX + 2 * s, clawY + 9 * s, clawX + 3 * s, clawY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = COL.outline;
        ctx.lineWidth = 2 * s;
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  /** 4. Torso -- elongated oval, dark body */
  private _drawTorso(
    ctx: CanvasRenderingContext2D,
    s: number, lw: number,
  ): void {
    ctx.save();

    // Main torso as a rounded shape: wider at shoulders, narrower at hips
    ctx.beginPath();
    ctx.moveTo(-50 * s, -65 * s);
    // Top (shoulders)
    ctx.bezierCurveTo(
      -30 * s, -85 * s,
      30 * s, -85 * s,
      50 * s, -65 * s,
    );
    // Right side
    ctx.bezierCurveTo(
      55 * s, -30 * s,
      48 * s, 20 * s,
      38 * s, 60 * s,
    );
    // Bottom (hips)
    ctx.bezierCurveTo(
      25 * s, 72 * s,
      -25 * s, 72 * s,
      -38 * s, 60 * s,
    );
    // Left side
    ctx.bezierCurveTo(
      -48 * s, 20 * s,
      -55 * s, -30 * s,
      -50 * s, -65 * s,
    );
    ctx.closePath();

    ctx.fillStyle = COL.bodyDark;
    ctx.lineWidth = lw;
    ctx.strokeStyle = COL.outline;
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  /** 5. Belly patch -- sky blue from chest down to lower torso */
  private _drawBelly(
    ctx: CanvasRenderingContext2D,
    s: number,
  ): void {
    ctx.save();

    // Belly patch following torso contour
    ctx.beginPath();
    ctx.moveTo(-10 * s, -70 * s);
    ctx.bezierCurveTo(
      -25 * s, -55 * s,
      -28 * s, -20 * s,
      -25 * s, 20 * s,
    );
    ctx.bezierCurveTo(
      -22 * s, 45 * s,
      -15 * s, 58 * s,
      0, 62 * s,
    );
    ctx.bezierCurveTo(
      15 * s, 58 * s,
      22 * s, 45 * s,
      25 * s, 20 * s,
    );
    ctx.bezierCurveTo(
      28 * s, -20 * s,
      25 * s, -55 * s,
      10 * s, -70 * s,
    );
    ctx.closePath();

    // Gradient for belly: lighter in center
    const grad = ctx.createLinearGradient(0, -60 * s, 0, 60 * s);
    grad.addColorStop(0, COL.belly);
    grad.addColorStop(0.4, COL.bellyLight);
    grad.addColorStop(1, COL.belly);
    ctx.fillStyle = grad;
    ctx.fill();

    // Subtle border
    ctx.lineWidth = 2 * s;
    ctx.strokeStyle = COL.bodyMid;
    ctx.stroke();

    ctx.restore();
  }

  /** 6. Arms -- thin with fused claw-hands and small wrist wing-flaps */
  private _drawArms(
    ctx: CanvasRenderingContext2D,
    s: number, lw: number,
  ): void {
    ctx.save();

    // Two arms
    for (const arm of [{ side: -1, angle: 0.3 }, { side: 1, angle: -0.15 }]) {
      ctx.save();
      const shoulderX = arm.side * 45 * s;
      const shoulderY = -50 * s;
      ctx.translate(shoulderX, shoulderY);
      ctx.rotate(arm.angle);

      // Upper arm
      ctx.beginPath();
      ctx.moveTo(-6 * s, 0);
      ctx.bezierCurveTo(
        -8 * s, 15 * s,
        -7 * s, 30 * s,
        -5 * s, 40 * s,
      );
      ctx.lineTo(5 * s, 40 * s);
      ctx.bezierCurveTo(
        7 * s, 30 * s,
        8 * s, 15 * s,
        6 * s, 0,
      );
      ctx.closePath();
      ctx.fillStyle = COL.bodyDark;
      ctx.lineWidth = lw * 0.8;
      ctx.strokeStyle = COL.outline;
      ctx.fill();
      ctx.stroke();

      // Forearm
      ctx.beginPath();
      ctx.moveTo(-5 * s, 38 * s);
      ctx.bezierCurveTo(
        -6 * s, 50 * s,
        -5 * s, 58 * s,
        -3 * s, 62 * s,
      );
      ctx.lineTo(3 * s, 62 * s);
      ctx.bezierCurveTo(
        5 * s, 58 * s,
        6 * s, 50 * s,
        5 * s, 38 * s,
      );
      ctx.closePath();
      ctx.fillStyle = COL.bodyMid;
      ctx.fill();
      ctx.stroke();

      // Small wrist wing-flap
      ctx.beginPath();
      ctx.moveTo(-3 * s, 52 * s);
      ctx.bezierCurveTo(
        -12 * s, 45 * s,
        -16 * s, 52 * s,
        -10 * s, 58 * s,
      );
      ctx.lineTo(-3 * s, 56 * s);
      ctx.closePath();
      ctx.fillStyle = COL.wingMembrane;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2 * s;
      ctx.strokeStyle = COL.outline;
      ctx.stroke();

      // Fused claw-hand (3 stubby claws)
      ctx.fillStyle = COL.claw;
      for (let c = 0; c < 3; c++) {
        const clawAngle = -0.4 + c * 0.4;
        ctx.save();
        ctx.translate(0, 62 * s);
        ctx.rotate(clawAngle);
        ctx.beginPath();
        ctx.moveTo(-2.5 * s, 0);
        ctx.quadraticCurveTo(-1 * s, 8 * s, 0, 10 * s);
        ctx.quadraticCurveTo(1 * s, 8 * s, 2.5 * s, 0);
        ctx.closePath();
        ctx.fill();
        ctx.lineWidth = 1.5 * s;
        ctx.strokeStyle = COL.outline;
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  /** 7. Shoulder spikes -- 2 per shoulder (4 total), curving upward, blue tips */
  private _drawShoulderSpikes(
    ctx: CanvasRenderingContext2D,
    s: number, lw: number,
  ): void {
    ctx.save();

    // Left shoulder spikes
    this._drawSpike(ctx, -48 * s, -68 * s, 7 * s, 28 * s, -0.5, s);
    this._drawSpike(ctx, -40 * s, -72 * s, 6 * s, 22 * s, -0.3, s);

    // Right shoulder spikes
    this._drawSpike(ctx, 48 * s, -68 * s, 7 * s, 28 * s, 0.5, s);
    this._drawSpike(ctx, 40 * s, -72 * s, 6 * s, 22 * s, 0.3, s);

    ctx.restore();
  }

  /** 8. Neck -- short thick connector */
  private _drawNeck(
    ctx: CanvasRenderingContext2D,
    s: number, lw: number,
  ): void {
    ctx.save();

    ctx.beginPath();
    // Trapezoidal neck from torso top to head base
    ctx.moveTo(-30 * s, -78 * s);
    ctx.bezierCurveTo(
      -28 * s, -95 * s,
      -22 * s, -110 * s,
      -18 * s, -118 * s,
    );
    ctx.lineTo(18 * s, -118 * s);
    ctx.bezierCurveTo(
      22 * s, -110 * s,
      28 * s, -95 * s,
      30 * s, -78 * s,
    );
    ctx.closePath();

    ctx.fillStyle = COL.bodyDark;
    ctx.lineWidth = lw;
    ctx.strokeStyle = COL.outline;
    ctx.fill();
    ctx.stroke();

    // Neck belly continuation (blue strip on front)
    ctx.beginPath();
    ctx.moveTo(-12 * s, -78 * s);
    ctx.bezierCurveTo(
      -10 * s, -95 * s,
      -8 * s, -110 * s,
      -7 * s, -118 * s,
    );
    ctx.lineTo(7 * s, -118 * s);
    ctx.bezierCurveTo(
      8 * s, -110 * s,
      10 * s, -95 * s,
      12 * s, -78 * s,
    );
    ctx.closePath();
    ctx.fillStyle = COL.belly;
    ctx.fill();

    ctx.restore();
  }

  /** 9. Head -- shorter snout, larger brow ridge */
  private _drawHead(
    ctx: CanvasRenderingContext2D,
    s: number, lw: number, headTilt: number,
  ): void {
    ctx.save();
    ctx.translate(0, -140 * s);
    ctx.rotate(headTilt);

    // Main cranium (rounded rectangular + pointed snout)
    ctx.beginPath();
    // Start at back-top of head
    ctx.moveTo(-35 * s, -28 * s);
    // Top of head (brow ridge -- prominent)
    ctx.bezierCurveTo(
      -20 * s, -38 * s,
      15 * s, -38 * s,
      35 * s, -30 * s,
    );
    // Snout (shorter than regular Charizard)
    ctx.bezierCurveTo(
      48 * s, -26 * s,
      56 * s, -20 * s,
      60 * s, -12 * s,
    );
    // Nose ridge bump
    ctx.bezierCurveTo(
      62 * s, -8 * s,
      62 * s, -2 * s,
      60 * s, 4 * s,
    );
    // Snout underside
    ctx.bezierCurveTo(
      55 * s, 10 * s,
      45 * s, 16 * s,
      35 * s, 18 * s,
    );
    // Jaw line back
    ctx.bezierCurveTo(
      15 * s, 22 * s,
      -15 * s, 22 * s,
      -35 * s, 16 * s,
    );
    // Back of head
    ctx.bezierCurveTo(
      -42 * s, 10 * s,
      -44 * s, -5 * s,
      -42 * s, -18 * s,
    );
    ctx.bezierCurveTo(
      -40 * s, -24 * s,
      -38 * s, -27 * s,
      -35 * s, -28 * s,
    );
    ctx.closePath();

    ctx.fillStyle = COL.bodyDark;
    ctx.lineWidth = lw;
    ctx.strokeStyle = COL.outline;
    ctx.fill();
    ctx.stroke();

    // Nose ridge (raised line along top of snout)
    ctx.beginPath();
    ctx.moveTo(20 * s, -32 * s);
    ctx.bezierCurveTo(
      35 * s, -30 * s,
      50 * s, -24 * s,
      58 * s, -14 * s,
    );
    ctx.strokeStyle = COL.bodyLight;
    ctx.lineWidth = 3 * s;
    ctx.stroke();

    // Nostril
    ctx.beginPath();
    ctx.arc(55 * s, -6 * s, 3 * s, 0, Math.PI * 2);
    ctx.fillStyle = COL.mouthInner;
    ctx.fill();

    // Upper teeth (visible along jawline, small)
    ctx.fillStyle = COL.teeth;
    for (let i = 0; i < 5; i++) {
      const tx = (32 + i * 5) * s;
      const ty = 16 * s;
      ctx.beginPath();
      ctx.moveTo(tx - 2 * s, ty);
      ctx.lineTo(tx, ty + 4 * s);
      ctx.lineTo(tx + 2 * s, ty);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  /** 10. Horns -- 3 on back of head: middle longest, sides shorter */
  private _drawHorns(
    ctx: CanvasRenderingContext2D,
    s: number, lw: number, headTilt: number,
  ): void {
    ctx.save();
    ctx.translate(0, -140 * s);
    ctx.rotate(headTilt);

    // Middle horn (longest, ~60px)
    this._drawHorn(ctx, 0, -30 * s, 8 * s, 60 * s, 0, s, lw);
    // Left horn (~40px)
    this._drawHorn(ctx, -25 * s, -24 * s, 7 * s, 40 * s, -0.35, s, lw);
    // Right horn (~40px)
    this._drawHorn(ctx, 25 * s, -24 * s, 7 * s, 40 * s, 0.35, s, lw);

    ctx.restore();
  }

  /** Individual horn: curved elongated triangle with blue tip */
  private _drawHorn(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, halfW: number, height: number,
    angle: number, s: number, lw: number,
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Horn body (curved)
    ctx.beginPath();
    ctx.moveTo(-halfW, 0);
    ctx.bezierCurveTo(
      -halfW * 0.7, -height * 0.4,
      -halfW * 0.3, -height * 0.8,
      0, -height,
    );
    ctx.bezierCurveTo(
      halfW * 0.3, -height * 0.8,
      halfW * 0.7, -height * 0.4,
      halfW, 0,
    );
    ctx.closePath();

    ctx.fillStyle = COL.bodyDark;
    ctx.lineWidth = lw;
    ctx.strokeStyle = COL.outline;
    ctx.fill();
    ctx.stroke();

    // Blue tip (upper 35%)
    const tipFrac = 0.35;
    const tipY = -height * (1 - tipFrac);
    const tipHalfW = halfW * tipFrac;

    ctx.beginPath();
    ctx.moveTo(-tipHalfW, tipY);
    ctx.bezierCurveTo(
      -tipHalfW * 0.5, tipY + (tipY - (-height)) * 0.4,
      -tipHalfW * 0.2, -height * 0.95,
      0, -height,
    );
    ctx.bezierCurveTo(
      tipHalfW * 0.2, -height * 0.95,
      tipHalfW * 0.5, tipY + (tipY - (-height)) * 0.4,
      tipHalfW, tipY,
    );
    ctx.closePath();
    ctx.fillStyle = COL.hornTip;
    ctx.fill();

    ctx.restore();
  }

  /** 11. Eyes -- crimson red with white vertical slit pupil, red glow */
  private _drawEyes(
    ctx: CanvasRenderingContext2D,
    s: number, headTilt: number, openness: number,
  ): void {
    if (openness < 0.03) return;

    ctx.save();
    ctx.translate(0, -140 * s);
    ctx.rotate(headTilt);

    // Two eyes at slightly different x positions (3/4 view)
    const positions = [
      { x: 18 * s, y: -8 * s, w: 10 * s, h: 6 * s },  // inner eye
      { x: 40 * s, y: -8 * s, w: 12 * s, h: 7 * s },  // outer eye (slightly bigger)
    ];

    for (const eye of positions) {
      const eh = eye.h * openness;

      // Angular/fierce eye shape (narrowed diamond-like, not round)
      ctx.save();

      // Red glow effect
      ctx.shadowColor = COL.eyeBright;
      ctx.shadowBlur = 12 * s;

      // Eye shape: angular narrowed shape
      ctx.beginPath();
      ctx.moveTo(eye.x - eye.w, eye.y);
      ctx.quadraticCurveTo(eye.x - eye.w * 0.3, eye.y - eh, eye.x + eye.w * 0.3, eye.y - eh * 0.7);
      ctx.lineTo(eye.x + eye.w, eye.y - eh * 0.2);
      ctx.quadraticCurveTo(eye.x + eye.w * 0.5, eye.y + eh * 0.3, eye.x + eye.w * 0.2, eye.y + eh * 0.6);
      ctx.quadraticCurveTo(eye.x - eye.w * 0.2, eye.y + eh, eye.x - eye.w, eye.y);
      ctx.closePath();

      ctx.fillStyle = COL.eyeRed;
      ctx.fill();

      ctx.restore();

      // Second glow pass (larger, softer)
      ctx.save();
      ctx.shadowColor = COL.eyeBright;
      ctx.shadowBlur = 25 * s;
      ctx.beginPath();
      ctx.ellipse(eye.x, eye.y, eye.w * 0.8, Math.max(eh * 0.8, 1 * s), 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 26, 26, 0.15)';
      ctx.fill();
      ctx.restore();

      // White vertical slit pupil
      if (openness > 0.25) {
        ctx.beginPath();
        ctx.ellipse(
          eye.x + 1 * s, eye.y,
          1.5 * s, Math.max(eh * 0.75, 1 * s),
          0, 0, Math.PI * 2,
        );
        ctx.fillStyle = COL.eyePupil;
        ctx.fill();
      }

      // Specular highlight (tiny white dot)
      if (openness > 0.3) {
        ctx.beginPath();
        ctx.arc(eye.x + 3 * s, eye.y - eh * 0.3, 1.5 * s * openness, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /** 12. Jaw -- lower jaw that opens for roar/attack */
  private _drawJaw(
    ctx: CanvasRenderingContext2D,
    s: number, lw: number, headTilt: number, jawOpen: number,
  ): void {
    ctx.save();
    ctx.translate(0, -140 * s);
    ctx.rotate(headTilt);

    // Hinge point at front-bottom of head
    const hingeX = 40 * s;
    const hingeY = 18 * s;
    ctx.translate(hingeX, hingeY);
    ctx.rotate(jawOpen * 0.55);

    // Lower jaw shape
    ctx.beginPath();
    ctx.moveTo(-15 * s, 0);
    ctx.bezierCurveTo(
      -5 * s, -2 * s,
      10 * s, -3 * s,
      22 * s, -2 * s,
    );
    ctx.bezierCurveTo(
      24 * s, 2 * s,
      23 * s, 8 * s,
      20 * s, 14 * s,
    );
    ctx.bezierCurveTo(
      12 * s, 18 * s,
      0, 16 * s,
      -15 * s, 10 * s,
    );
    ctx.closePath();

    ctx.fillStyle = COL.bodyDark;
    ctx.lineWidth = lw;
    ctx.strokeStyle = COL.outline;
    ctx.fill();
    ctx.stroke();

    // Blue underside of jaw
    ctx.beginPath();
    ctx.moveTo(-10 * s, 6 * s);
    ctx.bezierCurveTo(
      0, 14 * s,
      10 * s, 16 * s,
      20 * s, 12 * s,
    );
    ctx.bezierCurveTo(
      12 * s, 18 * s,
      0, 16 * s,
      -12 * s, 10 * s,
    );
    ctx.closePath();
    ctx.fillStyle = COL.belly;
    ctx.fill();

    // Dark mouth interior when open
    if (jawOpen > 0.15) {
      ctx.beginPath();
      ctx.moveTo(-8 * s, 1 * s);
      ctx.lineTo(18 * s, -1 * s);
      ctx.lineTo(18 * s, 6 * s);
      ctx.lineTo(-8 * s, 8 * s);
      ctx.closePath();
      ctx.fillStyle = COL.mouthInner;
      ctx.fill();
    }

    // Lower teeth (white triangles)
    if (jawOpen > 0.1) {
      ctx.fillStyle = COL.teeth;
      for (let i = 0; i < 4; i++) {
        const tx = (-4 + i * 6) * s;
        ctx.beginPath();
        ctx.moveTo(tx, 0);
        ctx.lineTo(tx + 3.5 * s, 0);
        ctx.lineTo(tx + 1.75 * s, -5 * s);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /** 13. Mouth corner flames -- MCX's SIGNATURE feature! Blue flame jets from mouth corners */
  private _drawMouthCornerFlames(
    ctx: CanvasRenderingContext2D,
    s: number, headTilt: number, jawOpen: number,
  ): void {
    ctx.save();
    ctx.translate(0, -140 * s);
    ctx.rotate(headTilt);

    const time = this.totalTime;
    const intensity = this.p.flameIntensity;

    // Two flame jets: one from each corner of the mouth
    // Upper corner (near snout tip)
    const corners = [
      { x: 55 * s, y: 8 * s, angle: -0.4 - jawOpen * 0.2, flicker: 0 },   // upper corner
      { x: 40 * s + jawOpen * 15 * s, y: 18 * s + jawOpen * 10 * s, angle: 0.3 + jawOpen * 0.3, flicker: 1.5 },  // lower corner (moves with jaw)
    ];

    for (const corner of corners) {
      ctx.save();
      ctx.translate(corner.x, corner.y);
      ctx.rotate(corner.angle);

      const flicker1 = Math.sin(time * 10 + corner.flicker) * 0.2 + 1;
      const flicker2 = Math.sin(time * 14 + corner.flicker + 2) * 0.15 + 1;
      const fLen = (18 + jawOpen * 8) * s * flicker1 * Math.min(intensity, 2) * 0.6;
      const fWidth = 5 * s * flicker2;

      // Flame gradient
      const grad = ctx.createLinearGradient(0, 0, fLen, 0);
      grad.addColorStop(0, COL.flameCore);
      grad.addColorStop(0.3, COL.flameInner);
      grad.addColorStop(0.6, COL.flameMid);
      grad.addColorStop(1, 'rgba(26, 92, 138, 0)');

      // Teardrop flame shape pointing outward
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        fLen * 0.3, -fWidth,
        fLen * 0.7, -fWidth * 0.6,
        fLen, 0,
      );
      ctx.bezierCurveTo(
        fLen * 0.7, fWidth * 0.6,
        fLen * 0.3, fWidth,
        0, 0,
      );
      ctx.closePath();

      ctx.fillStyle = grad;
      ctx.fill();

      // Inner bright core
      const coreLen = fLen * 0.4;
      const coreW = fWidth * 0.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        coreLen * 0.3, -coreW,
        coreLen * 0.7, -coreW * 0.5,
        coreLen, 0,
      );
      ctx.bezierCurveTo(
        coreLen * 0.7, coreW * 0.5,
        coreLen * 0.3, coreW,
        0, 0,
      );
      ctx.closePath();
      ctx.fillStyle = COL.flameCore;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.restore();
    }

    // Mouth flame glow when active + jaw open
    if (this.p.mouthFlameActive && jawOpen > 0.2) {
      const pulse = 0.8 + Math.sin(time * 14) * 0.2;
      const glowX = 55 * s;
      const glowY = 14 * s;
      const glowR = 22 * s * jawOpen * pulse;

      ctx.save();
      ctx.shadowColor = COL.flameMid;
      ctx.shadowBlur = 35 * s * intensity;
      ctx.globalAlpha = 0.35 * jawOpen * Math.min(intensity, 2);
      ctx.beginPath();
      ctx.arc(glowX, glowY, glowR, 0, Math.PI * 2);
      ctx.fillStyle = COL.flameMid;
      ctx.fill();
      ctx.restore();

      // White-hot core
      ctx.save();
      ctx.globalAlpha = 0.5 * jawOpen * Math.min(intensity, 2);
      ctx.beginPath();
      ctx.arc(glowX, glowY, glowR * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = COL.flameCore;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}
