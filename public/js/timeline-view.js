// Timeline view for the studio: the scene's steps as one lane per figure (and one for the camera),
// a playhead you can drag to scrub, and an editor for each step. Edits go back to the server as
// `beats`; generate() checks them (src/timeline.js editTimeline) and plays them out.

const studio = window.pictogenStudio;
const panel = document.getElementById('timeline-panel');

const POSES = [
  ['wave', 'waves'], ['jump', 'jumps'], ['dance', 'dances'], ['cheer', 'cheers'], ['point', 'points'],
  ['thumbsup', 'thumbs up'], ['hold', 'holds out'], ['think', 'thinks'], ['talk', 'talks'], ['sit', 'sits'],
  ['sleep', 'sleeps'], ['fly', 'flies'], ['swim', 'swims'], ['spin', 'spins'], ['sway', 'sways'],
  ['float', 'floats'], ['rock', 'rocks'], ['flap', 'flaps'], ['wag', 'wags'],
];
const POSE_LABEL = Object.fromEntries(POSES);
const FEELINGS = [
  ['happy', '😊 happy'], ['laugh', '😃 laughing'], ['surprised', '😮 surprised'], ['sad', '😢 sad'], ['wink', '😉 winking'],
  ['angry', '😠 angry'], ['confused', '🤔 confused'], ['skeptical', '🤨 skeptical'], ['talking', '🗣 talking'], ['neutral', '😐 calm'],
];
const FEELING_LABEL = Object.fromEntries(FEELINGS);
const DOES = [
  ['enter:walk', 'walks in'], ['enter:run', 'runs in'],
  ['moveTo:walk', 'walks to…'], ['moveTo:run', 'runs to…'],
  ['approach:walk', 'walks toward us'], ['approach:run', 'runs toward us'],
  ['recede:walk', 'walks away'], ['recede:run', 'runs away'],
  ['exit:walk', 'walks off'], ['exit:run', 'runs off'],
  ...POSES.map(([anim, label]) => [`pose:${anim}`, label]),
  ['expr', 'shows a feeling'], ['appear', 'appears'],
];
const CAMERA = [['zoomIn', 'zoom in on…'], ['zoomOut', 'zoom out'], ['pan:-1', 'pan left'], ['pan:1', 'pan right'], ['panTo', 'pan to…']];
const ICON = {
  play: '<svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true"><path d="M1 1l8 5-8 5z" fill="currentColor"/></svg>',
  pause: '<svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true"><path d="M1 1h3v10H1zM6 1h3v10H6z" fill="currentColor"/></svg>',
};
const KIND = { enter: 'move', moveTo: 'move', approach: 'move', recede: 'move', appear: 'move', exit: 'leave', pose: 'gesture', expr: 'feeling' };

let result = null; // the generate() result on screen
let beats = []; // editable copy of its steps
let selected = null; // { beat, actor } | { beat, camera: true } | { beat } (the whole step)
let playing = true;
let clock = null; // the animation that spans the whole clip
let raf = 0;

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nameOf = (id) => result?.cast.find((c) => c.id === id)?.label.replace(/_/g, ' ') ?? id;
const pct = (v) => `${Math.max(0, Math.min(100, v)).toFixed(3)}%`;

/** What one action looks like on its block: "runs to dog 😃" */
function describe(a) {
  const icon = a.expression ? ` ${FEELING_LABEL[a.expression]?.split(' ')[0] ?? ''}` : '';
  if (a.type === 'expr') return `${FEELING_LABEL[a.expression]?.split(' ').slice(1).join(' ') ?? 'a feeling'}${icon}`;
  const gait = a.gait === 'run' ? 'runs' : 'walks';
  const text = {
    enter: `${gait} in`,
    moveTo: `${gait} to ${nameOf(a.target)}`,
    approach: `${gait} toward us`,
    recede: `${gait} away`,
    exit: `${gait} off`,
    pose: POSE_LABEL[a.anim] ?? a.anim,
    appear: 'appears',
  }[a.type] ?? a.type;
  return text + icon;
}
function describeCamera(c) {
  if (c.type === 'zoomIn') return c.target ? `zoom in on ${nameOf(c.target)}` : 'zoom in';
  if (c.type === 'zoomOut') return 'zoom out';
  if (c.type === 'panTo') return `pan to ${nameOf(c.target)}`;
  return c.dir < 0 ? 'pan left' : 'pan right';
}
const doesValue = (a) => (a.type === 'pose' ? `pose:${a.anim}` : a.type === 'expr' || a.type === 'appear' ? a.type : `${a.type}:${a.gait === 'run' ? 'run' : 'walk'}`);
const cameraValue = (c) => (c.type === 'pan' ? `pan:${c.dir < 0 ? -1 : 1}` : c.type);

