// A person's own face and hair, chosen in the studio or said in words ("a girl with big eyes, a
// round face and curly red hair"): applied to the finished drawing of any drawn person, costume
// and all, by changing its head (the 'pg-head' joint, src/concepts/rig.js), so it still moves,
// talks, blinks, wears its photo face and comes out in every style.
//
//   features: { face: 'round'|'oval'|'square'|'wide', eyes: 'small'|'big', lashes: true,
//               brows: 'thin'|'thick', nose: 'dot'|'button'|'pointy', mouth: 'small'|'big',
//               cheeks: 'none'|'big', freckles: true, glasses: true,
//               hair: 'short'|'spiky'|'curly'|'afro'|'pigtails'|'bun'|'ponytail'|'long'|'bob'|'bald',
//               beard: 'stubble'|'short'|'long'|'moustache',
//               build: 'slim'|'round'|'big', legs: 'short'|'long', arms: 'short'|'long', height: 'short'|'tall',
//               gear: ['mask', 'tank', 'flippers', ...] (things worn, src/gear.js) }
// (height is how big the figure is drawn in a scene, src/scene.js: HEIGHTS)

import { darken } from './core/color.js';
import { cleanGear } from './gear.js';

export const FEATURE_CHOICES = {
  face: ['round', 'oval', 'square', 'wide'],
  eyes: ['small', 'normal', 'big'],
  brows: ['none', 'thin', 'thick'],
  nose: ['none', 'dot', 'button', 'pointy'],
  mouth: ['small', 'normal', 'big'],
  cheeks: ['none', 'normal', 'big'],
  hair: ['short', 'spiky', 'curly', 'afro', 'pigtails', 'bun', 'ponytail', 'long', 'bob', 'bald'],
  beard: ['none', 'stubble', 'short', 'long', 'moustache'],
  build: ['slim', 'normal', 'round', 'big'],
  height: ['short', 'normal', 'tall'],
  legs: ['short', 'normal', 'long'],
  arms: ['short', 'normal', 'long'],
};
/** How much bigger or smaller a short or tall character is drawn */
export const HEIGHTS = { short: 0.86, tall: 1.14 };
const FLAGS = ['lashes', 'freckles', 'glasses'];

/** A features object with only what is allowed in it (from a request, a saved character, words) */
export function cleanFeatures(f) {
  if (!f || typeof f !== 'object') return null;
  const out = {};
  for (const [k, list] of Object.entries(FEATURE_CHOICES)) if (list.includes(f[k])) out[k] = f[k];
  for (const k of FLAGS) if (f[k] === true) out[k] = true;
  // (things worn: src/gear.js)
  const gear = cleanGear(f.gear);
  if (gear.length) out.gear = gear;
  return Object.keys(out).length ? out : null;
}

/** Two sets of features as one (b's win; things worn are added together) */
export function mergeFeatures(a, b) {
  if (!a && !b) return undefined;
  const gear = [...new Set([...(a?.gear ?? []), ...(b?.gear ?? [])])];
  return { ...a, ...b, ...(gear.length ? { gear } : {}) };
}

const r2 = (v) => Math.round(v * 100) / 100;
// The middle height of a path (its numbers' y values, roughly)
const avgY = (d) => { const n = String(d).match(/-?[\d.]+/g)?.map(Number) ?? []; const ys = n.filter((_, i) => i % 2 === 1); return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 0; };
const INK = '#263238';

function endOf(shapes, i) {
  let depth = 0;
  for (let j = i; j < shapes.length; j++) {
    if (shapes[j].type === 'g-start') depth++;
    else if (shapes[j].type === 'g-end' && --depth === 0) return j;
  }
  return shapes.length - 1;
}
const groupAt = (shapes, cls, from = 0, to = shapes.length) => {
  const re = new RegExp(`(^|\\s)${cls}(\\s|$)`);
  for (let i = from; i < to; i++) if (shapes[i].type === 'g-start' && re.test(shapes[i].class ?? '')) return [i, endOf(shapes, i)];
  return null;
};

// ---------------------------------------------------------------------------------------------
// Hair: a style around the head (cx, cy) with radii rx, ry; what goes behind the head and in front

