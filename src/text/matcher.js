// Text -> concepts. Fully offline: tokenization, plural handling, aliases, multi-word phrases,
// color/size/count modifiers and (optional) typo tolerance.

import { listConcepts, getConcept, registryVersion } from '../concepts/index.js';
import { COLOR_WORDS } from '../core/color.js';

export const STOPWORDS = new Set(
  `a an the and or but nor of in on at to with without from by for is are was were be been being am
  i you he she it we they me him her us them my your his its our their mine yours this that these those there here
  as into onto over under above below near beside behind between across up down out off very so too then than just also not no yes
  do does did done has have had having will would can could should may might must shall while when where who whom which what why how
  comes coming toward towards seen viewed shown
  all any each every such only own same other s t let lets get gets got go goes going went come came see saw look looks looking
  like likes liked once upon time day one's its very really
  stand standing stands stood play playing plays played
  eat eating eats ate`.split(/\s+/),
);

export const EXPRESSION_WORDS = {
  happy: 'happy', smiling: 'happy', smile: 'happy', glad: 'happy', cheerful: 'happy',
  laugh: 'laugh', laughing: 'laugh', laughter: 'laugh', giggle: 'laugh', joyful: 'laugh', funny: 'laugh',
  sad: 'sad', crying: 'sad', cry: 'sad', unhappy: 'sad', tearful: 'sad', sorrow: 'sad', weeping: 'sad',
  surprised: 'surprised', shocked: 'surprised', amazed: 'surprised', astonished: 'surprised', wow: 'surprised',
  wink: 'wink', winking: 'wink', playful: 'wink', smirk: 'wink',
  angry: 'angry', mad: 'angry', furious: 'angry', grumpy: 'angry', annoyed: 'angry',
  talk: 'talking', talking: 'talking', speaking: 'talking', speak: 'talking', chat: 'talking', chatting: 'talking',
  confused: 'confused', puzzled: 'confused',
  suspicious: 'skeptical', skeptical: 'skeptical', doubtful: 'skeptical',
  neutral: 'neutral', calm: 'neutral',
};

export const MOTION_WORDS = {
  // Walking / Running / Across
  walk: 'walk', walking: 'walk', walks: 'walk', walked: 'walk', stroll: 'walk', strolling: 'walk',
  run: 'run', running: 'run', runs: 'run', ran: 'run', jog: 'run', jogging: 'run',
  // Gestures & Poses
  wave: 'wave', waving: 'wave', waves: 'wave', waved: 'wave',
  point: 'point', pointing: 'point', points: 'point', pointed: 'point',
  thumbsup: 'thumbsup', 'thumbs-up': 'thumbsup',
  hold: 'hold', holding: 'hold', holds: 'hold', held: 'hold',
  // Acrobatics & Movement
  jump: 'jump', jumping: 'jump', jumps: 'jump', jumped: 'jump', leap: 'jump', leaping: 'jump', leaps: 'jump', hop: 'jump', hopping: 'jump', hops: 'jump', bounce: 'jump', bouncing: 'jump',
  dance: 'dance', dancing: 'dance', dances: 'dance', danced: 'dance', groove: 'dance', grooving: 'dance',
  cheer: 'cheer', cheering: 'cheer', cheers: 'cheer', cheered: 'cheer', celebrate: 'cheer', celebrating: 'cheer', celebrates: 'cheer', hurray: 'cheer', hooray: 'cheer',
  fly: 'fly', flying: 'fly', flies: 'fly', flew: 'fly', soar: 'fly', soaring: 'fly',
  swim: 'swim', swimming: 'swim', swims: 'swim', swam: 'swim',
  sleep: 'sleep', sleeping: 'sleep', sleeps: 'sleep', slept: 'sleep', snooze: 'sleep', snoozing: 'sleep', rest: 'sleep', resting: 'sleep',
  sit: 'sit', sitting: 'sit', sits: 'sit', sat: 'sit',
  think: 'think', thinking: 'think', thinks: 'think', thought: 'think', ponder: 'think', pondering: 'think',
  talk: 'talk', talking: 'talk', talks: 'talk', talked: 'talk', speak: 'talk', speaking: 'talk', chat: 'talk', chatting: 'talk', sing: 'talk', singing: 'talk',
  // Object Animations
  spin: 'spin', spinning: 'spin', spins: 'spin', rotate: 'spin', rotating: 'spin',
  pulse: 'pulse', pulsing: 'pulse', glow: 'pulse', glowing: 'pulse', shine: 'pulse', shining: 'pulse',
  sway: 'sway', swaying: 'sway', sways: 'sway', blow: 'sway', blowing: 'sway',
  float: 'float', floating: 'float', floats: 'float', drift: 'float', drifting: 'float', hover: 'float', hovering: 'float',
  rock: 'rock', rocking: 'rock', rocks: 'rock',
  drive: 'drive', driving: 'drive', drives: 'drive', drove: 'drive', ride: 'drive', riding: 'drive',
  flap: 'flap', flapping: 'flap', flutter: 'flap', fluttering: 'flap',
  wag: 'wag', wagging: 'wag', wags: 'wag',
  // Depth: walking from the distance toward the viewer, or away into it
  approach: 'approach', approaching: 'approach', approaches: 'approach', approached: 'approach',
  recede: 'recede', receding: 'recede', recedes: 'recede',
};

