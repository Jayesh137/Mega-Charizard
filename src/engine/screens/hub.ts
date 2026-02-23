// src/engine/screens/hub.ts
// Hub screen with 4-gem Power Gem System
// Players collect gems by completing each game. MCX powers up as gems are collected.

import type { GameScreen, GameContext } from '../screen-manager';
import type { GameName } from '../../state/types';
import { Background } from '../entities/backgrounds';
import { ParticlePool, setActivePool } from '../entities/particles';
import { SpriteAnimator } from '../entities/sprite-animator';
import { SPRITES } from '../../config/sprites';
import { VoiceSystem } from '../voice';
import { VIDEOS } from '../../config/videos';
import { session } from '../../state/session.svelte';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../../config/constants';

// ---------------------------------------------------------------------------
// Gem definitions — one per game
// ---------------------------------------------------------------------------

interface GemDef {
  color: string;
  name: string;
  game: GameName;
  icon: 'flame' | 'dragon' | 'shield' | 'star';
  x: number;
  y: number;
}

const GEM_RADIUS = 50;

const GEMS: GemDef[] = [
  { color: '#FF3333', name: 'Gem Hunt',  game: 'flame-colors',      icon: 'flame',    x: 220, y: 340 },
  { color: '#FF8833', name: 'Feed',      game: 'fireball-count',    icon: 'dragon',   x: 460, y: 340 },
  { color: '#33CC33', name: 'Fortress',  game: 'evolution-tower',   icon: 'shield',   x: 700, y: 340 },
  { color: '#3377FF', name: 'Runes',     game: 'sky-writer',        icon: 'star',     x: 220, y: 570 },
];

// Power meter gem slot size
const METER_GEM_SIZE = 30;

// ---------------------------------------------------------------------------
// Hub Screen
// ---------------------------------------------------------------------------

export class HubScreen implements GameScreen {
  private bg = new Background();
  private particles = new ParticlePool();
  private sprite = new SpriteAnimator(SPRITES['charizard-megax']);
  private time = 0;
  private gameContext!: GameContext;
  private orbSelectionPending = false;
  private justCollectedGem: GameName | null = null;
  private gemCollectAnimTime = 0;
  private wingFlutterTimer = 0;

  private get audio(): any { return (this.gameContext as any).audio; }

  enter(ctx: GameContext): void {
    this.gameContext = ctx;
    this.time = 0;
    this.orbSelectionPending = false;
    this.justCollectedGem = null;
    this.gemCollectAnimTime = 0;
    this.wingFlutterTimer = 0;
    setActivePool(this.particles);
    this.particles.clear();

    // Collect gem from just-completed game
    if (session.currentGame && !session.gemsCollected.includes(session.currentGame)) {
      session.gemsCollected = [...session.gemsCollected, session.currentGame];
      this.justCollectedGem = session.currentGame;
      this.gemCollectAnimTime = 0;
      // Play cheer sound for gem collection
      this.audio?.playSynth('cheer');
    }
    session.currentGame = null;

    // Named greeting via Ash voice
    const audio = (ctx as any).audio;
    if (audio) {
      const voice = new VoiceSystem(audio);
      if (session.gemsCollected.length === 0) {
        voice.ash('ash-welcome');
      } else {
        voice.ash('ash-lets-go');
      }
    }

    // Trigger victory roar video when a gem was just collected
    if (this.justCollectedGem) {
      this.gameContext.events.emit({ type: 'play-video', src: VIDEOS.victoryRoar });
    }

    // Check for finale — all 4 gems collected
    if (session.gemsCollected.length >= 4) {
      setTimeout(() => ctx.screenManager.goTo('finale'), 2000);
      return;
    }
  }

