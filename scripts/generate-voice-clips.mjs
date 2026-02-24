// Generate Ash Ketchum voice clips using Microsoft Edge TTS
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { rename, mkdir, rm } from 'fs/promises';

const OUTPUT_DIR = './public/audio/voice';
const VOICE = 'en-US-ChristopherNeural';

const CLIPS = [
  { key: 'ash-welcome',       text: 'Welcome to Mega Charizard Academy!' },
  { key: 'ash-i-choose-you',  text: 'I choose you!' },
  { key: 'ash-great-job',     text: 'Great job!' },
  { key: 'ash-awesome',       text: 'Awesome!' },
  { key: 'ash-alright',       text: 'Alright!' },
  { key: 'ash-yeah',          text: 'Yeah!' },
  { key: 'ash-try-again',     text: 'Try again!' },
  { key: 'ash-not-quite',     text: 'Not quite!' },
  { key: 'ash-owen-turn',     text: "Owen's turn!" },
  { key: 'ash-kian-turn',     text: "Kian's turn!" },
  { key: 'ash-team-turn',     text: 'Team turn!' },
  { key: 'ash-power-gem',     text: 'Power gem!' },
  { key: 'ash-find-color',    text: 'Find the color!' },
  { key: 'ash-count-them',    text: 'Count them!' },
  { key: 'ash-match-shape',   text: 'Match the shape!' },
  { key: 'ash-trace-letter',  text: 'Trace the letter!' },
  { key: 'ash-amazing',       text: 'Amazing!' },
  { key: 'ash-lets-go',       text: "Let's go!" },
  { key: 'ash-ready',         text: 'Ready!' },
];

async function main() {
  // toFile needs an existing directory — it creates audio.mp3 inside it
  const tmpDir = `${OUTPUT_DIR}/_tts_tmp`;

  console.log(`Generating ${CLIPS.length} voice clips...\n`);

  for (const clip of CLIPS) {
    const finalPath = `${OUTPUT_DIR}/${clip.key}.mp3`;

    try {
      // Create fresh temp dir for each clip
      await mkdir(tmpDir, { recursive: true });

      const tts = new MsEdgeTTS();
      await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const result = await tts.toFile(tmpDir, clip.text, { rate: '+30%', pitch: '+15Hz' });

      // Move from tmpDir/audio.mp3 to final location
      await rename(result.audioFilePath, finalPath);
      await rm(tmpDir, { recursive: true, force: true });

      console.log(`  OK ${clip.key}`);
    } catch (err) {
      console.error(`  FAIL ${clip.key}: ${err.message}`);
      try { await rm(tmpDir, { recursive: true, force: true }); } catch {}
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
