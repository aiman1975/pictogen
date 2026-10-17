// Drawing kit handed to every concept's draw(d, p) function.
// Concepts record style-agnostic shapes with semantic kinds and animated limb/feature groups.

const r2 = (n) => Math.round(n * 100) / 100;

export function createKit() {
  const shapes = [];
  const stack = [];

  function add(type, attrs, o = {}, defKind = 'body') {
    const transform = [...stack, o.transform].filter(Boolean).join(' ');
    shapes.push({
      type,
      attrs,
      kind: o.kind || defKind,
      fill: o.fill,
      stroke: o.stroke,
      sw: o.sw,
      opacity: o.opacity,
      transform: transform || undefined,
      class: o.class,
      id: o.id,
      style: o.style,
    });
  }

  const pts = (points) => points.map((p) => `${r2(p[0])},${r2(p[1])}`).join(' ');

  return {
    shapes,
    circle(cx, cy, r, o) { add('circle', { cx, cy, r }, o); },
    ellipse(cx, cy, rx, ry, o) { add('ellipse', { cx, cy, rx, ry }, o); },
    rect(x, y, width, height, o = {}) { add('rect', { x, y, width, height, rx: o.rx }, o); },
    path(d, o) { add('path', { d }, o); },
    poly(points, o) { add('polygon', { points: pts(points) }, o); },
    line(x1, y1, x2, y2, o) { add('line', { x1, y1, x2, y2 }, o, 'line'); },
    polyline(points, o) { add('polyline', { points: pts(points) }, o, 'line'); },
    raw(svgMarkup, o = {}) {
      const transform = [...stack, o.transform].filter(Boolean).join(' ');
      shapes.push({
        type: 'raw',
        raw: svgMarkup,
        kind: o.kind || 'body',
        transform: transform || undefined,
      });
    },
    /**
     * A joint of the skeleton (see src/concepts/rig.js): shapes that turn together around a pivot
     * [x, y] in drawing units (the shoulder of a wing, the base of a tail). Without a pivot, a joint
     * turns around the top centre of its shapes (a leg hanging from its hip).
     */
    joint(cls, pivot, fn) {
      const style = pivot ? `transform-box: view-box; transform-origin: ${pivot[0]}px ${pivot[1]}px` : undefined;
      this.group({ class: cls, style }, fn);
    },
    /** Group shapes with optional CSS classes/animations or geometric transforms. */
    group(transformOrOpts, fn) {
      if (!transformOrOpts) {
        fn();
        return;
      }
      if (typeof transformOrOpts === 'string') {
        stack.push(transformOrOpts);
        try { fn(); } finally { stack.pop(); }
      } else {
        const { class: cls, style, id, transform } = transformOrOpts;
        shapes.push({ type: 'g-start', class: cls, style, id, transform });
        if (transform) stack.push(transform);
        try { fn(); } finally {
          if (transform) stack.pop();
          shapes.push({ type: 'g-end' });
        }
      }
    },
  };
}
