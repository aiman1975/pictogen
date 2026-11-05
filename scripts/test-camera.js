// Camera moves: zoom in/out, pan, follow a character - as timeline beats or on their own.
import { cameraAction, extractCamera, generate, composeStory } from '../src/index.js';
import { wellFormedError } from './xml-check.js';
import { directShots } from '../src/director.js';

let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓ PASS' : '✗ FAIL'}: ${msg}`); if (!ok) fails++; };
const W = 640, H = 360;

// 1. Reading camera directions
const cam = (t) => { const c = cameraAction(t); return c ? `${c.type}${c.target ? ':' + c.target : ''}${c.dir ? ':' + c.dir : ''}` : '-'; };
for (const [t, want] of [
  ['zoom in on the dog', 'zoomIn:dog'], ['the camera zooms in on him', 'zoomIn:him'], ['a close-up of the boy', 'zoomIn:boy'],
  ['pull back', 'zoomOut'], ['wide shot', 'zoomOut'], ['the camera pans left', 'pan:-1'], ['pan to the tree', 'panTo:tree'],
  ['the camera follows the dog', 'follow:dog'], ['tracking shot', 'follow'],
  ['a dog follows the boy', '-'], ['a pan on the stove', '-'], ['a boy waving', '-'],
]) check(cam(t) === want, `"${t}" -> ${want} (got ${cam(t)})`);
const ex = extractCamera('a boy waving under a tree, zoom in on the boy');
check(ex.text === 'a boy waving under a tree' && ex.moves.length === 1, `camera clauses are taken out of the scene text (got "${ex.text}")`);
check(generate('zoom in on the dog').matches.map((m) => m.id).join() === 'dog', 'the word "camera"/"zoom" never draws a camera; the target is drawn');
check(generate('a close-up of a cat').matches.map((m) => m.id).join() === 'cat', 'a close-up still draws its subject');

// Helpers: the camera keyframes as [{ pct, tx, ty, z }] and a figure's position in the scene
const camKeys = (svg) => {
  const name = svg.match(/class="pg-camera" style="animation: (\S+) /)?.[1];
  const body = name && svg.match(new RegExp(`@keyframes ${name} \\{ (.*?) \\}\\s*\\}`))?.[1];
  return [...(body || '').matchAll(/([\d.]+)% \{ transform: translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+)\)/g)]
    .map(([, pct, tx, ty, z]) => ({ pct: +pct, tx: +tx, ty: +ty, z: +z }));
};
const figureX = (svg, id) => {
  const m = svg.match(new RegExp(`data-id="${id}"[^>]*transform="translate\\((-?[\\d.]+) (-?[\\d.]+)\\) scale\\((-?[\\d.]+)`));
  return m && +m[1] + 50 * Math.abs(+m[3]);
};
const inside = (keys) => keys.every((k) => k.tx <= 0.01 && k.tx >= W - k.z * W - 0.01 && k.ty <= 0.01 && k.ty >= H - k.z * H - 0.01);

// 2. Zoom in on its own: loops wide -> close-up -> wide, centred on the target, never past the edges
const zoom = generate('a boy waving under a tree, zoom in on the boy');
const zk = camKeys(zoom.svg);
check(zoom.duration > 4 && zk.length >= 4, `a lone zoom is a timed loop (${zoom.duration}s, ${zk.length} keys)`);
check(zk[0].z === 1 && zk[zk.length - 1].z === 1 && Math.max(...zk.map((k) => k.z)) >= 1.4, 'it starts and ends wide and zooms in at least 1.4x');
const close = zk.reduce((a, b) => (b.z > a.z ? b : a));
const boyOnScreen = close.tx + close.z * figureX(zoom.svg, 'boy');
check(Math.abs(boyOnScreen - W / 2) < W * 0.12, `the close-up is centred on the boy (at x=${boyOnScreen.toFixed(0)} of ${W})`);
check(inside(zk), 'the camera never shows past the edges of the scene');
check(!/class="pg-camera"[^>]*transform=/.test(zoom.svg), 'still renders (no animation) show the wide shot');

