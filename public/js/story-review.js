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

// The scene's card: what it is made of (src/scene-card.js), each part changeable where it can be
function card(sc, i, chosenMood) {
  const c = sc.card;
  if (!c) return '';
  const figures = c.figures.map((f) => `<span class="sc-chip">${esc(nm(f.who) || `the ${f.kind}`)}${f.who ? ` <span class="char-base">${esc(f.kind)}</span>` : f.count > 1 ? ` ×${f.count}` : ''}${f.feels && f.feels !== 'happy' ? ` · ${esc(f.feels)}` : ''}</span>`).join('');
  const objects = c.objects.map((o) => `<span class="sc-chip">${esc(o.name)}${o.count > 1 ? ` ×${o.count}` : ''}<button class="sc-x" data-drop="${i}" data-word="${esc(o.word)}" title="Leave the ${esc(o.name)} out of this scene" aria-label="Remove ${esc(o.name)}">×</button></span>`).join('');
  const auto = sc.moodChosen ? null : c.feeling.mood;
  const mood = `<select class="sc-mood" data-mood="${i}" aria-label="The mood of scene ${i + 1}">
      <option value=""${chosenMood ? '' : ' selected'}>Auto${auto ? `: ${esc(moodName(auto))}` : ' (none)'}</option>
      ${MOODS.map(([k, label]) => `<option value="${k}"${chosenMood === k ? ' selected' : ''}>${esc(label)}</option>`).join('')}
    </select>`;
  const said = c.message.said.map((s) => `<span class="sc-said">${s.who ? `<b>${esc(nm(s.who))}:</b> ` : ''}“${esc(s.text)}”</span>`).join('');
  const board = c.message.board ? `<span class="sc-said"><b>Board:</b> “${esc(c.message.board)}”</span>` : '';
  const slot = (icon, name, body) => `<div class="sc-slot"><span class="sc-name">${icon} ${name}</span><span class="sc-body">${body || '<span class="sc-none">—</span>'}</span></div>`;
  return `<div class="sc-card">
    ${slot('👤', 'Figures', figures)}
    ${slot('📦', 'Objects', objects)}
    ${slot('🏞️', 'Place', c.place ? esc(c.place) : '')}
    ${slot('💭', 'Feeling', mood)}
    ${slot('🎬', 'Action', c.action.map((a) => esc(nm(a))).join(' → '))}
    ${slot('💬', 'Message', said + board)}
  </div>`;
}

function render() {
  const st = studio.getState(), story = studio.getStory();
  st.storyEdits ??= {};
  st.storyMoods ??= {};
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
      <span class="tl-hint">Change what a scene shows and press Enter, leave a thing out (×), or pick its mood; the clip is made again.</span></div>
    ${cast ? `<div class="sr-cast">${cast}</div>` : ''}
    <ol class="sr-list">${rows}</ol>`;
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
  if (!e.target.matches('.sc-mood')) return;
  const st = studio.getState(), sc = studio.getStory().scenes[+e.target.dataset.mood];
  if (e.target.value) st.storyMoods[sc.caption] = e.target.value;
  else delete st.storyMoods[sc.caption];
  redo();
});
panel.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || !e.target.matches('.sr-input')) return;
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
