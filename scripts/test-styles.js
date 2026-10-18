// Styles: 23 of them, each with its own signature (Pixel really pixelated, Comic halftone and a
// panel, Watercolor washes on paper, Crayon wax, Anime eyes and sky, Letterlings candy, Geometric
// Bauhaus blocks...), full characters in Whiteboard and Doodle, Numberlings 0-9. In a real browser
// (skipped without Playwright): every pair of styles looks clearly different.
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { generate, STYLE_NAMES, isStyle, renderIcon, parseText, getConcept } from '../src/index.js';

let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓ PASS' : '✗ FAIL'}: ${msg}`); if (!ok) fails++; };
const scene = (style, text = 'a happy girl waves at a dog under a tree', o = {}) => generate(text, { style, ...o }).svg;

check(STYLE_NAMES.length === 23 && ['watercolor', 'anime', 'crayon'].every(isStyle), `23 styles, with watercolor, anime and crayon (${STYLE_NAMES.length})`);

// Signatures
const px = scene('pixel');
check(/<g filter="url\(#pg\w+-pixelate\)"><g stroke-linecap="round" stroke-linejoin="round"><rect/.test(px) && /<feTile/.test(px) && /<feMorphology operator="dilate"/.test(px),
  'Pixel: the whole picture is pixelated (one sample per block, grown back to a square), background included');
