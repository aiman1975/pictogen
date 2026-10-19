// Loader for the MIT-licensed 3,174+ vector icon library.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = resolve(__dirname, '../data/fluent-emoji-flat.json');

// Skin-tone variants ("artist-dark", "woman-rowing-boat-medium-light") of a base icon.
const TONE_RE = /-(medium-dark|medium-light|dark|light|medium)$/;

// Generic last words shared by many icons ("face", "heart", ...) map to one obvious default;
// other last words become aliases only when a single icon ends with them ("turn right" must not
// draw an arrow, "light rain" must not draw "artist-light").
const CANONICAL_LAST_WORD = {
  face: 'smiling-face',
  heart: 'red-heart',
  hand: 'raised-hand',
  hands: 'raising-hands',
  circle: 'red-circle',
};
const MAX_SHARED_LAST_WORD = 1;
// Backdrop words handled by the scene composer (src/scene.js ENV_WORDS) never become icon aliases.
const SETTING_LAST_WORDS = new Set(['night', 'rain', 'snow', 'water', 'sea', 'beach', 'sand', 'room', 'office', 'park', 'garden', 'street', 'road']);

const hasWord = (tokens, words) => words.some((w) => tokens.includes(w));

function detectPlacement(key, cat = '') {
  const t = key.toLowerCase().split('-');
  // People/flags/symbols stand on the ground even when named after the sky ("man-mountain-biking").
  if (/people|flag|symbol|smiley/i.test(cat)) return 'ground';
  if (hasWord(t, ['sun', 'moon', 'star', 'stars', 'cloud', 'rainbow', 'comet', 'crescent'])) return 'sky';
  if (hasWord(t, ['airplane', 'plane', 'rocket', 'helicopter', 'flying', 'bird', 'eagle', 'bat', 'butterfly', 'balloon', 'kite', 'saucer'])) return 'air';
  if (hasWord(t, ['fish', 'blowfish', 'shark', 'whale', 'dolphin', 'octopus', 'squid', 'lobster', 'crab', 'jellyfish'])) return 'underwater';
  if (hasWord(t, ['boat', 'ship', 'sailboat', 'ferry', 'canoe', 'yacht', 'speedboat'])) return 'water';
  if (hasWord(t, ['mountain', 'volcano', 'castle', 'pyramid', 'stadium', 'building'])) return 'background';
  return 'ground';
}

function detectScale(key, cat = '') {
  const t = key.toLowerCase().split('-');
  // People (a teacher, a superhero, a cook) stand about as tall as the hand-drawn people beside
  // them; hands and gestures stay small
  if (/people/i.test(cat) && hasWord(t, ['man', 'woman', 'person', 'boy', 'girl', 'child', 'teacher', 'superhero', 'supervillain', 'mage', 'fairy', 'elf', 'genie', 'zombie', 'vampire', 'astronaut', 'cook', 'farmer', 'firefighter', 'pilot', 'judge', 'scientist', 'student', 'technologist', 'artist', 'singer', 'mechanic', 'detective', 'guard', 'ninja', 'prince', 'princess', 'santa', 'claus', 'police', 'officer', 'worker', 'doctor', 'nurse'])
    && !hasWord(t, ['hand', 'hands', 'gesturing', 'raising', 'facepalming', 'shrugging', 'bowing', 'pouting', 'frowning', 'tipping'])) {
    return hasWord(t, ['baby']) ? 0.5 : 0.85;
  }
  if (cat.includes('Food') || hasWord(t, ['apple', 'cookie', 'pizza', 'cup', 'ring', 'gem', 'coin', 'key'])) return 0.25;
  if (hasWord(t, ['guitar', 'backpack', 'book', 'chair', 'ball', 'lamp', 'box', 'clock'])) return 0.38;
  if (hasWord(t, ['mountain', 'castle', 'building', 'tree'])) return 2.0;
  if (hasWord(t, ['car', 'bus', 'train', 'truck', 'elephant', 'horse', 'dinosaur'])) return 1.1;
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
  const isVariant = (key) => TONE_RE.test(key) && icons[key.replace(TONE_RE, '')] != null;
  const lastWordUse = {};
  for (const key of Object.keys(icons)) {
    const words = key.split('-');
    if (words.length > 1 && !isVariant(key)) {
      const last = words[words.length - 1];
      lastWordUse[last] = (lastWordUse[last] || 0) + 1;
    }
  }

  for (const [key, icon] of Object.entries(icons)) {
    if (!icon || !icon.body) continue;

    const cat = catMap[key] || 'Objects';
    const id = key.replace(/-/g, '_');
    const label = key.replace(/-/g, ' ');
    const variant = isVariant(key);

    const aliases = new Set();
    aliases.add(label);
    const noHyphen = key.replace(/-/g, '');
    if (noHyphen !== key) aliases.add(noHyphen);

    // Root word alias ("acoustic guitar" -> "guitar") only when it is unambiguous.
    const words = label.split(' ');
    const last = words[words.length - 1];
    // A plural last word whose singular is its own icon ("nest with eggs" -> "eggs", but "egg"
    // exists) stays the plural of that icon, so "three eggs" draws eggs rather than a nest.
    const pluralOfIcon = [last.replace(/s$/, ''), last.replace(/es$/, '')].some((w) => w !== last && icons[w]);
    if (!variant && words.length > 1 && !SETTING_LAST_WORDS.has(last) && !pluralOfIcon) {
      const canonical = CANONICAL_LAST_WORD[last];
      if (canonical ? canonical === key : lastWordUse[last] <= MAX_SHARED_LAST_WORD) aliases.add(last);
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
      ...(variant ? { variantOf: key.replace(TONE_RE, '').replace(/-/g, '_') } : {}),
      draw(d) {
        // Fluent Emoji viewbox is 32x32, scale to 100x100
        d.raw(`<g transform="scale(3.125)">${icon.body}</g>`);
      },
    });
  }

  return out;
}
