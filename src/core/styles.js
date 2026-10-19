// Visual styles. Each style maps a recorded shape (see kit.js) to SVG attributes, or null to skip it.
// ctx.olk = outline width multiplier (scenes use it to keep outlines even across scaled items).

import { lighten, darken, mix, luminance, isHex, saturate, nearest } from './color.js';

export const INK = '#263238';
const OL = 2.4; // base outline width in 100x100 concept units
const PENCIL = '#3e4a52';
const NEON_BG = '#0b1026';

const lineOf = (stroke, width, opacity) => ({ fill: 'none', stroke, 'stroke-width': width, opacity });
const norm = (s) => ({ fill: s.fill ?? INK, stroke: s.stroke ?? s.fill ?? INK, w: s.sw ?? 3, op: s.opacity });
const hl = (s) => ({ fill: s.fill || '#ffffff', opacity: s.opacity ?? 0.4 });
const sh = (s) => ({ fill: s.fill || '#000000', opacity: s.opacity ?? 0.12 });
const CARTOON_INK = '#16161d';
// A 32-color retro palette (PICO-8's, with its extra colors) for pixel art; comics print in a few
// strong flat inks
const PIXEL_PALETTE = ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa',
  '#291814', '#111d35', '#422136', '#125359', '#742f29', '#49333b', '#a28879', '#f3ef7d', '#be1250', '#ff6c24', '#a8e72e', '#00b543', '#065ab5', '#754665', '#ff6e59', '#ff9d81', '#8fd3ff', '#c8eeff', '#5fb043'];
