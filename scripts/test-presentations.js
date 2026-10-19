import { generate } from '../src/index.js';
import { fitText } from '../src/bubble.js';

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

// Speech bubbles fit: inside the picture (or panel), clear of one another, their words all there or
// cut with "…"
const bubbleBoxes = (svg) => [...svg.matchAll(/<g class="pg-bubble"><path d="([^"]+)"/g)].map((m) => {
  const n = m[1].match(/-?[\d.]+/g).map(Number);
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
});
test('still scene: each speaker gets a bubble inside the picture, none overlapping', () => {
  const long = 'Hello Mia! Do you want to play football with me after school today, or maybe tomorrow if it rains?';
  for (const [w, h] of [[640, 360], [360, 640], [320, 240]]) {
    const r = generate(`a girl says "${long}" and a boy says "Look at that huge rainbow over the hills!" and a dog says "Woof!"`, { width: w, height: h });
    const boxes = bubbleBoxes(r.svg);
    if (boxes.length !== 3) throw new Error(`${w}x${h}: ${boxes.length} bubbles`);
    for (const b of boxes) if (b.x0 < 0 || b.y0 < 0 || b.x1 > w || b.y1 > h) throw new Error(`${w}x${h}: a bubble leaves the picture ${JSON.stringify(b)}`);
    boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => {
      if (a.x0 < b.x1 - 2 && b.x0 < a.x1 - 2 && a.y0 < b.y1 - 2 && b.y0 < a.y1 - 2) throw new Error(`${w}x${h}: bubbles overlap`);
    }));
  }
});
test('words too many for a bubble are cut short with "…"', () => {
  const f = fitText('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen', { maxW: 80, maxLines: 2, size: 12, minSize: 9 });
  if (f.lines.length !== 2 || !f.lines[1].endsWith('…') || f.w > 80) throw new Error(JSON.stringify(f));
  const g = fitText('Hi!', { maxW: 80, size: 12 });
  if (g.lines.join() !== 'Hi!' || g.size !== 12) throw new Error(JSON.stringify(g));
});
test('timeline: a bubble shows while its words are said', () => {
  const r = generate('a boy walks in, then says "Hello there!", then a dog runs to him');
  if (bubbleBoxes(r.svg).length !== 1 || !/@keyframes pg\w*b0 \{ 0% \{ opacity: 0; \} [\d.]+% \{ opacity: 1; \} [\d.]+% \{ opacity: 0; \} \}/.test(r.svg)) throw new Error('no timed bubble');
});
test('comic strip: bubbles stay inside their panels and the title fits, at any size', () => {
  for (const [w, h] of [[420, 300], [640, 360], [840, 320], [1200, 500]]) {
    const r = generate('a boy finds a puppy on a very long and winding road "Oh! Who is this little fellow sitting all alone by the road?" "Woof woof!" "BEST DAY EVER!"', { mode: 'comic', width: w, height: h });
    for (const m of r.svg.matchAll(/<g id="panel-\d"[^>]*>\s*<clipPath[^>]*><rect width="([\d.]+)" height="([\d.]+)"\/><\/clipPath>([\s\S]*?)<\/g>\s*<rect width/g)) {
      for (const b of bubbleBoxes(m[3])) if (b.x0 < 0 || b.y0 < 0 || b.x1 > +m[1] || b.y1 > +m[2]) throw new Error(`${w}x${h}: a bubble leaves its panel`);
    }
    if (bubbleBoxes(r.svg).length !== 3 || !r.svg.includes('Woof woof!') || !r.svg.includes('BEST DAY EVER!')) throw new Error(`${w}x${h}: the prompt's lines are not in the bubbles`);
    if (r.svg.includes('qq')) throw new Error('quote markers leak into the title');
  }
});

if (fails > 0) {
  console.error(`\nTest suite FAILED with ${fails} failures.`);
  process.exit(1);
} else {
  console.log('\nAll Presentation Modes & Styles test suite: ALL PASSED!');
}
