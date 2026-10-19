#!/usr/bin/env node
// Serves a static build (scripts/build-web.js) the way a static host does: files only, no API.
//   node scripts/preview-web.js [dir] [port]     (default: dist/, 5050)
import http from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = resolve(process.argv[2] || join(root, 'dist'));
const port = Number(process.argv[3] || process.env.PORT || 5050);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.txt': 'text/plain; charset=utf-8',
};

http.createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') path = '/index.html';
  if (path === '/studio') path = '/studio.html';
  if (path === '/help') path = '/help.html';
  if (path === '/showcase') path = '/showcase.html';
  const file = resolve(dir, '.' + path);
  let ok = false;
  try { ok = file.startsWith(dir + sep) && statSync(file).isFile(); } catch { /* missing */ }
  if (!ok) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not Found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`PictoGen web build at http://localhost:${port} (static, the engine runs in the browser)`));
