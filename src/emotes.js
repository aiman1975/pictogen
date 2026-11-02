// Emotes: a little sign over someone's head that says how they feel, as in a comic: "!" when
// surprised, "?" when confused, a heart in love, "Zzz" when sleepy, an anger mark, sparkles when
// excited, a shiver of sweat drops when scared, a small rain cloud when sad. Drawn in a figure's
// own units (its 100 x 100 box), by the top right of its head, gently moving.

const r2 = (v) => Math.round(v * 100) / 100;

// Each sign around (0, 0), about 22 units across
const SIGNS = {
  surprised: () => `<path d="M-6 -12 L6 -12 L3 4 L-3 4 Z" fill="#facc15" stroke="#1f2937" stroke-width="1.4" stroke-linejoin="round"/><circle cx="0" cy="10" r="3.4" fill="#facc15" stroke="#1f2937" stroke-width="1.4"/>`,
  confused: () => `<path d="M-7 -6 C-7 -14 7 -14 7 -6 C7 0 1 0 1 6" fill="none" stroke="#1f2937" stroke-width="7" stroke-linecap="round"/><path d="M-7 -6 C-7 -14 7 -14 7 -6 C7 0 1 0 1 6" fill="none" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/><circle cx="1" cy="12" r="3" fill="#38bdf8" stroke="#1f2937" stroke-width="1.4"/>`,
  love: () => `<path d="M0 10 C-14 0 -10 -12 0 -5 C10 -12 14 0 0 10 Z" fill="#f43f5e" stroke="#9f1239" stroke-width="1.2"/><circle cx="-4" cy="-3" r="1.8" fill="#ffffff" opacity="0.7"/>`,
  angry: () => ['M-10 -3 Q-4 -4 -3 -10', 'M3 -10 Q4 -4 10 -3', 'M10 3 Q4 4 3 10', 'M-3 10 Q-4 4 -10 3']
    .map((d) => `<path d="${d}" fill="none" stroke="#dc2626" stroke-width="3.4" stroke-linecap="round"/>`).join(''),
  sleepy: () => [[-8, 0, 9], [0, -8, 7], [7, -15, 5.5]].map(([x, y, s]) => `<path class="pg-z" d="M${x - s / 2} ${y - s / 2} h${s} l${-s} ${s} h${s}" fill="none" stroke="#6366f1" stroke-width="${r2(s / 4.5)}" stroke-linecap="round" stroke-linejoin="round"/>`).join(''),
  excited: () => [[-6, -4, 7], [7, -8, 5], [5, 7, 4]].map(([x, y, s]) => `<path d="M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z" fill="#fbbf24"/>`).join(''),
  scared: () => [[-6, -6, 1], [2, -10, 0.8], [8, -2, 0.9]].map(([x, y, k]) => `<path d="M${x} ${y - 6 * k} Q${x + 4 * k} ${y + 1 * k} ${x} ${y + 3 * k} Q${x - 4 * k} ${y + 1 * k} ${x} ${y - 6 * k} Z" fill="#7dd3fc" stroke="#0369a1" stroke-width="0.9"/>`).join(''),
  sad: () => `<path d="M-11 0 Q-11 -7 -4 -7 Q-1 -12 5 -10 Q11 -10 11 -3 Q13 3 6 3 L-6 3 Q-11 3 -11 0 Z" fill="#94a3b8"/><path d="M-4 6 Q-2 10 -4 12 Q-6 10 -4 6 Z M4 7 Q6 11 4 13 Q2 11 4 7 Z" fill="#38bdf8"/>`,
};
SIGNS.shocked = SIGNS.surprised;
SIGNS.puzzled = SIGNS.confused;
SIGNS.mad = SIGNS.angry;
SIGNS.crying = SIGNS.sad;

/** True when this feeling has a sign */
export const hasEmote = (expr) => Boolean(expr && SIGNS[expr]);

/**
 * The sign for a feeling, placed in a figure's units: by the top right of its head (head: [cx, top]
 * of the head, default a person's), unmirrored when the figure is drawn mirrored. '' for none.
 * uid: makes the CSS animation names unique in the scene.
 */
export function emote(expr, { head = [66, 6], size = 1, mirrored = false } = {}) {
  if (!hasEmote(expr)) return '';
  const [x, y] = head;
  const body = `<g class="pg-emote pg-emote-${expr}" transform="translate(${r2(x + 12)} ${r2(y)}) scale(${r2(size)})"><g class="pg-emote-move">${SIGNS[expr]()}</g></g>`;
  return mirrored ? `<g transform="translate(100 0) scale(-1 1)">${body}</g>` : body;
}

/** How the signs move (in the scene's style sheet) */
export const EMOTE_CSS = `
@keyframes pgEmoteBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
@keyframes pgEmotePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.18); } }
@keyframes pgEmoteZ { 0% { opacity: 0; transform: translate(-3px, 4px); } 30%, 70% { opacity: 1; } 100% { opacity: 0; transform: translate(3px, -4px); } }
.pg-emote-move { transform-box: fill-box; transform-origin: center; animation: pgEmoteBob 1.6s ease-in-out infinite; }
.pg-emote-love .pg-emote-move, .pg-emote-angry .pg-emote-move, .pg-emote-mad .pg-emote-move { animation: pgEmotePulse 1.1s ease-in-out infinite; }
.pg-emote-sleepy .pg-emote-move { animation: none; }
.pg-emote-sleepy .pg-z { animation: pgEmoteZ 2.4s ease-in-out infinite; }
.pg-emote-sleepy .pg-z:nth-child(2) { animation-delay: -0.8s; }
.pg-emote-sleepy .pg-z:nth-child(3) { animation-delay: -1.6s; }
`;
