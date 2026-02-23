// src/engine/entities/charmander.ts
// Simple procedural baby Charmander drawing for the Feed the Charmanders game

const CHARM = {
  body: '#F08030',       // orange body
  bodyLight: '#F8A060',  // lighter belly/face
  belly: '#FCF0DE',      // cream belly
  flame: '#FF4500',      // red-orange tail flame
  flameCore: '#FFD700',  // yellow flame center
  eye: '#2D1B00',        // dark brown eye
  eyeWhite: '#FFFFFF',   // eye highlight
  mouth: '#D45137',      // mouth color
  outline: '#8B4513',    // brown outline
};

/**
 * Draw a baby Charmander at the given position.
 * @param ctx Canvas context
 * @param x Center X position
 * @param y Bottom Y position (feet)
 * @param scale Scale factor (1.0 = 80px tall)
 * @param happy Whether showing happy animation (for fed state)
 * @param time Current time for animation
 */
export function drawBabyCharmander(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  happy: boolean,
  time: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Happy bounce
  const bounce = happy ? Math.abs(Math.sin(time * 8)) * 8 : 0;
  ctx.translate(0, -bounce);

  // Tail (behind body)
  ctx.save();
  ctx.strokeStyle = CHARM.outline;
  ctx.lineWidth = 3;
  ctx.fillStyle = CHARM.body;
  ctx.beginPath();
  ctx.moveTo(15, -25);
  ctx.quadraticCurveTo(35, -35, 40, -50);
  ctx.quadraticCurveTo(45, -35, 25, -25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tail flame
  const flicker = Math.sin(time * 12) * 3;
  ctx.fillStyle = CHARM.flame;
  ctx.beginPath();
  ctx.moveTo(38, -48);
  ctx.quadraticCurveTo(42 + flicker, -70, 40, -65);
  ctx.quadraticCurveTo(38 - flicker, -70, 42, -48);
  ctx.closePath();
  ctx.fill();
  // Flame core
  ctx.fillStyle = CHARM.flameCore;
  ctx.beginPath();
  ctx.arc(40, -52, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body (round oval)
  ctx.fillStyle = CHARM.body;
  ctx.strokeStyle = CHARM.outline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, -30, 22, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Belly patch
  ctx.fillStyle = CHARM.belly;
  ctx.beginPath();
  ctx.ellipse(0, -24, 14, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Left arm
  ctx.fillStyle = CHARM.body;
  ctx.strokeStyle = CHARM.outline;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(-18, -30, 7, 12, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Right arm (wave if happy)
  ctx.save();
  if (happy) {
    ctx.translate(18, -30);
    ctx.rotate(Math.sin(time * 10) * 0.4);
    ctx.translate(-18, 30);
  }
  ctx.fillStyle = CHARM.body;
  ctx.beginPath();
  ctx.ellipse(18, -30, 7, 12, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Feet
  ctx.fillStyle = CHARM.body;
  ctx.beginPath();
  ctx.ellipse(-10, -4, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(10, -4, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Head (big, round — baby proportions)
  ctx.fillStyle = CHARM.body;
  ctx.beginPath();
  ctx.arc(0, -58, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Face lighter patch
  ctx.fillStyle = CHARM.bodyLight;
  ctx.beginPath();
  ctx.ellipse(0, -55, 16, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (big, cute — key for toddler appeal)
  // Left eye
  ctx.fillStyle = CHARM.eyeWhite;
  ctx.beginPath();
  ctx.ellipse(-9, -62, 8, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CHARM.eye;
  ctx.beginPath();
  ctx.ellipse(-9, -61, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eye highlight
  ctx.fillStyle = CHARM.eyeWhite;
  ctx.beginPath();
  ctx.arc(-7, -64, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Star sparkle if happy
  if (happy) {
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(-7, -64, 3 + Math.sin(time * 15) * 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Right eye
  ctx.fillStyle = CHARM.eyeWhite;
  ctx.beginPath();
  ctx.ellipse(9, -62, 8, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CHARM.eye;
  ctx.beginPath();
  ctx.ellipse(9, -61, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CHARM.eyeWhite;
  ctx.beginPath();
  ctx.arc(11, -64, 2.5, 0, Math.PI * 2);
  ctx.fill();
  if (happy) {
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(11, -64, 3 + Math.sin(time * 15) * 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Smile
  ctx.strokeStyle = CHARM.mouth;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (happy) {
    // Big happy smile
    ctx.arc(0, -52, 10, 0.2, Math.PI - 0.2);
  } else {
    // Gentle smile
    ctx.arc(0, -53, 6, 0.3, Math.PI - 0.3);
  }
  ctx.stroke();

  ctx.restore();
}
