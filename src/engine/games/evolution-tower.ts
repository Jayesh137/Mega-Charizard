// src/engine/games/evolution-tower.ts
// Mini-game 3: Evolution Tower — Shape Matching + Size Comparison
//
// Shape mode: MCX hovers to the side, breathing blue flame that "forges" shape blocks.
// A shape outline glows on the tower pedestal. 2-3 shape choices float above.
// Player clicks matching shape. Charizard grabs it, slams it into place with
// fiery impact. Tower grows upward. After 3-5 blocks, tower complete.
// Charizard perches on top as the reward moment.
//
// Size mode (every other round): Open field instead of tower.
// "Which is bigger?" / "Which is smaller?" prompts.
// Owen: big vs small (2 choices)
// Kian: small/medium/big sorting (3 choices)
// Final size round: order Charmander/Charmeleon/Charizard smallest-to-biggest
//
// Dual difficulty:
//   Owen (little): 2 choices, basic shapes (circle/square/triangle)
//   Kian (big):    3 choices, extended shapes, small/medium/big sorting
//
// Shape introduction is gradual (from shapes.ts introducedAfterRounds)

import type { GameScreen, GameContext } from '../screen-manager';
import { Background } from '../entities/backgrounds';
import { ParticlePool } from '../entities/particles';
import { Charizard } from '../entities/charizard';
import { TweenManager, easing } from '../utils/tween';
import {
  shapes,
  shapeDifficulty,
  type ShapeItem,
} from '../../content/shapes';
import {
  DESIGN_WIDTH,
  DESIGN_HEIGHT,
  PROMPTS_PER_ROUND,
  FONT,
  PROMPT_TIMEOUT,
} from '../../config/constants';
import { theme } from '../../config/theme';
import { session } from '../../state/session.svelte';
import { settings } from '../../state/settings.svelte';
import { handleHotkey } from '../input';
import { randomRange, randomInt } from '../utils/math';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Charizard position: left side, slightly elevated (breathing flame to forge)
const CHAR_X = DESIGN_WIDTH * 0.13;
const CHAR_Y = DESIGN_HEIGHT * 0.50;
const CHAR_SCALE = 0.50;

// Tower pedestal: center of screen, near the bottom
const PEDESTAL_X = DESIGN_WIDTH * 0.52;
const PEDESTAL_Y = DESIGN_HEIGHT * 0.82;
const PEDESTAL_WIDTH = 240;
const PEDESTAL_HEIGHT = 40;

// Tower block dimensions
const BLOCK_SIZE = 110;
const BLOCK_SPACING = 10;

// Choice block dimensions — large clickable cards floating at top
const CHOICE_SIZE = 150;
const CHOICE_Y = 180;

// Shape fill color: blue flame aesthetic
const SHAPE_FILL = theme.palette.fire.mid;     // '#37B1E2'
const SHAPE_FILL_LIGHT = theme.palette.fire.spark; // '#91CCEC'
const SHAPE_OUTLINE = '#000000';
const SHAPE_OUTLINE_WIDTH = 5;

// Flame particle palette
const FLAME_COLORS = ['#FFFFFF', '#91CCEC', '#37B1E2', '#1a5fc4'];
const FORGE_COLORS = ['#FFFFFF', '#37B1E2', '#91CCEC', '#FFD700'];

// Timing
const BANNER_DURATION = 1.8;
const SLAM_FLIGHT_TIME = 0.35;
const SLAM_IMPACT_PAUSE = 0.25;
const CELEBRATION_DURATION = 1.8;
const PERCH_DURATION = 2.5;
const TOWER_BLOCKS_MIN = 3;
const TOWER_BLOCKS_MAX = 5;

// Screen shake
const SHAKE_INTENSITY = 15;
const SHAKE_DECAY = 0.86;

// Size mode constants
const SIZE_FIELD_Y = DESIGN_HEIGHT * 0.55;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TowerBlock {
  shape: string;
  x: number;
  y: number;
  scale: number;        // animate from 0 to 1 on placement
  settled: boolean;
  impactFlash: number;  // 0..1 flash brightness
  swayOffset: number;   // sway phase offset
}

interface ChoiceBlock {
  shape: string;
  x: number;
  y: number;
  size: number;
  bobOffset: number;   // individual bob phase
  hovered: boolean;
  alive: boolean;
  popTimer: number;     // > 0 = popping out
  isCorrect: boolean;
  hintLevel: number;    // 0 = none, 1 = gentle bounce, 2 = glow + bounce
}

interface FlyingBlock {
  shape: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;     // 0..1
  active: boolean;
}

interface SizeChoice {
  label: string;       // e.g. "big", "small", "medium"
  displaySize: number; // render size
  x: number;
  y: number;
  hitSize: number;     // clickable area size
  bobOffset: number;
  alive: boolean;
  isCorrect: boolean;
  color: string;
  form?: string;       // 'charmander'/'charmeleon'/'charizard' for evo round
}

type GamePhase =
  | 'banner'
  | 'forging'           // Charizard forge animation, show target outline
  | 'awaiting-choice'   // player picks shape / size
  | 'slam-flight'       // block flying to tower
  | 'slam-impact'       // block lands with impact
  | 'celebrating'       // correct celebration
  | 'perch'             // tower complete — Charizard perches on top
  | 'complete';

type GameMode = 'shape' | 'size';

// ---------------------------------------------------------------------------
// Shape Drawing Helper
// ---------------------------------------------------------------------------

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: string,
  x: number,
  y: number,
  size: number,
  fill: string,
  stroke: string = SHAPE_OUTLINE,
  lineWidth: number = SHAPE_OUTLINE_WIDTH,
): void {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;

  switch (shape) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;

    case 'square':
      roundRect(ctx, x - size / 2, y - size / 2, size, size, 10);
      ctx.fill();
      ctx.stroke();
      break;

    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.5);
      ctx.lineTo(x + size * 0.5, y + size * 0.4);
      ctx.lineTo(x - size * 0.5, y + size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;

    case 'star':
      drawStar(ctx, x, y, 5, size * 0.5, size * 0.22);
      ctx.fill();
      ctx.stroke();
      break;

    case 'heart':
      drawHeart(ctx, x, y, size);
      ctx.fill();
      ctx.stroke();
      break;

    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.5);
      ctx.lineTo(x + size * 0.38, y);
      ctx.lineTo(x, y + size * 0.5);
      ctx.lineTo(x - size * 0.38, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;

    case 'oval':
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.5, size * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;

    default:
      // Fallback: circle
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
  }
}

