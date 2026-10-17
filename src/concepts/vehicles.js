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
    baseline: 92,
    width: 0.85,
    colors: { main: '#e53935', wheel: '#37474f', seat: '#212121', metal: '#b0bec5' },
    palettes: { main: ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1'] },
    draw(d, p) {
      const frame = p.c('main');
      const wheel = p.c('wheel');
      const metal = p.c('metal');
      const seat = p.c('seat');

      // Rear wheel (center ~24, 70, radius 18)
      d.circle(24, 70, 18, { fill: 'none', stroke: wheel, sw: 4, kind: 'body' });
      d.circle(24, 70, 4, { fill: metal, kind: 'detail' });
      d.line(24, 52, 24, 88, { stroke: metal, sw: 1.2, kind: 'line' });
      d.line(6, 70, 42, 70, { stroke: metal, sw: 1.2, kind: 'line' });

      // Front wheel (center ~76, 70, radius 18)
      d.circle(76, 70, 18, { fill: 'none', stroke: wheel, sw: 4, kind: 'body' });
      d.circle(76, 70, 4, { fill: metal, kind: 'detail' });
      d.line(76, 52, 76, 88, { stroke: metal, sw: 1.2, kind: 'line' });
      d.line(58, 70, 94, 70, { stroke: metal, sw: 1.2, kind: 'line' });

      // Bottom bracket / pedal crank (center 48, 70)
      d.circle(48, 70, 4.5, { fill: metal, kind: 'detail' });
      d.line(48, 70, 52, 80, { stroke: metal, sw: 2.5, kind: 'line' });
      d.line(50, 80, 56, 80, { stroke: seat, sw: 2.5, kind: 'line' });

      // Diamond frame:
      // Rear axle (24,70) -> Seat joint (42, 44)
      d.line(24, 70, 42, 44, { stroke: frame, sw: 3.5, kind: 'line' });
      // Rear axle (24,70) -> Bottom bracket (48, 70)
      d.line(24, 70, 48, 70, { stroke: frame, sw: 3.5, kind: 'line' });
      // Bottom bracket (48, 70) -> Seat joint (42, 44)
      d.line(48, 70, 42, 44, { stroke: frame, sw: 3.5, kind: 'line' });
      // Seat joint (42, 44) -> Head tube (68, 38)
      d.line(42, 44, 68, 38, { stroke: frame, sw: 3.5, kind: 'line' });
      // Bottom bracket (48, 70) -> Head tube (68, 38)
      d.line(48, 70, 68, 38, { stroke: frame, sw: 3.5, kind: 'line' });
      // Front fork: Head tube (68, 34) -> Front axle (76, 70)
      d.line(68, 34, 76, 70, { stroke: frame, sw: 3.5, kind: 'line' });

      // Seat post & Saddle
      d.line(42, 44, 40, 37, { stroke: metal, sw: 3, kind: 'line' });
      d.path('M32 37 Q42 35 48 37 Q46 41 38 40 Z', { fill: seat, kind: 'body' });

      // Handlebars
      d.line(68, 34, 69, 27, { stroke: metal, sw: 3, kind: 'line' });
      d.path('M65 27 Q70 25 74 29', { stroke: seat, sw: 3, kind: 'line' });
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
