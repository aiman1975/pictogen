// People concepts with procedural facial mimics (expressions) and rigged animatable limbs.
import { INK } from '../core/styles.js';

export const SKIN_TONES = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
export const HAIR_COLORS = ['#4e342e', '#212121', '#795548', '#e6b94f', '#a1662f'];
const SHIRTS = ['#1e88e5', '#e53935', '#43a047', '#fb8c00', '#8e24aa', '#00897b'];
const DRESSES = ['#ec407a', '#ab47bc', '#e53935', '#42a5f5', '#26a69a'];

/** True when the figure is seen from behind (opts.view === 'back'): no face, back of the head. */
const fromBehind = (p) => p.opts.view === 'back';

/**
 * Draws expressive facial features (eyes, brows, mouth, cheeks) based on expression.
 * Supported expressions: 'happy', 'laugh', 'sad', 'surprised', 'wink', 'angry', 'talking', 'confused', 'skeptical', 'neutral'
 */
export function drawFacialExpression(d, p, cx = 50, cy = 28) {
  const expr = p.opts.expression || p.expression || 'happy';

  // Soft blush cheeks (hidden in outline/silhouette)
  if (expr !== 'angry' && expr !== 'mad' && expr !== 'skeptical' && expr !== 'suspicious') {
    d.circle(cx - 9.5, cy + 4.5, 2.6, { fill: '#ff8a80', opacity: 0.55, kind: 'accent' });
    d.circle(cx + 9.5, cy + 4.5, 2.6, { fill: '#ff8a80', opacity: 0.55, kind: 'accent' });
  }

  // --- EYES & BROWS ---
  d.group({ class: 'pg-face-eyes' }, () => {
    switch (expr) {
      case 'laugh':
      case 'laughing':
        // Happy curved squinting eyes (^ ^)
        d.path(`M${cx - 8} ${cy} Q${cx - 5.5} ${cy - 3.5} ${cx - 3} ${cy}`, { kind: 'line', stroke: INK, sw: 2 });
        d.path(`M${cx + 3} ${cy} Q${cx + 5.5} ${cy - 3.5} ${cx + 8} ${cy}`, { kind: 'line', stroke: INK, sw: 2 });
        break;

      case 'wink':
      case 'winking':
        // Left eye normal dot + shine, Right eye wink arc
        d.circle(cx - 5.5, cy, 2, { fill: INK, kind: 'detail' });
        d.circle(cx - 4.8, cy - 0.7, 0.7, { kind: 'highlight', opacity: 0.9 });
        d.path(`M${cx + 2.5} ${cy} Q${cx + 5.5} ${cy + 3.2} ${cx + 8.5} ${cy}`, { kind: 'line', stroke: INK, sw: 2 });
        break;

      case 'surprised':
      case 'shocked':
        // High raised surprised brows
        d.path(`M${cx - 8} ${cy - 4.5} Q${cx - 5.5} ${cy - 7} ${cx - 3} ${cy - 4.5}`, { kind: 'line', stroke: INK, sw: 1.5 });
        d.path(`M${cx + 3} ${cy - 4.5} Q${cx + 5.5} ${cy - 7} ${cx + 8} ${cy - 4.5}`, { kind: 'line', stroke: INK, sw: 1.5 });
        // Wide open round eyes
        d.circle(cx - 5.5, cy, 2.6, { fill: INK, kind: 'detail' });
        d.circle(cx + 5.5, cy, 2.6, { fill: INK, kind: 'detail' });
        d.circle(cx - 4.6, cy - 0.9, 0.9, { kind: 'highlight', opacity: 0.9 });
        d.circle(cx + 6.4, cy - 0.9, 0.9, { kind: 'highlight', opacity: 0.9 });
        break;

      case 'sad':
      case 'crying':
        // Worried / sad slanted brows
        d.line(cx - 8, cy - 3.5, cx - 3, cy - 5.5, { stroke: INK, sw: 1.5, kind: 'line' });
        d.line(cx + 8, cy - 3.5, cx + 3, cy - 5.5, { stroke: INK, sw: 1.5, kind: 'line' });
        // Lower eyes
        d.circle(cx - 5.5, cy + 0.5, 2, { fill: INK, kind: 'detail' });
        d.circle(cx + 5.5, cy + 0.5, 2, { fill: INK, kind: 'detail' });
        // Teardrop
        d.path(`M${cx - 8.5} ${cy + 3} Q${cx - 9.5} ${cy + 6} ${cx - 7} ${cy + 6} Q${cx - 6} ${cy + 4.5} ${cx - 8.5} ${cy + 3} Z`, {
          fill: '#4fc3f7',
          kind: 'accent',
        });
        break;

      case 'angry':
      case 'mad':
        // Slanted downward V angry brows
        d.line(cx - 8, cy - 6, cx - 2.5, cy - 3, { stroke: INK, sw: 2, kind: 'line' });
        d.line(cx + 8, cy - 6, cx + 2.5, cy - 3, { stroke: INK, sw: 2, kind: 'line' });
        // Fierce dot eyes
        d.circle(cx - 5.5, cy + 0.5, 2, { fill: INK, kind: 'detail' });
        d.circle(cx + 5.5, cy + 0.5, 2, { fill: INK, kind: 'detail' });
        break;

      case 'confused':
      case 'puzzled':
        // Asymmetric brows (one slanted, one raised high)
        d.line(cx - 8, cy - 5, cx - 3, cy - 3.5, { stroke: INK, sw: 1.8, kind: 'line' });
        d.path(`M${cx + 2.5} ${cy - 6} Q${cx + 5.5} ${cy - 8} ${cx + 8.5} ${cy - 5.5}`, { kind: 'line', stroke: INK, sw: 1.8 });
        d.circle(cx - 5.5, cy, 2, { fill: INK, kind: 'detail' });
        d.circle(cx + 5.5, cy, 2, { fill: INK, kind: 'detail' });
        break;

      case 'skeptical':
      case 'suspicious':
        // Flat half-lid suspicious brows
        d.line(cx - 8.5, cy - 3, cx - 2.5, cy - 3, { stroke: INK, sw: 2.2, kind: 'line' });
        d.line(cx + 2.5, cy - 4, cx + 8.5, cy - 3, { stroke: INK, sw: 2.2, kind: 'line' });
        d.circle(cx - 4.5, cy + 0.5, 1.9, { fill: INK, kind: 'detail' });
        d.circle(cx + 6.2, cy + 0.5, 1.9, { fill: INK, kind: 'detail' });
        break;

      default: // 'happy' or 'neutral'
        d.circle(cx - 5.5, cy, 2, { fill: INK, kind: 'detail' });
        d.circle(cx + 5.5, cy, 2, { fill: INK, kind: 'detail' });
        d.circle(cx - 4.8, cy - 0.7, 0.7, { kind: 'highlight', opacity: 0.9 });
        d.circle(cx + 6.2, cy - 0.7, 0.7, { kind: 'highlight', opacity: 0.9 });
        break;
    }
  });

  // --- MOUTH ---
  d.group({ class: 'pg-face-mouth' }, () => {
    switch (expr) {
      case 'laugh':
      case 'laughing':
        // Open wide laughing mouth with tongue
        d.path(`M${cx - 6} ${cy + 4.5} Q${cx} ${cy + 13} ${cx + 6} ${cy + 4.5} Z`, { fill: '#c62828', kind: 'body' });
        d.path(`M${cx - 3.5} ${cy + 9} Q${cx} ${cy + 11.5} ${cx + 3.5} ${cy + 9} Z`, { fill: '#ff8a80', kind: 'accent' });
        d.path(`M${cx - 5} ${cy + 5.5} Q${cx} ${cy + 6.5} ${cx + 5} ${cy + 5.5}`, { kind: 'line', stroke: '#ffffff', sw: 1.5 });
        break;

      case 'surprised':
      case 'shocked':
        // Open 'O' mouth
        d.ellipse(cx, cy + 6.5, 2.5, 4, { fill: INK, kind: 'detail' });
        break;

      case 'sad':
      case 'crying':
        // Downward frown
        d.path(`M${cx - 5} ${cy + 8} Q${cx} ${cy + 4} ${cx + 5} ${cy + 8}`, { kind: 'line', stroke: INK, sw: 2 });
        break;

      case 'angry':
      case 'mad':
        // Tight grimace curve
        d.path(`M${cx - 5} ${cy + 7} Q${cx} ${cy + 5} ${cx + 5} ${cy + 7}`, { kind: 'line', stroke: INK, sw: 2 });
        break;

      case 'wink':
      case 'winking':
        // Playful smirk
        d.path(`M${cx - 4} ${cy + 6} Q${cx} ${cy + 7.5} ${cx + 6} ${cy + 4.5}`, { kind: 'line', stroke: INK, sw: 2 });
        break;

      case 'confused':
      case 'puzzled':
        // Squiggly confused mouth (Quadrant 2)
        d.path(`M${cx - 5.5} ${cy + 6.5} Q${cx - 2.5} ${cy + 4.5} ${cx} ${cy + 6.5} Q${cx + 2.5} ${cy + 8.5} ${cx + 5.5} ${cy + 6.5}`, { kind: 'line', stroke: INK, sw: 2 });
        break;

      case 'skeptical':
      case 'suspicious':
        // Flat slanted side-mouth (Quadrant 2)
        d.line(cx - 5, cy + 7, cx + 5, cy + 5.5, { kind: 'line', stroke: INK, sw: 2 });
        break;

      case 'neutral':
      case 'calm':
        // Straight neutral line
        d.line(cx - 4.5, cy + 6.5, cx + 4.5, cy + 6.5, { kind: 'line', stroke: INK, sw: 2 });
        break;

      case 'talking':
      case 'speaking':
        // Speaking open mouth
        d.ellipse(cx, cy + 6, 4, 3, { fill: INK, kind: 'detail' });
        d.ellipse(cx, cy + 7, 2.5, 1.5, { fill: '#ff8a80', kind: 'accent' });
        break;

      default: // 'happy'
        // Friendly smile
        d.path(`M${cx - 5} ${cy + 5.5} Q${cx} ${cy + 9.5} ${cx + 5} ${cy + 5.5}`, { kind: 'line', stroke: INK, sw: 1.8 });
        break;
    }
  });
}

