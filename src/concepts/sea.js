// Sea animals drawn whole on the shared skeleton (src/concepts/rig.js), from reference pictures made
// once with Gemini and drawn again here in code: an octopus, a sea turtle, a seahorse, a crab, a
// whale and a starfish. Each has its moving parts (src/sea-motion.js: tentacles curl, claws snap,
// little legs scuttle, fins paddle, tails beat, a spout puffs, a starfish wiggles), bobs in the
// water, shows every feeling, blinks and talks, and comes out in every style.

import { rigged } from './rig.js';
import { drawFacialExpression } from './people.js';
import { INK } from '../core/styles.js';
import { darken, lighten } from '../core/color.js';

const r2 = (v) => Math.round(v * 100) / 100;
const line = (stroke, sw = 1.4) => ({ kind: 'line', stroke, sw, fill: 'none' });
const waving = (p) => ['wave', 'cheer', 'jump'].includes(p.opts.animation);
const fromBehind = (p) => p.opts.view === 'back';

/**
 * A limb drawn as one filled shape along a curve (a cubic from a through b and c to e), wide w0 at
 * its root and w1 at its tip, with a round tip: tentacles, a seahorse's tail.
 */
export function limb(d, [a, b, c, e], w0, w1, o) {
  const pt = (t) => {
    const u = 1 - t;
    return [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * e[k]);
  };
  const n = 14, left = [], right = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, [x, y] = pt(t), [x2, y2] = pt(Math.min(1, t + 0.01)), [x1, y1] = pt(Math.max(0, t - 0.01));
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * t) / 2;
    left.push([x - (dy / len) * w, y + (dx / len) * w]);
    right.push([x + (dy / len) * w, y - (dx / len) * w]);
  }
  const P = (q) => `${r2(q[0])} ${r2(q[1])}`;
  const tip = pt(1);
  d.path(`M${P(left[0])} ${left.slice(1).map((q) => `L${P(q)}`).join(' ')} A${r2(w1 / 2)} ${r2(w1 / 2)} 0 0 0 ${P(right[n])} ${right.slice(0, n).reverse().map((q) => `L${P(q)}`).join(' ')} Z`, o);
  return tip;
}

/** A face seen from the side (one eye, a mouth in front of it), with the feeling it shows */
export function sideFace(d, p, x, y, s = 1) {
  const expr = p.opts.expression || 'happy';
  d.group({ class: 'pg-face-eyes' }, () => {
    if (['laugh', 'laughing', 'wink', 'winking'].includes(expr)) {
      d.path(`M${r2(x - 3 * s)} ${r2(y + 0.5 * s)} Q${r2(x)} ${r2(y - 3.5 * s)} ${r2(x + 3 * s)} ${r2(y + 0.5 * s)}`, line(INK, 2 * s));
      return;
    }
    if (expr === 'love') {
      d.path(`M${r2(x)} ${r2(y + 3 * s)} C${r2(x - 5 * s)} ${r2(y - 1 * s)} ${r2(x - 2.5 * s)} ${r2(y - 4.5 * s)} ${r2(x)} ${r2(y - 1.5 * s)} C${r2(x + 2.5 * s)} ${r2(y - 4.5 * s)} ${r2(x + 5 * s)} ${r2(y - 1 * s)} ${r2(x)} ${r2(y + 3 * s)} Z`, { fill: '#e53935', kind: 'detail' });
      return;
    }
    const big = ['surprised', 'scared', 'shocked'].includes(expr) ? 1.25 : 1;
    d.circle(x, y, 3.6 * s * big, { fill: '#ffffff', kind: 'detail', stroke: INK, sw: 0.9 * s });
    d.circle(x + 0.8 * s, y + (expr === 'sad' ? 0.8 * s : 0), (big > 1 ? 1.6 : 2.3) * s, { fill: INK, kind: 'detail' });
    d.circle(x + 1.6 * s, y - 0.9 * s, 0.8 * s, { kind: 'highlight', fill: '#ffffff', opacity: 0.95 });
    if (expr === 'sleepy') d.path(`M${r2(x - 3.8 * s)} ${r2(y)} A${r2(3.8 * s)} ${r2(3.8 * s)} 0 0 1 ${r2(x + 3.8 * s)} ${r2(y)} Z`, { fill: p.c('main'), kind: 'body' });
    if (expr === 'sad') d.line(x - 3 * s, y - 5 * s, x + 2.5 * s, y - 6.5 * s, line(INK, 1.3 * s));
    if (expr === 'angry') d.line(x - 3 * s, y - 6.5 * s, x + 3 * s, y - 4.5 * s, line(INK, 1.5 * s));
  });
  const mx = x + 4.5 * s, my = y + 6 * s;
  d.group({ class: 'pg-face-mouth' }, () => {
    if (['sad', 'angry', 'scared'].includes(expr)) d.path(`M${r2(mx - 3 * s)} ${r2(my + 1.5 * s)} Q${r2(mx)} ${r2(my - 1.2 * s)} ${r2(mx + 3 * s)} ${r2(my + 1.5 * s)}`, line(INK, 1.4 * s));
    else if (['surprised', 'shocked', 'talking', 'talk'].includes(expr)) d.ellipse(mx, my, 1.6 * s, 2 * s, { fill: '#5d1f1f', kind: 'detail' });
    else if (['laugh', 'laughing', 'excited'].includes(expr)) d.path(`M${r2(mx - 3.5 * s)} ${r2(my - 1 * s)} Q${r2(mx)} ${r2(my + 5 * s)} ${r2(mx + 3.5 * s)} ${r2(my - 1 * s)} Z`, { fill: '#5d1f1f', kind: 'detail' });
    else d.path(`M${r2(mx - 3.5 * s)} ${r2(my - 0.5 * s)} Q${r2(mx)} ${r2(my + 3 * s)} ${r2(mx + 3.5 * s)} ${r2(my - 1 * s)}`, line(INK, 1.4 * s));
  });
  if (!['angry', 'scared'].includes(expr)) d.circle(x + 1 * s, y + 5.5 * s, 2 * s, { fill: '#ff8a80', opacity: 0.5, kind: 'accent' });
}

