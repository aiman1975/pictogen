// Printable worksheets (A4, portrait): a title, name and date lines, what to do, the picture, and
// the activity -
//   write:  lines to write about the picture on (with a dashed middle line, as children learn)
//   count:  "how many?" boxes for the things in the picture, each with its drawing
//   label:  a labelled diagram (or labelled pictures) with blank, numbered labels and a word bank
//   colour: the picture as a colouring page, and a line to name it
// and, for count and label, an answer key on a second page. Each page is one SVG with its fonts
// inside, so it prints and turns into a PDF the same anywhere (public/js/worksheet.js), offline.

import { generate } from './index.js';
import { getConcept } from './concepts/index.js';
import { renderIcon, FONT, esc } from './core/render.js';
import { fitText } from './bubble.js';
import { embeddedFontCss } from './fonts.js';

export const PAGE = { width: 794, height: 1123 }; // A4 at 96 dpi
export const WORKSHEET_KINDS = ['write', 'count', 'label', 'colour'];
const M = 52; // margin
const INK = '#1f2937', MUTED = '#64748b', RULE = '#94a3b8', ACCENT = '#2563eb';

const r1 = (v) => Math.round(v * 10) / 10;
const text = (x, y, s, { size = 16, weight = 700, fill = INK, anchor = 'start', italic = false } = {}) =>
  `<text x="${r1(x)}" y="${r1(y)}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}"${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}${italic ? ' font-style="italic"' : ''}>${esc(s)}</text>`;

// An SVG placed inside the page, scaled to fit the box (its own viewBox keeps its drawing)
function place(svg, x, y, w, h) {
  return svg.replace(/^<svg([^>]*?) width="[\d.]+" height="[\d.]+"/, `<svg$1 x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" preserveAspectRatio="xMidYMid meet"`);
}

// Handwriting lines: a top line, a dashed middle line, the baseline
function writingLines(y, n, gap) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const b = y + i * gap + gap * 0.75;
    s += `<line x1="${M}" y1="${r1(b - gap * 0.5)}" x2="${PAGE.width - M}" y2="${r1(b - gap * 0.5)}" stroke="${RULE}" stroke-width="0.8" opacity="0.6"/>`;
    s += `<line x1="${M}" y1="${r1(b - gap * 0.25)}" x2="${PAGE.width - M}" y2="${r1(b - gap * 0.25)}" stroke="${RULE}" stroke-width="0.8" stroke-dasharray="6 5"/>`;
    s += `<line x1="${M}" y1="${r1(b)}" x2="${PAGE.width - M}" y2="${r1(b)}" stroke="${INK}" stroke-width="1.2"/>`;
  }
  return s;
}