function hairShapes(style, { cx, cy, rx, ry, view, fill }) {
  const back = [], front = [];
  const S = (list, type, attrs) => list.push({ type, attrs, kind: 'body', fill });
  const P = (list, d) => S(list, 'path', { d });
  const C = (list, x, y, r) => S(list, 'circle', { cx: r2(x), cy: r2(y), r: r2(r) });
  const x = (k) => r2(cx + k * rx), y = (k) => r2(cy + k * ry);
  if (style === 'bald') return { back, front };
  if (view === 'back') {
    // From behind: the hair covers the head, and what hangs down shows
    if (style === 'afro') C(front, cx, cy - ry * 0.15, rx * 1.5);
    else C(front, cx, cy, rx * 1.03);
    if (style === 'long') P(front, `M${x(-1.05)} ${y(-0.2)} L${x(-1.12)} ${y(1.75)} Q${cx} ${y(1.95)} ${x(1.12)} ${y(1.75)} L${x(1.05)} ${y(-0.2)} Z`);
    if (style === 'bob') P(front, `M${x(-1.05)} ${y(-0.2)} L${x(-1.1)} ${y(0.9)} Q${cx} ${y(1.05)} ${x(1.1)} ${y(0.9)} L${x(1.05)} ${y(-0.2)} Z`);
    if (style === 'ponytail') P(front, `M${x(-0.25)} ${y(0.3)} Q${x(-0.35)} ${y(1.5)} ${cx} ${y(1.8)} Q${x(0.35)} ${y(1.5)} ${x(0.25)} ${y(0.3)} Z`);
    if (style === 'bun') C(front, cx, cy - ry * 0.95, rx * 0.45);
    if (style === 'pigtails') for (const s of [-1, 1]) C(front, cx + s * rx * 1.15, cy - ry * 0.05, rx * 0.5);
    if (style === 'spiky') for (const k of [-0.6, -0.2, 0.2, 0.6]) P(front, `M${x(k - 0.22)} ${y(-0.8)} L${x(k)} ${y(-1.3)} L${x(k + 0.22)} ${y(-0.8)} Z`);
    if (style === 'curly') for (let k = 0; k < 7; k++) { const a = Math.PI + (k / 6) * Math.PI; C(front, cx + Math.cos(a) * rx * 0.95, cy + Math.sin(a) * ry * 0.95, rx * 0.32); }
    return { back, front };
  }
  if (view === 'side') {
    // In profile, facing right: the hair over the top and the back of the head
    const cap = `M${x(0.65)} ${y(-0.72)} Q${cx} ${y(-1.2)} ${x(-0.98)} ${y(-0.25)} Q${x(-1.05)} ${y(0.5)} ${x(-0.6)} ${y(0.8)} L${x(-0.25)} ${y(0.15)} Q${x(0.2)} ${y(-0.45)} ${x(0.65)} ${y(-0.72)} Z`;
    if (style === 'afro') C(back, cx - rx * 0.25, cy - ry * 0.2, rx * 1.45);
    if (style === 'long') P(back, `M${x(-0.9)} ${y(-0.4)} Q${x(-1.25)} ${y(0.8)} ${x(-1.05)} ${y(1.75)} L${x(-0.35)} ${y(1.6)} L${x(-0.3)} ${y(0.4)} Z`);
    if (style === 'bob') P(back, `M${x(-0.9)} ${y(-0.4)} Q${x(-1.15)} ${y(0.5)} ${x(-0.95)} ${y(0.95)} L${x(-0.2)} ${y(0.9)} L${x(-0.3)} ${y(0.3)} Z`);
    if (style === 'ponytail') P(back, `M${x(-0.85)} ${y(-0.35)} Q${x(-1.6)} ${y(0.2)} ${x(-1.45)} ${y(1.3)} Q${x(-1.15)} ${y(0.6)} ${x(-0.75)} ${y(0.2)} Z`);
    if (style === 'pigtails') C(back, cx - rx * 1.05, cy, rx * 0.48);
    if (style === 'bun') C(back, cx - rx * 0.7, cy - ry * 0.75, rx * 0.45);
    P(front, cap);
    if (style === 'spiky') for (const k of [-0.7, -0.3, 0.1]) P(front, `M${x(k - 0.2)} ${y(-0.85)} L${x(k - 0.05)} ${y(-1.35)} L${x(k + 0.25)} ${y(-0.95)} Z`);
    if (style === 'curly' || style === 'afro') for (let k = 0; k < 5; k++) { const a = Math.PI * 0.85 + (k / 4) * Math.PI * 0.9; C(front, cx + Math.cos(a) * rx * 0.9, cy + Math.sin(a) * ry * 0.9, rx * 0.3); }
    return { back, front };
  }
  // Front (and three-quarter): behind the head, then over its top down to the forehead
  if (style === 'afro') C(back, cx, cy - ry * 0.2, rx * 1.55);
  if (style === 'long') P(back, `M${x(-1.02)} ${y(-0.3)} Q${x(-1.2)} ${y(0.9)} ${x(-1.18)} ${y(1.7)} L${x(1.18)} ${y(1.7)} Q${x(1.2)} ${y(0.9)} ${x(1.02)} ${y(-0.3)} Z`);
  if (style === 'bob') P(back, `M${x(-1.04)} ${y(-0.3)} Q${x(-1.18)} ${y(0.5)} ${x(-1.08)} ${y(0.95)} L${x(1.08)} ${y(0.95)} Q${x(1.18)} ${y(0.5)} ${x(1.04)} ${y(-0.3)} Z`);
  if (style === 'ponytail') P(back, `M${x(0.6)} ${y(-0.85)} Q${x(1.7)} ${y(-0.6)} ${x(1.45)} ${y(0.7)} Q${x(1.25)} ${y(0)} ${x(0.8)} ${y(-0.4)} Z`);
  if (style === 'pigtails') for (const s of [-1, 1]) C(back, cx + s * rx * 1.18, cy - ry * 0.2, rx * 0.5);
  if (style === 'bun') C(back, cx, cy - ry * 1.05, rx * 0.46);
  const fringe = {
    short: `M${x(-1.02)} ${y(0.05)} C${x(-1.1)} ${y(-1.25)} ${x(1.1)} ${y(-1.25)} ${x(1.02)} ${y(0.05)} Q${x(0.8)} ${y(-0.5)} ${x(0.15)} ${y(-0.55)} Q${x(-0.6)} ${y(-0.45)} ${x(-1.02)} ${y(0.05)} Z`,
    bangs: `M${x(-1.03)} ${y(0.2)} C${x(-1.1)} ${y(-1.25)} ${x(1.1)} ${y(-1.25)} ${x(1.03)} ${y(0.2)} L${x(0.95)} ${y(-0.45)} L${x(-0.95)} ${y(-0.45)} Z`,
    parted: `M${x(-1.04)} ${y(0.35)} C${x(-1.1)} ${y(-1.25)} ${x(1.1)} ${y(-1.25)} ${x(1.04)} ${y(0.35)} Q${x(0.75)} ${y(-0.55)} ${cx} ${y(-0.7)} Q${x(-0.75)} ${y(-0.55)} ${x(-1.04)} ${y(0.35)} Z`,
  };
  const cap = { bob: 'bangs', long: 'parted', ponytail: 'parted', bun: 'parted', pigtails: 'parted' }[style] ?? 'short';
  P(front, fringe[cap]);
  if (style === 'spiky') for (const k of [-0.6, -0.25, 0.1, 0.45]) P(front, `M${x(k - 0.22)} ${y(-0.82)} L${x(k)} ${y(-1.4)} L${x(k + 0.24)} ${y(-0.85)} Z`);
  if (style === 'curly' || style === 'afro') for (let k = 0; k < 7; k++) { const a = Math.PI * 1.05 + (k / 6) * Math.PI * 0.9; C(front, cx + Math.cos(a) * rx * 0.9, cy + Math.sin(a) * ry * 0.85, rx * 0.3); }
  if (style === 'pigtails') for (const s of [-1, 1]) front.push({ type: 'circle', attrs: { cx: r2(cx + s * rx * 0.95), cy: r2(cy - ry * 0.45), r: r2(rx * 0.16) }, kind: 'accent', fill: '#ec407a' });
  return { back, front };
}

