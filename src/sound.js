// Sound for scenes: what is heard when. Each figure gets a voice (children high, men low, every
// animal its own call) and what it does becomes cues: footsteps while it walks, a whoosh when it
// runs, a boing when it jumps, an "ooh" when it is surprised, a giggle when it laughs (people's words
// stay silent, in their bubbles; an animal that talks barks or meows). The cues go into the SVG (<metadata class="pg-sound">) and are
// played by src/sound-synth.js, which makes every sound from scratch: no recordings, nothing to
// license, nothing to download.

import { babbleNotes } from './speech.js';
import { getConcept } from './concepts/index.js';

// Kind and pitch of the people's voices; animals call
const PEOPLE = {
  boy: ['kid', 1], girl: ['kid', 1.1], man: ['man', 1], woman: ['woman', 1],
  // Characters (src/concepts/characters.js) speak in their person's voice, some older or younger
  old_man: ['man', 0.86], old_woman: ['woman', 0.9], baby: ['kid', 1.3], robot: ['man', 0.78],
};
const CALLS = { dog: 'woof', cat: 'meow', bird: 'tweet', duck: 'quack', rabbit: 'squeak', lion: 'roar', elephant: 'trumpet', penguin: 'squawk', fish: 'blub' };
// Two of a kind don't sound alike: the second a little lower, the third higher...
const SPREAD = [1, 0.9, 1.12, 0.84, 1.2, 0.95];

// What a gesture and a mood sound like
const ANIM_SOUNDS = { jump: 'boing', cheer: 'yay', wave: 'hi', dance: 'jingle', think: 'hmm', sleep: 'snore', sit: 'plop', spin: 'whirl', thumbsup: 'ding', point: 'blip', fly: 'flutter', flap: 'flutter', swim: 'bubble' };
const MOOD_SOUNDS = { surprised: 'ooh', laugh: 'giggle', happy: 'aha', sad: 'aww', angry: 'hmph', confused: 'hmm', skeptical: 'hmm', wink: 'twinkle',
  scared: 'ooh', excited: 'yay', love: 'aww', shy: 'giggle', sleepy: 'hmm' };
// Sounds made with the voice, and the mood an animal calls them in
const VOCAL = { ooh: 'surprised', aha: 'happy', giggle: 'happy', yay: 'happy', hi: 'happy', aww: 'sad', hmph: 'angry', hmm: 'neutral', babble: 'neutral' };

/** Every sound the synth knows (src/sound-synth.js) */
export const SOUND_NAMES = [
  ...Object.keys(VOCAL), 'snore', 'pop', 'boing', 'whoosh', 'steps', 'jingle', 'ding', 'blip', 'twinkle', 'plop', 'whirl', 'flutter', 'bubble',
  ...Object.values(CALLS),
  // things in the scene, and the clean set's quieter ones
  'ring', 'tick', 'typing', 'schoolbell', 'magic', 'applause', 'splash', 'thud', 'chime', 'click',
  // a scene's mood, as it starts (src/mood.js)
  'tension', 'triumph', 'sorrow', 'mystic',
];

// Things in a scene that make a sound of their own, once as it starts: concept id -> sound
const THING_SOUNDS = { phone: 'ring', mobile_phone: 'ring', telephone: 'ring', clock: 'tick', alarm_clock: 'tick', laptop: 'typing', computer: 'typing',
  desktop_computer: 'typing', keyboard: 'typing', bell: 'schoolbell', wizard: 'magic', fairy: 'magic', genie: 'magic', unicorn: 'magic', witch: 'magic', magic_wand: 'magic' };
/** The sounds of a scene's things as it starts (a phone rings, a wizard's magic sparkles) */
export function thingCues(ids, { classroom = false, cheering = 0 } = {}) {
  const out = [];
  const seen = new Set();
  let t = 0.2;
  if (classroom) { out.push({ t, s: 'schoolbell' }); seen.add('schoolbell'); t += 0.4; }
  for (const id of ids) {
    const s = THING_SOUNDS[id];
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push({ t: r3(t), s, ...(s === 'tick' || s === 'typing' ? { d: 3 } : {}) });
    t += 0.35;
  }
  // (three or more cheering: applause)
  if (cheering >= 3) out.push({ t: 0.4, s: 'applause', d: 2.5 });
  return out;
}

/**
 * The quiet sound of a place, under everything (src/sound-synth.js pgAmbience): birds outdoors by
 * day, crickets at night, waves by the sea, bubbles under it, wind in the desert or the snow, rain,
 * the city's hum, a hum in space; none indoors.
 */
export function ambienceOf(env) {
  if (!env) return null;
  if (env.space) return 'space';
  if (env.underwater) return 'underwater';
  if (env.room) return null;
  if (env.rain) return 'rain';
  if (env.water) return 'waves';
  if (env.city) return 'city';
  if (env.desert || env.snow) return 'wind';
  if (env.night) return 'crickets';
  return 'birds';
}

const r3 = (v) => Math.round(v * 1000) / 1000;

