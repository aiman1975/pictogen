// Explainer clips from an outline: cards with a headline, points that appear one by one, a big
// number, a comparison, steps, a quote, a recap - each a scene of a clip, with pictures from the
// library, a slow camera drift, a soft sound as each point appears, and as long on screen as it
// takes to read. Written by hand, or (later) by a writer that turns notes into the same outline.
//
//   # Compound Interest                     the clip's title (its first card)
//   Why starting early matters              (a line under it: the subtitle)
//   ## Money grows on money                 a card: its headline...
//   - You earn interest on your interest    ...and its points
//   Show: coins and a chart                 what to show beside them (else picked from the words)
//   ## 7% a year                            a big number (a headline starting with one)
//   ## Saving vs Spending                   two sides ("A | B" per point, or the points halved)
//   1. Open an account                      numbered points: steps
//   > Time is money. — Benjamin Franklin    a quote
//   ## Recap                                points with ticks (also Summary, Key takeaways...)
//   Scene: a teacher points at the board    an acted scene, like a line of a story
import { getConcept } from './concepts/index.js';
import { parseText } from './text/matcher.js';
import { drawConcept, shapesToSvg, svgDoc, newUid, esc } from './core/render.js';
import { textWidth } from './bubble.js';
import { soundTrack } from './sound.js';

const r2 = (v) => Math.round(v * 100) / 100;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const words = (s) => String(s ?? '').split(/\s+/).filter(Boolean).length;
const FONT = "'Nunito','Segoe UI','Helvetica Neue',Arial,sans-serif";
/** Reading speed (words a second) a card's time is measured by */
export const READ_WPS = 3.2;

const HEADING = /^(#{1,3})\s+(.+)$/;
const BULLET = /^(?:[-*•–]|(\d+)[.)])\s+(.+)$/;
const QUOTE = /^>\s*(.+)$/;
const SHOW = /^(?:show|picture|image|visual)\s*:\s*(.+)$/i;
const SCENE = /^(?:scene|🎬)\s*:?\s*(.+)$/i;
const RECAP = /^(recap|summary|in summary|in short|key takeaways?|takeaways|to sum up|remember|what to remember)\b/i;
const VERSUS = /\s+(?:vs\.?|versus)\s+/i;
const STEPS = /^(how to|steps?\b|the steps|the process|in \d+ steps)/i;
// A number to show big: "7%", "$1.8T", "3x", "40 years", "1 in 4"
const STAT = /^((?:[$€£¥]\s?)?\d[\d,.]*\s?(?:%|x|×|k|m|bn|t|million|billion|trillion|thousand|years?|months?|weeks?|days?|hours?|minutes?|seconds?|kg|km|percent)?(?:\s+in\s+\d+)?)(?=\s|$|[:–—-])\s*(?:[:–—|-]\s*)?(.*)$/i;

