// Video export: the GIF encoder (checked by decoding its output with an independent decoder), and,
// when Playwright is available, real exports from the studio in headless Chromium (GIF, video, and a
// clip with a title card and captions), checked with ffprobe when it is installed.
import { spawn, spawnSync, execSync } from 'node:child_process';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeGif } from '../public/js/gif-encoder.js';

let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓ PASS' : '✗ FAIL'}: ${msg}`); if (!ok) fails++; };

/** Minimal GIF decoder (independent of the encoder) -> { width, height, loop, frames: [{ delay, rgb }] } */
function decodeGif(bytes) {
  let p = 0;
  const u8 = () => bytes[p++], u16 = () => bytes[p++] | (bytes[p++] << 8);
  const sig = String.fromCharCode(...bytes.slice(0, 6)); p = 6;
  if (sig !== 'GIF89a' && sig !== 'GIF87a') throw new Error('not a GIF');
  const width = u16(), height = u16(), flags = u8(); u8(); u8();
  let global = null;
  if (flags & 0x80) { const n = 3 << ((flags & 7) + 1); global = bytes.slice(p, p + n); p += n; }
  const frames = [];
  let delay = 0, loop = null;
  const subBlocks = () => { const parts = []; for (let n = u8(); n; n = u8()) { parts.push(...bytes.slice(p, p + n)); p += n; } return parts; };
  for (;;) {
    const b = u8();
    if (b === 0x3b) break;
    if (b === 0x21) {
      const label = u8();
      const data = subBlocks();
      if (label === 0xf9) delay = data[1] | (data[2] << 8);
      if (label === 0xff && String.fromCharCode(...data.slice(0, 11)) === 'NETSCAPE2.0') loop = data[12] | (data[13] << 8);
      continue;
    }
    if (b !== 0x2c) throw new Error(`unexpected block 0x${b.toString(16)}`);
    u16(); u16(); const w = u16(), h = u16(), f = u8();
    let table = global;
    if (f & 0x80) { const n = 3 << ((f & 7) + 1); table = bytes.slice(p, p + n); p += n; }
    const minBits = u8();
    const data = subBlocks();
    // LZW decode
    const clear = 1 << minBits, end = clear + 1;
    let size = minBits + 1, dict = [], prev = null, bit = 0;
    const reset = () => { dict = []; for (let i = 0; i < clear; i++) dict[i] = [i]; dict[clear] = []; dict[end] = null; size = minBits + 1; prev = null; };
    reset();
    const out = [];
    for (;;) {
      let code = 0;
      for (let i = 0; i < size; i++, bit++) code |= ((data[bit >> 3] >> (bit & 7)) & 1) << i;
      if (code === clear) { reset(); continue; }
      if (code === end || bit > data.length * 8) break;
      let entry;
      if (code < dict.length && dict[code]) entry = dict[code];
      else if (prev) entry = [...prev, prev[0]];
      else throw new Error('bad LZW code');
      out.push(...entry);
      if (prev) dict.push([...prev, entry[0]]);
      prev = entry;
      if (dict.length === 1 << size && size < 12) size++;
    }
    const rgb = new Uint8Array(w * h * 3);
    for (let i = 0; i < w * h; i++) rgb.set(table.slice(out[i] * 3, out[i] * 3 + 3), i * 3);
    frames.push({ delay, rgb, count: out.length });
  }
  return { width, height, loop, frames };
}

