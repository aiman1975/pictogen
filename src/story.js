// PictoGen Story & Clip Engine: Multi-scene animated clips for Kids Stories,
// Science Documentaries, News & Editorial Briefs, and How-To Explainer Guides.
import { readFileSync } from 'node:fs';
import { generate } from './index.js';
import { FONT, esc } from './core/render.js';
import { pgSound, pgSoundTrack, pgVoiced, pgBank, pgMusicBars, pgMusicTrack } from './sound-synth.js';
import { soundOf } from './sound.js';
import { packForClip } from './sound-pack.js';

const FONT_DIR = new URL('../public/fonts/', import.meta.url);
let fontCss = null;
/** The studio's self-hosted @font-face rules with the font files inlined, so exported clips need no network. */
function embeddedFontCss() {
  fontCss ??= readFileSync(new URL('fonts.css', FONT_DIR), 'utf8').replace(
    /url\(([\w.-]+\.woff2)\)/g,
    (_, file) => `url(data:font/woff2;base64,${readFileSync(new URL(file, FONT_DIR)).toString('base64')})`,
  );
  return fontCss;
}

export const ASPECT_RATIOS = {
  '16:9': { width: 640, height: 360, label: '16:9 Widescreen', ratioCss: '16 / 9' },
  '9:16': { width: 360, height: 640, label: '9:16 Mobile Reel', ratioCss: '9 / 16' },
  '1:1': { width: 480, height: 480, label: '1:1 Square Card', ratioCss: '1 / 1' },
};

