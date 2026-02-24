// src/engine/games/evolution-challenge.ts
// Mini-game 5: Evolution Challenge — Evolution Chain Recognition & Ordering
//
// Two alternating game modes:
//   Recognition: "Who does Charmander become?" — pick the next evolution
//   Order:       "Put them in order!" — tap sprite cards in evolution order
//
// Owen (2.5yo): 2 choices/stages, simple chain (Charmander, Charmeleon)
// Kian (4yo):   3-4 choices/stages, full chain up to Mega Charizard X
//
// Systems: SpriteAnimator, VoiceSystem, HintLadder, tracker, FlameMeter

import type { GameScreen, GameContext } from '../screen-manager';
import { Background } from '../entities/backgrounds';
import { ParticlePool, setActivePool } from '../entities/particles';
import { SpriteAnimator } from '../entities/sprite-animator';
import { SPRITES } from '../../config/sprites';
import { VoiceSystem } from '../voice';
import { HintLadder } from '../systems/hint-ladder';
import { FlameMeter } from '../entities/flame-meter';
import { tracker } from '../../state/tracker.svelte';
import {
  DESIGN_WIDTH,
  DESIGN_HEIGHT,
  PROMPTS_PER_ROUND,
} from '../../config/constants';
import { session } from '../../state/session.svelte';
import { settings } from '../../state/settings.svelte';
import { randomRange } from '../utils/math';
import { theme } from '../../config/theme';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROMPTS_TOTAL = PROMPTS_PER_ROUND.evolutionChallenge; // 5
const BANNER_DURATION = 1.5;
const ENGAGE_DURATION = 1.0;
const SHOW_POKEMON_DURATION = 2.0;
const CELEBRATE_DURATION = 1.5;

/** MCX sprite position (top-right corner) */
const SPRITE_X = DESIGN_WIDTH - 260;
const SPRITE_Y = 180;
const SPRITE_SCALE = 3;

/** Card dimensions */
const CARD_W = 220;
const CARD_H = 260;
const CARD_RADIUS = 16;

/** Blue fire palette */
const FIRE_COLORS = ['#FFFFFF', '#91CCEC', '#37B1E2', '#5ED4FC'];

/** Success echo celebrations */
const SUCCESS_ECHOES = ['evolution!', 'power!', 'evolved!'];

// ---------------------------------------------------------------------------
// Evolution Chain Data
// ---------------------------------------------------------------------------

interface EvolutionEntry {
  name: string;
  spriteKey: string;
  scale: number;
}

