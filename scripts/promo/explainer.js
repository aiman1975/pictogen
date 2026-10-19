// The explainer video's slides (npm run promo:explainer): a narrated tour with cute examples. Each
// slide lasts as long as what is said over it (narration.js, spoken into media/promo-voice/), with
// subtitles, so it also works with the sound off. Every picture is drawn by PictoGen.
//   slide: { id, dur, html, sfx, say: [{ id, t }] (voice lines, s from the slide's start), data? }
import { generate, renderIcon, drawConcept, shapesToSvg, parseTimeline, renderWorksheet } from '../../src/index.js';
import { buildStoryboard } from './storyboard.js';
import { NARRATION } from './narration.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const scene = (text, opts = {}) => generate(text, { style: 'cartoon', ...opts });
const timed = (text, lengths, opts = {}) => {
  const beats = parseTimeline(text).beats.map((b, i) => ({ ...b, ...(lengths[i] ? { duration: lengths[i] } : {}) }));
  return generate(text, { style: 'cartoon', ...opts, beats });
};
const figure = (id, opts = {}) => shapesToSvg(drawConcept(id, { seed: 1, ...opts }), opts.style || 'cartoon');
const pops = (t0, n, gap, pitch = 1) => Array.from({ length: n }, (_, i) => ({ t: t0 + i * gap, type: 'pop', pitch: pitch + (i % 5) * 0.06, gain: 0.15, pan: ((i % 4) - 1.5) * 0.3 }));
const img = (svg) => `<img alt="" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">`;
const header = (kicker, title) => `
  <div class="head">
    <div class="kicker rise" style="--d:.15s">${kicker}</div>
    <h1 class="rise" style="--d:.28s">${title}</h1>
  </div>`;
const LOGO = `<svg viewBox="0 0 120 120" class="logo"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>
  <rect x="4" y="4" width="112" height="112" rx="30" fill="url(#lg)"/>
  <rect x="26" y="34" width="68" height="52" rx="10" fill="none" stroke="#fff" stroke-width="7"/>
  <path d="M52 47 L70 60 L52 73 Z" fill="#fff"/>
  <path d="M92 18 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" fill="#fde68a"/></svg>`;

/**
 * buildExplainer({ studio, voices }) -> { slides, duration, sfx, voices: [{ id, t }] }
 *   voices: { id: seconds } - how long each spoken line is (estimated when missing)
 */
