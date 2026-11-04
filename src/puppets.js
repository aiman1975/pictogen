// Your figures ("dot puppets"): a picture someone drew or brought in, cut into parts, each part with
// a dot where it bends, made into a figure the engine moves like its own (src/concepts/rig.js).
//
//   { image: 'data:image/png;base64,...'  a square picture (its 0..100 box is the figure's)
//     parts: [{ role: 'leg' | 'arm' | 'head' | 'tail' | 'part',
//               points: [[x, y], ...]      the loop drawn round the part, in the 0..100 box
//               pivot: [x, y]              the dot it turns around (a leg's hip, an arm's shoulder)
//               move?: { type: 'swing' | 'nod' | 'shake' | 'bounce' | 'spin', dx, dy, speed } }]
//     face?: { eyes: [[x, y]] (one or two), eyeSize, mouth: [x, y], mouthSize, cheeks, skin, mouthSkin }
//                                         a face of its own, marked on the picture: eyes that blink,
//                                         a mouth that talks, both showing what it feels
//     size: 'tiny' | 'small' | 'medium' | 'person' | 'big' | 'huge'   how tall, next to a person
//     baseline, width                      where it stands (y), how wide it is (share of the box) }
//
// What it is follows from its legs: two (or one) walk like a person, three or more like a dog, none
// hop and wobble as a whole. Arms wave and cheer, a head nods and turns, a tail wags: every motion
// the engine has (walk, run, dance, jump, wave, sit...) then works on it, in scenes, timelines and
// stories. A part's own move (its arrow) plays all the time: a pendulum swinging, a lid shaking.
//
// The studio keeps the pictures and names (public/js/puppets.js) and sends each figure with "your
// characters" ({ key: 'pgc501', puppet: {...} }); withPuppets() makes them concepts.
import { registerConcept, getConcept } from './concepts/index.js';
import { rigged } from './concepts/rig.js';
import { eyes as faceEyes, mouth as faceMouth, cheek } from './concepts/animal-face.js';

const ROLES = ['leg', 'arm', 'head', 'tail', 'part'];
const MOVES = ['swing', 'nod', 'shake', 'bounce', 'spin'];
const SPEEDS = { slow: 1.6, normal: 0.9, fast: 0.45 };
// How tall, next to a standing person (src/concepts/index.js scale)
export const PUPPET_SIZES = { tiny: 0.22, small: 0.42, medium: 0.68, person: 0.92, big: 1.25, huge: 1.9 };
const IMAGE = /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE = 900000;

const num = (v, a, b, d) => (Number.isFinite(+v) ? Math.min(b, Math.max(a, +v)) : d);
const r2 = (v) => Math.round(v * 100) / 100;

