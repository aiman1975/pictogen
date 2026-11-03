// "Your characters": recurring characters called by name in prompts ("Tom walks in, then waves"),
// who look the same in every scene, clip and comic panel: their own clothes, hair and skin (or fur),
// and a face from a photo if wanted. The photo is cropped to the head's oval here, in the browser,
// and never leaves it: the server only sees "the boy" and his colours, and the face is put on the
// finished drawing on this page, so GIF and video exports carry it too. Drawings mark where a face
// goes with data-face="cx cy r" (people.js).

const studio = window.pictogenStudio;
const panel = document.getElementById('characters-panel');
const KEY = 'pictogen.characters.v1';
const MAX = 8;
const BASES = [['boy', 'Boy'], ['girl', 'Girl'], ['man', 'Man'], ['woman', 'Woman'], ['old_woman', 'Grandma'], ['old_man', 'Grandpa'],
  ['baby', 'Baby'], ['dog', 'Dog'], ['cat', 'Cat']];
const PETS = new Set(['dog', 'cat']);
const PHOTO_BASES = BASES.filter(([b]) => !PETS.has(b));
// The colours to pick from: clothes, hair and skin for people, fur for pets
const SWATCHES = {
  main: ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#00897b', '#1e88e5', '#3949ab', '#8e24aa', '#ec407a', '#795548', '#455a64', '#fafafa'],
  hair: ['#212121', '#4e342e', '#795548', '#a1662f', '#e6b94f', '#c8662b', '#b0b0b0', '#f48fb1'],
  skin: ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'],
  fur: ['#bcaaa4', '#8d6e63', '#5d4037', '#fb8c00', '#ffe0b2', '#212121', '#9e9e9e', '#fafafa'],
};
// Face and hair to pick from (src/looks.js), and what each one is when nothing is picked
const FEATURES = [
  ['hair', 'Hair', [['own', 'As drawn'], ['short', 'Short'], ['spiky', 'Spiky'], ['curly', 'Curly'], ['afro', 'Afro'], ['pigtails', 'Pigtails'], ['bun', 'Bun'], ['ponytail', 'Ponytail'], ['long', 'Long'], ['bob', 'Bob'], ['bald', 'Bald']]],
  ['face', 'Face', [['round', 'Round'], ['oval', 'Oval'], ['square', 'Square'], ['wide', 'Wide']]],
  ['eyes', 'Eyes', [['small', 'Small'], ['normal', 'Normal'], ['big', 'Big']]],
  ['brows', 'Brows', [['none', 'None'], ['thin', 'Thin'], ['thick', 'Thick']]],
  ['nose', 'Nose', [['none', 'None'], ['dot', 'Dot'], ['button', 'Button'], ['pointy', 'Pointy']]],
  ['mouth', 'Mouth', [['small', 'Small'], ['normal', 'Normal'], ['big', 'Big']]],
  ['cheeks', 'Cheeks', [['none', 'None'], ['normal', 'Rosy'], ['big', 'Very rosy']]],
  ['beard', 'Beard', [['none', 'None'], ['stubble', 'Stubble'], ['short', 'Short'], ['long', 'Long'], ['moustache', 'Moustache']]],
  ['build', 'Body', [['slim', 'Slim'], ['normal', 'Normal'], ['round', 'Round'], ['big', 'Big belly']]],
  ['height', 'Height', [['short', 'Short'], ['normal', 'Normal'], ['tall', 'Tall']]],
  ['legs', 'Legs', [['short', 'Short'], ['normal', 'Normal'], ['long', 'Long']]],
  ['arms', 'Arms', [['short', 'Short'], ['normal', 'Normal'], ['long', 'Long']]],
];
const DEFAULT = { hair: 'own', face: 'round', eyes: 'normal', brows: 'none', nose: 'none', mouth: 'normal', cheeks: 'normal', beard: 'none', build: 'normal', height: 'normal', legs: 'normal', arms: 'normal' };
const FLAGS = [['freckles', 'Freckles'], ['lashes', 'Eyelashes'], ['glasses', 'Glasses']];
// Things to wear (src/gear.js): a diver is a mask, an air tank and flippers
const GEAR = [['mask', '🤿 Diving mask'], ['goggles', '🥽 Goggles'], ['helmet', '⛑️ Hard hat'], ['crown', '👑 Crown'], ['cap', '🧢 Cap'],
  ['headphones', '🎧 Headphones'], ['scarf', '🧣 Scarf'], ['tie', '👔 Tie'], ['tank', '🫧 Air tank'], ['backpack', '🎒 Backpack'],
  ['cape', '🦸 Cape'], ['wings', '🪽 Wings'], ['flippers', '🦶 Flippers'], ['boots', '🥾 Boots']];

