// "Your cards": an explainer made from an outline (src/slides.js), card by card, to change without
// writing the outline again: each card's kind, headline, points, picture or quote; cards moved up
// or down, removed or added. "Make the clip again" writes the outline back into the story box
// (/api/outline/write) and makes the clip from it.

const studio = window.pictogenStudio;
const panel = document.getElementById('cards-review');
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const KINDS = [
  ['title', '🏷️ Title'], ['bullets', '📝 Points'], ['number', '🔢 Big number'], ['compare', '⚖️ Compare'], ['steps', '👣 Steps'],
  ['quiz', '❓ Quiz'], ['quote', '💬 Quote'], ['recap', '✅ Recap'], ['statement', '📣 Statement'], ['scene', '🎬 Acted scene'],
];
const HINTS = {
  bullets: 'one point per line', recap: 'one point per line (ticked off)', steps: 'one step per line', number: 'what the number means, one line each',
  compare: 'one line per row: left | right', quiz: 'one answer per line; mark the right one with [x]',
};
let cards = [];
let dirty = false;

/** The clip's cards, as the engine read them (an acted scene: its prompt and caption) */
function fromStory(story) {
  return (story.scenes ?? []).map((sc) => (sc.slide
    ? JSON.parse(JSON.stringify(sc.slide))
    : { kind: 'scene', prompt: sc.prompt, ...(sc.caption ? { caption: sc.caption } : {}) }));
}

const linesOf = (c) => (c.kind === 'compare'
  ? (c.pairs ?? []).map(([a, b]) => `${a ?? ''} | ${b ?? ''}`)
  : (c.points ?? []).map((p) => (c.kind === 'quiz' ? `${p.right ? '[x] ' : ''}${p.text}` : p.text))).join('\n');

