# assets/logos/* -> assets/logos/logos.js (data URL). Büyük logolar 1200 px genişliğe indirilir.
# Kullanım: python app/araclar/logolari-gom.py
import base64, io, json, os
from PIL import Image
d = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'logos')
out = {}
for f in sorted(os.listdir(d)):
    p = os.path.join(d, f)
    if f.endswith('.svg'):
        out['assets/logos/' + f] = 'data:image/svg+xml;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
    elif f.endswith('.png'):
        im = Image.open(p).convert('RGBA')
        if im.width > 1200:
            im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
        b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
        out['assets/logos/' + f] = 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()
js = '/* Gömülü logolar. Üreten: app/araclar/logolari-gom.py */\nself.RA_LOGOS = ' + json.dumps(out, indent=0) + ';\n'
open(os.path.join(d, 'logos.js'), 'w', encoding='utf-8').write(js)
print('logos.js', round(len(js) / 1024), 'KB', list(out))
