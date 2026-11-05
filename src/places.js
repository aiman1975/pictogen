// More places for a scene's backdrop, each with its own gentle movement: a desert (dunes, cacti, a
// hot sun), mountains (snowy peaks), space (planets, a lunar ground, twinkling stars), underwater
// (light rays, seaweed swaying, bubbles rising), a farm (a barn, a silo, a fence, crop rows), a
// jungle (big leaves, hanging vines), a castle on a hill (flags waving), autumn (leaves falling), and
// a shooting star on clear nights. Drawn with the kit like the rest of the backdrop (kind 'bg'), so
// every style renders them its own way; the movement is in PLACE_CSS.

import { darken, lighten, mix } from './core/color.js';

const bg = { kind: 'bg' };
const r2 = (v) => Math.round(v * 100) / 100;
// Spread over time: a negative delay, so a still picture already shows them part way
const delay = (rng, span) => `animation-delay: -${r2(rng() * span)}s;`;

/** The words that call up each place (scene.js ENV_WORDS) */
export const PLACE_ENV_WORDS = {
  desert: ['desert', 'deserts', 'dunes', 'dune', 'sahara', 'oasis'],
  mountains: ['mountains', 'mountain', 'alps', 'peaks', 'valley', 'hills'],
  space: ['space', 'outer', 'galaxy', 'planets', 'universe', 'cosmos', 'orbit', 'spaceship', 'starship'],
  underwater: ['underwater', 'seabed', 'reef', 'seafloor'],
  farm: ['farm', 'farmyard', 'barn', 'fields', 'countryside', 'ranch'],
  jungle: ['jungle', 'rainforest'],
  castle: ['castle', 'kingdom', 'palace', 'fairytale', 'fairy-tale'],
  autumn: ['autumn', 'autumnal'],
  fireflies: ['fireflies', 'firefly'],
  // (up in the sky, on the clouds: said as "up in the sky", "above the clouds", "on a cloud")
  sky: ['skyland', 'cloudland'],
};

// ---------------------------------------------------------------------------------------------
// "Your places" (scene maker, step 2): a place made in the studio - where, when, the weather and
// what moves - kept under a name. The studio sends it with a neutral key ("pgp1"), never the name:
//   opts.places: [{ key: 'pgp1', place: 'farm', time: 'sunset', weather: 'snow', extras: ['mountains', 'fireflies'] }]
// and the key in a prompt ("Tom waves in pgp1") sets the scene's backdrop.

/** What can be picked: the place, the time of day, the weather, and things in it (some moving) */
export const PLACE_CHOICES = {
  place: ['meadow', 'park', 'forest', 'city', 'beach', 'sea', 'desert', 'mountains', 'sky', 'space', 'underwater', 'farm', 'jungle', 'castle', 'classroom', 'office', 'kitchen', 'bedroom', 'room'],
  time: ['day', 'sunset', 'night'],
  weather: ['clear', 'rain', 'snow', 'autumn'],
  extras: ['mountains', 'castle', 'stars', 'shooting', 'clouds', 'fireflies', 'bubbles', 'leaves', 'butterflies'],
  // a room's things, on the wall and the floor; its board: a chalkboard or a whiteboard
  things: ['board', 'window', 'clock', 'shelf', 'plant', 'map', 'poster', 'bunting', 'lamp'],
  board: ['chalk', 'white'],
};
const HEX = /^#[0-9a-f]{6}$/i;
const ROOMS = new Set(['classroom', 'office', 'kitchen', 'bedroom', 'room']);
// (place flags that pick the backdrop; a setting turns all of them off first)
const PLACE_FLAGS = ['room', 'water', 'beach', 'woods', 'park', 'city', 'sky', 'space', 'underwater', 'desert', 'farm', 'jungle', 'mountains', 'castle'];

/** A place as sent, checked: anything unknown left out ({ place, time, weather, extras }) or null */
export function cleanPlace(p) {
  if (!p || typeof p !== 'object') return null;
  const one = (k, d) => (PLACE_CHOICES[k].includes(p[k]) ? p[k] : d);
  const extras = Array.isArray(p.extras) ? [...new Set(p.extras.filter((x) => PLACE_CHOICES.extras.includes(x)))] : [];
  // (a room's own colours, things and board)
  const room = {};
  if (HEX.test(p.wall ?? '')) room.wall = p.wall;
  if (HEX.test(p.floor ?? '')) room.floor = p.floor;
  if (Array.isArray(p.things)) room.things = [...new Set(p.things.filter((x) => PLACE_CHOICES.things.includes(x)))];
  if (PLACE_CHOICES.board.includes(p.board)) room.board = p.board;
  if (typeof p.boardText === 'string' && p.boardText.trim()) room.boardText = p.boardText.trim().slice(0, 60);
  return { place: one('place', 'meadow'), time: one('time', 'day'), weather: one('weather', 'clear'), extras, ...room };
}