const COMIC_INKS = ['#111827', '#ffffff', '#fbf6e9', '#e63946', '#f4a261', '#ffd23f', '#2a9d8f', '#1d70b8', '#7cc6fe', '#8ac926', '#f2c4a8', '#c97b4a', '#6d4c41', '#9b5de5', '#ff8fab', '#adb5bd'];
const comicInk = (c) => (isHex(c) ? mix(c, nearest(c, COMIC_INKS), 0.6) : c);
const pixelInk = (c) => nearest(c, PIXEL_PALETTE);
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
    description: 'Bright saturated colors with thick black ink outlines and bold shading (kids books, TV cartoons).',
    card: (m) => ({ fill: lighten(saturate(m, 0.3), 0.78), stroke: CARTOON_INK }),
    shape(s, ctx) {
      const n = norm(s);
      switch (s.kind) {
        case 'line': return lineOf(!isHex(n.stroke) || luminance(n.stroke) < 0.3 ? CARTOON_INK : darken(saturate(n.stroke, 0.35), 0.1), n.w * 1.2, n.op);
        case 'highlight': return { fill: '#ffffff', opacity: Math.min(0.8, (s.opacity ?? 0.4) * 1.7) };
        case 'shadow': return { fill: '#1b1340', opacity: Math.min(0.4, (s.opacity ?? 0.12) * 1.8) };
        case 'detail': return { fill: isHex(n.fill) && luminance(n.fill) < 0.3 ? CARTOON_INK : saturate(n.fill, 0.35), opacity: n.op };
        case 'accent': return { fill: saturate(n.fill, 0.4), opacity: n.op };
        case 'bg': return { fill: saturate(n.fill, 0.4) };
        default: return { fill: saturate(n.fill, 0.4), opacity: n.op, stroke: CARTOON_INK, 'stroke-width': 3.4 * ctx.olk };
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
    description: '8-bit pixel art: chunky square pixels in a 16-color retro game palette.',
    filter: 'pixelate',
    wholeFilter: true, // a scene is pixelated as a whole picture, background and all
    background: '#1d2b53',
    text: '#ffec27',
    card: () => ({ fill: '#1d2b53', stroke: '#ff004d' }),
    // One sample per block, grown back to a square: real pixels, whatever is drawn
    defs: (uid, o = {}) => {
      const b = Math.max(1, Math.round((o.pixel ?? (o.scale ?? 1.6) * 1.6) * 10) / 10);
      const h = Math.round(b * 5) / 10;
      return `<filter id="${uid}-pixelate" filterUnits="userSpaceOnUse" x="0" y="0" width="${o.w ?? (o.scale ? 100 : 1400)}" height="${o.h ?? (o.scale ? 130 : 1400)}"><feFlood x="${h}" y="${h}" width="1" height="1"/><feComposite width="${b}" height="${b}"/><feTile result="a"/><feComposite in="SourceGraphic" in2="a" operator="in"/><feMorphology operator="dilate" radius="${h}"/></filter>`;
    },
    shape(s, ctx = {}) {
      const n = norm(s);
      switch (s.kind) {
        case 'line': return lineOf(pixelInk(n.stroke), n.w * 1.5, n.op);
        case 'detail': return { fill: pixelInk(n.fill) };
        case 'bg': return { fill: pixelInk(n.fill) };
        case 'highlight': return { fill: '#fff1e8', opacity: 0.85 };
        case 'shadow': return { fill: '#000000', opacity: 0.4 };
        default: return { fill: pixelInk(n.fill), opacity: n.op, stroke: '#000000', 'stroke-width': 1.4 * (ctx.olk || 1) };
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
    description: 'Newspaper comic: heavy black ink, flat printed colors, halftone dots and a panel frame.',
    background: '#fbf6e9',
    text: '#111827',
    card: () => ({ fill: '#fbf6e9', stroke: '#111827' }),
    defs: (uid, o = {}) => {
      const d = Math.round((o.scale ?? 1.6) * 2.4 * 10) / 10;
      return `<pattern id="${uid}-dots" width="${d}" height="${d}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="${d / 2}" cy="${d / 2}" r="${Math.round(d * 2.8) / 10}" fill="#1f2937"/></pattern>`;
    },
    // Printed on newsprint: halftone dots over everything, then the panel's border
    overlay: (uid, W, H) => {
      const g = Math.round(W * 0.012), b = Math.max(2, Math.round(W * 0.007));
      return `<rect width="${W}" height="${H}" fill="url(#${uid}-dots)" opacity="0.14" style="mix-blend-mode:multiply"/>`
        + `<rect width="${W}" height="${H}" fill="#f1dfae" opacity="0.14" style="mix-blend-mode:multiply"/>`
        + `<rect x="${g / 2}" y="${g / 2}" width="${W - g}" height="${H - g}" fill="none" stroke="#fbf6e9" stroke-width="${g}"/>`
        + `<rect x="${g + b / 2}" y="${g + b / 2}" width="${W - 2 * g - b}" height="${H - 2 * g - b}" fill="none" stroke="#111827" stroke-width="${b}"/>`;
    },
    shape(s, ctx = {}) {
      const n = norm(s);
      const olk = ctx.olk || 1;
      switch (s.kind) {
        case 'line': return lineOf('#111827', Math.max(2.8 * olk, n.w), n.op);
        case 'detail': return { fill: '#111827', opacity: n.op };
        case 'bg': return { fill: comicInk(n.fill || '#f3efe6'), opacity: n.op };
        case 'accent': return { fill: comicInk(n.fill), opacity: n.op };
        case 'highlight': return { fill: '#ffffff', opacity: 0.9 };
        case 'shadow': return { fill: '#111827', opacity: Math.min(0.45, (n.op ?? 0.22) * 2) };
        default: return { fill: comicInk(n.fill), opacity: n.op, stroke: '#111827', 'stroke-width': 3 * olk };
      }
    },
  },

  whiteboard: {
    label: 'Whiteboard',
    description: 'Dry-erase marker drawings: bold black and blue marker lines with light colored marker fills, on a white board.',
    background: '#ffffff',
    text: '#0f172a',
    card: () => ({ fill: '#ffffff', stroke: '#0284c7' }),
    shape(s, ctx = {}) {
      const n = norm(s);
      const olk = ctx.olk || 1;
      // Markers come in a few colors: the nearest one, lightly filled in
      const marker = (c) => (isHex(c) ? nearest(saturate(c, 0.3), ['#0f172a', '#1d4ed8', '#dc2626', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04', '#db2777', '#92400e']) : '#0f172a');
      switch (s.kind) {
        case 'line': return lineOf(!s.stroke ? '#0f172a' : luminance(s.stroke) > 0.7 ? s.stroke : marker(s.stroke), Math.max(3 * olk, n.w), n.op);
        case 'detail': return { fill: isHex(n.fill) && luminance(n.fill) < 0.35 ? '#0f172a' : marker(n.fill), opacity: n.op };
        case 'accent': return { fill: lighten(marker(n.fill), 0.35), opacity: n.op };
        case 'bg': return { fill: n.fill || '#ffffff', opacity: n.op };
        case 'highlight': case 'shadow': return null;
        default: return { fill: lighten(marker(n.fill), 0.72), opacity: n.op, stroke: isHex(n.fill) && luminance(n.fill) > 0.55 ? '#0f172a' : darken(marker(n.fill), 0.15), 'stroke-width': 3 * olk };
      }
    },
  },

  geometric: {
    label: 'Geometric',
    description: 'Bauhaus poster art: circles, half circles and solid blocks in red, blue, mustard and teal on cream.',
    background: '#f4ecd8',
    text: '#1d3557',
    card: () => ({ fill: '#f4ecd8', stroke: '#e63946' }),
    shape(s) {
      const n = norm(s);
      const bauhaus = (c) => (isHex(c) ? mix(c, nearest(c, ['#e63946', '#1d3557', '#457b9d', '#e9c46a', '#f4a261', '#2a9d8f', '#264653', '#f4ecd8', '#111111', '#ffffff', '#f2c6a0', '#8d5524']), 0.75) : c);
      switch (s.kind) {
        case 'line': return lineOf(bauhaus(n.stroke), n.w, n.op);
        case 'bg': return { fill: n.fill, opacity: n.op };
        case 'highlight': case 'shadow': return null;
        default: return { fill: bauhaus(n.fill), opacity: n.op };
      }
    },
  },

  doodle: {
    label: 'Doodle',
    description: 'Blue ballpoint pen doodles in a spiral notebook, loose and wobbly, with a touch of colored pencil.',
    filter: 'doodle-sketch',
    background: '#f8f6f0',
    text: '#1e3a8a',
    card: () => ({ fill: '#f8f6f0', stroke: '#1e3a8a' }),
    defs: (uid) =>
      `<filter id="${uid}-doodle-sketch" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G"/></filter>`,
    shape(s, ctx = {}) {
      const n = norm(s);
      const olk = ctx.olk || 1;
      const pen = '#1e3a8a';
      switch (s.kind) {
        case 'line': return lineOf(pen, Math.max(2 * olk, n.w * 0.85), n.op);
        case 'detail': return { fill: pen, opacity: n.op };
        case 'accent': return { fill: lighten(n.fill, 0.55), opacity: n.op };
        case 'bg': return { fill: n.fill || '#f8f6f0', opacity: n.op };
        case 'highlight': case 'shadow': return null;
        default:
          return isHex(n.fill) && luminance(n.fill) < 0.2
            ? { fill: pen, opacity: n.op, stroke: pen, 'stroke-width': 1.8 * olk }
            : { fill: lighten(n.fill, 0.8), opacity: n.op, stroke: pen, 'stroke-width': 2 * olk };
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

  watercolor: {
    label: 'Watercolor',
    description: 'Soft transparent washes of paint that bleed at the edges, on textured cotton paper.',
    filter: 'wash',
    bgFilter: true, // the landscape is painted too
    background: '#fbf7ef',
    text: '#34495e',
    card: (m) => ({ fill: '#fbf7ef', stroke: lighten(m, 0.3) }),
    defs: (uid, o = {}) => {
      const sc = o.scale ?? 1.6;
      return `<filter id="${uid}-wash" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency="${Math.round((0.09 / sc) * 1e4) / 1e4}" numOctaves="3" seed="9" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${Math.round(sc * 18) / 10}" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="${Math.round(sc * 2) / 10}"/></filter>`
        + `<filter id="${uid}-paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="2"/><feColorMatrix type="matrix" values="0 0 0 0 0.45 0 0 0 0 0.38 0 0 0 0 0.3 1.3 0 0 0 -0.4"/></filter>`;
    },
    // Paper grain over the whole picture
    overlay: (uid, W, H) => `<rect width="${W}" height="${H}" filter="url(#${uid}-paper)" opacity="0.22" style="mix-blend-mode:multiply"/>`,
    shape(s, ctx = {}) {
      const n = norm(s);
      const olk = ctx.olk || 1;
      switch (s.kind) {
        case 'line': return lineOf(mix(n.stroke, '#34495e', 0.35), n.w * 0.85, 0.8);
        case 'detail': return { fill: isHex(n.fill) && luminance(n.fill) < 0.3 ? '#2c3e50' : n.fill, opacity: n.op };
        case 'accent': return { fill: n.fill, opacity: (n.op ?? 1) * 0.7 };
        case 'bg': return { fill: isHex(n.fill) ? lighten(saturate(n.fill, 0.25), 0.12) : n.fill, 'fill-opacity': 0.9 };
        case 'highlight': return { fill: '#ffffff', opacity: 0.55 };
        case 'shadow': return { fill: '#34407a', opacity: Math.min(0.25, (n.op ?? 0.12) * 1.4) };
        // Each wash a little transparent, its edge where the pigment pooled a little darker
        default: return { fill: isHex(n.fill) ? saturate(n.fill, 0.15) : n.fill, 'fill-opacity': 0.9, opacity: n.op, stroke: isHex(n.fill) ? darken(n.fill, 0.3) : '#34495e', 'stroke-width': 1.4 * olk, 'stroke-opacity': 0.55 };
      }
    },
  },

  anime: {
    label: 'Anime',
    description: 'Japanese anime look: crisp thin colored line art, bright cel shading, big shiny eyes and a vivid sky.',
    background: '#dff1ff',
    text: '#1e293b',
    card: (m) => ({ fill: lighten(m, 0.85), stroke: darken(m, 0.35) }),
    // Big summer clouds behind everyone (outdoors)
    outdoorDecor: true,
    decor: (uid, W, H, hY) => {
      const cloud = (x, y, r) => [[0, 0, 1], [-1.1, 0.25, 0.75], [1.1, 0.3, 0.7], [-0.5, -0.45, 0.7], [0.55, -0.4, 0.62]]
        .map(([dx, dy, k]) => `<circle cx="${Math.round(x + dx * r)}" cy="${Math.round(y + dy * r)}" r="${Math.round(r * k)}"/>`).join('');
      return `<g fill="#ffffff" opacity="0.92">${cloud(W * 0.2, hY * 0.42, H * 0.09)}${cloud(W * 0.78, hY * 0.3, H * 0.075)}</g>`;
    },
    shape(s, ctx = {}) {
      const n = norm(s);
      const olk = ctx.olk || 1;
      const vivid = (c) => (isHex(c) ? saturate(c, 0.3) : c);
      const lineOfFill = (c) => (isHex(c) ? darken(saturate(c, 0.25), luminance(c) > 0.7 ? 0.45 : 0.55) : '#1e293b');
      switch (s.kind) {
        case 'line': return lineOf(isHex(n.stroke) && luminance(n.stroke) < 0.3 ? '#1e1b2e' : lineOfFill(n.stroke), n.w * 0.8, n.op);
        case 'detail': return { fill: isHex(n.fill) && luminance(n.fill) < 0.3 ? '#1e1b2e' : vivid(n.fill), opacity: n.op };
        case 'accent': return { fill: vivid(n.fill), opacity: n.op };
        case 'bg': return { fill: isHex(n.fill) ? saturate(n.fill, 0.35) : n.fill };
        case 'highlight': return { fill: '#ffffff', opacity: 0.9 };
        // Cel shading: hard-edged, cool and clearly darker
        case 'shadow': return { fill: '#4b3b8f', opacity: Math.min(0.42, (n.op ?? 0.12) * 2.4) };
        default: return { fill: vivid(n.fill), opacity: n.op, stroke: lineOfFill(n.fill), 'stroke-width': 1.3 * olk };
      }
    },
  },

  crayon: {
    label: 'Crayon',
    description: "Wax crayons on paper: bright streaky colors with the paper showing through, like a child's drawing.",
    filter: 'wax',
    bgFilter: true,
    background: '#fffdf6',
    text: '#334155',
    card: (m) => ({ fill: '#fffdf6', stroke: darken(m, 0.2) }),
    defs: (uid, o = {}) => {
      const sc = o.scale ?? 1.6;
      return `<filter id="${uid}-wax" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="${Math.round((1.2 / sc) * 1e3) / 1e3} ${Math.round((0.2 / sc) * 1e3) / 1e3}" numOctaves="2" seed="5" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.6 2.35" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in" result="w"/><feTurbulence type="fractalNoise" baseFrequency="${Math.round((0.06 / sc) * 1e4) / 1e4}" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="w" in2="n" scale="${Math.round(sc * 20) / 10}" xChannelSelector="R" yChannelSelector="G"/></filter>`;
    },
    shape(s, ctx = {}) {
      const n = norm(s);
      const olk = ctx.olk || 1;
      const wax = (c) => (isHex(c) ? saturate(c, 0.35) : c);
      switch (s.kind) {
        case 'line': return lineOf(isHex(n.stroke) ? darken(wax(n.stroke), 0.1) : n.stroke, n.w * 1.3, n.op);
        case 'detail': return { fill: isHex(n.fill) && luminance(n.fill) < 0.3 ? '#1f2937' : wax(n.fill), opacity: n.op };
        case 'accent': return { fill: wax(n.fill), opacity: n.op };
        case 'bg': return { fill: wax(n.fill) };
        case 'highlight': return null;
        case 'shadow': return { fill: '#1f2937', opacity: 0.12 };
        default: return { fill: wax(n.fill), opacity: n.op, stroke: isHex(n.fill) ? darken(wax(n.fill), 0.4) : '#1f2937', 'stroke-width': 2.8 * olk };
      }
    },
  },
  letterling: {
    label: 'Letterlings',
    description: 'Glossy candy look: bright jelly colors with a shiny 3D sheen, colored outlines and polka-dot skies.',
    filter: 'candy',
    background: '#fff4fa',
    text: '#7a2a5a',
    card: (m) => ({ fill: lighten(saturate(m, 0.3), 0.82), stroke: darken(saturate(m, 0.3), 0.3) }),
    defs: (uid, o = {}) => {
      const sc = o.scale ?? 1.6;
      return `<filter id="${uid}-candy" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur in="SourceAlpha" stdDeviation="${Math.round(sc * 9) / 10}" result="b"/><feSpecularLighting in="b" surfaceScale="${Math.round(sc * 20) / 10}" specularConstant="1" specularExponent="28" lighting-color="#ffffff" result="s"><feDistantLight azimuth="235" elevation="28"/></feSpecularLighting><feComposite in="s" in2="SourceAlpha" operator="in" result="g"/><feComposite in="SourceGraphic" in2="g" operator="arithmetic" k1="0" k2="1" k3="0.75" k4="0"/></filter>`
        + `<pattern id="${uid}-polka" width="${Math.round(sc * 90) / 10}" height="${Math.round(sc * 90) / 10}" patternUnits="userSpaceOnUse"><circle cx="${Math.round(sc * 22) / 10}" cy="${Math.round(sc * 22) / 10}" r="${Math.round(sc * 9) / 10}" fill="#ffffff"/><circle cx="${Math.round(sc * 67) / 10}" cy="${Math.round(sc * 67) / 10}" r="${Math.round(sc * 9) / 10}" fill="#ffffff"/></pattern>`;
    },
    // Polka dots in the sky, behind everyone
    decor: (uid, W, H, hY) => `<rect width="${W}" height="${hY}" fill="url(#${uid}-polka)" opacity="0.45"/>`,
    shape(s, ctx = {}) {
      const n = norm(s);
      const olk = ctx.olk || 1;
      const candy = (c) => (isHex(c) ? lighten(saturate(c, 0.45), 0.06) : c);
      switch (s.kind) {
        case 'line': return lineOf(isHex(n.stroke) && luminance(n.stroke) < 0.3 ? '#3b1d3a' : darken(saturate(n.stroke, 0.4), 0.3), Math.max(2.5 * olk, n.w), n.op);
        case 'detail': return { fill: isHex(n.fill) && luminance(n.fill) < 0.3 ? '#3b1d3a' : candy(n.fill), opacity: n.op };
        case 'bg': return { fill: isHex(n.fill) ? lighten(saturate(n.fill, 0.45), 0.12) : n.fill, opacity: n.op };
        case 'highlight': return { fill: '#ffffff', opacity: 0.85 };
        case 'shadow': return sh(s);
        case 'accent': return { fill: candy(n.fill), opacity: n.op };
        default:
          return { fill: candy(n.fill), opacity: n.op, stroke: isHex(n.fill) ? darken(saturate(n.fill, 0.4), 0.38) : '#3b1d3a', 'stroke-width': 2.8 * olk };
      }
    },
  },
};

// Distinct styles only; "alphabet" below is an accepted alias, not a 21st style.
export const STYLE_NAMES = Object.keys(STYLES);
STYLES.alphabet = STYLES.letterling;
export const isStyle = (name) => Object.hasOwn(STYLES, name);
export const getStyle = (name) => (isStyle(name) ? STYLES[name] : STYLES.flat);

