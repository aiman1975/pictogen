// People concepts with procedural facial mimics (expressions) and rigged animatable limbs.
import { idleStyle } from './rig.js';
import { INK } from '../core/styles.js';
import { darken, mix } from '../core/color.js';

export const SKIN_TONES = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
export const HAIR_COLORS = ['#4e342e', '#212121', '#795548', '#e6b94f', '#a1662f'];
const SHIRTS = ['#1e88e5', '#e53935', '#43a047', '#fb8c00', '#8e24aa', '#00897b'];
const DRESSES = ['#ec407a', '#ab47bc', '#e53935', '#42a5f5', '#26a69a'];

/**
 * Which side of the figure we see: opts.view ('front' | 'side' | 'back') when given; otherwise
 * walking and running figures are drawn in profile (facing right; scenes mirror them to face left),
 * where the limb swing of the walk cycle reads as a stride, and everything else faces us.
 */
const PROFILE_MOTIONS = ['walk', 'run', 'walk-across'];
export const viewOf = (p) => p.opts.view || (PROFILE_MOTIONS.includes(p.opts.animation) ? 'side' : 'front');
const fromBehind = (p) => viewOf(p) === 'back';
/** Stylized faces slide toward the facing direction in profile: a simple turned-head look. */
const faceX = (p) => 50 + ({ side: 7, 'three-quarter': 4 }[viewOf(p)] ?? 0);
const turned = (p) => viewOf(p) === 'three-quarter';
/**
 * Where the eyes look: opts.gaze { x, y } in -1..1 (x toward the drawing's right, y down), a shift
 * of eyes and brows within the face. Null when looking straight ahead.
 */
const gazeShift = (p) => {
  const g = p.opts.gaze;
  return g && (g.x || g.y) ? `translate(${Math.round((g.x || 0) * 260) / 100} ${Math.round((g.y || 0) * 160) / 100})` : null;
};
/** The root of every person drawing: the shared skeleton (src/concepts/rig.js) and its motion. */
/**
 * Where a face photo goes (the studio's "Your characters"): data-face="cx cy r" on the head joint,
 * the head's centre and radius in drawing units, data-mood, the expression (a photo's jaw talks,
 * laughs or drops open with it), and data-view (a turned photo narrows toward the side it faces).
 * None from behind, where no face shows.
 */
const faceArea = (p, cx, cy, r) => (fromBehind(p) ? undefined : { face: `${cx} ${cy} ${r}`, mood: p.opts.expression || p.expression || 'happy', view: viewOf(p) });
const personRoot = (p) => `pg-rig pg-rig-person pg-anim-${p.opts.animation || 'blink'}`;

/**
 * The face, turned when the figure is seen three-quarters (opts.view 'three-quarter', facing right):
 * features slide toward the facing side and squeeze together, as the far half of the face turns away.
 */
function drawFace(d, p, cx, cy) {
  if (!turned(p)) return drawFacialExpression(d, p, cx, cy);
  d.group(`translate(${cx + 5} 0) scale(0.78 1) translate(${-cx} 0)`, () => drawFacialExpression(d, p, cx, cy));
  // A nose on the turned side makes the turn read at a glance
  d.path(`M${cx + 9.5} ${cy + 0.5} Q${cx + 11.5} ${cy + 3.5} ${cx + 8.6} ${cy + 4.2}`, { kind: 'line', stroke: INK, sw: 1.1, opacity: 0.55 });
}

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
  // Eyes (and brows) shift toward whoever the figure looks at (opts.gaze)
  const animeEyes = p.opts.style === 'anime' && !['laugh', 'laughing', 'wink', 'winking'].includes(expr);
  d.group(gazeShift(p), () => d.group({ class: 'pg-face-eyes' }, () => {
    if (animeEyes) return drawAnimeEyes(d, cx, cy, expr, p);
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
  }));

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
 * Anime hair over a person's own hair (the Anime style): a fringe of pointed locks over the
 * forehead, locks framing the face for girls and women, spikes on top for boys and men, and the
 * shine ("angel ring") across the crown. view: 'front' (turned with the face when three-quarter),
 * 'back' or 'side' (facing right). Head centred at (cx, cy), radius r.
 */
const isAnime = (p) => p.opts.style === 'anime';
function drawAnimeHair(d, p, role, cx, cy, r, view = 'front') {
  const hair = p.c('hair');
  const f = (v) => Math.round(v * 100) / 100;
  const pt = (x, y) => `${f(cx + x * r)} ${f(cy + y * r)}`;
  const lock = { fill: hair, kind: 'body' };
  const long = role === 'girl' || role === 'woman';
  const draw = () => {
    if (!long && view !== 'side') {
      // Spikes on top (shorter for a man)
      const h = role === 'man' ? 0.82 : 1;
      d.path(`M${pt(-0.78, -0.62)} L${pt(-0.6, -0.62 - 0.66 * h)} L${pt(-0.22, -0.95)} L${pt(0.02, -0.62 - 0.78 * h)} L${pt(0.28, -0.95)} L${pt(0.62, -0.62 - 0.6 * h)} L${pt(0.8, -0.58)} Z`, lock);
    }
    if (view === 'front') {
      // The fringe: pointed locks from temple to temple, the middle ones short of the brows
      const n = role === 'man' ? 4 : 5;
      const left = -0.94, right = 0.94, base = -0.64, w = (right - left) / n;
      let path = `M${pt(left, -0.08)} L${pt(left + 0.04, base)}`;
      for (let k = 0; k < n; k++) {
        const x0 = left + k * w, x1 = x0 + w, xm = x0 + w * (k % 2 ? 0.45 : 0.6);
        const tip = (role === 'man' ? -0.44 : -0.33) + (k === 0 || k === n - 1 ? 0.2 : (k % 2) * 0.07);
        path += ` Q${pt(x0 + w * 0.2, base + (tip - base) * 0.45)} ${pt(xm, tip)} Q${pt(xm + w * 0.12, base + (tip - base) * 0.5)} ${pt(x1, base)}`;
      }
      path += ` L${pt(right, -0.08)} C${pt(right + 0.12, -1.25)} ${pt(left - 0.12, -1.25)} ${pt(left, -0.08)} Z`;
      d.path(path, lock);
      if (long) {
        // Long locks framing the face, down past the cheeks
        for (const sx of [-1, 1]) d.path(`M${pt(sx * 0.98, -0.5)} Q${pt(sx * 1.06, 0.15)} ${pt(sx * 0.9, 0.62)} Q${pt(sx * 0.8, 0.2)} ${pt(sx * 0.72, -0.35)} Z`, lock);
      }
    } else if (view === 'side') {
      // In profile, the fringe sweeps forward over the brow in two points
      d.path(`M${pt(-0.2, -0.98)} Q${pt(0.62, -0.9)} ${pt(0.96, -0.3)} L${pt(0.68, -0.5)} L${pt(0.74, -0.12)} L${pt(0.42, -0.46)} L${pt(0.34, -0.2)} L${pt(0.1, -0.62)} Z`, lock);
    }
    // The shine across the crown, notched like light catching strands
    const shine = { fill: mix(hair, '#eaf6ff', 0.62), opacity: 0.9, kind: 'accent' };
    const y = view === 'side' ? -0.74 : -0.8;
    d.path(`M${pt(-0.62, y + 0.14)} Q${pt(-0.22, y - 0.12)} ${pt(0.42, y + 0.04)} L${pt(0.36, y + 0.13)} L${pt(0.2, y + 0.07)} L${pt(0.12, y + 0.16)} Q${pt(-0.2, y + 0.04)} ${pt(-0.54, y + 0.22)} Z`, shine);
  };
  // Turned three-quarters, the fringe turns with the face (see drawFace)
  if (view === 'front' && turned(p)) d.group(`translate(${cx + 5} 0) scale(0.78 1) translate(${-cx} 0)`, draw);
  else draw();
}

