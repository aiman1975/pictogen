// Animated GIF encoder (GIF89a), zero dependencies; runs in browsers and in Node.
// Each frame gets its own palette of up to 256 colours (exact for flat illustrations, median cut
// when there are more), and is compressed with GIF's variable-width LZW.

/**
 * encodeGif(frames, { width, height, delayCs, loop }) -> Uint8Array
 *   frames:  RGBA pixel arrays (width * height * 4), e.g. ImageData.data
 *   delayCs: time per frame in hundredths of a second (5 = 20 fps), or (frameIndex) => delay
 *   loop:    0 = forever (default)
 */
export function encodeGif(frames, { width, height, delayCs = 5, loop = 0 }) {
  const out = new ByteWriter();
  out.str('GIF89a');
  out.u16(width); out.u16(height);
  out.byte(0x00); // no global colour table: every frame brings its own
  out.byte(0); out.byte(0);
  // NETSCAPE2.0 application extension: loop count
  out.bytes([0x21, 0xff, 0x0b]); out.str('NETSCAPE2.0'); out.bytes([0x03, 0x01]); out.u16(loop); out.byte(0);

  frames.forEach((rgba, i) => {
    const delay = typeof delayCs === 'function' ? delayCs(i) : delayCs;
    const { palette, indices } = quantize(rgba, width * height);
    const bits = Math.max(2, Math.ceil(Math.log2(palette.length / 3)));
    // Graphic control extension: delay, no transparency, disposal "leave in place"
    out.bytes([0x21, 0xf9, 0x04, 0x04]); out.u16(delay); out.bytes([0x00, 0x00]);
    // Image descriptor with a local colour table of 2^bits entries
    out.byte(0x2c); out.u16(0); out.u16(0); out.u16(width); out.u16(height);
    out.byte(0x80 | (bits - 1));
    const table = new Uint8Array(3 << bits);
    table.set(palette);
    out.bytes(table);
    out.byte(bits);
    lzw(indices, bits, out);
  });
  out.byte(0x3b);
  return out.result();
}

/**
 * Up to 256 colours. Pixels are counted in 15-bit colour buckets; with 256 buckets or fewer each
 * gets its exact average colour (flat illustrations come out pixel-exact), otherwise median cut
 * splits the buckets into 256 boxes of similar weight along their widest channel, and each box
 * becomes one palette colour.
 */
function quantize(rgba, n) {
  const counts = new Uint32Array(32768);
  const sums = new Float64Array(32768 * 3);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const key = ((rgba[p] >> 3) << 10) | ((rgba[p + 1] >> 3) << 5) | (rgba[p + 2] >> 3);
    counts[key]++;
    sums[key * 3] += rgba[p]; sums[key * 3 + 1] += rgba[p + 1]; sums[key * 3 + 2] += rgba[p + 2];
  }
  const used = [];
  for (let k = 0; k < 32768; k++) if (counts[k]) used.push(k);
  const mean = (k, c) => sums[k * 3 + c] / counts[k];

  let boxes = [used];
  // Median cut: split the heaviest box (that can be split) at its weighted median on its widest channel
  while (boxes.length < 256) {
    let pick = -1, best = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      const w = box.reduce((s, k) => s + counts[k], 0);
      if (w > best) { best = w; pick = i; }
    });
    if (pick < 0) break;
    const box = boxes[pick];
    let channel = 0, widest = -1;
    for (let c = 0; c < 3; c++) {
      let lo = 255, hi = 0;
      for (const k of box) { const v = mean(k, c); if (v < lo) lo = v; if (v > hi) hi = v; }
      if (hi - lo > widest) { widest = hi - lo; channel = c; }
    }
    box.sort((a, b) => mean(a, channel) - mean(b, channel));
    let acc = 0, cut = 1;
    for (let i = 0; i < box.length - 1; i++) { acc += counts[box[i]]; if (acc * 2 >= best) { cut = i + 1; break; } cut = i + 1; }
    boxes.splice(pick, 1, box.slice(0, cut), box.slice(cut));
  }

  const palette = new Uint8Array(Math.max(2, boxes.length) * 3);
  const map = new Uint8Array(32768);
  boxes.forEach((box, i) => {
    let w = 0, r = 0, g = 0, b = 0;
    for (const k of box) { w += counts[k]; r += sums[k * 3]; g += sums[k * 3 + 1]; b += sums[k * 3 + 2]; map[k] = i; }
    palette[i * 3] = Math.round(r / w); palette[i * 3 + 1] = Math.round(g / w); palette[i * 3 + 2] = Math.round(b / w);
  });
  const indices = new Uint8Array(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) indices[i] = map[((rgba[p] >> 3) << 10) | ((rgba[p + 1] >> 3) << 5) | (rgba[p + 2] >> 3)];
  return { palette, indices };
}

/** GIF LZW: codes grow from bits+1 up to 12 bits, then the table is cleared. Written in sub-blocks. */
function lzw(indices, minBits, out) {
  const clear = 1 << minBits, end = clear + 1;
  let size = minBits + 1, next = end + 1;
  let table = new Map();
  const blocks = new SubBlocks(out);
  let acc = 0, accBits = 0;
  const emit = (code) => {
    acc |= code << accBits;
    accBits += size;
    while (accBits >= 8) { blocks.push(acc & 0xff); acc >>>= 8; accBits -= 8; }
  };
  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (prefix << 8) | k;
    const code = table.get(key);
    if (code !== undefined) { prefix = code; continue; }
    emit(prefix);
    if (next < 4096) {
      table.set(key, next++);
      if (next > (1 << size) && size < 12) size++;
    } else {
      emit(clear);
      table = new Map();
      size = minBits + 1;
      next = end + 1;
    }
    prefix = k;
  }
  emit(prefix);
  emit(end);
  if (accBits > 0) blocks.push(acc & 0xff);
  blocks.finish();
}

class SubBlocks {
  constructor(out) { this.out = out; this.buf = new Uint8Array(255); this.n = 0; }
  push(b) { this.buf[this.n++] = b; if (this.n === 255) this.flush(); }
  flush() { if (this.n) { this.out.byte(this.n); this.out.bytes(this.buf.subarray(0, this.n)); this.n = 0; } }
  finish() { this.flush(); this.out.byte(0); }
}

class ByteWriter {
  constructor() { this.buf = new Uint8Array(1 << 16); this.n = 0; }
  grow(k) {
    if (this.n + k <= this.buf.length) return;
    const b = new Uint8Array(Math.max(this.buf.length * 2, this.n + k));
    b.set(this.buf.subarray(0, this.n));
    this.buf = b;
  }
  byte(v) { this.grow(1); this.buf[this.n++] = v & 0xff; }
  u16(v) { this.byte(v); this.byte(v >> 8); }
  bytes(arr) { this.grow(arr.length); this.buf.set(arr, this.n); this.n += arr.length; }
  str(s) { for (let i = 0; i < s.length; i++) this.byte(s.charCodeAt(i)); }
  result() { return this.buf.slice(0, this.n); }
}
