// Vehicles & transport concepts.
import { INK } from '../core/styles.js';

export default [
  {
    id: 'bike',
    aliases: ['bicycle', 'cycle'],
    tags: ['vehicle', 'transport', 'ride', 'sport'],
    category: 'vehicles',
    placement: 'ground',
    scale: 0.75,
    baseline: 93,
    width: 0.95,
    // Facing right. Where a rider goes (src/scene.js): hips on the saddle, hands on the handlebar
    saddle: [39, 40],
    grip: [65, 29],
    colors: { main: '#e53935', wheel: '#37474f', rim: '#eceff1', seat: '#3e2723', metal: '#90a4ae' },
    palettes: { main: ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1'] },
    draw(d, p) {
      const frame = p.c('main'), tire = p.c('wheel'), rim = p.c('rim'), metal = p.c('metal'), seat = p.c('seat');
      // Wheels: a tyre, the rim inside it, spokes and the hub (filled, so every style shows them)
      for (const cx of [22, 78]) {
        d.circle(cx, 75, 18, { fill: tire, kind: 'body' });
        d.circle(cx, 75, 14, { fill: rim, kind: 'detail' });
        for (const a of [0, 60, 120]) {
          const r = (a * Math.PI) / 180, dx = Math.cos(r) * 13, dy = Math.sin(r) * 13;
          d.line(cx - dx, 75 - dy, cx + dx, 75 + dy, { stroke: metal, sw: 1, kind: 'line' });
        }
        d.circle(cx, 75, 3, { fill: metal, kind: 'detail' });
      }
      // The frame: chain stay, seat stay, seat tube, top tube, down tube, fork
      const bar = (x1, y1, x2, y2, w = 4) => d.line(x1, y1, x2, y2, { stroke: frame, sw: w, strokeLinecap: 'round', kind: 'body' });
      bar(22, 75, 46, 75);
      bar(22, 75, 40, 47);
      bar(46, 75, 40, 47);
      bar(40, 47, 66, 44);
      bar(46, 75, 66, 44);
      bar(66, 40, 78, 75, 3.5);
      // Pedals and crank
      d.circle(46, 75, 5, { fill: metal, kind: 'detail' });
      d.line(46, 75, 51, 84, { stroke: metal, sw: 2.5, strokeLinecap: 'round', kind: 'line' });
      d.rect(48, 83, 8, 3, { fill: seat, rx: 1, kind: 'detail' });
      // Seat post and saddle, stem and handlebar
      d.line(40, 47, 39, 42, { stroke: metal, sw: 3, kind: 'line' });
      d.path('M30 41 Q40 37 47 40 Q45 44 36 43 Z', { fill: seat, kind: 'body' });
      d.line(66, 44, 64, 31, { stroke: metal, sw: 3, strokeLinecap: 'round', kind: 'line' });
      d.path('M58 31 Q64 27 70 31', { stroke: seat, sw: 3.5, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      // A basket on the front, and a bell
      d.circle(61, 30, 1.8, { fill: '#fdd835', kind: 'accent' });
    },
  },
  {
    id: 'car',
    aliases: ['automobile', 'auto', 'vehicle'],
    tags: ['vehicle', 'transport', 'drive', 'road'],
    category: 'vehicles',
    placement: 'ground',
    scale: 0.85,
    baseline: 92,
    width: 0.9,
    colors: { main: '#1e88e5', window: '#b3e5fc', wheel: '#263238', rim: '#eceff1', light: '#ffee58' },
    palettes: { main: ['#1e88e5', '#e53935', '#43a047', '#fdd835', '#fb8c00', '#212121', '#fafafa'] },
    draw(d, p) {
      const carColor = p.c('main');
      const win = p.c('window');
      const wheel = p.c('wheel');
      const rim = p.c('rim');

      // Main car body lower rect & curves
      d.path('M8 68 L14 55 Q16 48 24 48 L32 48 L42 30 Q46 26 54 26 L70 26 Q78 26 84 36 L92 48 Q96 50 96 58 L96 68 Q96 74 90 74 L82 74 Q82 64 72 64 Q62 64 62 74 L38 74 Q38 64 28 64 Q18 64 18 74 L12 74 Q8 74 8 68 Z', { fill: carColor, kind: 'body' });

      // Cabin / Windows
      d.path('M44 32 L34 46 L51 46 L51 32 Z', { fill: win, kind: 'body' });
      d.path('M55 32 L55 46 L80 46 L73 34 Q70 32 66 32 Z', { fill: win, kind: 'body' });

      // Headlight & taillight
      d.rect(91, 53, 5, 6, { rx: 2, fill: p.c('light'), kind: 'body' });
      d.rect(8, 54, 4, 6, { rx: 1.5, fill: '#e53935', kind: 'body' });

      // Door line & handle
      d.line(53, 46, 53, 70, { stroke: INK, sw: 1.5, kind: 'line' });
      d.rect(56, 52, 6, 2, { rx: 1, fill: INK, kind: 'detail' });

      // Wheels (left: cx=28, cy=74, r=12; right: cx=72, cy=74, r=12)
      d.circle(28, 74, 12, { fill: wheel, kind: 'body' });
      d.circle(28, 74, 5.5, { fill: rim, kind: 'body' });
      d.circle(28, 74, 2, { fill: wheel, kind: 'detail' });

      d.circle(72, 74, 12, { fill: wheel, kind: 'body' });
      d.circle(72, 74, 5.5, { fill: rim, kind: 'body' });
      d.circle(72, 74, 2, { fill: wheel, kind: 'detail' });
    },
  },
  {
    id: 'bus',
    aliases: ['schoolbus', 'omnibus'],
    tags: ['vehicle', 'transport', 'school', 'road'],
    category: 'vehicles',
    placement: 'ground',
    scale: 1.3,
    baseline: 92,
    width: 0.94,
    colors: { main: '#fbc02d', window: '#e1f5fe', wheel: '#263238', stripe: '#212121' },
    palettes: { main: ['#fbc02d', '#e53935', '#1e88e5', '#43a047'] },
    draw(d, p) {
      const busColor = p.c('main');
      const win = p.c('window');
      const wheel = p.c('wheel');

      // Bus body
      d.rect(8, 22, 84, 52, { rx: 8, fill: busColor, kind: 'body' });
      // Dark bumper / stripe
      d.rect(8, 58, 84, 5, { fill: p.c('stripe'), kind: 'body' });

      // Windows
      d.rect(14, 28, 14, 16, { rx: 2, fill: win, kind: 'body' });
      d.rect(32, 28, 14, 16, { rx: 2, fill: win, kind: 'body' });
      d.rect(50, 28, 14, 16, { rx: 2, fill: win, kind: 'body' });
      d.rect(68, 28, 18, 16, { rx: 2, fill: win, kind: 'body' });

      // Door lines
      d.line(80, 48, 80, 74, { stroke: INK, sw: 1.5, kind: 'line' });
      d.line(86, 48, 86, 74, { stroke: INK, sw: 1.5, kind: 'line' });

      // Lights
      d.circle(91, 65, 3, { fill: '#ffee58', kind: 'body' });
      d.rect(7, 63, 3, 5, { fill: '#e53935', kind: 'body' });

      // Wheels (cx=26, cy=74; cx=72, cy=74)
      d.circle(26, 74, 12, { fill: wheel, kind: 'body' });
      d.circle(26, 74, 5, { fill: '#eceff1', kind: 'body' });
      d.circle(72, 74, 12, { fill: wheel, kind: 'body' });
      d.circle(72, 74, 5, { fill: '#eceff1', kind: 'body' });
    },
  },
  {
    id: 'boat',
    aliases: ['ship', 'sailboat', 'yacht'],
    tags: ['vehicle', 'water', 'sea', 'ocean', 'sail'],
    category: 'vehicles',
    placement: 'water',
    scale: 0.95,
    baseline: 88,
    width: 0.88,
    colors: { main: '#8d6e63', sail: '#ffffff', mast: '#4e342e', flag: '#e53935' },
    palettes: { main: ['#8d6e63', '#1e88e5', '#e53935', '#ffffff', '#37474f'] },
    draw(d, p) {
      const hull = p.c('main');
      const sail = p.c('sail');
      const mast = p.c('mast');

      // Mast
      d.rect(48, 14, 4, 54, { fill: mast, kind: 'body' });

      // Main sail (triangle)
      d.poly([[54, 18], [54, 62], [84, 62]], { fill: sail, kind: 'body' });
      // Front jib sail
      d.poly([[46, 22], [46, 62], [22, 62]], { fill: sail, kind: 'body' });

      // Pennant flag on top
      d.poly([[52, 14], [64, 18], [52, 22]], { fill: p.c('flag'), kind: 'body' });

      // Hull (trapezoid boat shape)
      d.poly([[12, 66], [88, 66], [76, 86], [24, 86]], { fill: hull, kind: 'body' });
      // Waterline accent stripe
      d.poly([[14, 66], [86, 66], [84, 71], [16, 71]], { fill: '#ffee58', kind: 'accent' });
    },
  },
  {
    id: 'plane',
    aliases: ['airplane', 'aeroplane', 'jet', 'aircraft'],
    tags: ['vehicle', 'air', 'fly', 'sky', 'travel'],
    category: 'vehicles',
    placement: 'air',
    scale: 0.8,
    baseline: 60,
    width: 0.9,
    colors: { main: '#ffffff', wing: '#1e88e5', window: '#b3e5fc' },
    palettes: { wing: ['#1e88e5', '#e53935', '#43a047', '#fb8c00', '#8e24aa'] },
    draw(d, p) {
      const body = p.c('main');
      const wing = p.c('wing');
      const win = p.c('window');

      // Back wing (top)
      d.poly([[45, 48], [35, 18], [52, 18], [62, 48]], { fill: wing, kind: 'body' });

      // Fuselage (main airplane body)
      d.ellipse(50, 52, 44, 11, { fill: body, kind: 'body' });

      // Tail fin
      d.poly([[12, 50], [6, 26], [18, 26], [26, 50]], { fill: wing, kind: 'body' });

      // Front wing (lower)
      d.poly([[40, 54], [25, 82], [42, 82], [58, 54]], { fill: wing, kind: 'body' });

      // Cockpit & passenger windows
      d.ellipse(84, 49, 4, 3, { fill: win, kind: 'body' });
      for (let x = 34; x <= 74; x += 8) {
        d.circle(x, 50, 2, { fill: win, kind: 'body' });
      }
    },
  },
];
