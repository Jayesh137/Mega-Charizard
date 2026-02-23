// src/engine/game-loop.ts
import { MAX_FRAME_DT } from '../config/constants';
import { session } from '../state/session.svelte';
import type { ScreenManager } from './screen-manager';

export class GameLoop {
  private running = false;
  private lastTime = 0;
  private frameCount = 0;
  private fpsTimer = 0;
  public screenManager!: ScreenManager;

  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D,
  ) {}

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.tick(t));
  }

  stop(): void {
    this.running = false;
  }

  private tick(now: number): void {
    if (!this.running) return;

    const dt = Math.min((now - this.lastTime) / 1000, MAX_FRAME_DT);
    this.lastTime = now;

    // FPS tracking
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1) {
      session.currentFps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    // Clear
    this.ctx.clearRect(0, 0, 1920, 1080);

    // Update + render current screen
    this.screenManager.update(dt);
    this.screenManager.render(this.ctx);

    requestAnimationFrame((t) => this.tick(t));
  }

  handleClick(x: number, y: number): void {
    this.screenManager.handleClick(x, y);
  }

  handleKey(key: string): void {
    this.screenManager.handleKey(key);
  }
}
