// PictoGen Alphabet Pals / Letterlings: Cute anthropomorphic letter creatures (A-Z)
// with big glossy kawaii eyes, sweet smiles, rosy blush cheeks, rigged noodle arms and cartoon feet.
import { INK } from '../core/styles.js';
import { drawFacialExpression } from './people.js';

export const LETTER_PALETTES = {
  A: { main: '#ff4d6d', dark: '#e11d48', shadow: '#be123c', accent: '#ffe4e6' }, // Strawberry Coral
  B: { main: '#0ea5e9', dark: '#0284c7', shadow: '#0369a1', accent: '#e0f2fe' }, // Sky Cyan
  C: { main: '#f59e0b', dark: '#d97706', shadow: '#b45309', accent: '#fef3c7' }, // Sunshine Gold
  D: { main: '#10b981', dark: '#059669', shadow: '#047857', accent: '#d1fae5' }, // Mint Green
  E: { main: '#8b5cf6', dark: '#7c3aed', shadow: '#6d28d9', accent: '#ede9fe' }, // Grape Purple
  F: { main: '#ec4899', dark: '#db2777', shadow: '#be185d', accent: '#fce7f3' }, // Bubblegum Pink
  G: { main: '#14b8a6', dark: '#0d9488', shadow: '#0f766e', accent: '#ccfbf1' }, // Teal
  H: { main: '#f97316', dark: '#ea580c', shadow: '#c2410c', accent: '#ffedd5' }, // Tangerine Orange
  I: { main: '#06b6d4', dark: '#0891b2', shadow: '#0e7490', accent: '#cffafe' }, // Bright Cyan
  J: { main: '#6366f1', dark: '#4f46e5', shadow: '#4338ca', accent: '#e0e7ff' }, // Indigo
  K: { main: '#84cc16', dark: '#65a30d', shadow: '#4d7c0f', accent: '#ecfccb' }, // Lime Green
  L: { main: '#d946ef', dark: '#c026d3', shadow: '#a21caf', accent: '#fae8ff' }, // Fuchsia
  M: { main: '#3b82f6', dark: '#2563eb', shadow: '#1d4ed8', accent: '#dbeafe' }, // Royal Blue
  N: { main: '#f43f5e', dark: '#e11d48', shadow: '#9f1239', accent: '#ffe4e6' }, // Rose Pink
  O: { main: '#eab308', dark: '#ca8a04', shadow: '#a16207', accent: '#fef9c3' }, // Sunflower Yellow
  P: { main: '#a855f7', dark: '#9333ea', shadow: '#7e22ce', accent: '#f3e8ff' }, // Lavender
  Q: { main: '#059669', dark: '#047857', shadow: '#065f46', accent: '#d1fae5' }, // Emerald
  R: { main: '#ea580c', dark: '#c2410c', shadow: '#9a3412', accent: '#ffedd5' }, // Flame Orange
  S: { main: '#0284c7', dark: '#0369a1', shadow: '#075985', accent: '#e0f2fe' }, // Ocean Blue
  T: { main: '#10b981', dark: '#059669', shadow: '#047857', accent: '#d1fae5' }, // Fresh Green
  U: { main: '#7c3aed', dark: '#6d28d9', shadow: '#5b21b6', accent: '#ede9fe' }, // Royal Violet
  V: { main: '#f43f5e', dark: '#e11d48', shadow: '#be123c', accent: '#ffe4e6' }, // Crimson Coral
  W: { main: '#2563eb', dark: '#1d4ed8', shadow: '#1e40af', accent: '#dbeafe' }, // Deep Blue
  X: { main: '#d97706', dark: '#b45309', shadow: '#92400e', accent: '#fef3c7' }, // Amber
  Y: { main: '#ec4899', dark: '#db2777', shadow: '#9d174d', accent: '#fce7f3' }, // Hot Pink
  Z: { main: '#6d28d9', dark: '#5b21b6', shadow: '#4c1d95', accent: '#ede9fe' }, // Deep Purple
};

/**
 * Draws the glyph silhouette for a given letter A-Z.
 */
