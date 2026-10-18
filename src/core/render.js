// Rendering: concept -> shapes -> styled SVG markup.

import { createKit } from './kit.js';
import { getStyle, INK } from './styles.js';
import { createRng } from './rng.js';
import { resolveColor, lighten } from './color.js';
import { getConcept } from '../concepts/index.js';

export const FONT = "'Nunito','Segoe UI',Roboto,Arial,sans-serif";

let uidN = 0;
/** Unique id prefix so several SVGs can live on one HTML page without filter-id clashes. */
export const newUid = () => 'pg' + (++uidN).toString(36);

export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const fmt = (v) => (typeof v === 'number' ? String(Math.round(v * 100) / 100) : esc(v));

export function attrs(o) {
  let s = '';
  for (const k in o) {
    const v = o[k];
    if (v === undefined || v === null || v === '') continue;
    s += ` ${k}="${fmt(v)}"`;
  }
  return s;
}

function lookup(conceptOrId) {
  const c = typeof conceptOrId === 'string' ? getConcept(conceptOrId) : conceptOrId;
  if (!c) throw new Error(`Unknown concept: ${conceptOrId}`);
  return c;
}

/** Parameters object passed as `p` to concept.draw(d, p). */
export function buildParams(concept, opts = {}) {
  const rng = createRng(opts.seed ?? concept.id);
  const colors = { ...concept.colors };
  if (opts.vary && concept.palettes) {
    for (const role in concept.palettes) {
      const list = concept.palettes[role];
      if (list && list.length) colors[role] = list[Math.floor(rng() * list.length)];
    }
  }
  if (opts.colors) {
    for (const k in opts.colors) {
      const v = resolveColor(opts.colors[k]);
      if (v) colors[k] = v;
    }
  }
  const main = resolveColor(opts.color);
  if (main) colors[concept.colorable || 'main'] = main;
  return {
    colors,
    rng,
    opts,
    variant: opts.variant,
    c: (role, fallback) => colors[role] ?? fallback ?? '#9e9e9e',
    rand: (a = 0, b = 1) => a + (b - a) * rng(),
    pick: (arr) => arr[Math.floor(rng() * arr.length)],
  };
}

export function drawConcept(conceptOrId, opts = {}) {
  const c = lookup(conceptOrId);
  const kit = createKit();
  c.draw(kit, buildParams(c, opts));
  return kit.shapes;
}

