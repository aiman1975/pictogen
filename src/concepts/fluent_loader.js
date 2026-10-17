// Loader for the MIT-licensed 3,174+ vector icon library.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = resolve(__dirname, '../data/fluent-emoji-flat.json');

function cleanWord(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function detectPlacement(id, cat = '') {
  const s = id.toLowerCase();
  if (['sun', 'moon', 'star', 'cloud', 'rainbow', 'comet', 'crescent'].some((w) => s.includes(w))) return 'sky';
  if (['airplane', 'plane', 'rocket', 'helicopter', 'flying', 'bird', 'eagle', 'bat', 'butterfly', 'balloon', 'kite'].some((w) => s.includes(w))) return 'air';
  if (['fish', 'shark', 'whale', 'dolphin', 'octopus', 'squid', 'lobster', 'crab'].some((w) => s.includes(w))) return 'underwater';
  if (['boat', 'ship', 'sailboat', 'ferry', 'canoe', 'yacht'].some((w) => s.includes(w))) return 'water';
  if (['mountain', 'volcano', 'castle', 'pyramid', 'stadium', 'building'].some((w) => s.includes(w))) return 'background';
  return 'ground';
}

function detectScale(id, cat = '') {
  const s = id.toLowerCase();
  if (cat.includes('Food') || ['apple', 'cookie', 'pizza', 'cup', 'ring', 'gem', 'coin', 'key'].some((w) => s.includes(w))) return 0.25;
  if (['guitar', 'backpack', 'book', 'chair', 'ball', 'lamp', 'box', 'clock'].some((w) => s.includes(w))) return 0.38;
  if (['mountain', 'castle', 'building', 'tree'].some((w) => s.includes(w))) return 2.0;
  if (['car', 'bus', 'train', 'truck', 'elephant', 'horse', 'dinosaur'].some((w) => s.includes(w))) return 1.1;
  return 0.55;
}

export function loadFluentConcepts() {
  if (!existsSync(JSON_PATH)) return [];

  const raw = readFileSync(JSON_PATH, 'utf8');
  const data = JSON.parse(raw);
  const out = [];

  // Build category mapping
  const catMap = {};
  if (data.categories) {
    for (const [catName, iconKeys] of Object.entries(data.categories)) {
      for (const k of iconKeys) catMap[k] = catName;
    }
  }

  const icons = data.icons || {};
  for (const [key, icon] of Object.entries(icons)) {
    if (!icon || !icon.body) continue;

    const cat = catMap[key] || 'Objects';
    const id = key.replace(/-/g, '_');
    const label = key.replace(/-/g, ' ');

    const aliases = new Set();
    aliases.add(label);
    const noHyphen = key.replace(/-/g, '');
    if (noHyphen !== key) aliases.add(noHyphen);

    // Extract root word aliases (e.g. "acoustic guitar" -> also matches "guitar" if free)
    const words = label.split(' ');
    if (words.length > 1) {
      aliases.add(words[words.length - 1]);
    }

    const placement = detectPlacement(key, cat);
    const scale = detectScale(key, cat);

    out.push({
      id,
      label,
      aliases: [...aliases],
      category: cat.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      placement,
      scale,
      width: 0.8,
      baseline: 92,
      colors: { main: '#42a5f5' },
      isLibrary: true,
      draw(d) {
        // Fluent Emoji viewbox is 32x32, scale to 100x100
        d.raw(`<g transform="scale(3.125)">${icon.body}</g>`);
      },
    });
  }

  return out;
}
