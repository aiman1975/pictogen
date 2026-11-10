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
    const help = await land.goto(`http://localhost:${port}/help`, { waitUntil: 'load' });
    check(help.ok() && (await land.evaluate(() => document.querySelectorAll('main h2').length)) >= 15, 'the "How to use" page is there (/help), linked from the welcome page');
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
    // The installable app: a manifest with its icons, and the offline worker keeps every file, so the
    // studio opens and draws with no network at all
    const manifest = JSON.parse(readFileSync(join(dir, 'manifest.webmanifest'), 'utf8'));
    const sw = readFileSync(join(dir, 'sw.js'), 'utf8');
    check(manifest.start_url === '/studio' && manifest.display === 'standalone' && manifest.icons.every((i) => existsSync(join(dir, i.src)))
      && /<link rel="manifest"/.test(readFileSync(join(dir, 'help.html'), 'utf8')) && /"\/studio.html"/.test(sw) && /"\/src\/data\/fluent-emoji-flat.json"/.test(sw),
      'installable: a manifest with its icons on every page, and an offline worker that keeps every file');
    const ctx = await browser.newContext();
    const app = await ctx.newPage();
    await app.goto(`http://localhost:${port}/studio`, { waitUntil: 'load' });
    await app.evaluate(() => navigator.serviceWorker.ready);
    await app.waitForFunction(async () => {
      const keys = await caches.keys();
      return keys.length === 1 && (await (await caches.open(keys[0])).keys()).length >= 100;
    }, null, { timeout: 60000 });
    check((await app.locator('[data-install]').count()) > 0, 'the studio has an "Install app" button (shown where the browser can install it)');
    await ctx.setOffline(true);
    await app.goto(`http://localhost:${port}/studio?text=a+girl+hugs+her+grandma`, { waitUntil: 'load' });
    await app.waitForFunction(() => document.querySelectorAll('#svg-viewport svg .movable-item').length >= 2, null, { timeout: 60000 });
    const offlineHelp = await app.goto(`http://localhost:${port}/help`, { waitUntil: 'load' });
    check(offlineHelp.ok(), 'offline (no network at all), the studio still opens and draws, and the help page opens');
    await ctx.close();
    check(!errors.length, `no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
  } finally {
    await browser.close();
    server.kill();
  }
}
rmSync(dir, { recursive: true, force: true });

// The public demo (--demo, for toonaro.com): a few tries, every picture marked, then the way to the full version
const demoDir = mkdtempSync(join(tmpdir(), 'toonaro-demo-'));
execSync(`node scripts/build-web.js "${demoDir}" --demo`, { cwd: root, stdio: 'pipe' });
const demoStudio = readFileSync(join(demoDir, 'studio.html'), 'utf8');
check(/__toonaroDemo/.test(demoStudio) && existsSync(join(demoDir, 'web', 'demo.js')) && !/noindex/.test(demoStudio) && /Allow: \//.test(readFileSync(join(demoDir, 'robots.txt'), 'utf8')), 'the demo build: the demo script in the pages, open to search engines');
check(!existsSync(join(demoDir, 'sw.js')) && !/manifest\.webmanifest/.test(demoStudio) && /RewriteRule/.test(readFileSync(join(demoDir, '.htaccess'), 'utf8')) && /impressum/.test(readFileSync(join(demoDir, 'index.html'), 'utf8')), 'the demo is a website, not an app to install; an .htaccess for Apache hosts; the legal pages linked');
if (chromium) {
  const port = await new Promise((done) => { const s = createServer().listen(0, () => { const p = s.address().port; s.close(() => done(p)); }); });
  const server = spawn(process.execPath, ['scripts/preview-web.js', demoDir, String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((done) => server.stdout.on('data', (d) => { if (String(d).includes('http://')) done(); }));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://localhost:${port}/studio`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#svg-viewport svg .tn-demo-mark', { timeout: 60000 });
    // (a story longer than the demo takes is stopped, without using a try)
    await page.click('#modes-group .pill-btn[data-mode="story"]');
    await page.fill('#story-text', 'Mia found a puppy. '.repeat(20));
    await page.click('#btn-generate');
    await page.waitForTimeout(500);
    const long = await page.evaluate(() => ({ msg: !!document.querySelector('.tn-demo-long'), left: document.querySelector('.tn-demo-left')?.textContent, max: document.getElementById('prompt-input').maxLength }));
    check(long.msg && long.max === 120, `the demo keeps texts short: a long story is stopped with a note, a picture's line takes 120 characters (${JSON.stringify(long)})`);
    await page.click('#modes-group .pill-btn[data-mode="scene"]');
    const tries = [];
    for (const words of ['a cat on a sofa', 'a red car', 'a dragon over a castle', 'a boy reads a book', 'a girl with a kite']) {
      await page.fill('#prompt-input', words);
      await page.click('#btn-generate');
      await page.waitForTimeout(1500);
      tries.push(await page.evaluate((w) => ({ marked: !!document.querySelector('#svg-viewport svg .tn-demo-mark'), drawn: window.pictogenStudio.getState().prompt === w, end: !!document.querySelector('.tn-demo-end'), note: document.querySelector('.tn-demo-left')?.textContent ?? '' }), words));
    }
    check(tries.every((t) => t.marked && t.drawn && !t.end) && /Full version|full version/.test(tries[0].note) && /info@toonaro\.com/.test(tries[0].note), `the demo: as often as they like, every picture marked, a note on the full version (${JSON.stringify(tries.map((t) => [t.marked, t.drawn, t.end]))})`);
    // (words Toonaro does not know: listed under the picture, with an e-mail to send them - if the visitor wants)
    const tell = await page.evaluate(() => document.querySelector('.tn-demo-missing'));
    check(!tell, 'no "tell us" row when every word was drawn');
    await page.fill('#prompt-input', 'a girl flies a zeppelin');
    await page.click('#btn-generate');
    await page.waitForTimeout(1500);
    const miss = await page.evaluate(() => ({ text: document.querySelector('.tn-demo-missing')?.textContent ?? '', href: document.querySelector('.tn-demo-tell')?.href ?? '' }));
    check(/zeppelin/.test(miss.text) && /^mailto:info@toonaro\.com\?subject=/.test(miss.href) && /zeppelin/.test(decodeURIComponent(miss.href)), `a word Toonaro doesn't know is listed, with an e-mail to tell us (${JSON.stringify(miss)})`);
    await page.fill('#prompt-input', '');
    await page.type('#prompt-input', 'Every night, the old lighthouse blinked across an empty sea. One evening, a small boat answered with a golden light. The end of it');
    const full = await page.evaluate(() => ({ len: document.getElementById('prompt-input').value.length, hint: document.querySelector('.tn-demo-long')?.textContent ?? '' }));
    check(full.len === 120 && /Clip/.test(full.hint), `a full picture line says a whole story goes in a clip (${JSON.stringify(full)})`);
    // (the mute button on the picture: one click and the sound is off, remembered)
    const before = await page.evaluate(() => window.pictogenSound?.isEnabled());
    await page.click('#btn-mute');
    const muted = await page.evaluate(() => ({ on: window.pictogenSound?.isEnabled(), icon: document.getElementById('btn-mute').textContent, pressed: document.getElementById('btn-mute').getAttribute('aria-pressed'), kept: localStorage.getItem('pictogen.sound.v1') }));
    await page.click('#btn-mute');
    const back = await page.evaluate(() => window.pictogenSound?.isEnabled());
    check(before === true && muted.on === false && muted.icon === '🔇' && muted.pressed === 'true' && muted.kept === 'off' && back === true, `the mute button on the picture turns the sound off and on (${JSON.stringify({ before, muted, back })})`);
    check(!errors.length, `no page errors in the demo${errors.length ? ': ' + errors.join('; ') : ''}`);
  } finally {
    await browser.close();
    server.kill();
  }
}
rmSync(demoDir, { recursive: true, force: true });

console.log(fails ? `\n${fails} web build check(s) failed` : '\nWeb build test suite: ALL PASSED!');
process.exit(fails ? 1 : 0);
