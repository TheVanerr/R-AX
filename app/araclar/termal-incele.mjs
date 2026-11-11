// testo .bmt dosyalarını inceler: tarih/saat, ε, RTC, min/maks ve en sıcak noktanın konumu; isteğe bağlı olarak
// koordinat ızgaralı termal önizleme (PNG) ve gömülü gerçek görüntü (JPEG) çıkarır. İşaretçi (x, y, w, h) yazarken kullanılır.
// Kullanım: node app/araclar/termal-incele.mjs <klasör veya .bmt> [--cikti <klasör>] [--izgara 8]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { RaThermal } from './yukle.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const target = args.find((a) => !a.startsWith('--') && a !== opt('cikti') && a !== opt('izgara'));
const out = opt('cikti', null);
const grid = +opt('izgara', 8);
if (!target) {
  console.error('Kullanım: node app/araclar/termal-incele.mjs <klasör veya .bmt> [--cikti <klasör>] [--izgara 8]');
  process.exit(2);
}
const files = fs.statSync(target).isDirectory() ? fs.readdirSync(target).filter((f) => /\.bmt$/i.test(f)).sort().map((f) => path.join(target, f)) : [target];
if (out) fs.mkdirSync(out, { recursive: true });

/* Küçük PNG kodlayıcı (RGB, 8 bit) */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n += 1) { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function png(w, h, rgb) {
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y += 1) { raw[y * (w * 3 + 1)] = 0; rgb.copy ? rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3) : raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const STOPS = [[0, [0, 0, 20]], [0.12, [28, 10, 94]], [0.28, [90, 10, 140]], [0.42, [160, 24, 130]], [0.56, [216, 58, 58]], [0.7, [245, 122, 16]], [0.84, [255, 194, 42]], [1, [255, 251, 230]]];
const color = (t) => { let k = 0; while (k < STOPS.length - 2 && t > STOPS[k + 1][0]) k += 1; const [t0, c0] = STOPS[k]; const [t1, c1] = STOPS[k + 1]; const f = (t - t0) / (t1 - t0); return c0.map((v, i) => Math.round(v + (c1[i] - v) * f)); };

for (const file of files) {
  const name = path.basename(file);
  let r;
  try { r = RaThermal.parseBMT(fs.readFileSync(file)); } catch (e) { console.log(`${name}: okunamadı — ${e.message}`); continue; }
  const img = { file: name, w: r.w, h: r.h, T: RaThermal.tempsOf(r), markers: RaThermal.defaultMarkers() };
  const rg = RaThermal.range(img);
  const tm = RaThermal.bmtTime(name, r.stamp);
  console.log(`\n${name} · ${tm.date} ${tm.time} · ${r.device} SN ${r.serial} · ${r.w}×${r.h} · ε ${r.eps} · RTC ${r.rtc} °C`);
  console.log(`  min ${rg.lo.toFixed(1)} °C (x ${rg.lx}, y ${rg.ly}) · maks ${rg.hi.toFixed(1)} °C (x ${rg.hx}, y ${rg.hy})`);
  // Izgara: her hücrenin en yüksek değeri (işaretçi yerini bulmak için)
  const cw = Math.ceil(r.w / grid);
  const ch = Math.ceil(r.h / grid);
  const rows = [];
  for (let gy = 0; gy < grid; gy += 1) {
    const cells = [];
    for (let gx = 0; gx < grid; gx += 1) {
      let mx = -Infinity;
      for (let y = gy * ch; y < Math.min(r.h, (gy + 1) * ch); y += 1) for (let x = gx * cw; x < Math.min(r.w, (gx + 1) * cw); x += 1) mx = Math.max(mx, img.T[y * r.w + x]);
      cells.push(mx.toFixed(0).padStart(4));
    }
    rows.push(`  y${String(gy * ch).padStart(3)} |${cells.join('')}`);
  }
  console.log(`  ızgara (${cw}×${ch} px hücre, x başlangıçları: ${Array.from({ length: grid }, (_, i) => i * cw).join(' ')})`);
  rows.forEach((l) => console.log(l));
  if (out) {
    const k = 3;
    const W = r.w * k;
    const H = r.h * k;
    const rgb = Buffer.alloc(W * H * 3);
    const span = Math.max(0.1, rg.hi - rg.lo);
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const sx = Math.floor(x / k);
        const sy = Math.floor(y / k);
        let c = color((img.T[sy * r.w + sx] - rg.lo) / span);
        if (sx % 16 === 0 && x % k === 0 || sy % 16 === 0 && y % k === 0) c = [90, 200, 255];
        if (Math.abs(sx - rg.hx) <= 1 && Math.abs(sy - rg.hy) <= 1) c = [0, 255, 0];
        rgb[(y * W + x) * 3] = c[0]; rgb[(y * W + x) * 3 + 1] = c[1]; rgb[(y * W + x) * 3 + 2] = c[2];
      }
    }
    fs.writeFileSync(path.join(out, name.replace(/\.bmt$/i, '-termal.png')), png(W, H, rgb));
    if (r.vis) fs.writeFileSync(path.join(out, name.replace(/\.bmt$/i, '-gercek.jpg')), Buffer.from(r.vis));
    console.log(`  önizleme: ${name.replace(/\.bmt$/i, '-termal.png')} (mavi çizgiler 16 px aralıklı; yeşil = en sıcak nokta)${r.vis ? `, gerçek görüntü: ${name.replace(/\.bmt$/i, '-gercek.jpg')}` : ''}`);
  }
}
