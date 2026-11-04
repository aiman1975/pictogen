// A scene's card: what the scene is made of, in six parts the studio shows and lets the writer change
// (public/js/story-review.js):
//   figures      who is in it (people, animals, creatures), each with how they feel
//   objects      the things in it
//   place        where and when: the place, the time of day, the weather
//   feeling      the scene's mood (src/mood.js) and whether it was chosen or read from the words
//   action       what happens, in order ("pgc21 walks in", "pgc21 points")
//   message      the words: the caption, what is said, what the board says
// Named characters are their keys here ("pgc21"); the story and the studio say their names.
import { getConcept } from './concepts/index.js';
import { conceptOf, whoOf } from './individuals.js';

const LIVING = /^(people|animals|wildlife|fantasy|sea)/;
const isLiving = (id) => LIVING.test(getConcept(conceptOf(id))?.category ?? '');
const label = (id) => (getConcept(conceptOf(id))?.label ?? conceptOf(id)).replace(/_/g, ' ');
// (the story's own word for a thing: "the email", not "the e mail")
let words = new Map();
const nameOf = (id) => whoOf(id) ?? `the ${words.get(conceptOf(id)) ?? label(id)}`;

// What a step or a gesture is, said plainly
const DOING = {
  walk: 'walks', run: 'runs', 'walk-across': 'walks across', jump: 'jumps', wave: 'waves', point: 'points', talk: 'says something', sit: 'sits',
  hold: 'holds on', cheer: 'cheers', dance: 'dances', think: 'thinks', sleep: 'sleeps', swim: 'swims', fly: 'flies', clap: 'claps',
  thumbsup: 'gives a thumbs-up', read: 'reads', write: 'writes', eat: 'eats', drink: 'drinks', laugh: 'laughs', cry: 'cries',
  drive: 'drives', ride: 'rides', look: 'looks around', bow: 'bows', hug: 'hugs', kick: 'kicks', throw: 'throws', climb: 'climbs',
};
const doing = (anim) => DOING[anim] ?? (anim ? `${anim}s` : null);

function stepText(a) {
  const who = nameOf(a.actor), to = a.target ? nameOf(a.target) : null;
  switch (a.type) {
    case 'enter': return isLiving(a.actor) ? `${who} ${a.gait === 'run' ? 'runs' : 'walks'} in` : `${who} arrives`;
    case 'exit': return `${who} leaves`;
    case 'moveTo': return a.hug ? `${who} hugs ${to}` : `${who} ${a.gait === 'run' ? 'runs' : 'goes'} to ${to}`;
    case 'approach': return `${who} comes closer`;
    case 'recede': return `${who} walks away`;
    case 'look': return a.target === 'camera' || !a.target ? `${who} looks at us` : `${who} looks at ${to}`;
    case 'appear': return null; // (just there)
    case 'pose': return a.seat ? `${who} sits on the ${label(a.seat)}` : `${who} ${doing(a.anim) ?? 'stands'}${a.lookAt && a.lookAt !== 'camera' ? ` at ${nameOf(a.lookAt)}` : ''}`;
    case 'expr': return a.expression ? `${who} looks ${a.expression}` : null;
    default: return null;
  }
}

/** Where and when, in a few words: "the office · day", "the beach · night · rain" */
export function placeLabel(env) {
  if (!env) return '';
  const where = env.room ? (env.roomKind && env.roomKind !== 'room' ? `the ${env.roomKind}` : 'indoors')
    : env.space ? 'space' : env.underwater ? 'under the sea' : env.desert ? 'the desert' : env.farm ? 'the farm'
      : env.jungle ? 'the jungle' : env.castle ? 'the castle' : env.mountains ? 'the mountains' : env.beach ? 'the beach'
        : env.water ? 'the sea' : env.city ? 'the city' : env.park ? 'the park' : env.woods ? 'the forest' : 'outdoors';
  const when = env.night ? 'night' : env.sunset ? 'sunset' : env.room ? null : 'day';
  const weather = env.rain ? 'rain' : env.snow ? 'snow' : null;
  return [where, when, weather].filter(Boolean).join(' · ');
}

