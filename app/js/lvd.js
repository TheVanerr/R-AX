/* LVD test raporu — md ↔ veri modeli, değerlendirme, risk analizinden aktarım.
   Bir LVD raporu = lvd/<klasör>/lvd.md (+ olcum/, foto/, kurulum/, cikti/). Biçim: app/LVD-SEMASI.md.
   Risk analizi dosyalarını yalnız okur (aktarımda), hiçbir zaman yazmaz. DOM'a bağlı değildir (Node'da da çalışır). */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./md.js'), require('./util.js'), require('./lvd-lib.js'));
  else root.RaLvd = factory(root.RaMd, root.RaUtil, root.RA_LVD);
})(typeof self !== 'undefined' ? self : this, function (Md, U, LIB) {
  'use strict';

  const { norm } = Md;
  const { L3, MEAS, VISUAL, FUNC } = LIB;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const ml = (o) => (o && typeof o === 'object' ? { tr: o.tr || '', ...(o.en != null ? { en: o.en } : {}), ...(o.de != null ? { de: o.de } : {}) } : { tr: String(o == null ? '' : o) });
  const isEmptyML = (o) => !o || !['tr', 'en', 'de'].some((l) => o[l] && String(o[l]).trim());
  const cellTr = (c) => (c ? String(c.tr || '').trim() : '');
  const numsOf = (s) => (String(s || '').match(/\d+(?:[.,]\d+)?/g) || []).map((x) => +x.replace(',', '.'));
  const dec = (v) => String(v).replace('.', ',');

  /* ─── Boş model ─────────────────────────────────────────── */
  function blankRows(kind) {
    if (kind === 'rpe') return ['1', '2', '3'].map((t) => ({ tag: t, time: '', value: '', point: L3(''), photo: null }));
    if (kind === 'iso' || kind === 'hv') return LIB.PAIRS_3N.map((t) => ({ tag: t, time: '', u: '', value: '', point: LIB.pairText(t), photo: null }));
    if (kind === 'res') return [{ tag: '1', time: '', t: '1', value: '', point: L3('Besleme fişi uçları (L1, L2, L3, N) — fiş çekildikten sonra', 'Supply plug pins (L1, L2, L3, N) — after unplugging', 'Steckerstifte (L1, L2, L3, N) — nach dem Ziehen des Steckers'), photo: null }];
    if (kind === 'leak') return [{ tag: '1', time: '', value: '', point: L3('Koruma iletkeni akımı — makine çalışır durumda, tüm yükler devrede', 'Protective conductor current — machine in operation, all loads on', 'Schutzleiterstrom — Maschine in Betrieb, alle Verbraucher eingeschaltet'), photo: null }];
    return [];
  }
  function blank(opts) {
    const o = opts || {};
    const m = {
      dir: o.dir || '',
      meta: { type: 'lvd', job: '', customer: '', model: '', serial: '', year: '', brand: 'DOLFIN', manufacturer: '', brandName: '', brandLine: '', docNo: '', rev: '00', reportDate: '', status: 'draft', langs: ['tr', 'en', 'de'], approvals: { titles: {} }, preparedLogo: '', link: '', riskDoc: '', coverPhoto: '' },
      frontExtra: [],
      preamble: '',
      machine: { type: L3(''), supply: '', current: '', power: '', network: '', fuse: '', sccr: '', protClass: '', ip: '', connection: L3(''), desc: L3('') },
      cond: { date: '', time: '', location: L3(''), ambient: '', testedBy: '', connection: L3(''), method: L3('') },
      limits: Object.assign({}, LIB.LIMITS),
      limitsSet: {},
      devices: [],
      visual: VISUAL.map((v) => ({ id: v.id, result: '', note: L3(''), photo: null })),
      meas: {},
      func: FUNC.map((f) => ({ id: f.id, ref: '', test: L3(''), expected: L3(''), result: '', date: '', note: L3('') })),
      photos: [],
      revisions: [],
      conclusion: null,
      extra: []
    };
    for (const k of MEAS) m.meas[k] = { rows: o.rows === false ? [] : blankRows(k), status: k === 'loop' ? 'site' : '', note: L3('') };
    return m;
  }

  /* ─── md → model ────────────────────────────────────────── */
  const SECTIONS = {
    makine: ['makine', 'makine ve besleme', 'makine ve elektrik beslemesi', 'besleme', 'machine'],
    test: ['test kosullari', 'test bilgileri', 'kosullar', 'test', 'test conditions'],
    cihazlar: ['test cihazlari', 'cihazlar', 'olcum cihazlari', 'test equipment'],
    gozle: ['gozle kontrol', 'gorsel kontrol', 'kontrol listesi', 'visual inspection'],
    olcumler: ['olcumler', 'olcum ve test sonuclari', 'olcum sonuclari', 'testler', 'measurements'],
    fonksiyon: ['fonksiyon testleri', 'fonksiyonel testler', 'functional tests'],
    fotograflar: ['fotograflar', 'photos'],
    sonuc: ['sonuc', 'sonuc ve onay', 'conclusion'],
    revizyonlar: ['revizyonlar', 'revizyon gecmisi', 'revisions']
  };
  const ALIASES = Object.entries(SECTIONS).flatMap(([k, list]) => list.map((a) => [a, k])).sort((a, b) => b[0].length - a[0].length);
  function sectionKey(title) {
    const k = norm(title).replace(/^(ek [a-z] |\d+( \d+)* )/, '');
    for (const [a, key] of ALIASES) if (k === a || k.startsWith(`${a} `)) return key;
    return null;
  }
  /** Ölçüm alt başlığı → test türü */
  function measKind(title) {
    const k = norm(title);
    if (/koruma iletkeni akimi|kacak|leak|pe akimi|schutzleiterstrom/.test(k)) return 'leak';
    if (/artik|residual|restspannung/.test(k)) return 'res';
    if (/dongu|empedans|loop|test 2|\bzs\b|schleife/.test(k)) return 'loop';
    if (/sureklil|r pe|\brpe\b|topraklama|bonding|continuity|test 1|durchgang/.test(k)) return 'rpe';
    if (/yalitim|izolasyon|r iso|\briso\b|insulation|isolation/.test(k)) return 'iso';
    if (/gerilim testi|gerilim dayanim|dayanim|\bhv\b|flash|withstand|voltage test|spannungsprufung/.test(k)) return 'hv';
    return null;
  }
  const RESULT = (s) => {
    const k = norm(s);
    if (!k) return '';
    if (/^(ud|uygun degil|nok|nc|n i o|nio|fail|hata|x)$/.test(k)) return 'nok';
    if (/^(uy|uygulanamaz|na|n a|entf|entfallt|yok)$/.test(k)) return 'na';
    if (/^(u|uygun|ok|c|i o|io|pass|evet|tamam)$/.test(k) || /^✓|✔/.test(String(s).trim())) return 'ok';
    return '';
  };
  const RESULT_MD = { ok: 'U', nok: 'UD', na: 'UY' };
  const STATUS = (s) => {
    const k = norm(s);
    if (!k) return '';
    if (/kurulum|yerinde|site|vor ort/.test(k)) return 'site';
    if (/uygulanamaz|^na$|^n a$|entf/.test(k)) return 'na';
    if (/yapilmadi|yapilmamis|not done|nicht/.test(k)) return 'skip';
    if (/yapildi|done|durchgef/.test(k)) return 'done';
    return '';
  };
  const STATUS_MD = { site: 'kurulum yerinde', na: 'uygulanamaz', skip: 'yapılmadı', done: 'yapıldı' };
  const KIND = (s) => {
    const k = norm(s);
    if (/kapak|genel gorunum|cover/.test(k)) return 'cover';
    if (/etiket|nameplate|typschild/.test(k)) return 'nameplate';
    if (/pano|panel/.test(k)) return 'panel';
    if (/kurulum|setup|cihaz/.test(k)) return 'setup';
    return 'general';
  };
  const KIND_MD = { cover: 'kapak', nameplate: 'etiket', panel: 'pano', setup: 'kurulum', general: 'genel' };

  const F = (node, ...names) => Md.field(node, ...names);
  const TXT = (node, ...names) => { const it = F(node, ...names); return it ? String(it.value.tr || '').trim() : ''; };
  const MLF = (node, ...names) => { const it = F(node, ...names); return it ? clone(it.value) : null; };
  const join = (dir, rel) => (rel ? U.joinPath(dir, rel) : null);

  function mapFront(front, m) {
    const get = (...ks) => { for (const k of ks) { const v = front[norm(k)]; if (v != null && v !== '') return v; } return null; };
    const M = m.meta;
    const set = (k, ...ks) => { const v = get(...ks); if (v != null) M[k] = v; };
    set('job', 'no', 'is no', 'iş no', 'proje no');
    set('customer', 'musteri', 'müşteri');
    set('model', 'model');
    set('serial', 'makine seri no', 'seri no');
    set('year', 'yil', 'yıl', 'imal yili');
    set('brand', 'marka');
    set('manufacturer', 'uretici', 'üretici');
    set('brandName', 'marka adi', 'marka adı');
    set('brandLine', 'marka satiri', 'marka satırı');
    set('docNo', 'dokuman', 'doküman', 'rapor no');
    set('rev', 'rev', 'revizyon');
    set('reportDate', 'tarih', 'rapor tarihi');
    set('preparedLogo', 'hazirlayan logo', 'hazırlayan logo');
    set('link', 'risk analizi', 'risk analizi klasoru');
    set('riskDoc', 'risk analizi no', 'risk analizi dokuman');
    set('coverPhoto', 'kapak foto', 'kapak fotografi');
    const st = get('durum');
    if (st) M.status = /yay|onay|final|son/i.test(st) ? 'final' : 'draft';
    const dl = get('diller');
    if (dl) { const ls = dl.toLowerCase().split(/[,;\s]+/).filter((l) => ['tr', 'en', 'de'].includes(l)); if (ls.length) M.langs = ls; }
    for (const [k, names] of [['prepared', ['hazirlayan', 'hazırlayan']], ['checked', ['kontrol', 'kontrol eden']], ['approved', ['onay', 'onaylayan']]]) {
      const v = get(...names);
      if (v != null) M.approvals[k] = v;
      const t = get(...names.map((n) => `${n} unvan`));
      if (t != null) M.approvals.titles[k] = /^(-|yok|none)$/i.test(t.trim()) ? L3('', '', '') : Md.splitLangs(t);
    }
  }
  const FRONT_KNOWN = new Set(['tur', 'no', 'is no', 'proje no', 'musteri', 'model', 'makine seri no', 'seri no', 'yil', 'imal yili', 'marka', 'uretici', 'marka adi', 'marka satiri', 'dokuman', 'rapor no', 'rev', 'revizyon', 'tarih', 'rapor tarihi', 'durum', 'diller', 'hazirlayan', 'hazirlayan unvan', 'kontrol', 'kontrol eden', 'kontrol unvan', 'kontrol eden unvan', 'onay', 'onaylayan', 'onay unvan', 'onaylayan unvan', 'hazirlayan logo', 'risk analizi', 'risk analizi klasoru', 'risk analizi no', 'risk analizi dokuman', 'kapak foto', 'kapak fotografi'].map(norm));

  const ROW_ALIAS = {
    tag: ['no', 'cift', 'çift', 'iletken cifti', 'iletken çifti', 'nokta no'], time: ['saat'], u: ['u', 'u v', 'test gerilimi'], t: ['sure', 'süre', 't', 't s'],
    value: ['deger', 'değer', 'olcum', 'ölçüm', 'r pe', 'r iso', 'i', 'i pe', 'ipe', 'u olculen', 'gerilim'], point: ['nokta', 'olcum noktasi', 'ölçüm noktası', 'aciklama', 'açıklama'], photo: ['fotograf', 'fotoğraf', 'foto']
  };
  const LOOP_ALIAS = { tag: ['no'], time: ['saat'], circuit: ['devre', 'nokta', 'olcum noktasi'], device: ['koruma', 'koruma cihazi', 'koruma cihazı', 'sigorta'], zs: ['zs', 'zs olculen', 'deger', 'değer'], zsMax: ['zs max', 'zsmax', 'zs izin', 'izin verilen'], photo: ['fotograf', 'fotoğraf', 'foto'] };

  /** lvd.md metni → model. dir: rapor klasörü (fotoğraf yolları buna göre çözülür) */
  function parse(text, dir) {
    const src = String(text == null ? '' : text).replace(/^﻿/, '');
    const ast = Md.parse(src);
    const m = blank({ dir, rows: false });
    m.meas.loop.status = '';
    mapFront(ast.front, m);
    m.frontExtra = ast.frontKeys.filter((f) => !FRONT_KNOWN.has(f.key)).map((f) => ({ keyRaw: f.keyRaw, value: f.value }));
    // Ham satırlar: tanınmayan bölümler ve ön metin olduğu gibi korunur
    const lines = src.replace(/\r\n?/g, '\n').split('\n');
    let bodyStart = 0;
    if (lines[0] && lines[0].trim() === '---') { const e = lines.findIndex((l, i) => i > 0 && l.trim() === '---'); bodyStart = e >= 0 ? e + 1 : 0; }
    const secs = ast.sections;
    const firstLine = secs.length ? secs[0].line - 1 : lines.length;
    m.preamble = lines.slice(bodyStart, firstLine).join('\n').trim();
    const seen = {};
    secs.forEach((sec, i) => {
      const key = sectionKey(sec.title);
      if (!key || seen[key]) {
        const end = i + 1 < secs.length ? secs[i + 1].line - 1 : lines.length;
        m.extra.push(lines.slice(sec.line - 1, end).join('\n').replace(/\s+$/, ''));
        return;
      }
      seen[key] = true;
      P[key](sec, m, dir);
    });
    m.visual = mergeVisual(m.visual);
    m.func = mergeFunc(m.func, seen.fonksiyon);
    m._sections = seen;
    return m;
  }
  /** Kütüphanedeki her kontrol maddesi listede olur (md'de yazılmamışsa boş sonuçla), md'deki ek maddeler korunur */
  function mergeVisual(rows) {
    const out = VISUAL.map((v) => rows.find((r) => r.id === v.id) || { id: v.id, result: '', note: L3(''), photo: null });
    return out.concat(rows.filter((r) => !VISUAL.some((v) => v.id === r.id)));
  }
  function mergeFunc(rows, fromMd) {
    if (fromMd) return rows;
    return FUNC.map((f) => ({ id: f.id, ref: '', test: L3(''), expected: L3(''), result: '', date: '', note: L3('') }));
  }

  const P = {};
  P.makine = (n, m) => {
    const M = m.machine;
    const t = MLF(n, 'makine tipi', 'tip');
    if (t) M.type = t;
    for (const [k, names] of Object.entries({ supply: ['besleme', 'besleme gerilimi', 'gerilim'], current: ['anma akimi', 'anma akımı', 'tam yuk akimi', 'tam yük akımı', 'akim', 'akım'], power: ['kurulu guc', 'kurulu güç', 'guc', 'güç'], network: ['sebeke', 'şebeke', 'sebeke tipi', 'şebeke tipi'], fuse: ['on koruma', 'ön koruma', 'sigorta'], sccr: ['kisa devre', 'kısa devre', 'kisa devre dayanimi', 'kısa devre dayanımı', 'sccr'], protClass: ['koruma sinifi', 'koruma sınıfı'], ip: ['ip', 'koruma derecesi'] })) {
      const v = TXT(n, ...names);
      if (v) M[k] = v;
    }
    const c = MLF(n, 'baglanti', 'bağlantı', 'besleme baglantisi', 'besleme bağlantısı');
    if (c) M.connection = c;
    if (n.text) M.desc = clone(n.text);
  };
  P.test = (n, m) => {
    const C = m.cond;
    for (const [k, names] of Object.entries({ date: ['tarih'], time: ['saat'], ambient: ['ortam', 'ortam kosullari', 'ortam koşulları'], testedBy: ['test eden', 'olcen', 'ölçen'] })) { const v = TXT(n, ...names); if (v) C[k] = v; }
    for (const [k, names] of Object.entries({ location: ['yer', 'test yeri'], connection: ['baglanti', 'bağlantı'], method: ['yontem', 'yöntem'] })) { const v = MLF(n, ...names); if (v) C[k] = v; }
    const L = m.limits;
    const S = m.limitsSet;
    const rpe = numsOf(TXT(n, 'r pe', 'rpe'));
    if (rpe.length >= 3) { Object.assign(L, { rpeI: rpe[0], rpeT: rpe[1], rpeMax: rpe[2] }); S.rpe = true; }
    const iso = numsOf(TXT(n, 'r iso', 'riso'));
    if (iso.length >= 3) { Object.assign(L, { isoU: iso[0], isoT: iso[1], isoMin: iso[2] }); S.iso = true; }
    const hv = numsOf(TXT(n, 'hv', 'gerilim testi'));
    if (hv.length >= 3) { Object.assign(L, { hvU: hv[0], hvT: hv[1], hvMax: hv[2] }); S.hv = true; }
    const lk = numsOf(TXT(n, 'kacak akim', 'kaçak akım', 'koruma iletkeni akimi', 'koruma iletkeni akımı'));
    if (lk.length) { L.leakMax = lk[0]; S.leak = true; }
    const rs = numsOf(TXT(n, 'artik gerilim', 'artık gerilim'));
    if (rs.length) { L.resMax = rs[0]; if (rs[1] != null) L.resT = rs[1]; S.res = true; }
    const u0 = numsOf(TXT(n, 'u0', 'u 0', 'faz notr gerilimi'));
    if (u0.length) { L.u0 = u0[0]; S.u0 = true; }
  };
  P.cihazlar = (n, m) => {
    const t = n.tables[0];
    if (!t) return;
    m.devices = Md.tableObjects(t, { name: ['cihaz', 'cihaz adi'], model: ['marka model', 'marka / model', 'model', 'marka'], serial: ['seri no', 'seri'], calib: ['kalibrasyon', 'kalibrasyon tarihi'], valid: ['gecerlilik', 'geçerlilik', 'gecerlilik tarihi', 'son gecerlilik'] })
      .map((r) => ({ name: r.name || L3(''), model: cellTr(r.model), serial: cellTr(r.serial), calib: cellTr(r.calib), valid: cellTr(r.valid) }))
      .filter((d) => !isEmptyML(d.name) || d.model || d.serial);
  };
  P.gozle = (n, m, dir) => {
    const t = n.tables[0];
    if (!t) return;
    m.visual = Md.tableObjects(t, { id: ['no'], result: ['sonuc', 'sonuç'], note: ['not', 'aciklama', 'açıklama', 'kanit', 'kanıt'], photo: ['foto', 'fotograf', 'fotoğraf'], text: ['kontrol', 'kontrol maddesi', 'madde metni'], clause: ['madde'] })
      .map((r) => {
        const idRaw = cellTr(r.id);
        const mm = /^G\s*-?\s*(\d+)$/i.exec(idRaw);
        const row = { id: mm ? `G-${U.pad2(+mm[1])}` : idRaw, result: RESULT(cellTr(r.result)), note: r.note || L3(''), photo: join(dir, cellTr(r.photo)) };
        if (r.text && !isEmptyML(r.text)) row.text = r.text;
        if (r.clause && cellTr(r.clause)) row.clause = cellTr(r.clause);
        return row;
      }).filter((r) => r.id);
  };
  P.olcumler = (n, m, dir) => {
    for (const c of n.children) {
      const kind = measKind(c.title);
      if (!kind) continue;
      const sec = m.meas[kind];
      sec.status = STATUS(TXT(c, 'durum'));
      const note = MLF(c, 'not');
      if (note) sec.note = note;
      const t = c.tables[0];
      if (!t) continue;
      if (kind === 'loop') {
        sec.rows = Md.tableObjects(t, LOOP_ALIAS).map((r, i) => ({ tag: cellTr(r.tag) || String(i + 1), time: cellTr(r.time), circuit: r.circuit || L3(''), device: cellTr(r.device), zs: cellTr(r.zs), zsMax: cellTr(r.zsMax), photo: join(dir, cellTr(r.photo)) }));
      } else {
        sec.rows = Md.tableObjects(t, ROW_ALIAS).map((r, i) => {
          const tag = cellTr(r.tag).replace(/\s+/g, '').toUpperCase() || String(i + 1);
          const row = { tag, time: cellTr(r.time), value: cellTr(r.value), point: r.point || L3(''), photo: join(dir, cellTr(r.photo)) };
          if (kind === 'hv') row.u = cellTr(r.u);
          if (kind === 'res') row.t = cellTr(r.t);
          return row;
        });
      }
    }
  };
  P.fonksiyon = (n, m) => {
    const t = n.tables[0];
    if (!t) { m.func = []; return; }
    m.func = Md.tableObjects(t, { id: ['no'], ref: ['ref', 'sf', 'ilgili'], test: ['test', 'test adimi', 'adim', 'adım'], expected: ['beklenen', 'beklenen sonuc', 'beklenen sonuç'], result: ['sonuc', 'sonuç'], date: ['tarih'], note: ['not'], clause: ['madde'] })
      .map((r) => {
        const idRaw = cellTr(r.id);
        const mf = /^F\s*-?\s*(\d+)$/i.exec(idRaw);
        const mv = /^V\s*-?\s*(\d+)$/i.exec(idRaw);
        const row = { id: mf ? `F-${U.pad2(+mf[1])}` : mv ? `V-${U.pad2(+mv[1])}` : idRaw, ref: cellTr(r.ref), test: r.test || L3(''), expected: r.expected || L3(''), result: RESULT(cellTr(r.result)), date: cellTr(r.date), note: r.note || L3('') };
        if (r.clause && cellTr(r.clause)) row.clause = cellTr(r.clause);
        return row;
      }).filter((r) => r.id);
  };
  P.fotograflar = (n, m, dir) => {
    const t = n.tables[0];
    if (!t) return;
    m.photos = Md.tableObjects(t, { file: ['dosya', 'fotograf', 'fotoğraf'], kind: ['tur', 'tür'], caption: ['aciklama', 'açıklama', 'baslik', 'başlık'] })
      .map((r) => ({ file: join(dir, cellTr(r.file)), kind: KIND(cellTr(r.kind)), caption: r.caption || L3('') }))
      .filter((x) => x.file);
  };
  P.sonuc = (n, m) => { if (n.text) m.conclusion = clone(n.text); };
  P.revizyonlar = (n, m) => {
    const t = n.tables[0];
    if (!t) return;
    m.revisions = Md.tableObjects(t, { rev: ['rev', 'revizyon'], date: ['tarih'], desc: ['aciklama', 'açıklama'], by: ['hazirlayan', 'hazırlayan'], approvedBy: ['onaylayan', 'onay'] })
      .map((r) => ({ rev: cellTr(r.rev), date: cellTr(r.date), desc: r.desc || L3(''), by: cellTr(r.by), approvedBy: cellTr(r.approvedBy) }))
      .filter((r) => r.rev);
  };

  /* ─── Değerlendirme ─────────────────────────────────────── */
  /** "C16", "B 10 A", "C16A" → { type, In, Ia } */
  function tripOf(s) {
    const mm = /\b([BCDKZ])\s*(\d+(?:[.,]\d+)?)\s*A?\b/i.exec(String(s || ''));
    if (!mm) return null;
    const type = mm[1].toUpperCase();
    const In = +mm[2].replace(',', '.');
    return { type, In, Ia: LIB.TRIP_K[type] * In };
  }
  /** Satır değerlendirmesi: { v (parseNum), ok (true / false / null), lim } */
  function evalRow(kind, r, L) {
    if (kind === 'loop') {
      const zs = U.parseNum(r.zs);
      let max = U.num(r.zsMax);
      if (max == null) { const tr = tripOf(r.device); if (tr) max = +(L.u0 / tr.Ia).toFixed(3); }
      return { v: zs, ok: zs && max != null ? zs.n <= max : null, lim: max };
    }
    const v = U.parseNum(r.value);
    if (!v) return { v: null, ok: null, lim: null };
    if (kind === 'rpe') return { v, ok: v.n <= L.rpeMax, lim: L.rpeMax };
    if (kind === 'iso') return { v, ok: v.n >= L.isoMin, lim: L.isoMin };
    if (kind === 'hv') return { v, ok: v.n <= L.hvMax, lim: L.hvMax };
    if (kind === 'res') return { v, ok: v.n <= L.resMax, lim: L.resMax };
    if (kind === 'leak') return { v, ok: v.n <= L.leakMax, lim: L.leakMax };
    return { v, ok: null, lim: null };
  }

  /**
   * Durumlar: pass (uygun) · fail (uygunsuz) · open (eksik değer / sonuç) · none (satır yok, yapılmadı) ·
   * na (uygulanamaz) · site (kurulum yerinde) · skip (yapılmadı, gerekçeli) · warn (koşullu: §8.2.6)
   */
  function evaluate(m, opts) {
    const o = opts || {};
    const L = m.limits;
    const tests = {};
    const checks = [];
    const add = (level, msg) => checks.push({ level, msg });
    const visById = Object.fromEntries(m.visual.map((v) => [v.id, v]));
    for (const k of MEAS) {
      const sec = m.meas[k];
      const rows = sec.rows.map((r) => Object.assign({ r }, evalRow(k, r, L)));
      const valid = rows.filter((x) => x.v && (k !== 'loop' || x.lim != null));
      const fails = valid.filter((x) => x.ok === false).length;
      const missing = rows.filter((x) => !x.v).length;
      let state;
      if (sec.status === 'na') state = 'na';
      else if (sec.status === 'skip' && !valid.length) state = 'skip';
      else if (sec.status === 'site' && !valid.length) state = 'site';
      else if (!valid.length) state = rows.length && rows.some((x) => x.r.photo || x.r.time) ? 'open' : 'none';
      else if (fails) state = k === 'leak' && visById['G-15'] && visById['G-15'].result === 'ok' ? 'pass' : k === 'leak' ? 'warn' : 'fail';
      else state = missing ? 'open' : 'pass';
      const nums = valid.map((x) => x.v);
      tests[k] = { state, rows, n: valid.length, fails, missing, lo: nums.length ? nums.reduce((a, b) => (b.n < a.n ? b : a)) : null, hi: nums.length ? nums.reduce((a, b) => (b.n > a.n ? b : a)) : null, allGt: nums.length && nums.every((x) => x.gt) };
    }
    const tally = (list) => ({ ok: list.filter((x) => x.result === 'ok').length, nok: list.filter((x) => x.result === 'nok').length, na: list.filter((x) => x.result === 'na').length, open: list.filter((x) => !x.result).length, n: list.length });
    const vt = tally(m.visual);
    tests.visual = Object.assign({ state: vt.nok ? 'fail' : !vt.n || vt.open === vt.n ? 'none' : vt.open ? 'open' : 'pass' }, vt);
    const ft = tally(m.func);
    tests.func = Object.assign({ state: ft.nok ? 'fail' : !ft.n || ft.open === ft.n ? 'none' : ft.open ? 'open' : 'pass' }, ft);

    // Genel sonuç: zorunlu test (a, b, h) yapılmamışsa açık; uygulanabilir testlerde satır yoksa "yapılmadı" sayılır
    const blocking = [];
    const fails = [];
    const conds = [];
    for (const t of LIB.TESTS) {
      const s = tests[t.key].state;
      if (s === 'fail') fails.push(t);
      else if (s === 'open' || (t.req && (s === 'none' || s === 'skip'))) blocking.push(t);
      else if (s === 'site' || s === 'warn') conds.push(t);
    }
    const overall = fails.length ? 'fail' : blocking.length ? 'open' : conds.length ? 'cond' : 'pass';

    // Kontrol listesi
    const M = m.meta;
    if (!M.job) add('error', 'İş no yazılmamış (ön bilgi: no)');
    if (!M.model) add('error', 'Model yazılmamış (ön bilgi: model)');
    if (!M.serial) add('warn', 'Makine seri no yazılmamış (ön bilgi: makine seri no)');
    if (!m.machine.supply) add('warn', 'Besleme gerilimi / faz / frekans yazılmamış (Makine: besleme)');
    if (!m.cond.date) add('warn', 'Test tarihi yazılmamış (Test Koşulları: tarih)');
    if (!m.cond.testedBy) add('warn', 'Test eden yazılmamış');
    if (!m.devices.length) add('warn', 'Test cihazı listesi boş (Test Cihazları)');
    const testDate = toDate(m.cond.date);
    for (const d of m.devices) {
      const v = toDate(d.valid);
      if (v && testDate && v < testDate) add('error', `${(d.name && d.name.tr) || d.model}: kalibrasyon geçerliliği (${d.valid}) test tarihinden önce bitmiş`);
      if (!d.serial) add('info', `${(d.name && d.name.tr) || d.model}: seri no yok`);
      if (!d.calib && !d.valid) add('warn', `${(d.name && d.name.tr) || d.model}: kalibrasyon bilgisi yok`);
    }
    const label = { rpe: 'R_PE', loop: 'Z_s', iso: 'R_ISO', hv: 'HV', res: 'Artık gerilim', leak: 'Koruma iletkeni akımı' };
    for (const k of MEAS) {
      const T = tests[k];
      for (const x of T.rows) {
        if (x.ok === false && k !== 'leak') add('error', `${label[k]} ${x.r.tag}: ${x.r.value || x.r.zs} — kabul kriteri dışında`);
        if (x.ok === false && k === 'leak') add(T.state === 'pass' ? 'info' : 'warn', `Koruma iletkeni akımı ${x.r.value} mA > ${L.leakMax} mA: §8.2.6 önlemleri gerekli (G-15)`);
        if (!x.v && x.r.photo) add('warn', `${label[k]} ${x.r.tag}: fotoğraf var, değer yazılmamış`);
        if (x.v && !x.r.photo && k !== 'loop') add('info', `${label[k]} ${x.r.tag}: ölçüm fotoğrafı yok`);
        if (k === 'loop' && x.v && x.lim == null) add('warn', `Z_s ${x.r.tag}: koruma cihazı (ör. C16) veya Zs max yazılmamış`);
        if (x.r.photo && o.exists && !o.exists(x.r.photo)) add('error', `Bulunamayan fotoğraf: ${x.r.photo}`);
      }
    }
    for (const t of LIB.TESTS) {
      const s = tests[t.key].state;
      if (t.req && (s === 'none' || s === 'skip')) add('warn', `${t.letter}) ${t.name.tr}: zorunlu test yapılmamış`);
      else if (s === 'open' && t.key !== 'visual' && t.key !== 'func') add('warn', `${t.letter}) ${t.name.tr}: eksik değer var`);
      else if (!t.req && s === 'none') add('info', `${t.letter}) ${t.name.tr}: bu revizyonda yapılmadı`);
    }
    for (const v of m.visual) if (v.result === 'nok') add('error', `Gözle kontrol ${v.id}: uygun değil`);
    if (vt.open && vt.open < vt.n) add('warn', `Gözle kontrol: ${vt.open} madde sonuçsuz`);
    for (const f of m.func) if (f.result === 'nok') add('error', `Fonksiyon testi ${f.id}: uygun değil`);
    if (ft.open && ft.open < ft.n) add('warn', `Fonksiyon testleri: ${ft.open} test sonuçsuz`);
    for (const p of m.photos) if (o.exists && !o.exists(p.file)) add('error', `Bulunamayan fotoğraf: ${p.file}`);
    const errors = checks.filter((c) => c.level === 'error').length;
    const warnings = checks.filter((c) => c.level === 'warn').length;
    return { tests, overall, fails, blocking, conds, checks, errors, warnings };
  }
  function toDate(s) {
    const x = /^\s*(\d{1,2})[./-](\d{1,2})[./-](\d{4})\s*$/.exec(String(s || ''));
    if (x) return new Date(+x[3], +x[2] - 1, +x[1]).getTime();
    const y = /^\s*(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    return y ? new Date(+y[1], +y[2] - 1, +y[3]).getTime() : null;
  }

  /** Güncel revizyonun satırı ön bilgiden (kapakla aynı) */
  function revisions(m) {
    const out = (m.revisions || []).map((r) => Object.assign({}, r));
    const num = (x) => { const d = /\d+/.exec(String(x || '')); return d ? String(+d[0]) : String(x || ''); };
    let cur = out.find((r) => num(r.rev) === num(m.meta.rev));
    if (!cur) {
      cur = { rev: m.meta.rev || '00', date: '', desc: !out.length && num(m.meta.rev) === '0' ? L3(LIB.T.tr.firstIssue, LIB.T.en.firstIssue, LIB.T.de.firstIssue) : L3(LIB.T.tr.revTbd, LIB.T.en.revTbd, LIB.T.de.revTbd), by: '', approvedBy: '' };
      out.push(cur);
    }
    if (m.meta.reportDate) cur.date = m.meta.reportDate;
    if (m.meta.approvals.prepared) cur.by = m.meta.approvals.prepared;
    if (m.meta.approvals.approved) cur.approvedBy = m.meta.approvals.approved;
    return out;
  }

  /* ─── model → md ────────────────────────────────────────── */
  const esc1 = (s) => String(s == null ? '' : s).replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|').trim();
  const cell = (s) => String(s == null ? '' : s).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
  const relOf = (m, f) => (f && m.dir && f.startsWith(`${m.dir}/`) ? f.slice(m.dir.length + 1) : f || '');
  /** Çok dilli alan: kısa metin tek satırda " | " ile, uzun metin alt maddelerle */
  function fieldLines(key, o) {
    if (o == null) return [];
    if (typeof o === 'string') return o.trim() ? [`- ${key}: ${esc1(o)}`] : [];
    if (isEmptyML(o)) return [];
    const parts = [esc1(o.tr)];
    const long = ['tr', 'en', 'de'].some((l) => String(o[l] || '').length > 90);
    if (long) {
      const out = [`- ${key}: ${parts[0]}`];
      if (o.en) out.push(`  - en: ${esc1(o.en)}`);
      if (o.de) out.push(`  - de: ${esc1(o.de)}`);
      return out;
    }
    if (o.en || o.de) parts.push(esc1(o.en || ''));
    if (o.de) parts.push(esc1(o.de));
    return [`- ${key}: ${parts.join(' | ')}`];
  }
  /** Tablo: her satır, çevirisi olan hücreler için "en:" / "de:" devam satırlarıyla */
  function tableLines(head, rows) {
    const out = [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`];
    for (const cells of rows) {
      out.push(`| ${cells.map((c) => cell(c && typeof c === 'object' ? c.tr : c)).join(' | ')} |`);
      for (const lang of ['en', 'de']) {
        if (!cells.some((c) => c && typeof c === 'object' && c[lang] && String(c[lang]).trim() && c[lang] !== c.tr)) continue;
        out.push(`| ${cells.map((c) => (c && typeof c === 'object' && c[lang] && String(c[lang]).trim() && c[lang] !== c.tr ? `${lang}: ${cell(c[lang])}` : '')).join(' | ')} |`);
      }
    }
    return out;
  }
  function paraLines(o) {
    if (!o || isEmptyML(o)) return [];
    const out = [];
    const tr = String(o.tr || '').trim();
    if (tr) out.push(tr, '');
    for (const lang of ['en', 'de']) {
      const v = String(o[lang] || '').trim();
      if (v) v.split(/\n{2,}/).forEach((p) => out.push(`${lang}: ${p}`, ''));
    }
    return out;
  }
  const TITLE = {
    rpe: 'Koruyucu bağlama devresinin sürekliliği (R_PE)', loop: 'Hata döngüsü empedansı (Test 2)', iso: 'Yalıtım direnci (R_ISO)',
    hv: 'Gerilim testi (HV)', res: 'Artık gerilim', leak: 'Koruma iletkeni akımı (kaçak akım)'
  };
  const libText = (list, id) => list.find((x) => x.id === id);

  /** Ön bilgide tek satır çok dilli değer: "TR | EN | DE" (boş unvan "-") */
  function mlInline(o) {
    if (!o) return '';
    if (isEmptyML(o)) return '-';
    const parts = [o.tr || '', o.en || '', o.de || ''].map((x) => String(x).replace(/\|/g, '\\|').trim());
    while (parts.length > 1 && !parts[parts.length - 1]) parts.pop();
    return parts.join(' | ');
  }
  function serialize(m) {
    const M = m.meta;
    const A = M.approvals || {};
    const Tt = A.titles || {};
    const L = [];
    const front = [['tur', 'lvd'], ['no', M.job], ['musteri', M.customer], ['model', M.model], ['makine seri no', M.serial], ['yil', M.year], ['marka', M.brand], ['uretici', M.manufacturer], ['marka adi', M.brandName], ['marka satiri', M.brandLine],
      ['dokuman', M.docNo], ['rev', M.rev], ['tarih', M.reportDate], ['durum', M.status === 'final' ? 'yayın' : 'taslak'], ['diller', (M.langs || []).join(', ')],
      ['hazirlayan', A.prepared], ['hazirlayan unvan', mlInline(Tt.prepared)],
      ['kontrol', A.checked], ['kontrol unvan', mlInline(Tt.checked)],
      ['onay', A.approved], ['onay unvan', mlInline(Tt.approved)],
      ['hazirlayan logo', M.preparedLogo], ['risk analizi', M.link], ['risk analizi no', M.riskDoc], ['kapak foto', relOf(m, M.coverPhoto)]];
    L.push('---');
    for (const [k, v] of front) if (v != null && String(v).trim() !== '') L.push(`${k}: ${String(v).trim()}`);
    for (const f of m.frontExtra || []) L.push(`${f.keyRaw}: ${f.value}`);
    L.push('---', '');
    L.push(m.preamble || '<!-- LVD test raporu (EN 60204-1:2018 Bölüm 18). Biçim: app/LVD-SEMASI.md. Uygulamanın LVD penceresi bu dosyayı yazar; elle de düzenlenebilir. -->', '');

    const C = m.machine;
    L.push('# Makine');
    L.push(...fieldLines('makine tipi', C.type));
    for (const [k, v] of [['besleme', C.supply], ['anma akımı', C.current], ['kurulu güç', C.power], ['şebeke', C.network], ['ön koruma', C.fuse], ['kısa devre dayanımı', C.sccr], ['koruma sınıfı', C.protClass], ['ip', C.ip]]) L.push(...fieldLines(k, v));
    L.push(...fieldLines('bağlantı', C.connection));
    L.push('');
    if (!isEmptyML(C.desc)) L.push(...paraLines(C.desc));

    const K = m.cond;
    const Li = m.limits;
    L.push('# Test Koşulları');
    for (const [k, v] of [['tarih', K.date], ['saat', K.time]]) L.push(...fieldLines(k, v));
    L.push(...fieldLines('yer', K.location));
    L.push(...fieldLines('ortam', K.ambient));
    L.push(...fieldLines('test eden', K.testedBy));
    L.push(...fieldLines('bağlantı', K.connection));
    L.push(...fieldLines('yöntem', K.method));
    L.push(`- R_PE: ${dec(Li.rpeI)} A · ${dec(Li.rpeT)} s · ≤ ${Number(Li.rpeMax).toFixed(2).replace('.', ',')} Ω`);
    L.push(`- R_ISO: ${dec(Li.isoU)} V DC · ${dec(Li.isoT)} s · ≥ ${Number(Li.isoMin).toFixed(2).replace('.', ',')} MΩ`);
    L.push(`- HV: ${dec(Li.hvU)} V AC · ${dec(Li.hvT)} s · ≤ ${Number(Li.hvMax).toFixed(2).replace('.', ',')} mA`);
    L.push(`- kaçak akım: ≤ ${dec(Li.leakMax)} mA`);
    L.push(`- artık gerilim: ≤ ${dec(Li.resMax)} V · ${dec(Li.resT)} s`);
    L.push(`- U0: ${dec(Li.u0)} V`);
    L.push('');

    L.push('# Test Cihazları');
    L.push(...tableLines(['Cihaz', 'Marka / model', 'Seri no', 'Kalibrasyon', 'Geçerlilik'], m.devices.map((d) => [d.name, d.model, d.serial, d.calib, d.valid])));
    L.push('');

    L.push('# Gözle Kontrol');
    L.push('<!-- Sonuç: U (uygun) · UD (uygun değil) · UY (uygulanamaz) · boş (kontrol edilmedi). Madde metinleri app/js/lvd-lib.js içindedir; ek madde için Kontrol ve Madde sütunları yazılır. -->');
    const custom = m.visual.some((v) => v.text);
    L.push(...tableLines(custom ? ['No', 'Sonuç', 'Not', 'Foto', 'Kontrol', 'Madde'] : ['No', 'Sonuç', 'Not', 'Foto'],
      m.visual.map((v) => (custom ? [v.id, RESULT_MD[v.result] || '', v.note, relOf(m, v.photo), v.text || '', v.clause || ''] : [v.id, RESULT_MD[v.result] || '', v.note, relOf(m, v.photo)]))));
    L.push('');

    L.push('# Ölçümler');
    L.push('');
    for (const k of MEAS) {
      const sec = m.meas[k];
      L.push(`## ${TITLE[k]}`);
      if (sec.status) L.push(`- durum: ${STATUS_MD[sec.status]}`);
      L.push(...fieldLines('not', sec.note));
      if (k === 'loop') {
        if (sec.rows.length) L.push(...tableLines(['No', 'Saat', 'Devre', 'Koruma', 'Zs', 'Zs max', 'Fotoğraf'], sec.rows.map((r) => [r.tag, r.time, r.circuit, r.device, r.zs, r.zsMax, relOf(m, r.photo)])));
      } else if (k === 'hv') L.push(...tableLines(['Çift', 'Saat', 'U', 'Değer', 'Nokta', 'Fotoğraf'], sec.rows.map((r) => [r.tag, r.time, r.u, r.value, r.point, relOf(m, r.photo)])));
      else if (k === 'iso') L.push(...tableLines(['Çift', 'Saat', 'Değer', 'Nokta', 'Fotoğraf'], sec.rows.map((r) => [r.tag, r.time, r.value, r.point, relOf(m, r.photo)])));
      else if (k === 'res') L.push(...tableLines(['No', 'Saat', 'Süre', 'Değer', 'Nokta', 'Fotoğraf'], sec.rows.map((r) => [r.tag, r.time, r.t, r.value, r.point, relOf(m, r.photo)])));
      else L.push(...tableLines(['No', 'Saat', 'Değer', 'Nokta', 'Fotoğraf'], sec.rows.map((r) => [r.tag, r.time, r.value, r.point, relOf(m, r.photo)])));
      L.push('');
    }

    L.push('# Fonksiyon Testleri');
    L.push('<!-- F-xx: test metni kütüphaneden gelir (Test / Beklenen boşsa). V-xx: risk analizinin validasyon testleri. Sonuç: U / UD / UY. -->');
    L.push(...tableLines(['No', 'Ref', 'Test', 'Beklenen', 'Sonuç', 'Tarih', 'Not'], m.func.map((f) => [f.id, f.ref, f.test, f.expected, RESULT_MD[f.result] || '', f.date, f.note])));
    L.push('');

    L.push('# Fotoğraflar');
    L.push(...tableLines(['Dosya', 'Tür', 'Açıklama'], m.photos.map((p) => [relOf(m, p.file), KIND_MD[p.kind] || 'genel', p.caption])));
    L.push('');

    if (m.conclusion && !isEmptyML(m.conclusion)) { L.push('# Sonuç', '', ...paraLines(m.conclusion)); }

    if ((m.revisions || []).length) {
      L.push('# Revizyonlar');
      L.push(...tableLines(['Rev', 'Tarih', 'Açıklama', 'Hazırlayan', 'Onaylayan'], m.revisions.map((r) => [r.rev, r.date, r.desc, r.by, r.approvedBy])));
      L.push('');
    }
    for (const x of m.extra || []) L.push(x, '');
    return `${L.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '')}\n`;
  }

  /* ─── Risk analizinden aktarım (yalnız boş alanlar doldurulur) ── */
  /**
   * p: risk analizi modeli (RaDoc.build çıktısı), raPath: risk analizi klasörü.
   * Dönüş: { copies: [[kaynak, hedef]], log: [satır] }. Risk analizi dosyalarına yazılmaz; fotoğraflar LVD klasörüne kopyalanır.
   */
  function importRA(m, p, raPath) {
    const copies = [];
    const log = [];
    const dir = m.dir;
    const M = m.meta;
    const R = p.meta || {};
    const fill = (obj, k, v) => { if ((obj[k] == null || obj[k] === '') && v != null && v !== '' && !String(v).startsWith('[')) { obj[k] = v; return 1; } return 0; };
    const fillML = (obj, k, v) => { if (isEmptyML(obj[k]) && v && !isEmptyML(v) && !/^\[/.test(String(v.tr || ''))) { obj[k] = clone(v); return 1; } return 0; };
    let n = 0;
    M.link = raPath;
    n += fill(M, 'job', R.job) + fill(M, 'customer', R.customer) + fill(M, 'model', R.model) + fill(M, 'year', R.year) + fill(M, 'manufacturer', R.manufacturer) + fill(M, 'brandName', R.brandName) + fill(M, 'brandLine', R.brandLine) + fill(M, 'preparedLogo', R.preparedLogo);
    if (R.brand && (!M.brand || M.brand === 'DOLFIN')) M.brand = R.brand;
    if (R.docNo) M.riskDoc = `${R.docNo}${R.rev ? ` Rev. ${R.rev}` : ''}`;
    if (R.langs && R.langs.length) M.langs = R.langs.slice();
    const A = R.approvals || {};
    for (const k of ['prepared', 'checked', 'approved']) {
      if (!M.approvals[k] && A[k]) { M.approvals[k] = A[k]; n += 1; }
      if (!M.approvals.titles[k] && A.titles && A.titles[k]) M.approvals.titles[k] = clone(A.titles[k]);
    }
    if (n) log.push(`Rapor bilgileri: ${n} alan`);
    // Makine: tip ve teknik verilerden besleme bilgileri
    let nm = fillML(m.machine, 'type', R.machineType);
    for (const t of (p.machine && p.machine.tech) || []) {
      const lab = norm((t.label && t.label.tr) || '');
      const val = String((t.value && t.value.tr) || '').trim();
      if (!val || /isitici|heater|motor|pompa|pump|fan/.test(lab)) continue;
      // "Toplam güç / Akım: 11 kW / 25 A" → güç ve akım ayrı alanlara
      const parts = val.split('/').map((s) => s.trim());
      const kw = parts.find((s) => /\d\s*k?W\b/i.test(s));
      const amp = parts.find((s) => /\d\s*A\b/.test(s));
      if (/besleme|gerilim|voltaj|supply|sebeke/.test(lab)) nm += fill(m.machine, 'supply', val);
      else if (/guc|power|akim|current/.test(lab)) {
        if (/guc|power/.test(lab) && (kw || !/akim|current/.test(lab))) nm += fill(m.machine, 'power', kw || val);
        if (/akim|current/.test(lab) && (amp || !/guc|power/.test(lab))) nm += fill(m.machine, 'current', amp || val);
      } else if (/\bip\b|koruma derecesi/.test(lab)) nm += fill(m.machine, 'ip', val);
      else if (/sigorta|on koruma/.test(lab)) nm += fill(m.machine, 'fuse', val);
    }
    if (nm) log.push(`Makine ve besleme: ${nm} alan`);
    // Test koşulları ve cihaz
    const E = p.elec || {};
    let nc = fill(m.cond, 'date', E.date) + fill(m.cond, 'time', E.time) + fill(m.cond, 'testedBy', E.testedBy) + fillML(m.cond, 'location', E.location) + fillML(m.cond, 'connection', E.connection) + fillML(m.cond, 'method', E.method);
    if (E.limits) {
      for (const [g, keys] of [['rpe', ['rpeI', 'rpeT', 'rpeMax']], ['iso', ['isoU', 'isoT', 'isoMin']], ['hv', ['hvU', 'hvT', 'hvMax']]]) {
        if (m.limitsSet[g]) continue;
        keys.forEach((k) => { if (E.limits[k] != null) m.limits[k] = E.limits[k]; });
      }
    }
    if (!m.devices.length && E.instrument) {
      m.devices.push({ name: L3('Elektriksel güvenlik test cihazı', 'Electrical safety tester', 'Prüfgerät für elektrische Sicherheit'), model: E.instrument, serial: E.serial || '', calib: E.calib || '', valid: '' });
      nc += 1;
    }
    if (nc) log.push(`Test koşulları ve cihaz: ${nc} alan`);
    // Ölçümler: satırlar etiketiyle eşleşir; fotoğraf LVD klasörüne adlandırma kuralıyla kopyalanır
    const ext = (f) => (/\.(png|webp|jpe?g)$/i.exec(f) || ['', 'jpg'])[1].toLowerCase().replace('jpeg', 'jpg');
    let nr = 0;
    let np = 0;
    for (const k of ['rpe', 'iso', 'hv']) {
      const sec = m.meas[k];
      for (const r of E[k] || []) {
        if (!r.value && !r.photo) continue;
        let row = sec.rows.find((x) => x.tag === r.tag);
        if (!row) { row = { tag: r.tag, time: '', value: '', point: L3(''), photo: null }; if (k === 'hv') row.u = ''; sec.rows.push(row); }
        nr += fill(row, 'time', r.time) + fill(row, 'value', r.value) + (k === 'hv' ? fill(row, 'u', r.u) : 0);
        if (r.point && !isEmptyML(r.point) && (isEmptyML(row.point) || (k !== 'rpe' && LIB.pairText(row.tag) && row.point.tr === LIB.pairText(row.tag).tr))) row.point = clone(r.point);
        if (!row.photo && r.photo) {
          const dst = `${dir}/olcum/${LIB.photoName(k, r.tag)}.${ext(r.photo)}`;
          copies.push([r.photo, dst]);
          row.photo = dst;
          np += 1;
        }
      }
      if (k === 'rpe') sec.rows = sec.rows.filter((x) => x.value || x.photo || x.time || !isEmptyML(x.point) || !(E.rpe || []).length);
      if (sec.status === 'skip' && sec.rows.some((x) => x.value)) sec.status = '';
    }
    if (nr || np) log.push(`Elektrik ölçümleri: ${nr} değer, ${np} fotoğraf`);
    // Makine fotoğrafları
    const hasKind = (k) => m.photos.some((x) => x.kind === k);
    const addPhoto = (src, rel, kind, caption) => {
      if (!src) return;
      const dst = `${dir}/${rel}`;
      if (m.photos.some((x) => x.file === dst)) return;
      copies.push([src, dst]);
      m.photos.push({ file: dst, kind, caption: caption ? clone(caption) : L3('') });
      np += 1;
    };
    const capOf = (f) => ((p.photos || []).find((x) => x.file === f) || {}).caption;
    if (!hasKind('cover') && R.coverPhoto) addPhoto(R.coverPhoto, `foto/genel-gorunum.${ext(R.coverPhoto)}`, 'cover', capOf(R.coverPhoto) || LIB.PHOTO_KINDS.cover);
    if (!hasKind('panel') && R.panelPhoto) addPhoto(R.panelPhoto, `foto/kontrol-paneli.${ext(R.panelPhoto)}`, 'panel', capOf(R.panelPhoto) || LIB.PHOTO_KINDS.panel);
    if (!hasKind('setup')) (p.photos || []).filter((x) => (x.kinds || []).includes('setup')).forEach((x) => addPhoto(x.file, `kurulum/${x.file.split('/').pop()}`, 'setup', x.caption));
    // Güvenlik fonksiyonlarının validasyonu (EN ISO 13849-2) risk analizinde kalır; LVD raporu ona atıf yapar,
    // sonuçlarını fonksiyon testlerine taşımaz (mekanik / PL konuları LVD sonucunu etkilemez)
    return { copies, log };
  }

  /** Yeni rapor: boş model + ön bilgi */
  function create(o) {
    const m = blank({ dir: o.dir });
    Object.assign(m.meta, { job: o.job || '', customer: o.customer || '', model: o.model || '', serial: o.serial || o.job || '', reportDate: o.date || '', docNo: o.docNo || `LVD-${o.job || ''}-01`, link: o.link || '' });
    if (o.prepared) m.meta.approvals.prepared = o.prepared;
    m.cond.date = o.date || '';
    return m;
  }

  return { blank, parse, serialize, evaluate, evalRow, tripOf, importRA, create, revisions, sectionKey, measKind, RESULT, STATUS, isEmptyML, toDate };
});
