// Sound: scenes say what is heard when (src/sound.js) - footsteps while walking, a boing on a jump,
// a babble in time with the lips, an "ooh" when surprised, every animal its own call - and the
// synthesizer (src/sound-synth.js) makes each sound from scratch. In a real browser (skipped
// without Playwright): every sound renders, voices sit at their pitch, the studio plays a scene's
// sound, videos carry it as an audio track and the HTML clip export plays it offline.
import { spawn, spawnSync, execSync } from 'node:child_process';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generate, generateStoryHtml, composeStory, lipKeys, parseTimeline } from '../src/index.js';
import { voiceOf, soundOf, SOUND_NAMES, actionCues } from '../src/sound.js';
import { babbleNotes } from '../src/speech.js';

let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓ PASS' : '✗ FAIL'}: ${msg}`); if (!ok) fails++; };

// 1. Voices: children high, adults lower, animals call; two of a kind differ
check(voiceOf('boy').v === 'kid' && voiceOf('man').v === 'man' && voiceOf('woman').v === 'woman', 'people get a kid, man or woman voice');
check(voiceOf('girl').p > voiceOf('boy').p, 'a girl\'s voice is a little higher than a boy\'s');
check(voiceOf('boy', 1).p !== voiceOf('boy', 0).p, 'a second boy sounds different from the first');
check(voiceOf('dog').v === 'woof' && voiceOf('cat').v === 'meow' && voiceOf('duck').v === 'quack', 'animals call (woof, meow, quack)');
check(voiceOf('tree') === null, 'things have no voice');

// 2. A timeline's sound: what each step sounds like, when
const tl = generate('A boy walks to the tree. Then he jumps. Then he says "Hello there, how are you?". Then a dog runs to him. Then the girl looks surprised');
const snd = soundOf(tl.svg);
check(!!snd && snd.loop === tl.duration, `the SVG carries its sound, looping with the clip (${snd?.loop}s = ${tl.duration}s)`);
const cue = (s) => snd.cues.filter((c) => c.s === s);
const beatAt = (i) => tl.beats[i].t0;
check(cue('steps').some((c) => c.t === beatAt(0) && !c.g) && cue('steps').some((c) => c.g === 'run'), 'walking patters, running patters quicker');
check(cue('boing').length === 1 && Math.abs(cue('boing')[0].t - beatAt(1)) < 0.01, 'the jump boings when it jumps');
const babble = cue('babble')[0];
check(babble && Math.abs(babble.t - beatAt(2)) < 0.01 && babble.v === 'kid', 'the boy babbles his words in a kid\'s voice when he says them');
check(babble && babble.n.length === babbleNotes('Hello there, how are you?').length && babble.n.at(-1)[3] === '?', 'one sung syllable per syllable, the question marked to rise');
check(cue('whoosh').length === 1 && cue('woof').length === 1, 'the dog whooshes in and woofs when it gets there');
check(cue('ooh').length === 1 && cue('ooh')[0].p === voiceOf('girl').p, 'the surprised girl says "ooh" in her voice');
check(snd.cues.every((c, i, a) => i === 0 || a[i - 1].t <= c.t) && snd.cues.every((c) => c.t < snd.loop), 'cues in time order, all within the loop');
check(snd.cues.every((c) => SOUND_NAMES.includes(c.s)), 'every cue is a sound the synthesizer knows');

// Babble and lips go together: each sung syllable starts as the mouth opens for it
const lips = lipKeys('Hello Mia! How are you?').keys.filter(([, o]) => o > 0.3).map(([t]) => t);
const notes = babbleNotes('Hello Mia! How are you?');
check(notes.length === lips.length && notes.every(([t, d], i) => t <= lips[i] && lips[i] <= t + d), `the babble's syllables line up with the lip-sync (${notes.length} syllables)`);
check(babbleNotes('Hmm, okay')[0][2] === 'm', '"hmm" is hummed');

