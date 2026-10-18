// Scene sound in the studio: plays what a scene's SVG says is heard (its <metadata class="pg-sound">,
// made by src/sound.js) with the synthesizer (src/sound-synth.js, served at /js/sound-synth.js), in
// time with the animation; renders it for video export. On by default, switched with the 🔊 button
// (remembered in this browser).

import { pgSound, pgSoundTrack } from './sound-synth.js';

const KEY = 'pictogen.sound.v1';
let enabled = true;
try { enabled = localStorage.getItem(KEY) !== 'off'; } catch { /* storage blocked: on */ }

let ctx = null, master = null, track = null;

function context() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    // Everything through one gain and a gentle compressor, so overlapping voices don't clip
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master = ctx.createGain();
    master.gain.value = 1.2;
    master.connect(comp);
    comp.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** A scene's sound ({ loop, cues }) from its <svg> element, or null */
export function soundOf(svg) {
  const m = svg?.querySelector?.('metadata.pg-sound');
  if (!m) return null;
  try { return JSON.parse(m.textContent); } catch { return null; }
}

/** Stops whatever scene sound is playing */
export function stop() {
  if (track) { track.stop(); track = null; }
}

/** Plays the sound of the scene in `svg` from scene time `from` (seconds), if sound is on */
export function play(svg, from = 0) {
  stop();
  const sound = soundOf(svg);
  if (!enabled || !sound?.cues?.length) return false;
  // Browsers only allow sound once the page has been used (a click, a key)
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return false;
  const ac = context();
  if (!ac) return false;
  track = pgSoundTrack(ac, master, sound, from);
  return true;
}

/** Plays on from where the scene's animation is now (after a pause or a seek) */
export function resume(svg) {
  const anims = svg?.getAnimations?.({ subtree: true }) ?? [];
  const ms = Math.max(0, ...anims.map((a) => Number(a.currentTime) || 0));
  return play(svg, ms / 1000);
}

export const isEnabled = () => enabled;

export function setEnabled(on) {
  enabled = !!on;
  try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch { /* not remembered */ }
  if (!enabled) stop();
}

/**
 * The sound of a whole clip for video export: parts [{ sound, at (s), duration (s) }] mixed into
 * an AudioBuffer of `total` seconds (looping scenes repeat for as long as they are shown).
 */
export async function renderClipSound(parts, total) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OAC || !parts.some((p) => p.sound?.cues?.length)) return null;
  const rate = 44100;
  const oc = new OAC(2, Math.max(1, Math.ceil(total * rate)), rate);
  const comp = oc.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  const bus = oc.createGain();
  bus.gain.value = 1.2;
  bus.connect(comp);
  comp.connect(oc.destination);
  for (const { sound, at, duration } of parts) {
    if (!sound?.cues?.length) continue;
    const loop = sound.loop > 0.5 ? sound.loop : null;
    for (let k = 0; k === 0 || (loop && k * loop < duration); k++) {
      for (const c of sound.cues) {
        const t = (loop ? k * loop : 0) + c.t;
        if (t < duration - 0.05) pgSound(oc, bus, c, at + t);
      }
    }
  }
  return oc.startRendering();
}

window.pictogenSound = { play, resume, stop, isEnabled, setEnabled, soundOf, renderClipSound };
