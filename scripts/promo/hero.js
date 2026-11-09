// "Toonaro in 45 seconds" - the landing page's video (node scripts/promo/build.js --hero): what Toonaro
// is for, for grown-ups too - the classroom, presentations, stories, three languages, any look - and
// why it is different (offline, private, no fees per picture). Music and captions, no narrator: on a
// website a video plays muted until it is clicked. Every picture is drawn by Toonaro.
//   slide: { id, dur (s), html, sfx: [{ t (s, from the slide's start), type, ... }], data? }
import { readFileSync } from 'node:fs';
import { generate } from '../../src/index.js';
import { composeStory } from '../../src/story.js';
import { readOutline, renderSlide } from '../../src/slides.js';
import { renderWorksheet } from '../../src/worksheet.js';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// A printed page (a worksheet) as a picture of its own: its print CSS ("* { animation: none }") must not
// reach the rest of the video page
export const asImage = (svg) => `<img alt="" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">`;
export const scene = (text, opts = {}) => generate(text, { style: 'flat', ...opts });
export const pops = (t0, n, gap, pitch = 1) => Array.from({ length: n }, (_, i) => ({ t: t0 + i * gap, type: 'pop', pitch: pitch + (i % 5) * 0.06, gain: 0.14, pan: ((i % 4) - 1.5) * 0.3 }));
export const header = (kicker, title, sub) => `
  <div class="head">
    <div class="kicker hk rise" style="--d:.15s">${kicker}</div>
    <h1 class="rise" style="--d:.28s">${title}</h1>
    ${sub ? `<p class="sub rise" style="--d:.45s">${sub}</p>` : ''}
  </div>`;
// The brand: the icon, the name (its o's are eyes) and Toonaro himself, his own animations renamed so
// they keep to themselves on the page
export const ICON = read('public/icons/icon.svg').replace('<svg ', '<svg class="hicon" ');
export const WORDMARK = read('public/brand/toonaro-wordmark-white.svg').replace('<svg ', '<svg class="hword" ');
const MASCOT_SVG = read('public/brand/toonaro-mascot.svg').replace(/<title>[^<]*<\/title>/, '')
  .replace(/\b(bob|wave|lid|tw2|tw3|tw|blink)\b/g, 'tn-$1').replace('<svg ', '<svg class="hmascot" ');
// (each copy with its own gradient name: a hidden copy's would leave the others without their colour)
let copies = 0;
export const mascot = () => { copies++; return MASCOT_SVG.replace(/tbody/g, `tbody${copies}`); };

