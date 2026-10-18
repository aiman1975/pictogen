// Color helpers (hex only, no dependencies)

export const COLOR_WORDS = {
  red: '#e53935', green: '#43a047', blue: '#1e88e5', yellow: '#fdd835', orange: '#fb8c00',
  purple: '#8e24aa', violet: '#8e24aa', pink: '#ec407a', brown: '#8d6e63', black: '#212121',
  white: '#fafafa', gray: '#9e9e9e', grey: '#9e9e9e', golden: '#ffb300', gold: '#ffb300',
  silver: '#b0bec5', cyan: '#00acc1', teal: '#00897b', navy: '#1a237e', beige: '#d7ccc8',
};

export function isHex(c) {
  return typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);
}

export function hexToRgb(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(rgb) {
  return '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

/** Linear mix of two hex colors; t=0 -> a, t=1 -> b. Non-hex input is returned unchanged. */
export function mix(a, b, t) {
  if (!isHex(a) || !isHex(b)) return a;
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}

export const lighten = (c, t) => mix(c, '#ffffff', t);
export const darken = (c, t) => mix(c, '#000000', t);

/** Perceived brightness 0..1 */
export function luminance(c) {
  if (!isHex(c)) return 0.5;
  const [r, g, b] = hexToRgb(c);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Accepts a hex color or a color word ("red"), returns hex or undefined. */
export function resolveColor(c) {
  if (!c) return undefined;
  if (isHex(c)) return c;
  return COLOR_WORDS[String(c).toLowerCase().trim()];
}

/** More (t > 0) or less (t < 0) saturated, keeping the lightness: t=0.3 -> 30% further from grey. */
export function saturate(c, t) {
  if (!isHex(c)) return c;
  const rgb = hexToRgb(c);
  const grey = (rgb[0] + rgb[1] + rgb[2]) / 3;
  return rgbToHex(rgb.map((v) => v + (v - grey) * t));
}

/** The color of `palette` (hex list) nearest to c, by an eye-weighted RGB distance. */
export function nearest(c, palette) {
  if (!isHex(c)) return c;
  const [r, g, b] = hexToRgb(c);
  let best = palette[0], bestD = Infinity;
  for (const p of palette) {
    const [R, G, B] = hexToRgb(p);
    const rm = (r + R) / 2; // ("redmean": close to how different the eye finds them)
    const d = (2 + rm / 256) * (r - R) ** 2 + 4 * (g - G) ** 2 + (2 + (255 - rm) / 256) * (b - B) ** 2;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}
