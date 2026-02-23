// src/engine/screens/hub.ts
import type { GameScreen, GameContext } from '../screen-manager';
import { Background } from '../entities/backgrounds';
import { ParticlePool } from '../entities/particles';
import { Charizard } from '../entities/charizard';
import { TweenManager } from '../utils/tween';
import { theme } from '../../config/theme';
import { DESIGN_WIDTH, DESIGN_HEIGHT, HUB_ORB_DIAMETER, CHARIZARD_HUB_SCALE } from '../../config/constants';

const ORBS = [
  { color: '#3377ff', label: 'Colors', x: 560, y: 450 },
  { color: '#ff3333', label: 'Count', x: 860, y: 350 },
  { color: '#33cc33', label: 'Shapes', x: 1160, y: 450 },
  { color: '#ff8833', label: 'Letters', x: 960, y: 600 },
];

export class HubScreen implements GameScreen {
  private bg = new Background();
  private particles = new ParticlePool();
  private tweens = new TweenManager();
  private charizard = new Charizard(this.particles, this.tweens);
  private time = 0;

  enter(_ctx: GameContext): void {
    this.time = 0;
    this.particles.clear();
    this.tweens.clear();
    this.charizard.setPose('perch');
  }

  update(dt: number): void {
    this.time += dt;
    this.bg.update(dt);
    this.tweens.update(dt);
    this.charizard.update(dt);
    this.particles.update(dt);

    // Ambient embers (Rule 2: always have warm light)
    if (Math.random() < 0.3) {
      this.particles.flame(
        DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.75, 1,
        [theme.palette.fire.mid, theme.palette.fire.spark],
        40,
      );
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.bg.render(ctx);

    // Warm glow behind character position (Rule 2: warm light source)
    const glowGrad = ctx.createRadialGradient(
      DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.55, 50,
      DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.55, 400,
    );
    glowGrad.addColorStop(0, 'rgba(240, 128, 48, 0.25)');
    glowGrad.addColorStop(1, 'rgba(240, 128, 48, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Charizard in perch pose, sitting on the mountain (behind orbs, in front of glow)
    this.charizard.render(ctx, DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.65, CHARIZARD_HUB_SCALE);

    // Placeholder orbs
    for (const orb of ORBS) {
      const r = HUB_ORB_DIAMETER / 2;
      const pulse = 1 + 0.03 * Math.sin(this.time * 2 + orb.x);

      // Glow halo
      const orbGlow = ctx.createRadialGradient(orb.x, orb.y, r * 0.5, orb.x, orb.y, r * 1.5);
      orbGlow.addColorStop(0, orb.color + '60');
      orbGlow.addColorStop(1, orb.color + '00');
      ctx.fillStyle = orbGlow;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, r * 1.5 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Orb body
      const orbGrad = ctx.createRadialGradient(orb.x - r * 0.2, orb.y - r * 0.2, r * 0.1, orb.x, orb.y, r);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.3, orb.color);
      orbGrad.addColorStop(1, orb.color + 'aa');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, r * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Outline
      ctx.strokeStyle = '#ffffff44';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    this.particles.render(ctx);

    // Placeholder title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('MEGA CHARIZARD ACADEMY', DESIGN_WIDTH / 2, 160);
  }

  exit(): void {
    this.particles.clear();
  }

  handleClick(x: number, y: number): void {
    // TODO: orb click detection
  }

  handleKey(_key: string): void {
    // TODO: handled by input system
  }
}
