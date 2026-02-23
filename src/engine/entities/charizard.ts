// src/engine/entities/charizard.ts
// Procedural Mega Charizard X entity — 12 canvas-drawn body parts, 6 animation poses
// "Chunky Silhouette" art style: bold geometric shapes, thick outlines, exaggerated proportions
// Like a talented 4-year-old's drawing — instantly recognisable, NOT realistic, NOT pixel art

import { theme } from '../../config/theme';
import { ParticlePool } from './particles';
import { TweenManager, easing } from '../utils/tween';
import { randomRange } from '../utils/math';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CharizardPose = 'idle' | 'roar' | 'attack' | 'perch' | 'calm-rest' | 'fly';

interface PoseDefinition {
  bodyY: number;             // vertical offset from anchor (px at design res)
  headTilt: number;          // head rotation in radians (negative = tilt back)
  jawOpen: number;           // 0 = closed, 1 = fully open
  wingAngle: number;         // wing spread base angle (radians)
  wingFlapAmplitude: number; // oscillation amplitude for flap (radians)
  wingFlapSpeed: number;     // flap cycle speed multiplier (1 = ~3s cycle)
  tailCurl: number;          // tail bezier curvature multiplier
  flameIntensity: number;    // particle spawn rate multiplier
  eyeOpenness: number;       // 0 = closed, 1 = fully open
  bodyLean: number;          // torso forward lean (radians, positive = forward)
  mouthFlameActive: boolean; // whether mouth shoots flame particles
}

// ---------------------------------------------------------------------------
// MCX Colors (from theme.forms[3])
// ---------------------------------------------------------------------------

const MCX = theme.forms[3].colors;
const COL = {
  body:      MCX.body     ?? '#1a1a2e',
  bodyLight: '#2a2a4e',                  // slightly lighter for depth on back surfaces
  belly:     MCX.belly    ?? '#91CCEC',
  flames:    MCX.flames   ?? '#37B1E2',
  eyes:      MCX.eyes     ?? '#ff1a1a',
  hornTips:  MCX.hornTips ?? '#37B1E2',
  wingEdge:  MCX.wingEdge ?? '#37B1E2',
  outline:   '#000000',
  teeth:     '#e8e8e8',
  claws:     '#cccccc',
  inner:     '#12121e',                  // dark inner mouth
};

// Flame particle palette (blue fire theme — MCX signature)
const FLAME_COLORS = ['#FFFFFF', '#91CCEC', '#37B1E2', '#1a5fc4'];

// Outline width at 1080p design resolution
const OUTLINE_W = 5;

// ---------------------------------------------------------------------------
// Pose Definitions
// ---------------------------------------------------------------------------

const POSES: Record<CharizardPose, PoseDefinition> = {
  idle: {
    bodyY: 0,
    headTilt: 0,
    jawOpen: 0,
    wingAngle: 0.15,
    wingFlapAmplitude: 0.14,
    wingFlapSpeed: 1.0,
    tailCurl: 1.0,
    flameIntensity: 1.0,
    eyeOpenness: 1.0,
    bodyLean: 0,
    mouthFlameActive: false,
  },
  roar: {
    bodyY: -8,
    headTilt: -0.3,
    jawOpen: 1.0,
    wingAngle: 0.6,
    wingFlapAmplitude: 0.05,
    wingFlapSpeed: 0.5,
    tailCurl: 1.3,
    flameIntensity: 3.0,
    eyeOpenness: 1.0,
    bodyLean: -0.05,
    mouthFlameActive: true,
  },
  attack: {
    bodyY: -4,
    headTilt: 0.1,
    jawOpen: 0.7,
    wingAngle: -0.2,
    wingFlapAmplitude: 0.03,
    wingFlapSpeed: 0.3,
    tailCurl: 0.7,
    flameIntensity: 2.5,
    eyeOpenness: 1.0,
    bodyLean: 0.15,
    mouthFlameActive: true,
  },
  perch: {
    bodyY: 10,
    headTilt: 0.05,
    jawOpen: 0,
    wingAngle: -0.5,
    wingFlapAmplitude: 0,
    wingFlapSpeed: 0,
    tailCurl: 1.5,
    flameIntensity: 0.5,
    eyeOpenness: 1.0,
    bodyLean: -0.05,
    mouthFlameActive: false,
  },
  'calm-rest': {
    bodyY: 15,
    headTilt: 0.1,
    jawOpen: 0,
    wingAngle: -0.6,
    wingFlapAmplitude: 0,
    wingFlapSpeed: 0,
    tailCurl: 1.6,
    flameIntensity: 0.3,
    eyeOpenness: 0.35,
    bodyLean: 0.05,
    mouthFlameActive: false,
  },
  fly: {
    bodyY: -20,
    headTilt: 0.12,
    jawOpen: 0.1,
    wingAngle: 0.35,
    wingFlapAmplitude: 0.45,
    wingFlapSpeed: 2.2,
    tailCurl: 0.5,
    flameIntensity: 1.8,
    eyeOpenness: 1.0,
    bodyLean: 0.2,
    mouthFlameActive: false,
  },
};

