// Text -> concepts. Fully offline: tokenization, plural handling, aliases, multi-word phrases,
// color/size/count modifiers and (optional) typo tolerance.

import { listConcepts, getConcept, registryVersion } from '../concepts/index.js';
import { COLOR_WORDS } from '../core/color.js';
import { canHold } from '../held.js';

export const STOPWORDS = new Set(
  `a an the and or but nor of in on at to with without from by for is are was were be been being am
  i you he she it we they me him her us them my your his its our their mine yours this that these those there here
  as into onto over under above below near beside behind between across up down out off very so too then than just also not no yes
  do does did done has have had having will would can could should may might must shall while when where who whom which what why how
  comes coming toward towards seen viewed shown
  finally afterwards afterward meanwhile
  watches watched stares stared staring gazes gazed gazing glances glanced glancing smiles smiled laughs laughed cries cried frowns frowned each another
  all any each every such only own same other s t let lets get gets got go goes going went come came see saw look looks looking
  like likes liked once upon time day one's its very really
  stand standing stands stood play playing plays played
  eat eating eats ate`.split(/\s+/),
);

export const EXPRESSION_WORDS = {
  happy: 'happy', smiling: 'happy', smile: 'happy', smiles: 'happy', smiled: 'happy', laughs: 'laugh', laughed: 'laugh', cries: 'sad', cried: 'sad', glad: 'happy', cheerful: 'happy',
  laugh: 'laugh', laughing: 'laugh', laughter: 'laugh', giggle: 'laugh', joyful: 'laugh', funny: 'laugh',
  sad: 'sad', crying: 'sad', cry: 'sad', unhappy: 'sad', tearful: 'sad', sorrow: 'sad', weeping: 'sad',
  surprised: 'surprised', shocked: 'surprised', amazed: 'surprised', astonished: 'surprised', wow: 'surprised',
  wink: 'wink', winking: 'wink', playful: 'wink', smirk: 'wink',
  angry: 'angry', mad: 'angry', furious: 'angry', grumpy: 'angry', annoyed: 'angry',
  talk: 'talking', talking: 'talking', speaking: 'talking', speak: 'talking', chat: 'talking', chatting: 'talking',
  confused: 'confused', puzzled: 'confused',
  suspicious: 'skeptical', skeptical: 'skeptical', doubtful: 'skeptical',
  neutral: 'neutral', calm: 'neutral',
  scared: 'scared', afraid: 'scared', frightened: 'scared', terrified: 'scared', nervous: 'scared', worried: 'scared', fearful: 'scared',
  sleepy: 'sleepy', tired: 'sleepy', yawns: 'sleepy', yawning: 'sleepy', drowsy: 'sleepy', yawn: 'sleepy',
  excited: 'excited', thrilled: 'excited', delighted: 'excited', overjoyed: 'excited',
  loves: 'love', loving: 'love', adores: 'love', adoring: 'love', smitten: 'love',
  shy: 'shy', embarrassed: 'shy', blushing: 'shy', blushes: 'shy', bashful: 'shy',
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

// Words for a group of people: drawn as a mix of the people they stand for ("children" -> boys
// and girls, "a team" -> men and women), as many as asked for ("five kids")
export const GROUP_WORDS = {
  children: ['boy', 'girl', 'boy'], kids: ['boy', 'girl', 'girl'], students: ['girl', 'boy', 'girl'], pupils: ['boy', 'girl', 'boy'],
  classmates: ['girl', 'boy', 'girl'], schoolchildren: ['boy', 'girl', 'boy'],
  people: ['man', 'woman', 'boy', 'girl'], persons: ['woman', 'man', 'woman'], crowd: ['man', 'woman', 'girl', 'boy', 'woman'],
  friends: ['girl', 'boy', 'girl'], group: ['woman', 'man', 'girl'], everyone: ['man', 'woman', 'boy', 'girl'],
  team: ['woman', 'man', 'woman'], colleagues: ['man', 'woman', 'man'], coworkers: ['woman', 'man', 'woman'], staff: ['man', 'woman', 'man'],
  family: ['man', 'woman', 'girl', 'boy'], grandparents: ['old_man', 'old_woman'], parents: ['man', 'woman'], couple: ['man', 'woman'], adults: ['woman', 'man', 'woman'],
};
// Words with no drawing of their own, drawn as the nearest thing that has one (the first that exists)
export const SYNONYMS = {
  superhero: ['man_superhero', 'woman_superhero'], superheroes: ['man_superhero', 'woman_superhero'], heroine: ['woman_superhero'],
  kid: ['boy'], child: ['girl'], student: ['girl'], pupil: ['boy'], toddler: ['baby'],
  lady: ['woman'], gentleman: ['man'], grandpa: ['old_man', 'man'], grandfather: ['old_man', 'man'], grandma: ['old_woman', 'woman'], grandmother: ['old_woman', 'woman'],
  puppy: ['dog'], doggy: ['dog'], kitten: ['cat'], kitty: ['cat'], bunny: ['rabbit'], automobile: ['car'], bicycle: ['bike'], smartphone: ['mobile_phone'], cellphone: ['mobile_phone'],
  cup: ['hot_beverage'], mug: ['hot_beverage'], coffee: ['hot_beverage'], tea: ['teacup_without_handle'], juice: ['beverage_box'],
  milk: ['glass_of_milk'], bag: ['handbag'], present: ['wrapped_gift'], toy: ['teddy_bear'], flag: ['triangular_flag'],
  sign: ['placard'], torch: ['flashlight'], sword: ['dagger'], letter: ['love_letter'],
  dinosaur: ['t_rex', 'sauropod'], dinosaurs: ['t_rex', 'sauropod'], dino: ['t_rex'], trex: ['t_rex'],
  wizard: ['man_mage'], wizards: ['man_mage'], witch: ['woman_mage'], sorcerer: ['man_mage'], magician: ['man_mage'],
  monster: ['alien_monster'], monsters: ['alien_monster'], fairy: ['woman_fairy'], fairies: ['woman_fairy'],
  mum: ['woman'], mom: ['woman'], mummy: ['woman'], mommy: ['woman'], mama: ['woman'], mother: ['woman'], aunt: ['woman'], auntie: ['woman'],
  dad: ['man'], daddy: ['man'], papa: ['man'], father: ['man'], uncle: ['man'], granny: ['old_woman', 'woman'], nana: ['old_woman', 'woman'],
  grandad: ['old_man', 'man'], granddad: ['old_man', 'man'], pony: ['horse'], puppies: ['dog'], kittens: ['cat'],
  presents: ['wrapped_gift'], gifts: ['wrapped_gift'], sister: ['girl'], brother: ['boy'], son: ['boy'], daughter: ['girl'], grandson: ['boy'], granddaughter: ['girl'], wife: ['woman'], husband: ['man'],
};
// Before a noun, these words mean "flies" and "waves" are things ("three flies", "the waves");
// after someone who can move, they are what it does ("a superhero flies", "he waves")
const NOUN_LEADERS = new Set(['a', 'an', 'the', 'some', 'many', 'few', 'several', 'these', 'those', 'of', 'with', 'and', 'his', 'her', 'their', 'my', 'your', 'our', 'its', 'no', 'big', 'small', 'little', 'tiny', 'huge']);
const CONTAINERS = new Set(['cup', 'mug', 'glass', 'bottle', 'can', 'box', 'bag', 'basket', 'bowl', 'plate', 'bunch', 'bouquet', 'piece', 'slice']);
// Words for holding something: what follows is in the hands of whoever came before ("a girl holds
// a balloon", "a boy with a ball", "she reads a book")
const HOLD_VERBS = new Set(['hold', 'holds', 'holding', 'held', 'carry', 'carries', 'carrying', 'carried', 'hug', 'hugs', 'hugging',
  'read', 'reads', 'reading', 'eat', 'eats', 'eating', 'drink', 'drinks', 'drinking', 'use', 'uses', 'using', 'grab', 'grabs',
  'grabbing', 'show', 'shows', 'showing', 'has', 'have', 'with', 'brings', 'bringing', 'lick', 'licks', 'licking', 'play', 'plays', 'playing',
  'fly', 'flies', 'flying', 'wave', 'waves', 'waving', 'throw', 'throws', 'throwing', 'catch', 'catches', 'catching']);
const NOT_HELD_AFTER = ['at', 'to', 'toward', 'towards', 'over', 'under', 'in', 'on', 'into', 'onto', 'from', 'for', 'around', 'near',
  'by', 'past', 'through', 'across', 'behind', 'beside', 'next', 'above', 'below', 'up', 'down', 'away', 'back', 'off', 'out', 'like'];
const SUBJECT_PRONOUNS = new Set(['he', 'she', 'it', 'they', 'who', 'we', 'i', 'you']);
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
  // Hand-drawn concepts first (every word for them), then the library: each icon's own name before
  // the other icons' extra words ("mouse" is the animal, not the computer mouse that also answers to it)
  const all = listConcepts(), hand = all.filter((c) => !c.isLibrary), lib = all.filter((c) => c.isLibrary);
  const words = [
    ...hand.map((c) => [c, [c.id.replace(/_/g, ' '), c.label, ...(c.aliases || [])]]),
    ...lib.map((c) => [c, [c.id.replace(/_/g, ' '), c.label]]),
    ...lib.map((c) => [c, c.aliases || []]),
  ];
  for (const [c, raws] of words) {
    for (const raw of raws) {
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

    // "boy waves", and with a name of several words, "the letter a waves", "number 7 jumps"
    if (MOTION_WORDS[last] || DIRECTIONAL_VERBS.has(last)) {
      const base = n === 2 ? lookupWord(head, idx.single) : idx.multi.has(head) ? { id: idx.multi.get(head), plural: false } : null;
      const tail = motionTail(toks, i + 2);
      if (base && (MOTION_WORDS[last] || tail)) {
        return { id: base.id, animation: tail ? tail.anim : MOTION_WORDS[last], plural: base.plural, len: n + (tail?.len ?? 0), word: head };
      }
    }

    const exact = idx.multi.get(words.join(' '));
    if (exact) return { id: exact, plural: false, len: n, word: words.join(' ') };
    // ("woman cooks" is a woman cooking, not several woman cooks)
    const subject = n === 2 && /^people/.test(getConcept(lookupWord(head, idx.single)?.id)?.category ?? '');
    for (const cand of subject ? [] : singularCandidates(last)) {
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
 *   three-quarter: three-quarter view, 3/4 view, half turned
 *   side:  from the side, side view, profile view, in profile
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
  if (a === 'three' && /^quarters?$/.test(b) && c === 'view') return { view: 'three-quarter', len: 3 };
  if (a === '3' && b === '4' && c === 'view') return { view: 'three-quarter', len: 3 };
  if (a === 'half' && b === 'turned') return { view: 'three-quarter', len: 2 };
  if (a === 'from' && b === 'the' && c === 'side') return { view: 'side', len: 3 };
  if ((a === 'side' || a === 'profile') && b === 'view') return { view: 'side', len: 2 };
  if (a === 'in' && b === 'profile') return { view: 'side', len: 2 };
  if (a === 'from' && b === 'the' && c === 'front') return { view: 'front', len: 3 };
  if (a === 'front' && b === 'view') return { view: 'front', len: 2 };
  if (a === 'facing' && VIEWER.has(b)) return { view: 'front', len: 2 };
  if (a === 'facing' && b === 'the' && VIEWER.has(c)) return { view: 'front', len: 3 };
  return null;
}

// What someone wears and their hair, said about them ("a girl in a purple dress", "a man wearing a
// red coat", "a boy with curly black hair", "a blonde woman", "a red-haired girl"): the colours of
// their own clothes and hair, not more things to draw
const CLOTHES = new Set(['dress', 'dresses', 'shirt', 'shirts', 'tshirt', 'top', 'blouse', 'coat', 'jacket', 'jumper', 'sweater',
  'hoodie', 'cardigan', 'outfit', 'clothes', 'suit', 'uniform', 'skirt', 'gown', 'frock', 'costume', 'pyjamas', 'pajamas',
  'overalls', 'raincoat', 'tunic', 'vest', 'jersey', 'tracksuit', 'onesie']);
// Hair colours as hair is (red hair is ginger, not fire-engine red)
const HAIR_SHADES = {
  blonde: '#e6b94f', blond: '#e6b94f', golden: '#e6b94f', fair: '#e6b94f', yellow: '#f2d16b', ginger: '#c8662b', red: '#c8662b',
  auburn: '#a0522d', orange: '#d9772f', brunette: '#5d4037', brown: '#5d4037', dark: '#2e211c', black: '#212121',
  grey: '#b0b0b0', gray: '#b0b0b0', white: '#eeeeee', silver: '#cfd8dc', pink: '#f48fb1', blue: '#64b5f6',
  purple: '#ba68c8', green: '#81c784', teal: '#4db6ac',
};
// Hair words that say nothing but the hair ("a blonde girl")
const HAIR_ONLY = new Set(['blonde', 'blond', 'ginger', 'brunette', 'auburn']);
// A face and hair described ("with big eyes", "curly red hair", "a round face", "freckles"): the
// person's own features (src/looks.js)
const FEATURE_PARTS = new Set(['eyes', 'eye', 'eyelashes', 'lashes', 'eyebrows', 'brows', 'nose', 'mouth', 'face', 'cheeks', 'freckles',
  'glasses', 'spectacles', 'hair', 'ponytail', 'pigtails', 'bunches', 'braids', 'plaits', 'bun', 'afro']);
const HAIR_STYLE_WORDS = { curly: 'curly', wavy: 'curly', frizzy: 'curly', spiky: 'spiky', short: 'short', long: 'long', straight: 'long', afro: 'afro', bob: 'bob' };
const BIG = new Set(['big', 'large', 'huge', 'giant', 'wide', 'round']), SMALL_WORDS = new Set(['small', 'tiny', 'little', 'thin', 'narrow']);
function featureWords(adj, part) {
  const has = (set) => adj.some((w) => set.has(w));
  const f = {};
  let hair = null;
  if (part === 'eyes' || part === 'eye') { if (has(BIG)) f.eyes = 'big'; else if (has(SMALL_WORDS)) f.eyes = 'small'; else return null; }
  else if (part === 'eyelashes' || part === 'lashes') f.lashes = true;
  else if (part === 'eyebrows' || part === 'brows') f.brows = adj.some((w) => ['thin', 'fine', 'light'].includes(w)) ? 'thin' : 'thick';
  else if (part === 'nose') f.nose = adj.some((w) => ['long', 'pointy', 'pointed', 'sharp'].includes(w)) ? 'pointy' : has(SMALL_WORDS) ? 'dot' : 'button';
  else if (part === 'mouth') { if (has(BIG)) f.mouth = 'big'; else if (has(SMALL_WORDS)) f.mouth = 'small'; else return null; }
  else if (part === 'face') {
    const shape = adj.find((w) => ['round', 'oval', 'square', 'wide', 'long', 'chubby', 'thin'].includes(w));
    if (!shape) return null;
    f.face = { long: 'oval', thin: 'oval', chubby: 'wide' }[shape] ?? shape;
  } else if (part === 'cheeks') f.cheeks = 'big';
  else if (part === 'freckles') f.freckles = true;
  else if (part === 'glasses' || part === 'spectacles') f.glasses = true;
  else if (part === 'ponytail') f.hair = 'ponytail';
  else if (['pigtails', 'bunches', 'braids', 'plaits'].includes(part)) f.hair = 'pigtails';
  else if (part === 'bun') f.hair = 'bun';
  else if (part === 'afro') f.hair = 'afro';
  else if (part === 'hair') {
    const style = ['afro', 'curly', 'wavy', 'frizzy', 'spiky', 'bob', 'long', 'straight', 'short'].find((w) => adj.includes(w));
    if (style) f.hair = HAIR_STYLE_WORDS[style];
    const shade = adj.find((w) => HAIR_SHADES[w]);
    if (shade) hair = HAIR_SHADES[shade];
    if (!style && !shade) return null;
  }
  return { features: f, hair };
}
/** At toks[i]: "with big eyes", "and curly red hair", "has freckles", "wearing glasses" -> { features, hair?, len } */
function featurePhrase(toks, i) {
  if (!['with', 'has', 'have', 'and', 'wearing', 'wears'].includes(toks[i])) return null;
  let j = i + 1;
  if (['a', 'an', 'the', 'some', 'two'].includes(toks[j]) || POSSESSIVES.has(toks[j])) j++;
  const adj = [];
  while (j < toks.length && j < i + 7 && !FEATURE_PARTS.has(toks[j])) {
    if (!/^[a-z]+$/.test(toks[j]) || ['and', 'with', 'then', 'in', 'on', 'at'].includes(toks[j])) return null;
    adj.push(toks[j++]);
  }
  if (!FEATURE_PARTS.has(toks[j])) return null;
  const got = featureWords(adj, toks[j]);
  return got ? { ...got, len: j + 1 - i } : null;
}

const LOOK_FILLERS = new Set(['long', 'short', 'curly', 'straight', 'wavy', 'messy', 'spiky', 'pretty', 'new', 'big', 'little',
  'favourite', 'favorite', 'bright', 'light', 'fluffy', 'cosy', 'cozy', 'warm', 'nice', 'lovely', 'sparkly', 'shiny', 'smart', 'fancy']);

/**
 * At toks[i], what someone wears or their hair: "in a purple dress", "wearing red", "dressed in
 * blue", "with long blonde hair", "has a green coat". isThing(j): toks[j] starts something to draw.
 * Returns { color?, hair?, len } (color: a colour word for their clothes, hair: "#rrggbb") or null.
 */
function lookPhrase(toks, i, isThing) {
  let j = i;
  const a = toks[j];
  if (a === 'dressed' && toks[j + 1] === 'in') j += 2;
  else if (['in', 'wearing', 'wears', 'with', 'has', 'have'].includes(a)) j += 1;
  else return null;
  if (['a', 'an', 'the', 'some'].includes(toks[j]) || POSSESSIVES.has(toks[j])) j++;
  for (let n = 0; n < 2 && LOOK_FILLERS.has(toks[j]); n++) j++;
  const colour = toks[j];
  if (!COLOR_WORDS[colour] && !HAIR_SHADES[colour]) return null;
  j++;
  for (let n = 0; n < 2 && LOOK_FILLERS.has(toks[j]); n++) j++;
  if (toks[j] === 'hair' && HAIR_SHADES[colour]) return { hair: HAIR_SHADES[colour], len: j + 1 - i };
  if (!COLOR_WORDS[colour]) return null;
  if (toks[j] === 't' && toks[j + 1] === 'shirt') j++;
  if (CLOTHES.has(toks[j])) return { color: colour, len: j + 1 - i };
  // "a girl dressed in red", "wearing blue": the colour alone (not "in red boots" or "with a red ball")
  if (a !== 'with' && a !== 'has' && a !== 'have' && j === i + (a === 'dressed' ? 3 : 2) && !isThing(j)) return { color: colour, len: j - i };
  return null;
}

// Doing things together: sitting on something, riding it, holding hands, hugging
const SIT_VERBS = new Set(['sit', 'sits', 'sitting', 'sat', 'seated']);
const RIDE_VERBS = new Set(['ride', 'rides', 'riding', 'rode', 'cycle', 'cycles', 'cycling', 'pedal', 'pedals', 'pedalling', 'pedaling']);
// Thinking of something: it is drawn in a thought bubble over their head
const THINK_VERBS = new Set(['think', 'thinks', 'thinking', 'thought', 'dream', 'dreams', 'dreaming', 'dreamed', 'dreamt', 'imagine', 'imagines',
  'imagining', 'imagined', 'wonder', 'wonders', 'wondering', 'wondered', 'remember', 'remembers', 'remembering', 'remembered', 'wish', 'wishes',
  'wishing', 'wished', 'misses', 'missed', 'miss', 'missing']);
const HUG_VERBS = new Set(['hug', 'hugs', 'hugging', 'hugged', 'cuddle', 'cuddles', 'cuddling', 'embrace', 'embraces', 'embracing']);
const HAND_HOLD = new Set(['hold', 'holds', 'holding', 'held', 'join', 'joins', 'joining']);
const CLAUSE_BREAKS = new Set(['then', 'while', 'when', 'but', 'after', 'before', 'because', 'so']);
// What can be sat on (with the seat's height in its drawing, see the concepts) and ridden
const SEATS = new Set(['chair', 'bench', 'sofa']);
const RIDES = new Set(['bike']);
const isPerson = (m) => /^people/.test(getConcept(m.id.split('~')[0])?.category ?? '');

/**
 * Who does what together, from where the words are (found[].at: the word's index in toks):
 *   a seat or a ride: m.carries = { how: 'sit' | 'ride', by: [person ids] } ("a boy and a girl sit on
 *   a bench", "a girl rides a bike"; the riders and sitters sit: animation 'sit')
 *   two people: m.pair = { how: 'hands' | 'hug', with: id } on both ("a boy and his grandpa hold
 *   hands", "a girl hugs her grandma", "two friends hug")
 */
function relations(toks, found) {
  const breaks = toks.map((t, i) => (CLAUSE_BREAKS.has(t) ? i : -1)).filter((i) => i >= 0);
  const clauseOf = (i) => [Math.max(-1, ...breaks.filter((b) => b < i)), Math.min(toks.length, ...breaks.filter((b) => b > i))];
  const people = (from, to) => found.filter((m) => m.at > from && m.at < to && isPerson(m) && !m.heldBy);
  const pairUp = (list, how) => {
    for (let k = 0; k + 1 < list.length; k += 2) {
      list[k].pair = { how, with: list[k + 1].id };
      list[k + 1].pair = { how, with: list[k].id };
      for (const m of [list[k], list[k + 1]]) if (m.animation === 'hold') delete m.animation;
    }
    // (two of a kind in one: "two boys hug")
    if (list.length === 1 && list[0].count > 1) list[0].pair = { how, with: list[0].id };
  };
  for (let j = 0; j < toks.length; j++) {
    const t = toks[j];
    const [from, to] = clauseOf(j);
    // (who: the people before the word in its sentence, or, for "they", whoever came before)
    const subjects = () => {
      const own = people(from, j);
      return own.length ? own : people(-1, j).slice(-2);
    };
    if (SIT_VERBS.has(t) || RIDE_VERBS.has(t) || (t === 'on' && j > 0)) {
      const ride = RIDE_VERBS.has(t);
      let thing = found.find((m) => (m.at > j || (ride && m.at === j)) && m.at < Math.min(to, j + 5) && (t === 'on' ? RIDES.has(m.id) || SEATS.has(m.id) : (ride ? RIDES : SEATS).has(m.id)) && !m.carries);
      // ("a boy cycling": on a bike of his own)
      if (!thing && /^(cycl|pedal)/.test(t) && getConcept('bike') && subjects().length) found.push(thing = { id: 'bike', word: t, count: 1, at: j });
      // "a girl on a bike" rides it; "a cat on a chair" is just there
      const onBike = t === 'on' && thing && RIDES.has(thing.id);
      if (t === 'on' && !onBike) continue;
      const who = (t === 'on' ? people(from, j).slice(-1) : subjects()).filter((m) => !m.carries);
      if (!thing || !who.length) continue;
      thing.carries = { how: ride || onBike ? 'ride' : 'sit', by: who.map((m) => m.id) };
      for (const m of who) m.animation = 'sit';
      continue;
    }
    if (HAND_HOLD.has(t) && toks[j + 1] === 'hands' || (t === 'hand' && toks[j + 1] === 'in' && toks[j + 2] === 'hand')) {
      // ("a boy holds hands with his grandpa": both sides of the words)
      pairUp([...subjects(), ...people(j, to)].filter((m, k, all) => all.indexOf(m) === k), 'hands');
      continue;
    }
    // "a boy thinks about a cake", "she dreams of a castle", "a girl has an idea"
    if (THINK_VERBS.has(t)) {
      // (anyone can think: a girl, a dog, a dragon)
      const beings = found.filter((m) => m.at > from && m.at < j && !m.heldBy && /^(people|animals|wildlife)/.test(getConcept(m.id.split('~')[0])?.category ?? ''));
      const who = beings.length ? beings : subjects();
      const thinker = who[who.length - 1];
      const about = found.filter((m) => m.at > j && m.at < to && m.id !== thinker?.id && !m.heldBy && !m.carries);
      if (thinker && about.length) {
        for (const m of about.slice(0, 3)) m.thoughtOf = thinker.id;
        thinker.animation ??= 'think';
      }
      continue;
    }
    if (t === 'idea' && toks.slice(Math.max(0, j - 4), j).some((w) => ['has', 'had', 'gets', 'got', 'have', 'having'].includes(w))) {
      const thinker = found.filter((m) => m.at > from && m.at < j && /^(people|animals|wildlife)/.test(getConcept(m.id.split('~')[0])?.category ?? '')).pop() ?? subjects().pop();
      if (thinker && getConcept('light_bulb') && !found.some((m) => m.thoughtOf === thinker.id)) {
        found.push({ id: 'light_bulb', word: 'idea', count: 1, at: j, thoughtOf: thinker.id });
        thinker.animation ??= 'think';
      }
      continue;
    }
    if (HUG_VERBS.has(t)) {
      const who = subjects();
      const other = found.find((m) => m.at > j && m.at < to && !m.heldBy && (isPerson(m) || MOVERS.has(getConcept(m.id)?.category)));
      if (other && who.length) pairUp([who[who.length - 1], other], 'hug');
      else if (who.length) pairUp(who, 'hug');
    }
  }
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

/**
 * Words close to an unknown one that PictoGen can draw (near spellings, longer or shorter forms of
 * the same word): suggestWords('elefant') -> ['elephant']. At most `limit`, closest first.
 */
export function suggestWords(word, limit = 3) {
  const idx = getIndex();
  const w = String(word || '').toLowerCase();
  if (w.length < 3 || STOPWORDS.has(w)) return [];
  if (GROUP_WORDS[w] || SYNONYMS[w]) return [];
  const scored = [];
  const max = w.length >= 7 ? 2 : 1;
  for (const k of [...idx.singleKeys, ...Object.keys(SYNONYMS), ...Object.keys(GROUP_WORDS)]) {
    if (k.length < 3 || k === w) continue;
    let d = Infinity;
    if (k[0] !== w[0]) continue; // (typos rarely change the first letter)
    if (Math.abs(k.length - w.length) <= max) d = lev(w, k);
    // The same word, longer or shorter ("dino" -> "dinosaur")
    if (d > max && w.length >= 4 && (k.startsWith(w) || w.startsWith(k)) && Math.abs(k.length - w.length) <= 4) d = max + 0.5;
    if (d <= max + 0.5) {
      const c = idx.single.has(k) && getConcept(idx.single.get(k));
      // Hand-drawn concepts and plain words first
      scored.push([d + (c?.isLibrary ? 0.3 : 0) + k.length / 100, k]);
    }
  }
  return [...new Set(scored.sort((a, b) => a[0] - b[0]).map(([, k]) => k))].slice(0, limit);
}

function mergeMatches(found) {
  const out = [];
  for (const m of found) {
    const target = out.find((o) =>
      o.id === m.id && (o.heldBy ?? null) === (m.heldBy ?? null) &&
      (!m.color || !o.color || o.color === m.color) &&
      (!m.hair || !o.hair || o.hair === m.hair) &&
      (!m.expression || !o.expression || o.expression === m.expression) &&
      (!m.animation || !o.animation || o.animation === m.animation) &&
      (!m.view || !o.view || o.view === m.view)
    );
    if (target) {
      target.count = Math.max(target.count, m.count);
      target.color = target.color ?? m.color;
      target.hair = target.hair ?? m.hair;
      if (m.features) target.features = { ...m.features, ...target.features };
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
export function parseText(text, { fuzzy = false, names = null } = {}) {
  const idx = getIndex();
  // Named individuals ("pgc1" -> "boy~pgc1", see src/individuals.js) read as words for their figure
  // ("pgc1 waves", "pgc1 walks toward us": its motion, as for "boy waves")
  const at = (toks, i) => {
    const id = names?.get(toks[i]);
    if (!id) return conceptAt(toks, i, idx);
    const verb = toks[i + 1], tail = verb && motionTail(toks, i + 2);
    if (verb && (MOTION_WORDS[verb] || (DIRECTIONAL_VERBS.has(verb) && tail))) {
      return { id, word: toks[i], plural: false, animation: tail ? tail.anim : MOTION_WORDS[verb], len: 2 + (tail?.len ?? 0) };
    }
    return { id, word: toks[i], plural: false, len: 1 };
  };
  const toks = tokenize(text);
  const found = [];
  const unknown = [];
  const excluded = [];
  let pend = {};
  let tokAt = 0; // (where the word being read is: each thing found remembers it, for relations())
  let lookEnd = -9; // (where a description of someone ended: "with big eyes and curly hair" goes on)
  let lastConceptIndex = -99;
  let list = []; // indices into `found` of the current "x and y" list
  let lastPerson = -1; // the last person named (who holds what follows a word for holding)
  let holding = null; // { by: index in found, verb }

  const spreadMotion = (anim) => {
    for (const j of list) {
      if (!found[j].animation && MOVERS.has(getConcept(found[j].id.split('~')[0])?.category)) found[j].animation = anim;
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
      id: hit.id, word: hit.word, color: pend.color, size: pend.size, ...(pend.count != null ? { countGiven: true } : {}),
      ...(pend.hair ? { hair: pend.hair } : {}),
      ...(pend.features ? { features: pend.features } : {}),
      at: tokAt,
      count: pend.count != null ? Math.max(1, Math.min(pend.count, MAX_COUNT)) : hit.plural ? 3 : 1,
      expression: pend.expression ?? hit.expression,
      animation: pend.animation ?? hit.animation,
      view: pend.view,
      ...extra,
    });
    pend = {};
    list.push(found.length - 1);
    if (hit.animation) spreadMotion(hit.animation);
    // In someone's hands: the first holdable thing after a word for holding
    const m = found[found.length - 1];
    if (/^people/.test(getConcept(m.id.split('~')[0])?.category ?? '')) lastPerson = found.length - 1;
    else if (holding && !canHold(m.id, true)) holding = null; // (only what comes right after: "flies over the city")
    else if (holding && canHold(m.id, holding.verb !== 'with' && holding.verb !== 'has' && !/^play/.test(holding.verb))) {
      const who = found[holding.by];
      m.heldBy = who.id;
      // ("two girls holding balloons": one each)
      if (hit.plural && !m.countGiven) {
        m.count = who.count;
        for (const j of holding.group) if (j !== holding.by) found.push({ ...m, heldBy: found[j].id, count: found[j].count });
      }
      holding = null;
    }
  };

  for (let i = 0; i < toks.length;) {
    const t = toks[i];
    const next = toks[i + 1];
    tokAt = i;

    const justNamed = lastConceptIndex === i - 1; // (someone named just before: "a boy with curly hair")
    if (['and', 'or', 'but', 'with', 'without', 'then'].includes(t)) {
      lastConceptIndex = -99;
    }
    if (HOLD_VERBS.has(t) && lastPerson >= 0) {
      // ("a boy and a girl holding balloons": each of them)
      const group = list.filter((j) => /^people/.test(getConcept(found[j].id.split('~')[0])?.category ?? ''));
      holding = { by: lastPerson, verb: t, group: group.includes(lastPerson) ? group : [lastPerson] };
    }
    // "She reads a book" with nobody named yet: a woman (he: a man) does it
    if ((t === 'she' || t === 'he') && lastPerson < 0 && !found.length && next && (!at(toks, i + 1) || HOLD_VERBS.has(next) || MOTION_WORDS[next])) {
      push({ id: t === 'she' ? 'woman' : 'man', word: t, plural: false });
      lastConceptIndex = i;
      i++;
      continue;
    }
    // ("waves at a dog", "flies over the city": nothing in the hands)
    else if (['then', 'while', 'when', 'but', ...NOT_HELD_AFTER].includes(t)) holding = null;
    // What the person just named wears, and their hair ("a girl in a purple dress")
    // ... and their face and hair ("with big eyes and curly red hair")
    const feat = lastPerson >= 0 && lastPerson === found.length - 1 && (justNamed || lookEnd === i - 1) ? featurePhrase(toks, i) : null;
    if (feat) {
      const who = found[lastPerson];
      who.features = { ...who.features, ...feat.features };
      if (feat.hair) who.hair = feat.hair;
      holding = null;
      lastConceptIndex = i + feat.len - 1;
      lookEnd = lastConceptIndex;
      i += feat.len;
      continue;
    }
    const looks = lastPerson >= 0 && lastPerson === found.length - 1 && justNamed
      ? lookPhrase(toks, i, (j) => j < toks.length && !!at(toks, j)) : null;
    if (looks) {
      const who = found[lastPerson];
      if (looks.color) who.color = looks.color;
      if (looks.hair) who.hair = looks.hair;
      holding = null;
      lastConceptIndex = i + looks.len - 1;
      lookEnd = lastConceptIndex;
      i += looks.len;
      continue;
    }
    // ... or said before them ("a bald man", "a freckled girl", "a curly-haired boy")
    if ((t === 'bald' || t === 'freckled' || (HAIR_STYLE_WORDS[t] && next === 'haired')) && toks[i + 1] && (at(toks, i + 1) || next === 'haired')) {
      pend.features = { ...pend.features, ...(t === 'bald' ? { hair: 'bald' } : t === 'freckled' ? { freckles: true } : { hair: HAIR_STYLE_WORDS[t] }) };
      i += next === 'haired' ? 2 : 1;
      continue;
    }
    // ... or said before them ("a blonde girl", "a red-haired boy")
    if ((HAIR_ONLY.has(t) && next && at(toks, i + 1)) || (HAIR_SHADES[t] && /^haired$/.test(next) && toks[i + 2])) {
      pend.hair = HAIR_SHADES[t];
      i += next === 'haired' ? 2 : 1;
      continue;
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

    const hasNextConcept = next && (SIZE_WORDS[next] || COLOR_WORDS[next] || EXPRESSION_WORDS[next] || at(toks, i + 1));
    let isModifierAdjective = (COLOR_WORDS[t] || EXPRESSION_WORDS[t] || MOTION_WORDS[t]) && hasNextConcept;
    // "black circle" / "white flag" name a library icon outright; "red apple" stays a recolored handmade apple.
    if (isModifierAdjective) {
      const whole = at(toks, i);
      const rest = at(toks, i + 1);
      if (whole && whole.len >= 2 && !whole.animation && rest && getConcept(rest.id)?.isLibrary) isModifierAdjective = false;
    }
    const isStopword = STOPWORDS.has(t);
    // A bare numeral is a count ("3 dogs"), never the keycap icon that also answers to "3".
    const isNumeral = /^\d+$/.test(t);

    // A group of people: the mix it stands for, as many as asked for
    const group = !isModifierAdjective && GROUP_WORDS[t];
    if (group) {
      const n = Math.max(1, Math.min(pend.count ?? group.length, MAX_COUNT));
      const tally = new Map();
      for (let k = 0; k < n; k++) tally.set(group[k % group.length], (tally.get(group[k % group.length]) ?? 0) + 1);
      const shared = { ...pend };
      for (const [id, count] of tally) {
        pend = { ...shared, count };
        push({ id, word: t, plural: count > 1 });
      }
      lastConceptIndex = i;
      i++;
      continue;
    }
    // "a cup of coffee", "a glass of milk", "a box of apples": what's in it, or else the container
    if (CONTAINERS.has(t) && next === 'of' && toks[i + 2]) {
      const inner = at(toks, i + 2);
      const innerSyn = !inner && SYNONYMS[toks[i + 2]]?.find((id) => getConcept(id));
      const outer = at(toks, i) ?? (SYNONYMS[t]?.find((id) => getConcept(id)) && { id: SYNONYMS[t].find((id) => getConcept(id)), len: 1 });
      const pick = /^(cup|mug|glass|bottle|can)s?$/.test(t) ? (inner ?? (innerSyn && { id: innerSyn, len: 1 }) ?? outer) : (outer ?? inner);
      if (pick) {
        push({ id: pick.id, word: t, plural: false });
        lastConceptIndex = i + 2;
        i += 2 + (inner?.len ?? 1);
        continue;
      }
    }
    // A word with no drawing of its own, drawn as the nearest that has one
    const synonym = !isModifierAdjective && SYNONYMS[t]?.find((id) => getConcept(id));
    if (synonym && !at(toks, i)) {
      push({ id: synonym, word: t, plural: /s$/.test(t) && !/ss$/.test(t) });
      lastConceptIndex = i;
      i++;
      continue;
    }
    // "a superhero flies", "she waves": after someone who can move, a motion word is what they
    // do, not the insect or the sea ("three flies", "the waves" stay things)
    const prev = toks[i - 1];
    // ("smiles and waves at the bird": a motion aimed at someone is a verb, not "the waves at the beach")
    const aimed = MOTION_WORDS[t] && i > 0 && found.length && ['at', 'to', 'goodbye', 'hello', 'back'].includes(next)
      && !['a', 'an', 'the', 'some', 'these', 'those', 'his', 'her', 'their', 'my', 'your', 'our', 'its', 'no', 'of'].includes(prev);
    const afterMover = aimed || ((MOTION_WORDS[t] || HOLD_VERBS.has(t) || RIDE_VERBS.has(t) || EXPRESSION_WORDS[t]) && i > 0 && !NOUN_LEADERS.has(prev) && !NUMBER_WORDS[prev] && !COLOR_WORDS[prev]
      && (SUBJECT_PRONOUNS.has(prev) || names?.has(prev)
        || (lastConceptIndex === i - 1 && found.length && MOVERS.has(getConcept(found[found.length - 1].id.split('~')[0])?.category))));

    let hit = (isModifierAdjective || isStopword || isNumeral || afterMover) ? null : at(toks, i);
    // "a woman cooks", "he guards": after someone, a person-word ending in s is what they do (not
    // more cooks)
    if (hit && hit.len === 1 && /[^s]s$/.test(t) && i > 0 && !NOUN_LEADERS.has(prev) && !NUMBER_WORDS[prev]
      && /^people/.test(getConcept(hit.id)?.category ?? '')
      && (SUBJECT_PRONOUNS.has(prev) || names?.has(prev) || (lastConceptIndex === i - 1 && found.length && MOVERS.has(getConcept(found[found.length - 1].id.split('~')[0])?.category)))) {
      hit = null;
      i++;
      continue;
    }
    if (hit) {
      const listed = [...list, found.length]; // (push spreads a motion over the list and empties it)
      push(hit);
      // ("woman holds" is read as one: the woman, holding what follows)
      const verb = toks.slice(i + 1, i + hit.len).find((w) => HOLD_VERBS.has(w));
      if (verb && lastPerson === found.length - 1) {
        const group = listed.filter((j) => found[j] && /^people/.test(getConcept(found[j].id.split('~')[0])?.category ?? ''));
        holding = { by: lastPerson, verb, group: group.includes(lastPerson) ? group : [lastPerson] };
      }
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
      // ("a fox is lost and scared in the woods": the fox; "the boy is happy under a tree": the boy)
      const lastMover = [...found].reverse().find((m) => /^(people|animals|wildlife)/.test(getConcept(m.id.split('~')[0])?.category ?? ''));
      if (hasNextConcept) {
        pend.expression = expr;
      } else if (found.length > 0 && i === lastConceptIndex + 1) {
        found[found.length - 1].expression = expr;
      } else if (lastMover && !lastMover.expression) {
        lastMover.expression = expr;
      } else {
        pend.expression = expr;
      }
    } else if (MOTION_WORDS[t] || (DIRECTIONAL_VERBS.has(t) && motionTail(toks, i + 1))) {
      const tail = motionTail(toks, i + 1);
      const anim = tail ? tail.anim : MOTION_WORDS[t];
      const at = i;
      if (tail) i += tail.len;
      if (anim === 'hold' && holding) {
        // ("three kids holding flags": the kids hold, the flags don't)
        for (const j of holding.group) found[j].animation ??= 'hold';
      } else if (hasNextConcept) {
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
  relations(toks, found);
  for (const m of found) { delete m.countGiven; delete m.at; }
  return { matches: mergeMatches(found), unknown: [...new Set(unknown)], excluded: [...new Set(excluded)], tokens: toks };
}
