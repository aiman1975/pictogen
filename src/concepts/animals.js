// Animal concepts.
import { INK } from '../core/styles.js';
import { darken, mix } from '../core/color.js';

/**
 * Front and back views of the four-legged animals (opts.view 'front' | 'back'; side is the default
 * drawing). Seen head-on the body is foreshortened: chest, two front legs, the hind legs peeking out
 * behind. The whole figure sits in .pg-body-torso, so the walk cycle bobs it as it trots toward or
 * away from the camera.
 */
export const animalView = (p) => (p.opts.view === 'front' || p.opts.view === 'back' ? p.opts.view : null);

function drawDogView(d, p, view) {
  const fur = p.c('main'), ear = p.c('ear'), far = darken(fur, 0.15);
  d.group({ class: 'pg-body-torso' }, () => {
    if (view === 'back') {
      // From behind the head is furthest away: it peeks over the back, and the tail is nearest
      d.circle(50, 38, 15, { fill: fur, kind: 'body' });
      d.path('M36 29 Q27 41 32 52 Q38 48 40 35 Z', { fill: ear, kind: 'body' });
      d.path('M64 29 Q73 41 68 52 Q62 48 60 35 Z', { fill: ear, kind: 'body' });
      d.rect(40, 51, 20, 4, { rx: 2, fill: p.c('collar'), kind: 'body' });
      d.ellipse(50, 70, 18, 16, { fill: fur, kind: 'body' });
      d.ellipse(44, 68, 7, 6, { fill: p.c('spot'), kind: 'accent' });
      d.rect(39, 74, 9, 19, { rx: 3, fill: fur, kind: 'body' });
      d.rect(52, 74, 9, 19, { rx: 3, fill: fur, kind: 'body' });
      d.path('M47 62 Q41 46 50 36 Q56 48 53 62 Z', { fill: darken(fur, 0.12), kind: 'body' }); // tail up
      return;
    }
    d.path('M64 62 Q78 50 73 38 Q68 50 60 58 Z', { fill: fur, kind: 'body' }); // tail behind
    d.rect(33, 74, 7, 18, { rx: 3, fill: far, kind: 'body' });
    d.rect(60, 74, 7, 18, { rx: 3, fill: far, kind: 'body' });
    d.ellipse(50, 70, 18, 16, { fill: fur, kind: 'body' });
    d.rect(40, 72, 8, 21, { rx: 3, fill: fur, kind: 'body' });
    d.rect(52, 72, 8, 21, { rx: 3, fill: fur, kind: 'body' });
    d.ellipse(57, 76, 6, 5, { fill: p.c('spot'), kind: 'accent' });
    d.rect(40, 55, 20, 4, { rx: 2, fill: p.c('collar'), kind: 'body' });
    d.circle(50, 61, 2, { fill: '#ffca28', kind: 'detail' });
    d.circle(50, 40, 16, { fill: fur, kind: 'body' });
    d.path('M36 30 Q26 42 31 54 Q38 50 40 36 Z', { fill: ear, kind: 'body' });
    d.path('M64 30 Q74 42 69 54 Q62 50 60 36 Z', { fill: ear, kind: 'body' });
    d.ellipse(50, 47, 8, 6, { fill: mix(fur, '#ffffff', 0.35), kind: 'body' });
    d.ellipse(50, 44, 3.2, 2.4, { fill: p.c('nose'), kind: 'detail' });
    d.path('M46 49 Q50 52.5 54 49', { kind: 'line', stroke: INK, sw: 1.4 });
    d.circle(44, 37, 2.2, { fill: INK, kind: 'detail' });
    d.circle(56, 37, 2.2, { fill: INK, kind: 'detail' });
    d.circle(44.6, 36.3, 0.7, { kind: 'highlight', opacity: 0.9 });
    d.circle(56.6, 36.3, 0.7, { kind: 'highlight', opacity: 0.9 });
  });
}

