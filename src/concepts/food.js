// Food concepts.

export default [
  {
    id: 'apple',
    aliases: ['fruit'],
    tags: ['fruit', 'food', 'healthy'],
    category: 'food',
    placement: 'ground',
    scale: 0.22,
    baseline: 92,
    width: 0.7,
    colors: { main: '#e53935', leaf: '#43a047', stem: '#6d4c41' },
    palettes: { main: ['#e53935', '#c62828', '#7cb342', '#fdd835'] },
    draw(d, p) {
      d.path('M50 32 Q50 22 55 13', { kind: 'line', stroke: p.c('stem'), sw: 4 });
      d.path('M54 22 C58 11 72 9 79 13 C74 22 63 26 54 22 Z', { fill: p.c('leaf') });
      d.path(
        'M50 31 C40 22 17 24 16 48 C15 70 30 92 42 92 C46 92 48 90 50 90 C52 90 54 92 58 92 C70 92 85 70 84 48 C83 24 60 22 50 31 Z',
        { fill: p.c('main') },
      );
      d.ellipse(31, 50, 5, 10, { kind: 'highlight', transform: 'rotate(15 31 50)' });
    },
  },
  {
    id: 'banana',
    aliases: ['bananas'],
    tags: ['fruit', 'food', 'yellow'],
    category: 'food',
    placement: 'ground',
    scale: 0.22,
    baseline: 90,
    width: 0.75,
    colors: { main: '#fdd835', tip: '#5d4037', highlight: '#fff59d' },
    draw(d, p) {
      const yellow = p.c('main');
      const tip = p.c('tip');

      // Curved banana body
      d.path('M22 36 C34 68 62 82 82 66 C65 74 38 62 28 34 Z', { fill: yellow, kind: 'body' });
      // Tips
      d.circle(23, 34, 3, { fill: tip, kind: 'detail' });
      d.circle(82, 66, 2.5, { fill: tip, kind: 'detail' });
    },
  },
  {
    id: 'orange',
    aliases: ['citrus', 'tangerine'],
    tags: ['fruit', 'food', 'orange'],
    category: 'food',
    placement: 'ground',
    scale: 0.22,
    baseline: 92,
    width: 0.7,
    colors: { main: '#fb8c00', leaf: '#43a047', stem: '#6d4c41' },
    draw(d, p) {
      // Stem & leaf
      d.path('M50 28 Q50 18 54 12', { kind: 'line', stroke: p.c('stem'), sw: 3.5 });
      d.path('M52 18 C58 10 70 12 74 18 C68 24 58 22 52 18 Z', { fill: p.c('leaf') });
      // Round orange body
      d.circle(50, 58, 34, { fill: p.c('main'), kind: 'body' });
      d.ellipse(38, 44, 6, 8, { kind: 'highlight', transform: 'rotate(20 38 44)' });
    },
  },
  {
    id: 'cake',
    aliases: ['birthday_cake', 'pastry', 'dessert'],
    tags: ['food', 'sweet', 'party', 'birthday'],
    category: 'food',
    placement: 'ground',
    scale: 0.35,
    baseline: 92,
    width: 0.8,
    colors: { main: '#f8bbd0', frosting: '#ffffff', cherry: '#e53935', candle: '#42a5f5', flame: '#ffb300' },
    draw(d, p) {
      // Cake base
      d.rect(20, 52, 60, 40, { rx: 4, fill: p.c('main'), kind: 'body' });
      // Frosting drips
      d.path('M20 52 C26 62 30 52 36 60 C42 52 46 62 52 52 C58 62 64 52 70 60 C76 52 80 58 80 52 Z', { fill: p.c('frosting'), kind: 'body' });

      // Candle
      d.rect(47, 30, 6, 22, { rx: 1, fill: p.c('candle'), kind: 'body' });
      // Wick
      d.line(50, 30, 50, 24, { stroke: '#212121', sw: 1.5, kind: 'line' });
      // Flame
      d.path('M50 12 C44 20 47 24 50 24 C53 24 56 20 50 12 Z', { fill: p.c('flame'), kind: 'body' });
    },
  },
];
