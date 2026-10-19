// Labelled diagrams for school: the parts of a plant, the human body, the water cycle (in numbered
// steps), a volcano, the layers of the Earth, the solar system, the life cycle of a butterfly, a
// tree - drawn with the shared kit, so every style draws them its own way - with real labels on
// leader lines. Labels can be renamed (opts.labels) or left blank for a quiz (opts.blank: numbered
// lines and a word bank). Anything else becomes a labelled picture: each thing named under it
// ("a cat, a dog and a cow"), for vocabulary.

import { getConcept } from './concepts/index.js';
import { drawConcept, shapesToSvg, svgDoc, newUid, styleWrap, FONT, esc } from './core/render.js';
import { createKit } from './core/kit.js';
import { getStyle } from './core/styles.js';
import { createRng } from './core/rng.js';
import { fitText, textWidth } from './bubble.js';

const r1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const line = (stroke, sw = 1.4, extra = {}) => ({ kind: 'line', stroke, sw, fill: 'none', ...extra });

// An arrow along a path ending at (x, y), coming from (fx, fy): its head
function arrowHead(d, x, y, fx, fy, color, size = 3.2) {
  const a = Math.atan2(y - fy, x - fx), s = size;
  d.poly([[x, y], [x - s * Math.cos(a - 0.5), y - s * Math.sin(a - 0.5)], [x - s * Math.cos(a + 0.5), y - s * Math.sin(a + 0.5)]], { fill: color, kind: 'detail' });
}

// ---------------------------------------------------------------------------------------------
// The topics. Each draws in its own box (w x h); parts say where each label points (at) and on
// which side of the drawing it goes; step: its place in a cycle (shown as a number)

const roots = (d, x, y, color = '#d7ccc8') => {
  for (const p of [`M${x} ${y} L${x} ${y + 28}`, `M${x} ${y + 6} Q${x - 8} ${y + 14} ${x - 18} ${y + 28}`, `M${x} ${y + 8} Q${x + 10} ${y + 16} ${x + 20} ${y + 29}`,
    `M${x - 7} ${y + 15} L${x - 10} ${y + 26}`, `M${x + 8} ${y + 17} L${x + 9} ${y + 27}`, `M${x} ${y + 18} L${x - 4} ${y + 25}`]) {
    d.path(p, line(color, 2.2));
  }
};

