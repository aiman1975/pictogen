// Video export for the studio: renders an animated PictoGen SVG frame by frame and encodes it as
// an animated GIF or a video (MP4 where the browser can record it, otherwise WebM).
//
// Frames are exact, not a screen recording: every CSS animation in the SVG is paused and set to the
// frame's time, the resulting state (transform, opacity, fill-opacity) is copied onto a still copy of the SVG, and
// that copy is drawn to a canvas. Clips (several scenes with captions) are rendered scene by scene.
// Videos carry the scenes' sound (voices and effects) and a clip's music (public/js/scene-sound.js),
// rendered ahead.

import { encodeGif } from './gif-encoder.js';
import { soundOf, renderClipSound } from './scene-sound.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// The studio's own font (public/fonts, inlined), put into every frame: an SVG drawn as a picture
// can't use the page's fonts, and words on cards, boards and bubbles should look as they do in
// the studio, not in whatever font the computer has
let fontRules = null;
async function frameFonts() {
  if (fontRules !== null) return fontRules;
  try {
    const base = new URL('../fonts/', import.meta.url);
    const css = await (await fetch(new URL('fonts.css', base))).text();
    // (the studio's font, and its Arabic one)
    const rules = (css.match(/@font-face\s*\{[^}]*\}/g) || []).filter((r) => r.includes("'Nunito'") || r.includes("'Baloo Bhaijaan 2'"));
    const out = [];
    for (const r of rules) {
      const file = /url\(([\w.-]+\.woff2)\)/.exec(r);
      if (!file) continue;
      const bytes = new Uint8Array(await (await fetch(new URL(file[1], base))).arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      out.push(r.replace(file[0], `url(data:font/woff2;base64,${btoa(bin)})`).replace(/font-display:[^;]*;/, ''));
    }
    fontRules = out.join('\n');
  } catch {
    fontRules = '';
  }
  return fontRules;
}

const loadImage = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Could not draw a frame of the SVG'));
  img.src = url;
});

const svgSize = (svg) => {
  const vb = svg.viewBox && svg.viewBox.baseVal;
  return vb && vb.width ? { width: vb.width, height: vb.height } : { width: svg.width.baseVal.value, height: svg.height.baseVal.value };
};

/**
 * Renders `duration` seconds of an animated SVG element (it must be in the document, not hidden)
 * at `fps` frames per second into `ctx` and calls onFrame(i) after each one is drawn.
 * Drawing goes into the box (x, y, w, h) of the canvas; afterwards the animations play on. With
 * `start`, the first frame is that many seconds in.
 */
export async function renderFrames(svg, { duration, fps, ctx, box, onFrame, start = 0 }) {
  const { width, height } = svgSize(svg);
  const fonts = await frameFonts();
  const animations = svg.getAnimations({ subtree: true });
  // Which properties each element's animations change (only those are copied onto the still)
  const animated = new Map();
  for (const a of animations) {
    const el = a.effect && a.effect.target;
    if (!el) continue;
    const props = animated.get(el) || new Set();
    for (const k of a.effect.getKeyframes()) for (const prop of ['transform', 'opacity', 'fillOpacity']) if (prop in k) props.add(prop);
    animated.set(el, props);
  }
  const targets = [...animated.keys()];
  const all = [...svg.querySelectorAll('*')];
  const slots = targets.map((el) => all.indexOf(el));
  const wasRunning = animations.map((a) => a.playState === 'running');
  animations.forEach((a) => a.pause());
  const n = Math.max(1, Math.round(duration * fps));
  try {
    for (let i = 0; i < n; i++) {
      const ms = (start + i / fps) * 1000;
      animations.forEach((a) => { a.currentTime = ms; });
      // A still copy carrying this moment's animated values
      const still = svg.cloneNode(true);
      const copies = [...still.querySelectorAll('*')];
      targets.forEach((el, j) => {
        const cs = getComputedStyle(el);
        const copy = copies[slots[j]];
        if (!copy) return;
        for (const prop of animated.get(el)) copy.style[prop] = cs[prop];
      });
      still.querySelectorAll('.pg-hit').forEach((el) => el.remove());
      const freeze = document.createElementNS(SVG_NS, 'style');
      freeze.textContent = `${fonts}\n*{animation:none!important;transition:none!important}`;
      still.appendChild(freeze);
      still.setAttribute('width', width);
      still.setAttribute('height', height);
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(still)], { type: 'image/svg+xml' }));
      try {
        const img = await loadImage(url);
        ctx.drawImage(img, box.x, box.y, box.w, box.h);
      } finally {
        URL.revokeObjectURL(url);
      }
      await onFrame(i, n);
    }
  } finally {
    animations.forEach((a, k) => (wasRunning[k] ? a.play() : null));
  }
}

