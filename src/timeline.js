// Scene timelines: "a boy walks in, then waves, then a dog runs to him" -> beats of actions per actor.
// This module only reads the text; src/scene.js plays the beats out (positions, poses, timing).

import { parseText, tokenize, MOTION_WORDS, EXPRESSION_WORDS } from './text/matcher.js';
import { getConcept } from './concepts/index.js';
import { conceptOf } from './individuals.js';
import { takeQuotes, speaks } from './speech.js';

// "then", "after that", "afterwards", "finally" split a prompt into beats (not "next": "next to");
// "while", "meanwhile" and "at the same time" put actions side by side in one beat; "when",
// "after", "before", "until" order the two halves of a sentence.
const SEQUENCE_RE = /\b(?:then|after|afterwards?|finally|while|meanwhile|at the same time|simultaneously|when|whenever|before|until|till|as soon as|once)\b/i;
const TOGETHER_RE = /\b(?:meanwhile|at the same time|simultaneously)\b[,\s]*/i;

// How a linking word orders the two halves of a sentence: side by side, the linked half first
// ("when the dog arrives, the boy jumps"), or the linked half last ("the boy waves before ...")
const LINKS = {
  while: 'together', until: 'together', till: 'together',
  when: 'first', whenever: 'first', after: 'first', 'as soon as': 'first', once: 'first',
  before: 'last',
};
const LINK = '(while|until|till|whenever|when|after|as soon as|once|before)';
const LEAD_RE = new RegExp(`^\\s*${LINK}\\b(.+)$`, 'i');
const MID_RE = new RegExp(`^(.+?)\\b${LINK}\\b(.+)$`, 'i');
const SUBJECT_PRONOUNS = new Set(['he', 'she', 'it', 'they']);

/** True when some word in the text makes something happen (so "runs after the cat" is no clause). */
const hasAction = (text) => tokenize(text).some(isVerb) || !!cameraAction(text);

/**
 * "when the dog arrives the boy jumps" (no comma): where the second half starts, at the subject of
 * the first verb after the first one that has a subject right before it ("he", "the boy", "boy").
 */
function cutWithoutComma(text, names) {
  const toks = tokenize(text);
  const v1 = toks.findIndex(isVerb);
  for (let v = v1 + 1; v1 >= 0 && v < toks.length; v++) {
    if (!isVerb(toks[v])) continue;
    let s = -1;
    if (SUBJECT_PRONOUNS.has(toks[v - 1])) s = v - 1;
    else {
      for (let i = v - 1; i >= Math.max(v1 + 1, v - 3) && s < 0; i--) if (DETERMINERS.has(toks[i])) s = i;
      if (s < 0 && (names?.has(toks[v - 1]) || parseText(toks[v - 1]).matches.length)) s = v - 1;
    }
    if (s > v1) return [toks.slice(0, s).join(' '), toks.slice(s).join(' ')];
  }
  return null;
}

/**
 * "walks in and waves" / "walks in and a dog runs to him" -> one part per action, in order. A part
 * that does nothing joins the next one ("a dog and a cat run in") or the one before ("with a hat").
 */
function splitAnd(clause) {
  const out = [];
  let pending = '';
  for (const part of clause.split(/\s*,?\s*\band\b\s*/i)) {
    const cur = pending ? `${pending} and ${part}` : part;
    pending = '';
    if (!out.length) out.push(cur);
    else if (!hasAction(out[out.length - 1])) out[out.length - 1] += ` and ${cur}`;
    else if (hasAction(cur)) out.push(cur);
    else pending = cur;
  }
  if (pending) out[out.length - 1] += ` and ${pending}`;
  return out;
}

/**
 * Splits a sentence of two linked halves, in the order written:
 *   "while he waves, a dog runs to him"      -> ["he waves", "a dog runs to him"], main = the second
 *   "a dog runs to him while he waves"       -> ["a dog runs to him", "he waves"], main = the first
 *   "a boy waves, meanwhile a dog runs in"   -> both, main = the first
 *   "when the dog arrives, the boy jumps"    -> order 'first': the dog's half plays first
 *   "the boy waves before the dog arrives"   -> order 'last': the boy's half plays first
 * order: 'together' | 'first' | 'last' (when the linked half plays). The main half wins if both
 * give the same figure something to do at once. Returns null for a plain clause.
 */
