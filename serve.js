// Minimal zero-dependency HTTP server for PictoGen Web Studio.
import http from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, listConcepts, getConcept, drawConcept, shapesToSvg, renderIcon, STYLE_NAMES, isStyle, composeStory, STORY_TEMPLATES, ASPECT_RATIOS, generateStoryHtml } from './src/index.js';
import { getShowcaseData } from './src/showcase.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = resolve(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
};

const svgCache = new Map();
const MAX_BODY = 1024 * 1024;

// Reads a JSON request body (capped at MAX_BODY) and hands the parsed payload to `handle`.
// Malformed JSON is a 400; errors thrown by `handle` become a 500 JSON response.
function withJsonBody(req, res, handle) {
  let body = '';
  req.on('data', (chunk) => {
    if (res.headersSent) return;
    body += chunk;
    if (body.length > MAX_BODY) {
      res.writeHead(413, { 'Content-Type': 'application/json', Connection: 'close' });
      res.end(JSON.stringify({ error: 'Request body too large' }));
      req.destroy();
    }
  });
  req.on('end', () => {
    let payload;
    try {
      payload = JSON.parse(body || '{}');
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Invalid JSON: ${err.message}` }));
      return;
    }
    try {
      handle(payload && typeof payload === 'object' ? payload : {});
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // API: List concepts
  if (pathname === '/api/concepts' && req.method === 'GET') {
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
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    });
    res.end(JSON.stringify({ concepts: list, styles: STYLE_NAMES }));
    return;
  }

  // API: Generate SVG from text
  if (pathname === '/api/generate' && req.method === 'POST') {
    withJsonBody(req, res, (payload) => {
      const text = payload.text || 'apple';
      const opts = {
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
      };
      const result = generate(text, opts);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    });
    return;
  }

  // API: Render single concept with custom expression / animation
  if (pathname === '/api/render-concept' && req.method === 'POST') {
    withJsonBody(req, res, (payload) => {
      const { id, style = 'flat', expression = 'happy', animation, color, vary, seed = 1, view } = payload;
      const c = getConcept(id);
      if (!c) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Unknown concept: ${id}` }));
        return;
      }
      const shapes = drawConcept(c, { seed, color, vary, expression, animation, style, view: ['front', 'three-quarter', 'side', 'back'].includes(view) ? view : undefined });
      const markup = shapesToSvg(shapes, style);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id, expression, animation, markup }));
    });
    return;
  }

  // API: Get story templates
  if (pathname === '/api/story/templates' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ templates: STORY_TEMPLATES, aspectRatios: ASPECT_RATIOS }));
    return;
  }

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

  // API: Generate multi-scene animated clip (Kids, Documentary, News, How-To)
  if (pathname === '/api/story/generate' && req.method === 'POST') {
    withJsonBody(req, res, (payload) => {
      const text = payload.text || 'puppy-friend';
      const opts = {
        style: payload.style || 'flat',
        genre: payload.genre || 'kids',
        aspect: payload.aspect || '16:9',
        seed: payload.seed || 1,
        vary: Boolean(payload.vary),
        title: payload.title,
        individuals: Array.isArray(payload.individuals) ? payload.individuals : undefined,
      };
      const scenes = clipScenes(payload);
      const story = composeStory(scenes.length ? scenes : text, opts);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(story));
    });
    return;
  }

  // API: Export story as standalone offline HTML player
  if (pathname === '/api/story/export-html' && req.method === 'POST') {
    withJsonBody(req, res, (payload) => {
      const scenes = clipScenes(payload);
      const story = composeStory(scenes.length ? scenes : payload.text || 'puppy-friend', {
        style: payload.style || 'flat',
        genre: payload.genre || 'kids',
        aspect: payload.aspect || '16:9',
        seed: payload.seed || 1,
        vary: Boolean(payload.vary),
        title: payload.title,
        individuals: Array.isArray(payload.individuals) ? payload.individuals : undefined,
      });
      const html = generateStoryHtml(story);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${(story.title || 'clip').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html"`,
      });
      res.end(html);
    });
    return;
  }

  // API: Direct SVG export (GET /api/svg?text=...&style=...&mode=...)
  if (pathname === '/api/svg' && req.method === 'GET') {
    const text = url.searchParams.get('text') || 'apple';
    const style = url.searchParams.get('style') || 'flat';
    const mode = url.searchParams.get('mode') || 'scene';
    const seed = url.searchParams.get('seed') || 1;
    const vary = url.searchParams.get('vary') === 'true';

    const cacheKey = `${text}:${style}:${mode}:${seed}:${vary}`;
    let svg = svgCache.get(cacheKey);
    if (!svg) {
      const result = generate(text, { style, mode, seed, vary });
      svg = result.svg;
      if (svgCache.size < 5000) svgCache.set(cacheKey, svg);
    }

    res.writeHead(200, {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
      'Content-Disposition': 'inline; filename="pictogen.svg"',
    });
    res.end(svg);
    return;
  }

  // API: Single concept thumbnail (GET /api/icon?id=apple&style=flat) – used by the dictionary grid
  if (pathname === '/api/icon' && req.method === 'GET') {
    const id = url.searchParams.get('id');
    const style = isStyle(url.searchParams.get('style')) ? url.searchParams.get('style') : 'flat';
    if (!getConcept(id)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Unknown concept');
      return;
    }
    const cacheKey = `icon:${id}:${style}`;
    let svg = svgCache.get(cacheKey);
    if (!svg) {
      svg = renderIcon(id, { style, size: 96 });
      if (svgCache.size < 5000) svgCache.set(cacheKey, svg);
    }
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    });
    res.end(svg);
    return;
  }

  // API: Get showcase video data
  if (pathname === '/api/showcase' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getShowcaseData()));
    return;
  }

  // The sound synthesizer lives with the library (the HTML clip export embeds it too)
  if (pathname === '/js/sound-synth.js') {
    res.writeHead(200, { 'Content-Type': MIME['.js'] });
    res.end(readFileSync(resolve(__dirname, 'src', 'sound-synth.js')));
    return;
  }

  // Static file serving from public/
  let filePath = resolve(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname === '/showcase' ? 'showcase.html' : '.' + pathname);
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  let isFile = false;
  try { isFile = statSync(filePath).isFile(); } catch { /* missing */ }
  if (isFile) {
    const ext = extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(readFileSync(filePath));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`PictoGen Web Studio running at: http://localhost:${PORT}`);
});