/**
 * Helper for minimalist line-art faces used by Stickman, Whiteboard, and Doodle styles.
 * Wraps eyes in .pg-face-eyes and mouth in .pg-face-mouth for CSS animation compatibility.
 */
function drawMinimalFace(d, cx, cy, expr, strokeColor = '#000000') {
  d.group({ class: 'pg-face-eyes' }, () => {
    if (expr === 'laugh' || expr === 'laughing') {
      d.path(`M${cx - 8} ${cy} Q${cx - 5.5} ${cy - 4} ${cx - 3} ${cy}`, { stroke: strokeColor, sw: 2.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      d.path(`M${cx + 3} ${cy} Q${cx + 5.5} ${cy - 4} ${cx + 8} ${cy}`, { stroke: strokeColor, sw: 2.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
    } else if (expr === 'wink' || expr === 'winking') {
      d.circle(cx - 6, cy, 2.2, { fill: strokeColor, kind: 'detail' });
      d.path(`M${cx + 3} ${cy} Q${cx + 6} ${cy + 3} ${cx + 9} ${cy}`, { stroke: strokeColor, sw: 2.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
    } else {
      d.circle(cx - 6, cy, expr === 'surprised' || expr === 'shocked' ? 2.8 : 2.2, { fill: strokeColor, kind: 'detail' });
      d.circle(cx + 6, cy, expr === 'surprised' || expr === 'shocked' ? 2.8 : 2.2, { fill: strokeColor, kind: 'detail' });
      if (expr === 'angry' || expr === 'mad') {
        d.line(cx - 9, cy - 5, cx - 3, cy - 2.5, { stroke: strokeColor, sw: 2.2, strokeLinecap: 'round', kind: 'line' });
        d.line(cx + 9, cy - 5, cx + 3, cy - 2.5, { stroke: strokeColor, sw: 2.2, strokeLinecap: 'round', kind: 'line' });
      } else if (expr === 'sad' || expr === 'crying') {
        d.line(cx - 9, cy - 2.5, cx - 3, cy - 5, { stroke: strokeColor, sw: 2, strokeLinecap: 'round', kind: 'line' });
        d.line(cx + 9, cy - 2.5, cx + 3, cy - 5, { stroke: strokeColor, sw: 2, strokeLinecap: 'round', kind: 'line' });
      } else if (expr === 'confused' || expr === 'puzzled') {
        d.line(cx - 9, cy - 4, cx - 4, cy - 1.5, { stroke: strokeColor, sw: 2, strokeLinecap: 'round', kind: 'line' });
        d.line(cx + 4, cy - 5.5, cx + 9, cy - 5.5, { stroke: strokeColor, sw: 2, strokeLinecap: 'round', kind: 'line' });
      } else if (expr === 'skeptical' || expr === 'suspicious') {
        d.line(cx - 9, cy - 3.5, cx - 3, cy - 3.5, { stroke: strokeColor, sw: 2.2, strokeLinecap: 'round', kind: 'line' });
        d.line(cx + 3, cy - 4.5, cx + 9, cy - 3.5, { stroke: strokeColor, sw: 2.2, strokeLinecap: 'round', kind: 'line' });
      } else if (expr === 'surprised' || expr === 'shocked') {
        d.path(`M${cx - 9} ${cy - 4.5} Q${cx - 6} ${cy - 7.5} ${cx - 3} ${cy - 4.5}`, { stroke: strokeColor, sw: 2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.path(`M${cx + 3} ${cy - 4.5} Q${cx + 6} ${cy - 7.5} ${cx + 9} ${cy - 4.5}`, { stroke: strokeColor, sw: 2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      }
    }
  });

  d.group({ class: 'pg-face-mouth' }, () => {
    if (expr === 'laugh' || expr === 'laughing') {
      d.path(`M${cx - 6} ${cy + 5} Q${cx} ${cy + 13} ${cx + 6} ${cy + 5} Z`, { fill: strokeColor, stroke: strokeColor, sw: 1.5, kind: 'detail' });
    } else if (expr === 'sad' || expr === 'crying') {
      d.path(`M${cx - 6} ${cy + 8} Q${cx} ${cy + 4} ${cx + 6} ${cy + 8}`, { stroke: strokeColor, sw: 2.5, strokeLinecap: 'round', fill: 'none', kind: 'line' });
    } else if (expr === 'angry' || expr === 'mad' || expr === 'skeptical' || expr === 'suspicious') {
      d.line(cx - 5, cy + 7, cx + 5, cy + 5, { stroke: strokeColor, sw: 2.4, strokeLinecap: 'round', kind: 'line' });
    } else if (expr === 'confused' || expr === 'puzzled') {
      d.path(`M${cx - 6} ${cy + 7} Q${cx - 3} ${cy + 5} ${cx} ${cy + 7} Q${cx + 3} ${cy + 9} ${cx + 6} ${cy + 7}`, { stroke: strokeColor, sw: 2.4, strokeLinecap: 'round', fill: 'none', kind: 'line' });
    } else if (expr === 'surprised' || expr === 'shocked') {
      d.circle(cx, cy + 6.5, 3, { fill: strokeColor, kind: 'detail' });
    } else if (expr === 'talking' || expr === 'speaking') {
      d.ellipse(cx, cy + 6.5, 4, 2.6, { fill: strokeColor, kind: 'detail' });
    } else if (expr === 'happy' || expr === 'wink' || expr === 'winking') {
      d.path(`M${cx - 6} ${cy + 5} Q${cx} ${cy + 10} ${cx + 6} ${cy + 5}`, { stroke: strokeColor, sw: 2.4, strokeLinecap: 'round', fill: 'none', kind: 'line' });
    } else {
      // Neutral line mouth (exact Image 1)
      d.line(cx - 7, cy + 6, cx + 7, cy + 6, { stroke: strokeColor, sw: 2.8, strokeLinecap: 'round', kind: 'line' });
    }
  });
}

/**
 * Draws the pure minimalist Stick Figure (Style 1 from roadmap / Image 1).
 * Features clean circle head, dot eyes, neutral/expressive mouth, single spine, and stick limbs.
 */
export function drawStickPerson(d, p, role = 'boy') {
  const anim = p.opts.animation;
  const animClass = anim ? `pg-anim-${anim}` : 'pg-anim-blink';
  const expr = p.opts.expression || p.expression || 'happy';
  const sw = 3.6;

  d.group({ class: animClass }, () => {
    // Legs rigged with joint pivots
    d.group({ class: 'pg-leg-left' }, () => {
      if (anim === 'sit' || anim === 'sitting') {
        d.polyline([[50, 66], [40, 80], [30, 80]], { stroke: '#000000', sw, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      } else {
        d.line(50, 66, 38, 95, { stroke: '#000000', sw, strokeLinecap: 'round', kind: 'line' });
        d.line(38, 95, 33, 95, { stroke: '#000000', sw: 3, strokeLinecap: 'round', kind: 'line' });
      }
    });
    d.group({ class: 'pg-leg-right' }, () => {
      if (anim === 'sit' || anim === 'sitting') {
        d.polyline([[50, 66], [58, 80], [68, 80]], { stroke: '#000000', sw, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      } else {
        d.line(50, 66, 62, 95, { stroke: '#000000', sw, strokeLinecap: 'round', kind: 'line' });
        d.line(62, 95, 67, 95, { stroke: '#000000', sw: 3, strokeLinecap: 'round', kind: 'line' });
      }
    });

    // Arms (Quadrant 3 Actions: wave, point, thumbsup, hold, cheer, jump, dance, think, or idle)
    d.group({ class: 'pg-arm-left' }, () => {
      if (anim === 'wave') {
        d.path('M 50 42 Q 34 30 30 16', { stroke: '#000000', sw: 3.4, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(30, 16, 2.8, { fill: '#ffffff', stroke: '#000000', sw: 2.2, kind: 'body' });
      } else if (anim === 'point' || anim === 'pointing') {
        d.polyline([[50, 42], [32, 45], [16, 45]], { stroke: '#000000', sw: 3.4, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(16, 45, 3, { fill: '#ffffff', stroke: '#000000', sw: 2.2, kind: 'body' });
        d.line(13, 45, 7, 45, { stroke: '#000000', sw: 2.6, strokeLinecap: 'round', kind: 'line' });
      } else if (anim === 'thumbsup') {
        d.polyline([[50, 42], [35, 50], [32, 36]], { stroke: '#000000', sw: 3.4, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(32, 36, 3.2, { fill: '#ffffff', stroke: '#000000', sw: 2.2, kind: 'body' });
        d.line(32, 33, 32, 27, { stroke: '#000000', sw: 2.6, strokeLinecap: 'round', kind: 'line' });
      } else if (anim === 'hold' || anim === 'holding') {
        d.polyline([[50, 42], [34, 52], [42, 56]], { stroke: '#000000', sw: 3.4, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(42, 56, 2.8, { fill: '#ffffff', stroke: '#000000', sw: 2.2, kind: 'body' });
      } else if (anim === 'cheer' || anim === 'cheering' || anim === 'jump' || anim === 'jumping') {
        d.path('M 50 42 Q 35 28 26 14', { stroke: '#000000', sw: 3.4, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(26, 14, 2.8, { fill: '#ffffff', stroke: '#000000', sw: 2.2, kind: 'body' });
      } else if (anim === 'dance' || anim === 'dancing') {
        d.path('M 50 42 Q 30 32 24 20', { stroke: '#000000', sw: 3.4, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(24, 20, 2.8, { fill: '#ffffff', stroke: '#000000', sw: 2.2, kind: 'body' });
      } else if (anim === 'think' || anim === 'thinking') {
        d.polyline([[50, 42], [36, 48], [42, 30]], { stroke: '#000000', sw: 3.4, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(42, 30, 2.8, { fill: '#ffffff', stroke: '#000000', sw: 2.2, kind: 'body' });
      } else {
        d.line(50, 42, 36, 72, { stroke: '#000000', sw: 3.4, strokeLinecap: 'round', kind: 'line' });
      }
    });
    d.group({ class: 'pg-arm-right' }, () => {
      if (anim === 'hold' || anim === 'holding') {
        d.polyline([[50, 42], [66, 52], [58, 56]], { stroke: '#000000', sw: 3.4, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(58, 56, 2.8, { fill: '#ffffff', stroke: '#000000', sw: 2.2, kind: 'body' });
      } else if (anim === 'cheer' || anim === 'cheering' || anim === 'jump' || anim === 'jumping') {
        d.path('M 50 42 Q 65 28 74 14', { stroke: '#000000', sw: 3.4, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(74, 14, 2.8, { fill: '#ffffff', stroke: '#000000', sw: 2.2, kind: 'body' });
      } else if (anim === 'dance' || anim === 'dancing') {
        d.polyline([[50, 42], [68, 56], [62, 68]], { stroke: '#000000', sw: 3.4, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(62, 68, 2.8, { fill: '#ffffff', stroke: '#000000', sw: 2.2, kind: 'body' });
      } else {
        d.line(50, 42, 64, 72, { stroke: '#000000', sw: 3.4, strokeLinecap: 'round', kind: 'line' });
      }
    });

    // Torso Spine & Head
    d.group({ class: 'pg-body-torso' }, () => {
      d.line(50, 35, 50, 66, { stroke: '#000000', sw: 4.2, strokeLinecap: 'round', kind: 'line' });
      d.circle(50, 20, 15.5, { fill: '#ffffff', stroke: '#000000', sw: 3.5, kind: 'body' });

      if (role === 'girl' || role === 'woman') {
        d.path('M36 18 Q30 28 32 32', { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.path('M64 18 Q70 28 68 32', { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      }

      if (!fromBehind(p)) drawMinimalFace(d, 50, 18, expr, '#000000');
    });
  });
}

/**
 * Draws Cute 2D (Kawaii) round bouncing ball characters (Style 2 from roadmap / Image 3).
 * Features spherical pastel bodies, tiny dot eyes, sweet smile, pink blush cheeks, raised stick arms with dot hands.
 */
export function drawCutePerson(d, p, role = 'boy') {
  const anim = p.opts.animation;
  const animClass = anim ? `pg-anim-${anim}` : 'pg-anim-blink';
  const expr = p.opts.expression || p.expression || 'happy';
  const bodyColor = p.opts.color || (role === 'girl' ? '#fbcfe8' : role === 'man' ? '#ffffff' : role === 'woman' ? '#f5d0fe' : '#7dd3fc');

  d.group({ class: animClass }, () => {
    d.ellipse(50, 95, 17, 3.8, { fill: '#000000', opacity: 0.16, kind: 'shadow' });

    d.group({ class: 'pg-leg-left' }, () => {
      d.path('M 43 65 Q 40 76 38 88', { stroke: '#000000', sw: 3.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      d.circle(38, 88, 3.8, { fill: '#000000', kind: 'detail' });
    });
    d.group({ class: 'pg-leg-right' }, () => {
      d.path('M 57 65 Q 60 76 62 88', { stroke: '#000000', sw: 3.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      d.circle(62, 88, 3.8, { fill: '#000000', kind: 'detail' });
    });

    d.group({ class: 'pg-arm-left' }, () => {
      if (anim === 'point' || anim === 'pointing') {
        d.path('M 24 42 L 10 42', { stroke: '#000000', sw: 3.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(12, 42, 3.4, { fill: '#000000', kind: 'detail' });
        d.line(9, 42, 4, 42, { stroke: '#000000', sw: 2.6, strokeLinecap: 'round', kind: 'line' });
      } else if (anim === 'thumbsup') {
        d.path('M 24 42 Q 15 44 16 32', { stroke: '#000000', sw: 3.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(16, 32, 3.4, { fill: '#000000', kind: 'detail' });
        d.line(16, 29, 16, 24, { stroke: '#000000', sw: 2.6, strokeLinecap: 'round', kind: 'line' });
      } else if (anim === 'hold' || anim === 'holding') {
        d.path('M 26 44 Q 32 54 42 54', { stroke: '#000000', sw: 3.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(42, 54, 3.4, { fill: '#000000', kind: 'detail' });
      } else {
        d.path('M 26 40 Q 14 30 18 16', { stroke: '#000000', sw: 3.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(18, 16, 3.4, { fill: '#000000', kind: 'detail' });
      }
    });
    d.group({ class: 'pg-arm-right' }, () => {
      if (anim === 'hold' || anim === 'holding') {
        d.path('M 74 44 Q 68 54 58 54', { stroke: '#000000', sw: 3.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(58, 54, 3.4, { fill: '#000000', kind: 'detail' });
      } else {
        d.path('M 74 40 Q 86 30 82 16', { stroke: '#000000', sw: 3.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.circle(82, 16, 3.4, { fill: '#000000', kind: 'detail' });
      }
    });

    d.group({ class: 'pg-body-torso' }, () => {
      d.circle(50, 41, 27, { fill: bodyColor, stroke: '#000000', sw: 3.6, kind: 'body' });
      d.path('M 25 47 A 27 27 0 0 0 74 46 A 25 25 0 0 1 25 47 Z', { fill: '#000000', opacity: 0.12, kind: 'shadow' });

      if (!fromBehind(p)) {
        d.circle(38, 42, 3.8, { fill: '#f472b6', opacity: 0.65, kind: 'accent' });
        d.circle(62, 42, 3.8, { fill: '#f472b6', opacity: 0.65, kind: 'accent' });
        drawMinimalFace(d, 50, 38, expr === 'happy' && (role === 'girl' || role === 'woman') ? 'laugh' : expr, '#000000');
      }
    });
  });
}

/**
 * Draws Whiteboard Marker Character (Style 4 from roadmap).
 * Clean marker head & rectangular shirt torso with bold dry-erase strokes.
 */
export function drawWhiteboardPerson(d, p, role = 'boy') {
  const anim = p.opts.animation;
  const animClass = anim ? `pg-anim-${anim}` : 'pg-anim-blink';
  const expr = p.opts.expression || p.expression || 'happy';
  const accent = role === 'girl' || role === 'woman' ? '#f97316' : '#0284c7';

  d.group({ class: animClass }, () => {
    d.group({ class: 'pg-leg-left' }, () => {
      d.line(44, 68, 41, 93, { stroke: '#0f172a', sw: 3.6, strokeLinecap: 'round', kind: 'line' });
      d.line(41, 93, 35, 93, { stroke: '#0f172a', sw: 3.4, strokeLinecap: 'round', kind: 'line' });
    });
    d.group({ class: 'pg-leg-right' }, () => {
      d.line(56, 68, 59, 93, { stroke: '#0f172a', sw: 3.6, strokeLinecap: 'round', kind: 'line' });
      d.line(59, 93, 65, 93, { stroke: '#0f172a', sw: 3.4, strokeLinecap: 'round', kind: 'line' });
    });

    d.group({ class: 'pg-arm-left' }, () => {
      if (anim === 'point' || anim === 'pointing') {
        d.polyline([[37, 45], [22, 45], [12, 45]], { stroke: '#0f172a', sw: 3.4, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      } else if (anim === 'thumbsup') {
        d.polyline([[37, 45], [26, 48], [26, 35]], { stroke: '#0f172a', sw: 3.4, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      } else if (anim === 'hold' || anim === 'holding') {
        d.polyline([[37, 45], [28, 54], [40, 56]], { stroke: '#0f172a', sw: 3.4, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      } else if (anim === 'wave') {
        d.path('M37 45 Q24 34 24 20', { stroke: '#0f172a', sw: 3.4, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      } else {
        d.line(37, 45, 29, 66, { stroke: '#0f172a', sw: 3.4, strokeLinecap: 'round', kind: 'line' });
      }
    });
    d.group({ class: 'pg-arm-right' }, () => {
      if (anim === 'hold' || anim === 'holding') {
        d.polyline([[63, 45], [72, 54], [60, 56]], { stroke: '#0f172a', sw: 3.4, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      } else {
        d.line(63, 45, 71, 66, { stroke: '#0f172a', sw: 3.4, strokeLinecap: 'round', kind: 'line' });
      }
    });

    d.group({ class: 'pg-body-torso' }, () => {
      d.rect(37, 40, 26, 28, { fill: '#ffffff', stroke: '#0f172a', sw: 3.5, rx: 4, kind: 'body' });
      // Marker tie / collar highlight
      d.path('M45 40 L50 47 L55 40', { stroke: accent, sw: 2.8, fill: 'none', kind: 'line' });
      d.circle(50, 23, 15, { fill: '#ffffff', stroke: '#0f172a', sw: 3.5, kind: 'body' });
      if (!fromBehind(p)) drawMinimalFace(d, 50, 22, expr, '#0f172a');
    });
  });
}

/**
 * Draws Geometric Bauhaus vector characters (Style 5 from roadmap).
 */
export function drawGeometricPerson(d, p, role = 'boy') {
  const anim = p.opts.animation;
  const animClass = anim ? `pg-anim-${anim}` : 'pg-anim-blink';
  const expr = p.opts.expression || p.expression || 'happy';
  const primary = role === 'girl' ? '#ea580c' : role === 'man' ? '#1d4ed8' : role === 'woman' ? '#b45309' : '#0284c7';
  const secondary = role === 'girl' ? '#fb923c' : '#38bdf8';

  d.group({ class: animClass }, () => {
    d.group({ class: 'pg-leg-left' }, () => {
      d.rect(38, 72, 10, 22, { fill: primary, kind: 'body' });
    });
    d.group({ class: 'pg-leg-right' }, () => {
      d.rect(52, 72, 10, 22, { fill: primary, kind: 'body' });
    });
    d.group({ class: 'pg-arm-left' }, () => {
      if (anim === 'point' || anim === 'pointing') {
        d.rect(12, 44, 24, 9, { fill: secondary, kind: 'body' });
      } else if (anim === 'thumbsup' || anim === 'wave') {
        d.rect(22, 26, 11, 24, { fill: secondary, kind: 'body' });
      } else if (anim === 'hold' || anim === 'holding') {
        d.rect(20, 50, 22, 9, { fill: secondary, kind: 'body' });
      } else {
        d.rect(22, 46, 12, 24, { fill: secondary, kind: 'body' });
      }
    });
    d.group({ class: 'pg-arm-right' }, () => {
      if (anim === 'hold' || anim === 'holding') {
        d.rect(58, 50, 22, 9, { fill: secondary, kind: 'body' });
      } else {
        d.rect(66, 46, 12, 24, { fill: secondary, kind: 'body' });
      }
    });
    d.group({ class: 'pg-body-torso' }, () => {
      d.rect(36, 42, 28, 32, { fill: primary, kind: 'body' });
      d.circle(50, 24, 16, { fill: '#f97316', kind: 'body' });
      d.rect(42, 10, 16, 6, { fill: '#1e3a8a', kind: 'body' });
      if (!fromBehind(p)) drawMinimalFace(d, 50, 23, expr, '#0f172a');
    });
  });
}

/**
 * Draws Hand-Drawn Sketchbook Doodle characters (Style 6 from roadmap).
 * Features boxy rounded head, spiky messy ink hair, dark ink shirt, and expressive doodle face.
 */
export function drawDoodlePerson(d, p, role = 'boy') {
  const anim = p.opts.animation;
  const animClass = anim ? `pg-anim-${anim}` : 'pg-anim-blink';
  const expr = p.opts.expression || p.expression || 'happy';

  d.group({ class: animClass }, () => {
    d.group({ class: 'pg-leg-left' }, () => {
      d.line(44, 68, 42, 93, { stroke: '#1e293b', sw: 3, strokeLinecap: 'round', kind: 'line' });
      d.ellipse(39, 94, 5, 2.5, { fill: '#1e293b', kind: 'detail' });
    });
    d.group({ class: 'pg-leg-right' }, () => {
      d.line(56, 68, 58, 93, { stroke: '#1e293b', sw: 3, strokeLinecap: 'round', kind: 'line' });
      d.ellipse(61, 94, 5, 2.5, { fill: '#1e293b', kind: 'detail' });
    });

    d.group({ class: 'pg-arm-left' }, () => {
      if (anim === 'point' || anim === 'pointing') {
        d.polyline([[36, 46], [20, 46], [10, 46]], { stroke: '#1e293b', sw: 2.8, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      } else if (anim === 'thumbsup' || anim === 'wave') {
        d.path('M36 46 Q24 34 25 20', { stroke: '#1e293b', sw: 2.8, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      } else if (anim === 'hold' || anim === 'holding') {
        d.polyline([[36, 46], [28, 54], [40, 56]], { stroke: '#1e293b', sw: 2.8, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      } else {
        d.path('M36 46 Q30 58 32 68', { stroke: '#1e293b', sw: 2.8, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      }
    });
    d.group({ class: 'pg-arm-right' }, () => {
      if (anim === 'hold' || anim === 'holding') {
        d.polyline([[64, 46], [72, 54], [60, 56]], { stroke: '#1e293b', sw: 2.8, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      } else {
        d.path('M64 46 Q70 58 68 68', { stroke: '#1e293b', sw: 2.8, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      }
    });

    d.group({ class: 'pg-body-torso' }, () => {
      // Sketchy ink-filled torso shirt
      d.rect(36, 41, 28, 27, { fill: '#334155', stroke: '#1e293b', sw: 2.8, rx: 3, kind: 'body' });
      // Boxy rounded sketchbook head
      d.rect(34, 13, 32, 27, { fill: '#fffdfa', stroke: '#1e293b', sw: 2.8, rx: 7, kind: 'body' });
      // Spiky messy sketchbook hair
      d.path('M36 14 L40 7 L45 13 L50 6 L55 13 L60 7 L64 14', { stroke: '#1e293b', sw: 2.6, fill: 'none', kind: 'line' });
      if (!fromBehind(p)) drawMinimalFace(d, 50, 25, expr, '#1e293b');
    });
  });
}

/**
 * Draws Editorial Cartoon Silhouettes (Style 7 from roadmap / Image 2).
 * Features spindly stick legs, solid black silhouettes, walking dresses with windblown hair, and finger notches.
 */
export function drawEditorialPerson(d, p, role = 'boy') {
  const anim = p.opts.animation;
  const animClass = anim ? `pg-anim-${anim}` : 'pg-anim-blink';
  const expr = p.opts.expression || p.expression || 'happy';

  d.group({ class: animClass }, () => {
    if (role === 'girl' || role === 'woman') {
      // 3rd figure from Image 2: Walking silhouette in A-line dress with pointy nose & windblown hair
      d.group({ class: 'pg-leg-left' }, () => {
        d.line(52, 68, 63, 94, { stroke: '#000000', sw: 2.5, strokeLinecap: 'round', kind: 'line' });
        d.path('M63 94 L69 91 L67 89', { stroke: '#000000', sw: 2, fill: 'none', kind: 'line' });
      });
      d.group({ class: 'pg-leg-right' }, () => {
        d.line(46, 68, 38, 94, { stroke: '#000000', sw: 2.5, strokeLinecap: 'round', kind: 'line' });
        d.path('M38 94 L33 94 L33 91', { stroke: '#000000', sw: 2, fill: 'none', kind: 'line' });
      });

      d.group({ class: 'pg-arm-left' }, () => {
        if (anim === 'point' || anim === 'pointing' || anim === 'hold' || anim === 'holding') {
          d.line(52, 38, 74, 38, { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', kind: 'line' });
        } else {
          d.path('M50 38 Q58 50 64 60', { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
          d.path('M63 58 L66 61 L64 63', { stroke: '#000000', sw: 1.8, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        }
      });
      d.group({ class: 'pg-arm-right' }, () => {
        d.path('M48 38 Q42 50 38 58', { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.path('M37 56 L35 59 L38 60', { stroke: '#000000', sw: 1.8, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      });

      d.group({ class: 'pg-body-torso' }, () => {
        d.poly([[49, 34], [55, 34], [63, 68], [41, 68]], { fill: '#000000', kind: 'body' });
        d.path('M48 14 A 9 9 0 0 1 57 23 L62 24 L57 26 A 9 9 0 0 1 48 32 A 9 9 0 0 1 48 14 Z', { fill: '#000000', kind: 'body' });
        d.line(46, 17, 33, 11, { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', kind: 'line' });
        d.line(47, 20, 31, 16, { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', kind: 'line' });
        d.line(46, 23, 30, 21, { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', kind: 'line' });
        d.line(47, 26, 32, 27, { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', kind: 'line' });
        d.line(48, 29, 35, 32, { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', kind: 'line' });
      });
    } else if (expr === 'sad' || role === 'man') {
      // 2nd figure from Image 2: Hunched silhouette with slumped posture & hair wisps
      d.group({ class: 'pg-leg-left' }, () => {
        d.line(48, 62, 48, 95, { stroke: '#000000', sw: 2.4, strokeLinecap: 'round', kind: 'line' });
        d.path('M48 95 L42 95 L42 92', { stroke: '#000000', sw: 2, fill: 'none', kind: 'line' });
      });
      d.group({ class: 'pg-leg-right' }, () => {
        d.line(52, 62, 52, 95, { stroke: '#000000', sw: 2.4, strokeLinecap: 'round', kind: 'line' });
        d.path('M52 95 L57 95 L57 92', { stroke: '#000000', sw: 2, fill: 'none', kind: 'line' });
      });

      d.group({ class: 'pg-arm-left' }, () => {
        if (anim === 'point' || anim === 'pointing' || anim === 'hold' || anim === 'holding') {
          d.line(47, 34, 22, 36, { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', kind: 'line' });
        } else {
          d.path('M47 32 Q42 48 44 64', { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
          d.path('M43 62 L44 66 L46 63', { stroke: '#000000', sw: 1.8, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        }
      });
      d.group({ class: 'pg-arm-right' }, () => {
        d.path('M53 32 Q58 48 56 64', { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.path('M54 62 L56 66 L58 63', { stroke: '#000000', sw: 1.8, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      });

      d.group({ class: 'pg-body-torso' }, () => {
        d.path('M48 30 Q44 45 47 62 L53 62 Q50 45 54 30 Z', { fill: '#000000', kind: 'body' });
        d.ellipse(54, 23, 9, 11, { fill: '#000000', kind: 'body' });
        d.path('M51 14 Q59 12 63 19', { stroke: '#000000', sw: 2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        d.path('M56 13 Q62 16 63 22', { stroke: '#000000', sw: 1.8, strokeLinecap: 'round', fill: 'none', kind: 'line' });
      });
    } else {
      // 1st figure from Image 2: Tall slender silhouette with solid black head & finger notches
      d.group({ class: 'pg-leg-left' }, () => {
        d.line(48, 60, 48, 95, { stroke: '#000000', sw: 2.4, strokeLinecap: 'round', kind: 'line' });
        d.path('M48 95 L42 95 L42 92 L48 92', { stroke: '#000000', sw: 2, fill: 'none', kind: 'line' });
      });
      d.group({ class: 'pg-leg-right' }, () => {
        d.line(52, 60, 52, 95, { stroke: '#000000', sw: 2.4, strokeLinecap: 'round', kind: 'line' });
        d.path('M52 95 L58 95 L58 92 L52 92', { stroke: '#000000', sw: 2, fill: 'none', kind: 'line' });
      });

      d.group({ class: 'pg-arm-left' }, () => {
        if (anim === 'point' || anim === 'pointing') {
          d.line(47, 32, 20, 32, { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', kind: 'line' });
        } else if (anim === 'thumbsup' || anim === 'wave') {
          d.path('M47 32 Q34 26 32 14', { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        } else if (anim === 'hold' || anim === 'holding') {
          d.polyline([[47, 32], [35, 44], [43, 46]], { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        } else {
          d.path('M47 30 Q41 46 43 62', { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
          d.path('M41 60 L43 64 L45 61', { stroke: '#000000', sw: 1.8, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        }
      });
      d.group({ class: 'pg-arm-right' }, () => {
        if (anim === 'hold' || anim === 'holding') {
          d.polyline([[53, 32], [65, 44], [57, 46]], { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        } else {
          d.path('M53 30 Q59 46 57 62', { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
          d.path('M55 60 L57 64 L59 61', { stroke: '#000000', sw: 1.8, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        }
      });

      d.group({ class: 'pg-body-torso' }, () => {
        d.poly([[47, 28], [53, 28], [52, 60], [48, 60]], { fill: '#000000', kind: 'body' });
        d.circle(50, 16, 9.5, { fill: '#000000', kind: 'body' });
      });
    }
  });
}

/**
 * Draws Layered Paper-Cut / Collage characters (Style 8 from roadmap).
 * Uses earthy craft paper tones (#9a4632 terracotta, #d6b88e sand, #7c8355 olive, #5c5346 slate)
 * and rounded one-piece paper cutout silhouettes.
 */
export function drawPapercutPerson(d, p, role = 'boy') {
  const anim = p.opts.animation;
  const animClass = anim ? `pg-anim-${anim}` : 'pg-anim-blink';
  const expr = p.opts.expression || p.expression || 'happy';
  const paletteMap = {
    boy: '#9a4632',    // Warm terracotta craft paper
    girl: '#d6b88e',   // Warm sand craft paper
    man: '#7c8355',    // Muted olive craft paper
    woman: '#5c5346',  // Warm charcoal craft paper
  };
  const paperColor = p.opts.color || paletteMap[role] || '#9a4632';

  d.group({ class: animClass }, () => {
    d.group({ class: 'pg-leg-left' }, () => {
      d.rect(39, 66, 9, 27, { fill: paperColor, rx: 4, kind: 'body' });
    });
    d.group({ class: 'pg-leg-right' }, () => {
      d.rect(52, 66, 9, 27, { fill: paperColor, rx: 4, kind: 'body' });
    });

    d.group({ class: 'pg-arm-left' }, () => {
      if (anim === 'point' || anim === 'pointing') {
        d.rect(14, 38, 24, 9, { fill: paperColor, rx: 4.5, kind: 'body' });
      } else if (anim === 'thumbsup' || anim === 'wave') {
        d.rect(24, 22, 9, 24, { fill: paperColor, rx: 4.5, kind: 'body' });
      } else if (anim === 'hold' || anim === 'holding') {
        d.rect(22, 46, 20, 9, { fill: paperColor, rx: 4.5, kind: 'body' });
      } else {
        d.rect(26, 38, 9, 26, { fill: paperColor, rx: 4.5, kind: 'body' });
      }
    });
    d.group({ class: 'pg-arm-right' }, () => {
      if (anim === 'hold' || anim === 'holding') {
        d.rect(58, 46, 20, 9, { fill: paperColor, rx: 4.5, kind: 'body' });
      } else {
        d.rect(65, 38, 9, 26, { fill: paperColor, rx: 4.5, kind: 'body' });
      }
    });

    d.group({ class: 'pg-body-torso' }, () => {
      // Smooth rounded paper cutout torso
      d.rect(34, 36, 32, 34, { fill: paperColor, rx: 8, kind: 'body' });
      // Smooth circular paper head
      d.circle(50, 20, 13, { fill: paperColor, kind: 'body' });
      // Subtle paper cutout face details
      if (!fromBehind(p)) drawMinimalFace(d, 50, 19, expr, '#27272a');
    });
  });
}

/**
 * Dispatches to style-specific character engines when one of the roadmap character styles is active.
 */
function dispatchStylizedPerson(d, p, role) {
  const st = p.opts.style;
  if (st === 'stickman') { drawStickPerson(d, p, role); return true; }
  if (st === 'cute2d') { drawCutePerson(d, p, role); return true; }
  if (st === 'whiteboard') { drawWhiteboardPerson(d, p, role); return true; }
  if (st === 'geometric') { drawGeometricPerson(d, p, role); return true; }
  if (st === 'doodle') { drawDoodlePerson(d, p, role); return true; }
  if (st === 'editorial') { drawEditorialPerson(d, p, role); return true; }
  if (st === 'papercut') { drawPapercutPerson(d, p, role); return true; }
  return false;
}

export default [
  {
    id: 'boy',
    aliases: ['kid', 'child', 'son', 'schoolboy', 'student', 'pupil', 'person', 'character', 'human', 'figure', 'hero', 'actor', 'someone'],
    tags: ['person', 'child', 'people'],
    category: 'people',
    placement: 'ground',
    scale: 0.95,
    baseline: 96,
    width: 0.55,
    colors: { skin: '#f1c27d', hair: '#4e342e', main: '#1e88e5', pants: '#37474f', shoe: '#5d4037' },
    palettes: { skin: SKIN_TONES, hair: HAIR_COLORS, main: SHIRTS, pants: ['#37474f', '#1565c0', '#5d4037'] },
    draw(d, p) {
      if (dispatchStylizedPerson(d, p, 'boy')) return;
      const skin = p.c('skin'), shirt = p.c('main');
      const anim = p.opts.animation;
      const animClass = anim ? `pg-anim-${anim}` : 'pg-anim-blink';

      d.group({ class: animClass }, () => {
        // Legs rigged with joint pivots
        d.group({ class: 'pg-leg-left' }, () => {
          d.rect(40, 66, 9, 25, { fill: p.c('pants'), rx: 3 });
          d.ellipse(44, 92, 7.5, 4, { fill: p.c('shoe') });
        });
        d.group({ class: 'pg-leg-right' }, () => {
          d.rect(51, 66, 9, 25, { fill: p.c('pants'), rx: 3 });
          d.ellipse(56, 92, 7.5, 4, { fill: p.c('shoe') });
        });

        // Left arm (with action gesture support)
        d.group({ class: 'pg-arm-left' }, () => {
          if (anim === 'point' || anim === 'pointing') {
            d.rect(12, 44, 24, 8, { fill: skin, rx: 4 });
            d.rect(26, 43.5, 11, 9, { fill: shirt, rx: 3 });
          } else if (anim === 'thumbsup') {
            d.rect(20, 32, 8, 18, { fill: skin, rx: 4 });
            d.rect(26, 44, 10, 9, { fill: shirt, rx: 3 });
          } else if (anim === 'hold' || anim === 'holding') {
            d.rect(22, 50, 20, 8, { fill: skin, rx: 4 });
            d.rect(26, 45, 9, 10, { fill: shirt, rx: 3 });
          } else {
            d.group('rotate(14 31 47)', () => {
              d.rect(27, 46, 8, 22, { fill: skin, rx: 4 });
              d.rect(26.5, 45, 9, 10, { fill: shirt, rx: 3 });
            });
          }
        });

        // Right arm
        d.group({ class: 'pg-arm-right' }, () => {
          if (anim === 'hold' || anim === 'holding') {
            d.rect(58, 50, 20, 8, { fill: skin, rx: 4 });
            d.rect(65, 45, 9, 10, { fill: shirt, rx: 3 });
          } else {
            d.group('rotate(-14 69 47)', () => {
              d.rect(65, 46, 8, 22, { fill: skin, rx: 4 });
              d.rect(64.5, 45, 9, 10, { fill: shirt, rx: 3 });
            });
          }
        });

        // Torso, neck, head & animated mimics
        d.group({ class: 'pg-body-torso' }, () => {
          d.rect(46, 37, 8, 8, { fill: skin });
          d.path('M36 50 Q36 43 43 43 L57 43 Q64 43 64 50 L64 70 Q64 72 62 72 L38 72 Q36 72 36 70 Z', { fill: shirt });

          d.circle(35.5, 28, 3.5, { fill: skin });
          d.circle(64.5, 28, 3.5, { fill: skin });
          d.circle(50, 27, 15, { fill: skin });
          if (fromBehind(p)) {
            // Back of the head: hair down to the nape, a crown swirl
            d.path('M35 27 C35 13 43 11 50 11 C57 11 65 13 65 27 C65 33 62 37 57 38 L43 38 C38 37 35 33 35 27 Z', { fill: p.c('hair') });
            d.path('M47 19 Q50 16 53 19', { kind: 'line', stroke: INK, sw: 1, opacity: 0.35 });
          } else {
            d.path('M35 26 C35 13 44 10 51 10 C59 10 66 14 65.5 25 C62 21 57 19 52 21 C48 18 41 19 35 26 Z', { fill: p.c('hair') });
            drawFacialExpression(d, p, 50, 28);
          }
        });
      });
    },
  },
  {
    id: 'girl',
    aliases: ['daughter', 'schoolgirl'],
    tags: ['person', 'child', 'people'],
    category: 'people',
    placement: 'ground',
    scale: 0.95,
    baseline: 96,
    width: 0.55,
    colors: { skin: '#f1c27d', hair: '#795548', main: '#ec407a', shoe: '#ad1457' },
    palettes: { skin: SKIN_TONES, hair: HAIR_COLORS, main: DRESSES },
    draw(d, p) {
      if (dispatchStylizedPerson(d, p, 'girl')) return;
      const skin = p.c('skin'), dress = p.c('main');
      const anim = p.opts.animation;
      const animClass = anim ? `pg-anim-${anim}` : 'pg-anim-blink';

      d.group({ class: animClass }, () => {
        d.group({ class: 'pg-leg-left' }, () => {
          d.rect(42, 74, 6, 17, { fill: skin, rx: 2 });
          d.ellipse(44, 92, 6, 3.5, { fill: p.c('shoe') });
        });
        d.group({ class: 'pg-leg-right' }, () => {
          d.rect(52, 74, 6, 17, { fill: skin, rx: 2 });
          d.ellipse(56, 92, 6, 3.5, { fill: p.c('shoe') });
        });

        d.group({ class: 'pg-arm-left' }, () => {
          if (anim === 'point' || anim === 'pointing') {
            d.rect(16, 44, 22, 7, { fill: skin, rx: 3.5 });
          } else if (anim === 'thumbsup') {
            d.rect(24, 30, 7, 18, { fill: skin, rx: 3.5 });
          } else if (anim === 'hold' || anim === 'holding') {
            d.rect(24, 48, 20, 7, { fill: skin, rx: 3.5 });
          } else {
            d.group('rotate(16 33 46)', () => {
              d.rect(29, 46, 7, 20, { fill: skin, rx: 3.5 });
            });
          }
        });
        d.group({ class: 'pg-arm-right' }, () => {
          if (anim === 'hold' || anim === 'holding') {
            d.rect(56, 48, 20, 7, { fill: skin, rx: 3.5 });
          } else {
            d.group('rotate(-16 67 46)', () => {
              d.rect(64, 46, 7, 20, { fill: skin, rx: 3.5 });
            });
          }
        });

        d.group({ class: 'pg-body-torso' }, () => {
          d.poly([[42, 45], [58, 45], [68, 76], [32, 76]], { fill: dress, kind: 'body' });
          d.rect(47, 37, 6, 8, { fill: skin });
          d.circle(50, 27, 14, { fill: skin });

          d.circle(32, 22, 7, { fill: p.c('hair'), kind: 'body' });
          d.circle(68, 22, 7, { fill: p.c('hair'), kind: 'body' });
          if (fromBehind(p)) {
            // Back of the head: hair covers it, with a centre parting
            d.path('M36 27 C36 12 44 12 50 12 C56 12 64 12 64 27 C64 34 59 38 50 38 C41 38 36 34 36 27 Z', { fill: p.c('hair'), kind: 'body' });
            d.line(50, 13, 50, 25, { stroke: INK, sw: 1, opacity: 0.3, kind: 'line' });
          } else {
            d.path('M36 28 C36 12 44 11 50 11 C56 11 64 12 64 28 C60 22 56 20 50 20 C44 20 40 22 36 28 Z', { fill: p.c('hair'), kind: 'body' });
            drawFacialExpression(d, p, 50, 28);
          }
        });
      });
    },
  },
  {
    id: 'man',
    aliases: ['father', 'adult', 'guy'],
    tags: ['person', 'adult', 'people'],
    category: 'people',
    placement: 'ground',
    scale: 1.05,
    baseline: 96,
    width: 0.55,
    colors: { skin: '#e0ac69', hair: '#212121', main: '#43a047', pants: '#263238', shoe: '#212121' },
    palettes: { skin: SKIN_TONES, hair: HAIR_COLORS, main: SHIRTS },
    draw(d, p) {
      if (dispatchStylizedPerson(d, p, 'man')) return;
      const skin = p.c('skin'), shirt = p.c('main');
      const anim = p.opts.animation;
      const animClass = anim ? `pg-anim-${anim}` : 'pg-anim-blink';

      d.group({ class: animClass }, () => {
        d.group({ class: 'pg-leg-left' }, () => {
          d.rect(39, 64, 10, 28, { fill: p.c('pants'), rx: 2 });
          d.ellipse(43, 93, 8, 4, { fill: p.c('shoe') });
        });
        d.group({ class: 'pg-leg-right' }, () => {
          d.rect(51, 64, 10, 28, { fill: p.c('pants'), rx: 2 });
          d.ellipse(57, 93, 8, 4, { fill: p.c('shoe') });
        });

        d.group({ class: 'pg-arm-left' }, () => {
          if (anim === 'point' || anim === 'pointing') {
            d.rect(12, 42, 24, 8, { fill: skin, rx: 4 });
          } else if (anim === 'thumbsup') {
            d.rect(22, 28, 8, 18, { fill: skin, rx: 4 });
          } else if (anim === 'hold' || anim === 'holding') {
            d.rect(20, 48, 22, 8, { fill: skin, rx: 4 });
          } else {
            d.rect(26, 42, 8, 24, { fill: skin, rx: 4 });
          }
        });
        d.group({ class: 'pg-arm-right' }, () => {
          if (anim === 'hold' || anim === 'holding') {
            d.rect(58, 48, 22, 8, { fill: skin, rx: 4 });
          } else {
            d.rect(66, 42, 8, 24, { fill: skin, rx: 4 });
          }
        });

        d.group({ class: 'pg-body-torso' }, () => {
          d.rect(46, 34, 8, 8, { fill: skin });
          d.path('M34 42 L66 42 L64 66 L36 66 Z', { fill: shirt });
          if (fromBehind(p)) {
            d.circle(37, 25, 3, { fill: skin });
            d.circle(63, 25, 3, { fill: skin });
          }
          d.circle(50, 24, 13, { fill: skin });
          if (fromBehind(p)) {
            // Back of the head: short hair down to the nape
            d.path('M37 23 C37 11 44 10 50 10 C56 10 63 11 63 23 C63 29 60 32 56 33 L44 33 C40 32 37 29 37 23 Z', { fill: p.c('hair') });
          } else {
            d.path('M37 22 C37 11 44 9 50 9 C56 9 63 11 63 22 C59 18 55 16 50 16 C45 16 41 18 37 22 Z', { fill: p.c('hair') });
            drawFacialExpression(d, p, 50, 24);
          }
        });
      });
    },
  },
  {
    id: 'woman',
    aliases: ['mother', 'lady'],
    tags: ['person', 'adult', 'people'],
    category: 'people',
    placement: 'ground',
    scale: 1.0,
    baseline: 96,
    width: 0.55,
    colors: { skin: '#ffdbac', hair: '#a1662f', main: '#8e24aa', pants: '#37474f', shoe: '#212121' },
    palettes: { skin: SKIN_TONES, hair: HAIR_COLORS, main: DRESSES },
    draw(d, p) {
      if (dispatchStylizedPerson(d, p, 'woman')) return;
      const skin = p.c('skin'), top = p.c('main');
      const anim = p.opts.animation;
      const animClass = anim ? `pg-anim-${anim}` : 'pg-anim-blink';

      d.group({ class: animClass }, () => {
        d.group({ class: 'pg-leg-left' }, () => {
          d.rect(40, 66, 9, 26, { fill: p.c('pants'), rx: 2 });
          d.ellipse(43, 93, 7, 3.5, { fill: p.c('shoe') });
        });
        d.group({ class: 'pg-leg-right' }, () => {
          d.rect(51, 66, 9, 26, { fill: p.c('pants'), rx: 2 });
          d.ellipse(57, 93, 7, 3.5, { fill: p.c('shoe') });
        });

        d.group({ class: 'pg-arm-left' }, () => {
          if (anim === 'point' || anim === 'pointing') {
            d.rect(14, 42, 22, 7, { fill: skin, rx: 3.5 });
          } else if (anim === 'thumbsup') {
            d.rect(24, 28, 7, 18, { fill: skin, rx: 3.5 });
          } else if (anim === 'hold' || anim === 'holding') {
            d.rect(22, 48, 20, 7, { fill: skin, rx: 3.5 });
          } else {
            d.rect(28, 42, 7, 22, { fill: skin, rx: 3.5 });
          }
        });
        d.group({ class: 'pg-arm-right' }, () => {
          if (anim === 'hold' || anim === 'holding') {
            d.rect(58, 48, 20, 7, { fill: skin, rx: 3.5 });
          } else {
            d.rect(65, 42, 7, 22, { fill: skin, rx: 3.5 });
          }
        });

        d.group({ class: 'pg-body-torso' }, () => {
          d.rect(47, 34, 6, 8, { fill: skin });
          d.path('M36 42 L64 42 L62 67 L38 67 Z', { fill: top });
          d.circle(50, 24, 13, { fill: skin });
          if (fromBehind(p)) {
            // Back of the head: long hair falling over the shoulders
            d.path('M35 25 C35 10 44 8 50 8 C56 8 65 10 65 25 L66 45 C66 49 60 50 50 50 C40 50 34 49 34 45 Z', { fill: p.c('hair') });
          } else {
            d.path('M35 25 C35 10 44 8 50 8 C56 8 65 10 65 25 L67 46 C67 48 63 48 62 43 L62 26 C57 18 53 18 50 18 C47 18 43 18 38 26 L38 43 C37 48 33 48 33 46 Z', { fill: p.c('hair') });
            drawFacialExpression(d, p, 50, 24);
          }
        });
      });
    },
  },
];
