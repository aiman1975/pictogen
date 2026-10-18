// The sound synthesizer: every voice and effect of a scene's sound (src/sound.js) made from scratch
// with Web Audio (oscillators, noise, filters), so nothing is recorded, licensed or downloaded.
//
// Voices are formant synthesis: a buzzing source (the vocal folds) through three band-pass filters
// tuned to a vowel's resonances (the mouth), its pitch following a little tune: "ooh" swoops,
// "a-ha!" rises, "hmm" hums with the mouth shut, a babble sings one syllable per syllable of the
// words. Children's voices are higher with a smaller mouth (formants scaled up), men's lower.
//
// A sound pack (public/audio/pack, src/sound-pack.js) can replace any of these with recorded or
// generated files: pgSound plays a file from the bank when there is one, else synthesizes. Clips
// get background music per genre (pgMusic*): the pack's loop for the genre, else a synthesized one.
//
// The functions are self-contained (no imports, no outside names but each other) so the HTML clip
// export can embed their source as is (src/story.js); the studio loads this file at
// /js/sound-synth.js.

/**
 * Plays one cue ({ s: sound, v?: voice, p?: pitch, d?, n?, m?, x?, g? }, see src/sound.js) into
 * `dest` at time `when` (seconds on ctx's clock), from the sound pack's `bank` (pgBank) when it has
 * the sound, else synthesized. Works with AudioContext and OfflineAudioContext.
 */