function drawGlyphShape(d, letter, fill, stroke) {
  const o = { fill, stroke, sw: 2.5, strokeLinejoin: 'round', kind: 'body' };
  const cut = { fill: '#ffffff', stroke, sw: 2, strokeLinejoin: 'round', kind: 'bg' };

  switch (letter) {
    case 'A':
      d.path('M 50 16 L 80 78 L 63 78 L 56 62 L 44 62 L 37 78 L 20 78 Z', o);
      d.path('M 50 32 L 56 50 L 44 50 Z', cut);
      break;

    case 'B':
      d.path('M 22 16 H 58 C 74 16 74 46 58 46 C 76 46 76 78 58 78 H 22 Z', o);
      d.rect(34, 26, 18, 12, { ...cut, rx: 6 });
      d.rect(34, 54, 20, 14, { ...cut, rx: 7 });
      break;

    case 'C':
      d.path('M 74 30 C 66 15 32 15 24 38 C 16 62 26 78 48 78 C 66 78 74 66 74 62 L 60 58 C 58 64 52 66 44 66 C 34 66 32 50 34 40 C 38 28 54 26 62 34 Z', o);
      break;

    case 'D':
      d.path('M 24 16 H 54 C 78 16 78 78 54 78 H 24 Z', o);
      d.path('M 38 28 H 50 C 64 28 64 66 50 66 H 38 Z', cut);
      break;

    case 'E':
      d.path('M 24 16 H 74 V 28 H 40 V 42 H 68 V 52 H 40 V 66 H 76 V 78 H 24 Z', o);
      break;

    case 'F':
      d.path('M 24 16 H 74 V 28 H 40 V 43 H 68 V 55 H 40 V 78 H 24 Z', o);
      break;

    case 'G':
      d.path('M 74 30 C 66 15 32 15 24 38 C 16 62 26 78 48 78 C 68 78 76 66 76 50 H 50 V 62 H 62 C 60 66 54 66 46 66 C 34 66 32 50 34 40 C 38 28 54 26 62 34 Z', o);
      break;

    case 'H':
      d.rect(22, 16, 16, 62, { ...o, rx: 7 });
      d.rect(62, 16, 16, 62, { ...o, rx: 7 });
      d.rect(32, 42, 36, 14, { ...o, rx: 6 });
      break;

    case 'I':
      d.rect(26, 16, 48, 13, { ...o, rx: 6 });
      d.rect(42, 25, 16, 44, { ...o, rx: 6 });
      d.rect(26, 65, 48, 13, { ...o, rx: 6 });
      break;

    case 'J':
      d.rect(34, 16, 42, 13, { ...o, rx: 6 });
      d.path('M 62 25 V 60 C 62 76 44 80 32 76 C 22 72 22 62 22 62 L 36 58 C 36 64 42 66 48 66 C 52 66 52 60 52 56 V 25 Z', o);
      break;

    case 'K':
      d.rect(22, 16, 16, 62, { ...o, rx: 7 });
      d.path('M 36 49 L 68 18 H 82 L 48 54 Z', o);
      d.path('M 44 48 L 78 78 H 62 L 34 54 Z', o);
      break;

    case 'L':
      d.path('M 24 16 H 38 V 66 H 76 V 78 H 24 Z', o);
      break;

    case 'M':
      d.path('M 18 78 V 18 H 32 L 50 50 L 68 18 H 82 V 78 H 68 V 38 L 54 60 H 46 L 32 38 V 78 Z', o);
      break;

    case 'N':
      d.path('M 22 78 V 18 H 36 L 64 56 V 18 H 78 V 78 H 64 L 36 40 V 78 Z', o);
      break;

    case 'O':
      d.ellipse(50, 47, 28, 31, o);
      d.ellipse(50, 47, 13, 16, cut);
      break;

    case 'P':
      d.path('M 24 16 H 56 C 74 16 74 52 56 52 H 38 V 78 H 24 Z', o);
      d.rect(36, 26, 18, 16, { ...cut, rx: 6 });
      break;

    case 'Q':
      d.ellipse(48, 45, 27, 29, o);
      d.ellipse(48, 45, 12, 15, cut);
      d.path('M 54 60 Q 68 76 78 76 Q 80 72 72 62 Z', o);
      break;

    case 'R':
      d.path('M 24 16 H 56 C 74 16 74 48 56 48 H 38 V 78 H 24 Z', o);
      d.rect(36, 26, 18, 14, { ...cut, rx: 6 });
      d.path('M 44 46 L 76 78 H 60 L 36 50 Z', o);
      break;

    case 'S':
      d.path('M 70 30 C 70 17 36 15 32 28 C 28 40 70 42 68 62 C 66 76 34 82 24 68 L 36 58 C 40 66 54 66 56 59 C 58 51 22 47 24 30 C 26 15 54 10 74 20 Z', o);
      break;

    case 'T':
      d.rect(18, 16, 64, 14, { ...o, rx: 6 });
      d.rect(43, 27, 14, 51, { ...o, rx: 6 });
      break;

    case 'U':
      d.path('M 22 16 H 36 V 54 C 36 68 64 68 64 54 V 16 H 78 V 54 C 78 80 22 80 22 54 Z', o);
      break;

    case 'V':
      d.path('M 18 18 H 34 L 50 64 L 66 18 H 82 L 58 78 H 42 Z', o);
      break;

    case 'W':
      d.path('M 16 18 H 30 L 40 58 L 50 32 L 60 58 L 70 18 H 84 L 70 78 H 56 L 50 52 L 44 78 H 30 Z', o);
      break;

    case 'X':
      d.path('M 22 18 L 44 48 L 22 78 H 36 L 50 56 L 64 78 H 78 L 56 48 L 78 18 H 64 L 50 40 L 36 18 Z', o);
      break;

    case 'Y':
      d.path('M 22 18 L 44 46 V 78 H 56 V 46 L 78 18 H 62 L 50 34 L 38 18 Z', o);
      break;

    case 'Z':
      d.path('M 22 18 H 78 V 30 L 40 66 H 78 V 78 H 22 V 66 L 60 30 H 22 Z', o);
      break;

    default:
      d.circle(50, 48, 28, o);
      break;
  }
}

