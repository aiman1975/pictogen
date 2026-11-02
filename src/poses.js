// Poses made from a finished person drawing, by moving its rig's parts (see src/concepts/rig.js):
// sitting on a seat or on the ground, riding (a bike), and an arm reaching out to hold a hand.
// They work on the drawn shapes (kit.shapes: g-start / g-end markers around each joint), so every
// person and costume gets them without being drawn again; a drawing without the parts they need
// (an emoji person, a stick figure) is left as it is.
//
// Each returns the shapes and, on the array, where the pose puts things in drawing units:
//   seatAt: the height of the seat under the hips (sitting, riding)
//   hipX:   where the hips are across (riding: over the saddle)
//   hand:   the reaching hand [x, y] (reach)

const r2 = (v) => Math.round(v * 100) / 100;
const open = (transform) => ({ type: 'g-start', transform });
const close = () => ({ type: 'g-end' });

/** The person's root group: [start, end] indices, or null */
function root(shapes) {
  const i = shapes.findIndex((s) => s.type === 'g-start' && /\bpg-rig-person\b/.test(s.class ?? ''));
  return i < 0 ? null : [i, endOf(shapes, i)];
}
/** Where the group opened at i closes */
function endOf(shapes, i) {
  let depth = 0;
  for (let j = i; j < shapes.length; j++) {
    if (shapes[j].type === 'g-start') depth++;
    else if (shapes[j].type === 'g-end' && --depth === 0) return j;
  }
  return shapes.length - 1;
}
/** The groups whose class has `cls`, as [start, end] */
function groups(shapes, cls, from = 0, to = shapes.length) {
  const out = [];
  const re = new RegExp(`(^|\\s)${cls}(\\s|$)`);
  for (let i = from; i < to; i++) if (shapes[i].type === 'g-start' && re.test(shapes[i].class ?? '')) out.push([i, endOf(shapes, i)]);
  return out;
}
/** The children of the group [a, b], each as [start, end] (a single shape: [i, i]) */
function children(shapes, [a, b]) {
  const out = [];
  for (let i = a + 1; i < b; i++) {
    const j = shapes[i].type === 'g-start' ? endOf(shapes, i) : i;
    out.push([i, j]);
    i = j;
  }
  return out;
}
const rects = (shapes, [a, b]) => shapes.slice(a, b + 1).filter((s) => s.type === 'rect' && s.attrs);
/** The pivot a joint turns around (its transform-origin), or null */
const pivotOf = (g) => {
  const m = /transform-origin:\s*([\d.-]+)px\s+([\d.-]+)px/.exec(g?.style ?? '');
  return m ? [+m[1], +m[2]] : null;
};
const lowest = (shapes, [a, b]) => Math.max(...shapes.slice(a, b + 1).map((s) => {
  const t = s.attrs ?? {};
  if (s.type === 'rect') return (t.y ?? 0) + (t.height ?? 0);
  if (s.type === 'ellipse') return (t.cy ?? 0) + (t.ry ?? 0);
  if (s.type === 'circle') return (t.cy ?? 0) + (t.r ?? 0);
  return -Infinity;
}));

/** Inserts each edit's shapes before its index (in a copy); edits at one index go in the order given */
const at = (list, edits) => {
  const byIndex = new Map();
  for (const [i, items] of edits) byIndex.set(i, [...(byIndex.get(i) ?? []), ...items]);
  const out = [...list];
  for (const i of [...byIndex.keys()].sort((x, y) => y - x)) out.splice(i, 0, ...byIndex.get(i));
  return out;
};

/**
 * Sitting, seen from the front (or three-quarter): the body lowered over the legs, knees toward us.
 * mode 'seat': on a chair or bench (the shins show below the knees); 'ground': cross-legged.
 */
function sitFront(shapes, mode) {
  const r = root(shapes);
  if (!r) return shapes;
  const legs = groups(shapes, 'pg-leg-(left|right)', r[0], r[1]);
  const legRects = legs.map((g) => rects(shapes, g).sort((a, b) => b.attrs.height - a.attrs.height)[0]).filter(Boolean);
  if (legRects.length !== 2) return shapes;
  const hip = Math.min(...legRects.map((l) => l.attrs.y)), foot = Math.max(...legs.map((g) => lowest(shapes, g)));
  const legH = foot - hip, fill = legRects[0].fill;
  const dy = r2(legH * (mode === 'ground' ? 0.8 : 0.36));
  // Where the body's clothes end (a shirt, or a dress lower down): the knees come out below it
  const torso = groups(shapes, 'pg-body-torso', r[0], r[1])[0];
  const head = torso && groups(shapes, 'pg-head', torso[0], torso[1])[0];
  const own = torso ? shapes.slice(torso[0], torso[1] + 1).filter((_, k) => !head || torso[0] + k < head[0] || torso[0] + k > head[1]) : [];
  const hem = Math.max(hip, lowest(own, [0, own.length - 1]));
  const edits = [];
  // Everything but the legs goes down together (one wrapper per run of parts between the legs)
  let run = null;
  const flush = () => { if (run) { edits.push([run[0], [open(`translate(0 ${dy})`)]], [run[1] + 1, [close()]]); run = null; } };
  for (const [a, b] of children(shapes, r)) {
    const isLeg = legs.some(([la]) => la === a);
    if (isLeg) { flush(); continue; }
    run = run ? [run[0], b] : [a, b];
  }
  flush();
  // (what is in the hands goes down with them)
  for (const [a, b] of groups(shapes, 'pg-held')) if (a > r[1]) edits.push([a, [open(`translate(0 ${dy})`)]], [b + 1, [close()]]);
  // The knees (thighs toward us), on top; on the ground the legs crossed in front instead
  const cxs = legRects.map((l) => l.attrs.x + l.attrs.width / 2).sort((a, b) => a - b);
  const w = legRects[0].attrs.width;
  const lap = mode === 'ground'
    ? [
      { type: 'ellipse', attrs: { cx: r2(cxs[0] - w * 0.4), cy: r2(hip + dy + w * 0.3), rx: r2(w * 1.55), ry: r2(w * 0.62) }, kind: 'body', fill },
      { type: 'ellipse', attrs: { cx: r2(cxs[1] + w * 0.4), cy: r2(hip + dy + w * 0.3), rx: r2(w * 1.55), ry: r2(w * 0.62) }, kind: 'body', fill },
    ]
    : cxs.map((x) => ({ type: 'ellipse', attrs: { cx: r2(x), cy: r2(hem + dy + w * 0.12), rx: r2(w * 0.74), ry: r2(w * 0.58) }, kind: 'body', fill }));
  edits.push([r[1], lap]);
  let out = at(shapes, edits);
  // Cross-legged: the shins and shoes tucked away under the knees
  if (mode === 'ground') {
    const lr = root(out);
    for (const [a, b] of groups(out, 'pg-leg-(left|right)', lr[0], lr[1]).reverse()) out = [...out.slice(0, a), ...out.slice(b + 1)];
  }
  out.seatAt = mode === 'ground' ? foot : hip + dy;
  return out;
}

