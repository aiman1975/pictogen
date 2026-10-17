// Camera moves: zoom in/out, pan, follow a character - as timeline beats or on their own.
import { cameraAction, extractCamera, generate } from '../src/index.js';
import { wellFormedError } from './xml-check.js';

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

console.log(fails ? `\n${fails} camera check(s) failed` : '\nCamera test suite: ALL PASSED!');
process.exit(fails ? 1 : 0);
