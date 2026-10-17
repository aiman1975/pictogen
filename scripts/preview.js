#!/usr/bin/env node
// Renders concepts x styles (and optional scenes) into out/<name>.html and screenshots it to out/<name>.png
// using headless Edge/Chrome, so drawings can be checked visually.
//
//   node scripts/preview.js apple sun boy                  # these concepts in all styles
//   node scripts/preview.js all --styles flat,outline      # every concept, two styles
//   node scripts/preview.js --text "a boy and a dog under the sun" --scene-style cartoon
//   node scripts/preview.js cat dog --name animals         # writes out/animals.png (use unique names in parallel)

import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { listConcepts, renderIcon, STYLE_NAMES, generate } from '../src/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
function opt(name, def) {
  const i = args.indexOf('--' + name);
  if (i < 0) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
}
const name = opt('name', 'preview');
const styles = opt('styles', STYLE_NAMES.join(',')).split(',');
const sceneStyles = opt('scene-style', 'flat').split(',');
const size = +opt('size', 110);
const texts = [];
for (let t; (t = opt('text')) !== undefined;) texts.push(t);

const all = listConcepts().map((c) => c.id);
const ids = args.includes('all') ? all : args.length ? args : texts.length ? [] : all;

let html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:Segoe UI,Arial,sans-serif;margin:10px;background:#f4f4f4}
table{border-collapse:collapse}th,td{padding:3px;text-align:center;font-size:12px}
td{background:#fff;border:1px solid #e3e3e3}.scene{margin:8px 0}.scene p{margin:2px 0;font-size:13px}
</style></head><body>`;
if (ids.length) {
  html += '<table><tr><th></th>' + styles.map((s) => `<th>${s}</th>`).join('') + '</tr>';
  for (const id of ids) {
    html += `<tr><th>${id}</th>` + styles.map((s) => `<td>${renderIcon(id, { style: s, size })}</td>`).join('') + '</tr>';
  }
  html += '</table>';
}
for (const t of texts) {
  for (const s of sceneStyles) {
    const r = generate(t, { style: s });
    html += `<div class="scene"><p><b>[${s}]</b> ${t} &rarr; ${r.matches.map((m) => `${m.id}×${m.count}`).join(', ') || '(none)'}${r.unknown.length ? ' | unknown: ' + r.unknown.join(', ') : ''}</p>${r.svg}</div>`;
  }
}
html += '</body></html>';

const out = resolve(root, 'out');
mkdirSync(out, { recursive: true });
const htmlPath = resolve(out, `${name}.html`);
const png = resolve(out, `${name}.png`);
writeFileSync(htmlPath, html);

const w = Math.max(ids.length ? 90 + styles.length * (size + 8) : 0, texts.length ? 680 : 0);
const h = Math.min(16000, 40 + ids.length * (size + 9) + texts.length * sceneStyles.length * 392);
const candidates = [
  process.env.PICTOGEN_BROWSER,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter(Boolean);
const browser = candidates.find((p) => existsSync(p));
if (!browser) {
  console.log('No browser found for screenshots. Open:', htmlPath);
  process.exit(0);
}
const profile = resolve(out, `.profile-${name}-${process.pid}`);
try {
  execFileSync(browser, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    `--user-data-dir=${profile}`, `--window-size=${w},${h}`, `--screenshot=${png}`, pathToFileURL(htmlPath).href,
  ], { stdio: 'ignore', timeout: 90000 });
  console.log('HTML:', htmlPath);
  console.log('PNG :', png);
} catch (e) {
  console.error('Screenshot failed:', e.message, '\nHTML:', htmlPath);
} finally {
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
}
