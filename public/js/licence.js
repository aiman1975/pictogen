// The licence in the full app (scripts/build-web.js sets window.__toonaroLicensing once the owner's
// public key is in public/js/licence-key.js): a licence key, pasted once, unlocks the full version
// on this device; without one the app is the free version (the "demo" mark and short texts, as on
// the website: /web/demo.js). The key is checked here, offline (src/licence.js); nothing is sent.
// 🔑 next to the language switch shows the licence, or takes a key.

const STORE = 'toonaro.licence.v1', NOTE = 'toonaro.licence.note';
const T = {
  en: {
    btnOn: '✅ Licensed', btnOff: '🔑 Licence', title: 'Your Toonaro licence',
    free: 'This is the free version: what you make carries a small "demo" mark, and texts are short. Paste your licence key to unlock the full version on this device.',
    paste: 'Your licence key', activate: 'Unlock the full version', remove: 'Remove the licence from this device', close: 'Close',
    to: 'Licensed to', types: { family: 'Family licence', school: 'School licence', business: 'Business licence' }, seats: (n) => `${n} seats`, until: (d) => `until ${d}`, forever: 'no end date',
    ask: 'No licence yet? Write to', ok: 'Unlocked - welcome!',
    why: { 'not-a-key': 'That is not a Toonaro licence key. Copy the whole key from your e-mail.', 'not-genuine': 'This licence key is not genuine, or it was changed.', expired: 'This licence has ended. Write to us for a new one.', 'not-set-up': 'Licences are not set up in this copy.', error: 'The key could not be checked here.' },
  },
  de: {
    btnOn: '✅ Lizenziert', btnOff: '🔑 Lizenz', title: 'Deine Toonaro-Lizenz',
    free: 'Das ist die kostenlose Version: Was du machst, trägt ein kleines „Demo“-Zeichen, und Texte sind kurz. Füge deinen Lizenzschlüssel ein, um die Vollversion auf diesem Gerät freizuschalten.',
    paste: 'Dein Lizenzschlüssel', activate: 'Vollversion freischalten', remove: 'Lizenz von diesem Gerät entfernen', close: 'Schließen',
    to: 'Lizenziert für', types: { family: 'Familienlizenz', school: 'Schullizenz', business: 'Unternehmenslizenz' }, seats: (n) => `${n} Plätze`, until: (d) => `bis ${d}`, forever: 'ohne Enddatum',
    ask: 'Noch keine Lizenz? Schreib an', ok: 'Freigeschaltet – willkommen!',
    why: { 'not-a-key': 'Das ist kein Toonaro-Lizenzschlüssel. Kopiere den ganzen Schlüssel aus deiner E-Mail.', 'not-genuine': 'Dieser Lizenzschlüssel ist nicht echt oder wurde verändert.', expired: 'Diese Lizenz ist abgelaufen. Schreib uns für eine neue.', 'not-set-up': 'In dieser Kopie sind keine Lizenzen eingerichtet.', error: 'Der Schlüssel konnte hier nicht geprüft werden.' },
  },
  ar: {
    btnOn: '✅ مرخَّص', btnOff: '🔑 الترخيص', title: 'ترخيص تونارو الخاص بك',
    free: 'هذه النسخة المجانية: ما تصنعه يحمل علامة «تجريبي» صغيرة والنصوص قصيرة. الصق مفتاح الترخيص لفتح النسخة الكاملة على هذا الجهاز.',
    paste: 'مفتاح الترخيص', activate: 'افتح النسخة الكاملة', remove: 'أزل الترخيص من هذا الجهاز', close: 'إغلاق',
    to: 'مرخَّص لـ', types: { family: 'ترخيص عائلي', school: 'ترخيص مدرسي', business: 'ترخيص للأعمال' }, seats: (n) => `${n} مقاعد`, until: (d) => `حتى ${d}`, forever: 'بلا تاريخ انتهاء',
    ask: 'لا تملك ترخيصًا بعد؟ راسل', ok: 'تم الفتح – أهلًا بك!',
    why: { 'not-a-key': 'هذا ليس مفتاح ترخيص تونارو. انسخ المفتاح كاملًا من بريدك.', 'not-genuine': 'مفتاح الترخيص هذا غير أصلي أو تم تغييره.', expired: 'انتهى هذا الترخيص. راسلنا للحصول على ترخيص جديد.', 'not-set-up': 'التراخيص غير مُعدّة في هذه النسخة.', error: 'تعذّر فحص المفتاح هنا.' },
  },
};
const lang = () => { const l = (document.documentElement.lang || 'en').slice(0, 2); return T[l] ? l : 'en'; };
const t = (k) => T[lang()][k];
const read = () => { try { return localStorage.getItem(STORE); } catch { return null; } };
const write = (v) => { try { if (v) localStorage.setItem(STORE, v); else localStorage.removeItem(STORE); } catch { /* (not kept) */ } };

async function check(text) {
  try {
    const [{ PUBLIC_KEY }, { verifyLicence }] = await Promise.all([import('/js/licence-key.js'), import('/src/licence.js')]);
    return await verifyLicence(text, PUBLIC_KEY);
  } catch { return { ok: false, reason: 'error' }; }
}

