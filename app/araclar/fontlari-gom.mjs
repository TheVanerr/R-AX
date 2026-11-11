// assets/fonts/*.ttf → assets/fonts/fonts.js (base64). Dosyadan açılan sayfa diskteki yazı tipini okuyamadığı için gömülür.
// Kullanım: node app/araclar/fontlari-gom.mjs
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'assets', 'fonts');
const files = ['Carlito-Regular.ttf', 'Carlito-Bold.ttf', 'selawk.ttf', 'selawksb.ttf', 'selawkb.ttf', 'RaSym-Regular.ttf', 'RaSym-Bold.ttf'];
const parts = files.map((f) => `  ${JSON.stringify(f)}: ${JSON.stringify(fs.readFileSync(path.join(dir, f)).toString('base64'))}`);
const out = `/* Gömülü yazı tipleri (SIL Open Font License: OFL-Carlito.txt, OFL-Selawik.txt; semboller DejaVu: LICENSE-DejaVu.txt). Üreten: app/araclar/fontlari-gom.mjs */\nself.RA_FONTS = {\n${parts.join(',\n')}\n};\n`;
fs.writeFileSync(path.join(dir, 'fonts.js'), out);
console.log('fonts.js', (out.length / 1024 / 1024).toFixed(2), 'MB');