/** A front face (src/concepts/people.js), scaled to the head */
const frontFace = (d, p, cx, cy, k) => d.group(`translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})`, () => drawFacialExpression(d, p, cx, cy));
const head = (d, p, [cx, cy, r], pivot, fn) => d.joint('pg-head', pivot, fn, fromBehind(p) ? undefined : { face: `${cx} ${cy} ${r}`, mood: p.opts.expression || 'happy', view: 'front' });
const sea = (d, p, fn) => rigged(d, p, 'sea', () => d.group({ class: 'pg-sea-bob' }, fn));

const octopus = {
  id: 'octopus',
  aliases: ['octopus', 'octopuses', 'octopi', 'octopusses'],
  tags: ['animal', 'sea', 'ocean', 'underwater', 'tentacles', 'swim'],
  category: 'animals',
  placement: 'underwater',
  scale: 0.55,
  baseline: 94,
  width: 0.92,
  colors: { main: '#f4845f', under: '#fde2c4', spots: '#8ecae6' },
  palettes: { main: ['#f4845f', '#b39ddb', '#f06292', '#ffb74d', '#4fc3f7'] },
  draw(d, p) {
    const main = p.c('main'), under = p.c('under'), spots = p.c('spots');
    sea(d, p, () => {
      // Eight tentacles, curling: the outer two are its "arms"
      const tentacle = (sx, [b, c, e], w = 8, cls = 'pg-tentacle') => {
        const a = [50 + sx * (b[2] ?? 8), 54];
        d.joint(cls, a, () => {
          limb(d, [a, [50 + sx * b[0], b[1]], [50 + sx * c[0], c[1]], [50 + sx * e[0], e[1]]], w, 3, { fill: main, kind: 'body' });
          for (const t of [0.35, 0.6]) d.circle(50 + sx * (b[0] + (c[0] - b[0]) * t), b[1] + (c[1] - b[1]) * t + 2.5, 1.2, { fill: under, kind: 'detail' });
        });
      };
      for (const sx of [-1, 1]) {
        // (their tips curl up and out)
        tentacle(sx, [[16, 74, 6], [24, 94], [36, 86]], 8.5);
        tentacle(sx, [[26, 68, 10], [42, 84], [44, 72]], 8.5);
        tentacle(sx, [[6, 82, 3], [10, 96], [20, 92]], 7.5);
      }
      // (raised when waving or cheering)
      const up = waving(p);
      d.joint('pg-arm-left', [36, 54], () => limb(d, [[36, 54], [24, 58], [16, 54], [12, 44]], 8, 3, { fill: main, kind: 'body' }));
      d.joint('pg-arm-right', [64, 54], () => limb(d, up ? [[64, 52], [76, 44], [84, 30], [80, 20]] : [[64, 54], [76, 58], [84, 54], [88, 44]], 8, 3, { fill: main, kind: 'body' }));
      d.group({ class: 'pg-body-torso' }, () => head(d, p, [50, 36, 22], [50, 56], () => {
        d.ellipse(50, 34, 22, 24, { fill: main, kind: 'body' });
        d.ellipse(50, 52, 16, 6, { fill: main, kind: 'body' });
        for (const [x, y, r] of [[38, 20, 2.6], [44, 14, 1.8], [62, 22, 2.2], [58, 13, 1.5], [34, 30, 1.4]]) d.circle(x, y, r, { fill: spots, kind: 'accent' });
        if (!fromBehind(p)) frontFace(d, p, 50, 38, 1.3);
      }));
    });
  },
};

