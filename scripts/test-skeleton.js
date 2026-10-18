// The shared skeleton (src/concepts/rig.js): every hand-drawn animal names its joints in every view
// and style, motions come from the joints (legs swing, wings flap, tails wag), and the scene adds no
// second motion wrapper. The browser checks are skipped without Playwright.
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { drawConcept, shapesToSvg, generate, STYLE_NAMES } from '../src/index.js';
import { ANIMATION_CSS } from '../src/core/render.js';
import { wellFormedError } from './xml-check.js';

let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓ PASS' : '✗ FAIL'}: ${msg}`); if (!ok) fails++; };
const count = (svg, cls) => (svg.match(new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`, 'g')) || []).length;
const svgOf = (id, opts = {}, style = 'flat') => shapesToSvg(drawConcept(id, { seed: 1, ...opts }), style);

// 1. Who has which skeleton, and which joints
const SKELETONS = {
  dog: 'quadruped', cat: 'quadruped', rabbit: 'quadruped', lion: 'quadruped', elephant: 'quadruped',
  bird: 'bird', duck: 'bird', penguin: 'bird', fish: 'fish',
};
const VIEWS = { dog: ['side', 'front', 'back'], cat: ['side', 'front', 'back'], rabbit: ['side', 'front', 'back'], lion: ['side', 'front', 'back'], penguin: ['front', 'back'] };
const issues = [];
for (const [id, kind] of Object.entries(SKELETONS)) {
  for (const view of VIEWS[id] ?? ['side']) {
    const svg = svgOf(id, { view: view === 'side' ? undefined : view });
    const where = `${id}/${view}`;
    if (!new RegExp(`class="pg-rig pg-rig-${kind}\\b`).test(svg)) issues.push(`${where}: no ${kind} root`);
    if ((view === 'side') === /pg-rig-head-on/.test(svg) && id !== 'penguin') issues.push(`${where}: head-on marker wrong`);
    if (!count(svg, 'pg-body-torso')) issues.push(`${where}: no torso`);
    if (kind === 'quadruped') {
      const legs = count(svg, 'pg-leg-left') + count(svg, 'pg-leg-right');
      const want = id === 'rabbit' ? 2 : view === 'back' ? 2 : 4;
      if (legs !== want) issues.push(`${where}: ${legs} legs, expected ${want}`);
      if (view === 'side' && id !== 'rabbit' && !(count(svg, 'pg-leg-left') === 2 && count(svg, 'pg-leg-front') === 2)) issues.push(`${where}: legs not in diagonal pairs`);
      if (!count(svg, 'pg-tail') && !(id === 'rabbit' && view === 'front')) issues.push(`${where}: no tail`); // a rabbit's tail hides behind it
      if (view !== 'back' && !count(svg, 'pg-face-eyes')) issues.push(`${where}: eyes don't blink`);
    }
    if (kind === 'bird' && count(svg, 'pg-arm-left') + count(svg, 'pg-arm-right') < 1) issues.push(`${where}: no wings`);
    if (kind === 'fish' && !count(svg, 'pg-tail')) issues.push(`${where}: no tail fin`);
    if (id !== 'fish' && view !== 'back' && !count(svg, 'pg-head')) issues.push(`${where}: no head joint`);
    // Pivots stay inside the drawing
    for (const [, x, y] of svg.matchAll(/transform-origin: (-?[\d.]+)px (-?[\d.]+)px/g)) {
      if (x < 0 || x > 100 || y < 0 || y > 100) issues.push(`${where}: pivot ${x},${y} outside the drawing`);
    }
  }
}
check(!issues.length, `9 animals name their joints in every view (legs in trot pairs, head, tail, wings)${issues.length ? ': ' + issues.join('; ') : ''}`);

