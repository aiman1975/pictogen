// The camera director: which shots a scene gets, from what the scene is (who speaks when, its
// mood, whether its place is new, whether it ends the clip), or as chosen on the studio's scene card.
// It gives camera keys like src/scene.js cameraKeys ({ t, z, fx, fy, ease }: zoom z, looking at
// fx, fy), played by cameraCss; or null to leave the scene to its mood's slow camera.
//
// Shots (opts.shot):
//   auto            the director decides (below)
//   steady          no camera move at all
//   wide            the whole scene, still
//   close:<id>      close on someone (after a moment wide)
//   follow:<id>     following someone as they move
//   push / pull     slowly in to the main figure / back out from it
//   pan-right / pan-left   across the scene
//   low / high      the camera low (the horizon drops, figures loom) or high (the horizon rises,
//                   figures look small): drawn so by the scene itself, see SHOT_ANGLES
//   shake           a jolt as the scene starts
// The director, on its own:
//   - a new place: wide first (at least SETTLE seconds) so we see where we are
//   - someone speaks: close on them while they speak (their bubble in the frame), then back; when
//     someone stands so near that the close shot would cut them in half, both stay in the frame
//   - two or more speak: a two-shot that frames them all; in a crowd (four or more) it stays wide
//   - a tense scene with no words: pushing in on its main figure
//   - the clip's last scene: pulling back to the wide shot
//   - a crash, a bang, thunder: a shake as the scene starts
//   - otherwise, with no mood of its own: a gentle ease in or out (wide first at a new place)
//   - and first, someone walking a long way before anyone speaks: the camera goes along with them

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r2 = (v) => Math.round(v * 100) / 100;
const SETTLE = 1.2; // seconds wide at a new place before the first close shot
const MAX_Z = 1.6; // never closer than this on its own
export const SHOTS = ['auto', 'steady', 'wide', 'close', 'follow', 'push', 'pull', 'pan-right', 'pan-left', 'low', 'high', 'shake'];
/** How a camera angle draws the scene: the horizon's height (share of H) and the figures' size */
export const SHOT_ANGLES = { low: { horizon: 0.8, scale: 1.14 }, high: { horizon: 0.42, scale: 0.82 } };
const SHAKE_WORDS = /\b(crash|crashed|crashes|boom|bang|banged|explosion|exploded|earthquake|thunder|smash|smashed|slam|slammed)\b/i;

/** A shot as chosen: { kind, target } or null for auto */
export function shotChoice(value) {
  const [kind, ...rest] = String(value ?? '').split(':');
  return SHOTS.includes(kind) && kind !== 'auto' ? { kind, target: rest.join(':') || null } : null;
}

/**
 * The scene's shots.
 *   T: its length; W, H: its size
 *   where(id, t): { x, y, h } of someone or something at time t (y: the middle of its upper half)
 *   main: the id of its main figure, or null
 *   speeches: [{ who (id), start, end }] what is said, in the bubbles
 *   mood, text: its mood and words; context: { first, last, newPlace } in a clip
 *   shot: the shot chosen ({ kind, target }) or null
 *   others: the ids of everyone else in it (people, animals, creatures)
 * Returns { keys, says } (says: what the shots are, for the scene card) or null.
 */