function splitClause(clause, names = null) {
  const lead = clause.match(LEAD_RE);
  if (lead) {
    const order = LINKS[lead[1].toLowerCase().replace(/\s+/g, ' ')];
    const comma = lead[2].match(/^([^,]+),(.+)$/);
    if (comma && (lead[1].toLowerCase() === 'while' || hasAction(comma[1]))) return { parts: [comma[1], comma[2]], main: 1, order };
    const cut = !comma && cutWithoutComma(lead[2], names);
    if (cut) return { parts: cut, main: 1, order };
  }
  const mid = clause.match(MID_RE);
  if (mid && /[a-z]/i.test(mid[1]) && /[a-z]/i.test(mid[3]) && (mid[2].toLowerCase() === 'while' || hasAction(mid[3]))) {
    return { parts: [mid[1], mid[3]], main: 0, order: LINKS[mid[2].toLowerCase().replace(/\s+/g, ' ')] };
  }
  const also = clause.match(/^(.+?)(?:\bmeanwhile\b|\bat the same time\b|\bsimultaneously\b)(.+)$/i);
  if (also && /[a-z]/i.test(also[1]) && /[a-z]/i.test(also[2])) return { parts: [also[1], also[2]], main: 0, order: 'together' };
  return null;
}
const BEAT_SPLIT_RE = /[.;!?]+|,?\s*\b(?:and then|then|after that|afterwards?|finally)\b[,\s]*/i;

/** True when a prompt describes things happening one after another. */
export const hasSequence = (text) => SEQUENCE_RE.test(String(text || ''));

const ENTER_VERBS = new Set(['enter', 'enters', 'entering', 'entered', 'arrive', 'arrives', 'arriving', 'arrived', 'appear', 'appears', 'appearing', 'appeared', 'come', 'comes', 'coming', 'came']);
const EXIT_VERBS = new Set(['leave', 'leaves', 'leaving', 'left', 'exit', 'exits', 'exiting', 'exited', 'disappear', 'disappears', 'disappeared', 'gone']);
// Looking at someone: "looks at the dog", "watches him", "stares at us", "they look at each other"
const LOOK_VERBS = new Set(['look', 'looks', 'looking', 'looked', 'watch', 'watches', 'watching', 'watched', 'stare', 'stares', 'staring', 'stared',
  'gaze', 'gazes', 'gazing', 'gazed', 'glance', 'glances', 'glancing', 'glanced']);
// Walking up to someone or something named right after the verb ("reaches the boy", "joins her")
const REACH_VERBS = new Set(['reach', 'reaches', 'reached', 'reaching', 'join', 'joins', 'joined', 'meet', 'meets', 'met']);
const EXPRESSION_VERBS = { smile: 'happy', smiles: 'happy', grin: 'happy', grins: 'happy', frown: 'sad', frowns: 'sad', cries: 'sad', laughs: 'laugh' };
const DETERMINERS = new Set(['a', 'an', 'the', 'this', 'that', 'his', 'her', 'their', 'its', 'my', 'your', 'our']);
const MALE = new Set(['boy', 'man']);
const FEMALE = new Set(['girl', 'woman']);

// ---------------------------------------------------------------------------------------------
// Camera directions: "zoom in on the dog", "a close-up of the boy", "the camera pans left",
// "pull back", "the camera follows him".

const FILLER = new Set(['the', 'a', 'an', 'on', 'at', 'of', 'to', 'onto', 'toward', 'towards', 'camera', 'shot', 'slowly', 'quickly']);
const target = (toks) => toks.filter((t) => !FILLER.has(t)).join(' ') || null;

/**
 * The camera move a clause asks for, or null:
 *   { type: 'zoomIn' | 'zoomOut' | 'pan' | 'panTo' | 'follow', target?: words naming who/what, dir?: -1 | 1 }
 * "follow"/"pan" need the camera named or an imperative ("follow the dog", "pan left"), so
 * "a dog follows the boy" stays an action and "a pan on the stove" stays a pan.
 */
