// German scenes: a German prompt read word by word into the English words the engine draws by
// ("ein roter Hund läuft im Park" -> "a red dog walks in the park"), so everything the engine knows -
// pictures, colours, counts, feelings, actions, places, times, the weather - works in German too.
// What is said („Hallo!“) and the board's words stay as written. Words not known are left out (a
// figure of your own, "pgc1", stays). Nouns: src/lang-de-nouns.js (drafted, checked); the rest here.
import DRAFTED, { PLURAL, GENDER } from './lang-de-nouns.js';
import { isFirstName, isGirlName } from './story-reader.js';
import { parseText } from './text/matcher.js';
import { getConcept } from './concepts/index.js';

const w = (pairs) => Object.fromEntries(pairs.trim().split(/\n/).flatMap((line) => {
  const [de, en] = line.split('=').map((s) => s.trim());
  return de.split(/\s*,\s*/).map((d) => [d, en]);
}));

// Small words: articles, prepositions, joining words, pronouns
const GRAMMAR = w(`
daumenhoch = thumbsup
doch = but
jede, jeden, jedes, jeder = every
bald = soon
nichts = nothing
lachtvorfreude = smiles happy
ans = to the
sich = 
hebtdiehand = waves
esweinmal = once upon a time,
esregnet = it started to rain
esschneit = it started to snow
heim = home
zuhause = at home
etwas = a
schnell = quickly
einestages = one day
einesmorgens = one morning
einesabends = one evening
einesnachts = one night
amnächstentag = the next day
amnächstenmorgen = the next morning
namens, genannt, hieß, heißt = called
name, namen = name
ist, war = is
sind, waren = are
hat, hatte = has
haben, hatten = have
wurde = becomes
wurden = become
freunde, freundinnen = friends
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
weil = because
da = then
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
klatscht, klatschen, klatschte, applaudiert = cheers
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
wohnt, wohnte, wohnten, lebt, lebte, lebten = lives
wedelt, wedelte, wedeln = wags
bemerkt, bemerkte, bemerkten = notices
schluchzt, schluchzte, schnieft = cries
schickt, schickte, schickten = sends
erreicht, erreichte, erreichten = reaches
strahlt, strahlte, strahlten = smiles
fehlt, fehlte = is missing
sucht, suchte, suchten, suchen = looks for
vermisst, vermisste = misses
bekommt, bekam, bekamen, kriegt = gets
macht, machte, machten, machen = makes
setzte, setzten = sits
nimmt, nahm, nahmen, nehmen = takes
bringt, brachte, brachten, bringen = brings
trifft, traf, trafen, treffen = meets
hört, hörte, hören = listens
besucht, besuchte, besuchen = visits
gegangen, gelaufen, spazierengegangen = walks
gerannt = runs
gesprungen, gehüpft = jumps
getanzt = dances
gewinkt = waves
gelacht = laughs
gelächelt = smiles
geweint = cries
geschlafen, eingeschlafen, schlief ein = sleeps
gesessen = sits
gelesen = reads
geschrieben = writes
gegessen = eats
getrunken = drinks
geschwommen = swims
geflogen = flies
gefahren = drives
gespielt = plays
gesungen = sings
geworfen = throws
geklettert = climbs
gefallen, hingefallen = falls
gekommen, angekommen = comes
gesehen, geschaut, gesehn = looks
gesagt = says
gefragt = asks
gerufen, geschrien = shouts
gearbeitet = works
gekocht, gebacken = cooks
gemalt, gezeichnet = paints
gebaut = builds
geholfen = helps
gegeben, geschenkt = gives
gefunden = finds
umarmten = hug

`);