/**
 * Anime eyes: big colored irises with a dark pupil, two white glints and a heavy upper lash line,
 * thin brows that carry the mood (and a tear when sad).
 */
const ANIME_IRIS = ['#3a7bd5', '#8e44ad', '#16a085', '#b9770e', '#2e86c1'];
function drawAnimeEyes(d, cx, cy, expr, p) {
  const mood = { shocked: 'surprised', crying: 'sad', mad: 'angry', puzzled: 'confused', suspicious: 'skeptical' }[expr] || expr;
  const iris = p.opts.eyeColor || ANIME_IRIS[Math.abs(String(p.opts.seed ?? '').split('').reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7)) % ANIME_IRIS.length];
  const brows = {
    surprised: [[-8, -7, -3, -7.8], [3, -7.8, 8, -7]],
    sad: [[-8, -5.2, -3, -6.8], [8, -5.2, 3, -6.8]],
    angry: [[-8, -7.2, -2.5, -4.6], [8, -7.2, 2.5, -4.6]],
    confused: [[-8, -6, -3, -5], [3, -7.8, 8, -6.6]],
    skeptical: [[-8, -5.4, -3, -5.4], [3, -6.8, 8, -5.4]],
  }[mood] || [[-7.5, -6.4, -3.5, -6.9], [3.5, -6.9, 7.5, -6.4]];
  for (const [x1, y1, x2, y2] of brows) d.line(cx + x1, cy + y1, cx + x2, cy + y2, { kind: 'line', stroke: '#3b2a20', sw: 1.1 });
  for (const side of [-1, 1]) {
    const x = cx + side * 5.3, y = cy + 0.4;
    const rx = mood === 'surprised' ? 2.7 : 2.45, ry = mood === 'surprised' ? 3.7 : mood === 'angry' || mood === 'skeptical' ? 2.5 : 3.3;
    d.ellipse(x, y, rx, ry, { fill: iris, kind: 'accent' });
    d.ellipse(x, y + ry * 0.22, rx * (mood === 'surprised' ? 0.45 : 0.6), ry * 0.55, { fill: '#1e1b2e', kind: 'detail' });
    d.circle(x - rx * 0.35, y - ry * 0.38, rx * 0.42, { fill: '#ffffff', kind: 'highlight' });
    d.circle(x + rx * 0.42, y + ry * 0.45, rx * 0.2, { fill: '#ffffff', kind: 'highlight' });
    // The lash line, flicking out at the outer corner
    d.path(`M${x - side * rx * 1.15} ${y - ry * 0.45} Q${x - side * rx * 0.2} ${y - ry * 1.35} ${x + side * rx * 1.35} ${y - ry * 0.75}`, { kind: 'line', stroke: '#1e1b2e', sw: 1.5 });
  }
  if (mood === 'sad') d.path(`M${cx - 7} ${cy + 3.4} Q${cx - 8} ${cy + 6.2} ${cx - 5.8} ${cy + 6.2} Q${cx - 4.8} ${cy + 4.8} ${cx - 7} ${cy + 3.4} Z`, { fill: '#4fc3f7', kind: 'accent' });
}

/**
 * Profile (side view) face facing right, for a head centred at (cx, cy) with radius r: one eye,
 * brow and mouth near the front of the head, in the same .pg-face-eyes / .pg-face-mouth groups
 * as the front face so blinking and talking still animate. Same expressions as drawFacialExpression.
 */
