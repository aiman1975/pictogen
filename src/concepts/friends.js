// Story friends drawn whole on the shared skeleton (src/concepts/rig.js), for stories, school and
// ideas: an owl teacher in glasses and a graduation cap, a friendly little dragon, and a lightbulb
// buddy - an idea, a thought - that glows. They walk, wave, jump, dance and sit like everyone else,
// show every feeling (with its sign over the head, src/emotes.js), blink and talk.

import { idleStyle } from './rig.js';
import { drawFacialExpression } from './people.js';
import { INK } from '../core/styles.js';
import { darken, lighten } from '../core/color.js';

const line = (stroke, sw = 1.4) => ({ kind: 'line', stroke, sw, fill: 'none' });
const rig = (d, p, fn) => d.group({ class: `pg-rig pg-rig-person pg-anim-${p.opts.animation || 'blink'}`, style: idleStyle(p) }, fn);
const waving = (p) => ['wave', 'cheer', 'jump'].includes(p.opts.animation);
const cheering = (p) => ['cheer', 'jump'].includes(p.opts.animation);
const fromBehind = (p) => p.opts.view === 'back';

/**
 * Big round owl eyes for every feeling: white discs, pupils that look up, down or shine, closed
 * arcs when laughing or sleepy, hearts in love, and feather brows when sad, cross or puzzled.
 */
function owlEyes(d, p, cx, cy, gap, r) {
  const expr = p.opts.expression || 'happy';
  const gx = p.opts.gaze?.x ?? 0, gy = p.opts.gaze?.y ?? 0;
  const brow = (sx, tilt, lift = 0) => d.line(cx + sx * (gap + r * 0.9), cy - r - 1.5 - lift + tilt, cx + sx * (gap - r * 0.6), cy - r - 1.5 - lift - tilt, line(INK, 1.6));
  d.group({ class: 'pg-face-eyes' }, () => {
    for (const sx of [-1, 1]) {
      const x = cx + sx * gap;
      if (['laugh', 'laughing'].includes(expr) || (expr === 'wink' && sx > 0)) {
        d.circle(x, cy, r, { fill: '#ffffff', kind: 'detail' });
        d.path(`M${x - r * 0.6} ${cy + 1} Q${x} ${cy - r * 0.7} ${x + r * 0.6} ${cy + 1}`, line(INK, 2));
        continue;
      }
      if (expr === 'sleepy') {
        d.circle(x, cy, r, { fill: '#ffffff', kind: 'detail' });
        d.path(`M${x - r} ${cy} A${r} ${r} 0 0 1 ${x + r} ${cy} Z`, { fill: p.c('main'), kind: 'body' });
        d.path(`M${x - r * 0.7} ${cy + 1} Q${x} ${cy + r * 0.55} ${x + r * 0.7} ${cy + 1}`, line(INK, 1.6));
        continue;
      }
      if (expr === 'love') {
        d.circle(x, cy, r, { fill: '#ffffff', kind: 'detail' });
        d.path(`M${x} ${cy + r * 0.55} C${x - r * 1.1} ${cy - r * 0.1} ${x - r * 0.6} ${cy - r * 0.95} ${x} ${cy - r * 0.35} C${x + r * 0.6} ${cy - r * 0.95} ${x + r * 1.1} ${cy - r * 0.1} ${x} ${cy + r * 0.55} Z`, { fill: '#e53935', kind: 'accent' });
        continue;
      }
      const big = ['surprised', 'shocked', 'scared'].includes(expr);
      d.circle(x, cy, big ? r * 1.08 : r, { fill: '#ffffff', kind: 'detail' });
      const pr = expr === 'scared' ? r * 0.3 : big ? r * 0.38 : r * 0.5;
      const down = expr === 'sad' ? r * 0.25 : expr === 'shy' ? r * 0.35 : 0;
      const px = x + gx * r * 0.3 + (expr === 'shy' ? -sx * 0 - r * 0.25 : 0), py = cy + gy * r * 0.3 + down;
      d.circle(px, py, pr, { fill: INK, kind: 'detail' });
      d.circle(px + pr * 0.35, py - pr * 0.4, pr * 0.32, { kind: 'highlight', opacity: 0.95 });
      if (expr === 'excited') d.circle(px - pr * 0.35, py + pr * 0.35, pr * 0.2, { kind: 'highlight', opacity: 0.9 });
      if (['skeptical', 'suspicious'].includes(expr)) d.path(`M${x - r} ${cy - r * 0.15} A${r} ${r} 0 0 1 ${x + r} ${cy - r * 0.15} Z`, { fill: p.c('main'), kind: 'body' });
    }
    if (expr === 'sad' || expr === 'crying') { brow(-1, -1.6); brow(1, -1.6); }
    if (expr === 'angry' || expr === 'mad') { brow(-1, 1.8); brow(1, 1.8); }
    if (expr === 'confused' || expr === 'puzzled') { brow(-1, 0, 2.5); brow(1, -1.4); }
    if (expr === 'scared') { brow(-1, -1.4, 1.5); brow(1, -1.4, 1.5); }
  });
}

