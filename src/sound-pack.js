// The sound pack: recorded or generated audio files that replace the synthesized sounds
// (src/sound-synth.js) one by one - a child's "ooh", a dog's woof, footsteps, a genre's music. The
// files live in public/audio/pack, each listed in manifest.json with where it came from and under
// which license, so a product build can prove it may ship every one (docs/LICENSE_AUDIT.md).
// Whatever is missing is still synthesized. `npm run sound-pack` adds files and checks the pack.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACK_DIR = fileURLToPath(new URL('../public/audio/pack/', import.meta.url));
export const VOICES = ['kid', 'woman', 'man'];
export const VOWELS = ['a', 'e', 'i', 'o', 'u', 'm'];
export const GENRES = ['kids', 'news', 'documentary', 'howto'];
export const AUDIO_TYPES = { '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.webm': 'audio/webm', '.flac': 'audio/flac' };

const VOICE_WHO = { kid: 'a cute cartoon child (about 6 years old)', woman: 'a warm, friendly cartoon woman', man: 'a friendly cartoon man with a low voice' };
const DRY = 'Dry studio recording, no music, no background noise, no reverb, no words unless given.';

// Babble syllables, one file per vowel (a word's syllables are sung with the file of their vowel)
const SYLLABLES = { a: '"bah" or "dah"', e: '"beh" or "deh"', i: '"bee" or "dee"', o: '"boh" or "doh"', u: '"boo" or "doo"', m: '"mm" (a short hum)' };
// What each sound should be: [sound, length in seconds, what it is, what to ask a generator for]
const VOICE_SOUNDS = [
  ['ooh', 0.8, 'surprised "ooh!" (the pitch swoops up, then down)', 'saying a surprised, amazed "Oooh!", the pitch rising then falling'],
  ['aha', 0.7, 'happy "a-ha!" (when they smile or are pleased)', 'saying a happy, pleased "A-ha!", short and bright'],
  ['hmm', 0.9, 'thinking "hmm..." (mouth closed, a wobbly hum)', 'humming a thoughtful, curious "Hmmm..." with the mouth closed'],
  ['hmph', 0.4, 'grumpy "hmph!" (angry)', 'making a short grumpy, sulky "Hmph!" through the nose'],
  ['aww', 0.8, 'sad "aww..." (the pitch falls)', 'saying a sad, disappointed "Awww..." with falling pitch'],
  ['giggle', 0.8, 'a giggle (laughing)', 'giggling happily, 4 or 5 short "hee-hee" sounds'],
  ['yay', 0.7, 'cheering "yay!"', 'cheering an excited "Yaaay!"'],
  ['hi', 0.5, 'a friendly "hey!" (waving)', 'calling a friendly, cheerful "Hey!" as a greeting'],
  ['snore', 2.5, 'a gentle snore (sleeping), loops', 'snoring gently while sleeping, one slow breath in and out, cute not gross'],
];
const ANIMAL_SOUNDS = [
  ['woof', 0.5, 'a dog: one or two happy barks', 'A small friendly cartoon dog barking "woof woof" twice, happy.'],
  ['meow', 0.7, 'a cat: one meow', 'A cute cartoon cat saying one clear "meow".'],
  ['tweet', 0.5, 'a bird: a short chirp', 'A small songbird chirping three quick happy tweets.'],
  ['quack', 0.5, 'a duck: one or two quacks', 'A cartoon duck quacking twice, funny.'],
  ['squeak', 0.3, 'a rabbit: a tiny squeak', 'A tiny cute bunny squeak, very short.'],
  ['roar', 1.2, 'a lion: a friendly roar', 'A cartoon lion cub roar, playful, not scary.'],
  ['trumpet', 1, 'an elephant: a trumpet call', 'A cartoon baby elephant trumpeting happily.'],
  ['squawk', 0.5, 'a penguin: a squawk', 'A cute penguin squawk, short.'],
  ['blub', 0.4, 'a fish: little bubbles', 'Three small underwater bubbles popping, "blub blub".'],
];
const EFFECT_SOUNDS = [
  ['steps', 0.15, 'ONE soft footstep (several files = variety; played in a walking rhythm)', 'One single soft footstep of a small cartoon character on grass, very short, cute.'],
  ['pop', 0.2, 'something appears ("pop!")', 'A cute cartoon pop, like a bubble or a cork, very short.'],
  ['boing', 0.5, 'a jump (spring "boing")', 'A cartoon spring "boing" for a jump, bouncy.'],
  ['whoosh', 0.5, 'someone runs past (whoosh)', 'A quick soft cartoon whoosh, someone running past.'],
  ['jingle', 0.7, 'dancing (a little sparkly jingle)', 'A short happy sparkly bell jingle, 4 rising notes, for dancing.'],
  ['ding', 1, 'thumbs up (a bright "ding")', 'A single bright bell "ding", positive, like a correct answer.'],
  ['blip', 0.15, 'pointing (a soft UI blip)', 'A soft short user-interface blip, friendly.'],
  ['twinkle', 0.4, 'a wink (twinkle)', 'A tiny magical twinkle sparkle, very short and high.'],
  ['plop', 0.2, 'sitting down (plop)', 'A soft cartoon plop of someone sitting down on a cushion.'],
  ['whirl', 0.7, 'spinning around (whirl)', 'A cartoon whirl, spinning around quickly, rising.'],
  ['flutter', 0.6, 'flying / flapping wings', 'Small bird wings fluttering, flapping quickly.'],
  ['bubble', 0.4, 'swimming (bubbles)', 'A few small water bubbles rising, cute.'],
];
const MUSIC = [
  ['kids', 'Kids stories', 'Happy, playful instrumental children\'s music: ukulele, glockenspiel, light hand claps, 105 BPM, major key, bright and gentle'],
  ['news', 'News & editorial', 'Modern news background music: pulsing synth bass, light ticking percussion, confident and neutral, 118 BPM, minor key'],
  ['documentary', 'Science & documentary', 'Calm ambient documentary music: warm strings and soft piano, slow, curious and wondrous, 70 BPM, no drums'],
  ['howto', 'How-to guides', 'Light upbeat tutorial background music: marimba, soft claps, friendly and focused, 100 BPM, major key'],
];

