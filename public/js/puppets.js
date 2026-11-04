// "Your figures" (dot puppets): a picture drawn here or brought in, cut into parts (a loop drawn round
// each leg, arm, head, tail...), each part with a dot where it bends, and, if wanted, a move of its own
// (an arrow: a pendulum swinging, a lid shaking). Kept in this browser under a name; the engine gets
// each figure as one of "your characters" ({ key: 'pgc501', puppet: { image, parts, size, ... } },
// src/puppets.js) and moves it like its own figures: it walks, runs, dances, jumps, waves...

const studio = window.pictogenStudio;
const panel = document.getElementById('puppets-panel');
const KEY = 'pictogen.puppets.v1';
const MAX = 8;
const FIRST_KEY = 501; // (their keys: pgc501..., after your characters' and a story's own)
const PX = 360, K = PX / 100; // the picture: 360 pixels for the figure's 0..100 box

const ROLES = [['leg', '🦵 Leg'], ['arm', '💪 Arm'], ['head', '🙂 Head'], ['tail', '〰️ Tail'], ['part', '✨ Other part']];
const MOVES = [['', 'No move of its own'], ['swing', '↔ Swing'], ['nod', '↷ Nod'], ['shake', '〰 Shake'], ['bounce', '↕ Bounce'], ['spin', '⟳ Spin']];
const SPEEDS = [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']];
const SIZES = [['tiny', 'Tiny (a cup)'], ['small', 'Small (a cat)'], ['medium', 'Medium (a child)'], ['person', 'Like a person'], ['big', 'Big (a door)'], ['huge', 'Huge (a tree)']];
const INKS = ['#1f2937', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#a1683a', '#ffffff'];
const TRY = [['', '🧍 Stand'], ['walks', '🚶 Walk'], ['runs', '🏃 Run'], ['dances', '💃 Dance'], ['jumps', '🦘 Jump'], ['waves', '👋 Wave']];

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r2 = (v) => Math.round(v * 100) / 100;

let puppets = load();

function load() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((p) => p && typeof p.name === 'string' && typeof p.image === 'string').slice(0, MAX) : [];
  } catch {
    return [];
  }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(puppets)); return true; } catch { return false; }
}

/** The neutral key a figure's name becomes in a prompt ("Mr Table" -> "pgc501") */
const keyOf = (p) => `pgc${FIRST_KEY + puppets.indexOf(p)}`;
/** What the engine gets: the picture and its parts, never the name */
const sent = (p) => ({ image: p.image, parts: p.parts, size: p.size, baseline: p.baseline, width: p.width });
const individuals = () => puppets.map((p) => ({ key: keyOf(p), puppet: sent(p) }));
const named = () => puppets.map((p) => ({ key: keyOf(p), name: p.name }));
const kindOf = (parts) => {
  const legs = parts.filter((x) => x.role === 'leg').length;
  return legs >= 3 ? `${legs} legs: it walks like a dog` : legs === 2 ? '2 legs: it walks like a person' : legs === 1 ? '1 leg: it hops along' : 'no legs: it hops, wobbles and dances as a whole';
};

