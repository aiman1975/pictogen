"""The Arabic letter figures' shapes, from the Baloo Bhaijaan 2 font (SIL OFL 1.1, Ek Type).

Each letter's isolated form (and the Arabic-Indic digits) at the font's boldest weight, as an SVG
path fitted into the box a letter figure's body takes (src/concepts/alphabet.js), and where its face
goes: the middle of its thickest part, away from the dots. Writes src/concepts/arabic-letters-data.js.

  pip install fonttools skia-pathops   (numpy and Pillow too)
  python3 scripts/lang/ar-letters-build.py path/to/BalooBhaijaan2[wght].ttf
"""
import json
import sys

import numpy as np
from fontTools.pens.basePen import BasePen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image, ImageDraw

LETTERS = [
    ('ا', 'alif'), ('ب', 'ba'), ('ت', 'ta'), ('ث', 'tha'), ('ج', 'jim'), ('ح', 'hha'), ('خ', 'kha'),
    ('د', 'dal'), ('ذ', 'dhal'), ('ر', 'ra'), ('ز', 'zay'), ('س', 'sin'), ('ش', 'shin'), ('ص', 'sad'),
    ('ض', 'dad'), ('ط', 'tta'), ('ظ', 'dha'), ('ع', 'ayn'), ('غ', 'ghayn'), ('ف', 'fa'), ('ق', 'qaf'),
    ('ك', 'kaf'), ('ل', 'lam'), ('م', 'mim'), ('ن', 'nun'), ('ه', 'ha'), ('و', 'waw'), ('ي', 'ya'),
    # (more letters seen in words)
    ('ة', 'ta_marbuta'), ('ى', 'alif_maqsura'), ('ء', 'hamza'), ('أ', 'alif_hamza'), ('إ', 'alif_hamza_below'),
    ('آ', 'alif_madda'), ('ؤ', 'waw_hamza'), ('ئ', 'ya_hamza'),
]
DIGITS = [(chr(0x0660 + n), str(n)) for n in range(10)]
# The box a letter figure's body fills (x 20-80, y 12-78), its middle at 50, 45
BOX = (20, 12, 80, 78)


class Flatten(BasePen):
    """Outlines as polygons (curves sampled), for finding the thickest part"""

    def __init__(self, glyphset):
        super().__init__(glyphset)
        self.polys, self.cur = [], []

    def _moveTo(self, p):
        self.cur = [p]

    def _lineTo(self, p):
        self.cur.append(p)

    def _curveToOne(self, p1, p2, p3):
        p0 = self.cur[-1]
        for i in range(1, 9):
            t = i / 8
            self.cur.append(tuple((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d for a, b, c, d in zip(p0, p1, p2, p3)))

    def _qCurveToOne(self, p1, p2):
        p0 = self.cur[-1]
        for i in range(1, 7):
            t = i / 6
            self.cur.append(tuple((1 - t) ** 2 * a + 2 * (1 - t) * t * b + t * t * c for a, b, c in zip(p0, p1, p2)))

    def _closePath(self):
        if len(self.cur) > 2:
            self.polys.append(self.cur)
        self.cur = []

    _endPath = _closePath


def face_spot(polys, size=400):
    """The middle of the thickest part (the point farthest inside), on a size x size grid of the box"""
    mask = np.zeros((size, size), dtype=bool)
    for poly in polys:
        img = Image.new('1', (size, size), 0)
        ImageDraw.Draw(img).polygon([(x * size / 100, y * size / 100) for x, y in poly], fill=1)
        mask ^= np.array(img, dtype=bool)  # (even-odd: the holes stay holes)
    dist = np.zeros(mask.shape, dtype=np.int32)
    cur, step = mask.copy(), 0
    while cur.any():
        step += 1
        dist[cur] = step
        nxt = cur.copy()
        nxt[1:, :] &= cur[:-1, :]
        nxt[:-1, :] &= cur[1:, :]
        nxt[:, 1:] &= cur[:, :-1]
        nxt[:, :-1] &= cur[:, 1:]
        cur = nxt
    # (thick, and toward the middle and the top: a face, not a foot - "ص" smiles from its round part)
    yy, xx = np.mgrid[0:size, 0:size] * (100 / size)
    score = dist * (1 - 0.5 * np.abs(xx - 50) / 50) * (1 - 0.35 * np.clip(yy - 30, 0, None) / 50)
    y, x = np.unravel_index(np.argmax(score), score.shape)
    return [round(float(x) * 100 / size, 1), round(float(y) * 100 / size, 1), round(float(dist[y, x]) * 100 / size, 1)]


def main(path):
    font = instantiateVariableFont(TTFont(path), {'wght': 800})
    # (a letter drawn in overlapping parts becomes one outline: no seams in the outline styles)
    from fontTools.ttLib.removeOverlaps import removeOverlaps
    removeOverlaps(font)
    cmap, glyphs = font.getBestCmap(), font.getGlyphSet()
    out = {}
    for ch, name in LETTERS + DIGITS:
        g = glyphs[cmap[ord(ch)]]
        bounds = Flatten(glyphs)
        g.draw(bounds)
        xs = [x for p in bounds.polys for x, _ in p]
        ys = [y for p in bounds.polys for _, y in p]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        bw, bh = BOX[2] - BOX[0], BOX[3] - BOX[1]
        k = min(bw / (x1 - x0), bh / (y1 - y0))
        # (the main stroke - the biggest outline, not a dot - stands on the legs: its bottom at the
        # box's; dots under it hang between the feet, and a tall letter is made smaller to fit)
        area = lambda p: abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(p, p[1:] + p[:1]))) / 2
        # (the letter's strokes: every outline but the dots - a letter may be drawn in overlapping parts)
        big = max(area(p) for p in bounds.polys)
        base = min(y for p in bounds.polys if area(p) >= 0.2 * big for _, y in p)
        k = min(k, (BOX[3] - BOX[1] + 4) / (y1 - base))
        # (font units, y up -> the box, y down; across, centred)
        dx = 50 - (x0 + x1) / 2 * k
        dy = BOX[3] + base * k
        t = (k, 0, 0, -k, dx, dy)
        svg = SVGPathPen(glyphs, ntos=lambda v: f'{v:.1f}'.rstrip('0').rstrip('.'))
        g.draw(TransformPen(svg, t))
        flat = Flatten(glyphs)
        g.draw(TransformPen(flat, t))
        # (the face on the letter's strokes, never on a dot)
        fbig = max(area(p) for p in flat.polys)
        out[ch] = {'name': name, 'd': svg.getCommands(), 'face': face_spot([p for p in flat.polys if area(p) >= 0.2 * fbig] or flat.polys)}
    head = ('// The Arabic letter figures\' shapes (made by scripts/lang/ar-letters-build.py from the Baloo Bhaijaan 2\n'
            '// font, SIL Open Font License 1.1, Copyright 2019 The Baloo 2 Project Authors): each letter\'s\n'
            '// isolated form and the Arabic-Indic digits, fitted to a letter figure\'s body, and where the face\n'
            '// goes (x, y, and how thick the letter is there).\n')
    with open('src/concepts/arabic-letters-data.js', 'w', encoding='utf-8') as f:
        f.write(head + 'export default ' + json.dumps(out, ensure_ascii=False, indent=0).replace('\n', '') + ';\n')
    for ch, v in out.items():
        print(ch, v['name'], v['face'], len(v['d']))


if __name__ == '__main__':
    main(sys.argv[1])
