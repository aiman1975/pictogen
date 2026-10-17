// Character views: back views of people in every style, view phrases in prompts,
// and figures walking away into the distance showing their backs.
import { parseText, generate, drawConcept, shapesToSvg, STYLE_NAMES } from '../src/index.js';
import { wellFormedError } from './xml-check.js';

let fails = 0;
const check = (ok, msg) => { if (!ok) { console.log(`✗ FAIL: ${msg}`); fails++; } else console.log(`✓ PASS: ${msg}`); };
const hasFace = (svg) => /class="pg-face-(?:eyes|mouth)"/.test(svg);

// 1. Every person in every style: the back view has no face but keeps the rigged limbs
const PEOPLE = ['boy', 'girl', 'man', 'woman'];
const noFace = [], lostLimbs = [], unchanged = [];
for (const id of PEOPLE) {
  for (const style of STYLE_NAMES) {
    const front = shapesToSvg(drawConcept(id, { style, seed: 1 }), style);
    const back = shapesToSvg(drawConcept(id, { style, seed: 1, view: 'back' }), style);
    if (hasFace(back)) noFace.push(`${id}/${style}`);
    if (/pg-leg-left/.test(front) && !/pg-leg-left/.test(back)) lostLimbs.push(`${id}/${style}`);
    if (hasFace(front) && front === back) unchanged.push(`${id}/${style}`);
  }
}
check(!noFace.length, `back views show no face (${PEOPLE.length} people × ${STYLE_NAMES.length} styles)${noFace.length ? ': ' + noFace.join(', ') : ''}`);
check(!lostLimbs.length, `back views keep the rigged legs for walk cycles${lostLimbs.length ? ': ' + lostLimbs.join(', ') : ''}`);
check(!unchanged.length, `back views differ from front views${unchanged.length ? ': ' + unchanged.join(', ') : ''}`);
check(hasFace(shapesToSvg(drawConcept('boy', { seed: 1, view: 'front' }), 'flat')), 'view: "front" is the normal drawing');

// 2. View phrases
const views = (t) => parseText(t).matches.map((m) => `${m.id}:${m.view ?? '-'}`).join(' ');
for (const [t, want] of [
  ['a boy seen from behind', 'boy:back'],
  ['back view of a girl', 'girl:back'],
  ['a boy and a girl seen from behind', 'boy:back girl:back'],
  ['a woman with her back to the camera', 'woman:back'],
  ['a man facing away', 'man:back'],
  ['a boy from the front', 'boy:front'],
  ['a girl walking away facing us', 'girl:front'],
  ['a dog behind a tree', 'dog:- tree:-'],
  ['a boy waving from behind the house', 'boy:- house:-'],
]) check(views(t) === want, `"${t}" -> ${want} (got ${views(t)})`);

// 3. Scenes: walking away shows the back unless the prompt says otherwise
const item = (svg, id) => {
  const start = svg.indexOf(`<g class="movable-item" data-id="${id}"`);
  let depth = 0, i = start;
  const re = /<g[\s>]|<\/g>/g;
  re.lastIndex = start;
  for (let m; (m = re.exec(svg));) { depth += m[0] === '</g>' ? -1 : 1; if (!depth) { i = re.lastIndex; break; } }
  return svg.slice(start, i);
};
const away = generate('a girl walking away into the distance').svg;
check(/data-view="back"/.test(away) && !hasFace(item(away, 'girl')), 'a figure walking away into the distance shows its back');
const awayFacing = generate('a girl walking away facing us').svg;
check(hasFace(item(awayFacing, 'girl')), '"facing us" keeps the face while walking away');
const toward = generate('a boy walking towards us').svg;
check(hasFace(item(toward, 'boy')) && !/data-view=/.test(toward), 'a figure walking toward us shows its face');
const card = generate('a boy seen from behind', { mode: 'card' }).svg;
check(!hasFace(card), 'flashcards honour the back view');
for (const t of ['a man and a woman walking away at sunset', 'a boy seen from behind']) {
  for (const style of ['flat', 'cute2d', 'sketch']) {
    const err = wellFormedError(generate(t, { style }).svg);
    check(!err, `"${t}" [${style}] is well-formed XML${err ? `: ${err}` : ''}`);
  }
}

console.log(fails ? `\n${fails} view check(s) failed` : '\nCharacter Views test suite: ALL PASSED!');
process.exit(fails ? 1 : 0);
