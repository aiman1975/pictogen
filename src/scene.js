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
  room: ['room', 'office', 'indoor', 'inside', 'studio', 'classroom', 'kitchen', 'bedroom', 'desk'],
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
  // Standing people face the camera, or turn three-quarters toward someone of another kind nearby
  // (the boy turns to the dog that ran up to him); animals keep facing the way they last went.
  const pose = (key, extra = {}) => {
    const st = state.get(key), slot = slots.get(key), view = slot.it.m.view;
    if (!st.isPerson) return { expression: st.expression, view, mirror: st.facing < 0, ...extra };
    let near = null;
    for (const [other, o] of state) {
      if (!o.present || slots.get(other).id === slot.id || Math.abs(o.x - st.x) > W * 0.4) continue;
      if (!near || Math.abs(o.x - st.x) < Math.abs(near.x - st.x)) near = o;
    }
    if (view || !near) return { expression: st.expression, view: view ?? 'front', mirror: false, ...extra };
    return { expression: st.expression, view: 'three-quarter', mirror: near.x < st.x, ...extra };
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
  for (const beat of timeline.beats) {
    if (beat.camera && !beat.actions.length) {
      // A camera beat: everyone holds still while the camera moves
      const d = CAMERA_SECONDS[beat.camera.type] ?? 1.6;
      camera.push({ ...beat.camera, t0: t, t1: t + d });
      for (const [id, st] of state) if (st.present) tracks.get(id).push({ t0: t, t1: t + d, x0: st.x, x1: st.x, k0: st.k, k1: st.k, pose: pose(id) });
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
      let move = null, d = 0, shown = null;
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
          const side = st.present ? Math.sign(st.x - tgt.cx) || 1 : tgt.cx < W / 2 ? 1 : -1;
          if (!st.present) x0 = off(key, side);
          x1 = clamp(tgt.cx + side * (tgt.w / 2 + slot.w / 2 + W * 0.04 + n * (slot.w + W * 0.02)), slot.w / 2, W - slot.w / 2);
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
      } else if (a.type === 'pose') {
        st.present = true;
        d = GESTURE_SECONDS[a.anim] ?? 2;
        shown = pose(key, { anim: a.anim });
      } else {
        // 'expr' / 'appear'
        d = st.present ? 1.4 : 0.8;
        st.present = true;
      }
      group.push({ key, d, move, shown, wasPresent });
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
    if (beat.camera) {
      // A camera move alongside the actions ("the camera zooms in while she waves")
      const d = CAMERA_SECONDS[beat.camera.type] ?? 1.6;
      camera.push({ ...beat.camera, t0: t, t1: t + d });
      beatLen = Math.max(beatLen, d);
    }
    for (const [id, st] of state) {
      const act = acting.get(id);
      const track = tracks.get(id);
      let t1 = t;
      if (act?.shown) {
        const t0 = t + act.delay;
        const m = act.move;
        if (act.delay && act.wasPresent) track.push({ t0: t, t1: t0, x0: m.x0, x1: m.x0, k0: m.k0, k1: m.k0, pose: pose(id) });
        // A gesture lasts as long as the beat: the boy keeps waving while the dog runs up to him
        t1 = m ? t + act.d : t + beatLen;
        track.push({ t0, t1, x0: m ? m.x0 : st.x, x1: m ? m.x1 : st.x, k0: m ? m.k0 : st.k, k1: m ? m.k1 : st.k, pose: act.shown });
      }
      if (st.present && t1 < t + beatLen) track.push({ t0: t1, t1: t + beatLen, x0: st.x, x1: st.x, k0: st.k, k1: st.k, pose: pose(id) });
    }
    t += beatLen;
  }
  for (const [id, st] of state) if (st.present) tracks.get(id).push({ t0: t, t1: t + HOLD_SECONDS, x0: st.x, x1: st.x, k0: st.k, k1: st.k, pose: pose(id) });
  return { T: t + HOLD_SECONDS, tracks, camera };
}

// ---------------------------------------------------------------------------------------------
// Camera: the whole picture sits in one group that zooms and pans. The view is clamped to the
// scene, so the camera never shows past its edges. Stills (no animation) show the wide shot.