const EVOLUTION_CHAIN: EvolutionEntry[] = [
  { name: 'Charmander', spriteKey: 'charmander', scale: 2.5 },
  { name: 'Charmeleon', spriteKey: 'charmeleon', scale: 2.5 },
  { name: 'Charizard', spriteKey: 'charizard', scale: 2 },
  { name: 'Mega Charizard X', spriteKey: 'charizard-megax', scale: 2 },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SpriteCard {
  entry: EvolutionEntry;
  x: number;
  y: number;
  animator: SpriteAnimator;
  alive: boolean;
  dimmed: boolean;
  bobPhase: number;
  isCorrect: boolean;         // recognition mode: is this the right answer?
  orderIndex: number;         // order mode: expected tap position (0-based), -1 for recognition
  locked: boolean;            // order mode: card has been correctly tapped
  shakeTimer: number;         // > 0 while shaking from wrong answer
  lockBadge: number;          // order mode: displayed badge number (1-based), 0 if not locked
}

type PromptMode = 'recognition' | 'order';

type GamePhase =
  | 'banner'
  | 'engage'
  | 'show-pokemon'
  | 'choice'
  | 'celebrate'
  | 'next';

// ---------------------------------------------------------------------------
// EvolutionChallengeGame
// ---------------------------------------------------------------------------

export class EvolutionChallengeGame implements GameScreen {
  // Systems
  private bg = new Background(60);
  private particles = new ParticlePool();
  private mcxSprite = new SpriteAnimator(SPRITES['charizard-megax']);
  private hintLadder = new HintLadder();
  private flameMeter = new FlameMeter();
  private voice!: VoiceSystem;
  private gameContext!: GameContext;

  // Game state
  private phase: GamePhase = 'banner';
  private phaseTimer = 0;
  private totalTime = 0;
  private promptIndex = 0;
  private inputLocked = true;

  // Per-prompt state
  private promptMode: PromptMode = 'recognition';
  private cards: SpriteCard[] = [];
  private centerSprite: SpriteAnimator | null = null;
  private centerEntry: EvolutionEntry | null = null;
  private correctEntry: EvolutionEntry | null = null;

  // Order mode state
  private orderTapIndex = 0;   // next expected tap position
  private orderSequence: EvolutionEntry[] = []; // correct order

  // Recognition mode label
  private questionText = '';

  // Audio shortcut
  private get audio() { return this.gameContext.audio; }

  // Difficulty helpers
  private get isOwen(): boolean { return session.currentTurn === 'owen'; }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  enter(ctx: GameContext): void {
    this.gameContext = ctx;
    setActivePool(this.particles);
    this.particles.clear();
    this.promptIndex = 0;
    this.inputLocked = true;
    this.totalTime = 0;

    if (this.audio) {
      this.voice = new VoiceSystem(this.audio);
    }

    this.startBanner();
  }

  exit(): void {
    this.particles.clear();
    this.gameContext.events.emit({ type: 'hide-banner' });
  }

  // -----------------------------------------------------------------------
  // Phase transitions
  // -----------------------------------------------------------------------

  private startBanner(): void {
    if (this.promptIndex >= PROMPTS_TOTAL) {
      this.endRound();
      return;
    }

    // Alternate turns
    const turn = session.nextTurn();
    session.currentTurn = turn;

    this.phase = 'banner';
    this.phaseTimer = 0;
    this.inputLocked = true;
    this.cards = [];
    this.centerSprite = null;
    this.centerEntry = null;
    this.correctEntry = null;
    this.orderTapIndex = 0;
    this.orderSequence = [];

    this.gameContext.events.emit({ type: 'show-banner', turn });

    if (this.promptIndex === 0) {
      this.voice?.narrate('Evolution challenge!');
    }
  }

  private startEngage(): void {
    this.phase = 'engage';
    this.phaseTimer = 0;

    this.gameContext.events.emit({ type: 'hide-banner' });

    const name = this.isOwen ? settings.littleTrainerName : settings.bigTrainerName;
    const action = this.isOwen ? 'point' : 'choose';
    this.voice?.engage(name, action);
  }

  private startShowPokemon(): void {
    this.phase = 'show-pokemon';
    this.phaseTimer = 0;

    // Alternate modes: even = recognition, odd = order
    this.promptMode = this.promptIndex % 2 === 0 ? 'recognition' : 'order';

    if (this.promptMode === 'recognition') {
      this.setupRecognition();
    } else {
      this.setupOrder();
    }

    this.audio?.playSynth('pop');
  }

  private startChoice(): void {
    this.phase = 'choice';
    this.phaseTimer = 0;
    this.inputLocked = false;

    if (this.promptMode === 'recognition') {
      // Initialize hint ladder with the correct answer name
      this.hintLadder.startPrompt(this.correctEntry?.name ?? '');
    } else {
      // For order mode, hint ladder tracks the overall concept
      this.hintLadder.startPrompt('evolution order');
    }
  }

  private startCelebrate(): void {
    this.phase = 'celebrate';
    this.phaseTimer = 0;
    this.inputLocked = true;

    this.gameContext.events.emit({ type: 'celebration', intensity: 'normal' });

    // Big particle burst
    for (let i = 0; i < 20; i++) {
      const bx = randomRange(300, DESIGN_WIDTH - 300);
      const by = randomRange(200, DESIGN_HEIGHT - 200);
      this.particles.burst(bx, by, 3,
        FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)], 80, 0.7);
    }
  }

  private startNext(): void {
    this.phase = 'next';
    this.promptIndex++;

    if (this.promptIndex >= PROMPTS_TOTAL) {
      this.endRound();
    } else {
      this.startBanner();
    }
  }

  private endRound(): void {
    session.activitiesCompleted++;
    session.currentScreen = 'calm-reset';
    setTimeout(() => {
      this.gameContext.screenManager.goTo('calm-reset');
    }, 500);
  }

  // -----------------------------------------------------------------------
  // Recognition Mode Setup
  // -----------------------------------------------------------------------

  private setupRecognition(): void {
    // Owen: pick from first 2 (Charmander, Charmeleon) since they know those
    // Kian: pick from first 3 (Charmander, Charmeleon, Charizard)
    const maxIndex = this.isOwen ? 2 : 3; // exclusive upper bound (not the last one, since it has no "next")
    const stageIndex = Math.floor(Math.random() * maxIndex);
    const shownEntry = EVOLUTION_CHAIN[stageIndex];
    const correctAnswer = EVOLUTION_CHAIN[stageIndex + 1];

    this.centerEntry = shownEntry;
    this.correctEntry = correctAnswer;

    // Create center sprite animator
    this.centerSprite = new SpriteAnimator(SPRITES[shownEntry.spriteKey]);

    // Build question text
    this.questionText = `Who does ${shownEntry.name} become?`;

    // Voice prompt
    this.voice?.prompt(shownEntry.name, this.questionText);

    // Build choice cards
    const choiceCount = this.isOwen ? 2 : 3;
    const cardEntries: EvolutionEntry[] = [correctAnswer];

    // Add wrong choices (not the shown pokemon, not the correct answer)
    const wrongPool = EVOLUTION_CHAIN.filter(
      e => e.spriteKey !== shownEntry.spriteKey && e.spriteKey !== correctAnswer.spriteKey,
    );
    const shuffledWrong = [...wrongPool].sort(() => Math.random() - 0.5);
    for (let i = 0; i < choiceCount - 1 && i < shuffledWrong.length; i++) {
      cardEntries.push(shuffledWrong[i]);
    }

    // Shuffle so correct isn't always first
    cardEntries.sort(() => Math.random() - 0.5);

    // Create sprite cards
    this.cards = cardEntries.map((entry) => this.makeCard(
      entry,
      entry.spriteKey === correctAnswer.spriteKey,
      -1, // not order mode
    ));

    this.positionCards();
  }

  // -----------------------------------------------------------------------
  // Order Mode Setup
  // -----------------------------------------------------------------------

  private setupOrder(): void {
    // Owen: 2 consecutive stages, scrambled
    // Kian: 3-4 stages, scrambled
    const stageCount = this.isOwen ? 2 : (Math.random() < 0.5 ? 3 : 4);

    // Pick consecutive stages starting from index 0
    // For Owen (2 stages): always start from 0 -> [Charmander, Charmeleon]
    // For Kian (3 stages): [Charmander, Charmeleon, Charizard]
    // For Kian (4 stages): full chain
    const startIndex = 0;
    this.orderSequence = EVOLUTION_CHAIN.slice(startIndex, startIndex + stageCount);

    this.questionText = 'Put them in order!';
    this.centerEntry = null;
    this.centerSprite = null;
    this.correctEntry = null;
    this.orderTapIndex = 0;

    // Voice prompt
    this.voice?.prompt('Evolution', this.questionText);

    // Create cards in correct order, then scramble
    const orderedCards = this.orderSequence.map((entry, i) =>
      this.makeCard(entry, false, i),
    );

    // Scramble card positions (but keep orderIndex intact)
    this.cards = [...orderedCards].sort(() => Math.random() - 0.5);

    this.positionCards();
  }

  // -----------------------------------------------------------------------
  // Card Creation & Positioning
  // -----------------------------------------------------------------------

  private makeCard(
    entry: EvolutionEntry,
    isCorrect: boolean,
    orderIndex: number,
  ): SpriteCard {
    return {
      entry,
      x: 0,
      y: 0,
      animator: new SpriteAnimator(SPRITES[entry.spriteKey]),
      alive: true,
      dimmed: false,
      bobPhase: randomRange(0, Math.PI * 2),
      isCorrect,
      orderIndex,
      locked: false,
      shakeTimer: 0,
      lockBadge: 0,
    };
  }

  private positionCards(): void {
    const count = this.cards.length;
    const spacing = 280;
    const totalWidth = (count - 1) * spacing;
    const startX = (DESIGN_WIDTH - totalWidth) / 2;
    const centerY = DESIGN_HEIGHT * 0.65;

    for (let i = 0; i < count; i++) {
      this.cards[i].x = startX + i * spacing;
      this.cards[i].y = centerY;
    }
  }

  // -----------------------------------------------------------------------
  // Hit Detection
  // -----------------------------------------------------------------------

  private isCardHit(card: SpriteCard, x: number, y: number): boolean {
    const halfW = CARD_W / 2 + 20; // generous hit area
    const halfH = CARD_H / 2 + 20;
    return (
      x >= card.x - halfW &&
      x <= card.x + halfW &&
      y >= card.y - halfH &&
      y <= card.y + halfH
    );
  }

  // -----------------------------------------------------------------------
  // Recognition Mode — Correct / Wrong
  // -----------------------------------------------------------------------

  private handleRecognitionCorrect(card: SpriteCard): void {
    this.inputLocked = true;
    card.alive = false;

    const concept = card.entry.name;
    tracker.recordAnswer(concept, 'evolution', true);

    const hinted = this.hintLadder.hintLevel > 0;
    this.flameMeter.addCharge(hinted ? 1 : 2);

    this.audio?.playSynth('correct-chime');

    const echo = SUCCESS_ECHOES[Math.floor(Math.random() * SUCCESS_ECHOES.length)];
    this.voice?.successEcho(concept, `${concept} ${echo}`);

    this.particles.burst(card.x, card.y, 40, '#37B1E2', 200, 1.0);
    this.particles.burst(card.x, card.y, 15, '#ffffff', 120, 0.5);

    this.startCelebrate();
  }

  private handleRecognitionWrong(card: SpriteCard): void {
    const correctName = this.correctEntry?.name ?? '';

    tracker.recordAnswer(correctName, 'evolution', false);

    card.dimmed = true;
    card.shakeTimer = 0.4;

    this.audio?.playSynth('wrong-bonk');
    this.voice?.wrongRedirect(card.entry.name, correctName);

    this.hintLadder.onMiss();

    if (this.hintLadder.autoCompleted) {
      this.autoCompleteRecognition();
    }
  }

  private autoCompleteRecognition(): void {
    const correctCard = this.cards.find(c => c.isCorrect && c.alive);
    if (!correctCard) return;

    tracker.recordAnswer(this.correctEntry?.name ?? '', 'evolution', true);
    this.flameMeter.addCharge(0.5);

    correctCard.alive = false;

    this.audio?.playSynth('pop');
    this.voice?.successEcho(this.correctEntry?.name ?? '');
    this.particles.burst(correctCard.x, correctCard.y, 20, '#37B1E2', 120, 0.8);

    this.startCelebrate();
  }

  // -----------------------------------------------------------------------
  // Order Mode — Tap Handling
  // -----------------------------------------------------------------------

  private handleOrderTap(card: SpriteCard): void {
    if (card.locked) return;

    if (card.orderIndex === this.orderTapIndex) {
      // Correct tap!
      card.locked = true;
      card.lockBadge = this.orderTapIndex + 1;
      this.orderTapIndex++;

      this.audio?.playSynth('correct-chime');
      tracker.recordAnswer(card.entry.name, 'evolution', true);
      this.flameMeter.addCharge(1);

      // Particle burst on locked card
      this.particles.burst(card.x, card.y, 25, '#37B1E2', 150, 0.8);
      this.particles.burst(card.x, card.y, 10, '#ffffff', 80, 0.4);

      // Check if all tapped
      if (this.orderTapIndex >= this.orderSequence.length) {
        // All in order!
        this.inputLocked = true;
        this.flameMeter.addCharge(2); // bonus for completing the order

        const echo = SUCCESS_ECHOES[Math.floor(Math.random() * SUCCESS_ECHOES.length)];
        this.voice?.successEcho('Evolution chain', echo);

        this.startCelebrate();
      } else {
        // Voice encouragement for intermediate taps
        this.voice?.successEcho(card.entry.name);
      }
    } else {
      // Wrong order
      card.shakeTimer = 0.4;
      this.audio?.playSynth('wrong-bonk');

      const expectedEntry = this.orderSequence[this.orderTapIndex];
      this.voice?.wrongRedirect(card.entry.name, expectedEntry.name);

      tracker.recordAnswer(card.entry.name, 'evolution', false);
      this.hintLadder.onMiss();

      if (this.hintLadder.autoCompleted) {
        this.autoCompleteOrder();
      }
    }
  }

  private autoCompleteOrder(): void {
    // Lock all remaining cards in order
    for (let i = this.orderTapIndex; i < this.orderSequence.length; i++) {
      const card = this.cards.find(c => c.orderIndex === i && !c.locked);
      if (card) {
        card.locked = true;
        card.lockBadge = i + 1;
        tracker.recordAnswer(card.entry.name, 'evolution', true);
      }
    }

    this.flameMeter.addCharge(0.5);
    this.audio?.playSynth('pop');
    this.voice?.successEcho('Evolution chain');

    this.startCelebrate();
  }

  // -----------------------------------------------------------------------
  // Update
  // -----------------------------------------------------------------------

  update(dt: number): void {
    this.totalTime += dt;
    this.phaseTimer += dt;
    this.bg.update(dt);
    this.particles.update(dt);
    this.mcxSprite.update(dt);
    this.flameMeter.update(dt);

    // Update center sprite
    if (this.centerSprite) {
      this.centerSprite.update(dt);
    }

    // Update card animators
    for (const card of this.cards) {
      card.animator.update(dt);
      card.bobPhase += dt * 1.5;
      if (card.shakeTimer > 0) {
        card.shakeTimer = Math.max(0, card.shakeTimer - dt);
      }
    }

    switch (this.phase) {
      case 'banner':
        if (this.phaseTimer >= BANNER_DURATION) this.startEngage();
        break;

      case 'engage':
        if (this.phaseTimer >= ENGAGE_DURATION) this.startShowPokemon();
        break;

      case 'show-pokemon':
        if (this.phaseTimer >= SHOW_POKEMON_DURATION) this.startChoice();
        break;

      case 'choice':
        this.updateHints(dt);
        break;

      case 'celebrate':
        // Ambient celebration sparks
        if (Math.random() < 0.3) {
          this.particles.spawn({
            x: randomRange(200, DESIGN_WIDTH - 200),
            y: randomRange(200, DESIGN_HEIGHT - 200),
            vx: randomRange(-30, 30),
            vy: randomRange(-60, -20),
            color: FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)],
            size: randomRange(2, 6),
            lifetime: randomRange(0.3, 0.7),
            drag: 0.96,
            fadeOut: true,
            shrink: true,
          });
        }
        if (this.phaseTimer >= CELEBRATE_DURATION) {
          this.startNext();
        }
        break;
    }

    // Ambient energy particles during show-pokemon and choice
    if (
      (this.phase === 'show-pokemon' || this.phase === 'choice') &&
      Math.random() < 0.08
    ) {
      this.particles.spawn({
        x: randomRange(100, DESIGN_WIDTH - 100),
        y: randomRange(DESIGN_HEIGHT * 0.3, DESIGN_HEIGHT * 0.9),
        vx: randomRange(-10, 10),
        vy: randomRange(-40, -15),
        color: FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)],
        size: randomRange(1.5, 4),
        lifetime: randomRange(0.4, 1.0),
        drag: 0.97,
        fadeOut: true,
        shrink: true,
      });
    }
  }

  private updateHints(dt: number): void {
    const escalated = this.hintLadder.update(dt);

    if (escalated && this.hintLadder.hintLevel === 1) {
      if (this.promptMode === 'recognition' && this.correctEntry) {
        this.voice?.hintRepeat(this.correctEntry.name);
      } else if (this.promptMode === 'order' && this.orderTapIndex < this.orderSequence.length) {
        this.voice?.hintRepeat(this.orderSequence[this.orderTapIndex].name);
      }
    }

    if (this.hintLadder.autoCompleted && !this.inputLocked) {
      this.inputLocked = true;
      if (this.promptMode === 'recognition') {
        this.autoCompleteRecognition();
      } else {
        this.autoCompleteOrder();
      }
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  render(ctx: CanvasRenderingContext2D): void {
    // Background
    this.bg.render(ctx);

    // Arena-style overlay
    this.renderArenaBackground(ctx);

    // Dim background during choice to highlight cards
    if (this.phase === 'choice' || this.phase === 'show-pokemon') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    }

    // MCX sprite in top-right corner
    this.mcxSprite.render(ctx, SPRITE_X, SPRITE_Y, SPRITE_SCALE);

    // Warm glow behind sprite
    const glowGrad = ctx.createRadialGradient(SPRITE_X, SPRITE_Y, 20, SPRITE_X, SPRITE_Y, 200);
    glowGrad.addColorStop(0, 'rgba(55, 177, 226, 0.12)');
    glowGrad.addColorStop(1, 'rgba(55, 177, 226, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(SPRITE_X - 200, SPRITE_Y - 200, 400, 400);

    // Center sprite (recognition mode, during show-pokemon and choice)
    if (
      this.promptMode === 'recognition' &&
      this.centerSprite &&
      this.centerEntry &&
      (this.phase === 'show-pokemon' || this.phase === 'choice')
    ) {
      this.renderCenterSprite(ctx);
    }

    // Sprite cards
    if (this.phase === 'choice' || this.phase === 'celebrate') {
      for (const card of this.cards) {
        this.renderCard(ctx, card);
      }
    }

    // Order mode: show "Put them in order!" with numbered slots during show-pokemon
    if (this.promptMode === 'order' && this.phase === 'show-pokemon') {
      this.renderOrderPreview(ctx);
    }

    // Hint level 3: draw line from MCX toward correct target
    if (this.phase === 'choice' && this.hintLadder.hintLevel >= 3) {
      this.renderHintLine(ctx);
    }

    // Particles
    this.particles.render(ctx);

    // Flame meter at top
    this.flameMeter.render(ctx);

    // Question text
    if (this.phase === 'show-pokemon' || this.phase === 'choice') {
      this.renderQuestionLabel(ctx);
    }

    // Phase text (engage)
    if (this.phase === 'engage') {
      this.renderEngageText(ctx);
    }

    // Celebration text
    if (this.phase === 'celebrate') {
      this.renderCelebration(ctx);
    }

    // Progress dots
    if (this.phase !== 'banner' && this.phase !== 'next') {
      this.renderProgress(ctx);
    }
  }

  // -----------------------------------------------------------------------
  // Render: Arena Background
  // -----------------------------------------------------------------------

  private renderArenaBackground(ctx: CanvasRenderingContext2D): void {
    // Stadium-like gradient at the bottom
    const arenaGrad = ctx.createLinearGradient(0, DESIGN_HEIGHT * 0.6, 0, DESIGN_HEIGHT);
    arenaGrad.addColorStop(0, 'rgba(20, 20, 60, 0)');
    arenaGrad.addColorStop(0.5, 'rgba(20, 20, 60, 0.3)');
    arenaGrad.addColorStop(1, 'rgba(10, 10, 40, 0.5)');
    ctx.fillStyle = arenaGrad;
    ctx.fillRect(0, DESIGN_HEIGHT * 0.6, DESIGN_WIDTH, DESIGN_HEIGHT * 0.4);

    // Subtle arena floor line
    ctx.save();
    ctx.strokeStyle = 'rgba(55, 177, 226, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, DESIGN_HEIGHT * 0.88);
    ctx.lineTo(DESIGN_WIDTH - 100, DESIGN_HEIGHT * 0.88);
    ctx.stroke();
    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // Render: Center Sprite (Recognition mode)
  // -----------------------------------------------------------------------

  private renderCenterSprite(ctx: CanvasRenderingContext2D): void {
    if (!this.centerSprite || !this.centerEntry) return;

    const cx = DESIGN_WIDTH / 2;
    const cy = DESIGN_HEIGHT * 0.35;
    const scale = this.centerEntry.scale * 1.5; // larger for center display

    // Glow behind sprite
    ctx.save();
    const glow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 180);
    glow.addColorStop(0, 'rgba(55, 177, 226, 0.2)');
    glow.addColorStop(1, 'rgba(55, 177, 226, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.centerSprite.render(ctx, cx, cy, scale);

    // Name label below center sprite
    ctx.save();
    ctx.font = 'bold 48px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeText(this.centerEntry.name, cx, cy + 120);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(55, 177, 226, 0.5)';
    ctx.shadowBlur = 15;
    ctx.fillText(this.centerEntry.name, cx, cy + 120);
    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // Render: Order Preview (during show-pokemon phase)
  // -----------------------------------------------------------------------

  private renderOrderPreview(ctx: CanvasRenderingContext2D): void {
    const count = this.orderSequence.length;
    const spacing = 280;
    const totalWidth = (count - 1) * spacing;
    const startX = (DESIGN_WIDTH - totalWidth) / 2;
    const centerY = DESIGN_HEIGHT * 0.45;

    for (let i = 0; i < count; i++) {
      const x = startX + i * spacing;
      const fadeIn = Math.min(1, this.phaseTimer / 1.0);

      ctx.save();
      ctx.globalAlpha = fadeIn * 0.6;

      // Question mark placeholder card
      ctx.fillStyle = '#1a1a3e';
      ctx.beginPath();
      ctx.roundRect(x - CARD_W / 2, centerY - CARD_H / 2, CARD_W, CARD_H, CARD_RADIUS);
      ctx.fill();

      ctx.strokeStyle = 'rgba(55, 177, 226, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x - CARD_W / 2, centerY - CARD_H / 2, CARD_W, CARD_H, CARD_RADIUS);
      ctx.stroke();

      // Number badge
      ctx.globalAlpha = fadeIn;
      ctx.fillStyle = '#37B1E2';
      ctx.font = 'bold 56px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}`, x, centerY - 20);

      // Question mark
      ctx.fillStyle = 'rgba(145, 204, 236, 0.5)';
      ctx.font = 'bold 36px system-ui';
      ctx.fillText('?', x, centerY + 40);

      // Arrow between cards
      if (i < count - 1) {
        ctx.fillStyle = 'rgba(55, 177, 226, 0.6)';
        ctx.font = 'bold 40px system-ui';
        ctx.fillText('\u2192', x + spacing / 2, centerY);
      }

      ctx.restore();
    }
  }

  // -----------------------------------------------------------------------
  // Render: Sprite Card
  // -----------------------------------------------------------------------

  private renderCard(ctx: CanvasRenderingContext2D, card: SpriteCard): void {
    if (!card.alive && !card.locked) return;

    ctx.save();

    const bob = Math.sin(card.bobPhase) * 4;
    let shakeOffset = 0;
    if (card.shakeTimer > 0) {
      shakeOffset = Math.sin(card.shakeTimer * 40) * 8 * (card.shakeTimer / 0.4);
    }
    const cx = card.x + shakeOffset;
    const cy = card.y + bob;

    if (card.dimmed) {
      ctx.globalAlpha = 0.35;
    }

    // Determine card style
    const isCorrectHint = this.promptMode === 'recognition' &&
      card.isCorrect &&
      this.hintLadder.hintLevel >= 2 &&
      this.phase === 'choice';

    const isLocked = card.locked;
    const isOrderHint = this.promptMode === 'order' &&
      card.orderIndex === this.orderTapIndex &&
      this.hintLadder.hintLevel >= 2 &&
      this.phase === 'choice' &&
      !card.locked;

    // Card background
    let bgColor = '#1a1a3e';
    let borderColor = 'rgba(55, 177, 226, 0.5)';
    let borderWidth = 3;

    if (isLocked) {
      bgColor = '#1a2a4e';
      borderColor = theme.palette.celebration.gold;
      borderWidth = 4;
    } else if (isCorrectHint || isOrderHint) {
      bgColor = '#1a3a6e';
      borderColor = '#91CCEC';
      borderWidth = 4;
    }

    // Hint glow
    if ((isCorrectHint || isOrderHint) && !isLocked) {
      const pulse = 1 + Math.sin(this.totalTime * 5) * 0.15;
      ctx.save();
      ctx.shadowColor = '#37B1E2';
      ctx.shadowBlur = 25 * pulse;
      ctx.strokeStyle = '#37B1E2';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(
        cx - CARD_W / 2 - 4, cy - CARD_H / 2 - 4,
        CARD_W + 8, CARD_H + 8,
        CARD_RADIUS + 4,
      );
      ctx.stroke();
      ctx.restore();
    }

    // Card body
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(cx - CARD_W / 2, cy - CARD_H / 2, CARD_W, CARD_H, CARD_RADIUS);
    ctx.fill();

    // Card border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.roundRect(cx - CARD_W / 2, cy - CARD_H / 2, CARD_W, CARD_H, CARD_RADIUS);
    ctx.stroke();

    // Sprite inside card (centered in upper portion)
    const spriteY = cy - 25;
    card.animator.render(ctx, cx, spriteY, card.entry.scale);

    // Name label below sprite
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.entry.name, cx, cy + CARD_H / 2 - 28);

    // Order mode: lock badge (numbered circle)
    if (card.locked && card.lockBadge > 0) {
      const badgeX = cx + CARD_W / 2 - 20;
      const badgeY = cy - CARD_H / 2 + 20;
      const badgeR = 18;

      // Gold circle
      ctx.fillStyle = theme.palette.celebration.gold;
      ctx.shadowColor = theme.palette.celebration.gold;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Number text
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${card.lockBadge}`, badgeX, badgeY);

      // Checkmark below badge
      ctx.fillStyle = theme.palette.ui.correct;
      ctx.font = 'bold 24px system-ui';
      ctx.fillText('\u2713', badgeX, badgeY + 28);
    }

    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // Render: Hint Line
  // -----------------------------------------------------------------------

  private renderHintLine(ctx: CanvasRenderingContext2D): void {
    let target: SpriteCard | undefined;

    if (this.promptMode === 'recognition') {
      target = this.cards.find(c => c.isCorrect && c.alive);
    } else {
      target = this.cards.find(c => c.orderIndex === this.orderTapIndex && !c.locked);
    }

    if (!target) return;

    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#37B1E2';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(SPRITE_X, SPRITE_Y + 60);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // Render: Question Label
  // -----------------------------------------------------------------------

  private renderQuestionLabel(ctx: CanvasRenderingContext2D): void {
    const x = DESIGN_WIDTH / 2;
    const y = DESIGN_HEIGHT * 0.12;

    ctx.save();
    ctx.font = 'bold 64px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeText(this.questionText, x, y);

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(55, 177, 226, 0.5)';
    ctx.shadowBlur = 20;
    ctx.fillText(this.questionText, x, y);
    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // Render: Engage Text
  // -----------------------------------------------------------------------

  private renderEngageText(ctx: CanvasRenderingContext2D): void {
    const name = this.isOwen ? settings.littleTrainerName : settings.bigTrainerName;
    const action = this.isOwen ? 'point!' : 'choose!';
    const text = `${name}, ${action}`;

    ctx.save();
    ctx.font = 'bold 64px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(55, 177, 226, 0.5)';
    ctx.shadowBlur = 20;
    ctx.fillText(text, DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.45);
    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // Render: Celebration
  // -----------------------------------------------------------------------

  private renderCelebration(ctx: CanvasRenderingContext2D): void {
    const t = Math.min(this.phaseTimer / 0.3, 1);
    const scale = 0.5 + 0.5 * t;
    const fadeStart = CELEBRATE_DURATION * 0.75;
    const alpha = this.phaseTimer < fadeStart
      ? 1
      : 1 - (this.phaseTimer - fadeStart) / (CELEBRATE_DURATION - fadeStart);

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textX = DESIGN_WIDTH / 2;
    const textY = DESIGN_HEIGHT * 0.3;
    const celebText = this.promptMode === 'order' ? 'EVOLVED!' : 'GREAT!';

    // Glow
    ctx.save();
    ctx.shadowColor = theme.palette.celebration.gold;
    ctx.shadowBlur = 40;
    ctx.font = `bold ${Math.round(96 * scale)}px system-ui`;
    ctx.fillStyle = theme.palette.celebration.gold;
    ctx.fillText(celebText, textX, textY);
    ctx.restore();

    // Solid text
    ctx.font = `bold ${Math.round(96 * scale)}px system-ui`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(celebText, textX, textY);

    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // Render: Progress Dots
  // -----------------------------------------------------------------------

  private renderProgress(ctx: CanvasRenderingContext2D): void {
    const total = PROMPTS_TOTAL;
    const completed = this.promptIndex;
    const dotR = 10;
    const spacing = 36;
    const startX = DESIGN_WIDTH / 2 - ((total - 1) * spacing) / 2;
    const y = DESIGN_HEIGHT - 50;

    for (let i = 0; i < total; i++) {
      const dx = startX + i * spacing;
      const isCurrent = i === completed;

      ctx.save();

      if (i < completed) {
        ctx.fillStyle = '#37B1E2';
        ctx.shadowColor = '#37B1E2';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(dx, y, dotR, 0, Math.PI * 2);
        ctx.fill();
      } else if (isCurrent) {
        const pulse = 0.5 + 0.5 * Math.sin(this.totalTime * 3);
        ctx.strokeStyle = `rgba(94, 212, 252, ${0.5 + pulse * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(dx, y, dotR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(55, 177, 226, ${0.3 + pulse * 0.2})`;
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(dx, y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // -----------------------------------------------------------------------
  // Input
  // -----------------------------------------------------------------------

  handleClick(x: number, y: number): void {
    if (this.phase !== 'choice' || this.inputLocked) return;

    for (const card of this.cards) {
      if (card.dimmed && this.promptMode === 'recognition') continue;
      if (!card.alive && !card.locked) continue;
      if (card.locked) continue; // already tapped in order mode

      if (this.isCardHit(card, x, y)) {
        if (this.promptMode === 'recognition') {
          if (card.isCorrect) {
            this.handleRecognitionCorrect(card);
          } else {
            this.handleRecognitionWrong(card);
          }
        } else {
          this.handleOrderTap(card);
        }
        return;
      }
    }
  }

  handleKey(key: string): void {
    if (key === 'Escape') {
      this.gameContext.screenManager.goTo('hub');
    }
  }
}
