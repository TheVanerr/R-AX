# Uygulama simgesi: "RX" monogramı (R&AX) — Dolfin kırmızısı zemin, beyaz kalın R, X'in bir kolu sarı (risk/uyarı vurgusu)
# Üretir: assets/ikon.png (256), assets/ikon.ico (kısayol), assets/pwa/ (PWA: 192, 512, maskable 512, apple 180, favicon 32)
# Kullanım: python app/araclar/ikon-uret.py
import os
from PIL import Image, ImageDraw, ImageFont

here = os.path.dirname(os.path.abspath(__file__))
assets = os.path.join(here, '..', 'assets')
pwa = os.path.join(assets, 'pwa')
os.makedirs(pwa, exist_ok=True)
font = os.path.join(assets, 'fonts', 'selawkb.ttf')

RED = (212, 0, 0, 255)
WHITE = (255, 255, 255, 255)
AMBER = (255, 196, 0, 255)


def draw(size, maskable=False, rounded=True):
    s = size * 4
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if maskable or not rounded:
        d.rectangle([0, 0, s, s], fill=RED)
    else:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=RED)
    k = 0.80 if maskable else 1.0  # maskable: içerik %80 güvenli bölgede
    # R harfi (yazı tipinden), X iki kalın çizgi
    h = s * 0.40 * k                     # harf yüksekliği
    f = ImageFont.truetype(font, int(h * 1.40))
    bb = d.textbbox((0, 0), 'R', font=f)
    rw, rh = bb[2] - bb[0], bb[3] - bb[1]
    sc = h / rh
    xw = h * 0.80                        # X genişliği
    gap = h * 0.04
    total = rw * sc + gap + xw
    x0 = (s - total) / 2
    y0 = (s - h) / 2 - h * 0.08
    # R: ayrı katmanda çiz, yüksekliği h olacak şekilde ölçekle
    layer = Image.new('RGBA', (int(rw) + 8, int(rh) + 8), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((4 - bb[0], 4 - bb[1]), 'R', font=f, fill=WHITE)
    layer = layer.resize((max(1, int(layer.width * sc)), max(1, int(layer.height * sc))), Image.LANCZOS)
    im.alpha_composite(layer, (int(x0 - 4 * sc), int(y0 - 4 * sc)))
    # X: iki kalın kol; sağ-üstten sol-alta kol sarı ve üstte
    t = h * 0.21
    xl, xr, yt, yb = x0 + rw * sc + gap, x0 + total, y0, y0 + h

    def bar(p, q, col):
        import math
        dx, dy = q[0] - p[0], q[1] - p[1]
        L = math.hypot(dx, dy)
        nx, ny = -dy / L * t / 2, dx / L * t / 2
        d.polygon([(p[0] + nx, p[1] + ny), (q[0] + nx, q[1] + ny), (q[0] - nx, q[1] - ny), (p[0] - nx, p[1] - ny)], fill=col)

    # kollar harf kutusunu taşmasın diye uçlar yatay kesik
    mask = Image.new('L', (s, s), 0)
    ImageDraw.Draw(mask).rectangle([xl - t, yt, xr + t, yb], fill=255)
    xlayer = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(xlayer)
    bar((xl + t * 0.35, yt - t), (xr - t * 0.35, yb + t), WHITE)
    bar((xr - t * 0.35, yt - t), (xl + t * 0.35, yb + t), AMBER)
    xlayer.putalpha(Image.composite(xlayer.getchannel('A'), Image.new('L', (s, s), 0), mask))
    im.alpha_composite(xlayer)
    # alt çizgi: rapor anteti motifi
    by = yb + h * 0.16
    line = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(line).rectangle([x0, by, x0 + total, by + max(4, h * 0.08)], fill=(255, 255, 255, 150))
    im.alpha_composite(line)
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
