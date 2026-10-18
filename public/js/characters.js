// "Your characters": a face photo on a figure, called by name in prompts ("Tom walks in, then
// waves"). The photo is cropped to the head's oval here, in the browser, and never leaves it: the
// server only sees "the boy", and the face is put on the finished drawing on this page, so GIF and
// video exports carry it too. Drawings mark where a face goes with data-face="cx cy r" (people.js).

const studio = window.pictogenStudio;
const panel = document.getElementById('characters-panel');
const KEY = 'pictogen.characters.v1';
const MAX = 8;
const BASES = [['boy', 'Boy'], ['girl', 'Girl'], ['man', 'Man'], ['woman', 'Woman']];
// The face oval: a little taller than wide, like a head. The saved photo is its bounding box.
const RATIO = 1.18;
const OUT_W = 200, OUT_H = Math.round(OUT_W * RATIO);
// The crop stage and the oval in it (stage pixels)
const STAGE_W = 300, STAGE_H = 354;
const OVAL = { w: 196, h: Math.round(196 * RATIO) };
OVAL.x = (STAGE_W - OVAL.w) / 2;
OVAL.y = (STAGE_H - OVAL.h) / 2 - 6;
const EYE_LINE = 0.43; // eyes this far down the oval

let characters = load();
let uid = 0;

