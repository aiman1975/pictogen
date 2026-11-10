// The studio's API, as one function: the Node server (serve.js) and the static web build (the engine
// running in the visitor's browser, scripts/build-web.js) answer the same requests the same way.

import { KINDS } from './data/nearest-en.js';
import { cleanFeatures } from './looks.js';
import { writeOutline } from './slides.js';
import { outlineFromNotes } from './writer.js';
import { generate, listConcepts, getConcept, drawConcept, shapesToSvg, renderIcon, STYLE_NAMES, isStyle, composeStory, STORY_TEMPLATES, ASPECT_RATIOS, generateStoryHtml } from './index.js';
import { getShowcaseData } from './showcase.js';
import { renderWorksheet } from './worksheet.js';

const svgCache = new Map();
const json = (body, status = 200, headers = {}) => ({ status, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

// Scenes saved one by one in the studio ("Your clip"): prompt, caption and edited steps each
const clipScenes = (payload) => (Array.isArray(payload.scenes)
  ? payload.scenes.slice(0, 30)
    .filter((sc) => sc && typeof sc.prompt === 'string' && sc.prompt.trim())
    .map((sc) => ({
      prompt: sc.prompt.slice(0, 500),
      ...(typeof sc.caption === 'string' && sc.caption.trim() ? { caption: sc.caption.slice(0, 300) } : {}),
      ...(Array.isArray(sc.beats) ? { beats: sc.beats } : {}),
    }))
  : []);

// (sentence -> value maps from the studio, the values that fit kept)
const byCaption = (map, ok) => (map && typeof map === 'object' && !Array.isArray(map)
  ? Object.fromEntries(Object.entries(map).filter(([k, v]) => typeof k === 'string' && ok(v)).slice(0, 80)) : undefined);
const storyOpts = (payload) => ({
  style: payload.style || 'flat',
  genre: payload.genre || 'kids',
  aspect: payload.aspect || '16:9',
  seed: payload.seed || 1,
  vary: Boolean(payload.vary),
  title: payload.title,
  individuals: Array.isArray(payload.individuals) ? payload.individuals : undefined,
  places: Array.isArray(payload.places) ? payload.places : undefined,
  // the clip's music: a mood ('calm', 'adventure'...) instead of its genre's (src/sound-pack.js TUNES)
  tune: typeof payload.tune === 'string' ? payload.tune.slice(0, 20) : undefined,
  sounds: typeof payload.sounds === 'string' ? payload.sounds.slice(0, 10) : undefined,
  // the mood each scene is given in the studio: sentence -> 'tense', 'joyful', 'sad', 'calm', 'mystery' or 'none'
  moods: payload.moods && typeof payload.moods === 'object' && !Array.isArray(payload.moods)
    ? Object.fromEntries(Object.entries(payload.moods).filter(([k, v]) => typeof k === 'string' && /^(tense|joyful|sad|calm|mystery|none)$/.test(v)).slice(0, 80))
    : undefined,
  // a scene's place chosen on its card: sentence -> { place, time, weather } or { key, time, weather }
  scenePlaces: byCaption(payload.scenePlaces, (v) => v && typeof v === 'object' && !Array.isArray(v)),
  // a scene's shots chosen on its card: sentence -> 'wide', 'close:pgc21', 'low'... (src/director.js)
  sceneShots: byCaption(payload.sceneShots, (v) => typeof v === 'string' && /^(auto|steady|wide|close|follow|push|pull|pan-right|pan-left|low|high|shake)(:[\w~#-]{1,40})?$/.test(v)),
  // a scene's own look chosen on its card: sentence -> a style ('stickman', 'flat'...)
  sceneStyles: byCaption(payload.sceneStyles, (v) => isStyle(v)),
  // a scene's steps changed on its card: sentence -> [{ actor, type, anim?, target?, with? }]
  sceneBeats: byCaption(payload.sceneBeats, (v) => Array.isArray(v)),
  // a story's scenes as the writer changed them: sentence -> what to draw
  edits: payload.edits && typeof payload.edits === 'object' && !Array.isArray(payload.edits)
    ? Object.fromEntries(Object.entries(payload.edits).filter(([k, v]) => typeof k === 'string' && typeof v === 'string').slice(0, 80))
    : undefined,
});

/**
 * Answers one API request: method ('GET' | 'POST'), url (a URL), payload (the parsed JSON body of a
 * POST, an object). Returns { status, headers, body (a string) }, or null when no API route matches.
 */
export function handleApi(method, url, payload = {}) {
  const { pathname, searchParams } = url;

  // List concepts
  if (pathname === '/api/concepts' && method === 'GET') {
    const list = listConcepts().map((c) => ({
      id: c.id,
      label: c.label,
      category: c.category,
      tags: c.tags,
      aliases: c.aliases,
      scale: c.scale,
      placement: c.placement,
      library: Boolean(c.isLibrary),
      variantOf: c.variantOf,
      // (what kind of thing it is, nearest first: "parrot bird" - for the studio's 🔄 Swap)
      ...(KINDS[c.id] ? { kinds: KINDS[c.id] } : {}),
    }));
    return json({ concepts: list, styles: STYLE_NAMES }, 200, { 'Cache-Control': 'public, max-age=3600' });
  }

  // Generate SVG from text
  if (pathname === '/api/generate' && method === 'POST') {
    const text = payload.text || 'apple';
    // (a look-up - the studio's picture search - is said so in the answer: no picture asked for)
    const answer = (r) => json(payload.lookup ? { ...r, lookup: true } : r);
    return answer(generate(text, {
      style: payload.style || 'flat',
      mode: payload.mode || 'scene',
      width: payload.width || 640,
      height: payload.height || 360,
      seed: payload.seed || 1,
      vary: Boolean(payload.vary),
      fuzzy: Boolean(payload.fuzzy),
      // (the words' language, when the studio says it: 'de' or 'ar')
      ...(['de', 'ar'].includes(payload.lang) ? { lang: payload.lang } : {}),
      // Steps as edited in the studio's timeline view (checked by generate)
      ...(Array.isArray(payload.beats) ? { beats: payload.beats } : {}),
      // A labelled diagram's renamed labels ({ key: text }), its labels left blank (a quiz), its title
      ...(payload.labels && typeof payload.labels === 'object' && !Array.isArray(payload.labels)
        ? { labels: Object.fromEntries(Object.entries(payload.labels).filter(([k, v]) => typeof v === 'string').slice(0, 40).map(([k, v]) => [String(k).slice(0, 40), v.slice(0, 40)])) }
        : {}),
      blank: Boolean(payload.blank),
      ...(typeof payload.title === 'string' ? { title: payload.title.slice(0, 80) } : {}),
      // Named individuals: neutral keys and their kind only (src/individuals.js)
      ...(Array.isArray(payload.individuals) ? { individuals: payload.individuals } : {}),
      // "Your places": neutral keys and what they are (src/places.js)
      ...(Array.isArray(payload.places) ? { places: payload.places } : {}),
      // Pictures swapped in the studio: a word or a picture id -> a picture id (checked by generate)
      ...(payload.swaps && typeof payload.swaps === 'object' && !Array.isArray(payload.swaps)
        ? { swaps: Object.fromEntries(Object.entries(payload.swaps).filter(([k, v]) => typeof v === 'string' && k.length <= 60 && v.length <= 80).slice(0, 30)) }
        : {}),
    }));
  }

  // Render single concept with custom expression / animation
  if (pathname === '/api/render-concept' && method === 'POST') {
    const { id, style = 'flat', expression = 'happy', animation, color, vary, seed = 1, view, held, colors, features } = payload;
    const c = getConcept(id);
    if (!c) return json({ error: `Unknown concept: ${id}` }, 404);
    // A recurring character's own colours ({ main, hair, skin, pants }: "#rrggbb")
    const own = colors && typeof colors === 'object'
      ? Object.fromEntries(Object.entries(colors).filter(([r, v]) => ['main', 'hair', 'skin', 'pants'].includes(r) && /^#[0-9a-f]{6}$/i.test(v)))
      : null;
    const shapes = drawConcept(c, {
      seed, color, vary, expression, animation, style, ...(own && Object.keys(own).length ? { colors: own } : {}),
      // a character's own face and hair (src/looks.js)
      ...(cleanFeatures(features) ? { features: cleanFeatures(features) } : {}), view: ['front', 'three-quarter', 'side', 'back'].includes(view) ? view : undefined,
      // what the figure holds ({ id, color }), drawn in its hands again
      ...(held && typeof held.id === 'string' && getConcept(held.id) ? { held: { id: held.id, color: typeof held.color === 'string' ? held.color : undefined } } : {}),
    });
    return json({ id, expression, animation, markup: shapesToSvg(shapes, style) });
  }

  // Story templates
  if (pathname === '/api/story/templates' && method === 'GET') {
    return json({ templates: STORY_TEMPLATES, aspectRatios: ASPECT_RATIOS });
  }

  // Generate multi-scene animated clip (Kids, Documentary, News, How-To)
  if (pathname === '/api/story/generate' && method === 'POST') {
    const scenes = clipScenes(payload);
    return json(composeStory(scenes.length ? scenes : payload.text || 'puppy-friend', storyOpts(payload)));
  }

  // An explainer's cards (as the studio's card editor has them) back as outline text (src/slides.js)
  if (pathname === '/api/outline/write' && method === 'POST') {
    const cards = Array.isArray(payload.cards) ? payload.cards.slice(0, 60) : [];
    return json({ text: writeOutline(cards) });
  }

  // Notes or an article turned into an explainer's outline (src/writer.js), to check and make
  if (pathname === '/api/outline/from-notes' && method === 'POST') {
    const notes = typeof payload.text === 'string' ? payload.text.slice(0, 40000) : '';
    return json(outlineFromNotes(notes, typeof payload.title === 'string' && payload.title.trim() ? { title: payload.title.slice(0, 120) } : {}));
  }

  // Export story as standalone offline HTML player
  if (pathname === '/api/story/export-html' && method === 'POST') {
    const scenes = clipScenes(payload);
    const story = composeStory(scenes.length ? scenes : payload.text || 'puppy-friend', storyOpts(payload));
    return {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${(story.title || 'clip').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html"`,
      },
      body: generateStoryHtml(story),
    };
  }

  // Direct SVG export (GET /api/svg?text=...&style=...&mode=...)
  if (pathname === '/api/svg' && method === 'GET') {
    const text = searchParams.get('text') || 'apple';
    const style = searchParams.get('style') || 'flat';
    const mode = searchParams.get('mode') || 'scene';
    const seed = searchParams.get('seed') || 1;
    const vary = searchParams.get('vary') === 'true';
    const cacheKey = `${text}:${style}:${mode}:${seed}:${vary}`;
    let svg = svgCache.get(cacheKey);
    if (!svg) {
      svg = generate(text, { style, mode, seed, vary }).svg;
      if (svgCache.size < 5000) svgCache.set(cacheKey, svg);
    }
    return {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400', 'Content-Disposition': 'inline; filename="pictogen.svg"' },
      body: svg,
    };
  }

  // Single concept thumbnail (GET /api/icon?id=apple&style=flat): the dictionary grid
  if (pathname === '/api/icon' && method === 'GET') {
    const id = searchParams.get('id');
    const style = isStyle(searchParams.get('style')) ? searchParams.get('style') : 'flat';
    if (!getConcept(id)) return { status: 404, headers: { 'Content-Type': 'text/plain' }, body: 'Unknown concept' };
    const cacheKey = `icon:${id}:${style}`;
    let svg = svgCache.get(cacheKey);
    if (!svg) {
      svg = renderIcon(id, { style, size: 96 });
      if (svgCache.size < 5000) svgCache.set(cacheKey, svg);
    }
    return { status: 200, headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' }, body: svg };
  }

  // A printable worksheet (A4 pages as SVG, fonts inside): the studio turns them into a PDF
  if (pathname === '/api/worksheet' && method === 'POST') {
    const text = String(payload.text || 'apple').slice(0, 500);
    const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : undefined);
    return json(renderWorksheet(text, {
      style: payload.style || 'flat',
      mode: payload.mode || 'scene',
      seed: payload.seed || 1,
      vary: Boolean(payload.vary),
      kind: str(payload.kind, 10),
      title: str(payload.title, 80),
      instructions: str(payload.instructions, 160),
      lines: Number.isFinite(+payload.lines) ? Math.max(1, Math.min(12, +payload.lines)) : undefined,
      answers: payload.answers !== false,
      ...(payload.labels && typeof payload.labels === 'object' && !Array.isArray(payload.labels)
        ? { labels: Object.fromEntries(Object.entries(payload.labels).filter(([, v]) => typeof v === 'string').slice(0, 40).map(([k, v]) => [String(k).slice(0, 40), v.slice(0, 40)])) }
        : {}),
      ...(Array.isArray(payload.individuals) ? { individuals: payload.individuals } : {}),
      // "Your places": neutral keys and what they are (src/places.js)
      ...(Array.isArray(payload.places) ? { places: payload.places } : {}),
    }));
  }

  // Showcase video data
  if (pathname === '/api/showcase' && method === 'GET') return json(getShowcaseData());

  return null;
}
