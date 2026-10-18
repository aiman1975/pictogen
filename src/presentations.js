// PictoGen Presentations Engine: Technical Callouts, Studio Knolling,
// Before-vs-After Split, 2.5D Isometric Diorama, Waffle/Isotype Infographics, and Coloring Book.

import { getConcept } from './concepts/index.js';
import { drawConcept, shapesToSvg, svgDoc, newUid, styleWrap, FONT, esc } from './core/render.js';
import { getStyle } from './core/styles.js';
import { createRng } from './core/rng.js';
import { lighten, darken, mix } from './core/color.js';
import { createKit } from './core/kit.js';
import { drawLetterCreature, LETTER_PALETTES } from './concepts/alphabet.js';

const fmt = (v) => Math.round(v * 100) / 100;

/**
 * 1. Technical Callout / Spec Sheet / Anatomy
 * Places primary object in center with technical leader pointer lines,
 * dimension brackets, and part spec badges.
 */
export function renderCallout(matches, opts = {}) {
  const { style = 'flat', width = 640, height = 360, seed = 1 } = opts;
  const W = width, H = height;
  const primaryMatch = matches[0] || { id: 'bike' };
  const c = getConcept(primaryMatch.id) || getConcept('bike');
  const rng = createRng(seed);
  const st = getStyle(style);
  const uid = newUid();

  // Background styling
  const isBp = style === 'blueprint';
  const isDark = style === 'neon' || isBp || style === 'chalkboard';
  const bgFill = st.background || (isBp ? '#0a1d37' : '#f8fafc');
  const gridStroke = isBp ? '#133863' : isDark ? '#334155' : '#e2e8f0';
  const textColor = isBp ? '#38bdf8' : isDark ? '#f8fafc' : '#0f172a';
  const accentColor = isBp ? '#0ea5e9' : '#2563eb';
  const textMuted = isBp ? '#94a3b8' : isDark ? '#94a3b8' : '#64748b';

  // Grid pattern
  let defs = `
    <pattern id="${uid}-callout-grid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="${gridStroke}" stroke-width="0.8"/>
    </pattern>
  `;

  // Draw object scaled in central-left region
  const objScale = 2.0;
  const objX = W * 0.42;
  const objY = H * 0.56;
  const shapes = drawConcept(c, {
    ...opts,
    seed: `${seed}:${c.id}:0`,
    color: primaryMatch.color,
    expression: primaryMatch.expression,
    animation: primaryMatch.animation,
  });
  const objectSvg = shapesToSvg(shapes, style, { olk: 1 });
  const fx = styleWrap(style, uid, objectSvg);
  defs += fx.defs;

  // Contextual Anatomy Parts based on concept category
  let parts = [];
  if (['vehicles'].includes(c.category) || ['bike', 'car', 'rocket', 'airplane'].includes(c.id)) {
    parts = [
      { name: 'STEERING & CONTROLS', tag: 'MOD 01', dx: -90, dy: -60, ax: -20, ay: -35 },
      { name: 'PROPULSION & DRIVE', tag: 'MOD 02', dx: 95, dy: 45, ax: 15, ay: 20 },
      { name: 'STRUCTURAL CHASSIS', tag: 'MOD 03', dx: -95, dy: 35, ax: -10, ay: 5 },
      { name: 'GROUND / FLIGHT COUPLING', tag: 'MOD 04', dx: 90, dy: -55, ax: 25, ay: -20 },
    ];
  } else if (['nature', 'food'].includes(c.category) || ['tree', 'apple', 'flower', 'sunflower'].includes(c.id)) {
    parts = [
      { name: 'CROWN & FOLIAGE LAYER', tag: 'ANAT 01', dx: 90, dy: -60, ax: 20, ay: -40 },
      { name: 'PHOTOSYNTHESIS ZONE', tag: 'ANAT 02', dx: -95, dy: -50, ax: -20, ay: -30 },
      { name: 'CORE STRUCTURAL TRUNK', tag: 'ANAT 03', dx: -90, dy: 35, ax: -10, ay: 15 },
      { name: 'ROOT & NUTRIENT ANCHOR', tag: 'ANAT 04', dx: 90, dy: 45, ax: 15, ay: 30 },
    ];
  } else if (['people'].includes(c.category) || ['boy', 'girl', 'man', 'woman'].includes(c.id)) {
    parts = [
      { name: 'FACIAL MIMICS & SENSORY', tag: 'SEC 01', dx: 90, dy: -60, ax: 15, ay: -40 },
      { name: 'GESTURAL UPPER LIMBS', tag: 'SEC 02', dx: -95, dy: -25, ax: -22, ay: -10 },
      { name: 'TORSO BALANCE & CORE', tag: 'SEC 03', dx: -90, dy: 30, ax: -12, ay: 10 },
      { name: 'LOCOMOTION KINEMATICS', tag: 'SEC 04', dx: 90, dy: 45, ax: 18, ay: 35 },
    ];
  } else {
    parts = [
      { name: 'PRIMARY PROFILE & APEX', tag: 'PAR 01', dx: -90, dy: -50, ax: -15, ay: -30 },
      { name: 'INTERNAL VOLUME CORE', tag: 'PAR 02', dx: 90, dy: -40, ax: 15, ay: -15 },
      { name: 'LATERAL BOUNDARY APERTURE', tag: 'PAR 03', dx: -90, dy: 35, ax: -20, ay: 15 },
      { name: 'BASE SUPPORT FOUNDATION', tag: 'PAR 04', dx: 90, dy: 45, ax: 20, ay: 25 },
    ];
  }

  // Build leader lines & callout text boxes
  let calloutsSvg = '';
  parts.forEach((p) => {
    const anchorX = objX + p.ax * (objScale * 0.9);
    const anchorY = objY + p.ay * (objScale * 0.9);
    const labelX = objX + p.dx * 1.7;
    const labelY = objY + p.dy * 1.4;
    const isRight = p.dx > 0;
    const elbowX = isRight ? labelX - 15 : labelX + 15;

    calloutsSvg += `
      <!-- Leader Line -->
      <circle cx="${fmt(anchorX)}" cy="${fmt(anchorY)}" r="3.5" fill="${accentColor}" stroke="${textColor}" stroke-width="1.5"/>
      <path d="M ${fmt(anchorX)} ${fmt(anchorY)} L ${fmt(elbowX)} ${fmt(labelY)} L ${fmt(labelX)} ${fmt(labelY)}" fill="none" stroke="${accentColor}" stroke-width="1.8" stroke-dasharray="2,2"/>
      
      <!-- Callout Badge -->
      <g transform="translate(${fmt(labelX)} ${fmt(labelY - 14)})">
        <rect x="${isRight ? 0 : -130}" y="0" width="130" height="28" rx="4" fill="${isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.92)'}" stroke="${accentColor}" stroke-width="1.2"/>
        <text x="${isRight ? 6 : -124}" y="10" font-family="${FONT}" font-size="7.5" font-weight="900" fill="${accentColor}" letter-spacing="0.05em">${p.tag}</text>
        <text x="${isRight ? 6 : -124}" y="22" font-family="${FONT}" font-size="8" font-weight="800" fill="${textColor}">${esc(p.name)}</text>
      </g>
    `;
  });

  // Dimension brackets below object
  const dimY = objY + 100 * (objScale * 0.5) + 20;
  const dimLeft = objX - 45 * objScale;
  const dimRight = objX + 45 * objScale;
  const dimSvg = `
    <g stroke="${accentColor}" stroke-width="1.4">
      <line x1="${fmt(dimLeft)}" y1="${fmt(dimY - 6)}" x2="${fmt(dimLeft)}" y2="${fmt(dimY + 6)}"/>
      <line x1="${fmt(dimRight)}" y1="${fmt(dimY - 6)}" x2="${fmt(dimRight)}" y2="${fmt(dimY + 6)}"/>
      <line x1="${fmt(dimLeft)}" y1="${fmt(dimY)}" x2="${fmt(dimRight)}" y2="${fmt(dimY)}" stroke-dasharray="3,3"/>
    </g>
    <rect x="${fmt(objX - 40)}" y="${fmt(dimY - 8)}" width="80" height="16" rx="3" fill="${isDark ? '#0f172a' : '#ffffff'}" stroke="${accentColor}" stroke-width="1"/>
    <text x="${fmt(objX)}" y="${fmt(dimY + 3.5)}" text-anchor="middle" font-family="${FONT}" font-size="8" font-weight="800" fill="${textColor}">◀  100 mm  ▶</text>
  `;

  // Header Banner
  const titleText = (c.label || c.id).toUpperCase();
  const headerSvg = `
    <rect x="16" y="14" width="${W - 32}" height="32" rx="6" fill="${isDark ? 'rgba(30,41,59,0.85)' : '#ffffff'}" stroke="${gridStroke}" stroke-width="1.2"/>
    <text x="28" y="34" font-family="${FONT}" font-size="11" font-weight="900" fill="${textColor}" letter-spacing="0.06em">SPECIFICATION SCHEMATIC // ${titleText}</text>
    <text x="${W - 28}" y="34" text-anchor="end" font-family="${FONT}" font-size="8.5" font-weight="800" fill="${accentColor}">CLASS: ${c.category.toUpperCase()} • REF #PG-${seed}</text>
  `;

  // Corner crosshairs
  const crosshairs = `
    <path d="M 24 60 L 32 60 M 28 56 L 28 64" stroke="${accentColor}" stroke-width="1.2"/>
    <path d="M ${W - 32} 60 L ${W - 24} 60 M ${W - 28} 56 L ${W - 28} 64" stroke="${accentColor}" stroke-width="1.2"/>
    <path d="M 24 ${H - 24} L 32 ${H - 24} M 28 ${H - 28} L 28 ${H - 20}" stroke="${accentColor}" stroke-width="1.2"/>
    <path d="M ${W - 32} ${H - 24} L ${W - 24} ${H - 24} M ${W - 28} ${H - 28} L ${W - 28} ${H - 20}" stroke="${accentColor}" stroke-width="1.2"/>
  `;

  const content = `
    <rect width="${W}" height="${H}" fill="${bgFill}"/>
    <rect width="${W}" height="${H}" fill="url(#${uid}-callout-grid)"/>
    ${crosshairs}
    ${headerSvg}
    <g class="movable-item" data-id="${c.id}" transform="translate(${fmt(objX - 50 * objScale)} ${fmt(objY - 50 * objScale)}) scale(${objScale})">
      ${fx.g}
    </g>
    ${dimSvg}
    ${calloutsSvg}
  `;

  return svgDoc({ width: W, height: H, viewBox: `0 0 ${W} ${H}`, defs, content, title: `${c.label} Technical Callout` });
}

