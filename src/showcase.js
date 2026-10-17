// PictoGen Showcase Video Engine: 7-scene comprehensive feature tour with natural voice narration.
import { generate, composeStory } from './index.js';

export const SHOWCASE_SCENES = [
  {
    num: 1,
    title: 'Welcome to PictoGen',
    tag: 'OFFLINE VECTOR ENGINE',
    mode: 'scene',
    style: 'cartoon',
    prompt: 'a happy boy walking across the slide with a blue bike under the sun and tree',
    narration: 'Welcome to PictoGen, a zero-dependency vector engine that creates illustrations and animated clips completely offline.',
    duration: 5.5,
  },
  {
    num: 2,
    title: 'Technical Callouts & Blueprint Schematics',
    tag: 'PRECISION ENGINEERING',
    mode: 'callout',
    style: 'blueprint',
    prompt: 'a blue bicycle with gears and handlebars',
    narration: 'Create precision technical schematics and anatomy diagrams with leader lines, part badges, and exact dimension brackets.',
    duration: 5.5,
  },
  {
    num: 3,
    title: 'Meticulous Studio Knolling',
    tag: 'FLAT-LAY DESIGN',
    mode: 'knolling',
    style: 'flat',
    prompt: 'apple, bike, tree, sun, coffee, book',
    narration: 'Organize your items into immaculate studio knolling flat-lays, aligned orthogonally on metric workshop cutting mats.',
    duration: 5.5,
  },
  {
    num: 4,
    title: 'Before vs After Comparison',
    tag: 'VERSUS SPLIT-SCREEN',
    mode: 'split',
    style: 'cartoon',
    prompt: 'sad boy and laughing boy',
    narration: 'Highlight transformations and contrasts with dynamic split-screens, comparing before and after states side by side.',
    duration: 5.5,
  },
  {
    num: 5,
    title: '2.5D Isometric Dioramas',
    tag: 'MINIATURE DEPTH',
    mode: 'isometric',
    style: 'flat',
    prompt: 'tree, house and car on a sunny day',
    narration: 'Bring objects into three dimensions with floating isometric dioramas, featuring grounded contact shadows and miniature depth.',
    duration: 5.5,
  },
  {
    num: 6,
    title: 'Pictorial Waffle Infographics',
    tag: 'ISOTYPE DATA GRAPHICS',
    mode: 'waffle',
    style: 'flat',
    prompt: '80% clean bicycles in city transit',
    narration: 'Transform statistical numbers into intuitive pictorial waffle charts, making data visual, human, and engaging.',
    duration: 5.5,
  },
  {
    num: 7,
    title: 'Animated Broadcast Clips & Coloring Pages',
    tag: 'UNLIMITED CREATIVITY',
    mode: 'story',
    style: 'flat',
    prompt: 'renewable-boom',
    narration: 'From animated documentaries and news bulletins with lower thirds, to interactive coloring books, PictoGen creates it all offline. 100% open source and commercial friendly.',
    duration: 7.2,
  },
];

let cachedShowcase = null;

export function getShowcaseData() {
  if (cachedShowcase) return cachedShowcase;
  const scenes = SHOWCASE_SCENES.map((sc) => {
    let svg = '';
    if (sc.mode === 'story') {
      const story = composeStory(sc.prompt, { style: sc.style, seed: 42, width: 640, height: 360 });
      svg = story.scenes && story.scenes.length ? story.scenes[0].svg : '';
    } else {
      const res = generate(sc.prompt, { mode: sc.mode, style: sc.style, seed: 42, width: 640, height: 360 });
      svg = res.svg;
    }
    return {
      num: sc.num,
      title: sc.title,
      tag: sc.tag,
      mode: sc.mode,
      style: sc.style,
      prompt: sc.prompt,
      narration: sc.narration,
      duration: sc.duration,
      audioUrl: `/audio/showcase-${sc.num}.wav`,
      svg,
    };
  });
  cachedShowcase = {
    title: 'PictoGen Vector Engine — Feature Showcase Video',
    scenes,
  };
  return cachedShowcase;
}
