// The promo as one HTML page (1280x720) that can be put at any moment in time: window.seek(t)
// shows the slide(s) on screen at t and puts every animation exactly where it is at that moment, so
// frames are rendered one by one, never recorded in real time.
import { ANIMATION_CSS } from '../../src/core/render.js';

const CSS = `
@font-face { font-family: 'Nunito'; src: url('FONT_URL') format('woff2'); font-weight: 200 1000; }
* { box-sizing: border-box; }
html, body { margin: 0; width: 1280px; height: 720px; overflow: hidden; background: #0b1020; color: #fff; font-family: 'Nunito', sans-serif; }
#bg { position: absolute; inset: 0; overflow: hidden; background: radial-gradient(1300px 760px at 50% 115%, #1e1b4b 0%, #0b1020 62%); }
.blob { position: absolute; width: 640px; height: 640px; border-radius: 50%; filter: blur(90px); opacity: .42; }
.slide { position: absolute; inset: 0; display: none; }
.head { position: absolute; left: 64px; top: 44px; right: 64px; }
.head.narrow { right: auto; width: 500px; top: 120px; }
.kicker { font-weight: 800; font-size: 15px; letter-spacing: .22em; text-transform: uppercase; color: #93c5fd; }
h1 { margin: 8px 0 0; font-weight: 900; font-size: 50px; line-height: 1.08; letter-spacing: -.02em; }
.sub { margin: 10px 0 0; font-size: 21px; color: #cbd5e1; font-weight: 600; }
.quote { position: absolute; left: 64px; top: 168px; font-size: 21px; font-weight: 800; color: #fde68a; }
.card { position: absolute; border-radius: 16px; overflow: hidden; background: #fff; box-shadow: 0 24px 60px rgb(0 0 0 / .45), 0 0 0 1px rgb(255 255 255 / .1); }
.cell .card, .grid3 .card { position: relative; }
.card svg { display: block; width: 100%; height: auto; }
.card.fit { height: 186px; background: #f8fafc; }
.card.fit svg { height: 100%; }
.label { margin-top: 8px; font-weight: 800; font-size: 16px; color: #e2e8f0; text-align: center; }
.label.dark { color: #334155; margin-top: 2px; }
.rise { animation: rise .8s cubic-bezier(.2, .8, .2, 1) both; animation-delay: var(--d, 0s); }
@keyframes rise { from { opacity: 0; transform: translateY(22px); } }
.pop { animation: pop .6s cubic-bezier(.34, 1.56, .64, 1) both; animation-delay: var(--d, 0s); }
@keyframes pop { from { opacity: 0; transform: scale(.55); } }
/* intro / outro */
.center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.logo { width: 132px; height: 132px; filter: drop-shadow(0 18px 40px rgb(99 102 241 / .5)); }
.brand { font-weight: 900; font-size: 96px; letter-spacing: -.03em; line-height: 1.05; margin-top: 18px; }
.brand span { display: inline-block; }
.tagline { margin: 14px 0 0; font-size: 34px; font-weight: 800; color: #fde68a; }
.floater { position: absolute; width: 84px; height: 84px; opacity: .9; }
.bob { animation: bob 3.2s ease-in-out infinite alternate; }
@keyframes bob { from { transform: translateY(-8px) rotate(-5deg); } to { transform: translateY(8px) rotate(5deg); } }
.parade { position: absolute; left: 0; right: 0; bottom: 0; height: 130px; }
.walker { position: absolute; bottom: 8px; left: 0; height: 118px; animation: walk 9.5s linear infinite; }
@keyframes walk { from { transform: translateX(-160px); } to { transform: translateX(1440px); } }
/* typing */
.promptbar { position: absolute; left: 190px; top: 190px; width: 900px; height: 66px; background: #fff; border-radius: 16px; display: flex; align-items: center;
  padding: 0 10px 0 24px; color: #0f172a; font-size: 25px; font-weight: 700; box-shadow: 0 18px 50px rgb(0 0 0 / .4); }
.caret { width: 3px; height: 32px; background: #2563eb; margin-left: 2px; }
.go { margin-left: auto; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #fff; padding: 11px 22px; border-radius: 12px; font-weight: 800; font-size: 20px; }
/* grids */
.grid4 { position: absolute; left: 64px; top: 212px; width: 1152px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px 16px; }
.grid5 { position: absolute; left: 64px; top: 232px; width: 1152px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 18px; }
.grid3 { position: absolute; left: 121px; top: 212px; width: 1038px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px 24px; }
.face { background: #f8fafc; border-radius: 18px; padding: 6px 0 10px; text-align: center; box-shadow: 0 14px 34px rgb(0 0 0 / .35); }
.face svg { width: 132px; height: 132px; }
.stage { background: linear-gradient(#e0f2fe 0%, #f0fdf4 72%, #bbf7d0 72%); border-radius: 18px; padding: 8px 0 8px; text-align: center; box-shadow: 0 14px 34px rgb(0 0 0 / .35); }
.stage svg { height: 142px; width: 100%; }
/* stories */
.steps { position: absolute; left: 816px; top: 252px; width: 400px; margin: 0; padding: 0; }
.steps li { list-style: none; padding: 13px 16px; border-radius: 14px; background: rgb(255 255 255 / .06); margin-bottom: 12px; font-size: 22px; font-weight: 800; color: #94a3b8;
  border: 1px solid rgb(255 255 255 / .08); }
.steps li b { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: rgb(255 255 255 / .12); margin-right: 12px; font-size: 16px; }
.steps li.done { color: #e2e8f0; }
.steps li.active { background: #fde68a; color: #0f172a; border-color: #fde68a; }
.steps li.active b { background: #0f172a; color: #fde68a; }
.also { position: absolute; left: 816px; top: 560px; width: 400px; font-size: 17px; color: #cbd5e1; font-weight: 600; }
.also i { color: #fde68a; font-style: normal; font-weight: 800; }
.caption { position: absolute; font-size: 18px; font-weight: 700; color: #e2e8f0; text-align: center; }
/* studio */
.points { margin: 26px 0 0; padding: 0; }
.points li { list-style: none; position: relative; padding-left: 30px; margin-bottom: 16px; font-size: 21px; font-weight: 700; color: #e2e8f0; }
.points li::before { content: ''; position: absolute; left: 4px; top: 9px; width: 12px; height: 12px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); }
.browser { position: absolute; border-radius: 14px; overflow: hidden; background: #fff; box-shadow: 0 30px 70px rgb(0 0 0 / .55), 0 0 0 1px rgb(255 255 255 / .12); }
.browser .bar { height: 30px; background: #e2e8f0; display: flex; align-items: center; gap: 7px; padding: 0 12px; }
.browser .bar i { width: 11px; height: 11px; border-radius: 50%; background: #f87171; }
.browser .bar i:nth-child(2) { background: #fbbf24; } .browser .bar i:nth-child(3) { background: #34d399; }
.browser .bar span { margin-left: 14px; color: #475569; font-size: 13px; font-weight: 700; }
.screen { position: relative; overflow: hidden; background: #f8fafc; }
.zoomer { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
.shot { width: 100%; height: 100%; display: block; }
.dropdown { position: absolute; display: none; background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 10px 24px rgb(0 0 0 / .25); padding: 3px 0; color: #0f172a; font-size: 11px; font-weight: 600; }
.dropdown div { padding: 3px 10px; height: 20px; }
.dropdown div.hi { background: #2563eb; color: #fff; }
.cursor { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
.cursor svg { position: relative; z-index: 1; filter: drop-shadow(0 2px 3px rgb(0 0 0 / .35)); }
.ripple { position: absolute; left: -16px; top: -16px; width: 32px; height: 32px; border-radius: 50%; border: 3px solid #2563eb; opacity: 0; }
/* export */
.formats { position: absolute; left: 64px; top: 230px; width: 1152px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 18px; }
.format { height: 150px; border-radius: 20px; background: linear-gradient(160deg, rgb(255 255 255 / .12), rgb(255 255 255 / .04)); border: 1px solid rgb(255 255 255 / .16);
  display: flex; flex-direction: column; align-items: center; justify-content: center; }
.format b { font-size: 44px; font-weight: 900; background: linear-gradient(135deg, #93c5fd, #c4b5fd); -webkit-background-clip: text; background-clip: text; color: transparent; }
.format span { color: #cbd5e1; font-weight: 700; font-size: 17px; margin-top: 4px; }
.facts { position: absolute; left: 64px; top: 430px; width: 1152px; display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; }
.facts span { padding: 12px 20px; border-radius: 999px; background: rgb(253 230 138 / .12); border: 1px solid rgb(253 230 138 / .35); color: #fde68a; font-weight: 800; font-size: 20px; }
`;

