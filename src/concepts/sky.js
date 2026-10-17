// Sky & weather concepts (placement 'sky' or 'air').
const TAU = Math.PI * 2;

export default [
  {
    id: 'sun',
    aliases: ['sunshine', 'sunny', 'sunlight'],
    tags: ['sky', 'weather', 'day', 'hot', 'summer'],
    category: 'sky',
    placement: 'sky',
    scale: 0.9,
    colors: { main: '#fdd835', ray: '#ffb300' },
    draw(d, p) {
      const n = 12, w = 0.16;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        d.poly([
          [50 + Math.cos(a - w) * 24, 50 + Math.sin(a - w) * 24],
          [50 + Math.cos(a) * 46, 50 + Math.sin(a) * 46],
          [50 + Math.cos(a + w) * 24, 50 + Math.sin(a + w) * 24],
        ], { fill: p.c('ray') });
      }
      d.circle(50, 50, 26, { fill: p.c('main') });
      d.ellipse(41, 40, 9, 5, { kind: 'highlight', transform: 'rotate(-35 41 40)' });
    },
  },
  {
    id: 'moon',
    aliases: ['crescent', 'moonlight', 'lunar'],
    tags: ['sky', 'night', 'space'],
    category: 'sky',
    placement: 'sky',
    scale: 0.8,
    colors: { main: '#fff3b0', crater: '#f2d675' },
    draw(d, p) {
      // crescent = outer circle (50,52,r36) minus inner circle (66,40,r30)
      d.path('M47.92 16.06 A36 36 0 1 0 83.92 64.06 A30 30 0 0 1 47.92 16.06 Z', { fill: p.c('main') });
      d.circle(30, 55, 5, { fill: p.c('crater'), kind: 'accent' });
      d.circle(41, 75, 3.5, { fill: p.c('crater'), kind: 'accent' });
      d.circle(28, 38, 3, { fill: p.c('crater'), kind: 'accent' });
      d.ellipse(26, 62, 3, 9, { kind: 'highlight', transform: 'rotate(20 26 62)' });
    },
  },
  {
    id: 'cloud',
    aliases: ['clouds', 'overcast'],
    tags: ['sky', 'weather', 'day'],
    category: 'sky',
    placement: 'sky',
    scale: 0.7,
    colors: { main: '#ffffff', shadow: '#e0e0e0' },
    draw(d, p) {
      const c = p.c('main');
      d.circle(35, 55, 18, { fill: c, kind: 'body' });
      d.circle(52, 42, 22, { fill: c, kind: 'body' });
      d.circle(70, 54, 16, { fill: c, kind: 'body' });
      d.rect(34, 52, 38, 20, { fill: c, kind: 'body' });
    },
  },
  {
    id: 'star',
    aliases: ['stars', 'starlight'],
    tags: ['sky', 'night', 'space'],
    category: 'sky',
    placement: 'sky',
    scale: 0.5,
    colors: { main: '#ffee58' },
    draw(d, p) {
      const c = p.c('main');
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 38 : 16;
        const a = (i / 10) * TAU - Math.PI / 2;
        pts.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r]);
      }
      d.poly(pts, { fill: c, kind: 'body' });
    },
  },
  {
    id: 'rainbow',
    aliases: ['spectrum'],
    tags: ['sky', 'weather', 'color'],
    category: 'sky',
    placement: 'background',
    scale: 2.2,
    baseline: 96,
    colors: { r: '#e53935', o: '#fb8c00', y: '#fdd835', g: '#43a047', b: '#1e88e5', p: '#8e24aa' },
    draw(d, p) {
      const bands = [
        { c: p.c('r'), r: 46 },
        { c: p.c('o'), r: 41 },
        { c: p.c('y'), r: 36 },
        { c: p.c('g'), r: 31 },
        { c: p.c('b'), r: 26 },
        { c: p.c('p'), r: 21 },
      ];
      for (const b of bands) {
        d.path(`M${50 - b.r} 96 A${b.r} ${b.r} 0 0 1 ${50 + b.r} 96`, { kind: 'line', stroke: b.c, sw: 5.5 });
      }
    },
  },
];
