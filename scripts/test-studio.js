// Studio editing in a real browser (skipped without Playwright): expression changes reach every pose
// of a timeline actor, redrawn figures keep their colour and look, timeline actors keep their
// motions, dragging follows the pointer exactly - also inside a zoomed camera - and the timeline
// view edits, reorders and scrubs the steps.
import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓ PASS' : '✗ FAIL'}: ${msg}`); if (!ok) fails++; };

let chromium = null;
try {
  const req = createRequire(import.meta.url);
  try { ({ chromium } = req('playwright')); } catch { ({ chromium } = req(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright'))); }
} catch { /* not installed */ }
if (!chromium) {
  console.log('- SKIP: studio checks (Playwright is not installed)');
  process.exit(0);
}

const root = fileURLToPath(new URL('..', import.meta.url));
const port = await new Promise((done) => { const s = createServer().listen(0, () => { const p = s.address().port; s.close(() => done(p)); }); });
const server = spawn(process.execPath, ['serve.js'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((done) => server.stdout.on('data', (d) => { if (String(d).includes('running')) done(); }));

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });

  const draw = async (prompt) => {
    const input = await page.$('textarea, input[type=text]');
    await input.fill(prompt);
    await input.press('Enter');
    await page.waitForFunction((p) => window.pictogenStudio.getState().prompt === p && document.querySelector('#svg-viewport svg .movable-item'), prompt);
    await page.waitForTimeout(300);
  };
  // Select a figure the way a click does (pointerdown on it), then let go
  const select = (sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerId: 1 }));
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
  }, sel);
  const clickExpression = async (expr) => {
    await page.evaluate((e) => document.querySelector(`.tb-expr-btn[data-expr="${e}"]`).click(), expr);
    await page.waitForTimeout(600);
  };

  // 1. A timeline actor: every pose gets the new expression (sad -> a teardrop in each drawing)
  await draw('a boy walks in, then waves, then a dog runs to him');
  await select('.movable-item[data-actor="boy"]');
  await clickExpression('sad');
  const poses = await page.evaluate(() => [...document.querySelectorAll('.movable-item[data-actor="boy"] .pg-timeline-pose')].map((p) => ({
    anim: p.dataset.anim || null, view: p.dataset.view || null, sad: p.querySelector('.pg-figure').innerHTML.includes('#4fc3f7'),
    walking: !!p.querySelector('.pg-anim-walk'), waving: !!p.querySelector('.pg-anim-wave'),
  })));
  check(poses.length >= 3 && poses.every((p) => p.sad), `all ${poses.length} poses of the boy turn sad (${poses.map((p) => `${p.anim || 'stand'}/${p.view}:${p.sad ? 'sad' : 'unchanged'}`).join(', ')})`);
  check(poses.some((p) => p.walking) && poses.some((p) => p.waving), 'the poses keep their motions (walking, waving)');
  const before = await page.evaluate(() => document.querySelector('.movable-item[data-actor="boy"]').innerHTML);
  await page.evaluate(() => document.querySelector('.tb-anim-btn[data-anim="jump"]').click());
  await page.waitForTimeout(600); // a motion change redraws asynchronously
  const kept = await page.evaluate(() => document.querySelector('.movable-item[data-actor="boy"]'));
  const after = await page.evaluate(() => document.querySelector('.movable-item[data-actor="boy"]').innerHTML);
  check(kept && before === after, 'a timeline actor keeps its timeline when a motion button is pressed');

  // 2. Redrawn figures keep their colour and look: the second boy (varied clothes) and a recoloured cat
  await draw('two boys and a blue cat');
  const shirtFill = (sel) => page.evaluate((s) => {
    const shirt = document.querySelector(`${s} .pg-figure path[d^="M36 50"]`);
    return shirt && (shirt.getAttribute('fill') || getComputedStyle(shirt).fill);
  }, sel);
  const catFills = () => page.evaluate(() => [...new Set([...document.querySelectorAll('.movable-item[data-id="cat"] .pg-figure [fill]')].map((e) => e.getAttribute('fill')))].sort().join());
  const shirt1 = await shirtFill('.movable-item[data-id="boy"][data-k="1"]');
  await select('.movable-item[data-id="boy"][data-k="1"]');
  await clickExpression('laugh');
  check(shirt1 && (await shirtFill('.movable-item[data-id="boy"][data-k="1"]')) === shirt1, `the second boy keeps his shirt colour after an expression change (${shirt1})`);
  const catBefore = await catFills();
  await select('.movable-item[data-id="cat"]');
  await page.evaluate(() => document.querySelector('.tb-anim-btn[data-anim="jump"], .tb-anim-btn').click());
  await page.waitForTimeout(600);
  check((await catFills()) === catBefore, 'the blue cat stays blue when its motion changes');

  // 3. Dragging moves a figure exactly as far as the pointer: plain, and inside a zoomed camera
  const dragBy = async (sel, dx) => {
    await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
    const box = await page.evaluate((s) => { const r = document.querySelector(`${s} .pg-figure`).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);
    await page.mouse.move(box.x, box.y);
    await page.mouse.down();
    await page.mouse.move(box.x + dx / 2, box.y, { steps: 3 });
    await page.mouse.move(box.x + dx, box.y, { steps: 3 });
    await page.mouse.up();
    const after = await page.evaluate((s) => { const r = document.querySelector(`${s} .pg-figure`).getBoundingClientRect(); return r.x + r.width / 2; }, sel);
    return after - box.x;
  };
  await draw('a boy waving under a tree');
  const plain = await dragBy('.movable-item[data-id="boy"]', 100);
  check(Math.abs(plain - 100) < 3, `plain drag: the boy moves with the pointer (${plain.toFixed(1)}px for 100px)`);

  await draw('a boy waving under a tree, zoom in on the boy');
  // Hold the camera at its close-up, then drag
  await page.evaluate(() => {
    const cam = document.querySelector('.pg-camera');
    const anim = cam.getAnimations()[0];
    const keys = anim.effect.getKeyframes();
    const peak = keys.reduce((a, b) => (parseFloat((b.transform.match(/scale\(([\d.]+)/) || [0, 1])[1]) > parseFloat((a.transform.match(/scale\(([\d.]+)/) || [0, 1])[1]) ? b : a));
    document.getAnimations().forEach((a) => a.pause());
    anim.currentTime = peak.computedOffset * anim.effect.getComputedTiming().duration;
  });
  const zoom = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.pg-camera')).transform).a);
  const zoomed = await dragBy('.movable-item[data-id="boy"]', 100);
  check(zoom > 1.3 && Math.abs(zoomed - 100) < 3, `zoomed in ${zoom.toFixed(2)}x: the boy still moves exactly with the pointer (${zoomed.toFixed(1)}px for 100px)`);

  // 4. Timeline view: lanes per figure, editing a step redraws the clip, steps reorder, edits can be
  // dropped, a still scene gets its first step, and the ruler scrubs
  const rerender = async (job) => {
    await page.evaluate(() => { window.__before = window.pictogenStudio.getState().result; });
    await job();
    await page.waitForFunction(() => window.pictogenStudio.getState().result !== window.__before);
    await page.waitForTimeout(200);
  };
  const tl = () => page.evaluate(() => ({
    hidden: document.getElementById('timeline-panel').hidden,
    lanes: [...document.querySelectorAll('#timeline-panel .tl-label')].map((l) => l.textContent.trim()).filter(Boolean),
    steps: document.querySelectorAll('#timeline-panel [data-step]').length,
    edited: !!document.querySelector('#timeline-panel .tl-edited'),
    beats: window.pictogenTimeline.getBeats().map((b) => b.actions.map((a) => `${a.actor}:${a.type}${a.anim ? '/' + a.anim : ''}`).join('+')).join(' | '),
  }));
  await draw('a boy walks in, then waves, then a dog runs to him');
  let view = await tl();
  check(!view.hidden && view.steps === 3 && view.lanes.join() === 'Steps,boy,dog', `the timeline shows 3 steps and a lane per figure (${view.lanes.join(', ')})`);
  await page.click('.tl-block[data-actor="boy"][data-beat="1"]');
  await rerender(() => page.selectOption('#tl-editor select[data-field="does"]', 'pose:jump'));
  view = await tl();
  const boyAnims = await page.evaluate(() => [...document.querySelectorAll('.movable-item[data-actor="boy"] .pg-timeline-pose')].map((p) => p.dataset.anim).filter(Boolean));
  check(view.edited && view.beats === 'boy:enter | boy:pose/jump | dog:moveTo' && boyAnims.includes('jump') && !boyAnims.includes('wave'), `changing "waves" to "jumps" redraws the clip (${boyAnims.join(', ')})`);
  await page.click('.tl-block[data-step="2"]');
  await rerender(() => page.click('#tl-editor [data-do="earlier"]'));
  view = await tl();
  check(view.beats === 'boy:enter | dog:moveTo | boy:pose/jump', `a step moves earlier (${view.beats})`);
  await rerender(() => page.click('#timeline-panel [data-do="revert"]'));
  view = await tl();
  check(!view.edited && view.beats === 'boy:enter | boy:pose/wave | dog:moveTo', 'edits can be dropped for the prompt\'s own steps');

  await draw('a boy and a dog in the park');
  view = await tl();
  check(!view.hidden && view.steps === 0, 'a still scene shows an empty timeline');
  await rerender(() => page.click('#timeline-panel [data-do="add-step"]'));
  view = await tl();
  const moving = await page.evaluate(() => document.querySelectorAll('.pg-timeline-pose').length);
  check(view.steps === 1 && view.beats === 'boy:pose/wave' && moving > 0, `"＋ Step" brings a still scene to life (${view.beats})`);
  await rerender(() => page.click('#tl-editor [data-do="close"]').then(() => page.click('.tl-block[data-step="0"]')).then(() => page.click('#tl-editor [data-do="add-action"]')));
  view = await tl();
  check(view.beats === 'boy:pose/wave+dog:pose/jump', `another figure can act in the same step (${view.beats})`);

  // Step lengths: typed in the step editor, dragged at a step's edge; undo and redo
  await draw('a boy walks in, then waves, then a dog runs to him');
  const times = () => page.evaluate(() => window.pictogenStudio.getState().result.beats.map((b) => +(b.t1 - b.t0).toFixed(2)));
  const before3 = await times();
  await page.click('.tl-block[data-step="1"]');
  await rerender(async () => { await page.fill('#tl-editor input[data-field="duration"]', '4'); await page.press('#tl-editor input[data-field="duration"]', 'Enter'); });
  const typed = await times();
  check(typed[1] === 4 && typed[0] === before3[0], `typing a length makes "waves" last 4s (${before3[1]}s before)`);
  await page.click('.tl-block[data-step="1"]');
  await page.locator('#tl-editor input[data-field="duration"]').dispatchEvent('change'); // the same length again
  check((await page.evaluate(() => window.pictogenTimeline.getHistory().undo)) === 1, 'an edit that changes nothing adds no undo step');
  const grip = await page.$('.tl-grip[data-grip="0"]');
  const gb = await grip.boundingBox();
  const laneW = await page.evaluate(() => document.querySelector('.tl-grip').parentElement.getBoundingClientRect().width);
  const T0 = await page.evaluate(() => window.pictogenStudio.getState().result.duration);
  await rerender(async () => {
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
    await page.mouse.down();
    await page.mouse.move(gb.x + gb.width / 2 + laneW / T0, gb.y + gb.height / 2, { steps: 4 });
    await page.mouse.up();
  });
  const dragged = await times();
  check(Math.abs(dragged[0] - (before3[0] + 1)) < 0.15 && dragged[1] === 4, `dragging step 1's edge one second right lengthens it (${before3[0]}s -> ${dragged[0]}s)`);
  await rerender(() => page.click('#timeline-panel [data-do="undo"]'));
  check((await times())[0] === before3[0] && (await times())[1] === 4, 'undo takes back the drag');
  await rerender(() => page.keyboard.press('Control+z'));
  view = await tl();
  check(!view.edited && (await times()).join() === before3.join(), 'Ctrl+Z takes back the typed length too: the prompt\'s own steps again');
  await rerender(() => page.keyboard.press('Control+Shift+z'));
  check((await times())[1] === 4, 'redo brings the length back');
  await draw('a boy walks in, then waves for 3 seconds, then a dog runs to him');
  const fixedChip = await page.evaluate(() => document.querySelector('.tl-block[data-step="1"]').textContent);
  check(fixedChip.includes('⏱') && (await times())[1] === 3, `"waves for 3 seconds" shows a 3s step with a set length (${fixedChip})`);

  const ruler = await page.$('#tl-ruler');
  const rb = await ruler.boundingBox();
  await page.mouse.click(rb.x + rb.width / 2, rb.y + rb.height / 2);
  const scrub = await page.evaluate(() => {
    const anims = document.querySelector('#svg-viewport svg').getAnimations({ subtree: true });
    const T = window.pictogenStudio.getState().result.duration * 1000;
    return { paused: anims.length > 0 && anims.every((a) => a.playState === 'paused'), at: anims[0]?.currentTime / T };
  });
  check(scrub.paused && Math.abs(scrub.at - 0.5) < 0.03, `clicking the ruler pauses the clip at that moment (${(scrub.at * 100).toFixed(1)}%)`);

  // 5. Your clip: scenes saved with their edits and captions, reordered, played in Clip Studio, kept
  // across a reload
  const tray = () => page.evaluate(() => [...document.querySelectorAll('#clip-tray .clip-row')].map((r) => r.querySelector('.clip-prompt').textContent.trim()));
  await draw('a boy walks in, then waves, then a dog runs to him');
  await page.click('.tl-block[data-actor="boy"][data-beat="1"]');
  await rerender(() => page.selectOption('#tl-editor select[data-field="does"]', 'pose:jump'));
  await page.click('#clip-tray [data-do="add"]');
  await draw('a cat sleeping under a tree');
  await page.click('#clip-tray [data-do="add"]');
  let rows = await tray();
  check(rows.length === 2 && rows[0].includes('✎ edited') && !rows[1].includes('edited'), `two scenes saved, the edited one marked (${rows.join(' / ')})`);
  await page.fill('#clip-tray .clip-caption[data-i="1"]', 'The cat naps.');
  await page.click('#clip-tray [data-up="1"]');
  rows = await tray();
  check(rows[0].startsWith('a cat sleeping') && (await page.inputValue('#clip-tray .clip-caption[data-i="0"]')) === 'The cat naps.', 'a scene moves earlier with its caption');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.pictogenClip);
  check((await tray()).length === 2, 'the clip is still there after a reload');
  await page.click('#clip-tray [data-do="play"]');
  await page.waitForFunction(() => window.pictogenStudio.getStory().scenes?.length && window.pictogenStudio.getState().mode === 'story');
  const clip = await page.evaluate(() => window.pictogenStudio.getStory().scenes.map((sc) => ({ caption: sc.caption, jump: sc.svg.includes('data-anim="jump"'), wave: sc.svg.includes('data-anim="wave"') })));
  check(clip.length === 2 && clip[0].caption === 'The cat naps.' && clip[1].jump && !clip[1].wave, `"Play clip" plays the saved scenes in order, with captions and timeline edits (${JSON.stringify(clip)})`);

  // 6. Your characters: a face photo, cropped to the head's oval, on the figure named in a prompt;
  // the name and the photo never reach the server
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
  const sent = [];
  page.on('request', (r) => { if (r.method() === 'POST') sent.push(r.postData() || ''); });
  const photoPage = await browser.newPage({ viewport: { width: 400, height: 500 } });
  await photoPage.setContent(`<canvas id=c width=400 height=500></canvas><script>
    const c = document.getElementById('c').getContext('2d'); c.fillStyle = '#cfe0f0'; c.fillRect(0, 0, 400, 500);
    c.fillStyle = '#e8b48a'; c.beginPath(); c.ellipse(200, 230, 95, 120, 0, 0, 7); c.fill();
    c.fillStyle = '#222'; c.beginPath(); c.arc(165, 210, 9, 0, 7); c.arc(235, 210, 9, 0, 7); c.fill();</script>`);
  const photo = await (await photoPage.$('#c')).screenshot({ type: 'png' });
  await photoPage.close();
  await page.click('#characters-panel [data-do="add"]');
  await page.setInputFiles('#characters-panel input[type=file]', { name: 'face.png', mimeType: 'image/png', buffer: photo });
  await page.waitForSelector('.face-modal');
  const guide = await page.evaluate(() => [...document.querySelectorAll('.face-stage svg text')].map((t) => t.textContent).join(','));
  check(guide === 'eyes,mouth,chin', `the crop shows the face oval with its eye line, mouth line and chin mark (${guide})`);
  await page.click('.face-modal [data-do="save"]');
  check(/name/i.test(await page.textContent('.face-error')), 'a character needs a name');
  await page.fill('.face-name', 'Tom');
  await page.selectOption('.face-base', 'boy');
  await page.click('.face-modal [data-do="save"]');
  await page.waitForSelector('.face-modal', { state: 'detached' });
  check((await page.textContent('#characters-panel')).includes('Tom'), 'Tom is listed under "Your characters"');
  await draw('Tom walks in, then waves');
  const tom = await page.evaluate(() => {
    const item = document.querySelector('#svg-viewport .movable-item[data-character="Tom"]');
    const heads = item ? [...item.querySelectorAll('[data-face]')] : [];
    return {
      id: item?.dataset.id, photos: heads.filter((h) => h.querySelector('.pg-photo-face image')).length, heads: heads.length,
      eyesHidden: heads.every((h) => [...h.querySelectorAll('.pg-face-eyes')].every((e) => e.getAttribute('display') === 'none')),
      matches: window.pictogenStudio.getState().result.matches.map((m) => m.id).join(),
    };
  });
  check(tom.id === 'boy' && tom.heads >= 2 && tom.photos === tom.heads && tom.eyesHidden && tom.matches === 'boy~pgc1',
    `"Tom walks in, then waves": the boy wears Tom's photo in all ${tom.heads} poses, drawn eyes hidden`);
  check(sent.length > 0 && sent.every((body) => !body.includes('Tom') && !body.includes('data:image')), 'the server only saw a neutral key for a boy: no name, no photo');
  // A second boy: Tom and Max each act and wear their own face
  await page.click('#characters-panel [data-do="add"]');
  await page.setInputFiles('#characters-panel input[type=file]', { name: 'face.png', mimeType: 'image/png', buffer: photo });
  await page.waitForSelector('.face-modal');
  await page.fill('.face-name', 'Max');
  await page.selectOption('.face-base', 'boy');
  await page.click('.face-modal [data-do="save"]');
  await page.waitForSelector('.face-modal', { state: 'detached' });
  await draw('Tom walks in, then Max runs to him, then Tom waves at Max');
  const two = await page.evaluate(() => {
    const items = [...document.querySelectorAll('#svg-viewport .movable-item[data-id="boy"]')];
    return {
      who: items.map((i) => i.dataset.character).sort().join(),
      photos: items.map((i) => i.querySelectorAll('.pg-photo-face').length > 0),
      tomWaves: !!document.querySelector('#svg-viewport [data-character="Tom"] [data-anim="wave"]'),
      maxWaves: !!document.querySelector('#svg-viewport [data-character="Max"] [data-anim="wave"]'),
      lanes: [...document.querySelectorAll('#timeline-panel .tl-label')].map((l) => l.textContent.trim()).filter(Boolean).join(),
    };
  });
  check(two.who === 'Max,Tom' && two.photos.every(Boolean) && two.tomWaves && !two.maxWaves && two.lanes === 'Steps,Tom,Max',
    `two boys, Tom and Max: each wears his own face, only Tom waves, the timeline names them (${JSON.stringify(two)})`);
  await page.click('#characters-panel [data-remove="1"]');
  // The jaw: cut at the mouth line, it drops to talk (and laughs, and hangs open in surprise)
  const jaw = () => page.evaluate(() => [...document.querySelectorAll('#svg-viewport [data-character="Tom"] .pg-photo-face')].map((f) => {
    const j = getComputedStyle(f.querySelector('.pg-photo-jaw')), m = getComputedStyle(f.querySelector('.pg-photo-mouth'));
    return `${f.dataset.mood}:${j.animationName}/${m.animationName}:${new DOMMatrix(j.transform).f > 0.5 ? 'open' : 'shut'}`;
  }).join(' '));
  await draw('Tom talks under a tree');
  check(/^\w+:pgJawTalk\/pgMouthTalk/.test(await jaw()), `a talking photo face moves its jaw (${await jaw()})`);
  await draw('Tom waves under a tree');
  check(/:none\/none:shut$/.test(await jaw()), `not talking, the jaw stays shut (${await jaw()})`);
  await draw('a laughing Tom under a tree');
  check(/^laugh:pgJawLaugh\/pgMouthLaugh/.test(await jaw()), `laughing, the jaw bounces (${await jaw()})`);
  await draw('a surprised Tom under a tree');
  check(/^surprised:none\/none:open$/.test(await jaw()), `surprised, the mouth hangs open (${await jaw()})`);
  await draw('a boy walks in');
  check((await page.evaluate(() => document.querySelectorAll('#svg-viewport .pg-photo-face').length)) === 0, 'a boy without a name keeps his drawn face');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.pictogenCharacters);
  check((await page.evaluate(() => window.pictogenCharacters.list().map((c) => c.name).join())) === 'Tom', 'Tom is still there after a reload');
  await draw('Tom talks under a tree');
  await page.click('#clip-tray [data-do="add"]');
  await page.click('#clip-tray [data-do="play"]');
  await page.waitForFunction(() => window.pictogenStudio.getState().mode === 'story' && window.pictogenStudio.getStory().scenes?.length);
  const inClip = await page.evaluate(() => window.pictogenStudio.getStory().scenes.some((sc) => sc.svg.includes('pg-photo-face')));
  check(inClip, 'a clip scene with Tom carries his photo (and so does its video export)');
  // The clip as a standalone HTML player: the faces are added here before saving, and play offline
  const posted = sent.length;
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#story-btn-export-html')]);
  const exported = readFileSync(await download.path(), 'utf8');
  check(/pg-photo-face/.test(exported) && /data:image\/(webp|png|jpeg)/.test(exported) && sent.slice(posted).every((body) => !body.includes('data:image')),
    'the exported clip player carries Tom\'s photo, added in the browser (the server never got it)');
  const player = await browser.newPage();
  const playerErrors = [];
  player.on('pageerror', (e) => playerErrors.push(e.message));
  await player.setContent(exported, { waitUntil: 'load' });
  // (the clip still holds the scenes saved earlier in this test: Tom's is the last)
  await player.evaluate(() => renderScene(scenes.length - 1, false));
  await player.waitForTimeout(400);
  const shown = await player.evaluate(() => ({
    faces: document.querySelectorAll('.pg-photo-face image').length,
    jaw: [...document.querySelectorAll('.pg-photo-jaw')].map((j) => getComputedStyle(j).animationName).join(),
  }));
  check(shown.faces >= 2 && /pgJawTalk/.test(shown.jaw) && !playerErrors.length, `opened on its own, the player shows the face, jaw talking (${JSON.stringify(shown)})`);
  await player.close();
  await page.click('#modes-group .pill-btn[data-mode="scene"]');
  await page.waitForFunction(() => !document.getElementById('characters-panel').hidden);
  await page.click('#characters-panel [data-remove="0"]');
  check((await page.evaluate(() => window.pictogenCharacters.list().length)) === 0, 'a character can be removed');

  check(!errors.length, `no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
} finally {
  if (browser) await browser.close();
  server.kill();
}

console.log(fails ? `\n${fails} studio check(s) failed` : '\nStudio Editing test suite: ALL PASSED!');
process.exit(fails ? 1 : 0);
