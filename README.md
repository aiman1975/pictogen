# PictoGen 🎨

> **Offline text-to-vector image generation engine** built with procedural SVG, semantic matching, switchable visual styles, and scene composition.

PictoGen is designed to automatically generate crisp vector illustrations from plain English text without any cloud APIs, external subscriptions, or heavy machine learning models. It runs 100% offline with **zero dependencies** on pure Node.js and modern web standards.

---

## Highlights

- ⚡ **100% Offline & Zero Dependencies**: Uses native JavaScript & SVG. No npm installs or GPU required.
- 🎨 **20 Switchable Visual Styles** (the classic seven below, plus cute2d, comic, doodle, editorial, papercut, geometric, whiteboard, blueprint, chalkboard, vintage, pixel, stickman and letterling):
  - **Flat**: Clean, modern emoji-like flat colors.
  - **Cartoon**: Bold vibrant colors with dark ink outlines (children's books).
  - **Outline**: Clean black & white line art (coloring books & minimal diagrams).
  - **Pastel**: Soft, dreamy tones with gentle contours.
  - **Silhouette**: High-contrast solid pictograms and signage.
  - **Sketch**: Hand-drawn pencil look with organic wobble.
  - **Neon**: Cyberpunk-style vibrant glowing vectors on a dark canvas.
- 📐 **13 Layout Modes** (the three core modes below, plus comic strip, stickman, isometric diorama, callout, knolling, before/after split, waffle chart, coloring book, alphabet pals and animated clips):
  - **Scene (`scene`)**: Auto-detects environment (day, night, sunset, rain, snow, water/beach), arranges items by perspective, placement, and realistic relative scale.
  - **Flashcard (`card`)**: Large friendly typography and hero icon on tinted card (ideal for kids' flashcards & language learning).
  - **Sticker / Icon Sheet (`icons`)**: Organized grid of matched concepts with captions (great for presentation slides & documentation).
- 🧠 **Smart Text Matcher**:
  - Handles numbers (*"three apples"*, *"4 dogs"*, *"a dozen eggs"* &rarr; counts, capped at 12 per item).
  - Views (*"a boy seen from behind"*, *"back view of a girl"*, *"a man in profile"*, *"a three-quarter view of a woman"*); walking and running people are drawn in profile, dogs, cats, rabbits and lions face the camera when they come toward it and show their backs walking away.
  - Handles negation (*"a dog and no cats"*, *"a boy without a ball"* &rarr; the negated item is left out).
  - Handles colors (*"a blue bike"* &rarr; bike frame rendered in blue).
  - Handles sizes (*"huge tree"* &rarr; scaled up).
  - Handles plurals & irregular forms (*"geese"*, *"leaves"*, *"bicycles"*).
  - Semantic aliases (*"schoolboy"* &rarr; boy, *"automobile"* &rarr; car, *"nemo"* &rarr; fish).
  - Motion and depth (*"a boy walking towards us"* &rarr; walks from the horizon toward the camera, growing with perspective; *"a girl walking away into the distance"* &rarr; seen from behind, shrinking toward the horizon; *"a man and a dog walking across the park"* &rarr; both walk, at the same pace).
  - Several actions in one scene (*"a boy walks in, then waves, then a dog runs to him"*, *"a girl walks in, then smiles, then she jumps, finally she leaves"*) &rarr; a timeline: actors enter, walk or run to someone, gesture, change expression and leave, turning to face the way they go, or walk toward the camera and away into the distance (*"a boy walks toward us, then waves, then walks away into the distance"*). Characters speak, lip-synced (no sound needed): quoted words are said, not drawn (*`Tom says "Hello Mia, how are you?"`*, *`…, then Mia asks "Can I play?"`*, *`Tom: "Look!"`*), and in a clip a scene's own caption is said by whoever talks in it. Each syllable opens the mouth by its vowel, m/b/p close the lips, commas and full stops pause; photo jaws and drawn mouths both follow the words, and a step that says something lasts as long as the words take. Characters look at each other (*"then they look at each other"*, *"the boy looks at the dog"*, *"waves at us"*): they turn toward whoever they look at, eyes on them. Things can happen at the same time: *"a boy walks in, then while he waves, a dog runs to him"*, *"meanwhile"*, *"at the same time"*. Or one after the other: *"when the dog arrives, the boy jumps"*, *"the cat runs to her after the girl waves"*, *"before"*, *"until"*, *"walks in and waves"*.
  - Camera moves (*"zoom in on the dog"*, *"a close-up of the boy"*, *"the camera pans right"*, *"pull back"*, *"the camera follows her"*), on their own or as beats: *"a boy walks in, then waves, then the camera zooms in on him"*.
- 🧩 **Extensible Library**: ~70 hand-drawn concepts (recolorable, with expressions & motion) plus ~3,170 Fluent Emoji library icons (MIT). The hand-drawn core:
  - **Vehicles**: `bike`, `car`, `bus`, `boat`, `plane`
  - **Nature**: `tree`, `neem`, `flower`, `mountain`, `grass`
  - **Food**: `apple`, `banana`, `orange`, `cake`
  - **People**: `boy`, `girl`, `man`, `woman`
  - **Animals**: `dog`, `cat`, `bird`, `fish` (nemo), `duck`, `rabbit`
  - **Wildlife**: `lion`, `elephant`, `penguin`
  - **Sky**: `sun`, `moon`, `cloud`, `star`, `rainbow`
  - **Objects**: `house`, `ball`, `book`, `gem`, `pencil`

---

## Quickstart

### 1. Launch the Web Studio
```bash
node serve.js
# Open http://localhost:3000 in your browser
```
Enjoy an interactive prompt bar, style toggles, live SVG viewport, concept dictionary, and one-click SVG/PNG export!

**One skeleton for everyone:** the people and the dog, cat, rabbit, lion, elephant, bird, duck, penguin and fish share one skeleton (legs, head, tail, wings; knees and elbows for people in profile), so motions work on all of them: people glance around, nod as they talk, and bend their knees as they walk and run: a dog gallops and wags its tail, a bird flaps its wings, a penguin waddles and waves its flipper, an elephant waves its trunk. Idle animals blink, sway their tails and twitch their ears.

**Timeline view:** under a scene that moves, the timeline shows its steps, one lane per figure and one for the camera. Drag on the ruler to scrub. Click a step to change who does what ("walks in" → "runs to the dog", "waves" → "jumps", a feeling, a camera move), move it earlier or later, add a figure to it or delete it. **＋ Step** adds steps, also to a still scene. Drag a step's right edge (or type its length) to make it longer or shorter; prompts can set lengths too (*"waves for 3 seconds"*). ↶ / ↷ or Ctrl+Z / Ctrl+Shift+Z undo and redo. Edits stay while you change style or seed; **↺ Use the prompt** drops them.

**Your characters:** **＋ Add from a photo** puts a real face on a boy, girl, man or woman. The crop shows the head's oval with an eye line, a mouth line and a chin mark: drag and zoom the photo until the eyes sit on the yellow line, the mouth on the pink one and the chin at the bottom; a plain background around the face is removed. The face is cut at the mouth line, so the jaw drops to talk (*"Tom talks to Mia"*), bounces when laughing and hangs open in surprise; turned toward someone, the photo turns too. Name the character (say *Tom*) and use the name in prompts: *"Tom walks in, then waves"*, *"Tom and Mia looking at each other"*. Several of one kind work too: *"Tom and Max walk in, then Mia runs to them, then Tom waves at Max"* gives two boys who each act and wear their own face (and different clothes). Names and photos never leave your browser: the server only sees a neutral key and the kind of figure ("pgc1", a boy), and the face is added on your page, so GIF and video exports and the clip's HTML player include it (the saved player file then contains the photos).

**Your clip:** under a scene, **＋ Add this scene** saves it, timeline edits included, as the next scene of a clip. Give each scene a caption, reorder or remove scenes, and **▶ Play clip** plays them in 🎬 Clip Studio, where they export as a video or a standalone HTML player. The clip stays in your browser between visits.

**Promo video:** `npm run promo` builds a 90-second product video (`out/promo/pictogen-promo.mp4`, 1080p, with music) that shows what PictoGen can do. Every picture in it is drawn by PictoGen, the studio part is a real recording of the studio, and the music and sound effects are synthesized by `scripts/promo/audio.js`, so there is nothing to license. Needs Playwright and ffmpeg; `--preview slides` renders one still per slide.

**Video & GIF export:** the 🎞 GIF and 🎬 Video buttons under the canvas render the animated scene, timelines and camera moves included, frame by frame in your browser. Video is MP4 (H.264) where the browser can record it (Chrome, Edge, Safari), otherwise WebM. In 🎬 Clip Studio, **Export Video** renders the whole clip with a title card and each scene's caption. Everything runs locally; nothing is uploaded and nothing needs installing.

### 2. Command Line Interface (CLI)
Generate images directly from your terminal:

```bash
# Generate a full illustrated scene
node cli.js "a boy riding a blue bike under the sun and tree" -s cartoon -o scene.svg

# Generate a vocabulary flashcard for kids learning
node cli.js "apple" -m card -s cartoon -o apple_card.svg

# Generate an icon sheet for presentation slides
node cli.js "bike, car, bus, boat, plane" -m icons -s flat -o vehicles.svg

# Export every concept in every style as individual SVG files (~67,000 files)
node cli.js --export-all ./dist/library/
```

### 3. Programmatic Node.js / JavaScript API
```javascript
import { generate, parseText, renderIcon, renderCard } from './src/index.js';

// Text-to-Image in one call:
const result = generate('A boy and a dog under the sun', {
  style: 'cartoon', // 'flat' | 'cartoon' | 'outline' | 'pastel' | 'silhouette' | 'sketch' | 'neon'
  mode: 'scene',    // 'scene' | 'card' | 'icons'
  width: 640,
  height: 360,
  vary: true,       // randomize clothing, skin tones, palettes
});

console.log(result.svg);     // Full SVG XML string
console.log(result.matches); // [{ id: 'boy', count: 1 }, { id: 'dog', count: 1 }, { id: 'sun', count: 1 }]
```

---

## Adding New Concepts

Every concept is written once in a style-agnostic manner inside `src/concepts/`. See [`docs/CONCEPT_GUIDE.md`](docs/CONCEPT_GUIDE.md) for full instructions and drawing examples.

Example:
```javascript
export default [
  {
    id: 'cup',
    aliases: ['mug', 'coffee_cup'],
    tags: ['kitchen', 'drink'],
    category: 'objects',
    placement: 'ground',
    scale: 0.25,
    baseline: 92,
    colors: { main: '#1e88e5' },
    draw(d, p) {
      d.rect(32, 40, 36, 44, { rx: 4, fill: p.c('main') });
      d.path('M68 48 C78 48 78 68 68 68', { kind: 'line', stroke: p.c('main'), sw: 4 });
    }
  }
];
```

Run the test suite (smoke test, SVG well-formedness, animations, presentation modes, story engine, depth & motion, CLI, server):
```bash
npm test
```
`scripts/generate-showcase-audio.js` regenerates the showcase narration in `public/audio/` with the operating system's own voice engine: PowerShell voices on Windows, `say` on macOS, or `espeak-ng`/`espeak` on Linux (`sudo apt install espeak-ng`). `node scripts/test-tts.js` checks that an engine is available.

---

## Roadmap & Licensing

- **Roadmap:** [`docs/ROADMAP.md`](docs/ROADMAP.md): the text-to-clip plan (depth, characters, environments, timeline, video export).
- **License:** PictoGen is MIT-licensed ([`LICENSE`](LICENSE)). Bundled third-party material (Microsoft Fluent Emoji, MIT; Nunito and JetBrains Mono fonts, SIL OFL 1.1) is listed in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md), and the full audit is in [`docs/LICENSE_AUDIT.md`](docs/LICENSE_AUDIT.md).
