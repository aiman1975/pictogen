// Lip-sync without sound: words become mouth openings over time, as if read aloud. Each syllable
// opens the mouth by its vowel (a wide, o round, i and u small), m/b/p close the lips first, and
// commas and full stops pause. The result drives a photo face's jaw and a drawn face's mouth.

const OPEN = { a: 1, o: 0.85, e: 0.7, y: 0.5, i: 0.5, u: 0.45 };
const SYLLABLE = /[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/g;
const RATE = 1; // speed multiplier

/**
 * lipKeys(text) -> { keys: [[t, open]], duration }: the mouth's opening (0 shut .. 1 wide) at times
 * t (seconds from the first word), closing at the end.
 */
export function lipKeys(text) {
  const keys = [[0, 0]];
  let t = 0.05;
  const tokens = String(text || '').toLowerCase().match(/[a-z']+|[.,!?;:—-]/g) || [];
  for (const tok of tokens) {
    if (/^[.!?]$/.test(tok)) { keys.push([t + 0.06, 0]); t += 0.45; continue; }
    if (/^[,;:—-]$/.test(tok)) { keys.push([t + 0.05, 0]); t += 0.25; continue; }
    const word = tok.replace(/'/g, '');
    // Syllables: vowel groups with their consonants; a silent final "e" belongs to the one before
    let parts = word.match(SYLLABLE) || [word];
    if (parts.length > 1 && /^[^aeiouy]*e$/.test(parts[parts.length - 1]) && !/le$/.test(word)) parts = [...parts.slice(0, -2), parts.slice(-2).join('')];
    for (const s of parts) {
      const vowel = s.match(/[aeiouy]/)?.[0];
      const len = Math.min(0.3, Math.max(0.13, 0.11 + s.length * 0.022)) / RATE;
      if (/^[mbp]/.test(s)) keys.push([t + len * 0.12, 0]); // lips together first
      keys.push([t + len * 0.4, OPEN[vowel] ?? 0.5]);
      keys.push([t + len * 0.9, /[mbp]$/.test(s) ? 0 : 0.2]);
      t += len;
    }
    t += 0.05;
  }
  keys.push([t + 0.1, 0]);
  return { keys, duration: +(t + 0.1).toFixed(2) };
}

/**
 * CSS that makes a figure say its words: keyframes over a loop of `loop` seconds, the words
 * starting at each speech's `start` (s), and rules for the figure marked data-lips="name": a photo
 * face's jaw and dark mouth (public/js/characters.js) and a drawn face's mouth.
 *   speeches: [{ start, text }]
 */
export function lipCss(name, speeches, loop) {
  const points = [[0, 0]];
  for (const { start, text } of speeches) {
    for (const [t, open] of lipKeys(text).keys) if (start + t < loop) points.push([start + t, open]);
  }
  points.push([loop, 0]);
  points.sort((a, b) => a[0] - b[0]);
  const pct = (t) => `${Math.min(100, Math.round((t / loop) * 100000) / 1000)}%`;
  const frames = (fn) => points.map(([t, o]) => `${pct(t)} { transform: ${fn(Math.round(o * 100) / 100)}; }`).join(' ');
  const anim = (k) => `animation: ${name}${k} ${loop}s linear infinite;`;
  const who = `.movable-item[data-lips="${name}"]`;
  return [
    `@keyframes ${name}j { ${frames((o) => `translateY(calc(var(--jaw, 1.6px) * ${Math.round(o * 190) / 100}))`)} }`,
    `@keyframes ${name}m { ${frames((o) => `scaleY(${Math.round(o * 150) / 100})`)} }`,
    `@keyframes ${name}d { ${frames((o) => `scaleY(${Math.round((0.5 + o * 1.2) * 100) / 100})`)} }`,
    `${who} .pg-photo-face .pg-photo-jaw { ${anim('j')} }`,
    `${who} .pg-photo-face .pg-photo-mouth { ${anim('m')} }`,
    `${who} .pg-face-mouth { ${anim('d')} }`,
  ].join('\n');
}

const SPEAK = /\b(?:says?|said|saying|asks?|asked|asking|shouts?|shouted|shouting|whispers?|whispered|whispering|sings?|sang|singing|tells?|told|telling|replies|replied|answers?|answered|calls?|called|yells?|yelled)\b/i;
/** True when a clause says someone speaks ("says", "asks", "whispers"...) */
export const speaks = (text) => SPEAK.test(String(text || ''));

/**
 * Quoted speech out of a prompt: "Tom says “Hi Mia!”, then waves" -> { text: 'Tom says qq0, then
 * waves', quotes: ['Hi Mia!'] }, so the words neither split the sentence nor get drawn.
 */
export function takeQuotes(text) {
  const quotes = [];
  const out = String(text || '').replace(/["“”]([^"“”]*)["“”]/g, (m, q) => { quotes.push(q.trim()); return ` qq${quotes.length - 1} `; });
  return { text: out.replace(/\s+/g, ' ').trim(), quotes };
}