const CAMERA_SECONDS = { zoomIn: 1.6, zoomOut: 1.6, pan: 3, panTo: 2 };

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
    if (timeline && it.m.actor) {
      actorSlots.set(`${it.c.id}#${it.k}`, { id: it.c.id, it, cx, y, s, base, w, h: it.h, olk: clamp(W / 280 / (2.4 * s), 0.35, 4) });
      return;
    }
    if (!propsAt.has(it.c.id)) propsAt.set(it.c.id, { cx, w, y, h: it.h, anchor });
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
    // The drawing sits innermost in .pg-figure, so the studio can redraw it (a new expression)
    // while the animation wrapper, shadow and travel motion around it stay
    const drawing = shapesToSvg(shapes, style, { olk });
    let wrappedContent = `<g class="pg-figure">${drawing}</g>`;
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
    out.push(`<g class="movable-item" data-id="${it.c.id}" data-k="${it.k}" data-label="${it.c.label || it.c.id}"${animAttr}${exprAttr}${viewAttr}${colorAttr} transform="${tr.replace(/(\d+\.\d{3})\d+/g, '$1')}" style="cursor: grab;">${wrappedContent}</g>`);
  };

  // One timeline actor: a wrapper moved by keyframes, and one drawing per pose, switched on and off
  // in step with the beats. With animation off (still exports) the last on-screen pose shows in place.
  const renderActor = ({ it, y, s, base, olk, w }, track, T, name) => {
    // Still renders show the last pose the figure had on screen, in the front row
    const onScreen = track.filter((seg) => seg.x1 > -w / 2 && seg.x1 < W + w / 2 && seg.k1 > 0.5);
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
        seed: `${seed}:${it.c.id}:${it.k}`, color: it.m.color, vary: vary || it.k > 0, style,
        expression: pose.expression || 'happy', animation: pose.anim, view: pose.view,
      });
      // The drawing sits innermost in .pg-figure, so the studio can redraw it (a new expression)
      // while the pose's animation wrapper and mirroring around it stay
      const drawing = shapesToSvg(shapes, style, { olk });
      let svg = `<g class="pg-figure">${drawing}</g>`;
      if (pose.anim && !drawing.includes(`pg-anim-${pose.anim}`)) svg = `<g class="pg-anim-${pose.anim}">${svg}</g>`;
      if (pose.mirror) svg = `<g transform="translate(100 0) scale(-1 1)">${svg}</g>`;
      const still = last && last.variant === key;
      const attrs = `${pose.anim ? ` data-anim="${pose.anim}"` : ''}${pose.view ? ` data-view="${pose.view}"` : ''}`;
      poses += `<g class="pg-timeline-pose"${attrs} opacity="${still ? 1 : 0}" style="animation: ${name}v${i} ${r2(T)}s step-end infinite;">${svg}</g>`;
      i++;
    }
    const rx = 50 * (it.c.width ?? 0.8) * 0.72;
    const shadow = shadows ? `<g style="animation: ${name}s ${r2(T)}s step-end infinite;"><ellipse class="pg-shadow" cx="50" cy="${base}" rx="${r2(rx)}" ry="${r2(Math.max(3, rx * 0.13))}" fill="#000000" opacity="0.16"/></g>` : '';
    const tr = `translate(${r2(home - 50 * s)} ${r2(y - base * s)}) scale(${r2(s * 1000) / 1000})`;
    return `<g class="movable-item" data-id="${it.c.id}" data-k="${it.k}" data-label="${it.c.label || it.c.id}" data-actor="${it.c.id}"${it.m.color ? ` data-color="${it.m.color}"` : ''} transform="${tr}" style="cursor: grab;"><g class="pg-timeline-move" style="animation: ${name}p ${r2(T)}s linear infinite;">${shadow}${poses}</g></g>`;
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
  if (timeline && actorSlots.size) {
    const { T, tracks, camera: events } = playTimeline(timeline, actorSlots, propsAt, W);
    timeline.duration = r2(T);
    for (const [key, slot] of actorSlots) out.push(renderActor(slot, tracks.get(key), T, `${uid}a${key.replace('#', '_')}`));
    if (events.length || timeline.follow) {
      const followed = timeline.follow && tracks.get(`${timeline.follow}#0`);
      const follow = timeline.follow ? { id: timeline.follow, start: followed?.[0]?.t0 ?? 0 } : null;
      cam = { T, keys: cameraKeys({ events, follow, T, W, H, focusAt: focusAt(tracks) }) };
    }
  } else if (opts.camera?.moves?.length) {
    // Camera directions without a timeline: play them in order, then ease back so the loop is seamless
    const ids = new Set(items.map((it) => it.c.id));
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

  const fx = styleWrap(style, uid, out.join(''), { scale: W / 260, freq: 0.02, blur: W / 450 });
  const bgSvg = shapesToSvg(background(W, H, hY, env, pal, rng, hasGround, style), style);
  let content = `<g stroke-linecap="round" stroke-linejoin="round">${bgSvg}</g>${fx.g}`;
  if (cam) {
    motionCss.push(`@keyframes ${uid}cam { ${cameraCss(cam.keys, cam.T, W, H)}}`);
    content = `<g class="pg-camera" style="animation: ${uid}cam ${r2(cam.T)}s linear infinite;">${content}</g>`;
  }
  getStyle(style); // (style validated)
  const motionDefs = motionCss.length ? `<style><![CDATA[${motionCss.join('\n')}]]></style>` : '';
  return svgDoc({ width: W, height: H, viewBox: `0 0 ${W} ${H}`, defs: fx.defs + motionDefs, content });
}