export const DIAGRAMS = {
  plant: {
    title: 'Parts of a plant',
    match: /\b(plant parts|parts? of (a |the )?(flowering )?plant|label(l?ed|l?ing)? (a |the )?plant|plant diagram|diagram of (a |the )?plant)\b/,
    word: /\b(plant|plants|flowering plant)\b/,
    w: 100, h: 120,
    draw(d) {
      d.rect(0, 82, 100, 38, { fill: '#8d6e63', kind: 'bg' });
      d.rect(0, 79, 100, 5, { fill: '#7cb342', kind: 'bg' });
      for (const [x, y] of [[12, 92], [80, 96], [30, 112], [88, 112], [16, 104]]) d.circle(x, y, 1.6, { fill: '#6d4c41', kind: 'detail' });
      roots(d, 50, 84);
      d.path('M50 82 Q47 62 50 44 L50 30', line('#43a047', 3.6));
      d.path('M50 64 Q36 52 26 58 Q38 70 50 64 Z', { fill: '#66bb6a', kind: 'body' });
      d.path('M50 64 Q38 60 30 59', line('#2e7d32', 1));
      d.path('M50 50 Q64 38 74 45 Q63 57 50 50 Z', { fill: '#66bb6a', kind: 'body' });
      d.path('M50 50 Q62 47 70 46', line('#2e7d32', 1));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        d.ellipse(50 + Math.cos(a) * 8, 22 + Math.sin(a) * 8, 6.2, 6.2, { fill: '#f48fb1', kind: 'body' });
      }
      d.circle(50, 22, 5.5, { fill: '#ffca28', kind: 'body' });
    },
    parts: [
      { key: 'flower', label: 'Flower', at: [57, 15], side: 'right' },
      { key: 'petal', label: 'Petal', at: [42, 20], side: 'left' },
      { key: 'leaf', label: 'Leaf', at: [32, 59], side: 'left' },
      { key: 'stem', label: 'Stem', at: [49.5, 72], side: 'right' },
      { key: 'roots', label: 'Roots', at: [62, 104], side: 'right' },
      { key: 'soil', label: 'Soil', at: [20, 96], side: 'left' },
    ],
  },
  tree: {
    title: 'Parts of a tree',
    match: /\b(tree parts|parts? of (a |the )?tree|label(l?ed|l?ing)? (a |the )?tree|tree diagram|diagram of (a |the )?tree)\b/,
    word: /\b(tree|trees)\b/,
    w: 100, h: 120,
    draw(d) {
      d.rect(0, 90, 100, 30, { fill: '#8d6e63', kind: 'bg' });
      d.rect(0, 87, 100, 5, { fill: '#7cb342', kind: 'bg' });
      roots(d, 50, 92);
      d.path('M44 90 L46 50 L54 50 L56 90 Z', { fill: '#795548', kind: 'body' });
      d.path('M50 62 L68 46', line('#795548', 3.2));
      d.path('M49 58 L33 44', line('#795548', 3));
      for (const [x, y, r] of [[50, 30, 20], [32, 38, 14], [68, 38, 14], [40, 20, 12], [60, 20, 12]]) d.circle(x, y, r, { fill: '#43a047', kind: 'body' });
      for (const [x, y] of [[66, 30], [36, 30], [52, 40], [44, 16]]) d.circle(x, y, 3, { fill: '#e53935', kind: 'accent' });
      d.path('M47 70 Q49 74 47 78 M52 60 Q54 64 52 68', line('#5d4037', 0.9));
    },
    parts: [
      { key: 'leaves', label: 'Leaves', at: [28, 32], side: 'left' },
      { key: 'fruit', label: 'Fruit', at: [66, 30], side: 'right' },
      { key: 'branch', label: 'Branch', at: [63, 50], side: 'right' },
      { key: 'trunk', label: 'Trunk', at: [46, 76], side: 'left' },
      { key: 'roots', label: 'Roots', at: [63, 112], side: 'right' },
    ],
  },
  body: {
    title: 'Parts of the body',
    match: /\b(human body|body parts|parts? of (the |a |my |your )?body|label(l?ed|l?ing)? (the |a )?body|body diagram|my body|the body)\b/,
    word: /\b(body)\b/,
    w: 100, h: 100,
    draw(d, o) {
      d.shapes.push(...drawConcept(getConcept(o.figure === 'girl' ? 'girl' : 'boy'), { seed: o.seed, style: o.style, expression: 'happy' }));
    },
    parts: [
      { key: 'hair', label: 'Hair', at: [42, 14], side: 'left' },
      { key: 'ear', label: 'Ear', at: [35.5, 29], side: 'left' },
      { key: 'eye', label: 'Eye', at: [44.5, 28], side: 'left' },
      { key: 'shoulder', label: 'Shoulder', at: [37, 46], side: 'left' },
      { key: 'arm', label: 'Arm', at: [28.5, 57], side: 'left' },
      { key: 'hand', label: 'Hand', at: [26, 67], side: 'left' },
      { key: 'head', label: 'Head', at: [60, 19], side: 'right' },
      { key: 'mouth', label: 'Mouth', at: [52, 34], side: 'right' },
      { key: 'neck', label: 'Neck', at: [52.5, 40], side: 'right' },
      { key: 'tummy', label: 'Tummy', at: [56, 60], side: 'right' },
      { key: 'leg', label: 'Leg', at: [56, 80], side: 'right' },
      { key: 'foot', label: 'Foot', at: [58, 92], side: 'right' },
    ],
  },
  water_cycle: {
    title: 'The water cycle',
    match: /\b(water cycle|rain cycle|hydrologic(al)? cycle)\b/,
    w: 160, h: 100,
    draw(d) {
      d.rect(0, 0, 160, 100, { fill: '#e3f2fd', kind: 'bg' });
      // The sun warms the sea
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        d.line(22 + Math.cos(a) * 11, 18 + Math.sin(a) * 11, 22 + Math.cos(a) * 15, 18 + Math.sin(a) * 15, line('#ffb300', 1.6));
      }
      d.circle(22, 18, 9, { fill: '#ffca28', kind: 'body' });
      // Mountains, land, a river back to the sea
      d.poly([[70, 80], [96, 50], [122, 80]], { fill: '#a1887f', kind: 'body' });
      d.poly([[92, 80], [124, 24], [160, 80]], { fill: '#8d6e63', kind: 'body' });
      d.poly([[117, 36], [124, 24], [131, 36], [127, 34], [124, 38], [120, 34]], { fill: '#ffffff', kind: 'body' });
      d.rect(62, 76, 98, 24, { fill: '#81c784', kind: 'bg' });
      d.rect(0, 74, 66, 26, { fill: '#42a5f5', kind: 'bg' });
      for (const [x, y] of [[10, 82], [32, 88], [50, 80], [18, 94]]) d.path(`M${x} ${y} q3 -2 6 0 q3 2 6 0`, line('#bbdefb', 1));
      d.path('M120 50 Q112 62 104 72 Q92 82 80 86 Q72 90 62 90', line('#4fc3f7', 3.4));
      // The cloud, and rain falling on the mountain
      for (const [x, y, r] of [[92, 20, 8], [103, 15, 10], [115, 20, 8], [104, 23, 8]]) d.circle(x, y, r, { fill: '#ffffff', kind: 'body' });
      d.path('M86 25 Q104 30 121 25', line('#b0bec5', 1.2));
      d.group({ class: 'pg-dg-rain' }, () => {
        for (const [x, y] of [[94, 32], [100, 36], [106, 32], [112, 37], [97, 42], [109, 43], [103, 47]]) d.line(x, y, x - 1.5, y + 4.5, line('#1e88e5', 1.4));
      });
      // Water rising from the sea as vapour
      d.group({ class: 'pg-dg-steam' }, () => {
        for (const x of [24, 36, 48]) d.path(`M${x} 70 q-2.5 -4 0 -8 q2.5 -4 0 -8 q-2.5 -4 0 -8`, line('#90a4ae', 1.3, { opacity: 0.9 }));
      });
      // The cycle: up from the sea, across to the cloud, down as rain, back along the river
      const A = '#ef6c00';
      d.path('M44 44 Q56 22 80 18', line(A, 2));
      arrowHead(d, 80, 18, 70, 18.5, A);
      d.path('M124 26 Q130 36 126 46', line(A, 2));
      arrowHead(d, 126, 46, 128, 40, A);
      d.path('M96 90 Q84 96 70 95', line(A, 2));
      arrowHead(d, 70, 95, 78, 96, A);
    },
    parts: [
      { key: 'sun', label: 'Sun', at: [22, 18], side: 'left' },
      { key: 'evaporation', label: 'Evaporation', at: [36, 56], side: 'left', step: 1 },
      { key: 'sea', label: 'Sea', at: [16, 88], side: 'left' },
      { key: 'condensation', label: 'Condensation', at: [104, 12], side: 'top', step: 2 },
      { key: 'mountain', label: 'Mountain', at: [130, 40], side: 'right' },
      { key: 'precipitation', label: 'Precipitation', at: [110, 40], side: 'right', step: 3 },
      { key: 'river', label: 'River', at: [100, 75], side: 'right' },
      { key: 'collection', label: 'Collection', at: [70, 89], side: 'bottom', step: 4 },
    ],
  },
  volcano: {
    title: 'Inside a volcano',
    match: /\b(volcano|volcanoes|volcanic eruption|inside a volcano|parts of a volcano)\b/,
    w: 120, h: 100,
    draw(d) {
      d.rect(0, 0, 120, 78, { fill: '#fff3e0', kind: 'bg' });
      for (const [y, c] of [[78, '#a1887f'], [85, '#8d6e63'], [92, '#6d4c41']]) d.rect(0, y, 120, 8, { fill: c, kind: 'bg' });
      // Ash cloud
      for (const [x, y, r] of [[54, 14, 8], [64, 9, 10], [74, 14, 8], [60, 20, 7], [70, 21, 7]]) d.circle(x, y, r, { fill: '#9e9e9e', kind: 'body' });
      // The mountain, cut open
      d.poly([[8, 80], [48, 30], [72, 30], [112, 80]], { fill: '#8d6e63', kind: 'body' });
      d.poly([[28, 80], [52, 48], [68, 48], [92, 80]], { fill: '#795548', kind: 'body' });
      // Magma chamber, the vent up to the crater, lava over the side
      d.ellipse(60, 91, 22, 6.5, { fill: '#ff7043', kind: 'body' });
      d.poly([[56.5, 88], [63.5, 88], [62.5, 31], [57.5, 31]], { fill: '#ff7043', kind: 'body' });
      d.ellipse(60, 30.5, 12, 3, { fill: '#ff5722', kind: 'body' });
      d.path('M68 31 Q80 46 86 66 Q90 70 92 66 Q86 46 72 30 Z', { fill: '#ff8a65', kind: 'body' });
      d.path('M51 31 Q44 40 40 50 Q38 53 41 52 Q46 42 54 31 Z', { fill: '#ff8a65', kind: 'body' });
      for (const [x, y] of [[57, 4], [69, 2], [80, 8]]) d.circle(x, y, 1.4, { fill: '#ff7043', kind: 'accent' });
    },
    parts: [
      { key: 'ash', label: 'Ash cloud', at: [74, 12], side: 'right' },
      { key: 'crater', label: 'Crater', at: [55, 30], side: 'left' },
      { key: 'lava', label: 'Lava', at: [84, 60], side: 'right' },
      { key: 'vent', label: 'Vent', at: [60, 64], side: 'left' },
      { key: 'magma', label: 'Magma chamber', at: [70, 92], side: 'right' },
      { key: 'rock', label: 'Layers of rock', at: [10, 88], side: 'left' },
    ],
  },
  earth: {
    title: 'Layers of the Earth',
    match: /\b(layers? of the earth|earth'?s? layers|inside (of )?the earth|structure of the earth|earth'?s? (core|crust|mantle))\b/,
    word: /\b(earth|planet earth)\b/,
    w: 100, h: 100,
    draw(d) {
      d.circle(50, 50, 44, { fill: '#42a5f5', kind: 'body' });
      d.path('M14 40 Q22 26 34 30 Q38 40 30 46 Q26 56 18 54 Q12 48 14 40 Z', { fill: '#66bb6a', kind: 'body' });
      d.path('M30 70 Q42 62 50 72 Q52 84 40 88 Q30 84 30 70 Z', { fill: '#66bb6a', kind: 'body' });
      d.path('M40 14 Q50 10 56 16 Q50 22 42 20 Z', { fill: '#66bb6a', kind: 'body' });
      const slice = (r, c) => d.path(`M50 50 L50 ${50 - r} A${r} ${r} 0 0 1 ${50 + r} 50 Z`, { fill: c, kind: 'body' });
      slice(44, '#8d6e63');
      slice(40, '#ef6c00');
      slice(24, '#ffa726');
      slice(11, '#ffeb3b');
    },
    parts: [
      { key: 'crust', label: 'Crust', at: [71, 13.6], side: 'right' },
      { key: 'mantle', label: 'Mantle', at: [74.5, 29.4], side: 'right' },
      { key: 'outer_core', label: 'Outer core', at: [66.3, 42.4], side: 'right' },
      { key: 'inner_core', label: 'Inner core', at: [55, 46.5], side: 'right' },
      { key: 'surface', label: 'Ocean', at: [22, 64], side: 'left' },
    ],
  },
  solar_system: {
    title: 'The solar system',
    match: /\b(solar system|the planets|eight planets|planets of the solar system|planets in order)\b/,
    word: /\b(planets)\b/,
    w: 200, h: 70,
    draw(d, o) {
      d.rect(-8, 0, 216, 70, { fill: '#0d1b3e', kind: 'bg' });
      const rng = createRng(`stars:${o.seed}`);
      for (let i = 0; i < 40; i++) d.circle(rng() * 200, rng() * 70, 0.3 + rng() * 0.5, { fill: '#ffffff', kind: 'accent', opacity: 0.8 });
      for (const x of [30, 40, 52, 63, 84, 110, 134, 154]) {
        const R = x + 6;
        const dx = Math.sqrt(R * R - 35 * 35);
        d.path(`M${r1(-6 + dx)} 0 A${R} ${R} 0 0 1 ${r1(-6 + dx)} 70`, line('#5c6bc0', 0.5, { opacity: 0.6 }));
      }
      d.circle(-6, 35, 26, { fill: '#ffb300', kind: 'body' });
      d.circle(-6, 35, 20, { fill: '#ffca28', kind: 'accent' });
      const planet = (x, r, c) => d.circle(x, 35, r, { fill: c, kind: 'body' });
      planet(30, 1.6, '#9e9e9e');
      planet(40, 2.6, '#ffcc80');
      planet(52, 2.8, '#42a5f5');
      d.circle(51.4, 34.2, 1, { fill: '#66bb6a', kind: 'accent' });
      planet(63, 2.1, '#e64a19');
      planet(84, 8, '#d7a86e');
      for (const y of [32, 35.5, 38.5]) d.rect(76.5, y, 15, 1.2, { fill: '#a1887f', kind: 'accent' });
      d.ellipse(110, 35, 11, 2.6, line('#e6c86e', 1.6));
      planet(110, 6.4, '#ffe082');
      planet(134, 4.6, '#80deea');
      planet(154, 4.4, '#3f51b5');
    },
    parts: [
      { key: 'sun', label: 'Sun', at: [10, 35], side: 'top' },
      { key: 'mercury', label: 'Mercury', at: [30, 35], side: 'bottom' },
      { key: 'venus', label: 'Venus', at: [40, 35], side: 'top' },
      { key: 'earth', label: 'Earth', at: [52, 35], side: 'bottom' },
      { key: 'mars', label: 'Mars', at: [63, 35], side: 'top' },
      { key: 'jupiter', label: 'Jupiter', at: [84, 35], side: 'bottom' },
      { key: 'saturn', label: 'Saturn', at: [110, 35], side: 'top' },
      { key: 'uranus', label: 'Uranus', at: [134, 35], side: 'bottom' },
      { key: 'neptune', label: 'Neptune', at: [154, 35], side: 'top' },
    ],
  },
  butterfly_cycle: {
    title: 'Life cycle of a butterfly',
    match: /\b(life ?cycle of (a |the )?butterfl(y|ies)|butterfly('s)? life ?cycle|metamorphosis)\b/,
    w: 100, h: 100,
    draw(d) {
      // Arrows round the circle, clockwise from one stage to the next
      const A = '#90a4ae';
      for (const [a0, a1] of [[-60, -30], [30, 60], [120, 150], [210, 240]]) {
        const p = (a) => [50 + Math.cos((a * Math.PI) / 180) * 34, 50 + Math.sin((a * Math.PI) / 180) * 34];
        const [x0, y0] = p(a0), [x1, y1] = p(a1), [xm, ym] = p((a0 + a1) / 2 - 2);
        d.path(`M${r1(x0)} ${r1(y0)} A34 34 0 0 1 ${r1(x1)} ${r1(y1)}`, line(A, 1.8));
        arrowHead(d, x1, y1, xm, ym, A);
      }
      // 1 eggs on a leaf
      d.ellipse(50, 16, 13, 6.5, { fill: '#66bb6a', kind: 'body' });
      d.line(38, 16, 62, 16, line('#2e7d32', 0.9));
      for (const [x, y] of [[45, 13.5], [49, 12.5], [53, 13.5], [47, 18.5], [51, 18.5]]) d.circle(x, y, 1.6, { fill: '#fff9c4', kind: 'accent' });
      // 2 a caterpillar
      for (let i = 0; i < 6; i++) d.circle(76 + i * 3.4, 52 - (i === 2 || i === 3 ? 2 : 0), 3, { fill: i === 5 ? '#558b2f' : '#8bc34a', kind: 'body' });
      d.circle(93.6, 50.8, 0.7, { fill: '#212121', kind: 'detail' });
      d.path('M93 49 L95 45 M94.5 49.5 L97 46', line('#33691e', 0.8));
      // 3 a chrysalis hanging from a twig
      d.line(40, 76, 60, 76, line('#795548', 1.8));
      d.path('M50 76 Q57 82 54 92 Q50 97 46 92 Q43 82 50 76 Z', { fill: '#9ccc65', kind: 'body' });
      d.path('M47 84 Q50 86 53 84 M47.5 89 Q50 91 52.5 89', line('#689f38', 0.8));
      // 4 a butterfly
      d.ellipse(10, 45, 7, 6, { fill: '#ff9800', kind: 'body' });
      d.ellipse(22, 45, 7, 6, { fill: '#ff9800', kind: 'body' });
      d.ellipse(11, 55, 5, 4.4, { fill: '#fb8c00', kind: 'body' });
      d.ellipse(21, 55, 5, 4.4, { fill: '#fb8c00', kind: 'body' });
      for (const [x, y] of [[8, 44], [24, 44], [11, 56], [21, 56]]) d.circle(x, y, 1.4, { fill: '#212121', kind: 'detail' });
      d.ellipse(16, 50, 1.4, 8, { fill: '#3e2723', kind: 'detail' });
      d.path('M15.5 42.5 L13 38 M16.5 42.5 L19 38', line('#3e2723', 0.8));
    },
    parts: [
      { key: 'egg', label: 'Egg', at: [50, 14], side: 'top', step: 1 },
      { key: 'caterpillar', label: 'Caterpillar', at: [88, 51], side: 'right', step: 2 },
      { key: 'chrysalis', label: 'Chrysalis', at: [50, 86], side: 'bottom', step: 3 },
      { key: 'butterfly', label: 'Butterfly', at: [16, 50], side: 'left', step: 4 },
    ],
  },
};

/**
 * The diagram a prompt asks for: 'plant', 'water_cycle'... or null. `strict`: only when the prompt
 * clearly asks for one ("the parts of a plant", "the water cycle"), as in a scene; otherwise (the
 * diagram mode) the topic's own word is enough ("a plant", "a volcano").
 */
export function findDiagram(text, { strict = false } = {}) {
  const t = String(text || '').toLowerCase();
  for (const [id, dg] of Object.entries(DIAGRAMS)) if (dg.match.test(t)) return id;
  if (strict) return null;
  for (const [id, dg] of Object.entries(DIAGRAMS)) if (dg.word?.test(t)) return id;
  return null;
}

// ---------------------------------------------------------------------------------------------
// Laying out labels beside a drawing

const DARK_STYLES = ['neon', 'blueprint', 'chalkboard'];

function themeOf(style) {
  const st = getStyle(style);
  const dark = DARK_STYLES.includes(style);
  return {
    bg: st.background || '#ffffff',
    ink: dark ? '#f1f5f9' : '#1f2937',
    muted: dark ? '#94a3b8' : '#64748b',
    accent: style === 'blueprint' ? '#38bdf8' : style === 'chalkboard' ? '#fde68a' : dark ? '#f472b6' : '#2563eb',
    box: dark ? 'rgba(15,23,42,0.85)' : '#ffffff',
    line: dark ? '#cbd5e1' : '#475569',
    // (a number on a light badge is dark)
    onAccent: style === 'chalkboard' ? '#1f2937' : '#ffffff',
  };
}

// Spread labels along one axis: each as near its anchor as it can be without overlapping
function spread(items, lo, hi, gap) {
  items.sort((a, b) => a.want - b.want);
  let pos = lo;
  for (const it of items) { it.pos = Math.max(it.want - it.len / 2, pos); pos = it.pos + it.len + gap; }
  let end = hi;
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.pos + it.len > end) it.pos = end - it.len;
    end = it.pos - gap;
  }
  for (const it of items) it.pos = Math.max(lo, it.pos);
}

