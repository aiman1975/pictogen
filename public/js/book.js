// Picture books from the studio: a clip (its scenes and captions) as a storybook to print or keep.
// A cover with the title, "by ..." and a picture, one page per scene (the picture at the moment the
// most is happening, its caption in big friendly letters, a page number), and "The End". Pages are
// drawn here on canvases and saved as a landscape A4 PDF made in this browser (pdf.js): photo faces
// and names stay on this device.

import { renderFrames, mountOffscreen, download } from '/js/video-export.js';
import { jpegPdf } from '/js/pdf.js';

const studio = window.pictogenStudio;
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => String(s || 'picture-book').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'picture-book';

// A landscape A4 page at about 145 dpi
const W = 1684, H = 1190;
const FONT = 'Nunito, system-ui, sans-serif';
// Each book's colours: the page, its frame, the title
const THEMES = {
  sunny: { label: '🌞 Sunny', page: '#fffaf0', frame: '#fcd34d', ink: '#3f2d1c', accent: '#f97316', sky: ['#fde68a', '#fffaf0'] },
  sky: { label: '☁️ Sky', page: '#f5fbff', frame: '#93c5fd', ink: '#1e3a5f', accent: '#2563eb', sky: ['#bfdbfe', '#f5fbff'] },
  meadow: { label: '🌿 Meadow', page: '#f7fdf4', frame: '#86efac', ink: '#1f3d2b', accent: '#16a34a', sky: ['#bbf7d0', '#f7fdf4'] },
  candy: { label: '🍬 Candy', page: '#fff7fb', frame: '#f9a8d4', ink: '#4a1d3a', accent: '#db2777', sky: ['#fbcfe8', '#fff7fb'] },
  night: { label: '🌙 Bedtime', page: '#1e1b4b', frame: '#a5b4fc', ink: '#eef2ff', accent: '#fbbf24', sky: ['#312e81', '#1e1b4b'] },
};

// ---------------------------------------------------------------------------------------------
// The pictures: one still per scene, at its best moment

/** Seeks every animation in the SVG to t seconds */
const seek = (svg, t) => svg.getAnimations({ subtree: true }).forEach((a) => { a.pause(); a.currentTime = t * 1000; });

/**
 * How much is showing at the current moment: every figure counts by how much of it is inside the
 * picture and how visible it is (a timeline figure by the pose it is in), a speech bubble a little
 */
function showing(svg) {
  const box = svg.getBoundingClientRect();
  let score = 0;
  for (const item of svg.querySelectorAll('.movable-item')) {
    const r = item.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const w = Math.max(0, Math.min(r.right, box.right) - Math.max(r.left, box.left));
    const h = Math.max(0, Math.min(r.bottom, box.bottom) - Math.max(r.top, box.top));
    const poses = [...item.querySelectorAll('.pg-timeline-pose')];
    const seen = poses.length ? Math.max(...poses.map((p) => +getComputedStyle(p).opacity)) : 1;
    score += ((w * h) / (r.width * r.height)) * seen * +getComputedStyle(item).opacity;
  }
  for (const b of svg.querySelectorAll('.pg-bubble, [data-bubble]')) score += 0.3 * +getComputedStyle(b).opacity;
  return score;
}

/** The moment to show (seconds): the one with the most showing, the later one when it's a tie */
function bestMoment(svg, duration) {
  const d = Math.max(1, duration || 5);
  let best = { t: d * 0.6, score: -1 };
  for (const f of [0.3, 0.45, 0.6, 0.72, 0.84, 0.95]) {
    const t = d * f;
    seek(svg, t);
    const score = showing(svg);
    if (score >= best.score - 0.05) best = { t, score };
  }
  return best.t;
}

/** A scene's still picture as a canvas (2x the scene's size) */
async function still(scene) {
  const { svg, remove } = mountOffscreen(scene.svg);
  try {
    const vb = svg.viewBox.baseVal;
    const w = vb?.width || 640, h = vb?.height || 360;
    const canvas = document.createElement('canvas');
    canvas.width = w * 2; canvas.height = h * 2;
    const ctx = canvas.getContext('2d');
    await new Promise((r) => requestAnimationFrame(() => r()));
    const t = bestMoment(svg, scene.duration);
    await renderFrames(svg, { duration: 1 / 30, fps: 30, start: t, ctx, box: { x: 0, y: 0, w: canvas.width, h: canvas.height }, onFrame: () => {} });
    return canvas;
  } finally {
    remove();
  }
}

