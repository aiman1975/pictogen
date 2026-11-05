// Scene composer: places matched concepts into a simple illustrated scene
// (sky / ground / water, day / night / sunset / snow / rain) for stories, slides and blog posts.

import { conceptOf, whoOf, lookOf } from './individuals.js';
import { lipKeys, lipCss } from './speech.js';
import { layoutBubbles } from './bubble.js';
import { emote } from './emotes.js';
import { HEIGHTS, mergeFeatures } from './looks.js';
import { actionCues, stillCues, soundTrack, voiceOf, thingCues, ambienceOf } from './sound.js';
import { getConcept } from './concepts/index.js';
import { detectMood, moodChoice, moodLight, moodCamera, MOOD_STINGS } from './mood.js';
import { sceneCard, placeLabel } from './scene-card.js';
import { directShots, shotChoice, shakeCss, SHOT_ANGLES } from './director.js';
import { createKit } from './core/kit.js';
import { createRng } from './core/rng.js';
import { drawConcept, shapesToSvg, svgDoc, newUid, styleWrap, esc } from './core/render.js';
import { getStyle } from './core/styles.js';
import { darken, lighten, mix } from './core/color.js';
import { PLACE_ENV_WORDS, applySetting, extras, placeSky, shootingStar, bigShootingStar, space, underwater, desert, mountains, farm, jungle, castle, autumnLeaves } from './places.js';

export const ENV_WORDS = {
  night: ['night', 'midnight', 'nighttime', 'dark', 'bedtime', 'sleep', 'sleeping', 'asleep', 'moon', 'stars'],
  sunset: ['sunset', 'sunrise', 'dusk', 'dawn', 'evening'],
  snow: ['snow', 'snowy', 'snowing', 'winter', 'christmas', 'frozen', 'blizzard'],
  rain: ['rain', 'raining', 'rainy', 'storm', 'stormy', 'thunder', 'cloudy'],
  water: ['sea', 'ocean', 'lake', 'river', 'beach', 'pond', 'swim', 'swimming', 'sail', 'sailing', 'water', 'island', 'boat'],
  beach: ['beach', 'sand', 'island', 'shore'],
  room: ['room', 'office', 'indoor', 'inside', 'indoors', 'studio', 'classroom', 'school', 'lesson', 'kitchen', 'bedroom', 'desk', 'home', 'board', 'chalkboard', 'blackboard', 'whiteboard'],
  forest: ['forest', 'woods', 'park', 'nature', 'jungle', 'garden'],
  city: ['city', 'town', 'downtown', 'skyline', 'skyscraper', 'skyscrapers', 'building', 'buildings', 'urban', 'street'],
  parallax: ['walk', 'walking', 'run', 'running', 'jog', 'jogging', 'stroll', 'across', 'drive', 'driving', 'road', 'street', 'cartoon', 'parallax', 'zeichentrick'],
  // More places, each with its own movement (src/places.js)
  ...PLACE_ENV_WORDS,
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Sitting or working at a desk or a table ("sits at his desk", "works at the table"), and the things
// that go on it, with their height as a share of a standing person's
// In bed and awake ("lies in bed", "reads in bed", "still awake in her bedroom", "can't sleep")
export const IN_BED_RE = /\b(in bed|lies|lying|lay|awake|cant sleep|can t sleep|cannot sleep|couldnt sleep|couldn t sleep)\b/;
const IN_BED_THINGS = new Set(['mobile_phone', 'book', 'open_book', 'books', 'laptop', 'notebook', 'teddy_bear']);
export const DESK_RE = /\b(sits?|sat|sitting|works?|worked|working|types?|typed|typing|writes|wrote|writing|studies|studied|studying)\s+(?:[a-z]+\s+){0,3}?at\s+(?:the\s+|his\s+|her\s+|their\s+|a\s+|my\s+|your\s+|our\s+)?(desk|table|workbench)\b/;
const DESK_SIZES = { laptop: 0.19, desktop_computer: 0.25, mobile_phone: 0.1, hot_beverage: 0.1, teacup_without_handle: 0.08, book: 0.1, books: 0.12,
  open_book: 0.07, notebook: 0.07, pencil: 0.08, spiral_calendar: 0.1, calendar: 0.1, envelope: 0.06, e_mail: 0.09, memo: 0.08, clipboard: 0.12,
  telephone: 0.09, keyboard: 0.05, computer_mouse: 0.04, potted_plant: 0.14, desk_lamp: 0.18, lamp: 0.18, apple: 0.05, cup: 0.07, mug: 0.07 };
const DESK_THINGS = new Set(Object.keys(DESK_SIZES));
// A bed with someone asleep in it (in the sleeper's own units: their standing height is 100): the
// frame and headboard, the mattress, a pillow, the sleeper lying with their head on it, a blanket
function bedDrawing(it, style, olk) {
  const plain = ['stickman', 'whiteboard', 'editorial', 'blueprint', 'doodle', 'sketch', 'outline'].includes(style);
  const wood = plain ? '#ffffff' : '#a1887f', sheet = plain ? '#ffffff' : '#7986cb';
  const d = createKit();
  const line = { stroke: '#37474f', sw: 2.6, kind: 'body' };
  d.rect(-14, 48, 9, 48, { rx: 3, fill: wood, ...line }); // headboard
  d.rect(-8, 76, 124, 11, { rx: 2, fill: wood, ...line }); // frame
  d.line(-4, 87, -4, 96, { ...line, kind: 'line', sw: 3 }); d.line(112, 87, 112, 96, { ...line, kind: 'line', sw: 3 });
  d.rect(-6, 68, 120, 10, { rx: 4, fill: '#fafafa', ...line }); // mattress
  d.ellipse(10, 66, 14, 6, { fill: '#ffffff', ...line }); // pillow
  const back = shapesToSvg(d.shapes, style, { olk });
  // (lying down: turned a quarter, head on the pillow, eyes shut)
  // (asleep: eyes shut; awake: as they feel)
  const awake = !it.inBed?.asleep;
  const sleeper = shapesToSvg(drawConcept(it.c, { ...it.look, color: it.m.color, expression: awake ? (it.m.expression || 'neutral') : 'sleepy', style }), style, { olk });
  const b = createKit();
  // (up to the chin, over the arms too)
  b.path('M 27 46 Q 29 40 36 40 L 110 41 Q 117 41 117 49 L 117 77 Q 117 82 110 82 L 27 82 Q 24 64 27 46 Z', { fill: sheet, ...line }); // blanket
  b.line(33, 47, 111, 47, { stroke: plain ? '#37474f' : '#5c6bc0', sw: 1.6, kind: 'line', opacity: 0.6 });
  // (awake, a hand up holding a phone or a book over the blanket, where they can see it)
  let held = '';
  const t = awake && it.inBed?.holds;
  if (t) {
    const k = 0.22;
    held = `<g class="pg-in-bed-holds" data-id="${t.c.id}" transform="translate(${r2(36 - 50 * k)} ${r2(40 - (t.c.baseline ?? 96) * k)}) scale(${k})">${shapesToSvg(drawConcept(t.c, { ...t.look, color: t.m.color, style }), style, { olk: olk / k })}</g>`;
    const hand = createKit();
    hand.line(40, 46, 37, 38, { stroke: '#37474f', sw: 2.2, kind: 'line' });
    held = shapesToSvg(hand.shapes, style, { olk }) + held;
  }
  return `${back}<g class="pg-sleeper${awake ? ' pg-awake' : ''}" transform="translate(0 12) rotate(-90 50 50)">${sleeper}</g>${shapesToSvg(b.shapes, style, { olk })}${held}`;
}

// A desk, wider than a table drawing: a top, two legs, a drawer on one side (in a table's units)
function deskDrawing(style, olk) {
  const d = createKit();
  const ink = { stroke: '#000000', kind: 'line', strokeLinecap: 'round' };
  const wood = ['stickman', 'whiteboard', 'editorial', 'blueprint', 'doodle', 'sketch', 'lineart'].includes(style) ? '#ffffff' : '#c8915a';
  d.rect(-14, 46, 128, 9, { rx: 2, fill: wood, stroke: '#000000', sw: 3.2, kind: 'body' });
  d.line(-6, 55, -6, 96, { ...ink, sw: 3.4 });
  d.rect(78, 55, 28, 38, { fill: wood, stroke: '#000000', sw: 3, kind: 'body' });
  d.line(84, 67, 100, 67, { ...ink, sw: 2.2 }); d.line(84, 80, 100, 80, { ...ink, sw: 2.2 });
  return shapesToSvg(d.shapes, style, { olk });
}
// The board on a classroom's wall ("points at the board", "a whiteboard")
const BOARD_WORDS = ['board', 'chalkboard', 'blackboard', 'whiteboard'];

// (what someone thinks or dreams of is not where they are: "thinks about the reef")
const THINK_WORDS = new Set(['think', 'thinks', 'thinking', 'thought', 'dream', 'dreams', 'dreaming', 'dreamed', 'dreamt', 'imagine', 'imagines', 'imagining', 'remember', 'remembers', 'remembering', 'wonder', 'wonders', 'wondering']);
function detectEnv(items, words) {
  words = words.filter((x, i) => !(['about', 'of'].includes(words[i - 1]) && THINK_WORDS.has(words[i - 2])) && !(['about', 'of'].includes(words[i - 2]) && THINK_WORDS.has(words[i - 3]) && ['the', 'a', 'an', 'his', 'her', 'their'].includes(words[i - 1])));
  const w = new Set(words);
  const any = (k) => ENV_WORDS[k].some((x) => w.has(x));
  const ids = new Set(items.map((i) => i.c.id));
  const tags = new Set(items.flatMap((i) => i.c.tags || []));
  const sunset = any('sunset');
  // (furniture is indoors, unless the words say where: "a bench in the park", "a chair outside")
  const place = (k) => any(k) || (k === 'underwater' && /\bunder (the )?(sea|ocean|water)\b|\bocean floor\b|\bsea ?bed\b/.test(words.join(' ')))
    || (k === 'space' && /\b(outer space|on the moon|in space)\b/.test(words.join(' ')));
  const places = Object.fromEntries(Object.keys(PLACE_ENV_WORDS).map((k) => [k, place(k)]));
  const outdoors = ['park', 'garden', 'outside', 'outdoors', 'yard', 'street', 'meadow'].some((x) => w.has(x)) || any('forest') || any('beach') || Object.values(places).some(Boolean);
  const room = !outdoors && (any('room') || tags.has('furniture') || ['chair', 'table', 'window', 'door', 'bed', 'box', 'sofa'].some((id) => ids.has(id)));
  const parallax = any('parallax') || items.some((it) => ['walk', 'run', 'walk-across', 'drive'].includes(it.m?.animation));
  const forest = any('forest') || tags.has('plant') || ids.has('tree');
  // Which room: a classroom, an office, a kitchen, a bedroom, or just a room
  const roomKind = !room ? null
    : w.has('classroom') || w.has('school') || w.has('lesson') || BOARD_WORDS.some((b) => w.has(b)) ? 'classroom'
      : w.has('office') || w.has('desk') ? 'office'
        : w.has('kitchen') ? 'kitchen'
          : w.has('bedroom') || ids.has('bed') ? 'bedroom' : 'room';
  return {
    night: !sunset && (any('night') || ((ids.has('moon') || ids.has('star')) && !ids.has('sun'))),
    sunset,
    snow: any('snow') || tags.has('winter'),
    rain: any('rain') || ids.has('rain'),
    water: any('water') || any('beach') || items.some((i) => i.c.placement === 'water' || i.c.placement === 'underwater'),
    beach: any('beach'),
    room,
    roomKind,
    // (a whiteboard instead of the chalkboard, when the words say so)
    ...(w.has('whiteboard') ? { whiteboard: true } : {}),
    forest,
    // A place named: trees along the horizon (a park, a forest), buildings (a city)
    woods: any('forest') && !places.jungle,
    park: w.has('park') || w.has('garden'),
    city: !room && any('city'),
    parallax,
    // (one place drawn: space, then underwater, the desert, a farm, a jungle; mountains and a
    // castle go behind; autumn leaves fall on any of them)
    space: places.space,
    underwater: !places.space && places.underwater,
    desert: !places.space && !places.underwater && places.desert,
    farm: !places.space && !places.underwater && !places.desert && places.farm,
    jungle: !places.space && !places.underwater && !places.desert && places.jungle,
    mountains: !places.space && !places.underwater && places.mountains && !ids.has('mountain'),
    castle: !places.space && !places.underwater && places.castle && !ids.has('castle'),
    autumn: !places.space && !places.underwater && places.autumn,
    sun: ids.has('sun'),
    // (moving things said in words: "fireflies", "a shooting star")
    extras: new Set([...(any('fireflies') ? ['fireflies'] : []), ...(/\bshooting stars?\b/.test(words.join(' ')) ? ['shooting'] : [])]),
  };
}

function palette(env) {
  let sky = ['#8fd3ff', '#b5e3ff', '#dcf3ff'];
  let ground = ['#9ccc65', '#8bc34a', '#7cb342'];
  let water = ['#4fc3f7', '#29b6f6'];
  if (env.sunset) sky = ['#ff8a65', '#ffab76', '#ffd59e'];
  if (env.rain) sky = ['#90a4ae', '#a7b6bd', '#c5d0d5'];
  if (env.autumn) ground = ['#c5a35a', '#b8964e', '#a88844'];
  if (env.snow) ground = ['#eef3f7', '#e3eaf0', '#d7e0e8'];
  if (env.night) {
    sky = ['#101a40', '#1a2a5c', '#253a73'];
    ground = ground.map((c) => darken(c, 0.55));
    water = water.map((c) => darken(c, 0.55));
  } else if (env.sunset) {
    ground = ground.map((c) => mix(c, '#ff7043', 0.15));
  }
  return { sky, ground, water, sand: env.night ? darken('#f3d39b', 0.5) : '#f3d39b' };
}

// Indoors: wall and floor colors per style (the rest a light grey room)
const ROOM_COLORS = {
  cartoon: ['#ffe8a3', '#c98a4b'], anime: ['#fdf0d5', '#c79a6b'], letterling: ['#ffd6ea', '#f9a8d4'],
  watercolor: ['#f1e6d0', '#d6bd94'], crayon: ['#fff3b8', '#f4b183'], pastel: ['#e9edff', '#dfe6fb'],
  comic: ['#fde68a', '#d98b3a'], pixel: ['#7e2553', '#ab5236'], sketch: ['#fffdf5', '#e7e5e4'],
  vintage: ['#efe2c9', '#c9a882'], neon: ['#14183a', '#0b1026'], blueprint: ['#0e2646', '#0a1d37'],
  chalkboard: ['#223830', '#192823'], silhouette: ['#eceff1', '#cfd8dc'],
};

// The things on a room's walls and floor, by kind of room, in colors that sit with the style's
// wall (dark walls - neon, blueprint, chalkboard - get light outlines)
function roomDecor(d, env, W, H, wall, floor) {
  const bg = { kind: 'bg' };
  const dark = darkness(wall) > 0.6;
  const tone = (c, k = 0.3) => mix(c, wall, k);
  const ink = dark ? lighten(wall, 0.45) : '#334155';
  const edge = { kind: 'line', stroke: ink, sw: 2.2 };
  const floorY = H * 0.88;
  const glass = env.night ? '#1a2a5c' : '#bfe6ff';
  const windowAt = (x, y, w, h, view) => {
    d.rect(x - 4, y - 4, w + 8, h + 8, { ...bg, fill: tone('#ffffff', 0.15), rx: 3 });
    d.rect(x, y, w, h, { ...bg, fill: tone(glass, 0.15) });
    if (view) view(x, y, w, h);
    d.line(x + w / 2, y, x + w / 2, y + h, { ...edge, stroke: tone('#ffffff', 0.15), sw: 3 });
    d.line(x, y + h / 2, x + w, y + h / 2, { ...edge, stroke: tone('#ffffff', 0.15), sw: 3 });
    d.rect(x - 4, y - 4, w + 8, h + 8, { ...edge, fill: 'none', rx: 3 });
  };
  const clock = (x, y, r) => {
    d.circle(x, y, r, { ...bg, fill: tone('#ffffff', 0.1) });
    d.circle(x, y, r, { ...edge, fill: 'none' });
    d.line(x, y, x, y - r * 0.65, { ...edge, sw: 2 });
    d.line(x, y, x + r * 0.45, y + r * 0.1, { ...edge, sw: 2 });
  };
  const frame = (x, y, w, h, paint) => {
    d.rect(x, y, w, h, { ...bg, fill: tone('#a1683a', 0.2) });
    d.rect(x + 4, y + 4, w - 8, h - 8, { ...bg, fill: tone('#fff7e6', 0.15) });
    if (paint) paint(x + 4, y + 4, w - 8, h - 8);
    d.rect(x, y, w, h, { ...edge, fill: 'none' });
  };
  const hills = (x, y, w, h) => {
    d.path(`M ${x} ${y + h} Q ${x + w * 0.3} ${y + h * 0.3} ${x + w * 0.6} ${y + h * 0.75} Q ${x + w * 0.8} ${y + h * 0.45} ${x + w} ${y + h * 0.6} L ${x + w} ${y + h} Z`, { ...bg, fill: tone('#66bb6a', 0.2) });
    d.circle(x + w * 0.75, y + h * 0.28, Math.min(w, h) * 0.13, { ...bg, fill: tone('#ffca28', 0.2) });
  };
  const towers = (x, y, w, h) => {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const bh = h * (0.35 + ((i * 37) % 50) / 100), bx = x + (w / n) * i + 1;
      d.rect(bx, y + h - bh, w / n - 2, bh, { ...bg, fill: tone(env.night ? '#2c3e66' : '#90a4ae', 0.15) });
      for (let wy = y + h - bh + 4; wy < y + h - 4; wy += 7) d.rect(bx + 3, wy, w / n - 8, 2.5, { ...bg, fill: env.night ? '#ffe082' : tone('#e3f2fd', 0.1) });
    }
  };
  // The board: a chalkboard (or a whiteboard) with "1 + 2 = 3" and a line of writing, or the words
  // the prompt or the place asks for (env.boardText)
  const board = (bx, by, bw, bh) => d.group({ class: 'pg-board' }, () => drawBoard(bx, by, bw, bh));
  const drawBoard = (bx, by, bw, bh) => {
    const white = env.whiteboard || env.roomCustom?.board === 'white';
    d.rect(bx - 6, by - 6, bw + 12, bh + 12, { ...bg, fill: white ? tone('#b0bec5', 0.15) : tone('#a1683a', 0.15), rx: 3 });
    d.rect(bx, by, bw, bh, { ...bg, fill: white ? '#fcfdfe' : '#2f5d46' });
    const chalk = { kind: 'line', stroke: white ? '#1565c0' : '#f1f5f9', sw: 2.4 };
    const u = bh / 6, cx0 = bx + bw * 0.12, cy0 = by + bh * 0.3;
    if (env.boardText) {
      // (the words, as big as fit: one or two lines)
      const words = String(env.boardText).slice(0, 60), lines = words.length > 22 ? splitBoard(words) : [words];
      const size = Math.min(bh * (lines.length > 1 ? 0.26 : 0.36), (bw * 0.9) / Math.max(...lines.map((l) => l.length)) * 1.7);
      const ys = lines.length > 1 ? [by + bh * 0.42, by + bh * 0.76] : [by + bh * 0.6];
      lines.forEach((l, i) => d.raw(`<text x="${r2(bx + bw / 2)}" y="${r2(ys[i])}" text-anchor="middle" font-family="${BOARD_FONT}" font-size="${r2(size)}" font-weight="700" fill="${white ? '#1565c0' : '#f1f5f9'}">${esc(l)}</text>`, { kind: 'detail' }));
    } else {
      // "1 + 2 = 3" in chalk strokes, and a wavy line of "writing"
      d.line(cx0, cy0 - u, cx0, cy0 + u, chalk);
      d.line(cx0 + u * 1.2, cy0, cx0 + u * 2.6, cy0, chalk); d.line(cx0 + u * 1.9, cy0 - u * 0.7, cx0 + u * 1.9, cy0 + u * 0.7, chalk);
      d.path(`M ${cx0 + u * 3.2} ${cy0 - u * 0.6} Q ${cx0 + u * 4.2} ${cy0 - u * 1.5} ${cx0 + u * 4.2} ${cy0 - u * 0.3} L ${cx0 + u * 3.2} ${cy0 + u} L ${cx0 + u * 4.4} ${cy0 + u}`, { ...chalk, fill: 'none' });
      d.line(cx0 + u * 5, cy0 - u * 0.3, cx0 + u * 6.2, cy0 - u * 0.3, chalk); d.line(cx0 + u * 5, cy0 + u * 0.3, cx0 + u * 6.2, cy0 + u * 0.3, chalk);
      d.path(`M ${cx0 + u * 6.9} ${cy0 - u * 0.8} Q ${cx0 + u * 8} ${cy0 - u * 1.3} ${cx0 + u * 7.6} ${cy0 - u * 0.1} Q ${cx0 + u * 8.4} ${cy0 + u * 0.6} ${cx0 + u * 6.9} ${cy0 + u}`, { ...chalk, fill: 'none' });
      let wave = `M ${bx + bw * 0.12} ${by + bh * 0.72}`;
      for (let x = bx + bw * 0.12; x < bx + bw * 0.8; x += u) wave += ` q ${u / 4} ${-u / 2} ${u / 2} 0 t ${u / 2} 0`;
      d.path(wave, { ...chalk, sw: 1.8, fill: 'none', opacity: 0.8 });
    }
    d.rect(bx, by + bh + 6, bw, 5, { ...bg, fill: tone(white ? '#90a4ae' : '#8d5a2b', 0.15) });
    d.rect(bx + bw * 0.7, by + bh + 3, bw * 0.06, 3, { ...bg, fill: white ? '#e53935' : '#ffffff' });
  };
  const bunting = () => {
    const flags = ['#ef5350', '#ffca28', '#66bb6a', '#42a5f5', '#ab47bc'];
    for (let i = 0; i < 5; i++) {
      const fx = W * 0.03 + i * W * 0.035;
      d.poly([[fx, H * 0.08], [fx + W * 0.03, H * 0.08], [fx + W * 0.015, H * 0.15]], { ...bg, fill: tone(flags[i], 0.15) });
    }
    d.line(W * 0.02, H * 0.08, W * 0.22, H * 0.08, { ...edge, sw: 1.5 });
  };
  const worldMap = (x, y, w, h) => frame(x, y, w, h, (fx, fy, fw, fh) => {
    d.rect(fx, fy, fw, fh, { ...bg, fill: tone('#81d4fa', 0.15) });
    for (const [px, py, rx, ry] of [[0.22, 0.38, 0.14, 0.2], [0.3, 0.72, 0.08, 0.16], [0.55, 0.35, 0.12, 0.16], [0.58, 0.68, 0.08, 0.14], [0.8, 0.45, 0.14, 0.18]]) d.ellipse(fx + fw * px, fy + fh * py, fw * rx, fh * ry, { ...bg, fill: tone('#81c784', 0.15) });
  });
  const shelf = (sx, sy, sw) => {
    d.rect(sx, sy, sw, 5, { ...bg, fill: tone('#8d6e63', 0.15) });
    ['#5c6bc0', '#26a69a', '#ffa726', '#ec407a', '#78909c'].forEach((c, i) => d.rect(sx + 6 + i * sw * 0.13, sy - H * 0.1 + (i % 2) * 4, sw * 0.1, H * 0.1 - (i % 2) * 4, { ...bg, fill: tone(c, 0.2) }));
  };
  const plant = (x) => {
    d.rect(x - W * 0.03, floorY - H * 0.08, W * 0.06, H * 0.08, { ...bg, fill: tone('#8d6e63', 0.15) });
    for (const [dx, dy] of [[-0.03, -0.17], [0, -0.21], [0.03, -0.16], [-0.015, -0.12], [0.02, -0.11]]) d.ellipse(x + W * dx, floorY + H * dy, W * 0.022, H * 0.05, { ...bg, fill: tone('#43a047', 0.15) });
  };
  const lamp = (x) => {
    d.line(x, floorY, x, floorY - H * 0.36, { ...edge, sw: 2.5 });
    d.path(`M ${x - W * 0.035} ${floorY - H * 0.36} L ${x + W * 0.035} ${floorY - H * 0.36} L ${x + W * 0.022} ${floorY - H * 0.45} L ${x - W * 0.022} ${floorY - H * 0.45} Z`, { ...bg, fill: tone('#ffe082', 0.15) });
    d.ellipse(x, floorY, W * 0.025, H * 0.01, { ...bg, fill: ink });
  };
  // A room made in the studio: the things picked, each in its place on the wall or the floor
  if (env.roomCustom?.things) {
    const x = env.roomCustom.things;
    if (x.has('board')) board(W * 0.27, H * 0.1, W * 0.46, H * 0.28);
    if (x.has('bunting')) bunting();
    const walls = ['window', 'map', 'poster'].filter((t) => x.has(t));
    const at = [[W * 0.05, H * 0.2, W * 0.16, H * 0.22], [W * 0.79, H * 0.14, W * 0.15, H * 0.2]];
    walls.slice(0, 2).forEach((t, i) => {
      const [fx, fy, fw, fh] = at[i];
      if (t === 'window') windowAt(fx + 4, fy + 4, fw - 8, fh - 8, env.night ? (wx, wy, ww, wh) => d.circle(wx + ww * 0.7, wy + wh * 0.3, Math.min(ww, wh) * 0.12, { ...bg, fill: '#fff59d' }) : hills);
      else if (t === 'map') worldMap(fx, fy, fw, fh);
      else frame(fx, fy, fw, fh, hills);
    });
    const rightUsed = walls.length > 1;
    if (x.has('clock')) clock(rightUsed ? W * 0.76 : W * 0.88, rightUsed ? H * 0.47 : H * 0.17, Math.min(W, H) * 0.05);
    if (x.has('shelf')) shelf(W * 0.8, rightUsed ? H * 0.5 : H * 0.34, W * 0.16);
    if (x.has('plant')) plant(W * 0.95);
    if (x.has('lamp')) lamp(W * 0.04);
    return;
  }
  switch (env.roomKind) {
    case 'classroom': {
      // A board with a sum (or the words asked for), a tray of chalk, a clock, an alphabet strip
      board(W * 0.24, H * 0.1, W * 0.52, H * 0.3);
      clock(W * 0.88, H * 0.17, Math.min(W, H) * 0.06);
      bunting();
      break;
    }
    case 'office': {
      // A big window onto the city, a framed chart, a shelf with files, a plant in the corner
      windowAt(W * 0.06, H * 0.1, W * 0.26, H * 0.36, towers);
      const px = W * 0.42, py = H * 0.12, pw = W * 0.16, ph = H * 0.2;
      frame(px, py, pw, ph, (x, y, w, h) => {
        [0.4, 0.65, 0.5, 0.85].forEach((v, i) => d.rect(x + w * (0.12 + i * 0.2), y + h * (0.9 - v * 0.8), w * 0.13, h * v * 0.8, { ...bg, fill: tone(['#42a5f5', '#66bb6a', '#ffca28', '#ef5350'][i], 0.15) }));
      });
      const sx = W * 0.7, sy = H * 0.3, sw = W * 0.24;
      d.rect(sx, sy, sw, 5, { ...bg, fill: tone('#8d6e63', 0.15) });
      ['#5c6bc0', '#26a69a', '#ffa726', '#ec407a', '#78909c'].forEach((c, i) => d.rect(sx + 6 + i * sw * 0.13, sy - H * 0.1 + (i % 2) * 4, sw * 0.1, H * 0.1 - (i % 2) * 4, { ...bg, fill: tone(c, 0.2) }));
      clock(W * 0.82, H * 0.14, Math.min(W, H) * 0.05);
      const pot = W * 0.95;
      d.rect(pot - W * 0.03, floorY - H * 0.08, W * 0.06, H * 0.08, { ...bg, fill: tone('#8d6e63', 0.15) });
      for (const [dx, dy] of [[-0.03, -0.17], [0, -0.21], [0.03, -0.16], [-0.015, -0.12], [0.02, -0.11]]) d.ellipse(pot + W * dx, floorY + H * dy, W * 0.022, H * 0.05, { ...bg, fill: tone('#43a047', 0.15) });
      break;
    }
    case 'kitchen': {
      // Cupboards along the top, tiles, a counter with an oven along the back wall, a window
      const top = H * 0.06, ch = H * 0.2;
      for (let x = W * 0.02; x < W * 0.98 - W * 0.12; x += W * 0.13) {
        if (x > W * 0.38 && x < W * 0.62) continue; // (the window)
        d.rect(x, top, W * 0.12, ch, { ...bg, fill: tone('#ffffff', 0.25), rx: 2 });
        d.rect(x, top, W * 0.12, ch, { ...edge, fill: 'none', sw: 1.6, rx: 2 });
        d.circle(x + W * 0.1, top + ch * 0.85, 2, { ...bg, fill: ink });
      }
      windowAt(W * 0.41, H * 0.08, W * 0.18, H * 0.2, hills);
      const ct = H * 0.56;
      for (let x = 0; x < W; x += H * 0.05) for (let y = H * 0.32; y < ct - 2; y += H * 0.05) d.rect(x + 1, y + 1, H * 0.05 - 2, H * 0.05 - 2, { ...bg, fill: tone('#e0f2f1', 0.35) });
      d.rect(0, ct, W, floorY - ct, { ...bg, fill: tone('#ffffff', 0.35) });
      d.rect(0, ct - 6, W, 8, { ...bg, fill: tone('#90a4ae', 0.2) });
      for (let x = W * 0.03; x < W; x += W * 0.16) d.rect(x, ct + 10, W * 0.13, floorY - ct - 16, { ...edge, fill: 'none', sw: 1.4, rx: 2 });
      // The oven, its window glowing
      const ox = W * 0.67;
      d.rect(ox, ct + 10, W * 0.13, floorY - ct - 16, { ...bg, fill: tone('#cfd8dc', 0.2), rx: 2 });
      d.rect(ox + W * 0.015, ct + 22, W * 0.1, (floorY - ct) * 0.45, { ...bg, fill: tone('#ffb74d', 0.2), rx: 2 });
      // A pot on the hob
      d.rect(ox + W * 0.02, ct - 6 - H * 0.06, W * 0.07, H * 0.06, { ...bg, fill: tone('#e53935', 0.2), rx: 3 });
      break;
    }
    case 'bedroom': {
      // A window with curtains (the moon at night), a framed picture, a rug
      windowAt(W * 0.1, H * 0.1, W * 0.2, H * 0.3, env.night ? (x, y, w, h) => d.circle(x + w * 0.7, y + h * 0.3, Math.min(w, h) * 0.12, { ...bg, fill: '#fff59d' }) : hills);
      const cur = tone('#f48fb1', 0.2);
      d.path(`M ${W * 0.08} ${H * 0.07} L ${W * 0.14} ${H * 0.07} Q ${W * 0.12} ${H * 0.28} ${W * 0.15} ${H * 0.46} L ${W * 0.08} ${H * 0.46} Z`, { ...bg, fill: cur });
      d.path(`M ${W * 0.32} ${H * 0.07} L ${W * 0.26} ${H * 0.07} Q ${W * 0.28} ${H * 0.28} ${W * 0.25} ${H * 0.46} L ${W * 0.32} ${H * 0.46} Z`, { ...bg, fill: cur });
      d.line(W * 0.06, H * 0.07, W * 0.34, H * 0.07, { ...edge, sw: 3 });
      frame(W * 0.7, H * 0.12, W * 0.14, H * 0.18, (x, y, w, h) => {
        d.circle(x + w * 0.5, y + h * 0.55, Math.min(w, h) * 0.3, { ...bg, fill: tone('#ffca28', 0.2) });
      });
      // (a string of little stars over the bed's side)
      for (let i = 0; i < 6; i++) d.circle(W * (0.45 + i * 0.035), H * (0.12 + (i % 2) * 0.03), 2.4, { ...bg, fill: tone('#ffe082', 0.1) });
      d.ellipse(W * 0.5, H * 0.94, W * 0.32, H * 0.035, { ...bg, fill: tone('#9575cd', 0.35) });
      break;
    }
    default: {
      // Just a room: a window and a picture
      windowAt(W * 0.12, H * 0.12, W * 0.18, H * 0.26, env.night ? null : hills);
      frame(W * 0.72, H * 0.14, W * 0.13, H * 0.17, hills);
    }
  }
  void floor;
}