/**
 * The best video format this browser can record: MP4/H.264 plays everywhere (Chrome, Edge, Safari
 * record it); otherwise WebM; MP4 with other codecs (VP9) last, as QuickTime and iOS can't play it.
 */
export function videoFormat({ audio = false } = {}) {
  const types = audio
    ? ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
    : ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  const type = typeof MediaRecorder !== 'undefined' && types.find((t) => MediaRecorder.isTypeSupported(t));
  return type ? { type, ext: type.startsWith('video/mp4') ? 'mp4' : 'webm' } : null;
}

/**
 * A MediaRecorder fed frame by frame, in chunks: play(frames) shows a chunk of frames (ImageBitmaps
 * or canvases of equal size) at an exact frame rate, then pauses the recording - and the sound with
 * it - until the next chunk is ready; finish() returns the video Blob. So a long clip never needs
 * all its frames in memory at once (at 1280x720 a frame is ~3.7 MB: three minutes would be ~20 GB).
 * audio: an AudioBuffer played alongside (paused and resumed with the recording), or null.
 */
export async function openRecorder({ fps, width, height, bitrate = 8e6, audio = null }) {
  const format = videoFormat({ audio: !!audio });
  if (!format) throw new Error('This browser cannot record video (no MediaRecorder support)');
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0];
  // The sound goes in as a second track; each chunk plays its own slice of it as its frames play
  // (the audio never pauses: only the recorder does, between chunks)
  let actx = null, dest = null;
  if (audio) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') await actx.resume().catch(() => {});
    dest = actx.createMediaStreamDestination();
    stream.addTrack(dest.stream.getAudioTracks()[0]);
  }
  const recorder = new MediaRecorder(stream, { mimeType: format.type, videoBitsPerSecond: bitrate });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise((resolve) => { recorder.onstop = resolve; });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let started = false, played = 0; // (frames recorded so far)
  return {
    /** Records `frames` at the frame rate; `last`: the clip's final chunk (no pause after it) */
    async play(frames, last = false) {
      if (!frames.length) return;
      ctx.drawImage(frames[0], 0, 0);
      if (!started) { recorder.start(); started = true; } else recorder.resume();
      if (audio) {
        const src = actx.createBufferSource();
        src.buffer = audio;
        src.connect(dest);
        const from = played / fps;
        if (from < audio.duration) src.start(actx.currentTime, from, Math.min(frames.length / fps, audio.duration - from));
      }
      const t0 = performance.now();
      for (let i = 0; i < frames.length; i++) {
        const wait = t0 + (i * 1000) / fps - performance.now();
        if (wait > 0) await sleep(wait);
        ctx.drawImage(frames[i], 0, 0);
        if (track.requestFrame) track.requestFrame();
      }
      played += frames.length;
      // (the chunk's last frame keeps its frame time; then, unless it is the end, all waits for the next)
      await sleep(Math.max(0, t0 + (frames.length * 1000) / fps - performance.now()));
      if (!last) recorder.pause();
    },
    async finish() {
      if (started) {
        if (recorder.state === 'paused') { recorder.resume(); if (track.requestFrame) track.requestFrame(); await sleep(1000 / fps); }
        recorder.stop();
        await stopped;
      }
      stream.getTracks().forEach((t) => t.stop());
      if (actx) actx.close().catch(() => {});
      return new Blob(chunks, { type: format.type.split(';')[0] });
    },
  };
}

/** Plays pre-rendered frames into a MediaRecorder at an exact frame rate and returns the video Blob. */
export async function recordFrames(frames, { fps, width, height, bitrate = 8e6, audio = null }) {
  const rec = await openRecorder({ fps, width, height, bitrate, audio });
  await rec.play(frames, true);
  return rec.finish();
}

// ---------------------------------------------------------------------------------------------
// Captions and title cards for clips, drawn straight onto the canvas

const GENRE_COLORS = { news: '#dc2626', documentary: '#0284c7', howto: '#10b981', kids: '#f59e0b' };

