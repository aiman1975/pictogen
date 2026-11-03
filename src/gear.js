// Things a person wears, drawn onto any person (character maker, step 3): a diving mask, an air
// tank, flippers, a helmet, a crown, a cap, headphones, goggles, a backpack, a cape, wings, a scarf,
// a tie, boots. A figure is built from them: "a diver" is a man with a diving mask, an air tank and
// flippers; "a girl with a cape and a crown"; any of your characters can wear them.
//
//   features.gear: ['mask', 'tank', 'flippers', ...]
//
// Each goes where it belongs on the drawing (the rig's joints, src/concepts/rig.js), so it moves with
// the figure: on the head (over the hair), over the eyes, round the neck, on the back (behind the
// body seen from the front, in front of it seen from behind), on the feet. Front, three-quarter,
// side and back views. Drawn with the kit's kinds, so every style draws them its own way.

const r2 = (v) => Math.round(v * 100) / 100;
const INK = '#263238';

/** What can be worn, and where */
export const GEAR = {
  mask: 'eyes', goggles: 'eyes', helmet: 'head', crown: 'head', cap: 'head', headphones: 'head',
  scarf: 'neck', tie: 'neck', tank: 'back', backpack: 'back', cape: 'back', wings: 'back', flippers: 'feet', boots: 'feet',
};
export const GEAR_LIST = Object.keys(GEAR);
/** Ready-made figures built from gear: the word -> who they are and what they wear */
export const GEAR_FIGURES = {
  diver: { id: 'man', gear: ['mask', 'tank', 'flippers'] },
  scuba: { id: 'man', gear: ['mask', 'tank', 'flippers'] },
  snorkeler: { id: 'boy', gear: ['mask', 'flippers'] },
  snorkeller: { id: 'boy', gear: ['mask', 'flippers'] },
  builder: { id: 'man', gear: ['helmet', 'boots'] },
  hiker: { id: 'woman', gear: ['backpack', 'cap', 'boots'] },
  backpacker: { id: 'woman', gear: ['backpack', 'cap', 'boots'] },
  explorer: { id: 'man', gear: ['backpack', 'cap', 'boots'] },
  tourist: { id: 'woman', gear: ['backpack', 'cap'] },
  dj: { id: 'man', gear: ['headphones'] },
  swimmer: { id: 'girl', gear: ['goggles'] },
};

/** A gear list as sent: known items only, each once */
export const cleanGear = (g) => (Array.isArray(g) ? [...new Set(g.filter((x) => GEAR[x]))] : []);

