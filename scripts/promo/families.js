// "Toonaro for families" (node scripts/promo/build.js --video families): a bedtime story becomes a
// cartoon line by line, your own family as its characters, a printed picture book, any look, the same
// story in three languages, and why it is safe for children (no ads, no accounts, nothing leaves the
// device). Music and captions, no narrator.
import { ICON, WORDMARK, esc, mascot, header, pops, scene, timeline } from './hero.js';
import { composeStory } from '../../src/story.js';

const LINES = [
  'The little moon saw that a star was missing.',
  'He looked behind the clouds.',
  'Under a tree, the little star was crying.',
  'A friendly owl showed them the way.',
  'The star and the owl flew back into the sky.',
  'The moon smiled.',
];
const story = (text, style = 'watercolor') => composeStory(text, { style }).scenes;
/** A picture framed closer: only the part (x, y, w, h) of its 640x360 view */
const crop = (svg, x, y, w, h) => svg.replace(/<svg([^>]*?)\swidth="[\d.]+"\s+height="[\d.]+"\s+viewBox="[^"]*"/, `<svg$1 width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}"`);

export function buildFamilies() {
  const slides = [];

  // 0. For families
  slides.push({
    id: 'fintro', dur: 3.8,
    html: `<div class="center">
      <div class="pop" style="--d:.15s">${mascot()}</div>
      <div class="kicker hk rise" style="--d:.5s">Toonaro for families</div>
      <h1 class="big rise" style="--d:.65s">Your stories, brought to life.</h1>
      <p class="sub rise" style="--d:1.2s">Write a bedtime story - watch it become a cartoon, then print it as a book.</p>
    </div>`,
    sfx: [{ t: 0.05, type: 'whoosh', gain: 0.2 }, { t: 0.15, type: 'pop', pitch: 0.8, gain: 0.22 }, { t: 0.65, type: 'chime' }],
  });

  // 1. The story plays: each line lights up while its scene shows (the page's hook for "stories")
  {
    const scenes = story(LINES.join('\n'));
    const each = 2.15, at = 0.6;
    const beats = LINES.map((_, i) => [i * each, (i + 1) * each]);
    slides.push({
      id: 'stories', dur: at + LINES.length * each + 0.5, data: { beats, at },
      html: `${header('Write a story', 'Watch it become a cartoon.')}
        ${scenes.map((sc, i) => `<div class="card" data-at="${(at + i * each).toFixed(2)}" style="left:64px;top:214px;width:720px"><div>${sc.svg}</div></div>`).join('')}
        <ol class="steps fsteps">${LINES.map((l, i) => `<li class="rise" style="--d:${0.3 + i * 0.08}s"><b>${i + 1}</b>${esc(l)}</li>`).join('')}</ol>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...LINES.map((_, i) => ({ t: at + i * each, type: i ? 'tick' : 'pop', gain: i ? 0.08 : 0.18 }))],
    });
  }

  // 2. Your family as the characters
  {
    const family = [['a grandma with glasses waves', 'Grandma Rose'], ['a man with a short beard smiles', 'Dad'], ['a girl with pigtails jumps', 'Mia'], ['a boy with curly hair laughs', 'Leo']];
    slides.push({
      id: 'ffamily', dur: 5.4,
      html: `${header('Your family in the story', 'Grandma, Dad, Mia and Leo.', 'Make them once - they look the same in every scene. Even with a photo face.')}
        <div class="grid4 portraits" style="top:262px">${family.map(([t, name], i) => `<div class="cell pop" style="--d:${0.5 + i * 0.15}s"><div class="card rel">${crop(scene(t, { style: 'cartoon', seed: 3 + i }).svg, 235, 135, 170, 200)}</div><div class="label">${name}</div></div>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.5, 4, 0.15, 1)],
    });
  }

  // 3. A picture book: its cover and a page spread
  {
    const sc = story(LINES.join('\n'));
    slides.push({
      id: 'fbook', dur: 5.6,
      html: `${header('Print it', 'A picture book for bedtime.')}
        <div class="bcover pop" style="--d:.45s"><div class="btitle">The Little Moon<br>and the Lost Star</div><div class="bpic">${sc[5].svg}</div><div class="bby">by Mia &amp; Grandma Rose</div></div>
        <div class="spread pop" style="--d:1.05s"><div class="bpage"><div class="bpic">${sc[3].svg}</div></div><div class="bpage btext"><p>${esc(LINES[3])}</p><span>4</span></div></div>`,
      sfx: [{ t: 0, type: 'whoosh' }, { t: 0.45, type: 'pop', gain: 0.18 }, { t: 1.05, type: 'whoosh', gain: 0.12 }, { t: 1.1, type: 'pop', pitch: 1.15, gain: 0.14 }],
    });
  }

  // 4. Any look
  {
    const looks = [['watercolor', 'Watercolour'], ['papercut', 'Paper cut'], ['crayon', 'Crayon'], ['pastel', 'Pastel'], ['vintage', 'Vintage'], ['anime', 'Anime'], ['sketch', 'Sketch'], ['cartoon', 'Cartoon']];
    slides.push({
      id: 'flooks', dur: 5.4,
      html: `${header('Any look', 'Watercolour, paper cut, crayon...', 'Your family, in the look your child loves.')}
        <div class="grid4" style="top:262px">${looks.map(([st, label], i) => `<div class="cell pop" style="--d:${0.5 + i * 0.08}s"><div class="card rel">${scene('a grandma, a man, a girl and a boy walk in the park under the sun', { style: st, seed: 3 }).svg}</div><div class="label">${label}</div></div>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.5, 8, 0.08, 1.05)],
    });
  }

  // 5. In three languages
  {
    const langs = [['English', 'The moon smiled.', 'ltr'], ['Deutsch', 'Der Mond lächelte.', 'ltr'], ['العربية', 'ابتسم القمر.', 'rtl']];
    slides.push({
      id: 'flang', dur: 5.2,
      html: `${header('In your language', 'Bedtime stories in English, Deutsch, العربية.')}
        <div class="trio wide" style="top:250px">${langs.map(([name, text, dir], i) => `<div class="pop" style="--d:${0.55 + i * 0.3}s">
          <div class="langq" dir="${dir}"><b>${name}</b> “${esc(text)}”</div>
          <div class="card rel">${crop(story(text)[0].svg, 160, 10, 320, 180)}</div></div>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.55, 3, 0.3, 1)],
    });
  }

  // 6. Safe for children
  {
    const why = [['🚫', 'No ads', 'Nothing to tap away from'], ['👤', 'No accounts', 'No sign-up, no e-mail'], ['🔒', 'Private', 'Nothing leaves your device']];
    slides.push({
      id: 'fsafe', dur: 4.8,
      html: `<div class="center">
        <h1 class="big rise" style="--d:.2s">Made for families.</h1>
        <div class="whys">${why.map(([ic, b, s], i) => `<div class="why pop" style="--d:${0.7 + i * 0.25}s"><span class="ic">${ic}</span><b>${b}</b><span>${s}</span></div>`).join('')}</div>
        <p class="sub rise" style="--d:1.8s">Works offline - on the sofa, on holiday, on the plane.</p>
      </div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.7, 3, 0.25, 0.95)],
    });
  }

  // 7. Goodbye
  slides.push({
    id: 'foutro', dur: 5,
    html: `<div class="center">
      <div class="outrorow pop" style="--d:.2s">${mascot()}<div class="outrobrand">${ICON}${WORDMARK}</div></div>
      <p class="tagline rise" style="--d:.8s">Your stories, brought to life.</p>
      <p class="url ho rise" style="--d:1.2s">toonaro.com</p>
      <p class="sub rise" style="--d:1.6s">Try it free in your browser</p>
    </div>`,
    sfx: [{ t: 0, type: 'whoosh' }, { t: 0.2, type: 'pop', pitch: 0.8, gain: 0.22 }, { t: 0.8, type: 'chime', pitch: 784 }, { t: 1.2, type: 'chime', pitch: 1046.5, gain: 0.12 }],
  });

  return timeline(slides);
}
