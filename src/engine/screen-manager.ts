// src/engine/screen-manager.ts
import type { EventEmitter } from './events';
import type { TweenManager } from './utils/tween';
import type { AudioManager } from './audio';

export interface GameScreen {
  enter(ctx: GameContext): void;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  exit(): void;
  handleClick(x: number, y: number): void;
  handleKey(key: string): void;
}

export interface GameContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  events: EventEmitter;
  tweens: TweenManager;
  screenManager: ScreenManager;
  audio?: AudioManager;
}

export class ScreenManager {
  private currentScreen: GameScreen | null = null;
  private screens = new Map<string, GameScreen>();
  private gameContext: GameContext;

  constructor(context: GameContext) {
    this.gameContext = context;
  }

  register(name: string, screen: GameScreen): void {
    this.screens.set(name, screen);
  }

  goTo(name: string): void {
    if (this.currentScreen) {
      this.currentScreen.exit();
    }

    // Clear all DOM overlays on screen transition to prevent stale content
    this.gameContext.events.emit({ type: 'hide-prompt' });
    this.gameContext.events.emit({ type: 'hide-banner' });
    this.gameContext.events.emit({ type: 'hide-subtitle' });

    const screen = this.screens.get(name);
    if (!screen) throw new Error(`Screen "${name}" not registered`);
    this.currentScreen = screen;
    this.currentScreen.enter(this.gameContext);
    this.gameContext.events.emit({ type: 'screen-changed', screen: name });
  }

  update(dt: number): void {
    this.gameContext.tweens.update(dt);
    this.currentScreen?.update(dt);
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.currentScreen?.render(ctx);
  }

  handleClick(x: number, y: number): void {
    this.currentScreen?.handleClick(x, y);
  }

  handleKey(key: string): void {
    this.currentScreen?.handleKey(key);
  }
}
