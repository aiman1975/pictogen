# Roadmap: Text to Clip

**Goal:** type a sentence ("a boy walks toward us and waves, then a dog runs to him") and get a
short animated clip with living figures, a believable environment and camera, in any of the
visual styles. It should run offline and export as SVG, HTML or video.

## Where it stands

- **Text understanding:** objects, counts, colors, sizes, expressions, motions, negation, and
  direction phrases ("toward us", "away into the distance", "across the room").
- **Figures:** about 70 hand-drawn rigged concepts (people with limbs, faces and expressions,
  animals, vehicles) plus about 3,170 static emoji icons.
- **Animation:** CSS keyframes. Limb cycles (walk, run, jump, dance, wave...), facial cycles
  (blink, talk), environment loops (clouds, rain, stars).
- **Depth (2.5D):** figures can walk from the horizon toward the camera ("approach") or away
  ("recede", seen from behind) on a perspective path. Crowds stand in two depth rows, and grounded figures have
  contact shadows.
- **Clips:** multi-scene stories with captions, four genres (kids, documentary, news, how-to)
  and three aspect ratios, exported as a standalone HTML player.

## On 3D

**Recommendation: build out 2.5D in SVG first, not true 3D.**

- **True 3D** (three.js/WebGL with 3D models) gets real rotation and lighting. But it needs a 3D
  asset for every concept and a GPU, and it gives up the 20 flat illustration styles that make
  PictoGen distinctive.
- **2.5D** keeps every style and the vector output, and gets most of what viewers read as depth:
  - perspective scaling along a path (done for approach/recede)
  - occlusion order
  - contact shadows
  - parallax layers
  - atmospheric fade with distance
  - camera zoom and pan
  - front, three-quarter, side and back views of characters

Revisit 3D only for a specific premium style ("clay 3D") once the clip engine is mature.

## Phases

### 1. Depth and staging (started)
- [x] Approach/recede on a perspective path, motion scaled correctly for every figure size
- [x] Contact shadows, two depth rows for crowds
- [x] **Back views** of the four people in all 20 styles. Walking away shows the back, and prompts
      can ask for it ("seen from behind", "back view of", "with her back to the camera") or override
      it ("walking away facing us")
- [x] **Side views** (profile) of the four people: one eye, nose and ear, far arm and leg drawn
      darker behind the body, all ten expressions. Walking and running people use them by default,
      so the limb swing reads as a stride; stylized styles turn the face toward the walking direction
- [x] Front and back views for the dog, cat, rabbit and lion (and the penguin's back): animals
      running toward the camera face it, walking away they show their back and tail
- [x] **Three-quarter views** of the four people (face turned and narrowed, a nose on the turned side,
      the woman's near strand of hair behind the face). In timelines, standing people turn
      three-quarters toward someone of another kind nearby; prompts can ask for it ("3/4 view")
- [x] Turning during a clip: profile while walking, three-quarters or front while standing
- [ ] Three-quarter views for animals; head turns without turning the body
- [ ] Re-sort draw order while a figure travels (now drawn in front for the whole path)
- [ ] Atmospheric perspective: lighter, lower-contrast far objects
- [ ] Paths: walking along a road or riverbank and around obstacles, not only straight lines

### 2. Characters and facial expression
- [ ] One shared skeleton (hips, knees, elbows, neck) for all rigged figures, so every motion works
      on every character instead of per-drawing animation classes
- [ ] More expressions plus **expression changes over time** ("sad, then happy")
- [ ] Eye gaze (look at another character, follow a moving object), eyebrows, head tilt
- [ ] Lip-sync from caption text (map words to mouth shapes), no audio needed
- [ ] Idle life: breathing, weight shift, occasional glances; secondary motion (hair, ears, tails)
- [ ] Interactions: holding a ball, sitting on a chair, riding a bike, hugging

### 3. Environment
- [ ] Parallax layers (far hills, mid trees, near grass) that move with the camera
- [ ] More settings: city street, beach, forest, classroom, kitchen, space; indoor rooms with furniture
- [ ] Time-of-day and weather changes inside a clip (sunset falls, rain starts)
- [ ] Props that react: trees sway in wind, water ripples around a swimmer

### 4. Clip engine (timeline)
- [x] **Beats within a scene**: "a boy walks in, then waves, then a dog runs to him" becomes a
      per-actor timeline: enter, move to someone or something, gesture, change expression, leave.
      Subjects carry over between beats, pronouns resolve, and figures turn (profile while walking,
      facing us while gesturing)
- [x] Several figures of one kind in a timeline ("two boys walk in, then they wave, then three dogs
      run to them"): each is its own figure, they walk in single file (the one going furthest leads)
      and line up beside a group they walk to
- [ ] Timelines: walking toward/away from the camera inside a timeline, simultaneous actions with
      different timing ("while")
- [x] Camera: zoom in / close-up on someone, zoom out, pan left/right or to something, follow a
      character (a tracking shot). As beats in a timeline ("then the camera zooms in on him") or on
      their own, looping smoothly; the view never shows past the edge of the scene
- [ ] Camera: cuts between shots, shake, dolly-zoom; keep the studio's drag-and-drop exact while zoomed
- [ ] Scene transitions (cut, fade, wipe) and caption timing tied to the beats
- [ ] Recurring characters: the same boy looks the same in every scene (seeded identity)

### 5. Export
- [ ] **Video (MP4/WebM/GIF)** by stepping the animations frame by frame in a headless browser
      (the Web Animations API can seek every keyframe deterministically, which the depth tests
      already rely on), then encoding with a separately installed ffmpeg (not bundled, because of
      its LGPL/GPL licensing)
- [ ] Lottie JSON export for app developers
- [ ] Transparent-background PNG sequences for video editors

### 6. Product quality
- [ ] Visual regression tests: render reference prompts to PNG and compare against approved images
- [ ] A license check in CI so no unlicensed asset gets in (see `docs/LICENSE_AUDIT.md`)
- [ ] Performance budget for clips with many figures
- [ ] Studio UI: a timeline view, per-figure motion picker including approach/recede

## Known issues to fix along the way
- The bicycle drawing loses its wheels at small sizes
- "shoes" and "glasses" match ballet shoes and clinking glasses
- Walk-across figures also get a sideways-scrolling ground, so the motion counts twice
