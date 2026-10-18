// The sound synthesizer: every voice and effect of a scene's sound (src/sound.js) made from scratch
// with Web Audio (oscillators, noise, filters), so nothing is recorded, licensed or downloaded.
//
// Voices are formant synthesis: a buzzing source (the vocal folds) through three band-pass filters
// tuned to a vowel's resonances (the mouth), its pitch following a little tune: "ooh" swoops,
// "a-ha!" rises, "hmm" hums with the mouth shut, a babble sings one syllable per syllable of the
// words. Children's voices are higher with a smaller mouth (formants scaled up), men's lower.
//
// The functions are self-contained (no imports, no outside names) so the HTML clip export can
// embed their source as is (src/story.js); the studio loads this file at /js/sound-synth.js.

/**
 * Plays one cue ({ s: sound, v?: voice, p?: pitch, d?, n?, m?, x?, g? }, see src/sound.js) into
 * `dest` at time `when` (seconds on ctx's clock). Works with AudioContext and OfflineAudioContext.
 */
export function pgSound(ctx, dest, cue, when) {
  const t0 = Math.max(when, ctx.currentTime);
  const p = cue.p || 1;
  const out = ctx.createGain();
  out.gain.value = 0.8;
  out.connect(dest);
  // White noise (a fixed sequence, so renders are repeatable)
  if (!ctx.__pgNoise) {
    const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    let s = 7;
    for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
    ctx.__pgNoise = b;
  }
  const tiny = 0.0001;
  const env = (param, t, peak, attack, hold, release) => {
    param.setValueAtTime(tiny, t);
    param.linearRampToValueAtTime(peak, t + attack);
    param.setValueAtTime(peak, t + attack + hold);
    param.exponentialRampToValueAtTime(tiny, t + attack + hold + release);
    return t + attack + hold + release;
  };
  const gainAt = (to = out) => { const g = ctx.createGain(); g.gain.value = 0; g.connect(to); return g; };
  const tone = (type, t, end, to) => {
    const o = ctx.createOscillator();
    o.type = type;
    if (to) o.connect(to);
    o.start(t);
    o.stop(end + 0.05);
    return o;
  };
  const noise = (t, end, to) => {
    const n = ctx.createBufferSource();
    n.buffer = ctx.__pgNoise;
    n.loop = true;
    n.connect(to);
    n.start(t, (t * 7.3) % 0.9);
    n.stop(end + 0.05);
    return n;
  };
  const filter = (type, freq, Q, to) => { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = Q; f.connect(to); return f; };
  // A pitch or frequency following points [[fraction of dur, value]]
  const curve = (param, t, dur, points) => {
    param.setValueAtTime(points[0][1], t);
    for (const [f, v] of points.slice(1)) param.linearRampToValueAtTime(v, t + f * dur);
  };

  // ---- Voices --------------------------------------------------------------------------------
  const VOWELS = { a: [730, 1090, 2440], e: [530, 1840, 2480], i: [290, 2250, 2950], y: [290, 2250, 2950], o: [570, 840, 2410], u: [320, 870, 2240], m: [250, 1050, 2250] };
  const VOICES = { kid: { f0: 300, fs: 1.24, vib: 0.03 }, woman: { f0: 215, fs: 1.12, vib: 0.02 }, man: { f0: 118, fs: 1, vib: 0.015 } };
  const voice = VOICES[cue.v] || VOICES.kid;
  // One sung note: { at, dur, pitch: [[f, x f0]], vowels: [[f, vowel]], amp, h (a breath first) }
  const sing = (t, note) => {
    const start = t + note.at, dur = note.dur, end = start + dur;
    const f0 = voice.f0 * p;
    const g = gainAt();
    env(g.gain, start, 0.5 * (note.amp ?? 1), Math.min(0.03, dur / 4), Math.max(0, dur - 0.09), 0.06);
    const hum = note.vowels.every(([, v]) => v === 'm');
    let src;
    if (hum) {
      // The mouth shut: a soft hum through the nose
      const fg = ctx.createGain(); fg.gain.value = 0.6; fg.connect(g);
      src = tone('triangle', start, end, filter('lowpass', 650 * voice.fs, 1.2, fg));
    } else {
      // The mouth open: three resonances of the vowel (band-passes lose most of the level: made up)
      const mouth = [2.2, 1.2, 0.6].map((k, j) => {
        const fg = ctx.createGain(); fg.gain.value = k; fg.connect(g);
        const f = filter('bandpass', 500, 6 + j * 2, fg);
        curve(f.frequency, start, dur, note.vowels.map(([fr, v]) => [fr, VOWELS[v][j] * voice.fs]));
        return f;
      });
      const soft = filter('lowpass', 4200, 0.7, mouth[0]);
      for (const m of mouth.slice(1)) soft.connect(m);
      src = tone('sawtooth', start, end, soft);
    }
    curve(src.frequency, start, dur, note.pitch.map(([fr, k]) => [fr, f0 * k]));
    if (dur > 0.25) {
      // Vibrato on long notes
      const lfo = tone('sine', start, end, null);
      lfo.frequency.value = 5.5;
      const depth = ctx.createGain(); depth.gain.value = f0 * voice.vib;
      lfo.connect(depth); depth.connect(src.frequency);
    }
    if (note.h) {
      // A breath before the note ("h"), or a consonant's tick
      const hg = gainAt();
      const h0 = Math.max(0, start - note.h);
      env(hg.gain, h0, 0.12, 0.01, (start - h0) * 0.5, (start - h0) * 0.5 + 0.001);
      noise(h0, start, filter('bandpass', 2200 * voice.fs, 0.8, hg));
    }
  };
  const vocal = (notes) => notes.forEach((n) => sing(t0, n));
  const MOODS = { happy: 1.12, sad: 0.85, angry: 0.92, surprised: 1.2, neutral: 1 };

  // ---- Effects -------------------------------------------------------------------------------
  const blipTo = (t, type, f1, f2, dur, peak, to = out) => {
    const g = gainAt(to);
    const end = env(g.gain, t, peak, 0.005, 0, dur);
    const o = tone(type, t, end, g);
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    return o;
  };
  const bell = (t, f, peak, decay) => {
    blipTo(t, 'sine', f, f, decay, peak);
    blipTo(t, 'sine', f * 2.76, f * 2.76, decay * 0.4, peak * 0.3);
  };
  const hiss = (t, dur, type, points, Q, peak) => {
    const g = gainAt();
    env(g.gain, t, peak, dur * 0.35, 0, dur * 0.65);
    const f = filter(type, points[0][1], Q, g);
    curve(f.frequency, t, dur, points);
    noise(t, t + dur, f);
    return g;
  };

  switch (cue.s) {
    // Voices
    case 'ooh': vocal([{ at: 0, dur: 0.75, h: 0.05, pitch: [[0, 1], [0.3, 1.55], [1, 0.95]], vowels: [[0, 'u'], [0.5, 'o'], [1, 'u']] }]); break;
    case 'aha': vocal([
      { at: 0, dur: 0.16, pitch: [[0, 1], [1, 1.08]], vowels: [[0, 'a'], [1, 'a']] },
      { at: 0.25, dur: 0.38, h: 0.08, pitch: [[0, 1.4], [1, 1.12]], vowels: [[0, 'a'], [1, 'a']] },
    ]); break;
    case 'hmm': vocal([{ at: 0, dur: 0.85, amp: 0.9, pitch: [[0, 1], [0.35, 0.93], [0.7, 1.06], [1, 0.95]], vowels: [[0, 'm'], [1, 'm']] }]); break;
    case 'hmph': {
      vocal([{ at: 0, dur: 0.2, pitch: [[0, 0.98], [1, 0.84]], vowels: [[0, 'm'], [1, 'm']] }]);
      hiss(t0 + 0.16, 0.14, 'lowpass', [[0, 1400], [1, 600]], 0.7, 0.25);
      break;
    }
    case 'aww': vocal([{ at: 0, dur: 0.8, h: 0.04, pitch: [[0, 1.35], [0.4, 1.18], [1, 0.88]], vowels: [[0, 'a'], [0.6, 'o'], [1, 'o']] }]); break;
    case 'giggle': vocal([1.65, 1.55, 1.5, 1.4, 1.32].map((k, i) => ({ at: i * 0.13, dur: 0.08, h: 0.03, amp: 1 - i * 0.12, pitch: [[0, k], [1, k * 0.94]], vowels: [[0, i % 2 ? 'i' : 'e'], [1, 'i']] }))); break;
    case 'yay': vocal([{ at: 0, dur: 0.6, pitch: [[0, 1.2], [0.45, 1.65], [1, 1.45]], vowels: [[0, 'i'], [0.25, 'a'], [0.8, 'e'], [1, 'i']] }]); break;
    case 'hi': vocal([{ at: 0, dur: 0.38, h: 0.07, pitch: [[0, 1.15], [0.5, 1.42], [1, 1.25]], vowels: [[0, 'e'], [0.6, 'e'], [1, 'i']] }]); break;
    case 'babble': {
      // One sung syllable per syllable of the words: a wandering tune, "?" lifting the sentence's
      // end, "!" lifting all of it
      const notes = cue.n || [];
      notes.forEach(([at, dur, v, mark], i) => {
        const nextAt = notes[i + 1]?.[0];
        const lastOfSentence = nextAt === undefined || nextAt - (at + dur) > 0.3 || notes[i + 1][3] !== mark;
        const wander = 1 + (((i * 7919 + Math.round(at * 1000)) % 23) / 23 - 0.5) * 0.22;
        const lift = mark === '!' ? 1.12 : 1;
        const end = mark === '?' && lastOfSentence ? 1.35 : lastOfSentence ? 0.9 : 1;
        sing(t0, { at, dur: Math.max(0.07, dur), h: 0.018, amp: mark === '!' ? 1 : 0.85, pitch: [[0, wander * lift], [1, wander * lift * end]], vowels: [[0, VOWELS[v] ? v : 'e'], [1, VOWELS[v] ? v : 'e']] });
      });
      break;
    }
    case 'snore': {
      // "zzz": slow breaths in, a buzz out, for as long as it sleeps (up to six)
      const n = Math.max(1, Math.min(6, Math.floor((cue.d || 2) / 1.5)));
      for (let i = 0; i < n; i++) {
        const t = t0 + i * 1.5;
        hiss(t, 0.7, 'bandpass', [[0, 500], [1, 900]], 1.5, 0.12);
        const g = gainAt();
        env(g.gain, t + 0.75, 0.16, 0.15, 0.2, 0.3);
        const o = tone('sawtooth', t + 0.75, t + 1.45, filter('lowpass', 420, 2, g));
        o.frequency.value = 62 * p;
      }
      break;
    }

    // Effects
    case 'pop': blipTo(t0, 'sine', 380, 1500, 0.09, 0.45); hiss(t0, 0.03, 'highpass', [[0, 3000], [1, 3000]], 0.7, 0.2); break;
    case 'boing': {
      const g = gainAt();
      const end = env(g.gain, t0, 0.35, 0.005, 0.05, 0.5);
      const o = tone('triangle', t0, end, g);
      curve(o.frequency, t0, 0.5, [[0, 160], [1, 430]]);
      const lfo = tone('sine', t0, end, null);
      lfo.frequency.value = 15;
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(70, t0);
      depth.gain.exponentialRampToValueAtTime(1, end);
      lfo.connect(depth); depth.connect(o.frequency);
      break;
    }
    case 'whoosh': hiss(t0, 0.5, 'bandpass', [[0, 300], [0.45, 2200], [1, 500]], 1.4, 0.45); break;
    case 'steps': {
      // Soft footsteps for as long as it walks (quicker when it runs)
      const gap = cue.g === 'run' ? 0.19 : 0.36;
      const n = Math.max(1, Math.min(24, Math.floor((cue.d || 1) / gap)));
      for (let i = 0; i < n; i++) {
        const t = t0 + 0.05 + i * gap;
        const peak = cue.g === 'run' ? 0.2 : 0.26;
        blipTo(t, 'sine', i % 2 ? 125 : 105, 55, 0.08, peak);
        hiss(t, 0.05, 'lowpass', [[0, 900], [1, 500]], 0.7, peak * 0.7);
      }
      break;
    }
    case 'jingle': [1047, 1319, 1568, 2093].forEach((f, i) => bell(t0 + i * 0.11, f, 0.16, 0.5)); break;
    case 'ding': bell(t0, 1760, 0.22, 1.1); break;
    case 'blip': blipTo(t0, 'square', 880, 1320, 0.09, 0.25, filter('lowpass', 2500, 0.7, out)); break;
    case 'twinkle': [2637, 3136, 3951].forEach((f, i) => bell(t0 + i * 0.07, f, 0.07, 0.3)); break;
    case 'plop': blipTo(t0, 'sine', 420, 90, 0.14, 0.4); break;
    case 'whirl': hiss(t0, 0.65, 'bandpass', [[0, 400], [1, 3200]], 4, 0.5); blipTo(t0, 'sine', 300, 900, 0.6, 0.06); break;
    case 'flutter': {
      const g = hiss(t0, 0.6, 'bandpass', [[0, 1200], [1, 1600]], 1, 0.35);
      const lfo = tone('square', t0, t0 + 0.6, null);
      lfo.frequency.value = 22;
      const depth = ctx.createGain(); depth.gain.value = 0.15;
      lfo.connect(depth); depth.connect(g.gain);
      break;
    }
    case 'bubble':
    case 'blub': [0, 0.12, 0.21].forEach((at, i) => blipTo(t0 + at, 'sine', 480 + i * 140, 1100 + i * 200, 0.07, 0.25)); break;

    // Animal calls, in a mood (happy higher, sad lower), x times
    default: {
      const k = p * (MOODS[cue.m] || 1);
      const times = cue.x || (cue.s === 'quack' || cue.s === 'woof' || cue.s === 'squawk' ? 2 : 1);
      const call = (t, f0, dur, pitch, vowels, fs, wave = 'sawtooth', amp = 0.4) => {
        const g = gainAt();
        env(g.gain, t, amp, 0.012, Math.max(0, dur - 0.06), 0.05);
        const mouth = [1, 0.6, 0.3].map((q, j) => {
          const fg = ctx.createGain(); fg.gain.value = q; fg.connect(g);
          const f = filter('bandpass', 500, 5, fg);
          curve(f.frequency, t, dur, vowels.map(([fr, v]) => [fr, VOWELS[v][j] * fs]));
          return f;
        });
        const o = tone(wave, t, t + dur, mouth[0]);
        mouth.slice(1).forEach((m) => o.connect(m));
        curve(o.frequency, t, dur, pitch.map(([fr, m]) => [fr, f0 * m]));
        return o;
      };
      for (let i = 0; i < times; i++) {
        if (cue.s === 'woof') {
          const t = t0 + i * 0.24;
          call(t, 300 * k, 0.15, [[0, 1.1], [0.3, 1], [1, 0.6]], [[0, 'a'], [1, 'u']], 0.9, 'sawtooth', 0.55);
          hiss(t, 0.06, 'bandpass', [[0, 900], [1, 600]], 1, 0.3);
        } else if (cue.s === 'meow') {
          call(t0 + i * 0.75, 520 * k, 0.62, [[0, 0.75], [0.35, 1.05], [1, 0.62]], [[0, 'm'], [0.15, 'i'], [0.45, 'a'], [1, 'u']], 1.5, 'sawtooth', 0.4);
        } else if (cue.s === 'tweet') {
          for (let j = 0; j < 3; j++) blipTo(t0 + i * 0.45 + j * 0.1, 'sine', 2600 * k, 3900 * k, 0.07, 0.2);
        } else if (cue.s === 'quack') {
          call(t0 + i * 0.24, 230 * k, 0.17, [[0, 1.1], [1, 0.85]], [[0, 'e'], [1, 'a']], 1.4, 'sawtooth', 0.45);
        } else if (cue.s === 'squeak') {
          blipTo(t0 + i * 0.18, 'sine', 1900 * k, 2500 * k, 0.11, 0.18);
        } else if (cue.s === 'roar') {
          const t = t0 + i * 1.2;
          const o = call(t, 85 * k, 1.1, [[0, 1], [0.3, 1.18], [1, 0.8]], [[0, 'a'], [0.6, 'o'], [1, 'u']], 0.8, 'sawtooth', 0.6);
          const lfo = tone('sine', t, t + 1.1, null);
          lfo.frequency.value = 28;
          const depth = ctx.createGain(); depth.gain.value = 18;
          lfo.connect(depth); depth.connect(o.frequency);
          hiss(t, 1.1, 'lowpass', [[0, 700], [0.3, 1200], [1, 500]], 0.7, 0.25);
        } else if (cue.s === 'trumpet') {
          const t = t0 + i * 0.95;
          const o = call(t, 380 * k, 0.85, [[0, 0.95], [0.25, 1.35], [1, 1.12]], [[0, 'a'], [1, 'a']], 1.3, 'sawtooth', 0.4);
          const lfo = tone('sine', t, t + 0.85, null);
          lfo.frequency.value = 7;
          const depth = ctx.createGain(); depth.gain.value = 14;
          lfo.connect(depth); depth.connect(o.frequency);
        } else if (cue.s === 'squawk') {
          call(t0 + i * 0.3, 520 * k, 0.24, [[0, 1], [0.4, 1.12], [1, 0.9]], [[0, 'e'], [1, 'a']], 1.5, 'sawtooth', 0.4);
        }
      }
    }
  }
}

/**
 * Plays a scene's sound ({ loop, cues }) in time with its animation, from now (scene time `from`
 * seconds, e.g. after a seek), over and over if it loops. Returns { stop() }.
 */
export function pgSoundTrack(ctx, dest, sound, from = 0) {
  const bus = ctx.createGain();
  bus.connect(dest);
  const zero = ctx.currentTime + 0.05 - from; // ctx time of the scene's time 0
  const cues = (sound && sound.cues) || [];
  const loop = sound && sound.loop > 0.5 ? sound.loop : null;
  let until = ctx.currentTime;
  const ahead = () => {
    const to = ctx.currentTime + 0.6;
    const first = loop ? Math.max(0, Math.floor((until - zero) / loop)) : 0;
    const last = loop ? Math.floor((to - zero) / loop) : 0;
    for (let k = first; k <= last; k++) {
      for (const c of cues) {
        const at = zero + k * loop + c.t;
        if (at >= until && at < to) pgSound(ctx, bus, c, at);
      }
    }
    until = to;
  };
  ahead();
  const timer = setInterval(ahead, 200);
  return {
    stop() {
      clearInterval(timer);
      bus.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
      setTimeout(() => bus.disconnect(), 300);
    },
  };
}