const owlTeacher = {
  id: 'owl_teacher',
  label: 'owl teacher',
  aliases: ['owl teacher', 'professor owl', 'teacher owl', 'wise owl', 'owl professor', 'mr owl', 'mrs owl', 'wise old owl'],
  tags: ['owl', 'bird', 'teacher', 'school', 'education', 'character', 'animal'],
  // (a character that can hold a book and sit at a desk, like the people)
  category: 'people',
  placement: 'ground',
  scale: 0.75,
  baseline: 96,
  width: 0.62,
  colors: { main: '#8d6e63', belly: '#ffe0b2', beak: '#ffa000', cap: '#263238', glasses: '#37474f', tassel: '#fdd835' },
  palettes: { main: ['#8d6e63', '#a1887f', '#795548', '#9e9e9e', '#bcaaa4'] },
  draw(d, p) {
    const main = p.c('main'), belly = p.c('belly'), dark = darken(main, 0.22), beak = p.c('beak');
    const back = fromBehind(p);
    rig(d, p, () => {
      // Feet
      d.group({ class: 'pg-leg-left' }, () => { d.rect(40, 86, 5, 6, { fill: beak, rx: 2 }); d.ellipse(42, 93, 6, 2.6, { fill: beak }); });
      d.group({ class: 'pg-leg-right' }, () => { d.rect(55, 86, 5, 6, { fill: beak, rx: 2 }); d.ellipse(58, 93, 6, 2.6, { fill: beak }); });
      // Wings for arms: down at the sides, or one raised to wave
      const wing = (sx, up) => {
        const x = 50 + sx * 23;
        if (up) d.path(`M${x - sx * 2} 64 Q${x + sx * 10} 50 ${x + sx * 8} 34 Q${x + sx * 2} 44 ${x - sx * 4} 56 Z`, { fill: dark });
        else d.path(`M${x - sx * 3} 52 Q${x + sx * 7} 64 ${x + sx * 2} 82 Q${x - sx * 4} 72 ${x - sx * 5} 60 Z`, { fill: dark });
      };
      d.group({ class: 'pg-arm-left' }, () => wing(-1, cheering(p)));
      d.group({ class: 'pg-arm-right' }, () => wing(1, waving(p)));
      d.group({ class: 'pg-body-torso' }, () => {
        // One round body with the head in it, ear tufts on top
        d.ellipse(50, 62, 25, 30, { fill: main });
        if (!back) {
          d.ellipse(50, 71, 15, 18, { fill: belly });
          for (const [x, y] of [[44, 64], [50, 64], [56, 64], [47, 71], [53, 71], [50, 78]]) d.path(`M${x - 2.5} ${y} Q${x} ${y + 2.5} ${x + 2.5} ${y}`, line(darken(belly, 0.25), 1));
        } else {
          for (const [x, y] of [[44, 60], [56, 60], [50, 70], [44, 78], [56, 78]]) d.path(`M${x - 4} ${y} Q${x} ${y + 4} ${x + 4} ${y}`, line(dark, 1.2));
        }
        d.joint('pg-head', [50, 54], () => {
          d.path('M30 38 L33 22 L42 33 Z', { fill: main });
          d.path('M70 38 L67 22 L58 33 Z', { fill: main });
          d.ellipse(50, 42, 22, 17, { fill: main });
          // The graduation cap: a board, its top, and the tassel
          d.path('M50 17 L72 23 L50 29 L28 23 Z', { fill: p.c('cap') });
          d.rect(41, 25, 18, 6, { fill: p.c('cap') });
          d.line(50, 23, 66, 28, line(p.c('tassel'), 1.2));
          d.path('M66 28 L64.5 34 L67.5 34 Z', { fill: p.c('tassel'), kind: 'accent' });
          if (back) return;
          d.ellipse(50, 44, 18, 12, { fill: lighten(main, 0.35) });
          owlEyes(d, p, 50, 43, 9, 6.5);
          // Round glasses over the eyes
          for (const sx of [-1, 1]) d.circle(50 + sx * 9, 43, 7.6, line(p.c('glasses'), 1.4));
          d.path('M48 42 Q50 40.5 52 42', line(p.c('glasses'), 1.3));
          // The beak; its lower half is the mouth (it opens to talk)
          d.path('M46.5 48 L53.5 48 L50 53 Z', { fill: beak });
          d.group({ class: 'pg-face-mouth' }, () => d.path('M47.5 52 L52.5 52 L50 55.5 Z', { fill: darken(beak, 0.2) }));
          d.circle(38, 51, 2.6, { fill: '#ff8a80', opacity: 0.5, kind: 'accent' });
          d.circle(62, 51, 2.6, { fill: '#ff8a80', opacity: 0.5, kind: 'accent' });
        });
      });
    });
  },
};

