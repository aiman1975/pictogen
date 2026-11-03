// Scene timelines: several actions one after another ("a boy walks in, then waves, then a dog runs to him").
import { parseTimeline, hasSequence, generate, composeStory, getConcept, editTimeline, parseText, lookRelations, drawConcept, shapesToSvg, speechRelations, lipKeys } from '../src/index.js';
import { wellFormedError } from './xml-check.js';

let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓ PASS' : '✗ FAIL'}: ${msg}`); if (!ok) fails++; };
const actions = (t) => parseTimeline(t)?.beats.map((b) => b.actions.map((a) => `${a.actor}:${a.type}${a.anim ? '/' + a.anim : ''}${a.target ? '>' + a.target : ''}${a.expression ? '~' + a.expression : ''}`).join('+')).join(' | ');

// 1. Reading the beats
check(!hasSequence('a boy next to a tree') && !parseTimeline('a boy waves'), 'no timeline without "then" / "after that" / "finally" ("next to" does not count)');
for (const [t, want] of [
  ['a boy walks in, then waves, then a dog runs to him', 'boy:enter | boy:pose/wave | dog:moveTo>boy'],
  ['a girl walks in, then smiles, then she jumps, finally she leaves', 'girl:enter | girl:expr~happy | girl:pose/jump | girl:exit'],
  ['a man and a woman walk in. then they dance. then the man walks to the tree', 'man:enter+woman:enter | man:pose/dance+woman:pose/dance | man:moveTo>tree'],
  ['a boy in the park then a cat appears then it runs to the boy', 'boy:appear | cat:enter | cat:moveTo>boy'],
  ['a man and a girl stand there, then she runs to him', 'man:appear+girl:appear | girl:moveTo>man'],
]) check(actions(t) === want, `"${t}"\n        -> ${want}${actions(t) === want ? '' : `\n   got  ${actions(t)}`}`);

// 2. The rendered clip
const prompt = 'a boy walks in, then waves, then a dog runs to him';
const r = generate(prompt);
check(r.duration > 4 && r.duration < 15 && r.beats?.length === 3, `generate() reports the clip length and beats (got ${r.duration}s, ${r.beats?.length} beats)`);
check(!wellFormedError(r.svg), 'the timeline scene is well-formed XML');
check(!r.svg.includes('class="pg-parallax-ground"'), 'no sideways-scrolling ground under a timeline');

// Pull one actor's figure out of the scene
const actor = (svg, id) => {
  const start = svg.indexOf(`data-actor="${id}"`);
  const open = svg.lastIndexOf('<g', start);
  let depth = 0, end = open;
  const re = /<g[\s>]|<\/g>/g;
  re.lastIndex = open;
  for (let m; (m = re.exec(svg));) { depth += m[0] === '</g>' ? -1 : 1; if (!depth) { end = re.lastIndex; break; } }
  return svg.slice(open, end);
};
const boy = actor(r.svg, 'boy'), dog = actor(r.svg, 'dog');
check(boy.includes('pg-anim-walk') && boy.includes('pg-profile') && boy.includes('pg-anim-wave'), 'the boy has a walking profile pose and a waving pose');
check((boy.match(/class="pg-timeline-pose"[^>]*opacity="1"/g) || []).length === 1 && (dog.match(/class="pg-timeline-pose"[^>]*opacity="1"/g) || []).length === 1,
  'each actor shows exactly one pose in a still (no-animation) render');

