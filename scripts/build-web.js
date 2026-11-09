#!/usr/bin/env node
// Builds the studio as a static web site (for Firebase Hosting or any static host): the engine runs
// in the visitor's browser instead of on a server, so there is nothing to run or pay for, and what
// people make (their prompts, their face photos) never leaves their browser.
//
//   npm run web:build [-- <out dir>]     (default: dist/)
//   npm run web:preview                  (build, then serve it at http://localhost:5050)
//   npm run web:demo                     (the public demo for toonaro.com, in dist-demo/: see below)
//
// The demo (--demo): the same studio for anyone to try in the browser, a few times (DEMO_TRIES
// pictures or clips), everything it draws marked "Toonaro · demo" (on screen, in downloads and
// videos), then a note on how to get the full version. Not installable as an app; open to search
// engines; with an .htaccess for Apache hosts (STRATO) so /studio and /help open their pages.
//
// How: the site is public/ plus the engine (src/) and three small stand-ins for the Node modules
// the engine uses (node:fs, node:path, node:url; the files it reads are fetched once at start).
// The pages get an import map pointing at the stand-ins and a script that answers /api/ requests
// in the page with src/api.js, the same code serve.js runs.

import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const demo = args.includes('--demo');
const out = resolve(args.find((a) => !a.startsWith('--')) || join(root, demo ? 'dist-demo' : 'dist'));
// The demo's settings: how many pictures or clips a visitor may make, and where to ask for more
const DEMO_TRIES = 3;
const DEMO_CONTACT = 'info@toonaro.com';
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
  // (one that can't be fetched - offline and not kept - is simply not there)
  const res = await fetch(where(p)).catch(() => null);
  if (res?.ok) FILES.set(p, new Uint8Array(await res.arrayBuffer()));
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

