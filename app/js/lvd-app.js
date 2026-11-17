/* LVD test raporu — arayüz.
   Risk analizi ekranının üstünde açılan ayrı bir katmandır (#lvd); kapanınca kullanıcı kaldığı yere döner.
   Risk analizi kodunu ve dosyalarını değiştirmez: ana ekrana "LVD Testleri" sekmesi, rapor çubuğuna "LVD" düğmesi eklenir.
   Veriler lvd/<klasör>/lvd.md ve alt klasörlerde durur (GitHub deposu, yerel klasör ya da yerel sunucu — aynı depo arayüzü). */

(function (root) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const U = root.RaUtil;
  const { esc, todayStr, safeName } = U;
  const store = root.RaStore;
  const LIB = root.RA_LVD;
  const LVD = root.RaLvd;
  const REP = root.RaLvdReport;
  const Md = root.RaMd;
  const DIR = 'lvd';
  const LANG_NAMES = { tr: 'Türkçe', en: 'English', de: 'Deutsch' };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const L3 = LIB.L3;
  const isMd = (name) => /\.md$/i.test(name) && !/^readme/i.test(name);
  const STATE = { pass: ['green', 'uygun'], fail: ['red', 'uygun değil'], open: ['amber', 'açık'], none: ['gray', 'yapılmadı'], na: ['gray', 'uygulanamaz'], site: ['amber', 'kurulum yerinde'], skip: ['gray', 'yapılmadı'], warn: ['amber', 'koşullu'] };
  const OVERALL = { pass: ['green', 'Uygun'], fail: ['red', 'Uygun değil'], open: ['amber', 'Açık'], cond: ['amber', 'Koşullu'] };
  const SHORT = { visual: 'Gözle kontrol', rpe: 'R<sub>PE</sub> (Test 1)', vd: 'Gerilim düşümü (≈10 A)', loop: 'Z<sub>s</sub> (Test 2)', iso: 'Yalıtım direnci', hv: 'Gerilim testi (Hi-Pot)', res: 'Artık gerilim', leak: 'Koruma iletkeni akımı', func: 'Fonksiyon testleri', pwr: 'Çalışma testi (aktif)' };
  const ROWNAME = { rpe: 'R_PE', vd: 'ΔU', loop: 'Zs', iso: 'ISO', hv: 'HV', res: 'Artık', leak: 'I_PE', pwr: 'Güç' };
  const UNIT = { rpe: 'Ω', vd: 'V', loop: 'Ω', iso: 'MΩ', hv: 'mA', res: 'V', leak: 'mA', pwr: 'V' };
  const DEVICES = [
    L3('Elektriksel güvenlik test cihazı', 'Electrical safety tester', 'Prüfgerät für elektrische Sicherheit'),
    L3('Döngü empedansı test cihazı', 'Loop impedance tester', 'Schleifenimpedanz-Messgerät'),
    L3('Kaçak akım pens ampermetresi', 'Leakage current clamp meter', 'Leckstromzange'),
    L3('Multimetre', 'Multimeter', 'Multimeter')
  ];

  const S = { list: [], path: null, m: null, ev: null, sig: '', files: [], fileSig: {}, lang: 'tr', zoom: 'fit', busy: false, view: 'list', pages: 0 };
  try { const u = JSON.parse(localStorage.getItem('ra-lvd-ui') || '{}'); if (u.lang) S.lang = u.lang; if (u.zoom) S.zoom = u.zoom; } catch (e) { /* tarayıcı depolaması kapalı */ }
  const saveUI = () => { try { localStorage.setItem('ra-lvd-ui', JSON.stringify({ lang: S.lang, zoom: S.zoom })); } catch (e) { /* yok */ } };

  /* ─── Küçük yardımcılar ─────────────────────────────────── */
  let toastTimer = null;
  function toast(msg, isError) {
    const t = $('toast');
    t.textContent = msg;
    t.className = `toast${isError ? ' error' : ''}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), isError ? 7000 : 3800);
  }
  function modal(html, onReady) {
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = `<div class="modal lvd-modal">${html}</div>`;
    $('modalRoot').appendChild(ov);
    const close = () => { if (ov.isConnected) ov.remove(); };
    ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); });
    if (onReady) onReady(ov.firstElementChild, close);
    const first = ov.querySelector('input, select, button.btn-primary');
    if (first) setTimeout(() => first.focus(), 30);
    return close;
  }
  function download(name, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 60000);
  }
  const chip = (cls, t) => `<span class="chip ${cls}">${t}</span>`;
  const stateChip = (s, req) => { const [c, t] = (s === 'none' || s === 'skip') && req ? ['amber', 'yapılmadı'] : STATE[s] || STATE.open; return chip(c, t); };
  const slug = (s) => String(s || '').trim().toLocaleUpperCase('tr').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').slice(0, 40);
  const safeFile = (s) => String(s || '').replace(/[\\/:*?"<>|#%]+/g, '').replace(/\s+/g, ' ').trim() || 'foto';
  const mlStr = (o) => { if (!o) return ''; if (typeof o === 'string') return o; const p = [o.tr || '', o.en || '', o.de || '']; while (p.length > 1 && !p[p.length - 1]) p.pop(); return p.join(' | '); };
  const decStr = (v) => (v == null ? '' : String(v).replace('.', ','));
  const logo = (p) => (root.RaApp && root.RaApp.logo ? root.RaApp.logo(p) : (root.RA_LOGOS && root.RA_LOGOS[p]) || p);
  const isImage = (f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name);

  /* ─── Görseller: blob URL önbelleği, yer tutucu ve akış ─── */
  const PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='4' height='3'><rect width='4' height='3' fill='%23e9edf3'/></svg>";
  const imgs = new Map();
  const pending = new Set();
  let streaming = null;
  async function loadImage(path) {
    const sig = S.fileSig[path];
    let rec = imgs.get(path);
    if (rec && rec.sig === sig) return rec;
    const file = await store.read(path);
    if (rec) URL.revokeObjectURL(rec.url);
    rec = { url: URL.createObjectURL(file), sig, png: /png|gif|webp/i.test(file.type) };
    imgs.set(path, rec);
    return rec;
  }
  const ctx = {
    img: (path) => {
      if (!path) return '';
      const r = imgs.get(path);
      if (r && r.sig === S.fileSig[path]) return r.url;
      if (S.fileSig[path] === undefined) return r ? r.url : '';
      pending.add(path);
      return `${PLACEHOLDER}#lvd=${encodeURIComponent(path)}`;
    },
    logo
  };
  function streamImages() {
    if (streaming) return streaming;
    streaming = (async () => {
      let done = 0;
      while (pending.size) {
        const batch = [...pending];
        await Promise.all(batch.map(async (p) => {
          try {
            const rec = await loadImage(p);
            const enc = encodeURIComponent(p);
            document.querySelectorAll(`img[src$="#lvd=${enc}"]`).forEach((im) => { im.src = rec.url; });
          } catch (e) { /* bozuk ya da silinmiş dosya: yer tutucu kalır */ }
          pending.delete(p);
          done += 1;
          if ($('lvdLoad')) $('lvdLoad').textContent = pending.size ? `fotoğraflar ${done} / ${done + pending.size}` : '';
        }));
      }
      if ($('lvdLoad')) $('lvdLoad').textContent = '';
    })().finally(() => { streaming = null; });
    return streaming;
  }
  function photoPaths(m) {
    const out = new Set();
    for (const k of LIB.MEAS) m.meas[k].rows.forEach((r) => r.photo && out.add(r.photo));
    m.visual.forEach((v) => v.photo && out.add(v.photo));
    m.photos.forEach((p) => out.add(p.file));
    Object.values(m.meta.signs || {}).forEach((f) => f && out.add(f));
    return [...out].filter((p) => S.fileSig[p] !== undefined);
  }

  /* ─── Fotoğraf: küçültme ve çekim zamanı (EXIF) ─────────── */
  async function shrinkImage(file) {
    if (/svg/.test(file.type)) return file;
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { throw new Error(`${file.name}: fotoğraf okunamadı. HEIC ise telefonda JPG olarak kaydedip yeniden seçin.`); }
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (k === 1 && file.size < 700 * 1024 && /jpe?g/i.test(file.type)) { bmp.close(); return file; }
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    return new Promise((r) => c.toBlob((b) => r(b || file), 'image/jpeg', 0.85));
  }
  /** JPEG EXIF DateTimeOriginal → { date: GG.AA.YYYY, time: SS:DD:ss } (yoksa null). Küçültmeden önce okunur. */
  async function exifOf(file) {
    try {
      if (!/jpe?g/i.test(file.type) && !/\.jpe?g$/i.test(file.name)) return null;
      const buf = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
      if (buf.getUint16(0) !== 0xFFD8) return null;
      let off = 2;
      while (off + 10 < buf.byteLength) {
        const marker = buf.getUint16(off);
        const len = buf.getUint16(off + 2);
        if (marker === 0xFFE1 && buf.getUint32(off + 4) === 0x45786966) {
          const t = off + 10;
          const le = buf.getUint16(t) === 0x4949;
          const u16 = (o) => buf.getUint16(t + o, le);
          const u32 = (o) => buf.getUint32(t + o, le);
          const ifd = (o) => { const n = u16(o); const out = {}; for (let i = 0; i < n; i += 1) { const e = o + 2 + i * 12; out[u16(e)] = { count: u32(e + 4), val: u32(e + 8), at: e + 8 }; } return out; };
          const str = (ent) => { if (!ent) return ''; const p = ent.count > 4 ? ent.val : ent.at; let s = ''; for (let i = 0; i < ent.count - 1; i += 1) s += String.fromCharCode(buf.getUint8(t + p + i)); return s; };
          const i0 = ifd(u32(4));
          let dt = '';
          if (i0[0x8769]) { const ex = ifd(i0[0x8769].val); dt = str(ex[0x9003]) || str(ex[0x9004]); }
          if (!dt) dt = str(i0[0x0132]);
          const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(dt);
          return m ? { date: `${m[3]}.${m[2]}.${m[1]}`, time: `${m[4]}:${m[5]}:${m[6]}` } : null;
        }
        if ((marker & 0xFF00) !== 0xFF00 || marker === 0xFFDA) break;
        off += 2 + len;
      }
    } catch (e) { /* EXIF yok ya da bozuk */ }
    return null;
  }

  /* ─── Risk analizi (yalnız okunur) ──────────────────────── */
  async function raEntries() {
    const A = root.RaApp;
    if (!A) return { projects: [], units: [] };
    if (!A.state.entries.projects.length && !A.state.entries.units.length) { try { await A.scan(); } catch (e) { /* yok */ } }
    return A.state.entries;
  }
  const raLabel = (e) => { const m = e.meta || {}; return `${m.job || e.name} · ${(e.kind === 'birim' ? ((e.model || {}).meta || {}).model : m.model) || ''} · ${m.customer || ''}${m.docNo ? ` · ${m.docNo}` : ''}`; };
  /** Risk analizi modelini kurar (RaDoc.build); proje ya da makine raporu (yayınlanmışsa dondurulmuş şablonuyla) */
  async function raModel(path) {
    const unit = /\/raporlar\/[^/]+$/.test(path);
    let dirs = [{ dir: path, skip: ['raporlar'] }];
    if (unit) {
      const modelPath = path.split('/raporlar/')[0];
      const frozen = await store.exists(`${path}/sablon`);
      dirs = [{ dir: frozen ? `${path}/sablon` : modelPath, skip: ['raporlar'] }, { dir: path, skip: ['raporlar', 'sablon'] }];
    }
    const sources = [];
    for (const { dir, skip } of dirs) {
      const list = await store.list(dir);
      const md = list.filter((e) => e.kind === 'file' && isMd(e.name));
      const [files, walked] = await Promise.all([Promise.all(md.map(async (f) => ({ name: f.name, text: await store.text(`${dir}/${f.name}`) }))), store.walk(dir, skip)]);
      sources.push({ dir, files, list: walked.files });
    }
    if (!sources.some((s) => s.files.length)) throw new Error(`Risk analizi bulunamadı: ${path}`);
    return root.RaDoc.build(sources);
  }

  /* ─── Ekran iskeleti (bir kez eklenir) ─────────────────── */
  function inject() {
    const nav = document.querySelector('.home-nav');
    if (nav && !$('btnLvdHome')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'home-tab lvd-home-tab';
      b.id = 'btnLvdHome';
      b.title = 'Elektriksel güvenlik (LVD) test raporları — EN 60204-1 Bölüm 18';
      b.innerHTML = 'LVD Testleri <span class="home-count" id="lvdCount"></span>';
      nav.insertBefore(b, nav.querySelector('.tb-spacer'));
      b.addEventListener('click', () => openList());
    }
    const host = document.createElement('div');
    host.id = 'lvd';
    host.className = 'lvd hidden';
    host.innerHTML = `
      <section class="home lvd-list hidden" id="lvdList">
        <div class="home-bar">
          <img src="${esc(logo('assets/logos/dolfin.png'))}" alt="Dolfin" class="home-logo">
          <div class="home-title"><h1>LVD Test Raporları</h1><p>Elektriksel güvenlik · EN 60204-1:2018 Bölüm 18 · 2014/35/AB · 2006/42/AT Ek I 1.5.1</p></div>
          <div class="home-actions">
            <button type="button" class="btn" id="lvdBack" title="Risk analizi ekranına dön">← Risk analizi</button>
            <button type="button" class="btn" id="lvdRefresh">Yenile</button>
            <button type="button" class="btn btn-primary" id="lvdNew">+ Yeni LVD raporu</button>
          </div>
        </div>
        <div class="lvd-intro">Her LVD raporu EN 60204-1 §18.1'deki test programıyla açılır: <b>a)</b> gözle kontrol, <b>b)</b> R<sub>PE</sub>, <b>c)</b> Z<sub>s</sub> (Test 2), <b>d)</b> yalıtım direnci, <b>e)</b> gerilim testi, <b>f)</b> artık gerilim, <b>g)</b> koruma iletkeni akımı, <b>h)</b> fonksiyon testleri. Bir risk analizine bağlanırsa makine bilgileri, elektrik ölçümleri ve fotoğrafları oradan kopyalanır; risk analizi değişmez. Ölçüm fotoğrafları adlarına göre (<b>PE 1</b>, <b>L1-PE ISO</b>, <b>L1-PE FLASH</b>, <b>KACAK 1</b>, <b>ARTIK 1</b>, <b>ZS 1</b>, <b>ETIKET</b>, <b>PANO</b>) satırlarına kendiliğinden bağlanır.</div>
        <div class="project-list" id="lvdCards"></div>
      </section>
      <div class="lvd-view hidden" id="lvdView">
        <header class="topbar">
          <button type="button" class="tb-logo" id="lvdHome" title="LVD raporları listesi"><img src="${esc(logo('assets/logos/dolfin.png'))}" alt="" id="lvdLogo"></button>
          <span class="lvd-badge" id="lvdTopBadge">LVD</span>
          <nav class="doc-switch hidden" id="lvdDocSwitch" aria-label="Bu makinenin raporları"></nav>
          <div class="tb-doc"><strong id="lvdTitle"></strong><span id="lvdState"></span></div>
          <div class="tb-spacer"></div>
          <div class="tb-group"><div class="lang-seg" id="lvdLang"></div></div>
          <div class="tb-group">
            <button type="button" class="btn btn-sm btn-primary" id="lvdEdit" title="Test bilgileri, gözle kontrol, ölçüm değerleri ve fotoğraflar">Veriler ve fotoğraflar</button>
            <button type="button" class="btn btn-sm" id="lvdImport" title="Bağlı risk analizinden boş alanları doldurur, fotoğrafları kopyalar (risk analizi değişmez)">Risk analizinden aktar</button>
            <button type="button" class="icon-btn" id="lvdReload" title="lvd.md dosyasını yeniden oku"><svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg></button>
          </div>
          <div class="tb-group">
            <button type="button" class="btn btn-sm btn-primary" id="lvdPdf" title="Raporu doğrudan PDF olarak indirir"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>PDF İndir</button>
            <button type="button" class="icon-btn" id="lvdClose" title="LVD'yi kapat (risk analizine dön)">×</button>
          </div>
        </header>
        <div class="metabar lvd-mb" id="lvdMeta">
          <label class="mb-f mb-doc"><span>Rapor no</span><input class="mb-in" data-lmb="docNo" spellcheck="false" autocomplete="off" title="LVD-<seri no>-<test sırası> — kapakta ve her sayfanın antetinde yazar. Yeni test için yeni LVD raporu açılır."></label>
          <label class="mb-f mb-rev"><span>Rev</span><input class="mb-in" data-lmb="rev" spellcheck="false" autocomplete="off" title="Daha büyük rev yazınca yeni revizyon açılır (doküman düzeltmesi, test tekrarlanmamıştır)"></label>
          <label class="mb-f mb-date"><span>Tarih</span><input class="mb-in" data-lmb="reportDate" type="date" title="Rapor tarihi (kapak, onay ve revizyon tablosu)"></label>
          <label class="mb-f mb-person"><span>Müşteri</span><input class="mb-in" data-lmb="customer" spellcheck="false" autocomplete="off"></label>
          <label class="mb-f mb-person"><span>Hazırlayan</span><input class="mb-in" data-lmb="prepared" list="lvdPeople" spellcheck="false" autocomplete="off"></label>
          <label class="mb-f mb-person"><span>Kontrol eden</span><input class="mb-in" data-lmb="checked" list="lvdPeople" spellcheck="false" autocomplete="off"></label>
          <label class="mb-f mb-person"><span>Onaylayan</span><input class="mb-in" data-lmb="approved" list="lvdPeople" spellcheck="false" autocomplete="off"></label>
          <label class="mb-f mb-status"><span>Durum</span><select class="mb-in" data-lmb="status" title="Kapaktaki damga: TASLAK / YAYINLANDI"><option value="draft">Taslak</option><option value="final">Yayın</option></select></label>
          <span class="mb-state" id="lvdMbState"></span>
          <datalist id="lvdPeople"></datalist>
        </div>
        <aside class="left-panel">
          <nav class="panel-tabs"><button type="button" class="panel-tab active" data-lvl="toc">İçindekiler</button><button type="button" class="panel-tab" data-lvl="files">Dosyalar</button></nav>
          <section class="panel-body" id="lvdToc"></section>
          <section class="panel-body hidden" id="lvdFiles"></section>
        </aside>
        <main class="canvas-wrap" id="lvdWrap">
          <div id="lvdBanner" class="doc-banner hidden"></div>
          <div id="lvdDoc" class="report preview"></div>
          <div id="lvdMsg" class="canvas-msg hidden"></div>
        </main>
        <div class="zoom-float" id="lvdZoom" role="toolbar" aria-label="Yakınlaştırma">
          <button type="button" class="zf-btn" data-z="-" title="Uzaklaştır (Ctrl −)">−</button>
          <button type="button" class="zf-val" id="lvdZoomVal" title="Genişliğe sığdır (Ctrl 0)" data-z="fit">100%</button>
          <button type="button" class="zf-btn" data-z="+" title="Yakınlaştır (Ctrl +)">+</button>
          <span class="zf-sep"></span>
          <button type="button" class="zf-btn" data-z="fit" id="lvdFit" title="Genişliğe sığdır (Ctrl 0)"><svg viewBox="0 0 24 24"><path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/></svg></button>
        </div>
        <aside class="right-panel">
          <nav class="panel-tabs"><button type="button" class="panel-tab active" data-lvr="sum">Özet</button><button type="button" class="panel-tab" data-lvr="checks">Kontrol <span id="lvdBadge" class="badge hidden"></span></button></nav>
          <section class="panel-body" id="lvdSum"></section>
          <section class="panel-body hidden" id="lvdChecks"></section>
        </aside>
        <footer class="bottombar">
          <span id="lvdPages"></span>
          <span class="live" id="lvdLive"><i></i>lvd.md ve fotoğraflar değişince rapor kendiliğinden yenilenir</span>
          <div class="tb-spacer"></div>
          <span id="lvdLoad"></span>
          <span id="lvdPath"></span>
        </footer>
      </div>`;
    document.body.appendChild(host);
    const studio = document.createElement('div');
    studio.id = 'lvdStudio';
    studio.className = 'studio lvd-studio hidden';
    document.body.appendChild(studio);
    for (const id of ['lvdStage', 'lvdPrint']) {
      const d = document.createElement('div');
      d.id = id;
      d.className = 'report';
      d.setAttribute('aria-hidden', 'true');
      document.body.appendChild(d);
    }
    bind();
  }

  /* ─── Gezinme ───────────────────────────────────────────── */
  function show(view) {
    S.view = view;
    $('lvd').classList.remove('hidden');
    $('lvdList').classList.toggle('hidden', view !== 'list');
    $('lvdView').classList.toggle('hidden', view !== 'view');
    if (view !== 'view') stopWatch();
  }
  function closeAll() {
    stopWatch();
    $('lvd').classList.add('hidden');
    $('lvdStudio').classList.add('hidden');
    S.view = 'list';
  }
  async function openList() {
    show('list');
    $('lvdCards').innerHTML = '<div class="home-empty">LVD raporları okunuyor…</div>';
    try { await scanList(); } catch (e) { toast(`Liste okunamadı: ${e.message}`, true); }
    renderList();
  }
  /** Risk analizi ekranındaki "LVD" düğmesi: bağlı rapor varsa açılır, yoksa bu risk analiziyle yeni rapor */
  async function fromRA() {
    const e = root.RaApp && root.RaApp.state.entry;
    if (!e || e.kind === 'model') { openList(); return; }
    show('list');
    await scanList().catch(() => null);
    renderList();
    const hit = S.list.filter((x) => x.m && x.m.meta.link === e.path);
    if (hit.length) { openReport(hit[0].path); return; }
    newDialog(e.path);
  }

  /* ─── Liste ─────────────────────────────────────────────── */
  async function scanList() {
    let dirs = [];
    try { dirs = (await store.list(DIR)).filter((e) => e.kind === 'dir' && !e.name.startsWith('_')); } catch (e) { dirs = []; }
    const out = await Promise.all(dirs.map(async (d) => {
      const path = `${DIR}/${d.name}`;
      try {
        const m = LVD.parse(await store.text(`${path}/lvd.md`), path);
        return { path, name: d.name, m, ev: LVD.evaluate(m) };
      } catch (e) { return { path, name: d.name, m: null, ev: null }; }
    }));
    out.sort((a, b) => String((b.m && b.m.meta.job) || b.name).localeCompare(String((a.m && a.m.meta.job) || a.name), 'tr'));
    S.list = out;
    if ($('lvdCount')) $('lvdCount').textContent = out.length ? String(out.length) : '';
    return out;
  }
  function renderList() {
    const host = $('lvdCards');
    if (!S.list.length) {
      host.innerHTML = '<div class="home-empty"><b>Henüz LVD raporu yok.</b> "+ Yeni LVD raporu" ile açın ya da bir risk analizini açıp üst çubuktaki <b>LVD</b> düğmesine basın: rapor o makinenin bilgileri, elektrik ölçümleri ve fotoğraflarıyla oluşur.</div>';
      return;
    }
    host.innerHTML = S.list.map((x) => {
      if (!x.m) return `<button type="button" class="project-card empty" data-lvd="${esc(x.path)}"><span class="pc-bar"></span><div class="pc-no">${esc(x.name)}</div><div class="pc-customer">lvd.md yok ya da okunamadı</div></button>`;
      const M = x.m.meta;
      const [c, t] = OVERALL[x.ev.overall];
      const chips = [`<span class="pc-chip">Rev ${esc(M.rev || '00')}</span>`, M.status === 'final' ? '<span class="pc-chip ok">Yayın</span>' : '<span class="pc-chip">Taslak</span>', `<span class="pc-chip ${c === 'green' ? 'ok' : c === 'red' ? 'bad' : 'warn'}">${t}</span>`, M.link ? `<span class="pc-chip has" title="Bağlı risk analizi: ${esc(M.link)}">${esc(M.riskDoc || 'Risk analizine bağlı')}</span>` : ''].join('');
      return `<button type="button" class="project-card lvd-card" data-lvd="${esc(x.path)}"><span class="pc-bar"></span>
        <div class="pc-no">${esc(M.job || x.name)}</div><div class="pc-model">${esc(M.model || '')}</div><div class="pc-customer">${esc(M.customer || '')}</div>
        <div class="pc-chips">${chips}</div>
        <div class="pc-meta">${esc(M.docNo || '')} · test ${esc(x.m.cond.date || '—')}${M.riskDoc ? ` · ${esc(M.riskDoc)}` : ''}</div></button>`;
    }).join('');
  }

  /* ─── Yeni rapor ────────────────────────────────────────── */
  async function newDialog(presetLink) {
    const E = await raEntries();
    const opts = (list, label) => (list.length ? `<optgroup label="${label}">${list.map((e) => `<option value="${esc(e.path)}"${e.path === presetLink ? ' selected' : ''}>${esc(raLabel(e))}</option>`).join('')}</optgroup>` : '');
    modal(`<h2>Yeni LVD test raporu</h2>
      <p>Rapor EN 60204-1 Bölüm 18 yapısıyla açılır (gözle kontrol listesi, ölçüm tabloları, fonksiyon testleri). Bir risk analizi seçerseniz makine bilgileri, elektrik ölçümleri ve fotoğrafları bu rapora kopyalanır; risk analizi değişmez.</p>
      <div class="field"><label>Bağlı risk analizi</label><select class="field-input" id="lnRa"><option value="">— bağlantı yok —</option>${opts(E.projects.filter((e) => !e.empty), 'Projeler')}${opts(E.units, 'Makine raporları')}</select></div>
      <div class="field-row"><div class="field"><label>İş no</label><input class="field-input" id="lnNo" placeholder="0426051"></div><div class="field"><label>Müşteri (kısa)</label><input class="field-input" id="lnCu" placeholder="ACME"></div></div>
      <div class="field-row"><div class="field"><label>Model</label><input class="field-input" id="lnMo" placeholder="KBN 2B 1200"></div><div class="field"><label>Makine seri no</label><input class="field-input" id="lnSn" placeholder="boşsa iş no"></div></div>
      <div class="field"><label>Test tarihi</label><input class="field-input" id="lnDate" value="${esc(todayStr())}"></div>
      <div class="hint" id="lnDoc"></div>
      <div class="progress-text hidden" id="lnInfo"></div>
      <div class="modal-actions"><button type="button" class="btn" data-x>Vazgeç</button><button type="button" class="btn btn-primary" id="lnGo">Raporu oluştur</button></div>`, (box, close) => {
      const raSel = box.querySelector('#lnRa');
      const all = [...E.projects, ...E.units];
      let customerFull = '';
      const prefill = () => {
        const e = all.find((x) => x.path === raSel.value);
        if (!e) return;
        const m = e.meta || {};
        box.querySelector('#lnNo').value = m.job || e.name.split('-')[0];
        const cu = e.kind === 'proje' ? (e.name.split('-')[1] || m.customer || '') : (e.name.split('-').slice(1).join('-') || m.customer || '');
        box.querySelector('#lnCu').value = cu;
        customerFull = m.customer || '';
        box.querySelector('#lnMo').value = (e.kind === 'birim' ? ((e.model || {}).meta || {}).model : m.model) || '';
        box.querySelector('#lnSn').value = '';
        showDoc();
      };
      // Rapor no önizlemesi: LVD-<seri no>-<test sırası>; bu seri noya ait rapor yoksa 00 (fabrika testi)
      const docNos = S.list.filter((x) => x.m).map((x) => x.m.meta.docNo);
      const plan = () => {
        const no = box.querySelector('#lnNo').value.trim();
        const serial = box.querySelector('#lnSn').value.trim() || no;
        const seq = LVD.nextSeq(docNos, serial);
        return { serial, seq, docNo: serial ? LVD.docNoFor(serial, seq) : '' };
      };
      function showDoc() {
        const p = plan();
        box.querySelector('#lnDoc').innerHTML = p.docNo ? `Rapor no: <b>${esc(p.docNo)}</b> · Rev. 00 — ${p.seq === 0 ? 'bu makinenin ilk (fabrika) testi' : `bu makinenin ${p.seq + 1}. testi (önceki: ${esc(LVD.docNoFor(p.serial, p.seq - 1))})`}. Dokümandaki düzeltmeler numarayı değiştirmez, revizyon artar.` : 'Rapor no seri noya göre verilir: LVD-<seri no>-00 (fabrika testi).';
      }
      box.querySelector('#lnNo').addEventListener('input', showDoc);
      box.querySelector('#lnSn').addEventListener('input', showDoc);
      raSel.onchange = prefill;
      if (presetLink) prefill();
      showDoc();
      box.querySelector('[data-x]').onclick = close;
      box.querySelector('#lnGo').onclick = async () => {
        const no = box.querySelector('#lnNo').value.trim();
        const cuShort = box.querySelector('#lnCu').value.trim();
        const mo = box.querySelector('#lnMo').value.trim();
        if (!no || !mo) { toast('İş no ve model gerekli', true); return; }
        const link = raSel.value;
        const p = plan();
        // Aynı makinenin sonraki testi ayrı klasörde: …-01, …-02
        const base = `${DIR}/${no}-${cuShort ? `${slug(cuShort)}-` : ''}${slug(mo)}`;
        let dir = p.seq ? `${base}-${String(p.seq).padStart(2, '0')}` : base;
        const go = box.querySelector('#lnGo');
        const info = box.querySelector('#lnInfo');
        go.disabled = true;
        info.classList.remove('hidden');
        info.textContent = link ? 'Risk analizi okunuyor…' : 'Oluşturuluyor…';
        try {
          if (docNos.includes(p.docNo)) throw new Error(`Rapor no ${p.docNo} başka bir LVD raporunda kullanılıyor`);
          if (await store.exists(`${dir}/lvd.md`)) dir = `${base}-${String(p.seq).padStart(2, '0')}`;
          if (await store.exists(`${dir}/lvd.md`)) throw new Error(`Bu klasörde LVD raporu zaten var: ${dir}`);
          const m = LVD.create({ dir, job: no, customer: customerFull || cuShort, model: mo, serial: p.serial, seq: p.seq, date: box.querySelector('#lnDate').value.trim(), link });
          const ops = [];
          let log = [];
          if (link) {
            const p = await raModel(link);
            const r = LVD.importRA(m, p, link);
            log = r.log;
            info.textContent = `Fotoğraflar kopyalanıyor (${r.copies.length})…`;
            for (const [a, b] of r.copies) ops.push(store.copy(a, b));
          }
          for (const sub of ['olcum', 'foto', 'kurulum', 'cikti']) await store.mkdir(`${dir}/${sub}`);
          ops.push(store.write(`${dir}/lvd.md`, LVD.serialize(m)));
          await Promise.all(ops);
          close();
          await scanList();
          await openReport(dir);
          toast(link ? `LVD raporu oluşturuldu · risk analizinden: ${log.join(' · ') || 'aktarılacak veri yok'}` : 'LVD raporu oluşturuldu');
        } catch (x) {
          go.disabled = false;
          info.textContent = `Oluşturulamadı: ${x.message}`;
        }
      };
    });
  }

  /* ─── Görüntüleyici ─────────────────────────────────────── */
  function msg(html, spin) {
    const m = $('lvdMsg');
    if (!html) { m.classList.add('hidden'); return; }
    m.innerHTML = `${spin ? '<div class="spin"></div>' : ''}<div>${html}</div>`;
    m.classList.remove('hidden');
  }
  /** Diğer LVD raporlarının numaraları (aynı numaranın iki kez kullanılmasını engellemek için) */
  const otherDocNos = (path) => S.list.filter((x) => x.m && x.path !== path).map((x) => x.m.meta.docNo).filter(Boolean);
  async function loadReport(path) {
    const [text, walked] = await Promise.all([store.text(`${path}/lvd.md`), store.walk(path)]);
    S.files = walked.files;
    S.fileSig = walked.meta;
    S.sig = walked.sig;
    S.m = LVD.parse(text, path);
    const known = new Set(S.files);
    S.ev = LVD.evaluate(S.m, { exists: (f) => known.has(f), docNos: otherDocNos(path) });
  }
  async function openReport(path) {
    show('view');
    S.path = path;
    $('lvdDoc').replaceChildren();
    $('lvdToc').innerHTML = '';
    $('lvdSum').innerHTML = '';
    $('lvdChecks').innerHTML = '';
    $('lvdPath').textContent = path;
    msg('LVD raporu hazırlanıyor…', true);
    try {
      await root.RaPdfDom.loadFonts();
      await loadReport(path);
      renderDoc();
      msg(null);
      startWatch();
    } catch (e) {
      console.error(e);
      S.m = null;
      msg(`LVD raporu açılamadı: ${esc(e.message)}`);
    }
  }
  function renderDoc(keepScroll) {
    if (!S.m) return;
    const wrap = $('lvdWrap');
    const ratio = keepScroll && wrap.scrollHeight ? wrap.scrollTop / wrap.scrollHeight : 0;
    const langs = S.m.meta.langs && S.m.meta.langs.length ? S.m.meta.langs : ['tr'];
    if (!langs.includes(S.lang)) S.lang = langs[0];
    $('lvdLang').innerHTML = langs.map((l) => `<button type="button" data-lang="${l}" class="${l === S.lang ? 'active' : ''}" title="${LANG_NAMES[l]}">${l.toUpperCase()}</button>`).join('');
    const r = REP.render(S.m, S.ev, S.lang, ctx, $('lvdStage'));
    S.pages = r.pages.length;
    $('lvdDoc').replaceChildren(...r.pages);
    $('lvdDoc').lang = S.lang;
    applyZoom();
    if (keepScroll) wrap.scrollTop = ratio * wrap.scrollHeight;
    const M = S.m.meta;
    $('lvdTitle').textContent = M.link ? `${M.serial || M.job || M.docNo} · ${M.model || ''}` : `${M.docNo || 'LVD'} · ${M.model || ''}`;
    renderSwitch();
    $('lvdState').textContent = `${M.customer || ''} · Rev ${M.rev || '00'} · ${M.status === 'final' ? 'yayın' : 'taslak'} · LVD test raporu`;
    const brand = ((root.RA_LIB || {}).brands || {})[String(M.brand || 'DOLFIN').toUpperCase()];
    if (brand && brand.logo) $('lvdLogo').src = logo(brand.logo);
    $('lvdPages').textContent = `${r.pages.length} sayfa${S.lang !== 'tr' && r.stats.missing ? ` · ${r.stats.missing} eksik çeviri (TR gösteriliyor)` : ''}`;
    $('lvdImport').classList.toggle('hidden', !M.link);
    $('lvdToc').innerHTML = `<button type="button" class="toc-item cover" data-page="1"><span class="n">—</span><span>Kapak</span><span class="p">1</span></button>${r.toc.map((t) => `<button type="button" class="toc-item${t.sub ? ' sub' : ''}" data-page="${t.page}"><span class="n">${t.num}</span><span>${t.title}</span><span class="p">${t.page}</span></button>`).join('')}`;
    renderBanner();
    fillMeta();
    renderSum();
    renderChecks();
    renderFiles();
    streamImages();
  }
  /** Bu makinenin raporları: bağlı risk analizi + aynı risk analizine bağlı LVD raporları (00 fabrika testi, 01 …) */
  const DOT = { pass: 'ok', fail: 'bad', open: 'warn', cond: 'warn' };
  function raDocNo() {
    const A = root.RaApp && root.RaApp.state;
    const M = S.m.meta;
    return A && A.entry && A.entry.path === M.link && A.doc ? A.doc.p.meta.docNo : M.riskDoc;
  }
  function renderSwitch() {
    const M = S.m.meta;
    const host = $('lvdDocSwitch');
    const on = !!M.link;
    host.classList.toggle('hidden', !on);
    $('lvdTopBadge').classList.toggle('hidden', on);
    if (!on) { host.innerHTML = ''; return; }
    const items = [{ path: S.path, m: S.m, ev: S.ev, cur: true }, ...S.list.filter((x) => x.m && x.path !== S.path && x.m.meta.link === M.link)]
      .sort((a, b) => String(a.m.meta.docNo).localeCompare(String(b.m.meta.docNo)));
    const ra = raDocNo();
    host.innerHTML = `<button type="button" class="ds-tab" data-act="open-ra" title="Risk analizine geç: ${esc(ra || '')} (${esc(M.link)})"><span class="ds-k">Risk analizi</span><span class="ds-no">${esc(ra || 'bağlı')}</span></button>${items.map((x) => {
      const o = x.ev ? x.ev.overall : '';
      const t = `LVD test raporu ${x.m.meta.docNo || ''} · Rev ${x.m.meta.rev || '00'} · ${x.m.meta.status === 'final' ? 'yayın' : 'taslak'} · genel sonuç: ${(OVERALL[o] || ['', '—'])[1].toLowerCase()}`;
      return `<button type="button" class="ds-tab${x.cur ? ' active' : ''}"${x.cur ? ' aria-current="page"' : ` data-lvd-open="${esc(x.path)}"`} title="${esc(t)}${x.cur ? ' (açık)' : ' — açmak için tıklayın'}"><span class="ds-k">LVD testi</span><span class="ds-no">${esc(x.m.meta.docNo || x.path.split('/').pop())}<i class="ds-dot ${DOT[o] || ''}"></i></span></button>`;
    }).join('')}`;
  }
  function renderBanner() {
    const b = $('lvdBanner');
    const M = S.m.meta;
    b.innerHTML = M.link
      ? `<b>LVD test raporu</b> · bağlı risk analizi: <b>${esc(M.riskDoc || M.link)}</b> <span class="muted">(${esc(M.link)})</span> — <button type="button" class="link" data-act="import">Risk analizinden aktar</button> boş alanları doldurur ve fotoğrafları bu rapora kopyalar; risk analizi dosyaları değişmez. <button type="button" class="link" data-act="open-ra">Risk analizini aç</button>`
      : '<b>LVD test raporu</b> · risk analizine bağlı değil. <button type="button" class="link" data-act="edit">Veriler ve fotoğraflar</button> → Genel sekmesinden bağlanabilir.';
    b.classList.remove('hidden');
  }
  function renderSum() {
    const { ev, m } = S;
    const [c, t] = OVERALL[ev.overall];
    const T = ev.tests;
    const rng = (k) => {
      const x = T[k];
      if (!x.n) return '';
      const f = (v) => `${v.gt ? '>' : ''}${U.fmtDec(v.n, v.d, ',')}`;
      return x.lo.n === x.hi.n ? `${f(x.lo)} ${UNIT[k]}` : `${f(x.lo)} – ${f(x.hi)} ${UNIT[k]}`;
    };
    $('lvdSum').innerHTML = `
      <div class="sum-card"><h3>Sonuç</h3><div class="sum-row"><span>EN 60204-1 Bölüm 18</span><span class="v">${chip(c, t)}</span></div></div>
      <div class="sum-card"><h3>Test programı <span>§18.1</span></h3>${LIB.TESTS.map((x) => `<div class="sum-row"><span><b>${x.letter})</b> ${SHORT[x.key]}</span><span class="v">${stateChip(T[x.key].state, x.req)}</span></div>`).join('')}</div>
      <div class="sum-card"><h3>Ölçümler</h3>${LIB.MEAS.map((k) => `<div class="sum-row"><span>${SHORT[k]}</span><span class="v">${T[k].n ? `${T[k].n} · ${rng(k)}` : '—'}</span></div>`).join('')}
        <div class="sum-row"><span>Gözle kontrol</span><span class="v">${T.visual.ok} U · ${T.visual.nok} UD · ${T.visual.na} UY · ${T.visual.open} boş</span></div>
        <div class="sum-row"><span>Fonksiyon testleri</span><span class="v">${T.func.ok} U · ${T.func.nok} UD · ${T.func.open} boş</span></div></div>
      ${m.meta.link ? `<div class="sum-card"><h3>Risk analizi <span>bağlı</span></h3><div class="sum-row"><span><button type="button" class="link" data-act="open-ra" title="Risk analizine geç">${esc(raDocNo() || m.meta.link.split('/').pop())}</button></span><span class="v"><button type="button" class="link" data-act="open-ra">aç →</button></span></div><div class="sum-row"><span class="muted">${esc(m.meta.link)}</span></div></div>` : ''}`;
  }
  function renderChecks() {
    const { ev } = S;
    const b = $('lvdBadge');
    b.textContent = ev.errors || ev.warnings || '';
    b.className = `badge${ev.errors ? '' : ev.warnings ? ' warn' : ' hidden'}`;
    $('lvdChecks').innerHTML = `<div class="check-head">${ev.errors} hata · ${ev.warnings} uyarı · ${ev.checks.length - ev.errors - ev.warnings} bilgi</div>${ev.checks.map((c) => `<div class="check-row"><span class="check-dot ${c.level}"></span><span>${esc(c.msg)}</span></div>`).join('') || '<div class="check-ok">Kontrol listesinde sorun yok ✓</div>'}`;
  }
  function renderFiles() {
    const counts = {};
    S.files.forEach((f) => { const rel = f.slice(S.path.length + 1); const d = rel.includes('/') ? rel.split('/')[0] : '.'; counts[d] = (counts[d] || 0) + 1; });
    const dirs = Object.entries(counts).filter(([k]) => k !== '.').map(([k, n]) => `<div class="file-row"><span>${esc(k)}/</span><span class="t">${n} dosya</span></div>`).join('');
    $('lvdFiles').innerHTML = `<div class="file-note">Rapor bu dosyadan oluşur; dosya değişince rapor birkaç saniye içinde kendiliğinden yenilenir.</div>
      <div class="file-group"><h3>LVD raporu <span class="file-count">${esc(S.path.split('/').pop())}</span></h3><div class="file-row"><span>lvd.md</span><span class="t">md</span></div>${dirs}</div>
      ${S.m.meta.link ? `<div class="file-note">Bağlı risk analizi: <code>${esc(S.m.meta.link)}</code> (yalnız okunur)</div>` : ''}
      <div class="file-note">Klasör: <code>${esc(S.path)}</code></div>
      <div class="danger-zone"><h3>Tehlikeli bölge</h3><p>Bu LVD raporunun klasörü ve içindeki bütün dosyalar silinir. Bağlı risk analizi etkilenmez.</p><button type="button" class="btn btn-sm btn-danger-line" data-act="delete">LVD raporunu sil…</button></div>`;
  }
  function deleteDialog() {
    const name = S.path.split('/').pop();
    modal(`<h2 class="danger">LVD raporunu sil</h2>
      <div class="del-warn">Silinecek: <code>${esc(S.path)}</code> ve içindeki bütün dosyalar (lvd.md, fotoğraflar, PDF'ler).${store.mode === 'github' ? ' Depoda "Silindi" commit\'i olarak kalır; gerekirse geçmişten geri alınabilir.' : ''}</div>
      <label class="del-label">Onay için klasörün adını yazın: <b class="del-phrase">${esc(name)}</b></label>
      <input class="field-input" id="ldName" autocomplete="off" spellcheck="false">
      <div class="modal-actions"><button type="button" class="btn" data-x>Vazgeç</button><button type="button" class="btn btn-danger" id="ldGo" disabled>Sil</button></div>`, (box, close) => {
      const inp = box.querySelector('#ldName');
      const go = box.querySelector('#ldGo');
      inp.oninput = () => { go.disabled = inp.value.trim() !== name; };
      box.querySelector('[data-x]').onclick = close;
      go.onclick = async () => {
        go.disabled = true;
        try {
          stopWatch();
          await store.remove(S.path, { message: `Silindi: ${S.path}` });
          close();
          S.m = null;
          await openList();
          toast(`Silindi: ${S.path}`);
        } catch (x) { toast(`Silinemedi: ${x.message}`, true); go.disabled = false; }
      };
    });
  }

  /* ─── Kapak ve antet bilgileri (üst çubuk) ──────────────── */
  // Alandan çıkınca (ya da Enter) lvd.md'ye yazılır, kapak ve antet yenilenir. Rev yalnız artırılır: yeni revizyon = doküman düzeltmesi.
  const PEOPLE = ['prepared', 'checked', 'approved'];
  const isoDate = (d) => { const x = /^\s*(\d{1,2})[./-](\d{1,2})[./-](\d{4})\s*$/.exec(String(d || '')); return x ? `${x[3]}-${String(+x[2]).padStart(2, '0')}-${String(+x[1]).padStart(2, '0')}` : ''; };
  const trDate = (iso) => { const x = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return x ? `${x[3]}.${x[2]}.${x[1]}` : ''; };
  const mbCur = (k) => { const M = S.m.meta; return PEOPLE.includes(k) ? M.approvals[k] || '' : k === 'reportDate' ? isoDate(M.reportDate) : M[k] || ''; };
  /** Raporlarda geçen kişiler ve unvanları (yeni kişi seçilince unvan buradan gelir) */
  function knownPeople() {
    const out = {};
    for (const x of [...S.list.map((y) => y.m).filter(Boolean), S.m].filter(Boolean)) {
      const A = x.meta.approvals || {};
      for (const k of PEOPLE) if (A[k] && A.titles && A.titles[k] && !LVD.isEmptyML(A.titles[k]) && !out[A[k]]) out[A[k]] = A.titles[k];
    }
    return out;
  }
  function fillMeta() {
    if (!S.m) return;
    document.querySelectorAll('#lvdMeta [data-lmb]').forEach((i) => { i.value = mbCur(i.dataset.lmb); i.classList.remove('dirty'); });
    $('lvdPeople').innerHTML = Object.keys(knownPeople()).map((n) => `<option value="${esc(n)}">`).join('');
  }
  function titleDialog(name) {
    return new Promise((resolve) => {
      let done = false;
      const fin = (v) => { if (!done) { done = true; resolve(v); } };
      modal(`<h2>Unvan — ${esc(name)}</h2><p>Bu kişi daha önce LVD raporlarında geçmiyor. Kapakta ve onay tablosunda adın altında yazacak unvanı girin (TR | EN | DE).</p>
        <div class="field"><input class="field-input" id="ltTitle" placeholder="Kalite Kontrol Sorumlusu | Quality Control Officer | Qualitätskontrollverantwortlicher"></div>
        <div class="modal-actions"><button type="button" class="btn" data-x>Vazgeç</button><button type="button" class="btn" id="ltNone">Unvansız</button><button type="button" class="btn btn-primary" id="ltGo">Kaydet</button></div>`, (box, close) => {
        box.querySelector('[data-x]').onclick = () => { fin(null); close(); };
        box.querySelector('#ltNone').onclick = () => { fin(L3('', '', '')); close(); };
        box.querySelector('#ltGo').onclick = () => { const v = box.querySelector('#ltTitle').value.trim(); fin(v ? Md.splitLangs(v) : L3('', '', '')); close(); };
        box.closest('.modal-overlay').addEventListener('mousedown', (e) => { if (e.target === e.currentTarget) fin(null); });
      });
    });
  }
  function revisionDialog(rev) {
    return new Promise((resolve) => {
      let done = false;
      const fin = (v) => { if (!done) { done = true; resolve(v); } };
      const D = LVD.REV_DOC;
      modal(`<h2>Yeni revizyon — Rev. ${esc(rev)}</h2>
        <p>Rapor no aynı kalır (<b>${esc(S.m.meta.docNo)}</b>); revizyon <b>dokümandaki bir düzeltme</b> içindir, test tekrarlanmamıştır. Yeni test yapıldıysa revizyon yerine <b>+ Yeni LVD raporu</b> açın: numara bir sonraki sırayla verilir.</p>
        <div class="field"><label>Revizyon tarihi</label><input class="field-input" id="lrDate" type="date" value="${esc(isoDate(todayStr()))}"></div>
        ${['tr', 'en', 'de'].map((l) => `<div class="field"><label>Açıklama — ${LANG_NAMES[l]}</label><input class="field-input" id="lrDesc-${l}" value="${esc(D[l])}"></div>`).join('')}
        <div class="hint">Ne düzeltildiğini ekleyin, ör. "Doküman düzeltmesi — test tekrarlanmamıştır; makine seri no düzeltildi". Rapor taslağa döner; onaylanınca durumu Yayın yapın.</div>
        <div class="modal-actions"><button type="button" class="btn" data-x>Vazgeç</button><button type="button" class="btn btn-primary" id="lrGo">Revizyonu aç</button></div>`, (box, close) => {
        box.querySelector('[data-x]').onclick = () => { fin(null); close(); };
        box.querySelector('#lrGo').onclick = () => {
          const desc = {};
          for (const l of ['tr', 'en', 'de']) { const v = box.querySelector(`#lrDesc-${l}`).value.trim(); if (v) desc[l] = v; }
          fin({ date: trDate(box.querySelector('#lrDate').value) || todayStr(), desc: Object.assign({ tr: '' }, desc) });
          close();
        };
        box.closest('.modal-overlay').addEventListener('mousedown', (e) => { if (e.target === e.currentTarget) fin(null); });
      });
    });
  }
  async function saveModel(m, msg) {
    S.busy = true;
    $('lvdMbState').textContent = 'kaydediliyor…';
    $('lvdMbState').className = 'mb-state';
    try {
      await store.write(`${m.dir}/lvd.md`, LVD.serialize(m));
      await loadReport(m.dir);
      const it = S.list.find((x) => x.path === m.dir);
      if (it) { it.m = S.m; it.ev = S.ev; }
      renderDoc(true);
      $('lvdMbState').textContent = msg || 'kaydedildi';
    } catch (x) {
      $('lvdMbState').textContent = `kaydedilemedi: ${x.message}`;
      $('lvdMbState').className = 'mb-state err';
      fillMeta();
    } finally { S.busy = false; }
  }
  let mbBusy = false;
  async function commitMeta(inp) {
    if (!S.m || mbBusy) return;
    const k = inp.dataset.lmb;
    const raw = k === 'reportDate' ? inp.value : inp.value.replace(/\s+/g, ' ').trim();
    if (raw === mbCur(k)) { inp.classList.remove('dirty'); return; }
    const revert = (msg) => { inp.value = mbCur(k); inp.classList.remove('dirty'); if (msg) toast(msg, true); };
    const m = clone(S.m);
    const M = m.meta;
    mbBusy = true;
    try {
      if (k === 'docNo') {
        if (!raw) return revert('Rapor no boş olamaz');
        if (otherDocNos(S.path).includes(raw)) return revert(`${raw} başka bir LVD raporunda kullanılıyor`);
        if (!LVD.parseDocNo(raw) && !window.confirm(`"${raw}" LVD-<seri no>-<test sırası> biçiminde değil (ör. ${LVD.docNoFor(M.serial || M.job, 0)}). Yine de kaydedilsin mi?`)) return revert();
        M.docNo = raw;
      } else if (k === 'rev') {
        if (!/^\d{1,3}$/.test(raw)) return revert('Rev yalnız sayı olabilir (00, 01, 02 …)');
        if (+raw <= +(M.rev || 0)) return revert(`Revizyon yalnız artırılabilir (şu an Rev. ${M.rev}). Yeni test için + Yeni LVD raporu açın.`);
        const rev = String(+raw).padStart(2, '0');
        const r = await revisionDialog(rev);
        if (!r) return revert();
        LVD.newRevision(m, { rev, date: r.date, desc: r.desc });
      } else if (PEOPLE.includes(k)) {
        M.approvals[k] = raw;
        if (!raw) delete M.approvals.titles[k];
        else {
          const known = knownPeople()[raw];
          if (known) M.approvals.titles[k] = clone(known);
          else {
            const t = await titleDialog(raw);
            if (t === null) return revert();
            M.approvals.titles[k] = t;
          }
        }
      } else if (k === 'reportDate') {
        M.reportDate = trDate(raw);
      } else M[k] = raw;
      await saveModel(m, k === 'rev' ? `Rev. ${M.rev} açıldı` : 'kaydedildi');
    } finally { mbBusy = false; }
  }

  /* ─── Yakınlaştırma ─────────────────────────────────────── */
  const STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];
  const curZoom = () => parseFloat($('lvdDoc').style.getPropertyValue('--z')) || 1;
  function zoomFor(mode) {
    const fit = Math.max(0.25, Math.min(1.6, ($('lvdWrap').clientWidth - 4) / (794 + 48)));
    return mode === 'fit' ? fit : Math.min(4, Math.max(0.25, +mode || 1));
  }
  function applyZoom() {
    const z = +zoomFor(S.zoom).toFixed(4);
    $('lvdDoc').style.setProperty('--z', z);
    $('lvdZoomVal').textContent = `${Math.round(z * 100)}%`;
    $('lvdFit').classList.toggle('on', S.zoom === 'fit');
  }
  function setZoom(mode) { S.zoom = mode; saveUI(); applyZoom(); }
  function stepZoom(dir) {
    const cur = curZoom();
    const next = dir > 0 ? STEPS.find((v) => v > cur + 0.005) : [...STEPS].reverse().find((v) => v < cur - 0.005);
    setZoom(next || (dir > 0 ? 4 : 0.25));
  }
  function scrollToPage(n) {
    const pg = $('lvdDoc').querySelector(`.page[data-page="${n}"]`);
    if (!pg) return;
    const wrap = $('lvdWrap');
    const bh = $('lvdBanner').classList.contains('hidden') ? 0 : $('lvdBanner').offsetHeight;
    wrap.scrollTop += pg.getBoundingClientRect().top - wrap.getBoundingClientRect().top - bh - 12;
  }

  /* ─── Canlı yenileme ────────────────────────────────────── */
  let watch = null;
  function startWatch() {
    stopWatch();
    $('lvdLive').classList.remove('off');
    watch = setInterval(async () => {
      if (S.busy || S.view !== 'view' || !S.path || !S.m || document.hidden || $('lvd').classList.contains('hidden') || !$('lvdStudio').classList.contains('hidden')) return;
      S.busy = true;
      try {
        await store.refresh();
        const w = await store.walk(S.path);
        if (w.sig !== S.sig) { await loadReport(S.path); renderDoc(true); toast(`LVD raporu güncellendi (${new Date().toLocaleTimeString('tr-TR')})`); }
      } catch (e) { /* geçici okuma hatası */ } finally { S.busy = false; }
    }, 3000);
  }
  function stopWatch() { clearInterval(watch); watch = null; if ($('lvdLive')) $('lvdLive').classList.add('off'); }
  async function reload() {
    if (!S.path) return;
    try { await store.refresh(true); } catch (e) { /* yok */ }
    try { await loadReport(S.path); renderDoc(true); } catch (e) { toast(`Yenilenemedi: ${e.message}`, true); }
  }

  /* ─── Risk analizinden aktar ────────────────────────────── */
  async function importFromRA(model) {
    const m = model || clone(S.m);
    if (!m.meta.link) { toast('Bu rapor bir risk analizine bağlı değil', true); return null; }
    toast('Risk analizi okunuyor…');
    const p = await raModel(m.meta.link);
    const r = LVD.importRA(m, p, m.meta.link);
    const ops = r.copies.filter(([a, b]) => a !== b).map(([a, b]) => store.copy(a, b));
    S.busy = true;
    try {
      await Promise.all([...ops, store.write(`${m.dir}/lvd.md`, LVD.serialize(m))]);
      await loadReport(m.dir);
      renderDoc(true);
    } finally { S.busy = false; }
    toast(r.log.length ? `Risk analizinden aktarıldı: ${r.log.join(' · ')}` : 'Aktarılacak boş alan yok (dolu alanlar korunur)');
    return r;
  }
  function openRA() {
    const link = S.m && S.m.meta.link;
    if (!link || !root.RaApp) return;
    const A = root.RaApp.state;
    closeAll();
    if (A.entry && A.entry.path === link && A.doc && !$('app').classList.contains('hidden')) return;
    root.RaApp.open(link);
  }

  /* ─── PDF ───────────────────────────────────────────────── */
  function openPdfDialog() {
    if (!S.m) return;
    const langs = S.m.meta.langs;
    modal(`<h2>PDF İndir — LVD test raporu</h2>
      <p>Rapor yazdırma penceresi açılmadan doğrudan PDF olarak üretilir. Birden çok dil seçilirse her dil kapağıyla birlikte tek dosyada birleşir.</p>
      <div class="pdf-langs"><span>Diller</span>${langs.map((l) => `<label class="pdf-lang is-on"><input type="checkbox" value="${l}" checked> ${l.toUpperCase()}</label>`).join('')}</div>
      <label class="switch-row"><span>${store.mode === 'github' ? 'Depoya da kaydet (<code>cikti/</code>, commit olarak)' : 'Rapor klasörüne de kaydet (<code>cikti/</code>)'}</span><input type="checkbox" id="lpSave"${store.mode === 'github' ? '' : ' checked'}></label>
      <div class="progress hidden" id="lpProg"><i></i></div><div class="progress-text hidden" id="lpText"></div>
      <div class="modal-actions"><button type="button" class="btn" data-x>Vazgeç</button><button type="button" class="btn btn-primary" id="lpGo">PDF Oluştur</button></div>`, (box, close) => {
      box.querySelectorAll('.pdf-lang input').forEach((i) => i.addEventListener('change', () => i.parentElement.classList.toggle('is-on', i.checked)));
      box.querySelector('[data-x]').onclick = close;
      box.querySelector('#lpGo').onclick = async () => {
        const sel = [...box.querySelectorAll('.pdf-lang input:checked')].map((i) => i.value);
        if (!sel.length) { toast('En az bir dil seçin', true); return; }
        box.querySelector('#lpGo').disabled = true;
        box.querySelector('#lpProg').classList.remove('hidden');
        box.querySelector('#lpText').classList.remove('hidden');
        const bar = box.querySelector('#lpProg i');
        const txt = box.querySelector('#lpText');
        try {
          const res = await exportPdf(sel, box.querySelector('#lpSave').checked, (d, n, label) => { bar.style.width = `${Math.round((d / n) * 100)}%`; txt.textContent = label; });
          close();
          toast(`${res.name} indirildi${res.saved ? ' ve cikti/ klasörüne kaydedildi' : ''} · ${res.pages} sayfa · ${(res.size / 1048576).toFixed(1)} MB`);
        } catch (e) {
          console.error(e);
          txt.textContent = `PDF oluşturulamadı: ${e.message}`;
          box.querySelector('#lpGo').disabled = false;
        }
      };
    });
  }
  async function exportPdf(langs, saveCopy, onProgress) {
    const m = S.m;
    const pr = $('lvdPrint');
    S.busy = true;
    try {
      await root.RaPdfDom.loadFonts();
      onProgress(0, 1, 'Fotoğraflar hazırlanıyor…');
      await Promise.all(photoPaths(m).map((p) => loadImage(p).catch(() => null)));
      pr.replaceChildren();
      for (const lang of langs) {
        onProgress(0, 1, `${lang.toUpperCase()} sayfaları diziliyor…`);
        await new Promise((r) => setTimeout(r, 20));
        const r = REP.render(m, S.ev, lang, ctx, $('lvdStage'));
        const wrap = document.createElement('div');
        wrap.lang = lang;
        wrap.append(...r.pages);
        if (langs.length > 1) root.RaLayout.prefixIds(wrap, `${lang}-`);
        pr.appendChild(wrap);
      }
      await Promise.all([...pr.querySelectorAll('img')].map((i) => (i.decode ? i.decode().catch(() => {}) : null)));
      const pngs = new Set([...imgs.values()].filter((x) => x.png).map((x) => x.url));
      root.RaPdfDom.begin();
      let out;
      try {
        out = await root.RaPdfDom.render(pr, { title: `${m.meta.docNo} · ${m.meta.model}`, pngHint: (href) => pngs.has(href), onProgress: (i, n) => onProgress(i, n, `Sayfa ${i} / ${n} PDF'e yazılıyor…`) });
      } finally { root.RaPdfDom.end(); }
      const name = `${safeName(m.meta.docNo || 'LVD')}_Rev${safeName(m.meta.rev || '00')}_${safeName(m.meta.model)}_${langs.map((l) => l.toUpperCase()).join('-')}.pdf`;
      const blob = new Blob([out.bytes], { type: 'application/pdf' });
      download(name, blob);
      let saved = false;
      if (saveCopy) { try { await store.write(`${S.path}/cikti/${name}`, blob); saved = true; } catch (e) { toast(`cikti/ klasörüne yazılamadı: ${e.message}`, true); } }
      return { name, saved, pages: out.pages, size: blob.size };
    } finally {
      pr.replaceChildren();
      S.busy = false;
    }
  }

  /* ─── Veri penceresi (stüdyo) ───────────────────────────── */
  let W = null;
  let tab = 'genel';
  let dirty = false;
  let sideTimer = null;
  const TABS = [['genel', 'Genel'], ['cihaz', 'Test cihazları'], ['gozle', 'Gözle kontrol'], ['olcum', 'Ölçümler'], ['fonk', 'Fonksiyon testleri'], ['foto', 'Fotoğraflar']];
  const field = (label, html, wide) => `<div class="field${wide ? ' lv-wide' : ''}"><label>${label}</label>${html}</div>`;
  const inp = (k, v, cls, ph, list) => `<input class="field-input ${cls || ''}" data-k="${k}" value="${esc(v == null ? '' : v)}"${ph ? ` placeholder="${esc(ph)}"` : ''}${list ? ` list="${list}"` : ''} spellcheck="false" autocomplete="off">`;
  const mlInp = (k, o, cls, ph) => `<input class="field-input ${cls || ''}" data-k="${k}" data-ml="1" value="${esc(mlStr(o))}"${ph ? ` placeholder="${esc(ph)}"` : ''} autocomplete="off" title="Türkçe | English | Deutsch — çeviriler ' | ' ile ayrılır">`;
  const ml3 = (k, o, rows) => `<div class="lv-ml3">${['tr', 'en', 'de'].map((l) => `<label><span>${l.toUpperCase()}</span><textarea class="field-input" data-k="${k}.${l}" rows="${rows || 3}">${esc((o && o[l]) || '')}</textarea></label>`).join('')}</div>`;
  const sel = (k, v, opts, cls) => `<select class="field-input ${cls || ''}" data-k="${k}">${opts.map(([val, t]) => `<option value="${esc(val)}"${val === v ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
  const resSel = (k, v) => `<select class="field-input lv-res r-${v || 'x'}" data-k="${k}" data-res="1">${[['', '—'], ['ok', 'U'], ['nok', 'UD'], ['na', 'UY']].map(([val, t]) => `<option value="${val}"${val === (v || '') ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
  const thumb = (f, up) => { const src = f ? ctx.img(f) : ''; return `<label class="ms-up" title="${src ? 'Fotoğrafı değiştir' : 'Fotoğraf yükle'}">${src ? `<img class="thumb" src="${src}" alt="">` : '<div class="nothumb">+ foto</div>'}<input type="file" accept="image/*" data-up="${up}" hidden></label>`; };
  function setPath(obj, path, val) {
    const ks = path.split('.');
    let o = obj;
    for (let i = 0; i < ks.length - 1; i += 1) {
      if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {};
      o = o[ks[i]];
    }
    o[ks[ks.length - 1]] = val;
  }
  function newRow(test, tag) {
    if (test === 'loop') return { tag, time: '', circuit: L3(''), device: '', zs: '', zsMax: '', photo: null };
    if (test === 'vd') return { tag, time: '', cs: '', i: '', value: '', lim: '', point: L3(''), photo: null };
    if (test === 'pwr') return { tag, time: '', u: '', i: '', pf: '', p: '', s: '', q: '', point: L3(''), photo: null };
    const r = { tag, time: '', value: '', point: (test === 'iso' || test === 'hv') && LIB.pairText(tag) ? LIB.pairText(tag) : L3(''), photo: null };
    if (test === 'hv') r.u = '';
    if (test === 'res') r.t = '';
    return r;
  }
  function nextTag(test) {
    const rows = W.meas[test].rows;
    if (test === 'iso' || test === 'hv') { const free = LIB.PAIRS_3N.find((t) => !rows.some((r) => r.tag === t)); if (free) return free; }
    let n = rows.length + 1;
    while (rows.some((r) => r.tag === String(n))) n += 1;
    return String(n);
  }

  function openStudio(startTab) {
    if (!S.m) return;
    W = clone(S.m);
    tab = startTab || tab || 'genel';
    dirty = false;
    const st = $('lvdStudio');
    st.innerHTML = `<header class="cs-bar"><div class="cs-title"><h2>LVD verileri</h2><span id="lsSub"></span></div>
      <div class="cs-actions"><button type="button" class="btn btn-sm" id="lsSave">Kaydet</button><button type="button" class="btn btn-sm btn-primary" id="lsSaveClose">Kaydet ve raporu göster</button><button type="button" class="icon-btn" id="lsClose" title="Kapat (Esc)">×</button></div></header>
      <div class="ms-body"><div class="ms-main"><nav class="ms-tabs" id="lsTabs"></nav><div class="ms-pane" id="lsPane"></div></div><aside class="ms-side" id="lsSide"></aside></div>`;
    st.classList.remove('hidden');
    draw();
  }
  function closeStudio(force) {
    if (!force && dirty && !window.confirm('Kaydedilmemiş değişiklikler var. Kaydetmeden kapatılsın mı?')) return;
    $('lvdStudio').classList.add('hidden');
    $('lvdStudio').innerHTML = '';
    W = null;
  }
  function draw() {
    const scroll = $('lsPane') ? $('lsPane').scrollTop : 0;
    $('lsSub').textContent = `${W.meta.model || ''} · ${W.meta.job || ''} · ${W.meta.customer || ''} — ${W.dir}`;
    $('lsTabs').innerHTML = TABS.map(([k, l]) => `<button type="button" class="home-tab${k === tab ? ' active' : ''}" data-tab="${k}">${l}</button>`).join('');
    $('lsPane').innerHTML = PANES[tab]();
    $('lsPane').scrollTop = scroll;
    side();
    streamImages();
    const drop = $('lsDrop');
    if (drop) {
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('over'));
      drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); takeFiles(e.dataTransfer.files); });
    }
  }
  function side() {
    clearTimeout(sideTimer);
    sideTimer = setTimeout(() => {
      if (!W || !$('lsSide')) return;
      const ev = LVD.evaluate(W);
      const [c, t] = OVERALL[ev.overall];
      const L = W.limits;
      $('lsSide').innerHTML = `<div class="sum-card"><h3>Anlık sonuç</h3><div class="sum-row"><span>Genel</span><span class="v">${chip(c, t)}</span></div>
        ${LIB.TESTS.map((x) => `<div class="sum-row"><span><b>${x.letter})</b> ${SHORT[x.key]}</span><span class="v">${stateChip(ev.tests[x.key].state, x.req)}</span></div>`).join('')}</div>
        <div class="hint">Kabul: R<sub>PE</sub> ≤ ${decStr(L.rpeMax)} Ω (I ≥ ${decStr(L.rpeI)} A) · R<sub>ISO</sub> ≥ ${decStr(L.isoMin)} MΩ (${decStr(L.isoU)} ±${decStr(L.isoTol)} V) · HV ≤ ${decStr(L.hvMax)} mA (${decStr(L.hvU)} ±${decStr(L.hvTol)} V) · I<sub>PE</sub> ≤ ${decStr(L.leakMax)} mA · artık gerilim ≤ ${decStr(L.resMax)} V / ${decStr(L.resT)} s · Z<sub>s</sub> ≤ U<sub>0</sub> / I<sub>a</sub> · ΔU ≤ sınır · çalışma testi U<sub>n</sub> ±${decStr(L.uTol)} %</div>
        <div class="hint"><b>a)</b>, <b>b)</b> ve <b>h)</b> zorunludur (EN 60204-1 §18.1); diğerleri uygulanabildiği ölçüde yapılır. Yapılmayan test için Ölçümler'de durum seçin (kurulum yerinde / uygulanamaz / yapılmadı).</div>
        <div class="hint">Kaydet'e basınca <b>lvd.md</b> yazılır ve rapor yeniden oluşur.${store.mode === 'github' ? ' GitHub\'da her kayıt bir commit\'tir.' : ''}</div>
        ${ev.checks.filter((x) => x.level !== 'info').slice(0, 8).map((x) => `<div class="check-row"><span class="check-dot ${x.level}"></span><span>${esc(x.msg)}</span></div>`).join('')}`;
    }, 120);
  }

  /* Sekmeler */
  const PANES = {};
  PANES.genel = () => {
    const M = W.meta;
    const A = M.approvals || {};
    const C = W.machine;
    const K = W.cond;
    const E = (root.RaApp && root.RaApp.state.entries) || { projects: [], units: [] };
    const raOpts = [['', '— bağlantı yok —'], ...E.projects.filter((e) => !e.empty).map((e) => [e.path, `Proje · ${raLabel(e)}`]), ...E.units.map((e) => [e.path, `Makine raporu · ${raLabel(e)}`])];
    if (M.link && !raOpts.some(([v]) => v === M.link)) raOpts.push([M.link, M.link]);
    const lim = [['rpeI', 'R<sub>PE</sub> test akımı, en az (A)'], ['rpeT', 'R<sub>PE</sub> süre (s)'], ['rpeMax', 'R<sub>PE</sub> sınır (Ω)'], ['isoU', 'R<sub>ISO</sub> gerilim (V DC)'], ['isoTol', 'R<sub>ISO</sub> gerilim toleransı (± V)'], ['isoT', 'R<sub>ISO</sub> süre (s)'], ['isoMin', 'R<sub>ISO</sub> en az (MΩ)'], ['hvU', 'HV gerilim (V AC)'], ['hvTol', 'HV gerilim toleransı (± V)'], ['hvT', 'HV süre (s)'], ['hvMax', 'HV kaçak akım sınırı (mA)'], ['leakMax', 'I<sub>PE</sub> sınırı (mA)'], ['resMax', 'Artık gerilim (V)'], ['resT', 'Artık gerilim süresi (s)'], ['u0', 'U<sub>0</sub> faz–nötr (V)'], ['uTol', 'Çalışma testi: gerilim sapması (± %)']];
    const sig = (k, label) => { const f = (M.signs || {})[k]; const src = f ? ctx.img(f) : ''; return `<div class="field lv-sigf"><label>${label}</label><div class="lv-sigrow"><label class="ms-up" title="${src ? 'İmza görselini değiştir' : 'İmza görseli yükle (PNG, saydam zemin önerilir)'}">${src ? `<img class="thumb lv-sigimg" src="${src}" alt="">` : '<div class="nothumb">+ imza</div>'}<input type="file" accept="image/png,image/jpeg" data-up="sign.${k}" hidden></label>${f ? `<button type="button" class="icon-btn" data-act="del-sign" data-k="${k}" title="İmza görselini kaldır">×</button>` : ''}</div></div>`; };
    return `
      <div class="ms-card"><h3>Rapor bilgileri <small>kapak, antet ve onay</small></h3><div class="ms-grid">
        ${field('İş no', inp('meta.job', M.job))}${field('Müşteri', inp('meta.customer', M.customer))}${field('Model', inp('meta.model', M.model))}${field('Makine seri no', inp('meta.serial', M.serial, '', 'boşsa iş no'))}${field('İmal yılı', inp('meta.year', M.year))}
        ${field('Diller', inp('meta.langsStr', (M.langs || []).join(', '), '', 'tr, en, de'))}
        <div class="hint lv-wide" style="align-self:center">Rapor no (<b>${esc(M.docNo || '—')}</b>), Rev. ${esc(M.rev || '00')}, rapor tarihi, durum ve imza sahipleri (${esc([A.prepared, A.checked, A.approved].filter(Boolean).join(' · ') || '—')}) raporun üstündeki bilgi çubuğundan değiştirilir.</div>
        ${sig('prepared', 'İmza — hazırlayan')}${sig('checked', 'İmza — kontrol eden')}${sig('approved', 'İmza — onaylayan')}
      </div></div>
      <div class="ms-card"><h3>Risk analizi bağlantısı <small>yalnız okunur · aktarım yalnız boş alanları doldurur</small></h3>
        <div class="lv-row">${sel('meta.link', M.link, raOpts)}<button type="button" class="btn btn-sm" data-act="import"${M.link ? '' : ' disabled'}>Risk analizinden aktar</button></div>
        <div class="hint" style="margin-top:8px">Aktarılan: makine tipi ve besleme bilgileri, test tarihi / yeri / test eden / yöntem, test cihazı, R<sub>PE</sub> · R<sub>ISO</sub> · HV değerleri ve ölçüm fotoğrafları, genel görünüm / panel / kurulum fotoğrafları. Fotoğraflar bu rapora kopyalanır; risk analizi dosyaları değişmez. Güvenlik fonksiyonlarının validasyonu risk analizinde kalır, raporda ona atıf yapılır.</div></div>
      <div class="ms-card"><h3>Makine ve elektrik beslemesi <small>EN 60204-1 §16.4 makine etiketi</small></h3><div class="ms-grid">
        ${field('Makine tipi (TR | EN | DE)', mlInp('machine.type', C.type), true)}
        ${field('Besleme (gerilim / faz / frekans)', inp('machine.supply', C.supply, '', '3/N/PE AC 400 V 50 Hz'))}
        ${field('Anma akımı (tam yük)', inp('machine.current', C.current, '', '25 A'))}
        ${field('Kurulu güç', inp('machine.power', C.power, '', '11 kW'))}
        ${field('Şebeke tipi', inp('machine.network', C.network, '', 'TN-S', 'lvNet'))}
        ${field('Ön koruma (sigorta)', inp('machine.fuse', C.fuse, '', '32 A gG'))}
        ${field('Kısa devre dayanımı', inp('machine.sccr', C.sccr, '', '6 kA'))}
        ${field('Koruma sınıfı', inp('machine.protClass', C.protClass, '', 'I'))}
        ${field('Koruma derecesi (IP)', inp('machine.ip', C.ip, '', 'IP54'))}
        ${field('Besleme bağlantısı (TR | EN | DE)', mlInp('machine.connection', C.connection, '', 'CEE 32 A 5 kutuplu fiş | CEE 32 A 5-pin plug | CEE-Stecker 32 A 5-polig'), true)}
      </div><datalist id="lvNet"><option>TN-S</option><option>TN-C-S</option><option>TN-C</option><option>TT</option><option>IT</option></datalist></div>
      <div class="ms-card"><h3>Test koşulları</h3><div class="ms-grid">
        ${field('Test tarihi', inp('cond.date', K.date, '', 'GG.AA.YYYY'))}${field('Saat', inp('cond.time', K.time, '', '15:40 – 16:25'))}${field('Ortam sıcaklığı', inp('cond.temp', K.temp, '', '23 ±2 °C'))}${field('Bağıl nem', inp('cond.hum', K.hum, '', '%55 ±10'))}${field('Test eden', inp('cond.testedBy', K.testedBy))}${field('Diğer ortam notu', inp('cond.ambient', K.ambient, '', 'iklimlendirilmiş üretim alanı'))}
        ${field('Test yeri (TR | EN | DE)', mlInp('cond.location', K.location, '', 'Üretim atölyesi | Production workshop | Fertigungshalle'), true)}
        ${field('Bağlantı (TR | EN | DE)', mlInp('cond.connection', K.connection), true)}
      </div><div class="field" style="margin-top:10px"><label>Yöntem (raporda not olarak)</label>${ml3('cond.method', K.method, 3)}</div></div>
      <div class="ms-card"><h3>Test parametreleri ve kabul kriterleri <small>varsayılanlar risk analizindeki elektrik testleriyle aynı</small></h3><div class="ms-grid lv-lim">
        ${lim.map(([k, l]) => field(l, inp(`limits.${k}`, decStr(W.limits[k]), 'w-val'))).join('')}
      </div></div>`;
  };
  PANES.cihaz = () => `
    <div class="ms-card"><h3>Test cihazları <small>EN 60204-1 §18.1: §18.2 ve §18.3 testlerinde IEC 61557 serisine uygun cihazlar</small></h3>
      <table class="ms-table"><thead><tr><th>Cihaz (TR | EN | DE)</th><th>Marka / model</th><th>Seri no</th><th>Kalibrasyon tarihi</th><th>Geçerlilik</th><th></th></tr></thead><tbody>
      ${W.devices.map((d, i) => `<tr><td>${mlInp(`devices.${i}.name`, d.name, 'lv-w-wide')}</td><td>${inp(`devices.${i}.model`, d.model)}</td><td>${inp(`devices.${i}.serial`, d.serial, 'w-val')}</td><td>${inp(`devices.${i}.calib`, d.calib, 'w-time', 'GG.AA.YYYY')}</td><td>${inp(`devices.${i}.valid`, d.valid, 'w-time', 'GG.AA.YYYY')}</td><td><button type="button" class="icon-btn" data-act="del-dev" data-i="${i}" title="Satırı sil">×</button></td></tr>`).join('') || '<tr><td colspan="6" class="desc">Henüz cihaz yok.</td></tr>'}
      </tbody></table>
      <div class="ms-uprow"><select class="field-input lv-add" data-act-sel="add-dev"><option value="">+ Cihaz ekle…</option>${DEVICES.map((d, i) => `<option value="${i}">${esc(d.tr)}</option>`).join('')}<option value="x">Diğer</option></select></div>
      <div class="hint" style="margin-top:8px">Kalibrasyon geçerliliği test tarihinden önce biterse Kontrol listesinde hata görünür. Tarihler GG.AA.YYYY.</div></div>`;
  PANES.gozle = () => {
    const ev = LVD.evaluate(W).tests.visual;
    let g = null;
    const lib = Object.fromEntries(LIB.VISUAL.map((v) => [v.id, v]));
    const rows = W.visual.map((v, i) => {
      const L = lib[v.id];
      const grp = L ? L.g : 'other';
      let head = '';
      if (grp !== g) { g = grp; head = `<tr class="lv-grp"><td colspan="5">${esc((LIB.GROUPS[grp] && LIB.GROUPS[grp].tr) || 'Ek kontroller')}</td></tr>`; }
      const text = L ? esc(L.text.tr) : (v.text ? esc(v.text.tr || '') : '');
      return `${head}<tr><td class="w-tag">${esc(v.id)}</td><td class="desc">${text}<br><span class="lv-cl">${esc(L ? L.clause : v.clause || '')}</span></td><td>${resSel(`visual.${i}.result`, v.result)}</td><td>${mlInp(`visual.${i}.note`, v.note, 'lv-w-note', 'not / kanıt')}</td><td>${thumb(v.photo, `visual.${i}`)}</td></tr>`;
    }).join('');
    return `<div class="ms-card"><h3>Gözle kontrol ve dokümantasyon doğrulaması <small>EN 60204-1 §18.1 a · ${ev.ok} U · ${ev.nok} UD · ${ev.na} UY · ${ev.open} boş</small></h3>
      <div class="ms-uprow"><button type="button" class="btn btn-sm" data-act="vis-all-ok">Boş maddeleri U yap</button><span class="hint">U: uygun · UD: uygun değil · UY: uygulanamaz · kanıt fotoğrafı raporun Ek B'sine girer</span></div>
      <table class="ms-table lv-vis"><thead><tr><th>No</th><th>Kontrol maddesi</th><th>Sonuç</th><th>Not (TR | EN | DE)</th><th>Kanıt</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  };
  PANES.olcum = () => {
    const ev = LVD.evaluate(W).tests;
    const ref = LVD.pwrRef(W);
    // Sütunlar: [alan, başlık, tür (pt: çok dilli açıklama · time · val · s), yer tutucu]
    const FIELDS = {
      rpe: [['point', 'Ölçüm noktası (TR | EN | DE)', 'pt'], ['time', 'Saat', 'time'], ['i', 'I ölçülen (A)', 's', '0,229'], ['u', 'U ölçülen (V)', 's', '0,013'], ['value', 'R<sub>PE</sub> (Ω)', 'val', '0,06']],
      vd: [['point', 'Ölçüm noktası (TR | EN | DE)', 'pt'], ['time', 'Saat', 'time'], ['cs', 'Kesit (mm²)', 's', '2,5'], ['i', 'I (A)', 's', '10'], ['value', 'ΔU (V)', 'val', '0,66'], ['lim', 'Sınır (V)', 'val', 'auto']],
      loop: [['circuit', 'Devre (TR | EN | DE)', 'pt'], ['time', 'Saat', 'time'], ['device', 'Koruma', 's', 'C16'], ['zs', 'Z<sub>s</sub> (Ω)', 'val', '0,45'], ['zsMax', 'Z<sub>s,max</sub> (Ω)', 'val', 'auto']],
      iso: [['point', 'Ölçülen devre (TR | EN | DE)', 'pt'], ['time', 'Saat', 'time'], ['u', 'U ölçülen (V DC)', 's', String(W.limits.isoU)], ['value', 'R<sub>ISO</sub> (MΩ)', 'val', '>599,9']],
      hv: [['point', 'Ölçülen devre (TR | EN | DE)', 'pt'], ['time', 'Saat', 'time'], ['u', 'U ölçülen (V AC)', 's', String(W.limits.hvU)], ['value', 'I (mA)', 'val', '0,50']],
      res: [['point', 'Ölçüm noktası (TR | EN | DE)', 'pt'], ['time', 'Saat', 'time'], ['t', 'Süre (s)', 's', '5'], ['value', 'U (V)', 'val', '12']],
      leak: [['point', 'Ölçüm (TR | EN | DE)', 'pt'], ['time', 'Saat', 'time'], ['value', 'I<sub>PE</sub> (mA)', 'val', '1,2']],
      pwr: [['point', 'Çalışma durumu (TR | EN | DE)', 'pt'], ['time', 'Saat', 'time'], ['u', 'U (V)', 's', '386'], ['i', 'I (A)', 's', '15,95'], ['pf', 'cos φ', 's', '0,98'], ['p', 'P (kW)', 's', '10,45'], ['s', 'S (kVA)', 's', '10,66'], ['q', 'Q (kVAR)', 's', '2,12']]
    };
    const HINT = { rpe: 'PE 1.jpg', vd: 'VD 1.jpg', loop: 'ZS 1.jpg', iso: 'L1-PE ISO.jpg', hv: 'L1-PE FLASH.jpg', res: 'ARTIK 1.jpg', leak: 'KACAK 1.jpg', pwr: 'GUC 1.jpg' };
    const card = (k) => {
      const t = LIB.TESTS.find((x) => x.key === k);
      const sec = W.meas[k];
      const T = ev[k];
      const F = FIELDS[k];
      const statusSel = sel(`meas.${k}.status`, sec.status, [['', 'yapıldı / değer girilecek'], ['site', 'kurulum yerinde'], ['na', 'uygulanamaz'], ['skip', 'yapılmadı']], 'lv-status');
      const evc = (x) => (x.ok == null ? '<span class="chip gray">—</span>' : x.ok ? chip('green', '✓') : k === 'leak' ? chip('amber', '!') : chip('red', '✗'));
      const rows = sec.rows.map((r, i) => {
        const x = T.rows[i];
        const b = `meas.${k}.rows.${i}`;
        const cells = [`<td>${inp(`${b}.tag`, r.tag, 'w-tag')}</td>`];
        for (const [f, , type, ph] of F) {
          if (type === 'pt') cells.push(`<td>${mlInp(`${b}.${f}`, r[f], 'lv-w-pt')}</td>`);
          else if (type === 'time') cells.push(`<td>${inp(`${b}.time`, r.time, 'w-time', '15:43:14')}</td>`);
          else cells.push(`<td>${inp(`${b}.${f}`, r[f], type === 'val' ? 'w-val' : 'lv-w-s', ph === 'auto' ? (x && x.lim != null ? decStr(x.lim) : 'otomatik') : ph)}</td>`);
        }
        cells.push(`<td class="lv-ev" data-ev="${k}.${i}">${x ? evc(x) : ''}</td>`, `<td>${thumb(r.photo, `meas.${k}.${i}`)}</td>`, `<td><button type="button" class="icon-btn" data-act="del-row" data-test="${k}" data-i="${i}" title="Satırı sil">×</button></td>`);
        return `<tr>${cells.join('')}</tr>`;
      }).join('') || `<tr><td colspan="${F.length + 4}" class="desc">Satır yok. "+ Satır" ile ekleyin ya da Fotoğraflar sekmesine <b>${HINT[k]}</b> adlı fotoğraf bırakın.</td></tr>`;
      const extra = k === 'pwr' ? `<div class="field lv-un"><label>Nominal gerilim (V)</label>${inp('meas.pwr.un', sec.un, 'w-val', ref.un ? String(ref.un) : '400')}</div>` : '';
      const tip = { rpe: 'I / U ölçülen: test cihazının gösterdiği test akımı ve gerilimi (isteğe bağlı; I ≥ en az test akımı olmalı).', vd: 'Sınır boşsa kesit (≥ 1 mm²) ve test akımından EN 60204-1:2006 Tablo 9\'a göre hesaplanır.', iso: 'U ölçülen: uygulanan test gerilimi (isteğe bağlı; tolerans Genel sekmesinde).', hv: 'U ölçülen: uygulanan test gerilimi (tolerans Genel sekmesinde).', pwr: `Sapma nominal gerilime göre hesaplanır (±${decStr(W.limits.uTol)} %); akım, Makine'deki anma akımıyla${ref.irated ? ` (${decStr(ref.irated)} A)` : ''} karşılaştırılır.` }[k];
      return `<div class="ms-card" id="ls-${k}"><h3><span>${t.letter === '+' ? '' : `${t.letter}) `}${esc(t.name.tr)} <small>${esc(t.clause)}${t.req ? ' · zorunlu' : t.extra ? ' · ek test' : ''} · ${t.mode === 'on' ? 'aktif (enerjili)' : 'pasif (enerjisiz)'}</small></span><span class="lv-hd">${statusSel}${stateChip(T.state, t.req)}</span></h3>
        ${tip ? `<div class="hint" style="margin:-4px 0 8px">${tip}</div>` : ''}
        <table class="ms-table"><thead><tr><th>${k === 'iso' || k === 'hv' ? 'Çift' : 'No'}</th>${F.map(([, h]) => `<th>${h}</th>`).join('')}<th>Değ.</th><th>Foto</th><th></th></tr></thead><tbody>${rows}</tbody></table>
        <div class="ms-uprow"><button type="button" class="btn btn-sm" data-act="add-row" data-test="${k}">+ Satır</button>${k === 'iso' || k === 'hv' ? `<button type="button" class="btn btn-sm" data-act="add-pairs" data-test="${k}">+ 10 iletken çifti (3N+PE)</button>` : ''}${extra}<div class="field lv-note">${mlInp(`meas.${k}.note`, sec.note, '', 'not (raporda tablonun altında)')}</div></div></div>`;
    };
    return `<div class="hint">Satırlar fotoğraf adlarıyla da açılır (Fotoğraflar sekmesi). Değer biçimi: <b>0,06</b> · <b>&gt;599,9</b> · ölçüm saati boşsa fotoğrafın çekilme saatinden doldurulur. Sınırlar ve toleranslar Genel sekmesinde.</div>${LIB.MEAS.map(card).join('')}`;
  };
  PANES.fonk = () => {
    const lib = Object.fromEntries(LIB.FUNC.map((f) => [f.id, f]));
    const rows = W.func.map((f, i) => {
      const L = lib[f.id];
      const custom = !L || !LVD.isEmptyML(f.test);
      const test = custom ? mlInp(`func.${i}.test`, f.test, 'lv-w-pt', 'test') : `${esc(L.test.tr)}<br><span class="lv-cl">${esc(L.clause)}</span>`;
      const exp = custom && (!L || !LVD.isEmptyML(f.expected)) ? mlInp(`func.${i}.expected`, f.expected, 'lv-w-pt', 'beklenen sonuç') : L ? esc(L.expected.tr) : mlInp(`func.${i}.expected`, f.expected, 'lv-w-pt', 'beklenen sonuç');
      return `<tr><td class="w-tag">${esc(f.id)}</td><td class="desc">${test}</td><td class="desc">${exp}</td><td>${resSel(`func.${i}.result`, f.result)}</td><td>${inp(`func.${i}.date`, f.date, 'w-time', 'GG.AA.YYYY')}</td><td>${mlInp(`func.${i}.note`, f.note, 'lv-w-note', 'not')}</td><td><button type="button" class="icon-btn" data-act="del-func" data-i="${i}" title="Satırı sil">×</button></td></tr>`;
    }).join('');
    return `<div class="ms-card"><h3>Fonksiyon testleri <small>EN 60204-1 §18.6 · özellikle güvenlik ve koruma fonksiyonları</small></h3>
      <div class="ms-uprow"><button type="button" class="btn btn-sm" data-act="func-all-ok">Boş testleri U yap (tarih: test tarihi)</button><button type="button" class="btn btn-sm" data-act="add-func">+ Test ekle</button></div>
      <table class="ms-table"><thead><tr><th>No</th><th>Test</th><th>Beklenen sonuç</th><th>Sonuç</th><th>Tarih</th><th>Not</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="desc">Test yok.</td></tr>'}</tbody></table>
      <div class="hint" style="margin-top:8px">Güvenlik fonksiyonlarının validasyonu (EN ISO 13849-2) risk analizinde yapılır; LVD raporunda ona atıf yapılır.</div></div>`;
  };
  PANES.foto = () => {
    const used = new Set();
    for (const k of LIB.MEAS) W.meas[k].rows.forEach((r) => r.photo && used.add(r.photo));
    W.visual.forEach((v) => v.photo && used.add(v.photo));
    W.photos.forEach((p) => used.add(p.file));
    const loose = S.files.filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && !used.has(f) && !/\/cikti\//.test(f));
    const rowOpts = () => {
      const o = [];
      for (const k of LIB.MEAS) {
        W.meas[k].rows.forEach((r) => o.push([`row:${k}:${r.tag}`, `${ROWNAME[k]} ${r.tag}${r.photo ? ' (değiştir)' : ''}`]));
        o.push([`row:${k}:new`, `${ROWNAME[k]} — yeni satır`]);
      }
      return o;
    };
    const kindOpts = Object.entries(LIB.PHOTO_KINDS).map(([k, v]) => [k, v.tr]);
    const assignSel = (attr, withKinds) => `<select class="field-input lv-assign" ${attr}><option value="">Ata…</option>${withKinds ? `<optgroup label="Fotoğraf türü">${kindOpts.map(([v, t]) => `<option value="kind:${v}">${esc(t)}</option>`).join('')}</optgroup>` : ''}<optgroup label="Ölçüm satırı (olcum/ klasörüne taşınır)">${rowOpts().map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}</optgroup></select>`;
    const measCount = LIB.MEAS.map((k) => { const rs = W.meas[k].rows; return rs.length ? `<span class="chip ${rs.every((r) => r.photo) ? 'green' : 'gray'}">${ROWNAME[k]} ${rs.filter((r) => r.photo).length}/${rs.length}</span>` : ''; }).join(' ');
    return `<label class="drop" id="lsDrop"><input type="file" id="lsFile" multiple accept="image/*" data-up="drop" hidden><b>Fotoğrafları buraya bırakın (toplu)</b>
        <small>Ad kuralı: <i class="lv-k">PE 1</i> R<sub>PE</sub> noktası · <i class="lv-k">L1-PE ISO</i> yalıtım · <i class="lv-k">L1-PE FLASH</i> gerilim testi · <i class="lv-k">KACAK 1</i> koruma iletkeni akımı · <i class="lv-k">ARTIK 1</i> artık gerilim · <i class="lv-k">ZS 1</i> döngü empedansı · <i class="lv-k">ETIKET</i> · <i class="lv-k">PANO</i> · <i class="lv-k">GENEL</i> kapak · <i class="lv-k">KURULUM</i><br>Diğer adlar genel fotoğraf olur ve aşağıdan teste atanır. Ölçüm saati boşsa fotoğrafın çekilme saatinden doldurulur.</small></label>
      <div class="ms-card"><h3>Ölçüm fotoğrafları <small>satır başına foto</small></h3><div>${measCount}</div></div>
      <div class="ms-card"><h3>Makine, etiket, pano ve kurulum fotoğrafları <small>${W.photos.length} foto · raporun Ek B'si</small></h3>
        <table class="ms-table"><thead><tr><th>Foto</th><th>Dosya</th><th>Tür</th><th>Açıklama (TR | EN | DE)</th><th>Teste ata</th><th></th></tr></thead><tbody>
        ${W.photos.map((p, i) => `<tr><td>${ctx.img(p.file) ? `<img class="thumb" src="${ctx.img(p.file)}" alt="">` : '<div class="nothumb">yok</div>'}</td><td class="desc">${esc(p.file.slice(W.dir.length + 1))}</td><td>${sel(`photos.${i}.kind`, p.kind, kindOpts)}</td><td>${mlInp(`photos.${i}.caption`, p.caption, 'lv-w-pt', 'açıklama')}</td><td>${assignSel(`data-assign="photo:${i}"`, false)}</td><td><button type="button" class="icon-btn" data-act="del-photo" data-i="${i}" title="Fotoğrafı sil">×</button></td></tr>`).join('') || '<tr><td colspan="6" class="desc">Henüz fotoğraf yok.</td></tr>'}
        </tbody></table></div>
      ${loose.length ? `<div class="ms-card"><h3>Bağlanmamış dosyalar <small>${loose.length} dosya · rapora girmez</small></h3><table class="ms-table"><tbody>${loose.map((f) => `<tr><td>${ctx.img(f) ? `<img class="thumb" src="${ctx.img(f)}" alt="">` : ''}</td><td class="desc">${esc(f.slice(W.dir.length + 1))}</td><td>${assignSel(`data-assign="file:${esc(f)}"`, true)}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
  };

  /* Kaydet */
  async function saveW(ops, closeAfter) {
    if (W.meta.docNo && otherDocNos(W.dir).includes(W.meta.docNo)) { toast(`${W.meta.docNo} başka bir LVD raporunda kullanılıyor; rapor no'yu üst çubuktan değiştirin`, true); }
    S.busy = true;
    try {
      await Promise.all([store.write(`${W.dir}/lvd.md`, LVD.serialize(W)), ...(ops || [])]);
      await loadReport(W.dir);
      renderDoc(true);
      dirty = false;
      if (closeAfter) { closeStudio(true); toast('Kaydedildi; rapor yeniden oluşturuldu'); return; }
      W = clone(S.m);
      draw();
      toast('Kaydedildi; rapor yeniden oluşturuldu');
    } finally { S.busy = false; }
  }

  /* Fotoğraf yükleme ve atama */
  async function putRowPhoto(test, row, file, ops) {
    const ex = await exifOf(file);
    const dst = `${W.dir}/olcum/${LIB.photoName(test, row.tag)}.jpg`;
    if (row.photo && row.photo !== dst && row.photo.startsWith(`${W.dir}/`)) ops.push(store.remove(row.photo));
    row.photo = dst;
    if (ex) {
      if (!row.time) row.time = ex.time;
      if (!W.cond.date) W.cond.date = ex.date;
    }
    ops.push(store.write(dst, await shrinkImage(file)));
  }
  async function takeFiles(list) {
    const files = [...list];
    if (!files.length) return;
    toast(`${files.length} dosya yükleniyor…`);
    const ops = [];
    const bad = [];
    const rep = { meas: 0, photos: 0 };
    for (const f of files) {
      if (!isImage(f)) { bad.push(`${f.name}: fotoğraf değil, atlandı`); continue; }
      try {
        const rule = LIB.photoRule(f.name);
        if (rule && rule.test) {
          const sec = W.meas[rule.test];
          let row = sec.rows.find((r) => r.tag === rule.tag);
          if (!row) { row = newRow(rule.test, rule.tag); sec.rows.push(row); }
          if (sec.status && sec.status !== 'done') sec.status = '';
          await putRowPhoto(rule.test, row, f, ops);
          rep.meas += 1;
          continue;
        }
        const kind = rule ? rule.kind : 'general';
        const dst = `${W.dir}/${kind === 'setup' ? 'kurulum' : 'foto'}/${safeFile(f.name.replace(/\.[^.]+$/, ''))}.jpg`;
        ops.push(store.write(dst, await shrinkImage(f)));
        if (!W.photos.some((p) => p.file === dst)) W.photos.push({ file: dst, kind, caption: kind === 'general' ? L3('') : clone(LIB.PHOTO_KINDS[kind]) });
        rep.photos += 1;
      } catch (x) { bad.push(x.message); }
    }
    try {
      if (ops.length) await saveW(ops);
      toast(bad.length ? bad.join(' · ') : `${rep.meas} ölçüm fotoğrafı satırına bağlandı, ${rep.photos} fotoğraf eklendi`, !!bad.length);
    } catch (x) { toast(`Yüklenemedi: ${x.message}`, true); }
  }
  async function upload(key, list) {
    const files = [...list];
    if (!files.length) return;
    if (key === 'drop') { takeFiles(files); return; }
    toast('Yükleniyor…');
    const [kind, a, b] = key.split('.');
    const ops = [];
    try {
      if (kind === 'meas') await putRowPhoto(a, W.meas[a].rows[+b], files[0], ops);
      else if (kind === 'sign') {
        // İmza görseli: PNG saydamlığı korunur (küçültülmez), JPEG küçültülür
        const f = files[0];
        const png = /png/i.test(f.type) || /\.png$/i.test(f.name);
        const dst = `${W.dir}/imza/${a}.${png ? 'png' : 'jpg'}`;
        const old = (W.meta.signs || {})[a];
        if (old && old !== dst && old.startsWith(`${W.dir}/`)) ops.push(store.remove(old));
        W.meta.signs = W.meta.signs || {};
        W.meta.signs[a] = dst;
        ops.push(store.write(dst, png ? f : await shrinkImage(f)));
      }
      else if (kind === 'visual') {
        const v = W.visual[+a];
        const dst = `${W.dir}/foto/${v.id}.jpg`;
        if (v.photo && v.photo !== dst && v.photo.startsWith(`${W.dir}/`) && !W.photos.some((p) => p.file === v.photo)) ops.push(store.remove(v.photo));
        v.photo = dst;
        ops.push(store.write(dst, await shrinkImage(files[0])));
      }
      await saveW(ops);
    } catch (x) { toast(`Yüklenemedi: ${x.message}`, true); }
  }
  /** Fotoğrafı ölçüm satırına taşır (olcum/<kural adı>) ya da türünü değiştirir */
  async function assign(src, val, photoIndex) {
    if (!val) return;
    const ops = [];
    try {
      if (val.startsWith('kind:')) {
        const kind = val.slice(5);
        if (photoIndex != null) W.photos[photoIndex].kind = kind;
        else if (!W.photos.some((p) => p.file === src)) W.photos.push({ file: src, kind, caption: kind === 'general' ? L3('') : clone(LIB.PHOTO_KINDS[kind]) });
        await saveW([]);
        return;
      }
      const [, test, tag0] = val.split(':');
      const sec = W.meas[test];
      const tag = tag0 === 'new' ? nextTag(test) : tag0;
      let row = sec.rows.find((r) => r.tag === tag);
      if (!row) { row = newRow(test, tag); sec.rows.push(row); }
      if (sec.status && sec.status !== 'done') sec.status = '';
      const ext = (/\.(png|webp|jpe?g)$/i.exec(src) || ['', 'jpg'])[1].toLowerCase().replace('jpeg', 'jpg');
      const dst = `${W.dir}/olcum/${LIB.photoName(test, tag)}.${ext}`;
      if (row.photo && row.photo !== dst && row.photo !== src && row.photo.startsWith(`${W.dir}/`)) ops.push(store.remove(row.photo));
      if (src !== dst) {
        await store.copy(src, dst);
        ops.push(store.remove(src));
      }
      row.photo = dst;
      if (photoIndex != null) W.photos.splice(photoIndex, 1);
      W.visual.forEach((v) => { if (v.photo === src) v.photo = null; });
      await saveW(ops);
      toast(`${ROWNAME[test]} ${tag} satırına bağlandı`);
    } catch (x) { toast(`Atanamadı: ${x.message}`, true); }
  }

  /* Pencere olayları */
  function studioInput(e) {
    const t = e.target;
    const k = t.dataset && t.dataset.k;
    if (!k || !W) return;
    if (k === 'meta.langsStr') {
      const ls = t.value.toLowerCase().split(/[,;\s]+/).filter((l) => ['tr', 'en', 'de'].includes(l));
      if (ls.length) W.meta.langs = [...new Set(ls)];
    } else if (k.startsWith('limits.')) {
      const n = parseFloat(String(t.value).replace(',', '.'));
      if (!Number.isNaN(n)) {
        setPath(W, k, n);
        const g = k.slice(7).replace(/(I|T|Max|Min|U)$/, '');
        W.limitsSet[g] = true;
      }
    } else setPath(W, k, t.dataset.ml ? Md.splitLangs(t.value) : t.value);
    if (t.dataset.res) t.className = `field-input lv-res r-${t.value || 'x'}`;
    if (k === 'meta.link') {
      const E = (root.RaApp && root.RaApp.state.entries) || { projects: [], units: [] };
      const e = [...E.projects, ...E.units].find((x) => x.path === t.value);
      if (e && e.meta && e.meta.docNo) W.meta.riskDoc = e.meta.docNo;
      if (!t.value) W.meta.riskDoc = '';
      const btn = $('lvdStudio').querySelector('[data-act="import"]');
      if (btn) btn.disabled = !t.value;
    }
    // Ölçüm satırının değerlendirmesi yazarken güncellenir
    const mm = /^meas\.(\w+)\.rows\.(\d+)\./.exec(k);
    if (mm) {
      const cell = $('lvdStudio').querySelector(`[data-ev="${mm[1]}.${mm[2]}"]`);
      if (cell) { const x = LVD.evalRow(mm[1], W.meas[mm[1]].rows[+mm[2]], W.limits, LVD.pwrRef(W)); cell.innerHTML = x.ok == null ? '<span class="chip gray">—</span>' : x.ok ? chip('green', '✓') : mm[1] === 'leak' ? chip('amber', '!') : chip('red', '✗'); }
    }
    dirty = true;
    side();
  }
  async function studioClick(e) {
    const tb = e.target.closest('[data-tab]');
    if (tb) { tab = tb.dataset.tab; draw(); return; }
    const id = e.target.id || (e.target.closest('button') || {}).id;
    if (id === 'lsClose') { closeStudio(); return; }
    if (id === 'lsSave' || id === 'lsSaveClose') { try { await saveW([], id === 'lsSaveClose'); } catch (x) { toast(`Kaydedilemedi: ${x.message}`, true); } return; }
    const a = e.target.closest('[data-act]');
    if (!a || a.tagName === 'SELECT') return;
    const act = a.dataset.act;
    const i = a.dataset.i != null ? +a.dataset.i : null;
    const test = a.dataset.test;
    if (act === 'add-row') { W.meas[test].rows.push(newRow(test, nextTag(test))); if (W.meas[test].status === 'skip' || W.meas[test].status === 'site') W.meas[test].status = ''; }
    else if (act === 'add-pairs') { LIB.PAIRS_3N.forEach((t) => { if (!W.meas[test].rows.some((r) => r.tag === t)) W.meas[test].rows.push(newRow(test, t)); }); }
    else if (act === 'del-row') { const r = W.meas[test].rows[i]; if ((r.value || r.photo) && !window.confirm(`${ROWNAME[test]} ${r.tag} satırı silinsin mi?${r.photo ? ' (Fotoğraf dosyası klasörde kalır.)' : ''}`)) return; W.meas[test].rows.splice(i, 1); }
    else if (act === 'del-dev') W.devices.splice(i, 1);
    else if (act === 'del-func') W.func.splice(i, 1);
    else if (act === 'add-func') { let n = W.func.length + 1; while (W.func.some((f) => f.id === `F-${String(n).padStart(2, '0')}`)) n += 1; W.func.push({ id: `F-${String(n).padStart(2, '0')}`, ref: '', test: L3(''), expected: L3(''), result: '', date: '', note: L3('') }); }
    else if (act === 'vis-all-ok') W.visual.forEach((v) => { if (!v.result) v.result = 'ok'; });
    else if (act === 'func-all-ok') W.func.forEach((f) => { if (!f.result) { f.result = 'ok'; if (!f.date) f.date = W.cond.date || todayStr(); } });
    else if (act === 'del-sign') {
      const k = a.dataset.k;
      const f = (W.meta.signs || {})[k];
      if (!f || !window.confirm('İmza görseli kaldırılsın mı?')) return;
      W.meta.signs[k] = '';
      try { await saveW([store.remove(f)]); } catch (x) { toast(`Kaldırılamadı: ${x.message}`, true); }
      return;
    } else if (act === 'del-photo') {
      const p = W.photos[i];
      if (!window.confirm(`${p.file.split('/').pop()} rapordan çıkarılıp silinsin mi?`)) return;
      W.photos.splice(i, 1);
      try { await saveW([store.remove(p.file)]); } catch (x) { toast(`Silinemedi: ${x.message}`, true); }
      return;
    } else if (act === 'import') {
      try {
        S.busy = true;
        const r = await importFromRA(W);
        S.busy = false;
        if (r) { W = clone(S.m); dirty = false; draw(); }
      } catch (x) { S.busy = false; toast(`Aktarılamadı: ${x.message}`, true); }
      return;
    } else return;
    dirty = true;
    draw();
  }
  function studioChange(e) {
    const t = e.target;
    if (t.dataset.up) { upload(t.dataset.up, t.files); return; }
    if (t.dataset.actSel === 'add-dev') {
      if (t.value === '') return;
      W.devices.push({ name: t.value === 'x' ? L3('') : clone(DEVICES[+t.value]), model: '', serial: '', calib: '', valid: '' });
      dirty = true;
      draw();
      return;
    }
    if (t.dataset.assign) {
      const [kind, rest] = [t.dataset.assign.split(':')[0], t.dataset.assign.slice(t.dataset.assign.indexOf(':') + 1)];
      if (kind === 'photo') assign(W.photos[+rest].file, t.value, +rest);
      else assign(rest, t.value, null);
      return;
    }
    studioInput(e);
    if (t.tagName === 'SELECT' && /^meas\.\w+\.status$/.test(t.dataset.k || '')) draw();
  }

  /* ─── Olaylar ───────────────────────────────────────────── */
  function bind() {
    const mb = $('lvdMeta');
    mb.addEventListener('input', (e) => { const i = e.target; if (i.dataset.lmb) i.classList.toggle('dirty', (i.dataset.lmb === 'reportDate' ? i.value : i.value.trim()) !== mbCur(i.dataset.lmb)); });
    mb.addEventListener('change', (e) => { if (e.target.dataset.lmb) commitMeta(e.target); });
    mb.addEventListener('keydown', (e) => {
      if (!e.target.dataset.lmb) return;
      if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
      if (e.key === 'Escape') { e.target.value = mbCur(e.target.dataset.lmb); e.target.classList.remove('dirty'); e.target.blur(); }
    });
    $('lvdBack').onclick = closeAll;
    $('lvdRefresh').onclick = async () => { try { await store.refresh(true); } catch (e) { /* yok */ } await openList(); toast('LVD raporları yeniden okundu'); };
    $('lvdNew').onclick = () => newDialog('');
    $('lvdCards').addEventListener('click', (e) => { const c = e.target.closest('[data-lvd]'); if (c) openReport(c.dataset.lvd); });
    $('lvdHome').onclick = () => openList();
    $('lvdClose').onclick = closeAll;
    $('lvdEdit').onclick = () => openStudio();
    $('lvdImport').onclick = async () => { try { await importFromRA(); } catch (x) { toast(`Aktarılamadı: ${x.message}`, true); } };
    $('lvdReload').onclick = reload;
    $('lvdPdf').onclick = openPdfDialog;
    $('lvdLang').addEventListener('click', (e) => { const b = e.target.closest('[data-lang]'); if (b && S.m) { S.lang = b.dataset.lang; saveUI(); renderDoc(true); } });
    $('lvdZoom').addEventListener('click', (e) => { const b = e.target.closest('[data-z]'); if (!b) return; if (b.dataset.z === 'fit') setZoom('fit'); else stepZoom(b.dataset.z === '+' ? 1 : -1); });
    $('lvdWrap').addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey) || !S.m) return;
      e.preventDefault();
      setZoom(+Math.min(4, Math.max(0.25, curZoom() * Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.06 : 0.002)))).toFixed(3));
    }, { passive: false });
    window.addEventListener('resize', () => { if (S.view === 'view' && S.zoom === 'fit' && S.m) applyZoom(); });
    document.querySelectorAll('[data-lvl]').forEach((b) => b.addEventListener('click', () => { document.querySelectorAll('[data-lvl]').forEach((x) => x.classList.toggle('active', x === b)); $('lvdToc').classList.toggle('hidden', b.dataset.lvl !== 'toc'); $('lvdFiles').classList.toggle('hidden', b.dataset.lvl !== 'files'); }));
    document.querySelectorAll('[data-lvr]').forEach((b) => b.addEventListener('click', () => { document.querySelectorAll('[data-lvr]').forEach((x) => x.classList.toggle('active', x === b)); $('lvdSum').classList.toggle('hidden', b.dataset.lvr !== 'sum'); $('lvdChecks').classList.toggle('hidden', b.dataset.lvr !== 'checks'); }));
    $('lvdToc').addEventListener('click', (e) => { const t = e.target.closest('[data-page]'); if (t) scrollToPage(+t.dataset.page); });
    $('lvdDocSwitch').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.act === 'open-ra') openRA(); else if (b.dataset.lvdOpen) openReport(b.dataset.lvdOpen); });
    $('lvdDoc').addEventListener('click', (e) => { if (e.target.closest('[data-open-ra]')) { openRA(); return; } const a = e.target.closest("a[href^='#']"); if (!a) return; e.preventDefault(); const n = $('lvdDoc').querySelector(a.getAttribute('href')); const pg = n && n.closest('.page'); if (pg) scrollToPage(+pg.dataset.page); });
    const acts = (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'import') $('lvdImport').click();
      else if (a.dataset.act === 'open-ra') openRA();
      else if (a.dataset.act === 'edit') openStudio('genel');
      else if (a.dataset.act === 'delete') deleteDialog();
    };
    $('lvdBanner').addEventListener('click', acts);
    $('lvdSum').addEventListener('click', acts);
    $('lvdFiles').addEventListener('click', acts);
    const st = $('lvdStudio');
    st.addEventListener('input', (e) => { if (e.target.tagName !== 'SELECT' && !e.target.dataset.up) studioInput(e); });
    st.addEventListener('change', studioChange);
    st.addEventListener('click', studioClick);
    // Kısayollar LVD açıkken risk analizine gitmez: Ctrl+P → LVD PDF, Ctrl +/−/0 → LVD yakınlaştırma, Esc → pencereyi kapat
    window.addEventListener('keydown', (e) => {
      if ($('lvd').classList.contains('hidden')) return;
      const studioOpen = !$('lvdStudio').classList.contains('hidden');
      const modalOpen = !!document.querySelector('.modal-overlay');
      if (e.key === 'Escape' && studioOpen && !modalOpen) { e.stopImmediatePropagation(); closeStudio(); return; }
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = e.key || '';
      const c = e.code || '';
      if (k.toLowerCase() === 'p') { e.preventDefault(); e.stopImmediatePropagation(); if (S.view === 'view' && S.m && !studioOpen && !modalOpen) openPdfDialog(); return; }
      let act = null;
      if (k === '+' || k === '=' || c === 'NumpadAdd') act = 1;
      else if (k === '-' || k === '_' || c === 'NumpadSubtract') act = -1;
      else if (k === '0' || c === 'Numpad0') act = 0;
      if (act === null) return;
      e.stopImmediatePropagation();
      if (S.view === 'view' && S.m && !studioOpen && !modalOpen) { e.preventDefault(); if (act === 0) setZoom('fit'); else stepZoom(act); }
    }, true);
  }

  /* ─── Başlangıç ─────────────────────────────────────────── */
  function init() {
    inject();
    // Depo bağlandıktan sonra LVD sayısı ana ekrana yazılır; ?lvd=<klasör> ile doğrudan açılır (test ve bağlantı için)
    const want = new URLSearchParams(location.search).get('lvd');
    let tries = 0;
    const t = setInterval(async () => {
      tries += 1;
      if (!store.ready) { if (tries > 600) clearInterval(t); return; }
      clearInterval(t);
      try { await scanList(); } catch (e) { /* yok */ }
      if (want) { if (want === '1' || want === 'liste') openList(); else openReport(want); }
    }, 300);
  }

  root.RaLvdApp = { openList, openReport, fromRA, openStudio: (t) => openStudio(t), close: closeAll, state: S, exportPdf: (langs, save) => exportPdf(langs, save, () => {}), reload, importFromRA, takeFiles: (files) => takeFiles(files), get work() { return W; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof self !== 'undefined' ? self : this);
