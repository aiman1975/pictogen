// Music and sound effects for the promo video, synthesized from scratch: oscillators, noise and
// filters only, no samples, so there is nothing to license. renderAudio() returns a 16-bit stereo WAV.
//
// Music: 100 BPM, Fmaj7 - G6 - Em7 - Am7 looping, resolving to Cmaj9. Soft pads, a plucked
// arpeggio with echoes, bass, and light drums that "pump" the music (sidechain), with a small
// reverb. Effects: whoosh (slide changes), pop (things appearing), click (typing), ding (a button),
// chime (logo), tick (a story step).

const SR = 44100;
const BEAT = 0.6; // 100 BPM
const BAR = BEAT * 4;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);

const CHORDS = [
  { notes: [53, 57, 60, 64], bass: 41 }, // Fmaj7
  { notes: [55, 59, 62, 64], bass: 43 }, // G6
  { notes: [52, 55, 59, 62], bass: 40 }, // Em7
  { notes: [57, 60, 64, 67], bass: 45 }, // Am7
];
const FINAL = { notes: [48, 52, 55, 59, 62], bass: 36 }; // Cmaj9

// Deterministic noise (the same video every build)
let seed = 12345;
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 31) - 1;

/** RBJ biquad filter, coefficients settable while running (for sweeps). */
class Biquad {
  constructor(type, freq, q = 0.707) { this.type = type; this.x1 = this.x2 = this.y1 = this.y2 = 0; this.set(freq, q); }
  set(freq, q = this.q) {
    this.q = q;
    const w = (2 * Math.PI * Math.min(freq, SR * 0.45)) / SR, cos = Math.cos(w), alpha = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (this.type === 'lowpass') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = b0; }
    else if (this.type === 'highpass') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = b0; }
    else { b0 = alpha; b1 = 0; b2 = -alpha; } // bandpass
    const a0 = 1 + alpha;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = (-2 * cos) / a0; this.a2 = (1 - alpha) / a0;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

class Bus {
  constructor(n) { this.L = new Float32Array(n); this.R = new Float32Array(n); }
  add(i, v, pan = 0) {
    if (i < 0 || i >= this.L.length) return;
    this.L[i] += v * Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2;
    this.R[i] += v * Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2;
  }
}

// ---------------------------------------------------------------------------------------------
// Instruments

/** Soft saw-ish pad voice (a few harmonics, two detuned copies), slow attack and release. */
function pad(bus, t0, dur, freq, gain) {
  const n0 = Math.floor(t0 * SR), att = 0.5, rel = 0.9, len = Math.floor((dur + rel) * SR);
  for (const [det, pan] of [[0.9965, -0.4], [1.0035, 0.4]]) {
    const f = freq * det;
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const env = Math.min(1, t / att) * (t > dur ? Math.exp(-(t - dur) / (rel / 3)) : 1);
      let v = 0;
      for (let h = 1; h <= 5; h++) v += Math.sin(2 * Math.PI * f * h * t) / (h * h * 0.8);
      bus.add(n0 + i, v * env * gain, pan);
    }
  }
}

/** Plucked note: triangle plus a sine an octave up, fast attack, exponential decay. */
function pluck(bus, t0, freq, gain, pan, decay = 0.22) {
  const n0 = Math.floor(t0 * SR), len = Math.floor(decay * 6 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR, ph = (freq * t) % 1;
    const tri = 4 * Math.abs(ph - 0.5) - 1;
    const env = Math.min(1, t / 0.004) * Math.exp(-t / decay);
    bus.add(n0 + i, (tri * 0.7 + Math.sin(4 * Math.PI * freq * t) * 0.3) * env * gain, pan);
  }
}

function bass(bus, t0, freq, gain, len = 0.5) {
  const n0 = Math.floor(t0 * SR), n = Math.floor((len + 0.3) * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.008) * (t < len ? Math.exp(-t / 0.6) : Math.exp(-len / 0.6) * Math.exp(-(t - len) / 0.05));
    const v = Math.tanh(1.6 * (Math.sin(2 * Math.PI * freq * t) + 0.25 * Math.sin(4 * Math.PI * freq * t)));
    bus.add(n0 + i, v * env * gain, 0);
  }
}

function kick(bus, t0, gain) {
  const n0 = Math.floor(t0 * SR), n = Math.floor(0.45 * SR);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (48 + 110 * Math.exp(-t / 0.035)) / SR;
    bus.add(n0 + i, Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.16) * gain, 0);
  }
}

