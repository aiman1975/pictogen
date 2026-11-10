// The nearest picture for English nouns Toonaro has no picture for (src/data/nearest-en.js), from
// WordNet (Princeton University, WordNet 3.x - license in docs/LICENSE_AUDIT.md): every noun that
// names something you can see - an animal, a thing someone made, food, a plant, a person, a body
// part, a natural object - drawn by the closest picture there is: itself if Toonaro knows one of its
// other names, else what it is a kind of ("poodle" is a dog, "schooner" a sailboat), else a close
// relative ("harpsichord" - a keyboard instrument - is drawn as a piano). Built once; the result is
// a plain list in the repository, WordNet itself is not.
//
//   node scripts/lang/nearest-build.mjs <path to WordNet's dict folder>   (e.g. npm pack wordnet-db)
//   node scripts/lang/nearest-build.mjs <dict> --sample 60                 (and show 60 at random)

import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listConcepts, getConcept, parseText } from '../../src/index.js';
import { useNearest } from '../../src/text/matcher.js';
import { isFirstName } from '../../src/story-reader.js';

// (what Toonaro knows without the list this builds)
useNearest(false);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dict = process.argv[2];
if (!dict) { console.error('usage: node scripts/lang/nearest-build.mjs <WordNet dict folder> [--sample N]'); process.exit(1); }
const sampleN = process.argv.includes('--sample') ? +process.argv[process.argv.indexOf('--sample') + 1] : 0;

// ---- WordNet: synsets (their lexicographer file, words, kinds-of and kinds) and the lemmas' senses
const LEX = { 5: 'animal', 6: 'artifact', 8: 'body', 13: 'food', 17: 'object', 18: 'person', 20: 'plant' };
const syn = new Map();
for (const line of readFileSync(join(dict, 'data.noun'), 'utf8').split('\n')) {
  if (!line || line.startsWith('  ')) continue;
  const [head, gloss = ''] = line.split(' | ');
  const f = head.split(' ');
  const off = f[0], lex = +f[1], wc = parseInt(f[3], 16);
  const words = [];
  for (let k = 0; k < wc; k++) words.push(f[4 + 2 * k].toLowerCase().replace(/\(.*\)$/, ''));
  let p = 4 + 2 * wc;
  const pc = +f[p++];
  const up = [], down = [], inst = [];
  for (let k = 0; k < pc; k++, p += 4) {
    const [sym, o, pos] = [f[p], f[p + 1], f[p + 2]];
    if (pos !== 'n') continue;
    if (sym === '@') up.push(o); else if (sym === '@i') inst.push(o); else if (sym === '~') down.push(o);
  }
  // (words marked rude or offensive in WordNet are left out)
  const rude = /offensive|slur|derogatory|disparaging|vulgar|obscene|contemptuous|insulting/i.test(gloss);
  syn.set(off, { off, lex, words, up, down, inst, rude });
}
const senses = new Map(); // noun lemma -> synset offsets, most used first
for (const line of readFileSync(join(dict, 'index.noun'), 'utf8').split('\n')) {
  if (!line || line.startsWith('  ')) continue;
  const f = line.trim().split(' ');
  const n = +f[2];
  senses.set(f[0], f.slice(f.length - n));
}
// How often a lemma is used as a noun, a verb or a describing word (tagged in WordNet's texts)
const used = new Map(); // lemma -> { n, v, a }
for (const line of readFileSync(join(dict, 'index.sense'), 'utf8').split('\n')) {
  const m = line.match(/^([^%]+)%(\d):\S+ \d+ \d+ (\d+)$/);
  if (!m) continue;
  const u = used.get(m[1]) ?? { n: 0, v: 0, a: 0 };
  const kind = m[2] === '1' ? 'n' : m[2] === '2' ? 'v' : m[2] === '3' || m[2] === '5' ? 'a' : null;
  if (kind) u[kind] += +m[3];
  used.set(m[1], u);
}