const seaTurtle = {
  id: 'sea_turtle',
  label: 'sea turtle',
  aliases: ['sea turtle', 'sea turtles', 'turtle swimming', 'swimming turtle', 'ocean turtle'],
  tags: ['animal', 'sea', 'ocean', 'underwater', 'turtle', 'reptile', 'swim'],
  category: 'animals',
  placement: 'underwater',
  scale: 0.5,
  baseline: 84,
  width: 0.96,
  colors: { main: '#5fbfa6', shell: '#4caf50', plates: '#7cc576', belly: '#ffe9a8' },
  palettes: { shell: ['#4caf50', '#8d6e63', '#26a69a', '#7cb342'] },
  draw(d, p) {
    const skin = p.c('main'), shell = p.c('shell'), dark = darken(shell, 0.25), plates = p.c('plates');
    sea(d, p, () => {
      // Flippers on the far side, behind
      d.joint('pg-leg-left', [32, 62], () => d.path('M32 60 Q24 72 18 80 Q30 78 38 66 Z', { fill: darken(skin, 0.12), kind: 'body' }));
      d.joint('pg-arm-left', [60, 62], () => d.path('M58 60 Q70 70 74 82 Q64 78 54 66 Z', { fill: darken(skin, 0.12), kind: 'body' }));
      d.joint('pg-tail', [24, 62], () => d.path('M26 60 L14 66 L26 66 Z', { fill: skin, kind: 'body' }));
      d.group({ class: 'pg-body-torso' }, () => {
        // The belly plate, the shell dome with its pattern and rim
        d.path('M22 62 Q48 74 74 62 L72 58 L24 58 Z', { fill: p.c('belly'), kind: 'body' });
        d.path('M20 62 Q22 28 48 26 Q74 28 76 62 Z', { fill: shell, kind: 'body' });
        d.path('M20 62 Q48 70 76 62 L76 58 Q48 65 20 58 Z', { fill: dark, kind: 'body' });
        for (const [x, y, s] of [[48, 40, 7], [35, 47, 6], [61, 47, 6], [40, 34, 4.5], [57, 34, 4.5], [48, 54, 5]]) {
          const pts = Array.from({ length: 6 }, (_, k) => { const a = (Math.PI / 3) * k + Math.PI / 6; return `${r2(x + Math.cos(a) * s)} ${r2(y + Math.sin(a) * s * 0.9)}`; });
          d.path(`M${pts.join(' L')} Z`, { fill: plates, kind: 'accent', stroke: dark, sw: 1 });
        }
        head(d, p, [82, 46, 11], [72, 58], () => {
          d.path('M66 60 Q72 50 78 50 L82 56 Q74 62 70 64 Z', { fill: skin, kind: 'body' });
          d.circle(82, 46, 11, { fill: skin, kind: 'body' });
          if (!fromBehind(p)) frontFace(d, p, 83, 45, 0.72);
        });
      });
      // The near flippers, in front
      d.joint('pg-leg-right', [30, 64], () => d.path('M30 62 Q20 72 12 78 Q26 80 36 68 Z', { fill: skin, kind: 'body' }));
      const up = waving(p);
      d.joint('pg-arm-right', [62, 64], () => d.path(up ? 'M60 62 Q72 52 86 46 Q80 58 66 68 Z' : 'M60 62 Q76 68 84 82 Q70 80 56 68 Z', { fill: skin, kind: 'body' }));
    });
  },
};