/**
 * Every file the pack can hold: { slot ('kid/ooh', 'kid/syl-a', 'woof', 'steps', 'music/kids'),
 * dir (where its files go), sound | music, voice?, vowel?, seconds, what, prompt }
 */
export const CATALOGUE = [
  ...VOICES.flatMap((v) => [
    ...VOICE_SOUNDS.map(([sound, seconds, what, ask]) => ({ slot: `${v}/${sound}`, dir: `voices/${v}`, sound, voice: v, seconds, what, prompt: `${VOICE_WHO[v][0].toUpperCase()}${VOICE_WHO[v].slice(1)} ${ask}. About ${seconds} seconds. ${DRY}` })),
    ...VOWELS.map((vowel) => ({
      slot: `${v}/syl-${vowel}`, dir: `voices/${v}`, sound: 'syl', voice: v, vowel, seconds: 0.25,
      what: `one babble syllable with "${vowel}": ${SYLLABLES[vowel]}, for talking`,
      prompt: `${VOICE_WHO[v][0].toUpperCase()}${VOICE_WHO[v].slice(1)} saying ONE short cute nonsense syllable, ${SYLLABLES[vowel]}, like a video-game character's babble. About 0.2 seconds. ${DRY}`,
    })),
  ]),
  ...ANIMAL_SOUNDS.map(([sound, seconds, what, prompt]) => ({ slot: sound, dir: 'animals', sound, seconds, what, prompt: `${prompt} About ${seconds} seconds. ${DRY}` })),
  ...EFFECT_SOUNDS.map(([sound, seconds, what, prompt]) => ({ slot: sound, dir: 'effects', sound, seconds, what, prompt: `${prompt} About ${seconds} seconds. ${DRY}` })),
  ...MUSIC.map(([genre, what, prompt]) => ({ slot: `music/${genre}`, dir: 'music', music: genre, seconds: 30, what: `${what}: background music, loops`, prompt: `${prompt}. Instrumental only, no vocals. 30 to 60 seconds, made to loop seamlessly (the end flows into the start), even volume, no intro or fade-out.` })),
];
const BY_SLOT = new Map(CATALOGUE.map((c) => [c.slot, c]));
export const slotOf = (slot) => BY_SLOT.get(slot) ?? null;