const dragon = {
  id: 'baby_dragon',
  label: 'dragon',
  aliases: ['dragon', 'dragons', 'little dragon', 'baby dragon', 'friendly dragon', 'dragon friend', 'dino dragon'],
  tags: ['dragon', 'fantasy', 'fairy tale', 'character', 'animal', 'story'],
  category: 'animals',
  placement: 'ground',
  scale: 0.7,
  baseline: 96,
  width: 0.72,
  colors: { main: '#66bb6a', belly: '#fff59d', wing: '#43a047', horn: '#fff8e1', spikes: '#2e7d32' },
  palettes: { main: ['#66bb6a', '#4fc3f7', '#ba68c8', '#ef5350', '#ffb74d'] },
  draw(d, p) {
    const main = p.c('main'), dark = darken(main, 0.2), belly = p.c('belly'), back = fromBehind(p);
    rig(d, p, () => {
      // The tail, swaying, and the little wings, behind
      d.group({ class: 'pg-tail', style: 'transform-box: view-box; transform-origin: 60px 82px' }, () => {
        d.path('M58 78 Q78 90 86 72 Q88 68 84 66 Q84 74 76 80 Q66 84 60 84 Z', { fill: main });
        d.path('M84 66 L92 62 L88 71 Z', { fill: p.c('spikes') });
      });
      for (const sx of [-1, 1]) {
        d.path(`M${50 + sx * 10} 58 Q${50 + sx * 28} 40 ${50 + sx * 30} 50 Q${50 + sx * 26} 54 ${50 + sx * 24} 60 Q${50 + sx * 18} 58 ${50 + sx * 14} 64 Z`, { fill: p.c('wing') });
      }
      d.group({ class: 'pg-leg-left' }, () => { d.rect(38, 80, 10, 12, { fill: main, rx: 4 }); d.ellipse(42, 93, 7, 3, { fill: dark }); });
      d.group({ class: 'pg-leg-right' }, () => { d.rect(52, 80, 10, 12, { fill: main, rx: 4 }); d.ellipse(58, 93, 7, 3, { fill: dark }); });
      const arm = (sx, up) => {
        const x = 50 + sx * 15;
        if (up) d.path(`M${x} 64 Q${x + sx * 8} 56 ${x + sx * 8} 46`, line(main, 6.5));
        else d.path(`M${x} 62 Q${x + sx * 6} 68 ${x + sx * 4} 76`, line(main, 6.5));
      };
      d.group({ class: 'pg-arm-left' }, () => arm(-1, cheering(p)));
      d.group({ class: 'pg-arm-right' }, () => arm(1, waving(p)));
      d.group({ class: 'pg-body-torso' }, () => {
        d.ellipse(50, 71, 16, 17, { fill: main });
        if (!back) {
          d.ellipse(50, 74, 10, 12, { fill: belly });
          for (const y of [68, 74, 80]) d.path(`M44 ${y} Q50 ${y + 2} 56 ${y}`, line(darken(belly, 0.2), 1));
        } else for (const y of [58, 66, 74]) d.path(`M47 ${y} L50 ${y - 5} L53 ${y} Z`, { fill: p.c('spikes') });
        d.joint('pg-head', [50, 56], () => {
          // Horns and the spikes along the top of the head
          d.path('M37 22 Q35 12 40 14 Q41 19 42 24 Z', { fill: p.c('horn') });
          d.path('M63 22 Q65 12 60 14 Q59 19 58 24 Z', { fill: p.c('horn') });
          d.path('M45 19 L48 13 L51 19 Z M51 19 L54 14 L56 20 Z', { fill: p.c('spikes') });
          d.circle(50, 37, 18, { fill: main });
          if (back) return;
          d.ellipse(50, 45, 12, 8, { fill: lighten(main, 0.25) });
          d.circle(46, 44, 1, { fill: dark, kind: 'detail' });
          d.circle(54, 44, 1, { fill: dark, kind: 'detail' });
          drawFacialExpression(d, p, 50, 34);
        }, back ? undefined : { mood: p.opts.expression || 'happy', view: 'front' });
      });
    });
  },
};