/** opts.places -> Map key -> place (keys "pgp1".."pgp99", at most 24) */
export function placeKeys(list) {
  const out = new Map();
  if (!Array.isArray(list)) return out;
  for (const p of list.slice(0, 24)) {
    const key = typeof p?.key === 'string' ? p.key.toLowerCase() : '';
    const clean = /^pgp\d{1,2}$/.test(key) && cleanPlace(p);
    if (clean) out.set(key, clean);
  }
  return out;
}

/**
 * Takes a place's key out of a prompt ("Tom waves in pgp1" -> "Tom waves"): the first one known
 * is the scene's setting. Keys not known are taken out too (nothing to draw for them).
 */
export function takePlace(text, places) {
  let setting = null;
  const out = String(text ?? '').replace(/(?:\b(?:in|at|on|inside|into|to|near|by|from|around|through|across)\s+(?:the\s+)?)?\bpgp\d{1,2}\b/gi, (m) => {
    const key = m.match(/pgp\d+/i)[0].toLowerCase();
    if (!setting && places?.has(key)) setting = places.get(key);
    return ' ';
  }).replace(/\s+([,.!?;:])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  return { text: out, setting };
}

/**
 * A scene's surroundings (scene.js detectEnv) set by one of "your places": its place, and its time
 * and weather unless the prompt says its own ("pgp1 at night"). force: the time and weather as
 * given, whatever the prompt says (a place chosen on the studio's scene card).
 */
export function applySetting(env, setting, { force = false } = {}) {
  const s = cleanPlace(setting);
  if (!s) return env;
  const out = { ...env };
  for (const f of PLACE_FLAGS) out[f] = false;
  out.roomKind = null;
  const p = s.place;
  if (ROOMS.has(p)) {
    out.room = true; out.roomKind = p;
    // (its own colours, things and board: src/scene.js roomDecor)
    if (s.wall || s.floor || s.things || s.board || s.boardText) out.roomCustom = { wall: s.wall, floor: s.floor, board: s.board, boardText: s.boardText, ...(s.things ? { things: new Set(s.things) } : {}) };
  }
  else if (p === 'forest') out.woods = true;
  else if (p === 'beach') { out.water = true; out.beach = true; }
  else if (p === 'sea') out.water = true;
  else if (p !== 'meadow') out[p] = true;
  // (a room has no sky: its time shows in the window, its weather not at all)
  if (force || (!env.night && !env.sunset)) { out.night = s.time === 'night'; out.sunset = s.time === 'sunset'; }
  if (force && out.room) { out.rain = false; out.snow = false; out.autumn = false; }
  if ((force || (!env.rain && !env.snow && !env.autumn)) && !out.room) {
    out.rain = s.weather === 'rain'; out.snow = s.weather === 'snow'; out.autumn = s.weather === 'autumn';
  }
  const x = new Set(s.extras);
  if (!out.room && !out.space && !out.underwater && !out.sky) {
    if (x.has('mountains')) out.mountains = true;
    if (x.has('castle')) out.castle = true;
  }
  // (with what the words set moving: "a shooting star", "fireflies")
  out.extras = new Set([...(env.extras ?? []), ...x]);
  out.parallax = env.parallax && !out.room;
  return out;
}

/** Things that move in a place made in the studio (and "clouds drifting", "fireflies" said in words) */
export function extras(d, env, rng, W, H, hY) {
  const x = env.extras ?? new Set();
  if (x.has('clouds') && !env.underwater && !env.space) {
    for (let i = 0; i < 3; i++) {
      d.group({ class: 'pg-env-cloud', style: delay(rng, 30) }, () => {
        const cx = W * (0.12 + i * 0.32 + rng() * 0.08), cy = H * (0.08 + rng() * 0.12), s = 16 + rng() * 10;
        const c = env.night ? '#5c6b8a' : env.rain ? '#cfd8dc' : '#ffffff';
        for (const [dx, dy, r] of [[-1.1, 0.25, 0.75], [0, 0, 1], [1.1, 0.2, 0.8], [0.5, 0.45, 0.7], [-0.5, 0.45, 0.7]]) d.circle(cx + dx * s, cy + dy * s, r * s, { ...bg, fill: c });
      });
    }
  }
  if (x.has('fireflies')) {
    for (let i = 0; i < 14; i++) {
      d.group({ class: 'pg-env-firefly', style: delay(rng, 4) }, () => {
        const fx = rng() * W, fy = hY - H * 0.15 + rng() * H * 0.3;
        d.circle(fx, fy, 4, { ...bg, fill: '#fff59d', opacity: 0.35 });
        d.circle(fx, fy, 1.6, { ...bg, fill: '#ffee58' });
      });
    }
  }
  if (x.has('bubbles') && !env.underwater) {
    for (let i = 0; i < 10; i++) {
      d.group({ class: 'pg-env-bubble', style: delay(rng, 6) }, () => {
        const bx = rng() * W, by = H * (0.7 + rng() * 0.25), r = 4 + rng() * 6;
        d.circle(bx, by, r, { kind: 'line', stroke: '#b3e5fc', sw: 1.4, fill: 'none', opacity: 0.9 });
        d.circle(bx - r * 0.35, by - r * 0.35, r * 0.22, { ...bg, fill: '#ffffff', opacity: 0.9 });
      });
    }
  }
  if (x.has('butterflies') && !env.underwater && !env.space) {
    for (let i = 0; i < 4; i++) {
      d.group({ class: 'pg-env-butterfly', style: delay(rng, 6) }, () => {
        const bx = W * (0.1 + rng() * 0.8), by = hY - H * (0.05 + rng() * 0.2), c = ['#f06292', '#ffb300', '#7e57c2', '#29b6f6'][i % 4];
        d.ellipse(bx - 6, by - 2, 6.5, 5, { ...bg, fill: c });
        d.ellipse(bx + 6, by - 2, 6.5, 5, { ...bg, fill: c });
        d.ellipse(bx - 4.5, by + 4, 4, 3, { ...bg, fill: darken(c, 0.15) });
        d.ellipse(bx + 4.5, by + 4, 4, 3, { ...bg, fill: darken(c, 0.15) });
        d.ellipse(bx, by, 1.6, 6, { ...bg, fill: '#3e2723' });
      });
    }
  }
}

/** Sky colours for the places that have their own */
export function placeSky(env, sky) {
  if (env.space) return ['#0b1026', '#141a3d', '#1d2350'];
  if (env.desert && !env.night && !env.sunset) return ['#ffcf73', '#ffe0a0', '#fff0cc'];
  return sky;
}

// A shooting star the story talks about: big and bright, crossing the sky as the scene starts
export function bigShootingStar(d, W, H) {
  d.group({ class: 'pg-env-shooting-big' }, () => {
    const x = W * 0.3, y = H * 0.14, L = W * 0.2;
    // (the tail: three streaks that fade, then the glowing star)
    d.poly([[x - L, y - L * 0.32], [x - 2, y - 5], [x + 2, y + 5]], { ...bg, fill: '#fff59d', opacity: 0.35 });
    d.line(x - L * 0.75, y - L * 0.26, x, y, { kind: 'line', stroke: '#fffde7', sw: 2.4, opacity: 0.85 });
    d.circle(x, y, 9, { ...bg, fill: '#fff59d', opacity: 0.35 });
    const pts = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 2.6 : 6.5; pts.push([r2(x + Math.cos(a) * r), r2(y + Math.sin(a) * r)]); }
    d.poly(pts, { ...bg, fill: '#ffeb3b' });
  });
}