// (their plurals in the past: "klatschten", "gingen", "riefen")
for (const [k, v] of Object.entries(VERBS)) {
  const pl = /(te|ie)$/.test(k) ? `${k}n` : /[^t]$/.test(k) && !/(en|n)$/.test(k) && !/^ge/.test(k) && !k.includes(' ') ? `${k}en` : null;
  if (pl && VERBS[pl] === undefined) VERBS[pl] = v;
  // (and "erzählt" -> "erzählte", "erzählten")
  if (/[^s]t$/.test(k) && !/^ge/.test(k)) for (const f of [`${k}e`, `${k}en`]) if (VERBS[f] === undefined) VERBS[f] = v;
}

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
best = best
lieb = kind
mutig = brave
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
meer, meere, ozean = sea
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
nacht, nachts = night
abends, abend = evening
sonnenuntergang, abenddämmerung = sunset
morgen, morgens, vormittag = morning
tag, tagsüber = day
nachmittag, nachmittags, mittag, mittags = afternoon
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
milch = milk
sternchen, sternlein = star
eule, eulen = owl
himmel, himmels = sky
lichtstrahl, lichtstrahlen, strahl = sparkles

möwe, möwen = bird
mütze, mützen, kappe, kappen = billed cap
kakao, kakaos, heißgetränk = hot beverage
sandburg, sandburgen = sand castle
außerirdischer, außerirdische, außerirdischen, außerirdischem = alien
geschichte, geschichten = story
tafel, wandtafel, schultafel = board
mutter, mama, mami, mutti = mum
vater, papa, papi, vati = dad
schwester = sister
bruder = brother
eltern = parents
familie = family
welpe, welpen, hündchen = puppy
kätzchen = kitten
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

