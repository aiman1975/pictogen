// Arabic scenes: an Arabic prompt read into the engine's English words ("فتاة صغيرة تمشي في الحديقة"
// -> "a small girl walks in the park"), so the picture comes from the Arabic. What is said («مرحبا!»)
// stays as it is. Small words, verbs (with their forms), describing words (with their endings),
// numbers, places and times are written here by hand; nouns come from src/lang-ar-nouns.js (drafted,
// checked). Arabic puts small words on the front of a word ("و" and, "ب" with/in, "ل" to, "ال" the:
// "وبالبالون") and "his/her" on the end ("كلبها"): a word is looked up whole first, then without
// them. Describing words come after their noun ("فتاة صغيرة") and a verb often before who does it
// ("تمشي الفتاة"): both are put the English way round.
import NOUNS, { PLURAL, GENDER } from './lang-ar-nouns.js';
import { normalArabic } from './lang-ar-normal.js';
import { parseText } from './text/matcher.js';
import { getConcept } from './concepts/index.js';

export { normalArabic };
const w = (pairs) => Object.fromEntries(pairs.trim().split(/\n/).flatMap((line) => {
  const [ar, en] = line.split('=').map((s) => s.trim());
  return ar.split(/\s*,\s*/).map((a) => [normalArabic(a), en]);
}));

// Small words
const GRAMMAR = w(`
في = in
على = on
تحت = under
فوق = over
بجانب, بجوار, قرب, قرب من, عند = next to
امام = in front of
خلف, وراء = behind
بين = between
مع = with
الي, نحو = to
من = from
حول = around
عبر = through
و = and
او = or
لكن = but
ثم, بعدها, بعد ذلك = then
هو = he
هي = she
هم, هما, هن = they
مثل = like
جدا = very
معا = together
ايضا = also
هناك, يوجد, توجد, بها, به, فيها, فيه =
يرفع ابهامه, ترفع ابهامها, ابهام لاعلي = thumbsup
الذي, التي, الذين =
ان, انه, انها, قد, لقد, كان, كانت, احدي =
ذات يوم, ذات مره, في يوم من الايام, يوما ما =
مفقود, مفقوده, ضائع, ضائعه, ضايع, ضايعه = is missing
`);

// Doing: verb forms (he/she, now and before) -> what the engine animates; the forms for more than
// one or two of them ("يمشون", "يمشيان") are made from these below
const VERBS = w(`
يمشي, تمشي, مشي, مشت, يسير, تسير, سار, سارت, يتمشي, تتمشي, يذهب, تذهب, ذهب, ذهبت, راح, راحت, يعود, تعود, عاد, عادت, يرجع, ترجع, رجع, رجعت = walks
يركض, تركض, ركض, ركضت, يجري, تجري, جري, جرت = runs
يقفز, تقفز, قفز, قفزت, ينط, تنط = jumps
يرقص, ترقص, رقص, رقصت = dances
يلوح, تلوح, لوح, لوحت = waves
يشير, تشير, اشار, اشارت = points
يضحك, تضحك, ضحك, ضحكت = laughs
يبتسم, تبتسم, ابتسم, ابتسمت = smiles
يبكي, تبكي, بكي, بكت = cries
ينام, تنام, نام, نامت = sleeps
يجلس, تجلس, جلس, جلست = sits
يتارجح, تتارجح, تارجح, تارجحت, يتمرجح, تتمرجح, تمرجح, تمرجحت = swings
يقف, تقف, وقف, وقفت = stands
يقرا, تقرا, قرا, قرات = reads
يكتب, تكتب = writes
ياكل, تاكل, اكلت = eats
يشرب, تشرب, شرب, شربت = drinks
يسبح, تسبح, سبح, سبحت = swims
يطير, تطير, طار, طارت, يحلق, تحلق, حلق, حلقت = flies
يبتعد, تبتعد, ابتعد, ابتعدت = walks away
يكتشف, تكتشف, اكتشف, اكتشفت = discovers
يهز, تهز, هز, هزت = wags
يقود, تقود, قاد, قادت = drives
يركب, تركب, ركب, ركبت = rides
يلعب, تلعب, لعب, لعبت = plays
يغني, تغني, غني, غنت = sings
يفكر, تفكر, فكر, فكرت = thinks
يحلم, تحلم, حلم, حلمت = dreams
يصفق, تصفق, صفق, صفقت = cheers
يعانق, تعانق, عانق, عانقت, يحضن, تحضن, حضن, حضنت = hugs
يحمل, تحمل, حمل, حملت, يمسك, تمسك, امسك, امسكت = holds
يرمي, ترمي, رمي, رمت = throws
يتسلق, تتسلق, تسلق, تسلقت = climbs
يسقط, تسقط, سقط, سقطت, يقع, تقع, وقع, وقعت = falls
ياتي, تاتي, اتي, اتت, جاء, جاءت, يظهر, تظهر, ظهر, ظهرت = comes
يدخل, تدخل, دخل, دخلت = walks in
يغادر, تغادر, غادر, غادرت = leaves
ينظر, تنظر, نظر, نظرت, يشاهد, تشاهد, شاهد, شاهدت, يري, تري, راي, رات, يلاحظ, تلاحظ, لاحظ, لاحظت = looks
يتكلم, تتكلم, تكلم, تكلمت, يتحدث, تتحدث, تحدث, تحدثت = talks
يقول, تقول, قال, قالت = says
يسال, تسال, سال, سالت = asks
يصرخ, تصرخ, صرخ, صرخت, يصيح, تصيح, صاح, صاحت, ينادي, تنادي, نادي, نادت = shouts
يهمس, تهمس, همس, همست = whispers
يعمل, تعمل, عمل, عملت = works
يطبخ, تطبخ, طبخ, طبخت = cooks
يرسم, ترسم = paints
يبني, تبني, بني = builds
يدرس, تدرس, درس, درست, يتعلم, تتعلم, تعلم, تعلمت = studies
يدور, تدور, دار, دارت = spins
يغوص, تغوص, غاص, غاصت = dives
ينبح, نبح = barks
يعطي, تعطي, اعطي, اعطت = gives
يجد, تجد, وجد, وجدت = finds
ينتظر, تنتظر, انتظر, انتظرت = waits
يساعد, تساعد, ساعد, ساعدت = helps
تمطر, امطرت = rains
تشرق, اشرقت, يلمع, تلمع = shines
`);
// (more than one, two: "يمشون", "تمشيان", "مشوا")
for (const [k, v] of Object.entries(VERBS)) {
  // ("يقرأ": "يقرآن" is written "يقران" here, its two alifs one)
  const more = /^[يت]/.test(k) ? [k.replace(/ي$/, '') + 'ون', /ا$/.test(k) ? `${k}ن` : `${k}ان`] : [`${k.replace(/[يا]$/, '')}وا`];
  for (const f of more) VERBS[f] ??= v;
}