export function cameraAction(clause) {
  const toks = tokenize(clause);
  const camera = toks.includes('camera') || toks.includes('shot');
  for (let i = 0; i < toks.length; i++) {
    const [t, n] = [toks[i], toks[i + 1]];
    const rest = toks.slice(i + 2);
    if (/^zoom(s|ing|ed)?$/.test(t) && n === 'out') return { type: 'zoomOut' };
    if (/^zoom(s|ing|ed)?$/.test(t)) return { type: 'zoomIn', target: target(n === 'in' ? rest : toks.slice(i + 1)) };
    if (/^(push|pushes|pushing|moves?|moving)$/.test(t) && n === 'in' && camera) return { type: 'zoomIn', target: target(rest) };
    if (t === 'close' && n === 'up') return { type: 'zoomIn', target: target(rest) };
    if (t === 'closeup' || t === 'closer' && n === 'look') return { type: 'zoomIn', target: target(toks.slice(i + (t === 'closeup' ? 1 : 2))) };
    if (/^(pull|pulls|pulling)$/.test(t) && (n === 'back' || n === 'out')) return { type: 'zoomOut' };
    if (t === 'wide' && n === 'shot') return { type: 'zoomOut' };
    if (/^pan(s|ning|ned)?$/.test(t) && (camera || i === 0)) {
      if (n === 'left') return { type: 'pan', dir: -1 };
      if (n === 'right' || n === 'across') return { type: 'pan', dir: 1 };
      if (n === 'to' || n === 'toward' || n === 'towards' || n === 'over') return { type: 'panTo', target: target(toks.slice(i + 2)) };
      return { type: 'pan', dir: 1 };
    }
    if (/^(follow|follows|following|tracks|tracking)$/.test(t) && (camera || i === 0)) return { type: 'follow', target: target(toks.slice(i + 1)) };
  }
  return null;
}

// Splits text into clauses for camera detection (commas too: "a boy waving, zoom in on him").
const CAMERA_CLAUSE_RE = /[,.;!?]+|\b(?:and then|then|after that|afterwards?|finally)\b/i;

/** The prompt without its camera directions, and the directions in order (for scenes without a timeline). */
export function extractCamera(text) {
  let rest = String(text || '');
  const moves = [];
  for (const clause of rest.split(CAMERA_CLAUSE_RE)) {
    const c = clause && cameraAction(clause);
    if (c) { moves.push(c); rest = rest.replace(clause, ' '); }
  }
  return { text: rest.replace(/\s+([,.;!?])/g, '$1').replace(/^[\s,.;]+|[\s,]+$/g, ''), moves };
}

// ---------------------------------------------------------------------------------------------
// Depth: "walks toward us", "comes closer", "comes from far away" / "walks away into the distance"

const VIEWER = new Set(['us', 'me', 'you', 'camera', 'viewer']);

/** A depth move in the words right after a verb: { type: 'approach' | 'recede', len } or null. */
function depthOf(toks) {
  const [a, b, c, d] = toks;
  if ((a === 'toward' || a === 'towards') && VIEWER.has(b)) return { type: 'approach', len: 2 };
  if ((a === 'toward' || a === 'towards') && b === 'the' && VIEWER.has(c)) return { type: 'approach', len: 3 };
  if (a === 'closer' || a === 'nearer') return { type: 'approach', len: 1 };
  if (a === 'up' && b === 'close') return { type: 'approach', len: 2 };
  if (a === 'from' && b === 'afar') return { type: 'approach', len: 2 };
  if (a === 'from' && b === 'far') return { type: 'approach', len: c === 'away' ? 3 : 2 };
  if (a === 'from' && b === 'the' && c === 'distance') return { type: 'approach', len: 3 };
  const into = (i) => toks[i] === 'into' && toks[i + 1] === 'the' && toks[i + 2] === 'distance';
  if (into(0)) return { type: 'recede', len: 3 };
  if ((a === 'off' || a === 'away') && into(1)) return { type: 'recede', len: 4 };
  if (a === 'away') {
    if (b === 'from' && VIEWER.has(c)) return { type: 'recede', len: 3 };
    if (b === 'from' && c === 'the' && VIEWER.has(d)) return { type: 'recede', len: 4 };
    return { type: 'recede', len: 1 };
  }
  return null;
}

// How long: "for 3 seconds", "for two seconds", "for a moment", "for a while", "for a minute"
const NUMBER_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, few: 3, couple: 2 };
const DURATION_RE = /\bfor\s+(?:(?:a\s+)?(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|few|couple)\s+(?:of\s+)?(seconds?|secs?|minutes?)|(a\s+moment|a\s+bit|a\s+while|a\s+long\s+time|ages))\b/i;
const VAGUE = { 'a moment': 1.2, 'a bit': 2, 'a while': 4, 'a long time': 6, ages: 6 };
export const MIN_STEP = 0.3, MAX_STEP = 20;

/** A clause's length in seconds and the clause without those words: { seconds, rest } or null. */
export function durationOf(clause) {
  const m = String(clause).match(DURATION_RE);
  if (!m) return null;
  const seconds = m[3]
    ? VAGUE[m[3].toLowerCase().replace(/\s+/g, ' ')]
    : (Number(m[1]) || NUMBER_WORDS[m[1].toLowerCase()]) * (/^min/i.test(m[2]) ? 60 : 1);
  return { seconds: Math.min(MAX_STEP, Math.max(MIN_STEP, seconds)), rest: clause.replace(m[0], ' ') };
}

