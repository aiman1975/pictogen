// Generates the voice narration for the 7 showcase scenes with the OS voice engine (see tts.js).
// Usage: node scripts/generate-showcase-audio.js [outDir]   (default: public/audio)
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHOWCASE_SCENES } from '../src/showcase.js';
import { speakToWav, ttsEngine } from './tts.js';

const outDir = resolve(process.argv[2] || fileURLToPath(new URL('../public/audio', import.meta.url)));
mkdirSync(outDir, { recursive: true });

console.log(`Generating voice narration for ${SHOWCASE_SCENES.length} showcase scenes with ${ttsEngine() ?? 'no TTS engine'}...`);

try {
  for (const sc of SHOWCASE_SCENES) {
    const file = resolve(outDir, `showcase-${sc.num}.wav`);
    speakToWav(sc.narration, file);
    console.log(`  - Scene ${sc.num}: ${file} (${Math.round(statSync(file).size / 1024)} KB)`);
  }
  console.log('✓ SUCCESS: all showcase narration files generated');
} catch (err) {
  console.error('Error generating showcase audio:', err.message);
  process.exit(1);
}
