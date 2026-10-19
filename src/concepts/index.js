// Concept registry. Each category file exports an array of concept definitions.
// See docs/CONCEPT_GUIDE.md for the definition format.

import sky from './sky.js';
import nature from './nature.js';
import people from './people.js';
import characters from './characters.js';
import animals from './animals.js';
import wildlife from './wildlife.js';
import vehicles from './vehicles.js';
import food from './food.js';
import objects from './objects.js';
import alphabet from './alphabet.js';
import { loadFluentConcepts } from './fluent_loader.js';

const REGISTRY = new Map();
let version = 0;

const DEFAULTS = {
  placement: 'ground', // sky | air | ground | water | underwater | background
  scale: 0.5,          // real-world height relative to a standing person (= 1)
  baseline: 96,        // y (in the 100x100 box) where the object touches the ground
  width: 0.8,          // fraction of the 100-unit box the drawing occupies horizontally
  category: 'misc',
  aliases: [],
  tags: [],
  colors: {},
};

export function registerConcept(def) {
  if (!def || !def.id || typeof def.draw !== 'function') {
    throw new Error('A concept needs an `id` and a `draw(d, p)` function');
  }
  const c = { ...DEFAULTS, label: def.id.replace(/_/g, ' '), ...def };
  REGISTRY.set(c.id, c);
  version++;
  return c;
}

// 1. Primary core concepts (custom handcrafted parametric SVG)
for (const list of [sky, nature, people, characters, animals, wildlife, vehicles, food, objects, alphabet]) {
  for (const def of list) registerConcept(def);
}

// 2. Secondary library (3,170+ MIT-licensed vector concepts)
for (const def of loadFluentConcepts()) {
  if (!REGISTRY.has(def.id)) {
    registerConcept(def);
  }
}

export const getConcept = (id) => REGISTRY.get(id);
export const listConcepts = () => [...REGISTRY.values()];
export const registryVersion = () => version;
