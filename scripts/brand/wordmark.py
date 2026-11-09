# The Toonaro wordmark: "Toonaro" in Nunito Black (OFL, public/fonts) as outlines, the two o's drawn
# as eyes looking to the right - the logo's idea. Writes public/brand/toonaro-wordmark.svg (dark ink,
# for light backgrounds) and toonaro-wordmark-white.svg (for dark ones).
#   pip install fonttools brotli && python3 scripts/brand/wordmark.py
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = Path(__file__).resolve().parents[2]
font = instantiateVariableFont(TTFont(ROOT / 'public/fonts/nunito-latin.woff2'), {'wght': 900})
glyphs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font['hmtx']
ascent, descent = font['hhea'].ascent, font['hhea'].descent
TRACK = -10  # (a touch tighter, as a logo)

def outline(ch):
    name = cmap[ord(ch)]
    pen = SVGPathPen(glyphs, ntos=lambda v: ('%.1f' % v).rstrip('0').rstrip('.'))
    glyphs[name].draw(pen)
    bp = BoundsPen(glyphs)
    glyphs[name].draw(bp)
    return pen.getCommands(), hmtx[name][0], bp.bounds

def build(ink, eye_white, pupil):
    x, parts = 0, []
    top = max(outline(c)[2][3] for c in 'Toonaro')
    for i, ch in enumerate('Toonaro'):
        d, adv, (x0, y0, x1, y1) = outline(ch)
        # (glyphs are drawn y-up: flip each into SVG's y-down, baseline at `top`)
        if ch == 'o' and i in (1, 2):
            cx, cy = x + (x0 + x1) / 2, top - (y0 + y1) / 2
            r = (x1 - x0) / 2
            inner = r * 0.62
            parts.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{ink}"/>')
            parts.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{inner:.1f}" fill="{eye_white}"/>')
            parts.append(f'<circle cx="{cx + inner * 0.36:.1f}" cy="{cy + inner * 0.06:.1f}" r="{inner * 0.5:.1f}" fill="{pupil}"/>')
            parts.append(f'<circle cx="{cx + inner * 0.5:.1f}" cy="{cy - inner * 0.18:.1f}" r="{inner * 0.17:.1f}" fill="{eye_white}"/>')
        else:
            parts.append(f'<path transform="translate({x},{top}) scale(1,-1)" d="{d}" fill="{ink}"/>')
        x += adv + TRACK
    h = top - min(outline(c)[2][1] for c in 'Toonaro')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 {x - TRACK + 20:.0f} {h + 20:.0f}" role="img" aria-label="Toonaro"><title>Toonaro</title>{"".join(parts)}</svg>\n'

out = ROOT / 'public/brand'
out.mkdir(exist_ok=True)
(out / 'toonaro-wordmark.svg').write_text(build('#1e1b4b', '#ffffff', '#1e1b4b'))
(out / 'toonaro-wordmark-white.svg').write_text(build('#ffffff', '#ffffff', '#1e1b4b'))
print('wrote', out / 'toonaro-wordmark.svg', out / 'toonaro-wordmark-white.svg')
