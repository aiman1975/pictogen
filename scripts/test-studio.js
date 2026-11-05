// Studio editing in a real browser (skipped without Playwright): expression changes reach every pose
// of a timeline actor, redrawn figures keep their colour and look, timeline actors keep their
// motions, dragging follows the pointer exactly - also inside a zoomed camera - and the timeline
// view edits, reorders and scrubs the steps.
import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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
  // (the music pack's tunes load only when one is played)
  const musicFetched = [];
  page.on('request', (r) => { if (r.url().includes('/audio/pack/music/')) musicFetched.push(r.url()); });
  await page.goto(`http://localhost:${port}/studio`, { waitUntil: 'networkidle' });
  check(musicFetched.length === 0, `opening the studio downloads no music (${musicFetched.length} tunes)`);
  check(await page.evaluate(() => { const pick = document.getElementById('sound-set'); pick.value = 'clean'; pick.dispatchEvent(new Event('change')); const ok = window.pictogenSound.getSoundSet() === 'clean'; pick.value = 'auto'; pick.dispatchEvent(new Event('change')); return ok && window.pictogenSound.getSoundSet() === 'auto'; }),
    'the sound set can be picked: auto, playful or clean');

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

  await draw('a boy says "Hello!" under a tree');
  const bubbleAt = () => page.evaluate(() => document.querySelector('.pg-bubbles [data-for="boy#0"]').getBoundingClientRect().x);
  const b0 = await bubbleAt();
  const moved = await dragBy('.movable-item[data-id="boy"]', 80);
  const b1 = await bubbleAt();
  check(Math.abs(b1 - b0 - moved) < 3, `a speech bubble goes with its figure when dragged (${(b1 - b0).toFixed(1)}px for ${moved.toFixed(1)}px)`);

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
  await page.goto(`http://localhost:${port}/studio`, { waitUntil: 'networkidle' });
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
  // Lip-sync: the jaw follows the words said, syllable by syllable, then rests shut
  await draw('Tom says "Hello Mia, how are you today?"');
  const lips = await page.evaluate(() => {
    const item = document.querySelector('#svg-viewport [data-character="Tom"]');
    const jaw = item.querySelector('.pg-photo-jaw');
    const anim = jaw.getAnimations()[0];
    const at = (t) => { anim.pause(); anim.currentTime = t * 1000; return +new DOMMatrix(getComputedStyle(jaw).transform).f.toFixed(2); };
    const opens = Array.from({ length: 40 }, (_, i) => at(0.5 + i * 0.06));
    return { lips: item.dataset.lips, name: anim.animationName, opens, rest: at(anim.effect.getComputedTiming().duration / 1000 - 0.3), sent: window.pictogenStudio.getState().result.prompt };
  });
  const changes = lips.opens.filter((v, i) => i && Math.abs(v - lips.opens[i - 1]) > 0.15).length;
  check(lips.lips && lips.name === `${lips.lips}j` && changes >= 8 && lips.rest === 0, `Tom's jaw says the words: ${changes} openings and closings, shut in the pause after`);
  await draw('a boy says "Hello there"');
  const drawn = await page.evaluate(() => getComputedStyle(document.querySelector('#svg-viewport [data-lips] .pg-face-mouth')).animationName);
  check(/l\d*d$|ld$/.test(drawn), `a drawn face lip-syncs too (${drawn})`);
  check(sent.every((body) => !body.includes('Tom')), 'names in quotes or not, no name reached the server');
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

  // 6b. Recurring characters without a photo: a name, a kind and colours of their own, the same in
  // every scene and comic panel
  await page.click('#characters-panel [data-do="new"]');
  await page.waitForSelector('.face-modal .char-preview svg');
  await page.fill('.face-name', 'Mia');
  await page.click('.char-swatch[data-role="main"][data-colour="#fdd835"]');
  await page.click('.char-swatch[data-role="hair"][data-colour="#c8662b"]');
  // Her face and hair: curly hair, big eyes, freckles
  await page.click('.char-more summary');
  await page.click('.char-chip[data-feature="hair"][data-value="curly"]');
  await page.click('.char-chip[data-feature="eyes"][data-value="big"]');
  await page.click('.char-chip[data-flag="freckles"]');
  // ... and a cape and a crown to wear
  await page.click('.char-wear summary');
  await page.click('.char-chip[data-gear="cape"]');
  await page.click('.char-chip[data-gear="crown"]');
  await page.waitForFunction(() => document.querySelector('.char-preview .pg-gear-cape') && document.querySelector('.char-preview .pg-gear-crown'));
  await page.click('.char-chip[data-gear="crown"]');
  await page.waitForFunction(() => document.querySelector('.char-preview .pg-gear-cape') && !document.querySelector('.char-preview .pg-gear-crown'));
  check(true, 'things to wear: a cape and a crown on, the crown off again (shown as picked)');
  await page.click('.face-modal [data-do="save"]');
  await page.waitForSelector('.face-modal', { state: 'detached' });
  await page.click('#characters-panel [data-do="new"]');
  await page.fill('.face-name', 'Rex');
  await page.selectOption('.face-base', 'dog');
  check((await page.$$eval('.char-swatches', (rows) => rows.map((r) => r.getAttribute('aria-label')).join())) === 'Fur', 'a dog is coloured by its fur');
  await page.click('.char-swatch[data-role="main"][data-colour="#212121"]');
  await page.click('.face-modal [data-do="save"]');
  await page.waitForSelector('.face-modal', { state: 'detached' });
  const sentBefore = sent.length;
  await draw('Mia walks in, then waves at Rex');
  const mia = await page.evaluate(() => {
    const el = document.querySelector('#svg-viewport [data-character="Mia"]'), rex = document.querySelector('#svg-viewport [data-character="Rex"]');
    return { colors: el?.dataset.colors, yellow: !!el?.innerHTML.toLowerCase().includes('#fdd835'), rex: rex?.dataset.id, black: !!rex?.innerHTML.includes('#212121') };
  });
  check(/main:#fdd835 hair:#c8662b/.test(mia.colors ?? '') && mia.yellow && mia.rex === 'dog' && mia.black, `Mia wears her yellow dress and Rex is a black dog (${JSON.stringify(mia)})`);
  check((await page.evaluate(() => document.querySelector('#svg-viewport [data-character="Mia"]').dataset.features)) === 'eyes:big hair:curly freckles:true gear:cape', 'Mia has the curly hair, big eyes and freckles picked for her, and her cape');
  await select('#svg-viewport .movable-item[data-character="Mia"]');
  await clickExpression('sad');
  check(await page.evaluate(() => { const m = document.querySelector('#svg-viewport .movable-item[data-character="Mia"]'); return !!m.querySelector('.pg-gear-cape') && m.innerHTML.includes('#4fc3f7'); }), 'turned sad, she still wears her cape');
  await page.keyboard.press('Escape');
  check(sent.slice(sentBefore).every((body) => !body.includes('Mia') && !body.includes('Rex')), 'their names never reach the engine');
  await page.evaluate(() => document.querySelector('#modes-group .pill-btn[data-mode="comic"]').click());
  await page.waitForFunction(() => window.pictogenStudio.getState().mode === 'comic' && !document.getElementById('characters-panel').hidden);
  {
    const input = await page.$('textarea, input[type=text]');
    await input.fill('Mia finds Rex "Hello!" "Woof!" "Best friends!"');
    await input.press('Enter');
    await page.waitForFunction(() => document.querySelector('#svg-viewport tspan[data-who]'));
  }
  const strip = await page.evaluate(() => ({
    title: [...document.querySelectorAll('#svg-viewport tspan[data-who]')].map((t) => t.textContent).join(),
    mia: document.querySelectorAll('#svg-viewport g[data-character="Mia"]').length,
  }));
  check(strip.title === 'MIA,REX' && strip.mia === 3, `in a comic strip Mia is in all three panels, and the title says her name (${JSON.stringify(strip)})`);
  // A picture book of a clip with Mia: a cover, a page per scene with its caption, The End, as a
  // landscape PDF; the captions say her name (the engine only got her key)
  await page.evaluate(() => document.querySelector('#modes-group .pill-btn[data-mode="scene"]').click());
  await page.waitForFunction(() => window.pictogenStudio.getState().mode === 'scene');
  const clearClip = async () => {
    page.once('dialog', (d) => d.accept());
    if (await page.$('#clip-tray [data-do="clear"]')) await page.click('#clip-tray [data-do="clear"]');
  };
  await clearClip();
  for (const prompt of ['Mia walks in, then waves', 'Rex runs to Mia']) {
    await draw(prompt);
    await page.click('#clip-tray [data-do="add"]');
  }
  {
    const cap = page.locator('.clip-caption').last();
    await cap.fill('Then Rex came to see Mia!');
    await cap.dispatchEvent('input');
  }
  const sentBook = sent.length;
  await page.click('#clip-tray [data-do="play"]');
  await page.waitForFunction(() => window.pictogenStudio.getState().mode === 'story' && window.pictogenStudio.getStory().scenes?.length === 2);
  const captions = await page.evaluate(() => window.pictogenStudio.getStory().scenes.map((sc) => sc.caption));
  check(captions.join(' | ') === 'Mia walks in, then waves. | Then Rex came to see Mia!' && sent.slice(sentBook).every((body) => !body.includes('Mia')),
    `a clip's captions say the names, though the engine only got keys (${captions.join(' | ')})`);
  await page.click('#story-btn-book');
  await page.fill('#bk-author', 'Grandpa');
  await page.waitForFunction(() => document.querySelectorAll('#bk-preview img').length === 4, null, { timeout: 60000 });
  const [bookFile] = await Promise.all([page.waitForEvent('download'), page.click('#bk-pdf')]);
  const pdf = readFileSync(await bookFile.path(), 'latin1');
  check(pdf.startsWith('%PDF-') && (pdf.match(/\/Type \/Page /g) || []).length === 4 && /MediaBox \[0 0 841\.89 595\.28\]/.test(pdf) && /\/Title \(My Story\)/.test(pdf),
    'a picture book: cover, a page for each scene and The End, on landscape A4 pages, as a PDF');
  await page.evaluate(() => document.querySelector('.book-dialog').close());
  // A story written in the story box: one scene per line, the names in the story kept
  check(await page.isVisible('#story-text') && !(await page.isVisible('#prompt-input')), 'Clip Studio has a story box with room for lines');
  await page.fill('#story-text', 'Once upon a time, a little girl called Lily lived near a forest.\nOne morning, she found a small puppy under a tree.\nAt night, Lily hugged the puppy and fell asleep.');
  await page.press('#story-text', 'Control+Enter');
  await page.waitForFunction(() => window.pictogenStudio.getStory().scenes?.length === 3 && window.pictogenStudio.getStory().title === 'My Story');
  const told = await page.evaluate(() => window.pictogenStudio.getStory().scenes.map((sc) => ({ caption: sc.caption, who: (sc.svg.match(/data-who="(pgc\d+)"/) || [])[1] })));
  check(told[0].caption.startsWith('Once upon a time') && told.every((sc) => sc.who && sc.who === told[0].who), `a story in three lines: three scenes, Lily the same girl in each (${JSON.stringify(told.map((sc) => sc.who))})`);
  // How it was read: the cast and each scene; a scene changed; Lily kept as one of your characters
  await page.waitForFunction(() => !document.getElementById('story-review').hidden && document.querySelectorAll('.sr-row').length === 3);
  check((await page.textContent('#story-review')).includes('Lily') && (await page.inputValue('.sr-input[data-i="2"]')).includes('Lily hugs'), 'the story panel shows the cast and what each scene draws, with names');
  await page.fill('.sr-input[data-i="2"]', 'Lily and the puppy sit on a bench at night');
  await page.press('.sr-input[data-i="2"]', 'Enter');
  await page.waitForFunction(() => window.pictogenStudio.getStory().scenes?.[2]?.edited && /pg-sitter/.test(window.pictogenStudio.getStory().scenes[2].svg));
  check(true, 'changing what a scene shows makes the clip again with it');
  // The scene card: figures, objects, place, feeling, action, message; a mood picked; a thing left out
  const cardText = await page.textContent('.sr-row:nth-child(2) .sc-card');
  check(['Figures', 'Objects', 'Place', 'Feeling', 'Action', 'Message'].every((w) => cardText.includes(w)) && cardText.includes('Lily') && cardText.includes('puppy'),
    'each scene has its card: figures, objects, place, feeling, action, message');
  await page.selectOption('.sc-mood[data-mood="0"]', 'mystery');
  await page.waitForFunction(() => window.pictogenStudio.getStory().scenes?.[0]?.mood === 'mystery' && window.pictogenStudio.getStory().scenes[0].moodChosen);
  check(sent.at(-1).includes('"moods"') && sent.at(-1).includes('mystery'), 'a mood picked for a scene makes the clip again with it (sent with the story)');
  await page.selectOption('.sc-mood[data-mood="0"]', '');
  await page.waitForFunction(() => !window.pictogenStudio.getStory().scenes?.[0]?.moodChosen);
  // ✎ Words on a card: a line added to scene 1, then said by someone else in other words
  await page.click('button[data-say="0"]');
  await page.click('.sc-message button[data-newline="1"]');
  await page.fill('.sc-line[data-line="0"]', 'What a lovely forest!');
  await page.press('.sc-line[data-line="0"]', 'Enter');
  await page.waitForFunction(() => window.pictogenStudio.getStory().scenes?.[0]?.card?.message.said[0]?.text === 'What a lovely forest!');
  check(/says “What a lovely forest!”/.test(await page.evaluate(() => window.pictogenStudio.getStory().scenes[0].prompt)), 'a line added on a scene\'s card is said in it');
  await page.click('button[data-say="0"]');
  await page.fill('.sc-line[data-line="0"]', 'I love the trees!');
  await page.click('.sc-message button[data-sayok="0"]');
  await page.waitForFunction(() => window.pictogenStudio.getStory().scenes?.[0]?.card?.message.said[0]?.text === 'I love the trees!' && window.pictogenStudio.getStory().scenes[0].card.message.said.length === 1);
  check(true, 'a line changed on the card replaces the old one');
  await page.click('button[data-say="0"]');
  await page.click('.sc-message button[data-unline="0"]');
  await page.click('.sc-message button[data-sayok="0"]');
  await page.waitForFunction(() => !window.pictogenStudio.getStory().scenes?.[0]?.card?.message.said.length);
  check(true, '...and a line removed is no longer said');
  await page.click('.sr-row:nth-child(1) button[data-reset="0"]');
  await page.waitForFunction(() => !window.pictogenStudio.getStory().scenes?.[0]?.edited);
  // 📷 Camera: a shot chosen for a scene
  check((await page.$$eval('.sc-shot[data-shot="0"] option', (o) => o.map((x) => x.textContent))).some((l) => /^Close on Lily/.test(l)), 'the camera list offers close on each figure');
  await page.selectOption('.sc-shot[data-shot="0"]', 'low');
  await page.waitForFunction(() => window.pictogenStudio.getStory().scenes?.[0]?.shotChosen && window.pictogenStudio.getStory().scenes[0].card.camera.says === 'low angle');
  check(sent.at(-1).includes('"sceneShots"'), 'a camera shot picked for a scene makes the clip again with it');
  await page.selectOption('.sc-shot[data-shot="0"]', '');
  await page.waitForFunction(() => !window.pictogenStudio.getStory().scenes?.[0]?.shotChosen);
  // 🎨 Look: a scene in another style than the clip
  await page.selectOption('.sc-look[data-look="0"]', 'stickman');
  await page.waitForFunction(() => window.pictogenStudio.getStory().scenes?.[0]?.style === 'stickman' && !window.pictogenStudio.getStory().scenes[1].style);
  check(sent.at(-1).includes('"sceneStyles"'), 'a look picked for a scene makes it in that style, the others as the clip');
  await page.selectOption('.sc-look[data-look="0"]', '');
  await page.waitForFunction(() => !window.pictogenStudio.getStory().scenes?.[0]?.style);
  // ＋ on a card: a dog added to scene 1 (with suggestions while typing), then left out again (×)
  await page.click('.sc-add[data-add-kind="figure"][data-i="0"]');
  check(await page.$eval('#sc-figures', (d) => d.options.length > 20) && await page.$eval('#sc-objects', (d) => d.options.length > 500), 'adding to a scene suggests figures (with your names) and things while typing');
  await page.fill('.sc-new', 'cat');
  await page.press('.sc-new', 'Enter');
  await page.waitForFunction(() => window.pictogenStudio.getStory().scenes?.[0]?.card?.figures.some((f) => f.kind === 'cat'));
  check(/and a cat/.test(await page.evaluate(() => window.pictogenStudio.getStory().scenes[0].prompt)), 'someone added on a scene\'s card is drawn in it');
  await page.click('.sr-row:nth-child(1) .sc-x[data-word="cat"]');
  await page.waitForFunction(() => !window.pictogenStudio.getStory().scenes?.[0]?.card?.figures.some((f) => f.kind === 'cat'));
  await page.click('.sc-add[data-add-kind="object"][data-i="0"]');
  await page.selectOption('.sc-count', '2');
  await page.fill('.sc-new', 'apple');
  await page.click('button[data-add-ok="0"]');
  await page.waitForFunction(() => window.pictogenStudio.getStory().scenes?.[0]?.card?.objects.some((o) => /apple/.test(o.name) && o.count === 2));
  check(true, 'things added on a scene\'s card, as many as asked (two apples)');
  await page.click('.sr-row:nth-child(1) button[data-reset="0"]');
  await page.waitForFunction(() => !window.pictogenStudio.getStory().scenes?.[0]?.edited);
  // The card's place and steps: the beach at night for scene 1; its steps changed and used
  await page.selectOption('.sc-pick[data-place="0"][data-kind="place"]', 'beach');
  await page.waitForFunction(() => window.pictogenStudio.getStory().scenes?.[0]?.placeChosen && /beach/.test(window.pictogenStudio.getStory().scenes[0].card.place));
  check(sent.at(-1).includes('"scenePlaces"') && sent.at(-1).includes('beach'), 'a place picked on a scene\'s card makes the clip again with it');
  await page.click('button[data-unplace="0"]');
  await page.waitForFunction(() => !window.pictogenStudio.getStory().scenes?.[0]?.placeChosen);
  await page.click('button[data-edit="1"]');
  await page.waitForSelector('.sc-steps');
  await page.click('.sc-steps button[data-add="1"]');
  const last = await page.$$eval('.sc-steps .sc-step', (rows) => rows.length - 1);
  await page.selectOption(`.sc-pick[data-step="${last}"][data-field="does"]`, 'pose:jump');
  await page.click('.sc-steps button[data-apply="1"]');
  await page.waitForFunction(() => window.pictogenStudio.getStory().scenes?.[1]?.stepsChosen && window.pictogenStudio.getStory().scenes[1].card.action.some((a) => /jumps/.test(a)));
  check(sent.at(-1).includes('"sceneBeats"'), 'steps changed on a scene\'s card make the clip again with them');
  // ✎ Words with chosen steps: a line added becomes a talking step
  await page.click('button[data-say="1"]');
  await page.click('.sc-message button[data-newline="1"]');
  await page.fill('.sc-line[data-line="0"]', 'What a cute puppy!');
  await page.click('.sc-message button[data-sayok="1"]');
  await page.waitForFunction(() => window.pictogenStudio.getStory().scenes?.[1]?.card?.message.said.some((l) => l.text === 'What a cute puppy!'));
  check(await page.evaluate(() => Object.values(window.pictogenStudio.getState().storyBeats).some((st) => st.some((x) => x.anim === 'talk' && x.speech === 'What a cute puppy!'))),
    'a line added to a scene whose steps were chosen is a talking step');
  await page.click('button[data-edit="1"]');
  await page.click('.sc-steps button[data-unsteps="1"]');
  await page.waitForFunction(() => !window.pictogenStudio.getStory().scenes?.[1]?.stepsChosen);
  const sentKeep = sent.length;
  await page.click('.sr-who button[data-keep="Lily"]');
  await page.waitForFunction(() => window.pictogenCharacters.list().some((c) => c.name === 'Lily') && !document.querySelector('.sr-who button[data-keep="Lily"]'));
  await page.waitForFunction(() => window.pictogenStudio.getStory().scenes?.[2]?.edited && window.pictogenStudio.getStory().scenes.every((sc) => /data-who="pgc\d"/.test(sc.svg)));
  check(sent.slice(sentKeep).every((body) => !body.includes('Lily')), 'kept as a character, Lily is in every scene as her own key, the change to scene 3 still there, her name never sent');
  await page.evaluate(() => { const i = window.pictogenCharacters.list().findIndex((c) => c.name === 'Lily'); document.querySelector(`#characters-panel [data-remove="${i}"]`)?.click(); });
  check(await page.isVisible('#story-btn-read'), 'a button reads the story aloud');
  check(await page.evaluate(() => { const t = document.getElementById('story-tune'); t.value = 'sea'; t.dispatchEvent(new Event('change')); return window.pictogenStudio.getStory().tune === 'sea' && t.options.length === 21; }),
    'the clip\'s music: its genre\'s, or one of twenty tunes picked (here "Under the sea")');
  await page.evaluate(() => { const t = document.getElementById('story-tune'); t.value = ''; t.dispatchEvent(new Event('change')); });
  await page.evaluate(() => document.querySelector('#modes-group .pill-btn[data-mode="scene"]').click());
  await page.waitForFunction(() => window.pictogenStudio.getState().mode === 'scene');
  await clearClip();
  await page.evaluate(() => document.querySelector('#modes-group .pill-btn[data-mode="scene"]').click());
  await page.waitForFunction(() => window.pictogenStudio.getState().mode === 'scene');
  await page.click('#characters-panel [data-remove="1"]');
  await page.click('#characters-panel [data-remove="0"]');

  // 6c. Your places: a place made here (a farm at sunset, mountains behind, fireflies), called by its
  // name in prompts; the name never reaches the engine
  await page.click('#places-panel [data-do="new"]');
  await page.waitForSelector('.face-modal .place-preview svg');
  await page.fill('.face-name', 'forest');
  await page.click('.char-chip[data-key="place"][data-value="farm"]');
  await page.click('.char-chip[data-key="time"][data-value="sunset"]');
  await page.click('.char-chip[data-key="extras"][data-value="mountains"]');
  await page.click('.char-chip[data-key="extras"][data-value="fireflies"]');
  await page.waitForFunction(() => document.querySelector('.place-preview svg .pg-place-farm') && document.querySelector('.place-preview svg .pg-env-firefly'));
  await page.click('.face-modal [data-do="save"]');
  check(/plain place word/.test(await page.textContent('.face-modal .face-error')), 'a place can\'t be called just "forest"');
  await page.fill('.face-name', "Grandma's farm");
  await page.click('.face-modal [data-do="save"]');
  await page.waitForSelector('.face-modal', { state: 'detached' });
  await page.waitForSelector('#places-panel .place-pic svg');
  const sentPlace = sent.length;
  await draw("a girl waves at Grandma's farm");
  const farm = await page.evaluate(() => {
    const svg = document.querySelector('#svg-viewport svg');
    return { farm: !!svg.querySelector('.pg-place-farm'), hills: !!svg.querySelector('.pg-place-mountains'), flies: svg.querySelectorAll('.pg-env-firefly').length, girl: !!svg.querySelector('.movable-item[data-id="girl"]') };
  });
  check(farm.farm && farm.hills && farm.flies > 5 && farm.girl, `"a girl waves at Grandma's farm": the girl at the farm made here, mountains behind, fireflies (${JSON.stringify(farm)})`);
  check(sent.slice(sentPlace).every((body) => !body.includes('Grandma')) && sent.slice(sentPlace).some((body) => body.includes('pgp1')), 'the place\'s name never reaches the engine (only "pgp1")');
  // A room of one's own: blue walls, a whiteboard with words, a map and a plant
  await page.click('#places-panel [data-do="new"]');
  await page.fill('.face-name', 'Biology room');
  await page.click('.char-chip[data-key="place"][data-value="classroom"]');
  await page.click('.char-swatch[data-key="wall"][data-colour="#e3f2fd"]');
  await page.click('.char-chip[data-key="board"][data-value="white"]');
  await page.click('.char-chip[data-key="things"][data-value="map"]');
  await page.fill('.place-board', 'Photosynthesis');
  await page.click('.face-modal [data-do="save"]');
  await page.waitForSelector('.face-modal', { state: 'detached' });
  await draw('a teacher explains in Biology room');
  check(await page.evaluate(() => document.querySelector('#svg-viewport svg text')?.textContent === 'Photosynthesis' && document.querySelector('#svg-viewport svg').innerHTML.toLowerCase().includes('#e3f2fd')),
    'a room made here: its own walls, a whiteboard with the words asked for');
  await page.click('#places-panel [data-remove="1"]');
  await page.click('#places-panel [data-remove="0"]');
  check(!(await page.evaluate(() => window.pictogenPlaces.list().length)), 'a place can be removed');

  // Your figures (dot puppets): a table drawn here, its four legs looped, named, kept and used by name
  await page.click('#puppets-panel [data-do="new"]');
  await page.waitForSelector('.puppet-card');
  const pstroke = async (pts) => {
    const b = await (await page.$('.puppet-overlay')).boundingBox();
    const P = (x, y) => [b.x + (x / 100) * b.width, b.y + (y / 100) * b.height];
    await page.mouse.move(...P(...pts[0])); await page.mouse.down();
    for (const q of pts.slice(1)) await page.mouse.move(...P(...q), { steps: 5 });
    await page.mouse.up();
  };
  await page.click('.puppet-card [data-width="22"]');
  await pstroke([[16, 44], [84, 44]]);
  await page.click('.puppet-card [data-width="12"]');
  for (const x of [22, 36, 64, 78]) await pstroke([[x, 52], [x, 92]]);
  await page.click('.puppet-card [data-step="2"]');
  for (const x of [22, 36, 64, 78]) await pstroke([[x - 4, 51], [x + 4, 51], [x + 4, 95], [x - 4, 95], [x - 4, 52]]);
  check((await page.textContent('.puppet-kind')).includes('4 legs'), 'a figure: four legs looped, it walks like a dog');
  // A face: two eyes and a mouth clicked onto the table top
  await page.click('.puppet-card [data-step="3"]');
  const pclick = async (x, y) => { const b = await (await page.$('.puppet-overlay')).boundingBox(); await page.mouse.click(b.x + (x / 100) * b.width, b.y + (y / 100) * b.height); };
  await page.click('.puppet-card [data-facetool="eyes"]');
  await pclick(38, 40); await pclick(62, 40);
  await page.click('.puppet-card [data-facetool="mouth"]');
  await pclick(50, 46);
  check(await page.$$eval('.puppet-overlay .pp-face', (els) => els.length) === 3, 'a face marked on the figure: two eyes and a mouth, where clicked');
  await page.click('.puppet-card [data-try="says “Hello, nice to meet you!”"]');
  await page.waitForFunction(() => { const h = document.querySelector('.puppet-preview')?.innerHTML ?? ''; return /pg-face-eyes/.test(h) && /pg-face-mouth/.test(h) && /data-lips/.test(h); });
  check(true, 'the figure tries talking: its eyes blink and its mouth moves with the words');
  await page.click('.puppet-card [data-step="5"]');
  await page.fill('.puppet-card .face-name', 'Mr Table');
  await page.click('.puppet-card [data-try="walks"]');
  await page.waitForFunction(() => /pg-rig-quadruped/.test(document.querySelector('.puppet-preview')?.innerHTML ?? ''));
  check(true, 'the figure tries its moves in the editor (walking)');
  await page.click('.face-modal [data-do="save"]');
  await page.waitForSelector('.face-modal', { state: 'detached' });
  const sentPuppet = sent.length;
  await draw('Mr Table walks to the tree in the park');
  check(await page.evaluate(() => /pg-rig-quadruped/.test(document.querySelector('#svg-viewport svg')?.innerHTML ?? '') && /data-who="pgc501"/.test(document.querySelector('#svg-viewport').innerHTML)),
    'a figure is used by its name in a prompt: it walks');
  check(sent.slice(sentPuppet).every((body) => !body.includes('Mr Table')) && sent.slice(sentPuppet).some((body) => body.includes('"puppet"')), 'its picture goes to the engine, its name never does');
  await page.click('#puppets-panel [data-remove="0"]');
  check(!(await page.evaluate(() => window.pictogenPuppets.list().length)), 'a figure can be removed');

  check(!errors.length, `no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);

  // A labelled diagram: rename a label by clicking it, blank them for a quiz; then a worksheet PDF
  await page.evaluate(() => document.querySelector('#modes-group .pill-btn[data-mode="diagram"]').click());
  {
    const input = await page.$('#prompt-input');
    await input.fill('the parts of a plant');
    await input.press('Enter');
    await page.waitForFunction(() => window.pictogenStudio.getState().prompt === 'the parts of a plant' && document.querySelector('#svg-viewport .pg-label'));
  }
  check(await page.evaluate(() => !document.getElementById('diagram-bar').hidden && document.querySelectorAll('#svg-viewport .pg-label').length === 6), 'the parts of a plant: a diagram with six labels and its label tools');
  await page.click('#svg-viewport .pg-label[data-key="stem"]');
  await page.fill('.label-editor', 'Stalk');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('#svg-viewport .pg-label[data-key="stem"]')?.dataset.text === 'Stalk');
  check(true, 'a label renamed by clicking it ("Stem" -> "Stalk")');
  await page.click('#btn-blank-labels');
  await page.waitForFunction(() => document.querySelector('#svg-viewport .pg-word-bank'));
  const quiz = await page.evaluate(() => document.querySelector('#svg-viewport .pg-word-bank').textContent);
  check(/Stalk/.test(quiz), `blank labels for a quiz, the renamed word in the word bank (${quiz.trim()})`);
  await page.click('#btn-blank-labels');
  await page.click('#btn-worksheet');
  await page.waitForFunction(() => document.querySelectorAll('.ws-preview img').length >= 1, null, { timeout: 30000 });
  const ws = await page.evaluate(() => ({ pages: document.querySelectorAll('.ws-preview img').length, open: document.querySelector('.worksheet-dialog').open }));
  check(ws.open && ws.pages === 2, `the worksheet dialog shows the worksheet and its answer key (${ws.pages} pages)`);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('#ws-pdf')]);
  const pdfPath = join(tmpdir(), `pictogen-ws-${process.pid}.pdf`);
  await dl.saveAs(pdfPath);
  let info = '';
  try { info = execSync(`pdfinfo "${pdfPath}"`, { encoding: 'utf8' }); } catch (e) { info = String(e.stdout || e.message); }
  const pagesIn = +(info.match(/Pages:\s+(\d+)/)?.[1] ?? 0), a4 = /595\.28 x 841\.89/.test(info);
  check(/\.pdf$/.test(dl.suggestedFilename()) && pagesIn === 2 && a4, `"Download PDF" gives a 2-page A4 PDF (${dl.suggestedFilename()}, ${pagesIn} pages${a4 ? ', A4' : ''})`);
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.querySelector('#modes-group .pill-btn[data-mode="scene"]').click());
  await draw('a boy waves');
  const animated = await page.evaluate(() => document.querySelector('#svg-viewport svg').getAnimations({ subtree: true }).length);
  check(!(await page.evaluate(() => document.querySelector('.worksheet-dialog').open)) && animated > 0, `the dialog closes, and the studio's pictures still move (${animated} animations)`);

  // Something held stays in the hands when the figure's expression changes
  await draw('a girl holds a balloon');
  await select('.movable-item[data-id="girl"]');
  await clickExpression('sad');
  const kept2 = await page.evaluate(() => {
    const g = document.querySelector('.movable-item[data-id="girl"]');
    return { held: !!g.querySelector('.pg-figure .pg-held'), sad: g.querySelector('.pg-figure').innerHTML.includes('#4fc3f7') };
  });
  check(kept2.held && kept2.sad, `a balloon stays in her hand when she turns sad (${JSON.stringify(kept2)})`);

  // Words it can't draw: a guess is drawn and said, close words are offered, a click uses one
  await draw('an elefant');
  const guess = await page.evaluate(() => ({ ids: window.pictogenStudio.getState().result.matches.map((m) => m.id), help: document.getElementById('word-help').textContent }));
  check(guess.ids.includes('elephant') && /elefant/.test(guess.help) && /elephant/.test(guess.help), `a misspelt word is drawn as a guess, and the studio says so (${guess.ids.join(', ')})`);
  await draw('a cat and a wizzard');
  const offered = await page.$$eval('#word-help .wh-try', (b) => b.map((x) => x.textContent));
  check(offered.includes('wizard'), `a word not drawn gets close words to try (${offered.join(', ')})`);
  await page.click('#word-help .wh-try[data-to="wizard"]');
  await page.waitForFunction(() => window.pictogenStudio.getState().prompt === 'a cat and a wizard' && window.pictogenStudio.getState().result?.matches.some((m) => /wizard|mage/.test(m.id)));
  check(!(await page.$('#word-help .wh-try')), 'clicking one puts it in the prompt and draws it');
  const input = await page.$('#prompt-input');
  await input.fill('qwrtzp');
  await input.press('Enter');
  await page.waitForFunction(() => window.pictogenStudio.getState().prompt === 'qwrtzp' && document.querySelector('#word-help .wh-empty'));
  check(true, 'when nothing can be drawn, the studio says what to try');

  // On a phone (an iPhone-sized touch screen): nothing wider than the screen, the picture near
  // the top, modes and styles in sideways rows, a tapped figure's controls a sheet at the bottom
  const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const phone = await phoneCtx.newPage();
  const phoneErrors = [];
  phone.on('pageerror', (e) => phoneErrors.push(e.message));
  await phone.goto(`http://localhost:${port}/studio`, { waitUntil: 'networkidle' });
  await phone.waitForFunction(() => document.querySelector('#svg-viewport svg .movable-item'));
  const layout = await phone.evaluate(() => {
    const top = (sel) => document.querySelector(sel).getBoundingClientRect().top + scrollY;
    const styles = document.getElementById('styles-group');
    return {
      width: document.documentElement.scrollWidth,
      picture: top('#svg-viewport'),
      buttons: top('.canvas-actions') > top('#svg-viewport'),
      styleRow: getComputedStyle(styles).flexWrap === 'nowrap' && styles.scrollWidth > styles.clientWidth,
      header: getComputedStyle(document.querySelector('header')).position,
      hint: document.querySelector('.on-touch').offsetParent !== null,
    };
  });
  check(layout.width <= 390, `on a phone nothing is wider than the screen (${layout.width}px)`);
  check(layout.picture < 664 && layout.buttons && layout.header === 'static', `the picture starts on the first screen (${Math.round(layout.picture)}px down), its buttons under it, the header scrolls away`);
  check(layout.styleRow && layout.hint, 'styles are one row to swipe; the hint speaks of tapping and dragging');
  const phoneFig = await phone.$('#svg-viewport .movable-item[data-id="boy"]') || await phone.$('#svg-viewport .movable-item');
  await phoneFig.evaluate((el) => {
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    const o = { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerId: 1, pointerType: 'touch' };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    window.dispatchEvent(new PointerEvent('pointerup', o));
  });
  await phone.waitForTimeout(700);
  const sheet = await phone.evaluate(() => {
    const t = document.getElementById('object-toolbar').getBoundingClientRect();
    const f = document.querySelector('.movable-item.selected').getBoundingClientRect();
    const small = [...document.querySelectorAll('#object-toolbar button')].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 32).length;
    return { left: t.left, right: t.right, bottom: Math.round(t.bottom), figureAbove: f.top < t.top, small };
  });
  check(sheet.left === 0 && sheet.right === 390 && sheet.bottom === 664 && sheet.small === 0, `a tapped figure's controls are a sheet across the bottom of the screen, fingertip-sized (${JSON.stringify(sheet)})`);
  check(sheet.figureAbove, 'the page scrolls so the figure shows above the sheet');
  await phone.tap('#tb-done');
  check((await phone.evaluate(() => getComputedStyle(document.getElementById('object-toolbar')).display)) === 'none' && !phoneErrors.length, `"Done" closes the sheet${phoneErrors.length ? '; errors: ' + phoneErrors.join('; ') : ''}`);
  await phoneCtx.close();
} finally {
  if (browser) await browser.close();
  server.kill();
}

console.log(fails ? `\n${fails} studio check(s) failed` : '\nStudio Editing test suite: ALL PASSED!');
process.exit(fails ? 1 : 0);
