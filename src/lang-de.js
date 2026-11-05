// German scenes: a German prompt read word by word into the English words the engine draws by
// ("ein roter Hund läuft im Park" -> "a red dog walks in the park"), so everything the engine knows -
// pictures, colours, counts, feelings, actions, places, times, the weather - works in German too.
// What is said („Hallo!“) and the board's words stay as written. Words not known are left out (a
// figure of your own, "pgc1", stays). Nouns: src/lang-de-nouns.js (drafted, checked); the rest here.
import DRAFTED, { PLURAL } from './lang-de-nouns.js';

const w = (pairs) => Object.fromEntries(pairs.trim().split(/\n/).flatMap((line) => {
  const [de, en] = line.split('=').map((s) => s.trim());
  return de.split(/\s*,\s*/).map((d) => [d, en]);
}));

// Small words: articles, prepositions, joining words, pronouns
const GRAMMAR = w(`
daumenhoch = thumbsup
vonvon = out of
der, die, das, den, dem, des = the
ein, eine, einen, einem, einer, eines = a
kein, keine, keinen, keinem, keiner = no
im, ins = in the
in = in
am = at the
an = at
auf, aufs = on
unter, unterm = under
über, überm = over
neben = next to
vor, vorm = in front of
hinter, hinterm = behind
zwischen = between
mit = with
ohne = without
bei = near
beim = near the
zu = to
zum, zur = to the
nach = to
von = from
vom = from the
aus = out of
durch = through
um = around
gegen = against
und = and
oder = or
aber = but
dann, danach, anschließend, daraufhin = then
schließlich, zuletzt, endlich = finally
während = while
als, wenn, sobald = when
bis = until
weil, da = because
er = he
sie = she
es = it
ihn, ihm = him
ihr, ihre, ihren, ihrem, ihrer = her
sein, seine, seinen, seinem, seiner = his
wir = we
uns = us
einander = each other
zusammen, gemeinsam = together
alle, allen = all
hier = here
dort = there
plötzlich = suddenly
sehr = very
`);

// Doing: German verb forms -> what the engine animates
const VERBS = w(`
geht, gehen, ging, gingen, gehe, spaziert, spazieren, spazierte, läuft, laufen, lief, liefen = walks
rennt, rennen, rannte, rannten, sprintet = runs
joggt, joggen, joggte = jogs
springt, springen, sprang, sprangen, hüpft, hüpfen, hüpfte = jumps
tanzt, tanzen, tanzte, tanzten = dances
winkt, winken, winkte, winkten = waves
zeigt, zeigen, zeigte, deutet = points
lacht, lachen, lachte, kichert = laughs
lächelt, lächeln, lächelte = smiles
weint, weinen, weinte = cries
schläft, schlafen, schlief, schliefen, schlummert = sleeps
sitzt, sitzen, saß, saßen, setzt = sits
steht, stehen, stand, standen = stands
liegt, liegen, lag, lagen = lies
liest, lesen, las = reads
schreibt, schreiben, schrieb = writes
isst, essen, aß, frisst, fressen = eats
trinkt, trinken, trank = drinks
schwimmt, schwimmen, schwamm = swims
fliegt, fliegen, flog, flogen = flies
fährt, fahren, fuhr, fuhren = drives
reitet, reiten, ritt = rides
spielt, spielen, spielte, spielten = plays
singt, singen, sang = sings
denkt, denken, dachte, überlegt, grübelt = thinks
träumt, träumen, träumte = dreams
klatscht, klatschen, klatschte = claps
jubelt, jubeln, jubelte, feiert, feiern = cheers
umarmt, umarmen, umarmte, knuddelt = hugs
hält, halten, hielt, trägt, tragen, trug = holds
wirft, werfen, warf = throws
tritt, kickt, schießt = kicks
klettert, klettern, kletterte = climbs
fällt, fallen, fiel, stürzt = falls
kommt, kommen, kam, kamen = comes
betritt, betreten, betrat = walks in
gehtfern = walks into the distance
kommtzu = walks toward us
verlässt, verlassen, verließ = leaves
schaut, schauen, schaute, sieht, sehen, sah, blickt, guckt, beobachtet = looks
spricht, sprechen, sprach, redet, reden, plaudert, erzählt = talks
sagt, sagte, sagen = says
fragt, fragte, fragen = asks
ruft, rief, rufen, schreit, schrie = shouts
flüstert, flüsterte = whispers
antwortet, antwortete = replies
arbeitet, arbeiten, arbeitete = works
kocht, kochen, kochte, backt, backen = cooks
malt, malen, malte, zeichnet, zeichnen = paints
baut, bauen, baute = builds
tippt, tippen = types
lernt, lernen, lernte, studiert = studies
dreht, drehen, drehte, wirbelt = spins
taucht, tauchen, tauchte = dives
sinkt, sinken, sank = sinks
bellt, bellen, bellte = barks
miaut = meows
regnet = rains
schneit = snows
scheint, leuchtet, glänzt = shines
wartet, warten, wartete = waits
hilft, helfen, half = helps
gibt, geben, gab, schenkt = gives
findet, finden, fand = finds
entdeckt, entdecken, entdeckte = discovers
`);

