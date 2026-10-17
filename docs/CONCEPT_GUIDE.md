# Concept Authoring Guide

A **concept** is one drawable thing (apple, boy, bike…). It is drawn **once**, style-agnostically, and the
style engine renders it as flat / cartoon / outline / pastel / silhouette / sketch / neon.

Reference examples: `src/concepts/sky.js` (sun, moon), `src/concepts/food.js` (apple), `src/concepts/people.js` (boy).

## Definition format

```js
{
  id: 'apple',                 // unique, lowercase, use_underscores for multi-word ('ice_cream')
  label: 'apple',              // optional, defaults to id with spaces
  aliases: ['fruit'],          // extra words/phrases that should map here (singular form; plurals are automatic)
  tags: ['fruit', 'food'],     // free tags (used for search; 'winter' tag => snowy scene)
  category: 'food',            // sky | nature | people | animals | vehicles | food | objects
  placement: 'ground',         // where it lives in a scene (see table)
  scale: 0.22,                 // real-world height relative to a standing adult/kid ≈ 1
  baseline: 92,                // y in the 100x100 box where it touches the ground (default 96)
  width: 0.7,                  // fraction of box width actually used by the drawing (default 0.8), for layout
  colors: { main: '#e53935', leaf: '#43a047' },   // named color roles
  colorable: 'main',           // role overridden by "red apple" / { color } (default 'main')
  palettes: { main: ['#e53935', '#7cb342'] },     // optional random choices when vary=true
  flippable: true,             // may be mirrored for variety in scenes (default true)
  maxCount: 5,                 // optional cap for repeats in scenes
  draw(d, p) { ... },
}
```

### Placement values
| placement   | meaning                                   | examples |
|-------------|-------------------------------------------|----------|
| `sky`       | top of scene, centered anchor             | sun, moon, star, cloud |
| `air`       | flying, upper-middle, centered anchor     | bird, plane, kite, balloon, butterfly |
| `ground`    | stands on ground (uses `baseline`)        | people, animals, cars, trees, houses, objects |
| `water`     | floats on water surface (uses `baseline`) | boat, ship, duck(if you want) |
| `underwater`| inside water, centered anchor             | fish, octopus |
| `background`| huge, behind everything on horizon        | mountain, rainbow |

Ground items with `scale >= 1.4` go to the back row (trees, houses), others to the front row.

### Scale cheat-sheet (person ≈ 1)
apple 0.22 · ball 0.3 · cat 0.4 · dog 0.5 · chair 0.5 · bike 0.75 · boy 0.95 · man 1.05 · car 0.85 · horse 1.2 ·
bus 1.4 · tree 2.0 · house 1.9 · sun 0.9 · cloud 0.7 · bird 0.25 · plane 0.6 · mountain 2.5

## Coordinate system
- Draw inside a **100 × 100** box, origin top-left, y down. Keep a ~3-unit margin.
- Ground objects: the lowest point should sit at `baseline` (≈ 92–97).
- Sky/air/underwater objects: center the drawing around (50, 50).
- Fill the box reasonably (the icon should not look tiny). Side views for animals/vehicles, facing **right** is preferred.

## Drawing kit `d`
```js
d.circle(cx, cy, r, o)
d.ellipse(cx, cy, rx, ry, o)
d.rect(x, y, w, h, o)            // o.rx = corner radius
d.path('M.. C.. Z', o)
d.poly([[x,y], ...], o)          // closed polygon
d.line(x1, y1, x2, y2, o)        // kind 'line' by default
d.polyline([[x,y], ...], o)      // kind 'line' by default
d.group('rotate(20 50 50)', () => { ...shapes... })   // transform a set of shapes
```
Options `o`: `{ fill, stroke, sw (stroke width for lines), opacity, kind, transform }`

### Shape kinds — choose carefully, this is what makes styles work
| kind        | use for | rendered as |
|-------------|---------|-------------|
| `body` (default) | every main **filled** part (bodies, wheels, windows, leaves, limbs) | fill (+ outline in cartoon/outline/pastel/sketch/neon) |
| `line`      | stroke-only parts: stems, bike frames, whiskers, mouths, strings | stroke only (`stroke`, `sw`) |
| `detail`    | small dark **solid** features that must stay in line art: eyes, nostrils, buttons | solid fill (ink in outline) |
| `accent`    | decorative patches w/o outline: cheeks, spots, stripes, craters | fill only; hidden in outline/silhouette/neon |
| `highlight` | white shine | hidden in outline/silhouette/sketch/neon |
| `shadow`    | soft dark patch | hidden except flat/cartoon |

Rules of thumb:
- Limbs, thick parts → filled `body` shapes (rects/paths), **not** thick lines (thick lines become heavy black bars in outline style).
- Draw back-to-front (painter's order). Overlaps are fine; in outline style white fills hide what's behind.
- Use `import { INK } from '../core/styles.js'` (#263238) for eyes/mouths.
- Faces: friendly & simple (dot eyes `detail`, smile `line` sw≈1.8, cheeks `accent`).

## Params `p`
```js
p.c('main')          // color for a role (respects user color, palettes when vary=true)
p.rand(a, b), p.pick([..]), p.rng()   // seeded randomness (optional, keep drawings stable)
p.opts               // raw options
```

## Checking your work
```bash
node scripts/preview.js cat dog fish --name animals     # -> out/animals.png (all styles)
node scripts/preview.js --text "a cat and a dog near a tree" --name animals-scene --scene-style flat,outline
node scripts/smoke-test.js
```
Open the PNG and check every style: recognisable silhouette, nothing cut off, no ugly overlaps, outline style looks like clean line art.
