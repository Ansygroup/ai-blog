#!/usr/bin/env python3
"""Generate a branded gradient cover JPG: cover.py <slug> <title> <category>"""
import sys, pathlib, textwrap
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[2]
W, H = 1200, 630
COLORS = {
    'AI News': ((15, 23, 42), (30, 64, 175)),
    'Comparisons': ((17, 24, 39), (124, 58, 237)),
    'Tutorials': ((6, 26, 24), (13, 148, 136)),
    'Reviews': ((28, 20, 10), (217, 119, 6)),
    'Best Of': ((23, 15, 35), (109, 40, 217)),
    'Guides': ((10, 25, 30), (8, 145, 178)),
    'Q&A': ((25, 20, 20), (190, 60, 60)),
}
BADGE = {'AI News': (16, 185, 129), 'Comparisons': (167, 139, 250), 'Tutorials': (45, 212, 191),
         'Reviews': (251, 191, 36), 'Best Of': (196, 181, 253), 'Guides': (103, 232, 249), 'Q&A': (252, 165, 165)}

def font(size):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
              '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'):
        if pathlib.Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def main(slug, title, category):
    # per-slug variant: same title/category still yields unique art
    import zlib
    v = zlib.crc32(slug.encode()) % 60
    c1, c2 = COLORS.get(category, COLORS['Best Of'])
    def shift(c, d):
        return tuple(max(0, min(255, x + d)) for x in c)
    c1, c2 = shift(c1, ((v % 6) - 2) * 7 + (v // 6)), shift(c2, (2 - (v % 6)) * 9 - (v // 6))
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(c1, c2)))
    d.ellipse([W - 420 + v * 30, -160 - v * 15, W + 160 + v * 30, 420], fill=tuple(min(255, c + 18) for c in c2))
    d.ellipse([-200 + v * 25, H - 320, 320 + v * 25, H + 200], fill=tuple(max(0, c - 6) for c in c1))
    badge = BADGE.get(category, BADGE['Best Of'])
    d.rounded_rectangle([60, 120, 60 + 24 + d.textlength(category.upper(), font=font(30)), 172], 26, fill=badge)
    d.text((72, 130), category.upper(), font=font(30), fill=(10, 10, 14))
    words = textwrap.wrap(title, 26)[:4]
    y = 220
    f = font(64 if len(words) <= 2 else 54)
    for line in words:
        d.text((60, y), line, font=f, fill=(255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0, 40))
        y += 74
    d.text((60, H - 100), 'AI PULSE DAILY', font=font(34), fill=(226, 232, 240))
    out = ROOT / 'public' / 'images' / f'{slug}.jpg'
    img.save(out, 'JPEG', quality=82)
    print(out)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 'Best Of')