export function directShots({ T, W, H, where, main = null, speeches = [], mood = null, text = '', context = {}, shot = null, crowd = 1, keepTop = null, others = [] }) {
  const wide = { z: 1, fx: W / 2, fy: H / 2 };
  const key = (t, s, ease = 'ease-in-out') => ({ t: r2(clamp(t, 0, T)), z: r2(s.z), fx: r2(s.fx), fy: r2(s.fy), ease });
  // Close on someone, their bubble (above their head, as tall as its lines) and most of them in the frame
  const bubble = (text) => (text ? H * (0.06 + 0.075 * Math.min(4, Math.ceil(String(text).length / 24))) : H * 0.05);
  const close = (id, t, zMax = MAX_Z, text = null) => {
    const f = id && where(id, t);
    if (!f) return null;
    const top = Math.min(f.y - f.h * 0.5 - bubble(text) - H * 0.05, keepTop ?? Infinity), bottom = f.y + f.h * 0.55;
    const z = clamp(H / Math.max(1, bottom - top), 1.15, zMax);
    return { z, fx: f.x, fy: (top + bottom) / 2 };
  };
  // Several at once: all of them in the frame
  const longest = speeches.reduce((a, sp) => (String(sp.text ?? '').length > String(a ?? '').length ? sp.text : a), null);
  const together = (ids, t) => {
    const fs = ids.map((id) => where(id, t)).filter(Boolean);
    if (fs.length < 2) return close(ids[0], t);
    const left = Math.min(...fs.map((f) => f.x - f.h * 0.4)), right = Math.max(...fs.map((f) => f.x + f.h * 0.4));
    const top = Math.min(...fs.map((f) => f.y - f.h * 0.5)) - bubble(longest) - H * 0.05, bottom = Math.max(...fs.map((f) => f.y + f.h * 0.55));
    const z = clamp(Math.min(W / Math.max(1, right - left), H / Math.max(1, bottom - top)), 1, 1.4);
    return { z, fx: (left + right) / 2, fy: (top + bottom) / 2 };
  };
  const hold = (s) => [key(0, s), key(T, s, 'linear')];
  // (a close shot that would cut someone standing near in half: them in the frame too)
  const withNear = (id, t, at) => {
    if (!at) return at;
    const half = W / at.z / 2;
    const near = others.filter((o) => o !== id).filter((o) => {
      const f = where(o, t);
      return f && Math.abs(f.x - at.fx) < half + f.h * 0.4;
    });
    return near.length ? together([id, ...near], t) : at;
  };
  const kind = shot?.kind;

  // Chosen on the card
  if (kind === 'steady') return { keys: null, says: 'steady' };
  if (kind === 'wide' || kind === 'low' || kind === 'high') return { keys: hold(wide), says: kind === 'wide' ? 'wide' : `${kind} angle` };
  if (kind === 'close') {
    const target = shot.target || main, at = close(target, Math.min(T, 1.2));
    return at ? { keys: [key(0, wide), key(0.4, wide), key(1.3, at), key(T, at, 'linear')], says: 'close', target } : { keys: hold(wide), says: 'wide' };
  }
  if (kind === 'push' || kind === 'pull') {
    const at = close(main, T / 2, 1.4) ?? { z: 1.35, fx: W / 2, fy: H * 0.55 };
    const [a, b] = kind === 'push' ? [wide, at] : [at, wide];
    return { keys: [key(0, a), key(T, b)], says: kind === 'push' ? 'pushing in' : 'pulling back' };
  }
  if (kind === 'pan-right' || kind === 'pan-left') {
    const z = 1.4, y = H * 0.55, [x0, x1] = kind === 'pan-right' ? [W * 0.2, W * 0.8] : [W * 0.8, W * 0.2];
    return { keys: [key(0, { z, fx: x0, fy: y }), key(T, { z, fx: x1, fy: y })], says: kind === 'pan-right' ? 'panning right' : 'panning left' };
  }
  if (kind === 'shake') return { keys: hold(wide), says: 'a shake', shake: true };
  if (kind === 'follow') return { keys: null, says: 'following', follow: shot.target || main };

  // Auto: the director's own shots, then (if someone walks a long way first) the camera going along
  const own = auto();
  const pan = walkPan();
  if (!pan) return own;
  const after = (own?.keys ?? []).filter((k) => k.t > pan.t1 + 0.6);
  const keys = [...pan.keys, ...(after.length ? after : [key(Math.min(T, pan.t1 + 1.2), wide), key(T, wide, 'linear')])];
  return { ...(own ?? {}), keys, says: own?.says ? `going along with the walk, then ${own.says}` : 'going along with the walk' };

  // Someone walking a long way across the scene before anyone speaks: a little closer, the camera
  // going along with them (the place moves past), wide again after
  function walkPan() {
    if (crowd >= 4 || T < 2.5) return null;
    const firstWords = speeches.filter((sp) => sp.who && sp.end > sp.start).reduce((a, sp) => Math.min(a, sp.start), T);
    let best = null;
    for (const id of [...new Set([main, ...others].filter(Boolean))]) {
      let seg = null;
      for (let t = 0; t <= Math.min(T, firstWords) + 1e-6; t += 0.1) {
        const a = where(id, t), b = where(id, t + 0.1);
        const moving = a && b && Math.abs(b.x - a.x) > W * 0.004;
        if (moving && !seg) seg = { id, t0: t, x0: a.x };
        if (seg && (!moving || t + 0.1 > Math.min(T, firstWords))) {
          seg.t1 = t; seg.x1 = a?.x ?? seg.x0;
          if (Math.abs(seg.x1 - seg.x0) > W * 0.35 && (!best || Math.abs(seg.x1 - seg.x0) > Math.abs(best.x1 - best.x0))) best = seg;
          seg = null;
        }
      }
    }
    if (!best || best.t1 - best.t0 < 1) return null;
    const z = context.newPlace ? 1.18 : 1.3, half = W / z / 2, halfH = H / z / 2;
    const frame = (t) => {
      const f = where(best.id, t);
      return { z, fx: clamp(f.x, half, W - half), fy: clamp(f.y + f.h * 0.15, halfH, H - halfH) };
    };
    const a = frame(best.t0), b = frame(best.t1), m = frame((best.t0 + best.t1) / 2);
    if (Math.abs(b.fx - a.fx) < W * 0.12) return null;
    return { t1: best.t1, keys: [key(0, a), key(best.t0, a), key((best.t0 + best.t1) / 2, m, 'linear'), key(best.t1, b)] };
  }

  function auto() {
  const settle = context.newPlace ? SETTLE : 0.3;
  const shake = SHAKE_WORDS.test(text);
  const said = speeches.filter((s) => s.who && s.end > s.start).sort((a, b) => a.start - b.start);
  const speakers = [...new Set(said.map((s) => s.who))];
  if (speakers.length >= 2) {
    // A conversation: a two-shot of everyone who speaks, after a moment wide
    const at = together(speakers, said[0].start);
    if (at) {
      const t0 = Math.max(settle, said[0].start - 0.6);
      return { keys: [key(0, wide), key(t0, wide), key(t0 + 0.9, at), key(T, at, 'linear')], says: 'two-shot of who speaks', shake };
    }
  }
  // (a crowd - four or more - stays in view: someone speaking among them doesn't cut the others out)
  if (speakers.length === 1 && crowd >= 4) return { keys: hold(wide), says: 'wide: everyone in view', shake };
  // (a board with words on it: the words and whoever speaks stay in view together)
  if (speakers.length && keepTop != null) return { keys: hold(wide), says: 'wide: the board in view', shake };
  if (speakers.length === 1) {
    // One speaks: close on them while they speak, then back (or stay, if they speak to the end)
    const keys = [key(0, wide)];
    let last = 0;
    for (const s of said) {
      const t0 = Math.max(settle, s.start - 0.5, last), at = withNear(s.who, s.start + 0.2, close(s.who, s.start + 0.2, MAX_Z, s.text));
      if (!at || t0 >= T - 0.6) continue;
      keys.push(key(t0, keys.at(-1)), key(Math.min(T, t0 + 0.8), at));
      const t1 = Math.min(T, s.end + 0.5);
      keys.push(key(t1, at));
      if (t1 + 0.8 < T - 0.3) { keys.push(key(t1 + 0.8, wide)); last = t1 + 0.8; } else last = T;
    }
    if (keys.length > 1) {
      keys.push(key(T, keys.at(-1), 'linear'));
      return { keys, says: 'close on who speaks', shake };
    }
  }
  // (the end, with words on a board: they stay whole on screen)
  if (context.last && context.first !== true && keepTop != null) return { keys: hold(wide), says: 'wide at the end: the board in view', shake };
  if (context.last && context.first !== true) {
    const at = close(main, T / 2, 1.3) ?? { z: 1.25, fx: W / 2, fy: H * 0.55 };
    return { keys: [key(0, at), key(T, wide)], says: 'pulling back at the end', shake };
  }
  if (mood === 'tense') {
    const at = close(main, T, 1.35) ?? { z: 1.25, fx: W / 2, fy: H * 0.55 };
    return { keys: [key(0, wide), key(Math.min(settle, T / 3), wide), key(T, at)], says: 'pushing in (tense)', shake };
  }
  // Nothing else to show and no mood of its own: a gentle move, so a still shot stays alive (at a
  // new place: wide first, then easing in; else in or out, by turns along the clip)
  if (!mood && main && T >= 3) {
    const at = close(main, T / 2, 1.14);
    if (at) {
      const soft = { z: Math.min(at.z, 1.14), fx: at.fx, fy: at.fy };
      if (context.newPlace) return { keys: [key(0, wide), key(Math.min(SETTLE, T / 3), wide), key(T, soft)], says: 'wide, then easing in', shake };
      return (context.index ?? 0) % 2
        ? { keys: [key(0, soft), key(T, wide)], says: 'easing out', shake }
        : { keys: [key(0, wide), key(T, soft)], says: 'easing in', shake };
    }
  }
  return shake ? { keys: hold(wide), says: 'a shake', shake } : null;
  }
}

/** A jolt as the scene starts (CSS for a wrapper), the way a bang or a crash feels */
export function shakeCss(name, T) {
  const pc = (s) => r2((s / T) * 100);
  const jolts = [[0, 0, 0], [0.08, -6, 3], [0.16, 5, -4], [0.24, -4, 2], [0.32, 3, -2], [0.4, -2, 1], [0.5, 0, 0]];
  return `@keyframes ${name} { ${jolts.map(([t, x, y]) => `${pc(t)}% { transform: translate(${x}px, ${y}px); }`).join(' ')} 100% { transform: translate(0, 0); } }`;
}
