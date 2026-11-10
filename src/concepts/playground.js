// The playground: a swing, a seesaw, a sandbox, a climbing frame, a roundabout, a trampoline and a
// hammock. A swing and a seesaw move: their moving part turns around its pivot (`sway`: the pivot
// in drawing units and the motion's class), and whoever sits on them moves with it (src/scene.js).
// Sat on like a chair (`seatTop`: the seat's top; `seats`: where each sitter goes, else spread along
// `seatSpan`).
import { darken } from '../core/color.js';

const METAL = '#78909c';

export default [
  {
    id: 'swing',
    aliases: ['swings', 'swing set', 'playground swing', 'tire swing'],
    tags: ['playground', 'park', 'outdoor', 'play', 'seat', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 1.25,
    baseline: 96,
    width: 1.5,
    seatTop: 84,
    seats: [50],
    sway: { pivot: [50, 9], motion: 'swinging' },
    colors: { main: '#e53935', frame: '#1e88e5', rope: '#8d6e63' },
    palettes: { main: ['#e53935', '#fdd835', '#43a047', '#fb8c00', '#8e24aa'], frame: ['#1e88e5', '#43a047', '#e53935', '#5d4037'] },
    draw(d, p) {
      const frame = p.c('frame'), back = darken(frame, 0.22), rope = p.c('rope');
      const bar = (x1, y1, x2, y2, c, w = 5) => d.bar(x1, y1, x2, y2, w, { fill: c });
      // The legs behind (a shade darker), then the top bar and the legs in front: an A at each end
      bar(-4, 95, 6, 9, back, 4); bar(104, 95, 94, 9, back, 4);
      bar(-14, 9, 114, 9, frame, 6);
      bar(-24, 95, -8, 9, frame); bar(16, 95, 0, 9, frame);
      bar(124, 95, 108, 9, frame); bar(84, 95, 100, 9, frame);
      d.circle(-8, 9, 3.4, { fill: back, kind: 'detail' });
      d.circle(108, 9, 3.4, { fill: back, kind: 'detail' });
      // The seat on its two ropes, swinging from the bar
      d.joint(`pg-${this.sway.motion}`, this.sway.pivot, () => {
        // (from one hook on the bar, so they stay on it as they swing)
        d.line(47, 10, 34, 84, { stroke: rope, sw: 1.6, kind: 'line' });
        d.line(53, 10, 66, 84, { stroke: rope, sw: 1.6, kind: 'line' });
        d.circle(50, 10, 2.4, { fill: METAL, kind: 'detail' });
        d.rect(30, 83, 40, 6, { rx: 3, fill: p.c('main'), kind: 'body' });
      });
    },
  },
  {
    id: 'seesaw',
    aliases: ['see-saw', 'teeter-totter', 'teeter totter', 'seesaws'],
    tags: ['playground', 'park', 'outdoor', 'play', 'seat', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.45,
    baseline: 96,
    width: 2.6,
    seatTop: 60,
    seats: [-40, 140],
    sway: { pivot: [50, 64], motion: 'seesawing' },
    colors: { main: '#fdd835', base: '#e53935', handle: '#1e88e5' },
    palettes: { main: ['#fdd835', '#43a047', '#1e88e5', '#fb8c00'], base: ['#e53935', '#5d4037', '#8e24aa'] },
    draw(d, p) {
      const base = p.c('base'), handle = p.c('handle');
      // The stand in the middle
      d.poly([[30, 96], [70, 96], [56, 64], [44, 64]], { fill: base, kind: 'body' });
      d.rect(22, 92, 56, 5, { rx: 2, fill: darken(base, 0.2), kind: 'body' });
      // The plank, a seat and a handle at each end, rocking on the stand
      d.joint(`pg-${this.sway.motion}`, this.sway.pivot, () => {
        d.rect(-72, 60, 244, 9, { rx: 4, fill: p.c('main'), kind: 'body' });
        for (const x of [-40, 140]) {
          d.rect(x - 15, 56, 30, 6, { rx: 3, fill: darken(p.c('main'), 0.18), kind: 'body' });
          const hx = x < 50 ? x + 22 : x - 22;
          d.bar(hx, 60, hx, 40, 4, { fill: handle });
          d.bar(hx - 6, 40, hx + 6, 40, 4, { fill: handle });
        }
        d.circle(50, 64, 4, { fill: METAL, kind: 'detail' });
      });
    },
  },
  {
    id: 'sandbox',
    aliases: ['sandpit', 'sand pit', 'sand box', 'sandboxes'],
    tags: ['playground', 'park', 'outdoor', 'play', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.42,
    baseline: 96,
    width: 2.2,
    colors: { main: '#a1887f', sand: '#ffe082', bucket: '#e53935', spade: '#1e88e5' },
    draw(d, p) {
      const wood = p.c('main'), dark = darken(wood, 0.2), sand = p.c('sand');
      // The far side of the frame, the sand heaped inside, the near side in front
      d.rect(-50, 40, 200, 12, { rx: 3, fill: dark, kind: 'body' });
      d.path('M-46 52 Q0 30 40 46 Q80 26 146 52 L146 80 L-46 80 Z', { fill: sand, kind: 'body' });
      d.ellipse(20, 47, 12, 3, { fill: darken(sand, 0.12), kind: 'accent' });
      // A bucket and a spade in the sand
      d.path('M70 30 L92 30 L89 50 L73 50 Z', { fill: p.c('bucket'), kind: 'body' });
      d.path('M70 30 Q81 14 92 30', { stroke: darken(p.c('bucket'), 0.25), sw: 1.6, fill: 'none', kind: 'line' });
      d.bar(110, 50, 122, 18, 3, { fill: '#8d6e63' });
      d.path('M104 50 L116 54 L113 66 L101 62 Z', { fill: p.c('spade'), kind: 'body' });
      // (castle of sand)
      d.rect(-20, 36, 18, 14, { fill: darken(sand, 0.06), kind: 'body' });
      d.poly([[-22, 37], [-11, 26], [0, 37]], { fill: darken(sand, 0.06), kind: 'body' });
      d.rect(-56, 66, 212, 30, { rx: 4, fill: wood, kind: 'body' });
      d.line(-52, 81, 152, 81, { stroke: dark, sw: 1.4, kind: 'line' });
    },
  },
  {
    id: 'climbing_frame',
    aliases: ['climbing frame', 'jungle gym', 'monkey bars', 'climber', 'climbing dome', 'jungle gyms'],
    tags: ['playground', 'park', 'outdoor', 'play', 'climb', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 1.15,
    baseline: 96,
    width: 1.3,
    colors: { main: '#e53935', bars: '#fdd835', roof: '#1e88e5', wood: '#a1887f' },
    palettes: { main: ['#e53935', '#43a047', '#1e88e5', '#fb8c00'] },
    draw(d, p) {
      const post = p.c('main'), bars = p.c('bars'), wood = p.c('wood');
      // A tower: four posts, a deck, a roof; a ladder up one side and monkey bars along the top
      for (const x of [6, 46]) d.rect(x, 22, 6, 74, { rx: 2, fill: post, kind: 'body' });
      d.poly([[0, 24], [29, 4], [58, 24]], { fill: p.c('roof'), kind: 'body' });
      d.rect(4, 56, 50, 6, { rx: 2, fill: wood, kind: 'body' });
      d.bar(12, 40, 46, 40, 2.4, { fill: bars });
      // The ladder
      for (const x of [62, 78]) d.bar(x, 96, x, 56, 4, { fill: post });
      for (let y = 64; y <= 92; y += 9) d.bar(62, y, 78, y, 3, { fill: bars });
      // Monkey bars from the deck across to a post
      d.bar(52, 34, 108, 34, 4, { fill: post });
      d.bar(52, 42, 108, 42, 4, { fill: post });
      for (let x = 60; x <= 104; x += 9) d.bar(x, 34, x, 42, 2.6, { fill: bars });
      d.rect(104, 34, 6, 62, { rx: 2, fill: post, kind: 'body' });
    },
  },
  {
    id: 'roundabout',
    aliases: ['merry-go-round', 'merry go round', 'playground roundabout', 'roundabouts'],
    tags: ['playground', 'park', 'outdoor', 'play', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.55,
    baseline: 96,
    width: 1.8,
    colors: { main: '#43a047', rail: '#fdd835', base: '#78909c' },
    palettes: { main: ['#43a047', '#e53935', '#1e88e5', '#fb8c00'] },
    draw(d, p) {
      const main = p.c('main'), rail = p.c('rail');
      // The round platform seen from the side, a little from above, on its foot, with its handrails
      d.rect(42, 80, 16, 16, { fill: p.c('base'), kind: 'body' });
      d.ellipse(50, 78, 70, 12, { fill: darken(main, 0.22), kind: 'body' });
      d.ellipse(50, 72, 70, 12, { fill: main, kind: 'body' });
      d.ellipse(50, 72, 20, 4, { fill: darken(main, 0.12), kind: 'accent' });
      for (const x of [-4, 22, 78, 104]) d.bar(x, 72, x, 30, 3.5, { fill: rail });
      d.bar(-4, 30, 104, 30, 3.5, { fill: rail });
      d.bar(50, 72, 50, 22, 3.5, { fill: rail });
    },
  },
  {
    id: 'trampoline',
    aliases: ['trampolines', 'bouncy bed'],
    tags: ['playground', 'garden', 'outdoor', 'play', 'jump', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.4,
    baseline: 96,
    width: 2.6,
    colors: { main: '#1e88e5', mat: '#263238', legs: '#78909c' },
    palettes: { main: ['#1e88e5', '#43a047', '#e53935', '#fb8c00'] },
    draw(d, p) {
      const legs = p.c('legs');
      // Curved legs, the black mat seen a little from above, the padded rim around it
      for (const x of [-30, 20, 80, 130]) d.bar(x, 96, x, 50, 4, { fill: legs });
      d.ellipse(50, 46, 92, 16, { fill: p.c('main'), kind: 'body' });
      d.ellipse(50, 46, 78, 11, { fill: p.c('mat'), kind: 'body' });
      d.ellipse(30, 43, 22, 3, { kind: 'highlight', opacity: 0.25 });
    },
  },
  {
    id: 'hammock',
    aliases: ['hammocks'],
    tags: ['garden', 'beach', 'outdoor', 'rest', 'seat', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.85,
    baseline: 96,
    width: 1.9,
    seatTop: 72,
    seats: [50],
    colors: { main: '#ff7043', stripe: '#fff3e0', post: '#8d6e63' },
    palettes: { main: ['#ff7043', '#26a69a', '#5c6bc0', '#ec407a'] },
    draw(d, p) {
      const post = p.c('post');
      // Two posts and the cloth hanging between them, striped
      for (const x of [-38, 132]) d.rect(x, 8, 8, 88, { rx: 3, fill: post, kind: 'body' });
      d.line(-30, 22, 2, 56, { stroke: post, sw: 1.4, kind: 'line' });
      d.line(132, 22, 98, 56, { stroke: post, sw: 1.4, kind: 'line' });
      d.path('M0 54 Q50 96 100 54 L100 60 Q50 104 0 60 Z', { fill: p.c('main'), kind: 'body' });
      d.path('M14 64 Q50 92 86 64', { stroke: p.c('stripe'), sw: 2.4, fill: 'none', kind: 'line' });
    },
  },
];