// ---------------------------------------------------------------------------------------------
// The body: built slimmer or rounder (a belly), longer or shorter legs and arms

const bboxOf = (s) => {
  const a = s.attrs ?? {};
  if (s.type === 'rect') return [a.x, a.y, a.x + a.width, a.y + a.height];
  const nums = (s.type === 'polygon' ? String(a.points) : String(a.d ?? '')).match(/-?[\d.]+/g)?.map(Number) ?? [];
  const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
  return xs.length ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] : null;
};
const lowestOf = (list) => Math.max(...list.map((s) => {
  const a = s.attrs ?? {};
  if (s.type === 'rect') return a.y + a.height;
  if (s.type === 'ellipse') return a.cy + a.ry;
  if (s.type === 'circle') return a.cy + a.r;
  return bboxOf(s)?.[3] ?? -Infinity;
}));
function childrenOf(shapes, [a, b]) {
  const out = [];
  for (let i = a + 1; i < b; i++) { const j = shapes[i].type === 'g-start' ? endOf(shapes, i) : i; out.push([i, j]); i = j; }
  return out;
}

/** A person's body as built: features.build, legs, arms (main: the clothes' colour, for a belly) */
export function withBody(shapes, features, { main } = {}) {
  const f = cleanFeatures(features);
  const kx = { slim: 0.86, round: 1.14, big: 1.3 }[f?.build], kl = { short: 0.72, long: 1.28 }[f?.legs], ka = { short: 0.8, long: 1.22 }[f?.arms];
  if (!kx && !kl && !ka) return shapes;
  const root = groupAt(shapes, 'pg-rig-person');
  if (!root) return shapes;
  const box = groupAt(shapes, 'pg-profile', root[0], root[1]) ?? root;
  const kids = childrenOf(shapes, box);
  const isLeg = ([a]) => shapes[a].type === 'g-start' && /pg-leg-(left|right)/.test(shapes[a].class ?? '');
  const isArm = ([a]) => shapes[a].type === 'g-start' && /pg-arm-(left|right)/.test(shapes[a].class ?? '');
  const legs = kids.filter(isLeg), arms = kids.filter(isArm);
  const edits = [];
  const replaced = new Map(); // shapes drawn anew (a shirt with a belly)
  const wrap = (a, b, transform) => edits.push([a, [{ type: 'g-start', transform }]], [b + 1, [{ type: 'g-end' }]]);
  // Legs: longer or shorter (the feet stay on the ground, everything above them moves)
  let lift = 0;
  if (kl && legs.length) {
    const legShapes = legs.flatMap(([a, b]) => shapes.slice(a, b + 1).filter((s) => s.attrs));
    const foot = lowestOf(legShapes), hip = Math.min(...legShapes.filter((s) => s.type === 'rect').map((s) => s.attrs.y));
    const shoeTop = Math.min(...legShapes.filter((s) => s.type === 'ellipse').map((s) => s.attrs.cy - s.attrs.ry), foot);
    lift = (shoeTop - hip) * (kl - 1);
    for (const [a, b] of legs) {
      const inner = childrenOf(shapes, [a, b]);
      // (seen from the front, only the leg stretches, not the shoe)
      const flat = inner.every(([i, j]) => i === j);
      if (flat) for (const [i] of inner.filter(([i]) => shapes[i].type === 'rect')) wrap(i, i, `translate(0 ${r2(shoeTop)}) scale(1 ${kl}) translate(0 ${r2(-shoeTop)})`);
      else wrap(a + 1, b - 1, `translate(0 ${r2(foot)}) scale(1 ${kl}) translate(0 ${r2(-foot)})`);
    }
  }
  // The body: wider or slimmer about its middle, a round belly; the arms move out with it
  const torso = kids.find(([a]) => shapes[a].type === 'g-start' && /pg-body-torso/.test(shapes[a].class ?? ''));
  let dx = 0;
  if (kx && torso) {
    const inner = childrenOf(shapes, torso);
    const headAt = inner.findIndex(([a]) => shapes[a].type === 'g-start' && /pg-head/.test(shapes[a].class ?? ''));
    const body = (headAt < 0 ? inner : inner.slice(0, headAt)).filter(([i, j]) => i === j);
    const main1 = body.map(([i]) => [i, bboxOf(shapes[i])]).filter(([, bb]) => bb).sort((p, q) => (q[1][2] - q[1][0]) * (q[1][3] - q[1][1]) - (p[1][2] - p[1][0]) * (p[1][3] - p[1][1]))[0];
    if (main1) {
      const [x0, y0, x1, y1] = main1[1], cx = (x0 + x1) / 2;
      const first = (headAt < 0 ? inner : inner.slice(0, headAt))[0][0], last = (headAt < 0 ? inner : inner.slice(0, headAt)).slice(-1)[0][1];
      wrap(first, last, `translate(${r2(cx)} ${r2(y0)}) scale(${kx} 1) translate(${r2(-cx)} ${r2(-y0)})`);
      dx = ((x1 - x0) / 2) * (kx - 1);
      // (a round belly: the shirt itself drawn round, from the shoulders out over the belt; in the
      // body's own units, before it is widened)
      if (kx > 1) {
        const h = y1 - y0, hw = (x1 - x0) / 2, sw = hw * 0.92, bw = hw * (kx > 1.2 ? 1.04 : 1), drop = h * (kx > 1.2 ? 0.16 : 0.1);
        const d = `M${r2(cx - sw)} ${r2(y0)} L${r2(cx + sw)} ${r2(y0)} C${r2(cx + sw + 1)} ${r2(y0 + h * 0.3)} ${r2(cx + bw)} ${r2(y0 + h * 0.45)} ${r2(cx + bw)} ${r2(y0 + h * 0.72)}`
          + ` C${r2(cx + bw)} ${r2(y1 + drop * 0.6)} ${r2(cx + bw * 0.45)} ${r2(y1 + drop)} ${r2(cx)} ${r2(y1 + drop)} C${r2(cx - bw * 0.45)} ${r2(y1 + drop)} ${r2(cx - bw)} ${r2(y1 + drop * 0.6)} ${r2(cx - bw)} ${r2(y0 + h * 0.72)}`
          + ` C${r2(cx - bw)} ${r2(y0 + h * 0.45)} ${r2(cx - sw - 1)} ${r2(y0 + h * 0.3)} ${r2(cx - sw)} ${r2(y0)} Z`;
        replaced.set(main1[0], { ...shapes[main1[0]], type: 'path', attrs: { d } });
      }
    }
  }
  for (const [a, b] of arms) {
    const left = /pg-arm-left/.test(shapes[a].class ?? '');
    const limb = shapes.slice(a, b + 1).filter((s) => s.type === 'rect' && s.attrs).sort((p, q) => q.attrs.height - p.attrs.height)[0];
    const sh = limb ? [limb.attrs.x + limb.attrs.width / 2, limb.attrs.y] : null;
    const parts = [];
    if (dx && box === root) parts.push(`translate(${r2(left ? -dx : dx)} 0)`);
    if (ka && sh) parts.push(`translate(${r2(sh[0])} ${r2(sh[1])}) scale(1 ${ka}) translate(${r2(-sh[0])} ${r2(-sh[1])})`);
    if (parts.length) wrap(a + 1, b - 1, parts.join(' '));
  }
  // Everything above the legs moves with them
  if (lift) for (const [a, b] of kids) if (!isLeg([a])) wrap(a, b, `translate(0 ${r2(-lift)})`);
  const byIndex = new Map();
  for (const [i, list] of edits) byIndex.set(i, [...(byIndex.get(i) ?? []), ...list]);
  const out = shapes.map((sh, i) => replaced.get(i) ?? sh);
  for (const i of [...byIndex.keys()].sort((x, y) => y - x)) out.splice(i, 0, ...byIndex.get(i));
  // (what the hands hold goes up with them)
  if (lift) {
    const held = groupAt(out, 'pg-held');
    if (held) { out.splice(held[1] + 1, 0, { type: 'g-end' }); out.splice(held[0], 0, { type: 'g-start', transform: `translate(0 ${r2(-lift)})` }); }
  }
  return out;
}

