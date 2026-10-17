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

console.log(`\nAnimation & Mimics test suite: ${fails === 0 ? 'ALL PASSED!' : `${fails} FAILS`}`);
process.exit(fails === 0 ? 0 : 1);