export function shootingStar(d, rng, W, H) {
  d.group({ class: 'pg-env-shooting', style: delay(rng, 7) }, () => {
    const x = W * (0.1 + rng() * 0.3), y = H * (0.05 + rng() * 0.12);
    d.line(x - 34, y - 14, x, y, { kind: 'line', stroke: '#fff8e1', sw: 1.6, opacity: 0.7 });
    d.circle(x, y, 2.2, { ...bg, fill: '#ffffff' });
  });
}

// Up in the sky: no ground, a soft bank of clouds to stand on, the far clouds below the horizon
export function skyland(d, env, pal, rng, W, H, hY) {
  const [far, near, light] = env.night ? ['#2f3d73', '#46559a', '#5f6fb4'] : env.sunset ? ['#f7c6b0', '#ffe2d4', '#fff1ea'] : ['#cfe6fb', '#f4f9ff', '#ffffff'];
  // (far clouds along the horizon, smaller)
  for (let x = -20; x < W + 40; x += W / 11) d.circle(x + rng() * 18, hY + H * 0.02, H * (0.04 + rng() * 0.03), { ...bg, fill: far });
  d.rect(0, hY + H * 0.02, W, H, { ...bg, fill: far });
  // (the bank in front, round tops, a lighter edge)
  for (let x = -30; x < W + 40; x += W / 8) {
    const y = hY + H * (0.1 + rng() * 0.03), r = H * (0.08 + rng() * 0.04);
    d.circle(x + rng() * 20, y, r, { ...bg, fill: near });
    d.circle(x + rng() * 20 - r * 0.2, y - r * 0.25, r * 0.55, { ...bg, fill: light, opacity: 0.7 });
  }
  d.rect(0, hY + H * 0.12, W, H, { ...bg, fill: near });
  for (let x = -20; x < W + 40; x += W / 6) d.circle(x + rng() * 30, H * (0.96 + rng() * 0.03), H * (0.07 + rng() * 0.03), { ...bg, fill: light, opacity: 0.55 });
}

