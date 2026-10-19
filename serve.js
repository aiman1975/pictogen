// Minimal zero-dependency HTTP server for PictoGen Web Studio.
import http from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApi } from './src/api.js';

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

  // The API (src/api.js): JSON bodies for POSTs
  if (pathname.startsWith('/api/')) {
    const answer = (payload) => {
      const out = handleApi(req.method, url, payload);
      if (!out) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }
      res.writeHead(out.status, out.headers);
      res.end(out.body);
    };
    if (req.method === 'POST') withJsonBody(req, res, answer);
    else {
      try { answer({}); } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    }
    return;
  }

  // The sound synthesizer lives with the library (the HTML clip export embeds it too)
  if (pathname === '/js/sound-synth.js') {
    res.writeHead(200, { 'Content-Type': MIME['.js'] });
    res.end(readFileSync(resolve(__dirname, 'src', 'sound-synth.js')));
    return;
  }

  // Static file serving from public/
  let filePath = resolve(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname === '/studio' ? 'studio.html' : pathname === '/help' ? 'help.html' : pathname === '/showcase' ? 'showcase.html' : '.' + pathname);
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
