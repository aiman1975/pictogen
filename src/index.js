// PictoGen public API – offline text-to-vector image generator.

import { parseText, suggestWords } from './text/matcher.js';
import { composeScene, ENV_WORDS } from './scene.js';

// Words that set the scene's backdrop (night, rain, beach...) rather than draw an object.
const SETTING_WORDS = new Set(Object.values(ENV_WORDS).flat());
// Time-of-day / weather words: in a scene the backdrop already shows them, so a library icon
// they happen to match ("sunset" -> city-at-sunset emoji) would be a stray object on the ground.
const ATMOSPHERE_WORDS = new Set([...ENV_WORDS.night, ...ENV_WORDS.sunset, ...ENV_WORDS.snow, ...ENV_WORDS.rain]);
import { renderIcon, renderCard, renderSheet, renderPlaceholder } from './core/render.js';
import { getConcept } from './concepts/index.js';
import { parseTimeline, extractCamera, editTimeline, lookRelations, speechRelations } from './timeline.js';
import { takeQuotes } from './speech.js';
import { findDiagram, renderDiagram, renderLabelledPictures, DIAGRAMS } from './diagrams.js';
import { conceptOf, individualNames } from './individuals.js';
import { renderCallout, renderKnolling, renderSplit, renderIsometric, renderWaffle, renderColoringBook, renderStickman, renderComicStrip, renderAlphabet } from './presentations.js';

export { STYLES, STYLE_NAMES, isStyle } from './core/styles.js';
export { renderIcon, renderCard, renderSheet, drawConcept, shapesToSvg } from './core/render.js';
export { renderCallout, renderKnolling, renderSplit, renderIsometric, renderWaffle, renderColoringBook, renderStickman, renderComicStrip, renderAlphabet } from './presentations.js';
export { renderWorksheet, worksheetKind, WORKSHEET_KINDS } from './worksheet.js';
export { parseText, tokenize, suggestWords } from './text/matcher.js';
export { composeScene } from './scene.js';
export { parseTimeline, hasSequence, cameraAction, extractCamera, editTimeline, lookRelations, speechRelations, POSE_ANIMS, ACTION_TYPES, CAMERA_TYPES } from './timeline.js';
export { lipKeys, babbleNotes } from './speech.js';
export { findDiagram, renderDiagram, renderLabelledPictures, DIAGRAMS } from './diagrams.js';
export { voiceOf, soundOf, SOUND_NAMES } from './sound.js';
export { listConcepts, getConcept, registerConcept } from './concepts/index.js';
export { parseStoryText, composeStory, STORY_TEMPLATES, ASPECT_RATIOS, generateStoryHtml } from './story.js';

