// Eski uygulamanın .riskproj.json dosyasını yeni md yapısına çevirir (tek seferlik).
// Kullanım: node app/araclar/eski-donustur.mjs <proje.riskproj.json> <hedef klasör>
// Fotoğraflar foto/, kurulum/, olcum/, gurultu/ klasörlerine dosya olarak çıkarılır; .bmt dosyaları hedefte termal/ altında olmalıdır.

import fs from 'node:fs';
import path from 'node:path';

const [src, dst] = process.argv.slice(2);
if (!src || !dst) {
  console.error('Kullanım: node app/araclar/eski-donustur.mjs <proje.riskproj.json> <hedef klasör>');
  process.exit(1);
}
const p = JSON.parse(fs.readFileSync(src, 'utf8'));
fs.mkdirSync(dst, { recursive: true });

const pad2 = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
const tr = (o) => (o && typeof o === 'object' ? o.tr || '' : o || '');

/** Çok dilli alanı md satırına çevirir: kısa metin "TR | EN | DE", uzun metin alt maddelerle */
function mlField(key, o, indent = '') {
  if (o == null) return [];
  if (typeof o === 'string') return [`${indent}- ${key}: ${esc(o)}`];
  const t = esc(o.tr);
  const e = esc(o.en);
  const d = esc(o.de);
  if (!t && !e && !d) return [`${indent}- ${key}:`];
  const same = (!e || e === t) && (!d || d === t);
  if (same) return [`${indent}- ${key}: ${t}`];
  if (t.length + e.length + d.length < 150) return [`${indent}- ${key}: ${t} | ${e} | ${d}`];
  const out = [`${indent}- ${key}: ${t}`];
  if (e) out.push(`${indent}  - en: ${e}`);
  if (d) out.push(`${indent}  - de: ${d}`);
  return out;
}
/** Etiketli madde ([M] metin) + çeviriler */
function mlItem(prefix, o, indent = '') {
  const t = esc(o.tr);
  const e = esc(o.en);
  const d = esc(o.de);
  if (t.length + e.length + d.length < 150 && e && d) return [`${indent}- ${prefix}${t} | ${e} | ${d}`];
  const out = [`${indent}- ${prefix}${t}`];
  if (e && e !== t) out.push(`${indent}  - en: ${e}`);
  if (d && d !== t) out.push(`${indent}  - de: ${d}`);
  return out;
}
/** Paragraf + en:/de: paragrafları */
function mlPara(o) {
  if (!o) return [];
  const out = [];
  if (tr(o)) out.push(tr(o), '');
  if (o.en) out.push(`en: ${o.en}`, '');
  if (o.de) out.push(`de: ${o.de}`, '');
  return out;
}
/** Tablo: satırlar [{cells:[string|ML]}]; çok dilli hücreler devam satırlarıyla */
function table(head, rows) {
  const out = [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`];
  const isML = (c) => c && typeof c === 'object';
  for (const r of rows) {
    out.push(`| ${r.map((c) => esc(tr(c))).join(' | ')} |`);
    // Satırda çevirisi farklı bir hücre varsa iki dil satırı da tüm hücrelerle yazılır (aynı olanlar dahil)
    const multi = r.some((c) => isML(c) && ((c.en && c.en !== c.tr) || (c.de && c.de !== c.tr)));
    if (!multi) continue;
    for (const lang of ['en', 'de']) {
      if (!r.some((c) => isML(c) && c[lang])) continue;
      out.push(`| ${r.map((c) => (isML(c) && c[lang] ? `${lang}: ${esc(c[lang])}` : '')).join(' | ')} |`);
    }
  }
  return out;
}

/* ─── Numaralar ─────────────────────────────────────────────── */
const hzId = (u) => { const i = p.hazards.findIndex((h) => h.uid === u); return i < 0 ? '' : `H-${pad2(i + 1)}`; };
const sfId = (u) => { const i = p.sfs.findIndex((s) => s.uid === u); return i < 0 ? '' : `SF-${pad2(i + 1)}`; };
const ptNo = (u) => { const i = p.points.findIndex((x) => x.uid === u); return i < 0 ? '' : String(i + 1); };
const refId = (u) => sfId(u) || hzId(u) || '';
const actId = new Map(p.actions.map((a, i) => [a.src, `A-${pad2(i + 1)}`]));

/* ─── Fotoğraflar ──────────────────────────────────────────── */
const files = new Map();
function writePhoto(uid, rel) {
  const ph = p.photos.find((x) => x.uid === uid);
  if (!ph) return null;
  const m = /^data:image\/(\w+);base64,(.*)$/.exec(ph.data);
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const file = rel.replace(/\.\w+$/, `.${ext}`);
  fs.mkdirSync(path.join(dst, path.dirname(file)), { recursive: true });
  fs.writeFileSync(path.join(dst, file), Buffer.from(m[2], 'base64'));
  files.set(uid, file);
  return file;
}
const photoRows = [];
if (p.meta.coverPhoto) { writePhoto(p.meta.coverPhoto, 'foto/genel-gorunum.jpg'); photoRows.push([files.get(p.meta.coverPhoto), 'kapak', p.photos.find((x) => x.uid === p.meta.coverPhoto).caption]); }
if (p.meta.panelPhoto) { writePhoto(p.meta.panelPhoto, 'foto/kontrol-paneli.jpg'); photoRows.push([files.get(p.meta.panelPhoto), 'panel', p.photos.find((x) => x.uid === p.meta.panelPhoto).caption]); }
p.photos.filter((x) => x.kind === 'general' && !files.has(x.uid)).forEach((x, i) => { writePhoto(x.uid, `foto/genel-${pad2(i + 1)}.jpg`); photoRows.push([files.get(x.uid), 'genel', x.caption]); });
p.photos.filter((x) => x.kind === 'detail').forEach((x, i) => { writePhoto(x.uid, `foto/detay-${pad2(i + 1)}.jpg`); photoRows.push([files.get(x.uid), 'detay', x.caption]); });
p.photos.filter((x) => x.kind === 'setup').forEach((x, i) => { writePhoto(x.uid, `kurulum/kurulum-${pad2(i + 1)}.jpg`); photoRows.push([files.get(x.uid), 'kurulum', x.caption]); });
// Ölçüm ekranları: satıra bağlı olanlar adlandırma kuralıyla
const NAME = { rpe: (t) => `PE ${t}`, iso: (t) => `${t} ISO`, hv: (t) => `${t} FLASH` };
for (const k of ['rpe', 'iso', 'hv']) for (const r of p.elec[k]) if (r.photo) writePhoto(r.photo, `olcum/${NAME[k](r.tag)}.jpg`);
// Bağlanmamış ekranlar: gürültü ölçümleri (açıklamadan satır çıkarılır) ve diğerleri
const noiseRows = [];
const otherScreens = [];
for (const x of p.photos.filter((y) => y.kind === 'screen' && !files.has(y.uid))) {
  const cap = tr(x.caption);
  const m = /^Gürültü\s*·\s*(.+?)\s*·\s*([\d,.]+\s*m)\s*·\s*(?:<b>)?([\d,.]+)\s*dB\(A\)/.exec(cap);
  if (m) {
    const no = noiseRows.length + 1;
    const file = writePhoto(x.uid, `gurultu/GURULTU ${no}.jpg`);
    const pos = { tr: m[1] };
    const me = /^[^·]+·\s*(.+?)\s*·/.exec((x.caption || {}).en || '');
    const md = /^[^·]+·\s*(.+?)\s*·/.exec((x.caption || {}).de || '');
    if (me) pos.en = me[1];
    if (md) pos.de = md[1];
    noiseRows.push([String(no), pos, m[2], m[3], '', '', file]);
  } else {
    const file = writePhoto(x.uid, `olcum/diger-${pad2(otherScreens.length + 1)}.jpg`);
    otherScreens.push(file);
    photoRows.push([file, 'olcum', x.caption]);
  }
}

/* ─── 00-proje.md ──────────────────────────────────────────── */
const m = p.meta;
const A = m.approvals || {};
const T = A.titles || {};
const titleLine = (o) => (o && (o.tr || o.en || o.de) ? `${o.tr} | ${o.en || ''} | ${o.de || ''}` : '');
const front = [
  '---',
  'tur: proje',
  `no: ${m.job}`,
  `musteri: ${m.customer}`,
  `model: ${m.model}`,
  'marka: DOLFIN',
  `uretici: ${m.manufacturer}`,
  `marka adi: ${m.brand || ''}`,
  `marka satiri: ${m.brandLine || ''}`,
  `yil: ${m.year || ''}`,
  `dokuman: ${m.docNo}`,
  `rev: ${m.rev}`,
  `tarih: ${m.reportDate}`,
  `durum: ${m.status === 'final' ? 'yayın' : 'taslak'}`,
  'diller: tr, en, de',
  'kapak: bant',
  `hazirlayan: ${A.prepared || ''}`,
  `hazirlayan unvan: ${titleLine(T.prepared)}`,
  `kontrol: ${A.checked || ''}`,
  `kontrol unvan: ${titleLine(T.checked)}`,
  `onay: ${A.approved || ''}`,
  `onay unvan: ${titleLine(T.approved)}`,
  `hazirlayan logo: ${m.showPrepared ? 'atlascert' : 'yok'}`,
  '---',
  ''
];
const proje = [
  ...front,
  '<!-- Proje: 0326066 / KBN 1B 1500 risk değerlendirmesi. Eski uygulamanın proje dosyasından dönüştürüldü. -->',
  '',
  '# Kapsam',
  ...mlField('makine tipi', m.machineType),
  ...mlField('kapsam', m.scope),
  ...mlField('alan', m.area),
  ...mlField('kapsam dışı', p.outOfScope),
  '',
  '# Revizyonlar',
  ...table(['Rev', 'Tarih', 'Açıklama', 'Hazırlayan', 'Onaylayan'], p.revisions.map((r) => [r.rev, r.date, r.desc, r.by, r.approvedBy])),
  '',
  '# Dağıtım',
  ...table(['No', 'Alıcı', 'Format'], p.distribution.map((d, i) => [String(i + 1), d.to, d.format])),
  '',
  '# Standartlar',
  ...table(['Referans', 'Başlık'], p.standards.map((s) => [s.ref, s.title])),
  ''
];
fs.writeFileSync(path.join(dst, '00-proje.md'), proje.join('\n'));

/* ─── 01-makine.md ─────────────────────────────────────────── */
const li = p.limits;
const makine = [
  '# Makine',
  '',
  ...mlPara(p.machine.desc),
  '## Teknik veriler',
  ...table(['Özellik', 'Değer'], p.machine.tech.map((t) => [t.label, t.value])),
  '',
  '## Kontrol paneli',
  ...table(['Etiket', 'Eleman / Fonksiyon', 'Güvenlik ilişkisi'], p.machine.panel.map((r) => [r.label, r.func, r.safety])),
  '',
  '# Sınırlar',
  ...mlField('kullanım amacı', li.intendedUse),
  ...mlField('çalışma modları', li.modes),
  ...mlField('kullanıcılar', li.users),
  '- kötüye kullanım:',
  ...li.misuse.flatMap((x) => mlItem('', x.text, '  ')),
  ...mlField('hareket alanı', li.movement),
  ...mlField('erişim', li.access),
  ...mlField('arayüzler', li.interfaces),
  ...mlField('ömür', li.life),
  `- profil: ${li.profile.dop} gün/yıl · ${li.profile.hop} h/gün · ${li.profile.tcycle} dk çevrim aralığı`,
  ...mlField('bakım', li.maintenance),
  ...mlField('ortam', li.environment),
  ...mlField('fazlar', li.phases),
  ''
];
fs.writeFileSync(path.join(dst, '01-makine.md'), makine.join('\n'));

/* ─── 02-fotograflar.md ────────────────────────────────────── */
const fotolar = [
  '# Fotoğraflar',
  '<!-- Tür: kapak, panel, genel, detay (Ek A), kurulum (Ek B), olcum (Ek C). Ölçüm ekranları ve gürültü fotoğrafları ölçüm tablolarında bağlıdır. -->',
  '',
  ...table(['Dosya', 'Tür', 'Açıklama'], photoRows),
  '',
  '# Tehlike Noktaları',
  `- fotoğraf: ${files.get(m.pointsPhoto) || ''}`,
  '',
  ...table(['No', 'x', 'y', 'Konum', 'Açıklama'], p.points.map((pt, i) => [String(i + 1), String(pt.x).replace('.', ','), String(pt.y).replace('.', ','), pt.label, pt.desc])),
  ''
];
fs.writeFileSync(path.join(dst, '02-fotograflar.md'), fotolar.join('\n'));

/* ─── 03-tehlikeler.md ─────────────────────────────────────── */
const TAG = ['M', 'Ö', 'B'];
const tehlike = ['# Tehlikeler', '<!-- Risk: O = olasılık, Ş = şiddet (1–5); "önlemden önce → sonra". Önlem etiketleri: [M] mevcut, [Ö] önerilen, [B] kullanım bilgisi. -->', ''];
p.hazards.forEach((h, i) => {
  tehlike.push(`## H-${pad2(i + 1)} · ${tr(h.type)}`);
  if (h.key) tehlike.push(`- anahtar: ${h.key}`);
  tehlike.push(...mlField('tür', h.type));
  tehlike.push(...mlField('durum', h.sit));
  tehlike.push(...mlField('faz', h.phase));
  const pts = h.points.map(ptNo).filter(Boolean);
  if (pts.length) tehlike.push(`- nokta: ${pts.join(', ')}`);
  tehlike.push(`- risk: O${h.o} Ş${h.s} → O${h.o2} Ş${h.s2}`);
  tehlike.push('- önlemler:');
  for (const x of h.meas) {
    const a = actId.get(`m:${x.uid}`);
    const text = Object.assign({}, x.text);
    if (a) for (const l of ['tr', 'en', 'de']) if (text[l]) text[l] = `${text[l]} → ${a}`;
    tehlike.push(...mlItem(`[${TAG[x.tag]}] `, text, '  '));
  }
  tehlike.push('');
});
fs.writeFileSync(path.join(dst, '03-tehlikeler.md'), tehlike.join('\n'));

