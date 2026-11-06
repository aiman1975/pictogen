// The story reader: a story written the way people write (one part per line, or just sentences)
// read as a whole, so its scenes belong together. It keeps a cast (who is who: "a little girl
// called Mia", "Rex the dog", "she", "the puppy", "they"), carries where and when it happens from
// scene to scene ("near a big forest", "at night", "it started to rain"), and turns story verbs
// into what the engine draws ("found a puppy" -> looks at it, "gave him some milk" -> holds the milk
// out to him, "fell asleep" -> sleeps). Each scene gets a prompt for the engine and keeps the
// writer's own words as its caption. English only; no model, just rules, so it reads typical
// children's stories, not every sentence there is.
//
//   readStory(text, { individuals }) -> { scenes: [{ prompt, caption }], individuals, cast }
//     individuals: the studio's named characters ({ key: 'pgc1', base }), already in the text as
//     their keys; characters the story names itself get keys of their own (pgc21...) and a look

import { parseText } from './text/matcher.js';
import { getConcept } from './concepts/index.js';
import { COLOR_WORDS } from './core/color.js';

const FEMALE = new Set(['girl', 'woman', 'old_woman', 'princess', 'queen', 'witch', 'fairy', 'woman_fairy', 'woman_mage', 'policewoman',
  'woman_doctor', 'nurse', 'teacher', 'woman_superhero']);
const MALE = new Set(['boy', 'man', 'old_man', 'prince', 'king', 'man_teacher', 'man_superhero', 'police_officer', 'firefighter', 'doctor',
  'cook', 'farmer', 'astronaut', 'pirate', 'wizard', 'man_mage']);
const BEINGS = new Set(['alien', 'alien_monster', 'ghost', 'snowman']);
// Living things that are scenery, not characters ("the coral had lost its colours")
const SCENERY = new Set(['coral', 'sponge', 'seaweed', 'shell', 'spiral_shell', 'herb', 'potted_plant', 'mushroom']);
const isCreature = (id) => !SCENERY.has(id) && (/^(people|animals|wildlife)/.test(getConcept(id)?.category ?? '') || BEINGS.has(id));
const isAnimal = (id) => /^(animals|wildlife)/.test(getConcept(id)?.category ?? '');
// (story friends and robots are "he", "she" or "it" as the story says, like animals)
const ANY = new Set(['owl_teacher', 'baby_dragon', 'idea_buddy', 'robot', 'moon_friend', 'star_friend', 'sun_friend', 'cloud_friend']);
const genderOf = (id) => (FEMALE.has(id) ? 'f' : MALE.has(id) ? 'm' : isAnimal(id) || ANY.has(id) ? 'a' : 'n');

// First names, to tell a girl from a boy when the story only says the name
const GIRL_NAMES = new Set(`mia emma olivia ava sophia lily ella grace chloe ruby isla amelia emily lucy anna sara sarah zoe hannah
  maya nora leah julia eva alice rosie rose daisy molly poppy holly evie freya ivy luna stella bella lola nina tina amy kate katie
  jessica jenny laura lisa maria sofia aisha fatima layla hana yasmin noor sana lea marie clara heidi elsa anya mira lena sophie
  hanna helen ellen nadia linda susan karen julie anne jane mary rachel rebecca natalie nicole sandra petra greta ines lara`.split(/\s+/));
const BOY_NAMES = new Set(`tom max sam leo jack noah liam oliver ben finn harry charlie george oscar alfie theo leon luca adam
  james john jake ryan dylan ethan lucas henry arthur archie freddie toby joe josh daniel david peter paul mark luke tim timmy
  ali omar yusuf hamza adam karim samir rami felix hugo otto nils jonas paul ivan alex chris michael steve robert frank
  thomas andrew simon martin kevin brian eric mike nick matt anton jan lukas stefan markus
  emil elias luis maximilian karl fritz hans heinz klaus ole moritz oskar mats jonathan julian niklas tobias florian
  sebastian johannes matthias wolfgang jürgen uwe dieter bernd michi kai till lars sven jens`.split(/\s+/));
for (const n of `mila emilia lina leni frieda ida marlene johanna matilda mathilda ute helga liesel anni lotta lotte merle pia nele jule
  luisa paula charlotte katharina susanne sabine monika ursula gisela ingrid birgit heike anja tanja jana svenja finja carla
  amelie annika franziska lisa-marie mariechen gretel`.split(/\s+/)) GIRL_NAMES.add(n);
/** True for a first name the reader knows (a girl's or a boy's) */
export const isFirstName = (word) => GIRL_NAMES.has(String(word).toLowerCase()) || BOY_NAMES.has(String(word).toLowerCase());
export const isGirlName = (word) => GIRL_NAMES.has(String(word).toLowerCase());

// The moon, a star, the sun or a cloud that talks or does things is a character: a sky friend with a
// face, arms and legs (src/concepts/alphabet.js); one that only shines stays the sky's
const SKY = ['moon', 'star', 'sun', 'cloud'];
const ACTS = 'says|said|asks|asked|shouts|shouted|cries|cried|calls|called|whispers|whispered|replies|replied|smiles|smiled|laughs|laughed|looks|looked|sees|saw|helps|helped|waves|waved|jumps|jumped|hops|hopped|sits|sat|sleeps|slept|lives|lived|talks|talked|thinks|thought|sends|sent|listens|listened|hears|heard|notices|noticed|finds|found|is sad|was sad|is happy|was happy|wakes|woke|dances|danced|walks|walked|runs|ran|hugs|hugged|misses|missed|is missing|was missing|feels|felt';
function skyFriends(text) {
  const low = text.toLowerCase();
  return new Set(SKY.filter((w) => new RegExp(`\\b(?<!shooting )${w}\\s+(?:${ACTS})\\b|\\b(?:${ACTS})\\s+(?:the\\s+)?(?:little\\s+|small\\s+|tiny\\s+)?${w}\\b|\\b(?:a|the)\\s+(?:little|small|tiny|lost|sad|kind|friendly)\\s+${w}\\b|\\b${w}\\s+(?:and|with)\\s+(?:the\\s+)?[a-z]+\\s+(?:${ACTS})\\b`).test(low)));
}
let friendly = new Set(); // (the sky friends of the story being read)