/** The slot a manifest entry fills ('kid/ooh', 'music/kids'...) */
export function slotKey(e) {
  if (e.music) return `music/${e.music}`;
  if (e.sound === 'syl') return `${e.voice}/syl-${e.vowel}`;
  return e.voice ? `${e.voice}/${e.sound}` : e.sound;
}

/**
 * The pack as listed: { files: [{ file, sound?|music?, voice?, vowel?, source, license, made, ... }],
 * problems: [text] } - a file not listed, listed but missing, without a source or license, in no
 * known slot, of an unknown type, or too large.
 */
export function readPack(dir = PACK_DIR) {
  const problems = [];
  let manifest = { files: [] };
  const path = join(dir, 'manifest.json');
  if (existsSync(path)) {
    try { manifest = JSON.parse(readFileSync(path, 'utf8')); } catch (e) { problems.push(`manifest.json is not valid JSON: ${e.message}`); }
  }
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  const listed = new Set();
  for (const e of files) {
    const name = String(e.file || '');
    listed.add(name);
    if (!name || name.includes('..') || name.startsWith('/')) { problems.push(`bad file name: ${JSON.stringify(e.file)}`); continue; }
    if (!existsSync(join(dir, name))) problems.push(`${name}: listed but missing`);
    else if (statSync(join(dir, name)).size > 15e6) problems.push(`${name}: larger than 15 MB`);
    if (!AUDIO_TYPES[extname(name).toLowerCase()]) problems.push(`${name}: not an audio type the browser plays (${Object.keys(AUDIO_TYPES).join(' ')})`);
    if (!String(e.source || '').trim()) problems.push(`${name}: no source (who or what made it)`);
    if (!String(e.license || '').trim()) problems.push(`${name}: no license (what allows us to ship it)`);
    const slot = slotOf(slotKey(e));
    if (!slot) problems.push(`${name}: fills no known slot (${slotKey(e)})`);
    else if (!name.startsWith(`${slot.dir}/`)) problems.push(`${name}: belongs in ${slot.dir}/`);
  }
  // Files in the folder that the manifest doesn't account for
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((x) => (x.isDirectory() ? walk(join(d, x.name)) : [join(d, x.name)]));
  if (existsSync(dir)) {
    for (const f of walk(dir)) {
      const rel = relative(dir, f).split('\\').join('/');
      if (rel === 'manifest.json' || rel === 'README.md' || rel.endsWith('.gitkeep')) continue;
      if (!listed.has(rel)) problems.push(`${rel}: in the pack folder but not in manifest.json (no source or license on record)`);
    }
  }
  return { files, problems };
}

/** Which slots have files: Map(slot -> count) */
export function packStatus(pack = readPack()) {
  const have = new Map();
  for (const e of pack.files) have.set(slotKey(e), (have.get(slotKey(e)) ?? 0) + 1);
  return have;
}

/**
 * The pack's files a clip needs, for the HTML export (src/story.js): the sounds its scenes use
 * (with every voice's files, for the nearest-voice fallback) and its genre's music, as
 * [{ sound?, voice?, vowel?, music?, type, data (base64) }]; at most `limit` bytes in all.
 */
export function packForClip(sounds, { genre = null, dir = PACK_DIR, limit = 12e6 } = {}) {
  const { files, problems } = readPack(dir);
  const bad = new Set(problems.map((p) => p.split(':')[0]));
  const want = new Set();
  for (const s of sounds || []) for (const c of s?.cues || []) want.add(c.s === 'babble' ? 'syl' : c.s);
  let total = 0;
  const out = [];
  const pick = files.filter((e) => !bad.has(e.file) && (e.music ? e.music === genre : want.has(e.sound)))
    .sort((a, b) => Number(!!a.music) - Number(!!b.music)); // the scenes' sounds before the music
  for (const e of pick) {
    const bytes = readFileSync(join(dir, e.file));
    if (total + bytes.length > limit) continue;
    total += bytes.length;
    out.push({ ...(e.sound ? { sound: e.sound } : {}), ...(e.voice ? { voice: e.voice } : {}), ...(e.vowel ? { vowel: e.vowel } : {}), ...(e.music ? { music: e.music } : {}), type: AUDIO_TYPES[extname(e.file).toLowerCase()], data: bytes.toString('base64') });
  }
  return out;
}

