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
};

/** Sky colours for the places that have their own */
export function placeSky(env, sky) {
  if (env.space) return ['#0b1026', '#141a3d', '#1d2350'];
  if (env.desert && !env.night && !env.sunset) return ['#ffcf73', '#ffe0a0', '#fff0cc'];
  return sky;
}

export function shootingStar(d, rng, W, H) {
  d.group({ class: 'pg-env-shooting', style: delay(rng, 7) }, () => {
    const x = W * (0.1 + rng() * 0.3), y = H * (0.05 + rng() * 0.12);
    d.line(x - 34, y - 14, x, y, { kind: 'line', stroke: '#fff8e1', sw: 1.6, opacity: 0.7 });
    d.circle(x, y, 2.2, { ...bg, fill: '#ffffff' });
  });
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
@keyframes pgShoot { 0%, 80% { transform: translate(0, 0); opacity: 0; } 83% { opacity: 1; } 100% { transform: translate(280px, 110px); opacity: 0; } }
.pg-env-shooting { animation: pgShoot 7s ease-in infinite; }
`;
