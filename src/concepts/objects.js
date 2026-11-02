// Objects concepts.
import { darken } from '../core/color.js';

export default [
  {
    id: 'house',
    aliases: ['home', 'cottage', 'cabin'],
    tags: ['building', 'home', 'structure', 'outdoor'],
    category: 'objects',
    placement: 'ground',
    scale: 1.9,
    baseline: 96,
    width: 0.9,
    colors: { wall: '#fff9c4', roof: '#e53935', door: '#795548', window: '#81d4fa' },
    palettes: { roof: ['#e53935', '#5d4037', '#1565c0', '#37474f'] },
    draw(d, p) {
      // Main wall
      d.rect(20, 45, 60, 50, { fill: p.c('wall'), kind: 'body' });
      // Triangle Roof
      d.poly([[12, 45], [50, 16], [88, 45]], { fill: p.c('roof'), kind: 'body' });
      // Chimney
      d.rect(66, 20, 8, 16, { fill: '#b0bec5', kind: 'body' });

      // Door
      d.rect(42, 65, 16, 30, { rx: 1, fill: p.c('door'), kind: 'body' });
      d.circle(54, 80, 1.5, { fill: '#ffd54f', kind: 'detail' });

      // Windows
      d.rect(26, 56, 12, 12, { rx: 1, fill: p.c('window'), kind: 'body' });
      d.line(32, 56, 32, 68, { stroke: '#ffffff', sw: 1.2, kind: 'line' });
      d.line(26, 62, 38, 62, { stroke: '#ffffff', sw: 1.2, kind: 'line' });

      d.rect(62, 56, 12, 12, { rx: 1, fill: p.c('window'), kind: 'body' });
      d.line(68, 56, 68, 68, { stroke: '#ffffff', sw: 1.2, kind: 'line' });
      d.line(62, 62, 74, 62, { stroke: '#ffffff', sw: 1.2, kind: 'line' });
    },
  },
  {
    id: 'ball',
    aliases: ['football', 'soccer', 'basketball'],
    tags: ['toy', 'sport', 'game', 'play'],
    category: 'objects',
    placement: 'ground',
    scale: 0.28,
    baseline: 94,
    width: 0.6,
    colors: { main: '#e53935', stripe: '#ffffff' },
    palettes: { main: ['#e53935', '#1e88e5', '#fb8c00', '#43a047', '#8e24aa'] },
    draw(d, p) {
      d.circle(50, 50, 42, { fill: p.c('main'), kind: 'body' });
      // Curved stripes (beach ball style)
      d.path('M50 8 C30 25 30 75 50 92 C40 75 40 25 50 8 Z', { fill: p.c('stripe'), kind: 'accent' });
      d.path('M50 8 C70 25 70 75 50 92 C60 75 60 25 50 8 Z', { fill: p.c('stripe'), kind: 'accent' });
      d.ellipse(36, 30, 8, 5, { kind: 'highlight', opacity: 0.5, transform: 'rotate(-30 36 30)' });
    },
  },
  {
    id: 'book',
    aliases: ['notebook', 'textbook'],
    tags: ['object', 'school', 'learn', 'read'],
    category: 'objects',
    placement: 'ground',
    scale: 0.3,
    baseline: 92,
    width: 0.75,
    colors: { main: '#1e88e5', page: '#ffffff', bookmark: '#e53935' },
    palettes: { main: ['#1e88e5', '#e53935', '#43a047', '#8e24aa', '#fb8c00'] },
    draw(d, p) {
      const cover = p.c('main');
      // Pages block
      d.rect(22, 28, 56, 44, { rx: 3, fill: p.c('page'), kind: 'body' });
      // Cover spine & flaps
      d.path('M18 24 L76 24 Q80 24 80 28 L80 74 L18 74 Z', { fill: cover, kind: 'body' });
      d.rect(16, 24, 8, 50, { rx: 2, fill: cover, kind: 'body' });
      // Page edges hint
      d.line(26, 32, 74, 32, { stroke: '#e0e0e0', sw: 1.5, kind: 'line' });
      d.line(26, 70, 74, 70, { stroke: '#e0e0e0', sw: 1.5, kind: 'line' });
      // Bookmark ribbon
      d.poly([[50, 24], [56, 24], [56, 48], [53, 44], [50, 48]], { fill: p.c('bookmark'), kind: 'body' });
    },
  },
  {
    id: 'gem',
    aliases: ['gems', 'jewel', 'crystal', 'diamond'],
    tags: ['object', 'valuable', 'treasure', 'shiny'],
    category: 'objects',
    placement: 'ground',
    scale: 0.28,
    baseline: 92,
    width: 0.75,
    colors: { main: '#00e5ff', top: '#84ffff', dark: '#00b0ff' },
    palettes: { main: ['#00e5ff', '#e040fb', '#76ff03', '#ff1744', '#ffd600'] },
    draw(d, p) {
      const main = p.c('main');
      // Brilliant cut polygon facets
      d.poly([[20, 38], [80, 38], [50, 88]], { fill: main, kind: 'body' });
      d.poly([[20, 38], [35, 18], [65, 18], [80, 38]], { fill: p.c('top'), kind: 'body' });
      // Facet triangles
      d.poly([[35, 18], [65, 18], [50, 38]], { fill: '#ffffff', opacity: 0.6, kind: 'body' });
      d.poly([[20, 38], [50, 38], [50, 88]], { fill: p.c('dark'), opacity: 0.35, kind: 'body' });
      d.ellipse(32, 34, 4, 3, { kind: 'highlight', opacity: 0.7 });
    },
  },
  {
    id: 'pencil',
    aliases: ['pen', 'crayon'],
    tags: ['object', 'school', 'write', 'draw'],
    category: 'objects',
    placement: 'ground',
    scale: 0.3,
    baseline: 92,
    width: 0.75,
    colors: { main: '#fdd835', wood: '#ffcc80', lead: '#212121', eraser: '#f48fb1', metal: '#b0bec5' },
    draw(d, p) {
      // Pencil tilted 45 deg
      d.group('rotate(-45 50 50)', () => {
        // Eraser & band
        d.rect(30, 44, 8, 12, { rx: 2, fill: p.c('eraser'), kind: 'body' });
        d.rect(37, 44, 4, 12, { fill: p.c('metal'), kind: 'body' });
        // Body
        d.rect(41, 44, 34, 12, { fill: p.c('main'), kind: 'body' });
        // Wood cone tip
        d.poly([[75, 44], [87, 50], [75, 56]], { fill: p.c('wood'), kind: 'body' });
        // Lead tip
        d.poly([[83, 48], [87, 50], [83, 52]], { fill: p.c('lead'), kind: 'detail' });
      });
    },
  },
  {
    id: 'chair',
    aliases: ['seat', 'stool', 'armchair'],
    tags: ['furniture', 'indoor', 'room', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.75,
    baseline: 96,
    width: 1.1,
    // The seat's top, for someone sitting on it (src/scene.js)
    seatTop: 59,
    colors: { main: '#ef5350', wood: '#b07a45', woodDark: '#7b4f2a' },
    palettes: { main: ['#ef5350', '#42a5f5', '#66bb6a', '#ffca28', '#ab47bc'] },
    draw(d, p) {
      const wood = p.c('wood'), dark = p.c('woodDark'), main = p.c('main');
      // The back legs, further away, under the seat
      d.rect(9, 70, 6, 22, { fill: dark, rx: 2, kind: 'body' });
      d.rect(85, 70, 6, 22, { fill: dark, rx: 2, kind: 'body' });
      // The back: two posts, a rounded top rail and two slats
      d.rect(6, 6, 9, 62, { fill: wood, rx: 3, kind: 'body' });
      d.rect(85, 6, 9, 62, { fill: wood, rx: 3, kind: 'body' });
      d.rect(4, 2, 92, 14, { fill: wood, rx: 7, kind: 'body' });
      d.rect(15, 24, 70, 7, { fill: dark, rx: 3, kind: 'detail' });
      d.rect(15, 38, 70, 7, { fill: dark, rx: 3, kind: 'detail' });
      // The seat and its cushion
      d.rect(-6, 64, 112, 10, { fill: wood, rx: 4, kind: 'body' });
      d.rect(-2, 57, 104, 10, { fill: main, rx: 5, kind: 'body' });
      // The front legs
      d.rect(-3, 72, 9, 24, { fill: wood, rx: 2, kind: 'body' });
      d.rect(94, 72, 9, 24, { fill: wood, rx: 2, kind: 'body' });
    },
  },
  {
    id: 'bench',
    aliases: ['park bench', 'pew'],
    tags: ['park', 'outdoor', 'seat', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.7,
    baseline: 96,
    width: 1.9,
    seatTop: 60,
    seatSpan: [-30, 130],
    colors: { main: '#b5713c', iron: '#37474f' },
    palettes: { main: ['#b5713c', '#8d6e63', '#43a047', '#1e88e5'] },
    draw(d, p) {
      const wood = p.c('main'), iron = p.c('iron'), dark = darken(wood, 0.2);
      // Iron sides: legs and the posts holding the back
      for (const x of [-34, 126]) {
        d.rect(x, 14, 8, 82, { fill: iron, rx: 3, kind: 'body' });
        d.rect(x + 6, 66, 6, 28, { fill: iron, rx: 2, kind: 'body' });
      }
      // Back slats and seat slats
      d.rect(-40, 16, 180, 10, { fill: wood, rx: 4, kind: 'body' });
      d.rect(-40, 31, 180, 10, { fill: wood, rx: 4, kind: 'body' });
      d.rect(-44, 60, 188, 8, { fill: wood, rx: 3, kind: 'body' });
      d.rect(-44, 69, 188, 6, { fill: dark, rx: 3, kind: 'detail' });
    },
  },
  {
    id: 'sofa',
    aliases: ['couch', 'settee', 'sofas', 'couches'],
    tags: ['furniture', 'indoor', 'room', 'home', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.75,
    baseline: 96,
    width: 1.8,
    seatTop: 57,
    seatSpan: [-14, 114],
    colors: { main: '#5c6bc0', cushion: '#7986cb', feet: '#4e342e' },
    palettes: { main: ['#5c6bc0', '#26a69a', '#ef5350', '#8d6e63', '#ffb300'] },
    draw(d, p) {
      const main = p.c('main'), cushion = p.c('cushion'), dark = darken(main, 0.18);
      d.rect(-26, 88, 8, 8, { fill: p.c('feet'), rx: 2, kind: 'detail' });
      d.rect(118, 88, 8, 8, { fill: p.c('feet'), rx: 2, kind: 'detail' });
      d.rect(-30, 14, 160, 52, { fill: main, rx: 14, kind: 'body' });
      d.rect(-36, 66, 172, 24, { fill: dark, rx: 8, kind: 'body' });
      d.rect(-16, 54, 66, 18, { fill: cushion, rx: 7, kind: 'body' });
      d.rect(50, 54, 66, 18, { fill: cushion, rx: 7, kind: 'body' });
      d.rect(-42, 40, 26, 50, { fill: main, rx: 11, kind: 'body' });
      d.rect(116, 40, 26, 50, { fill: main, rx: 11, kind: 'body' });
    },
  },
  {
    id: 'window',
    aliases: ['panes', 'casement'],
    tags: ['indoor', 'room', 'building', 'architecture', 'object'],
    category: 'objects',
    placement: 'background',
    scale: 1.05,
    baseline: 90,
    width: 0.75,
    colors: { main: '#ffffff' },
    draw(d, p) {
      const fill = p.c('main') || '#ffffff';
      // 12-pane window frame (matching roadmap Image Quadrant 4)
      d.rect(20, 10, 60, 78, { rx: 2, fill, stroke: '#000000', sw: 3.5, kind: 'body' });
      // 3 columns x 4 rows
      d.line(40, 10, 40, 88, { stroke: '#000000', sw: 2.8, kind: 'line' });
      d.line(60, 10, 60, 88, { stroke: '#000000', sw: 2.8, kind: 'line' });
      d.line(20, 29.5, 80, 29.5, { stroke: '#000000', sw: 2.8, kind: 'line' });
      d.line(20, 49, 80, 49, { stroke: '#000000', sw: 2.8, kind: 'line' });
      d.line(20, 68.5, 80, 68.5, { stroke: '#000000', sw: 2.8, kind: 'line' });
      // Sill
      d.rect(16, 88, 68, 6, { rx: 1.5, fill: '#000000', kind: 'detail' });
    },
  },
  {
    id: 'table',
    aliases: ['desk', 'workbench', 'counter'],
    tags: ['furniture', 'indoor', 'room', 'object'],
    category: 'objects',
    placement: 'ground',
    scale: 0.85,
    baseline: 96,
    width: 1.15,
    colors: { main: '#ffffff' },
    draw(d, p) {
      const fill = p.c('main') || '#ffffff';
      // Tabletop surface
      d.rect(12, 46, 76, 12, { rx: 2, fill, stroke: '#000000', sw: 3.2, kind: 'body' });
      // Front and back legs
      d.line(20, 58, 20, 96, { stroke: '#000000', sw: 3.4, strokeLinecap: 'round', kind: 'line' });
      d.line(80, 58, 80, 96, { stroke: '#000000', sw: 3.4, strokeLinecap: 'round', kind: 'line' });
      d.line(26, 58, 26, 92, { stroke: '#000000', sw: 2.5, strokeLinecap: 'round', kind: 'line' });
      d.line(74, 58, 74, 92, { stroke: '#000000', sw: 2.5, strokeLinecap: 'round', kind: 'line' });
    },
  },
  {
    id: 'box',
    aliases: ['crate', 'cube', 'package', 'carton'],
    tags: ['container', 'object', 'room'],
    category: 'objects',
    placement: 'ground',
    scale: 0.55,
    baseline: 96,
    width: 0.75,
    colors: { main: '#d7ba89', top: '#ebd7b2', side: '#ba9a68' },
    draw(d, p) {
      // 3D Isometric cardboard box
      d.poly([[50, 20], [82, 36], [50, 52], [18, 36]], { fill: p.c('top'), stroke: '#000000', sw: 3, kind: 'body' });
      d.poly([[18, 36], [50, 52], [50, 88], [18, 72]], { fill: p.c('main'), stroke: '#000000', sw: 3, kind: 'body' });
      d.poly([[50, 52], [82, 36], [82, 72], [50, 88]], { fill: p.c('side'), stroke: '#000000', sw: 3, kind: 'body' });
      // Flap seam & tape
      d.line(50, 20, 50, 52, { stroke: '#8d6e63', sw: 3, strokeDasharray: '3,2', kind: 'line' });
    },
  },
  {
    id: 'door',
    aliases: ['portal', 'entrance', 'doorway'],
    tags: ['indoor', 'room', 'building', 'architecture', 'object'],
    category: 'objects',
    placement: 'background',
    scale: 1.25,
    baseline: 96,
    width: 0.65,
    colors: { main: '#ffffff', frame: '#212121', knob: '#f59e0b' },
    draw(d, p) {
      // Outer Frame
      d.rect(26, 12, 48, 84, { rx: 2, fill: p.c('main'), stroke: '#000000', sw: 3.5, kind: 'body' });
      // Upper and lower recessed panels
      d.rect(32, 20, 36, 32, { rx: 1.5, stroke: '#000000', sw: 2.4, fill: 'none', kind: 'line' });
      d.rect(32, 58, 36, 32, { rx: 1.5, stroke: '#000000', sw: 2.4, fill: 'none', kind: 'line' });
      // Brass doorknob
      d.circle(62, 55, 3.2, { fill: p.c('knob'), stroke: '#000000', sw: 1.5, kind: 'detail' });
    },
  },
];
