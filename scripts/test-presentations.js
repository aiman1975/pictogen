import { generate } from '../src/index.js';

let fails = 0;
function test(desc, fn) {
  try {
    fn();
    console.log(`✓ PASS: ${desc}`);
  } catch (err) {
    console.error(`✗ FAIL: ${desc} - ${err.message}`);
    fails++;
  }
}

const MODES = ['callout', 'knolling', 'split', 'isometric', 'waffle', 'coloring', 'scene', 'card', 'icons'];
const STYLES = ['flat', 'cartoon', 'outline', 'pastel', 'silhouette', 'sketch', 'neon', 'blueprint', 'chalkboard', 'vintage', 'pixel'];

console.log('Testing Presentation Modes & Styles...');

for (const mode of MODES) {
  test(`Mode '${mode}' generates valid SVG with prompt 'a boy and a blue bike'`, () => {
    const res = generate('a boy and a blue bike', { mode, style: 'flat' });
    if (!res.svg || !res.svg.startsWith('<svg')) throw new Error('Missing <svg> root');
    if (!res.svg.endsWith('</svg>')) throw new Error('Missing </svg> closing tag');
    if (/NaN|undefined|\[object/.test(res.svg)) throw new Error('Contains NaN or undefined');
  });
}

test('Technical Callout contains specification text and leader line elements', () => {
  const res = generate('a bicycle', { mode: 'callout', style: 'blueprint' });
  if (!res.svg.includes('SPECIFICATION SCHEMATIC')) throw new Error('Missing spec header');
  if (!res.svg.includes('pattern')) throw new Error('Missing grid pattern');
});

test('Studio Knolling contains orthogonal knolled specimen set', () => {
  const res = generate('apple, bike, tree, sun', { mode: 'knolling', style: 'flat' });
  if (!res.svg.includes('STUDIO KNOLLING')) throw new Error('Missing knolling header');
  if (!res.svg.includes('feDropShadow')) throw new Error('Missing drop shadow filter');
});

test('Before vs After Split contains VS divider and BEFORE/AFTER badges', () => {
  const res = generate('sad boy and laughing boy', { mode: 'split', style: 'cartoon' });
  if (!res.svg.includes('BEFORE') || !res.svg.includes('AFTER')) throw new Error('Missing BEFORE/AFTER badges');
  if (!res.svg.includes('VS')) throw new Error('Missing VS badge');
});

test('2.5D Isometric Diorama contains 3D pedestal geometry', () => {
  const res = generate('tree and house', { mode: 'isometric', style: 'flat' });
  if (!res.svg.includes('ISOMETRIC DIORAMA')) throw new Error('Missing isometric title');
  if (!res.svg.includes('fill="#334155"')) throw new Error('Missing 3D pedestal bevel');
});

test('Pictorial Waffle Infographic handles percentages correctly', () => {
  const res = generate('70% apples', { mode: 'waffle', style: 'flat' });
  if (!res.svg.includes('70%')) throw new Error('Missing 70% stat text');
  if (!res.svg.includes('Active (7)')) throw new Error('Missing active 7 count');
});

test('Coloring Book mode renders thick clean outline art', () => {
  const res = generate('a cute puppy', { mode: 'coloring' });
  if (!res.svg.includes('COLORING PAGE')) throw new Error('Missing coloring header');
  if (!res.svg.includes('stroke-dasharray')) throw new Error('Missing decorative border');
});

// Test all 11 styles
for (const style of STYLES) {
  test(`Style '${style}' renders cleanly in callout mode`, () => {
    const res = generate('apple', { mode: 'callout', style });
    if (/NaN|undefined/.test(res.svg)) throw new Error(`Style ${style} produced NaN/undefined`);
  });
}

if (fails > 0) {
  console.error(`\nTest suite FAILED with ${fails} failures.`);
  process.exit(1);
} else {
  console.log('\nAll Presentation Modes & Styles test suite: ALL PASSED!');
}