/** Called by the studio after every render: the scene result, or null to hide the view. */
function update(data) {
  result = data;
  if (!data || !data.cast?.length) {
    panel.hidden = true;
    cancelAnimationFrame(raf);
    return;
  }
  panel.hidden = false;
  beats = (data.beats || []).map((b) => ({ actions: b.actions.map((a) => ({ ...a })), ...(b.camera ? { camera: { ...b.camera } } : {}) }));
  if (selected && !beats[selected.beat]) selected = null;
  if (selected?.actor && !beats[selected.beat].actions.some((a) => a.actor === selected.actor)) selected = { beat: selected.beat };
  if (selected?.camera && !beats[selected.beat].camera) selected = { beat: selected.beat };
  playing = true;
  render();
  findClock();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(tick);
}

/** Sends the edited steps back to the server and redraws the scene. */
function apply() {
  const st = studio.getState();
  st.beats = beats.map((b) => ({ actions: b.actions, ...(b.camera ? { camera: b.camera } : {}) }));
  st.beatsFor = st.prompt;
  studio.regenerate();
}

function revert() {
  const st = studio.getState();
  st.beats = null;
  st.beatsFor = null;
  selected = null;
  studio.regenerate();
}

// ---------------------------------------------------------------------------------------------
// Drawing the panel

function lanesOf() {
  const actors = [];
  for (const b of beats) for (const a of b.actions) if (!actors.includes(a.actor)) actors.push(a.actor);
  return { actors, camera: beats.some((b) => b.camera) };
}

function spans() {
  const T = result.duration || 0;
  if (beats.every((b, i) => Number.isFinite(result.beats?.[i]?.t0)) && T) {
    return { T, at: beats.map((_, i) => ({ t0: result.beats[i].t0, t1: result.beats[i].t1 })) };
  }
  const n = Math.max(1, beats.length);
  return { T: n, at: beats.map((_, i) => ({ t0: i, t1: i + 1 })) };
}

