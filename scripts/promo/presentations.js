// "Toonaro for presentations" (node scripts/promo/build.js --video presentations): notes become an
// explainer - its cards played one after another (a big number, a comparison, steps), acted scenes
// with grown-up stick figures, any format (16:9, 9:16, 1:1), three languages, and why it suits work:
// it runs on your own computer, so confidential content stays there. Music and captions, no narrator.
import { ICON, WORDMARK, esc, mascot, header, pops, scene, timeline } from './hero.js';
import { readOutline, renderSlide } from '../../src/slides.js';
import { outlineFromNotes } from '../../src/writer.js';

const card = (c, opts = {}) => renderSlide(c, { style: 'whiteboard', width: 640, height: 360, ...opts }).svg;
const cardTime = (c, opts = {}) => renderSlide(c, { style: 'whiteboard', width: 640, height: 360, ...opts }).duration;

export function buildPresentations() {
  const slides = [];

  // 0. For presentations
  slides.push({
    id: 'pintro', dur: 3.8,
    html: `<div class="center">
      <div class="pop" style="--d:.15s">${mascot()}</div>
      <div class="kicker hk rise" style="--d:.5s">Toonaro for presentations</div>
      <h1 class="big rise" style="--d:.65s">Explain anything. In minutes.</h1>
      <p class="sub rise" style="--d:1.2s">Your notes become an explainer video - cards, pictures, charts and captions.</p>
    </div>`,
    sfx: [{ t: 0.05, type: 'whoosh', gain: 0.2 }, { t: 0.15, type: 'pop', pitch: 0.8, gain: 0.22 }, { t: 0.65, type: 'chime' }],
  });

  // 1. Notes in, an outline out (the writer's own outline of these notes)
  {
    const notes = 'Phishing emails are the most common way attackers get in. About 90% of data breaches start with a phishing email. To stay safe, first check the sender, then hover over links before you click, and finally report anything suspicious to IT.';
    const outline = outlineFromNotes(notes).text.split('\n').filter((l) => l.trim());
    slides.push({
      id: 'pnotes', dur: 5.4,
      html: `${header('Paste your notes', 'Toonaro writes the outline.')}
        <div class="notes pop" style="--d:.4s"><b>Your notes</b>${esc(notes)}</div>
        <div class="arrow rise" style="--d:1.3s">→</div>
        <div class="outline">${outline.map((l, i) => `<div class="ol ${l.startsWith('# ') ? 'h1' : l.startsWith('## ') ? 'h2' : 'pt'} rise" style="--d:${1.6 + i * 0.35}s">${esc(l.replace(/^#+\s*|^-\s*/, ''))}</div>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, { t: 0.4, type: 'pop', gain: 0.16 }, { t: 1.3, type: 'whoosh', gain: 0.12 }, ...outline.map((_, i) => ({ t: 1.6 + i * 0.35, type: 'tick', gain: 0.09 }))],
    });
  }

  // 2. The explainer playing: card after card, each from a little way into its own animation
  {
    const { cards } = readOutline('# Stay safe online\n## 90% of breaches start with an email\n- Check the sender before you click\n## Strong vs Weak passwords\n- Long and unique | Short and reused\n- In a password manager | The same everywhere\n## Three steps\n1. Check the sender\n2. Hover over links\n3. Report it to IT');
    const shown = cards.filter((c) => c.kind !== 'title');
    const each = 3.3;
    slides.push({
      id: 'pdeck', dur: 0.6 + shown.length * each,
      html: `${header('The explainer', 'Big numbers. Comparisons. Steps.')}
        ${shown.map((c, i) => {
          // (each card from far enough into its own animation that all its points show while it is on screen)
          const into = Math.max(1.1, cardTime(c, { index: i, total: shown.length }) - each - 0.6);
          return `<div class="card deck" data-at="${(0.5 + i * each).toFixed(2)}" data-off="${(0.5 + i * each - into).toFixed(2)}"><div>${card(c, { index: i, total: shown.length })}</div></div>`;
        }).join('')}
        <div class="deckdots">${shown.map((_, i) => `<i data-at="${(0.5 + i * each).toFixed(2)}"></i>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...shown.map((_, i) => ({ t: 0.5 + i * each, type: i ? 'whoosh' : 'pop', gain: 0.14 }))],
    });
  }

  // 3. Acted scenes among the cards
  {
    const a = scene('a man points at a chart in the office', { style: 'stickman' });
    const b = scene('a man and a woman look at a chart in the office', { style: 'outline' });
    slides.push({
      id: 'pscenes', dur: 5.4,
      html: `${header('Acted scenes', 'Stick figures that present, point and talk.', '"Scene: a man points at a chart in the office" - between your cards.')}
        <div class="card" data-at=".5" style="left:64px;top:250px;width:560px"><div class="pop">${a.svg}</div></div>
        <div class="card" data-at="1.1" style="left:656px;top:250px;width:560px"><div class="pop">${b.svg}</div></div>`,
      sfx: [{ t: 0, type: 'whoosh' }, { t: 0.5, type: 'pop', gain: 0.18 }, { t: 1.1, type: 'pop', pitch: 1.2, gain: 0.18 }],
    });
  }

  // 4. Any format: the same card wide, tall and square
  {
    const { cards } = readOutline('## 90% of breaches start with an email\n- Check the sender before you click');
    const f = (w, h) => card(cards[0], { width: w, height: h, index: 1 });
    slides.push({
      id: 'pformats', dur: 5.2,
      html: `${header('Any format', 'Slides, Reels and posts.')}
        <div class="formatrow">
          <div class="pop" style="--d:.5s"><div class="card rel" style="width:520px">${f(640, 360)}</div><div class="label">16:9 · slides, YouTube</div></div>
          <div class="pop" style="--d:.75s"><div class="card rel" style="width:196px">${f(360, 640)}</div><div class="label">9:16 · Reels, Shorts</div></div>
          <div class="pop" style="--d:1s"><div class="card rel" style="width:300px">${f(480, 480)}</div><div class="label">1:1 · posts</div></div>
        </div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.5, 3, 0.25, 0.95)],
    });
  }

  // 5. In three languages
  {
    const langs = [
      ['English', '## 90% of breaches start with an email\n- Check the sender before you click'],
      ['Deutsch', '## 90 % aller Angriffe beginnen mit einer E-Mail\n- Prüfe immer den Absender'],
      ['العربية', '## ٩٠٪ من الاختراقات تبدأ ببريد إلكتروني\n- تحقق دائمًا من المرسل'],
    ];
    slides.push({
      id: 'plang', dur: 5.2,
      html: `${header('In your language', 'English. Deutsch. العربية.', 'Arabic cards read right to left.')}
        <div class="trio wide" style="top:262px">${langs.map(([name, o], i) => `<div class="pop" style="--d:${0.55 + i * 0.3}s"><div class="langq"><b>${name}</b></div>
          <div class="card rel" data-off="-2">${card(readOutline(o).cards[0], { index: i })}</div></div>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.55, 3, 0.3, 1)],
    });
  }

  // 6. For work
  {
    const why = [['💻', 'On your computer', 'No upload, no cloud AI'], ['📴', 'Works offline', 'On the train, in the meeting room'], ['💶', 'No fees per video', 'Make as many as you need']];
    slides.push({
      id: 'pwork', dur: 4.8,
      html: `<div class="center">
        <h1 class="big rise" style="--d:.2s">Confidential stays confidential.</h1>
        <div class="whys">${why.map(([ic, b, s], i) => `<div class="why pop" style="--d:${0.7 + i * 0.25}s"><span class="ic">${ic}</span><b>${b}</b><span>${s}</span></div>`).join('')}</div>
        <p class="sub rise" style="--d:1.8s">Export as MP4 - or as a web page that plays anywhere.</p>
      </div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.7, 3, 0.25, 0.95)],
    });
  }

  // 7. Goodbye
  slides.push({
    id: 'poutro', dur: 5,
    html: `<div class="center">
      <div class="outrorow pop" style="--d:.2s">${mascot()}<div class="outrobrand">${ICON}${WORDMARK}</div></div>
      <p class="tagline rise" style="--d:.8s">Explain anything. In minutes.</p>
      <p class="url ho rise" style="--d:1.2s">toonaro.com</p>
      <p class="sub rise" style="--d:1.6s">Try it free in your browser</p>
    </div>`,
    sfx: [{ t: 0, type: 'whoosh' }, { t: 0.2, type: 'pop', pitch: 0.8, gain: 0.22 }, { t: 0.8, type: 'chime', pitch: 784 }, { t: 1.2, type: 'chime', pitch: 1046.5, gain: 0.12 }],
  });

  return timeline(slides);
}
