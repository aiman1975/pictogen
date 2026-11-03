// Scene composer: places matched concepts into a simple illustrated scene
// (sky / ground / water, day / night / sunset / snow / rain) for stories, slides and blog posts.

import { conceptOf, whoOf, lookOf } from './individuals.js';
import { lipKeys, lipCss } from './speech.js';
import { layoutBubbles } from './bubble.js';
import { emote } from './emotes.js';
import { actionCues, stillCues, soundTrack, voiceOf } from './sound.js';
import { getConcept } from './concepts/index.js';
import { createKit } from './core/kit.js';
import { createRng } from './core/rng.js';
import { drawConcept, shapesToSvg, svgDoc, newUid, styleWrap, esc } from './core/render.js';
import { getStyle } from './core/styles.js';
import { darken, lighten, mix } from './core/color.js';

export const ENV_WORDS = {
  night: ['night', 'midnight', 'nighttime', 'dark', 'bedtime', 'sleep', 'sleeping', 'asleep', 'moon', 'stars'],
  sunset: ['sunset', 'sunrise', 'dusk', 'dawn', 'evening'],
  snow: ['snow', 'snowy', 'snowing', 'winter', 'christmas', 'frozen', 'blizzard'],
  rain: ['rain', 'raining', 'rainy', 'storm', 'stormy', 'thunder', 'cloudy'],
  water: ['sea', 'ocean', 'lake', 'river', 'beach', 'pond', 'swim', 'swimming', 'sail', 'sailing', 'water', 'island', 'boat'],
  beach: ['beach', 'sand', 'island', 'shore'],
  room: ['room', 'office', 'indoor', 'inside', 'indoors', 'studio', 'classroom', 'school', 'lesson', 'kitchen', 'bedroom', 'desk', 'home'],
  forest: ['forest', 'woods', 'park', 'nature', 'jungle', 'garden'],
  city: ['city', 'town', 'downtown', 'skyline', 'skyscraper', 'skyscrapers', 'building', 'buildings', 'urban', 'street'],
  parallax: ['walk', 'walking', 'run', 'running', 'jog', 'jogging', 'stroll', 'across', 'drive', 'driving', 'road', 'street', 'cartoon', 'parallax', 'zeichentrick'],
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function detectEnv(items, words) {
  const w = new Set(words);
  const any = (k) => ENV_WORDS[k].some((x) => w.has(x));
  const ids = new Set(items.map((i) => i.c.id));
  const tags = new Set(items.flatMap((i) => i.c.tags || []));
  const sunset = any('sunset');
  // (furniture is indoors, unless the words say where: "a bench in the park", "a chair outside")
  const outdoors = ['park', 'garden', 'outside', 'outdoors', 'yard', 'street', 'meadow'].some((x) => w.has(x)) || any('forest') || any('beach');
  const room = !outdoors && (any('room') || tags.has('furniture') || ['chair', 'table', 'window', 'door', 'bed', 'box', 'sofa'].some((id) => ids.has(id)));
  const parallax = any('parallax') || items.some((it) => ['walk', 'run', 'walk-across', 'drive'].includes(it.m?.animation));
  const forest = any('forest') || tags.has('plant') || ids.has('tree');
  // Which room: a classroom, an office, a kitchen, a bedroom, or just a room
  const roomKind = !room ? null
    : w.has('classroom') || w.has('school') || w.has('lesson') ? 'classroom'
      : w.has('office') || w.has('desk') ? 'office'
        : w.has('kitchen') ? 'kitchen'
          : w.has('bedroom') || ids.has('bed') ? 'bedroom' : 'room';
  return {
    night: !sunset && (any('night') || ((ids.has('moon') || ids.has('star')) && !ids.has('sun'))),
    sunset,
    snow: any('snow') || tags.has('winter'),
    rain: any('rain') || ids.has('rain'),
    water: any('water') || items.some((i) => i.c.placement === 'water' || i.c.placement === 'underwater'),
    beach: any('beach'),
    room,
    roomKind,
    forest,
    // A place named: trees along the horizon (a park, a forest), buildings (a city)
    woods: any('forest'),
    park: w.has('park') || w.has('garden'),
    city: !room && any('city'),
    parallax,
  };
}

function palette(env) {
  let sky = ['#8fd3ff', '#b5e3ff', '#dcf3ff'];
  let ground = ['#9ccc65', '#8bc34a', '#7cb342'];
  let water = ['#4fc3f7', '#29b6f6'];
  if (env.sunset) sky = ['#ff8a65', '#ffab76', '#ffd59e'];
  if (env.rain) sky = ['#90a4ae', '#a7b6bd', '#c5d0d5'];
  if (env.snow) ground = ['#eef3f7', '#e3eaf0', '#d7e0e8'];
  if (env.night) {
    sky = ['#101a40', '#1a2a5c', '#253a73'];
    ground = ground.map((c) => darken(c, 0.55));
    water = water.map((c) => darken(c, 0.55));
  } else if (env.sunset) {
    ground = ground.map((c) => mix(c, '#ff7043', 0.15));
  }
  return { sky, ground, water, sand: env.night ? darken('#f3d39b', 0.5) : '#f3d39b' };
}

// Indoors: wall and floor colors per style (the rest a light grey room)
const ROOM_COLORS = {
  cartoon: ['#ffe8a3', '#c98a4b'], anime: ['#fdf0d5', '#c79a6b'], letterling: ['#ffd6ea', '#f9a8d4'],
  watercolor: ['#f1e6d0', '#d6bd94'], crayon: ['#fff3b8', '#f4b183'], pastel: ['#e9edff', '#dfe6fb'],
  comic: ['#fde68a', '#d98b3a'], pixel: ['#7e2553', '#ab5236'], sketch: ['#fffdf5', '#e7e5e4'],
  vintage: ['#efe2c9', '#c9a882'], neon: ['#14183a', '#0b1026'], blueprint: ['#0e2646', '#0a1d37'],
  chalkboard: ['#223830', '#192823'], silhouette: ['#eceff1', '#cfd8dc'],
};

// The things on a room's walls and floor, by kind of room, in colors that sit with the style's
// wall (dark walls - neon, blueprint, chalkboard - get light outlines)
function roomDecor(d, env, W, H, wall, floor) {
  const bg = { kind: 'bg' };
  const dark = darkness(wall) > 0.6;
  const tone = (c, k = 0.3) => mix(c, wall, k);
  const ink = dark ? lighten(wall, 0.45) : '#334155';
  const edge = { kind: 'line', stroke: ink, sw: 2.2 };
  const floorY = H * 0.88;
  const glass = env.night ? '#1a2a5c' : '#bfe6ff';
  const windowAt = (x, y, w, h, view) => {
    d.rect(x - 4, y - 4, w + 8, h + 8, { ...bg, fill: tone('#ffffff', 0.15), rx: 3 });
    d.rect(x, y, w, h, { ...bg, fill: tone(glass, 0.15) });
    if (view) view(x, y, w, h);
    d.line(x + w / 2, y, x + w / 2, y + h, { ...edge, stroke: tone('#ffffff', 0.15), sw: 3 });
    d.line(x, y + h / 2, x + w, y + h / 2, { ...edge, stroke: tone('#ffffff', 0.15), sw: 3 });
    d.rect(x - 4, y - 4, w + 8, h + 8, { ...edge, fill: 'none', rx: 3 });
  };
  const clock = (x, y, r) => {
    d.circle(x, y, r, { ...bg, fill: tone('#ffffff', 0.1) });
    d.circle(x, y, r, { ...edge, fill: 'none' });
    d.line(x, y, x, y - r * 0.65, { ...edge, sw: 2 });
    d.line(x, y, x + r * 0.45, y + r * 0.1, { ...edge, sw: 2 });
  };
  const frame = (x, y, w, h, paint) => {
    d.rect(x, y, w, h, { ...bg, fill: tone('#a1683a', 0.2) });
    d.rect(x + 4, y + 4, w - 8, h - 8, { ...bg, fill: tone('#fff7e6', 0.15) });
    if (paint) paint(x + 4, y + 4, w - 8, h - 8);
    d.rect(x, y, w, h, { ...edge, fill: 'none' });
  };
  const hills = (x, y, w, h) => {
    d.path(`M ${x} ${y + h} Q ${x + w * 0.3} ${y + h * 0.3} ${x + w * 0.6} ${y + h * 0.75} Q ${x + w * 0.8} ${y + h * 0.45} ${x + w} ${y + h * 0.6} L ${x + w} ${y + h} Z`, { ...bg, fill: tone('#66bb6a', 0.2) });
    d.circle(x + w * 0.75, y + h * 0.28, Math.min(w, h) * 0.13, { ...bg, fill: tone('#ffca28', 0.2) });
  };
  const towers = (x, y, w, h) => {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const bh = h * (0.35 + ((i * 37) % 50) / 100), bx = x + (w / n) * i + 1;
      d.rect(bx, y + h - bh, w / n - 2, bh, { ...bg, fill: tone(env.night ? '#2c3e66' : '#90a4ae', 0.15) });
      for (let wy = y + h - bh + 4; wy < y + h - 4; wy += 7) d.rect(bx + 3, wy, w / n - 8, 2.5, { ...bg, fill: env.night ? '#ffe082' : tone('#e3f2fd', 0.1) });
    }
  };
  switch (env.roomKind) {
    case 'classroom': {
      // A chalkboard with a sum and letters on it, a tray of chalk, a clock, an alphabet strip
      const bx = W * 0.24, by = H * 0.1, bw = W * 0.52, bh = H * 0.3;
      d.rect(bx - 6, by - 6, bw + 12, bh + 12, { ...bg, fill: tone('#a1683a', 0.15), rx: 3 });
      d.rect(bx, by, bw, bh, { ...bg, fill: '#2f5d46' });
      const chalk = { kind: 'line', stroke: '#f1f5f9', sw: 2.4 };
      // "1 + 2 = 3" in chalk strokes, and a wavy line of "writing"
      const u = bh / 6, cx0 = bx + bw * 0.12, cy0 = by + bh * 0.3;
      d.line(cx0, cy0 - u, cx0, cy0 + u, chalk);
      d.line(cx0 + u * 1.2, cy0, cx0 + u * 2.6, cy0, chalk); d.line(cx0 + u * 1.9, cy0 - u * 0.7, cx0 + u * 1.9, cy0 + u * 0.7, chalk);
      d.path(`M ${cx0 + u * 3.2} ${cy0 - u * 0.6} Q ${cx0 + u * 4.2} ${cy0 - u * 1.5} ${cx0 + u * 4.2} ${cy0 - u * 0.3} L ${cx0 + u * 3.2} ${cy0 + u} L ${cx0 + u * 4.4} ${cy0 + u}`, { ...chalk, fill: 'none' });
      d.line(cx0 + u * 5, cy0 - u * 0.3, cx0 + u * 6.2, cy0 - u * 0.3, chalk); d.line(cx0 + u * 5, cy0 + u * 0.3, cx0 + u * 6.2, cy0 + u * 0.3, chalk);
      d.path(`M ${cx0 + u * 6.9} ${cy0 - u * 0.8} Q ${cx0 + u * 8} ${cy0 - u * 1.3} ${cx0 + u * 7.6} ${cy0 - u * 0.1} Q ${cx0 + u * 8.4} ${cy0 + u * 0.6} ${cx0 + u * 6.9} ${cy0 + u}`, { ...chalk, fill: 'none' });
      let wave = `M ${bx + bw * 0.12} ${by + bh * 0.72}`;
      for (let x = bx + bw * 0.12; x < bx + bw * 0.8; x += u) wave += ` q ${u / 4} ${-u / 2} ${u / 2} 0 t ${u / 2} 0`;
      d.path(wave, { ...chalk, sw: 1.8, fill: 'none', opacity: 0.8 });
      d.rect(bx, by + bh + 6, bw, 5, { ...bg, fill: tone('#8d5a2b', 0.15) });
      d.rect(bx + bw * 0.7, by + bh + 3, bw * 0.06, 3, { ...bg, fill: '#ffffff' });
      clock(W * 0.88, H * 0.17, Math.min(W, H) * 0.06);
      // Alphabet bunting along the top of the left wall
      const flags = ['#ef5350', '#ffca28', '#66bb6a', '#42a5f5', '#ab47bc'];
      for (let i = 0; i < 5; i++) {
        const fx = W * 0.03 + i * W * 0.035;
        d.poly([[fx, H * 0.08], [fx + W * 0.03, H * 0.08], [fx + W * 0.015, H * 0.15]], { ...bg, fill: tone(flags[i], 0.15) });
      }
      d.line(W * 0.02, H * 0.08, W * 0.22, H * 0.08, { ...edge, sw: 1.5 });
      break;
    }
    case 'office': {
      // A big window onto the city, a framed chart, a shelf with files, a plant in the corner
      windowAt(W * 0.06, H * 0.1, W * 0.26, H * 0.36, towers);
      const px = W * 0.42, py = H * 0.12, pw = W * 0.16, ph = H * 0.2;
      frame(px, py, pw, ph, (x, y, w, h) => {
        [0.4, 0.65, 0.5, 0.85].forEach((v, i) => d.rect(x + w * (0.12 + i * 0.2), y + h * (0.9 - v * 0.8), w * 0.13, h * v * 0.8, { ...bg, fill: tone(['#42a5f5', '#66bb6a', '#ffca28', '#ef5350'][i], 0.15) }));
      });
      const sx = W * 0.7, sy = H * 0.3, sw = W * 0.24;
      d.rect(sx, sy, sw, 5, { ...bg, fill: tone('#8d6e63', 0.15) });
      ['#5c6bc0', '#26a69a', '#ffa726', '#ec407a', '#78909c'].forEach((c, i) => d.rect(sx + 6 + i * sw * 0.13, sy - H * 0.1 + (i % 2) * 4, sw * 0.1, H * 0.1 - (i % 2) * 4, { ...bg, fill: tone(c, 0.2) }));
      clock(W * 0.82, H * 0.14, Math.min(W, H) * 0.05);
      const pot = W * 0.95;
      d.rect(pot - W * 0.03, floorY - H * 0.08, W * 0.06, H * 0.08, { ...bg, fill: tone('#8d6e63', 0.15) });
      for (const [dx, dy] of [[-0.03, -0.17], [0, -0.21], [0.03, -0.16], [-0.015, -0.12], [0.02, -0.11]]) d.ellipse(pot + W * dx, floorY + H * dy, W * 0.022, H * 0.05, { ...bg, fill: tone('#43a047', 0.15) });
      break;
    }
    case 'kitchen': {
      // Cupboards along the top, tiles, a counter with an oven along the back wall, a window
      const top = H * 0.06, ch = H * 0.2;
      for (let x = W * 0.02; x < W * 0.98 - W * 0.12; x += W * 0.13) {
        if (x > W * 0.38 && x < W * 0.62) continue; // (the window)
        d.rect(x, top, W * 0.12, ch, { ...bg, fill: tone('#ffffff', 0.25), rx: 2 });
        d.rect(x, top, W * 0.12, ch, { ...edge, fill: 'none', sw: 1.6, rx: 2 });
        d.circle(x + W * 0.1, top + ch * 0.85, 2, { ...bg, fill: ink });
      }
      windowAt(W * 0.41, H * 0.08, W * 0.18, H * 0.2, hills);
      const ct = H * 0.56;
      for (let x = 0; x < W; x += H * 0.05) for (let y = H * 0.32; y < ct - 2; y += H * 0.05) d.rect(x + 1, y + 1, H * 0.05 - 2, H * 0.05 - 2, { ...bg, fill: tone('#e0f2f1', 0.35) });
      d.rect(0, ct, W, floorY - ct, { ...bg, fill: tone('#ffffff', 0.35) });
      d.rect(0, ct - 6, W, 8, { ...bg, fill: tone('#90a4ae', 0.2) });
      for (let x = W * 0.03; x < W; x += W * 0.16) d.rect(x, ct + 10, W * 0.13, floorY - ct - 16, { ...edge, fill: 'none', sw: 1.4, rx: 2 });
      // The oven, its window glowing
      const ox = W * 0.67;
      d.rect(ox, ct + 10, W * 0.13, floorY - ct - 16, { ...bg, fill: tone('#cfd8dc', 0.2), rx: 2 });
      d.rect(ox + W * 0.015, ct + 22, W * 0.1, (floorY - ct) * 0.45, { ...bg, fill: tone('#ffb74d', 0.2), rx: 2 });
      // A pot on the hob
      d.rect(ox + W * 0.02, ct - 6 - H * 0.06, W * 0.07, H * 0.06, { ...bg, fill: tone('#e53935', 0.2), rx: 3 });
      break;
    }
    case 'bedroom': {
      // A window with curtains (the moon at night), a framed picture, a rug
      windowAt(W * 0.1, H * 0.1, W * 0.2, H * 0.3, env.night ? (x, y, w, h) => d.circle(x + w * 0.7, y + h * 0.3, Math.min(w, h) * 0.12, { ...bg, fill: '#fff59d' }) : hills);
      const cur = tone('#f48fb1', 0.2);
      d.path(`M ${W * 0.08} ${H * 0.07} L ${W * 0.14} ${H * 0.07} Q ${W * 0.12} ${H * 0.28} ${W * 0.15} ${H * 0.46} L ${W * 0.08} ${H * 0.46} Z`, { ...bg, fill: cur });
      d.path(`M ${W * 0.32} ${H * 0.07} L ${W * 0.26} ${H * 0.07} Q ${W * 0.28} ${H * 0.28} ${W * 0.25} ${H * 0.46} L ${W * 0.32} ${H * 0.46} Z`, { ...bg, fill: cur });
      d.line(W * 0.06, H * 0.07, W * 0.34, H * 0.07, { ...edge, sw: 3 });
      frame(W * 0.7, H * 0.12, W * 0.14, H * 0.18, (x, y, w, h) => {
        d.circle(x + w * 0.5, y + h * 0.55, Math.min(w, h) * 0.3, { ...bg, fill: tone('#ffca28', 0.2) });
      });
      // (a string of little stars over the bed's side)
      for (let i = 0; i < 6; i++) d.circle(W * (0.45 + i * 0.035), H * (0.12 + (i % 2) * 0.03), 2.4, { ...bg, fill: tone('#ffe082', 0.1) });
      d.ellipse(W * 0.5, H * 0.94, W * 0.32, H * 0.035, { ...bg, fill: tone('#9575cd', 0.35) });
      break;
    }
    default: {
      // Just a room: a window and a picture
      windowAt(W * 0.12, H * 0.12, W * 0.18, H * 0.26, env.night ? null : hills);
      frame(W * 0.72, H * 0.14, W * 0.13, H * 0.17, hills);
    }
  }
  void floor;
}

