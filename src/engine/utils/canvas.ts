// src/engine/utils/canvas.ts
import { DESIGN_WIDTH, DESIGN_HEIGHT, MAX_DPR, SAFE_AREA } from '../../config/constants';

let scaleX = 1;
let scaleY = 1;
let offsetX = 0;
let offsetY = 0;

export function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')!;
  const parent = canvas.parentElement!;
  const parentWidth = parent.clientWidth;
  const parentHeight = parent.clientHeight;

  const designRatio = DESIGN_WIDTH / DESIGN_HEIGHT;
  const windowRatio = parentWidth / parentHeight;

  let width: number, height: number;
  if (windowRatio > designRatio) {
    height = parentHeight;
    width = height * designRatio;
  } else {
    width = parentWidth;
    height = width / designRatio;
  }

  offsetX = (parentWidth - width) / 2;
  offsetY = (parentHeight - height) / 2;

  const dpr = Math.min(window.devicePixelRatio, MAX_DPR);
  canvas.width = DESIGN_WIDTH * dpr;
  canvas.height = DESIGN_HEIGHT * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.position = 'absolute';
  canvas.style.left = `${offsetX}px`;
  canvas.style.top = `${offsetY}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scaleX = width / DESIGN_WIDTH;
  scaleY = height / DESIGN_HEIGHT;

  return ctx;
}

export function mapClickToDesignSpace(canvas: HTMLCanvasElement, e: MouseEvent): [number, number] {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * DESIGN_WIDTH;
  const y = ((e.clientY - rect.top) / rect.height) * DESIGN_HEIGHT;
  return [x, y];
}

export function isInSafeArea(x: number, y: number): boolean {
  return (
    x >= DESIGN_WIDTH * SAFE_AREA.left &&
    x <= DESIGN_WIDTH * SAFE_AREA.right &&
    y >= DESIGN_HEIGHT * SAFE_AREA.top &&
    y <= DESIGN_HEIGHT * SAFE_AREA.bottom
  );
}

export function safeAreaBounds() {
  return {
    x: DESIGN_WIDTH * SAFE_AREA.left,
    y: DESIGN_HEIGHT * SAFE_AREA.top,
    width: DESIGN_WIDTH * (SAFE_AREA.right - SAFE_AREA.left),
    height: DESIGN_HEIGHT * (SAFE_AREA.bottom - SAFE_AREA.top),
  };
}