export function buildHero() {
  const slides = [];

  // 0. Hello
  slides.push({
    id: 'hintro', dur: 3.9,
    html: `<div class="center">
      <div class="pop" style="--d:.15s">${mascot()}</div>
      <div class="rise" style="--d:.55s">${WORDMARK}</div>
      <p class="tagline rise" style="--d:1.05s">Type a sentence. Watch it move.</p>
      <p class="sub rise" style="--d:1.6s">Pictures, cartoons and explainer videos - for class, work and home</p>
    </div>`,
    sfx: [{ t: 0.05, type: 'whoosh', gain: 0.2 }, { t: 0.15, type: 'pop', pitch: 0.8, gain: 0.24 }, { t: 1.05, type: 'chime' }],
  });

  // 1. Typing (the page's typing hook runs on the slide called "typing")
  {
    const text = 'a teacher points at the board in the classroom';
    const r = scene(text);
    const keys = [];
    let t = 0.7;
    for (let i = 0; i < text.length; i++) { keys.push(+t.toFixed(3)); t += 0.03 + ((i * 7919) % 13) / 520 + (text[i] === ' ' ? 0.028 : 0); }
    slides.push({
      id: 'typing', dur: 6.3, data: { text, keys, press: +(t + 0.22).toFixed(2) },
      html: `${header('Step 1 · Type', 'Describe what you need.')}
        <div class="promptbar pop" style="--d:.4s"><span class="typed"></span><span class="caret"></span><span class="go hgo">✨ Draw</span></div>
        <div class="card big" data-at="${(t + 0.55).toFixed(2)}" style="left:330px;top:286px;width:620px"><div class="pop">${r.svg}</div></div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...keys.map((k, i) => ({ t: k, type: 'click', gain: 0.06 + (i % 3) * 0.012, pan: ((i % 5) - 2) * 0.1 })),
        { t: t + 0.22, type: 'ding' }, { t: t + 0.55, type: 'pop', pitch: 0.9, gain: 0.2 }],
    });
  }

  // 2. The classroom: a labelled diagram, a worksheet and its answer key
  {
    const d = scene('the water cycle', { mode: 'diagram' });
    const ws = renderWorksheet('the water cycle', { mode: 'diagram', kind: 'label', answers: true });
    slides.push({
      id: 'hclass', dur: 6.4,
      html: `${header('For the classroom', 'Diagrams, worksheets, quizzes.')}
        <div class="card" style="left:64px;top:214px;width:600px"><div class="pop" style="--d:.5s">${d.svg}</div></div>
        <div class="caption rise" style="left:64px;top:566px;width:600px;--d:.9s">Labels on, or off for a quiz</div>
        <div class="paper back pop" style="--d:1.5s;left:930px;top:200px;width:250px">${asImage(ws.pages[1] || ws.pages[0])}</div>
        <div class="paper pop" style="--d:1.1s;left:720px;top:186px;width:270px">${asImage(ws.pages[0])}</div>
        <div class="tag rise" style="--d:1.9s;left:1030px;top:618px">✓ Answer key</div>
        <div class="caption rise" style="left:710px;top:604px;width:280px;--d:1.4s">Print it, A4</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, { t: 0.5, type: 'pop', gain: 0.18 }, { t: 1.1, type: 'pop', pitch: 1.1, gain: 0.16 }, { t: 1.5, type: 'pop', pitch: 1.25, gain: 0.14 }, { t: 1.9, type: 'tick', gain: 0.1 }],
    });
  }

  // 3. Presentations: notes in, explainer cards out
  {
    const { cards } = readOutline('# Money that grows\n## 7% a year\n- Doubles in about ten years\n## Saving vs Spending\n- Grows over time | Gone tomorrow\n- Works for you | Nothing left\n## Three steps\n1. Save a little each month\n2. Invest it\n3. Let time do the rest');
    const shown = cards.filter((c) => c.kind !== 'title');
    slides.push({
      id: 'hpresent', dur: 7.0,
      html: `${header('For presentations', 'Notes in. Explainer video out.', 'Paste your notes: Toonaro writes the cards, finds the pictures and makes the video.')}
        <div class="trio wide" style="top:262px">${shown.map((c, i) => `<div><div class="card" data-at="${(0.7 + i * 0.6).toFixed(1)}"><div class="pop">${renderSlide(c, { style: 'whiteboard', index: i, total: shown.length, width: 640, height: 360 }).svg}</div></div></div>`).join('')}</div>
        <div class="facts" style="top:500px">${['Big numbers', 'Comparisons', 'Steps', 'Quizzes', 'Charts'].map((f, i) => `<span class="rise" style="--d:${2.6 + i * 0.12}s">${f}</span>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.7, 3, 0.6, 0.95), ...[0, 1, 2, 3, 4].map((i) => ({ t: 2.6 + i * 0.12, type: 'tick', gain: 0.07 }))],
    });
  }

  // 4. Stories: a few lines become a cartoon, scene by scene
  {
    const lines = ['Mia finds a little puppy under a tree.', 'She takes it home and gives it some milk.', 'At night they fall asleep together.'];
    const st = composeStory(lines.join('\n'), { style: 'cartoon' });
    slides.push({
      id: 'hstory', dur: 6.8,
      html: `${header('For stories', 'A story becomes a cartoon.', 'Characters stay the same from scene to scene - or print it as a picture book.')}
        <div class="film">${st.scenes.slice(0, 3).map((sc, i) => `<div class="frame" data-at="${(0.8 + i * 0.9).toFixed(1)}"><div class="pop"><div class="card rel">${sc.svg}</div><div class="label">${esc(lines[i])}</div></div></div>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.8, 3, 0.9, 0.9)],
    });
  }

  // 5. Three languages: the same words, the same picture
  {
    const langs = [['English', 'a girl with a balloon in the park', 'ltr'], ['Deutsch', 'ein Mädchen mit einem Ballon im Park', 'ltr'], ['العربية', 'فتاة مع بالون في الحديقة', 'rtl']];
    slides.push({
      id: 'hlang', dur: 5.8,
      html: `${header('In your language', 'English. Deutsch. العربية.', 'The whole studio, right to left too.')}
        <div class="trio wide" style="top:250px">${langs.map(([name, text, dir], i) => `<div class="pop" style="--d:${0.6 + i * 0.35}s">
          <div class="langq" dir="${dir}"><b>${name}</b> “${esc(text)}”</div>
          <div class="card rel">${scene(text, { style: 'cartoon', seed: 4 }).svg}</div></div>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.6, 3, 0.35, 1)],
    });
  }

  // 6. Any look
  {
    const text = 'a family under a tree in the park on a sunny day';
    const looks = [['whiteboard', 'Whiteboard'], ['watercolor', 'Watercolour'], ['comic', 'Comic'], ['chalkboard', 'Chalkboard'], ['cartoon', 'Cartoon'], ['anime', 'Anime'], ['crayon', 'Crayon'], ['blueprint', 'Blueprint']];
    slides.push({
      id: 'hstyles', dur: 5.4,
      html: `${header('Any look', 'From whiteboard to watercolour.', '23 styles, one click apart.')}
        <div class="grid4" style="top:250px">${looks.map(([st, label], i) => `<div class="cell pop" style="--d:${0.5 + i * 0.08}s"><div class="card rel">${scene(text, { style: st }).svg}</div><div class="label">${label}</div></div>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.5, 8, 0.08, 1.05)],
    });
  }

  // 7. Why it's different
  {
    const why = [['🔒', 'Private', 'Nothing you make leaves your device'], ['📴', 'Offline', 'Works without the internet'], ['💶', 'No fees per picture', 'No AI service, no waiting']];
    slides.push({
      id: 'htrust', dur: 4.8,
      html: `<div class="center">
        <h1 class="big rise" style="--d:.2s">Offline. Private. Yours.</h1>
        <div class="whys">${why.map(([ic, b, s], i) => `<div class="why pop" style="--d:${0.7 + i * 0.25}s"><span class="ic">${ic}</span><b>${b}</b><span>${s}</span></div>`).join('')}</div>
        <p class="sub rise" style="--d:1.8s">Every picture in this video was drawn by Toonaro.</p>
      </div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.7, 3, 0.25, 0.95)],
    });
  }

  // 8. Goodbye
  slides.push({
    id: 'houtro', dur: 5.2,
    html: `<div class="center">
      <div class="outrorow pop" style="--d:.2s">${mascot()}<div class="outrobrand">${ICON}${WORDMARK}</div></div>
      <p class="tagline rise" style="--d:.8s">Your words. Animated.</p>
      <p class="url ho rise" style="--d:1.2s">toonaro.com</p>
      <p class="sub rise" style="--d:1.6s">Try it free in your browser</p>
    </div>`,
    sfx: [{ t: 0, type: 'whoosh' }, { t: 0.2, type: 'pop', pitch: 0.8, gain: 0.22 }, { t: 0.8, type: 'chime', pitch: 784 }, { t: 1.2, type: 'chime', pitch: 1046.5, gain: 0.12 }],
  });

  return timeline(slides);
}

/** Timing: each slide starts as the previous one fades (0.45s overlap); the sound effects placed */
export function timeline(slides) {
  let t = 0;
  for (const [i, s] of slides.entries()) {
    s.start = +t.toFixed(3);
    s.first = i === 0;
    s.last = i === slides.length - 1;
    t += s.dur - 0.45;
  }
  const duration = +(t + 0.45).toFixed(3);
  const sfx = slides.flatMap((s) => s.sfx.map((e) => ({ ...e, t: +(s.start + e.t).toFixed(3) })));
  return { slides, duration, sfx };
}
