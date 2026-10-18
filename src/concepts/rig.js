// The shared skeleton: one set of joint names for every figure that moves, so a motion (walk, run,
// jump, wave, wag...) is written once in ANIMATION_CSS (src/core/render.js) and works on any figure
// that names its joints.
//
//   pg-body-torso             everything the legs carry (body, head, tail): bobs, leans, breathes
//   pg-head                   the head, turning at the neck: nods, tilts, glances
//   pg-arm-left / -right      arms, or what stands in for them: wings, flippers, a trunk
//   pg-leg-left / -right      legs in two phases: a person's two legs; a four-legged animal's
//                             diagonal pairs (near front + far hind, far front + near hind), as in a trot
//   pg-leg-front / -hind      which end of a four-legged animal a leg is on (stretched out in a leap)
//   pg-tail                   the tail, turning at its base: sways idly, wags
//   pg-ear                    an ear that twitches or flaps
//   pg-face-eyes / -mouth     blink / talk
//   pg-shin / pg-forearm      inside a leg / arm, turning at the knee / elbow (people in profile)
//
// Joints turn around a pivot in drawing units (d.joint(name, [x, y], fn)); legs without one turn
// around the top centre of their shapes, their hip. The figure's root says what kind of skeleton it
// is, so a motion can differ by kind (a dog gallops, a bird flaps its wings, a fish beats its tail):
//
//   pg-rig pg-rig-person | pg-rig-quadruped | pg-rig-bird | pg-rig-fish   [pg-rig-head-on]
//
// pg-rig-head-on marks a figure seen from the front or back, whose legs step up and down instead
// of swinging. The root also carries the motion class (pg-anim-walk...), so the scene adds no wrapper.

/**
 * Where in its idle cycle a figure starts (a CSS variable on the root, read by the idle glances,
 * tail sways and ear twitches), from its seed: two dogs side by side don't move in unison.
 */
export function idleStyle(p) {
  let h = 2166136261;
  for (const ch of String(p.opts.seed ?? '')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return `--pg-idle: -${((h >>> 0) % 600) / 100}s`;
}

/** Draws a rigged figure: the root group with its skeleton kind and motion. */
export function rigged(d, p, kind, fn, { headOn = false } = {}) {
  const anim = p.opts.animation;
  d.group({ class: `pg-rig pg-rig-${kind}${headOn ? ' pg-rig-head-on' : ''} pg-anim-${anim || 'blink'}`, style: idleStyle(p) }, fn);
}
