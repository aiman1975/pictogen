// Character views: back views of people in every style, view phrases in prompts,
// and figures walking away into the distance showing their backs.
import { parseText, generate, drawConcept, shapesToSvg, STYLE_NAMES } from '../src/index.js';
import { wellFormedError } from './xml-check.js';

let fails = 0;
const check = (ok, msg) => { if (!ok) { console.log(`✗ FAIL: ${msg}`); fails++; } else console.log(`✓ PASS: ${msg}`); };
const hasFace = (svg) => /class="pg-face-(?:eyes|mouth)"/.test(svg);
// The markup of one scene figure (its movable-item group)
const item = (svg, id) => {
  const start = svg.indexOf(`<g class="movable-item" data-id="${id}"`);
  let depth = 0, i = start;
  const re = /<g[\s>]|<\/g>/g;
  re.lastIndex = start;
  for (let m; (m = re.exec(svg));) { depth += m[0] === '</g>' ? -1 : 1; if (!depth) { i = re.lastIndex; break; } }
  return svg.slice(start, i);
};

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

// 1b. Side views: a profile (one eye, the face's eye and mouth groups kept for blinking and talking),
// default for walking and running people, explicit with view: 'side'
const eyes = (svg) => (svg.match(/class="pg-face-eyes"/g) || []).length;
const sideIssues = [];
for (const id of PEOPLE) {
  for (const style of STYLE_NAMES) {
    const front = shapesToSvg(drawConcept(id, { style, seed: 1 }), style);
    const side = shapesToSvg(drawConcept(id, { style, seed: 1, view: 'side' }), style);
    if (front === side && hasFace(front)) sideIssues.push(`${id}/${style}: same as front`);
    if (hasFace(front) && !hasFace(side)) sideIssues.push(`${id}/${style}: lost its face`);
    if (/pg-leg-left/.test(front) && !/pg-leg-left/.test(side)) sideIssues.push(`${id}/${style}: lost its legs`);
  }
}
check(!sideIssues.length, `side views differ from the front, keep a face and limbs (${PEOPLE.length} × ${STYLE_NAMES.length})${sideIssues.length ? ': ' + sideIssues.join(', ') : ''}`);
const profile = shapesToSvg(drawConcept('boy', { seed: 1, view: 'side' }), 'flat');
check(/class="pg-profile"/.test(profile) && eyes(profile) === 1, 'the hand-drawn boy in profile has one eye group and a profile marker');
const walking = shapesToSvg(drawConcept('girl', { seed: 1, animation: 'walk' }), 'flat');
const running = shapesToSvg(drawConcept('man', { seed: 1, animation: 'run' }), 'flat');
check(/class="pg-profile"/.test(walking) && /class="pg-profile"/.test(running), 'walking and running people are drawn in profile by default');
check(!/class="pg-profile"/.test(shapesToSvg(drawConcept('girl', { seed: 1, animation: 'walk', view: 'front' }), 'flat')), 'view: "front" overrides the walking profile');
const across = generate('a man and a woman walking across the park').svg;
check(/class="pg-profile"/.test(item(across, 'man')) && /class="pg-profile"/.test(item(across, 'woman')), 'people walking across a scene are in profile');

// 1c. Animals: front and back views for the four-legged ones (side is their default drawing)
const INK = '#263238';
const animalIssues = [];
for (const id of ['dog', 'cat', 'rabbit', 'lion']) {
  for (const style of ['flat', 'cartoon', 'sketch']) {
    const side = shapesToSvg(drawConcept(id, { style, seed: 1 }), style);
    const front = shapesToSvg(drawConcept(id, { style, seed: 1, view: 'front' }), style);
    const back = shapesToSvg(drawConcept(id, { style, seed: 1, view: 'back' }), style);
    if (front === side || back === side || back === front) animalIssues.push(`${id}/${style}: views not distinct`);
    if (style === 'flat' && (!front.includes(INK) || back.includes(INK))) animalIssues.push(`${id}: face should show from the front only`);
    if (!/class="pg-body-torso"/.test(front) || !/class="pg-body-torso"/.test(back)) animalIssues.push(`${id}/${style}: no body group to bob`);
  }
}
check(!animalIssues.length, `dog, cat, rabbit and lion have distinct front and back views (face only from the front, body bobs)${animalIssues.length ? ': ' + animalIssues.join(', ') : ''}`);
const penguinBack = shapesToSvg(drawConcept('penguin', { seed: 1, view: 'back' }), 'flat');
check(penguinBack !== shapesToSvg(drawConcept('penguin', { seed: 1 }), 'flat') && !penguinBack.includes('#ffffff'), 'the penguin from behind is all dark (no white tummy or face)');
const dogToward = item(generate('a dog running towards us').svg, 'dog');
const dogAway = item(generate('a boy and a dog walking away into the distance').svg, 'dog');
check(dogToward.includes(INK) && /pg-body-torso/.test(dogToward), 'a dog running toward us faces the camera');
check(!dogAway.includes(INK) && /data-view="back"/.test(dogAway), 'a dog walking away shows its back');

// 2. View phrases
const views = (t) => parseText(t).matches.map((m) => `${m.id}:${m.view ?? '-'}`).join(' ');
for (const [t, want] of [
  ['a boy seen from behind', 'boy:back'],
  ['back view of a girl', 'girl:back'],
  ['a boy and a girl seen from behind', 'boy:back girl:back'],
  ['a woman with her back to the camera', 'woman:back'],
  ['a man facing away', 'man:back'],
  ['a boy from the front', 'boy:front'],
  ['a boy seen from the side', 'boy:side'],
  ['side view of a girl', 'girl:side'],
  ['a man in profile', 'man:side'],
  ['a girl walking away facing us', 'girl:front'],
  ['a dog behind a tree', 'dog:- tree:-'],
  ['a boy waving from behind the house', 'boy:- house:-'],
]) check(views(t) === want, `"${t}" -> ${want} (got ${views(t)})`);

// 3. Scenes: walking away shows the back unless the prompt says otherwise
const away = generate('a girl walking away into the distance').svg;
check(/data-view="back"/.test(away) && !hasFace(item(away, 'girl')), 'a figure walking away into the distance shows its back');
const awayFacing = generate('a girl walking away facing us').svg;
check(hasFace(item(awayFacing, 'girl')), '"facing us" keeps the face while walking away');
const toward = generate('a boy walking towards us').svg;
check(hasFace(item(toward, 'boy')) && /data-view="front"/.test(toward) && !/class="pg-profile"/.test(toward), 'a figure walking toward us shows its face (front view, though its legs walk)');
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
