// "How I read your story": for a story written in the story box (read by src/story-reader.js), who
// is in it and, scene by scene, the writer's sentence, what will be drawn for it, and the words that
// could not be. What to draw can be changed (kept with that sentence while the story is reworked),
// and a character from the story can be kept as one of "Your characters", to give them their own
// colours or a photo face.

const studio = window.pictogenStudio;
const panel = document.getElementById('story-review');
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const kindLabel = (id) => window.pictogenCharacters?.BASES?.find(([b]) => b === id)?.[1]?.toLowerCase() ?? String(id).replace(/_/g, ' ');
const SMALL = new Set(['lives', 'live', 'is', 'are', 'was', 'were', 'has', 'have', 'had', 'does', 'goes', 'gets', 'got', 'says', 'said',
  'feels', 'felt', 'very', 'too', 'also', 'just', 'again', 'some', 'every', 'once', 'upon', 'time', 'then', 'there', 'next', 'end']);
const isKey = (name) => /^pgc\d+$/.test(name ?? '');
// (your characters' keys in a scene card, said by their names)
const nm = (text) => String(text ?? '').replace(/\bpgc\d+\b/g, (k) => window.pictogenCharacters?.nameOfKey(k) ?? k);
const MOODS = [['tense', '😬 Tense'], ['joyful', '🎉 Joyful'], ['sad', '😢 Sad'], ['calm', '😌 Calm'], ['mystery', '🔮 Mystery'], ['none', 'No mood']];
const moodName = (m) => MOODS.find(([k]) => k === m)?.[1] ?? 'none';

