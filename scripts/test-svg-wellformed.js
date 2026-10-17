// Checks that every mode × style produces well-formed XML (required for .svg files to open
// in browsers, Inkscape, Illustrator, Figma and <img> tags). Zero-dependency checker:
// bare ampersands, unbalanced tags and unquoted attributes are reported.
import { generate, STYLE_NAMES } from '../src/index.js';

const MODES = ['scene', 'comic', 'stickman', 'callout', 'knolling', 'split', 'isometric', 'waffle', 'coloring', 'icons', 'card', 'alphabet'];
const PROMPTS = [
  'a happy boy and a red apple under the sun, 80% bikes',
  'Tom & Jerry <b>"cat"</b> & 50% dogs',
  'C is for cat',
];

export function wellFormedError(xml) {
  const body = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  const amp = body.match(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/);
  if (amp) return `bare "&" near: ${body.slice(Math.max(0, amp.index - 40), amp.index + 20)}`;
  const stack = [];
  const tagRe = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|<[^>]*>/g;
  let m;
  while ((m = tagRe.exec(body))) {
    if (!m[2]) return `malformed tag: ${m[0].slice(0, 80)}`;
    if (m[1]) {
      const open = stack.pop();
      if (open !== m[2]) return `</${m[2]}> closes <${open}>`;
    } else if (!m[4]) stack.push(m[2]);
  }
  if (stack.length) return `unclosed <${stack[stack.length - 1]}>`;
  return null;
}

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