// Describing: colours, sizes, feelings, doing-words (each with its endings: rot, rote, roter...)
const ADJ = w(`
rot = red
blau = blue
grün = green
gelb = yellow
schwarz = black
weiß = white
orange, orangen = orange
lila, violett = purple
rosa, pink = pink
braun = brown
grau = gray
golden, gold = gold
silbern = silver
bunt = colorful
groß = big
klein = small
riesig = huge
winzig = tiny
alt = old
jung = young
dick = fat
dünn = thin
lang = long
kurz = short
glücklich, froh, fröhlich, heiter = happy
traurig, betrübt = sad
wütend, böse, sauer, zornig = angry
überrascht, erstaunt, verblüfft = surprised
müde, schläfrig = sleepy
ängstlich, verängstigt, erschrocken = scared
aufgeregt, begeistert = excited
verliebt = in love
verwirrt = confused
schüchtern = shy
stolz = proud
besorgt = worried
gelangweilt = bored
krank = sick
lachend = laughing
tanzend = dancing
springend, hüpfend = jumping
laufend, rennend = running
schlafend = sleeping
fliegend = flying
schwimmend = swimming
winkend = waving
lächelnd = smiling
weinend = crying
lesend = reading
singend = singing
süß, niedlich = cute
lustig = funny
nass = wet
kalt = cold
heiß = hot
dunkel = dark
hell = bright
schön, hübsch = beautiful
freundlich, nett = friendly
sonnig = sunny
regnerisch, verregnet = rainy
verschneit = snowy
windig = windy
neblig = foggy
skeptisch, misstrauisch = skeptical
nachdenklich = thoughtful
`);

// Counting
const NUMBERS = w(`
zwei = two
drei = three
vier = four
fünf = five
sechs = six
sieben = seven
acht = eight
neun = nine
zehn = ten
viele, vielen = many
einige, mehrere = some
paar = few
`);

// Places, times, the weather (before the nouns: "Park" is a place, not a picture)
const PLACES = w(`
park, parks = park
garten, gärten = garden
strand, strände, stränden = beach
meer, meere, ozean, see = sea
wald, wälder, wäldern, waldes = forest
stadt, städte, innenstadt = city
wüste, wüsten = desert
bauernhof, bauernhöfe, hof = farm
dschungel, urwald, regenwald = jungle
berg, berge, bergen, gebirge, alpen = mountains
weltraum, weltall, all = space
schule = school
klassenzimmer, klasse, klassenraum = classroom
büro, büros = office
küche = kitchen
schlafzimmer, kinderzimmer = bedroom
zimmer, raum, wohnzimmer = room
straße, straßen = street
spielplatz = playground
schloss, burg = castle
unterwasser = underwater
wasser = water
sternenhimmel, sternennacht = starry night
nacht, nachts, abends, abend = night
sonnenuntergang, abenddämmerung = sunset
morgen, morgens, vormittag = morning
tag, tagsüber = day
regen = rain
schnee = snow
winter = winter
herbst = autumn
sommer = summer
frühling = spring
gewitter, sturm = storm
`);

