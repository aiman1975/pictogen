// "Your clip": scenes saved one by one from the studio (prompt, edited steps, a caption), ordered
// and played as a multi-scene clip in Clip Studio. Kept in this browser's localStorage.

const studio = window.pictogenStudio;
const tray = document.getElementById('clip-tray');
const KEY = 'pictogen.clip.v1';

let scenes = load();

function load() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((sc) => sc && typeof sc.prompt === 'string') : [];
  } catch {
    return [];
  }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(scenes)); } catch { /* private window: the clip lasts this visit */ }
}

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function render() {
  const st = studio.getState();
  tray.hidden = st.mode !== 'scene';
  if (tray.hidden) return;
  const rows = scenes.map((sc, i) => `
    <li class="clip-row">
      <span class="clip-num">${i + 1}</span>
      <span class="clip-prompt" title="${esc(sc.prompt)}">${esc(sc.prompt)}${sc.beats ? ' <span class="clip-badge" title="Steps edited in the timeline">✎ edited</span>' : ''}</span>
      <input class="clip-caption" data-i="${i}" maxlength="300" placeholder="Caption (shown under the scene)" value="${esc(sc.caption || '')}" aria-label="Caption for scene ${i + 1}">
      <span class="clip-actions">
        <button class="tl-btn" data-up="${i}" title="Move earlier" aria-label="Move scene ${i + 1} earlier" ${i ? '' : 'disabled'}>↑</button>
        <button class="tl-btn" data-down="${i}" title="Move later" aria-label="Move scene ${i + 1} later" ${i < scenes.length - 1 ? '' : 'disabled'}>↓</button>
        <button class="tl-btn danger" data-remove="${i}" title="Remove from the clip" aria-label="Remove scene ${i + 1}">✕</button>
      </span>
    </li>`).join('');
  tray.innerHTML = `
    <div class="tl-head">
      <span class="tl-title">🎞 Your clip${scenes.length ? ` · ${scenes.length} scene${scenes.length > 1 ? 's' : ''}` : ''}</span>
      ${scenes.length ? '<button class="tl-btn danger" data-do="clear" title="Remove every scene">Clear</button><button class="tl-btn" data-do="play" title="Play these scenes in Clip Studio">▶ Play clip</button>' : ''}
      <button class="tl-btn primary" data-do="add" title="Save this scene, with your timeline edits, as the next scene of the clip">＋ Add this scene</button>
    </div>
    ${scenes.length ? `<ol class="clip-list">${rows}</ol>` : '<div class="tl-empty">Make a scene, then add it here. Add more, give them captions, and play them as one clip.</div>'}`;
}

function add() {
  const st = studio.getState();
  if (!st.prompt) return;
  const edited = st.beats && st.beatsFor === st.prompt ? JSON.parse(JSON.stringify(st.beats)) : null;
  scenes.push({ prompt: st.prompt, caption: '', ...(edited ? { beats: edited } : {}) });
  save();
  render();
  studio.showToast(`Added scene ${scenes.length} to your clip`);
}

/** Plays the saved scenes in Clip Studio (story mode) */
function play() {
  if (!scenes.length) return;
  studio.getState().clipActive = true;
  document.querySelector('#modes-group .pill-btn[data-mode="story"]')?.click();
}

tray.addEventListener('click', (e) => {
  const el = e.target.closest('button');
  if (!el) return;
  const i = +(el.dataset.up ?? el.dataset.down ?? el.dataset.remove);
  if (el.dataset.do === 'add') return add();
  if (el.dataset.do === 'play') return play();
  if (el.dataset.do === 'clear') {
    if (!confirm(`Remove all ${scenes.length} scenes from your clip?`)) return;
    scenes = [];
  } else if (el.dataset.up !== undefined && i > 0) [scenes[i - 1], scenes[i]] = [scenes[i], scenes[i - 1]];
  else if (el.dataset.down !== undefined && i < scenes.length - 1) [scenes[i + 1], scenes[i]] = [scenes[i], scenes[i + 1]];
  else if (el.dataset.remove !== undefined) scenes.splice(i, 1);
  else return;
  save();
  render();
});
tray.addEventListener('input', (e) => {
  if (!e.target.matches('.clip-caption')) return;
  scenes[+e.target.dataset.i].caption = e.target.value;
  save();
});

window.pictogenClip = { refresh: render, getScenes: () => scenes };
render();