// Titles before a name ("Oma Rose", "Herr Braun", "Frau Müller")
const TITLE_WORDS = { oma: 'Grandma', omi: 'Grandma', opa: 'Grandpa', opi: 'Grandpa', herr: 'Mr', frau: 'Mrs', onkel: 'Uncle', tante: 'Aunt', könig: 'King', königin: 'Queen', prinz: 'Prince', prinzessin: 'Princess', kapitän: 'Captain', doktor: 'Dr', dr: 'Dr', lehrer: 'Teacher', lehrerin: 'Teacher', professor: 'Professor', professorin: 'Professor' };

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
export function bridgeGerman(text, { names = null, story = false } = {}) {
  const unknown = [];
  // (a few sayings of more than one word: "Daumen hoch" is a thumbs-up)
  // ("kommt herein" walks in, "in die Ferne" is into the distance, "zu Fuß" is just walking)
  text = String(text ?? '').replace(/(^|[^\p{L}])(?:mit )?(?:dem |den )?daumen (nach oben|hoch)(?![\p{L}])/giu, '$1daumenhoch')
    .replace(/(^|[^\p{L}])(kommt|kommen|kam|kamen) herein(?![\p{L}])/giu, '$1betritt')
    .replace(/(^|[^\p{L}])(?:geht|gehen|ging|läuft|laufen|lief) (\p{L}+ )?in die ferne(?: davon| weg)?(?![\p{L}])/giu, (m, a, who) => `${a}${who ?? ''}gehtfern`)
    .replace(/(^|[^\p{L}])zu fuß(?![\p{L}])/giu, '$1')
    .replace(/(^|[^\p{L}])in der nähe (?:von |vom |des |der )?/giu, '$1bei ')
    .replace(/(^|[^\p{L}])nach hause(?![\p{L}])/giu, '$1heim').replace(/(^|[^\p{L}])zu hause(?![\p{L}])/giu, '$1zuhause')
    .replace(/(^|[^\p{L}])mit (?:dem|seinem|ihrem) schwanz(?![\p{L}])/giu, '$1')
    .replace(/(^|[^\p{L}])heiße[nr]? schokolade(?![\p{L}])/giu, '$1kakao')
    .replace(/(^|[^\p{L}])(?:strahlt|strahlte|strahlten|lacht|lachte|lachten) vor freude(?![\p{L}])/giu, '$1lachtvorfreude')
    .replace(/(^|[^\p{L}])(?:zur|auf die|zu der) erde(?![\p{L}])/giu, '$1')
    // ("vorbei an schlafenden Dörfern": what goes by, not who is there)
    .replace(/,?\s*vorbei an [^.,;!?]*/giu, '')
    // ("hüpfte auf den Rücken der Eule": rides the owl)
    .replace(/(^|[^\p{L}])(?:hüpft|hüpfte|hüpften|springt|sprang|klettert|kletterte|steigt|stieg|setzt sich|setzte sich)\s+auf (?:den|seinen|ihren) rücken (?:der|des|von der|von dem|vom)\s+/giu, '$1reitet die ')
    .replace(/(^|[^\p{L}])(?:hebt|hob|hoben|heben) (?:die|ihre|seine) hand(?![\p{L}])|(^|[^\p{L}])(?:meldet|meldete) sich(?![\p{L}])/giu, (m, a, b) => `${a ?? b ?? ''}hebtdiehand`)
    .replace(/(^|[^\p{L}])(?:(?:fing|fängt) es an zu|es (?:fing|fängt) an zu|es begann zu|es beginnt zu) (regnen|schneien)(?![\p{L}])/giu, (m, a, w) => `${a}${/regnen/i.test(w) ? 'esregnet' : 'esschneit'}`)
    .replace(/(^|[^\p{L}])(?:kommt|kommen|kam|kamen|läuft|laufen|lief|geht|gehen|ging) auf (?:uns|mich|dich|die kamera) zu(?![\p{L}])/giu, '$1kommtzu')
    .replace(/(\d+) von (\d+)/gu, '$1 vonvon $2');
  const parts = String(text ?? '').split(/(„[^“”"]*[“”"]|"[^"]*"|“[^”]*”|«[^»]*»|⟦\d+⟧)/);
  const out = parts.map((part, i) => {
    // (what is said: as it is, in plain quotes; a story's quotes kept aside, ⟦0⟧, stay so)
    if (i % 2) return part.startsWith('⟦') ? ` ${part} ` : ` "${part.slice(1, -1).trim()}" `;
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
        const lw0 = word.toLowerCase();
        // (a story's names stay names: "Mia", "Rex"; a title before one is a title: "Oma Rose")
        if (names?.has(lw0) && /^\p{Lu}/u.test(word)) { toks.push({ en: word, kind: 'noun' }); continue; }
        if (names && TITLE_WORDS[lw0] && names.has((ws[n + 1] ?? '').toLowerCase())) { toks.push({ en: TITLE_WORDS[lw0], kind: 'adj' }); continue; }
        // ("sie": she when one does it, they when more than one do, else her)
        if (story && lw0 === 'sie') {
          const nextV = VERBS[(ws[n + 1] ?? '').toLowerCase()] !== undefined ? ws[n + 1] : null;
          // (after a verb: who does it only when nobody came before the verb - "Dann sah sie", not "Er sah sie")
          const before = ws[n - 2];
          const subjectBefore = before && (['noun', 'pron'].includes(kindOf(before)) || names?.has(before.toLowerCase()));
          const prevV = VERBS[(ws[n - 1] ?? '').toLowerCase()] !== undefined && !subjectBefore ? ws[n - 1] : null;
          const aux = /^(sind|waren|haben|hatten|wurden|werden)$/i.test(ws[n + 1] ?? '') ? 'they' : /^(ist|war|hat|hatte|wurde|wird)$/i.test(ws[n + 1] ?? '') ? 'she' : null;
          const v = nextV ?? prevV;
          if (aux && !v) { toks.push({ en: aux, kind: 'pron' }); continue; }
          toks.push({ en: v ? (/en$/i.test(v) ? 'they' : 'she') : n === 0 ? 'she' : 'her', kind: 'pron' });
          continue;
        }
        // ("ein leises Weinen", "das Lachen": a verb as a thing, a sound - not someone doing it)
        if (n > 0 && /^\p{Lu}/u.test(word) && VERBS[lw0] !== undefined && /^(ein|das|dem|vom|beim|zum|lautes?|leises?|lauten|leisen|fröhliches?|trauriges?)$/i.test(ws[n - 1])) { unknown.push(word); continue; }
        let en = germanWord(word);
        if (en == null) { unknown.push(word); continue; }
        // (more than one: "Hunde" -> dogs; "den Jungen" stays one boy, "den Kindern" is children)
        const lw = word.toLowerCase(), pl = PLURAL[lw];
        if (pl && en === NOUNS[lw]) {
          let b = n - 1;
          while (b > 0 && ADJ_FORMS[(ws[b] ?? '').toLowerCase()] !== undefined) b--;
          const before = (ws[b] ?? '').toLowerCase();
          const one = ONE_BEFORE.test(before) || (pl === 3 && before === 'den');
          // (the plural only when it is the same picture: "houses" is a picture of its own, a small icon)
          if (!one) { const pl = pluralEn(en), id = (w) => parseText(w).matches[0]?.id; if (id(pl) === id(en)) en = pl; }
        }
        toks.push({ en, kind: kindOf(word) });
      }
      // (who does it: a noun or a pronoun with its words, and more joined by "and" - "Tom und Rex";
      // the index after them, or -1)
      const subjectEnd = (e) => {
        if (toks[e]?.kind === 'pron') return e + 1;
        while (['art', 'num', 'adj'].includes(toks[e]?.kind)) e++;
        if (toks[e]?.kind !== 'noun') return -1;
        e++;
        while (toks[e]?.en === 'and') {
          let f = e + 1;
          while (['art', 'num', 'adj'].includes(toks[f]?.kind)) f++;
          if (!['noun', 'pron'].includes(toks[f]?.kind)) break;
          e = f + 1;
        }
        return e;
      };
      // (in a story, a verb at the end - "hat einen Hund gefunden", "weil er müde war" - goes back
      // after who does it, instead of "hat")
      if (story && toks.length > 2 && toks.at(-1).kind === 'verb' && !['noun', 'pron'].includes(toks.at(-2).kind) && !toks.slice(0, -1).some((t) => t.kind === 'verb')) {
        const who = toks.findIndex((t) => ['noun', 'pron', 'art'].includes(t.kind));
        const e = who >= 0 ? subjectEnd(who) : -1;
        if (e > 0 && e < toks.length - 1) {
          const verb = toks.pop();
          if (['has', 'have', 'is', 'are'].includes(toks[e].en)) toks[e] = verb; else toks.splice(e, 0, verb);
        }
      }
      // (the verb before who does it - the clause did not start with them: put it after them)
      // ("Unter einem Baum saß ein Sternchen": a place at the front, then the verb, then who)
      let lead = -1;
      if (/^(under|in|in the|on|over|behind|next to|in front of|at|at the|near|near the|between|through|around|from|from the|to the)$/.test(toks[0]?.en ?? '')) {
        let k = 1;
        while (['art', 'num', 'adj'].includes(toks[k]?.kind)) k++;
        if (toks[k]?.kind === 'noun') lead = k + 1;
      }
      for (let j = 1; j < toks.length - 1; j++) {
        if (toks[j].kind !== 'verb' || (['noun', 'pron'].includes(toks[j - 1].kind) && j !== lead)) continue;
        const e = subjectEnd(j + 1);
        if (e < 0) continue;
        const [verb] = toks.splice(j, 1);
        toks.splice(e - 1, 0, verb);
        j = e - 1;
      }
      return ` ${toks.map((t) => t.en).join(' ')} `;
    }).join('');
  });
  // ("fährt Fahrrad", "reitet ein Pferd": a bike, a scooter or a horse is ridden)
  const en = out.join('').replace(/\b(?:in|into|to) the space\b/g, 'in space').replace(/\b(drives|rides) (?:(a|the) )?(bike|bicycle|scooter|skateboard|horse|pony|motorcycle|motorbike)\b/g, (m, v, art, what) => `rides ${art ?? 'a'} ${what}`);
  return { text: en.replace(/\s+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim(), unknown };
}