// How dark a color is, 0 (white) .. 1 (black)
function darkness(hex) {
  const n = parseInt(String(hex).replace('#', '').slice(0, 6), 16);
  return 1 - (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

// A city behind the horizon: buildings of all heights (windows lit at night), a pavement and a road
function skyline(d, env, pal, rng, W, H, hY) {
  const bg = { kind: 'bg' };
  const far = mix(pal.sky[2], env.night ? '#0b1430' : '#78909c', 0.55), near = mix(pal.sky[2], env.night ? '#16203f' : '#546e7a', 0.6);
  for (const [color, lo, hi, lit] of [[far, 0.18, 0.4, 0.25], [near, 0.1, 0.3, 0.4]]) {
    let x = -rng() * 20;
    while (x < W) {
      const bw = W * (0.06 + rng() * 0.07), bh = H * (lo + rng() * (hi - lo));
      d.rect(x, hY - bh, bw, bh + 2, { ...bg, fill: color });
      if (rng() < 0.25) d.rect(x + bw * 0.4, hY - bh - H * 0.04, bw * 0.08, H * 0.04, { ...bg, fill: color }); // an antenna
      const win = env.night ? '#ffe082' : mix(color, '#e3f2fd', 0.45);
      for (let wy = hY - bh + 6; wy < hY - 6; wy += 9) {
        for (let wx = x + 4; wx < x + bw - 6; wx += 8) {
          if (rng() < (env.night ? lit : 0.55)) d.rect(wx, wy, 4, 4.5, { ...bg, fill: win, opacity: env.night ? 0.95 : 0.6 });
        }
      }
      x += bw + 2 + rng() * 6;
    }
  }
  // Pavement, kerb and road
  const pave = env.night ? '#455a64' : '#cfd8dc', road = env.night ? '#263238' : '#78909c';
  d.rect(0, hY, W, H - hY, { ...bg, fill: pave });
  for (let x = 0; x < W; x += W * 0.08) d.line(x, hY, x - W * 0.03, H * 0.86, { kind: 'line', stroke: '#000000', sw: 1, opacity: 0.08 });
  d.rect(0, H * 0.86, W, 4, { ...bg, fill: mix(pave, '#ffffff', 0.4) });
  d.rect(0, H * 0.86 + 4, W, H * 0.14, { ...bg, fill: road });
  for (let x = W * 0.03; x < W; x += W * 0.12) d.rect(x, H * 0.94, W * 0.06, 3, { ...bg, fill: '#fff8e1', opacity: 0.8 });
}

// Trees along the horizon (a park, a forest): round crowns in a darker green, overlapping
function treeLine(d, env, pal, rng, W, hY, H) {
  const bg = { kind: 'bg' };
  const back = mix(pal.ground[2], '#1b5e20', 0.45), front = mix(pal.ground[1], '#2e7d32', 0.35);
  const dense = env.woods ? 1 : 0.6;
  for (const [color, size, lift] of [[back, 0.09, 0.07], [front, 0.07, 0.03]]) {
    for (let x = -10; x < W + 10; x += W * size * (1.2 + rng() * 0.8) / dense) {
      const r = H * size * (0.7 + rng() * 0.5);
      d.rect(x - 2, hY - H * lift - r * 0.2, 4, r + H * lift, { ...bg, fill: darken(color, 0.25) });
      d.circle(x, hY - H * lift - r * 0.6, r, { ...bg, fill: color });
    }
  }
}

function background(W, H, hY, env, pal, rng, hasGroundItems, style = 'flat') {
  const d = createKit();
  const bg = { kind: 'bg' };

  if (style === 'editorial') {
    // Exact Image 2: warm golden yellow backdrop with crisp black ground line
    d.rect(0, 0, W, H, { ...bg, fill: '#fed136' });
    d.line(0, H * 0.88, W, H * 0.88, { kind: 'line', stroke: '#000000', sw: 3.5 });
    return d.shapes;
  }
  if (style === 'stickman') {
    // Exact Image 1: clean white studio canvas with subtle baseline
    d.rect(0, 0, W, H, { ...bg, fill: '#ffffff' });
    d.line(W * 0.08, H * 0.88, W * 0.92, H * 0.88, { kind: 'line', stroke: '#1e293b', sw: 2.2 });
    d.ellipse(W * 0.5, H * 0.91, W * 0.35, 6, { kind: 'shadow', fill: '#000000', opacity: 0.12 });
    return d.shapes;
  }
  if (style === 'cute2d') {
    // Exact Image 3: clean soft pastel canvas with subtle floating shadow
    d.rect(0, 0, W, H, { ...bg, fill: '#f8fafc' });
    d.ellipse(W * 0.5, H * 0.91, W * 0.35, 7, { kind: 'shadow', fill: '#000000', opacity: 0.1 });
    return d.shapes;
  }
  if (style === 'whiteboard') {
    // Clean dry-erase board with marker border, colorful marker arrows & tray (Roadmap Style 4)
    d.rect(0, 0, W, H, { ...bg, fill: '#ffffff' });
    d.rect(8, 8, W - 16, H - 16, { kind: 'line', stroke: '#cbd5e1', sw: 2.5, rx: 8 });
    // Colorful dry-erase marker arrows & accents in top corners
    d.path(`M 36 ${H * 0.24} Q 72 ${H * 0.14} 112 ${H * 0.20}`, { kind: 'line', stroke: '#0284c7', sw: 3.5 });
    d.path(`M 103 ${H * 0.16} L 114 ${H * 0.20} L 104 ${H * 0.25}`, { kind: 'line', stroke: '#0284c7', sw: 3.5 });
    d.path(`M ${W - 115} ${H * 0.20} Q ${W - 75} ${H * 0.14} ${W - 40} ${H * 0.24}`, { kind: 'line', stroke: '#f97316', sw: 3.5 });
    d.path(`M ${W - 105} ${H * 0.16} L ${W - 117} ${H * 0.20} L ${W - 106} ${H * 0.25}`, { kind: 'line', stroke: '#f97316', sw: 3.5 });
    d.line(W * 0.12, H * 0.88, W * 0.88, H * 0.88, { kind: 'line', stroke: '#16a34a', sw: 3 });
    return d.shapes;
  }
  if (style === 'doodle') {
    // Spiral-bound sketchbook off-white paper with wire rings & faint margin (Roadmap Style 6)
    d.rect(0, 0, W, H, { ...bg, fill: '#fffdfa' });
    d.line(44, 0, 44, H, { kind: 'line', stroke: '#fca5a5', sw: 1.4, opacity: 0.55 });
    for (let y = 24; y < H - 16; y += 32) {
      d.circle(22, y, 4.2, { fill: '#e2e8f0', stroke: '#475569', sw: 1.8, kind: 'detail' });
      d.path(`M 4 ${y - 3} Q 13 ${y - 7} 22 ${y - 2}`, { kind: 'line', stroke: '#334155', sw: 2.2 });
      d.path(`M 4 ${y + 3} Q 13 ${y - 1} 22 ${y + 2}`, { kind: 'line', stroke: '#334155', sw: 2.2 });
    }
    d.line(56, H * 0.88, W - 28, H * 0.88, { kind: 'line', stroke: '#1e293b', sw: 2.2 });
    return d.shapes;
  }
  if (style === 'geometric') {
    // Bauhaus poster: a cream ground with a red disc for a sun and hills of half circles
    d.rect(0, 0, W, H, { ...bg, fill: '#f4ecd8' });
    d.circle(W * 0.8, H * 0.26, H * 0.15, { ...bg, fill: env.night ? '#e9c46a' : '#e63946' });
    d.path(`M 0 0 L ${H * 0.34} 0 A ${H * 0.34} ${H * 0.34} 0 0 1 0 ${H * 0.34} Z`, { ...bg, fill: '#e9c46a' });
    d.path(`M ${-W * 0.05} ${hY} A ${W * 0.3} ${W * 0.3} 0 0 1 ${W * 0.55} ${hY} Z`, { ...bg, fill: '#1d3557' });
    d.path(`M ${W * 0.42} ${hY} A ${W * 0.22} ${W * 0.22} 0 0 1 ${W * 0.86} ${hY} Z`, { ...bg, fill: '#2a9d8f' });
    d.rect(0, hY, W, H - hY, { ...bg, fill: '#e9c46a' });
    d.line(0, hY, W, hY, { kind: 'line', stroke: '#111111', sw: 3 });
    return d.shapes;
  }
  if (style === 'anime' && !env.night && !env.sunset && !env.rain) {
    // An anime summer sky: deep blue overhead, paling to the horizon
    pal = { ...pal, sky: ['#2f86ee', '#5aa9f6', '#a4d4fc'] };
  }
  if (style === 'papercut') {
    // Warm craft paper collage background with layered horizon strip (Roadmap Style 8)
    d.rect(0, 0, W, H, { ...bg, fill: '#f4efe6' });
    d.rect(0, H * 0.86, W, H * 0.14, { ...bg, fill: '#e5dccb' });
    return d.shapes;
  }

  // Indoors (styles with their own backdrop above keep it)
  if (env.room) {
    // A wall, a floor and a baseboard line, in the style's own colors
    const [wallColor, floorColor] = ROOM_COLORS[style] ?? ['#f8fafc', '#f1f5f9'];
    d.rect(0, 0, W, H, { ...bg, fill: wallColor });
    d.rect(0, H * 0.88, W, H * 0.12, { ...bg, fill: floorColor });
    d.group({ class: `pg-place pg-place-${env.roomKind}` }, () => roomDecor(d, env, W, H, wallColor, floorColor));
    d.line(0, H * 0.88, W, H * 0.88, { kind: 'line', stroke: '#000000', sw: 3.5 });
    return d.shapes;
  }

  d.rect(0, 0, W, H, { ...bg, fill: pal.sky[0] });
  d.rect(0, H * 0.3, W, hY - H * 0.3, { ...bg, fill: pal.sky[1] });
  d.rect(0, H * 0.48, W, hY - H * 0.48, { ...bg, fill: pal.sky[2] });

  if (env.night) {
    for (let i = 0; i < 22; i++) {
      const delay = (rng() * 2).toFixed(2);
      d.group({ class: 'pg-env-star', style: `animation-delay: ${delay}s;` }, () => {
        d.circle(rng() * W, rng() * hY * 0.8, 0.9 + rng() * 1.5, { ...bg, fill: '#fff8e1' });
      });
    }
  }

  const waterTop = hY;
  const shoreTop = H * 0.84;
  if (env.water) {
    d.rect(0, waterTop, W, H - waterTop, { ...bg, fill: pal.water[0] });
    d.rect(0, waterTop + (H - waterTop) * 0.45, W, (H - waterTop) * 0.55, { ...bg, fill: pal.water[1] });
    d.group({ class: 'pg-env-wave' }, () => {
      for (let i = 0; i < 10; i++) {
        const x = rng() * W, y = waterTop + 8 + rng() * (H - waterTop - 16), s = 10 + rng() * 12;
        d.path(`M${x - s} ${y} q${s / 2} -${s / 3} ${s} 0 q${s / 2} -${s / 3} ${s} 0`, { kind: 'line', stroke: lighten(pal.water[0], 0.45), sw: 2 });
      }
    });
    if (hasGroundItems) {
      const shore = env.beach || !env.snow ? pal.sand : pal.ground[2];
      d.path(`M0 ${shoreTop} Q${W * 0.5} ${shoreTop - H * 0.03} ${W} ${shoreTop} L${W} ${H} L0 ${H} Z`, { ...bg, fill: shore });
    }
  } else if (env.city) {
    d.group({ class: 'pg-place pg-place-city' }, () => skyline(d, env, pal, rng, W, H, hY));
  } else {
    if (env.woods || env.park) d.group({ class: `pg-place pg-place-${env.park ? 'park' : 'woods'}` }, () => treeLine(d, env, pal, rng, W, hY, H));
    d.ellipse(W * 0.18, hY + H * 0.04, W * 0.38, H * 0.13, { ...bg, fill: pal.ground[0] });
    d.ellipse(W * 0.82, hY + H * 0.05, W * 0.42, H * 0.11, { ...bg, fill: pal.ground[0] });
    d.rect(0, hY, W, H - hY, { ...bg, fill: pal.ground[1] });
    d.rect(0, H * 0.88, W, H * 0.12, { ...bg, fill: pal.ground[2] });
    if (env.park) {
      // A sandy path winding off toward the horizon
      d.path(`M ${W * 0.36} ${H} C ${W * 0.42} ${H * 0.86} ${W * 0.62} ${H * 0.8} ${W * 0.56} ${hY + H * 0.02} L ${W * 0.6} ${hY + H * 0.02} C ${W * 0.7} ${H * 0.8} ${W * 0.56} ${H * 0.88} ${W * 0.64} ${H} Z`, { ...bg, fill: mix(pal.sand, pal.ground[1], 0.25) });
    }
  }

  if (env.parallax) {
    // Conveyor-belt cartoon ground treadmill
    d.group({ class: 'pg-parallax-ground' }, () => {
      for (let x = -80; x < W + 80; x += 36) {
        d.line(x, H * 0.93, x + 18, H * 0.93, { stroke: '#000000', sw: 2.2, opacity: 0.22 });
        d.circle(x + 28, H * 0.945, 1.8, { fill: '#000000', opacity: 0.16 });
      }
    });
  }

  if (env.rain) {
    d.group({ class: 'pg-env-rain' }, () => {
      for (let i = 0; i < 48; i++) {
        const x = rng() * W, y = rng() * H * 0.85;
        d.line(x, y, x - 4, y + 14, { stroke: '#d0e4f0', sw: 1.8, opacity: 0.85 });
      }
    });
  } else if (env.snow) {
    d.group({ class: 'pg-env-snow' }, () => {
      for (let i = 0; i < 40; i++) {
        const x = rng() * W, y = rng() * H * 0.85;
        d.circle(x, y, 1.2 + rng() * 1.8, { fill: '#ffffff', opacity: 0.9 });
      }
    });
  }
  return d.shapes;
}

// Styles whose background() is a flat studio backdrop (no horizon) and that draw their own ground shadow.
const FLAT_BACKDROP_STYLES = ['editorial', 'stickman', 'cute2d', 'whiteboard', 'doodle', 'papercut', 'geometric'];
// Motions that move the whole figure through the scene (the limbs walk in place inside).
const TRAVEL_MOTIONS = ['walk-across', 'approach', 'recede'];
// How far away (in multiples of the front-row distance) an approaching/receding figure starts/ends.
const FAR_DISTANCE = 4.5;

const r2 = (v) => Math.round(v * 100) / 100;
const pct = (v) => `${r2(v * 100)}%`;

/**
 * CSS @keyframes body and duration for a figure travelling through the scene.
 * Figures are drawn in their own 100x100 box scaled by `sx` (negative when mirrored), so screen
 * offsets are divided by the scale to get local units; F is the feet point in that box.
 *   walk-across: off-screen to off-screen in the facing direction at `speed` px/s (shared by everyone
 *                crossing, so a man and his dog stay together); the delay starts each figure at its
 *                composed position, so stills look right.
 *   approach / recede: along a perspective path between the front row and the horizon. Screen size
 *                and distance below the horizon both scale with 1/distance, so a figure walking
 *                toward the camera grows slowly at first and quickly at the end.
 */
function travelKeyframes(motion, { cx, y, s, sx, F, w, W, hY, speed }) {
  if (motion === 'walk-across') {
    const off = w / 2 + 12;
    const [x0, x1] = sx > 0 ? [-off, W + off] : [W + off, -off];
    const duration = clamp(Math.abs(x1 - x0) / speed, 4, 16);
    return {
      duration: r2(duration),
      delay: -r2(duration * ((cx - x0) / (x1 - x0))),
      keyframes: `0% { transform: translateX(${r2((x0 - cx) / sx)}px); } 100% { transform: translateX(${r2((x1 - cx) / sx)}px); }`,
    };
  }
  // The far end of the path heads toward the vanishing point, keeping some of the figure's own offset
  // so several walkers don't all start from one spot.
  const vx = W / 2 + (cx - W / 2) * 0.4;
  const at = (k) => {
    const dx = (vx + (cx - vx) * k - cx) / sx;
    const dy = (hY + (y - hY) * k - y) / s;
    return `transform: translate(${r2(F.x + dx)}px, ${r2(F.y + dy)}px) scale(${r2(k * 1000) / 1000}) translate(${-F.x}px, ${-F.y}px);`;
  };
  const steps = 12;
  const [move0, move1] = motion === 'approach' ? [0, 0.7] : [0.05, 0.85];
  let keyframes = '';
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const dist = motion === 'approach' ? FAR_DISTANCE + (1 - FAR_DISTANCE) * u : 1 + (FAR_DISTANCE - 1) * u;
    keyframes += `${pct(move0 + (move1 - move0) * u)} { ${at(1 / dist)} } `;
  }
  keyframes += motion === 'approach'
    ? `100% { ${at(1)} } 0% { opacity: 0; } 4% { opacity: 1; } 94% { opacity: 1; } 100% { opacity: 0; }`
    : `0% { ${at(1)} } 100% { ${at(1 / FAR_DISTANCE)} } 0% { opacity: 0; } 5% { opacity: 1; } 85% { opacity: 1; } 95% { opacity: 0; } 100% { opacity: 0; }`;
  return { duration: 6, delay: 0, keyframes };
}

// ---------------------------------------------------------------------------------------------
// Timelines: actors that do several things one after another (see src/timeline.js for the beats).

const GESTURE_SECONDS = { sit: 2.6, sleep: 2.6, think: 2.4 };
const HOLD_SECONDS = 1.6; // the final arrangement stays on screen before the clip loops
const STAGGER_SECONDS = 0.35; // a group walking in sets off one after another
const NEAR_K = 1.22; // "comes closer" from the front row: a step toward the camera

/**
 * Plays the beats out for each actor: where it is (x over time) and which pose it shows.
 * slots: figure key ("boy#0", "boy#1"...) -> { id, it, cx, w, h } (its place in the composed scene);
 *   an action for "boy" applies to every boy, and a group entering or walking somewhere goes one
 *   after another so they don't overlap
 * props: concept id -> { cx, w } (things actors can walk to)
 * Returns { T, tracks: figure key -> [{ t0, t1, x0, x1, k0, k1, pose }], camera: [{ type, target, t0, t1 }] }
 * (x across the front row, k the depth scale: 1 front row, 1 / FAR_DISTANCE at the horizon)
 * with times in seconds.
 */
function playTimeline(timeline, slots, props, W) {
  const state = new Map();
  const tracks = new Map();
  for (const [key, slot] of slots) {
    const first = timeline.beats.findIndex((b) => b.actions.some((a) => a.actor === slot.id));
    const firstAction = timeline.beats[first]?.actions.find((a) => a.actor === slot.id);
    // On stage from the start, unless its first action brings it in (from the side, from the horizon,
    // or a later "then a cat" popping up): "when the dog arrives, the boy jumps" - the boy is there all along
    const onStage = first >= 0 && !['enter', 'moveTo', 'approach'].includes(firstAction?.type) && !(first > 0 && firstAction?.type === 'appear');
    // x: place across the front row; k: depth as a scale (1 = front row, 1 / FAR_DISTANCE = horizon)
    state.set(key, { x: slot.cx, k: 1, present: onStage, facing: 1, expression: slot.it.m.expression, isPerson: slot.it.c.category === 'people' });
    tracks.set(key, []);
  }
  const keysOf = (id) => [...slots.keys()].filter((key) => slots.get(key).id === id);
  const off = (id, side) => (side < 0 ? -slots.get(id).w / 2 - 12 : W + slots.get(id).w / 2 + 12);
  // Who a figure looks at: the one it was told to look at ("looks at the dog", "waves at her"), else
  // the nearest figure of another kind on stage. { x, small, up } or null (nobody, or the camera).
  const lookTarget = (key) => {
    const st = state.get(key), slot = slots.get(key);
    if (st.lookAt === 'camera') return null;
    let best = null;
    const consider = (x, h, air) => {
      if (!best || Math.abs(x - st.x) < Math.abs(best.x - st.x)) best = { x, small: h < slot.h * st.k * 0.7, up: air };
    };
    for (const [other, o] of state) {
      const os = slots.get(other);
      if (other === key || !o.present || (st.lookAt ? os.id !== st.lookAt : os.id === slot.id)) continue;
      consider(o.x, os.h * o.k, ['air', 'sky'].includes(os.it.c.placement));
    }
    const prop = st.lookAt && !best && props.get(st.lookAt);
    if (prop) consider(prop.cx, prop.h ?? 0, prop.y < slot.y - slot.h * 0.9);
    return best;
  };
  // Standing people face the camera, or turn three-quarters toward whoever they look at when close
  // (always when told to look at them) with their eyes on them; farther away only the eyes follow.
  // Animals face whoever they look at, else the way they last went.
  const pose = (key, extra = {}) => {
    const st = state.get(key);
    // (sitting on a seat: whatever it does, it does sitting there - "then waves")
    if (st.seated) return seatedPose(key, { ...extra, anim: extra.anim && extra.anim !== 'sit' ? extra.anim : 'sit' });
    return standingPose(key, extra);
  };
  const seatedPose = (key, extra) => ({ ...standingPose(key, extra), seat: 'seat', lift: state.get(key).seated.lift });
  const standingPose = (key, extra = {}) => {
    const st = state.get(key), slot = slots.get(key), view = slot.it.m.view;
    const target = lookTarget(key);
    if (!st.isPerson) return { expression: st.expression, view, mirror: st.lookAt && target ? target.x < st.x : st.facing < 0, ...extra };
    if (!target) return { expression: st.expression, view: view ?? 'front', mirror: false, ...extra };
    const dx = target.x - st.x, gy = target.up ? -1 : target.small ? 0.6 : 0;
    if (view || (!st.lookAt && Math.abs(dx) > W * 0.4)) {
      return { expression: st.expression, view: view ?? 'front', mirror: false, gaze: { x: Math.sign(dx), y: gy }, ...extra };
    }
    return { expression: st.expression, view: 'three-quarter', mirror: dx < 0, gaze: { x: 0.7, y: gy }, ...extra };
  };
  // Where something is: a prop, or the span a group of actors covers ("runs to them" -> beside all of them)
  const posOf = (id) => {
    const keys = keysOf(id).filter((key) => state.get(key).present);
    if (!keys.length) return props.get(id) || (keysOf(id)[0] && { cx: slots.get(keysOf(id)[0]).cx, w: slots.get(keysOf(id)[0]).w });
    const left = Math.min(...keys.map((key) => state.get(key).x - slots.get(key).w / 2));
    const right = Math.max(...keys.map((key) => state.get(key).x + slots.get(key).w / 2));
    return { cx: (left + right) / 2, w: right - left };
  };

  let t = 0;
  const camera = [];
  const beatTimes = []; // when each beat starts and ends (the studio's timeline view)
  const speeches = []; // who says what when: { key, start, text }
  const doings = []; // what each figure does when, for the sound: { key, t0, act }
  for (const beat of timeline.beats) {
    if (beat.camera && !beat.actions.length) {
      // A camera beat: everyone holds still while the camera moves
      const d = beat.duration ?? CAMERA_SECONDS[beat.camera.type] ?? 1.6;
      camera.push({ ...beat.camera, t0: t, t1: t + d });
      for (const [id, st] of state) if (st.present) tracks.get(id).push({ t0: t, t1: t + d, x0: st.x, x1: st.x, k0: st.k, k1: st.k, pose: pose(id) });
      beatTimes.push({ t0: r2(t), t1: r2(t + d) });
      t += d;
      continue;
    }
    const acting = new Map();
    const busy = new Set(); // one action per figure per beat: the main clause's ("waves while sitting" -> waves)
    for (const a of beat.actions) {
      const group = [];
      keysOf(a.actor).forEach((key, n) => {
      if (busy.has(key)) return;
      busy.add(key);
      const st = state.get(key), slot = slots.get(key);
      if (a.expression) st.expression = a.expression;
      const wasPresent = st.present;
      if (!st.present) st.k = 1; // (re)appearing figures start in the front row
      let move = null, d = 0, shown = null, words = null, then = null, dMove = 0;
      if (['approach', 'recede', 'enter', 'moveTo', 'exit'].includes(a.type)) { st.lookAt = null; st.seated = null; } // eyes on the way ahead
      if (a.lookAt) st.lookAt = a.lookAt; // "waves at her"
      if (a.type === 'approach' || a.type === 'recede') {
        // Toward the camera (from the horizon if not there yet, else a step closer) or away into the
        // distance, where it is gone. Time follows the distance walked, in front-row distances.
        const k0 = wasPresent ? st.k : 1 / FAR_DISTANCE;
        const k1 = a.type === 'recede' ? 1 / FAR_DISTANCE : wasPresent && st.k >= 0.99 ? NEAR_K : 1;
        d = clamp(Math.abs(1 / k1 - 1 / k0) * (a.gait === 'run' ? 0.6 : 1.15), 1, 6);
        move = { x0: st.x, x1: st.x, k0, k1 };
        const facing = slot.it.m.view ?? (a.type === 'approach' ? 'front' : 'back');
        shown = { anim: a.gait, ...pose(key), view: facing, mirror: false };
        st.k = k1;
        st.present = a.type === 'approach';
      } else if (a.type === 'enter' || a.type === 'moveTo' || a.type === 'exit') {
        let x0 = st.x, x1;
        if (a.type === 'exit') {
          // Off the side of the screen, wherever its depth puts it
          x1 = W / 2 + (off(key, st.x < W / 2 ? -1 : 1) - W / 2) / st.k;
        } else if (a.type === 'moveTo' && posOf(a.target)) {
          const tgt = posOf(a.target);
          // Come in from the side with more room, or approach from the side you are on;
          // a group lines up beside the target, the nth one further out
          let side = st.present ? Math.sign(st.x - tgt.cx) || 1 : tgt.cx < W / 2 ? 1 : -1;
          // (a hug: close enough to hold them)
          const gap = a.hug ? -Math.min(slot.w, tgt.w) * 0.42 : W * 0.04;
          const spot = (sd) => clamp(tgt.cx + sd * (tgt.w / 2 + slot.w / 2 + gap + n * (slot.w + W * 0.02)), slot.w / 2, W - slot.w / 2);
          // Not on top of someone else standing there: then the target's other side, if that is free
          const taken = (x) => [...state].some(([other, o]) => other !== key && o.present && slots.get(other).id !== a.target
            && Math.abs(o.x - x) < (slot.w + slots.get(other).w) * 0.4);
          if (taken(spot(side)) && !taken(spot(-side))) side = -side;
          if (!st.present) x0 = off(key, side);
          x1 = spot(side);
        } else {
          if (!st.present) x0 = off(key, slot.cx < W / 2 ? -1 : 1);
          x1 = slot.cx;
        }
        const speed = (a.gait === 'run' ? 2 : 0.95) * slot.h;
        d = clamp(Math.abs(x1 - x0) / speed, 0.6, 6);
        st.facing = x1 < x0 ? -1 : 1;
        // Walking somewhere brings a figure back to the front row as it goes
        move = { x0, x1, k0: st.k, k1: a.type === 'exit' ? st.k : 1 };
        if (a.type !== 'exit') st.k = 1;
        st.present = true;
        shown = { anim: a.gait, ...pose(key), view: slot.it.m.view ?? (st.isPerson ? 'side' : undefined), mirror: st.facing < 0 };
        st.x = x1;
        if (a.type === 'exit') st.present = false;
        if (a.hug && posOf(a.target)) {
          // Then holds them, turned to them, for the rest of the step
          st.lookAt = a.target;
          dMove = d;
          d += 1.8;
          then = pose(key, { anim: 'hold' });
        }
      } else if (a.type === 'look') {
        // Turns to look at someone (or at us), and keeps looking until it does something else
        st.present = true;
        st.lookAt = a.target || 'camera';
        d = 1.4;
        shown = pose(key);
      } else if (a.type === 'pose' && a.seat && props.get(a.seat)?.h) {
        // Sitting on something: walking over to it first, then sitting there, hips on the seat
        const prop = props.get(a.seat), c = getConcept(a.seat);
        const others = [...state.values()].filter((o) => o.seated?.id === a.seat).length;
        const x1 = clamp(prop.cx + (c.seatSpan ? (others % 2 ? 0.22 : -0.22) * prop.w : 0), slot.w / 2, W - slot.w / 2);
        const seatAbove = (((c.baseline ?? 96) - c.seatTop) / 100) * prop.h;
        const hipAbove = (((slot.it.c.baseline ?? 96) - (drawConcept(slot.it.c, { ...slot.it.look, seat: 'seat' }).seatAt ?? 76)) / 100) * slot.h;
        const lift = Math.max(-slot.h * 0.15, seatAbove - hipAbove);
        if (!st.present || Math.abs(st.x - x1) > 2) {
          const x0 = st.present ? st.x : off(key, x1 < W / 2 ? -1 : 1);
          dMove = clamp(Math.abs(x1 - x0) / (0.95 * slot.h), 0.6, 6);
          st.facing = x1 < x0 ? -1 : 1;
          move = { x0, x1, k0: st.k, k1: 1 };
          shown = { anim: 'walk', ...pose(key), view: slot.it.m.view ?? (st.isPerson ? 'side' : undefined), mirror: st.facing < 0 };
        }
        st.present = true;
        st.x = x1;
        st.k = 1;
        st.seated = { id: a.seat, lift };
        d = dMove + 2;
        then = pose(key, { anim: 'sit' });
        if (!shown) { shown = then; then = null; }
      } else if (a.type === 'pose') {
        st.present = true;
        d = GESTURE_SECONDS[a.anim] ?? 2;
        shown = pose(key, { anim: a.anim });
        // Saying something: the words ("says “Hello!”"), else a clip scene's caption when the figure
        // talks; the step lasts as long as the words take, lips in sync (src/speech.js)
        words = a.anim === 'talk' ? a.speech ?? timeline.caption : null;
        if (words) {
          d = Math.max(d, lipKeys(words).duration + 0.4);
          speeches.push({ key, start: t, text: words, quoted: a.speech != null });
        }
      } else {
        // 'expr' / 'appear'
        d = st.present ? 1.4 : 0.8;
        st.present = true;
      }
      group.push({ key, d, move, shown, then, dMove, wasPresent, act: { type: a.type, gait: a.gait, anim: a.anim, expression: a.expression, words } });
      });
      // Group members set off one after another, the one going furthest first so nobody walks
      // through the others (gestures stay in unison)
      const dist = (g) => (g.move ? Math.abs(g.move.x1 - g.move.x0) : 0);
      [...group].sort((a, b) => dist(b) - dist(a)).forEach((g, i) => {
        const delay = g.move ? i * STAGGER_SECONDS : 0;
        acting.set(g.key, { ...g, d: g.d + delay, delay });
      });
    }
    let beatLen = Math.max(0.5, ...[...acting.values()].map((a) => a.d));
    let shot = null;
    if (beat.camera) {
      // A camera move alongside the actions ("the camera zooms in while she waves")
      const d = CAMERA_SECONDS[beat.camera.type] ?? 1.6;
      shot = { ...beat.camera, t0: t, t1: t + d };
      camera.push(shot);
      beatLen = Math.max(beatLen, d);
    }
    if (beat.duration) {
      // A length set in the prompt ("waves for 3 seconds") or the timeline view: walks and camera
      // moves speed up to fit a shorter step; gestures and standing still fill a longer one
      const f = Math.min(1, beat.duration / beatLen);
      for (const a of acting.values()) { a.d *= f; a.delay *= f; }
      if (shot) shot.t1 = t + (shot.t1 - t) * f;
      beatLen = beat.duration;
    }
    for (const [id, st] of state) {
      const act = acting.get(id);
      const track = tracks.get(id);
      let t1 = t;
      if (act) doings.push({ key: id, t0: t + act.delay, act: { ...act.act, d: act.d - act.delay, wasPresent: act.wasPresent } });
      if (act?.shown) {
        const t0 = t + act.delay;
        const m = act.move;
        if (act.delay && act.wasPresent) track.push({ t0: t, t1: t0, x0: m.x0, x1: m.x0, k0: m.k0, k1: m.k0, pose: pose(id) });
        // A gesture lasts as long as the beat: the boy keeps waving while the dog runs up to him
        t1 = m ? t + act.d : t + beatLen;
        // (walking somewhere, then something there - sitting down, a hug - for the rest of the step)
        if (act.then && m) t1 = t0 + act.dMove;
        track.push({ t0, t1, x0: m ? m.x0 : st.x, x1: m ? m.x1 : st.x, k0: m ? m.k0 : st.k, k1: m ? m.k1 : st.k, pose: act.shown });
        if (act.then && m) {
          track.push({ t0: t1, t1: t + beatLen, x0: m.x1, x1: m.x1, k0: m.k1, k1: m.k1, pose: act.then });
          t1 = t + beatLen;
        }
      }
      if (st.present && t1 < t + beatLen) track.push({ t0: t1, t1: t + beatLen, x0: st.x, x1: st.x, k0: st.k, k1: st.k, pose: pose(id) });
    }
    beatTimes.push({ t0: r2(t), t1: r2(t + beatLen) });
    t += beatLen;
  }
  for (const [id, st] of state) if (st.present) tracks.get(id).push({ t0: t, t1: t + HOLD_SECONDS, x0: st.x, x1: st.x, k0: st.k, k1: st.k, pose: pose(id) });
  return { T: t + HOLD_SECONDS, tracks, camera, beatTimes, speeches, doings };
}

// ---------------------------------------------------------------------------------------------
// Camera: the whole picture sits in one group that zooms and pans. The view is clamped to the
// scene, so the camera never shows past its edges. Stills (no animation) show the wide shot.

const CAMERA_SECONDS = { zoomIn: 1.6, zoomOut: 1.6, pan: 3, panTo: 2 };

/**
 * Speech bubbles over the picture for whoever speaks (src/bubble.js): always there in a still scene;
 * in a timeline, each while its words last (and laid out clear of the bubbles shown with it).
 */
function speechBubbles(talkers, W, H, uid, motionCss) {
  if (!talkers.length) return '';
  const shown = [];
  const svg = talkers.map((tk, i) => {
    const timed = tk.T != null;
    const avoid = shown.filter((o) => !timed || (o.from < tk.to && tk.from < o.to)).map((o) => o.box);
    const [b] = layoutBubbles([tk], { W, H, avoid });
    shown.push({ ...tk, box: b.box });
    if (!timed) return `<g data-for="${tk.of}">${b.svg}</g>`;
    const pc = (t) => `${r2(Math.min(100, Math.max(0, (t / tk.T) * 100)))}%`;
    motionCss.push(`@keyframes ${uid}b${i} { 0% { opacity: 0; } ${pc(tk.from)} { opacity: 1; } ${pc(tk.to)} { opacity: 0; } }`);
    return `<g data-for="${tk.of}" opacity="0" style="animation: ${uid}b${i} ${r2(tk.T)}s step-end infinite;">${b.svg}</g>`;
  });
  return `<g class="pg-bubbles" pointer-events="none">${svg.join('')}</g>`;
}

/**
 * Where an actor is at time t (seconds), from its timeline track: { x, k } (front-row x, depth scale).
 * Depth changes follow the perspective curve (distance 1/k changes linearly), like the keyframes.
 */
function posAt(track, t) {
  if (!track.length) return null;
  const at = (seg, u) => ({ x: seg.x0 + (seg.x1 - seg.x0) * u, k: 1 / (1 / seg.k0 + (1 / seg.k1 - 1 / seg.k0) * u) });
  if (t <= track[0].t0) return at(track[0], 0);
  for (const seg of track) if (t <= seg.t1) return at(seg, seg.t1 > seg.t0 ? (t - seg.t0) / (seg.t1 - seg.t0) : 1);
  return at(track[track.length - 1], 1);
}

/**
 * Camera keyframes as { t, z, fx, fy, ease }: zoom z centred on the focus point (fx, fy).
 * events: [{ type, target, dir, t0, t1 }]; focusAt(id, t) -> { x, y, h } | null;
 * follow: { id, start } - track that actor from the time it appears.
 */
function cameraKeys({ events, follow, T, W, H, focusAt, start }) {
  const wide = { z: 1, fx: W / 2, fy: H / 2 };
  const first = start || wide;
  const closeUp = (f) => (f ? { z: clamp((H * 0.62) / f.h, 1.4, 2.6), fx: f.x, fy: f.y } : { z: 1.6, fx: W / 2, fy: H * 0.58 });
  let cur = first;
  const keys = [{ t: 0, ...cur, ease: 'ease-in-out' }];
  for (const ev of [...events].sort((a, b) => a.t0 - b.t0)) {
    let next;
    const f = ev.target ? focusAt(ev.target, ev.t1) : null;
    if (ev.type === 'zoomIn') next = closeUp(f);
    else if (ev.type === 'zoomOut') next = wide;
    else if (ev.type === 'reset') next = first;
    else if (ev.type === 'pan') next = { z: Math.max(cur.z, 1.35), fx: ev.dir > 0 ? W * 0.85 : W * 0.15, fy: cur.z > 1 ? cur.fy : H * 0.55 };
    else if (ev.type === 'panTo') next = f ? { z: Math.max(cur.z, 1.35), fx: f.x, fy: f.y } : cur;
    else continue;
    keys.push({ t: ev.t0, ...cur, ease: 'ease-in-out' });
    if (ev.type === 'pan' && cur.z < next.z) {
      // From the wide shot: first frame the side the pan starts from, then travel across
      keys.push({ t: ev.t0 + Math.min(0.7, (ev.t1 - ev.t0) / 3), z: next.z, fx: ev.dir > 0 ? W * 0.15 : W * 0.85, fy: next.fy, ease: 'ease-in-out' });
    }
    keys.push({ t: ev.t1, ...next, ease: 'ease-in-out' });
    cur = next;
  }
  keys.push({ t: T, ...cur, ease: 'linear' });
  if (!follow) return keys;

  // Following: frame the actor wherever it is, at the zoom the other moves set (at least 1.45x).
  // Until it shows up the camera holds the middle of the scene, easing over as it arrives.
  const from = follow.start ?? 0;
  const zAt = (t) => {
    let k = 0;
    while (k < keys.length - 1 && keys[k + 1].t <= t) k++;
    const a = keys[k], b = keys[k + 1] || a;
    return b.t > a.t ? a.z + (b.z - a.z) * ((t - a.t) / (b.t - a.t)) : a.z;
  };
  const out = [];
  const EASE_IN = 0.8;
  for (let t = 0; t <= T + 1e-6; t += 0.25) {
    const f = focusAt(follow.id, Math.max(t, from));
    const k = clamp((t - (from - EASE_IN)) / EASE_IN, 0, 1); // 0 before the actor appears, 1 once it is in
    const fx = f ? W / 2 + (f.x - W / 2) * k : W / 2, fy = f ? H * 0.55 + (f.y - H * 0.55) * k : H / 2;
    out.push({ t: Math.min(t, T), z: Math.max(1 + 0.45 * k, zAt(t)), fx, fy, ease: 'linear' });
  }
  return out;
}

/** CSS @keyframes body for camera keys: translate + scale, clamped so the view stays inside the scene. */
function cameraCss(keys, T, W, H) {
  let css = '', last = -1;
  for (const k of keys) {
    const tx = clamp(W / 2 - k.z * k.fx, W - k.z * W, 0);
    const ty = clamp(H / 2 - k.z * k.fy, H - k.z * H, 0);
    let pc = r2((k.t / T) * 100);
    if (pc <= last) pc = r2(last + 0.01);
    if (pc > 100) continue;
    css += `${pc}% { transform: translate(${r2(tx)}px, ${r2(ty)}px) scale(${r2(k.z * 1000) / 1000}); animation-timing-function: ${k.ease}; } `;
    last = pc;
  }
  return css;
}

/** Lays out a row of items horizontally; sets it.cx and possibly shrinks it.h. */
function layoutRow(list, W, maxH, rng) {
  if (!list.length) return;
  // (it.wf: a wider share, a seat with its sitters; it.gapK: the gap after it, as a share of its
  // height, partners holding hands or hugging)
  list.forEach((it) => { it.h = Math.min(it.h, maxH); it.w = it.h * (it.wf ?? it.c.width ?? 0.8); });
  const baseGap = (a, b) => (a.gapK != null ? a.gapK * a.h : a.c.id === b.c.id ? W * 0.03 : W * 0.035);
  const gaps = list.slice(1).map((it, i) => baseGap(list[i], it));
  const avail = W * 0.92;
  const gapSum = gaps.reduce((s, g) => s + g, 0);
  let widthSum = list.reduce((s, it) => s + it.w, 0);
  if (widthSum + gapSum > avail) {
    const f = Math.max(0.2, (avail - gapSum) / widthSum);
    list.forEach((it) => { it.h *= f; it.w *= f; });
    widthSum *= f;
    list.forEach((it, i) => { if (it.gapK != null && i < gaps.length) gaps[i] = it.gapK * it.h; });
  } else {
    // spread different objects apart a little when there is room
    const extra = avail - widthSum - gapSum;
    const spread = Math.min(extra / (list.length + 1), W * 0.07);
    gaps.forEach((g, i) => { if (list[i].c.id !== list[i + 1].c.id && list[i].gapK == null) gaps[i] += spread; });
  }
  const total = widthSum + gaps.reduce((s, g) => s + g, 0);
  let x = (W - total) / 2 + (rng() - 0.5) * Math.max(0, W - total) * 0.3;
  list.forEach((it, i) => {
    it.cx = x + it.w / 2;
    x += it.w + (gaps[i] || 0);
  });
}

/**
 * composeScene(matches, { width, height, style, seed, vary, words })
 * matches: output of parseText().matches
 */
export function composeScene(matches, opts = {}) {
  const { width: W = 640, height: H = 360, style = 'flat', seed = 1, vary = false, words = [], maxItems = 14 } = opts;
  const rng = createRng(`scene:${seed}`);

  // Each item is one figure: c draws it, aid is who it is (its concept id, or a named individual's
  // "boy~pgc1"); alt counts the figures of the same kind before it, which are dressed differently
  const items = [];
  const ofKind = new Map();
  for (const m of matches) {
    const c = getConcept(conceptOf(m.id));
    if (!c) continue;
    const n = clamp(m.count || 1, 1, c.maxCount ?? 5);
    const before = ofKind.get(c.id) ?? 0;
    ofKind.set(c.id, before + n);
    // A figure's clothes and hair from an earlier scene of the same clip ("a girl in a purple dress",
    // then "the girl waves"): opts.carry, figure id -> { color, hair }
    const was = opts.carry?.[m.id];
    const mc = was && ((!m.color && was.color) || (!m.hair && was.hair)) ? { ...m, color: m.color ?? was.color, hair: m.hair ?? was.hair } : m;
    for (let k = 0; k < n; k++) items.push({ c, m: mc, k, aid: m.id, alt: before + k });
  }
  // How each figure is drawn the same way every time: a recurring character by its own look
  // (opts.identities, src/individuals.js), anyone else by the scene's seed
  // (and heard in its own voice: the n-th character has the n-th voice of its kind)
  for (const it of items) {
    it.look = lookOf(it.aid, { seed, k: it.k, alt: it.alt, vary, looks: opts.identities });
    if (it.m.hair) it.look = { ...it.look, colors: { ...it.look.colors, hair: it.m.hair } };
    it.voice = opts.identities?.has(it.aid) ? Number(whoOf(it.aid).slice(3)) - 1 : it.alt;
  }
  items.splice(maxItems);
  // Things in someone's hands ("a woman holds a phone"): drawn in the hands of their holder, one
  // each, not set down in the scene
  for (const it of items) {
    if (!it.m.heldBy) continue;
    const holder = items.find((h) => h.aid === it.m.heldBy && !h.holding && !h.m.heldBy);
    if (holder) { holder.holding = it; it.inHand = true; }
  }
  for (let i = items.length - 1; i >= 0; i--) if (items[i].inHand) items.splice(i, 1);
  const { timeline } = opts;
  // What someone thinks of ("a boy thinks about a cake", "she has an idea"): in a thought bubble
  // over their head, not in the scene
  if (!timeline) {
    for (const it of items) {
      if (!it.m.thoughtOf) continue;
      const thinker = items.find((h) => h.aid === it.m.thoughtOf && !h.m.thoughtOf);
      if (thinker && (thinker.thoughts?.length ?? 0) < 3) { (thinker.thoughts ??= []).push(it); it.inThought = true; }
    }
    for (let i = items.length - 1; i >= 0; i--) if (items[i].inThought) items.splice(i, 1);
  }
  // Doing things together in a still scene (src/text/matcher.js relations): sitters and riders go
  // on their seat or bike (drawn with it, see carried()), partners stand side by side
  const isPerson = (it) => /^people/.test(it.c.category ?? '');
  if (!timeline) {
    for (const it of items) {
      const by = it.m.carries?.by;
      if (!by || !(it.c.seatTop || it.c.saddle)) continue;
      const room = it.c.saddle || it.c.id === 'chair' ? 1 : 3;
      it.carried = items.filter((o) => o !== it && by.includes(o.aid) && !o.onSeat && !o.carried && isPerson(o)).slice(0, room);
      for (const o of it.carried) o.onSeat = it;
    }
    for (const it of items) {
      const want = it.m.pair;
      if (!want || it.partner || it.onSeat || !isPerson(it)) continue;
      const o = items.find((x) => x !== it && x.aid === want.with && !x.partner && !x.onSeat && (x.m.pair?.with === it.aid || want.with === it.aid));
      if (!o) continue;
      it.partner = o; o.partner = it;
      it.together = want.how; o.together = want.how;
      it.first = true;
      // (side by side in the row: the partner right after)
      items.splice(items.indexOf(o), 1);
      items.splice(items.indexOf(it) + 1, 0, o);
    }
  }

  const env = detectEnv(items, words);
  // A figure walking toward or away from the camera, or a timeline where actors walk and stop:
  // the ground must not scroll sideways under them.
  if (timeline || items.some((it) => ['approach', 'recede'].includes(it.m.animation))) env.parallax = false;
  const pal = palette(env);
  const hY = H * (env.water ? 0.58 : 0.62);

  const isOnlyPeople = items.length > 0 && items.every((it) => it.c.category === 'people');
  const hasLandscape = items.some((it) => ['tree', 'mountain', 'house', 'cloud', 'sun', 'car', 'flower'].includes(it.c.id));
  const isStylizedFigure = ['stickman', 'editorial', 'cute2d', 'geometric', 'whiteboard', 'doodle', 'papercut', 'comic'].includes(style);

  // When focusing on characters or in stylized modes, make characters prominent heroes!
  let unit = H * 0.3;
  if (isOnlyPeople || (isStylizedFigure && !hasLandscape) || (!hasLandscape && items.length <= 3 && items.some(it => it.c.category === 'people'))) {
    // (a thought bubble needs room over its thinker's head)
    const crowd = items.length + (items.some((it) => it.thoughts) ? 1 : 0);
    unit = crowd === 1 ? H * 0.65 : crowd === 2 ? H * 0.52 : H * 0.46;
  }

  const groups = { background: [], sky: [], air: [], back: [], water: [], underwater: [], front: [] };

  for (const it of items) it.h = it.c.scale * unit * (it.m.size || 1);
  // With no tree/house/mountain to give a sense of real size, small subjects (a cat, apples)
  // would be specks on the grass: zoom everything in together so the tallest grounded one
  // stands about 40% of the frame, keeping their sizes relative to each other.
  const grounded = items.filter((it) => !['sky', 'air', 'background'].includes(it.c.placement));
  if (!hasLandscape && grounded.length) {
    const zoom = clamp((H * 0.4) / Math.max(...grounded.map((it) => it.h)), 1, 3);
    items.forEach((it) => { it.h *= zoom; });
  }

  // A seat is as high as the hips of whoever sits on it (the tallest, if several: the others' feet
  // dangle), and wide enough for them; sitters and riders keep their size, as a share of it
  for (const it of items) {
    if (!it.carried?.length) continue;
    for (const o of it.carried) {
      o.pose = drawConcept(o.c, { ...o.look, style, seat: it.c.saddle ? 'ride' : 'seat', view: it.c.saddle ? 'side' : o.m.view });
    }
    // (a figure without legs to bend - an owl, a dragon - stands by the seat instead)
    for (const o of it.carried.filter((x) => (x.pose.seatAt ?? 99) > 86)) o.onSeat = null;
    it.carried = it.carried.filter((x) => x.onSeat);
    if (!it.carried.length) continue;
    if (it.c.seatTop) {
      const hips = Math.max(...it.carried.map((o) => ((o.c.baseline ?? 96) - o.pose.seatAt) * (o.h / 100)));
      it.h = hips / (((it.c.baseline ?? 96) - it.c.seatTop) / 100);
      const need = it.carried.reduce((sum, o) => sum + o.h * (o.c.width ?? 0.8) * 0.85, 0);
      it.wf = Math.max(it.c.width ?? 0.8, need / it.h);
    }
    for (const o of it.carried) o.ratio = o.h / it.h;
  }
  for (let i = items.length - 1; i >= 0; i--) if (items[i].onSeat) items.splice(i, 1);
  // Partners: holding hands, the gap that makes their hands meet; hugging, close and turned to each other
  for (const it of items) {
    if (!it.first) continue;
    const o = it.partner;
    it.noFlip = true; o.noFlip = true;
    if (it.together === 'hands') {
      it.reach = 'right'; o.reach = 'left';
      const a = drawConcept(it.c, { ...it.look, style, reach: 'right' }).hand, b = drawConcept(o.c, { ...o.look, style, reach: 'left' }).hand;
      // (centre to centre: where the hands are, minus half of each one's width)
      it.gapK = a && b ? ((a[0] - 50) * it.h - (b[0] - 50) * o.h) / 100 / it.h - ((it.c.width ?? 0.8) * it.h + (o.c.width ?? 0.8) * o.h) / 2 / it.h : 0;
    } else {
      it.looking = { view: 'three-quarter', mirror: false, gaze: { x: 1, y: 0 } };
      o.looking = { view: 'three-quarter', mirror: true, gaze: { x: -1, y: 0 } };
      it.m = { ...it.m, animation: it.m.animation ?? 'hold' };
      o.m = { ...o.m, animation: o.m.animation ?? 'hold' };
      it.gapK = -0.32 * Math.min((it.c.width ?? 0.8), (o.c.width ?? 0.8) * (o.h / it.h));
    }
  }

  for (const it of items) {
    const pl = it.c.placement || 'ground';
    if (groups[pl] && pl !== 'front' && pl !== 'back') groups[pl].push(it);
    else if (it.c.scale >= 1.4) groups.back.push(it);
    else groups.front.push(it);
  }
  const hasGround = groups.back.length + groups.front.length > 0;

  const uid = newUid();
  // Landscape backdrops have a horizon to give depth; flat studio backdrops draw their own shadows.
  const landscape = !env.room && !FLAT_BACKDROP_STYLES.includes(style);
  const shadows = landscape && style !== 'outline';
  const motionCss = [];
  const cues = []; // what is heard (src/sound.js)
  let soundLoop = null;
  // Everyone walking across keeps the pace of the tallest walker (about 0.9 body heights a second).
  const acrossSpeed = Math.max(45, 0.9 * Math.max(0, ...items.filter((it) => it.m.animation === 'walk-across').map((it) => it.h)));

  const out = [];
  // A named individual's key and id, and a dressed-differently figure, for the studio (its photo,
  // and redrawing it the same way)
  const who = (it) => `${it.aid !== it.c.id ? ` data-who="${whoOf(it.aid)}" data-aid="${it.aid}"` : ''} data-seed="${it.look.seed}"${it.look.vary ? ' data-vary="1"' : ''}${it.look.colors ? ` data-colors="${Object.entries(it.look.colors).map(([r, c]) => `${r}:${c}`).join(' ')}"` : ''}${it.holding ? ` data-held="${it.holding.c.id}"${it.holding.m.color ? ` data-held-color="${it.holding.m.color}"` : ''}` : ''}`;
  // A thought bubble over a thinker's head, up to its right (whichever way it faces), in its own
  // units: a cloud with what it thinks of drawn small inside, and two little puffs leading to it
  const thoughtBubble = (it, flip) => {
    if (!it.thoughts?.length) return '';
    const n = it.thoughts.length, w = 30 + n * 18, h = 36, cx = 66 + w / 2, cy = -16;
    const puffs = [];
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      puffs.push([cx + Math.cos(a) * w * 0.44, cy + Math.sin(a) * h * 0.4, 9 + (k % 3) * 1.5]);
    }
    const ring = puffs.map(([x, y, r]) => `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(r)}"/>`).join('');
    let inside = '';
    const cell = (w - 8) / n, k = Math.min(cell, h - 2) / 100;
    it.thoughts.forEach((t, i) => {
      const x = cx - (w - 8) / 2 + cell * (i + 0.5) - 50 * k, y = cy - 50 * k + 2;
      const shapes = drawConcept(t.c, { ...t.look, color: t.m.color, style, expression: t.m.expression || 'happy' });
      inside += `<g transform="translate(${r2(x)} ${r2(y)}) scale(${r2(k * 1000) / 1000})">${shapesToSvg(shapes, style, { olk: 1.4 })}</g>`;
    });
    const body = `<g class="pg-thought" data-thinks="${it.thoughts.map((t) => t.c.id).join(' ')}"><g class="pg-emote-move">`
      + `<circle cx="62" cy="8" r="2.6" fill="#ffffff" stroke="#94a3b8" stroke-width="1.4"/><circle cx="68.5" cy="-0.5" r="4" fill="#ffffff" stroke="#94a3b8" stroke-width="1.4"/>`
      + `<g fill="#ffffff" stroke="#94a3b8" stroke-width="2.6">${ring}</g><g fill="#ffffff">${ring}<ellipse cx="${r2(cx)}" cy="${r2(cy)}" rx="${r2(w * 0.44)}" ry="${r2(h * 0.4)}"/></g>`
      + `${inside}</g></g>`;
    return flip ? `<g transform="translate(100 0) scale(-1 1)">${body}</g>` : body;
  };
  // Where a sign over a figure's head goes, in its own units (a person's head is near the top)
  const headOf = (it) => (/^people/.test(it.c.category ?? '') ? [62, 6] : [68, 16]);
  // What a figure holds, for drawConcept
  const heldOf = (it) => (it.holding ? { id: it.holding.c.id, color: it.holding.m.color } : undefined);
  // Whoever sits on a seat or rides a bike, drawn on it in its own units (s: its scale): hips on the
  // seat (spread along a bench) or the saddle, each in its own look and marked for its photo face
  const carried = (it, s) => (it.carried ?? []).map((o, i, all) => {
    const k = o.ratio;
    const ride = Boolean(it.c.saddle);
    const shapes = drawConcept(o.c, {
      ...o.look, color: o.m.color, style, expression: o.m.expression || 'happy', seat: ride ? 'ride' : 'seat',
      view: ride ? 'side' : o.m.view, held: heldOf(o), animation: o.m.expression === 'talking' ? 'talk' : undefined,
    });
    const span = it.c.seatSpan ?? [12, 88];
    const x = ride ? it.c.saddle[0] - (shapes.hipX ?? 50) * k
      : span[0] + ((i + 0.5) * (span[1] - span[0])) / all.length - 50 * k;
    const y = (ride ? it.c.saddle[1] : it.c.seatTop) - (shapes.seatAt ?? 70) * k;
    const svg = shapesToSvg(shapes, style, { olk: clamp(W / 280 / (2.4 * s * k), 0.35, 4) });
    return `<g class="pg-${ride ? 'rider' : 'sitter'}" data-id="${o.c.id}"${who(o)} transform="translate(${r2(x)} ${r2(y)}) scale(${r2(k * 1000) / 1000})">${svg}${thoughtBubble(o, false)}</g>`;
  }).join('');
  // Who says what in a still scene ("Tom says “Hello!”"): figure id -> words
  const said = new Map((opts.speech || []).map((sp) => [sp.who, sp.text]));
  const talkers = []; // who speaks where, for their speech bubbles: { x, top, text, room, of }
  // Who looks at whom ("a boy and a girl looking at each other"): concept id -> concept id | 'camera'
  const looks = new Map((opts.looks || []).map((l) => [l.who, l.at]));
  const placed = [], later = [];
  // Which way someone looks: people turn three-quarters toward the nearest one they look at with
  // their eyes on them (up at the sky, down at a dog); animals face them. Not while travelling.
  const lookFor = (it, cx) => {
    if (TRAVEL_MOTIONS.includes(it.m.animation)) return null;
    const at = looks.get(it.aid), person = it.c.category === 'people';
    if (at === 'camera') return { view: person ? it.m.view ?? 'front' : it.m.view, mirror: false };
    const others = placed.filter((p) => p.it !== it && p.it.aid === at);
    if (!others.length) return null;
    const o = others.reduce((a, b) => (Math.abs(b.cx - cx) < Math.abs(a.cx - cx) ? b : a));
    const dx = o.cx - cx;
    const up = ['sky', 'air'].includes(o.it.c.placement), small = !up && o.it.h < it.h * 0.7;
    const gaze = { x: 0.7, y: up ? -1 : small ? 0.6 : 0 };
    if (!person) return { view: it.m.view, mirror: dx < 0 };
    if (it.m.view && it.m.view !== 'three-quarter') return { view: it.m.view, mirror: false, gaze: { ...gaze, x: Math.sign(dx) } };
    return { view: 'three-quarter', mirror: dx < 0, gaze };
  };
  const actorSlots = new Map(); // timeline actors: drawn last, once every position is known
  const propsAt = new Map(); // where things are, for "walks to the tree"
  const place = (it, cx, y, anchor = 'bottom') => {
    const s = it.h / 100;
    const base = anchor === 'bottom' ? it.c.baseline ?? 96 : 50;
    const w = it.w ?? it.h * (it.c.width ?? 0.8);
    if (timeline && it.m.actor) {
      actorSlots.set(`${it.aid}#${it.k}`, { id: it.aid, it, cx, y, s, base, w, h: it.h, olk: clamp(W / 280 / (2.4 * s), 0.35, 4) });
      return;
    }
    if (!propsAt.has(it.aid)) propsAt.set(it.aid, { cx, w, y, h: it.h, anchor });
    // Someone looking at someone is drawn once everyone has a place, to know which way to look
    if (looks.has(it.aid) && !it.looking) {
      placed.push({ it, cx, y });
      const at = out.length;
      out.push('');
      later.push(() => { it.looking = lookFor(it, cx) || {}; place(it, cx, y, anchor); out[at] = out.pop(); });
      return;
    }
    if (!it.looking) placed.push({ it, cx, y });
    const look = it.looking?.mirror !== undefined ? it.looking : null;
    const x0 = cx - 50 * s, y0 = y - base * s;
    const flip = look ? look.mirror && it.c.flippable !== false : it.k % 2 === 1 && it.c.flippable !== false && !it.noFlip;
    const tr = flip ? `translate(${x0 + 100 * s} ${y0}) scale(${-s} ${s})` : `translate(${x0} ${y0}) scale(${s})`;
    const olk = clamp(W / 280 / (2.4 * s), 0.35, 4);
    // Words to say: its own ("Tom says “Hi!”"), or a clip scene's caption when the figure talks
    const words = said.get(it.aid) ?? (opts.caption && (it.m.animation === 'talk' || it.m.expression === 'talking') ? opts.caption : null);
    let animation = it.m.animation ?? (words ? 'talk' : undefined);
    let lips = '';
    if (words) {
      // The words, then a pause, over and over
      const name = `${uid}l${out.length}`, loop = r2(lipKeys(words).duration + 2);
      motionCss.push(lipCss(name, [{ start: 0.5, text: words }], loop));
      lips = ` data-lips="${name}"`;
      // (a bubble for its own words; a clip's caption is already shown under the picture)
      if (said.has(it.aid)) talkers.push({ x: cx, top: y0 + 2 * s, text: words, room: w, of: `${it.c.id}#${it.k}` });
      opts.speechDuration = Math.max(opts.speechDuration ?? 0, loop);
      soundLoop = Math.max(soundLoop ?? 0, loop);
    }
    // Its mood said out loud (one after another), its words babbled in time with its lips
    if (it.m.expression || words) cues.push(...stillCues({ expression: it.m.expression, words, at: 0.3 + cues.length * 0.45 }, voiceOf(it.c.id, it.voice)));
    if (!animation) {
      if (it.c.category === 'people') animation = 'blink';
      else if (it.c.id === 'sun') animation = 'pulse';
      else if (it.c.id === 'tree' || it.c.id === 'flower') animation = 'sway';
      else if (it.c.id === 'bird') animation = 'flap';
      else if (it.c.id === 'boat') animation = 'rock';
      else if (it.c.id === 'car') animation = 'drive';
      else if (it.c.id === 'dog') animation = 'wag';
    }
    const expression = it.m.expression || 'happy';
    const motion = TRAVEL_MOTIONS.includes(animation) ? animation : null;
    // Approaching / receding figures walk in place while their wrapper carries them through depth.
    const limbs = motion === 'approach' || motion === 'recede' ? 'walk' : animation;
    // Toward the camera we see the face, away from it the back (unless the prompt said otherwise);
    // walking or running across the scene is drawn in profile by the people themselves.
    const view = it.m.view ?? look?.view ?? (motion === 'recede' ? 'back' : motion === 'approach' ? 'front' : undefined);
    const shapes = drawConcept(it.c, {
      ...it.look,
      color: it.m.color,
      expression,
      animation: limbs,
      view,
      gaze: look?.gaze,
      style,
      held: heldOf(it),
      reach: it.reach,
    });
    it.at = { x0, y0, s, flip };
    // The drawing sits innermost in .pg-figure, so the studio can redraw it (a new expression)
    // while the animation wrapper, shadow and travel motion around it stay; whoever sits on it or
    // rides it comes after, in its motion
    const drawing = shapesToSvg(shapes, style, { olk });
    // (how it feels, as a sign over its head: "!", "?", a heart, "Zzz"...)
    const sign = emote(animation === 'sleep' ? 'sleepy' : expression, { head: headOf(it), mirrored: flip });
    let wrappedContent = `<g class="pg-figure">${drawing}${sign}</g>${carried(it, s)}${thoughtBubble(it, flip)}`;
    if (limbs && limbs !== 'blink' && !drawing.includes(`pg-anim-${limbs}`)) {
      wrappedContent = `<g class="pg-anim-${limbs}">${wrappedContent}</g>`;
    }
    if (shadows && anchor === 'bottom' && !['background', 'water'].includes(it.c.placement)) {
      // Contact shadow on the ground: outside the figure's own animation, so it stays put when jumping.
      const rx = 50 * (it.c.width ?? 0.8) * 0.72;
      wrappedContent = `<ellipse class="pg-shadow" cx="50" cy="${base}" rx="${r2(rx)}" ry="${r2(Math.max(3, rx * 0.13))}" fill="#000000" opacity="0.16"/>${wrappedContent}`;
    }
    if (motion) {
      const name = `${uid}m${out.length}`;
      const { keyframes, duration, delay } = travelKeyframes(motion, {
        cx, y, s, sx: flip ? -s : s, F: { x: 50, y: base }, w: it.w ?? it.h * (it.c.width ?? 0.8), W, hY, speed: acrossSpeed,
      });
      motionCss.push(`@keyframes ${name} { ${keyframes} }`);
      const cls = motion === 'walk-across' ? 'pg-motion-across' : `pg-motion-${motion}`;
      wrappedContent = `<g class="${cls}" style="animation: ${name} ${duration}s linear ${delay}s infinite;">${wrappedContent}</g>`;
    }
    const animAttr = animation ? ` data-animation="${animation}"` : '';
    const exprAttr = expression ? ` data-expression="${expression}"` : '';
    const viewAttr = view ? ` data-view="${view}"` : '';
    const colorAttr = it.m.color ? ` data-color="${it.m.color}"` : '';
    out.push(`<g class="movable-item" data-id="${it.c.id}" data-k="${it.k}" data-label="${it.c.label || it.c.id}"${who(it)}${lips}${animAttr}${exprAttr}${viewAttr}${colorAttr} transform="${tr.replace(/(\d+\.\d{3})\d+/g, '$1')}" style="cursor: grab;">${wrappedContent}</g>`);
  };

  // One timeline actor: a wrapper moved by keyframes, and one drawing per pose, switched on and off
  // in step with the beats. With animation off (still exports) the last on-screen pose shows in place.
  const renderActor = ({ it, y, s, base, olk, w }, track, T, name, lips = null) => {
    // Still renders show the last pose the figure had on screen, in the front row
    const onScreen = track.filter((seg) => seg.x1 > -w / 2 && seg.x1 < W + w / 2 && seg.k1 > 0.5);
    const last = onScreen[onScreen.length - 1] || track[track.length - 1];
    const home = last ? last.x1 : 0;
    const at = (sec) => pct(sec / T);
    const variants = new Map();
    for (const seg of track) {
      const p = seg.pose;
      const key = `${p.anim}|${p.expression}|${p.view}|${p.mirror}|${p.gaze ? `${p.gaze.x},${p.gaze.y}` : ''}|${p.seat ?? ''}|${p.lift ?? ''}`;
      if (!variants.has(key)) variants.set(key, { pose: p, windows: [] });
      seg.variant = key;
      variants.get(key).windows.push(seg);
    }

    // Position in the figure's own units: across the front row, and into depth on a perspective path
    // (scaled about its feet, moved toward the horizon); depth moves are sampled so the size grows
    // as 1/distance. Every keyframe has the same transform list so the browser interpolates it.
    const F = { x: 50, y: base };
    const place = (x, k) => {
      const dx = (W / 2 + (x - W / 2) * k - home) / s, dy = (hY + (y - hY) * k - y) / s;
      return `transform: translate(${r2(F.x + dx)}px, ${r2(F.y + dy)}px) scale(${r2(k * 1000) / 1000}) translate(${-F.x}px, ${-F.y}px);`;
    };
    const points = [];
    for (const seg of track) {
      const steps = Math.abs(seg.k1 - seg.k0) > 1e-6 ? 12 : 1;
      for (let j = 0; j <= steps; j++) {
        const u = j / steps;
        points.push([seg.t0 + (seg.t1 - seg.t0) * u, seg.x0 + (seg.x1 - seg.x0) * u, 1 / (1 / seg.k0 + (1 / seg.k1 - 1 / seg.k0) * u)]);
      }
    }
    let posFrames = track.length && track[0].t0 > 0 ? `0% { ${place(track[0].x0, track[0].k0)} } ` : '', lastPct = -1;
    for (const [sec, x, k] of points) {
      let pc = Math.max(r2((sec / T) * 100), lastPct === -1 ? 0 : lastPct);
      if (pc === lastPct) pc = r2(pc + 0.01);
      if (pc > 100) break;
      posFrames += `${pc}% { ${place(x, k)} } `;
      lastPct = pc;
    }
    // Hold the last place to the end of the loop (a figure that has left must not drift back)
    if (points.length && lastPct < 100) posFrames += `100% { ${place(points[points.length - 1][1], points[points.length - 1][2])} } `;
    motionCss.push(`@keyframes ${name}p { ${posFrames}}`);
    // The shadow shows while the figure is on stage at all (before it arrives and after it leaves, not)
    let shadowFrames = `0% { opacity: ${track[0]?.t0 === 0 ? 1 : 0}; } `;
    track.forEach((seg, j) => {
      shadowFrames += `${at(seg.t0)} { opacity: 1; } `;
      const next = track[j + 1];
      if (!next || next.t0 > seg.t1 + 1e-6) shadowFrames += `${at(seg.t1)} { opacity: 0; } `;
    });
    motionCss.push(`@keyframes ${name}s { ${shadowFrames}}`);

    let poses = '', i = 0;
    for (const [key, { pose }] of variants) {
      // Visibility: on during this pose's windows, off otherwise (step-end holds each value)
      let frames = `0% { opacity: ${track[0]?.t0 === 0 && track[0].variant === key ? 1 : 0}; } `;
      track.forEach((seg, j) => {
        frames += `${at(seg.t0)} { opacity: ${seg.variant === key ? 1 : 0}; } `;
        const next = track[j + 1];
        if (!next || next.t0 > seg.t1 + 1e-6) frames += `${at(seg.t1)} { opacity: 0; } `;
      });
      motionCss.push(`@keyframes ${name}v${i} { ${frames}}`);
      const shapes = drawConcept(it.c, {
        ...it.look, color: it.m.color, style,
        expression: pose.expression || 'happy', animation: pose.anim, view: pose.view, gaze: pose.gaze, held: heldOf(it), seat: pose.seat,
      });
      // The drawing sits innermost in .pg-figure, so the studio can redraw it (a new expression)
      // while the pose's animation wrapper and mirroring around it stay
      const drawing = shapesToSvg(shapes, style, { olk });
      let svg = `<g class="pg-figure">${drawing}</g>`;
      if (pose.anim && !drawing.includes(`pg-anim-${pose.anim}`)) svg = `<g class="pg-anim-${pose.anim}">${svg}</g>`;
      // (sitting on a seat: hips up on it)
      if (pose.lift) svg = `<g transform="translate(0 ${r2(-pose.lift / s)})">${svg}</g>`;
      if (pose.mirror) svg = `<g transform="translate(100 0) scale(-1 1)">${svg}</g>`;
      // How it feels in this pose, as a sign over its head (there while it feels that way)
      const [hx, hy] = headOf(it);
      svg += emote(pose.anim === 'sleep' ? 'sleepy' : pose.expression, { head: [hx, hy - (pose.lift ?? 0) / s] });
      const still = last && last.variant === key;
      const attrs = `${pose.anim ? ` data-anim="${pose.anim}"` : ''}${pose.view ? ` data-view="${pose.view}"` : ''}`;
      poses += `<g class="pg-timeline-pose"${attrs} opacity="${still ? 1 : 0}" style="animation: ${name}v${i} ${r2(T)}s step-end infinite;">${svg}</g>`;
      i++;
    }
    const rx = 50 * (it.c.width ?? 0.8) * 0.72;
    const shadow = shadows ? `<g style="animation: ${name}s ${r2(T)}s step-end infinite;"><ellipse class="pg-shadow" cx="50" cy="${base}" rx="${r2(rx)}" ry="${r2(Math.max(3, rx * 0.13))}" fill="#000000" opacity="0.16"/></g>` : '';
    const tr = `translate(${r2(home - 50 * s)} ${r2(y - base * s)}) scale(${r2(s * 1000) / 1000})`;
    return `<g class="movable-item" data-id="${it.c.id}" data-k="${it.k}" data-label="${it.c.label || it.c.id}" data-actor="${it.c.id}"${who(it)}${lips ? ` data-lips="${lips}"` : ''}${it.m.color ? ` data-color="${it.m.color}"` : ''} transform="${tr}" style="cursor: grab;"><g class="pg-timeline-move" style="animation: ${name}p ${r2(T)}s linear infinite;">${shadow}${poses}</g></g>`;
  };

  // background objects (mountains, rainbows): large, behind everything, sitting on the horizon
  layoutRow(groups.background, W, H * 0.6, rng);
  groups.background.forEach((it) => place(it, it.cx, hY + H * 0.03));

  // sky: the biggest celestial body goes top-right, others spread across the top
  const sky = [...groups.sky].sort((a, b) => b.c.scale - a.c.scale);
  let skyStart = 0.08, skyEnd = 0.92;
  if (sky.length && sky[0].c.scale >= 0.7) {
    const it = sky.shift();
    it.h = Math.min(it.h, H * 0.3);
    place(it, W * 0.83, H * 0.2, 'center');
    skyEnd = 0.68;
  }
  sky.forEach((it, i) => {
    it.h = Math.min(it.h, H * 0.22);
    const x = W * (skyStart + ((i + 0.5) / sky.length) * (skyEnd - skyStart)) + (rng() - 0.5) * W * 0.05;
    place(it, x, H * (0.12 + rng() * 0.14), 'center');
  });

  // air: birds, planes, balloons, kites
  groups.air.forEach((it, i) => {
    it.h = Math.min(it.h, H * 0.24);
    const x = W * (0.1 + ((i + 0.5) / groups.air.length) * 0.8) + (rng() - 0.5) * W * 0.06;
    place(it, x, H * (0.28 + rng() * 0.14), 'center');
  });

  // ground: big things (trees, houses) in a back row, everything else in front
  const frontY = (style === 'editorial' || style === 'stickman' || style === 'cute2d' || style === 'whiteboard')
    ? H * 0.88
    : (env.water ? H * 0.97 : H * 0.95);

  if (groups.front.length === 0) {
    layoutRow(groups.back, W, H * 0.62, rng);
    groups.back.forEach((it) => place(it, it.cx, env.water ? frontY : H * 0.9));
  } else {
    layoutRow(groups.back, W, H * 0.58, rng);
    groups.back.forEach((it) => place(it, it.cx, env.water ? H * 0.9 : hY + H * 0.1));
  }

  // water surface and underwater
  const waterBottom = hasGround ? H * 0.84 : H;
  layoutRow(groups.water, W, (waterBottom - hY) * 1.2, rng);
  groups.water.forEach((it) => place(it, it.cx, hY + (waterBottom - hY) * 0.45));
  layoutRow(groups.underwater, W, (waterBottom - hY) * 0.5, rng);
  groups.underwater.forEach((it) => place(it, it.cx, hY + (waterBottom - hY) * (0.55 + rng() * 0.2), 'center'));

  if (groups.front.length) {
    const front = groups.front;
    const rowWidth = front.reduce((sum, it) => sum + Math.min(it.h, H * 0.75) * (it.c.width ?? 0.8), 0) + (front.length - 1) * W * 0.03;
    if (landscape && front.length >= 4 && rowWidth > W * 0.92) {
      // Too many to fit in one row: put every other item in a second row further back, smaller and
      // nearer the horizon, instead of shrinking everyone into a thin line.
      const FAR = 0.7;
      const far = front.filter((_, i) => i % 2 === 1);
      const near = front.filter((_, i) => i % 2 === 0);
      far.forEach((it) => { it.h *= FAR; });
      layoutRow(far, W, H * 0.75 * FAR, rng);
      far.forEach((it) => place(it, it.cx, hY + (frontY - hY) * FAR));
      layoutRow(near, W, H * 0.75, rng);
      near.forEach((it) => place(it, it.cx, frontY));
    } else {
      layoutRow(front, W, H * 0.75, rng);
      if (front.length === 1 && !hasLandscape) {
        front[0].cx = W / 2;
      }
      front.forEach((it) => place(it, it.cx, frontY));
    }
  }

  let cam = null; // { keys, T }
  // What the camera looks at: an actor (where it is at that moment) or anything else in the scene
  const focusAt = (tracks) => (id, t) => {
    const key = `${id}#0`; // a group: its first member
    if (tracks?.has(key)) {
      const slot = actorSlots.get(key);
      const { x, k } = posAt(tracks.get(key), t) ?? { x: slot.cx, k: 1 };
      return { x: W / 2 + (x - W / 2) * k, y: hY + (slot.y - hY) * k - slot.h * k * 0.55, h: slot.h * k };
    }
    const p = propsAt.get(id);
    return p ? { x: p.cx, y: p.anchor === 'bottom' ? p.y - p.h * 0.55 : p.y, h: p.h } : null;
  };
  for (const draw of later) draw();
  // Partners' hands joined (a hand in a hand), a heart over a hug
  for (const it of items) {
    if (!it.first || !it.at || !it.partner.at) continue;
    const o = it.partner, A = it.at, B = o.at;
    if (it.together === 'hands') {
      const a = drawConcept(it.c, { ...it.look, style, reach: 'right' }), b = drawConcept(o.c, { ...o.look, style, reach: 'left' });
      if (!a.hand || !b.hand) continue;
      const pa = [A.x0 + a.hand[0] * A.s, A.y0 + a.hand[1] * A.s], pb = [B.x0 + b.hand[0] * B.s, B.y0 + b.hand[1] * B.s];
      const r = Math.max(A.s, B.s) * 3.6, mid = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
      out.push(`<g class="pg-hands">`
        + `<line x1="${r2(pa[0])}" y1="${r2(pa[1])}" x2="${r2(mid[0])}" y2="${r2(mid[1])}" stroke="${a.handFill}" stroke-width="${r2(A.s * 7)}" stroke-linecap="round"/>`
        + `<line x1="${r2(pb[0])}" y1="${r2(pb[1])}" x2="${r2(mid[0])}" y2="${r2(mid[1])}" stroke="${b.handFill}" stroke-width="${r2(B.s * 7)}" stroke-linecap="round"/>`
        + `<circle cx="${r2(mid[0])}" cy="${r2(mid[1])}" r="${r2(r)}" fill="${a.handFill}"/></g>`);
    } else {
      const x = (A.x0 + 50 * A.s + B.x0 + 50 * B.s) / 2, y = Math.min(A.y0, B.y0) - 2 * A.s, k = A.s * 0.16;
      motionCss.push(`@keyframes ${uid}heart { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }`);
      out.push(`<g class="pg-heart" transform="translate(${r2(x)} ${r2(y)})"><g style="transform-box: fill-box; transform-origin: center; animation: ${uid}heart 1.4s ease-in-out infinite;">`
        + `<path transform="scale(${r2(k * 1000) / 1000})" d="M0 30 C-40 0 -28 -26 0 -10 C28 -26 40 0 0 30 Z" fill="#f43f5e"/></g></g>`);
    }
  }
  if (timeline && actorSlots.size) {
    const { T, tracks, camera: events, beatTimes, speeches, doings } = playTimeline(timeline, actorSlots, propsAt, W);
    timeline.duration = r2(T);
    timeline.beatTimes = beatTimes;
    for (const { key, t0, act } of doings) {
      const { it } = actorSlots.get(key);
      cues.push(...actionCues(act, t0, voiceOf(it.c.id, it.voice)));
    }
    soundLoop = r2(T); // (the animation's loop)
    for (const [key, slot] of actorSlots) {
      const name = `${uid}a${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const said = speeches.filter((sp) => sp.key === key);
      // (a start in the next beat is one in the same loop: keyframes after the loop's end are cut)
      if (said.length) motionCss.push(lipCss(`${name}l`, said, r2(T)));
      for (const sp of said.filter((x) => x.quoted)) {
        // Where the speaker is while talking, for the bubble (shown while the words last)
        const dur = lipKeys(sp.text).duration, p = posAt(tracks.get(key), sp.start + dur / 2) ?? { x: slot.cx, k: 1 };
        const foot = hY + (slot.y - hY) * p.k;
        talkers.push({ x: W / 2 + (p.x - W / 2) * p.k, top: foot - (slot.base - 2) * slot.s * p.k, text: sp.text, room: slot.w * p.k, of: `${slot.it.c.id}#${slot.it.k}`, from: sp.start - 0.15, to: Math.min(T, sp.start + dur + 0.8), T });
      }
      out.push(renderActor(slot, tracks.get(key), T, name, said.length ? `${name}l` : null));
    }
    if (events.length || timeline.follow) {
      const followed = timeline.follow && tracks.get(`${timeline.follow}#0`);
      const follow = timeline.follow ? { id: timeline.follow, start: followed?.[0]?.t0 ?? 0 } : null;
      cam = { T, keys: cameraKeys({ events, follow, T, W, H, focusAt: focusAt(tracks) }) };
    }
  } else if (opts.camera?.moves?.length) {
    // Camera directions without a timeline: play them in order, then ease back so the loop is seamless
    const ids = new Set(items.map((it) => it.aid));
    let t = 0.8;
    const events = opts.camera.moves.map((m) => {
      const id = m.target && [...ids].find((x) => x === m.target);
      const type = m.type === 'follow' ? 'zoomIn' : m.type;
      const ev = { ...m, type, target: id || null, t0: t, t1: t + (CAMERA_SECONDS[type] ?? 1.6) + 0.6 };
      t = ev.t1 + 1.2;
      return ev;
    });
    events.push({ type: 'reset', t0: t, t1: t + 1.4 });
    const T = r2(t + 1.4 + 0.4);
    const start = opts.camera.moves[0].type === 'zoomOut' ? { z: 1.8, fx: W / 2, fy: H * 0.58 } : null;
    cam = { T, keys: cameraKeys({ events, T, W, H, focusAt: focusAt(null), start }) };
    opts.camera.duration = T;
  }

  // The style's touches (src/core/styles.js): a filter over the landscape too (watercolor,
  // crayon) or over the whole picture (pixel), decoration behind everyone, an overlay on top
  const st = getStyle(style);
  const filterRef = st.filter ? `url(#${uid}-${st.filter})` : null;
  const fx = styleWrap(style, uid, out.join(''), { scale: W / 260, freq: 0.02, blur: W / 450, pixel: Math.round(W / 12) / 10, w: W, h: H, noFilter: st.wholeFilter });
  let bgSvg = shapesToSvg(background(W, H, hY, env, pal, rng, hasGround, style), style);
  if (st.bgFilter && filterRef) bgSvg = `<rect width="${W}" height="${H}" fill="${st.background || '#ffffff'}"/><g filter="${filterRef}">${bgSvg}</g>`;
  const decor = st.decor && !(st.outdoorDecor && env.room) ? st.decor(uid, W, H, hY) : '';
  let content = `<g stroke-linecap="round" stroke-linejoin="round">${bgSvg}</g>${decor}${fx.g}${speechBubbles(talkers, W, H, uid, motionCss)}`;
  if (cam) {
    motionCss.push(`@keyframes ${uid}cam { ${cameraCss(cam.keys, cam.T, W, H)}}`);
    content = `<g class="pg-camera" style="animation: ${uid}cam ${r2(cam.T)}s linear infinite;">${content}</g>`;
  }
  if (st.wholeFilter && filterRef) content = `<g filter="${filterRef}">${content}</g>`;
  if (st.overlay) content += `<g class="pg-style-overlay" pointer-events="none">${st.overlay(uid, W, H)}</g>`;
  // The sound goes with the picture, for the studio, the clip player and video export to play
  if (cues.length) {
    opts.sound = soundTrack(cues, soundLoop);
    content += `<metadata class="pg-sound">${esc(JSON.stringify(opts.sound))}</metadata>`;
  }
  const motionDefs = motionCss.length ? `<style><![CDATA[${motionCss.join('\n')}]]></style>` : '';
  return svgDoc({ width: W, height: H, viewBox: `0 0 ${W} ${H}`, defs: fx.defs + motionDefs, content });
}