// The things to count in a picture: what the prompt named, with how many (people, animals,
// things; not the sky or the backdrop), up to six
function countables(matches) {
  const out = [];
  for (const m of matches) {
    const c = getConcept(String(m.id).split('~')[0]);
    if (!c || ['sky', 'background'].includes(c.placement) || m.heldBy) continue;
    const prev = out.find((o) => o.c.id === c.id);
    if (prev) prev.n += m.count || 1;
    else out.push({ c, m, n: m.count || 1 });
  }
  return out.slice(0, 6);
}
const plural = (word, n) => (n === 1 ? word : /(s|x|ch|sh)$/.test(word) ? `${word}es` : /[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}ies` : `${word}s`);

/** Which kind of worksheet suits a prompt best */
export function worksheetKind(result, mode) {
  if (result.diagram || mode === 'diagram' || mode === 'callout') return 'label';
  if (mode === 'coloring') return 'colour';
  if (countables(result.matches || []).some((t) => t.n > 1)) return 'count';
  return 'write';
}

const INSTRUCTIONS = {
  write: 'Look at the picture. Write about what you see.',
  count: 'Count the things in the picture. Write the number in each box.',
  label: 'Write the right word on each line. Use the word bank to help you.',
  colour: 'Colour the picture. Then give it a name.',
};

/**
 * renderWorksheet(text, opts) -> { pages: [svg, answer key svg?], kind, title }
 *   opts: { kind ('auto' | 'write' | 'count' | 'label' | 'colour'), title, instructions, lines (write),
 *           answers (an answer key page), style, mode, seed, vary, labels, individuals }
 */
export function renderWorksheet(prompt, opts = {}) {
  const { style = 'flat', seed = 1, vary = false } = opts;
  const mode = opts.mode && opts.mode !== 'story' ? opts.mode : 'scene';
  const base = { style, seed, vary, mode, ...(opts.individuals ? { individuals: opts.individuals } : {}), ...(opts.labels ? { labels: opts.labels } : {}) };
  // The picture as it is in the studio, to tell which kind fits
  const seen = generate(prompt, { ...base, width: 640, height: 360 });
  const kind = WORKSHEET_KINDS.includes(opts.kind) ? opts.kind : worksheetKind(seen, mode);
  const W = PAGE.width, H = PAGE.height, inner = W - 2 * M;
  const title = String(opts.title || seen.diagram?.title || prompt.charAt(0).toUpperCase() + prompt.slice(1)).replace(/\s+/g, ' ').trim().slice(0, 70) || 'Worksheet';
  const instructions = String(opts.instructions || INSTRUCTIONS[kind]).slice(0, 160);

  // The picture for this kind: a still scene, a diagram with blank labels, a colouring page
  const picH = kind === 'label' ? 560 : kind === 'colour' ? 640 : 400;
  const picOpts = { ...base, width: kind === 'label' ? 760 : 720, height: kind === 'label' ? 560 : kind === 'colour' ? 640 : 400 };
  const pic = (answers) => {
    if (kind === 'label') return generate(prompt, { ...picOpts, mode: seen.diagram ? mode : 'diagram', blank: !answers, numbered: true }).svg;
    if (kind === 'colour') return generate(prompt, { ...picOpts, mode: 'coloring' }).svg;
    return generate(prompt, picOpts).svg;
  };

  const page = (answers) => {
    let y = M;
    let s = `<rect width="${W}" height="${H}" fill="#ffffff"/>`;
    // Title, name and date
    const t = fitText(title, { maxW: inner * 0.62, maxLines: 2, size: 30, minSize: 18 });
    t.lines.forEach((l, i) => { s += text(M, y + t.size * (0.95 + i * 1.15), l, { size: t.size, weight: 900 }); });
    const nameY = y + 18;
    s += text(W - M - 250, nameY, 'Name:', { size: 15, weight: 700, fill: MUTED }) + `<line x1="${W - M - 200}" y1="${nameY + 3}" x2="${W - M}" y2="${nameY + 3}" stroke="${INK}" stroke-width="1"/>`;
    s += text(W - M - 250, nameY + 34, 'Date:', { size: 15, weight: 700, fill: MUTED }) + `<line x1="${W - M - 200}" y1="${nameY + 37}" x2="${W - M}" y2="${nameY + 37}" stroke="${INK}" stroke-width="1"/>`;
    y += Math.max(t.lines.length * t.size * 1.15 + 10, 62);
    if (answers) {
      s += `<rect x="${M}" y="${y}" width="${inner}" height="30" rx="6" fill="#fef3c7"/>` + text(M + 12, y + 20.5, 'Answer key (for the teacher)', { size: 15, weight: 900, fill: '#92400e' });
      y += 42;
    }
    // What to do
    const ins = fitText(instructions, { maxW: inner, maxLines: 2, size: 17, minSize: 13 });
    ins.lines.forEach((l, i) => { s += text(M, y + ins.size * (1 + i * 1.25), l, { size: ins.size, weight: 700, fill: '#334155', italic: true }); });
    y += ins.lines.length * ins.size * 1.25 + 16;
    // The picture, framed
    s += `<rect x="${M}" y="${r1(y)}" width="${inner}" height="${picH * (inner / picOpts.width)}" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>`;
    const ph = picH * (inner / picOpts.width);
    s += place(pic(answers), M + 4, y + 4, inner - 8, ph - 8);
    y += ph + 24;

    // The activity
    const left = H - M - 30 - y;
    if (kind === 'write') {
      const n = Math.max(2, Math.min(opts.lines ?? 6, Math.floor(left / 62)));
      s += writingLines(y, n, Math.min(70, left / n));
    } else if (kind === 'count') {
      const things = countables(seen.matches || []);
      // (several kinds: then how many altogether)
      const rowsOf = [...things, ...(things.length > 1 ? [{ total: true, n: things.reduce((t, x) => t + x.n, 0) }] : [])];
      const cols = rowsOf.length > 4 ? 2 : 1, rows = Math.ceil(rowsOf.length / cols);
      const rowH = Math.min(118, left / Math.max(1, rows)), colW = inner / cols;
      rowsOf.forEach(({ c, n, total }, i) => {
        if (total) {
          const x = M + (i % cols) * colW, ry = y + Math.floor(i / cols) * rowH;
          s += text(x + 4, ry + rowH / 2 + 7, 'How many altogether?', { size: 19, weight: 900 });
          const bx = x + colW - 86, by = ry + (rowH - 62) / 2;
          s += `<rect x="${r1(bx)}" y="${r1(by)}" width="62" height="62" rx="8" fill="#fef9c3" stroke="${INK}" stroke-width="2"/>`;
          if (answers) s += text(bx + 31, by + 44, String(n), { size: 34, weight: 900, fill: '#dc2626', anchor: 'middle' });
          return;
        }
        const x = M + (i % cols) * colW, ry = y + Math.floor(i / cols) * rowH;
        const icon = renderIcon(c.id, { style, size: 76, seed });
        s += place(icon, x, ry + (rowH - 76) / 2, 76, 76);
        const word = (c.label || c.id).replace(/_/g, ' ');
        const q = fitText(`How many ${plural(word, 2)}?`, { maxW: colW - 76 - 110, maxLines: 2, size: 19, minSize: 13 });
        q.lines.forEach((l, k) => { s += text(x + 88, ry + rowH / 2 + q.size * (0.35 + (k - (q.lines.length - 1) / 2) * 1.2), l, { size: q.size, weight: 800 }); });
        const bx = x + colW - 86, by = ry + (rowH - 62) / 2;
        s += `<rect x="${r1(bx)}" y="${r1(by)}" width="62" height="62" rx="8" fill="#ffffff" stroke="${INK}" stroke-width="2"/>`;
        if (answers) s += text(bx + 31, by + 44, String(n), { size: 34, weight: 900, fill: '#dc2626', anchor: 'middle' });
      });
    } else if (kind === 'label') {
      // (a sentence about it, below the diagram)
      if (left > 90) {
        s += text(M, y + 18, 'Write one thing you learned:', { size: 16, weight: 800, fill: '#334155' });
        s += writingLines(y + 28, Math.max(1, Math.min(4, Math.floor((left - 30) / 62))), 62);
      }
    } else if (kind === 'colour') {
      s += text(M, y + 30, 'My picture is called:', { size: 18, weight: 800 }) + `<line x1="${M + 210}" y1="${y + 33}" x2="${W - M}" y2="${y + 33}" stroke="${INK}" stroke-width="1.2"/>`;
    }
    s += text(W / 2, H - M / 2, 'Made with PictoGen', { size: 10, weight: 600, fill: '#cbd5e1', anchor: 'middle' });
    // A worksheet is a still page: nothing moves, the fonts are inside
    const css = `${embeddedFontCss('Nunito')}\n* { animation: none !important; transition: none !important; }`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><title>${esc(title)}</title><defs><style><![CDATA[${css}]]></style></defs>${s}</svg>`;
  };

  const pages = [page(false)];
  if (opts.answers !== false && (kind === 'count' || kind === 'label')) pages.push(page(true));
  return { pages, kind, title };
}