function endOf(shapes, i) {
  let depth = 0;
  for (let j = i; j < shapes.length; j++) {
    if (shapes[j].type === 'g-start') depth++;
    else if (shapes[j].type === 'g-end' && --depth === 0) return j;
  }
  return shapes.length - 1;
}
const groupAt = (shapes, cls, from = 0, to = shapes.length) => {
  const re = new RegExp(`(^|\\s)${cls}(\\s|$)`);
  for (let i = from; i < to; i++) if (shapes[i].type === 'g-start' && re.test(shapes[i].class ?? '')) return [i, endOf(shapes, i)];
  return null;
};
const allGroups = (shapes, cls, from = 0, to = shapes.length) => {
  const out = [];
  for (let i = from; i < to; i++) { const g = groupAt(shapes, cls, i, to); if (!g) break; out.push(g); i = g[1]; }
  return out;
};
const pts = (s) => {
  const a = s.attrs ?? {};
  if (s.type === 'rect') return [[a.x, a.y], [a.x + a.width, a.y + a.height]];
  if (s.type === 'circle') return [[a.cx - a.r, a.cy - a.r], [a.cx + a.r, a.cy + a.r]];
  if (s.type === 'ellipse') return [[a.cx - a.rx, a.cy - a.ry], [a.cx + a.rx, a.cy + a.ry]];
  const n = String(a.d ?? a.points ?? '').match(/-?[\d.]+/g)?.map(Number) ?? [];
  const out = [];
  for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]);
  return out;
};
const bbox = (s) => {
  const p = pts(s);
  if (!p.length) return null;
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
const area = (b) => (b ? (b[2] - b[0]) * (b[3] - b[1]) : 0);

// Shapes, in the kit's form
const P = (d, o) => ({ type: 'path', attrs: { d }, ...o });
const R = (x, y, w, h, o, rx = 0) => ({ type: 'rect', attrs: { x: r2(x), y: r2(y), width: r2(w), height: r2(h), ...(rx ? { rx: r2(rx) } : {}) }, ...o });
const C = (cx, cy, r, o) => ({ type: 'circle', attrs: { cx: r2(cx), cy: r2(cy), r: r2(r) }, ...o });
const E = (cx, cy, rx, ry, o) => ({ type: 'ellipse', attrs: { cx: r2(cx), cy: r2(cy), rx: r2(rx), ry: r2(ry) }, ...o });
const body = (fill) => ({ kind: 'body', fill });
const detail = (fill) => ({ kind: 'detail', fill });
const line = (stroke, sw) => ({ kind: 'line', stroke, sw, fill: 'none' });
const group = (cls, list, extra = {}) => [{ type: 'g-start', class: `pg-gear pg-gear-${cls}`, ...extra }, ...list, { type: 'g-end' }];

/** Where the person is: the head, the eyes, the body, which way it faces */
function measure(shapes) {
  const root = groupAt(shapes, 'pg-rig-person');
  if (!root) return null;
  const box = groupAt(shapes, 'pg-profile', root[0], root[1]) ?? root;
  const head = groupAt(shapes, 'pg-head', box[0], box[1]);
  const torso = groupAt(shapes, 'pg-body-torso', box[0], box[1]);
  if (!head || !torso) return null;
  const circles = shapes.slice(head[0], head[1]).filter((s) => s.type === 'circle' && s.attrs);
  const skull = circles.reduce((a, b) => (!a || b.attrs.r > a.attrs.r ? b : a), null);
  if (!skull) return null;
  const view = shapes[head[0]].data?.view ?? (groupAt(shapes, 'pg-face-eyes', head[0], head[1]) ? 'front' : 'back');
  const eyesG = groupAt(shapes, 'pg-face-eyes', head[0], head[1]);
  const dots = eyesG ? shapes.slice(eyesG[0], eyesG[1]).filter((s) => s.type === 'circle' && s.attrs && s.fill && s.attrs.r >= 1) : [];
  const { cx, cy, r } = skull.attrs;
  // Which way a side view faces: the eye is on that side of the head
  const dir = view === 'side' && dots[0] ? Math.sign(dots[0].attrs.cx - cx) || 1 : 1;
  // The body: the biggest shape in the torso before the head (the shirt or dress)
  const own = shapes.slice(torso[0] + 1, head[0]).filter((s) => s.attrs && s.type !== 'g-start' && s.type !== 'g-end');
  const shirt = own.map(bbox).filter(Boolean).sort((a, b) => area(b) - area(a))[0];
  if (!shirt) return null;
  return { root, box, head, torso, view, dir, cx, cy, r, eyes: dots, eyeT: dots[0]?.transform, shirt };
}

// ---------------------------------------------------------------------------------------------
// The things themselves

function onHead(item, m, main) {
  const { cx, cy, r, view, dir } = m;
  const side = view === 'side';
  if (item === 'helmet') {
    const c = '#fdd835', y = cy - r * 0.22;
    return group('helmet', [
      P(`M${r2(cx - r * 1.08)} ${r2(y)} C${r2(cx - r * 1.08)} ${r2(cy - r * 1.42)} ${r2(cx + r * 1.08)} ${r2(cy - r * 1.42)} ${r2(cx + r * 1.08)} ${r2(y)} Z`, body(c)),
      side ? R(cx - r * 1.1 + (dir > 0 ? r * 0.3 : -r * 0.3), y - 2, r * 2.2, 3.2, body('#f9a825'), 1.5) : R(cx - r * 1.28, y - 2, r * 2.56, 3.4, body('#f9a825'), 1.6),
      R(cx - 1.4, cy - r * 1.18, 2.8, r * 0.95, detail('#f9a825'), 1.2),
    ]);
  }
  if (item === 'crown') {
    const y = cy - r * 0.78, w = r * 0.82, top = y - r * 0.62, c = '#ffc107';
    return group('crown', [
      P(`M${r2(cx - w)} ${r2(y)} L${r2(cx - w)} ${r2(top)} L${r2(cx - w / 2)} ${r2(y - r * 0.32)} L${r2(cx)} ${r2(top - 2)} L${r2(cx + w / 2)} ${r2(y - r * 0.32)} L${r2(cx + w)} ${r2(top)} L${r2(cx + w)} ${r2(y)} Z`, body(c)),
      C(cx, y - r * 0.18, 1.5, detail('#e53935')), C(cx - w * 0.6, y - r * 0.15, 1.1, detail('#1e88e5')), C(cx + w * 0.6, y - r * 0.15, 1.1, detail('#43a047')),
    ]);
  }
  if (item === 'cap') {
    const c = main ?? '#1e88e5', y = cy - r * 0.35;
    const brim = side ? E(cx + dir * r * 1.05, y + 0.5, r * 0.65, 2.2, body(c)) : view === 'back' ? null : E(cx, y + 1, r * 1.0, 2.6, body(c));
    return group('cap', [
      P(`M${r2(cx - r * 1.02)} ${r2(y)} C${r2(cx - r * 1.02)} ${r2(cy - r * 1.3)} ${r2(cx + r * 1.02)} ${r2(cy - r * 1.3)} ${r2(cx + r * 1.02)} ${r2(y)} Z`, body(c)),
      ...(brim ? [brim] : []),
      C(cx, cy - r * 1.08, 1.4, detail(c)),
    ]);
  }
  if (item === 'headphones') {
    const band = P(`M${r2(cx - r * 1.02)} ${r2(cy)} C${r2(cx - r * 1.1)} ${r2(cy - r * 1.5)} ${r2(cx + r * 1.1)} ${r2(cy - r * 1.5)} ${r2(cx + r * 1.02)} ${r2(cy)}`, line('#37474f', 2.6));
    if (side) return group('headphones', [P(`M${r2(cx - dir * r * 0.2)} ${r2(cy - r * 1.05)} L${r2(cx - dir * r * 0.2)} ${r2(cy)}`, line('#37474f', 2.6)), E(cx - dir * r * 0.2, cy + 1, r * 0.32, r * 0.42, body('#e53935'))]);
    return group('headphones', [band, E(cx - r * 1.02, cy + 1, r * 0.22, r * 0.38, body('#e53935')), E(cx + r * 1.02, cy + 1, r * 0.22, r * 0.38, body('#e53935'))]);
  }
  return [];
}

function onEyes(item, m) {
  const { cx, cy, r, view, dir, eyes } = m;
  if (view === 'back') {
    // (seen from behind: just the strap round the head)
    return group(item, [P(`M${r2(cx - r)} ${r2(cy - 1)} Q${r2(cx)} ${r2(cy + 1.5)} ${r2(cx + r)} ${r2(cy - 1)}`, line('#263238', 2.4))]);
  }
  const pair = [...eyes].sort((a, b) => b.attrs.r - a.attrs.r).slice(0, view === 'side' ? 1 : 2);
  if (!pair.length) return [];
  const ey = pair.reduce((s, d) => s + d.attrs.cy, 0) / pair.length;
  const t = m.eyeT ? { transform: m.eyeT } : {};
  if (view === 'side') {
    const ex = pair[0].attrs.cx;
    const glass = P(`M${r2(ex - dir * 4)} ${r2(ey - 4.5)} L${r2(ex + dir * 5.5)} ${r2(ey - 4)} L${r2(ex + dir * 5.5)} ${r2(ey + 4.5)} L${r2(ex - dir * 4)} ${r2(ey + 4.5)} Z`, { kind: 'detail', fill: '#81d4fa', opacity: 0.6, stroke: INK, sw: 1.4 });
    const strap = P(`M${r2(ex - dir * 4)} ${r2(ey)} L${r2(cx - dir * r)} ${r2(ey - 1)}`, line(INK, 2.2));
    const extra = item === 'mask' ? [P(`M${r2(cx - dir * r * 0.4)} ${r2(ey + 2)} L${r2(cx - dir * r * 0.4)} ${r2(cy - r * 1.35)} q0 -3 ${r2(dir * 3)} -3`, line('#ff7043', 2.4))] : [];
    return group(item, [strap, glass, ...extra]);
  }
  const xs = pair.map((d) => d.attrs.cx).sort((a, b) => a - b);
  const fx = (xs[0] + xs[xs.length - 1]) / 2, es = xs.length > 1 ? (xs[1] - xs[0]) / 2 : 5.5;
  const strap = P(`M${r2(cx - r)} ${r2(ey - 0.5)} L${r2(fx - es - 3)} ${r2(ey - 0.5)} M${r2(fx + es + 3)} ${r2(ey - 0.5)} L${r2(cx + r)} ${r2(ey - 0.5)}`, line(INK, 2.2));
  if (item === 'goggles') {
    const lens = (x) => C(x, ey, es * 0.62, { kind: 'detail', fill: '#4fc3f7', opacity: 0.65, stroke: INK, sw: 1.4 });
    return group('goggles', [strap, lens(fx - es), lens(fx + es), P(`M${r2(fx - es * 0.38)} ${r2(ey)} L${r2(fx + es * 0.38)} ${r2(ey)}`, line(INK, 1.4))], t);
  }
  // A diving mask: one wide glass over both eyes and the nose, and a snorkel up the side
  const w = es + 4.2;
  const glass = P(`M${r2(fx - w)} ${r2(ey - 4)} Q${r2(fx)} ${r2(ey - 6.2)} ${r2(fx + w)} ${r2(ey - 4)} L${r2(fx + w)} ${r2(ey + 3)} Q${r2(fx + w * 0.4)} ${r2(ey + 4.6)} ${r2(fx)} ${r2(ey + 6.4)} Q${r2(fx - w * 0.4)} ${r2(ey + 4.6)} ${r2(fx - w)} ${r2(ey + 3)} Z`,
    { kind: 'detail', fill: '#81d4fa', opacity: 0.55, stroke: INK, sw: 1.6 });
  const shine = P(`M${r2(fx - w + 2)} ${r2(ey - 2.5)} L${r2(fx - w + 4.5)} ${r2(ey - 3.4)}`, line('#ffffff', 1.2));
  const sx = cx + r * 0.98;
  const snorkel = P(`M${r2(fx + w * 0.4)} ${r2(ey + 7)} Q${r2(sx)} ${r2(ey + 8)} ${r2(sx)} ${r2(ey + 2)} L${r2(sx)} ${r2(cy - r * 1.3)}`, line('#ff7043', 2.6));
  return group('mask', [strap, ...group('snorkel', [snorkel]), glass, shine], t);
}

function onNeck(item, m) {
  const [x0, y0, x1] = m.shirt;
  const cx = m.view === 'side' ? (x0 + x1) / 2 + m.dir * 1.5 : (x0 + x1) / 2;
  if (item === 'scarf') {
    const c = '#e53935', w = m.view === 'side' ? 6 : Math.min(11, (x1 - x0) * 0.36);
    return group('scarf', [
      R(cx - w, y0 - 3.2, w * 2, 5.4, body(c), 2.6),
      ...(m.view === 'back' ? [] : [R(cx + (m.view === 'side' ? -m.dir * 5 : w * 0.25), y0 + 1, 4.4, 13, body(c), 1.5),
        R(cx + (m.view === 'side' ? -m.dir * 5 : w * 0.25), y0 + 6, 4.4, 2, detail('#ffffff'))]),
    ]);
  }
  if (item === 'tie' && m.view !== 'back' && m.view !== 'side') {
    const c = '#1565c0';
    return group('tie', [
      P(`M${r2(cx - 2)} ${r2(y0 - 0.5)} L${r2(cx + 2)} ${r2(y0 - 0.5)} L${r2(cx + 1.4)} ${r2(y0 + 2.8)} L${r2(cx - 1.4)} ${r2(y0 + 2.8)} Z`, body(darkenTie(c))),
      P(`M${r2(cx - 1.4)} ${r2(y0 + 2.8)} L${r2(cx + 1.4)} ${r2(y0 + 2.8)} L${r2(cx + 2.8)} ${r2(y0 + 15)} L${r2(cx)} ${r2(y0 + 18)} L${r2(cx - 2.8)} ${r2(y0 + 15)} Z`, body(c)),
    ]);
  }
  return [];
}
const darkenTie = () => '#0d47a1';

/** On the back: [behind the body, in front of it] */
function onBack(item, m) {
  const [x0, y0, x1, y1] = m.shirt, h = y1 - y0;
  const view = m.view, back = view === 'back', side = view === 'side';
  const mid = (x0 + x1) / 2;
  // (seen from the side, the back is away from where the figure faces)
  const bx = side ? (m.dir > 0 ? x0 : x1) : mid;
  if (item === 'tank') {
    // (seen from the front it shows over one shoulder, beside the head)
    const w = 11, tx = side ? bx - m.dir * (w / 2 + 1) : back ? mid : mid + (x1 - x0) * 0.36, top = y0 - (back || side ? 9 : 13), len = h * 0.85 + 9;
    const tank = [
      R(tx - w / 2, top, w, len, body('#90a4ae'), w / 2),
      R(tx - w / 2 + 2, top + 3, 2.2, len - 6, { kind: 'highlight', fill: '#ffffff', opacity: 0.45 }, 1),
      R(tx - 2, top - 3.5, 4, 4, detail('#546e7a'), 1),
      R(tx - w / 2, top + len * 0.55, w, 2.4, detail('#455a64')),
    ];
    const straps = back || side ? [] : [R(x0 + (x1 - x0) * 0.22, y0, 2.6, h * 0.6, detail('#37474f'), 1), R(x1 - (x1 - x0) * 0.22 - 2.6, y0, 2.6, h * 0.6, detail('#37474f'), 1)];
    return back ? [[], group('tank', tank)] : [group('tank', tank), straps.length ? group('tank-straps', straps) : []];
  }
  if (item === 'backpack') {
    const c = '#ef6c00', w = side ? 10 : (x1 - x0) * 0.86, px = side ? bx - m.dir * (w / 2 + 0.5) : mid, top = y0 + 1, ph = h * 0.72;
    const pack = [
      R(px - w / 2, top, w, ph, body(c), 3),
      R(px - w * 0.36, top + ph * 0.45, w * 0.72, ph * 0.42, detail('#e65100'), 2),
      R(px - w / 2, top + ph * 0.3, w, 1.6, detail('#bf360c')),
    ];
    const straps = back || side ? [] : [R(x0 + (x1 - x0) * 0.2, y0, 3, h * 0.55, detail(c), 1.2), R(x1 - (x1 - x0) * 0.2 - 3, y0, 3, h * 0.55, detail(c), 1.2)];
    return back ? [[], group('backpack', pack)] : [group('backpack', pack), straps.length ? group('backpack-straps', straps) : []];
  }
  if (item === 'cape') {
    const c = '#c62828', w0 = (x1 - x0) * 0.5, w1 = (x1 - x0) * 0.82, low = Math.min(y1 + h * 0.75, 87);
    const d = side
      ? `M${r2(bx)} ${r2(y0)} Q${r2(bx - m.dir * 10)} ${r2((y0 + low) / 2)} ${r2(bx - m.dir * 16)} ${r2(low)} L${r2(bx - m.dir * 2)} ${r2(low - 2)} Z`
      : `M${r2(mid - w0)} ${r2(y0)} L${r2(mid + w0)} ${r2(y0)} L${r2(mid + w1)} ${r2(low)} Q${r2(mid)} ${r2(low + 3)} ${r2(mid - w1)} ${r2(low)} Z`;
    const cape = group('cape', [P(d, body(c))], { style: `transform-box: view-box; transform-origin: ${r2(side ? bx : mid)}px ${r2(y0)}px;` });
    const clasp = back || side ? [] : group('cape-clasp', [C(mid - w0 * 0.55, y0 + 1, 1.8, detail('#ffc107')), C(mid + w0 * 0.55, y0 + 1, 1.8, detail('#ffc107'))]);
    return back ? [[], cape] : [cape, clasp];
  }
  if (item === 'wings') {
    const y = y0 + h * 0.15, wing = (s) => {
      const ox = side ? bx : mid + s * 3;
      const d = `M${r2(ox)} ${r2(y + 4)} C${r2(ox + s * 10)} ${r2(y - 14)} ${r2(ox + s * 26)} ${r2(y - 16)} ${r2(ox + s * 30)} ${r2(y - 8)} C${r2(ox + s * 24)} ${r2(y - 2)} ${r2(ox + s * 26)} ${r2(y + 4)} ${r2(ox + s * 18)} ${r2(y + 8)} C${r2(ox + s * 14)} ${r2(y + 14)} ${r2(ox + s * 6)} ${r2(y + 12)} ${r2(ox)} ${r2(y + 4)} Z`;
      return group(`wing pg-gear-wing-${s < 0 ? 'left' : 'right'}`, [P(d, { kind: 'body', fill: '#ffffff', stroke: '#b0bec5', sw: 1.2 }),
        P(`M${r2(ox + s * 8)} ${r2(y + 2)} Q${r2(ox + s * 16)} ${r2(y - 4)} ${r2(ox + s * 24)} ${r2(y - 7)}`, line('#cfd8dc', 1.2))],
      { style: `transform-box: view-box; transform-origin: ${r2(ox)}px ${r2(y + 4)}px;` });
    };
    const wings = side ? wing(-m.dir) : [...wing(-1), ...wing(1)];
    return back ? [[], group('wings', wings)] : [group('wings', wings), []];
  }
  return [[], []];
}

function onFoot(item, shoe, m) {
  const { cx, cy, rx, ry } = shoe.attrs;
  const side = m.view === 'side';
  if (item === 'flippers') {
    const c = '#ffb300';
    const d = side
      ? `M${r2(cx - m.dir * rx * 0.6)} ${r2(cy - ry * 0.4)} L${r2(cx + m.dir * (rx + 13))} ${r2(cy + ry * 0.2)} L${r2(cx + m.dir * (rx + 14))} ${r2(cy + ry + 1.2)} L${r2(cx - m.dir * rx * 0.6)} ${r2(cy + ry)} Z`
      : `M${r2(cx - rx * 0.8)} ${r2(cy - ry * 0.3)} L${r2(cx + rx * 0.8)} ${r2(cy - ry * 0.3)} L${r2(cx + rx * 1.35)} ${r2(cy + ry + 3.5)} Q${r2(cx)} ${r2(cy + ry + 1.5)} ${r2(cx - rx * 1.35)} ${r2(cy + ry + 3.5)} Z`;
    return group('flipper', [P(d, body(c)), P(side ? `M${r2(cx + m.dir * rx)} ${r2(cy + ry * 0.4)} L${r2(cx + m.dir * (rx + 11))} ${r2(cy + ry * 0.7)}` : `M${r2(cx)} ${r2(cy)} L${r2(cx)} ${r2(cy + ry + 2)}`, line('#ff8f00', 1))]);
  }
  if (item === 'boots') {
    const c = '#5d4037', w = rx * 1.15;
    return group('boot', [R(cx - w / 2 - (side ? m.dir * rx * 0.25 : 0), cy - ry - 10, w, 11, body(c), 1.5), E(cx, cy, rx * 1.05, ry * 1.05, body(c)), R(cx - rx, cy + ry * 0.55, rx * 2, 1.4, detail('#3e2723'))]);
  }
  return [];
}

/**
 * A person's drawing wearing their gear. part: 'upper' (head, eyes, neck, back: before the body is
 * built, src/looks.js withBody) or 'feet' (after it). main: the clothes' colour (a cap).
 */
export function withGear(shapes, gear, { part = 'upper', main } = {}) {
  const items = cleanGear(gear).filter((g) => (part === 'feet') === (GEAR[g] === 'feet'));
  if (!items.length) return shapes;
  const m = measure(shapes);
  if (!m) return shapes;
  const edits = []; // [index, shapes] inserted before index
  if (part === 'feet') {
    for (const [a, b] of [...allGroups(shapes, 'pg-leg-left', m.box[0], m.box[1]), ...allGroups(shapes, 'pg-leg-right', m.box[0], m.box[1])]) {
      const ellipses = shapes.slice(a, b + 1).map((s, k) => [s, a + k]).filter(([s]) => s.type === 'ellipse' && s.attrs);
      const low = ellipses.sort((p, q) => q[0].attrs.cy - p[0].attrs.cy)[0];
      if (!low) continue;
      for (const item of items) edits.push([low[1] + 1, onFoot(item, low[0], m)]);
    }
  } else {
    const headEnd = m.head[1];
    for (const item of items) {
      const where = GEAR[item];
      if (where === 'head') edits.push([headEnd, onHead(item, m, main)]);
      else if (where === 'eyes') edits.push([headEnd, onEyes(item, m)]);
      else if (where === 'neck') edits.push([m.head[0], onNeck(item, m)]);
      else if (where === 'back') {
        const [behind, front] = onBack(item, m);
        // (behind: the first thing drawn in the figure; in front: over the shirt, under the head)
        if (behind.length) edits.push([m.box[0] + 1, behind]);
        if (front.length) edits.push([m.head[0], front]);
      }
    }
  }
  const byIndex = new Map();
  for (const [i, list] of edits) byIndex.set(i, [...(byIndex.get(i) ?? []), ...list]);
  const out = shapes.slice();
  for (const i of [...byIndex.keys()].sort((x, y) => y - x)) out.splice(i, 0, ...byIndex.get(i));
  return out;
}

export const GEAR_CSS = `
/* Gear: a cape sways, wings flap, a snorkel bobs */
@keyframes pgCapeSway { 0%, 100% { transform: skewX(0deg); } 50% { transform: skewX(-6deg); } }
.pg-gear-cape { animation: pgCapeSway 2.4s ease-in-out infinite; }
@keyframes pgWingL { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(14deg); } }
@keyframes pgWingR { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-14deg); } }
.pg-gear-wing-left { animation: pgWingL 1.4s ease-in-out infinite; }
.pg-gear-wing-right { animation: pgWingR 1.4s ease-in-out infinite; }
`;
