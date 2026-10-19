// Characters people ask for, drawn like everyone else (not emoji): the hand-drawn boy, girl, man
// and woman in costume - a teacher with glasses, grandparents, a superhero with a cape, a princess
// with a crown, a doctor in a white coat, a wizard... - plus a baby and a robot of their own.
//
// A costume draws on layers of the person (see dress() in people.js): 'behind' the body, on the
// 'body', on the 'head' (in front of the face) and in 'front'. g says where things are on the
// person as drawn: g.head [cx, cy, r], g.eye (eyes' height), g.fx / g.es (the face's middle and
// half the eye spacing), g.torso [x0, y0, x1, y1], g.shoulders, g.hand, g.foot, and the view
// (g.back, g.side, g.turned). Costumes keep to the picture's style the way the people do: plain
// shapes with kinds (body, detail, line, accent) that every style renders its own way.

import people, { SKIN_TONES, HAIR_COLORS } from './people.js';
import { idleStyle } from './rig.js';
import { INK } from '../core/styles.js';
import { darken, lighten } from '../core/color.js';

const base = (id) => people.find((c) => c.id === id);
const line = (stroke, sw = 1.4) => ({ kind: 'line', stroke, sw, fill: 'none' });
const r1 = (v) => Math.round(v * 10) / 10;
// A colour close to white (it needs an outline to show on a white page)
const light = (c) => { const n = parseInt(String(c).slice(1, 7), 16); return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255) > 700; };

// ---------------------------------------------------------------------------------------------
// Costume parts: each draws one thing for one layer, from where g says things are

const glasses = (color = '#37474f') => (d, p, g) => {
  if (g.back) return;
  if (g.side) {
    d.circle(g.fx + 0.6, g.eye - 0.3, 3.4, line(color, 1.3));
    d.line(g.fx - 2.8, g.eye - 0.8, g.head[0] - g.head[2] * 0.15, g.eye - 1.5, line(color, 1.2));
    return;
  }
  const r = g.es * 0.68;
  for (const sx of [-1, 1]) d.circle(g.fx + sx * g.es, g.eye, r, { ...line(color, 1.3), fill: '#ffffff', opacity: 0.9 });
  d.path(`M${r1(g.fx - g.es + r)} ${g.eye} Q${g.fx} ${g.eye - 1.6} ${r1(g.fx + g.es - r)} ${g.eye}`, line(color, 1.2));
};
// (glasses go on before the eyes are drawn again over the lenses' white)
const lensEyes = (d, p, g) => {
  if (g.back || g.side) return;
  for (const sx of [-1, 1]) d.circle(g.fx + sx * g.es, g.eye, 1.9, { fill: INK, kind: 'detail' });
};

const bun = (d, p, g) => {
  const [cx, cy, r] = g.head;
  d.circle(g.side ? cx - r * 0.55 : cx, cy - r * (g.side ? 0.6 : 0.98), r * 0.42, { fill: p.c('hair'), kind: 'body' });
};

// A bald crown with the hair left at the sides
const bald = (d, p, g) => {
  if (g.back) return;
  const [cx, cy, r] = g.head;
  d.ellipse(g.side ? cx + r * 0.15 : cx, cy - r * 0.62, r * (g.side ? 0.62 : 0.66), r * 0.42, { fill: p.c('skin'), kind: 'body' });
};

const mustache = (color) => (d, p, g) => {
  if (g.back) return;
  const x = g.side ? g.fx + 3.2 : g.fx, y = g.eye + 4.4, w = g.side ? 3.6 : 5.2;
  d.path(`M${r1(x - w)} ${r1(y + 1.4)} Q${r1(x - w / 2)} ${r1(y - 1.2)} ${x} ${r1(y + 0.2)} Q${r1(x + w / 2)} ${r1(y - 1.2)} ${r1(x + w)} ${r1(y + 1.4)} Q${x} ${r1(y + 0.6)} ${r1(x - w)} ${r1(y + 1.4)} Z`, { fill: color, kind: 'body' });
};

// A full beard from cheek to cheek, down over the chest (wizard: long and pointed)
const beard = (color, long = false) => (d, p, g) => {
  if (g.back) return;
  const [cx, cy, r] = g.head, x = g.side ? g.fx : g.fx, y = g.eye + 3.5;
  if (g.side) {
    d.path(`M${r1(cx + r * 0.1)} ${r1(y)} Q${r1(cx + r * 0.95)} ${r1(y - 1)} ${r1(cx + r * 0.8)} ${r1(y + (long ? 18 : 9))} Q${r1(cx + r * 0.2)} ${r1(y + (long ? 12 : 8))} ${r1(cx + r * 0.1)} ${r1(y)} Z`, { fill: color, kind: 'body' });
    return;
  }
  const w = r * 0.85, low = long ? r * 2.1 : r * 0.95;
  d.path(`M${r1(x - w)} ${r1(y - 4)} Q${r1(x - w)} ${r1(y + low * 0.6)} ${x} ${r1(y + low)} Q${r1(x + w)} ${r1(y + low * 0.6)} ${r1(x + w)} ${r1(y - 4)} Q${r1(x + w * 0.5)} ${r1(y + 2)} ${x} ${r1(y + 1.5)} Q${r1(x - w * 0.5)} ${r1(y + 2)} ${r1(x - w)} ${r1(y - 4)} Z`, { fill: color, kind: 'body' });
  d.path(`M${r1(x - 3)} ${r1(y + 3.2)} Q${x} ${r1(y + 4.6)} ${r1(x + 3)} ${r1(y + 3.2)}`, line(darken(color, 0.35), 1.1));
};