function render() {
  const st = studio.getState();
  const edited = Boolean(result.edited && st.beats);
  const { T, at } = spans();
  const { actors, camera } = lanesOf();
  const end = at.length ? at[at.length - 1].t1 : 0;
  const pos = (t0, t1) => `left:${pct((t0 / T) * 100)};width:${pct(((t1 - t0) / T) * 100)}`;
  const hold = end < T ? `<div class="tl-hold" style="${pos(end, T)}" title="Holds the last moment before the clip loops"></div>` : '';

  let ticks = '';
  const every = T > 24 ? 5 : T > 12 ? 2 : 1;
  for (let s = 0; s <= T + 1e-6 && beats.length; s += every) {
    ticks += `<span style="position:absolute;left:${pct((s / T) * 100)};top:2px;transform:translateX(${s ? '-50%' : '0'});font-size:0.68rem;color:var(--text-muted)">${s}s</span>`;
  }

  const steps = at.map(({ t0, t1 }, i) => {
    const on = selected && selected.beat === i && !selected.actor && !selected.camera;
    return `<button class="tl-block leave${on ? ' selected' : ''}" style="${pos(t0, t1)}" data-step="${i}" title="Step ${i + 1}: ${t0.toFixed(1)}s to ${t1.toFixed(1)}s">Step ${i + 1}</button>`;
  }).join('');

  const lane = (id) => at.map(({ t0, t1 }, i) => {
    const a = beats[i].actions.find((x) => x.actor === id);
    if (!a) return '';
    const on = selected && selected.beat === i && selected.actor === id;
    return `<button class="tl-block ${KIND[a.type] ?? 'move'}${on ? ' selected' : ''}" style="${pos(t0, t1)}" data-beat="${i}" data-actor="${esc(id)}" title="${esc(nameOf(id))} ${esc(describe(a))}">${esc(describe(a))}</button>`;
  }).join('');
  const cameraLane = at.map(({ t0, t1 }, i) => {
    const c = beats[i].camera;
    if (!c) return '';
    const on = selected && selected.beat === i && selected.camera;
    return `<button class="tl-block camera${on ? ' selected' : ''}" style="${pos(t0, t1)}" data-beat="${i}" data-camera="1" title="${esc(describeCamera(c))}">🎥 ${esc(describeCamera(c))}</button>`;
  }).join('');

  panel.innerHTML = `
    <div class="tl-head">
      <span class="tl-title">🎬 Timeline</span>
      ${edited ? '<span class="tl-edited">edited</span><button class="tl-btn" data-do="revert" title="Drop your edits and use the steps the prompt describes">↺ Use the prompt</button>' : ''}
      ${beats.length ? `<button class="tl-btn" data-do="play" aria-label="${playing ? 'Pause' : 'Play'}" title="Play / pause (drag on the time ruler to scrub)">${playing ? ICON.pause : ICON.play}</button><span class="tl-time" id="tl-time">0.0s / ${T.toFixed(1)}s</span>` : ''}
      <button class="tl-btn primary" data-do="add-step" title="Add a step after the selected one (or at the end)">＋ Step</button>
    </div>
    ${beats.length ? `
    <div class="tl-body">
      <div class="tl-grid">
        <span class="tl-label"></span><div class="tl-lane tl-ruler" id="tl-ruler" title="Drag to scrub">${ticks}</div>
        <span class="tl-label">Steps</span><div class="tl-lane">${steps}${hold}</div>
        ${actors.map((id) => `<span class="tl-label" title="${esc(nameOf(id))}">${esc(nameOf(id))}</span><div class="tl-lane" data-lane="${esc(id)}">${lane(id)}${hold}</div>`).join('')}
        ${camera ? `<span class="tl-label">Camera</span><div class="tl-lane">${cameraLane}${hold}</div>` : ''}
      </div>
      <div class="tl-overlay"><div class="tl-playhead" id="tl-playhead" style="left:0%"></div></div>
    </div>` : '<div class="tl-empty">Nothing moves yet. Add a step to make the figures act, one step after another.</div>'}
    ${editor()}`;
}