export const STORY_TEMPLATES = [
  // --- 1. KIDS STORIES ---
  {
    id: 'puppy-friend',
    genre: 'kids',
    title: 'The Boy & The Little Puppy',
    description: 'A heartwarming story about kindness, sharing, and finding a best friend.',
    scenes: [
      {
        prompt: 'a happy boy walking across the slide under the warm sun',
        caption: 'One sunny morning, Leo set off for a cheerful stroll through the green hills.',
        duration: 4.5,
      },
      {
        prompt: 'a sad puppy dog sitting alone under a big green tree',
        caption: 'Under an old oak tree, he found a little puppy looking lonely and hungry.',
        duration: 4.5,
      },
      {
        prompt: 'a smiling boy waving and sharing a red apple with the dog',
        caption: 'Leo knelt down with a warm smile and gently offered his crisp red apple.',
        duration: 4.5,
      },
      {
        prompt: 'a laughing boy and a happy dog playing under the rainbow',
        caption: 'With full bellies and happy hearts, they bounded joyfully under a magic rainbow!',
        duration: 5.0,
      },
    ],
  },
  {
    id: 'forest-bike',
    genre: 'kids',
    title: 'The Great Park Adventure',
    description: 'An exciting ride through nature with friendly woodland animals.',
    scenes: [
      {
        prompt: 'a boy riding a blue bike under the bright sun and clouds',
        caption: 'Max loved pedaling fast on his shiny blue bicycle down the winding path.',
        duration: 4.5,
      },
      {
        prompt: 'a curious deer and two birds sitting peacefully near the trees',
        caption: 'Deep in the quiet woods, gentle forest creatures watched with curious eyes.',
        duration: 4.5,
      },
      {
        prompt: 'a laughing boy waving cheerfully near the friendly deer',
        caption: 'Max slowed to a stop and gave a big friendly wave to his new forest buddies.',
        duration: 4.5,
      },
      {
        prompt: 'a happy boy and the deer watching the beautiful sunset',
        caption: 'Together in peace, they watched the warm golden sunset paint the sky.',
        duration: 5.0,
      },
    ],
  },
  {
    id: 'magic-garden',
    genre: 'kids',
    title: 'The Secret Flower Garden',
    description: 'A magical discovery of blooming flowers, friendly bunnies, and wonder.',
    scenes: [
      {
        prompt: 'a happy girl walking near a house and garden under the sun',
        caption: 'Lily loved exploring the mysterious paths behind her grandma’s cottage.',
        duration: 4.5,
      },
      {
        prompt: 'a surprised girl looking at a cute rabbit near the colorful flowers',
        caption: 'Suddenly, a fluffy little rabbit popped up among the glowing blossoms!',
        duration: 4.5,
      },
      {
        prompt: 'a talking girl kneeling down with an apple near the rabbit',
        caption: 'Lily whispered gentle words of friendship and shared a fresh sweet snack.',
        duration: 4.5,
      },
      {
        prompt: 'a laughing girl waving happily with the rabbit under the rainbow',
        caption: 'The whole garden came alive with warmth, giggles, and rainbow colors!',
        duration: 5.0,
      },
    ],
  },

  // --- 2. SCIENCE & DOCUMENTARY ---
  {
    id: 'water-cycle',
    genre: 'documentary',
    title: "Earth's Dynamic Water Cycle",
    description: 'How solar thermal energy evaporates ocean water, creates clouds, and feeds global rivers.',
    scenes: [
      {
        prompt: 'the bright sun shining over the blue ocean water',
        tag: 'EVAPORATION',
        headline: 'Solar Radiation Drives Evaporation',
        caption: 'Intense solar radiation heats ocean surface waters, converting liquid into invisible vapor that ascends into the atmosphere.',
        duration: 5.0,
      },
      {
        prompt: 'white clouds floating high over the tall mountains',
        tag: 'CONDENSATION',
        headline: 'Vapor Cools into Dense Clouds',
        caption: 'As warm, moisture-rich air rises and cools at high altitudes, microscopic water droplets condense around atmospheric particles.',
        duration: 5.0,
      },
      {
        prompt: 'heavy storm rain pouring over forest trees and river',
        tag: 'PRECIPITATION',
        headline: 'Gravity Pulls Moisture to Earth',
        caption: 'When condensed droplets become too dense to remain suspended aloft, gravity draws them downward as nourishing rainfall.',
        duration: 5.0,
      },
      {
        prompt: 'a fresh river flowing through green hills under the sun',
        tag: 'COLLECTION',
        headline: 'Surface Runoff Streams Back to Sea',
        caption: 'Freshwater streams gather into mountain tributaries, recharging ground aquifers before completing the planetary cycle.',
        duration: 5.0,
      },
    ],
  },
  {
    id: 'solar-journey',
    genre: 'documentary',
    title: 'Solar Power: From Sun to City',
    description: 'The journey of photons from our star to distributed electrical grids.',
    scenes: [
      {
        prompt: 'the bright sun shining in a clear blue sky',
        tag: 'PHOTONS',
        headline: '173,000 Terawatts from the Sun',
        caption: 'Our star radiates more energy toward the earth in a single hour than all human civilization consumes across an entire year.',
        duration: 5.0,
      },
      {
        prompt: 'a modern house with solar panels under the sun',
        tag: 'PHOTOVOLTAIC',
        headline: 'Silicon Cells Excite Electrons',
        caption: 'Semiconductor layers absorb incoming light photons, creating a continuous flow of direct current electricity.',
        duration: 5.0,
      },
      {
        prompt: 'an electric car charging near clean energy building',
        tag: 'SMART GRID',
        headline: 'Zero-Emission Power Distribution',
        caption: 'Modern solid-state inverters convert current to feed local grids, charging battery banks and electric transit fleets.',
        duration: 5.0,
      },
      {
        prompt: 'a green city with trees and rainbow under the sun',
        tag: 'SUSTAINABILITY',
        headline: 'Decentralized Clean Energy Resiliency',
        caption: 'Rooftop arrays and wind corridors deliver quiet, decentralized energy, decoupling modern progress from fossil emissions.',
        duration: 5.0,
      },
    ],
  },
  {
    id: 'moon-mission',
    genre: 'documentary',
    title: 'Mission to the Lunar Surface',
    description: 'The trajectory of modern lunar exploration from orbital insertion to surface landing.',
    scenes: [
      {
        prompt: 'a rocket launching into the blue sky with clouds',
        tag: 'LIFTOFF',
        headline: 'Trans-Lunar Injection Ascent',
        caption: 'Multi-stage rocket thrusters produce over 8 million pounds of thrust to break gravitational bounds and attain orbital escape speed.',
        duration: 5.0,
      },
      {
        prompt: 'a satellite orbiting in dark space with stars',
        tag: 'COAST PHASE',
        headline: 'Three Days in Deep Space Transit',
        caption: 'The crewed module coasts across the cislunar vacuum, calibrating navigational star trackers beneath the stellar void.',
        duration: 5.0,
      },
      {
        prompt: 'the moon in dark night sky with stars',
        tag: 'ORBITAL CAPTURE',
        headline: 'Entering Stable Polar Lunar Orbit',
        caption: 'Service propulsion engines decelerate the spacecraft into elliptical lunar orbit, scanning candidate south-pole touchdown sites.',
        duration: 5.0,
      },
      {
        prompt: 'a person walking on the moon with stars and earth',
        tag: 'EXPLORATION',
        headline: 'Boots on Ancient Regolith',
        caption: 'Explorers step onto the basalt plains, deploying seismic sensor arrays and extracting deep core ice samples for science.',
        duration: 5.0,
      },
    ],
  },

  // --- 3. NEWS & EDITORIAL BRIEFS ---
  {
    id: 'renewable-boom',
    genre: 'news',
    title: 'Global Clean Tech Spending Hits Record',
    description: 'International investments in renewable energy infrastructure outpace legacy power generation.',
    scenes: [
      {
        prompt: 'a sunny sky over modern buildings and sun',
        tag: 'MARKET BRIEF',
        headline: 'Global Clean Energy Investment Reaches $1.8T',
        caption: 'Capital expenditure in solar, wind, and battery manufacturing surged by 17% this year, setting a new historical milestone.',
        duration: 4.8,
      },
      {
        prompt: 'wind turbine and solar panels in green hills',
        tag: 'CAPACITY EXPANSION',
        headline: 'Grid Share of Renewables Surpasses 40%',
        caption: 'Combined wind and photovoltaic generation supplied over forty percent of regional electrical demand during peak summer quarters.',
        duration: 4.8,
      },
      {
        prompt: 'electric car and bike on city street',
        tag: 'TRANSIT SHIFT',
        headline: 'Commercial EV Deliveries Rise 60% Annually',
        caption: 'Major logistics and municipal transit agencies accelerated fleet electrification, citing plummeting battery cell pack costs.',
        duration: 4.8,
      },
      {
        prompt: 'green tree and modern buildings under rainbow',
        tag: 'OUTLOOK',
        headline: 'Urban Emissions Projected to Drop Sharply',
        caption: 'Environmental analysts forecast urban air quality indices to improve markedly as clean grids retire legacy fossil peaking plants.',
        duration: 4.8,
      },
    ],
  },
  {
    id: 'weather-alert',
    genre: 'news',
    title: 'Summer Weather Front & Regional Outlook',
    description: 'A passing cold front brings heavy rainfall before giving way to mild weekend sunshine.',
    scenes: [
      {
        prompt: 'a fiery sun in hot sky over dry ground',
        tag: 'HEAT ADVISORY',
        headline: 'High Pressure Ridge Locks in Hot Temperatures',
        caption: 'Regional weather services issued high-temperature advisories as stagnant air trapped heat across central agricultural valleys.',
        duration: 4.8,
      },
      {
        prompt: 'dark storm clouds and heavy rain over trees',
        tag: 'PRECIPITATION WATCH',
        headline: 'Approaching Front Triggers Rainfall and Wind',
        caption: 'A vigorous northern cold front is colliding with the humid air mass, bringing localized gusts and needed rainfall totals.',
        duration: 4.8,
      },
      {
        prompt: 'gentle rain showers over city and buildings',
        tag: 'METRO UPDATE',
        headline: 'Precipitation Expected to Taper by Evening',
        caption: 'City road crews reported smooth traffic flows as storm intensity softened into steady, refreshing evening rain showers.',
        duration: 4.8,
      },
      {
        prompt: 'a bright rainbow under sunny sky and clouds',
        tag: '7-DAY FORECAST',
        headline: 'Clear Skies and Seasonable Weekend Ahead',
        caption: 'High pressure rebuilds by Friday morning, promising crisp 22°C temperatures and clear blue skies for outdoor activities.',
        duration: 4.8,
      },
    ],
  },

  // --- 4. USEFUL INFO & HOW-TO GUIDES ---
  {
    id: 'workplace-ergonomics',
    genre: 'howto',
    title: 'Workplace Ergonomics: 4 Daily Habits',
    description: 'Simple posture and wellness adjustments to stay energized and prevent fatigue at your desk.',
    scenes: [
      {
        prompt: 'a person sitting at a desk with computer and chair',
        tag: 'STEP 1',
        headline: 'Align Posture & Monitor Eye Line',
        caption: 'Keep your feet flat on the floor, elbows at 90 degrees, and position the top third of your display at natural eye level.',
        duration: 5.0,
      },
      {
        prompt: 'a person looking out a window at a green tree and sun',
        tag: 'STEP 2',
        headline: 'Practice the 20-20-20 Eye Rest Rule',
        caption: 'Every 20 minutes, look at an object at least 20 feet away for 20 seconds to relax your ocular focusing muscles.',
        duration: 5.0,
      },
      {
        prompt: 'a glass of water and fresh red apple on table',
        tag: 'STEP 3',
        headline: 'Maintain Steady Hydration Throughout the Day',
        caption: 'Keep fresh drinking water within easy reach. Drinking regularly sustains mental alertness and prevents afternoon headaches.',
        duration: 5.0,
      },
      {
        prompt: 'a happy person walking in the green park under sun',
        tag: 'STEP 4',
        headline: 'Take a 5-Minute Hourly Movement Break',
        caption: 'Stand up and take a brisk stroll every hour to boost blood circulation, relieve spinal compression, and refresh your mind.',
        duration: 5.0,
      },
    ],
  },
  {
    id: 'plant-care',
    genre: 'howto',
    title: 'Houseplant Care: The Green Routine',
    description: 'Keep indoor plants flourishing with optimal light, soil moisture checks, and pruning.',
    scenes: [
      {
        prompt: 'a potted green plant near a window with gentle sun',
        tag: 'STEP 1',
        headline: 'Provide Bright, Indirect Sunlight',
        caption: 'Position tropical houseplants near east or south-facing windows where they receive bright, filtered ambient light without burning.',
        duration: 5.0,
      },
      {
        prompt: 'a green plant and water droplet on soil',
        tag: 'STEP 2',
        headline: 'Check Soil Dryness Before Watering',
        caption: 'Insert a finger 2 inches into the potting soil. Water only when the top layer feels completely dry to prevent root rot.',
        duration: 5.0,
      },
      {
        prompt: 'a watering can watering green potted plants',
        tag: 'STEP 3',
        headline: 'Water Evenly with Bottom Drainage',
        caption: 'Pour water until liquid seeps freely from the drainage holes, then discard standing water from the saucer after ten minutes.',
        duration: 5.0,
      },
      {
        prompt: 'a healthy blooming flower plant under the sun',
        tag: 'STEP 4',
        headline: 'Rotate Weekly and Snip Spent Leaves',
        caption: 'Turn the pot a quarter-turn weekly for symmetrical growth, and trim dry leaves to direct vital energy to fresh blooms.',
        duration: 5.0,
      },
    ],
  },
];

