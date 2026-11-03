// Wildlife concepts: lion, elephant, bear, penguin.
import { INK } from '../core/styles.js';
import { darken } from '../core/color.js';
import { animalView, NEAR_FRONT, FAR_FRONT, NEAR_HIND, FAR_HIND, LEFT_FRONT, RIGHT_FRONT, LEFT_HIND, RIGHT_HIND, BACK_LEFT, BACK_RIGHT } from './animals.js';
import { rigged } from './rig.js';
import { limb } from './sea.js';
import { eyes, mouth, cheek } from './animal-face.js';
import { mix } from '../core/color.js';

// A mane: a round tuft with bumps all the way round
const fuzzy = (cx, cy, rx, ry, n = 16) => {
  let s = '';
  for (let k = 0; k <= n; k++) {
    const a = (k / n) * Math.PI * 2, b = ((k + 0.5) / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry, bx = cx + Math.cos(b) * rx * 1.12, by = cy + Math.sin(b) * ry * 1.12;
    s += k ? ` Q${bx.toFixed(1)} ${by.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}` : `M${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${s} Z`;
};

/** Lion seen from the front or back (see animalView in animals.js), on the shared skeleton. */
function drawLionView(d, p, view) {
  const fur = p.c('main'), mane = p.c('mane'), far = darken(fur, 0.15);
  rigged(d, p, 'quadruped', () => d.group({ class: 'pg-body-torso' }, () => {
    if (view === 'back') {
      // The mane is furthest away and shows above the back; the tail with its tuft is nearest
      d.joint('pg-head', [50, 56], () => d.circle(50, 38, 20, { fill: mane, kind: 'body' }));
      d.ellipse(50, 68, 20, 17, { fill: fur, kind: 'body' });
      d.joint(BACK_LEFT, null, () => d.rect(38, 72, 10, 21, { rx: 3, fill: fur, kind: 'body' }));
      d.joint(BACK_RIGHT, null, () => d.rect(52, 72, 10, 21, { rx: 3, fill: fur, kind: 'body' }));
      d.joint('pg-tail', [50, 66], () => {
        d.path('M48 66 Q41 50 50 40 Q56 52 53 66 Z', { fill: darken(fur, 0.12), kind: 'body' });
        d.circle(50, 39, 4, { fill: mane, kind: 'body' });
      });
      return;
    }
    d.joint('pg-tail', [65, 63], () => {
      d.path('M66 66 Q82 56 80 42 Q76 52 64 60 Z', { fill: fur, kind: 'body' });
      d.circle(80, 41, 4, { fill: mane, kind: 'body' });
    });
    d.joint(LEFT_HIND, null, () => d.rect(31, 72, 8, 20, { rx: 3, fill: far, kind: 'body' }));
    d.joint(RIGHT_HIND, null, () => d.rect(61, 72, 8, 20, { rx: 3, fill: far, kind: 'body' }));
    d.ellipse(50, 68, 20, 17, { fill: fur, kind: 'body' });
    d.joint(LEFT_FRONT, null, () => d.rect(39, 70, 9, 23, { rx: 3, fill: fur, kind: 'body' }));
    d.joint(RIGHT_FRONT, null, () => d.rect(52, 70, 9, 23, { rx: 3, fill: fur, kind: 'body' }));
    d.joint('pg-head', [50, 60], () => {
      d.path(fuzzy(50, 40, 20, 20), { fill: mane, kind: 'body' });
      d.joint('pg-ear', [40, 29], () => d.circle(39, 27, 4, { fill: fur, kind: 'body' }));
      d.joint('pg-ear', [60, 29], () => d.circle(61, 27, 4, { fill: fur, kind: 'body' }));
      d.circle(50, 42, 13, { fill: fur, kind: 'body' });
      d.ellipse(50, 46, 7, 5, { fill: mix(fur, '#ffffff', 0.4), kind: 'body' });
      eyes(d, p, [[45.5, 38.5], [54.5, 38.5]], 0.75, fur);
      d.poly([[48, 43.5], [52, 43.5], [50, 46]], { fill: p.c('nose'), kind: 'detail' });
      mouth(d, p, 50, 48.5, 0.6);
      cheek(d, p, 43, 45, 0.8); cheek(d, p, 57, 45, 0.8);
    });
  }), { headOn: true });
}

export default [
  {
    id: 'lion',
    aliases: ['lioness', 'simba', 'big_cat'],
    tags: ['animal', 'wildlife', 'safari', 'cat'],
    category: 'wildlife',
    placement: 'ground',
    scale: 0.8,
    baseline: 94,
    width: 0.85,
    colors: { main: '#f6c26b', mane: '#ec8a2f', nose: '#5d4037' },
    draw(d, p) {
      if (animalView(p)) return drawLionView(d, p, animalView(p));
      const fur = p.c('main'), mane = p.c('mane'), far = darken(fur, 0.14), light = mix(fur, '#ffffff', 0.45);
      const leg = (x, fill) => () => { d.rect(x, 64, 10, 26, { rx: 4, fill, kind: 'body' }); d.ellipse(x + 5.5, 91, 6.5, 3, { fill: darken(fill, 0.08), kind: 'body' }); };
      rigged(d, p, 'quadruped', () => {
        d.joint(FAR_HIND, null, leg(26, far));
        d.joint(FAR_FRONT, null, leg(70, far));
        d.joint(NEAR_HIND, null, leg(36, fur));
        d.joint(NEAR_FRONT, null, leg(60, fur));
        d.group({ class: 'pg-body-torso' }, () => {
          // A long tail with a tuft
          d.joint('pg-tail', [24, 58], () => {
            const [tx, ty] = limb(d, [[26, 58], [12, 62], [8, 50], [12, 42]], 4, 3, { fill: fur, kind: 'body' });
            d.path(fuzzy(tx, ty - 2, 4.5, 4.5, 8), { fill: mane, kind: 'body' });
          });
          d.path('M24 60 Q24 46 40 46 L64 46 Q76 46 76 60 Q76 72 62 72 L38 72 Q24 72 24 60 Z', { fill: fur, kind: 'body' });
          d.ellipse(52, 67, 16, 4.5, { fill: light, kind: 'accent' });
          d.joint('pg-head', [66, 54], () => {
            // The big fluffy mane round the face (seen three-quarters, both eyes showing)
            d.path(fuzzy(73, 38, 20, 20), { fill: mane, kind: 'body' });
            d.joint('pg-ear', [66, 28], () => { d.circle(65, 26, 4.5, { fill: fur, kind: 'body' }); d.circle(65, 26, 2.2, { fill: darken(fur, 0.15), kind: 'accent' }); });
            d.joint('pg-ear', [83, 28], () => { d.circle(84, 26, 4.5, { fill: fur, kind: 'body' }); d.circle(84, 26, 2.2, { fill: darken(fur, 0.15), kind: 'accent' }); });
            d.circle(75, 40, 13, { fill: fur, kind: 'body' });
            d.ellipse(78, 46, 7.5, 5.5, { fill: light, kind: 'body' });
            d.poly([[76.5, 42.5], [81, 42.5], [78.8, 45.2]], { fill: p.c('nose'), kind: 'detail' });
            eyes(d, p, [[71, 37], [80, 37]], 0.75, fur);
            cheek(d, p, 69, 44, 0.8); cheek(d, p, 85, 44, 0.8);
            mouth(d, p, 78.8, 48, 0.6);
          });
        });
      });
    },
  },
  {
    id: 'elephant',
    aliases: ['mammoth'],
    tags: ['animal', 'wildlife', 'safari', 'big'],
    category: 'wildlife',
    placement: 'ground',
    scale: 1.25,
    baseline: 94,
    width: 0.9,
    // Facing right. Where a rider goes (src/scene.js): hips on its back, hands on its head
    saddle: [44, 35],
    grip: [60, 32],
    colors: { main: '#9eaab2', ear: '#8a979f', inner: '#f4b6c2', tusk: '#ffffff' },
    draw(d, p) {
      const skin = p.c('main'), far = darken(skin, 0.1);
      // Big thick pillar legs with toenails
      const leg = (x, fill) => () => {
        d.rect(x, 60, 13, 31, { rx: 4, fill, kind: 'body' });
        for (const k of [0, 1, 2]) d.ellipse(x + 3 + k * 3.5, 90, 1.5, 1.2, { fill: '#eceff1', kind: 'detail' });
      };
      rigged(d, p, 'quadruped', () => {
        d.joint(FAR_HIND, null, leg(25, far));
        d.joint(FAR_FRONT, null, leg(71, far));
        d.joint(NEAR_HIND, null, leg(38, skin));
        d.joint(NEAR_FRONT, null, leg(58, skin));
        d.group({ class: 'pg-body-torso' }, () => {
          d.joint('pg-tail', [19, 52], () => { d.line(19, 52, 14, 68, { stroke: skin, sw: 2.5, kind: 'line' }); d.ellipse(13.5, 70, 2, 3, { fill: darken(skin, 0.3), kind: 'detail' }); });
          d.ellipse(48, 54, 31, 22, { fill: skin, kind: 'body' });
          d.joint('pg-head', [62, 50], () => {
            d.circle(70, 40, 17, { fill: skin, kind: 'body' });
            // The trunk, curled up at its tip: the elephant's arm (it waves, cheers, sways)
            d.joint('pg-arm-right', [80, 48], () => {
              const [tx, ty] = limb(d, [[80, 44], [90, 50], [92, 62], [91, 70]], 8.5, 5, { fill: skin, kind: 'body' });
              // (its tip turned up)
              d.path(`M${tx - 2.5} ${ty - 1} Q${tx + 2} ${ty + 3} ${tx + 4} ${ty - 3}`, { kind: 'line', stroke: skin, sw: 4.5, fill: 'none' });
            });
            eyes(d, p, [[76, 35]], 0.95, skin);
            cheek(d, p, 78, 42, 0.9);
            mouth(d, p, 80, 53, 0.6);
            // The big ear, pink inside, fanning from its front edge
            d.joint('pg-ear', [66, 42], () => {
              d.ellipse(59, 43, 12.5, 16, { fill: p.c('ear'), kind: 'body' });
              d.ellipse(58.5, 43.5, 8, 11.5, { fill: p.c('inner'), kind: 'accent' });
            });
          });
        });
      });
    },
  },
  {
    id: 'penguin',
    aliases: ['pingu'],
    tags: ['animal', 'bird', 'snow', 'winter', 'ice', 'polar'],
    category: 'wildlife',
    placement: 'ground',
    scale: 0.5,
    baseline: 94,
    width: 0.6,
    colors: { main: '#263238', belly: '#ffffff', beak: '#ffa726', feet: '#ffa726' },
    draw(d, p) {
      const dark = p.c('main'), white = p.c('belly'), orange = p.c('feet');
      // From behind: an all-dark back with just the feet and flippers showing
      const back = p.opts.view === 'back';
      rigged(d, p, 'bird', () => {
        // Orange feet that step in a waddle
        d.joint('pg-leg-left', null, () => d.ellipse(42, 92, 7.5, 3, { fill: orange, kind: 'body' }));
        d.joint('pg-leg-right', null, () => d.ellipse(58, 92, 7.5, 3, { fill: orange, kind: 'body' }));
        d.group({ class: 'pg-body-torso' }, () => {
          d.path('M50 22 Q72 24 71 60 Q70 90 50 90 Q30 90 29 60 Q28 24 50 22 Z', { fill: dark, kind: 'body' });
          if (!back) d.path('M50 40 Q63 42 63 64 Q62 86 50 86 Q38 86 37 64 Q37 42 50 40 Z', { fill: white, kind: 'body' }); // white tummy
          // Flippers turn at the shoulder: they wave, flap and cheer like arms
          d.joint('pg-arm-left', [32, 46], () => d.ellipse(28.5, 60, 5, 16, { fill: dark, kind: 'body', transform: 'rotate(15 28.5 60)' }));
          d.joint('pg-arm-right', [68, 46], () => d.ellipse(71.5, 60, 5, 16, { fill: dark, kind: 'body', transform: 'rotate(-15 71.5 60)' }));
          d.joint('pg-head', [50, 42], () => {
            if (back) return;
            // The white face, the eyes, a beak pointing down, rosy cheeks
            d.path('M50 26 Q62 26 62 36 Q60 44 50 44 Q40 44 38 36 Q38 26 50 26 Z', { fill: white, kind: 'body' });
            eyes(d, p, [[45, 33], [55, 33]], 0.75, dark);
            d.path('M46.5 38 L53.5 38 L50 43 Z', { fill: p.c('beak'), kind: 'body' });
            cheek(d, p, 42, 39, 0.8); cheek(d, p, 58, 39, 0.8);
            mouth(d, p, 50, 44.5, 0.5);
          }, back ? undefined : { face: '50 34 12', mood: p.opts.expression || 'happy', view: 'front' });
        });
      }, { headOn: true });
    },
  },
];