export function space(d, env, pal, rng, W, H, hY) {
  // Nebulas, many stars, a ringed planet and two small ones, then a grey lunar ground with craters
  // (soft clouds of colour mixed into the sky, not see-through: every style can draw them)
  for (const [x, y, r, c] of [[0.25, 0.3, 0.22, '#7e57c2'], [0.7, 0.18, 0.18, '#26a69a'], [0.5, 0.45, 0.16, '#ec407a']]) d.circle(W * x, H * y, H * r, { ...bg, fill: mix('#141a3d', c, 0.16) });
  for (let i = 0; i < 70; i++) {
    d.group({ class: 'pg-env-star', style: delay(rng, 2) }, () => d.circle(rng() * W, rng() * hY * 0.95, 0.7 + rng() * 1.5, { ...bg, fill: '#fff8e1' }));
  }
  d.group({ class: 'pg-env-planet' }, () => {
    const x = W * 0.8, y = H * 0.24, r = H * 0.09;
    d.ellipse(x, y, r * 1.9, r * 0.5, { kind: 'line', stroke: '#ffe0b2', sw: 3, fill: 'none', opacity: 0.85, transform: `rotate(-16 ${r2(x)} ${r2(y)})` });
    d.circle(x, y, r, { ...bg, fill: '#f4a261' });
    d.ellipse(x, y - r * 0.3, r * 0.92, r * 0.16, { ...bg, fill: '#e76f51', opacity: 0.6 });
    d.ellipse(x, y + r * 0.25, r * 0.95, r * 0.14, { ...bg, fill: '#ffd8a8', opacity: 0.6 });
  });
  d.circle(W * 0.14, H * 0.16, H * 0.035, { ...bg, fill: '#4fc3f7' });
  d.circle(W * 0.42, H * 0.1, H * 0.02, { ...bg, fill: '#ef5350' });
  const rock = '#9aa0a6';
  d.rect(0, hY, W, H - hY, { ...bg, fill: rock });
  d.ellipse(W * 0.2, hY + 4, W * 0.35, H * 0.06, { ...bg, fill: lighten(rock, 0.15) });
  d.ellipse(W * 0.8, hY + 6, W * 0.4, H * 0.05, { ...bg, fill: lighten(rock, 0.1) });
  for (let i = 0; i < 9; i++) {
    const x = rng() * W, y = hY + H * 0.06 + rng() * (H - hY - H * 0.1), rx = 8 + rng() * 18;
    d.ellipse(x, y, rx, rx * 0.35, { ...bg, fill: darken(rock, 0.18) });
    d.ellipse(x, y - rx * 0.06, rx * 0.8, rx * 0.24, { ...bg, fill: darken(rock, 0.08) });
  }
}