// What a step can be (src/timeline.js editTimeline): a value for each, said plainly
const DOES = [
  ['enter', 'walks in'], ['enter:run', 'runs in'], ['moveTo', 'goes to…'], ['moveTo:run', 'runs to…'], ['moveTo:hug', 'hugs…'],
  ['approach', 'comes closer'], ['recede', 'walks away'], ['exit', 'leaves'], ['look', 'looks at…'],
  ['pose:wave', 'waves'], ['pose:point', 'points'], ['pose:talk', 'talks'], ['pose:jump', 'jumps'], ['pose:cheer', 'cheers'],
  ['pose:dance', 'dances'], ['pose:thumbsup', 'thumbs up'], ['pose:think', 'thinks'], ['pose:hold', 'holds on'], ['pose:sit', 'sits'],
  ['pose:sleep', 'sleeps'], ['pose:swim', 'swims'], ['pose:fly', 'flies'], ['pose:spin', 'spins'],
  ...['happy', 'sad', 'surprised', 'scared', 'angry', 'excited', 'confused', 'sleepy', 'laugh', 'love', 'shy'].map((f) => [`expr:${f}`, `looks ${f === 'laugh' ? 'amused' : f === 'love' ? 'in love' : f}`]),
];
const NEEDS_TARGET = new Set(['moveTo', 'moveTo:run', 'moveTo:hug', 'look']);
const doesOf = (st) => (st.type === 'pose' ? `pose:${st.anim}` : st.type === 'expr' ? `expr:${st.expression}` : st.type === 'moveTo' ? (st.hug ? 'moveTo:hug' : st.gait === 'run' ? 'moveTo:run' : 'moveTo') : st.type === 'enter' && st.gait === 'run' ? 'enter:run' : st.type);
/** A step as chosen in the editor (what it does, keeping its words and its feeling) */
function stepOf(old, does, actor, target) {
  const [type, how] = does.split(':');
  const st = { actor, type, gait: how === 'run' ? 'run' : 'walk' };
  if (type === 'pose') st.anim = how;
  if (type === 'expr') st.expression = how;
  if (type === 'moveTo' && how === 'hug') st.hug = true;
  if (NEEDS_TARGET.has(does)) st.target = target;
  if (type === 'pose' && how === 'talk' && old?.speech) st.speech = old.speech;
  if (old?.expression && type !== 'expr') st.expression = old.expression;
  if (old?.with) st.with = true;
  return st;
}
// The step editor's draft: { caption, steps } while one scene's steps are being changed
let draft = null;
// Adding to a scene: { caption, kind: 'figure' | 'object' } while its ＋ is open
let adding = null;
// The message editor's draft: { caption, lines: [{ id, text, from }], board } (from: the line it was, or -1)
let saying = null;
const reEsc = (t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// (who says a line, in front of its words: "Mia says", "the email says", "she says")
const SPEAKER = '(?:(?:[A-Z][a-z]+(?: [A-Z][a-z]+)?|the [a-z]+|he|she|they|it)\\s+says\\s+)?';
/** A prompt tidied after words came out of it: no empty "then"s, no dangling "and" */
const tidy = (p) => p.replace(/,\s*then\s*(?=,|$)/g, '').replace(/^\s*,?\s*then\s+/i, '').replace(/\s+and\s*(?=,|$)/g, '')
  .replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').replace(/^[\s,]+|[\s,]+$/g, '').trim();

/** The scene's message as changed: what its words become (or its steps, when they were chosen) */
function applyMessage(sc) {
  const st = studio.getState(), old = sc.card.message, castName = (id) => nm(sc.card.cast.find((c) => c.id === id)?.name ?? id);
  const said = (line) => `${castName(line.id)} says “${line.text.trim().replace(/[“”"]/g, '')}”`;
  const steps = st.storyBeats[sc.caption];
  if (steps) {
    // Steps chosen on the card: the lines are their talking steps
    const out = steps.map((x) => ({ ...x }));
    old.said.forEach((o, k) => {
      const now = saying.lines.find((l) => l.from === k), at = out.findIndex((x) => x.type === 'pose' && x.anim === 'talk' && x.speech === o.text);
      if (at < 0) return;
      if (!now || !now.text.trim()) out.splice(at, 1);
      else Object.assign(out[at], { actor: now.id, speech: now.text.trim() });
    });
    for (const l of saying.lines.filter((x) => x.from < 0 && x.text.trim())) out.push({ actor: l.id, type: 'pose', anim: 'talk', speech: l.text.trim() });
    st.storyBeats[sc.caption] = out;
  }
  let p = sc.prompt;
  old.said.forEach((o, k) => {
    const now = saying.lines.find((l) => l.from === k), re = new RegExp(`${SPEAKER}“${reEsc(o.text)}”`);
    p = p.replace(re, now && now.text.trim() ? said(now) : '');
  });
  for (const l of saying.lines.filter((x) => x.from < 0 && x.text.trim())) p = `${p}, then ${said(l)}`;
  // The board's words: changed, cleared, or written on it
  const board = (saying.board ?? '').trim().replace(/[“”"]/g, '');
  if (old.board && board !== old.board) {
    p = board ? p.replace(`“${old.board}”`, `“${board}”`)
      : p.replace(new RegExp(`(?:\\s+and)?\\s+the board says\\s+“${reEsc(old.board)}”|\\s+(?:that|which)\\s+says\\s+“${reEsc(old.board)}”`), '');
  } else if (!old.board && board) p = `${p} and the board says “${board}”`;
  p = tidy(p);
  if (p && p !== sc.prompt) st.storyEdits[sc.caption] = p;
}

function messageEditor(sc, i) {
  const cast = sc.card.cast;
  const rows = saying.lines.map((l, k) => `<li class="sc-step">
      <select class="sc-pick" data-line="${k}" data-field="who" aria-label="Who says line ${k + 1}">${cast.map((c) => `<option value="${esc(c.id)}"${c.id === l.id ? ' selected' : ''}>${esc(nm(c.name))}</option>`).join('')}</select>
      <span>says</span>
      <input class="sr-input sc-line" data-line="${k}" maxlength="160" value="${esc(l.text)}" aria-label="The words of line ${k + 1}">
      <button class="tl-btn" data-unline="${k}" title="Remove this line">×</button>
    </li>`).join('');
  const boardRow = sc.card.message.board || sc.card.where?.place === 'classroom'
    ? `<label class="sc-step"><span class="sc-name">🧑‍🏫 Board says</span><input class="sr-input sc-board" maxlength="60" value="${esc(saying.board ?? '')}" placeholder="Save our reef!" aria-label="What the board says"></label>` : '';
  return `<div class="sc-steps sc-message" data-scene="${i}">
    <ol>${rows || '<li class="sc-none">Nobody says anything.</li>'}</ol>
    ${boardRow}
    <div class="sc-steps-btns">
      ${cast.length ? '<button class="tl-btn" data-newline="1">＋ Add a line</button>' : ''}
      <button class="tl-btn sc-apply" data-sayok="${i}">✓ Use these words</button>
      <button class="tl-btn" data-saycancel="1">Cancel</button>
    </div>
  </div>`;
}
const LIVING = /^(people|animals|wildlife|fantasy|sea)/;
const NUMBERS = ['', 'a', 'two', 'three', 'four', 'five'];
const plural = (w) => (/(s|x|z|ch|sh)$/.test(w) ? `${w}es` : /[^aeiou]y$/.test(w) ? `${w.slice(0, -1)}ies` : `${w}s`);
/** The names a figure can be: your characters and the story's named ones */
const knownNames = () => [...(window.pictogenCharacters?.list() ?? []).map((c) => c.name),
  ...(studio.getStory().cast ?? []).map((c) => (isKey(c.name) ? window.pictogenCharacters?.nameOfKey(c.name) : c.name)).filter(Boolean)];
/** Suggestions while typing: names and kinds of figures, or things (the studio's concepts) */
function datalists() {
  const concepts = studio.getState().concepts ?? [];
  // (the things once, when the pictures are known; the names each time: new characters come)
  if (!document.getElementById('sc-figures')) document.body.insertAdjacentHTML('beforeend', '<datalist id="sc-figures"></datalist><datalist id="sc-objects"></datalist>');
  const opt = (v) => `<option value="${esc(v)}"></option>`;
  const figures = [...new Set([...knownNames(), ...concepts.filter((c) => !c.library && LIVING.test(c.category ?? '')).map((c) => c.label)])];
  const things = [...new Set(concepts.filter((c) => !c.variantOf && !LIVING.test(c.category ?? '')).map((c) => c.label))];
  document.getElementById('sc-figures').innerHTML = figures.map(opt).join('');
  const objects = document.getElementById('sc-objects');
  if (!objects.childElementCount) objects.innerHTML = things.map(opt).join('');
}
/** What the scene draws with one more figure or thing, there from its first moment */
function withAdded(prompt, typed, count) {
  const v = typed.trim().replace(/\s+/g, ' ');
  const name = knownNames().find((n) => n.toLowerCase() === v.toLowerCase());
  const phrase = name ? name
    : /^(a|an|the|some|\d+|two|three|four|five|six|seven|eight|nine|ten)\s/i.test(v) ? v
      : count > 1 ? `${NUMBERS[count]} ${plural(v)}` : `${/^[aeiou]/i.test(v) ? 'an' : 'a'} ${v}`;
  const at = prompt.indexOf(', then ');
  return at < 0 ? `${prompt} and ${phrase}` : `${prompt.slice(0, at)} and ${phrase}${prompt.slice(at)}`;
}
function adder(i) {
  const fig = adding.kind === 'figure';
  return `<div class="sc-adder" data-scene="${i}">
    <span class="sc-name">${fig ? '👤 Add someone' : '📦 Add a thing'}</span>
    <select class="sc-pick sc-count" aria-label="How many">${[1, 2, 3, 4, 5].map((n) => `<option value="${n}">${n === 1 ? 'one' : NUMBERS[n]}</option>`).join('')}</select>
    <input class="sr-input sc-new" list="${fig ? 'sc-figures' : 'sc-objects'}" maxlength="40" placeholder="${fig ? 'Mia, a teacher, a dog, a unicorn…' : 'a laptop, a ball, a tree, a cake…'}" aria-label="${fig ? 'Who to add' : 'What to add'}">
    <button class="tl-btn sc-apply" data-add-ok="${i}">＋ Add</button>
    <button class="tl-btn" data-add-cancel="1">Cancel</button>
  </div>`;
}

function placePickers(sc, i) {
  const c = sc.card, chosen = studio.getState().storyPlaces[sc.caption];
  const ch = window.pictogenPlaces?.choices;
  if (!ch) return esc(c.place);
  const at = chosen?.key ?? chosen?.place ?? c.where.place;
  const mine = window.pictogenPlaces.named();
  const sel = (kind, list, value, label) => `<select class="sc-pick" data-place="${i}" data-kind="${kind}" aria-label="${label} of scene ${i + 1}">${list.map(([k, l]) => `<option value="${esc(k)}"${k === value ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  return `${sel('place', [...ch.places, ...mine.map((p) => [p.key, `⭐ ${p.name}`])], at, 'The place')}
    ${sel('time', ch.times, chosen?.time ?? c.where.time, 'The time')}
    ${sel('weather', ch.weather, chosen?.weather ?? c.where.weather, 'The weather')}
    ${chosen ? `<button class="tl-btn" data-unplace="${i}" title="Back to the place your words say">↺</button>` : ''}`;
}

function stepEditor(sc, i) {
  const cast = sc.card.cast, living = cast.filter((c) => c.living);
  const who = (value, k) => `<select class="sc-pick" data-step="${k}" data-field="actor" aria-label="Who, step ${k + 1}">${(living.length ? living : cast).map((c) => `<option value="${esc(c.id)}"${c.id === value ? ' selected' : ''}>${esc(nm(c.name))}</option>`).join('')}</select>`;
  const rows = draft.steps.map((st, k) => {
    const does = doesOf(st);
    const target = NEEDS_TARGET.has(does)
      ? `<select class="sc-pick" data-step="${k}" data-field="target" aria-label="To whom, step ${k + 1}">${does === 'look' ? `<option value="camera"${st.target === 'camera' ? ' selected' : ''}>us</option>` : ''}${cast.filter((c) => c.id !== st.actor).map((c) => `<option value="${esc(c.id)}"${c.id === st.target ? ' selected' : ''}>${esc(nm(c.name))}</option>`).join('')}</select>` : '';
    return `<li class="sc-step">
      ${k ? `<button class="sc-with${st.with ? ' on' : ''}" data-with="${k}" title="${st.with ? 'At the same time as the step before (press: after it)' : 'After the step before (press: at the same time)'}">${st.with ? '⇉ with' : '→ then'}</button>` : '<span class="sc-with first">first</span>'}
      ${who(st.actor, k)}
      <select class="sc-pick" data-step="${k}" data-field="does" aria-label="What happens, step ${k + 1}">${DOES.map(([v, l]) => `<option value="${v}"${v === does ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>
      ${target}
      <button class="tl-btn" data-up="${k}" title="Earlier"${k ? '' : ' disabled'}>↑</button>
      <button class="tl-btn" data-down="${k}" title="Later"${k < draft.steps.length - 1 ? '' : ' disabled'}>↓</button>
      <button class="tl-btn" data-del="${k}" title="Remove this step">×</button>
    </li>`;
  }).join('');
  return `<div class="sc-steps" data-scene="${i}">
    <ol>${rows || '<li class="sc-none">No steps: everyone just stands there.</li>'}</ol>
    <div class="sc-steps-btns">
      <button class="tl-btn" data-add="1">＋ Add a step</button>
      <button class="tl-btn sc-apply" data-apply="${i}">✓ Use these steps</button>
      <button class="tl-btn" data-cancel="1">Cancel</button>
      ${sc.stepsChosen ? `<button class="tl-btn" data-unsteps="${i}" title="Back to what your words say">↺ As the words say</button>` : ''}
    </div>
  </div>`;
}

// The scene's card: what it is made of (src/scene-card.js), each part changeable where it can be
function card(sc, i, chosenMood) {
  const c = sc.card;
  if (!c) return '';
  const figures = c.figures.map((f) => {
    const word = nm(f.who) || f.kind;
    return `<span class="sc-chip">${esc(nm(f.who) || `the ${f.kind}`)}${f.who ? ` <span class="char-base">${esc(f.kind)}</span>` : f.count > 1 ? ` ×${f.count}` : ''}${f.feels && f.feels !== 'happy' ? ` · ${esc(f.feels)}` : ''}<button class="sc-x" data-drop="${i}" data-word="${esc(word)}" title="Leave ${esc(word)} out of this scene" aria-label="Remove ${esc(word)}">×</button></span>`;
  }).join('');
  const objects = c.objects.map((o) => `<span class="sc-chip">${esc(o.name)}${o.count > 1 ? ` ×${o.count}` : ''}<button class="sc-x" data-drop="${i}" data-word="${esc(o.word)}" title="Leave the ${esc(o.name)} out of this scene" aria-label="Remove ${esc(o.name)}">×</button></span>`).join('');
  const auto = sc.moodChosen ? null : c.feeling.mood;
  const mood = `<select class="sc-mood" data-mood="${i}" aria-label="The mood of scene ${i + 1}">
      <option value=""${chosenMood ? '' : ' selected'}>Auto${auto ? `: ${esc(moodName(auto))}` : ' (none)'}</option>
      ${MOODS.map(([k, label]) => `<option value="${k}"${chosenMood === k ? ' selected' : ''}>${esc(label)}</option>`).join('')}
    </select>`;
  const said = c.message.said.map((s) => `<span class="sc-said">${s.who ? `<b>${esc(nm(s.who))}:</b> ` : ''}“${esc(s.text)}”</span>`).join('');
  const board = c.message.board ? `<span class="sc-said"><b>Board:</b> “${esc(c.message.board)}”</span>` : '';
  const slot = (icon, name, body) => `<div class="sc-slot"><span class="sc-name">${icon} ${name}</span><span class="sc-body">${body || '<span class="sc-none">—</span>'}</span></div>`;
  const plus = (kind) => `<button class="sc-add" data-add-kind="${kind}" data-i="${i}" title="Add ${kind === 'figure' ? 'someone' : 'a thing'} to this scene" aria-label="Add ${kind === 'figure' ? 'a figure' : 'an object'} to scene ${i + 1}">＋</button>`;
  return `<div class="sc-card">
    ${slot('👤', 'Figures', figures + plus('figure'))}
    ${slot('📦', 'Objects', objects + plus('object'))}
    ${slot('🏞️', 'Place', c.where ? placePickers(sc, i) : c.place ? esc(c.place) : '')}
    ${slot('💭', 'Feeling', mood)}
    ${slot('🎬', 'Action', `${c.action.map((a) => esc(nm(a))).join(' → ')}${c.steps && !(draft?.caption === sc.caption) ? ` <button class="tl-btn" data-edit="${i}" title="Change what happens, step by step">✎ Steps</button>` : ''}`)}
    ${slot('💬', 'Message', `${said}${board}${saying?.caption === sc.caption ? '' : ` <button class="tl-btn" data-say="${i}" title="Change who says what, add a line, or what the board says">✎ Words</button>`}`)}
  </div>${adding?.caption === sc.caption ? adder(i) : ''}${saying?.caption === sc.caption ? messageEditor(sc, i) : ''}${draft?.caption === sc.caption ? stepEditor(sc, i) : ''}`;
}

function render() {
  const st = studio.getState(), story = studio.getStory();
  st.storyEdits ??= {};
  st.storyMoods ??= {};
  st.storyPlaces ??= {};
  st.storyBeats ??= {};
  panel.hidden = st.mode !== 'story' || !story.cast || !story.scenes?.length;
  if (panel.hidden) return;
  const mine = new Set((window.pictogenCharacters?.list() ?? []).map((c) => c.name.toLowerCase()));
  const keepable = (c) => c.name && !isKey(c.name) && !mine.has(c.name.toLowerCase()) && window.pictogenCharacters?.BASES?.some(([b]) => b === c.id);
  const cast = story.cast.map((c) => {
    const name = isKey(c.name) ? window.pictogenCharacters?.nameOfKey(c.name) ?? c.name : c.name;
    return `<span class="sr-who"><b>${esc(name ?? `the ${c.noun}`)}</b> <span class="char-base">${esc(kindLabel(c.id))}</span>${keepable(c)
      ? ` <button class="tl-btn" data-keep="${esc(c.name)}" data-base="${esc(c.id)}" title="Keep ${esc(c.name)} as one of your characters, to choose their colours or add a photo face">★ Keep</button>` : ''}</span>`;
  }).join('');
  const rows = story.scenes.map((sc, i) => {
    const edited = Object.hasOwn(st.storyEdits, sc.caption);
    // (words that matter: not "lives", "is", "very"...)
    const skipped = (sc.unknown ?? []).filter((w) => w.length > 2 && !SMALL.has(w) && !/ly$/.test(w));
    return `<li class="sr-row${i === story.curIndex ? ' on' : ''}">
      <button class="sr-go" data-go="${i}" title="Show this scene">${i + 1}</button>
      <div class="sr-body">
        <div class="sr-caption">${esc(sc.caption)}</div>
        <label class="sr-draw"><span>I'll draw</span><input class="sr-input" data-i="${i}" maxlength="300" value="${esc(sc.prompt)}" aria-label="What scene ${i + 1} shows">${edited
          ? `<button class="tl-btn" data-reset="${i}" title="Back to how I read it">↺</button>` : ''}</label>
        ${skipped.length ? `<div class="sr-skip">Not drawn: ${skipped.map(esc).join(', ')}</div>` : ''}
        ${card(sc, i, st.storyMoods[sc.caption])}
      </div>
    </li>`;
  }).join('');
  panel.innerHTML = `
    <div class="tl-head"><span class="tl-title">📖 How I read your story</span>
      <span class="tl-hint">Change what a scene shows and press Enter, add (＋) or leave out (×) someone or something, or pick its place, mood or steps; the clip is made again.</span></div>
    ${cast ? `<div class="sr-cast">${cast}</div>` : ''}
    <ol class="sr-list">${rows}</ol>`;
  if (adding) datalists();
}

/** Adds what was typed in a scene's ＋ to what it draws (kept with its sentence, like an edit) */
function addTo(i) {
  const box = panel.querySelector(`.sc-adder[data-scene="${i}"]`);
  const typed = box?.querySelector('.sc-new').value ?? '';
  if (!typed.trim()) { box?.querySelector('.sc-new').focus(); return; }
  const st = studio.getState(), sc = studio.getStory().scenes[i];
  st.storyEdits[sc.caption] = withAdded(sc.prompt, typed, +box.querySelector('.sc-count').value || 1);
  adding = null;
  redo();
}

function redo() {
  studio.regenerate();
}

panel.addEventListener('click', (e) => {
  const el = e.target.closest('button');
  if (!el) return;
  const st = studio.getState(), story = studio.getStory();
  if (el.dataset.go !== undefined) window.goToStoryScene?.(+el.dataset.go);
  else if (el.dataset.reset !== undefined) {
    delete st.storyEdits[story.scenes[+el.dataset.reset].caption];
    redo();
  } else if (el.dataset.say !== undefined) {
    const sc = story.scenes[+el.dataset.say], c = sc.card;
    // (each line's speaker as one the scene has: by name, else the first figure)
    const idOf = (who) => c.cast.find((x) => x.name === who || nm(x.name) === who)?.id ?? c.cast.find((x) => x.living)?.id ?? c.cast[0]?.id;
    saying = { caption: sc.caption, lines: c.message.said.map((l, k) => ({ id: idOf(l.who), text: l.text, from: k })), board: c.message.board ?? '' };
    render();
  } else if (saying && (el.dataset.newline || el.dataset.unline !== undefined || el.dataset.saycancel)) {
    if (el.dataset.saycancel) saying = null;
    else if (el.dataset.unline !== undefined) saying.lines.splice(+el.dataset.unline, 1);
    else {
      const sc = story.scenes.find((x) => x.caption === saying.caption);
      saying.lines.push({ id: (sc.card.cast.find((c) => c.living) ?? sc.card.cast[0]).id, text: '', from: -1 });
    }
    render();
    if (el.dataset.newline) panel.querySelector('.sc-line:last-of-type, .sc-message li:last-child .sc-line')?.focus();
  } else if (el.dataset.sayok !== undefined) {
    applyMessage(story.scenes[+el.dataset.sayok]);
    saying = null;
    redo();
  } else if (el.dataset.addKind) {
    adding = { caption: story.scenes[+el.dataset.i].caption, kind: el.dataset.addKind };
    render();
    datalists();
    panel.querySelector('.sc-new')?.focus();
  } else if (el.dataset.addCancel) {
    adding = null;
    render();
  } else if (el.dataset.addOk !== undefined) {
    addTo(+el.dataset.addOk);
  } else if (el.dataset.unplace !== undefined) {
    delete st.storyPlaces[story.scenes[+el.dataset.unplace].caption];
    redo();
  } else if (el.dataset.edit !== undefined) {
    const sc = story.scenes[+el.dataset.edit];
    draft = { caption: sc.caption, steps: sc.card.steps.map((x) => ({ ...x })) };
    render();
  } else if (draft && (el.dataset.add || el.dataset.cancel || el.dataset.up !== undefined || el.dataset.down !== undefined || el.dataset.del !== undefined || el.dataset.with !== undefined)) {
    const s = draft.steps;
    if (el.dataset.add) {
      const sc = story.scenes.find((x) => x.caption === draft.caption);
      const first = sc.card.cast.find((c) => c.living) ?? sc.card.cast[0];
      if (first) s.push({ actor: first.id, type: 'pose', anim: 'wave' });
    } else if (el.dataset.cancel) draft = null;
    else if (el.dataset.del !== undefined) s.splice(+el.dataset.del, 1);
    else if (el.dataset.with !== undefined) s[+el.dataset.with].with = !s[+el.dataset.with].with;
    else {
      const k = +(el.dataset.up ?? el.dataset.down), j = el.dataset.up !== undefined ? k - 1 : k + 1;
      if (j >= 0 && j < s.length) [s[k], s[j]] = [s[j], s[k]];
    }
    if (s[0]) delete s[0].with;
    render();
  } else if (el.dataset.apply !== undefined) {
    st.storyBeats[draft.caption] = draft.steps.map((x) => ({ ...x }));
    draft = null;
    redo();
  } else if (el.dataset.unsteps !== undefined) {
    delete st.storyBeats[story.scenes[+el.dataset.unsteps].caption];
    draft = null;
    redo();
  } else if (el.dataset.drop !== undefined) {
    // Leaving a thing out: what to draw without its word ("with his laptop and a coffee" -> "with his laptop")
    const sc = story.scenes[+el.dataset.drop];
    const word = el.dataset.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const without = sc.prompt
      .replace(new RegExp(`(?:\\s*(?:,|\\band\\b|\\bwith\\b))?\\s*\\b(?:a|an|the|his|her|their|its|my|your|our|some|\\d+|two|three|four|five)?\\s*${word}(?:e?s)?\\b`, 'i'), '')
      .replace(/\s{2,}/g, ' ').replace(/^\s*(?:and|with)\s+/i, '')
      // (a word for where left with nothing after it: "sits at with his laptop" -> "sits with his laptop")
      .replace(/\b(?:at|on|in|to|by|under|near|beside)\s+(?=(?:with|and)\b|,|$)/gi, '').replace(/\s{2,}/g, ' ').trim();
    if (!without || without === sc.prompt) { studio.showToast(`I couldn't find "${el.dataset.word}" in what this scene shows: change it above`); return; }
    st.storyEdits[sc.caption] = without;
    redo();
  } else if (el.dataset.keep) {
    const why = window.pictogenCharacters?.keep(el.dataset.keep, el.dataset.base);
    if (why) studio.showToast(why);
    else {
      studio.showToast(`${el.dataset.keep} is one of your characters now: ✎ changes their look`);
      redo();
    }
  }
});
panel.addEventListener('change', (e) => {
  const st = studio.getState(), story = studio.getStory();
  // A place, a time, a weather chosen for a scene: all three kept (the place may be one of yours)
  if (e.target.dataset.place !== undefined) {
    const sc = story.scenes[+e.target.dataset.place];
    const now = st.storyPlaces[sc.caption] ?? { place: sc.card.where.place, time: sc.card.where.time, weather: sc.card.where.weather };
    const next = { ...now };
    if (e.target.dataset.kind === 'place') {
      delete next.key; delete next.place;
      if (/^pgp\d+$/.test(e.target.value)) next.key = e.target.value; else next.place = e.target.value;
    } else next[e.target.dataset.kind] = e.target.value;
    st.storyPlaces[sc.caption] = next;
    redo();
    return;
  }
  // A line's speaker changed in the message editor
  if (saying && e.target.dataset.line !== undefined && e.target.dataset.field === 'who') {
    saying.lines[+e.target.dataset.line].id = e.target.value;
    return;
  }
  // A step changed in the editor: who, what, to whom
  if (draft && e.target.dataset.step !== undefined) {
    const k = +e.target.dataset.step, old = draft.steps[k];
    const sc = story.scenes.find((x) => x.caption === draft.caption);
    const actor = e.target.dataset.field === 'actor' ? e.target.value : old.actor;
    const does = e.target.dataset.field === 'does' ? e.target.value : doesOf(old);
    const others = sc.card.cast.filter((c) => c.id !== actor);
    let target = e.target.dataset.field === 'target' ? e.target.value : old.target;
    if (NEEDS_TARGET.has(does) && (!target || target === actor || (target === 'camera' && does !== 'look'))) target = does === 'look' ? 'camera' : others[0]?.id;
    draft.steps[k] = stepOf(old, does, actor, target);
    render();
    return;
  }
  if (!e.target.matches('.sc-mood')) return;
  const sc = story.scenes[+e.target.dataset.mood];
  if (e.target.value) st.storyMoods[sc.caption] = e.target.value;
  else delete st.storyMoods[sc.caption];
  redo();
});
panel.addEventListener('input', (e) => {
  if (!saying) return;
  if (e.target.matches('.sc-line')) saying.lines[+e.target.dataset.line].text = e.target.value;
  if (e.target.matches('.sc-board')) saying.board = e.target.value;
});
panel.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('.sc-new')) { e.preventDefault(); addTo(+e.target.closest('.sc-adder').dataset.scene); return; }
  if (e.key === 'Escape' && e.target.matches('.sc-new')) { adding = null; render(); return; }
  if (e.key === 'Enter' && saying && e.target.matches('.sc-line, .sc-board')) {
    e.preventDefault();
    applyMessage(studio.getStory().scenes.find((x) => x.caption === saying.caption));
    saying = null;
    redo();
    return;
  }
  if (e.key !== 'Enter' || !e.target.matches('.sr-input[data-i]')) return;
  e.preventDefault();
  const st = studio.getState(), sc = studio.getStory().scenes[+e.target.dataset.i];
  const value = e.target.value.trim();
  if (!value || value === sc.prompt) return;
  st.storyEdits[sc.caption] = value;
  redo();
});

/** The scene playing, marked in the list (without drawing the list again: someone may be typing) */
function highlight(i) {
  panel.querySelectorAll('.sr-row').forEach((row, k) => row.classList.toggle('on', k === i));
}

window.pictogenStoryReview = { refresh: render, highlight };
render();