// Keyframes: positions start off-screen for actors that enter, and the dog stays hidden until its beat
const kf = (name) => r.svg.match(new RegExp(`@keyframes ${name} \\{ (.*?) \\}\\s*\\}`))?.[1] ?? '';
const moveName = (fig) => fig.match(/class="pg-timeline-move" style="animation: (\S+) /)[1];
const scaleOf = (fig) => +fig.match(/scale\(([\d.]+)\)/)[1];
const homeOf = (fig) => { const [, x] = fig.match(/translate\((-?[\d.]+) /); return +x + 50 * scaleOf(fig); };
// Position keyframes are translate(50 + dx, base + dy) scale(k) translate(-50, -base): dx is the offset
const offsets = (body) => [...body.matchAll(/([\d.]+)% \{ transform: translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+)\)/g)]
  .map(([, pct, x, y, k]) => ({ pct: +pct, dx: +x - 50, y: +y, k: +k }));
const firstX = (fig) => offsets(kf(moveName(fig)))[0].dx * scaleOf(fig);
const W = 640;
check(homeOf(boy) + firstX(boy) < 0 || homeOf(boy) + firstX(boy) > W, `the boy starts off-screen (x=${(homeOf(boy) + firstX(boy)).toFixed(0)})`);
check(homeOf(dog) + firstX(dog) < 0 || homeOf(dog) + firstX(dog) > W, `the dog starts off-screen (x=${(homeOf(dog) + firstX(dog)).toFixed(0)})`);
const dogPoses = [...dog.matchAll(/style="animation: (\S+) /g)].map((m) => m[1]).filter((n) => /v\d+$/.test(n));
check(dogPoses.every((n) => /^0% \{ opacity: 0; \}/.test(kf(n))), 'the dog is hidden until its beat');
const gap = Math.abs(homeOf(dog) - homeOf(boy));
const near = (getConcept('boy').width * scaleOf(boy) * 100 + getConcept('dog').width * scaleOf(dog) * 100) / 2;
check(gap > near && gap < near + W * 0.12, `the dog ends up beside the boy (${gap.toFixed(0)}px apart, at least ${near.toFixed(0)})`);

// The boy turns: profile while walking, facing us while waving (a pose variant per view)
check(boy.includes('class="pg-profile"') && /class="pg-face-eyes"/.test(boy.replace(/<g class="pg-profile">[\s\S]*?<\/g><\/g><\/g>/, '')), 'walking in profile, then facing us');

// Once the dog has run up, the boy turns three-quarters toward it (his turned face is narrowed)
check(boy.includes('scale(0.78 1)'), 'the boy turns three-quarters toward the dog that ran up to him');
const alone = generate('a girl walks in, then waves');
check(!alone.svg.includes('scale(0.78 1)'), 'with nobody else around, a standing figure faces the camera');

// 2b. Several of one kind: each is its own figure, they act together, walk in one after another
// (the one going furthest first) and line up beside a group target
const group = generate('two boys walk in, then they wave, then three dogs run to them');
const figures = (id) => [...group.svg.matchAll(new RegExp(`data-id="${id}" data-k="(\\d)"[^>]*data-actor="${id}"`, 'g'))].map((m) => actor2(group.svg, id, +m[1]));
function actor2(svg, id, k) {
  const start = svg.indexOf(`data-id="${id}" data-k="${k}"`);
  const open = svg.lastIndexOf('<g', start);
  let depth = 0, end = open;
  const re = /<g[\s>]|<\/g>/g;
  re.lastIndex = open;
  for (let m; (m = re.exec(svg));) { depth += m[0] === '</g>' ? -1 : 1; if (!depth) { end = re.lastIndex; break; } }
  return svg.slice(open, end);
}
const boys = figures('boy'), dogs = figures('dog');
check(boys.length === 2 && dogs.length === 3, `"two boys" and "three dogs" are 2 + 3 figures (got ${boys.length} + ${dogs.length})`);
check(boys.every((b) => b.includes('pg-anim-wave')), 'both boys wave ("they wave")');
const homes = (figs) => figs.map(homeOf).sort((a, b) => a - b);
const bh = homes(boys), dh = homes(dogs);
check(Math.min(...dh) > Math.max(...bh), `the dogs line up beside the boys, not between them (boys at ${bh.map((x) => x.toFixed(0))}, dogs at ${dh.map((x) => x.toFixed(0))})`);
const spaced = (xs, minGap) => xs.every((x, i) => i === 0 || x - xs[i - 1] >= minGap);
check(spaced(dh, 20) && spaced(bh, 20), 'figures of a group end up side by side, not on top of each other');
// Entering one after another: the boys' moves start at different times, the furthest-going first
const startPct = (fig) => {
  const body = group.svg.match(new RegExp(`@keyframes ${moveName(fig)} \\{ (.*?) \\}\\s*\\}`))?.[1] ?? '';
  const frames = offsets(body).map((o) => [o.pct, o.dx]);
  const i = frames.findIndex(([, x], j) => j < frames.length - 1 && frames[j + 1][1] !== x);
  return frames[i]?.[0];
};
const leadFirst = [...boys].sort((a, b) => homeOf(b) - homeOf(a)).map(startPct);
check(leadFirst[0] < leadFirst[1], `the boy walking furthest sets off first (${leadFirst.map((p) => p + '%').join(' then ')})`);
check(!wellFormedError(group.svg), 'the group timeline is well-formed XML');

// 2c. Toward and away from the camera inside a timeline
for (const [t, want] of [
  ['a boy walks toward us, then waves, then walks away into the distance', 'boy:approach | boy:pose/wave | boy:recede'],
  ['a dog runs from far away, then it sits', 'dog:approach | dog:pose/sit'],
  ['a girl walks in, then she comes closer, then she walks off', 'girl:enter | girl:approach | girl:exit'],
  ['a woman approaches, then she walks away from the camera', 'woman:approach | woman:recede'],
  ['a boy walks in, then walks toward the tree', 'boy:enter | boy:moveTo>tree'],
]) check(actions(t) === want, `"${t}"\n        -> ${want}${actions(t) === want ? '' : `\n   got  ${actions(t)}`}`);
check(!generate('a man walks toward the camera, then he waves').matches.some((m) => m.id === 'camera'), '"toward the camera" does not draw a camera');

const there = generate('a boy walks toward us, then waves, then walks away into the distance');
const tb = actor(there.svg, 'boy');
const depthBody = there.svg.match(new RegExp(`@keyframes ${moveName(tb)} \\{ (.*?) \\}\\s*\\}`))[1];
const ks = offsets(depthBody).map((o) => o.k);
check(ks[0] < 0.25 && Math.max(...ks) === 1 && ks[ks.length - 1] < 0.25, `the boy comes from the horizon to full size and goes back (scale ${ks[0]} -> ${Math.max(...ks)} -> ${ks[ks.length - 1]})`);
check(/100% \{ transform/.test(depthBody), 'a figure that has left holds its place to the end of the loop');
const poseViews = [...tb.matchAll(/class="pg-timeline-pose"([^>]*)>/g)].map((m) => m[1]);
check(poseViews.some((a) => /data-anim="walk"/.test(a) && /data-view="front"/.test(a)) && poseViews.some((a) => /data-anim="walk"/.test(a) && /data-view="back"/.test(a)),
  'walking toward us shows the face, walking away the back');
const shadowAnim = tb.match(/<g style="animation: (\S+) [\d.]+s step-end infinite;"><ellipse class="pg-shadow"/)?.[1];
const shadowKf = shadowAnim && there.svg.match(new RegExp(`@keyframes ${shadowAnim} \\{ (.*?) \\}\\s*\\}`))[1];
check(shadowKf && /opacity: 0;\s*\}?\s*$/.test(shadowKf), "the shadow goes with the figure when it has walked away");
const closer = generate('a girl walks in, then she comes closer');
const cg = actor(closer.svg, 'girl');
const cks = offsets(closer.svg.match(new RegExp(`@keyframes ${moveName(cg)} \\{ (.*?) \\}\\s*\\}`))[1]).map((o) => o.k);
check(Math.max(...cks) > 1.1, `"comes closer" from the front row is a step toward the camera (scale up to ${Math.max(...cks)})`);
check(!wellFormedError(there.svg) && !wellFormedError(closer.svg), 'depth timelines are well-formed XML');

// 2d. Two things at once: "while", "meanwhile", "at the same time"
for (const [t, want] of [
  ['a boy walks in, then while he waves, a dog runs to him', 'boy:enter | dog:moveTo>boy+boy:pose/wave'],
  ['a dog runs in while a boy waves', 'dog:enter+boy:pose/wave'],
  ['a boy walks in. then he waves. meanwhile a dog runs to him', 'boy:enter | boy:pose/wave+dog:moveTo>boy'],
  ['a boy dances, at the same time a girl jumps', 'boy:pose/dance+girl:pose/jump'],
  ['while a boy waves, a dog runs to him', 'dog:moveTo>boy+boy:pose/wave'],
]) check(actions(t) === want, `"${t}"\n        -> ${want}${actions(t) === want ? '' : `\n   got  ${actions(t)}`}`);

const together = generate('a boy walks in, then while he waves, a dog runs to him');
const oneAfter = generate('a boy walks in, then he waves, then a dog runs to him');
check(together.duration < oneAfter.duration - 1, `"while" overlaps the actions instead of adding them up (${together.duration}s vs ${oneAfter.duration}s one after another)`);
// The wave lasts until the dog has arrived: the boy's waving pose stays on at least until the dog stops
const wb = actor(together.svg, 'boy'), wd = actor(together.svg, 'dog');
const kfOf = (svg, name) => svg.match(new RegExp(`@keyframes ${name} \\{ (.*?) \\}\\s*\\}`))?.[1] ?? '';
const waveName = wb.match(/class="pg-timeline-pose" data-anim="wave"[^>]*style="animation: (\S+) /)?.[1];
const waveOn = [...kfOf(together.svg, waveName).matchAll(/([\d.]+)% \{ opacity: (\d)/g)].map((m) => [+m[1], +m[2]]);
const waveEnd = waveOn.find(([, o], i) => o === 0 && i > 0 && waveOn[i - 1][1] === 1)?.[0];
const dogFrames = offsets(kfOf(together.svg, moveName(wd)));
const dogArrives = dogFrames.find((f) => Math.abs(f.dx) < 0.01)?.pct;
check(waveEnd !== undefined && dogArrives !== undefined && waveEnd >= dogArrives, `the boy keeps waving until the dog has run up to him (wave ends at ${waveEnd}%, dog arrives at ${dogArrives}%)`);
const sitting = actor(generate('a boy waves while sitting').svg, 'boy');
check(sitting.includes('data-anim="wave"') && !sitting.includes('data-anim="sit"'), 'the main clause wins when both give the same figure something to do ("waves while sitting")');
const zoomWave = generate('a girl walks in, then the camera zooms in on her while she waves');
const zoomThenWave = generate('a girl walks in, then the camera zooms in on her, then she waves');
check(zoomWave.svg.includes('pg-camera') && zoomWave.duration < zoomThenWave.duration - 1, `the camera can move while the actors act (${zoomWave.duration}s vs ${zoomThenWave.duration}s one after another)`);
check(!wellFormedError(together.svg) && !wellFormedError(zoomWave.svg), '"while" timelines are well-formed XML');

// 2e. "when", "after", "before", "until", and actions joined by "and"
for (const [t, want] of [
  ['when the dog arrives, the boy jumps', 'dog:enter | boy:pose/jump'],
  ['the boy jumps when the dog arrives', 'dog:enter | boy:pose/jump'],
  ['when the dog arrives the boy jumps', 'dog:enter | boy:pose/jump'],
  ['after the girl waves, the cat runs to her', 'girl:pose/wave | cat:moveTo>girl'],
  ['the cat runs to her after the girl waves', 'girl:pose/wave | cat:moveTo>girl'],
  ['before the dog arrives, the boy waves', 'boy:pose/wave | dog:enter'],
  ['the boy waves before the dog arrives', 'boy:pose/wave | dog:enter'],
  ['the boy waves until the dog runs to him', 'boy:pose/wave+dog:moveTo>boy'],
  ['as soon as the dog reaches him, the boy jumps', 'dog:moveTo>boy | boy:pose/jump'],
  ['the boy jumps once the dog arrives', 'dog:enter | boy:pose/jump'],
  ['the dog approaches the boy, then the boy jumps', 'dog:moveTo>boy | boy:pose/jump'],
  ['a boy walks in, then when a dog runs to him he jumps, then waves', 'boy:enter | dog:moveTo>boy | boy:pose/jump | boy:pose/wave'],
  ['a boy walks in and waves, then a dog runs to him', 'boy:enter | boy:pose/wave | dog:moveTo>boy'],
  ['a boy walks in, then waves and smiles', 'boy:enter | boy:pose/wave~happy'],
  ['a boy walks in and a dog and a cat run to him, then he jumps', 'boy:enter | dog:moveTo>boy+cat:moveTo>boy | boy:pose/jump'],
  ['a boy walks in with a hat and sunglasses, then waves', 'boy:enter | boy:pose/wave'],
  ['a boy walks in, then a dog runs to him, then they dance', 'boy:enter | dog:moveTo>boy | dog:pose/dance+boy:pose/dance'],
  ['a boy and a girl walk in, then they wave', 'boy:enter+girl:enter | boy:pose/wave+girl:pose/wave'],
]) check(actions(t) === want, `"${t}" -> ${want}${actions(t) === want ? '' : ` (got ${actions(t)})`}`);
for (const t of ['a dog runs after the cat', 'a cat sitting before the fire', 'after lunch, the boy sleeps']) {
  check(parseTimeline(t) === null, `"${t}" is a still scene, not a sequence`);
}
const cue = generate('when the dog arrives, the boy jumps');
const cb = actor(cue.svg, 'boy'), cd = actor(cue.svg, 'dog');
const poseOn = (fig, svg, anim) => {
  const name = fig.match(new RegExp(`class="pg-timeline-pose" data-anim="${anim}"[^>]*style="animation: (\\S+) `))?.[1];
  const keys = [...kfOf(svg, name).matchAll(/([\d.]+)% \{ opacity: (\d)/g)].map((m) => [+m[1], +m[2]]);
  return keys.find(([, o]) => o === 1)?.[0];
};
const jumpStarts = poseOn(cb, cue.svg, 'jump');
const cueArrives = offsets(kfOf(cue.svg, moveName(cd))).find((f, i) => i > 0 && Math.abs(f.dx) < 0.01)?.pct;
check(jumpStarts !== undefined && cueArrives !== undefined && Math.abs(jumpStarts - cueArrives) < 1, `the boy jumps the moment the dog arrives (jump at ${jumpStarts}%, dog arrives at ${cueArrives}%)`);
const standPose = cb.match(/class="pg-timeline-pose"[^>]*style="animation: (\S+) /)[1];
check(/^0% \{ opacity: 1/.test(kfOf(cue.svg, standPose)), 'the boy is on stage from the start, waiting for the dog');
check(!wellFormedError(cue.svg), '"when" timelines are well-formed XML');

// 2f. Edited timelines (the studio's timeline view)
const cast = parseText('a boy, a dog and a tree').matches;
const ed = editTimeline([
  { actions: [{ actor: 'boy', type: 'enter', gait: 'run' }, { actor: 'boy', type: 'pose', anim: 'wave' }] },
  { actions: [{ actor: 'dog', type: 'moveTo', target: 'tree' }, { actor: 'cat', type: 'enter' }, { actor: 'boy', type: 'moveTo', target: 'boy' }] },
  { actions: [{ actor: 'boy', type: 'pose', anim: 'explode' }, { actor: 'dog', type: 'expr' }], camera: { type: 'zoomIn', target: 'nobody' } },
  { actions: [{ actor: 'dog', type: 'expr', expression: 'sad' }], camera: { type: 'panTo' } },
], cast);
const edSummary = ed.beats.map((b) => b.actions.map((a) => `${a.actor}:${a.type}${a.target ? '>' + a.target : ''}${a.expression ? '~' + a.expression : ''}`).join('+') + (b.camera ? ` [${b.camera.type}${b.camera.target ? '>' + b.camera.target : ''}]` : '')).join(' | ');
check(edSummary === 'boy:enter | dog:moveTo>tree |  [zoomIn] | dog:expr~sad', `edited steps keep what fits and drop the rest (${edSummary})`);
check(ed.actors.map((a) => a.id).join() === 'boy,dog' && ed.props.map((m) => m.id).join() === 'tree', 'figures that act become actors, the rest stay props');
check(editTimeline([{ actions: [{ actor: 'cat', type: 'enter' }] }], cast) === null && editTimeline('junk', cast) === null, 'nothing left to play -> no timeline');
const reordered = generate('a boy walks in, then waves, then a dog runs to him', { beats: [
  { actions: [{ actor: 'dog', type: 'enter', gait: 'run' }] }, { actions: [{ actor: 'boy', type: 'moveTo', target: 'dog' }] },
] });
check(reordered.edited && reordered.beats.length === 2 && reordered.beats[1].t0 === reordered.beats[0].t1 && !wellFormedError(reordered.svg), 'generate() plays edited steps back to back');

// 2g. Step lengths: "for 3 seconds" in the prompt, or set in the timeline view
const lengths = (t, opts) => generate(t, opts).beats.map((b) => +(b.t1 - b.t0).toFixed(2));
check(lengths('a boy walks in, then waves for 3 seconds, then a dog runs to him')[1] === 3, '"waves for 3 seconds" makes a 3s step');
check(lengths('a boy walks in, then waves for a while, then a dog runs to him')[1] === 4 && lengths('a boy walks in for a moment, then waves')[0] === 1.2, '"for a while" and "for a moment" set lengths too');
check(lengths('the camera zooms in on the dog for four seconds, then the dog jumps')[0] === 4, 'a camera move can be given a length ("for four seconds")');
const timedProps = parseTimeline('a boy walks in, then waves for 3 seconds, then a dog runs to him').props;
check(!timedProps.length, 'the length words are not drawn ("3 seconds" is no object)');
const squeezed = generate('a boy walks in, then waves, then a dog runs to him', { beats: [
  { actions: [{ actor: 'boy', type: 'enter' }], duration: 0.5 }, { actions: [{ actor: 'boy', type: 'pose', anim: 'wave' }], duration: 99 },
  { actions: [{ actor: 'dog', type: 'moveTo', target: 'boy' }], duration: 'abc' },
] });
const sq = squeezed.beats.map((b) => +(b.t1 - b.t0).toFixed(2));
check(sq[0] === 0.5 && sq[1] === 20 && sq[2] > 0.5 && !wellFormedError(squeezed.svg), `edited lengths: a walk squeezed into 0.5s, a step capped at 20s, nonsense ignored (${sq.join(', ')}s)`);

// 2h. Eye gaze and looking at each other
const looksOf = (t) => parseTimeline(t)?.beats.map((b) => b.actions.map((a) => `${a.actor}:${a.type}${a.target ? '>' + a.target : ''}${a.lookAt ? '@' + a.lookAt : ''}`).join('+')).join(' | ');
for (const [t, want] of [
  ['a boy and a girl walk in, then they look at each other', 'boy:enter+girl:enter | boy:look>girl+girl:look>boy'],
  ['a boy walks in, then a dog runs in, then the boy looks at the dog', 'boy:enter | dog:enter | boy:look>dog'],
  ['a girl walks in, then waves at us', 'girl:enter | girl:pose@camera'],
  ['a boy walks in, then a girl runs to him, then she smiles at him', 'boy:enter | girl:moveTo>boy | girl:expr@boy'],
  ['two boys walk in, then they look at each other', 'boy:enter | boy:look>boy'],
  ['a boy walks in, then watches the bird', 'boy:enter | boy:look>bird'],
  ['a boy walks in, then looks toward the house', 'boy:enter | boy:look>house'],
]) check(looksOf(t) === want, `"${t}" -> ${want}${looksOf(t) === want ? '' : ` (got ${looksOf(t)})`}`);
const rel = (t) => lookRelations(t).map((l) => `${l.who}>${l.at}`).join(' ');
check(rel('a boy and a girl looking at each other') === 'boy>girl girl>boy' && rel('a cat staring at the bird') === 'cat>bird' && rel('a boy waving at us') === 'boy>camera' && rel('a dog and a cat') === '',
  'still scenes know who looks at whom ("looking at each other", "staring at", "waving at us")');
const stray = ['a boy watches the dog', 'a girl stares at the cat', 'the boy smiles at her'].map((t) => parseText(t).matches.map((m) => m.id).join(','));
check(stray.join(' / ') === 'boy,dog / girl,cat / boy', `looking verbs draw nothing extra (no wristwatches, stars or cats: ${stray.join(' / ')})`);
const eyes = (o, style = 'flat') => shapesToSvg(drawConcept('girl', { seed: 1, style, ...o }), style);
check(eyes({ gaze: { x: 1, y: 0 } }).includes('translate(2.6 0)') && eyes({ gaze: { x: 1, y: 0 } }, 'stickman').includes('translate(2.6 0)') && !eyes({}).includes('translate(2.6'),
  'gaze moves the eyes toward the target, in the hand-drawn and the stylized faces');
const mutual = generate('a boy and a girl looking at each other');
const mutualItems = [...mutual.svg.matchAll(/<g class="movable-item" data-id="(boy|girl)"[^>]*data-view="([a-z-]+)"[^>]*transform="([^"]+)"/g)].map((m) => [m[1], m[2], m[3].includes('scale(-')]);
check(mutualItems.length === 2 && mutualItems.every(([, v]) => v === 'three-quarter') && mutualItems.filter(([, , mirrored]) => mirrored).length === 1,
  `"looking at each other": both turn three-quarters, toward each other (${JSON.stringify(mutualItems)})`);
const looked = generate('a boy and a girl walk in, then they look at each other, then a dog runs in, then the boy looks at the dog');
const boyPoses = actor(looked.svg, 'boy').match(/class="pg-timeline-pose"[^>]*data-view="three-quarter"/g) || [];
check(boyPoses.length >= 1 && /translate\(1\.82 0\)/.test(actor(looked.svg, 'boy')), `in a timeline, looking at someone turns the figure and its eyes (${boyPoses.length} turned poses)`);
const edLook = editTimeline([{ actions: [{ actor: 'boy', type: 'look', target: 'nobody' }, { actor: 'girl', type: 'pose', anim: 'wave', lookAt: 'boy' }] }], parseText('a boy and a girl').matches);
check(edLook.beats[0].actions.map((a) => `${a.actor}:${a.type}>${a.target ?? ''}@${a.lookAt ?? ''}`).join(' ') === 'boy:look>camera@ girl:pose>@boy', 'edited steps: a look at nobody looks at us; a wave can be aimed at someone');
check(!wellFormedError(mutual.svg) && !wellFormedError(looked.svg), 'scenes with looks are well-formed XML');

// 2i. Named individuals: two of a kind, each its own figure ("pgc1", "pgc2": two boys)
const IND = [{ key: 'pgc1', base: 'boy' }, { key: 'pgc2', base: 'boy' }, { key: 'pgc3', base: 'girl' }];
const ind = generate('pgc1 walks in, then pgc2 runs to him, then they look at each other', { individuals: IND });
const indActs = ind.beats.map((b) => b.actions.map((a) => `${a.actor}:${a.type}${a.target ? '>' + a.target : ''}`).join('+')).join(' | ');
check(indActs === 'boy~pgc1:enter | boy~pgc2:moveTo>boy~pgc1 | boy~pgc2:look>boy~pgc1+boy~pgc1:look>boy~pgc2', `two boys act on their own: ${indActs}`);
const whoAttrs = [...ind.svg.matchAll(/data-who="(pgc\d)"/g)].map((m) => m[1]).join();
check(whoAttrs === 'pgc1,pgc2' && /data-seed="who:pgc1"/.test(ind.svg) && /data-seed="who:pgc2"/.test(ind.svg), 'each is marked with its key, and dressed by his own look, not by who else is there');
const stillTwo = generate('pgc1 and pgc2 dancing under the stars', { individuals: IND });
check(stillTwo.matches.map((m) => `${m.id}/${m.animation}`).join() === 'boy~pgc1/dance,boy~pgc2/dance,star/undefined' && !wellFormedError(stillTwo.svg), 'a still scene draws both, both dancing');
const mixed = generate('pgc1 and a boy walk in, then pgc1 waves', { individuals: IND });
check(mixed.beats[1].actions.map((a) => a.actor).join() === 'boy~pgc1', 'a named boy and an unnamed boy are different figures ("pgc1 waves": only he waves)');
check(generate('pgc1 eats an apple', { individuals: IND, mode: 'icons' }).matches.map((m) => m.id).join() === 'boy,apple', 'outside scenes a named boy is just a boy');
check(generate('pgc9 walks in, then waves', { individuals: [{ key: 'pgc9', base: 'nonsense' }, { key: 'tom', base: 'boy' }] }).beats === undefined, 'unknown kinds and keys that are not neutral ("tom") are ignored');
const indEdit = generate('pgc1 walks in, then waves', { individuals: IND, beats: [{ actions: [{ actor: 'boy~pgc1', type: 'pose', anim: 'jump' }] }] });
check(indEdit.edited && indEdit.beats[0].actions[0].actor === 'boy~pgc1', 'edited steps keep the individual');
const trio = generate('pgc1 and pgc2 walk in, then pgc3 runs to them', { individuals: IND });
const byWho = (who) => { const i = trio.svg.indexOf(`data-who="${who}"`); return trio.svg.slice(trio.svg.lastIndexOf('<g class="movable-item"', i), trio.svg.indexOf('class="movable-item"', i + 1) >>> 0); };
const trioHomes = ['pgc1', 'pgc2', 'pgc3'].map((w) => homeOf(byWho(w)));
const closest = Math.min(...trioHomes.flatMap((a, i) => trioHomes.slice(i + 1).map((b) => Math.abs(a - b))));
check(closest > 40, `walking up to a group, nobody ends on top of someone (${trioHomes.map(Math.round).join(', ')})`);

// 2i-b. Recurring characters: the same look in every scene, clip and comic panel
{
  const figureOf = (svg, who) => { const i = svg.indexOf(`data-who="${who}"`); const j = svg.indexOf('class="movable-item"', i + 1); return i < 0 ? '' : svg.slice(i, j < 0 ? undefined : j); };
  const fills = (frag) => [...new Set(frag.match(/fill="#[0-9a-f]{6}"/gi) || [])].sort().join();
  const together = generate('pgc1 and pgc2 walk in', { individuals: IND }).svg, alone = generate('pgc2 waves', { individuals: IND }).svg;
  check(fills(figureOf(together, 'pgc2')).length > 0 && figureOf(alone, 'pgc2').includes(fills(figureOf(alone, 'pgc2')).split(',')[0]) && fills(figureOf(together, 'pgc2')).split(',').filter((f) => /#00897b|#1e88e5|#e53935|#43a047|#fb8c00|#8e24aa/i.test(f)).join() === fills(figureOf(alone, 'pgc2')).split(',').filter((f) => /#00897b|#1e88e5|#e53935|#43a047|#fb8c00|#8e24aa/i.test(f)).join(),
    'a named boy wears the same shirt with someone else or alone (it no longer depends on who else is in the scene)');
  const OWN = [{ key: 'pgc1', base: 'girl', look: { seed: 'k3f9', main: '#ffca28', hair: '#212121', skin: '#8d5524' } }, { key: 'pgc2', base: 'dog', look: { main: '#212121' } }];
  const s1 = generate('pgc1 walks in, then waves at pgc2', { individuals: OWN }).svg, s2 = generate('pgc1 and a boy dance in the park', { individuals: OWN, seed: 7 }).svg;
  check([s1, s2].every((svg) => ['#ffca28', '#212121', '#8d5524'].every((c) => figureOf(svg, 'pgc1').toLowerCase().includes(c))) && /data-colors="main:#ffca28 hair:#212121 skin:#8d5524"/.test(s1),
    'a character with its own colours (yellow dress, black hair, dark skin) wears them in every scene, whatever its seed');
  check(figureOf(s1, 'pgc2').includes('#212121'), 'pets have their own colour too (a black dog)');
  check(generate('pgc1 walks in', { individuals: [{ key: 'pgc1', base: 'girl', look: { main: 'red; x', skin: '#zzzzzz', seed: '../x' } }] }).svg.includes('data-seed="who:pgc1"'), 'looks that are not plain colours and seeds are ignored');
  const comic = generate('pgc1 finds pgc2 "Hi!" "Woof!" "Best friends!"', { mode: 'comic', individuals: OWN }).svg;
  check((comic.match(/<g data-who="pgc1"/g) || []).length === 3 && (comic.match(/<g data-who="pgc2"/g) || []).length === 1, 'in a comic strip a named character is in all three panels, marked for its photo face');
  check(/<tspan data-who="pgc1">GIRL<\/tspan> FINDS <tspan data-who="pgc2">DOG<\/tspan>/.test(comic) && !/PGC\d/.test(comic), 'its title says "GIRL FINDS DOG" (no keys), marked for the studio to write the names');
  // (comic ink: purple prints as #9646cd)
  const purpleComic = generate('a girl in a purple dress finds a kite', { mode: 'comic' }).svg;
  check(/#9646cd/i.test(purpleComic) && !/#9646cd/i.test(generate('a girl finds a kite', { mode: 'comic' }).svg), 'a comic strip\'s hero wears what the prompt says');
  // Saying what someone wears and their hair: their colours, not more things to draw
  const said = (t) => parseText(t).matches.map((m) => [m.id, m.color, m.hair, m.heldBy].filter(Boolean).join(':')).join(' ');
  check(said('a girl in a purple dress walks in') === 'girl:purple', `"a girl in a purple dress": a purple dress on the girl (${said('a girl in a purple dress walks in')})`);
  check(said('a man wearing a red coat and a dog') === 'man:red dog', '"wearing a red coat"');
  check(said('a boy with curly black hair') === 'boy:#212121', '"with curly black hair": his hair');
  check(said('a blonde woman reads a book') === 'woman:#e6b94f book:woman' && said('a red-haired girl') === 'girl:#c8662b', '"a blonde woman", "a red-haired girl"');
  check(said('a girl wearing a yellow t-shirt waves') === 'girl:yellow' && said('a woman dressed in blue') === 'woman:blue', '"a yellow t-shirt", "dressed in blue"');
  check(said('a girl with a red ball') === 'girl ball:red:girl' && said('a boy in a park') === 'boy' && said('a cat in a box') === 'cat box', 'not a description: "with a red ball", "in a park", "a cat in a box"');
  const green = generate('a boy in a green shirt walks in, then waves').svg;
  check((green.match(/#43a047/gi) || []).length > 2, 'a timeline\'s figure wears what the prompt says in every pose');
  // A clip: one look for the whole story, a colour said once kept
  const clip = composeStory([{ prompt: 'a girl in a purple dress with blonde hair walks in' }, { prompt: 'the girl flies a kite' }, { prompt: 'the girl waves, then a boy runs to her' }]);
  check(clip.scenes.every((sc) => /#8e24aa/i.test(sc.svg) && /#e6b94f/i.test(sc.svg)), 'in a clip, the girl in the purple dress with blonde hair is the same girl in every scene');
  const named = composeStory([{ prompt: 'pgc1 walks in' }, { prompt: 'pgc2 and pgc1 play' }], { individuals: OWN });
  check(named.scenes.every((sc) => figureOf(sc.svg, 'pgc1').toLowerCase().includes('#ffca28')), 'a named character keeps its look through a clip');
}

// 2i-c. Doing things together: sitting on something, riding a bike, holding hands, hugging
{
  const rel = (t) => parseText(t).matches.map((m) => [m.id, m.animation, m.carries && `${m.carries.how}:${m.carries.by}`, m.pair && `${m.pair.how}:${m.pair.with}`].filter(Boolean).join('/')).join(' ');
  check(rel('a boy sits on a chair') === 'boy/sit chair/sit:boy' && rel('a boy and a girl sit on a bench') === 'boy/sit girl/sit bench/sit:boy,girl',
    `"sits on a chair", "a boy and a girl sit on a bench": who sits on what (${rel('a boy and a girl sit on a bench')})`);
  check(rel('a girl rides a bike') === 'girl/sit bike/ride:girl' && rel('a girl on a bike') === 'girl/sit bike/ride:girl' && rel('a boy cycles to school') === 'boy/sit school bike/ride:boy',
    `"rides a bike", "on a bike", "cycles to school" (his own bike, not three) (${rel('a boy cycles to school')})`);
  check(rel('a boy and a girl hold hands') === 'boy/hands:girl girl/hands:boy' && rel('a boy holds hands with his grandpa') === 'boy/hands:old_man old_man/hands:boy',
    '"hold hands", "holds hands with his grandpa"');
  check(rel('a girl hugs her grandma') === 'girl/hug:old_woman old_woman/hug:girl' && rel('a girl hugs a cat') === 'girl cat' && rel('a cat on a chair') === 'cat chair',
    '"hugs her grandma" (a cat is held, not hugged; "a cat on a chair" is just there)');
  const item = (svg, id) => svg.match(new RegExp(`<g class="movable-item" data-id="${id}"`, 'g'))?.length ?? 0;
  const chair = generate('a boy sits on a chair').svg;
  check(item(chair, 'chair') === 1 && item(chair, 'boy') === 0 && /class="pg-sitter" data-id="boy"/.test(chair), 'a boy on a chair is drawn on it, with it (not beside it)');
  const bench = generate('a boy and his grandma sit on a bench in the park').svg;
  check((bench.match(/class="pg-sitter"/g) || []).length === 2, 'two on a bench, side by side');
  const bike = generate('a girl rides a bike in the park').svg;
  check(/class="pg-rider" data-id="girl"/.test(bike) && item(bike, 'girl') === 0, 'a girl rides her bike: on the saddle');
  const named = generate('pgc1 sits on a chair', { individuals: [{ key: 'pgc1', base: 'girl', look: { main: '#ffca28' } }] }).svg;
  check(/class="pg-sitter" data-id="girl" data-who="pgc1"/.test(named) && /#ffca28/i.test(named), 'a named character sits in her own look, marked for her photo face');
  const hands = generate('a boy and a girl hold hands').svg;
  check(/class="pg-hands"/.test(hands) && item(hands, 'boy') === 1 && item(hands, 'girl') === 1, 'holding hands: side by side, the hands joined');
  const hug = generate('a girl hugs her grandma').svg;
  check(/class="pg-heart"/.test(hug) && /data-id="girl"[^>]*data-animation="hold"/.test(hug), 'a hug: close, arms round, a heart above');
  const ground = drawConcept('woman', { seed: 1, animation: 'sit' });
  check(!ground.some((sh) => sh.type === 'g-start' && /pg-leg-left/.test(sh.class ?? '')) && ground.seatAt > 80, 'sitting with nothing under her, she sits cross-legged on the ground');
  const seated = drawConcept('boy', { seed: 1, seat: 'seat' }), reach = drawConcept('boy', { seed: 1, reach: 'right' });
  check(seated.seatAt > 66 && seated.seatAt < 85 && reach.hand?.[0] > 75, `poses made from the drawing: the hips on a seat (${seated.seatAt}), a hand reaching out (${reach.hand})`);
  // In a timeline: walking over to the chair, then sitting on it; walking up to grandma for a hug
  const sitT = generate('a boy walks in, then sits on a chair, then waves');
  const sitActs = sitT.beats.map((b) => b.actions.map((a) => `${a.actor}:${a.type}${a.anim ? '/' + a.anim : ''}${a.seat ? '@' + a.seat : ''}`).join('+')).join(' | ');
  check(sitActs === 'boy:enter | boy:pose/sit@chair | boy:pose/wave' && /data-anim="sit"/.test(sitT.svg) && /data-anim="wave"/.test(sitT.svg),
    `"then sits on a chair, then waves": sits on it, and waves sitting there (${sitActs})`);
  const hugT = generate('a girl walks in, then hugs her grandma');
  check(hugT.beats[1].actions[0].type === 'moveTo' && hugT.beats[1].actions[0].hug && /data-anim="hold"/.test(hugT.svg), '"then hugs her grandma": walks up to her and holds her');
  check(generate('a woman walks to a bench, then sits on it').beats[1].actions[0].seat === 'bench', '"sits on it": the bench she walked to');
  check([chair, bench, bike, named, hands, hug, sitT.svg, hugT.svg].every((svg) => !wellFormedError(svg)), 'all of them are well-formed XML');
}

// 2i-d. Feelings: more of them, changing over time, a sign over the head
{
  const feel = (t) => parseText(t).matches.map((m) => `${m.id}:${m.expression ?? ''}`).join(' ');
  check(feel('a scared girl') === 'girl:scared' && feel('a sleepy boy') === 'boy:sleepy' && feel('an excited dog') === 'dog:excited'
    && feel('a girl loves her dog') === 'girl:love dog:' && feel('a shy boy') === 'boy:shy' && feel('a tired man yawns') === 'man:sleepy',
    'new feelings: scared, sleepy (tired, yawns), excited, in love ("loves her dog"), shy');
  const changes = generate('a girl is scared, then a puppy runs to her, then she is excited, then she loves the puppy');
  const steps = changes.beats.map((b) => b.actions.map((a) => `${a.actor}:${a.type}${a.expression ? '~' + a.expression : ''}`).join('+')).join(' | ');
  check(steps === 'girl:expr~scared | dog:moveTo | girl:expr~excited | girl:expr~love', `feelings change over time, "she" is the girl (${steps})`);
  const signs = (svg) => [...svg.matchAll(/class="pg-emote pg-emote-(\w+)"/g)].map((m) => m[1]);
  check(['scared', 'excited', 'love'].every((e) => signs(changes.svg).includes(e)), `each feeling has its sign in the pose that shows it (${[...new Set(signs(changes.svg))]})`);
  check(signs(generate('a surprised man and a confused woman').svg).join() === 'surprised,confused' && signs(generate('a happy boy').svg).length === 0,
    'still scenes: "!" over the surprised man, "?" over the confused woman; none for plain happy');
  check(signs(generate('a boy walks in, then sits on a bench, then he is sleepy').svg).includes('sleepy'), 'Zzz over a sleepy boy on a bench');
  check(generate('she reads a book, then waves').beats[1].actions.map((a) => a.actor).join() === 'woman', '"she reads a book, then waves": she waves, not the book');
  const faces = ['scared', 'sleepy', 'excited', 'love', 'shy'].map((e) => shapesToSvg(drawConcept('girl', { seed: 1, expression: e }), 'flat'));
  check(new Set(faces).size === 5 && faces.every((f) => !wellFormedError(`<svg xmlns="http://www.w3.org/2000/svg">${f}</svg>`)), 'each new feeling has a face of its own');
  check(!wellFormedError(changes.svg), 'well-formed XML');
}

// 2i-e. Story friends (a scientist, an owl teacher, a little dragon, an idea buddy) and thought bubbles
{
  const ids = (t) => parseText(t).matches.map((m) => m.id).join();
  check(ids('a scientist') === 'scientist' && ids('a wise owl') === 'owl_teacher' && ids('a little dragon') === 'baby_dragon' && ids('a dragon') === 'baby_dragon' && ids('an idea buddy') === 'idea_buddy',
    'the story friends by their words: a scientist, a wise owl, a dragon, an idea buddy');
  for (const id of ['scientist', 'owl_teacher', 'baby_dragon', 'idea_buddy']) {
    const faces = ['happy', 'sad', 'surprised', 'sleepy', 'love'].map((e) => shapesToSvg(drawConcept(id, { seed: 1, expression: e }), 'cartoon'));
    const rigged = /pg-rig-person/.test(faces[0]) && /pg-face-eyes/.test(faces[0]) && /pg-arm-right/.test(faces[0]);
    check(rigged && new Set(faces).size === 5 && faces.every((f) => !wellFormedError(`<svg xmlns="http://www.w3.org/2000/svg">${f}</svg>`)), `${id}: on the skeleton (it moves, blinks, talks), a face for each feeling`);
  }
  const owl = generate('an owl teacher reads a book to the children in the classroom').svg;
  check(/data-id="owl_teacher"[^>]*data-held="book"/.test(owl), 'the owl teacher holds the book she reads');
  const thought = (t) => [...generate(t).svg.matchAll(/class="pg-thought" data-thinks="([^"]+)"/g)].map((m) => m[1]).join(' | ');
  check(thought('a boy thinks about a cake and an ice cream') === 'cake ice_cream' && thought('a girl has an idea') === 'light_bulb' && thought('a dragon thinks about a pizza') === 'pizza',
    `thought bubbles: "thinks about a cake and an ice cream", "has an idea" (a light bulb), a dragon thinking of pizza (${thought('a boy thinks about a cake and an ice cream')})`);
  check(thought('a girl misses her grandma') === 'old_woman' && thought('a girl sits on a bench and thinks about her dog') === 'dog' && !/data-id="cake"/.test(generate('a boy thinks about a cake').svg.replace(/<g class="pg-thought"[\s\S]*$/, '')),
    'missing someone is thinking of them; a seated thinker keeps the bubble; what is thought of is not also in the scene');
  check(thought('a boy eats a cake') === '' && thought('a bright idea') === '', 'no bubble without thinking ("eats a cake", "a bright idea" is the idea buddy)');
}

// 2i-f. A person's own face and hair (src/looks.js): chosen, or said in words
{
  const feats = (t) => parseText(t).matches.map((m) => `${m.id}:${JSON.stringify(m.features ?? {})}${m.hair ? ':' + m.hair : ''}`).join(' ');
  check(feats('a girl with big eyes and curly red hair') === 'girl:{"eyes":"big","hair":"curly"}:#c8662b', `"with big eyes and curly red hair" (${feats('a girl with big eyes and curly red hair')})`);
  check(feats('a bald man') === 'man:{"hair":"bald"}' && feats('a freckled boy with spiky hair') === 'boy:{"freckles":true,"hair":"spiky"}' && feats('a curly-haired girl') === 'girl:{"hair":"curly"}',
    '"a bald man", "a freckled boy with spiky hair", "a curly-haired girl"');
  check(feats('a man with a big nose and glasses') === 'man:{"nose":"button","glasses":true}' && feats('a boy with a round face and small eyes') === 'boy:{"face":"round","eyes":"small"}'
    && feats('a woman with a ponytail and long eyelashes') === 'woman:{"hair":"ponytail","lashes":true}', 'noses, glasses, faces, eyes, ponytails, eyelashes');
  check(feats('a girl with a red ball').startsWith('girl:{} ball') , 'a ball is still a ball');
  const head = (o) => shapesToSvg(drawConcept('girl', { seed: 1, ...o }), 'flat');
  const plain = head({}), styles = ['short', 'spiky', 'curly', 'afro', 'pigtails', 'bun', 'ponytail', 'long', 'bob', 'bald'].map((h) => head({ features: { hair: h } }));
  check(new Set([plain, ...styles]).size === 11 && styles.every((x) => !wellFormedError(`<svg xmlns="http://www.w3.org/2000/svg">${x}</svg>`)), 'ten hair styles, each its own, all well-formed');
  check(['back', 'side', 'three-quarter'].every((view) => head({ view, features: { hair: 'ponytail' } }) !== head({ view })), 'hair styles in every view');
  const face = head({ features: { face: 'square', eyes: 'big', nose: 'button', freckles: true, glasses: true, lashes: true, brows: 'thick', mouth: 'big', cheeks: 'none' } });
  check(face !== plain && /pg-face-eyes/.test(face) && /pg-face-mouth/.test(face) && /<rect[^>]+rx=/.test(face), 'a face of its own (square, big eyes, a nose, freckles, glasses...), still blinking and talking');
  const grandpa = drawConcept('old_man', { seed: 1, features: { hair: 'curly' } });
  check(grandpa.filter((x) => x.fill === '#e0e0e0').length > 3, 'costumes keep their beards and glasses under new hair');
  const named = generate('pgc1 walks in, then waves', { individuals: [{ key: 'pgc1', base: 'girl', look: { seed: 'a', features: { hair: 'afro', eyes: 'big', bogus: 'x' } } }] }).svg;
  check(/data-features="eyes:big hair:afro"/.test(named), 'a named character wears her own face and hair in every pose (only known features kept)');
  const story = composeStory('A little girl called Mia lived in a village. She had big eyes and curly red hair.\nOne day Mia found a kitten.');
  check(story.scenes.every((sc) => /data-features="eyes:big hair:curly"/.test(sc.svg)), 'a story\'s description of Mia is her look in every scene');
}

// 2i-g. Body shapes and beards (character maker, step 2)
{
  const feats = (t) => parseText(t).matches.map((m) => `${m.id}:${JSON.stringify(m.features ?? {})}`).join(' ');
  check(feats('a man with a big belly and a long beard') === 'man:{"build":"big","beard":"long"}' && feats('a chubby boy') === 'boy:{"build":"round"}'
    && feats('a skinny girl with long legs') === 'girl:{"build":"slim","legs":"long"}' && feats('a bald bearded man') === 'man:{"hair":"bald","beard":"short"}',
    '"a big belly and a long beard", "a chubby boy", "a skinny girl with long legs", "a bald bearded man"');
  check(feats('a fat cat') === 'cat:{}' && feats('a thin book') === 'book:{}' && feats('a grandpa with a moustache') === 'old_man:{"beard":"moustache"}', 'build words are for people ("a fat cat", "a thin book" stay as they were)');
  const svg = (o) => shapesToSvg(drawConcept('man', { seed: 1, ...o }), 'flat');
  const plain = svg({});
  const shapes = ['slim', 'round', 'big'].map((b) => svg({ features: { build: b } })).concat(['short', 'long'].flatMap((l) => [svg({ features: { legs: l } }), svg({ features: { arms: l } })]));
  check(new Set([plain, ...shapes]).size === 8 && shapes.every((x) => !wellFormedError(`<svg xmlns="http://www.w3.org/2000/svg">${x}</svg>`)), 'builds, legs and arms each change the figure, well-formed');
  check(['stubble', 'short', 'long', 'moustache'].map((b) => svg({ features: { beard: b } })).every((x, i, all) => x !== plain && all.indexOf(x) === i), 'four beards');
  const tall = generate('pgc1 and a man', { individuals: [{ key: 'pgc1', base: 'man', look: { seed: 'x', features: { height: 'tall' } } }] }).svg;
  const scaleOf = (who) => +(new RegExp(`data-id="man"${who}[^>]*transform="translate\\([^)]*\\) scale\\(([\\d.]+)\\)`).exec(tall)?.[1] ?? 0);
  check(scaleOf(' data-k="0" data-label="man" data-who="pgc1"') > scaleOf(' data-k="0" data-label="man" data-seed') * 1.08, 'a tall character is drawn taller than the man beside him');
  check(!wellFormedError(generate('a man with a big belly and a long beard sits on a bench in the park').svg) && !wellFormedError(generate('a man with a big belly walks in, then waves').svg), 'they sit and walk, well-formed');
}

// 2j. Speech and lip-sync: quoted words, "says to", captions
const said = (t) => parseTimeline(t)?.beats.map((b) => b.actions.map((a) => `${a.actor}:${a.type}${a.anim ? '/' + a.anim : ''}${a.lookAt ? '@' + a.lookAt : ''}${a.speech ? ` "${a.speech}"` : ''}`).join('+')).join(' | ');
for (const [t, want] of [
  ['a boy walks in, then says "Hello! How are you?", then a girl runs to him', 'boy:enter | boy:pose/talk "Hello! How are you?" | girl:moveTo'],
  ['a boy walks in, then a girl says to him "Hi. Nice day."', 'boy:enter | girl:pose/talk@boy "Hi. Nice day."'],
  ['a boy talks to the girl, then the girl laughs', 'boy:pose/talk@girl | girl:expr'],
  ['a girl walks in. Then: "I love my dog!"', 'girl:enter | girl:pose/talk "I love my dog!"'],
]) check(said(t) === want, `"${t}" -> ${want}${said(t) === want ? '' : ` (got ${said(t)})`}`);
const sr = (t) => speechRelations(t).map((x) => `${x.who}:${x.text}`).join(' / ');
check(sr('a boy and a girl in the park, the girl asks "Can I play?"') === 'girl:Can I play?' && sr('a boy: "Hello there"') === 'boy:Hello there', 'still scenes: whoever is named right before "asks" says it; "Name: “...”" works too');
const lk = lipKeys('Hello Mia, how are you?');
const opens = lk.keys.filter(([, o]) => o >= 0.7).length, shut = lk.keys.filter(([, o]) => o === 0).length;
check(lk.duration > 1.2 && lk.duration < 2.5 && opens >= 3 && shut >= 3 && lk.keys.at(-1)[1] === 0, `words become mouth openings: ${lk.keys.length} keys over ${lk.duration}s, ending shut`);
const quoted = generate('a boy says "I love my dog" in the park');
check(quoted.matches.map((m) => m.id).join() === 'boy' && (quoted.svg.match(/ data-lips="/g) || []).length === 1 && quoted.duration > 2, 'quoted words are said, not drawn (no dog), and the scene lasts as long as they take');
const sayStep = generate('a boy walks in, then says "Hello there, how are you today? I am fine."');
check(sayStep.beats[1].t1 - sayStep.beats[1].t0 > lipKeys('Hello there, how are you today? I am fine.').duration, 'a step saying something lasts as long as the words');
const captioned = generate('a boy talks to a girl', { caption: 'Look at that big red balloon!' });
check((captioned.svg.match(/ data-lips="/g) || []).length === 1 && (generate('a boy waves', { caption: 'A happy day.' }).svg.match(/ data-lips="/g) || []).length === 0, 'a caption is said by whoever talks, and by nobody when nobody talks');
check(!wellFormedError(quoted.svg) && !wellFormedError(sayStep.svg) && !wellFormedError(captioned.svg), 'speaking scenes are well-formed XML');

// 3. Clips: a sequenced scene lasts as long as its timeline
const story = composeStory([{ prompt, caption: 'x', duration: 3 }]);
check(story.scenes[0].duration >= r.duration, `a clip scene lasts as long as its timeline (${story.scenes[0].duration}s >= ${r.duration}s)`);

// 4. Other styles and prompts stay well-formed
for (const style of ['cartoon', 'sketch', 'stickman', 'neon']) {
  for (const t of [prompt, 'a girl walks in, then smiles, then she jumps, finally she leaves']) {
    const err = wellFormedError(generate(t, { style }).svg);
    if (err) check(false, `"${t}" [${style}]: ${err}`);
  }
}
check(true, 'timeline scenes are well-formed in cartoon, sketch, stickman and neon styles');

console.log(fails ? `\n${fails} timeline check(s) failed` : '\nTimeline test suite: ALL PASSED!');
process.exit(fails ? 1 : 0);
