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
check((boy.match(/class="pg-timeline-pose" opacity="1"/g) || []).length === 1 && (dog.match(/class="pg-timeline-pose" opacity="1"/g) || []).length === 1,
  'each actor shows exactly one pose in a still (no-animation) render');

// Keyframes: positions start off-screen for actors that enter, and the dog stays hidden until its beat
const kf = (name) => r.svg.match(new RegExp(`@keyframes ${name} \\{ (.*?) \\}\\s*\\}`))?.[1] ?? '';
const moveName = (fig) => fig.match(/class="pg-timeline-move" style="animation: (\S+) /)[1];
const scaleOf = (fig) => +fig.match(/scale\(([\d.]+)\)/)[1];
const homeOf = (fig) => { const [, x] = fig.match(/translate\((-?[\d.]+) /); return +x + 50 * scaleOf(fig); };
const firstX = (fig) => +kf(moveName(fig)).match(/translateX\((-?[\d.]+)px\)/)[1] * scaleOf(fig);
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