// ---------------------------------------------------------------------------
// Charizard Entity
// ---------------------------------------------------------------------------

export class Charizard {
  // Injected systems
  private particles: ParticlePool;
  private tweens: TweenManager;

  // Current pose state (interpolated by tweens)
  private pose: CharizardPose = 'idle';
  private p: PoseDefinition = { ...POSES.idle };

  // Continuous animation accumulators
  private bobTimer = 0;       // body bob sine phase
  private wingTimer = 0;      // wing flap sine phase
  private blinkTimer = 0;     // time since last blink
  private nextBlink = 3;      // seconds until next blink
  private blinkProgress = 0;  // 0 = not blinking, 0..1 = mid-blink cycle
  private totalTime = 0;      // monotonic time for misc oscillations

  constructor(particles: ParticlePool, tweens: TweenManager) {
    this.particles = particles;
    this.tweens = tweens;
    this.nextBlink = randomRange(2, 5);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Smoothly transition to a new pose over ~0.4s using the TweenManager */
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

    // Boolean fields apply immediately
    this.p.mouthFlameActive = target.mouthFlameActive;
  }

  /** Returns the current pose name */
  getPose(): CharizardPose {
    return this.pose;
  }

  /** Tick idle animations, blink timer, and flame particle spawning */
  update(dt: number): void {
    this.totalTime += dt;

    // Body bob: 2-second sine cycle producing +-3px movement
    this.bobTimer += dt;

    // Wing flap: accumulator modulated by wingFlapSpeed
    this.wingTimer += dt * this.p.wingFlapSpeed;

    // Eye blink state machine
    this.blinkTimer += dt;
    if (this.blinkProgress > 0) {
      // Mid-blink: advance through close-then-open cycle (~0.17s total)
      this.blinkProgress += dt * 6;
      if (this.blinkProgress >= 1) {
        this.blinkProgress = 0;
        this.nextBlink = randomRange(2, 5);
        this.blinkTimer = 0;
      }
    } else if (this.blinkTimer >= this.nextBlink && this.p.eyeOpenness > 0.5) {
      this.blinkProgress = 0.001; // trigger blink
    }
  }