  update(dt: number): void {
    this.time += dt;
    this.bg.update(dt);
    this.sprite.update(dt);
    this.particles.update(dt);

    // Gem collection animation timer
    if (this.justCollectedGem) {
      this.gemCollectAnimTime += dt;
      if (this.gemCollectAnimTime > 2.0) {
        this.justCollectedGem = null;
      }
    }

    const gemCount = session.gemsCollected.length;

    // Ambient flame particles — intensity based on gem count
    const flameRate = 0.15 + gemCount * 0.08;
    if (Math.random() < flameRate) {
      const flameColors = ['#37B1E2', '#E0F7FF', '#FFFFFF', '#1A5C8A'];
      this.particles.flame(
        DESIGN_WIDTH * 0.72, DESIGN_HEIGHT * 0.65, 1,
        flameColors,
        30 + gemCount * 8,
      );
    }

    // MCX flame intensity based on gem count — more gems = more dramatic flames
    if (gemCount >= 3) {
      // Intense flames at 3+ gems
      this.wingFlutterTimer += dt;
      if (this.wingFlutterTimer > 2.0) {
        this.wingFlutterTimer = 0;
        const burstColors = ['#37B1E2', '#E0F7FF', '#FFFFFF'];
        this.particles.flame(
          DESIGN_WIDTH * 0.72 + (Math.random() - 0.5) * 40,
          DESIGN_HEIGHT * 0.45, 1, burstColors, 40,
        );
      }
    } else if (gemCount >= 2) {
      // Moderate flames at 2 gems
      this.wingFlutterTimer += dt;
      if (this.wingFlutterTimer > 3.0) {
        this.wingFlutterTimer = 0;
        const burstColors = ['#37B1E2', '#E0F7FF', '#FFFFFF'];
        this.particles.flame(
          DESIGN_WIDTH * 0.72 + (Math.random() - 0.5) * 30,
          DESIGN_HEIGHT * 0.48, 1, burstColors, 25,
        );
      }
    }

    // Extra flame particles for higher gem counts
    if (gemCount >= 1 && Math.random() < gemCount * 0.05) {
      const flameColors = ['#37B1E2', '#E0F7FF', '#FFFFFF'];
      this.particles.flame(
        DESIGN_WIDTH * 0.72 + (Math.random() - 0.5) * 60,
        DESIGN_HEIGHT * 0.50,
        1,
        flameColors,
        20,
      );
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.bg.render(ctx);

    const gemCount = session.gemsCollected.length;

    // Warm glow behind MCX — brighter with more gems
    const glowIntensity = 0.15 + gemCount * 0.04;
    const glowGrad = ctx.createRadialGradient(
      DESIGN_WIDTH * 0.72, DESIGN_HEIGHT * 0.55, 40,
      DESIGN_WIDTH * 0.72, DESIGN_HEIGHT * 0.55, 350 + gemCount * 30,
    );
    glowGrad.addColorStop(0, `rgba(55, 177, 226, ${glowIntensity})`);
    glowGrad.addColorStop(0.5, `rgba(240, 128, 48, ${glowIntensity * 0.5})`);
    glowGrad.addColorStop(1, 'rgba(240, 128, 48, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Draw volcanic mountain/perch for MCX
    this.drawMountain(ctx);

    // MCX perched center-right on the volcanic mountain (sprite at 6x for pixel art upscaling)
    this.sprite.render(ctx, DESIGN_WIDTH * 0.72, DESIGN_HEIGHT * 0.55, 6);

    // Draw gem orbs
    for (const gem of GEMS) {
      this.drawGemOrb(ctx, gem);
    }

    this.particles.render(ctx);

    // Title
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px system-ui';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(55, 177, 226, 0.6)';
    ctx.shadowBlur = 20;
    ctx.fillText('MEGA CHARIZARD ACADEMY', DESIGN_WIDTH / 2, 120);
    ctx.restore();

    // Subtitle
    ctx.save();
    ctx.fillStyle = '#91CCEC';
    ctx.font = '36px system-ui';
    ctx.textAlign = 'center';
    const subtitleText = gemCount >= 4
      ? 'MCX is fully powered!'
      : gemCount > 0
        ? `Help MCX power up! (${gemCount}/4 gems)`
        : 'Help MCX power up!';
    ctx.fillText(subtitleText, DESIGN_WIDTH / 2, 180);
    ctx.restore();

    // Power meter at bottom
    this.drawPowerMeter(ctx);

    // Gem collection flash animation
    if (this.justCollectedGem && this.gemCollectAnimTime < 1.5) {
      this.drawGemCollectFlash(ctx);
    }
  }

  exit(): void {
    this.particles.clear();
  }

  handleClick(x: number, y: number): void {
    if (this.orbSelectionPending) return;

    for (const gem of GEMS) {
      const dist = Math.sqrt((x - gem.x) ** 2 + (y - gem.y) ** 2);
      if (dist <= GEM_RADIUS * 1.3) {
        this.selectOrb(gem);
        return;
      }
    }
  }

  handleKey(_key: string): void {
    // Hotkeys handled centrally in GameCanvas
  }

  // ---------------------------------------------------------------------------
  // Orb selection
  // ---------------------------------------------------------------------------

  private selectOrb(gem: GemDef): void {
    if (this.orbSelectionPending) return;
    this.orbSelectionPending = true;

    // Sound effects
    this.audio?.playSynth('pop');

    // Fire burst at gem position
    this.particles.burst(gem.x, gem.y, 30, gem.color, 150, 0.8);
    this.audio?.playSynth('roar');

    // Store selected game
    session.currentGame = gem.game;

    // Transition after delay
    setTimeout(() => {
      session.currentScreen = 'game';
      this.gameContext.screenManager.goTo(gem.game);
    }, 800);
  }

  // ---------------------------------------------------------------------------
  // Drawing helpers
  // ---------------------------------------------------------------------------

  private drawMountain(ctx: CanvasRenderingContext2D): void {
    // Simple volcanic mountain silhouette behind MCX
    const mx = DESIGN_WIDTH * 0.72;
    const baseY = DESIGN_HEIGHT * 0.95;
    const peakY = DESIGN_HEIGHT * 0.45;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(mx - 280, baseY);
    ctx.bezierCurveTo(mx - 220, baseY - 100, mx - 140, peakY + 80, mx - 40, peakY);
    ctx.bezierCurveTo(mx, peakY - 10, mx + 40, peakY, mx + 40, peakY);
    ctx.bezierCurveTo(mx + 140, peakY + 80, mx + 220, baseY - 100, mx + 280, baseY);
    ctx.closePath();

    const mtnGrad = ctx.createLinearGradient(mx, peakY, mx, baseY);
    mtnGrad.addColorStop(0, '#1a0f2e');
    mtnGrad.addColorStop(0.4, '#140a22');
    mtnGrad.addColorStop(1, '#0a0614');
    ctx.fillStyle = mtnGrad;
    ctx.fill();

    // Lava glow at peak
    const lavaGrad = ctx.createRadialGradient(mx, peakY + 30, 5, mx, peakY + 30, 60);
    lavaGrad.addColorStop(0, 'rgba(255, 100, 30, 0.3)');
    lavaGrad.addColorStop(1, 'rgba(255, 60, 10, 0)');
    ctx.fillStyle = lavaGrad;
    ctx.beginPath();
    ctx.arc(mx, peakY + 30, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawGemOrb(ctx: CanvasRenderingContext2D, gem: GemDef): void {
    const collected = session.gemsCollected.includes(gem.game);
    const isJustCollected = this.justCollectedGem === gem.game;
    const r = GEM_RADIUS;

    ctx.save();

    if (collected) {
      // Float animation for collected gems
      const floatY = Math.sin(this.time * 1.5 + gem.x * 0.01) * 5;
      ctx.translate(0, floatY);

      // Bright glow halo
      const glowGrad = ctx.createRadialGradient(gem.x, gem.y, r * 0.3, gem.x, gem.y, r * 2.0);
      glowGrad.addColorStop(0, gem.color + 'aa');
      glowGrad.addColorStop(0.5, gem.color + '44');
      glowGrad.addColorStop(1, gem.color + '00');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(gem.x, gem.y, r * 2.0, 0, Math.PI * 2);
      ctx.fill();

      // Orb body — bright gradient
      const orbGrad = ctx.createRadialGradient(gem.x - r * 0.2, gem.y - r * 0.2, r * 0.05, gem.x, gem.y, r);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.25, gem.color);
      orbGrad.addColorStop(1, gem.color + 'cc');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(gem.x, gem.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Bright outline
      ctx.strokeStyle = '#ffffffaa';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Checkmark overlay
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(gem.x - 15, gem.y + 2);
      ctx.lineTo(gem.x - 3, gem.y + 14);
      ctx.lineTo(gem.x + 18, gem.y - 12);
      ctx.stroke();
    } else {
      // Uncollected gem — subtle pulse, dimmer
      const pulse = 1 + 0.04 * Math.sin(this.time * 2.5 + gem.x * 0.02);

      // Dim glow halo
      const glowGrad = ctx.createRadialGradient(gem.x, gem.y, r * 0.5, gem.x, gem.y, r * 1.5);
      glowGrad.addColorStop(0, gem.color + '30');
      glowGrad.addColorStop(1, gem.color + '00');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(gem.x, gem.y, r * 1.5 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Orb body — dimmer
      const orbGrad = ctx.createRadialGradient(gem.x - r * 0.2, gem.y - r * 0.2, r * 0.1, gem.x, gem.y, r);
      orbGrad.addColorStop(0, gem.color + '88');
      orbGrad.addColorStop(0.4, gem.color + '55');
      orbGrad.addColorStop(1, gem.color + '22');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(gem.x, gem.y, r * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Outline
      ctx.strokeStyle = gem.color + '66';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Draw icon inside the orb
    this.drawGemIcon(ctx, gem.x, gem.y, gem.icon, collected);

    // Label below orb
    ctx.fillStyle = collected ? '#ffffff' : '#aaaacc';
    ctx.font = collected ? 'bold 24px system-ui' : '22px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(gem.name, gem.x, gem.y + r + 30);

    ctx.restore();
  }

  private drawGemIcon(ctx: CanvasRenderingContext2D, x: number, y: number, icon: string, collected: boolean): void {
    ctx.save();
    ctx.globalAlpha = collected ? 0.9 : 0.5;
    ctx.fillStyle = collected ? '#ffffff' : '#ffffffaa';
    ctx.strokeStyle = collected ? '#ffffff' : '#ffffff88';
    ctx.lineWidth = 2;

    switch (icon) {
      case 'flame': {
        // Triangle (flame shape)
        ctx.beginPath();
        ctx.moveTo(x, y - 22);
        ctx.lineTo(x - 16, y + 14);
        ctx.lineTo(x + 16, y + 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'dragon': {
        // Circle with two ear bumps
        ctx.beginPath();
        ctx.arc(x, y + 2, 16, 0, Math.PI * 2);
        ctx.fill();
        // Ears
        ctx.beginPath();
        ctx.arc(x - 12, y - 14, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 12, y - 14, 7, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'shield': {
        // Pentagon shield shape
        ctx.beginPath();
        ctx.moveTo(x, y - 22);
        ctx.lineTo(x + 20, y - 8);
        ctx.lineTo(x + 14, y + 16);
        ctx.lineTo(x - 14, y + 16);
        ctx.lineTo(x - 20, y - 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'star': {
        // 5-point star
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const outerAngle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
          const innerAngle = outerAngle + Math.PI / 5;
          const outerR = 20;
          const innerR = 9;
          if (i === 0) {
            ctx.moveTo(x + Math.cos(outerAngle) * outerR, y + Math.sin(outerAngle) * outerR);
          } else {
            ctx.lineTo(x + Math.cos(outerAngle) * outerR, y + Math.sin(outerAngle) * outerR);
          }
          ctx.lineTo(x + Math.cos(innerAngle) * innerR, y + Math.sin(innerAngle) * innerR);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
  }

  private drawPowerMeter(ctx: CanvasRenderingContext2D): void {
    const meterY = DESIGN_HEIGHT * 0.92;
    const totalWidth = GEMS.length * (METER_GEM_SIZE * 2 + 16) - 16;
    const startX = DESIGN_WIDTH / 2 - totalWidth / 2;

    // Meter background bar
    ctx.save();
    ctx.fillStyle = 'rgba(20, 15, 40, 0.6)';
    ctx.strokeStyle = 'rgba(55, 177, 226, 0.3)';
    ctx.lineWidth = 2;
    const barPad = 20;
    const barH = METER_GEM_SIZE * 2 + barPad;
    ctx.beginPath();
    ctx.roundRect(
      startX - barPad, meterY - METER_GEM_SIZE - barPad / 2,
      totalWidth + barPad * 2, barH,
      12,
    );
    ctx.fill();
    ctx.stroke();

    // Label
    ctx.fillStyle = '#8888aa';
    ctx.font = '18px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('POWER GEMS', DESIGN_WIDTH / 2, meterY - METER_GEM_SIZE - barPad / 2 - 8);
    ctx.restore();

    // Draw 4 diamond-shaped gem slots
    for (let i = 0; i < GEMS.length; i++) {
      const gem = GEMS[i];
      const slotX = startX + i * (METER_GEM_SIZE * 2 + 16) + METER_GEM_SIZE;
      const slotY = meterY;
      const collected = session.gemsCollected.includes(gem.game);
      const s = METER_GEM_SIZE;

      ctx.save();

      // Diamond shape
      ctx.beginPath();
      ctx.moveTo(slotX, slotY - s);
      ctx.lineTo(slotX + s * 0.7, slotY);
      ctx.lineTo(slotX, slotY + s);
      ctx.lineTo(slotX - s * 0.7, slotY);
      ctx.closePath();

      if (collected) {
        // Glow
        ctx.save();
        ctx.shadowColor = gem.color;
        ctx.shadowBlur = 15;
        const fillGrad = ctx.createLinearGradient(slotX, slotY - s, slotX, slotY + s);
        fillGrad.addColorStop(0, '#ffffff');
        fillGrad.addColorStop(0.3, gem.color);
        fillGrad.addColorStop(1, gem.color + 'aa');
        ctx.fillStyle = fillGrad;
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = '#ffffffaa';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Empty slot
        ctx.fillStyle = 'rgba(40, 35, 60, 0.5)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 90, 130, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private drawGemCollectFlash(ctx: CanvasRenderingContext2D): void {
    if (!this.justCollectedGem) return;

    const gem = GEMS.find(g => g.game === this.justCollectedGem);
    if (!gem) return;

    const t = this.gemCollectAnimTime;

    // Expanding ring effect
    if (t < 1.0) {
      const progress = t / 1.0;
      const ringRadius = GEM_RADIUS + progress * 200;
      const alpha = 1.0 - progress;

      ctx.save();
      ctx.strokeStyle = gem.color;
      ctx.lineWidth = 4 * (1 - progress);
      ctx.globalAlpha = alpha * 0.6;
      ctx.beginPath();
      ctx.arc(gem.x, gem.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Flash overlay
    if (t < 0.3) {
      const flashAlpha = (0.3 - t) / 0.3 * 0.15;
      ctx.save();
      ctx.fillStyle = gem.color;
      ctx.globalAlpha = flashAlpha;
      ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
      ctx.restore();
    }

    // "GEM COLLECTED!" text
    if (t < 1.5) {
      const textAlpha = t < 0.3 ? t / 0.3 : t > 1.0 ? (1.5 - t) / 0.5 : 1.0;
      const textY = DESIGN_HEIGHT * 0.25 - Math.min(t * 20, 20);

      ctx.save();
      ctx.globalAlpha = textAlpha;
      ctx.fillStyle = gem.color;
      ctx.font = 'bold 56px system-ui';
      ctx.textAlign = 'center';
      ctx.shadowColor = gem.color;
      ctx.shadowBlur = 20;
      ctx.fillText('GEM COLLECTED!', DESIGN_WIDTH / 2, textY);
      ctx.restore();
    }
  }
}
