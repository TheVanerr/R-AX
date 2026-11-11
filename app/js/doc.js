/* md dosyaları → risk analizi veri modeli.
   Bir belge = bir klasördeki *.md dosyaları (ad sırasıyla). Bölümler başlıklarından tanınır, dosya adı önemli değildir.
   Birim raporu (tur: birim) model şablonunun üstüne bindirilir: ölçümler, validasyon sonuçları ve iş bilgileri birimden,
   geri kalan her şey modelden gelir. Ayrıntılı biçim: app/MD-SEMASI.md. DOM'a bağlı değildir. */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./md.js'), require('./util.js'), require('./library.js'));
  else root.RaDoc = factory(root.RaMd, root.RaUtil, root.RA_LIB);
})(typeof self !== 'undefined' ? self : this, function (Md, U, LIB) {
  'use strict';

  const { norm } = Md;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const L3 = (tr, en, de) => {
    const o = { tr: tr || '' };
    if (en != null) o.en = en;
    if (de != null) o.de = de;
    return o;
  };
  const isEmptyML = (o) => !o || !['tr', 'en', 'de'].some((l) => o[l] && String(o[l]).trim());

  /* ─── Bölüm adları ─────────────────────────────────────────── */
  const SECTIONS = {
    kapsam: ['kapsam', 'amac ve kapsam', 'amac', 'scope'],
    revizyonlar: ['revizyonlar', 'revizyon gecmisi', 'revizyon', 'revisions'],
    dagitim: ['dagitim', 'distribution'],
    standartlar: ['standartlar', 'referans mevzuat ve standartlar', 'referanslar', 'standards'],
    makine: ['makine', 'makine tanimi', 'machine'],
    sinirlar: ['sinirlar', 'makine sinirlari', 'makine sinirlarinin belirlenmesi', 'limits'],
    fotograflar: ['fotograflar', 'photos'],
    noktalar: ['tehlike noktalari', 'noktalar', 'hazard points'],
    tehlikeler: ['tehlikeler', 'tehlike tanimlama', 'tehlike tanimlama ve risk degerlendirme', 'hazards'],
    guvenlik: ['guvenlik fonksiyonlari', 'emniyet fonksiyonlari', 'safety functions'],
    ccf: ['ccf', 'ortak neden arizasi', 'ortak neden arizalari'],
    sistematik: ['sistematik', 'sistematik arizalar', 'systematic'],
    validasyon: ['validasyon', 'validasyon test plani', 'validation'],
    elektrik: ['elektrik testleri', 'elektriksel guvenlik testleri', 'elektriksel guvenlik', 'elektrik', 'lvd'],
    gurultu: ['gurultu olcumu', 'gurultu', 'noise'],
    termografi: ['termografik inceleme', 'termografi', 'termal olcum', 'termal', 'thermography'],
    sonuc: ['sonuc ve artik riskler', 'sonuc', 'conclusion'],
    aksiyonlar: ['aksiyonlar', 'aksiyon listesi', 'actions'],
    isaretler: ['isaretler', 'uyari isaretleri', 'guvenlik isaretleri', 'signs'],
    notlar: ['notlar', 'calisma notlari', 'notes']
  };
  const ALIASES = Object.entries(SECTIONS).flatMap(([k, list]) => list.map((a) => [a, k])).sort((a, b) => b[0].length - a[0].length);
  function sectionKey(title) {
    const k = norm(title).replace(/^(ek [a-z] |\d+( \d+)* )/, '');
    for (const [a, key] of ALIASES) if (k === a || k.startsWith(`${a} `)) return key;
    return null;
  }

  /* ─── Alan okuma yardımcıları ─────────────────────────────── */
  const F = (node, ...names) => Md.field(node, ...names);
  /** Alanın çok dilli değeri (yoksa null) */
  const ML = (node, ...names) => {
    const it = F(node, ...names);
    return it ? clone(it.value) : null;
  };
  const TXT = (node, ...names) => {
    const it = F(node, ...names);
    return it ? String(it.value.tr || '').trim() : '';
  };
  const ids = (s) => String(s || '').split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);
  const normId = (prefix, s) => {
    const m = new RegExp(`^${prefix}\\s*-?\\s*(\\d+)`, 'i').exec(String(s || '').trim());
    return m ? `${prefix.toUpperCase()}-${U.pad2(+m[1])}` : null;
  };
  const cellTr = (c) => (c ? String(c.tr || '').trim() : '');
  const yes = (s) => /^(evet|e|var|x|✓|✔|yes|ja|true|1|uygulandi|uygulandı)$/i.test(String(s || '').trim());
  const numOrNull = (s) => U.num(s);

  /** "2 — gerekçe" → [2, ML(gerekçe)] (EN/DE başındaki rakam da atılır) */
  function numberAndText(it) {
    if (!it) return [null, L3('')];
    const out = {};
    let n = null;
    for (const lang of ['tr', 'en', 'de']) {
      const v = it.value[lang];
      if (v == null) continue;
      const m = /^\s*(\d+)\s*(?:[—–:·-]\s*)?([\s\S]*)$/.exec(v);
      if (m) {
        if (lang === 'tr') n = +m[1];
        out[lang] = m[2].trim();
      } else out[lang] = v.trim();
    }
    return [n, out];
  }

  /* ─── Ön bilgi ───────────────────────────────────────────── */
  function mapFront(front) {
    const get = (...ks) => {
      for (const k of ks) {
        const v = front[norm(k)];
        if (v != null && v !== '') return v;
      }
      return null;
    };
    const ml = (...ks) => { const v = get(...ks); return v == null ? null : Md.splitLangs(v); };
    const type = (get('tur', 'tür', 'tip') || '').toLowerCase();
    const status = (get('durum') || '').toLowerCase();
    const m = {
      type: /model|sablon|şablon/.test(type) ? 'model' : /birim|unit|uretim/.test(type) ? 'birim' : type ? 'proje' : null,
      base: get('temel', 'sablon', 'şablon', 'model klasoru'),
      job: get('no', 'is no', 'iş no', 'seri no', 'proje no'),
      customer: get('musteri', 'müşteri'),
      model: get('model'),
      family: get('aile', 'seri'),
      brand: get('marka'),
      manufacturer: get('uretici', 'üretici'),
      brandName: get('marka adi', 'marka adı', 'ticari marka'),
      brandLine: get('marka satiri', 'marka satırı'),
      year: get('yil', 'yıl', 'imal yili', 'imal yılı'),
      docNo: get('dokuman', 'doküman', 'dokuman no', 'doküman no'),
      rev: get('rev', 'revizyon'),
      reportDate: get('tarih', 'rapor tarihi'),
      status: status ? (/yay|onay|final|son/.test(status) ? 'final' : 'draft') : null,
      langs: get('diller') ? ids(get('diller').toLowerCase()).filter((l) => ['tr', 'en', 'de'].includes(l)) : null,
      cover: get('kapak'),
      templateRev: get('sablon rev', 'şablon rev', 'sablon revizyon', 'şablon revizyon'),
      preparedLogo: get('hazirlayan logo', 'hazırlayan logo'),
      machineType: ml('makine tipi', 'makine'),
      scope: ml('kapsam'),
      area: ml('alan'),
      coverPhoto: get('kapak foto', 'kapak fotografi', 'kapak fotoğrafı'),
      panelPhoto: get('panel foto', 'panel fotografi', 'panel fotoğrafı'),
      pointsPhoto: get('noktalar foto', 'noktalar fotografi', 'noktalar fotoğrafı')
    };
    const approvals = {};
    const titles = {};
    for (const [k, names] of [['prepared', ['hazirlayan', 'hazırlayan']], ['checked', ['kontrol', 'kontrol eden']], ['approved', ['onay', 'onaylayan']]]) {
      const v = get(...names);
      if (v != null) approvals[k] = v;
      const t = ml(...names.map((n) => `${n} unvan`));
      // "-" / "yok": unvan yazılmaz (makine raporunda şablondaki başka kişinin unvanını da kapatır)
      if (t) titles[k] = /^(-|yok|none)$/i.test(String(t.tr || '').trim()) ? L3('', '', '') : t;
    }
    if (Object.keys(approvals).length || Object.keys(titles).length) m.approvals = { ...approvals, titles };
    for (const k of Object.keys(m)) if (m[k] == null) delete m[k];
    return m;
  }

  /* ─── Bölüm eşleyicileri ─────────────────────────────────── */
  const S = {};

  S.kapsam = (n, p) => {
    p.meta = p.meta || {};
    const mt = ML(n, 'makine tipi', 'makine');
    if (mt) p.meta.machineType = mt;
    const sc = ML(n, 'kapsam');
    if (sc) p.meta.scope = sc;
    const ar = ML(n, 'alan');
    if (ar) p.meta.area = ar;
    const os = ML(n, 'kapsam disi', 'kapsam dışı');
    if (os) p.outOfScope = os;
    if (n.text && !p.purpose) p.purpose = clone(n.text);
  };

  S.revizyonlar = (n, p) => {
    const t = n.tables[0];
    if (!t) return;
    p.revisions = Md.tableObjects(t, { rev: ['rev', 'revizyon'], date: ['tarih'], desc: ['aciklama', 'açıklama'], by: ['hazirlayan', 'hazırlayan'], approvedBy: ['onaylayan', 'onay'] })
      .map((r) => ({ rev: cellTr(r.rev), date: cellTr(r.date), desc: r.desc || L3(''), by: cellTr(r.by), approvedBy: cellTr(r.approvedBy) }));
  };

  S.dagitim = (n, p) => {
    const t = n.tables[0];
    if (!t) return;
    p.distribution = Md.tableObjects(t, { to: ['alici', 'alıcı'], format: ['format', 'bicim', 'biçim'] }).map((r) => ({ to: r.to || L3(''), format: r.format || L3('') }));
  };

  S.standartlar = (n, p) => {
    const t = n.tables[0];
    if (!t) return;
    p.standards = Md.tableObjects(t, { ref: ['referans', 'standart', 'ref'], title: ['baslik', 'başlık', 'baslik uygulama', 'başlık uygulama', 'aciklama'] }).map((r) => {
      const ref = cellTr(r.ref);
      let title = r.title || L3('');
      if (isEmptyML(title)) {
        const lib = LIB.standards.find((s) => norm(s.ref) === norm(ref) || norm(s.ref).startsWith(norm(ref)));
        if (lib) title = clone(lib.title);
      }
      return { ref, title };
    });
  };

  S.makine = (n, p) => {
    p.machine = p.machine || {};
    if (n.text) p.machine.desc = clone(n.text);
    const tech = Md.child(n, 'teknik veriler', 'teknik', 'technical data');
    const tt = tech ? tech.tables[0] : n.tables[0];
    if (tt) p.machine.tech = Md.tableObjects(tt, { label: ['ozellik', 'özellik', 'parametre', 'baslik'], value: ['deger', 'değer'] }).map((r) => ({ label: r.label || L3(''), value: r.value || L3('') }));
    const panel = Md.child(n, 'kontrol paneli', 'panel');
    if (panel && panel.tables[0]) {
      p.machine.panel = Md.tableObjects(panel.tables[0], { label: ['etiket'], func: ['eleman fonksiyon', 'eleman', 'fonksiyon'], safety: ['guvenlik iliskisi', 'güvenlik ilişkisi', 'guvenlik'] })
        .map((r) => ({ label: cellTr(r.label), func: r.func || L3(''), safety: r.safety || L3('') }));
    }
  };

  S.sinirlar = (n, p) => {
    const li = (p.limits = p.limits || {});
    const map = {
      intendedUse: ['kullanim amaci', 'kullanım amacı', 'amac'], modes: ['calisma modlari', 'çalışma modları', 'modlar'], users: ['kullanicilar', 'kullanıcılar'],
      movement: ['hareket alani', 'hareket alanı'], access: ['erisim', 'erişim', 'erisim bakim alani'], interfaces: ['arayuzler', 'arayüzler'],
      life: ['omur', 'ömür', 'kullanim omru', 'kullanım ömrü'], maintenance: ['bakim', 'bakım', 'periyodik bakim'], environment: ['ortam'], phases: ['fazlar', 'yasam dongusu fazlari', 'yaşam döngüsü fazları']
    };
    for (const [k, names] of Object.entries(map)) {
      const v = ML(n, ...names);
      if (v) li[k] = v;
    }
    const mis = F(n, 'kotuye kullanim', 'kötüye kullanım', 'ongorulebilir kotuye kullanim');
    if (mis) li.misuse = mis.items.length ? mis.items.map((it) => ({ text: clone(it.full) })) : [{ text: clone(mis.value) }];
    const prof = TXT(n, 'profil', 'kullanim profili', 'kullanım profili');
    if (prof) {
      const nums = (prof.match(/\d+(?:[.,]\d+)?/g) || []).map((x) => +x.replace(',', '.'));
      if (nums.length >= 3) li.profile = { dop: nums[0], hop: nums[1], tcycle: nums[2] };
    }
  };

  const KINDS = { genel: 'general', kapak: 'cover', panel: 'panel', noktalar: 'points', detay: 'detail', kurulum: 'setup', olcum: 'screen', 'ölçüm': 'screen', ekran: 'screen', termal: 'thermal', gurultu: 'noise', 'gürültü': 'noise' };
  S.fotograflar = (n, p, ctx) => {
    const t = n.tables[0];
    if (!t) return;
    p.photos = (p.photos || []).concat(Md.tableObjects(t, { file: ['dosya', 'fotograf', 'fotoğraf'], kind: ['tur', 'tür'], caption: ['aciklama', 'açıklama', 'baslik'] }).map((r) => {
      const kinds = ids(cellTr(r.kind).toLowerCase()).map((k) => KINDS[k] || KINDS[norm(k)] || 'general');
      const file = U.joinPath(ctx.dir, cellTr(r.file));
      return { uid: file, file, kinds: kinds.length ? kinds : ['general'], caption: r.caption || L3('') };
    }));
  };

  S.noktalar = (n, p, ctx) => {
    const ph = TXT(n, 'fotograf', 'fotoğraf', 'foto');
    if (ph) { p.meta = p.meta || {}; p.meta.pointsPhoto = U.joinPath(ctx.dir, ph); }
    const t = n.tables[0];
    if (!t) return;
    p.points = Md.tableObjects(t, { no: ['no'], x: ['x'], y: ['y'], label: ['konum', 'yer', 'nokta'], desc: ['aciklama', 'açıklama', 'tehlike'] }).map((r) => ({
      uid: cellTr(r.no), no: cellTr(r.no), x: numOrNull(cellTr(r.x)) || 0, y: numOrNull(cellTr(r.y)) || 0, label: r.label || L3(''), desc: r.desc || L3('')
    }));
  };

  /** "O4 Ş3 → O2 Ş3" */
  function parseRisk(s) {
    const m = /O\s*=?\s*(\d)\s*[·,;]?\s*[ŞSşs]\s*=?\s*(\d)(?:\s*(?:→|->|=>|>|›)\s*O\s*=?\s*(\d)\s*[·,;]?\s*[ŞSşs]\s*=?\s*(\d))?/.exec(String(s || ''));
    if (!m) return null;
    return { o: +m[1], s: +m[2], o2: m[3] ? +m[3] : +m[1], s2: m[4] ? +m[4] : +m[2] };
  }
  const TAGNUM = { m: 0, 'ö': 1, o: 1, b: 2 };
  const MEASURE_KIND = (s) => {
    const k = norm(s);
    if (/elektrik|lvd|60204/.test(k)) return 'elektrik';
    if (/gurultu|noise|ses/.test(k)) return 'gurultu';
    if (/termal|termo|sicak|thermal/.test(k)) return 'termal';
    return null;
  };

  function mapMeasure(it, hid, i) {
    const text = clone(it.full);
    let action = null;
    for (const lang of Object.keys(text)) {
      text[lang] = String(text[lang]).replace(/\s*\(?\s*(?:→|->)\s*(A-\d+)\s*\)?\s*$/, (m0, a) => { if (lang === 'tr') action = a; return ''; });
    }
    return { uid: `${hid}/${i + 1}`, tag: TAGNUM[String(it.tag || 'm').toLowerCase()] != null ? TAGNUM[String(it.tag || 'm').toLowerCase()] : 0, text, action };
  }

  S.tehlikeler = (n, p) => {
    p.hazards = p.hazards || [];
    for (const c of n.children) {
      const id = normId('H', c.title);
      if (!id) {
        if (/uygulanamaz|degerlendirme disi|kapsam disi|not applicable/.test(c.key)) {
          p.notApplicable = c.list.map((it) => ({ group: it.keyRaw || '', text: it.key ? clone(it.value) : clone(it.full) }));
        }
        continue;
      }
      const risk = parseRisk(TXT(c, 'risk')) || {};
      const measParent = F(c, 'onlemler', 'önlemler', 'onlem', 'önlem', 'measures');
      const measItems = measParent ? measParent.items : c.list.filter((it) => it.tag && TAGNUM[String(it.tag).toLowerCase()] != null);
      const h = {
        uid: id, id, label: c.title.replace(/^H\s*-?\s*\d+\s*[·:—–-]?\s*/i, ''),
        key: TXT(c, 'anahtar', 'kutuphane', 'kütüphane', 'key') || null,
        type: ML(c, 'tur', 'tür', 'tehlike', 'type') || L3(''),
        sit: ML(c, 'durum', 'tehlikeli durum', 'senaryo', 'situation') || L3(''),
        phase: ML(c, 'faz', 'yasam fazi', 'yaşam fazı', 'phase') || L3(''),
        points: ids(TXT(c, 'nokta', 'noktalar', 'bolge', 'bölge')).filter((x) => /^\d+$/.test(x)),
        o: risk.o || null, s: risk.s || null, o2: risk.o2 || null, s2: risk.s2 || null,
        measure: MEASURE_KIND(TXT(c, 'olcum', 'ölçüm', 'measurement')),
        group: TXT(c, 'grup', 'group') || null,
        meas: measItems.map((it, i) => mapMeasure(it, id, i)),
        line: c.line
      };
      p.hazards.push(h);
    }
  };

  const ROLE = (s) => {
    const k = norm(s);
    if (/giris|input|eingang|sensor/.test(k)) return 'input';
    if (/mantik|lojik|logic|logik/.test(k)) return 'logic';
    if (/cikis|output|ausgang|aktuator/.test(k)) return 'output';
    return 'other';
  };
  S.guvenlik = (n, p) => {
    p.sfs = p.sfs || [];
    for (const c of n.children) {
      const id = normId('SF', c.title);
      if (!id) {
        if (/^not/.test(c.key)) {
          p.sfNotes = c.list.map((it) => ({ kind: /uyar|warn/i.test(it.tag || '') ? 'warn' : 'info', text: clone(it.full) }));
        }
        continue;
      }
      const label = c.title.replace(/^SF\s*-?\s*\d+\s*[·:—–-]?\s*/i, '');
      const [Sv, Sj] = numberAndText(F(c, 's'));
      const [Fv, Fj] = numberAndText(F(c, 'f'));
      const [Pv, Pj] = numberAndText(F(c, 'p'));
      const subs = c.children.map((sc) => {
        const catM = /kat(?:egori)?\.?\s*([B1-4])/i.exec(sc.title);
        const cat = (TXT(sc, 'kategori', 'kat', 'category') || (catM ? catM[1] : '')).toUpperCase().replace(/^KAT\.?\s*/, '');
        return {
          role: TXT(sc, 'rol', 'role') ? ROLE(TXT(sc, 'rol', 'role')) : ROLE(sc.title),
          comp: ML(sc, 'bilesen', 'bileşen', 'component', 'eleman') || L3(''),
          cat,
          b10d: numOrNull(TXT(sc, 'b10d')),
          nop: numOrNull(TXT(sc, 'nop')),
          mttfd: numOrNull(TXT(sc, 'mttfd')),
          dc: numOrNull(TXT(sc, 'dc', 'dcavg').replace('%', '')),
          plOverride: (TXT(sc, 'pl') || '').toLowerCase().replace(/^pl\s*/, '').trim(),
          plCap: (TXT(sc, 'pl siniri', 'pl sınırı', 'pl tavan', 'pl cap') || '').toLowerCase().replace(/^pl\s*/, '').trim(),
          note: ML(sc, 'not', 'note') || L3('')
        };
      });
      p.sfs.push({
        uid: id, id, key: TXT(c, 'anahtar', 'key') || null,
        name: ML(c, 'ad', 'isim', 'name') || L3(label),
        desc: ML(c, 'tanim', 'tanım', 'aciklama', 'açıklama', 'desc') || L3(''),
        trigger: ML(c, 'tetikleyici', 'tetik', 'trigger') || L3(''),
        safe: ML(c, 'guvenli durum', 'güvenli durum', 'safe') || L3(''),
        hazards: ids(TXT(c, 'tehlikeler', 'tehlike', 'hazards')).map((x) => normId('H', x)).filter(Boolean),
        S: Sv || 2, F: Fv || 1, P: Pv || 1,
        just: { S: Sj, F: Fj, P: Pj },
        pfh: TXT(c, 'pfh', 'pfhd'),
        subs, line: c.line
      });
    }
  };

  S.ccf = (n, p) => {
    const t = n.tables[0];
    if (!t) return;
    p.ccf = Md.tableObjects(t, { no: ['no'], max: ['puan', 'maks', 'max'], applied: ['uygulandi', 'uygulandı', 'uygulama'], measure: ['onlem', 'önlem'], evidence: ['kanit', 'kanıt', 'aciklama'] }).map((r) => {
      const no = cellTr(r.no);
      const lib = LIB.ccf.find((c) => c.no === no) || {};
      return {
        no, max: numOrNull(cellTr(r.max)) != null ? numOrNull(cellTr(r.max)) : lib.max || 0,
        applied: yes(cellTr(r.applied)),
        measure: r.measure && !isEmptyML(r.measure) ? r.measure : clone(lib.measure || L3('')),
        evidence: r.evidence || L3('')
      };
    });
  };

  S.sistematik = (n, p) => { if (n.text) p.systematic = clone(n.text); };

  const RESULT = (s) => {
    const k = norm(s);
    if (!k) return '';
    if (/^(ud|uygun degil|nok|f|fail|failed|nb|x)$/.test(k) || /uygun degil|nicht/.test(k)) return 'nok';
    if (/^(u|uygun|ok|p|pass|passed|b|bestanden|evet)$/.test(k) || String(s).trim() === '✓') return 'ok';
    return '';
  };
  S.validasyon = (n, p) => {
    p.validation = p.validation || [];
    for (const c of n.children) {
      const id = normId('V', c.title);
      if (!id) continue;
      const rest = c.title.replace(/^V\s*-?\s*\d+\s*/i, '');
      const refM = /((?:SF|H)\s*-?\s*\d+)/i.exec(TXT(c, 'ref', 'ilgili') || rest);
      const ref = refM ? (normId('SF', refM[1]) || normId('H', refM[1])) : '';
      const res = TXT(c, 'sonuc', 'sonuç', 'result');
      const dm = /(\d{1,2}\.\d{1,2}\.\d{4})/.exec(res);
      p.validation.push({
        uid: id, id, ref,
        step: ML(c, 'adim', 'adım', 'test', 'step') || L3(''),
        expected: ML(c, 'beklenen', 'kriter', 'beklenen sonuc', 'expected') || L3(''),
        result: RESULT(res.replace(/[·,;]?\s*\d{1,2}\.\d{1,2}\.\d{4}.*/, '')),
        date: TXT(c, 'tarih') || (dm ? dm[1] : ''),
        note: ML(c, 'not', 'note') || L3('')
      });
    }
    const t = n.tables[0];
    if (t && !n.children.length) {
      p.validation = Md.tableObjects(t, { no: ['no'], ref: ['ref', 'sf', 'ilgili'], step: ['adim', 'adım', 'test adimi'], expected: ['beklenen', 'beklenen sonuc'], result: ['sonuc', 'sonuç'], date: ['tarih'], note: ['not'] })
        .map((r) => ({ uid: normId('V', cellTr(r.no)) || cellTr(r.no), id: normId('V', cellTr(r.no)), ref: normId('SF', cellTr(r.ref)) || normId('H', cellTr(r.ref)) || '', step: r.step || L3(''), expected: r.expected || L3(''), result: RESULT(cellTr(r.result)), date: cellTr(r.date), note: r.note || L3('') }));
    }
  };

  /** "0,2 A · 5 s · ≤ 0,10 Ω" → [0.2, 5, 0.1] */
  const numsOf = (s) => (String(s || '').match(/\d+(?:[.,]\d+)?/g) || []).map((x) => +x.replace(',', '.'));
  const ELEC_KIND = (title) => {
    const k = norm(title);
    if (/koruma|sureklilik|r pe|rpe|topraklama/.test(k)) return 'rpe';
    if (/yalitim|izolasyon|r iso|riso|insulation/.test(k)) return 'iso';
    if (/gerilim|dayanim|hv|flash|withstand/.test(k)) return 'hv';
    return null;
  };
  S.elektrik = (n, p, ctx) => {
    const e = (p.elec = p.elec || {});
    const fields = { date: ['tarih'], time: ['saat'], instrument: ['cihaz', 'test cihazi', 'test cihazı'], serial: ['seri no', 'seri'], calib: ['kalibrasyon'], testedBy: ['test eden', 'olcen', 'ölçen'] };
    for (const [k, names] of Object.entries(fields)) { const v = TXT(n, ...names); if (v) e[k] = v; }
    for (const [k, names] of Object.entries({ location: ['yer', 'test yeri'], connection: ['baglanti', 'bağlantı'], method: ['yontem', 'yöntem'] })) { const v = ML(n, ...names); if (v) e[k] = v; }
    const lim = {};
    const rpe = numsOf(TXT(n, 'r pe', 'rpe', 'koruma iletkeni'));
    if (rpe.length >= 3) Object.assign(lim, { rpeI: rpe[0], rpeT: rpe[1], rpeMax: rpe[2] });
    const iso = numsOf(TXT(n, 'r iso', 'riso', 'yalitim', 'yalıtım'));
    if (iso.length >= 3) Object.assign(lim, { isoU: iso[0], isoT: iso[1], isoMin: iso[2] });
    const hv = numsOf(TXT(n, 'hv', 'gerilim dayanim', 'gerilim dayanım'));
    if (hv.length >= 3) Object.assign(lim, { hvU: hv[0], hvT: hv[1], hvMax: hv[2] });
    if (Object.keys(lim).length) e.limits = lim;
    for (const c of n.children) {
      const kind = ELEC_KIND(c.title);
      if (!kind || !c.tables[0]) continue;
      e[kind] = Md.tableObjects(c.tables[0], {
        tag: ['no', 'cift', 'çift', 'iletken cifti', 'iletken çifti', 'nokta no'], time: ['saat'], u: ['u', 'u v', 'gerilim'],
        value: ['deger', 'değer', 'deger ohm', 'deger mohm', 'deger ma', 'olcum', 'ölçüm', 'r pe', 'r iso', 'i'], point: ['nokta', 'olcum noktasi', 'ölçüm noktası', 'devre', 'aciklama'], photo: ['fotograf', 'fotoğraf', 'foto']
      }).map((r, i) => {
        const tag = cellTr(r.tag).replace(/\s+/g, '').toUpperCase() || String(i + 1);
        const photo = cellTr(r.photo);
        return { uid: `${kind}:${tag}`, tag, time: cellTr(r.time), u: cellTr(r.u), value: cellTr(r.value), point: r.point || L3(''), photo: photo ? U.joinPath(ctx.dir, photo) : null };
      });
    }
  };

  S.gurultu = (n, p, ctx) => {
    const g = (p.noise = p.noise || {});
    for (const [k, names] of Object.entries({ date: ['tarih'], time: ['saat'], instrument: ['cihaz', 'ses seviyesi olcer', 'ses seviyesi ölçer'], serial: ['seri no', 'seri'], calib: ['kalibrasyon', 'kalibrator', 'kalibratör'], testedBy: ['test eden', 'olcen', 'ölçen'] })) {
      const v = TXT(n, ...names);
      if (v) g[k] = v;
    }
    for (const [k, names] of Object.entries({ location: ['yer'], method: ['yontem', 'yöntem'], condition: ['calisma durumu', 'çalışma durumu', 'durum'], conclusion: ['sonuc', 'sonuç'] })) {
      const v = ML(n, ...names);
      if (v) g[k] = v;
    }
    const bg = numOrNull(TXT(n, 'arka plan', 'arka plan gurultusu', 'arka plan gürültüsü'));
    if (bg != null) g.bg = bg;
    const K = numOrNull(TXT(n, 'belirsizlik', 'k'));
    if (K != null) g.K = K;
    const lwa = numOrNull(TXT(n, 'lwa', 'ses gucu', 'ses gücü', 'ses gucu seviyesi'));
    if (lwa != null) g.LWA = lwa;
    const op = TXT(n, 'operator konumu', 'operatör konumu', 'is istasyonu', 'iş istasyonu');
    if (op) g.operatorRows = ids(op);
    const t = n.tables[0];
    if (t) {
      g.rows = Md.tableObjects(t, { no: ['no'], pos: ['konum', 'olcum noktasi', 'ölçüm noktası', 'yer'], dist: ['mesafe'], lpa: ['lpa', 'lpa db a', 'laeq', 'deger', 'değer'], lcpeak: ['lcpeak', 'lpcpeak', 'lcpeak db c', 'tepe'], bg: ['arka plan', 'arka plan db a'], photo: ['fotograf', 'fotoğraf', 'foto'] })
        .map((r, i) => {
          const photo = cellTr(r.photo);
          return { no: cellTr(r.no) || String(i + 1), pos: r.pos || L3(''), dist: cellTr(r.dist), lpa: cellTr(r.lpa), lcpeak: cellTr(r.lcpeak), bg: cellTr(r.bg), photo: photo ? U.joinPath(ctx.dir, photo) : null };
        });
    }
  };

  const MARKER = (s) => {
    const k = norm(s);
    if (/alan|area/.test(k)) return 'area';
    if (/sicak|hot|^hs/.test(k)) return 'hot';
    if (/soguk|cold|^cs/.test(k)) return 'cold';
    return 'pt';
  };
  S.termografi = (n, p, ctx) => {
    const th = (p.thermal = p.thermal || {});
    for (const [k, names] of Object.entries({ date: ['tarih'], time: ['saat'], instrument: ['cihaz', 'kamera'], serial: ['seri no', 'seri'], accuracy: ['dogruluk', 'doğruluk'], testedBy: ['test eden', 'olcen', 'ölçen'], material: ['malzeme'] })) {
      const v = TXT(n, ...names);
      if (v) th[k] = v;
    }
    for (const [k, names] of Object.entries({ location: ['yer'], condition: ['durum', 'calisma durumu', 'çalışma durumu'], method: ['yontem', 'yöntem'], conclusion: ['sonuc', 'sonuç'] })) {
      const v = ML(n, ...names);
      if (v) th[k] = v;
    }
    const lim = F(n, 'sinir', 'sınır', 'olcut', 'ölçüt');
    if (lim) {
      const m = /^\s*(\d+(?:[.,]\d+)?)\s*°?\s*C?\s*(?:[—–:-]\s*)?([\s\S]*)$/.exec(lim.value.tr || '');
      if (m) {
        th.limit = +m[1].replace(',', '.');
        const text = { tr: m[2].trim() };
        for (const l of ['en', 'de']) if (lim.value[l] != null) text[l] = String(lim.value[l]).replace(/^\s*\d+(?:[.,]\d+)?\s*°?\s*C?\s*(?:[—–:-]\s*)?/, '').trim();
        th.limitText = text;
      }
    }
    const imgs = n.children.filter((c) => /^d\s*\d+/.test(c.key));
    if (imgs.length) {
      th.images = imgs.map((c) => {
        const scaleV = numsOf(TXT(c, 'olcek', 'ölçek', 'scale'));
        const crop = numsOf(TXT(c, 'kirp', 'kırp', 'crop'));
        const t = c.tables[0];
        const markers = t ? Md.tableObjects(t, { name: ['isaret', 'işaret', 'ad'], type: ['tur', 'tür'], x: ['x'], y: ['y'], w: ['w', 'genislik'], h: ['h', 'yukseklik'], ref: ['ciplak', 'çıplak', 'ref', 'ciplak sac'], label: ['etiket', 'konum', 'aciklama'] })
          .map((r) => ({ type: MARKER(cellTr(r.type)), x: numOrNull(cellTr(r.x)) || 0, y: numOrNull(cellTr(r.y)) || 0, w: numOrNull(cellTr(r.w)) || 0, h: numOrNull(cellTr(r.h)) || 0, ref: yes(cellTr(r.ref)) || /ciplak|ref/.test(norm(cellTr(r.type))), label: r.label || L3('') })) : null;
        const file = TXT(c, 'dosya', 'file');
        return {
          uid: c.title, file: file ? U.joinPath(ctx.dir, file) : '',
          title: ML(c, 'baslik', 'başlık', 'title') || L3(c.title.replace(/^D\s*-?\s*\d+\s*[·:—–-]?\s*/i, '')),
          comment: ML(c, 'yorum', 'aciklama', 'açıklama', 'comment') || L3(''),
          lo: scaleV.length >= 2 ? scaleV[0] : null, hi: scaleV.length >= 2 ? scaleV[1] : null,
          crop: crop.length >= 4 ? { x: crop[0], y: crop[1], w: crop[2], h: crop[3] } : null,
          markers
        };
      });
    }
  };

  S.sonuc = (n, p) => { if (n.text) p.conclusion = clone(n.text); };

  const STATUS = (s) => {
    const k = norm(s);
    if (/kapan|tamam|done|erledigt|closed|bitti/.test(k)) return 'done';
    if (/uygulanmayacak|red|rejected|nicht/.test(k)) return 'rejected';
    return 'open';
  };
  S.aksiyonlar = (n, p) => {
    const t = n.tables[0];
    if (!t) return;
    p.actions = Md.tableObjects(t, { no: ['no'], text: ['aksiyon', 'aciklama', 'açıklama'], ref: ['ref', 'ilgili'], owner: ['sorumlu'], due: ['termin'], status: ['durum'] }).map((r, i) => ({
      uid: normId('A', cellTr(r.no)) || `A-${U.pad2(i + 1)}`, text: r.text || L3(''), ref: cellTr(r.ref), owner: r.owner || L3(''), due: r.due || L3(''), status: STATUS(cellTr(r.status))
    }));
  };

  S.isaretler = (n, p) => {
    const t = n.tables[0];
    if (!t) return;
    p.signs = Md.tableObjects(t, { code: ['kod', 'isaret', 'işaret'], meaning: ['anlam'], location: ['konum', 'yer'] }).map((r) => {
      const code = cellTr(r.code).toUpperCase();
      const lib = LIB.signs.find((s) => s.code === code);
      return { code, meaning: r.meaning && !isEmptyML(r.meaning) ? r.meaning : clone(lib ? lib.meaning : L3('')), location: r.location || L3('') };
    });
  };

  S.notlar = () => {};

  /* ─── Belge ──────────────────────────────────────────────── */

  /**
   * Tek klasörün md dosyalarını eşler. ctx.dir: klasör yolu (fotoğraf yolları buna göre çözülür).
   * Dönüş: yalnız tanımlı bölümleri içeren kısmi model + uyarılar.
   */
  function mapFolder(files, ctx) {
    const p = { meta: {} };
    const unknown = [];
    const seen = {};
    const sorted = files.slice().sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    for (const f of sorted) {
      const ast = Md.parse(f.text);
      Object.assign(p.meta, mapFront(ast.front));
      for (const sec of ast.sections) {
        const key = sectionKey(sec.title);
        if (!key) { unknown.push({ file: f.name, line: sec.line, title: sec.title }); continue; }
        if (seen[key] && !['fotograflar'].includes(key)) unknown.push({ file: f.name, line: sec.line, title: sec.title, dup: true });
        seen[key] = true;
        S[key](sec, p, { dir: ctx.dir, file: f.name });
      }
    }
    p.dir = ctx.dir;
    p._sections = seen;
    p._unknown = unknown;
    return p;
  }

  /** Birim → model bindirmesi. Ölçüm satırları anahtarıyla birleşir (açıklama modelden, değer birimden). */
  function merge(base, unit) {
    const p = clone(base);
    const u = clone(unit);
    p.meta = Object.assign({}, base.meta, u.meta);
    if (base.meta.approvals || u.meta.approvals) {
      p.meta.approvals = Object.assign({}, base.meta.approvals, u.meta.approvals);
      p.meta.approvals.titles = Object.assign({}, (base.meta.approvals || {}).titles, (u.meta.approvals || {}).titles);
    }
    p.meta.type = 'birim';
    p.meta.modelDir = base.dir;
    const mergeRows = (b, x, key) => {
      if (!x) return b;
      if (!b) return x;
      return x.map((r) => {
        const m = b.find((y) => y[key] === r[key]);
        if (!m) return r;
        const o = Object.assign({}, m, r);
        for (const k of Object.keys(m)) if (o[k] == null || o[k] === '' || (typeof o[k] === 'object' && isEmptyML(o[k]) && !isEmptyML(m[k]))) o[k] = m[k];
        return o;
      }).concat(b.filter((y) => !x.some((r) => r[key] === y[key])).map((y) => Object.assign({}, y, { value: '', time: '', photo: null, lpa: '', lcpeak: '' })));
    };
    if (u.elec) {
      const be = base.elec || {};
      p.elec = Object.assign({}, be, u.elec, { limits: Object.assign({}, be.limits, u.elec.limits) });
      for (const k of ['rpe', 'iso', 'hv']) p.elec[k] = mergeRows(be[k], u.elec[k], 'tag');
    }
    if (u.noise) {
      const bn = base.noise || {};
      p.noise = Object.assign({}, bn, u.noise);
      p.noise.rows = mergeRows(bn.rows, u.noise.rows, 'no');
    }
    if (u.thermal) {
      const bt = base.thermal || {};
      p.thermal = Object.assign({}, bt, u.thermal);
      if (!u.thermal.images) p.thermal.images = [];
    } else if (p.thermal) p.thermal = Object.assign({}, p.thermal, { images: [], date: '', time: '' });
    if (u.validation) {
      p.validation = (base.validation || []).map((v) => {
        const r = u.validation.find((x) => x.id === v.id);
        return r ? Object.assign({}, v, { result: r.result, date: r.date, note: isEmptyML(r.note) ? v.note : r.note }) : v;
      });
    } else p.validation = (base.validation || []).map((v) => Object.assign({}, v, { result: '', date: '', note: L3('') }));
    if (u.photos) p.photos = (base.photos || []).concat(u.photos);
    for (const k of ['revisions', 'distribution', 'conclusion', 'actions', 'signs', 'sfNotes', 'outOfScope']) if (u[k] != null) p[k] = u[k];
    if (u.purpose) p.purpose = u.purpose;
    p.dir = unit.dir;
    p._sections = Object.assign({}, base._sections, unit._sections);
    p._unknown = (base._unknown || []).concat(unit._unknown || []);
    return p;
  }

  /** Klasördeki dosya adlarından otomatik bağlantılar: ölçüm fotoğrafları, kurulum fotoğrafları, .bmt dosyaları */
  function autoLink(p, files) {
    const list = (files || []).filter((f) => !/\/(_eski|cikti|kaynak)\//.test(`/${f}`));
    const base = (f) => f.split('/').pop().replace(/\.[^.]+$/, '');
    const isImg = (f) => /\.(jpe?g|png|webp)$/i.test(f);
    const linked = new Set();
    for (const k of ['rpe', 'iso', 'hv']) for (const r of (p.elec && p.elec[k]) || []) if (r.photo) linked.add(r.photo);
    for (const r of (p.noise && p.noise.rows) || []) if (r.photo) linked.add(r.photo);
    for (const ph of p.photos || []) linked.add(ph.file);
    for (const f of list.filter(isImg)) {
      if (linked.has(f)) continue;
      const name = base(f);
      const rule = LIB.photoRules.find((r) => r.re.test(name));
      if (rule) {
        const tag = rule.tag(rule.re.exec(name));
        if (rule.kind === 'noise') {
          p.noise = p.noise || {};
          p.noise.rows = p.noise.rows || [];
          let row = p.noise.rows.find((r) => r.no === tag);
          if (!row) { row = { no: tag, pos: L3(''), dist: '', lpa: '', lcpeak: '', bg: '', photo: null }; p.noise.rows.push(row); }
          if (!row.photo) { row.photo = f; linked.add(f); }
          continue;
        }
        p.elec = p.elec || {};
        p.elec[rule.kind] = p.elec[rule.kind] || [];
        let row = p.elec[rule.kind].find((r) => r.tag === tag);
        if (!row) { row = { uid: `${rule.kind}:${tag}`, tag, time: '', u: '', value: '', point: L3(''), photo: null }; p.elec[rule.kind].push(row); }
        if (!row.photo) { row.photo = f; linked.add(f); }
        continue;
      }
      const dir = f.split('/').slice(-2, -1)[0] || '';
      if (/^kurulum$/i.test(dir)) { p.photos = (p.photos || []).concat([{ uid: f, file: f, kinds: ['setup'], caption: L3(''), auto: true }]); linked.add(f); }
      else if (/^olcum$/i.test(dir)) { p.photos = (p.photos || []).concat([{ uid: f, file: f, kinds: ['screen'], caption: L3(name), auto: true }]); linked.add(f); }
    }
    const bmts = list.filter((f) => /\.bmt$/i.test(f));
    if (bmts.length && p.thermal !== undefined) {
      p.thermal = p.thermal || {};
      const have = new Set((p.thermal.images || []).map((i) => i.file));
      const extra = bmts.filter((f) => !have.has(f)).sort();
      if (extra.length && !(p.thermal.images || []).length) {
        p.thermal.images = extra.map((f) => ({ uid: f, file: f, title: L3(''), comment: L3(''), lo: null, hi: null, crop: null, markers: null, auto: true }));
      }
    }
    return p;
  }

  /* ─── Revizyon geçmişi ───────────────────────────────────── */
  /** "00", "0", "Rev. 00" aynı revizyondur */
  const revNum = (x) => { const s = String(x == null ? '' : x).trim(); const d = /\d+/.exec(s); return d ? String(+d[0]) : s.toLowerCase(); };
  /**
   * Rapordaki revizyon tablosu: md satırları + güncel revizyon. Güncel revizyonun tarihi, hazırlayanı ve onaylayanı
   * ön bilgiden gelir (kapakla aynı); tabloda satırı yoksa eklenir (ilk yayın değilse açıklaması doldurulacak).
   */
  function syncRevisions(rows, m) {
    const out = (rows || []).map((r) => Object.assign({}, r));
    const A = m.approvals || {};
    let cur = out.find((r) => revNum(r.rev) === revNum(m.rev));
    if (!cur) {
      const first = !out.length && revNum(m.rev) === '0';
      cur = { rev: m.rev, date: '', desc: first ? L3('İlk yayın', 'First issue', 'Erstausgabe') : L3('[Revizyon açıklaması]', '[Revision description]', '[Beschreibung der Revision]'), by: '', approvedBy: '', auto: true };
      out.push(cur);
    }
    if (m.reportDate) cur.date = m.reportDate;
    if (A.prepared) cur.by = A.prepared;
    if (A.approved) cur.approvedBy = A.approved;
    return out;
  }

  /** Eksik bölümleri kütüphane varsayılanlarıyla tamamlar */
  function finalize(p) {
    const d = (k, v) => { if (p[k] == null) p[k] = v; };
    const m = p.meta;
    m.type = m.type || 'proje';
    m.job = m.job || '[İş No]';
    m.customer = m.customer || '[Müşteri]';
    m.model = m.model || '[Model]';
    m.brand = (m.brand || 'DOLFIN').toUpperCase().replace(/[^A-Z]/g, '') || 'DOLFIN';
    if (!LIB.brands[m.brand]) m.brand = 'DOLFIN';
    m.manufacturer = m.manufacturer || 'CNK Elektronik Makine San. A.Ş.';
    m.brandName = m.brandName || (m.brand === 'DOLFIN' ? 'Dolfin®' : '');
    m.brandLine = m.brandLine || (m.brand === 'DOLFIN' ? 'Dolfin® Industrial Parts Washing Machines' : '');
    m.docNo = m.docNo || `RA-${m.job}-01`;
    m.rev = m.rev || '00';
    m.reportDate = m.reportDate || '';
    m.status = m.status || 'draft';
    m.langs = m.langs && m.langs.length ? m.langs : ['tr', 'en', 'de'];
    m.cover = ['bant', 'ust', 'kose'].includes(String(m.cover || '').toLowerCase()) ? String(m.cover).toLowerCase() : 'bant';
    m.machineType = m.machineType || L3('Endüstriyel parça yıkama makinesi', 'Industrial parts washing machine', 'Industrielle Teilereinigungsanlage');
    m.scope = m.scope || L3('[Değerlendirme kapsamı]', '[Assessment scope]', '[Umfang der Beurteilung]');
    m.area = m.area || L3('');
    m.approvals = m.approvals || {};
    m.approvals.titles = m.approvals.titles || {};
    const photos = p.photos || [];
    const byKind = (k) => (photos.find((x) => x.kinds.includes(k)) || {}).file || null;
    m.coverPhoto = m.coverPhoto ? U.joinPath(p.dir, m.coverPhoto) : byKind('cover');
    m.panelPhoto = m.panelPhoto ? U.joinPath(p.dir, m.panelPhoto) : byKind('panel');
    m.pointsPhoto = m.pointsPhoto || byKind('points');
    // md'deki revizyon satırları korunur; güncel revizyonun satırı kapakla aynı bilgiyi taşır (ön bilgiden)
    p._revBase = p.revisions || [];
    p.revisions = syncRevisions(p._revBase, m);
    d('distribution', [{ to: L3('Teknik dosya', 'Technical file', 'Technische Dokumentation'), format: L3('Elektronik (PDF)', 'Electronic (PDF)', 'Elektronisch (PDF)') }]);
    d('outOfScope', L3(''));
    d('standards', clone(LIB.standards).filter((s) => !/11202|4871|3744|2003\/10/.test(s.ref)));
    p.machine = Object.assign({ desc: L3('[Makine tanımı]', '[Machine description]', '[Maschinenbeschreibung]'), tech: [], panel: [] }, p.machine || {});
    p.limits = Object.assign({
      intendedUse: L3('[Kullanım amacı]', '[Intended use]', '[Bestimmungsgemäße Verwendung]'),
      modes: L3('Otomatik çevrim · Bakım / temizlik (ana şalter kapalı ve kilitli)', 'Automatic cycle · Maintenance / cleaning (main switch off and locked)', 'Automatikzyklus · Wartung / Reinigung (Hauptschalter aus und abgeschlossen)'),
      users: L3('Eğitimli operatör · Yetkili bakım teknisyeni (elektrik / mekanik) · Temizlik personeli. Yetkisiz üçüncü kişiler makine alanına girmemelidir.', 'Trained operator · Authorised maintenance technician (electrical / mechanical) · Cleaning staff. Unauthorised third parties must not enter the machine area.', 'Unterwiesener Bediener · Befugtes Instandhaltungspersonal (Elektrik / Mechanik) · Reinigungspersonal. Unbefugte Dritte dürfen den Maschinenbereich nicht betreten.'),
      misuse: [], movement: L3(''), access: L3(''), interfaces: L3(''),
      life: L3('Makine: [10] yıl · Güvenlik bileşenleri için T<sub>M</sub> (görev süresi) = 20 yıl (EN ISO 13849-1)', 'Machine: [10] years · Mission time T<sub>M</sub> of safety components = 20 years (EN ISO 13849-1)', 'Maschine: [10] Jahre · Gebrauchsdauer T<sub>M</sub> der Sicherheitsbauteile = 20 Jahre (EN ISO 13849-1)'),
      profile: { dop: 220, hop: 16, tcycle: 10 }, maintenance: L3(''),
      environment: L3('İç mekân, +5 … +40 °C, yoğuşmasız', 'Indoor, +5 … +40 °C, non-condensing', 'Innenraum, +5 … +40 °C, nicht kondensierend'),
      phases: L3('')
    }, p.limits || {});
    d('photos', []);
    d('points', []);
    d('hazards', []);
    d('notApplicable', []);
    d('sfs', []);
    d('sfNotes', []);
    d('ccf', clone(LIB.ccf).map((c) => Object.assign(c, { applied: false })));
    d('systematic', clone(LIB.systematicDefault || L3('')));
    d('validation', []);
    p.elec = Object.assign({ date: '', time: '', location: L3(''), instrument: '', serial: '', calib: '', connection: L3(''), testedBy: '', method: L3(''), rpe: [], iso: [], hv: [] }, p.elec || {});
    p.elec.limits = Object.assign({}, LIB.elecDefaults, p.elec.limits || {});
    for (const k of ['rpe', 'iso', 'hv']) p.elec[k] = p.elec[k] || [];
    p.noise = Object.assign({ rows: [], operatorRows: null }, p.noise || {});
    p.thermal = Object.assign({ images: [], limit: LIB.thermalDefaultLimit, limitText: L3('EN ISO 13732-1, çıplak metal, 1 s temas (yetişkin)', 'EN ISO 13732-1, bare metal, 1 s contact (adults)', 'EN ISO 13732-1, blankes Metall, 1 s Kontakt (Erwachsene)') }, p.thermal || {});
    p.thermal.images = p.thermal.images || [];
    d('conclusion', L3(''));
    d('actions', []);
    d('signs', []);
    d('purpose', null);
    return p;
  }

  /**
   * sources: [{ dir, files: [{name, text}], list: [göreli yollar] }] — model önce, birim sonra (birim yoksa tek kaynak)
   */
  function build(sources) {
    const parts = sources.map((s) => autoLink(mapFolder(s.files, { dir: s.dir }), s.list));
    let p = parts[0];
    for (let i = 1; i < parts.length; i += 1) p = merge(p, parts[i]);
    return finalize(p);
  }

  /** Belgenin türünü ve temel klasörünü ön bilgiden okur (listeleme için hızlı) */
  function peek(files) {
    const sorted = files.slice().sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    const meta = {};
    const sections = {};
    for (const f of sorted) {
      const ast = Md.parse(f.text);
      Object.assign(meta, mapFront(ast.front));
      for (const sec of ast.sections) { const k = sectionKey(sec.title); if (k) sections[k] = true; }
    }
    return { meta, sections };
  }

  /* ─── Birim raporu yazımı (ölçüm stüdyosu) ───────────────── */
  const cell = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  function mlLine(o) {
    if (!o) return '';
    const parts = [o.tr || ''];
    if (o.en || o.de) parts.push(o.en || '');
    if (o.de) parts.push(o.de);
    return parts.join(' | ');
  }

  /** Birim md metni: ön bilgi + Elektrik / Gürültü / Termografi / Validasyon sonuçları */
  function serializeUnit(u) {
    const L = [];
    L.push('---');
    L.push('tur: birim');
    for (const [k, v] of [['no', u.job], ['musteri', u.customer], ['dokuman', u.docNo], ['rev', u.rev], ['tarih', u.reportDate], ['durum', u.status === 'final' ? 'yayın' : 'taslak'], ['sablon rev', u.templateRev], ['yil', u.year], ['hazirlayan', u.prepared], ['kontrol', u.checked], ['onay', u.approved]]) {
      if (v != null && v !== '') L.push(`${k}: ${v}`);
    }
    L.push('---', '', '<!-- Bu dosya Risk Analizi uygulamasının Ölçümler penceresinde yazılır; elle de düzenlenebilir. -->', '');
    const e = u.elec || {};
    L.push('# Elektrik Testleri');
    for (const [k, v] of [['tarih', e.date], ['saat', e.time], ['cihaz', e.instrument], ['seri no', e.serial], ['kalibrasyon', e.calib], ['test eden', e.testedBy]]) if (v) L.push(`- ${k}: ${v}`);
    L.push('');
    const elecTable = (title, kind, keyName, withU) => {
      const rows = (e[kind] || []).filter((r) => r.value || r.time || r.photo || (withU && r.u));
      L.push(`## ${title}`);
      L.push(withU ? `| ${keyName} | Saat | U (V) | Değer | Fotoğraf |` : `| ${keyName} | Saat | Değer | Fotoğraf |`);
      L.push(withU ? '|---|---|---|---|---|' : '|---|---|---|---|');
      for (const r of rows) L.push(withU ? `| ${cell(r.tag)} | ${cell(r.time)} | ${cell(r.u)} | ${cell(r.value)} | ${cell(r.photoRel || '')} |` : `| ${cell(r.tag)} | ${cell(r.time)} | ${cell(r.value)} | ${cell(r.photoRel || '')} |`);
      L.push('');
    };
    elecTable('Koruma iletkeni sürekliliği (R_PE)', 'rpe', 'No', false);
    elecTable('Yalıtım direnci (R_ISO)', 'iso', 'Çift', false);
    elecTable('Gerilim dayanım (HV)', 'hv', 'Çift', true);
    const g = u.noise || {};
    L.push('# Gürültü');
    const dec = (v) => (v == null || v === '' ? v : String(v).replace('.', ','));
    for (const [k, v] of [['tarih', g.date], ['saat', g.time], ['cihaz', g.instrument], ['seri no', g.serial], ['kalibrasyon', g.calib], ['arka plan', dec(g.bg)], ['belirsizlik', dec(g.K)], ['lwa', dec(g.LWA)], ['test eden', g.testedBy]]) if (v != null && v !== '') L.push(`- ${k}: ${v}`);
    L.push('', '| No | LpA | LCpeak | Arka plan | Fotoğraf |', '|---|---|---|---|---|');
    for (const r of (g.rows || []).filter((x) => x.lpa || x.lcpeak || x.photo)) L.push(`| ${cell(r.no)} | ${cell(r.lpa)} | ${cell(r.lcpeak)} | ${cell(r.bg)} | ${cell(r.photoRel || '')} |`);
    L.push('');
    const t = u.thermal || {};
    L.push('# Termografi');
    for (const [k, v] of [['tarih', t.date], ['saat', t.time], ['cihaz', t.instrument], ['seri no', t.serial], ['test eden', t.testedBy]]) if (v) L.push(`- ${k}: ${v}`);
    L.push('');
    (t.images || []).forEach((im, i) => {
      L.push(`## D-${i + 1}`);
      L.push(`- dosya: ${im.fileRel}`);
      if (im.title && im.title.tr) L.push(`- başlık: ${mlLine(im.title)}`);
      if (im.comment && im.comment.tr) L.push(`- yorum: ${mlLine(im.comment)}`);
      if (im.markers && im.markers.length) {
        L.push('', '| İşaret | Tür | x | y | w | h | Çıplak | Etiket |', '|---|---|---|---|---|---|---|---|');
        im.markers.forEach((m) => L.push(`| | ${{ pt: 'nokta', area: 'alan', hot: 'sıcak', cold: 'soğuk' }[m.type]} | ${m.type === 'hot' || m.type === 'cold' ? '' : Math.round(m.x)} | ${m.type === 'hot' || m.type === 'cold' ? '' : Math.round(m.y)} | ${m.type === 'area' ? Math.round(m.w) : ''} | ${m.type === 'area' ? Math.round(m.h) : ''} | ${m.ref ? 'evet' : ''} | ${cell(m.label && m.label.tr)} |`));
      }
      L.push('');
    });
    const val = (u.validation || []).filter((v) => v.result || v.date || (v.note && v.note.tr));
    if (val.length) {
      L.push('# Validasyon');
      for (const v of val) {
        L.push(`## ${v.id}`);
        L.push(`- sonuç: ${v.result === 'ok' ? 'U' : v.result === 'nok' ? 'UD' : ''}`);
        if (v.date) L.push(`- tarih: ${v.date}`);
        if (v.note && v.note.tr) L.push(`- not: ${mlLine(v.note)}`);
        L.push('');
      }
    }
    return `${L.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
  }

  /* ─── md düzenleme: üst çubuk (kapak bilgileri), yayınla / yeni revizyon, ölçüm penceresi ─── */
  /** Ön bilgi alanlarının yazımları: ilki yeni satırda kullanılır, hepsi aynı alan sayılır */
  const FRONT = {
    no: ['no', 'iş no', 'is no', 'seri no', 'proje no'],
    musteri: ['musteri', 'müşteri'],
    dokuman: ['dokuman', 'doküman no', 'dokuman no'],
    rev: ['rev', 'revizyon'],
    tarih: ['tarih', 'rapor tarihi'],
    durum: ['durum'],
    'sablon rev': ['sablon rev', 'şablon rev', 'sablon revizyon', 'şablon revizyon'],
    yil: ['yil', 'yıl', 'imal yili', 'imal yılı'],
    hazirlayan: ['hazirlayan', 'hazırlayan'],
    kontrol: ['kontrol', 'kontrol eden'],
    onay: ['onay', 'onaylayan'],
    'hazirlayan unvan': ['hazirlayan unvan', 'hazırlayan unvan'],
    'kontrol unvan': ['kontrol unvan', 'kontrol eden unvan'],
    'onay unvan': ['onay unvan', 'onaylayan unvan']
  };
  const eolOf = (text) => (/\r\n/.test(String(text || '')) ? '\r\n' : '\n');
  const splitLines = (text) => String(text == null ? '' : text).replace(/^﻿/, '').split(/\r?\n/);
  const FRONT_KEY = /^\s*([^:#][^:]*?)\s*:/;
  const frontEnd = (lines) => (lines[0] && lines[0].trim() === '---' ? lines.findIndex((l, i) => i > 0 && l.trim() === '---') : -1);

  /**
   * Ön bilgiye yazar. pairs: [[alan (FRONT adı ya da ad listesi), değer]]; değer boşsa satır silinir.
   * Var olan satırın yazımı korunur, aynı alanın diğer yazımları silinir, satır sonu (CRLF / LF) korunur.
   */
  function setFront(text, pairs) {
    const eol = eolOf(text);
    const bom = /^﻿/.test(String(text || '')) ? '﻿' : '';
    let lines = splitLines(text);
    let end = frontEnd(lines);
    if (end < 0) { lines = ['---', '---', ''].concat(String(text || '').trim() ? lines : []); end = 1; }
    const keyOf = (l) => { const m = FRONT_KEY.exec(l); return m ? norm(m[1]) : null; };
    for (const [k, value] of pairs) {
      const names = Array.isArray(k) ? k : FRONT[k] || [k];
      const keys = names.map(norm);
      const v = value == null ? '' : String(value).replace(/\s*\r?\n\s*/g, ' ').trim();
      const out = [];
      let placed = false;
      for (const l of lines.slice(1, end)) {
        if (!keys.includes(keyOf(l))) { out.push(l); continue; }
        if (!placed && v) out.push(`${FRONT_KEY.exec(l)[1].trim()}: ${v}`);
        placed = true;
      }
      if (!placed && v) out.push(`${names[0]}: ${v}`);
      lines = [lines[0], ...out, ...lines.slice(end)];
      end = out.length + 1;
    }
    return bom + lines.join(eol);
  }

  const REV_COLS = { rev: ['rev', 'revizyon'], date: ['tarih'], desc: ['aciklama'], by: ['hazirlayan'], approvedBy: ['onaylayan', 'onay'] };
  const REV_HEAD = ['| Rev | Tarih | Açıklama | Hazırlayan | Onaylayan |', '|---|---|---|---|---|'];
  /** Revizyon satırları md tablosu olarak (EN / DE açıklama "en:" / "de:" devam satırlarında) */
  function revisionLines(rows, idx, ncols, langs) {
    const out = [];
    for (const r of rows) {
      const c = new Array(ncols).fill('');
      const d = r.desc || {};
      c[idx.rev] = r.rev;
      if (idx.date >= 0) c[idx.date] = r.date || '';
      c[idx.desc] = d.tr || '';
      if (idx.by >= 0) c[idx.by] = r.by || '';
      if (idx.approvedBy >= 0) c[idx.approvedBy] = r.approvedBy || '';
      out.push(`| ${c.map(cell).join(' | ')} |`);
      for (const l of ['en', 'de']) {
        if (!d[l] || !langs.includes(l)) continue;
        const k = new Array(ncols).fill('');
        k[idx.desc] = `${l}: ${d[l]}`;
        out.push(`| ${k.map(cell).join(' | ')} |`);
      }
    }
    return out;
  }
  /**
   * "# Revizyonlar" tablosunu düzenler; yalnız ilgili satırlar değişir.
   *  set: { rev, date?, by?, approvedBy? } → o revizyonun satırındaki hücreler (satır yoksa dokunulmaz)
   *  add: [{ rev, date, desc: {tr,en,de}, by, approvedBy }] → tablonun sonuna; tablo yoksa base (önceki satırlar) ile kurulur
   */
  function editRevisions(text, opts) {
    const o = opts || {};
    const add = o.add || [];
    const langs = o.langs || ['tr', 'en', 'de'];
    const lines = splitLines(text);
    const fe = frontEnd(lines);
    const body = fe > 0 ? fe + 1 : 0;
    let start = -1;
    let stop = lines.length;
    for (let i = body; i < lines.length; i += 1) {
      const h = /^#\s+(.+?)\s*$/.exec(lines[i]);
      if (!h) continue;
      if (start >= 0) { stop = i; break; }
      if (sectionKey(h[1]) === 'revizyonlar') start = i;
    }
    const std = { rev: 0, date: 1, desc: 2, by: 3, approvedBy: 4 };
    const fresh = () => [...REV_HEAD, ...revisionLines((o.base || []).concat(add), std, 5, langs)];
    const done = () => (/^﻿/.test(String(text || '')) ? '﻿' : '') + lines.join(eolOf(text));
    if (start < 0) {
      if (!add.length) return text;
      const firstH = lines.findIndex((l, i) => i >= body && /^#\s+/.test(l));
      const block = ['# Revizyonlar', ...fresh(), ''];
      if (firstH >= 0) lines.splice(firstH, 0, ...block);
      else { if (lines.length && lines[lines.length - 1].trim()) lines.push(''); lines.push(...block); }
      return done();
    }
    let t0 = -1;
    let t1 = -1;
    for (let i = start + 1; i < stop; i += 1) {
      if (/^\s*\|/.test(lines[i])) { if (t0 < 0) t0 = i; t1 = i; } else if (t0 >= 0) break;
    }
    if (t0 < 0) {
      if (!add.length) return text;
      lines.splice(start + 1, 0, ...fresh());
      return done();
    }
    const head = Md.splitRow(lines[t0]).map(norm);
    const idx = {};
    for (const [k, names] of Object.entries(REV_COLS)) idx[k] = head.findIndex((h) => names.includes(h));
    if (idx.rev < 0 || idx.desc < 0) Object.assign(idx, std);
    const ncols = Math.max(head.length, 5);
    if (o.set && o.set.rev != null) {
      for (let i = t0 + 1; i <= t1; i += 1) {
        if (/^\s*\|?\s*:?-{2,}/.test(lines[i])) continue;
        const c = Md.splitRow(lines[i]);
        if (!c[idx.rev] || revNum(c[idx.rev]) !== revNum(o.set.rev)) continue;
        for (const k of ['date', 'by', 'approvedBy']) if (o.set[k] != null && idx[k] >= 0) c[idx[k]] = o.set[k];
        while (c.length < ncols) c.push('');
        lines[i] = `| ${c.map(cell).join(' | ')} |`;
        break;
      }
    }
    if (add.length) lines.splice(t1 + 1, 0, ...revisionLines(add, idx, ncols, langs));
    return done();
  }

  /** md'yi ön bilgi, giriş ve "# " bölümlerine ayırır */
  function splitDoc(text) {
    const lines = splitLines(text);
    const fe = frontEnd(lines);
    const front = fe > 0 ? lines.slice(0, fe + 1) : [];
    const pre = [];
    const secs = [];
    for (let i = fe > 0 ? fe + 1 : 0; i < lines.length; i += 1) {
      const h = /^#\s+(.+?)\s*$/.exec(lines[i]);
      if (h) secs.push({ key: sectionKey(h[1]), lines: [lines[i]] });
      else if (secs.length) secs[secs.length - 1].lines.push(lines[i]);
      else pre.push(lines[i]);
    }
    return { front, pre, secs };
  }
  const MEASURE_SECTIONS = ['elektrik', 'gurultu', 'termografi', 'validasyon'];
  /**
   * Ölçüm penceresinin kaydı: ölçüm bölümleri yeniden yazılır; ön bilgide u'da verilmeyen alanlar (kontrol, onay, unvanlar …)
   * ve diğer bölümler (Revizyonlar, Notlar …) korunur. u'da undefined olan alan dokunulmadan kalır.
   */
  function updateUnit(oldText, u) {
    const fresh = serializeUnit(u);
    if (!oldText || !String(oldText).trim()) return fresh;
    const eol = eolOf(oldText);
    const o = splitDoc(oldText);
    const f = splitDoc(fresh);
    const status = u.status === undefined ? undefined : u.status === 'final' ? 'yayın' : 'taslak';
    const pairs = [['no', u.job], ['musteri', u.customer], ['dokuman', u.docNo], ['rev', u.rev], ['tarih', u.reportDate], ['durum', status], ['sablon rev', u.templateRev], ['yil', u.year], ['hazirlayan', u.prepared], ['kontrol', u.checked], ['onay', u.approved]].filter(([, v]) => v !== undefined);
    const front = splitLines(setFront(o.front.length ? o.front.join('\n') : '', pairs));
    const keep = o.secs.filter((s) => !MEASURE_SECTIONS.includes(s.key));
    const meas = f.secs.filter((s) => MEASURE_SECTIONS.includes(s.key));
    const pre = o.pre.some((l) => l.trim()) ? o.pre : f.pre;
    const out = [...front, ...pre, ...keep.flatMap((s) => s.lines), '', ...meas.flatMap((s) => s.lines)].join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '');
    return `${out}\n`.replace(/\n/g, eol);
  }

  return { SECTIONS, sectionKey, mapFront, mapFolder, merge, autoLink, finalize, build, peek, serializeUnit, updateUnit, parseRisk, L3, clone, isEmptyML, mlLine, FRONT, setFront, editRevisions, syncRevisions, revNum };
});
