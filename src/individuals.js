// Named individuals: several figures of one kind that each act on their own ("Tom and Max", two
// boys). The studio turns each character's name into a neutral key ("pgc1") before a prompt leaves
// the browser, and sends { key, base } pairs; the engine reads the key as a word for its figure and
// gives that figure its own id, `${base}~${key}` ("boy~pgc1"). Names and photos never reach it.

import { cleanFeatures } from './looks.js';

/** The concept an id draws: "boy~pgc1" -> "boy", "dog" -> "dog" */
export const conceptOf = (id) => String(id).split('~')[0];
/** The individual's key, or null for an ordinary concept id: "boy~pgc1" -> "pgc1" */
// (only a character's key: "letter_e~v2", a second figure of a kind in a sequence, is no one in particular)
export const whoOf = (id) => { const k = String(id).split('~')[1]; return k && /^pgc\d+$/.test(k) ? k : null; };

/**
 * Checks { key, base } pairs from a request: keys like "pgc1", bases that are concepts (looked up
 * with `known`). Returns a Map key -> individual id, at most 16.
 */
export function individualNames(list, known) {
  const names = new Map();
  for (const p of Array.isArray(list) ? list.slice(0, 16) : []) {
    if (p && /^pgc\d{1,3}$/.test(p.key) && typeof p.base === 'string' && known(p.base)) names.set(p.key, `${p.base}~${p.key}`);
  }
  return names;
}

const ROLES = ['main', 'hair', 'skin', 'pants'];

/**
 * A recurring character's look, the same in every scene, clip and comic panel: { key, base, look:
 * { seed?, main?, hair?, skin?, pants? } } -> Map individual id -> { seed, colors }. Colours are
 * "#rrggbb"; the seed (a short neutral string) picks whatever colours are not given. Without a look,
 * the key itself is the seed, so a character never borrows its looks from whoever else is in the
 * scene.
 */
export function individualLooks(list, known) {
  const looks = new Map();
  for (const [key, id] of individualNames(list, known)) {
    const look = (Array.isArray(list) ? list : []).find((p) => p?.key === key)?.look;
    const colors = {};
    for (const role of ROLES) if (typeof look?.[role] === 'string' && /^#[0-9a-f]{6}$/i.test(look[role])) colors[role] = look[role].toLowerCase();
    const seed = typeof look?.seed === 'string' && /^[a-z0-9]{1,16}$/i.test(look.seed) ? look.seed : key;
    looks.set(id, { seed: `who:${seed}`, colors: Object.keys(colors).length ? colors : null, features: cleanFeatures(look?.features) });
  }
  return looks;
}

/**
 * How one figure is drawn so it looks the same wherever it appears: a recurring character by its
 * own look; anyone else by the scene's seed, dressed differently from the others of its kind (alt).
 *   -> { seed, vary, colors? } for drawConcept
 */
export function lookOf(id, { seed = 1, k = 0, alt = 0, vary = false, looks } = {}) {
  const own = looks?.get(id);
  // (its own face and hair too, src/looks.js)
  const features = own?.features ? { features: own.features } : {};
  if (own) return own.colors ? { seed: own.seed, vary: false, colors: own.colors, ...features } : { seed: own.seed, vary: true, ...features };
  return { seed: `${seed}:${id}:${k}`, vary: vary || alt > 0 };
}
