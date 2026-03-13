// src/engine/utils/screen-shake.ts
// Provides screen shake effect — offset the canvas translate for impact moments

export class ScreenShake {
  private intensity = 0;
  private decay = 0.92;  // How quickly shake reduces
  offsetX = 0;
  offsetY = 0;

  /** Trigger a shake with given intensity (pixels of max displacement) */
  shake(intensity: number): void {
    this.intensity = Math.max(this.intensity, intensity);
  }

  /** Call every frame */
  update(dt: number): void {
    if (this.intensity < 0.5) {
      this.intensity = 0;
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }
    this.offsetX = (Math.random() - 0.5) * 2 * this.intensity;
    this.offsetY = (Math.random() - 0.5) * 2 * this.intensity;
    this.intensity *= this.decay;
  }

  /** Whether currently shaking */
  get active(): boolean {
    return this.intensity > 0.5;
  }
}
