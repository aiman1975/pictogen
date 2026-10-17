// Text -> concepts. Fully offline: tokenization, plural handling, aliases, multi-word phrases,
// color/size/count modifiers and (optional) typo tolerance.

import { listConcepts, getConcept, registryVersion } from '../concepts/index.js';
import { COLOR_WORDS } from '../core/color.js';

export const STOPWORDS = new Set(
  `a an the and or but nor of in on at to with without from by for is are was were be been being am
  i you he she it we they me him her us them my your his its our their mine yours this that these those there here
  as into onto over under above below near beside behind between across up down out off very so too then than just also not no yes
  do does did done has have had having will would can could should may might must shall while when where who whom which what why how
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
};

export const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  pair: 2, couple: 2, few: 3, several: 3, some: 3, many: 5, lots: 5, dozen: 6,
};

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

    if (n === 2 && MOTION_WORDS[last]) {
      const base = lookupWord(head, idx.single);
      if (base) {
        let anim = MOTION_WORDS[last];
        let len = 2;
        const after = toks[i + 2];
        if (after === 'across' || after === 'around' || after === 'through' || (after === 'from' && toks[i + 3] === 'place')) {
          anim = 'walk-across';
          if (after === 'from') len += 3;
          else len += 1;
          if (toks[i + len] === 'the' && ['slide', 'screen', 'room', 'stage', 'page', 'park'].includes(toks[i + len + 1])) {
            len += 2;
          } else if (['slide', 'screen', 'room', 'stage', 'page'].includes(toks[i + len])) {
            len += 1;
          }
        }
        return { id: base.id, animation: anim, plural: base.plural, len, word: head };
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
      (!m.animation || !o.animation || o.animation === m.animation)
    );
    if (target) {
      target.count = Math.max(target.count, m.count);
      target.color = target.color ?? m.color;
      target.size = target.size ?? m.size;
      target.expression = target.expression ?? m.expression;
      target.animation = target.animation ?? m.animation;
    } else out.push({ ...m });
  }
  return out;
}

/**
 * parseText("Three red apples and a boy") ->
 *   { matches: [{ id:'apple', word:'apples', count:3, color:'red' }, { id:'boy', ... }], unknown: [...], tokens: [...] }
 */
export function parseText(text, { fuzzy = false } = {}) {
  const idx = getIndex();
  const toks = tokenize(text);
  const found = [];
  const unknown = [];
  let pend = {};
  let lastConceptIndex = -99;

  const push = (hit, extra = {}) => {
    found.push({
      id: hit.id, word: hit.word, color: pend.color, size: pend.size,
      count: pend.count ?? (hit.plural ? 3 : 1),
      expression: pend.expression ?? hit.expression,
      animation: pend.animation ?? hit.animation,
      ...extra,
    });
    pend = {};
  };

  for (let i = 0; i < toks.length;) {
    const t = toks[i];
    const next = toks[i + 1];

    if (['and', 'or', 'but', 'with', 'then'].includes(t)) {
      lastConceptIndex = -99;
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

    const hit = (isModifierAdjective || isStopword) ? null : conceptAt(toks, i, idx);
    if (hit) {
      push(hit);
      lastConceptIndex = i + hit.len - 1;
      i += hit.len;
      continue;
    }

    if (NUMBER_WORDS[t] != null) pend.count = NUMBER_WORDS[t];
    else if (/^\d+$/.test(t)) pend.count = Math.min(+t, 12);
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
    } else if (MOTION_WORDS[t]) {
      let anim = MOTION_WORDS[t];
      if (next === 'across' || next === 'around' || next === 'through' || (next === 'from' && toks[i + 2] === 'place')) {
        anim = 'walk-across';
        if (next === 'from') i += 3;
        else i++;
        if (toks[i + 1] === 'the' && ['slide', 'screen', 'room', 'stage', 'page', 'park'].includes(toks[i + 2])) {
          i += 2;
        } else if (['slide', 'screen', 'room', 'stage', 'page'].includes(toks[i + 1])) {
          i += 1;
        }
      }
      if (hasNextConcept) {
        pend.animation = anim;
      } else if (found.length > 0 && (i <= lastConceptIndex + 2)) {
        found[found.length - 1].animation = anim;
      } else {
        pend.animation = anim;
      }
    } else if (!STOPWORDS.has(t)) {
      const f = fuzzy ? fuzzyLookup(t, idx) : null;
      if (f) push({ id: f.id, word: t, plural: false }, { fuzzy: true });
      else unknown.push(t);
    }
    i++;
  }
  return { matches: mergeMatches(found), unknown: [...new Set(unknown)], tokens: toks };
}