const seahorse = {
  id: 'seahorse',
  aliases: ['seahorse', 'seahorses', 'sea horse', 'sea horses'],
  tags: ['animal', 'sea', 'ocean', 'underwater', 'fish', 'swim'],
  category: 'animals',
  placement: 'underwater',
  scale: 0.35,
  baseline: 92,
  width: 0.5,
  colors: { main: '#4db6ac', belly: '#ffe082', fin: '#81d4fa', spots: '#ffb74d' },
  palettes: { main: ['#4db6ac', '#ffb74d', '#f48fb1', '#9575cd', '#fdd835'] },
  draw(d, p) {
    const main = p.c('main'), dark = darken(main, 0.2);
    sea(d, p, () => {
      // The fin on its back, paddling; the tail curled below
      d.joint('pg-sea-fin', [44, 48], () => d.path('M46 40 Q30 40 30 50 Q34 58 46 56 Z', { fill: p.c('fin'), kind: 'body' }));
      d.joint('pg-tail', [50, 66], () => {
        limb(d, [[51, 64], [42, 76], [44, 90], [54, 88]], 9, 4, { fill: main, kind: 'body' });
        d.path('M54 88 Q60 84 56 79 Q52 77 51 81', line(main, 3.6));
      });
      d.group({ class: 'pg-body-torso' }, () => {
        limb(d, [[54, 28], [64, 40], [62, 58], [51, 66]], 16, 9, { fill: main, kind: 'body' });
        // The striped belly along the front
        d.path('M60 34 Q68 44 64 58 L58 58 Q62 46 56 36 Z', { fill: p.c('belly'), kind: 'accent' });
        for (const y of [40, 46, 52]) d.line(58, y, 64, y + 1, line(darken(p.c('belly'), 0.25), 0.9));
        for (const [x, y] of [[50, 44], [52, 54], [48, 36]]) d.circle(x, y, 1.4, { fill: p.c('spots'), kind: 'accent' });
        head(d, p, [56, 20, 9], [54, 30], () => {
          // A little crown, the head, the long snout
          d.path('M48 14 L50 6 L53 12 L56 5 L58 12 L61 8 L60 15 Z', { fill: dark, kind: 'body' });
          d.path('M62 18 L78 19 Q80 22 78 25 L62 26 Z', { fill: main, kind: 'body' });
          d.circle(56, 20, 9, { fill: main, kind: 'body' });
          if (!fromBehind(p)) sideFace(d, p, 58, 18, 0.85);
        });
      });
    });
  },
};

