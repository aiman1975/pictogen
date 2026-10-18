// The studio's API, as one function: the Node server (serve.js) and the static web build (the engine
// running in the visitor's browser, scripts/build-web.js) answer the same requests the same way.

import { generate, listConcepts, getConcept, drawConcept, shapesToSvg, renderIcon, STYLE_NAMES, isStyle, composeStory, STORY_TEMPLATES, ASPECT_RATIOS, generateStoryHtml } from './index.js';
import { getShowcaseData } from './showcase.js';

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

const storyOpts = (payload) => ({
  style: payload.style || 'flat',
  genre: payload.genre || 'kids',
  aspect: payload.aspect || '16:9',
  seed: payload.seed || 1,
  vary: Boolean(payload.vary),
  title: payload.title,
  individuals: Array.isArray(payload.individuals) ? payload.individuals : undefined,
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
    }));
    return json({ concepts: list, styles: STYLE_NAMES }, 200, { 'Cache-Control': 'public, max-age=3600' });
  }

  // Generate SVG from text
  if (pathname === '/api/generate' && method === 'POST') {
    const text = payload.text || 'apple';
    return json(generate(text, {
      style: payload.style || 'flat',
      mode: payload.mode || 'scene',
      width: payload.width || 640,
      height: payload.height || 360,
      seed: payload.seed || 1,
      vary: Boolean(payload.vary),
      fuzzy: Boolean(payload.fuzzy),
      // Steps as edited in the studio's timeline view (checked by generate)
      ...(Array.isArray(payload.beats) ? { beats: payload.beats } : {}),
      // Named individuals: neutral keys and their kind only (src/individuals.js)
      ...(Array.isArray(payload.individuals) ? { individuals: payload.individuals } : {}),
    }));
  }

  // Render single concept with custom expression / animation
  if (pathname === '/api/render-concept' && method === 'POST') {
    const { id, style = 'flat', expression = 'happy', animation, color, vary, seed = 1, view } = payload;
    const c = getConcept(id);
    if (!c) return json({ error: `Unknown concept: ${id}` }, 404);
    const shapes = drawConcept(c, { seed, color, vary, expression, animation, style, view: ['front', 'three-quarter', 'side', 'back'].includes(view) ? view : undefined });
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

  // Showcase video data
  if (pathname === '/api/showcase' && method === 'GET') return json(getShowcaseData());

  return null;
}
