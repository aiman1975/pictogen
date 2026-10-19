import { readFileSync } from 'node:fs';
import { generate, getConcept, renderIcon, STYLE_NAMES, DIAGRAMS, renderWorksheet } from '../src/index.js';
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

test('Callout (now the labelled diagram) labels a thing with its real name', () => {
  const res = generate('a bicycle', { mode: 'callout', style: 'blueprint' });
  if (!/class="pg-label" data-key="bike" data-text="bike"/.test(res.svg)) throw new Error('no "bike" label');
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

// Places: a classroom has its chalkboard, a city its buildings (lit at night), a park its trees
test('places are drawn: classroom, office, kitchen, bedroom, room, city, park, forest', () => {
  for (const [prompt, place] of [
    ['a teacher reads a book to children in a classroom', 'classroom'], ['a team celebrates in an office', 'office'],
    ['a woman cooks in the kitchen', 'kitchen'], ['a girl sleeps in her bedroom at night', 'bedroom'], ['a man reads in his room', 'room'],
    ['a superhero flies over the city at night', 'city'], ['a boy and a dog walk in the park', 'park'], ['two friends in the forest', 'woods'],
  ]) {
    const svg = generate(prompt).svg;
    const found = svg.match(/pg-place-(\w+)/)?.[1];
    if (found !== place) throw new Error(`"${prompt}": ${found ?? 'no place'}, not ${place}`);
  }
  if (/pg-place/.test(generate('a teacher reads a book to children').svg)) throw new Error('a place nobody named');
  if (!generate('a superhero flies over the city at night').svg.includes('#ffe082')) throw new Error('the city has no lit windows at night');
  const kids = generate('a teacher reads a book to children in a classroom').matches.map((m) => m.id);
  if (!kids.includes('boy') || !kids.includes('girl')) throw new Error(`children: ${kids}`);
  const cook = generate('a woman cooks in the kitchen').matches;
  if (cook.length !== 1 || cook[0].count !== 1) throw new Error(`"a woman cooks": ${JSON.stringify(cook.map((m) => [m.id, m.count]))}`);
});

// What a teacher, a comic designer and a marketer typed (docs/ROADMAP.md): never an empty or
// wrong picture
test('persona prompts draw what was meant', () => {
  const ids = (t) => generate(t).matches.map((m) => `${m.id}${m.animation ? '/' + m.animation : ''}x${m.count}`).join(' ');
  for (const [prompt, want] of [
    ['a superhero flies over the city at night', /man_superhero\/fly/],
    ['three flies', /^flyx3$/],
    ['a team celebrates in an office', /woman.*man|man.*woman/],
    ['five kids play', /boy.*girl/],
    ['an elefant', /^elephant/],
    ['a wizard and a dinosaur', /wizard.*t_rex/],
  ]) if (!want.test(ids(prompt))) throw new Error(`"${prompt}" -> ${ids(prompt) || 'nothing'}`);
  const kids = generate('five kids play').matches.reduce((n, m) => n + m.count, 0);
  if (kids !== 5) throw new Error(`five kids: ${kids}`);
  const r = generate('a cat and a wizzard');
  if (!r.suggestions.wizzard?.includes('wizard')) throw new Error(`suggestions: ${JSON.stringify(r.suggestions)}`);
});

// Holding things: in the holder's hands, at hand size, not set down beside them
test('things held are in the hands: "a woman holds a phone", "a girl with a balloon"...', () => {
  const held = (t) => generate(t).matches.filter((m) => m.heldBy).map((m) => `${m.id}<${m.heldBy}x${m.count}`).join(' ');
  for (const [prompt, want] of [
    ['a woman holds a phone', 'mobile_phone<womanx1'], ['a boy holding a red ball', 'ball<boyx1'], ['a girl reads a book', 'book<girlx1'],
    ['a girl with a balloon', 'balloon<girlx1'], ['a boy hugs a cat', 'cat<boyx1'], ['she drinks a cup of coffee', 'hot_beverage<womanx1'],
    ['two girls holding balloons', 'balloon<girlx2'], ['a boy and a girl holding balloons', 'balloon<girlx1 balloon<boyx1'],
    ['a boy flies a kite in the park', 'kite<boyx1'],
    // not held
    ['a man with a dog', ''], ['a happy girl waves at a dog under a tree', ''], ['a boy kicks a ball', ''], ['a superhero flies over the city', ''],
  ]) if (held(prompt) !== want) throw new Error(`"${prompt}": ${held(prompt) || 'nothing held'}, not ${want || 'nothing held'}`);
  for (const style of ['flat', 'cartoon', 'anime', 'stickman', 'cute2d', 'geometric', 'papercut', 'editorial']) {
    const svg = generate('a woman holds a phone', { style }).svg;
    const items = svg.match(/<g class="movable-item"[^>]*>/g) || [];
    if (items.length !== 1 || !/data-held="mobile_phone"/.test(items[0])) throw new Error(`${style}: ${items.length} figures: ${items.join(' ')}`);
    if (!/class="pg-held"/.test(svg)) throw new Error(`${style}: the phone is not in her hands`);
  }
  // Walking in profile, and in a timeline, still holding it
  if (!/pg-held/.test(generate('a girl walks with a book').svg)) throw new Error('walking: the book is gone');
  if ((generate('a girl with a balloon walks in, then waves').svg.match(/class="pg-held"/g) || []).length < 2) throw new Error('timeline: not in every pose');
});

// Characters people ask for are drawn like everyone else (not emoji), in costume, in every style
// and from every side
test('characters: teacher, grandparents, baby, superhero, princess, robot... drawn, in every style and view', () => {
  const words = ['teacher', 'grandpa', 'grandma', 'baby', 'superhero', 'superheroine', 'princess', 'prince', 'king', 'queen', 'robot',
    'police officer', 'firefighter', 'doctor', 'nurse', 'chef', 'farmer', 'astronaut', 'pirate', 'wizard', 'witch', 'fairy'];
  for (const w of words) {
    const m = generate(`a ${w}`).matches[0];
    const c = m && getConcept(m.id);
    if (!c || c.isLibrary) throw new Error(`"${w}": ${m?.id ?? 'nothing'} is ${c?.isLibrary ? 'an emoji' : 'missing'}`);
    for (const style of STYLE_NAMES) for (const view of ['front', 'three-quarter', 'side', 'back']) {
      const svg = renderIcon(c.id, { style, view: view === 'front' ? undefined : view, size: 64 });
      if (!svg.startsWith('<svg') || /NaN|undefined/.test(svg)) throw new Error(`${c.id} ${style} ${view}: broken drawing`);
    }
  }
  // Costumes show: a crown on the king, a cape on the superhero (behind; over the back from behind)
  const plain = renderIcon('man', { size: 64 }), king = renderIcon('king', { size: 64 });
  if (!king.includes('#ffca28') || plain.includes('#ffca28')) throw new Error('the king has no crown');
  if (!renderIcon('man_superhero', { size: 64 }).includes('#e53935')) throw new Error('the superhero has no cape');
  const groups = generate('my grandparents').matches.map((m) => m.id).join(' ');
  if (groups !== 'old_man old_woman') throw new Error(`grandparents: ${groups}`);
});

// Labelled diagrams: real labels on leader lines, inside the picture; renamed; blank for a quiz
const labelBoxes = (svg) => [...svg.matchAll(/<g class="pg-label" data-key="([^"]+)" data-text="([^"]*)"[^>]*><rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)]
  .map(([, key, text, x, y, w, h]) => ({ key, text, x: +x, y: +y, w: +w, h: +h }));
test('labelled diagrams: every topic, real labels, inside the picture and not overlapping, in every size', () => {
  const asked = { plant: 'the parts of a plant', tree: 'parts of a tree', body: 'the human body', water_cycle: 'the water cycle', volcano: 'inside a volcano',
    earth: 'layers of the earth', solar_system: 'the solar system', butterfly_cycle: 'the life cycle of a butterfly' };
  for (const [topic, prompt] of Object.entries(asked)) {
    if (!DIAGRAMS[topic]) throw new Error(`no ${topic}`);
    for (const [w, h, style] of [[640, 360, 'flat'], [800, 600, 'cartoon'], [480, 480, 'chalkboard']]) {
      for (const blank of [false, true]) {
        const r = generate(prompt, { mode: 'scene', width: w, height: h, style, blank });
        if (r.diagram?.topic !== topic) throw new Error(`"${prompt}": ${r.diagram?.topic ?? 'no diagram'}`);
        const boxes = labelBoxes(r.svg);
        if (boxes.length !== DIAGRAMS[topic].parts.length) throw new Error(`${topic}: ${boxes.length} labels`);
        for (const b of boxes) if (b.x < -0.5 || b.y < -0.5 || b.x + b.w > w + 0.5 || b.y + b.h > h + 0.5) throw new Error(`${topic} ${w}x${h}: "${b.text}" leaves the picture`);
        boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => {
          if (a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1) throw new Error(`${topic} ${w}x${h}: "${a.text}" and "${b.text}" overlap`);
        }));
        if (blank && (!r.svg.includes('Word bank') || r.svg.includes(`>${DIAGRAMS[topic].parts[0].label}</text>`))) throw new Error(`${topic}: blank labels show the answers`);
      }
    }
  }
  // No made-up labels any more ("INTERNAL VOLUME CORE"): a diagram's words are what a teacher would use
  if (/VOLUME|APERTURE|KINEMATICS|SCHEMATIC/.test(generate('the parts of a plant', { mode: 'callout' }).svg)) throw new Error('the old made-up labels are back');
  const renamed = generate('the parts of a plant', { mode: 'diagram', labels: { stem: 'Stalk' } });
  if (!labelBoxes(renamed.svg).some((b) => b.key === 'stem' && b.text === 'Stalk')) throw new Error('a renamed label');
  if (generate('a plant in a pot', { mode: 'scene' }).diagram) throw new Error('a plant in a scene is not a diagram');
  const vocab = generate('a cat, a dog, a cow and a pig', { mode: 'diagram', blank: true });
  if (vocab.diagram?.labels.map((l) => l.text).join() !== 'cat,dog,cow,pig' || !vocab.svg.includes('Word bank')) throw new Error(`labelled pictures: ${JSON.stringify(vocab.diagram)}`);
});