export function pgSound(ctx, dest, cue, when, bank) {
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

  // ---- From the sound pack ----------------------------------------------------------------------
  if (bank) {
    const n = Math.floor(when * 1000);
    // A file at `at`, sped up or slowed down by `rate` (pitch), cut after `dur` if given
    const play = (pick, at, rate, { dur, rateEnd, gain = 1 } = {}) => {
      const src = ctx.createBufferSource();
      src.buffer = pick.buffer;
      src.playbackRate.setValueAtTime(rate, at);
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(g);
      g.connect(out);
      src.start(at);
      if (dur) {
        if (rateEnd) src.playbackRate.linearRampToValueAtTime(rateEnd, at + dur);
        g.gain.setValueAtTime(gain, at + dur);
        g.gain.linearRampToValueAtTime(0, at + dur + 0.05);
        src.stop(at + dur + 0.06);
      }
      return pick.buffer.duration / rate;
    };
    if (cue.s === 'babble') {
      // A syllable file per sung syllable ("ba", "do", "mi"... by vowel), with the babble's tune
      const notes = cue.n || [];
      if (notes.length && bank.pick('syl', cue.v, notes[0][2], 0)) {
        notes.forEach(([at, dur, v, mark], i) => {
          const pick = bank.pick('syl', cue.v, v === 'y' ? 'i' : v, i + n);
          const nextAt = notes[i + 1] ? notes[i + 1][0] : undefined;
          const lastOfSentence = nextAt === undefined || nextAt - (at + dur) > 0.3 || notes[i + 1][3] !== mark;
          const wander = 1 + (((i * 7919 + Math.round(at * 1000)) % 23) / 23 - 0.5) * 0.16;
          const r = pick.rate * p * wander * (mark === '!' ? 1.08 : 1);
          const end = mark === '?' && lastOfSentence ? 1.25 : lastOfSentence ? 0.92 : 1;
          play(pick, t0 + at, r, { dur: Math.max(0.08, Math.min(dur + 0.04, pick.buffer.duration / r)), rateEnd: r * end });
        });
        return;
      }
    } else if (cue.s === 'steps') {
      if (bank.pick('steps', null, null, 0)) {
        const gap = cue.g === 'run' ? 0.19 : 0.36;
        const count = Math.max(1, Math.min(24, Math.floor((cue.d || 1) / gap)));
        for (let i = 0; i < count; i++) play(bank.pick('steps', null, null, i), t0 + 0.05 + i * gap, 1 + (i % 2) * 0.04, { gain: cue.g === 'run' ? 0.8 : 1 });
        return;
      }
    } else {
      const pick = bank.pick(cue.s, cue.v, null, n);
      if (pick) {
        // People's voices at their pitch; animals in a mood (happy higher, sad lower)
        const rate = pick.rate * (cue.v ? p : p * (MOODS[cue.m] || 1));
        // Effects a little under voices and calls (files come levelled to the same peak)
        const gain = cue.v || cue.m ? 1 : 0.6;
        let t = t0;
        const times = cue.s === 'snore' ? Math.max(1, Math.min(6, Math.round((cue.d || 2) / (pick.buffer.duration / rate)))) : cue.x || 1;
        for (let i = 0; i < times; i++) t += play(i ? bank.pick(cue.s, cue.v, null, n + i) || pick : pick, t, rate, { gain }) + 0.04;
        return;
      }
    }
  }

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
 *   opts.bank     the sound pack (pgBank), if any
 *   opts.onVoice  (at, seconds) whenever someone speaks or calls (the music ducks under it)
 */
export function pgSoundTrack(ctx, dest, sound, from = 0, opts = {}) {
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
        if (at >= until && at < to) {
          pgSound(ctx, bus, c, at, opts.bank);
          if (opts.onVoice && pgVoiced(c)) opts.onVoice(at, pgVoiced(c));
        }
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

/** How long a cue is someone's voice (people talking, mooding, animals calling), or 0 */
export function pgVoiced(cue) {
  if (cue.s === 'babble') return (cue.n && cue.n.length ? cue.n[cue.n.length - 1][0] + cue.n[cue.n.length - 1][1] : 1) + 0.2;
  if (cue.v || ['woof', 'meow', 'tweet', 'quack', 'squeak', 'roar', 'trumpet', 'squawk'].includes(cue.s)) return cue.s === 'snore' ? 0 : 0.9;
  return 0;
}

/**
 * A sound pack's files, decoded, ready to play: entries [{ buffer, sound?, voice?, vowel?, music? }]
 * (src/sound-pack.js). pick(sound, voice, vowel, i) chooses a file (the i-th variant, round and
 * round) in the voice asked for, else in the nearest voice pitched to it (a woman's file for a
 * child, up to about half an octave) -> { buffer, rate } or null. music(genre) -> an entry or null.
 */
export function pgBank(entries) {
  const F0 = { kid: 300, woman: 215, man: 118 };
  const NEAR = { kid: ['kid', 'woman', 'man'], woman: ['woman', 'kid', 'man'], man: ['man', 'woman', 'kid'] };
  const by = new Map();
  for (const e of entries || []) {
    if (!e || !e.buffer) continue;
    const key = e.music ? 'music:' + e.music : e.sound;
    if (!by.has(key)) by.set(key, []);
    by.get(key).push(e);
  }
  return {
    size: [...by.values()].reduce((s, l) => s + l.length, 0),
    has: (sound) => by.has(sound),
    pick(sound, voice, vowel, i) {
      const all = by.get(sound);
      if (!all) return null;
      const k = Math.abs(Math.floor(i || 0));
      const choose = (list, rate) => {
        const same = vowel ? list.filter((e) => e.vowel === vowel) : list;
        const from = same.length ? same : list;
        return { buffer: from[k % from.length].buffer, rate };
      };
      if (!voice || !F0[voice]) return choose(all, 1);
      for (const v of NEAR[voice]) {
        const list = all.filter((e) => (e.voice || v) === v);
        const rate = F0[voice] / F0[v];
        if (list.length && rate >= 0.7 && rate <= 1.45) return choose(list, rate);
      }
      return null;
    },
    music: (genre) => (by.get('music:' + genre) || [])[0] || null,
  };
}

/**
 * Synthesized background music for a genre, the notes starting between ctx times t0 and t1 of a
 * song that began at `songStart`: kids (a ukulele strum, glockenspiel, a soft beat), news (a
 * pulsing bass, ticking hats, stabs), documentary (warm pads, a sparse piano, no drums), howto (a
 * marimba, claps). A four-bar chord loop, the tune varying from bar to bar.
 */
export function pgMusicBars(ctx, dest, genre, songStart, t0, t1) {
  const SONGS = {
    kids: { bpm: 108, chords: [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]] },
    news: { bpm: 118, chords: [[45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50]] },
    documentary: { bpm: 66, chords: [[50, 53, 57], [46, 50, 53], [41, 45, 48], [48, 52, 55]] },
    howto: { bpm: 100, chords: [[41, 45, 48], [48, 52, 55], [50, 53, 57], [46, 50, 53]] },
  };
  const song = SONGS[genre] || SONGS.kids;
  const beat = 60 / song.bpm, bar = beat * 4;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const rnd = (x) => (((x * 2654435761) >>> 0) % 1000) / 1000;
  if (!ctx.__pgNoise) {
    const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    let s = 7;
    for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
    ctx.__pgNoise = b;
  }
  // Instruments: each note its own little graph
  const voice = (t, type, f, peak, attack, decay, lp, hold = 0) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    if (hold) g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + decay);
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    let node = o;
    if (lp) { const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp; o.connect(f2); node = f2; }
    node.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + attack + hold + decay + 0.05);
    return o;
  };
  const noise = (t, type, freq, peak, decay) => {
    const n = ctx.createBufferSource();
    n.buffer = ctx.__pgNoise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    n.connect(f); f.connect(g); g.connect(dest);
    n.start(t, (t * 3.7) % 0.9);
    n.stop(t + decay + 0.02);
  };
  const pluck = (t, m, a) => { voice(t, 'triangle', hz(m), a, 0.004, 0.45, 2400); voice(t, 'sawtooth', hz(m), a * 0.12, 0.004, 0.15, 1800); };
  const bell = (t, m, a) => { voice(t, 'sine', hz(m), a, 0.003, 0.9); voice(t, 'sine', hz(m) * 2.76, a * 0.25, 0.003, 0.3); };
  const marimba = (t, m, a) => { voice(t, 'sine', hz(m), a, 0.003, 0.3); voice(t, 'sine', hz(m) * 4, a * 0.18, 0.002, 0.06); };
  const piano = (t, m, a) => { voice(t, 'sine', hz(m), a, 0.005, 1.6); voice(t, 'sine', hz(m) * 2, a * 0.3, 0.005, 0.8); voice(t, 'triangle', hz(m) * 3, a * 0.06, 0.005, 0.4); };
  const bass = (t, m, a, d) => voice(t, 'sawtooth', hz(m), a, 0.01, d, 320);
  const pad = (t, notes, a, d) => notes.forEach((m) => [-6, 6].forEach((c) => {
    const o = voice(t, 'sawtooth', hz(m), a, d * 0.3, d * 0.5, 900, d * 0.2);
    o.detune.value = c;
  }));
  const kick = (t, a) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(a, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + 0.25);
  };
  const hat = (t, a) => noise(t, 'highpass', 7000, a, 0.04);
  const clap = (t, a) => [0, 0.012, 0.024].forEach((d) => noise(t + d, 'bandpass', 1500, a, 0.1));

  const first = Math.max(0, Math.floor((t0 - songStart) / bar) - 1);
  const last = Math.floor((t1 - songStart) / bar);
  for (let b = first; b <= last; b++) {
    const start = songStart + b * bar;
    const chord = song.chords[b % song.chords.length];
    const at = (beats) => start + beats * beat;
    const notes = [];
    const add = (beats, fn) => notes.push([at(beats), fn]);
    if (genre === 'news') {
      for (let i = 0; i < 16; i++) add(i / 4, (t) => bass(t, chord[0] - 12 + (i % 4 === 2 ? 12 : 0), 0.09, 0.12));
      for (let i = 0; i < 16; i++) add(i / 4, (t) => hat(t, i % 2 ? 0.025 : 0.045));
      [0, 2].forEach((i) => add(i, (t) => kick(t, 0.5)));
      add(0, (t) => pad(t, chord.map((m) => m + 12), 0.03, bar * 0.9));
      if (b % 2 === 0) add(0, (t) => bell(t, chord[2] + 24, 0.05));
      add(3.5, (t) => bell(t, chord[0] + 24 + (rnd(b) > 0.5 ? 7 : 0), 0.03));
    } else if (genre === 'documentary') {
      add(0, (t) => pad(t, chord.map((m) => m + 12), 0.035, bar * 1.05));
      add(0, (t) => voice(t, 'sine', hz(chord[0] - 12), 0.045, 0.8, bar * 0.5, null, bar * 0.4));
      [0, 1.5, 2.5].forEach((i, j) => { if (j === 0 || rnd(b * 3 + j) > 0.4) add(i, (t) => piano(t, chord[Math.floor(rnd(b * 7 + j) * 3)] + 24, 0.07)); });
    } else if (genre === 'howto') {
      const arp = [0, 1, 2, 1];
      for (let i = 0; i < 8; i++) add(i / 2, (t) => marimba(t, chord[arp[i % 4]] + 12 + (i >= 4 && rnd(b + i) > 0.6 ? 12 : 0), 0.11));
      [0, 2].forEach((i) => add(i, (t) => { kick(t, 0.45); bass(t, chord[0] - 12, 0.1, beat * 1.4); }));
      [1, 3].forEach((i) => add(i, (t) => clap(t, 0.08)));
      for (let i = 0; i < 8; i++) add(i / 2, (t) => hat(t, 0.025));
    } else {
      // kids
      for (let i = 0; i < 8; i++) add(i / 2, (t) => chord.forEach((m, k) => pluck(t + (i % 2 ? (2 - k) : k) * 0.012, m + 12, i % 2 ? 0.045 : 0.07)));
      [0, 2].forEach((i) => add(i, (t) => { kick(t, 0.35); bass(t, chord[0] - 12, 0.1, beat * 1.2); }));
      for (let i = 0; i < 8; i++) add(i / 2, (t) => hat(t, i % 2 ? 0.015 : 0.025));
      const scale = [0, 2, 4, 7, 9];
      [0, 1, 2, 3].forEach((i) => { if (rnd(b * 5 + i) > 0.35) add(i, (t) => bell(t, 72 + scale[Math.floor(rnd(b * 11 + i) * 5)] + (chord[0] % 12 === 9 ? -3 : 0), 0.05)); });
    }
    for (const [t, fn] of notes) if (t >= t0 && t < t1) fn(t);
  }
}

