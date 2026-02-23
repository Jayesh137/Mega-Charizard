// src/engine/entities/sprite-animator.ts
// Sprite sheet rendering system for animated Pokemon sprites.
// Renders horizontal strip sprite sheets on the canvas with pixel-art crisp scaling.

export interface SpriteConfig {
  src: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop?: boolean;
}

export class SpriteAnimator {
  private image: HTMLImageElement;
  private config: SpriteConfig;
  private currentFrame = 0;
  private elapsed = 0;
  private _loaded = false;
  private _paused = false;

  constructor(config: SpriteConfig) {
    this.config = { loop: true, ...config };
    this.image = new Image();
    this.image.onload = () => { this._loaded = true; };
    this.image.src = config.src;
  }

  get loaded(): boolean { return this._loaded; }

  pause(): void { this._paused = true; }
  resume(): void { this._paused = false; }
  reset(): void { this.currentFrame = 0; this.elapsed = 0; }

  update(dt: number): void {
    if (!this._loaded || this._paused) return;
    this.elapsed += dt;
    const frameDuration = 1 / this.config.fps;
    while (this.elapsed >= frameDuration) {
      this.elapsed -= frameDuration;
      if (this.config.loop) {
        this.currentFrame = (this.currentFrame + 1) % this.config.frameCount;
      } else {
        this.currentFrame = Math.min(this.currentFrame + 1, this.config.frameCount - 1);
      }
    }
  }

  /** Render centered at (cx, cy) with pixel-art crisp scaling */
  render(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale = 1): void {
    if (!this._loaded) return;
    const fw = this.config.frameWidth;
    const fh = this.config.frameHeight;
    const sx = this.currentFrame * fw;
    const dw = fw * scale;
    const dh = fh * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.image, sx, 0, fw, fh, cx - dw / 2, cy - dh / 2, dw, dh);
    ctx.imageSmoothingEnabled = true;
  }
}