export function underwater(d, env, pal, rng, W, H, hY) {
  // Deep water, light rays from the surface, a sandy seabed with rocks and coral, seaweed
  // swaying, bubbles rising
  const top = env.night ? '#0a2a4a' : '#1e88c7', mid = env.night ? '#08213b' : '#1268a3', low = env.night ? '#061a2e' : '#0b4f80';
  d.rect(0, 0, W, H, { ...bg, fill: top });
  d.rect(0, H * 0.35, W, H * 0.65, { ...bg, fill: mid });
  d.rect(0, H * 0.6, W, H * 0.4, { ...bg, fill: low });
  d.group({ class: 'pg-env-rays' }, () => {
    for (const x of [0.15, 0.38, 0.62, 0.85]) {
      d.path(`M${r2(W * x - 14)} 0 L${r2(W * x + 14)} 0 L${r2(W * x + 60)} ${r2(H * 0.8)} L${r2(W * x + 10)} ${r2(H * 0.8)} Z`, { ...bg, fill: '#ffffff', opacity: 0.07 });
    }
  });
  const sand = env.night ? darken('#e6c88a', 0.45) : '#e6c88a';
  d.path(`M0 ${r2(hY + H * 0.08)} Q${r2(W * 0.25)} ${r2(hY + H * 0.03)} ${r2(W * 0.5)} ${r2(hY + H * 0.08)} T${W} ${r2(hY + H * 0.06)} L${W} ${H} L0 ${H} Z`, { ...bg, fill: sand });
  for (const [x, r] of [[0.08, 18], [0.9, 24], [0.55, 12]]) d.ellipse(W * x, hY + H * 0.1, r * 1.4, r * 0.8, { ...bg, fill: darken(sand, 0.3) });
  for (const [x, c] of [[0.2, '#ff7043'], [0.74, '#ec407a'], [0.95, '#ffca28']]) {
    for (let k = -1; k <= 1; k++) d.path(`M${r2(W * x)} ${r2(hY + H * 0.1)} q${k * 10} -14 ${k * 6} -26`, { kind: 'line', stroke: c, sw: 4, fill: 'none' });
  }
  for (const x of [0.04, 0.12, 0.33, 0.66, 0.86, 0.97]) {
    d.group({ class: 'pg-env-seaweed', style: delay(rng, 4) }, () => {
      const base = hY + H * 0.12, h = H * (0.18 + rng() * 0.16);
      d.path(`M${r2(W * x)} ${r2(base)} q-8 ${r2(-h / 3)} 0 ${r2(-h / 2)} q8 ${r2(-h / 6)} 0 ${r2(-h / 2)}`, { kind: 'line', stroke: env.night ? '#2e5d3a' : '#43a047', sw: 5, fill: 'none' });
    });
  }
  for (let i = 0; i < 16; i++) {
    d.group({ class: 'pg-env-bubble', style: delay(rng, 6) }, () => {
      const x = rng() * W, y = H * (0.75 + rng() * 0.2), r = 2 + rng() * 4;
      d.circle(x, y, r, { kind: 'line', stroke: '#e1f5fe', sw: 1.2, fill: 'none', opacity: 0.8 });
      d.circle(x - r * 0.3, y - r * 0.3, r * 0.25, { ...bg, fill: '#ffffff', opacity: 0.8 });
    });
  }
}

export function desert(d, env, pal, rng, W, H, hY) {
  // A hot sun (by day), dunes in layers, cacti on the horizon, rippled sand
  const sand = env.night ? darken('#f3d39b', 0.5) : env.sunset ? mix('#f3d39b', '#ff7043', 0.18) : '#f3d39b';
  if (!env.night && !env.sunset) {
    d.circle(W * 0.82, H * 0.2, H * 0.11, { ...bg, fill: '#fff59d', opacity: 0.45 });
    d.circle(W * 0.82, H * 0.2, H * 0.07, { ...bg, fill: '#ffeb3b' });
  }
  const dune = (y, amp, color) => d.path(`M0 ${r2(y)} Q${r2(W * 0.15)} ${r2(y - amp)} ${r2(W * 0.32)} ${r2(y)} T${r2(W * 0.66)} ${r2(y)} T${W} ${r2(y)} L${W} ${H} L0 ${H} Z`, { ...bg, fill: color });
  dune(hY - H * 0.05, H * 0.08, darken(sand, 0.16));
  for (const [x, s] of [[0.12, 1], [0.58, 0.8], [0.88, 0.65]]) {
    const c = env.night ? '#2f4a2a' : '#5b8c3e', bx = W * x, by = hY - H * 0.02, h = H * 0.13 * s, w = h * 0.18;
    d.rect(bx - w / 2, by - h, w, h, { ...bg, fill: c, rx: w / 2 });
    d.path(`M${r2(bx - w / 2)} ${r2(by - h * 0.45)} h${r2(-w * 0.9)} v${r2(-h * 0.3)}`, { kind: 'line', stroke: c, sw: r2(w * 0.8), fill: 'none' });
    d.path(`M${r2(bx + w / 2)} ${r2(by - h * 0.6)} h${r2(w * 0.9)} v${r2(-h * 0.25)}`, { kind: 'line', stroke: c, sw: r2(w * 0.8), fill: 'none' });
  }
  dune(hY + H * 0.02, H * 0.05, darken(sand, 0.06));
  d.rect(0, hY + H * 0.06, W, H, { ...bg, fill: sand });
  for (let i = 0; i < 10; i++) {
    const x = rng() * W, y = hY + H * 0.1 + rng() * (H - hY - H * 0.14), s = 14 + rng() * 22;
    d.path(`M${r2(x - s)} ${r2(y)} q${r2(s / 2)} -4 ${r2(s)} 0 q${r2(s / 2)} -4 ${r2(s)} 0`, { kind: 'line', stroke: darken(sand, 0.15), sw: 1.4, fill: 'none', opacity: 0.6 });
  }
}