/** Where and when as the studio's pickers say it: { place, time, weather } (src/places.js PLACE_CHOICES) */
export function placeChoice(env) {
  if (!env) return { place: 'meadow', time: 'day', weather: 'clear' };
  const place = env.room ? (env.roomKind || 'room') : env.space ? 'space' : env.underwater ? 'underwater' : env.desert ? 'desert'
    : env.farm ? 'farm' : env.jungle ? 'jungle' : env.castle ? 'castle' : env.mountains ? 'mountains' : env.beach ? 'beach'
      : env.water ? 'sea' : env.city ? 'city' : env.park ? 'park' : env.woods ? 'forest' : 'meadow';
  return { place, time: env.night ? 'night' : env.sunset ? 'sunset' : 'day', weather: env.rain ? 'rain' : env.snow ? 'snow' : env.autumn ? 'autumn' : 'clear' };
}

/**
 * The card of a composed scene. matches: what was drawn ({ id, word, count, expression, animation });
 * timeline: its steps, if any; env: its place (src/scene.js detectEnv); mood: its mood; chosen: the
 * mood was chosen, not read; said: [{ who, text }]; board: the board's words; caption: the sentence.
 */
export function sceneCard({ matches = [], timeline = null, env = null, mood = null, chosen = false, said = [], board = null, caption = null }) {
  const figures = [], objects = [];
  words = new Map(matches.filter((m) => m?.id && m.word && !whoOf(m.id) && !/^pgc\d+$/.test(m.word)).map((m) => [conceptOf(m.id), m.word]));
  for (const m of matches) {
    if (!m?.id) continue;
    if (isLiving(m.id)) {
      // (a named one is their kind - "girl"; anyone else the story's word for them - "puppy")
      const who = whoOf(m.id) ?? null;
      figures.push({ who, kind: who || !m.word || /^pgc\d+$/.test(m.word) ? label(m.id) : m.word, count: m.count ?? 1, ...(m.expression ? { feels: m.expression } : {}) });
    } else {
      objects.push({ id: conceptOf(m.id), name: m.word ?? label(m.id), word: m.word ?? label(m.id), count: m.count ?? 1 });
    }
  }
  // (feelings said along the way, in a sequence: the last one each has)
  for (const b of timeline?.beats ?? []) {
    for (const a of b.actions) {
      const f = a.expression && figures.find((x) => (x.who ?? `the ${x.kind}`) === nameOf(a.actor));
      if (f) f.feels = a.expression;
    }
  }
  const action = timeline?.beats?.length
    // (what happens at the same time, with "&")
    ? timeline.beats.map((b) => b.actions.map(stepText).filter(Boolean).join(' & ')).filter(Boolean)
    : matches.filter((m) => m.animation && isLiving(m.id)).map((m) => `${nameOf(m.id)} ${doing(m.animation)}`);
  // What happens as steps the studio can change (src/timeline.js editTimeline): one row per action,
  // "with" when it happens together with the one before; a still scene's gestures are its first steps
  const steps = [];
  if (timeline?.beats?.length) {
    for (const b of timeline.beats) {
      b.actions.filter((a) => a.type !== 'appear').forEach((a, k) => steps.push({ ...a, ...(k > 0 ? { with: true } : {}), ...(b.duration ? { duration: b.duration } : {}) }));
    }
  } else {
    for (const m of matches) if (m.animation && isLiving(m.id) && m.animation !== 'blink') steps.push({ actor: m.id, type: 'pose', anim: m.animation, ...(m.expression ? { expression: m.expression } : {}), ...(steps.length ? { with: true } : {}) });
  }
  // (who or what can be in a step: the figures first, then the things)
  const cast = matches.filter((m) => m?.id).map((m) => ({ id: m.id, name: nameOf(m.id), living: isLiving(m.id) }))
    .sort((a, b) => Number(b.living) - Number(a.living));
  return {
    figures,
    objects,
    place: placeLabel(env),
    where: placeChoice(env),
    steps: steps.slice(0, 24),
    cast: cast.filter((c, i) => cast.findIndex((x) => x.id === c.id) === i),
    feeling: { mood: mood ?? null, chosen: Boolean(chosen) },
    action: [...new Set(action)].slice(0, 8),
    message: {
      ...(caption ? { caption } : {}),
      said: said.filter((s) => s?.text).map((s) => ({ who: s.who ? nameOf(s.who) : null, text: s.text })),
      ...(board ? { board } : {}),
    },
  };
}