let licence = null;
const ready = (async () => {
  if (!window.__toonaroLicensing) return null;
  const stored = read();
  if (!stored) return null;
  const r = await check(stored);
  if (r.ok) { licence = r.licence; window.__toonaroLicence = licence; return licence; }
  // (a key that no longer holds - ended, or not genuine: the free version again, and why)
  write(null);
  try { sessionStorage.setItem(NOTE, r.reason); } catch { /* */ }
  location.reload();
  return 'reloading';
})();

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let dialog = null;
function openDialog(message) {
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.className = 'tn-licence no-i18n';
    document.body.appendChild(dialog);
    const css = document.createElement('style');
    css.textContent = '.tn-licence{margin:auto;inset:0;border:0;border-radius:20px;padding:22px;max-width:520px;width:calc(100% - 32px);box-shadow:0 20px 60px rgba(15,23,42,.3);font-family:Nunito,"Baloo Bhaijaan 2",sans-serif;color:#1e293b}'
      + '.tn-licence::backdrop{background:rgba(15,23,42,.45)}.tn-licence h2{margin:0 0 10px;font-size:1.3rem}.tn-licence p{margin:0 0 12px;line-height:1.5;color:#475569}'
      + '.tn-licence textarea{width:100%;box-sizing:border-box;min-height:96px;font:600 .85rem ui-monospace,monospace;padding:10px;border:2px solid #e2e8f0;border-radius:12px;resize:vertical}'
      + '.tn-licence .row{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.tn-licence button{font:inherit;font-weight:900;border-radius:999px;padding:9px 18px;cursor:pointer;border:2px solid #e2e8f0;background:#fff}'
      + '.tn-licence button.go{border:0;color:#fff;background:linear-gradient(135deg,#2563eb,#7c3aed)}.tn-licence .msg{font-weight:800;color:#b91c1c;min-height:1.4em}.tn-licence .msg.good{color:#047857}'
      + '.tn-licence .card{background:#f5f3ff;border:1px solid #ddd6fe;border-radius:14px;padding:12px 14px;margin-bottom:12px;font-weight:700}'
      + '.tn-licence-btn{font:inherit;font-size:.78rem;font-weight:800;padding:4px 10px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;color:#475569;cursor:pointer;white-space:nowrap}';
    document.head.appendChild(css);
  }
  const contact = window.__toonaroDemo?.contact || 'info@toonaro.com';
  dialog.dir = lang() === 'ar' ? 'rtl' : 'ltr';
  if (licence) {
    const bits = [t('types')[licence.type] || licence.type, licence.seats ? t('seats')(licence.seats) : null, licence.until ? t('until')(licence.until) : t('forever')].filter(Boolean);
    dialog.innerHTML = `<h2>${esc(t('title'))}</h2><div class="card">${esc(t('to'))} <b>${esc(licence.to)}</b><br>${esc(bits.join(' · '))}</div>
      <div class="row"><button type="button" data-do="close" class="go">${esc(t('close'))}</button><button type="button" data-do="remove">${esc(t('remove'))}</button></div>`;
  } else {
    dialog.innerHTML = `<h2>${esc(t('title'))}</h2><p>${esc(t('free'))}</p><textarea aria-label="${esc(t('paste'))}" placeholder="TNR1.…" spellcheck="false"></textarea>
      <div class="msg" role="status">${message ? esc(message) : ''}</div>
      <div class="row"><button type="button" data-do="activate" class="go">${esc(t('activate'))}</button><button type="button" data-do="close">${esc(t('close'))}</button></div>
      <p style="margin:14px 0 0">${esc(t('ask'))} <a href="mailto:${esc(contact)}?subject=Toonaro%20licence">${esc(contact)}</a></p>`;
  }
  dialog.onclick = async (e) => {
    const act = e.target.closest?.('[data-do]')?.dataset.do;
    if (act === 'close') dialog.close();
    if (act === 'remove') { write(null); location.reload(); }
    if (act === 'activate') {
      const text = dialog.querySelector('textarea').value;
      const msg = dialog.querySelector('.msg');
      const r = await check(text);
      if (r.ok) { write(text.replace(/\s+/g, '')); msg.className = 'msg good'; msg.textContent = t('ok'); setTimeout(() => location.reload(), 700); } else { msg.className = 'msg'; msg.textContent = t('why')[r.reason] || t('why').error; }
    }
  };
  if (!dialog.open) dialog.showModal();
}

function addButton() {
  const host = document.querySelector('[data-lang-switch]');
  if (!host || document.querySelector('.tn-licence-btn')) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'tn-licence-btn no-i18n';
  b.addEventListener('click', () => openDialog());
  host.insertAdjacentElement('afterend', b);
  const label = () => { b.textContent = licence ? t('btnOn') : t('btnOff'); b.title = t('title'); };
  label();
  new MutationObserver(label).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
}

if (window.__toonaroLicensing) {
  const start = async () => {
    if ((await ready) === 'reloading') return;
    addButton();
    // (a key that stopped holding: said once)
    let note = null;
    try { note = sessionStorage.getItem(NOTE); sessionStorage.removeItem(NOTE); } catch { /* */ }
    if (note) openDialog(t('why')[note] || t('why').error);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
}

window.pictogenLicence = { ready, get: () => licence, open: () => openDialog() };