// 3. Still scenes: the mood once, the words with the lips
const still = soundOf(generate('a surprised girl').svg);
check(still && still.loop === null && still.cues.length === 1 && still.cues[0].s === 'ooh', 'a surprised girl says "ooh" once');
const talk = generate('a girl says "Tom & <Mia>!"');
const ts = soundOf(talk.svg);
check(ts && ts.cues[0].s === 'babble' && ts.cues[0].t === 0.5 && ts.loop === talk.duration, 'a girl saying something babbles with her lips, looping with them');
const meta = talk.svg.match(/<metadata class="pg-sound">([^<]*)<\/metadata>/)?.[1] ?? '';
check(meta && !/Tom|Mia/.test(meta) && !/[<>]/.test(meta), 'the sound stores syllables, not the words, and the markup stays intact');
check(soundOf(generate('a red apple on a table').svg) === null, 'a scene without anyone doing anything is silent');
check(actionCues({ type: 'pose', anim: 'talk', words: 'Hi Mia' }, 1, voiceOf('dog'))[0].s === 'woof', 'a dog that talks barks');
const a = parseTimeline('a happy girl waves', { force: true });
check(a?.beats[0].actions[0].anim === 'wave' && a.beats[0].actions[0].expression === 'happy', '"a happy girl waves": the feeling describes her, waving is what she does');