/* ─── 04-guvenlik.md ───────────────────────────────────────── */
const ROLE = { input: 'Giriş', logic: 'Mantık', output: 'Çıkış', other: 'Diğer' };
const guv = ['# Güvenlik Fonksiyonları', '<!-- S/F/P: EN ISO 13849-1 Ek A risk grafiği. Alt sistemler ### başlıklarıyla (Giriş / Mantık / Çıkış). -->', ''];
p.sfs.forEach((sf, i) => {
  guv.push(`## SF-${pad2(i + 1)} · ${tr(sf.name)}`);
  if (sf.key) guv.push(`- anahtar: ${sf.key}`);
  guv.push(...mlField('ad', sf.name));
  guv.push(...mlField('tanım', sf.desc));
  guv.push(...mlField('tetikleyici', sf.trigger));
  guv.push(...mlField('güvenli durum', sf.safe));
  guv.push(`- tehlikeler: ${sf.hazards.map(hzId).filter(Boolean).join(', ')}`);
  for (const k of ['S', 'F', 'P']) {
    const j = sf.just[k] || {};
    guv.push(...mlField(k, { tr: `${sf[k]} — ${j.tr || ''}`, en: j.en, de: j.de }));
  }
  if (sf.pfh) guv.push(`- pfh: ${sf.pfh}`);
  guv.push('');
  for (const s of sf.subs) {
    guv.push(`### ${ROLE[s.role] || 'Diğer'} · Kat. ${s.cat}`);
    guv.push(...mlField('bileşen', s.comp));
    guv.push(`- kategori: ${s.cat}`);
    if (s.b10d != null && s.b10d !== '') guv.push(`- b10d: ${s.b10d}`);
    if (s.nop != null && s.nop !== '') guv.push(`- nop: ${s.nop}`);
    if (s.mttfd != null && s.mttfd !== '') guv.push(`- mttfd: ${s.mttfd}`);
    if (s.dc != null && s.dc !== '') guv.push(`- dc: ${s.dc}`);
    if (s.plOverride) guv.push(`- pl: ${s.plOverride}`);
    if (s.plCap) guv.push(`- pl sınırı: ${s.plCap}`);
    if (s.note && (s.note.tr || s.note.en)) guv.push(...mlField('not', s.note));
    guv.push('');
  }
});
if (p.sfNotes.length) {
  guv.push('## Notlar');
  for (const n of p.sfNotes) guv.push(...mlItem(n.kind === 'warn' ? '[uyarı] ' : '[bilgi] ', n.text));
  guv.push('');
}
guv.push('# CCF', '<!-- EN ISO 13849-1 Ek F; Kat. 2–4 için toplam ≥ 65. -->', '');
guv.push(...table(['No', 'Puan', 'Uygulandı', 'Önlem', 'Kanıt'], p.ccf.map((c) => [c.no, String(c.max), c.applied ? 'evet' : 'hayır', c.measure, c.evidence])));
guv.push('', '# Sistematik', '', ...mlPara(p.systematic));
fs.writeFileSync(path.join(dst, '04-guvenlik.md'), guv.join('\n'));

