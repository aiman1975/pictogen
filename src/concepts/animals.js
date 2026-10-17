// Animal concepts.
import { INK } from '../core/styles.js';
import { darken, mix } from '../core/color.js';
import { rigged } from './rig.js';

/**
 * Front and back views of the four-legged animals (opts.view 'front' | 'back'; side is the default
 * drawing). Seen head-on the body is foreshortened: chest, two front legs, the hind legs peeking out
 * behind. All of them share the skeleton in rig.js: legs in diagonal pairs (stepping up and down when
 * seen head-on), a head turning at the neck, a tail at its base, the whole body bobbing as it walks.
 */
export const animalView = (p) => (p.opts.view === 'front' || p.opts.view === 'back' ? p.opts.view : null);

// Leg joints: the two phases of a trot (diagonal pairs move together), and which end of the animal.
// Seen from the side: near front + far hind, then far front + near hind.
export const NEAR_FRONT = 'pg-leg-left pg-leg-front', FAR_FRONT = 'pg-leg-right pg-leg-front';
export const NEAR_HIND = 'pg-leg-right pg-leg-hind', FAR_HIND = 'pg-leg-left pg-leg-hind';
// Seen head-on, by side of the picture: front left with hind right, then front right with hind left
export const LEFT_FRONT = 'pg-leg-left pg-leg-front', RIGHT_FRONT = 'pg-leg-right pg-leg-front';
export const LEFT_HIND = 'pg-leg-right pg-leg-hind', RIGHT_HIND = 'pg-leg-left pg-leg-hind';
// From behind only the hind legs show, stepping one after the other
export const BACK_LEFT = 'pg-leg-left pg-leg-hind', BACK_RIGHT = 'pg-leg-right pg-leg-hind';

function drawDogView(d, p, view) {
  const fur = p.c('main'), ear = p.c('ear'), far = darken(fur, 0.15);
  rigged(d, p, 'quadruped', () => d.group({ class: 'pg-body-torso' }, () => {
    if (view === 'back') {
      // From behind the head is furthest away: it peeks over the back, and the tail is nearest
      d.joint('pg-head', [50, 53], () => {
        d.circle(50, 38, 15, { fill: fur, kind: 'body' });
        d.joint('pg-ear', [38, 30], () => d.path('M36 29 Q27 41 32 52 Q38 48 40 35 Z', { fill: ear, kind: 'body' }));
        d.joint('pg-ear', [62, 30], () => d.path('M64 29 Q73 41 68 52 Q62 48 60 35 Z', { fill: ear, kind: 'body' }));
        d.rect(40, 51, 20, 4, { rx: 2, fill: p.c('collar'), kind: 'body' });
      });
      d.ellipse(50, 70, 18, 16, { fill: fur, kind: 'body' });
      d.ellipse(44, 68, 7, 6, { fill: p.c('spot'), kind: 'accent' });
      d.joint(BACK_LEFT, null, () => d.rect(39, 74, 9, 19, { rx: 3, fill: fur, kind: 'body' }));
      d.joint(BACK_RIGHT, null, () => d.rect(52, 74, 9, 19, { rx: 3, fill: fur, kind: 'body' }));
      d.joint('pg-tail', [50, 62], () => d.path('M47 62 Q41 46 50 36 Q56 48 53 62 Z', { fill: darken(fur, 0.12), kind: 'body' })); // tail up
      return;
    }
    d.joint('pg-tail', [62, 60], () => d.path('M64 62 Q78 50 73 38 Q68 50 60 58 Z', { fill: fur, kind: 'body' })); // tail behind
    d.joint(LEFT_HIND, null, () => d.rect(33, 74, 7, 18, { rx: 3, fill: far, kind: 'body' }));
    d.joint(RIGHT_HIND, null, () => d.rect(60, 74, 7, 18, { rx: 3, fill: far, kind: 'body' }));
    d.ellipse(50, 70, 18, 16, { fill: fur, kind: 'body' });
    d.joint(LEFT_FRONT, null, () => d.rect(40, 72, 8, 21, { rx: 3, fill: fur, kind: 'body' }));
    d.joint(RIGHT_FRONT, null, () => {
      d.rect(52, 72, 8, 21, { rx: 3, fill: fur, kind: 'body' });
      d.ellipse(57, 76, 6, 5, { fill: p.c('spot'), kind: 'accent' });
    });
    d.rect(40, 55, 20, 4, { rx: 2, fill: p.c('collar'), kind: 'body' });
    d.circle(50, 61, 2, { fill: '#ffca28', kind: 'detail' });
    d.joint('pg-head', [50, 55], () => {
      d.circle(50, 40, 16, { fill: fur, kind: 'body' });
      d.joint('pg-ear', [38, 32], () => d.path('M36 30 Q26 42 31 54 Q38 50 40 36 Z', { fill: ear, kind: 'body' }));
      d.joint('pg-ear', [62, 32], () => d.path('M64 30 Q74 42 69 54 Q62 50 60 36 Z', { fill: ear, kind: 'body' }));
      d.ellipse(50, 47, 8, 6, { fill: mix(fur, '#ffffff', 0.35), kind: 'body' });
      d.ellipse(50, 44, 3.2, 2.4, { fill: p.c('nose'), kind: 'detail' });
      d.group({ class: 'pg-face-mouth' }, () => d.path('M46 49 Q50 52.5 54 49', { kind: 'line', stroke: INK, sw: 1.4 }));
      d.group({ class: 'pg-face-eyes' }, () => {
        d.circle(44, 37, 2.2, { fill: INK, kind: 'detail' });
        d.circle(56, 37, 2.2, { fill: INK, kind: 'detail' });
        d.circle(44.6, 36.3, 0.7, { kind: 'highlight', opacity: 0.9 });
        d.circle(56.6, 36.3, 0.7, { kind: 'highlight', opacity: 0.9 });
      });
    });
  }), { headOn: true });
}

