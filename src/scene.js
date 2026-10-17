// Scene composer: places matched concepts into a simple illustrated scene
// (sky / ground / water, day / night / sunset / snow / rain) for stories, slides and blog posts.

import { getConcept } from './concepts/index.js';
import { createKit } from './core/kit.js';
import { createRng } from './core/rng.js';
import { drawConcept, shapesToSvg, svgDoc, newUid, styleWrap } from './core/render.js';
import { getStyle } from './core/styles.js';
import { darken, lighten, mix } from './core/color.js';

export const ENV_WORDS = {
  night: ['night', 'midnight', 'nighttime', 'dark', 'bedtime', 'sleep', 'sleeping', 'asleep', 'moon', 'stars'],
  sunset: ['sunset', 'sunrise', 'dusk', 'dawn', 'evening'],
  snow: ['snow', 'snowy', 'snowing', 'winter', 'christmas', 'frozen', 'blizzard'],
  rain: ['rain', 'raining', 'rainy', 'storm', 'stormy', 'thunder', 'cloudy'],
  water: ['sea', 'ocean', 'lake', 'river', 'beach', 'pond', 'swim', 'swimming', 'sail', 'sailing', 'water', 'island', 'boat'],
  beach: ['beach', 'sand', 'island', 'shore'],
  room: ['room', 'office', 'indoor', 'inside', 'house', 'studio', 'classroom', 'kitchen', 'bedroom', 'desk'],
  forest: ['forest', 'woods', 'park', 'nature', 'jungle', 'garden'],
  parallax: ['walk', 'walking', 'run', 'running', 'jog', 'jogging', 'stroll', 'across', 'drive', 'driving', 'road', 'street', 'cartoon', 'parallax', 'zeichentrick'],
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function detectEnv(items, words) {
  const w = new Set(words);
  const any = (k) => ENV_WORDS[k].some((x) => w.has(x));
  const ids = new Set(items.map((i) => i.c.id));
  const tags = new Set(items.flatMap((i) => i.c.tags || []));
  const sunset = any('sunset');
  const room = any('room') || tags.has('furniture') || ['chair', 'table', 'window', 'door', 'bed', 'box'].some((id) => ids.has(id));
  const parallax = any('parallax') || items.some((it) => ['walk', 'run', 'walk-across', 'drive'].includes(it.m?.animation));
  const forest = any('forest') || tags.has('plant') || ids.has('tree');
  return {
    night: !sunset && (any('night') || ((ids.has('moon') || ids.has('star')) && !ids.has('sun'))),
    sunset,
    snow: any('snow') || tags.has('winter'),
    rain: any('rain') || ids.has('rain'),
    water: any('water') || items.some((i) => i.c.placement === 'water' || i.c.placement === 'underwater'),
    beach: any('beach'),
    room,
    forest,
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

function background(W, H, hY, env, pal, rng, hasGroundItems, style = 'flat') {
  const d = createKit();
  const bg = { kind: 'bg' };

  if (env.room) {
    // Exact Image Quadrant 4: Room wall with floor and baseboard line
    const wallColor = style === 'editorial' || style === 'stickman' ? '#fed136' : '#f8fafc';
    const floorColor = style === 'editorial' ? '#eab308' : style === 'stickman' ? '#fed136' : '#f1f5f9';
    const lineStroke = style === 'stickman' ? '#ffffff' : '#000000';
    d.rect(0, 0, W, H, { ...bg, fill: wallColor });
    d.rect(0, H * 0.88, W, H * 0.12, { ...bg, fill: floorColor });
    d.line(0, H * 0.88, W, H * 0.88, { kind: 'line', stroke: lineStroke, sw: 3.5 });
    return d.shapes;
  }

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
  if (style === 'papercut') {
    // Warm craft paper collage background with layered horizon strip (Roadmap Style 8)
    d.rect(0, 0, W, H, { ...bg, fill: '#f4efe6' });
    d.rect(0, H * 0.86, W, H * 0.14, { ...bg, fill: '#e5dccb' });
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
  } else {
    d.ellipse(W * 0.18, hY + H * 0.04, W * 0.38, H * 0.13, { ...bg, fill: pal.ground[0] });
    d.ellipse(W * 0.82, hY + H * 0.05, W * 0.42, H * 0.11, { ...bg, fill: pal.ground[0] });
    d.rect(0, hY, W, H - hY, { ...bg, fill: pal.ground[1] });
    d.rect(0, H * 0.88, W, H * 0.12, { ...bg, fill: pal.ground[2] });
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
const FLAT_BACKDROP_STYLES = ['editorial', 'stickman', 'cute2d', 'whiteboard', 'doodle', 'papercut'];
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

/**
 * Plays the beats out for each actor: where it is (x over time) and which pose it shows.
 * slots: actor id -> { it, cx, w, h } (its place in the composed scene)
 * props: concept id -> { cx, w } (things actors can walk to)
 * Returns { T, tracks: actor id -> [{ t0, t1, x0, x1, pose }] } with times in seconds.
 */
function playTimeline(timeline, slots, props, W) {
  const state = new Map();
  const tracks = new Map();
  for (const [id, slot] of slots) {
    const first = timeline.beats.findIndex((b) => b.actions.some((a) => a.actor === id));
    const firstAction = timeline.beats[first]?.actions.find((a) => a.actor === id);
    const onStage = first === 0 && !['enter', 'moveTo'].includes(firstAction?.type);
    state.set(id, { x: slot.cx, present: onStage, facing: 1, expression: slot.it.m.expression, isPerson: slot.it.c.category === 'people' });
    tracks.set(id, []);
  }
  const off = (id, side) => (side < 0 ? -slots.get(id).w / 2 - 12 : W + slots.get(id).w / 2 + 12);
  const pose = (id, extra = {}) => {
    const st = state.get(id), view = slots.get(id).it.m.view;
    return { expression: st.expression, view: view ?? (st.isPerson ? 'front' : undefined), mirror: !st.isPerson && st.facing < 0, ...extra };
  };
  const posOf = (id) => (state.has(id) && state.get(id).present ? { cx: state.get(id).x, w: slots.get(id).w } : props.get(id) || (slots.has(id) && { cx: slots.get(id).cx, w: slots.get(id).w }));

  let t = 0;
  for (const beat of timeline.beats) {
    const acting = new Map();
    for (const a of beat.actions) {
      if (!slots.has(a.actor)) continue;
      const st = state.get(a.actor), slot = slots.get(a.actor);
      if (a.expression) st.expression = a.expression;
      let move = null, d = 0, shown = null;
      if (a.type === 'enter' || a.type === 'moveTo' || a.type === 'exit') {
        let x0 = st.x, x1;
        if (a.type === 'exit') {
          x1 = off(a.actor, st.x < W / 2 ? -1 : 1);
        } else if (a.type === 'moveTo' && posOf(a.target)) {
          const tgt = posOf(a.target);
          // Come in from the side with more room, or approach from the side you are on
          const side = st.present ? Math.sign(st.x - tgt.cx) || 1 : tgt.cx < W / 2 ? 1 : -1;
          if (!st.present) x0 = off(a.actor, side);
          x1 = clamp(tgt.cx + side * (tgt.w / 2 + slot.w / 2 + W * 0.04), slot.w / 2, W - slot.w / 2);
        } else {
          if (!st.present) x0 = off(a.actor, slot.cx < W / 2 ? -1 : 1);
          x1 = slot.cx;
        }
        const speed = (a.gait === 'run' ? 2 : 0.95) * slot.h;
        d = clamp(Math.abs(x1 - x0) / speed, 0.6, 6);
        st.facing = x1 < x0 ? -1 : 1;
        move = { x0, x1 };
        st.present = true;
        shown = { anim: a.gait, ...pose(a.actor), view: slot.it.m.view ?? (st.isPerson ? 'side' : undefined), mirror: st.facing < 0 };
        st.x = x1;
        if (a.type === 'exit') st.present = false;
      } else if (a.type === 'pose') {
        st.present = true;
        d = GESTURE_SECONDS[a.anim] ?? 2;
        shown = pose(a.actor, { anim: a.anim });
      } else {
        // 'expr' / 'appear'
        d = st.present ? 1.4 : 0.8;
        st.present = true;
      }
      acting.set(a.actor, { d, move, shown });
    }
    const beatLen = Math.max(0.5, ...[...acting.values()].map((a) => a.d));
    for (const [id, st] of state) {
      const act = acting.get(id);
      const track = tracks.get(id);
      let t1 = t;
      if (act?.shown) {
        t1 = t + act.d;
        track.push({ t0: t, t1, x0: act.move ? act.move.x0 : st.x, x1: act.move ? act.move.x1 : st.x, pose: act.shown });
      }
      if (st.present && t1 < t + beatLen) track.push({ t0: t1, t1: t + beatLen, x0: st.x, x1: st.x, pose: pose(id) });
    }
    t += beatLen;
  }
  for (const [id, st] of state) if (st.present) tracks.get(id).push({ t0: t, t1: t + HOLD_SECONDS, x0: st.x, x1: st.x, pose: pose(id) });
  return { T: t + HOLD_SECONDS, tracks };
}

/** Lays out a row of items horizontally; sets it.cx and possibly shrinks it.h. */
function layoutRow(list, W, maxH, rng) {
  if (!list.length) return;
  list.forEach((it) => { it.h = Math.min(it.h, maxH); it.w = it.h * (it.c.width ?? 0.8); });
  const baseGap = (a, b) => (a.c.id === b.c.id ? W * 0.03 : W * 0.035);
  const gaps = list.slice(1).map((it, i) => baseGap(list[i], it));
  const avail = W * 0.92;
  const gapSum = gaps.reduce((s, g) => s + g, 0);
  let widthSum = list.reduce((s, it) => s + it.w, 0);
  if (widthSum + gapSum > avail) {
    const f = Math.max(0.2, (avail - gapSum) / widthSum);
    list.forEach((it) => { it.h *= f; it.w *= f; });
    widthSum *= f;
  } else {
    // spread different objects apart a little when there is room
    const extra = avail - widthSum - gapSum;
    const spread = Math.min(extra / (list.length + 1), W * 0.07);
    gaps.forEach((g, i) => { if (list[i].c.id !== list[i + 1].c.id) gaps[i] += spread; });
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

  const items = [];
  for (const m of matches) {
    const c = getConcept(m.id);
    if (!c) continue;
    const n = clamp(m.count || 1, 1, c.maxCount ?? 5);
    for (let k = 0; k < n; k++) items.push({ c, m, k });
  }
  items.splice(maxItems);

  const { timeline } = opts;
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
    unit = items.length === 1 ? H * 0.65 : items.length === 2 ? H * 0.52 : H * 0.46;
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
  // Everyone walking across keeps the pace of the tallest walker (about 0.9 body heights a second).
  const acrossSpeed = Math.max(45, 0.9 * Math.max(0, ...items.filter((it) => it.m.animation === 'walk-across').map((it) => it.h)));

  const out = [];
  const actorSlots = new Map(); // timeline actors: drawn last, once every position is known
  const propsAt = new Map(); // where things are, for "walks to the tree"
  const place = (it, cx, y, anchor = 'bottom') => {
    const s = it.h / 100;
    const base = anchor === 'bottom' ? it.c.baseline ?? 96 : 50;
    const w = it.w ?? it.h * (it.c.width ?? 0.8);
    if (timeline && it.m.actor && !actorSlots.has(it.c.id)) {
      actorSlots.set(it.c.id, { it, cx, y, s, base, w, h: it.h, olk: clamp(W / 280 / (2.4 * s), 0.35, 4) });
      return;
    }
    if (!propsAt.has(it.c.id)) propsAt.set(it.c.id, { cx, w });
    const x0 = cx - 50 * s, y0 = y - base * s;
    const flip = it.k % 2 === 1 && it.c.flippable !== false;
    const tr = flip ? `translate(${x0 + 100 * s} ${y0}) scale(${-s} ${s})` : `translate(${x0} ${y0}) scale(${s})`;
    const olk = clamp(W / 280 / (2.4 * s), 0.35, 4);
    let animation = it.m.animation;
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
    const view = it.m.view ?? (motion === 'recede' ? 'back' : motion === 'approach' ? 'front' : undefined);
    const shapes = drawConcept(it.c, {
      seed: `${seed}:${it.c.id}:${it.k}`,
      color: it.m.color,
      vary: vary || it.k > 0,
      expression,
      animation: limbs,
      view,
      style,
    });
    let wrappedContent = shapesToSvg(shapes, style, { olk });
    if (limbs && limbs !== 'blink' && !wrappedContent.includes(`pg-anim-${limbs}`)) {
      wrappedContent = `<g class="pg-anim-${limbs}">${wrappedContent}</g>`;
    }
    wrappedContent = `<g class="pg-figure">${wrappedContent}</g>`;
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
    out.push(`<g class="movable-item" data-id="${it.c.id}" data-k="${it.k}" data-label="${it.c.label || it.c.id}"${animAttr}${exprAttr}${viewAttr} transform="${tr.replace(/(\d+\.\d{3})\d+/g, '$1')}" style="cursor: grab;">${wrappedContent}</g>`);
  };

  // One timeline actor: a wrapper moved by keyframes, and one drawing per pose, switched on and off
  // in step with the beats. With animation off (still exports) the last on-screen pose shows in place.
  const renderActor = ({ it, y, s, base, olk, w }, track, T, name) => {
    const onScreen = track.filter((seg) => seg.x1 > -w / 2 && seg.x1 < W + w / 2);
    const last = onScreen[onScreen.length - 1] || track[track.length - 1];
    const home = last ? last.x1 : 0;
    const at = (sec) => pct(sec / T);
    const variants = new Map();
    for (const seg of track) {
      const p = seg.pose;
      const key = `${p.anim}|${p.expression}|${p.view}|${p.mirror}`;
      if (!variants.has(key)) variants.set(key, { pose: p, windows: [] });
      seg.variant = key;
      variants.get(key).windows.push(seg);
    }

    // Position: translateX in the figure's own units, linear between the beats' key points
    let posFrames = '', lastPct = -1;
    for (const seg of track) {
      for (const [sec, x] of [[seg.t0, seg.x0], [seg.t1, seg.x1]]) {
        let pc = Math.max(r2((sec / T) * 100), lastPct === -1 ? 0 : lastPct);
        if (pc === lastPct) pc = r2(pc + 0.01);
        posFrames += `${pc}% { transform: translateX(${r2((x - home) / s)}px); } `;
        lastPct = pc;
      }
    }
    motionCss.push(`@keyframes ${name}p { ${track.length && track[0].t0 > 0 ? `0% { transform: translateX(${r2((track[0].x0 - home) / s)}px); } ` : ''}${posFrames}}`);

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
        seed: `${seed}:${it.c.id}:0`, color: it.m.color, vary, style,
        expression: pose.expression || 'happy', animation: pose.anim, view: pose.view,
      });
      let svg = shapesToSvg(shapes, style, { olk });
      if (pose.anim && !svg.includes(`pg-anim-${pose.anim}`)) svg = `<g class="pg-anim-${pose.anim}">${svg}</g>`;
      if (pose.mirror) svg = `<g transform="translate(100 0) scale(-1 1)">${svg}</g>`;
      const still = last && last.variant === key;
      poses += `<g class="pg-timeline-pose" opacity="${still ? 1 : 0}" style="animation: ${name}v${i} ${r2(T)}s step-end infinite;"><g class="pg-figure">${svg}</g></g>`;
      i++;
    }
    const rx = 50 * (it.c.width ?? 0.8) * 0.72;
    const shadow = shadows ? `<ellipse class="pg-shadow" cx="50" cy="${base}" rx="${r2(rx)}" ry="${r2(Math.max(3, rx * 0.13))}" fill="#000000" opacity="0.16"/>` : '';
    const tr = `translate(${r2(home - 50 * s)} ${r2(y - base * s)}) scale(${r2(s * 1000) / 1000})`;
    return `<g class="movable-item" data-id="${it.c.id}" data-k="0" data-label="${it.c.label || it.c.id}" data-actor="${it.c.id}" transform="${tr}" style="cursor: grab;"><g class="pg-timeline-move" style="animation: ${name}p ${r2(T)}s linear infinite;">${shadow}${poses}</g></g>`;
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

  if (timeline && actorSlots.size) {
    const { T, tracks } = playTimeline(timeline, actorSlots, propsAt, W);
    timeline.duration = r2(T);
    for (const [id, slot] of actorSlots) out.push(renderActor(slot, tracks.get(id), T, `${uid}a${id}`));
  }

  const fx = styleWrap(style, uid, out.join(''), { scale: W / 260, freq: 0.02, blur: W / 450 });
  const bgSvg = shapesToSvg(background(W, H, hY, env, pal, rng, hasGround, style), style);
  const content = `<g stroke-linecap="round" stroke-linejoin="round">${bgSvg}</g>${fx.g}`;
  getStyle(style); // (style validated)
  const motionDefs = motionCss.length ? `<style><![CDATA[${motionCss.join('\n')}]]></style>` : '';
  return svgDoc({ width: W, height: H, viewBox: `0 0 ${W} ${H}`, defs: fx.defs + motionDefs, content });
}
