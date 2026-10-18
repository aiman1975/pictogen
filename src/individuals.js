// Named individuals: several figures of one kind that each act on their own ("Tom and Max", two
// boys). The studio turns each character's name into a neutral key ("pgc1") before a prompt leaves
// the browser, and sends { key, base } pairs; the engine reads the key as a word for its figure and
// gives that figure its own id, `${base}~${key}` ("boy~pgc1"). Names and photos never reach it.

/** The concept an id draws: "boy~pgc1" -> "boy", "dog" -> "dog" */
export const conceptOf = (id) => String(id).split('~')[0];
/** The individual's key, or null for an ordinary concept id: "boy~pgc1" -> "pgc1" */
export const whoOf = (id) => String(id).split('~')[1] ?? null;

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
