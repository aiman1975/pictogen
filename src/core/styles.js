// Visual styles. Each style maps a recorded shape (see kit.js) to SVG attributes, or null to skip it.
// ctx.olk = outline width multiplier (scenes use it to keep outlines even across scaled items).

import { lighten, darken, mix, luminance, isHex } from './color.js';

export const INK = '#263238';
const OL = 2.4; // base outline width in 100x100 concept units
const PENCIL = '#3e4a52';
const NEON_BG = '#0b1026';

const lineOf = (stroke, width, opacity) => ({ fill: 'none', stroke, 'stroke-width': width, opacity });
const norm = (s) => ({ fill: s.fill ?? INK, stroke: s.stroke ?? s.fill ?? INK, w: s.sw ?? 3, op: s.opacity });
const hl = (s) => ({ fill: s.fill || '#ffffff', opacity: s.opacity ?? 0.4 });
const sh = (s) => ({ fill: s.fill || '#000000', opacity: s.opacity ?? 0.12 });
const neonize = (c) => (!isHex(c) ? '#7df9ff' : luminance(c) < 0.3 ? lighten(c, 0.65) : lighten(c, 0.2));

export const STYLES = {
  flat: {
    label: 'Flat',
    description: 'Clean flat colors, no outlines (emoji-like).',
    card: (m) => ({ fill: lighten(m, 0.82), stroke: lighten(m, 0.5) }),
    shape(s) {
      const n = norm(s);
      switch (s.kind) {
        case 'line': return lineOf(n.stroke, n.w, n.op);
        case 'highlight': return hl(s);
        case 'shadow': return sh(s);
        default: return { fill: n.fill, opacity: n.op };
      }
    },
  },

  cartoon: {
    label: 'Cartoon',
    description: 'Bold colors with dark outlines (kids books).',
    card: (m) => ({ fill: lighten(m, 0.8), stroke: darken(m, 0.4) }),
    shape(s, ctx) {
      const n = norm(s);
      switch (s.kind) {
        case 'line': return lineOf(n.stroke, n.w, n.op);
        case 'highlight': return hl(s);
        case 'shadow': return sh(s);
        case 'detail': case 'accent': case 'bg': return { fill: n.fill, opacity: n.op };
        default: return { fill: n.fill, opacity: n.op, stroke: isHex(n.fill) ? darken(n.fill, 0.6) : INK, 'stroke-width': OL * ctx.olk };
      }
    },
  },

  outline: {
    label: 'Outline',
    description: 'Black line art on white (coloring pages, minimal slides).',
    text: INK,
    card: () => ({ fill: '#ffffff', stroke: INK }),
    shape(s, ctx) {
      const n = norm(s);
      switch (s.kind) {
        case 'line': return lineOf(INK, n.w);
        case 'detail': return { fill: INK };
        case 'bg': return { fill: '#ffffff', stroke: '#90a4ae', 'stroke-width': 1.2 * ctx.olk };
        case 'accent': case 'highlight': case 'shadow': return null;
        default: return { fill: '#ffffff', stroke: INK, 'stroke-width': OL * ctx.olk };
      }
    },
  },

  pastel: {
    label: 'Pastel',
    description: 'Soft light colors with gentle outlines.',
    card: (m) => ({ fill: lighten(m, 0.88), stroke: lighten(m, 0.55) }),
    shape(s, ctx) {
      const n = norm(s);
      switch (s.kind) {
        case 'line': return lineOf(lighten(n.stroke, 0.25), n.w, n.op);
        case 'highlight': return hl(s);
        case 'shadow': return null;
        case 'detail': return { fill: lighten(n.fill, 0.2) };
        case 'accent': return { fill: lighten(n.fill, 0.3), opacity: n.op };
        case 'bg': return { fill: lighten(n.fill, 0.45) };
        default: return { fill: lighten(n.fill, 0.38), opacity: n.op, stroke: darken(lighten(n.fill, 0.2), 0.15), 'stroke-width': 1.6 * ctx.olk };
      }
    },
  },

  silhouette: {
    label: 'Silhouette',
    description: 'Single-color solid shapes (pictograms, signs).',
    card: () => ({ fill: '#eceff1', stroke: '#b0bec5' }),
    shape(s) {
      const n = norm(s);
      switch (s.kind) {
        case 'line': return lineOf(INK, n.w);
        case 'bg': return { fill: lighten(n.fill, 0.72) };
        case 'detail': case 'accent': case 'highlight': case 'shadow': return null;
        default: return { fill: INK };
      }
    },
  },

  sketch: {
    label: 'Sketch',
    description: 'Hand-drawn pencil look with wobbly lines.',
    filter: 'rough',
    text: PENCIL,
    card: () => ({ fill: '#fffdf5', stroke: PENCIL }),
    defs: (uid, o = {}) =>
      `<filter id="${uid}-rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="${o.freq ?? 0.06}" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${o.scale ?? 1.6}" xChannelSelector="R" yChannelSelector="G"/></filter>`,
    shape(s, ctx) {
      const n = norm(s);
      switch (s.kind) {
        case 'line': return lineOf(mix(n.stroke, PENCIL, 0.5), n.w * 0.85);
        case 'detail': return { fill: PENCIL };
        case 'accent': return { fill: lighten(n.fill, 0.5), opacity: n.op };
        case 'bg': return { fill: lighten(n.fill, 0.65) };
        case 'highlight': case 'shadow': return null;
        default: return { fill: lighten(n.fill, 0.5), opacity: n.op, stroke: PENCIL, 'stroke-width': 1.8 * ctx.olk };
      }
    },
  },

  neon: {
    label: 'Neon',
    description: 'Glowing lines on a dark background (tech slides, posters).',
    filter: 'glow',
    background: NEON_BG,
    text: '#e0f7ff',
    card: (m) => ({ fill: NEON_BG, stroke: neonize(m) }),
    defs: (uid, o = {}) =>
      `<filter id="${uid}-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${o.blur ?? 1.1}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
    shape(s, ctx) {
      const n = norm(s);
      switch (s.kind) {
        case 'line': return lineOf(neonize(n.stroke), n.w * 0.8);
        case 'detail': return { fill: neonize(n.fill) };
        case 'bg': return { fill: mix(n.fill, NEON_BG, 0.82) };
        case 'accent': case 'highlight': case 'shadow': return null;
        default: return { fill: neonize(n.fill), 'fill-opacity': 0.14, opacity: n.op, stroke: neonize(n.fill), 'stroke-width': 2 * ctx.olk };
      }
    },
  },

  blueprint: {
    label: 'Blueprint',
    description: 'Cyan CAD linework on deep navy engineering grid.',
    background: '#0a1d37',
    text: '#38bdf8',
    card: () => ({ fill: '#0a1d37', stroke: '#38bdf8' }),
    defs: (uid) =>
      `<pattern id="${uid}-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#133863" stroke-width="0.8"/></pattern>`,
    shape(s, ctx = {}) {
      const n = norm(s);
      const olk = ctx.olk || 1;
      switch (s.kind) {
        case 'line': return lineOf('#7dd3fc', n.w * 0.9, n.op);
        case 'detail': return { fill: '#38bdf8' };
        case 'bg': return { fill: '#0e2646', stroke: '#1e4976', 'stroke-width': 1 * olk };
        case 'accent': case 'highlight': return { fill: '#e0f2fe', opacity: 0.8 };
        case 'shadow': return null;
        default: return { fill: '#0f2f56', 'fill-opacity': 0.35, opacity: n.op, stroke: '#38bdf8', 'stroke-width': 1.8 * olk };
      }
    },
  },

  chalkboard: {
    label: 'Chalkboard',
    description: 'Chalk-dusted illustrations on a matte green blackboard.',
    filter: 'chalk',
    background: '#192823',
    text: '#f1f5f9',
    card: () => ({ fill: '#192823', stroke: '#94a3b8' }),
    defs: (uid) =>
      `<filter id="${uid}-chalk" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.4" xChannelSelector="R" yChannelSelector="G"/></filter>`,
    shape(s, ctx = {}) {
      const n = norm(s);
      const olk = ctx.olk || 1;
      const chalkColor = isHex(n.fill) ? lighten(n.fill, 0.45) : '#f8fafc';
      switch (s.kind) {
        case 'line': return lineOf(chalkColor, n.w, 0.9);
        case 'detail': return { fill: chalkColor, opacity: 0.85 };
        case 'bg': return { fill: '#223830', opacity: 0.5 };
        case 'accent': return { fill: chalkColor, opacity: 0.7 };
        case 'highlight': return { fill: '#ffffff', opacity: 0.8 };
        case 'shadow': return null;
        default: return { fill: chalkColor, 'fill-opacity': 0.2, opacity: n.op, stroke: chalkColor, 'stroke-width': 2.2 * olk };
      }
    },
  },

  vintage: {
    label: 'Vintage',
    description: 'Antique engraving & etching on sepia parchment.',
    background: '#f6eedf',
    text: '#3d2b1f',
    card: () => ({ fill: '#f6eedf', stroke: '#5c4033' }),
    shape(s, ctx = {}) {
      const n = norm(s);
      const olk = ctx.olk || 1;
      const sepiaInk = '#3d2b1f';
      switch (s.kind) {
        case 'line': return lineOf(sepiaInk, n.w * 0.9);
        case 'detail': return { fill: sepiaInk };
        case 'bg': return { fill: '#ebdccb', stroke: '#8c6d58', 'stroke-width': 1 * olk };
        case 'accent': return { fill: '#d7ba9d', opacity: n.op };
        case 'highlight': case 'shadow': return null;
        default: return { fill: '#ebd9c3', opacity: n.op, stroke: sepiaInk, 'stroke-width': 1.6 * olk };
      }
    },
  },

  pixel: {
    label: 'Pixel',
    description: 'Retro 8-bit arcade style with bold pixel colors.',
    background: '#161426',
    text: '#ffd54f',
    card: () => ({ fill: '#161426', stroke: '#ff5252' }),
    shape(s, ctx = {}) {
      const n = norm(s);
      const olk = ctx.olk || 1;
      switch (s.kind) {
        case 'line': return lineOf(n.stroke, n.w * 1.2);
        case 'detail': return { fill: n.fill };
        case 'bg': return { fill: n.fill, opacity: 0.5 };
        case 'highlight': return { fill: '#ffffff', opacity: 0.6 };
        case 'shadow': return { fill: '#000000', opacity: 0.35 };
        default: return { fill: n.fill, opacity: n.op, stroke: '#000000', 'stroke-width': 2.5 * olk };
      }
    },
  },

  stickman: {
    label: 'Stickman',
    description: 'Clean minimalist stick-figure cartoon with bold black ink lines.',
    background: '#ffffff',
    text: '#000000',
    card: () => ({ fill: '#ffffff', stroke: '#000000' }),
    shape(s, ctx = {}) {
      const n = norm(s);
      const olk = ctx.olk || 1;
      switch (s.kind) {
        case 'line': return lineOf(n.stroke, Math.max(3.2 * olk, n.w), n.op);
        case 'detail': return { fill: n.fill, opacity: n.op };
        case 'bg': return { fill: n.fill, opacity: n.op };
        case 'highlight': return { fill: '#ffffff', opacity: 0.5 };
        case 'shadow': return { fill: '#000000', opacity: n.op ?? 0.15 };
        default: return { fill: n.fill, opacity: n.op, stroke: '#000000', 'stroke-width': 3.2 * olk };
      }
    },
  },

  cute2d: {
    label: 'Cute 2D',
    description: 'Round bouncing Kawaii ball characters, simple shapes, friendly expressions.',
    background: '#f8fafc',
    text: '#0f172a',
    card: () => ({ fill: '#f0fdf4', stroke: '#10b981' }),
    shape(s, ctx = {}) {
      const n = norm(s);
      const olk = ctx.olk || 1;
      switch (s.kind) {
        case 'line': return lineOf('#0f172a', Math.max(3 * olk, n.w), n.op);
        case 'detail': return { fill: '#0f172a', opacity: n.op };
        case 'bg': return { fill: n.fill, opacity: n.op };
        case 'highlight': return { fill: '#ffffff', opacity: n.op ?? 0.75 };
        case 'shadow': return { fill: '#000000', opacity: n.op ?? 0.14 };
        default: return { fill: n.fill, opacity: n.op, stroke: '#0f172a', 'stroke-width': 3.2 * olk };
      }
    },
  },

  comic: {
    label: 'Comic Strip',
    description: 'Classic newspaper comic ink lines on vintage newsprint.',
    background: '#fbf9f4',
    text: '#111827',
    card: () => ({ fill: '#fbf9f4', stroke: '#111827' }),
    shape(s, ctx = {}) {
      const n = norm(s);
      const olk = ctx.olk || 1;
      switch (s.kind) {
        case 'line': return lineOf('#111827', Math.max(2.6 * olk, n.w), n.op);
        case 'detail': return { fill: '#111827', opacity: n.op };
        case 'bg': return { fill: n.fill || '#f3efe6', opacity: n.op };
        case 'highlight': return { fill: '#ffffff', opacity: 0.8 };
        case 'shadow': return { fill: '#000000', opacity: n.op ?? 0.22 };
        default: return { fill: n.fill, opacity: n.op, stroke: '#111827', 'stroke-width': 2.6 * olk };
      }
    },
  },

  whiteboard: {
    label: 'Whiteboard',
    description: 'Black marker drawings on a white dry-erase board with colorful marker arrows.',
    background: '#ffffff',
    text: '#0f172a',
    card: () => ({ fill: '#ffffff', stroke: '#0284c7' }),
    shape(s, ctx = {}) {
      const n = norm(s);
      const olk = ctx.olk || 1;
      switch (s.kind) {
        case 'line': return lineOf(s.stroke || '#0f172a', Math.max(3.2 * olk, n.w), n.op);
        case 'detail': return { fill: s.fill || '#0f172a', opacity: n.op };
        case 'accent': return { fill: s.fill || '#0284c7', opacity: n.op };
        case 'bg': return { fill: n.fill || '#ffffff', opacity: n.op };
        case 'highlight': case 'shadow': return null;
        default: return { fill: '#ffffff', opacity: n.op, stroke: '#0f172a', 'stroke-width': 3.2 * olk };
      }
    },
  },

  geometric: {
    label: 'Geometric',
    description: 'Bauhaus modernist vector art from circles, semicircles, and solid color blocks.',
    background: '#faf6ee',
    text: '#1e3a8a',
    card: () => ({ fill: '#faf6ee', stroke: '#ea580c' }),
    shape(s) {
      const n = norm(s);
      switch (s.kind) {
        case 'line': return lineOf(n.stroke, n.w, n.op);
        case 'bg': return { fill: n.fill, opacity: n.op };
        case 'highlight': case 'shadow': return null;
        default: return { fill: n.fill, opacity: n.op };
      }
    },
  },

  doodle: {
    label: 'Doodle',
    description: 'Loose, organic hand-drawn notebook ink sketches with spiral binding.',
    filter: 'doodle-sketch',
    background: '#f8f6f0',
    text: '#111827',
    card: () => ({ fill: '#f8f6f0', stroke: '#111827' }),
    defs: (uid) =>
      `<filter id="${uid}-doodle-sketch" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.35" xChannelSelector="R" yChannelSelector="G"/></filter>`,
    shape(s, ctx = {}) {
      const n = norm(s);
      const olk = ctx.olk || 1;
      const ink = '#111827';
      switch (s.kind) {
        case 'line': return lineOf(ink, Math.max(2.4 * olk, n.w), n.op);
        case 'detail': return { fill: ink, opacity: n.op };
        case 'bg': return { fill: n.fill || '#f8f6f0', opacity: n.op };
        case 'highlight': case 'shadow': return null;
        default:
          return n.fill === '#111827' || n.fill === '#000000'
            ? { fill: ink, opacity: n.op, stroke: ink, 'stroke-width': 2.2 * olk }
            : { fill: '#ffffff', opacity: n.op, stroke: ink, 'stroke-width': 2.5 * olk };
      }
    },
  },

  editorial: {
    label: 'Editorial',
    description: 'Dramatic ink cartoon with exaggerated posture on warm gold background.',
    background: '#fed136',
    text: '#000000',
    card: () => ({ fill: '#fed136', stroke: '#000000' }),
    shape(s, ctx = {}) {
      const n = norm(s);
      const olk = ctx.olk || 1;
      switch (s.kind) {
        case 'line': return lineOf('#000000', Math.max(2.8 * olk, n.w), n.op);
        case 'detail': return { fill: '#000000', opacity: n.op };
        case 'bg': return { fill: n.fill || '#fed136', opacity: n.op };
        case 'highlight': return { fill: '#ffffff', opacity: 0.6 };
        case 'shadow': return { fill: '#000000', opacity: n.op ?? 0.25 };
        default:
          return n.fill === '#000000'
            ? { fill: '#000000', opacity: n.op, stroke: '#000000', 'stroke-width': 2 * olk }
            : { fill: '#fed136', opacity: n.op, stroke: '#000000', 'stroke-width': 2.8 * olk };
      }
    },
  },

  papercut: {
    label: 'Paper Cutout',
    description: 'Layered papercraft collage with handmade texture and soft drop shadows.',
    background: '#f8fafc',
    text: '#334155',
    card: () => ({ fill: '#f1f5f9', stroke: '#94a3b8' }),
    defs: (uid) => `
      <filter id="${uid}-paper-shadow" x="-20%" y="-20%" width="150%" height="150%">
        <feDropShadow dx="1.8" dy="3" stdDeviation="2.2" flood-color="#0f172a" flood-opacity="0.28"/>
      </filter>
    `,
    filter: 'paper-shadow',
    shape(s, ctx = {}) {
      const n = norm(s);
      const olk = ctx.olk || 1;
      switch (s.kind) {
        case 'line': return lineOf(n.stroke, n.w, n.op);
        case 'detail': return { fill: n.fill, opacity: n.op };
        case 'bg': return { fill: n.fill, opacity: n.op };
        case 'highlight': case 'shadow': return null;
        default: return { fill: n.fill, opacity: n.op, stroke: darken(n.fill, 0.12), 'stroke-width': 0.8 * olk };
      }
    },
  },

  letterling: {
    label: 'Letterlings',
    description: 'Cute candy cartoon style with chunky outlines, glossy highlights and kawaii charm.',
    background: '#fffdfa',
    text: '#1e293b',
    card: (m) => ({ fill: lighten(m, 0.85), stroke: darken(m, 0.2) }),
    shape(s, ctx = {}) {
      const n = norm(s);
      const olk = ctx.olk || 1;
      switch (s.kind) {
        case 'line': return lineOf(n.stroke, Math.max(2.5 * olk, n.w), n.op);
        case 'detail': return { fill: n.fill, opacity: n.op };
        case 'bg': return { fill: n.fill, opacity: n.op };
        case 'highlight': return hl(s);
        case 'shadow': return sh(s);
        case 'accent': return { fill: n.fill, opacity: n.op };
        default:
          return { fill: n.fill, opacity: n.op, stroke: '#1e293b', 'stroke-width': 2.4 * olk };
      }
    },
  },
};

STYLES.alphabet = STYLES.letterling;

export const STYLE_NAMES = Object.keys(STYLES);
export const getStyle = (name) => STYLES[name] || STYLES.flat;