/** A puppet as sent, checked (anything that doesn't fit left out), or null */
export function cleanPuppet(p) {
  if (!p || typeof p !== 'object' || typeof p.image !== 'string' || p.image.length > MAX_IMAGE || !IMAGE.test(p.image)) return null;
  const pt = (q) => (Array.isArray(q) && q.length === 2 ? [r2(num(q[0], -20, 120, 50)), r2(num(q[1], -20, 120, 50))] : null);
  const parts = [];
  for (const part of Array.isArray(p.parts) ? p.parts.slice(0, 16) : []) {
    const points = Array.isArray(part?.points) ? part.points.slice(0, 120).map(pt).filter(Boolean) : [];
    if (points.length < 3 || !ROLES.includes(part.role)) continue;
    const xs = points.map((q) => q[0]), ys = points.map((q) => q[1]);
    // (no dot: the middle of its top edge, where a leg or an arm usually joins)
    const pivot = pt(part.pivot) ?? [r2((Math.min(...xs) + Math.max(...xs)) / 2), r2(Math.min(...ys))];
    const m = part.move;
    const move = m && MOVES.includes(m.type)
      ? { type: m.type, dx: r2(num(m.dx, -60, 60, 0)), dy: r2(num(m.dy, -60, 60, 0)), speed: SPEEDS[m.speed] ? m.speed : 'normal' } : null;
    parts.push({ role: part.role, points, pivot, ...(move ? { move } : {}) });
  }
  // A face marked on it (eyes and a mouth drawn by the engine, as it feels)
  const f = p.face && typeof p.face === 'object' ? p.face : null;
  const eyesAt = Array.isArray(f?.eyes) ? f.eyes.slice(0, 2).map(pt).filter(Boolean) : [];
  const mouthAt = pt(f?.mouth);
  const face = eyesAt.length || mouthAt ? {
    eyes: eyesAt, eyeSize: r2(num(f.eyeSize, 0.3, 3, 1)), ...(mouthAt ? { mouth: mouthAt, mouthSize: r2(num(f.mouthSize, 0.3, 3, 1)) } : {}),
    ...(f.cheeks ? { cheeks: true } : {}), ...(/^#[0-9a-f]{6}$/i.test(f.skin ?? '') ? { skin: f.skin.toLowerCase() } : {}),
    ...(/^#[0-9a-f]{6}$/i.test(f.mouthSkin ?? '') ? { mouthSkin: f.mouthSkin.toLowerCase() } : {}),
  } : null;
  return {
    image: p.image,
    parts,
    ...(face ? { face } : {}),
    size: PUPPET_SIZES[p.size] ? p.size : 'medium',
    baseline: r2(num(p.baseline, 40, 100, 96)),
    width: r2(num(p.width, 0.1, 1.2, 0.8)),
  };
}

/** What kind of figure its legs make: 'person' (one or two), 'quadruped' (three or more), 'none' */
export const puppetKind = (p) => {
  const legs = p.parts.filter((x) => x.role === 'leg').length;
  return legs >= 3 ? 'quadruped' : legs ? 'person' : 'none';
};

/** Whether a point is inside a loop (even-odd) */
function inside([x, y], pts) {
  let yes = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) yes = !yes;
  }
  return yes;
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

let drawn = 0; // (each drawing's own ids: two of the same figure in a scene don't share masks)

/** The figure's concept id, registered once for each picture and set of parts */
export function puppetConcept(raw) {
  const p = cleanPuppet(raw);
  if (!p) return null;
  const id = `puppet_${hash(JSON.stringify(p))}`;
  if (getConcept(id)) return id;
  const kind = puppetKind(p);
  registerConcept({
    id,
    label: 'figure',
    aliases: [],
    tags: ['puppet', 'figure'],
    // (a figure that moves: two legs like people, else like animals - both can walk in, run, act)
    category: kind === 'person' ? 'people' : 'animals',
    placement: 'ground',
    scale: PUPPET_SIZES[p.size],
    baseline: p.baseline,
    width: p.width,
    puppet: true,
    draw(d, opts) { drawPuppet(d, opts, p, kind, id); },
  });
  return id;
}

/** "Your characters" with figures among them: each figure's kind becomes its own concept */
export function withPuppets(list) {
  if (!Array.isArray(list)) return list;
  return list.map((c) => {
    if (!c?.puppet) return c;
    const base = puppetConcept(c.puppet);
    return base ? { key: c.key, base } : null;
  }).filter(Boolean);
}

function drawPuppet(d, params, p, kind, id) {
  const uid = `${id.slice(7, 13)}${(drawn++).toString(36)}`;
  const image = (attrs) => `<image href="${p.image}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet"${attrs}/>`;
  const poly = (part) => part.points.map(([x, y]) => `${x},${y}`).join(' ');
  // The body: the picture with every part cut out of it
  const body = `<mask id="${uid}m" maskUnits="userSpaceOnUse" x="-20" y="-20" width="140" height="140"><rect x="-20" y="-20" width="140" height="140" fill="#fff"/>${p.parts.map((part) => `<polygon points="${poly(part)}" fill="#000"/>`).join('')}</mask>${image(` mask="url(#${uid}m)"`)}`;
  // A part: the picture inside its loop, and its own move around its dot (if it has one)
  const css = [];
  const partSvg = (part, i) => {
    let svg = `<clipPath id="${uid}c${i}"><polygon points="${poly(part)}"/></clipPath>${image(` clip-path="url(#${uid}c${i})"`)}`;
    const m = part.move;
    if (m) {
      const name = `${uid}mv${i}`, dur = SPEEDS[m.speed], len = Math.hypot(m.dx, m.dy), sign = (m.dx || 1) >= 0 ? 1 : -1;
      const a = Math.max(6, Math.min(45, len * 1.4));
      const frames = {
        swing: `0% { transform: rotate(${-a}deg); } 100% { transform: rotate(${a}deg); }`,
        nod: `0% { transform: rotate(0deg); } 100% { transform: rotate(${sign * a}deg); }`,
        shake: `0% { transform: rotate(-4deg); } 100% { transform: rotate(4deg); }`,
        bounce: `0% { transform: translate(0, 0); } 100% { transform: translate(${r2(m.dx * 0.6)}px, ${r2(m.dy * 0.6)}px); }`,
        spin: `0% { transform: rotate(0deg); } 100% { transform: rotate(${sign * 360}deg); }`,
      }[m.type];
      css.push(`@keyframes ${name} { ${frames} }`);
      const time = m.type === 'shake' ? 0.12 : m.type === 'spin' ? dur * 2.5 : dur;
      const how = m.type === 'spin' ? 'linear infinite' : 'ease-in-out infinite alternate';
      svg = `<g style="transform-box: view-box; transform-origin: ${part.pivot[0]}px ${part.pivot[1]}px; animation: ${name} ${r2(time)}s ${how};">${svg}</g>`;
    }
    return svg;
  };
  const parts = p.parts.map((part, i) => ({ ...part, svg: partSvg(part, i) }));
  // Its face: on the head part it is marked inside (turning with it), else on the body
  const f = p.face;
  const middle = f && (f.eyes.length ? [f.eyes.reduce((a, e) => a + e[0], 0) / f.eyes.length, f.eyes.reduce((a, e) => a + e[1], 0) / f.eyes.length] : f.mouth);
  const faceHost = f && parts.find((x) => x.role === 'head' && inside(middle, x.points));
  const drawFace = () => {
    if (!f) return;
    if (f.eyes.length) faceEyes(d, params, f.eyes, f.eyeSize, f.skin ?? null);
    if (f.cheeks && f.eyes.length) for (const [x, y] of f.eyes) cheek(d, params, x + (x < middle[0] ? -2.5 : 2.5) * f.eyeSize, y + 4.5 * f.eyeSize, f.eyeSize);
    if (f.mouth) {
      // (a mouth the picture has of its own is covered, in the colour beside it, so only the face's shows)
      if (f.mouthSkin) d.ellipse(f.mouth[0], f.mouth[1] + 0.6 * f.mouthSize, 8 * f.mouthSize, 3.6 * f.mouthSize, { fill: f.mouthSkin, kind: 'body' });
      faceMouth(d, params, f.mouth[0], f.mouth[1], f.mouthSize);
    }
  };
  const style = () => (css.length ? d.raw(`<style>${css.join(' ')}</style>`, { kind: 'body' }) : null);
  const joint = (cls, part) => d.joint(cls, part.pivot, () => { d.raw(part.svg, { kind: 'body' }); if (part === faceHost) drawFace(); });
  const of = (role) => parts.filter((x) => x.role === role).sort((a, b) => a.pivot[0] - b.pivot[0]);

  if (kind === 'none') {
    // No legs: the whole figure hops, wobbles, dances (the scene's motion wrapper); its parts move
    d.group({ class: 'pg-body-torso' }, () => {
      style();
      d.raw(body, { kind: 'body' });
      if (!faceHost) drawFace();
      for (const part of parts) joint(part.role === 'arm' ? 'pg-arm-right' : part.role === 'head' ? 'pg-head' : part.role === 'tail' ? 'pg-tail' : 'pg-part', part);
    });
    return;
  }
  rigged(d, params, kind, () => {
    style();
    const legs = of('leg');
    if (kind === 'person') {
      // (one leg alone hops on it; two step one after the other)
      legs.forEach((leg, i) => joint(i % 2 ? 'pg-leg-right' : 'pg-leg-left', leg));
    } else {
      // Four (or more) legs, facing right: the front ones are the furthest right; in a trot the
      // near front goes with the far hind
      const half = Math.ceil(legs.length / 2), hind = legs.slice(0, legs.length - half), front = legs.slice(legs.length - half);
      hind.forEach((leg, i) => joint(i % 2 ? 'pg-leg-right pg-leg-hind' : 'pg-leg-left pg-leg-hind', leg));
      front.forEach((leg, i) => joint(i % 2 ? 'pg-leg-left pg-leg-front' : 'pg-leg-right pg-leg-front', leg));
    }
    d.group({ class: 'pg-body-torso' }, () => {
      d.raw(body, { kind: 'body' });
      if (!faceHost) drawFace();
      of('tail').forEach((t) => joint('pg-tail', t));
      of('arm').forEach((arm, i, all) => joint(all.length > 1 && i === 0 ? 'pg-arm-left' : 'pg-arm-right', arm));
      of('head').forEach((h) => joint('pg-head', h));
      of('part').forEach((x) => joint('pg-part', x));
    });
  });
}
