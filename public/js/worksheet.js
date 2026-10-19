// Printable worksheets from the studio: the picture on the canvas as an A4 page with a name and
// date line and an activity (write about it, count and write, label the diagram, colour it in),
// plus an answer key. Previewed here, downloaded as a PDF made in this browser (pdf.js) or
// printed. Nothing leaves the browser on the web version; the page itself comes from /api/worksheet.

import { pagesToPdf, rasterize } from '/js/pdf.js';

const studio = window.pictogenStudio;
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => String(s || 'worksheet').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'worksheet';
const KINDS = { auto: '✨ The best fit', write: '✏️ Write about the picture', count: '🔢 Count and write', label: '🏷 Label the diagram', colour: '🖍 Colour it in' };

const dialog = document.createElement('dialog');
dialog.className = 'worksheet-dialog';
dialog.innerHTML = `
  <form method="dialog" class="ws-form">
    <div class="ws-head"><strong>🖨 Printable worksheet</strong><button class="ws-close" value="close" aria-label="Close">✕</button></div>
    <div class="ws-body">
      <div class="ws-fields">
        <label>Kind of worksheet<select id="ws-kind">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
        <label>Title<input id="ws-title" maxlength="70" placeholder="(from the picture)"></label>
        <label>What to do<input id="ws-instructions" maxlength="160" placeholder="(written for the kind of worksheet)"></label>
        <label class="ws-check"><input type="checkbox" id="ws-answers" checked> Add an answer key page (count and label)</label>
        <p class="ws-note">The worksheet is made on this device. Nothing is uploaded.</p>
        <div class="ws-actions">
          <button type="button" class="btn-generate" id="ws-pdf">⬇ Download PDF</button>
          <button type="button" class="btn-action" id="ws-print">🖨 Print</button>
        </div>
      </div>
      <div class="ws-preview" id="ws-preview" aria-live="polite">Making the page…</div>
    </div>
  </form>`;
document.body.appendChild(dialog);

const $ = (id) => dialog.querySelector(`#${id}`);
let pages = [], urls = [], current = null, timer = null;

function request() {
  const st = studio.getState();
  const cast = studio.castOf?.() ?? { text: st.prompt };
  return {
    text: cast.text,
    individuals: window.pictogenCharacters?.individuals() ?? [],
    style: st.style,
    mode: st.mode === 'story' ? 'scene' : st.mode,
    seed: st.seed,
    vary: st.vary,
    ...(st.labelsFor === st.prompt ? { labels: st.labels } : {}),
    kind: $('ws-kind').value === 'auto' ? undefined : $('ws-kind').value,
    title: $('ws-title').value.trim() || undefined,
    instructions: $('ws-instructions').value.trim() || undefined,
    answers: $('ws-answers').checked,
  };
}

async function refresh() {
  const body = request();
  current = body;
  $('ws-preview').innerHTML = '<div class="ws-wait">Making the page…</div>';
  try {
    const res = await fetch('/api/worksheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (current !== body) return; // (a newer one is on its way)
    if (!data.pages) throw new Error(data.error || 'no page');
    pages = data.pages;
    if (!$('ws-title').value) $('ws-title').placeholder = data.title;
    if ($('ws-kind').value === 'auto') $('ws-kind').options[0].textContent = `✨ The best fit (${KINDS[data.kind].replace(/^\S+\s/, '').toLowerCase()})`;
    // (as pictures: a page's own styles must not reach the studio)
    for (const u of urls) URL.revokeObjectURL(u);
    urls = pages.map((p) => URL.createObjectURL(new Blob([p], { type: 'image/svg+xml;charset=utf-8' })));
    $('ws-preview').innerHTML = urls.map((u, i) => `<figure class="ws-page"><img class="ws-paper" src="${u}" alt="${i ? 'Answer key' : 'Worksheet'} page"><figcaption>${i ? 'Answer key' : 'Worksheet'}</figcaption></figure>`).join('');
  } catch (err) {
    $('ws-preview').innerHTML = `<div class="ws-wait">Could not make the page: ${esc(err.message)}</div>`;
  }
}
const later = () => { clearTimeout(timer); timer = setTimeout(refresh, 350); };
for (const id of ['ws-kind', 'ws-answers']) $(id).addEventListener('change', refresh);
for (const id of ['ws-title', 'ws-instructions']) $(id).addEventListener('input', later);

async function busy(btn, fn) {
  if (btn.disabled) return;
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ One moment…';
  try { await fn(); } catch (err) { studio.showToast(`Sorry: ${err.message}`); } finally { btn.disabled = false; btn.textContent = label; }
}

$('ws-pdf').addEventListener('click', (e) => busy(e.currentTarget, async () => {
  if (!pages.length) await refresh();
  const title = $('ws-title').value.trim() || $('ws-title').placeholder;
  const blob = await pagesToPdf(pages, { title });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${slug(title)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  studio.showToast(`Worksheet saved (${pages.length} page${pages.length > 1 ? 's' : ''})`);
}));

// Printing: the pages as pictures in a hidden frame, one per A4 sheet
$('ws-print').addEventListener('click', (e) => busy(e.currentTarget, async () => {
  if (!pages.length) await refresh();
  const imgs = [];
  for (const p of pages) imgs.push((await rasterize(p, 2)).toDataURL('image/jpeg', 0.92));
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  frame.contentDocument.write(`<!doctype html><html><head><title>Worksheet</title><style>@page { size: A4; margin: 0; } html, body { margin: 0; } img { display: block; width: 210mm; height: 297mm; page-break-after: always; }</style></head><body>${imgs.map((src) => `<img src="${src}">`).join('')}</body></html>`);
  frame.contentDocument.close();
  await new Promise((r) => setTimeout(r, 300));
  frame.contentWindow.focus();
  frame.contentWindow.print();
  setTimeout(() => frame.remove(), 60000);
}));

/** Opens the worksheet dialog for the picture on the canvas */
export function openWorksheet() {
  const st = studio.getState();
  $('ws-title').value = '';
  $('ws-kind').value = 'auto';
  $('ws-kind').options[0].textContent = KINDS.auto;
  pages = [];
  if (st.mode === 'story') studio.showToast('A worksheet is made from one picture: the scene on the canvas');
  dialog.showModal();
  refresh();
}
window.pictogenWorksheet = { open: openWorksheet };
document.getElementById('btn-worksheet')?.addEventListener('click', openWorksheet);