const stems = (t) => [t, t.replace(/ies$/, 'y'), t.replace(/es$/, ''), t.replace(/s$/, ''), t.replace(/ing$/, ''), t.replace(/ing$/, 'e')];
const motionOf = (t) => (t ? stems(t).map((w) => MOTION_WORDS[w]).find(Boolean) : undefined);
const expressionOf = (t) => (t ? EXPRESSION_VERBS[t] || stems(t).map((w) => EXPRESSION_WORDS[w]).find(Boolean) : undefined);
// A word that makes something happen (adjectives like "happy" only count inside a clause)
const isVerb = (t) => ENTER_VERBS.has(t) || EXIT_VERBS.has(t) || REACH_VERBS.has(t) || LOOK_VERBS.has(t) || EXPRESSION_VERBS[t] || speaks(t) || !!motionOf(t);

/**
 * parseTimeline(text) -> { beats, actors, props, follow? } or null when the text has no sequence.
 *   beats:  [{ text, actions: [{ actor, type, gait?, anim?, expression?, target? }], camera? }]
 *     camera: { type: 'zoomIn' | 'zoomOut' | 'pan' | 'panTo', target?: concept id, dir? } - a camera beat
 *   follow: concept id the camera follows through the whole clip ("the camera follows the dog")
 *     type: 'enter' (walks/runs in from off-screen), 'exit' (leaves, walks off), 'moveTo' (walks/runs to target),
 *           'approach' (walks toward the camera, from the horizon if not there yet), 'recede' (walks away
 *           into the distance and is gone),
 *           'pose' (waves, jumps, dances...), 'expr' (smiles, cries...), 'appear' (just shows up),
 *           'look' (turns to look at target: a concept id, or 'camera'; none = straight ahead)
 *     lookAt: on a pose or expr, who the gesture or feeling is aimed at ("waves at her")
 *     speech: on a 'talk' pose, the words said ("says “Hello!”"), lip-synced (src/speech.js)
 *   actors: [{ id, match }]  concepts that act, keyed by concept id; match.count figures of each
 *                            ("two boys walk in" -> two boys, both doing what "the boys" do)
 *   props:  [match]          everything else mentioned (trees, the sun...), drawn as usual
 */
