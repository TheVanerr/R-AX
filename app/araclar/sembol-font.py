# Sembol yazı tipi: Carlito / Selawik'te olmayan işaretler (✓ ✗ ☐ ◀ ▶ ■ …) DejaVu Sans'tan alt küme olarak çıkarılır.
# Çıktı: assets/fonts/RaSym-Regular.ttf, RaSym-Bold.ttf (DejaVu lisansı: LICENSE-DejaVu.txt)
# Kullanım: python app/araclar/sembol-font.py
import os, matplotlib
from fontTools import subset
from fontTools.ttLib import TTFont
src = os.path.join(os.path.dirname(matplotlib.__file__), 'mpl-data', 'fonts', 'ttf')
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'fonts')
chars = '✓✔✗✘☐☑☒◀▶▲▼◆◇■□▪●○◦★☆⚠✚✖↑↓←→↔⇒≠∑∞'
for name, out in [('DejaVuSans.ttf', 'RaSym-Regular.ttf'), ('DejaVuSans-Bold.ttf', 'RaSym-Bold.ttf')]:
    opts = subset.Options()
    opts.layout_features = []
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    opts.hinting = False
    opts.drop_tables += ['GSUB', 'GPOS', 'GDEF', 'kern']
    f = TTFont(os.path.join(src, name))
    s = subset.Subsetter(options=opts)
    s.populate(unicodes=[ord(c) for c in chars])
    s.subset(f)
    for rec in f['name'].names:
        if rec.nameID in (1, 4, 16):
            rec.string = 'RaSym'
        if rec.nameID == 6:
            rec.string = 'RaSym-Bold' if 'Bold' in out else 'RaSym-Regular'
    f.save(os.path.join(dst, out))
    print(out, os.path.getsize(os.path.join(dst, out)), 'bayt')