// The board's words in two lines, split at the space nearest the middle
function splitBoard(text) {
  const mid = text.length / 2;
  let best = -1;
  for (let i = 0; i < text.length; i++) if (text[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return best < 0 ? [text] : [text.slice(0, best), text.slice(best + 1)];
}
// Hand-written looking, where the system has one; Nunito otherwise
const BOARD_FONT = "'Comic Sans MS','Chalkboard SE','Segoe Print','Nunito',sans-serif";

// How dark a color is, 0 (white) .. 1 (black)
function darkness(hex) {
  const n = parseInt(String(hex).replace('#', '').slice(0, 6), 16);
  return 1 - (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

// A city behind the horizon: buildings of all heights (windows lit at night), a pavement and a road
function skyline(d, env, pal, rng, W, H, hY) {
  const bg = { kind: 'bg' };
  const far = mix(pal.sky[2], env.night ? '#0b1430' : '#78909c', 0.55), near = mix(pal.sky[2], env.night ? '#16203f' : '#546e7a', 0.6);
  for (const [color, lo, hi, lit] of [[far, 0.18, 0.4, 0.25], [near, 0.1, 0.3, 0.4]]) {
    let x = -rng() * 20;
    while (x < W) {
      const bw = W * (0.06 + rng() * 0.07), bh = H * (lo + rng() * (hi - lo));
      d.rect(x, hY - bh, bw, bh + 2, { ...bg, fill: color });
      if (rng() < 0.25) d.rect(x + bw * 0.4, hY - bh - H * 0.04, bw * 0.08, H * 0.04, { ...bg, fill: color }); // an antenna
      const win = env.night ? '#ffe082' : mix(color, '#e3f2fd', 0.45);
      for (let wy = hY - bh + 6; wy < hY - 6; wy += 9) {
        for (let wx = x + 4; wx < x + bw - 6; wx += 8) {
          if (rng() < (env.night ? lit : 0.55)) d.rect(wx, wy, 4, 4.5, { ...bg, fill: win, opacity: env.night ? 0.95 : 0.6 });
        }
      }
      x += bw + 2 + rng() * 6;
    }
  }
  // Pavement, kerb and road
  const pave = env.night ? '#455a64' : '#cfd8dc', road = env.night ? '#263238' : '#78909c';
  d.rect(0, hY, W, H - hY, { ...bg, fill: pave });
  for (let x = 0; x < W; x += W * 0.08) d.line(x, hY, x - W * 0.03, H * 0.86, { kind: 'line', stroke: '#000000', sw: 1, opacity: 0.08 });
  d.rect(0, H * 0.86, W, 4, { ...bg, fill: mix(pave, '#ffffff', 0.4) });
  d.rect(0, H * 0.86 + 4, W, H * 0.14, { ...bg, fill: road });
  for (let x = W * 0.03; x < W; x += W * 0.12) d.rect(x, H * 0.94, W * 0.06, 3, { ...bg, fill: '#fff8e1', opacity: 0.8 });
}

// Trees along the horizon (a park, a forest): round crowns in a darker green, overlapping
function treeLine(d, env, pal, rng, W, hY, H) {
  const bg = { kind: 'bg' };
  // (in autumn the trees turn orange and gold)
  const back = env.autumn ? (env.night ? '#6d3a12' : '#d35400') : mix(pal.ground[2], '#1b5e20', 0.45);
  const front = env.autumn ? (env.night ? '#7a5a14' : '#f39c12') : mix(pal.ground[1], '#2e7d32', 0.35);
  const dense = env.woods ? 1 : 0.6;
  for (const [color, size, lift] of [[back, 0.09, 0.07], [front, 0.07, 0.03]]) {
    for (let x = -10; x < W + 10; x += W * size * (1.2 + rng() * 0.8) / dense) {
      const r = H * size * (0.7 + rng() * 0.5);
      d.rect(x - 2, hY - H * lift - r * 0.2, 4, r + H * lift, { ...bg, fill: darken(color, 0.25) });
      d.circle(x, hY - H * lift - r * 0.6, r, { ...bg, fill: color });
    }
  }
}

// A place in a few light pencil lines, for the explainer styles' white canvas: whatever the words
// name (a classroom's whiteboard with its words, an office, a room's window, trees, a city, the
// sea, sun or moon, rain), never so much that the figures stop standing out
function sketchPlace(d, env, W, H, rng) {
  const ink = { kind: 'line', stroke: '#94a3b8', sw: 2, fill: 'none' }, base = H * 0.88;
  const windowAt = (x, y, w, h) => {
    d.rect(x, y, w, h, { ...ink, rx: 2 });
    d.line(x + w / 2, y, x + w / 2, y + h, ink); d.line(x, y + h / 2, x + w, y + h / 2, ink);
    d.line(x - 4, y + h + 3, x + w + 4, y + h + 3, ink);
  };
  const clock = (x, y, r) => { d.circle(x, y, r, ink); d.line(x, y, x, y - r * 0.6, ink); d.line(x, y, x + r * 0.45, y, ink); };
  if (env.room) {
    if (env.roomKind === 'classroom') {
      // The whiteboard, its words in marker
      const bx = W * 0.27, by = H * 0.08, bw = W * 0.46, bh = H * 0.3;
      d.group({ class: 'pg-board' }, () => {
        d.rect(bx, by, bw, bh, { kind: 'line', stroke: '#64748b', sw: 3, fill: '#ffffff', rx: 4 });
        d.line(bx + bw * 0.1, by + bh + 5, bx + bw * 0.9, by + bh + 5, ink);
        if (env.boardText) {
          const words = String(env.boardText).slice(0, 60), lines = words.length > 22 ? splitBoard(words) : [words];
          const size = Math.min(bh * (lines.length > 1 ? 0.26 : 0.36), (bw * 0.9) / Math.max(...lines.map((l) => l.length)) * 1.7);
          const ys = lines.length > 1 ? [by + bh * 0.42, by + bh * 0.76] : [by + bh * 0.6];
          lines.forEach((l, i) => d.raw(`<text x="${r2(bx + bw / 2)}" y="${r2(ys[i])}" text-anchor="middle" font-family="${BOARD_FONT}" font-size="${r2(size)}" font-weight="700" fill="#1d4ed8">${esc(l)}</text>`, { kind: 'detail' }));
        } else {
          for (let i = 0; i < 3; i++) d.line(bx + bw * 0.12, by + bh * (0.3 + i * 0.22), bx + bw * (0.85 - i * 0.18), by + bh * (0.3 + i * 0.22), { ...ink, stroke: '#93c5fd', sw: 3 });
        }
      });
      clock(W * 0.86, H * 0.16, H * 0.05);
    } else {
      windowAt(W * 0.08, H * 0.12, W * 0.16, H * 0.26);
      if (env.roomKind === 'office') {
        clock(W * 0.86, H * 0.16, H * 0.05);
        // (a plant in a pot by the wall)
        d.path(`M ${W * 0.9} ${base} l ${-W * 0.015} ${-H * 0.07} h ${W * 0.03} z`, ink);
        for (const a of [-0.6, 0, 0.6]) d.path(`M ${W * 0.9} ${base - H * 0.07} q ${a * W * 0.03} ${-H * 0.08} ${a * W * 0.04} ${-H * 0.12}`, ink);
      } else {
        d.rect(W * 0.78, H * 0.14, W * 0.12, H * 0.14, ink); // a picture on the wall
        d.path(`M ${W * 0.79} ${H * 0.27} l ${W * 0.035} ${-H * 0.06} l ${W * 0.025} ${H * 0.04} l ${W * 0.02} ${-H * 0.03} l ${W * 0.03} ${H * 0.05}`, ink);
      }
    }
    return;
  }
  // Outdoors (only where the words say so): the sky, then what stands on the horizon
  const named = env.city || env.water || env.beach || env.forest || env.park || env.woods;
  if (!named && !env.night && !env.rain) return;
  if (env.night) {
    d.path(`M ${W * 0.85} ${H * 0.09} a ${H * 0.07} ${H * 0.07} 0 1 0 ${H * 0.05} ${H * 0.12} a ${H * 0.055} ${H * 0.055} 0 1 1 ${-H * 0.05} ${-H * 0.12} z`, ink);
    for (let i = 0; i < 5; i++) { const x = W * (0.1 + rng() * 0.6), y = H * (0.06 + rng() * 0.2); d.line(x - 3, y, x + 3, y, ink); d.line(x, y - 3, x, y + 3, ink); }
  } else if (!env.rain && named) {
    const x = W * 0.86, y = H * 0.16, r = H * 0.05;
    d.circle(x, y, r, ink);
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; d.line(x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r * 1.4, x + Math.cos(a) * r * 1.9, y + Math.sin(a) * r * 1.9, ink); }
  }
  if (env.rain) for (let i = 0; i < 14; i++) { const x = W * (0.05 + rng() * 0.9), y = H * (0.05 + rng() * 0.5); d.line(x, y, x - 4, y + 10, ink); }
  if (env.city) {
    let x = W * 0.04;
    while (x < W * 0.96) {
      const w = W * (0.06 + rng() * 0.05), h = H * (0.18 + rng() * 0.22);
      d.rect(x, base - h, w, h, ink);
      for (let wy = base - h + 8; wy < base - 10; wy += 14) d.line(x + w * 0.3, wy, x + w * 0.7, wy, { ...ink, sw: 1.2 });
      x += w + W * 0.015;
    }
  } else if (env.water || env.beach) {
    for (let row = 0; row < 3; row++) {
      let path = `M ${W * 0.06} ${H * (0.62 + row * 0.07)}`;
      for (let x = W * 0.06; x < W * 0.94; x += 22) path += ' q 5.5 -5 11 0 t 11 0';
      d.path(path, { ...ink, sw: 1.6 });
    }
  } else if (env.forest || env.park || env.woods) {
    for (const fx of [0.1, 0.24, 0.8, 0.92]) {
      const x = W * fx, h = H * (0.24 + rng() * 0.08);
      d.line(x, base, x, base - h * 0.5, ink);
      d.circle(x, base - h * 0.72, h * 0.28, ink);
    }
  }
}

function background(W, H, hY, env, pal, rng, hasGroundItems, style = 'flat') {
  const d = createKit();
  const bg = { kind: 'bg' };

  if (style === 'editorial') {
    // Exact Image 2: warm golden yellow backdrop with crisp black ground line
    d.rect(0, 0, W, H, { ...bg, fill: '#fed136' });
    d.line(0, H * 0.88, W, H * 0.88, { kind: 'line', stroke: '#000000', sw: 3.5 });
    return d.shapes;
  }
  if (style === 'stickman') {
    // Exact Image 1: clean white studio canvas with subtle baseline
    d.rect(0, 0, W, H, { ...bg, fill: '#ffffff' });
    // (the place the words name, sketched in light lines: a whiteboard, an office window, trees...)
    d.group({ class: 'pg-place pg-place-sketch' }, () => sketchPlace(d, env, W, H, rng));
    d.line(W * 0.08, H * 0.88, W * 0.92, H * 0.88, { kind: 'line', stroke: '#1e293b', sw: 2.2 });
    d.ellipse(W * 0.5, H * 0.91, W * 0.35, 6, { kind: 'shadow', fill: '#000000', opacity: 0.12 });
    return d.shapes;
  }
  if (style === 'cute2d') {
    // Exact Image 3: clean soft pastel canvas with subtle floating shadow
    d.rect(0, 0, W, H, { ...bg, fill: '#f8fafc' });
    d.ellipse(W * 0.5, H * 0.91, W * 0.35, 7, { kind: 'shadow', fill: '#000000', opacity: 0.1 });
    return d.shapes;
  }
  if (style === 'whiteboard') {
    // Clean dry-erase board with marker border, colorful marker arrows & tray (Roadmap Style 4)
    d.rect(0, 0, W, H, { ...bg, fill: '#ffffff' });
    d.rect(8, 8, W - 16, H - 16, { kind: 'line', stroke: '#cbd5e1', sw: 2.5, rx: 8 });
    // Colorful dry-erase marker arrows & accents in top corners
    d.path(`M 36 ${H * 0.24} Q 72 ${H * 0.14} 112 ${H * 0.20}`, { kind: 'line', stroke: '#0284c7', sw: 3.5 });
    d.path(`M 103 ${H * 0.16} L 114 ${H * 0.20} L 104 ${H * 0.25}`, { kind: 'line', stroke: '#0284c7', sw: 3.5 });
    d.path(`M ${W - 115} ${H * 0.20} Q ${W - 75} ${H * 0.14} ${W - 40} ${H * 0.24}`, { kind: 'line', stroke: '#f97316', sw: 3.5 });
    d.path(`M ${W - 105} ${H * 0.16} L ${W - 117} ${H * 0.20} L ${W - 106} ${H * 0.25}`, { kind: 'line', stroke: '#f97316', sw: 3.5 });
    d.line(W * 0.12, H * 0.88, W * 0.88, H * 0.88, { kind: 'line', stroke: '#16a34a', sw: 3 });
    return d.shapes;
  }
  if (style === 'doodle') {
    // Spiral-bound sketchbook off-white paper with wire rings & faint margin (Roadmap Style 6)
    d.rect(0, 0, W, H, { ...bg, fill: '#fffdfa' });
    d.line(44, 0, 44, H, { kind: 'line', stroke: '#fca5a5', sw: 1.4, opacity: 0.55 });
    for (let y = 24; y < H - 16; y += 32) {
      d.circle(22, y, 4.2, { fill: '#e2e8f0', stroke: '#475569', sw: 1.8, kind: 'detail' });
      d.path(`M 4 ${y - 3} Q 13 ${y - 7} 22 ${y - 2}`, { kind: 'line', stroke: '#334155', sw: 2.2 });
      d.path(`M 4 ${y + 3} Q 13 ${y - 1} 22 ${y + 2}`, { kind: 'line', stroke: '#334155', sw: 2.2 });
    }
    d.line(56, H * 0.88, W - 28, H * 0.88, { kind: 'line', stroke: '#1e293b', sw: 2.2 });
    return d.shapes;
  }
  if (style === 'geometric') {
    // Bauhaus poster: a cream ground with a red disc for a sun and hills of half circles
    d.rect(0, 0, W, H, { ...bg, fill: '#f4ecd8' });
    d.circle(W * 0.8, H * 0.26, H * 0.15, { ...bg, fill: env.night ? '#e9c46a' : '#e63946' });
    d.path(`M 0 0 L ${H * 0.34} 0 A ${H * 0.34} ${H * 0.34} 0 0 1 0 ${H * 0.34} Z`, { ...bg, fill: '#e9c46a' });
    d.path(`M ${-W * 0.05} ${hY} A ${W * 0.3} ${W * 0.3} 0 0 1 ${W * 0.55} ${hY} Z`, { ...bg, fill: '#1d3557' });
    d.path(`M ${W * 0.42} ${hY} A ${W * 0.22} ${W * 0.22} 0 0 1 ${W * 0.86} ${hY} Z`, { ...bg, fill: '#2a9d8f' });
    d.rect(0, hY, W, H - hY, { ...bg, fill: '#e9c46a' });
    d.line(0, hY, W, hY, { kind: 'line', stroke: '#111111', sw: 3 });
    return d.shapes;
  }
  if (style === 'anime' && !env.night && !env.sunset && !env.rain) {
    // An anime summer sky: deep blue overhead, paling to the horizon
    pal = { ...pal, sky: ['#2f86ee', '#5aa9f6', '#a4d4fc'] };
  }
  if (style === 'papercut') {
    // Warm craft paper collage background with layered horizon strip (Roadmap Style 8)
    d.rect(0, 0, W, H, { ...bg, fill: '#f4efe6' });
    d.rect(0, H * 0.86, W, H * 0.14, { ...bg, fill: '#e5dccb' });
    return d.shapes;
  }

  // Indoors (styles with their own backdrop above keep it)
  if (env.room) {
    // A wall, a floor and a baseboard line, in the style's own colors
    // (a room made in the studio has its own wall and floor colours)
    const [wallColor, floorColor] = [env.roomCustom?.wall, env.roomCustom?.floor].every(Boolean) ? [env.roomCustom.wall, env.roomCustom.floor]
      : [env.roomCustom?.wall ?? (ROOM_COLORS[style] ?? ['#f8fafc', '#f1f5f9'])[0], env.roomCustom?.floor ?? (ROOM_COLORS[style] ?? ['#f8fafc', '#f1f5f9'])[1]];
    d.rect(0, 0, W, H, { ...bg, fill: wallColor });
    d.rect(0, H * 0.88, W, H * 0.12, { ...bg, fill: floorColor });
    d.group({ class: `pg-place pg-place-${env.roomKind}` }, () => roomDecor(d, env, W, H, wallColor, floorColor));
    d.line(0, H * 0.88, W, H * 0.88, { kind: 'line', stroke: '#000000', sw: 3.5 });
    // (at night the room is dim, its lights low; the figures, drawn over it, stay clear)
    if (env.night) d.rect(0, 0, W, H, { ...bg, fill: '#0b1433', opacity: 0.42 });
    return d.shapes;
  }

  if (env.underwater) {
    d.group({ class: 'pg-place pg-place-underwater' }, () => underwater(d, env, pal, rng, W, H, hY));
    extras(d, env, rng, W, H, hY);
    return d.shapes;
  }
  const skyColors = placeSky(env, pal.sky);
  d.rect(0, 0, W, H, { ...bg, fill: skyColors[0] });
  d.rect(0, H * 0.3, W, hY - H * 0.3, { ...bg, fill: skyColors[1] });
  d.rect(0, H * 0.48, W, hY - H * 0.48, { ...bg, fill: skyColors[2] });

  if (env.space) {
    d.group({ class: 'pg-place pg-place-space' }, () => space(d, env, pal, rng, W, H, hY));
    shootingStar(d, rng, W, H);
    extras(d, env, rng, W, H, hY);
    return d.shapes;
  }
  if (env.extras?.has('shooting')) bigShootingStar(d, W, H);
  else if (env.night && !env.rain) shootingStar(d, rng, W, H);
  if (env.night || env.extras?.has('stars')) {
    for (let i = 0; i < 22; i++) {
      const delay = (rng() * 2).toFixed(2);
      d.group({ class: 'pg-env-star', style: `animation-delay: ${delay}s;` }, () => {
        d.circle(rng() * W, rng() * hY * 0.8, 0.9 + rng() * 1.5, { ...bg, fill: '#fff8e1' });
      });
    }
  }

  const waterTop = hY;
  const shoreTop = H * 0.84;
  if (env.water) {
    d.rect(0, waterTop, W, H - waterTop, { ...bg, fill: pal.water[0] });
    d.rect(0, waterTop + (H - waterTop) * 0.45, W, (H - waterTop) * 0.55, { ...bg, fill: pal.water[1] });
    d.group({ class: 'pg-env-wave' }, () => {
      for (let i = 0; i < 10; i++) {
        const x = rng() * W, y = waterTop + 8 + rng() * (H - waterTop - 16), s = 10 + rng() * 12;
        d.path(`M${x - s} ${y} q${s / 2} -${s / 3} ${s} 0 q${s / 2} -${s / 3} ${s} 0`, { kind: 'line', stroke: lighten(pal.water[0], 0.45), sw: 2 });
      }
    });
    if (hasGroundItems) {
      const shore = env.beach || !env.snow ? pal.sand : pal.ground[2];
      d.path(`M0 ${shoreTop} Q${W * 0.5} ${shoreTop - H * 0.03} ${W} ${shoreTop} L${W} ${H} L0 ${H} Z`, { ...bg, fill: shore });
    }
  } else if (env.city) {
    d.group({ class: 'pg-place pg-place-city' }, () => skyline(d, env, pal, rng, W, H, hY));
  } else if (env.desert) {
    if (env.mountains) d.group({ class: 'pg-place pg-place-mountains' }, () => mountains(d, env, pal, rng, W, H, hY));
    d.group({ class: 'pg-place pg-place-desert' }, () => desert(d, env, pal, rng, W, H, hY));
  } else {
    if (env.mountains) d.group({ class: 'pg-place pg-place-mountains' }, () => mountains(d, env, pal, rng, W, H, hY));
    if (env.castle) d.group({ class: 'pg-place pg-place-castle' }, () => castle(d, env, pal, rng, W, H, hY));
    if (env.jungle) d.group({ class: 'pg-place pg-place-jungle' }, () => jungle(d, env, pal, rng, W, H, hY));
    if (env.woods || env.park || (env.autumn && !env.farm && !env.castle && !env.jungle)) d.group({ class: `pg-place pg-place-${env.park ? 'park' : 'woods'}` }, () => treeLine(d, env, pal, rng, W, hY, H));
    d.ellipse(W * 0.18, hY + H * 0.04, W * 0.38, H * 0.13, { ...bg, fill: pal.ground[0] });
    d.ellipse(W * 0.82, hY + H * 0.05, W * 0.42, H * 0.11, { ...bg, fill: pal.ground[0] });
    d.rect(0, hY, W, H - hY, { ...bg, fill: pal.ground[1] });
    d.rect(0, H * 0.88, W, H * 0.12, { ...bg, fill: pal.ground[2] });
    if (env.park) {
      // A sandy path winding off toward the horizon
      d.path(`M ${W * 0.36} ${H} C ${W * 0.42} ${H * 0.86} ${W * 0.62} ${H * 0.8} ${W * 0.56} ${hY + H * 0.02} L ${W * 0.6} ${hY + H * 0.02} C ${W * 0.7} ${H * 0.8} ${W * 0.56} ${H * 0.88} ${W * 0.64} ${H} Z`, { ...bg, fill: mix(pal.sand, pal.ground[1], 0.25) });
    }
    if (env.farm) d.group({ class: 'pg-place pg-place-farm' }, () => farm(d, env, pal, rng, W, H, hY));
  }
  if (env.autumn || env.extras?.has('leaves')) autumnLeaves(d, env, rng, W, H);

  if (env.parallax) {
    // Conveyor-belt cartoon ground treadmill
    d.group({ class: 'pg-parallax-ground' }, () => {
      for (let x = -80; x < W + 80; x += 36) {
        d.line(x, H * 0.93, x + 18, H * 0.93, { stroke: '#000000', sw: 2.2, opacity: 0.22 });
        d.circle(x + 28, H * 0.945, 1.8, { fill: '#000000', opacity: 0.16 });
      }
    });
  }

  if (env.rain) {
    d.group({ class: 'pg-env-rain' }, () => {
      for (let i = 0; i < 48; i++) {
        const x = rng() * W, y = rng() * H * 0.85;
        d.line(x, y, x - 4, y + 14, { stroke: '#d0e4f0', sw: 1.8, opacity: 0.85 });
      }
    });
  } else if (env.snow) {
    d.group({ class: 'pg-env-snow' }, () => {
      for (let i = 0; i < 40; i++) {
        const x = rng() * W, y = rng() * H * 0.85;
        d.circle(x, y, 1.2 + rng() * 1.8, { fill: '#ffffff', opacity: 0.9 });
      }
    });
  }
  extras(d, env, rng, W, H, hY);
  return d.shapes;
}

// How big a walker's feet sound: its size, a child's lighter (src/sound-synth.js 'steps')
const footSize = (it) => it.c.scale * (HEIGHTS[it.look?.features?.height] ?? 1) * (voiceOf(it.c.id)?.v === 'kid' ? 0.7 : 1);

// Styles that suit the clean sound set (subtle, for explainers and presentations), when it is 'auto'
// (white canvases, where a mood's light stays fainter)
const LIGHT_CANVAS_STYLES = new Set(['stickman', 'whiteboard', 'cute2d', 'doodle', 'editorial', 'blueprint', 'geometric']);
const CLEAN_SOUND_STYLES = new Set(['stickman', 'whiteboard', 'editorial', 'blueprint', 'geometric']);

// Styles whose background() is a flat studio backdrop (no horizon) and that draw their own ground shadow.
const FLAT_BACKDROP_STYLES = ['editorial', 'stickman', 'cute2d', 'whiteboard', 'doodle', 'papercut', 'geometric'];
// Motions that move the whole figure through the scene (the limbs walk in place inside).
const TRAVEL_MOTIONS = ['walk-across', 'approach', 'recede'];
// How far away (in multiples of the front-row distance) an approaching/receding figure starts/ends.
const FAR_DISTANCE = 4.5;

const r2 = (v) => Math.round(v * 100) / 100;
const pct = (v) => `${r2(v * 100)}%`;

/**
 * CSS @keyframes body and duration for a figure travelling through the scene.
 * Figures are drawn in their own 100x100 box scaled by `sx` (negative when mirrored), so screen
 * offsets are divided by the scale to get local units; F is the feet point in that box.
 *   walk-across: off-screen to off-screen in the facing direction at `speed` px/s (shared by everyone
 *                crossing, so a man and his dog stay together); the delay starts each figure at its
 *                composed position, so stills look right.
 *   approach / recede: along a perspective path between the front row and the horizon. Screen size
 *                and distance below the horizon both scale with 1/distance, so a figure walking
 *                toward the camera grows slowly at first and quickly at the end.
 */
function travelKeyframes(motion, { cx, y, s, sx, F, w, W, hY, speed }) {
  if (motion === 'walk-across') {
    const off = w / 2 + 12;
    const [x0, x1] = sx > 0 ? [-off, W + off] : [W + off, -off];
    const duration = clamp(Math.abs(x1 - x0) / speed, 4, 16);
    return {
      duration: r2(duration),
      delay: -r2(duration * ((cx - x0) / (x1 - x0))),
      keyframes: `0% { transform: translateX(${r2((x0 - cx) / sx)}px); } 100% { transform: translateX(${r2((x1 - cx) / sx)}px); }`,
    };
  }
  // The far end of the path heads toward the vanishing point, keeping some of the figure's own offset
  // so several walkers don't all start from one spot.
  const vx = W / 2 + (cx - W / 2) * 0.4;
  const at = (k) => {
    const dx = (vx + (cx - vx) * k - cx) / sx;
    const dy = (hY + (y - hY) * k - y) / s;
    return `transform: translate(${r2(F.x + dx)}px, ${r2(F.y + dy)}px) scale(${r2(k * 1000) / 1000}) translate(${-F.x}px, ${-F.y}px);`;
  };
  const steps = 12;
  const [move0, move1] = motion === 'approach' ? [0, 0.7] : [0.05, 0.85];
  let keyframes = '';
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const dist = motion === 'approach' ? FAR_DISTANCE + (1 - FAR_DISTANCE) * u : 1 + (FAR_DISTANCE - 1) * u;
    keyframes += `${pct(move0 + (move1 - move0) * u)} { ${at(1 / dist)} } `;
  }
  keyframes += motion === 'approach'
    ? `100% { ${at(1)} } 0% { opacity: 0; } 4% { opacity: 1; } 94% { opacity: 1; } 100% { opacity: 0; }`
    : `0% { ${at(1)} } 100% { ${at(1 / FAR_DISTANCE)} } 0% { opacity: 0; } 5% { opacity: 1; } 85% { opacity: 1; } 95% { opacity: 0; } 100% { opacity: 0; }`;
  return { duration: 6, delay: 0, keyframes };
}

// ---------------------------------------------------------------------------------------------
// Timelines: actors that do several things one after another (see src/timeline.js for the beats).

const GESTURE_SECONDS = { sit: 2.6, sleep: 2.6, think: 2.4 };
const HOLD_SECONDS = 1.6; // the final arrangement stays on screen before the clip loops
const STAGGER_SECONDS = 0.35; // a group walking in sets off one after another
const NEAR_K = 1.22; // "comes closer" from the front row: a step toward the camera

/**
 * Plays the beats out for each actor: where it is (x over time) and which pose it shows.
 * slots: figure key ("boy#0", "boy#1"...) -> { id, it, cx, w, h } (its place in the composed scene);
 *   an action for "boy" applies to every boy, and a group entering or walking somewhere goes one
 *   after another so they don't overlap
 * props: concept id -> { cx, w } (things actors can walk to)
 * Returns { T, tracks: figure key -> [{ t0, t1, x0, x1, k0, k1, pose }], camera: [{ type, target, t0, t1 }] }
 * (x across the front row, k the depth scale: 1 front row, 1 / FAR_DISTANCE at the horizon)
 * with times in seconds.
 */
function playTimeline(timeline, slots, props, W, minDuration = 0) {
  const state = new Map();
  const tracks = new Map();
  for (const [key, slot] of slots) {
    const first = timeline.beats.findIndex((b) => b.actions.some((a) => a.actor === slot.id));
    const firstAction = timeline.beats[first]?.actions.find((a) => a.actor === slot.id);
    // On stage from the start, unless its first action brings it in (from the side, from the horizon,
    // or a later "then a cat" popping up): "when the dog arrives, the boy jumps" - the boy is there all along
    const onStage = first >= 0 && !['enter', 'moveTo', 'approach'].includes(firstAction?.type) && !(first > 0 && firstAction?.type === 'appear');
    // x: place across the front row; k: depth as a scale (1 = front row, 1 / FAR_DISTANCE = horizon)
    state.set(key, { x: slot.cx, k: 1, present: onStage, facing: 1, expression: slot.it.m.expression, isPerson: slot.it.c.category === 'people' });
    tracks.set(key, []);
  }
  const keysOf = (id) => [...slots.keys()].filter((key) => slots.get(key).id === id);
  const off = (id, side) => (side < 0 ? -slots.get(id).w / 2 - 12 : W + slots.get(id).w / 2 + 12);
  // Who a figure looks at: the one it was told to look at ("looks at the dog", "waves at her"), else
  // the nearest figure of another kind on stage. { x, small, up } or null (nobody, or the camera).
  const lookTarget = (key) => {
    const st = state.get(key), slot = slots.get(key);
    if (st.lookAt === 'camera') return null;
    let best = null;
    const consider = (x, h, air) => {
      if (!best || Math.abs(x - st.x) < Math.abs(best.x - st.x)) best = { x, small: h < slot.h * st.k * 0.7, up: air };
    };
    for (const [other, o] of state) {
      const os = slots.get(other);
      if (other === key || !o.present || (st.lookAt ? os.id !== st.lookAt : os.id === slot.id)) continue;
      consider(o.x, os.h * o.k, ['air', 'sky'].includes(os.it.c.placement));
    }
    const prop = st.lookAt && !best && props.get(st.lookAt);
    if (prop) consider(prop.cx, prop.h ?? 0, prop.y < slot.y - slot.h * 0.9);
    return best;
  };
  // Standing people face the camera, or turn three-quarters toward whoever they look at when close
  // (always when told to look at them) with their eyes on them; farther away only the eyes follow.
  // Animals face whoever they look at, else the way they last went.
  const pose = (key, extra = {}) => {
    const st = state.get(key);
    // (sitting on a seat: whatever it does, it does sitting there - "then waves")
    if (st.seated) return seatedPose(key, { ...extra, anim: extra.anim && extra.anim !== 'sit' ? extra.anim : 'sit' });
    if (st.hugging && (!extra.anim || extra.anim === 'talk')) return standingPose(key, { ...extra, anim: 'hold' });
    return standingPose(key, extra);
  };
  const seatedPose = (key, extra) => ({ ...standingPose(key, extra), seat: 'seat', lift: state.get(key).seated.lift });
  const standingPose = (key, extra = {}) => {
    const st = state.get(key), slot = slots.get(key), view = slot.it.m.view;
    const target = lookTarget(key);
    if (!st.isPerson) return { expression: st.expression, view, mirror: st.lookAt && target ? target.x < st.x : st.facing < 0, ...extra };
    if (!target) return { expression: st.expression, view: view ?? 'front', mirror: false, ...extra };
    const dx = target.x - st.x, gy = target.up ? -1 : target.small ? 0.6 : 0;
    if (view || (!st.lookAt && Math.abs(dx) > W * 0.4)) {
      return { expression: st.expression, view: view ?? 'front', mirror: false, gaze: { x: Math.sign(dx), y: gy }, ...extra };
    }
    return { expression: st.expression, view: 'three-quarter', mirror: dx < 0, gaze: { x: 0.7, y: gy }, ...extra };
  };
  // Where something is: a prop, or the span a group of actors covers ("runs to them" -> beside all of them)
  const posOf = (id) => {
    const keys = keysOf(id).filter((key) => state.get(key).present);
    if (!keys.length) return props.get(id) || (keysOf(id)[0] && { cx: slots.get(keysOf(id)[0]).cx, w: slots.get(keysOf(id)[0]).w });
    const left = Math.min(...keys.map((key) => state.get(key).x - slots.get(key).w / 2));
    const right = Math.max(...keys.map((key) => state.get(key).x + slots.get(key).w / 2));
    return { cx: (left + right) / 2, w: right - left };
  };

  let t = 0;
  const camera = [];
  const beatTimes = []; // when each beat starts and ends (the studio's timeline view)
  const speeches = []; // who says what when: { key, start, text }
  const doings = []; // what each figure does when, for the sound: { key, t0, act }
  for (const beat of timeline.beats) {
    if (beat.camera && !beat.actions.length) {
      // A camera beat: everyone holds still while the camera moves
      const d = beat.duration ?? CAMERA_SECONDS[beat.camera.type] ?? 1.6;
      camera.push({ ...beat.camera, t0: t, t1: t + d });
      for (const [id, st] of state) if (st.present) tracks.get(id).push({ t0: t, t1: t + d, x0: st.x, x1: st.x, k0: st.k, k1: st.k, pose: pose(id) });
      beatTimes.push({ t0: r2(t), t1: r2(t + d) });
      t += d;
      continue;
    }
    const acting = new Map();
    const busy = new Set(); // one action per figure per beat: the main clause's ("waves while sitting" -> waves)
    for (const a of beat.actions) {
      const group = [];
      keysOf(a.actor).forEach((key, n) => {
      if (busy.has(key)) return;
      busy.add(key);
      const st = state.get(key), slot = slots.get(key);
      if (a.expression) st.expression = a.expression;
      const wasPresent = st.present;
      if (!st.present) st.k = 1; // (re)appearing figures start in the front row
      let move = null, d = 0, shown = null, words = null, then = null, dMove = 0;
      if (['approach', 'recede', 'enter', 'moveTo', 'exit'].includes(a.type)) { st.lookAt = null; st.seated = null; st.hugging = null; } // eyes on the way ahead
      if (a.lookAt) st.lookAt = a.lookAt; // "waves at her"
      if (a.type === 'approach' || a.type === 'recede') {
        // Toward the camera (from the horizon if not there yet, else a step closer) or away into the
        // distance, where it is gone. Time follows the distance walked, in front-row distances.
        const k0 = wasPresent ? st.k : 1 / FAR_DISTANCE;
        const k1 = a.type === 'recede' ? 1 / FAR_DISTANCE : wasPresent && st.k >= 0.99 ? NEAR_K : 1;
        d = clamp(Math.abs(1 / k1 - 1 / k0) * (a.gait === 'run' ? 0.6 : 1.15), 1, 6);
        move = { x0: st.x, x1: st.x, k0, k1 };
        const facing = slot.it.m.view ?? (a.type === 'approach' ? 'front' : 'back');
        shown = { anim: a.gait, ...pose(key), view: facing, mirror: false };
        st.k = k1;
        st.present = a.type === 'approach';
      } else if (a.type === 'enter' || a.type === 'moveTo' || a.type === 'exit') {
        let x0 = st.x, x1;
        if (a.type === 'exit') {
          // Off the side of the screen, wherever its depth puts it
          x1 = W / 2 + (off(key, st.x < W / 2 ? -1 : 1) - W / 2) / st.k;
        } else if (a.type === 'moveTo' && posOf(a.target)) {
          const tgt = posOf(a.target);
          // Come in from the side with more room, or approach from the side you are on;
          // a group lines up beside the target, the nth one further out
          let side = st.present ? Math.sign(st.x - tgt.cx) || 1 : tgt.cx < W / 2 ? 1 : -1;
          // (a hug: close enough to hold them)
          const gap = a.hug ? -Math.min(slot.w, tgt.w) * 0.42 : W * 0.04;
          const spot = (sd) => clamp(tgt.cx + sd * (tgt.w / 2 + slot.w / 2 + gap + n * (slot.w + W * 0.02)), slot.w / 2, W - slot.w / 2);
          // Not on top of someone else standing there: then the target's other side, if that is free
          const taken = (x) => [...state].some(([other, o]) => other !== key && o.present && slots.get(other).id !== a.target
            && Math.abs(o.x - x) < (slot.w + slots.get(other).w) * 0.4);
          if (taken(spot(side)) && !taken(spot(-side))) side = -side;
          if (!st.present) x0 = off(key, side);
          x1 = spot(side);
          // (a hug as the scene starts: already near them, a step away, so the hug is what we see)
          if (a.hug && t === 0) x0 = clamp(x1 + side * slot.w * 0.6, slot.w / 2, W - slot.w / 2);
        } else {
          if (!st.present) x0 = off(key, slot.cx < W / 2 ? -1 : 1);
          x1 = slot.cx;
        }
        const speed = (a.gait === 'run' ? 2 : 0.95) * slot.h;
        d = clamp(Math.abs(x1 - x0) / speed, 0.6, 6);
        st.facing = x1 < x0 ? -1 : 1;
        // Walking somewhere brings a figure back to the front row as it goes
        move = { x0, x1, k0: st.k, k1: a.type === 'exit' ? st.k : 1 };
        if (a.type !== 'exit') st.k = 1;
        st.present = true;
        shown = { anim: a.gait, ...pose(key), view: slot.it.m.view ?? (st.isPerson ? 'side' : undefined), mirror: st.facing < 0 };
        st.x = x1;
        if (a.type === 'exit') st.present = false;
        if (a.hug && posOf(a.target)) {
          // Then holds them, turned to them, for the rest of the step
          st.lookAt = a.target;
          dMove = d;
          d += 2.4;
          then = pose(key, { anim: 'hold' });
          // (and keeps hugging while saying something or doing nothing else)
          st.hugging = a.target;
        }
      } else if (a.type === 'look') {
        // Turns to look at someone (or at us), and keeps looking until it does something else
        st.present = true;
        st.lookAt = a.target || 'camera';
        d = 1.4;
        shown = pose(key);
      } else if (a.type === 'pose' && a.seat && props.get(a.seat)?.h) {
        // Sitting on something: walking over to it first, then sitting there, hips on the seat
        const prop = props.get(a.seat), c = getConcept(a.seat);
        const others = [...state.values()].filter((o) => o.seated?.id === a.seat).length;
        const x1 = clamp(prop.cx + (c.seatSpan ? (others % 2 ? 0.22 : -0.22) * prop.w : 0), slot.w / 2, W - slot.w / 2);
        const seatAbove = (((c.baseline ?? 96) - c.seatTop) / 100) * prop.h;
        const hipAbove = (((slot.it.c.baseline ?? 96) - (drawConcept(slot.it.c, { ...slot.it.look, seat: 'seat' }).seatAt ?? 76)) / 100) * slot.h;
        const lift = Math.max(-slot.h * 0.15, seatAbove - hipAbove);
        if (!st.present || Math.abs(st.x - x1) > 2) {
          const x0 = st.present ? st.x : off(key, x1 < W / 2 ? -1 : 1);
          dMove = clamp(Math.abs(x1 - x0) / (0.95 * slot.h), 0.6, 6);
          st.facing = x1 < x0 ? -1 : 1;
          move = { x0, x1, k0: st.k, k1: 1 };
          shown = { anim: 'walk', ...pose(key), view: slot.it.m.view ?? (st.isPerson ? 'side' : undefined), mirror: st.facing < 0 };
        }
        st.present = true;
        st.x = x1;
        st.k = 1;
        st.seated = { id: a.seat, lift };
        d = dMove + 2;
        then = pose(key, { anim: 'sit' });
        if (!shown) { shown = then; then = null; }
      } else if (a.type === 'pose') {
        st.present = true;
        if (a.anim !== 'talk') st.hugging = null;
        d = GESTURE_SECONDS[a.anim] ?? 2;
        shown = pose(key, { anim: a.anim });
        // Saying something: the words ("says “Hello!”"), else a clip scene's caption when the figure
        // talks; the step lasts as long as the words take, lips in sync (src/speech.js)
        words = a.anim === 'talk' ? a.speech ?? timeline.caption : null;
        if (words) {
          d = Math.max(d, lipKeys(words).duration + 0.4);
          // (a group saying the same words at once: one bubble, the others' lips move with it)
          const echo = speeches.some((sp) => sp.start === t && sp.text === words && sp.quoted);
          speeches.push({ key, start: t, text: words, quoted: a.speech != null && !echo });
        }
      } else {
        // 'expr' / 'appear'
        d = st.present ? 1.4 : 0.8;
        st.present = true;
      }
      group.push({ key, d, move, shown, then, dMove, wasPresent, act: { type: a.type, gait: a.gait, anim: a.anim, expression: a.expression, words } });
      });
      // Group members set off one after another, the one going furthest first so nobody walks
      // through the others (gestures stay in unison)
      const dist = (g) => (g.move ? Math.abs(g.move.x1 - g.move.x0) : 0);
      [...group].sort((a, b) => dist(b) - dist(a)).forEach((g, i) => {
        const delay = g.move ? i * STAGGER_SECONDS : 0;
        acting.set(g.key, { ...g, d: g.d + delay, delay });
      });
    }
    let beatLen = Math.max(0.5, ...[...acting.values()].map((a) => a.d));
    let shot = null;
    if (beat.camera) {
      // A camera move alongside the actions ("the camera zooms in while she waves")
      const d = CAMERA_SECONDS[beat.camera.type] ?? 1.6;
      shot = { ...beat.camera, t0: t, t1: t + d };
      camera.push(shot);
      beatLen = Math.max(beatLen, d);
    }
    if (beat.duration) {
      // A length set in the prompt ("waves for 3 seconds") or the timeline view: walks and camera
      // moves speed up to fit a shorter step; gestures and standing still fill a longer one
      const f = Math.min(1, beat.duration / beatLen);
      for (const a of acting.values()) { a.d *= f; a.delay *= f; }
      if (shot) shot.t1 = t + (shot.t1 - t) * f;
      beatLen = beat.duration;
    }
    for (const [id, st] of state) {
      const act = acting.get(id);
      const track = tracks.get(id);
      let t1 = t;
      if (act) doings.push({ key: id, t0: t + act.delay, act: { ...act.act, d: act.d - act.delay, wasPresent: act.wasPresent } });
      if (act?.shown) {
        const t0 = t + act.delay;
        const m = act.move;
        if (act.delay && act.wasPresent) track.push({ t0: t, t1: t0, x0: m.x0, x1: m.x0, k0: m.k0, k1: m.k0, pose: pose(id) });
        // A gesture lasts as long as the beat: the boy keeps waving while the dog runs up to him
        t1 = m ? t + act.d : t + beatLen;
        // (walking somewhere, then something there - sitting down, a hug - for the rest of the step)
        if (act.then && m) t1 = t0 + act.dMove;
        track.push({ t0, t1, x0: m ? m.x0 : st.x, x1: m ? m.x1 : st.x, k0: m ? m.k0 : st.k, k1: m ? m.k1 : st.k, pose: act.shown });
        if (act.then && m) {
          track.push({ t0: t1, t1: t + beatLen, x0: m.x1, x1: m.x1, k0: m.k1, k1: m.k1, pose: act.then });
          t1 = t + beatLen;
        }
      }
      if (st.present && t1 < t + beatLen) track.push({ t0: t1, t1: t + beatLen, x0: st.x, x1: st.x, k0: st.k, k1: st.k, pose: pose(id) });
    }
    beatTimes.push({ t0: r2(t), t1: r2(t + beatLen) });
    t += beatLen;
  }
  // (in a clip, the last arrangement holds for as long as the scene is on: it loops only after that)
  const hold = Math.max(HOLD_SECONDS, minDuration - t);
  for (const [id, st] of state) if (st.present) tracks.get(id).push({ t0: t, t1: t + hold, x0: st.x, x1: st.x, k0: st.k, k1: st.k, pose: pose(id) });
  return { T: t + hold, tracks, camera, beatTimes, speeches, doings };
}

// ---------------------------------------------------------------------------------------------
// Camera: the whole picture sits in one group that zooms and pans. The view is clamped to the
// scene, so the camera never shows past its edges. Stills (no animation) show the wide shot.

const CAMERA_SECONDS = { zoomIn: 1.6, zoomOut: 1.6, pan: 3, panTo: 2 };

/**
 * Speech bubbles over the picture for whoever speaks (src/bubble.js): always there in a still scene;
 * in a timeline, each while its words last (and laid out clear of the bubbles shown with it).
 */
function speechBubbles(talkers, W, H, uid, motionCss, keepClear = []) {
  if (!talkers.length) return '';
  const shown = [];
  const svg = talkers.map((tk, i) => {
    const timed = tk.T != null;
    // (and never over what must stay readable: a board's words)
    const avoid = [...keepClear, ...shown.filter((o) => !timed || (o.from < tk.to && tk.from < o.to)).map((o) => o.box)];
    const [b] = layoutBubbles([tk], { W, H, avoid });
    shown.push({ ...tk, box: b.box });
    if (!timed) return `<g data-for="${tk.of}">${b.svg}</g>`;
    const pc = (t) => `${r2(Math.min(100, Math.max(0, (t / tk.T) * 100)))}%`;
    motionCss.push(`@keyframes ${uid}b${i} { 0% { opacity: 0; } ${pc(tk.from)} { opacity: 1; } ${pc(tk.to)} { opacity: 0; } }`);
    return `<g data-for="${tk.of}" opacity="0" style="animation: ${uid}b${i} ${r2(tk.T)}s step-end infinite;">${b.svg}</g>`;
  });
  return `<g class="pg-bubbles" pointer-events="none">${svg.join('')}</g>`;
}

/**
 * Where an actor is at time t (seconds), from its timeline track: { x, k } (front-row x, depth scale).
 * Depth changes follow the perspective curve (distance 1/k changes linearly), like the keyframes.
 */
function posAt(track, t) {
  if (!track.length) return null;
  const at = (seg, u) => ({ x: seg.x0 + (seg.x1 - seg.x0) * u, k: 1 / (1 / seg.k0 + (1 / seg.k1 - 1 / seg.k0) * u) });
  if (t <= track[0].t0) return at(track[0], 0);
  for (const seg of track) if (t <= seg.t1) return at(seg, seg.t1 > seg.t0 ? (t - seg.t0) / (seg.t1 - seg.t0) : 1);
  return at(track[track.length - 1], 1);
}

/**
 * Camera keyframes as { t, z, fx, fy, ease }: zoom z centred on the focus point (fx, fy).
 * events: [{ type, target, dir, t0, t1 }]; focusAt(id, t) -> { x, y, h } | null;
 * follow: { id, start } - track that actor from the time it appears.
 */
function cameraKeys({ events, follow, T, W, H, focusAt, start }) {
  const wide = { z: 1, fx: W / 2, fy: H / 2 };
  const first = start || wide;
  const closeUp = (f) => (f ? { z: clamp((H * 0.62) / f.h, 1.4, 2.6), fx: f.x, fy: f.y } : { z: 1.6, fx: W / 2, fy: H * 0.58 });
  let cur = first;
  const keys = [{ t: 0, ...cur, ease: 'ease-in-out' }];
  for (const ev of [...events].sort((a, b) => a.t0 - b.t0)) {
    let next;
    const f = ev.target ? focusAt(ev.target, ev.t1) : null;
    if (ev.type === 'zoomIn') next = closeUp(f);
    else if (ev.type === 'zoomOut') next = wide;
    else if (ev.type === 'reset') next = first;
    else if (ev.type === 'pan') next = { z: Math.max(cur.z, 1.35), fx: ev.dir > 0 ? W * 0.85 : W * 0.15, fy: cur.z > 1 ? cur.fy : H * 0.55 };
    else if (ev.type === 'panTo') next = f ? { z: Math.max(cur.z, 1.35), fx: f.x, fy: f.y } : cur;
    else continue;
    keys.push({ t: ev.t0, ...cur, ease: 'ease-in-out' });
    if (ev.type === 'pan' && cur.z < next.z) {
      // From the wide shot: first frame the side the pan starts from, then travel across
      keys.push({ t: ev.t0 + Math.min(0.7, (ev.t1 - ev.t0) / 3), z: next.z, fx: ev.dir > 0 ? W * 0.15 : W * 0.85, fy: next.fy, ease: 'ease-in-out' });
    }
    keys.push({ t: ev.t1, ...next, ease: 'ease-in-out' });
    cur = next;
  }
  keys.push({ t: T, ...cur, ease: 'linear' });
  if (!follow) return keys;

  // Following: frame the actor wherever it is, at the zoom the other moves set (at least 1.45x).
  // Until it shows up the camera holds the middle of the scene, easing over as it arrives.
  const from = follow.start ?? 0;
  const zAt = (t) => {
    let k = 0;
    while (k < keys.length - 1 && keys[k + 1].t <= t) k++;
    const a = keys[k], b = keys[k + 1] || a;
    return b.t > a.t ? a.z + (b.z - a.z) * ((t - a.t) / (b.t - a.t)) : a.z;
  };
  const out = [];
  const EASE_IN = 0.8;
  for (let t = 0; t <= T + 1e-6; t += 0.25) {
    const f = focusAt(follow.id, Math.max(t, from));
    const k = clamp((t - (from - EASE_IN)) / EASE_IN, 0, 1); // 0 before the actor appears, 1 once it is in
    const fx = f ? W / 2 + (f.x - W / 2) * k : W / 2, fy = f ? H * 0.55 + (f.y - H * 0.55) * k : H / 2;
    out.push({ t: Math.min(t, T), z: Math.max(1 + 0.45 * k, zAt(t)), fx, fy, ease: 'linear' });
  }
  return out;
}

/** CSS @keyframes body for camera keys: translate + scale, clamped so the view stays inside the scene. */
function cameraCss(keys, T, W, H) {
  let css = '', last = -1;
  for (const k of keys) {
    const tx = clamp(W / 2 - k.z * k.fx, W - k.z * W, 0);
    const ty = clamp(H / 2 - k.z * k.fy, H - k.z * H, 0);
    let pc = r2((k.t / T) * 100);
    if (pc <= last) pc = r2(last + 0.01);
    if (pc > 100) continue;
    css += `${pc}% { transform: translate(${r2(tx)}px, ${r2(ty)}px) scale(${r2(k.z * 1000) / 1000}); animation-timing-function: ${k.ease}; } `;
    last = pc;
  }
  return css;
}

/** Lays out a row of items horizontally; sets it.cx and possibly shrinks it.h. */
function layoutRow(list, W, maxH, rng) {
  if (!list.length) return;
  // (it.wf: a wider share, a seat with its sitters; it.gapK: the gap after it, as a share of its
  // height, partners holding hands or hugging)
  list.forEach((it) => { it.h = Math.min(it.h, maxH); it.w = it.h * (it.wf ?? it.c.width ?? 0.8); });
  const baseGap = (a, b) => (a.gapK != null ? a.gapK * a.h : a.c.id === b.c.id ? W * 0.03 : W * 0.035);
  const gaps = list.slice(1).map((it, i) => baseGap(list[i], it));
  const avail = W * 0.92;
  const gapSum = gaps.reduce((s, g) => s + g, 0);
  let widthSum = list.reduce((s, it) => s + it.w, 0);
  if (widthSum + gapSum > avail) {
    const f = Math.max(0.2, (avail - gapSum) / widthSum);
    list.forEach((it) => { it.h *= f; it.w *= f; });
    widthSum *= f;
    list.forEach((it, i) => { if (it.gapK != null && i < gaps.length) gaps[i] = it.gapK * it.h; });
  } else {
    // spread different objects apart a little when there is room
    const extra = avail - widthSum - gapSum;
    const spread = Math.min(extra / (list.length + 1), W * 0.07);
    gaps.forEach((g, i) => { if (list[i].c.id !== list[i + 1].c.id && list[i].gapK == null) gaps[i] += spread; });
  }
  const total = widthSum + gaps.reduce((s, g) => s + g, 0);
  let x = (W - total) / 2 + (rng() - 0.5) * Math.max(0, W - total) * 0.3;
  list.forEach((it, i) => {
    it.cx = x + it.w / 2;
    x += it.w + (gaps[i] || 0);
  });
}

/**
 * composeScene(matches, { width, height, style, seed, vary, words })
 * matches: output of parseText().matches
 */
export function composeScene(matches, opts = {}) {
  const { width: W = 640, height: H = 360, style = 'flat', seed = 1, vary = false, words = [], maxItems = 14 } = opts;
  const rng = createRng(`scene:${seed}`);

  // Each item is one figure: c draws it, aid is who it is (its concept id, or a named individual's
  // "boy~pgc1"); alt counts the figures of the same kind before it, which are dressed differently
  const items = [];
  const ofKind = new Map();
  for (const m of matches) {
    const c = getConcept(conceptOf(m.id));
    if (!c) continue;
    const n = clamp(m.count || 1, 1, c.maxCount ?? 5);
    const before = ofKind.get(c.id) ?? 0;
    ofKind.set(c.id, before + n);
    // A figure's clothes and hair from an earlier scene of the same clip ("a girl in a purple dress",
    // then "the girl waves"): opts.carry, figure id -> { color, hair }
    const was = opts.carry?.[m.id];
    const mc = was && ((!m.color && was.color) || (!m.hair && was.hair) || was.features)
      ? { ...m, color: m.color ?? was.color, hair: m.hair ?? was.hair, ...(was.features || m.features ? { features: mergeFeatures(was.features, m.features) } : {}) } : m;
    for (let k = 0; k < n; k++) items.push({ c, m: mc, k, aid: m.id, alt: before + k });
  }
  // How each figure is drawn the same way every time: a recurring character by its own look
  // (opts.identities, src/individuals.js), anyone else by the scene's seed
  // (and heard in its own voice: the n-th character has the n-th voice of its kind)
  for (const it of items) {
    it.look = lookOf(it.aid, { seed, k: it.k, alt: it.alt, vary, looks: opts.identities });
    if (it.m.hair) it.look = { ...it.look, colors: { ...it.look.colors, hair: it.m.hair } };
    // (a face and hair said in the prompt: "with big eyes and curly hair")
    if (it.m.features && Object.keys(it.m.features).length) it.look = { ...it.look, features: mergeFeatures(it.look.features, it.m.features) };
    it.voice = opts.identities?.has(it.aid) ? Number(whoOf(it.aid).slice(3)) - 1 : it.alt;
  }
  items.splice(maxItems);
  // Things in someone's hands ("a woman holds a phone"): drawn in the hands of their holder, one
  // each, not set down in the scene
  for (const it of items) {
    if (!it.m.heldBy) continue;
    const holder = items.find((h) => h.aid === it.m.heldBy && !h.holding && !h.m.heldBy);
    if (holder) { holder.holding = it; it.inHand = true; }
  }
  for (let i = items.length - 1; i >= 0; i--) if (items[i].inHand) items.splice(i, 1);
  const { timeline } = opts;
  // What someone thinks of ("a boy thinks about a cake", "she has an idea"): in a thought bubble
  // over their head, not in the scene
  if (!timeline) {
    for (const it of items) {
      if (!it.m.thoughtOf) continue;
      const thinker = items.find((h) => h.aid === it.m.thoughtOf && !h.m.thoughtOf);
      if (thinker && (thinker.thoughts?.length ?? 0) < 3) { (thinker.thoughts ??= []).push(it); it.inThought = true; }
    }
    for (let i = items.length - 1; i >= 0; i--) if (items[i].inThought) items.splice(i, 1);
  }
  // Doing things together in a still scene (src/text/matcher.js relations): sitters and riders go
  // on their seat or bike (drawn with it, see carried()), partners stand side by side
  const isPerson = (it) => /^people/.test(it.c.category ?? '');
  if (!timeline) {
    for (const it of items) {
      const by = it.m.carries?.by;
      if (!by || !(it.c.seatTop || it.c.saddle)) continue;
      const room = it.c.saddle || it.c.id === 'chair' ? 1 : 3;
      it.carried = items.filter((o) => o !== it && by.includes(o.aid) && !o.onSeat && !o.carried && isPerson(o)).slice(0, room);
      for (const o of it.carried) o.onSeat = it;
    }
    for (const it of items) {
      const want = it.m.pair;
      if (!want || it.partner || it.onSeat || !isPerson(it)) continue;
      const o = items.find((x) => x !== it && x.aid === want.with && !x.partner && !x.onSeat && (x.m.pair?.with === it.aid || want.with === it.aid));
      if (!o) continue;
      it.partner = o; o.partner = it;
      it.together = want.how; o.together = want.how;
      it.first = true;
      // (side by side in the row: the partner right after)
      items.splice(items.indexOf(o), 1);
      items.splice(items.indexOf(it) + 1, 0, o);
    }
  }

  // (one of "your places", made in the studio: opts.setting, src/places.js)
  const env = opts.setting ? applySetting(detectEnv(items, words), opts.setting, { force: Boolean(opts.settingForce) }) : detectEnv(items, words);
  // (words on the board: from the prompt, else from the place made in the studio)
  if (opts.boardText || env.roomCustom?.boardText) env.boardText = opts.boardText || env.roomCustom.boardText;
  // A figure walking toward or away from the camera, or a timeline where actors walk and stop:
  // the ground must not scroll sideways under them.
  if (timeline || items.some((it) => ['approach', 'recede'].includes(it.m.animation))) env.parallax = false;
  const pal = palette(env);
  // (a low or high camera chosen for the scene: the horizon drops or rises, figures loom or shrink)
  const angle = SHOT_ANGLES[shotChoice(opts.shot)?.kind] ?? null;
  const hY = angle && !env.room ? H * angle.horizon : H * (env.water ? 0.58 : 0.62);

  const isOnlyPeople = items.length > 0 && items.every((it) => it.c.category === 'people');
  const hasLandscape = items.some((it) => ['tree', 'mountain', 'house', 'cloud', 'sun', 'car', 'flower'].includes(it.c.id));
  const isStylizedFigure = ['stickman', 'editorial', 'cute2d', 'geometric', 'whiteboard', 'doodle', 'papercut', 'comic'].includes(style);

  // When focusing on characters or in stylized modes, make characters prominent heroes!
  let unit = H * 0.3;
  if (isOnlyPeople || (isStylizedFigure && !hasLandscape) || (!hasLandscape && items.length <= 3 && items.some(it => it.c.category === 'people'))) {
    // (a thought bubble needs room over its thinker's head)
    const crowd = items.length + (items.some((it) => it.thoughts) ? 1 : 0);
    unit = crowd === 1 ? H * 0.65 : crowd === 2 ? H * 0.52 : H * 0.46;
  }

  const groups = { background: [], sky: [], air: [], back: [], water: [], underwater: [], front: [] };

  // (a tall or short character is drawn bigger or smaller: src/looks.js)
  for (const it of items) it.h = it.c.scale * unit * (it.m.size || 1) * (HEIGHTS[it.look?.features?.height] ?? 1) * (angle?.scale ?? 1);
  // (in a classroom, the board stays readable: nobody stands taller than the space below it)
  if (env.roomKind === 'classroom') for (const it of items) it.h = Math.min(it.h, H * 0.5);
  // With no tree/house/mountain to give a sense of real size, small subjects (a cat, apples)
  // would be specks on the grass: zoom everything in together so the tallest grounded one
  // stands about 40% of the frame, keeping their sizes relative to each other.
  const grounded = items.filter((it) => !['sky', 'air', 'background'].includes(it.c.placement));
  if (!hasLandscape && grounded.length) {
    const zoom = clamp((H * 0.4) / Math.max(...grounded.map((it) => it.h)), 1, 3);
    items.forEach((it) => { it.h *= zoom; });
  }

  // A seat is as high as the hips of whoever sits on it (the tallest, if several: the others' feet
  // dangle), and wide enough for them; sitters and riders keep their size, as a share of it
  for (const it of items) {
    if (!it.carried?.length) continue;
    for (const o of it.carried) {
      o.pose = drawConcept(o.c, { ...o.look, style, seat: it.c.saddle ? 'ride' : 'seat', view: it.c.saddle ? 'side' : o.m.view });
    }
    // (a figure without legs to bend - an owl, a dragon - stands by the seat instead)
    for (const o of it.carried.filter((x) => (x.pose.seatAt ?? 99) > 86)) o.onSeat = null;
    it.carried = it.carried.filter((x) => x.onSeat);
    if (!it.carried.length) continue;
    if (it.c.seatTop) {
      const hips = Math.max(...it.carried.map((o) => ((o.c.baseline ?? 96) - o.pose.seatAt) * (o.h / 100)));
      it.h = hips / (((it.c.baseline ?? 96) - it.c.seatTop) / 100);
      const need = it.carried.reduce((sum, o) => sum + o.h * (o.c.width ?? 0.8) * 0.85, 0);
      it.wf = Math.max(it.c.width ?? 0.8, need / it.h);
    }
    for (const o of it.carried) o.ratio = o.h / it.h;
  }
  // Working at a desk ("sits at his desk with his laptop and a coffee"): on a chair behind it, the
  // desk in front hiding the legs, and what is on it (a laptop, a coffee, a phone, books) on top
  const desk = !timeline && DESK_RE.test((words || []).join(' ')) && items.find((it) => it.c.id === 'table' && !it.carried?.length);
  // (someone already on a chair "at the desk" moves to it, with the chair)
  const worker = desk && items.find((it) => isPerson(it) && (!it.onSeat || it.onSeat.c.id === 'chair') && !it.carried);
  const seated = worker && drawConcept(worker.c, { ...worker.look, style, seat: 'seat' });
  if (worker && seated.seatAt != null && seated.seatAt <= 86) {
    // (a desk comes up to the waist of whoever sits at it; its things keep their own sizes)
    desk.desk = { worker, things: [] };
    if (worker.onSeat) { const chair = worker.onSeat; chair.carried = chair.carried.filter((x) => x !== worker); if (!chair.carried.length) chair.onSeat = desk; }
    worker.onSeat = desk;
    worker.seated = seated;
    // (what they hold goes on the desk too)
    if (worker.holding && DESK_THINGS.has(worker.holding.c.id)) { desk.desk.things.push(worker.holding); worker.holding = null; }
    for (const o of items) if (DESK_THINGS.has(o.c.id) && !o.onSeat && desk.desk.things.length < 4) { desk.desk.things.push(o); o.onSeat = desk; }
    // (the desk and its worker are the picture: as big as one or two people standing would be)
    const left = items.filter((x) => !x.onSeat && x !== desk && /^(people|animals|objects)/.test(x.c.category ?? '')).length;
    worker.h = Math.min(Math.max(worker.h, H * (left === 0 ? 0.66 : left === 1 ? 0.56 : 0.48)), env.roomKind === 'classroom' ? H * 0.5 : H);
    desk.h = worker.h * 0.78;
    desk.wf = 1.5;
  }
  // In bed: asleep ("sleeps in the bedroom", "is asleep in bed") or awake ("lies in bed", "reads in
  // bed", "looks at her phone in bed", "still awake in her bedroom"), lying under a blanket in a bed
  // of their own (a bed said in the words goes into it); awake, what they hold up (a phone, a book)
  if (!timeline) {
    const said = (words || []).join(' ');
    const bedroom = /\b(bed|bedroom|bedtime)\b/.test(said) || items.some((it) => it.c.id === 'bed');
    const asleep = /\b(asleep|sleeps|sleeping|slept)\b/.test(said);
    for (const it of items) {
      if (!isPerson(it) || it.onSeat || it.carried || !bedroom) continue;
      const sleeping = it.m.animation === 'sleep' || asleep;
      if (!sleeping && !IN_BED_RE.test(said)) continue;
      it.inBed = { asleep: sleeping };
      it.wf = 1.3;
      // (a bed is low: a little bigger, so it shows above a video's caption)
      it.h *= 1.25;
      const bed = items.find((b) => b.c.id === 'bed' && !b.onSeat);
      if (bed) bed.onSeat = it;
      if (!sleeping) {
        const thing = (it.holding && IN_BED_THINGS.has(it.holding.c.id)) ? it.holding : items.find((o) => IN_BED_THINGS.has(o.c.id) && !o.onSeat);
        if (thing) { it.inBed.holds = thing; thing.onSeat = it; if (it.holding === thing) it.holding = null; }
      }
      break;
    }
  }
  for (let i = items.length - 1; i >= 0; i--) if (items[i].onSeat) items.splice(i, 1);
  // Partners: holding hands, the gap that makes their hands meet; hugging, close and turned to each other
  for (const it of items) {
    if (!it.first) continue;
    const o = it.partner;
    it.noFlip = true; o.noFlip = true;
    if (it.together === 'hands') {
      it.reach = 'right'; o.reach = 'left';
      const a = drawConcept(it.c, { ...it.look, style, reach: 'right' }).hand, b = drawConcept(o.c, { ...o.look, style, reach: 'left' }).hand;
      // (centre to centre: where the hands are, minus half of each one's width)
      it.gapK = a && b ? ((a[0] - 50) * it.h - (b[0] - 50) * o.h) / 100 / it.h - ((it.c.width ?? 0.8) * it.h + (o.c.width ?? 0.8) * o.h) / 2 / it.h : 0;
    } else {
      it.looking = { view: 'three-quarter', mirror: false, gaze: { x: 1, y: 0 } };
      o.looking = { view: 'three-quarter', mirror: true, gaze: { x: -1, y: 0 } };
      it.m = { ...it.m, animation: it.m.animation ?? 'hold' };
      o.m = { ...o.m, animation: o.m.animation ?? 'hold' };
      it.gapK = -0.32 * Math.min((it.c.width ?? 0.8), (o.c.width ?? 0.8) * (o.h / it.h));
    }
  }

  for (const it of items) {
    const pl = it.c.placement || 'ground';
    if (groups[pl] && pl !== 'front' && pl !== 'back') groups[pl].push(it);
    else if (it.c.scale >= 1.4) groups.back.push(it);
    else groups.front.push(it);
  }
  const hasGround = groups.back.length + groups.front.length > 0;

  const uid = newUid();
  // Landscape backdrops have a horizon to give depth; flat studio backdrops draw their own shadows.
  const landscape = !env.room && !FLAT_BACKDROP_STYLES.includes(style);
  const shadows = landscape && style !== 'outline';
  const motionCss = [];
  const cues = []; // what is heard (src/sound.js)
  let soundLoop = null;
  // Everyone walking across keeps the pace of the tallest walker (about 0.9 body heights a second).
  const acrossSpeed = Math.max(45, 0.9 * Math.max(0, ...items.filter((it) => it.m.animation === 'walk-across').map((it) => it.h)));

  const out = [];
  // A named individual's key and id, and a dressed-differently figure, for the studio (its photo,
  // and redrawing it the same way)
  const who = (it) => `${it.aid !== it.c.id ? ` data-who="${whoOf(it.aid)}" data-aid="${it.aid}"` : ''} data-seed="${it.look.seed}"${it.look.vary ? ' data-vary="1"' : ''}${it.look.colors ? ` data-colors="${Object.entries(it.look.colors).map(([r, c]) => `${r}:${c}`).join(' ')}"` : ''}${it.look.features ? ` data-features="${Object.entries(it.look.features).map(([k, v]) => `${k}:${v}`).join(' ')}"` : ''}${it.holding ? ` data-held="${it.holding.c.id}"${it.holding.m.color ? ` data-held-color="${it.holding.m.color}"` : ''}` : ''}`;
  // A thought bubble over a thinker's head, up to its right (whichever way it faces), in its own
  // units: a cloud with what it thinks of drawn small inside, and two little puffs leading to it
  const thoughtBubble = (it, flip) => {
    if (!it.thoughts?.length) return '';
    const n = it.thoughts.length, w = 30 + n * 18, h = 36, cx = 66 + w / 2, cy = -16;
    const puffs = [];
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      puffs.push([cx + Math.cos(a) * w * 0.44, cy + Math.sin(a) * h * 0.4, 9 + (k % 3) * 1.5]);
    }
    const ring = puffs.map(([x, y, r]) => `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(r)}"/>`).join('');
    let inside = '';
    const cell = (w - 8) / n, k = Math.min(cell, h - 2) / 100;
    it.thoughts.forEach((t, i) => {
      const x = cx - (w - 8) / 2 + cell * (i + 0.5) - 50 * k, y = cy - 50 * k + 2;
      const shapes = drawConcept(t.c, { ...t.look, color: t.m.color, style, expression: t.m.expression || 'happy' });
      inside += `<g transform="translate(${r2(x)} ${r2(y)}) scale(${r2(k * 1000) / 1000})">${shapesToSvg(shapes, style, { olk: 1.4 })}</g>`;
    });
    const body = `<g class="pg-thought" data-thinks="${it.thoughts.map((t) => t.c.id).join(' ')}"><g class="pg-emote-move">`
      + `<circle cx="62" cy="8" r="2.6" fill="#ffffff" stroke="#94a3b8" stroke-width="1.4"/><circle cx="68.5" cy="-0.5" r="4" fill="#ffffff" stroke="#94a3b8" stroke-width="1.4"/>`
      + `<g fill="#ffffff" stroke="#94a3b8" stroke-width="2.6">${ring}</g><g fill="#ffffff">${ring}<ellipse cx="${r2(cx)}" cy="${r2(cy)}" rx="${r2(w * 0.44)}" ry="${r2(h * 0.4)}"/></g>`
      + `${inside}</g></g>`;
    return flip ? `<g transform="translate(100 0) scale(-1 1)">${body}</g>` : body;
  };
  // Where a sign over a figure's head goes, in its own units (a person's head is near the top)
  // (a figure of your own says where its face is: src/puppets.js signAt)
  const headOf = (it) => it.c.signAt ?? (/^people/.test(it.c.category ?? '') ? [62, 6] : [68, 16]);
  // What a figure holds, for drawConcept
  const heldOf = (it) => (it.holding ? { id: it.holding.c.id, color: it.holding.m.color } : undefined);
  // Whoever sits on a seat or rides a bike, drawn on it in its own units (s: its scale): hips on the
  // seat (spread along a bench) or the saddle, each in its own look and marked for its photo face
  const carried = (it, s) => (it.carried ?? []).map((o, i, all) => {
    const k = o.ratio;
    const ride = Boolean(it.c.saddle);
    const shapes = drawConcept(o.c, {
      ...o.look, color: o.m.color, style, expression: o.m.expression || 'happy', seat: ride ? 'ride' : 'seat',
      view: ride ? 'side' : o.m.view, held: heldOf(o), animation: o.m.expression === 'talking' ? 'talk' : undefined,
    });
    const span = it.c.seatSpan ?? [12, 88];
    const x = ride ? it.c.saddle[0] - (shapes.hipX ?? 50) * k
      : span[0] + ((i + 0.5) * (span[1] - span[0])) / all.length - 50 * k;
    const y = (ride ? it.c.saddle[1] : it.c.seatTop) - (shapes.seatAt ?? 70) * k;
    const svg = shapesToSvg(shapes, style, { olk: clamp(W / 280 / (2.4 * s * k), 0.35, 4) });
    return `<g class="pg-${ride ? 'rider' : 'sitter'}" data-id="${o.c.id}"${who(o)} transform="translate(${r2(x)} ${r2(y)}) scale(${r2(k * 1000) / 1000})">${svg}${thoughtBubble(o, false)}</g>`;
  }).join('');
  // At a desk: the chair and its worker behind the desk's drawing, its things on its top (in the
  // desk's own units: s is its scale)
  const atDesk = (it, s) => {
    if (!it.desk) return { before: '', after: '' };
    const { worker: o, things } = it.desk, k = o.h / it.h;
    const shapes = drawConcept(o.c, { ...o.look, color: o.m.color, style, expression: o.m.expression || 'happy', seat: 'seat', view: o.m.view });
    const chair = getConcept('chair');
    const hips = ((o.c.baseline ?? 96) - (shapes.seatAt ?? 76)) * k;
    const kc = hips / ((chair.baseline ?? 96) - chair.seatTop);
    const olk = (kk) => clamp(W / 280 / (2.4 * s * kk), 0.35, 4);
    let before = `<g class="pg-desk-chair" transform="translate(${r2(50 - 50 * kc)} ${r2(96 - (chair.baseline ?? 96) * kc)}) scale(${r2(kc * 1000) / 1000})">${shapesToSvg(drawConcept(chair, { style }), style, { olk: olk(kc) })}</g>`;
    before += `<g class="pg-sitter" data-id="${o.c.id}"${who(o)} transform="translate(${r2(50 - 50 * k)} ${r2(96 - (o.c.baseline ?? 96) * k)}) scale(${r2(k * 1000) / 1000})">${shapesToSvg(shapes, style, { olk: olk(k) })}</g>`;
    const order = [...things].sort((a, b) => (DESK_SIZES[b.c.id] ?? 0.1) - (DESK_SIZES[a.c.id] ?? 0.1));
    // (the biggest - a laptop, a computer - at their side, so their face shows; the rest beyond)
    const xs = [24, 78, 90, 10];
    const after = order.map((t, i) => {
      const kt = (DESK_SIZES[t.c.id] ?? 0.1) * k;
      const x = xs[i] - 50 * kt, y = 47 - (t.c.baseline ?? 96) * kt;
      return `<g class="pg-on-desk" data-id="${t.c.id}" transform="translate(${r2(x)} ${r2(y)}) scale(${r2(kt * 1000) / 1000})">${shapesToSvg(drawConcept(t.c, { ...t.look, color: t.m.color, style }), style, { olk: olk(kt) })}</g>`;
    }).join('');
    return { before, after };
  };
  // Who says what in a still scene ("Tom says “Hello!”"): figure id -> words
  const said = new Map((opts.speech || []).map((sp) => [sp.who, sp.text]));
  const talkers = []; // who speaks where, for their speech bubbles: { x, top, text, room, of }
  // Who looks at whom ("a boy and a girl looking at each other"): concept id -> concept id | 'camera'
  const looks = new Map((opts.looks || []).map((l) => [l.who, l.at]));
  const placed = [], later = [];
  // Which way someone looks: people turn three-quarters toward the nearest one they look at with
  // their eyes on them (up at the sky, down at a dog); animals face them. Not while travelling.
  const lookFor = (it, cx) => {
    if (TRAVEL_MOTIONS.includes(it.m.animation)) return null;
    const at = looks.get(it.aid), person = it.c.category === 'people';
    if (at === 'camera') return { view: person ? it.m.view ?? 'front' : it.m.view, mirror: false };
    const others = placed.filter((p) => p.it !== it && p.it.aid === at);
    if (!others.length) return null;
    const o = others.reduce((a, b) => (Math.abs(b.cx - cx) < Math.abs(a.cx - cx) ? b : a));
    const dx = o.cx - cx;
    const up = ['sky', 'air'].includes(o.it.c.placement), small = !up && o.it.h < it.h * 0.7;
    const gaze = { x: 0.7, y: up ? -1 : small ? 0.6 : 0 };
    if (!person) return { view: it.m.view, mirror: dx < 0 };
    if (it.m.view && it.m.view !== 'three-quarter') return { view: it.m.view, mirror: false, gaze: { ...gaze, x: Math.sign(dx) } };
    return { view: 'three-quarter', mirror: dx < 0, gaze };
  };
  const actorSlots = new Map(); // timeline actors: drawn last, once every position is known
  const propsAt = new Map(); // where things are, for "walks to the tree"
  const place = (it, cx, y, anchor = 'bottom') => {
    const s = it.h / 100;
    const base = anchor === 'bottom' ? it.c.baseline ?? 96 : 50;
    const w = it.w ?? it.h * (it.c.width ?? 0.8);
    if (timeline && it.m.actor) {
      actorSlots.set(`${it.aid}#${it.k}`, { id: it.aid, it, cx, y, s, base, w, h: it.h, olk: clamp(W / 280 / (2.4 * s), 0.35, 4) });
      return;
    }
    if (!propsAt.has(it.aid)) propsAt.set(it.aid, { cx, w, y, h: it.h, anchor });
    // Someone looking at someone is drawn once everyone has a place, to know which way to look
    if (looks.has(it.aid) && !it.looking) {
      placed.push({ it, cx, y });
      const at = out.length;
      out.push('');
      later.push(() => { it.looking = lookFor(it, cx) || {}; place(it, cx, y, anchor); out[at] = out.pop(); });
      return;
    }
    if (!it.looking) placed.push({ it, cx, y });
    const look = it.looking?.mirror !== undefined ? it.looking : null;
    const x0 = cx - 50 * s, y0 = y - base * s;
    const flip = look ? look.mirror && it.c.flippable !== false : it.k % 2 === 1 && it.c.flippable !== false && !it.noFlip;
    const tr = flip ? `translate(${x0 + 100 * s} ${y0}) scale(${-s} ${s})` : `translate(${x0} ${y0}) scale(${s})`;
    const olk = clamp(W / 280 / (2.4 * s), 0.35, 4);
    // Words to say: its own ("Tom says “Hi!”"), or a clip scene's caption when the figure talks
    const words = said.get(it.aid) ?? (opts.caption && (it.m.animation === 'talk' || it.m.expression === 'talking') ? opts.caption : null);
    let animation = it.m.animation ?? (words ? 'talk' : undefined);
    let lips = '';
    if (words) {
      // The words, then a pause, over and over
      const name = `${uid}l${out.length}`, loop = r2(lipKeys(words).duration + 2);
      motionCss.push(lipCss(name, [{ start: 0.5, text: words }], loop));
      lips = ` data-lips="${name}"`;
      // (a bubble for its own words; a clip's caption is already shown under the picture)
      // (several of a kind saying it together: one bubble)
      if (said.has(it.aid) && !talkers.some((tk) => tk.text === words)) talkers.push({ x: cx, top: y0 + 2 * s, text: words, room: w, of: `${it.c.id}#${it.k}`, who: it.aid });
      opts.speechDuration = Math.max(opts.speechDuration ?? 0, loop);
      soundLoop = Math.max(soundLoop ?? 0, loop);
    }
    // Its mood said out loud (one after another), its words babbled in time with its lips
    if (it.m.expression || words || it.m.animation) cues.push(...stillCues({ expression: it.m.expression, words, animation: it.m.animation, at: 0.3 + cues.length * 0.45 }, voiceOf(it.c.id, it.voice)));
    // (walking or running on the spot, or across: its footsteps, by its size)
    if (['walk', 'run', 'walk-across', 'jog'].includes(it.m.animation)) cues.push({ t: 0.1, s: 'steps', d: 4, ...(it.m.animation === 'run' ? { g: 'run' } : {}), z: r2(footSize(it)) });
    if (!animation) {
      if (it.c.category === 'people') animation = 'blink';
      else if (it.c.id === 'sun') animation = 'pulse';
      else if (it.c.id === 'tree' || it.c.id === 'flower') animation = 'sway';
      else if (it.c.id === 'bird') animation = 'flap';
      else if (it.c.id === 'boat') animation = 'rock';
      else if (it.c.id === 'car') animation = 'drive';
      else if (it.c.id === 'dog') animation = 'wag';
    }
    const expression = it.m.expression || 'happy';
    const motion = TRAVEL_MOTIONS.includes(animation) ? animation : null;
    // Approaching / receding figures walk in place while their wrapper carries them through depth.
    const limbs = motion === 'approach' || motion === 'recede' ? 'walk' : animation;
    // Toward the camera we see the face, away from it the back (unless the prompt said otherwise);
    // walking or running across the scene is drawn in profile by the people themselves.
    const view = it.m.view ?? look?.view ?? (motion === 'recede' ? 'back' : motion === 'approach' ? 'front' : undefined);
    const shapes = drawConcept(it.c, {
      ...it.look,
      color: it.m.color,
      expression,
      animation: limbs,
      view,
      gaze: look?.gaze,
      style,
      held: heldOf(it),
      reach: it.reach,
    });
    it.at = { x0, y0, s, flip };
    // The drawing sits innermost in .pg-figure, so the studio can redraw it (a new expression)
    // while the animation wrapper, shadow and travel motion around it stay; whoever sits on it or
    // rides it comes after, in its motion
    const drawing = shapesToSvg(shapes, style, { olk });
    // (how it feels, as a sign over its head: "!", "?", a heart, "Zzz"...)
    // (an animal asleep lies down, 13 lower: its "Zzz" goes down with it)
    const signHead = animation === 'sleep' && /^(animals|wildlife)/.test(it.c.category ?? '') ? [headOf(it)[0], headOf(it)[1] + 13] : headOf(it);
    const sign = it.inBed ? emote(it.inBed.asleep ? 'sleepy' : expression, { head: [22, 30] }) : emote(animation === 'sleep' ? 'sleepy' : expression, { head: signHead, mirrored: flip });
    const deskParts = atDesk(it, s);
    const drawn = it.desk ? deskDrawing(style, olk) : it.inBed ? bedDrawing(it, style, olk) : drawing;
    let wrappedContent = `${deskParts.before}<g class="pg-figure">${drawn}${sign}</g>${deskParts.after}${carried(it, s)}${thoughtBubble(it, flip)}`;
    if (limbs && limbs !== 'blink' && !it.inBed && !drawing.includes(`pg-anim-${limbs}`)) {
      wrappedContent = `<g class="pg-anim-${limbs}">${wrappedContent}</g>`;
    }
    if (shadows && anchor === 'bottom' && !['background', 'water'].includes(it.c.placement)) {
      // Contact shadow on the ground: outside the figure's own animation, so it stays put when jumping.
      const rx = 50 * (it.c.width ?? 0.8) * 0.72;
      wrappedContent = `<ellipse class="pg-shadow" cx="50" cy="${base}" rx="${r2(rx)}" ry="${r2(Math.max(3, rx * 0.13))}" fill="#000000" opacity="0.16"/>${wrappedContent}`;
    }
    if (motion) {
      const name = `${uid}m${out.length}`;
      const { keyframes, duration, delay } = travelKeyframes(motion, {
        cx, y, s, sx: flip ? -s : s, F: { x: 50, y: base }, w: it.w ?? it.h * (it.c.width ?? 0.8), W, hY, speed: acrossSpeed,
      });
      motionCss.push(`@keyframes ${name} { ${keyframes} }`);
      const cls = motion === 'walk-across' ? 'pg-motion-across' : `pg-motion-${motion}`;
      wrappedContent = `<g class="${cls}" style="animation: ${name} ${duration}s linear ${delay}s infinite;">${wrappedContent}</g>`;
    }
    const animAttr = animation ? ` data-animation="${animation}"` : '';
    const exprAttr = expression ? ` data-expression="${expression}"` : '';
    const viewAttr = view ? ` data-view="${view}"` : '';
    const colorAttr = it.m.color ? ` data-color="${it.m.color}"` : '';
    out.push(`<g class="movable-item" data-id="${it.c.id}" data-k="${it.k}" data-label="${it.c.label || it.c.id}"${who(it)}${lips}${animAttr}${exprAttr}${viewAttr}${colorAttr} transform="${tr.replace(/(\d+\.\d{3})\d+/g, '$1')}" style="cursor: grab;">${wrappedContent}</g>`);
  };

  // One timeline actor: a wrapper moved by keyframes, and one drawing per pose, switched on and off
  // in step with the beats. With animation off (still exports) the last on-screen pose shows in place.
  const renderActor = ({ it, y, s, base, olk, w }, track, T, name, lips = null) => {
    // Still renders show the last pose the figure had on screen, in the front row
    const onScreen = track.filter((seg) => seg.x1 > -w / 2 && seg.x1 < W + w / 2 && seg.k1 > 0.5);
    const last = onScreen[onScreen.length - 1] || track[track.length - 1];
    const home = last ? last.x1 : 0;
    const at = (sec) => pct(sec / T);
    const variants = new Map();
    for (const seg of track) {
      const p = seg.pose;
      const key = `${p.anim}|${p.expression}|${p.view}|${p.mirror}|${p.gaze ? `${p.gaze.x},${p.gaze.y}` : ''}|${p.seat ?? ''}|${p.lift ?? ''}`;
      if (!variants.has(key)) variants.set(key, { pose: p, windows: [] });
      seg.variant = key;
      variants.get(key).windows.push(seg);
    }

    // Position in the figure's own units: across the front row, and into depth on a perspective path
    // (scaled about its feet, moved toward the horizon); depth moves are sampled so the size grows
    // as 1/distance. Every keyframe has the same transform list so the browser interpolates it.
    const F = { x: 50, y: base };
    const place = (x, k) => {
      const dx = (W / 2 + (x - W / 2) * k - home) / s, dy = (hY + (y - hY) * k - y) / s;
      return `transform: translate(${r2(F.x + dx)}px, ${r2(F.y + dy)}px) scale(${r2(k * 1000) / 1000}) translate(${-F.x}px, ${-F.y}px);`;
    };
    const points = [];
    for (const seg of track) {
      const steps = Math.abs(seg.k1 - seg.k0) > 1e-6 ? 12 : 1;
      for (let j = 0; j <= steps; j++) {
        const u = j / steps;
        points.push([seg.t0 + (seg.t1 - seg.t0) * u, seg.x0 + (seg.x1 - seg.x0) * u, 1 / (1 / seg.k0 + (1 / seg.k1 - 1 / seg.k0) * u)]);
      }
    }
    let posFrames = track.length && track[0].t0 > 0 ? `0% { ${place(track[0].x0, track[0].k0)} } ` : '', lastPct = -1;
    for (const [sec, x, k] of points) {
      let pc = Math.max(r2((sec / T) * 100), lastPct === -1 ? 0 : lastPct);
      if (pc === lastPct) pc = r2(pc + 0.01);
      if (pc > 100) break;
      posFrames += `${pc}% { ${place(x, k)} } `;
      lastPct = pc;
    }
    // Hold the last place to the end of the loop (a figure that has left must not drift back)
    if (points.length && lastPct < 100) posFrames += `100% { ${place(points[points.length - 1][1], points[points.length - 1][2])} } `;
    motionCss.push(`@keyframes ${name}p { ${posFrames}}`);
    // The shadow shows while the figure is on stage at all (before it arrives and after it leaves, not)
    let shadowFrames = `0% { opacity: ${track[0]?.t0 === 0 ? 1 : 0}; } `;
    track.forEach((seg, j) => {
      shadowFrames += `${at(seg.t0)} { opacity: 1; } `;
      const next = track[j + 1];
      if (!next || next.t0 > seg.t1 + 1e-6) shadowFrames += `${at(seg.t1)} { opacity: 0; } `;
    });
    motionCss.push(`@keyframes ${name}s { ${shadowFrames}}`);

    let poses = '', i = 0;
    for (const [key, { pose }] of variants) {
      // Visibility: on during this pose's windows, off otherwise (step-end holds each value)
      let frames = `0% { opacity: ${track[0]?.t0 === 0 && track[0].variant === key ? 1 : 0}; } `;
      track.forEach((seg, j) => {
        frames += `${at(seg.t0)} { opacity: ${seg.variant === key ? 1 : 0}; } `;
        const next = track[j + 1];
        if (!next || next.t0 > seg.t1 + 1e-6) frames += `${at(seg.t1)} { opacity: 0; } `;
      });
      motionCss.push(`@keyframes ${name}v${i} { ${frames}}`);
      const shapes = drawConcept(it.c, {
        ...it.look, color: it.m.color, style,
        expression: pose.expression || 'happy', animation: pose.anim, view: pose.view, gaze: pose.gaze, held: heldOf(it), seat: pose.seat,
      });
      // The drawing sits innermost in .pg-figure, so the studio can redraw it (a new expression)
      // while the pose's animation wrapper and mirroring around it stay
      const drawing = shapesToSvg(shapes, style, { olk });
      let svg = `<g class="pg-figure">${drawing}</g>`;
      if (pose.anim && !drawing.includes(`pg-anim-${pose.anim}`)) svg = `<g class="pg-anim-${pose.anim}">${svg}</g>`;
      // (sitting on a seat: hips up on it)
      if (pose.lift) svg = `<g transform="translate(0 ${r2(-pose.lift / s)})">${svg}</g>`;
      if (pose.mirror && it.c.flippable !== false) svg = `<g transform="translate(100 0) scale(-1 1)">${svg}</g>`;
      // How it feels in this pose, as a sign over its head (there while it feels that way)
      const [hx, hy] = headOf(it);
      svg += emote(pose.anim === 'sleep' ? 'sleepy' : pose.expression, { head: [hx, hy - (pose.lift ?? 0) / s] });
      const still = last && last.variant === key;
      const attrs = `${pose.anim ? ` data-anim="${pose.anim}"` : ''}${pose.view ? ` data-view="${pose.view}"` : ''}`;
      poses += `<g class="pg-timeline-pose"${attrs} opacity="${still ? 1 : 0}" style="animation: ${name}v${i} ${r2(T)}s step-end infinite;">${svg}</g>`;
      i++;
    }
    const rx = 50 * (it.c.width ?? 0.8) * 0.72;
    const shadow = shadows ? `<g style="animation: ${name}s ${r2(T)}s step-end infinite;"><ellipse class="pg-shadow" cx="50" cy="${base}" rx="${r2(rx)}" ry="${r2(Math.max(3, rx * 0.13))}" fill="#000000" opacity="0.16"/></g>` : '';
    const tr = `translate(${r2(home - 50 * s)} ${r2(y - base * s)}) scale(${r2(s * 1000) / 1000})`;
    return `<g class="movable-item" data-id="${it.c.id}" data-k="${it.k}" data-label="${it.c.label || it.c.id}" data-actor="${it.c.id}"${who(it)}${lips ? ` data-lips="${lips}"` : ''}${it.m.color ? ` data-color="${it.m.color}"` : ''} transform="${tr}" style="cursor: grab;"><g class="pg-timeline-move" style="animation: ${name}p ${r2(T)}s linear infinite;">${shadow}${poses}</g></g>`;
  };

  // background objects (mountains, rainbows): large, behind everything, sitting on the horizon
  layoutRow(groups.background, W, H * 0.6, rng);
  groups.background.forEach((it) => place(it, it.cx, hY + H * 0.03));

  // sky: the biggest celestial body goes top-right, others spread across the top
  const sky = [...groups.sky].sort((a, b) => b.c.scale - a.c.scale);
  let skyStart = 0.08, skyEnd = 0.92;
  if (sky.length && sky[0].c.scale >= 0.7) {
    const it = sky.shift();
    it.h = Math.min(it.h, H * 0.3);
    place(it, W * 0.83, H * 0.2, 'center');
    skyEnd = 0.68;
  }
  sky.forEach((it, i) => {
    it.h = Math.min(it.h, H * 0.22);
    const x = W * (skyStart + ((i + 0.5) / sky.length) * (skyEnd - skyStart)) + (rng() - 0.5) * W * 0.05;
    place(it, x, H * (0.12 + rng() * 0.14), 'center');
  });

  // air: birds, planes, balloons, kites
  groups.air.forEach((it, i) => {
    it.h = Math.min(it.h, H * 0.24);
    const x = W * (0.1 + ((i + 0.5) / groups.air.length) * 0.8) + (rng() - 0.5) * W * 0.06;
    place(it, x, H * (0.28 + rng() * 0.14), 'center');
  });

  // ground: big things (trees, houses) in a back row, everything else in front
  const frontY = (style === 'editorial' || style === 'stickman' || style === 'cute2d' || style === 'whiteboard')
    ? H * 0.88
    : (env.water ? H * 0.97 : H * 0.95);

  if (groups.front.length === 0) {
    layoutRow(groups.back, W, H * 0.62, rng);
    groups.back.forEach((it) => place(it, it.cx, env.water ? frontY : H * 0.9));
  } else {
    layoutRow(groups.back, W, H * 0.58, rng);
    groups.back.forEach((it) => place(it, it.cx, env.water ? H * 0.9 : hY + H * 0.1));
  }

  // water surface and underwater
  const waterBottom = hasGround ? H * 0.84 : H;
  layoutRow(groups.water, W, (waterBottom - hY) * 1.2, rng);
  groups.water.forEach((it) => place(it, it.cx, hY + (waterBottom - hY) * 0.45));
  // (under the sea, the whole picture is water: sea animals are bigger and swim higher)
  if (env.underwater) {
    for (const it of groups.underwater) it.h *= 1.7;
    layoutRow(groups.underwater, W, H * 0.42, rng);
    // (above anyone standing on the seabed)
    const standing = groups.front.length + groups.back.length > 0;
    groups.underwater.forEach((it) => place(it, it.cx, standing ? H * (0.24 + rng() * 0.12) : H * (0.42 + rng() * 0.22), 'center'));
  } else {
    // (a whale is big even seen from the shore: its back rises out of the water)
    const band = waterBottom - hY, big = (it) => it.c.tags?.includes('big');
    groups.underwater.forEach((it) => { if (!big(it)) it.h = Math.min(it.h, band * 0.5); else it.h *= 1.6; });
    layoutRow(groups.underwater, W, band * (groups.underwater.some(big) ? 1.15 : 0.5), rng);
    groups.underwater.forEach((it) => place(it, it.cx, hY + band * (big(it) ? 0.5 : 0.55 + rng() * 0.2), 'center'));
  }

  if (groups.front.length) {
    const front = groups.front;
    const rowWidth = front.reduce((sum, it) => sum + Math.min(it.h, H * 0.75) * (it.c.width ?? 0.8), 0) + (front.length - 1) * W * 0.03;
    // (letters spelling something stay in one row, in their order: smaller, not one behind another)
    if (landscape && front.length >= 4 && rowWidth > W * 0.92 && !front.some((it) => it.c.category === 'alphabet')) {
      // Too many to fit in one row: put every other item in a second row further back, smaller and
      // nearer the horizon, instead of shrinking everyone into a thin line.
      const FAR = 0.7;
      const far = front.filter((_, i) => i % 2 === 1);
      const near = front.filter((_, i) => i % 2 === 0);
      far.forEach((it) => { it.h *= FAR; });
      layoutRow(far, W, H * 0.75 * FAR, rng);
      far.forEach((it) => place(it, it.cx, hY + (frontY - hY) * FAR));
      layoutRow(near, W, H * 0.75, rng);
      near.forEach((it) => place(it, it.cx, frontY));
    } else {
      layoutRow(front, W, H * 0.75, rng);
      if (front.length === 1 && !hasLandscape) {
        front[0].cx = W / 2;
      }
      front.forEach((it) => place(it, it.cx, frontY));
    }
  }

  let cam = null; // { keys, T }
  // What the camera looks at: an actor (where it is at that moment) or anything else in the scene
  const focusAt = (tracks) => (id, t) => {
    const key = `${id}#0`; // a group: its first member
    if (tracks?.has(key)) {
      const slot = actorSlots.get(key);
      const { x, k } = posAt(tracks.get(key), t) ?? { x: slot.cx, k: 1 };
      return { x: W / 2 + (x - W / 2) * k, y: hY + (slot.y - hY) * k - slot.h * k * 0.55, h: slot.h * k };
    }
    const p = propsAt.get(id);
    return p ? { x: p.cx, y: p.anchor === 'bottom' ? p.y - p.h * 0.55 : p.y, h: p.h } : null;
  };
  for (const draw of later) draw();
  // Partners' hands joined (a hand in a hand), a heart over a hug
  for (const it of items) {
    if (!it.first || !it.at || !it.partner.at) continue;
    const o = it.partner, A = it.at, B = o.at;
    if (it.together === 'hands') {
      const a = drawConcept(it.c, { ...it.look, style, reach: 'right' }), b = drawConcept(o.c, { ...o.look, style, reach: 'left' });
      if (!a.hand || !b.hand) continue;
      const pa = [A.x0 + a.hand[0] * A.s, A.y0 + a.hand[1] * A.s], pb = [B.x0 + b.hand[0] * B.s, B.y0 + b.hand[1] * B.s];
      const r = Math.max(A.s, B.s) * 3.6, mid = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
      out.push(`<g class="pg-hands">`
        + `<line x1="${r2(pa[0])}" y1="${r2(pa[1])}" x2="${r2(mid[0])}" y2="${r2(mid[1])}" stroke="${a.handFill}" stroke-width="${r2(A.s * 7)}" stroke-linecap="round"/>`
        + `<line x1="${r2(pb[0])}" y1="${r2(pb[1])}" x2="${r2(mid[0])}" y2="${r2(mid[1])}" stroke="${b.handFill}" stroke-width="${r2(B.s * 7)}" stroke-linecap="round"/>`
        + `<circle cx="${r2(mid[0])}" cy="${r2(mid[1])}" r="${r2(r)}" fill="${a.handFill}"/></g>`);
    } else {
      const x = (A.x0 + 50 * A.s + B.x0 + 50 * B.s) / 2, y = Math.min(A.y0, B.y0) - 2 * A.s, k = A.s * 0.16;
      motionCss.push(`@keyframes ${uid}heart { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }`);
      out.push(`<g class="pg-heart" transform="translate(${r2(x)} ${r2(y)})"><g style="transform-box: fill-box; transform-origin: center; animation: ${uid}heart 1.4s ease-in-out infinite;">`
        + `<path transform="scale(${r2(k * 1000) / 1000})" d="M0 30 C-40 0 -28 -26 0 -10 C28 -26 40 0 0 30 Z" fill="#f43f5e"/></g></g>`);
    }
  }
  if (timeline && actorSlots.size) {
    const { T, tracks, camera: events, beatTimes, speeches, doings } = playTimeline(timeline, actorSlots, propsAt, W, opts.minDuration ?? 0);
    opts.timelineSpeeches = speeches.filter((sp) => sp.quoted).map((sp) => ({ who: sp.key.split('#')[0], text: sp.text }));
    // (for the camera director: where everyone is when, and who speaks when)
    opts.timelineTracks = tracks;
    opts.timelineSpeechTimes = speeches.filter((sp) => sp.quoted).map((sp) => ({ who: sp.key.split('#')[0], start: sp.start, end: sp.start + lipKeys(sp.text).duration, text: sp.text }));
    timeline.duration = r2(T);
    timeline.beatTimes = beatTimes;
    for (const { key, t0, act } of doings) {
      const { it } = actorSlots.get(key);
      cues.push(...actionCues({ ...act, z: footSize(it) }, t0, voiceOf(it.c.id, it.voice)));
    }
    soundLoop = r2(T); // (the animation's loop)
    for (const [key, slot] of actorSlots) {
      const name = `${uid}a${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const said = speeches.filter((sp) => sp.key === key);
      // (a start in the next beat is one in the same loop: keyframes after the loop's end are cut)
      if (said.length) motionCss.push(lipCss(`${name}l`, said, r2(T)));
      for (const sp of said.filter((x) => x.quoted)) {
        // Where the speaker is while talking, for the bubble (shown while the words last)
        const dur = lipKeys(sp.text).duration, p = posAt(tracks.get(key), sp.start + dur / 2) ?? { x: slot.cx, k: 1 };
        const foot = hY + (slot.y - hY) * p.k;
        talkers.push({ x: W / 2 + (p.x - W / 2) * p.k, top: foot - (slot.base - 2) * slot.s * p.k, text: sp.text, room: slot.w * p.k, of: `${slot.it.c.id}#${slot.it.k}`, from: sp.start - 0.15, to: Math.min(T, sp.start + dur + 0.8), T });
      }
      out.push(renderActor(slot, tracks.get(key), T, name, said.length ? `${name}l` : null));
    }
    if (events.length || timeline.follow) {
      const followed = timeline.follow && tracks.get(`${timeline.follow}#0`);
      const follow = timeline.follow ? { id: timeline.follow, start: followed?.[0]?.t0 ?? 0 } : null;
      cam = { T, keys: cameraKeys({ events, follow, T, W, H, focusAt: focusAt(tracks) }) };
    }
  } else if (opts.camera?.moves?.length) {
    // Camera directions without a timeline: play them in order, then ease back so the loop is seamless
    const ids = new Set(items.map((it) => it.aid));
    let t = 0.8;
    const events = opts.camera.moves.map((m) => {
      const id = m.target && [...ids].find((x) => x === m.target);
      const type = m.type === 'follow' ? 'zoomIn' : m.type;
      const ev = { ...m, type, target: id || null, t0: t, t1: t + (CAMERA_SECONDS[type] ?? 1.6) + 0.6 };
      t = ev.t1 + 1.2;
      return ev;
    });
    events.push({ type: 'reset', t0: t, t1: t + 1.4 });
    const T = r2(t + 1.4 + 0.4);
    const start = opts.camera.moves[0].type === 'zoomOut' ? { z: 1.8, fx: W / 2, fy: H * 0.58 } : null;
    cam = { T, keys: cameraKeys({ events, T, W, H, focusAt: focusAt(null), start }) };
    opts.camera.duration = T;
  }

  // The scene's mood (src/mood.js): chosen in the studio, else read from its words and feelings
  const chosen = moodChoice(opts.mood);
  const feelings = [...items.map((it) => it.m.expression), ...(timeline?.beats ?? []).flatMap((b) => b.actions.map((a) => a.expression))].filter(Boolean);
  const mood = chosen === 'none' ? null : chosen ?? detectMood(opts.caption || opts.text || '', feelings);
  opts.moodUsed = mood;
  // What the scene is made of, for the studio's scene card (src/scene-card.js)
  const timelineSaid = timeline ? (opts.timelineSpeeches ?? []) : [];
  opts.card = sceneCard({
    matches, timeline, env, mood, chosen: Boolean(chosen && chosen !== 'none') || chosen === 'none', board: env.boardText ?? null, caption: opts.caption ?? null,
    said: [...(opts.speech ?? []).map((sp) => ({ who: sp.who, text: sp.text })), ...timelineSaid],
  });
  // The camera director (src/director.js): the shots chosen on the scene card, else its own, when
  // the scene's words give no camera move
  const choice = shotChoice(opts.shot);
  const sceneT = timeline?.duration || opts.minDuration || 6;
  let shaking = false, shots = null;
  if (!cam || choice) {
    const timelineTracks = timeline && actorSlots.size ? opts.timelineTracks : null;
    // (where someone is: an actor at that moment, else where it was drawn)
    const drawnAt = new Map();
    for (const it of items) if (it.at) drawnAt.set(it.aid, { x: it.at.x0 + 50 * it.at.s, y: it.at.y0 + ((it.c.baseline ?? 96) * 0.35) * it.at.s, h: it.h });
    const where = (id, t) => (timelineTracks ? focusAt(timelineTracks)(id, t) : null) ?? drawnAt.get(id) ?? null;
    // (the main figure: the first person; one at a desk is drawn with the desk)
    const main = items.find((it) => isPerson(it))?.aid ?? items.find((it) => it.desk)?.aid ?? (timeline?.actors?.[0]?.id ?? null)
      ?? items.find((it) => /^(animals|wildlife)/.test(it.c.category ?? ''))?.aid ?? null;
    const said = timeline
      ? (opts.timelineSpeechTimes ?? [])
      : talkers.filter((tk) => tk.who).map((tk) => ({ who: tk.who, start: 0.5, end: 0.5 + lipKeys(tk.text).duration, text: tk.text }));
    const ctx = opts.shotContext ?? {};
    const here = placeLabel(env).split(' · ')[0];
    shots = directShots({
      T: sceneT, W, H, where, main, speeches: said, mood, text: `${opts.caption ?? ''} ${opts.text ?? ''}`, shot: choice,
      // (a board with words: its top stays in the frame)
      ...(env.boardText ? { keepTop: H * 0.13 } : {}),
      crowd: items.filter((it) => /^(people|animals|wildlife|alphabet)/.test(it.c.category ?? '')).reduce((n, it) => n + (it.m.count ?? 1), 0),
      others: [...new Set(items.filter((it) => /^(people|animals|wildlife|fantasy|sea|alphabet|puppet)/.test(it.c.category ?? '') && it.aid).map((it) => it.aid))],
      context: { index: ctx.index ?? 0, first: Boolean(ctx.first), last: Boolean(ctx.last), newPlace: ctx.prevPlace == null ? Boolean(ctx.first) : ctx.prevPlace !== here },
    });
    if (shots?.follow && timeline && actorSlots.size && timelineTracks) {
      const followed = timelineTracks.get(`${shots.follow}#0`);
      cam = { T: sceneT, keys: cameraKeys({ events: [], follow: { id: shots.follow, start: followed?.[0]?.t0 ?? 0 }, T: sceneT, W, H, focusAt: focusAt(timelineTracks) }) };
    } else if (shots?.keys) cam = { T: sceneT, keys: shots.keys };
    else if (shots?.follow) {
      const again = directShots({ T: sceneT, W, H, where, main, shot: { kind: 'close', target: shots.follow } });
      cam = again?.keys ? { T: sceneT, keys: again.keys } : cam;
    }
    if (choice?.kind === 'steady') cam = null;
    shaking = Boolean(shots?.shake);
  }
  opts.card.camera = { shot: choice ? `${choice.kind}${choice.target ? `:${choice.target}` : ''}` : 'auto', says: shots?.says ?? (cam ? 'as the words say' : mood ? 'a slow drift (mood)' : 'still') };
  // (a slow camera of its own, when the scene has no camera move: over the scene's length)
  const moodCam = mood && !cam && choice?.kind !== 'steady' ? moodCamera(mood, uid, W, H, opts.minDuration || timeline?.duration || 6) : null;
  if (moodCam) motionCss.push(moodCam.css);
  if (mood && MOOD_STINGS[mood]) cues.push({ t: 0.1, s: MOOD_STINGS[mood] });

  // The style's touches (src/core/styles.js): a filter over the landscape too (watercolor,
  // crayon) or over the whole picture (pixel), decoration behind everyone, an overlay on top
  const st = getStyle(style);
  const filterRef = st.filter ? `url(#${uid}-${st.filter})` : null;
  const fx = styleWrap(style, uid, out.join(''), { scale: W / 260, freq: 0.02, blur: W / 450, pixel: Math.round(W / 12) / 10, w: W, h: H, noFilter: st.wholeFilter });
  let bgSvg = shapesToSvg(background(W, H, hY, env, pal, rng, hasGround, style), style);
  if (st.bgFilter && filterRef) bgSvg = `<rect width="${W}" height="${H}" fill="${st.background || '#ffffff'}"/><g filter="${filterRef}">${bgSvg}</g>`;
  const decor = st.decor && !(st.outdoorDecor && env.room) ? st.decor(uid, W, H, hY) : '';
  let content = `<g stroke-linecap="round" stroke-linejoin="round">${bgSvg}</g>${decor}${fx.g}${speechBubbles(talkers, W, H, uid, motionCss, env.room && (env.roomKind === 'classroom' || env.boardText) ? [{ x: W * 0.22, y: H * 0.03, w: W * 0.56, h: H * 0.39 }] : [])}`;
  if (cam) {
    motionCss.push(`@keyframes ${uid}cam { ${cameraCss(cam.keys, cam.T, W, H)}}`);
    content = `<g class="pg-camera" style="animation: ${uid}cam ${r2(cam.T)}s linear infinite;">${content}</g>`;
  }
  if (moodCam) content = `<g class="pg-mood-camera" style="${moodCam.style}">${content}</g>`;
  if (shaking) {
    motionCss.push(shakeCss(`${uid}shake`, sceneT));
    content = `<g class="pg-shake" style="animation: ${uid}shake ${r2(sceneT)}s linear infinite;">${content}</g>`;
  }
  if (st.wholeFilter && filterRef) content = `<g filter="${filterRef}">${content}</g>`;
  // The mood's light: over everything, still while the camera moves
  const light = mood && moodLight(mood, uid, W, H, { light: LIGHT_CANVAS_STYLES.has(style) });
  if (light?.filter) content = `<g filter="url(#${light.filter})">${content}</g>`;
  if (light) {
    content += `<g class="pg-mood pg-mood-${mood}" data-scene-mood="${mood}" pointer-events="none">${light.overlay}</g>`;
    if (light.css) motionCss.push(light.css);
  }
  if (st.overlay) content += `<g class="pg-style-overlay" pointer-events="none">${st.overlay(uid, W, H)}</g>`;
  // The sound goes with the picture, for the studio, the clip player and video export to play
  // ... with the sounds of its things and its place, under it all
  cues.push(...thingCues(items.flatMap((it) => [it.c.id, ...(it.holding ? [it.holding.c.id] : [])]), { classroom: env.roomKind === 'classroom', cheering: items.filter((it) => it.m.animation === 'cheer').reduce((n, it) => n + (it.m.count ?? 1), 0) }));
  const amb = ambienceOf(env);
  if (cues.length || amb || mood) {
    opts.sound = soundTrack(cues, soundLoop, { amb, clean: CLEAN_SOUND_STYLES.has(style), mood });
    content += `<metadata class="pg-sound">${esc(JSON.stringify(opts.sound))}</metadata>`;
  }
  const motionDefs = motionCss.length ? `<style><![CDATA[${motionCss.join('\n')}]]></style>` : '';
  return svgDoc({ width: W, height: H, viewBox: `0 0 ${W} ${H}`, defs: fx.defs + (light?.defs ?? '') + motionDefs, content });
}