const crown = (color = '#ffca28') => (d, p, g) => {
  const [cx, cy, r] = g.head, x = g.side ? cx - r * 0.1 : cx, w = r * (g.side ? 0.8 : 1.05), y = cy - r * 0.78, h = r * 0.62;
  d.path(`M${r1(x - w)} ${r1(y)} L${r1(x - w)} ${r1(y - h)} L${r1(x - w / 2)} ${r1(y - h * 0.45)} L${x} ${r1(y - h * 1.1)} L${r1(x + w / 2)} ${r1(y - h * 0.45)} L${r1(x + w)} ${r1(y - h)} L${r1(x + w)} ${r1(y)} Z`, { fill: color, kind: 'body' });
  d.path(`M${r1(x - w)} ${r1(y)} L${r1(x - w)} ${r1(y - h)} L${r1(x - w / 2)} ${r1(y - h * 0.45)} L${x} ${r1(y - h * 1.1)} L${r1(x + w / 2)} ${r1(y - h * 0.45)} L${r1(x + w)} ${r1(y - h)} L${r1(x + w)} ${r1(y)} Z`, line(darken(color, 0.4), 1));
  for (const [dx, c] of [[-0.5, '#e53935'], [0, '#1e88e5'], [0.5, '#43a047']]) d.circle(x + dx * w, y - h * 0.22, 1.3, { fill: c, kind: 'accent' });
};

