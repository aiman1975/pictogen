// Everyday things children's stories are full of, drawn in code: at home (a lamp, stairs, a rug, a
// cushion, a blanket, a wardrobe, a towel), outside (a fence, a gate, a street lamp, a crossing, a
// bush, a bridge, a cave, a tower), in the garden and on a building site (a spade, a watering can, a
// wheelbarrow, a digger, a crane), and toys and treasures (a doll, a tricycle, chalk, a lantern, a
// treasure chest). Bars are filled shapes (d.bar), so they show in every style.
import { darken, lighten } from '../core/color.js';

const WOOD = '#a1887f';
const METAL = '#78909c';

export default [
  // ---- At home ----------------------------------------------------------------------------------
  {
    id: 'lamp',
    aliases: ['table lamp', 'floor lamp', 'reading lamp', 'lamps', 'standard lamp'],
    tags: ['furniture', 'indoor', 'room', 'home', 'light', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.95,
    baseline: 96,
    width: 0.5,
    colors: { main: '#ffb74d', pole: '#5d4037', glow: '#fff59d' },
    palettes: { main: ['#ffb74d', '#4db6ac', '#f06292', '#9575cd', '#fff8e1'] },
    draw(d, p) {
      const shade = p.c('main');
      // A floor lamp: a round foot, a pole, a shade with its light below
      d.ellipse(50, 94, 16, 4, { fill: p.c('pole'), kind: 'body' });
      d.bar(50, 94, 50, 26, 3.5, { fill: p.c('pole') });
      d.ellipse(50, 30, 14, 3, { fill: p.c('glow'), opacity: 0.8, kind: 'accent' });
      d.path('M34 30 L40 6 L60 6 L66 30 Z', { fill: shade, kind: 'body' });
      d.path('M40 6 L60 6 L61 10 L39 10 Z', { fill: darken(shade, 0.15), kind: 'accent' });
    },
  },
  {
    id: 'stairs',
    aliases: ['staircase', 'steps', 'stairway', 'stair'],
    tags: ['indoor', 'room', 'home', 'building', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 1.1,
    baseline: 96,
    width: 1.1,
    colors: { main: '#bcaaa4', rail: '#6d4c41' },
    draw(d, p) {
      const step = p.c('main'), rail = p.c('rail');
      // Six steps up to the right, their fronts darker, and a handrail
      for (let i = 0; i < 6; i++) {
        const x = 8 + i * 14, y = 96 - (i + 1) * 14;
        d.rect(x, y, 92 - x, 14, { fill: step, kind: 'body' });
        d.rect(x, y, 92 - x, 4, { fill: lighten(step, 0.25), kind: 'accent' });
      }
      for (let i = 0; i < 6; i += 2) d.bar(14 + i * 14, 82 - i * 14, 14 + i * 14, 58 - i * 14, 2.4, { fill: rail });
      d.bar(14, 58, 86, -14, 3, { fill: rail });
    },
  },
  {
    id: 'rug',
    aliases: ['carpet', 'mat', 'rugs', 'carpets', 'doormat'],
    tags: ['furniture', 'indoor', 'room', 'home', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.22,
    baseline: 96,
    width: 3.4,
    colors: { main: '#e57373', border: '#ffcc80', pattern: '#fff3e0' },
    palettes: { main: ['#e57373', '#64b5f6', '#81c784', '#ba68c8', '#ffb74d'] },
    draw(d, p) {
      // An oval rug on the floor, seen from the side: a border and a pattern
      d.ellipse(50, 70, 98, 26, { fill: p.c('border'), kind: 'body' });
      d.ellipse(50, 70, 86, 20, { fill: p.c('main'), kind: 'body' });
      d.ellipse(50, 70, 50, 11, { fill: p.c('pattern'), kind: 'accent' });
      d.ellipse(50, 70, 24, 5, { fill: darken(p.c('main'), 0.15), kind: 'accent' });
    },
  },
  {
    id: 'cushion',
    aliases: ['pillow', 'pillows', 'cushions'],
    tags: ['indoor', 'room', 'home', 'bed', 'soft', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.28,
    baseline: 94,
    width: 1,
    colors: { main: '#7986cb', pattern: '#c5cae9' },
    palettes: { main: ['#7986cb', '#f06292', '#4db6ac', '#ffd54f', '#a1887f'] },
    draw(d, p) {
      const main = p.c('main');
      // A plump square cushion with a button in the middle and its corners poking out
      d.path('M8 30 Q50 18 92 30 Q100 62 92 92 Q50 82 8 92 Q0 62 8 30 Z', { fill: main, kind: 'body' });
      d.path('M24 40 Q50 34 76 40', { stroke: p.c('pattern'), sw: 2, fill: 'none', kind: 'line' });
      d.path('M24 82 Q50 76 76 82', { stroke: p.c('pattern'), sw: 2, fill: 'none', kind: 'line' });
      d.circle(50, 60, 3.5, { fill: darken(main, 0.3), kind: 'detail' });
      d.ellipse(30, 38, 10, 4, { kind: 'highlight', opacity: 0.35 });
    },
  },
  {
    id: 'blanket',
    aliases: ['blankets', 'duvet', 'quilt', 'comforter'],
    tags: ['indoor', 'room', 'home', 'bed', 'soft', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.3,
    baseline: 96,
    width: 1.3,
    colors: { main: '#4db6ac', check: '#b2dfdb' },
    palettes: { main: ['#4db6ac', '#e57373', '#9575cd', '#ffb74d', '#64b5f6'] },
    draw(d, p) {
      const main = p.c('main'), check = p.c('check');
      // A folded blanket, checked, its fold rounded
      d.rect(4, 30, 92, 66, { rx: 10, fill: main, kind: 'body' });
      for (const x of [26, 50, 74]) d.rect(x - 4, 30, 8, 66, { fill: check, opacity: 0.6, kind: 'accent' });
      for (const y of [48, 72]) d.rect(4, y - 4, 92, 8, { fill: check, opacity: 0.6, kind: 'accent' });
      d.path('M4 40 Q4 30 14 30 L86 30 Q96 30 96 40 Q50 48 4 40 Z', { fill: darken(main, 0.15), kind: 'body' });
    },
  },
  {
    id: 'wardrobe',
    aliases: ['cupboard', 'closet', 'cabinet', 'wardrobes', 'cupboards', 'dresser'],
    tags: ['furniture', 'indoor', 'room', 'home', 'bedroom', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 1.3,
    baseline: 96,
    width: 0.8,
    colors: { main: '#bcaaa4', knob: '#ffd54f' },
    palettes: { main: ['#bcaaa4', '#90caf9', '#fff8e1', '#a5d6a7', '#ce93d8'] },
    draw(d, p) {
      const main = p.c('main'), dark = darken(main, 0.22);
      // Two tall doors, a drawer below, little feet, a top
      d.rect(16, 92, 8, 4, { fill: dark, kind: 'body' });
      d.rect(76, 92, 8, 4, { fill: dark, kind: 'body' });
      d.rect(10, 6, 80, 86, { rx: 3, fill: main, kind: 'body' });
      d.rect(6, 2, 88, 7, { rx: 2, fill: dark, kind: 'body' });
      d.rect(15, 13, 33, 56, { rx: 2, fill: lighten(main, 0.12), kind: 'body' });
      d.rect(52, 13, 33, 56, { rx: 2, fill: lighten(main, 0.12), kind: 'body' });
      d.rect(15, 74, 70, 13, { rx: 2, fill: lighten(main, 0.12), kind: 'body' });
      d.circle(44, 42, 2.4, { fill: p.c('knob'), kind: 'detail' });
      d.circle(56, 42, 2.4, { fill: p.c('knob'), kind: 'detail' });
      d.rect(44, 79, 12, 3, { rx: 1.5, fill: p.c('knob'), kind: 'detail' });
    },
  },
  {
    id: 'towel',
    aliases: ['towels', 'bath towel'],
    tags: ['indoor', 'home', 'bathroom', 'beach', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.4,
    baseline: 96,
    width: 0.7,
    colors: { main: '#4fc3f7', stripe: '#ffffff', rail: '#90a4ae' },
    palettes: { main: ['#4fc3f7', '#f06292', '#ffd54f', '#81c784', '#ba68c8'] },
    draw(d, p) {
      const main = p.c('main');
      // A towel hanging over a little stand
      d.bar(14, 96, 14, 10, 4, { fill: p.c('rail') });
      d.bar(86, 96, 86, 10, 4, { fill: p.c('rail') });
      d.bar(10, 12, 90, 12, 5, { fill: p.c('rail') });
      d.path('M20 10 L80 10 L78 80 Q50 86 22 80 Z', { fill: main, kind: 'body' });
      d.rect(22, 62, 56, 5, { fill: p.c('stripe'), kind: 'accent' });
      d.rect(22, 70, 56, 3, { fill: p.c('stripe'), kind: 'accent' });
      d.path('M20 10 L80 10 L80 18 L20 18 Z', { fill: darken(main, 0.15), kind: 'body' });
    },
  },
  // ---- Outside -----------------------------------------------------------------------------------
  {
    id: 'fence',
    aliases: ['fences', 'picket fence', 'garden fence', 'wooden fence'],
    tags: ['outdoor', 'garden', 'farm', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.45,
    baseline: 96,
    width: 3,
    colors: { main: '#e0b07a', shade: '#a1785a' },
    palettes: { main: ['#e0b07a', '#ffffff', '#bcaaa4', '#c8e6c9'] },
    draw(d, p) {
      const main = p.c('main'), shade = p.c('shade');
      // Two rails and pointed pickets in front of them
      d.rect(-48, 34, 196, 9, { fill: shade, kind: 'body' });
      d.rect(-48, 70, 196, 9, { fill: shade, kind: 'body' });
      for (let x = -46; x <= 136; x += 20) d.path(`M${x} 96 L${x} 16 L${x + 6} 6 L${x + 12} 16 L${x + 12} 96 Z`, { fill: main, kind: 'body' });
    },
  },
  {
    id: 'gate',
    aliases: ['gates', 'garden gate', 'wooden gate'],
    tags: ['outdoor', 'garden', 'farm', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.6,
    baseline: 96,
    width: 1.2,
    colors: { main: '#8d6e63', post: '#5d4037' },
    palettes: { main: ['#8d6e63', '#ffffff', '#43a047', '#1e88e5'] },
    draw(d, p) {
      const main = p.c('main'), post = p.c('post');
      // Two posts with round tops, and the gate between them: bars and a brace
      for (const x of [-4, 92]) { d.rect(x, 8, 12, 88, { fill: post, kind: 'body' }); d.circle(x + 6, 8, 7, { fill: post, kind: 'body' }); }
      d.rect(10, 20, 80, 8, { fill: main, kind: 'body' });
      d.rect(10, 78, 80, 8, { fill: main, kind: 'body' });
      for (const x of [16, 34, 52, 70]) d.rect(x, 20, 8, 66, { fill: lighten(main, 0.1), kind: 'body' });
      d.bar(16, 82, 84, 24, 7, { fill: darken(main, 0.12) });
      d.circle(84, 52, 3, { fill: METAL, kind: 'detail' });
    },
  },
  {
    id: 'street_lamp',
    aliases: ['street lamp', 'lamppost', 'lamp post', 'street light', 'streetlight', 'lampposts', 'street lamps'],
    tags: ['outdoor', 'city', 'street', 'park', 'light', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 2,
    baseline: 96,
    width: 0.45,
    colors: { main: '#37474f', glow: '#fff59d' },
    draw(d, p) {
      const main = p.c('main');
      // A lamp post: a foot, a pole and a lantern on top, glowing
      d.path('M40 96 L44 84 L56 84 L60 96 Z', { fill: main, kind: 'body' });
      d.bar(50, 86, 50, 22, 4, { fill: main });
      d.circle(50, 14, 14, { fill: p.c('glow'), opacity: 0.35, kind: 'accent' });
      d.path('M42 22 L58 22 L62 8 L38 8 Z', { fill: p.c('glow'), kind: 'body' });
      d.path('M36 8 L64 8 L50 0 Z', { fill: main, kind: 'body' });
      d.rect(40, 21, 20, 4, { rx: 1, fill: main, kind: 'body' });
    },
  },
  {
    id: 'crosswalk',
    aliases: ['zebra crossing', 'pedestrian crossing', 'crossing', 'crosswalks'],
    tags: ['outdoor', 'city', 'street', 'road', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.2,
    baseline: 96,
    width: 4.2,
    colors: { main: '#ffffff', road: '#546e7a' },
    draw(d, p) {
      // A piece of road with white stripes across it, seen low from the side
      d.path('M-90 40 L190 40 L200 96 L-100 96 Z', { fill: p.c('road'), kind: 'body' });
      for (let i = 0; i < 7; i++) {
        const x = -70 + i * 38;
        d.path(`M${x} 46 L${x + 22} 46 L${x + 26} 90 L${x - 4} 90 Z`, { fill: p.c('main'), kind: 'body' });
      }
    },
  },
  {
    id: 'bush',
    aliases: ['bushes', 'shrub', 'shrubs', 'hedge', 'hedges'],
    tags: ['plant', 'nature', 'garden', 'park', 'outdoor'],
    category: 'nature',
    placement: 'ground',
    scale: 0.55,
    baseline: 96,
    width: 1.4,
    colors: { main: '#43a047', light: '#66bb6a', berry: '#e53935' },
    draw(d, p) {
      const main = p.c('main'), light = p.c('light');
      // Round clumps of leaves, lighter at the top, with a few berries
      d.ellipse(50, 80, 54, 18, { fill: darken(main, 0.12), kind: 'body' });
      for (const [x, y, r] of [[14, 66, 22], [42, 52, 28], [74, 58, 25], [96, 72, 18], [0, 80, 16]]) d.circle(x, y, r, { fill: main, kind: 'body' });
      for (const [x, y, r] of [[38, 42, 12], [70, 48, 10], [12, 58, 8]]) d.circle(x, y, r, { fill: light, kind: 'accent' });
      for (const [x, y] of [[26, 68], [58, 60], [84, 70], [46, 78]]) d.circle(x, y, 2.6, { fill: p.c('berry'), kind: 'detail' });
    },
  },
  {
    id: 'bridge',
    aliases: ['bridges', 'footbridge', 'stone bridge'],
    tags: ['outdoor', 'river', 'building', 'structure', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.85,
    baseline: 96,
    width: 2.7,
    colors: { main: '#bcaaa4', water: '#4fc3f7', rail: '#8d6e63' },
    draw(d, p) {
      const stone = p.c('main');
      // Water under it, then a stone arch with a rail along the top
      d.rect(-80, 80, 260, 16, { fill: p.c('water'), kind: 'body' });
      d.path('M-80 40 L180 40 L180 96 L150 96 Q140 50 50 50 Q-40 50 -50 96 L-80 96 Z', { fill: stone, kind: 'body' });
      d.path('M-50 96 Q-40 50 50 50 Q140 50 150 96', { stroke: darken(stone, 0.25), sw: 2, fill: 'none', kind: 'line' });
      d.rect(-82, 34, 264, 8, { rx: 2, fill: darken(stone, 0.15), kind: 'body' });
      d.bar(-80, 16, 180, 16, 4, { fill: p.c('rail') });
      for (let x = -76; x <= 176; x += 28) d.bar(x, 16, x, 34, 3.4, { fill: p.c('rail') });
    },
  },
  {
    id: 'cave',
    aliases: ['caves', 'cavern', 'grotto'],
    tags: ['nature', 'outdoor', 'rock', 'adventure', 'object'],
    category: 'nature',
    placement: 'ground',
    scale: 1.5,
    baseline: 96,
    width: 1.6,
    colors: { main: '#90a4ae', dark: '#263238' },
    draw(d, p) {
      const rock = p.c('main');
      // A big rock with a dark way in, and moss on it
      d.path('M-26 96 Q-30 40 10 18 Q50 -4 90 14 Q128 34 126 96 Z', { fill: rock, kind: 'body' });
      d.path('M10 30 Q40 18 70 26', { stroke: lighten(rock, 0.25), sw: 3, fill: 'none', kind: 'line' });
      d.path('M18 96 Q16 50 50 44 Q84 50 82 96 Z', { fill: p.c('dark'), kind: 'detail' });
      d.ellipse(100, 30, 14, 6, { fill: '#7cb342', kind: 'accent' });
      d.ellipse(-6, 70, 10, 5, { fill: '#7cb342', kind: 'accent' });
    },
  },
  {
    id: 'tower',
    aliases: ['towers', 'stone tower', 'castle tower'],
    tags: ['building', 'castle', 'outdoor', 'structure', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 2.6,
    baseline: 96,
    width: 0.5,
    colors: { main: '#b0bec5', roof: '#5c6bc0', window: '#37474f', flag: '#e53935' },
    draw(d, p) {
      const stone = p.c('main');
      // A round stone tower: battlements, a pointed roof with a flag, windows, a door
      d.rect(32, 34, 36, 62, { fill: stone, kind: 'body' });
      d.rect(28, 26, 44, 10, { fill: darken(stone, 0.1), kind: 'body' });
      for (const x of [28, 40, 52, 64]) d.rect(x, 22, 8, 6, { fill: darken(stone, 0.1), kind: 'body' });
      d.poly([[26, 24], [50, 2], [74, 24]], { fill: p.c('roof'), kind: 'body' });
      d.bar(50, 2, 50, -8, 1.4, { fill: '#5d4037' });
      d.poly([[50, -8], [60, -5], [50, -2]], { fill: p.c('flag'), kind: 'body' });
      d.path('M45 50 Q50 44 55 50 L55 58 L45 58 Z', { fill: p.c('window'), kind: 'detail' });
      d.path('M42 96 L42 82 Q50 72 58 82 L58 96 Z', { fill: '#5d4037', kind: 'body' });
      for (const [x, y] of [[36, 44], [60, 66], [38, 74]]) d.rect(x, y, 7, 3, { fill: darken(stone, 0.15), kind: 'accent' });
    },
  },
  // ---- Garden and building site ------------------------------------------------------------------
  {
    id: 'spade',
    aliases: ['shovel', 'shovels', 'spades', 'garden spade'],
    tags: ['garden', 'tool', 'dig', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.75,
    baseline: 96,
    width: 0.35,
    colors: { main: '#78909c', handle: '#a1887f', grip: '#e53935' },
    draw(d, p) {
      // Standing up: the blade in the ground, the handle with a grip at the top
      d.path('M38 96 L36 70 Q50 64 64 70 L62 96 Z', { fill: p.c('main'), kind: 'body' });
      d.bar(50, 68, 50, 12, 5, { fill: p.c('handle') });
      d.path('M40 12 L60 12 L60 4 L40 4 Z', { fill: p.c('grip'), kind: 'body' });
    },
  },
  {
    id: 'watering_can',
    aliases: ['watering can', 'watering cans', 'watering-can'],
    tags: ['garden', 'tool', 'water', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.32,
    baseline: 94,
    width: 1.1,
    colors: { main: '#43a047', rose: '#2e7d32' },
    palettes: { main: ['#43a047', '#1e88e5', '#e53935', '#fb8c00'] },
    draw(d, p) {
      const main = p.c('main'), dark = p.c('rose');
      // A round can, its long spout with the rose at the end, a handle over the top
      d.path('M60 60 L96 26', { stroke: main, sw: 7, fill: 'none', kind: 'line' });
      d.bar(60, 62, 94, 28, 7, { fill: main });
      d.path('M90 20 L102 32 L96 36 L86 26 Z', { fill: dark, kind: 'body' });
      d.path('M14 94 L12 40 Q40 30 68 40 L66 94 Z', { fill: main, kind: 'body' });
      d.path('M18 40 Q40 4 62 40', { stroke: dark, sw: 5, fill: 'none', kind: 'line' });
      d.ellipse(40, 40, 28, 5, { fill: dark, kind: 'body' });
      d.ellipse(28, 60, 5, 14, { kind: 'highlight', opacity: 0.3 });
    },
  },
  {
    id: 'wheelbarrow',
    aliases: ['wheelbarrows', 'barrow'],
    tags: ['garden', 'tool', 'farm', 'building', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.55,
    baseline: 96,
    width: 1.5,
    colors: { main: '#e53935', wheel: '#37474f', handle: '#8d6e63' },
    palettes: { main: ['#e53935', '#43a047', '#1e88e5', '#fb8c00'] },
    draw(d, p) {
      const main = p.c('main');
      // Facing right: the handles behind, the tub, the leg, the wheel at the front
      d.bar(-14, 40, 70, 62, 4, { fill: p.c('handle') });
      d.bar(20, 66, 14, 94, 4, { fill: METAL });
      d.path('M14 36 L104 36 L86 70 L30 70 Z', { fill: main, kind: 'body' });
      d.rect(10, 32, 98, 7, { rx: 3, fill: darken(main, 0.2), kind: 'body' });
      d.circle(84, 80, 15, { fill: p.c('wheel'), kind: 'body' });
      d.circle(84, 80, 5, { fill: METAL, kind: 'detail' });
    },
  },
  {
    id: 'digger',
    aliases: ['excavator', 'diggers', 'excavators', 'bulldozer', 'backhoe'],
    tags: ['vehicle', 'building', 'construction', 'machine'],
    category: 'vehicles',
    placement: 'ground',
    scale: 1.1,
    baseline: 96,
    width: 1.3,
    colors: { main: '#fbc02d', track: '#37474f', window: '#b3e5fc', arm: '#f9a825' },
    draw(d, p) {
      const main = p.c('main'), arm = p.c('arm'), dark = darken(main, 0.25);
      // Facing right: the tracks, the body with its cab, the arm and the bucket
      d.rect(-6, 78, 76, 18, { rx: 9, fill: p.c('track'), kind: 'body' });
      for (const x of [4, 20, 36, 52, 62]) d.circle(x, 87, 5, { fill: METAL, kind: 'detail' });
      d.rect(-4, 56, 70, 24, { rx: 3, fill: main, kind: 'body' });
      d.rect(30, 22, 34, 38, { rx: 3, fill: main, kind: 'body' });
      d.rect(36, 28, 22, 20, { rx: 2, fill: p.c('window'), kind: 'body' });
      d.rect(-4, 62, 30, 6, { fill: dark, kind: 'accent' });
      d.bar(60, 52, 92, 18, 9, { fill: arm });
      d.bar(92, 18, 108, 58, 7, { fill: arm });
      d.path('M100 54 L122 58 L116 80 L96 70 Z', { fill: dark, kind: 'body' });
      d.circle(92, 18, 3.5, { fill: dark, kind: 'detail' });
    },
  },
  {
    id: 'crane',
    aliases: ['cranes', 'tower crane', 'building crane', 'construction crane'],
    tags: ['building', 'construction', 'machine', 'city', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 3,
    baseline: 96,
    width: 0.9,
    colors: { main: '#fbc02d', cab: '#e53935', hook: '#37474f' },
    draw(d, p) {
      const main = p.c('main');
      // A tower crane: the lattice mast, the jib along the top with its counterweight, the hook
      d.rect(36, 90, 20, 6, { fill: '#78909c', kind: 'body' });
      d.bar(40, 92, 40, 12, 3, { fill: main });
      d.bar(52, 92, 52, 12, 3, { fill: main });
      for (let y = 88; y > 14; y -= 10) d.bar(40, y, 52, y - 10, 1.8, { fill: main });
      d.bar(14, 10, 104, 10, 3.5, { fill: main });
      d.bar(14, 16, 104, 10, 2, { fill: main });
      d.bar(46, 2, 46, 12, 3, { fill: main });
      d.rect(6, 10, 12, 10, { fill: '#78909c', kind: 'body' });
      d.rect(52, 12, 10, 8, { rx: 1, fill: p.c('cab'), kind: 'body' });
      d.line(92, 11, 92, 50, { stroke: p.c('hook'), sw: 0.8, kind: 'line' });
      d.path('M90 50 L94 50 L94 54 Q94 58 90 58', { stroke: p.c('hook'), sw: 1.6, fill: 'none', kind: 'line' });
    },
  },
  // ---- Toys and treasures ------------------------------------------------------------------------
  {
    id: 'doll',
    aliases: ['dolls', 'rag doll', 'baby doll', 'dolly'],
    tags: ['toy', 'play', 'home', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.3,
    baseline: 96,
    width: 0.6,
    colors: { main: '#f06292', hair: '#ff8a65', skin: '#ffe0b2' },
    palettes: { main: ['#f06292', '#64b5f6', '#ffd54f', '#81c784', '#ba68c8'] },
    draw(d, p) {
      const main = p.c('main'), skin = p.c('skin'), hair = p.c('hair');
      // Sitting: legs out front, a dress, round head with yarn hair in bunches, button eyes
      d.rect(32, 82, 12, 14, { rx: 6, fill: skin, kind: 'body' });
      d.rect(56, 82, 12, 14, { rx: 6, fill: skin, kind: 'body' });
      d.path('M30 86 L36 46 L64 46 L70 86 Z', { fill: main, kind: 'body' });
      d.rect(22, 48, 10, 26, { rx: 5, fill: skin, kind: 'body' });
      d.rect(68, 48, 10, 26, { rx: 5, fill: skin, kind: 'body' });
      d.circle(22, 26, 9, { fill: hair, kind: 'body' });
      d.circle(78, 26, 9, { fill: hair, kind: 'body' });
      d.circle(50, 28, 20, { fill: skin, kind: 'body' });
      d.path('M30 24 Q50 2 70 24 Q50 16 30 24 Z', { fill: hair, kind: 'body' });
      d.circle(43, 29, 2.4, { fill: '#263238', kind: 'detail' });
      d.circle(57, 29, 2.4, { fill: '#263238', kind: 'detail' });
      d.path('M44 37 Q50 41 56 37', { stroke: '#c62828', sw: 1.6, fill: 'none', kind: 'line' });
      d.circle(38, 35, 3, { fill: '#f48fb1', opacity: 0.6, kind: 'accent' });
      d.circle(62, 35, 3, { fill: '#f48fb1', opacity: 0.6, kind: 'accent' });
    },
  },
  {
    id: 'tricycle',
    aliases: ['tricycles', 'trike', 'trikes'],
    tags: ['vehicle', 'toy', 'ride', 'play'],
    category: 'vehicles',
    placement: 'ground',
    scale: 0.55,
    baseline: 95,
    width: 0.95,
    // Facing right, like a bike: hips on the saddle
    saddle: [36, 46],
    grip: [70, 30],
    colors: { main: '#e53935', wheel: '#37474f', rim: '#eceff1', seat: '#263238' },
    palettes: { main: ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa'] },
    draw(d, p) {
      const frame = p.c('main');
      // The big front wheel with pedals, two small back wheels, the frame, a saddle and handlebar
      for (const cx of [14, 30]) { d.circle(cx, 84, 11, { fill: p.c('wheel'), kind: 'body' }); d.circle(cx, 84, 6, { fill: p.c('rim'), kind: 'detail' }); }
      d.bar(14, 84, 34, 84, 4, { fill: frame });
      d.bar(30, 82, 40, 52, 5, { fill: frame });
      d.bar(40, 54, 72, 62, 5, { fill: frame });
      d.circle(72, 72, 22, { fill: p.c('wheel'), kind: 'body' });
      d.circle(72, 72, 16, { fill: p.c('rim'), kind: 'detail' });
      d.circle(72, 72, 4, { fill: METAL, kind: 'detail' });
      d.bar(72, 72, 78, 82, 2.4, { fill: METAL });
      d.bar(72, 64, 68, 32, 4, { fill: frame });
      d.bar(60, 32, 78, 28, 4, { fill: p.c('seat') });
      d.path('M26 46 Q36 40 46 45 Q44 50 34 49 Z', { fill: p.c('seat'), kind: 'body' });
    },
  },
  {
    id: 'stroller',
    aliases: ['strollers', 'pram', 'prams', 'pushchair', 'pushchairs', 'baby buggy', 'buggy', 'baby carriage'],
    tags: ['baby', 'family', 'park', 'street', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.85,
    baseline: 96,
    width: 1,
    colors: { main: '#5c6bc0', hood: '#3949ab', wheel: '#37474f', handle: '#455a64' },
    palettes: { main: ['#5c6bc0', '#ec407a', '#26a69a', '#8d6e63', '#78909c'] },
    draw(d, p) {
      const main = p.c('main');
      // Facing right: the handle behind, the hood over the round body, the frame and four wheels
      d.bar(10, 20, 26, 58, 4, { fill: p.c('handle') });
      d.bar(4, 20, 16, 20, 5, { fill: p.c('handle') });
      d.bar(30, 70, 22, 86, 3, { fill: METAL });
      d.bar(70, 70, 78, 86, 3, { fill: METAL });
      d.path('M22 46 L92 46 Q92 78 58 78 L40 78 Q22 78 22 46 Z', { fill: main, kind: 'body' });
      d.path('M22 46 Q24 12 60 14 L60 46 Z', { fill: p.c('hood'), kind: 'body' });
      d.path('M30 20 L60 46 M40 15 L60 46', { stroke: lighten(p.c('hood'), 0.25), sw: 1.4, fill: 'none', kind: 'line' });
      for (const x of [22, 78]) { d.circle(x, 87, 9, { fill: p.c('wheel'), kind: 'body' }); d.circle(x, 87, 3, { fill: METAL, kind: 'detail' }); }
    },
  },
  {
    id: 'chalk',
    aliases: ['chalks', 'sidewalk chalk', 'pavement chalk', 'piece of chalk'],
    tags: ['toy', 'school', 'draw', 'play', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.12,
    baseline: 92,
    width: 1.4,
    draw(d) {
      // Three thick sticks of chalk lying down, in colours
      const sticks = [['#f06292', 6, 70, -8], ['#4fc3f7', 30, 78, 6], ['#ffee58', 56, 66, -3]];
      for (const [c, x, y, r] of sticks) {
        d.group(`rotate(${r} ${x + 20} ${y})`, () => {
          d.rect(x, y - 9, 40, 18, { rx: 8, fill: c, kind: 'body' });
          d.ellipse(x + 38, y, 4, 9, { fill: lighten(c, 0.35), kind: 'accent' });
        });
      }
    },
  },
  {
    id: 'lantern',
    aliases: ['lanterns', 'paper lantern', 'lantern on a stick'],
    tags: ['light', 'night', 'festival', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.6,
    baseline: 96,
    width: 0.8,
    colors: { main: '#ff7043', glow: '#ffe082', stick: '#8d6e63' },
    palettes: { main: ['#ff7043', '#ab47bc', '#26c6da', '#ffca28', '#66bb6a'] },
    draw(d, p) {
      const main = p.c('main');
      // A round paper lantern hanging from a stick, glowing, with folds
      d.bar(8, 96, 64, 6, 3, { fill: p.c('stick') });
      d.line(56, 10, 56, 30, { stroke: '#37474f', sw: 1, kind: 'line' });
      d.circle(56, 52, 30, { fill: p.c('glow'), opacity: 0.35, kind: 'accent' });
      d.ellipse(56, 52, 24, 22, { fill: main, kind: 'body' });
      d.ellipse(56, 52, 14, 14, { fill: p.c('glow'), opacity: 0.8, kind: 'accent' });
      for (const y of [40, 52, 64]) d.path(`M34 ${y} Q56 ${y + 4} 78 ${y}`, { stroke: darken(main, 0.2), sw: 1.2, fill: 'none', kind: 'line' });
      d.rect(46, 28, 20, 4, { rx: 1, fill: darken(main, 0.3), kind: 'body' });
      d.rect(46, 72, 20, 4, { rx: 1, fill: darken(main, 0.3), kind: 'body' });
    },
  },
  {
    id: 'treasure_chest',
    aliases: ['treasure chest', 'treasure', 'treasures', 'treasure box', 'chest of gold', 'pirate chest'],
    tags: ['pirate', 'treasure', 'adventure', 'valuable', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.4,
    baseline: 96,
    width: 1.2,
    colors: { main: '#8d6e63', band: '#ffca28', gold: '#ffd54f', gem: '#e53935' },
    draw(d, p) {
      const wood = p.c('main'), band = p.c('band');
      // An open chest: the lid tipped back, gold and a gem heaped inside, metal bands, a lock
      d.path('M10 34 Q50 4 90 34 L90 40 L10 40 Z', { fill: darken(wood, 0.2), kind: 'body' });
      for (const [x, y, r] of [[30, 46, 9], [46, 42, 10], [62, 44, 9], [76, 48, 7], [22, 50, 6]]) d.circle(x, y, r, { fill: p.c('gold'), kind: 'body' });
      d.poly([[54, 36], [60, 30], [66, 36], [60, 44]], { fill: p.c('gem'), kind: 'body' });
      d.circle(38, 40, 2, { kind: 'highlight', opacity: 0.8 });
      d.rect(8, 50, 84, 46, { rx: 3, fill: wood, kind: 'body' });
      for (const x of [18, 76]) d.rect(x, 50, 6, 46, { fill: band, kind: 'body' });
      d.rect(8, 50, 84, 6, { fill: band, kind: 'body' });
      d.rect(44, 60, 12, 14, { rx: 2, fill: band, kind: 'body' });
      d.circle(50, 66, 2, { fill: '#263238', kind: 'detail' });
    },
  },
];
