#!/usr/bin/env node
// Builds the PictoGen promo video:  node scripts/promo/build.js [out-dir]   (default: out/promo)
//
// 1. films the real studio (capture-studio.js), 2. lays out the slides (storyboard.js) on one page
// (page.js), 3. renders every frame by seeking that page in Chromium, 4. synthesizes the music and
// sound effects (audio.js), 5. puts it together with ffmpeg as an MP4 (H.264, AAC).
// Needs Playwright (Chromium) and ffmpeg; nothing else. Every picture is drawn by PictoGen.
//   --preview "t1,t2,..."   only render these moments (seconds) as preview-<t>.jpg, no video
//   --reuse-studio          use the studio frames filmed by an earlier build
import { execFileSync, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, rmSync, writeFileSync, copyFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { captureStudio } from './capture-studio.js';
import { buildStoryboard } from './storyboard.js';
import { promoPage } from './page.js';
import { renderAudio } from './audio.js';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i < 0 ? null : args.splice(i, name === '--preview' ? 2 : 1).slice(1)[0] ?? true; };
const preview = flag('--preview');
const reuse = flag('--reuse-studio');
const OUT = resolve(args[0] || join(ROOT, 'out', 'promo'));
const FPS = 30, WORKERS = 3;

let chromium;
try {
  const req = createRequire(import.meta.url);
  try { ({ chromium } = req('playwright')); } catch { ({ chromium } = req(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright'))); }
} catch {
  console.error('The promo needs Playwright (npm i -g playwright) and ffmpeg.');
  process.exit(1);
}

const t0 = Date.now();
const log = (msg) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0).padStart(3)}s] ${msg}`);
mkdirSync(OUT, { recursive: true });

const studioJson = join(OUT, 'studio', 'studio.json');
let studio;
if (reuse && existsSync(studioJson)) studio = JSON.parse(readFileSync(studioJson, 'utf8'));
else {
  log('Filming the studio');
  studio = await captureStudio(chromium, join(OUT, 'studio'), ROOT);
  writeFileSync(studioJson, JSON.stringify(studio));
}

log('Laying out the slides');
const board = buildStoryboard({ studio });
copyFileSync(join(ROOT, 'public/fonts/nunito-latin.woff2'), join(OUT, 'nunito.woff2'));
writeFileSync(join(OUT, 'promo.html'), promoPage(board, { fontUrl: 'nunito.woff2' }));
log(`${board.slides.length} slides, ${board.duration.toFixed(1)}s`);

if (preview) {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(pathToFileURL(join(OUT, 'promo.html')).href);
  await page.evaluate(() => document.fonts.ready);
  const times = preview === 'slides' ? board.slides.map((s) => +(s.start + s.dur * 0.62).toFixed(2)) : String(preview).split(',').map(Number);
  for (const t of times) {
    await page.evaluate((t) => window.seek(t), t);
    await page.screenshot({ path: join(OUT, `preview-${t}.jpg`), type: 'jpeg', quality: 85 });
  }
  await b.close();
  log(`Previews: ${times.join(', ')}`);
  process.exit(0);
}

log('Rendering frames');
const frames = join(OUT, 'frames');
rmSync(frames, { recursive: true, force: true });
mkdirSync(frames);
const total = Math.ceil(board.duration * FPS);
const browser = await chromium.launch();
let done = 0;
await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(pathToFileURL(join(OUT, 'promo.html')).href);
  await page.evaluate(() => document.fonts.ready);
  const from = Math.floor((total * w) / WORKERS), to = Math.floor((total * (w + 1)) / WORKERS);
  for (let i = from; i < to; i++) {
    await page.evaluate((t) => window.seek(t), i / FPS);
    await page.screenshot({ path: join(frames, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 93 });
    if (++done % 300 === 0) log(`  ${done}/${total} frames`);
  }
  if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
  await page.close();
}));
await browser.close();

log('Synthesizing music and sound effects');
const slide = (id) => board.slides.find((s) => s.id === id);
writeFileSync(join(OUT, 'audio.wav'), renderAudio({
  duration: board.duration,
  events: board.sfx,
  groove: [slide('typing').start, slide('outro').start],
  outro: slide('outro').start,
}));

log('Encoding the video');
const mp4 = join(OUT, 'pictogen-promo.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(frames, 'f%05d.jpg'), '-i', join(OUT, 'audio.wav'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', mp4]);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(slide('styles').start + 3), '-i', mp4, '-frames:v', '1', join(OUT, 'poster.jpg')]);
log(`Done: ${mp4}`);
