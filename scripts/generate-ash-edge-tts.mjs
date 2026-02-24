#!/usr/bin/env node
// scripts/generate-ash-edge-tts.mjs
// FREE: Generates all Ash Ketchum voice lines using Microsoft Edge TTS.
// No API key needed! Uses the msedge-tts npm package.
//
// Uses per-category prosody tuning (rate, pitch, volume) to make each
// line category sound natural and expressive rather than robotic.
//
// Usage:
//   npm install msedge-tts    (one-time)
//   node scripts/generate-ash-edge-tts.mjs
//
// Options:
//   --voice=NAME     Edge TTS voice (default: en-US-GuyNeural)
//   --dry-run        Print lines without generating audio
//   --only=cat       Only generate a specific category
//   --skip-existing  Skip files that already exist

import { readFileSync, existsSync } from 'fs';
import { mkdir, rename, rm } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'public/audio/voice/ash');
const ASH_LINES_PATH = resolve(PROJECT_ROOT, 'src/config/ash-lines.ts');

// ---------------------------------------------------------------------------
// Per-category prosody settings to make each type of line sound natural.
// rate: speech speed (+%/-%), pitch: tone (+Hz/-Hz), volume: loudness
// ---------------------------------------------------------------------------
const CATEGORY_PROSODY = {
  turn: { rate: '+15%', pitch: '+15Hz', volume: '+10%' },     // Excited, calling out
  color: { rate: '+10%', pitch: '+10Hz', volume: '+5%' },     // Enthusiastic prompt
  number: { rate: '+5%', pitch: '+8Hz', volume: '+5%' },      // Clear, encouraging
  shape: { rate: '+10%', pitch: '+10Hz', volume: '+5%' },     // Enthusiastic prompt
  letter: { rate: '+0%', pitch: '+5Hz', volume: '+5%' },      // Clear, educational
  correct: { rate: '+20%', pitch: '+20Hz', volume: '+15%' },  // High energy celebration!
  wrong: { rate: '-5%', pitch: '+5Hz', volume: '+0%' },       // Gentle, reassuring
  evolution: { rate: '+10%', pitch: '+18Hz', volume: '+15%' }, // Dramatic, awestruck
  encourage: { rate: '+5%', pitch: '+10Hz', volume: '+5%' },  // Warm, supportive
  iconic: { rate: '+10%', pitch: '+15Hz', volume: '+10%' },   // Signature energy
};

const DEFAULT_PROSODY = { rate: '+10%', pitch: '+10Hz', volume: '+5%' };

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    voice: 'en-US-GuyNeural',
    dryRun: false,
    only: '',
    skipExisting: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--voice=')) opts.voice = arg.split('=')[1];
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg.startsWith('--only=')) opts.only = arg.split('=')[1];
    else if (arg === '--skip-existing') opts.skipExisting = true;
  }

  return opts;
}

// ---------------------------------------------------------------------------
// Extract voice lines from ash-lines.ts
// ---------------------------------------------------------------------------
function extractLines() {
  const src = readFileSync(ASH_LINES_PATH, 'utf-8');
  const lines = [];

  const re = /\{\s*id:\s*['"]([^'"]+)['"]\s*,\s*text:\s*(['"])((?:(?!\2).)*)\2\s*,\s*file:\s*['"]([^'"]+)['"]\s*,\s*category:\s*['"]([^'"]+)['"]\s*\}/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    lines.push({
      id: m[1],
      text: m[3],
      file: m[4],
      category: m[5],
    });
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const opts = parseArgs();

  let MsEdgeTTS, OUTPUT_FORMAT;
  if (!opts.dryRun) {
    try {
      const mod = await import('msedge-tts');
      MsEdgeTTS = mod.MsEdgeTTS;
      OUTPUT_FORMAT = mod.OUTPUT_FORMAT;
    } catch {
      console.error('ERROR: msedge-tts not installed. Run: npm install msedge-tts');
      process.exit(1);
    }
  }

  const allLines = extractLines();
  console.log(`Found ${allLines.length} voice lines in ash-lines.ts`);
  console.log(`Voice: ${opts.voice}\n`);

  const lines = opts.only
    ? allLines.filter((l) => l.category === opts.only)
    : allLines;

  if (opts.only) {
    console.log(`Filtered to ${lines.length} lines in category "${opts.only}"\n`);
  }

  if (lines.length === 0) {
    console.log('No lines to generate.');
    return;
  }

  if (opts.dryRun) {
    console.log('DRY RUN — would generate:\n');
    for (const line of lines) {
      const p = CATEGORY_PROSODY[line.category] || DEFAULT_PROSODY;
      console.log(`  [${line.category}] ${line.file} — "${line.text}"  (rate:${p.rate} pitch:${p.pitch} vol:${p.volume})`);
    }
    console.log(`\nTotal: ${lines.length} files`);
    return;
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const tmpDir = resolve(OUTPUT_DIR, '_tts_tmp');

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const outPath = resolve(OUTPUT_DIR, line.file);
    const progress = `[${i + 1}/${lines.length}]`;

    if (opts.skipExisting && existsSync(outPath)) {
      console.log(`  ${progress} SKIP ${line.file} (exists)`);
      skipped++;
      continue;
    }

    // Get category-specific prosody
    const prosody = CATEGORY_PROSODY[line.category] || DEFAULT_PROSODY;

    try {
      process.stdout.write(`  ${progress} ${line.file} ... `);

      await mkdir(tmpDir, { recursive: true });

      const tts = new MsEdgeTTS();
      await tts.setMetadata(opts.voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      const result = await tts.toFile(tmpDir, line.text, {
        rate: prosody.rate,
        pitch: prosody.pitch,
        volume: prosody.volume,
      });

      await rename(result.audioFilePath, outPath);
      await rm(tmpDir, { recursive: true, force: true });

      console.log(`OK  (${line.category}: rate=${prosody.rate} pitch=${prosody.pitch})`);
      success++;
    } catch (err) {
      console.log(`FAIL — ${err.message}`);
      failed++;
      try { await rm(tmpDir, { recursive: true, force: true }); } catch {}
    }
  }

  console.log(`\nDone! ${success} generated, ${skipped} skipped, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