// ---- Toonaro's pictures in WordNet: each picture's names, at their most used fitting sense
// (a person's picture stands for people; any other for the things you can see - the kind it is
// first: a picture of a thing takes its name's meaning as a thing, "hammock" is no small hill)
const KIND = (c) => {
  const cat = c.category ?? '';
  if (/^people/.test(cat)) return ['person'];
  if (/animals$|wildlife|sea|fantasy/.test(cat)) return ['animal', 'plant', 'object'];
  if (/food/.test(cat)) return ['food', 'plant', 'artifact'];
  if (/nature|sky/.test(cat)) return ['plant', 'object', 'animal', 'artifact'];
  if (/animals_nature/.test(cat)) return ['animal', 'plant', 'object', 'food', 'artifact'];
  // (a thing is never an animal: "snowflake" is also a small bird)
  return ['artifact', 'food', 'object', 'plant'];
};
// (pictures that would be a poor stand-in for anything else: hands and gestures, signs, flags,
// marks, a person doing something, tone variants)
const SKIP_ID = /^(flag_|keycap|regional_indicator|.*_button$|.*_sign$|.*_mark$|.*_suit$|.*hand|.*_finger|.*fingers|.*_fist|thumbs?_|.*_gesturing|.*_bowing|.*_facepalming|.*_shrugging|.*_running|.*_walking|.*_standing|.*_kneeling|.*_climbing|.*_juggling|.*_biking|.*_surfing|.*_swimming|.*_lifting|.*_rowing|.*_golfing|.*_bouncing|.*_cartwheeling|.*_in_|.*_with_|.*_and_|.*_face|.*_heart|.*_arrow|.*_square|.*_circle|.*_triangle|.*_diamond|.*_oclock|.*_thirty)/;
const anchor = new Map(); // synset -> picture id
const pictures = listConcepts().filter((c) => !c.variantOf && !SKIP_ID.test(c.id) && !/^(letter|number|arabic)/.test(c.id));
// (the hand-drawn first: they are Toonaro's own look)
pictures.sort((a, b) => Number(!!a.isLibrary) - Number(!!b.isLibrary));
for (const c of pictures) {
  const names = [c.id, ...(c.aliases ?? [])].map((w) => String(w).toLowerCase().trim().replace(/[\s-]+/g, '_')).filter((w) => /^[a-z_]+$/.test(w));
  const kinds = KIND(c);
  for (const name of new Set(names)) {
    // (a picture's own name: its first fitting sense of the first three; another name: its first sense only -
    // "crossing" is no ford)
    const own = name === c.id.toLowerCase();
    const all = senses.get(name) ?? [];
    const ss = all.slice(0, own ? 3 : 1).map((o) => syn.get(o)).filter((s) => s && kinds.includes(LEX[s.lex]));
    // (of the fitting senses, the one of the kind the picture is first)
    const s = ss.sort((a, b) => kinds.indexOf(LEX[a.lex]) - kinds.indexOf(LEX[b.lex]))[0];
    // (another name only when it means just this, or its sense shares one of the picture's names:
    // "dolly" is also a cart, "ground" also land)
    if (s && !own && all.length > 1 && !s.words.some((w) => w !== name && names.includes(w))) continue;
    if (s && !anchor.has(s.off)) anchor.set(s.off, c.id);
  }
}
// (people: a person is a man or a woman, drawn by Toonaro; a child a boy or a girl)
for (const [lemma, id] of [['person', 'man'], ['man', 'man'], ['woman', 'woman'], ['child', 'boy'], ['girl', 'girl'], ['boy', 'boy'], ['old_man', 'old_man'], ['old_woman', 'old_woman']]) {
  const o = senses.get(lemma)?.[0];
  if (o && getConcept(id)) anchor.set(o, id);
}

// ---- Each noun: its picture, the closest there is
const TOO_GENERAL = new Set(['entity', 'physical_entity', 'object', 'whole', 'artifact', 'instrumentality', 'living_thing', 'organism', 'thing', 'matter', 'substance', 'part', 'unit', 'abstraction', 'causal_agent', 'structure', 'device', 'container', 'covering', 'commodity', 'material', 'equipment', 'implement', 'system', 'creation', 'decoration', 'article', 'way', 'facility', 'area', 'region', 'location', 'food', 'nutriment', 'solid', 'vertebrate', 'chordate', 'animal', 'invertebrate', 'vascular_plant', 'plant', 'plant_part', 'plant_organ', 'body_part', 'external_body_part', 'natural_object', 'geological_formation']);
const general = (s) => s.words.some((w) => TOO_GENERAL.has(w));
function nearest(s0) {
  if (anchor.has(s0.off)) return { id: anchor.get(s0.off), how: 'same', d: 0 };
  // Up what it is a kind of, a few steps ("a pigeon" is a bird)
  let level = [s0];
  const seen = new Set([s0.off]), parents = [];
  const maxUp = ['animal', 'plant'].includes(LEX[s0.lex]) ? 4 : 3;
  for (let d = 1; d <= maxUp && level.length; d++) {
    const next = [];
    for (const s of level) for (const o of s.up) { if (seen.has(o)) continue; seen.add(o); const u = syn.get(o); if (u && !general(u)) next.push(u); }
    for (const u of next) if (anchor.has(u.off)) return { id: anchor.get(u.off), how: 'kind of', d, via: u.words[0] };
    if (d === 1) parents.push(...next);
    level = next;
  }
  // Else a close relative, in a small, specific family: a walrus is drawn as a seal, a harpsichord
  // as a keyboard (not a minestrone as some other "dish")
  for (const u of parents) {
    if (u.down.length > 14) continue;
    const sib = u.down.map((o) => anchor.get(o)).filter(Boolean);
    if (sib.length) return { id: sib.find((id) => !getConcept(id)?.isLibrary) ?? sib[0], how: 'like', d: 1.5, via: u.words[0] };
  }
  return null;
}

