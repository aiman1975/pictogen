// The studio's self-hosted fonts (public/fonts, SIL Open Font License) as @font-face rules with the
// font files inlined, for what must look right with no network and no page around it: exported
// clips (src/story.js) and printable worksheets (src/worksheet.js).
import { readFileSync } from 'node:fs';

const FONT_DIR = new URL('../public/fonts/', import.meta.url);
let fontCss = null;
/** The @font-face rules with the font files inlined (data: URLs); family: only that family's */
export function embeddedFontCss(family = null) {
  fontCss ??= readFileSync(new URL('fonts.css', FONT_DIR), 'utf8').replace(
    /url\(([\w.-]+\.woff2)\)/g,
    (_, file) => `url(data:font/woff2;base64,${readFileSync(new URL(file, FONT_DIR)).toString('base64')})`,
  );
  return family ? (fontCss.match(/@font-face\s*\{[^}]*\}/g) || []).filter((r) => r.includes(`'${family}'`)).join('\n') : fontCss;
}
