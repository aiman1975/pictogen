// The app icons as PNG, from the logo (public/icons/icon.svg): 192 and 512 px as drawn (rounded), a
// maskable 512 for Android (colour to the edges, the face inside the middle 70%) and the iPhone icon
// (180 px, square: the phone rounds it).   node scripts/brand/icons.cjs
const { chromium } = require('playwright');
const { readFileSync } = require('fs');
const { join } = require('path');
const DIR = join(__dirname, '../../public/icons');
const svg = readFileSync(join(DIR, 'icon.svg'), 'utf8');
const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const face = inner.replace(/<rect[^>]*\/>/, '');
const defs = inner.match(/<defs>.*?<\/defs>/)[0];
// (the face, smaller, on the colour to the edges)
const fullBleed = (k) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${defs}<rect width="120" height="120" fill="url(#tg)"/><g transform="translate(${60 - 60 * k} ${60 - 60 * k}) scale(${k})">${face.replace(defs, '')}</g></svg>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const shot = async (s, size, file) => {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0;background:transparent">${s.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    await p.screenshot({ path: join(DIR, file), omitBackground: true });
    console.log('wrote', file);
  };
  await shot(svg, 192, 'icon-192.png');
  await shot(svg, 512, 'icon-512.png');
  await shot(fullBleed(0.72), 512, 'maskable-512.png');
  await shot(fullBleed(0.86), 180, 'apple-touch-icon.png');
  await b.close();
})();
