// German and Arabic words for the nearest-picture list (src/data/nearest-de.js, nearest-ar.js), from
// the drafts of scripts/lang/nearest-translate.py, checked by rule:
//  - a word Toonaro already reads keeps its meaning (the list only adds words it doesn't know);
//  - one word (Arabic: up to two), letters only, no article; the English word must draw a picture;
//  - a word drafted for two different English words is left out (it would be a guess).
// The plural is drawn as more than one.
//   node scripts/lang/nearest-langs.mjs <folder with out-NN.json>

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseText } from '../../src/index.js';
import { germanWord, pluralEn } from '../../src/lang-de.js';
import { arabicWord, normalArabic, useNearestAr } from '../../src/lang-ar.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dir = process.argv[2];
if (!dir) { console.error('usage: node scripts/lang/nearest-langs.mjs <drafts folder>'); process.exit(1); }
useNearestAr(false);

const rows = readdirSync(dir).filter((f) => /^out-\d+\.json$/.test(f)).sort().flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
const draws = (en) => parseText(en).matches.length > 0;

function build(lang) {
  const out = new Map(), clash = new Set(), why = { known: 0, form: 0, clash: 0, kept: 0 };
  const add = (key, en) => {
    if (clash.has(key)) return;
    // (a plural that is the singular's own spelling - "Wasserkocher" - stays one)
    if (out.get(key) === en.replace(/s$/, '') || (out.has(key) && pluralEn(out.get(key)) === en)) return;
    if (out.has(key) && out.get(key) !== en && out.get(key) !== pluralEn(en) && pluralEn(out.get(key)) !== en) { out.delete(key); clash.add(key); why.clash++; return; }
    out.set(key, en);
  };
  for (const r of rows) {
    if (!r?.en || !draws(r.en)) continue;
    for (const w of Array.isArray(r[lang]) ? r[lang] : []) {
      for (const [form, en] of [[w?.sg, r.en], [w?.pl, pluralEn(r.en)]]) {
        if (typeof form !== 'string' || !form.trim()) continue;
        const word = form.trim();
        if (lang === 'de') {
          if (!/^\p{Lu}[\p{L}-]{2,}$/u.test(word)) { why.form++; continue; }
          if (germanWord(word, { nearest: false, tail: false }) != null) { why.known++; continue; }
          add(word.toLowerCase(), en);
        } else {
          const key = normalArabic(word);
          if (!/^[ء-ي]{2,}( [ء-ي]{2,})?$/.test(key) || /^ال/.test(key)) { why.form++; continue; }
          if (arabicWord(word) != null) { why.known++; continue; }
          add(key, en);
        }
      }
    }
  }
  why.kept = out.size;
  return { out, why };
}

for (const [lang, file, name, note] of [
  ['de', 'nearest-de.js', 'German', 'German word (small letters) -> the English word it is drawn by'],
  ['ar', 'nearest-ar.js', 'Arabic', 'Arabic word (as src/lang-ar.js reads it: no vowel marks, أ إ آ as ا, ة as ه, ى as ي) -> the English word it is drawn by'],
]) {
  const { out, why } = build(lang);
  const body = [...out].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
  writeFileSync(join(root, 'src', 'data', file), `// ${name} nouns for the nearest-picture list: ${note} (src/data/nearest-en.js, from
// WordNet). Drafted with Gemini (gemini-3.5-flash, ${new Date().toISOString().slice(0, 10)}) by scripts/lang/nearest-translate.py, checked by
// scripts/lang/nearest-langs.mjs: words Toonaro already reads keep their meaning. ${out.size} words.
export default {
${body}
};
`);
  console.log(lang, why);
}
