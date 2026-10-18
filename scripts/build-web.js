#!/usr/bin/env node
// Builds the studio as a static web site (for Firebase Hosting or any static host): the engine runs
// in the visitor's browser instead of on a server, so there is nothing to run or pay for, and what
// people make (their prompts, their face photos) never leaves their browser.
//
//   npm run web:build [-- <out dir>]     (default: dist/)
//   npm run web:preview                  (build, then serve it at http://localhost:5050)
//
// How: the site is public/ plus the engine (src/) and three small stand-ins for the Node modules
// the engine uses (node:fs, node:path, node:url; the files it reads are fetched once at start).
// The pages get an import map pointing at the stand-ins and a script that answers /api/ requests
// in the page with src/api.js, the same code serve.js runs.

import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = resolve(process.argv[2] || join(root, 'dist'));
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((x) => (x.isDirectory() ? walk(join(d, x.name)) : [join(d, x.name)]));

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// The site, without the showcase narration recordings (their license is unclear, see
// docs/LICENSE_AUDIT.md; the showcase falls back to the browser's own speech)
cpSync(join(root, 'public'), out, { recursive: true, filter: (f) => !/[\\/]audio[\\/]showcase-\d+\.wav$/.test(f) });
// The engine, and the synthesizer where the studio loads it
cpSync(join(root, 'src'), join(out, 'src'), { recursive: true });
cpSync(join(root, 'src', 'sound-synth.js'), join(out, 'js', 'sound-synth.js'));
// Licenses travel with the site
for (const f of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) cpSync(join(root, f), join(out, f.endsWith('.md') ? f.replace('.md', '.txt') : `${f}.txt`));

// Files the engine reads at start (as the engine names them: public/ files under /public/)
const reads = [
  '/src/data/fluent-emoji-flat.json',
  ...walk(join(root, 'public', 'fonts')).map((f) => '/public/' + relative(join(root, 'public'), f).split('\\').join('/')),
  ...(existsSync(join(root, 'public', 'audio', 'pack')) ? walk(join(root, 'public', 'audio', 'pack')).map((f) => '/public/' + relative(join(root, 'public'), f).split('\\').join('/')) : []),
];
mkdirSync(join(out, 'web'), { recursive: true });
writeFileSync(join(out, 'web', 'files.json'), JSON.stringify(reads));

// node:fs: the files above, fetched once (top-level await: the engine starts when they are here)
writeFileSync(join(out, 'web', 'fs.js'), `// node:fs for the engine in the browser (scripts/build-web.js): reads from files fetched at start
const LIST = await (await fetch('/web/files.json')).json();
const FILES = new Map();
const where = (p) => (p.startsWith('/public/') ? p.slice(7) : p);
await Promise.all(LIST.map(async (p) => {
  const res = await fetch(where(p));
  if (res.ok) FILES.set(p, new Uint8Array(await res.arrayBuffer()));
}));
const pathOf = (p) => decodeURIComponent(p instanceof URL ? p.pathname : typeof p === 'string' && /^[a-z]+:/i.test(p) ? new URL(p).pathname : String(p));
class Bytes extends Uint8Array {
  toString(enc = 'utf8') {
    if (enc === 'base64') {
      let s = '';
      for (let i = 0; i < this.length; i += 0x8000) s += String.fromCharCode.apply(null, this.subarray(i, i + 0x8000));
      return btoa(s);
    }
    return new TextDecoder().decode(this);
  }
}
const noFile = (p) => Object.assign(new Error(\`ENOENT: no such file or directory, open '\${p}'\`), { code: 'ENOENT' });
const under = (dir) => [...FILES.keys()].filter((k) => k.startsWith(dir.endsWith('/') ? dir : dir + '/'));
export function readFileSync(p, opts) {
  const key = pathOf(p), data = FILES.get(key);
  if (!data) throw noFile(key);
  const enc = typeof opts === 'string' ? opts : opts?.encoding;
  return enc ? new TextDecoder().decode(data) : new Bytes(data);
}
export const existsSync = (p) => FILES.has(pathOf(p)) || under(pathOf(p)).length > 0;
export function statSync(p) {
  const key = pathOf(p);
  if (FILES.has(key)) return { size: FILES.get(key).length, isFile: () => true, isDirectory: () => false };
  if (under(key).length) return { size: 0, isFile: () => false, isDirectory: () => true };
  throw noFile(key);
}
export function readdirSync(p, opts = {}) {
  const dir = pathOf(p).replace(/\\/$/, '');
  const names = new Map();
  for (const k of under(dir)) {
    const [first, ...rest] = k.slice(dir.length + 1).split('/');
    names.set(first, names.get(first) || rest.length > 0);
  }
  return [...names].map(([name, isDir]) => (opts.withFileTypes ? { name, isDirectory: () => isDir, isFile: () => !isDir } : name));
}
export default { readFileSync, existsSync, statSync, readdirSync };
`);

