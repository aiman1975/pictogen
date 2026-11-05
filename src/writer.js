// The writer: notes or an article, in the writer's own words, turned into an explainer's outline
// (src/slides.js reads it): a title, a card for each part with a short headline and two or three
// points, steps where the text goes step by step, a big number where a part rests on one, a quote
// where someone is quoted, and a recap at the end. Rules, not a language model: it picks and
// shortens the writer's own sentences (it never makes up facts), and the outline is there to check
// and change before the clip is made. English.
import { writeOutline } from './slides.js';

const STOP = new Set(`a an the and or but if then than so of to in on at by for with from into onto over under about as is are was were be been being
have has had do does did not no yes it its it's this that these those there here their they them we us our you your he she him her his i me my
can could will would should may might must shall also just very more most much many some any each every other such only own same too
what which who whom whose when where why how all both few one two its what's let's get gets got make makes made like way ways thing things
use used using new well even still yet however because while although though since during after before through per via etc`.split(/\s+/));
const OPENERS = /^(however|moreover|furthermore|additionally|in addition|also|so|and|but|then|therefore|thus|of course|in fact|for example|for instance|in other words|on the other hand|as a result|in short|in summary|to sum up|finally|first|firstly|second|secondly|third|thirdly|next|lastly|overall|basically|essentially|importantly|indeed|today|now|in general|generally|actually|that said|plus)\s*,?\s+/i;
// (words a cut line may not end on)
const TRAIL = new Set('a an the and or but of to in on at by for with from into as is are was were be been that which who than so if its their your our his her this these those such like including e.g. i.e.'.split(' '));
const STAT = /(?:[$€£¥]\s?)?\d[\d,.]*(?:\s?[-–]\s?\d[\d,.]*)?\s?(?:%|percent\b|per cent\b|million\b|billion\b|trillion\b|thousand\b|times\b|x\b|k\b|years?\b|months?\b|days?\b|hours?\b|minutes?\b)/i;
const STEP_WORDS = /^(?:to [^,]{1,30},\s*)?(first|firstly|second|secondly|third|then|next|after that|afterwards|finally|lastly|step \d+|to start|start by|begin by)\b/i;
const STEP_HEAD = /\b(how to|steps?|process|getting started|get started|what to do|checklist|guide|routine|plan)\b/i;
const SUMMARY_HEAD = /^(summary|conclusion|in conclusion|takeaways?|key takeaways|tl;?dr|to sum up|in short|bottom line|recap|wrap[- ]up)\b/i;
const ABBR = /\b(Mr|Mrs|Ms|Dr|Prof|St|vs|etc|e\.g|i\.e|approx|incl|No|Inc|Ltd|Co|U\.S|U\.K|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\./g;

const words = (s) => String(s).toLowerCase().match(/[a-z0-9][a-z0-9'%$€£.-]*/g) ?? [];
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const trimEnd = (s) => s.replace(/[\s,;:–—-]+$/, '').replace(/[.!?]+$/, '').trim();

/** The sentences of some text (abbreviations and decimals kept whole) */
export function sentences(text) {
  const kept = String(text).replace(ABBR, (m) => m.replace(/\./g, '§')).replace(/(\d)\.(\d)/g, '$1§$2');
  return kept.split(/(?<=[.!?])["”']?\s+(?=["“(]?[A-Z0-9])/).map((s) => s.replace(/§/g, '.').replace(/\s+/g, ' ').trim()).filter((s) => words(s).length >= 3);
}

/**
 * A sentence made short enough for a card: filler at the start gone, brackets and dashed asides
 * out, then cut back to the last clause that fits in `max` words (never mid-phrase if it can help it)
 */
export function shorten(sentence, max = 14) {
  let s = String(sentence).trim();
  s = s.replace(/^to [^,]{1,30},\s*(?=(first|then|next|finally)\b)/i, '');
  for (let k = 0; k < 3 && OPENERS.test(s); k++) s = s.replace(OPENERS, '');
  s = s.replace(/\s*\([^)]*\)/g, '').replace(/\s+[—–]\s+[^—–]*[—–]\s+/g, ' ').replace(/\s+/g, ' ');
  s = trimEnd(s);
  const w = s.split(' ');
  if (w.length <= max) return cap(s);
  // (the longest piece up to a clause break that fits)
  const breaks = [];
  w.forEach((x, i) => {
    if (i < 4 || i > max) return;
    if (/[,;:]$/.test(w[i - 1]) || /^(which|that|because|while|although|though|so|but|and|where|when|who|since|unless|whereas|as|if)$/i.test(x)) breaks.push(i);
  });
  let cut = breaks.length ? breaks.at(-1) : max;
  while (cut > 4 && TRAIL.has(w[cut - 1].toLowerCase().replace(/[^a-z']/g, ''))) cut--;
  return cap(trimEnd(w.slice(0, cut).join(' ')));
}

/** A short headline from a sentence: its main clause, at most `max` words */
function headlineOf(sentence, max = 7) {
  return shorten(sentence, max).replace(/^(the|a|an)\s+(?=\w+\s+\w)/i, (m) => m).replace(/[.!?]$/, '');
}

// Lines that look like headings: "# Title", "Title:", short lines with no full stop, ALL CAPS
const isHeading = (l, next) => /^#{1,6}\s+\S/.test(l)
  || (/^[^.!?]{2,70}:$/.test(l) && !/^[-*•]/.test(l))
  || (/^[A-Z0-9][A-Z0-9 &'/,-]{3,60}$/.test(l) && /[A-Z]{3}/.test(l))
  || (next !== undefined && next !== '' && !/[.!?:,;]$/.test(l) && l.split(/\s+/).length <= 8 && !/^([-*•]|\d+[.)])\s/.test(l) && /^[A-Z0-9"“]/.test(l) && (/^([-*•]|\d+[.)])\s/.test(next) || next.split(/\s+/).length > 8));
const cleanHeading = (l) => cap(l.replace(/^#{1,6}\s+/, '').replace(/^(step\s+\d+|part\s+\d+|\d+)[.):]?\s+/i, '').replace(/:$/, '').trim());
const BULLET = /^(?:[-*•–]|(\d+)[.)])\s+(.+)$/;

/** The notes as parts: [{ heading, bullets: [{ text, n }], sentences: [...] }] */
function partsOf(text) {
  const lines = String(text).replace(/\r/g, '').split('\n').map((l) => l.trim());
  const parts = [];
  let part = null, para = [];
  // (a paragraph under no heading is a part of its own; under a heading, it belongs to it)
  const flush = () => {
    if (para.length) { (part ??= newPart(null)).sentences.push(...sentences(para.join(' '))); para = []; }
    if (part && !part.heading) part = null;
  };
  const newPart = (heading) => { const p = { heading, bullets: [], sentences: [] }; parts.push(p); return p; };
  lines.forEach((l, i) => {
    if (!l) { flush(); return; }
    const next = lines.slice(i + 1).find((x) => x) ?? '';
    const b = BULLET.exec(l);
    if (b) { flush(); (part ??= newPart(null)).bullets.push({ text: b[2].trim(), ...(b[1] ? { n: +b[1] } : {}) }); return; }
    if (isHeading(l, next)) { flush(); part = newPart(cleanHeading(l)); return; }
    para.push(l);
  });
  flush();
  return parts.filter((p) => p.heading || p.bullets.length || p.sentences.length);
}

/**
 * The outline for some notes: { text (the outline), title, cards }.
 * opts: { title } to give the title; { maxCards } (default 8, the title and the recap included).
 */
export function outlineFromNotes(notes, opts = {}) {
  const maxCards = Math.max(3, Math.min(14, opts.maxCards ?? 8));
  // The title: given, else the first line when it is short with no full stop (a heading), taken off
  let title = opts.title ? String(opts.title).trim() : null;
  const lines = String(notes ?? '').replace(/\r/g, '').split('\n');
  const top = lines.findIndex((l) => l.trim());
  if (!title && top >= 0) {
    const l = lines[top].trim();
    if (/^#{1,2}\s+\S/.test(l) || (!/[.!?:;,]$/.test(l) && l.split(/\s+/).length <= 10 && !BULLET.test(l))) { title = cleanHeading(l); lines.splice(top, 1); }
  }
  let parts = partsOf(lines.join('\n'));
  // A plain article (paragraphs, no headings): a part per paragraph, a long one in groups of three
  if (!parts.some((p) => p.heading || p.bullets.length)) {
    parts = parts.flatMap((p) => {
      if (p.sentences.length <= 5) return [p];
      const out = [];
      for (let i = 0; i < p.sentences.length; i += 4) out.push({ heading: null, bullets: [], sentences: p.sentences.slice(i, i + 4) });
      return out;
    });
  }
  // How much each word matters: how often it comes up, in the whole text
  const freq = new Map();
  const all = parts.flatMap((p) => [...p.sentences, ...p.bullets.map((b) => b.text), p.heading ?? '']);
  for (const s of all) for (const w of new Set(words(s))) if (!STOP.has(w) && w.length > 2) freq.set(w, (freq.get(w) ?? 0) + 1);
  const score = (s, i = 0) => {
    const ws = words(s).filter((w) => !STOP.has(w) && w.length > 2);
    const base = ws.reduce((a, w) => a + Math.log(1 + (freq.get(w) ?? 0)), 0) / Math.sqrt(Math.max(4, ws.length));
    return base + (STAT.test(s) ? 0.6 : 0) + (i === 0 ? 0.5 : 0) - (/\?$/.test(s) ? 0.8 : 0) - (words(s).length > 40 ? 0.5 : 0);
  };
  if (!title) {
    // (from the first sentence: what it is about - "Phishing emails are..." -> "Phishing emails")
    const first = parts[0]?.sentences[0] ?? parts[0]?.bullets[0]?.text ?? 'An explainer';
    const subject = /^(.{3,48}?)\s+(?:is|are|was|were|means|refers to|can be)\s/i.exec(first.replace(OPENERS, ''));
    title = subject && words(subject[1]).length <= 6 ? cap(subject[1].trim()) : headlineOf(first, 6);
  }

  const cards = [{ kind: 'title', headline: cap(title) }];
  const summary = [];
  let quoted = false;
  const content = parts.filter((p) => !(p.heading && SUMMARY_HEAD.test(p.heading)));
  const room = maxCards - 2;
  // (too many parts: the ones that matter most, in their order)
  const keep = new Set(content.map((p, i) => [i, Math.max(0, ...p.sentences.map(score), ...p.bullets.map((b) => score(b.text)))])
    .sort((a, b) => b[1] - a[1]).slice(0, room).map(([i]) => i));
  content.forEach((p, i) => {
    if (!keep.has(i)) return;
    const ranked = p.sentences.map((s, k) => ({ s, v: score(s, k), k })).sort((a, b) => b.v - a.v);
    // A quote: someone's words in quotation marks, with who said them
    const q = !quoted && p.sentences.map((s) => /["“]([^"”]{12,160})["”][,.]?\s*(?:said|says|wrote|writes|according to|—|–|-)\s*([A-Z][\w.'-]*(?:\s+[A-Z][\w.'-]*){0,3})/.exec(s)).find(Boolean);
    if (q) {
      quoted = true;
      cards.push({ kind: 'quote', quote: trimEnd(q[1]) + '.', by: q[2].trim(), points: [] });
      return;
    }
    // Steps: a numbered list, a part about how to do something, or sentences going first, then, next...
    const stepSentences = p.sentences.filter((s) => STEP_WORDS.test(s));
    const numbered = p.bullets.length >= 2 && p.bullets.every((b) => b.n);
    if (numbered || (p.bullets.length >= 2 && p.heading && STEP_HEAD.test(p.heading)) || stepSentences.length >= 3) {
      const steps = (p.bullets.length >= 2 ? p.bullets.map((b) => b.text) : stepSentences).slice(0, 5).map((s) => shorten(s, 10));
      // (its headline: its own, else a "how to..." title, else its first sentence if that is no step)
      const head = p.heading ?? (/^how to\b/i.test(title ?? '') ? 'Step by step' : p.sentences[0] && !STEP_WORDS.test(p.sentences[0]) ? headlineOf(p.sentences[0]) : 'Step by step');
      cards.push({ kind: 'steps', headline: head, points: steps.map((text) => ({ text })) });
      summary.push(steps[0]);
      return;
    }
    // A comparison: "A vs B" with its points ("left | right", or halved)
    if (p.heading && /\s(vs\.?|versus)\s/i.test(p.heading) && p.bullets.length >= 2) {
      const [left, right] = p.heading.split(/\s+(?:vs\.?|versus)\s+/i);
      const pairs = p.bullets.every((b) => b.text.includes('|')) ? p.bullets.map((b) => b.text.split('|').map((x) => shorten(x, 8)))
        : p.bullets.slice(0, Math.ceil(p.bullets.length / 2)).map((b, k) => [shorten(b.text, 8), shorten(p.bullets[Math.ceil(p.bullets.length / 2) + k]?.text ?? '', 8)]);
      cards.push({ kind: 'compare', left: cap(left.trim()), right: cap(right.trim()), pairs: pairs.slice(0, 4), points: [] });
      return;
    }
    const pointsFrom = p.bullets.length ? p.bullets.map((b) => b.text) : ranked.map((r) => r.s);
    // A big number: a part that rests on one ("40% of adults...")
    const statLine = (p.bullets.length ? pointsFrom : ranked.slice(0, 2).map((r) => r.s)).find((s) => STAT.test(s));
    if (statLine && !(p.heading && STEP_HEAD.test(p.heading)) && (!p.heading || pointsFrom.length <= 2)) {
      const m = STAT.exec(statLine);
      const num = m[0].replace(/\s?(percent|per cent)\b/i, '%').trim();
      const after = statLine.slice(m.index + m[0].length).trim();
      const label = after && words(after).length >= 2 && /^(of|in|a|per|more|less|fewer|of the|are|is|have|has|will|can|each|every|for)\b/i.test(after) ? shorten(after, 8) : null;
      const headline = label ? `${num} ${label.charAt(0).toLowerCase()}${label.slice(1)}` : `${num} ${headlineOf(statLine.replace(m[0], '').trim(), 6).replace(/^./, (c) => c.toLowerCase())}`;
      // (the number's sentence too, when it says more than the number does: "Adults need 7-9 hours...")
      // (only when the words before the number say something: "Adults need", not "In 2023, about")
      const before = words(statLine.slice(0, m.index)).filter((w) => !STOP.has(w) && !/^\d/.test(w) && !/^(about|around|nearly|almost|over|roughly|approximately|some|just|up|only)$/.test(w));
      const points = [...(before.length ? [shorten(statLine)] : []), ...pointsFrom.filter((x) => x !== statLine).slice(0, 1).map((x) => shorten(x))];
      cards.push({ kind: 'number', headline: trimEnd(headline), points: points.map((text) => ({ text })) });
      summary.push(trimEnd(headline));
      return;
    }
    // Points: its own list, else its best two or three sentences, in the order they were written
    // (a paragraph's first sentence is what it is about: its headline, when short enough to be one)
    const topic = !p.heading && !p.bullets.length && p.sentences.length >= 2 && words(p.sentences[0]).length <= 12 ? p.sentences[0] : null;
    const rest = topic ? ranked.filter((r) => r.k !== 0) : ranked;
    const chosen = p.bullets.length ? pointsFrom.slice(0, 4) : rest.slice(0, rest.length > 3 ? 3 : 2).sort((a, b) => a.k - b.k).map((r) => r.s);
    const points = [...new Set(chosen.map((x) => shorten(x)))].filter(Boolean);
    if (!points.length) return;
    const headline = p.heading ?? (topic ? trimEnd(topic) : headlineOf(ranked[0]?.s ?? points[0], 6));
    const shown = points.filter((pt) => pt.toLowerCase() !== headline.toLowerCase());
    if (!shown.length) return;
    cards.push({ kind: 'bullets', headline, points: shown.map((text) => ({ text })) });
    summary.push(headline);
  });
  // The recap: the notes' own summary if they have one, else the first point of each card
  const own = parts.find((p) => p.heading && SUMMARY_HEAD.test(p.heading));
  // (else each card's main idea: its headline, or its first step)
  const recap = own ? [...own.bullets.map((b) => b.text), ...own.sentences].map((s) => shorten(s, 10)) : summary.map((s) => shorten(s, 10));
  const unique = [...new Set(recap.filter(Boolean))].slice(0, 4);
  if (unique.length >= 2 && cards.length >= 3) cards.push({ kind: 'recap', headline: 'Recap', points: unique.map((text) => ({ text })) });
  for (const c of cards) c.points = (c.points ?? []).filter((p) => p.text);
  return { title: cards[0].headline, cards, text: writeOutline(cards) };
}
