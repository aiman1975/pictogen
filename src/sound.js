// Sound for scenes: what is heard when. Each figure gets a voice (children high, men low, every
// animal its own call) and what it does becomes cues: footsteps while it walks, a whoosh when it
// runs, a boing when it jumps, an "ooh" when it is surprised, a giggle when it laughs, a babble in
// time with its lips when it talks. The cues go into the SVG (<metadata class="pg-sound">) and are
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
const MOOD_SOUNDS = { surprised: 'ooh', laugh: 'giggle', happy: 'aha', sad: 'aww', angry: 'hmph', confused: 'hmm', skeptical: 'hmm', wink: 'twinkle' };
// Sounds made with the voice, and the mood an animal calls them in
const VOCAL = { ooh: 'surprised', aha: 'happy', giggle: 'happy', yay: 'happy', hi: 'happy', aww: 'sad', hmph: 'angry', hmm: 'neutral', babble: 'neutral' };

/** Every sound the synth knows (src/sound-synth.js) */
export const SOUND_NAMES = [
  ...Object.keys(VOCAL), 'snore', 'pop', 'boing', 'whoosh', 'steps', 'jingle', 'ding', 'blip', 'twinkle', 'plop', 'whirl', 'flutter', 'bubble',
  ...Object.values(CALLS),
];

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
function vocal(s, t, voice, extra = {}) {
  if (!voice) return [];
  if (PEOPLE_VOICES.has(voice.v)) return [{ t, s, v: voice.v, p: voice.p, ...extra }];
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
    out.push({ t: t0, s: 'steps', d: r3(d), ...(act.gait === 'run' ? { g: 'run' } : {}) });
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

/** The cues of a figure in a still scene: its mood once, its words (from `start`) */
export function stillCues({ expression, words, start = 0.5, at = 0.3 }, voice) {
  const out = [];
  const mood = expression && MOOD_SOUNDS[expression];
  if (mood) out.push(...(VOCAL[mood] ? vocal(mood, at, voice) : [{ t: at, s: mood }]));
  if (words) out.push(...vocal('babble', start, voice, { n: babbleNotes(words) }));
  return out.map((c) => ({ ...c, t: r3(c.t) }));
}

/**
 * The scene's sound: { loop, cues } in time order. loop: seconds after which it all starts again
 * (with the animation), or null to play once.
 */
export function soundTrack(cues, loop = null) {
  const sorted = cues.filter((c) => !loop || c.t < loop).sort((a, b) => a.t - b.t);
  return { loop: loop ? r3(loop) : null, cues: sorted };
}

/** The sound of a scene's SVG, or null (read from its <metadata class="pg-sound">) */
export function soundOf(svg) {
  const m = String(svg || '').match(/<metadata class="pg-sound">([^<]*)<\/metadata>/);
  if (!m) return null;
  const json = m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  try { return JSON.parse(json); } catch { return null; }
}