const RUNTIME = `
const SLIDES = __SLIDES__;
const DATA = __DATA__;
const ease = (x) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
const lerp = (a, b, k) => a + (b - a) * k;
/** Value of piecewise keyframes [[t, ...values]] at time t, eased between keys */
function keyed(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [a, b] = [keys[i - 1], keys[i]], k = (t - a[0]) / (b[0] - a[0]);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      return a.slice(1).map((v, j) => lerp(v, b[j + 1], e));
    }
  }
  return keys[keys.length - 1].slice(1);
}

const HOOKS = {
  typing(t, el) {
    const d = DATA.typing;
    const n = d.keys.filter((k) => k <= t).length;
    el.querySelector('.typed').textContent = d.text.slice(0, n);
    el.querySelector('.caret').style.opacity = t < d.press + 0.4 && Math.floor(t * 2.2) % 2 === 0 ? 1 : n < d.text.length && n > 0 ? 1 : 0;
    const go = el.querySelector('.go');
    const p = t - d.press;
    go.style.transform = p > 0 && p < 0.16 ? 'scale(.9)' : 'none';
    go.style.boxShadow = p > 0 && p < 0.9 ? '0 0 0 ' + (8 * (1 - p / 0.9)) + 'px rgb(139 92 246 / ' + (0.5 * (1 - p / 0.9)) + ')' : 'none';
  },
  styles(t, el) {
    el.querySelector('.gridA').style.opacity = t < 3.55 ? 1 : Math.max(0, 1 - (t - 3.55) / 0.35);
  },
  stories(t, el) {
    const d = DATA.stories, st = t - d.at;
    el.querySelectorAll('.steps li').forEach((li, i) => {
      const [t0, t1] = d.beats[i];
      li.classList.toggle('active', st >= t0 && st < t1);
      li.classList.toggle('done', st >= t1);
    });
  },
  async studio(t, el) {
    const { studio: s, w, h } = DATA.studio;
    const f = s.frames, fps = s.fps;
    const pick = (list, from) => list[Math.max(0, Math.min(list.length - 1, Math.floor((t - from) * fps)))];
    const file = t < 2.65 ? pick(f.A, 0.4) : t < 4.8 ? f.B : t < 7.85 ? pick(f.C, 4.8) : f.D;
    const img = el.querySelector('.shot');
    if (img.dataset.file !== file) { img.dataset.file = file; img.src = 'studio/' + file; await img.decode().catch(() => {}); }
    // Camera on the screen: zoom in on the step editor, back out, then down to the clip tray
    const screenH = Math.min(h, 590);
    // Zoom z with box b at (sx, sy) of the screen, never showing past the screenshot's edges
    const at = (b, sx, sy, z) => [z, Math.min(0, Math.max(w - w * z, sx * w - b.x * w * z)), Math.min(0, Math.max(screenH - h * z, sy * screenH - b.y * h * z))];
    const B = s.boxes;
    const keys = [[0, 1, 0, 0], [2.7, 1, 0, 0], [3.35, ...at(B.does, 0.45, 0.55, 1.55)], [4.85, ...at(B.does, 0.45, 0.55, 1.55)], [5.5, 1, 0, 0],
      [6.9, 1, 0, 0], [7.5, ...at(B.add, 0.75, 0.8, 1.3)], [10, ...at(B.add, 0.75, 0.8, 1.3)]];
    const [z, tx, ty] = keyed(keys, t);
    el.querySelector('.zoomer').style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + z + ')';
    // The dropdown of the "Does" menu
    const dd = el.querySelector('.dropdown');
    const ddOn = t >= 3.95 && t < 4.8;
    dd.style.display = ddOn ? 'block' : 'none';
    const ddLeft = (B.does.x - B.does.w / 2) * w, ddTop = (B.does.y + B.does.h / 2) * h + 1;
    dd.style.left = ddLeft + 'px'; dd.style.top = ddTop + 'px'; dd.style.width = Math.max(B.does.w * w, 90) + 'px';
    dd.querySelectorAll('div').forEach((o, i) => o.classList.toggle('hi', i === (t < 4.35 ? 1 : 2)));
    const jumpsAt = [(B.does.x - B.does.w / 4), (ddTop + 3 + 2.5 * 20) / h];
    // The pointer
    const P = (b) => [b.x, b.y];
    const path = [[0, 0.92, 1.08], [1.1, 0.8, 0.9], [2.35, ...P(B.step)], [3.0, ...P(B.step)], [3.8, ...P(B.does)], [4.0, ...P(B.does)], [4.45, ...jumpsAt], [5.2, ...jumpsAt],
      [6.0, ...P(B.jumps)], [6.9, ...P(B.jumps)], [7.6, ...P(B.add)], [10, ...P(B.add)]];
    const [cx, cy] = keyed(path, t);
    const cur = el.querySelector('.cursor');
    cur.style.transform = 'translate(' + cx * w + 'px,' + cy * h + 'px) scale(' + 1 / z + ')';
    const clicks = [2.5, 3.9, 4.75, 7.75];
    const since = Math.min(...clicks.map((c) => (t >= c ? t - c : 99)));
    const rip = el.querySelector('.ripple');
    rip.style.opacity = since < 0.4 ? 0.8 * (1 - since / 0.4) : 0;
    rip.style.transform = 'scale(' + (0.3 + since * 4) + ')';
    cur.querySelector('svg').style.transform = since < 0.12 ? 'scale(.85)' : 'none';
  },
};

function background(t) {
  const b = document.querySelectorAll('.blob');
  const p = [[260, 120, 0.21, 0.17], [900, 80, 0.15, 0.23], [620, 420, 0.12, 0.19]];
  b.forEach((el, i) => {
    const [x, y, fx, fy] = p[i];
    el.style.transform = 'translate(' + (x - 320 + 120 * Math.sin(t * fx + i)) + 'px,' + (y - 320 + 90 * Math.cos(t * fy + i * 2)) + 'px)';
  });
}

window.seek = async (t) => {
  background(t);
  for (const s of SLIDES) {
    const el = document.getElementById(s.id);
    const local = t - s.start;
    const on = local >= 0 && local < s.dur;
    el.style.display = on ? 'block' : 'none';
    if (!on) continue;
    const fin = s.first ? 1 : ease(local / 0.45);
    const fout = s.last ? ease((s.dur - local) / 1.2) : ease((s.dur - local) / 0.45);
    el.style.opacity = Math.min(fin, fout);
    el.style.transform = 'translateY(' + (1 - fin) * 26 + 'px) scale(' + (1 - (1 - Math.min(1, fout)) * 0.035) + ')';
    for (const part of el.querySelectorAll('[data-at]')) part.style.visibility = local >= +part.dataset.at ? 'visible' : 'hidden';
    for (const a of el.getAnimations({ subtree: true })) {
      const target = a.effect && a.effect.target;
      const holder = target && target.closest && target.closest('[data-at]');
      const off = holder && el.contains(holder) ? +holder.dataset.at : 0;
      a.pause();
      a.currentTime = Math.max(0, local - off) * 1000;
    }
    if (HOOKS[s.id]) await HOOKS[s.id](local, el);
  }
};
`;

/** The whole promo page */
export function promoPage({ slides }, { fontUrl }) {
  const data = Object.fromEntries(slides.filter((s) => s.data).map((s) => [s.id, s.data]));
  const meta = slides.map(({ id, start, dur, first, last }) => ({ id, start, dur, first, last }));
  return `<!doctype html><html><head><meta charset="utf-8"><title>PictoGen promo</title>
<style>${CSS.replace('FONT_URL', fontUrl)}</style>
<style>${ANIMATION_CSS}</style></head><body>
<div id="bg"><div class="blob" style="background:#3b82f6"></div><div class="blob" style="background:#8b5cf6"></div><div class="blob" style="background:#ec4899;opacity:.22"></div></div>
${slides.map((s) => `<section class="slide" id="${s.id}">${s.html}</section>`).join('\n')}
<script>${RUNTIME.replace('__SLIDES__', JSON.stringify(meta)).replace('__DATA__', JSON.stringify(data))}</script>
</body></html>`;
}
