#!/usr/bin/env node
// scripts/generate-ash-edge-tts.mjs
// FREE FALLBACK: Generates all Ash Ketchum voice lines using Microsoft Edge TTS.
// No API key needed! Uses the msedge-tts npm package.
//
// Usage:
//   npm install msedge-tts    (one-time)
//   node scripts/generate-ash-edge-tts.mjs
//
// Options:
//   --voice=NAME   Edge TTS voice (default: en-US-ChristopherNeural)
//   --rate=+30%    Speech rate adjustment (default: +25%)
//   --pitch=+15Hz  Pitch adjustment (default: +20Hz)
//   --dry-run      Print lines without generating audio
//   --only=cat     Only generate a specific category
//   --skip-existing Skip files that already exist

import { readFileSync, existsSync } from 'fs';
import { mkdir, rename, rm } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'public/audio/voice/ash');
const ASH_LINES_PATH = resolve(PROJECT_ROOT, 'src/config/ash-lines.ts');

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    voice: 'en-US-ChristopherNeural',
    rate: '+25%',
    pitch: '+20Hz',
    dryRun: false,
    only: '',
    skipExisting: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--voice=')) opts.voice = arg.split('=')[1];
    else if (arg.startsWith('--rate=')) opts.rate = arg.split('=')[1];
    else if (arg.startsWith('--pitch=')) opts.pitch = arg.split('=')[1];
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

  // Dynamic import — only needed if actually generating
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
  console.log(`Found ${allLines.length} voice lines in ash-lines.ts\n`);

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
      console.log(`  [${line.category}] ${line.file} — "${line.text}"`);
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

    try {
      process.stdout.write(`  ${progress} ${line.file} ... `);

      await mkdir(tmpDir, { recursive: true });

      const tts = new MsEdgeTTS();
      await tts.setMetadata(opts.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const result = await tts.toFile(tmpDir, line.text, {
        rate: opts.rate,
        pitch: opts.pitch,
      });

      await rename(result.audioFilePath, outPath);
      await rm(tmpDir, { recursive: true, force: true });

      console.log('OK');
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
