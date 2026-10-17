# PictoGen 🎨

> **Offline text-to-vector image generation engine** built with procedural SVG, semantic matching, switchable visual styles, and scene composition.

PictoGen is designed to automatically generate crisp vector illustrations from plain English text without any cloud APIs, external subscriptions, or heavy machine learning models. It runs 100% offline with **zero dependencies** on pure Node.js and modern web standards.

---

## Highlights

- ⚡ **100% Offline & Zero Dependencies**: Uses native JavaScript & SVG. No npm installs or GPU required.
- 🎨 **7 Switchable Visual Styles**:
  - **Flat**: Clean, modern emoji-like flat colors.
  - **Cartoon**: Bold vibrant colors with dark ink outlines (children's books).
  - **Outline**: Clean black & white line art (coloring books & minimal diagrams).
  - **Pastel**: Soft, dreamy tones with gentle contours.
  - **Silhouette**: High-contrast solid pictograms and signage.
  - **Sketch**: Hand-drawn pencil look with organic wobble.
  - **Neon**: Cyberpunk-style vibrant glowing vectors on a dark canvas.
- 📐 **3 Generation Modes**:
  - **Scene (`scene`)**: Auto-detects environment (day, night, sunset, rain, snow, water/beach), arranges items by perspective, placement, and realistic relative scale.
  - **Flashcard (`card`)**: Large friendly typography and hero icon on tinted card (ideal for kids' flashcards & language learning).
  - **Sticker / Icon Sheet (`icons`)**: Organized grid of matched concepts with captions (great for presentation slides & documentation).
- 🧠 **Smart Text Matcher**:
  - Handles numbers (*"three apples"* &rarr; count = 3).
  - Handles colors (*"a blue bike"* &rarr; bike frame rendered in blue).
  - Handles sizes (*"huge tree"* &rarr; scaled up).
  - Handles plurals & irregular forms (*"geese"*, *"leaves"*, *"bicycles"*).
  - Semantic aliases (*"schoolboy"* &rarr; boy, *"automobile"* &rarr; car, *"nemo"* &rarr; fish).
- 🧩 **Extensible Library (37+ Concepts Built-in)**:
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

### 2. Command Line Interface (CLI)
Generate images directly from your terminal:

```bash
# Generate a full illustrated scene
node cli.js "a boy riding a blue bike under the sun and tree" -s cartoon -o scene.svg

# Generate a vocabulary flashcard for kids learning
node cli.js "apple" -m card -s cartoon -o apple_card.svg

# Generate an icon sheet for presentation slides
node cli.js "bike, car, bus, boat, plane" -m icons -s flat -o vehicles.svg

# Export all 37 concepts in all 7 styles as individual SVG files
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

Every concept is written once in a style-agnostic manner inside `src/concepts/`. See [`docs/CONCEPT_GUIDE.md`](file:///C:/Users/User/.gemini/antigravity/scratch/pictogen/docs/CONCEPT_GUIDE.md) for full instructions and drawing examples.

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

Run test suite:
```bash
node scripts/smoke-test.js
```