function clap(bus, t0, gain) {
  const n0 = Math.floor(t0 * SR), n = Math.floor(0.25 * SR), bp = new Biquad('bandpass', 1400, 0.9);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // three quick bursts, then a tail
    const env = (t < 0.03 ? (Math.exp(-((t % 0.01) / 0.003))) : Math.exp(-(t - 0.03) / 0.07));
    bus.add(n0 + i, bp.run(noise()) * env * gain * 2.4, 0.1);
  }
}

function hat(bus, t0, gain, pan) {
  const n0 = Math.floor(t0 * SR), n = Math.floor(0.08 * SR), hp = new Biquad('highpass', 7500, 0.8);
  for (let i = 0; i < n; i++) bus.add(n0 + i, hp.run(noise()) * Math.exp(-(i / SR) / 0.018) * gain, pan);
}

// ---------------------------------------------------------------------------------------------
// Effects

function whoosh(bus, t0, gain = 0.3, dur = 0.7) {
  const n0 = Math.floor(t0 * SR), n = Math.floor(dur * SR), bp = new Biquad('bandpass', 400, 1.4);
  for (let i = 0; i < n; i++) {
    const x = i / n;
    if (i % 32 === 0) bp.set(350 * (1 + 10 * Math.sin(x * Math.PI * 0.85)), 1.4);
    const env = Math.sin(Math.PI * Math.min(1, x * 1.15)) ** 2;
    bus.add(n0 + i, bp.run(noise()) * env * gain * 2.2, -0.7 + 1.4 * x);
  }
}

function pop(bus, t0, gain = 0.22, pitch = 1, pan = 0) {
  const n0 = Math.floor(t0 * SR), n = Math.floor(0.12 * SR);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (420 + 900 * Math.min(1, t / 0.05)) * pitch / SR;
    bus.add(n0 + i, Math.sin(2 * Math.PI * ph) * Math.min(1, t / 0.002) * Math.exp(-t / 0.035) * gain, pan);
  }
}

function click(bus, t0, gain = 0.1, pan = 0) {
  const n0 = Math.floor(t0 * SR), n = Math.floor(0.03 * SR), hp = new Biquad('highpass', 2500, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    bus.add(n0 + i, (hp.run(noise()) * 0.8 + Math.sin(2 * Math.PI * 1800 * t) * 0.3) * Math.exp(-t / 0.006) * gain, pan);
  }
}

function chime(bus, t0, base = 1046.5, gain = 0.16) {
  const n0 = Math.floor(t0 * SR), n = Math.floor(3 * SR);
  const partials = [[1, 1, 1.6], [2.0, 0.45, 1.0], [2.76, 0.3, 0.7], [5.4, 0.12, 0.35], [8.93, 0.06, 0.2]];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (const [r, a, d] of partials) v += Math.sin(2 * Math.PI * base * r * t) * a * Math.exp(-t / d);
    bus.add(n0 + i, v * Math.min(1, t / 0.003) * gain, 0);
  }
}

function ding(bus, t0, gain = 0.12) {
  chime(bus, t0, 1568, gain * 0.8);
  chime(bus, t0 + 0.07, 2093, gain * 0.6);
}

const SFX = {
  whoosh: (b, e) => whoosh(b, e.t, e.gain),
  pop: (b, e) => pop(b, e.t, e.gain, e.pitch, e.pan),
  click: (b, e) => click(b, e.t, e.gain, e.pan),
  chime: (b, e) => chime(b, e.t, e.pitch, e.gain),
  ding: (b, e) => ding(b, e.t, e.gain),
  tick: (b, e) => pop(b, e.t, e.gain ?? 0.08, 1.6, e.pan),
};

// ---------------------------------------------------------------------------------------------
// Mixing

/** Small Schroeder reverb (4 combs, 2 allpasses) on a mono send, returned as a stereo pair. */
function reverb(L, R, wet) {
  const n = L.length;
  const outL = new Float32Array(n), outR = new Float32Array(n);
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ d, buf: new Float32Array(d), i: 0, fb: 0.8, lp: 0 }));
  const aps = [225, 556].map((d) => ({ d, buf: new Float32Array(d), i: 0 }));
  for (let k = 0; k < n; k++) {
    const x = (L[k] + R[k]) * 0.5;
    let y = 0;
    for (const c of combs) {
      const o = c.buf[c.i];
      c.lp = o * 0.6 + c.lp * 0.4;
      c.buf[c.i] = x + c.lp * c.fb;
      c.i = (c.i + 1) % c.d;
      y += o;
    }
    for (const a of aps) {
      const o = a.buf[a.i];
      const v = y + o * 0.5;
      a.buf[a.i] = v;
      a.i = (a.i + 1) % a.d;
      y = o - v * 0.5;
    }
    outL[k] = y * wet;
    outR[k] = y * wet * 0.95;
  }
  return [outL, outR];
}

