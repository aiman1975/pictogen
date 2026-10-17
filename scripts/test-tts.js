// Checks that this machine can synthesize narration audio (see tts.js). Skips when no engine is installed.
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { speakToWav, ttsEngine } from './tts.js';

const engine = ttsEngine();
if (!engine) {
  console.log('- SKIP: no text-to-speech engine installed (Linux: `sudo apt install espeak-ng`)');
  process.exit(0);
}

const dir = mkdtempSync(join(tmpdir(), 'pictogen-tts-'));
try {
  const file = join(dir, 'test.wav');
  speakToWav(`Welcome to PictoGen. It's a zero-dependency "vector" engine running completely offline.`, file);
  const size = statSync(file).size;
  if (size < 1000) throw new Error(`WAV file is only ${size} bytes`);
  console.log(`✓ PASS: ${engine} generated a ${size}-byte WAV file`);
} catch (e) {
  console.error(`✗ FAIL: ${engine}: ${e.message}`);
  process.exitCode = 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