const ideaBuddy = {
  id: 'idea_buddy',
  label: 'idea buddy',
  aliases: ['idea buddy', 'lightbulb buddy', 'light bulb buddy', 'bulb buddy', 'idea character', 'bright idea', 'thinking bulb', 'little idea'],
  tags: ['idea', 'thought', 'think', 'lightbulb', 'education', 'character', 'invention', 'science'],
  category: 'people',
  placement: 'ground',
  scale: 0.7,
  baseline: 96,
  width: 0.62,
  colors: { main: '#ffe066', glow: '#fff59d', base: '#90a4ae', limbs: '#455a64', shoe: '#5c6bc0' },
  palettes: { main: ['#ffe066', '#ffd54f', '#fff176', '#ffcc80'] },
  draw(d, p) {
    const glass = p.c('main'), metal = p.c('base'), limbs = p.c('limbs'), back = fromBehind(p);
    rig(d, p, () => {
      // Its glow: a soft halo and rays that pulse
      d.group({ class: 'pg-glow' }, () => {
        d.circle(50, 33, 29, { fill: p.c('glow'), opacity: 0.4, kind: 'accent' });
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 - Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
          if (s > 0.6) continue;
          d.line(50 + c * 30, 33 + s * 30, 50 + c * 37, 33 + s * 37, line('#ffca28', 2.4));
        }
      });
      d.group({ class: 'pg-leg-left' }, () => { d.rect(43, 76, 4, 15, { fill: limbs, rx: 2 }); d.ellipse(44, 93, 6, 3, { fill: p.c('shoe') }); });
      d.group({ class: 'pg-leg-right' }, () => { d.rect(53, 76, 4, 15, { fill: limbs, rx: 2 }); d.ellipse(56, 93, 6, 3, { fill: p.c('shoe') }); });
      const arm = (sx, up) => {
        const x = 50 + sx * 12;
        if (up) d.path(`M${x} 56 Q${x + sx * 9} 48 ${x + sx * 10} 36`, line(limbs, 3.4));
        else d.path(`M${x} 56 Q${x + sx * 9} 62 ${x + sx * 9} 72`, line(limbs, 3.4));
        const [hx, hy] = up ? [x + sx * 10, 35] : [x + sx * 9, 73];
        d.circle(hx, hy, 3, { fill: '#ffffff', kind: 'body' });
        d.circle(hx, hy, 3, line(limbs, 1.2));
      };
      d.group({ class: 'pg-arm-left' }, () => arm(-1, cheering(p)));
      d.group({ class: 'pg-arm-right' }, () => arm(1, waving(p)));
      d.group({ class: 'pg-body-torso' }, () => {
        // The screw base: threads and the cap at the bottom
        d.rect(40, 58, 20, 16, { fill: metal, rx: 3 });
        for (const y of [62, 66, 70]) d.line(41, y, 59, y - 1.5, line(darken(metal, 0.25), 1.4));
        d.path('M43 74 L57 74 L54 79 L46 79 Z', { fill: darken(metal, 0.35) });
        d.joint('pg-head', [50, 58], () => {
          // The glass: round on top, narrowing to the base
          d.path('M38 52 Q26 42 28 30 Q31 10 50 10 Q69 10 72 30 Q74 42 62 52 L61 59 L39 59 Z', { fill: glass });
          d.path('M34 26 Q37 16 46 14', line('#ffffff', 2.4));
          if (back) return;
          // The filament, a little curl above the face
          d.path('M44 22 Q47 16 50 22 Q53 16 56 22', line('#ff9800', 1.2));
          drawFacialExpression(d, p, 50, 35);
        }, back ? undefined : { mood: p.opts.expression || 'happy', view: 'front' });
      });
    });
  },
};

export default [owlTeacher, dragon, ideaBuddy];