/**
 * 2. Studio Knolling / Flat-Lay Organizer
 * Neatly aligns objects in a 90-degree orthogonal grid on a studio cutting mat or desk.
 */
export function renderKnolling(matches, opts = {}) {
  const { style = 'flat', width = 640, height = 360, seed = 1 } = opts;
  const W = width, H = height;
  const st = getStyle(style);
  const uid = newUid();
  const rng = createRng(seed);

  // Expand list to at least 6 items for a rich flat-lay collection
  let items = [...matches];
  if (items.length < 6) {
    const defaultIds = ['apple', 'bike', 'tree', 'sun', 'star', 'flower', 'book', 'key', 'coffee'];
    let idx = 0;
    while (items.length < 6) {
      const fallbackItem = items[idx % items.length] || { id: defaultIds[idx % defaultIds.length], count: 1 };
      items.push({ ...fallbackItem, count: 1 });
      idx++;
    }
  }
  items = items.slice(0, 9); // up to 9 for a 3x3 or 4x2 grid

  const cols = items.length <= 4 ? items.length : items.length <= 6 ? 3 : items.length <= 8 ? 4 : 3;
  const rows = Math.ceil(items.length / cols);

  const padX = 40, padY = 55;
  const gridW = W - padX * 2;
  const gridH = H - padY * 2 - 20;
  const cellW = gridW / cols;
  const cellH = gridH / rows;

  // Background cutting mat with metric millimeter marks
  const matBg = style === 'blueprint' ? '#07182f' : style === 'chalkboard' ? '#14201c' : '#1e293b';
  const gridLine = style === 'blueprint' ? '#103058' : style === 'chalkboard' ? '#223830' : '#334155';
  const tickColor = style === 'blueprint' ? '#38bdf8' : '#64748b';

  let defs = `
    <pattern id="${uid}-knoll-mat" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${gridLine}" stroke-width="0.75"/>
    </pattern>
    <filter id="${uid}-drop" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  `;

  let itemsSvg = '';
  items.forEach((it, i) => {
    const c = getConcept(it.id) || getConcept('apple');
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = padX + col * cellW + cellW / 2;
    const cy = padY + row * cellH + cellH / 2;

    const scale = Math.min((cellW * 0.65) / 100, (cellH * 0.72) / 100);
    const shapes = drawConcept(c, {
      ...opts,
      seed: `${seed}:${it.id}:${i}`,
      color: it.color,
      expression: it.expression,
      animation: it.animation,
    });
    const markup = shapesToSvg(shapes, style);

    itemsSvg += `
      <!-- Knolled Compartment Box -->
      <rect x="${fmt(cx - cellW * 0.44)}" y="${fmt(cy - cellH * 0.44)}" width="${fmt(cellW * 0.88)}" height="${fmt(cellH * 0.88)}" rx="6" fill="rgba(255,255,255,0.02)" stroke="${gridLine}" stroke-width="1"/>
      
      <!-- Item with drop shadow -->
      <g class="movable-item" data-id="${c.id}" transform="translate(${fmt(cx - 50 * scale)} ${fmt(cy - 50 * scale)}) scale(${fmt(scale)})" filter="url(#${uid}-drop)">
        ${markup}
      </g>
      
      <!-- Orthogonal alignment tick -->
      <text x="${fmt(cx)}" y="${fmt(cy + cellH * 0.41)}" text-anchor="middle" font-family="${FONT}" font-size="8" font-weight="800" fill="${tickColor}">[ ${c.label || c.id} ]</text>
    `;
  });

  const bannerSvg = `
    <rect x="20" y="14" width="${W - 40}" height="28" rx="6" fill="rgba(15,23,42,0.8)" stroke="${gridLine}" stroke-width="1.2"/>
    <text x="32" y="32" font-family="${FONT}" font-size="10" font-weight="900" fill="#f8fafc" letter-spacing="0.08em">📐 STUDIO KNOLLING FLAT-LAY • ${items.length} ORGANIZED SPECIMENS</text>
    <text x="${W - 32}" y="32" text-anchor="end" font-family="${FONT}" font-size="8.5" font-weight="800" fill="#38bdf8">90° ORTHOGONAL ALIGNMENT</text>
  `;

  const content = `
    <rect width="${W}" height="${H}" fill="${matBg}"/>
    <rect width="${W}" height="${H}" fill="url(#${uid}-knoll-mat)"/>
    ${bannerSvg}
    ${itemsSvg}
  `;

  return svgDoc({ width: W, height: H, viewBox: `0 0 ${W} ${H}`, defs, content, title: 'PictoGen Studio Knolling' });
}

/**
 * 3. Before vs After / Versus Split-Screen
 * Compares two states (e.g. Day vs Night, Old vs New, Happy vs Sad) with a central dividing handle.
 */
export function renderSplit(matches, opts = {}) {
  const { style = 'flat', width = 640, height = 360, seed = 1 } = opts;
  const W = width, H = height;
  const midX = W / 2;
  const uid = newUid();

  const itemA = matches[0] || { id: 'boy' };
  const itemB = matches[1] || matches[0] || { id: 'bike' };

  const cA = getConcept(itemA.id) || getConcept('boy');
  const cB = getConcept(itemB.id) || getConcept('bike');

  // Left shapes (State A: uses same character seed `${seed}:${cA.id}:0` so same character stays consistent across frames)
  const shapesA = drawConcept(cA, {
    ...opts,
    color: itemA.color,
    expression: itemA.expression || 'sad',
    animation: itemA.animation,
    seed: `${seed}:${cA.id}:0`,
  });
  const markupA = shapesToSvg(shapesA, style);

  // Right shapes (State B: uses same character seed `${seed}:${cB.id}:0` when comparing the same character)
  const shapesB = drawConcept(cB, {
    ...opts,
    color: itemB.color,
    expression: itemB.expression || 'laugh',
    animation: itemB.animation || (itemA.animation === 'point' ? 'thumbsup' : itemB.animation),
    seed: `${seed}:${cB.id}:0`,
  });
  const markupB = shapesToSvg(shapesB, style);

  const scaleA = 1.6;
  const scaleB = 1.6;

  const content = `
    <!-- Left Half: State A -->
    <rect x="0" y="0" width="${midX}" height="${H}" fill="#0f172a"/>
    <rect x="0" y="0" width="${midX}" height="${H}" fill="radial-gradient(circle, #1e293b, #0f172a)"/>
    
    <!-- State A Badge -->
    <rect x="24" y="20" width="100" height="26" rx="13" fill="#dc2626"/>
    <text x="74" y="37" text-anchor="middle" font-family="${FONT}" font-size="10" font-weight="900" fill="#ffffff" letter-spacing="0.05em">🔴 BEFORE</text>
    
    <!-- Left Object -->
    <g class="movable-item" data-id="${cA.id}" transform="translate(${fmt(midX * 0.5 - 50 * scaleA)} ${fmt(H * 0.52 - 50 * scaleA)}) scale(${scaleA})">
      ${markupA}
    </g>
    <text x="${fmt(midX * 0.5)}" y="${H - 24}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="800" fill="#cbd5e1">${cA.label || cA.id}</text>

    <!-- Right Half: State B -->
    <rect x="${midX}" y="0" width="${midX}" height="${H}" fill="#064e3b"/>
    <rect x="${midX}" y="0" width="${midX}" height="${H}" fill="radial-gradient(circle, #047857, #064e3b)"/>
    
    <!-- State B Badge -->
    <rect x="${W - 124}" y="20" width="100" height="26" rx="13" fill="#10b981"/>
    <text x="${W - 74}" y="37" text-anchor="middle" font-family="${FONT}" font-size="10" font-weight="900" fill="#ffffff" letter-spacing="0.05em">🟢 AFTER</text>

    <!-- Right Object -->
    <g class="movable-item" data-id="${cB.id}" transform="translate(${fmt(midX + midX * 0.5 - 50 * scaleB)} ${fmt(H * 0.52 - 50 * scaleB)}) scale(${scaleB})">
      ${markupB}
    </g>
    <text x="${fmt(midX + midX * 0.5)}" y="${H - 24}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="800" fill="#d1fae5">${cB.label || cB.id}</text>

    <!-- High-Contrast Split Divider -->
    <line x1="${midX}" y1="0" x2="${midX}" y2="${H}" stroke="#ffffff" stroke-width="2.5" stroke-dasharray="6,4"/>
    
    <!-- Center VS Badge -->
    <circle cx="${midX}" cy="${H * 0.5}" r="22" fill="#ffffff" stroke="#0f172a" stroke-width="3"/>
    <text x="${midX}" y="${H * 0.5 + 5.5}" text-anchor="middle" font-family="${FONT}" font-size="12" font-weight="900" fill="#0f172a" letter-spacing="0.05em">VS</text>
  `;

  return svgDoc({ width: W, height: H, viewBox: `0 0 ${W} ${H}`, content, title: 'Before vs After Split' });
}