const head = `${demo ? `<script>window.__toonaroDemo = ${JSON.stringify({ tries: DEMO_TRIES, contact: DEMO_CONTACT })};</script>\n<script src="/web/demo.js"></script>\n` : ''}<script type="importmap">{"imports":{"node:fs":"/web/fs.js","node:path":"/web/path.js","node:url":"/web/url.js"}}</script>
${demo ? '' : '<meta name="robots" content="noindex, nofollow">\n'}<script>
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
    // (the demo: every picture the engine draws carries the demo mark - /web/demo.js)
    if (window.__toonaroMark && /json/.test((out.headers && out.headers['Content-Type']) || '')) {
      try { out = Object.assign({}, out, { body: JSON.stringify(window.__toonaroMark(JSON.parse(out.body))) }); } catch (e) { /* (as it is) */ }
    }
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
for (const page of ['index.html', 'studio.html', 'showcase.html']) {
  const f = join(out, page);
  if (!existsSync(f)) continue;
  const html = readFileSync(f, 'utf8').replace(/<img([^>]*?) src="\/api\//g, '<img$1 data-api-src="/api/');
  writeFileSync(f, html.replace(/<head>/i, `<head>\n${head}`));
}
writeFileSync(join(out, 'robots.txt'), demo ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n');
// (only when a page asks: an apple-touch-icon.png at the root, as some phones look for it there)
cpSync(join(out, 'icons', 'apple-touch-icon.png'), join(out, 'apple-touch-icon.png'));

// The installable app: every page gets the app's manifest, icons and /js/app.js, and the offline
// worker (/sw.js) keeps every file of the site on the device once it is first opened, so Toonaro
// works with no internet. Its cache is named after the files' contents: a new build replaces it.
const app = `<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#4f46e5">
<link rel="icon" type="image/svg+xml" href="/icons/icon.svg">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Toonaro">
<script type="module" src="/js/app.js"></script>`;
// (the demo is a website, not an app to install: the icons only, no offline worker)
const icons = `<link rel="icon" type="image/svg+xml" href="/icons/icon.svg">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<style>[data-install] { display: none !important; }</style>`;
for (const page of ['index.html', 'studio.html', 'showcase.html', 'help.html', 'impressum.html', 'datenschutz.html']) {
  const f = join(out, page);
  if (existsSync(f)) writeFileSync(f, readFileSync(f, 'utf8').replace(/<head>/i, `<head>\n${demo ? icons : app}`));
}
if (demo) {
  cpSync(join(root, 'scripts', 'web', 'demo.js'), join(out, 'web', 'demo.js'));
  // (the help page too: its example links count as tries; the studio, the landing page and the show have it with the engine)
  for (const page of ['help.html']) {
    const f = join(out, page);
    writeFileSync(f, readFileSync(f, 'utf8').replace(/<\/head>/i, '<script>window.__toonaroDemo = ' + JSON.stringify({ tries: DEMO_TRIES, contact: DEMO_CONTACT }) + ';</script>\n<script src="/web/demo.js"></script>\n</head>'));
  }
  // (open to search engines; the landing page's footer with the legal pages)
  for (const page of ['index.html', 'studio.html', 'showcase.html', 'help.html']) {
    const f = join(out, page);
    if (existsSync(f)) writeFileSync(f, readFileSync(f, 'utf8').replace(/<meta name="robots" content="noindex, nofollow"\s*\/?>\n?/g, ''));
  }
  const home = join(out, 'index.html');
  writeFileSync(home, readFileSync(home, 'utf8').replace('Toonaro · a preview for friends and family ·', 'Toonaro · <a href="/impressum">Impressum</a> · <a href="/datenschutz">Datenschutz / Privacy</a> ·'));
  // Apache (STRATO): /studio opens studio.html, the manifest has its type
  writeFileSync(join(out, '.htaccess'), `# Toonaro demo (scripts/build-web.js --demo): pages by their short addresses
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME}.html -f
RewriteRule ^(.+?)/?$ $1.html [L]
AddType application/manifest+json .webmanifest
AddType application/javascript .js .mjs
AddType font/woff2 .woff2
`);
  // (the legal pages must be filled in before the site goes public)
  for (const page of ['impressum.html', 'datenschutz.html']) {
    const f = join(out, page);
    if (existsSync(f) && /\[[A-ZÄÖÜa-zäöüß ,/]+\]/.test(readFileSync(f, 'utf8'))) console.warn(`⚠️  ${page}: fill in the [placeholders] before publishing`);
  }
}
const files = walk(out).map((f) => '/' + relative(out, f).split('\\').join('/'))
  .filter((f) => !['/sw.js', '/robots.txt', '/.htaccess'].includes(f)).sort();
const version = createHash('sha1');
for (const f of files) version.update(f).update(readFileSync(join(out, f)));
// (the pages by their own addresses too: /studio, /help...)
const pages = { '/': '/index.html', '/studio': '/studio.html', '/help': '/help.html', '/showcase': '/showcase.html' };
if (!demo) writeFileSync(join(out, 'sw.js'), `// The offline worker (made by scripts/build-web.js): keeps every file of the site on this device,
// so Toonaro opens and works with no internet. Files come from the device first; a new version of
// the site (a new build) replaces them all.
const CACHE = 'pictogen-${version.digest('hex').slice(0, 12)}';
const FILES = ${JSON.stringify(files)};
const PAGES = ${JSON.stringify(pages)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('pictogen-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // (a page by its address, whatever follows it: /studio?text=a+cat is the studio)
  const path = url.pathname.replace(/\\/$/, '') || '/';
  const key = PAGES[path] ?? PAGES[path.replace(/\\.html$/, '')] ?? url.pathname;
  e.respondWith(caches.open(CACHE).then((c) => c.match(key, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') c.put(req, res.clone());
    return res;
  }).catch(() => (req.mode === 'navigate' ? c.match('/studio.html') : Response.error())))));
});
`);

const size = walk(out).reduce((s, f) => s + statSync(f).size, 0);
console.log(`built ${relative(root, out) || out}: ${walk(out).length} files, ${(size / 1e6).toFixed(1)} MB`);