export const ANIMATION_CSS = `
/* PictoGen Rigged Limb & Expression Keyframes */
.pg-leg-left, .pg-leg-right, .pg-arm-left, .pg-arm-right, .pg-body-torso, .pg-face-eyes, .pg-face-mouth {
  transform-box: fill-box;
}

/* Eye Blinking */
@keyframes pgBlink {
  0%, 90%, 96%, 100% { transform: scaleY(1); }
  93% { transform: scaleY(0.1); }
}
.pg-face-eyes, .pg-anim-blink .pg-face-eyes {
  transform-box: fill-box;
  transform-origin: center;
  animation: pgBlink 3.6s ease-in-out infinite;
}

/* Walk Cycle */
@keyframes pgWalkLegL {
  0%, 100% { transform: rotate(-22deg); }
  50% { transform: rotate(22deg); }
}
@keyframes pgWalkLegR {
  0%, 100% { transform: rotate(22deg); }
  50% { transform: rotate(-22deg); }
}
@keyframes pgWalkArmL {
  0%, 100% { transform: rotate(20deg); }
  50% { transform: rotate(-20deg); }
}
@keyframes pgWalkArmR {
  0%, 100% { transform: rotate(-20deg); }
  50% { transform: rotate(20deg); }
}
@keyframes pgWalkTorso {
  0%, 50%, 100% { transform: translateY(0); }
  25%, 75% { transform: translateY(-2px); }
}

.pg-anim-walk .pg-leg-left, .pg-anim-walk-across .pg-leg-left {
  transform-box: fill-box;
  transform-origin: top center;
  animation: pgWalkLegL 0.8s ease-in-out infinite alternate;
}
.pg-anim-walk .pg-leg-right, .pg-anim-walk-across .pg-leg-right {
  transform-box: fill-box;
  transform-origin: top center;
  animation: pgWalkLegR 0.8s ease-in-out infinite alternate;
}
.pg-anim-walk .pg-arm-left, .pg-anim-walk-across .pg-arm-left {
  transform-box: fill-box;
  transform-origin: top center;
  animation: pgWalkArmL 0.8s ease-in-out infinite alternate;
}
.pg-anim-walk .pg-arm-right, .pg-anim-walk-across .pg-arm-right {
  transform-box: fill-box;
  transform-origin: top center;
  animation: pgWalkArmR 0.8s ease-in-out infinite alternate;
}
.pg-anim-walk .pg-body-torso, .pg-anim-walk-across .pg-body-torso {
  transform-box: fill-box;
  transform-origin: bottom center;
  animation: pgWalkTorso 0.4s ease-in-out infinite;
}

/* Run Cycle */
@keyframes pgRunLegL {
  0%, 100% { transform: rotate(-36deg); }
  50% { transform: rotate(36deg); }
}
@keyframes pgRunLegR {
  0%, 100% { transform: rotate(36deg); }
  50% { transform: rotate(-36deg); }
}
@keyframes pgRunArmL {
  0%, 100% { transform: rotate(34deg); }
  50% { transform: rotate(-34deg); }
}
@keyframes pgRunArmR {
  0%, 100% { transform: rotate(-34deg); }
  50% { transform: rotate(34deg); }
}
@keyframes pgRunTorso {
  0%, 50%, 100% { transform: translateY(0) rotate(5deg); }
  25%, 75% { transform: translateY(-3.5px) rotate(5deg); }
}

.pg-anim-run .pg-leg-left {
  transform-box: fill-box;
  transform-origin: top center;
  animation: pgRunLegL 0.45s ease-in-out infinite alternate;
}
.pg-anim-run .pg-leg-right {
  transform-box: fill-box;
  transform-origin: top center;
  animation: pgRunLegR 0.45s ease-in-out infinite alternate;
}
.pg-anim-run .pg-arm-left {
  transform-box: fill-box;
  transform-origin: top center;
  animation: pgRunArmL 0.45s ease-in-out infinite alternate;
}
.pg-anim-run .pg-arm-right {
  transform-box: fill-box;
  transform-origin: top center;
  animation: pgRunArmR 0.45s ease-in-out infinite alternate;
}
.pg-anim-run .pg-body-torso {
  transform-box: fill-box;
  transform-origin: bottom center;
  animation: pgRunTorso 0.22s ease-in-out infinite;
}

/* Waving Arm */
@keyframes pgWave {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-50deg); }
}
.pg-anim-wave .pg-arm-right {
  transform-box: fill-box;
  transform-origin: top center;
  animation: pgWave 0.6s ease-in-out infinite alternate;
}

/* Talking Mouth */
@keyframes pgTalkMouth {
  0%, 100% { transform: scaleY(0.7); }
  50% { transform: scaleY(1.35); }
}
.pg-anim-talk .pg-face-mouth {
  transform-box: fill-box;
  transform-origin: center;
  animation: pgTalkMouth 0.25s ease-in-out infinite alternate;
}

/* Jump Cycle (Cartoon Squash & Stretch) */
@keyframes pgJumpBounce {
  0%, 100% { transform: translateY(0) scale(1, 1); }
  20% { transform: translateY(3px) scale(1.08, 0.92); }
  50% { transform: translateY(-26px) scale(0.94, 1.06); }
  75% { transform: translateY(-6px) scale(1, 1); }
}
@keyframes pgJumpArmL {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-50deg); }
}
@keyframes pgJumpArmR {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(50deg); }
}
@keyframes pgJumpLegL {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-22deg) translateY(-4px); }
}
@keyframes pgJumpLegR {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(22deg) translateY(-4px); }
}
.pg-anim-jump {
  transform-box: fill-box;
  transform-origin: bottom center;
  animation: pgJumpBounce 0.8s ease-in-out infinite;
}
.pg-anim-jump .pg-arm-left {
  transform-box: fill-box;
  transform-origin: top center;
  animation: pgJumpArmL 0.8s ease-in-out infinite;
}
.pg-anim-jump .pg-arm-right {
  transform-box: fill-box;
  transform-origin: top center;
  animation: pgJumpArmR 0.8s ease-in-out infinite;
}
.pg-anim-jump .pg-leg-left {
  transform-box: fill-box;
  transform-origin: top center;
  animation: pgJumpLegL 0.8s ease-in-out infinite;
}
.pg-anim-jump .pg-leg-right {
  transform-box: fill-box;
  transform-origin: top center;
  animation: pgJumpLegR 0.8s ease-in-out infinite;
}

/* Dance Cycle (Rhythmic Groove) */
@keyframes pgDanceTorso {
  0%, 100% { transform: rotate(-7deg) translateY(0); }
  50% { transform: rotate(7deg) translateY(-4px); }
}
@keyframes pgDanceArmL {
  0%, 100% { transform: rotate(-35deg); }
  50% { transform: rotate(25deg); }
}
@keyframes pgDanceArmR {
  0%, 100% { transform: rotate(25deg); }
  50% { transform: rotate(-35deg); }
}
.pg-anim-dance {
  transform-box: fill-box;
  transform-origin: bottom center;
  animation: pgDanceTorso 0.55s ease-in-out infinite alternate;
}
.pg-anim-dance .pg-arm-left {
  transform-box: fill-box;
  transform-origin: top center;
  animation: pgDanceArmL 0.55s ease-in-out infinite alternate;
}
.pg-anim-dance .pg-arm-right {
  transform-box: fill-box;
  transform-origin: top center;
  animation: pgDanceArmR 0.55s ease-in-out infinite alternate;
}

/* Cheer Cycle (Victory Arms Up) */
@keyframes pgCheerTorso {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}
@keyframes pgCheerArms {
  0%, 100% { transform: translateY(0) scaleY(1); }
  50% { transform: translateY(-5px) scaleY(1.08); }
}
.pg-anim-cheer {
  transform-box: fill-box;
  transform-origin: bottom center;
  animation: pgCheerTorso 0.45s ease-in-out infinite alternate;
}
.pg-anim-cheer .pg-arm-left, .pg-anim-cheer .pg-arm-right {
  transform-box: fill-box;
  transform-origin: top center;
  animation: pgCheerArms 0.45s ease-in-out infinite alternate;
}

/* Fly Cycle (Gliding Float) */
@keyframes pgFlyGlider {
  0%, 100% { transform: translateY(0) rotate(3deg); }
  50% { transform: translateY(-16px) rotate(-3deg); }
}
.pg-anim-fly {
  transform-box: fill-box;
  transform-origin: center;
  animation: pgFlyGlider 2.2s ease-in-out infinite;
}

/* Sleep / Relax Cycle */
@keyframes pgSleepTorso {
  0%, 100% { transform: scaleY(0.97) translateY(0); }
  50% { transform: scaleY(1.02) translateY(-1.5px); }
}
.pg-anim-sleep .pg-body-torso {
  transform-box: fill-box;
  transform-origin: bottom center;
  animation: pgSleepTorso 2.4s ease-in-out infinite;
}

/* Think Cycle */
@keyframes pgThinkTorso {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}
.pg-anim-think {
  transform-box: fill-box;
  transform-origin: bottom center;
  animation: pgThinkTorso 2s ease-in-out infinite alternate;
}

/* Generic Object Animations */
@keyframes pgSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.pg-anim-spin {
  transform-box: fill-box;
  transform-origin: center;
  animation: pgSpin 4s linear infinite;
}

@keyframes pgPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}
.pg-anim-pulse {
  transform-box: fill-box;
  transform-origin: center;
  animation: pgPulse 1.2s ease-in-out infinite;
}

@keyframes pgSway {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}
.pg-anim-sway {
  transform-box: fill-box;
  transform-origin: bottom center;
  animation: pgSway 2.5s ease-in-out infinite alternate;
}

@keyframes pgFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
.pg-anim-float {
  transform-box: fill-box;
  transform-origin: center;
  animation: pgFloat 2.8s ease-in-out infinite;
}

@keyframes pgRock {
  0%, 100% { transform: rotate(-6deg) translateY(0); }
  50% { transform: rotate(6deg) translateY(-2px); }
}
.pg-anim-rock {
  transform-box: fill-box;
  transform-origin: bottom center;
  animation: pgRock 2s ease-in-out infinite alternate;
}

@keyframes pgDrive {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2.2px); }
}
.pg-anim-drive {
  transform-box: fill-box;
  transform-origin: bottom center;
  animation: pgDrive 0.18s ease-in-out infinite;
}

@keyframes pgFlap {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(0.4); }
}
.pg-anim-flap {
  transform-box: fill-box;
  transform-origin: top center;
  animation: pgFlap 0.3s ease-in-out infinite alternate;
}

@keyframes pgWag {
  0%, 100% { transform: rotate(-18deg); }
  50% { transform: rotate(18deg); }
}
.pg-anim-wag {
  transform-box: fill-box;
  transform-origin: bottom center;
  animation: pgWag 0.35s ease-in-out infinite alternate;
}

/* Shared skeleton (src/concepts/rig.js). Joints carry their own pivots (style="transform-origin"),
   so every motion below works on any figure that names its joints; .pg-rig-<kind> varies it by
   skeleton: a dog gallops, a bird flaps its wings, a penguin waddles. */

/* Idle life: tails sway, heads glance, ears twitch, fish beat their tails */
@keyframes pgTailSway {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(7deg); }
}
@keyframes pgHeadIdle {
  0%, 62%, 100% { transform: rotate(0deg); }
  72% { transform: rotate(-5deg); }
  84% { transform: rotate(3deg); }
}
@keyframes pgEarTwitch {
  0%, 86%, 100% { transform: rotate(0deg); }
  91% { transform: rotate(-12deg); }
  96% { transform: rotate(5deg); }
}
/* (each figure starts its idle cycle at its own point: --pg-idle on the rig's root) */
.pg-tail { animation: pgTailSway 2.4s ease-in-out var(--pg-idle, 0s) infinite; }
.pg-head { animation: pgHeadIdle 6s ease-in-out var(--pg-idle, 0s) infinite; }
.pg-ear { animation: pgEarTwitch 4.6s ease-in-out var(--pg-idle, 0s) infinite; }

/* Tails wag when the figure is excited; "wag" moves the tail only, not the whole animal */
@keyframes pgTailWag {
  0%, 100% { transform: rotate(-24deg); }
  50% { transform: rotate(20deg); }
}
.pg-anim-wag .pg-tail, .pg-anim-run .pg-tail, .pg-anim-jump .pg-tail, .pg-anim-dance .pg-tail,
.pg-anim-cheer .pg-tail, .pg-anim-wave .pg-tail {
  animation: pgTailWag 0.32s ease-in-out infinite;
}
.pg-rig.pg-anim-wag { animation: none; }
.pg-rig-fish .pg-tail { animation: pgTailWag 0.6s ease-in-out infinite; }
@keyframes pgFinPaddle {
  0%, 100% { transform: rotate(-10deg); }
  50% { transform: rotate(14deg); }
}
.pg-rig-fish .pg-arm-right { animation: pgFinPaddle 0.8s ease-in-out infinite; }

/* Heads nod with each step, droop asleep, tilt in thought */
@keyframes pgHeadNod {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(4deg); }
}
@keyframes pgHeadDroop {
  0%, 100% { transform: rotate(12deg); }
  50% { transform: rotate(15deg); }
}
.pg-anim-walk .pg-head, .pg-anim-walk-across .pg-head { animation: pgHeadNod 0.4s ease-in-out infinite; }
.pg-anim-run .pg-head { animation: pgHeadNod 0.225s ease-in-out infinite; }
.pg-anim-sleep .pg-head { animation: pgHeadDroop 2.4s ease-in-out infinite; }
.pg-anim-think .pg-head { animation: none; transform: rotate(-8deg); }
.pg-anim-talk .pg-head { animation: pgHeadNod 0.5s ease-in-out infinite; }
.pg-anim-dance .pg-head { animation: pgHeadNod 0.275s ease-in-out infinite; }

/* Knees and elbows (people in profile): the shin folds back as its leg swings through - in time
   with the walk and run cycles above, where the near leg swings back in the first half - and the
   forearms bend forward, pumping when running */
@keyframes pgKneeNear {
  0%, 50%, 100% { transform: rotate(0deg); }
  75% { transform: rotate(40deg); }
}
@keyframes pgKneeFar {
  0%, 50%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(40deg); }
}
@keyframes pgKneeRunNear {
  0%, 45%, 100% { transform: rotate(4deg); }
  75% { transform: rotate(80deg); }
}
@keyframes pgKneeRunFar {
  0%, 50%, 95%, 100% { transform: rotate(4deg); }
  25% { transform: rotate(80deg); }
}
.pg-anim-walk .pg-leg-left .pg-shin, .pg-anim-walk-across .pg-leg-left .pg-shin { animation: pgKneeNear 0.8s ease-in-out infinite; }
.pg-anim-walk .pg-leg-right .pg-shin, .pg-anim-walk-across .pg-leg-right .pg-shin { animation: pgKneeFar 0.8s ease-in-out infinite; }
.pg-anim-run .pg-leg-left .pg-shin { animation: pgKneeRunNear 0.45s ease-in-out infinite; }
.pg-anim-run .pg-leg-right .pg-shin { animation: pgKneeRunFar 0.45s ease-in-out infinite; }
.pg-anim-walk .pg-forearm, .pg-anim-walk-across .pg-forearm { transform: rotate(-18deg); }
.pg-anim-run .pg-forearm { transform: rotate(-85deg); }
.pg-rig.pg-anim-sleep .pg-face-eyes { animation: none; transform: scaleY(0.12); }

/* Four legs: a gallop that pitches the body, a leap with legs stretched fore and aft, sitting,
   lying down; seen head-on the legs step up and down */
@keyframes pgGallopLegL {
  0%, 100% { transform: rotate(-30deg); }
  50% { transform: rotate(30deg); }
}
@keyframes pgGallopLegR {
  0%, 100% { transform: rotate(30deg); }
  50% { transform: rotate(-30deg); }
}
@keyframes pgGallopTorso {
  0%, 100% { transform: rotate(-3deg) translateY(0); }
  50% { transform: rotate(3deg) translateY(-3px); }
}
@keyframes pgLeapFront {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-38deg); }
}
@keyframes pgLeapHind {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(38deg); }
}
@keyframes pgStepL {
  0%, 100% { transform: translateY(-3.5px); }
  50% { transform: translateY(0); }
}
@keyframes pgStepR {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3.5px); }
}
.pg-rig-quadruped.pg-anim-run .pg-leg-left { animation: pgGallopLegL 0.45s ease-in-out infinite alternate; }
.pg-rig-quadruped.pg-anim-run .pg-leg-right { animation: pgGallopLegR 0.45s ease-in-out infinite alternate; }
.pg-rig-quadruped.pg-anim-run .pg-body-torso {
  transform-box: fill-box;
  transform-origin: center;
  animation: pgGallopTorso 0.45s ease-in-out infinite;
}
.pg-rig-quadruped.pg-anim-jump .pg-leg-front { animation: pgLeapFront 0.8s ease-in-out infinite; }
.pg-rig-quadruped.pg-anim-jump .pg-leg-hind { animation: pgLeapHind 0.8s ease-in-out infinite; }
.pg-rig-quadruped.pg-anim-dance .pg-leg-left { animation: pgStepL 0.55s ease-in-out infinite; }
.pg-rig-quadruped.pg-anim-dance .pg-leg-right { animation: pgStepR 0.55s ease-in-out infinite; }
.pg-rig-quadruped.pg-anim-sit .pg-body-torso {
  transform-box: fill-box;
  transform-origin: 20% 100%;
  transform: rotate(-16deg);
}
.pg-rig-quadruped.pg-anim-sit .pg-leg-front { transform: rotate(-6deg); }
.pg-rig-quadruped.pg-anim-sleep { transform: translateY(13px); }
.pg-rig-quadruped.pg-anim-sleep .pg-leg-left, .pg-rig-quadruped.pg-anim-sleep .pg-leg-right {
  transform-box: fill-box;
  transform-origin: top center;
  transform: scaleY(0.4);
}
.pg-rig-head-on.pg-anim-walk .pg-leg-left, .pg-rig-head-on.pg-anim-walk-across .pg-leg-left { animation: pgStepL 0.8s ease-in-out infinite; }
.pg-rig-head-on.pg-anim-walk .pg-leg-right, .pg-rig-head-on.pg-anim-walk-across .pg-leg-right { animation: pgStepR 0.8s ease-in-out infinite; }
.pg-rig-head-on.pg-anim-run .pg-leg-left { animation: pgStepL 0.45s ease-in-out infinite; }
.pg-rig-head-on.pg-anim-run .pg-leg-right { animation: pgStepR 0.45s ease-in-out infinite; }
.pg-rig-quadruped.pg-rig-head-on.pg-anim-run .pg-body-torso { animation: pgWalkTorso 0.225s ease-in-out infinite; }
.pg-rig-quadruped.pg-rig-head-on.pg-anim-jump .pg-leg-front,
.pg-rig-quadruped.pg-rig-head-on.pg-anim-jump .pg-leg-hind,
.pg-rig-head-on.pg-anim-jump .pg-leg-left, .pg-rig-head-on.pg-anim-jump .pg-leg-right { animation: pgStepL 0.8s ease-in-out infinite; }
.pg-rig-quadruped.pg-rig-head-on.pg-anim-sit .pg-body-torso { transform: none; }

/* Wings (and flippers, a trunk) are the arms of the skeleton: birds flap them, wave with one,
   raise both to cheer; a penguin's flippers and an elephant's trunk use the arm motions as they are */
@keyframes pgWingNear {
  0%, 100% { transform: rotate(-8deg); }
  50% { transform: rotate(58deg); }
}
@keyframes pgWingFar {
  0%, 100% { transform: rotate(-4deg); }
  50% { transform: rotate(68deg); }
}
@keyframes pgWingWave {
  0%, 100% { transform: rotate(10deg); }
  50% { transform: rotate(48deg); }
}
@keyframes pgBirdBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
@keyframes pgFlipperL {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(48deg); }
}
@keyframes pgFlipperR {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-48deg); }
}
@keyframes pgWaddle {
  0%, 100% { transform: rotate(-6deg); }
  50% { transform: rotate(6deg); }
}
.pg-rig.pg-anim-flap { animation: pgBirdBob 0.64s ease-in-out infinite; }
.pg-rig-bird.pg-anim-flap .pg-arm-right, .pg-rig-bird.pg-anim-fly .pg-arm-right,
.pg-rig-bird.pg-anim-cheer .pg-arm-right { animation: pgWingNear 0.32s ease-in-out infinite; }
.pg-rig-bird.pg-anim-flap .pg-arm-left, .pg-rig-bird.pg-anim-fly .pg-arm-left,
.pg-rig-bird.pg-anim-cheer .pg-arm-left { animation: pgWingFar 0.32s ease-in-out infinite; }
.pg-rig-bird.pg-anim-wave .pg-arm-right { animation: pgWingWave 0.6s ease-in-out infinite; }
.pg-rig-bird.pg-rig-head-on.pg-anim-flap .pg-arm-left, .pg-rig-bird.pg-rig-head-on.pg-anim-fly .pg-arm-left,
.pg-rig-bird.pg-rig-head-on.pg-anim-cheer .pg-arm-left { animation: pgFlipperL 0.3s ease-in-out infinite; }
.pg-rig-bird.pg-rig-head-on.pg-anim-jump .pg-arm-left { animation: pgFlipperL 0.8s ease-in-out infinite; }
.pg-rig-bird.pg-rig-head-on.pg-anim-jump .pg-arm-right { animation: pgFlipperR 0.8s ease-in-out infinite; }
.pg-rig-bird.pg-rig-head-on.pg-anim-flap .pg-arm-right, .pg-rig-bird.pg-rig-head-on.pg-anim-fly .pg-arm-right,
.pg-rig-bird.pg-rig-head-on.pg-anim-cheer .pg-arm-right { animation: pgFlipperR 0.3s ease-in-out infinite; }
.pg-rig-bird.pg-rig-head-on.pg-anim-wave .pg-arm-right { animation: pgWave 0.6s ease-in-out infinite alternate; }
.pg-rig-bird.pg-rig-head-on.pg-anim-walk .pg-body-torso, .pg-rig-bird.pg-rig-head-on.pg-anim-walk-across .pg-body-torso,
.pg-rig-bird.pg-rig-head-on.pg-anim-run .pg-body-torso {
  transform-box: fill-box;
  transform-origin: bottom center;
  animation: pgWaddle 0.8s ease-in-out infinite alternate;
}

/* Photo faces (the studio's "Your characters"): the lower jaw, cut at the mouth, drops to talk
   (--jaw: how far, set per face), bounces wider to laugh, hangs open in surprise */
@keyframes pgJawTalk {
  0%, 100% { transform: translateY(0); }
  45% { transform: translateY(var(--jaw, 1.6px)); }
  70% { transform: translateY(calc(var(--jaw, 1.6px) * 0.35)); }
}
@keyframes pgJawLaugh {
  0%, 100% { transform: translateY(calc(var(--jaw, 1.6px) * 0.5)); }
  50% { transform: translateY(calc(var(--jaw, 1.6px) * 1.3)); }
}
/* the dark mouth behind the jaw opens and closes with it: shut, there is none */
@keyframes pgMouthTalk {
  0%, 100% { transform: scaleY(0); }
  45% { transform: scaleY(1); }
  70% { transform: scaleY(0.35); }
}
@keyframes pgMouthLaugh {
  0%, 100% { transform: scaleY(0.5); }
  50% { transform: scaleY(1.3); }
}
.pg-photo-mouth { transform: scaleY(0); }
.pg-anim-talk .pg-photo-jaw, .pg-photo-face[data-mood="talking"] .pg-photo-jaw { animation: pgJawTalk 0.32s ease-in-out infinite; }
.pg-anim-talk .pg-photo-mouth, .pg-photo-face[data-mood="talking"] .pg-photo-mouth { animation: pgMouthTalk 0.32s ease-in-out infinite; }
.pg-photo-face[data-mood="laugh"] .pg-photo-jaw { animation: pgJawLaugh 0.22s ease-in-out infinite; }
.pg-photo-face[data-mood="laugh"] .pg-photo-mouth { animation: pgMouthLaugh 0.22s ease-in-out infinite; }
.pg-photo-face[data-mood="surprised"] .pg-photo-jaw { transform: translateY(calc(var(--jaw, 1.6px) * 1.2)); }
.pg-photo-face[data-mood="surprised"] .pg-photo-mouth { transform: scaleY(1.2); }

/* Environment Keyframes: Rain, Snow, Stars, Water, Sun Glow, Parallax */
@keyframes pgRainFall {
  0% { transform: translateY(-50px) translateX(0); opacity: 0; }
  15% { opacity: 0.85; }
  85% { opacity: 0.85; }
  100% { transform: translateY(240px) translateX(-25px); opacity: 0; }
}
.pg-env-rain {
  animation: pgRainFall 0.75s linear infinite;
}

@keyframes pgSnowFall {
  0% { transform: translateY(-40px) translateX(0); opacity: 0; }
  20% { opacity: 0.9; }
  80% { opacity: 0.9; }
  100% { transform: translateY(240px) translateX(25px); opacity: 0; }
}
.pg-env-snow {
  animation: pgSnowFall 2.8s linear infinite;
}

@keyframes pgStarTwinkle {
  0%, 100% { opacity: 0.25; transform: scale(0.7); }
  50% { opacity: 1; transform: scale(1.35); }
}
.pg-env-star {
  transform-box: fill-box;
  transform-origin: center;
  animation: pgStarTwinkle 1.8s ease-in-out infinite alternate;
}

@keyframes pgWaveRoll {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(18px); }
}
.pg-env-wave {
  animation: pgWaveRoll 2.2s ease-in-out infinite alternate;
}

@keyframes pgSunPulse {
  0%, 100% { transform: scale(1); opacity: 0.88; }
  50% { transform: scale(1.08); opacity: 1; }
}
.pg-env-sun {
  transform-box: fill-box;
  transform-origin: center;
  animation: pgSunPulse 3s ease-in-out infinite;
}

@keyframes pgCloudDrift {
  0% { transform: translateX(-40px); }
  100% { transform: translateX(680px); }
}
.pg-env-cloud {
  animation: pgCloudDrift 28s linear infinite;
}

/* Cartoon Parallax Background Ground Stripes */
@keyframes pgParallaxStripe {
  0% { transform: translateX(0); }
  100% { transform: translateX(-80px); }
}
.pg-parallax-ground {
  animation: pgParallaxStripe 1.2s linear infinite;
}

/* Walking Across / Roaming Motion */
@keyframes pgMotionAcross {
  0% { transform: translateX(-140px); }
  100% { transform: translateX(540px); }
}
.pg-motion-across {
  animation: pgMotionAcross 10s linear infinite;
}

@keyframes pgMotionRoam {
  0%, 48% { transform: translateX(0) scaleX(1); }
  49% { transform: translateX(200px) scaleX(1); }
  50%, 98% { transform: translateX(200px) scaleX(-1); }
  99% { transform: translateX(0) scaleX(-1); }
  100% { transform: translateX(0) scaleX(1); }
}
.pg-motion-roam {
  animation: pgMotionRoam 12s ease-in-out infinite;
}
`;