// 1. The encoder
{
  const W = 37, H = 23;
  const frame = (f) => {
    const px = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      const x = i % W, y = Math.floor(i / W);
      const sq = x >= 3 + f * 8 && x < 13 + f * 8 && y > 5 && y < 15;
      px.set(sq ? [229, 57, 53, 255] : y < 10 ? [143, 211, 255, 255] : [139, 195, 74, 255], i * 4);
    }
    return px;
  };
  const frames = [0, 1, 2].map(frame);
  const gif = decodeGif(encodeGif(frames, { width: W, height: H, delayCs: (i) => [7, 7, 6][i] }));
  check(gif.width === W && gif.height === H && gif.frames.length === 3, `GIF has the right size and frame count (${gif.width}x${gif.height}, ${gif.frames.length} frames)`);
  check(gif.loop === 0, 'GIF loops forever');
  check(gif.frames.map((f) => f.delay).join() === '7,7,6', `per-frame delays are kept (${gif.frames.map((f) => f.delay)})`);
  const exact = gif.frames.every((f, k) => f.count === W * H && f.rgb.every((v, i) => v === frames[k][Math.floor(i / 3) * 4 + (i % 3)]));
  check(exact, 'flat-colour frames decode pixel-exact');

  // More than 256 colours (a smooth gradient): every pixel maps to a near colour
  const grad = new Uint8ClampedArray(256 * 64 * 4);
  for (let i = 0; i < 256 * 64; i++) grad.set([i % 256, Math.floor(i / 256) * 4, 255 - (i % 256), 255], i * 4);
  const g = decodeGif(encodeGif([grad], { width: 256, height: 64 })).frames[0].rgb;
  let err = 0;
  for (let i = 0; i < 256 * 64; i++) for (let c = 0; c < 3; c++) err += Math.abs(g[i * 3 + c] - grad[i * 4 + c]);
  const mean = err / (256 * 64 * 3);
  check(mean < 6, `a 16k-colour gradient is reduced to 256 colours with a small mean error (${mean.toFixed(2)})`);

  // Long, varied input exercises the LZW table filling up and clearing
  const noisy = new Uint8ClampedArray(320 * 200 * 4);
  let seed = 7;
  for (let i = 0; i < 320 * 200; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; const v = [0, 85, 170, 255][seed & 3]; noisy.set([v, 255 - v, (v * 3) & 255, 255], i * 4); }
  const n = decodeGif(encodeGif([noisy], { width: 320, height: 200 })).frames[0];
  check(n.count === 320 * 200 && n.rgb.every((v, i) => v === noisy[Math.floor(i / 3) * 4 + (i % 3)]), 'noisy frames survive LZW table resets pixel-exact');
}

