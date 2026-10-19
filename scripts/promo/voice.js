#!/usr/bin/env node
// Speaks the explainer's lines (narration.js) into media/promo-voice/<id>.mp3 with edge-tts
// (pip install edge-tts; it needs the internet), skipping lines already spoken as they are now.
// Run by .github/workflows/promo-voice.yml; locally: node scripts/promo/voice.js
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NARRATION } from './narration.js';

const DIR = fileURLToPath(new URL('../../media/promo-voice/', import.meta.url));
mkdirSync(DIR, { recursive: true });
let made = 0;
for (const line of NARRATION) {
  const mp3 = join(DIR, `${line.id}.mp3`), meta = join(DIR, `${line.id}.json`);
  const want = { text: line.text, voice: line.voice, rate: line.rate, pitch: line.pitch };
  if (existsSync(mp3) && existsSync(meta) && JSON.stringify(JSON.parse(readFileSync(meta, 'utf8'))) === JSON.stringify(want)) continue;
  const args = ['--voice', line.voice, `--rate=${line.rate}`, `--pitch=${line.pitch}`, '--text', line.text, '--write-media', mp3];
  if (process.env.HTTPS_PROXY) args.push('--proxy', process.env.HTTPS_PROXY);
  const r = spawnSync('edge-tts', args, { stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.status !== 0) { console.error(`Could not speak "${line.id}"`); process.exit(1); }
  writeFileSync(meta, JSON.stringify(want));
  console.log(`spoke ${line.id} (${line.voice})`);
  made++;
}
console.log(made ? `${made} line(s) spoken` : 'every line already spoken');