function row(c, i) {
  const kind = `<select class="cr-kind" data-i="${i}" aria-label="What card ${i + 1} is">${KINDS.map(([k, l]) => `<option value="${k}"${k === c.kind ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  const head = (label, value, field = 'headline') => `<label class="cr-field"><span>${label}</span><input class="cr-in" dir="auto" data-i="${i}" data-f="${field}" maxlength="140" value="${esc(value)}"></label>`;
  const area = (label, value, field, hint = '') => `<label class="cr-field"><span>${label}</span><textarea class="cr-in" dir="auto" data-i="${i}" data-f="${field}" rows="${Math.min(6, Math.max(2, String(value).split('\n').length))}" placeholder="${esc(hint)}">${esc(value)}</textarea></label>`;
  let fields = '';
  if (c.kind === 'title') fields = head('Title', c.headline) + head('Subtitle', c.subtitle ?? '', 'subtitle');
  else if (c.kind === 'scene') fields = head('Draw', c.prompt ?? '', 'prompt') + head('Caption', c.caption ?? '', 'caption');
  else if (c.kind === 'quote') fields = area('Quote', c.quote ?? '', 'quote') + head('Who said it', c.by ?? '', 'by');
  else if (c.kind === 'statement') fields = head('Headline', c.headline ?? '') + area('Says', c.note ?? '', 'note');
  else {
    const label = c.kind === 'compare' ? 'Left vs right' : c.kind === 'number' ? 'Number and label' : c.kind === 'quiz' ? 'Question' : 'Headline';
    const headValue = c.kind === 'compare' ? `${c.left ?? ''} vs ${c.right ?? ''}` : c.headline;
    fields = head(label, headValue) + area(c.kind === 'quiz' ? 'Answers' : c.kind === 'steps' ? 'Steps' : 'Points', linesOf(c), 'lines', HINTS[c.kind] ?? '')
      + head('Picture', c.show ?? '', 'show');
  }
  return `<li class="sr-row cr-row" data-row="${i}">
    <button class="sr-go" data-go="${i}" title="Show this card">${i + 1}</button>
    <div class="sr-body">
      <div class="cr-top">${kind}
        <span class="cr-moves"><button class="tl-btn" data-up="${i}" title="Move up"${i ? '' : ' disabled'}>↑</button><button class="tl-btn" data-down="${i}" title="Move down"${i < cards.length - 1 ? '' : ' disabled'}>↓</button><button class="tl-btn" data-del="${i}" title="Remove this card">×</button></span></div>
      ${fields}
    </div>
  </li>`;
}

function render() {
  const st = studio.getState(), story = studio.getStory();
  panel.hidden = st.mode !== 'story' || !story.slides || !story.scenes?.length;
  if (panel.hidden) return;
  if (!dirty) cards = fromStory(story);
  panel.innerHTML = `
    <div class="tl-head"><span class="tl-title">📋 Your cards</span>
      <span class="tl-hint">Change a card's words, its kind or its picture (words, e.g. "coins and a chart"), move it, or add one; then make the clip again. The outline in the story box changes with it.</span></div>
    <ol class="sr-list">${cards.map(row).join('')}</ol>
    <div class="cr-foot">
      <select class="cr-new" aria-label="Kind of card to add">${KINDS.filter(([k]) => k !== 'title').map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
      <button class="tl-btn" data-add title="Add a card at the end">＋ Add a card</button>
      <button class="btn-action cr-apply" data-apply${dirty ? '' : ' disabled'} title="Write the cards into the story box and make the clip again">✓ Make the clip again</button>
    </div>`;
}

/** A card's fields as typed, into the card */
function read(i) {
  const c = cards[i];
  for (const el of panel.querySelectorAll(`.cr-in[data-i="${i}"]`)) {
    const v = el.value;
    if (el.dataset.f !== 'lines') { c[el.dataset.f] = v.trim(); continue; }
    const lines = v.split('\n').map((l) => l.trim()).filter(Boolean);
    if (c.kind === 'compare') c.pairs = lines.map((l) => l.split('|').map((s) => s.trim()));
    else if (c.kind === 'quiz') c.points = lines.map((l) => ({ text: l.replace(/^\[[xX✓ ]?\]\s*/, ''), ...(/^\[[xX✓]\]/.test(l) ? { right: true } : {}) }));
    else c.points = lines.map((text) => ({ text }));
  }
  if (c.kind === 'compare') {
    const [left, right] = String(c.headline ?? '').split(/\s+(?:vs\.?|versus)\s+/i);
    c.left = (left ?? '').trim() || c.left;
    c.right = (right ?? '').trim() || c.right;
  }
}
const readAll = () => cards.forEach((_, i) => read(i));
const changed = () => { dirty = true; const b = panel.querySelector('[data-apply]'); if (b) b.disabled = false; };

/** A new card of a kind, with words to change */
function blank(kind) {
  if (kind === 'scene') return { kind, prompt: 'a teacher points at the board' };
  if (kind === 'quote') return { kind, quote: 'Words worth remembering.', by: '' };
  if (kind === 'statement') return { kind, headline: 'Remember', note: 'One thing to remember.' };
  if (kind === 'compare') return { kind, left: 'Before', right: 'After', pairs: [['One way', 'The other way']] };
  if (kind === 'quiz') return { kind, headline: 'Which one is right?', points: [{ text: 'This one', right: true }, { text: 'That one' }] };
  if (kind === 'number') return { kind, headline: '3 times', points: [{ text: 'what the number means' }] };
  return { kind, headline: kind === 'recap' ? 'Recap' : 'A new card', points: [{ text: 'A first point' }] };
}

/** Changes a card's kind, keeping what it says */
function rekind(i, kind) {
  const c = cards[i];
  const words = c.kind === 'compare' ? (c.pairs ?? []).map((p) => p.filter(Boolean).join(' / ')) : (c.points ?? []).map((p) => p.text);
  const next = { ...blank(kind), ...(c.headline && !['scene', 'quote'].includes(kind) ? { headline: c.headline } : {}), ...(c.show ? { show: c.show } : {}) };
  if (words.length && ['bullets', 'recap', 'steps', 'number', 'quiz'].includes(kind)) next.points = words.map((text, k) => ({ text, ...(kind === 'quiz' && k === 0 ? { right: true } : {}) }));
  if (kind === 'quiz' && next.points.length < 2) next.points.push({ text: 'Another answer' });
  if (kind === 'compare' && words.length) next.pairs = words.map((w) => [w, '']);
  if (kind === 'statement') next.note = words.join(' ') || c.note || c.quote || next.note;
  if (kind === 'quote') next.quote = c.quote || words.join(' ') || c.headline || next.quote;
  if (kind === 'scene') next.prompt = c.prompt || c.headline || next.prompt;
  cards[i] = next;
}

async function apply() {
  readAll();
  const res = await fetch('/api/outline/write', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cards }) });
  const { text } = await res.json();
  const box = document.getElementById('story-text');
  if (box) box.value = text;
  studio.getState().prompt = text;
  dirty = false;
  studio.regenerate();
}

panel.addEventListener('input', (e) => { if (e.target.classList.contains('cr-in')) changed(); });
panel.addEventListener('change', (e) => {
  const el = e.target;
  if (el.classList.contains('cr-kind')) { readAll(); rekind(+el.dataset.i, el.value); changed(); render(); }
});
panel.addEventListener('click', (e) => {
  const el = e.target.closest('button');
  if (!el || el.disabled) return;
  if (el.dataset.go !== undefined) { window.goToStoryScene?.(+el.dataset.go); return; }
  if (el.dataset.apply !== undefined) { apply(); return; }
  readAll();
  if (el.dataset.up !== undefined) { const i = +el.dataset.up; [cards[i - 1], cards[i]] = [cards[i], cards[i - 1]]; } else if (el.dataset.down !== undefined) { const i = +el.dataset.down; [cards[i + 1], cards[i]] = [cards[i], cards[i + 1]]; } else if (el.dataset.del !== undefined) cards.splice(+el.dataset.del, 1);
  else if (el.dataset.add !== undefined) cards.push(blank(panel.querySelector('.cr-new').value));
  else return;
  changed();
  render();
});

/** Marks the card on screen */
function highlight(i) {
  panel.querySelectorAll('.cr-row').forEach((r) => r.classList.toggle('on', +r.dataset.row === i));
}

// (a new clip: the cards as it has them)
window.pictogenCards = { refresh: () => { dirty = false; render(); }, highlight, cards: () => cards };
render();
