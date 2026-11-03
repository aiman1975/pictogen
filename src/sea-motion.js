// How the sea animals move (src/concepts/sea.js): tentacles curl, claws snap, little legs scuttle,
// fins paddle, tails beat, a whale's spout puffs, a starfish wiggles, and they all bob gently in
// the water. Joints turn around their own pivots (set where they are drawn).
export const SEA_CSS = `
@keyframes pgSeaBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
.pg-rig-sea .pg-sea-bob { animation: pgSeaBob 3s ease-in-out var(--pg-idle, 0s) infinite; }
@keyframes pgTentacle { 0%, 100% { transform: rotate(-7deg); } 50% { transform: rotate(7deg); } }
.pg-rig-sea .pg-tentacle { animation: pgTentacle 2.4s ease-in-out infinite; }
.pg-rig-sea .pg-tentacle:nth-of-type(2n) { animation-duration: 2s; animation-direction: reverse; }
@keyframes pgClaw { 0%, 70%, 100% { transform: rotate(0deg); } 80% { transform: rotate(-22deg); } 90% { transform: rotate(4deg); } }
.pg-rig-sea .pg-claw-top { animation: pgClaw 2.2s ease-in-out var(--pg-idle, 0s) infinite; }
@keyframes pgScuttle { 0%, 100% { transform: rotate(-9deg); } 50% { transform: rotate(9deg); } }
.pg-rig-sea .pg-sea-leg { animation: pgScuttle 0.7s ease-in-out infinite; }
.pg-rig-sea.pg-anim-walk .pg-sea-leg, .pg-rig-sea.pg-anim-run .pg-sea-leg, .pg-rig-sea.pg-anim-walk-across .pg-sea-leg { animation-duration: 0.25s; }
@keyframes pgSeaFin { 0%, 100% { transform: rotate(-12deg); } 50% { transform: rotate(14deg); } }
.pg-rig-sea .pg-sea-fin { animation: pgSeaFin 1.6s ease-in-out infinite; }
.pg-rig-sea.pg-anim-swim .pg-sea-fin { animation-duration: 0.6s; }
@keyframes pgSeaTail { 0%, 100% { transform: rotate(-9deg); } 50% { transform: rotate(9deg); } }
.pg-rig-sea .pg-tail { animation: pgSeaTail 1.8s ease-in-out var(--pg-idle, 0s) infinite; }
.pg-rig-sea.pg-anim-swim .pg-tail { animation-duration: 0.7s; }
@keyframes pgSpout { 0%, 55%, 100% { transform: scale(0.2, 0); opacity: 0; } 65% { transform: scale(1, 1); opacity: 1; } 90% { transform: scale(1.1, 1.15); opacity: 0; } }
.pg-rig-sea .pg-spout { animation: pgSpout 3.6s ease-out var(--pg-idle, 0s) infinite; }
@keyframes pgStarWiggle { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
.pg-rig-sea .pg-star-wiggle { animation: pgStarWiggle 2.6s ease-in-out var(--pg-idle, 0s) infinite; }
.pg-rig-sea.pg-anim-dance .pg-star-wiggle, .pg-rig-sea.pg-anim-wave .pg-star-wiggle { animation-duration: 0.8s; }
`;
