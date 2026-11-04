// A scene's mood: how the whole scene feels, not one figure. Read from its words ("Suddenly...",
// "worried", "Well done!") and its figures' feelings, or chosen in the studio (opts.mood). A mood
// sets several things at once:
//   light   a tint and a vignette over the picture (tense: dark edges; joyful: a warm glow; sad:
//           paler colours; mystery: violet edges; calm: a soft warm haze)
//   camera  a slow move when the scene has none of its own (tense: pushing in; sad: pulling back;
//           joyful: easing out; mystery: drifting in; calm: barely moving)
//   sound   a short sting as the scene starts, and in a clip the music turns to the mood's tune
//           while the mood lasts (public/js/scene-sound.js)

export const MOODS = ['tense', 'joyful', 'sad', 'calm', 'mystery'];

// Words for each mood, with how strongly they say it (2: clearly, 1: a hint)
const WORDS = {
  tense: {
    2: 'suddenly danger dangerous scary scared terrified afraid fear frightened panic emergency alarm attack attacked threat trap trapped chase chased chasing warning thief robber monster storm stormy thunder lightning shocked',
    1: 'hacker hackers scam scammer scammers phishing worried worry worries nervous hurry hurried careful risk strange locked lost dark shadow quickly run ran running stuck pressure fake suspicious',
  },
  joyful: {
    2: 'hooray hurray yay celebrate celebrated celebration party birthday won winner victory cheered cheer cheering proud success amazing wonderful fantastic hugged laughed applause clapped',
    1: 'happy smiled smile smiles laugh laughs great thanks thank glad fun played dance danced danced jumped hug hugs win wins clap',
  },
  sad: {
    2: 'sad cried crying tears lonely alone sick broken goodbye died upset miserable heartbroken',
    1: 'sorry missed miss lost hurt cry gone tired grey gray rain',
  },
  calm: {
    2: 'calm peaceful quiet quietly asleep sleep slept sleeping bedtime relax relaxed rested cosy cozy gently',
    1: 'slowly dream dreamed dreams soft stars sunset breeze rest',
  },
  mystery: {
    2: 'mysterious mystery secret secrets magic magical glowing glow glowed hidden puzzle riddle unknown whisper whispered',
    1: 'curious wondered wonder strange odd clue clues map treasure',
  },
};
const WEIGHT = new Map();
for (const [mood, levels] of Object.entries(WORDS)) for (const [w, list] of Object.entries(levels)) for (const word of list.split(/\s+/)) if (!WEIGHT.has(`${mood}:${word}`)) WEIGHT.set(`${mood}:${word}`, +w);
const PHRASES = [[/\bwell done\b/, 'joyful', 2], [/\bwe did it\b/, 'joyful', 2], [/\bthank you\b/, 'joyful', 1], [/\bgood job\b/, 'joyful', 2],
  [/\bwatch out\b|\blook out\b|\bbe careful\b|\bbut wait\b/, 'tense', 2], [/\bonce upon a time\b/, 'calm', 1], [/\bgood night\b/, 'calm', 2]];
// Figures' feelings say something about the scene too (a little)
const FEELINGS = { scared: 'tense', worried: 'tense', angry: 'tense', shocked: 'tense', sad: 'sad', crying: 'sad', excited: 'joyful', laughing: 'joyful', proud: 'joyful', sleepy: 'calm' };
const NEGATIONS = new Set(['not', 'no', 'never', "don't", 'dont', "didn't", 'didnt', "isn't", 'isnt', "wasn't", 'wasnt', 'without']);
// (on a tie the stronger feeling wins)
const ORDER = ['tense', 'sad', 'joyful', 'mystery', 'calm'];

/**
 * The mood a scene's words and feelings say, or null when they say none.
 * text: the scene's words (prompt and caption); feelings: its figures' expressions.
 */