// 2. Real exports in a browser (skipped without Playwright)
let chromium = null;
try {
  const req = createRequire(import.meta.url);
  try { ({ chromium } = req('playwright')); } catch { ({ chromium } = req(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright'))); }
} catch { /* not installed */ }

if (!chromium) {
  console.log('- SKIP: browser export checks (Playwright is not installed)');
} else {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const port = await new Promise((done) => { const s = createServer().listen(0, () => { const p = s.address().port; s.close(() => done(p)); }); });
  const server = spawn(process.execPath, ['serve.js'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((done) => server.stdout.on('data', (d) => { if (String(d).includes('running')) done(); }));
  const dir = mkdtempSync(join(tmpdir(), 'pictogen-video-'));
  const ffprobe = spawnSync('ffprobe', ['-version']).status === 0;
  const probe = (file) => JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', file], { encoding: 'utf8' }).stdout);
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
    const input = await page.$('textarea, input[type=text]');
    await input.fill('a boy walks in, then waves, then a dog runs to him');
    await input.press('Enter');
    await page.waitForFunction(() => window.pictogenStudio && window.pictogenStudio.getState().duration && window.pictogenVideo);
    const duration = await page.evaluate(() => window.pictogenStudio.getState().duration);

    // GIF of the timeline scene: the boy walks in from the left during the first second or so
    const gifBytes = await page.evaluate(async () => {
      const svg = window.pictogenStudio.getSvgElement();
      const blob = await window.pictogenVideo.exportGif([{ svg, duration: window.pictogenStudio.getState().duration }], { fps: 10 });
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    });
    const gif = decodeGif(Uint8Array.from(gifBytes));
    check(gif.width === 640 && gif.height === 360 && gif.frames.length === Math.round(duration * 10), `scene GIF: 640x360, ${gif.frames.length} frames for ${duration}s at 10 fps`);
    const totalCs = gif.frames.reduce((s, f) => s + f.delay, 0);
    check(Math.abs(totalCs / 100 - gif.frames.length / 10) < 0.02, `GIF plays for its full length (${totalCs / 100}s)`);
    const shirtX = (f) => { // mean x of the boy's blue shirt pixels
      let sx = 0, n = 0;
      for (let i = 0; i < 640 * 360; i++) {
        const [r, g, b] = [f.rgb[i * 3], f.rgb[i * 3 + 1], f.rgb[i * 3 + 2]];
        if (Math.abs(r - 30) < 20 && Math.abs(g - 136) < 20 && Math.abs(b - 229) < 20) { sx += i % 640; n++; }
      }
      return n > 30 ? sx / n : null;
    };
    const xs = [5, 9, 13].map((i) => shirtX(gif.frames[i]));
    check(xs.every((x) => x !== null) && xs[0] < xs[1] && xs[1] <= xs[2] + 1, `the boy walks in across the GIF frames (shirt at x=${xs.map((x) => x && x.toFixed(0))})`);

    // Video of the scene: right size and length
    const vid = await page.evaluate(async () => {
      const svg = window.pictogenStudio.getSvgElement();
      const blob = await window.pictogenVideo.exportVideo([{ svg, duration: 2 }], { fps: 20 });
      return { type: blob.type, bytes: Array.from(new Uint8Array(await blob.arrayBuffer())) };
    });
    check(/^video\/(webm|mp4)$/.test(vid.type) && vid.bytes.length > 10000, `scene video: ${vid.type}, ${Math.round(vid.bytes.length / 1024)} KB`);
    const vfile = join(dir, `scene.${vid.type.endsWith('mp4') ? 'mp4' : 'webm'}`);
    writeFileSync(vfile, Buffer.from(vid.bytes));
    if (ffprobe) {
      const info = probe(vfile);
      const d = +info.format.duration;
      check(info.streams[0].width === 1280 && info.streams[0].height === 720 && Math.abs(d - 2) < 0.4, `video is 1280x720 and lasts ~2s (${info.streams[0].width}x${info.streams[0].height}, ${d.toFixed(2)}s)`);
    }

    // A clip: title card + two short captioned scenes, as Clip Studio exports it
    const clip = await page.evaluate(async () => {
      const res = await fetch('/api/story/generate', { method: 'POST', body: JSON.stringify({ text: 'a boy waving | Hello!\na dog jumping | And a dog.' }) });
      const story = await res.json();
      const mounted = story.scenes.map((sc) => window.pictogenVideo.mountOffscreen(sc.svg));
      try {
        const shots = story.scenes.map((sc, i) => ({ svg: mounted[i].svg, duration: 1.2, scene: sc }));
        const blob = await window.pictogenVideo.exportVideo(shots, { fps: 20, title: story.title, genre: story.genre });
        return { type: blob.type, bytes: Array.from(new Uint8Array(await blob.arrayBuffer())), scenes: story.scenes.length };
      } finally { mounted.forEach((m) => m.remove()); }
    });
    const cfile = join(dir, `clip.${clip.type.endsWith('mp4') ? 'mp4' : 'webm'}`);
    writeFileSync(cfile, Buffer.from(clip.bytes));
    if (ffprobe) {
      const d = +probe(cfile).format.duration;
      const want = 1.5 + clip.scenes * 1.2;
      check(Math.abs(d - want) < 0.5, `clip video = title card + ${clip.scenes} scenes (${d.toFixed(2)}s, expected ~${want}s)`);
    } else check(clip.bytes.length > 10000, 'clip video was recorded');
    check(!errors.length, `no page errors during export${errors.length ? ': ' + errors.join('; ') : ''}`);
  } finally {
    if (browser) await browser.close();
    server.kill();
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(fails ? `\n${fails} video check(s) failed` : '\nVideo Export test suite: ALL PASSED!');
process.exit(fails ? 1 : 0);
