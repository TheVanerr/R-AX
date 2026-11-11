/* Kural motoru: ölçümlerin değerlendirilmesi ve rapora otomatik eklenenler.

   KURALLAR (sınır değerler app/js/library.js içinde):
   1. Elektrik (EN 60204-1 §18): R_PE ≤ sınır (0,10 Ω), R_ISO ≥ sınır (1 MΩ @ 500 V DC), HV kaçak akım ≤ sınır, delinme yok.
   2. Gürültü (2006/42/AT Ek I 1.7.4.2 u, 2003/10/AT, EN ISO 11202):
      arka plan farkı ΔL ≥ 10 dB → düzeltme yok; 3 ≤ ΔL < 10 → K1 = −10·lg(1 − 10^(−0,1·ΔL)); ΔL < 3 → geçersiz.
      Operatör konumu LpA ≤ 70 → "≤ 70 dB(A)" beyanı; > 70 → değer beyanı; > 80 → LWA beyanı + kulak koruyucu önerisi (M003);
      > 85 → kulak koruyucu zorunlu; ≥ 87 → kaynakta gürültü azaltma (açık aksiyon). LCpeak > 130 dB(C) → tepe değer beyanı.
   3. Termal (EN ISO 13732-1, çıplak metal): en yüksek geçerli değer (çıplak sac işaretçileri hariç)
      ≤ 10 s eşiği (55 °C) → uygun; ≤ 1 s eşiği (sınır, 65 °C) → uygun + W017 etiketi ve kılavuz uyarısı; > sınır → açık aksiyon.
   4. Ölçüme bağlı tehlike ("- ölçüm: elektrik | gürültü | termal"): ölçüm sonucu önlem satırı olarak eklenir; "risk:" yazılmamışsa
      O/Ş değerleri sonuç sınıfından alınır. Uygunsuz sonuç → [Ö] önlem + aksiyon + artık risk yükselir.
   5. Kontrol listesi: eksik/uyumsuz bilgi, PL < PLr, CCF < 65, yüksek artık risk, eksik çeviri, bulunamayan dosya vb.

   DOM'a bağlı değildir; tarayıcıda ve Node'da (app/araclar/kontrol.mjs) aynı kod çalışır. */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./calc.js'), require('./util.js'), require('./library.js'), require('./thermal.js'));
  else root.RaRules = factory(root.RaCalc, root.RaUtil, root.RA_LIB, root.RaThermal);
})(typeof self !== 'undefined' ? self : this, function (C, U, LIB, TH) {
  'use strict';

  const LANGS = ['tr', 'en', 'de'];
  const DEC = { tr: ',', en: '.', de: ',' };
  const f = (v, d, lang) => U.fmtDec(v, d, DEC[lang]);
  const ml = (fn) => ({ tr: fn('tr'), en: fn('en'), de: fn('de') });
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const has = (o) => o && LANGS.some((l) => o[l] && String(o[l]).trim());

  /* ─── 1. Elektrik ────────────────────────────────────────── */
  function measPass(kind, m, lim) {
    if (!m) return null;
    if (kind === 'rpe') return m.n <= lim.rpeMax;
    if (kind === 'iso') return m.n >= lim.isoMin;
    return m.n <= lim.hvMax;
  }
  function evalElec(p) {
    const E = p.elec;
    const lim = E.limits;
    const out = { any: false, n: 0, fails: 0, pass: null };
    for (const kind of ['rpe', 'iso', 'hv']) {
      const rows = E[kind].map((r) => ({ r, m: U.parseNum(r.value) }));
      const valid = rows.filter((x) => x.m);
      const s = { kind, rows, n: valid.length, missing: rows.length - valid.length, pass: null, fails: 0, lo: null, hi: null, allGt: false };
      if (valid.length) {
        valid.forEach((x) => { x.ok = measPass(kind, x.m, lim); });
        s.fails = valid.filter((x) => !x.ok).length;
        s.pass = s.fails === 0;
        s.lo = valid.reduce((a, b) => (b.m.n < a.m.n ? b : a)).m;
        s.hi = valid.reduce((a, b) => (b.m.n > a.m.n ? b : a)).m;
        s.allGt = valid.every((x) => x.m.gt);
      }
      out[kind] = s;
      out.n += s.n;
      out.fails += s.fails;
    }
    out.any = out.n > 0;
    out.pass = out.any ? out.fails === 0 : null;
    return out;
  }
  const elecRange = (s, unit, lang) => {
    if (!s.n) return '—';
    const fm = (m) => `${m.gt ? '> ' : ''}${f(m.n, m.d, lang)}`;
    if (s.lo.n === s.hi.n) return `${fm(s.lo)} ${unit}`;
    return `${fm(s.lo)} – ${fm(s.hi)} ${unit}`;
  };

  /* ─── 2. Gürültü ─────────────────────────────────────────── */
  function evalNoise(p) {
    const G = p.noise;
    const NL = LIB.noiseLimits;
    const rows = (G.rows || []).map((row) => {
      const lpa = U.num(row.lpa);
      const lcpeak = U.num(row.lcpeak);
      const bg = U.num(row.bg) != null ? U.num(row.bg) : (G.bg != null ? +G.bg : null);
      const r = { row, lpa, lcpeak, bg, delta: null, K1: 0, corr: lpa, valid: lpa != null, grade: null };
      if (lpa != null && bg != null) {
        r.delta = lpa - bg;
        if (r.delta >= 10) r.K1 = 0;
        else if (r.delta >= 3) r.K1 = -10 * Math.log10(1 - 10 ** (-0.1 * r.delta));
        else { r.valid = false; r.K1 = null; }
        r.grade = r.delta >= 6 ? 2 : r.delta >= 3 ? 3 : null;
        r.corr = r.K1 != null ? Math.round((lpa - r.K1) * 10) / 10 : lpa;
      }
      return r;
    });
    const meas = rows.filter((r) => r.lpa != null);
    const out = { rows, n: meas.length, any: meas.length > 0, K: G.K != null ? +G.K : NL.defaultK };
    if (!out.any) return out;
    const opNos = G.operatorRows && G.operatorRows.length ? G.operatorRows : null;
    rows.forEach((r) => { r.op = !opNos || opNos.includes(String(r.row.no)); });
    const val = (r) => r.corr;
    out.max = meas.reduce((a, b) => (val(b) > val(a) ? b : a));
    out.min = meas.reduce((a, b) => (val(b) < val(a) ? b : a));
    const ops = meas.filter((r) => r.op);
    out.op = (ops.length ? ops : meas).reduce((a, b) => (val(b) > val(a) ? b : a));
    out.opMax = val(out.op);
    const peaks = rows.filter((r) => r.lcpeak != null);
    out.peakMax = peaks.length ? Math.max(...peaks.map((r) => r.lcpeak)) : null;
    out.invalid = rows.filter((r) => r.lpa != null && !r.valid).length;
    const v = out.opMax;
    out.cls = v <= NL.declare ? 'decl70' : v <= NL.lowerAction ? 'declare' : v <= NL.upperAction ? 'lower' : v < NL.limit ? 'upper' : 'limit';
    out.needLWA = v > NL.power;
    out.needPeak = out.peakMax != null && out.peakMax > NL.peakDb;
    out.pass = out.cls !== 'limit' && !out.invalid && !(out.needLWA && G.LWA == null);
    return out;
  }

  /* ─── 3. Termal ──────────────────────────────────────────── */
  function evalThermal(p) {
    const T = p.thermal;
    const imgs = (T.images || []).filter((t) => t.T);
    const out = { images: imgs, any: imgs.length > 0, limit: C.numOrNull(T.limit) != null ? C.numOrNull(T.limit) : LIB.thermalDefaultLimit };
    if (!out.any) return out;
    out.sums = imgs.map((t) => TH.summary(t));
    out.top = out.sums.reduce((a, s, i) => (s.max != null && (!a || s.max > a.max) ? { max: s.max, i, s } : a), null);
    out.max = out.top ? out.top.max : null;
    const t10 = (LIB.thermalThresholds.find((x) => x.t === '10 s') || {}).lo || 55;
    out.t10 = t10;
    out.cls = out.max == null ? null : out.max <= t10 ? 'cool' : out.max <= out.limit ? 'warm' : 'hot';
    out.exceeded = LIB.thermalThresholds.filter((x) => out.max != null && out.max > x.lo).map((x) => x.t);
    out.pass = out.max == null ? null : out.max <= out.limit;
    return out;
  }

  /* ─── 4. Otomatik önlemler ───────────────────────────────── */
  const RT = {
    elecOk: (e, p, lang) => {
      const L = p.elec.limits;
      const T = {
        tr: `EN 60204-1 Bölüm 18 testleri ${p.elec.date || '[tarih]'} tarihinde yapılmıştır: koruma iletkeni sürekliliği ${e.rpe.n} noktada ${elecRange(e.rpe, 'Ω', lang)} (ölçüt ≤ ${f(L.rpeMax, 2, lang)} Ω), yalıtım direnci ${e.iso.n} ölçümde ${elecRange(e.iso, 'MΩ', lang)} (ölçüt ≥ ${f(L.isoMin, 2, lang)} MΩ), gerilim dayanımında ${e.hv.n} ölçümde delinme olmamış, kaçak akım ${elecRange(e.hv, 'mA', lang)} (ölçüt ≤ ${f(L.hvMax, 2, lang)} mA) — uygun (Bölüm 12)`,
        en: `The EN 60204-1 Section 18 tests were carried out on ${p.elec.date || '[date]'}: protective bonding continuity ${elecRange(e.rpe, 'Ω', lang)} at ${e.rpe.n} points (criterion ≤ ${f(L.rpeMax, 2, lang)} Ω), insulation resistance ${elecRange(e.iso, 'MΩ', lang)} in ${e.iso.n} measurements (criterion ≥ ${f(L.isoMin, 2, lang)} MΩ), no breakdown in ${e.hv.n} voltage tests, leakage current ${elecRange(e.hv, 'mA', lang)} (criterion ≤ ${f(L.hvMax, 2, lang)} mA) — passed (Section 12)`,
        de: `Die Prüfungen nach EN 60204-1 Abschnitt 18 wurden am ${p.elec.date || '[Datum]'} durchgeführt: Schutzleiterdurchgängigkeit ${elecRange(e.rpe, 'Ω', lang)} an ${e.rpe.n} Punkten (Kriterium ≤ ${f(L.rpeMax, 2, lang)} Ω), Isolationswiderstand ${elecRange(e.iso, 'MΩ', lang)} bei ${e.iso.n} Messungen (Kriterium ≥ ${f(L.isoMin, 2, lang)} MΩ), kein Durchschlag bei ${e.hv.n} Spannungsprüfungen, Ableitstrom ${elecRange(e.hv, 'mA', lang)} (Kriterium ≤ ${f(L.hvMax, 2, lang)} mA) — bestanden (Abschnitt 12)`
      };
      return T[lang];
    },
    elecFail: (e, p, lang) => {
      const parts = ['rpe', 'iso', 'hv'].filter((k) => e[k].fails).map((k) => `${{ rpe: 'R<sub>PE</sub>', iso: 'R<sub>ISO</sub>', hv: 'HV' }[k]} ${e[k].fails}`);
      return {
        tr: `EN 60204-1 Bölüm 18 testlerinde ${e.fails} ölçüm ölçütü sağlamamıştır (${parts.join(', ')}; Bölüm 12); hata giderilmeli ve testler tekrarlanmalıdır`,
        en: `In the EN 60204-1 Section 18 tests ${e.fails} measurements do not meet the criterion (${parts.join(', ')}; Section 12); the fault must be corrected and the tests repeated`,
        de: `Bei den Prüfungen nach EN 60204-1 Abschnitt 18 erfüllen ${e.fails} Messungen das Kriterium nicht (${parts.join(', ')}; Abschnitt 12); der Fehler ist zu beheben und die Prüfungen sind zu wiederholen`
      }[lang];
    },
    elecNone: (lang) => ({
      tr: 'EN 60204-1 Bölüm 18 testleri (koruma iletkeni sürekliliği, yalıtım direnci, gerilim dayanımı) yapılmalı ve sonuçlar Bölüm 12\'ye işlenmelidir',
      en: 'The EN 60204-1 Section 18 tests (protective bonding continuity, insulation resistance, voltage test) are to be carried out and recorded in Section 12',
      de: 'Die Prüfungen nach EN 60204-1 Abschnitt 18 (Schutzleiterdurchgängigkeit, Isolationswiderstand, Spannungsprüfung) sind durchzuführen und in Abschnitt 12 einzutragen'
    }[lang]),
    noiseMeas: (g, p, lang) => {
      const G = p.noise;
      const dev = G.instrument ? ` (${G.instrument})` : '';
      const lo = f(g.min.corr, 1, lang);
      const hi = f(g.max.corr, 1, lang);
      const rng = lo === hi ? `${hi} dB(A)` : `${lo}–${hi} dB(A)`;
      return {
        tr: `Gürültü ölçümü${dev}: ${g.n} noktada A-ağırlıklı ses basınç seviyesi ${rng}; operatör konumunda en yüksek değer ${f(g.opMax, 1, lang)} dB(A) (Ek ${g.annex})`,
        en: `Noise measurement${dev}: A-weighted sound pressure level ${rng} at ${g.n} points; highest value at the operator position ${f(g.opMax, 1, lang)} dB(A) (Annex ${g.annex})`,
        de: `Geräuschmessung${dev}: A-bewerteter Schalldruckpegel ${rng} an ${g.n} Punkten; höchster Wert am Bedienerplatz ${f(g.opMax, 1, lang)} dB(A) (Anhang ${g.annex})`
      }[lang];
    },
    noiseDecl: (g, p, lang) => {
      const v = f(g.opMax, 1, lang);
      const K = f(g.K, 1, lang);
      const T = {
        decl70: { tr: 'Operatör konumundaki A-ağırlıklı emisyon ses basınç seviyesinin 70 dB(A)\'yı aşmadığı kullanım kılavuzunda beyan edilmiştir (2006/42/AT Ek I 1.7.4.2 u)', en: 'The instruction manual declares that the A-weighted emission sound pressure level at the operator position does not exceed 70 dB(A) (2006/42/EC Annex I 1.7.4.2 u)', de: 'In der Betriebsanleitung ist angegeben, dass der A-bewertete Emissions-Schalldruckpegel am Bedienerplatz 70 dB(A) nicht überschreitet (2006/42/EG Anhang I 1.7.4.2 u)' },
        declare: { tr: `Ölçülen en yüksek değer 70 dB(A)'yı aştığından operatör konumundaki emisyon ses basınç seviyesi (L<sub>pA</sub> = ${v} dB(A), K = ${K} dB) kullanım kılavuzunda beyan edilmiştir (2006/42/AT Ek I 1.7.4.2 u); değer 80 dB(A) alt eylem değerinin (2003/10/AT) altında olduğundan kulak koruyucu zorunlu değildir`, en: `As the highest measured value exceeds 70 dB(A), the emission sound pressure level at the operator position (L<sub>pA</sub> = ${v} dB(A), K = ${K} dB) is declared in the instruction manual (2006/42/EC Annex I 1.7.4.2 u); as it is below the lower exposure action value of 80 dB(A) (2003/10/EC), hearing protection is not mandatory`, de: `Da der höchste Messwert 70 dB(A) überschreitet, ist der Emissions-Schalldruckpegel am Bedienerplatz (L<sub>pA</sub> = ${v} dB(A), K = ${K} dB) in der Betriebsanleitung angegeben (2006/42/EG Anhang I 1.7.4.2 u); da er unter dem unteren Auslösewert von 80 dB(A) (2003/10/EG) liegt, ist Gehörschutz nicht vorgeschrieben` },
        lower: { tr: `Operatör konumundaki emisyon ses basınç seviyesi (L<sub>pA</sub> = ${v} dB(A), K = ${K} dB) kullanım kılavuzunda beyan edilmiştir; 80 dB(A) alt eylem değeri aşıldığından kulak koruyucu kullanımı önerilmiş ve M003 işareti uygulanmıştır (2003/10/AT)`, en: `The emission sound pressure level at the operator position (L<sub>pA</sub> = ${v} dB(A), K = ${K} dB) is declared in the instruction manual; as the lower exposure action value of 80 dB(A) is exceeded, the use of hearing protection is recommended and sign M003 has been applied (2003/10/EC)`, de: `Der Emissions-Schalldruckpegel am Bedienerplatz (L<sub>pA</sub> = ${v} dB(A), K = ${K} dB) ist in der Betriebsanleitung angegeben; da der untere Auslösewert von 80 dB(A) überschritten wird, wird Gehörschutz empfohlen und das Zeichen M003 wurde angebracht (2003/10/EG)` },
        upper: { tr: `Operatör konumundaki emisyon ses basınç seviyesi (L<sub>pA</sub> = ${v} dB(A), K = ${K} dB) kullanım kılavuzunda beyan edilmiştir; 85 dB(A) üst eylem değeri aşıldığından kulak koruyucu kullanımı zorunludur, M003 işareti uygulanmıştır (2003/10/AT)`, en: `The emission sound pressure level at the operator position (L<sub>pA</sub> = ${v} dB(A), K = ${K} dB) is declared in the instruction manual; as the upper exposure action value of 85 dB(A) is exceeded, hearing protection is mandatory and sign M003 has been applied (2003/10/EC)`, de: `Der Emissions-Schalldruckpegel am Bedienerplatz (L<sub>pA</sub> = ${v} dB(A), K = ${K} dB) ist in der Betriebsanleitung angegeben; da der obere Auslösewert von 85 dB(A) überschritten wird, ist Gehörschutz Pflicht und das Zeichen M003 wurde angebracht (2003/10/EG)` },
        limit: { tr: `Operatör konumunda ${v} dB(A) ölçülmüştür; 87 dB(A) maruziyet sınır değerinin üzerinde olduğundan kaynakta gürültü azaltma önlemleri (yalıtım, sönümleme, kapsülleme) uygulanmalıdır`, en: `${v} dB(A) was measured at the operator position; as this exceeds the exposure limit value of 87 dB(A), noise reduction measures at source (insulation, damping, enclosure) must be applied`, de: `Am Bedienerplatz wurden ${v} dB(A) gemessen; da dies den Expositionsgrenzwert von 87 dB(A) überschreitet, sind Lärmminderungsmaßnahmen an der Quelle (Dämmung, Dämpfung, Kapselung) umzusetzen` }
      };
      return T[g.cls][lang];
    },
    noiseLWA: (lang) => ({
      tr: 'Operatör konumunda 80 dB(A) aşıldığından A-ağırlıklı ses gücü seviyesi L<sub>WA</sub> ölçülmeli ve kullanım kılavuzunda beyan edilmelidir (EN ISO 3744 / 3746)',
      en: 'As 80 dB(A) is exceeded at the operator position, the A-weighted sound power level L<sub>WA</sub> must be measured and declared in the instruction manual (EN ISO 3744 / 3746)',
      de: 'Da am Bedienerplatz 80 dB(A) überschritten werden, ist der A-bewertete Schallleistungspegel L<sub>WA</sub> zu messen und in der Betriebsanleitung anzugeben (EN ISO 3744 / 3746)'
    }[lang]),
    noisePeak: (g, lang) => ({
      tr: `Tepe C-ağırlıklı anlık ses basıncı (L<sub>pCpeak</sub> = ${f(g.peakMax, 1, lang)} dB(C)) 130 dB(C)'yi aştığından kullanım kılavuzunda beyan edilmiştir`,
      en: `As the peak C-weighted instantaneous sound pressure (L<sub>pCpeak</sub> = ${f(g.peakMax, 1, lang)} dB(C)) exceeds 130 dB(C), it is declared in the instruction manual`,
      de: `Da der C-bewertete Spitzenschalldruckpegel (L<sub>pCpeak</sub> = ${f(g.peakMax, 1, lang)} dB(C)) 130 dB(C) überschreitet, ist er in der Betriebsanleitung angegeben`
    }[lang]),
    noiseNone: (lang) => ({
      tr: 'Operatör konumunda gürültü emisyonu ölçülmeli (EN ISO 11202) ve kullanım kılavuzunda beyan edilmelidir',
      en: 'The noise emission at the operator position is to be measured (EN ISO 11202) and declared in the instruction manual',
      de: 'Die Geräuschemission am Bedienerplatz ist zu messen (EN ISO 11202) und in der Betriebsanleitung anzugeben'
    }[lang]),
    thermalMeas: (t, p, lang) => {
      const top = t.top.s.top;
      const lbl = top && top.m.label ? (top.m.label[lang] || top.m.label.tr || '') : '';
      const where = `D-${t.top.i + 1}${lbl ? ` · ${lbl}` : ''}`;
      const d = p.thermal.date ? `${p.thermal.date}, ` : '';
      const base = {
        tr: `Dış yüzey sıcaklıkları termal kamera ile ölçülmüştür (${d}Ek ${t.annex}): en yüksek geçerli değer ${f(t.max, 1, lang)} °C (${where})`,
        en: `The outer surface temperatures were measured with a thermal imager (${d}Annex ${t.annex}): highest valid value ${f(t.max, 1, lang)} °C (${where})`,
        de: `Die Oberflächentemperaturen wurden mit einer Wärmebildkamera gemessen (${d}Anhang ${t.annex}): höchster gültiger Wert ${f(t.max, 1, lang)} °C (${where})`
      }[lang];
      const tail = t.cls === 'cool'
        ? { tr: ` — 10 s temas yanık eşiğinin (${t.t10} °C, EN ISO 13732-1) altında`, en: ` — below the 10 s contact burn threshold (${t.t10} °C, EN ISO 13732-1)`, de: ` — unter der Verbrennungsschwelle für 10 s Kontakt (${t.t10} °C, EN ISO 13732-1)` }
        : t.cls === 'warm'
          ? { tr: ` — çıplak metal için 1 s temas yanık eşiğinin (${f(t.limit, 0, lang)} °C, EN ISO 13732-1) altında`, en: ` — below the 1 s contact burn threshold for bare metal (${f(t.limit, 0, lang)} °C, EN ISO 13732-1)`, de: ` — unter der Verbrennungsschwelle für blankes Metall bei 1 s Kontakt (${f(t.limit, 0, lang)} °C, EN ISO 13732-1)` }
          : { tr: '', en: '', de: '' };
      return base + tail[lang];
    },
    thermalWarm: (t, lang) => ({
      tr: `${f(t.t10, 0, lang)} °C'yi aşan sıcak yüzeylere W017 "Sıcak yüzey" uyarı etiketi uygulanmış; bu yüzeylere uzun süreli temas edilmemesi gerektiği kullanım kılavuzunda belirtilmiştir (Ek D; 4 s ve 10 s temas için yanık eşiği aşılır)`,
      en: `W017 "Hot surface" warning labels have been applied to the hot surfaces above ${f(t.t10, 0, lang)} °C; the instruction manual states that prolonged contact with these surfaces must be avoided (Annex D; the burn threshold for 4 s and 10 s contact is exceeded)`,
      de: `An den heißen Flächen über ${f(t.t10, 0, lang)} °C wurden Warnschilder W017 „Heiße Oberfläche“ angebracht; in der Betriebsanleitung ist angegeben, dass längerer Kontakt mit diesen Flächen zu vermeiden ist (Anhang D; die Verbrennungsschwelle für 4 s und 10 s Kontakt wird überschritten)`
    }[lang]),
    thermalHot: (t, lang) => ({
      tr: `En yüksek geçerli yüzey sıcaklığı ${f(t.max, 1, lang)} °C, 1 s temas yanık eşiğini (${f(t.limit, 0, lang)} °C) aşmaktadır; erişilebilir sıcak yüzeylere yalıtım veya koruyucu uygulanmalıdır (EN ISO 13732-1)`,
      en: `The highest valid surface temperature of ${f(t.max, 1, lang)} °C exceeds the 1 s contact burn threshold (${f(t.limit, 0, lang)} °C); insulation or guards must be applied to the accessible hot surfaces (EN ISO 13732-1)`,
      de: `Die höchste gültige Oberflächentemperatur von ${f(t.max, 1, lang)} °C überschreitet die Verbrennungsschwelle für 1 s Kontakt (${f(t.limit, 0, lang)} °C); zugängliche heiße Flächen sind zu dämmen oder abzuschirmen (EN ISO 13732-1)`
    }[lang]),
    thermalNone: (lang) => ({
      tr: 'Erişilebilir yüzey sıcaklıkları termal kamera ile ölçülmeli (EN ISO 13732-1) ve sonuçlar Ek D\'ye işlenmelidir',
      en: 'The accessible surface temperatures are to be measured with a thermal imager (EN ISO 13732-1) and recorded in Annex D',
      de: 'Die zugänglichen Oberflächentemperaturen sind mit einer Wärmebildkamera zu messen (EN ISO 13732-1) und in Anhang D einzutragen'
    }[lang]),
    owner: { tr: 'Kalite', en: 'Quality', de: 'Qualitätssicherung' },
    due: { tr: 'Sevkiyat öncesi', en: 'Before shipment', de: 'Vor Auslieferung' }
  };

  /** Ölçüm sonucuna göre O/Ş (tehlikede "risk:" yazılmamışsa) */
  const AUTO_RISK = {
    elektrik: { ok: [2, 5, 1, 5], fail: [3, 5, 3, 5], none: [2, 5, 2, 5] },
    gurultu: { decl70: [2, 2, 1, 2], declare: [3, 2, 2, 2], lower: [3, 3, 2, 2], upper: [4, 3, 2, 3], limit: [4, 4, 3, 3], none: [3, 2, 3, 2] },
    termal: { cool: [2, 2, 1, 2], warm: [3, 2, 2, 2], hot: [3, 3, 3, 3], none: [3, 2, 3, 2] }
  };

  function autoMeasures(p, ev) {
    const out = { measures: {}, risk: {}, actions: [], signs: [] };
    const add = (h, tag, fn, action) => {
      (out.measures[h.id] = out.measures[h.id] || []).push({ uid: `${h.id}/auto${(out.measures[h.id] || []).length + 1}`, tag, text: ml(fn), auto: true, action: action || null });
    };
    const act = (h, fn) => {
      const id = `A-${U.pad2((p.actions || []).length + out.actions.length + 1)}`;
      out.actions.push({ uid: id, text: ml(fn), ref: h.id, owner: clone(RT.owner), due: clone(RT.due), status: 'open', auto: true });
      return id;
    };
    const setRisk = (h, arr) => {
      if (h.o != null && h.s != null) return;
      out.risk[h.id] = { o: arr[0], s: arr[1], o2: arr[2], s2: arr[3] };
    };
    for (const h of p.hazards) {
      if (h.measure === 'elektrik') {
        const e = ev.elec;
        if (e.pass === true) { add(h, 0, (l) => RT.elecOk(e, p, l)); setRisk(h, AUTO_RISK.elektrik.ok); }
        else if (e.pass === false) { const a = act(h, (l) => RT.elecFail(e, p, l)); add(h, 1, (l) => RT.elecFail(e, p, l), a); setRisk(h, AUTO_RISK.elektrik.fail); }
        else { add(h, 1, RT.elecNone); setRisk(h, AUTO_RISK.elektrik.none); }
      } else if (h.measure === 'gurultu') {
        const g = ev.noise;
        if (g.any) {
          add(h, 0, (l) => RT.noiseMeas(g, p, l));
          if (g.cls === 'limit') { const a = act(h, (l) => RT.noiseDecl(g, p, l)); add(h, 1, (l) => RT.noiseDecl(g, p, l), a); }
          else add(h, 2, (l) => RT.noiseDecl(g, p, l));
          if (g.needLWA && p.noise.LWA == null) { const a = act(h, RT.noiseLWA); add(h, 1, RT.noiseLWA, a); }
          if (g.needPeak) add(h, 2, (l) => RT.noisePeak(g, l));
          if (['lower', 'upper', 'limit'].includes(g.cls)) out.signs.push('M003');
          setRisk(h, AUTO_RISK.gurultu[g.cls]);
        } else { add(h, 1, RT.noiseNone); setRisk(h, AUTO_RISK.gurultu.none); }
      } else if (h.measure === 'termal') {
        const t = ev.thermal;
        if (t.any && t.max != null) {
          add(h, 0, (l) => RT.thermalMeas(t, p, l));
          if (t.cls === 'warm') { add(h, 2, (l) => RT.thermalWarm(t, l)); out.signs.push('W017'); }
          if (t.cls === 'hot') { const a = act(h, (l) => RT.thermalHot(t, l)); add(h, 1, (l) => RT.thermalHot(t, l), a); out.signs.push('W017'); }
          setRisk(h, AUTO_RISK.termal[t.cls]);
        } else { add(h, 1, RT.thermalNone); setRisk(h, AUTO_RISK.termal.none); }
      }
    }
    return out;
  }

  /* ─── 5. Kontrol listesi ─────────────────────────────────── */
  function checks(p, ev, ctx) {
    const out = [];
    const c = (level, msg, ref) => out.push({ level, msg, ref: ref || null });
    const m = p.meta;
    const placeholder = (v) => !v || /^\[.*\]$/.test(String(v).trim());
    if (placeholder(m.job)) c('error', 'İş / proje numarası yazılmamış (ön bilgi: no)');
    if (placeholder(m.customer)) c('error', 'Müşteri yazılmamış (ön bilgi: musteri)');
    if (placeholder(m.model)) c('error', 'Model yazılmamış (ön bilgi: model)');
    if (!m.reportDate) c('warn', 'Rapor tarihi yazılmamış (ön bilgi: tarih)');
    if (!m.approvals.prepared) c('warn', 'Hazırlayan yazılmamış (ön bilgi: hazirlayan)');
    for (const u of p._unknown || []) c('warn', u.dup ? `"${u.title}" bölümü birden fazla kez yazılmış (${u.file}:${u.line})` : `Tanınmayan bölüm: "${u.title}" (${u.file}:${u.line})`);

    // Tehlikeler
    const hids = new Set();
    p.hazards.forEach((h, i) => {
      if (hids.has(h.id)) c('error', `${h.id} iki kez kullanılmış`, h.id);
      hids.add(h.id);
      const want = `H-${U.pad2(i + 1)}`;
      if (h.id !== want) c('info', `${h.id} sırası: ${want} bekleniyordu (numaralar sıralı olmalı)`, h.id);
      if (h.o == null || h.s == null) { if (!h.measure) c('error', `${h.id}: risk (O/Ş) yazılmamış`, h.id); }
      if (!has(h.type)) c('error', `${h.id}: tehlike türü yazılmamış`, h.id);
      if (!has(h.sit)) c('warn', `${h.id}: tehlikeli durum yazılmamış`, h.id);
      if (!h.meas.length && !h.measure) c('error', `${h.id}: önlem yazılmamış`, h.id);
      const pts = new Set(p.points.map((x) => x.no));
      h.points.filter((x) => !pts.has(x)).forEach((x) => c('warn', `${h.id}: ${x} numaralı tehlike noktası yok`, h.id));
      h.meas.filter((x) => x.action && !(p.actions || []).some((a) => a.uid === x.action)).forEach((x) => c('warn', `${h.id}: önlemdeki ${x.action} aksiyon listesinde yok`, h.id));
    });
    // Güvenlik fonksiyonları
    const sids = new Set();
    p.sfs.forEach((sf, i) => {
      if (sids.has(sf.id)) c('error', `${sf.id} iki kez kullanılmış`, sf.id);
      sids.add(sf.id);
      sf.hazards.filter((x) => !hids.has(x)).forEach((x) => c('error', `${sf.id}: ${x} tehlikesi yok`, sf.id));
      if (!sf.subs.length) c('error', `${sf.id}: alt sistem (### Giriş / Mantık / Çıkış) yazılmamış`, sf.id);
      for (const k of ['S', 'F', 'P']) if (!has(sf.just[k])) c('warn', `${sf.id}: ${k} gerekçesi yazılmamış`, sf.id);
      const e = ev.sf[i];
      if (e.pl && e.plr && !e.ok) c('error', `${sf.id}: ulaşılan PL ${e.pl} < PLr ${e.plr}`, sf.id);
      if (!e.pl) c('warn', `${sf.id}: PL hesaplanamadı (B10D/MTTFd, DC veya kategori eksik)`, sf.id);
      if (!e.ccfOk) c('error', `${sf.id}: Kat. 2–4 alt sistem var, CCF puanı ${ev.ccf} < 65`, sf.id);
      sf.subs.forEach((s, j) => { const r = e.subs[j]; if (r.t10d != null && r.t10d < 20) c('warn', `${sf.id}: ${s.role} T10D = ${r.t10d.toFixed(1)} yıl < 20 yıl — periyodik değişim gerekir`, sf.id); });
    });
    // Validasyon
    p.validation.forEach((v) => {
      if (v.ref && !hids.has(v.ref) && !sids.has(v.ref)) c('warn', `${v.id}: ${v.ref} bulunamadı`, v.id);
      if (v.result === 'nok') c('warn', `${v.id}: sonuç uygun değil — ilgili önlem/aksiyon yazılmalı`, v.id);
    });
    if (m.type !== 'model' && p.validation.length && !p.validation.some((v) => v.result)) c('info', 'Validasyon sonuçları girilmemiş');
    // Artık risk
    const all = p.hazards.map((h) => Object.assign({}, h, (ev.auto.risk[h.id] || {})));
    all.forEach((h) => {
      if (h.o2 == null) return;
      const lv = C.riskLevel(h.o2 * h.s2);
      if (lv === 'r3') c('error', `${h.id}: artık risk yüksek (R = ${h.o2 * h.s2}) — ek önlem gerekli`, h.id);
      else if (lv === 'r2') c('warn', `${h.id}: artık risk orta (R = ${h.o2 * h.s2}) — ALARP gerekçesi / ek önlem değerlendirilmeli`, h.id);
    });
    // Ölçümler
    const E = ev.elec;
    if (m.type !== 'model') {
      if (!E.any) c(m.type === 'birim' ? 'error' : 'warn', 'Elektrik test değerleri girilmemiş (EN 60204-1 §18)');
      for (const k of ['rpe', 'iso', 'hv']) {
        const s = E[k];
        if (s.missing && s.n) c('warn', `${{ rpe: 'R_PE', iso: 'Yalıtım', hv: 'Gerilim dayanım' }[k]}: ${s.missing} satırda değer yok`);
        if (s.fails) c('error', `${{ rpe: 'R_PE', iso: 'Yalıtım', hv: 'Gerilim dayanım' }[k]}: ${s.fails} ölçüm ölçütü sağlamıyor`);
      }
      for (const k of ['rpe', 'iso', 'hv']) for (const r of p.elec[k]) if (r.value && !r.photo) c('info', `Elektrik ${k.toUpperCase()} ${r.tag}: ölçüm fotoğrafı yok`);
    }
    const G = ev.noise;
    if (G.any) {
      if (G.invalid) c('error', `Gürültü: ${G.invalid} ölçümde arka plan farkı < 3 dB — ölçüm geçersiz`);
      if (G.needLWA && p.noise.LWA == null) c('warn', `Gürültü: operatör konumunda ${G.opMax.toFixed(1)} dB(A) > 80 — L_WA ölçülüp beyan edilmeli`);
      if (G.cls === 'limit') c('error', 'Gürültü: 87 dB(A) maruziyet sınır değeri aşılıyor');
    } else if (m.type === 'birim') c('warn', 'Gürültü ölçümü girilmemiş');
    const Tv = ev.thermal;
    if (Tv.any && Tv.cls === 'hot') c('error', `Termal: en yüksek değer ${Tv.max.toFixed(1)} °C > ${Tv.limit} °C`);
    if (!Tv.any && m.type === 'birim') c('warn', 'Termal görüntü (.bmt) yüklenmemiş');
    (p.thermal.images || []).forEach((t, i) => { if (t.error) c('error', `Termal D-${i + 1}: ${t.error}`); });
    // Dosyalar
    if (ctx && ctx.exists) {
      const miss = (f, what) => { if (f && !ctx.exists(f)) c('error', `${what}: dosya bulunamadı — ${f}`); };
      for (const ph of p.photos) miss(ph.file, 'Fotoğraf');
      for (const k of ['rpe', 'iso', 'hv']) for (const r of p.elec[k]) miss(r.photo, `Elektrik ${r.tag}`);
      for (const r of p.noise.rows || []) miss(r.photo, `Gürültü ${r.no}`);
      for (const t of p.thermal.images || []) miss(t.file, 'Termal');
      miss(m.coverPhoto, 'Kapak fotoğrafı');
      miss(m.panelPhoto, 'Panel fotoğrafı');
      miss(m.pointsPhoto, 'Tehlike noktaları fotoğrafı');
    }
    if (!m.coverPhoto) c('info', 'Kapak fotoğrafı yok (Fotoğraflar tablosunda tür: kapak)');
    // EN ISO 12100 Tablo B.1 grupları
    const covered = new Set();
    for (const h of p.hazards) {
      const t = `${(h.type && h.type.tr) || ''} ${(h.type && h.type.en) || ''} ${h.group || ''}`.toLocaleLowerCase('tr');
      LIB.hazardGroups.forEach((g) => { if (g.words.some((w) => t.includes(w))) covered.add(g.no); });
    }
    const declared = new Set();
    for (const n of p.notApplicable || []) {
      const t = `${n.group} ${(n.text && n.text.tr) || ''}`.toLocaleLowerCase('tr');
      LIB.hazardGroups.forEach((g) => { if (g.words.some((w) => t.includes(w))) declared.add(g.no); });
    }
    const open = LIB.hazardGroups.filter((g) => !covered.has(g.no) && !declared.has(g.no) && g.no !== 10);
    if (p.hazards.length && open.length) c('info', `EN ISO 12100 Tablo B.1: ${open.map((g) => g.tr).join(', ')} grubunda tehlike yok — değerlendirilip "## Uygulanamaz" altında gerekçe yazılmalı`);
    // Çeviri
    for (const lang of (m.langs || []).filter((l) => l !== 'tr')) {
      const miss = [];
      const scan = (o, where) => {
        if (!o || typeof o !== 'object') return;
        if ('tr' in o && typeof o.tr === 'string') {
          if (o.tr.trim() && !(o[lang] && String(o[lang]).trim()) && /[a-zçğıöşü]{3}/i.test(o.tr) && !/^[\d\s.,:;/+\-–—°()%ΩµA-Z0-9<>="]*$/.test(o.tr)) miss.push(where);
          return;
        }
        for (const [k, v] of Object.entries(o)) if (!k.startsWith('_') && k !== 'auto') scan(v, `${where}.${k}`);
      };
      scan({ meta: { machineType: m.machineType, scope: m.scope }, outOfScope: p.outOfScope, machine: p.machine, limits: p.limits, hazards: p.hazards, sfs: p.sfs, sfNotes: p.sfNotes, validation: p.validation, elec: p.elec, noise: p.noise, thermal: p.thermal, conclusion: p.conclusion, actions: p.actions, signs: p.signs, points: p.points, photos: p.photos, standards: p.standards }, '');
      const pretty = (w) => w.replace(/^\./, '').replace(/hazards\.(\d+)/, (x, i) => (p.hazards[+i] ? p.hazards[+i].id : x)).replace(/sfs\.(\d+)/, (x, i) => (p.sfs[+i] ? p.sfs[+i].id : x));
      if (miss.length) c('warn', `${lang.toUpperCase()} çevirisi eksik: ${miss.length} alan (${miss.slice(0, 4).map(pretty).join(', ')}${miss.length > 4 ? ' …' : ''})`);
    }
    return out;
  }

  /* ─── Değerlendirme ──────────────────────────────────────── */
  function evaluate(p, ctx) {
    const ev = {};
    ev.nop = C.nopOf(p);
    ev.ccf = C.ccfScore(p);
    ev.sf = p.sfs.map((sf) => C.evalSF(sf, p));
    ev.elec = evalElec(p);
    ev.noise = evalNoise(p);
    ev.thermal = evalThermal(p);
    // Ek harfleri: A detay, B kurulum, C ölçüm ekranları; termal ve gürültü varsa sırayla D, E
    ev.annex = { thermal: ev.thermal.any ? 'D' : null, noise: ev.noise.any ? (ev.thermal.any ? 'E' : 'D') : null };
    ev.thermal.annex = ev.annex.thermal || 'D';
    ev.noise.annex = ev.annex.noise || 'E';
    ev.auto = autoMeasures(p, ev);
    ev.checks = checks(p, ev, ctx);
    const counts = (fn) => ['r1', 'r2', 'r3'].map((c) => p.hazards.filter((h) => { const x = fn(h); return x != null && C.riskLevel(x) === c; }).length);
    const withAuto = (h) => Object.assign({}, h, ev.auto.risk[h.id] || {});
    ev.before = counts((h) => { const x = withAuto(h); return x.o != null ? x.o * x.s : null; });
    ev.after = counts((h) => { const x = withAuto(h); return x.o2 != null ? x.o2 * x.s2 : null; });
    ev.errors = ev.checks.filter((x) => x.level === 'error').length;
    ev.warnings = ev.checks.filter((x) => x.level === 'warn').length;
    return ev;
  }

  /** Rapor için model: otomatik önlemler, risk değerleri, aksiyonlar ve işaretler eklenmiş kopya */
  function apply(p, ev) {
    const q = Object.assign({}, p);
    q.hazards = p.hazards.map((h) => {
      const r = ev.auto.risk[h.id];
      const extra = ev.auto.measures[h.id] || [];
      return Object.assign({}, h, r || {}, { meas: h.meas.concat(extra) });
    });
    q.actions = (p.actions || []).concat(ev.auto.actions);
    const codes = new Set(p.signs.map((s) => s.code));
    q.signs = p.signs.concat([...new Set(ev.auto.signs)].filter((c) => !codes.has(c)).map((code) => {
      const lib = LIB.signs.find((s) => s.code === code);
      return { code, meaning: clone(lib ? lib.meaning : { tr: code }), location: code === 'W017' ? { tr: 'Sıcak yüzeyler (Ek D)', en: 'Hot surfaces (Annex D)', de: 'Heiße Oberflächen (Anhang D)' } : { tr: 'Operatör konumu', en: 'Operator position', de: 'Bedienerplatz' }, auto: true };
    }));
    return q;
  }

  return { evaluate, apply, evalElec, evalNoise, evalThermal, measPass, elecRange };
});
