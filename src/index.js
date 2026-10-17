// PictoGen public API – offline text-to-vector image generator.

import { parseText } from './text/matcher.js';
import { composeScene, ENV_WORDS } from './scene.js';

// Words that set the scene's backdrop (night, rain, beach...) rather than draw an object.
const SETTING_WORDS = new Set(Object.values(ENV_WORDS).flat());
// Time-of-day / weather words: in a scene the backdrop already shows them, so a library icon
// they happen to match ("sunset" -> city-at-sunset emoji) would be a stray object on the ground.
const ATMOSPHERE_WORDS = new Set([...ENV_WORDS.night, ...ENV_WORDS.sunset, ...ENV_WORDS.snow, ...ENV_WORDS.rain]);
import { renderIcon, renderCard, renderSheet, renderPlaceholder } from './core/render.js';
import { getConcept } from './concepts/index.js';
import { renderCallout, renderKnolling, renderSplit, renderIsometric, renderWaffle, renderColoringBook, renderStickman, renderComicStrip, renderAlphabet } from './presentations.js';

export { STYLES, STYLE_NAMES, isStyle } from './core/styles.js';
export { renderIcon, renderCard, renderSheet, drawConcept, shapesToSvg } from './core/render.js';
export { renderCallout, renderKnolling, renderSplit, renderIsometric, renderWaffle, renderColoringBook, renderStickman, renderComicStrip, renderAlphabet } from './presentations.js';
export { parseText, tokenize } from './text/matcher.js';
export { composeScene } from './scene.js';
export { listConcepts, getConcept, registerConcept } from './concepts/index.js';
export { parseStoryText, composeStory, STORY_TEMPLATES, ASPECT_RATIOS, generateStoryHtml } from './story.js';

/**
 * generate(text, opts) -> { svg, matches, unknown, setting, tokens, images }
 *   setting: words that changed the scene backdrop (night, rain, beach...) instead of drawing an object
 *
 * opts.mode   'scene' (default) | 'comic' | 'stickman' | 'callout' | 'knolling' | 'split' | 'isometric' | 'waffle' | 'coloring' | 'icons' | 'card'
 * opts.style  'flat' | 'cartoon' | 'cute2d' | 'comic' | 'whiteboard' | 'geometric' | 'doodle' | 'editorial' | 'papercut' | 'stickman' | 'outline' | 'pastel' | 'silhouette' | 'sketch' | 'neon' | 'blueprint' | 'chalkboard' | 'vintage' | 'pixel'
 * opts.width / opts.height  scene size (default 640x360)
 * opts.seed   any number/string – same seed => same picture
 * opts.vary   randomize palettes (skin, hair, clothes, fruit colors...)
 * opts.fuzzy  typo tolerance in matching (default false)
 * opts.size   pixel size of individual icons in `images`
 */
export function generate(text, opts = {}) {
  const { mode = 'scene', style = 'flat', seed = 1, vary = false, fuzzy = false, size = 256 } = opts;
  const dim = (v, d) => (Number.isFinite(+v) && +v > 0 ? +v : d);
  const width = dim(opts.width, 640), height = dim(opts.height, 360);
  text = String(text ?? '');
  const parsed = parseText(text, { fuzzy });
  let { matches } = parsed;
  const backdrop = mode === 'scene'
    ? matches.filter((m) => ATMOSPHERE_WORDS.has(m.word) && getConcept(m.id)?.isLibrary)
    : [];
  if (backdrop.length) matches = matches.filter((m) => !backdrop.includes(m));
  const common = { style, seed, vary, width, height, text };
  let svg;
  if (mode === 'icons') {
    svg = matches.length
      ? renderSheet(matches.map((m) => ({ id: m.id, color: m.color, expression: m.expression, animation: m.animation, label: true })), common)
      : renderPlaceholder({ style });
  } else if (mode === 'card') {
    svg = matches.length
      ? renderCard(matches[0].id, { ...common, color: matches[0].color, expression: matches[0].expression, animation: matches[0].animation })
      : renderPlaceholder({ style });
  } else if (mode === 'comic') {
    svg = renderComicStrip(matches, common);
  } else if (mode === 'stickman' || /stickman|stick figure/.test(text.toLowerCase())) {
    svg = renderStickman(matches, common);
  } else if (mode === 'callout') {
    svg = renderCallout(matches, common);
  } else if (mode === 'knolling') {
    svg = renderKnolling(matches, common);
  } else if (mode === 'split') {
    svg = renderSplit(matches, common);
  } else if (mode === 'isometric') {
    svg = renderIsometric(matches, common);
  } else if (mode === 'waffle') {
    svg = renderWaffle(matches, common);
  } else if (mode === 'coloring') {
    svg = renderColoringBook(matches, common);
  } else if (mode === 'alphabet' || mode === 'spelling' || mode === 'letterling' || mode === 'letters') {
    svg = renderAlphabet(matches, common);
  } else {
    svg = composeScene(matches, { ...common, words: parsed.tokens });
  }
  const images = matches.map((m) => ({
    id: m.id, word: m.word, count: m.count, color: m.color, expression: m.expression, animation: m.animation,
    svg: renderIcon(m.id, { ...common, color: m.color, expression: m.expression, animation: m.animation, size }),
  }));
  const setting = mode === 'scene'
    ? [...backdrop.map((m) => m.word), ...parsed.unknown.filter((w) => SETTING_WORDS.has(w))]
    : [];
  const unknown = parsed.unknown.filter((w) => !setting.includes(w));
  return { svg, ...parsed, matches, unknown, setting, images };
}