const crab = {
  id: 'crab',
  aliases: ['crab', 'crabs', 'hermit crab', 'little crab'],
  tags: ['animal', 'sea', 'ocean', 'beach', 'underwater', 'claws'],
  category: 'animals',
  placement: 'ground', // (on the sand: the beach or the seabed)
  scale: 0.32,
  baseline: 90,
  width: 0.96,
  colors: { main: '#e53935', belly: '#ffab91' },
  palettes: { main: ['#e53935', '#fb8c00', '#8e24aa', '#1e88e5'] },
  draw(d, p) {
    const main = p.c('main'), dark = darken(main, 0.22), expr = p.opts.expression || 'happy';
    sea(d, p, () => {
      // Three little legs a side, scuttling
      for (const [cls, sx] of [['pg-leg-left', -1], ['pg-leg-right', 1]]) {
        d.group({ class: cls }, () => {
          for (const [k, y] of [[0, 66], [1, 71], [2, 75]]) {
            const x0 = 50 + sx * (18 - k * 2);
            d.joint('pg-sea-leg', [x0, y], () => d.path(`M${x0} ${y} L${x0 + sx * (11 - k)} ${y - 2 + k} L${x0 + sx * (14 - k)} ${y + 9 + k}`, line(dark, 2.6)));
          }
        });
      }
      // The claws on their arms, the top jaw snapping
      const claw = (sx, up) => {
        const cx = 50 + sx * 34, cy = up ? 22 : 34;
        limb(d, [[50 + sx * 18, 60], [50 + sx * 26, 54], [50 + sx * 32, 46], [cx - sx * 2, cy + 8]], 6, 5, { fill: main, kind: 'body' });
        // (two jaws open in a V: the lower one fixed, the upper one snapping)
        d.path(`M${cx - sx * 8} ${cy + 1} L${cx + sx * 1} ${cy + 2} L${cx + sx * 8} ${cy + 6} Q${cx + sx * 5} ${cy + 11} ${cx - sx * 3} ${cy + 10} Q${cx - sx * 9} ${cy + 8} ${cx - sx * 8} ${cy + 1} Z`, { fill: main, kind: 'body' });
        d.joint('pg-claw-top', [cx - sx * 6, cy], () => d.path(`M${cx - sx * 8} ${cy} Q${cx - sx * 7} ${cy - 11} ${cx + sx * 3} ${cy - 10} Q${cx + sx * 11} ${cy - 7} ${cx + sx * 10} ${cy - 1} L${cx + sx * 1} ${cy - 1} Z`, { fill: main, kind: 'body' }));
      };
      d.joint('pg-arm-left', [32, 60], () => claw(-1, true));
      d.joint('pg-arm-right', [68, 60], () => claw(1, true));
      d.group({ class: 'pg-body-torso' }, () => {
        d.ellipse(50, 64, 22, 14, { fill: main, kind: 'body' });
        d.ellipse(50, 70, 12, 6, { fill: p.c('belly'), kind: 'accent' });
        for (const x of [46, 50, 54]) d.line(x, 66, x, 74, line(darken(p.c('belly'), 0.2), 0.8));
        head(d, p, [50, 40, 14], [50, 56], () => {
          // Eyes on stalks
          for (const sx of [-1, 1]) d.line(50 + sx * 6, 54, 50 + sx * 8, 40, line(main, 3));
          d.group({ class: 'pg-face-eyes' }, () => {
            for (const sx of [-1, 1]) {
              const x = 50 + sx * 8, y = 36;
              if (['laugh', 'laughing'].includes(expr) || (expr === 'wink' && sx > 0)) {
                d.circle(x, y, 5.5, { fill: '#ffffff', kind: 'detail', stroke: INK, sw: 1 });
                d.path(`M${x - 3} ${y + 1} Q${x} ${y - 3} ${x + 3} ${y + 1}`, line(INK, 1.8));
                continue;
              }
              d.circle(x, y, 5.5, { fill: '#ffffff', kind: 'detail', stroke: INK, sw: 1 });
              if (expr === 'love') { d.path(`M${x} ${y + 3} C${x - 5} ${y - 1} ${x - 2.5} ${y - 4.5} ${x} ${y - 1.5} C${x + 2.5} ${y - 4.5} ${x + 5} ${y - 1} ${x} ${y + 3} Z`, { fill: '#e53935', kind: 'detail' }); continue; }
              d.circle(x, y + (expr === 'sad' ? 1.2 : 0.4), ['surprised', 'scared'].includes(expr) ? 1.8 : 2.8, { fill: INK, kind: 'detail' });
              d.circle(x + 1, y - 1, 0.9, { kind: 'highlight', fill: '#ffffff' });
              if (expr === 'sleepy') d.path(`M${x - 5.5} ${y} A5.5 5.5 0 0 1 ${x + 5.5} ${y} Z`, { fill: main, kind: 'body' });
              if (expr === 'angry') d.line(x - sx * 5, y - 8, x + sx * 4, y - 5, line(INK, 1.6));
              if (expr === 'sad') d.line(x - sx * 4, y - 6, x + sx * 4, y - 8, line(INK, 1.4));
            }
          });
          d.group({ class: 'pg-face-mouth' }, () => {
            if (['sad', 'angry', 'scared'].includes(expr)) d.path('M45 61 Q50 57 55 61', line(INK, 1.6));
            else if (['surprised', 'talking', 'talk'].includes(expr)) d.ellipse(50, 59, 2, 2.4, { fill: '#5d1f1f', kind: 'detail' });
            else d.path('M44 57 Q50 62 56 57', line(INK, 1.6));
          });
        });
      });
    });
  },
};

