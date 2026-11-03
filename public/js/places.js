// "Your places" (scene maker, step 2): a place made here - where, the time of day, the weather and
// things that move - kept under a name and called by it in prompts and stories ("Tom waves at
// Grandma's farm"). Kept in this browser; the engine only gets a neutral key ("pgp1") and what the
// place is made of (src/places.js), never the name.

const studio = window.pictogenStudio;
const panel = document.getElementById('places-panel');
const KEY = 'pictogen.places.v1';
const MAX = 12;

// What can be picked (the engine's PLACE_CHOICES), with a picture and words for each
const PLACES = [
  ['meadow', '🌿 Meadow'], ['park', '🌳 Park'], ['forest', '🌲 Forest'], ['jungle', '🌴 Jungle'], ['city', '🏙️ City'],
  ['beach', '🏖️ Beach'], ['sea', '🌊 Sea'], ['underwater', '🐠 Under the sea'], ['desert', '🏜️ Desert'], ['mountains', '⛰️ Mountains'],
  ['farm', '🚜 Farm'], ['castle', '🏰 Castle'], ['space', '🪐 Space'],
  ['classroom', '🏫 Classroom'], ['office', '💼 Office'], ['kitchen', '🍳 Kitchen'], ['bedroom', '🛏️ Bedroom'], ['room', '🛋️ Room'],
];
const TIMES = [['day', '☀️ Day'], ['sunset', '🌇 Sunset'], ['night', '🌙 Night']];
const WEATHER = [['clear', 'Clear'], ['rain', '🌧️ Rain'], ['snow', '❄️ Snow'], ['autumn', '🍂 Autumn']];
const EXTRAS = [
  ['mountains', '⛰️ Mountains behind'], ['castle', '🏰 A castle behind'], ['clouds', '☁️ Clouds drifting'], ['stars', '✨ Twinkling stars'],
  ['shooting', '🌠 Shooting star'], ['fireflies', '🟡 Fireflies'], ['butterflies', '🦋 Butterflies'], ['bubbles', '🫧 Bubbles'], ['leaves', '🍁 Falling leaves'],
];
const ROOMS = new Set(['classroom', 'office', 'kitchen', 'bedroom', 'room']);
// (plain place words stay what they are in every prompt: a place can't be called just "forest")
const PLAIN = /^(the |a |an )?(meadow|park|forest|woods|jungle|city|town|beach|sea|ocean|lake|river|desert|mountains?|farm|castle|space|classroom|school|office|kitchen|bedroom|room|home|garden|street|house|night|day|sunset|rain|snow|autumn|winter|underwater|outside|inside)$/i;

let places = load();

function load() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((p) => p && typeof p.name === 'string' && PLACES.some(([k]) => k === p.place)).slice(0, MAX) : [];
  } catch {
    return [];
  }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(places)); return true; } catch { return false; }
}
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const label = (list, k) => list.find(([v]) => v === k)?.[1] ?? k;

// ---------------------------------------------------------------------------------------------
// Names in prompts

/** The neutral key a place's name becomes ("Grandma's farm" -> "pgp1") */
const keyOf = (p) => `pgp${places.indexOf(p) + 1}`;
/** All places as the engine knows them: keys and what they are made of, never names */
const asSent = (p, key = keyOf(p)) => ({ key, place: p.place, time: p.time, weather: p.weather, extras: p.extras ?? [] });
const list = () => places.map((p) => asSent(p));