export function drawProfileFace(d, p, cx, cy, r) {
  const expr = p.opts.expression || p.expression || 'happy';
  const ex = cx + r * 0.42, ey = cy - 0.5;
  const mx = cx + r * 0.62, my = cy + 6;

  if (!['angry', 'mad', 'skeptical', 'suspicious'].includes(expr)) {
    d.circle(cx + r * 0.3, cy + 4.5, 2.4, { fill: '#ff8a80', opacity: 0.55, kind: 'accent' });
  }

  d.group({ class: 'pg-face-eyes' }, () => {
    switch (expr) {
      case 'laugh':
      case 'laughing':
        d.path(`M${ex - 2.5} ${ey} Q${ex} ${ey - 3.2} ${ex + 2.5} ${ey}`, { kind: 'line', stroke: INK, sw: 2 });
        break;
      case 'wink':
      case 'winking':
        d.path(`M${ex - 2.5} ${ey} Q${ex} ${ey + 2.6} ${ex + 2.5} ${ey}`, { kind: 'line', stroke: INK, sw: 2 });
        break;
      case 'surprised':
      case 'shocked':
        d.path(`M${ex - 3} ${ey - 4.5} Q${ex} ${ey - 7} ${ex + 3} ${ey - 4.5}`, { kind: 'line', stroke: INK, sw: 1.5 });
        d.circle(ex, ey, 2.6, { fill: INK, kind: 'detail' });
        d.circle(ex + 0.9, ey - 0.9, 0.9, { kind: 'highlight', opacity: 0.9 });
        break;
      case 'sad':
      case 'crying':
        d.line(ex - 3, ey - 4, ex + 3, ey - 6, { stroke: INK, sw: 1.5, kind: 'line' });
        d.circle(ex, ey + 0.5, 2, { fill: INK, kind: 'detail' });
        d.path(`M${ex - 0.5} ${ey + 3} Q${ex - 1.5} ${ey + 6} ${ex + 1} ${ey + 6} Q${ex + 2} ${ey + 4.5} ${ex - 0.5} ${ey + 3} Z`, { fill: '#4fc3f7', kind: 'accent' });
        break;
      case 'angry':
      case 'mad':
        d.line(ex - 3, ey - 6, ex + 3, ey - 3, { stroke: INK, sw: 2, kind: 'line' });
        d.circle(ex, ey + 0.5, 2, { fill: INK, kind: 'detail' });
        break;
      case 'confused':
      case 'puzzled':
        d.path(`M${ex - 3} ${ey - 5.5} Q${ex} ${ey - 8} ${ex + 3} ${ey - 5}`, { kind: 'line', stroke: INK, sw: 1.8 });
        d.circle(ex, ey, 2, { fill: INK, kind: 'detail' });
        break;
      case 'skeptical':
      case 'suspicious':
        d.line(ex - 3, ey - 3, ex + 3, ey - 3, { stroke: INK, sw: 2.2, kind: 'line' });
        d.circle(ex, ey + 0.5, 1.9, { fill: INK, kind: 'detail' });
        break;
      default:
        d.circle(ex, ey, 2, { fill: INK, kind: 'detail' });
        d.circle(ex + 0.7, ey - 0.7, 0.7, { kind: 'highlight', opacity: 0.9 });
    }
  });

  d.group({ class: 'pg-face-mouth' }, () => {
    switch (expr) {
      case 'laugh':
      case 'laughing':
        d.path(`M${mx - 3.5} ${my - 1} L${mx + 3} ${my - 1} Q${mx + 1} ${my + 5} ${mx - 3.5} ${my - 1} Z`, { fill: '#c62828', kind: 'body' });
        break;
      case 'surprised':
      case 'shocked':
        d.ellipse(mx, my + 0.5, 1.8, 2.8, { fill: INK, kind: 'detail' });
        break;
      case 'sad':
      case 'crying':
        d.path(`M${mx - 4} ${my + 2} Q${mx - 1} ${my - 1.5} ${mx + 2} ${my + 1.5}`, { kind: 'line', stroke: INK, sw: 2 });
        break;
      case 'angry':
      case 'mad':
        d.line(mx - 4, my + 1, mx + 2, my, { kind: 'line', stroke: INK, sw: 2 });
        break;
      case 'wink':
      case 'winking':
        d.path(`M${mx - 3.5} ${my} Q${mx} ${my + 1.5} ${mx + 2} ${my - 1.5}`, { kind: 'line', stroke: INK, sw: 2 });
        break;
      case 'confused':
      case 'puzzled':
        d.path(`M${mx - 4} ${my} Q${mx - 2} ${my - 1.5} ${mx} ${my} Q${mx + 1.5} ${my + 1.5} ${mx + 2.5} ${my}`, { kind: 'line', stroke: INK, sw: 2 });
        break;
      case 'talking':
      case 'speaking':
        d.ellipse(mx - 0.5, my, 2.6, 2, { fill: INK, kind: 'detail' });
        break;
      case 'neutral':
      case 'calm':
      case 'skeptical':
      case 'suspicious':
        d.line(mx - 3.5, my, mx + 1.5, my, { kind: 'line', stroke: INK, sw: 2 });
        break;
      default:
        d.path(`M${mx - 2.5} ${my - 0.2} Q${mx - 0.2} ${my + 2.2} ${mx + 1.8} ${my - 1}`, { kind: 'line', stroke: INK, sw: 1.4 });
    }
  });
}

// A limb as a rounded bar from a to b
function capsule(d, a, b, w, fill, extra = {}) {
  const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  d.group(`rotate(${Math.round(ang * 10) / 10} ${a[0]} ${a[1]})`, () => d.rect(a[0] - w / 2, a[1] - w / 2, len + w, w, { fill, rx: w / 2, ...extra }));
}

/**
 * Holding something (p.opts.held, or the 'hold' pose): both arms bend at the elbow and the hands
 * meet in front of the chest, as far apart as what they hold is wide (one fist for a balloon's
 * string or an umbrella). Drawn in front of the body; p.grip says where the hands are, for the held
 * thing and the hands drawn over it (drawConcept, src/core/render.js).
 *   left / right: the shoulders; y: the hands' height; w: the arms' thickness; sleeve: its colour
 */
function holdArms(d, p, { left, right, y, w, skin, sleeve }) {
  const held = p.opts.held;
  if (held?.up) {
    // Held up (a balloon, an umbrella, a flag): the right hand raised beside the head, the left
    // arm down
    const [lx, ly] = left, [rx, ry] = right;
    const elbow = [rx + 7, ry - 3], hand = [rx + 3, ry - 19];
    d.group({ class: 'pg-arms-holding' }, () => {
      capsule(d, [lx, ly], [lx - 2, ly + 19], w, skin);
      if (sleeve) capsule(d, [lx, ly], [lx - 0.8, ly + 7], w + 1, sleeve);
      capsule(d, [rx, ry], elbow, w, skin);
      if (sleeve) capsule(d, [rx, ry], [rx + 3, ry - 1.5], w + 1, sleeve);
      capsule(d, elbow, hand, w, skin);
    });
    p.grip = { x: hand[0], y: hand[1], hands: [hand], r: w * 0.6, fill: skin };
    return;
  }
  const gap = Math.max(3.5, Math.min(12, (held?.size ?? 14) * 0.42));
  const hands = [[50 - gap, y], [50 + gap, y]];
  d.group({ class: 'pg-arms-holding' }, () => [left, right].forEach(([sx, sy], i) => {
    const elbow = [sx + (i ? 1.5 : -1.5), y + 7];
    capsule(d, [sx, sy], elbow, w, skin);
    if (sleeve) capsule(d, [sx, sy], [sx + (elbow[0] - sx) * 0.4, sy + (elbow[1] - sy) * 0.4], w + 1, sleeve);
    capsule(d, elbow, hands[i], w, skin);
  }));
  p.grip = { x: 50, y, hands, r: w * 0.6, fill: skin };
}
const isHolding = (p) => Boolean(p.opts.held) || p.opts.animation === 'hold' || p.opts.animation === 'holding';

