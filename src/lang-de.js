// German scenes: a German prompt read word by word into the English words the engine draws by
// ("ein roter Hund läuft im Park" -> "a red dog walks in the park"), so everything the engine knows -
// pictures, colours, counts, feelings, actions, places, times, the weather - works in German too.
// What is said („Hallo!“) and the board's words stay as written. Words not known are left out (a
// figure of your own, "pgc1", stays). Nouns: src/lang-de-nouns.js (drafted, checked); the rest here.
import NOUNS from './lang-de-nouns.js';

const w = (pairs) => Object.fromEntries(pairs.trim().split(/\n/).flatMap((line) => {
  const [de, en] = line.split('=').map((s) => s.trim());
  return de.split(/\s*,\s*/).map((d) => [d, en]);
}));

// Small words: articles, prepositions, joining words, pronouns
const GRAMMAR = w(`
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
        const en = germanWord(word);
        if (en == null) { unknown.push(word); continue; }
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
const ENGLISH_SMALL = new Set('a an the and or is are was were of to with on at he she it they his her their this that then while says'.split(' '));

/** True when a prompt is German: German small words, verbs or describing words, and no English ones */
export function isGermanPrompt(text) {
  const ws = (String(text ?? '').replace(/„[^“”"]*[“”"]|"[^"]*"|“[^”]*”/g, ' ').toLowerCase().match(/\p{L}+/gu) ?? []);
  const de = ws.filter((x) => GERMAN_ONLY.has(x)).length + (/[äöüß]/i.test(ws.join(' ')) ? 1 : 0);
  const en = ws.filter((x) => ENGLISH_SMALL.has(x)).length;
  return de >= 1 && de > en;
}