/** The voice of a figure: { v: 'kid' | 'woman' | 'man' | an animal's call, p: pitch } or null */
export function voiceOf(conceptId, alt = 0) {
  const p = SPREAD[alt % SPREAD.length];
  const who = PEOPLE[conceptId] ?? PEOPLE[getConcept(conceptId)?.role];
  if (who) return { v: who[0], p: r3(who[1] * p) };
  if (CALLS[conceptId]) return { v: CALLS[conceptId], p };
  return null;
}

const PEOPLE_VOICES = new Set(Object.values(PEOPLE).map(([v]) => v));

// A voiced sound in this voice: an animal calls instead (a babble barks a few times)
// (people say their words in a bubble, silently: a sung babble sounded robotic; they still say
// "ooh", "a-ha!", "hmm"... with their feelings)
function vocal(s, t, voice, extra = {}) {
  if (!voice) return [];
  if (PEOPLE_VOICES.has(voice.v)) return s === 'babble' ? [] : [{ t, s, v: voice.v, p: voice.p, ...extra }];
  const x = s === 'babble' ? Math.min(3, Math.max(1, Math.ceil((extra.n?.length ?? 3) / 3))) : 1;
  return [{ t, s: voice.v, p: voice.p, m: VOCAL[s] ?? 'neutral', ...(x > 1 ? { x } : {}) }];
}

/**
 * The cues of one timeline step of one figure (src/scene.js playTimeline), starting at t0:
 *   act: { type, gait?, anim?, expression?, words?, d (seconds), wasPresent }
 */
export function actionCues(act, t0, voice) {
  const out = [];
  const d = Math.max(0.3, act.d ?? 1);
  if (['enter', 'moveTo', 'approach', 'recede', 'exit'].includes(act.type)) {
    if (act.gait === 'run') out.push({ t: t0, s: 'whoosh' });
    // (z: how big the walker is - a child's or a crab's feet patter, a man's or a unicorn's thud)
    out.push({ t: t0, s: 'steps', d: r3(d), ...(act.gait === 'run' ? { g: 'run' } : {}), ...(act.z ? { z: r3(act.z) } : {}) });
    // An animal that comes along says so when it gets there
    if (voice && !PEOPLE_VOICES.has(voice.v) && act.type !== 'exit' && act.type !== 'recede') out.push(...vocal('hi', t0 + d, voice));
  } else if (act.type === 'appear' && !act.wasPresent) {
    out.push({ t: t0, s: 'pop' });
  } else if (act.type === 'pose') {
    if (act.anim === 'talk') {
      out.push(...vocal('babble', t0, voice, { n: babbleNotes(act.words || 'bla bla bla') }));
    } else if (ANIM_SOUNDS[act.anim]) {
      const s = ANIM_SOUNDS[act.anim];
      if (VOCAL[s]) out.push(...vocal(s, t0, voice));
      else out.push({ t: t0, s, ...(s === 'snore' ? { d: r3(d) } : {}) });
    }
  }
  // A mood said out loud ("she smiles" -> "a-ha!"), just after the gesture's own sound
  const mood = act.expression && MOOD_SOUNDS[act.expression];
  if (mood) {
    const t = t0 + (out.length ? 0.35 : 0.1);
    if (VOCAL[mood]) out.push(...vocal(mood, t, voice));
    else out.push({ t, s: mood });
  }
  return out.map((c) => ({ ...c, t: r3(c.t) }));
}

/** The cues of a figure in a still scene: its gesture and mood once, its words (from `start`) */
export function stillCues({ expression, words, animation, start = 0.5, at = 0.3 }, voice) {
  const out = [];
  // (a jump's boing, a cheer's "yay", a wave's "hey"... once, as the scene starts)
  const g = animation && animation !== 'talk' && ANIM_SOUNDS[animation];
  if (g && g !== 'snore') out.push(...(VOCAL[g] ? vocal(g, 0.15, voice) : [{ t: 0.15, s: g }]));
  if (g === 'snore') out.push({ t: 0.4, s: 'snore', d: 3 });
  const mood = expression && MOOD_SOUNDS[expression];
  if (mood) out.push(...(VOCAL[mood] ? vocal(mood, at, voice) : [{ t: at, s: mood }]));
  if (words) out.push(...vocal('babble', start, voice, { n: babbleNotes(words) }));
  return out.map((c) => ({ ...c, t: r3(c.t) }));
}

/**
 * The scene's sound: { loop, cues } in time order. loop: seconds after which it all starts again
 * (with the animation), or null to play once.
 */
export function soundTrack(cues, loop = null, { amb = null, clean = false, mood = null } = {}) {
  const sorted = cues.filter((c) => !loop || c.t < loop).sort((a, b) => a.t - b.t);
  // amb: the place's sound (ambienceOf); clean: a style that suits the clean sound set; mood: the
  // scene's (src/mood.js), for a clip's music to follow
  return { loop: loop ? r3(loop) : null, cues: sorted, ...(amb ? { amb } : {}), ...(clean ? { clean: true } : {}), ...(mood ? { mood } : {}) };
}

/** The sound of a scene's SVG, or null (read from its <metadata class="pg-sound">) */
export function soundOf(svg) {
  const m = String(svg || '').match(/<metadata class="pg-sound">([^<]*)<\/metadata>/);
  if (!m) return null;
  const json = m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  try { return JSON.parse(json); } catch { return null; }
}