function nameError(name, self = null) {
  if (!/^[\p{L}][\p{L}\d' -]{0,23}$/u.test(name)) return 'Give the figure a name, using letters (for example Mr Table).';
  if (puppets.some((p) => p !== self && p.name.toLowerCase() === name.toLowerCase())) return `There already is a figure called ${name}.`;
  if ((window.pictogenCharacters?.list() ?? []).some((c) => c.name.toLowerCase() === name.toLowerCase())) return `${name} is one of your characters.`;
  if (/^(the|a|an|he|she|they|it|table|chair|lamp|cup|dog|cat|boy|girl|man|woman|and|then)$/i.test(name)) return 'Pick a name that is not an everyday word (for example Mr Table).';
  return '';
}

// ---------------------------------------------------------------------------------------------
// Pictures: the figure drawn by the engine, standing or doing something

const drawnCache = new Map();
function picture(p, action = '', style = studio.getState().style) {
  const body = { text: `pgc${FIRST_KEY}${action ? ` ${action}` : ''}`, individuals: [{ key: `pgc${FIRST_KEY}`, puppet: sent(p) }], style, mode: 'scene', seed: 7, width: 640, height: 360 };
  const key = JSON.stringify([p.image.length, p.parts, p.size, p.baseline, action, style]);
  if (!drawnCache.has(key)) {
    drawnCache.set(key, fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then((r) => r.json()).then((d) => d.svg || '').catch(() => ''));
  }
  return drawnCache.get(key);
}

function render() {
  const st = studio.getState();
  panel.hidden = !['scene', 'story'].includes(st.mode);
  if (panel.hidden) return;
  const full = puppets.length >= MAX ? 'disabled' : '';
  panel.innerHTML = `
    <div class="tl-head">
      <span class="tl-title">🧩 Your figures</span>
      <button class="tl-btn primary" data-do="new" ${full} title="Bring a drawing to life: cut it into parts and put dots where they bend">＋ Make it move</button>
    </div>
    ${puppets.length ? `<ul class="char-list">${puppets.map((p, i) => `
      <li class="char-row place-row"><img class="puppet-thumb" src="${p.image}" alt=""><span class="char-name">${esc(p.name)}</span><span class="char-base">${esc(kindOf(p.parts).split(':')[0])}</span>
        <button class="tl-btn" data-edit="${i}" aria-label="Change ${esc(p.name)}" title="Change the figure">✎</button>
        <button class="tl-btn danger" data-remove="${i}" aria-label="Remove ${esc(p.name)}" title="Remove">✕</button></li>`).join('')}</ul>
      <div class="tl-empty">Use the names in prompts and stories: “${esc(puppets[0].name)} walks to the door”, “${esc(puppets[0].name)} dances”, “then ${esc(puppets[0].name)} jumps”.</div>`
    : '<div class="tl-empty">Draw something (or bring in a picture), draw a loop round each part that moves - its legs, arms, head, tail - and put a dot where each part bends. It then walks, runs, dances and jumps like the other figures, by its name.</div>'}`;
}

// ---------------------------------------------------------------------------------------------
// The editor

function openEditor(existing = null) {
  const draft = existing
    ? { name: existing.name, size: existing.size, parts: existing.parts.map((x) => JSON.parse(JSON.stringify(x))), image: existing.image }
    : { name: '', size: 'medium', parts: [], image: null };
  let step = existing ? 2 : 1, role = 'leg', selected = -1, tool = 'pen', ink = INKS[0], width = 6, trying = '';
  const modal = document.createElement('div');
  modal.className = 'face-modal';
  modal.innerHTML = `
    <div class="face-card puppet-card" role="dialog" aria-modal="true" aria-labelledby="puppet-title">
      <h3 id="puppet-title">${existing ? `Change ${esc(existing.name)}` : 'Make it move'}</h3>
      <div class="puppet-steps" role="tablist">${['1 Picture', '2 Parts and dots', '3 Moves', '4 Name'].map((s, i) => `<button class="char-chip" role="tab" data-step="${i + 1}">${s}</button>`).join('')}</div>
      <div class="puppet-main">
        <div class="puppet-stage">
          <canvas class="puppet-canvas" width="${PX}" height="${PX}" aria-label="The picture"></canvas>
          <svg class="puppet-overlay" viewBox="0 0 100 100" aria-hidden="true"></svg>
        </div>
        <div class="puppet-side"></div>
      </div>
      <div class="puppet-try"><span class="puppet-kind"></span><span>${TRY.map(([v, l]) => `<button class="char-chip" data-try="${v}">${l}</button>`).join('')}</span></div>
      <div class="puppet-preview" aria-live="polite"></div>
      <p class="face-error" role="alert"></p>
      <div class="face-actions"><button class="tl-btn" data-do="cancel">Cancel</button><button class="tl-btn primary" data-do="save">${existing ? 'Save' : 'Keep this figure'}</button></div>
    </div>`;
  document.body.appendChild(modal);
  const canvas = modal.querySelector('.puppet-canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
  const overlay = modal.querySelector('.puppet-overlay'), side = modal.querySelector('.puppet-side');
  const preview = modal.querySelector('.puppet-preview');
  const error = (msg) => { modal.querySelector('.face-error').textContent = msg; };

  // The picture
  const putImage = (src) => new Promise((done) => {
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, PX, PX);
      // (fitted into the square, kept whole: the figure's box)
      const s = Math.min(PX / img.width, PX / img.height) * 0.96;
      ctx.drawImage(img, (PX - img.width * s) / 2, PX - img.height * s - PX * 0.02, img.width * s, img.height * s);
      done();
    };
    img.onerror = () => { error('That picture could not be opened.'); done(); };
    img.src = src;
  });
  if (draft.image) putImage(draft.image).then(() => { paint(); refreshPreview(); });

  // Where the picture is drawn (its box in the 0..100 square): its feet, its width
  const bounds = () => {
    const { data } = ctx.getImageData(0, 0, PX, PX);
    let minX = PX, maxX = -1, maxY = -1;
    for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) if (data[(y * PX + x) * 4 + 3] > 24) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
    return maxX < 0 ? null : { baseline: r2(Math.min(100, (maxY + 1) / K)), width: r2(Math.max(0.1, (maxX - minX + 1) / PX)) };
  };
  const current = () => {
    const b = bounds();
    return b ? { image: canvas.toDataURL('image/png'), parts: draft.parts, size: draft.size, baseline: b.baseline, width: b.width } : null;
  };

  // The overlay: each part's loop, its dot, its arrow
  const drawOverlay = (lasso = null) => {
    const parts = draft.parts.map((p, i) => {
      const on = i === selected;
      const arrow = p.move && step === 3 ? `<line x1="${p.pivot[0]}" y1="${p.pivot[1]}" x2="${r2(p.pivot[0] + p.move.dx)}" y2="${r2(p.pivot[1] + p.move.dy)}" class="pp-arrow" marker-end="url(#pp-head)"/>` : '';
      return `<polygon points="${p.points.map((q) => q.join(',')).join(' ')}" class="pp-loop${on ? ' on' : ''}" data-part="${i}"/>${arrow}<circle cx="${p.pivot[0]}" cy="${p.pivot[1]}" r="${on ? 2.6 : 2}" class="pp-dot${on ? ' on' : ''}" data-dot="${i}"/>`;
    }).join('');
    overlay.innerHTML = `<defs><marker id="pp-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#f59e0b"/></marker></defs>${parts}${lasso ? `<polyline points="${lasso.map((q) => q.join(',')).join(' ')}" class="pp-lasso"/>` : ''}`;
  };

  // The side: what this step is for
  const paint = () => {
    modal.querySelectorAll('[data-step]').forEach((b) => b.classList.toggle('on', +b.dataset.step === step));
    const partsList = draft.parts.length ? `<ul class="pp-parts">${draft.parts.map((p, i) => `<li class="${i === selected ? 'on' : ''}"><button class="tl-btn" data-pick="${i}">${esc(ROLES.find(([r]) => r === p.role)[1])}${p.move ? ` · ${esc(MOVES.find(([m]) => m === p.move.type)?.[1] ?? '')}` : ''}</button><button class="tl-btn danger" data-unpart="${i}" aria-label="Remove this part">✕</button></li>`).join('')}</ul>` : '';
    if (step === 1) {
      side.innerHTML = `<p class="face-note">Draw your figure here, or bring in a picture (a drawing or a photo cut out on a clear background works best).</p>
        <label class="tl-btn pp-upload">📁 Bring in a picture<input type="file" accept="image/*" hidden></label>
        <div class="char-chips"><span>Pen</span>${INKS.map((c) => `<button type="button" class="char-swatch${tool === 'pen' && ink === c ? ' on' : ''}" data-ink="${c}" style="--c:${c}" aria-label="Pen colour"></button>`).join('')}</div>
        <div class="char-chips"><span>Size</span>${[3, 6, 12, 22].map((w) => `<button class="char-chip${width === w ? ' on' : ''}" data-width="${w}">${w < 6 ? 'Thin' : w < 12 ? 'Medium' : w < 22 ? 'Thick' : 'Fill'}</button>`).join('')}
          <button class="char-chip${tool === 'eraser' ? ' on' : ''}" data-tool="eraser">🧽 Eraser</button></div>
        <button class="tl-btn danger" data-do="clear">Start over</button>`;
    } else if (step === 2) {
      side.innerHTML = `<p class="face-note">Pick what it is, then <b>draw a loop round it</b> on the picture. A dot appears: <b>drag it to where the part bends</b> (a leg: its top, where it joins; an arm: the shoulder; a head: the neck).</p>
        <div class="char-chips">${ROLES.map(([r, l]) => `<button class="char-chip${role === r ? ' on' : ''}" data-role="${r}">${l}</button>`).join('')}</div>
        ${partsList || '<p class="face-note">No parts yet: without any it moves as a whole.</p>'}`;
    } else if (step === 3) {
      const p = draft.parts[selected];
      side.innerHTML = `<p class="face-note">A part can move on its own all the time: a pendulum swings, a lid shakes. Pick a part, its move, then <b>drag on the picture</b> to set the arrow: which way, and how far.</p>
        ${partsList || '<p class="face-note">Make some parts first (step 2).</p>'}
        ${p ? `<div class="char-chips">${MOVES.map(([m, l]) => `<button class="char-chip${(p.move?.type ?? '') === m ? ' on' : ''}" data-move="${m}">${l}</button>`).join('')}</div>
          ${p.move ? `<div class="char-chips"><span>Speed</span>${SPEEDS.map(([s, l]) => `<button class="char-chip${p.move.speed === s ? ' on' : ''}" data-speed="${s}">${l}</button>`).join('')}</div>` : ''}` : ''}`;
    } else {
      side.innerHTML = `<label class="face-row">Name <input class="face-name" maxlength="24" placeholder="e.g. Mr Table" autocomplete="off" value="${esc(draft.name)}"></label>
        <div class="char-chips"><span>How big</span>${SIZES.map(([s, l]) => `<button class="char-chip${draft.size === s ? ' on' : ''}" data-size="${s}">${l}</button>`).join('')}</div>
        <p class="face-note">Then use the name: “Mr Table walks to the door”, “Mr Table dances in the kitchen”. The picture and name stay in this browser.</p>`;
      side.querySelector('.face-name').addEventListener('input', (e) => { draft.name = e.target.value; });
    }
    modal.querySelector('.puppet-kind').textContent = `It has ${kindOf(draft.parts)}.`;
    drawOverlay();
  };

  // A try-out: the figure standing or moving, drawn by the engine
  let tries = 0;
  const refreshPreview = async () => {
    const p = current();
    if (!p) { preview.innerHTML = '<span class="face-note">Your figure shows here once there is a picture.</span>'; return; }
    const n = ++tries;
    const svg = await picture(p, trying);
    if (n === tries) preview.innerHTML = svg;
  };

  // Drawing, loops, dots and arrows on the picture
  const at = (e) => { const r = overlay.getBoundingClientRect(); return [r2(((e.clientX - r.left) / r.width) * 100), r2(((e.clientY - r.top) / r.height) * 100)]; };
  let gesture = null;
  overlay.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    overlay.setPointerCapture(e.pointerId);
    const q = at(e);
    if (step === 1) {
      gesture = { kind: 'pen', last: q };
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = ink; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(q[0] * K, q[1] * K); ctx.lineTo(q[0] * K + 0.1, q[1] * K); ctx.stroke();
      return;
    }
    // (a dot grabbed: moved, in any step)
    const dot = draft.parts.findIndex((p) => Math.hypot(p.pivot[0] - q[0], p.pivot[1] - q[1]) < 4);
    if (dot >= 0) { selected = dot; gesture = { kind: 'dot', i: dot }; paint(); return; }
    if (step === 2) gesture = { kind: 'lasso', points: [q] };
    else if (step === 3 && draft.parts[selected]?.move) gesture = { kind: 'arrow' };
  });
  overlay.addEventListener('pointermove', (e) => {
    if (!gesture) return;
    const q = at(e);
    if (gesture.kind === 'pen') {
      ctx.beginPath(); ctx.moveTo(gesture.last[0] * K, gesture.last[1] * K); ctx.lineTo(q[0] * K, q[1] * K); ctx.stroke();
      gesture.last = q;
    } else if (gesture.kind === 'lasso') {
      const last = gesture.points.at(-1);
      if (Math.hypot(q[0] - last[0], q[1] - last[1]) > 1.2) gesture.points.push(q);
      drawOverlay(gesture.points);
    } else if (gesture.kind === 'dot') {
      draft.parts[gesture.i].pivot = q;
      drawOverlay();
    } else if (gesture.kind === 'arrow') {
      const p = draft.parts[selected];
      p.move.dx = r2(Math.max(-60, Math.min(60, q[0] - p.pivot[0])));
      p.move.dy = r2(Math.max(-60, Math.min(60, q[1] - p.pivot[1])));
      drawOverlay();
    }
  });
  const end = () => {
    if (!gesture) return;
    const g = gesture;
    gesture = null;
    ctx.globalCompositeOperation = 'source-over';
    if (g.kind === 'lasso') {
      if (g.points.length < 6) { drawOverlay(); return; }
      // (every other point is plenty; the dot starts at the top middle, where a leg or an arm joins)
      const points = g.points.filter((_, i) => i % 2 === 0).slice(0, 120);
      const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
      draft.parts.push({ role, points, pivot: [r2((Math.min(...xs) + Math.max(...xs)) / 2), r2(Math.min(...ys) + 2)] });
      selected = draft.parts.length - 1;
      paint();
    }
    refreshPreview();
  };
  overlay.addEventListener('pointerup', end);
  overlay.addEventListener('pointercancel', end);

  modal.addEventListener('change', async (e) => {
    if (!e.target.matches('input[type=file]')) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await new Promise((done) => { const fr = new FileReader(); fr.onload = () => done(fr.result); fr.readAsDataURL(file); });
    await putImage(url);
    refreshPreview();
  });
  modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.remove(); });
  modal.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset, part = draft.parts[selected];
    if (d.step) { step = +d.step; if (step === 3 && selected < 0 && draft.parts.length) selected = 0; paint(); return; }
    if (d.ink) { ink = d.ink; tool = 'pen'; paint(); return; }
    if (d.width) { width = +d.width; paint(); return; }
    if (d.tool) { tool = tool === 'eraser' ? 'pen' : 'eraser'; paint(); return; }
    if (d.role) { role = d.role; paint(); return; }
    if (d.pick !== undefined) { selected = +d.pick; paint(); return; }
    if (d.unpart !== undefined) { draft.parts.splice(+d.unpart, 1); selected = -1; paint(); refreshPreview(); return; }
    if (d.move !== undefined && part) { part.move = d.move ? { type: d.move, dx: part.move?.dx ?? 18, dy: part.move?.dy ?? 0, speed: part.move?.speed ?? 'normal' } : undefined; if (!part.move) delete part.move; paint(); refreshPreview(); return; }
    if (d.speed && part?.move) { part.move.speed = d.speed; paint(); refreshPreview(); return; }
    if (d.size) { draft.size = d.size; paint(); refreshPreview(); return; }
    if (d.try !== undefined) { trying = d.try; modal.querySelectorAll('[data-try]').forEach((x) => x.classList.toggle('on', x === b)); refreshPreview(); return; }
    if (d.do === 'clear') { ctx.clearRect(0, 0, PX, PX); draft.parts = []; selected = -1; paint(); refreshPreview(); return; }
    if (d.do === 'cancel') { modal.remove(); return; }
    if (d.do === 'save') {
      const p = current();
      if (!p) { step = 1; paint(); return error('Draw your figure first, or bring in a picture.'); }
      const name = draft.name.trim().replace(/\s+/g, ' ');
      const why = nameError(name, existing);
      if (why) { step = 4; paint(); return error(why); }
      const made = { name, ...p };
      if (existing) Object.assign(existing, made); else puppets.push(made);
      if (!save()) return error('The browser has no room left to keep this figure: try a smaller picture.');
      modal.remove();
      render();
      studio.showToast(existing ? `${name} is changed` : `${name} is ready: try “${name} walks to the door”`);
    }
  });
  paint();
  refreshPreview();
}

panel.addEventListener('click', (e) => {
  const el = e.target.closest('button');
  if (!el) return;
  if (el.dataset.do === 'new') openEditor();
  else if (el.dataset.edit !== undefined) openEditor(puppets[+el.dataset.edit]);
  else if (el.dataset.remove !== undefined) {
    const [gone] = puppets.splice(+el.dataset.remove, 1);
    save();
    render();
    studio.showToast(`Removed ${gone.name}`);
  }
});

window.pictogenPuppets = { individuals, named, list: () => puppets, refresh: render, open: openEditor };
render();