/** What can be coloured on a kind of character: [role, label, swatches] */
const rolesOf = (base) => (PETS.has(base) ? [['main', 'Fur', SWATCHES.fur]]
  : base === 'baby' ? [['main', 'Clothes', SWATCHES.main], ['skin', 'Skin', SWATCHES.skin]]
    : [['main', 'Clothes', SWATCHES.main], ['hair', 'Hair', SWATCHES.hair], ['skin', 'Skin', SWATCHES.skin]]);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
/** A new character's look: colours of its own (clothes no one else wears, when there are enough) */
function newLook(base, others = []) {
  const look = { seed: Math.random().toString(36).slice(2, 8) || 'a' };
  for (const [role, , list] of rolesOf(base)) {
    const free = list.filter((c) => !others.some((o) => o.look?.[role] === c));
    look[role] = pick(role === 'main' && free.length ? free : list);
  }
  return look;
}
// The face oval: a little taller than wide, like a head. The saved photo is its bounding box.
const RATIO = 1.18;
const OUT_W = 200, OUT_H = Math.round(OUT_W * RATIO);
// The crop stage and the oval in it (stage pixels)
const STAGE_W = 300, STAGE_H = 354;
const OVAL = { w: 196, h: Math.round(196 * RATIO) };
OVAL.x = (STAGE_W - OVAL.w) / 2;
OVAL.y = (STAGE_H - OVAL.h) / 2 - 6;
const EYE_LINE = 0.43; // eyes this far down the oval
const MOUTH_LINE = 0.76; // the mouth: where the jaw is cut, to talk

let characters = load();
let uid = 0;

function load() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    const valid = Array.isArray(list) ? list.filter((c) => c && c.name && BASES.some(([b]) => b === c.base) && (!c.photo || typeof c.photo === 'string')) : [];
    // (characters saved before they had looks of their own get one now, kept from then on)
    let changed = false;
    valid.forEach((c, i) => { if (!c.look) { c.look = newLook(c.base, valid.slice(0, i)); changed = true; } });
    if (changed) try { localStorage.setItem(KEY, JSON.stringify(valid)); } catch { /* */ }
    return valid;
  } catch {
    return [];
  }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(characters)); return true; } catch { return false; }
}
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------------------------------------------------------------------------------------------
// Names in prompts, faces on drawings

/** The neutral key a character's name becomes in a prompt ("Tom" -> "pgc1"): no name leaves the page */
const keyOf = (c) => `pgc${characters.indexOf(c) + 1}`;
/** All characters as the engine knows them: { key, base, look } (kind and colours), never names or photos */
const individuals = () => characters.map((c) => ({ key: keyOf(c), base: c.base, look: c.look }));

/**
 * "Tom walks in, then Max waves at him" -> { text: "pgc1 walks in, then pgc2 waves at him",
 * named: [Tom, Max] }: each named character is a figure of its own, two boys as well.
 */