// A cap with a peak (police), or a helmet with a brim (firefighter), a chef's hat, a straw hat...
const cap = (color, badge = '#ffca28') => (d, p, g) => {
  const [cx, cy, r] = g.head, x = g.side ? cx - r * 0.05 : cx;
  d.path(`M${r1(x - r * 1.02)} ${r1(cy - r * 0.42)} Q${r1(x - r)} ${r1(cy - r * 1.25)} ${x} ${r1(cy - r * 1.22)} Q${r1(x + r)} ${r1(cy - r * 1.25)} ${r1(x + r * 1.02)} ${r1(cy - r * 0.42)} Z`, { fill: color, kind: 'body' });
  if (!g.back) {
    const peak = g.side ? `M${r1(cx + r * 0.3)} ${r1(cy - r * 0.44)} Q${r1(cx + r * 1.4)} ${r1(cy - r * 0.5)} ${r1(cx + r * 1.45)} ${r1(cy - r * 0.3)} L${r1(cx + r * 0.3)} ${r1(cy - r * 0.32)} Z`
      : `M${r1(x - r * 0.95)} ${r1(cy - r * 0.44)} Q${x} ${r1(cy - r * 0.1)} ${r1(x + r * 0.95)} ${r1(cy - r * 0.44)} Z`;
    d.path(peak, { fill: darken(color, 0.35), kind: 'detail' });
    if (!g.side) d.circle(x, cy - r * 0.78, r * 0.17, { fill: badge, kind: 'accent' });
  }
};
const helmet = (color) => (d, p, g) => {
  const [cx, cy, r] = g.head, x = g.side ? cx - r * 0.05 : cx;
  d.path(`M${r1(x - r * 1.05)} ${r1(cy - r * 0.35)} Q${r1(x - r * 1.05)} ${r1(cy - r * 1.4)} ${x} ${r1(cy - r * 1.38)} Q${r1(x + r * 1.05)} ${r1(cy - r * 1.4)} ${r1(x + r * 1.05)} ${r1(cy - r * 0.35)} Z`, { fill: color, kind: 'body' });
  d.ellipse(x + (g.side ? r * 0.25 : 0), cy - r * 0.36, r * 1.35, r * 0.2, { fill: darken(color, 0.2), kind: 'body' });
  if (!g.back && !g.side) d.path(`M${r1(x - r * 0.25)} ${r1(cy - r * 1.3)} L${r1(x + r * 0.25)} ${r1(cy - r * 1.3)} L${r1(x + r * 0.2)} ${r1(cy - r * 0.55)} L${r1(x - r * 0.2)} ${r1(cy - r * 0.55)} Z`, { fill: '#ffca28', kind: 'accent' });
};
const chefHat = (d, p, g) => {
  const [cx, cy, r] = g.head, x = g.side ? cx - r * 0.1 : cx;
  const puffs = [[-0.5, -1.38, 0.44], [0.5, -1.38, 0.44], [0, -1.58, 0.54]];
  for (const [dx, dy, k] of puffs) d.circle(x + dx * r, cy + dy * r, k * r + 0.8, { fill: '#b0bec5', kind: 'body' });
  d.rect(x - r * 0.75 - 0.8, cy - r * 1.25, r * 1.5 + 1.6, r * 0.6 + 0.8, { fill: '#b0bec5', kind: 'body', rx: 1 });
  d.rect(x - r * 0.75, cy - r * 1.25, r * 1.5, r * 0.6, { fill: '#ffffff', kind: 'body' });
  for (const [dx, dy, k] of puffs) d.circle(x + dx * r, cy + dy * r, k * r, { fill: '#ffffff', kind: 'body' });
  d.line(x - r * 0.75, cy - r * 0.7, x + r * 0.75, cy - r * 0.7, line('#cfd8dc', 1));
};
const strawHat = (d, p, g) => {
  const [cx, cy, r] = g.head, x = g.side ? cx : cx;
  d.ellipse(x, cy - r * 0.62, r * 1.65, r * 0.3, { fill: '#e6c86e', kind: 'body' });
  d.path(`M${r1(x - r * 0.75)} ${r1(cy - r * 0.62)} Q${r1(x - r * 0.75)} ${r1(cy - r * 1.45)} ${x} ${r1(cy - r * 1.45)} Q${r1(x + r * 0.75)} ${r1(cy - r * 1.45)} ${r1(x + r * 0.75)} ${r1(cy - r * 0.62)} Z`, { fill: '#e6c86e', kind: 'body' });
  d.rect(x - r * 0.75, cy - r * 0.86, r * 1.5, r * 0.2, { fill: '#c62828', kind: 'accent' });
};
// A pointed hat (wizard, witch), with stars or plain
const pointyHat = (color, stars = true) => (d, p, g) => {
  const [cx, cy, r] = g.head, x = g.side ? cx - r * 0.1 : cx;
  d.ellipse(x, cy - r * 0.62, r * 1.5, r * 0.26, { fill: color, kind: 'body' });
  d.path(`M${r1(x - r * 0.85)} ${r1(cy - r * 0.62)} Q${r1(x - r * 0.2)} ${r1(cy - r * 1.6)} ${r1(x + r * 0.35)} ${r1(cy - r * 2.55)} Q${r1(x + r * 0.45)} ${r1(cy - r * 1.4)} ${r1(x + r * 0.85)} ${r1(cy - r * 0.62)} Z`, { fill: color, kind: 'body' });
  if (stars) for (const [dx, dy] of [[-0.2, -1.05], [0.25, -1.6], [0.05, -0.8]]) d.circle(x + dx * r, cy + dy * r, 1.1, { fill: '#ffeb3b', kind: 'accent' });
};
const pirateHat = (d, p, g) => {
  const [cx, cy, r] = g.head, x = g.side ? cx - r * 0.1 : cx;
  d.path(`M${r1(x - r * 1.5)} ${r1(cy - r * 0.5)} Q${x} ${r1(cy - r * 2.1)} ${r1(x + r * 1.5)} ${r1(cy - r * 0.5)} Q${x} ${r1(cy - r * 0.85)} ${r1(x - r * 1.5)} ${r1(cy - r * 0.5)} Z`, { fill: '#263238', kind: 'body' });
  if (!g.back && !g.side) {
    d.circle(x, cy - r * 1.05, r * 0.2, { fill: '#ffffff', kind: 'accent' });
    d.line(x - r * 0.22, cy - r * 0.75, x + r * 0.22, cy - r * 0.68, line('#ffffff', 1));
  }
};
const eyepatch = (d, p, g) => {
  if (g.back) return;
  const [cx, cy, r] = g.head;
  const ex = g.side ? g.fx : g.fx + g.es;
  d.line(cx - r * 0.95, cy - r * 0.45, cx + r * 0.95, g.eye - 3, line('#263238', 1.2));
  d.ellipse(ex, g.eye, 3.4, 3, { fill: '#263238', kind: 'detail' });
};
// A mask around the eyes (the eyes still show through)
const mask = (d, p, g) => {
  if (g.back) return;
  const color = p.c('mask');
  if (g.side) {
    d.ellipse(g.fx, g.eye, 3.6, 3, line(color, 2.6));
    d.line(g.fx - 3.4, g.eye, g.head[0] - g.head[2] * 0.6, g.eye - 1, line(color, 2.2));
    return;
  }
  for (const sx of [-1, 1]) d.ellipse(g.fx + sx * g.es, g.eye, 3.5, 2.9, line(color, 2.6));
  d.line(g.fx - g.es + 3.4, g.eye - 0.5, g.fx + g.es - 3.4, g.eye - 0.5, line(color, 2.4));
};
// A space helmet: a glass bubble round the head
const spaceHelmet = (d, p, g) => {
  const [cx, cy, r] = g.head;
  d.circle(cx, cy + 1, r * 1.38, { fill: '#b3e5fc', opacity: 0.28, kind: 'accent' });
  d.circle(cx, cy + 1, r * 1.38, line('#eceff1', 2.6));
  if (!g.back) d.path(`M${r1(cx - r * 0.95)} ${r1(cy - r * 0.6)} Q${r1(cx - r * 0.7)} ${r1(cy - r * 1.1)} ${r1(cx - r * 0.2)} ${r1(cy - r * 1.2)}`, line('#ffffff', 1.6));
};
const nurseCap = (d, p, g) => {
  const [cx, cy, r] = g.head;
  const capPath = `M${r1(cx - r * 0.6)} ${r1(cy - r * 0.8)} L${r1(cx - r * 0.45)} ${r1(cy - r * 1.3)} L${r1(cx + r * 0.45)} ${r1(cy - r * 1.3)} L${r1(cx + r * 0.6)} ${r1(cy - r * 0.8)} Z`;
  d.path(capPath, { fill: '#ffffff', kind: 'body' });
  d.path(capPath, line('#b0bec5', 1));
  if (!g.back && !g.side) {
    d.rect(cx - 0.8, cy - r * 1.22, 1.6, r * 0.34, { fill: '#e53935', kind: 'accent' });
    d.rect(cx - r * 0.17, cy - r * 1.06, r * 0.34, 1.6, { fill: '#e53935', kind: 'accent' });
  }
};