// "a boy and a dog walking": a motion word spreads back over the things listed with "and" before it,
// but only to things that can move by themselves (never "a tree and a dog walking" -> walking tree).
const MOVERS = new Set(['people', 'animals', 'wildlife', 'vehicles', 'alphabet', 'people_body']);
// Words that end such a list ("a tree under the sun", "a man near a dog walking").
const LIST_BREAKS = new Set(['under', 'on', 'in', 'at', 'near', 'behind', 'beside', 'above', 'below', 'over', 'by', 'from', 'to', 'into', 'onto', 'between']);

// Verbs that only describe motion together with a direction ("coming toward us", "heading away").
const DIRECTIONAL_VERBS = new Set(['come', 'comes', 'coming', 'came', 'head', 'heads', 'heading', 'move', 'moves', 'moving', 'go', 'goes', 'going', 'went']);
const VIEWER = new Set(['us', 'me', 'you', 'camera', 'viewer']);
const STAGES = ['slide', 'screen', 'room', 'stage', 'page'];

/**
 * Direction words right after a motion verb, starting at toks[j]:
 *   across / around / through [the] [slide|screen|room|stage|page|park], from place to place -> walk-across
 *   toward(s) [the] us|me|you|camera|viewer, closer, nearer, from afar, from far [away], from the distance -> approach
 *   away [from [the] us|me|camera...], into the distance -> recede
 * Returns { anim, len } (len = tokens consumed) or null.
 */
function motionTail(toks, j) {
  const [a, b, c, d] = toks.slice(j, j + 4);
  if (a === 'across' || a === 'around' || a === 'through' || (a === 'from' && b === 'place')) {
    let len = a === 'from' ? (d === 'place' ? 4 : 3) : 1;
    if (toks[j + len] === 'the' && [...STAGES, 'park'].includes(toks[j + len + 1])) len += 2;
    else if (STAGES.includes(toks[j + len])) len += 1;
    return { anim: 'walk-across', len };
  }
  if (a === 'toward' || a === 'towards') {
    if (VIEWER.has(b)) return { anim: 'approach', len: 2 };
    if (b === 'the' && VIEWER.has(c)) return { anim: 'approach', len: 3 };
    return null;
  }
  if (a === 'closer' || a === 'nearer') return { anim: 'approach', len: 1 };
  if (a === 'from' && b === 'afar') return { anim: 'approach', len: 2 };
  if (a === 'from' && b === 'far') return { anim: 'approach', len: c === 'away' ? 3 : 2 };
  if (a === 'from' && b === 'the' && c === 'distance') return { anim: 'approach', len: 3 };
  if (a === 'away') {
    if (b === 'from' && VIEWER.has(c)) return { anim: 'recede', len: 3 };
    if (b === 'from' && c === 'the' && VIEWER.has(d)) return { anim: 'recede', len: 4 };
    return { anim: 'recede', len: 1 };
  }
  if (a === 'into' && b === 'the' && c === 'distance') return { anim: 'recede', len: 3 };
  return null;
}

