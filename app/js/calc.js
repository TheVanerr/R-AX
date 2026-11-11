/* Hesap motoru: risk skoru (O × Ş, 5×5) ve EN ISO 13849-1 (PLr risk grafiği, Tablo 7, PL_low birleşimi, CCF).
   DOM'a bağlı değildir. */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.RaCalc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PL_ORDER = 'abcde';
  const PL_COLOR = { a: '#16a34a', b: '#65a30d', c: '#ca8a04', d: '#ea580c', e: '#b91c1c' };
  /** EN ISO 13849-1 Ek A risk grafiği: S → F → P → PLr */
  const PLR_GRAPH = { 1: { 1: { 1: 'a', 2: 'b' }, 2: { 1: 'b', 2: 'c' } }, 2: { 1: { 1: 'c', 2: 'd' }, 2: { 1: 'd', 2: 'e' } } };

  const plrOf = (sf) => (PLR_GRAPH[sf.S] && PLR_GRAPH[sf.S][sf.F] && PLR_GRAPH[sf.S][sf.F][sf.P]) || null;
  /** R = O × Ş → r1 (1–6 kabul edilebilir), r2 (8–12 ALARP), r3 (15–25 kabul edilemez) */
  const riskLevel = (r) => (r <= 6 ? 'r1' : r <= 12 ? 'r2' : 'r3');
  const plGE = (a, b) => !!a && !!b && PL_ORDER.indexOf(a) >= PL_ORDER.indexOf(b);
  const numOrNull = (v) => {
    if (v === '' || v == null) return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(/\s+/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  /** Yıllık çevrim sayısı: d_op · h_op · 60 / t_çevrim (t dakika) */
  function nopOf(p) {
    const f = (p.limits && p.limits.profile) || {};
    return f.tcycle > 0 ? Math.round((f.dop * f.hop * 60) / f.tcycle) : 0;
  }

  /** Basitleştirilmiş yöntem — EN ISO 13849-1 Tablo 7 */
  function tablePL(cat, mttfdCls, dcCls) {
    if (!mttfdCls) return null;
    const i = { low: 0, medium: 1, high: 2 }[mttfdCls];
    const dc = dcCls === 'high' ? 'medium' : dcCls; // Kat. 2–3 için "yüksek" DC orta sütununda değerlendirilir
    switch (cat) {
      case 'B': return ['a', 'b', 'b'][i];
      case '1': return [null, null, 'c'][i];
      case '2': return dc === 'low' ? ['a', 'b', 'c'][i] : dc === 'medium' ? ['b', 'c', 'd'][i] : null;
      case '3': return dc === 'low' ? ['b', 'c', 'd'][i] : dc === 'medium' ? ['c', 'd', 'd'][i] : null;
      case '4': return dcCls === 'high' ? [null, null, 'e'][i] : null;
      default: return null;
    }
  }

  /** Alt sistem: MTTFd (B10D'den veya doğrudan), sınıflar, PL */
  function evalSub(sub, nopDefault) {
    const r = { mttfdRaw: null, mttfd: null, capped: false, cls: null, dcCls: null, pl: null, t10d: null, override: !!sub.plOverride, cappedPL: false };
    const cap = sub.cat === '4' ? 2500 : 100;
    const b10d = numOrNull(sub.b10d);
    const nop = numOrNull(sub.nop) || nopDefault;
    if (b10d && nop) {
      r.mttfdRaw = b10d / (0.1 * nop);
      r.t10d = b10d / nop;
    } else if (numOrNull(sub.mttfd) != null) r.mttfdRaw = numOrNull(sub.mttfd);
    if (r.mttfdRaw != null) {
      r.mttfd = Math.min(r.mttfdRaw, cap);
      r.capped = r.mttfdRaw > cap;
      r.cls = r.mttfd < 3 ? null : r.mttfd < 10 ? 'low' : r.mttfd < 30 ? 'medium' : 'high';
    }
    const dc = numOrNull(sub.dc);
    r.dcCls = dc == null || dc < 60 ? 'none' : dc < 90 ? 'low' : dc < 99 ? 'medium' : 'high';
    if (r.override) {
      r.pl = sub.plOverride;
      return r;
    }
    r.pl = tablePL(sub.cat, r.cls, r.dcCls);
    if (r.pl && sub.plCap && PL_ORDER.indexOf(sub.plCap) < PL_ORDER.indexOf(r.pl)) {
      r.pl = sub.plCap;
      r.cappedPL = true;
    }
    return r;
  }

  /** Alt sistemlerin birleşimi — EN ISO 13849-1 §6.1.9 (PL_low kuralı) */
  function combinePL(pls) {
    if (!pls.length || pls.some((x) => !x)) return { low: null, n: 0, pl: null };
    const low = pls.reduce((a, b) => (PL_ORDER.indexOf(b) < PL_ORDER.indexOf(a) ? b : a));
    const n = pls.filter((x) => x === low).length;
    const [max, lower] = { a: [3, null], b: [2, 'a'], c: [2, 'b'], d: [3, 'c'], e: [3, 'd'] }[low];
    return { low, n, pl: n > max ? lower : low };
  }

  const ccfScore = (p) => (p.ccf || []).reduce((s, c) => s + (c.applied ? c.max : 0), 0);

  function evalSF(sf, p) {
    const nop = nopOf(p);
    const subs = sf.subs.map((s) => evalSub(s, nop));
    const comb = combinePL(subs.map((s) => s.pl));
    const plr = plrOf(sf);
    return {
      subs, ...comb, plr,
      ok: plGE(comb.pl, plr),
      ccfOk: ccfScore(p) >= 65 || !sf.subs.some((s) => ['2', '3', '4'].includes(s.cat))
    };
  }

  return { PL_ORDER, PL_COLOR, PLR_GRAPH, plrOf, riskLevel, plGE, numOrNull, nopOf, tablePL, evalSub, combinePL, ccfScore, evalSF };
});