export function mountains(d, env, pal, rng, W, H, hY) {
  // Two ranges of peaks behind the hills, the far ones snowy
  const far = mix(pal.sky[2], '#78909c', 0.55), near = mix(pal.ground[0], '#546e7a', 0.45);
  const range = (base, peaks, color, snow) => {
    let x = -W * 0.08;
    while (x < W * 1.05) {
      const w = W * (0.18 + rng() * 0.12), h = H * peaks * (0.7 + rng() * 0.5);
      d.path(`M${r2(x)} ${r2(base)} L${r2(x + w / 2)} ${r2(base - h)} L${r2(x + w)} ${r2(base)} Z`, { ...bg, fill: color });
      if (snow) d.path(`M${r2(x + w / 2)} ${r2(base - h)} L${r2(x + w / 2 - w * 0.12)} ${r2(base - h * 0.76)} L${r2(x + w / 2 - w * 0.03)} ${r2(base - h * 0.8)} L${r2(x + w / 2 + w * 0.05)} ${r2(base - h * 0.72)} L${r2(x + w / 2 + w * 0.12)} ${r2(base - h * 0.77)} Z`, { ...bg, fill: env.night ? '#cfd8dc' : '#ffffff' });
      x += w * (0.55 + rng() * 0.25);
    }
  };
  range(hY + 2, 0.4, far, true);
  range(hY + 2, 0.22, near, false);
}

export function farm(d, env, pal, rng, W, H, hY) {
  // Crop rows in the fields, a red barn and a silo, a fence in front of them
  for (let i = 0; i < 6; i++) {
    const y = hY + i * H * 0.022;
    d.rect(0, y, W, H * 0.022, { ...bg, fill: i % 2 ? mix(pal.ground[1], '#cddc39', 0.35) : mix(pal.ground[1], '#7cb342', 0.2) });
  }
  const red = env.night ? '#7f2a2a' : '#c62828', bx = W * 0.72, by = hY + H * 0.02, bw = W * 0.14, bh = H * 0.15;
  d.rect(bx + bw + 6, by - bh * 1.15, bw * 0.32, bh * 1.15, { ...bg, fill: env.night ? '#607d8b' : '#b0bec5' });
  d.ellipse(bx + bw + 6 + bw * 0.16, by - bh * 1.15, bw * 0.16, 5, { ...bg, fill: env.night ? '#78909c' : '#cfd8dc' });
  d.rect(bx, by - bh, bw, bh, { ...bg, fill: red });
  d.path(`M${r2(bx - 4)} ${r2(by - bh)} L${r2(bx + bw / 2)} ${r2(by - bh * 1.55)} L${r2(bx + bw + 4)} ${r2(by - bh)} Z`, { ...bg, fill: darken(red, 0.25) });
  d.rect(bx + bw * 0.32, by - bh * 0.62, bw * 0.36, bh * 0.62, { ...bg, fill: darken(red, 0.15) });
  d.path(`M${r2(bx + bw * 0.32)} ${r2(by - bh * 0.62)} L${r2(bx + bw * 0.68)} ${r2(by)} M${r2(bx + bw * 0.68)} ${r2(by - bh * 0.62)} L${r2(bx + bw * 0.32)} ${r2(by)}`, { kind: 'line', stroke: '#ffffff', sw: 1.6 });
  d.rect(bx + bw * 0.42, by - bh * 1.1, bw * 0.16, bh * 0.22, { ...bg, fill: '#ffffff' });
  const wood = env.night ? '#5d4037' : '#a1887f', fy = hY + H * 0.1;
  for (let x = W * 0.02; x < W * 0.6; x += W * 0.04) d.rect(x, fy - H * 0.055, 4, H * 0.06, { ...bg, fill: wood });
  for (const dy of [0.04, 0.02]) d.rect(0, fy - H * dy, W * 0.62, 3, { ...bg, fill: wood });
}