// node:path (posix) and node:url
writeFileSync(join(out, 'web', 'path.js'), `// node:path (posix) for the engine in the browser
export const sep = '/';
const norm = (p) => {
  const abs = p.startsWith('/'), parts = [];
  for (const s of p.split('/')) { if (!s || s === '.') continue; if (s === '..') parts.pop(); else parts.push(s); }
  return (abs ? '/' : '') + parts.join('/');
};
export const join = (...a) => norm(a.filter(Boolean).join('/'));
export const resolve = (...a) => { let p = ''; for (const s of a) p = s.startsWith('/') ? s : p + '/' + s; return norm(p || '/'); };
export const dirname = (p) => { const n = norm(p); const i = n.lastIndexOf('/'); return i > 0 ? n.slice(0, i) : '/'; };
export const basename = (p, ext) => { const b = norm(p).split('/').pop(); return ext && b.endsWith(ext) ? b.slice(0, -ext.length) : b; };
export const extname = (p) => { const b = basename(p); const i = b.lastIndexOf('.'); return i > 0 ? b.slice(i) : ''; };
export const relative = (from, to) => {
  const a = norm(from).split('/').filter(Boolean), b = norm(to).split('/').filter(Boolean);
  let i = 0; while (i < a.length && a[i] === b[i]) i++;
  return [...a.slice(i).map(() => '..'), ...b.slice(i)].join('/');
};
export default { sep, join, resolve, dirname, basename, extname, relative };
`);
writeFileSync(join(out, 'web', 'url.js'), `// node:url for the engine in the browser
export const fileURLToPath = (u) => decodeURIComponent(new URL(u, location.href).pathname);
export const pathToFileURL = (p) => new URL(p, location.origin);
export default { fileURLToPath, pathToFileURL };
`);

// The engine answering /api/ in the page
writeFileSync(join(out, 'web', 'engine.js'), `// The engine in the browser: answers the page's /api/ requests with src/api.js (scripts/build-web.js)
import { handleApi } from '/src/api.js';
window.__pictogenApi((method, url, payload) => handleApi(method, url, payload));
`);

const head = `<script type="importmap">{"imports":{"node:fs":"/web/fs.js","node:path":"/web/path.js","node:url":"/web/url.js"}}</script>
<meta name="robots" content="noindex, nofollow">
<script>
// The studio's /api/ requests are answered in this page by the engine (/web/engine.js), which
// starts once its data is loaded; requests made before then wait for it. Pictures pointing at
// /api/ (the dictionary's icons) are drawn the same way.
(function () {
  var realFetch = window.fetch.bind(window), ready, api = new Promise(function (r) { ready = r; });
  window.__pictogenApi = function (handle) { ready(handle); };
  function answer(handle, method, url, payload) {
    var out;
    try { out = handle(method, url, payload); } catch (e) { out = { status: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e.message }) }; }
    if (!out) out = { status: 404, headers: { 'Content-Type': 'application/json' }, body: '{"error":"Not found"}' };
    return new Response(out.body, { status: out.status, headers: out.headers });
  }
  window.fetch = function (input, init) {
    var url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
    if (url.origin !== location.origin || url.pathname.indexOf('/api/') !== 0) return realFetch(input, init);
    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    var payload = {};
    if (init && typeof init.body === 'string') { try { payload = JSON.parse(init.body || '{}') || {}; } catch (e) { return Promise.resolve(new Response('{"error":"Invalid JSON"}', { status: 400 })); } }
    return api.then(function (handle) { return answer(handle, method, url, payload); });
  };
  // (the build writes the studio's /api/ pictures as data-api-src, so the browser never asks
  // the host for them)
  var swap = function (img) {
    var src = img.getAttribute('data-api-src') || img.getAttribute('src');
    if (!src || src.indexOf('/api/') !== 0 || img.dataset.pgApi) return;
    img.dataset.pgApi = src;
    img.removeAttribute('src');
    window.fetch(src).then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) { if (b) img.src = URL.createObjectURL(b); });
  };
  new MutationObserver(function (list) {
    list.forEach(function (m) {
      if (m.type === 'attributes') swap(m.target);
      m.addedNodes && m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { if (n.tagName === 'IMG') swap(n); n.querySelectorAll && n.querySelectorAll('img[src^="/api/"], img[data-api-src]').forEach(swap); } });
    });
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'data-api-src'] });
})();
</script>
<script type="module" src="/web/engine.js"></script>
`;
for (const page of ['index.html', 'showcase.html']) {
  const f = join(out, page);
  if (!existsSync(f)) continue;
  const html = readFileSync(f, 'utf8').replace(/<img([^>]*?) src="\/api\//g, '<img$1 data-api-src="/api/');
  writeFileSync(f, html.replace(/<head>/i, `<head>\n${head}`));
}
writeFileSync(join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

const size = walk(out).reduce((s, f) => s + statSync(f).size, 0);
console.log(`built ${relative(root, out) || out}: ${walk(out).length} files, ${(size / 1e6).toFixed(1)} MB`);