export const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, twenty: 20, fifty: 50,
  pair: 2, couple: 2, few: 3, several: 3, some: 3, many: 5, lots: 5,
  dozen: 12, dozens: 12, hundred: 100, hundreds: 100, thousand: 1000, thousands: 1000, million: 1e6, millions: 1e6,
};
// "two dozen", "one hundred": a multiplier scales the number before it instead of replacing it.
const MULTIPLIERS = new Set(['dozen', 'hundred', 'thousand', 'million']);
// Counts are capped: a picture can't show a hundred birds, and layouts stay readable.
const MAX_COUNT = 12;
// "no cats", "a boy without a hat": the next concept is left out of the picture.
const NEGATIONS = new Set(['no', 'without', 'zero', 'none']);

export const SIZE_WORDS = {
  big: 1.3, large: 1.3, huge: 1.5, giant: 1.6, enormous: 1.6, tall: 1.2,
  small: 0.7, little: 0.75, tiny: 0.55, mini: 0.6, short: 0.85,
};

const IRREGULAR = {
  children: 'child', men: 'man', women: 'woman', people: 'person', mice: 'mouse', geese: 'goose',
  feet: 'foot', teeth: 'tooth', leaves: 'leaf', knives: 'knife', wolves: 'wolf', loaves: 'loaf',
  calves: 'calf', halves: 'half', shelves: 'shelf', scarves: 'scarf', oxen: 'ox', cacti: 'cactus',
};

export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/['’]s\b/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);
}

function singularCandidates(w) {
  const out = [];
  if (IRREGULAR[w]) out.push(IRREGULAR[w]);
  if (w.length > 3) {
    if (w.endsWith('ies')) out.push(w.slice(0, -3) + 'y');
    if (w.endsWith('es')) out.push(w.slice(0, -2));
    if (w.endsWith('s') && !w.endsWith('ss')) out.push(w.slice(0, -1));
  }
  return out;
}

let cache = null;
function getIndex() {
  const v = registryVersion();
  if (cache && cache.v === v) return cache;
  const single = new Map();
  const multi = new Map();
  let maxN = 1;
  for (const c of listConcepts()) {
    for (const raw of [c.id.replace(/_/g, ' '), c.label, ...(c.aliases || [])]) {
      if (!raw) continue;
      const key = tokenize(raw).join(' ');
      if (!key) continue;
      const n = key.split(' ').length;
      const map = n === 1 ? single : multi;
      if (!map.has(key)) map.set(key, c.id);
      maxN = Math.max(maxN, n);
    }
  }
  cache = { v, single, multi, maxN, singleKeys: [...single.keys()] };
  return cache;
}

function lookupWord(w, map) {
  if (map.has(w)) return { id: map.get(w), plural: false };
  for (const cand of singularCandidates(w)) if (map.has(cand)) return { id: map.get(cand), plural: true };
  return null;
}

function conceptAt(toks, i, idx) {
  for (let n = Math.min(idx.maxN, toks.length - i); n >= 2; n--) {
    const words = toks.slice(i, i + n);
    const head = words.slice(0, -1).join(' ');
    const last = words[n - 1];

    if (n === 2 && (MOTION_WORDS[last] || DIRECTIONAL_VERBS.has(last))) {
      const base = lookupWord(head, idx.single);
      const tail = motionTail(toks, i + 2);
      if (base && (MOTION_WORDS[last] || tail)) {
        return { id: base.id, animation: tail ? tail.anim : MOTION_WORDS[last], plural: base.plural, len: 2 + (tail?.len ?? 0), word: head };
      }
    }

    const exact = idx.multi.get(words.join(' '));
    if (exact) return { id: exact, plural: false, len: n, word: words.join(' ') };
    for (const cand of singularCandidates(last)) {
      const hit = idx.multi.get(`${head} ${cand}`);
      if (hit) return { id: hit, plural: true, len: n, word: words.join(' ') };
    }
  }
  const r = lookupWord(toks[i], idx.single);
  return r ? { ...r, len: 1, word: toks[i] } : null;
}

const POSSESSIVES = new Set(['his', 'her', 'their', 'its', 'my', 'your', 'our']);