// Things, written here (they come before the drafted nouns, src/lang-de-nouns.js)
const NOUNS = { ...DRAFTED, ...w(`
kaffee, kaffees = coffee
tee, tees = tea
taucher, tauchers = diver
taucherin, taucherinnen = woman diver
apfelbaum, apfelbaumes, apfelbaums = apple tree
apfelbäume, apfelbäumen = apple trees
`) };

// Adjective endings: rot -> rot, rote, roter, roten, rotes, rotem
const ADJ_FORMS = {};
for (const [de, en] of Object.entries(ADJ)) for (const end of ['', 'e', 'er', 'en', 'es', 'em']) ADJ_FORMS[de + end] ??= en;

// (a word with a capital is a noun first - "Junge" is a boy; without, a verb or a describing word
// first - "junge" is young)
const KNOWN = { ...NOUNS, ...ADJ_FORMS, ...VERBS, ...NUMBERS, ...GRAMMAR, ...PLACES };
const KNOWN_NOUN = { ...ADJ_FORMS, ...VERBS, ...NUMBERS, ...GRAMMAR, ...NOUNS, ...PLACES };
// (for compounds: the nouns, longest first - "Fußball" ends in "ball", "Schulbus" in "bus")
const TAILS = Object.keys({ ...NOUNS, ...PLACES }).filter((k) => k.length >= 4).sort((a, b) => b.length - a.length);

/** A German word as English: known, else its last part ("Kinderfahrrad" -> "fahrrad"), else nothing */
export function germanWord(word) {
  const lw = word.toLowerCase();
  const table = /^\p{Lu}/u.test(word) ? KNOWN_NOUN : KNOWN;
  if (table[lw] !== undefined) return table[lw];
  if (/^(pgc|pgp|qq)\d+$/.test(lw) || /^\d/.test(lw)) return word;
  if (lw.length >= 6) {
    const tail = TAILS.find((t) => lw.endsWith(t) && lw.length - t.length >= 2);
    if (tail) return KNOWN[tail];
  }
  return null;
}

// An English noun as more than one ("dog" -> "dogs", "child" -> "children"; "cityscape at dusk" stays)
const IRREGULAR = { child: 'children', man: 'men', woman: 'women', person: 'people', mouse: 'mice', foot: 'feet', tooth: 'teeth', goose: 'geese', ox: 'oxen', sheep: 'sheep', fish: 'fish', deer: 'deer', baby: 'babies', knife: 'knives', leaf: 'leaves', wolf: 'wolves', shelf: 'shelves', loaf: 'loaves', calf: 'calves', half: 'halves', grandma: 'grandmas', cactus: 'cacti', octopus: 'octopuses', bus: 'buses', potato: 'potatoes', tomato: 'tomatoes', hero: 'heroes', volcano: 'volcanoes', mango: 'mangoes' };
export function pluralEn(en) {
  if (en.split(' ').length > 2) return en;
  const [, front, last] = en.match(/^(.*?)(\S+)$/);
  const pl = IRREGULAR[last] ?? (/(s|x|z|ch|sh)$/.test(last) ? `${last}es` : /[^aeiou]y$/.test(last) ? `${last.slice(0, -1)}ies` : `${last}s`);
  return front + pl;
}
// (a German plural that is the singular too after these: "einen Jungen", "dem Löwen")
const ONE_BEFORE = /^(ein|einen|einem|eines|einer|dem|des|kein|keinen|keinem)$/i;
// (a verb's part at the end of its clause: "liest ein Buch vor", "zieht die Jacke an")
const PARTICLE_END = /^(vor|an|aus|ein|auf|zu|mit|ab|weg|zurück|los|hin|her|mit|nach|fest|herum|vorbei|zusammen)$/i;

