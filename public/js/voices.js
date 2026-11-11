// Your own voice for a clip's scenes: 🎙 in the clip player records you while the scene plays (the
// browser's microphone, asked once), ⏹ stops; 🗑 takes it away. The recordings stay on this device
// (the browser's IndexedDB) and are never uploaded. A scene with your voice plays it when the clip
// plays (the music quieter under it) and lasts as long as you speak; exported videos carry it.
// A recording belongs to its scene by the scene's caption, so changing the story leaves it out.

const DB = 'toonaro-voices', STORE = 'voices';
const MAX_SECONDS = 60;
const voices = new Map(); // key -> { blob, seconds }

// (the scene's key: its caption, or its place in the clip when it has none)
const keyOf = (i, scene) => (scene?.caption ? `c:${String(scene.caption).trim()}` : `i:${i}`);

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('no IndexedDB'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbDo(mode, fn) {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const out = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(out?.result ?? out);
      tx.onerror = () => reject(tx.error);
    });
  } catch { return null; /* (kept for this visit only) */ }
}
// (the recordings kept from before)
const loaded = (async () => {
  try {
    const db = await openDb();
    await new Promise((resolve) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
      req.onsuccess = () => { const c = req.result; if (!c) return resolve(); if (c.value?.blob) voices.set(c.key, c.value); c.continue(); };
      req.onerror = () => resolve();
    });
  } catch { /* (none kept) */ }
})();

/** Whether a scene has your voice, and how long it is (seconds, 0 when none) */
export const seconds = (i, scene) => voices.get(keyOf(i, scene))?.seconds ?? 0;
export const has = (i, scene) => voices.has(keyOf(i, scene));

// ---- Playing it with the clip
let playing = null;
export function play(i, scene) {
  stop();
  const v = voices.get(keyOf(i, scene));
  if (!v) return 0;
  const audio = new Audio(URL.createObjectURL(v.blob));
  playing = audio;
  audio.play().catch(() => {});
  audio.onended = () => { URL.revokeObjectURL(audio.src); if (playing === audio) playing = null; };
  window.pictogenSound?.duckMusic?.(v.seconds);
  return v.seconds;
}
export function stop() {
  if (playing) { playing.pause(); URL.revokeObjectURL(playing.src); playing = null; }
}

/** The recording as an AudioBuffer (for a video), or null */
export async function buffer(i, scene) {
  const v = voices.get(keyOf(i, scene));
  if (!v) return null;
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OAC) return null;
  try { return await new OAC(1, 1, 44100).decodeAudioData(await v.blob.arrayBuffer()); } catch { return null; }
}

// ---- Recording
let recorder = null;
/** Whether a recording is going on */
export const recording = () => Boolean(recorder);

/**
 * Starts recording your voice for scene i: resolves once the microphone is open (rejects when it
 * can't be). Call stopRecording() to keep it; it stops by itself after a minute.
 */
export async function startRecording(i, scene, { onStop } = {}) {
  if (recorder) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('no microphone in this browser');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported?.(t));
  const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks = [];
  const started = performance.now();
  rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
  rec.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop());
    recorder = null;
    clearTimeout(rec.limit);
    const blob = new Blob(chunks, { type: rec.mimeType || type || 'audio/webm' });
    // (how long it really is: decoded where the browser can, else the time it ran)
    let secs = (performance.now() - started) / 1000;
    try { const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; secs = (await new OAC(1, 1, 44100).decodeAudioData(await blob.arrayBuffer())).duration; } catch { /* (the time it ran) */ }
    if (blob.size && secs > 0.3) {
      const key = keyOf(i, scene), v = { blob, seconds: Math.round(secs * 100) / 100 };
      voices.set(key, v);
      await dbDo('readwrite', (st) => st.put(v, key));
      onStop?.(v.seconds);
    } else onStop?.(0);
  };
  rec.start(250);
  rec.limit = setTimeout(() => rec.state === 'recording' && rec.stop(), MAX_SECONDS * 1000);
  recorder = rec;
}
export function stopRecording() {
  if (recorder?.state === 'recording') recorder.stop();
}

/** Takes away the voice of scene i */
export async function remove(i, scene) {
  const key = keyOf(i, scene);
  voices.delete(key);
  await dbDo('readwrite', (st) => st.delete(key));
}

window.pictogenVoices = { loaded, has, seconds, play, stop, buffer, startRecording, stopRecording, recording, remove };
