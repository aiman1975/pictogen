import { parseText, generate, renderIcon } from '../src/index.js';

let fails = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error(`✗ FAIL: ${msg}`);
    fails++;
  } else {
    console.log(`✓ PASS: ${msg}`);
  }
}

// 1. Text Parsing of Mimics & Animations
const p1 = parseText('a laughing boy walking across the slide');
assert(p1.matches.length === 1 && p1.matches[0].id === 'boy', 'Matched boy');
assert(p1.matches[0].expression === 'laugh', `Boy expression is laugh (got ${p1.matches[0].expression})`);
assert(p1.matches[0].animation === 'walk-across', `Boy animation is walk-across (got ${p1.matches[0].animation})`);

const p2 = parseText('a sad girl crying waving');
assert(p2.matches.length === 1 && p2.matches[0].id === 'girl', 'Matched girl');
assert(p2.matches[0].expression === 'sad', `Girl expression is sad (got ${p2.matches[0].expression})`);
assert(p2.matches[0].animation === 'wave', `Girl animation is wave (got ${p2.matches[0].animation})`);

const p3 = parseText('a surprised man and an angry woman running');
const man = p3.matches.find(m => m.id === 'man');
const woman = p3.matches.find(m => m.id === 'woman');
assert(man && man.expression === 'surprised', 'Man expression is surprised');
assert(woman && woman.expression === 'angry', 'Woman expression is angry');
assert(woman && woman.animation === 'run', 'Woman animation is run');

// 2. SVG Generation with Animations & Mimics
const res1 = generate('a laughing boy walking across the slide');
assert(res1.svg.includes('pg-anim-walk-across') || res1.svg.includes('pg-anim-walk'), 'SVG contains walk animation class');
assert(res1.svg.includes('pg-motion-across'), 'SVG contains motion-across wrapper');
assert(res1.svg.includes('pgWalkLegL'), 'SVG contains embedded animation CSS keyframes');
assert(!/NaN|undefined|\[object/.test(res1.svg), 'No NaN or undefined in generated SVG');

// 3. Direct Icon Generation with Expression
const iconHappy = renderIcon('boy', { expression: 'happy', animation: 'wave' });
assert(iconHappy.includes('pg-anim-wave'), 'Icon has wave animation');
assert(!/NaN|undefined|\[object/.test(iconHappy), 'Icon renders clean SVG');

const iconWink = renderIcon('girl', { expression: 'wink', animation: 'walk' });
assert(iconWink.includes('pg-anim-walk'), 'Icon has walk animation');
assert(!/NaN|undefined|\[object/.test(iconWink), 'Icon renders clean SVG');

// On the way: the place goes by behind someone walking, running or driving on the spot; going up
// or down, the land slides away and clouds stream past
const tv = (t, o = {}) => generate(t, { style: 'cartoon', seed: 3, ...o }).svg;
const across = tv('a boy runs in the forest by the mountains');
assert(/pg-travel pg-travel-far/.test(across) && /pg-travel pg-travel-mid/.test(across) && /pg-travel pg-travel-near/.test(across), 'running: far, middle and near layers go by');
const speeds = ['far', 'mid', 'near'].map((n) => +across.match(new RegExp(`pg-travel-${n}" style="animation: \\S+ ([\\d.]+)s`))[1]);
assert(speeds[0] > speeds[1] && speeds[1] > speeds[2], `the far layer goes by slowest, the near one fastest (${speeds.join(' / ')} s per loop)`);
assert(/translateX\(-1280px\)/.test(across), 'running right: the place slides left by two widths per loop (tiles join up)');
assert(/pg-travel-near/.test(tv('a car drives in the city')), 'driving in the city: the street goes by');
assert(!/pg-travel/.test(tv('a boy runs past a tree')), 'something standing by them (a tree): the place stays still');
assert(!/pg-travel/.test(tv('a boy runs', { style: 'stickman' })), 'a plain canvas style: no travel');
const up = tv('a rocket flies up into the sky');
assert(/pg-travel pg-travel-land/.test(up) && /pg-travel pg-travel-stream/.test(up), 'flying up: the land drops away, clouds stream past');
const down = tv('a diver dives deeper under the sea');
assert(/pg-travel pg-travel-land/.test(down) && /pg-travel-stream/.test(down), 'diving: the seabed comes up, bubbles stream past');
for (const still of ['a girl falls asleep', 'a boy looks up at the sky', 'a girl waves in the park']) assert(!/pg-travel/.test(tv(still)), `no travel: ${still}`);
assert(!/pg-travel/.test(generate('In the park, a red letter A walks in, then a blue number 7 walks in.', { style: 'cartoon' }).svg), 'a sequence where they walk across: the place stays (they move, not it)');

console.log(`\nAnimation & Mimics test suite: ${fails === 0 ? 'ALL PASSED!' : `${fails} FAILS`}`);
process.exit(fails === 0 ? 0 : 1);
