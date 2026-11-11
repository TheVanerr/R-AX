/* Depo: projelerin ve modellerin durduğu yer. Üç arka uç, aynı arayüz:
   - GitHub deposu (önerilen, P&PX ile aynı yöntem): özel bir GitHub deposu veritabanıdır. Tarayıcı ince ayarlı erişim
     anahtarıyla doğrudan GitHub API'siyle konuşur; her kayıt bir commit'tir, her bilgisayardan erişilir.
   - Klasör (File System Access API): bu bilgisayardaki R&AX klasörü. Klasör bir kez seçilir, IndexedDB'de hatırlanır.
   - HTTP: uygulama yerel sunucuyla (app/araclar/sunucu.mjs) açıldığında; geliştirme ve test.
   Yollar kökten başlar ve "/" ile ayrılır: "projects/0326066-…/00-proje.md". */

(function (root) {
  'use strict';

  const DB_NAME = 'risk-analizi';
  const DB_KEY = 'root-handle';
  const SETTINGS_KEY = 'ra_ayarlar';
  const SKIP = new Set(['_eski', 'cikti', 'kaynak', '.git', 'node_modules']);
  const GH_CHECK_MS = 15000;
  const GH_PARALLEL = 12;
  const GH_BATCH_MS = 400;

  /* ─── IndexedDB: klasör tutamağı ve GitHub dosya önbelleği ── */
  // Tek bağlantı: her okumada yeniden açılmaz; başka sekme sürüm yükseltirse kapanır ve yeniden açılır
  let dbConn = null;
  function idb() {
    if (dbConn) return dbConn;
    dbConn = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => { db.close(); dbConn = null; };
        resolve(db);
      };
      req.onerror = () => { dbConn = null; reject(req.error); };
    });
    return dbConn;
  }
  async function dbGet(store, k) {
    const db = await idb();
    return new Promise((resolve) => {
      const q = db.transaction(store).objectStore(store).get(k);
      q.onsuccess = () => resolve(q.result || null);
      q.onerror = () => resolve(null);
    });
  }
  async function dbSet(store, k, v) {
    const db = await idb();
    return new Promise((resolve) => {
      const t = db.transaction(store, 'readwrite');
      t.objectStore(store).put(v, k);
      t.oncomplete = () => resolve(true);
      t.onerror = () => resolve(false);
    });
  }

  const parts = (path) => String(path || '').split('/').filter(Boolean);
  const MIME = { md: 'text/markdown', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', pdf: 'application/pdf', json: 'application/json', txt: 'text/plain' };
  const mimeOf = (path) => MIME[String(path).split('.').pop().toLowerCase()] || 'application/octet-stream';
  async function toBytes(data) {
    if (typeof data === 'string') return new TextEncoder().encode(data);
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (data && typeof data.arrayBuffer === 'function') return new Uint8Array(await data.arrayBuffer());
    return new TextEncoder().encode(String(data));
  }

  /* ─── Ayarlar (GitHub bağlantısı) ─────────────────────────── */
  function settings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveSettings(v) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(v)); } catch (e) { /* tarayıcı depolaması kapalı */ }
  }

  /* ─── Klasör izni ─────────────────────────────────────────── */
  function fsBackend(rootHandle) {
    async function dirOf(path, create) {
      let d = rootHandle;
      for (const p of parts(path)) d = await d.getDirectoryHandle(p, { create: !!create });
      return d;
    }
    async function fileOf(path, create) {
      const ps = parts(path);
      const name = ps.pop();
      const d = await dirOf(ps.join('/'), create);
      return d.getFileHandle(name, { create: !!create });
    }
    return {
      mode: 'fs',
      name: rootHandle.name,
      async list(path) {
        const out = [];
        try {
          const d = await dirOf(path);
          for await (const [name, h] of d.entries()) {
            if (h.kind === 'file') {
              const f = await h.getFile();
              out.push({ name, kind: 'file', size: f.size, mtime: f.lastModified, sig: `${f.size}:${f.lastModified}` });
            } else out.push({ name, kind: 'dir' });
          }
        } catch (e) { if (e.name !== 'NotFoundError' && e.name !== 'TypeMismatchError') throw e; }
        return out;
      },
      async read(path) { return (await fileOf(path)).getFile(); },
      async write(path, data) {
        const h = await fileOf(path, true);
        const w = await h.createWritable();
        await w.write(data);
        await w.close();
      },
      async mkdir(path) { await dirOf(path, true); },
      async exists(path) {
        try { await fileOf(path); return true; } catch (e) { try { await dirOf(path); return true; } catch (x) { return false; } }
      },
      async copy(src, dst) {
        const f = await (await fileOf(src)).getFile();
        const h = await fileOf(dst, true);
        const w = await h.createWritable();
        await w.write(f);
        await w.close();
      },
      async remove(path) {
        const ps = parts(path);
        const name = ps.pop();
        try { await (await dirOf(ps.join('/'))).removeEntry(name, { recursive: true }); } catch (e) { if (e.name !== 'NotFoundError') throw e; }
      },
      async refresh() { return false; }
    };
  }

  /* ─── HTTP (yerel sunucu) ─────────────────────────────────── */
  function httpBackend(base) {
    const url = (path) => base + parts(path).map(encodeURIComponent).join('/');
    const api = (op, path) => `${base}__api/${op}?path=${encodeURIComponent(path || '')}`;
    return {
      mode: 'http',
      name: 'R&AX (yerel sunucu)',
      async list(path) {
        const r = await fetch(api('list', path), { cache: 'no-store' });
        if (!r.ok) return [];
        return (await r.json()).map((e) => (e.kind === 'file' ? Object.assign(e, { sig: `${e.size}:${e.mtime}` }) : e));
      },
      async read(path) {
        const r = await fetch(url(path), { cache: 'no-store' });
        if (!r.ok) { const e = new Error(`Dosya bulunamadı: ${path}`); e.name = 'NotFoundError'; throw e; }
        const blob = await r.blob();
        return new File([blob], parts(path).pop(), { type: blob.type, lastModified: Date.parse(r.headers.get('last-modified') || '') || Date.now() });
      },
      async write(path, data) {
        const r = await fetch(api('write', path), { method: 'PUT', body: data });
        if (!r.ok) throw new Error(`Yazılamadı: ${path} (${r.status})`);
      },
      async mkdir(path) { await fetch(api('mkdir', path), { method: 'POST' }); },
      async exists(path) { const r = await fetch(api('stat', path), { cache: 'no-store' }); return r.ok && !!(await r.json()).exists; },
      async copy(src, dst) { await this.write(dst, await this.read(src)); },
      async remove(path) {
        const r = await fetch(api('remove', path), { method: 'POST' });
        if (!r.ok) throw new Error(`Silinemedi: ${path} (${r.status} ${await r.text()})`);
      },
      async refresh() { return false; }
    };
  }

  /* ─── GitHub deposu ───────────────────────────────────────── */
  function githubBackend(remote, onStatus) {
    let head = null;
    let index = new Map();      // yol → { sha, size }
    const dirs = new Set();     // boş klasörler (Git klasör tutmaz; yalnız bu oturumda)
    let lastCheck = 0;
    let checking = null;
    let queue = [];
    let timer = null;
    let flushing = null;
    const status = { state: 'ok', lastSync: null, error: '', pending: 0 };
    const emit = (patch) => { Object.assign(status, patch); if (onStatus) onStatus(Object.assign({}, status)); };

    async function load(force) {
      const h = await remote.head();
      if (!h) { head = null; index = new Map(); return true; }
      if (!force && head && h.sha === head.sha) return false;
      head = h;
      index = await remote.tree(h.treeSha);
      emit({ lastSync: Date.now(), error: '', state: 'ok' });
      return true;
    }
    function children(path) {
      const pre = parts(path).join('/');
      const prefix = pre ? `${pre}/` : '';
      const files = [];
      const sub = new Set();
      for (const [p, e] of index) {
        if (!p.startsWith(prefix)) continue;
        const rest = p.slice(prefix.length);
        const k = rest.indexOf('/');
        if (k < 0) files.push({ name: rest, kind: 'file', size: e.size, mtime: head ? head.at : 0, sig: e.sha });
        else sub.add(rest.slice(0, k));
      }
      for (const d of dirs) {
        if (!d.startsWith(prefix)) continue;
        const rest = d.slice(prefix.length);
        if (rest) sub.add(rest.split('/')[0]);
      }
      return files.concat([...sub].map((name) => ({ name, kind: 'dir' })));
    }
    // Aynı anda en çok GH_PARALLEL indirme: GitHub ikincil hız sınırına takılmaz
    let active = 0;
    const waiting = [];
    async function limited(fn) {
      if (active >= GH_PARALLEL) await new Promise((r) => waiting.push(r));
      active += 1;
      try { return await fn(); } finally { active -= 1; const n = waiting.shift(); if (n) n(); }
    }
    async function blobBytes(sha) {
      const cached = await dbGet('blobs', sha).catch(() => null);
      if (cached) return cached;
      const bytes = await limited(() => remote.blob(sha));
      dbSet('blobs', sha, bytes).catch(() => {});
      return bytes;
    }
    async function flush() {
      if (flushing) return flushing;
      flushing = (async () => {
        while (queue.length) {
          const batch = queue;
          queue = [];
          emit({ state: 'saving', pending: batch.length });
          const entries = [];
          const seen = new Set();
          for (const it of batch.slice().reverse()) { if (!seen.has(it.path)) { seen.add(it.path); entries.unshift(it); } }
          try {
            for (let attempt = 0; ; attempt += 1) {
              if (!head) { await load(true); if (!head) { await remote.init(); await load(true); } }
              const first = entries[0].path.split('/').pop();
              const custom = entries.find((x) => x.message);
              const message = custom ? custom.message : entries.length === 1 ? `Kayıt: ${entries[0].path}` : `Kayıt: ${first} ve ${entries.length - 1} dosya (${parts(entries[0].path).slice(0, 2).join('/')})`;
              try {
                head = await remote.commit(head, entries.map((e) => (e.remove ? { path: e.path, remove: true } : e.sha ? { path: e.path, sha: e.sha } : { path: e.path, bytes: e.bytes })), message);
                break;
              } catch (e) {
                if (!e.conflict || attempt >= 4) throw e;
                await load(true);
              }
            }
            for (const e of entries) {
              if (e.remove) { index.delete(e.path); continue; }
              if (e.sha) { index.set(e.path, { sha: e.sha, size: e.size || 0 }); continue; }
              const sha = await root.RaGitHub.gitBlobSha(e.bytes);
              index.set(e.path, { sha, size: e.bytes.length });
              dbSet('blobs', sha, e.bytes).catch(() => {});
            }
            emit({ state: 'ok', pending: queue.length, lastSync: Date.now(), error: '' });
            batch.forEach((it) => it.resolve());
          } catch (e) {
            emit({ state: 'error', pending: 0, error: e.message });
            batch.forEach((it) => it.reject(e));
          }
        }
      })().finally(() => { flushing = null; });
      return flushing;
    }
    return {
      mode: 'github',
      name: remote.id,
      status: () => Object.assign({}, status),
      async init() { await load(true); return !!head; },
      get empty() { return !head; },
      async list(path) { return children(path); },
      async read(path) {
        const key = parts(path).join('/');
        const e = index.get(key);
        if (!e) { const err = new Error(`Dosya bulunamadı: ${path}`); err.name = 'NotFoundError'; throw err; }
        const bytes = await blobBytes(e.sha);
        return new File([bytes], key.split('/').pop(), { type: mimeOf(key), lastModified: head ? head.at : Date.now() });
      },
      /** Yazmalar kısa süre toplanır ve tek commit olarak gönderilir; söz commit tamamlanınca yerine gelir */
      async write(path, data) {
        const bytes = await toBytes(data);
        return this.enqueue({ path: parts(path).join('/'), bytes });
      },
      /** Kopya: aynı içerik yeniden yüklenmez, ağaçta var olan dosya kimliği kullanılır */
      async copy(src, dst) {
        const e = index.get(parts(src).join('/'));
        if (!e) { const err = new Error(`Dosya bulunamadı: ${src}`); err.name = 'NotFoundError'; throw err; }
        return this.enqueue({ path: parts(dst).join('/'), sha: e.sha, size: e.size });
      },
      /** Dosya ya da klasör (içindekilerle) silinir; opts.message: commit mesajı */
      async remove(path, opts) {
        const key = parts(path).join('/');
        for (const d of [...dirs]) if (d === key || d.startsWith(`${key}/`)) dirs.delete(d);
        const targets = [...index.keys()].filter((p) => p === key || p.startsWith(`${key}/`));
        const message = opts && opts.message;
        await Promise.all(targets.map((p) => this.enqueue({ path: p, remove: true, message })));
      },
      enqueue(item) {
        return new Promise((resolve, reject) => {
          queue.push(Object.assign(item, { resolve, reject }));
          clearTimeout(timer);
          timer = setTimeout(() => { flush(); }, GH_BATCH_MS);
        });
      },
      async mkdir(path) { dirs.add(parts(path).join('/')); },
      async exists(path) {
        const key = parts(path).join('/');
        if (index.has(key) || dirs.has(key)) return true;
        for (const p of index.keys()) if (p.startsWith(`${key}/`)) return true;
        return false;
      },
      /** Depoda yeni commit varsa ağacı yeniler (en sık GH_CHECK_MS'de bir sorar) */
      async refresh(force) {
        if (!force && Date.now() - lastCheck < GH_CHECK_MS) return false;
        if (queue.length || flushing) return false;
        if (checking) return checking;
        lastCheck = Date.now();
        checking = load(false).catch((e) => { emit({ state: 'error', error: e.message }); return false; }).finally(() => { checking = null; });
        return checking;
      }
    };
  }

  let backend = null;
  let statusFn = null;

  /** Klasör yapısını doğrular: kökte projects/ veya models/ olmalı */
  async function isRoot(b) {
    const names = new Set((await b.list('')).filter((e) => e.kind === 'dir').map((e) => e.name.toLowerCase()));
    return names.has('projects') || names.has('models');
  }

  const S = {
    get ready() { return !!backend; },
    get mode() { return backend && backend.mode; },
    get name() { return backend && backend.name; },
    get empty() { return !!(backend && backend.empty); },
    supported: () => typeof root.showDirectoryPicker === 'function',
    settings,
    onStatus(fn) { statusFn = fn; },
    status: () => (backend && backend.status ? backend.status() : null),

    /** Kayıtlı bağlantıyla açılır. Dönüş: true | { github: hata } | { saved } | { unsupported } | { first } */
    async auto() {
      const st = settings();
      if (st.mode === 'github' && st.repo && st.token) {
        try {
          await S.connectGitHub(st.repo, st.token, st.api, true);
          return true;
        } catch (e) { return { github: e }; }
      }
      if (/^https?:/.test(location.protocol)) {
        const base = location.href.replace(/[^/]*$/, '').replace(/app\/$/, '');
        const b = httpBackend(base);
        try { if (await isRoot(b)) { backend = b; return true; } } catch (e) { /* sunucu API'si yok */ }
      }
      if (st.mode !== 'klasor') return { first: true, unsupported: !S.supported() };
      if (!S.supported()) return { unsupported: true };
      let saved = null;
      try { saved = await dbGet('kv', DB_KEY); } catch (e) { saved = null; }
      if (saved) {
        try {
          if ((await saved.queryPermission({ mode: 'readwrite' })) === 'granted') {
            const b = fsBackend(saved);
            if (await isRoot(b)) { backend = b; return true; }
          }
        } catch (e) { /* klasör taşınmış olabilir */ }
      }
      return { saved };
    },
    /** GitHub deposuna bağlanır. Herkese açık depo kabul edilmez: müşteri verisi özel depoda durur. */
    async connectGitHub(repo, token, api, quiet) {
      const remote = root.RaGitHub.createRemote({ repo, token, api });
      const inf = await remote.info();
      if (!inf.private) throw new Error(`"${inf.name}" deposu herkese açık (Public). Müşteri verileri için depo gizli (Private) olmalı: GitHub'da depo → Settings → General → en altta "Change repository visibility" → Private.`);
      if (!inf.push) throw new Error('Anahtarın bu depoya yazma izni yok (Contents: Read and write gerekli).');
      const b = githubBackend(remote, (s) => { if (statusFn) statusFn(s); });
      await b.init();
      backend = b;
      if (!quiet || settings().mode !== 'github') saveSettings({ mode: 'github', repo: remote.id, token: String(token).trim(), api: api || undefined });
      return { repo: remote.id, empty: b.empty };
    },
    /** Kayıtlı klasör için izin ister (kullanıcı tıklamasıyla) */
    async resume(saved) {
      if ((await saved.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('İzin verilmedi. Uygulama bu klasör olmadan çalışamaz.');
      const b = fsBackend(saved);
      if (!(await isRoot(b))) throw new Error(`"${saved.name}" klasöründe projects / models bulunamadı. Klasör taşınmış olabilir, yeniden seçin.`);
      backend = b;
      saveSettings({ mode: 'klasor' });
    },
    /** Klasör seçtirir */
    async pick() {
      const h = await root.showDirectoryPicker({ id: 'risk-analizi-root', mode: 'readwrite' });
      const b = fsBackend(h);
      if (!(await isRoot(b))) throw new Error(`"${h.name}" klasöründe projects / models bulunamadı. "Risk Analizi" kısayolunun bulunduğu ana klasörü (R&AX) seçin.`);
      await dbSet('kv', DB_KEY, h);
      backend = b;
      saveSettings({ mode: 'klasor' });
    },
    /** Bağlantı ayarını siler (anahtar tarayıcıdan kaldırılır) */
    forget() { saveSettings({}); },
    list: async (p) => (await backend.list(p)).sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    read: (p) => backend.read(p),
    async text(p) { return (await backend.read(p)).text(); },
    write: (p, d) => backend.write(p, d),
    mkdir: (p) => backend.mkdir(p),
    exists: (p) => backend.exists(p),
    copy: (a, b) => backend.copy(a, b),
    remove: (p, o) => backend.remove(p, o),
    refresh: (force) => backend.refresh(force),
    /** Klasördeki dosyaların göreli yolları (alt klasörler dahil; _eski, cikti, kaynak, raporlar hariç) */
    async walk(dir, skipExtra) {
      const out = [];
      const sig = [];
      const meta = {};
      const skip = new Set([...SKIP, ...(skipExtra || [])]);
      async function go(rel) {
        const entries = await backend.list(rel ? `${dir}/${rel}` : dir);
        for (const e of entries.sort((a, b) => a.name.localeCompare(b.name, 'tr'))) {
          const r = rel ? `${rel}/${e.name}` : e.name;
          if (e.kind === 'dir') { if (!skip.has(e.name)) await go(r); } else {
            out.push(`${dir}/${r}`);
            sig.push(`${r}:${e.sig}`);
            meta[`${dir}/${r}`] = e.sig;
          }
        }
      }
      await go('');
      return { files: out, sig: sig.join('|'), meta };
    }
  };

  root.RaStore = S;
})(typeof self !== 'undefined' ? self : this);
