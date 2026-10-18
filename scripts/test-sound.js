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
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generate, generateStoryHtml, composeStory, lipKeys, parseTimeline } from '../src/index.js';
import { voiceOf, soundOf, SOUND_NAMES, actionCues } from '../src/sound.js';
import { babbleNotes } from '../src/speech.js';
import { readPack, packForClip, packStatus, CATALOGUE, slotFromName, slotOf } from '../src/sound-pack.js';

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

// 4. The sound pack: files listed with a source and a license, the tool adds them, a clip's export
// carries the ones it uses
const tone = (hz, seconds, rate = 22050, silence = 0) => {
  const lead = Math.round(silence * rate);
  const n = Math.round(seconds * rate) + lead, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = lead; i < n; i++) b.writeInt16LE(Math.round(Math.sin((2 * Math.PI * hz * i) / rate) * 16000 * Math.min(1, (n - i) / 200)), 44 + i * 2);
  return b;
};
const repoPack = readPack();
check(!repoPack.problems.length, `the shipped sound pack is clean: every file listed with a source and a license${repoPack.problems.length ? ': ' + repoPack.problems.join('; ') : ''}`);
check(CATALOGUE.length === 70 && CATALOGUE.some((c) => c.slot === 'kid/syl-a') && CATALOGUE.some((c) => c.slot === 'music/documentary'), `the catalogue lists ${CATALOGUE.length} slots (voices, syllables, animals, effects, music)`);
const packDir = mkdtempSync(join(tmpdir(), 'pictogen-pack-'));
const srcDir = mkdtempSync(join(tmpdir(), 'pictogen-src-'));
const tool = (...a) => spawnSync(process.execPath, ['scripts/sound-pack.js', ...a, '--dir', packDir], { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8' });
const add = (name, hz, seconds, slot, extra = ['--source', 'test tone', '--license', 'own work']) => {
  writeFileSync(join(srcDir, name), tone(hz, seconds));
  return tool('add', join(srcDir, name), slot, ...extra);
};
check(add('ooh.wav', 1000, 0.5, 'woman/ooh').status === 0 && add('a.wav', 800, 0.3, 'kid/syl-a').status === 0 && add('step.wav', 300, 0.1, 'steps').status === 0
  && add('kids.wav', 440, 2, 'music/kids').status === 0 && add('woof.wav', 600, 0.3, 'woof').status === 0, 'the tool adds files to their slots');
check(add('x.wav', 500, 0.2, 'kid/ooh', ['--source', 'someone']).status !== 0, 'a file without a license is refused');
check(add('x.wav', 500, 0.2, 'kid/sing', ['--source', 'a', '--license', 'b']).status !== 0, 'an unknown slot is refused');
const tmpPack = readPack(packDir);
check(tmpPack.files.length === 5 && tmpPack.files.some((e) => /^voices\/woman\/ooh-1\.(wav|mp3)$/.test(e.file) && e.voice === 'woman' && e.sound === 'ooh' && e.license === 'own work' && /^\d{4}-\d\d-\d\d$/.test(e.made)), 'each file goes on record: slot, source, license, date');
check(tool('check').status === 0 && !tmpPack.problems.length, 'a pack made with the tool checks clean');
check(packStatus(tmpPack).get('kid/syl-a') === 1 && packStatus(tmpPack).get('music/kids') === 1, 'status counts the files per slot');
writeFileSync(join(packDir, 'effects', 'stray.wav'), tone(200, 0.1));
check(/stray\.wav: in the pack folder but not in manifest/.test(readPack(packDir).problems.join('\n')) && tool('check').status === 1, 'a file put there without the tool fails the check (no license on record)');
rmSync(join(packDir, 'effects', 'stray.wav'));
const forClip = packForClip([soundOf(generate('a woman looks surprised, then a dog runs to her').svg)], { genre: 'kids', dir: packDir });
const kinds = forClip.map((e) => e.music ? `music:${e.music}` : e.sound).sort();
check(kinds.join(',') === 'music:kids,ooh,steps,woof' && forClip.every((e) => /^audio\/(wav|mpeg)$/.test(e.type) && e.data.length > 100), `a clip's export carries just the files it uses (${kinds.join(', ')})`);
check(packForClip([], { genre: 'news', dir: packDir }).length === 0, 'and nothing it does not use');

// A folder of downloads, named by slot, imported at once: silence cut, levelled, MP3, on record
const names = { 'kid-ooh.mp3': 'kid/ooh', 'Kid_Syl_A (2).wav': 'kid/syl-a', 'music/kids.wav': 'music/kids', 'child-giggle.m4a': 'kid/giggle', 'woof-3.wav': 'woof', 'bogus.wav': 'bogus' };
check(Object.entries(names).every(([n, slot]) => slotFromName(n) === slot) && !slotOf(slotFromName('bogus.wav')), 'file names map to slots ("Kid_Syl_A (2).wav" -> kid/syl-a, "music/kids.wav" -> music/kids)');
const inbox = mkdtempSync(join(tmpdir(), 'pictogen-inbox-'));
const ffmpegHere = spawnSync('ffmpeg', ['-version']).status === 0;
mkdirSync(join(inbox, 'music'));
writeFileSync(join(inbox, 'kid-syl-e-2.wav'), tone(700, 0.3, 22050, 0.6));
writeFileSync(join(inbox, 'music', 'news.wav'), tone(220, 3));
writeFileSync(join(inbox, 'bogus.wav'), tone(300, 0.2));
writeFileSync(join(inbox, 'prompts.txt'), 'kid-syl-e-2: A cute child saying "beh"\n');
const imp = tool('import', inbox, '--source', 'Gemini, paid plan, 2026-10-20', '--license', 'commercial use per plan terms');
const after = readPack(packDir);
const syl = after.files.find((e) => e.voice === 'kid' && e.vowel === 'e');
const news = after.files.find((e) => e.music === 'news');
check(imp.status === 0 && syl && news && /skipped bogus\.wav: no slot/.test(imp.stdout), `import puts each file in its slot and skips unknown names (${after.files.length - tmpPack.files.length} imported)`);
check(syl && /beh/.test(syl.notes || '') && syl.source.startsWith('Gemini'), 'the prompt and source go on record with the file');
if (ffmpegHere && syl) {
  const dur = +spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', join(packDir, syl.file)], { encoding: 'utf8' }).stdout;
  const peak = +(spawnSync('ffmpeg', ['-i', join(packDir, syl.file), '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr.match(/max_volume: (-?[\d.]+) dB/)?.[1] ?? -99);
  check(syl.file.endsWith('.mp3') && dur < 0.5 && Math.abs(peak + 3) < 1.5, `imports are prepared: leading silence cut (${dur.toFixed(2)} s from 0.9 s), peak ${peak} dB, MP3`);
}
check(readPack(packDir).problems.length === 0, 'the pack still checks clean after the import');
rmSync(inbox, { recursive: true, force: true });

// 5. In a real browser
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
    // The pack in the synthesizer: its files replace sounds, pitched to the voice; babble sings syllable files
    const packEntries = readPack(packDir).files.map((e) => ({ ...e, b64: readFileSync(join(packDir, e.file)).toString('base64') }));
    const played = await page.evaluate(async ({ entries, notes }) => {
      const { pgSound, pgBank, pgMusicRender } = await import('/js/sound-synth.js');
      const dec = new OfflineAudioContext(1, 1, 44100);
      const bank = pgBank(await Promise.all(entries.map(async (e) => ({ ...e, buffer: await dec.decodeAudioData(Uint8Array.from(atob(e.b64), (c) => c.charCodeAt(0)).buffer) }))));
      const render = async (fn, seconds = 1.5) => {
        const ctx = new OfflineAudioContext(1, Math.round(44100 * seconds), 44100);
        fn(ctx);
        return (await ctx.startRendering()).getChannelData(0);
      };
      // Pitch from zero crossings over the loud part
      const hz = (d, from = 0, to = d.length) => {
        let zc = 0, n = 0;
        for (let i = from + 1; i < to; i += 32) {
          let peak = 0;
          for (let j = i; j < Math.min(to, i + 32); j++) peak = Math.max(peak, Math.abs(d[j]));
          if (peak < 0.02) continue; // count only where it sounds
          n += 32;
          for (let j = i; j < Math.min(to, i + 32); j++) if ((d[j] >= 0) !== (d[j - 1] >= 0)) zc++;
        }
        return n ? (zc / 2) / (n / 44100) : 0;
      };
      const rms = (d, a, b) => { let s = 0; for (let i = a; i < b; i++) s += d[i] * d[i]; return Math.sqrt(s / (b - a)); };
      const woman = hz(await render((c) => pgSound(c, c.destination, { s: 'ooh', v: 'woman', p: 1 }, 0, bank)));
      const kid = hz(await render((c) => pgSound(c, c.destination, { s: 'ooh', v: 'kid', p: 1 }, 0, bank)));
      const man = await render((c) => pgSound(c, c.destination, { s: 'ooh', v: 'man', p: 1 }, 0, bank));
      const babble = hz(await render((c) => pgSound(c, c.destination, { s: 'babble', v: 'kid', p: 1, n: notes }, 0, bank), 2.5));
      const steps = hz(await render((c) => pgSound(c, c.destination, { s: 'steps', d: 1 }, 0, bank)));
      const happy = hz(await render((c) => pgSound(c, c.destination, { s: 'woof', p: 1, m: 'happy' }, 0, bank)));
      const loop = await render((c) => pgMusicRender(c, c.destination, 'kids', bank, 0, 5, 0.5), 5);
      // A longer file fades into its next repeat: no gap where it starts again
      const long = await dec.decodeAudioData(Uint8Array.from(atob(entries.find((e) => e.music === 'kids').b64), (c) => c.charCodeAt(0)).buffer);
      const ctx8 = new OfflineAudioContext(1, 44100 * 2, 44100);
      const eight = ctx8.createBuffer(1, 44100 * 8, 44100);
      for (let i = 0; i < eight.length; i++) eight.getChannelData(0)[i] = long.getChannelData(0)[i % long.length] * 0.5;
      const { pgMusicLoop } = await import('/js/sound-synth.js');
      const seam = await render((c) => pgMusicLoop(c, c.destination, eight, 0, 0, 20), 20);
      const synth = await render((c) => { const duck = pgMusicRender(c, c.destination, 'news', null, 0, 6, 0.5); duck(3, 1.5); }, 6);
      return { woman, kid, manHz: hz(man), babble, steps, happy, loopHz: hz(loop, 44100, 44100 * 4), loudBefore: rms(synth, 44100 * 1.5, 44100 * 3), loudDucked: rms(synth, Math.round(44100 * 3.3), Math.round(44100 * 4.4)), seam: [6, 7, 7.3, 7.6, 13, 14.6, 14.9].map((t) => rms(seam, Math.round(44100 * t), Math.round(44100 * (t + 0.2)))) };
    }, { entries: packEntries, notes: babbleNotes('Hello Mia, how are you?') });
    check(Math.abs(played.woman - 1000) < 40, `a pack file replaces the synthesized sound (woman's "ooh" plays its file: ${played.woman.toFixed(0)} Hz)`);
    check(Math.abs(played.kid / played.woman - 300 / 215) < 0.06, `a child without a file of its own borrows the woman's, pitched up (${played.kid.toFixed(0)} Hz)`);
    check(Math.abs(played.manHz - 1000) > 100, 'a man is not pitched from a woman\'s file (too far): synthesized instead');
    check(Math.abs(played.babble / 800 - 1) < 0.15, `talking sings the syllable files (${played.babble.toFixed(0)} Hz around the syllable's 800)`);
    check(Math.abs(played.steps - 300) < 30, `footsteps play the step file in rhythm (${played.steps.toFixed(0)} Hz)`);
    check(played.happy > 600 * 1.05, `a happy dog's woof is higher (${played.happy.toFixed(0)} Hz from a 600 Hz file)`);
    check(Math.abs(played.loopHz - 440) < 20, `a genre's music file loops under the clip (${played.loopHz.toFixed(0)} Hz)`);
    check(Math.min(...played.seam) > Math.max(...played.seam) * 0.6, `repeats crossfade: no gap where the music starts again (${played.seam.map((v) => v.toFixed(2)).join(' ')})`);
    check(played.loudBefore > 0.005 && played.loudDucked < played.loudBefore * 0.6, `the music ducks while someone speaks (${played.loudBefore.toFixed(3)} -> ${played.loudDucked.toFixed(3)})`);

    // Synthesized music for every genre
    const genres = await page.evaluate(async () => {
      const { pgMusicRender } = await import('/js/sound-synth.js');
      const out = {};
      for (const g of ['kids', 'news', 'documentary', 'howto']) {
        const ctx = new OfflineAudioContext(1, 44100 * 6, 44100);
        pgMusicRender(ctx, ctx.destination, g, null, 0, 6, 0.5);
        const d = (await ctx.startRendering()).getChannelData(0);
        let s = 0, peak = 0, bad = 0;
        for (const v of d) { if (!Number.isFinite(v)) bad++; s += v * v; peak = Math.max(peak, Math.abs(v)); }
        out[g] = { rms: Math.sqrt(s / d.length), peak, bad };
      }
      return out;
    });
    check(Object.values(genres).every((g) => g.rms > 0.01 && g.peak < 1 && !g.bad), `music for every genre: ${Object.entries(genres).map(([g, v]) => `${g} ${v.rms.toFixed(3)}`).join(', ')}`);

    // The studio's clip music, and a clip video with music under silent scenes
    const studioMusic = await page.evaluate(async () => {
      const s = window.pictogenSound;
      const on = s.startMusic('documentary') && s.isMusicPlaying();
      s.setMusic(false);
      const off = !s.isMusicPlaying() && !s.startMusic('kids');
      s.setMusic(true);
      s.stopMusic();
      const res = await fetch('/api/story/generate', { method: 'POST', body: JSON.stringify({ text: 'a red apple | An apple.\na blue car | A car.' }) });
      const story = await res.json();
      const mounted = story.scenes.map((sc) => window.pictogenVideo.mountOffscreen(sc.svg));
      try {
        const shots = story.scenes.map((sc, i) => ({ svg: mounted[i].svg, duration: 1, scene: sc }));
        const blob = await window.pictogenVideo.exportVideo(shots, { fps: 15, genre: 'news', music: true });
        return { on, off, type: blob.type, bytes: Array.from(new Uint8Array(await blob.arrayBuffer())) };
      } finally { mounted.forEach((m) => m.remove()); }
    });
    check(studioMusic.on && studioMusic.off, 'the studio plays a clip\'s music; its switch turns it off');
    const mvid = join(dir, `music.${studioMusic.type.endsWith('mp4') ? 'mp4' : 'webm'}`);
    writeFileSync(mvid, Buffer.from(studioMusic.bytes));
    if (spawnSync('ffmpeg', ['-version']).status === 0) {
      const vol = spawnSync('ffmpeg', ['-i', mvid, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
      const mean = +(vol.match(/mean_volume: (-?[\d.]+) dB/)?.[1] ?? -99);
      check(mean > -45, `a clip video carries the genre's music, even under silent scenes (mean ${mean} dB)`);
    }

    // The HTML export with a pack: carries the files, plays them and the music
    const packed = generateStoryHtml(story, { pack: packForClip(story.scenes.map((sc) => soundOf(sc.svg)), { genre: story.genre, dir: packDir }) });
    const pfile = join(dir, 'packed.html');
    writeFileSync(pfile, packed);
    const p3 = await browser.newPage();
    const errs3 = [];
    p3.on('pageerror', (e) => errs3.push(e.message));
    await p3.goto(`file://${pfile}`);
    await p3.mouse.click(5, 5);
    await p3.waitForTimeout(800);
    const pk = await p3.evaluate(() => ({ bank: bank && bank.size, music: !!musicTrack, music2: (document.getElementById('btn-music').click(), !musicTrack) }));
    check(pk.bank > 0 && pk.music && pk.music2 && !errs3.length, `the exported clip plays the pack's files (${pk.bank}) and its music, with a music switch${errs3.length ? ': ' + errs3.join('; ') : ''}`);
    check(!errors.length, `no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
  } finally {
    if (browser) await browser.close();
    server.kill();
    rmSync(dir, { recursive: true, force: true });
  }
}
rmSync(packDir, { recursive: true, force: true });
rmSync(srcDir, { recursive: true, force: true });

console.log(fails ? `\n${fails} sound check(s) failed` : '\nSound test suite: ALL PASSED!');
process.exit(fails ? 1 : 0);