/**
 * 4. 2.5D Isometric Miniature Diorama
 * Renders objects upon an isometric floating 3D pedestal with ground shadows.
 */
export function renderIsometric(matches, opts = {}) {
  const { style = 'flat', width = 640, height = 360, seed = 1 } = opts;
  const W = width, H = height;
  const uid = newUid();

  const itemList = matches.length
    ? matches.map((m) => ({ c: getConcept(m.id), m })).filter((x) => x.c)
    : [{ c: getConcept('bike'), m: {} }, { c: getConcept('tree'), m: {} }];

  // Floating Isometric Hexagonal Pedestal
  const topY = H * 0.44;
  const botY = H * 0.74;
  const thick = 36;
  const leftX = W * 0.16;
  const rightX = W * 0.84;
  const centerX = W * 0.5;

  const topFace = `M ${centerX} ${topY} L ${rightX} ${H * 0.58} L ${centerX} ${botY} L ${leftX} ${H * 0.58} Z`;
  const leftSide = `M ${leftX} ${H * 0.58} L ${centerX} ${botY} L ${centerX} ${botY + thick} L ${leftX} ${H * 0.58 + thick} Z`;
  const rightSide = `M ${centerX} ${botY} L ${rightX} ${H * 0.58} L ${rightX} ${H * 0.58 + thick} L ${centerX} ${botY + thick} Z`;

  // Place items with isometric depth
  let placedItems = '';
  itemList.forEach(({ c, m }, i) => {
    const frac = (i + 1) / (itemList.length + 1);
    const itemX = leftX + frac * (rightX - leftX);
    // calculate isometric Y on top diamond
    const dX = (itemX - centerX) / (rightX - centerX);
    const itemY = topY + Math.abs(dX) * (H * 0.58 - topY) + (1 - Math.abs(dX)) * (botY - topY) * 0.5;

    const scale = 1.35;
    const shapes = drawConcept(c, {
      ...opts,
      color: m.color,
      expression: m.expression,
      animation: m.animation,
      view: m.view,
      seed: `${seed}:${c.id}:${i}`,
    });
    const markup = shapesToSvg(shapes, style);

    placedItems += `
      <!-- Contact Shadow -->
      <ellipse cx="${fmt(itemX)}" cy="${fmt(itemY)}" rx="${fmt(35 * scale)}" ry="${fmt(12 * scale)}" fill="rgba(0,0,0,0.2)"/>
      
      <!-- Object -->
      <g class="movable-item" data-id="${c.id}" transform="translate(${fmt(itemX - 50 * scale)} ${fmt(itemY - 90 * scale)}) scale(${scale})">
        ${markup}
      </g>
    `;
  });

  const content = `
    <!-- Background Space / Horizon -->
    <rect width="${W}" height="${H}" fill="#0f172a"/>
    <radialGradient id="${uid}-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </radialGradient>
    <rect width="${W}" height="${H}" fill="url(#${uid}-glow)"/>

    <!-- Island Ground Cast Shadow -->
    <ellipse cx="${centerX}" cy="${H * 0.88}" rx="${W * 0.32}" ry="18" fill="rgba(0,0,0,0.45)"/>

    <!-- 3D Pedestal Bevels -->
    <path d="${leftSide}" fill="#334155"/>
    <path d="${rightSide}" fill="#1e293b"/>
    <path d="${topFace}" fill="#475569"/>

    <!-- Grid / Terrain details on top face -->
    <path d="M ${centerX} ${topY} L ${centerX} ${botY}" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
    <path d="M ${leftX} ${H * 0.58} L ${rightX} ${H * 0.58}" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>

    <!-- Objects on island -->
    ${placedItems}

    <!-- Header Tag -->
    <rect x="20" y="16" width="165" height="26" rx="6" fill="rgba(30,41,59,0.85)" stroke="#38bdf8" stroke-width="1"/>
    <text x="28" y="33" font-family="${FONT}" font-size="9" font-weight="900" fill="#38bdf8" letter-spacing="0.08em">📐 2.5D ISOMETRIC DIORAMA</text>
  `;

  return svgDoc({ width: W, height: H, viewBox: `0 0 ${W} ${H}`, content, title: 'Isometric 2.5D Diorama' });
}

/**
 * 5. Pictorial Waffle Chart / Isotype Infographic
 * Represents quantities, percentages, and proportions using repeated pictorial icons.
 */
export function renderWaffle(matches, opts = {}) {
  const { style = 'flat', width = 640, height = 360, seed = 1, text = '' } = opts;
  const W = width, H = height;
  const primaryMatch = matches[0] || { id: 'bike' };
  const c = getConcept(primaryMatch.id) || getConcept('bike');

  // Extract percentage or count if present in text, e.g. "70%", "8 of 10"
  let ratio = 0.8; // default 80%
  const matchPct = text.match(/(\d+)%/);
  if (matchPct) {
    ratio = Math.max(0.1, Math.min(1.0, parseInt(matchPct[1], 10) / 100));
  }
  const totalUnits = 10;
  const activeUnits = Math.round(ratio * totalUnits);
  const pctDisplay = `${Math.round(ratio * 100)}%`;

  const cols = 5;
  const rows = 2;
  const startX = W * 0.12;
  const startY = H * 0.44;
  const cellW = (W * 0.76) / cols;
  const cellH = (H * 0.46) / rows;

  const shapes = drawConcept(c, {
    ...opts,
    color: primaryMatch.color,
    expression: primaryMatch.expression,
    animation: primaryMatch.animation,
    seed,
  });
  const activeMarkup = shapesToSvg(shapes, style);
  const inactiveMarkup = shapesToSvg(shapes, 'silhouette');

  let gridSvg = '';
  for (let i = 0; i < totalUnits; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = startX + col * cellW + cellW / 2;
    const cy = startY + row * cellH + cellH / 2;
    const isActive = i < activeUnits;
    const scale = Math.min((cellW * 0.7) / 100, (cellH * 0.7) / 100);

    gridSvg += `
      <!-- Unit ${i + 1} Container -->
      <g transform="translate(${fmt(cx - 50 * scale)} ${fmt(cy - 50 * scale)}) scale(${fmt(scale)})"${isActive ? '' : ' opacity="0.25"'}>
        ${isActive ? activeMarkup : inactiveMarkup}
      </g>
    `;
  }

  const content = `
    <!-- Background -->
    <rect width="${W}" height="${H}" fill="#ffffff"/>
    <rect x="16" y="14" width="${W - 32}" height="${H - 28}" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>

    <!-- Stat Big Number -->
    <text x="${W * 0.12}" y="${H * 0.22}" font-family="${FONT}" font-size="44" font-weight="900" fill="#2563eb">${pctDisplay}</text>
    <text x="${W * 0.12}" y="${H * 0.32}" font-family="${FONT}" font-size="14" font-weight="800" fill="#0f172a">${activeUnits} in ${totalUnits} ${(c.label || c.id).toUpperCase()} UNITS</text>
    <text x="${W * 0.12}" y="${H * 0.38}" font-family="${FONT}" font-size="10" font-weight="600" fill="#64748b">Pictorial Isotype Metric Distribution // Target Ratio</text>

    <!-- Array -->
    ${gridSvg}

    <!-- Legend -->
    <g transform="translate(${W * 0.65} 32)">
      <circle cx="0" cy="0" r="5" fill="#2563eb"/>
      <text x="10" y="3.5" font-family="${FONT}" font-size="9" font-weight="700" fill="#0f172a">Active (${activeUnits})</text>
      <circle cx="85" cy="0" r="5" fill="#cbd5e1"/>
      <text x="95" y="3.5" font-family="${FONT}" font-size="9" font-weight="700" fill="#64748b">Benchmark (${totalUnits - activeUnits})</text>
    </g>
  `;

  return svgDoc({ width: W, height: H, viewBox: `0 0 ${W} ${H}`, content, title: `${pctDisplay} Isotype Infographic` });
}

/**
 * 6. Coloring Book Mode
 * Clean black & white outline art with numbered/clickable regions and decorative frame.
 */
