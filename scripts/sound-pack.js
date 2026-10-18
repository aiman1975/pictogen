#!/usr/bin/env node
// The sound pack tool (src/sound-pack.js): add recorded or generated files, see what is missing,
// check that every file has a source and a license on record.
//
//   npm run sound-pack -- status
//   npm run sound-pack -- import <folder> --source "..." --license "..."   (files named by slot)
//   npm run sound-pack -- add <file> <slot> --source "..." --license "..." [--notes "..."]
//   npm run sound-pack -- remove <pack file, e.g. voices/kid/ooh-1.mp3>
//   npm run sound-pack -- check            (exit code 1 when something is wrong)
//   npm run sound-pack -- list [--md]      (every slot with its prompt; --md: docs/SOUND_PACK.md)
//   --dir <folder>                         another pack folder (default public/audio/pack)
//   --raw                                  keep files as they are (no trimming or converting)
//
// With ffmpeg installed, files are prepared as they come in: silence cut from the start and end
// (a sound must begin at once, or it lags the picture), cut to a sensible length, levelled
// (effects and voices to a -3 dB peak, music to -16 LUFS) and saved as MP3, mono except music.

import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { join, extname, basename, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { PACK_DIR, CATALOGUE, AUDIO_TYPES, readPack, packStatus, slotOf, slotFromName, catalogueMarkdown } from '../src/sound-pack.js';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(`--${name}`); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v ?? ''; };
const dir = flag('dir') || PACK_DIR;
const source = flag('source');
const license = flag('license');
const notes = flag('notes');
const switches = new Set(args.filter((a) => a === '--md' || a === '--raw'));
const [cmd, ...rest] = args.filter((a) => !switches.has(a));
const raw = switches.has('--raw');

const manifestPath = join(dir, 'manifest.json');
const loadManifest = () => (existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { files: [] });
const saveManifest = (m) => {
  m.files.sort((a, b) => a.file.localeCompare(b.file));
  writeFileSync(manifestPath, JSON.stringify(m, null, 2) + '\n');
};
const fail = (msg) => { console.error(`sound-pack: ${msg}`); process.exit(1); };
const needRecord = () => {
  if (!source?.trim()) fail('--source is required: who or what made it (tool, plan, date)');
  if (!license?.trim()) fail('--license is required: what allows shipping it (e.g. "own recording", "Gemini paid plan: commercial use, terms saved 2026-10-20")');
};

// ---- Preparing a file with ffmpeg ---------------------------------------------------------------
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const ffmpeg = (...a) => spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-y', ...a], { encoding: 'utf8' });
const durationOf = (file) => +(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout || 0);
// The longest a slot's file may be (longer ones are cut, with a short fade)
const maxSeconds = (c) => (c.music ? 180 : c.sound === 'snore' ? 6 : c.sound === 'syl' || c.sound === 'steps' ? 0.6 : Math.max(1.5, c.seconds * 2.5));

/** A prepared copy of `file` for slot `c` (in `work`), or the file itself when it can't be prepared */
function prepare(file, c, work) {
  if (raw || !hasFfmpeg) return { file, note: null };
  const trimmed = join(work, 'trimmed.wav');
  const cut = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.01';
  // Silence off both ends (the end by reversing)
  let r = ffmpeg('-i', file, '-af', `${cut},areverse,${cut},areverse`, '-ar', '44100', ...(c.music ? ['-ac', '2'] : ['-ac', '1']), trimmed);
  if (r.status !== 0 || !existsSync(trimmed)) return { file, note: null, warn: `could not read with ffmpeg; kept as is` };
  const length = durationOf(trimmed);
  if (length < 0.03) return { skip: 'silent (nothing left after cutting the silence)' };
  const max = maxSeconds(c);
  const filters = [];
  if (length > max) filters.push(`atrim=0:${max}`, `afade=t=out:st=${Math.max(0, max - 0.05)}:d=0.05`);
  const out = join(work, 'prepared.mp3');
  if (c.music) {
    filters.push('loudnorm=I=-16:TP=-1.5:LRA=11');
  } else {
    // Peak to -3 dB
    const vol = ffmpeg('-i', trimmed, '-af', 'volumedetect', '-f', 'null', '-').stderr;
    const peak = +(vol.match(/max_volume: (-?[\d.]+) dB/)?.[1] ?? -3);
    filters.push(`volume=${(-3 - peak).toFixed(2)}dB`);
  }
  r = ffmpeg('-i', trimmed, '-af', filters.join(','), '-c:a', 'libmp3lame', '-b:a', c.music ? '192k' : '160k', out);
  if (r.status !== 0) return { file, note: null, warn: 'could not convert; kept as is' };
  return { file: out, note: `prepared from ${basename(file)} (${length.toFixed(2)} s after trimming silence${length > max ? `, cut to ${max} s` : ''}, levelled, MP3)` };
}

