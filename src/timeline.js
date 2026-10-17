// Scene timelines: "a boy walks in, then waves, then a dog runs to him" -> beats of actions per actor.
// This module only reads the text; src/scene.js plays the beats out (positions, poses, timing).

import { parseText, tokenize, MOTION_WORDS, EXPRESSION_WORDS } from './text/matcher.js';
import { getConcept } from './concepts/index.js';

// "then", "after that", "afterwards", "finally" split a prompt into beats (not "next": "next to").
const SEQUENCE_RE = /\b(?:then|after that|afterwards?|finally)\b/i;
const BEAT_SPLIT_RE = /[.;!?]+|,?\s*\b(?:and then|then|after that|afterwards?|finally)\b[,\s]*/i;

/** True when a prompt describes things happening one after another. */
export const hasSequence = (text) => SEQUENCE_RE.test(String(text || ''));

const ENTER_VERBS = new Set(['enter', 'enters', 'entering', 'arrive', 'arrives', 'arriving', 'appear', 'appears', 'appearing', 'come', 'comes', 'coming', 'came']);
const EXIT_VERBS = new Set(['leave', 'leaves', 'leaving', 'left', 'exit', 'exits', 'exiting', 'disappear', 'disappears']);
const EXPRESSION_VERBS = { smile: 'happy', smiles: 'happy', grin: 'happy', grins: 'happy', frown: 'sad', frowns: 'sad', cries: 'sad', laughs: 'laugh' };
const DETERMINERS = new Set(['a', 'an', 'the', 'this', 'that', 'his', 'her', 'their', 'its', 'my', 'your', 'our']);
const MALE = new Set(['boy', 'man']);
const FEMALE = new Set(['girl', 'woman']);

const stems = (t) => [t, t.replace(/ies$/, 'y'), t.replace(/es$/, ''), t.replace(/s$/, ''), t.replace(/ing$/, ''), t.replace(/ing$/, 'e')];
const motionOf = (t) => stems(t).map((w) => MOTION_WORDS[w]).find(Boolean);
const expressionOf = (t) => EXPRESSION_VERBS[t] || stems(t).map((w) => EXPRESSION_WORDS[w]).find(Boolean);

/**
 * parseTimeline(text) -> { beats, actors, props } or null when the text has no sequence.
 *   beats:  [{ text, actions: [{ actor, type, gait?, anim?, expression?, target? }] }]
 *     type: 'enter' (walks/runs in from off-screen), 'exit' (leaves), 'moveTo' (walks/runs to target),
 *           'pose' (waves, jumps, dances...), 'expr' (smiles, cries...), 'appear' (just shows up)
 *   actors: [{ id, match }]  concepts that act (one figure each, keyed by concept id)
 *   props:  [match]          everything else mentioned (trees, the sun...), drawn as usual
 */
export function parseTimeline(text) {
  if (!hasSequence(text)) return null;
  const clauses = String(text).split(BEAT_SPLIT_RE).map((c) => (c || '').trim()).filter((c) => /[a-z]/i.test(c));
  if (clauses.length < 2) return null;

  const mentioned = new Map(); // concept id -> first match (colour, expression...)
  const actorIds = [];
  let lastSubjects = [];
  const beats = [];

  const remember = (m) => { if (!mentioned.has(m.id)) mentioned.set(m.id, m); };
  const lastActorWhere = (test) => [...actorIds].reverse().find(test);
  const resolvePronoun = (word, exclude = []) => {
    const others = (id) => !exclude.includes(id);
    if (word === 'him' || word === 'he') return lastActorWhere((id) => MALE.has(id) && others(id));
    if (word === 'her' || word === 'she') return lastActorWhere((id) => FEMALE.has(id) && others(id));
    if (word === 'it') return lastActorWhere((id) => getConcept(id)?.category !== 'people' && others(id));
    return lastActorWhere(others);
  };

  for (const clause of clauses) {
    const toks = tokenize(clause);
    // The first verb that makes something happen
    let v = toks.findIndex((t) => ENTER_VERBS.has(t) || EXIT_VERBS.has(t) || motionOf(t) || expressionOf(t));
    const before = v >= 0 ? toks.slice(0, v) : toks;
    const after = v >= 0 ? toks.slice(v + 1) : [];

    // Target: "to him", "towards the boy", "up to the tree"
    let target = null, targetAt = -1;
    const toAt = after.findIndex((t) => t === 'to' || t === 'toward' || t === 'towards');
    if (toAt >= 0) {
      const rest = after.slice(toAt + 1).filter((t) => t !== 'the' && t !== 'a' && t !== 'an');
      if (['him', 'her', 'it', 'them'].includes(rest[0])) target = rest[0];
      else {
        const hit = parseText(rest.join(' ')).matches[0];
        if (hit) { target = hit.id; remember(hit); }
      }
      targetAt = toAt;
    }

    // Subjects: concepts before the verb, else a pronoun, else whoever acted last
    let subjects = parseText(before.join(' ')).matches;
    subjects.forEach(remember);
    let subjectIds = subjects.map((m) => m.id);
    if (!subjectIds.length) {
      const pronoun = before.find((t) => ['he', 'she', 'it', 'they'].includes(t));
      if (pronoun === 'they') subjectIds = [...lastSubjects];
      else if (pronoun) subjectIds = [resolvePronoun(pronoun)].filter(Boolean);
      else subjectIds = [...lastSubjects];
    }
    // Everything else named after the verb is part of the set ("walks in under the sun")
    const tail = targetAt >= 0 ? after.slice(0, targetAt) : after;
    parseText(tail.join(' ')).matches.forEach(remember);

    const actions = [];
    if (v >= 0 && subjectIds.length) {
      const verb = toks[v], next = toks[v + 1], next2 = toks[v + 2];
      const motion = motionOf(verb);
      const gait = motion === 'run' ? 'run' : 'walk';
      const targetId = target && !mentioned.has(target) && !['him', 'her', 'it', 'them'].includes(target) ? null : target;
      const intoScene = next === 'in' && (!next2 || !DETERMINERS.has(next2)) || next === 'into' && next2 === 'the' && toks[v + 3] === 'scene';
      const outOfScene = EXIT_VERBS.has(verb) || (motion && ['out', 'off', 'away'].includes(next));
      for (const actor of subjectIds) {
        let type, extra = {};
        if (outOfScene) type = 'exit';
        else if (targetId) {
          const tid = ['him', 'her', 'it', 'them'].includes(targetId) ? resolvePronoun(targetId, [actor]) : targetId;
          type = tid && tid !== actor ? 'moveTo' : 'pose';
          extra = { target: tid };
        } else if (ENTER_VERBS.has(verb) || intoScene) type = 'enter';
        else if (motion && motion !== 'walk' && motion !== 'run' && motion !== 'walk-across') { type = 'pose'; extra = { anim: motion }; }
        else if (motion) type = 'enter';
        else type = 'expr';
        const expression = expressionOf(verb) || toks.map(expressionOf).find(Boolean);
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
    beats.push({ text: clause, actions });
  }

  // Targets that are not actors are props; an actor's first mention keeps its colour/expression words
  const actors = actorIds.map((id) => ({ id, match: mentioned.get(id) || { id, word: id, count: 1 } }));
  const props = [...mentioned.values()].filter((m) => !actorIds.includes(m.id));
  if (!actors.length || !beats.some((b) => b.actions.length)) return null;
  // The first clause can just set the stage: "a boy and a dog in the park, then ..." -> both present
  return { beats, actors, props };
}