function drawCatView(d, p, view) {
  const fur = p.c('main'), far = darken(fur, 0.15);
  rigged(d, p, 'quadruped', () => d.group({ class: 'pg-body-torso' }, () => {
    if (view === 'back') {
      d.joint('pg-head', [50, 58], () => {
        d.joint('pg-ear', [41, 36], () => d.poly([[37, 40], [36, 23], [47, 32]], { fill: fur, kind: 'body' }));
        d.joint('pg-ear', [59, 36], () => d.poly([[63, 40], [64, 23], [53, 32]], { fill: fur, kind: 'body' }));
        d.circle(50, 44, 15, { fill: fur, kind: 'body' });
      });
      d.ellipse(50, 74, 15, 14, { fill: fur, kind: 'body' });
      d.joint(BACK_LEFT, null, () => d.rect(42, 80, 7, 14, { rx: 3, fill: fur, kind: 'body' }));
      d.joint(BACK_RIGHT, null, () => d.rect(51, 80, 7, 14, { rx: 3, fill: fur, kind: 'body' }));
      d.joint('pg-tail', [50, 69], () => d.path('M48 70 Q36 54 44 40 Q49 36 50 42 Q45 54 53 68 Z', { fill: darken(fur, 0.12), kind: 'body' })); // tail up
      return;
    }
    d.joint('pg-tail', [62, 82], () => d.path('M60 86 Q80 84 78 64 Q76 56 71 60 Q74 68 66 78 Z', { fill: fur, kind: 'body' })); // tail curled at the side
    d.joint(LEFT_HIND, null, () => d.rect(37, 80, 6, 14, { rx: 3, fill: far, kind: 'body' }));
    d.joint(RIGHT_HIND, null, () => d.rect(57, 80, 6, 14, { rx: 3, fill: far, kind: 'body' }));
    d.ellipse(50, 74, 15, 14, { fill: fur, kind: 'body' });
    d.joint(LEFT_FRONT, null, () => d.rect(43, 80, 6, 14, { rx: 3, fill: fur, kind: 'body' }));
    d.joint(RIGHT_FRONT, null, () => d.rect(51, 80, 6, 14, { rx: 3, fill: fur, kind: 'body' }));
    d.ellipse(50, 75, 8, 9, { fill: mix(fur, '#ffffff', 0.4), kind: 'accent' });
    d.joint('pg-head', [50, 60], () => {
      d.joint('pg-ear', [41, 38], () => d.poly([[37, 42], [36, 25], [47, 34]], { fill: fur, kind: 'body' }));
      d.joint('pg-ear', [59, 38], () => d.poly([[63, 42], [64, 25], [53, 34]], { fill: fur, kind: 'body' }));
      d.circle(50, 46, 15, { fill: fur, kind: 'body' });
      // The inner ears overlap the head's rim: drawn after it, turning with their ears
      d.joint('pg-ear', [41, 38], () => d.poly([[39, 39], [38.5, 29], [45, 35]], { fill: p.c('innerEar'), kind: 'accent' }));
      d.joint('pg-ear', [59, 38], () => d.poly([[61, 39], [61.5, 29], [55, 35]], { fill: p.c('innerEar'), kind: 'accent' }));
      d.group({ class: 'pg-face-eyes' }, () => {
        d.ellipse(44, 45, 2, 2.6, { fill: INK, kind: 'detail' });
        d.ellipse(56, 45, 2, 2.6, { fill: INK, kind: 'detail' });
      });
      d.poly([[48, 50], [52, 50], [50, 52.5]], { fill: p.c('innerEar'), kind: 'detail' });
      d.group({ class: 'pg-face-mouth' }, () => d.path('M47 54 Q50 56 50 53 Q50 56 53 54', { kind: 'line', stroke: INK, sw: 1.2 }));
      for (const [y0, y1] of [[51, 48], [53, 54], [55, 59]]) {
        d.line(44, y0, 31, y1, { stroke: INK, sw: 1, kind: 'line' });
        d.line(56, y0, 69, y1, { stroke: INK, sw: 1, kind: 'line' });
      }
    });
  }), { headOn: true });
}