/**
 * Side view (profile, facing right) of the hand-drawn people. The far arm and leg are drawn darker
 * behind the body and the near ones in front, with the same pg-arm-* / pg-leg-* rig groups as the
 * front view: the walk and run cycles swing them from shoulder and hip, which in profile is a stride.
 * `s` gives one person's proportions (see SIDE below).
 */
function drawSidePerson(d, p, s) {
  const skin = p.c('skin'), main = p.c('main'), hair = p.c('hair');
  const anim = p.opts.animation, holding = isHolding(p);
  const far = (c) => darken(c, 0.18);
  const legFill = s.legs.skin ? skin : p.c('pants');
  const { cx, cy, r } = s.head;

  const arm = (shade) => {
    const a = s.arm;
    if (anim === 'point' || anim === 'pointing') {
      if (shade === far) d.rect(a.x, a.y, a.w, a.h, { fill: far(skin), rx: a.w / 2 });
      else d.rect(a.x, a.y, a.h + 4, a.w, { fill: skin, rx: a.w / 2 });
    } else if (holding) {
      // Upper arm down, forearm forward: the hands in front of the chest (the far one a little back)
      // (held up - a balloon, an umbrella - the near hand is raised in front of the face)
      const up = p.opts.held?.up && shade !== far;
      const sh = [a.x + a.w / 2, a.y + 1], elbow = up ? [sh[0] + 8, a.y - 1] : [sh[0] - 1, a.y + a.h * 0.55];
      const hand = up ? [sh[0] + 13, a.y - a.h * 0.95] : [sh[0] + a.h * 0.55 - (shade === far ? 2.5 : 0), a.y + a.h * 0.48];
      capsule(d, sh, elbow, a.w, shade(skin));
      capsule(d, elbow, hand, a.w, shade(skin));
      if (shade !== far) {
        const size = p.opts.held?.size ?? 14;
        p.grip = { x: hand[0] + (up ? 1 : size * 0.3), y: hand[1], hands: [hand], r: a.w * 0.6, fill: skin };
      }
    } else {
      // Upper arm and forearm, bending at the elbow (the forearms pump when running)
      const half = a.h / 2;
      d.rect(a.x, a.y, a.w, half + 2, { fill: shade(skin), rx: a.w / 2 });
      d.joint('pg-forearm', [a.x + a.w / 2, a.y + half], () => d.rect(a.x, a.y + half - 2, a.w, half + 2, { fill: shade(skin), rx: a.w / 2 }));
    }
    if (s.arm.sleeve) d.rect(a.x - 0.5, a.y - 1, a.w + 1, 10, { fill: shade(main), rx: 3 });
  };
  // Thigh and shin with the shoe, bending at the knee as the leg swings through
  const leg = (shade) => {
    const l = s.legs, half = l.h / 2;
    d.rect(l.x, l.y, l.w, half + 2, { fill: shade(legFill), rx: l.rx ?? 2 });
    d.joint('pg-shin', [l.x + l.w / 2, l.y + half], () => {
      d.rect(l.x, l.y + half - 1, l.w, half + 1, { fill: shade(legFill), rx: l.rx ?? 2 });
      d.ellipse(s.shoe.x, s.shoe.y, s.shoe.rx, s.shoe.ry, { fill: shade(p.c('shoe')) });
    });
  };
  // Limbs turn at the shoulder and hip (fixed pivots: a bending knee must not move the hip)
  const shoulder = [s.arm.x + s.arm.w / 2, s.arm.y + 1], hip = [s.legs.x + s.legs.w / 2, s.legs.y];
  const same = (c) => c;

  d.group({ class: personRoot(p), style: idleStyle(p) }, () => d.group({ class: 'pg-profile' }, () => {
    // (arms holding something don't swing)
    d.joint(holding ? 'pg-arm-held' : 'pg-arm-right', shoulder, () => arm(far));
    d.joint('pg-leg-right', hip, () => leg(far));
    d.joint('pg-leg-left', hip, () => leg(same));
    d.group({ class: 'pg-body-torso' }, () => {
      d.rect(...s.neck, { fill: skin });
      if (s.torso.poly) d.poly(s.torso.poly, { fill: main, kind: 'body' });
      else d.path(s.torso.path, { fill: main });
      d.joint('pg-head', [cx, cy + r], () => {
        if (s.hairBehind) d.path(s.hairBehind, { fill: hair, kind: 'body' });
        d.circle(cx + r - 0.6, cy + 2.5, 2.4, { fill: skin }); // nose: behind the head so only its tip shows
        d.circle(cx, cy, r, { fill: skin });
        d.path(s.hair, { fill: hair, kind: 'body' });
        if (isAnime(p)) drawAnimeHair(d, p, s.role, cx, cy, r, 'side');
        if (s.ear) {
          d.circle(s.ear[0], s.ear[1], s.ear[2], { fill: darken(skin, 0.08), kind: 'accent' });
          d.path(`M${s.ear[0] - 1} ${s.ear[1] - 1} Q${s.ear[0] + 1} ${s.ear[1]} ${s.ear[0] - 0.5} ${s.ear[1] + 1.2}`, { kind: 'line', stroke: far(skin), sw: 0.9 });
        }
        drawProfileFace(d, p, cx, cy + (s.faceDy ?? 0), r);
      }, faceArea(p, cx, cy, r));
    });
    d.joint(holding ? 'pg-arm-held' : 'pg-arm-left', shoulder, () => arm(same));
  }));
}