/** True when the text is an outline ("# Title", "## Headline", "- point") rather than a story */
export function isOutline(text) {
  const lines = String(text ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const heads = lines.filter((l) => HEADING.test(l)).length;
  const points = lines.filter((l) => BULLET.test(l) || QUOTE.test(l)).length;
  return heads >= 1 && (heads >= 2 || points >= 1);
}

/**
 * The outline read: { title, subtitle, cards }. Each card: { kind, headline, points: [{ text, left?,
 * right? }], note, show, number, label, quote, by, prompt }; kind: title, bullets, number, compare,
 * steps, quote, recap, statement or scene.
 */
export function readOutline(text) {
  const lines = String(text ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const cards = [];
  let title = null, subtitle = null, card = null;
  const open = (c) => { card = { points: [], ...c }; cards.push(card); return card; };
  for (const line of lines) {
    let m;
    if ((m = HEADING.exec(line))) {
      const text = m[2].replace(/\s*#+\s*$/, '').trim();
      if (m[1] === '#' && !title) { title = text; open({ kind: 'title', headline: text }); } else open({ headline: text });
    } else if ((m = SCENE.exec(line)) && !BULLET.test(line)) {
      open({ kind: 'scene', prompt: m[1].trim() });
      card = null;
    } else if ((m = SHOW.exec(line))) {
      if (card) card.show = m[1].trim();
    } else if ((m = QUOTE.exec(line))) {
      const [, q, by] = /^(.*?)(?:\s+[—–-]{1,2}\s*([^—–-][^]*))?$/.exec(m[1].trim());
      const c = card && card.kind !== 'title' && !card.points.length && !card.quote ? card : open({});
      Object.assign(c, { kind: 'quote', quote: q.replace(/^["“]|["”]$/g, '').trim(), ...(by ? { by: by.trim() } : {}) });
    } else if ((m = BULLET.exec(line))) {
      if (!card || card.kind === 'scene') open({ headline: '' });
      if (card.kind === 'title') { if (!subtitle) subtitle = m[2].trim(); continue; }
      card.points.push({ text: m[2].trim(), ...(m[1] ? { n: +m[1] } : {}) });
    } else if (card?.kind === 'quote' && /^[—–-]{1,2}\s*\S/.test(line)) {
      card.by = line.replace(/^[—–-]{1,2}\s*/, '');
    } else if (card?.kind === 'title') {
      if (!subtitle) subtitle = line;
    } else if (card && card.kind !== 'scene') {
      card.note = card.note ? `${card.note} ${line}` : line;
    } else {
      open({ headline: '', note: line });
    }
  }
  for (const c of cards) classify(c);
  if (cards[0]?.kind === 'title' && subtitle) cards[0].subtitle = subtitle;
  return { title: title ?? cards.find((c) => c.headline)?.headline ?? 'Explainer', subtitle, cards: cards.filter((c) => c.kind !== 'scene' || c.prompt) };
}

function classify(c) {
  if (c.kind) return;
  const h = c.headline ?? '';
  const stat = STAT.exec(h);
  const plainCount = stat && /^\d+$/.test(stat[1].trim());
  if (RECAP.test(h) && c.points.length) c.kind = 'recap';
  else if (VERSUS.test(h) && c.points.length) {
    c.kind = 'compare';
    [c.left, c.right] = h.split(VERSUS).map((s) => s.trim());
    const split = c.points.every((p) => p.text.includes('|'));
    if (split) c.pairs = c.points.map((p) => p.text.split('|').map((s) => s.trim()));
    else {
      const half = Math.ceil(c.points.length / 2);
      c.pairs = c.points.slice(0, half).map((p, i) => [p.text, c.points[half + i]?.text ?? '']);
    }
  } else if (c.points.length >= 2 && (c.points.every((p) => p.n) || STEPS.test(h))) c.kind = 'steps';
  else if (stat && (!plainCount || c.points.length <= 1)) {
    c.kind = 'number';
    c.number = stat[1].trim();
    c.label = stat[2].trim();
  } else if (!c.points.length && c.note) c.kind = 'statement';
  else c.kind = 'bullets';
}

// Pictures for the words explainers use (the library's own matching, kept to exact words, after)
const PICTURE_WORDS = [
  [/\b(money|cash|income|salary|wages?|price|prices|cost|costs|pay|paid|budget|wealth|rich|profit|earn\w*|fees?)\b/, 'money_bag'],
  [/\b(sav(e|es|ed|ing|ings)|coins?|pennies|cents?)\b/, 'coin'],
  [/\b(interest|grows?|growth|growing|increase\w*|rises?|rising|gains?|returns?|compound\w*|invest\w*|stocks?|markets?)\b/, 'chart_increasing'],
  [/\b(loss|losses|lose|decreas\w*|drops?|falls?|declin\w*|debt|inflation)\b/, 'chart_decreasing'],
  [/\b(data|statistics?|numbers|results?|survey|percent\w*|average|chart|graph)\b/, 'bar_chart'],
  [/\b(time|years?|decades?|months?|long[- ]term|patience|wait\w*|early|later|deadline)\b/, 'hourglass_not_done'],
  [/\b(clock|hours?|minutes?|schedule|routine|morning|alarm)\b/, 'alarm_clock'],
  [/\b(calendar|dates?|days?|weeks?|plan\w*|appointments?)\b/, 'calendar'],
  [/\b(passwords?|lock\w*|secur\w*|privacy|private|encrypt\w*|login|log in|account)\b/, 'locked'],
  [/\b(keys?|access|unlock)\b/, 'key'],
  [/\b(protect\w*|safe|safety|defen[cs]e\w*|guard\w*|insurance)\b/, 'shield'],
  [/\b(ideas?|insights?|think\w*|creativ\w*|innovat\w*|tips?|tricks?)\b/, 'light_bulb'],
  [/\b(brain|learn\w*|memory|remember|focus|mind|knowledge|understand\w*)\b/, 'brain'],
  [/\b(check\w*|done|correct|verif\w*|confirm\w*|right)\b/, 'check_mark_button'],
  [/\b(why|questions?|what|unknown|ask\w*)\b/, 'red_question_mark'],
  [/\b(warnings?|risks?|risky|danger\w*|caution|careful|threats?|scams?|fraud|phishing|mistakes?|errors?)\b/, 'warning'],
  [/\b(e-?mails?|inbox|messages?|mail)\b/, 'e_mail'],
  [/\b(computers?|software|online|internet|websites?|digital|it)\b/, 'laptop'],
  [/\b(phones?|mobile|apps?|smartphone|text)\b/, 'mobile_phone'],
  [/\b(world|global\w*|countr(y|ies)|earth|international)\b/, 'globe_showing_europe_africa'],
  [/\b(win\w*|success\w*|goals?|achiev\w*|best|champion|award)\b/, 'trophy'],
  [/\b(launch\w*|start\w*|fast|speed|boost\w*|quick\w*)\b/, 'rocket'],
  [/\b(process\w*|systems?|settings?|work(s|ing)?|machine\w*|automat\w*|engine\w*)\b/, 'gear'],
  [/\b(home|house|rent|mortgage|housing)\b/, 'house'],
  [/\b(bank\w*|loans?|credit)\b/, 'bank'],
  [/\b(books?|read\w*|study\w*|research\w*|school|lessons?|course)\b/, 'books'],
  [/\b(teams?|together|partner\w*|deal|agree\w*|collaborat\w*|trust)\b/, 'handshake'],
  [/\b(health\w*|heart|love|care|wellbeing)\b/, 'red_heart'],
  [/\b(energy|power|electric\w*)\b/, 'high_voltage'],
  [/\b(sun|solar|summer|light)\b/, 'sun'],
  [/\b(plants?|nature|green|seeds?|small steps|habits?)\b/, 'seedling'],
  [/\b(search\w*|find\w*|look\w*|explor\w*|discover\w*)\b/, 'magnifying_glass_tilted_left'],
  [/\b(talk\w*|speak\w*|say\w*|communicat\w*|feedback|conversation)\b/, 'speech_balloon'],
  [/\b(sleep\w*|rest|tired|night|bed)\b/, 'bed'],
  [/\b(shop\w*|buy\w*|purchas\w*|spend\w*|customers?)\b/, 'shopping_cart'],
  [/\b(cards?|payments?)\b/, 'credit_card'],
  [/\b(science|experiments?|tests?|lab)\b/, 'test_tube'],
  [/\b(targets?|aims?|focus)\b/, 'bullseye'],
  [/\b(gifts?|bonus|rewards?|free)\b/, 'gift'],
  [/\b(tools?|fix\w*|repair\w*|build\w*)\b/, 'hammer_and_wrench'],
  [/\b(stop|never|don'?t|avoid|no)\b/, 'no_entry'],
  [/\b(news|reports?|articles?)\b/, 'newspaper'],
  [/\b(announce\w*|tell everyone|share)\b/, 'megaphone'],
  [/\b(jobs?|business\w*|work|career|office)\b/, 'briefcase'],
  [/\b(water|drink\w*|ocean|sea|rain)\b/, 'droplet'],
  [/\b(food|eat\w*|diet|fruit|healthy eating)\b/, 'red_apple'],
  [/\b(exercise|run\w*|sport\w*|fitness|walk\w*)\b/, 'running_shoe'],
  [/\b(ai|robots?|artificial)\b/, 'robot'],
  [/\b(gems?|valu\w*|precious|premium)\b/, 'gem_stone'],
  [/\b(party|celebrat\w*|congrat\w*)\b/, 'party_popper'],
];

/** Pictures for some words: first from what they name exactly, else the explainer words above */
export function picturesFor(text, max = 2) {
  const s = String(text ?? '').toLowerCase();
  const out = [];
  const add = (id) => { if (id && getConcept(id) && !out.includes(id)) out.push(id); };
  for (const [re, id] of PICTURE_WORDS) if (re.test(s)) add(id);
  for (const m of parseText(s).matches) if (!/^(alphabet)/.test(getConcept(m.id)?.category ?? '')) add(m.id);
  return out.slice(0, max);
}

// The look of the cards, by the clip's style: a light page, a dark one, a chalkboard, a blueprint
const THEMES = {
  light: { bg: '#f8fafc', bg2: '#eef2ff', ink: '#0f172a', soft: '#475569', panel: '#ffffff', line: '#e2e8f0' },
  paper: { bg: '#ffffff', bg2: '#fff8eb', ink: '#111827', soft: '#4b5563', panel: '#ffffff', line: '#e5e7eb' },
  dark: { bg: '#0b1020', bg2: '#151b33', ink: '#f8fafc', soft: '#cbd5e1', panel: '#1b2340', line: '#2c3557' },
  chalk: { bg: '#1f3a2e', bg2: '#24443a', ink: '#f1f5f0', soft: '#cfe3d6', panel: '#2a4a3e', line: '#3c6253' },
  blueprint: { bg: '#0d3b7a', bg2: '#0f4690', ink: '#f0f7ff', soft: '#bcd6f5', panel: '#11519f', line: '#3b74bd' },
};
const THEME_OF = { stickman: 'paper', whiteboard: 'paper', doodle: 'paper', cute2d: 'paper', editorial: 'paper', sketch: 'paper', outline: 'paper', papercut: 'paper', crayon: 'paper', watercolor: 'paper', neon: 'dark', silhouette: 'dark', chalkboard: 'chalk', blueprint: 'blueprint' };
const ACCENTS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899'];

// Lines of text that fit: the biggest size from `size` down to `min` at which it takes at most
// `maxLines` lines of `maxW` (a little room kept: the font drawn may be wider than the one measured)
function fit(text, { maxW, size, min = size * 0.6, maxLines = 2 }) {
  const wrapAt = (s) => {
    const out = [];
    let line = '';
    for (const w of String(text ?? '').split(/\s+/).filter(Boolean)) {
      const t = line ? `${line} ${w}` : w;
      if (line && textWidth(t, s) * 1.12 > maxW) { out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line);
    return out;
  };
  let s = size, lines = wrapAt(s);
  while (lines.length > maxLines && s > min) { s = Math.max(min, s - 1); lines = wrapAt(s); }
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), `${lines.slice(maxLines - 1).join(' ').slice(0, 60).replace(/\s+\S*$/, '')}…`];
  return { lines, size: s, h: lines.length * s * 1.22 };
}

const text = (lines, x, y, size, { fill, weight = 700, anchor = 'start', italic = false } = {}) => lines.map((l, i) => `<text x="${r2(x)}" y="${r2(y + size * 0.92 + i * size * 1.22)}" font-family="${FONT}" font-size="${r2(size)}" font-weight="${weight}"${italic ? ' font-style="italic"' : ''} fill="${fill}" text-anchor="${anchor}">${esc(l)}</text>`).join('');

/**
 * A card drawn: { svg, duration }. Its points appear one by one, each when the one before has had
 * time to be read; it stays until the last has been read too.
 * opts: { style, width, height, index, total, seed }
 */
export function renderSlide(card, opts = {}) {
  const { style = 'flat', width: W = 640, height: H = 360, index = 0, total = 1 } = opts;
  const th = THEMES[THEME_OF[style] ?? 'light'];
  const accent = ACCENTS[index % ACCENTS.length];
  const uid = newUid();
  const u = Math.min(W, H) / 360;
  const wide = W / H > 1.2;
  const css = [];
  const cues = [];
  let k = 0;

  // When each part appears: the headline first, then each point once the one before is read
  const plan = [];
  const at = (n, sound = 'pop') => { plan.push({ n, sound }); };
  const pts = card.kind === 'compare' ? card.pairs.flat().filter(Boolean) : card.points.map((p) => p.text);
  const first = card.kind === 'quote' ? card.quote : card.kind === 'number' ? card.number : card.headline;
  if (first) at(words(first), card.kind === 'title' ? 'chime' : card.kind === 'number' ? 'ding' : null);
  if (card.kind === 'number' && card.label) at(words(card.label), null);
  if (card.subtitle) at(words(card.subtitle), null);
  if (card.note) at(words(card.note), null);
  if (card.kind === 'quote' && card.by) at(words(card.by), null);
  for (const p of pts) at(words(p));
  const times = [];
  let t = 0.35;
  for (const [i, p] of plan.entries()) {
    times.push(t);
    t += clamp(0.7 + p.n / READ_WPS, i === 0 ? 0.9 : 1.1, 4);
  }
  const lastN = plan.at(-1)?.n ?? 0;
  const T = r2(clamp(times.at(-1) + clamp(1.4 + lastN / READ_WPS, 2, 5) + 0.6, 3.5, 20));
  plan.forEach((p, i) => { if (p.sound) cues.push({ t: r2(times[i] + 0.05), s: p.sound }); });

  const pc = (s) => `${r2(clamp(s / T, 0, 1) * 100)}%`;
  // An element that appears at its time (rising a little into place), then stays
  let shown = 0;
  // (at: its own time, else the next in the plan's order)
  const appear = (inner, { pop = false, at: when = null } = {}) => {
    const t0 = when ?? times[Math.min(shown++, times.length - 1)] ?? 0.35;
    const name = `${uid}r${k++}`;
    const from = pop ? 'scale(0.6)' : `translate(0px, ${r2(10 * u)}px)`;
    css.push(`@keyframes ${name} { 0% { opacity: 0; transform: ${from}; } ${pc(t0)} { opacity: 0; transform: ${from}; } ${pc(t0 + 0.45)} { opacity: 1; transform: none; } 100% { opacity: 1; transform: none; } }`);
    return `<g style="transform-box: fill-box; transform-origin: center; animation: ${name} ${T}s ease-out infinite;">${inner}</g>`;
  };
  // A picture from the library, in a box of side `s` at (x, y), bobbing gently
  const picture = (id, x, y, s, { anim } = {}) => {
    const c = getConcept(id);
    if (!c) return '';
    const person = /^people/.test(c.category ?? '');
    const shapes = drawConcept(c, { style, expression: 'happy', animation: anim ?? (person ? 'talk' : undefined) });
    const name = `${uid}b${k++}`;
    css.push(`@keyframes ${name} { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(${r2(-4 * u)}px); } }`);
    return `<g transform="translate(${r2(x)} ${r2(y)}) scale(${r2(s / 100 * 1000) / 1000})"><g style="animation: ${name} 3.2s ease-in-out infinite;">${shapesToSvg(shapes, style, { olk: clamp(100 / s * 1.4, 0.4, 2) })}</g></g>`;
  };
  // A soft round backdrop with pictures on it
  const pictureSpot = (ids, cx, cy, r, when = (times[0] ?? 0.35) + 0.3) => {
    if (!ids.length) return '';
    let g = `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="${accent}" opacity="0.13"/><circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r * 0.78)}" fill="${accent}" opacity="0.1"/>`;
    if (ids.length === 1) g += picture(ids[0], cx - r * 0.7, cy - r * 0.7, r * 1.4);
    else ids.slice(0, 2).forEach((id, i) => { g += picture(id, cx - r * 0.95 + i * r * 0.9, cy - r * 0.55 + (i ? r * 0.1 : -r * 0.1), r); });
    // (money on a card jingles as it appears)
    if (ids.some((id) => ['money_bag', 'coin', 'dollar_banknote'].includes(id))) cues.push({ t: r2(when + 0.1), s: 'coins' });
    return appear(g, { pop: true, at: when });
  };
  const pics = (s, n = 2) => picturesFor(s, n);

  const M = 34 * u; // margin
  let body = '';
  // (a column of words to centre top to bottom: where it ends; art: a picture beside it, not moved)
  let colEnd = null, art = '';
  const headline = (h, { x = M, y = M + 16 * u, maxW = W - 2 * M, size = 30 * u, anchor = 'start' } = {}) => {
    const f = fit(h, { maxW, size, maxLines: 2 });
    const barX = anchor === 'middle' ? x - 28 * u : x;
    body += appear(text(f.lines, x, y, f.size, { fill: th.ink, weight: 900, anchor }) + `<rect x="${r2(barX)}" y="${r2(y + f.h + 8 * u)}" width="${r2(56 * u)}" height="${r2(5 * u)}" rx="${r2(2.5 * u)}" fill="${accent}"/>`);
    return y + f.h + 26 * u;
  };

  const mark = body.length;
  if (card.kind === 'title') {
    // (a picture over the title, the title with its accent bar, then the subtitle)
    const ids = pics(card.show ?? `${card.headline} ${card.subtitle ?? ''}`, 1);
    const f = fit(card.headline, { maxW: W * 0.84, size: 40 * u, maxLines: 2 });
    const sub = card.subtitle ? fit(card.subtitle, { maxW: W * 0.76, size: 18 * u, maxLines: 2 }) : null;
    const blockH = (ids.length ? 84 * u : 0) + f.h + 22 * u + (sub ? sub.h + 8 * u : 0);
    const top = (H - blockH) / 2;
    if (ids.length) body += pictureSpot(ids, W / 2, top + 34 * u, 34 * u, times[0]);
    const y = top + (ids.length ? 84 * u : 0);
    body += appear(text(f.lines, W / 2, y, f.size, { fill: th.ink, weight: 900, anchor: 'middle' }) + `<rect x="${r2(W / 2 - 34 * u)}" y="${r2(y + f.h + 10 * u)}" width="${r2(68 * u)}" height="${r2(6 * u)}" rx="${r2(3 * u)}" fill="${accent}"/>`);
    if (sub) body += appear(text(sub.lines, W / 2, y + f.h + 30 * u, sub.size, { fill: th.soft, weight: 700, anchor: 'middle' }));
  } else if (card.kind === 'quote') {
    const qf = fit(card.quote, { maxW: W - 2 * M - 60 * u, size: 26 * u, maxLines: 4 });
    const y = (H - qf.h - (card.by ? 40 * u : 0)) / 2;
    body += appear(`<text x="${r2(M)}" y="${r2(y + 40 * u)}" font-family="Georgia,serif" font-size="${r2(120 * u)}" font-weight="700" fill="${accent}" opacity="0.3">“</text>`
      + text(qf.lines, W / 2, y, qf.size, { fill: th.ink, weight: 800, anchor: 'middle', italic: true }));
    if (card.by) body += appear(text([`— ${card.by}`], W / 2, y + qf.h + 16 * u, 17 * u, { fill: accent, weight: 800, anchor: 'middle' }));
  } else if (card.kind === 'statement') {
    const ids = pics(card.show ?? `${card.headline} ${card.note}`, 1);
    let y = card.headline ? headline(card.headline, { x: W / 2, anchor: 'middle', y: M + 10 * u }) : H * 0.3;
    const f = fit(card.note, { maxW: W * 0.8, size: 26 * u, maxLines: 3 });
    body += appear(text(f.lines, W / 2, Math.max(y, H * 0.3), f.size, { fill: th.ink, weight: 800, anchor: 'middle' }));
    if (ids.length) body += pictureSpot(ids, W / 2, Math.min(H - 60 * u, Math.max(y, H * 0.3) + f.h + 56 * u), 36 * u);
  } else if (card.kind === 'number') {
    const ids = pics(card.show ?? `${card.label} ${card.points.map((p) => p.text).join(' ')}`, 1);
    const colW = wide && ids.length ? W * 0.58 : W - 2 * M;
    const f = fit(card.number, { maxW: colW, size: 96 * u, maxLines: 1, min: 40 * u });
    const y0 = H * 0.18;
    body += appear(text(f.lines, M, y0, f.size, { fill: accent, weight: 900 }), { pop: true });
    let y = y0 + f.h + 6 * u;
    if (card.label) {
      const l = fit(card.label, { maxW: colW, size: 26 * u, maxLines: 2 });
      body += appear(text(l.lines, M, y, l.size, { fill: th.ink, weight: 900 }));
      y += l.h + 14 * u;
    }
    for (const p of card.points) {
      const l = fit(p.text, { maxW: colW, size: 17 * u, maxLines: 2 });
      body += appear(text(l.lines, M, y, l.size, { fill: th.soft, weight: 700 }));
      y += l.h + 8 * u;
    }
    colEnd = y;
    if (ids.length) art += wide ? pictureSpot(ids, W * 0.8, H * 0.5, 62 * u) : pictureSpot(ids, W - M - 40 * u, H - M - 40 * u, 36 * u);
  } else if (card.kind === 'compare') {
    let y = headline(card.headline, { x: W / 2, anchor: 'middle', y: M + 4 * u });
    const gap = 30 * u, colW = (W - 2 * M - gap) / 2;
    const sides = [[card.left, 0], [card.right, 1]];
    // (each panel as tall as its points need, the two the same)
    const need = [0, 1].map((s) => card.pairs.reduce((h, pair) => h + (pair[s] ? fit(pair[s], { maxW: colW - 40 * u, size: 16 * u, maxLines: 2 }).h + 10 * u : 0), 0));
    const ph = Math.min(H - y - M + 6 * u, 62 * u + Math.max(...need));
    y += Math.max(0, (H - y - M - ph) / 2 - 4 * u);
    for (const [name, s] of sides) {
      const x = M + s * (colW + gap), color = s ? ACCENTS[(index + 3) % ACCENTS.length] : accent;
      const ids = colW > 150 * u ? pics(name, 1) : [];
      let g = `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(colW)}" height="${r2(ph)}" rx="${r2(14 * u)}" fill="${th.panel}" stroke="${th.line}" stroke-width="${r2(1.5 * u)}"/>`
        + `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(colW)}" height="${r2(6 * u)}" rx="${r2(3 * u)}" fill="${color}"/>`;
      const hf = fit(name, { maxW: colW - 24 * u - (ids.length ? 40 * u : 0), size: 20 * u, maxLines: 1 });
      g += text(hf.lines, x + 14 * u, y + 16 * u, hf.size, { fill: color, weight: 900 });
      if (ids.length) g += picture(ids[0], x + colW - 48 * u, y + 8 * u, 38 * u);
      body += appear(g, { at: (times[0] ?? 0.35) + 0.25 + s * 0.2 });
    }
    // (the points, left and right in turn)
    let ys = [y + 52 * u, y + 52 * u];
    for (const pair of card.pairs) {
      pair.forEach((p, s) => {
        if (!p) { shown++; return; }
        const x = M + s * (colW + gap) + 14 * u;
        const l = fit(p, { maxW: colW - 40 * u, size: 16 * u, maxLines: 2 });
        body += appear(`<circle cx="${r2(x + 5 * u)}" cy="${r2(ys[s] + l.size * 0.62)}" r="${r2(4 * u)}" fill="${s ? ACCENTS[(index + 3) % ACCENTS.length] : accent}"/>` + text(l.lines, x + 16 * u, ys[s], l.size, { fill: th.ink, weight: 700 }));
        ys[s] += l.h + 10 * u;
      });
    }
    body += `<g><circle cx="${r2(W / 2)}" cy="${r2(y + ph / 2)}" r="${r2(17 * u)}" fill="${th.ink}"/><text x="${r2(W / 2)}" y="${r2(y + ph / 2 + 5.5 * u)}" font-family="${FONT}" font-size="${r2(15 * u)}" font-weight="900" fill="${th.bg}" text-anchor="middle">VS</text></g>`;
  } else if (card.kind === 'steps') {
    let y = headline(card.headline, { y: M + 4 * u });
    const n = card.points.length;
    const across = wide && n <= 5 && card.points.every((p) => words(p.text) <= 9);
    if (across) {
      const cell = (W - 2 * M) / n, cy = y + 24 * u;
      body += `<line x1="${r2(M + cell / 2)}" y1="${r2(cy)}" x2="${r2(W - M - cell / 2)}" y2="${r2(cy)}" stroke="${th.line}" stroke-width="${r2(4 * u)}" stroke-linecap="round"/>`;
      // (a picture under each step, if each has one of its own)
      const stepPics = card.points.map((p) => pics(p.text, 1)[0]);
      const allPics = stepPics.every(Boolean) && new Set(stepPics).size === stepPics.length;
      card.points.forEach((p, i) => {
        const cx = M + cell * (i + 0.5);
        const l = fit(p.text, { maxW: cell - 12 * u, size: 16 * u, maxLines: 3 });
        const ids = allPics ? [stepPics[i]] : [];
        body += appear(`<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(18 * u)}" fill="${ACCENTS[(index + i) % ACCENTS.length]}"/>`
          + `<text x="${r2(cx)}" y="${r2(cy + 6.5 * u)}" font-family="${FONT}" font-size="${r2(18 * u)}" font-weight="900" fill="#ffffff" text-anchor="middle">${i + 1}</text>`
          + text(l.lines, cx, cy + 30 * u, l.size, { fill: th.ink, weight: 700, anchor: 'middle' })
          + (ids.length ? picture(ids[0], cx - 22 * u, cy + 30 * u + l.h + 8 * u, 44 * u) : ''));
      });
      colEnd = cy + 30 * u + Math.max(...card.points.map((p) => fit(p.text, { maxW: cell - 12 * u, size: 16 * u, maxLines: 3 }).h)) + (allPics ? 56 * u : 0);
    } else {
      const ids = pics(card.show ?? card.headline, 1);
      const colW = wide && ids.length ? W * 0.6 : W - 2 * M - 40 * u;
      card.points.forEach((p, i) => {
        const l = fit(p.text, { maxW: colW, size: 18 * u, maxLines: 2 });
        body += appear(`<circle cx="${r2(M + 14 * u)}" cy="${r2(y + 11 * u)}" r="${r2(14 * u)}" fill="${ACCENTS[(index + i) % ACCENTS.length]}"/>`
          + `<text x="${r2(M + 14 * u)}" y="${r2(y + 16.5 * u)}" font-family="${FONT}" font-size="${r2(15 * u)}" font-weight="900" fill="#ffffff" text-anchor="middle">${i + 1}</text>`
          + text(l.lines, M + 38 * u, y, l.size, { fill: th.ink, weight: 700 }));
        y += Math.max(l.h, 24 * u) + 12 * u;
      });
      colEnd = y;
      if (ids.length && wide) art += pictureSpot(ids, W * 0.84, H * 0.5, 50 * u);
    }
  } else {
    // Points (a recap ticks them off)
    const recap = card.kind === 'recap';
    const ids = recap ? (card.show ? pics(card.show, 2) : ['trophy']) : pics(card.show ?? `${card.headline} ${card.points.map((p) => p.text).join(' ')}`, card.show ? 2 : 1);
    const colW = wide && ids.length ? W * 0.56 : W - 2 * M - 10 * u;
    let y = card.headline ? headline(card.headline, { maxW: colW + (ids.length ? 0 : 0) }) : M + 10 * u;
    if (card.note) {
      const l = fit(card.note, { maxW: colW, size: 18 * u, maxLines: 2 });
      body += appear(text(l.lines, M, y, l.size, { fill: th.soft, weight: 700 }));
      y += l.h + 12 * u;
    }
    const size = card.points.length > 4 ? 16 * u : 19 * u;
    for (const [i, p] of card.points.entries()) {
      const l = fit(p.text, { maxW: colW - 30 * u, size, maxLines: 2 });
      const mark = recap
        ? `<circle cx="${r2(M + 10 * u)}" cy="${r2(y + l.size * 0.6)}" r="${r2(10 * u)}" fill="#10b981"/><path d="M${r2(M + 5 * u)} ${r2(y + l.size * 0.6)} l${r2(3.5 * u)} ${r2(3.5 * u)} l${r2(6.5 * u)} ${r2(-7 * u)}" stroke="#ffffff" stroke-width="${r2(2.6 * u)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<circle cx="${r2(M + 8 * u)}" cy="${r2(y + l.size * 0.6)}" r="${r2(5.5 * u)}" fill="${ACCENTS[(index + i) % ACCENTS.length]}"/>`;
      body += appear(mark + text(l.lines, M + 28 * u, y, l.size, { fill: th.ink, weight: 700 }));
      y += l.h + 12 * u;
    }
    if (ids.length && !wide) body += pictureSpot(ids, W / 2, y + 60 * u, 50 * u);
    colEnd = ids.length && !wide ? y + 120 * u : y;
    if (ids.length && wide) art += pictureSpot(ids, W * 0.8, H * 0.5, 66 * u);
  }
  if (colEnd != null) {
    const dy = clamp((H - 8 * u - colEnd) / 2 - 6 * u, 0, wide ? 56 * u : H * 0.22);
    body = `${body.slice(0, mark)}<g transform="translate(0 ${r2(dy)})">${body.slice(mark)}</g>`;
  }
  body += art;

  // The page: its colour, two soft shapes drifting, where we are in the clip
  const drift = `${uid}d`;
  css.push(`@keyframes ${drift} { 0%, 100% { transform: translate(0px, 0px); } 50% { transform: translate(${r2(14 * u)}px, ${r2(-10 * u)}px); } }`);
  const page = `<rect width="${W}" height="${H}" fill="${th.bg}"/>`
    + `<g style="animation: ${drift} ${r2(T * 1.5)}s ease-in-out infinite;"><circle cx="${r2(W * 0.92)}" cy="${r2(H * 0.08)}" r="${r2(H * 0.36)}" fill="${th.bg2}"/><circle cx="${r2(W * 0.04)}" cy="${r2(H * 1.02)}" r="${r2(H * 0.3)}" fill="${accent}" opacity="0.07"/></g>`;
  const progress = total > 1 ? `<rect x="0" y="${r2(H - 5 * u)}" width="${W}" height="${r2(5 * u)}" fill="${th.line}"/><rect x="0" y="${r2(H - 5 * u)}" width="${r2(W * (index + 1) / total)}" height="${r2(5 * u)}" fill="${accent}"/>` : '';
  // A slow camera on the card (in on one, out on the next)
  const kb = `${uid}kb`;
  const [z0, z1] = index % 2 ? [1.045, 1] : [1, 1.045];
  css.push(`@keyframes ${kb} { 0% { transform: scale(${z0}) translate(0px, 0px); } 100% { transform: scale(${z1}) translate(${r2((index % 2 ? 6 : -6) * u)}px, ${r2(-3 * u)}px); } }`);
  const content = `${page}<g class="pg-slide pg-slide-${card.kind}" data-kind="${card.kind}" style="transform-origin: ${W / 2}px ${H / 2}px; animation: ${kb} ${T}s linear infinite;">${body}</g>${progress}`
    + `<metadata class="pg-sound">${esc(JSON.stringify(soundTrack(cues, T, { clean: true })))}</metadata>`;
  return { svg: svgDoc({ width: W, height: H, viewBox: `0 0 ${W} ${H}`, defs: `<style><![CDATA[${css.join('\n')}]]></style>`, content }), duration: T };
}
