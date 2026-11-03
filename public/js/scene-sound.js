// Scene sound in the studio: plays what a scene's SVG says is heard (its <metadata class="pg-sound">,
// made by src/sound.js) in time with the animation, and a clip's background music for its genre.
// Sounds come from the sound pack (public/audio/pack, src/sound-pack.js) where it has a file, else
// from the synthesizer (src/sound-synth.js, served at /js/sound-synth.js). Renders both for video
// export. Sound and music are on by default, each with its own switch (remembered in this browser).

import { pgSound, pgSoundTrack, pgBank, pgVoiced, pgMusicTrack, pgMusicRender } from './sound-synth.js';

const remembered = (key) => { try { return localStorage.getItem(key) !== 'off'; } catch { return true; } };
const remember = (key, on) => { try { localStorage.setItem(key, on ? 'on' : 'off'); } catch { /* not remembered */ } };
let enabled = remembered('pictogen.sound.v1');
let musicOn = remembered('pictogen.music.v1');

let ctx = null, master = null, track = null, music = null, bank = null;

// The sound pack: every file listed in its manifest, decoded once - except the music, each tune
// fetched and decoded only when it is played (they are long: decoded, a tune takes ~10 MB)
const tuneFiles = new Map(); // tune -> manifest entry
const tunes = new Map(); // tune -> Promise of a decoded entry (or null)
let decoder = null;
const decoderOf = () => {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!decoder && OAC) decoder = new OAC(1, 1, 44100);
  return decoder;
};
const packReady = (async () => {
  try {
    const res = await fetch('/audio/pack/manifest.json');
    if (!res.ok) return null;
    const { files: all = [] } = await res.json();
    for (const e of all) if (e.music && !tuneFiles.has(e.music)) tuneFiles.set(e.music, e);
    const files = all.filter((e) => !e.music);
    const dec = decoderOf();
    if (!dec || !files.length) return null;
    const entries = await Promise.all(files.map(async (e) => {
      try {
        const data = await (await fetch(`/audio/pack/${e.file}`)).arrayBuffer();
        return { ...e, buffer: await dec.decodeAudioData(data) };
      } catch { return null; } // a file the browser can't play: synthesized instead
    }));
    bank = pgBank(entries.filter(Boolean));
    return bank;
  } catch { return null; }
})();

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
// Browsers only allow sound once the page has been used (a click, a key)
const allowed = () => !(navigator.userActivation && !navigator.userActivation.hasBeenActive);

/** A scene's sound ({ loop, cues }) from its <svg> element, or null */
export function soundOf(svg) {
  const m = svg?.querySelector?.('metadata.pg-sound');
  if (!m) return null;
  try { return JSON.parse(m.textContent); } catch { return null; }
}

/** Stops whatever scene sound is playing (the music plays on) */
export function stop() {
  if (track) { track.stop(); track = null; }
}

/** Plays the sound of the scene in `svg` from scene time `from` (seconds), if sound is on */
export function play(svg, from = 0) {
  stop();
  const sound = soundOf(svg);
  if (!enabled || !sound?.cues?.length || !allowed()) return false;
  const ac = context();
  if (!ac) return false;
  track = pgSoundTrack(ac, master, sound, from, { bank, onVoice: (at, s) => music?.duck(at, s) });
  return true;
}

/** Plays on from where the scene's animation is now (after a pause or a seek) */
export function resume(svg) {
  const anims = svg?.getAnimations?.({ subtree: true }) ?? [];
  const ms = Math.max(0, ...anims.map((a) => Number(a.currentTime) || 0));
  return play(svg, ms / 1000);
}

/** The pack with a tune's file loaded (the tune: a clip genre or a mood, src/sound-pack.js TUNES) */
async function withTune(tune) {
  await packReady;
  const base = bank ?? { size: 0, has: () => false, pick: () => null, music: () => null };
  if (!tunes.has(tune)) {
    const e = tuneFiles.get(tune);
    tunes.set(tune, e ? fetch(`/audio/pack/${e.file}`).then((r) => r.arrayBuffer()).then((data) => decoderOf().decodeAudioData(data))
      .then((buffer) => ({ ...e, buffer })).catch(() => null) : Promise.resolve(null));
  }
  const entry = await tunes.get(tune);
  return { ...base, music: (g) => (g === tune && entry ? entry : base.music(g)) };
}

/**
 * Starts a clip's background music (kept playing if it already is), if music is on: its tune is
 * the clip's genre or a mood picked for it. Its file loads first; synthesized when there is none.
 */
export function startMusic(genre) {
  if (music?.genre === genre) return true;
  stopMusic();
  if (!musicOn || !allowed()) return false;
  const ac = context();
  if (!ac) return false;
  const me = { genre, track: null, stopped: false, stop() { this.stopped = true; this.track?.stop(); }, duck(at, s) { this.track?.duck(at, s); } };
  music = me;
  withTune(genre).then((b) => { if (music === me && !me.stopped) me.track = pgMusicTrack(ac, master, genre, b); });
  return true;
}

export function stopMusic() {
  if (music) { music.stop(); music = null; }
}

export const isEnabled = () => enabled;
export const isMusicOn = () => musicOn;
export const isMusicPlaying = () => !!music;
export const packSize = () => bank?.size ?? 0;

export function setEnabled(on) {
  enabled = !!on;
  remember('pictogen.sound.v1', enabled);
  if (!enabled) stop();
}

export function setMusic(on) {
  musicOn = !!on;
  remember('pictogen.music.v1', musicOn);
  if (!musicOn) stopMusic();
}

/**
 * The sound of a whole clip for video export: parts [{ sound, at (s), duration (s) }] mixed into
 * an AudioBuffer of `total` seconds (looping scenes repeat for as long as they are shown), with
 * the genre's music under it all when `music` is given ({ genre }).
 */
export async function renderClipSound(parts, total, { music: withMusic = null } = {}) {
  await packReady;
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OAC || (!withMusic && !parts.some((p) => p.sound?.cues?.length))) return null;
  const rate = 44100;
  const oc = new OAC(2, Math.max(1, Math.ceil(total * rate)), rate);
  const comp = oc.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  const bus = oc.createGain();
  bus.gain.value = 1.2;
  bus.connect(comp);
  comp.connect(oc.destination);
  const duck = withMusic ? pgMusicRender(oc, bus, withMusic.genre, await withTune(withMusic.genre), 0, total) : null;
  for (const { sound, at, duration } of parts) {
    if (!sound?.cues?.length) continue;
    const loop = sound.loop > 0.5 ? sound.loop : null;
    for (let k = 0; k === 0 || (loop && k * loop < duration); k++) {
      for (const c of sound.cues) {
        const t = (loop ? k * loop : 0) + c.t;
        if (t >= duration - 0.05) continue;
        pgSound(oc, bus, c, at + t, bank);
        if (duck && pgVoiced(c)) duck(at + t, pgVoiced(c));
      }
    }
  }
  return oc.startRendering();
}

window.pictogenSound = { play, resume, stop, startMusic, stopMusic, isEnabled, isMusicOn, isMusicPlaying, setEnabled, setMusic, soundOf, renderClipSound, packSize, packReady };
