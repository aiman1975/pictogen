#!/usr/bin/env node
// PictoGen CLI: Generate vector illustrations from text directly from your terminal.
// Examples:
//   node cli.js "a boy riding a bike under the sun" -o scene.svg
//   node cli.js "apple" --mode card --style cartoon -o apple.svg
//   node cli.js "dog cat bird fish" --mode icons --style neon -o animals.svg
//   node cli.js --export-all ./dist/library

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { generate, listConcepts, renderIcon, renderCard, STYLE_NAMES } from './src/index.js';

const args = process.argv.slice(2);

function getOpt(flag, def = null) {
  const i = args.indexOf(flag);
  if (i >= 0 && i + 1 < args.length) {
    const val = args[i + 1];
    args.splice(i, 2);
    return val;
  }
  return def;
}

function hasFlag(flag) {
  const i = args.indexOf(flag);
  if (i >= 0) {
    args.splice(i, 1);
    return true;
  }
  return false;
}

if (hasFlag('--help') || hasFlag('-h') || (args.length === 0 && !args.includes('--export-all'))) {
  console.log(`
PictoGen - Offline Text-to-Vector Image Generator

Usage:
  node cli.js "<prompt>" [options]
  node cli.js --export-all <dir>

Options:
  -o, --output <file>    Output SVG file path (default: prints to stdout or out.svg)
  -s, --style <style>    Style: flat, cartoon, outline, pastel, silhouette, sketch, neon (default: flat)
  -m, --mode <mode>      Mode: scene, icons, card (default: scene)
  -w, --width <num>      Scene width in px (default: 640)
  -h, --height <num>     Scene height in px (default: 360)
  --seed <val>           Seed for deterministic RNG
  --vary                 Randomize colors/clothing/palettes
  --fuzzy                Enable typo tolerance
  --list                 List all supported concepts & categories
  --export-all <dir>     Export all concepts across all styles into SVG files
`);
  process.exit(0);
}

if (hasFlag('--list')) {
  const all = listConcepts();
  console.log(`Available concepts (${all.length}):\n`);
  const byCat = {};
  for (const c of all) {
    const cat = c.category || 'misc';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(c.id);
  }
  for (const [cat, ids] of Object.entries(byCat)) {
    console.log(`  [${cat.toUpperCase()}] ${ids.join(', ')}`);
  }
  console.log(`\nAvailable styles: ${STYLE_NAMES.join(', ')}`);
  process.exit(0);
}

const exportDir = getOpt('--export-all');
if (exportDir) {
  const target = resolve(process.cwd(), exportDir);
  mkdirSync(target, { recursive: true });
  const all = listConcepts();
  console.log(`Exporting ${all.length} concepts × ${STYLE_NAMES.length} styles to ${target}...`);
  let count = 0;
  for (const c of all) {
    for (const s of STYLE_NAMES) {
      const styleDir = join(target, s);
      mkdirSync(styleDir, { recursive: true });
      const svg = renderIcon(c.id, { style: s, size: 256 });
      writeFileSync(join(styleDir, `${c.id}.svg`), svg, 'utf8');
      count++;
    }
  }
  console.log(`Successfully exported ${count} SVG icons!`);
  process.exit(0);
}

const output = getOpt('-o') || getOpt('--output');
const style = getOpt('-s') || getOpt('--style') || 'flat';
const mode = getOpt('-m') || getOpt('--mode') || 'scene';
const width = +(getOpt('-w') || getOpt('--width') || 640);
const height = +(getOpt('-h') || getOpt('--height') || 360);
const seed = getOpt('--seed') || 1;
const vary = hasFlag('--vary');
const fuzzy = hasFlag('--fuzzy');

const text = args.join(' ');
if (!text) {
  console.error('Error: Please provide text to generate an image.');
  process.exit(1);
}

const result = generate(text, { style, mode, width, height, seed, vary, fuzzy });

console.log(`Prompt  : "${text}"`);
console.log(`Matched : ${result.matches.map((m) => `${m.id}${m.color ? ` (${m.color})` : ''} ×${m.count}`).join(', ') || 'none'}`);
if (result.unknown.length) {
  console.log(`Unknown : ${result.unknown.join(', ')}`);
}

if (output) {
  const dest = resolve(process.cwd(), output);
  writeFileSync(dest, result.svg, 'utf8');
  console.log(`Saved   : ${dest}`);
} else {
  const dest = resolve(process.cwd(), 'out.svg');
  writeFileSync(dest, result.svg, 'utf8');
  console.log(`Saved   : ${dest}`);
}
