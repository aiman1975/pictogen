// Speech bubbles that fit: the words wrapped to the room there is (smaller type, then cut with
// "…" when there is too much), the bubble kept inside the picture and clear of the others, its
// tail pointing at whoever speaks. Used by scenes (src/scene.js) and the comic strip.

import { FONT, esc } from './core/render.js';

const r1 = (v) => Math.round(v * 10) / 10;

// The width of a character in the studio's bold rounded font, in ems (near enough to lay out by)
const charW = (ch) => (/\s/.test(ch) ? 0.28 : /[il.,:;'!|]/.test(ch) ? 0.3 : /[fjrt()]/.test(ch) ? 0.42 : /[mw]/.test(ch) ? 0.88
  : /[MW@]/.test(ch) ? 0.95 : /[A-Z0-9?]/.test(ch) ? 0.68 : /[^\x00-\x7f]/.test(ch) ? 1.1 : 0.58);
/** The width of a line of text at a font size (px), roughly */
export const textWidth = (s, size) => [...String(s)].reduce((a, c) => a + charW(c), 0) * size;

// Words into lines no wider than maxW; a word longer than a line is cut to fit
function wrap(text, size, maxW) {
  const lines = [];
  let line = '';
  for (let word of String(text).split(/\s+/).filter(Boolean)) {
    while (textWidth(word, size) > maxW && word.length > 1) {
      let n = word.length - 1;
      while (n > 1 && textWidth(word.slice(0, n) + '-', size) > maxW) n--;
      if (line) { lines.push(line); line = ''; }
      lines.push(word.slice(0, n) + '-');
      word = word.slice(n);
    }
    const next = line ? `${line} ${word}` : word;
    if (line && textWidth(next, size) > maxW) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Words laid out to fit a box at most maxW wide and maxLines lines: the largest size from `size`
 * down to `minSize` at which they fit, else at minSize cut short with "…".
 * -> { lines, size, w (widest line), h (all lines) }
 */
export function fitText(text, { maxW, maxLines = 3, size = 14, minSize = 9, lineHeight = 1.2 }) {
  let s = size, lines = wrap(text, s, maxW);
  while (lines.length > maxLines && s > minSize) {
    s = Math.max(minSize, s - 1);
    lines = wrap(text, s, maxW);
  }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last.length > 1 && textWidth(last + '…', s) > maxW) last = last.slice(0, -1).trimEnd();
    lines[maxLines - 1] = last.replace(/[\s,.;:-]+$/, '') + '…';
  }
  return { lines, size: s, w: Math.max(0, ...lines.map((l) => textWidth(l, s))), h: lines.length * s * lineHeight };
}

const overlaps = (a, b, gap = 4) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

// The outline: a rounded box with the tail cut into the edge nearest the speaker
function bubblePath({ x, y, w, h }, tip, side) {
  const r = Math.min(h / 2, 12, w / 2);
  const tw = Math.min(14, w / 4, h / 2); // the tail's width where it leaves the box
  const along = (lo, hi, v) => Math.min(hi - r - tw, Math.max(lo + r, v - tw / 2));
  const T = (a, b) => `L ${r1(a)} ${r1(b)}`;
  let p = `M ${r1(x + r)} ${r1(y)} ${T(x + w - r, y)} Q ${r1(x + w)} ${r1(y)} ${r1(x + w)} ${r1(y + r)}`;
  if (side === 'right') { const a = along(y, y + h, tip.y); p += ` ${T(x + w, a)} ${T(tip.x, tip.y)} ${T(x + w, a + tw)}`; }
  p += ` ${T(x + w, y + h - r)} Q ${r1(x + w)} ${r1(y + h)} ${r1(x + w - r)} ${r1(y + h)}`;
  if (side === 'bottom') { const a = along(x, x + w, tip.x); p += ` ${T(a + tw, y + h)} ${T(tip.x, tip.y)} ${T(a, y + h)}`; }
  p += ` ${T(x + r, y + h)} Q ${r1(x)} ${r1(y + h)} ${r1(x)} ${r1(y + h - r)}`;
  if (side === 'left') { const a = along(y, y + h, tip.y); p += ` ${T(x, a + tw)} ${T(tip.x, tip.y)} ${T(x, a)}`; }
  return `${p} ${T(x, y + r)} Q ${r1(x)} ${r1(y)} ${r1(x + r)} ${r1(y)} Z`;
}

/**
 * Bubbles for people speaking, laid out together inside a W x H picture.
 *   list: [{ x, top, text, shout?, room? }] - x the speaker's middle, top the top of their head;
 *         room: how wide they are (the bubble may go beside them when there's no room above)
 *   opts: { W, H, margin, size (px), maxLines, maxWidth (of W), avoid: [{ x, y, w, h }] }
 * -> [{ svg, box, tip }] in the list's order
 */
export function layoutBubbles(list, { W, H, margin = 6, size = Math.max(10, Math.min(20, W / 34)), maxLines = 3, maxWidth = 0.44, avoid = [] } = {}) {
  const placed = [...avoid];
  return list.map(({ x, top, text, shout = /!/.test(text) && /[A-Z]{2}/.test(text) && text === text.toUpperCase(), room = 40 }) => {
    const padX = size * 0.75, padY = size * 0.5;
    const maxW = Math.min(W * maxWidth, W - 2 * margin - 2 * padX);
    const fit = fitText(text, { maxW, maxLines, size, minSize: Math.max(8, size * 0.7) });
    const w = fit.w + 2 * padX, h = fit.h + 2 * padY;
    const tail = Math.max(8, size * 0.8);
    const clampX = (bx) => Math.min(W - margin - w, Math.max(margin, bx));
    const clampY = (by) => Math.min(H - margin - h, Math.max(margin, by));
    // Above the head (centred, then leaning either way, then higher), then beside it
    const tries = [];
    for (const lift of [0, 1, 2]) {
      for (const lean of [0, 0.35, -0.35, 0.7, -0.7]) tries.push({ x: clampX(x - w / 2 + lean * w), y: top - tail - h - lift * (h + 6), side: 'bottom' });
    }
    const beside = Math.max(top, margin);
    tries.push({ x: x + room / 2 + tail, y: beside, side: 'left' }, { x: x - room / 2 - tail - w, y: beside, side: 'right' });
    const fits = (b) => b.x >= margin - 0.5 && b.x + b.w <= W - margin + 0.5 && b.y >= margin - 0.5 && b.y + b.h <= H - margin + 0.5;
    let best = tries.map((b) => ({ ...b, w, h })).find((b) => fits(b) && !placed.some((o) => overlaps(b, o)));
    // Nowhere free: above the head as near as the picture allows
    if (!best) best = { x: clampX(x - w / 2), y: clampY(top - tail - h), w, h, side: 'bottom' };
    placed.push(best);
    let side = best.side, tip;
    if (side === 'bottom') {
      tip = { x: Math.min(best.x + w - 6, Math.max(best.x + 6, x)), y: Math.min(top - 2, best.y + h + tail) };
      if (tip.y < best.y + h + 3) side = null; // (squeezed onto the head: no room for a tail)
    } else tip = { x: side === 'left' ? best.x - tail : best.x + w + tail, y: best.y + Math.min(h - 6, tail + 4) };
    const fill = shout ? '#fff59d' : '#ffffff';
    const lines = fit.lines.map((l, i) => `<tspan x="${r1(best.x + w / 2)}" y="${r1(best.y + padY + fit.size * (0.95 + i * 1.2))}">${esc(l)}</tspan>`).join('');
    const svg = `<g class="pg-bubble"><path d="${bubblePath(best, tip, side)}" fill="${fill}" stroke="#1f2937" stroke-width="${r1(Math.max(1.5, size / 8))}" stroke-linejoin="round"/>`
      + `<text text-anchor="middle" font-family="${FONT}" font-size="${r1(fit.size)}" font-weight="800" fill="#1f2937">${lines}</text></g>`;
    return { svg, box: { x: best.x, y: best.y, w, h }, tip, lines: fit.lines };
  });
}
