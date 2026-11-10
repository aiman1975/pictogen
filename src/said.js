// What is said without quote marks: "a girl says look, a swing", "ein Mädchen ruft ihre Mama und sagt
// schau eine Schaukel", "قالت البنت انظري أرجوحة". Children (and grown-ups) seldom type quotes, so the
// words after a saying verb become what is said, in a speech bubble, as if quoted - and calling
// someone ("calls her mum") is calling their name: "Mum!". Quotes put in here start with an invisible
// mark (MARK), so the scene still draws the things named in them ("look, a swing!" has a swing).
import { germanWord } from './lang-de.js';
import { arabicWord, NAMES as AR_NAMES, normalArabic } from './lang-ar.js';
import { isFirstName } from './story-reader.js';
import { getConcept } from './concepts/index.js';
import { parseText } from './text/matcher.js';

export const MARK = '⁠';

// Saying verbs, longest first (so "said" is not read as "sa..."); Arabic as read without hamza and
// with ه for ة (arForms puts the other spellings back in)
const longest = (s) => s.split('|').sort((a, b) => b.length - a.length).join('|');
const SAY = {
  en: longest('says|said|say|shouts|shouted|shout|yells|yelled|yell|asks|asked|whispers|whispered|replies|replied|answers|answered|exclaims|exclaimed|calls out|called out|cries out|cried out|screams|screamed'),
  de: longest('sagt|sagte|sagten|sagen|fragt|fragte|fragten|flüstert|flüsterte|antwortet|antwortete|schreit|schrie|schrien|meint|meinte|ruft|rief|riefen|rufen'),
  ar: longest('قال|قالت|قالوا|يقول|تقول|يقولون|سال|سالت|يسال|تسال|همس|همست|يهمس|تهمس|صاح|صاحت|يصيح|تصيح|صرخ|صرخت|يصرخ|تصرخ|اجاب|اجابت|يجيب|تجيب|ردت|رد'),
};
// Calling someone: the verb, then who ("calls her mum", "ruft ihre Mama", "نادت البنت أمها")
const CALL = { en: 'calls|called|call', de: 'rufen|riefen|ruft|rief', ar: 'ينادي|تنادي|نادوا|نادت|نادي' };
// Small words before who is called
const BEFORE_WHO = { en: /^(her|his|their|the|a|an|my|our|its)$/i, de: /^(ihre|ihren|ihrem|seine|seinen|seinem|die|den|der|das|meine|meinen|unsere|unseren)$/i, ar: /^$/ };
// How someone is called by name: Mum, Mama, Dad...
const CALLED = {
  en: { mum: 'Mum', mom: 'Mom', mummy: 'Mummy', mommy: 'Mommy', mother: 'Mum', dad: 'Dad', daddy: 'Daddy', father: 'Dad', grandma: 'Grandma', granny: 'Granny', grandpa: 'Grandpa', grandad: 'Grandad' },
  de: { mutter: 'Mama', vater: 'Papa', großmutter: 'Oma', großvater: 'Opa' },
  ar: { ام: 'ماما', امه: 'ماما', امها: 'ماما', امي: 'ماما', امهم: 'ماما', اب: 'بابا', ابوه: 'بابا', ابوها: 'بابا', ابي: 'بابا', اباه: 'بابا', اباها: 'بابا', جده: 'جدو', جدها: 'جدو', جدته: 'تيتا', جدتها: 'تيتا' },
};
// Quote marks for each language (as the engine's readers know them: src/lang-de.js, src/lang-ar.js)
const QUOTE = { en: ['“', '”'], de: ['„', '“'], ar: ['«', '»'] };
// Where what is said ends: the sentence's end (its "!" or "?" kept), or the next thing that happens
const END = {
  en: '(?:([!?]+)|(?=\\.|\\s+then\\s|\\s+and then\\s|$))',
  de: '(?:([!?]+)|(?=\\.|\\s+dann\\s|\\s+und dann\\s|$))',
  ar: '(?:([!?؟]+)|(?=\\.|\\s+ثم\\s|\\s+وبعدها\\s|$))',
};
// Not what is said: "says that...", "says to Tom" (what follows a colon is), "says nothing", "answered with a
// golden light" (a boat answers with its light: no words)
const NOT_SAID = { en: /^(that|to|nothing|so|with|by|in|on|at|back|yes or no)\b/i, de: /^(dass|zu|zum|zur|nichts|mit|mitten|im|in|auf)(?![\p{L}])/iu, ar: /^(ان|انه|انها|انهم|لا شيء|ب|بال\S*|في|على)(\s|$)/ };
// Who it is said to, at the end, is not said: "says hello to her mum"
const SAID_TO = { en: /\s+to\s+(?:(?:her|his|their|the|a|an|my|our)\s+)?\S+$/i, de: /\s+zu\s+(?:(?:ihrer|ihrem|seiner|seinem|der|dem)\s+)?\S+$/iu, ar: /\s+ل\S+$/ };
// Who says it, when they come after the verb ("dann sagt sie", "sagt Mia", "قالت سارة", "صرخ الولد")
const PRONOUN = { en: /^(she|he|they|it)$/i, de: /^(sie|er|es|ich|wir|du)$/i, ar: /^(هي|هو|هم|هن)$/ };
const LEAD_ARTICLE = { en: /^$/, de: /^(der|die|das|ein|eine)$/i, ar: /^$/ };
const isSomeone = (en, person = false) => {
  if (!en) return false;
  const id = parseText(String(en)).matches[0]?.id;
  return (person ? /^people/ : /^(people|animals|wildlife)/).test(getConcept(id ?? '')?.category ?? '');
};
// (person: a person only, not an animal)
const SOMEONE = {
  en: (w, person) => (/^[A-Z]/.test(w) && isFirstName(w.toLowerCase())) || isSomeone(w, person),
  de: (w, person) => (/^\p{Lu}/u.test(w) && isFirstName(w.toLowerCase())) || isSomeone(germanWord(w), person),
  ar: (w, person) => AR_NAMES[normalArabic(w)] !== undefined || isSomeone(arabicWord(w)?.en, person),
};
// (an Arabic word as typed: with or without hamza, ة or ه, ى or ي)
const arForms = (pattern) => pattern.replace(/ا/g, '[اأإآ]').replace(/ي(?=\||$)/g, '[يى]').replace(/ه(?=\||$)/g, '[هة]');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** The text with what is said put in quote marks (each starting with MARK); lang: 'en' | 'de' | 'ar' */
export function quoteSpeech(text, lang = 'en') {
  text = String(text ?? '');
  if (!SAY[lang]) return text;
  const [open, close] = QUOTE[lang];
  const isAr = lang === 'ar';
  const verbs = (list) => (isAr ? arForms(list) : list);
  // ("و" and, "ف" so: on the front of an Arabic verb - "وقالت")
  const front = isAr ? '(?:و|ف)?' : '';
  const wordEnd = '(?![\\p{L}\\p{M}])';
  // (what is said ends where someone else says something: "he says hello and she says bye")
  const end = END[lang].replace(/\|\$\)\)$/, `|\\s+(?:and|und|و)\\s*(?:[\\p{L}\\p{M}]+\\s+){0,2}${front}(?:${verbs(SAY[lang])})${wordEnd}|$))`);
  const say = new RegExp(`(^|[^\\p{L}\\p{M}])(${front}(?:${verbs(SAY[lang])}))${wordEnd}(\\s*[:,]?\\s*)(?!["“„«\\s])((?:(?!["“”„«»]|\\s${front}(?:${verbs(SAY[lang])})${wordEnd}).)+?)${end}`, 'giu');
  const call = new RegExp(`(^|[^\\p{L}\\p{M}])(${front}(?:${verbs(CALL[lang])}))${wordEnd}((?:\\s+[\\p{L}\\p{M}ـ]+){1,3})(?=\\s*(?:[,.!?؟]|\\s(?:and|und)\\s|\\s+و|$))`, 'giu');
  const someone = SOMEONE[lang];
  return text.split(/(\n+)/).map((line) => {
    // (quotes already there stay as they are)
    if (/["“”„«»]/.test(line)) return line;
    // Calling someone by name: "calls her mum" - "Mum!" (the one called stays in the picture)
    let out = line.replace(call, (m, a, verb, rest) => {
      const ws = rest.trim().split(/\s+/);
      // (who calls may come first: "نادت البنت أمها", "ruft das Mädchen seine Mama")
      let k = 0;
      if (LEAD_ARTICLE[lang].test(ws[0] ?? '') && ws.length > 2 && someone(ws[1])) k = 2;
      else if (ws.length > 1 && (PRONOUN[lang].test(ws[0]) || (someone(ws[0]) && !BEFORE_WHO[lang].test(ws[0]) && someone(ws[ws.length - 1])))) k = 1;
      if (BEFORE_WHO[lang].test(ws[k] ?? '')) k++;
      // (who is called is the last word: "her mum", "صديقه سامي" - his friend Sami)
      if (k > ws.length - 1) return m;
      const who = ws[ws.length - 1];
      // (only a person is called by name: "calls a taxi", "calls her dog" say no name)
      if (!someone(who, true) && !CALLED[lang][isAr ? normalArabic(who) : who.toLowerCase()]) return m;
      const key = isAr ? normalArabic(who) : who.toLowerCase();
      const name = CALLED[lang][key] ?? (isAr ? who.replace(/(ها|ه|هم)$/, '') : cap(who));
      return `${a}${verb}${rest} ${open}${MARK}${name}!${close}`;
    });
    // What is said after a saying verb
    out = out.replace(say, (m, a, verb, gap, words, mark = '') => {
      let said = words.trim(), lead = '';
      // ("says to her mum: look!", "dann sagt sie: schau": what follows the colon)
      const colon = said.indexOf(':');
      if (colon >= 0) { lead = said.slice(0, colon).trim(); said = said.slice(colon + 1).trim(); }
      else {
        if (NOT_SAID[lang].test(isAr ? normalArabic(said) : said)) return m;
        // ("ruft seinen Hund": calling someone, not saying it)
        if (new RegExp(`^${front}(?:${verbs(CALL[lang])})$`, 'iu').test(verb) && BEFORE_WHO[lang].test(said.split(/\s+/)[0])) return m;
        // (who says it, right after the verb: "sagt sie", "sagt Mia", "قالت سارة", "صرخ الولد")
        const ws = said.split(/\s+/);
        let k = 0;
        if (LEAD_ARTICLE[lang].test(ws[0]) && ws.length > 2 && someone(ws[1])) k = 2;
        else if (ws.length > 1 && (PRONOUN[lang].test(ws[0]) || (lang !== 'en' && someone(ws[0])))) k = 1;
        if (k) { lead = ws.slice(0, k).join(' '); said = ws.slice(k).join(' '); }
        if (NOT_SAID[lang].test(isAr ? normalArabic(said) : said)) return m;
        const to = said.match(SAID_TO[lang]);
        if (to && to.index > 0) { lead = `${lead} ${to[0].trim()}`.trim(); said = said.slice(0, to.index); }
      }
      said = said.trim();
      if (!said || said.length > 160) return m;
      return `${a}${verb}${lead ? ` ${lead}` : ''}${gap.includes(':') || colon >= 0 ? ':' : ''} ${open}${MARK}${isAr ? said : cap(said)}${mark ?? ''}${close}`;
    });
    // Calling and then saying in one sentence: one bubble ("Mum! Look, a swing!")
    const joined = new RegExp(`\\s*${esc(open)}${MARK}([^${esc(close)}]*)${esc(close)}(\\s+(?:and|und)?\\s*(?:و)?(?:${verbs(SAY[lang])})${wordEnd}\\s*:?\\s*)${esc(open)}${MARK}`, 'giu');
    return out.replace(joined, (m, first, mid) => `${mid}${open}${MARK}${first} `);
  }).join('');
}

/** The words of a quote put in here (without its mark), or null for a quote written by the user */
export const markedSaying = (quote) => (String(quote ?? '').startsWith(MARK) ? quote.slice(MARK.length) : null);