// ---------------------------------------------------------------------------------------------
// Drawing the pages

function wrap(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Text in the largest size from `size` down that fits `maxLines` lines of `maxWidth` */
function fitLines(ctx, text, { weight = 800, size, min, maxWidth, maxLines }) {
  for (let s = size; ; s -= 2) {
    ctx.font = `${weight} ${s}px ${FONT}`;
    const lines = wrap(ctx, text, maxWidth);
    if (lines.length <= maxLines || s <= min) return { size: s, lines: lines.slice(0, maxLines) };
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function newPage(theme) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = theme.page;
  ctx.fillRect(0, 0, W, H);
  // A soft frame around the page, its corners rounded
  ctx.lineWidth = 10;
  ctx.strokeStyle = theme.frame;
  roundRect(ctx, 40, 40, W - 80, H - 80, 46);
  ctx.stroke();
  return { canvas, ctx };
}

/** A picture in the box (x, y, w, h), as large as fits, with rounded corners, a white mat and a shadow */
function framePicture(ctx, pic, x, y, w, h) {
  const k = Math.min(w / pic.width, h / pic.height);
  const pw = pic.width * k, ph = pic.height * k;
  const px = x + (w - pw) / 2, py = y + (h - ph) / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.22)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, px - 14, py - 14, pw + 28, ph + 28, 38);
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 26);
  ctx.clip();
  ctx.drawImage(pic, px, py, pw, ph);
  ctx.restore();
  return { x: px, y: py, w: pw, h: ph };
}

/** Little stars and dots scattered in the margins (the same each time for a book) */
function sprinkle(ctx, theme, seed, areas) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  ctx.save();
  for (const [x0, y0, x1, y1, n] of areas) {
    for (let i = 0; i < n; i++) {
      const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0), r = 7 + rnd() * 9;
      ctx.fillStyle = [theme.frame, theme.accent, theme.sky[0]][i % 3];
      ctx.globalAlpha = 0.85;
      if (i % 2) { ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill(); continue; }
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

function coverPage(book, pic) {
  const theme = THEMES[book.theme];
  const { canvas, ctx } = newPage(theme);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, theme.sky[0]);
  sky.addColorStop(0.6, theme.sky[1]);
  ctx.save();
  roundRect(ctx, 45, 45, W - 90, H - 90, 42);
  ctx.clip();
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  sprinkle(ctx, theme, book.title.length * 97 + 13, [[90, 80, W - 90, 150, 9], [90, 1030, 480, 1110, 5], [W - 480, 1030, W - 90, 1110, 5]]);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const t = fitLines(ctx, book.title, { weight: 900, size: 104, min: 60, maxWidth: W - 280, maxLines: 2 });
  ctx.fillStyle = theme.ink;
  t.lines.forEach((l, i) => ctx.fillText(l, W / 2, 230 + i * t.size * 1.12 - (t.lines.length - 1) * t.size * 0.3));
  const top = 230 + (t.lines.length - 1) * t.size * 0.82 + 60;
  const bottom = book.author ? H - 210 : H - 150;
  if (pic) framePicture(ctx, pic, 220, top, W - 440, bottom - top);
  if (book.author) {
    ctx.font = `800 52px ${FONT}`;
    ctx.fillStyle = theme.accent;
    ctx.fillText(`by ${book.author}`, W / 2, H - 120, W - 300);
  }
  return canvas;
}