// A German story, for the story reader (src/story-reader.js): who is named in it, and each scene
// in the engine's English words, so it is read like an English one - a cast kept, "er" and "sie"
// for the right one, the place and the time carried on. The captions stay as written.
const SAY_DE = /^(sagt|sagte|sagten|ruft|rief|riefen|fragt|fragte|antwortet|antwortete|flüstert|flüsterte|schreit|schrie|lacht|lachte|meint|meinte|bellt|bellte)$/i;
const NAME_AFTER = /^(namens|genannt|hieß|heißt|hießen|heißen)$/i;
const ARTICLE = /^(der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines|kein|keine|mein|meine|dein|deine|sein|seine|ihr|ihre|unser|unsere)$/i;
export function storyNames(text) {
  const names = new Set();
  const plain = String(text ?? '').replace(/„[^“”"]*[“”"]|"[^"]*"|“[^”]*”|«[^»]*»/g, ' , ');
  const ws = plain.match(/[\p{L}][\p{L}-]*|[.,;:!?]/gu) ?? [];
  for (let i = 0; i < ws.length; i++) {
    const word = ws[i];
    if (!/^\p{Lu}\p{Ll}/u.test(word)) continue;
    const lw = word.toLowerCase(), prev = ws[i - 1] ?? '.', next = (ws[i + 1] ?? '').toLowerCase();
    // (small words, verbs, places... at the start of a sentence are no names: "Dann", "Plötzlich")
    const grammar = [GRAMMAR, VERBS, ADJ_FORMS, NUMBERS, PLACES].some((t) => t[lw] !== undefined) || TITLE_WORDS[lw];
    if (grammar && !NAME_AFTER.test(prev) && !TITLE_WORDS[prev.toLowerCase()]) continue;
    const afterArticle = ARTICLE.test(prev) || ADJ_FORMS[prev.toLowerCase()] !== undefined;
    if (NAME_AFTER.test(prev) || TITLE_WORDS[prev.toLowerCase()] || SAY_DE.test(prev) || (isFirstName(lw) && !afterArticle)
      || (!afterArticle && NOUNS[lw] === undefined && germanWord(word) == null && (VERBS[next] !== undefined || SAY_DE.test(next) || next === ','))) names.add(lw);
  }
  return names;
}
const STORY_PHRASES = [
  [/(^|[^\p{L}])es war einmal(?![\p{L}])/giu, '$1esweinmal'],
  [/(^|[^\p{L}])eines (tages|morgens|abends|nachts)(?![\p{L}])/giu, (m, a, x) => `${a}eines${x.toLowerCase()}`],
  [/(^|[^\p{L}])am nächsten (tag|morgen)(?![\p{L}])/giu, (m, a, x) => `${a}amnächsten${x.toLowerCase()}`],
  [/(^|[^\p{L}])mit dem namen(?![\p{L}])/giu, '$1namens'],
  // ("ein Hund, der Rex hieß": a dog called Rex)
  [/,\s*(?:der|die|das)\s+(\p{Lu}[\p{L}-]*)\s+(?:hieß|heißt)(?![\p{L}])/gu, ' namens $1'],
];
/** For readStory's `translate`: a scene of a German story in the engine's English words */
// (a noun that can be "er", "sie" or "es" in a story: someone, an animal, or the moon, a star, the
// sun or a cloud)
const CHARACTER = /^(people|animals|wildlife)/;
const isCharacter = (lw) => {
  const en = NOUNS[lw];
  if (!en) return false;
  if (/^(moon|star|sun|cloud)$/.test(en)) return true;
  const m = parseText(en).matches;
  return m.length === 1 && CHARACTER.test(getConcept(m[0].id)?.category ?? '');
};
// German "er", "sie" and "es" are for the last one of that gender ("der Mond … er", "das Sternchen …
// es", "die Eule … sie"), not for a boy or a girl: each is written as who it is before reading
function pronounsFor(names) {
  const refs = { m: null, f: null, n: null };
  const recent = []; // (who was spoken of, the last one last: "sie" for more than one is the last two)
  const said = (ref) => { const k = ref.name ?? ref.noun.toLowerCase(); const at = recent.findIndex((r) => (r.name ?? r.noun.toLowerCase()) === k); if (at >= 0) recent.splice(at, 1); recent.push(ref); };
  const ART = { m: 'der', f: 'die', n: 'das' };
  const as = (ref) => ref.name ?? `${ART[ref.g]} ${ref.noun}`;
  return (t) => {
    const ws = [...t.matchAll(/⟦\d+⟧|[\p{L}][\p{L}-]*|[.,;:!?]/gu)];
    let out = '', last = 0;
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i][0], lw = w.toLowerCase();
      const prev = (ws[i - 1]?.[0] ?? '').toLowerCase(), next = (ws[i + 1]?.[0] ?? '').toLowerCase();
      if (names.has(lw) && /^\p{Lu}/u.test(w)) { said(refs[isGirlName(lw) ? 'f' : 'm'] = { name: w }); continue; }
      if (/^\p{Lu}/u.test(w) && GENDER[lw] && isCharacter(lw)) {
        said(refs[GENDER[lw]] = { noun: w, g: GENDER[lw] });
        // (das Mädchen is "sie" too)
        if (/^(mädchen|fräulein|mädel)$/.test(lw)) refs.f = refs.n;
        continue;
      }
      const verbNear = VERBS[next] !== undefined || VERBS[prev] !== undefined || SAY_DE.test(prev) || SAY_DE.test(next);
      let g = null;
      if (lw === 'er' || lw === 'ihn') g = 'm';
      else if (lw === 'ihm') g = refs.m ? 'm' : 'n';
      else if (lw === 'es' && verbNear && !/^(regnet|regnete|schneit|schneite|gibt|gab)$/.test(next)) g = 'n';
      else if (lw === 'sie') {
        // (they, when the verb is for more than one: "sie flogen")
        const v = VERBS[next] !== undefined ? next : VERBS[prev] !== undefined ? prev : '';
        if (!/en$/.test(v) && !/^(sind|waren|haben|hatten)$/.test(next)) g = 'f';
        // (more than one: the last two spoken of - "Das Sternchen hüpfte auf die Eule. Gemeinsam flogen sie")
        else if (recent.length >= 2) {
          out += t.slice(last, ws[i].index) + `${as(recent.at(-2))} und ${as(recent.at(-1))}`;
          last = ws[i].index + w.length;
          continue;
        }
      }
      const ref = g && refs[g];
      if (!ref) continue;
      const art = { m: lw === 'ihn' ? 'den' : lw === 'ihm' ? 'dem' : 'der', f: 'die', n: 'das' }[g];
      out += t.slice(last, ws[i].index) + (ref.name ?? `${art} ${ref.noun}`);
      last = ws[i].index + w.length;
    }
    return out + t.slice(last);
  };
}

export function germanStory(text) {
  const names = storyNames(text);
  const who = pronounsFor(names);
  const translate = (scene) => {
    let t = String(scene ?? '');
    for (const [re, to] of STORY_PHRASES) t = t.replace(re, to);
    t = who(t);
    const en = bridgeGerman(t, { names, story: true }).text
      // (seeing someone is looking at them: "sah einen Hund")
      .replace(/\blooks (?=(?:a|an|the|some|two|three|many|her|him|them)\b|\p{Lu})/gu, 'sees ')
      .replace(/(^|[.!?…]\s+)(\p{Ll})/gu, (m, a, c) => a + c.toUpperCase());
    return en;
  };
  // (the German words of a scene that are not drawn, for "How I read your story")
  translate.leftOut = (scene) => {
    let t = String(scene ?? '');
    for (const [re, to] of STORY_PHRASES) t = t.replace(re, to);
    return [...new Set(bridgeGerman(t, { names, story: true }).unknown)];
  };
  return translate;
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
