// Depth & travel motion: parsing of direction phrases, motion spreading over "and" lists,
// per-figure travel keyframes (walk-across / approach / recede), contact shadows, depth rows.
import { parseText, generate, getConcept } from '../src/index.js';
import { wellFormedError } from './xml-check.js';

let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓ PASS' : '✗ FAIL'}: ${msg}`); if (!ok) fails++; };
const anims = (t) => parseText(t).matches.map((m) => `${m.id}:${m.animation ?? '-'}`).join(' ');

// 1. Direction phrases
for (const [t, want] of [
  ['a boy walking towards us', 'boy:approach'],
  ['a boy coming toward the camera', 'boy:approach'],
  ['a girl walks closer', 'girl:approach'],
  ['a dog running from far away', 'dog:approach'],
  ['a boy approaching', 'boy:approach'],
  ['a man walking away', 'man:recede'],
  ['a woman walking away from the camera', 'woman:recede'],
  ['a car driving into the distance', 'car:recede'],
  ['a boy is walking across the room', 'boy:walk-across'],
  ['a dog running from place to place', 'dog:walk-across'],
  ['a boy walking towards the house', 'boy:walk house:-'],
]) check(anims(t) === want, `"${t}" -> ${want} (got ${anims(t)})`);

// 2. Motion spreads over an "and" list, only to things that move by themselves
for (const [t, want] of [
  ['a man and a dog walking across the park', 'man:walk-across dog:walk-across'],
  ['a boy and a girl walking towards us', 'boy:approach girl:approach'],
  ['a tree and a dog walking', 'tree:- dog:walk'],
  ['a boy under a tree and a dog running', 'boy:- tree:- dog:run'],
  ['a boy walking and a girl', 'boy:walk girl:-'],
]) check(anims(t) === want, `"${t}" -> ${want} (got ${anims(t)})`);

// Helpers to read the generated per-figure keyframes
const keyframes = (svg) => [...svg.matchAll(/@keyframes (pg\w+m\d+) \{ (.*?) \}\s*\}/g)].map((m) => ({ name: m[1], body: m[2] + ' }' }));
const usage = (svg, name) => {
  const m = svg.match(new RegExp(`animation: ${name} ([\\d.]+)s linear (-?[\\d.]+)s infinite`));
  return m && { duration: +m[1], delay: +m[2] };
};
const scales = (body) => [...body.matchAll(/scale\(([\d.]+)\)/g)].map((m) => +m[1]);

// 3. Approach: grows from far (small) to full size, with no sideways-scrolling ground
const near = generate('a boy walking towards us').svg;
const [ak] = keyframes(near);
check(!!ak && near.includes('class="pg-motion-approach"'), 'approach wraps the figure in its own keyframed motion');
const s = scales(ak?.body || '');
check(s.length > 10 && s[0] < 0.25 && s.at(-1) === 1, `approach starts ~1/4.5 size and ends at full size (got ${s[0]} → ${s.at(-1)})`);
check(s.every((v, i) => i === 0 || v >= s[i - 1]), 'approach only ever grows');
check(s[6] - s[5] < s[12] - s[11], 'approach grows faster as the figure gets closer (perspective)');
check(!near.includes('class="pg-parallax-ground"'), 'no sideways-scrolling ground under an approaching figure');
check(near.includes('pg-anim-walk'), 'approaching figure walks in place');

// 4. Recede: shrinks toward the horizon
const away = generate('a girl walking away into the distance').svg;
const rs = scales(keyframes(away)[0]?.body || '');
check(away.includes('pg-motion-recede') && rs[0] === 1 && rs.at(-1) < 0.25, `recede shrinks from full size toward the horizon (got ${rs[0]} → ${rs.at(-1)})`);

// 5. Walk-across: one pace for everyone, and each figure starts at its composed position
const across = generate('a man and a dog walking across the park').svg;
const kfs = keyframes(across);
check(kfs.length === 2, `each walker gets its own keyframes (got ${kfs.length})`);
const speeds = kfs.map(({ name, body }) => {
  const [a, b] = [...body.matchAll(/translateX\((-?[\d.]+)px\)/g)].map((m) => +m[1]);
  const { duration, delay } = usage(across, name);
  const tr = across.match(new RegExp(`transform="translate\\([^)]*\\) scale\\((-?[\\d.]+)[^"]*"[^>]*>(?:<style[^]*?</style>)?<g class="pg-motion-across" style="animation: ${name} `));
  const sc = tr ? Math.abs(+tr[1]) : 1;
  const atStart = a + (b - a) * (-delay / duration); // local offset at t=0
  return { speed: (Math.abs(b - a) * sc) / duration, atStart };
});
check(speeds.every((v) => Math.abs(v.atStart) < 1), `walkers start at their composed positions (offsets ${speeds.map((v) => v.atStart.toFixed(2))})`);
check(Math.abs(speeds[0].speed - speeds[1].speed) < 1, `man and dog walk at the same screen speed (${speeds.map((v) => v.speed.toFixed(1))} px/s)`);

// 6. Contact shadows on landscape scenes only
check((generate('a boy and a dog').svg.match(/class="pg-shadow"/g) || []).length === 2, 'grounded figures get contact shadows');
check(!generate('a boy and a dog', { style: 'outline' }).svg.includes('pg-shadow'), 'no shadows in outline (line-art) style');
check(!generate('a boy and a dog', { style: 'stickman' }).svg.includes('pg-shadow'), 'no extra shadows on flat studio backdrops');
check(!generate('the sun and a bird').svg.includes('pg-shadow') && !generate('a boat').svg.includes('class="pg-shadow"'), 'no shadows under sky, air and water items');

// 7. A crowd that doesn't fit one row gets a second row further back
const crowd = generate('four boys and four girls').svg;
const grounds = [...crowd.matchAll(/data-id="(boy|girl)"[^>]*transform="translate\(-?[\d.]+ (-?[\d.]+)\) scale\(-?([\d.]+)/g)]
  .map(([, id, ty, sc]) => Math.round((+ty + getConcept(id).baseline * +sc) / 4));
const rows = new Set(grounds);
check(rows.size === 2, `8 people stand in two depth rows (got ${rows.size} ground lines)`);

// 8. Everything above is valid SVG/XML
for (const t of ['a boy walking towards us', 'a girl walking away into the distance', 'a man and a dog walking across the park', 'four boys and four girls']) {
  const err = wellFormedError(generate(t).svg);
  check(!err, `"${t}" is well-formed XML${err ? `: ${err}` : ''}`);
}

console.log(fails ? `\n${fails} depth check(s) failed` : '\nDepth & Motion test suite: ALL PASSED!');
process.exit(fails ? 1 : 0);