/**
 * A phrase at toks[i] saying which side of a figure we see. Returns { view, len } or null.
 *   back:  from behind (not "from behind the house"), from the back/rear, facing away, turned away, back view, rear view,
 *          with his/her/their back to us/me/you/the camera/the viewer
 *   front: from the front, front view, facing us/me/you/the camera/the viewer
 */
function viewPhrase(toks, i) {
  const [a, b, c, d, e] = toks.slice(i, i + 5);
  // ("waving from behind the house" is a place, not a view)
  if (a === 'from' && b === 'behind' && !['a', 'an', 'the', 'this', 'that'].includes(c) && !POSSESSIVES.has(c)) return { view: 'back', len: 2 };
  if (a === 'from' && b === 'the' && (c === 'back' || c === 'rear')) return { view: 'back', len: 3 };
  if ((a === 'facing' || a === 'turned') && b === 'away') return { view: 'back', len: 2 };
  if ((a === 'back' || a === 'rear') && b === 'view') return { view: 'back', len: 2 };
  if (a === 'with' && POSSESSIVES.has(b) && c === 'back' && d === 'to') {
    if (VIEWER.has(e)) return { view: 'back', len: 5 };
    if (e === 'the' && VIEWER.has(toks[i + 5])) return { view: 'back', len: 6 };
  }
  if (a === 'from' && b === 'the' && c === 'front') return { view: 'front', len: 3 };
  if (a === 'front' && b === 'view') return { view: 'front', len: 2 };
  if (a === 'facing' && VIEWER.has(b)) return { view: 'front', len: 2 };
  if (a === 'facing' && b === 'the' && VIEWER.has(c)) return { view: 'front', len: 3 };
  return null;
}