/** Puts a file into the pack for slot `c`, on record; returns its name in the pack */
function addFile(m, file, c, extraNotes) {
  const work = mkdtempSync(join(tmpdir(), 'pictogen-sound-'));
  try {
    const p = prepare(file, c, work);
    if (p.skip) return { skip: p.skip };
    const ext = extname(p.file).toLowerCase();
    const stem = c.music ? c.music : c.sound === 'syl' ? `syl-${c.vowel}` : c.sound;
    let n = 1;
    while (m.files.some((e) => e.file.startsWith(`${c.dir}/${stem}-${n}.`)) || existsSync(join(dir, c.dir, `${stem}-${n}${ext}`))) n++;
    const name = `${c.dir}/${stem}-${n}${ext}`;
    mkdirSync(join(dir, c.dir), { recursive: true });
    copyFileSync(p.file, join(dir, name));
    const allNotes = [p.note, extraNotes, notes].filter(Boolean).join('; ');
    m.files.push({
      file: name,
      ...(c.music ? { music: c.music } : { sound: c.sound }),
      ...(c.voice ? { voice: c.voice } : {}),
      ...(c.vowel ? { vowel: c.vowel } : {}),
      source: source.trim(),
      license: license.trim(),
      made: new Date().toISOString().slice(0, 10),
      ...(allNotes ? { notes: allNotes } : {}),
    });
    return { name, warn: p.warn };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

const newManifest = () => {
  const m = loadManifest();
  m.about ??= 'PictoGen sound pack: each file with its source and license (docs/SOUND_PACK.md, docs/LICENSE_AUDIT.md)';
  return m;
};

if (cmd === 'add') {
  const [file, slot] = rest;
  if (!file || !slot) fail('usage: add <file> <slot> --source "..." --license "..."  (slots: npm run sound-pack -- list)');
  const c = slotOf(slot);
  if (!c) fail(`unknown slot "${slot}" (see: npm run sound-pack -- list)`);
  if (!existsSync(file)) fail(`no such file: ${file}`);
  if (!AUDIO_TYPES[extname(file).toLowerCase()]) fail(`${basename(file)}: use ${Object.keys(AUDIO_TYPES).join(' ')}`);
  needRecord();
  const m = newManifest();
  const r = addFile(m, file, c);
  if (r.skip) fail(`${basename(file)}: ${r.skip}`);
  saveManifest(m);
  console.log(`added ${r.name} (${slot})${r.warn ? ` - ${r.warn}` : ''}`);
} else if (cmd === 'import') {
  // A folder of files named by slot: kid-ooh.mp3, kid-syl-a-2.wav, woof.mp3, music-kids.mp3 (or
  // in folders: kid/ooh.mp3, music/kids.mp3). An optional prompts.txt ("kid-ooh: <prompt>" per
  // line) goes on record with each file.
  const [folder] = rest;
  if (!folder || !existsSync(folder) || !statSync(folder).isDirectory()) fail('usage: import <folder> --source "..." --license "..."');
  needRecord();
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((x) => (x.isDirectory() ? walk(join(d, x.name)) : [join(d, x.name)]));
  const prompts = new Map();
  const promptFile = ['prompts.txt', 'PROMPTS.txt', 'prompts.md'].map((f) => join(folder, f)).find(existsSync);
  if (promptFile) {
    for (const line of readFileSync(promptFile, 'utf8').split(/\r?\n/)) {
      const at = line.indexOf(':');
      if (at > 0) prompts.set(line.slice(0, at).trim().toLowerCase().replace(/\.[a-z0-9]+$/, ''), line.slice(at + 1).trim());
    }
  }
  const m = newManifest();
  const added = [], skipped = [];
  for (const f of walk(folder).sort()) {
    const rel = relative(folder, f).split('\\').join('/');
    if (!AUDIO_TYPES[extname(f).toLowerCase()]) {
      if (!/^prompts\.(txt|md)$/i.test(rel) && !/(^|\/)\./.test(rel)) skipped.push(`${rel}: not an audio file`);
      continue;
    }
    const slot = slotFromName(rel);
    const c = slot && slotOf(slot);
    if (!c) { skipped.push(`${rel}: no slot by that name${slot ? ` ("${slot}")` : ''} - see docs/SOUND_PACK.md`); continue; }
    const stem = rel.toLowerCase().replace(/\.[a-z0-9]+$/, '');
    const prompt = prompts.get(stem) ?? prompts.get(basename(stem));
    const r = addFile(m, f, c, prompt ? `prompt: ${prompt}` : null);
    if (r.skip) skipped.push(`${rel}: ${r.skip}`);
    else added.push(`${rel} -> ${r.name}${r.warn ? ` (${r.warn})` : ''}`);
  }
  saveManifest(m);
  for (const a of added) console.log(`✓ ${a}`);
  for (const s of skipped) console.log(`· skipped ${s}`);
  console.log(`\nimported ${added.length} file(s)${skipped.length ? `, skipped ${skipped.length}` : ''}${!hasFfmpeg && !raw ? ' (ffmpeg not found: files kept as they were)' : ''}`);
} else if (cmd === 'remove') {
  const [file] = rest;
  const m = loadManifest();
  const i = m.files.findIndex((e) => e.file === file);
  if (i < 0) fail(`${file} is not in the manifest`);
  m.files.splice(i, 1);
  saveManifest(m);
  if (existsSync(join(dir, file))) rmSync(join(dir, file));
  console.log(`removed ${file}`);
} else if (cmd === 'check') {
  const { files, problems } = readPack(dir);
  for (const p of problems) console.log(`✗ ${p}`);
  console.log(problems.length ? `\n${problems.length} problem(s) in the sound pack` : `✓ sound pack OK: ${files.length} file(s), each with a source and a license`);
  process.exit(problems.length ? 1 : 0);
} else if (cmd === 'list') {
  if (switches.has('--md')) process.stdout.write(catalogueMarkdown(packStatus(readPack(dir))));
  else for (const c of CATALOGUE) console.log(`${c.slot.padEnd(14)} ${c.what}\n${''.padEnd(14)} prompt: ${c.prompt}\n`);
} else if (cmd === 'status' || !cmd) {
  const pack = readPack(dir);
  const have = packStatus(pack);
  const groups = [['Voices: kid', (c) => c.voice === 'kid'], ['Voices: woman', (c) => c.voice === 'woman'], ['Voices: man', (c) => c.voice === 'man'], ['Animals', (c) => c.dir === 'animals'], ['Effects', (c) => c.dir === 'effects'], ['Music', (c) => c.music]];
  for (const [title, pred] of groups) {
    const items = CATALOGUE.filter(pred);
    const got = items.filter((c) => have.get(c.slot));
    console.log(`${title}: ${got.length}/${items.length}  ${items.map((c) => `${have.get(c.slot) ? '✓' : '·'}${c.slot.split('/').pop()}${have.get(c.slot) > 1 ? `×${have.get(c.slot)}` : ''}`).join(' ')}`);
  }
  const filled = CATALOGUE.filter((c) => have.get(c.slot)).length;
  console.log(`\n${filled}/${CATALOGUE.length} slots have files; the rest are synthesized.${pack.problems.length ? `\n${pack.problems.length} problem(s): npm run sound-pack -- check` : ''}`);
} else {
  fail(`unknown command "${cmd}" (status, import, add, remove, check, list)`);
}