export function renderColoringBook(matches, opts = {}) {
  const { width = 640, height = 360, seed = 1 } = opts;
  const W = width, H = height;
  const primaryMatch = matches[0] || { id: 'boy' };
  const c = getConcept(primaryMatch.id) || getConcept('boy');

  // Use outline style with thick lines
  const shapes = drawConcept(c, {
    ...opts,
    style: 'outline',
    expression: primaryMatch.expression,
    animation: primaryMatch.animation,
    seed,
  });
  const markup = shapesToSvg(shapes, 'outline', { olk: 1.6 });

  const scale = 2.2;
  const objX = W * 0.5;
  const objY = H * 0.54;

  const content = `
    <!-- Crisp White Page -->
    <rect width="${W}" height="${H}" fill="#ffffff"/>
    
    <!-- Decorative Coloring Border -->
    <rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="8" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-dasharray="8,4"/>
    <rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="6" fill="none" stroke="#e2e8f0" stroke-width="1"/>

    <!-- Title Banner -->
    <text x="${W * 0.5}" y="42" text-anchor="middle" font-family="${FONT}" font-size="14" font-weight="900" fill="#0f172a" letter-spacing="0.06em">🖍 PICTOGEN COLORING PAGE: ${(c.label || c.id).toUpperCase()}</text>
    <text x="${W * 0.5}" y="58" text-anchor="middle" font-family="${FONT}" font-size="9" font-weight="700" fill="#64748b">Click on shapes in the studio to color them, or download &amp; print!</text>

    <!-- Centered Thick Outline Art with clickable regions -->
    <g class="coloring-page-art movable-item" data-id="${c.id}" transform="translate(${fmt(objX - 50 * scale)} ${fmt(objY - 50 * scale)}) scale(${scale})">
      ${markup}
    </g>

    <!-- Bottom Palette Preview Strip -->
    <g transform="translate(${fmt(W * 0.5 - 120)} ${H - 24})">
      <circle cx="0" cy="0" r="8" fill="#ef4444" stroke="#0f172a" stroke-width="1"/>
      <circle cx="30" cy="0" r="8" fill="#f97316" stroke="#0f172a" stroke-width="1"/>
      <circle cx="60" cy="0" r="8" fill="#eab308" stroke="#0f172a" stroke-width="1"/>
      <circle cx="90" cy="0" r="8" fill="#22c55e" stroke="#0f172a" stroke-width="1"/>
      <circle cx="120" cy="0" r="8" fill="#06b6d4" stroke="#0f172a" stroke-width="1"/>
      <circle cx="150" cy="0" r="8" fill="#3b82f6" stroke="#0f172a" stroke-width="1"/>
      <circle cx="180" cy="0" r="8" fill="#a855f7" stroke="#0f172a" stroke-width="1"/>
      <circle cx="210" cy="0" r="8" fill="#ec4899" stroke="#0f172a" stroke-width="1"/>
      <circle cx="240" cy="0" r="8" fill="#78716c" stroke="#0f172a" stroke-width="1"/>
    </g>
  `;

  return svgDoc({ width: W, height: H, viewBox: `0 0 ${W} ${H}`, content, title: `${c.label} Coloring Page` });
}

/**
 * 7. Expressive Stickman Studio Mode (Infographics Show / Alan Becker / MinutePhysics Style)
 * High-contrast cartoon stick figures with extreme facial expressions, humorous props
 * (cardboard throne, crown, banana, rubber stamp, paper), and warm studio yellow background.
 */
