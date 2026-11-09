#!/usr/bin/env node
// Builds the Toonaro promo video:  node scripts/promo/build.js [out-dir]   (default: out/promo)
//
// 1. films the real studio (capture-studio.js), 2. lays out the slides (storyboard.js) on one page
// (page.js), 3. renders every frame by seeking that page in Chromium, 4. synthesizes the music and
// sound effects (audio.js), 5. puts it together with ffmpeg as an MP4 (H.264, AAC).
// Needs Playwright (Chromium) and ffmpeg; nothing else. Every picture is drawn by Toonaro.
//   --preview "t1,t2,..."   only render these moments (seconds) as preview-<t>.jpg, no video
//   --reuse-studio          use the studio frames filmed by an earlier build
//   --video <name>          one of the website's videos (VIDEOS below: music from the sound pack (Lyria) and
//                           captions, no narrator), e.g. --video teachers: out/teachers/toonaro-for-teachers.mp4
//   --hero                  the same as --video hero: "Toonaro in 45 seconds", the landing page's video
//   --explainer             the narrated explainer instead (explainer.js; voices in media/promo-voice,
//                           made by the "Promo voice" workflow): out/explainer/toonaro-explainer.mp4
import { execFileSync, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, rmSync, writeFileSync, copyFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { captureStudio } from './capture-studio.js';
import { buildStoryboard } from './storyboard.js';
import { buildExplainer } from './explainer.js';
import { buildHero } from './hero.js';
import { buildTeachers } from './teachers.js';
import { buildPresentations } from './presentations.js';
import { NARRATION } from './narration.js';
import { promoPage } from './page.js';
import { renderAudio } from './audio.js';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i < 0 ? null : args.splice(i, ['--preview', '--video'].includes(name) ? 2 : 1).slice(1)[0] ?? true; };
const preview = flag('--preview');
const reuse = flag('--reuse-studio');
const explainer = flag('--explainer');
// The website's videos: their slides, their tune from the sound pack (looped to the video's length),
// their file, and the moment for the still shown before they play
const VIDEOS = {
  hero: { build: buildHero, music: 'explainer-1.mp3', file: 'toonaro-in-45-seconds.mp4', poster: ['hintro', 2.4] },
  teachers: { build: buildTeachers, music: 'focus-1.mp3', file: 'toonaro-for-teachers.mp4', poster: ['tintro', 2.2] },
  presentations: { build: buildPresentations, music: 'documentary-1.mp3', file: 'toonaro-for-presentations.mp4', poster: ['pintro', 2.2] },
};
const videoName = flag('--hero') ? 'hero' : flag('--video');
if (videoName && !VIDEOS[videoName]) { console.error(`No video "${videoName}": ${Object.keys(VIDEOS).join(', ')}`); process.exit(1); }
const VIDEO = videoName ? VIDEOS[videoName] : null;
const hero = !!VIDEO;
const OUT = resolve(args[0] || join(ROOT, 'out', videoName || (explainer ? 'explainer' : 'promo')));
const HERO_MUSIC = VIDEO && join(ROOT, 'public', 'audio', 'pack', 'music', VIDEO.music);
const VOICES = join(ROOT, 'media', 'promo-voice');
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
if (hero) studio = null;
else if (reuse && existsSync(studioJson)) studio = JSON.parse(readFileSync(studioJson, 'utf8'));
else {
  log('Filming the studio');
  studio = await captureStudio(chromium, join(OUT, 'studio'), ROOT);
  writeFileSync(studioJson, JSON.stringify(studio));
}

log('Laying out the slides');
// The explainer: each spoken line's length, so every slide lasts as long as what is said over it
const voiceLen = {};
if (explainer) {
  for (const l of NARRATION) {
    const f = join(VOICES, `${l.id}.mp3`);
    if (!existsSync(f)) { if (!preview) { console.error(`No voice for "${l.id}": run the "Promo voice" workflow (Actions), then pull.`); process.exit(1); } continue; }
    voiceLen[l.id] = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim();
  }
}
const board = hero ? VIDEO.build() : explainer ? buildExplainer({ studio, voices: voiceLen }) : buildStoryboard({ studio });
copyFileSync(join(ROOT, 'public/fonts/nunito-latin.woff2'), join(OUT, 'nunito.woff2'));
copyFileSync(join(ROOT, 'public/fonts/baloo-bhaijaan-arabic.woff2'), join(OUT, 'baloo.woff2'));
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

log(hero ? 'Sound effects, and the music from the sound pack' : 'Synthesizing music and sound effects');
const slide = (id) => board.slides.find((s) => s.id === id);
writeFileSync(join(OUT, 'audio.wav'), hero
  ? renderAudio({ duration: board.duration, events: board.sfx, music: false })
  : renderAudio({
    duration: board.duration,
    events: board.sfx,
    groove: [slide('typing').start, slide('outro').start],
    outro: slide('outro').start,
  }));

let soundtrack = join(OUT, 'audio.wav');
if (hero) {
  // The tune loops seamlessly: played twice, cut to the video's length, faded in and out; the
  // effects on top, quieter
  const d = board.duration;
  soundtrack = join(OUT, 'mix.wav');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-stream_loop', '2', '-i', HERO_MUSIC, '-i', join(OUT, 'audio.wav'), '-filter_complex',
    `[0:a]aresample=44100,aformat=channel_layouts=stereo,atrim=0:${d},afade=t=in:d=0.6,afade=t=out:st=${(d - 2.8).toFixed(2)}:d=2.8,volume=0.9[m];[1:a]volume=0.42[fx];[m][fx]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[out]`,
    '-map', '[out]', '-ar', '44100', soundtrack]);
}
if (explainer) {
  // The voices on top, each at its moment; the music and effects duck under them
  log('Mixing in the voices');
  const said = board.voices.filter((v) => existsSync(join(VOICES, `${v.id}.mp3`)));
  const inputs = said.flatMap((v) => ['-i', join(VOICES, `${v.id}.mp3`)]);
  const delays = said.map((v, i) => `[${i + 1}:a]aresample=44100,aformat=channel_layouts=stereo,adelay=${Math.round(v.t * 1000)}|${Math.round(v.t * 1000)},volume=1.6[v${i}]`);
  const filter = [
    ...delays,
    `${said.map((_, i) => `[v${i}]`).join('')}amix=inputs=${said.length}:normalize=0:duration=longest,asplit=2[voice][key]`,
    '[0:a]volume=0.85[bed]',
    '[bed][key]sidechaincompress=threshold=0.02:ratio=6:attack=15:release=450:makeup=1[ducked]',
    '[ducked][voice]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[out]',
  ].join(';');
  soundtrack = join(OUT, 'mix.wav');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(OUT, 'audio.wav'), ...inputs, '-filter_complex', filter, '-map', '[out]', '-ar', '44100', soundtrack]);
}

log('Encoding the video');
const mp4 = join(OUT, hero ? VIDEO.file : explainer ? 'toonaro-explainer.mp4' : 'toonaro-promo.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(frames, 'f%05d.jpg'), '-i', soundtrack,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', mp4]);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(hero ? slide(VIDEO.poster[0]).start + VIDEO.poster[1] : slide(explainer ? 'looks' : 'styles').start + 5), '-i', mp4, '-frames:v', '1', join(OUT, 'poster.jpg')]);
log(`Done: ${mp4}`);
