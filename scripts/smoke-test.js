#!/usr/bin/env node
// Smoke test: every concept renders in every style without NaN/undefined, scenes/cards/sheets render,
// aliases don't collide, and a few parsing expectations hold.

import { listConcepts, renderIcon, renderCard, STYLE_NAMES, generate, parseText } from '../src/index.js';

let fails = 0;
const fail = (msg) => { fails++; console.error('✗ ' + msg); };
const bad = (svg) => /NaN|undefined|\[object/.test(svg);

const concepts = listConcepts();
for (const c of concepts) {
  for (const s of STYLE_NAMES) {
    try {
      if (bad(renderIcon(c.id, { style: s }))) fail(`${c.id} [${s}] contains NaN/undefined`);
      if (bad(renderIcon(c.id, { style: s, vary: true, seed: 42 }))) fail(`${c.id} [${s}] (vary) contains NaN/undefined`);
    } catch (e) { fail(`${c.id} [${s}]: ${e.message}`); }
  }
  try { renderCard(c.id); } catch (e) { fail(`card ${c.id}: ${e.message}`); }
  if (!['sky', 'air', 'ground', 'water', 'underwater', 'background'].includes(c.placement)) fail(`${c.id}: bad placement ${c.placement}`);
}

// alias collisions
const owner = new Map();
for (const c of concepts) {
  for (const a of [c.id.replace(/_/g, ' '), ...(c.aliases || [])]) {
    const k = a.toLowerCase();
    if (owner.has(k) && owner.get(k) !== c.id) console.warn(`! alias "${k}" used by ${owner.get(k)} and ${c.id} (first wins)`);
    else owner.set(k, c.id);
  }
}

const samples = [
  'A boy riding a bike under the sun',
  'Three red apples on the table',
  'The moon at night',
  'a green apple and two boys',
  'nothing matches here',
];
for (const t of samples) {
  for (const mode of ['scene', 'icons', 'card']) {
    for (const s of STYLE_NAMES) {
      try { if (bad(generate(t, { mode, style: s }).svg)) fail(`generate("${t}", ${mode}, ${s}) bad output`); }
      catch (e) { fail(`generate("${t}", ${mode}, ${s}): ${e.message}`); }
    }
  }
}

// parsing expectations
const p = parseText('Three red apples and a boy');
const apple = p.matches.find((m) => m.id === 'apple');
if (!apple || apple.count !== 3 || apple.color !== 'red') fail('parse: "three red apples" -> apple x3 red');
if (!p.matches.find((m) => m.id === 'boy')) fail('parse: boy');

// library matching: generic words pick an obvious icon or nothing, never a skin-tone variant
const ids = (t) => parseText(t).matches.map((m) => m.id).join(',');
const expectIds = {
  'a happy face': 'smiling_face',
  'a red heart': 'red_heart',
  'two black circles': 'black_circle',
  'a green apple': 'apple',
  'light rain on a dark night': '',
  'turn right at the house': 'house',
  'a woman in medium hair': 'woman',
};
for (const [t, want] of Object.entries(expectIds)) {
  if (ids(t) !== want) fail(`parse: "${t}" -> "${want}" (got "${ids(t)}")`);
}
const g = generate('a boy at the beach on a rainy night');
if (g.unknown.length || g.setting.join() !== 'beach,rainy,night') fail(`generate: backdrop words reported as setting (got unknown=${g.unknown} setting=${g.setting})`);

// auto placement uses whole words: a bathtub is not a bat, custard is not a star
const placeOf = (id) => concepts.find((c) => c.id === id)?.placement;
for (const [id, want] of [['bathtub', 'ground'], ['custard', 'ground'], ['place_of_worship', 'ground'], ['rocket', 'air'], ['sailboat', 'water']]) {
  if (placeOf(id) !== want) fail(`placement: ${id} -> ${want} (got ${placeOf(id)})`);
}

console.log(`${concepts.length} concepts × ${STYLE_NAMES.length} styles — ${fails ? fails + ' failure(s)' : 'all OK'}`);
process.exit(fails ? 1 : 0);
