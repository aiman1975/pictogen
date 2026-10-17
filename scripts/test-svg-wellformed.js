// Checks that every mode × style produces well-formed XML (required for .svg files to open
// in browsers, Inkscape, Illustrator, Figma and <img> tags). Zero-dependency checker:
// bare ampersands, unbalanced tags and unquoted attributes are reported.
import { generate, STYLE_NAMES } from '../src/index.js';
import { wellFormedError } from './xml-check.js';

const MODES = ['scene', 'comic', 'stickman', 'callout', 'knolling', 'split', 'isometric', 'waffle', 'coloring', 'icons', 'card', 'alphabet'];
const PROMPTS = [
  'a happy boy and a red apple under the sun, 80% bikes',
  'Tom & Jerry <b>"cat"</b> & 50% dogs',
  'C is for cat',
  'a man and a dog walking across the park, a girl walking towards us',
];


let checked = 0;
const failures = [];
for (const mode of MODES) {
  for (const style of STYLE_NAMES) {
    for (const text of PROMPTS) {
      const { svg } = generate(text, { mode, style });
      const err = wellFormedError(svg);
      checked++;
      if (err) failures.push(`${mode}/${style} "${text}": ${err}`);
    }
  }
}

if (failures.length) {
  console.error(failures.slice(0, 20).join('\n'));
  console.error(`\n✗ ${failures.length}/${checked} SVGs are not well-formed XML`);
  process.exit(1);
}
console.log(`✓ ${checked} SVGs (${MODES.length} modes × ${STYLE_NAMES.length} styles × ${PROMPTS.length} prompts) are well-formed XML`);
