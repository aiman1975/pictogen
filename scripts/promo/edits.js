// "Edit anything" (node scripts/promo/build.js --video edits): the real studio, filmed by
// capture-edits.js - each edit shown fast: the control being used (with the pointer) beside the picture
// changing. A character made, a scene drawn, a figure clicked and changed, something dragged, then in
// the scene card: the place, the weather and the time, something added, what happens, words, the
// camera and the look. Music and captions, no narrator.
import { ICON, WORDMARK, mascot, header, pops, timeline } from './hero.js';

const FPS = 15;
const CAPTIONS = {
  echar: ['Your characters', 'Make them once.', 'Hair, glasses, colours: Mia looks the same in every scene.'],
  edraw: ['Type it', 'Say what happens. Press Draw.', null],
  efigure: ['Click a figure', 'Bigger. Another face. Flipped.', null],
  edrag: ['Drag anything', 'Put it where you want it.', null],
  eplace: ['Change the place', 'The beach. Rain. Night.', 'One click each, in the scene card.'],
  eadd: ['Add things', '＋ a kite.', null],
  esteps: ['Change what happens', 'Walks in - then dances.', null],
  ewords: ['Give them words', '"Look, a kite!"', null],
  ecamera: ['Move the camera', 'Push in, pan, follow.', null],
  elook: ['Change the look', 'Watercolour. Sketch. 23 styles.', null],
};
// How each edit is laid out: the control and the picture side by side, one above the other, or only one
const LAYOUT = { echar: 'tallside', edraw: 'stack', efigure: 'pic', edrag: 'pic' };

/** The slides; studio: what capture-edits.js filmed ({ fps, segments }) */
export function buildEdits({ studio }) {
  const slides = [];

  slides.push({
    id: 'eintro', dur: 3.6,
    html: `<div class="center">
      <div class="pop" style="--d:.15s">${mascot()}</div>
      <div class="kicker hk rise" style="--d:.5s">The Toonaro studio</div>
      <h1 class="big rise" style="--d:.65s">Edit anything.</h1>
      <p class="sub rise" style="--d:1.2s">Characters, places, weather, things, steps, words, camera, look - in a few clicks.</p>
    </div>`,
    sfx: [{ t: 0.05, type: 'whoosh', gain: 0.2 }, { t: 0.15, type: 'pop', pitch: 0.8, gain: 0.22 }, { t: 0.65, type: 'chime' }],
  });

  const fps = studio?.fps ?? FPS;
  const segs = studio?.segments ?? [];
  segs.forEach((seg, si) => {
    const [kicker, title, sub] = CAPTIONS[seg.id] ?? ['Edit', '', null];
    const layout = LAYOUT[seg.id] ?? 'side';
    // When each step's click is, and how long its picture plays
    let t = 0.85;
    const drag = !!seg.drag;
    const steps = seg.steps.map((st, k) => {
      const travel = drag ? (k ? 0.11 : 0.5) : 0.55;
      const click = t + travel;
      const play = drag ? 0.11 : st.pic && st.pic.length > 1 ? Math.min(1.25, st.pic.length / fps) : 0.55;
      t = click + play;
      return { ...st, click: +click.toFixed(2) };
    });
    const dur = +(t + 0.75).toFixed(2);
    const data = { tour: true, fps, layout, drag, zoom: layout === 'side' ? 1.75 : 1, ctrlSize: seg.ctrlSize, picSize: seg.picSize, pre: seg.pre, steps, pane: seg.ctrlSize && layout !== 'pic' ? 'ctrl' : 'pic' };
    slides.push({
      id: seg.id, dur, data,
      html: `${header(`${kicker} · ${si + 1}/${segs.length}`, title, sub)}
        <div class="tour ${layout}">
          ${seg.ctrlSize && layout !== 'pic' ? '<div class="pane ctrl pop" style="--d:.3s"><div class="scroll"><img class="shot" alt=""><div class="cursor"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M3 2 L3 20 L8 15 L11.5 22 L14.5 20.5 L11 13.8 L18 13.8 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg><span class="ripple"></span></div></div></div>' : ''}
          ${seg.picSize ? '<div class="pane pic pop" style="--d:.45s"><div class="scroll"><img class="shot" alt=""><div class="cursor"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M3 2 L3 20 L8 15 L11.5 22 L14.5 20.5 L11 13.8 L18 13.8 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg><span class="ripple"></span></div></div></div>' : ''}
        </div>`,
      sfx: [{ t: 0, type: 'whoosh', gain: 0.14 }, ...steps.map((s) => ({ t: s.click, type: drag ? 'tick' : 'click', gain: drag ? 0.05 : 0.2 })),
        ...(drag ? [] : steps.map((s) => ({ t: s.click + 0.12, type: 'pop', pitch: 1.1, gain: 0.08 })))],
    });
  });

  // Export
  {
    const outs = [['🎬', 'Video', 'MP4, wide, tall or square'], ['🖼️', 'Pictures', 'PNG, SVG, GIF'], ['📖', 'Picture book', 'A PDF to print'], ['🌐', 'Web page', 'A clip that plays anywhere']];
    slides.push({
      id: 'eexport', dur: 4.6,
      html: `<div class="center">
        <h1 class="big rise" style="--d:.2s">Then share it.</h1>
        <div class="whys four">${outs.map(([ic, b, s], i) => `<div class="why pop" style="--d:${0.6 + i * 0.18}s"><span class="ic">${ic}</span><b>${b}</b><span>${s}</span></div>`).join('')}</div>
        <p class="sub rise" style="--d:1.6s">Everything in this video is the real studio, working offline.</p>
      </div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.6, 4, 0.18, 0.95)],
    });
  }

  slides.push({
    id: 'eoutro', dur: 5,
    html: `<div class="center">
      <div class="outrorow pop" style="--d:.2s">${mascot()}<div class="outrobrand">${ICON}${WORDMARK}</div></div>
      <p class="tagline rise" style="--d:.8s">Edit anything. In a few clicks.</p>
      <p class="url ho rise" style="--d:1.2s">toonaro.com</p>
      <p class="sub rise" style="--d:1.6s">Try it free in your browser</p>
    </div>`,
    sfx: [{ t: 0, type: 'whoosh' }, { t: 0.2, type: 'pop', pitch: 0.8, gain: 0.22 }, { t: 0.8, type: 'chime', pitch: 784 }, { t: 1.2, type: 'chime', pitch: 1046.5, gain: 0.12 }],
  });

  return timeline(slides);
}