// Printable worksheets: an A4 page (and an answer key), fonts inside, nothing that moves
test('worksheets: write, count (with the answers), label (with the answers), colour', () => {
  for (const [prompt, opts, kind, pages] of [
    ['a girl reads a book under a tree', {}, 'write', 1], ['3 apples and 2 bananas', {}, 'count', 2],
    ['the parts of a plant', { mode: 'diagram' }, 'label', 2], ['a dog', { kind: 'colour' }, 'colour', 1],
    ['a cat, a dog and a cow', { kind: 'label', answers: false }, 'label', 1],
  ]) {
    const ws = renderWorksheet(prompt, opts);
    if (ws.kind !== kind || ws.pages.length !== pages) throw new Error(`"${prompt}": ${ws.kind}, ${ws.pages.length} pages`);
    for (const p of ws.pages) {
      if (!/^<svg[^>]* width="794" height="1123"/.test(p) || !p.includes('data:font/woff2;base64,') || !p.includes('animation: none !important')) throw new Error(`"${prompt}": not a still A4 page with its fonts`);
      if (/NaN|undefined/.test(p.replace(/data:font[^)]+/g, ''))) throw new Error(`"${prompt}": broken numbers`);
    }
  }
  const count = renderWorksheet('3 apples and 2 bananas', {});
  if (!/>3<\/text>/.test(count.pages[1]) || !/>2<\/text>/.test(count.pages[1]) || !/>5<\/text>/.test(count.pages[1]) || /fill="#dc2626"/.test(count.pages[0])) throw new Error('the answer key: 3 apples, 2 bananas, 5 altogether (only on the key)');
  const titled = renderWorksheet('3 apples', { title: 'Fruit maths', instructions: 'Count carefully!' });
  if (!titled.pages[0].includes('Fruit maths') || !titled.pages[0].includes('Count carefully!')) throw new Error('own title and instructions');
});

// The manual (public/help.html): every example it offers draws what it promises
test('every example in the "How to use" page draws something', () => {
  const html = readFileSync(new URL('../public/help.html', import.meta.url), 'utf8');
  const links = [...html.matchAll(/href="\/studio\?([^"]+)"/g)].map((m) => new URLSearchParams(m[1].replace(/&amp;/g, '&')));
  if (links.length < 30) throw new Error(`only ${links.length} examples`);
  const empty = [];
  for (const q of links) {
    const text = q.get('text'), mode = q.get('mode') || 'scene', style = q.get('style') || 'flat';
    const r = generate(text, { mode, style });
    if (!r.diagram && !r.matches.length && mode !== 'alphabet') empty.push(`${text} (${mode})`);
    if (/NaN/.test(r.svg)) empty.push(`${text}: NaN in the drawing`);
  }
  if (empty.length) throw new Error(`examples that draw nothing: ${empty.join('; ')}`);
});

if (fails > 0) {
  console.error(`\nTest suite FAILED with ${fails} failures.`);
  process.exit(1);
} else {
  console.log('\nAll Presentation Modes & Styles test suite: ALL PASSED!');
}