function options(list, value, disabled = () => false) {
  return list.map(([v, label]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}${disabled(v) ? ' disabled' : ''}>${esc(label)}</option>`).join('');
}

function editor() {
  if (!selected || !beats[selected.beat]) return '';
  const i = selected.beat, beat = beats[i];
  const cast = result.cast.map((c) => [c.id, c.label.replace(/_/g, ' ')]);
  const title = `<span class="tl-editor-title">Step ${i + 1}</span>`;
  if (selected.camera && beat.camera) {
    const c = beat.camera;
    const needsTarget = c.type === 'zoomIn' || c.type === 'panTo';
    return `<div class="tl-editor" id="tl-editor">${title}
      <label>🎥 Camera <select data-field="camera">${options(CAMERA, cameraValue(c))}</select></label>
      ${needsTarget ? `<label>On <select data-field="camera-target">${c.type === 'zoomIn' ? '<option value="">the whole scene</option>' : ''}${options(cast, c.target)}</select></label>` : ''}
      <span class="tl-spacer"><button class="tl-btn danger" data-do="delete">✕ Delete</button><button class="tl-btn" data-do="close">Done</button></span>
    </div>`;
  }
  const a = selected.actor && beat.actions.find((x) => x.actor === selected.actor);
  if (a) {
    const busy = (id) => id !== a.actor && beat.actions.some((x) => x.actor === id);
    return `<div class="tl-editor" id="tl-editor">${title}
      <label>Who <select data-field="actor">${options(cast, a.actor, busy)}</select></label>
      <label>Does <select data-field="does">${options(DOES, doesValue(a))}</select></label>
      ${a.type === 'moveTo' ? `<label>To <select data-field="target">${options(cast, a.target, (id) => id === a.actor)}</select></label>` : ''}
      <label>Feeling <select data-field="expression"><option value="">${a.type === 'expr' ? '' : 'as before'}</option>${options(FEELINGS, a.expression)}</select></label>
      <span class="tl-spacer"><button class="tl-btn danger" data-do="delete">✕ Delete</button><button class="tl-btn" data-do="close">Done</button></span>
    </div>`;
  }
  const free = result.cast.some((c) => !beat.actions.some((x) => x.actor === c.id));
  return `<div class="tl-editor" id="tl-editor">${title}
    <button class="tl-btn" data-do="earlier" ${i === 0 ? 'disabled' : ''}>◀ Earlier</button>
    <button class="tl-btn" data-do="later" ${i === beats.length - 1 ? 'disabled' : ''}>Later ▶</button>
    <button class="tl-btn" data-do="add-action" ${free ? '' : 'disabled'} title="Someone else does something at the same time">＋ Someone</button>
    <button class="tl-btn" data-do="add-camera" ${beat.camera ? 'disabled' : ''}>＋ Camera move</button>
    <span class="tl-spacer"><button class="tl-btn danger" data-do="delete-step">✕ Delete step</button><button class="tl-btn" data-do="close">Done</button></span>
  </div>`;
}

// ---------------------------------------------------------------------------------------------
// Editing

/** A sensible first action for a figure: people wave, animals jump. */
function defaultAction(id) {
  const person = result.cast.find((c) => c.id === id)?.person;
  return { actor: id, type: 'pose', anim: person ? 'wave' : 'jump', gait: 'walk' };
}

function act(what) {
  const i = selected?.beat;
  const beat = beats[i];
  if (what === 'revert') return revert();
  if (what === 'play') return playing ? seek(currentTime()) : play();
  if (what === 'close') { selected = null; return render(); }
  if (what === 'add-step') {
    const at = selected ? i + 1 : beats.length;
    const first = result.cast.find((c) => c.person) ?? result.cast[0];
    beats.splice(at, 0, { actions: [defaultAction(first.id)] });
    selected = { beat: at, actor: first.id };
    return apply();
  }
  if (!beat) return;
  if (what === 'earlier' || what === 'later') {
    const j = what === 'earlier' ? i - 1 : i + 1;
    if (!beats[j]) return;
    [beats[i], beats[j]] = [beats[j], beats[i]];
    selected = { beat: j };
    return apply();
  }
  if (what === 'delete-step') {
    beats.splice(i, 1);
    selected = null;
    return apply();
  }
  if (what === 'add-action') {
    const free = result.cast.find((c) => !beat.actions.some((x) => x.actor === c.id));
    if (!free) return;
    beat.actions.push(defaultAction(free.id));
    selected = { beat: i, actor: free.id };
    return apply();
  }
  if (what === 'add-camera') {
    beat.camera = { type: 'zoomIn', target: beat.actions[0]?.actor ?? null };
    selected = { beat: i, camera: true };
    return apply();
  }
  if (what === 'delete') {
    if (selected.camera) delete beat.camera;
    else beat.actions = beat.actions.filter((x) => x.actor !== selected.actor);
    if (!beat.actions.length && !beat.camera) beats.splice(i, 1);
    selected = null;
    return apply();
  }
}

function change(field, value) {
  const beat = beats[selected?.beat];
  if (!beat) return;
  if (field === 'camera' || field === 'camera-target') {
    const c = beat.camera;
    if (field === 'camera-target') c.target = value || null;
    else {
      const [type, dir] = value.split(':');
      beat.camera = { type, target: type === 'zoomIn' || type === 'panTo' ? c.target ?? beat.actions[0]?.actor ?? result.cast[0].id : null, ...(type === 'pan' ? { dir: +dir } : {}) };
    }
    return apply();
  }
  const a = beat.actions.find((x) => x.actor === selected.actor);
  if (!a) return;
  if (field === 'actor') {
    a.actor = value;
    if (a.target === value) a.target = result.cast.find((c) => c.id !== value)?.id;
    selected.actor = value;
  } else if (field === 'does') {
    const [type, rest] = value.split(':');
    a.type = type;
    delete a.anim;
    if (type === 'pose') a.anim = rest;
    else if (rest) a.gait = rest;
    if (type === 'moveTo' && (!a.target || a.target === a.actor)) a.target = result.cast.find((c) => c.id !== a.actor)?.id;
    if (type !== 'moveTo') delete a.target;
    if (type === 'expr' && !a.expression) a.expression = 'happy';
  } else if (field === 'target') a.target = value;
  else if (field === 'expression') {
    if (value) a.expression = value;
    else delete a.expression;
  }
  apply();
}

panel.addEventListener('click', (e) => {
  const el = e.target.closest('button');
  if (!el || !panel.contains(el)) return;
  if (el.dataset.do) return act(el.dataset.do);
  if (el.dataset.step !== undefined) selected = { beat: +el.dataset.step };
  else if (el.dataset.camera) selected = { beat: +el.dataset.beat, camera: true };
  else if (el.dataset.actor) selected = { beat: +el.dataset.beat, actor: el.dataset.actor };
  else return;
  render();
  findClock();
});
panel.addEventListener('change', (e) => {
  if (e.target.matches('select[data-field]')) change(e.target.dataset.field, e.target.value);
});
panel.addEventListener('keydown', (e) => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && selected && e.target.matches('.tl-block')) {
    e.preventDefault();
    act(selected.actor || selected.camera ? 'delete' : 'delete-step');
  }
});

// ---------------------------------------------------------------------------------------------
// Playhead: follows the clip, and dragging on the ruler scrubs (every animation paused and seeked)

const animations = () => studio.getSvgElement()?.getAnimations?.({ subtree: true }) ?? [];

function findClock() {
  const T = (result?.duration || 0) * 1000;
  clock = T ? animations().find((a) => Math.abs(a.effect.getComputedTiming().duration - T) < 5) ?? null : null;
}

function currentTime() {
  if (!clock || !result?.duration) return 0;
  return ((clock.currentTime ?? 0) % (result.duration * 1000)) / 1000;
}

function seek(t) {
  for (const a of animations()) {
    a.pause();
    a.currentTime = t * 1000;
  }
  playing = false;
  const btn = panel.querySelector('[data-do="play"]');
  if (btn) { btn.innerHTML = ICON.play; btn.setAttribute('aria-label', 'Play'); }
}

function play() {
  for (const a of animations()) a.play();
  playing = true;
  const btn = panel.querySelector('[data-do="play"]');
  if (btn) { btn.innerHTML = ICON.pause; btn.setAttribute('aria-label', 'Pause'); }
}

function tick() {
  if (clock && !clock.effect?.target?.isConnected) findClock();
  const head = document.getElementById('tl-playhead');
  const label = document.getElementById('tl-time');
  if (head && result?.duration) {
    const t = currentTime();
    head.style.left = pct((t / result.duration) * 100);
    if (label) label.textContent = `${t.toFixed(1)}s / ${result.duration.toFixed(1)}s`;
  }
  raf = requestAnimationFrame(tick);
}

panel.addEventListener('pointerdown', (e) => {
  const ruler = e.target.closest('#tl-ruler');
  if (!ruler || !result?.duration) return;
  const to = (ev) => {
    const r = ruler.getBoundingClientRect();
    seek(Math.max(0, Math.min(0.999, (ev.clientX - r.left) / r.width)) * result.duration);
  };
  ruler.setPointerCapture?.(e.pointerId);
  to(e);
  const move = (ev) => to(ev);
  const up = () => { ruler.removeEventListener('pointermove', move); ruler.removeEventListener('pointerup', up); };
  ruler.addEventListener('pointermove', move);
  ruler.addEventListener('pointerup', up);
});

window.pictogenTimeline = { update, getBeats: () => beats };
// The first scene may have been drawn before this module loaded
if (studio.getState().result && studio.getState().mode === 'scene') update(studio.getState().result);