// Per-person side-view proportions, matching each front drawing's height, head and clothes.
const SIDE = {
  boy: {
    role: 'boy',
    head: { cx: 50, cy: 27, r: 15 }, faceDy: 1, neck: [46, 37, 8, 8],
    torso: { path: 'M42 50 Q42 43 47 43 L54 43 Q59 43 59 50 L59 70 Q59 72 57 72 L44 72 Q42 72 42 70 Z' },
    legs: { x: 46, y: 66, w: 9, h: 25, rx: 3 }, shoe: { x: 53, y: 92, rx: 7.5, ry: 4 },
    arm: { x: 47, y: 46, w: 8, h: 22, sleeve: true },
    hair: 'M62 20 C61 13 55 10 49 10 C41 10 35 15 35 24 C35 30 37 35 40 37 L45 37 C44 33 43 29 45 26 C49 22 56 21 62 20 Z',
    ear: [46.5, 29, 3.2],
  },
  girl: {
    role: 'girl',
    head: { cx: 50, cy: 27, r: 14 }, faceDy: 1, neck: [47, 37, 6, 8],
    torso: { poly: [[45, 45], [56, 45], [64, 76], [38, 76]] },
    legs: { x: 47, y: 74, w: 6, h: 17, skin: true }, shoe: { x: 52, y: 92, rx: 6, ry: 3.5 },
    arm: { x: 48, y: 46, w: 7, h: 20 },
    hairBehind: 'M40 17 A7 7 0 1 0 40.1 31 Z', // pigtail at the back of the head
    hair: 'M61 19 C59 13 55 11 50 11 C42 11 36 16 36 25 C36 31 38 35 41 37 L45 36 C44 31 44 27 46 24 C50 21 56 20 61 19 Z',
    ear: [47, 29, 3],
  },
  man: {
    role: 'man',
    head: { cx: 50, cy: 24, r: 13 }, neck: [46, 34, 8, 8],
    torso: { path: 'M42 42 L59 42 L58 66 L43 66 Z' },
    legs: { x: 45, y: 64, w: 10, h: 28 }, shoe: { x: 53, y: 93, rx: 8, ry: 4 },
    arm: { x: 47, y: 42, w: 8, h: 24 },
    hair: 'M60 17 C58 11 54 9 49 9 C42 9 37 13 37 21 C37 26 38 30 40 32 L44 31 C43 27 43 24 45 21 C49 18 55 17 60 17 Z',
    ear: [47, 25, 2.8],
  },
  woman: {
    role: 'woman',
    head: { cx: 50, cy: 24, r: 13 }, neck: [47, 34, 6, 8],
    torso: { path: 'M43 42 L58 42 L57 67 L44 67 Z' },
    legs: { x: 46, y: 66, w: 9, h: 26 }, shoe: { x: 53, y: 93, rx: 7, ry: 3.5 },
    arm: { x: 47.5, y: 42, w: 7, h: 22 },
    hair: 'M61 18 C59 11 55 8 50 8 C41 8 36 13 36 24 L35 46 C35 48 41 48 42 46 L43 30 C44 26 46 23 49 21 C53 19 57 18 61 18 Z',
  },
};

/**
 * Helper for minimalist line-art faces used by the Stickman, Cute 2D and Geometric styles.
 * Wraps eyes in .pg-face-eyes and mouth in .pg-face-mouth for CSS animation compatibility.
 */
function drawMinimalFace(d, cx, cy, expr, strokeColor = '#000000', p = null) {
  d.group(p && gazeShift(p), () => d.group({ class: 'pg-face-eyes' }, () => {
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
  }));

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
  const animClass = personRoot(p);
  const expr = p.opts.expression || p.expression || 'happy';
  const sw = 3.6;

  d.group({ class: animClass, style: idleStyle(p) }, () => {
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
        p.grip = { x: 50, y: 56, hands: [[42, 56], [58, 56]], r: 2.8, fill: '#ffffff', stroke: '#000000', sw: 2.2 };
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
        d.circle(36, 72, 2.6, { fill: '#ffffff', stroke: '#000000', sw: 2.2, kind: 'body' });
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
        d.circle(64, 72, 2.6, { fill: '#ffffff', stroke: '#000000', sw: 2.2, kind: 'body' });
      }
    });

    // Torso Spine & Head
    d.group({ class: 'pg-body-torso' }, () => {
      d.line(50, 35, 50, 66, { stroke: '#000000', sw: 4.2, strokeLinecap: 'round', kind: 'line' });
      d.joint('pg-head', [50, 35], () => {
        d.circle(50, 20, 15.5, { fill: '#ffffff', stroke: '#000000', sw: 3.5, kind: 'body' });

        // Hair tells them apart: a tuft (boy), pigtails with a bow (girl), long hair (woman), a
        // short crop (man); seen from behind, just the hair
        const ink = { stroke: '#000000', strokeLinecap: 'round', fill: 'none', kind: 'line' };
        if (role === 'girl') {
          d.path('M37 12 Q50 2 63 12', { ...ink, sw: 3.4 });
          for (const sx of [-1, 1]) {
            d.path(`M${50 + sx * 14} 14 Q${50 + sx * 22} 12 ${50 + sx * 24} 22 Q${50 + sx * 20} 26 ${50 + sx * 15} 21`, { fill: '#000000', stroke: '#000000', sw: 1.6, kind: 'detail' });
          }
          d.path('M45 5 L50 8 L45 11 Z M55 5 L50 8 L55 11 Z', { fill: '#e11d48', stroke: '#000000', sw: 1.2, kind: 'accent' });
        } else if (role === 'woman') {
          d.path('M35 22 Q33 6 50 4.5 Q67 6 65 22 Q67 32 70 38 M35 22 Q33 32 30 38', { ...ink, sw: 3.2 });
        } else if (role === 'man') {
          d.path('M36 14 Q40 4.5 52 4.5 Q62 5 65 13', { ...ink, sw: 4.2 });
        } else {
          d.path('M44 6 Q46 0.5 49 5 M49 5 Q52 -0.5 54 5.5 M54 5.5 Q58 2 58.5 7.5', { ...ink, sw: 2.6 });
        }

        if (!fromBehind(p)) drawMinimalFace(d, faceX(p), 18, expr, '#000000', p);
      }, faceArea(p, 50, 20, 15.5));
    });
  });
}

/**
 * Draws Cute 2D (Kawaii) round bouncing ball characters (Style 2 from roadmap / Image 3).
 * Features spherical pastel bodies, tiny dot eyes, sweet smile, pink blush cheeks, raised stick arms with dot hands.
 */