  /**
   * Draw the complete Mega Charizard X at the given center position.
   * @param ctx  Canvas 2D context
   * @param cx   Center X in canvas coordinates
   * @param cy   Center Y in canvas coordinates (roughly at torso center)
   * @param scale  Uniform scale factor (1.0 = design-resolution proportions)
   */
  render(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void {
    // --- Compute dynamic idle animation values ---
    const bobOffset = Math.sin(this.bobTimer * Math.PI) * 3; // 2s cycle, +-3 design px
    const wingFlap = Math.sin(this.wingTimer * Math.PI * 0.667) * this.p.wingFlapAmplitude;

    // Blink modulates eye openness with a triangle wave (close then open)
    let eyeMod = this.p.eyeOpenness;
    if (this.blinkProgress > 0) {
      const blinkCurve = this.blinkProgress < 0.5
        ? 1 - this.blinkProgress * 2
        : (this.blinkProgress - 0.5) * 2;
      eyeMod *= blinkCurve;
    }

    // Resolved values for this frame
    const bodyY     = cy + (this.p.bodyY + bobOffset) * scale;
    const bodyLean  = this.p.bodyLean;
    const headTilt  = this.p.headTilt;
    const jawOpen   = this.p.jawOpen;
    const tailCurl  = this.p.tailCurl;
    const wingAngle = this.p.wingAngle + wingFlap;
    const intensity = this.p.flameIntensity;
    const s = scale;
    const lw = OUTLINE_W * s;

    // Spawn flame particles before drawing so they appear behind some parts
    this._spawnFlameParticles(cx, bodyY, s, intensity, jawOpen);

    // --- Draw order (back to front): ---
    // back wing -> tail -> legs -> torso -> belly -> neck -> head ->
    // horns -> eyes -> jaw -> mouth flame glow -> front wing
    // (Tail flame + mouth flame particles are rendered by ParticlePool externally)

    ctx.save();
    ctx.lineWidth = lw;
    ctx.strokeStyle = COL.outline;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // 1. Back wing (right wing, behind body — slightly smaller for depth)
    this._drawWing(ctx, cx, bodyY, s, lw, wingAngle, bodyLean, false);

    // 2. Tail
    this._drawTail(ctx, cx, bodyY, s, lw, tailCurl, bodyLean);

    // 3. Legs (small chunky legs beneath torso)
    this._drawLegs(ctx, cx, bodyY, s, lw, bodyLean);

    // 4. Torso
    this._drawTorso(ctx, cx, bodyY, s, lw, bodyLean);

    // 5. Belly patch
    this._drawBelly(ctx, cx, bodyY, s, lw, bodyLean);

    // 6. Neck
    this._drawNeck(ctx, cx, bodyY, s, lw, headTilt, bodyLean);

    // 7. Head
    this._drawHead(ctx, cx, bodyY, s, lw, headTilt, bodyLean);

    // 8 & 9. Horns (left and right)
    this._drawHorn(ctx, cx, bodyY, s, lw, headTilt, bodyLean, true);
    this._drawHorn(ctx, cx, bodyY, s, lw, headTilt, bodyLean, false);

    // 10. Eyes (with red glow bloom)
    this._drawEyes(ctx, cx, bodyY, s, headTilt, bodyLean, eyeMod);

    // 11. Jaw
    this._drawJaw(ctx, cx, bodyY, s, lw, headTilt, bodyLean, jawOpen);

    // 12. Mouth flame glow (rendered as a luminous overlay)
    if (this.p.mouthFlameActive && jawOpen > 0.2) {
      this._drawMouthFlameGlow(ctx, cx, bodyY, s, headTilt, bodyLean, jawOpen, intensity);
    }

    // 13. Front wing (left wing, overlaps body)
    this._drawWing(ctx, cx, bodyY, s, lw, wingAngle, bodyLean, true);

    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // Flame Particle Spawning
  // (Particles are updated + rendered externally by the shared ParticlePool)
  // -------------------------------------------------------------------------

  private _spawnFlameParticles(
    cx: number, bodyY: number, s: number,
    intensity: number, jawOpen: number,
  ): void {
    // --- Tail flame: always burning at the tail tip ---
    const tailTipX = cx - 130 * s;
    const tailTipY = bodyY + 50 * s;
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

    // --- Mouth flames: only when active + jaw sufficiently open ---
    if (this.p.mouthFlameActive && jawOpen > 0.2) {
      const headAnchorY = bodyY - 120 * s;
      const mouthX = cx + 58 * s;
      const mouthY = headAnchorY + 30 * s;
      const mouthCount = Math.max(1, Math.round(3 * intensity * jawOpen));
      for (let i = 0; i < mouthCount; i++) {
        if (Math.random() > 0.55 * intensity) continue;
        this.particles.spawn({
          x: mouthX + randomRange(0, 25) * s,
          y: mouthY + randomRange(-12, 12) * s * jawOpen,
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
  // Each uses ctx.save()/restore() and translates to its own anchor point
  // -------------------------------------------------------------------------

  /** 1. Torso — chunky rounded trapezoid, wider at shoulders */
  private _drawTorso(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, s: number, lw: number, lean: number,
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(lean);

    const topW = 72 * s;   // shoulder half-width
    const botW = 48 * s;   // hip half-width
    const halfH = 105 * s; // torso half-height
    const r = 20 * s;      // corner radius

    ctx.beginPath();
    ctx.moveTo(-topW + r, -halfH);
    ctx.lineTo(topW - r, -halfH);
    ctx.quadraticCurveTo(topW, -halfH, topW, -halfH + r);
    ctx.lineTo(botW, halfH - r);
    ctx.quadraticCurveTo(botW, halfH, botW - r, halfH);
    ctx.lineTo(-botW + r, halfH);
    ctx.quadraticCurveTo(-botW, halfH, -botW, halfH - r);
    ctx.lineTo(-topW, -halfH + r);
    ctx.quadraticCurveTo(-topW, -halfH, -topW + r, -halfH);
    ctx.closePath();

    ctx.fillStyle = COL.body;
    ctx.lineWidth = lw;
    ctx.strokeStyle = COL.outline;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /** 2. Belly patch — light blue oval on the front of the torso */
  private _drawBelly(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, s: number, lw: number, lean: number,
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(lean);

    ctx.beginPath();
    ctx.ellipse(5 * s, 15 * s, 36 * s, 60 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = COL.belly;
    ctx.fill();
    // Subtle outline to separate from torso
    ctx.lineWidth = 2.5 * s;
    ctx.strokeStyle = COL.body;
    ctx.stroke();

    ctx.restore();
  }

  /** 3. Neck — short trapezoidal connector between torso and head */
  private _drawNeck(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, s: number, lw: number,
    headTilt: number, lean: number,
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(lean);

    // Neck runs from top of torso up to head base
    const neckTop = -105 * s;
    const neckBot = -85 * s;
    const topW = 28 * s;
    const botW = 38 * s;

    ctx.beginPath();
    ctx.moveTo(-botW, neckBot);
    ctx.lineTo(botW, neckBot);
    ctx.lineTo(topW, neckTop);
    ctx.lineTo(-topW, neckTop);
    ctx.closePath();

    ctx.fillStyle = COL.body;
    ctx.lineWidth = lw;
    ctx.strokeStyle = COL.outline;
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  /** 4. Head — rounded rectangle with a protruding snout, facing right */
  private _drawHead(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, s: number, lw: number,
    headTilt: number, lean: number,
  ): void {
    ctx.save();
    const headX = cx + Math.sin(lean) * -40 * s;
    const headY = cy - 130 * s;
    ctx.translate(headX, headY);
    ctx.rotate(lean + headTilt);

    const hw = 48 * s;  // cranium half-width
    const hh = 38 * s;  // cranium half-height
    const r = 15 * s;

    // Main cranium shape with extended snout on the right side
    ctx.beginPath();
    ctx.moveTo(-hw + r, -hh);
    ctx.lineTo(hw - r, -hh);
    ctx.quadraticCurveTo(hw, -hh, hw, -hh + r);
    // Snout protrusion
    ctx.lineTo(hw + 18 * s, -10 * s);
    ctx.lineTo(hw + 20 * s, 10 * s);
    ctx.lineTo(hw + 16 * s, hh - r);
    ctx.quadraticCurveTo(hw + 16 * s, hh, hw + 16 * s - r, hh);
    ctx.lineTo(-hw + r, hh);
    ctx.quadraticCurveTo(-hw, hh, -hw, hh - r);
    ctx.lineTo(-hw, -hh + r);
    ctx.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
    ctx.closePath();

    ctx.fillStyle = COL.body;
    ctx.lineWidth = lw;
    ctx.strokeStyle = COL.outline;
    ctx.fill();
    ctx.stroke();

    // Nostril — small circle near snout tip
    ctx.beginPath();
    ctx.arc(hw + 10 * s, 2 * s, 3 * s, 0, Math.PI * 2);
    ctx.fillStyle = COL.inner;
    ctx.fill();

    ctx.restore();
  }

  /** 5. Jaw — hinged lower jaw, opens downward from the snout */
  private _drawJaw(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, s: number, lw: number,
    headTilt: number, lean: number, jawOpen: number,
  ): void {
    ctx.save();
    const headX = cx + Math.sin(lean) * -40 * s;
    const headY = cy - 130 * s;
    ctx.translate(headX, headY);
    ctx.rotate(lean + headTilt);

    // Hinge point at the front-bottom of the snout
    const hingeX = 42 * s;
    const hingeY = 28 * s;
    ctx.translate(hingeX, hingeY);
    ctx.rotate(jawOpen * 0.55); // up to ~31 degrees fully open

    // Chunky lower jaw shape
    ctx.beginPath();
    ctx.moveTo(-5 * s, 0);
    ctx.lineTo(24 * s, -2 * s);
    ctx.lineTo(26 * s, 12 * s);
    ctx.lineTo(18 * s, 18 * s);
    ctx.lineTo(-10 * s, 14 * s);
    ctx.closePath();

    ctx.fillStyle = COL.body;
    ctx.lineWidth = lw;
    ctx.strokeStyle = COL.outline;
    ctx.fill();
    ctx.stroke();

    // Inner mouth visible when open
    if (jawOpen > 0.15) {
      ctx.beginPath();
      ctx.moveTo(0, 2 * s);
      ctx.lineTo(20 * s, 0);
      ctx.lineTo(20 * s, 8 * s);
      ctx.lineTo(-4 * s, 10 * s);
      ctx.closePath();
      ctx.fillStyle = COL.inner;
      ctx.fill();
    }

    // Teeth — chunky white triangles along the jaw top edge
    if (jawOpen > 0.1) {
      ctx.fillStyle = COL.teeth;
      for (let i = 0; i < 4; i++) {
        const tx = 2 * s + i * 6 * s;
        ctx.beginPath();
        ctx.moveTo(tx, 0);
        ctx.lineTo(tx + 4 * s, 0);
        ctx.lineTo(tx + 2 * s, 6 * s);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /** 6 & 7. Horn — bold triangle with blue tip, on top of head */
  private _drawHorn(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, s: number, lw: number,
    headTilt: number, lean: number, isLeft: boolean,
  ): void {
    ctx.save();
    const headX = cx + Math.sin(lean) * -40 * s;
    const headY = cy - 130 * s;
    ctx.translate(headX, headY);
    ctx.rotate(lean + headTilt);

    const side = isLeft ? -1 : 1;
    const baseX = side * 22 * s;
    const baseY = -34 * s;

    // Full horn triangle (dark body color)
    const tipX = baseX + side * 28 * s;
    const tipY = baseY - 55 * s;

    ctx.beginPath();
    ctx.moveTo(baseX - 12 * s * side, baseY);
    ctx.lineTo(baseX + 6 * s * side, baseY);
    ctx.lineTo(tipX, tipY);
    ctx.closePath();
    ctx.fillStyle = COL.body;
    ctx.lineWidth = lw;
    ctx.strokeStyle = COL.outline;
    ctx.fill();
    ctx.stroke();

    // Blue tip (upper ~35% of horn)
    const tipFrac = 0.35;
    const blueBaseY = baseY + (tipY - baseY) * (1 - tipFrac);
    const blueBaseHalfW = 9 * s * tipFrac;
    const midX = baseX + side * 17 * s;

    ctx.beginPath();
    ctx.moveTo(midX - blueBaseHalfW * side, blueBaseY);
    ctx.lineTo(midX + blueBaseHalfW * 0.3 * side, blueBaseY);
    ctx.lineTo(tipX, tipY);
    ctx.closePath();
    ctx.fillStyle = COL.hornTips;
    ctx.fill();

    ctx.restore();
  }

  /** 8. Eyes — fierce narrow ovals with red glow/bloom effect */
  private _drawEyes(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, s: number,
    headTilt: number, lean: number, openness: number,
  ): void {
    if (openness < 0.03) return; // fully closed — skip

    ctx.save();
    const headX = cx + Math.sin(lean) * -40 * s;
    const headY = cy - 130 * s;
    ctx.translate(headX, headY);
    ctx.rotate(lean + headTilt);

    const eyeY = -4 * s;
    // Two eyes: inner and outer (3/4 view, so outer is further right = closer to viewer)
    const positions = [
      { x: 12 * s, w: 7 * s },   // inner eye (further from viewer)
      { x: 38 * s, w: 9 * s },   // outer eye (closer, slightly bigger)
    ];

    for (const eye of positions) {
      const ew = eye.w;
      const eh = 5 * s * openness;

      // -- Glow bloom layer (blurred red halo) --
      ctx.save();
      ctx.shadowColor = COL.eyes;
      ctx.shadowBlur = 20 * s;
      ctx.beginPath();
      ctx.ellipse(eye.x, eyeY, ew * 1.8, Math.max(eh * 1.8, 2 * s), 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 26, 26, 0.25)';
      ctx.fill();
      ctx.restore();

      // -- Second softer bloom pass for extra glow --
      ctx.save();
      ctx.shadowColor = COL.eyes;
      ctx.shadowBlur = 40 * s;
      ctx.beginPath();
      ctx.ellipse(eye.x, eyeY, ew * 1.2, Math.max(eh * 1.2, 1.5 * s), 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 26, 26, 0.15)';
      ctx.fill();
      ctx.restore();

      // -- Solid eye fill --
      ctx.beginPath();
      ctx.ellipse(eye.x, eyeY, ew, Math.max(eh, 1 * s), 0, 0, Math.PI * 2);
      ctx.fillStyle = COL.eyes;
      ctx.fill();

      // -- Bright pupil slit (vertical narrow ellipse for fierce look) --
      if (openness > 0.3) {
        ctx.beginPath();
        ctx.ellipse(eye.x + 1 * s, eyeY, 1.5 * s, Math.max(eh * 0.7, 1 * s), 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ff6644';
        ctx.fill();
      }

      // -- White specular highlight --
      if (openness > 0.2) {
        ctx.beginPath();
        ctx.ellipse(
          eye.x + 2.5 * s, eyeY - 1.5 * s * openness,
          2 * s * openness, 1.5 * s * openness,
          -0.3, 0, Math.PI * 2,
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /** 9 & 10. Wing — large angular bat-wing polygon with blue edge highlights */
  private _drawWing(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, s: number, lw: number,
    wingAngle: number, lean: number, isFront: boolean,
  ): void {
    ctx.save();

    // Wing anchor at upper-outer edge of torso
    const side = isFront ? 1 : -1;
    const anchorX = cx + side * 58 * s;
    const anchorY = cy - 65 * s;
    ctx.translate(anchorX, anchorY);
    ctx.rotate(lean + side * wingAngle);

    // Back wing drawn slightly smaller + darker for depth
    const ws = isFront ? 1.0 : 0.82;

    // -- Wing membrane polygon (bat-like, 3 finger points) --
    ctx.beginPath();
    ctx.moveTo(0, 0);                                           // shoulder
    ctx.lineTo(side * 45 * s * ws, -65 * s * ws);               // first finger
    ctx.lineTo(side * 105 * s * ws, -130 * s * ws);             // second finger (tallest point)
    ctx.lineTo(side * 155 * s * ws, -85 * s * ws);              // third finger
    ctx.lineTo(side * 175 * s * ws, -30 * s * ws);              // outer wingtip
    ctx.lineTo(side * 145 * s * ws, 22 * s * ws);               // lower trailing edge
    ctx.lineTo(side * 85 * s * ws, 42 * s * ws);                // inner trailing edge
    ctx.lineTo(0, 18 * s * ws);                                 // back to body
    ctx.closePath();

    ctx.fillStyle = isFront ? COL.body : COL.bodyLight;
    ctx.lineWidth = lw;
    ctx.strokeStyle = COL.outline;
    ctx.fill();
    ctx.stroke();

    // -- Blue edge highlight along the leading edge (top) --
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(side * 45 * s * ws, -65 * s * ws);
    ctx.lineTo(side * 105 * s * ws, -130 * s * ws);
    ctx.lineTo(side * 155 * s * ws, -85 * s * ws);
    ctx.lineTo(side * 175 * s * ws, -30 * s * ws);
    ctx.lineWidth = 4.5 * s;
    ctx.strokeStyle = COL.wingEdge;
    ctx.stroke();

    // -- Wing finger bones (membrane structure lines) --
    ctx.strokeStyle = COL.wingEdge;
    ctx.lineWidth = 2.5 * s;
    ctx.globalAlpha = 0.45;

    // Bone to tallest finger
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(side * 105 * s * ws, -130 * s * ws);
    ctx.stroke();

    // Bone to third finger
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(side * 155 * s * ws, -85 * s * ws);
    ctx.stroke();

    // Bone to wingtip
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(side * 175 * s * ws, -30 * s * ws);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** 11. Tail — bezier curve, thick at base tapering to a point */
  private _drawTail(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, s: number, lw: number,
    curl: number, lean: number,
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(lean);

    // Tail originates from lower-left of torso
    const sx = -42 * s;
    const sy = 75 * s;

    // Bezier control points, influenced by curl amount
    const c1x = sx - 55 * s * curl;
    const c1y = sy + 35 * s;
    const c2x = sx - 105 * s * curl;
    const c2y = sy - 22 * s * curl;
    const ex = sx - 135 * s;
    const ey = sy - 55 * s + 22 * s * curl;

    // Draw as a filled shape using two parallel bezier curves (thick -> thin)
    const baseThick = 20 * s;
    const tipThick = 4 * s;

    ctx.beginPath();
    // Upper edge
    ctx.moveTo(sx, sy - baseThick / 2);
    ctx.bezierCurveTo(
      c1x, c1y - baseThick / 2,
      c2x, c2y - baseThick / 3,
      ex, ey - tipThick / 2,
    );
    // Round tip
    ctx.arc(ex, ey, tipThick / 2, -Math.PI / 2, Math.PI / 2);
    // Lower edge (reverse direction)
    ctx.bezierCurveTo(
      c2x, c2y + baseThick / 3,
      c1x, c1y + baseThick / 2,
      sx, sy + baseThick / 2,
    );
    ctx.closePath();

    ctx.fillStyle = COL.body;
    ctx.lineWidth = lw;
    ctx.strokeStyle = COL.outline;
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  /** Legs — two small chunky legs beneath the torso */
  private _drawLegs(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, s: number, lw: number, lean: number,
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(lean);

    const legY = 95 * s;  // just below torso bottom

    // Two legs offset left and right
    for (const xOff of [-25, 18]) {
      const lx = xOff * s;

      // Upper leg (thigh) — short thick rectangle
      ctx.beginPath();
      ctx.moveTo(lx - 14 * s, legY);
      ctx.lineTo(lx + 14 * s, legY);
      ctx.lineTo(lx + 12 * s, legY + 40 * s);
      ctx.lineTo(lx - 12 * s, legY + 40 * s);
      ctx.closePath();
      ctx.fillStyle = COL.body;
      ctx.lineWidth = lw;
      ctx.strokeStyle = COL.outline;
      ctx.fill();
      ctx.stroke();

      // Foot — flat wide shape with 3 toe claws
      const footY = legY + 40 * s;
      ctx.beginPath();
      ctx.moveTo(lx - 16 * s, footY);
      ctx.lineTo(lx + 18 * s, footY);
      ctx.lineTo(lx + 22 * s, footY + 10 * s);
      ctx.lineTo(lx - 18 * s, footY + 10 * s);
      ctx.closePath();
      ctx.fillStyle = COL.body;
      ctx.fill();
      ctx.stroke();

      // Toe claws
      ctx.fillStyle = COL.claws;
      for (let t = 0; t < 3; t++) {
        const clawX = lx + (-12 + t * 12) * s;
        const clawY = footY + 10 * s;
        ctx.beginPath();
        ctx.moveTo(clawX - 3 * s, clawY);
        ctx.lineTo(clawX + 3 * s, clawY);
        ctx.lineTo(clawX, clawY + 7 * s);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /** Mouth flame glow — luminous blue glow at the jaw opening when breathing fire */
  private _drawMouthFlameGlow(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, s: number,
    headTilt: number, lean: number,
    jawOpen: number, intensity: number,
  ): void {
    ctx.save();
    const headX = cx + Math.sin(lean) * -40 * s;
    const headY = cy - 130 * s;
    ctx.translate(headX, headY);
    ctx.rotate(lean + headTilt);

    // Pulsating glow at mouth opening
    const pulse = 0.8 + Math.sin(this.totalTime * 14) * 0.2;
    const glowX = 60 * s;
    const glowY = 26 * s;
    const glowR = 28 * s * jawOpen * pulse;

    // Outer glow
    ctx.save();
    ctx.shadowColor = COL.flames;
    ctx.shadowBlur = 35 * s * intensity;
    ctx.globalAlpha = 0.35 * jawOpen * Math.min(intensity, 2);
    ctx.beginPath();
    ctx.arc(glowX, glowY, glowR, 0, Math.PI * 2);
    ctx.fillStyle = COL.flames;
    ctx.fill();
    ctx.restore();

    // Inner bright core
    ctx.save();
    ctx.globalAlpha = 0.5 * jawOpen * Math.min(intensity, 2);
    ctx.beginPath();
    ctx.arc(glowX, glowY, glowR * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}