/**
 * Splits user text into individual scene beats.
 * Handles:
 *   prompt | caption
 *   prompt | tag | headline | caption
 */
export function parseStoryText(text) {
  if (!text || !text.trim()) {
    return STORY_TEMPLATES[0].scenes;
  }

  const tpl = STORY_TEMPLATES.find((t) => t.id === text.trim().toLowerCase());
  if (tpl) return tpl.scenes;

  const rawLines = text
    .split(/\n+|\s*\/\/\s*|(?=Scene\s+\d+:?)|(?=\b\d+[\.\)]\s+)/i)
    .map((l) => l.trim())
    .filter((l) => l.length > 2);

  if (rawLines.length === 0) return STORY_TEMPLATES[0].scenes;

  return rawLines.map((line, idx) => {
    const clean = line.replace(/^(?:Scene\s*\d*[:\.\-]?\s*|\d+[\.\)]\s*)/i, '').trim();
    const parts = clean.split(/\s*\|\s*|\s*---\s*/);
    let prompt = parts[0].trim();
    let tag = '';
    let headline = '';
    let caption = '';

    if (parts.length === 4) {
      tag = parts[1].trim();
      headline = parts[2].trim();
      caption = parts[3].trim();
    } else if (parts.length === 3) {
      headline = parts[1].trim();
      caption = parts[2].trim();
    } else if (parts.length === 2) {
      caption = parts[1].trim();
    } else {
      caption = prompt.charAt(0).toUpperCase() + prompt.slice(1) + '.';
    }

    return {
      prompt,
      tag: tag || `STEP ${idx + 1}`,
      headline,
      caption,
      duration: 5.0,
    };
  });
}