export function parseTimeline(text, { force = false, names = null } = {}) {
  // Quoted words ("Tom says “Hi Mia!”") are speech: kept out of the sentence, said by the figure
  const { text: plain, quotes } = takeQuotes(text);
  text = plain;
  if (!force && !hasSequence(text)) return null;
  const clauses = String(text).split(BEAT_SPLIT_RE).map((c) => (c || '').trim()).filter((c) => /[a-z]/i.test(c));
  if (!force && clauses.length < 2 && !clauses.some((c) => splitClause(c, names))) return null;
  // Named individuals ("pgc1" -> "boy~pgc1") are words for their figure, each its own actor
  const parse = (words) => parseText(words, { names });

  const mentioned = new Map(); // concept id -> first match (colour, expression...)
  const actorIds = [];
  let lastSubjects = [];
  let lastGroup = []; // everyone in the last clause read, targets too: "they" after "a dog runs to him"
  const beats = [];
  let follow = null;

  const remember = (m) => { if (!mentioned.has(m.id)) mentioned.set(m.id, m); };
  // The words after "at": someone named, a pronoun, "each other", or the viewer ("at us")
  const lookTarget = (words) => {
    const w = words.filter((t) => !['the', 'a', 'an'].includes(t));
    if (!w.length) return null;
    if ((w[0] === 'each' && w[1] === 'other') || (w[0] === 'one' && w[1] === 'another')) return { each: true };
    if (VIEWER.has(w[0])) return { camera: true };
    if (['him', 'her', 'it', 'them'].includes(w[0])) return { pronoun: w[0] };
    const hit = parse(w.join(' ')).matches[0];
    if (hit) { remember(hit); return { id: hit.id }; }
    return null;
  };
  let ahead = []; // concepts named later in the sentence being read ("runs to her after the girl waves")
  const lastActorWhere = (test) => [...actorIds].reverse().find(test) ?? ahead.find(test);
  const resolvePronoun = (word, exclude = []) => {
    const others = (id) => !exclude.includes(id);
    if (word === 'him' || word === 'he') return lastActorWhere((id) => MALE.has(conceptOf(id)) && others(id));
    if (word === 'her' || word === 'she') return lastActorWhere((id) => FEMALE.has(conceptOf(id)) && others(id));
    if (word === 'it') return lastActorWhere((id) => getConcept(conceptOf(id))?.category !== 'people' && others(id));
    return lastActorWhere(others);
  };

  // One clause -> { text, actions, camera? } (or null for "the camera follows ..."), keeping track of
  // who has been mentioned and who acted last
  const readClause = (text) => {
    // "waves for 3 seconds": the step's length, then the clause without it
    const timed = durationOf(text);
    const clause = timed ? timed.rest : text;
    const length = timed ? { duration: timed.seconds } : {};
    const cam = cameraAction(clause);
    if (cam) {
      // Who the camera looks at: a pronoun ("follows him") or something named ("zooms in on the dog")
      let id = null;
      if (cam.target && ['him', 'her', 'it', 'them', 'he', 'she', 'they'].includes(cam.target)) id = resolvePronoun(cam.target);
      else if (cam.target) {
        const hit = parse(cam.target).matches[0];
        if (hit) { id = hit.id; remember(hit); }
      }
      if (cam.type === 'follow') { follow = id || lastSubjects[0] || actorIds[0] || null; return null; }
      return { text, actions: [], camera: { ...cam, target: id }, ...length };
    }
    let toks = tokenize(clause);
    // Speech: the quoted words in this clause ("says “Hello!”", or just Tom: “Hello!”)
    const quoteAt = toks.findIndex((t) => /^qq\d+$/.test(t));
    const speech = quoteAt >= 0 ? quotes[+toks[quoteAt].slice(2)] : null;
    if (quoteAt >= 0) toks = toks.filter((t) => !/^qq\d+$/.test(t));
    // The first verb that makes something happen
    const acts = (t) => ENTER_VERBS.has(t) || EXIT_VERBS.has(t) || REACH_VERBS.has(t) || LOOK_VERBS.has(t) || speaks(t) || motionOf(t);
    let v = toks.findIndex((t) => acts(t) || expressionOf(t));
    // "a happy girl waves": a feeling before anyone is named describes who comes next, the verb is later
    if (v >= 0 && !acts(toks[v]) && !parse(toks.slice(0, v).join(' ')).matches.length) {
      const later = toks.findIndex((t, i) => i > v && acts(t));
      if (later >= 0) v = later;
    }
    if (v < 0 && speech) v = Math.min(quoteAt, toks.length); // Tom: “Hello!” - saying it is the verb
    const before = v >= 0 ? toks.slice(0, v) : toks;
    let after = v >= 0 ? toks.slice(v + 1) : [];
    // Toward or away from the camera (not a target: "toward the camera" must not draw a camera)
    const verbMotion = v >= 0 ? motionOf(toks[v]) : null;
    const depthWords = v >= 0 ? depthOf(after) : null;
    // "reaches the boy", "approaches him": walking up to whoever is named right after the verb
    const objectWords = after.filter((t) => !DETERMINERS.has(t) || t === 'him' || t === 'her');
    const reaches = v >= 0 && (REACH_VERBS.has(toks[v]) || verbMotion === 'approach' && !depthWords && objectWords.length > 0
      && !VIEWER.has(objectWords[0]) && (['him', 'her', 'it', 'them'].includes(objectWords[0]) || parse(objectWords[0]).matches.length > 0));
    if (reaches) after = ['to', ...after];
    const depth = reaches ? null : depthWords?.type || (verbMotion === 'approach' || verbMotion === 'recede' ? verbMotion : null);
    if (depthWords && !reaches) after = after.slice(depthWords.len);

    // Target: "to him", "towards the boy", "up to the tree"
    let target = null, targetAt = -1;
    const toAt = depth ? -1 : after.findIndex((t) => t === 'to' || t === 'toward' || t === 'towards');
    if (toAt >= 0) {
      const rest = after.slice(toAt + 1).filter((t) => t !== 'the' && t !== 'a' && t !== 'an');
      if (['him', 'her', 'it', 'them'].includes(rest[0])) target = rest[0];
      else {
        const hit = parse(rest.join(' ')).matches[0];
        if (hit) { target = hit.id; remember(hit); }
      }
      targetAt = toAt;
    }

    // Who they look at: "looks at the dog", "watches him", "waves at her", "at each other", "at us"
    const isLook = v >= 0 && LOOK_VERBS.has(toks[v]);
    const isSpeech = v >= 0 && (speaks(toks[v] ?? '') || motionOf(toks[v]) === 'talk' || (speech && !motionOf(toks[v]) && !expressionOf(toks[v])));
    let gazeWords = null;
    // "looks toward the house", "says to Mia": who they face, not where they go
    if ((isLook || isSpeech) && toAt >= 0) { gazeWords = after.slice(toAt + 1); target = null; targetAt = -1; }
    else if (v >= 0 && toAt < 0) {
      const atAt = after.indexOf('at');
      if (atAt >= 0) gazeWords = after.slice(atAt + 1);
      else if (isLook && /^watch/.test(toks[v])) gazeWords = after;
    }
    const gaze = gazeWords && lookTarget(gazeWords);

    // Subjects: concepts before the verb, else a pronoun, else whoever acted last
    let subjects = parse(before.join(' ')).matches;
    subjects.forEach(remember);
    let subjectIds = subjects.map((m) => m.id);
    if (!subjectIds.length) {
      const pronoun = before.find((t) => ['he', 'she', 'it', 'they'].includes(t));
      const plural = lastSubjects.length > 1 || (mentioned.get(lastSubjects[0])?.count ?? 1) > 1;
      if (pronoun === 'they') subjectIds = plural || lastGroup.length < 2 ? [...lastSubjects] : [...lastGroup];
      else if (pronoun) subjectIds = [resolvePronoun(pronoun)].filter(Boolean);
      else subjectIds = [...lastSubjects];
    }
    // Speech comes from whoever is named right before the verb ("a boy and a girl in the park,
    // the girl asks ..." - the girl): the part of the sentence after its last comma
    if (isSpeech && subjects.length > 1) {
      const at = toks[v] ? clause.toLowerCase().search(new RegExp(`\\b${toks[v]}\\b`)) : clause.search(/qq\d/);
      const speaker = at > 0 ? parse(clause.slice(0, at).split(/[,;]/).pop()).matches : [];
      if (speaker.length) subjectIds = speaker.map((m) => m.id);
    }
    // Everything else named after the verb is part of the set ("walks in under the sun")
    const tail = targetAt >= 0 ? after.slice(0, targetAt) : after;
    parse(tail.join(' ')).matches.forEach(remember);

    const actions = [];
    if (v >= 0 && subjectIds.length) {
      const verb = toks[v], next = toks[v + 1], next2 = toks[v + 2];
      const motion = motionOf(verb);
      const gait = motion === 'run' ? 'run' : 'walk';
      const targetId = target && !mentioned.has(target) && !['him', 'her', 'it', 'them'].includes(target) ? null : target;
      const intoScene = next === 'in' && (!next2 || !DETERMINERS.has(next2)) || next === 'into' && next2 === 'the' && toks[v + 3] === 'scene';
      const outOfScene = EXIT_VERBS.has(verb) || (motion && ['out', 'off'].includes(next));
      // The one an actor looks at: "each other" is the other subject (or another of its kind)
      const gazeAt = (actor) => {
        if (!gaze) return null;
        if (gaze.camera) return 'camera';
        if (gaze.each) return subjectIds.find((id) => id !== actor) ?? ((mentioned.get(actor)?.count ?? 1) > 1 ? actor : resolvePronoun('them', [actor]) ?? null);
        if (gaze.pronoun) return resolvePronoun(gaze.pronoun, [actor]) ?? null;
        return gaze.id !== actor ? gaze.id : null;
      };
      for (const actor of subjectIds) {
        let type, extra = {};
        if (isLook) { type = 'look'; extra = { target: gazeAt(actor) }; } // looks at someone (or around)
        else if (isSpeech || (speech && motion === 'talk')) { type = 'pose'; extra = { anim: 'talk' }; } // says, asks, whispers...
        else if (depth) type = depth; // walks toward us / away into the distance
        else if (outOfScene) type = 'exit';
        else if (targetId) {
          const tid = ['him', 'her', 'it', 'them'].includes(targetId) ? resolvePronoun(targetId, [actor]) : targetId;
          type = tid && tid !== actor ? 'moveTo' : 'pose';
          extra = { target: tid };
        } else if (ENTER_VERBS.has(verb) || intoScene) type = 'enter';
        else if (motion && motion !== 'walk' && motion !== 'run' && motion !== 'walk-across') { type = 'pose'; extra = { anim: motion }; }
        else if (motion) type = 'enter';
        else type = 'expr';
        const expression = expressionOf(verb) || toks.map(expressionOf).find(Boolean);
        // A gesture or a feeling aimed at someone: "waves at her", "smiles at the dog"
        if ((type === 'pose' || type === 'expr') && gazeAt(actor)) extra = { ...extra, lookAt: gazeAt(actor) };
        if (speech && type === 'pose' && extra.anim === 'talk') extra = { ...extra, speech };
        actions.push({ actor, type, gait, ...extra, ...(expression ? { expression } : {}) });
        if (!actorIds.includes(actor)) actorIds.push(actor);
      }
      lastSubjects = subjectIds;
    } else if (subjectIds.length && subjects.length) {
      // "then a cat" -> it shows up
      for (const actor of subjectIds) {
        actions.push({ actor, type: 'appear' });
        if (!actorIds.includes(actor)) actorIds.push(actor);
      }
      lastSubjects = subjectIds;
    }
    return { text, actions, ...length };
  };

  // A clause with "and" between actions -> its beats in order. "and smiles" after an action is how
  // the figure looks while doing it, not a beat of its own ("waves and smiles").
  const readPart = (text) => {
    const out = [];
    for (const part of splitAnd(text)) {
      const beat = readClause(part.trim());
      if (!beat) continue;
      const prev = out[out.length - 1];
      const mood = beat.actions.length && beat.actions.every((a) => a.type === 'expr' && prev?.actions.some((p) => p.actor === a.actor));
      if (mood) beat.actions.forEach((a) => prev.actions.filter((p) => p.actor === a.actor).forEach((p) => { p.expression = a.expression; }));
      else out.push(beat);
    }
    return out;
  };
  const groupOf = (beats) => [...new Set(beats.flatMap((b) => b.actions.flatMap((a) => [a.actor, a.target]).filter(Boolean)))];

  for (const clause of clauses) {
    const split = splitClause(clause, names);
    if (split) {
      // Read both halves in the order written, with everything the sentence names known to pronouns;
      // afterwards the main half's subjects are the ones a following "then waves" is about
      ahead = parse(clause).matches.map((m) => m.id);
      let mainSubjects = [];
      const read = split.parts.map((part, i) => {
        const r = readPart(part.trim());
        if (i === split.main) mainSubjects = lastSubjects;
        return r;
      });
      ahead = [];
      lastSubjects = mainSubjects.length ? mainSubjects : lastSubjects;
      lastGroup = groupOf(read.flat());
      const [main, other] = split.main === 0 ? read : [read[1], read[0]];
      if (split.order === 'together') {
        const all = [...main, ...other];
        const camera = all.find((b) => b.camera)?.camera;
        const duration = Math.max(0, ...all.map((b) => b.duration ?? 0));
        beats.push({ text: clause, actions: all.flatMap((b) => b.actions), ...(camera ? { camera } : {}), ...(duration ? { duration } : {}) });
      } else {
        // One after the other: "when / after / as soon as" the linked half first, "before" it last
        beats.push(...(split.order === 'first' ? [...other, ...main] : [...main, ...other]));
      }
    } else if (TOGETHER_RE.test(clause) && clause.search(TOGETHER_RE) === 0 && beats.length) {
      // "Meanwhile, a dog runs in": alongside the previous beat
      const prev = beats[beats.length - 1];
      const read = readPart(clause.replace(TOGETHER_RE, ''));
      lastGroup = groupOf([prev, ...read]);
      for (const beat of read) {
        prev.actions.push(...beat.actions);
        if (beat.camera && !prev.camera) prev.camera = beat.camera;
        prev.text += ` / ${clause}`;
      }
    } else {
      const read = readPart(clause);
      if (read.some((b) => b.actions.length)) lastGroup = groupOf(read);
      beats.push(...read);
    }
  }

  // Targets that are not actors are props; an actor's first mention keeps its colour/expression words
  const actors = actorIds.map((id) => ({ id, match: mentioned.get(id) || { id, word: id, count: 1 } }));
  const props = [...mentioned.values()].filter((m) => !actorIds.includes(m.id));
  if (!actors.length || !beats.some((b) => b.actions.length)) return null;
  // The first clause can just set the stage: "a boy and a dog in the park, then ..." -> both present
  return { beats, actors, props, ...(follow ? { follow } : {}) };
}