// The body: coats, gowns, capes...
const torsoMid = (g) => (g.torso[0] + g.torso[2]) / 2;
// An open coat or cardigan: two panels over the shirt, down past the hips (long: a doctor's coat)
const coat = (color, long = false) => (d, p, g) => {
  const [x0, y0, x1, y1] = g.torso, m = torsoMid(g), low = y1 + (long ? 12 : 3), gap = g.side ? 0 : 3.2;
  if (g.back || g.side) {
    const whole = `M${x0 - 1} ${y0} L${x1 + 1} ${y0} L${x1 + 2} ${low} L${x0 - 2} ${low} Z`;
    d.path(whole, { fill: color, kind: 'body' });
    if (light(color)) d.path(whole, line('#b0bec5', 1));
    return;
  }
  const left = `M${r1(x0 - 1)} ${y0} L${r1(m - gap)} ${y0} L${r1(m - gap - 1)} ${low} L${r1(x0 - 2)} ${low} Z`;
  const right = `M${r1(m + gap)} ${y0} L${r1(x1 + 1)} ${y0} L${r1(x1 + 2)} ${low} L${r1(m + gap + 1)} ${low} Z`;
  d.path(left, { fill: color, kind: 'body' });
  d.path(right, { fill: color, kind: 'body' });
  // (a white coat needs its edges drawn to show on a white page)
  if (light(color)) for (const panel of [left, right]) d.path(panel, line('#b0bec5', 1));
  d.path(`M${r1(m - gap)} ${y0} L${r1(m - gap - 3)} ${y0 + 7} L${r1(m - gap)} ${y0 + 9}`, line(darken(color, 0.15), 1.1));
  d.path(`M${r1(m + gap)} ${y0} L${r1(m + gap + 3)} ${y0 + 7} L${r1(m + gap)} ${y0 + 9}`, line(darken(color, 0.15), 1.1));
};
// A long skirt from the waist to the ankles, over the legs (a gown, a robe)
const gown = (color, waist = 0.55) => (d, p, g) => {
  const [x0, y0, x1, y1] = g.torso, wy = y0 + (y1 - y0) * waist, m = torsoMid(g), half = (x1 - x0) / 2;
  const hem = g.foot - 4, flare = half + (g.side ? 6 : 10);
  d.path(`M${r1(m - half + 1)} ${r1(wy)} Q${r1(m - flare)} ${r1(hem - 8)} ${r1(m - flare - 1)} ${hem} Q${m} ${hem + 2} ${r1(m + flare + 1)} ${hem} Q${r1(m + flare)} ${r1(hem - 8)} ${r1(m + half - 1)} ${r1(wy)} Z`, { fill: color, kind: 'body' });
  if (!g.side) d.path(`M${r1(m - flare + 4)} ${hem - 3} Q${m} ${hem} ${r1(m + flare - 4)} ${hem - 3}`, line(darken(color, 0.2), 1.1));
};
// A cape from the shoulders to the knees: behind the body, or over it seen from the back
const cape = (d, p, g) => {
  const color = p.c('cape'), [x0, y0, x1] = g.torso, low = g.foot - 16;
  if (g.side) {
    d.path(`M${r1(x0 + 2)} ${y0} Q${r1(x0 - 10)} ${r1(low - 14)} ${r1(x0 - 14)} ${low} L${r1(x0 + 4)} ${low - 2} Z`, { fill: color, kind: 'body' });
    return;
  }
  d.path(`M${r1(x0 + 1)} ${y0} Q${r1(x0 - 9)} ${r1(low - 18)} ${r1(x0 - 11)} ${low} Q${torsoMid(g)} ${low + 5} ${r1(x1 + 11)} ${low} Q${r1(x1 + 9)} ${r1(low - 18)} ${r1(x1 - 1)} ${y0} Z`, { fill: color, kind: 'body' });
};
const emblem = (d, p, g) => {
  if (g.back || g.side) return;
  const m = torsoMid(g) + (g.turned ? 3 : 0), y = g.torso[1] + 9;
  d.poly([[m, y - 5.5], [m + 6, y], [m, y + 5.5], [m - 6, y]], { fill: p.c('emblem', '#ffca28'), kind: 'accent' });
  d.circle(m, y, 2.2, { fill: p.c('cape'), kind: 'accent' });
};
const belt = (color) => (d, p, g) => {
  const [x0, , x1, y1] = g.torso;
  d.rect(x0, y1 - 4.5, x1 - x0, 4, { fill: color, kind: 'accent' });
  if (!g.back && !g.side) d.rect(torsoMid(g) - 2.4, y1 - 5, 4.8, 5, { fill: darken(color, 0.25), kind: 'detail' });
};
const tie = (color) => (d, p, g) => {
  if (g.back || g.side) return;
  const m = torsoMid(g) + (g.turned ? 3 : 0), y = g.torso[1];
  d.poly([[m - 2, y], [m + 2, y], [m + 1.2, y + 3], [m + 2.4, y + 15], [m, y + 18], [m - 2.4, y + 15], [m - 1.2, y + 3]], { fill: color, kind: 'accent' });
};
const badge = (d, p, g) => {
  if (g.back || g.side) return;
  const x = torsoMid(g) - (g.torso[2] - g.torso[0]) * 0.22 + (g.turned ? 3 : 0), y = g.torso[1] + 8;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 1.6 : 3.6;
    pts.push([r1(x + Math.cos(a) * rr), r1(y + Math.sin(a) * rr)]);
  }
  d.poly(pts, { fill: '#ffca28', kind: 'accent' });
};
const stethoscope = (d, p, g) => {
  if (g.back || g.side) return;
  const m = torsoMid(g) + (g.turned ? 3 : 0), y = g.torso[1];
  d.path(`M${m - 5} ${y} Q${m - 6} ${y + 11} ${m} ${y + 13} Q${m + 6} ${y + 11} ${m + 5} ${y}`, line('#455a64', 1.4));
  d.circle(m, y + 14.5, 2, { fill: '#90a4ae', kind: 'detail' });
};
const apron = (color = '#ffffff') => (d, p, g) => {
  if (g.back || g.side) return;
  const [x0, y0, x1, y1] = g.torso, m = torsoMid(g) + (g.turned ? 2 : 0);
  const bib = `M${m - 6} ${y0 + 6} L${m + 6} ${y0 + 6} L${m + 9} ${y1 + 8} L${m - 9} ${y1 + 8} Z`;
  d.path(bib, { fill: color, kind: 'body' });
  if (light(color)) d.path(bib, line('#b0bec5', 1));
  d.path(`M${m - 6} ${y0 + 6} L${r1(x0 + 3)} ${y0}`, line(darken(color, 0.15), 1));
  d.path(`M${m + 6} ${y0 + 6} L${r1(x1 - 3)} ${y0}`, line(darken(color, 0.15), 1));
};
const overalls = (color) => (d, p, g) => {
  const [x0, y0, x1, y1] = g.torso, m = torsoMid(g);
  d.rect(m - 8, y0 + 9, 16, y1 - y0 - 9, { fill: color, kind: 'body' });
  d.rect(x0 + 1, y1 - 7, x1 - x0 - 2, 7, { fill: color, kind: 'body' });
  if (!g.side) {
    d.line(m - 7, y0 + 9, x0 + 4, y0, line(color, 2.6));
    d.line(m + 7, y0 + 9, x1 - 4, y0, line(color, 2.6));
    for (const sx of [-1, 1]) d.circle(m + sx * 6, y0 + 10.5, 1.1, { fill: '#ffca28', kind: 'accent' });
  }
};
// Reflective stripes on a firefighter's coat
const stripes = (d, p, g) => {
  const [x0, , x1, y1] = g.torso;
  for (const y of [y1 - 9, y1 - 4]) d.rect(x0, y, x1 - x0, 2, { fill: '#e0f7fa', kind: 'accent' });
};
// Fairy wings: two pairs, see-through
const wings = (d, p, g) => {
  const [x0, y0, x1] = g.torso, m = torsoMid(g), y = y0 + 6;
  const col = p.c('wing', '#b3e5fc');
  for (const sx of g.side ? [-1] : [-1, 1]) {
    const ex = sx < 0 ? x0 - 14 : x1 + 14;
    for (const [dx, dy, rx, ry] of [[sx * 2, -6, 13, 9], [0, 8, 9, 6]]) {
      d.ellipse((m + ex) / 2 + dx, y + dy, rx, ry, { fill: col, opacity: 0.8, kind: 'accent' });
      d.ellipse((m + ex) / 2 + dx, y + dy, rx, ry, line(darken(col, 0.25), 1));
    }
  }
};
// A walking stick in the right hand, down to the ground
const cane = (d, p, g) => {
  if (g.side) return;
  const [hx, hy] = g.hand;
  d.line(hx + 1, hy - 2, hx + 3, g.foot, line('#6d4c41', 2.6));
  d.path(`M${hx + 1} ${hy - 2} Q${hx - 1} ${hy - 7} ${hx - 5} ${hy - 4}`, line('#6d4c41', 2.6));
};