export function shapesToSvg(shapes, styleName = 'flat', ctx = {}) {
  const st = getStyle(styleName);
  const c = { olk: 1, ...ctx };
  let out = '';
  for (const s of shapes) {
    if (s.type === 'g-start') {
      const cls = s.class ? ` class="${esc(s.class)}"` : '';
      const style = s.style ? ` style="${esc(s.style)}"` : '';
      const id = s.id ? ` id="${esc(s.id)}"` : '';
      const tr = s.transform ? ` transform="${esc(s.transform)}"` : '';
      const data = s.data ? Object.entries(s.data).filter(([, v]) => v != null).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('') : '';
      out += `<g${id}${cls}${style}${tr}${data}>`;
      continue;
    }
    if (s.type === 'g-end') {
      out += '</g>';
      continue;
    }
    if (s.type === 'raw') {
      let rawContent = s.raw;
      if (styleName === 'outline') {
        rawContent = `<g filter="grayscale(100%) contrast(300%)">${rawContent}</g>`;
      } else if (styleName === 'silhouette') {
        rawContent = `<g filter="brightness(0) opacity(0.85)">${rawContent}</g>`;
      }
      out += s.transform ? `<g transform="${s.transform}">${rawContent}</g>` : rawContent;
      continue;
    }
    const a = st.shape(s, c);
    if (!a) continue;
    out += `<${s.type}${attrs({ ...s.attrs, ...a, transform: s.transform })}/>`;
  }
  return out;
}