/**
 * Who looks at whom in a scene without a timeline ("a boy and a girl looking at each other",
 * "a cat staring at the bird", "a boy waving at us"): [{ who, at }] with concept ids, at = id | 'camera'.
 */
export function lookRelations(text, { names = null } = {}) {
  const tl = parseTimeline(text, { force: true, names });
  if (!tl) return [];
  return tl.beats.flatMap((b) => b.actions)
    .filter((a) => (a.type === 'look' && a.target) || a.lookAt)
    .map((a) => ({ who: a.actor, at: a.type === 'look' ? a.target : a.lookAt }));
}

/** Who says what in a scene without a timeline ("Tom says “Hello Mia!”"): [{ who, text }] */
export function speechRelations(text, { names = null } = {}) {
  const tl = parseTimeline(text, { force: true, names });
  if (!tl) return [];
  return tl.beats.flatMap((b) => b.actions).filter((a) => a.speech).map((a) => ({ who: a.actor, text: a.speech }));
}

// ---------------------------------------------------------------------------------------------
// Edited timelines (the studio's timeline view): beats as the user arranged them, checked against
// what the scene has.

/** Gestures a figure can do in place (the 'pose' action's anim). */
export const POSE_ANIMS = ['wave', 'jump', 'dance', 'cheer', 'point', 'thumbsup', 'hold', 'think', 'talk', 'sit', 'sleep', 'fly', 'swim', 'spin', 'sway', 'float', 'rock', 'flap', 'wag'];
export const ACTION_TYPES = ['enter', 'moveTo', 'approach', 'recede', 'exit', 'pose', 'expr', 'appear', 'look'];
export const CAMERA_TYPES = ['zoomIn', 'zoomOut', 'pan', 'panTo'];
const EXPRESSIONS = new Set(Object.values(EXPRESSION_WORDS));