function storyPage(book, pic, caption, n) {
  const theme = THEMES[book.theme];
  const { canvas, ctx } = newPage(theme);
  const text = String(caption || '').trim();
  // The words take as much room as they need (up to 3 lines); the picture the rest
  const words = text ? fitLines(ctx, text, { size: 58, min: 40, maxWidth: W - 300, maxLines: 3 }) : { lines: [], size: 0 };
  const wordsH = words.lines.length ? words.lines.length * words.size * 1.3 + 40 : 0;
  const pictureBox = { x: 150, y: 100, w: W - 300, h: H - 100 - 150 - wordsH };
  const p = pic ? framePicture(ctx, pic, pictureBox.x, pictureBox.y, pictureBox.w, pictureBox.h) : { y: pictureBox.y, h: pictureBox.h };
  if (words.lines.length) {
    ctx.font = `800 ${words.size}px ${FONT}`;
    ctx.fillStyle = theme.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const y0 = p.y + p.h + 44;
    words.lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * words.size * 1.3));
  }
  // The page number in a little circle
  ctx.fillStyle = theme.frame;
  ctx.beginPath();
  ctx.arc(W / 2, H - 84, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.ink;
  ctx.font = `900 30px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), W / 2, H - 82);
  return canvas;
}

function endPage(book) {
  const theme = THEMES[book.theme];
  const { canvas, ctx } = newPage(theme);
  sprinkle(ctx, theme, 4242, [[160, 200, W - 160, 380, 12], [160, 760, W - 160, 940, 12]]);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.ink;
  ctx.font = `900 150px ${FONT}`;
  ctx.fillText('The End', W / 2, H / 2 - 10);
  ctx.fillStyle = theme.accent;
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText('♥', W / 2, H / 2 + 120);
  ctx.globalAlpha = 0.55;
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText('Made with Toonaro', W / 2, H - 90);
  ctx.globalAlpha = 1;
  return canvas;
}

// The website demo (scripts/build-web.js --demo): the cover and the first two pages, then a page
// saying the whole book is in the full version
const DEMO = Boolean(window.__toonaroDemo);
const DEMO_PAGES = 2;
const DEMO_TEXT = {
  en: ['The whole book', 'is in the full version of Toonaro'],
  de: ['Das ganze Buch', 'gibt es in der Vollversion von Toonaro'],
  ar: ['الكتاب كاملًا', 'في النسخة الكاملة من تونارو'],
};
const pageLang = () => { const l = (document.documentElement.lang || 'en').slice(0, 2); return DEMO_TEXT[l] ? l : 'en'; };
function fullVersionPage(book) {
  const theme = THEMES[book.theme];
  const { canvas, ctx } = newPage(theme);
  sprinkle(ctx, theme, 777, [[160, 200, W - 160, 380, 10], [160, 760, W - 160, 940, 10]]);
  const [big, small] = DEMO_TEXT[pageLang()];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.ink;
  ctx.font = `900 96px ${FONT}`;
  ctx.fillText(big, W / 2, H / 2 - 60);
  ctx.font = `800 48px ${FONT}`;
  ctx.fillText(small, W / 2, H / 2 + 40);
  const contact = window.__toonaroDemo?.contact;
  if (contact) { ctx.fillStyle = theme.accent; ctx.font = `800 44px ${FONT}`; ctx.fillText(contact, W / 2, H / 2 + 130); }
  return canvas;
}

/**
 * The book's pages as canvases. book: { title, author, theme, cover (scene index), end }; scenes:
 * [{ svg, duration, caption }]; pictures: a cache of stills by scene index.
 */
async function makePages(book, scenes, pictures) {
  if (document.fonts?.load) await Promise.all([document.fonts.load(`900 40px Nunito`), document.fonts.load(`800 40px Nunito`)]).catch(() => {});
  for (let i = 0; i < scenes.length; i++) if (!pictures[i] && (!DEMO || i < DEMO_PAGES || i === book.cover)) pictures[i] = await still(scenes[i]);
  const shown = DEMO ? scenes.slice(0, DEMO_PAGES) : scenes;
  return [
    coverPage(book, pictures[book.cover] ?? pictures[0]),
    ...shown.map((sc, i) => storyPage(book, pictures[i], sc.caption, i + 1)),
    ...(DEMO ? [fullVersionPage(book)] : book.end ? [endPage(book)] : []),
  ];
}

// ---------------------------------------------------------------------------------------------
// The dialog

const dialog = document.createElement('dialog');
dialog.className = 'worksheet-dialog book-dialog';
dialog.innerHTML = `
  <form method="dialog" class="ws-form">
    <div class="ws-head"><strong>📖 Picture book</strong><button class="ws-close" value="close" aria-label="Close">✕</button></div>
    <div class="ws-body">
      <div class="ws-fields">
        <label>Title<input id="bk-title" maxlength="60" placeholder="My Story"></label>
        <label>By<input id="bk-author" maxlength="40" placeholder="(your name, if you like)"></label>
        <label>Colours<select id="bk-theme">${Object.entries(THEMES).map(([k, t]) => `<option value="${k}">${t.label}</option>`).join('')}</select></label>
        <label>Picture on the cover<select id="bk-cover"></select></label>
        <label class="ws-check"><input type="checkbox" id="bk-end" checked> Finish with “The End”</label>
        <p class="ws-note">One page for each scene of your clip, with its caption. Change a caption in “Your clip” and open the book again. The book is made on this device; nothing is uploaded.</p>
        <div class="ws-actions">
          <button type="button" class="btn-generate" id="bk-pdf">⬇ Download PDF</button>
          <button type="button" class="btn-action" id="bk-print">🖨 Print</button>
        </div>
      </div>
      <div class="bk-preview" id="bk-preview" aria-live="polite">Drawing the pages…</div>
    </div>
  </form>`;
document.body.appendChild(dialog);

const $ = (id) => dialog.querySelector(`#${id}`);
let scenes = [], pictures = [], pages = [], making = 0, timer = null;

const settings = () => ({
  title: $('bk-title').value.trim() || $('bk-title').placeholder,
  author: $('bk-author').value.trim(),
  theme: $('bk-theme').value,
  cover: +$('bk-cover').value || 0,
  end: $('bk-end').checked,
});

async function refresh() {
  const n = ++making;
  try {
    const made = await makePages(settings(), scenes, pictures);
    if (n !== making) return;
    pages = made;
    $('bk-preview').innerHTML = pages.map((c, i) => `<figure class="ws-page bk-page"><img class="ws-paper" src="${c.toDataURL('image/jpeg', 0.7)}" alt="Page ${i + 1}"><figcaption>${i === 0 ? 'Cover' : i < pages.length - 1 || (!DEMO && !settings().end) ? `Page ${i}` : DEMO ? '…' : 'The End'}</figcaption></figure>`).join('');
  } catch (err) {
    if (n === making) $('bk-preview').innerHTML = `<div class="ws-wait">Could not draw the book: ${esc(err.message)}</div>`;
  }
}
const later = () => { clearTimeout(timer); timer = setTimeout(refresh, 350); };
for (const id of ['bk-theme', 'bk-cover', 'bk-end']) $(id).addEventListener('change', refresh);
for (const id of ['bk-title', 'bk-author']) $(id).addEventListener('input', later);

async function busy(btn, fn) {
  if (btn.disabled) return;
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ One moment…';
  try { await fn(); } catch (err) { studio.showToast(`Sorry: ${err.message}`); } finally { btn.disabled = false; btn.textContent = label; }
}

async function jpegs() {
  if (!pages.length) await refresh();
  const out = [];
  for (const c of pages) {
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
    out.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), width: c.width, height: c.height, url: c.toDataURL('image/jpeg', 0.9) });
  }
  return out;
}