// Several parts on one layer
const all = (...fns) => (d, p, g) => fns.forEach((f) => f(d, p, g));

// ---------------------------------------------------------------------------------------------
// The characters: a base person, its colours, its costume

/**
 * A character: the drawn person `role` ('boy', 'girl', 'man', 'woman') with `colors` and a
 * `costume` ({ behind, body, head, front }). In styles with their own figures (stickman, cute...)
 * the base person is drawn.
 */
function character(role, def, costume) {
  const b = base(role);
  return {
    ...b,
    tags: ['person', 'people', 'character', ...(def.tags ?? [])],
    palettes: { skin: SKIN_TONES, ...(def.palettes ?? {}) },
    ...def,
    colors: { ...b.colors, ...def.colors },
    role,
    draw(d, p) {
      p.costume = costume;
      return b.draw(d, p);
    },
  };
}

const GREY = '#e0e0e0';

const CHARACTERS = [
  character('woman', { id: 'teacher', aliases: ['woman teacher', 'female teacher', 'professor', 'tutor', 'lecturer'], colors: { main: '#26a69a', hair: '#6d4c41', pants: '#37474f' }, palettes: { hair: HAIR_COLORS } },
    { body: coat('#ffb74d'), head: all(bun, glasses(), lensEyes) }),
  character('man', { id: 'man_teacher', aliases: ['male teacher', 'schoolteacher', 'headmaster', 'principal'], colors: { main: '#90caf9', pants: '#455a64', hair: '#4e342e' }, palettes: { hair: HAIR_COLORS } },
    { body: all(tie('#c62828'), coat('#8d6e63')), head: all(glasses(), lensEyes) }),
  character('man', { id: 'old_man', label: 'grandpa', aliases: ['grandpa', 'grandfather', 'granddad', 'grandad', 'gramps', 'elderly man', 'old man', 'senior', 'grandpas'], colors: { hair: GREY, main: '#a1887f', pants: '#5d4037', shoe: '#3e2723' }, scale: 1.0 },
    { body: coat('#795548'), head: all(bald, glasses(), lensEyes, mustache(GREY)), front: cane }),
  character('woman', { id: 'old_woman', label: 'grandma', aliases: ['grandma', 'grandmother', 'granny', 'nana', 'elderly woman', 'old woman', 'old lady', 'grandmas'], colors: { hair: GREY, main: '#9575cd', pants: '#5e35b1', shoe: '#4527a0' }, scale: 0.97 },
    { body: coat('#f8bbd0'), head: all(bun, glasses(), lensEyes) }),
  character('man', { id: 'man_superhero', label: 'superhero', aliases: ['superhero', 'super hero', 'man superhero'], colors: { main: '#1e88e5', pants: '#1565c0', shoe: '#c62828', cape: '#e53935', mask: '#e53935' }, palettes: { hair: HAIR_COLORS } },
    { behind: (d, p, g) => !g.back && cape(d, p, g), body: all((d, p, g) => g.back && cape(d, p, g), emblem, belt('#ffca28')), head: mask }),
  character('woman', { id: 'woman_superhero', label: 'superheroine', aliases: ['superheroine', 'super heroine', 'heroine', 'woman superhero'], colors: { main: '#8e24aa', pants: '#6a1b9a', shoe: '#ffca28', cape: '#ffca28', mask: '#6a1b9a', emblem: '#e53935' }, palettes: { hair: HAIR_COLORS } },
    { behind: (d, p, g) => !g.back && cape(d, p, g), body: all((d, p, g) => g.back && cape(d, p, g), emblem, belt('#e53935')), head: mask }),
  character('girl', { id: 'princess', aliases: ['princesses', 'little princess'], colors: { main: '#f48fb1', hair: '#e6b94f', shoe: '#ec407a' }, palettes: { hair: HAIR_COLORS, main: ['#f48fb1', '#ce93d8', '#81d4fa', '#ffe082'] } },
    { body: (d, p, g) => gown(p.c('main'), 0.35)(d, p, g), head: crown() }),
  character('boy', { id: 'prince', aliases: ['princes', 'little prince'], colors: { main: '#3949ab', pants: '#283593', cape: '#c62828' }, palettes: { hair: HAIR_COLORS } },
    { behind: (d, p, g) => !g.back && cape(d, p, g), body: all((d, p, g) => g.back && cape(d, p, g), belt('#ffca28')), head: crown() }),
  character('man', { id: 'king', aliases: ['kings', 'emperor'], colors: { main: '#6a1b9a', pants: '#4a148c', hair: '#6d4c41', cape: '#c62828' }, palettes: { hair: HAIR_COLORS } },
    { behind: (d, p, g) => !g.back && cape(d, p, g), body: all((d, p, g) => g.back && cape(d, p, g), belt('#ffca28')), head: all(beard('#6d4c41'), crown()) }),
  character('woman', { id: 'queen', aliases: ['queens', 'empress'], colors: { main: '#c62828', hair: '#4e342e', cape: '#6a1b9a' }, palettes: { hair: HAIR_COLORS } },
    { behind: (d, p, g) => !g.back && cape(d, p, g), body: (d, p, g) => { if (g.back) cape(d, p, g); gown(p.c('main'), 0.4)(d, p, g); }, head: crown() }),
  character('man', { id: 'police_officer', aliases: ['police', 'policeman', 'cop', 'officer', 'police officer', 'sheriff'], colors: { main: '#1a237e', pants: '#1a237e', shoe: '#111111' }, palettes: { hair: HAIR_COLORS } },
    { body: all(badge, belt('#212121')), head: cap('#1a237e') }),
  character('woman', { id: 'policewoman', aliases: ['police woman', 'female officer'], colors: { main: '#1a237e', pants: '#1a237e', shoe: '#111111' }, palettes: { hair: HAIR_COLORS } },
    { body: all(badge, belt('#212121')), head: cap('#1a237e') }),
  character('man', { id: 'firefighter', aliases: ['fireman', 'firemen', 'fire fighter'], colors: { main: '#f9a825', pants: '#f9a825', shoe: '#212121' }, palettes: { hair: HAIR_COLORS } },
    { body: stripes, head: helmet('#d32f2f') }),
  character('man', { id: 'doctor', aliases: ['doc', 'physician', 'surgeon', 'dentist', 'vet', 'veterinarian'], colors: { main: '#90caf9', pants: '#455a64' }, palettes: { hair: HAIR_COLORS } },
    { body: all(coat('#ffffff', true), stethoscope) }),
  character('woman', { id: 'woman_doctor', aliases: ['female doctor', 'lady doctor'], colors: { main: '#f48fb1', pants: '#455a64' }, palettes: { hair: HAIR_COLORS } },
    { body: all(coat('#ffffff', true), stethoscope) }),
  character('woman', { id: 'nurse', aliases: ['nurses', 'paramedic', 'caregiver'], colors: { main: '#4db6ac', pants: '#4db6ac', shoe: '#ffffff' }, palettes: { hair: HAIR_COLORS } },
    { body: stethoscope, head: nurseCap }),
  character('man', { id: 'cook', label: 'chef', aliases: ['chef', 'baker'], colors: { main: '#ffffff', pants: '#424242' }, palettes: { hair: HAIR_COLORS } },
    { body: all(apron('#f5f5f5'), (d, p, g) => !g.back && !g.side && [0, 6].forEach((dy) => d.circle(torsoMid(g) + 4, g.torso[1] + 5 + dy, 1, { fill: '#9e9e9e', kind: 'detail' }))), head: chefHat }),
  character('man', { id: 'farmer', aliases: ['farmers', 'rancher'], colors: { main: '#e53935', pants: '#1565c0', shoe: '#5d4037' }, palettes: { hair: HAIR_COLORS } },
    { body: overalls('#1e88e5'), head: strawHat }),
  character('man', { id: 'astronaut', aliases: ['astronauts', 'spaceman', 'cosmonaut', 'space explorer'], colors: { main: '#eceff1', pants: '#eceff1', shoe: '#90a4ae' }, palettes: { hair: HAIR_COLORS } },
    { body: all(belt('#90a4ae'), (d, p, g) => !g.back && !g.side && d.rect(g.torso[0] + 4, g.torso[1] + 5, 7, 5, { fill: '#1e88e5', kind: 'accent' })), head: spaceHelmet }),
  character('man', { id: 'pirate', aliases: ['pirates', 'captain', 'buccaneer'], colors: { main: '#fafafa', pants: '#5d4037', shoe: '#212121', hair: '#212121' }, palettes: { hair: HAIR_COLORS } },
    { body: all(belt('#5d4037'), (d, p, g) => [0, 6, 12].forEach((dy) => d.rect(g.torso[0], g.torso[1] + 3 + dy, g.torso[2] - g.torso[0], 2.4, { fill: '#e53935', kind: 'accent' }))), head: all(beard('#212121'), eyepatch, pirateHat) }),
  character('man', { id: 'wizard', aliases: ['wizards', 'sorcerer', 'magician', 'mage', 'merlin', 'warlock'], colors: { main: '#5e35b1', hair: GREY, pants: '#4527a0' } },
    { body: gown('#5e35b1', 0.5), head: all(beard('#f5f5f5', true), pointyHat('#4527a0')) }),
  character('woman', { id: 'witch', aliases: ['witches', 'sorceress'], colors: { main: '#4a148c', hair: '#212121', pants: '#311b92' }, palettes: { hair: HAIR_COLORS } },
    { body: gown('#4a148c', 0.5), head: pointyHat('#212121', false) }),
  character('girl', { id: 'fairy', aliases: ['fairies', 'pixie', 'tooth fairy'], colors: { main: '#80deea', hair: '#e6b94f', shoe: '#26c6da', wing: '#b3e5fc' }, palettes: { hair: HAIR_COLORS } },
    { behind: wings }),
];