/** The catalogue as Markdown (docs/SOUND_PACK.md): what to make, and how to ask a generator for it */
export function catalogueMarkdown(status = new Map()) {
  const row = (c) => `| \`${c.slot}\` | ${status.get(c.slot) ? `✅ ${status.get(c.slot)}` : '—'} | ${c.what} | ${c.prompt.replace(/\|/g, '/')} |`;
  const table = (items) => ['| Slot | Have | What it is | Prompt for a sound generator |', '|---|---|---|---|', ...items.map(row)].join('\n');
  const group = (pred) => CATALOGUE.filter(pred);
  return [
    '<!-- Generated by `npm run sound-pack -- list --md > docs/SOUND_PACK.md`; edit src/sound-pack.js instead. -->',
    '# Sound pack: what to make',
    '',
    'Every sound PictoGen plays is synthesized unless the pack has a file for it. Each file you add',
    'replaces one sound; add several files to a slot for variety (they take turns). Missing voices',
    'borrow the nearest voice, pitched (a woman\'s file for a child and back; a man needs his own).',
    '',
    '## How to add a file',
    '',
    '```sh',
    'npm run sound-pack -- add ~/Downloads/ooh.mp3 kid/ooh --source "ElevenLabs Sound Effects, Creator plan, prompt: ..." --license "ElevenLabs paid plan: commercial use"',
    'npm run sound-pack -- status     # what is there, what is missing',
    'npm run sound-pack -- check      # every file listed, with a source and a license',
    '```',
    '',
    '**Files:** MP3 or OGG (WAV works but is large), mono, 44.1 or 48 kHz. Cut the silence at the',
    'start (the sound must begin at once, or it lags the picture), peaks around -3 dB. Voices and',
    'effects dry: no music, reverb or background. Music: 30-60 s, instrumental, looping seamlessly.',
    '',
    '**Licensing:** keep, for every file, the tool, your plan, the date, the prompt, and a copy of the',
    'terms that day. Only tools or plans that allow commercial use; no "in the style of" a real',
    'artist; no real person\'s voice without their written consent. See docs/LICENSE_AUDIT.md.',
    '',
    '## Which tool for what',
    '',
    '- **Voices and babble syllables:** best recorded (yourself, or a voice actor with a written buyout),',
    '  which you then own outright; or a sound-effects generator (e.g. ElevenLabs Sound Effects) on a',
    '  plan that allows commercial use. Keep the same "person" for all of one voice\'s files.',
    '- **Animals and effects:** a sound-effects generator on a commercial plan, or CC0 libraries',
    '  (Kenney audio packs, Freesound filtered to CC0).',
    '- **Music:** Gemini\'s music feature (Lyria), Suno or Udio on a plan that allows commercial use.',
    '  Gemini makes music, not short effects; its tracks carry an inaudible SynthID watermark.',
    '- Check each tool\'s terms on the day you generate; they change often.',
    '',
    '## Voices',
    '',
    'Each voice (kid, woman, man) has 9 mood sounds and 6 babble syllables. The syllables make the',
    'talking: one is played per syllable of the words, pitched to a little tune, in sync with the',
    'lips (like the babble in Animal Crossing). Record or generate several takes of each syllable.',
    '',
    ...VOICES.flatMap((v) => [`### ${v}`, '', table(group((c) => c.voice === v)), '']),
    '## Animals', '', table(group((c) => c.dir === 'animals')), '',
    '## Effects', '', table(group((c) => c.dir === 'effects')), '',
    '## Music (per clip genre)', '', 'Plays quietly under a clip and ducks while someone speaks. A good fit for Gemini\'s music feature (Lyria), Suno or Udio on a plan that allows commercial use.', '',
    table(group((c) => c.music)), '',
  ].join('\n');
}
