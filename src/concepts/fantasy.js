// Fantasy friends drawn whole (after reference pictures made once with Gemini, docs/LICENSE_AUDIT.md):
// a unicorn with a rainbow mane, a friendly furry monster and a little ghost. They walk, wave, jump
// and dance like everyone else on the shared skeleton (src/concepts/rig.js), show every feeling,
// blink and talk. (The knight, the mermaid and the genie are costumes: src/concepts/characters.js.)

import { rigged, idleStyle } from './rig.js';
import { drawFacialExpression } from './people.js';
import { sideFace } from './sea.js';
import { NEAR_FRONT, FAR_FRONT, NEAR_HIND, FAR_HIND } from './animals.js';
import { darken, lighten } from '../core/color.js';

const line = (stroke, sw = 1.4) => ({ kind: 'line', stroke, sw, fill: 'none' });
const waving = (p) => ['wave', 'cheer', 'jump'].includes(p.opts.animation);
const cheering = (p) => ['cheer', 'jump'].includes(p.opts.animation);
const fromBehind = (p) => p.opts.view === 'back';
const RAINBOW = ['#ef5350', '#ffa726', '#ffee58', '#66bb6a', '#42a5f5', '#ab47bc'];
const person = (d, p, fn) => d.group({ class: `pg-rig pg-rig-person pg-anim-${p.opts.animation || 'blink'}`, style: idleStyle(p) }, fn);
const frontFace = (d, p, cx, cy, k) => d.group(`translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})`, () => drawFacialExpression(d, p, cx, cy));

const unicorn = {
  id: 'unicorn',
  aliases: ['unicorn', 'unicorns', 'rainbow unicorn', 'magic unicorn', 'baby unicorn'],
  tags: ['fantasy', 'animal', 'horse', 'magic', 'rainbow', 'fairy tale', 'story'],
  category: 'animals',
  placement: 'ground',
  scale: 1.0,
  baseline: 94,
  width: 0.9,
  // Facing right. Where a rider goes (src/scene.js): hips on its back, hands on its neck
  saddle: [47, 47],
  grip: [66, 40],
  colors: { main: '#ffffff', hoof: '#f48fb1', horn: '#ffca28' },
  palettes: { main: ['#ffffff', '#f8bbd0', '#e1bee7', '#b3e5fc'] },
  draw(d, p) {
    const coat = p.c('main'), far = darken(coat, 0.08), edge = { stroke: '#b0bec5', sw: 1 };
    const leg = (x, fill) => () => { d.rect(x, 64, 7, 26, { rx: 3, fill, kind: 'body', ...edge }); d.rect(x, 88, 7, 5, { rx: 1.5, fill: p.c('hoof'), kind: 'body' }); };
    rigged(d, p, 'quadruped', () => {
      d.joint(FAR_HIND, null, leg(28, far));
      d.joint(FAR_FRONT, null, leg(64, far));
      d.joint(NEAR_HIND, null, leg(36, coat));
      d.joint(NEAR_FRONT, null, leg(56, coat));
      d.group({ class: 'pg-body-torso' }, () => {
        // A rainbow tail, swishing
        // (each colour a strand of its own, side by side)
        d.joint('pg-tail', [26, 52], () => RAINBOW.forEach((c, k) => d.path(`M${27} ${49 + k * 1.8} Q${14 - k * 0.5} ${50 + k * 2.2} ${11 + k * 1.2} ${70 + k * 1.4}`, line(c, 2.6))));
        d.ellipse(48, 58, 24, 14, { fill: coat, kind: 'body', ...edge });
        d.path('M62 54 L70 32 L82 36 L74 62 Z', { fill: coat, kind: 'body', ...edge });
        d.joint('pg-head', [74, 44], () => {
          // The mane in rainbow stripes down the neck, the head, the golden horn
          RAINBOW.forEach((c, k) => d.path(`M${76 - k * 1.5} ${20 + k * 1.2} Q${64 - k * 1.6} ${30 + k * 1.5} ${62 - k * 0.9} ${52 - k * 0.6}`, line(c, 2.6)));
          d.path('M72 28 Q76 18 86 22 Q94 26 92 34 Q90 40 82 40 Q74 40 72 34 Z', { fill: coat, kind: 'body', ...edge });
          d.path('M75 20 L79 6 L82 20 Z', { fill: p.c('horn'), kind: 'body' });
          for (const y of [10, 14, 18]) d.line(77, y, 81, y - 1.5, line(darken(p.c('horn'), 0.3), 0.9));
          d.path('M73 22 L72 14 L77 19 Z', { fill: coat, kind: 'body', ...edge });
          d.circle(90, 33, 0.9, { fill: '#b0bec5', kind: 'detail' });
          if (!fromBehind(p)) sideFace(d, p, 82, 28, 0.8);
        });
      });
    });
  },
};