function rewrite(text) {
  let out = String(text || '');
  const hits = [];
  for (const c of [...characters].sort((a, b) => b.name.length - a.name.length)) {
    const re = new RegExp(`(\\b(?:the|a|an)\\s+)?\\b${reEsc(c.name)}\\b`, 'gi');
    let first = -1;
    // (not inside quoted speech: "Tom says “Hi Mia!”" says Mia's name as written)
    const quoted = [...out.matchAll(/["“][^"“”]*["”]/g)].map((q) => [q.index, q.index + q[0].length]);
    out = out.replace(re, (m, det, offset) => {
      if (quoted.some(([a, b]) => offset >= a && offset < b)) return m;
      // "a red rose" is a flower even with a Rose among the characters: a name after an article
      // counts only when capitalised ("the Rose we met")
      const word = m.slice(det ? det.length : 0);
      if (det && word[0] === word[0].toLowerCase()) return m;
      if (first < 0) first = offset;
      return keyOf(c);
    });
    if (first >= 0) hits.push({ c, first });
  }
  return { text: out, named: hits.sort((a, b) => a.first - b.first).map((h) => h.c) };
}

/** A character's name from the key the engine knows it by ("pgc1" -> "Tom") */
const nameOfKey = (key) => characters.find((c) => keyOf(c) === key)?.name ?? null;
/** Text from the engine with the names put back ("Pgc1 walks in." -> "Tom walks in.") */
const restore = (text) => (typeof text === 'string' ? text.replace(/\bpgc\d+\b/gi, (k) => nameOfKey(k.toLowerCase()) ?? k) : text);

const SVG = 'http://www.w3.org/2000/svg';
/** Puts each named character's photo on its figure (data-who: its key), in every pose it has. */
function apply(svg, named) {
  if (!svg || !named?.length) return svg;
  for (const c of named) {
    // (a scene's figures, and a comic strip's panels)
    for (const item of svg.querySelectorAll(`[data-who="${keyOf(c)}"]`)) {
      item.dataset.character = c.name;
      // (a comic strip's title says the name where the drawing says "GIRL")
      if (item.tagName === 'tspan') { item.textContent = c.name.toUpperCase(); continue; }
      if (c.photo) for (const head of item.querySelectorAll('[data-face]')) putFace(head, c.photo);
    }
  }
  return svg;
}

/** A face photo on one drawn head (data-face="cx cy r"), cut to talk at the mouth line */
function putFace(head, photo) {
    if (head.querySelector(':scope > .pg-photo-face')) return;
    const [cx, cy, r] = head.dataset.face.split(' ').map(Number);
    const rx = r * 1.02, ry = rx * RATIO, oy = cy - r * 0.06;
    const id = `pgface${Date.now().toString(36)}${uid++}`;
    const g = document.createElementNS(SVG, 'g');
    g.setAttribute('class', 'pg-photo-face');
    g.setAttribute('data-mood', head.dataset.mood || 'happy');
    // Cut at the mouth line: the upper face stays, the jaw below it drops to talk, showing a dark
    // mouth behind. Both fade out toward the oval's edge, so the drawn hair and head frame them.
    const top = oy - ry, mouth = top + 2 * ry * MOUTH_LINE, seam = 0.35;
    const img = `<image href="${photo}" x="${cx - rx}" y="${top}" width="${2 * rx}" height="${2 * ry}" preserveAspectRatio="none" mask="url(#${id})"/>`;
    g.innerHTML = `<defs><radialGradient id="${id}g"><stop offset="0.7" stop-color="#fff"/><stop offset="0.97" stop-color="#000"/></radialGradient>`
      + `<mask id="${id}" maskUnits="userSpaceOnUse"><ellipse cx="${cx}" cy="${oy}" rx="${rx}" ry="${ry}" fill="url(#${id}g)"/></mask>`
      + `<clipPath id="${id}u"><rect x="${cx - rx}" y="${top}" width="${2 * rx}" height="${mouth - top + seam}"/></clipPath>`
      + `<clipPath id="${id}j"><rect x="${cx - rx}" y="${mouth - seam}" width="${2 * rx}" height="${top + 2 * ry - mouth + seam}"/></clipPath></defs>`
      + `<ellipse class="pg-photo-mouth" cx="${cx}" cy="${mouth}" rx="${rx * 0.3}" ry="${r * 0.15}" fill="#3b1a1a" style="transform-box: view-box; transform-origin: ${cx}px ${mouth}px"/>`
      + `<g class="pg-photo-jaw" style="--jaw: ${(r * 0.13).toFixed(2)}px"><g clip-path="url(#${id}j)">${img}</g></g>`
      + `<g clip-path="url(#${id}u)">${img}</g>`;
    // Turned three-quarters or in profile, the photo narrows toward the side the figure faces
    const turn = { 'three-quarter': [0.84, 0.22], side: [0.66, 0.36] }[head.dataset.view];
    if (turn) g.setAttribute('transform', `translate(${cx + r * turn[1]} 0) scale(${turn[0]} 1) translate(${-cx} 0)`);
    // The drawn eyes and mouth hide under the photo (and would blink through it)
    head.querySelectorAll('.pg-face-eyes, .pg-face-mouth').forEach((f) => f.setAttribute('display', 'none'));
    head.appendChild(g);
}

/** The same for SVG markup (clip scenes, which are mounted again for video export) */
function withFaces(markup, named) {
  if (!named?.length || !markup) return markup;
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  if (doc.querySelector('parsererror')) return markup;
  apply(doc.documentElement, named);
  return new XMLSerializer().serializeToString(doc.documentElement);
}

// ---------------------------------------------------------------------------------------------
// The panel

function render() {
  const st = studio.getState();
  // (scenes, clips and comic strips)
  panel.hidden = !['scene', 'comic', 'story'].includes(st.mode);
  if (panel.hidden) return;
  const example = characters[0] ? `“${esc(characters[0].name)} walks in, then waves”` : '';
  const full = characters.length >= MAX ? 'disabled' : '';
  panel.innerHTML = `
    <div class="tl-head">
      <span class="tl-title">🙂 Your characters</span>
      <button class="tl-btn primary" data-do="new" ${full} title="A character with a name and a look of their own">＋ New character</button>
      <button class="tl-btn" data-do="add" ${full} title="Put a face from a photo on a character">📷 From a photo</button>
      <input type="file" accept="image/*" hidden>
    </div>
    ${characters.length ? `<ul class="char-list">${characters.map((c, i) => `
      <li class="char-row">${c.photo ? `<img src="${c.photo}" alt="">` : `<span class="char-pic" data-pic="${i}"></span>`}<span class="char-name">${esc(c.name)}</span><span class="char-base">${esc(labelOf(c.base))}</span>
        <button class="tl-btn" data-edit="${i}" aria-label="Change ${esc(c.name)}" title="Change the look">✎</button>
        <button class="tl-btn danger" data-remove="${i}" aria-label="Remove ${esc(c.name)}" title="Remove">✕</button></li>`).join('')}</ul>
      <div class="tl-empty">Use the names in prompts: ${example}. They look the same in every scene, clip and comic.</div>`
    : '<div class="tl-empty">Make a character (a boy, a grandma, a dog...) with a name and their own clothes and colours, and use the name in your prompts: they look the same in every scene. Add a face from a photo if you like; it stays in this browser.</div>'}`;
  // Each character without a photo is shown as drawn
  panel.querySelectorAll('[data-pic]').forEach(async (el) => {
    const c = characters[+el.dataset.pic];
    const markup = await drawing(c.base, c.look).catch(() => '');
    if (markup) el.innerHTML = `<svg viewBox="12 4 76 76" aria-hidden="true">${markup}</svg>`;
  });
}

const labelOf = (base) => BASES.find(([b]) => b === base)?.[1] ?? base;
/** A character drawn on its own, in the studio's style and its own colours (markup in 0..100 units) */
const drawn = new Map();
async function drawing(base, look, style = studio.getState().style) {
  const colors = Object.fromEntries(rolesOf(base).map(([role]) => [role, look?.[role]]).filter(([, v]) => v));
  const features = PETS.has(base) ? undefined : look?.features;
  const key = JSON.stringify([base, colors, look?.seed, style, features]);
  if (!drawn.has(key)) {
    drawn.set(key, fetch('/api/render-concept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: base, style, colors, features, seed: `who:${look?.seed ?? 'a'}`, expression: 'happy' }),
    }).then((r) => r.json()).then((d) => d.markup || ''));
  }
  return drawn.get(key);
}

/** Why a name can't be used (or '') */
function nameError(name, self = null) {
  if (!/^[\p{L}][\p{L}' -]{0,19}$/u.test(name)) return 'Give the character a name, using letters (for example Tom).';
  if (characters.some((c) => c !== self && c.name.toLowerCase() === name.toLowerCase())) return `There already is a character called ${name}.`;
  if (/^(the|a|an|he|she|they|it|boy|girl|man|woman|dog|cat|baby|grandma|grandpa|and|then)$/i.test(name)) return 'Pick a name that is not an everyday word.';
  return '';
}

/**
 * Making a character, or changing one: a name, what they are, and their colours, with the character
 * drawn as it will look (its photo face on, when it has one)
 */
function openEditor(existing = null) {
  const draft = existing
    ? { name: existing.name, base: existing.base, look: { ...existing.look }, photo: existing.photo }
    : (() => { const base = 'girl'; return { name: '', base, look: newLook(base, characters) }; })();
  const kinds = draft.photo ? PHOTO_BASES : BASES;
  const modal = document.createElement('div');
  modal.className = 'face-modal';
  modal.innerHTML = `
    <div class="face-card" role="dialog" aria-modal="true" aria-labelledby="char-title">
      <h3 id="char-title">${existing ? `Change ${esc(existing.name)}` : 'A new character'}</h3>
      <div class="char-preview" aria-hidden="true"></div>
      <div class="face-row">
        <label>Name <input class="face-name" maxlength="20" placeholder="e.g. Mia" autocomplete="off" value="${esc(draft.name)}"></label>
        <label>Is a <select class="face-base">${kinds.map(([b, l]) => `<option value="${b}"${b === draft.base ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <div class="char-colours"></div>
      <details class="char-more"><summary>🙂 Face, hair &amp; body</summary><div class="char-features"></div></details>
      <details class="char-more char-wear"><summary>🎒 Things to wear</summary><div class="char-features char-gear"></div></details>
      <p class="face-note">They look like this in every scene, clip and comic strip.</p>
      <p class="face-error" role="alert"></p>
      <div class="face-actions"><button class="tl-btn" data-do="cancel">Cancel</button><button class="tl-btn primary" data-do="save">${existing ? 'Save' : 'Make this character'}</button></div>
    </div>`;
  document.body.appendChild(modal);
  const preview = modal.querySelector('.char-preview');
  const colours = modal.querySelector('.char-colours');
  let shown = 0;
  const redraw = async () => {
    const n = ++shown;
    const markup = await drawing(draft.base, draft.look).catch(() => '');
    if (n !== shown) return;
    preview.innerHTML = `<svg viewBox="0 0 100 100">${markup}</svg>`;
    if (draft.photo) preview.querySelectorAll('[data-face]').forEach((head) => putFace(head, draft.photo));
  };
  const featureBox = modal.querySelector('.char-features');
  const paint = () => {
    colours.innerHTML = rolesOf(draft.base).map(([role, label, list]) => `
      <div class="char-swatches" role="radiogroup" aria-label="${label}"><span>${label}</span>${list.map((c) => `<button type="button" class="char-swatch${draft.look[role] === c ? ' on' : ''}" role="radio" aria-checked="${draft.look[role] === c}" data-role="${role}" data-colour="${c}" style="--c:${c}" title="${label}"></button>`).join('')}</div>`).join('');
    // Face and hair, for people (src/looks.js): the drawn hair and face unless one is picked
    modal.querySelector('.char-more').hidden = PETS.has(draft.base);
    const f = draft.look.features ?? {};
    featureBox.innerHTML = FEATURES.map(([key, label, list]) => `
      <div class="char-chips" role="radiogroup" aria-label="${label}"><span>${label}</span>${list.map(([v, l]) => `<button type="button" class="char-chip${(f[key] ?? DEFAULT[key]) === v ? ' on' : ''}" data-feature="${key}" data-value="${v}">${l}</button>`).join('')}</div>`).join('')
      + `<div class="char-chips"><span>Extras</span>${FLAGS.map(([k, l]) => `<button type="button" class="char-chip${f[k] ? ' on' : ''}" data-flag="${k}" aria-pressed="${!!f[k]}">${l}</button>`).join('')}</div>`;
    modal.querySelector('.char-wear').hidden = PETS.has(draft.base);
    const worn = new Set(f.gear ?? []);
    gearBox.innerHTML = `<div class="char-chips">${GEAR.map(([k, l]) => `<button type="button" class="char-chip${worn.has(k) ? ' on' : ''}" data-gear="${k}" aria-pressed="${worn.has(k)}">${l}</button>`).join('')}</div>`;
    redraw();
  };
  const gearBox = modal.querySelector('.char-gear');
  paint();
  const close = () => modal.remove();
  const error = (msg) => { modal.querySelector('.face-error').textContent = msg; };
  modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  modal.querySelector('.face-base').addEventListener('change', (e) => {
    draft.base = e.target.value;
    // (a dog has fur, not clothes: colours that don't fit the new kind are picked again)
    for (const [role, , list] of rolesOf(draft.base)) if (!list.includes(draft.look[role])) draft.look[role] = pick(list);
    paint();
  });
  modal.addEventListener('click', (e) => {
    const sw = e.target.closest('.char-swatch');
    if (sw) { draft.look[sw.dataset.role] = sw.dataset.colour; paint(); return; }
    const chip = e.target.closest('.char-chip');
    if (chip) {
      const f = { ...draft.look.features };
      if (chip.dataset.gear) {
        const g = new Set(f.gear ?? []);
        if (g.has(chip.dataset.gear)) g.delete(chip.dataset.gear); else g.add(chip.dataset.gear);
        if (g.size) f.gear = [...g]; else delete f.gear;
      } else if (chip.dataset.flag) { if (f[chip.dataset.flag]) delete f[chip.dataset.flag]; else f[chip.dataset.flag] = true; }
      else if (chip.dataset.value === DEFAULT[chip.dataset.feature]) delete f[chip.dataset.feature];
      else f[chip.dataset.feature] = chip.dataset.value;
      draft.look.features = Object.keys(f).length ? f : undefined;
      paint();
      return;
    }
    const act = e.target.closest('[data-do]')?.dataset.do;
    if (act === 'cancel') return close();
    if (act !== 'save') return;
    const name = modal.querySelector('.face-name').value.trim().replace(/\s+/g, ' ');
    const why = nameError(name, existing);
    if (why) return error(why);
    const look = { seed: draft.look.seed, ...Object.fromEntries(rolesOf(draft.base).map(([role]) => [role, draft.look[role]])),
      ...(draft.look.features && !PETS.has(draft.base) ? { features: draft.look.features } : {}) };
    if (existing) Object.assign(existing, { name, base: draft.base, look });
    else characters.push({ name, base: draft.base, look });
    save();
    close();
    render();
    studio.showToast(existing ? `${name} is changed` : `${name} is ready: try “${name} walks in, then waves”`);
  });
  modal.querySelector('.face-name').focus();
}

panel.addEventListener('click', (e) => {
  const el = e.target.closest('button');
  if (!el) return;
  if (el.dataset.do === 'add') panel.querySelector('input[type=file]').click();
  else if (el.dataset.do === 'new') openEditor();
  else if (el.dataset.edit !== undefined) openEditor(characters[+el.dataset.edit]);
  else if (el.dataset.remove !== undefined) {
    const [gone] = characters.splice(+el.dataset.remove, 1);
    save();
    render();
    studio.showToast(`Removed ${gone.name}`);
  }
});
panel.addEventListener('change', (e) => {
  if (!e.target.matches('input[type=file]') || !e.target.files[0]) return;
  const file = e.target.files[0];
  e.target.value = '';
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => openCrop(img, () => URL.revokeObjectURL(url));
  img.onerror = () => { URL.revokeObjectURL(url); studio.showToast('That file is not a picture this browser can open'); };
  img.src = url;
});

// ---------------------------------------------------------------------------------------------
// Cropping: the photo moves and zooms under a fixed face oval

/**
 * A plain background (a wall behind a selfie) fades away around the face, so the drawn head and
 * hair show there instead. The background's colour is read row by row just left and right of the
 * oval, in the wider photo on the crop stage (so a wall lit unevenly still counts as plain); where
 * the two sides disagree, or the photo is busy, it stays. The middle of the face is never touched.
 *   out: the saved crop (the oval's box); stage: the crop stage canvas (scale k = its pixel ratio)
 */
function removeBackground(out, stage, k) {
  const sp = stage.getContext('2d').getImageData(0, 0, stage.width, stage.height).data;
  const at = (x, y) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const i = ((Math.round(y * k) + dy) * stage.width + Math.round(x * k) + dx) * 4;
      r += sp[i]; g += sp[i + 1]; b += sp[i + 2]; n++;
    }
    return [r / n, g / n, b / n];
  };
  const ctx = out.getContext('2d'), { width: w, height: h } = out;
  const img = ctx.getImageData(0, 0, w, h), px = img.data;
  // The background beside each row of the oval: its colour, and how much the two sides differ
  const rows = [];
  let busy = 0;
  for (let y = 0; y < h; y++) {
    const sy = OVAL.y + (y / h) * OVAL.h;
    const L = at(OVAL.x - 8, sy), R = at(OVAL.x + OVAL.w + 8, sy);
    const spread = Math.hypot(L[0] - R[0], L[1] - R[1], L[2] - R[2]) / 2;
    rows.push({ c: L.map((v, j) => (v + R[j]) / 2), spread });
    busy += spread;
  }
  if (busy / h > 34) return false;
  const ring = (x, y) => Math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2));
  for (let y = 0; y < h; y++) {
    const { c, spread } = rows[y];
    if (spread > 40) continue;
    for (let x = 0; x < w; x++) {
      const r = ring(x, y);
      if (r < 0.55) continue;
      const i = (y * w + x) * 4;
      const d = Math.hypot(px[i] - c[0], px[i + 1] - c[1], px[i + 2] - c[2]);
      // Less is taken nearer the middle: the threshold eases in across the ring
      const near = (22 + spread) * Math.min(1, (r - 0.55) / 0.25), far = 54 + spread;
      px[i + 3] = Math.round(px[i + 3] * (d < near ? 0 : d < far ? (d - near) / (far - near) : 1));
    }
  }
  ctx.putImageData(img, 0, 0);
  return true;
}

/** The skin tone nearest the cheeks in a cropped face (the oval's box), or null */
function skinOf(out) {
  const { width: w, height: h } = out;
  const px = out.getContext('2d').getImageData(Math.round(w * 0.28), Math.round(h * 0.55), Math.round(w * 0.44), Math.round(h * 0.12)).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 200) { r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
  if (!n) return null;
  const rgb = [r / n, g / n, b / n];
  const hex = (c) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
  return SWATCHES.skin.reduce((best, c) => {
    const d = hex(c).reduce((sum, v, k) => sum + (v - rgb[k]) ** 2, 0);
    return d < best.d ? { c, d } : best;
  }, { c: null, d: Infinity }).c;
}

function openCrop(img, done) {
  const modal = document.createElement('div');
  modal.className = 'face-modal';
  const used = new Set(characters.map((c) => c.base));
  const base = PHOTO_BASES.find(([b]) => !used.has(b))?.[0] ?? 'boy';
  modal.innerHTML = `
    <div class="face-card" role="dialog" aria-modal="true" aria-labelledby="face-title">
      <h3 id="face-title">Fit the face in the oval</h3>
      <p class="face-help">Drag the photo so the face fills the oval: <b>eyes on the yellow line</b>, <b>mouth on the pink line</b>, <b>chin at the bottom</b> of the oval. Hair may go outside it. (The mouth line is where the face opens to talk.)</p>
      <div class="face-stage" style="width:${STAGE_W}px;height:${STAGE_H}px">
        <canvas width="${STAGE_W * 2}" height="${STAGE_H * 2}" style="width:${STAGE_W}px;height:${STAGE_H}px"></canvas>
        <svg viewBox="0 0 ${STAGE_W} ${STAGE_H}" aria-hidden="true">
          <path fill="rgb(15 23 42 / .62)" fill-rule="evenodd" d="M0 0H${STAGE_W}V${STAGE_H}H0Z M${OVAL.x} ${OVAL.y + OVAL.h / 2}a${OVAL.w / 2} ${OVAL.h / 2} 0 1 0 ${OVAL.w} 0a${OVAL.w / 2} ${OVAL.h / 2} 0 1 0 ${-OVAL.w} 0Z"/>
          <ellipse cx="${STAGE_W / 2}" cy="${OVAL.y + OVAL.h / 2}" rx="${OVAL.w / 2}" ry="${OVAL.h / 2}" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="6 5"/>
          <line x1="${OVAL.x + 18}" x2="${OVAL.x + OVAL.w - 18}" y1="${OVAL.y + OVAL.h * EYE_LINE}" y2="${OVAL.y + OVAL.h * EYE_LINE}" stroke="#fde68a" stroke-width="1.5" stroke-dasharray="4 4"/>
          <text x="${OVAL.x + OVAL.w + 6}" y="${OVAL.y + OVAL.h * EYE_LINE + 4}" fill="#fde68a" font-size="12" font-weight="700">eyes</text>
          <line x1="${OVAL.x + 46}" x2="${OVAL.x + OVAL.w - 46}" y1="${OVAL.y + OVAL.h * MOUTH_LINE}" y2="${OVAL.y + OVAL.h * MOUTH_LINE}" stroke="#fda4af" stroke-width="1.5" stroke-dasharray="4 4"/>
          <text x="${OVAL.x + OVAL.w - 40}" y="${OVAL.y + OVAL.h * MOUTH_LINE + 4}" fill="#fda4af" font-size="12" font-weight="700">mouth</text>
          <path d="M${STAGE_W / 2 - 14} ${OVAL.y + OVAL.h} h28" stroke="#fde68a" stroke-width="3" stroke-linecap="round"/>
          <text x="${STAGE_W / 2}" y="${OVAL.y + OVAL.h + 17}" fill="#fde68a" font-size="12" font-weight="700" text-anchor="middle">chin</text>
        </svg>
      </div>
      <label class="face-zoom">Zoom <input type="range" min="0" max="1" step="0.001" aria-label="Zoom"></label>
      <div class="face-row">
        <label>Name <input class="face-name" maxlength="20" placeholder="e.g. Tom" autocomplete="off"></label>
        <label>Is a <select class="face-base">${PHOTO_BASES.map(([b, l]) => `<option value="${b}"${b === base ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <label class="face-check"><input type="checkbox" class="face-plain" checked> Remove a plain background around the face</label>
      <p class="face-note">🔒 The photo stays in this browser: it is never uploaded.</p>
      <p class="face-error" role="alert"></p>
      <div class="face-actions"><button class="tl-btn" data-do="cancel">Cancel</button><button class="tl-btn primary" data-do="save">Use this face</button></div>
    </div>`;
  document.body.appendChild(modal);
  const canvas = modal.querySelector('canvas'), ctx = canvas.getContext('2d');
  const zoomInput = modal.querySelector('input[type=range]');
  // Zoom: from the photo just covering the oval to 6x that; the photo's centre sits at (x, y)
  const minZ = Math.max(OVAL.w / img.width, OVAL.h / img.height);
  const maxZ = minZ * 6;
  const view = { z: minZ * 1.35, x: STAGE_W / 2, y: OVAL.y + OVAL.h / 2 + OVAL.h * 0.08 };
  const toSlider = (z) => Math.log(z / minZ) / Math.log(maxZ / minZ);
  const fromSlider = (v) => minZ * (maxZ / minZ) ** v;
  const draw = (c = ctx, k = 2, ox = 0, oy = 0) => {
    c.setTransform(k, 0, 0, k, -ox * k, -oy * k);
    c.fillStyle = '#e2e8f0';
    c.fillRect(ox, oy, STAGE_W, STAGE_H);
    c.drawImage(img, view.x - (img.width * view.z) / 2, view.y - (img.height * view.z) / 2, img.width * view.z, img.height * view.z);
  };
  const zoomTo = (z, cx = STAGE_W / 2, cy = OVAL.y + OVAL.h / 2) => {
    z = Math.min(maxZ, Math.max(minZ, z));
    view.x = cx + ((view.x - cx) * z) / view.z;
    view.y = cy + ((view.y - cy) * z) / view.z;
    view.z = z;
    zoomInput.value = toSlider(z);
    draw();
  };
  zoomInput.value = toSlider(view.z);
  draw();

  const stage = modal.querySelector('.face-stage');
  stage.addEventListener('pointerdown', (e) => {
    stage.setPointerCapture(e.pointerId);
    let px = e.clientX, py = e.clientY;
    const move = (ev) => { view.x += ev.clientX - px; view.y += ev.clientY - py; px = ev.clientX; py = ev.clientY; draw(); };
    const up = () => { stage.removeEventListener('pointermove', move); stage.removeEventListener('pointerup', up); };
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
  });
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    zoomTo(view.z * Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  zoomInput.addEventListener('input', () => zoomTo(fromSlider(+zoomInput.value)));

  const close = () => { modal.remove(); done?.(); };
  const error = (msg) => { modal.querySelector('.face-error').textContent = msg; };
  modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  modal.addEventListener('click', (e) => {
    const act = e.target.closest('[data-do]')?.dataset.do;
    if (act === 'cancel') return close();
    if (act !== 'save') return;
    const name = modal.querySelector('.face-name').value.trim().replace(/\s+/g, ' ');
    const why = nameError(name);
    if (why) return error(why);
    // Save the oval's box at OUT_W x OUT_H
    const out = document.createElement('canvas');
    out.width = OUT_W; out.height = OUT_H;
    draw(out.getContext('2d'), OUT_W / OVAL.w, OVAL.x, OVAL.y);
    // With the background gone the photo needs transparency: WebP where the browser can, else PNG
    const cleared = modal.querySelector('.face-plain').checked && removeBackground(out, canvas, 2);
    const webp = cleared && out.toDataURL('image/webp', 0.9);
    const photo = cleared ? (webp.startsWith('data:image/webp') ? webp : out.toDataURL('image/png')) : out.toDataURL('image/jpeg', 0.88);
    const base = modal.querySelector('.face-base').value;
    // Their own colours, the drawn skin (neck, hands) matching the face's
    const look = newLook(base, characters);
    const skin = skinOf(out);
    if (skin) look.skin = skin;
    characters.push({ name, base, photo, look });
    if (!save()) { characters.pop(); return error('The browser has no room left to keep this photo.'); }
    close();
    render();
    studio.showToast(`${name} is ready: try “${name} walks in, then waves” (✎ changes their clothes)`);
  });
  modal.querySelector('.face-name').focus();
}

/** Keeps a character from a story ("Mia", a girl) as one of yours: '' when done, else why not */
function keep(name, base) {
  if (!BASES.some(([b]) => b === base)) return `${name} can't be kept as a character yet (only people and pets)`;
  if (characters.length >= MAX) return `There is room for ${MAX} characters`;
  const why = nameError(name);
  if (why) return why;
  characters.push({ name, base, look: newLook(base, characters) });
  save();
  render();
  return '';
}

window.pictogenCharacters = { rewrite, apply, withFaces, individuals, nameOfKey, restore, keep, refresh: render, list: () => characters, BASES };
render();