// 3. Camera beats in a timeline add their time and happen in order
const plain = generate('a boy walks in, then waves, then a dog runs to him');
const beat = generate('a boy walks in, then waves, then the camera zooms in on him, then a dog runs to him');
check(beat.duration >= plain.duration + 1.4, `a camera beat takes its own time (${plain.duration}s -> ${beat.duration}s)`);
const bk = camKeys(beat.svg);
const zoomStart = bk.find((k) => k.z > 1.01);
check(zoomStart && zoomStart.pct > 30, `the zoom happens after the boy has walked in and waved (starts at ${zoomStart?.pct}% of the clip)`);
check(inside(bk), 'timeline camera stays inside the scene');

// 4. Following a character: many keys tracking it, and it ends near the middle of the frame
const fol = generate('a girl walks in. then she walks to the tree. finally she waves. the camera follows her');
const fk = camKeys(fol.svg);
check(fk.length > 20, `following samples the actor's path (${fk.length} keys)`);
const end = fk[fk.length - 1];
const girlOnScreen = end.tx + end.z * figureX(fol.svg, 'girl');
check(Math.abs(girlOnScreen - W / 2) < W * 0.2 || end.tx === 0 || Math.abs(end.tx - (W - end.z * W)) < 1, `the camera ends on the girl (x=${girlOnScreen.toFixed(0)})`);
check(new Set(fk.map((k) => k.tx)).size > 5, 'the camera actually moves with her');
check(inside(fk), 'following stays inside the scene');

// 5. Pan: zoomed enough to have room, moving one way
const pan = generate('a tree and a house and a dog, the camera pans right');
const pk = camKeys(pan.svg);
const panning = pk.filter((k) => k.z >= 1.34);
check(panning.length >= 2 && panning[panning.length - 1].tx < panning[0].tx, 'panning right moves the view to the right');
check(inside(pk), 'panning stays inside the scene');

// 6. Well-formed in several styles
for (const style of ['flat', 'cartoon', 'sketch', 'stickman', 'neon']) {
  for (const t of ['a boy waving under a tree, zoom in on the boy', 'a boy walks in, then waves, then a dog runs to him. the camera follows the dog']) {
    const err = wellFormedError(generate(t, { style }).svg);
    if (err) check(false, `"${t}" [${style}]: ${err}`);
  }
}
check(true, 'camera scenes are well-formed in flat, cartoon, sketch, stickman and neon');