function wrap(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Layout of a scene's lower-third caption: its height and wrapped lines. */
function captionLayout(ctx, scene, W, H) {
  const u = Math.min(W, H) / 360; // type scale
  const pad = 14 * u;
  ctx.font = `700 ${15 * u}px Nunito, system-ui, sans-serif`;
  const lines = wrap(ctx, scene.caption, W - pad * 4).slice(0, 3);
  const head = scene.headline ? 20 * u : 0;
  const tag = scene.tag ? 20 * u : 0;
  return { u, pad, lines, head, tag, boxH: pad * 2 + tag + head + lines.length * 20 * u };
}

function drawCaption(ctx, scene, genre, W, H) {
  const { u, pad, lines, head, tag, boxH } = captionLayout(ctx, scene, W, H);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
  ctx.fillRect(0, H - boxH, W, boxH);
  let y = H - boxH + pad;
  if (scene.tag) {
    ctx.font = `900 ${11 * u}px Nunito, system-ui, sans-serif`;
    const tw = ctx.measureText(scene.tag.toUpperCase()).width + 12 * u;
    ctx.fillStyle = GENRE_COLORS[genre] || GENRE_COLORS.kids;
    ctx.fillRect(pad, y, tw, 16 * u);
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(scene.tag.toUpperCase(), pad + 6 * u, y + 8.5 * u);
    y += tag;
  }
  ctx.textBaseline = 'top';
  if (scene.headline) {
    ctx.font = `900 ${16 * u}px Nunito, system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(scene.headline, pad, y, W - pad * 2);
    y += head;
  }
  ctx.font = `700 ${15 * u}px Nunito, system-ui, sans-serif`;
  ctx.fillStyle = '#e2e8f0';
  for (const l of lines) { ctx.fillText(l, pad, y); y += 20 * u; }
}

function drawTitleCard(ctx, title, genre, W, H) {
  const u = Math.min(W, H) / 360;
  ctx.fillStyle = '#0b0f19';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = GENRE_COLORS[genre] || GENRE_COLORS.kids;
  ctx.fillRect(W / 2 - 40 * u, H / 2 + 26 * u, 80 * u, 5 * u);
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${28 * u}px Nunito, system-ui, sans-serif`;
  wrap(ctx, title, W * 0.85).slice(0, 2).forEach((l, i, arr) => ctx.fillText(l, W / 2, H / 2 - (arr.length - 1 - i) * 34 * u));
  ctx.textAlign = 'left';
}

// ---------------------------------------------------------------------------------------------
// Public entry points used by the studio

/**
 * Renders a clip into frames. `shots` is a list of { svg (element in the document), duration,
 * scene?: { caption, tag, headline } }; with `title`, a title card comes first.
 * format 'gif' -> ImageData frames at 1x; 'video' -> ImageBitmaps at `scale`.
 */
export async function renderShots(shots, { fps, scale, format, title, genre, onProgress, sink, chunk = 90, transition = 'fade' }) {
  const { width, height } = svgSize(shots[0].svg);
  const W = Math.round(width * scale), H = Math.round(height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const frames = [];
  let done = 0;
  // (with a sink - a video's recorder - frames go to it every `chunk` frames and are let go)
  const flush = async (last = false) => {
    if (!sink || !frames.length) return;
    await sink(frames, last);
    frames.forEach((f) => f.close && f.close());
    frames.length = 0;
  };
  const grab = async () => {
    frames.push(format === 'gif' ? ctx.getImageData(0, 0, W, H).data : await createImageBitmap(canvas));
    done++;
    if (sink && frames.length >= chunk) await flush();
  };
  const total = Math.round((title ? 1.5 : 0) * fps) + shots.reduce((s, sh) => s + Math.max(1, Math.round(sh.duration * fps)), 0);
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  // A cross-fade into each scene: its first frames drawn over the last frame of the one before,
  // more and more (the clip keeps its length: the fade is the new scene's start)
  const fade = transition === 'cut' ? 0 : Math.round(0.4 * fps);
  const canvasOf = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const prev = fade ? canvasOf() : null, now = fade ? canvasOf() : null;
  let hasPrev = false;
  const keep = () => { if (prev) { prev.getContext('2d').drawImage(canvas, 0, 0); hasPrev = true; } };
  const blend = (i) => {
    if (!hasPrev || i >= fade) return;
    now.getContext('2d').drawImage(canvas, 0, 0);
    ctx.drawImage(prev, 0, 0);
    ctx.globalAlpha = (i + 1) / (fade + 1);
    ctx.drawImage(now, 0, 0);
    ctx.globalAlpha = 1;
  };
  if (title) {
    drawTitleCard(ctx, title, genre, W, H);
    for (let i = 0; i < Math.round(1.5 * fps); i++) { await grab(); onProgress && onProgress(done / total); }
    keep();
  }
  for (const shot of shots) {
    // With a caption, the picture moves up by most of the caption's height (cropping empty sky),
    // so the characters standing near the bottom are not hidden behind it
    const captioned = shot.scene && (shot.scene.caption || shot.scene.headline);
    let lift = captioned ? Math.round(captionLayout(ctx, shot.scene, W, H).boxH * 0.8) : 0;
    // (but never so far that a classroom's board, or a room's window and clock, lose their tops)
    // (a board with words: its words are what must show, the frame above them may go)
    const top = lift && (shot.svg.querySelector('.pg-board text') || shot.svg.querySelector('.pg-board') || shot.svg.querySelector('.pg-place-office, .pg-place-room, .pg-place-kitchen, .pg-place-bedroom, .pg-place-classroom, .pg-place-sketch'));
    if (top) {
      try { lift = Math.max(0, Math.min(lift, Math.floor(top.getBBox().y * (H / svgSize(shot.svg).height)) - Math.round(H * 0.02))); } catch { /* not measurable */ }
    }
    await renderFrames(shot.svg, {
      duration: shot.duration, fps, ctx, box: { x: 0, y: -lift, w: W, h: H },
      onFrame: async (i, n) => {
        if (captioned) drawCaption(ctx, shot.scene, genre, W, H);
        blend(i);
        await grab();
        if (i === n - 1) keep();
        onProgress && onProgress(done / total);
      },
    });
  }
  await flush(true);
  return { frames, width: W, height: H };
}

/** Animated GIF of the shots -> Blob (image/gif). */
export async function exportGif(shots, { fps = 15, title, genre, transition, onProgress } = {}) {
  const { frames, width, height } = await renderShots(shots, { fps, scale: 1, format: 'gif', title, genre, transition, onProgress: (p) => onProgress && onProgress(p * 0.8) });
  // GIF delays are whole hundredths of a second: alternate them (7, 7, 6... at 15 fps) to keep exact time
  const bytes = encodeGif(frames, { width, height, delayCs: (i) => Math.round(((i + 1) * 100) / fps) - Math.round((i * 100) / fps) });
  onProgress && onProgress(1);
  return new Blob([bytes], { type: 'image/gif' });
}

/**
 * The shots' sound as one AudioBuffer, each scene's from where it starts in the video (after the
 * title card), or null when there is nothing to hear.
 */
export async function clipSound(shots, { fps = 30, title, music = null, genre } = {}) {
  let at = title ? Math.round(1.5 * fps) / fps : 0;
  const parts = shots.map((sh) => {
    const duration = Math.max(1, Math.round(sh.duration * fps)) / fps;
    const part = { sound: soundOf(sh.svg), at, duration };
    at += duration;
    return part;
  });
  return renderClipSound(parts, at + 0.1, { music, ...(genre ? { genre } : {}) });
}

/**
 * Video (MP4 or WebM, whatever this browser records) of the shots -> Blob; recording runs in real
 * time. sound: with the scenes' voices and effects (default true); music: with the genre's
 * background music under it (default false); transition: 'fade' (a short cross-fade into each
 * scene, the default) or 'cut'.
 */
export async function exportVideo(shots, { fps = 30, scale = 2, title, genre, tune, sound = true, music = false, transition, onProgress } = {}) {
  // The sound first (it needs only the scenes and their lengths), then the frames, drawn and
  // recorded a few seconds at a time
  const audio = sound || music
    ? await clipSound(sound ? shots : shots.map((sh) => ({ ...sh, svg: null })), { fps, title, genre, music: music ? { genre: tune || genre || 'kids' } : null }).catch(() => null)
    : null;
  const { width, height } = svgSize(shots[0].svg);
  const rec = await openRecorder({ fps, width: Math.round(width * scale), height: Math.round(height * scale), audio });
  try {
    await renderShots(shots, { fps, scale, format: 'video', title, genre, transition, onProgress, sink: (frames, last) => rec.play(frames, last), chunk: Math.round(fps * 3) });
  } catch (e) {
    await rec.finish().catch(() => null);
    throw e;
  }
  return rec.finish();
}

/** Puts SVG markup into an off-screen (but rendered, so it animates) box and returns the <svg> element. */
export function mountOffscreen(markup) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-20000px;top:0;pointer-events:none;';
  host.innerHTML = markup;
  document.body.appendChild(host);
  const svg = host.querySelector('svg');
  return { svg, remove: () => host.remove() };
}

/** Saves a Blob as a file. */
export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