function drawRabbitView(d, p, view) {
  const fur = p.c('main'), light = mix(fur, '#ffffff', 0.5);
  const ears = (inner) => {
    for (const [x, r] of [[43, -8], [57, 8]]) {
      d.joint('pg-ear', [x, 36], () => {
        d.ellipse(x, 22, 5, 16, { fill: fur, kind: 'body', transform: `rotate(${r} ${x} 22)` });
        if (inner) d.ellipse(x, 22, 2.5, 11, { fill: p.c('ear'), kind: 'accent', transform: `rotate(${r} ${x} 22)` });
      });
    }
  };
  rigged(d, p, 'quadruped', () => d.group({ class: 'pg-body-torso' }, () => {
    if (view === 'back') {
      d.joint('pg-head', [50, 58], () => {
        ears(false);
        d.circle(50, 46, 14, { fill: fur, kind: 'body' });
      });
      d.ellipse(50, 72, 16, 16, { fill: fur, kind: 'body' });
      d.joint(BACK_LEFT, null, () => d.ellipse(42, 89, 7, 4, { fill: fur, kind: 'body' }));
      d.joint(BACK_RIGHT, null, () => d.ellipse(58, 89, 7, 4, { fill: fur, kind: 'body' }));
      d.joint('pg-tail', [50, 74], () => d.circle(50, 78, 6, { fill: light, kind: 'body' })); // fluffy tail
      return;
    }
    d.ellipse(50, 72, 16, 16, { fill: fur, kind: 'body' });
    d.joint(LEFT_FRONT, null, () => d.ellipse(42, 89, 7, 4, { fill: fur, kind: 'body' }));
    d.joint(RIGHT_FRONT, null, () => d.ellipse(58, 89, 7, 4, { fill: fur, kind: 'body' }));
    d.joint('pg-head', [50, 60], () => {
      ears(true);
      d.circle(50, 46, 14, { fill: fur, kind: 'body' });
      d.group({ class: 'pg-face-eyes' }, () => {
        d.circle(45, 44, 2, { fill: INK, kind: 'detail' });
        d.circle(55, 44, 2, { fill: INK, kind: 'detail' });
      });
      d.circle(50, 50, 2, { fill: p.c('nose'), kind: 'detail' });
      d.group({ class: 'pg-face-mouth' }, () => d.path('M47 53 Q50 56 53 53', { kind: 'line', stroke: INK, sw: 1.2 }));
    });
    d.ellipse(50, 75, 9, 10, { fill: light, kind: 'accent' });
  }), { headOn: true });
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
      const fur = p.c('main'), earColor = p.c('ear'), far = darken(fur, 0.12);
      rigged(d, p, 'quadruped', () => {
        // Legs: the far pair a shade darker; each swings from its hip in a trot
        d.joint(FAR_HIND, null, () => d.rect(26, 68, 8, 24, { rx: 3, fill: far, kind: 'body' }));
        d.joint(NEAR_HIND, null, () => d.rect(38, 68, 8, 24, { rx: 3, fill: fur, kind: 'body' }));
        d.joint(NEAR_FRONT, null, () => d.rect(58, 68, 8, 24, { rx: 3, fill: fur, kind: 'body' }));
        d.joint(FAR_FRONT, null, () => d.rect(70, 68, 8, 24, { rx: 3, fill: far, kind: 'body' }));
        d.group({ class: 'pg-body-torso' }, () => {
          d.joint('pg-tail', [25, 57], () => d.path('M22 60 Q12 45 18 36 Q22 45 28 56 Z', { fill: fur, kind: 'body' }));
          // Body (oval-ish)
          d.ellipse(48, 62, 26, 17, { fill: fur, kind: 'body' });
          d.ellipse(44, 58, 10, 8, { fill: p.c('spot'), kind: 'accent' });
          // Neck & collar
          d.path('M62 55 L74 38 L82 46 L72 65 Z', { fill: fur, kind: 'body' });
          d.rect(68, 48, 12, 4, { rx: 1.5, fill: p.c('collar'), kind: 'body' });
          d.joint('pg-head', [74, 47], () => {
            d.circle(75, 34, 15, { fill: fur, kind: 'body' });
            // Snout
            d.ellipse(85, 38, 8, 6, { fill: fur, kind: 'body' });
            d.circle(91, 36, 2.5, { fill: p.c('nose'), kind: 'detail' });
            // Floppy ear
            d.joint('pg-ear', [69, 29], () => d.path('M67 26 Q60 38 64 48 Q70 46 72 34 Z', { fill: earColor, kind: 'body' }));
            d.group({ class: 'pg-face-eyes' }, () => {
              d.circle(77, 30, 2.2, { fill: INK, kind: 'detail' });
              d.circle(77.6, 29.3, 0.7, { kind: 'highlight', opacity: 0.9 });
            });
            d.group({ class: 'pg-face-mouth' }, () => d.path('M85 41 Q88 44 91 40', { kind: 'line', stroke: INK, sw: 1.5 }));
          });
        });
      });
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
      const fur = p.c('main'), far = darken(fur, 0.12);
      rigged(d, p, 'quadruped', () => {
        d.joint(FAR_HIND, null, () => d.rect(34, 76, 7, 18, { rx: 3, fill: far, kind: 'body' }));
        d.joint(NEAR_HIND, null, () => d.rect(44, 76, 7, 18, { rx: 3, fill: fur, kind: 'body' }));
        d.joint(NEAR_FRONT, null, () => d.rect(58, 76, 7, 18, { rx: 3, fill: fur, kind: 'body' }));
        d.joint(FAR_FRONT, null, () => d.rect(68, 76, 7, 18, { rx: 3, fill: far, kind: 'body' }));
        d.group({ class: 'pg-body-torso' }, () => {
          // Tail (curled)
          d.joint('pg-tail', [26, 68], () => d.path('M24 72 Q10 70 12 50 Q14 36 22 40 Q18 52 26 64 Z', { fill: fur, kind: 'body' }));
          d.ellipse(50, 68, 22, 15, { fill: fur, kind: 'body' });
          d.joint('pg-head', [62, 56], () => {
            d.circle(68, 44, 14, { fill: fur, kind: 'body' });
            // Pointy ears
            d.joint('pg-ear', [62, 35], () => {
              d.poly([[58, 38], [57, 22], [67, 32]], { fill: fur, kind: 'body' });
              d.poly([[60, 36], [59, 25], [66, 32]], { fill: p.c('innerEar'), kind: 'accent' });
            });
            d.joint('pg-ear', [76, 35], () => {
              d.poly([[72, 32], [79, 22], [80, 38]], { fill: fur, kind: 'body' });
              d.poly([[73, 32], [78, 25], [78, 36]], { fill: p.c('innerEar'), kind: 'accent' });
            });
            d.group({ class: 'pg-face-eyes' }, () => d.circle(73, 42, 2, { fill: INK, kind: 'detail' }));
            d.poly([[78, 45], [82, 45], [80, 48]], { fill: p.c('innerEar'), kind: 'detail' });
            // Whiskers
            d.line(82, 45, 94, 42, { stroke: INK, sw: 1.2, kind: 'line' });
            d.line(82, 47, 94, 48, { stroke: INK, sw: 1.2, kind: 'line' });
            d.line(82, 49, 93, 54, { stroke: INK, sw: 1.2, kind: 'line' });
          });
        });
      });
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
      const color = p.c('main'), wing = p.c('wing');
      rigged(d, p, 'bird', () => {
        // Feet hang from the belly; the wings turn at the shoulder, the far one behind the body
        d.joint('pg-leg-left', null, () => d.line(42, 69, 40, 78, { stroke: p.c('beak'), sw: 1.8, kind: 'line' }));
        d.joint('pg-leg-right', null, () => d.line(50, 69, 48, 78, { stroke: p.c('beak'), sw: 1.8, kind: 'line' }));
        d.group({ class: 'pg-body-torso' }, () => {
          d.joint('pg-arm-left', [56, 49], () => d.path('M32 50 Q46 36 60 52 Q44 64 32 50 Z', { fill: darken(wing, 0.15), kind: 'body' }));
          // Tail feathers
          d.joint('pg-tail', [22, 57], () => d.poly([[16, 55], [8, 48], [10, 62], [24, 62]], { fill: wing, kind: 'body' }));
          d.ellipse(45, 54, 24, 16, { fill: color, kind: 'body' });
          d.ellipse(48, 59, 16, 10, { fill: p.c('belly'), kind: 'accent' });
          d.joint('pg-head', [58, 50], () => {
            d.circle(64, 42, 12, { fill: color, kind: 'body' });
            d.poly([[74, 40], [86, 44], [74, 48]], { fill: p.c('beak'), kind: 'body' });
            d.group({ class: 'pg-face-eyes' }, () => {
              d.circle(68, 39, 2.2, { fill: INK, kind: 'detail' });
              d.circle(68.6, 38.3, 0.7, { kind: 'highlight', opacity: 0.9 });
            });
          });
          d.joint('pg-arm-right', [56, 49], () => d.path('M32 50 Q46 36 60 52 Q44 64 32 50 Z', { fill: wing, kind: 'body' }));
        });
      });
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
      rigged(d, p, 'fish', () => d.group({ class: 'pg-body-torso' }, () => {
        // The tail fin beats from where it meets the body
        d.joint('pg-tail', [29, 50], () => d.path('M28 50 L10 32 Q18 50 10 68 Z', { fill: finColor, kind: 'body' }));
        // Dorsal and pelvic fins
        d.path('M44 34 Q54 20 64 34 Z', { fill: finColor, kind: 'body' });
        d.path('M46 66 Q52 78 60 66 Z', { fill: finColor, kind: 'body' });
        d.ellipse(50, 50, 28, 18, { fill: fishColor, kind: 'body' });
        // Clownfish / Nemo white stripes
        d.path('M40 33 Q43 50 40 67 L46 66 Q49 50 46 34 Z', { fill: stripe, kind: 'accent' });
        d.path('M56 32 Q59 50 56 68 L62 67 Q65 50 62 33 Z', { fill: stripe, kind: 'accent' });
        // Eye
        d.circle(68, 46, 3, { fill: '#ffffff', kind: 'body' });
        d.circle(69, 46, 1.8, { fill: INK, kind: 'detail' });
        // Pectoral fin: the fish's "arm"
        d.joint('pg-arm-right', [54, 50], () => d.ellipse(48, 52, 7, 4, { fill: finColor, kind: 'body', transform: 'rotate(-20 48 52)' }));
      }));
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
      rigged(d, p, 'bird', () => d.group({ class: 'pg-body-torso' }, () => {
        d.ellipse(45, 62, 26, 16, { fill: yellow, kind: 'body' });
        // Tail pointed up
        d.joint('pg-tail', [24, 56], () => d.poly([[20, 60], [12, 50], [25, 52]], { fill: yellow, kind: 'body' }));
        d.joint('pg-head', [60, 54], () => {
          d.circle(66, 42, 14, { fill: yellow, kind: 'body' });
          d.path('M76 43 Q88 43 92 46 Q88 51 76 50 Z', { fill: p.c('beak'), kind: 'body' });
          d.group({ class: 'pg-face-eyes' }, () => {
            d.circle(70, 38, 2.2, { fill: INK, kind: 'detail' });
            d.circle(70.7, 37.3, 0.7, { kind: 'highlight', opacity: 0.9 });
          });
        });
        d.joint('pg-arm-right', [56, 58], () => d.ellipse(44, 60, 14, 8, { fill: p.c('wing'), kind: 'body', transform: 'rotate(-10 44 60)' }));
      }));
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
      rigged(d, p, 'quadruped', () => {
        // Big hind paw and small front paw, tucked under the body
        d.joint(NEAR_HIND, null, () => d.ellipse(36, 86, 12, 6, { fill: fur, kind: 'body' }));
        d.joint(NEAR_FRONT, null, () => d.ellipse(58, 86, 10, 5, { fill: fur, kind: 'body' }));
        d.group({ class: 'pg-body-torso' }, () => {
          d.joint('pg-tail', [28, 72], () => d.circle(24, 72, 6, { fill: fur, kind: 'body' })); // fluffy tail
          d.ellipse(46, 70, 20, 18, { fill: fur, kind: 'body' });
          d.joint('pg-head', [54, 62], () => {
            // Long ears, each turning where it meets the head
            for (const [x, r] of [[52, -10], [64, 10]]) {
              d.joint('pg-ear', [x, 37], () => {
                d.ellipse(x, 22, 5, 16, { fill: fur, kind: 'body', transform: `rotate(${r} ${x} 22)` });
                d.ellipse(x, 22, 2.5, 11, { fill: p.c('ear'), kind: 'accent', transform: `rotate(${r} ${x} 22)` });
              });
            }
            d.circle(58, 50, 14, { fill: fur, kind: 'body' });
            d.group({ class: 'pg-face-eyes' }, () => d.circle(64, 48, 2, { fill: INK, kind: 'detail' }));
            d.circle(70, 53, 2, { fill: p.c('nose'), kind: 'detail' });
            d.group({ class: 'pg-face-mouth' }, () => d.path('M67 56 Q70 59 73 56', { kind: 'line', stroke: INK, sw: 1.2 }));
          });
        });
      });
    },
  },
];