/** The words of the labels, as shown: renamed ones, in order, numbered if they're steps */
function labelTexts(parts, labels) {
  return parts.map((p) => ({ ...p, text: typeof labels?.[p.key] === 'string' ? labels[p.key].slice(0, 40) : p.label }));
}

// A word bank: the labels' words, shuffled (the same way for the same seed)
function wordBank(words, seed) {
  const rng = createRng(`bank:${seed}`);
  const out = [...words];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/**
 * renderDiagram(topic, opts) -> { svg, diagram: { topic, title, labels: [{ key, text, step? }] } }
 *   opts: { width, height, style, seed, labels: { key: text }, blank: bool, numbered: bool (numbers
 *           as on the blank one: an answer key), title, figure }
 */
export function renderDiagram(topic, opts = {}) {
  const dg = DIAGRAMS[topic];
  const { width: W = 640, height: H = 360, style = 'flat', seed = 1, blank = false } = opts;
  const numbered = blank || Boolean(opts.numbered);
  const th = themeOf(style);
  const uid = newUid();
  const parts = labelTexts(dg.parts, opts.labels);
  const title = String(opts.title || dg.title).slice(0, 80);
  const titleSize = clamp(W / 32, 12, 24);
  const top = titleSize * 2.1;
  const has = (side) => parts.some((p) => p.side === side);
  const maxW = W * 0.26;
  const widthAt = (p, sz) => Math.min(maxW, (blank ? sz * 5.2 : textWidth(p.text, sz)) + sz * 1.6 + (p.step || numbered ? sz * 1.75 : 0));
  // The label size: as big as the picture allows, smaller when a row or column would not fit
  const fits = (sz) => ['top', 'bottom'].every((side) => parts.filter((p) => p.side === side).reduce((t, p) => t + widthAt(p, sz) + sz * 0.6, 0) <= W - sz)
    && ['left', 'right'].every((side) => parts.filter((p) => p.side === side).length * sz * 2.4 <= H - top - (blank ? sz * 2.4 : 0) - sz);
  let size = clamp(Math.min(W, H) / 26, 9, 16);
  while (size > 6 && !fits(size)) size -= 0.5;
  const bankH = blank ? size * 2.4 : 0;
  const pad = size * 0.8, boxH = size * 1.9, badge = size * 1.35;
  const labelW = (p) => widthAt(p, size);
  const colW = Math.min(maxW, Math.max(size * 5, ...parts.filter((p) => p.side === 'left' || p.side === 'right').map(labelW)));
  const left = has('left') ? colW + size * 2 : size, right = has('right') ? colW + size * 2 : size;
  const above = has('top') ? boxH + size * 1.6 : size * 0.6, below = has('bottom') ? boxH + size * 1.6 : size * 0.6;
  const avail = { x: left, y: top + above, w: W - left - right, h: H - top - above - below - bankH };
  const k = Math.min(avail.w / dg.w, avail.h / dg.h);
  const ox = avail.x + (avail.w - dg.w * k) / 2, oy = avail.y + (avail.h - dg.h * k) / 2;

  // The drawing, in the style
  const d = createKit();
  dg.draw(d, { style, seed, figure: opts.figure });
  const fx = styleWrap(style, uid, shapesToSvg(d.shapes, style, { olk: clamp(1.4 / k, 0.25, 1) }), { scale: k, w: dg.w * k, h: dg.h * k });

  // Where each label goes: columns at the sides, rows above and below
  const at = (p) => [ox + p.at[0] * k, oy + p.at[1] * k];
  const placed = [];
  for (const side of ['left', 'right']) {
    const items = parts.filter((p) => p.side === side).map((p) => ({ p, want: at(p)[1], len: boxH }));
    spread(items, top, H - bankH - size * 0.6 - boxH * 0, size * 0.5);
    for (const it of items) {
      const w = labelW(it.p);
      placed.push({ p: it.p, w, x: side === 'left' ? left - size - w : W - right + size, y: it.pos, side });
    }
  }
  for (const side of ['top', 'bottom']) {
    const items = parts.filter((p) => p.side === side).map((p) => ({ p, want: at(p)[0], len: labelW(p) }));
    spread(items, size * 0.5, W - size * 0.5, size * 0.6);
    for (const it of items) placed.push({ p: it.p, w: it.len, x: it.pos, y: side === 'top' ? top + size * 0.2 : H - bankH - boxH - size * 0.4, side });
  }

  // Leader lines from the part to its label, then the labels
  let leaders = '', boxes = '';
  // Numbers: a cycle's steps keep theirs; blank labels are numbered after them, column by column
  const steps = parts.filter((p) => p.step).length;
  let n = 0;
  for (const pl of placed) pl.num = pl.p.step ?? (numbered ? steps + ++n : null);
  for (const pl of placed) {
    const [ax, ay] = at(pl.p);
    const ex = pl.side === 'left' ? pl.x + pl.w : pl.side === 'right' ? pl.x : pl.x + pl.w / 2;
    const ey = pl.side === 'top' ? pl.y + boxH : pl.side === 'bottom' ? pl.y : pl.y + boxH / 2;
    leaders += `<line x1="${r1(ax)}" y1="${r1(ay)}" x2="${r1(ex)}" y2="${r1(ey)}" stroke="${th.line}" stroke-width="${r1(size / 10)}"/>`
      + `<circle cx="${r1(ax)}" cy="${r1(ay)}" r="${r1(size / 5)}" fill="${th.accent}" stroke="${th.box}" stroke-width="${r1(size / 14)}"/>`;
    const textX = pl.x + pad + (pl.num != null ? badge + size * 0.4 : 0);
    const badgeSvg = pl.num != null
      ? `<circle cx="${r1(pl.x + pad + badge / 2)}" cy="${r1(pl.y + boxH / 2)}" r="${r1(badge / 2)}" fill="${th.accent}"/><text x="${r1(pl.x + pad + badge / 2)}" y="${r1(pl.y + boxH / 2 + size * 0.35)}" text-anchor="middle" font-family="${FONT}" font-size="${r1(size * 0.85)}" font-weight="900" fill="${th.onAccent}">${pl.num}</text>`
      : '';
    const body = blank
      ? `<line x1="${r1(textX)}" y1="${r1(pl.y + boxH * 0.75)}" x2="${r1(pl.x + pl.w - pad)}" y2="${r1(pl.y + boxH * 0.75)}" stroke="${th.muted}" stroke-width="${r1(size / 12)}"/>`
      : (() => {
        // (a long label gets smaller, then cut short, to fit its box)
        const f = fitText(pl.p.text, { maxW: pl.x + pl.w - pad - textX, maxLines: 1, size, minSize: size * 0.7 });
        return `<text x="${r1(textX)}" y="${r1(pl.y + boxH / 2 + f.size * 0.36)}" font-family="${FONT}" font-size="${r1(f.size)}" font-weight="800" fill="${th.ink}">${esc(f.lines[0] ?? '')}</text>`;
      })();
    boxes += `<g class="pg-label" data-key="${esc(pl.p.key)}" data-text="${esc(pl.p.text)}" style="cursor: text;"><rect x="${r1(pl.x)}" y="${r1(pl.y)}" width="${r1(pl.w)}" height="${r1(boxH)}" rx="${r1(size * 0.4)}" fill="${th.box}" stroke="${th.accent}" stroke-width="${r1(size / 12)}"/>${badgeSvg}${body}</g>`;
  }

  const bank = blank ? wordBank(parts.map((p) => p.text), seed) : [];
  const bankSvg = blank
    ? `<g class="pg-word-bank"><text x="${W / 2}" y="${r1(H - bankH / 2 + size * 0.3)}" text-anchor="middle" font-family="${FONT}" font-size="${r1(size * 0.95)}" font-weight="800" fill="${th.ink}">${esc(fitText(`Word bank:  ${bank.join('  ·  ')}`, { maxW: W - size * 2, maxLines: 1, size: size * 0.95, minSize: 7 }).lines[0])}</text></g>`
    : '';
  const titleSvg = `<text x="${W / 2}" y="${r1(top * 0.68)}" text-anchor="middle" font-family="${FONT}" font-size="${r1(titleSize)}" font-weight="900" fill="${th.ink}">${esc(fitText(title, { maxW: W - size * 2, maxLines: 1, size: titleSize, minSize: 9 }).lines[0])}</text>`;
  const motion = `.pg-dg-rain { animation: pgDgRain 1.1s linear infinite; } @keyframes pgDgRain { from { transform: translateY(-3px); opacity: 0.4; } 50% { opacity: 1; } to { transform: translateY(4px); opacity: 0.2; } }
.pg-dg-steam { animation: pgDgSteam 2.4s ease-in-out infinite; } @keyframes pgDgSteam { 0% { transform: translateY(2px); opacity: 0.2; } 50% { opacity: 1; } 100% { transform: translateY(-4px); opacity: 0; } }`;
  const content = `<rect width="${W}" height="${H}" fill="${th.bg}"/>${titleSvg}`
    + `<g class="pg-diagram" data-topic="${topic}" transform="translate(${r1(ox)} ${r1(oy)}) scale(${Math.round(k * 1000) / 1000})">${fx.g}</g>`
    + `<g class="pg-labels">${leaders}${boxes}</g>${bankSvg}`;
  return {
    svg: svgDoc({ width: W, height: H, viewBox: `0 0 ${W} ${H}`, defs: fx.defs + `<style><![CDATA[${motion}]]></style>`, content, title }),
    diagram: { topic, title, blank, labels: parts.map((p) => ({ key: p.key, text: p.text, ...(p.step ? { step: p.step } : {}) })), bank },
  };
}

/**
 * A labelled picture of the things in a prompt ("a cat, a dog and a cow"): each drawn in a row
 * (or two), its name underneath - or, blank, a line to write it on and a word bank.
 * -> { svg, diagram: { topic: null, title, labels } }
 */
export function renderLabelledPictures(matches, opts = {}) {
  const { width: W = 640, height: H = 360, style = 'flat', seed = 1, blank = false } = opts;
  const numbered = blank || Boolean(opts.numbered);
  const th = themeOf(style);
  const uid = newUid();
  const things = [];
  for (const m of matches) {
    const c = getConcept(String(m.id).split('~')[0]);
    if (c && !things.some((t) => t.c.id === c.id)) things.push({ c, m });
  }
  const items = things.slice(0, 8);
  const size = clamp(Math.min(W, H) / 26, 9, 16);
  const labels = items.map(({ c }) => ({ key: c.id, label: c.label || c.id.replace(/_/g, ' ') }));
  const parts = labelTexts(labels, opts.labels);
  const title = String(opts.title || (blank ? (items.length === 1 ? 'Label the picture' : 'Label the pictures') : items.length === 1 ? parts[0]?.text ?? '' : 'Pictures and words')).slice(0, 80);
  const titleSize = clamp(W / 32, 12, 24);
  const top = titleSize * 2.1, bankH = blank ? size * 2.4 : 0;
  const boxH = size * 1.9;
  // The grid that makes the pictures biggest (one row on a wide picture, two by two on a page)
  const fit = (cols) => {
    const rows = Math.ceil(items.length / cols);
    const cellW = (W - size * 2) / cols, cellH = (H - top - bankH - size) / rows;
    return { cols, rows, cellW, pic: Math.min(cellW * 0.8, cellH - boxH - size * 1.4) };
  };
  const { cols, rows, cellW, pic } = Array.from({ length: Math.max(1, items.length) }, (_, i) => fit(i + 1)).reduce((a, b) => (b.pic > a.pic + 0.5 ? b : a));
  // (the rows sit in the middle of the space there is)
  const used = rows * (pic + boxH + size * 1.4), y1 = top + Math.max(0, (H - top - bankH - used) / 2);
  let body = '', defs = '';
  items.forEach(({ c, m }, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const cx = size + cellW * (col + 0.5), y0 = y1 + row * (pic + boxH + size * 1.4);
    const shapes = drawConcept(c, { seed: `${seed}:${c.id}:0`, style, color: m.color, expression: m.expression, animation: m.animation, view: m.view });
    const fx = styleWrap(style, `${uid}${i}`, shapesToSvg(shapes, style, { olk: clamp(240 / pic, 0.4, 1.4) }), { scale: pic / 100 });
    defs += fx.defs;
    body += `<g class="movable-item" data-id="${c.id}" data-k="0" data-label="${esc(c.label || c.id)}" transform="translate(${r1(cx - pic / 2)} ${r1(y0 + size * 0.2)}) scale(${r1(pic / 100 * 1000) / 1000})" style="cursor: grab;"><g class="pg-figure">${fx.g}</g></g>`;
    const p = parts[i], w = Math.min(cellW - size, blank ? size * 8 : textWidth(p.text, size) + size * 1.6 + (numbered ? size * 2.2 : 0));
    const lx = cx - w / 2, ly = y0 + size * 0.4 + pic;
    const badgeSvg = numbered ? `<circle cx="${r1(lx + size * 1.1)}" cy="${r1(ly + boxH / 2)}" r="${r1(size * 0.68)}" fill="${th.accent}"/><text x="${r1(lx + size * 1.1)}" y="${r1(ly + boxH / 2 + size * 0.35)}" text-anchor="middle" font-family="${FONT}" font-size="${r1(size * 0.85)}" font-weight="900" fill="${th.onAccent}">${i + 1}</text>` : '';
    const inner = blank
      ? `<line x1="${r1(lx + size * 2.2)}" y1="${r1(ly + boxH * 0.75)}" x2="${r1(lx + w - size * 0.8)}" y2="${r1(ly + boxH * 0.75)}" stroke="${th.muted}" stroke-width="${r1(size / 12)}"/>`
      : `<text x="${r1(cx + (numbered ? size * 1.1 : 0))}" y="${r1(ly + boxH / 2 + size * 0.36)}" text-anchor="middle" font-family="${FONT}" font-size="${r1(size)}" font-weight="800" fill="${th.ink}">${esc(fitText(p.text, { maxW: w - size, maxLines: 1, size, minSize: 7 }).lines[0])}</text>`;
    body += `<g class="pg-label" data-key="${esc(p.key)}" data-text="${esc(p.text)}" style="cursor: text;"><rect x="${r1(lx)}" y="${r1(ly)}" width="${r1(w)}" height="${r1(boxH)}" rx="${r1(size * 0.4)}" fill="${th.box}" stroke="${th.accent}" stroke-width="${r1(size / 12)}"/>${badgeSvg}${inner}</g>`;
  });
  const bank = blank ? wordBank(parts.map((p) => p.text), seed) : [];
  const bankSvg = blank
    ? `<g class="pg-word-bank"><text x="${W / 2}" y="${r1(H - bankH / 2 + size * 0.3)}" text-anchor="middle" font-family="${FONT}" font-size="${r1(size * 0.95)}" font-weight="800" fill="${th.ink}">${esc(fitText(`Word bank:  ${bank.join('  ·  ')}`, { maxW: W - size * 2, maxLines: 1, size: size * 0.95, minSize: 7 }).lines[0])}</text></g>`
    : '';
  const titleSvg = `<text x="${W / 2}" y="${r1(top * 0.68)}" text-anchor="middle" font-family="${FONT}" font-size="${r1(titleSize)}" font-weight="900" fill="${th.ink}">${esc(fitText(title, { maxW: W - size * 2, maxLines: 1, size: titleSize, minSize: 9 }).lines[0])}</text>`;
  return {
    svg: svgDoc({ width: W, height: H, viewBox: `0 0 ${W} ${H}`, defs, content: `<rect width="${W}" height="${H}" fill="${th.bg}"/>${titleSvg}${body}${bankSvg}`, title }),
    diagram: { topic: null, title, blank, labels: parts.map((p) => ({ key: p.key, text: p.text })), bank },
  };
}
