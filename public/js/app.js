// The installable app (the built site only, scripts/build-web.js): the offline worker (/sw.js) keeps
// every file of the site on this device, so Toonaro opens and works with no internet; buttons with
// data-install appear where the browser can install it as an app.

const canWork = 'serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname));
const buttons = () => document.querySelectorAll('[data-install]');
let offer = null;

if (canWork) {
  navigator.serviceWorker.register('/sw.js').then((reg) => {
    // Ready for offline use: said once, the first time everything is kept
    navigator.serviceWorker.ready.then(() => {
      let told = false;
      try { told = localStorage.getItem('pictogen.offline') === '1'; } catch { /* */ }
      if (told || !reg.active) return;
      try { localStorage.setItem('pictogen.offline', '1'); } catch { /* */ }
      window.pictogenStudio?.showToast?.('✅ Ready to use offline: Toonaro now works without the internet');
    });
  }).catch(() => {});
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  offer = e;
  buttons().forEach((b) => { b.hidden = false; });
});
window.addEventListener('appinstalled', () => {
  offer = null;
  buttons().forEach((b) => { b.hidden = true; });
});
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-install]');
  if (!b || !offer) return;
  offer.prompt();
  await offer.userChoice.catch(() => null);
  offer = null;
  buttons().forEach((x) => { x.hidden = true; });
});