export function renderStickman(matches, opts = {}) {
  const { width = 640, height = 480, seed = 1, text = '' } = opts;
  const W = width, H = height;
  const promptLower = text.toLowerCase();
  const uid = newUid();

  // Mode detection from words
  const isKingThrone = /king|throne|crown|banana|stamp|boss|ruler|royal|cardboard/.test(promptLower) || matches.length === 0;
  const isArgue = /argue|fight|debate|mad|angry|shout|yell/.test(promptLower);
  const isDetective = /detective|sherlock|magnify|clue|mystery|inspect/.test(promptLower);
  const isCelebration = /winner|trophy|celebrate|party|rich|money|cash/.test(promptLower);

  const defs = `
    <linearGradient id="${uid}-cardboard-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#dfb887"/>
      <stop offset="100%" stop-color="#be9364"/>
    </linearGradient>
    <linearGradient id="${uid}-cardboard-dark" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ad8256"/>
      <stop offset="100%" stop-color="#936a41"/>
    </linearGradient>
    <linearGradient id="${uid}-banana-peel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff176"/>
      <stop offset="70%" stop-color="#fbc02d"/>
      <stop offset="100%" stop-color="#c49000"/>
    </linearGradient>
    <linearGradient id="${uid}-wood-handle" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#d7ccc8"/>
      <stop offset="50%" stop-color="#8d6e63"/>
      <stop offset="100%" stop-color="#5d4037"/>
    </linearGradient>
    <radialGradient id="${uid}-vignette" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#ffe26a" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#d99f06" stop-opacity="0.35"/>
    </radialGradient>
    <filter id="${uid}-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
    </filter>
  `;

  let sceneContent = '';

  if (isKingThrone) {
    // 👑 The Iconic Banana King on Cardboard Throne with Rubber Stamp vs Skeptical Stickman
    sceneContent = `
      <!-- Ambient Ground Shadows -->
      <ellipse cx="230" cy="${H - 26}" rx="160" ry="16" fill="#000000" opacity="0.18" filter="url(#${uid}-soft-shadow)"/>
      <ellipse cx="505" cy="${H - 30}" rx="48" ry="8" fill="#000000" opacity="0.20" filter="url(#${uid}-soft-shadow)"/>

      <!-- Cardboard Throne -->
      <g id="cardboard-throne">
        <path d="M 120 ${H - 220} L 150 ${H - 360} L 195 ${H - 325} L 235 ${H - 375} L 275 ${H - 325} L 320 ${H - 360} L 350 ${H - 220} Z"
              fill="url(#${uid}-cardboard-grad)" stroke="#222" stroke-width="4.5" stroke-linejoin="round"/>
        <path d="M 150 ${H - 356} L 180 ${H - 230}" stroke="#936a41" stroke-width="3" stroke-linecap="round"/>
        <path d="M 235 ${H - 370} L 235 ${H - 230}" stroke="#936a41" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M 320 ${H - 356} L 290 ${H - 230}" stroke="#936a41" stroke-width="3" stroke-linecap="round"/>

        <!-- Left Armrest Box & Flap -->
        <path d="M 90 ${H - 190} L 155 ${H - 200} L 165 ${H - 60} L 90 ${H - 60} Z"
              fill="url(#${uid}-cardboard-grad)" stroke="#222" stroke-width="4.5" stroke-linejoin="round"/>
        <path d="M 90 ${H - 190} L 55 ${H - 175} L 85 ${H - 130} L 92 ${H - 150}"
              fill="url(#${uid}-cardboard-dark)" stroke="#222" stroke-width="4" stroke-linejoin="round"/>
        <path d="M 90 ${H - 190} L 155 ${H - 200}" stroke="#222" stroke-width="4.5"/>
        <line x1="155" y1="${H - 200}" x2="155" y2="${H - 130}" stroke="#936a41" stroke-width="3"/>

        <!-- Right Armrest Box & Flap -->
        <path d="M 315 ${H - 200} L 380 ${H - 190} L 380 ${H - 60} L 315 ${H - 60} Z"
              fill="url(#${uid}-cardboard-grad)" stroke="#222" stroke-width="4.5" stroke-linejoin="round"/>
        <path d="M 380 ${H - 190} L 415 ${H - 175} L 385 ${H - 130} L 378 ${H - 150}"
              fill="url(#${uid}-cardboard-dark)" stroke="#222" stroke-width="4" stroke-linejoin="round"/>
        <line x1="315" y1="${H - 200}" x2="315" y2="${H - 130}" stroke="#936a41" stroke-width="3"/>

        <!-- Seat Base -->
        <path d="M 155 ${H - 145} L 315 ${H - 145} L 315 ${H - 35} L 155 ${H - 35} Z"
              fill="url(#${uid}-cardboard-grad)" stroke="#222" stroke-width="4.5" stroke-linejoin="round"/>
        <path d="M 155 ${H - 145} L 315 ${H - 145}" stroke="#222" stroke-width="6"/>
        <path d="M 175 ${H - 35} L 175 ${H - 18} L 295 ${H - 18} L 295 ${H - 35} Z"
              fill="url(#${uid}-cardboard-dark)" stroke="#222" stroke-width="4" stroke-linejoin="round"/>

        <!-- Recycling Symbol on front box -->
        <g transform="translate(235, ${H - 88}) scale(0.7)" stroke="#6b4c27" stroke-width="4.5" fill="none" stroke-linejoin="round">
          <path d="M 0 -22 L 18 10 L 8 10 L 14 20 L -6 20 L -12 10 L -2 10 Z"/>
          <path d="M -16 6 L -26 -10 L -18 -10 L -25 -22 L -8 -13 L -13 -6 Z"/>
          <path d="M 16 6 L 8 -6 L 14 -6 L 10 -22 L 26 -13 L 20 -10 Z"/>
        </g>
        <line x1="175" y1="${H - 65}" x2="183" y2="${H - 60}" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round"/>
        <line x1="182" y1="${H - 70}" x2="190" y2="${H - 65}" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round"/>
      </g>

      <!-- KING STICKMAN (Sitting on throne) -->
      <g id="king-stickman">
        <line x1="230" y1="${H - 300}" x2="235" y2="${H - 195}" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
        <!-- Legs -->
        <polyline points="235,${H - 195} 210,${H - 190} 205,${H - 135} 185,${H - 135}"
                  fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
        <ellipse cx="180" cy="${H - 135}" rx="12" ry="6" fill="#000"/>
        <polyline points="235,${H - 195} 270,${H - 180} 305,${H - 180} 305,${H - 128} 325,${H - 128}"
                  fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
        <ellipse cx="330" cy="${H - 128}" rx="12" ry="6" fill="#000"/>

        <!-- Left Arm: Stamping Document -->
        <polyline points="230,${H - 270} 145,${H - 275} 135,${H - 235}"
                  fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- Document Sheet -->
        <g transform="translate(75, ${H - 245}) rotate(8)">
          <rect x="0" y="0" width="85" height="115" rx="4" fill="#ffffff" stroke="#222" stroke-width="3.5"/>
          <rect x="10" y="14" width="18" height="18" rx="2" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>
          <line x1="34" y1="23" x2="72" y2="23" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
          <rect x="10" y="44" width="18" height="18" rx="2" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
          <path d="M 12 52 L 18 58 L 26 44" fill="none" stroke="#dc2626" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="34" y1="53" x2="72" y2="53" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
          <rect x="10" y="74" width="18" height="18" rx="2" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/>
          <line x1="34" y1="83" x2="72" y2="83" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
          <line x1="12" y1="102" x2="55" y2="102" stroke="#cbd5e1" stroke-width="2"/>
        </g>

        <!-- Rubber Stamp -->
        <g transform="translate(130, ${H - 225})">
          <rect x="-35" y="-14" width="70" height="26" rx="4" fill="url(#${uid}-cardboard-grad)" stroke="#222" stroke-width="3.5"/>
          <rect x="-32" y="10" width="64" height="6" rx="2" fill="#1e293b"/>
          <path d="M -10 -14 C -10 -28 -18 -38 -14 -56 C -10 -72 10 -72 14 -56 C 18 -38 10 -28 10 -14 Z"
                fill="url(#${uid}-wood-handle)" stroke="#222" stroke-width="3.5"/>
          <ellipse cx="0" cy="-62" rx="14" ry="10" fill="url(#${uid}-wood-handle)" stroke="#222" stroke-width="3.5"/>
        </g>
        <ellipse cx="130" cy="${H - 275}" rx="9" ry="7" fill="#000"/>
        <ellipse cx="123" cy="${H - 272}" rx="5" ry="4" fill="#000"/>

        <!-- Right Arm: Holding Peeled Banana -->
        <polyline points="230,${H - 270} 275,${H - 280} 325,${H - 245}"
                  fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
        <g transform="translate(340, ${H - 270}) rotate(-18)">
          <path d="M -6 -18 C -2 -42 16 -50 26 -56 C 24 -40 18 -26 12 -12 Z" fill="#fffde7" stroke="#222" stroke-width="3" stroke-linejoin="round"/>
          <path d="M -4 -16 C -18 -32 -32 -28 -36 -12 C -24 -16 -12 -12 -4 -4 Z" fill="url(#${uid}-banana-peel)" stroke="#222" stroke-width="3" stroke-linejoin="round"/>
          <path d="M 2 -12 C 4 -28 12 -38 22 -30 C 18 -20 12 -12 4 -2 Z" fill="url(#${uid}-banana-peel)" stroke="#222" stroke-width="3" stroke-linejoin="round"/>
          <path d="M -8 -8 C -14 18 -8 40 4 58 C 12 50 16 35 12 10 C 6 2 0 -2 -8 -8 Z" fill="url(#${uid}-banana-peel)" stroke="#222" stroke-width="3.5" stroke-linejoin="round"/>
          <path d="M 4 58 C 7 64 10 68 12 72 L 8 74 C 6 68 3 62 4 58 Z" fill="#689f38"/>
        </g>
        <ellipse cx="335" cy="${H - 250}" rx="9" ry="8" fill="#000"/>

        <!-- King Head -->
        <g id="king-head" transform="translate(230, ${H - 340})">
          <circle cx="0" cy="0" r="44" fill="#ffffff" stroke="#000000" stroke-width="6.5"/>
          <!-- Cardboard Crown -->
          <path d="M -42 -26 L -48 -75 L -20 -50 L 0 -82 L 20 -50 L 48 -75 L 42 -26 Z"
                fill="url(#${uid}-cardboard-grad)" stroke="#000000" stroke-width="5" stroke-linejoin="round"/>
          <line x1="-20" y1="-50" x2="-18" y2="-28" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round"/>
          <line x1="0" y1="-78" x2="0" y2="-26" stroke="#8a5a2b" stroke-width="3.5" stroke-linecap="round"/>
          <line x1="20" y1="-50" x2="18" y2="-28" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round"/>

          <!-- Laughing Face Expression -->
          <path d="M -26 -16 Q -14 -28 0 -18" fill="none" stroke="#000" stroke-width="4.5" stroke-linecap="round"/>
          <path d="M 12 -18 Q 24 -28 36 -14" fill="none" stroke="#000" stroke-width="4.5" stroke-linecap="round"/>
          <circle cx="-14" cy="-4" r="11" fill="#fff" stroke="#000" stroke-width="3.5"/>
          <circle cx="-12" cy="-4" r="5" fill="#000"/>
          <!-- Winking Right Eye -->
          <path d="M 14 -7 Q 24 -14 34 -4" fill="none" stroke="#000" stroke-width="4.5" stroke-linecap="round"/>
          <path d="M 14 0 Q 24 8 34 -2" fill="none" stroke="#000" stroke-width="4.5" stroke-linecap="round"/>
          <!-- Mouth -->
          <path d="M -22 10 Q 5 12 28 14 Q 24 38 -5 36 Q -20 32 -22 10 Z" fill="#000" stroke="#000" stroke-width="3.5"/>
          <path d="M -20 12 L 26 15 L 23 20 L -18 18 Z" fill="#ffffff"/>
          <path d="M -10 28 Q 2 24 16 28 Q 12 36 -4 35 Z" fill="#ef4444"/>
        </g>
      </g>

      <!-- SKEPTICAL STICKMAN (Standing on right, observing) -->
      <g id="skeptical-stickman" transform="translate(505, 0)">
        <line x1="0" y1="${H - 265}" x2="0" y2="${H - 125}" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
        <line x1="0" y1="${H - 125}" x2="-14" y2="${H - 32}" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
        <ellipse cx="-24" cy="${H - 30}" rx="14" ry="6" fill="#000"/>
        <line x1="0" y1="${H - 125}" x2="18" y2="${H - 32}" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
        <ellipse cx="28" cy="${H - 30}" rx="14" ry="6" fill="#000"/>
        <!-- Hand on Hip -->
        <polyline points="0,${H - 245} -35,${H - 215} -14,${H - 185}" fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
        <ellipse cx="-12" cy="${H - 185}" rx="7" ry="6" fill="#000"/>
        <polyline points="0,${H - 245} 25,${H - 200} 22,${H - 150}" fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
        <circle cx="22" cy="${H - 146}" r="7" fill="#000"/>
        <line x1="20" y1="${H - 144}" x2="18" y2="${H - 134}" stroke="#000" stroke-width="3" stroke-linecap="round"/>
        <line x1="24" y1="${H - 144}" x2="24" y2="${H - 132}" stroke="#000" stroke-width="3" stroke-linecap="round"/>

        <!-- Head & Skeptical Side-Eye Face -->
        <g id="skeptical-head" transform="translate(0, ${H - 310})">
          <circle cx="0" cy="0" r="42" fill="#ffffff" stroke="#000" stroke-width="6.5"/>
          <path d="M -26 -16 L -4 -16" stroke="#000" stroke-width="5" stroke-linecap="round"/>
          <path d="M 6 -24 Q 18 -26 28 -18" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round"/>
          <!-- Left Eye -->
          <g transform="translate(-16, -6)">
            <circle cx="0" cy="0" r="10" fill="#fff" stroke="#000" stroke-width="3.5"/>
            <circle cx="-5" cy="0" r="4.5" fill="#000"/>
            <path d="M -11 -2 L 11 -2" stroke="#000" stroke-width="4.5" stroke-linecap="round"/>
          </g>
          <!-- Right Eye -->
          <g transform="translate(16, -6)">
            <circle cx="0" cy="0" r="10" fill="#fff" stroke="#000" stroke-width="3.5"/>
            <circle cx="-5" cy="0" r="4.5" fill="#000"/>
            <path d="M -11 -2 L 11 -2" stroke="#000" stroke-width="4.5" stroke-linecap="round"/>
          </g>
          <line x1="-14" y1="18" x2="16" y2="17" stroke="#000" stroke-width="5" stroke-linecap="round"/>
        </g>
      </g>
    `;
  } else {
    // 🎭 Expressive Stickman Character & Scenario
    const personMatch = matches.find(m => ['boy', 'girl', 'man', 'woman', 'child', 'person', 'student'].includes(m.id));
    const objectMatches = matches.filter(m => !['boy', 'girl', 'man', 'woman', 'child', 'person', 'student'].includes(m.id));
    const isMultiPerson = matches.filter(m => ['boy', 'girl', 'man', 'woman', 'child', 'person', 'student'].includes(m.id)).length > 1 || /two|both|vs|argue|debate|friends/.test(promptLower);

    // Expression detection from prompt
    let expression = 'happy';
    if (/sad|cry|unhappy|depressed|grief/.test(promptLower)) expression = 'sad';
    else if (/laugh|laughing|lol|haha|hilarious/.test(promptLower)) expression = 'laugh';
    else if (/angry|mad|furious|shout|rage/.test(promptLower)) expression = 'angry';
    else if (/surprised|shock|shocked|omg|wow/.test(promptLower)) expression = 'surprised';
    else if (/skeptical|side-eye|doubt|cynical/.test(promptLower)) expression = 'skeptical';
    else if (/wink|winking|playful/.test(promptLower)) expression = 'wink';

    if (isMultiPerson) {
      // Two Stick Figures interacting
      const leftExpr = /sad/.test(promptLower) ? 'sad' : 'laugh';
      const rightExpr = /skeptical|angry/.test(promptLower) ? 'skeptical' : 'happy';

      sceneContent = `
        <ellipse cx="${W * 0.35}" cy="${H - 35}" rx="55" ry="10" fill="#000000" opacity="0.18" filter="url(#${uid}-soft-shadow)"/>
        <ellipse cx="${W * 0.65}" cy="${H - 35}" rx="55" ry="10" fill="#000000" opacity="0.18" filter="url(#${uid}-soft-shadow)"/>

        <!-- Stickman 1 (Left) -->
        <g transform="translate(${W * 0.35}, 0)">
          <line x1="0" y1="${H - 260}" x2="0" y2="${H - 130}" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
          <line x1="0" y1="${H - 130}" x2="-18" y2="${H - 35}" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
          <ellipse cx="-26" cy="${H - 35}" rx="14" ry="6" fill="#000"/>
          <line x1="0" y1="${H - 130}" x2="18" y2="${H - 35}" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
          <ellipse cx="26" cy="${H - 35}" rx="14" ry="6" fill="#000"/>
          <polyline points="0,${H - 240} 40,${H - 215} 65,${H - 200}" fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
          <polyline points="0,${H - 240} -30,${H - 200} -25,${H - 150}" fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
          
          <g transform="translate(0, ${H - 305})">
            <circle cx="0" cy="0" r="42" fill="#fff" stroke="#000" stroke-width="6.5"/>
            <circle cx="-14" cy="-5" r="8" fill="#000"/>
            <circle cx="14" cy="-5" r="8" fill="#000"/>
            <circle cx="-16" cy="-8" r="2.8" fill="#fff"/>
            <circle cx="12" cy="-8" r="2.8" fill="#fff"/>
            <path d="M -22 -18 Q -14 -28 -6 -18" fill="none" stroke="#000" stroke-width="4.5" stroke-linecap="round"/>
            <path d="M 6 -18 Q 14 -28 22 -18" fill="none" stroke="#000" stroke-width="4.5" stroke-linecap="round"/>
            <path d="M -18 10 Q 0 32 18 10 Z" fill="#000" stroke="#000" stroke-width="3"/>
            <path d="M -14 10 L 14 10 L 12 16 L -12 16 Z" fill="#fff"/>
          </g>
        </g>

        <!-- Stickman 2 (Right) -->
        <g transform="translate(${W * 0.65}, 0)">
          <line x1="0" y1="${H - 260}" x2="0" y2="${H - 130}" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
          <line x1="0" y1="${H - 130}" x2="-16" y2="${H - 35}" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
          <ellipse cx="-24" cy="${H - 35}" rx="14" ry="6" fill="#000"/>
          <line x1="0" y1="${H - 130}" x2="16" y2="${H - 35}" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
          <ellipse cx="24" cy="${H - 35}" rx="14" ry="6" fill="#000"/>
          <polyline points="0,${H - 240} -35,${H - 210} -15,${H - 180}" fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
          <polyline points="0,${H - 240} 25,${H - 200} 20,${H - 150}" fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
          
          <g transform="translate(0, ${H - 305})">
            <circle cx="0" cy="0" r="42" fill="#fff" stroke="#000" stroke-width="6.5"/>
            <path d="M -22 -20 L -6 -16" stroke="#000" stroke-width="5" stroke-linecap="round"/>
            <path d="M 6 -24 Q 16 -28 26 -20" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round"/>
            <g transform="translate(-14, -5)">
              <circle cx="0" cy="0" r="9" fill="#fff" stroke="#000" stroke-width="3"/>
              <circle cx="-3" cy="0" r="4.5" fill="#000"/>
              <line x1="-10" y1="-2" x2="10" y2="-2" stroke="#000" stroke-width="4" stroke-linecap="round"/>
            </g>
            <g transform="translate(14, -5)">
              <circle cx="0" cy="0" r="9" fill="#fff" stroke="#000" stroke-width="3"/>
              <circle cx="-3" cy="0" r="4.5" fill="#000"/>
              <line x1="-10" y1="-2" x2="10" y2="-2" stroke="#000" stroke-width="4" stroke-linecap="round"/>
            </g>
            <line x1="-12" y1="16" x2="14" y2="15" stroke="#000" stroke-width="4.5" stroke-linecap="round"/>
          </g>
        </g>
      `;
    } else {
      // 🧍 Single Main Stick Figure (The requested person!)
      const role = personMatch ? personMatch.id : 'boy';
      const isGirl = role === 'girl' || role === 'woman';
      const centerX = objectMatches.length ? W * 0.42 : W * 0.5;

      let faceMarkup = '';
      if (expression === 'sad') {
        faceMarkup = `
          <line x1="-24" y1="-18" x2="-6" y2="-24" stroke="#000" stroke-width="5" stroke-linecap="round"/>
          <line x1="24" y1="-18" x2="6" y2="-24" stroke="#000" stroke-width="5" stroke-linecap="round"/>
          <circle cx="-14" cy="-5" r="7" fill="#000"/>
          <circle cx="14" cy="-5" r="7" fill="#000"/>
          <path d="M -18 18 Q 0 4 18 18" fill="none" stroke="#000" stroke-width="5.5" stroke-linecap="round"/>
          <circle cx="-20" cy="4" r="3.5" fill="#0284c7"/>
        `;
      } else if (expression === 'laugh') {
        faceMarkup = `
          <path d="M -24 -18 Q -14 -28 -4 -18" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round"/>
          <path d="M 6 -18 Q 16 -28 26 -18" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round"/>
          <circle cx="-14" cy="-5" r="8" fill="#000"/>
          <path d="M 8 -8 Q 18 -16 26 -5" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round"/>
          <path d="M 8 0 Q 18 8 26 -2" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round"/>
          <path d="M -20 8 Q 0 34 20 8 Z" fill="#000" stroke="#000" stroke-width="3"/>
          <path d="M -16 8 L 16 8 L 14 14 L -14 14 Z" fill="#fff"/>
          <path d="M -8 24 Q 0 20 8 24 Q 4 30 -4 30 Z" fill="#ef4444"/>
        `;
      } else if (expression === 'angry') {
        faceMarkup = `
          <line x1="-24" y1="-26" x2="-4" y2="-16" stroke="#000" stroke-width="6" stroke-linecap="round"/>
          <line x1="24" y1="-26" x2="4" y2="-16" stroke="#000" stroke-width="6" stroke-linecap="round"/>
          <circle cx="-14" cy="-5" r="7" fill="#000"/>
          <circle cx="14" cy="-5" r="7" fill="#000"/>
          <path d="M -16 16 Q 0 8 16 16" fill="none" stroke="#000" stroke-width="5.5" stroke-linecap="round"/>
        `;
      } else {
        // Happy / smiling default
        faceMarkup = `
          <path d="M -24 -18 Q -14 -28 -4 -18" fill="none" stroke="#000" stroke-width="4.5" stroke-linecap="round"/>
          <path d="M 4 -18 Q 14 -28 24 -18" fill="none" stroke="#000" stroke-width="4.5" stroke-linecap="round"/>
          <circle cx="-14" cy="-5" r="8" fill="#000"/>
          <circle cx="14" cy="-5" r="8" fill="#000"/>
          <circle cx="-16" cy="-8" r="2.8" fill="#fff"/>
          <circle cx="12" cy="-8" r="2.8" fill="#fff"/>
          <path d="M -16 10 Q 0 26 16 10" fill="none" stroke="#000" stroke-width="5.5" stroke-linecap="round"/>
        `;
      }

      // Hair ribbons for girl
      const girlHair = isGirl ? `
        <path d="M -40 -6 Q -48 24 -36 32" stroke="#000" stroke-width="5" stroke-linecap="round" fill="none"/>
        <path d="M 40 -6 Q 48 24 36 32" stroke="#000" stroke-width="5" stroke-linecap="round" fill="none"/>
      ` : '';

      // Draw secondary objects (e.g., bike, apple, tree) if present
      let propsMarkup = '';
      if (objectMatches.length) {
        const objC = getConcept(objectMatches[0].id);
        if (objC) {
          const shapes = drawConcept(objC, { seed });
          const objSvg = shapesToSvg(shapes, 'flat');
          propsMarkup = `
            <ellipse cx="${W * 0.72}" cy="${H - 35}" rx="50" ry="10" fill="#000000" opacity="0.16" filter="url(#${uid}-soft-shadow)"/>
            <g transform="translate(${W * 0.65}, ${H - 240}) scale(1.4)">
              ${objSvg}
            </g>
          `;
        }
      }

      sceneContent = `
        <!-- Ground Shadow -->
        <ellipse cx="${centerX}" cy="${H - 32}" rx="65" ry="12" fill="#000000" opacity="0.2" filter="url(#${uid}-soft-shadow)"/>

        <!-- The Stickman Character -->
        <g id="stickman-hero" transform="translate(${centerX}, 0)">
          <!-- Legs -->
          <line x1="0" y1="${H - 135}" x2="-18" y2="${H - 32}" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
          <ellipse cx="-26" cy="${H - 30}" rx="14" ry="6.5" fill="#000"/>
          <line x1="0" y1="${H - 135}" x2="18" y2="${H - 32}" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>
          <ellipse cx="26" cy="${H - 30}" rx="14" ry="6.5" fill="#000"/>

          <!-- Torso Spine -->
          <line x1="0" y1="${H - 265}" x2="0" y2="${H - 135}" stroke="#000" stroke-width="6.5" stroke-linecap="round"/>

          <!-- Arms -->
          <polyline points="0,${H - 245} -35,${H - 215} -20,${H - 170}" fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
          <ellipse cx="-18" cy="${H - 170}" rx="8" ry="7" fill="#000"/>
          <polyline points="0,${H - 245} 35,${H - 215} 25,${H - 170}" fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
          <ellipse cx="25" cy="${H - 170}" rx="8" ry="7" fill="#000"/>

          <!-- Head & Expressive Face -->
          <g transform="translate(0, ${H - 310})">
            <circle cx="0" cy="0" r="44" fill="#ffffff" stroke="#000000" stroke-width="6.5"/>
            ${girlHair}
            ${faceMarkup}
          </g>
        </g>

        ${propsMarkup}
      `;
    }
  }

  const content = `
    ${defs}
    <!-- Studio Warm Yellow Background -->
    <rect width="${W}" height="${H}" fill="#fed136"/>
    <rect width="${W}" height="${H}" fill="url(#${uid}-vignette)"/>

    ${sceneContent}
  `;

  return svgDoc({ width: W, height: H, viewBox: `0 0 ${W} ${H}`, content, title: 'Expressive Stickman Scene' });
}

