// Animal concepts.
import { INK } from '../core/styles.js';
import { darken, mix } from '../core/color.js';
import { rigged } from './rig.js';
import { limb } from './sea.js';
import { eyes, mouth, cheek } from './animal-face.js';

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
      mouth(d, p, 50, 50, 0.8);
      eyes(d, p, [[44, 37], [56, 37]], 0.85, fur);
      cheek(d, p, 41, 43, 0.9); cheek(d, p, 59, 43, 0.9);
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
      eyes(d, p, [[44, 45], [56, 45]], 0.8, fur);
      d.poly([[48, 50], [52, 50], [50, 52.5]], { fill: p.c('innerEar'), kind: 'detail' });
      mouth(d, p, 50, 54.5, 0.7);
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
      eyes(d, p, [[45, 44], [55, 44]], 0.75, fur);
      d.circle(50, 50, 2, { fill: p.c('nose'), kind: 'detail' });
      mouth(d, p, 50, 53.5, 0.7);
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
    colors: { main: '#d4a373', spot: '#8d5a3b', ear: '#8d5a3b', collar: '#e53935', nose: '#3e2723' },
    palettes: { main: ['#d4a373', '#bcaaa4', '#f5deb3', '#8d6e63', '#424242', '#ffffff'] },
    draw(d, p) {
      if (animalView(p)) return drawDogView(d, p, animalView(p));
      const fur = p.c('main'), far = darken(fur, 0.14), light = mix(fur, '#ffffff', 0.45);
      // A leg with its paw; the far pair a shade darker; each swings from its hip in a trot
      const leg = (x, fill) => () => { d.rect(x, 64, 9, 26, { rx: 4, fill, kind: 'body' }); d.ellipse(x + 5, 91, 6, 3, { fill: darken(fill, 0.08), kind: 'body' }); };
      rigged(d, p, 'quadruped', () => {
        d.joint(FAR_HIND, null, leg(27, far));
        d.joint(FAR_FRONT, null, leg(68, far));
        d.joint(NEAR_HIND, null, leg(36, fur));
        d.joint(NEAR_FRONT, null, leg(59, fur));
        d.group({ class: 'pg-body-torso' }, () => {
          // The tail, curving up, wagging from its base
          d.joint('pg-tail', [28, 56], () => limb(d, [[30, 56], [20, 50], [16, 40], [20, 30]], 6.5, 3.4, { fill: fur, kind: 'body' }));
          d.path('M26 60 Q26 45 42 45 L64 45 Q77 45 77 59 Q77 73 62 73 L40 73 Q26 73 26 60 Z', { fill: fur, kind: 'body' });
          d.ellipse(52, 68, 16, 4.5, { fill: light, kind: 'accent' });
          d.ellipse(40, 54, 9, 6.5, { fill: p.c('spot'), kind: 'accent' });
          d.path('M62 50 L71 33 L85 40 L75 64 Z', { fill: fur, kind: 'body' });
          // The collar and its tag
          d.path('M67 45 L82 50 L80 54.5 L65.5 49.5 Z', { fill: p.c('collar'), kind: 'body' });
          d.circle(73, 54, 2.2, { fill: '#ffca28', kind: 'detail' });
          d.joint('pg-head', [72, 46], () => {
            d.circle(77, 31, 13.5, { fill: fur, kind: 'body' });
            d.ellipse(88, 37.5, 9.5, 6.8, { fill: light, kind: 'body' });
            d.ellipse(95.5, 34.5, 2.8, 2.2, { fill: p.c('nose'), kind: 'detail' });
            eyes(d, p, [[81, 28]], 0.95, fur);
            cheek(d, p, 84, 35);
            mouth(d, p, 90, 41, 0.75);
            // The floppy ear, flapping from where it meets the head
            d.joint('pg-ear', [72, 24], () => d.path('M74 20 Q61 22 63 40 Q69 44 74 33 Z', { fill: p.c('ear'), kind: 'body' }));
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
    colors: { main: '#f4a259', stripe: '#d9772b', innerEar: '#ffab91', collar: '#00acc1', chest: '#fff3e0' },
    palettes: { main: ['#f4a259', '#9e9e9e', '#424242', '#ffffff', '#ffe082'] },
    draw(d, p) {
      if (animalView(p)) return drawCatView(d, p, animalView(p));
      const fur = p.c('main'), far = darken(fur, 0.14), stripe = p.c('stripe'), chest = p.c('chest');
      const leg = (x, fill) => () => { d.rect(x, 71, 7, 20, { rx: 3.5, fill, kind: 'body' }); d.ellipse(x + 3.6, 91.8, 4.6, 2.6, { fill: chest, kind: 'body' }); };
      rigged(d, p, 'quadruped', () => {
        d.joint(FAR_HIND, null, leg(31, far));
        d.joint(FAR_FRONT, null, leg(64, far));
        d.joint(NEAR_HIND, null, leg(39, fur));
        d.joint(NEAR_FRONT, null, leg(57, fur));
        d.group({ class: 'pg-body-torso' }, () => {
          // A long tail curling at its tip
          d.joint('pg-tail', [29, 64], () => {
            const [tx, ty] = limb(d, [[30, 64], [14, 64], [10, 46], [18, 40]], 5.6, 4.6, { fill: fur, kind: 'body' });
            d.path(`M${tx} ${ty} Q24 36 23 44 Q22 48 19 46`, { kind: 'line', stroke: fur, sw: 4.4, fill: 'none' });
            for (const [x, y] of [[16, 60], [12, 52]]) d.line(x - 2.5, y, x + 2.5, y + 1, { kind: 'line', stroke: stripe, sw: 1.8 });
          });
          d.ellipse(48, 65, 21, 12, { fill: fur, kind: 'body' });
          d.ellipse(62, 69, 6, 7, { fill: chest, kind: 'accent' });
          for (const x of [38, 45, 52]) d.path(`M${x} 54 Q${x + 2} 59 ${x} 64`, { kind: 'line', stroke: stripe, sw: 2, fill: 'none' });
          d.joint('pg-head', [61, 57], () => {
            // Pointy ears, the far one behind the head
            d.joint('pg-ear', [62, 35], () => { d.poly([[59, 38], [58, 22], [68, 31]], { fill: far, kind: 'body' }); });
            d.circle(68, 45, 13, { fill: fur, kind: 'body' });
            d.joint('pg-ear', [75, 35], () => {
              d.poly([[71, 33], [79, 21], [81, 37]], { fill: fur, kind: 'body' });
              d.poly([[73, 32.5], [78.5, 25], [79.5, 35.5]], { fill: p.c('innerEar'), kind: 'accent' });
            });
            d.path('M64 34 L65 39 M68 33 L68 38', { kind: 'line', stroke: stripe, sw: 1.6, fill: 'none' });
            d.ellipse(77, 51, 6, 4.2, { fill: chest, kind: 'body' });
            d.poly([[79, 47.5], [82.5, 47.5], [80.8, 50]], { fill: p.c('innerEar'), kind: 'detail' });
            eyes(d, p, [[73, 43]], 0.85, fur);
            cheek(d, p, 74, 49, 0.8);
            mouth(d, p, 80, 52.5, 0.6);
            // Whiskers
            for (const [x2, y2] of [[94, 46], [94, 51], [92, 56]]) d.line(81, 50, x2, y2, { stroke: INK, sw: 0.8, kind: 'line' });
          });
        });
      });
    },
  },
  {
    id: 'bird',
    aliases: ['sparrow', 'avian', 'robin', 'songbird', 'bluebird'],
    tags: ['animal', 'bird', 'air', 'fly'],
    category: 'animals',
    placement: 'air',
    scale: 0.3,
    baseline: 78,
    width: 0.7,
    colors: { main: '#64a6e8', belly: '#dcecfb', beak: '#ffa726', wing: '#3d7cc9' },
    palettes: { main: ['#64a6e8', '#ef5350', '#66bb6a', '#ffa726', '#ab47bc'] },
    draw(d, p) {
      const color = p.c('main'), wing = p.c('wing'), beak = p.c('beak');
      const wingShape = 'M30 54 Q40 38 58 48 Q52 64 30 54 Z';
      const feathers = () => { for (const y of [50, 54]) d.path(`M38 ${y} Q46 ${y - 3} 54 ${y + 1}`, { kind: 'line', stroke: darken(wing, 0.25), sw: 1, fill: 'none' }); };
      rigged(d, p, 'bird', () => {
        // Thin legs with little feet; the wings turn at the shoulder, the far one behind the body
        d.joint('pg-leg-left', null, () => { d.line(44, 70, 43, 78, { stroke: beak, sw: 1.8, kind: 'line' }); d.path('M39 78.5 L47 78.5', { kind: 'line', stroke: beak, sw: 1.8, fill: 'none' }); });
        d.joint('pg-leg-right', null, () => { d.line(51, 70, 51, 78, { stroke: beak, sw: 1.8, kind: 'line' }); d.path('M47.5 78.5 L55.5 78.5', { kind: 'line', stroke: beak, sw: 1.8, fill: 'none' }); });
        d.group({ class: 'pg-body-torso' }, () => {
          d.joint('pg-arm-left', [54, 48], () => d.path(wingShape, { fill: darken(wing, 0.15), kind: 'body' }));
          d.joint('pg-tail', [24, 58], () => d.path('M26 56 L10 50 Q12 58 8 64 L26 62 Z', { fill: wing, kind: 'body' }));
          d.ellipse(46, 57, 22, 16, { fill: color, kind: 'body' });
          d.ellipse(52, 63, 14, 9, { fill: p.c('belly'), kind: 'accent' });
          d.joint('pg-head', [58, 50], () => {
            d.circle(62, 42, 13, { fill: color, kind: 'body' });
            d.path('M73 40 L83 44 L73 48 Z', { fill: beak, kind: 'body' });
            d.line(73, 44, 80, 44, { kind: 'line', stroke: darken(beak, 0.3), sw: 0.8 });
            eyes(d, p, [[66, 39]], 0.85, color);
            cheek(d, p, 68, 45, 0.8);
            d.group({ class: 'pg-face-mouth' }, () => {});
          });
          d.joint('pg-arm-right', [54, 48], () => { d.path(wingShape, { fill: wing, kind: 'body' }); feathers(); });
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
    colors: { main: '#ff7a3d', stripe: '#ffffff', fin: '#ff9b5e', edge: '#263238' },
    palettes: { main: ['#ff7a3d', '#29b6f6', '#ffd54f', '#ab47bc', '#26a69a'] },
    draw(d, p) {
      const body = p.c('main'), fin = p.c('fin'), stripe = p.c('stripe'), edge = p.c('edge');
      rigged(d, p, 'fish', () => d.group({ class: 'pg-body-torso' }, () => {
        // The tail fin beats from where it meets the body; its tip and the fins' edges dark
        d.joint('pg-tail', [28, 50], () => {
          d.path('M30 50 Q18 32 9 36 Q14 50 9 64 Q18 68 30 50 Z', { fill: fin, kind: 'body' });
          d.path('M9 36 Q14 50 9 64', { kind: 'line', stroke: edge, sw: 2, fill: 'none' });
        });
        d.path('M40 35 Q50 20 64 33 Z', { fill: fin, kind: 'body' });
        d.path('M44 65 Q50 79 60 66 Z', { fill: fin, kind: 'body' });
        d.ellipse(50, 50, 27, 17, { fill: body, kind: 'body' });
        // White stripes with dark edges
        for (const [x, w] of [[42, 6], [59, 6.5]]) {
          const dd = `M${x} 33.5 Q${x + 3} 50 ${x} 66.5 L${x + w} 66 Q${x + w + 3} 50 ${x + w} 34 Z`;
          d.path(dd, { fill: stripe, kind: 'accent' });
          d.path(dd, { kind: 'line', stroke: edge, sw: 1, fill: 'none' });
        }
        eyes(d, p, [[69, 46]], 1, body);
        cheek(d, p, 70, 52, 0.8);
        mouth(d, p, 75, 53.5, 0.6);
        // Pectoral fin: the fish's "arm"
        d.joint('pg-arm-right', [54, 52], () => d.ellipse(49, 55, 7, 4, { fill: fin, kind: 'body', transform: 'rotate(-20 49 55)' }));
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
    colors: { main: '#ffe14d', beak: '#fb8c00', wing: '#f5c518' },
    palettes: { main: ['#ffe14d', '#ffffff', '#43a047'] },
    draw(d, p) {
      const yellow = p.c('main'), wing = p.c('wing');
      rigged(d, p, 'bird', () => d.group({ class: 'pg-body-torso' }, () => {
        // A little tuft of a tail, pointing up
        d.joint('pg-tail', [24, 58], () => d.path('M27 60 Q16 58 13 48 Q20 52 28 54 Z', { fill: yellow, kind: 'body' }));
        d.ellipse(45, 64, 23, 15, { fill: yellow, kind: 'body' });
        d.joint('pg-head', [58, 54], () => {
          d.circle(64, 42, 14, { fill: yellow, kind: 'body' });
          d.path('M62 28 Q64 22 67 27 Q69 22 70 28', { kind: 'line', stroke: darken(yellow, 0.1), sw: 2, fill: 'none' });
          d.path('M75 43 Q86 41 91 45 Q87 50 76 50 Z', { fill: p.c('beak'), kind: 'body' });
          d.line(77, 46.5, 88, 46, { kind: 'line', stroke: darken(p.c('beak'), 0.3), sw: 0.8 });
          eyes(d, p, [[68, 39]], 0.9, yellow);
          cheek(d, p, 69, 45, 0.85);
          d.group({ class: 'pg-face-mouth' }, () => {});
        });
        d.joint('pg-arm-right', [54, 58], () => {
          d.path('M30 60 Q38 50 56 56 Q50 70 30 60 Z', { fill: wing, kind: 'body' });
          for (const y of [58, 62]) d.path(`M36 ${y} Q44 ${y - 2} 52 ${y + 1}`, { kind: 'line', stroke: darken(wing, 0.2), sw: 1, fill: 'none' });
        });
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
      const fur = p.c('main'), edge = { stroke: '#cfd8dc', sw: 1 }, shade = darken(fur, 0.03);
      rigged(d, p, 'quadruped', () => {
        // A big hind paw and a small front leg, under the body
        d.joint(NEAR_HIND, null, () => d.ellipse(36, 88, 13, 5.5, { fill: fur, kind: 'body', ...edge }));
        d.joint(NEAR_FRONT, null, () => { d.rect(56, 74, 7, 15, { rx: 3.5, fill: fur, kind: 'body', ...edge }); d.ellipse(60, 89.5, 6, 3, { fill: fur, kind: 'body', ...edge }); });
        d.group({ class: 'pg-body-torso' }, () => {
          d.joint('pg-tail', [28, 70], () => d.circle(24, 70, 6.5, { fill: '#ffffff', kind: 'body', ...edge }));
          d.ellipse(45, 72, 20, 16, { fill: fur, kind: 'body', ...edge });
          d.path('M28 80 Q30 66 42 68 Q48 74 44 84', { kind: 'line', stroke: '#cfd8dc', sw: 1, fill: 'none' });
          d.joint('pg-head', [55, 62], () => {
            // Long ears, each turning where it meets the head
            for (const [x, r] of [[53, -14], [62, -3]]) {
              d.joint('pg-ear', [x, 40], () => {
                d.ellipse(x, 24, 5.5, 16, { fill: fur, kind: 'body', ...edge, transform: `rotate(${r} ${x} 24)` });
                d.ellipse(x, 24, 2.8, 11, { fill: p.c('ear'), kind: 'accent', transform: `rotate(${r} ${x} 24)` });
              });
            }
            d.circle(60, 50, 13.5, { fill: fur, kind: 'body', ...edge });
            d.ellipse(70, 54, 5, 4, { fill: '#ffffff', kind: 'body' });
            d.circle(72.5, 52, 1.8, { fill: p.c('nose'), kind: 'detail' });
            eyes(d, p, [[65, 46]], 0.85, fur);
            cheek(d, p, 66, 52, 0.85);
            mouth(d, p, 71, 56, 0.55);
            for (const [x2, y2] of [[84, 49], [84, 54]]) d.line(73, 53, x2, y2, { stroke: '#90a4ae', sw: 0.7, kind: 'line' });
          });
        });
      });
    },
  },
];