export function drawCutePerson(d, p, role = 'boy') {
  const anim = p.opts.animation;
  const animClass = personRoot(p);
  const expr = p.opts.expression || p.expression || 'happy';
  const bodyColor = p.opts.color || (role === 'girl' ? '#fbcfe8' : role === 'man' ? '#ffffff' : role === 'woman' ? '#f5d0fe' : '#7dd3fc');

  d.group({ class: animClass, style: idleStyle(p) }, () => {
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
        p.grip = { x: 50, y: 56, hands: [[42, 54], [58, 54]], r: 3.4, fill: '#000000' };
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

    // (the kawaii ball is all head: a face photo goes in its middle)
    d.group({ class: 'pg-body-torso', data: faceArea(p, 50, 39, 17) }, () => {
      d.circle(50, 41, 27, { fill: bodyColor, stroke: '#000000', sw: 3.6, kind: 'body' });
      d.path('M 25 47 A 27 27 0 0 0 74 46 A 25 25 0 0 1 25 47 Z', { fill: '#000000', opacity: 0.12, kind: 'shadow' });

      if (!fromBehind(p)) {
        d.circle(faceX(p) - 12, 42, 3.8, { fill: '#f472b6', opacity: 0.65, kind: 'accent' });
        d.circle(faceX(p) + 12, 42, 3.8, { fill: '#f472b6', opacity: 0.65, kind: 'accent' });
        drawMinimalFace(d, faceX(p), 38, expr === 'happy' && (role === 'girl' || role === 'woman') ? 'laugh' : expr, '#000000', p);
      }
    });
  });
}

/**
 * Draws Geometric Bauhaus vector characters (Style 5 from roadmap).
 */
export function drawGeometricPerson(d, p, role = 'boy') {
  const anim = p.opts.animation;
  const animClass = personRoot(p);
  const expr = p.opts.expression || p.expression || 'happy';
  const primary = role === 'girl' ? '#ea580c' : role === 'man' ? '#1d4ed8' : role === 'woman' ? '#b45309' : '#0284c7';
  const secondary = role === 'girl' ? '#fb923c' : '#38bdf8';

  d.group({ class: animClass, style: idleStyle(p) }, () => {
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
        holdArms(d, p, { left: [28, 48], right: [72, 48], y: 58, w: 10, skin: secondary });
      } else {
        d.rect(22, 46, 12, 24, { fill: secondary, kind: 'body' });
      }
    });
    d.group({ class: 'pg-arm-right' }, () => {
      if (anim !== 'hold' && anim !== 'holding') {
        d.rect(66, 46, 12, 24, { fill: secondary, kind: 'body' });
      }
    });
    d.group({ class: 'pg-body-torso' }, () => {
      d.rect(36, 42, 28, 32, { fill: primary, kind: 'body' });
      d.joint('pg-head', [50, 40], () => {
        d.circle(50, 24, 16, { fill: '#f97316', kind: 'body' });
        d.rect(42, 10, 16, 6, { fill: '#1e3a8a', kind: 'body' });
        if (!fromBehind(p)) drawMinimalFace(d, faceX(p), 23, expr, '#0f172a', p);
      }, faceArea(p, 50, 24, 16));
    });
  });
}

/**
 * Draws Editorial Cartoon Silhouettes (Style 7 from roadmap / Image 2).
 * Features spindly stick legs, solid black silhouettes, walking dresses with windblown hair, and finger notches.
 */