// ---------------------------------------------------------------------------------------------
// A baby (sitting, round and small, in a romper) and a robot (boxy, with an antenna), drawn whole

const baby = {
  id: 'baby',
  aliases: ['babies', 'infant', 'newborn', 'toddler', 'little baby'],
  tags: ['person', 'child', 'people', 'baby'],
  category: 'people',
  placement: 'ground',
  scale: 0.45,
  baseline: 96,
  width: 0.7,
  colors: { skin: '#f1c27d', hair: '#795548', main: '#81d4fa' },
  palettes: { skin: SKIN_TONES, main: ['#81d4fa', '#f8bbd0', '#fff59d', '#c5e1a5'] },
  draw(d, p) {
    const skin = p.c('skin'), suit = p.c('main');
    d.group({ class: `pg-rig pg-rig-person pg-anim-${p.opts.animation || 'blink'}`, style: idleStyle(p) }, () => {
      // Sitting: legs out in front, feet up
      d.group({ class: 'pg-leg-left' }, () => { d.ellipse(36, 88, 11, 7, { fill: suit }); d.circle(27, 88, 5.5, { fill: skin }); });
      d.group({ class: 'pg-leg-right' }, () => { d.ellipse(64, 88, 11, 7, { fill: suit }); d.circle(73, 88, 5.5, { fill: skin }); });
      d.group({ class: 'pg-body-torso' }, () => {
        d.ellipse(50, 74, 18, 17, { fill: suit });
        d.ellipse(50, 82, 12, 7, { fill: '#ffffff', kind: 'accent' }); // the nappy
        d.group({ class: 'pg-arm-left' }, () => d.ellipse(31, 70, 5, 9, { fill: suit }));
        d.group({ class: 'pg-arm-right' }, () => d.ellipse(69, 70, 5, 9, { fill: suit }));
        d.circle(28, 77, 4.5, { fill: skin });
        d.circle(72, 77, 4.5, { fill: skin });
        // A big head with a curl on top
        d.joint('pg-head', [50, 58], () => {
          d.circle(31.5, 40, 4, { fill: skin });
          d.circle(68.5, 40, 4, { fill: skin });
          d.circle(50, 38, 19, { fill: skin });
          d.path('M46 20 Q50 13 55 17 Q52 15 51 20 Z', { fill: p.c('hair'), kind: 'body' });
          if (p.opts.view !== 'back') {
            const expr = p.opts.expression || 'happy';
            d.group({ class: 'pg-face-eyes' }, () => {
              if (expr === 'sleep' || expr === 'sleepy' || p.opts.animation === 'sleep') {
                d.path('M40 39 Q43 41 46 39', line(INK, 1.6));
                d.path('M54 39 Q57 41 60 39', line(INK, 1.6));
              } else {
                d.circle(43, 38, 2.4, { fill: INK, kind: 'detail' });
                d.circle(57, 38, 2.4, { fill: INK, kind: 'detail' });
                d.circle(43.8, 37.2, 0.8, { kind: 'highlight', opacity: 0.9 });
                d.circle(57.8, 37.2, 0.8, { kind: 'highlight', opacity: 0.9 });
              }
            });
            d.circle(38, 44, 3, { fill: '#ff8a80', opacity: 0.55, kind: 'accent' });
            d.circle(62, 44, 3, { fill: '#ff8a80', opacity: 0.55, kind: 'accent' });
            d.group({ class: 'pg-face-mouth' }, () => {
              if (expr === 'sad' || expr === 'crying') d.path('M46 48 Q50 45 54 48', line(INK, 1.6));
              else d.path('M45 46 Q50 51 55 46 Z', { fill: '#e57373', kind: 'detail' });
            });
          }
        }, p.opts.view === 'back' ? undefined : { face: '50 38 19', mood: p.opts.expression || 'happy', view: 'front' });
      });
    });
  },
};

