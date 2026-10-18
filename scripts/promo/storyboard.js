// The promo's slides: what each one says and shows, in order. Every picture is drawn by PictoGen
// (scenes, icons, characters); the slides only add titles, captions and layout.
//   slide: { id, dur (s), html, sfx: [{ t (s, from the slide's start), type, ... }], data? }
import { generate, renderIcon, drawConcept, shapesToSvg, parseTimeline } from '../../src/index.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const scene = (text, opts = {}) => generate(text, { style: 'flat', ...opts });
/** The prompt's own steps with set lengths (seconds per step), to fit a scene to its slide */
const timed = (text, lengths, opts = {}) => {
  const beats = parseTimeline(text).beats.map((b, i) => ({ ...b, ...(lengths[i] ? { duration: lengths[i] } : {}) }));
  return generate(text, { style: 'flat', ...opts, beats });
};
/** A person icon framed on the head and shoulders, so the face reads */
const closeUp = (svg) => svg.replace('viewBox="0 0 100 100"', 'viewBox="24 3 52 52"');
const figure = (id, opts) => shapesToSvg(drawConcept(id, { seed: 1, ...opts }), opts.style || 'flat');
const pops = (t0, n, gap, pitch = 1) => Array.from({ length: n }, (_, i) => ({ t: t0 + i * gap, type: 'pop', pitch: pitch + (i % 5) * 0.06, gain: 0.16, pan: ((i % 4) - 1.5) * 0.3 }));
const header = (kicker, title, sub) => `
  <div class="head">
    <div class="kicker rise" style="--d:.15s">${kicker}</div>
    <h1 class="rise" style="--d:.28s">${title}</h1>
    ${sub ? `<p class="sub rise" style="--d:.45s">${sub}</p>` : ''}
  </div>`;
const LOGO = `<svg viewBox="0 0 120 120" class="logo"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>
  <rect x="4" y="4" width="112" height="112" rx="30" fill="url(#lg)"/>
  <rect x="26" y="34" width="68" height="52" rx="10" fill="none" stroke="#fff" stroke-width="7"/>
  <path d="M52 47 L70 60 L52 73 Z" fill="#fff"/>
  <path d="M92 18 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" fill="#fde68a"/></svg>`;