function drawCatView(d, p, view) {
  const fur = p.c('main'), far = darken(fur, 0.15);
  d.group({ class: 'pg-body-torso' }, () => {
    if (view === 'back') {
      d.poly([[37, 40], [36, 23], [47, 32]], { fill: fur, kind: 'body' });
      d.poly([[63, 40], [64, 23], [53, 32]], { fill: fur, kind: 'body' });
      d.circle(50, 44, 15, { fill: fur, kind: 'body' });
      d.ellipse(50, 74, 15, 14, { fill: fur, kind: 'body' });
      d.rect(42, 80, 7, 14, { rx: 3, fill: fur, kind: 'body' });
      d.rect(51, 80, 7, 14, { rx: 3, fill: fur, kind: 'body' });
      d.path('M48 70 Q36 54 44 40 Q49 36 50 42 Q45 54 53 68 Z', { fill: darken(fur, 0.12), kind: 'body' }); // tail up
      return;
    }
    d.path('M60 86 Q80 84 78 64 Q76 56 71 60 Q74 68 66 78 Z', { fill: fur, kind: 'body' }); // tail curled at the side
    d.rect(37, 80, 6, 14, { rx: 3, fill: far, kind: 'body' });
    d.rect(57, 80, 6, 14, { rx: 3, fill: far, kind: 'body' });
    d.ellipse(50, 74, 15, 14, { fill: fur, kind: 'body' });
    d.rect(43, 80, 6, 14, { rx: 3, fill: fur, kind: 'body' });
    d.rect(51, 80, 6, 14, { rx: 3, fill: fur, kind: 'body' });
    d.poly([[37, 42], [36, 25], [47, 34]], { fill: fur, kind: 'body' });
    d.poly([[63, 42], [64, 25], [53, 34]], { fill: fur, kind: 'body' });
    d.circle(50, 46, 15, { fill: fur, kind: 'body' });
    d.ellipse(50, 75, 8, 9, { fill: mix(fur, '#ffffff', 0.4), kind: 'accent' });
    d.poly([[39, 39], [38.5, 29], [45, 35]], { fill: p.c('innerEar'), kind: 'accent' });
    d.poly([[61, 39], [61.5, 29], [55, 35]], { fill: p.c('innerEar'), kind: 'accent' });
    d.ellipse(44, 45, 2, 2.6, { fill: INK, kind: 'detail' });
    d.ellipse(56, 45, 2, 2.6, { fill: INK, kind: 'detail' });
    d.poly([[48, 50], [52, 50], [50, 52.5]], { fill: p.c('innerEar'), kind: 'detail' });
    d.path('M47 54 Q50 56 50 53 Q50 56 53 54', { kind: 'line', stroke: INK, sw: 1.2 });
    for (const [y0, y1] of [[51, 48], [53, 54], [55, 59]]) {
      d.line(44, y0, 31, y1, { stroke: INK, sw: 1, kind: 'line' });
      d.line(56, y0, 69, y1, { stroke: INK, sw: 1, kind: 'line' });
    }
  });
}

function drawRabbitView(d, p, view) {
  const fur = p.c('main'), light = mix(fur, '#ffffff', 0.5);
  const ears = (inner) => {
    for (const [x, r] of [[43, -8], [57, 8]]) {
      d.ellipse(x, 22, 5, 16, { fill: fur, kind: 'body', transform: `rotate(${r} ${x} 22)` });
      if (inner) d.ellipse(x, 22, 2.5, 11, { fill: p.c('ear'), kind: 'accent', transform: `rotate(${r} ${x} 22)` });
    }
  };
  d.group({ class: 'pg-body-torso' }, () => {
    if (view === 'back') {
      ears(false);
      d.circle(50, 46, 14, { fill: fur, kind: 'body' });
      d.ellipse(50, 72, 16, 16, { fill: fur, kind: 'body' });
      d.ellipse(42, 89, 7, 4, { fill: fur, kind: 'body' });
      d.ellipse(58, 89, 7, 4, { fill: fur, kind: 'body' });
      d.circle(50, 78, 6, { fill: light, kind: 'body' }); // fluffy tail
      return;
    }
    d.ellipse(50, 72, 16, 16, { fill: fur, kind: 'body' });
    d.ellipse(42, 89, 7, 4, { fill: fur, kind: 'body' });
    d.ellipse(58, 89, 7, 4, { fill: fur, kind: 'body' });
    ears(true);
    d.circle(50, 46, 14, { fill: fur, kind: 'body' });
    d.ellipse(50, 75, 9, 10, { fill: light, kind: 'accent' });
    d.circle(45, 44, 2, { fill: INK, kind: 'detail' });
    d.circle(55, 44, 2, { fill: INK, kind: 'detail' });
    d.circle(50, 50, 2, { fill: p.c('nose'), kind: 'detail' });
    d.path('M47 53 Q50 56 53 53', { kind: 'line', stroke: INK, sw: 1.2 });
  });
}