/** Draw a shape as just an outline (no fill) — used for the target silhouette on the tower */
function drawShapeOutline(
  ctx: CanvasRenderingContext2D,
  shape: string,
  x: number,
  y: number,
  size: number,
  stroke: string,
  lineWidth: number,
  dashPattern: number[] = [],
): void {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dashPattern);

  switch (shape) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case 'square':
      roundRect(ctx, x - size / 2, y - size / 2, size, size, 10);
      ctx.stroke();
      break;

    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.5);
      ctx.lineTo(x + size * 0.5, y + size * 0.4);
      ctx.lineTo(x - size * 0.5, y + size * 0.4);
      ctx.closePath();
      ctx.stroke();
      break;

    case 'star':
      drawStar(ctx, x, y, 5, size * 0.5, size * 0.22);
      ctx.stroke();
      break;

    case 'heart':
      drawHeart(ctx, x, y, size);
      ctx.stroke();
      break;

    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.5);
      ctx.lineTo(x + size * 0.38, y);
      ctx.lineTo(x, y + size * 0.5);
      ctx.lineTo(x - size * 0.38, y);
      ctx.closePath();
      ctx.stroke();
      break;

    case 'oval':
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.5, size * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;

    default:
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.stroke();
      break;
  }

  ctx.setLineDash([]);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  points: number,
  outerR: number,
  innerR: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
): void {
  const s = size * 0.28;
  const topY = cy - s * 0.6;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 1.5);
  // Left lobe
  ctx.bezierCurveTo(
    cx - s * 2.2, cy + s * 0.2,
    cx - s * 2.0, topY - s * 1.0,
    cx, topY,
  );
  // Right lobe
  ctx.bezierCurveTo(
    cx + s * 2.0, topY - s * 1.0,
    cx + s * 2.2, cy + s * 0.2,
    cx, cy + s * 1.5,
  );
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// EvolutionTowerGame
// ---------------------------------------------------------------------------

export class EvolutionTowerGame implements GameScreen {
  // Systems
  private bg = new Background(30);
  private particles = new ParticlePool();
  private tweens = new TweenManager();
  private charizard = new Charizard(this.particles, this.tweens);
  private gameContext!: GameContext;

  // Phase / flow
  private phase: GamePhase = 'banner';
  private phaseTimer = 0;
  private gameMode: GameMode = 'shape';
  private difficulty: 'little' | 'big' = 'little';
  private promptsRemaining = 0;
  private promptIndex = 0;
  private roundNumber = 0;
  private totalBlocks = 0;           // blocks needed to complete tower this round

  // Shape mode state
  private towerBlocks: TowerBlock[] = [];
  private choiceBlocks: ChoiceBlock[] = [];
  private currentTargetShape = '';
  private flyingBlock: FlyingBlock | null = null;
  private forgeTimer = 0;            // time spent in forging phase

  // Size mode state
  private sizeChoices: SizeChoice[] = [];
  private sizePrompt = '';            // "Which is BIGGER?" / "Which is SMALLER?"
  private sizeCorrectLabel = '';      // 'big', 'small', 'medium'

  // Banner
  private bannerName = '';
  private bannerAlpha = 0;

  // Screen shake
  private shakeX = 0;
  private shakeY = 0;
  private shakeAmount = 0;

  // Time accumulator
  private time = 0;

  // Input
  private inputLocked = false;
  private missCount = 0;
  private awaitTimer = 0;

  // Celebration
  private celebrationTimer = 0;

  // Perch animation
  private perchTimer = 0;
  private perchCharY = 0;            // animated Charizard Y for perching on tower

  // Target outline glow
  private targetGlowPhase = 0;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  enter(ctx: GameContext): void {
    this.gameContext = ctx;
    this.particles.clear();
    this.tweens.clear();
    this.time = 0;

    this.difficulty = session.currentTurn === 'kian' ? 'big' : 'little';
    this.bannerName = session.currentTurn === 'kian'
      ? settings.bigTrainerName
      : settings.littleTrainerName;

    this.promptsRemaining = PROMPTS_PER_ROUND.evolutionTower;
    this.promptIndex = 0;
    this.roundNumber = settings.roundsCompleted;

    // Alternate between shape and size mode every other round
    this.gameMode = this.roundNumber % 2 === 0 ? 'shape' : 'size';

    this.towerBlocks = [];
    this.choiceBlocks = [];
    this.sizeChoices = [];
    this.flyingBlock = null;

    this.charizard.setPose('fly');

    // Determine how many blocks to build for this tower
    this.totalBlocks = this.gameMode === 'shape'
      ? randomInt(TOWER_BLOCKS_MIN, TOWER_BLOCKS_MAX)
      : 0;

    this.startBanner();
  }

