#!/usr/bin/env node
// scripts/generate-ash-elevenlabs.mjs
// Generates all Ash Ketchum voice lines via the ElevenLabs Text-to-Speech API.
// Reads line definitions from src/config/ash-lines.ts and saves MP3s to public/audio/voice/ash/.
//
// Usage:
//   node scripts/generate-ash-elevenlabs.mjs --api-key=YOUR_KEY --voice-id=YOUR_VOICE_ID
//
// Options:
//   --api-key     ElevenLabs API key (or set ELEVENLABS_API_KEY env var)
//   --voice-id    ElevenLabs voice ID to use (or set ELEVENLABS_VOICE_ID env var)
//   --model       Model ID (default: eleven_multilingual_v2)
//   --dry-run     Print lines without generating audio
//   --only=cat    Only generate lines from a specific category (e.g. --only=correct)
//   --skip-existing  Skip files that already exist

import { readFileSync, existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
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
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    voiceId: process.env.ELEVENLABS_VOICE_ID || '',
    model: 'eleven_multilingual_v2',
    dryRun: false,
    only: '',
    skipExisting: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--api-key=')) opts.apiKey = arg.split('=')[1];
    else if (arg.startsWith('--voice-id=')) opts.voiceId = arg.split('=')[1];
    else if (arg.startsWith('--model=')) opts.model = arg.split('=')[1];
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg.startsWith('--only=')) opts.only = arg.split('=')[1];
    else if (arg === '--skip-existing') opts.skipExisting = true;
  }

  return opts;
}

// ---------------------------------------------------------------------------
// Extract voice lines from ash-lines.ts (simple regex parser — no TS compiler needed)
// ---------------------------------------------------------------------------
function extractLines() {
  const src = readFileSync(ASH_LINES_PATH, 'utf-8');
  const lines = [];

  // Match each object literal: { id: '...', text: "...", file: '...', category: '...' }
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
// ElevenLabs TTS
// ---------------------------------------------------------------------------
async function generateAudio(text, voiceId, apiKey, model) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const body = {
    text,
    model_id: model,
    voice_settings: {
      stability: 0.45,          // more expressive / energetic
      similarity_boost: 0.80,   // high fidelity to voice
      style: 0.35,              // some style exaggeration for Ash's energy
      use_speaker_boost: true,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs API ${res.status}: ${errText}`);
  }

  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const opts = parseArgs();
  const allLines = extractLines();

  console.log(`Found ${allLines.length} voice lines in ash-lines.ts\n`);

  // Filter by category if --only specified
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

  // Dry run — just print what would be generated
  if (opts.dryRun) {
    console.log('DRY RUN — would generate:\n');
    for (const line of lines) {
      console.log(`  [${line.category}] ${line.file} — "${line.text}"`);
    }
    console.log(`\nTotal: ${lines.length} files`);
    return;
  }

  // Validate required args
  if (!opts.apiKey) {
    console.error('ERROR: --api-key or ELEVENLABS_API_KEY env var is required.');
    process.exit(1);
  }
  if (!opts.voiceId) {
    console.error('ERROR: --voice-id or ELEVENLABS_VOICE_ID env var is required.');
    process.exit(1);
  }

  // Ensure output directory exists
  await mkdir(OUTPUT_DIR, { recursive: true });

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const outPath = resolve(OUTPUT_DIR, line.file);
    const progress = `[${i + 1}/${lines.length}]`;

    // Skip existing if requested
    if (opts.skipExisting && existsSync(outPath)) {
      console.log(`  ${progress} SKIP ${line.file} (exists)`);
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`  ${progress} ${line.file} ... `);
      const mp3Buf = await generateAudio(line.text, opts.voiceId, opts.apiKey, opts.model);
      await writeFile(outPath, mp3Buf);
      console.log(`OK (${(mp3Buf.length / 1024).toFixed(1)} KB)`);
      success++;

      // Small delay to stay within rate limits (free tier: ~2 req/s)
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.log(`FAIL — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone! ${success} generated, ${skipped} skipped, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
