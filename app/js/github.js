/* GitHub deposu veritabanı olarak (P&PX ile aynı yöntem). Sunucu kodu yoktur, tarayıcı doğrudan GitHub API'siyle konuşur.
   Okuma: dal başı → ağaç (yol, dosya kimliği, boyut) → dosya içeriği (kimliğe göre önbelleklenir, içerik değişmez).
   Yazma: değişen dosyalar tek commit olur; dal başı "yalnız ileri" güncellenir, başka cihaz arada göndermişse
   GitHub reddeder, hiçbir şey ezilmez (çağıran yeni başla yeniden dener). Herkese açık depoya bağlanılmaz. */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.RaGitHub = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const API = 'https://api.github.com';
  const INLINE_LIMIT = 100 * 1024;

  function isText(bytes) {
    try {
      new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
      return true;
    } catch (e) {
      return false;
    }
  }
  function bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }
  function base64ToBytes(text) {
    const binary = atob(String(text).replace(/\s/g, ''));
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  }
  /** Git'in dosya kimliği: aynı içerik her yerde aynı değeri verir */
  async function gitBlobSha(bytes) {
    const header = new TextEncoder().encode(`blob ${bytes.length}\0`);
    const all = new Uint8Array(header.length + bytes.length);
    all.set(header);
    all.set(bytes, header.length);
    const digest = await crypto.subtle.digest('SHA-1', all);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const failure = (message, extra) => Object.assign(new Error(message), extra);

  async function explain(res) {
    let detail = '';
    try { detail = (await res.json()).message || ''; } catch (e) { /* gövde JSON değil */ }
    const retryAfter = Number(res.headers.get('retry-after')) || 0;
    const limited = retryAfter > 0 || res.headers.get('x-ratelimit-remaining') === '0' || /rate limit/i.test(detail);
    if (res.status === 401) return failure('GitHub erişim anahtarı geçersiz ya da süresi dolmuş. Bağlantı ekranından yeni anahtar girin.', { auth: true });
    if ((res.status === 403 || res.status === 429) && limited) return failure('GitHub hız sınırına ulaşıldı; biraz sonra yeniden denenecek.', { retryAfterMs: (retryAfter || 60) * 1000 });
    if (res.status === 403) return failure('Anahtarın bu depoya yazma izni yok (Contents: Read and write gerekli).', { auth: true });
    if (res.status === 404) return failure('Depo bulunamadı ya da anahtarın bu depoya erişimi yok ("Only select repositories" altında depo seçili olmalı).', { auth: true });
    if (res.status >= 500) return failure('GitHub şu an yanıt vermiyor; biraz sonra yeniden deneyin.', { offline: true });
    return failure(`GitHub hatası ${res.status}: ${detail}`, { status: res.status });
  }

  /** options: { repo: "kullanici/depo", token, api (test sunucusu için), fetchFn } */
  function createRemote(options) {
    const [owner, name] = String(options.repo || '').trim().split('/');
    if (!owner || !name) throw new Error('Depo adı kullanici/depo biçiminde olmalı (ör. TheVanerr/riskanalizix-veri)');
    const token = String(options.token || '').trim();
    const fetchFn = options.fetchFn || ((...args) => fetch(...args));
    const base = `${options.api || API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
    let branch = null;
    let emptyBlob = null;

    async function send(method, path, body, allow) {
      let res;
      try {
        res = await fetchFn(`${base}${path}`, {
          method,
          // GitHub yanıtları önbelleğe alınabilir; eski dal başı okunursa eşitleme yanılır
          cache: 'no-store',
          headers: Object.assign({ Accept: 'application/vnd.github+json' }, token ? { Authorization: `Bearer ${token}` } : {}, body ? { 'Content-Type': 'application/json' } : {}),
          body: body ? JSON.stringify(body) : undefined
        });
      } catch (e) {
        throw failure('GitHub\'a ulaşılamadı. İnternet bağlantısını kontrol edin.', { offline: true });
      }
      if (allow && allow.includes(res.status)) return { status: res.status, data: null };
      if (!res.ok) throw await explain(res);
      return { status: res.status, data: res.status === 204 ? null : await res.json() };
    }

    async function info() {
      const { data } = await send('GET', '');
      branch = data.default_branch || 'main';
      return { private: !!data.private, branch, name: data.full_name || `${owner}/${name}`, push: !data.permissions || !!data.permissions.push };
    }
    async function ensureBranch() {
      if (!branch) await info();
      return branch;
    }
    /** Dal başı commit'i; depo boşsa null (GitHub boş depoda 409 döndürür) */
    async function head() {
      const { data } = await send('GET', `/git/ref/heads/${await ensureBranch()}`, null, [404, 409]);
      if (!data) return null;
      const c = (await send('GET', `/git/commits/${data.object.sha}`)).data;
      return { sha: data.object.sha, treeSha: c.tree.sha, at: Date.parse(c.committer.date) || Date.now() };
    }
    /** @returns yol → { sha, size } */
    async function tree(sha) {
      const { data } = await send('GET', `/git/trees/${sha}?recursive=1`);
      if (data.truncated) throw new Error('Depo bir seferde okunamayacak kadar büyük');
      return new Map(data.tree.filter((e) => e.type === 'blob').map((e) => [e.path, { sha: e.sha, size: e.size || 0 }]));
    }
    /** Dosya içeriği ham bayt olarak (application/vnd.github.raw+json): base64'e göre %27 daha az veri, çözme yok */
    async function blob(sha) {
      let res;
      try {
        res = await fetchFn(`${base}/git/blobs/${sha}`, { cache: 'force-cache', headers: Object.assign({ Accept: 'application/vnd.github.raw+json' }, token ? { Authorization: `Bearer ${token}` } : {}) });
      } catch (e) {
        throw failure("GitHub'a ulaşılamadı. İnternet bağlantısını kontrol edin.", { offline: true });
      }
      if (!res.ok) throw await explain(res);
      if (/json/i.test(res.headers.get('content-type') || '')) return base64ToBytes((await res.json()).content);
      return new Uint8Array(await res.arrayBuffer());
    }
    /** Boş depoda ağaç ve commit oluşturulamaz; ilk commit dosya arayüzüyle atılır.
        Kökte dosya açılmaz: yerel çalışma kopyası R&AX kökünü paylaşır (kökteki README.md uygulamanındır). */
    async function init() {
      await send('PUT', '/contents/projects/.gitkeep', { message: 'Risk Analizi veri deposu', content: '' });
    }
    const canInline = (bytes) => bytes.length > 0 && bytes.length <= INLINE_LIMIT && isText(bytes);
    async function postBlob(bytes) {
      const { data } = await send('POST', '/git/blobs', { content: bytesToBase64(bytes), encoding: 'base64' });
      return data.sha;
    }
    async function treeEntry(entry) {
      const row = { path: entry.path, mode: '100644', type: 'blob' };
      if (entry.remove) return Object.assign(row, { sha: null });
      if (entry.sha) return Object.assign(row, { sha: entry.sha });
      if (canInline(entry.bytes)) return Object.assign(row, { content: new TextDecoder('utf-8', { ignoreBOM: true }).decode(entry.bytes) });
      if (entry.bytes.length) return Object.assign(row, { sha: await postBlob(entry.bytes) });
      if (!emptyBlob) emptyBlob = await postBlob(entry.bytes);
      return Object.assign(row, { sha: emptyBlob });
    }
    /** entries: [{ path, bytes } | { path, sha } (kopya) | { path, remove: true }] → yeni baş; arada başka commit varsa { conflict } */
    async function commit(base0, entries, message) {
      const rows = [];
      for (const entry of entries) rows.push(await treeEntry(entry));
      const newTree = (await send('POST', '/git/trees', { base_tree: base0.treeSha, tree: rows })).data;
      const created = (await send('POST', '/git/commits', { message, tree: newTree.sha, parents: [base0.sha] })).data;
      const moved = await send('PATCH', `/git/refs/heads/${await ensureBranch()}`, { sha: created.sha, force: false }, [409, 422]);
      if (!moved.data) throw failure('Depo arada değişti', { conflict: true });
      return { sha: created.sha, treeSha: newTree.sha, at: Date.parse(created.committer && created.committer.date) || Date.now() };
    }

    return { id: `${owner}/${name}`, info, head, tree, blob, init, commit, canInline };
  }

  return { createRemote, gitBlobSha, bytesToBase64, base64ToBytes };
});
