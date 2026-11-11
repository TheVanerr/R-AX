/* Risk Analizi — uygulama denetleyicisi.
   Ana ekran (model seçici kutu + kartlar) → rapor görüntüleyici (A4 sayfalar, içindekiler, özet, kontrol) →
   PDF (doğrudan dosya), kapak stüdyosu, ölçüm stüdyosu (standart model raporları). md dosyaları değişince rapor kendiliğinden yenilenir. */

(function (root) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const { esc, safeName, todayStr, pad2 } = root.RaUtil;
  const store = root.RaStore;
  const LANG_NAMES = { tr: 'Türkçe', en: 'English', de: 'Deutsch' };
  const isMd = (name) => /\.md$/i.test(name) && !/^readme/i.test(name);

  const S = {
    entries: { projects: [], models: [], units: [] },
    entry: null,
    doc: null,
    lang: 'tr',
    zoom: 'fit',
    homeTab: 'projects',
    busy: false,
    imgs: new Map(),      // yol → { url, w, h, sig, png }
    therm: new Map(),     // yol → { sig, data }
    sig: ''
  };
  try { Object.assign(S, JSON.parse(localStorage.getItem('ra-ui') || '{}'), { entries: S.entries, entry: null, doc: null, busy: false, imgs: S.imgs, therm: S.therm, sig: '' }); } catch (e) { /* tarayıcı depolaması kapalı */ }
  const saveUI = () => { try { localStorage.setItem('ra-ui', JSON.stringify({ lang: S.lang, zoom: S.zoom, homeTab: S.homeTab, last: S.entry ? S.entry.path : S.last })); } catch (e) { /* yok */ } };

  /* ─── Küçük yardımcılar ─────────────────────────────────── */
  let toastTimer = null;
  function toast(msg, isError) {
    const t = $('toast');
    t.textContent = msg;
    t.className = `toast${isError ? ' error' : ''}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), isError ? 7000 : 3800);
  }
  function modal(html, onReady, onClose) {
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = `<div class="modal">${html}</div>`;
    $('modalRoot').appendChild(ov);
    const close = () => { if (!ov.isConnected) return; ov.remove(); if (onClose) onClose(); };
    ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
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
  const fmtTime = (ms) => { if (!ms) return ''; const d = new Date(ms); return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  const logo = (path) => (root.RA_LOGOS && root.RA_LOGOS[path]) || path;

  /* ─── Giriş: klasör izni ────────────────────────────────── */
  function gate(html) {
    const g = $('gate');
    g.innerHTML = `<div class="gate-box"><img class="gate-logo" src="${logo('assets/logos/dolfin.png')}" alt="">${html}</div>`;
    g.classList.remove('hidden');
    return g;
  }
  const DEFAULT_REPO = 'TheVanerr/riskanalizix-veri';
  const TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new?name=Risk%20Analizi%20veri&description=riskanalizix-veri%20deposu&contents=write&expires_in=365';
  /**
   * Bağlantı ekranı: GitHub deposu (önerilen) veya bu bilgisayardaki klasör.
   * opts: { error, saved (klasör tutamağı), change (vazgeçilebilir) } → bağlanınca çözülür
   */
  function connectGate(opts) {
    const o = opts || {};
    const st = store.settings();
    const repo = st.repo || DEFAULT_REPO;
    const fsOk = store.supported();
    return new Promise((resolve) => {
      const g = gate(`
        <h1>${o.saved ? 'Klasör izni gerekiyor' : 'Verileriniz nerede dursun?'}</h1>
        ${o.saved ? `<p>Bağlı klasör: <code>${esc(o.saved.name)}</code>. Tarayıcı yeniden açıldığı için izin yenilenmeli.</p>
          <div class="gate-actions"><button type="button" class="btn btn-primary" data-gate="resume">${esc(o.saved.name)} ile devam et</button></div>
          <div class="gate-sep"><span>ya da</span></div>` : ''}
        <h2 class="gate-h2">GitHub deposu <span>önerilen</span></h2>
        <p>Özel bir GitHub deposu veritabanı olur: her bilgisayardan erişilir, her kayıt commit olarak geçmişte durur. P&amp;PX'teki <code>ppx-veri</code> ile aynı yöntem.</p>
        <ol class="gate-steps">
          <li>Depo <b>gizli (Private)</b> olmalı: <a href="https://github.com/${esc(repo)}/settings" target="_blank" rel="noopener">depo ayarları</a> → General → en altta <i>Change repository visibility</i> → Private. (Depo yoksa <a href="https://github.com/new?name=riskanalizix-veri&amp;visibility=private" target="_blank" rel="noopener">yeni gizli depo</a>.)</li>
          <li><a href="${TOKEN_URL}" target="_blank" rel="noopener">Erişim anahtarı oluşturun</a>: ad ve izin hazır gelir; "Repository access" altında <i>Only select repositories</i> → <b>riskanalizix-veri</b> seçin, "Generate token" deyin.</li>
          <li>Anahtarı aşağıya yapıştırın. Yalnız bu tarayıcıda saklanır.</li>
        </ol>
        <form class="gate-form" id="ghForm" autocomplete="off">
          <label for="ghRepo">Depo (kullanıcı/depo)</label>
          <input class="field-input" id="ghRepo" value="${esc(repo)}" spellcheck="false">
          <label for="ghToken">Erişim anahtarı</label>
          <input class="field-input" id="ghToken" type="password" placeholder="github_pat_…" spellcheck="false">
          <div class="gate-actions">
            <button type="submit" class="btn btn-primary">GitHub'a bağlan</button>
            ${!o.saved && fsOk ? '<button type="button" class="btn" data-gate="pick">Bu bilgisayardaki klasörü kullan</button>' : ''}
            ${o.change ? '<button type="button" class="btn" data-gate="cancel">Vazgeç</button>' : ''}
          </div>
        </form>
        <p class="gate-error"${o.error ? '' : ' hidden'}>${o.error ? esc(o.error) : ''}</p>
        <p class="gate-note" hidden></p>`);
      const err = g.querySelector('.gate-error');
      const note = g.querySelector('.gate-note');
      const fail = (m) => { err.textContent = m; err.hidden = false; note.hidden = true; };
      const done = () => { g.classList.add('hidden'); g.onclick = null; resolve(true); };
      g.querySelector('#ghForm').onsubmit = async (e) => {
        e.preventDefault();
        const r = g.querySelector('#ghRepo').value.trim();
        const t = g.querySelector('#ghToken').value.trim() || (store.settings().repo === r ? store.settings().token : '');
        if (!r || !t) { fail('Depo adı ve erişim anahtarı gerekli.'); return; }
        err.hidden = true;
        note.textContent = 'Bağlanılıyor…';
        note.hidden = false;
        try {
          await store.connectGitHub(r, t, st.api);
          done();
        } catch (x) { fail(x.message); }
      };
      g.onclick = async (e) => {
        const a = e.target.dataset && e.target.dataset.gate;
        if (!a) return;
        if (a === 'cancel') { g.classList.add('hidden'); g.onclick = null; resolve(false); return; }
        try {
          if (a === 'resume') await store.resume(o.saved);
          else await store.pick();
          done();
        } catch (x) {
          if (x.name !== 'AbortError') fail(x.message);
        }
      };
    });
  }
  async function connect() {
    const res = await store.auto();
    if (res !== true) {
      if (res.github) await connectGate({ error: res.github.message });
      else await connectGate({ saved: res.saved || null });
    }
    renderConn();
  }
  /** Bağlantı durumu: ana ekrandaki düğme ve alt çubuk */
  function renderConn(s) {
    const st = s || store.status();
    const gh = store.mode === 'github';
    const time = st && st.lastSync ? new Date(st.lastSync).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
    const text = !gh ? (store.mode === 'http' ? 'Yerel sunucu' : `Klasör: ${store.name || ''}`)
      : st && st.state === 'saving' ? `GitHub: ${store.name} · gönderiliyor…`
        : st && st.state === 'error' ? `GitHub: ${store.name} · hata` : `GitHub: ${store.name}${time ? ` · ${time}` : ''}`;
    $('btnFolder').textContent = text;
    $('btnFolder').title = st && st.error ? st.error : 'Bağlantıyı değiştir';
    $('btnFolder').classList.toggle('err', !!(st && st.state === 'error'));
    const save = $('saveInfo');
    if (save) {
      save.textContent = gh ? (st && st.state === 'saving' ? 'Depoya gönderiliyor…' : st && st.state === 'error' ? `Depoya gönderilemedi: ${st.error}` : `Depoda kayıtlı${time ? ` · ${time}` : ''}`) : '';
      save.className = st && st.state === 'error' ? 'err' : '';
    }
  }

  /* ─── Klasör taraması ───────────────────────────────────── */
  async function readMeta(dir) {
    const list = await store.list(dir);
    const md = list.filter((e) => e.kind === 'file' && isMd(e.name));
    if (!md.length) return { empty: true, mtime: 0, md: [] };
    const files = await Promise.all(md.map(async (f) => ({ name: f.name, text: await store.text(`${dir}/${f.name}`) })));
    const pk = root.RaDoc.peek(files);
    return { empty: false, meta: pk.meta, sections: pk.sections, mtime: Math.max(...md.map((f) => f.mtime || 0)), md, dirs: list.filter((e) => e.kind === 'dir').map((e) => e.name) };
  }
  async function scan() {
    const projects = [];
    const models = [];
    const units = [];
    for (const d of (await store.list('projects')).filter((e) => e.kind === 'dir' && !e.name.startsWith('_'))) {
      const path = `projects/${d.name}`;
      const r = await readMeta(path);
      projects.push(Object.assign({ kind: 'proje', path, name: d.name }, r));
    }
    for (const fam of (await store.list('models')).filter((e) => e.kind === 'dir' && !e.name.startsWith('_'))) {
      const famPath = `models/${fam.name}`;
      const subs = (await store.list(famPath)).filter((e) => e.kind === 'dir' && e.name !== 'raporlar' && !e.name.startsWith('_'));
      const dirs = subs.length ? subs.map((s) => ({ path: `${famPath}/${s.name}`, name: s.name })) : [{ path: famPath, name: fam.name }];
      for (const md of dirs) {
        const r = await readMeta(md.path);
        const entry = Object.assign({ kind: 'model', path: md.path, name: md.name, family: fam.name, units: [] }, r);
        if (r.dirs && r.dirs.includes('raporlar')) {
          for (const u of (await store.list(`${md.path}/raporlar`)).filter((e) => e.kind === 'dir')) {
            const up = `${md.path}/raporlar/${u.name}`;
            const ur = await readMeta(up);
            if (ur.empty) continue;
            const unit = Object.assign({ kind: 'birim', path: up, name: u.name, modelPath: md.path, model: entry, frozen: (ur.dirs || []).includes('sablon') }, ur);
            entry.units.push(unit);
            units.push(unit);
          }
          entry.units.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
        }
        models.push(entry);
      }
    }
    S.entries = { projects, models, units };
    return S.entries;
  }
  const allEntries = () => [...S.entries.projects, ...S.entries.models, ...S.entries.units];
  const findEntry = (path) => allEntries().find((e) => e.path === path) || null;
  const entryTitle = (e) => {
    const m = e.meta || {};
    if (e.kind === 'proje') return { main: `${m.job || e.name.split('-')[0]} · ${m.model || ''}`.trim(), sub: `${m.customer || ''}${m.docNo ? ` · ${m.docNo}` : ''}` };
    if (e.kind === 'birim') return { main: `${m.job || e.name} · ${m.customer || ''}`, sub: `${(e.model.meta || {}).model || e.model.name} · ${m.docNo || ''}` };
    return { main: m.model || e.name, sub: `${e.family}${e.empty ? ' · şablon hazırlanmadı' : ` · şablon · ${e.units.length} rapor`}` };
  };

  /* ─── Model seçici kutu ─────────────────────────────────── */
  function combo(host, opts) {
    host.innerHTML = `<svg class="combo-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
      <input class="combo-input" ${opts.id ? `id="${opts.id}"` : ''} placeholder="${esc(opts.placeholder || 'Model veya proje seçin…')}" autocomplete="off" spellcheck="false">
      <button type="button" class="combo-caret" tabindex="-1" aria-label="Listeyi aç">▾</button>
      <div class="combo-list hidden"></div>`;
    const input = host.querySelector('.combo-input');
    const list = host.querySelector('.combo-list');
    let items = [];
    let active = -1;
    const norm = (s) => root.RaMd.norm(s);
    const hl = (text, q) => {
      if (!q) return esc(text);
      const i = norm(text).indexOf(q);
      return i < 0 ? esc(text) : esc(text);
    };
    function build(q) {
      const nq = norm(q);
      const match = (e) => !nq || norm(`${entryTitle(e).main} ${entryTitle(e).sub} ${e.path}`).includes(nq);
      const out = [];
      const P = S.entries.projects.filter(match);
      if (P.length) out.push({ group: 'Projeler' }, ...P.map((e) => ({ e })));
      const M = [];
      for (const m of S.entries.models) {
        const us = m.units.filter(match);
        if (match(m) || us.length) { M.push({ e: m }); us.forEach((u) => M.push({ e: u, unit: true })); }
      }
      if (M.length) out.push({ group: 'Modeller' }, ...M);
      return out;
    }
    function render() {
      const q = input.value.trim();
      items = build(q);
      const cur = S.entry && S.entry.path;
      list.innerHTML = items.length ? items.map((it, i) => {
        if (it.group) return `<div class="combo-group">${it.group}</div>`;
        const e = it.e;
        const t = entryTitle(e);
        const tag = e.kind === 'proje' ? '<span class="ci-tag red">proje</span>' : e.kind === 'birim' ? '<span class="ci-tag green">rapor</span>' : e.empty ? '<span class="ci-tag">boş</span>' : '<span class="ci-tag">şablon</span>';
        return `<div class="combo-item${it.unit ? ' unit' : ''}${e.empty ? ' dim' : ''}${e.path === cur ? ' current' : ''}${i === active ? ' active' : ''}" data-i="${i}"><span class="ci-main">${hl(t.main, q)}</span>${tag}<span class="ci-sub">${esc(t.sub)}</span></div>`;
      }).join('') : '<div class="combo-empty">Eşleşen model veya proje yok</div>';
    }
    const open = () => { render(); list.classList.remove('hidden'); };
    const close = () => { list.classList.add('hidden'); active = -1; };
    const choose = (i) => {
      const it = items[i];
      if (!it || it.group) return;
      close();
      input.value = '';
      input.blur();
      opts.onPick(it.e);
    };
    input.addEventListener('focus', open);
    input.addEventListener('input', () => { active = -1; open(); });
    input.addEventListener('keydown', (e) => {
      const sel = items.map((it, i) => (it.group ? -1 : i)).filter((i) => i >= 0);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (list.classList.contains('hidden')) open();
        const k = sel.indexOf(active);
        active = sel[(k + (e.key === 'ArrowDown' ? 1 : -1) + sel.length) % sel.length];
        render();
        const a = list.querySelector('.combo-item.active');
        if (a) a.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        choose(active >= 0 ? active : sel[0]);
      } else if (e.key === 'Escape') { close(); input.blur(); }
    });
    host.querySelector('.combo-caret').addEventListener('mousedown', (e) => { e.preventDefault(); if (list.classList.contains('hidden')) { input.focus(); open(); } else close(); });
    list.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const it = e.target.closest('.combo-item');
      if (it) choose(+it.dataset.i);
    });
    input.addEventListener('blur', () => setTimeout(close, 120));
    return { refresh: () => { if (!list.classList.contains('hidden')) render(); }, setPlaceholder: (t) => { input.placeholder = t; } };
  }

  /* ─── Ana ekran ─────────────────────────────────────────── */
  let homeCombo = null;
  let topCombo = null;
  function chipsFor(e) {
    const m = e.meta || {};
    const s = e.sections || {};
    const c = [];
    if (m.rev) c.push(`<span class="pc-chip">Rev ${esc(m.rev)}</span>`);
    c.push(m.status === 'final' ? '<span class="pc-chip ok">Yayın</span>' : '<span class="pc-chip">Taslak</span>');
    if (m.langs) c.push(`<span class="pc-chip dark">${m.langs.map((l) => l.toUpperCase()).join(' ')}</span>`);
    if (s.elektrik) c.push('<span class="pc-chip has">LVD</span>');
    if (s.gurultu) c.push('<span class="pc-chip has">Gürültü</span>');
    if (s.termografi) c.push('<span class="pc-chip has">Termal</span>');
    return c.join('');
  }
  function renderHome() {
    const { projects, models } = S.entries;
    $('countProjects').textContent = projects.length;
    $('countModels').textContent = models.length;
    document.querySelectorAll('.home-tab').forEach((t) => t.classList.toggle('active', t.dataset.homeTab === S.homeTab));
    renderConn();
    const list = $('homeList');
    if (store.empty) {
      list.innerHTML = `<div class="home-empty"><b>GitHub deposu boş.</b> Mevcut projeler ve modeller depoya gönderildiğinde burada görünür. Gönderimi Claude yapar ("verileri depoya gönder" deyin); yeni proje de bu ekrandan açılabilir.</div>`;
      return;
    }
    if (S.homeTab === 'projects') {
      list.innerHTML = projects.length ? projects.slice().sort((a, b) => (b.mtime || 0) - (a.mtime || 0)).map((e) => {
        const m = e.meta || {};
        if (e.empty) return `<button type="button" class="project-card empty" data-open="${esc(e.path)}"><span class="pc-bar"></span><div class="pc-no">${esc(e.name)}</div><div class="pc-customer">md dosyası yok — proje henüz yazılmadı</div></button>`;
        return `<button type="button" class="project-card" data-open="${esc(e.path)}"><span class="pc-bar"></span>
          <div class="pc-no">${esc(m.job || e.name)}</div><div class="pc-model">${esc(m.model || '')}</div><div class="pc-customer">${esc(m.customer || '')}</div>
          <div class="pc-chips">${chipsFor(e)}</div>
          <div class="pc-meta">${esc(m.docNo || '')} · ${esc(m.reportDate || '')} · değişiklik ${esc(fmtTime(e.mtime))}</div></button>`;
      }).join('') : '<div class="home-empty">projects klasöründe proje yok. "+ Yeni proje" ile iskelet oluşturun ya da verileri Claude\'a verin.</div>';
    } else {
      const fams = [...new Set(models.map((m) => m.family))];
      list.innerHTML = fams.map((f) => `<div class="list-head">${esc(f)}<span></span></div>${models.filter((m) => m.family === f).map((e) => {
        const m = e.meta || {};
        const units = e.units.slice(0, 4).map((u) => `<div class="pc-unit" data-open="${esc(u.path)}"><span><b>${esc((u.meta || {}).job || u.name)}</b> · ${esc((u.meta || {}).customer || '')}</span><span>${(u.meta || {}).status === 'final' ? '<i class="ok">yayın</i> ' : ''}${esc((u.meta || {}).reportDate || '')}</span></div>`).join('');
        return `<div class="project-card${e.empty ? ' empty' : ''}" data-open="${esc(e.path)}" role="button" tabindex="0"><span class="pc-bar"></span>
          <div class="pc-no">${esc(m.model || e.name)}</div><div class="pc-customer">${e.empty ? 'Şablon hazırlanmadı — model bilgilerini Claude\'a verin' : `Model şablonu · ${e.units.length} makine raporu`}</div>
          ${e.empty ? '' : `<div class="pc-chips"><span class="pc-chip dark">şablon rev ${esc(m.templateRev || '00')}</span>${chipsFor(e)}</div>`}
          ${units ? `<div class="pc-units">${units}</div>` : ''}
          ${e.empty ? '' : `<div class="pc-actions"><span class="pc-new" data-newunit="${esc(e.path)}">+ Yeni makine raporu</span>${e.units.length > 4 ? `<span class="pc-more">+${e.units.length - 4} rapor daha (üstteki kutudan arayın)</span>` : ''}</div>`}</div>`;
      }).join('')}`).join('') || '<div class="home-empty">models klasöründe model yok.</div>';
    }
  }
  function showHome() {
    stopWatch();
    S.entry = null;
    S.doc = null;
    $('app').classList.add('hidden');
    $('home').classList.remove('hidden');
    renderHome();
    saveUI();
  }

  /* ─── Belge yükleme ─────────────────────────────────────── */
  // Rapor, fotoğraflar inmeden çizilir; inmemiş fotoğrafın yerinde gri yer tutucu durur, inince yerine oturur.
  const PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='4' height='3'><rect width='4' height='3' fill='%23e9edf3'/></svg>";
  const pendingImgs = new Set();
  let streaming = null;
  /** Görsel: blob URL; boyutu yalnız gerektiğinde (panel, tehlike noktaları) çözülür */
  async function loadImage(path, sig, needSize) {
    let rec = S.imgs.get(path);
    if (!rec || rec.sig !== sig) {
      if (rec) URL.revokeObjectURL(rec.url);
      const file = await store.read(path);
      rec = { url: URL.createObjectURL(file), file, w: 4, h: 3, sized: false, sig, png: /png|gif|webp/i.test(file.type) };
      S.imgs.set(path, rec);
    }
    if (needSize && !rec.sized) {
      try { const bmp = await createImageBitmap(rec.file); rec.w = bmp.width; rec.h = bmp.height; bmp.close(); } catch (e) { /* bozuk görsel */ }
      rec.sized = true;
    }
    return rec;
  }
  /** Bekleyen fotoğrafları indirir ve sayfadaki yer tutucuların yerine koyar */
  function streamImages() {
    if (streaming) return streaming;
    streaming = (async () => {
      const total = () => pendingImgs.size + done;
      let done = 0;
      while (pendingImgs.size) {
        const batch = [...pendingImgs];
        await Promise.all(batch.map(async (pth) => {
          try {
            const rec = await loadImage(pth, S.fileSig[pth]);
            const enc = encodeURIComponent(pth);
            document.querySelectorAll(`img[src$="#ra=${enc}"]`).forEach((im) => { im.src = rec.url; });
          } catch (e) { /* bozuk veya silinmiş dosya: yer tutucu kalır */ }
          pendingImgs.delete(pth);
          done += 1;
          $('loadInfo').textContent = pendingImgs.size ? `fotoğraflar ${done} / ${total()}` : '';
        }));
      }
      $('loadInfo').textContent = '';
    })().finally(() => { streaming = null; });
    return streaming;
  }
  /** PDF ve ölçüm penceresi öncesi: belgedeki tüm fotoğraflar hazır olsun */
  async function ensureImages(paths) {
    const list = (paths || (S.doc && S.doc.imagePaths) || []).filter((x) => S.fileSig[x] !== undefined);
    await Promise.all(list.map((pth) => loadImage(pth, S.fileSig[pth]).catch(() => null)));
  }
  async function loadThermal(t, sig) {
    const c = S.therm.get(t.file);
    let data = c && c.sig === sig ? c.data : null;
    if (!data) {
      const bytes = new Uint8Array(await (await store.read(t.file)).arrayBuffer());
      const r = root.RaThermal.parseBMT(bytes);
      data = { w: r.w, h: r.h, T: root.RaThermal.tempsOf(r), eps: r.eps, rtc: r.rtc, amb: r.amb, device: r.device, serial: r.serial, fw: r.firmware, fov: r.fov, range: r.range, time: root.RaThermal.bmtTime(t.file.split('/').pop(), r.stamp), vis: null };
      if (r.vis) {
        const sz = root.RaThermal.jpegSize(r.vis) || { w: 3, h: 4 };
        data.vis = { src: URL.createObjectURL(new Blob([r.vis], { type: 'image/jpeg' })), w: sz.w, h: sz.h };
      }
      if (c && c.data.vis) URL.revokeObjectURL(c.data.vis.src);
      S.therm.set(t.file, { sig, data });
    }
    Object.assign(t, { w: data.w, h: data.h, T: data.T, eps: data.eps, rtc: data.rtc, amb: data.amb, device: data.device, serial: data.serial, fw: data.fw, fov: data.fov, range: data.range, date: data.time.date, time: data.time.time, _vis: data.vis });
    if (!t.markers) t.markers = root.RaThermal.defaultMarkers();
  }
  /** Makine raporunun şablon klasörü: yayınlanmışsa kendi dondurulmuş kopyası (sablon/), değilse modelin güncel şablonu */
  async function docDirs(entry) {
    if (entry.kind !== 'birim') return [{ dir: entry.path, skip: ['raporlar'] }];
    const frozen = await store.exists(`${entry.path}/sablon`);
    entry.frozen = frozen;
    return [{ dir: frozen ? `${entry.path}/sablon` : entry.modelPath, skip: ['raporlar'] }, { dir: entry.path, skip: ['raporlar', 'sablon'] }];
  }
  async function readSources(entry) {
    const sources = [];
    for (const { dir, skip } of await docDirs(entry)) {
      const list = await store.list(dir);
      const md = list.filter((e) => e.kind === 'file' && isMd(e.name));
      const [files, walked] = await Promise.all([
        Promise.all(md.map(async (f) => ({ name: f.name, text: await store.text(`${dir}/${f.name}`) }))),
        store.walk(dir, skip)
      ]);
      sources.push({ dir, files, list: walked.files, meta: walked.meta, sig: `${md.map((f) => `${f.name}:${f.sig}`).join('|')}#${walked.sig}` });
    }
    return sources;
  }
  /** Belgenin dosya imzası: md ve alt klasör dosyalarının kimlikleri (metin okunmaz) */
  async function readSig(entry) {
    const parts = [];
    for (const { dir, skip } of await docDirs(entry)) {
      const md = (await store.list(dir)).filter((e) => e.kind === 'file' && isMd(e.name));
      const walked = await store.walk(dir, skip);
      parts.push(`${md.map((f) => `${f.name}:${f.sig}`).join('|')}#${walked.sig}`);
    }
    return parts.join('||');
  }
  async function buildDoc(entry) {
    const sources = await readSources(entry);
    const raw = root.RaDoc.build(sources);
    const fileSig = Object.assign({}, ...sources.map((s) => s.meta));
    S.fileSig = fileSig;
    const known = new Set(sources.flatMap((s) => s.list));
    const paths = new Set();
    raw.photos.forEach((x) => paths.add(x.file));
    for (const k of ['rpe', 'iso', 'hv']) raw.elec[k].forEach((r) => r.photo && paths.add(r.photo));
    (raw.noise.rows || []).forEach((r) => r.photo && paths.add(r.photo));
    [raw.meta.coverPhoto, raw.meta.panelPhoto, raw.meta.pointsPhoto].forEach((x) => x && paths.add(x));
    // Termal dosyalar (kurallar için gerekli) ve boyutu yerleşimi belirleyen fotoğraflar birlikte, paralel iner; geri kalanı rapor çizildikten sonra
    const sized = [raw.meta.panelPhoto, raw.meta.pointsPhoto].filter((x) => x && known.has(x));
    await Promise.all([
      ...raw.thermal.images.map((t) => loadThermal(t, fileSig[t.file]).catch((e) => { t.error = e.message; })),
      ...sized.map((pth) => loadImage(pth, fileSig[pth], true).catch(() => null)),
      raw.meta.coverPhoto && known.has(raw.meta.coverPhoto) ? loadImage(raw.meta.coverPhoto, fileSig[raw.meta.coverPhoto]).catch(() => null) : null
    ]);
    const ev = root.RaRules.evaluate(raw, { exists: (f) => known.has(f) });
    const p = root.RaRules.apply(raw, ev);
    return { raw, p, ev, sources, imagePaths: [...paths].filter((x) => known.has(x)), sig: sources.map((s) => s.sig).join('||') };
  }
  const ctx = {
    img: (path) => {
      if (!path) return '';
      const r = S.imgs.get(path);
      if (r && r.sig === S.fileSig[path]) return r.url;
      if (S.fileSig[path] === undefined) return r ? r.url : '';
      pendingImgs.add(path);
      return `${PLACEHOLDER}#ra=${encodeURIComponent(path)}`;
    },
    size: (path) => { const r = S.imgs.get(path); return r ? { w: r.w, h: r.h } : { w: 4, h: 3 }; },
    thermo: (t) => root.RaThermal.imageSrc(t),
    vis: (t) => t._vis || null,
    scaleImg: () => root.RaThermal.scaleImg(),
    logo
  };

  /* ─── Görüntüleyici ─────────────────────────────────────── */
  function msg(html, spin) {
    const m = $('canvasMsg');
    if (!html) { m.classList.add('hidden'); return; }
    m.innerHTML = `${spin ? '<div class="spin"></div>' : ''}<div>${html}</div>`;
    m.classList.remove('hidden');
  }
  async function openEntry(entry) {
    if (!entry) return;
    S.entry = entry;
    saveUI();
    $('home').classList.add('hidden');
    $('app').classList.remove('hidden');
    $('doc').replaceChildren();
    $('leftToc').innerHTML = '';
    $('rightSum').innerHTML = '';
    $('rightChecks').innerHTML = '';
    const t = entryTitle(entry);
    $('docTitle').textContent = t.main;
    $('docState').textContent = t.sub;
    $('docState').className = '';
    $('pathInfo').textContent = entry.path;
    $('btnMeasure').classList.toggle('hidden', entry.kind !== 'birim');
    $('btnNewUnit').classList.toggle('hidden', entry.kind !== 'model' && entry.kind !== 'birim');
    $('btnNewUnit').classList.toggle('btn-primary', entry.kind === 'model');
    $('btnMeasure').classList.toggle('btn-primary', entry.kind === 'birim');
    $('docBanner').classList.add('hidden');
    $('zoomFloat').classList.add('hidden');
    $('app').classList.toggle('no-meta', entry.kind === 'model' || !!entry.empty);
    mbInputs().forEach((i) => i.classList.remove('dirty'));
    $('mbState').textContent = '';
    $('btnPdf').disabled = !!entry.empty;
    $('btnCover').disabled = !!entry.empty;
    if (entry.empty) {
      stopWatch();
      S.doc = null;
      renderLangSeg(['tr']);
      msg(entry.kind === 'model'
        ? `<b>${esc(entry.name)}</b> için risk analizi şablonu henüz yazılmadı.<br><br>Model bilgilerini (makine tanımı, fotoğraflar, elektrik şeması, emniyet devreleri) Claude'a verin; şablon <code>${esc(entry.path)}</code> klasörüne md olarak yazılır.<br>Şablon hazır olduktan sonra her makine için yalnız ölçümler girilir ve rapor otomatik çıkar.`
        : `<b>${esc(entry.name)}</b> klasöründe md dosyası yok. Verileri Claude'a verin; rapor bu klasöre yazılır.`);
      return;
    }
    msg('Rapor hazırlanıyor…', true);
    try {
      await root.RaPdfDom.loadFonts();
      S.doc = await buildDoc(entry);
      S.sig = S.doc.sig;
      if (!S.doc.p.meta.langs.includes(S.lang)) S.lang = S.doc.p.meta.langs[0];
      renderAll();
      msg(null);
      startWatch();
    } catch (e) {
      console.error(e);
      msg(`Rapor oluşturulamadı: ${esc(e.message)}`);
    }
  }
  /** Belgenin türüne göre üst bilgi şeridi: şablon / taslak makine raporu / yayınlanmış (dondurulmuş) rapor */
  function renderBanner() {
    const b = $('docBanner');
    const e = S.entry;
    const d = S.doc;
    if (!e || !d || e.kind === 'proje') { b.classList.add('hidden'); return; }
    const m = d.p.meta;
    const live = e.kind === 'birim' ? ((e.model && e.model.meta) || {}).templateRev || '00' : m.templateRev || '00';
    if (e.kind === 'model') {
      b.innerHTML = `<b>Model şablonu</b> · şablon rev ${esc(m.templateRev || '00')} — Bu raporu doğrudan vermeyin: her makine için <button type="button" class="link" data-act="newunit">+ Yeni makine raporu</button> açın, Ölçümler'de LVD, gürültü ve termal değerlerini ve fotoğrafları girin; o makinenin risk analizi kurallarla oluşur. Şablondaki değişiklikler taslak makine raporlarına kendiliğinden yansır, yayınlanmış raporlar değişmez.`;
    } else if (e.frozen) {
      const newer = m.templateRev && live !== m.templateRev;
      b.innerHTML = `<b>Yayınlandı</b> · şablon rev ${esc(m.templateRev || '00')} ile donduruldu — şablondaki sonraki değişiklikler bu raporu değiştirmez.${newer ? ` <span class="warn">Şablonun güncel revizyonu: rev ${esc(live)}.</span>` : ''} <button type="button" class="link" data-act="renew">Güncel şablonla yeni revizyon aç</button>`;
    } else {
      b.innerHTML = `<b>Makine raporu (taslak)</b> · ${esc(((e.model && e.model.meta) || {}).model || '')} şablonu rev ${esc(live)} (canlı) — <button type="button" class="link" data-act="measure">Ölçümler</button>'den değerleri ve fotoğrafları girin. Rapor bitince <button type="button" class="link" data-act="publish">Yayınla</button>: rapor o anki şablonla dondurulur.`;
    }
    b.classList.remove('hidden');
  }
  /** Yayınla: şablonun bugünkü hâli makine klasörüne (sablon/) kopyalanır, durum yayın olur */
  function publishDialog() {
    const e = S.entry;
    if (!S.doc || !e || e.kind !== 'birim' || e.frozen) return;
    const m = origMeta();
    const live = ((e.model && e.model.meta) || {}).templateRev || '00';
    // Kontrol listesindeki hata ve uyarılar (eksik ölçümler dahil) yayından önce gösterilir
    const issues = S.doc.ev.checks.filter((c) => c.level === 'error' || c.level === 'warn').sort((a, b) => (a.level === 'error' ? 0 : 1) - (b.level === 'error' ? 0 : 1));
    const warnBox = issues.length ? `<div class="pb-warn"><b>Yayından önce bakın:</b><ul>${issues.slice(0, 10).map((c) => `<li class="${c.level === 'error' ? 'err' : ''}">${esc(c.msg)}</li>`).join('')}${issues.length > 10 ? `<li>… ${issues.length - 10} madde daha (sağdaki Kontrol sekmesi)</li>` : ''}</ul></div>` : '';
    modal(`<h2>Raporu yayınla — ${esc(m.job)}</h2>
      <p>Şablonun bugünkü hâli (<b>${esc((e.model.meta || {}).model || e.model.name)} şablon rev ${esc(live)}</b>) bu makinenin klasörüne kopyalanır ve rapor dondurulur: şablonda sonradan yapılan değişiklikler bu raporu değiştirmez. Kapaktaki damga YAYINLANDI olur.</p>${warnBox}
      <div class="field-row"><div class="field"><label>Rapor revizyonu</label><input class="field-input" value="Rev ${esc(m.rev || '00')}" disabled title="Rev üstteki çubuktan değiştirilir (revizyon tablosuna satır eklenir)"></div><div class="field"><label>Yayın tarihi</label><input class="field-input" type="date" id="pbDate" value="${isoDate(m.reportDate) || isoDate(todayStr())}"></div></div>
      <div class="modal-actions"><button type="button" class="btn" data-x>Vazgeç</button><button type="button" class="btn btn-primary" id="pbGo">${warnBox ? 'Yine de yayınla' : 'Yayınla'}</button></div>`, (box, close) => {
      box.querySelector('[data-x]').onclick = close;
      box.querySelector('#pbGo').onclick = async () => {
        box.querySelector('#pbGo').disabled = true;
        const date = trDate(box.querySelector('#pbDate').value) || m.reportDate || todayStr();
        try {
          await freezeTemplate(e, { durum: 'yayın', tarih: date, 'sablon rev': live }, { set: { rev: m.rev, date } });
          close();
          toast(`Rapor yayınlandı; şablon rev ${live} ile donduruldu`);
        } catch (x) { toast(`Yayınlanamadı: ${x.message}`, true); box.querySelector('#pbGo').disabled = false; }
      };
    });
  }
  /** Şablon dosyalarını (md, fotoğraflar) makine klasörüne kopyalar ve ön bilgiyi günceller — tek commit */
  async function freezeTemplate(e, front, rev) {
    const files = (await store.walk(e.modelPath, ['raporlar'])).files.filter((f) => !/\/README\.md$/i.test(f));
    const ops = [];
    if (await store.exists(`${e.path}/sablon`)) ops.push(store.remove(`${e.path}/sablon`));
    for (const f of files) ops.push(store.copy(f, `${e.path}/sablon/${f.slice(e.modelPath.length + 1)}`));
    ops.push(writeDocMd(e, Object.entries(front), rev));
    await Promise.all(ops);
    await reload();
  }
  /** Yayınlanmış rapordan yeni revizyon: dondurulmuş kopya silinir, rapor güncel şablona döner (taslak); revizyon tablosuna satır eklenir */
  function renewDialog(presetRev) {
    const e = S.entry;
    if (!S.doc || !e || !e.frozen) return Promise.resolve(false);
    const m = origMeta();
    const next = presetRev || String((parseInt(m.rev, 10) || 0) + 1).padStart(2, '0');
    let done = false;
    let resolveFn = null;
    const result = new Promise((r) => { resolveFn = r; });
    const finish = (v) => { if (!done) { done = true; resolveFn(v); } };
    const live = ((e.model && e.model.meta) || {}).templateRev || '00';
    const langs = S.doc.p.meta.langs;
    modal(`<h2>Güncel şablonla yeni revizyon</h2>
      <p>Bu makine raporu güncel şablona (<b>rev ${esc(live)}</b>) bağlanır ve taslak olur. Ölçümler ve fotoğraflar korunur; revizyon tablosuna yeni satır eklenir. Kontrol edip yeniden <b>Yayınla</b> deyin. Önceki revizyonun PDF'ini <code>cikti/</code> klasörüne kaydettiyseniz orada kalır; yeni PDF'in adı yeni revizyon numarasını taşır.</p>
      <div class="field-row"><div class="field"><label>Yeni rapor revizyonu</label><input class="field-input" id="rnRev" value="${next}"></div><div class="field"><label>Rapor tarihi</label><input class="field-input" type="date" id="rnDate" value="${isoDate(todayStr())}"></div></div>
      ${descFields('rn', langs, `Şablon rev ${live} ile güncellendi`)}
      <div class="modal-actions"><button type="button" class="btn" data-x>Vazgeç</button><button type="button" class="btn btn-primary" id="rnGo">Yeni revizyon aç</button></div>`, (box, close) => {
      box.querySelector('[data-x]').onclick = close;
      box.querySelector('#rnGo').onclick = async () => {
        const rev = box.querySelector('#rnRev').value.trim() || next;
        const date = trDate(box.querySelector('#rnDate').value) || todayStr();
        const base = root.RaDoc.syncRevisions(S.doc.p._revBase || [], m);
        box.querySelector('#rnGo').disabled = true;
        try {
          await Promise.all([
            store.remove(`${e.path}/sablon`),
            writeDocMd(e, [['durum', 'taslak'], ['rev', rev], ['tarih', date], ['sablon rev', live]], { add: [{ rev, date, desc: readDesc(box, 'rn', langs), by: (m.approvals || {}).prepared || '', approvedBy: (m.approvals || {}).approved || '' }], base })
          ]);
          await reload();
          finish(true);
          close();
          toast(`Rev ${rev} açıldı: rapor güncel şablona bağlandı (taslak)`);
        } catch (x) { toast(x.message, true); box.querySelector('#rnGo').disabled = false; }
      };
    }, () => finish(false));
    return result;
  }
  /** Revizyon açıklaması alanları (raporun dilleri) */
  const descFields = (id, langs, trDefault) => langs.map((l) => `<div class="field"><label>Değişiklik açıklaması — ${LANG_NAMES[l]}</label><input class="field-input" id="${id}Desc-${l}" value="${l === 'tr' && trDefault ? esc(trDefault) : ''}" placeholder="${l === 'tr' ? 'ör. Elektrik testleri yenilendi' : 'boş bırakılırsa Türkçe metin gösterilir'}"></div>`).join('');
  function readDesc(box, id, langs) {
    const d = {};
    for (const l of langs) { const v = box.querySelector(`#${id}Desc-${l}`).value.trim(); if (v) d[l] = v; }
    if (!d.tr) d.tr = '[Revizyon açıklaması]';
    return d;
  }

  /**
   * Belgenin md dosyalarına yazar. Ön bilgi alanı hangi dosyada tanımlıysa orada, yoksa ana dosyada
   * (makine raporunda rapor.md, projede ön bilgili ilk md) güncellenir; revizyon tablosu "# Revizyonlar"
   * bölümü hangi dosyadaysa orada. Makine raporunda yalnız kendi klasörüne yazılır, şablona dokunulmaz.
   * pairs: [[alan, değer]] (değer boşsa satır silinir) · rev: RaDoc.editRevisions seçenekleri
   */
  async function writeDocMd(e, pairs, rev) {
    const dir = e.path;
    const md = (await store.list(dir)).filter((x) => x.kind === 'file' && isMd(x.name)).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    const texts = new Map(await Promise.all(md.map(async (f) => [f.name, await store.text(`${dir}/${f.name}`)])));
    const parsed = new Map([...texts].map(([n, t]) => [n, root.RaMd.parse(t)]));
    const hasFront = (n) => /^﻿?---\s*$/.test((texts.get(n) || '').split(/\r?\n/)[0]);
    const main = e.kind === 'birim' ? 'rapor.md' : (md.find((f) => hasFront(f.name)) || md[0] || { name: 'rapor.md' }).name;
    const out = new Map();
    const cur = (n) => (out.has(n) ? out.get(n) : texts.get(n) || '');
    const groups = new Map();
    for (const [k, v] of pairs || []) {
      const keys = (root.RaDoc.FRONT[k] || [k]).map(root.RaMd.norm);
      const owner = md.find((f) => parsed.get(f.name).frontKeys.some((x) => keys.includes(x.key)));
      const n = owner ? owner.name : main;
      if (!groups.has(n)) groups.set(n, []);
      groups.get(n).push([k, v]);
    }
    for (const [n, ps] of groups) out.set(n, root.RaDoc.setFront(cur(n), ps));
    if (rev) {
      const owner = md.find((f) => parsed.get(f.name).sections.some((sec) => root.RaDoc.sectionKey(sec.title) === 'revizyonlar'));
      const n = owner ? owner.name : main;
      out.set(n, root.RaDoc.editRevisions(cur(n), Object.assign({ langs: (S.doc && S.doc.p.meta.langs) || ['tr', 'en', 'de'] }, rev)));
    }
    const changed = [...out].filter(([n, t]) => t !== texts.get(n));
    await Promise.all(changed.map(([n, t]) => store.write(`${dir}/${n}`, t)));
    return changed.length;
  }

  /* ─── Rapor silme ───────────────────────────────────────── */
  // GitHub'daki depo silme gibi: raporun tam adı ("TheVanerr/0426998-DENEME LTD") harfi harfine yazılmadan düğme açılmaz.
  // Yalnız proje (projects/<ad>) ve makine raporu (models/…/raporlar/<ad>) silinir; model şablonu uygulamadan silinmez.
  const canDelete = (e) => !!e && ((e.kind === 'proje' && /^projects\/[^/]+$/.test(e.path)) || (e.kind === 'birim' && /^models\/.+\/raporlar\/[^/]+$/.test(e.path)));
  const fmtSize = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
  async function filesUnder(dir) {
    const out = [];
    for (const it of await store.list(dir)) {
      if (it.kind === 'dir') out.push(...(await filesUnder(`${dir}/${it.name}`)));
      else out.push({ path: `${dir}/${it.name}`, size: it.size || 0 });
    }
    return out;
  }
  /** target: silinecek proje / makine raporu (verilmezse açık olan); model sayfasındaki listeden de çağrılır */
  async function deleteDialog(target) {
    const e = target || S.entry;
    if (!canDelete(e)) return;
    const isOpen = !!S.entry && S.entry.path === e.path;
    const owner = store.mode === 'github' ? String(store.name || '').split('/')[0] : 'R&AX';
    const phrase = `${owner}/${e.name}`;
    let files = [];
    try { files = await filesUnder(e.path); } catch (x) { files = []; }
    const size = files.reduce((n, f) => n + f.size, 0);
    // Ne silineceği türlere göre: "1 md · 12 fotoğraf · 2 termal · 1 PDF"
    const kinds = [['md', /\.md$/i], ['fotoğraf', /\.(jpe?g|png|webp|gif)$/i], ['termal (.bmt)', /\.bmt$/i], ['PDF', /\.pdf$/i]];
    const counts = kinds.map(([label, re]) => [label, files.filter((f) => re.test(f.path)).length]);
    const other = files.length - counts.reduce((n, [, c]) => n + c, 0);
    const detail = counts.filter(([, c]) => c).map(([l, c]) => `${c} ${l}`).concat(other ? [`${other} diğer`] : []).join(' · ');
    const m = isOpen && S.doc ? origMeta() : e.meta || {};
    const gh = store.mode === 'github';
    const what = e.kind === 'birim' ? `${esc((e.model.meta || {}).model || e.model.name)} makine raporu` : 'proje';
    modal(`<h2 class="danger">Raporu sil</h2>
      <p><b>${esc(m.docNo || e.name)}</b>${m.customer ? ` · ${esc(m.customer)}` : ''} — ${what}${m.status === 'final' ? ` · <b>yayınlanmış (Rev ${esc(m.rev || '00')})</b>` : ''}</p>
      <div class="del-warn"><b>${files.length} dosya</b> (${fmtSize(size)}) silinir${detail ? `: ${detail}` : ''}${e.frozen ? ' (dondurulmuş şablon kopyası dahil)' : ''}.<br>Klasör: <code>${esc(e.path)}</code><br>${gh ? "Silme depoya kayıt (commit) olarak gider. Dosyalar GitHub geçmişinde kalır; yanlışlıkla silinirse Claude geri getirebilir." : "Dosyalar bilgisayardan <b>kalıcı olarak</b> silinir, Geri Dönüşüm Kutusu'na gitmez."}</div>
      <label class="del-label" for="delIn">Onaylamak için aşağıya <b class="del-phrase">${esc(phrase)}</b> yazın:</label>
      <input class="field-input" id="delIn" autocomplete="off" spellcheck="false">
      <div class="modal-actions"><button type="button" class="btn" data-x>Vazgeç</button><button type="button" class="btn btn-danger" id="delGo" disabled>Bu raporu sil</button></div>`, (box, close) => {
      const inp = box.querySelector('#delIn');
      const go = box.querySelector('#delGo');
      box.querySelector('[data-x]').onclick = close;
      // Harfi harfine (büyük / küçük harf, boşluk) aynı olmalı
      inp.addEventListener('input', () => { go.disabled = inp.value !== phrase; });
      inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !go.disabled) go.click(); });
      go.onclick = async () => {
        if (inp.value !== phrase || !canDelete(e)) return;
        go.disabled = true;
        inp.disabled = true;
        go.textContent = 'Siliniyor…';
        try {
          await store.remove(e.path, { message: `Silindi: ${e.path}` });
          close();
          for (const [k, r] of [...S.imgs]) if (k.startsWith(`${e.path}/`)) { URL.revokeObjectURL(r.url); S.imgs.delete(k); }
          if (isOpen) {
            // Açık rapor silindi: ana ekrana
            stopWatch();
            S.homeTab = e.kind === 'birim' ? 'models' : 'projects';
            S.last = null;
            S.entry = null;
            S.doc = null;
            await scan();
            showHome();
          } else {
            // Model sayfasından silindi: sayfada kalınır, makine raporları listesi yenilenir
            const cur = S.entry && S.entry.path;
            await scan();
            if (cur) S.entry = findEntry(cur) || S.entry;
            if (S.doc) renderFiles();
          }
          toast(`${phrase} silindi`);
        } catch (x) {
          toast(`Silinemedi: ${x.message}`, true);
          go.textContent = 'Bu raporu sil';
          inp.disabled = false;
          go.disabled = inp.value !== phrase;
        }
      };
    });
  }

  /* ─── Üst çubuk: kapak ve antet bilgileri ───────────────── */
  // Rapor no, rev, tarih, hazırlayan, kontrol eden, onaylayan. Yazarken kapak ve antetler hemen değişir;
  // alandan çıkınca (Enter / Tab / tıklama) md'ye yazılır ve rapor yeniden dizilir. Esc yazılanı geri alır.
  const ROLE_KEY = { prepared: 'hazirlayan', checked: 'kontrol', approved: 'onay' };
  const ROLE_NAME = { prepared: 'Hazırlayan', checked: 'Kontrol eden', approved: 'Onaylayan' };
  const isoDate = (d) => { const x = /^\s*(\d{1,2})[./-](\d{1,2})[./-](\d{4})\s*$/.exec(String(d || '')); return x ? `${x[3]}-${pad2(+x[2])}-${pad2(+x[1])}` : ''; };
  const trDate = (iso) => { const x = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return x ? `${x[3]}.${x[2]}.${x[1]}` : ''; };
  const pnorm = (s) => root.RaMd.norm(s);
  let mbOrig = null;          // md'deki değerler (kayıt ve geri alma için)
  let mbOrigA = null;         // md'deki kişiler ve unvanları
  let mbChain = Promise.resolve();
  let mbDateTimer = null;
  const mbInputs = () => [...document.querySelectorAll('#metaBar [data-mb]')];
  const mbValue = (inp) => (inp.dataset.mb === 'reportDate' && inp.type === 'date' ? trDate(inp.value) : inp.value.replace(/\s+/g, ' ').trim());
  /** md'deki (çubukta henüz kaydedilmemiş değişiklik olmadan) ön bilgi */
  function origMeta() {
    const m = S.doc.p.meta;
    if (!mbOrig) return m;
    return Object.assign({}, m, { docNo: mbOrig.docNo, rev: mbOrig.rev, reportDate: mbOrig.reportDate, approvals: mbOrigA || m.approvals });
  }
  /** Raporlarda geçen kişiler ve unvanları (yeni kişi seçilince unvan buradan gelir) */
  function knownPeople() {
    const map = new Map();
    const add = (A) => {
      if (!A) return;
      for (const r of ['prepared', 'checked', 'approved']) {
        const name = A[r];
        if (!name || /^\[/.test(name)) continue;
        const t = (A.titles || {})[r];
        const k = pnorm(name);
        const cur = map.get(k);
        if (!cur) map.set(k, { name, title: t && t.tr ? t : null });
        else if (!cur.title && t && t.tr) cur.title = t;
      }
    };
    add(mbOrigA);
    allEntries().forEach((e) => add((e.meta || {}).approvals));
    return map;
  }
  /** Makine raporunda şablondaki kişiler (aynı kişi seçilirse rapordaki ayrı kayıt kaldırılır) */
  function templateApprovals() {
    const d = S.doc;
    if (!d || d.sources.length < 2) return {};
    return root.RaDoc.peek(d.sources[0].files).meta.approvals || {};
  }
  function fillMetaBar() {
    const e = S.entry;
    const d = S.doc;
    const show = !!(e && d && e.kind !== 'model');
    $('app').classList.toggle('no-meta', !show);
    if (!show) { mbOrig = null; mbOrigA = null; return; }
    // md'deki değerler belge yüklenince bir kez alınır (önizleme d.p.meta'yı değiştirir)
    if (!d.meta0) {
      const m = d.p.meta;
      const A = m.approvals || {};
      d.meta0 = { v: { docNo: m.docNo || '', rev: m.rev || '', reportDate: m.reportDate || '', prepared: A.prepared || '', checked: A.checked || '', approved: A.approved || '', status: m.status === 'final' ? 'final' : 'draft' }, A: JSON.parse(JSON.stringify(A)) };
    }
    mbOrig = d.meta0.v;
    mbOrigA = d.meta0.A;
    // Makine raporunda durum Yayınla / yeni revizyon ile değişir (şablon dondurma); çubukta yalnız projede
    $('metaBar').classList.toggle('is-unit', e.kind === 'birim');
    let dirty = false;
    for (const inp of mbInputs()) {
      if (inp.classList.contains('dirty')) { dirty = true; continue; }
      const k = inp.dataset.mb;
      if (k === 'reportDate') {
        const iso = isoDate(mbOrig.reportDate);
        inp.type = iso || !mbOrig.reportDate ? 'date' : 'text';
        inp.value = inp.type === 'date' ? iso : mbOrig.reportDate;
      } else inp.value = mbOrig[k];
    }
    $('mbPeople').innerHTML = [...knownPeople().values()].map((x) => `<option value="${esc(x.name)}"></option>`).join('');
    if (dirty) previewMeta();
  }
  /** Yazarken: kapak, antetler ve başlık güncellenir (rapor yeniden dizilmez) */
  function previewMeta() {
    const d = S.doc;
    if (!d || !mbOrig) return;
    const m = d.p.meta;
    const v = {};
    mbInputs().forEach((inp) => { v[inp.dataset.mb] = mbValue(inp); });
    m.docNo = v.docNo || mbOrig.docNo;
    m.rev = v.rev || mbOrig.rev;
    m.reportDate = v.reportDate;
    if (S.entry.kind !== 'birim') m.status = v.status;
    const people = knownPeople();
    const A = JSON.parse(JSON.stringify(mbOrigA || {}));
    A.titles = A.titles || {};
    for (const r of ['prepared', 'checked', 'approved']) {
      if (pnorm(v[r]) === pnorm(A[r] || '')) { A[r] = v[r]; continue; }
      A[r] = v[r];
      const known = people.get(pnorm(v[r]));
      A.titles[r] = known && known.title ? known.title : { tr: '' };
    }
    m.approvals = A;
    const old = $('doc').querySelector('.page[data-page="1"]');
    if (old && old.classList.contains('cover')) {
      const box = document.createElement('div');
      box.innerHTML = root.RaCovers.build(m.cover, d.p, d.ev, S.lang, ctx);
      const pg = box.firstElementChild;
      pg.classList.add('print-sheet');
      pg.dataset.page = '1';
      pg.querySelectorAll('.cv-pages').forEach((n) => { n.textContent = String(d.pages || ''); });
      old.replaceWith(pg);
      streamImages();
    }
    const L = root.RA_T[S.lang];
    $('doc').querySelectorAll('.lh-doc').forEach((n) => { n.textContent = `${L.hdrTitle} · ${m.docNo} · Rev. ${m.rev}`; });
    $('docTitle').textContent = `${m.docNo} · ${m.model}`;
    $('docState').textContent = `${m.customer} · Rev ${m.rev} · ${m.status === 'final' ? 'yayın' : 'taslak'}${m.type === 'birim' ? ' · makine raporu' : ''}`;
  }
  function revertField(inp, msg) {
    inp.classList.remove('dirty');
    fillMetaBar();
    previewMeta();
    if (msg) toast(msg, true);
  }
  /** Alandan çıkınca: değişikliği md'ye yazar (yeni rev → açıklama, yeni kişi → unvan sorulur) */
  async function commitMeta(inp) {
    const e = S.entry;
    if (!e || !S.doc || !mbOrig || !inp.classList.contains('dirty')) return;
    const k = inp.dataset.mb;
    const v = mbValue(inp);
    if (v === mbOrig[k]) { inp.classList.remove('dirty'); previewMeta(); return; }
    if (inp.dataset.busy === v) return;
    inp.dataset.busy = v;
    try {
      let pairs = [];
      let rev = null;
      // Yayınlanmış raporda rev artırmadan yapılan değişiklik yayınlanmış revizyonu değiştirir: önce sorulur
      if (mbOrig.status === 'final' && !['rev', 'status'].includes(k) && !(await confirmPublished())) { revertField(inp); return; }
      if (k === 'status') pairs = [['durum', v === 'final' ? 'yayın' : 'taslak']];
      else if (k === 'docNo') pairs = [['dokuman', v]];
      else if (k === 'reportDate') {
        pairs = [['tarih', v]];
        if (v) rev = { set: { rev: mbOrig.rev, date: v } };
      } else if (k === 'rev') {
        if (!v) { revertField(inp, 'Rev boş bırakılamaz.'); return; }
        const rows = S.doc.p._revBase || [];
        const same = (x) => root.RaDoc.revNum(x) === root.RaDoc.revNum(v);
        if (same(mbOrig.rev) || rows.some((r) => same(r.rev))) pairs = [['rev', v]];
        else if (e.kind === 'birim' && e.frozen) {
          // Yayınlanmış makine raporu: yeni revizyon güncel şablonla açılır (dondurma kalkar, taslak olur)
          const okRenew = await renewDialog(v);
          if (!okRenew) revertField(inp);
          else { inp.classList.remove('dirty'); fillMetaBar(); }
          return;
        } else {
          const r = await newRevisionDialog(v);
          if (!r) { revertField(inp); return; }
          // Yeni revizyon yayınlanana kadar taslaktır
          pairs = [['rev', v], ['tarih', r.date], ...(mbOrig.status === 'final' ? [['durum', 'taslak']] : [])];
          rev = { add: [{ rev: v, date: r.date, desc: r.desc, by: mbOrig.prepared, approvedBy: mbOrig.approved }], base: root.RaDoc.syncRevisions(rows, origMeta()) };
        }
      } else {
        const key = ROLE_KEY[k];
        const tpl = e.kind === 'birim' ? templateApprovals() : {};
        if (!v || (e.kind === 'birim' && pnorm(v) === pnorm(tpl[k] || ''))) pairs = [[key, null], [`${key} unvan`, null]];
        else if (pnorm(v) === pnorm(mbOrig[k])) pairs = [[key, v]];
        else {
          const known = knownPeople().get(pnorm(v));
          let title = known && known.title;
          if (!title) {
            title = await personTitleDialog(k, v);
            if (title === false) { revertField(inp); return; }
          }
          pairs = [[key, v], [`${key} unvan`, title && title.tr ? root.RaDoc.mlLine(title) : '-']];
        }
        const eff = pairs[0][1] || tpl[k] || '';
        if (eff && k === 'prepared') rev = { set: { rev: mbOrig.rev, by: eff } };
        if (eff && k === 'approved') rev = { set: { rev: mbOrig.rev, approvedBy: eff } };
      }
      await saveMeta(pairs, rev, inp);
    } finally { delete inp.dataset.busy; }
  }
  function saveMeta(pairs, rev, inp) {
    const e = S.entry;
    const st = $('mbState');
    const job = mbChain.then(async () => {
      st.textContent = 'kaydediliyor…';
      st.className = 'mb-state';
      try {
        await writeDocMd(e, pairs, rev);
        if (inp) inp.classList.remove('dirty');
        if (S.entry === e) {
          await reload();
          const m = S.doc.p.meta;
          // Ana ekran, seçici kutu ve kişi listesi yeni değerleri hemen görsün
          if (e.meta) Object.assign(e.meta, { docNo: m.docNo, rev: m.rev, reportDate: m.reportDate, approvals: JSON.parse(JSON.stringify(m.approvals || {})) });
        }
        st.textContent = `kaydedildi · ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
      } catch (x) {
        st.textContent = 'kaydedilemedi';
        st.className = 'mb-state err';
        toast(`Kaydedilemedi: ${x.message}`, true);
      }
    });
    mbChain = job.catch(() => {});
    return job;
  }
  /** Yayınlanmış raporda rev artırmadan değişiklik: onay */
  function confirmPublished() {
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      modal(`<h2>Yayınlanmış rapor</h2>
        <p>Bu rapor <b>Rev ${esc(mbOrig.rev)}</b> olarak yayınlandı. Bu değişiklik yayınlanmış revizyonu değiştirir. Değişikliği yeni revizyonla yapmak için önce <b>Rev</b> kutusuna yeni numarayı yazın; revizyon tablosuna satır eklenir.</p>
        <div class="modal-actions"><button type="button" class="btn" data-x>Vazgeç</button><button type="button" class="btn btn-primary" id="cpGo">Yine de değiştir</button></div>`, (box, close) => {
        box.querySelector('[data-x]').onclick = close;
        box.querySelector('#cpGo').onclick = () => { finish(true); close(); };
      }, () => finish(false));
    });
  }
  /** Yeni rev: tarih ve değişiklik açıklaması (revizyon tablosuna satır) → { date, desc } veya null */
  function newRevisionDialog(rev) {
    const langs = S.doc.p.meta.langs;
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      modal(`<h2>Yeni revizyon: Rev ${esc(rev)}</h2>
        <p>Doküman kontrol sayfasındaki revizyon tablosuna yeni satır eklenir; önceki revizyonların satırları korunur. Kapak, antet ve PDF adı Rev ${esc(rev)} olur.</p>
        <div class="field"><label>Revizyon tarihi</label><input class="field-input" type="date" id="nrDate" value="${isoDate(todayStr())}"></div>
        ${descFields('nr', langs, '')}
        <div class="modal-actions"><button type="button" class="btn" data-x>Vazgeç</button><button type="button" class="btn btn-primary" id="nrGo">Revizyonu ekle</button></div>`, (box, close) => {
        box.querySelector('[data-x]').onclick = close;
        box.querySelector('#nrGo').onclick = () => {
          const r = { date: trDate(box.querySelector('#nrDate').value) || todayStr(), desc: readDesc(box, 'nr', langs) };
          finish(r);
          close();
        };
      }, () => finish(null));
    });
  }
  /** Raporlarda geçmeyen kişi: kapakta adın altına yazılacak unvan → {tr,en,de}, null (unvansız) veya false (vazgeç) */
  function personTitleDialog(role, name) {
    const langs = S.doc.p.meta.langs;
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      modal(`<h2>${esc(name)} — unvan</h2>
        <p><b>${esc(name)}</b> daha önce hiçbir raporda geçmiyor. Kapakta <b>${ROLE_NAME[role]}</b> kutusunda adın altında yazacak unvanı girin.</p>
        ${langs.map((l) => `<div class="field"><label>Unvan — ${LANG_NAMES[l]}</label><input class="field-input" id="ptT-${l}" placeholder="${l === 'tr' ? 'ör. Kalite Kontrol Sorumlusu (Makine Mühendisi)' : 'boş bırakılırsa Türkçe unvan gösterilir'}"></div>`).join('')}
        <div class="modal-actions"><button type="button" class="btn" data-x>Vazgeç</button><button type="button" class="btn" id="ptNone">Unvansız kaydet</button><button type="button" class="btn btn-primary" id="ptGo">Kaydet</button></div>`, (box, close) => {
        box.querySelector('[data-x]').onclick = close;
        box.querySelector('#ptNone').onclick = () => { finish(null); close(); };
        box.querySelector('#ptGo').onclick = () => {
          const t = {};
          for (const l of langs) { const x = box.querySelector(`#ptT-${l}`).value.trim(); if (x) t[l] = x; }
          finish(t.tr ? t : null);
          close();
        };
      }, () => finish(false));
    });
  }
  function bindMetaBar() {
    const bar = $('metaBar');
    const field = (ev) => ev.target.closest && ev.target.closest('[data-mb]');
    bar.addEventListener('input', (ev) => {
      const inp = field(ev);
      if (!inp) return;
      inp.classList.add('dirty');
      previewMeta();
      if (inp.tagName === 'SELECT') return;
      // Takvimden seçim / gün-ay-yıl yazımı: kısa bekleme ile kaydedilir
      if (inp.dataset.mb === 'reportDate' && inp.type === 'date') { clearTimeout(mbDateTimer); mbDateTimer = setTimeout(() => commitMeta(inp), 1500); }
    });
    bar.addEventListener('change', (ev) => {
      const inp = field(ev);
      if (!inp || (inp.dataset.mb === 'reportDate' && inp.type === 'date')) return;
      commitMeta(inp);
    });
    bar.addEventListener('focusout', (ev) => {
      const inp = field(ev);
      if (inp && inp.dataset.mb === 'reportDate' && inp.type === 'date' && inp.classList.contains('dirty')) { clearTimeout(mbDateTimer); commitMeta(inp); }
    });
    bar.addEventListener('keydown', (ev) => {
      const inp = field(ev);
      if (!inp) return;
      if (ev.key === 'Enter') { ev.preventDefault(); inp.blur(); }
      if (ev.key === 'Escape') { ev.preventDefault(); clearTimeout(mbDateTimer); revertField(inp); inp.blur(); }
    });
  }
  function renderLangSeg(langs) {
    $('langSeg').innerHTML = langs.map((l) => `<button type="button" data-lang="${l}" class="${l === S.lang ? 'active' : ''}" title="${LANG_NAMES[l]}">${l.toUpperCase()}</button>`).join('');
  }
  function renderAll(keepScroll) {
    const d = S.doc;
    if (!d) return;
    const wrap = $('canvasWrap');
    const ratio = keepScroll && wrap.scrollHeight ? wrap.scrollTop / wrap.scrollHeight : 0;
    renderLangSeg(d.p.meta.langs);
    const r = root.RaLayout.renderLang(d.p, d.ev, S.lang, ctx, $('stage'));
    d.pages = r.pages.length;
    d.toc = r.toc;
    $('doc').replaceChildren(...r.pages);
    $('doc').lang = S.lang;
    $('zoomFloat').classList.remove('hidden');
    applyZoom();
    if (keepScroll) wrap.scrollTop = ratio * wrap.scrollHeight;
    renderBanner();
    streamImages();
    fillMetaBar();
    const m = d.p.meta;
    $('docTitle').textContent = `${m.docNo} · ${m.model}`;
    $('docState').textContent = `${m.customer} · Rev ${m.rev} · ${m.status === 'final' ? 'yayın' : 'taslak'}${m.type === 'model' ? ' · model şablonu' : m.type === 'birim' ? ' · makine raporu' : ''}`;
    $('pageInfo').textContent = `${r.pages.length} sayfa${S.lang !== 'tr' && r.stats.missing ? ` · ${r.stats.missing} eksik çeviri (TR gösteriliyor)` : ''}`;
    renderToc(r.toc);
    renderFiles();
    renderSummary();
    renderChecks();
    const logoSrc = logo((root.RA_LIB.brands[m.brand] || root.RA_LIB.brands.DOLFIN).logo);
    $('tbLogo').src = logoSrc;
  }
  function renderToc(toc) {
    $('leftToc').innerHTML = `<button type="button" class="toc-item cover" data-page="1"><span class="n">—</span><span>Kapak</span><span class="p">1</span></button>${toc.map((t) => `<button type="button" class="toc-item${t.sub ? ' sub' : ''}" data-page="${t.page}"><span class="n">${t.num}</span><span>${t.title}</span><span class="p">${t.page}</span></button>`).join('')}`;
  }
  function renderFiles() {
    const d = S.doc;
    const groups = d.sources.map((s, i) => {
      const md = s.files.map((f) => `<div class="file-row"><span>${esc(f.name)}</span><span class="t">md</span></div>`).join('');
      const counts = {};
      s.list.forEach((f) => { const rel = f.slice(s.dir.length + 1); const dir = rel.includes('/') ? rel.split('/')[0] : '.'; counts[dir] = (counts[dir] || 0) + 1; });
      const dirs = Object.entries(counts).filter(([k]) => k !== '.').map(([k, n]) => `<div class="file-row"><span>${esc(k)}/</span><span class="t">${n} dosya</span></div>`).join('');
      return `<div class="file-group"><h3>${i === 0 && d.sources.length > 1 ? 'Model şablonu' : d.sources.length > 1 ? 'Makine raporu' : 'Belge'} <span class="file-count">${esc(s.dir.split('/').pop())}</span></h3>${md}${dirs}</div>`;
    }).join('');
    let del = canDelete(S.entry) ? `<div class="danger-zone"><h3>Tehlikeli bölge</h3><p>${S.entry.kind === 'birim' ? 'Bu makine raporunun' : 'Bu projenin'} klasörü ve içindeki bütün dosyalar silinir. Onay için raporun tam adı yazılır.</p><button type="button" class="btn btn-sm btn-danger-line" id="btnDeleteDoc">Raporu sil…</button></div>` : '';
    if (S.entry && S.entry.kind === 'model') {
      // Model sayfası: bu modelin makine raporları (aç / sil); şablonun kendisi uygulamadan silinmez
      const us = S.entry.units || [];
      del = `<div class="unit-box"><h3>Makine raporları <span class="file-count">${us.length}</span></h3>
        ${us.map((u) => { const um = u.meta || {}; return `<div class="unit-row"><button type="button" class="unit-open" data-open-unit="${esc(u.path)}" title="Raporu aç"><b>${esc(um.job || u.name)}</b> · ${esc(um.customer || '')}${um.status === 'final' ? ' <i class="ok">yayın</i>' : ''}</button><button type="button" class="btn btn-sm btn-danger-line" data-del-unit="${esc(u.path)}" title="Bu makine raporunu sil (onay için tam adı yazılır)">Sil…</button></div>`; }).join('') || '<div class="file-note">Bu modelden henüz makine raporu açılmadı.</div>'}
        <p class="file-note">Model şablonunun kendisi uygulamadan silinmez. Makine raporu silinirken raporun tam adı yazılır.</p></div>`;
    }
    $('leftFiles').innerHTML = `<div class="file-note">Rapor bu md dosyalarından oluşur. Dosya değişince rapor birkaç saniye içinde kendiliğinden yenilenir.</div>${groups}<div class="file-note">Klasör: <code>${esc(d.sources[d.sources.length - 1].dir)}</code></div>${del}`;
  }
  function renderSummary() {
    const { p, ev } = S.doc;
    const rk = (a) => `<span class="rk"><span class="r1">${a[0]}</span><span class="r2">${a[1]}</span><span class="r3">${a[2]}</span></span>`;
    const chip = (ok, t) => `<span class="chip ${ok === true ? 'green' : ok === false ? 'red' : 'gray'}">${t}</span>`;
    const sf = p.sfs.map((s, i) => { const e = ev.sf[i]; return `<div class="sum-row"><span>${s.id} ${esc((s.name.tr || '').slice(0, 28))}</span><span class="v">${e.pl && e.plr ? chip(e.ok, `PL ${e.pl} ${e.ok ? '≥' : '<'} ${e.plr}`) : chip(null, 'PL ?')}</span></div>`; }).join('');
    const el = ev.elec;
    const ns = ev.noise;
    const th = ev.thermal;
    const auto = Object.values(ev.auto.measures).reduce((n, a) => n + a.length, 0);
    const tpl = S.entry && S.entry.kind === 'birim' ? `<div class="sum-card"><h3>Şablon</h3><div class="sum-row"><span>${esc(((S.entry.model || {}).meta || {}).model || '')}</span><span class="v">${S.entry.frozen ? chip(true, `rev ${esc(p.meta.templateRev || '00')} · donduruldu`) : chip(null, `rev ${esc(((S.entry.model || {}).meta || {}).templateRev || '00')} · canlı`)}</span></div></div>` : '';
    $('rightSum').innerHTML = `${tpl}
      <div class="sum-card"><h3>Riskler <span>${p.hazards.length} tehlike</span></h3>
        <div class="sum-row"><span>Başlangıç (düşük / orta / yüksek)</span><span class="v">${rk(ev.before)}</span></div>
        <div class="sum-row"><span>Artık risk</span><span class="v">${rk(ev.after)}</span></div></div>
      <div class="sum-card"><h3>Güvenlik fonksiyonları <span>CCF ${ev.ccf}</span></h3>${sf || '<div class="sum-row"><span>—</span></div>'}</div>
      <div class="sum-card"><h3>Ölçümler</h3>
        <div class="sum-row"><span>Elektrik (EN 60204-1)</span><span class="v">${el.any ? chip(!el.fails, `${el.n} ölçüm${el.fails ? ` · ${el.fails} uygunsuz` : ' · uygun'}`) : chip(null, 'değer yok')}</span></div>
        <div class="sum-row"><span>Gürültü</span><span class="v">${ns.any ? chip(ns.cls !== 'limit' && !ns.invalid, `${ns.opMax.toFixed(1).replace('.', ',')} dB(A)`) : chip(null, 'yok')}</span></div>
        <div class="sum-row"><span>Termal</span><span class="v">${th.any && th.max != null ? chip(th.pass, `${th.max.toFixed(1).replace('.', ',')} °C / ${th.limit} °C`) : chip(null, 'yok')}</span></div></div>
      ${auto || ev.auto.actions.length ? `<div class="sum-card"><h3>Kurallarla eklenenler</h3>
        <div class="sum-row"><span>Önlem satırı</span><span class="v">${auto}</span></div>
        <div class="sum-row"><span>Aksiyon</span><span class="v">${ev.auto.actions.length}</span></div>
        <div class="sum-row"><span>İşaret</span><span class="v">${[...new Set(ev.auto.signs)].join(' ') || '—'}</span></div></div>` : ''}`;
  }
  function renderChecks() {
    const { ev } = S.doc;
    const b = $('checkBadge');
    b.textContent = ev.errors || ev.warnings || '';
    b.className = `badge${ev.errors ? '' : ev.warnings ? ' warn' : ' hidden'}`;
    const rows = ev.checks.map((c) => `<div class="check-row"><span class="check-dot ${c.level}"></span><span>${esc(c.msg)}</span></div>`).join('');
    $('rightChecks').innerHTML = `<div class="check-head">${ev.errors} hata · ${ev.warnings} uyarı · ${ev.checks.length - ev.errors - ev.warnings} bilgi</div>${rows || '<div class="check-ok">Kontrol listesinde sorun yok ✓</div>'}`;
  }
  function scrollToPage(n) {
    const pg = $('doc').querySelector(`.page[data-page="${n}"]`);
    if (!pg) return;
    const wrap = $('canvasWrap');
    wrap.scrollTop += pg.getBoundingClientRect().top - wrap.getBoundingClientRect().top - bannerH() - 12;
  }

  /* ─── Yakınlaştırma ─────────────────────────────────────── */
  // Rapor alanının sağ altındaki çubuk, Ctrl + fare tekerleği (dokunmatik yüzeyde iki parmak), Ctrl + / Ctrl − / Ctrl 0.
  // S.zoom: 'fit' (genişliğe sığdır), 'page' (sayfaya sığdır) ya da oran (0,25 … 4).
  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 4;
  const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];
  const PAGE_W = 794 + 48;   // A4 sayfa + #doc yan boşlukları (boşluklar da ölçeklenir)
  const PAGE_H = 1123;
  const curZoom = () => parseFloat($('doc').style.getPropertyValue('--z')) || 1;
  const bannerH = () => { const b = $('docBanner'); return b && !b.classList.contains('hidden') ? b.offsetHeight : 0; };
  let uiTimer = null;
  const saveUISoon = () => { clearTimeout(uiTimer); uiTimer = setTimeout(saveUI, 400); };
  function zoomFor(mode) {
    const wrap = $('canvasWrap');
    const fitW = Math.max(ZOOM_MIN, Math.min(1.6, (wrap.clientWidth - 4) / PAGE_W));
    if (mode === 'fit') return fitW;
    if (mode === 'page') return Math.max(ZOOM_MIN, Math.min(fitW, (wrap.clientHeight - bannerH() - 24) / PAGE_H));
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +mode || 1));
  }
  /** Ekrandaki bir noktanın altındaki sayfa (yoksa en yakını) */
  function pageAt(y) {
    const pages = [...$('doc').querySelectorAll('.page')];
    let best = pages[0] || null;
    for (const pg of pages) { if (pg.getBoundingClientRect().top <= y) best = pg; else break; }
    return best;
  }
  /** Rapor alanının ortası: düğme / klavye ile yakınlaştırmada görünen yer yerinde kalır */
  function centerAnchor() {
    const r = $('canvasWrap').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + bannerH() + (r.height - bannerH()) / 2 };
  }
  /**
   * Yakınlaştırmayı uygular. anchor {x, y}: o noktadaki sayfa yeri ekranda yerinde kalır (fare imleci ya da alanın ortası).
   * alignTop: başvuru sayfası alanın üstüne hizalanır (sayfaya sığdır).
   */
  function applyZoom(anchor, alignTop) {
    const wrap = $('canvasWrap');
    const doc = $('doc');
    const z0 = curZoom();
    const z = +zoomFor(S.zoom).toFixed(4);
    let ref = null;
    let px = 0;
    let py = 0;
    if (anchor && doc.firstElementChild) {
      ref = pageAt(anchor.y);
      if (ref) { const r = ref.getBoundingClientRect(); px = (anchor.x - r.left) / z0; py = (anchor.y - r.top) / z0; }
    }
    doc.style.setProperty('--z', z);
    if (ref) {
      const r = ref.getBoundingClientRect();
      if (alignTop) wrap.scrollTop += r.top - wrap.getBoundingClientRect().top - bannerH() - 12;
      else {
        wrap.scrollLeft += r.left + px * z - anchor.x;
        wrap.scrollTop += r.top + py * z - anchor.y;
      }
    }
    $('zoomValue').textContent = `${Math.round(z * 100)}%`;
    $('btnFitWidth').classList.toggle('on', S.zoom === 'fit');
    $('btnFitPage').classList.toggle('on', S.zoom === 'page');
  }
  function setZoom(mode, anchor) {
    S.zoom = mode;
    saveUISoon();
    applyZoom(anchor || centerAnchor(), mode === 'page');
  }
  function stepZoom(dir, anchor) {
    const cur = curZoom();
    const next = dir > 0 ? ZOOM_STEPS.find((v) => v > cur + 0.005) : [...ZOOM_STEPS].reverse().find((v) => v < cur - 0.005);
    setZoom(next || (dir > 0 ? ZOOM_MAX : ZOOM_MIN), anchor);
  }
  function zoomMenu(show) {
    const m = $('zoomMenu');
    if (!show) { m.classList.add('hidden'); return; }
    const cur = Math.round(curZoom() * 100);
    m.innerHTML = `${[50, 75, 100, 125, 150, 200, 300, 400].map((v) => `<button type="button" data-z="${v / 100}" class="${typeof S.zoom === 'number' && Math.round(S.zoom * 100) === v ? 'on' : ''}">${v}%</button>`).join('')}
      <div class="zf-msep"></div>
      <button type="button" data-z="fit" class="${S.zoom === 'fit' ? 'on' : ''}">Genişliğe sığdır <kbd>Ctrl 0</kbd></button>
      <button type="button" data-z="page" class="${S.zoom === 'page' ? 'on' : ''}">Sayfaya sığdır</button>
      <div class="zf-msep"></div>
      <button type="button" disabled style="cursor:default;opacity:.75">Şu an ${cur}% · Ctrl + tekerlek</button>`;
    m.classList.remove('hidden');
  }
  function bindZoom() {
    $('btnZoomIn').onclick = () => stepZoom(1);
    $('btnZoomOut').onclick = () => stepZoom(-1);
    $('btnFitWidth').onclick = () => setZoom('fit');
    $('btnFitPage').onclick = () => setZoom('page');
    $('zoomValue').onclick = (e) => { e.stopPropagation(); zoomMenu($('zoomMenu').classList.contains('hidden')); };
    $('zoomMenu').addEventListener('click', (e) => {
      const b = e.target.closest('[data-z]');
      if (!b) return;
      e.stopPropagation();
      zoomMenu(false);
      setZoom(b.dataset.z === 'fit' || b.dataset.z === 'page' ? b.dataset.z : +b.dataset.z);
    });
    document.addEventListener('click', () => zoomMenu(false));
    // Ctrl + fare tekerleği / dokunmatik yüzeyde iki parmak: imlecin altındaki yer sabit kalır; kare başına bir kez uygulanır
    let wheelZ = null;
    let wheelAt = null;
    let raf = 0;
    $('canvasWrap').addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey) || !S.doc) return;
      e.preventDefault();
      const base = wheelZ != null ? wheelZ : curZoom();
      wheelZ = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, base * Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.06 : 0.002))));
      wheelAt = { x: e.clientX, y: e.clientY };
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          S.zoom = +wheelZ.toFixed(3);
          wheelZ = null;
          saveUISoon();
          applyZoom(wheelAt);
        });
      }
    }, { passive: false });
    // Ctrl + / Ctrl − / Ctrl 0: tarayıcının sayfa yakınlaştırması yerine rapor
    document.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || !S.doc || $('app').classList.contains('hidden')) return;
      if (document.querySelector('.modal-overlay') || !$('studio').classList.contains('hidden')) return;   // Ölçümler / Kapak penceresi açıkken değil
      const k = e.key;
      const c = e.code;
      let act = null;
      if (k === '+' || k === '=' || c === 'NumpadAdd') act = 1;
      else if (k === '-' || k === '_' || c === 'NumpadSubtract') act = -1;
      else if (k === '0' || c === 'Numpad0') act = 0;
      if (act === null) return;
      e.preventDefault();
      if (act === 0) setZoom('fit');
      else stepZoom(act);
    });
  }

  /* ─── Canlı yenileme ────────────────────────────────────── */
  let watchTimer = null;
  let watchBusy = false;
  function startWatch() {
    stopWatch();
    $('liveInfo').classList.remove('off');
    $('liveInfo').lastChild.textContent = store.mode === 'github' ? "depodaki değişiklikler 15 sn'de bir denetlenir, rapor kendiliğinden yenilenir" : 'md dosyaları değişince rapor kendiliğinden yenilenir';
    watchTimer = setInterval(async () => {
      if (watchBusy || S.busy || !S.entry || !S.doc || document.hidden || !$('studio').classList.contains('hidden')) return;
      watchBusy = true;
      try {
        await store.refresh();
        const sig = await readSig(S.entry);
        if (sig !== S.sig) await reload(true);
      } catch (e) { /* geçici okuma hatası */ } finally { watchBusy = false; }
    }, 2500);
  }
  function stopWatch() { clearInterval(watchTimer); watchTimer = null; $('liveInfo').classList.add('off'); }
  async function reload(auto) {
    if (!S.entry) return;
    try {
      S.doc = await buildDoc(S.entry);
      S.sig = S.doc.sig;
      renderAll(true);
      if (auto) toast(`Rapor güncellendi (${new Date().toLocaleTimeString('tr-TR')})`);
    } catch (e) {
      toast(`Rapor yenilenemedi: ${e.message}`, true);
    }
  }

  /* ─── PDF ───────────────────────────────────────────────── */
  function openPdfDialog() {
    if (!S.doc) return;
    const m = S.doc.p.meta;
    const langs = m.langs;
    modal(`<h2>PDF İndir</h2>
      <p>Rapor yazdırma penceresi açılmadan doğrudan PDF dosyası olarak üretilir; sayfalar vektör kalır, metin seçilip aranabilir. Birden çok dil seçilirse her dil kapağıyla birlikte tam belge olarak arka arkaya tek dosyada birleşir.</p>
      <div class="pdf-langs"><span>Diller</span>${langs.map((l) => `<label class="pdf-lang is-on"><input type="checkbox" value="${l}" checked> ${l.toUpperCase()}</label>`).join('')}</div>
      <label class="switch-row"><span>${store.mode === 'github' ? 'Depoya da kaydet (<code>cikti/</code>, commit olarak)' : 'Belge klasörüne de kaydet (<code>cikti/</code>)'}</span><input type="checkbox" id="pdfSave"${store.mode === 'github' ? '' : ' checked'}></label>
      <div class="progress hidden" id="pdfProg"><i></i></div><div class="progress-text hidden" id="pdfProgText"></div>
      <div class="modal-actions"><button type="button" class="btn" data-x>Vazgeç</button><button type="button" class="btn btn-primary" id="pdfGo">PDF Oluştur</button></div>`, (box, close) => {
      box.querySelectorAll('.pdf-lang input').forEach((i) => i.addEventListener('change', () => i.parentElement.classList.toggle('is-on', i.checked)));
      box.querySelector('[data-x]').onclick = close;
      box.querySelector('#pdfGo').onclick = async () => {
        const sel = [...box.querySelectorAll('.pdf-lang input:checked')].map((i) => i.value);
        if (!sel.length) { toast('En az bir dil seçin', true); return; }
        box.querySelector('#pdfGo').disabled = true;
        box.querySelector('#pdfProg').classList.remove('hidden');
        box.querySelector('#pdfProgText').classList.remove('hidden');
        const bar = box.querySelector('#pdfProg i');
        const txt = box.querySelector('#pdfProgText');
        try {
          const res = await exportPdf(sel, box.querySelector('#pdfSave').checked, (done, total, label) => { bar.style.width = `${Math.round((done / total) * 100)}%`; txt.textContent = label; });
          close();
          toast(`${res.name} indirildi${res.saved ? ' ve cikti/ klasörüne kaydedildi' : ''} · ${res.pages} sayfa · ${(res.size / 1048576).toFixed(1)} MB`);
        } catch (e) {
          console.error(e);
          txt.textContent = `PDF oluşturulamadı: ${e.message}`;
          box.querySelector('#pdfGo').disabled = false;
        }
      };
    });
  }
  async function exportPdf(langs, saveToFolder, onProgress) {
    const d = S.doc;
    const m = d.p.meta;
    S.busy = true;
    const pr = $('printRoot');
    try {
      await root.RaPdfDom.loadFonts();
      onProgress(0, 1, 'Fotoğraflar hazırlanıyor…');
      await ensureImages();
      pr.replaceChildren();
      for (const lang of langs) {
        onProgress(0, 1, `${lang.toUpperCase()} sayfaları diziliyor…`);
        await new Promise((r) => setTimeout(r, 20));
        const r = root.RaLayout.renderLang(d.p, d.ev, lang, ctx, $('stage'));
        const wrap = document.createElement('div');
        wrap.lang = lang;
        wrap.append(...r.pages);
        if (langs.length > 1) root.RaLayout.prefixIds(wrap, `${lang}-`);
        pr.appendChild(wrap);
      }
      await Promise.all([...pr.querySelectorAll('img')].map((i) => (i.decode ? i.decode().catch(() => {}) : null)));
      const pngs = new Set([...S.imgs.values()].filter((x) => x.png).map((x) => x.url));
      root.RaPdfDom.begin();
      let out;
      try {
        out = await root.RaPdfDom.render(pr, {
          title: `${m.docNo} · ${m.model}`,
          pngHint: (href) => pngs.has(href),
          onProgress: (i, n) => onProgress(i, n, `Sayfa ${i} / ${n} PDF'e yazılıyor…`)
        });
      } finally { root.RaPdfDom.end(); }
      // Dosya adında rapor revizyonu: yeni revizyonun PDF'i öncekinin üzerine yazılmaz
      const name = `${safeName(m.docNo)}_Rev${safeName(m.rev || '00')}_${safeName(m.model)}_${langs.map((l) => l.toUpperCase()).join('-')}.pdf`;
      const blob = new Blob([out.bytes], { type: 'application/pdf' });
      download(name, blob);
      let saved = false;
      if (saveToFolder) {
        try { await store.write(`${S.entry.path}/cikti/${name}`, blob); saved = true; } catch (e) { toast(`cikti/ klasörüne yazılamadı: ${e.message}`, true); }
      }
      if (out.missing.length) console.warn('Yazı tipinde olmayan karakterler:', out.missing.join(' '));
      return { name, saved, pages: out.pages, size: blob.size, missing: out.missing, failedImages: out.failedImages };
    } finally {
      pr.replaceChildren();
      S.busy = false;
    }
  }

  /* ─── Ön bilgi yazımı (kapak seçimi vb.) ────────────────── */
  async function setFrontKey(key, value) {
    const src = S.doc.sources[S.doc.sources.length - 1];
    const f = src.files.find((x) => /^---\s*\n/.test(x.text.replace(/\r/g, ''))) || src.files[0];
    if (!f) throw new Error('md dosyası yok');
    let text = f.text.replace(/\r\n/g, '\n');
    if (!text.startsWith('---\n')) text = `---\n---\n\n${text}`;
    const end = text.indexOf('\n---', 4);
    const head = text.slice(4, end);
    const re = new RegExp(`^${key}\\s*:.*$`, 'm');
    const nh = re.test(head) ? head.replace(re, `${key}: ${value}`) : `${head}${head ? '\n' : ''}${key}: ${value}`;
    text = `---\n${nh}${text.slice(end)}`;
    await store.write(`${src.dir}/${f.name}`, text);
  }

  /* ─── Kapak stüdyosu ────────────────────────────────────── */
  function openCoverStudio() {
    if (!S.doc) return;
    const st = $('studio');
    const D = root.RaCovers.DESIGNS;
    const cur = S.doc.p.meta.cover;
    st.innerHTML = `<header class="cs-bar"><div class="cs-title"><h2>Kapak</h2><span>A4 dikey. Kullanmak istediğiniz tasarımı sağdan seçin; seçim belgenin md ön bilgisine (kapak:) yazılır.</span></div>
      <div class="cs-actions"><div class="lang-seg" id="csLang">${S.doc.p.meta.langs.map((l) => `<button type="button" data-l="${l}" class="${l === S.lang ? 'active' : ''}">${l.toUpperCase()}</button>`).join('')}</div><button type="button" class="icon-btn" id="csClose" title="Kapat (Esc)">×</button></div></header>
      <div class="cs-body"><div class="cs-stage" id="csStage"><div class="cs-sheet" data-sheet="stage"></div></div>
      <div class="cs-rail">${D.map((d) => `<div class="cs-card${d.id === cur ? ' selected' : ''}" data-design="${d.id}" role="button" tabindex="0"><div class="cs-card-head"><span class="cs-card-name">${esc(d.name)}</span><span class="cs-card-state">${d.id === cur ? '✓ Seçili kapak' : 'Bu kapağı kullan'}</span></div><div class="cs-sheet-area"><div class="cs-sheet" data-sheet="${d.id}"></div></div><div class="cs-card-hint">${esc(d.hint)}</div></div>`).join('')}</div></div>`;
    st.classList.remove('hidden');
    let lang = S.lang;
    let design = cur;
    const fill = () => {
      st.querySelectorAll('.cs-sheet').forEach((host) => {
        const id = host.dataset.sheet === 'stage' ? design : host.dataset.sheet;
        host.innerHTML = root.RaCovers.build(id, S.doc.p, S.doc.ev, lang, ctx);
        const pg = host.firstElementChild;
        pg.querySelectorAll('.cv-pages').forEach((n) => { n.textContent = String(S.doc.pages || '—'); });
        const area = host.parentElement;
        const box = area.getBoundingClientRect();
        const k = Math.max(0.05, Math.min(box.width / 794, box.height / 1123));
        host.style.width = `${794 * k}px`;
        host.style.height = `${1123 * k}px`;
        host.style.setProperty('--cs-k', k);
      });
    };
    requestAnimationFrame(fill);
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const close = () => { st.classList.add('hidden'); st.innerHTML = ''; document.removeEventListener('keydown', onKey); window.removeEventListener('resize', fill); };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', fill);
    st.onclick = async (e) => {
      if (e.target.id === 'csClose') { close(); return; }
      const lb = e.target.closest('[data-l]');
      if (lb) { lang = lb.dataset.l; st.querySelectorAll('#csLang button').forEach((b) => b.classList.toggle('active', b === lb)); fill(); return; }
      const card = e.target.closest('.cs-card');
      if (!card || card.dataset.design === design) return;
      design = card.dataset.design;
      st.querySelectorAll('.cs-card').forEach((c) => { const on = c.dataset.design === design; c.classList.toggle('selected', on); c.querySelector('.cs-card-state').textContent = on ? '✓ Seçili kapak' : 'Bu kapağı kullan'; });
      fill();
      try { await setFrontKey('kapak', design); toast(`"${root.RaCovers.DESIGNS.find((d) => d.id === design).name}" seçildi ve md dosyasına yazıldı`); await reload(); } catch (x) { toast(`Kaydedilemedi: ${x.message}`, true); }
    };
  }

  /* ─── Yeni proje / yeni makine raporu ───────────────────── */
  const slug = (s) => String(s || '').trim().toLocaleUpperCase('tr').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').slice(0, 40);
  function newProjectDialog() {
    modal(`<h2>Yeni proje</h2><p>projects klasöründe md iskeleti ve fotoğraf klasörleri oluşturulur. Ölçümleri, fotoğrafları ve makine bilgilerini Claude'a verin; proje md dosyalarını o yazar.</p>
      <div class="field-row"><div class="field"><label>Proje / iş no</label><input class="field-input" id="npNo" placeholder="0426051"></div><div class="field"><label>Müşteri (kısa)</label><input class="field-input" id="npCu" placeholder="ACME"></div></div>
      <div class="field"><label>Model</label><input class="field-input" id="npMo" placeholder="KBN 2B 1200"></div>
      <div class="modal-actions"><button type="button" class="btn" data-x>Vazgeç</button><button type="button" class="btn btn-primary" id="npGo">Oluştur</button></div>`, (box, close) => {
      box.querySelector('[data-x]').onclick = close;
      box.querySelector('#npGo').onclick = async () => {
        const no = box.querySelector('#npNo').value.trim();
        const cu = slug(box.querySelector('#npCu').value);
        const mo = box.querySelector('#npMo').value.trim();
        if (!no || !mo) { toast('Proje no ve model gerekli', true); return; }
        const dir = `projects/${no}-${cu ? `${cu}-` : ''}${slug(mo)}`;
        try {
          if (await store.exists(`${dir}/00-proje.md`)) throw new Error('Bu klasörde proje zaten var');
          for (const sub of ['foto', 'kurulum', 'olcum', 'gurultu', 'termal', 'kaynak', 'cikti']) await store.mkdir(`${dir}/${sub}`);
          await store.write(`${dir}/00-proje.md`, skeletonProject({ no, customer: box.querySelector('#npCu').value.trim(), model: mo }));
          close();
          await scan();
          renderHome();
          openEntry(findEntry(dir));
          toast('Proje iskeleti oluşturuldu');
        } catch (e) { toast(e.message, true); }
      };
    });
  }
  function skeletonProject(o) {
    return `---
tur: proje
no: ${o.no}
musteri: ${o.customer || '[Müşteri]'}
model: ${o.model}
marka: DOLFIN
dokuman: RA-${o.no}-01
rev: 00
tarih: ${todayStr()}
durum: taslak
diller: tr, en, de
kapak: bant
hazirlayan: Fatih GÜRAL
---

<!-- Proje iskeleti. Bölümlerin biçimi: app/MD-SEMASI.md. Claude bu dosyaları verilen verilerle doldurur. -->

# Kapsam
- makine tipi: Endüstriyel parça yıkama makinesi | Industrial parts washing machine | Industrielle Teilereinigungsanlage
- kapsam: Makinenin genel risk değerlendirmesi + elektriksel güvenlik testleri + gürültü ve termografik ölçüm | General risk assessment of the machine + electrical safety tests + noise and thermographic measurement | Allgemeine Risikobeurteilung der Maschine + elektrische Sicherheitsprüfungen + Geräusch- und Thermografiemessung

# Makine
[Makine tanımı: tip, çalışma prensibi, ana bileşenler, koruyucular, kontrol paneli konumu]

# Tehlikeler

# Güvenlik Fonksiyonları
`;
  }
  function newUnitDialog(modelEntry) {
    const model = modelEntry && modelEntry.kind === 'model' ? modelEntry : S.entry && (S.entry.kind === 'birim' ? S.entry.model : S.entry);
    if (!model || model.empty) return;
    modal(`<h2>Yeni makine raporu — ${esc((model.meta || {}).model || model.name)}</h2>
      <p>Model şablonundan bu makine için rapor açılır. Sonra Ölçümler penceresinde LVD, gürültü ve termal ölçümleri girip fotoğrafları bırakın; rapor kurallarla otomatik oluşur.</p>
      <div class="field-row"><div class="field"><label>İş / seri no</label><input class="field-input" id="nuNo" placeholder="0426001"></div><div class="field"><label>Rapor tarihi</label><input class="field-input" id="nuDate" value="${todayStr()}"></div></div>
      <div class="field"><label>Müşteri</label><input class="field-input" id="nuCu" placeholder="ACME GmbH"></div>
      <div class="modal-actions"><button type="button" class="btn" data-x>Vazgeç</button><button type="button" class="btn btn-primary" id="nuGo">Raporu aç</button></div>`, (box, close) => {
      box.querySelector('[data-x]').onclick = close;
      box.querySelector('#nuGo').onclick = async () => {
        const no = box.querySelector('#nuNo').value.trim();
        const cu = box.querySelector('#nuCu').value.trim();
        if (!no) { toast('İş no gerekli', true); return; }
        const dir = `${model.path}/raporlar/${no}${cu ? `-${slug(cu)}` : ''}`;
        try {
          if (await store.exists(`${dir}/rapor.md`)) throw new Error('Bu iş için rapor zaten var');
          for (const sub of ['olcum', 'gurultu', 'termal', 'kurulum', 'cikti']) await store.mkdir(`${dir}/${sub}`);
          const md = root.RaDoc.serializeUnit({ job: no, customer: cu, docNo: `RA-${no}-01`, rev: '00', reportDate: box.querySelector('#nuDate').value.trim(), status: 'draft', templateRev: (model.meta || {}).templateRev || '00' });
          await store.write(`${dir}/rapor.md`, md);
          close();
          await scan();
          await openEntry(findEntry(dir));
          await openMeasureStudio();
        } catch (e) { toast(e.message, true); }
      };
    });
  }

  /* ─── Ölçüm stüdyosu (standart model raporu) ────────────── */
  function photoRule(name) {
    const base = name.replace(/\.[^.]+$/, '');
    if (/\.bmt$/i.test(name)) return 'termal';
    const r = root.RA_LIB.photoRules.find((x) => x.re.test(base));
    if (r) return r.kind === 'noise' ? 'gurultu' : 'olcum';
    return 'kurulum';
  }
  /** Telefon fotoğrafları büyüktür: en uzun kenar 1600 px, JPEG %85 (rapora yeter, depo ve yükleme hızlı kalır) */
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
  async function openMeasureStudio(startTab) {
    if (!S.doc || S.entry.kind !== 'birim') return;
    const unitDir = S.entry.path;
    const own = S.doc.sources[S.doc.sources.length - 1];
    const u = root.RaDoc.mapFolder(own.files, { dir: unitDir });
    const p = S.doc.raw;
    const rel = (f) => (f && f.startsWith(`${unitDir}/`) ? f.slice(unitDir.length + 1) : '');
    const M = {
      job: u.meta.job || '', customer: u.meta.customer || '', docNo: u.meta.docNo || '', rev: u.meta.rev || '00', reportDate: u.meta.reportDate || todayStr(), status: u.meta.status || 'draft',
      prepared: (u.meta.approvals || {}).prepared || (p.meta.approvals || {}).prepared || '', year: u.meta.year || '',
      elec: { date: p.elec.date, time: p.elec.time, instrument: p.elec.instrument, serial: p.elec.serial, calib: p.elec.calib, testedBy: p.elec.testedBy },
      noise: { date: p.noise.date || '', time: p.noise.time || '', instrument: p.noise.instrument || '', serial: p.noise.serial || '', calib: p.noise.calib || '', bg: p.noise.bg == null ? '' : p.noise.bg, K: p.noise.K == null ? '' : p.noise.K, LWA: p.noise.LWA == null ? '' : p.noise.LWA, testedBy: p.noise.testedBy || '' },
      thermal: { date: (u.thermal || {}).date || '', time: (u.thermal || {}).time || '', instrument: (u.thermal || {}).instrument || p.thermal.instrument || '', serial: (u.thermal || {}).serial || p.thermal.serial || '', testedBy: (u.thermal || {}).testedBy || p.thermal.testedBy || '' }
    };
    for (const k of ['rpe', 'iso', 'hv']) M.elec[k] = p.elec[k].map((r) => ({ tag: r.tag, time: r.time || '', u: r.u || '', value: r.value || '', point: r.point, photo: r.photo }));
    M.noise.rows = (p.noise.rows || []).map((r) => ({ no: r.no, pos: r.pos, dist: r.dist, lpa: r.lpa || '', lcpeak: r.lcpeak || '', bg: r.bg || '', photo: r.photo }));
    M.thermal.images = p.thermal.images.map((t) => ({ file: t.file, title: t.title || { tr: '' }, comment: t.comment || { tr: '' }, markers: t.markers, T: t.T, w: t.w, h: t.h, file0: t }));
    M.validation = p.validation.map((v) => ({ id: v.id, ref: v.ref, step: v.step, expected: v.expected, result: v.result, date: v.date, note: v.note }));
    let tab = startTab || 'elec';
    const st = $('studio');
    const tx = (o) => esc((o && (o.tr || o.en)) || '');
    // Fotoğraf kutusuna tıklayınca yükleme: dosya doğru adla (PE 1.jpg, L1-L2 ISO.jpg …) kaydedilir
    // Küçük resimler rapordaki gibi yer tutucuyla çizilir, indikçe yerine oturur
    const thumb = (f, up) => {
      const src = f ? ctx.img(f) : '';
      return `<label class="ms-up" title="${src ? 'Fotoğrafı değiştir' : 'Fotoğraf yükle'}">${src ? `<img class="thumb" src="${src}" alt="">` : '<div class="nothumb">+ foto</div>'}<input type="file" accept="image/*" data-up="${up}" hidden></label>`;
    };
    // Yeni .bmt dosyası termografi listesine eklenir (rapor.md'de D-x satırı açılır)
    const addThermal = (full) => { if (!M.thermal.images.some((t) => t.file === full)) M.thermal.images.push({ file: full, title: { tr: '' }, comment: { tr: '' }, markers: null }); };
    const inp = (path, v, cls, ph) => `<input class="field-input ${cls || ''}" data-m="${path}" value="${esc(v == null ? '' : v)}"${ph ? ` placeholder="${esc(ph)}"` : ''}>`;
    function evalNow() {
      const q = JSON.parse(JSON.stringify({ elec: Object.assign({}, p.elec, { rpe: M.elec.rpe, iso: M.elec.iso, hv: M.elec.hv }) }));
      const e = root.RaRules.evalElec(q);
      const n = root.RaRules.evalNoise({ noise: Object.assign({}, p.noise, { rows: M.noise.rows, bg: M.noise.bg === '' ? null : +String(M.noise.bg).replace(',', '.'), K: M.noise.K === '' ? null : +String(M.noise.K).replace(',', '.'), operatorRows: p.noise.operatorRows }) });
      const chip = (ok, t) => `<span class="chip ${ok === true ? 'green' : ok === false ? 'red' : 'gray'}">${t}</span>`;
      const th = M.thermal.images.filter((t) => t.T).map((t) => root.RaThermal.summary(Object.assign({}, t.file0, { markers: t.markers || root.RaThermal.defaultMarkers() })).max);
      const thMax = th.length ? Math.max(...th) : null;
      const lim = p.thermal.limit || 65;
      $('msEval').innerHTML = `<div class="sum-card"><h3>Kurallar — anlık sonuç</h3>
        <div class="sum-row"><span>R<sub>PE</sub></span><span class="v">${e.rpe.n ? chip(e.rpe.pass, `${e.rpe.n} ölçüm${e.rpe.fails ? ` · ${e.rpe.fails} ✗` : ' ✓'}`) : chip(null, '—')}</span></div>
        <div class="sum-row"><span>Yalıtım</span><span class="v">${e.iso.n ? chip(e.iso.pass, `${e.iso.n} ölçüm${e.iso.fails ? ` · ${e.iso.fails} ✗` : ' ✓'}`) : chip(null, '—')}</span></div>
        <div class="sum-row"><span>Gerilim dayanım</span><span class="v">${e.hv.n ? chip(e.hv.pass, `${e.hv.n} ölçüm${e.hv.fails ? ` · ${e.hv.fails} ✗` : ' ✓'}`) : chip(null, '—')}</span></div>
        <div class="sum-row"><span>Gürültü (operatör)</span><span class="v">${n.any ? chip(n.cls !== 'limit' && !n.invalid, `${n.opMax.toFixed(1).replace('.', ',')} dB(A)`) : chip(null, '—')}</span></div>
        <div class="sum-row"><span>Termal (en yüksek)</span><span class="v">${thMax != null ? chip(thMax <= lim, `${thMax.toFixed(1).replace('.', ',')} °C`) : chip(null, '—')}</span></div></div>
        <div class="hint">Sınırlar: R<sub>PE</sub> ≤ ${String(p.elec.limits.rpeMax).replace('.', ',')} Ω · R<sub>ISO</sub> ≥ ${String(p.elec.limits.isoMin).replace('.', ',')} MΩ · HV ≤ ${String(p.elec.limits.hvMax).replace('.', ',')} mA · gürültü beyanı 70 / 80 / 85 dB(A) · termal ${lim} °C (EN ISO 13732-1).</div>
        <div class="hint">Kaydet'e basınca <b>rapor.md</b> yazılır, rapor kurallarla yeniden oluşur: ölçüme bağlı tehlikelere sonuç satırı, uygunsuzluklara aksiyon ve işaret eklenir.</div>`;
    }
    const elecTable = (k, title, keyName) => `<div class="ms-card"><h3><span>${title}</span> <small>${M.elec[k].length} satır</small></h3>
      <table class="ms-table"><thead><tr><th>${keyName}</th><th>Ölçüm noktası (şablondan)</th><th>Saat</th>${k === 'hv' ? '<th>U (V)</th>' : ''}<th>Değer (${k === 'rpe' ? 'Ω' : k === 'iso' ? 'MΩ' : 'mA'})</th><th>Foto</th></tr></thead><tbody>
      ${M.elec[k].map((r, i) => `<tr><td class="w-tag">${esc(r.tag)}</td><td class="desc">${tx(r.point) || '—'}</td><td>${inp(`elec.${k}.${i}.time`, r.time, 'w-time', '10:12:05')}</td>${k === 'hv' ? `<td>${inp(`elec.${k}.${i}.u`, r.u, 'w-val', '1500')}</td>` : ''}<td>${inp(`elec.${k}.${i}.value`, r.value, 'w-val', k === 'iso' ? '>599,9' : '0,05')}</td><td>${thumb(r.photo, `elec.${k}.${i}`)}</td></tr>`).join('')}
      </tbody></table></div>`;
    function pane() {
      if (tab === 'elec') {
        return `<div class="ms-card"><h3>Test bilgileri <small>EN 60204-1 Bölüm 18</small></h3><div class="ms-grid">
          ${[['date', 'Tarih', '05.11.2026'], ['time', 'Saat', '10:12 – 10:40'], ['instrument', 'Test cihazı', 'Sonel PAT-820'], ['serial', 'Seri no'], ['calib', 'Kalibrasyon'], ['testedBy', 'Test eden', 'Fatih GÜRAL']].map(([k, l, ph]) => `<div class="field"><label>${l}</label>${inp(`elec.${k}`, M.elec[k], '', ph)}</div>`).join('')}</div></div>
          ${elecTable('rpe', 'Koruma iletkeni sürekliliği (R<sub>PE</sub>)', 'No')}${elecTable('iso', 'Yalıtım direnci (R<sub>ISO</sub>)', 'Çift')}${elecTable('hv', 'Gerilim dayanım (HV)', 'Çift')}`;
      }
      if (tab === 'noise') {
        return `<div class="ms-card"><h3>Ölçüm bilgileri <small>EN ISO 11202 · 2006/42/AT Ek I 1.7.4.2 u</small></h3><div class="ms-grid">
          ${[['date', 'Tarih'], ['time', 'Saat'], ['instrument', 'Ses seviye ölçer', 'UNI-T UT353'], ['serial', 'Seri no'], ['calib', 'Kalibrasyon'], ['bg', 'Arka plan dB(A)', '45,0'], ['K', 'Belirsizlik K (dB)', '2,5'], ['LWA', 'L_WA dB(A) (>80 ise)'], ['testedBy', 'Ölçen']].map(([k, l, ph]) => `<div class="field"><label>${l}</label>${inp(`noise.${k}`, M.noise[k], '', ph)}</div>`).join('')}</div></div>
          <div class="ms-card"><h3>Ölçüm noktaları <small>${M.noise.rows.length} nokta${p.noise.operatorRows ? ` · operatör konumu: ${p.noise.operatorRows.join(', ')}` : ''}</small></h3>
          <table class="ms-table"><thead><tr><th>No</th><th>Konum (şablondan)</th><th>Mesafe</th><th>L<sub>pA</sub> dB(A)</th><th>L<sub>Cpeak</sub> dB(C)</th><th>Arka plan</th><th>Foto</th></tr></thead><tbody>
          ${M.noise.rows.map((r, i) => `<tr><td class="w-tag">${esc(r.no)}</td><td class="desc">${tx(r.pos) || '—'}</td><td>${esc(r.dist || '')}</td><td>${inp(`noise.rows.${i}.lpa`, r.lpa, 'w-val', '68,0')}</td><td>${inp(`noise.rows.${i}.lcpeak`, r.lcpeak, 'w-val')}</td><td>${inp(`noise.rows.${i}.bg`, r.bg, 'w-val')}</td><td>${thumb(r.photo, `noise.${i}`)}</td></tr>`).join('') || '<tr><td colspan="7" class="desc">Şablonda gürültü ölçüm noktası tanımlı değil; fotoğraf (GURULTU 1.jpg …) bırakılınca satır açılır.</td></tr>'}
          </tbody></table></div>`;
      }
      if (tab === 'thermal') {
        return `<div class="ms-card"><h3>Termografi bilgileri <small>EN ISO 13732-1 · ölçüt ${p.thermal.limit || 65} °C</small></h3><div class="ms-grid">
          ${[['date', 'Tarih'], ['time', 'Saat'], ['instrument', 'Kamera', 'testo 860i'], ['serial', 'Seri no'], ['testedBy', 'Ölçen']].map(([k, l, ph]) => `<div class="field"><label>${l}</label>${inp(`thermal.${k}`, M.thermal[k], '', ph)}</div>`).join('')}</div>
          <div class="ms-uprow"><label class="btn btn-sm btn-primary">+ testo .bmt dosyası ekle<input type="file" accept=".bmt" multiple data-up="bmt" hidden></label></div>
          <div class="hint" style="margin-top:8px">Her görüntüde en sıcak nokta (HS) otomatik işaretlenir ve 65 °C ölçütüyle değerlendirilir. Çıplak sac gibi geçersiz bölgeler için işaretçileri Claude'a tarif edebilirsiniz. Başlık ve değerlendirme üç dilde yazılabilir: <b>Arka yüz | Rear side | Rückseite</b></div></div>
          <div class="th-cards">${M.thermal.images.map((t, i) => {
            const s = t.T ? root.RaThermal.summary(Object.assign({}, t.file0, { markers: t.markers || root.RaThermal.defaultMarkers() })) : null;
            return `<div class="th-card">${t.T ? `<img src="${root.RaThermal.imageSrc(t.file0)}" alt="">` : '<div class="nothumb" style="width:100%;height:120px">okunamadı</div>'}<div class="th-v"><span>D-${i + 1} · ${esc(t.file.split('/').pop())}</span><b>${s && s.max != null ? `${s.max.toFixed(1).replace('.', ',')} °C` : '—'}</b></div>
              <div class="field"><label>Başlık</label>${inp(`thermal.images.${i}.title.tr`, t.title.tr, '', 'Arka yüz')}</div><div class="field"><label>Değerlendirme</label>${inp(`thermal.images.${i}.comment.tr`, t.comment.tr)}</div></div>`;
          }).join('') || '<div class="hint">Henüz termal görüntü yok.</div>'}</div>`;
      }
      if (tab === 'val') {
        return `<div class="ms-card"><h3>Validasyon testleri <small>EN ISO 13849-2 · U uygun / UD uygun değil</small></h3>
          <table class="ms-table"><thead><tr><th>No</th><th>Ref</th><th>Adım / beklenen</th><th>Sonuç</th><th>Tarih</th><th>Not</th></tr></thead><tbody>
          ${M.validation.map((v, i) => `<tr><td class="w-tag">${esc(v.id)}</td><td>${esc(v.ref || '')}</td><td class="desc">${tx(v.step)}<br><span style="color:#8e96a6">${tx(v.expected)}</span></td><td><select class="field-input" data-m="validation.${i}.result"><option value=""${!v.result ? ' selected' : ''}>—</option><option value="ok"${v.result === 'ok' ? ' selected' : ''}>U</option><option value="nok"${v.result === 'nok' ? ' selected' : ''}>UD</option></select></td><td>${inp(`validation.${i}.date`, v.date, 'w-time')}</td><td>${inp(`validation.${i}.note.tr`, (v.note && v.note.tr) || '')}</td></tr>`).join('') || '<tr><td colspan="6" class="desc">Şablonda validasyon testi yok.</td></tr>'}
          </tbody></table></div>`;
      }
      const files = own.list.map((f) => f.slice(unitDir.length + 1)).filter((f) => !/\.md$/i.test(f));
      return `<div class="ms-uprow"><label class="btn btn-sm">+ Test kurulumu fotoğrafı (Ek B)<input type="file" accept="image/*" multiple data-up="kurulum" hidden></label></div>
        <label class="drop" id="msDrop"><input type="file" id="msFile" multiple hidden><b>Ölçüm fotoğraflarını ve .bmt dosyalarını toplu olarak buraya bırakın</b><small>Ad kuralı: <b>PE 1.jpg</b> … (R<sub>PE</sub> noktası) · <b>L1-L2 ISO.jpg</b> (yalıtım) · <b>L1-L2 FLASH.jpg</b> (gerilim dayanım) · <b>GURULTU 1.jpg</b> (gürültü noktası) · <b>*.bmt</b> (termal) · diğerleri kurulum fotoğrafı (Ek B)</small></label>
        <div class="ms-card"><h3>Bu raporun dosyaları <small>${files.length} dosya</small></h3>${files.map((f) => `<div class="file-row"><span>${esc(f)}</span><span class="t">${esc(photoRule(f.split('/').pop()))}</span></div>`).join('') || '<div class="hint">Henüz dosya yok.</div>'}</div>`;
    }
    function draw() {
      st.querySelector('.ms-tabs').innerHTML = [['elec', 'Elektrik (LVD)'], ['noise', 'Gürültü'], ['thermal', 'Termografi'], ['val', 'Validasyon'], ['files', 'Fotoğraflar']].map(([k, l]) => `<button type="button" class="home-tab${k === tab ? ' active' : ''}" data-tab="${k}">${l}</button>`).join('');
      st.querySelector('.ms-pane').innerHTML = pane();
      evalNow();
      streamImages();
      const drop = st.querySelector('#msDrop');
      if (drop) {
        const take = async (list) => {
          const files = [...list];
          if (!files.length) return;
          toast(`${files.length} dosya yükleniyor…`);
          const ops = [];
          const bad = [];
          for (const f of files) {
            const dir = photoRule(f.name);
            if (dir === 'termal') {
              addThermal(`${unitDir}/termal/${f.name}`);
              ops.push(store.write(`${unitDir}/termal/${f.name}`, f));
            } else if (/^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name)) {
              try { ops.push(store.write(`${unitDir}/${dir}/${f.name.replace(/\.[^.]+$/, '')}.jpg`, await shrinkImage(f))); } catch (x) { bad.push(x.message); }
            } else bad.push(`${f.name}: fotoğraf veya .bmt değil, atlandı`);
          }
          try {
            if (ops.length) await saveUnit(false, ops);
            if (bad.length) toast(bad.join(' · '), true);
            else toast(`${ops.length} dosya kaydedildi; rapor kurallarla yeniden oluşturuldu`);
            close();
            openMeasureStudio(tab);
          } catch (x) { toast(`Yüklenemedi: ${x.message}`, true); }
        };
        st.querySelector('#msFile').onchange = (e) => take(e.target.files);
        drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
        drop.addEventListener('dragleave', () => drop.classList.remove('over'));
        drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); take(e.dataTransfer.files); });
      }
    }
    const setPath = (path, value) => {
      const ks = path.split('.');
      let o = M;
      for (let i = 0; i < ks.length - 1; i += 1) o = o[ks[i]];
      o[ks[ks.length - 1]] = value;
    };
    /** Satır / düğme yüklemesi: dosya adlandırma kuralıyla kaydedilir, eski fotoğraf kaldırılır */
    async function upload(key, list) {
      const files = [...list];
      if (!files.length) return;
      toast('Yükleniyor…');
      const [kind, a, b] = key.split('.');
      const ops = [];
      const put = (relPath, data, row) => {
        const full = `${unitDir}/${relPath}`;
        if (row && row.photo && row.photo !== full && row.photo.startsWith(`${unitDir}/`)) ops.push(store.remove(row.photo));
        if (row) row.photo = full;
        ops.push(store.write(full, data));
      };
      try {
        if (kind === 'elec') {
          const r = M.elec[a][+b];
          put(`olcum/${a === 'rpe' ? `PE ${r.tag}` : `${r.tag} ${a === 'iso' ? 'ISO' : 'FLASH'}`}.jpg`, await shrinkImage(files[0]), r);
        } else if (kind === 'noise') {
          const r = M.noise.rows[+a];
          put(`gurultu/GURULTU ${r.no}.jpg`, await shrinkImage(files[0]), r);
        } else if (kind === 'bmt') {
          for (const f of files) { put(`termal/${f.name}`, f); addThermal(`${unitDir}/termal/${f.name}`); }
        } else if (kind === 'kurulum') {
          for (const f of files) put(`kurulum/${f.name.replace(/\.[^.]+$/, '')}.jpg`, await shrinkImage(f));
        }
        // Fotoğraf ve rapor.md aynı kayıtta gider (GitHub'da tek commit)
        await saveUnit(false, ops);
        close();
        openMeasureStudio(tab);
      } catch (x) { toast(`Yüklenemedi: ${x.message}`, true); }
    }
    async function saveUnit(closeAfter, extra) {
      const out = Object.assign({}, M, {
        elec: Object.assign({}, M.elec, ...['rpe', 'iso', 'hv'].map((k) => ({ [k]: M.elec[k].map((r) => Object.assign({}, r, { photoRel: rel(r.photo) })) }))),
        noise: Object.assign({}, M.noise, { rows: M.noise.rows.map((r) => Object.assign({}, r, { photoRel: rel(r.photo) })) }),
        thermal: Object.assign({}, M.thermal, { images: M.thermal.images.filter((t) => rel(t.file)).map((t) => ({ fileRel: rel(t.file), title: t.title, comment: t.comment, markers: t.markers })) }),
        // Rapor no, rev, tarih, kişiler, durum üst çubuktan / Yayınla'dan yönetilir: rapor.md'deki değerleri korunur
        docNo: undefined, rev: undefined, reportDate: undefined, status: undefined, prepared: undefined, year: undefined
      });
      let old = '';
      try { old = await store.text(`${unitDir}/rapor.md`); } catch (x) { old = ''; }
      await Promise.all([store.write(`${unitDir}/rapor.md`, root.RaDoc.updateUnit(old, out)), ...(extra || [])]);
      await reload();
      toast('Ölçümler kaydedildi; rapor kurallarla yeniden oluşturuldu');
      if (closeAfter) close();
    }
    st.innerHTML = `<header class="cs-bar"><div class="cs-title"><h2>Ölçümler</h2><span>${esc((S.entry.model.meta || {}).model || S.entry.model.name)} · ${esc(M.job)} · ${esc(M.customer)}</span></div>
      <div class="cs-actions"><button type="button" class="btn btn-sm" id="msSave">Kaydet</button><button type="button" class="btn btn-sm btn-primary" id="msSaveClose">Kaydet ve raporu göster</button><button type="button" class="icon-btn" id="msClose" title="Kapat (Esc)">×</button></div></header>
      <div class="ms-fields">${[['job', 'İş / seri no'], ['customer', 'Müşteri']].map(([k, l]) => `<div class="field"><label>${l}</label>${inp(k, M[k])}</div>`).join('')}<div class="hint ms-fields-note">Rapor no, rev, tarih ve imza sahipleri raporun üstündeki çubuktan değiştirilir.</div></div>
      <div class="ms-body"><div class="ms-main"><nav class="ms-tabs"></nav><div class="ms-pane"></div></div><aside class="ms-side" id="msEval"></aside></div>`;
    st.classList.remove('hidden');
    const onKey = (e) => { if (e.key === 'Escape' && !document.querySelector('.modal-overlay')) close(); };
    function close() { st.classList.add('hidden'); st.innerHTML = ''; document.removeEventListener('keydown', onKey); }
    document.addEventListener('keydown', onKey);
    st.oninput = (e) => { const k = e.target.dataset && e.target.dataset.m; if (k) { setPath(k, e.target.value); evalNow(); } };
    st.onchange = (e) => {
      if (e.target.dataset && e.target.dataset.up) { upload(e.target.dataset.up, e.target.files); return; }
      st.oninput(e);
    };
    st.onclick = async (e) => {
      const t = e.target.closest('[data-tab]');
      if (t) { tab = t.dataset.tab; draw(); return; }
      if (e.target.id === 'msClose') close();
      else if (e.target.id === 'msSave') { try { await saveUnit(false); } catch (x) { toast(`Kaydedilemedi: ${x.message}`, true); } }
      else if (e.target.id === 'msSaveClose') { try { await saveUnit(true); } catch (x) { toast(`Kaydedilemedi: ${x.message}`, true); } }
    };
    draw();
  }

  /* ─── Olaylar ve başlangıç ──────────────────────────────── */
  function bind() {
    bindMetaBar();
    $('leftFiles').addEventListener('click', (ev) => {
      if (ev.target.closest('#btnDeleteDoc')) { deleteDialog(); return; }
      const del = ev.target.closest('[data-del-unit]');
      if (del) { deleteDialog(findEntry(del.dataset.delUnit)); return; }
      const op = ev.target.closest('[data-open-unit]');
      if (op) openEntry(findEntry(op.dataset.openUnit));
    });
    homeCombo = combo($('homeCombo'), { id: 'homeComboInput', placeholder: 'Daha önce risk analizi yapılmış model veya projeyi seçin… (ör. KBN, 0326066, LYM)', onPick: openEntry });
    topCombo = combo($('topCombo'), { placeholder: 'Başka model / proje aç…', onPick: openEntry });
    document.querySelectorAll('.home-tab[data-home-tab]').forEach((b) => b.addEventListener('click', () => { S.homeTab = b.dataset.homeTab; saveUI(); renderHome(); }));
    $('homeList').addEventListener('click', (e) => {
      const nu = e.target.closest('[data-newunit]');
      if (nu) { e.stopPropagation(); newUnitDialog(findEntry(nu.dataset.newunit)); return; }
      const o = e.target.closest('[data-open]');
      if (o) { e.stopPropagation(); openEntry(findEntry(o.dataset.open)); }
    });
    $('docBanner').addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      if (a.dataset.act === 'newunit') newUnitDialog();
      else if (a.dataset.act === 'measure') openMeasureStudio();
      else if (a.dataset.act === 'publish') publishDialog();
      else if (a.dataset.act === 'renew') renewDialog();
    });
    $('homeList').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const o = e.target.closest('[data-open]'); if (o) openEntry(findEntry(o.dataset.open)); } });
    $('btnRefreshHome').onclick = async () => {
      try { await store.refresh(true); } catch (e) { /* bağlantı hatası durum düğmesinde görünür */ }
      await scan();
      renderHome();
      toast(store.mode === 'github' ? 'Depo yeniden okundu' : 'Klasör yeniden tarandı');
    };
    $('btnNewProject').onclick = newProjectDialog;
    $('btnFolder').onclick = async () => {
      const st = store.status();
      if (await connectGate({ change: true, error: st && st.state === 'error' ? st.error : '' })) { await scan(); renderHome(); toast(`Bağlandı: ${store.name}`); }
      $('gate').classList.add('hidden');
    };
    $('btnHome').onclick = async () => { try { await store.refresh(); } catch (e) { /* yok */ } await scan(); showHome(); };
    $('btnReload').onclick = async () => { try { await store.refresh(true); } catch (e) { /* yok */ } reload(); };
    // Ana ekran açıkken depodaki yeni commit'ler (Claude'un gönderdikleri) kendiliğinden listelenir
    const homeTick = async () => {
      if (store.mode !== 'github' || $('home').classList.contains('hidden') || document.hidden) return;
      try { if (await store.refresh()) { await scan(); renderHome(); toast('Depodaki yeni kayıtlar listelendi'); } } catch (e) { /* bir sonraki denemede */ }
    };
    setInterval(homeTick, 20000);
    window.addEventListener('focus', homeTick);
    $('btnPdf').onclick = openPdfDialog;
    $('btnCover').onclick = openCoverStudio;
    $('btnMeasure').onclick = () => openMeasureStudio();
    $('btnNewUnit').onclick = () => newUnitDialog();
    bindZoom();
    $('langSeg').addEventListener('click', (e) => { const b = e.target.closest('[data-lang]'); if (b && S.doc) { S.lang = b.dataset.lang; saveUI(); renderAll(true); } });
    document.querySelectorAll('[data-left]').forEach((b) => b.addEventListener('click', () => { document.querySelectorAll('[data-left]').forEach((x) => x.classList.toggle('active', x === b)); $('leftToc').classList.toggle('hidden', b.dataset.left !== 'toc'); $('leftFiles').classList.toggle('hidden', b.dataset.left !== 'files'); }));
    document.querySelectorAll('[data-right]').forEach((b) => b.addEventListener('click', () => { document.querySelectorAll('[data-right]').forEach((x) => x.classList.toggle('active', x === b)); $('rightSum').classList.toggle('hidden', b.dataset.right !== 'sum'); $('rightChecks').classList.toggle('hidden', b.dataset.right !== 'checks'); }));
    $('leftToc').addEventListener('click', (e) => { const t = e.target.closest('[data-page]'); if (t) scrollToPage(+t.dataset.page); });
    $('doc').addEventListener('click', (e) => { const a = e.target.closest("a[href^='#']"); if (!a) return; e.preventDefault(); const n = $('doc').querySelector(a.getAttribute('href')); const pg = n && n.closest('.page'); if (pg) scrollToPage(+pg.dataset.page); });
    window.addEventListener('resize', () => { if (S.zoom === 'fit' || S.zoom === 'page') applyZoom(); });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p' && S.doc && $('studio').classList.contains('hidden')) { e.preventDefault(); openPdfDialog(); }
    });
  }

  async function init() {
    bind();
    store.onStatus(renderConn);
    $('homeLogo').src = logo('assets/logos/dolfin.png');
    $('tbLogo').src = logo('assets/logos/dolfin.png');
    await connect();
    await scan();
    const want = new URLSearchParams(location.search).get('ac');
    const target = findEntry(want || '') || null;
    if (target) openEntry(target);
    else showHome();
  }

  root.RaApp = { logo, state: S, exportPdf: (langs, save) => exportPdf(langs, save, () => {}), open: (path) => openEntry(findEntry(path)), scan, reload, ctx };
  init().catch((e) => { console.error(e); gate(`<h1>Uygulama başlatılamadı</h1><p>${esc(e.message)}</p>`); });
})(typeof self !== 'undefined' ? self : this);
