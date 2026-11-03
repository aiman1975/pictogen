// Animals' eyes and mouths that show every feeling (happy, laughing, sad, cross, surprised, sleepy,
// in love, winking...), in the usual groups (.pg-face-eyes blinks, .pg-face-mouth talks), sized `s`
// to the head: shared by the animals drawn after reference pictures (animals.js, wildlife.js).

import { INK } from '../core/styles.js';

const r2 = (v) => Math.round(v * 100) / 100;
const line = (stroke, sw) => ({ kind: 'line', stroke, sw, fill: 'none' });
const exprOf = (p) => p.opts.expression || 'happy';

/** One eye at (x, y): white, pupil and shine, or the shape a feeling gives it (k: which eye, for a wink) */
function eye(d, p, x, y, s, k, lid) {
  const e = exprOf(p);
  if (['laugh', 'laughing'].includes(e) || (['wink', 'winking'].includes(e) && k === 1)) {
    d.path(`M${r2(x - 3 * s)} ${r2(y + 0.6 * s)} Q${r2(x)} ${r2(y - 3.4 * s)} ${r2(x + 3 * s)} ${r2(y + 0.6 * s)}`, line(INK, 1.8 * s));
    return;
  }
  if (e === 'love') {
    d.path(`M${r2(x)} ${r2(y + 3 * s)} C${r2(x - 5 * s)} ${r2(y - 1 * s)} ${r2(x - 2.5 * s)} ${r2(y - 4.5 * s)} ${r2(x)} ${r2(y - 1.5 * s)} C${r2(x + 2.5 * s)} ${r2(y - 4.5 * s)} ${r2(x + 5 * s)} ${r2(y - 1 * s)} ${r2(x)} ${r2(y + 3 * s)} Z`, { fill: '#e53935', kind: 'detail' });
    return;
  }
  const big = ['surprised', 'scared', 'shocked'].includes(e) ? 1.2 : 1;
  d.circle(x, y, 3.3 * s * big, { fill: '#ffffff', kind: 'detail', stroke: INK, sw: 0.8 * s });
  d.circle(x + 0.5 * s, y + (e === 'sad' ? 0.8 * s : 0.2 * s), (big > 1 ? 1.5 : 2.2) * s, { fill: INK, kind: 'detail' });
  d.circle(x + 1.3 * s, y - 0.8 * s, 0.75 * s, { kind: 'highlight', fill: '#ffffff', opacity: 0.95 });
  if (e === 'sleepy' && lid) d.path(`M${r2(x - 3.5 * s)} ${r2(y)} A${r2(3.5 * s)} ${r2(3.5 * s)} 0 0 1 ${r2(x + 3.5 * s)} ${r2(y)} Z`, { fill: lid, kind: 'body' });
  // (brows for the feelings that need them)
  const dir = k === 0 ? -1 : 1;
  if (e === 'sad') d.line(x - 3 * s, y - 4.6 * s + dir * 0.8 * s, x + 3 * s, y - 4.6 * s - dir * 0.8 * s, line(INK, 1.2 * s));
  if (['angry', 'mad'].includes(e)) d.line(x - 3 * s, y - 5 * s - dir * 1 * s, x + 3 * s, y - 5 * s + dir * 1 * s, line(INK, 1.4 * s));
}

/** The eyes (one seen from the side, two from the front), blinking together; lid: the fur colour */
export function eyes(d, p, points, s = 1, lid = null) {
  d.group({ class: 'pg-face-eyes' }, () => points.forEach(([x, y], k) => eye(d, p, x, y, s, points.length > 1 ? k : 0, lid)));
}

/** A mouth at (x, y) for the feeling: a smile, a laugh, a frown, an "o", a grumpy line */
export function mouth(d, p, x, y, s = 1) {
  const e = exprOf(p);
  d.group({ class: 'pg-face-mouth' }, () => {
    if (['sad', 'scared'].includes(e)) d.path(`M${r2(x - 2.8 * s)} ${r2(y + 1.4 * s)} Q${r2(x)} ${r2(y - 1.2 * s)} ${r2(x + 2.8 * s)} ${r2(y + 1.4 * s)}`, line(INK, 1.3 * s));
    else if (['angry', 'mad', 'skeptical'].includes(e)) d.line(x - 2.6 * s, y + 0.6 * s, x + 2.6 * s, y, line(INK, 1.3 * s));
    else if (['surprised', 'shocked', 'talking', 'talk'].includes(e)) d.ellipse(x, y + 0.6 * s, 1.5 * s, 1.9 * s, { fill: '#5d1f1f', kind: 'detail' });
    else if (['laugh', 'laughing', 'excited'].includes(e)) d.path(`M${r2(x - 3.2 * s)} ${r2(y - 0.6 * s)} Q${r2(x)} ${r2(y + 4.6 * s)} ${r2(x + 3.2 * s)} ${r2(y - 0.6 * s)} Z`, { fill: '#5d1f1f', kind: 'detail' });
    else d.path(`M${r2(x - 3 * s)} ${r2(y - 0.4 * s)} Q${r2(x)} ${r2(y + 2.8 * s)} ${r2(x + 3 * s)} ${r2(y - 0.6 * s)}`, line(INK, 1.3 * s));
  });
}

/** A rosy cheek (not when cross or scared) */
export function cheek(d, p, x, y, s = 1) {
  if (['angry', 'mad', 'scared'].includes(exprOf(p))) return;
  d.ellipse(x, y, 2.4 * s, 1.6 * s, { fill: '#ff8a80', opacity: 0.55, kind: 'accent' });
}