// 1b. People: the same root and a head joint in every style and view (the cute2d ball is all head);
// in profile, knees and elbows with fixed hip and shoulder pivots
const personIssues = [];
for (const id of ['boy', 'girl', 'man', 'woman']) {
  for (const style of STYLE_NAMES) {
    for (const view of ['front', 'three-quarter', 'side', 'back']) {
      const svg = svgOf(id, { view }, style);
      const where = `${id}/${style}/${view}`;
      if (!/class="pg-rig pg-rig-person pg-anim-blink"/.test(svg)) personIssues.push(`${where}: no person root`);
      if (style !== 'cute2d' && count(svg, 'pg-head') !== 1) personIssues.push(`${where}: ${count(svg, 'pg-head')} head joints`);
      const head = svg.slice(svg.indexOf('class="pg-head"'));
      if (style !== 'cute2d' && view !== 'back' && /pg-face-eyes/.test(svg) && !/pg-face-eyes/.test(head)) personIssues.push(`${where}: face not on the head`);
    }
  }
  const side = svgOf(id, { view: 'side', animation: 'walk' });
  if (count(side, 'pg-shin') !== 2 || count(side, 'pg-forearm') !== 2) personIssues.push(`${id}: profile without knees and elbows`);
  if (!/class="pg-leg-left" style="transform-box: view-box; transform-origin: [\d.]+px [\d.]+px"/.test(side)) personIssues.push(`${id}: profile hip has no fixed pivot`);
}
check(!personIssues.length, `people join the skeleton: root and head in 4 people x ${STYLE_NAMES.length} styles x 4 views, knees and elbows in profile${personIssues.length ? ': ' + personIssues.slice(0, 8).join('; ') : ''}`);
const idleA = svgOf('dog', { seed: 'a' }).match(/--pg-idle: (-[\d.]+s)/)?.[1], idleB = svgOf('dog', { seed: 'b' }).match(/--pg-idle: (-[\d.]+s)/)?.[1];
check(idleA && idleB && idleA !== idleB, `figures start their idle cycle at different points (${idleA}, ${idleB})`);

// 2. Every style keeps the skeleton
const lost = [];
for (const style of STYLE_NAMES) {
  for (const id of ['dog', 'bird', 'penguin']) {
    const svg = svgOf(id, { animation: 'walk' }, style);
    if (!/pg-rig-/.test(svg) || !count(svg, 'pg-leg-left') || wellFormedError(svg)) lost.push(`${id}/${style}`);
  }
}
check(!lost.length, `the skeleton survives all ${STYLE_NAMES.length} styles${lost.length ? ': ' + lost.join(', ') : ''}`);