// Describing: the masculine form (with its feminine and plurals made below, and listed where they
// are not: colours "حمراء")
const ADJ = w(`
احمر, حمراء, حمر = red
ازرق, زرقاء, زرق = blue
اخضر, خضراء, خضر = green
اصفر, صفراء, صفر = yellow
اسود, سوداء, سود = black
ابيض, بيضاء, بيض = white
برتقالي = orange
بنفسجي, ارجواني = purple
وردي, زهري = pink
بني = brown
رمادي = gray
ذهبي = gold
فضي = silver
ملون = colorful
كبير, كبار = big
صغير, صغار = small
ضخم = huge
طويل = tall
قصير = short
سمين = fat
نحيف = thin
قديم = old
سعيد, فرحان, مسرور = happy
حزين = sad
غاضب, زعلان = angry
متفاجئ, مندهش = surprised
نعسان, متعب = sleepy
خائف = scared
متحمس = excited
محتار, مرتبك = confused
خجول = shy
فخور = proud
قلق = worried
مريض = sick
لطيف = cute
مضحك = funny
مبلل = wet
بارد = cold
حار = hot
مظلم = dark
جميل = beautiful
ساطع, مشرق = bright
مشمس = sunny
ودود = friendly
`);
// (feminine and plural: "صغيرة", "صغيرون", "صغيرات")
for (const [k, v] of Object.entries(ADJ)) for (const f of [`${k}ه`, `${k}ون`, `${k}ين`, `${k}ات`]) ADJ[f] ??= v;

// Counting (Arabic-Indic digits are read as 0-9 already)
const NUMBERS = w(`
واحد, واحده = one
اثنان, اثنين, اثنتان, اثنتين = two
ثلاثه, ثلاث = three
اربعه, اربع = four
خمسه, خمس = five
سته, ست = six
سبعه, سبع = seven
ثمانيه, ثماني = eight
تسعه, تسع = nine
عشره, عشر = ten
كثير, كثيره, العديد, عده = many
بعض = some
`);