/**
 * A clip's background music, playing from now until stop(): the sound pack's loop for the genre
 * (bank.music), else pgMusicBars. Quiet under the scenes (a file at 0.18: they come mastered
 * loud; the synthesized music at 0.6), quieter still while someone speaks: duck(at, seconds).
 * Returns { stop(), duck(at, seconds) }.
 */
export function pgMusicTrack(ctx, dest, genre, bank, level) {
  const file = bank && bank.music(genre);
  const out = ctx.createGain();
  out.gain.value = level || (file ? 0.18 : 0.6);
  const ducker = ctx.createGain();
  ducker.connect(out);
  out.connect(dest);
  const start = ctx.currentTime + 0.05;
  let until = start;
  const ahead = () => {
    const to = ctx.currentTime + 1.2;
    if (file) pgMusicLoop(ctx, ducker, file.buffer, start, until, to);
    else pgMusicBars(ctx, ducker, genre, start, until, to);
    until = to;
  };
  ahead();
  const timer = setInterval(ahead, 400);
  return {
    duck(at, seconds) {
      ducker.gain.setTargetAtTime(0.35, at, 0.06);
      ducker.gain.setTargetAtTime(1, at + seconds, 0.35);
    },
    stop() {
      clearInterval(timer);
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      setTimeout(() => out.disconnect(), 1500);
    },
  };
}