/**
 * 8. Newspaper Comic Strip Mode (Style 3 from roadmap)
 * 3-panel horizontal sequential comic strip with ink panel borders,
 * speech bubbles, and narrative progression (Setup, Conflict, Punchline).
 */
export function renderComicStrip(matches, opts = {}) {
  const { width = 840, height = 320, seed = 1, text = 'a boy on an adventure', style = 'comic' } = opts;
  const W = width, H = height;
  const panelStyle = ['stickman', 'cute2d', 'editorial', 'geometric', 'whiteboard', 'doodle', 'papercut'].includes(style) ? style : 'comic';

  const titleText = (text || 'COMIC STRIP').toUpperCase();
  const primary = matches[0] || { id: 'boy' };
  const secondary = matches[1] || { id: 'apple' };

  const c1 = getConcept(primary.id) || getConcept('boy');
  const c2 = getConcept(secondary.id) || getConcept('apple');

  const pW = (W - 48) / 3;
  const pH = H - 85;
  const pY = 46;

  // Render shapes for each panel using the same character seed so the character stays 100% consistent across frames
  const s1 = shapesToSvg(drawConcept(c1, { seed, expression: 'happy', animation: 'walk', style: panelStyle }), panelStyle, { olk: 1.2 });
  const s2Char = shapesToSvg(drawConcept(c1, { seed, expression: 'surprised', animation: 'point', style: panelStyle }), panelStyle, { olk: 1.2 });
  const s2Obj = shapesToSvg(drawConcept(c2, { seed: seed + 1, style: panelStyle }), panelStyle, { olk: 1.2 });
  const s3 = shapesToSvg(drawConcept(c1, { seed, expression: 'laugh', animation: 'thumbsup', style: panelStyle }), panelStyle, { olk: 1.2 });

  const content = `
    <!-- Vintage Newsprint Paper Background -->
    <rect width="${W}" height="${H}" fill="#fbf9f4"/>
    
    <!-- Halftone Texture Hint / Paper Grain -->
    <rect width="${W}" height="${H}" fill="none" stroke="#111827" stroke-width="4"/>

    <!-- Header Strip Banner -->
    <rect x="8" y="8" width="${W - 16}" height="28" fill="#111827"/>
    <text x="24" y="27" font-family="${FONT}" font-size="12" font-weight="900" fill="#ffffff" letter-spacing="0.08em">📰 THE PICTOGEN CHRONICLES</text>
    <text x="${W - 24}" y="27" text-anchor="end" font-family="${FONT}" font-size="11" font-weight="700" fill="#fbbf24" letter-spacing="0.05em">STRIP #${seed} • ${esc(titleText.substring(0, 32))}</text>

    <!-- ================= PANEL 1: SETUP ================= -->
    <g id="panel-1" transform="translate(12, ${pY})">
      <rect width="${pW}" height="${pH}" fill="#ffffff" stroke="#111827" stroke-width="3.5"/>
      <!-- Panel Header Badge -->
      <rect x="8" y="8" width="56" height="16" rx="2" fill="#e2e8f0"/>
      <text x="36" y="20" text-anchor="middle" font-family="${FONT}" font-size="9" font-weight="800" fill="#0f172a">1. SETUP</text>

      <!-- Speech Bubble -->
      <path d="M 60 48 Q 60 30 110 30 L 190 30 Q 240 30 240 48 Q 240 66 190 66 L 140 66 L 125 78 L 132 66 L 110 66 Q 60 66 60 48 Z"
            fill="#ffffff" stroke="#111827" stroke-width="2.5"/>
      <text x="150" y="52" text-anchor="middle" font-family="${FONT}" font-size="10.5" font-weight="800" fill="#111827">What a lovely day!</text>

      <!-- Character in Panel 1 -->
      <g transform="translate(${pW * 0.5 - 45}, ${pH * 0.45}) scale(1.1)">
        ${s1}
      </g>
    </g>

    <!-- ================= PANEL 2: CONFLICT / ACTION ================= -->
    <g id="panel-2" transform="translate(${12 + pW + 12}, ${pY})">
      <rect width="${pW}" height="${pH}" fill="#ffffff" stroke="#111827" stroke-width="3.5"/>
      <rect x="8" y="8" width="70" height="16" rx="2" fill="#e2e8f0"/>
      <text x="43" y="20" text-anchor="middle" font-family="${FONT}" font-size="9" font-weight="800" fill="#0f172a">2. DISCOVERY</text>

      <!-- Thought / Surprise Bubble -->
      <path d="M 50 48 Q 50 30 110 30 L 190 30 Q 250 30 250 48 Q 250 66 190 66 L 140 66 L 125 78 L 132 66 L 110 66 Q 50 66 50 48 Z"
            fill="#ffffff" stroke="#111827" stroke-width="2.5"/>
      <text x="150" y="52" text-anchor="middle" font-family="${FONT}" font-size="10.5" font-weight="800" fill="#111827">Look what I found!!</text>

      <!-- Action lines / Exclamation -->
      <path d="M 40 100 L 25 90 M 45 90 L 35 75 M 55 85 L 50 70" stroke="#111827" stroke-width="2.5" stroke-linecap="round"/>

      <!-- Consistent Character + Object Interaction -->
      <g transform="translate(${pW * 0.22 - 35}, ${pH * 0.45}) scale(1.05)">
        ${s2Char}
      </g>
      <g transform="translate(${pW * 0.68 - 35}, ${pH * 0.48}) scale(1.0)">
        ${s2Obj}
      </g>
    </g>

    <!-- ================= PANEL 3: PUNCHLINE ================= -->
    <g id="panel-3" transform="translate(${12 + (pW + 12) * 2}, ${pY})">
      <rect width="${pW}" height="${pH}" fill="#ffffff" stroke="#111827" stroke-width="3.5"/>
      <rect x="8" y="8" width="72" height="16" rx="2" fill="#fef08a"/>
      <text x="44" y="20" text-anchor="middle" font-family="${FONT}" font-size="9" font-weight="900" fill="#854d0e">3. PUNCHLINE</text>

      <!-- Punchline Speech Bubble (Spiky Starburst) -->
      <polygon points="130,26 150,33 175,24 185,38 215,35 210,50 235,58 215,70 230,82 205,86 210,100 185,92 165,102 155,88 135,94 140,78 115,74 135,62 120,48 140,45"
               fill="#fef08a" stroke="#111827" stroke-width="2.5"/>
      <text x="175" y="66" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="900" fill="#111827">HAHA! AWESOME!</text>

      <!-- Laughing character -->
      <g transform="translate(${pW * 0.5 - 45}, ${pH * 0.45}) scale(1.1)">
        ${s3}
      </g>
    </g>

    <!-- Footer Copyright & Issue -->
    <text x="${W * 0.5}" y="${H - 12}" text-anchor="middle" font-family="${FONT}" font-size="9.5" font-weight="700" fill="#64748b" letter-spacing="0.05em">
      © PICTOGEN SYNDICATE • VECTOR COMIC ENGINE • OFFLINE &amp; PROGRAMMATIC
    </text>
  `;

  return svgDoc({ width: W, height: H, viewBox: `0 0 ${W} ${H}`, content, title: 'Newspaper Comic Strip' });
}

