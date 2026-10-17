// Scene timelines: several actions one after another ("a boy walks in, then waves, then a dog runs to him").
import { parseTimeline, hasSequence, generate, composeStory, getConcept } from '../src/index.js';
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