// Places, times, the weather (before the nouns: "حديقة" is a place, not a picture)
const PLACES = w(`
حديقه, منتزه, حدائق = park
غابه, غابات = forest
شاطئ, شاطي = beach
بحر, محيط, بحيره = sea
مدينه, مدن = city
صحراء = desert
مزرعه = farm
جبل, جبال = mountains
فضاء = space
مدرسه = school
فصل, صف = classroom
مطبخ = kitchen
غرفه النوم = bedroom
غرفه = room
مكتب, مكاتب = office
تحت البحر, تحت الماء, قاع البحر = underwater
ليله = night
شارع, طريق = street
نهر, انهار = river
ملعب, ملاعب, ملعب الاطفال, حديقه الالعاب, مدينه الالعاب = playground
قلعه, قصر = castle
سماء = sky
ليل, ليلا, الليل, ليالي, ليلة = night
صباح, صباحا = morning
مساء, مساءا = evening
نهار, نهارا = day
غروب = sunset
مطر, ممطر = rain
ثلج, ثلوج = snow
شتاء = winter
صيف = summer
خريف = autumn
ربيع = spring
`);

// Nouns written here (they come before the drafted ones)
const OWN = w(`
طفل = child
اطفال, اولاد = children
بنات = girls
ناس = people
عائله, اسره = family
اصدقاء = friends
حيوانات = animals
ماء, مياه = water
شجره تفاح, شجره التفاح = apple tree
احادي القرن, يونيكورن = unicorn
قهوه = coffee
شاي = tea
هاتف, هواتف = phone
غواص = diver
غواصه = woman diver
فارس, فرسان = knight
ارجوحه, ارجوحات, اراجيح, مرجيحه, مراجيح, مرجوحه = swing
سي سو, سيسو, ارجوحه التوازن, ارجوحه الميزان, ميزان الاطفال = seesaw
صندوق رمل, صندوق الرمل, حوض رمل, حوض الرمل = sandbox
هيكل التسلق, لعبه التسلق, جهاز التسلق, برج التسلق = climbing frame
دواره, دوامه الالعاب, الدواره = roundabout
ترامبولين, ترامبولينات, نطاطه = trampoline
ارجوحه شبكيه, شبكه النوم, هاماك = hammock
سياج, سور, اسوار, سياجات = fence
بوابه, بوابات, باب الحديقه = gate
اشاره المرور, اشارات المرور, اشاره ضوئيه, اشاره مرور = traffic light
فانوس, فوانيس = lantern
عمود اناره, عمود الاناره, مصباح الشارع, اعمده الاناره = street lamp
ممر المشاه, خطوط المشاه = crosswalk
لعبه, العاب = toy
دميه, دمي, عروسه = doll
طباشير, طبشوره = chalk
مجرفه, رفش, مجارف = spade
دراجه ثلاثيه, دراجه بثلاث = tricycle
حقيبه مدرسيه, حقيبه المدرسه, شنطه المدرسه = backpack
شوكه = fork
قدر, طنجره, حله = pot
عصير = juice
مصباح, لمبه, اباجوره, ابجوره, مصابيح = lamp
درج, سلالم, درجات = stairs
سجاده, سجاجيد, بساط = rug
وساده, مخده, وسائد, مخدات = cushion
بطانيه, لحاف, بطانيات = blanket
خزانه, دولاب, خزانه الملابس = wardrobe
منشفه, مناشف, فوطه = towel
كنز, كنوز, صندوق الكنز = treasure chest
شجيره, شجيرات = bush
كهف, كهوف, مغاره = cave
برج, ابراج = tower
رافعه, رافعات, ونش = crane
حفاره, جرافه, بلدوزر, حفارات = digger
سله المهملات, صندوق القمامه, حاويه, سله القمامه = bin
عربه يد, عربه اليد = wheelbarrow
مرشه, ابريق الري, رشاش الماء = watering can
سنجاب, سناجب = squirrel
جسر, جسور, كوبري = bridge
ساعه حائط, ساعه الحائط = clock
عربه اطفال, عربه الاطفال = stroller
خروف, خراف, غنم = sheep
`);

// First names: a girl or a boy in a scene (a story keeps them as characters)
const GIRLS = 'سارة مريم فاطمة ليلى نور زينب هدى سلمى ريم آية ياسمين جنى لينا رنا دانة حلا مايا لمى سما رهف هند عائشة خديجة أمل منى ندى رغد جود تالا ميرا يارا'.split(' ').map(normalArabic);
const BOYS = 'محمد أحمد علي عمر يوسف خالد آدم حسن حسين كريم رامي سامي زياد مازن ياسر طارق إبراهيم مصطفى عبدالله حمزة سليم بلال أنس مروان نادر هادي وليد ماجد'.split(' ').map(normalArabic);
export const NAMES = Object.fromEntries([...GIRLS.map((n) => [n, 'girl']), ...BOYS.map((n) => [n, 'boy'])]);