/**
 * renderAudio({ duration, events, groove: [start, end], outro }) -> WAV Buffer
 *   events: [{ t, type: 'whoosh'|'pop'|'click'|'chime'|'ding'|'tick', gain?, pitch?, pan? }]
 *   groove: when the drums and bass play (seconds); outro: when the music resolves to its last chord
 */
export function renderAudio({ duration, events = [], groove = [0, duration], outro = duration - 5 }) {
  const n = Math.ceil((duration + 0.5) * SR);
  const music = new Bus(n), drums = new Bus(n), fx = new Bus(n);
  const kicks = [];

  // Music, bar by bar
  for (let bar = 0; bar * BAR < outro; bar++) {
    const t0 = bar * BAR, chord = CHORDS[bar % 4];
    const inGroove = t0 + BAR > groove[0] && t0 < groove[1];
    for (const m of chord.notes) pad(music, t0, BAR, midi(m), 0.018);
    // Arpeggio in 8ths, an octave up; sparse (quarters) before the groove starts
    const order = [0, 1, 2, 3, 2, 1, 3, 2];
    for (let s = 0; s < 8; s++) {
      const t = t0 + s * (BEAT / 2);
      if (t >= outro) break;
      if (!inGroove && s % 2) continue;
      const f = midi(chord.notes[order[s]] + 12);
      pluck(music, t, f, 0.05, s % 2 ? 0.35 : -0.35);
      pluck(music, t + 0.45, f, 0.018, s % 2 ? -0.5 : 0.5); // echo
    }
    if (!inGroove) continue;
    for (let b = 0; b < 4; b++) {
      const t = t0 + b * BEAT;
      if (t < groove[0] || t >= groove[1]) continue;
      if (b === 0 || b === 2) { kick(drums, t, 0.42); kicks.push(t); bass(music, t, midi(chord.bass), 0.13, 0.5); }
      if (b === 1 || b === 3) clap(drums, t, 0.07);
      if (b === 3) bass(music, t + BEAT / 2, midi(chord.bass + 12), 0.08, 0.2);
      hat(drums, t + BEAT / 2, 0.035, 0.3);
      hat(drums, t, 0.015, -0.3);
    }
  }
  // Outro: the last chord rings out
  for (const m of FINAL.notes) pad(music, outro, duration - outro, midi(m), 0.02);
  bass(music, outro, midi(FINAL.bass), 0.12, 2.5);
  FINAL.notes.forEach((m, i) => pluck(music, outro + i * 0.12, midi(m + 12), 0.05, (i % 2 ? 0.3 : -0.3), 0.6));

  // Sidechain: the music ducks under each kick, which gives the groove its pump
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    let duck = 1;
    for (let j = kicks.length - 1; j >= 0 && t - kicks[j] < 0.4; j--) if (t >= kicks[j]) duck = Math.min(duck, 1 - 0.45 * Math.exp(-(t - kicks[j]) / 0.12));
    music.L[k] *= duck; music.R[k] *= duck;
  }

  for (const e of events) SFX[e.type]?.(fx, e);

  // Reverb on music and effects, master gain, gentle clipping, fades
  const [rmL, rmR] = reverb(music.L, music.R, 0.22);
  const [rfL, rfR] = reverb(fx.L, fx.R, 0.15);
  const L = new Float32Array(n), R = new Float32Array(n);
  let peak = 0;
  for (let k = 0; k < n; k++) {
    L[k] = Math.tanh((music.L[k] + rmL[k]) * 0.95 + drums.L[k] + (fx.L[k] + rfL[k]) * 1.1);
    R[k] = Math.tanh((music.R[k] + rmR[k]) * 0.95 + drums.R[k] + (fx.R[k] + rfR[k]) * 1.1);
    peak = Math.max(peak, Math.abs(L[k]), Math.abs(R[k]));
  }
  const norm = 0.89 / (peak || 1);
  const fadeIn = 0.3 * SR, fadeOut = 2.5 * SR, end = Math.floor(duration * SR);
  const pcm = Buffer.alloc(44 + end * 4);
  for (let k = 0; k < end; k++) {
    const g = norm * Math.min(1, k / fadeIn) * Math.min(1, (end - k) / fadeOut);
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[k] * g)) * 32767), 44 + k * 4);
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[k] * g)) * 32767), 46 + k * 4);
  }
  // WAV header
  pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + end * 4, 4); pcm.write('WAVE', 8);
  pcm.write('fmt ', 12); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22);
  pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34);
  pcm.write('data', 36); pcm.writeUInt32LE(end * 4, 40);
  return pcm;
}