/** Wraps markup in the style's group (round joins + optional filter) and returns defs. */
export function styleWrap(styleName, uid, inner, fx = {}) {
  const st = getStyle(styleName);
  const filter = st.filter ? ` filter="url(#${uid}-${st.filter})"` : '';
  return {
    defs: st.defs ? st.defs(uid, fx) : '',
    g: `<g stroke-linecap="round" stroke-linejoin="round"${filter}>${inner}</g>`,
  };
}

export function svgDoc({ width, height, viewBox, defs = '', content, title }) {
  const animDefs = defs.includes('pgWalkLegL') ? '' : `<style id="pg-animation-styles"><![CDATA[${ANIMATION_CSS}]]></style>`;
  const allDefs = (defs || '') + animDefs;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width)}" height="${Math.round(height)}" viewBox="${viewBox}">` +
    (title ? `<title>${esc(title)}</title>` : '') +
    (allDefs ? `<defs>${allDefs}</defs>` : '') +
    content +
    '</svg>'
  );
}

const ICON_FX = { scale: 1.6, freq: 0.06, blur: 1.1 };

function labelSvg(text, x, y, maxW, baseSize, color, weight = 700) {
  const size = Math.max(7, Math.min(baseSize, (maxW / (text.length * 0.56))));
  return `<text x="${x}" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="${fmt(size)}" font-weight="${weight}" fill="${color}">${esc(text)}</text>`;
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Single icon. opts: { style, size, color, colors, seed, vary, label (true|string), background }
 */
export function renderIcon(id, opts = {}) {
  const { style = 'flat', size = 256, label = false, background } = opts;
  const c = lookup(id);
  const st = getStyle(style);
  const uid = newUid();
  const w = styleWrap(style, uid, shapesToSvg(drawConcept(c, opts), style), ICON_FX);
  const text = label === true ? c.label : label || '';
  const H = text ? 122 : 100;
  const bg = background ?? st.background;
  let content = bg ? `<rect width="100" height="${H}" rx="12" fill="${bg}"/>` : '';
  content += w.g;
  if (text) content += labelSvg(text, 50, 114, 94, 13, st.text || INK);
  return svgDoc({ width: size, height: (size * H) / 100, viewBox: `0 0 100 ${H}`, defs: w.defs, content, title: c.label });
}

/** Flashcard: icon on a tinted rounded card with a big word label (kids learning). */
export function renderCard(id, opts = {}) {
  const { style = 'flat', size = 320 } = opts;
  const c = lookup(id);
  const st = getStyle(style);
  const uid = newUid();
  const main = resolveColor(opts.color) || c.colors[c.colorable || 'main'] || '#90caf9';
  const card = st.card ? st.card(main) : { fill: lighten(main, 0.85), stroke: lighten(main, 0.5) };
  const inner = `<g transform="translate(14 8) scale(0.72)">${shapesToSvg(drawConcept(c, opts), style, { olk: 1.1 })}</g>`;
  const w = styleWrap(style, uid, inner, { scale: 1.3, freq: 0.07, blur: 0.9 });
  const text = typeof opts.label === 'string' ? opts.label : capitalize(c.label);
  const content =
    `<rect x="2" y="2" width="96" height="126" rx="10" fill="${card.fill}" stroke="${card.stroke}" stroke-width="1.5"/>` +
    w.g +
    labelSvg(text, 50, 114, 86, 16, st.text || INK, 800);
  return svgDoc({ width: size, height: (size * 130) / 100, viewBox: '0 0 100 130', defs: w.defs, content, title: c.label });
}

/** Grid sheet of labelled icons. items: [{ id, color, label }] */
export function renderSheet(items, opts = {}) {
  const { style = 'flat', cell = 160, columns } = opts;
  const st = getStyle(style);
  const uid = newUid();
  const n = items.length;
  const cols = Math.max(1, columns || Math.min(n, 4));
  const rows = Math.ceil(n / cols);
  const CW = 100, CH = 122, GAP = 10, PAD = 8;
  const W = PAD * 2 + cols * CW + (cols - 1) * GAP;
  const H = PAD * 2 + rows * CH + (rows - 1) * GAP;
  let icons = '', labels = '';
  items.forEach((it, i) => {
    const x = PAD + (i % cols) * (CW + GAP);
    const y = PAD + Math.floor(i / cols) * (CH + GAP);
    const c = lookup(it.id);
    icons += `<g class="movable-item" data-id="${it.id}" transform="translate(${x} ${y})" style="cursor: grab;">${shapesToSvg(drawConcept(c, { ...opts, ...it, color: it.color }), style)}</g>`;
    const text = it.label === true || it.label === undefined ? c.label : it.label;
    if (text) labels += labelSvg(text, x + 50, y + 114, 94, 13, st.text || INK);
  });
  const w = styleWrap(style, uid, icons, ICON_FX);
  const bg = opts.background ?? st.background;
  const content = (bg ? `<rect width="${W}" height="${H}" rx="12" fill="${bg}"/>` : '') + w.g + labels;
  return svgDoc({ width: (W / 100) * cell, height: (H / 100) * cell, viewBox: `0 0 ${W} ${H}`, defs: w.defs, content });
}

/** Shown when no concept matched. */
export function renderPlaceholder(opts = {}) {
  const { style = 'flat', size = 256 } = opts;
  const st = getStyle(style);
  const bg = st.background || '#eceff1';
  const content = `<rect width="100" height="100" rx="12" fill="${bg}"/><text x="50" y="66" text-anchor="middle" font-family="${FONT}" font-size="48" font-weight="800" fill="${st.text || '#90a4ae'}">?</text>`;
  return svgDoc({ width: size, height: size, viewBox: '0 0 100 100', content });
}
