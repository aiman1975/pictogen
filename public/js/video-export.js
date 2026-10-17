// Video export for the studio: renders an animated PictoGen SVG frame by frame and encodes it as
// an animated GIF or a video (MP4 where the browser can record it, otherwise WebM).
//
// Frames are exact, not a screen recording: every CSS animation in the SVG is paused and set to the
// frame's time, the resulting state (transform, opacity) is copied onto a still copy of the SVG, and
// that copy is drawn to a canvas. Clips (several scenes with captions) are rendered scene by scene.

import { encodeGif } from './gif-encoder.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

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
 * Drawing goes into the box (x, y, w, h) of the canvas; afterwards the animations play on.
 */
export async function renderFrames(svg, { duration, fps, ctx, box, onFrame }) {
  const { width, height } = svgSize(svg);
  const animations = svg.getAnimations({ subtree: true });
  // Which properties each element's animations change (only those are copied onto the still)
  const animated = new Map();
  for (const a of animations) {
    const el = a.effect && a.effect.target;
    if (!el) continue;
    const props = animated.get(el) || new Set();
    for (const k of a.effect.getKeyframes()) for (const prop of ['transform', 'opacity']) if (prop in k) props.add(prop);
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
      const ms = (i / fps) * 1000;
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
      freeze.textContent = '*{animation:none!important;transition:none!important}';
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
export function videoFormat() {
  const types = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  const type = typeof MediaRecorder !== 'undefined' && types.find((t) => MediaRecorder.isTypeSupported(t));
  return type ? { type, ext: type.startsWith('video/mp4') ? 'mp4' : 'webm' } : null;
}

/**
 * Plays pre-rendered frames into a MediaRecorder at an exact frame rate and returns the video Blob.
 * frames: ImageBitmaps (or canvases) of equal size.
 */
export async function recordFrames(frames, { fps, width, height, bitrate = 8e6 }) {
  const format = videoFormat();
  if (!format) throw new Error('This browser cannot record video (no MediaRecorder support)');
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(frames[0], 0, 0);
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0];
  const recorder = new MediaRecorder(stream, { mimeType: format.type, videoBitsPerSecond: bitrate });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise((resolve) => { recorder.onstop = resolve; });
  recorder.start();
  const start = performance.now();
  for (let i = 0; i < frames.length; i++) {
    const due = start + (i * 1000) / fps;
    const wait = due - performance.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    ctx.drawImage(frames[i], 0, 0);
    track.requestFrame ? track.requestFrame() : null;
  }
  // Hold the last frame for one frame time so the video lasts the full clip
  await new Promise((r) => setTimeout(r, 1000 / fps));
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  return new Blob(chunks, { type: format.type.split(';')[0] });
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
async function renderShots(shots, { fps, scale, format, title, genre, onProgress }) {
  const { width, height } = svgSize(shots[0].svg);
  const W = Math.round(width * scale), H = Math.round(height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const frames = [];
  const grab = async () => frames.push(format === 'gif' ? ctx.getImageData(0, 0, W, H).data : await createImageBitmap(canvas));
  const total = Math.round((title ? 1.5 : 0) * fps) + shots.reduce((s, sh) => s + Math.max(1, Math.round(sh.duration * fps)), 0);
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  if (title) {
    drawTitleCard(ctx, title, genre, W, H);
    for (let i = 0; i < Math.round(1.5 * fps); i++) { await grab(); onProgress && onProgress(frames.length / total); }
  }
  for (const shot of shots) {
    // With a caption, the picture moves up by most of the caption's height (cropping empty sky),
    // so the characters standing near the bottom are not hidden behind it
    const captioned = shot.scene && (shot.scene.caption || shot.scene.headline);
    const lift = captioned ? Math.round(captionLayout(ctx, shot.scene, W, H).boxH * 0.8) : 0;
    await renderFrames(shot.svg, {
      duration: shot.duration, fps, ctx, box: { x: 0, y: -lift, w: W, h: H },
      onFrame: async () => {
        if (captioned) drawCaption(ctx, shot.scene, genre, W, H);
        await grab();
        onProgress && onProgress(frames.length / total);
      },
    });
  }
  return { frames, width: W, height: H };
}

/** Animated GIF of the shots -> Blob (image/gif). */
export async function exportGif(shots, { fps = 15, title, genre, onProgress } = {}) {
  const { frames, width, height } = await renderShots(shots, { fps, scale: 1, format: 'gif', title, genre, onProgress: (p) => onProgress && onProgress(p * 0.8) });
  // GIF delays are whole hundredths of a second: alternate them (7, 7, 6... at 15 fps) to keep exact time
  const bytes = encodeGif(frames, { width, height, delayCs: (i) => Math.round(((i + 1) * 100) / fps) - Math.round((i * 100) / fps) });
  onProgress && onProgress(1);
  return new Blob([bytes], { type: 'image/gif' });
}

/** Video (MP4 or WebM, whatever this browser records) of the shots -> Blob; recording runs in real time. */
export async function exportVideo(shots, { fps = 30, scale = 2, title, genre, onProgress } = {}) {
  const { frames, width, height } = await renderShots(shots, { fps, scale, format: 'video', title, genre, onProgress: (p) => onProgress && onProgress(p * 0.6) });
  const n = frames.length;
  let shown = 0;
  const tick = setInterval(() => { shown = Math.min(n, shown + fps / 4); onProgress && onProgress(0.6 + 0.4 * (shown / n)); }, 250);
  try {
    return await recordFrames(frames, { fps, width, height });
  } finally {
    clearInterval(tick);
    frames.forEach((f) => f.close && f.close());
  }
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