/**
 * Composes a full multi-scene animated clip with custom genre, aspect ratio, style, and seed.
 * storyInput: story text (one scene per line, "prompt | caption"), a template id, or the scenes
 * themselves: [{ prompt, caption?, tag?, headline?, duration?, beats? }] (beats: edited steps).
 */
export function composeStory(storyInput, opts = {}) {
  const { style = 'flat', seed = 1, vary = false, genre = 'kids', aspect = '16:9' } = opts;
  const dims = ASPECT_RATIOS[aspect] || ASPECT_RATIOS['16:9'];
  const scenesRaw = Array.isArray(storyInput) ? storyInput : parseStoryText(storyInput);

  let title = opts.title;
  let detectedGenre = genre;

  if (typeof storyInput === 'string') {
    const tpl = STORY_TEMPLATES.find((t) => t.id === storyInput.trim().toLowerCase());
    if (tpl) {
      title = tpl.title;
      detectedGenre = tpl.genre || genre;
    }
  }

  if (!title) {
    if (detectedGenre === 'news') title = 'News & Editorial Brief';
    else if (detectedGenre === 'documentary') title = 'Science & Nature Documentary';
    else if (detectedGenre === 'howto') title = 'Actionable Explainer Guide';
    else title = 'Kids Animated Story Clip';
  }

  const scenes = scenesRaw.map((sc, i) => {
    // Use the same base seed across scenes so recurring characters maintain 100% visual consistency across frames
    const result = generate(sc.prompt, {
      mode: 'scene',
      style,
      width: dims.width,
      height: dims.height,
      seed,
      vary,
      // Steps edited in the studio's timeline view travel with a saved scene
      ...(Array.isArray(sc.beats) ? { beats: sc.beats } : {}),
      // Named individuals ("pgc1" -> one particular boy), the same in every scene
      ...(opts.individuals ? { individuals: opts.individuals } : {}),
      // A caption of its own (not the prompt repeated) is what a talking figure says, lip-synced
      ...(sc.caption && sc.caption.toLowerCase().replace(/[.!?\s]+$/, '') !== sc.prompt.toLowerCase().replace(/[.!?\s]+$/, '') ? { caption: sc.caption } : {}),
    });

    return {
      index: i,
      prompt: sc.prompt,
      tag: sc.tag || (detectedGenre === 'howto' ? `STEP ${i + 1}` : detectedGenre === 'news' ? 'UPDATE' : detectedGenre === 'documentary' ? `CHAPTER ${i + 1}` : undefined),
      headline: sc.headline || '',
      caption: sc.caption || `${sc.prompt.charAt(0).toUpperCase()}${sc.prompt.slice(1)}${/[.!?]$/.test(sc.prompt) ? '' : '.'}`,
      // A scene told as a sequence ("walks in, then waves...") lasts at least as long as its timeline
      duration: Math.max(sc.duration || 5.0, result.duration || 0),
      svg: result.svg,
      matches: result.matches,
    };
  });

  const totalDuration = scenes.reduce((sum, sc) => sum + sc.duration, 0);
  return {
    title,
    genre: detectedGenre,
    aspect,
    width: dims.width,
    height: dims.height,
    style,
    seed,
    totalDuration,
    scenes,
  };
}

