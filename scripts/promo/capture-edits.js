// Films the real studio for "Edit anything" (edits.js): a character made, a scene drawn, a figure
// clicked and changed, a thing dragged, then - in Clip Studio's scene card - the place, time and
// weather, something added, what happens, words, the camera and the look. Like capture-studio.js,
// frames are taken by seeking every animation, never recorded in real time: every build is the same.
//   segment: { id, steps: [{ ctrl: file, target: {x, y} (0-1, in the control's picture), pic: [files] }],
//              ctrlSize: [w, h], picSize: [w, h], pre: { ctrl, pic } }
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FPS = 15;

export async function captureEdits(chromium, dir, root) {
  mkdirSync(dir, { recursive: true });
  const port = await new Promise((done) => { const s = createServer().listen(0, () => { const p = s.address().port; s.close(() => done(p)); }); });
  const server = spawn(process.execPath, ['serve.js'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((done) => server.stdout.on('data', (d) => { if (String(d).includes('running')) done(); }));
  const browser = await chromium.launch();
  const log = (m) => console.log(`  [studio] ${m}`);
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
    page.on('pageerror', (e) => log(`page error: ${e.message}`));
    await page.goto(`http://localhost:${port}/studio`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { try { localStorage.clear(); } catch { /* */ } });
    await page.reload({ waitUntil: 'networkidle' });

    let n = 0;
    const seek = (t) => page.evaluate(async (t) => {
      document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t * 1000; });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, t);
    const settle = async (ms = 900) => { await page.waitForTimeout(ms); await page.evaluate(() => document.fonts.ready); };
    // (an element's box on screen, scrolled into view first; pad: room around it)
    const clipOf = async (sel, pad = 10) => page.evaluate(([sel, pad]) => {
      const el = typeof sel === 'string' ? document.querySelector(sel) : null;
      if (!el) return null;
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      const r = el.getBoundingClientRect();
      const x = Math.max(0, r.x - pad), y = Math.max(0, r.y - pad);
      return { x: Math.round(x), y: Math.round(y), width: Math.round(Math.min(innerWidth - x, r.width + 2 * pad)), height: Math.round(Math.min(innerHeight - y, r.height + 2 * pad)) };
    }, [sel, pad]);
    const shot = async (clip) => {
      const file = `e${String(n++).padStart(3, '0')}.jpg`;
      await page.screenshot({ path: join(dir, file), clip, type: 'jpeg', quality: 88 });
      return file;
    };
    // (where an element's middle is in a picture of clip, 0-1)
    const at = (clip, sel) => page.evaluate(([c, sel]) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: (r.x + r.width / 2 - c.x) / c.width, y: (r.y + r.height / 2 - c.y) / c.height };
    }, [clip, sel]);
    // (a point that is really on a figure in the picture - its box's middle may be sky - for a click)
    const pointOn = (sel) => page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      // (a walker's box spans its whole walk: look over all of it, the middle rows first)
      let best = null;
      for (let j = 1; j < 16; j++) for (let i = 1; i < 30; i++) {
        const x = r.x + (r.width * i) / 30, y = r.y + (r.height * j) / 16;
        if (document.elementFromPoint(x, y)?.closest('.movable-item') === el) {
          const score = Math.abs(j / 16 - 0.4);
          if (!best || score < best.score) best = { x, y, score };
        }
      }
      return best && { x: best.x, y: best.y };
    }, sel);
    const frames = async (clip, from = 0.4, count = 22) => {
      const out = [];
      for (let k = 0; k < count; k++) { await seek(from + k / FPS); out.push(await shot(clip)); }
      return out;
    };
    const resultChange = async (fn) => {
      await page.evaluate(() => { window.__before = JSON.stringify(window.pictogenStudio.getState().result?.svg?.length ?? 0) + (window.pictogenStudio.getStory?.()?.scenes?.[0]?.svg?.length ?? 0); });
      await fn();
      await page.waitForFunction(() => (JSON.stringify(window.pictogenStudio.getState().result?.svg?.length ?? 0) + (window.pictogenStudio.getStory?.()?.scenes?.[0]?.svg?.length ?? 0)) !== window.__before, null, { timeout: 15000 }).catch(() => log('no redraw seen'));
      await settle(700);
    };
    const segments = [];
    const sizeOf = (c) => (c ? [c.width, c.height] : null);

    // 1. A character of your own
    {
      await page.evaluate(() => document.getElementById('characters-panel').scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.click('#characters-panel [data-do="new"]');
      await settle(600);
      await page.fill('.face-modal .face-name', 'Mia');
      await page.click('.face-modal .char-more summary');
      await settle(400);
      const c = await clipOf('.face-modal .face-card', 6);
      // (and Mia herself, the card's preview, shown big beside it)
      const pv = await page.evaluate(() => { const r = document.querySelector('.face-modal .char-preview').getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }; });
      const seg = { id: 'echar', ctrlSize: sizeOf(c), picSize: sizeOf(pv), steps: [], pre: { ctrl: await shot(c), pic: await shot(pv) } };
      const clicks = ['.face-modal .char-swatch:nth-of-type(4)', '.face-modal .char-chip[data-feature="hair"][data-value="curly"]', '.face-modal .char-chip[data-flag="glasses"]'];
      for (const sel of clicks) {
        const target = await at(c, sel);
        if (!target) { log(`not found: ${sel}`); continue; }
        await page.click(sel);
        await settle(500);
        seg.steps.push({ target, ctrl: await shot(c), pic: [await shot(pv)] });
      }
      const save = await at(c, '.face-modal [data-do="save"]');
      await page.click('.face-modal [data-do="save"]');
      await settle(800);
      seg.steps.push({ target: save, ctrl: seg.steps.at(-1)?.ctrl ?? seg.pre.ctrl });
      segments.push(seg);
    }

    // 2. Type what happens, press Draw
    {
      const text = 'Mia walks in the park with her dog, then waves';
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.fill('#prompt-input', text);
      const c = await clipOf('.prompt-box', 8);
      const preCtrl = await shot(c);
      const p = await clipOf('#svg-viewport', 0);
      const seg = { id: 'edraw', ctrlSize: sizeOf(c), picSize: sizeOf(p), pre: { ctrl: preCtrl, pic: await shot(p) }, steps: [] };
      await clipOf('.prompt-box', 8);
      const target = await at(c, '#btn-generate');
      await resultChange(() => page.click('#btn-generate'));
      // (the page may have scrolled to the picture: the typing bar measured again)
      const c2 = await clipOf('.prompt-box', 8);
      const ctrlAfter = await shot(c2);
      const p2 = await clipOf('#svg-viewport', 0);
      seg.steps.push({ target, ctrl: ctrlAfter, pic: await frames(p2, 0.2, 40) });
      seg.picSize = sizeOf(p2);
      segments.push(seg);
    }

    // 3. Click a figure: bigger, surprised, flipped (the toolbar in the picture)
    {
      const p = await clipOf('#svg-viewport', 0);
      const sel = await page.evaluate(() => { const e = [...document.querySelectorAll('#svg-viewport .movable-item')].find((x) => !/^dog/.test(x.dataset.id)); if (e) e.id ||= 'tour-mia'; return e ? `#${e.id}` : null; });
      const seg = { id: 'efigure', picSize: sizeOf(p), pre: { pic: await shot(p) }, steps: [], picCursor: true };
      const pt = sel && await pointOn(sel);
      if (pt) {
        const target = { x: (pt.x - p.x) / p.width, y: (pt.y - p.y) / p.height };
        await page.mouse.click(pt.x, pt.y);
        await settle(600);
        seg.steps.push({ target, pic: [await shot(p)] });
        for (const s of ['#tb-scale-up', '#tb-scale-up', '#object-toolbar [data-expr="surprised"]', '#tb-flip']) {
          const tg = await at(p, s);
          if (!tg) { log(`not found: ${s}`); continue; }
          await page.click(s);
          await settle(500);
          seg.steps.push({ target: tg, pic: [await shot(p)] });
        }
        await page.click('#tb-done').catch(() => {});
        await settle(400);
      } else log('Mia not found');
      segments.push(seg);
    }

    // 4. Drag a thing to a new place (the dog)
    {
      const p = await clipOf('#svg-viewport', 0);
      const dogSel = await page.evaluate(() => { const e = [...document.querySelectorAll('#svg-viewport .movable-item')].find((x) => /^dog/.test(x.dataset.id)); if (e) e.id ||= 'tour-dog'; return e ? `#${e.id}` : null; });
      const dog = dogSel && await pointOn(dogSel);
      const seg = { id: 'edrag', picSize: sizeOf(p), pre: { pic: await shot(p) }, steps: [], picCursor: true, drag: true };
      if (dog) {
        await page.mouse.move(dog.x, dog.y);
        await page.mouse.down();
        const to = { x: p.x + p.width * 0.22, y: dog.y };
        for (let k = 1; k <= 8; k++) {
          const x = dog.x + ((to.x - dog.x) * k) / 8, y = dog.y + ((to.y - dog.y) * k) / 8 - Math.sin((Math.PI * k) / 8) * 30;
          await page.mouse.move(x, y);
          await page.waitForTimeout(60);
          seg.steps.push({ target: { x: (x - p.x) / p.width, y: (y - p.y) / p.height }, pic: [await shot(p)] });
        }
        await page.mouse.up();
        await settle(400);
      } else log('dog not found');
      segments.push(seg);
    }

    // 5-10. Clip Studio: the scene card
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.click('#modes-group .pill-btn[data-mode="story"]');
    await settle(500);
    await page.fill('#story-text', 'Mia walks in the park with her dog, then waves.');
    await resultChange(() => page.click('#btn-generate'));
    await page.waitForSelector('#story-review .sc-card', { timeout: 20000 });
    await settle(800);
    const cardStep = async (id, actions) => {
      const c = await clipOf('#story-review .sc-card', 8);
      const p = await clipOf('#svg-viewport', 0);
      await page.evaluate(() => document.querySelector('#story-review .sc-card').scrollIntoView({ block: 'center', behavior: 'instant' }));
      const c0 = await clipOf('#story-review .sc-card', 8);
      const seg = { id, ctrlSize: sizeOf(c0), picSize: sizeOf(p), steps: [] };
      seg.pre = { ctrl: await shot(c0) };
      await page.evaluate(() => document.getElementById('svg-viewport').scrollIntoView({ block: 'center', behavior: 'instant' }));
      const p0 = await clipOf('#svg-viewport', 0);
      seg.pre.pic = await shot(p0);
      for (const a of actions) {
        await page.evaluate(() => document.querySelector('#story-review .sc-card').scrollIntoView({ block: 'center', behavior: 'instant' }));
        const cc = await clipOf('#story-review .sc-card', 8);
        const target = await at(cc, a.sel);
        if (!target) { log(`not found: ${a.sel}`); continue; }
        const ctrlBefore = a.showOpen ? null : undefined;
        await resultChange(a.run);
        await page.evaluate(() => document.querySelector('#story-review .sc-card').scrollIntoView({ block: 'center', behavior: 'instant' }));
        const cc2 = await clipOf('#story-review .sc-card', 8);
        const ctrl = await shot(cc2);
        await page.evaluate(() => document.getElementById('svg-viewport').scrollIntoView({ block: 'center', behavior: 'instant' }));
        const pp = await clipOf('#svg-viewport', 0);
        seg.steps.push({ target, ctrl, ctrlSize: sizeOf(cc2), pic: await frames(pp, a.from ?? 0.6, a.frames ?? 14) });
        void ctrlBefore;
      }
      seg.picSize = sizeOf(p0);
      segments.push(seg);
    };
    const pickIn = (sel, values) => async () => {
      const opts = await page.$$eval(`${sel} option`, (o) => o.map((x) => x.value));
      const v = values.find((x) => opts.includes(x)) ?? opts[1];
      await page.selectOption(sel, v);
    };
    await cardStep('eplace', [
      { sel: '#story-review select[data-kind="place"]', run: pickIn('#story-review select[data-kind="place"]', ['beach']) },
      { sel: '#story-review select[data-kind="weather"]', run: pickIn('#story-review select[data-kind="weather"]', ['rain', 'snow']) },
      { sel: '#story-review select[data-kind="time"]', run: pickIn('#story-review select[data-kind="time"]', ['night', 'evening']) },
    ]);
    await cardStep('eadd', [{
      sel: '#story-review .sc-add[data-add-kind="object"]',
      run: async () => {
        await page.click('#story-review .sc-add[data-add-kind="object"]');
        await settle(300);
        await page.fill('#story-review .sc-new', 'a kite');
        await page.click('#story-review [data-add-ok]');
      },
    }]);
    await cardStep('esteps', [{
      sel: '#story-review [data-edit="0"]',
      run: async () => {
        await page.click('#story-review [data-edit="0"]');
        await settle(300);
        const sels = await page.$$('#story-review select[data-field="does"]');
        const last = sels.at(-1);
        if (last) await last.selectOption('pose:dance');
        await page.click('#story-review [data-apply]');
      },
    }]);
    await cardStep('ewords', [{
      sel: '#story-review [data-say="0"]',
      run: async () => {
        await page.click('#story-review [data-say="0"]');
        await settle(300);
        await page.click('#story-review [data-newline]');
        await settle(200);
        const lines = await page.$$('#story-review .sc-line');
        await lines.at(-1)?.fill('Look, a kite!');
        await page.click('#story-review [data-sayok]');
      },
      from: 2.6, frames: 16,
    }]);
    await cardStep('ecamera', [{ sel: '#story-review .sc-shot', run: pickIn('#story-review .sc-shot', ['push']), from: 0.2, frames: 26 }]);
    await cardStep('elook', [
      { sel: '#story-review .sc-look', run: pickIn('#story-review .sc-look', ['watercolor']) },
      { sel: '#story-review .sc-look', run: pickIn('#story-review .sc-look', ['sketch']) },
    ]);
    writeFileSync(join(dir, 'edits.json'), JSON.stringify({ fps: FPS, segments }, null, 1));
    return { fps: FPS, segments };
  } finally {
    await browser.close();
    server.kill();
  }
}