/**
 * A story's title, when its first line is one: short, with no full stop, more lines after it - and
 * a line under it that says what the story is ("A short bedtime story for ages 3-6"). The story
 * without them.
 */
export function storyTitle(text) {
  const lines = String(text ?? '').split(/\r?\n/);
  const first = lines.findIndex((l) => l.trim());
  const rest = lines.slice(first + 1).filter((l) => l.trim());
  const t = (lines[first] ?? '').trim();
  if (first < 0 || rest.length < 2 || /[.!?…:;,"“”„»]$/.test(t) || t.split(/\s+/).length > 12 || /^(#|-|\d+[.)])/.test(t)) return { title: null, subtitle: null, text };
  let k = first + 1, subtitle = null;
  const next = (lines[k] ?? '').trim();
  if (next && /\b(geschichte|story|stories|tale|märchen|fabel|gutenacht|bedtime|für kinder|for (?:kids|children)|ages?\b|jahren|years)\b/i.test(next) && next.split(/\s+/).length <= 16) { subtitle = next; k++; }
  return { title: t.replace(/\s*[\p{Extended_Pictographic}\uFE0F]+\s*$/u, '').trim(), subtitle, text: lines.slice(k).join('\n') };
}
// Titles that say what someone is: "Grandma Rose", "Mr Brown", "King Leo"
const TITLES = {
  mr: 'man', mrs: 'woman', ms: 'woman', miss: 'woman', dr: 'doctor', doctor: 'doctor', grandma: 'old_woman', granny: 'old_woman',
  nana: 'old_woman', grandpa: 'old_man', grandad: 'old_man', uncle: 'man', aunt: 'woman', auntie: 'woman', king: 'king', queen: 'queen',
  prince: 'prince', princess: 'princess', captain: 'pirate', farmer: 'farmer', teacher: 'teacher', professor: 'man',
};
// A titled name, said by whom ("says Dr Lee", "said Grandma Rose")
const TITLED = `(?:${Object.keys(TITLES).map((t) => t[0].toUpperCase() + t.slice(1)).join('|')})\\s[A-Z][a-z]+`;
// Words that start sentences and are not names ("Suddenly", "Once")
const NOT_NAMES = new Set(`once one two three the a an and but then so suddenly finally later soon after before when while every
  next that this there these those at in on by with without into from to of for meanwhile today tomorrow yesterday tonight
  first second third fourth fifth sixth finally firstly secondly thirdly lastly remember note step tip
  last afterwards everyone everybody nobody somebody someone something nothing all both each it its they he she we i you
  oh wow yes no hello hi goodbye bye look come go let lets please thank thanks good great well now here what who why how where
  together outside inside upstairs downstairs far near long little big happy sad deep high under over behind across through
  along around beside inside poor dear sweet brave tiny huge old young her his their our my your its him them us me today
  monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october
  november december spring summer autumn winter christmas easter weekend night day morning evening afternoon soon nothing
  every sometimes because`.split(/\s+/));
// Story verbs in the past, in the present the engine reads
const PRESENT = {
  ran: 'runs', sat: 'sits', rode: 'rides', flew: 'flies', swam: 'swims', ate: 'eats', drank: 'drinks', held: 'holds', threw: 'throws',
  caught: 'catches', sang: 'sings', came: 'comes', went: 'goes', saw: 'sees', found: 'finds', gave: 'gives', took: 'takes', got: 'gets',
  slept: 'sleeps', woke: 'wakes', met: 'meets', brought: 'brings', read: 'reads', made: 'makes', wore: 'wears', began: 'begins',
  was: 'is', were: 'are', had: 'has', fell: 'falls', felt: 'feels', became: 'becomes', thought: 'thinks', said: 'says', told: 'tells',
  stood: 'stands', climbed: 'climbs', jumped: 'jumps', walked: 'walks', waved: 'waves', danced: 'dances', played: 'plays',
  hugged: 'hugs', cuddled: 'cuddles', laughed: 'laughs', smiled: 'smiles', cried: 'cries', looked: 'looks', watched: 'watches',
  wagged: 'wags', barked: 'barks', shouted: 'shouts', whispered: 'whispers', asked: 'asks', called: 'calls', lived: 'lives',
  carried: 'carries', picked: 'picks', opened: 'opens', helped: 'helps', kissed: 'kisses', painted: 'paints', cooked: 'cooks',
  appeared: 'appears', pointed: 'points', cheered: 'cheer', cleaned: 'clean', showed: 'shows', dived: 'dives', dove: 'dives',
  glowed: 'glows', explained: 'explains', learned: 'learns', learnt: 'learns', listened: 'listens', waited: 'waits',
  clapped: 'claps', sailed: 'sails', floated: 'floats', grew: 'grows', built: 'builds', wrote: 'writes', drew: 'draws',
};
// Things worn ("put on their diving masks and flippers"): worn by those it says until the day or the
// night changes, or they take them off (said in each scene as "with ...", src/text/matcher.js)
const WORN = [[/\bdiving masks?\b|\bmasks?\b|\bsnorkels?\b/, 'a diving mask'], [/\bflippers\b|\bfins\b/, 'flippers'], [/\b(?:air |oxygen )?tanks?\b/, 'an air tank'],
  [/\bhelmets?\b|\bhard hats?\b/, 'a helmet'], [/\bcapes?\b|\bcloaks?\b/, 'a cape'], [/\bcrowns?\b/, 'a crown'], [/\bgoggles\b/, 'goggles'],
  [/\bbackpacks?\b|\brucksacks?\b/, 'a backpack'], [/\bboots\b|\bwellies\b/, 'boots'], [/\bscarf\b|\bscarves\b/, 'a scarf'],
  [/\bheadphones\b/, 'headphones'], [/\bwings\b/, 'wings'], [/\bcaps?\b/, 'a cap']];
const SAY_VERBS = 'said|says|asked|asks|shouted|shouts|cried|called|calls|whispered|whispers|replied|replies|barked|barks|yelled|answered|sang|laughed|giggled|exclaimed';

// Where and when: carried from scene to scene until the story says otherwise
// Coming in to whoever is there
const ENTERS = /\b(?:walks?|walked|comes?|came|runs?|ran|rushes|rushed|hurries|hurried|bursts?|burst|steps?|stepped|pops?|popped)\s+in\b|\b(?:enters?|entered|arrives?|arrived)\b/i;
const PLACES = [
  // (one of "your places", made in the studio: its key, "pgp1")
  ['yours', /\b(pgp\d{1,2})\b/, (w) => `in ${w}`],
  ['space', /\b(outer space|in space|into space|galaxy|on the moon)\b/, 'in space'],
  ['underwater', /\b(underwater|under the (sea|ocean|water)|seabed|sea bed|coral reef|ocean floor)\b/, 'under the sea'],
  ['desert', /\b(desert|dunes|sahara|oasis)\b/, 'in the desert'],
  ['mountains', /\b(mountains?|alps|peaks?|valley)\b/, 'in the mountains'],
  ['castle', /\b((?<!sand )castle|palace|kingdom)\b/, 'at the castle'],
  ['farm', /\b(farm|farmyard|barn|ranch)\b/, 'on the farm'],
  ['jungle', /\b(jungle|rainforest)\b/, 'in the jungle'],
  ['forest', /\b(forest|woods)\b/, 'in the forest'],
  ['park', /\b(park|playground)\b/, 'in the park'],
  ['garden', /\b(garden|yard|backyard)\b/, 'in the garden'],
  ['beach', /\b(beach|seaside|shore|sand)\b/, 'on the beach'],
  ['boat', /\b(boat|ship|sailboat|canoe)\b/, 'on the sea'],
  // (a sea turtle, a sea star, a seashell: not a place)
  ['sea', /\b(sea|ocean|lake|river|pond)\b(?!\s*(?:turtles?|horses?|stars?|shells?|gulls?|lions?|weeds?|creatures?|animals?)\b)/, (w) => `by the ${w}`],
  ['city', /\b(city|town|street)\b/, 'in the city'],
  ['classroom', /\b(school|classroom|training room|meeting room|lecture hall|whiteboard)\b/, 'in the classroom'],
  ['office', /\b(office|workplace|desk|at work)\b/, 'in the office'],
  ['kitchen', /\bkitchen\b/, 'in the kitchen'],
  ['bedroom', /\b(bedroom|bed)\b/, 'in the bedroom'],
  ['home', /(?<!\bway )\b(home|house|living room|inside|indoors)\b/, 'at home'],
  // (up in the sky: where the moon lives, flying through the night, reaching the sky)
  ['sky', /\b(sky|skies|heaven|above the clouds|in the clouds)\b|\bfl(?:y|ies|ew|ying)\s+(?:up\s+)?(?:through|across|into|among)\s+(?:the\s+)?(?:night|air|clouds|stars|dark)\b/, 'up in the sky'],
];
// (the ground: under a tree, by the houses - not up in the sky any more)
const ON_GROUND = /\b(trees?|flowers?|grass|ground|meadow|field|houses?|garden|path|road|bench|rock)\b/;
// (what someone looks at, over or behind is not where they are: "looked over the mountains")
const LOOKED_AT = /\b(?:looks?|looked|looking|sees?|saw|watch(?:es|ed)?|peeks?|peeked|gazes?|gazed|searches|searched)\s+(?:over|behind|at|across|towards?|into|through|up at|down at|out over|out at|under|in)?\s*[^.,;!?⟦]*/g;
// (someone missing or lost is not in the picture: "a little star was missing", "lost her puppy")
const MISSING = /\b(?:(?:the|a|an|my|his|her|their|our)\s+)?(?:(?:little|small|tiny|lost|own)\s+)*([a-z]+)\s+(?:is|was|were|are|went|goes|has gone|had gone)\s+(?:missing|lost|gone|away)\b|\b(?:lost|loses|misses|missed|cannot find|can't find|could not find|couldn't find|looks for|looked for|searches for|searched for)\s+(?:the|a|an|my|his|her|their|our)?\s*(?:(?:little|small|tiny)\s+)*([a-z]+)\b/g;
const TIMES = [
  ['night', /\b(night|nighttime|midnight|bedtime|dark|moon|stars)\b|\b(?:one|two|three|four|1|2|3|4)\s+(?:in the morning|a\.?m\b)/],
  ['evening', /\b(evening|sunset|dusk)\b/],
  ['day', /\b(morning|sunrise|dawn|daytime|afternoon|next day|sunny|sun came out|woke up|wakes up)\b/],
];
const WEATHER = [
  ['rain', /\b(rain|raining|rained|rainy|storm|stormy)\b/],
  ['snow', /\b(snow|snowing|snowed|snowy|winter|frozen|icy|snowman)\b/],
  ['clear', /\b(stopped raining|stopped snowing|sun came out|rainbow)\b/],
];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36).slice(0, 8);
const kindOf = (word) => {
  if (friendly.has(word)) return `${word}_friend`;
  const m = parseText(word).matches.find((x) => isCreature(x.id));
  return m ? m.id : null;
};

/** Quoted words kept aside (⟦0⟧, ⟦1⟧...), so sentences are not split inside them */
function protect(text) {
  const quotes = [];
  // (German quotes too: „Hallo!“)
  const out = text.replace(/["“„]([^"“”„]*)["”“]/g, (_, q) => `⟦${quotes.push(q) - 1}⟧`);
  return { text: out, quotes };
}
const restore = (s, quotes) => s.replace(/⟦(\d+)⟧/g, (_, i) => `“${quotes[+i]}”`);

/** The story's sentences (quotes kept whole) */
// (after a quote, a new sentence starts - unless it says who said it: "“We did it!” Mia said.")
const SAID_AFTER = new RegExp(`(?<=[.!?…])\\s+(?=[A-Z⟦])|(?<=⟧)\\s+(?=[A-Z])(?!(?:[A-Z][a-z]+|He|She|They|The [a-z]+)\\s+(?:${SAY_VERBS})\\b)`);
function sentences(text) {
  return text.split(SAID_AFTER).map((s) => s.trim()).filter(Boolean);
}

/** The scenes: one per line when the story has lines (long lines split in two), else one per sentence */
function splitScenes(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  const words = (s) => s.split(/\s+/).length;
  for (const line of lines.length > 1 ? lines : [text.trim()]) {
    let parts = sentences(line);
    // (a very short sentence goes with the one before it: "Woof!", "Oh no!")
    parts = parts.reduce((acc, s) => {
      if (acc.length && ((words(s) <= 2 && !/⟦/.test(s)) || /^⟦\d+⟧[.!?]*$/.test(s))) acc[acc.length - 1] += ` ${s}`;
      else acc.push(s);
      return acc;
    }, []);
    if (lines.length > 1) {
      for (let i = 0; i < parts.length; i += 2) out.push(parts.slice(i, i + 2).join(' '));
    } else out.push(...parts);
  }
  return out.filter((s) => !/^(the end|ende|das ende)[.!]*$/i.test(s.trim()));
}

/**
 * Reads a story. Returns its scenes ({ prompt: for the engine, caption: the writer's words }), the
 * characters it names itself (as individuals with keys and looks) and the whole cast.
 */
export function readStory(text, { individuals = [], adults = false, translate = null } = {}) {
  // (a title line and what kind of story it is: not scenes)
  const titled = storyTitle(text);
  text = titled.text;
  // (a title's full stop is no sentence's end: "Dr. Lee" is "Dr Lee")
  const { text: safe, quotes } = protect(String(text ?? '').replace(/[’]/g, "'").replace(/\b(Dr|Mr|Mrs|Ms|Prof|St)\.(?=\s+[A-Z])/g, '$1'));
  const cast = [];
  let tick = 0, nextKey = 21;
  const mention = (m) => { m.last = ++tick; return m; };
  // The studio's own characters, already keys in the text
  for (const ind of individuals) if (ind?.key && getConcept(ind.base)) cast.push({ name: ind.key, key: ind.key, id: ind.base, gender: genderOf(ind.base), saved: true, last: 0 });
  // (a titled name and the name alone are one person: "Grandpa Leo" is "Leo", "her grandpa Leo")
  const named = (name) => {
    const n = name.toLowerCase(), last = n.split(' ').pop();
    return cast.find((m) => m.name && m.name.toLowerCase() === n)
      ?? cast.find((m) => m.name && m.titled && m.name.toLowerCase().split(' ').pop() === n)
      ?? (n.includes(' ') ? cast.find((m) => m.name && !m.titled && m.name.toLowerCase() === last) : null);
  };
  const addNamed = (name, id, color, noun = null) => {
    const had = named(name);
    if (had) return had;
    // ("Mr Brown was a teacher": a man teacher)
    if (id === 'teacher' && /^(mr|grandpa|grandad|uncle|king|prince|professor)\b/i.test(name)) id = 'man_teacher';
    // (a girl's name is "she" whatever she is: Zoe the astronaut)
    const first = name.split(' ').pop().toLowerCase();
    const gender = /^people/.test(getConcept(id)?.category ?? '') && GIRL_NAMES.has(first) ? 'f'
      : /^people/.test(getConcept(id)?.category ?? '') && BOY_NAMES.has(first) ? 'm' : genderOf(id);
    const m = { name, noun, key: `pgc${nextKey++}`, id, gender, last: 0, look: { seed: hash(name.toLowerCase()) } };
    if (color && /^#/.test(COLOR_WORDS[color] ?? '')) m.look.main = COLOR_WORDS[color];
    cast.push(m);
    return m;
  };
  // A name said with nothing about who it is: a girl's or a boy's name, else the first "she" or "he" after it
  const guessKind = (name, from) => {
    const n = name.toLowerCase();
    // (in an explainer, the news, a how-to: grown-ups)
    const [f, m] = adults ? ['woman', 'man'] : ['girl', 'boy'];
    if (GIRL_NAMES.has(n)) return f;
    if (BOY_NAMES.has(n)) return m;
    const after = said.slice(from).match(/\b(she|her|he|him|his)\b/i)?.[1]?.toLowerCase();
    return after && ['she', 'her'].includes(after) ? f : m;
  };

  let place = null, time = null, weather = null, board = null;
  let lastScene = [], prevScene = []; // who was in the scenes before ("they")
  const scenes = [];
  let offset = 0;
  let opening = ''; // ("It was a cold winter day." before anyone is there: said with the first scene that has someone)
  const all = splitScenes(safe);
  // (a story in another language: each scene read in the engine's English words, its caption as
  // written - src/lang-de.js germanStory)
  const read = translate ? all.map((raw) => translate(raw)) : all;
  const said = translate ? read.join('\n') : safe;
  friendly = skyFriends(restore(said, quotes).replace(/“[^”]*”/g, ' '));
  for (const [n, written] of all.entries()) {
    const raw = read[n];
    offset = said.indexOf(raw, offset);
    const caption = `${opening}${restore(written, quotes)}`;
    const inScene = new Set();
    const parts = sentences(raw).map((s) => readSentence(s).replace(/[\s.,;:!?]+$/, ''));
    let prompt = parts.filter(Boolean).join(', then ');
    // (riding someone, then flying off together: one picture, riding - "the star rides the owl")
    prompt = prompt.replace(/\b((pgc\d+|the [a-z]+) rides (pgc\d+|the [a-z]+)), then (?:\2 and \3|\3 and \2|they) fl(?:y|ies|ew)\b[^,]*/, '$1');
    // (whoever is just there is said with the first thing that happens, so they are there from the
    // start, not popping up at the end: "the email asks for his password and Sam, then ...")
    const withThere = (who) => {
      const at = prompt.indexOf(', then ');
      return at < 0 ? `${prompt} and ${who}` : `${prompt.slice(0, at)} and ${who}${prompt.slice(at)}`;
    };
    // Someone speaking: whoever was with them in the scene before is still there, listening
    if (/⟦\d+⟧/.test(raw) && inScene.size) {
      const listeners = lastScene.filter((m) => !inScene.has(m) && !BEINGS.has(m.id));
      if (listeners.length && listeners.length + inScene.size <= 4) {
        prompt = withThere(listeners.map((m) => m.key ?? `the ${m.noun}`).join(' and '));
        listeners.forEach((m) => inScene.add(m));
      }
    }
    // Someone coming in ("Mia walks in with a cake", "Tom arrived"): whoever was there is still there,
    // unless the sentence takes them somewhere else
    if (ENTERS.test(raw) && inScene.size && !PLACES.some(([, re]) => re.test(raw.toLowerCase()))) {
      const stay = lastScene.filter((m) => !inScene.has(m) && !BEINGS.has(m.id));
      if (stay.length && stay.length + inScene.size <= 4) {
        prompt = withThere(stay.map((m) => m.key ?? `the ${m.noun}`).join(' and '));
        stay.forEach((m) => inScene.add(m));
      }
    }
    // A scene where nobody is named ("It started to rain") still has whoever was there
    if (!inScene.size && lastScene.length) {
      const there = lastScene.map((m) => m.key ?? `the ${m.noun}`).join(' and ');
      prompt = prompt.trim() ? withThere(there) : there;
      lastScene.forEach((m) => inScene.add(m));
    }
    // Where and when, carried on: the scene's own words first
    const low = raw.toLowerCase();
    // (and what is shone on, flown over, gone past: "shines over the small houses" is not at home)
    const where = low.replace(LOOKED_AT, ' ').replace(/\b(?:over|above|past|across|beyond)\s+(?:the\s+|a\s+|some\s+)?(?:[a-z]+\s+){0,2}?(?:houses?|homes?|mountains?|hills?|forest|woods|city|town|villages?|sea|lake|fields?|trees?)\b/g, ' ');
    const p = PLACES.find(([, re]) => re.test(where));
    if (p) { place = [...p]; place.word = where.match(p[1])[1] ?? 'sky'; }
    // (down from the sky, under a tree: the ground again)
    else if (place?.[0] === 'sky' && ON_GROUND.test(low.replace(LOOKED_AT, ' '))) place = null;
    const t = TIMES.find(([, re]) => re.test(low));
    const w = WEATHER.find(([, re]) => re.test(low));
    // (a new day or night: the weather clears unless it is said again; things worn come off)
    const newTime = t && (t[0] !== time || /\b(next|following) (day|morning|night)|\bthat night\b|\bon (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(low));
    if (newTime) { if (!w) weather = null; for (const m of cast) delete m.wearing; }
    if (t) time = t[0];
    if (w) weather = w[0] === 'clear' ? null : w[0];
    // Things put on ("put on their diving masks and flippers", "wore a cape"): worn from now on
    const dressing = low.match(/\b(?:put on|puts on|putting on|wore|wears|wearing|dressed in)\b([^.!?⟦]*)/);
    if (dressing) {
      const worn = WORN.filter(([re]) => re.test(dressing[1])).map(([, phrase]) => phrase);
      for (const m of inScene) if (m.key && worn.length && /^people/.test(getConcept(m.id)?.category ?? '')) m.wearing = [...new Set([...(m.wearing ?? []), ...worn])];
    }
    if (/\b(?:took off|takes off|take off)\b/.test(low)) for (const m of inScene) delete m.wearing;
    // (said in the scene, after each one's first mention)
    for (const m of inScene) {
      if (!m.wearing?.length || !m.key) continue;
      const list = m.wearing.length > 1 ? `${m.wearing.slice(0, -1).join(', ')} and ${m.wearing.at(-1)}` : m.wearing[0];
      prompt = prompt.replace(new RegExp(`\\b${m.key}\\b(?! with)`), `${m.key} with ${list}`);
    }
    if (place && (place[0] === 'sky' ? !/\bup in the sky\b/.test(prompt) : !place[1].test(prompt.toLowerCase()))) prompt += ` ${typeof place[2] === 'function' ? place[2](place.word) : place[2]}`;
    // (words on the classroom's board stay there while the story stays in the classroom)
    const boardSays = raw.match(/\b(?:chalk|black|white)?board\b[^⟦.!?]{0,30}(⟦\d+⟧)/i) ?? raw.match(/\bwr(?:ites|ote|ite)\b[^⟦.!?]{0,20}(⟦\d+⟧)[^⟦.!?]{0,30}\bboard\b/i);
    if (boardSays) board = boardSays[1];
    else if (place?.[0] !== 'classroom') board = null;
    else if (board && !/\bboard\b/.test(prompt)) prompt += ` and the board says ${board}`;
    if (time === 'night' && !/\bnight\b/.test(prompt)) prompt += ' at night';
    if (time === 'evening' && !/\b(evening|sunset)\b/.test(prompt)) prompt += ' at sunset';
    if (weather && !new RegExp(`\\b${weather}\\b`).test(prompt)) prompt += ` in the ${weather}`;
    // (letters and numbers acting - "A red number 7 says...": a scene, not an opening line)
    const lettersAct = parseText(prompt).matches.some((m) => /^alphabet/.test(getConcept(m.id)?.category ?? ''));
    if (!inScene.size && !lastScene.length && n < all.length - 1 && !lettersAct) { opening = `${caption} `; continue; }
    opening = '';
    // What the story says a named character looks like ("Mia, a girl with curly red hair") is their
    // look from then on, in every scene
    const keyed = new Map(cast.filter((m) => m.key).map((m) => [m.key, `${m.id}~${m.key}`]));
    for (const mt of parseText(prompt, { names: keyed }).matches) {
      const member = cast.find((m) => m.key && mt.id === `${m.id}~${m.key}` && !m.saved);
      if (!member) continue;
      member.look ??= { seed: hash(member.name.toLowerCase()) };
      // (what they wear comes and goes with the scenes: not part of their look)
      const { gear, ...own } = mt.features ?? {};
      if (Object.keys(own).length) member.look.features = { ...member.look.features, ...own };
      if (mt.hair) member.look.hair = mt.hair;
      if (mt.color && COLOR_WORDS[mt.color]) member.look.main = COLOR_WORDS[mt.color];
    }
    scenes.push({ prompt: restore(prompt.replace(/\s+/g, ' ').replace(/\s+([,.!?])/g, '$1').trim(), quotes), caption });
    prevScene = lastScene;
    lastScene = [...inScene];

    // One sentence, read for the engine
    function readSentence(sentence) {
      let s = ` ${sentence} `;
      // Speech: "“Hello!” said Mia." / "Mia said, “Hello!”" -> Mia says “Hello!”
      s = s.replace(new RegExp(`(⟦\\d+⟧)[,]?\\s+(?:${SAY_VERBS})\\s+((?:the|a|an)\\s+(?:letter|number)\\s+[A-Za-z0-9]\\b|(?:the|a|an|her|his)\\s+[a-z]+|${TITLED}|[A-Z][a-z]+|he|she|they)\\b[.!]?`, 'g'), ' $2 says $1 ');
      // ("at work": in the office)
      s = s.replace(/\bat work\b/gi, 'in the office');
      s = s.replace(new RegExp(`\\b(${SAY_VERBS})\\s*[,:]?\\s*(⟦\\d+⟧)`, 'g'), 'says $2');
      s = s.replace(new RegExp(`(⟦\\d+⟧)[,]?\\s+([A-Z][a-z]+|[Hh]e|[Ss]he|[Tt]hey|the [a-z]+)\\s+(?:${SAY_VERBS})\\b[.!]?`, 'g'), ' $2 says $1 ');
      // (putting things on is said as "with ..." on whoever wears them: the words go)
      s = s.replace(/\b(?:put|puts|putting)\s+on\s+(?:(?:their|his|her|the|some)\s+)?[a-z ,]*?(?=[.!?,;⟦]|\s(?:and then|then)\b|\s*$)/gi, ' ');
      // ("Lena from the IT team", "Tom from accounting": just them)
      s = s.replace(/\b([A-Z][a-z]+)\s+from\s+(?:the\s+)?(?:(?:[A-Za-z]+\s+){0,2}(?:team|department|company)|IT|HR|support|accounting|sales|marketing)\b/g, '$1');
      // ("the whole class", "the class": the children)
      s = s.replace(/\b(?:the\s+)?(?:whole\s+)?class\b(?!room)/gi, 'the children');
      // Introductions: "a little girl called Mia", "Rex, a brown puppy,", "Rex the dog", "Grandma Rose", "his name was Rex"
      s = s.replace(/\b(?:[Aa]n?|[Tt]he)\s+((?:[a-z]+\s+){0,3}?)([a-z]+)\s+(?:called|named)\s+([A-Z][a-z]+|pgc\d+)/g, (all, adj, word, name) => {
        const id = kindOf(word) ?? kindOf(adj.trim().split(/\s+/).pop() || '');
        if (!id) return all;
        const color = adj.split(/\s+/).find((a) => COLOR_WORDS[a]);
        addNamed(name, id, color, word);
        return name;
      });
      s = s.replace(/\b([A-Z][a-z]+|pgc\d+),\s+(?:a|an|the)\s+((?:[a-z]+\s+){0,3}?)([a-z]+)\s*,?/g, (all, name, adj, word) => {
        const id = !NOT_NAMES.has(name.toLowerCase()) && kindOf(word);
        if (!id) return all;
        addNamed(name, id, adj.split(/\s+/).find((a) => COLOR_WORDS[a]), word);
        return `${name} `;
      });
      // "Zoe was an astronaut", "Mrs Brown was a kind teacher": what they are
      s = s.replace(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?) (?:is|was) (?:a|an) ((?:[a-z]+ ){0,3}[a-z]+)\b/g, (all, name, words) => {
        if (NOT_NAMES.has(name.split(' ')[0].toLowerCase())) return all;
        // (the last word that says what someone is: "a kind teacher" -> a teacher)
        const list = words.split(' ');
        const at = list.map((w) => kindOf(w)).lastIndexOf(list.map((w) => kindOf(w)).filter(Boolean).pop());
        const id = at >= 0 ? kindOf(list[at]) : null;
        if (!id) return all;
        const had = named(name);
        // (a job or a costume keeps who they are: Zoe the astronaut is still "she")
        if (had) { had.id = id; if (had.gender === 'n' || genderOf(id) === 'f' || genderOf(id) === 'a') had.gender = genderOf(id) === 'n' ? had.gender : genderOf(id); } else addNamed(name, id, null, list[at]);
        return `${name.replace(' ', '_')} is ${list.slice(0, at).join(' ')} ${list.slice(at + 1).join(' ')}`;
      });
      // "their dog Max", "his sister Ella", "a puppy Rex"
      s = s.replace(/\b(?:[Aa]n?|[Tt]he|[Mm]y|[Hh]is|[Hh]er|[Tt]heir|[Oo]ur|[Yy]our)\s+((?:[a-z]+\s+){0,2}?)([a-z]+)\s+([A-Z][a-z]+|pgc\d+)\b/g, (all, adj, word, name) => {
        const id = !NOT_NAMES.has(name.toLowerCase()) && kindOf(word);
        if (!id) return all;
        addNamed(name, id, adj.split(/\s+/).find((a) => COLOR_WORDS[a]), word);
        return name;
      });
      s = s.replace(/\b([A-Z][a-z]+|pgc\d+)\s+the\s+([a-z]+)\b/g, (all, name, word) => {
        const id = !NOT_NAMES.has(name.toLowerCase()) && kindOf(word);
        if (!id) return all;
        addNamed(name, id, null, word);
        return name;
      });
      s = s.replace(/\b(Mr|Mrs|Ms|Miss|Dr|Doctor|Grandma|Granny|Nana|Grandpa|Grandad|Uncle|Aunt|Auntie|King|Queen|Prince|Princess|Captain|Farmer|Teacher|Professor)\.?\s+([A-Z][a-z]+)/g,
        (all, title, name) => {
          const m = addNamed(`${title} ${name}`, TITLES[title.toLowerCase()], null, title.toLowerCase());
          if (m.name === `${title} ${name}`) m.titled = true;
          return `${title}_${name}`;
        });
      s = s.replace(/\b(?:her|his|its|their)\s+name\s+(?:was|is)\s+([A-Z][a-z]+)/gi, (all, name) => {
        // (the last one named with nothing but a kind gets the name)
        const who = [...cast].filter((m) => !m.name).sort((a, b) => b.last - a.last)[0];
        if (who) { Object.assign(who, { name, key: `pgc${nextKey++}`, look: { seed: hash(name.toLowerCase()) } }); return name; }
        return all;
      });

      // Someone missing or lost: known, but not drawn ("Ein kleines Sternchen fehlte!")
      s = s.replace(MISSING, (all, a, b) => {
        const w = (a ?? b ?? '').toLowerCase();
        return kindOf(w) && !PRESENT[w] ? ` absent_${w} ` : all;
      });
      // Word by word: names, pronouns, the creatures it speaks of, verbs
      const toks = (s.replace(/(\w)'s\b/g, '$1').match(/⟦\d+⟧|[A-Za-z_'][A-Za-z0-9_']*|[0-9]+|[^\sA-Za-z0-9]/g) ?? []);
      const out = [];
      const here = new Set(); // who this sentence has named so far
      const ref = (m) => { mention(m); inScene.add(m); here.add(m); return m.key ?? `the ${m.noun}`; };
      // (an object - "sat next to her", "gave him" - is someone other than who the sentence is about)
      const pick = (gender, object = false) => {
        const other = (m) => !object || !here.has(m);
        const fits = cast.filter((m) => (gender === 'f' ? m.gender === 'f' : m.gender === 'm') && m.last > 0 && other(m));
        const animals = cast.filter((m) => m.gender === 'a' && m.last > 0 && other(m));
        const best = (list) => list.sort((a, b) => b.last - a.last)[0];
        // ("he wagged his tail": the puppy, when no boy or man is in the story yet)
        return best(fits) ?? best(animals) ?? null;
      };
      for (let i = 0; i < toks.length; i++) {
        const tok = toks[i], low = tok.toLowerCase(), next = toks[i + 1]?.toLowerCase() ?? '';
        if (/^⟦/.test(tok)) { out.push(tok); continue; }
        // (someone missing: met, not in the scene)
        if (low.startsWith('absent_')) {
          const w = low.slice(7), id = kindOf(w);
          if (id && !cast.some((c) => c.noun === w || (c.id === id && !c.name))) cast.push({ id, noun: w, gender: genderOf(id), last: 0, ...(friendly.has(w) ? { friend: true, name: `the ${w}`, key: `pgc${nextKey++}`, look: { seed: hash(w) } } : {}) });
          continue;
        }
        // (the others of a sky friend: "the other stars" are star friends too)
        if (friendly.has(low.replace(/s$/, '')) && low.endsWith('s') && low !== 'sus') {
          if (['the', 'other', 'all'].includes(out[out.length - 1]?.toLowerCase())) while (['the', 'other', 'all'].includes(out[out.length - 1]?.toLowerCase())) out.pop();
          out.push('two', `${low.slice(0, -1)} friends`);
          continue;
        }
        // A titled name ("Grandma_Rose")
        if (tok.includes('_')) { const m = named(tok.replace('_', ' ')); out.push(m ? ref(m) : tok.replace('_', ' ')); continue; }
        // A character already met, by name (or the studio's key)
        const known = named(tok);
        if (known && (/^[A-Z]/.test(tok) || /^pgc\d+$/.test(tok))) { out.push(ref(known)); continue; }
        // A new name: capitalised, not a word the engine knows or a word that starts sentences
        const first = i === 0 || /^[.!?⟧]$/.test(toks[i - 1] ?? '');
        const listed = GIRL_NAMES.has(low) || BOY_NAMES.has(low);
        const afterArticle = ['a', 'an', 'the', 'some'].includes(toks[i - 1]?.toLowerCase());
        // (a capitalised word that starts a sentence - "Second,", "Scammers love...", "Remember:" - is a
        // name only when the story uses it as one: mid-sentence too, or doing something)
        const doing = PRESENT[next] || /^(is|was|were|are|has|had|and|said|says|can|could|will|would|did|does|from|with)$/.test(next) || /[a-z]ed$/.test(next);
        const usedAsName = listed || doing || new RegExp(`[a-z,;] ${tok}\\b`).test(said);
        if (/^[A-Z][a-z]+$/.test(tok) && !afterArticle && !NOT_NAMES.has(low) && (listed || !/(ly|ing|ed)$/.test(low)) && !PRESENT[low]
          && (listed || (!first && !kindOf(low)) || (!parseText(low).matches.length && usedAsName))
          && !['in', 'on', 'at', 'under', 'near', 'by'].includes(next)) {
          out.push(ref(addNamed(tok, guessKind(tok, offset))));
          continue;
        }
        // Pronouns: who they stand for
        if (['she', 'he', 'him'].includes(low) || (low === 'her' && !isNoun(next))) {
          const m = pick(['she', 'her'].includes(low) ? 'f' : 'm', ['her', 'him'].includes(low));
          out.push(m ? ref(m) : tok);
          continue;
        }
        if (['they', 'them'].includes(low)) {
          // (the ones from the scene before, but not whoever this sentence is about: "Mum called them")
          const who = (m) => !here.has(m) && !BEINGS.has(m.id);
          const before = [...new Set([...lastScene, ...prevScene])].filter(who).slice(0, 4);
          const group = before.length > 1 ? before : [...cast].filter((m) => m.last > 0 && who(m)).sort((a, b) => b.last - a.last).slice(0, 2);
          out.push(group.length > 1 ? group.map(ref).join(' and ') : tok);
          continue;
        }
        if (['his', 'her', 'its', 'their'].includes(low)) continue; // ("hugged her puppy": the puppy)
        // A creature spoken of without a name ("a small puppy", "the puppy"): the same one each time
        const id = /^[a-z]+$/.test(low) && !NOT_NAMES.has(low) && !PRESENT[low] && kindOf(low);
        if (id && parseText(low).matches.length === 1 && parseText(low).matches[0].count === 1) {
          let m = cast.find((c) => c.name && c.noun === low) ?? cast.find((c) => c.id === id && (!c.name || c.friend));
          // (a sky friend is one character all along: a key and a look of its own, "the moon")
          if (!m) { m = { id, noun: low, gender: genderOf(id), last: 0, ...(friendly.has(low) ? { friend: true, name: `the ${low}`, key: `pgc${nextKey++}`, look: { seed: hash(low) } } : {}) }; cast.push(m); }
          mention(m);
          inScene.add(m);
          out.push(m.key ?? tok);
          if (m.key && ['a', 'an', 'the'].includes(out[out.length - 2]?.toLowerCase())) out.splice(out.length - 2, 1);
          // (a sky friend is "the moon" all along: "a small moon" is it too)
          else if (m.friend) while (/^(a|an|the|small|little|tiny|big|kleine?)$/i.test(out[out.length - 2] ?? '')) out.splice(out.length - 2, 1);
          continue;
        }
        out.push(PRESENT[low] ?? tok);
      }
      return verbs(out.join(' '));
    }
  }

  friendly = new Set();
  return {
    scenes,
    title: titled.title,
    subtitle: titled.subtitle,
    individuals: cast.filter((m) => m.key && !m.saved).map((m) => ({ key: m.key, base: m.id, look: m.look })),
    cast: cast.map((m) => ({ name: m.name ?? null, key: m.key ?? null, id: m.id, noun: m.noun ?? null })),
  };
}

// A word after "her" that makes it "her ..." (her puppy, her red ball), not "her" herself
const isNoun = (w) => Boolean(w) && /^[a-z]+$/.test(w) && !['and', 'to', 'a', 'an', 'the', 'with', 'in', 'on', 'at', 'up', 'out', 'back', 'some', 'too', 'again', 'goodbye', 'hello', 'home', 'very', 'so'].includes(w) && !PRESENT[w];

/**
 * Story verbs as the engine draws them: finding or seeing is looking at, giving is holding it out
 * to someone, playing together is jumping about, becoming friends is smiling at each other,
 * falling asleep is sleeping
 */
function verbs(s) {
  const REF = '(pgc\\d+|the [a-z]+)';
  return ` ${s} `
    .replace(new RegExp(`\\bgives ${REF} (?:a |another |a big )?(?:hug|cuddle|kiss)\\b`, 'g'), 'hugs $1')
    .replace(new RegExp(`\\bgives ${REF} (?:some |a |an |the )?([a-z]+)`, 'g'), 'holds $2 and looks at $1')
    .replace(new RegExp(`\\bgives (?:some |a |an |the )?([a-z]+) to ${REF}`, 'g'), 'holds $1 and looks at $2')
    .replace(new RegExp(`${REF} plays with ${REF}`, 'g'), '$1 and $2 jump')
    .replace(/\b(plays|play)\b(?! with)/g, 'jump')
    .replace(/\b(?:becomes|become|are|is) (?:best |good |great )?friends\b/g, 'smile at each other')
    .replace(/\b(?:falls asleep|fall asleep|goes to sleep|go to sleep|is asleep|sleeps|slept)\b/g, 'sleeps')
    .replace(/\b(?:finds|find|sees|see|spots|spotted|notices|noticed|discovers|discovered|meets|meet)\b/g, 'looks at')
    .replace(/\breads (?:a |the |her |his )?(?:story|stories|tale|bedtime story)\b/g, 'reads a book')
    .replace(/\bgoes to\b/g, 'walks to')
    .replace(/\bto looks at\b/g, 'and looks at')
    .replace(/\bgoes (home|inside|outside|out)\b/g, 'walks')
    .replace(/\b(happily|cheerfully|gladly)\b/g, 'happy').replace(/\b(sadly|unhappily)\b/g, 'sad').replace(/\b(angrily|crossly)\b/g, 'angry')
    .replace(/\b(excitedly)\b/g, 'excited').replace(/\b(sleepily)\b/g, 'sleepy').replace(/\b(nervously|fearfully)\b/g, 'scared')
    .replace(/\b(?:follows|followed|follow)\b/g, 'walks to')
    .replace(/\bbarks\b/g, 'wags')
    // (hearing someone cry is hearing a sound: not crying oneself)
    .replace(/\b(hears|heard|listens(?: to)?|listened(?: to)?)\s+(?:a\s+|some\s+|someone\s+|somebody\s+)?(?:[a-z]+\s+)?(?:cry|crying|cries|sob|sobbing|weeping)\b/g, '$1')
    .replace(/\bit (?:starts|started|begins|began|is starting) to (?:rain|snow)\b/gi, ' ')
    .replace(/\b(?:once upon a time|there (?:is|was|are|were|lives|lived)|who (?:lives|lived)|every (?:day|morning|evening|night)|one (?:day|morning|evening|night)|the next (?:day|morning)|together|suddenly|finally)\b/gi, ' ')
    .replace(/^\s*[,.;]+/, '')
    .trim();
}