/* ─── 05-validasyon.md ─────────────────────────────────────── */
const val = ['# Validasyon', '<!-- Sonuç: U (uygun) / UD (uygun değil) / boş (yapılmadı). -->', ''];
p.validation.forEach((v, i) => {
  val.push(`## V-${pad2(i + 1)} · ${refId(v.ref) || '—'}`);
  val.push(...mlField('adım', v.step));
  val.push(...mlField('beklenen', v.expected));
  val.push(`- sonuç: ${v.result === 'ok' ? 'U' : v.result === 'nok' ? 'UD' : ''}`);
  if (v.date) val.push(`- tarih: ${v.date}`);
  if (v.note && (v.note.tr || v.note.en)) val.push(...mlField('not', v.note));
  val.push('');
});
fs.writeFileSync(path.join(dst, '05-validasyon.md'), val.join('\n'));

/* ─── 06-olcumler.md ───────────────────────────────────────── */
const E = p.elec;
const lim = E.limits;
const dec = (v) => String(v).replace('.', ',');
const ol = [
  '# Elektrik Testleri',
  '<!-- EN 60204-1 Bölüm 18. Satırlar No (R_PE) veya iletken çifti (ISO, HV) ile eşleşir; fotoğraflar olcum/ klasöründe. -->',
  `- tarih: ${E.date}`,
  `- saat: ${E.time}`,
  ...mlField('yer', E.location),
  `- cihaz: ${E.instrument}`,
  `- seri no: ${E.serial || ''}`,
  `- kalibrasyon: ${E.calib || ''}`,
  ...mlField('bağlantı', E.connection),
  `- test eden: ${E.testedBy}`,
  ...mlField('yöntem', E.method),
  `- R_PE: ${dec(lim.rpeI)} A · ${lim.rpeT} s · ≤ ${dec(lim.rpeMax.toFixed(2))} Ω`,
  `- R_ISO: ${lim.isoU} V DC · ${lim.isoT} s · ≥ ${dec(lim.isoMin.toFixed(2))} MΩ`,
  `- HV: ${lim.hvU} V AC · ${lim.hvT} s · ≤ ${dec(lim.hvMax.toFixed(2))} mA`,
  '',
  '## Koruma iletkeni sürekliliği (R_PE)',
  ...table(['No', 'Saat', 'Değer', 'Nokta', 'Fotoğraf'], E.rpe.map((r, i) => [r.tag || String(i + 1), r.time, r.value, r.point, files.get(r.photo) || ''])),
  '',
  '## Yalıtım direnci (R_ISO)',
  ...table(['Çift', 'Saat', 'Değer', 'Nokta', 'Fotoğraf'], E.iso.map((r) => [r.tag, r.time, r.value, r.point, files.get(r.photo) || ''])),
  '',
  '## Gerilim dayanım (HV)',
  ...table(['Çift', 'Saat', 'U', 'Değer', 'Nokta', 'Fotoğraf'], E.hv.map((r) => [r.tag, r.time, r.u, r.value, r.point, files.get(r.photo) || ''])),
  ''
];
if (noiseRows.length) {
  const h19 = p.hazards.find((h) => h.key === 'noise');
  const dev = h19 && /UNI-T UT353/.test(tr(h19.meas[0].text)) ? 'UNI-T UT353 ses seviye ölçer' : '[ses seviye ölçer]';
  ol.push(
    '# Gürültü',
    '<!-- A-ağırlıklı ses basınç seviyesi; operatör konumu satırları beyan için esas alınır (2006/42/AT Ek I 1.7.4.2 u). -->',
    `- tarih: ${E.date}`,
    `- cihaz: ${dev}`,
    ...mlField('yöntem', { tr: 'Makinenin ön, yan ve arka yüzlerinden 1,5 m mesafede, 1,6 m yükseklikte A-ağırlıklı ses basınç seviyesi ölçülmüştür (yerinde yöntem, EN ISO 11202 esas alınmıştır)', en: 'The A-weighted sound pressure level was measured at 1.5 m from the front, side and rear of the machine at a height of 1.6 m (in-situ method based on EN ISO 11202)', de: 'Der A-bewertete Schalldruckpegel wurde in 1,5 m Abstand von der Vorder-, Seiten- und Rückseite der Maschine in 1,6 m Höhe gemessen (Verfahren vor Ort in Anlehnung an EN ISO 11202)' }),
    ...mlField('çalışma durumu', { tr: 'Yıkama çevrimi; pompa, egzoz fanı ve püskürtme çalışır durumda', en: 'Washing cycle; pump, exhaust fan and spraying in operation', de: 'Waschzyklus; Pumpe, Absaugventilator und Spritzen in Betrieb' }),
    `- test eden: ${E.testedBy}`,
    '- operatör konumu: 1, 2, 3',
    '',
    ...table(['No', 'Konum', 'Mesafe', 'LpA', 'LCpeak', 'Arka plan', 'Fotoğraf'], noiseRows),
    ''
  );
}
const TH = p.thermal;
const MK = { pt: 'nokta', area: 'alan', hot: 'sıcak', cold: 'soğuk' };
ol.push(
  '# Termografi',
  '<!-- testo .bmt dosyaları termal/ klasöründe. İşaretçi koordinatları termal görüntü pikselidir (192×256). Çıplak: yansıtan çıplak sac, değerlendirmeye girmez. -->',
  `- tarih: ${TH.date}`,
  `- saat: ${TH.time}`,
  ...mlField('yer', TH.location),
  `- cihaz: ${TH.instrument}`,
  `- seri no: ${TH.serial}`,
  `- doğruluk: ${TH.accuracy}`,
  `- test eden: ${TH.testedBy}`,
  ...mlField('sınır', { tr: `${TH.limit} °C — ${tr(TH.limitText)}`, en: (TH.limitText || {}).en, de: (TH.limitText || {}).de }),
  ...mlField('durum', TH.condition),
  ...mlField('yöntem', TH.method),
  ...mlField('sonuç', TH.conclusion),
  ''
);
TH.images.forEach((t, i) => {
  ol.push(`## D-${i + 1} · ${tr(t.title)}`);
  ol.push(`- dosya: termal/${t.file}`);
  ol.push(...mlField('başlık', t.title));
  ol.push(...mlField('yorum', t.comment));
  if (t.lo != null && t.hi != null) ol.push(`- ölçek: ${t.lo}–${t.hi}`);
  const vis = p.photos.find((x) => x.uid === t.vis);
  if (vis && vis.crop) ol.push(`- kırp: ${[vis.crop.x, vis.crop.y, vis.crop.w, vis.crop.h].map((v) => String(+v.toFixed(4)).replace('.', ',')).join(' ')}`);
  ol.push('');
  ol.push(...table(['İşaret', 'Tür', 'x', 'y', 'w', 'h', 'Çıplak', 'Etiket'], t.markers.map((mk, k) => {
    let pt = 0;
    let ar = 0;
    const names = t.markers.map((x) => (x.type === 'hot' ? 'HS' : x.type === 'cold' ? 'CS' : x.type === 'area' ? `A${++ar}` : `M${++pt}`));
    const hc = mk.type === 'hot' || mk.type === 'cold';
    return [names[k], MK[mk.type], hc ? '' : String(Math.round(mk.x)), hc ? '' : String(Math.round(mk.y)), mk.type === 'area' ? String(Math.round(mk.w)) : '', mk.type === 'area' ? String(Math.round(mk.h)) : '', mk.ref ? 'evet' : '', mk.label];
  })));
  ol.push('');
});
fs.writeFileSync(path.join(dst, '06-olcumler.md'), ol.join('\n'));

/* ─── 07-sonuc.md ──────────────────────────────────────────── */
const STATUS = { open: 'açık', done: 'kapandı', rejected: 'uygulanmayacak' };
const son = [
  '# Sonuç',
  '',
  ...mlPara(p.conclusion),
  '# Aksiyonlar',
  ...table(['No', 'Aksiyon', 'Ref', 'Sorumlu', 'Termin', 'Durum'], p.actions.map((a, i) => [`A-${pad2(i + 1)}`, a.text, refId(a.ref) || a.refText || '', typeof a.owner === 'object' ? a.owner : String(a.owner || ''), typeof a.due === 'object' ? a.due : String(a.due || ''), STATUS[a.status] || 'açık'])),
  '',
  '# İşaretler',
  ...table(['Kod', 'Anlam', 'Konum'], p.signs.map((s) => [s.code, s.meaning, s.location])),
  ''
];
fs.writeFileSync(path.join(dst, '07-sonuc.md'), son.join('\n'));

console.log(`Yazıldı: ${dst}`);
console.log(`Fotoğraf: ${files.size} · gürültü satırı: ${noiseRows.length} · diğer ekran: ${otherScreens.length}`);