/**
 * 13. Alphabet Pals / Word Spelling Presentation Mode
 * Renders letters from A to Z as cute living character creatures with big kawaii eyes,
 * hands, and legs. Supports full word spelling ("LOVE", "CAT", "HELLO", "ABC")
 * or Phonics showcase ("A is for Apple").
 */
export function renderAlphabet(matches, opts = {}) {
  const { style = 'flat', width = 640, height = 360, seed = 1, text = '' } = opts;
  const W = width, H = height;
  const rng = createRng(seed);

  // Extract letters to spell
  let rawLetters = [];
  const pal = (id) => /^(letter|number)_/.test(id);
  // "count to 5" -> 1 2 3 4 5; otherwise the letters and digits of the prompt
  const counting = text.match(/\bcount(?:ing)?\s+(?:from\s+(\d)\s+)?to\s+(\d)\b/i);
  const cleanText = counting ? '' : text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  // Check if prompt is a phonics pair: e.g. "A is for Apple" or "C is for Cat"
  const isPhonics = !counting && (/^[A-Z]\s+(is\s+for|for)\s+/i.test(text.trim()) ||
                    (matches.length > 0 && matches.some(m => !pal(m.id))));

  let heroLetter = 'A';
  let phonicsConcept = null;

  if (isPhonics) {
    const firstLetterMatch = text.match(/letter\s+([A-Z])/i) || text.match(/^([A-Z])/i);
    heroLetter = firstLetterMatch ? firstLetterMatch[1].toUpperCase() : 'A';
    phonicsConcept = matches.find(m => !pal(m.id)) || { id: 'apple' };
  } else if (counting) {
    const from = Math.min(+(counting[1] ?? 1), +counting[2]);
    for (let n = from; n <= +counting[2] && rawLetters.length < 8; n++) rawLetters.push(String(n));
  } else if (cleanText.length > 0) {
    rawLetters = cleanText.slice(0, 8).split(''); // Max 8 letters on stage
  } else if (matches.length > 0) {
    for (const m of matches) {
      if (pal(m.id)) rawLetters.push(m.id.replace(/^(letter|number)_/, '').toUpperCase());
    }
  }

  if (rawLetters.length === 0 && !isPhonics) {
    rawLetters = ['A', 'B', 'C'];
  }

  // Stage Background: Warm festive pastel gradient, star bunting & stage baseline
  let content = `
    <!-- Cheerful Stage Backdrop -->
    <rect width="${W}" height="${H}" fill="#fffdfa"/>
    <rect y="${H * 0.72}" width="${W}" height="${H * 0.28}" fill="#f8fafc"/>
    <line x1="0" y1="${H * 0.72}" x2="${W}" y2="${H * 0.72}" stroke="#e2e8f0" stroke-width="3"/>

    <!-- Stage Floor Planks -->
    <line x1="0" y1="${H * 0.86}" x2="${W}" y2="${H * 0.86}" stroke="#f1f5f9" stroke-width="2"/>

    <!-- Colorful Bunting Pennants Banner across Top -->
    <g opacity="0.85">
      <path d="M 0 16 Q ${W * 0.5} 32 ${W} 16" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="4,4"/>
  `;

  // Draw colorful triangular bunting flags
  const flagColors = ['#ff4d6d', '#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#f97316'];
  const numFlags = 12;
  for (let f = 0; f < numFlags; f++) {
    const fx = (W / (numFlags + 1)) * (f + 1);
    const fy = 16 + Math.sin((f / numFlags) * Math.PI) * 12;
    const col = flagColors[f % flagColors.length];
    content += `<polygon points="${fx - 12},${fy} ${fx + 12},${fy} ${fx},${fy + 18}" fill="${col}"/>`;
  }
  content += `</g>`;

  // Star sparkles in background
  for (let s = 0; s < 14; s++) {
    const sx = (rng() * (W - 40) + 20).toFixed(1);
    const sy = (rng() * (H * 0.6) + 30).toFixed(1);
    const scol = flagColors[s % flagColors.length];
    content += `
      <g transform="translate(${sx}, ${sy}) scale(0.7)" opacity="0.65" class="pg-env-star" style="animation-delay: ${(s * 0.25).toFixed(2)}s;">
        <path d="M 0 -8 Q 0 0 8 0 Q 0 0 0 8 Q 0 0 -8 0 Q 0 0 0 -8 Z" fill="${scol}"/>
      </g>
    `;
  }

  if (isPhonics && phonicsConcept) {
    // -----------------------------------------------------------------
    // PHONICS SHOWCASE: "A is for Apple"
    // -----------------------------------------------------------------
    const cObj = getConcept(phonicsConcept.id) || getConcept('apple');
    const letterPal = LETTER_PALETTES[heroLetter] || LETTER_PALETTES.A;
    const letterKit = createKit();
    drawLetterCreature(letterKit, { opts: { animation: 'wave', expression: 'happy' } }, heroLetter);
    const letterSvg = shapesToSvg(letterKit.shapes, style, { olk: 1 });

    const objKit = createKit();
    const objShapes = drawConcept(cObj, { seed: 1, style, color: phonicsConcept.color });
    const objSvg = shapesToSvg(objShapes, style, { olk: 1 });

    const groundY = H * 0.72;
    const scale = Math.min(1.75, (H * 0.48) / 100);

    content += `
      <!-- Ground Shadows -->
      <ellipse cx="${W * 0.32}" cy="${groundY + 8}" rx="${48 * scale}" ry="8" fill="#000000" opacity="0.12"/>
      <ellipse cx="${W * 0.68}" cy="${groundY + 8}" rx="${42 * scale}" ry="7" fill="#000000" opacity="0.12"/>

      <!-- Hero Letter Creature (Left) -->
      <g transform="translate(${W * 0.32 - 50 * scale}, ${groundY - 94 * scale}) scale(${scale})">
        ${letterSvg}
      </g>

      <!-- Showcase Concept Object (Right) -->
      <g transform="translate(${W * 0.68 - 50 * scale}, ${groundY - 94 * scale}) scale(${scale})">
        ${objSvg}
      </g>

      <!-- Connecting Phonics Heart / Badge -->
      <g transform="translate(${W * 0.5}, ${groundY - 45}) scale(1.05)">
        <circle cx="0" cy="0" r="24" fill="#ffffff" stroke="${letterPal.main}" stroke-width="3"/>
        <text x="0" y="6" text-anchor="middle" font-family="${FONT}" font-size="12" font-weight="900" fill="${letterPal.main}">IS FOR</text>
      </g>

      <!-- Phonics Word Title Banner at Bottom -->
      <g transform="translate(${W * 0.5}, ${H - 26})">
        <rect x="-140" y="-20" width="280" height="34" rx="17" fill="${letterPal.main}" stroke="#ffffff" stroke-width="2"/>
        <text x="0" y="4" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="900" fill="#ffffff" letter-spacing="0.05em">
          ${heroLetter} is for ${(cObj.label || cObj.id).toUpperCase()}
        </text>
      </g>
    `;
  } else {
    // -----------------------------------------------------------------
    // WORD SPELLING / WORD PALS: e.g. "C A T" or "L O V E" or "A B C"
    // -----------------------------------------------------------------
    const N = rawLetters.length;
    let scale = N === 1 ? 2.2 : N <= 3 ? 1.55 : N <= 5 ? 1.3 : N <= 6 ? 1.15 : 0.95;
    const itemWidth = 85 * scale;
    const totalW = N * itemWidth;
    const startX = (W - totalW) / 2 + itemWidth / 2;
    const groundY = H * 0.72;

    const animOptions = ['jump', 'wave', 'dance', 'cheer', 'blink'];
    const exprOptions = ['happy', 'laugh', 'wink', 'surprised'];

    content += `<!-- Letterlings Row -->`;

    rawLetters.forEach((char, idx) => {
      const cx = startX + idx * itemWidth;
      const anim = animOptions[idx % animOptions.length];
      const expr = exprOptions[idx % exprOptions.length];
      const letterPal = LETTER_PALETTES[char] || LETTER_PALETTES.A;

      const letterKit = createKit();
      drawLetterCreature(letterKit, { opts: { animation: anim, expression: expr } }, char);
      const letterSvg = shapesToSvg(letterKit.shapes, style, { olk: 1 });

      content += `
        <!-- Ground Shadow -->
        <ellipse cx="${cx}" cy="${groundY + 4}" rx="${28 * scale}" ry="${5 * scale}" fill="#000000" opacity="0.13"/>

        <!-- Letterling ${char} -->
        <g transform="translate(${cx - 50 * scale}, ${groundY - 94 * scale}) scale(${scale})">
          ${letterSvg}
        </g>

        <!-- Underneath Alphabet Tile / Block -->
        <g transform="translate(${cx}, ${H * 0.88})">
          <rect x="-18" y="-18" width="36" height="36" rx="8" fill="#ffffff" stroke="${letterPal.main}" stroke-width="2.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))"/>
          <text x="0" y="7" text-anchor="middle" font-family="${FONT}" font-size="20" font-weight="900" fill="${letterPal.main}">${char}</text>
        </g>
      `;
    });

    // Word Header Tag
    content += `
      <g transform="translate(${W * 0.5}, 30)">
        <rect x="-100" y="-12" width="200" height="24" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
        <text x="0" y="4" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="800" fill="#64748b" letter-spacing="0.1em">
          ${rawLetters.every((c) => /\d/.test(c)) ? 'NUMBER PALS' : 'ALPHABET PALS'} • ${rawLetters.join('')}
        </text>
      </g>
    `;
  }

  return svgDoc({ width: W, height: H, viewBox: `0 0 ${W} ${H}`, content, title: `Alphabet Pals - ${text || 'A to Z'}` });
}