// Where WordNet's most used meaning is not the one meant in a story or a lesson ("a schooner" is a
// ship, not a beer glass), or a picture fits better than the nearest
const BY_HAND = {
  schooner: 'sailboat', helmet: 'military_helmet', helmets: 'military_helmet', trolley: 'tram', piano: 'musical_keyboard', pianos: 'musical_keyboard',
  harpsichord: 'musical_keyboard', organ: 'musical_keyboard', walrus: 'seal', sealion: 'seal',
  bee: 'honeybee', bees: 'honeybee', bumblebee: 'honeybee', hen: 'chicken', hens: 'chicken', youth: 'boy', youngster: 'boy',
  beer: 'beer_mug', ale: 'beer_mug', lager: 'beer_mug', wine: 'wine_glass', champagne: 'wine_glass', vermouth: 'wine_glass',
  whisky: 'tumbler_glass', whiskey: 'tumbler_glass', liquor: 'tumbler_glass', brandy: 'tumbler_glass', spirits: 'tumbler_glass', booze: 'tumbler_glass', alcohol: 'tumbler_glass', bitters: 'tumbler_glass',
  lemonade: 'cup_with_straw', chick: 'baby_chick', chicks: 'baby_chick', tire: 'wheel', tyre: 'wheel', picket: 'fence', puppet: 'doll', marionette: 'doll', furniture: 'sofa', mailbox: 'postbox',
  opium: null, dope: null, quack: null, nuthouse: null, mound: null, output: null, curtain: null, drapery: null, muffler: null, peg: null, shooter: null, pike: null, gallus: null,
  figurine: null, statuette: null, psychopomp: null, voodoo: null, cache: null, booth: null, feeder: null, gage: null, bogy: null, bullet: null, crowbait: null, hardware: null, holder: null, anthill: null, hillock: null, knoll: null,
  rice: 'cooked_rice', binoculars: 'telescope', truck: 'delivery_truck', trucks: 'delivery_truck', pickup: 'pickup_truck',
  // (no picture rather than a wrong one: a toaster is no person, who someone loves is no "man")
  toaster: null, toasters: null, transgender: null, transgendered: null, transsexual: null, gay: null, lesbian: null, homosexual: null, heterosexual: null, bisexual: null,
};
// Rude words are never drawn (WordNet marks most of them; these too)
const RUDE = /^(.*fuck.*|.*shit.*|.*cunt.*|cock|cocks|cocksucker.*|.*wank.*|twat.*|whore.*|slut.*|bitch.*|bastard.*|asshole.*|arsehole.*|prick.*|dick|dickhead.*|nigg.*|fag|fags|faggot.*|dyke.*|kike.*|spic|spics|chink.*|gook.*|wetback.*|retard.*|tranny.*|pussy.*|bollock.*|turd.*|piss.*|crap.*|tit|tits|titty.*|boob.*|jackass.*|dumbass.*|douche.*|scumbag.*|motherfuck.*|sod|sodomite.*|wop|wops|dago.*|honky.*|cracker|crackers|gringo.*|darky|darkie.*|coon|coons|paki.*|raghead.*|towelhead.*|hymie.*|beaner.*|redskin.*|squaw.*|halfbreed.*|homo|homos|queer.*|poofter.*|poof|pansy|negro.*|negress.*|colored|coloured|mulatto.*|halfcaste.*|eskimo.*|gypsy|gypsies|oriental.*)$/;
const GROUPS = new Set(['inhabitant', 'native', 'aborigine', 'ethnic_group', 'religious_person', 'believer', 'adherent', 'religionist', 'disciple', 'follower', 'christian', 'jew', 'muslim', 'hindu', 'buddhist', 'heretic', 'pagan',
  'national', 'citizen', 'subject', 'foreigner', 'immigrant', 'emigrant', 'european', 'african', 'asian', 'american', 'semite', 'white', 'black', 'person_of_color', 'mongoloid', 'caucasian', 'indian', 'amerindian',
  'politician', 'liberal', 'conservative', 'radical', 'reformer', 'rightist', 'leftist', 'socialist', 'communist', 'anarchist', 'nationalist', 'partisan', 'supporter', 'advocate', 'homosexual', 'heterosexual', 'bisexual']);
