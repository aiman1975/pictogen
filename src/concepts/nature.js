// Nature concepts.

export default [
  {
    id: 'tree',
    aliases: ['woods', 'forest'],
    tags: ['nature', 'plant', 'wood', 'outdoor'],
    category: 'nature',
    placement: 'ground',
    scale: 2.0,
    baseline: 96,
    width: 0.8,
    colors: { main: '#43a047', trunk: '#795548', highlight: '#66bb6a' },
    palettes: { main: ['#43a047', '#2e7d32', '#7cb342', '#f57c00', '#c62828'] },
    draw(d, p) {
      const foliage = p.c('main');
      const trunk = p.c('trunk');

      // Trunk
      d.path('M43 55 L41 94 Q41 96 46 96 L54 96 Q59 96 59 94 L57 55 Z', { fill: trunk, kind: 'body' });
      // Branch hint
      d.line(44, 65, 36, 58, { stroke: trunk, sw: 3, kind: 'line' });
      d.line(56, 68, 64, 60, { stroke: trunk, sw: 3, kind: 'line' });

      // Foliage layers
      d.circle(36, 46, 17, { fill: foliage, kind: 'body' });
      d.circle(64, 46, 17, { fill: foliage, kind: 'body' });
      d.circle(50, 32, 22, { fill: foliage, kind: 'body' });
      d.circle(50, 48, 19, { fill: foliage, kind: 'body' });

      // Subtle highlight
      d.ellipse(45, 26, 9, 5, { kind: 'highlight', opacity: 0.45, transform: 'rotate(-20 45 26)' });
    },
  },
  {
    id: 'neem',
    aliases: ['neem_tree', 'neem_leaf', 'nems', 'margosa'],
    tags: ['nature', 'plant', 'tree', 'leaf', 'herb', 'medicine'],
    category: 'nature',
    placement: 'ground',
    scale: 1.8,
    baseline: 96,
    width: 0.82,
    colors: { main: '#2e7d32', leaf: '#43a047', trunk: '#5d4037' },
    palettes: { main: ['#2e7d32', '#388e3c', '#1b5e20'] },
    draw(d, p) {
      const leafColor = p.c('leaf');
      const trunkColor = p.c('trunk');

      // Slender tree trunk
      d.path('M46 54 L44 95 L56 95 L54 54 Z', { fill: trunkColor, kind: 'body' });
      d.line(46, 68, 32, 56, { stroke: trunkColor, sw: 2.5, kind: 'line' });
      d.line(54, 62, 68, 52, { stroke: trunkColor, sw: 2.5, kind: 'line' });

      // Curved pinnate branch sprays with serrated-looking neem leaflets
      const drawSpray = (cx, cy, angle) => {
        d.group(`rotate(${angle} ${cx} ${cy})`, () => {
          d.line(cx, cy + 15, cx, cy - 25, { stroke: leafColor, sw: 1.8, kind: 'line' });
          for (let y = cy + 10; y >= cy - 20; y -= 7) {
            d.ellipse(cx - 7, y - 2, 6, 2.5, { fill: leafColor, kind: 'body', transform: `rotate(-30 ${cx - 7} ${y - 2})` });
            d.ellipse(cx + 7, y - 2, 6, 2.5, { fill: leafColor, kind: 'body', transform: `rotate(30 ${cx + 7} ${y - 2})` });
          }
          d.ellipse(cx, cy - 26, 5, 2, { fill: leafColor, kind: 'body', transform: `rotate(90 ${cx} ${cy - 26})` });
        });
      };

      drawSpray(36, 42, -25);
      drawSpray(64, 40, 25);
      drawSpray(50, 30, 0);
      drawSpray(40, 26, -15);
      drawSpray(60, 26, 15);
    },
  },
  {
    id: 'flower',
    aliases: ['blossom', 'rose', 'tulip', 'daisy'],
    tags: ['nature', 'plant', 'flower', 'garden', 'spring'],
    category: 'nature',
    placement: 'ground',
    scale: 0.35,
    baseline: 94,
    width: 0.6,
    colors: { main: '#ec407a', center: '#fdd835', stem: '#43a047' },
    palettes: { main: ['#ec407a', '#ab47bc', '#e53935', '#ff9800', '#29b6f6', '#ffffff'] },
    draw(d, p) {
      const petal = p.c('main');
      const stem = p.c('stem');

      // Stem
      d.path('M50 48 Q47 70 50 94', { kind: 'line', stroke: stem, sw: 3.5 });

      // Leaf on stem
      d.path('M49 70 C40 68 34 60 36 55 C44 57 48 64 49 70 Z', { fill: stem, kind: 'body' });
      d.path('M50 76 C60 74 66 66 64 61 C56 63 52 70 50 76 Z', { fill: stem, kind: 'body' });

      // Petals (5 circles arranged radially)
      const r = 13;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        d.circle(50 + Math.cos(a) * r, 42 + Math.sin(a) * r, 10, { fill: petal, kind: 'body' });
      }

      // Center
      d.circle(50, 42, 9, { fill: p.c('center'), kind: 'body' });
    },
  },
  {
    id: 'mountain',
    aliases: ['mountains', 'hill', 'hills', 'peak'],
    tags: ['nature', 'landscape', 'outdoor', 'earth'],
    category: 'nature',
    placement: 'background',
    scale: 2.6,
    baseline: 96,
    width: 0.96,
    colors: { main: '#78909c', snow: '#eceff1', back: '#90a4ae' },
    palettes: { main: ['#78909c', '#6d4c41', '#546e7a'] },
    draw(d, p) {
      const rock = p.c('main');
      const backRock = p.c('back');
      const snow = p.c('snow');

      // Left background peak
      d.poly([[4, 96], [32, 28], [60, 96]], { fill: backRock, kind: 'body' });
      d.poly([[32, 28], [40, 48], [35, 45], [30, 50], [24, 46]], { fill: snow, kind: 'body' });

      // Right main foreground peak
      d.poly([[35, 96], [68, 16], [98, 96]], { fill: rock, kind: 'body' });
      d.poly([[68, 16], [78, 42], [71, 38], [66, 44], [58, 40]], { fill: snow, kind: 'body' });
    },
  },
  {
    id: 'grass',
    aliases: ['lawn', 'turf'],
    tags: ['nature', 'ground', 'green'],
    category: 'nature',
    placement: 'ground',
    scale: 0.2,
    baseline: 96,
    width: 0.6,
    colors: { main: '#7cb342' },
    draw(d, p) {
      const g = p.c('main');
      d.poly([[30, 96], [22, 65], [36, 96]], { fill: g, kind: 'body' });
      d.poly([[42, 96], [48, 55], [52, 96]], { fill: g, kind: 'body' });
      d.poly([[58, 96], [72, 62], [66, 96]], { fill: g, kind: 'body' });
      d.poly([[46, 96], [36, 60], [42, 96]], { fill: g, kind: 'body' });
    },
  },
];