export function jungle(d, env, pal, rng, W, H, hY) {
  // A wall of big leaves along the horizon and vines hanging from the top, swaying
  const dark = env.night ? '#1b3a24' : '#1b5e20', mid = env.night ? '#24482c' : '#2e7d32', light = env.night ? '#2d5a36' : '#43a047';
  for (const [color, y0, n] of [[dark, hY - H * 0.12, 14], [mid, hY - H * 0.04, 12]]) {
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * W + (rng() - 0.5) * 30, rx = 26 + rng() * 22;
      d.ellipse(x, y0 + rng() * 10, rx, rx * 0.55, { ...bg, fill: color, transform: `rotate(${r2((rng() - 0.5) * 50)} ${r2(x)} ${r2(y0)})` });
    }
  }
  for (const x of [0.06, 0.22, 0.48, 0.71, 0.93]) {
    d.group({ class: 'pg-env-vine', style: delay(rng, 5) }, () => {
      const len = H * (0.18 + rng() * 0.22), vx = W * x;
      d.path(`M${r2(vx)} 0 q6 ${r2(len / 3)} 0 ${r2(len / 2)} q-6 ${r2(len / 4)} 0 ${r2(len / 2)}`, { kind: 'line', stroke: light, sw: 2.5, fill: 'none' });
      for (let k = 1; k < 5; k++) d.ellipse(vx + (k % 2 ? 4 : -4), (len * k) / 5, 5, 2.6, { ...bg, fill: light, transform: `rotate(${k % 2 ? 30 : -30} ${r2(vx + (k % 2 ? 4 : -4))} ${r2((len * k) / 5)})` });
    });
  }
}

export function castle(d, env, pal, rng, W, H, hY) {
  // A castle on a hill behind the scene: walls with battlements, towers with pointed roofs, flags
  const stone = env.night ? '#546e7a' : '#b0bec5', roof = env.night ? '#4a2c6e' : '#7e57c2', cx = W * 0.7, base = hY - H * 0.02;
  d.ellipse(cx, hY + H * 0.02, W * 0.3, H * 0.09, { ...bg, fill: mix(pal.ground[0], '#33691e', 0.2) });
  const wallW = W * 0.2, wallH = H * 0.12;
  d.rect(cx - wallW / 2, base - wallH, wallW, wallH, { ...bg, fill: stone });
  for (let x = cx - wallW / 2; x < cx + wallW / 2 - 4; x += 9) d.rect(x, base - wallH - 5, 5, 5, { ...bg, fill: stone });
  d.path(`M${r2(cx - 9)} ${r2(base)} L${r2(cx - 9)} ${r2(base - 16)} Q${r2(cx)} ${r2(base - 26)} ${r2(cx + 9)} ${r2(base - 16)} L${r2(cx + 9)} ${r2(base)} Z`, { ...bg, fill: darken(stone, 0.4) });
  for (const [x, h] of [[-0.55, 0.22], [0.55, 0.22], [0, 0.3]]) {
    const tx = cx + x * wallW, tw = W * 0.045, th = H * h;
    d.rect(tx - tw / 2, base - th, tw, th, { ...bg, fill: darken(stone, 0.06) });
    d.path(`M${r2(tx - tw / 2 - 3)} ${r2(base - th)} L${r2(tx)} ${r2(base - th - H * 0.08)} L${r2(tx + tw / 2 + 3)} ${r2(base - th)} Z`, { ...bg, fill: roof });
    d.rect(tx - 2, base - th * 0.6, 4, 7, { ...bg, fill: env.night ? '#ffe082' : darken(stone, 0.45), rx: 2 });
    d.line(tx, base - th - H * 0.08, tx, base - th - H * 0.12, { kind: 'line', stroke: '#455a64', sw: 1.2 });
    d.group({ class: 'pg-env-flag', style: delay(rng, 1.6) }, () => d.path(`M${r2(tx)} ${r2(base - th - H * 0.12)} l12 3 l-12 4 Z`, { ...bg, fill: '#ef5350' }));
  }
}

