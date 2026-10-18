#!/usr/bin/env node
// The sound pack tool (src/sound-pack.js): add recorded or generated files, see what is missing,
// check that every file has a source and a license on record.
//
//   npm run sound-pack -- status
//   npm run sound-pack -- add <file> <slot> --source "..." --license "..." [--notes "..."]
//   npm run sound-pack -- remove <pack file, e.g. voices/kid/ooh-1.mp3>
//   npm run sound-pack -- check            (exit code 1 when something is wrong)
//   npm run sound-pack -- list [--md]      (every slot with its prompt; --md: docs/SOUND_PACK.md)
//   --dir <folder>                         another pack folder (default public/audio/pack)

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { PACK_DIR, CATALOGUE, AUDIO_TYPES, readPack, packStatus, slotOf, catalogueMarkdown } from '../src/sound-pack.js';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(`--${name}`); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v ?? ''; };
const dir = flag('dir') || PACK_DIR;
const source = flag('source');
const license = flag('license');
const notes = flag('notes');
const md = args.includes('--md');
const [cmd, ...rest] = args.filter((a) => a !== '--md');

const manifestPath = join(dir, 'manifest.json');
const loadManifest = () => (existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { files: [] });
const saveManifest = (m) => {
  m.files.sort((a, b) => a.file.localeCompare(b.file));
  writeFileSync(manifestPath, JSON.stringify(m, null, 2) + '\n');
};
const fail = (msg) => { console.error(`sound-pack: ${msg}`); process.exit(1); };

if (cmd === 'add') {
  const [file, slot] = rest;
  if (!file || !slot) fail('usage: add <file> <slot> --source "..." --license "..."  (slots: npm run sound-pack -- list)');
  const c = slotOf(slot);
  if (!c) fail(`unknown slot "${slot}" (see: npm run sound-pack -- list)`);
  if (!existsSync(file)) fail(`no such file: ${file}`);
  const ext = extname(file).toLowerCase();
  if (!AUDIO_TYPES[ext]) fail(`${basename(file)}: use ${Object.keys(AUDIO_TYPES).join(' ')}`);
  if (!source?.trim()) fail('--source is required: who or what made it (tool, plan, prompt)');
  if (!license?.trim()) fail('--license is required: what allows shipping it (e.g. "own recording", "ElevenLabs paid plan: commercial use")');
  const m = loadManifest();
  m.about ??= 'PictoGen sound pack: each file with its source and license (docs/SOUND_PACK.md, docs/LICENSE_AUDIT.md)';
  const stem = c.music ? c.music : c.sound === 'syl' ? `syl-${c.vowel}` : c.sound;
  let n = 1;
  while (m.files.some((e) => e.file.startsWith(`${c.dir}/${stem}-${n}.`)) || existsSync(join(dir, c.dir, `${stem}-${n}${ext}`))) n++;
  const name = `${c.dir}/${stem}-${n}${ext}`;
  mkdirSync(join(dir, c.dir), { recursive: true });
  copyFileSync(file, join(dir, name));
  const entry = {
    file: name,
    ...(c.music ? { music: c.music } : { sound: c.sound }),
    ...(c.voice ? { voice: c.voice } : {}),
    ...(c.vowel ? { vowel: c.vowel } : {}),
    source: source.trim(),
    license: license.trim(),
    made: new Date().toISOString().slice(0, 10),
    ...(notes ? { notes } : {}),
  };
  m.files.push(entry);
  saveManifest(m);
  console.log(`added ${name} (${slot})`);
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
  if (md) process.stdout.write(catalogueMarkdown(packStatus(readPack(dir))));
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
  fail(`unknown command "${cmd}" (status, add, remove, check, list)`);
}