/** Renders `seconds` of a genre's music from ctx time t0 (offline, e.g. for video): returns duck(at, s) */
export function pgMusicRender(ctx, dest, genre, bank, t0, seconds, level) {
  const file = bank && bank.music(genre);
  const gain = level || (file ? 0.18 : 0.6);
  const out = ctx.createGain();
  const ducker = ctx.createGain();
  ducker.connect(out);
  out.connect(dest);
  // Fade in and out at the ends
  out.gain.setValueAtTime(0.0001, t0);
  out.gain.linearRampToValueAtTime(gain, t0 + 0.8);
  out.gain.setValueAtTime(gain, Math.max(t0 + 0.8, t0 + seconds - 1.2));
  out.gain.linearRampToValueAtTime(0.0001, t0 + seconds);
  if (file) pgMusicLoop(ctx, ducker, file.buffer, t0, t0, t0 + seconds);
  else pgMusicBars(ctx, ducker, genre, t0, t0, t0 + seconds);
  return (at, s) => {
    ducker.gain.setTargetAtTime(0.35, at, 0.06);
    ducker.gain.setTargetAtTime(1, at + s, 0.35);
  };
}

/**
 * A music file over and over: the repeats starting between ctx times `from` and `to` of a song
 * that began at `songStart`, each fading into the next (generated music rarely loops seamlessly).
 */
export function pgMusicLoop(ctx, dest, buffer, songStart, from, to) {
  const dur = buffer.duration;
  const xf = dur > 6 ? Math.min(1.5, dur * 0.1) : Math.min(0.05, dur / 4);
  const step = dur - xf;
  for (let k = Math.max(0, Math.ceil((from - songStart) / step - 1e-6)); songStart + k * step < to; k++) {
    const at = songStart + k * step;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime(k ? 0.0001 : 1, at);
    if (k) g.gain.linearRampToValueAtTime(1, at + xf);
    g.gain.setValueAtTime(1, at + dur - xf);
    g.gain.linearRampToValueAtTime(0.0001, at + dur);
    src.connect(g);
    g.connect(dest);
    src.start(at);
    src.stop(at + dur + 0.01);
  }
}
