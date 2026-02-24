#!/usr/bin/env node
// scripts/generate-ash-edge-tts.mjs
// Generates all Ash Ketchum voice lines using Microsoft Edge TTS.
// No API key needed! Uses the msedge-tts npm package.
//
// Tuned for natural, warm, kid-friendly Ash Ketchum delivery:
//   - Minimal pitch changes (pitch shifts cause robotic sound)
//   - Gentle rate changes (faster = excited, slower = warm)
//   - Volume for emphasis (louder = celebration, softer = encouragement)
//   - Per-line text tweaks: commas for breaths, ellipsis for pauses
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
// Per-category prosody: SUBTLE adjustments only.
//
// Golden rules for natural TTS:
//   1. Pitch: keep within +/-5Hz. Bigger shifts = instant robot voice.
//   2. Rate: keep within +/-10%. Faster sounds energetic, slower sounds warm.
//   3. Volume: the safest way to add intensity. +5% to +10% for emphasis.
//   4. Let punctuation do the work: ! for emphasis, ... for pauses, , for breath
// ---------------------------------------------------------------------------
const CATEGORY_PROSODY = {
  turn:      { rate: '+5%',  pitch: '+3Hz',  volume: '+5%'  },  // Friendly call-out
  color:     { rate: '+3%',  pitch: '+2Hz',  volume: '+3%'  },  // Clear, enthusiastic
  number:    { rate: '+0%',  pitch: '+0Hz',  volume: '+3%'  },  // Steady, educational
  shape:     { rate: '+3%',  pitch: '+2Hz',  volume: '+3%'  },  // Clear, enthusiastic
  letter:    { rate: '-3%',  pitch: '+0Hz',  volume: '+3%'  },  // Slow, clear, educational
  correct:   { rate: '+8%',  pitch: '+5Hz',  volume: '+8%'  },  // Upbeat celebration
  wrong:     { rate: '-5%',  pitch: '-2Hz',  volume: '-5%'  },  // Gentle, warm, soft
  evolution: { rate: '+5%',  pitch: '+5Hz',  volume: '+10%' },  // Dramatic, awestruck
  encourage: { rate: '-3%',  pitch: '+0Hz',  volume: '+0%'  },  // Warm, supportive, steady
  iconic:    { rate: '+5%',  pitch: '+3Hz',  volume: '+5%'  },  // Signature Ash energy
};

const DEFAULT_PROSODY = { rate: '+0%', pitch: '+0Hz', volume: '+3%' };

// ---------------------------------------------------------------------------
// Per-line text overrides for more natural delivery.
// Adds pauses (,), emphasis (!), and breathing space (...) where raw text
// from ash-lines.ts would otherwise be spoken too flatly.
// If a line isn't here, the original text is used as-is.
// ---------------------------------------------------------------------------
const TEXT_OVERRIDES = {
  // Turn calls — add a beat after the name
  'turn-owen-1': "Owen! ... It's your turn! Let's GO!",
  'turn-owen-2': "Owen! ... Show me what you got!",
  'turn-owen-3': "Your turn, Owen! ... I believe in you!",
  'turn-kian-1': "Kian! ... You're up! Let's GO!",
  'turn-kian-2': "Kian! ... Show me what you got!",
  'turn-kian-3': "Your turn, Kian! ... Let's do this!",

  // Correct — breathe between exclamations
  'correct-1': "YEAH! ... That's it!",
  'correct-4': "Alright!",
  'correct-5': "Amazing work!",
  'correct-8': "Now THAT'S, a trainer!",

  // Wrong — slow, gentle pacing with pauses
  'wrong-1': "Not quite... Try again!",
  'wrong-2': "Almost! ... Keep looking!",
  'wrong-3': "Hmm... not that one!",
  'wrong-4': "Try, the other one!",

  // Evolution — dramatic pauses for buildup
  'evo-1': "Wait... something's happening!",
  'evo-2': "IT'S... EVOLVING!!",
  'evo-charmeleon': "CHARMELEON!! ... We're getting stronger!",
  'evo-charizard': "CHARIZARD!! ... I CHOOSE YOU!!",
  'evo-mega': "MEGA EVOLUTION!! ... MEGA CHARIZARD X!!!",
  'evo-power': "I can feel... the power!!",

  // Encouragement — warm, measured, with pauses
  'enc-1': "Don't give up!",
  'enc-2': "I believe, in you!",
  'enc-4': "We never give up! ... That's our way!",
  'enc-5': "Keep trying, trainer!",

  // Iconic — signature lines, let them breathe
  'iconic-2': "Let's win this, together!",
  'iconic-3': "This, is just the beginning!",
  'iconic-4': "We're gonna be, the very best!",

  // Timeout/session — calm and kind
  'timeout-start': "Charizard... needs a rest.",
  'timeout-end': "Welcome back, trainers! ... Let's be good this time!",
  'session-end': "Great training, today!",
  'daily-limit': "Charizard gave it everything today! ... See you tomorrow!",

  // Letters — slow down between letter and word
  'letter-c': "What letter is this? ... C! ... C, for Charizard!",
  'letter-f': "What letter is this? ... F! ... F, for Fire!",
  'letter-s': "What letter is this? ... S! ... S, for Star!",
  'letter-b': "What letter is this? ... B! ... B, for Blue!",

  // Phonics — clear pause before the sound
  'phonics-c': "What sound does C make? ... Cuh!",
  'phonics-f': "What sound does F make? ... Fff!",
  'phonics-s': "What sound does S make? ... Sss!",
  'phonics-b': "What sound does B make? ... Buh!",
};

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
  console.log(`Voice: ${opts.voice}`);
  console.log(`Text overrides: ${Object.keys(TEXT_OVERRIDES).length} lines\n`);

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
      const text = TEXT_OVERRIDES[line.id] || line.text;
      const overridden = TEXT_OVERRIDES[line.id] ? ' *' : '';
      console.log(`  [${line.category}] ${line.file}${overridden}`);
      console.log(`    "${text}"  (rate:${p.rate} pitch:${p.pitch} vol:${p.volume})`);
    }
    console.log(`\nTotal: ${lines.length} files (* = text override for pacing)`);
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

    const prosody = CATEGORY_PROSODY[line.category] || DEFAULT_PROSODY;
    const text = TEXT_OVERRIDES[line.id] || line.text;

    try {
      process.stdout.write(`  ${progress} ${line.file} ... `);

      await mkdir(tmpDir, { recursive: true });

      const tts = new MsEdgeTTS();
      await tts.setMetadata(opts.voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      const result = await tts.toFile(tmpDir, text, {
        rate: prosody.rate,
        pitch: prosody.pitch,
        volume: prosody.volume,
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
