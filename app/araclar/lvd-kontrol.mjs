// LVD test raporu kontrolü: lvd.md'yi okur, EN 60204-1 Bölüm 18 programına göre değerlendirir, özet ve kontrol listesini yazar.
// Kullanım: node app/araclar/lvd-kontrol.mjs "lvd/0326066-KSYSTE-KBN 1B 1500"   (--json: makine okunur çıktı)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT } from './yukle.mjs';

const require = createRequire(import.meta.url);
const Lvd = require('../js/lvd.js');
const LIB = require('../js/lvd-lib.js');

const args = process.argv.slice(2);
const dirArg = args.find((a) => !a.startsWith('--'));
if (!dirArg) {
  console.error('Kullanım: node app/araclar/lvd-kontrol.mjs <lvd/klasör> [--json]');
  process.exit(2);
}
const abs = path.resolve(dirArg);
const file = path.join(abs, 'lvd.md');
if (!fs.existsSync(file)) {
  console.error(`lvd.md bulunamadı: ${file}`);
  process.exit(2);
}
const rel = path.relative(ROOT, abs).split(path.sep).join('/');
const m = Lvd.parse(fs.readFileSync(file, 'utf8'), rel);
// Aynı rapor no başka bir LVD raporunda kullanılıyor mu (yan klasörler)
const docNos = [];
for (const d of fs.readdirSync(path.dirname(abs), { withFileTypes: true })) {
  const f = path.join(path.dirname(abs), d.name, 'lvd.md');
  if (!d.isDirectory() || path.join(path.dirname(abs), d.name) === abs || !fs.existsSync(f)) continue;
  const no = /^(?:dokuman|doküman|rapor no):\s*(.+)$/im.exec(fs.readFileSync(f, 'utf8'));
  if (no) docNos.push(no[1].trim());
}
const ev = Lvd.evaluate(m, { exists: (f) => fs.existsSync(path.join(ROOT, f)), docNos });

if (args.includes('--json')) {
  console.log(JSON.stringify({ meta: m.meta, overall: ev.overall, tests: Object.fromEntries(Object.entries(ev.tests).map(([k, t]) => [k, { state: t.state, n: t.n, fails: t.fails }])), checks: ev.checks }, null, 1));
  process.exit(ev.errors ? 1 : 0);
}
const M = m.meta;
const STATE = { pass: 'uygun', fail: 'UYGUN DEĞİL', open: 'açık', none: 'yapılmadı', na: 'uygulanamaz', site: 'kurulum yerinde', skip: 'yapılmadı', warn: 'koşullu (§8.2.6)' };
const OVERALL = { pass: 'UYGUN', fail: 'UYGUN DEĞİL', open: 'AÇIK (tamamlanmamış)', cond: 'KOŞULLU' };
const line = (k, v) => console.log(`  ${k.padEnd(22)} ${v}`);
console.log(`\n${M.docNo || 'LVD'} · ${M.model} · ${M.customer}  (LVD test raporu, EN 60204-1 Bölüm 18)`);
line('Rev / tarih', `${M.rev} · ${M.reportDate || '—'} · ${M.status === 'final' ? 'yayın' : 'taslak'} · ${(M.langs || []).join(' ').toUpperCase()}`);
line('Makine', `seri no ${M.serial || '—'} · besleme ${m.machine.supply || '—'} · ${m.machine.current || '—'}`);
line('Test', `${m.cond.date || '—'} ${m.cond.time || ''} · ${m.cond.testedBy || '—'} · ${m.devices.length} cihaz`);
line('Risk analizi', M.link ? `${M.riskDoc || '—'} (${M.link})` : 'bağlı değil');
console.log(`\nTest programı (§18.1) — genel sonuç: ${OVERALL[ev.overall]}`);
for (const t of LIB.TESTS) {
  const x = ev.tests[t.key];
  const n = t.key === 'visual' || t.key === 'func' ? `${x.ok} U · ${x.nok} UD · ${x.na} UY · ${x.open} boş` : `${x.n} ölçüm${x.fails ? `, ${x.fails} sınır dışı` : ''}`;
  line(`${t.letter}) ${t.clause}${t.req ? ' *' : ''}`, `${STATE[x.state] || x.state} · ${n} — ${t.name.tr}`);
}
console.log('  (* zorunlu)');
console.log(`\nKontrol: ${ev.errors} hata, ${ev.warnings} uyarı, ${ev.checks.length - ev.errors - ev.warnings} bilgi`);
const icon = { error: '✗', warn: '!', info: '·' };
for (const c of ev.checks) console.log(`  ${icon[c.level]} ${c.msg}`);
process.exit(ev.errors ? 1 : 0);