export function drawEditorialPerson(d, p, role = 'boy') {
  const anim = p.opts.animation;
  const animClass = personRoot(p);
  const expr = p.opts.expression || p.expression || 'happy';

  d.group({ class: animClass, style: idleStyle(p) }, () => {
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
          p.grip = { x: 76, y: 40, hands: [[74, 38]], r: 1.8, fill: '#000000' };
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
        d.joint('pg-head', [52, 34], () => {
          d.path('M48 14 A 9 9 0 0 1 57 23 L62 24 L57 26 A 9 9 0 0 1 48 32 A 9 9 0 0 1 48 14 Z', { fill: '#000000', kind: 'body' });
          d.line(46, 17, 33, 11, { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', kind: 'line' });
          d.line(47, 20, 31, 16, { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', kind: 'line' });
          d.line(46, 23, 30, 21, { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', kind: 'line' });
          d.line(47, 26, 32, 27, { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', kind: 'line' });
          d.line(48, 29, 35, 32, { stroke: '#000000', sw: 2.2, strokeLinecap: 'round', kind: 'line' });
        }, faceArea(p, 52.5, 23, 9));
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
          p.grip = { x: 20, y: 38, hands: [[22, 36]], r: 1.8, fill: '#000000' };
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
        d.joint('pg-head', [52, 33], () => {
          d.ellipse(54, 23, 9, 11, { fill: '#000000', kind: 'body' });
          d.path('M51 14 Q59 12 63 19', { stroke: '#000000', sw: 2, strokeLinecap: 'round', fill: 'none', kind: 'line' });
          d.path('M56 13 Q62 16 63 22', { stroke: '#000000', sw: 1.8, strokeLinecap: 'round', fill: 'none', kind: 'line' });
        }, faceArea(p, 54, 23, 10));
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
          p.grip = { x: 50, y: 47, hands: [[43, 46], [57, 46]], r: 1.6, fill: '#000000' };
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
        d.joint('pg-head', [50, 27], () => {
          d.circle(50, 16, 9.5, { fill: '#000000', kind: 'body' });
        }, faceArea(p, 50, 16, 9.5));
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
  const animClass = personRoot(p);
  const expr = p.opts.expression || p.expression || 'happy';
  const paletteMap = {
    boy: '#9a4632',    // Warm terracotta craft paper
    girl: '#d6b88e',   // Warm sand craft paper
    man: '#7c8355',    // Muted olive craft paper
    woman: '#5c5346',  // Warm charcoal craft paper
  };
  const paperColor = p.opts.color || paletteMap[role] || '#9a4632';

  d.group({ class: animClass, style: idleStyle(p) }, () => {
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
        holdArms(d, p, { left: [30, 42], right: [70, 42], y: 56, w: 9, skin: paperColor });
      } else {
        d.rect(26, 38, 9, 26, { fill: paperColor, rx: 4.5, kind: 'body' });
      }
    });
    d.group({ class: 'pg-arm-right' }, () => {
      if (anim !== 'hold' && anim !== 'holding') {
        d.rect(65, 38, 9, 26, { fill: paperColor, rx: 4.5, kind: 'body' });
      }
    });

    d.group({ class: 'pg-body-torso' }, () => {
      // Smooth rounded paper cutout torso
      d.rect(34, 36, 32, 34, { fill: paperColor, rx: 8, kind: 'body' });
      d.joint('pg-head', [50, 34], () => {
        // Smooth circular paper head
        d.circle(50, 20, 13, { fill: paperColor, kind: 'body' });
        // Subtle paper cutout face details
        if (!fromBehind(p)) drawMinimalFace(d, faceX(p), 19, expr, '#27272a', p);
      }, faceArea(p, 50, 20, 13));
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
  if (st === 'geometric') { drawGeometricPerson(d, p, role); return true; }
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
      if (viewOf(p) === 'side') return drawSidePerson(d, p, SIDE.boy);
      const skin = p.c('skin'), shirt = p.c('main');
      const anim = p.opts.animation, holding = isHolding(p);
      const animClass = personRoot(p);

      d.group({ class: animClass, style: idleStyle(p) }, () => {
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
          if (holding) {
            // (in front of the body, below)
          } else if (anim === 'point' || anim === 'pointing') {
            d.rect(12, 44, 24, 8, { fill: skin, rx: 4 });
            d.rect(26, 43.5, 11, 9, { fill: shirt, rx: 3 });
          } else if (anim === 'thumbsup') {
            d.rect(20, 32, 8, 18, { fill: skin, rx: 4 });
            d.rect(26, 44, 10, 9, { fill: shirt, rx: 3 });
          } else {
            d.group('rotate(14 31 47)', () => {
              d.rect(27, 46, 8, 22, { fill: skin, rx: 4 });
              d.rect(26.5, 45, 9, 10, { fill: shirt, rx: 3 });
            });
          }
        });

        // Right arm
        d.group({ class: 'pg-arm-right' }, () => {
          if (!holding) {
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

          // The head turns at the neck: glances, nods, tilts
          d.joint('pg-head', [50, 41], () => {
            d.circle(turned(p) ? 37 : 35.5, 28, 3.5, { fill: skin });
            if (!turned(p)) d.circle(64.5, 28, 3.5, { fill: skin });
            d.circle(50, 27, 15, { fill: skin });
            if (fromBehind(p)) {
              // Back of the head: hair down to the nape, a crown swirl
              d.path('M35 27 C35 13 43 11 50 11 C57 11 65 13 65 27 C65 33 62 37 57 38 L43 38 C38 37 35 33 35 27 Z', { fill: p.c('hair') });
              d.path('M47 19 Q50 16 53 19', { kind: 'line', stroke: INK, sw: 1, opacity: 0.35 });
              if (isAnime(p)) drawAnimeHair(d, p, 'boy', 50, 27, 15, 'back');
            } else {
              d.path('M35 26 C35 13 44 10 51 10 C59 10 66 14 65.5 25 C62 21 57 19 52 21 C48 18 41 19 35 26 Z', { fill: p.c('hair') });
              if (isAnime(p)) drawAnimeHair(d, p, 'boy', 50, 27, 15);
              drawFace(d, p, 50, 28);
            }
          }, faceArea(p, 50, 27, 15));
        });
        if (holding) holdArms(d, p, { left: [31, 47], right: [69, 47], y: 58, w: 8, skin, sleeve: shirt });
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
      if (viewOf(p) === 'side') return drawSidePerson(d, p, SIDE.girl);
      const skin = p.c('skin'), dress = p.c('main');
      const anim = p.opts.animation, holding = isHolding(p);
      const animClass = personRoot(p);

      d.group({ class: animClass, style: idleStyle(p) }, () => {
        d.group({ class: 'pg-leg-left' }, () => {
          d.rect(42, 74, 6, 17, { fill: skin, rx: 2 });
          d.ellipse(44, 92, 6, 3.5, { fill: p.c('shoe') });
        });
        d.group({ class: 'pg-leg-right' }, () => {
          d.rect(52, 74, 6, 17, { fill: skin, rx: 2 });
          d.ellipse(56, 92, 6, 3.5, { fill: p.c('shoe') });
        });

        d.group({ class: 'pg-arm-left' }, () => {
          if (holding) {
            // (in front of the body, below)
          } else if (anim === 'point' || anim === 'pointing') {
            d.rect(16, 44, 22, 7, { fill: skin, rx: 3.5 });
          } else if (anim === 'thumbsup') {
            d.rect(24, 30, 7, 18, { fill: skin, rx: 3.5 });
          } else {
            d.group('rotate(16 33 46)', () => {
              d.rect(29, 46, 7, 20, { fill: skin, rx: 3.5 });
            });
          }
        });
        d.group({ class: 'pg-arm-right' }, () => {
          if (!holding) {
            d.group('rotate(-16 67 46)', () => {
              d.rect(64, 46, 7, 20, { fill: skin, rx: 3.5 });
            });
          }
        });

        d.group({ class: 'pg-body-torso' }, () => {
          d.poly([[42, 45], [58, 45], [68, 76], [32, 76]], { fill: dress, kind: 'body' });
          d.rect(47, 37, 6, 8, { fill: skin });
          d.joint('pg-head', [50, 40], () => {
            d.circle(50, 27, 14, { fill: skin });

            d.circle(32, 22, 7, { fill: p.c('hair'), kind: 'body' });
            d.circle(68, 22, 7, { fill: p.c('hair'), kind: 'body' });
            if (fromBehind(p)) {
              // Back of the head: hair covers it, with a centre parting
              d.path('M36 27 C36 12 44 12 50 12 C56 12 64 12 64 27 C64 34 59 38 50 38 C41 38 36 34 36 27 Z', { fill: p.c('hair'), kind: 'body' });
              d.line(50, 13, 50, 25, { stroke: INK, sw: 1, opacity: 0.3, kind: 'line' });
              if (isAnime(p)) drawAnimeHair(d, p, 'girl', 50, 27, 14, 'back');
            } else {
              d.path('M36 28 C36 12 44 11 50 11 C56 11 64 12 64 28 C60 22 56 20 50 20 C44 20 40 22 36 28 Z', { fill: p.c('hair'), kind: 'body' });
              if (isAnime(p)) drawAnimeHair(d, p, 'girl', 50, 27, 14);
              drawFace(d, p, 50, 28);
            }
          }, faceArea(p, 50, 27, 14));
        });
        if (holding) holdArms(d, p, { left: [33, 46], right: [67, 46], y: 57, w: 7, skin });
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
      if (viewOf(p) === 'side') return drawSidePerson(d, p, SIDE.man);
      const skin = p.c('skin'), shirt = p.c('main');
      const anim = p.opts.animation, holding = isHolding(p);
      const animClass = personRoot(p);

      d.group({ class: animClass, style: idleStyle(p) }, () => {
        d.group({ class: 'pg-leg-left' }, () => {
          d.rect(39, 64, 10, 28, { fill: p.c('pants'), rx: 2 });
          d.ellipse(43, 93, 8, 4, { fill: p.c('shoe') });
        });
        d.group({ class: 'pg-leg-right' }, () => {
          d.rect(51, 64, 10, 28, { fill: p.c('pants'), rx: 2 });
          d.ellipse(57, 93, 8, 4, { fill: p.c('shoe') });
        });

        d.group({ class: 'pg-arm-left' }, () => {
          if (holding) {
            // (in front of the body, below)
          } else if (anim === 'point' || anim === 'pointing') {
            d.rect(12, 42, 24, 8, { fill: skin, rx: 4 });
          } else if (anim === 'thumbsup') {
            d.rect(22, 28, 8, 18, { fill: skin, rx: 4 });
          } else {
            d.rect(26, 42, 8, 24, { fill: skin, rx: 4 });
          }
        });
        d.group({ class: 'pg-arm-right' }, () => {
          if (!holding) {
            d.rect(66, 42, 8, 24, { fill: skin, rx: 4 });
          }
        });

        d.group({ class: 'pg-body-torso' }, () => {
          d.rect(46, 34, 8, 8, { fill: skin });
          d.path('M34 42 L66 42 L64 66 L36 66 Z', { fill: shirt });
          d.joint('pg-head', [50, 37], () => {
            if (fromBehind(p)) {
              d.circle(37, 25, 3, { fill: skin });
              d.circle(63, 25, 3, { fill: skin });
            }
            d.circle(50, 24, 13, { fill: skin });
            if (fromBehind(p)) {
              // Back of the head: short hair down to the nape
              d.path('M37 23 C37 11 44 10 50 10 C56 10 63 11 63 23 C63 29 60 32 56 33 L44 33 C40 32 37 29 37 23 Z', { fill: p.c('hair') });
              if (isAnime(p)) drawAnimeHair(d, p, 'man', 50, 24, 13, 'back');
            } else {
              d.path('M37 22 C37 11 44 9 50 9 C56 9 63 11 63 22 C59 18 55 16 50 16 C45 16 41 18 37 22 Z', { fill: p.c('hair') });
              if (isAnime(p)) drawAnimeHair(d, p, 'man', 50, 24, 13);
              drawFace(d, p, 50, 24);
            }
          }, faceArea(p, 50, 24, 13));
        });
        if (holding) holdArms(d, p, { left: [30, 44], right: [70, 44], y: 56, w: 8, skin });
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
      if (viewOf(p) === 'side') return drawSidePerson(d, p, SIDE.woman);
      const skin = p.c('skin'), top = p.c('main');
      const anim = p.opts.animation, holding = isHolding(p);
      const animClass = personRoot(p);

      d.group({ class: animClass, style: idleStyle(p) }, () => {
        d.group({ class: 'pg-leg-left' }, () => {
          d.rect(40, 66, 9, 26, { fill: p.c('pants'), rx: 2 });
          d.ellipse(43, 93, 7, 3.5, { fill: p.c('shoe') });
        });
        d.group({ class: 'pg-leg-right' }, () => {
          d.rect(51, 66, 9, 26, { fill: p.c('pants'), rx: 2 });
          d.ellipse(57, 93, 7, 3.5, { fill: p.c('shoe') });
        });

        d.group({ class: 'pg-arm-left' }, () => {
          if (holding) {
            // (in front of the body, below)
          } else if (anim === 'point' || anim === 'pointing') {
            d.rect(14, 42, 22, 7, { fill: skin, rx: 3.5 });
          } else if (anim === 'thumbsup') {
            d.rect(24, 28, 7, 18, { fill: skin, rx: 3.5 });
          } else {
            d.rect(28, 42, 7, 22, { fill: skin, rx: 3.5 });
          }
        });
        d.group({ class: 'pg-arm-right' }, () => {
          if (!holding) {
            d.rect(65, 42, 7, 22, { fill: skin, rx: 3.5 });
          }
        });

        d.group({ class: 'pg-body-torso' }, () => {
          d.rect(47, 34, 6, 8, { fill: skin });
          d.path('M36 42 L64 42 L62 67 L38 67 Z', { fill: top });
          d.joint('pg-head', [50, 37], () => {
            d.circle(50, 24, 13, { fill: skin });
            if (fromBehind(p)) {
              // Back of the head: long hair falling over the shoulders
              d.path('M35 25 C35 10 44 8 50 8 C56 8 65 10 65 25 L66 45 C66 49 60 50 50 50 C40 50 34 49 34 45 Z', { fill: p.c('hair') });
              if (isAnime(p)) drawAnimeHair(d, p, 'woman', 50, 24, 13, 'back');
            } else {
              // Turned three-quarters, the near strand falls behind the face: only the far one shows
              d.path(turned(p)
                ? 'M35 25 C35 10 44 8 50 8 C56 8 65 10 65 25 C61 19 56 17 52 18 C47 18 43 18 38 26 L38 43 C37 48 33 48 33 46 Z'
                : 'M35 25 C35 10 44 8 50 8 C56 8 65 10 65 25 L67 46 C67 48 63 48 62 43 L62 26 C57 18 53 18 50 18 C47 18 43 18 38 26 L38 43 C37 48 33 48 33 46 Z', { fill: p.c('hair') });
              if (isAnime(p)) drawAnimeHair(d, p, 'woman', 50, 24, 13);
              drawFace(d, p, 50, 24);
            }
          }, faceArea(p, 50, 24, 13));
        });
        if (holding) holdArms(d, p, { left: [31.5, 44], right: [68.5, 44], y: 56, w: 7, skin });
      });
    },
  },
];