export default [
  {
    id: 'dog',
    aliases: ['puppy', 'hound', 'canine', 'doggie'],
    tags: ['animal', 'pet', 'mammal'],
    category: 'animals',
    placement: 'ground',
    scale: 0.55,
    baseline: 94,
    width: 0.8,
    colors: { main: '#bcaaa4', spot: '#795548', ear: '#5d4037', collar: '#e53935', nose: '#212121' },
    palettes: { main: ['#bcaaa4', '#d7ccc8', '#ffcc80', '#8d6e63', '#424242', '#ffffff'] },
    draw(d, p) {
      if (animalView(p)) return drawDogView(d, p, animalView(p));
      const fur = p.c('main');
      const earColor = p.c('ear');

      // Tail (wagging up)
      d.path('M22 60 Q12 45 18 36 Q22 45 28 56 Z', { fill: fur, kind: 'body' });

      // Back legs & Front legs
      d.rect(26, 68, 8, 24, { rx: 3, fill: fur, kind: 'body' });
      d.rect(38, 68, 8, 24, { rx: 3, fill: fur, kind: 'body' });
      d.rect(58, 68, 8, 24, { rx: 3, fill: fur, kind: 'body' });
      d.rect(70, 68, 8, 24, { rx: 3, fill: fur, kind: 'body' });

      // Body (oval-ish)
      d.ellipse(48, 62, 26, 17, { fill: fur, kind: 'body' });
      d.ellipse(44, 58, 10, 8, { fill: p.c('spot'), kind: 'accent' });

      // Neck & collar
      d.path('M62 55 L74 38 L82 46 L72 65 Z', { fill: fur, kind: 'body' });
      d.rect(68, 48, 12, 4, { rx: 1.5, fill: p.c('collar'), kind: 'body' });

      // Head
      d.circle(75, 34, 15, { fill: fur, kind: 'body' });
      // Snout
      d.ellipse(85, 38, 8, 6, { fill: fur, kind: 'body' });
      d.circle(91, 36, 2.5, { fill: p.c('nose'), kind: 'detail' });

      // Floppy Ear
      d.path('M67 26 Q60 38 64 48 Q70 46 72 34 Z', { fill: earColor, kind: 'body' });

      // Eye
      d.circle(77, 30, 2.2, { fill: INK, kind: 'detail' });
      d.circle(77.6, 29.3, 0.7, { kind: 'highlight', opacity: 0.9 });
      // Mouth line
      d.path('M85 41 Q88 44 91 40', { kind: 'line', stroke: INK, sw: 1.5 });
    },
  },
  {
    id: 'cat',
    aliases: ['kitten', 'kitty', 'feline'],
    tags: ['animal', 'pet', 'mammal'],
    category: 'animals',
    placement: 'ground',
    scale: 0.45,
    baseline: 94,
    width: 0.75,
    colors: { main: '#fb8c00', stripe: '#e65100', innerEar: '#ffab91', collar: '#00acc1' },
    palettes: { main: ['#fb8c00', '#757575', '#212121', '#ffffff', '#ffe082'] },
    draw(d, p) {
      if (animalView(p)) return drawCatView(d, p, animalView(p));
      const fur = p.c('main');

      // Tail (curled)
      d.path('M24 72 Q10 70 12 50 Q14 36 22 40 Q18 52 26 64 Z', { fill: fur, kind: 'body' });

      // Paws / legs
      d.rect(34, 76, 7, 18, { rx: 3, fill: fur, kind: 'body' });
      d.rect(44, 76, 7, 18, { rx: 3, fill: fur, kind: 'body' });
      d.rect(58, 76, 7, 18, { rx: 3, fill: fur, kind: 'body' });
      d.rect(68, 76, 7, 18, { rx: 3, fill: fur, kind: 'body' });

      // Body
      d.ellipse(50, 68, 22, 15, { fill: fur, kind: 'body' });

      // Head
      d.circle(68, 44, 14, { fill: fur, kind: 'body' });

      // Pointy ears
      d.poly([[58, 38], [57, 22], [67, 32]], { fill: fur, kind: 'body' });
      d.poly([[60, 36], [59, 25], [66, 32]], { fill: p.c('innerEar'), kind: 'accent' });

      d.poly([[72, 32], [79, 22], [80, 38]], { fill: fur, kind: 'body' });
      d.poly([[73, 32], [78, 25], [78, 36]], { fill: p.c('innerEar'), kind: 'accent' });

      // Face
      d.circle(73, 42, 2, { fill: INK, kind: 'detail' });
      d.poly([[78, 45], [82, 45], [80, 48]], { fill: p.c('innerEar'), kind: 'detail' });

      // Whiskers
      d.line(82, 45, 94, 42, { stroke: INK, sw: 1.2, kind: 'line' });
      d.line(82, 47, 94, 48, { stroke: INK, sw: 1.2, kind: 'line' });
      d.line(82, 49, 93, 54, { stroke: INK, sw: 1.2, kind: 'line' });
    },
  },
  {
    id: 'bird',
    aliases: ['sparrow', 'avian', 'robin'],
    tags: ['animal', 'bird', 'air', 'fly'],
    category: 'animals',
    placement: 'air',
    scale: 0.3,
    baseline: 75,
    width: 0.7,
    colors: { main: '#42a5f5', belly: '#e3f2fd', beak: '#ffa726', wing: '#1976d2' },
    palettes: { main: ['#42a5f5', '#ef5350', '#66bb6a', '#ffa726', '#ab47bc'] },
    draw(d, p) {
      const color = p.c('main');

      // Tail feathers
      d.poly([[16, 55], [8, 48], [10, 62], [24, 62]], { fill: p.c('wing'), kind: 'body' });

      // Body
      d.ellipse(45, 54, 24, 16, { fill: color, kind: 'body' });
      d.ellipse(48, 59, 16, 10, { fill: p.c('belly'), kind: 'accent' });

      // Head
      d.circle(64, 42, 12, { fill: color, kind: 'body' });

      // Beak
      d.poly([[74, 40], [86, 44], [74, 48]], { fill: p.c('beak'), kind: 'body' });

      // Eye
      d.circle(68, 39, 2.2, { fill: INK, kind: 'detail' });
      d.circle(68.6, 38.3, 0.7, { kind: 'highlight', opacity: 0.9 });

      // Wing
      d.path('M32 50 Q46 36 60 52 Q44 64 32 50 Z', { fill: p.c('wing'), kind: 'body' });

      // Feet
      d.line(42, 69, 40, 78, { stroke: p.c('beak'), sw: 1.8, kind: 'line' });
      d.line(50, 69, 48, 78, { stroke: p.c('beak'), sw: 1.8, kind: 'line' });
    },
  },
  {
    id: 'fish',
    aliases: ['nemo', 'clownfish', 'goldfish'],
    tags: ['animal', 'water', 'sea', 'ocean', 'swim'],
    category: 'animals',
    placement: 'underwater',
    scale: 0.35,
    baseline: 60,
    width: 0.85,
    colors: { main: '#ff7043', stripe: '#ffffff', fin: '#f4511e' },
    palettes: { main: ['#ff7043', '#29b6f6', '#ffd54f', '#ab47bc', '#26a69a'] },
    draw(d, p) {
      const fishColor = p.c('main');
      const finColor = p.c('fin');
      const stripe = p.c('stripe');

      // Tail fin
      d.path('M28 50 L10 32 Q18 50 10 68 Z', { fill: finColor, kind: 'body' });

      // Dorsal and pelvic fins
      d.path('M44 34 Q54 20 64 34 Z', { fill: finColor, kind: 'body' });
      d.path('M46 66 Q52 78 60 66 Z', { fill: finColor, kind: 'body' });

      // Main body
      d.ellipse(50, 50, 28, 18, { fill: fishColor, kind: 'body' });

      // Clownfish / Nemo white stripes
      d.path('M40 33 Q43 50 40 67 L46 66 Q49 50 46 34 Z', { fill: stripe, kind: 'accent' });
      d.path('M56 32 Q59 50 56 68 L62 67 Q65 50 62 33 Z', { fill: stripe, kind: 'accent' });

      // Eye
      d.circle(68, 46, 3, { fill: '#ffffff', kind: 'body' });
      d.circle(69, 46, 1.8, { fill: INK, kind: 'detail' });

      // Pectoral fin
      d.ellipse(48, 52, 7, 4, { fill: finColor, kind: 'body', transform: 'rotate(-20 48 52)' });
    },
  },
  {
    id: 'duck',
    aliases: ['duckling'],
    tags: ['animal', 'bird', 'water', 'farm'],
    category: 'animals',
    placement: 'water',
    scale: 0.4,
    baseline: 84,
    width: 0.8,
    colors: { main: '#fdd835', beak: '#fb8c00', wing: '#fbc02d' },
    palettes: { main: ['#fdd835', '#ffffff', '#43a047'] },
    draw(d, p) {
      const yellow = p.c('main');

      // Body (floating oval)
      d.ellipse(45, 62, 26, 16, { fill: yellow, kind: 'body' });
      // Tail pointed up
      d.poly([[20, 60], [12, 50], [25, 52]], { fill: yellow, kind: 'body' });

      // Head
      d.circle(66, 42, 14, { fill: yellow, kind: 'body' });

      // Beak
      d.path('M76 43 Q88 43 92 46 Q88 51 76 50 Z', { fill: p.c('beak'), kind: 'body' });

      // Eye
      d.circle(70, 38, 2.2, { fill: INK, kind: 'detail' });
      d.circle(70.7, 37.3, 0.7, { kind: 'highlight', opacity: 0.9 });

      // Wing
      d.ellipse(44, 60, 14, 8, { fill: p.c('wing'), kind: 'body', transform: 'rotate(-10 44 60)' });
    },
  },
  {
    id: 'rabbit',
    aliases: ['bunny', 'hare'],
    tags: ['animal', 'pet', 'wildlife'],
    category: 'animals',
    placement: 'ground',
    scale: 0.45,
    baseline: 94,
    width: 0.65,
    colors: { main: '#f5f5f5', ear: '#f8bbd0', nose: '#ec407a' },
    palettes: { main: ['#f5f5f5', '#d7ccc8', '#bcaaa4', '#bdbdbd'] },
    draw(d, p) {
      if (animalView(p)) return drawRabbitView(d, p, animalView(p));
      const fur = p.c('main');

      // Fluffy tail
      d.circle(24, 72, 6, { fill: fur, kind: 'body' });

      // Body
      d.ellipse(46, 70, 20, 18, { fill: fur, kind: 'body' });
      // Back paw & front paw
      d.ellipse(36, 86, 12, 6, { fill: fur, kind: 'body' });
      d.ellipse(58, 86, 10, 5, { fill: fur, kind: 'body' });

      // Head
      d.circle(58, 50, 14, { fill: fur, kind: 'body' });

      // Long ears
      d.ellipse(52, 22, 5, 16, { fill: fur, kind: 'body', transform: 'rotate(-10 52 22)' });
      d.ellipse(52, 22, 2.5, 11, { fill: p.c('ear'), kind: 'accent', transform: 'rotate(-10 52 22)' });

      d.ellipse(64, 22, 5, 16, { fill: fur, kind: 'body', transform: 'rotate(10 64 22)' });
      d.ellipse(64, 22, 2.5, 11, { fill: p.c('ear'), kind: 'accent', transform: 'rotate(10 64 22)' });

      // Face
      d.circle(64, 48, 2, { fill: INK, kind: 'detail' });
      d.circle(70, 53, 2, { fill: p.c('nose'), kind: 'detail' });
      d.path('M67 56 Q70 59 73 56', { kind: 'line', stroke: INK, sw: 1.2 });
    },
  },
];
