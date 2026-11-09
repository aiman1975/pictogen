// "Toonaro for teachers" (node scripts/promo/build.js --video teachers): a lesson's pictures in seconds -
// a labelled diagram from its topic, the quiz version without labels, a worksheet with its answer key,
// a quiz card that reveals the answer, and the looks that fit a class (blueprint, chalkboard, sketch,
// whiteboard - grown-up styles, not only children's). Music and captions, no narrator.
import { ICON, WORDMARK, asImage, mascot, header, pops, scene, timeline } from './hero.js';
import { readOutline, renderSlide } from '../../src/slides.js';
import { renderWorksheet } from '../../src/worksheet.js';

export function buildTeachers() {
  const slides = [];

  // 0. For teachers
  slides.push({
    id: 'tintro', dur: 3.8,
    html: `<div class="center">
      <div class="pop" style="--d:.15s">${mascot()}</div>
      <div class="kicker hk rise" style="--d:.5s">Toonaro for teachers</div>
      <h1 class="big rise" style="--d:.65s">Your lesson, illustrated.</h1>
      <p class="sub rise" style="--d:1.2s">Diagrams, worksheets, quizzes and explainer videos - type the topic, Toonaro draws it.</p>
    </div>`,
    sfx: [{ t: 0.05, type: 'whoosh', gain: 0.2 }, { t: 0.15, type: 'pop', pitch: 0.8, gain: 0.22 }, { t: 0.65, type: 'chime' }],
  });

  // 1. Type the topic (the page's typing hook runs on the slide called "typing")
  {
    const text = 'the solar system';
    const r = scene(text, { mode: 'diagram', style: 'blueprint' });
    const keys = [];
    let t = 0.65;
    for (let i = 0; i < text.length; i++) { keys.push(+t.toFixed(3)); t += 0.045 + ((i * 7919) % 13) / 420 + (text[i] === ' ' ? 0.03 : 0); }
    slides.push({
      id: 'typing', dur: 5.4, data: { text, keys, press: +(t + 0.2).toFixed(2) },
      html: `${header('Type the topic', 'A labelled diagram, ready for class.')}
        <div class="promptbar pop" style="--d:.35s"><span class="typed"></span><span class="caret"></span><span class="go hgo">✨ Draw</span></div>
        <div class="card big" data-at="${(t + 0.5).toFixed(2)}" style="left:300px;top:286px;width:680px"><div class="pop">${r.svg}</div></div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...keys.map((k, i) => ({ t: k, type: 'click', gain: 0.07, pan: ((i % 5) - 2) * 0.1 })),
        { t: t + 0.2, type: 'ding' }, { t: t + 0.5, type: 'pop', pitch: 0.9, gain: 0.2 }],
    });
  }

  // 2. Labels on - or off, for a quiz
  {
    const on = scene('the volcano', { mode: 'diagram', style: 'sketch' });
    const off = scene('the volcano', { mode: 'diagram', style: 'sketch', blank: true, numbered: true });
    slides.push({
      id: 'tlabels', dur: 5.6,
      html: `${header('One click', 'Labels on - or off, for a quiz.')}
        <div class="card" style="left:64px;top:214px;width:560px"><div class="pop" style="--d:.45s">${on.svg}</div></div>
        <div class="card" data-at="1.5" style="left:656px;top:214px;width:560px"><div class="pop">${off.svg}</div></div>
        <div class="caption rise" style="left:64px;top:548px;width:560px;--d:.8s">For the lesson</div>
        <div class="caption" data-at="1.8" style="left:656px;top:548px;width:560px"><span class="rise">For the test: the numbers stay, the words go</span></div>`,
      sfx: [{ t: 0, type: 'whoosh' }, { t: 0.45, type: 'pop', gain: 0.18 }, { t: 1.5, type: 'pop', pitch: 1.2, gain: 0.18 }],
    });
  }

  // 3. A worksheet to print, and its answer key
  {
    const ws = renderWorksheet('parts of a plant', { mode: 'diagram', kind: 'label', answers: true, style: 'outline' });
    const kinds = ['Label it', 'Count', 'Write about it', 'Colour it'];
    slides.push({
      id: 'tsheet', dur: 5.6,
      html: `${header('Print it', 'A worksheet - and its answer key.')}
        <div class="paper back pop" style="--d:.95s;left:650px;top:186px;width:290px">${asImage(ws.pages[1] || ws.pages[0])}</div>
        <div class="paper pop" style="--d:.5s;left:340px;top:176px;width:300px">${asImage(ws.pages[0])}</div>
        <div class="tag rise" style="--d:1.4s;left:880px;top:212px">✓ Answer key</div>
        <div class="kinds">${kinds.map((k, i) => `<span class="rise" style="--d:${1.6 + i * 0.12}s">${k}</span>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, { t: 0.5, type: 'pop', gain: 0.16 }, { t: 0.95, type: 'pop', pitch: 1.15, gain: 0.14 }, { t: 1.4, type: 'tick', gain: 0.1 }],
    });
  }

  // 4. A quiz card that waits, then shows the answer (the card's own clock and reveal, started midway)
  {
    const { cards } = readOutline('## Quiz: Which planet is closest to the sun?\n- [ ] Venus\n- [x] Mercury\n- [ ] Mars\n- [ ] Earth');
    const card = renderSlide(cards[0], { style: 'chalkboard', width: 640, height: 360 });
    const revealAt = card.duration - 3.4; // (renderSlide: the answer shows 3.4 s before the card ends)
    const showAt = 3.6; // (when it shows in the slide)
    slides.push({
      id: 'tquiz', dur: 6.2,
      html: `${header('Quiz cards', 'They wait - then show the answer.')}
        <div class="card" data-at="${(showAt - revealAt).toFixed(2)}" style="left:250px;top:200px;width:780px"><div>${card.svg}</div></div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...[0.6, 1.4, 2.2, 3.0].map((t) => ({ t, type: 'tick', gain: 0.12 })), { t: showAt, type: 'ding', gain: 0.25 }],
    });
  }

  // 5. Looks that fit a class
  {
    const looks = [['blueprint', 'Blueprint'], ['chalkboard', 'Chalkboard'], ['sketch', 'Sketch'], ['whiteboard', 'Whiteboard']];
    slides.push({
      id: 'tlooks', dur: 5.2,
      html: `${header('Your class, your look', 'Blueprint. Chalkboard. Sketch. Whiteboard.', 'And 19 more - one click apart.')}
        <div class="grid4" style="top:300px">${looks.map(([st, label], i) => `<div class="cell pop" style="--d:${0.5 + i * 0.12}s"><div class="card rel">${scene('the water cycle', { mode: 'diagram', style: st }).svg}</div><div class="label">${label}</div></div>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.5, 4, 0.12, 1)],
    });
  }

  // 6. Goodbye
  slides.push({
    id: 'toutro', dur: 5,
    html: `<div class="center">
      <div class="outrorow pop" style="--d:.2s">${mascot()}<div class="outrobrand">${ICON}${WORDMARK}</div></div>
      <p class="tagline rise" style="--d:.8s">Your lesson, illustrated.</p>
      <p class="url ho rise" style="--d:1.2s">toonaro.com</p>
      <p class="sub rise" style="--d:1.6s">Free to try · works offline in your classroom · nothing leaves your device</p>
    </div>`,
    sfx: [{ t: 0, type: 'whoosh' }, { t: 0.2, type: 'pop', pitch: 0.8, gain: 0.22 }, { t: 0.8, type: 'chime', pitch: 784 }, { t: 1.2, type: 'chime', pitch: 1046.5, gain: 0.12 }],
  });

  return timeline(slides);
}
