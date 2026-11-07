// The studio in other languages: every text a person sees - what the page says, what panels add
// later, tooltips, placeholders, the example prompts - looked up in the language's dictionary
// (public/js/i18n-de.js) and shown in it. A sentence with bold words or a link in it is looked up
// whole, so it reads as a sentence; an element the studio updates itself keeps its own nodes, only
// its words change. English is the page as written. The language: the one picked (EN / DE in the
// header), else the browser's, remembered in this browser.

const KEY = 'pictogen.lang.v1';
const LANGS = { de: () => import('./i18n-de.js'), ar: () => import('./i18n-ar.js') };
// (languages written right to left: the page is laid out from the right; drawings stay as drawn)
const RTL = new Set(['ar']);
const NAMES = { en: 'English', de: 'Deutsch', ar: 'العربية' };
const INLINE = new Set(['B', 'STRONG', 'I', 'EM', 'A', 'CODE', 'SPAN', 'BR', 'KBD', 'SMALL', 'SUB', 'SUP', 'MARK', 'U']);
const ATTRS = ['title', 'placeholder', 'aria-label', 'alt', 'data-prompt'];
// (what people wrote, and drawings: never translated)
const SKIP = 'svg, script, style, textarea, input, select.no-i18n, .no-i18n, .sr-caption, [contenteditable]';

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const hasWords = (s) => /\p{L}{2}/u.test(s);

/** The language picked, else the browser's when there is a dictionary for it, else English */
export function currentLang() {
  let picked = null;
  try { picked = localStorage.getItem(KEY); } catch { /* not remembered */ }
  if (picked) return picked;
  const nav = (navigator.languages?.[0] ?? navigator.language ?? 'en').slice(0, 2).toLowerCase();
  return LANGS[nav] ? nav : 'en';
}

/** Picks a language (the page is shown in it again) */
export function setLang(code) {
  try { localStorage.setItem(KEY, code); } catch { /* not remembered */ }
  location.reload();
}

// An element whose words may be replaced whole: only words and inline marks inside, none of which
// the studio keeps hold of (an id, a form field, a button of its own)
function wholeOK(el) {
  for (const c of el.children) {
    if (!INLINE.has(c.tagName) || c.id || c.matches('input, select, textarea, button, svg') || !wholeOK(c)) return false;
  }
  return true;
}
const looksInline = (el) => [...el.children].every((c) => INLINE.has(c.tagName));

/**
 * The keys of what is shown under `root`, as the dictionary has them: { html: [...], text: [...],
 * attr: [...] } (the collector of texts to translate uses this too)
 */
export function keysOf(root = document.body) {
  const out = { html: new Set(), text: new Set(), attr: new Set() };
  const visit = (el) => {
    if (el.closest?.(SKIP)) return;
    for (const a of ATTRS) { const v = el.getAttribute?.(a); if (v && hasWords(v)) out.attr.add(norm(v)); }
    if (el.children.length && looksInline(el) && wholeOK(el) && hasWords(el.textContent)) {
      out.html.add(norm(el.innerHTML));
      return;
    }
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { const t = norm(n.nodeValue); if (t && hasWords(t)) out.text.add(t); } else if (n.nodeType === 1) visit(n);
    }
  };
  visit(root);
  if (root === document.body && hasWords(document.title)) out.text.add(norm(document.title));
  return { html: [...out.html], text: [...out.text], attr: [...out.attr] };
}

let dict = null;
// A text from the dictionary: as it is, else by a pattern ("Scene 3" -> "Szene 3")
function lookup(s) {
  if (!dict || !s) return null;
  if (dict.texts[s] !== undefined) return dict.texts[s];
  for (const [re, to] of dict.patterns) if (re.test(s)) return s.replace(re, to);
  return null;
}

/** Shows `root` in the language */
export function translate(root = document.body) {
  if (!dict) return;
  const visit = (el) => {
    if (el.nodeType !== 1 || el.closest(SKIP)) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v && hasWords(v)) { const t = lookup(norm(v)); if (t != null && t !== v) el.setAttribute(a, t); }
    }
    if (el.children.length && looksInline(el) && wholeOK(el) && hasWords(el.textContent)) {
      const t = lookup(norm(el.innerHTML));
      if (t != null) { if (el.innerHTML !== t) el.innerHTML = t; return; }
    }
    for (const n of [...el.childNodes]) {
      if (n.nodeType === 3) {
        const raw = n.nodeValue, t = norm(raw);
        if (t && hasWords(t)) {
          const to = lookup(t);
          // (its spaces around kept: "Draw " stays apart from what follows)
          if (to != null && to !== t) n.nodeValue = `${raw.match(/^\s*/)[0]}${to}${raw.match(/\s*$/)[0]}`;
        }
      } else if (n.nodeType === 1) visit(n);
    }
  };
  visit(root);
}

/** Starts: the dictionary of the language, the page in it, and whatever is added later */
export async function start() {
  const lang = currentLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL.has(lang) ? 'rtl' : 'ltr';
  // (the switch: EN / DE, wherever the page has a place for it)
  for (const box of document.querySelectorAll('[data-lang-switch]')) {
    box.innerHTML = ['en', ...Object.keys(LANGS)].map((c) => `<button type="button" class="lang-btn${c === lang ? ' on' : ''}" data-lang="${c}" aria-pressed="${c === lang}" title="${NAMES[c] ?? c}">${c.toUpperCase()}</button>`).join('');
    box.addEventListener('click', (e) => { const b = e.target.closest('[data-lang]'); if (b && b.dataset.lang !== lang) setLang(b.dataset.lang); });
  }
  if (!LANGS[lang]) return;
  const mod = await LANGS[lang]();
  dict = { texts: mod.default.texts, patterns: (mod.default.patterns ?? []).map(([re, to]) => [new RegExp(`^${re}$`, 'u'), to]) };
  if (hasWords(document.title)) document.title = lookup(norm(document.title)) ?? document.title;
  translate(document.body);
  // (what panels, toasts and lists add later: translated as it comes)
  let busy = false;
  new MutationObserver((records) => {
    if (busy) return;
    busy = true;
    try {
      for (const r of records) {
        if (r.type === 'characterData') { const n = r.target; if (n.parentElement && !n.parentElement.closest(SKIP)) { const t = norm(n.nodeValue); const to = t && lookup(t); if (to && to !== t) n.nodeValue = to; } } else if (r.type === 'attributes') translate(r.target);
        else for (const n of r.addedNodes) { if (n.nodeType === 1) translate(n); else if (n.nodeType === 3 && n.parentElement) translate(n.parentElement); }
      }
    } finally { busy = false; }
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

window.pictogenI18n = { start, translate, keysOf, currentLang, setLang, t: (s) => lookup(norm(s)) ?? s };
start();