// The camera director (src/director.js): its own shots, and shots chosen on the scene card
{
  const says = (t, o = {}) => generate(t, { style: 'flat', ...o }).card?.camera?.says;
  check(says('a girl says “Hello there, how are you today?” in the park') === 'close on who speaks', 'director: close on someone while they speak');
  check(says('a boy waves, then a girl says “Hi!”, then the boy says “Let us play!”') === 'two-shot of who speaks', 'director: a two-shot when two talk');
  check(says('suddenly a monster appears in the forest and a boy') === 'pushing in (tense)', 'director: pushing in on a tense scene');
  check(/shake/.test(says('a car crashed into a tree')) && /pg-shake/.test(generate('a car crashed into a tree').svg), 'director: a shake for a crash');
  check(says('a girl smiles in the park', { shotContext: { last: true, first: false } }) === 'pulling back at the end', 'director: the last scene pulls back');
  check(says('a boy and a dog in the park', { shotContext: { index: 2, prevPlace: 'the beach' } }) === 'wide, then easing in', 'director: a new place is shown wide first');
  check(!/pg-camera/.test(generate('a red apple on a table').svg), 'director: nobody there, no camera move');
  const spell = generate('a yellow letter S, a red letter E, a blue letter V, a green letter E and a purple letter N say “We spell SEVEN!”', { style: 'flat' }).svg;
  const xs = [...spell.matchAll(/data-id="letter_(\w)"[^>]*translate\(([\d.]+)/g)].map((m) => [m[1], +m[2]]).sort((a, b) => a[1] - b[1]).map((m) => m[0]).join('');
  check(xs === 'seven', `letters spelling a word stay in one row, in their order (${xs})`);
  const boardSays = generate('a pink letter A points at the board that says “A B C” in the classroom, then the letter A says “I am A!”', { style: 'flat' });
  check(boardSays.card.camera.says === 'wide: the board in view', 'someone speaking by a board with words: the board stays in view');
  check(says('a yellow letter S, a red letter E, a blue letter V, a green letter E and a purple letter N wave, then the letter S says “We spell SEVEN!”') === 'wide: everyone in view', 'director: someone speaking in a crowd keeps everyone in view');
  check(says('a girl smiles in the park', { mood: 'calm' }) === 'a slow drift (mood)', 'director: a scene with a mood keeps its mood\'s camera');
  // (someone speaking right next to a friend: the close shot keeps the friend whole)
  const pair = (gap) => directShots({ T: 6, W: 640, H: 360, main: 'a', others: ['a', 'b'], speeches: [{ who: 'a', start: 1, end: 2.5, text: 'Hi!' }],
    where: (id) => ({ a: { x: 260, y: 230, h: 110 }, b: { x: 260 + gap, y: 230, h: 110 } })[id] });
  const near = pair(170), far = pair(400);
  const sees = (sh, x) => sh.keys.every((k) => Math.abs(x - k.fx) + 110 * 0.4 <= 640 / k.z / 2 + 1);
  check(sees(near, 430) && sees(near, 260), 'director: a close shot on someone keeps a friend beside them whole');
  check(far.says === 'close on who speaks' && Math.max(...far.keys.map((k) => k.z)) > Math.max(...near.keys.map((k) => k.z)), 'director: a friend far off still lets the close shot come in close');
  // Someone walking a long way before anyone speaks: the camera goes along with them
  const walker = directShots({ T: 6, W: 640, H: 360, main: 'a', others: ['a', 'b'], speeches: [],
    where: (id, t) => (id === 'a' ? { x: 120 + Math.min(1, t / 4) * 400, y: 230, h: 110 } : { x: 560, y: 230, h: 110 }) });
  const fxs = walker.keys.filter((k) => k.t <= 4).map((k) => k.fx);
  check(/going along with the walk/.test(walker.says) && fxs.at(-1) - fxs[0] > 100 && walker.keys.every((k) => k.z <= 1.31), `a long walk: the camera goes along (${walker.says}; ${fxs.map(Math.round).join(' → ')})`);
  const stay = directShots({ T: 6, W: 640, H: 360, main: 'a', others: ['a'], speeches: [], where: () => ({ x: 300, y: 230, h: 110 }) });
  check(!/walk/.test(stay?.says ?? ''), 'nobody walking: no going along');
  // Chosen
  const low = generate('a boy and a dog in the park', { style: 'flat', shot: 'low' }), high = generate('a boy and a dog in the park', { style: 'flat', shot: 'high' });
  const scaleOf = (svg) => +(svg.match(/data-id="boy"[^>]*scale\(([\d.]+)\)/)?.[1] ?? 0);
  check(scaleOf(low.svg) > scaleOf(high.svg) * 1.2 && low.card.camera.says === 'low angle', `a low angle: the figures loom; a high one: they look small (${scaleOf(low.svg)} vs ${scaleOf(high.svg)})`);
  check(generate('a boy and a dog in the park', { shot: 'close:dog' }).card.camera.shot === 'close:dog' && /pg-camera/.test(generate('a boy and a dog in the park', { shot: 'close:dog' }).svg), 'close on someone chosen');
  check(!/pg-camera|pg-mood-camera/.test(generate('suddenly a monster appears', { shot: 'steady' }).svg), 'steady: no camera move at all');
  check(generate('a boy walks to the tree', { shot: 'follow:boy' }).card.camera.says === 'following', 'following someone chosen');
  const st = composeStory('Mia smiled.\nMia waved.', { style: 'flat', sceneShots: { 'Mia waved.': 'pan-right' } });
  check(st.scenes[1].shotChosen && st.scenes[1].card.camera.says === 'panning right' && !st.scenes[0].shotChosen, 'a story: a shot chosen for one scene');
}

console.log(fails ? `\n${fails} camera check(s) failed` : '\nCamera test suite: ALL PASSED!');
process.exit(fails ? 1 : 0);
