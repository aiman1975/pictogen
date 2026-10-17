// Wildlife concepts: lion, elephant, bear, penguin.
import { INK } from '../core/styles.js';
import { darken } from '../core/color.js';
import { animalView } from './animals.js';

/** Lion seen from the front or back (see animalView in animals.js). */
function drawLionView(d, p, view) {
  const fur = p.c('main'), mane = p.c('mane'), far = darken(fur, 0.15);
  d.group({ class: 'pg-body-torso' }, () => {
    if (view === 'back') {
      // The mane is furthest away and shows above the back; the tail with its tuft is nearest
      d.circle(50, 38, 20, { fill: mane, kind: 'body' });
      d.ellipse(50, 68, 20, 17, { fill: fur, kind: 'body' });
      d.rect(38, 72, 10, 21, { rx: 3, fill: fur, kind: 'body' });
      d.rect(52, 72, 10, 21, { rx: 3, fill: fur, kind: 'body' });
      d.path('M48 66 Q41 50 50 40 Q56 52 53 66 Z', { fill: darken(fur, 0.12), kind: 'body' });
      d.circle(50, 39, 4, { fill: mane, kind: 'body' });
      return;
    }
    d.path('M66 66 Q82 56 80 42 Q76 52 64 60 Z', { fill: fur, kind: 'body' });
    d.circle(80, 41, 4, { fill: mane, kind: 'body' });
    d.rect(31, 72, 8, 20, { rx: 3, fill: far, kind: 'body' });
    d.rect(61, 72, 8, 20, { rx: 3, fill: far, kind: 'body' });
    d.ellipse(50, 68, 20, 17, { fill: fur, kind: 'body' });
    d.rect(39, 70, 9, 23, { rx: 3, fill: fur, kind: 'body' });
    d.rect(52, 70, 9, 23, { rx: 3, fill: fur, kind: 'body' });
    d.circle(50, 40, 21, { fill: mane, kind: 'body' });
    d.circle(39, 27, 4, { fill: fur, kind: 'body' });
    d.circle(61, 27, 4, { fill: fur, kind: 'body' });
    d.circle(50, 42, 13, { fill: fur, kind: 'body' });
    d.circle(45.5, 39, 1.8, { fill: INK, kind: 'detail' });
    d.circle(54.5, 39, 1.8, { fill: INK, kind: 'detail' });
    d.poly([[48, 44], [52, 44], [50, 47]], { fill: p.c('nose'), kind: 'detail' });
    d.path('M47.5 49 Q50 52 52.5 49', { kind: 'line', stroke: INK, sw: 1.5 });
  });
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
    colors: { main: '#ffa726', mane: '#e65100', nose: '#5d4037' },
    draw(d, p) {
      if (animalView(p)) return drawLionView(d, p, animalView(p));
      const fur = p.c('main');
      const mane = p.c('mane');

      // Tail & tuft
      d.path('M16 64 Q8 50 14 38 Q18 50 24 58 Z', { fill: fur, kind: 'body' });
      d.circle(13, 37, 4, { fill: mane, kind: 'body' });

      // Legs
      d.rect(26, 68, 9, 24, { rx: 3, fill: fur, kind: 'body' });
      d.rect(38, 68, 9, 24, { rx: 3, fill: fur, kind: 'body' });
      d.rect(60, 68, 9, 24, { rx: 3, fill: fur, kind: 'body' });
      d.rect(72, 68, 9, 24, { rx: 3, fill: fur, kind: 'body' });

      // Body
      d.ellipse(48, 62, 28, 18, { fill: fur, kind: 'body' });

      // Big fluffy mane
      d.circle(74, 38, 20, { fill: mane, kind: 'body' });

      // Head
      d.circle(74, 40, 13, { fill: fur, kind: 'body' });

      // Ears
      d.circle(65, 26, 4, { fill: fur, kind: 'body' });
      d.circle(83, 26, 4, { fill: fur, kind: 'body' });

      // Face
      d.circle(70, 38, 1.8, { fill: INK, kind: 'detail' });
      d.circle(78, 38, 1.8, { fill: INK, kind: 'detail' });
      d.poly([[72, 42], [76, 42], [74, 45]], { fill: p.c('nose'), kind: 'detail' });
      d.path('M72 47 Q74 50 76 47', { kind: 'line', stroke: INK, sw: 1.5 });
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
    colors: { main: '#90a4ae', ear: '#78909c', tusk: '#ffffff' },
    draw(d, p) {
      const skin = p.c('main');

      // Tail
      d.line(20, 52, 16, 70, { stroke: skin, sw: 2.5, kind: 'line' });

      // Big thick pillar legs
      d.rect(26, 62, 12, 30, { rx: 4, fill: skin, kind: 'body' });
      d.rect(40, 62, 12, 30, { rx: 4, fill: skin, kind: 'body' });
      d.rect(58, 62, 12, 30, { rx: 4, fill: skin, kind: 'body' });
      d.rect(72, 62, 12, 30, { rx: 4, fill: skin, kind: 'body' });

      // Large Body
      d.ellipse(48, 54, 32, 24, { fill: skin, kind: 'body' });

      // Head
      d.circle(76, 42, 17, { fill: skin, kind: 'body' });

      // Trunk (curving down then up)
      d.path('M86 48 C94 56 94 72 88 78 C85 80 82 76 84 72 C88 68 88 56 82 50 Z', { fill: skin, kind: 'body' });

      // White tusk
      d.path('M82 54 Q92 60 90 68 Q84 62 80 58 Z', { fill: p.c('tusk'), kind: 'body' });

      // Big ear flap
      d.ellipse(66, 44, 11, 15, { fill: p.c('ear'), kind: 'body' });

      // Eye
      d.circle(78, 38, 2, { fill: INK, kind: 'detail' });
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
      const dark = p.c('main');
      const white = p.c('belly');
      const orange = p.c('feet');

      // Orange feet
      d.ellipse(42, 92, 7, 3, { fill: orange, kind: 'body' });
      d.ellipse(58, 92, 7, 3, { fill: orange, kind: 'body' });

      // Dark body egg-shape
      d.ellipse(50, 56, 20, 32, { fill: dark, kind: 'body' });

      // From behind: an all-dark back with just the feet and flippers showing
      const back = p.opts.view === 'back';
      if (!back) d.ellipse(50, 60, 13, 24, { fill: white, kind: 'body' }); // white tummy

      // Flippers / Wings on sides
      d.ellipse(30, 58, 5, 16, { fill: dark, kind: 'body', transform: 'rotate(15 30 58)' });
      d.ellipse(70, 58, 5, 16, { fill: dark, kind: 'body', transform: 'rotate(-15 70 58)' });

      // Head
      d.circle(50, 30, 13, { fill: dark, kind: 'body' });
      if (back) return;

      // Face white mask
      d.circle(46, 30, 5, { fill: white, kind: 'body' });
      d.circle(54, 30, 5, { fill: white, kind: 'body' });

      // Eyes
      d.circle(46, 30, 1.8, { fill: INK, kind: 'detail' });
      d.circle(54, 30, 1.8, { fill: INK, kind: 'detail' });

      // Beak (triangle pointed down)
      d.poly([[47, 33], [53, 33], [50, 38]], { fill: p.c('beak'), kind: 'body' });
    },
  },
];