// Titles before a name ("الجدة سلمى" is a grandmother called Salma) are nouns here
const KNOWN = { ...NOUNS, ...OWN, ...NAMES, ...ADJ, ...VERBS, ...NUMBERS, ...GRAMMAR, ...PLACES };
const kindIn = (lw) => (PLACES[lw] !== undefined ? 'place' : VERBS[lw] !== undefined ? 'verb' : NUMBERS[lw] !== undefined ? 'num' : ADJ[lw] !== undefined ? 'adj'
  : NOUNS[lw] !== undefined || OWN[lw] !== undefined || NAMES[lw] !== undefined ? 'noun' : /^(هو|هي|هم|هما|هن)$/.test(lw) ? 'pron' : 'other');

// Small words in front of a word ("و" and, "ف" so, "ب" with/in, "ل" to/for, "ك" like, "ال" the) and
// "his", "her", "their" at its end, the shortest first: a word is looked up as it is, then without them
const FRONT = [['وبال', 'and with the'], ['وال', 'and the'], ['فال', 'the'], ['بال', 'with the'], ['كال', 'like the'], ['ولل', 'and to the'], ['لل', 'to the'], ['ال', 'the'],
  ['وب', 'and with'], ['ول', 'and to'], ['و', 'and'], ['ف', ''], ['ب', 'with'], ['ل', 'to'], ['ك', 'like']];
const BACK = ['هما', 'هم', 'هن', 'ها', 'كم', 'نا', 'ه', 'ك', 'ي', 'ا'];

/** An Arabic word read: { en, kind, front: the small words in front (in English), plural: 1 | 2 } or null */
export function arabicWord(word) {
  const lw = normalArabic(word);
  if (!lw) return null;
  const tries = [[lw, '']];
  for (const [f, en] of FRONT) if (lw.startsWith(f) && lw.length - f.length >= 2) tries.push([lw.slice(f.length), en]);
  for (const [stem, front] of tries) {
    const forms = [stem];
    for (const b of BACK) {
      if (!stem.endsWith(b) || stem.length - b.length < 2) continue;
      const s = stem.slice(0, -b.length);
      forms.push(s);
      // ("قطتها": a word ending in ة takes ت before "her")
      if (s.endsWith('ت')) forms.push(`${s.slice(0, -1)}ه`);
    }
    for (const f of forms) {
      if (KNOWN[f] === undefined) continue;
      // (a word with "the" on it is a thing, not a verb: "الكتب" are books, "كتب" he wrote)
      if (front.includes('the') && VERBS[f] !== undefined && NOUNS[f] === undefined) continue;
      // (a place is a place - "الشاطئ", "المدينة" - not the picture of one)
      const own = OWN[f] ?? (front.includes('the') && NOUNS[f] !== undefined && PLACES[f] === undefined ? NOUNS[f] : null);
      const en = own ?? KNOWN[f];
      // (a word written here says how many itself: "أطفال" is children)
      return { en, kind: own ? 'noun' : kindIn(f), front, stem: f, ...(PLURAL[f] && OWN[f] === undefined && (own || PLACES[f] === undefined) ? { plural: PLURAL[f] } : {}) };
    }
  }
  return null;
}

// An English noun as more than one ("dog" -> "dogs", "child" -> "children")
const IRREGULAR = { child: 'children', man: 'men', woman: 'women', person: 'people', mouse: 'mice', foot: 'feet', tooth: 'teeth', sheep: 'sheep', fish: 'fish', deer: 'deer', baby: 'babies', knife: 'knives', leaf: 'leaves', wolf: 'wolves', bus: 'buses', potato: 'potatoes', tomato: 'tomatoes', hero: 'heroes' };
const pluralEn = (en) => {
  if (en.split(' ').length > 2) return en;
  const [, front, last] = en.match(/^(.*?)(\S+)$/);
  return front + (IRREGULAR[last] ?? (/(s|x|z|ch|sh)$/.test(last) ? `${last}es` : /[^aeiou]y$/.test(last) ? `${last.slice(0, -1)}ies` : `${last}s`));
};

/**
 * An Arabic prompt in the engine's English words. What is said (in «…», "…" or “…”) is kept as it
 * is; so are punctuation and numbers. Describing words go before their noun, a verb at the front
 * after who does it. { text, unknown: [Arabic words left out] }
 */
