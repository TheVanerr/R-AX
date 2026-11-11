// Belge kontrolü: md dosyalarını okur, kuralları çalıştırır, özet ve kontrol listesini yazar.
// Kullanım: node app/araclar/kontrol.mjs "projects/0326066-KSYSTE-KBN 1B 1500"   (--json: makine okunur çıktı)
import { loadDoc } from './yukle.mjs';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
if (!dir) {
  console.error('Kullanım: node app/araclar/kontrol.mjs <proje / model / birim klasörü> [--json]');
  process.exit(2);
}
const { p, ev } = loadDoc(dir);
if (args.includes('--json')) {
  console.log(JSON.stringify({ meta: p.meta, before: ev.before, after: ev.after, sf: ev.sf.map((e, i) => ({ id: p.sfs[i].id, pl: e.pl, plr: e.plr, ok: e.ok })), elec: { n: ev.elec.n, fails: ev.elec.fails }, noise: ev.noise.any ? { opMax: ev.noise.opMax, cls: ev.noise.cls } : null, thermal: ev.thermal.any ? { max: ev.thermal.max, cls: ev.thermal.cls } : null, checks: ev.checks }, null, 1));
  process.exit(ev.errors ? 1 : 0);
}
const m = p.meta;
const line = (k, v) => console.log(`  ${k.padEnd(20)} ${v}`);
console.log(`\n${m.docNo} · ${m.model} · ${m.customer}  (${m.type}${m.modelDir ? `, şablon: ${m.modelDir}` : ''})`);
line('Rev / tarih', `${m.rev} · ${m.reportDate || '—'} · ${m.status === 'final' ? 'yayın' : 'taslak'} · ${m.langs.join(' ').toUpperCase()}`);
line('Tehlikeler', `${p.hazards.length} · önce r1/r2/r3 = ${ev.before.join('/')} · sonra ${ev.after.join('/')}`);
line('Güvenlik fonks.', ev.sf.map((e, i) => `${p.sfs[i].id} PL ${e.pl || '?'}${e.plr ? (e.ok ? ' ≥ ' : ' < ') + e.plr : ''}`).join(' · ') || '—');
line('CCF', `${ev.ccf} puan`);
line('Elektrik', ev.elec.any ? `${ev.elec.n} ölçüm, ${ev.elec.fails} uygunsuz` : 'değer yok');
line('Gürültü', ev.noise.any ? `${ev.noise.n} nokta · operatör konumu ${ev.noise.opMax.toFixed(1)} dB(A) · sınıf ${ev.noise.cls}` : 'değer yok');
line('Termal', ev.thermal.any ? `${ev.thermal.images.length} görüntü · en yüksek ${ev.thermal.max.toFixed(1)} °C (ölçüt ${ev.thermal.limit} °C) · ${ev.thermal.cls}` : 'görüntü yok');
const autoN = Object.values(ev.auto.measures).reduce((n, a) => n + a.length, 0);
if (autoN || ev.auto.actions.length) line('Otomatik', `${autoN} önlem satırı, ${ev.auto.actions.length} aksiyon, işaret: ${[...new Set(ev.auto.signs)].join(' ') || '—'}`);
console.log(`\nKontrol: ${ev.errors} hata, ${ev.warnings} uyarı, ${ev.checks.length - ev.errors - ev.warnings} bilgi`);
const icon = { error: '✗', warn: '!', info: '·' };
for (const c of ev.checks) console.log(`  ${icon[c.level]} ${c.msg}`);
process.exit(ev.errors ? 1 : 0);
