// Test script for Expressive Stickman Studio engine (Image 4 recreation)
import { writeFileSync } from 'node:fs';

function generateStickmanScene(opts = {}) {
  const { width = 640, height = 480 } = opts;
  const W = width, H = height;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <!-- Cardboard Gradient & Shadow Filters -->
    <linearGradient id="cardboard-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#dfb887"/>
      <stop offset="100%" stop-color="#be9364"/>
    </linearGradient>
    <linearGradient id="cardboard-dark" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ad8256"/>
      <stop offset="100%" stop-color="#936a41"/>
    </linearGradient>
    <linearGradient id="banana-peel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff176"/>
      <stop offset="70%" stop-color="#fbc02d"/>
      <stop offset="100%" stop-color="#c49000"/>
    </linearGradient>
    <linearGradient id="wood-handle" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#d7ccc8"/>
      <stop offset="50%" stop-color="#8d6e63"/>
      <stop offset="100%" stop-color="#5d4037"/>
    </linearGradient>
    <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
    </filter>
  </defs>

  <!-- Studio Warm Yellow Background -->
  <rect width="${W}" height="${H}" fill="#fed136"/>
  <radialGradient id="vignette" cx="50%" cy="40%" r="60%">
    <stop offset="0%" stop-color="#ffe26a" stop-opacity="0.4"/>
    <stop offset="100%" stop-color="#e5b112" stop-opacity="0.3"/>
  </radialGradient>
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>

  <!-- Ambient Ground Shadows under Throne and Feet -->
  <ellipse cx="230" cy="${H - 26}" rx="160" ry="16" fill="#000000" opacity="0.18" filter="url(#soft-shadow)"/>
  <ellipse cx="505" cy="${H - 30}" rx="48" ry="8" fill="#000000" opacity="0.20" filter="url(#soft-shadow)"/>

  <!-- ================= CARDBOARD THRONE ================= -->
  <g id="cardboard-throne">
    <!-- Backrest (Crown shape made of cardboard) -->
    <path d="M 120 ${H - 220} L 150 ${H - 360} L 195 ${H - 325} L 235 ${H - 375} L 275 ${H - 325} L 320 ${H - 360} L 350 ${H - 220} Z"
          fill="url(#cardboard-grad)" stroke="#222" stroke-width="4.5" stroke-linejoin="round"/>
    <!-- Backrest cardboard inner crease ribs -->
    <path d="M 150 ${H - 356} L 180 ${H - 230}" stroke="#936a41" stroke-width="3" stroke-linecap="round"/>
    <path d="M 235 ${H - 370} L 235 ${H - 230}" stroke="#936a41" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M 320 ${H - 356} L 290 ${H - 230}" stroke="#936a41" stroke-width="3" stroke-linecap="round"/>

    <!-- Left Armrest Box -->
    <path d="M 90 ${H - 190} L 155 ${H - 200} L 165 ${H - 60} L 90 ${H - 60} Z"
          fill="url(#cardboard-grad)" stroke="#222" stroke-width="4.5" stroke-linejoin="round"/>
    <!-- Left Armrest Flap folded out -->
    <path d="M 90 ${H - 190} L 55 ${H - 175} L 85 ${H - 130} L 92 ${H - 150}"
          fill="url(#cardboard-dark)" stroke="#222" stroke-width="4" stroke-linejoin="round"/>
    <path d="M 90 ${H - 190} L 155 ${H - 200}" stroke="#222" stroke-width="4.5"/>
    <line x1="155" y1="${H - 200}" x2="155" y2="${H - 130}" stroke="#936a41" stroke-width="3"/>

    <!-- Right Armrest Box -->
    <path d="M 315 ${H - 200} L 380 ${H - 190} L 380 ${H - 60} L 315 ${H - 60} Z"
          fill="url(#cardboard-grad)" stroke="#222" stroke-width="4.5" stroke-linejoin="round"/>
    <!-- Right Armrest Flap folded out -->
    <path d="M 380 ${H - 190} L 415 ${H - 175} L 385 ${H - 130} L 378 ${H - 150}"
          fill="url(#cardboard-dark)" stroke="#222" stroke-width="4" stroke-linejoin="round"/>
    <line x1="315" y1="${H - 200}" x2="315" y2="${H - 130}" stroke="#936a41" stroke-width="3"/>

    <!-- Throne Seat Base (Center Main Box) -->
    <path d="M 155 ${H - 145} L 315 ${H - 145} L 315 ${H - 35} L 155 ${H - 35} Z"
          fill="url(#cardboard-grad)" stroke="#222" stroke-width="4.5" stroke-linejoin="round"/>
    <!-- Corrugated Cardboard edge ridges -->
    <path d="M 155 ${H - 145} L 315 ${H - 145}" stroke="#222" stroke-width="6"/>
    <!-- Front Open Bottom Flap -->
    <path d="M 175 ${H - 35} L 175 ${H - 18} L 295 ${H - 18} L 295 ${H - 35} Z"
          fill="url(#cardboard-dark)" stroke="#222" stroke-width="4" stroke-linejoin="round"/>

    <!-- Recycling Symbol on front of cardboard box -->
    <g transform="translate(235, ${H - 88}) scale(0.7)" stroke="#6b4c27" stroke-width="4.5" fill="none" stroke-linejoin="round">
      <path d="M 0 -22 L 18 10 L 8 10 L 14 20 L -6 20 L -12 10 L -2 10 Z"/>
      <path d="M -16 6 L -26 -10 L -18 -10 L -25 -22 L -8 -13 L -13 -6 Z"/>
      <path d="M 16 6 L 8 -6 L 14 -6 L 10 -22 L 26 -13 L 20 -10 Z"/>
    </g>
    <!-- Scratches & Tape Details on Box -->
    <line x1="175" y1="${H - 65}" x2="183" y2="${H - 60}" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round"/>
    <line x1="182" y1="${H - 70}" x2="190" y2="${H - 65}" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round"/>
  </g>

  <!-- ================= LEFT CHARACTER: KING STICKMAN ================= -->
  <g id="king-stickman">
    <!-- Sitting Torso -->
    <line x1="230" y1="${H - 300}" x2="235" y2="${H - 195}" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>

    <!-- Left Leg (perched on seat edge, knee up) -->
    <polyline points="235,${H - 195} 210,${H - 190} 205,${H - 135} 185,${H - 135}"
              fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Left Shoe -->
    <ellipse cx="180" cy="${H - 135}" rx="12" ry="6" fill="#000"/>

    <!-- Right Leg (crossed knee pointing out) -->
    <polyline points="235,${H - 195} 270,${H - 180} 305,${H - 180} 305,${H - 128} 325,${H - 128}"
              fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Right Shoe -->
    <ellipse cx="330" cy="${H - 128}" rx="12" ry="6" fill="#000"/>

    <!-- Right Arm: Holding large wooden rubber stamp -->
    <polyline points="230,${H - 270} 145,${H - 275} 135,${H - 235}"
              fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
    
    <!-- Official Checklist Document / Paper Sheet -->
    <g transform="translate(75, ${H - 245}) rotate(8)">
      <rect x="0" y="0" width="85" height="115" rx="4" fill="#ffffff" stroke="#222" stroke-width="3.5"/>
      <!-- Checkboxes & Lines -->
      <rect x="10" y="14" width="18" height="18" rx="2" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>
      <line x1="34" y1="23" x2="72" y2="23" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
      
      <rect x="10" y="44" width="18" height="18" rx="2" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
      <!-- Big Red Checkmark in stamped box -->
      <path d="M 12 52 L 18 58 L 26 44" fill="none" stroke="#dc2626" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="34" y1="53" x2="72" y2="53" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>

      <rect x="10" y="74" width="18" height="18" rx="2" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/>
      <line x1="34" y1="83" x2="72" y2="83" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
      
      <!-- Signature line -->
      <line x1="12" y1="102" x2="55" y2="102" stroke="#cbd5e1" stroke-width="2"/>
    </g>

    <!-- Rubber Stamp (Pressed down on paper) -->
    <g transform="translate(130, ${H - 225})">
      <!-- Stamp Base -->
      <rect x="-35" y="-14" width="70" height="26" rx="4" fill="url(#cardboard-grad)" stroke="#222" stroke-width="3.5"/>
      <rect x="-32" y="10" width="64" height="6" rx="2" fill="#1e293b"/>
      <!-- Wooden Turned Handle -->
      <path d="M -10 -14 C -10 -28 -18 -38 -14 -56 C -10 -72 10 -72 14 -56 C 18 -38 10 -28 10 -14 Z"
            fill="url(#wood-handle)" stroke="#222" stroke-width="3.5"/>
      <ellipse cx="0" cy="-62" rx="14" ry="10" fill="url(#wood-handle)" stroke="#222" stroke-width="3.5"/>
    </g>

    <!-- Left Hand Clamping on Stamp Handle -->
    <ellipse cx="130" cy="${H - 275}" rx="9" ry="7" fill="#000"/>
    <ellipse cx="123" cy="${H - 272}" rx="5" ry="4" fill="#000"/>

    <!-- Left Arm: Raised, holding peeled banana -->
    <polyline points="230,${H - 270} 275,${H - 280} 325,${H - 245}"
              fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
    
    <!-- Peeled Banana -->
    <g transform="translate(340, ${H - 270}) rotate(-18)">
      <!-- Banana White Flesh -->
      <path d="M -6 -18 C -2 -42 16 -50 26 -56 C 24 -40 18 -26 12 -12 Z"
            fill="#fffde7" stroke="#222" stroke-width="3" stroke-linejoin="round"/>
      <!-- Yellow Peels folding open -->
      <!-- Left Peel flap -->
      <path d="M -4 -16 C -18 -32 -32 -28 -36 -12 C -24 -16 -12 -12 -4 -4 Z"
            fill="url(#banana-peel)" stroke="#222" stroke-width="3" stroke-linejoin="round"/>
      <!-- Center Peel flap -->
      <path d="M 2 -12 C 4 -28 12 -38 22 -30 C 18 -20 12 -12 4 -2 Z"
            fill="url(#banana-peel)" stroke="#222" stroke-width="3" stroke-linejoin="round"/>
      <!-- Bottom Banana Body -->
      <path d="M -8 -8 C -14 18 -8 40 4 58 C 12 50 16 35 12 10 C 6 2 0 -2 -8 -8 Z"
            fill="url(#banana-peel)" stroke="#222" stroke-width="3.5" stroke-linejoin="round"/>
      <!-- Green Tip -->
      <path d="M 4 58 C 7 64 10 68 12 72 L 8 74 C 6 68 3 62 4 58 Z" fill="#689f38"/>
    </g>
    <!-- Right Hand holding Banana -->
    <ellipse cx="335" cy="${H - 250}" rx="9" ry="8" fill="#000"/>
    <path d="M 330 ${H - 252} Q 340 ${H - 250} 345 ${H - 255}" stroke="#000" stroke-width="5" stroke-linecap="round"/>

    <!-- ================= KING HEAD & EXPRESSION ================= -->
    <g id="king-head" transform="translate(230, ${H - 340})">
      <!-- Head Circle: Thick black stroke, clean white interior -->
      <circle cx="0" cy="0" r="44" fill="#ffffff" stroke="#000000" stroke-width="6.5"/>

      <!-- Cardboard Crown perched on Head -->
      <path d="M -42 -26 L -48 -75 L -20 -50 L 0 -82 L 20 -50 L 48 -75 L 42 -26 Z"
            fill="url(#cardboard-grad)" stroke="#000000" stroke-width="5" stroke-linejoin="round"/>
      <!-- Crown Crease Ribs -->
      <line x1="-20" y1="-50" x2="-18" y2="-28" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round"/>
      <line x1="0" y1="-78" x2="0" y2="-26" stroke="#8a5a2b" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="20" y1="-50" x2="18" y2="-28" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round"/>

      <!-- Joyous Eyebrows -->
      <path d="M -26 -16 Q -14 -28 0 -18" fill="none" stroke="#000" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M 12 -18 Q 24 -28 36 -14" fill="none" stroke="#000" stroke-width="4.5" stroke-linecap="round"/>

      <!-- Left Eye: Big laughing open circle with pupil -->
      <circle cx="-14" cy="-4" r="11" fill="#fff" stroke="#000" stroke-width="3.5"/>
      <circle cx="-12" cy="-4" r="5" fill="#000"/>
      <!-- Right Eye: Winking / squinting laughing crescent ( > ) -->
      <path d="M 14 -7 Q 24 -14 34 -4" fill="none" stroke="#000" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M 14 0 Q 24 8 34 -2" fill="none" stroke="#000" stroke-width="4.5" stroke-linecap="round"/>

      <!-- Laughing Open Mouth with Teeth and Tongue -->
      <path d="M -22 10 Q 5 12 28 14 Q 24 38 -5 36 Q -20 32 -22 10 Z"
            fill="#000000" stroke="#000000" stroke-width="3.5" stroke-linejoin="round"/>
      <!-- White Top Teeth Row -->
      <path d="M -20 12 L 26 15 L 23 20 L -18 18 Z" fill="#ffffff"/>
      <!-- Pink Tongue -->
      <path d="M -10 28 Q 2 24 16 28 Q 12 36 -4 35 Z" fill="#ef4444"/>
    </g>
  </g>

  <!-- ================= RIGHT CHARACTER: SKEPTICAL STICKMAN ================= -->
  <g id="skeptical-stickman" transform="translate(505, 0)">
    <!-- Vertical Slender Spine -->
    <line x1="0" y1="${H - 265}" x2="0" y2="${H - 125}" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>

    <!-- Left Leg: Standing straight -->
    <line x1="0" y1="${H - 125}" x2="-14" y2="${H - 32}" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
    <!-- Left Foot -->
    <ellipse cx="-24" cy="${H - 30}" rx="14" ry="6" fill="#000"/>

    <!-- Right Leg: Slightly angled -->
    <line x1="0" y1="${H - 125}" x2="18" y2="${H - 32}" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
    <!-- Right Foot -->
    <ellipse cx="28" cy="${H - 30}" rx="14" ry="6" fill="#000"/>

    <!-- Left Arm: Hand on Hip (akimbo pose, judgment) -->
    <polyline points="0,${H - 245} -35,${H - 215} -14,${H - 185}"
              fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse cx="-12" cy="${H - 185}" rx="7" ry="6" fill="#000"/>

    <!-- Right Arm: Hanging loose, skeptical relaxed fingers -->
    <polyline points="0,${H - 245} 25,${H - 200} 22,${H - 150}"
              fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Hand with dangling fingers -->
    <circle cx="22" cy="${H - 146}" r="7" fill="#000"/>
    <line x1="20" y1="${H - 144}" x2="18" y2="${H - 134}" stroke="#000" stroke-width="3" stroke-linecap="round"/>
    <line x1="24" y1="${H - 144}" x2="24" y2="${H - 132}" stroke="#000" stroke-width="3" stroke-linecap="round"/>

    <!-- ================= SKEPTICAL HEAD & EXPRESSION ================= -->
    <g id="skeptical-head" transform="translate(0, ${H - 310})">
      <!-- Head Circle -->
      <circle cx="0" cy="0" r="42" fill="#ffffff" stroke="#000000" stroke-width="6.5"/>

      <!-- Eyebrows: One raised quizzically, one furrowed deadpan -->
      <path d="M -26 -16 L -4 -16" stroke="#000" stroke-width="5" stroke-linecap="round"/>
      <path d="M 6 -24 Q 18 -26 28 -18" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round"/>

      <!-- Eyes: Side-Eye Heavy Eyelids (judging the king) -->
      <!-- Left Eye -->
      <g transform="translate(-16, -6)">
        <circle cx="0" cy="0" r="10" fill="#fff" stroke="#000" stroke-width="3.5"/>
        <!-- Pupil looking HARD left towards the king -->
        <circle cx="-5" cy="0" r="4.5" fill="#000"/>
        <!-- Heavy drooping eyelid line cutting through top half -->
        <path d="M -11 -2 L 11 -2" stroke="#000" stroke-width="4.5" stroke-linecap="round"/>
      </g>

      <!-- Right Eye -->
      <g transform="translate(16, -6)">
        <circle cx="0" cy="0" r="10" fill="#fff" stroke="#000" stroke-width="3.5"/>
        <!-- Pupil looking HARD left towards the king -->
        <circle cx="-5" cy="0" r="4.5" fill="#000"/>
        <!-- Heavy drooping eyelid line -->
        <path d="M -11 -2 L 11 -2" stroke="#000" stroke-width="4.5" stroke-linecap="round"/>
      </g>

      <!-- Deadpan Unimpressed Straight Line Mouth -->
      <line x1="-14" y1="18" x2="16" y2="17" stroke="#000" stroke-width="5" stroke-linecap="round"/>
    </g>
  </g>
</svg>`;

  return svg;
}

const testSvg = generateStickmanScene();
writeFileSync('public/stickman-showcase.svg', testSvg);
console.log('✓ Successfully generated public/stickman-showcase.svg! Length:', testSvg.length);
