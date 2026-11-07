// Builds src/lang-ar-nouns.js from the Arabic nouns drafted by scripts/lang/ar-nouns-draft.py
// (merged.json: picture id -> [{ sg, pl, g }]) and the pictures' English names (concepts.json):
// every form an Arabic speaker may type - singular, plural, the two of something (dual) - written
// the way src/lang-ar.js reads words (normalArabic), mapped to the English word that draws it.
//   node scripts/lang/ar-nouns-build.mjs path/to/folder-with-merged.json-and-concepts.json
import { readFileSync, writeFileSync } from 'node:fs';
import { getConcept } from '../../src/concepts/index.js';
import { parseText } from '../../src/text/matcher.js';
import { normalArabic } from '../../src/lang-ar-normal.js';

const D = process.argv[2];
const merged = JSON.parse(readFileSync(`${D}/merged.json`, 'utf8'));
const rows = Object.fromEntries(JSON.parse(readFileSync(`${D}/concepts.json`, 'utf8')).map((r) => [r.id, r]));
// The English words that draw a picture: its label or an alias the matcher reads as it
const english = {};
for (const id of Object.keys(merged)) {
  const c = getConcept(id);
  if (!c) continue;
  const tries = [...new Set([c.label, ...(rows[id]?.en ?? []), id.replace(/_/g, ' ')].map((t) => String(t).toLowerCase()))];
  const ok = tries.find((t) => parseText(t).matches.length === 1 && parseText(t).matches[0].id === id) ?? tries.find((t) => parseText(t).matches.length === 1);
  if (ok) english[id] = ok;
}
// Which picture a word draws when several have it: one drawn in the engine's own style (people,
// animals), else one with no man_/woman_/person_ in front, else the shortest name
const rank = (id) => {
  const c = getConcept(id);
  return [/^(people|animals|wildlife|vehicles|food|nature|sky)$/.test(c?.category ?? '') ? 0 : 1, /^(man|woman|person)_/.test(id) ? 1 : 0, id.length];
};
const better = (a, b) => { const x = rank(a), y = rank(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? a : b; return a < b ? a : b; };
const forms = new Map(), plural = {}, gender = {};
const add = (word, id, kind) => {
  const w = normalArabic(word);
  if (!w || w.length < 2 || !english[id]) return;
  const had = forms.get(w);
  forms.set(w, had ? better(had, id) : id);
  // (1: more than one, 2: two of them; a form that is also a singular stays a singular)
  if (kind) plural[w] ??= kind;
};
for (const [id, nouns] of Object.entries(merged)) {
  for (const n of nouns) {
    if (!n.sg) continue;
    const sg = normalArabic(n.sg);
    add(sg, id);
    if (/^[mf]$/.test(n.g ?? '')) gender[sg] ??= n.g;
    if (n.pl) add(n.pl, id, 1);
    // (two of them: "كلبان", "كلبين"; "قطتان", "قطتين" - a word ending in ة takes ت)
    if (!sg.includes(' ')) {
      const stem = sg.replace(/ه$/, 'ت');
      add(`${stem}ان`, id, 2);
      add(`${stem}ين`, id, 2);
    }
    // (a word in ة has a plural in ات too: "تفاحات" beside "تفاح")
    if (/ه$/.test(sg) && !sg.includes(' ')) add(sg.replace(/ه$/, 'ات'), id, 1);
    // (the other case of a sound plural: "معلمون" / "معلمين")
    const pl = normalArabic(n.pl ?? '');
    if (/ون$/.test(pl)) add(pl.replace(/ون$/, 'ين'), id, 1);
  }
}
for (const [w, id] of forms) if (merged[id]?.some((n) => normalArabic(n.sg) === w)) delete plural[w];
const nouns = Object.fromEntries([...forms].sort().map(([w, id]) => [w, english[id]]));
console.log('pictures with an English word that draws them', Object.keys(english).length, 'of', Object.keys(merged).length);
console.log('Arabic forms', Object.keys(nouns).length, 'plural', Object.keys(plural).length, 'pictures', new Set(forms.values()).size);
const head = `// Arabic nouns for the library's pictures: an Arabic word (as src/lang-ar.js reads it: no vowel marks,
// أ إ آ as ا, ة as ه, ى as ي; singular, plural, and the two of something) -> the English word the engine
// draws it by. Drafted with Gemini (gemini-3.5-flash, 2026-11-07) from the pictures' English names, one
// picture per word chosen by rule and each English word checked to draw (scripts: see docs/LANGUAGES.md);
// hand-written words in src/lang-ar.js come first.
`;
writeFileSync(new URL('../../src/lang-ar-nouns.js', import.meta.url), `${head}export default ${JSON.stringify(nouns).replace(/,"/g, ',\n"')};\n\n// (the plural forms: 1 more than one, 2 two of them)\nexport const PLURAL = ${JSON.stringify(Object.fromEntries(Object.entries(plural).sort()))};\n\n// (each singular's gender: "m" or "f")\nexport const GENDER = ${JSON.stringify(Object.fromEntries(Object.entries(gender).sort()))};\n`);
for (const w of ['كلب', 'كلاب', 'كلبان', 'قطة', 'قطط', 'قطتين', 'بنت', 'ولد', 'اطفال', 'معلمة', 'بالون', 'شجرة', 'بيت', 'سيارة', 'شمس', 'قمر', 'بطة', 'كرة', 'تفاحة', 'كتاب']) console.log(w.padEnd(8), '->', nouns[normalArabic(w)] ?? '—', plural[normalArabic(w)] ?? '');
