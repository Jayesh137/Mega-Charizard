// src/engine/entities/backgrounds.ts
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../../config/constants';
import { theme } from '../../config/theme';
import { randomRange } from '../utils/math';

export type BackgroundVariant = 'default' | 'volcanic-cave' | 'arena' | 'forge' | 'mountain-night' | 'stadium';

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
  private variant: BackgroundVariant;

  // Offscreen canvas for static mountain silhouette
  private mountainCanvas: OffscreenCanvas | null = null;

  constructor(private starCount = 40, variant: BackgroundVariant = 'default') {
    this.variant = variant;
    if (variant === 'mountain-night' || variant === 'default' || variant === 'stadium') {
      this.generateStars();
    }
    if (variant === 'default') {
      this.prerenderMountains();
    }
  }

  private generateStars(): void {
    const count = this.variant === 'mountain-night' ? Math.max(this.starCount, 80) : this.starCount;
    this.stars = Array.from({ length: count }, () => ({
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
    switch (this.variant) {
      case 'volcanic-cave': this.renderVolcanicCave(ctx); break;
      case 'arena': this.renderArena(ctx); break;
      case 'forge': this.renderForge(ctx); break;
      case 'mountain-night': this.renderMountainNight(ctx); break;
      case 'stadium': this.renderStadium(ctx); break;
      default: this.renderDefault(ctx); break;
    }
  }

  // ---------------------------------------------------------------------------
  // Default — purple gradient with mountains and stars
  // ---------------------------------------------------------------------------

  private renderDefault(ctx: CanvasRenderingContext2D): void {
    const { dark, mid, accent } = theme.palette.background;

    const grad = ctx.createRadialGradient(
      DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.4, 100,
      DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.4, DESIGN_HEIGHT,
    );
    grad.addColorStop(0, mid);
    grad.addColorStop(0.5, accent);
    grad.addColorStop(1, dark);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    if (this.mountainCanvas) {
      ctx.drawImage(this.mountainCanvas, 0, 0);
    }

    this.renderStars(ctx);
  }

  // ---------------------------------------------------------------------------
  // Volcanic Cave — deep red/orange gradient, stalactites, lava glow
  // ---------------------------------------------------------------------------

  private renderVolcanicCave(ctx: CanvasRenderingContext2D): void {
    // Deep dark red-to-black gradient
    const grad = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
    grad.addColorStop(0, '#0a0508');
    grad.addColorStop(0.3, '#1a0a0e');
    grad.addColorStop(0.7, '#2a0c0a');
    grad.addColorStop(1, '#0a0508');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Lava glow at bottom
    const lavaGrad = ctx.createRadialGradient(
      DESIGN_WIDTH / 2, DESIGN_HEIGHT + 50, 50,
      DESIGN_WIDTH / 2, DESIGN_HEIGHT + 50, DESIGN_HEIGHT * 0.6,
    );
    lavaGrad.addColorStop(0, 'rgba(255, 80, 20, 0.25)');
    lavaGrad.addColorStop(0.4, 'rgba(200, 50, 10, 0.12)');
    lavaGrad.addColorStop(1, 'rgba(100, 20, 5, 0)');
    ctx.fillStyle = lavaGrad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Stalactites at top
    ctx.fillStyle = '#0d0610';
    const stalactites = [120, 300, 480, 650, 850, 1050, 1200, 1400, 1600, 1780];
    for (const sx of stalactites) {
      const h = randomRange(40, 120) + 20 * Math.sin(sx * 0.01);
      const w = randomRange(15, 35);
      ctx.beginPath();
      ctx.moveTo(sx - w, 0);
      ctx.lineTo(sx, h);
      ctx.lineTo(sx + w, 0);
      ctx.closePath();
      ctx.fill();
    }

    // Blue crystal accents on stalactites (MCX theming)
    const crystalGlow = 0.3 + 0.15 * Math.sin(this.time * 1.5);
    for (let i = 0; i < stalactites.length; i += 3) {
      const sx = stalactites[i];
      ctx.save();
      ctx.globalAlpha = crystalGlow;
      ctx.fillStyle = '#37B1E2';
      ctx.beginPath();
      ctx.arc(sx, 30 + (i % 5) * 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Animated lava pulse at bottom edge
    const lavaPulse = 0.08 + 0.04 * Math.sin(this.time * 0.8);
    ctx.save();
    ctx.globalAlpha = lavaPulse;
    ctx.fillStyle = '#FF4500';
    ctx.fillRect(0, DESIGN_HEIGHT - 8, DESIGN_WIDTH, 8);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Arena — rocky terrain, dramatic sky, torches
  // ---------------------------------------------------------------------------

  private renderArena(ctx: CanvasRenderingContext2D): void {
    // Dark sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
    grad.addColorStop(0, '#0a0618');
    grad.addColorStop(0.35, '#1a0e2e');
    grad.addColorStop(0.65, '#2a1a3a');
    grad.addColorStop(1, '#120a1e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Rocky terrain floor
    ctx.fillStyle = '#1a1428';
    ctx.beginPath();
    ctx.moveTo(0, DESIGN_HEIGHT * 0.82);
    ctx.lineTo(200, DESIGN_HEIGHT * 0.80);
    ctx.lineTo(500, DESIGN_HEIGHT * 0.83);
    ctx.lineTo(800, DESIGN_HEIGHT * 0.79);
    ctx.lineTo(1100, DESIGN_HEIGHT * 0.82);
    ctx.lineTo(1400, DESIGN_HEIGHT * 0.78);
    ctx.lineTo(1700, DESIGN_HEIGHT * 0.81);
    ctx.lineTo(DESIGN_WIDTH, DESIGN_HEIGHT * 0.80);
    ctx.lineTo(DESIGN_WIDTH, DESIGN_HEIGHT);
    ctx.lineTo(0, DESIGN_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Torches on the sides
    const torchPositions = [
      { x: 80, y: DESIGN_HEIGHT * 0.55 },
      { x: DESIGN_WIDTH - 80, y: DESIGN_HEIGHT * 0.55 },
      { x: 200, y: DESIGN_HEIGHT * 0.65 },
      { x: DESIGN_WIDTH - 200, y: DESIGN_HEIGHT * 0.65 },
    ];

    for (const tp of torchPositions) {
      // Torch pole
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(tp.x - 4, tp.y, 8, DESIGN_HEIGHT - tp.y);

      // Flame glow
      const flameFlicker = 0.6 + 0.3 * Math.sin(this.time * 4 + tp.x * 0.01);
      const flameGrad = ctx.createRadialGradient(tp.x, tp.y - 10, 3, tp.x, tp.y - 10, 40);
      flameGrad.addColorStop(0, `rgba(255, 150, 30, ${flameFlicker})`);
      flameGrad.addColorStop(0.5, `rgba(255, 80, 20, ${flameFlicker * 0.4})`);
      flameGrad.addColorStop(1, 'rgba(255, 50, 10, 0)');
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y - 10, 40, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------------------------------------------------------------------------
  // Forge — dark interior, anvil silhouette, orange ember glow
  // ---------------------------------------------------------------------------

  private renderForge(ctx: CanvasRenderingContext2D): void {
    // Very dark warm interior
    const grad = ctx.createRadialGradient(
      DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.7, 50,
      DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.7, DESIGN_HEIGHT,
    );
    grad.addColorStop(0, '#2a1508');
    grad.addColorStop(0.4, '#1a0c06');
    grad.addColorStop(1, '#080404');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Central forge glow (molten metal)
    const forgeGlow = 0.15 + 0.08 * Math.sin(this.time * 1.2);
    const forgeGrad = ctx.createRadialGradient(
      DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.85, 20,
      DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.85, 300,
    );
    forgeGrad.addColorStop(0, `rgba(255, 140, 30, ${forgeGlow * 2})`);
    forgeGrad.addColorStop(0.3, `rgba(255, 80, 10, ${forgeGlow})`);
    forgeGrad.addColorStop(1, 'rgba(200, 40, 5, 0)');
    ctx.fillStyle = forgeGrad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Stone walls (dark rectangles at sides)
    ctx.fillStyle = '#0c0808';
    ctx.fillRect(0, 0, 60, DESIGN_HEIGHT);
    ctx.fillRect(DESIGN_WIDTH - 60, 0, 60, DESIGN_HEIGHT);

    // Anvil silhouette at bottom center
    ctx.fillStyle = '#151010';
    ctx.beginPath();
    ctx.moveTo(DESIGN_WIDTH / 2 - 80, DESIGN_HEIGHT * 0.88);
    ctx.lineTo(DESIGN_WIDTH / 2 + 80, DESIGN_HEIGHT * 0.88);
    ctx.lineTo(DESIGN_WIDTH / 2 + 50, DESIGN_HEIGHT * 0.92);
    ctx.lineTo(DESIGN_WIDTH / 2 + 60, DESIGN_HEIGHT * 0.95);
    ctx.lineTo(DESIGN_WIDTH / 2 - 60, DESIGN_HEIGHT * 0.95);
    ctx.lineTo(DESIGN_WIDTH / 2 - 50, DESIGN_HEIGHT * 0.92);
    ctx.closePath();
    ctx.fill();

    // Floating ember sparks
    const sparkAlpha = 0.4 + 0.3 * Math.sin(this.time * 2);
    for (let i = 0; i < 8; i++) {
      const ex = DESIGN_WIDTH / 2 + Math.sin(this.time * 0.7 + i * 1.2) * 200;
      const ey = DESIGN_HEIGHT * 0.6 - Math.abs(Math.sin(this.time * 0.5 + i * 0.8)) * 300;
      ctx.save();
      ctx.globalAlpha = sparkAlpha * (0.3 + 0.7 * Math.random());
      ctx.fillStyle = ['#FF8C00', '#FFD700', '#FF4500'][i % 3];
      ctx.beginPath();
      ctx.arc(ex, ey, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Mountain Night — deep blue, bright stars, moon, mountain silhouette
  // ---------------------------------------------------------------------------

  private renderMountainNight(ctx: CanvasRenderingContext2D): void {
    // Deep night sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
    grad.addColorStop(0, '#020410');
    grad.addColorStop(0.3, '#060818');
    grad.addColorStop(0.6, '#0a0c22');
    grad.addColorStop(1, '#0d0e28');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Moon
    ctx.save();
    ctx.fillStyle = '#fffff0';
    ctx.shadowColor = 'rgba(255, 255, 220, 0.3)';
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(DESIGN_WIDTH * 0.82, DESIGN_HEIGHT * 0.15, 50, 0, Math.PI * 2);
    ctx.fill();
    // Moon crater shadow
    ctx.fillStyle = '#e8e0c0';
    ctx.beginPath();
    ctx.arc(DESIGN_WIDTH * 0.82 + 15, DESIGN_HEIGHT * 0.15 - 10, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Stars (extra bright for this variant)
    for (const star of this.stars) {
      const alpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(this.time * star.twinkleSpeed + star.twinkleOffset));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Mountain silhouettes at bottom
    ctx.fillStyle = '#080a18';
    ctx.beginPath();
    ctx.moveTo(0, DESIGN_HEIGHT);
    ctx.lineTo(0, DESIGN_HEIGHT * 0.72);
    ctx.lineTo(250, DESIGN_HEIGHT * 0.58);
    ctx.lineTo(500, DESIGN_HEIGHT * 0.68);
    ctx.lineTo(700, DESIGN_HEIGHT * 0.52);
    ctx.lineTo(950, DESIGN_HEIGHT * 0.65);
    ctx.lineTo(1200, DESIGN_HEIGHT * 0.55);
    ctx.lineTo(1450, DESIGN_HEIGHT * 0.62);
    ctx.lineTo(1700, DESIGN_HEIGHT * 0.58);
    ctx.lineTo(DESIGN_WIDTH, DESIGN_HEIGHT * 0.70);
    ctx.lineTo(DESIGN_WIDTH, DESIGN_HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  // ---------------------------------------------------------------------------
  // Stadium — arena with crowd energy particles
  // ---------------------------------------------------------------------------

  private renderStadium(ctx: CanvasRenderingContext2D): void {
    // Dark gradient with warm highlights
    const grad = ctx.createRadialGradient(
      DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.3, 100,
      DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.3, DESIGN_HEIGHT,
    );
    grad.addColorStop(0, '#1a1230');
    grad.addColorStop(0.5, '#120a22');
    grad.addColorStop(1, '#08050e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    // Stadium seating (curved rows at sides)
    ctx.fillStyle = '#0e0818';
    ctx.beginPath();
    ctx.moveTo(0, DESIGN_HEIGHT * 0.3);
    ctx.quadraticCurveTo(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.6, DESIGN_WIDTH, DESIGN_HEIGHT * 0.3);
    ctx.lineTo(DESIGN_WIDTH, DESIGN_HEIGHT);
    ctx.lineTo(0, DESIGN_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Crowd "energy" — flickering dots in the seating area
    const crowdRows = 5;
    for (let row = 0; row < crowdRows; row++) {
      const rowY = DESIGN_HEIGHT * (0.75 + row * 0.04);
      const dotsPerRow = 30 + row * 5;
      for (let i = 0; i < dotsPerRow; i++) {
        const dotX = (i / dotsPerRow) * DESIGN_WIDTH;
        const flicker = Math.sin(this.time * 3 + i * 0.5 + row * 2) > 0.3;
        if (flicker) {
          ctx.save();
          ctx.globalAlpha = 0.15 + 0.1 * Math.sin(this.time * 2 + i);
          ctx.fillStyle = ['#FFD700', '#37B1E2', '#FF6B35', '#91CCEC'][i % 4];
          ctx.beginPath();
          ctx.arc(dotX, rowY, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // Spotlight beams from corners
    const spotAlpha = 0.04 + 0.02 * Math.sin(this.time * 0.5);
    ctx.save();
    ctx.globalAlpha = spotAlpha;
    ctx.fillStyle = '#37B1E2';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(DESIGN_WIDTH * 0.35, DESIGN_HEIGHT * 0.5);
    ctx.lineTo(DESIGN_WIDTH * 0.25, DESIGN_HEIGHT * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(DESIGN_WIDTH, 0);
    ctx.lineTo(DESIGN_WIDTH * 0.65, DESIGN_HEIGHT * 0.5);
    ctx.lineTo(DESIGN_WIDTH * 0.75, DESIGN_HEIGHT * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Stars above the stadium
    this.renderStars(ctx);
  }

  // ---------------------------------------------------------------------------
  // Shared star renderer
  // ---------------------------------------------------------------------------

  private renderStars(ctx: CanvasRenderingContext2D): void {
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