/** "Tom waves at Grandma's farm" -> "Tom waves at pgp1" (not inside quoted speech) */
function rewrite(text) {
  let out = String(text || '');
  for (const p of [...places].sort((a, b) => b.name.length - a.name.length)) {
    const quoted = [...out.matchAll(/["“][^"“”]*["”]/g)].map((q) => [q.index, q.index + q[0].length]);
    out = out.replace(new RegExp(`(?<![\\p{L}\\d])${reEsc(p.name)}(?![\\p{L}\\d])`, 'giu'), (m, offset) => (quoted.some(([a, b]) => offset >= a && offset < b) ? m : keyOf(p)));
  }
  return out;
}
/** Keys back to names ("in pgp1" -> "in Grandma's farm") */
const restore = (text) => (typeof text === 'string' ? text.replace(/\bpgp\d+\b/gi, (k) => places.find((p) => keyOf(p) === k.toLowerCase())?.name ?? k) : text);

/** Why a name can't be used (or '') */
function nameError(name, self = null) {
  if (!/^[\p{L}\d][\p{L}\d' -]{0,29}$/u.test(name)) return 'Give the place a name, using letters (for example Grandma\'s farm).';
  if (PLAIN.test(name)) return 'Pick a name of its own (for example "Magic forest"), not a plain place word.';
  if (places.some((p) => p !== self && p.name.toLowerCase() === name.toLowerCase())) return `There already is a place called ${name}.`;
  if ((window.pictogenCharacters?.list() ?? []).some((c) => c.name.toLowerCase() === name.toLowerCase())) return `${name} is one of your characters.`;
  return '';
}

// ---------------------------------------------------------------------------------------------
// Pictures of a place: drawn by the engine with nobody in it

const drawn = new Map();
function picture(p, style = studio.getState().style) {
  const sent = asSent(p, 'pgp1');
  const key = JSON.stringify([sent, style]);
  if (!drawn.has(key)) {
    drawn.set(key, fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'pgp1', places: [sent], style, mode: 'scene', seed: 7, width: 640, height: 360 }),
    }).then((r) => r.json()).then((d) => d.svg || '').catch(() => ''));
  }
  return drawn.get(key);
}

// ---------------------------------------------------------------------------------------------
// The panel

function render() {
  const st = studio.getState();
  panel.hidden = !['scene', 'story'].includes(st.mode);
  if (panel.hidden) return;
  const full = places.length >= MAX ? 'disabled' : '';
  const example = places[0] ? `“a girl waves at ${esc(places[0].name)}”` : '';
  panel.innerHTML = `
    <div class="tl-head">
      <span class="tl-title">🏞️ Your places</span>
      <button class="tl-btn primary" data-do="new" ${full} title="A place with a name: where, when, the weather and what moves">＋ New place</button>
    </div>
    ${places.length ? `<ul class="char-list">${places.map((p, i) => `
      <li class="char-row place-row"><span class="place-pic" data-pic="${i}"></span><span class="char-name">${esc(p.name)}</span><span class="char-base">${esc(label(PLACES, p.place).replace(/^\S+\s/, ''))}</span>
        <button class="tl-btn" data-edit="${i}" aria-label="Change ${esc(p.name)}" title="Change the place">✎</button>
        <button class="tl-btn danger" data-remove="${i}" aria-label="Remove ${esc(p.name)}" title="Remove">✕</button></li>`).join('')}</ul>
      <div class="tl-empty">Use the names in prompts and stories: ${example}. The place stays as you made it; say "at night" or "in the rain" to change it for one scene.</div>`
    : '<div class="tl-empty">Make a place of your own: pick where it is (a farm, space, under the sea, a classroom...), the time of day, the weather and things that move (clouds, fireflies, a shooting star...). Give it a name and use the name in your prompts and stories.</div>'}`;
  panel.querySelectorAll('[data-pic]').forEach(async (el) => {
    const svg = await picture(places[+el.dataset.pic]);
    if (svg) el.innerHTML = svg;
  });
}

function openEditor(existing = null) {
  const draft = existing
    ? { name: existing.name, place: existing.place, time: existing.time, weather: existing.weather, extras: [...(existing.extras ?? [])] }
    : { name: '', place: 'farm', time: 'day', weather: 'clear', extras: ['clouds'] };
  const modal = document.createElement('div');
  modal.className = 'face-modal';
  modal.innerHTML = `
    <div class="face-card place-card" role="dialog" aria-modal="true" aria-labelledby="place-title">
      <h3 id="place-title">${existing ? `Change ${esc(existing.name)}` : 'A new place'}</h3>
      <div class="place-preview" aria-hidden="true"></div>
      <label class="face-row">Name <input class="face-name" maxlength="30" placeholder="e.g. Grandma's farm" autocomplete="off" value="${esc(draft.name)}"></label>
      <div class="char-features place-choices"></div>
      <p class="face-note">It moves in the studio, in clips and in exports. The name stays in this browser.</p>
      <p class="face-error" role="alert"></p>
      <div class="face-actions"><button class="tl-btn" data-do="cancel">Cancel</button><button class="tl-btn primary" data-do="save">${existing ? 'Save' : 'Make this place'}</button></div>
    </div>`;
  document.body.appendChild(modal);
  const preview = modal.querySelector('.place-preview');
  const choices = modal.querySelector('.place-choices');
  let shown = 0;
  const redraw = async () => {
    const n = ++shown;
    const svg = await picture(draft);
    if (n === shown) preview.innerHTML = svg;
  };
  const chips = (key, title, list, on) => `<div class="char-chips" role="group" aria-label="${title}"><span>${title}</span>${list.map(([v, l]) => `<button type="button" class="char-chip${on(v) ? ' on' : ''}" data-key="${key}" data-value="${v}" aria-pressed="${on(v)}">${l}</button>`).join('')}</div>`;
  const paint = () => {
    const room = ROOMS.has(draft.place);
    choices.innerHTML = chips('place', 'Where', PLACES, (v) => draft.place === v)
      + chips('time', 'When', TIMES, (v) => draft.time === v)
      + (room ? '' : chips('weather', 'Weather', WEATHER, (v) => draft.weather === v))
      + (room ? '' : chips('extras', 'And', EXTRAS, (v) => draft.extras.includes(v)));
    redraw();
  };
  paint();
  const close = () => modal.remove();
  const error = (msg) => { modal.querySelector('.face-error').textContent = msg; };
  modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  modal.addEventListener('click', (e) => {
    const chip = e.target.closest('.char-chip');
    if (chip) {
      const { key, value } = chip.dataset;
      if (key === 'extras') draft.extras = draft.extras.includes(value) ? draft.extras.filter((x) => x !== value) : [...draft.extras, value];
      else draft[key] = value;
      paint();
      return;
    }
    const act = e.target.closest('[data-do]')?.dataset.do;
    if (act === 'cancel') return close();
    if (act !== 'save') return;
    const name = modal.querySelector('.face-name').value.trim().replace(/\s+/g, ' ');
    const why = nameError(name, existing);
    if (why) return error(why);
    const made = { name, place: draft.place, time: draft.time, weather: ROOMS.has(draft.place) ? 'clear' : draft.weather, extras: ROOMS.has(draft.place) ? [] : draft.extras };
    if (existing) Object.assign(existing, made);
    else places.push(made);
    if (!save()) return error('The browser has no room left to keep this place.');
    close();
    render();
    studio.showToast(existing ? `${name} is changed` : `${name} is ready: try “a girl waves at ${name}”`);
  });
  modal.querySelector('.face-name').focus();
}

panel.addEventListener('click', (e) => {
  const el = e.target.closest('button');
  if (!el) return;
  if (el.dataset.do === 'new') openEditor();
  else if (el.dataset.edit !== undefined) openEditor(places[+el.dataset.edit]);
  else if (el.dataset.remove !== undefined) {
    const [gone] = places.splice(+el.dataset.remove, 1);
    save();
    render();
    studio.showToast(`Removed ${gone.name}`);
  }
});

window.pictogenPlaces = { rewrite, restore, places: list, list: () => places, refresh: render };
render();