const robot = {
  id: 'robot',
  aliases: ['robots', 'android', 'droid', 'cyborg', 'bot'],
  tags: ['robot', 'machine', 'character', 'technology'],
  category: 'people',
  placement: 'ground',
  scale: 0.9,
  baseline: 96,
  width: 0.6,
  colors: { main: '#90a4ae', accent: '#29b6f6', eye: '#00e5ff' },
  palettes: { main: ['#90a4ae', '#b0bec5', '#ffb74d', '#81c784', '#e57373'], accent: ['#29b6f6', '#ffca28', '#ef5350', '#ab47bc'] },
  draw(d, p) {
    const metal = p.c('main'), dark = darken(metal, 0.3), light = lighten(metal, 0.3), acc = p.c('accent');
    const anim = p.opts.animation;
    d.group({ class: `pg-rig pg-rig-person pg-anim-${anim || 'blink'}`, style: idleStyle(p) }, () => {
      d.group({ class: 'pg-leg-left' }, () => { d.rect(39, 70, 8, 20, { fill: dark, rx: 2 }); d.rect(36, 89, 13, 6, { fill: metal, rx: 2 }); });
      d.group({ class: 'pg-leg-right' }, () => { d.rect(53, 70, 8, 20, { fill: dark, rx: 2 }); d.rect(51, 89, 13, 6, { fill: metal, rx: 2 }); });
      const arm = (x, up) => {
        if (up) { d.rect(x, 26, 7, 22, { fill: dark, rx: 3 }); d.circle(x + 3.5, 25, 4.5, { fill: metal }); return; }
        d.rect(x, 46, 7, 20, { fill: dark, rx: 3 });
        d.path(`M${x - 1} 68 L${x + 8} 68 L${x + 8} 72 L${x + 5} 72 L${x + 5} 70 L${x + 2} 70 L${x + 2} 72 L${x - 1} 72 Z`, { fill: metal });
      };
      d.group({ class: 'pg-arm-left' }, () => arm(24, anim === 'wave' || anim === 'cheer'));
      d.group({ class: 'pg-arm-right' }, () => arm(69, anim === 'cheer'));
      d.group({ class: 'pg-body-torso' }, () => {
        d.rect(31, 44, 38, 29, { fill: metal, rx: 4 });
        d.rect(38, 50, 24, 14, { fill: light, rx: 2 });
        [['#ef5350', 43], ['#ffca28', 50], ['#66bb6a', 57]].forEach(([c, x]) => d.circle(x, 57, 2.2, { fill: c, kind: 'accent' }));
        d.rect(46, 39, 8, 6, { fill: dark });
        d.joint('pg-head', [50, 42], () => {
          d.line(50, 14, 50, 6, line(dark, 1.8));
          d.circle(50, 5, 2.6, { fill: acc, kind: 'accent' });
          d.rect(30, 26, 4, 8, { fill: dark, rx: 1 });
          d.rect(66, 26, 4, 8, { fill: dark, rx: 1 });
          d.rect(33, 14, 34, 26, { fill: metal, rx: 6 });
          if (p.opts.view !== 'back') {
            d.rect(37, 19, 26, 13, { fill: '#263238', rx: 4 });
            const expr = p.opts.expression || 'happy';
            d.group({ class: 'pg-face-eyes' }, () => {
              if (expr === 'happy' || expr === 'laugh') {
                d.path('M41 27 Q44 22 47 27', line(p.c('eye'), 2));
                d.path('M53 27 Q56 22 59 27', line(p.c('eye'), 2));
              } else {
                d.circle(44, 25.5, 2.6, { fill: p.c('eye'), kind: 'accent' });
                d.circle(56, 25.5, 2.6, { fill: p.c('eye'), kind: 'accent' });
              }
            });
            d.group({ class: 'pg-face-mouth' }, () => {
              for (const x of [43, 47, 51, 55]) d.rect(x, 34.5, 2.6, 2.4, { fill: dark, kind: 'detail' });
            });
          }
        });
      });
    });
  },
};

export default [...CHARACTERS, baby, robot];