/**
 * generate(text, opts) -> { svg, matches, unknown, setting, tokens, images, duration?, beats? }
 *   setting: words that changed the scene backdrop (night, rain, beach...) instead of drawing an object
 *   duration, beats: for a scene told as a sequence ("a boy walks in, then waves, then a dog runs to
 *     him"), the clip length in seconds and the actions of each beat (see src/timeline.js); scenes with
 *     camera moves ("zoom in on the dog", "the camera follows him") also report their loop length
 *
 * opts.mode   'scene' (default) | 'comic' | 'stickman' | 'diagram' (labelled; 'callout' too) | 'knolling' | 'split' | 'isometric' | 'waffle' | 'coloring' | 'icons' | 'card'
 * opts.style  'flat' | 'cartoon' | 'cute2d' | 'comic' | 'whiteboard' | 'geometric' | 'doodle' | 'editorial' | 'papercut' | 'stickman' | 'outline' | 'pastel' | 'silhouette' | 'sketch' | 'neon' | 'blueprint' | 'chalkboard' | 'vintage' | 'pixel' | 'watercolor' | 'anime' | 'crayon' | 'letterling' (STYLE_NAMES)
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
  // Named individuals (opts.individuals: [{ key: 'pgc1', base: 'boy' }], see src/individuals.js): in a
  // scene each is its own figure ("boy~pgc1"); elsewhere (icons, comics...) simply its kind
  const individuals = individualNames(opts.individuals, (id) => getConcept(id)?.category === 'people' || !!getConcept(id));
  const names = mode === 'scene' ? individuals : new Map([...individuals].map(([k, id]) => [k, conceptOf(id)]));
  // Camera directions ("zoom in on the dog") are not things to draw: read the scene without them,
  // but keep whatever they point at ("a close-up of a cat" still draws the cat).
  // Quoted speech ("says “Hello!”") is said, not drawn: the scene is read without it
  const { text: unquoted } = takeQuotes(text);
  const shot = mode === 'scene' ? extractCamera(unquoted) : { text: unquoted, moves: [] };
  let sceneText = shot.text;
  for (const m of shot.moves) {
    const id = m.target && parseText(m.target, { names }).matches[0]?.id;
    if (id && !parseText(sceneText, { names }).matches.some((x) => x.id === id)) sceneText += ` and ${m.target}`;
  }
  let parsed = parseText(sceneText, { fuzzy, names });
  // Nothing at all to draw: try again forgiving typos ("elefant"), so there is always a picture
  // when one is close
  if (!parsed.matches.length && !fuzzy && parsed.unknown.length) {
    let forgiving = parseText(sceneText, { fuzzy: true, names });
    if (!forgiving.matches.length) {
      // Still nothing: each unknown word as its closest drawable word ("elefant" -> "elephant")
      const swaps = new Map(parsed.unknown.map((w) => [w, suggestWords(w, 1)[0]]).filter(([, s]) => s));
      if (swaps.size) forgiving = parseText(sceneText.replace(/[a-z']+/gi, (w) => swaps.get(w.toLowerCase()) ?? w), { names });
    }
    if (forgiving.matches.length) {
      // (what was guessed, for the studio: "elefant" drawn as "elephant")
      const guessed = Object.fromEntries(parsed.unknown.filter((w) => !forgiving.unknown.includes(w))
        .map((w) => [w, suggestWords(w, 1)[0] ?? forgiving.matches.find((m) => m.fuzzy)?.word ?? '']));
      parsed = { ...forgiving, matches: forgiving.matches.map((m) => ({ ...m, fuzzy: true })), unknown: forgiving.unknown.filter((w) => !(w in guessed)), guessed };
    }
  }
  let { matches } = parsed;
  const backdrop = mode === 'scene'
    ? matches.filter((m) => ATMOSPHERE_WORDS.has(m.word) && getConcept(m.id)?.isLibrary)
    : [];
  if (backdrop.length) matches = matches.filter((m) => !backdrop.includes(m));
  // Several things happening one after another: actors follow a timeline of beats - the prompt's,
  // or the beats as edited in the studio (opts.beats), which can also bring a still scene to life
  let timeline = mode === 'scene' ? parseTimeline(text, { names }) : null;
  const cast = timeline
    ? [...timeline.actors.map(({ id, match }) => ({ ...match, id, count: match.count ?? 1, animation: undefined })), ...timeline.props]
    : matches.map((m) => ({ ...m, animation: undefined }));
  const edited = mode === 'scene' && Array.isArray(opts.beats);
  if (edited) timeline = editTimeline(opts.beats, cast.filter((m) => !(ATMOSPHERE_WORDS.has(m.word) && getConcept(m.id)?.isLibrary)), timeline);
  if (timeline) {
    matches = [
      ...timeline.actors.map(({ id, match }) => ({ ...match, id, count: match.count ?? 1, animation: undefined, actor: true })),
      ...timeline.props.filter((m) => !(ATMOSPHERE_WORDS.has(m.word) && getConcept(m.id)?.isLibrary)),
    ];
  }
  const common = { style, seed, vary, width, height, text };
  let svg, diagram = null;
  // A labelled diagram: asked for by its mode ("diagram", or "callout"), or in a scene by a school
  // topic said plainly ("the parts of a plant", "the water cycle"); labels renamed or left blank
  const isDiagramMode = mode === 'diagram' || mode === 'callout';
  const topic = isDiagramMode ? findDiagram(unquoted) : mode === 'scene' && !opts.beats ? findDiagram(unquoted, { strict: true }) : null;
  const labelOpts = {
    ...common,
    labels: opts.labels && typeof opts.labels === 'object' ? opts.labels : undefined,
    blank: Boolean(opts.blank),
    numbered: Boolean(opts.numbered),
    title: typeof opts.title === 'string' && opts.title.trim() ? opts.title.trim() : undefined,
  };
  if (topic) {
    ({ svg, diagram } = renderDiagram(topic, labelOpts));
  } else if (isDiagramMode && matches.length) {
    ({ svg, diagram } = renderLabelledPictures(matches, labelOpts));
  } else if (isDiagramMode) {
    svg = renderPlaceholder({ style });
  } else if (mode === 'icons') {
    svg = matches.length
      ? renderSheet(matches.map((m) => ({ id: m.id, color: m.color, expression: m.expression, animation: m.animation, view: m.view, label: true })), common)
      : renderPlaceholder({ style });
  } else if (mode === 'card') {
    svg = matches.length
      ? renderCard(matches[0].id, { ...common, color: matches[0].color, expression: matches[0].expression, animation: matches[0].animation, view: matches[0].view })
      : renderPlaceholder({ style });
  } else if (mode === 'comic') {
    svg = renderComicStrip(matches, common);
  } else if (mode === 'stickman' || /stickman|stick figure/.test(text.toLowerCase())) {
    svg = renderStickman(matches, common);
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
    // Camera moves without a timeline: targets as concept ids (a pronoun means the first figure)
    const camera = !timeline && shot.moves.length ? {
      moves: shot.moves.map((m) => ({
        ...m,
        target: m.target && (parseText(m.target, { names }).matches[0]?.id ?? (/^(him|her|it|them)$/.test(m.target) ? matches[0]?.id : null)),
      })),
    } : null;
    // Who looks at whom in a still scene ("a boy and a girl looking at each other")
    const looks = timeline ? [] : lookRelations(text, { names });
    // Who says what (lip-synced): quoted words, or a clip scene's caption said by whoever talks
    const speech = timeline ? [] : speechRelations(text, { names });
    const caption = typeof opts.caption === 'string' && opts.caption.trim() ? opts.caption.trim().slice(0, 400) : null;
    if (timeline) timeline.caption = caption;
    const sceneOpts = { ...common, words: parsed.tokens, timeline, camera, looks, speech, caption };
    svg = composeScene(matches, sceneOpts);
    if (sceneOpts.speechDuration) common.duration = Math.max(common.duration ?? 0, sceneOpts.speechDuration);
    if (camera?.duration) common.duration = Math.max(common.duration ?? 0, camera.duration);
  }
  const images = matches.map((m) => ({
    id: m.id, word: m.word, count: m.count, color: m.color, expression: m.expression, animation: m.animation, view: m.view,
    svg: renderIcon(conceptOf(m.id), { ...common, color: m.color, expression: m.expression, animation: m.animation, view: m.view, size }),
  }));
  const setting = mode === 'scene'
    ? [...backdrop.map((m) => m.word), ...parsed.unknown.filter((w) => SETTING_WORDS.has(w))]
    : [];
  const unknown = parsed.unknown.filter((w) => !setting.includes(w) && !/^qq\d+$/.test(w));
  // For each word not drawn, words close to it that can be (the studio offers them)
  const suggestions = Object.fromEntries(unknown.map((w) => [w, suggestWords(w)]).filter(([, list]) => list.length));
  const clip = timeline?.duration
    ? { duration: timeline.duration, beats: timeline.beats.map((b, i) => ({ ...b, ...timeline.beatTimes?.[i] })) }
    : common.duration ? { duration: common.duration } : {};
  // Who and what a timeline can use (the studio's timeline editor)
  const castOut = mode === 'scene'
    ? cast.filter((m) => getConcept(conceptOf(m.id)) && !(ATMOSPHERE_WORDS.has(m.word) && getConcept(m.id)?.isLibrary))
      .map((m) => ({ id: m.id, label: getConcept(conceptOf(m.id)).label || m.id, person: getConcept(conceptOf(m.id)).category === 'people' }))
    : [];
  return { svg, ...parsed, matches, unknown, suggestions, guessed: parsed.guessed || {}, ...(diagram ? { diagram } : {}), setting, images, ...clip, cast: castOut, ...(edited ? { edited: true } : {}) };
}