const whale = {
  id: 'whale',
  aliases: ['whale', 'whales', 'blue whale', 'baby whale', 'humpback whale'],
  tags: ['animal', 'sea', 'ocean', 'underwater', 'mammal', 'swim', 'big'],
  category: 'animals',
  placement: 'underwater',
  scale: 1.1,
  baseline: 84,
  width: 1,
  colors: { main: '#4fa8e0', belly: '#e3f2fd', spout: '#b3e5fc' },
  palettes: { main: ['#4fa8e0', '#5c6bc0', '#78909c', '#26a69a'] },
  draw(d, p) {
    const main = p.c('main'), dark = darken(main, 0.2);
    sea(d, p, () => {
      d.joint('pg-tail', [24, 58], () => d.path('M26 56 Q14 54 10 46 L2 40 Q10 38 14 44 Q12 34 18 30 Q20 42 24 50 L28 62 Z', { fill: main, kind: 'body' }));
      d.group({ class: 'pg-body-torso' }, () => {
        d.path('M50 34 L44 26 Q48 26 56 33 Z', { fill: dark, kind: 'body' });
        d.path('M18 58 Q20 34 50 32 Q78 30 88 52 Q92 64 80 70 Q60 80 36 76 Q20 72 18 58 Z', { fill: main, kind: 'body' });
        // The pale belly with its grooves
        d.path('M30 70 Q56 82 84 66 Q86 62 89 58 Q74 74 30 70 Z', { fill: p.c('belly'), kind: 'accent' });
        for (const x of [44, 54, 64, 74]) d.path(`M${x} ${x < 60 ? 73 : 71} Q${x + 4} ${x < 60 ? 75 : 73} ${x + 8} ${x < 60 ? 74 : 71}`, line(lighten(main, 0.35), 0.9));
        // The spout from its blowhole, puffing
        d.joint('pg-spout', [66, 30], () => {
          for (const [dx, h] of [[-6, 9], [0, 13], [6, 9]]) d.path(`M66 31 Q${66 + dx * 0.8} ${31 - h * 0.6} ${66 + dx} ${31 - h} Q${66 + dx * 1.3} ${31 - h + 3} ${66 + dx * 0.6} ${31 - h * 0.3} Z`, { fill: p.c('spout'), kind: 'accent' });
        });
        head(d, p, [74, 52, 14], [70, 60], () => { if (!fromBehind(p)) sideFace(d, p, 74, 52, 1.05); });
        d.joint('pg-sea-fin', [56, 66], () => d.path('M58 66 Q52 78 40 84 Q50 72 52 64 Z', { fill: dark, kind: 'body' }));
      });
    });
  },
};

const starfish = {
  id: 'starfish',
  aliases: ['starfish', 'starfishes', 'sea star', 'sea stars'],
  tags: ['animal', 'sea', 'ocean', 'beach', 'underwater', 'star'],
  category: 'animals',
  placement: 'ground', // (on the sand: the beach or the seabed)
  scale: 0.24,
  baseline: 92,
  width: 0.9,
  colors: { main: '#ff9a3c', dots: '#e86a1c' },
  palettes: { main: ['#ff9a3c', '#f06292', '#ffd54f', '#ba68c8', '#ef5350'] },
  draw(d, p) {
    const main = p.c('main'), cx = 50, cy = 55;
    sea(d, p, () => d.joint('pg-star-wiggle', [50, 60], () => d.group({ class: 'pg-body-torso' }, () => {
      // Five arms, rounded, curving in between
      const outer = (k) => { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; return [cx + Math.cos(a) * 40, cy + Math.sin(a) * 38]; };
      const inner = (k) => { const a = -Math.PI / 2 + ((k + 0.5) * 2 * Math.PI) / 5; return [cx + Math.cos(a) * 14, cy + Math.sin(a) * 13]; };
      let dd = `M${outer(0).map(r2).join(' ')}`;
      for (let k = 0; k < 5; k++) dd += ` Q${inner(k).map(r2).join(' ')} ${outer(k + 1).map(r2).join(' ')}`;
      d.path(`${dd} Z`, { fill: main, kind: 'body', stroke: darken(main, 0.15), sw: 1 });
      for (let k = 0; k < 5; k++) {
        const [ox, oy] = outer(k);
        for (const t of [0.45, 0.7]) d.circle(cx + (ox - cx) * t, cy + (oy - cy) * t, 1.3, { fill: p.c('dots'), kind: 'accent' });
      }
      head(d, p, [50, 56, 14], [50, 60], () => { if (!fromBehind(p)) frontFace(d, p, 50, 54, 1.2); });
    })));
  },
};

export default [octopus, seaTurtle, seahorse, crab, whale, starfish];