export function buildStoryboard({ studio }) {
  const slides = [];

  // 0. Logo and promise
  {
    const floaters = [['sun', 90, 80], ['rocket', 1100, 90], ['rainbow', 140, 540], ['cat', 1060, 520], ['musical_note', 330, 140], ['balloon', 900, 170], ['party_popper', 250, 400], ['sparkles', 980, 360], ['star', 560, 600], ['movie_camera', 760, 590]];
    const icons = floaters.map(([id, x, y], i) => `<div class="floater pop" style="left:${x}px;top:${y}px;--d:${0.15 + i * 0.09}s"><div class="bob" style="animation-delay:-${i * 0.7}s">${renderIcon(id, { size: 84 })}</div></div>`).join('');
    const word = [...'PictoGen'].map((c, i) => `<span class="pop" style="--d:${0.75 + i * 0.06}s">${c}</span>`).join('');
    slides.push({
      id: 'intro', dur: 5.4,
      html: `${icons}<div class="center">
        <div class="pop" style="--d:.3s">${LOGO}</div>
        <div class="brand">${word}</div>
        <p class="tagline rise" style="--d:1.75s">Type a sentence. Get an animated clip.</p>
        <p class="sub rise" style="--d:2.5s">Animated vector scenes from plain English, in 20 illustration styles</p>
      </div>`,
      sfx: [{ t: 0.05, type: 'whoosh', gain: 0.22 }, ...pops(0.15, 10, 0.09, 0.9), { t: 0.3, type: 'pop', pitch: 0.8, gain: 0.25 },
        ...[...'PictoGen'].map((_, i) => ({ t: 0.75 + i * 0.06, type: 'pop', pitch: 1.1 + i * 0.07, gain: 0.12 })), { t: 1.75, type: 'chime' }],
    });
  }

  // 1. Typing a prompt
  {
    const text = 'a boy walks in, then waves, then a dog runs to him';
    const r = scene(text);
    // Typing rhythm: about 24 characters a second, a little uneven
    const keys = [];
    let t = 0.75;
    for (let i = 0; i < text.length; i++) { keys.push(+t.toFixed(3)); t += 0.032 + ((i * 7919) % 13) / 500 + (text[i] === ' ' ? 0.03 : 0); }
    slides.push({
      id: 'typing', dur: 9.6, data: { text, keys, press: +(t + 0.25).toFixed(2) },
      html: `${header('Text to scene', 'Just describe it.')}
        <div class="promptbar pop" style="--d:.45s"><span class="typed"></span><span class="caret"></span><span class="go">✨ Draw</span></div>
        <div class="card big" data-at="${(t + 0.6).toFixed(2)}" style="left:290px;top:290px;width:700px"><div class="pop">${r.svg}</div></div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...keys.map((k, i) => ({ t: k, type: 'click', gain: 0.07 + (i % 3) * 0.015, pan: ((i % 5) - 2) * 0.1 })),
        { t: t + 0.25, type: 'ding' }, { t: t + 0.6, type: 'pop', pitch: 0.9, gain: 0.22 }],
    });
  }

  // 2. Styles
  {
    const text = 'a girl and a dog under a tree with the sun';
    const A = ['flat', 'cartoon', 'sketch', 'neon', 'pixel', 'papercut', 'cute2d', 'chalkboard'];
    const B = ['pastel', 'vintage', 'blueprint', 'comic', 'doodle', 'outline', 'geometric', 'silhouette'];
    const grid = (list, at, cls) => `<div class="grid4 ${cls}" ${at ? `data-at="${at}"` : ''}>${list.map((st, i) => `
      <div class="cell pop" style="--d:${0.55 + i * 0.1}s"><div class="card">${scene(text, { style: st }).svg}</div><div class="label">${st === 'cute2d' ? 'Cute 2D' : st[0].toUpperCase() + st.slice(1)}</div></div>`).join('')}</div>`;
    slides.push({
      id: 'styles', dur: 8.4,
      html: `${header('20 illustration styles', 'One sentence. Any look.')}
        <div class="quote rise" style="--d:.4s">“${esc(text)}”</div>
        ${grid(A, null, 'gridA')}${grid(B, 3.9, 'gridB')}`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.55, 8, 0.1), { t: 3.85, type: 'whoosh', gain: 0.14 }, ...pops(4.45, 8, 0.1, 1.15)],
    });
  }

  // 3. Faces
  {
    const moods = [['boy', 'happy', 'Happy'], ['girl', 'laugh', 'Laughing'], ['man', 'surprised', 'Surprised'], ['woman', 'sad', 'Sad'], ['boy', 'wink', 'Wink'],
      ['girl', 'angry', 'Angry'], ['man', 'confused', 'Confused'], ['woman', 'skeptical', 'Skeptical'], ['girl', 'talking', 'Talking'], ['boy', 'neutral', 'Calm']];
    slides.push({
      id: 'faces', dur: 6.8,
      html: `${header('Faces with feelings', 'Characters that emote', 'Ten expressions, blinking eyes and talking mouths, in every style')}
        <div class="grid5">${moods.map(([id, ex, label], i) => `
          <div class="face pop" style="--d:${0.6 + i * 0.08}s">${closeUp(renderIcon(id, { style: 'cartoon', expression: ex, animation: ex === 'talking' ? 'talk' : undefined, size: 132, seed: i }))}<div class="label dark">${label}</div></div>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.6, 10, 0.08, 1.05)],
    });
  }

  // 4. One skeleton
  {
    const cast = [['boy', { animation: 'run', view: 'side' }, 'Runs'], ['woman', { animation: 'walk', view: 'side' }, 'Walks'], ['dog', { animation: 'run' }, 'Gallops'],
      ['cat', { animation: 'walk' }, 'Trots'], ['bird', { animation: 'flap' }, 'Flaps'], ['penguin', { animation: 'wave', view: 'front' }, 'Waves'],
      ['elephant', { animation: 'wave' }, 'Trunk wave'], ['lion', { animation: 'jump' }, 'Leaps'], ['rabbit', { animation: 'jump' }, 'Hops'], ['dog', { animation: 'wag', seed: 3 }, 'Wags']];
    slides.push({
      id: 'skeleton', dur: 8,
      html: `${header('Everything moves', 'One skeleton for people and animals', 'Heads, legs, knees, wings, tails: every motion works on every figure')}
        <div class="grid5">${cast.map(([id, o, label], i) => `
          <div class="stage pop" style="--d:${0.6 + i * 0.08}s"><svg viewBox="-8 -12 116 118">${figure(id, o)}</svg><div class="label dark">${id[0].toUpperCase() + id.slice(1)} · ${label}</div></div>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.6, 10, 0.08, 0.95)],
    });
  }

  // 5. Depth
  {
    const text = 'a girl walks toward us, then waves, then walks away into the distance';
    const r = timed(text, [3.0, 1.7, 2.7], { style: 'cartoon' });
    slides.push({
      id: 'depth', dur: 8.6,
      html: `${header('Real depth', 'Toward the camera. Into the distance.')}
        <div class="quote rise" style="--d:.4s">“${esc(text)}”</div>
        <div class="card big" data-at="0.7" style="left:250px;top:262px;width:780px"><div class="pop">${r.svg}</div></div>`,
      sfx: [{ t: 0, type: 'whoosh' }, { t: 0.7, type: 'pop', pitch: 0.9, gain: 0.2 }],
    });
  }

  // 6. Stories
  {
    const text = 'A boy walks in. When the dog arrives, he jumps. Then they dance.';
    const r = timed(text, [1.9, 2.1, 1.7, 2.4], { style: 'cartoon' });
    const steps = ['The boy walks in', 'The dog arrives', 'The boy jumps', 'They dance together'];
    const beats = r.beats.map((b) => [b.t0, b.t1]);
    const at = 0.7;
    slides.push({
      id: 'stories', dur: 10.4, data: { beats, at },
      html: `${header('Stories that unfold', 'Say what happens, step by step')}
        <div class="quote rise" style="--d:.4s">“${esc(text)}”</div>
        <div class="card big" data-at="${at}" style="left:64px;top:262px;width:720px"><div class="pop">${r.svg}</div></div>
        <ol class="steps">${steps.map((s, i) => `<li class="rise" style="--d:${0.8 + i * 0.12}s"><b>${i + 1}</b>${s}</li>`).join('')}</ol>
        <div class="also rise" style="--d:1.5s">Also understands <i>while</i>, <i>after</i>, <i>before</i>, <i>until</i> and <i>for 3 seconds</i></div>`,
      sfx: [{ t: 0, type: 'whoosh' }, { t: at, type: 'pop', pitch: 0.9, gain: 0.2 }, ...beats.map(([t0], i) => ({ t: at + t0 + 0.02, type: 'tick', gain: 0.1, pan: i % 2 ? 0.2 : -0.2 }))],
    });
  }

  // 7. Camera
  {
    const zoom = timed('a girl walks in under a tree, then the camera zooms in on her, then she waves', [2.4, 1.6, 2.2], { style: 'pastel' });
    const follow = scene('the camera follows a dog running across the park', { style: 'cartoon' });
    slides.push({
      id: 'camera', dur: 8.2,
      html: `${header('Camera moves', 'Zoom, pan and follow')}
        <div class="card" data-at="0.6" style="left:64px;top:240px;width:560px"><div class="pop">${zoom.svg}</div></div>
        <div class="card" data-at="0.9" style="left:656px;top:240px;width:560px"><div class="pop">${follow.svg}</div></div>
        <div class="caption rise" style="left:64px;top:572px;width:560px;--d:1s">“…then the camera zooms in on her”</div>
        <div class="caption rise" style="left:656px;top:572px;width:560px;--d:1.2s">“the camera follows a dog running across the park”</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, { t: 0.6, type: 'pop', gain: 0.18 }, { t: 0.9, type: 'pop', pitch: 1.2, gain: 0.18 }, { t: 3.0, type: 'whoosh', gain: 0.09 }],
    });
  }

  // 8. The studio (a real recording)
  {
    const w = 610, h = Math.round((w * studio.height) / studio.width);
    slides.push({
      id: 'studio', dur: 10, data: { studio, w, h },
      html: `<div class="head narrow">
          <div class="kicker rise" style="--d:.15s">The studio</div>
          <h1 class="rise" style="--d:.28s">Change any step.<br>No retyping.</h1>
          <ul class="points">
            <li class="rise" style="--d:.8s">Every scene gets a timeline: one lane per character</li>
            <li data-at="4.9"><span class="rise">Click a step to change it, and the clip redraws</span></li>
            <li data-at="6.2"><span class="rise">Drag to retime, undo, redo</span></li>
            <li data-at="7.9"><span class="rise">Save scenes into a clip with captions</span></li>
          </ul>
        </div>
        <div class="browser pop" style="--d:.35s;left:600px;top:52px;width:${w}px">
          <div class="bar"><i></i><i></i><i></i><span>PictoGen Studio</span></div>
          <div class="screen" style="height:${Math.min(h, 590)}px"><div class="zoomer" style="width:${w}px;height:${h}px">
            <img class="shot" alt="">
            <div class="dropdown"><div>walks in</div><div>waves</div><div>jumps</div><div>dances</div><div>cheers</div></div>
            <div class="cursor"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M3 2 L3 20 L8 15 L11.5 22 L14.5 20.5 L11 13.8 L18 13.8 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg><span class="ripple"></span></div>
          </div></div>
        </div>`,
      sfx: [{ t: 0, type: 'whoosh' }, { t: 0.35, type: 'pop', gain: 0.18 }, { t: 2.5, type: 'click', gain: 0.22 }, { t: 3.9, type: 'click', gain: 0.22 },
        { t: 4.75, type: 'click', gain: 0.22 }, { t: 4.85, type: 'pop', pitch: 1.3, gain: 0.16 }, { t: 7.75, type: 'click', gain: 0.22 }, { t: 7.85, type: 'ding', gain: 0.1 }],
    });
  }

  // 9. More than scenes
  {
    const modes = [
      ['Comic strips', scene('a boy discovers an apple tree', { mode: 'comic', style: 'comic' })],
      ['2.5D dioramas', scene('tree, house and car on a sunny day', { mode: 'isometric' })],
      ['Letter pals', scene('HELLO', { mode: 'alphabet' })],
      ['Coloring pages', scene('a cat, a flower and a butterfly', { mode: 'coloring' })],
      ['Sticker sheets', scene('rocket, guitar, pizza, cat, rainbow, camera', { mode: 'icons', style: 'cartoon' })],
      ['Flat-lays', scene('apple, bike, tree, sun, book, camera', { mode: 'knolling' })],
    ];
    slides.push({
      id: 'modes', dur: 7.6,
      html: `${header('More than scenes', 'Comics, dioramas, letters and coloring pages')}
        <div class="grid3">${modes.map(([label, r], i) => `<div class="cell pop" style="--d:${0.55 + i * 0.12}s"><div class="card fit">${r.svg}</div><div class="label">${label}</div></div>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.55, 6, 0.12, 0.9)],
    });
  }

  // 10. Export and facts
  {
    const formats = [['SVG', 'Sharp at any size'], ['PNG', 'Pictures'], ['GIF', 'Loops'], ['MP4', 'Video'], ['HTML', 'Clip player']];
    const facts = ['Runs offline', 'No AI service needed', 'Zero dependencies', '3,200+ icons', 'Clip Studio with captions'];
    slides.push({
      id: 'export', dur: 6.6,
      html: `${header('Share it anywhere', 'Export the way you need it')}
        <div class="formats">${formats.map(([f, d], i) => `<div class="format pop" style="--d:${0.6 + i * 0.12}s"><b>${f}</b><span>${d}</span></div>`).join('')}</div>
        <div class="facts">${facts.map((f, i) => `<span class="rise" style="--d:${1.6 + i * 0.15}s">✓ ${f}</span>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, ...pops(0.6, 5, 0.12, 1), ...facts.map((_, i) => ({ t: 1.6 + i * 0.15, type: 'tick', gain: 0.07 }))],
    });
  }

  // 11. Outro
  {
    const parade = [['boy', { animation: 'walk', view: 'side', seed: 5 }], ['dog', { animation: 'run' }], ['girl', { animation: 'run', view: 'side' }], ['penguin', { animation: 'walk', view: 'front' }], ['bird', { animation: 'flap' }]];
    slides.push({
      id: 'outro', dur: 6,
      html: `<div class="center">
          <div class="pop" style="--d:.2s">${LOGO}</div>
          <div class="brand pop" style="--d:.45s">PictoGen</div>
          <p class="tagline rise" style="--d:.9s">Text to clip.</p>
          <p class="sub rise" style="--d:1.4s">Every picture in this video was drawn by PictoGen.</p>
        </div>
        <div class="parade">${parade.map(([id, o], i) => `<svg class="walker" style="animation-delay:-${i * 1.6}s" viewBox="-8 -12 116 118">${figure(id, o)}</svg>`).join('')}</div>`,
      sfx: [{ t: 0, type: 'whoosh' }, { t: 0.2, type: 'pop', pitch: 0.8, gain: 0.22 }, { t: 0.45, type: 'chime', pitch: 784 }, { t: 0.9, type: 'chime', pitch: 1046.5, gain: 0.12 }],
    });
  }

  // Timing: each slide starts as the previous one fades (0.45s overlap)
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
