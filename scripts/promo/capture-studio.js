// Films the real studio for the promo: a scene playing, a step being changed in the timeline view,
// the redrawn clip, and the scene saved into "Your clip". Frames are taken by seeking every
// animation (no real-time recording), so every build gives the same pictures.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const FPS = 15;

export async function captureStudio(chromium, dir, root) {
  mkdirSync(dir, { recursive: true });
  const port = await new Promise((done) => { const s = createServer().listen(0, () => { const p = s.address().port; s.close(() => done(p)); }); });
  const server = spawn(process.execPath, ['serve.js'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((done) => server.stdout.on('data', (d) => { if (String(d).includes('running')) done(); }));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1250 }, deviceScaleFactor: 1.5 });
    await page.goto(`http://localhost:${port}/studio`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { try { localStorage.clear(); } catch { /* */ } });
    const prompt = 'a boy walks in, then waves, then a dog runs to him';
    await page.fill('#prompt-input', prompt);
    await page.press('#prompt-input', 'Enter');
    await page.waitForFunction((p) => window.pictogenStudio.getState().result?.beats && window.pictogenStudio.getState().prompt === p, prompt);
    await page.waitForTimeout(400);

    // The canvas card: scene, timeline view and clip tray
    const crop = await page.evaluate(() => {
      let el = document.getElementById('svg-viewport');
      const w = el.getBoundingClientRect().width;
      while (el.parentElement && el.parentElement.getBoundingClientRect().width < w + 60) el = el.parentElement;
      const r = el.getBoundingClientRect();
      // (taller than the card: room for the row "Add this scene" puts in the clip tray at the end)
      return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) + 56 };
    });
    const seek = async (t) => {
      await page.evaluate(async (t) => {
        document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t * 1000; });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }, t);
    };
    const box = (sel) => page.evaluate(([sel, c]) => {
      const r = document.querySelector(sel).getBoundingClientRect();
      return { x: (r.x + r.width / 2 - c.x) / c.width, y: (r.y + r.height / 2 - c.y) / c.height, w: r.width / c.width, h: r.height / c.height };
    }, [sel, crop]);
    let n = 0;
    const shot = async () => {
      const file = `s${String(n++).padStart(3, '0')}.jpg`;
      await page.screenshot({ path: join(dir, file), clip: crop, type: 'jpeg', quality: 88 });
      return file;
    };

    // A: the scene plays, the boy waving
    const A = [];
    for (let k = 0; k < 40; k++) { await seek(1.6 + k / FPS); A.push(await shot()); }
    const step = await box('.tl-block[data-actor="boy"][data-beat="1"]');
    // B: the step editor opens
    await page.click('.tl-block[data-actor="boy"][data-beat="1"]');
    await seek(4.2);
    const B = await shot();
    const does = await box('#tl-editor select[data-field="does"]');
    // C: "waves" becomes "jumps", the clip redraws
    await page.evaluate(() => { window.__before = window.pictogenStudio.getState().result; });
    await page.selectOption('#tl-editor select[data-field="does"]', 'pose:jump');
    await page.waitForFunction(() => window.pictogenStudio.getState().result !== window.__before);
    await page.waitForTimeout(300);
    const C = [];
    for (let k = 0; k < 45; k++) { await seek(2.0 + k / FPS); C.push(await shot()); }
    const jumps = await box('.tl-block[data-actor="boy"][data-beat="1"]');
    const add = await box('#clip-tray [data-do="add"]');
    // D: saved into the clip
    await page.click('#clip-tray [data-do="add"]');
    await page.waitForTimeout(200);
    await seek(3.4);
    const D = await shot();
    return { fps: FPS, width: crop.width, height: crop.height, frames: { A, B, C, D }, boxes: { step, does, jumps, add } };
  } finally {
    await browser.close();
    server.kill();
  }
}