/**
 * The drawing of a person with their own face and hair. hairColor and skin: the drawing's colours
 * (the hair it drew is found by its colour, and replaced when a style is chosen).
 */
export function withFeatures(shapes, features, { hairColor, skin, view } = {}) {
  const f = cleanFeatures(features);
  if (!f) return shapes;
  const head = groupAt(shapes, 'pg-head');
  if (!head) return shapes;
  let out = shapes.slice(head[0] + 1, head[1]);
  const before = shapes.slice(0, head[0] + 1), after = shapes.slice(head[1]);
  // (the refreshed look's small nose and hair shine go when a nose or a hair style is chosen)
  const drop = (cls) => { const g = groupAt(out, cls); if (g) out.splice(g[0], g[1] - g[0] + 1); };
  if (f.nose) drop('pg-face-nose');
  if (f.hair) drop('pg-hair-shine');
  if (f.hair) drop('pg-hair-shine');
  // The head itself: the largest circle in the head joint
  const circles = out.map((s, i) => [s, i]).filter(([s]) => s.type === 'circle' && s.attrs);
  if (!circles.length) return shapes;
  const [skull, skullAt] = circles.reduce((a, b) => (b[0].attrs.r > a[0].attrs.r ? b : a));
  const { cx, cy, r } = skull.attrs;
  if (r < 8) return shapes;
  const firstFace = out.findIndex((s) => s.type === 'g-start' && /pg-face/.test(s.class ?? ''));
  // (which way the head is seen: as asked, as the head says, or from behind when it has no face)
  view = view ?? shapes[head[0]].data?.view ?? (firstFace < 0 ? 'back' : 'front');
  const facing = firstFace >= 0 && view !== 'back';
  // The face's shape
  let rx = r, ry = r;
  if (f.face && f.face !== 'round' && view !== 'side') {
    [rx, ry] = { oval: [r * 0.9, r * 1.08], square: [r, r], wide: [r * 1.12, r * 0.97] }[f.face];
    out[skullAt] = f.face === 'square'
      ? { ...skull, type: 'rect', attrs: { x: r2(cx - r * 0.98), y: r2(cy - r * 1.0), width: r2(r * 1.96), height: r2(r * 2.04), rx: r2(r * 0.42) } }
      : { ...skull, type: 'ellipse', attrs: { cx, cy, rx: r2(rx), ry: r2(ry) } };
  }
  // The hair: its own drawn hair out (the shapes in the hair's colour before the face, or all of
  // them seen from behind), the chosen style in
  if (f.hair && hairColor) {
    const end = firstFace >= 0 ? firstFace : out.length;
    const hairy = (s, i) => i < end && s.fill === hairColor && s.type !== 'g-start' && s.type !== 'g-end';
    const { back, front } = hairShapes(f.hair, { cx, cy, rx, ry, view: view === 'back' ? 'back' : view === 'side' ? 'side' : 'front', fill: hairColor });
    const at = out.indexOf(out[skullAt]);
    out = [...out.slice(0, at).filter((s, i) => !hairy(s, i)), ...back, out[at], ...front, ...out.slice(at + 1).filter((s, i) => !hairy(s, i + at + 1))];
    // (a costume's own hair over the head - a bun - goes too, its beard and moustache stay; and its
    // bald crown goes when there is hair)
    const faceAt = out.findIndex((x) => x.type === 'g-start' && /pg-face/.test(x.class ?? ''));
    const midY = (s) => (s.attrs?.cy ?? (s.attrs?.d ? avgY(s.attrs.d) : s.attrs?.y ?? cy));
    out = out.filter((s, i) => !(faceAt >= 0 && i > faceAt && s.fill === hairColor && midY(s) < cy - r * 0.3));
    if (f.hair !== 'bald') out = out.filter((s, i) => !(s.type === 'ellipse' && s.fill === skin && i > faceAt));
  }
  if (!facing) return [...before, ...out, ...after];

  // The face: where the eyes are (the two biggest dots in the eyes)
  const eyes = groupAt(out, 'pg-face-eyes');
  const dots = eyes ? out.slice(eyes[0], eyes[1]).filter((s) => s.type === 'circle' && s.attrs && s.fill) : [];
  const pair = [...dots].sort((a, b) => b.attrs.r - a.attrs.r).slice(0, 2);
  const fx = pair.length === 2 ? (pair[0].attrs.cx + pair[1].attrs.cx) / 2 : cx;
  const ey = pair.length ? pair.reduce((s, d) => s + d.attrs.cy, 0) / pair.length : cy + 1;
  const es = pair.length === 2 ? Math.abs(pair[0].attrs.cx - pair[1].attrs.cx) / 2 : 5.5;
  const scaleAbout = (x, y, k) => `translate(${r2(x)} ${r2(y)}) scale(${k}) translate(${r2(-x)} ${r2(-y)})`;
  const edits = []; // [index, shapes] inserted before index
  const k = { small: 0.75, big: 1.35 }[f.eyes];
  if (eyes && k) edits.push([eyes[0] + 1, [{ type: 'g-start', transform: scaleAbout(fx, ey, k) }]], [eyes[1], [{ type: 'g-end' }]]);
  // Lashes and brows (unless the feeling draws its own brows)
  if (eyes && f.lashes) {
    const lash = [];
    for (const s of [-1, 1]) for (const [dx, dy] of [[1.3, -1.6], [2.4, -0.8]]) {
      const x0 = fx + s * es + s * dx * (k ?? 1), y0 = ey + dy * (k ?? 1);
      lash.push({ type: 'line', attrs: { x1: r2(x0), y1: r2(y0), x2: r2(x0 + s * 1.3), y2: r2(y0 - 1.1) }, kind: 'line', stroke: INK, sw: 0.9 });
    }
    edits.push([eyes[1], lash]);
  }
  const ownBrows = eyes && out.slice(eyes[0], eyes[1]).some((s) => (s.type === 'line' || s.type === 'path') && s.attrs && (s.attrs.y1 ?? 999) < ey - 2.5);
  if (eyes && f.brows && f.brows !== 'none' && !ownBrows) {
    const w = f.brows === 'thick' ? 1.9 : 1.1, by = ey - 4.2 * (k ?? 1);
    edits.push([eyes[1], [-1, 1].map((s) => ({ type: 'path', attrs: { d: `M${r2(fx + s * (es - 2.6))} ${r2(by + 0.3)} Q${r2(fx + s * es)} ${r2(by - 1)} ${r2(fx + s * (es + 2.6))} ${r2(by + 0.4)}` }, kind: 'line', stroke: INK, sw: w, fill: 'none' }))]);
  }
  // The mouth's size
  const mouth = groupAt(out, 'pg-face-mouth');
  // A beard or a moustache, in the hair's colour, round the mouth (which stays on top, to talk)
  if (f.beard && f.beard !== 'none' && hairColor) {
    const P = (d, extra = {}) => ({ type: 'path', attrs: { d }, kind: 'body', fill: hairColor, ...extra });
    const w = es + 4.5, top = ey + 2.2, low = { stubble: ey + 11, short: ey + 12.5, long: ey + 19 }[f.beard];
    const beard = [];
    if (low) {
      // the jaw outside, an opening for the mouth inside (a long beard ends in a point)
      const outer = f.beard === 'long'
        ? `M${r2(fx - w)} ${r2(top)} C${r2(fx - w)} ${r2(low - 6)} ${r2(fx - w * 0.3)} ${r2(low - 2)} ${r2(fx)} ${r2(low)} C${r2(fx + w * 0.3)} ${r2(low - 2)} ${r2(fx + w)} ${r2(low - 6)} ${r2(fx + w)} ${r2(top)}`
        : `M${r2(fx - w)} ${r2(top)} C${r2(fx - w)} ${r2(low - 2)} ${r2(fx - w * 0.5)} ${r2(low)} ${r2(fx)} ${r2(low)} C${r2(fx + w * 0.5)} ${r2(low)} ${r2(fx + w)} ${r2(low - 2)} ${r2(fx + w)} ${r2(top)}`;
      const inner = `L${r2(fx + w * 0.6)} ${r2(top + 0.5)} Q${r2(fx + w * 0.6)} ${r2(ey + 9.8)} ${r2(fx)} ${r2(ey + 9.8)} Q${r2(fx - w * 0.6)} ${r2(ey + 9.8)} ${r2(fx - w * 0.6)} ${r2(top + 0.5)} Z`;
      beard.push(P(`${outer} ${inner}`, f.beard === 'stubble' ? { opacity: 0.35 } : {}));
    }
    if (f.beard !== 'stubble') {
      beard.push(P(`M${r2(fx - 5.2)} ${r2(ey + 5.6)} Q${r2(fx - 2.6)} ${r2(ey + 3.2)} ${r2(fx)} ${r2(ey + 4.6)} Q${r2(fx + 2.6)} ${r2(ey + 3.2)} ${r2(fx + 5.2)} ${r2(ey + 5.6)} Q${r2(fx)} ${r2(ey + 4.9)} ${r2(fx - 5.2)} ${r2(ey + 5.6)} Z`));
    }
    if (mouth) edits.push([mouth[0], beard]);
  }
  const km = { small: 0.72, big: 1.4 }[f.mouth];
  if (mouth && km) edits.push([mouth[0] + 1, [{ type: 'g-start', transform: scaleAbout(fx, ey + 6.5, km) }]], [mouth[1], [{ type: 'g-end' }]]);
  // A nose, freckles, glasses: after the face (over it)
  const extra = [];
  const shade = darken(skin ?? '#f1c27d', 0.22);
  if (f.nose === 'dot') extra.push({ type: 'circle', attrs: { cx: r2(fx), cy: r2(ey + 3.6), r: 0.9 }, kind: 'detail', fill: shade });
  if (f.nose === 'button') extra.push({ type: 'ellipse', attrs: { cx: r2(fx), cy: r2(ey + 3.6), rx: 2, ry: 1.5 }, kind: 'detail', fill: shade });
  if (f.nose === 'pointy') extra.push({ type: 'path', attrs: { d: `M${r2(fx)} ${r2(ey + 1)} L${r2(fx + 2)} ${r2(ey + 4.6)} L${r2(fx - 0.8)} ${r2(ey + 4.6)}` }, kind: 'line', stroke: shade, sw: 1.2, fill: 'none' });
  if (f.freckles) for (const s of [-1, 1]) for (const [dx, dy] of [[0, 0], [1.6, 0.9], [-0.8, 1.3]]) extra.push({ type: 'circle', attrs: { cx: r2(fx + s * (es + 1.5) + dx), cy: r2(ey + 3.6 + dy), r: 0.45 }, kind: 'detail', fill: darken(skin ?? '#f1c27d', 0.35) });
  if (f.glasses) {
    const gr = es * 0.72 * (k ?? 1);
    for (const s of [-1, 1]) extra.push({ type: 'circle', attrs: { cx: r2(fx + s * es), cy: r2(ey), r: r2(gr) }, kind: 'line', stroke: INK, sw: 1.2, fill: 'none' });
    extra.push({ type: 'path', attrs: { d: `M${r2(fx - es + gr)} ${r2(ey)} Q${r2(fx)} ${r2(ey - 1.4)} ${r2(fx + es - gr)} ${r2(ey)}` }, kind: 'line', stroke: INK, sw: 1.1, fill: 'none' });
  }
  if (extra.length) edits.push([mouth ? mouth[1] + 1 : out.length, extra]);
  // Cheeks: none, or bigger
  out = out.map((s) => {
    if (s.type !== 'circle' || s.fill !== '#ff8a80' || !s.attrs) return s;
    if (f.cheeks === 'none') return { ...s, opacity: 0 };
    if (f.cheeks === 'big') return { ...s, attrs: { ...s.attrs, r: r2(s.attrs.r * 1.5) } };
    return s;
  });
  const byIndex = new Map();
  for (const [i, list] of edits) byIndex.set(i, [...(byIndex.get(i) ?? []), ...list]);
  for (const i of [...byIndex.keys()].sort((a, b) => b - a)) out.splice(i, 0, ...byIndex.get(i));
  return [...before, ...out, ...after];
}