/**
 * Generates a standalone, zero-dependency offline HTML player for this story clip.
 * Renders Lower-Third editorial graphics according to the chosen genre and aspect ratio.
 */
export function generateStoryHtml(story, opts = {}) {
  // \u003c keeps user captions like "</script>" from closing the inline <script> block. The markers
  // around it let the studio add photo faces to the scenes on the user's own machine before saving.
  const scenesJson = JSON.stringify(story.scenes).replace(/</g, '\\u003c');
  const title = esc(story.title || 'PictoGen Animated Clip');
  const genre = story.genre || 'kids';
  // The sound pack's files this clip uses (public/audio/pack), carried inside the file
  const pack = opts.pack ?? packForClip((story.scenes || []).map((sc) => soundOf(sc.svg)), { genre });
  const packJson = JSON.stringify(pack).replace(/</g, '\\u003c');
  const aspect = story.aspect || '16:9';
  const dims = ASPECT_RATIOS[aspect] || ASPECT_RATIOS['16:9'];

  const maxW = aspect === '9:16' ? '420px' : aspect === '1:1' ? '600px' : '880px';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — PictoGen Vector Clip</title>
  <style>
${embeddedFontCss()}
    :root {
      --bg: #0b0f19;
      --surface: #1e293b;
      --text: #f8fafc;
      --primary: #3b82f6;
      --accent: #f59e0b;
      --news-red: #ef4444;
      --radius: 16px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Nunito', -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      user-select: none;
    }

    .player-container {
      width: 100%;
      max-width: ${maxW};
      background: var(--surface);
      border-radius: var(--radius);
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.65);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border: 1px solid rgba(255,255,255,0.08);
    }

    .player-header {
      padding: 0.85rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(15, 23, 42, 0.75);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .story-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .badge-genre {
      font-size: 0.7rem;
      font-weight: 900;
      padding: 2px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: ${genre === 'news' ? '#ef4444' : genre === 'documentary' ? '#0284c7' : genre === 'howto' ? '#10b981' : '#f59e0b'};
      color: #fff;
    }

    .stage {
      position: relative;
      width: 100%;
      aspect-ratio: ${dims.ratioCss};
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .stage svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    /* Lower-Third Overlay / Caption Box */
    .caption-box {
      min-height: 85px;
      padding: 1rem 1.4rem;
      background: rgba(15, 23, 42, 0.96);
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    /* Documentary Styling */
    .doc-header-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.35rem;
    }
    .doc-tag {
      font-size: 0.72rem;
      font-weight: 900;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }
    .doc-headline {
      font-size: 1.05rem;
      font-weight: 800;
      color: #f1f5f9;
    }
    .doc-caption {
      font-size: 0.95rem;
      color: #cbd5e1;
      line-height: 1.45;
    }

    /* News Lower-Third Styling */
    .news-header-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }
    .news-badge {
      background: #dc2626;
      color: #fff;
      font-size: 0.72rem;
      font-weight: 900;
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }
    .news-tag {
      font-size: 0.75rem;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
    }
    .news-headline {
      font-size: 1.15rem;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.01em;
      margin-bottom: 0.2rem;
    }
    .news-ticker {
      font-size: 0.92rem;
      color: #e2e8f0;
      border-left: 2px solid #ef4444;
      padding-left: 8px;
    }

    /* How-To Styling */
    .howto-header-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }
    .howto-step-badge {
      background: #10b981;
      color: #064e3b;
      font-size: 0.72rem;
      font-weight: 900;
      padding: 2px 8px;
      border-radius: 999px;
    }
    .howto-headline {
      font-size: 1.08rem;
      font-weight: 800;
      color: #ffffff;
    }
    .howto-caption {
      font-size: 0.95rem;
      color: #cbd5e1;
      line-height: 1.4;
    }

    /* Kids Story Styling */
    .kids-caption {
      font-size: 1.25rem;
      font-weight: 800;
      color: #f8fafc;
      text-align: center;
      line-height: 1.4;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }

    .controls-bar {
      padding: 0.75rem 1.25rem;
      background: rgba(15, 23, 42, 0.75);
      display: flex;
      align-items: center;
      gap: 1rem;
      border-top: 1px solid rgba(255,255,255,0.06);
    }

    .btn-ctrl {
      background: rgba(255,255,255,0.1);
      border: none;
      color: #fff;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      transition: all 0.15s;
    }
    .btn-ctrl:hover {
      background: var(--primary);
      transform: scale(1.05);
    }

    .progress-track {
      flex: 1;
      height: 8px;
      background: rgba(255,255,255,0.15);
      border-radius: 999px;
      position: relative;
      cursor: pointer;
      overflow: hidden;
    }
    .progress-fill {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #3b82f6, #60a5fa);
      border-radius: 999px;
      transition: width 0.08s linear;
    }

    .dots-container {
      display: flex;
      gap: 6px;
    }
    .scene-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: rgba(255,255,255,0.25);
      cursor: pointer;
      transition: all 0.2s;
    }
    .scene-dot.active {
      background: #f59e0b;
      transform: scale(1.3);
    }

    .btn-sound {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.2rem;
      padding: 4px;
    }
    .btn-sound.on { color: #f59e0b; }
  </style>
</head>
<body>
  <div class="player-container">
    <div class="player-header">
      <div class="story-title">
        <span>${genre === 'news' ? '📰' : genre === 'documentary' ? '🔬' : genre === 'howto' ? '💡' : '🎬'}</span>
        <span>${title}</span>
        <span class="badge-genre">${genre.toUpperCase()}</span>
      </div>
      <div>
        <button class="btn-sound on" id="btn-sound" title="Sound on or off (chimes, voices and effects)">🔔</button>
        <button class="btn-sound on" id="btn-music" title="Background music on or off">🎵</button>
      </div>
    </div>

    <div class="stage" id="stage"></div>

    <div class="caption-box">
      ${
        genre === 'news'
          ? `
        <div>
          <div class="news-header-row">
            <span class="news-badge">🔴 BREAKING NEWS</span>
            <span class="news-tag" id="scene-tag">MARKET UPDATE</span>
          </div>
          <div class="news-headline" id="scene-headline">Headline</div>
          <div class="news-ticker" id="scene-caption">News ticker text...</div>
        </div>
      `
          : genre === 'documentary'
          ? `
        <div>
          <div class="doc-header-row">
            <span class="doc-tag" id="scene-tag">SCIENCE</span>
            <span class="doc-headline" id="scene-headline">Chapter Headline</span>
          </div>
          <div class="doc-caption" id="scene-caption">Documentary text...</div>
        </div>
      `
          : genre === 'howto'
          ? `
        <div>
          <div class="howto-header-row">
            <span class="howto-step-badge" id="scene-tag">STEP 1</span>
            <span class="howto-headline" id="scene-headline">Instruction Title</span>
          </div>
          <div class="howto-caption" id="scene-caption">Step details...</div>
        </div>
      `
          : `
        <div class="kids-caption" id="scene-caption">Story caption...</div>
      `
      }
    </div>

    <div class="controls-bar">
      <button class="btn-ctrl" id="btn-prev" title="Previous Scene">⏮</button>
      <button class="btn-ctrl" id="btn-play" title="Play / Pause">▶</button>
      <button class="btn-ctrl" id="btn-next" title="Next Scene">⏭</button>

      <div class="progress-track" id="progress-track">
        <div class="progress-fill" id="progress-fill"></div>
      </div>

      <div class="dots-container" id="dots-container"></div>
    </div>
  </div>

  <script>
    const scenes = /*pg-scenes*/${scenesJson}/*pg-scenes-end*/;
    let curIndex = 0;
    let isPlaying = true;
    let soundEnabled = true;
    let sceneTimer = null;
    let progressInterval = null;
    let sceneStartTime = Date.now();
    let currentDuration = 5000;

    const stage = document.getElementById('stage');
    const tagEl = document.getElementById('scene-tag');
    const headlineEl = document.getElementById('scene-headline');
    const captionEl = document.getElementById('scene-caption');
    const btnPlay = document.getElementById('btn-play');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnSound = document.getElementById('btn-sound');
    const progressFill = document.getElementById('progress-fill');
    const progressTrack = document.getElementById('progress-track');
    const dotsContainer = document.getElementById('dots-container');

    // Offline Web Audio chime customized per genre
    let audioCtx = null;
    function playChime() {
      if (!soundEnabled) return;
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const genre = '${genre}';
        const now = audioCtx.currentTime;

        if (genre === 'news') {
          // Sharp double electronic blip
          [880, 880].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            gain.gain.setValueAtTime(0.08, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.08);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.08);
          });
        } else if (genre === 'documentary') {
          // Deep atmospheric resonant chime
          [220, 329.63, 440].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.09);
            gain.gain.setValueAtTime(0.08, now + i * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.7);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + i * 0.09);
            osc.stop(now + i * 0.09 + 0.7);
          });
        } else if (genre === 'howto') {
          // Affirmative upbeat ping
          [587.33, 880].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.07, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.4);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.4);
          });
        } else {
          // Playful kids chime
          [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.07);
            gain.gain.setValueAtTime(0.06, now + i * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.07 + 0.5);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + i * 0.07);
            osc.stop(now + i * 0.07 + 0.5);
          });
        }
      } catch (e) {}
    }

    // Each scene's voices and effects (its <metadata class="pg-sound">) and the genre's music: from
    // the sound pack's files carried below, else made by the synthesizer (src/sound-synth.js).
    // Nothing to load, works offline.
    ${pgSound.toString()}
    ${pgSoundTrack.toString()}
    ${pgVoiced.toString()}
    ${pgBank.toString()}
    ${pgMusicBars.toString()}
    ${pgMusicTrack.toString()}
    const PACK = /*pg-pack*/${packJson}/*pg-pack-end*/;
    const clipGenre = '${genre}';
    let sceneTrack = null, musicTrack = null, bank = null, bankLoading = null, mix = null;
    let musicEnabled = true;
    const btnMusic = document.getElementById('btn-music');
    function audio() {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      if (!mix) {
        const comp = audioCtx.createDynamicsCompressor();
        comp.threshold.value = -14; comp.ratio.value = 4;
        mix = audioCtx.createGain();
        mix.gain.value = 1.2;
        mix.connect(comp);
        comp.connect(audioCtx.destination);
      }
      return audioCtx;
    }
    function loadBank() {
      if (bankLoading || !PACK.length) return bankLoading;
      const ctx = audio();
      bankLoading = Promise.all(PACK.map((e) => {
        const bytes = Uint8Array.from(atob(e.data), (c) => c.charCodeAt(0));
        return ctx.decodeAudioData(bytes.buffer).then((buffer) => ({ ...e, data: null, buffer })).catch(() => null);
      })).then((list) => {
        bank = pgBank(list.filter(Boolean));
        // Now with the pack's files
        if (sceneTrack) playSceneSound(true);
        if (musicTrack) { musicTrack.stop(); musicTrack = null; playMusic(); }
      });
      return bankLoading;
    }
    function playSceneSound(resume) {
      if (sceneTrack) { sceneTrack.stop(); sceneTrack = null; }
      const m = stage.querySelector('metadata.pg-sound');
      if (!soundEnabled || !isPlaying || !m) return;
      try {
        const ctx = audio();
        const svg = stage.querySelector('svg');
        const ms = resume && svg && svg.getAnimations ? Math.max(0, ...svg.getAnimations({ subtree: true }).map((a) => Number(a.currentTime) || 0)) : 0;
        sceneTrack = pgSoundTrack(ctx, mix, JSON.parse(m.textContent), ms / 1000, { bank, onVoice: (at, s) => musicTrack && musicTrack.duck(at, s) });
      } catch (e) {}
    }
    function playMusic() {
      if (!musicEnabled || !isPlaying) { if (musicTrack) { musicTrack.stop(); musicTrack = null; } return; }
      if (musicTrack) return;
      try { musicTrack = pgMusicTrack(audio(), mix, clipGenre, bank); } catch (e) {}
    }
    btnMusic.addEventListener('click', () => {
      musicEnabled = !musicEnabled;
      btnMusic.classList.toggle('on', musicEnabled);
      playMusic();
    });
    // Browsers start sound only after a click: the first one starts the scene's sound and the music
    document.addEventListener('pointerdown', () => { audio(); loadBank(); if (!sceneTrack) playSceneSound(true); playMusic(); }, { once: true });

    dotsContainer.innerHTML = scenes.map((_, i) =>
      \`<div class="scene-dot \${i === 0 ? 'active' : ''}" onclick="goToScene(\${i})"></div>\`
    ).join('');

    function renderScene(idx, withChime = true) {
      curIndex = (idx + scenes.length) % scenes.length;
      const sc = scenes[curIndex];
      currentDuration = (sc.duration || 5.0) * 1000;
      sceneStartTime = Date.now();

      stage.innerHTML = sc.svg;
      if (tagEl && sc.tag) tagEl.textContent = sc.tag;
      if (headlineEl && sc.headline) headlineEl.textContent = sc.headline;
      if (captionEl) captionEl.textContent = sc.caption;

      document.querySelectorAll('.scene-dot').forEach((d, i) => {
        d.classList.toggle('active', i === curIndex);
      });

      if (withChime) playChime();
      playSceneSound(false);
      if (audioCtx) playMusic();
      startProgress();
    }

    function startProgress() {
      clearInterval(progressInterval);
      clearTimeout(sceneTimer);

      if (!isPlaying) {
        progressFill.style.width = '0%';
        return;
      }

      progressInterval = setInterval(() => {
        const elapsed = Date.now() - sceneStartTime;
        const pct = Math.min(100, (elapsed / currentDuration) * 100);
        progressFill.style.width = pct + '%';
      }, 50);

      sceneTimer = setTimeout(() => {
        renderScene(curIndex + 1);
      }, currentDuration);
    }

    function goToScene(i) {
      renderScene(i);
    }

    function togglePlay() {
      isPlaying = !isPlaying;
      btnPlay.textContent = isPlaying ? '⏸' : '▶';
      if (isPlaying) {
        sceneStartTime = Date.now();
        startProgress();
      } else {
        clearInterval(progressInterval);
        clearTimeout(sceneTimer);
      }
      playSceneSound(true);
      playMusic();
    }

    btnPlay.addEventListener('click', togglePlay);
    btnNext.addEventListener('click', () => renderScene(curIndex + 1));
    btnPrev.addEventListener('click', () => renderScene(curIndex - 1));
    btnSound.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      btnSound.classList.toggle('on', soundEnabled);
      btnSound.textContent = soundEnabled ? '🔔' : '🔕';
      if (soundEnabled) playChime();
      playSceneSound(true);
    });

    progressTrack.addEventListener('click', (e) => {
      const rect = progressTrack.getBoundingClientRect();
      const clickPct = (e.clientX - rect.left) / rect.width;
      const targetScene = Math.floor(clickPct * scenes.length);
      goToScene(targetScene);
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') { togglePlay(); e.preventDefault(); }
      else if (e.code === 'ArrowRight') { renderScene(curIndex + 1); e.preventDefault(); }
      else if (e.code === 'ArrowLeft') { renderScene(curIndex - 1); e.preventDefault(); }
    });

    renderScene(0, false);
    btnPlay.textContent = '⏸';
  </script>
</body>
</html>`;
}