// (whether s, or what it is a kind of within n steps, is one of the words)
function within(s, words, n) {
  let level = [s];
  for (let d = 0; d <= n && level.length; d++) {
    if (level.some((x) => x.words.some((w) => words.has(w)))) return true;
    level = level.flatMap((x) => x.up.map((o) => syn.get(o)).filter(Boolean));
  }
  return false;
}
const FEMALE = /(ess|woman|women|wife|wives|girl|mother|mom|mum|daughter|sister|aunt|niece|lady|ladies|queen|bride|widow|maid|nun|matron|heroine|ette|trix|grandma|granny)$|^(she|mrs|ms|miss)/;
const out = new Map(); // word -> picture id
const why = [];
const known = (w) => { let r; try { r = parseText(w); } catch (e) { console.error(`(parseText failed on "${w}": ${e.message})`); return true; } return r.matches.length > 0 || !r.unknown.includes(w); };
let checked = 0;
for (const [lemma, offs] of senses) {
  // (one word, letters only; names of people and places are left out)
  // (first names are names: "John waves" is someone called John, not a toilet)
  if (!/^[a-z]{3,}$/.test(lemma) || RUDE.test(lemma) || isFirstName(lemma)) continue;
  if (lemma in BY_HAND) { if (BY_HAND[lemma] && getConcept(BY_HAND[lemma]) && !known(lemma)) { out.set(lemma, BY_HAND[lemma]); why.push([lemma, { id: BY_HAND[lemma], how: 'by hand' }]); } continue; }
  const s0 = syn.get(offs[0]);
  // (body parts are left out: a finger is no picture of its own)
  if (!s0 || !LEX[s0.lex] || LEX[s0.lex] === 'body' || s0.inst.length || s0.rude) continue;
  // (a word used more as a verb or a describing word is not taken for a thing: "rides", "empty")
  const u = used.get(lemma) ?? { n: 0, v: 0, a: 0 };
  if (u.v > u.n || u.a > u.n) continue;
  checked++;
  if (known(lemma)) continue;
  // (who someone is by their people, country, faith or politics is not a picture of "a man")
  if (LEX[s0.lex] === 'person' && within(s0, GROUPS, 5)) continue;
  const hit = nearest(s0);
  if (!hit || !getConcept(hit.id)) continue;
  // (a woman's word is a woman: a hostess, an actress, a queen, a grandmother)
  if (hit.id === 'man' && FEMALE.test(lemma)) hit.id = 'woman';
  if (hit.id === 'boy' && FEMALE.test(lemma)) hit.id = 'girl';
  out.set(lemma, hit.id);
  why.push([lemma, hit]);
}

// ---- Written as a list per picture (small, and easy to read and correct)
const byPicture = new Map();
for (const [w, id] of [...out].sort()) byPicture.set(id, [...(byPicture.get(id) ?? []), w]);
const body = [...byPicture].sort((a, b) => a[0].localeCompare(b[0])).map(([id, ws]) => `  ${JSON.stringify(id)}: ${JSON.stringify(ws.join(' '))},`).join('\n');
// What kind of thing each picture is, nearest first ("parrot bird"): the studio's 🔄 Swap shows a
// picture's relatives first (a magpie drawn as a bird: other birds)
const kindsOf = new Map();
for (const [off, id] of anchor) {
  if (kindsOf.has(id)) continue;
  const chain = [];
  let level = [syn.get(off)];
  for (let d = 0; d < 6 && level.length; d++) {
    for (const x of level) if (!general(x)) chain.push(x.words[0]);
    level = level.flatMap((x) => x.up.map((o) => syn.get(o)).filter(Boolean)).slice(0, 2);
  }
  kindsOf.set(id, [...new Set(chain)].join(' '));
}
const kindsBody = [...kindsOf].sort((a, b) => a[0].localeCompare(b[0])).map(([id, k]) => `  ${JSON.stringify(id)}: ${JSON.stringify(k)},`).join('\n');
writeFileSync(join(root, 'src', 'data', 'nearest-en.js'), `// English nouns Toonaro has no picture of, each drawn by the nearest picture there is: picture id ->
// the words, by scripts/lang/nearest-build.mjs from WordNet (WordNet 3.0 Copyright 2006 by Princeton
// University. All rights reserved. Used under the WordNet license: docs/LICENSE_AUDIT.md).
// ${out.size} words. To change one: move it to another picture here (or take it out).
export default {
${body}
};

// What kind of thing each picture is, nearest first (for the studio's 🔄 Swap: its relatives first)
export const KINDS = {
${kindsBody}
};
`);
console.log(`checked ${checked} nouns of things; ${out.size} drawn by their nearest picture (${byPicture.size} pictures)`);
const hows = why.reduce((m, [, h]) => ((m[h.how] = (m[h.how] ?? 0) + 1), m), {});
console.log(hows);
if (sampleN) {
  for (let k = 0; k < sampleN; k++) {
    const [w, h] = why[Math.floor(Math.random() * why.length)];
    console.log(`  ${w.padEnd(18)} -> ${h.id.padEnd(22)} ${h.how}${h.via ? ` (${h.via})` : ''}`);
  }
}