check(!/#8bc34a|#9ccc65/i.test(px), 'Pixel: colors come from a retro palette');
const comic = scene('comic');
check(/-dots" .*patternTransform="rotate\(45\)"/.test(comic) && /pg-style-overlay/.test(comic) && /stroke="#111827" stroke-width="\d+"\/><\/g>(<metadata|<\/svg>)/.test(comic),
  'Comic Strip: halftone dots and a panel border over the picture');
const wc = scene('watercolor');
check(/-wash"/.test(wc) && /<g filter="url\(#pg\w+-wash\)">/.test(wc) && /-paper\)" opacity/.test(wc) && /fill-opacity="0.9"/.test(wc),
  'Watercolor: soft washes over the landscape and figures, paper grain on top');
const cr = scene('crayon');
check(/-wax"/.test(cr) && /<rect width="640" height="360" fill="#fffdf6"\/><g filter="url\(#pg\w+-wax\)">/.test(cr), 'Crayon: wax texture on paper, landscape included');
const an = scene('anime', 'a girl');
check(/fill="#ffffff" opacity="0.92"><circle/.test(an) && /fill="#[0-9a-f]{6}"/.test(an), 'Anime: big summer clouds in the sky');
check(/fill="#2f86ee"|fill="#[0-9a-f]{6}"/.test(an) && (an.match(/<ellipse[^>]*fill="#(3a7bd5|8e44ad|16a085|b9770e|2e86c1|[0-9a-f]{6})"/g) || []).length >= 4, 'Anime: big colored irises with pupils');
const ll = scene('letterling');
check(/-candy"/.test(ll) && /feSpecularLighting/.test(ll) && /-polka\)"/.test(ll), 'Letterlings: glossy candy sheen and a polka-dot sky');
const ink = (st) => (scene(st).match(/stroke-width="([\d.]+)"/g) || []).map((w) => +w.slice(14, -1));
check(/stroke="#16161d"/.test(scene('cartoon')) && Math.max(...ink('cartoon')) > Math.max(...ink('anime')) * 1.8, 'Cartoon: thick black ink outlines (much heavier than Anime\'s thin line art)');
check(/fill="#f4ecd8"/.test(scene('geometric')) && /fill="#e63946"/.test(scene('geometric')), 'Geometric: a Bauhaus poster backdrop (cream, red disc)');
const room = (st) => generate('a cat on a sofa in a room', { style: st }).svg;
check(room('anime') !== room('letterling') && /fill="#ffd6ea"|fill="#ff/.test(room('letterling')), 'Rooms take the style\'s colors too');

// Whiteboard and Doodle draw whole characters (the rig with knees in profile), not sticks
const person = (style) => generate('a boy', { style }).svg;
for (const st of ['whiteboard', 'doodle']) {
  const svg = generate('a boy walks', { style: st }).svg;
  check(/pg-shin/.test(svg) && /pg-head/.test(svg) && /data-face=/.test(person(st)), `${st}: a full character (head, knees, face for photos), drawn in its pens`);
}
const sticks = Object.fromEntries(['boy', 'girl', 'man', 'woman'].map((r) => [r, generate(`a ${r}`, { style: 'stickman' }).svg.replace(/pg\w+/g, '')]));
check(new Set(Object.values(sticks)).size === 4 && /fill="#e11d48"/.test(sticks.girl), 'Stickman: boy, girl, man and woman each have their own hair (a bow for the girl)');
check(STYLE_NAMES.every((st) => !/NaN|undefined/.test(renderIcon('girl', { style: st }))), 'every style draws icons cleanly');

// Numberlings
check([...Array(10).keys()].every((n) => getConcept(`number_${n}`)?.category === 'alphabet'), 'Numberlings 0-9 exist');
const m7 = parseText('the number seven jumps').matches;
check(m7.length === 1 && m7[0].id === 'number_7' && m7[0].animation === 'jump', '"the number seven jumps": a jumping 7 (a name of several words takes its verb)');
check(parseText('the letter a waves').matches.map((m) => `${m.id}:${m.animation}`).join() === 'letter_a:wave', '"the letter a waves" no longer adds ocean waves');
check(parseText('three dogs and digit 4').matches.map((m) => `${m.id}x${m.count}`).join() === 'dogx3,number_4x1', 'number words still count things; "digit 4" is a Numberling');
const count = generate('count to 5', { mode: 'alphabet' }).svg;
check(/NUMBER PALS • 12345/.test(count) && (count.match(/Letterling \d/g) || []).length === 5, '"count to 5" lines up 1 to 5');
check(/NUMBER PALS • 2026/.test(generate('2026', { mode: 'alphabet' }).svg) && /ALPHABET PALS • CAT/.test(generate('C A T', { mode: 'alphabet' }).svg), 'digits spell like letters ("2026"), letters still spell words');

// In a real browser: every pair of styles clearly different
let chromium = null;
try {
  const req = createRequire(import.meta.url);
  try { ({ chromium } = req('playwright')); } catch { ({ chromium } = req(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright'))); }
} catch { /* not installed */ }
if (!chromium) console.log('- SKIP: style distinctness (Playwright is not installed)');
else {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    for (const prompt of ['a happy boy and a girl wave at a dog under a tree', 'a boy']) {
      const svgs = STYLE_NAMES.map((n) => [n, generate(prompt, { style: n, width: 320, height: 180 }).svg.replace(/<style id="pg-animation-styles">[\s\S]*?<\/style>/, '')]);
      const pairs = await page.evaluate(async (svgs) => {
        const px = {};
        for (const [n, svg] of svgs) {
          const img = new Image();
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
          await img.decode();
          const c = document.createElement('canvas'); c.width = 160; c.height = 90;
          const x = c.getContext('2d'); x.drawImage(img, 0, 0, 160, 90);
          px[n] = x.getImageData(0, 0, 160, 90).data;
        }
        const names = Object.keys(px), out = [];
        for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
          const a = px[names[i]], b = px[names[j]];
          let d = 0;
          for (let k = 0; k < a.length; k += 4) d += Math.abs(a[k] - b[k]) + Math.abs(a[k + 1] - b[k + 1]) + Math.abs(a[k + 2] - b[k + 2]);
          out.push([names[i], names[j], d / (a.length / 4) / 3]);
        }
        return out.sort((x, y) => x[2] - y[2]);
      }, svgs);
      const [a, b, d] = pairs[0];
      check(d > 7, `"${prompt}": every pair of the ${STYLE_NAMES.length} styles looks clearly different (closest: ${a} and ${b}, ${d.toFixed(1)} levels apart)`);
    }
  } finally {
    await browser.close();
  }
}

console.log(fails ? `\n${fails} style check(s) failed` : '\nStyles test suite: ALL PASSED!');
process.exit(fails ? 1 : 0);