function load() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((c) => c && c.name && c.photo && BASES.some(([b]) => b === c.base)) : [];
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
/** All characters as the engine knows them: { key, base } (kind of figure), never names or photos */
const individuals = () => characters.map((c) => ({ key: keyOf(c), base: c.base }));

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
    out = out.replace(re, (m, det, offset) => {
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

const SVG = 'http://www.w3.org/2000/svg';
/** Puts each named character's photo on its figure (data-who: its key), in every pose it has. */
function apply(svg, named) {
  if (!svg || !named?.length) return svg;
  for (const c of named) {
    for (const item of svg.querySelectorAll(`.movable-item[data-who="${keyOf(c)}"]`)) {
      item.dataset.character = c.name;
      for (const head of item.querySelectorAll('[data-face]')) {
        if (head.querySelector(':scope > .pg-photo-face')) continue;
        const [cx, cy, r] = head.dataset.face.split(' ').map(Number);
        const rx = r * 1.02, ry = rx * RATIO, oy = cy - r * 0.06;
        const id = `pgface${Date.now().toString(36)}${uid++}`;
        const g = document.createElementNS(SVG, 'g');
        g.setAttribute('class', 'pg-photo-face');
        // The photo fades out toward the oval's edge, so the drawn hair and head frame it softly
        g.innerHTML = `<defs><radialGradient id="${id}g"><stop offset="0.7" stop-color="#fff"/><stop offset="0.97" stop-color="#000"/></radialGradient>`
          + `<mask id="${id}" maskUnits="userSpaceOnUse"><ellipse cx="${cx}" cy="${oy}" rx="${rx}" ry="${ry}" fill="url(#${id}g)"/></mask></defs>`
          + `<image href="${c.photo}" x="${cx - rx}" y="${oy - ry}" width="${2 * rx}" height="${2 * ry}" preserveAspectRatio="none" mask="url(#${id})"/>`;
        // The drawn eyes and mouth hide under the photo (and would blink through it)
        head.querySelectorAll('.pg-face-eyes, .pg-face-mouth').forEach((f) => f.setAttribute('display', 'none'));
        head.appendChild(g);
      }
    }
  }
  return svg;
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
  panel.hidden = st.mode !== 'scene';
  if (panel.hidden) return;
  const example = characters[0] ? `“${esc(characters[0].name)} walks in, then waves”` : '';
  panel.innerHTML = `
    <div class="tl-head">
      <span class="tl-title">🙂 Your characters</span>
      <button class="tl-btn primary" data-do="add" ${characters.length >= MAX ? 'disabled' : ''} title="Put a face from a photo on a character">＋ Add from a photo</button>
      <input type="file" accept="image/*" hidden>
    </div>
    ${characters.length ? `<ul class="char-list">${characters.map((c, i) => `
      <li class="char-row"><img src="${c.photo}" alt=""><span class="char-name">${esc(c.name)}</span><span class="char-base">${esc(BASES.find(([b]) => b === c.base)[1])}</span>
        <button class="tl-btn danger" data-remove="${i}" aria-label="Remove ${esc(c.name)}" title="Remove">✕</button></li>`).join('')}</ul>
      <div class="tl-empty">Use the names in prompts: ${example}.</div>`
    : '<div class="tl-empty">Put a face on a boy, girl, man or woman, give them a name, and use it in your prompts. The photo stays in this browser.</div>'}`;
}

panel.addEventListener('click', (e) => {
  const el = e.target.closest('button');
  if (!el) return;
  if (el.dataset.do === 'add') panel.querySelector('input[type=file]').click();
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

function openCrop(img, done) {
  const modal = document.createElement('div');
  modal.className = 'face-modal';
  const used = new Set(characters.map((c) => c.base));
  const base = BASES.find(([b]) => !used.has(b))?.[0] ?? 'boy';
  modal.innerHTML = `
    <div class="face-card" role="dialog" aria-modal="true" aria-labelledby="face-title">
      <h3 id="face-title">Fit the face in the oval</h3>
      <p class="face-help">Drag the photo so the face fills the oval: <b>eyes on the line</b>, <b>chin at the bottom</b> of the oval. Hair may go outside it.</p>
      <div class="face-stage" style="width:${STAGE_W}px;height:${STAGE_H}px">
        <canvas width="${STAGE_W * 2}" height="${STAGE_H * 2}" style="width:${STAGE_W}px;height:${STAGE_H}px"></canvas>
        <svg viewBox="0 0 ${STAGE_W} ${STAGE_H}" aria-hidden="true">
          <path fill="rgb(15 23 42 / .62)" fill-rule="evenodd" d="M0 0H${STAGE_W}V${STAGE_H}H0Z M${OVAL.x} ${OVAL.y + OVAL.h / 2}a${OVAL.w / 2} ${OVAL.h / 2} 0 1 0 ${OVAL.w} 0a${OVAL.w / 2} ${OVAL.h / 2} 0 1 0 ${-OVAL.w} 0Z"/>
          <ellipse cx="${STAGE_W / 2}" cy="${OVAL.y + OVAL.h / 2}" rx="${OVAL.w / 2}" ry="${OVAL.h / 2}" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="6 5"/>
          <line x1="${OVAL.x + 18}" x2="${OVAL.x + OVAL.w - 18}" y1="${OVAL.y + OVAL.h * EYE_LINE}" y2="${OVAL.y + OVAL.h * EYE_LINE}" stroke="#fde68a" stroke-width="1.5" stroke-dasharray="4 4"/>
          <text x="${OVAL.x + OVAL.w + 6}" y="${OVAL.y + OVAL.h * EYE_LINE + 4}" fill="#fde68a" font-size="12" font-weight="700">eyes</text>
          <path d="M${STAGE_W / 2 - 14} ${OVAL.y + OVAL.h} h28" stroke="#fde68a" stroke-width="3" stroke-linecap="round"/>
          <text x="${STAGE_W / 2}" y="${OVAL.y + OVAL.h + 17}" fill="#fde68a" font-size="12" font-weight="700" text-anchor="middle">chin</text>
        </svg>
      </div>
      <label class="face-zoom">Zoom <input type="range" min="0" max="1" step="0.001" aria-label="Zoom"></label>
      <div class="face-row">
        <label>Name <input class="face-name" maxlength="20" placeholder="e.g. Tom" autocomplete="off"></label>
        <label>Is a <select class="face-base">${BASES.map(([b, l]) => `<option value="${b}"${b === base ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
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
    if (!/^[\p{L}][\p{L}' -]{0,19}$/u.test(name)) return error('Give the character a name, using letters (for example Tom).');
    if (characters.some((c) => c.name.toLowerCase() === name.toLowerCase())) return error(`There already is a character called ${name}.`);
    if (/^(the|a|an|he|she|they|it|boy|girl|man|woman|dog|cat|and|then)$/i.test(name)) return error('Pick a name that is not an everyday word.');
    // Save the oval's box at OUT_W x OUT_H
    const out = document.createElement('canvas');
    out.width = OUT_W; out.height = OUT_H;
    draw(out.getContext('2d'), OUT_W / OVAL.w, OVAL.x, OVAL.y);
    // With the background gone the photo needs transparency: WebP where the browser can, else PNG
    const cleared = modal.querySelector('.face-plain').checked && removeBackground(out, canvas, 2);
    const webp = cleared && out.toDataURL('image/webp', 0.9);
    const photo = cleared ? (webp.startsWith('data:image/webp') ? webp : out.toDataURL('image/png')) : out.toDataURL('image/jpeg', 0.88);
    characters.push({ name, base: modal.querySelector('.face-base').value, photo });
    if (!save()) { characters.pop(); return error('The browser has no room left to keep this photo.'); }
    close();
    render();
    studio.showToast(`${name} is ready: try “${name} walks in, then waves”`);
  });
  modal.querySelector('.face-name').focus();
}

window.pictogenCharacters = { rewrite, apply, withFaces, individuals, nameOfKey, refresh: render, list: () => characters };
render();