export function detectMood(text, feelings = []) {
  const low = String(text || '').toLowerCase().replace(/[“”"]/g, ' ');
  const toks = low.match(/[a-z']+/g) ?? [];
  const score = Object.fromEntries(MOODS.map((m) => [m, 0]));
  const seen = new Set(); // (each word counts once)
  toks.forEach((t, i) => {
    // ("Do not be afraid": not a scary moment)
    if (NEGATIONS.has(toks[i - 1]) || NEGATIONS.has(toks[i - 2]) || seen.has(t)) return;
    seen.add(t);
    for (const m of MOODS) score[m] += WEIGHT.get(`${m}:${t}`) ?? 0;
  });
  for (const [re, m, w] of PHRASES) if (re.test(low)) score[m] += w;
  for (const f of feelings) if (FEELINGS[f]) score[FEELINGS[f]] += 1;
  const best = Math.max(...Object.values(score));
  if (best < 2) return null;
  return ORDER.find((m) => score[m] === best);
}

/** A mood said or chosen: a known mood, 'none' (no mood at all), or null (read it from the scene) */
export function moodChoice(value) {
  const v = String(value ?? '').toLowerCase();
  return MOODS.includes(v) ? v : v === 'none' ? 'none' : null;
}

const r2 = (v) => Math.round(v * 100) / 100;

/**
 * The mood's light over the picture: { defs, overlay, filter } - overlay goes on top of everything
 * (it doesn't move with the camera), filter (the id of an SVG filter in defs) on the picture under it.
 * light: true for a plain white canvas (the stickman, the whiteboard), where it stays fainter.
 */
export function moodLight(mood, uid, W, H, { light = false } = {}) {
  const k = light ? 0.55 : 1;
  const id = `${uid}-mood`;
  const vignette = (color, inner, outer, cy = 0.5) => `<radialGradient id="${id}-v" cx="0.5" cy="${cy}" r="0.75"><stop offset="${inner}" stop-color="${color}" stop-opacity="0"/><stop offset="1" stop-color="${color}" stop-opacity="${r2(outer * k)}"/></radialGradient>`;
  const rect = (fill, opacity = 1) => `<rect width="${W}" height="${H}" fill="${fill}" opacity="${r2(opacity)}"/>`;
  switch (mood) {
    case 'tense':
      return {
        defs: vignette('#050816', 0.45, 0.62),
        overlay: `${rect('#1e3a8a', 0.07 * k)}<g class="pg-mood-pulse">${rect(`url(#${id}-v)`)}</g>`,
        css: '.pg-mood-pulse { animation: pgMoodPulse 1.6s ease-in-out infinite; } @keyframes pgMoodPulse { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }',
      };
    case 'joyful':
      return {
        defs: `<radialGradient id="${id}-g" cx="0.5" cy="0" r="0.9"><stop offset="0" stop-color="#ffe08a" stop-opacity="${r2(0.32 * k)}"/><stop offset="1" stop-color="#ffe08a" stop-opacity="0"/></radialGradient>`,
        overlay: `${rect(`url(#${id}-g)`)}${rect('#ffb74d', 0.05 * k)}`,
      };
    case 'sad':
      return {
        defs: `<filter id="${id}-f" x="0" y="0" width="1" height="1"><feColorMatrix type="saturate" values="${light ? 0.75 : 0.5}"/></filter>${vignette('#1f2937', 0.55, 0.35)}`,
        overlay: `${rect('#64748b', 0.12 * k)}${rect(`url(#${id}-v)`)}`,
        filter: `${id}-f`,
      };
    case 'mystery':
      return {
        defs: vignette('#2e1065', 0.4, 0.55),
        overlay: `${rect('#7c3aed', 0.06 * k)}${rect(`url(#${id}-v)`)}`,
      };
    case 'calm':
      return {
        defs: vignette('#78350f', 0.6, 0.16),
        overlay: `${rect('#fde68a', 0.07 * k)}${rect(`url(#${id}-v)`)}`,
      };
    default:
      return null;
  }
}

/**
 * The mood's slow camera over `seconds` (there and back again when it loops, so a still scene
 * never jumps): CSS for a wrapper, centred on (cx, cy). Null for no move.
 */
export function moodCamera(mood, uid, W, H, seconds, { cx = W / 2, cy = H * 0.55 } = {}) {
  const moves = { tense: [1, 1.09], joyful: [1.06, 1], sad: [1.07, 1], mystery: [1, 1.06], calm: [1, 1.03] };
  const m = moves[mood];
  if (!m) return null;
  const at = (s) => `transform: translate(${r2(cx * (1 - s))}px, ${r2(cy * (1 - s))}px) scale(${s});`;
  const name = `${uid}moodcam`;
  return {
    css: `@keyframes ${name} { 0% { ${at(m[0])} } 100% { ${at(m[1])} } }`,
    style: `animation: ${name} ${r2(Math.max(2, seconds))}s ease-in-out infinite alternate;`,
  };
}

/** The sound as the scene starts, for its mood (src/sound-synth.js) */
export const MOOD_STINGS = { tense: 'tension', joyful: 'triumph', sad: 'sorrow', mystery: 'mystic' };
/** The tune a clip's music turns to while a mood lasts (kept with the music, src/sound-synth.js) */
export { MOOD_TUNES } from './sound-synth.js';
