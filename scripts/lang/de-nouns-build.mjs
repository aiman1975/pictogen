import { readFileSync, writeFileSync } from 'node:fs';
import { getConcept } from '../../src/concepts/index.js';
import { parseText } from '../../src/text/matcher.js';
const D = process.argv[2];
const merged = JSON.parse(readFileSync(`${D}/merged.json`, 'utf8'));
const rows = Object.fromEntries(JSON.parse(readFileSync(`${D}/concepts.json`, 'utf8')).map((r) => [r.id, r]));
// The English words that draw a picture: its label or an alias the matcher reads as it
const english = {};
for (const id of Object.keys(merged)) {
  const c = getConcept(id);
  if (!c) continue;
  const tries = [...new Set([c.label, ...(rows[id]?.en ?? []), id.replace(/_/g, ' ')].map((t) => String(t).toLowerCase()))];
  // (exactly this picture; else what the engine draws for its English name - "child" draws the boy)
  const ok = tries.find((t) => parseText(t).matches.length === 1 && parseText(t).matches[0].id === id) ?? tries.find((t) => parseText(t).matches.length === 1);
  if (ok) english[id] = ok;
}
// Which picture a German word draws when several have it: the one drawn in the engine's own style
// (people, animals), else one with no man_/woman_/person_ in front, else the shortest name
const rank = (id) => {
  const c = getConcept(id);
  return [/^(people|animals|wildlife|vehicles|food|nature|sky)$/.test(c?.category ?? '') ? 0 : 1, /^(man|woman|person)_/.test(id) ? 1 : 0, id.length];
};
const better = (a, b) => { const x = rank(a), y = rank(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? a : b; return a < b ? a : b; };
const forms = new Map();
const add = (word, id) => {
  const w = String(word ?? '').trim().toLowerCase();
  if (!w || w.length < 2 || /\s/.test(w) || !english[id]) return;
  forms.set(w, forms.has(w) ? better(forms.get(w), id) : id);
};
for (const [id, nouns] of Object.entries(merged)) {
  for (const n of nouns) {
    add(n.sg, id);
    if (n.pl) { add(n.pl, id); if (!/[ns]$/.test(n.pl)) add(n.pl + 'n', id); }
    if (n.g !== 'f' && n.sg) add(n.sg + (/[sßxz]$/.test(n.sg) ? 'es' : 's'), id);
  }
}
const nouns = Object.fromEntries([...forms].sort().map(([w, id]) => [w, english[id]]));
const covered = new Set([...forms.values()]);
writeFileSync(`${D}/nouns.json`, JSON.stringify(nouns));
console.log('pictures with an English word that draws them', Object.keys(english).length, 'of', Object.keys(merged).length);
console.log('German forms', Object.keys(nouns).length, 'pictures covered', covered.size);
for (const w of ['hund', 'hunde', 'katze', 'katzen', 'junge', 'mädchen', 'mann', 'frau', 'kind', 'kinder', 'baum', 'sonne', 'auto', 'ball', 'lehrer', 'lehrerin', 'apfel', 'äpfel', 'fahrrad', 'haus', 'vogel', 'fisch', 'buch', 'einhorn', 'roboter', 'drache']) console.log(w.padEnd(10), '->', nouns[w] ?? '—');
