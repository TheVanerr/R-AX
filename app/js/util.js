/* Ortak yardımcılar: kaçış, zengin metin (md satır içi → HTML), sayı biçimleri, tarih. DOM'a bağlı değildir. */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.RaUtil = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const pad2 = (n) => String(n).padStart(2, '0');
  const todayStr = () => {
    const d = new Date();
    return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
  };
  const strip = (s) => String(s || '').replace(/<[^>]+>/g, '');

  /** Metin: HTML kaçışlı; b/i/sub/sup/br etiketleri, **kalın**, *eğik* ve &lt; gibi varlıklar korunur.
      [..] doldurulacak alan (sarı) olur; [K1] gibi kaynak etiketleri normal metin kalır. */
  function rich(s) {
    let h = esc(s)
      .replace(/&lt;(\/?)(b|i|sub|sup|br|u)\s*\/?&gt;/g, '<$1$2>')
      .replace(/&amp;(lt|gt|shy|nbsp|amp|ndash|mdash);/g, '&$1;')
      .replace(/\*\*([^*\n][^*]*?)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*\w])\*([^*\s][^*\n]*?)\*(?![*\w])/g, '$1<i>$2</i>');
    h = h.replace(/\[([^\]\n]{1,80})\]/g, (m, t) => (/^K\d+$/.test(t) ? m : `<span class="tbd">[${t}]</span>`));
    return h.replace(/\n/g, '<br>');
  }

  /** "0,06" / ">599.9" / "1 500" → { n, gt, lt, d } (d: ondalık hane) */
  function parseNum(v) {
    const s = String(v == null ? '' : v).trim();
    if (!s) return null;
    const gt = /^[>≥]/.test(s);
    const lt = /^[<≤]/.test(s);
    const t = s.replace(/^[><≥≤]\s*/, '').replace(/\s+/g, '').replace(',', '.');
    const n = parseFloat(t);
    if (Number.isNaN(n)) return null;
    const m = t.match(/\.(\d+)/);
    return { n, gt, lt, d: m ? m[1].length : 0 };
  }
  const num = (v) => { const p = parseNum(v); return p ? p.n : null; };

  /** Ondalık ayraçlı biçim (TR/DE virgül, EN nokta) */
  const fmtDec = (v, d, dec) => (v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(d).replace('.', dec || ','));
  const fmtInt = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  /** Dosya adı için güvenli metin */
  const safeName = (s) => String(s || '').replace(/[\\/:*?"<>|[\]]+/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'rapor';

  /** Yol birleştirme: "projects/a" + "foto/x.jpg" → "projects/a/foto/x.jpg"; ".." desteklenir */
  function joinPath(dir, rel) {
    if (!rel) return dir || '';
    if (/^(https?:|data:|blob:)/.test(rel)) return rel;
    const parts = (rel.startsWith('/') ? [] : String(dir || '').split('/')).concat(String(rel).split('/'));
    const out = [];
    for (const p of parts) {
      if (!p || p === '.') continue;
      if (p === '..') out.pop();
      else out.push(p);
    }
    return out.join('/');
  }

  return { esc, pad2, todayStr, strip, rich, parseNum, num, fmtDec, fmtInt, safeName, joinPath };
});