// 3. The motion sits on the rig's root, and the scene doesn't wrap it again
check(/class="pg-rig pg-rig-quadruped pg-anim-run"/.test(svgOf('dog', { animation: 'run' })), 'the motion class is on the root of the skeleton');
const scene = generate('a dog running and a bird flying and a cat');
const dogAt = scene.svg.indexOf('data-id="dog"');
const dogItem = scene.svg.slice(dogAt, scene.svg.indexOf('class="movable-item"', dogAt + 1) >>> 0);
check((dogItem.match(/pg-anim-run/g) || []).length === 1, 'a running dog in a scene carries its motion once');
check(/pg-rig-bird[^"]*pg-anim-(flap|fly)/.test(scene.svg) && /pg-rig-quadruped pg-anim-blink/.test(scene.svg), 'birds in a scene flap, idle animals stay alive (blink, tail, ears)');
const toward = generate('a dog running towards us').svg;
check(/pg-rig-quadruped pg-rig-head-on pg-anim-walk/.test(toward), 'a dog running toward the camera steps head-on');

// 4. Motions on the joints, in a real browser
let chromium = null;
try {
  const req = createRequire(import.meta.url);
  try { ({ chromium } = req('playwright')); } catch { ({ chromium } = req(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright'))); }
} catch { /* not installed */ }
if (!chromium) {
  console.log('- SKIP: skeleton motions in a browser (Playwright is not installed)');
} else {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const cells = [
      ['dog', { animation: 'walk' }], ['dog', { animation: 'run' }], ['dog', { animation: 'wag' }], ['dog', { animation: 'jump' }],
      ['dog', { animation: 'walk', view: 'front' }], ['bird', { animation: 'flap' }], ['penguin', { animation: 'wave' }],
      ['elephant', { animation: 'wave' }], ['fish', {}], ['cat', { animation: 'sleep' }],
      ['boy', { animation: 'run', view: 'side' }], ['woman', { animation: 'walk', view: 'side' }], ['girl', { animation: 'talk' }], ['man', { seed: 'idle' }],
    ];
    await page.setContent(`<style>${ANIMATION_CSS}</style>` + cells.map(([id, o], i) => `<svg id="c${i}" viewBox="0 0 100 100" width="100">${svgOf(id, o)}</svg>`).join(''));
    const at = (i, sel, t) => page.evaluate(([i, sel, t]) => {
      const root = document.getElementById(`c${i}`);
      root.getAnimations({ subtree: true }).forEach((a) => { a.pause(); a.currentTime = t; });
      return [...root.querySelectorAll(sel)].map((e) => { const s = getComputedStyle(e); return { name: s.animationName, m: new DOMMatrix(s.transform) }; });
    }, [i, sel, t]);
    const angle = (m) => Math.round(Math.atan2(m.b, m.a) * 180 / Math.PI);

    const walk = await at(0, '.pg-leg-left, .pg-leg-right', 0);
    const lefts = await at(0, '.pg-leg-left', 0), rights = await at(0, '.pg-leg-right', 0);
    check(walk.every((l) => Math.abs(angle(l.m)) >= 15) && angle(lefts[0].m) === angle(lefts[1].m) && angle(lefts[0].m) === -angle(rights[0].m),
      `walking, the diagonal pairs swing together and opposite (${lefts.map((l) => angle(l.m))} / ${rights.map((l) => angle(l.m))}°)`);
    const gallop = await at(1, '.pg-leg-left, .pg-body-torso', 0);
    check(gallop[0].name === 'pgGallopLegL' && gallop.some((g) => g.name === 'pgGallopTorso'), 'running, a dog gallops and pitches its body');
    const wag = await page.evaluate(() => getComputedStyle(document.querySelector('#c2 .pg-rig')).animationName);
    const tail = await at(2, '.pg-tail', 0);
    check(wag === 'none' && tail[0].name === 'pgTailWag' && Math.abs(angle(tail[0].m)) > 5, `"wag" wags the tail (${angle(tail[0].m)}°), not the whole dog`);
    const front = (await at(3, '.pg-leg-front', 400)).map((l) => angle(l.m));
    const hind = (await at(3, '.pg-leg-hind', 400)).map((l) => angle(l.m));
    check(front.every((a) => a < -20) && hind.every((a) => a > 20), `jumping, front legs reach forward and hind legs back (${front} / ${hind}°)`);
    const step = await at(4, '.pg-leg-left', 0);
    check(step.every((l) => angle(l.m) === 0 && l.m.f < -2), 'seen head-on, legs step up and down instead of swinging');
    const wings = await at(5, '.pg-arm-left, .pg-arm-right', 160);
    check(wings.length === 2 && wings.every((w) => angle(w.m) > 40), `a flapping bird raises both wings (${wings.map((w) => angle(w.m))}°)`);
    const flipper = await at(6, '.pg-arm-right', 300);
    check(angle(flipper[0].m) < -30, `a penguin waves with its flipper (${angle(flipper[0].m)}°)`);
    const trunk = await at(7, '.pg-arm-right', 300);
    check(angle(trunk[0].m) < -30, `an elephant waves with its trunk (${angle(trunk[0].m)}°)`);
    const fin = await at(8, '.pg-tail', 0);
    check(fin[0].name === 'pgTailWag' && Math.abs(angle(fin[0].m)) > 5, 'a fish beats its tail fin');
    const runKnee = await at(10, '.pg-leg-left .pg-shin', 0.75 * 450);
    const runArm = await at(10, '.pg-forearm', 0);
    check(angle(runKnee[0].m) > 60 && runArm.every((f) => angle(f.m) < -60), `running in profile, the trailing knee folds (${angle(runKnee[0].m)}°) and the forearms pump (${runArm.map((f) => angle(f.m))}°)`);
    const stance = await at(11, '.pg-leg-left .pg-shin', 0.25 * 800), swing = await at(11, '.pg-leg-left .pg-shin', 0.75 * 800);
    check(angle(stance[0].m) === 0 && angle(swing[0].m) > 30, `walking, the knee is straight on the ground (${angle(stance[0].m)}°) and bends as the leg swings through (${angle(swing[0].m)}°)`);
    const nod = await at(12, '.pg-head', 125);
    check(nod[0].name === 'pgHeadNod' && Math.abs(angle(nod[0].m)) >= 2, `a talking girl nods (${angle(nod[0].m)}°)`);
    const delays = await page.evaluate(() => [...document.querySelectorAll('#c0 .pg-tail, #c13 .pg-head')].map((e) => getComputedStyle(e).animationDelay));
    check(delays.length === 2 && delays.every((d) => d.startsWith('-')), `idle cycles start at each figure's own point (${delays.join(', ')})`);
    const asleep = await at(9, '.pg-face-eyes', 0);
    check(asleep[0].m.d < 0.2, 'a sleeping cat closes its eyes');
  } finally {
    await browser.close();
  }
}

console.log(fails ? `\n${fails} skeleton check(s) failed` : '\nSkeleton test suite: ALL PASSED!');
process.exit(fails ? 1 : 0);