export function bridgeArabic(text, { names = null, story = false } = {}) {
  const unknown = [];
  const parts = String(text ?? '').split(/(«[^»]*»|"[^"]*"|“[^”]*”|⟦\d+⟧)/);
  const out = parts.map((part, i) => {
    if (i % 2) return part.startsWith('⟦') ? ` ${part} ` : ` "${part.slice(1, -1).trim()}" `;
    // (each clause, between the punctuation; Arabic's own ، ؛ ؟ too)
    return part.split(/([,.;:!?،؛؟])/).map((clause, k) => {
      if (k % 2) return { '،': ',', '؛': ';', '؟': '?' }[clause] ?? clause;
      const toks = [];
      const ws = clause.match(/[\p{L}\p{N}][\p{L}\p{N}ً-ٰٟـ-]*/gu) ?? [];
      for (let n = 0; n < ws.length; n++) {
        const word = ws[n];
        // (two words that are one thing: "كرة قدم", "غرفة النوم")
        const two = n + 1 < ws.length ? normalArabic(`${word} ${ws[n + 1]}`) : null;
        if (two && KNOWN[two] !== undefined) { toks.push({ en: KNOWN[two], kind: kindIn(two) }); n++; continue; }
        // (and with small words on the front of the first: "السي سو", "وأرجوحة شبكية")
        const front2 = two && FRONT.find(([f]) => two.startsWith(f) && KNOWN[two.slice(f.length)] !== undefined && two.indexOf(' ') - f.length >= 2);
        if (front2) {
          if (front2[1].startsWith('and')) toks.push({ en: 'and', kind: 'other' });
          const rest = two.slice(front2[0].length);
          toks.push({ en: KNOWN[rest], kind: kindIn(rest) }); n++; continue;
        }
        // ("الحرف ب", "حرف الباء": a letter figure; "الرقم ٣": a number figure)
        if (/^(ال)?حرف$/.test(normalArabic(word)) && /^\p{L}$/u.test(ws[n + 1] ?? '')) { toks.push({ en: `letter ${ws[++n]}`, kind: 'noun' }); continue; }
        if (/^(ال)?(رقم|عدد)$/.test(normalArabic(word)) && /^[0-9٠-٩]$/.test(ws[n + 1] ?? '')) { toks.push({ en: `number ${normalArabic(ws[++n])}`, kind: 'noun' }); continue; }
        if (/^[0-9٠-٩]+$/.test(word)) { toks.push({ en: normalArabic(word), kind: 'num' }); continue; }
        // (words in Latin letters stay: a character's key "pgc21", a name)
        if (/^[A-Za-z]/.test(word)) { toks.push({ en: word, kind: /^pgc\d+$|^[A-Z]/.test(word) ? 'noun' : 'other' }); continue; }
        // (a story's names stay names: "سارة" is Sara, "وسارة" and Sara)
        const nw = normalArabic(word);
        const nm = names && (names.has(nw) ? [nw, ''] : /^[وف]/.test(nw) && names.has(nw.slice(1)) ? [nw.slice(1), nw[0] === 'و' ? 'and' : ''] : null);
        if (nm) { if (nm[1]) toks.push({ en: nm[1], kind: 'other' }); toks.push({ en: names.get(nm[0]), kind: 'noun' }); continue; }
        // (in a story: "اسمها", "تدعى" - what someone is called)
        // ("فتاة صغيرة اسمها سارة": a small girl called Sara; on its own, "her name is")
        if (story && /^(اسمها|اسمه)$/.test(nw)) { toks.push({ en: ['noun', 'adj'].includes(toks.at(-1)?.kind) ? 'called' : nw === 'اسمها' ? 'her name is' : 'his name is', kind: 'other' }); continue; }
        if (story && /^(يدعي|تدعي|يسمي|تسمي|يدعا|تدعا)$/.test(nw)) { toks.push({ en: 'called', kind: 'other' }); continue; }
        const r = arabicWord(word);
        if (!r) { unknown.push(word); continue; }
        // (someone missing matters to a story - they are not drawn - and to a picture not at all)
        if (r.en === 'is missing' && !story) continue;
        // (in a story, someone met without "the" is "a": "فتاة صغيرة" -> "a small girl", as the reader expects)
        if (story && r.kind === 'noun' && !r.front.includes('the') && !r.plural && !['art', 'num'].includes(toks.at(-1)?.kind)) toks.push({ en: 'a', kind: 'art' });
        if (r.front && r.kind !== 'verb' && r.kind !== 'adj') for (const f of r.front.split(' ').filter(Boolean)) toks.push({ en: f, kind: f === 'the' ? 'art' : 'other' });
        // (two of them: "كلبان" -> "two dogs"; more: "كلاب" -> "dogs")
        if (r.plural === 2) toks.push({ en: 'two', kind: 'num' });
        if (r.en) toks.push({ en: r.plural ? pluralEn(r.en) : r.en, kind: r.kind });
      }
      // Describing words after a noun go before it ("فتاة صغيرة" -> "small girl")
      for (let j = 1; j < toks.length; j++) {
        if (toks[j].kind !== 'adj') continue;
        let a = j;
        while (toks[a + 1]?.kind === 'adj' || (toks[a + 1]?.en === 'the' && toks[a + 2]?.kind === 'adj')) a += toks[a + 1].en === 'the' ? 2 : 1;
        let s = j - 1;
        if (toks[s]?.kind !== 'noun') continue;
        while (s > 0 && ['art', 'num'].includes(toks[s - 1].kind)) s--;
        const adjs = toks.slice(j, a + 1).filter((t) => t.kind === 'adj');
        toks.splice(j, a - j + 1);
        // (after "the", before the noun: "the small girl")
        let at = s;
        while (['art', 'num'].includes(toks[at]?.kind)) at++;
        toks.splice(at, 0, ...adjs);
        j = at + adjs.length;
      }
      // A verb before who does it ("تمشي الفتاة في الحديقة"): after them
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
      for (let j = 0; j < toks.length - 1; j++) {
        if (toks[j].kind !== 'verb' || ['noun', 'pron'].includes(toks[j - 1]?.kind)) continue;
        const e = subjectEnd(j + 1);
        if (e < 0) continue;
        const [verb] = toks.splice(j, 1);
        toks.splice(e - 1, 0, verb);
        j = e - 1;
      }
      return ` ${toks.map((t) => t.en).filter(Boolean).join(' ')} `;
    }).join('');
  });
  const en = out.join('').replace(/\b(drives|rides) (?:(a|the) )?(bike|bicycle|scooter|skateboard|horse|pony|motorcycle|motorbike)\b/g, (m, v, art, what) => `rides ${art ?? 'a'} ${what}`);
  return { text: en.replace(/\s+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim(), unknown };
}

/** True when a prompt is Arabic: more Arabic letters than Latin ones (what is said aside) */
export function isArabicPrompt(text) {
  const s = String(text ?? '').replace(/«[^»]*»|"[^"]*"|“[^”]*”/g, ' ');
  return (s.match(/[ء-ي]/g) ?? []).length > (s.match(/[A-Za-z]/g) ?? []).length;
}

// Diagram topics named in Arabic ("دورة الماء", "أجزاء النبات")
const ARABIC_TOPICS = {
  plant: /(اجزاء (ال)?(نبات|نبته)|اجزاء الزهره)/,
  tree: /اجزاء (ال)?شجره/,
  body: /(جسم (ال)?انسان|اجزاء (ال)?جسم)/,
  water_cycle: /(دوره (ال)?ماء|(ال)?دوره (ال)?مائيه)/,
  volcano: /بركان|براكين/,
  earth: /طبقات (ال)?ارض|باطن (ال)?ارض/,
  solar_system: /(المجموعه الشمسيه|النظام الشمسي|الكواكب)/,
  butterfly_cycle: /(دوره حياه (ال)?فراشه|تحول (ال)?فراشه)/,
};
/** A diagram topic named in Arabic, or null */
export function findArabicDiagram(text) {
  const t = normalArabic(text);
  for (const [id, re] of Object.entries(ARABIC_TOPICS)) if (re.test(t)) return id;
  return null;
}

// ---------------------------------------------------------------------------------------------
// Arabic stories, for the story reader (src/story-reader.js): who is named, and each scene in the
// engine's English words, so a story is read like an English one - its cast kept from scene to scene.
// Arabic often leaves out who does something - the verb says it: "ذهبت إلى الحديقة" (she went to the
// park), "ذهب" (he went) - so the last one of that gender is put back in; "هو", "هي" and "هم" are who
// they stand for. Names are kept as names (in Latin letters for the reader; shown in Arabic again).

// The first names, in Latin letters (the reader knows them as a girl's or a boy's)
const LATIN_GIRLS = 'Sara Maryam Fatima Layla Nour Zainab Huda Salma Reem Aya Yasmin Jana Lina Rana Dana Hala Maya Lama Sama Rahaf Hind Aisha Khadija Amal Mona Nada Raghad Jood Tala Mira Yara'.split(' ');
const LATIN_BOYS = 'Mohammed Ahmed Ali Omar Yusuf Khaled Adam Hassan Hussein Karim Rami Sami Ziad Mazen Yasser Tariq Ibrahim Mustafa Abdullah Hamza Salim Bilal Anas Marwan Nader Hadi Walid Majed'.split(' ');
const LATIN = Object.fromEntries([...GIRLS.map((n, i) => [n, LATIN_GIRLS[i]]), ...BOYS.map((n, i) => [n, LATIN_BOYS[i]])]);
// (a name not in the lists: its letters in Latin ones, enough to tell it apart)
const ROMAN = { ا: 'a', ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh', د: 'd', ذ: 'dh', ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z', ع: 'a', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', و: 'w', ي: 'y', ء: '', ئ: 'e', ؤ: 'o' };
const latinOf = (n) => LATIN[n] ?? (([...n].map((c) => ROMAN[c] ?? '').join('') || 'Nameless').replace(/^./, (c) => c.toUpperCase()));

// A verb's who: 'f' she, 'm' he, 'p' more than one ("تمشي"/"يمشي", "ذهبت"/"ذهب", "يمشون")
const VERB_WHO = {};
for (const k of Object.keys(VERBS)) {
  if (/^ي/.test(k) && VERBS[`ت${k.slice(1)}`] !== undefined) { VERB_WHO[k] = 'm'; VERB_WHO[`ت${k.slice(1)}`] = 'f'; }
  if (VERBS[`${k}ت`] !== undefined && !/^[يت]/.test(k)) { VERB_WHO[k] ??= 'm'; VERB_WHO[`${k}ت`] = 'f'; }
}
for (const k of Object.keys(VERBS)) if (/(ون|وا|ان)$/.test(k) && k.length > 4 && !VERB_WHO[k]) VERB_WHO[k] = 'p';
// (the rest by their look: "تـ..." she now, "يـ..." he now, "...ت" she before - "رأت" - else he)
for (const k of Object.keys(VERBS)) VERB_WHO[k] ??= /^ت/.test(k) ? 'f' : /^ي/.test(k) ? 'm' : /ت$/.test(k) ? 'f' : 'm';
const INTRANSITIVE = /^(comes|walks|walks in|walks away|runs|flies|sits|sleeps|jumps|dances|cries|laughs|smiles|stands|swims|falls|leaves|shines)$/;
const ARTICLE_FREE = new Set(['ثم', 'و', 'ف', 'فجاه', 'وفجاه', 'بعدها', 'عندها', 'هناك', 'هنا', 'بعد', 'ذلك', 'في', 'النهايه', 'اخيرا', 'وهنا']);
const isCharacter = (en) => /^(moon|star|sun|cloud)$/.test(en) || (/^[A-Z]/.test(en) ? true : (() => { const m = parseText(en).matches; return m.length === 1 && /^(people|animals|wildlife)/.test(getConcept(m[0].id)?.category ?? ''); })());

/** The names in an Arabic story: normalized Arabic -> { latin, g } */
export function arabicStoryNames(text) {
  const names = new Map();
  const ws = String(text ?? '').replace(/«[^»]*»|"[^"]*"|“[^”]*”/g, ' ، ').match(/[ء-يً-ٰٟـ]+|[.,،؛!?؟]/gu) ?? [];
  for (let i = 0; i < ws.length; i++) {
    const w = normalArabic(ws[i]), prev = normalArabic(ws[i - 1] ?? '');
    const bare = /^و/.test(w) && NAMES[w.slice(1)] ? w.slice(1) : w;
    // (as written, for showing: "سارة", without "و")
    const shown = ws[i].replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(bare !== w ? /^[وف]/ : /^$/, '');
    if (NAMES[bare]) { if (!names.has(bare)) names.set(bare, { latin: latinOf(bare), g: NAMES[bare] === 'girl' ? 'f' : 'm', shown }); continue; }
    // (after "اسمها", "تدعى"; after "قالت": a name, if it is no word the reader knows)
    const naming = /^(اسمها|اسمه|يدعي|تدعي|يسمي|تسمي)$/.test(prev), saying = /^(قال|قالت|سال|سالت|صاح|صاحت|نادي|نادت)$/.test(prev);
    if ((naming || saying) && !arabicWord(ws[i]) && /^[ء-ي]/.test(w)) {
      const g = /^(اسمها|تدعي|تسمي|قالت|سالت|صاحت|نادت)$/.test(prev) ? 'f' : 'm';
      if (!names.has(w)) names.set(w, { latin: latinOf(w), g, shown });
    }
  }
  return names;
}

/** For readStory's `translate`: a scene of an Arabic story in the engine's English words */
export function arabicStory(text) {
  const found = arabicStoryNames(text);
  const names = new Map([...found].map(([w, v]) => [w, v.latin]));
  const refs = { m: null, f: null };
  // (who last did something, of each gender: a story goes on with them - "قالت" after "رأت قطة" is
  // still the girl, not the cat she saw)
  const doers = { m: null, f: null };
  const recent = [];
  const said = (ref, g) => { if (g) refs[g] = ref; const at = recent.findIndex((r) => r.word === ref.word); if (at >= 0) recent.splice(at, 1); recent.push(ref); };
  // A sentence with who is meant written in: "هو" -> the one it stands for, a verb with nobody before it
  // -> the last one of its gender before it
  const bareTok = (t) => t.replace(/^[«"“]+|[.,،؛:!?؟»"”]+$/g, '');
  const who = (sentence) => {
    const toks = sentence.split(/(\s+)/);
    let subject = false; // (someone said since the last verb)
    let last = null; // (the last one said since the last verb: who does the next one)
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (!t.trim()) continue;
      if (/^⟦\d+⟧$/.test(t) || /^[.,،؛:!?؟«»"“”]+$/.test(t)) { if (/[.,،؛!?؟]/.test(t)) subject = false; continue; }
      const w = normalArabic(bareTok(t));
      const bare = names.has(w) ? w : /^[وف]/.test(w) && names.has(w.slice(1)) ? w.slice(1) : null;
      if (bare) { said({ word: bare }, found.get(bare).g); subject = true; last = [{ word: bare }, found.get(bare).g]; continue; }
      if (/^(و|ف)?(هو|هي|هم|هما)$/.test(w)) {
        const p = w.replace(/^[وف](?=ه)/, '');
        const ref = p === 'هو' ? refs.m : p === 'هي' ? refs.f : null;
        const two = p.length > 2 && recent.length >= 2 ? `${recent.at(-2).word} و${recent.at(-1).word}` : null;
        if (ref || two) { toks[i] = t.replace(/(هو|هي|هما|هم)/, two ?? ref.word); subject = true; }
        continue;
      }
      const r = arabicWord(bareTok(t));
      if (!r) continue;
      if (r.kind === 'noun' && isCharacter(r.en)) {
        // (someone or an animal: who "هو" or "هي" may be next - by the word's gender)
        const g = GENDER[r.stem] ?? (/ه$/.test(r.stem) ? 'f' : 'm');
        if (!r.plural) { said({ word: `ال${r.stem}` }, g); last = [{ word: `ال${r.stem}` }, g]; }
        subject = true;
        continue;
      }
      if (r.kind !== 'verb') continue;
      const g = VERB_WHO[r.stem];
      // (who does it is right after the verb - "قالت سارة", "تمشي الفتاة" - or already said)
      const next = toks.slice(i + 1).find((x) => x.trim());
      const nextName = next && names.has(normalArabic(bareTok(next)));
      const nr = next && !/^⟦/.test(next) ? arabicWord(bareTok(next)) : null;
      // (someone after the verb does it: "قالت الفتاة"; one not named before too, when the verb takes
      // nobody - "جاءت بومة صغيرة" - and is said of their gender)
      const nounG = nr?.kind === 'noun' ? GENDER[nr.stem] ?? (/ه$/.test(nr.stem) ? 'f' : 'm') : null;
      const alone = INTRANSITIVE.test(r.en) && nr?.kind === 'noun' && !nr.plural && nounG === g;
      const nextSubject = nextName || (nr && nr.kind === 'noun' && (nr.front.includes('the') || alone) && isCharacter(nr.en)) || (nr && nr.kind === 'pron');
      // (who does it: the one said before it, or the one after it)
      if (subject && last) doers[last[1]] = last[0];
      else if (nextSubject && nextName) { const n = normalArabic(bareTok(next)); doers[found.get(n).g] = { word: n }; }
      else if (nextSubject && nr?.kind === 'noun') doers[nounG] = { word: `ال${nr.stem}` };
      if (!subject && !nextSubject && g) {
        const ref = g === 'p' ? (recent.length >= 2 ? { word: `${recent.at(-2).word} و${recent.at(-1).word}` } : null) : doers[g] ?? refs[g];
        if (ref) {
          // ("وذهبت": "و" stays in front, then who, then the verb)
          const lead = /^[وف]/.test(normalArabic(t)) && !VERBS[normalArabic(t)] ? t[0] : '';
          toks[i] = `${lead}${lead ? ' ' : ''}${ref.word} ${lead ? t.slice(1) : t}`;
        }
      }
      subject = false;
      last = null;
    }
    return toks.join('');
  };
  const translate = (scene) => {
    const parts = String(scene ?? '').split(/(?<=[.!؟?])\s+/);
    return parts.map((sentence) => bridgeArabic(who(sentence), { names, story: true }).text
      // (seeing something is looking at it: "رأت قطة")
      .replace(/\blooks (?=(?:a|an|the|two|three|many)\b|[A-Z])/g, 'sees ')
      .replace(/^(\p{Ll})/u, (c) => c.toUpperCase())).join(' ');
  };
  // (the Arabic words left out, for "Not drawn"; and the names, back in Arabic, for showing)
  translate.leftOut = (scene) => [...new Set(bridgeArabic(String(scene ?? ''), { names, story: true }).unknown)];
  translate.arabicName = (latin) => [...found].find(([, v]) => v.latin === latin)?.[1].shown ?? null;
  return translate;
}