// 4. In a real browser
let chromium = null;
try {
  const req = createRequire(import.meta.url);
  try { ({ chromium } = req('playwright')); } catch { ({ chromium } = req(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright'))); }
} catch { /* not installed */ }
if (!chromium) {
  console.log('- SKIP: browser sound checks (Playwright is not installed)');
} else {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const port = await new Promise((done) => { const s = createServer().listen(0, () => { const p = s.address().port; s.close(() => done(p)); }); });
  const server = spawn(process.execPath, ['serve.js'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((done) => server.stdout.on('data', (d) => { if (String(d).includes('running')) done(); }));
  const dir = mkdtempSync(join(tmpdir(), 'pictogen-sound-'));
  let browser;
  try {
    browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });

    // Every sound, in every voice, renders: audible, finite, not clipping, over within seconds
    const voiced = ['babble', 'ooh', 'aha', 'hmm', 'giggle', 'yay', 'hi', 'aww', 'hmph'];
    const cues = SOUND_NAMES.flatMap((s) => (voiced.includes(s)
      ? ['kid', 'woman', 'man'].map((v) => ({ s, v, n: s === 'babble' ? babbleNotes('Hello Mia! How are you?') : undefined }))
      : [{ s, d: 2 }]));
    const rendered = await page.evaluate(async (cues) => {
      const { pgSound } = await import('/js/sound-synth.js');
      const out = [];
      for (const c of cues) {
        const ctx = new OfflineAudioContext(1, 44100 * 3, 44100);
        pgSound(ctx, ctx.destination, c, 0.05);
        const d = (await ctx.startRendering()).getChannelData(0);
        let sum = 0, peak = 0, bad = 0, last = 0, zc = 0;
        for (let i = 0; i < d.length; i++) {
          if (!Number.isFinite(d[i])) bad++;
          sum += d[i] * d[i];
          peak = Math.max(peak, Math.abs(d[i]));
          if (Math.abs(d[i]) > 0.01) last = i / 44100;
          if (i && (d[i] >= 0) !== (d[i - 1] >= 0)) zc++;
        }
        out.push({ name: c.v ? `${c.s}/${c.v}` : c.s, rms: Math.sqrt(sum / d.length), peak, bad, last, zc });
      }
      return out;
    }, cues);
    const silent = rendered.filter((r) => r.rms < 0.002 || r.peak < 0.03);
    check(!silent.length, `all ${rendered.length} sounds are audible${silent.length ? ': not ' + silent.map((r) => r.name).join(', ') : ''}`);
    check(rendered.every((r) => !r.bad && r.peak < 1), 'no sound clips or breaks (finite, below full scale)');
    check(rendered.every((r) => r.last < 2.6), 'every sound is over within the render');
    const hum = (v) => rendered.find((r) => r.name === `hmm/${v}`).zc;
    check(hum('kid') > hum('woman') && hum('woman') > hum('man'), `voices sit at their pitch: kid > woman > man (hum crossings ${hum('kid')}, ${hum('woman')}, ${hum('man')})`);

    // The studio: a scene with sound plays it once the page has been used, the button switches it off
    await page.mouse.click(5, 5);
    const input = await page.$('textarea, input[type=text]');
    await input.fill('a boy jumps, then he laughs');
    await input.press('Enter');
    await page.waitForFunction(() => window.pictogenStudio.getState().prompt === 'a boy jumps, then he laughs' && document.querySelector('#svg-viewport svg metadata.pg-sound'));
    const playing = await page.evaluate(() => window.pictogenSound.play(window.pictogenStudio.getSvgElement()));
    check(playing === true, 'the studio plays the scene\'s sound');
    await page.click('#btn-sound');
    const off = await page.evaluate(() => ({ on: window.pictogenSound.isEnabled(), plays: window.pictogenSound.play(window.pictogenStudio.getSvgElement()), label: document.getElementById('btn-sound').textContent }));
    check(!off.on && off.plays === false && off.label.includes('🔇'), 'the 🔊 button switches it off (and remembers)');
    await page.click('#btn-sound');

    // A video of the scene carries the sound as an audio track
    const vid = await page.evaluate(async () => {
      const svg = window.pictogenStudio.getSvgElement();
      const blob = await window.pictogenVideo.exportVideo([{ svg, duration: 2 }], { fps: 20 });
      const mute = await window.pictogenVideo.exportVideo([{ svg, duration: 1 }], { fps: 20, sound: false });
      return { type: blob.type, bytes: Array.from(new Uint8Array(await blob.arrayBuffer())), muteBytes: Array.from(new Uint8Array(await mute.arrayBuffer())) };
    });
    const vfile = join(dir, `scene.${vid.type.endsWith('mp4') ? 'mp4' : 'webm'}`);
    writeFileSync(vfile, Buffer.from(vid.bytes));
    const mfile = join(dir, `mute.${vid.type.endsWith('mp4') ? 'mp4' : 'webm'}`);
    writeFileSync(mfile, Buffer.from(vid.muteBytes));
    if (spawnSync('ffprobe', ['-version']).status === 0) {
      const kinds = (f) => JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'json', f], { encoding: 'utf8' }).stdout).streams.map((s) => s.codec_type);
      check(kinds(vfile).includes('audio') && kinds(vfile).includes('video'), `the video has picture and sound (${kinds(vfile).join(' + ')})`);
      check(!kinds(mfile).includes('audio'), 'with sound off, the video is silent');
      if (spawnSync('ffmpeg', ['-version']).status === 0) {
        const vol = spawnSync('ffmpeg', ['-i', vfile, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
        const max = +(vol.match(/max_volume: (-?[\d.]+) dB/)?.[1] ?? -99);
        check(max > -30, `the sound track is audible (peak ${max} dB)`);
      }
    } else check(vid.bytes.length > 10000, 'the video was recorded');

    // The HTML clip export plays its scenes' sound, offline
    const story = composeStory('a girl says "Hello!" | Hello!\na dog jumps | And a dog.');
    const html = generateStoryHtml(story);
    check(html.includes('function pgSound(') && html.includes('function pgSoundTrack(') && html.includes('pg-sound'), 'the HTML export embeds the synthesizer and the scenes\' sound');
    const file = join(dir, 'clip.html');
    writeFileSync(file, html);
    const p2 = await browser.newPage();
    const errs2 = [];
    p2.on('pageerror', (e) => errs2.push(e.message));
    await p2.goto(`file://${file}`);
    await p2.mouse.click(5, 5);
    await p2.waitForTimeout(300);
    const exported = await p2.evaluate(() => ({ track: typeof sceneTrack !== 'undefined' && sceneTrack !== null }));
    check(exported.track && !errs2.length, `the exported clip plays its scene's sound${errs2.length ? ': ' + errs2.join('; ') : ''}`);
    check(!errors.length, `no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
  } finally {
    if (browser) await browser.close();
    server.kill();
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(fails ? `\n${fails} sound check(s) failed` : '\nSound test suite: ALL PASSED!');
process.exit(fails ? 1 : 0);
