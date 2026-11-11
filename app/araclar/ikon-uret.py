# Uygulama simgesi: Dolfin kırmızısı zemin, beyaz kalkan, içinde 3x3 risk matrisi (yeşil -> sarı -> kırmızı)
# Üretir: assets/ikon.png (256), assets/ikon.ico (kısayol), assets/pwa/ (PWA: 192, 512, maskable 512, apple 180, favicon 32)
# Kullanım: python app/araclar/ikon-uret.py
import os
from PIL import Image, ImageDraw

here = os.path.dirname(os.path.abspath(__file__))
assets = os.path.join(here, '..', 'assets')
pwa = os.path.join(assets, 'pwa')
os.makedirs(pwa, exist_ok=True)

RED = (212, 0, 0, 255)
WHITE = (255, 255, 255, 255)
GREEN, AMBER, ORANGE, HOT = (63, 181, 111, 255), (245, 197, 36, 255), (245, 124, 0, 255), (176, 0, 0, 255)
# Risk matrisi: satır = olasılık (üst yüksek), sütun = şiddet (sağ yüksek)
MATRIX = [
    [AMBER, ORANGE, HOT],
    [GREEN, AMBER, ORANGE],
    [GREEN, GREEN, AMBER],
]


def shield(d, cx, top, w, h, fill):
    """Üstü düz, altı sivri kalkan (bezier yerine çokgen yaklaşımı)"""
    l, r = cx - w / 2, cx + w / 2
    pts = [(l, top + h * 0.10), (cx - w * 0.18, top + h * 0.03), (cx, top), (cx + w * 0.18, top + h * 0.03), (r, top + h * 0.10)]
    steps = 24
    for i in range(1, steps + 1):  # sağ kenar, aşağı doğru kavisli
        t = i / steps
        x = r - (r - cx) * (t ** 2.2)
        y = top + h * 0.10 + (h * 0.90) * t
        pts.append((x, y))
    for i in range(steps - 1, 0, -1):  # sol kenar, yukarı
        t = i / steps
        x = l + (cx - l) * (t ** 2.2)
        y = top + h * 0.10 + (h * 0.90) * t
        pts.append((x, y))
    d.polygon(pts, fill=fill)


def draw(size, maskable=False, rounded=True):
    s = size * 4
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if maskable or not rounded:
        d.rectangle([0, 0, s, s], fill=RED)
    else:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.20), fill=RED)
    k = 0.78 if maskable else 1.0  # maskable: içerik %80 güvenli bölgede kalır
    cx = s / 2
    sw, sh = s * 0.66 * k, s * 0.76 * k
    top = (s - sh) / 2 + s * 0.01
    shield(d, cx, top, sw, sh, WHITE)
    # risk matrisi kalkanın üst-orta kısmında
    g = sw * 0.56
    gap = g * 0.06
    cell = (g - 2 * gap) / 3
    gx, gy = cx - g / 2, top + sh * 0.17
    rad = max(2, int(cell * 0.16))
    for ri, row in enumerate(MATRIX):
        for ci, col in enumerate(row):
            x0 = gx + ci * (cell + gap)
            y0 = gy + ri * (cell + gap)
            d.rounded_rectangle([x0, y0, x0 + cell, y0 + cell], radius=rad, fill=col)
    return im.resize((size, size), Image.LANCZOS)


big = draw(256)
big.save(os.path.join(assets, 'ikon.png'))
draw(256).save(os.path.join(assets, 'ikon.ico'), sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
draw(192).save(os.path.join(pwa, 'ikon-192.png'))
draw(512).save(os.path.join(pwa, 'ikon-512.png'))
draw(512, maskable=True).save(os.path.join(pwa, 'ikon-maskable-512.png'))
draw(180, rounded=False).convert('RGB').save(os.path.join(pwa, 'apple-touch-icon.png'))
draw(32).save(os.path.join(pwa, 'favicon-32.png'))
print('ikon.png, ikon.ico, pwa/ikon-192.png, pwa/ikon-512.png, pwa/ikon-maskable-512.png, pwa/apple-touch-icon.png, pwa/favicon-32.png')