$('bk-pdf').addEventListener('click', (e) => busy(e.currentTarget, async () => {
  const title = settings().title;
  const blob = jpegPdf(await jpegs(), { title, landscape: true });
  download(blob, `${slug(title)}.pdf`);
  studio.showToast(`Picture book saved (${pages.length} pages)`);
}));

$('bk-print').addEventListener('click', (e) => busy(e.currentTarget, async () => {
  const imgs = await jpegs();
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  frame.contentDocument.write(`<!doctype html><html><head><title>${esc(settings().title)}</title><style>@page { size: A4 landscape; margin: 0; } html, body { margin: 0; } img { display: block; width: 297mm; height: 210mm; page-break-after: always; }</style></head><body>${imgs.map((p) => `<img src="${p.url}">`).join('')}</body></html>`);
  frame.contentDocument.close();
  await new Promise((r) => setTimeout(r, 300));
  frame.contentWindow.focus();
  frame.contentWindow.print();
  setTimeout(() => frame.remove(), 60000);
}));

/** Opens the picture book for the clip that is playing */
export function openBook() {
  const story = studio.getStory();
  if (!story.scenes?.length) { studio.showToast('Play a clip first: its scenes become the pages'); return; }
  scenes = story.scenes.map((sc) => ({ svg: sc.svg, duration: sc.duration, caption: sc.caption }));
  pictures = [];
  pages = [];
  $('bk-title').value = '';
  $('bk-title').placeholder = story.title && !/^(Kids Animated Story Clip|My Clip)$/.test(story.title) ? story.title : 'My Story';
  $('bk-cover').innerHTML = scenes.map((sc, i) => `<option value="${i}">Scene ${i + 1}${sc.caption ? `: ${esc(sc.caption.slice(0, 28))}${sc.caption.length > 28 ? '…' : ''}` : ''}</option>`).join('');
  $('bk-preview').innerHTML = '<div class="ws-wait">Drawing the pages…</div>';
  // (the website demo ends with the page about the full version, not "The End")
  if (DEMO) $('bk-end').closest('label').hidden = true;
  dialog.showModal();
  refresh();
}
window.pictogenBook = { open: openBook };
document.getElementById('story-btn-book')?.addEventListener('click', openBook);