/**
 * Facial anchor coordinates for each letter (cx, cy).
 */
const FACE_ANCHORS = {
  A: [50, 44], B: [50, 36], C: [44, 45], D: [48, 46], E: [50, 46], F: [48, 38],
  G: [46, 45], H: [50, 48], I: [50, 45], J: [48, 42], K: [48, 46], L: [46, 48],
  M: [50, 46], N: [50, 46], O: [50, 46], P: [48, 36], Q: [48, 44], R: [48, 36],
  S: [48, 46], T: [50, 38], U: [50, 52], V: [50, 42], W: [50, 48], X: [50, 46],
  Y: [50, 34], Z: [50, 48],
};

/**
 * Draws glossy kawaii anime eyes, blush cheeks, and sweet mouth.
 */
function drawKawaiiFace(d, cx, cy, expr = 'happy') {
  // Soft pink blush cheeks
  d.circle(cx - 13.5, cy + 3.5, 3.2, { fill: '#ff8da1', opacity: 0.7, kind: 'accent' });
  d.circle(cx + 13.5, cy + 3.5, 3.2, { fill: '#ff8da1', opacity: 0.7, kind: 'accent' });

  // Big glossy anime eyes
  d.group({ class: 'pg-face-eyes' }, () => {
    if (expr === 'wink' || expr === 'winking') {
      // Left eye normal dot + shine, right eye playful arc
      d.circle(cx - 8, cy, 3.8, { fill: INK, kind: 'detail' });
      d.circle(cx - 9.2, cy - 1.2, 1.4, { fill: '#ffffff', kind: 'highlight' });
      d.path(`M ${cx + 4} ${cy} Q ${cx + 8} ${cy + 3.5} ${cx + 12} ${cy}`, { stroke: INK, sw: 2.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
    } else if (expr === 'laugh' || expr === 'laughing') {
      // Squinting happy curved arcs (^ ^)
      d.path(`M ${cx - 12} ${cy} Q ${cx - 8} ${cy - 4} ${cx - 4} ${cy}`, { stroke: INK, sw: 2.4, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      d.path(`M ${cx + 4} ${cy} Q ${cx + 8} ${cy - 4} ${cx + 12} ${cy}`, { stroke: INK, sw: 2.4, strokeLinecap: 'round', fill: 'none', kind: 'line' });
    } else if (expr === 'surprised') {
      // Big round open O eyes
      d.circle(cx - 8, cy, 4.2, { fill: INK, kind: 'detail' });
      d.circle(cx + 8, cy, 4.2, { fill: INK, kind: 'detail' });
      d.circle(cx - 9.2, cy - 1.2, 1.5, { fill: '#ffffff', kind: 'highlight' });
      d.circle(cx + 6.8, cy - 1.2, 1.5, { fill: '#ffffff', kind: 'highlight' });
    } else {
      // Standard large shiny kawaii eyes
      d.circle(cx - 8, cy, 3.8, { fill: INK, kind: 'detail' });
      d.circle(cx + 8, cy, 3.8, { fill: INK, kind: 'detail' });
      // Primary glossy reflection
      d.circle(cx - 9.2, cy - 1.2, 1.4, { fill: '#ffffff', kind: 'highlight' });
      d.circle(cx + 6.8, cy - 1.2, 1.4, { fill: '#ffffff', kind: 'highlight' });
      // Secondary micro sparkle
      d.circle(cx - 6.8, cy + 1.2, 0.7, { fill: '#ffffff', kind: 'highlight' });
      d.circle(cx + 9.2, cy + 1.2, 0.7, { fill: '#ffffff', kind: 'highlight' });
    }
  });

  // Expressive mouth
  d.group({ class: 'pg-face-mouth' }, () => {
    if (expr === 'laugh' || expr === 'laughing') {
      // Open grinning mouth with tongue
      d.path(`M ${cx - 5} ${cy + 3} Q ${cx} ${cy + 9} ${cx + 5} ${cy + 3} Z`, { fill: INK, kind: 'detail' });
      d.path(`M ${cx - 3} ${cy + 5.5} Q ${cx} ${cy + 9} ${cx + 3} ${cy + 5.5} Z`, { fill: '#ff758c', kind: 'accent' });
    } else if (expr === 'surprised') {
      d.ellipse(cx, cy + 5, 2.8, 3.6, { fill: INK, kind: 'detail' });
    } else {
      // Sweet kitty smile
      d.path(`M ${cx - 4.5} ${cy + 3.2} Q ${cx - 2} ${cy + 6} ${cx} ${cy + 3.8} Q ${cx + 2} ${cy + 6} ${cx + 4.5} ${cy + 3.2}`, {
        stroke: INK,
        sw: 2,
        strokeLinecap: 'round',
        fill: 'none',
        kind: 'line',
      });
    }
  });
}

/**
 * Main draw function for any Letterling creature.
 */
export function drawLetterCreature(d, p, letter = 'A') {
  const char = String(letter || 'A').toUpperCase();
  const pal = LETTER_PALETTES[char] || LETTER_PALETTES.A;
  const bodyColor = p.opts.color || pal.main;
  const anim = p.opts.animation;
  const animClass = anim ? `pg-anim-${anim}` : 'pg-anim-blink';
  const expr = p.opts.expression || p.expression || 'happy';
  const [fcx, fcy] = FACE_ANCHORS[char] || [50, 46];

  d.group({ class: animClass }, () => {
    // Soft baseline ground shadow
    d.ellipse(50, 94, 26, 4.5, { fill: '#000000', opacity: 0.14, kind: 'shadow' });

    // Rigged Legs and Shoes
    d.group({ class: 'pg-leg-left' }, () => {
      if (anim === 'sit' || anim === 'sitting') {
        d.polyline([[36, 78], [28, 86], [18, 86]], { stroke: INK, sw: 3.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.ellipse(18, 86, 4.5, 3.2, { fill: pal.dark, stroke: INK, sw: 2, kind: 'detail' });
      } else {
        d.line(36, 76, 36, 90, { stroke: INK, sw: 3.2, strokeLinecap: 'round', kind: 'line' });
        d.ellipse(34, 91, 5.5, 3.4, { fill: pal.dark, stroke: INK, sw: 2, kind: 'detail' });
      }
    });

    d.group({ class: 'pg-leg-right' }, () => {
      if (anim === 'sit' || anim === 'sitting') {
        d.polyline([[64, 78], [72, 86], [82, 86]], { stroke: INK, sw: 3.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.ellipse(82, 86, 4.5, 3.2, { fill: pal.dark, stroke: INK, sw: 2, kind: 'detail' });
      } else {
        d.line(64, 76, 64, 90, { stroke: INK, sw: 3.2, strokeLinecap: 'round', kind: 'line' });
        d.ellipse(66, 91, 5.5, 3.4, { fill: pal.dark, stroke: INK, sw: 2, kind: 'detail' });
      }
    });

    // Rigged Cartoon Arms with White Mitten Hands
    d.group({ class: 'pg-arm-left' }, () => {
      if (anim === 'wave') {
        d.path('M 22 46 Q 10 32 8 16', { stroke: INK, sw: 3.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(8, 16, 3.5, { fill: '#ffffff', stroke: INK, sw: 2, kind: 'detail' });
      } else if (anim === 'cheer' || anim === 'cheering' || anim === 'jump' || anim === 'jumping') {
        d.path('M 22 46 Q 10 26 12 12', { stroke: INK, sw: 3.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(12, 12, 3.5, { fill: '#ffffff', stroke: INK, sw: 2, kind: 'detail' });
      } else if (anim === 'point' || anim === 'pointing') {
        d.polyline([[22, 48], [10, 48], [4, 48]], { stroke: INK, sw: 3.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(4, 48, 3, { fill: '#ffffff', stroke: INK, sw: 2, kind: 'detail' });
      } else if (anim === 'hold' || anim === 'holding') {
        d.path('M 22 48 Q 28 58 38 58', { stroke: INK, sw: 3.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(38, 58, 3.2, { fill: '#ffffff', stroke: INK, sw: 2, kind: 'detail' });
      } else {
        d.path('M 22 48 Q 12 56 16 66', { stroke: INK, sw: 3.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(16, 66, 3.4, { fill: '#ffffff', stroke: INK, sw: 2, kind: 'detail' });
      }
    });

    d.group({ class: 'pg-arm-right' }, () => {
      if (anim === 'cheer' || anim === 'cheering' || anim === 'jump' || anim === 'jumping') {
        d.path('M 78 46 Q 90 26 88 12', { stroke: INK, sw: 3.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(88, 12, 3.5, { fill: '#ffffff', stroke: INK, sw: 2, kind: 'detail' });
      } else if (anim === 'hold' || anim === 'holding') {
        d.path('M 78 48 Q 72 58 62 58', { stroke: INK, sw: 3.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(62, 58, 3.2, { fill: '#ffffff', stroke: INK, sw: 2, kind: 'detail' });
      } else {
        d.path('M 78 48 Q 88 56 84 66', { stroke: INK, sw: 3.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(84, 66, 3.4, { fill: '#ffffff', stroke: INK, sw: 2, kind: 'detail' });
      }
    });

    // Rigged Body Torso & Glyph
    d.group({ class: 'pg-body-torso' }, () => {
      drawGlyphShape(d, char, bodyColor, INK);
      drawKawaiiFace(d, fcx, fcy, expr);
    });
  });
}

// Generate the 26 concept definitions (letter_a through letter_z)
const alphabetConcepts = [];
for (let i = 0; i < 26; i++) {
  const letter = String.fromCharCode(65 + i); // 'A' to 'Z'
  const id = `letter_${letter.toLowerCase()}`;
  const pal = LETTER_PALETTES[letter];

  alphabetConcepts.push({
    id,
    label: `Letter ${letter}`,
    category: 'alphabet',
    placement: 'ground',
    scale: 0.85,
    baseline: 94,
    width: 0.8,
    aliases: [
      `letter ${letter.toLowerCase()}`,
      `letter ${letter}`,
      `cute ${letter.toLowerCase()}`,
      `letterling ${letter.toLowerCase()}`,
      `alphabet ${letter.toLowerCase()}`,
    ],
    tags: ['alphabet', 'letter', 'letters', 'learning', 'kids', 'phonics', 'character', 'cute'],
    colors: { main: pal.main, dark: pal.dark },
    draw(d, p) {
      drawLetterCreature(d, p, letter);
    },
  });
}

export default alphabetConcepts;
