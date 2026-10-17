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

// alias collisions (expected between the hand-drawn core and the emoji library; set VERBOSE=1 to list them)
const owner = new Map();
let collisions = 0;
for (const c of concepts) {
  for (const a of [c.id.replace(/_/g, ' '), ...(c.aliases || [])]) {
    const k = a.toLowerCase();
    if (owner.has(k) && owner.get(k) !== c.id) {
      collisions++;
      if (process.env.VERBOSE) console.warn(`! alias "${k}" used by ${owner.get(k)} and ${c.id} (first wins)`);
    } else owner.set(k, c.id);
  }
}
if (collisions) console.log(`${collisions} alias collisions (first wins; VERBOSE=1 to list)`);

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
// numerals are counts, not keycap icons
const counts = (t) => parseText(t).matches.map((m) => `${m.id}x${m.count}`).join(',');
for (const [t, want] of [['3 dogs', 'dogx3'], ['2 cats and 4 dogs', 'catx2,dogx4'], ['0 cats', 'catx1'], ['99 balloons', 'balloonx12'], ['keycap 3', 'keycap_3x1']]) {
  if (counts(t) !== want) fail(`parse: "${t}" -> "${want}" (got "${counts(t)}")`);
}

// in a scene, time-of-day words paint the backdrop rather than drawing their emoji on the ground
const dusk = generate('three dogs at sunset');
if (dusk.matches.map((m) => m.id).join() !== 'dog' || dusk.setting.join() !== 'sunset') fail(`generate: "sunset" should be setting (got matches=${dusk.matches.map((m) => m.id)} setting=${dusk.setting})`);
if (generate('sunset', { mode: 'card' }).matches[0]?.id !== 'sunset') fail('generate: "sunset" card still shows the sunset icon');
if (bad(generate(42).svg) || bad(generate('a boy', { width: 'abc', height: -1 }).svg)) fail('generate: non-string text / bad size produce bad output');

const g = generate('a boy at the beach on a rainy night');
if (g.unknown.length || g.setting.join() !== 'beach,rainy,night') fail(`generate: backdrop words reported as setting (got unknown=${g.unknown} setting=${g.setting})`);

// auto placement uses whole words: a bathtub is not a bat, custard is not a star
const placeOf = (id) => concepts.find((c) => c.id === id)?.placement;
for (const [id, want] of [['bathtub', 'ground'], ['custard', 'ground'], ['place_of_worship', 'ground'], ['rocket', 'air'], ['sailboat', 'water']]) {
  if (placeOf(id) !== want) fail(`placement: ${id} -> ${want} (got ${placeOf(id)})`);
}

console.log(`${concepts.length} concepts × ${STYLE_NAMES.length} styles — ${fails ? fails + ' failure(s)' : 'all OK'}`);
process.exit(fails ? 1 : 0);