export function buildExplainer({ studio, voices = {} }) {
  const line = Object.fromEntries(NARRATION.map((l) => [l.id, l]));
  const len = (id) => voices[id] ?? line[id].text.split(/\s+/).length / 2.6 + 0.4;
  const sub = (id, t) => `<div class="subtitle" data-at="${t}"><span>${esc(line[id].text)}</span></div>`;
  const slides = [];
  // A slide around what is said: the voice starts at `at`, the slide ends `tail` seconds after it
  const add = (s, at = 0.6, tail = 1.1) => {
    const say = s.say ?? [{ id: s.id, t: at }];
    const end = Math.max(...say.map((v) => v.t + len(v.id)));
    slides.push({ ...s, say, dur: Math.max(s.min ?? 0, end + tail), html: s.html + (s.subtitle === false ? '' : sub(say[0].id, say[0].t)) });
  };

  // 1. Hello
  {
    const floaters = [['sun', 90, 80], ['rainbow', 1080, 70], ['balloon', 150, 520], ['cat', 1060, 520], ['musical_note', 330, 130], ['dog', 900, 160],
      ['party_popper', 250, 380], ['sparkles', 980, 360], ['star', 560, 610], ['teddy_bear', 760, 590]];
    const icons = floaters.map(([id, x, y], i) => `<div class="floater pop" style="left:${x}px;top:${y}px;--d:${0.15 + i * 0.09}s"><div class="bob" style="animation-delay:-${i * 0.7}s">${renderIcon(id, { size: 84 })}</div></div>`).join('');
    const word = [...'PictoGen'].map((c, i) => `<span class="pop" style="--d:${0.75 + i * 0.06}s">${c}</span>`).join('');
    add({
      id: 'intro', min: 5.5,
      html: `${icons}<div class="center">
        <div class="pop" style="--d:.3s">${LOGO}</div>
        <div class="brand">${word}</div>
        <p class="tagline rise" style="--d:1.75s">Type a sentence. Get a picture that moves.</p>
      </div>`,
      sfx: [{ t: 0.05, type: 'whoosh', gain: 0.2 }, ...pops(0.15, 10, 0.09, 0.9), { t: 0.3, type: 'pop', pitch: 0.8, gain: 0.22 },
        ...[...'PictoGen'].map((_, i) => ({ t: 0.75 + i * 0.06, type: 'pop', pitch: 1.1 + i * 0.07, gain: 0.1 })), { t: 1.75, type: 'chime' }],
    }, 1.0);
  }

  // 2. Typing a sentence (the typing hook: data.text, keys, press)
  {
    const text = 'a girl with a balloon and her dog in the park';
    const r = scene(text);
    const keys = [];
    let t = 1.2;
    for (let i = 0; i < text.length; i++) { keys.push(+t.toFixed(3)); t += 0.045 + ((i * 7919) % 13) / 450 + (text[i] === ' ' ? 0.04 : 0); }
    const press = +(t + 0.3).toFixed(2);
    add({
      id: 'typing', min: press + 4, data: { text, keys, press },
      html: `${header('Step 1', 'Write what you want to see')}
        <div class="promptbar pop" style="--d:.45s"><span class="typed"></span><span class="caret"></span><span class="go">✨ Draw</span></div>
        <div class="card big" data-at="${(press + 0.35).toFixed(2)}" style="left:310px;top:282px;width:660px"><div class="pop">${r.svg}</div></div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...keys.map((k, i) => ({ t: k, type: 'click', gain: 0.06 + (i % 3) * 0.012, pan: ((i % 5) - 2) * 0.1 })),
        { t: press, type: 'ding' }, { t: press + 0.35, type: 'pop', pitch: 0.9, gain: 0.22 }, { t: press + 0.5, type: 'chime', gain: 0.09 }],
    }, 0.5);
  }

  // 3. Things happen one after another
  {
    const text = 'a boy walks in, then waves, then a puppy runs to him';
    const r = timed(text, [2.2, 1.6, 2.4]);
    add({
      id: 'moving', min: 8.5,
      html: `${header('Step 2', 'Add “then”, and it moves')}
        <div class="quote rise" style="--d:.4s">“a boy walks in, <b>then</b> waves, <b>then</b> a puppy runs to him”</div>
        <div class="card big" data-at="0.7" style="left:280px;top:232px;width:720px"><div class="pop">${r.svg}</div></div>`,
      sfx: [{ t: 0, type: 'whoosh' }, { t: 0.7, type: 'pop', pitch: 0.9, gain: 0.2 }, { t: 0.7 + 2.3, type: 'twinkle', gain: 0.08 }, { t: 0.7 + 4.0, type: 'whoosh', gain: 0.09 }],
    }, 0.9);
  }

  // 4. Talking (the girl's own voice, while the bubble shows and her lips move)
  {
    const r = scene('a girl says "Look, a rainbow!" to her cat under a rainbow');
    const at = 0.7, talkAt = 0.6 + len('talking') + 0.35;
    add({
      id: 'talking', min: 7,
      say: [{ id: 'talking', t: 0.6 }, { id: 'talking-girl', t: talkAt }],
      html: `${header('Step 3', 'Put words in quotes')}
        <div class="quote rise" style="--d:.4s">a girl says <b>“Look, a rainbow!”</b> to her cat</div>
        <div class="card big" data-at="${at}" style="left:280px;top:232px;width:720px"><div class="pop">${r.svg}</div></div>`,
      sfx: [{ t: 0, type: 'whoosh' }, { t: at, type: 'pop', pitch: 0.9, gain: 0.2 }, { t: talkAt + 1.3, type: 'twinkle', gain: 0.1 }],
    }, 0.6);
  }

  // 5. The cast (the robot says hello at the end)
  {
    const cast = [['teacher', 'Teacher'], ['old_woman', 'Grandma'], ['old_man', 'Grandpa'], ['baby', 'Baby'], ['man_superhero', 'Superhero'], ['princess', 'Princess'],
      ['astronaut', 'Astronaut'], ['cook', 'Chef'], ['pirate', 'Pirate'], ['wizard', 'Wizard'], ['fairy', 'Fairy'], ['robot', 'Robot']];
    const span = len('cast');
    const gap = Math.min(0.42, (span - 0.6) / cast.length);
    const robotAt = 0.6 + span + 0.25;
    add({
      id: 'cast', min: 8,
      say: [{ id: 'cast', t: 0.6 }, { id: 'cast-robot', t: robotAt }],
      html: `${header('Characters', 'A whole cast to play with')}
        <div class="castgrid">${cast.map(([id, label], i) => `<div class="castcell pop" style="--d:${(0.8 + i * gap).toFixed(2)}s">
          <svg viewBox="-6 -14 112 116">${figure(id, { animation: id === 'robot' ? 'wave' : id === 'baby' ? undefined : 'blink', expression: 'happy' })}</svg><div class="label dark">${label}</div></div>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.8, cast.length, gap, 0.95), { t: robotAt - 0.05, type: 'blip', gain: 0.1 }],
    }, 0.9);
  }

  // 6. Holding things
  {
    const items = [['a woman holds a phone', 'flat', '“a woman holds a phone”'], ['a boy flies a kite in the park', 'cartoon', '“a boy flies a kite”'], ['a girl hugs a cat', 'pastel', '“a girl hugs a cat”']];
    add({
      id: 'hands', min: 6,
      html: `${header('Holding things', 'Things go in their hands')}
        <div class="trio">${items.map(([t, style, cap], i) => `<div class="cell pop" style="--d:${(0.7 + i * 0.55).toFixed(2)}s"><div class="card sq">${scene(t, { style, width: 420, height: 420 }).svg}</div><div class="label">${cap}</div></div>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.7, 3, 0.55, 1)],
    });
  }

  // 7. Styles
  {
    const text = 'a happy girl and her puppy';
    const styles = [['cartoon', 'Cartoon'], ['watercolor', 'Watercolour'], ['anime', 'Anime'], ['crayon', 'Crayon'], ['chalkboard', 'Chalkboard'], ['pixel', 'Pixel art']];
    const span = len('styles');
    const gap = Math.min(0.75, (span * 0.72) / styles.length);
    add({
      id: 'looks', min: 7, say: [{ id: 'styles', t: 0.6 }],
      html: `${header('23 drawing styles', 'One sentence. Any look.')}
        <div class="grid32">${styles.map(([s, label], i) => `<div class="cell pop" style="--d:${(0.9 + i * gap).toFixed(2)}s"><div class="card">${scene(text, { style: s }).svg}</div><div class="label">${label}</div></div>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...styles.map((_, i) => ({ t: 0.9 + i * gap, type: 'pop', pitch: 0.9 + i * 0.08, gain: 0.17 }))],
    }, 0.6);
  }

  // 8. School: a labelled diagram, the same as a quiz, a worksheet to print
  {
    const span = len('school');
    const quizAt = +(0.6 + span * 0.47).toFixed(2), sheetAt = +(0.6 + span * 0.64).toFixed(2);
    const plant = scene('the parts of a plant', { mode: 'diagram', style: 'flat', width: 720, height: 480 });
    const quiz = scene('the parts of a plant', { mode: 'diagram', style: 'flat', width: 720, height: 480, blank: true });
    const sheet = renderWorksheet('the parts of a plant', { mode: 'diagram', answers: false }).pages[0];
    add({
      id: 'school', min: 9,
      html: `${header('For school', 'Diagrams, quizzes, worksheets')}
        <div class="card" data-at="0.7" style="left:84px;top:200px;width:620px"><div class="pop">${plant.svg}</div></div>
        <div class="card" data-at="${quizAt}" style="left:84px;top:200px;width:620px"><div class="pop">${quiz.svg}</div></div>
        <div class="sheet" data-at="${sheetAt}" style="left:800px;top:150px;width:360px"><div class="pop">${img(sheet)}</div></div>
        <div class="tag rise" data-at="${quizAt}" style="left:104px;top:200px">🙈 Labels hidden for a quiz</div>
        <div class="tag rise" data-at="${sheetAt}" style="left:840px;top:146px">🖨 Print it as a PDF</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, { t: 0.7, type: 'pop', gain: 0.2 }, { t: quizAt, type: 'whoosh', gain: 0.12 }, { t: quizAt + 0.1, type: 'pop', pitch: 1.2, gain: 0.16 },
        { t: sheetAt, type: 'whoosh', gain: 0.14 }, { t: sheetAt + 0.15, type: 'ding', gain: 0.1 }],
    }, 0.6);
  }

  // 9. More to make
  {
    const span = len('more');
    const modes = [
      ['Comic strips', scene('a cat finds a fish "Look, a fish!" "Yum!" "Best day ever!"', { mode: 'comic', style: 'comic' })],
      ['Colouring pages', scene('a cute puppy', { mode: 'coloring' })],
      ['Alphabet friends', scene('CAT', { mode: 'alphabet', style: 'letterling' })],
    ];
    add({
      id: 'more', min: 6,
      html: `${header('And more', 'Comics, colouring, letters')}
        <div class="trio wide">${modes.map(([label, r], i) => `<div class="cell pop" style="--d:${(0.7 + i * span * 0.27).toFixed(2)}s"><div class="card fit">${r.svg}</div><div class="label">${label}</div></div>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...modes.map((_, i) => ({ t: 0.7 + i * span * 0.27, type: 'pop', pitch: 0.95 + i * 0.1, gain: 0.18 }))],
    }, 0.6);
  }

  // 10. The studio (the real recording, from the first promo)
  {
    const studioSlide = buildStoryboard({ studio }).slides.find((s) => s.id === 'studio');
    add({ ...studioSlide, id: 'studio', min: studioSlide.dur, say: [{ id: 'studio', t: 1.0 }] });
  }

  // 11. Private
  {
    const points = ['Drawn on your own device', 'No sign-up', 'Nothing is uploaded'];
    const span = len('private');
    add({
      id: 'private', min: 6,
      html: `<div class="center">
          <div class="lock pop" style="--d:.3s">🔒</div>
          <h1 class="rise" style="--d:.5s">Private, the way it should be</h1>
          <div class="facts static">${points.map((p, i) => `<span class="rise" style="--d:${(1.2 + i * span * 0.22).toFixed(2)}s">✓ ${p}</span>`).join('')}</div>
        </div>`,
      sfx: [{ t: 0, type: 'whoosh' }, { t: 0.3, type: 'pop', pitch: 0.7, gain: 0.22 }, ...points.map((_, i) => ({ t: 1.2 + i * span * 0.22, type: 'tick', gain: 0.1 }))],
    });
  }

  // 12. Try it
  {
    const parade = [['girl', { animation: 'walk', view: 'side' }], ['dog', { animation: 'run' }], ['boy', { animation: 'run', view: 'side', seed: 5 }], ['robot', { animation: 'walk' }], ['cat', { animation: 'walk' }]];
    add({
      id: 'outro', min: 7,
      html: `<div class="center">
          <div class="pop" style="--d:.2s">${LOGO}</div>
          <div class="brand pop" style="--d:.45s">PictoGen</div>
          <p class="tagline rise" style="--d:.9s">Type a sentence. Watch it come to life.</p>
          <p class="url rise" style="--d:1.5s">manostudio-app.web.app</p>
          <p class="sub rise" style="--d:2.2s">Every picture in this video was drawn by PictoGen.</p>
        </div>
        <div class="parade">${parade.map(([id, o], i) => `<svg class="walker" style="animation-delay:-${i * 1.6}s" viewBox="-8 -12 116 118">${figure(id, o)}</svg>`).join('')}</div>`,
      subtitle: false,
      sfx: [{ t: 0, type: 'whoosh' }, { t: 0.2, type: 'pop', pitch: 0.8, gain: 0.22 }, { t: 0.45, type: 'chime', pitch: 784 }, { t: 1.5, type: 'chime', pitch: 1046.5, gain: 0.12 }],
    }, 0.8, 2.2);
  }

  // Timing: each slide starts as the previous one fades (0.45s overlap)
  let t = 0;
  for (const [i, s] of slides.entries()) {
    s.dur = +s.dur.toFixed(2);
    s.start = +t.toFixed(3);
    s.first = i === 0;
    s.last = i === slides.length - 1;
    t += s.dur - 0.45;
  }
  const duration = +(t + 0.45).toFixed(3);
  const sfx = slides.flatMap((s) => s.sfx.map((e) => ({ ...e, t: +(s.start + e.t).toFixed(3) })));
  const said = slides.flatMap((s) => s.say.map((v) => ({ id: v.id, t: +(s.start + v.t).toFixed(3) })));
  return { slides, duration, sfx, voices: said };
}