  update(dt: number): void {
    this.time += dt;
    this.phaseTimer += dt;
    this.bg.update(dt);
    this.tweens.update(dt);
    this.charizard.update(dt);
    this.particles.update(dt);
    this.targetGlowPhase += dt;

    // Screen shake decay
    if (this.shakeAmount > 0.5) {
      this.shakeX = (Math.random() - 0.5) * 2 * this.shakeAmount;
      this.shakeY = (Math.random() - 0.5) * 2 * this.shakeAmount;
      this.shakeAmount *= SHAKE_DECAY;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
      this.shakeAmount = 0;
    }

    // Ambient forge flames from Charizard's position
    if (this.phase !== 'perch' && this.phase !== 'complete' && Math.random() < 0.2) {
      this.particles.flame(
        CHAR_X + 80, CHAR_Y - 30, 1,
        FORGE_COLORS, 20,
      );
    }

    // Phase logic
    switch (this.phase) {
      case 'banner':
        this.updateBanner();
        break;
      case 'forging':
        this.updateForging(dt);
        break;
      case 'awaiting-choice':
        this.updateAwaiting(dt);
        break;
      case 'slam-flight':
        this.updateSlamFlight(dt);
        break;
      case 'slam-impact':
        this.updateSlamImpact(dt);
        break;
      case 'celebrating':
        this.updateCelebrating(dt);
        break;
      case 'perch':
        this.updatePerch(dt);
        break;
      case 'complete':
        break;
    }

    // Update tower block animations
    for (const block of this.towerBlocks) {
      if (block.impactFlash > 0) {
        block.impactFlash = Math.max(0, block.impactFlash - dt * 4);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    // Background
    this.bg.render(ctx);

    if (this.gameMode === 'shape') {
      this.renderShapeMode(ctx);
    } else {
      this.renderSizeMode(ctx);
    }

    // Particles on top of everything
    this.particles.render(ctx);

    // Banner overlay
    if (this.phase === 'banner') {
      this.renderBanner(ctx);
    }

    // Celebration overlay
    if (this.phase === 'celebrating') {
      this.renderCelebrationText(ctx);
    }

    ctx.restore();
  }

  exit(): void {
    this.particles.clear();
    this.tweens.clear();
  }

  handleClick(x: number, y: number): void {
    if (this.inputLocked) return;
    if (this.phase !== 'awaiting-choice') return;

    if (this.gameMode === 'shape') {
      this.handleShapeClick(x, y);
    } else {
      this.handleSizeClick(x, y);
    }
  }

  handleKey(key: string): void {
    handleHotkey(key);
    if (key === 'Escape') {
      this.gameContext.screenManager.goTo('hub');
    }
  }

  // ---------------------------------------------------------------------------
  // Difficulty & Shape Selection
  // ---------------------------------------------------------------------------

  private getDifficulty() {
    return this.difficulty === 'little'
      ? shapeDifficulty.little
      : shapeDifficulty.big;
  }

  /** Get shapes available at the current round/unlock level */
  private getAvailableShapes(): ShapeItem[] {
    const diff = this.getDifficulty();
    const rounds = settings.roundsCompleted;
    return shapes.filter(
      (s) =>
        s.introducedAfterRounds <= rounds &&
        diff.availableShapes.includes(s.name),
    );
  }

  // ---------------------------------------------------------------------------
  // Phase: Banner
  // ---------------------------------------------------------------------------

  private startBanner(): void {
    this.phase = 'banner';
    this.phaseTimer = 0;
    this.bannerAlpha = 0;
  }

  private updateBanner(): void {
    const t = this.phaseTimer / BANNER_DURATION;
    if (t < 0.3) {
      this.bannerAlpha = t / 0.3;
    } else if (t < 0.8) {
      this.bannerAlpha = 1;
    } else {
      this.bannerAlpha = 1 - (t - 0.8) / 0.2;
    }

    if (this.phaseTimer >= BANNER_DURATION) {
      if (this.gameMode === 'shape') {
        this.startForging();
      } else {
        this.startSizePrompt();
      }
    }
  }

  private renderBanner(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.bannerAlpha;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    const bannerY = DESIGN_HEIGHT * 0.4;
    const bannerH = 140;
    const bannerColor = this.difficulty === 'little'
      ? theme.palette.ui.bannerOrange
      : theme.palette.ui.bannerBlue;

    ctx.fillStyle = bannerColor;
    ctx.fillRect(0, bannerY, DESIGN_WIDTH, bannerH);

    // Glow edge
    const edgeGrad = ctx.createLinearGradient(0, bannerY, 0, bannerY + bannerH);
    edgeGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
    edgeGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
    edgeGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, bannerY, DESIGN_WIDTH, bannerH);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${FONT.bannerName}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.bannerName}'s Turn!`, DESIGN_WIDTH / 2, bannerY + bannerH * 0.42);

    ctx.font = `bold ${FONT.bannerRole}px system-ui`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const subtitle = this.gameMode === 'shape' ? 'Build the tower!' : 'Which is bigger?';
    ctx.fillText(subtitle, DESIGN_WIDTH / 2, bannerY + bannerH * 0.75);

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Phase: Forging (shape mode — show target + choices)
  // ---------------------------------------------------------------------------

  private startForging(): void {
    this.phase = 'forging';
    this.phaseTimer = 0;
    this.forgeTimer = 0;
    this.inputLocked = true;

    // Pick a random target shape
    const available = this.getAvailableShapes();
    const pick = available[Math.floor(Math.random() * available.length)];
    this.currentTargetShape = pick.name;

    // Charizard roars to forge
    this.charizard.setPose('roar');

    // Forge flame particles toward pedestal area
    const forgeInterval = setInterval(() => {
      this.forgeTimer += 0.05;
      if (this.forgeTimer >= 0.8) {
        clearInterval(forgeInterval);
      }
      // Stream of forge flames from Charizard toward the tower
      for (let i = 0; i < 4; i++) {
        const towerTopY = this.getTowerTopY();
        this.particles.spawn({
          x: CHAR_X + 100 + randomRange(0, 80),
          y: CHAR_Y - 40 + randomRange(-20, 20),
          vx: randomRange(120, 280),
          vy: randomRange(-30, -80),
          color: FORGE_COLORS[Math.floor(Math.random() * FORGE_COLORS.length)],
          size: randomRange(4, 12),
          lifetime: randomRange(0.3, 0.6),
          drag: 0.93,
          fadeOut: true,
          shrink: true,
        });
      }
    }, 50);

    // After forge completes, create choices and unlock input
    setTimeout(() => {
      this.charizard.setPose('fly');
      this.createShapeChoices();
      this.phase = 'awaiting-choice';
      this.phaseTimer = 0;
      this.inputLocked = false;
      this.missCount = 0;
      this.awaitTimer = 0;
    }, 900);
  }

  private createShapeChoices(): void {
    const diff = this.getDifficulty();
    const available = this.getAvailableShapes();
    const choiceCount = diff.choiceCount;

    this.choiceBlocks = [];

    // Correct choice
    this.choiceBlocks.push({
      shape: this.currentTargetShape,
      x: 0, y: CHOICE_Y,
      size: CHOICE_SIZE,
      bobOffset: Math.random() * Math.PI * 2,
      hovered: false,
      alive: true,
      popTimer: 0,
      isCorrect: true,
      hintLevel: 0,
    });

    // Wrong choices — distinct shapes
    const wrongPool = available.filter((s) => s.name !== this.currentTargetShape);
    const shuffled = [...wrongPool].sort(() => Math.random() - 0.5);
    for (let i = 0; i < choiceCount - 1 && i < shuffled.length; i++) {
      this.choiceBlocks.push({
        shape: shuffled[i].name,
        x: 0, y: CHOICE_Y,
        size: CHOICE_SIZE,
        bobOffset: Math.random() * Math.PI * 2,
        hovered: false,
        alive: true,
        popTimer: 0,
        isCorrect: false,
        hintLevel: 0,
      });
    }

    // Shuffle so correct isn't always first
    this.choiceBlocks.sort(() => Math.random() - 0.5);

    // Position choices evenly across the top
    const totalWidth = this.choiceBlocks.length * CHOICE_SIZE +
      (this.choiceBlocks.length - 1) * 60;
    const startX = DESIGN_WIDTH / 2 - totalWidth / 2 + CHOICE_SIZE / 2;
    for (let i = 0; i < this.choiceBlocks.length; i++) {
      this.choiceBlocks[i].x = startX + i * (CHOICE_SIZE + 60);
    }

    // Animate choices popping in
    for (let i = 0; i < this.choiceBlocks.length; i++) {
      const choice = this.choiceBlocks[i];
      const delay = i * 0.1;
      choice.size = 0;
      setTimeout(() => {
        this.tweens.add({
          from: 0,
          to: CHOICE_SIZE,
          duration: 0.35,
          easing: easing.easeOutBack,
          onUpdate: (v) => { choice.size = v; },
        });
      }, delay * 1000);
    }

    // Owen hint: gentle bounce on correct
    if (this.difficulty === 'little') {
      const correct = this.choiceBlocks.find((c) => c.isCorrect);
      if (correct) correct.hintLevel = 1;
    }
  }

  // ---------------------------------------------------------------------------
  // Phase: Awaiting Choice (shape + size modes share this phase name)
  // ---------------------------------------------------------------------------

  private updateAwaiting(dt: number): void {
    this.awaitTimer += dt;

    // Auto-complete failsafe
    if (this.awaitTimer >= PROMPT_TIMEOUT) {
      this.autoComplete();
    }

    // Update choice bob animations
    for (const c of this.choiceBlocks) {
      if (!c.alive) continue;
      // Hint bounce
      if (c.hintLevel >= 1 && c.isCorrect) {
        c.bobOffset += dt * 4;
      }
    }
  }

  private autoComplete(): void {
    if (this.gameMode === 'shape') {
      const correct = this.choiceBlocks.find((c) => c.isCorrect && c.alive);
      if (correct) this.handleCorrectShape(correct);
    } else {
      const correct = this.sizeChoices.find((c) => c.isCorrect && c.alive);
      if (correct) this.handleCorrectSize(correct);
    }
  }

  // ---------------------------------------------------------------------------
  // Shape Click Handler
  // ---------------------------------------------------------------------------

  private handleShapeClick(x: number, y: number): void {
    for (const c of this.choiceBlocks) {
      if (!c.alive) continue;
      const halfSize = c.size / 2 + 15; // generous hit area
      if (
        x >= c.x - halfSize && x <= c.x + halfSize &&
        y >= c.y - halfSize && y <= c.y + halfSize
      ) {
        if (c.isCorrect) {
          this.handleCorrectShape(c);
        } else {
          this.handleWrongShape(c);
        }
        return;
      }
    }
  }

  private handleCorrectShape(choice: ChoiceBlock): void {
    this.inputLocked = true;

    // Charizard attack to grab the block
    this.charizard.setPose('attack');

    // Pop out wrong choices
    for (const c of this.choiceBlocks) {
      if (c !== choice && c.alive) {
        c.alive = false;
      }
    }

    // Start flying the block to the tower
    const towerTopY = this.getTowerTopY();
    this.flyingBlock = {
      shape: choice.shape,
      x: choice.x,
      y: choice.y,
      startX: choice.x,
      startY: choice.y,
      targetX: PEDESTAL_X,
      targetY: towerTopY - BLOCK_SIZE / 2,
      progress: 0,
      active: true,
    };

    // Hide the choice
    choice.alive = false;

    this.phase = 'slam-flight';
    this.phaseTimer = 0;
  }

  private handleWrongShape(choice: ChoiceBlock): void {
    this.missCount++;
    this.awaitTimer = 0;

    // Red nope burst
    this.particles.burst(choice.x, choice.y, 10, theme.palette.ui.incorrect, 80, 0.4);
    this.shakeAmount = 4;

    // Escalate hints on the correct choice
    const correct = this.choiceBlocks.find((c) => c.isCorrect && c.alive);
    if (correct) {
      if (this.missCount >= 2) {
        correct.hintLevel = 2;
      } else if (this.missCount >= 1) {
        correct.hintLevel = 1;
      }
    }

    // Auto-complete after 3 misses
    if (this.missCount >= 3) {
      this.autoComplete();
    }
  }

  // ---------------------------------------------------------------------------
  // Phase: Slam Flight (block flies to tower)
  // ---------------------------------------------------------------------------

  private updateSlamFlight(dt: number): void {
    if (!this.flyingBlock || !this.flyingBlock.active) return;

    this.flyingBlock.progress += dt / SLAM_FLIGHT_TIME;

    if (this.flyingBlock.progress >= 1) {
      this.flyingBlock.progress = 1;
      this.flyingBlock.active = false;
      this.startSlamImpact();
    } else {
      const t = easing.easeIn(this.flyingBlock.progress);
      this.flyingBlock.x =
        this.flyingBlock.startX + (this.flyingBlock.targetX - this.flyingBlock.startX) * t;
      // Arc: parabolic upward offset
      const arcHeight = -120 * (1 - (2 * this.flyingBlock.progress - 1) ** 2);
      this.flyingBlock.y =
        this.flyingBlock.startY + (this.flyingBlock.targetY - this.flyingBlock.startY) * t + arcHeight;

      // Trailing flame particles
      if (Math.random() < 0.6) {
        this.particles.spawn({
          x: this.flyingBlock.x + randomRange(-8, 8),
          y: this.flyingBlock.y + randomRange(-8, 8),
          vx: randomRange(-40, 40),
          vy: randomRange(-60, 10),
          color: FLAME_COLORS[Math.floor(Math.random() * FLAME_COLORS.length)],
          size: randomRange(3, 9),
          lifetime: randomRange(0.15, 0.35),
          drag: 0.93,
          fadeOut: true,
          shrink: true,
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Phase: Slam Impact
  // ---------------------------------------------------------------------------

  private startSlamImpact(): void {
    this.phase = 'slam-impact';
    this.phaseTimer = 0;

    const towerTopY = this.getTowerTopY();

    // Add block to the tower
    const newBlock: TowerBlock = {
      shape: this.currentTargetShape,
      x: PEDESTAL_X,
      y: towerTopY - BLOCK_SIZE / 2,
      scale: 0,
      settled: false,
      impactFlash: 1.0,
      swayOffset: Math.random() * Math.PI * 2,
    };
    this.towerBlocks.push(newBlock);

    // Animate block scale (slams in with bounce)
    this.tweens.add({
      from: 0,
      to: 1,
      duration: 0.25,
      easing: easing.easeOutBack,
      onUpdate: (v) => { newBlock.scale = v; },
      onComplete: () => { newBlock.settled = true; },
    });

    // MASSIVE impact particles
    const impactX = PEDESTAL_X;
    const impactY = towerTopY;

    // 1. Fire explosion at impact point
    for (let i = 0; i < 30; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(80, 300);
      this.particles.spawn({
        x: impactX + randomRange(-15, 15),
        y: impactY + randomRange(-10, 10),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        color: FLAME_COLORS[Math.floor(Math.random() * FLAME_COLORS.length)],
        size: randomRange(5, 14),
        lifetime: randomRange(0.3, 0.7),
        gravity: 120,
        drag: 0.94,
        fadeOut: true,
        shrink: true,
      });
    }

    // 2. Gold sparks shooting upward
    for (let i = 0; i < 20; i++) {
      this.particles.spawn({
        x: impactX + randomRange(-25, 25),
        y: impactY,
        vx: randomRange(-100, 100),
        vy: randomRange(-400, -180),
        color: '#FFD700',
        size: randomRange(2, 5),
        lifetime: randomRange(0.5, 1.0),
        gravity: 250,
        drag: 0.98,
        fadeOut: true,
        shrink: true,
      });
    }

    // 3. Blue flame ring expanding outward
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      this.particles.spawn({
        x: impactX + Math.cos(angle) * 30,
        y: impactY + Math.sin(angle) * 15,
        vx: Math.cos(angle) * 220,
        vy: Math.sin(angle) * 110,
        color: i % 2 === 0 ? '#37B1E2' : '#FFFFFF',
        size: randomRange(6, 12),
        lifetime: randomRange(0.3, 0.6),
        drag: 0.92,
        fadeOut: true,
        shrink: true,
      });
    }

    // 4. Dust cloud at the base
    for (let i = 0; i < 12; i++) {
      this.particles.spawn({
        x: impactX + randomRange(-40, 40),
        y: impactY + randomRange(-5, 10),
        vx: randomRange(-60, 60),
        vy: randomRange(-30, -5),
        color: ['#5a5a7a', '#8a8aaa', '#4a4a66'][Math.floor(Math.random() * 3)],
        size: randomRange(8, 18),
        lifetime: randomRange(0.4, 0.8),
        drag: 0.95,
        fadeOut: true,
        shrink: false,
      });
    }

    // SCREEN SHAKE — make it EPIC
    this.shakeAmount = SHAKE_INTENSITY;

    // Charizard roars on impact
    this.charizard.setPose('roar');

    this.flyingBlock = null;
  }

  private updateSlamImpact(_dt: number): void {
    if (this.phaseTimer >= SLAM_IMPACT_PAUSE) {
      this.promptIndex++;

      // Check if tower is complete
      if (this.towerBlocks.length >= this.totalBlocks) {
        this.startPerch();
      } else {
        // Next prompt
        this.promptsRemaining--;
        if (this.promptsRemaining <= 0) {
          // Out of prompts but tower not complete — finish anyway
          this.startPerch();
        } else {
          // Advance turn
          session.currentTurn = session.nextTurn();
          this.difficulty = session.currentTurn === 'kian' ? 'big' : 'little';
          this.bannerName = session.currentTurn === 'kian'
            ? settings.bigTrainerName
            : settings.littleTrainerName;
          this.startBanner();
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Phase: Perch (tower complete — Charizard perches on top!)
  // ---------------------------------------------------------------------------

  private startPerch(): void {
    this.phase = 'perch';
    this.phaseTimer = 0;
    this.perchTimer = 0;

    // Calculate the perch target Y (top of the completed tower)
    const towerTopY = this.getTowerTopY() - BLOCK_SIZE * 0.3;
    this.perchCharY = CHAR_Y;

    // Charizard flies up to the tower top
    this.tweens.add({
      from: CHAR_Y,
      to: towerTopY - 60,
      duration: 1.0,
      easing: easing.easeInOut,
      onUpdate: (v) => { this.perchCharY = v; },
      onComplete: () => {
        this.charizard.setPose('perch');

        // EPIC celebration burst when perched
        for (let i = 0; i < 50; i++) {
          const x = randomRange(DESIGN_WIDTH * 0.2, DESIGN_WIDTH * 0.8);
          const y = randomRange(DESIGN_HEIGHT * 0.05, DESIGN_HEIGHT * 0.4);
          const colors = [
            theme.palette.celebration.gold,
            theme.palette.celebration.hotOrange,
            theme.palette.celebration.cyan,
          ];
          this.particles.burst(
            x, y, 3,
            colors[Math.floor(Math.random() * colors.length)],
            140, 0.9,
          );
        }

        this.shakeAmount = 8;
      },
    });

    this.charizard.setPose('fly');
  }

  private updatePerch(dt: number): void {
    this.perchTimer += dt;

    // Ongoing celebration sparks while perched
    if (Math.random() < 0.35) {
      const colors = [
        theme.palette.celebration.gold,
        theme.palette.celebration.hotOrange,
        theme.palette.celebration.cyan,
      ];
      this.particles.burst(
        randomRange(DESIGN_WIDTH * 0.15, DESIGN_WIDTH * 0.85),
        randomRange(DESIGN_HEIGHT * 0.05, DESIGN_HEIGHT * 0.35),
        2,
        colors[Math.floor(Math.random() * colors.length)],
        80, 0.6,
      );
    }

    if (this.perchTimer >= PERCH_DURATION) {
      this.endRound();
    }
  }

  // ---------------------------------------------------------------------------
  // Size Mode
  // ---------------------------------------------------------------------------

  private startSizePrompt(): void {
    this.phase = 'forging';
    this.phaseTimer = 0;
    this.inputLocked = true;
    this.missCount = 0;
    this.awaitTimer = 0;

    const diff = this.getDifficulty();
    const isSmallQuestion = Math.random() < 0.5;

    if (diff.sizeComparison === 'big-small') {
      // Owen: 2 choices — big vs small
      this.sizePrompt = isSmallQuestion ? 'Which is SMALLER?' : 'Which is BIGGER?';
      this.sizeCorrectLabel = isSmallQuestion ? 'small' : 'big';

      const bigSize = randomRange(130, 160);
      const smallSize = randomRange(50, 75);

      // Random shape for both (same shape, different sizes)
      const available = this.getAvailableShapes();
      const pick = available[Math.floor(Math.random() * available.length)];

      this.sizeChoices = [
        {
          label: 'big',
          displaySize: bigSize,
          x: DESIGN_WIDTH * 0.35,
          y: SIZE_FIELD_Y,
          hitSize: bigSize + 30,
          bobOffset: Math.random() * Math.PI * 2,
          alive: true,
          isCorrect: this.sizeCorrectLabel === 'big',
          color: SHAPE_FILL,
        },
        {
          label: 'small',
          displaySize: smallSize,
          x: DESIGN_WIDTH * 0.65,
          y: SIZE_FIELD_Y,
          hitSize: Math.max(smallSize + 30, 100),
          bobOffset: Math.random() * Math.PI * 2,
          alive: true,
          isCorrect: this.sizeCorrectLabel === 'small',
          color: SHAPE_FILL_LIGHT,
        },
      ];

      // Assign same shape
      for (const c of this.sizeChoices) {
        (c as any).shapeName = pick.name;
      }

      // Shuffle positions
      if (Math.random() < 0.5) {
        const tempX = this.sizeChoices[0].x;
        this.sizeChoices[0].x = this.sizeChoices[1].x;
        this.sizeChoices[1].x = tempX;
      }

    } else {
      // Kian: 3 choices — small / medium / big
      const sizes = [
        { label: 'small', displaySize: 55 },
        { label: 'medium', displaySize: 100 },
        { label: 'big', displaySize: 150 },
      ];

      this.sizePrompt = isSmallQuestion ? 'Which is SMALLEST?' : 'Which is BIGGEST?';
      this.sizeCorrectLabel = isSmallQuestion ? 'small' : 'big';

      const available = this.getAvailableShapes();
      const pick = available[Math.floor(Math.random() * available.length)];

      const positions = [DESIGN_WIDTH * 0.25, DESIGN_WIDTH * 0.50, DESIGN_WIDTH * 0.75];

      // Shuffle positions
      const shuffledPositions = [...positions].sort(() => Math.random() - 0.5);

      this.sizeChoices = sizes.map((s, i) => ({
        label: s.label,
        displaySize: s.displaySize,
        x: shuffledPositions[i],
        y: SIZE_FIELD_Y,
        hitSize: Math.max(s.displaySize + 30, 100),
        bobOffset: Math.random() * Math.PI * 2,
        alive: true,
        isCorrect: s.label === this.sizeCorrectLabel,
        color: SHAPE_FILL,
        shapeName: pick.name,
      } as SizeChoice & { shapeName: string }));
    }

    // Brief forge animation then unlock input
    this.charizard.setPose('roar');
    setTimeout(() => {
      this.charizard.setPose('fly');
      this.phase = 'awaiting-choice';
      this.phaseTimer = 0;
      this.inputLocked = false;
    }, 600);
  }

  // ---------------------------------------------------------------------------
  // Size Click Handler
  // ---------------------------------------------------------------------------

  private handleSizeClick(x: number, y: number): void {
    for (const c of this.sizeChoices) {
      if (!c.alive) continue;
      const halfHit = c.hitSize / 2;
      if (
        x >= c.x - halfHit && x <= c.x + halfHit &&
        y >= c.y - halfHit && y <= c.y + halfHit
      ) {
        if (c.isCorrect) {
          this.handleCorrectSize(c);
        } else {
          this.handleWrongSize(c);
        }
        return;
      }
    }
  }

  private handleCorrectSize(choice: SizeChoice): void {
    this.inputLocked = true;

    // Pop out wrong choices
    for (const c of this.sizeChoices) {
      if (c !== choice) c.alive = false;
    }

    // Celebration
    this.particles.burst(choice.x, choice.y, 40, SHAPE_FILL, 200, 1.0);
    this.particles.burst(choice.x, choice.y, 20, '#FFFFFF', 120, 0.6);
    this.particles.burst(choice.x, choice.y, 15, '#FFD700', 160, 0.8);
    this.shakeAmount = 10;

    this.charizard.setPose('roar');

    this.phase = 'celebrating';
    this.phaseTimer = 0;
    this.celebrationTimer = 0;
  }

  private handleWrongSize(choice: SizeChoice): void {
    this.missCount++;
    this.awaitTimer = 0;

    this.particles.burst(choice.x, choice.y, 8, theme.palette.ui.incorrect, 60, 0.4);
    this.shakeAmount = 4;

    if (this.missCount >= 3) {
      this.autoComplete();
    }
  }

  // ---------------------------------------------------------------------------
  // Phase: Celebrating
  // ---------------------------------------------------------------------------

  private updateCelebrating(dt: number): void {
    this.celebrationTimer += dt;

    // Ongoing sparks
    if (Math.random() < 0.3) {
      const colors = [
        theme.palette.celebration.gold,
        theme.palette.celebration.hotOrange,
        theme.palette.celebration.cyan,
      ];
      this.particles.burst(
        randomRange(DESIGN_WIDTH * 0.1, DESIGN_WIDTH * 0.9),
        randomRange(DESIGN_HEIGHT * 0.1, DESIGN_HEIGHT * 0.5),
        2,
        colors[Math.floor(Math.random() * colors.length)],
        80, 0.6,
      );
    }

    if (this.celebrationTimer >= CELEBRATION_DURATION) {
      this.promptsRemaining--;
      if (this.promptsRemaining <= 0) {
        this.endRound();
      } else {
        // Advance turn, start next prompt
        session.currentTurn = session.nextTurn();
        this.difficulty = session.currentTurn === 'kian' ? 'big' : 'little';
        this.bannerName = session.currentTurn === 'kian'
          ? settings.bigTrainerName
          : settings.littleTrainerName;
        this.startBanner();
      }
    }
  }

  private renderCelebrationText(ctx: CanvasRenderingContext2D): void {
    const t = Math.min(this.celebrationTimer / 0.3, 1);
    const scale = 0.5 + 0.5 * easing.easeOutBack(t);
    const alpha = t < 0.7 ? 1 : 1 - (this.celebrationTimer - CELEBRATION_DURATION * 0.7) / (CELEBRATION_DURATION * 0.3);

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textX = DESIGN_WIDTH / 2;
    const textY = DESIGN_HEIGHT * 0.35;

    // Glow
    ctx.save();
    ctx.shadowColor = theme.palette.celebration.gold;
    ctx.shadowBlur = 40;
    ctx.font = `bold ${Math.round(96 * scale)}px system-ui`;
    ctx.fillStyle = theme.palette.celebration.gold;
    ctx.fillText('GREAT!', textX, textY);
    ctx.restore();

    ctx.font = `bold ${Math.round(96 * scale)}px system-ui`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('GREAT!', textX, textY);

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // End Round
  // ---------------------------------------------------------------------------

  private endRound(): void {
    this.phase = 'complete';
    this.phaseTimer = 0;
    this.charizard.setPose('perch');

    session.activitiesCompleted++;
    settings.roundsCompleted++;
    session.currentScreen = 'calm-reset';

    setTimeout(() => {
      this.gameContext.screenManager.goTo('calm-reset');
    }, 500);
  }

  // ---------------------------------------------------------------------------
  // Rendering: Shape Mode
  // ---------------------------------------------------------------------------

  private renderShapeMode(ctx: CanvasRenderingContext2D): void {
    // Warm glow behind Charizard
    this.renderCharizardGlow(ctx);

    // Draw the stone pedestal
    this.renderPedestal(ctx);

    // Draw stacked tower blocks
    this.renderTowerBlocks(ctx);

    // Draw target shape outline on the tower (where next block goes)
    if (
      (this.phase === 'forging' || this.phase === 'awaiting-choice') &&
      this.currentTargetShape
    ) {
      this.renderTargetOutline(ctx);
    }

    // Charizard — either at normal position or flying to perch
    if (this.phase === 'perch') {
      this.charizard.render(ctx, PEDESTAL_X, this.perchCharY, CHAR_SCALE);
    } else {
      this.charizard.render(ctx, CHAR_X, CHAR_Y, CHAR_SCALE);
    }

    // Flying block
    if (this.flyingBlock && this.flyingBlock.active) {
      this.renderFlyingBlock(ctx);
    }

    // Choice blocks at the top
    this.renderChoiceBlocks(ctx);

    // Prompt text — shape name
    if (this.phase === 'awaiting-choice' && this.currentTargetShape) {
      this.renderShapePromptText(ctx);
    }
  }

  private renderCharizardGlow(ctx: CanvasRenderingContext2D): void {
    const atmoGlow = ctx.createRadialGradient(
      CHAR_X + 60, CHAR_Y - 40, 30,
      CHAR_X + 60, CHAR_Y - 40, 350,
    );
    atmoGlow.addColorStop(0, 'rgba(55, 177, 226, 0.15)');
    atmoGlow.addColorStop(0.5, 'rgba(55, 177, 226, 0.05)');
    atmoGlow.addColorStop(1, 'rgba(55, 177, 226, 0)');
    ctx.fillStyle = atmoGlow;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  }

  private renderPedestal(ctx: CanvasRenderingContext2D): void {
    const px = PEDESTAL_X - PEDESTAL_WIDTH / 2;
    const py = PEDESTAL_Y;

    // Shadow under pedestal
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(PEDESTAL_X, py + PEDESTAL_HEIGHT + 5, PEDESTAL_WIDTH * 0.6, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Main pedestal body — stone gradient
    const stoneGrad = ctx.createLinearGradient(px, py, px + PEDESTAL_WIDTH, py);
    stoneGrad.addColorStop(0, '#3a3a5a');
    stoneGrad.addColorStop(0.3, '#5a5a7a');
    stoneGrad.addColorStop(0.7, '#5a5a7a');
    stoneGrad.addColorStop(1, '#3a3a5a');
    ctx.fillStyle = stoneGrad;
    roundRect(ctx, px, py, PEDESTAL_WIDTH, PEDESTAL_HEIGHT, 6);
    ctx.fill();

    // Pedestal top cap — slightly wider, lighter
    ctx.fillStyle = '#6a6a8a';
    roundRect(ctx, px - 8, py - 4, PEDESTAL_WIDTH + 16, 12, 4);
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 3;
    roundRect(ctx, px, py, PEDESTAL_WIDTH, PEDESTAL_HEIGHT, 6);
    ctx.stroke();

    // Ground beneath pedestal
    const groundGrad = ctx.createLinearGradient(0, PEDESTAL_Y + PEDESTAL_HEIGHT - 5, 0, DESIGN_HEIGHT);
    groundGrad.addColorStop(0, '#2a2a44');
    groundGrad.addColorStop(0.3, '#1e1e36');
    groundGrad.addColorStop(1, '#14142a');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, PEDESTAL_Y + PEDESTAL_HEIGHT - 5, DESIGN_WIDTH, DESIGN_HEIGHT - PEDESTAL_Y);
  }

  private renderTowerBlocks(ctx: CanvasRenderingContext2D): void {
    for (const block of this.towerBlocks) {
      ctx.save();

      // Subtle sway
      const sway = Math.sin(this.time * 1.5 + block.swayOffset) * 2;
      ctx.translate(block.x + sway, block.y);
      ctx.scale(block.scale, block.scale);

      // Block background card (rounded rect)
      const halfBlock = BLOCK_SIZE / 2;
      ctx.fillStyle = '#1a2a4e';
      roundRect(ctx, -halfBlock, -halfBlock, BLOCK_SIZE, BLOCK_SIZE, 12);
      ctx.fill();
      ctx.strokeStyle = '#37B1E2';
      ctx.lineWidth = 3;
      roundRect(ctx, -halfBlock, -halfBlock, BLOCK_SIZE, BLOCK_SIZE, 12);
      ctx.stroke();

      // Shape inside the block
      drawShape(ctx, block.shape, 0, 0, BLOCK_SIZE * 0.65, SHAPE_FILL, SHAPE_OUTLINE, 4);

      // Impact flash overlay
      if (block.impactFlash > 0) {
        ctx.save();
        ctx.globalAlpha = block.impactFlash * 0.6;
        ctx.fillStyle = '#FFFFFF';
        roundRect(ctx, -halfBlock, -halfBlock, BLOCK_SIZE, BLOCK_SIZE, 12);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }
  }

  private renderTargetOutline(ctx: CanvasRenderingContext2D): void {
    const towerTopY = this.getTowerTopY();
    const glowAlpha = 0.4 + 0.3 * Math.sin(this.targetGlowPhase * 4);

    ctx.save();
    ctx.globalAlpha = glowAlpha;

    // Glowing dashed outline of target shape at the next tower position
    drawShapeOutline(
      ctx,
      this.currentTargetShape,
      PEDESTAL_X,
      towerTopY - BLOCK_SIZE / 2,
      BLOCK_SIZE * 0.65,
      '#91CCEC',
      4,
      [8, 6],
    );

    // Soft glow around the outline
    ctx.save();
    ctx.shadowColor = '#37B1E2';
    ctx.shadowBlur = 25;
    drawShapeOutline(
      ctx,
      this.currentTargetShape,
      PEDESTAL_X,
      towerTopY - BLOCK_SIZE / 2,
      BLOCK_SIZE * 0.65,
      'rgba(55, 177, 226, 0.5)',
      3,
      [8, 6],
    );
    ctx.restore();

    ctx.restore();
  }

  private renderFlyingBlock(ctx: CanvasRenderingContext2D): void {
    if (!this.flyingBlock) return;

    ctx.save();
    ctx.translate(this.flyingBlock.x, this.flyingBlock.y);

    // Glow behind the flying block
    ctx.save();
    ctx.shadowColor = '#37B1E2';
    ctx.shadowBlur = 30;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#37B1E2';
    ctx.beginPath();
    ctx.arc(0, 0, BLOCK_SIZE * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // The shape itself
    drawShape(ctx, this.flyingBlock.shape, 0, 0, BLOCK_SIZE * 0.65, SHAPE_FILL, SHAPE_OUTLINE, 4);

    ctx.restore();
  }

  private renderChoiceBlocks(ctx: CanvasRenderingContext2D): void {
    for (const c of this.choiceBlocks) {
      if (!c.alive) continue;
      if (c.size <= 0) continue;

      const bob = Math.sin(this.time * 2 + c.bobOffset) * 6;
      const hintBounce = c.hintLevel >= 1 && c.isCorrect
        ? Math.abs(Math.sin(this.time * 5 + c.bobOffset)) * 12
        : 0;

      ctx.save();
      ctx.translate(c.x, c.y + bob - hintBounce);

      const s = c.size / CHOICE_SIZE; // normalized scale
      ctx.scale(s, s);

      // Choice card background
      const halfChoice = CHOICE_SIZE / 2;
      const cardColor = c.isCorrect && c.hintLevel >= 2 ? '#1a3a6e' : '#1a2244';

      ctx.fillStyle = cardColor;
      roundRect(ctx, -halfChoice, -halfChoice, CHOICE_SIZE, CHOICE_SIZE, 16);
      ctx.fill();

      // Card border
      const borderColor = c.isCorrect && c.hintLevel >= 2 ? '#91CCEC' : '#3a4a6e';
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 4;
      roundRect(ctx, -halfChoice, -halfChoice, CHOICE_SIZE, CHOICE_SIZE, 16);
      ctx.stroke();

      // Hint glow (level 2)
      if (c.isCorrect && c.hintLevel >= 2) {
        ctx.save();
        ctx.shadowColor = '#37B1E2';
        ctx.shadowBlur = 30;
        ctx.strokeStyle = '#37B1E2';
        ctx.lineWidth = 3;
        roundRect(ctx, -halfChoice, -halfChoice, CHOICE_SIZE, CHOICE_SIZE, 16);
        ctx.stroke();
        ctx.restore();
      }

      // Shape inside the card
      drawShape(ctx, c.shape, 0, 0, CHOICE_SIZE * 0.55, SHAPE_FILL, SHAPE_OUTLINE, 4);

      // Shape name label below
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.shape.toUpperCase(), 0, halfChoice - 18);

      ctx.restore();
    }
  }

  private renderShapePromptText(ctx: CanvasRenderingContext2D): void {
    const x = DESIGN_WIDTH / 2;
    const y = 60;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${FONT.subtitle}px system-ui`;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillText(`Find the ${this.currentTargetShape}!`, x + 2, y + 2);

    // Glow
    ctx.save();
    ctx.shadowColor = '#37B1E2';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`Find the ${this.currentTargetShape}!`, x, y);
    ctx.restore();

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Rendering: Size Mode
  // ---------------------------------------------------------------------------

  private renderSizeMode(ctx: CanvasRenderingContext2D): void {
    // Open field background glow
    this.renderCharizardGlow(ctx);

    // Open grassy field at the bottom
    this.renderOpenField(ctx);

    // Charizard
    this.charizard.render(ctx, CHAR_X, CHAR_Y, CHAR_SCALE);

    // Prompt text
    if (this.sizePrompt && this.phase !== 'banner') {
      this.renderSizePromptText(ctx);
    }

    // Size comparison choices
    this.renderSizeChoices(ctx);
  }

  private renderOpenField(ctx: CanvasRenderingContext2D): void {
    const groundY = DESIGN_HEIGHT * 0.72;

    // Ground gradient — open field feel
    const groundGrad = ctx.createLinearGradient(0, groundY - 20, 0, DESIGN_HEIGHT);
    groundGrad.addColorStop(0, '#1a2a3a');
    groundGrad.addColorStop(0.3, '#152030');
    groundGrad.addColorStop(1, '#0e1520');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY - 20, DESIGN_WIDTH, DESIGN_HEIGHT - groundY + 20);

    // Horizon line with subtle glow
    const horizonGlow = ctx.createLinearGradient(0, groundY - 30, 0, groundY + 10);
    horizonGlow.addColorStop(0, 'rgba(55, 177, 226, 0.08)');
    horizonGlow.addColorStop(1, 'rgba(55, 177, 226, 0)');
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, groundY - 30, DESIGN_WIDTH, 40);
  }

  private renderSizePromptText(ctx: CanvasRenderingContext2D): void {
    const x = DESIGN_WIDTH / 2;
    const y = 80;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${FONT.subtitle + 8}px system-ui`;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillText(this.sizePrompt, x + 2, y + 2);

    // Glow text
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(this.sizePrompt, x, y);
    ctx.restore();

    ctx.restore();
  }

  private renderSizeChoices(ctx: CanvasRenderingContext2D): void {
    for (const c of this.sizeChoices) {
      if (!c.alive) continue;

      const bob = Math.sin(this.time * 2 + c.bobOffset) * 5;

      ctx.save();
      ctx.translate(c.x, c.y + bob);

      // Draw the shape at its comparative size
      const shapeName = (c as any).shapeName || 'circle';
      drawShape(ctx, shapeName, 0, 0, c.displaySize, SHAPE_FILL, SHAPE_OUTLINE, 4);

      // Size label underneath
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = 'bold 28px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.label.toUpperCase(), 0, c.displaySize / 2 + 30);

      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Tower Utility
  // ---------------------------------------------------------------------------

  /** Get the Y position for the top of the next tower block */
  private getTowerTopY(): number {
    if (this.towerBlocks.length === 0) {
      return PEDESTAL_Y - BLOCK_SPACING;
    }
    // Stack upward from the last block
    const topBlock = this.towerBlocks[this.towerBlocks.length - 1];
    return topBlock.y - BLOCK_SIZE / 2 - BLOCK_SPACING;
  }
}