/**
 * editTimeline(beats, cast, base?) -> a timeline like parseTimeline's, or null when nothing happens.
 *   beats: [{ actions: [{ actor, type, gait?, anim?, target?, expression? }], camera?, duration? }] as edited
 *          (duration: the step's length in seconds, MIN_STEP..MAX_STEP; without it the step takes as
 *          long as its actions)
 *   cast:  matches the scene can use as actors or targets (the prompt's figures and things)
 *   base:  the prompt's own timeline, if any (keeps "the camera follows ...")
 * Anything that does not fit is dropped: unknown figures, actions, gestures or feelings, a walk
 * to nobody, a second action for the same figure in one beat.
 */
export function editTimeline(beats, cast, base = null) {
  const byId = new Map(cast.map((m) => [m.id, m]));
  const known = (id) => typeof id === 'string' && byId.has(id);
  const clean = [];
  for (const beat of Array.isArray(beats) ? beats.slice(0, 40) : []) {
    const actions = [];
    for (const a of Array.isArray(beat?.actions) ? beat.actions.slice(0, 24) : []) {
      if (!a || !known(a.actor) || !ACTION_TYPES.includes(a.type) || actions.some((b) => b.actor === a.actor)) continue;
      const action = { actor: a.actor, type: a.type, gait: a.gait === 'run' ? 'run' : 'walk' };
      if (a.type === 'pose') {
        if (!POSE_ANIMS.includes(a.anim)) continue;
        action.anim = a.anim;
      }
      if (a.type === 'moveTo') {
        if (!known(a.target) || a.target === a.actor) continue;
        action.target = a.target;
      }
      // Looking at someone (or at us): a 'look' step, or a gesture or feeling aimed at someone
      const lookable = (id) => id === 'camera' || (known(id) && id !== a.actor) || (id === a.actor && (byId.get(id).count ?? 1) > 1);
      if (a.type === 'look') action.target = lookable(a.target) ? a.target : 'camera';
      if ((a.type === 'pose' || a.type === 'expr') && lookable(a.lookAt)) action.lookAt = a.lookAt;
      if (EXPRESSIONS.has(a.expression)) action.expression = a.expression;
      if (a.type === 'pose' && action.anim === 'talk' && typeof a.speech === 'string' && a.speech.trim()) action.speech = a.speech.trim().slice(0, 400);
      if (a.type === 'expr' && !action.expression) continue;
      actions.push(action);
    }
    const c = beat?.camera;
    // (a pan to nothing is no camera move)
    const camera = c && CAMERA_TYPES.includes(c.type) && !(c.type === 'panTo' && !known(c.target))
      ? { type: c.type, target: known(c.target) ? c.target : null, ...(c.type === 'pan' ? { dir: c.dir < 0 ? -1 : 1 } : {}) }
      : null;
    const duration = Number.isFinite(+beat.duration) && beat.duration !== null && +beat.duration > 0
      ? Math.round(Math.min(MAX_STEP, Math.max(MIN_STEP, +beat.duration)) * 20) / 20 : null;
    if (actions.length || camera) clean.push({ text: typeof beat.text === 'string' ? beat.text.slice(0, 200) : '', actions, ...(camera ? { camera } : {}), ...(duration ? { duration } : {}) });
  }
  const actorIds = [...new Set(clean.flatMap((b) => b.actions.map((a) => a.actor)))];
  if (!actorIds.length) return null;
  const actors = actorIds.map((id) => ({ id, match: byId.get(id) }));
  const props = cast.filter((m) => !actorIds.includes(m.id));
  const follow = base?.follow && actorIds.includes(base.follow) ? base.follow : null;
  return { beats: clean, actors, props, ...(follow ? { follow } : {}) };
}