export function autumnLeaves(d, env, rng, W, H) {
  for (let i = 0; i < 16; i++) {
    d.group({ class: 'pg-env-leaf', style: delay(rng, 7) }, () => {
      const x = rng() * W * 0.9, y = rng() * H * 0.4, c = ['#ef6c00', '#d84315', '#f9a825', '#8d6e63'][i % 4];
      d.ellipse(x, y, 4.5, 2.4, { ...bg, fill: env.night ? darken(c, 0.4) : c, transform: `rotate(${r2(rng() * 180)} ${r2(x)} ${r2(y)})` });
    });
  }
}

export const PLACE_CSS = `
/* Places: bubbles rise, seaweed and vines sway, leaves fall, flags wave, light rays shimmer, a
   ringed planet floats, a shooting star crosses a clear night */
@keyframes pgBubbleRise { 0% { transform: translateY(0); opacity: 0; } 12% { opacity: 0.9; } 100% { transform: translateY(-230px); opacity: 0; } }
.pg-env-bubble { animation: pgBubbleRise 6s linear infinite; }
@keyframes pgSway { 0%, 100% { transform: rotate(-7deg); } 50% { transform: rotate(7deg); } }
.pg-env-seaweed { transform-box: fill-box; transform-origin: 50% 100%; animation: pgSway 4s ease-in-out infinite; }
.pg-env-vine { transform-box: fill-box; transform-origin: 50% 0%; animation: pgSway 5s ease-in-out infinite; }
@keyframes pgLeafFall { 0% { transform: translate(0, 0) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 100% { transform: translate(50px, 250px) rotate(330deg); opacity: 0; } }
.pg-env-leaf { transform-box: fill-box; transform-origin: center; animation: pgLeafFall 7s linear infinite; }
@keyframes pgFlag { 0%, 100% { transform: skewY(0deg) scaleX(1); } 50% { transform: skewY(8deg) scaleX(0.85); } }
.pg-env-flag { transform-box: fill-box; transform-origin: 0% 50%; animation: pgFlag 1.6s ease-in-out infinite; }
@keyframes pgRays { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
.pg-env-rays { animation: pgRays 5s ease-in-out infinite; }
@keyframes pgPlanetFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
.pg-env-planet { animation: pgPlanetFloat 6s ease-in-out infinite; }
@keyframes pgCloudSail { 0% { transform: translateX(0); } 50% { transform: translateX(46px); } 100% { transform: translateX(0); } }
.pg-env-cloud { animation: pgCloudSail 30s ease-in-out infinite; }
@keyframes pgFirefly { 0%, 100% { transform: translate(0, 0); opacity: 0.2; } 25% { transform: translate(9px, -6px); opacity: 1; } 50% { transform: translate(3px, -12px); opacity: 0.4; } 75% { transform: translate(-7px, -4px); opacity: 1; } }
.pg-env-firefly { animation: pgFirefly 4s ease-in-out infinite; }
@keyframes pgFlutter { 0%, 100% { transform: translate(0, 0) scaleX(1); } 25% { transform: translate(14px, -8px) scaleX(0.3); } 50% { transform: translate(26px, 2px) scaleX(1); } 75% { transform: translate(12px, 8px) scaleX(0.3); } }
.pg-env-butterfly { transform-box: fill-box; transform-origin: center; animation: pgFlutter 6s ease-in-out infinite; }
@keyframes pgShoot { 0%, 80% { transform: translate(0, 0); opacity: 0; } 83% { opacity: 1; } 100% { transform: translate(280px, 110px); opacity: 0; } }
.pg-env-shooting { animation: pgShoot 7s ease-in infinite; }
@keyframes pgShootBig { 0% { transform: translate(-60px, -24px); opacity: 0; } 8% { opacity: 1; } 55% { opacity: 1; } 70%, 100% { transform: translate(260px, 104px); opacity: 0; } }
.pg-env-shooting-big { animation: pgShootBig 4.5s ease-in 0.3s infinite both; }
`;
