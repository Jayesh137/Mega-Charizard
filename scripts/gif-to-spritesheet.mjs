// Convert animated GIFs to horizontal sprite sheet PNGs
// Usage: node scripts/gif-to-spritesheet.mjs

import sharp from 'sharp';
import { readdir, writeFile } from 'fs/promises';
import { join } from 'path';

const SPRITES_DIR = 'public/sprites';

async function gifToSpriteSheet(gifPath, outPath) {
  const name = gifPath.split('/').pop();

  // Get GIF metadata (frame count, dimensions)
  const metadata = await sharp(gifPath, { animated: true }).metadata();
  const frameWidth = metadata.width;
  const frameHeight = metadata.pageHeight || metadata.height;
  const frameCount = metadata.pages || 1;

  console.log(`${name}: ${frameWidth}x${frameHeight}, ${frameCount} frames`);

  // Extract all frames as a tall vertical strip (sharp's default for animated)
  const rawBuffer = await sharp(gifPath, { animated: true, pages: -1 })
    .removeAlpha()
    .ensureAlpha()
    .png()
    .toBuffer();

  // The animated GIF is extracted as a vertical strip by sharp
  // We need to rearrange into a horizontal strip
  const verticalStrip = sharp(rawBuffer);
  const vertMeta = await verticalStrip.metadata();

  // Extract each frame and composite horizontally
  const sheetWidth = frameWidth * frameCount;
  const sheetHeight = frameHeight;

  // Create composites array - extract each frame from the vertical strip
  const composites = [];
  for (let i = 0; i < frameCount; i++) {
    const frameBuffer = await sharp(rawBuffer)
      .extract({ left: 0, top: i * frameHeight, width: frameWidth, height: frameHeight })
      .toBuffer();

    composites.push({
      input: frameBuffer,
      left: i * frameWidth,
      top: 0,
    });
  }

  // Create horizontal sprite sheet
  await sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(outPath);

  console.log(`  -> ${outPath} (${sheetWidth}x${sheetHeight})`);

  return { name: name.replace('.gif', ''), frameWidth, frameHeight, frameCount };
}

async function main() {
  const gifs = ['charmander.gif', 'charmeleon.gif', 'charizard.gif', 'charizard-megax.gif'];
  const configs = [];

  for (const gif of gifs) {
    const gifPath = join(SPRITES_DIR, gif);
    const outPath = join(SPRITES_DIR, gif.replace('.gif', '.png'));
    try {
      const config = await gifToSpriteSheet(gifPath, outPath);
      configs.push(config);
    } catch (err) {
      console.error(`Error processing ${gif}:`, err.message);
    }
  }

  console.log('\n--- Sprite configs for src/config/sprites.ts ---');
  for (const c of configs) {
    const key = c.name === 'charizard-megax' ? "'charizard-megax'" : c.name;
    console.log(`  ${key}: { src: './sprites/${c.name}.png', frameWidth: ${c.frameWidth}, frameHeight: ${c.frameHeight}, frameCount: ${c.frameCount}, fps: 12 },`);
  }
}

main().catch(console.error);