/** What kind of word a German word is: 'verb', 'noun' (a picture or a place), 'art', 'adj', 'num' or 'other' */
function kindOf(word) {
  const lw = word.toLowerCase();
  const upper = /^\p{Lu}/u.test(word);
  if (/^(pgc|pgp)\d+$/.test(lw)) return 'noun';
  // (a place or a time - "im Park", "nachts" - is where and when, never who does something)
  if (PLACES[lw] !== undefined) return 'place';
  if (upper && NOUNS[lw] !== undefined) return 'noun';
  if (VERBS[lw] !== undefined) return 'verb';
  if (/^(der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|kein|keine|keinen|keinem|keiner)$/.test(lw)) return 'art';
  if (NUMBERS[lw] !== undefined) return 'num';
  if (ADJ_FORMS[lw] !== undefined) return 'adj';
  if (NOUNS[lw] !== undefined) return 'noun';
  if (/^(er|sie|es|wir)$/.test(lw)) return 'pron';
  return 'other';
}

/**
 * A German prompt in the engine's English words. What is said (in „…“, "…" or “…”) is kept as it
 * is; so are the punctuation, numbers and keys. German puts the verb second: after a time or a place
 * at the front ("Nachts fliegt eine Rakete"), the verb comes back after who does it ("at night a
 * rocket flies"). { text, unknown: [German words left out] }
 */
