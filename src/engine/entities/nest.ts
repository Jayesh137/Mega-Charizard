// src/engine/entities/nest.ts
// Reusable nest drawing function for Dragon Egg Sort mini-game
// Draws a woven bowl/basket with colored rim, label, and optional glow

export function drawNest(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  label: string,
  glow: boolean,
  time: number,
): void {
  ctx.save();

  const halfW = width / 2;
  const halfH = height / 2;

  // Shadow under nest
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(x, y + halfH + 8, halfW * 0.8, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Glow effect when active
  if (glow) {
    const pulseAlpha = 0.25 + 0.15 * Math.sin(time * 4);
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 35;
    ctx.globalAlpha = pulseAlpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y + halfH * 0.3, halfW + 10, halfH + 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Main basket body — bowl shape using arcs
  // Back wall (slightly darker)
  const backGrad = ctx.createLinearGradient(x - halfW, y - halfH * 0.2, x + halfW, y + halfH);
  backGrad.addColorStop(0, '#6B3A1F');
  backGrad.addColorStop(0.5, '#8B4513');
  backGrad.addColorStop(1, '#5C2E0E');
  ctx.fillStyle = backGrad;
  ctx.beginPath();
  ctx.moveTo(x - halfW, y - halfH * 0.2);
  ctx.quadraticCurveTo(x - halfW * 0.3, y + halfH * 1.1, x, y + halfH);
  ctx.quadraticCurveTo(x + halfW * 0.3, y + halfH * 1.1, x + halfW, y - halfH * 0.2);
  ctx.lineTo(x + halfW, y + halfH * 0.3);
  ctx.quadraticCurveTo(x, y + halfH * 1.2, x - halfW, y + halfH * 0.3);
  ctx.closePath();
  ctx.fill();

  // Front wall (lighter brown)
  const frontGrad = ctx.createLinearGradient(x - halfW, y, x + halfW, y + halfH);
  frontGrad.addColorStop(0, '#A0522D');
  frontGrad.addColorStop(0.4, '#8B4513');
  frontGrad.addColorStop(1, '#6B3A1F');
  ctx.fillStyle = frontGrad;
  ctx.beginPath();
  ctx.moveTo(x - halfW * 0.95, y + halfH * 0.05);
  ctx.quadraticCurveTo(x, y + halfH * 1.3, x + halfW * 0.95, y + halfH * 0.05);
  ctx.lineTo(x + halfW * 0.9, y + halfH * 0.6);
  ctx.quadraticCurveTo(x, y + halfH * 1.25, x - halfW * 0.9, y + halfH * 0.6);
  ctx.closePath();
  ctx.fill();

  // Woven cross-hatch texture lines
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = '#5C2E0E';
  ctx.lineWidth = 2;

  // Horizontal weave lines
  for (let i = 0; i < 5; i++) {
    const ly = y + halfH * 0.1 + i * (halfH * 0.15);
    ctx.beginPath();
    const indent = halfW * (0.85 - i * 0.05);
    ctx.moveTo(x - indent, ly);
    ctx.quadraticCurveTo(x, ly + 8 * Math.sin(i), x + indent, ly);
    ctx.stroke();
  }

  // Vertical weave lines
  for (let i = -3; i <= 3; i++) {
    const lx = x + i * (halfW * 0.22);
    ctx.beginPath();
    ctx.moveTo(lx, y);
    ctx.quadraticCurveTo(lx + 3, y + halfH * 0.5, lx, y + halfH * 0.7);
    ctx.stroke();
  }
  ctx.restore();

  // Colored rim at the top of the nest
  const rimHeight = 14;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - halfW, y - halfH * 0.2);
  ctx.quadraticCurveTo(x, y - halfH * 0.45, x + halfW, y - halfH * 0.2);
  ctx.lineTo(x + halfW, y - halfH * 0.2 + rimHeight);
  ctx.quadraticCurveTo(x, y - halfH * 0.45 + rimHeight, x - halfW, y - halfH * 0.2 + rimHeight);
  ctx.closePath();
  ctx.fill();

  // Rim highlight
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(x - halfW * 0.8, y - halfH * 0.2);
  ctx.quadraticCurveTo(x, y - halfH * 0.4, x + halfW * 0.8, y - halfH * 0.2);
  ctx.lineTo(x + halfW * 0.8, y - halfH * 0.2 + 4);
  ctx.quadraticCurveTo(x, y - halfH * 0.4 + 4, x - halfW * 0.8, y - halfH * 0.2 + 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Nest outline
  ctx.strokeStyle = '#3A1A08';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - halfW, y - halfH * 0.2);
  ctx.quadraticCurveTo(x, y - halfH * 0.45, x + halfW, y - halfH * 0.2);
  ctx.lineTo(x + halfW * 0.95, y + halfH * 0.5);
  ctx.quadraticCurveTo(x, y + halfH * 1.25, x - halfW * 0.95, y + halfH * 0.5);
  ctx.lineTo(x - halfW, y - halfH * 0.2);
  ctx.stroke();

  // Color name label below the nest
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 32px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Text outline for readability
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.strokeText(label, x, y + halfH + 38);

  // Colored text fill
  ctx.fillStyle = color;
  ctx.fillText(label, x, y + halfH + 38);

  ctx.restore();
}
