// The static web build (scripts/build-web.js), served as a static host would, files only: the
// studio works with the engine in the browser - scenes, clips, the dictionary's icons, the HTML
// export, sound - and never asks a server for /api/. Skipped without Playwright.
import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓ PASS' : '✗ FAIL'}: ${msg}`); if (!ok) fails++; };

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'pictogen-web-'));
execSync(`node scripts/build-web.js "${dir}"`, { cwd: root, stdio: 'pipe' });
check(existsSync(join(dir, 'index.html')) && existsSync(join(dir, 'studio.html')) && existsSync(join(dir, 'src', 'api.js')) && existsSync(join(dir, 'web', 'fs.js')), 'the build has the studio, the engine and its browser stand-ins');
check(!existsSync(join(dir, 'audio', 'showcase-1.wav')), 'the showcase narration recordings (license unclear) are left out');
check(/data-api-src="\/api\/icon/.test(readFileSync(join(dir, 'studio.html'), 'utf8')) && !/<img[^>]* src="\/api\//.test(readFileSync(join(dir, 'studio.html'), 'utf8')), 'the dictionary\'s pictures are drawn in the page, never fetched from the host');
check(/importmap/.test(readFileSync(join(dir, 'studio.html'), 'utf8')) && /noindex/.test(readFileSync(join(dir, 'studio.html'), 'utf8')) && existsSync(join(dir, 'robots.txt')), 'pages map node: modules to the stand-ins and ask search engines not to index them');
check(existsSync(join(dir, 'THIRD_PARTY_NOTICES.txt')) && existsSync(join(dir, 'LICENSE.txt')), 'the licenses travel with the site');

let chromium = null;
try {
  const req = createRequire(import.meta.url);
  try { ({ chromium } = req('playwright')); } catch { ({ chromium } = req(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright'))); }
} catch { /* not installed */ }
if (!chromium) console.log('- SKIP: web build in a browser (Playwright is not installed)');
else {
  const port = await new Promise((done) => { const s = createServer().listen(0, () => { const p = s.address().port; s.close(() => done(p)); }); });
  const server = spawn(process.execPath, ['scripts/preview-web.js', dir, String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((done) => server.stdout.on('data', (d) => { if (String(d).includes('http://')) done(); }));
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const errors = [], network = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => { if (new URL(r.url()).pathname.startsWith('/api/')) network.push(r.url()); });
    const t0 = Date.now();
    await page.goto(`http://localhost:${port}/studio`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('#svg-viewport svg'), null, { timeout: 60000 });
    check(true, `the studio draws its first scene with the engine in the browser (${((Date.now() - t0) / 1000).toFixed(1)} s)`);

    const input = await page.$('textarea, input[type=text]');
    await input.fill('a happy girl waves at a dog under a tree');
    await input.press('Enter');
    await page.waitForFunction(() => window.pictogenStudio.getState().prompt === 'a happy girl waves at a dog under a tree' && document.querySelector('#svg-viewport svg .movable-item'));
    const state = await page.evaluate(() => ({ matches: window.pictogenStudio.getState().result.matches.map((m) => m.id) }));
    check(state.matches.includes('girl') && state.matches.includes('dog') && state.matches.includes('tree'), `a prompt becomes a scene (${state.matches.join(', ')})`);

    // A clip, its HTML export, the dictionary's icons, a video
    const clip = await page.evaluate(async () => {
      const res = await fetch('/api/story/generate', { method: 'POST', body: JSON.stringify({ text: 'a boy waving | Hello!\na dog jumping | A dog.' }) });
      const story = await res.json();
      const html = await (await fetch('/api/story/export-html', { method: 'POST', body: JSON.stringify({ text: 'a boy waving | Hello!' }) })).text();
      const icon = await (await fetch('/api/icon?id=apple&style=flat')).text();
      const ws = await (await fetch('/api/worksheet', { method: 'POST', body: JSON.stringify({ text: 'the parts of a plant', mode: 'diagram' }) })).json();
      return { scenes: story.scenes.length, html: html.length, player: html.includes('function pgSound(') && html.includes('data:font/woff2;base64,'), icon: icon.startsWith('<svg'),
        worksheet: ws.kind === 'label' && ws.pages?.length === 2 && ws.pages[0].includes('data:font/woff2;base64,') };
    });
    check(clip.scenes === 2 && clip.player && clip.icon, `clips, the offline HTML player (fonts and sound inside, ${Math.round(clip.html / 1024)} KB) and icons work`);
    check(clip.worksheet, 'printable worksheets are made in the browser too (a label worksheet and its answer key, fonts inside)');
    const img = await page.evaluate(async () => {
      // As the dictionary grid writes them (the build turns src="/api/..." into data-api-src)
      const box = document.createElement('div');
      box.innerHTML = '<img loading="lazy" data-api-src="/api/icon?id=cat&style=cartoon" />';
      document.body.appendChild(box);
      const i = box.querySelector('img');
      await new Promise((r) => { const t = setInterval(() => { if (i.complete && i.naturalWidth) { clearInterval(t); r(); } }, 50); setTimeout(r, 5000); });
      return i.naturalWidth;
    });
    check(img > 0, 'pictures pointing at /api/ (the dictionary grid) are drawn in the page');
    const video = await page.evaluate(async () => {
      const blob = await window.pictogenVideo.exportGif([{ svg: window.pictogenStudio.getSvgElement(), duration: 0.5 }], { fps: 6 });
      return blob.size;
    });
    check(video > 1000, 'GIF export works');
    check(!network.length, `no request ever goes to a server's /api/${network.length ? ': ' + network.slice(0, 3).join(', ') : ''}`);

    // The welcome page: its pictures drawn live in the browser, "Try it" opening the studio, and
    // old links to the studio (/?text=...) still opening it
    const land = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const landErrors = [];
    land.on('pageerror', (e) => landErrors.push(e.message));
    await land.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
    await land.waitForFunction(() => document.querySelectorAll('#demo-pic svg').length && document.querySelectorAll('#pairs svg').length === 3 && document.querySelectorAll('#styles svg').length === 6, null, { timeout: 60000 });
    const landing = await land.evaluate(() => ({ title: document.querySelector('h1').textContent, try: document.getElementById('try').getAttribute('href') }));
    check(/Type a sentence/.test(landing.title) && landing.try.startsWith('/studio') && !landErrors.length, `the welcome page draws its examples in the browser and "Try it" opens the studio (${landing.try.slice(0, 40)}…)${landErrors.length ? ': ' + landErrors.join('; ') : ''}`);
    await land.goto(`http://localhost:${port}/?text=a%20cat&mode=scene&style=flat`, { waitUntil: 'load' });
    await land.waitForFunction(() => location.pathname === '/studio' || location.pathname === '/studio.html', null, { timeout: 15000 });
    await land.waitForFunction(() => window.pictogenStudio?.getState().prompt === 'a cat', null, { timeout: 60000 });
    check(true, 'an old link to the studio (/?text=a cat) opens the studio with its picture');
    await land.close();

    const show = await browser.newPage();
    const showErrors = [];
    show.on('pageerror', (e) => showErrors.push(e.message));
    await show.goto(`http://localhost:${port}/showcase.html`, { waitUntil: 'load' });
    await show.waitForTimeout(3000);
    const shown = await show.evaluate(() => document.body.innerHTML.includes('<svg'));
    check(shown && !showErrors.length, `the showcase page plays from the engine in the browser${showErrors.length ? ': ' + showErrors.join('; ') : ''}`);
    const voice = await show.evaluate(() => ({ value: document.getElementById('voice-source').value, sub: document.querySelector('.start-subtext').textContent }));
    check(voice.value === 'speech' && !/Zira/.test(voice.sub), `without the recordings, the showcase is narrated by the browser's voice (${voice.value})`);
    check(!errors.length, `no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
  } finally {
    await browser.close();
    server.kill();
  }
}
rmSync(dir, { recursive: true, force: true });

console.log(fails ? `\n${fails} web build check(s) failed` : '\nWeb build test suite: ALL PASSED!');
process.exit(fails ? 1 : 0);