function lev(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function fuzzyLookup(w, idx) {
  let best = null, bestD = Infinity;
  for (const cand of [w, ...singularCandidates(w)]) {
    if (cand.length < 5) continue;
    const max = cand.length >= 8 ? 2 : 1;
    for (const k of idx.singleKeys) {
      if (k.length < 4 || k[0] !== cand[0] || Math.abs(k.length - cand.length) > max) continue;
      const dist = lev(cand, k);
      if (dist <= max && dist < bestD) { bestD = dist; best = k; }
    }
  }
  return best ? { id: idx.single.get(best), key: best } : null;
}

function mergeMatches(found) {
  const out = [];
  for (const m of found) {
    const target = out.find((o) =>
      o.id === m.id &&
      (!m.color || !o.color || o.color === m.color) &&
      (!m.expression || !o.expression || o.expression === m.expression) &&
      (!m.animation || !o.animation || o.animation === m.animation) &&
      (!m.view || !o.view || o.view === m.view)
    );
    if (target) {
      target.count = Math.max(target.count, m.count);
      target.color = target.color ?? m.color;
      target.size = target.size ?? m.size;
      target.expression = target.expression ?? m.expression;
      target.animation = target.animation ?? m.animation;
      target.view = target.view ?? m.view;
    } else out.push({ ...m });
  }
  return out;
}

/**
 * parseText("Three red apples and a boy") ->
 *   { matches: [{ id:'apple', word:'apples', count:3, color:'red' }, { id:'boy', ... }], unknown: [...], excluded: [...], tokens: [...] }
 *   excluded: concept words negated in the prompt ("no cats", "without a hat") and left out
 */
export function parseText(text, { fuzzy = false } = {}) {
  const idx = getIndex();
  const toks = tokenize(text);
  const found = [];
  const unknown = [];
  const excluded = [];
  let pend = {};
  let lastConceptIndex = -99;
  let list = []; // indices into `found` of the current "x and y" list

  const spreadMotion = (anim) => {
    for (const j of list) {
      if (!found[j].animation && MOVERS.has(getConcept(found[j].id)?.category)) found[j].animation = anim;
    }
    list = [];
  };

  const push = (hit, extra = {}) => {
    if (pend.negate) {
      excluded.push(hit.word);
      pend = {};
      return;
    }
    found.push({
      id: hit.id, word: hit.word, color: pend.color, size: pend.size,
      count: pend.count != null ? Math.max(1, Math.min(pend.count, MAX_COUNT)) : hit.plural ? 3 : 1,
      expression: pend.expression ?? hit.expression,
      animation: pend.animation ?? hit.animation,
      view: pend.view,
      ...extra,
    });
    pend = {};
    list.push(found.length - 1);
    if (hit.animation) spreadMotion(hit.animation);
  };

  for (let i = 0; i < toks.length;) {
    const t = toks[i];
    const next = toks[i + 1];

    if (['and', 'or', 'but', 'with', 'without', 'then'].includes(t)) {
      lastConceptIndex = -99;
    }
    const seen = viewPhrase(toks, i);
    if (seen) {
      // "back view of a boy" -> the next figure; "a boy and a girl seen from behind" -> the list so far
      if (!found.length) pend.view = seen.view;
      else for (const j of list.length ? list : [found.length - 1]) found[j].view = seen.view;
      i += seen.len;
      continue;
    }
    if (LIST_BREAKS.has(t)) list = [];
    if (NEGATIONS.has(t)) {
      pend.negate = true;
      i++;
      continue;
    }

    const hasNextConcept = next && (SIZE_WORDS[next] || COLOR_WORDS[next] || EXPRESSION_WORDS[next] || conceptAt(toks, i + 1, idx));
    let isModifierAdjective = (COLOR_WORDS[t] || EXPRESSION_WORDS[t] || MOTION_WORDS[t]) && hasNextConcept;
    // "black circle" / "white flag" name a library icon outright; "red apple" stays a recolored handmade apple.
    if (isModifierAdjective) {
      const whole = conceptAt(toks, i, idx);
      const rest = conceptAt(toks, i + 1, idx);
      if (whole && whole.len >= 2 && !whole.animation && rest && getConcept(rest.id)?.isLibrary) isModifierAdjective = false;
    }
    const isStopword = STOPWORDS.has(t);
    // A bare numeral is a count ("3 dogs"), never the keycap icon that also answers to "3".
    const isNumeral = /^\d+$/.test(t);

    const hit = (isModifierAdjective || isStopword || isNumeral) ? null : conceptAt(toks, i, idx);
    if (hit) {
      push(hit);
      lastConceptIndex = i + hit.len - 1;
      i += hit.len;
      continue;
    }

    if (NUMBER_WORDS[t] != null) {
      pend.count = MULTIPLIERS.has(t.replace(/s$/, '')) && pend.count != null ? pend.count * NUMBER_WORDS[t] : NUMBER_WORDS[t];
    } else if (/^\d+$/.test(t)) pend.count = +t;
    else if (COLOR_WORDS[t]) pend.color = t;
    else if (SIZE_WORDS[t]) pend.size = SIZE_WORDS[t];
    else if (EXPRESSION_WORDS[t]) {
      const expr = EXPRESSION_WORDS[t];
      if (hasNextConcept) {
        pend.expression = expr;
      } else if (found.length > 0 && i === lastConceptIndex + 1) {
        found[found.length - 1].expression = expr;
      } else {
        pend.expression = expr;
      }
    } else if (MOTION_WORDS[t] || (DIRECTIONAL_VERBS.has(t) && motionTail(toks, i + 1))) {
      const tail = motionTail(toks, i + 1);
      const anim = tail ? tail.anim : MOTION_WORDS[t];
      const at = i;
      if (tail) i += tail.len;
      if (hasNextConcept) {
        pend.animation = anim;
      } else if (found.length > 0 && (at <= lastConceptIndex + 2)) {
        found[found.length - 1].animation = anim;
        spreadMotion(anim);
      } else {
        pend.animation = anim;
      }
    } else if (!STOPWORDS.has(t)) {
      const f = fuzzy ? fuzzyLookup(t, idx) : null;
      if (f) push({ id: f.id, word: t, plural: false }, { fuzzy: true });
      else {
        unknown.push(t);
        list = [];
        delete pend.negate; // "no place like home": the negation was about something we can't draw
      }
    }
    i++;
  }
  return { matches: mergeMatches(found), unknown: [...new Set(unknown)], excluded: [...new Set(excluded)], tokens: toks };
}