const monster = {
  id: 'friendly_monster',
  label: 'monster',
  aliases: ['monster', 'monsters', 'friendly monster', 'little monster', 'furry monster', 'cute monster', 'baby monster'],
  tags: ['fantasy', 'monster', 'creature', 'character', 'story', 'funny'],
  category: 'animals',
  placement: 'ground',
  scale: 0.6,
  baseline: 96,
  width: 0.7,
  colors: { main: '#9575cd', horn: '#ffb74d', belly: '#b39ddb' },
  palettes: { main: ['#9575cd', '#4db6ac', '#f06292', '#7986cb', '#aed581', '#ffb74d'] },
  draw(d, p) {
    const fur = p.c('main'), dark = darken(fur, 0.2), back = fromBehind(p);
    // A furry round body: bumps all the way round
    const fuzzy = (cx, cy, rx, ry, n = 22) => {
      let s = '';
      for (let k = 0; k <= n; k++) {
        const a = (k / n) * Math.PI * 2, b = ((k + 0.5) / n) * Math.PI * 2;
        const [x, y] = [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry], [bx, by] = [cx + Math.cos(b) * rx * 1.08, cy + Math.sin(b) * ry * 1.08];
        s += k ? ` Q${bx.toFixed(1)} ${by.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}` : `M${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return `${s} Z`;
    };
    person(d, p, () => {
      d.group({ class: 'pg-leg-left' }, () => { d.rect(38, 78, 10, 13, { fill: fur, rx: 4, kind: 'body' }); d.ellipse(42, 92, 7, 3.2, { fill: dark, kind: 'body' }); });
      d.group({ class: 'pg-leg-right' }, () => { d.rect(52, 78, 10, 13, { fill: fur, rx: 4, kind: 'body' }); d.ellipse(58, 92, 7, 3.2, { fill: dark, kind: 'body' }); });
      const arm = (sx, up) => {
        const x = 50 + sx * 22;
        d.path(up ? `M${x - sx * 2} 58 Q${x + sx * 8} 50 ${x + sx * 7} 36` : `M${x - sx * 2} 56 Q${x + sx * 6} 64 ${x + sx * 4} 74`, line(fur, 7));
        d.circle(x + sx * (up ? 7 : 4), up ? 35 : 75, 4, { fill: fur, kind: 'body' });
      };
      d.group({ class: 'pg-arm-left' }, () => arm(-1, cheering(p)));
      d.group({ class: 'pg-arm-right' }, () => arm(1, waving(p)));
      d.group({ class: 'pg-body-torso' }, () => d.joint('pg-head', [50, 78], () => {
        for (const sx of [-1, 1]) d.path(`M${50 + sx * 16} 36 Q${50 + sx * 24} 30 ${50 + sx * 22} 18 Q${50 + sx * 15} 24 ${50 + sx * 9} 32 Z`, { fill: p.c('horn'), kind: 'body' });
        d.path(fuzzy(50, 55, 25, 25), { fill: fur, kind: 'body' });
        if (back) return;
        d.ellipse(50, 66, 14, 10, { fill: p.c('belly'), kind: 'accent' });
        frontFace(d, p, 50, 50, 1.55);
      }, back ? undefined : { face: '50 52 22', mood: p.opts.expression || 'happy', view: 'front' }));
    });
  },
};

const ghost = {
  id: 'friendly_ghost',
  label: 'ghost',
  aliases: ['ghost', 'ghosts', 'friendly ghost', 'little ghost', 'cute ghost', 'spooky ghost'],
  tags: ['fantasy', 'ghost', 'halloween', 'character', 'story', 'night'],
  category: 'animals',
  placement: 'ground',
  scale: 0.55,
  baseline: 92,
  width: 0.6,
  colors: { main: '#ffffff' },
  palettes: { main: ['#ffffff', '#e1f5fe', '#f3e5f5'] },
  draw(d, p) {
    const sheet = p.c('main'), edge = { stroke: '#90a4ae', sw: 1.3 };
    // It floats, bobbing (no legs: its wavy hem)
    rigged(d, p, 'sea', () => d.group({ class: 'pg-sea-bob' }, () => {
      d.ellipse(50, 95, 14, 2.4, { fill: '#000000', opacity: 0.08, kind: 'shadow' });
      const arm = (sx, up) => d.path(up ? `M${50 + sx * 17} 54 Q${50 + sx * 30} 46 ${50 + sx * 32} 34 Q${50 + sx * 25} 38 ${50 + sx * 17} 46 Z` : `M${50 + sx * 17} 48 Q${50 + sx * 30} 52 ${50 + sx * 33} 62 Q${50 + sx * 24} 62 ${50 + sx * 17} 58 Z`, { fill: sheet, kind: 'body', ...edge });
      d.joint('pg-arm-left', [34, 52], () => arm(-1, cheering(p)));
      d.joint('pg-arm-right', [66, 52], () => arm(1, waving(p)));
      d.group({ class: 'pg-body-torso' }, () => d.joint('pg-head', [50, 60], () => {
        d.path('M30 50 Q30 22 50 22 Q70 22 70 50 L70 80 Q66 86 62 80 Q58 74 54 82 Q50 88 46 82 Q42 74 38 80 Q34 86 30 80 Z', { fill: sheet, kind: 'body', ...edge });
        if (!fromBehind(p)) frontFace(d, p, 50, 44, 1.2);
      }, fromBehind(p) ? undefined : { face: '50 42 18', mood: p.opts.expression || 'happy', view: 'front' }));
    }));
  },
};

export default [unicorn, monster, ghost];