/**
 * Sitting or riding in profile (facing right): thighs forward from the hips, shins down from the
 * knees (riding: reaching for the pedals), the whole figure lowered so the feet stay down; riding,
 * the arms reach forward for the handlebar.
 */
function sitSide(shapes, mode) {
  const r = root(shapes);
  if (!r) return shapes;
  const legs = groups(shapes, 'pg-leg-(left|right)', r[0], r[1]);
  if (legs.length !== 2) return shapes;
  const hip = pivotOf(shapes[legs[0][0]]);
  const shin = groups(shapes, 'pg-shin', legs[0][0], legs[0][1])[0];
  const knee = shin && pivotOf(shapes[shin[0]]);
  if (!hip || !knee) return shapes;
  const thigh = knee[1] - hip[1];
  const ride = mode === 'ride';
  const edits = [];
  legs.forEach(([a, b], i) => {
    // (riding, the far leg is further round: one pedal up, one down)
    const up = ride ? (i ? -42 : -68) : -88, down = ride ? (i ? 62 : 96) : 88;
    edits.push([a + 1, [open(`rotate(${up} ${hip[0]} ${hip[1]})`)]], [b, [close()]]);
    const s = groups(shapes, 'pg-shin', a, b)[0];
    if (s) edits.push([s[0] + 1, [open(`rotate(${down} ${knee[0]} ${knee[1]})`)]], [s[1], [close()]]);
  });
  if (ride) {
    for (const [a, b] of groups(shapes, 'pg-arm-(left|right)', r[0], r[1])) {
      const sh = pivotOf(shapes[a]);
      if (!sh) continue;
      edits.push([a + 1, [open(`rotate(-62 ${sh[0]} ${sh[1]})`)]], [b, [close()]]);
      // (the forearm straight on: hands on the handlebar)
      const fore = groups(shapes, 'pg-forearm', a, b)[0];
      if (fore) {
        const e = pivotOf(shapes[fore[0]]);
        if (e) edits.push([fore[0] + 1, [open(`rotate(-18 ${e[0]} ${e[1]})`)]], [fore[1], [close()]]);
      }
    }
  }
  // Lowered by the thigh's length (sitting: the feet back on the ground)
  const drop = ride ? 0 : r2(thigh);
  edits.push([r[0] + 1, [open(`translate(0 ${drop})`)]], [r[1], [close()]]);
  const out = at(shapes, edits);
  out.seatAt = hip[1] + drop;
  out.hipX = hip[0];
  return out;
}

/**
 * Sits a person drawing down: mode 'seat' (a chair, a bench, a sofa), 'ground', or 'ride' (in
 * profile, on a bike). view: the drawing's view ('side' is drawn in profile).
 */
export function seatPose(shapes, { mode = 'seat', view } = {}) {
  if (view === 'side' || mode === 'ride') return sitSide(shapes, mode);
  return sitFront(shapes, mode === 'ground' ? 'ground' : 'seat');
}

/**
 * One arm reaching out sideways, to hold someone's hand: side 'left' or 'right' (of the drawing),
 * raised by `angle` degrees. Returns the shapes, with .hand: where that hand is now.
 */
export function reachPose(shapes, { side = 'right', angle = 32 } = {}) {
  const r = root(shapes);
  if (!r) return shapes;
  const arm = groups(shapes, `pg-arm-${side}`, r[0], r[1])[0];
  if (!arm) return shapes;
  const limb = rects(shapes, arm).sort((a, b) => b.attrs.height - a.attrs.height)[0];
  if (!limb) return shapes;
  const { x, y, width, height } = limb.attrs;
  const sh = [x + width / 2, y + 1];
  // (the arm's own tilt, if it has one, and the turn outward on top of it)
  const tilt = +(/rotate\(([-\d.]+)/.exec(limb.transform ?? '')?.[1] ?? 0);
  const turn = side === 'right' ? -angle : angle;
  const a = ((tilt + turn) * Math.PI) / 180;
  const len = height - width / 2;
  const out = at(shapes, [[arm[0] + 1, [open(`rotate(${turn} ${r2(sh[0])} ${r2(sh[1])})`)]], [arm[1], [close()]]]);
  out.hand = [r2(sh[0] - Math.sin(a) * len), r2(sh[1] + Math.cos(a) * len)];
  out.handFill = limb.fill;
  return out;
}