export function bridgeGerman(text) {
  const unknown = [];
  // (a few sayings of more than one word: "Daumen hoch" is a thumbs-up)
  // ("kommt herein" walks in, "in die Ferne" is into the distance, "zu Fuß" is just walking)
  text = String(text ?? '').replace(/(^|[^\p{L}])(?:mit )?(?:dem |den )?daumen (nach oben|hoch)(?![\p{L}])/giu, '$1daumenhoch')
    .replace(/(^|[^\p{L}])(kommt|kommen|kam|kamen) herein(?![\p{L}])/giu, '$1betritt')
    .replace(/(^|[^\p{L}])(?:geht|gehen|ging|läuft|laufen|lief) (\p{L}+ )?in die ferne(?: davon| weg)?(?![\p{L}])/giu, (m, a, who) => `${a}${who ?? ''}gehtfern`)
    .replace(/(^|[^\p{L}])zu fuß(?![\p{L}])/giu, '$1')
    .replace(/(^|[^\p{L}])(?:kommt|kommen|kam|kamen|läuft|laufen|lief|geht|gehen|ging) auf (?:uns|mich|dich|die kamera) zu(?![\p{L}])/giu, '$1kommtzu')
    .replace(/(\d+) von (\d+)/gu, '$1 vonvon $2');
  const parts = String(text ?? '').split(/(„[^“”"]*[“”"]|"[^"]*"|“[^”]*”|«[^»]*»)/);
  const out = parts.map((part, i) => {
    // (what is said: as it is, in plain quotes)
    if (i % 2) return ` "${part.slice(1, -1).trim()}" `;
    // The words of each clause (between punctuation), with their kinds
    return part.split(/([,.;:!?])/).map((clause, k) => {
      if (k % 2) return clause;
      const toks = [];
      const ws = clause.match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) ?? [];
      for (let n = 0; n < ws.length; n++) {
        const word = ws[n];
        // ("der Buchstabe A", "die Zahl 7": a letter or a number figure)
        if (/^buchstaben?$/i.test(word) && /^\p{L}$/u.test(ws[n + 1] ?? '')) { toks.push({ en: `letter ${ws[++n].toLowerCase()}`, kind: 'noun' }); continue; }
        if (/^(zahl|ziffer|nummer)$/i.test(word) && /^\d$/.test(ws[n + 1] ?? '')) { toks.push({ en: `number ${ws[++n]}`, kind: 'noun' }); continue; }
        // (a verb's part at the end - "liest ... vor" - is part of the verb, no word of its own)
        if (n === ws.length - 1 && n >= 2 && PARTICLE_END.test(word) && ws.slice(0, n).some((w) => kindOf(w) === 'verb')) continue;
        let en = germanWord(word);
        if (en == null) { unknown.push(word); continue; }
        // (more than one: "Hunde" -> dogs; "den Jungen" stays one boy, "den Kindern" is children)
        const lw = word.toLowerCase(), pl = PLURAL[lw];
        if (pl && en === NOUNS[lw]) {
          const before = (ws[n - 1] ?? '').toLowerCase();
          const one = ONE_BEFORE.test(before) || (pl === 3 && before === 'den');
          if (!one) en = pluralEn(en);
        }
        toks.push({ en, kind: kindOf(word) });
      }
      // (the verb before who does it - the clause did not start with them: put it after them)
      for (let j = 1; j < toks.length - 1; j++) {
        if (toks[j].kind !== 'verb' || ['noun', 'pron'].includes(toks[j - 1].kind)) continue;
        let e = j + 1;
        if (toks[e]?.kind === 'pron') e++;
        else {
          while (['art', 'num', 'adj'].includes(toks[e]?.kind)) e++;
          if (toks[e]?.kind !== 'noun') continue;
          e++;
        }
        const [verb] = toks.splice(j, 1);
        toks.splice(e - 1, 0, verb);
        j = e - 1;
      }
      return ` ${toks.map((t) => t.en).join(' ')} `;
    }).join('');
  });
  // ("fährt Fahrrad", "reitet ein Pferd": a bike, a scooter or a horse is ridden)
  const en = out.join('').replace(/\b(drives|rides) (?:(a|the) )?(bike|bicycle|scooter|skateboard|horse|pony|motorcycle|motorbike)\b/g, (m, v, art, what) => `rides ${art ?? 'a'} ${what}`);
  return { text: en.replace(/\s+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim(), unknown };
}

// (German words that are English words too don't tell: "in", "an", "gold", "pink", "park"...)
const BOTH = new Set('in an um so gold orange pink rosa lila hell park all see tag bis da die was war man will also hat bin'.split(' '));
const GERMAN_ONLY = new Set([...Object.keys(GRAMMAR), ...Object.keys(VERBS), ...Object.keys(ADJ_FORMS), ...Object.keys(NUMBERS)].filter((k) => !BOTH.has(k)));
// (German nouns with a capital - "Apfel, Fahrrad, Baum" - tell too; not these, English words as well)
const EN_TOO = new Set('kind gift rock bad boot rat art hut note planet wind nest links ice angel computer auto couch cricket football notebook senior smartphone palette omnibus yen fuji hotdog bunny mate hose mode list brand chef fall golf mist hand arm ball bus taxi hotel radio ring'.split(' '));
const ENGLISH_SMALL = new Set('a an the and or is are was were of to with on at he she it they his her their this that then while says'.split(' '));

/** True when a prompt is German: German small words, verbs or describing words, and no English ones */
export function isGermanPrompt(text) {
  const ws = (String(text ?? '').replace(/„[^“”"]*[“”"]|"[^"]*"|“[^”]*”/g, ' ').toLowerCase().match(/\p{L}+/gu) ?? []);
  const caps = (String(text ?? '').replace(/„[^“”"]*[“”"]|"[^"]*"|“[^”]*”/g, ' ').match(/\p{Lu}[\p{Ll}-]+/gu) ?? []).map((x) => x.toLowerCase());
  const nouns = caps.filter((x) => NOUNS[x] !== undefined && NOUNS[x] !== x && !EN_TOO.has(x)).length;
  const de = ws.filter((x) => GERMAN_ONLY.has(x)).length + (/[äöüß]/i.test(ws.join(' ')) ? 1 : 0) + (nouns >= 2 || (nouns && ws.length === 1) ? nouns : 0);
  const en = ws.filter((x) => ENGLISH_SMALL.has(x)).length;
  return de >= 1 && de > en;
}
