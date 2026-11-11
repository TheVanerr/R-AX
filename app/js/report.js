/* Rapor oluşturucu: model + değerlendirme → bölüm HTML'leri.
   buildReport(p, ev, lang, ctx) → { sections: [{ html, newPage, cover }], toc, stats }
   ctx: { img(yol) → src, size(yol) → {w,h}, thermo(img) → src, vis(img) → src, scaleImg() → src, logo(yol) → src }
   Sayfalama ve antet layout.js'de, kapak covers.js'de. */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./texts.js'), require('./util.js'), require('./calc.js'), require('./thermal.js'), require('./library.js'), require('./covers.js'));
  else root.RaReport = factory(root.RA_T, root.RaUtil, root.RaCalc, root.RaThermal, root.RA_LIB, root.RaCovers);
})(typeof self !== 'undefined' ? self : this, function (T, U, C, TH, LIB, COV) {
  'use strict';

  const { esc, rich, pad2, fmtInt } = U;
  const FIG = { tr: 'Şekil', en: 'Figure', de: 'Bild' };
  const LOAD = { tr: 'Tehlike kaynağı', en: 'Hazard source', de: 'Gefahrenquelle' };
  const NO_HAZ = { tr: '[tehlike eklenecek]', en: '[hazards to be added]', de: '[Gefährdungen ergänzen]' };
  const NO_SF = { tr: '[güvenlik fonksiyonu eklenecek]', en: '[safety functions to be added]', de: '[Sicherheitsfunktionen ergänzen]' };
  const NO_ROWS = { tr: '[eklenecek]', en: '[to be added]', de: '[ergänzen]' };
  const NOTE = { tr: 'Not', en: 'Note', de: 'Hinweis' };
  const TAGC = ['tag-m', 'tag-o', 'tag-b'];

  /** Çok dilli alan → HTML; eksik çeviride TR'ye düşer ve önizlemede işaretlenir */
  function makeTx(lang, stats, vars) {
    const sub = (s) => (vars ? String(s).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => (vars[k] != null ? vars[k] : m)) : s);
    return (o, opt) => {
      const ph = !opt || opt.ph !== false;
      const empty = ph ? `<span class="tbd">${T[lang].fill}</span>` : '';
      if (o == null) return empty;
      if (typeof o === 'string') return o.trim() ? rich(sub(o)) : empty;
      const v = o[lang];
      if (v && String(v).trim()) return rich(sub(v));
      const fb = o.tr || o.en || o.de;
      if (fb && String(fb).trim()) {
        if (lang !== 'tr' && /[a-zçğıöşü]{3}/i.test(fb) && !/^[\d\s.,:;/+\-–—°()%ΩµA-Z0-9<>="]*$/.test(fb)) {
          stats.missing += 1;
          return `<span class="mt" title="Çeviri eksik">${rich(sub(fb))}</span>`;
        }
        return rich(sub(fb));
      }
      return empty;
    };
  }

  function buildReport(p, ev, lang, ctx) {
    const L = T[lang];
    const stats = { missing: 0 };
    const m = p.meta;
    const vars = { no: m.job, musteri: m.customer, model: m.model, tarih: m.reportDate, dokuman: m.docNo, rev: m.rev };
    const X = makeTx(lang, stats, vars);
    const Xn = (o) => X(o, { ph: false });
    const fmt = (v, d) => U.fmtDec(v, d, L.dec);
    const ph = (t) => `<span class="tbd">${t}</span>`;
    const toc = [];
    const sections = [];
    let secNo = 0;
    const h2 = (key, title, ref, annex) => {
      const id = `sec-${key}`;
      const num = annex ? `${L.annex} ${annex}` : String(++secNo);
      toc.push({ id, num, title });
      return `<h2 class="sec" id="${id}" data-keep><span class="num">${num}</span><span class="ti">${title}</span>${ref ? ` <span class="ref">${ref}</span>` : ''}</h2>`;
    };
    const h3 = (t, attrs = '') => `<h3 data-keep ${attrs}>${t}</h3>`;
    const kv = (rows) => `<table class="t kv"><tbody>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</tbody></table>`;
    const emptyRow = (cols, t) => `<tr><td colspan="${cols}" class="c">${ph(t)}</td></tr>`;
    const photoOf = (file) => p.photos.find((x) => x.file === file) || (file ? { file, caption: { tr: '' } } : null);
    const area = Xn(m.area).replace(/<[^>]+>/g, '');
    const pill = (ok, txt) => `<span class="pill ${ok === true ? 'ok' : ok === false ? 'bad' : 'pend'}">${txt}</span>`;
    const nop = ev.nop;
    const prof = p.limits.profile;
    const evals = ev.sf;
    const ccf = ev.ccf;
    const hzNo = (id) => (p.hazards.some((h) => h.id === id) ? id : '');
    const sfNo = (id) => (p.sfs.some((s) => s.id === id) ? id : '');
    const refNo = (id) => sfNo(id) || hzNo(id) || '';
    const img = (file) => (file ? ctx.img(file) : '');
    const sizeOf = (file) => (ctx.size && ctx.size(file)) || { w: 4, h: 3 };

    /* ---------- KAPAK ---------- */
    sections.push({ cover: true, html: COV.build(m.cover, p, ev, lang, ctx) });

    /* ---------- DOKÜMAN KONTROL + İÇİNDEKİLER ---------- */
    {
      const revRows = p.revisions.map((r) => `<tr><td class="c">${esc(r.rev)}</td><td>${esc(r.date)}</td><td>${X(r.desc)}</td><td>${r.by ? esc(r.by) : ph('[…]')}</td><td>${r.approvedBy ? esc(r.approvedBy) : ph('[…]')}</td></tr>`).join('')
        + '<tr><td class="c">&nbsp;</td><td></td><td></td><td></td><td></td></tr>';
      const distRows = p.distribution.map((d, i) => `<tr><td class="c">${i + 1}</td><td>${X(d.to)}</td><td>${X(d.format)}</td></tr>`).join('');
      sections.push({ newPage: true, html: `
        ${h3(L.revHist)}
        <table class="t split"><thead><tr><th class="c" style="width:12mm">${L.revCols[0]}</th><th style="width:22mm">${L.revCols[1]}</th><th>${L.revCols[2]}</th><th style="width:34mm">${L.revCols[3]}</th><th style="width:34mm">${L.revCols[4]}</th></tr></thead><tbody>${revRows}</tbody></table>
        ${h3(L.dist)}
        <table class="t split"><thead><tr><th style="width:12mm" class="c">${L.distCols[0]}</th><th>${L.distCols[1]}</th><th style="width:44mm">${L.distCols[2]}</th></tr></thead><tbody>${distRows || emptyRow(3, NO_ROWS[lang])}</tbody></table>
        <div class="note">${L.readingNote(L.tags)}</div>
        <h3 class="toc-h" data-keep>${L.contents}</h3>
        <ol class="toc" id="toc"></ol>` });
    }

    /* ---------- 1–3 ---------- */
    {
      const v = { manufacturer: esc(m.manufacturer), brandModel: `${esc(m.brandName)} ${esc(m.model)}`.trim(), job: esc(m.job), area: L.areaSuffix(area) };
      const defs = [];
      for (let i = 0; i < L.defs.length; i += 2) defs.push(`<tr><td style="width:17mm"><b>${L.defs[i][0]}</b></td><td>${L.defs[i][1]}</td><td style="width:17mm"><b>${L.defs[i + 1] ? L.defs[i + 1][0] : ''}</b></td><td>${L.defs[i + 1] ? L.defs[i + 1][1] : ''}</td></tr>`);
      const TD = p.thermal;
      const ND = p.noise;
      sections.push({ newPage: true, html: `
        ${h2('1', L.s1)}
        <p>${p.purpose ? X(p.purpose) : L.purpose(v)}</p>
        ${ev.elec.any || p.elec.date ? `<p>${L.elecPara(p.elec.date ? esc(p.elec.date) : ph(L.fill))}</p>` : ''}
        ${ev.thermal.any ? `<p>${L.thermoPara(TD.date ? esc(TD.date) : ph(L.fill)).replace(/\bD\b/, ev.annex.thermal)}</p>` : ''}
        ${ev.noise.any ? `<p>${L.noisePara(ND.date ? esc(ND.date) : ph(L.fill), ev.annex.noise)}</p>` : ''}
        ${Xn(p.outOfScope) ? `<div class="note"><b>${L.outOfScope}</b> ${X(p.outOfScope)}</div>` : ''}
        <div class="gap"></div>
        ${h2('2', L.s2)}
        <table class="t split"><thead><tr><th style="width:44mm">${L.stdCols[0]}</th><th>${L.stdCols[1]}</th></tr></thead>
          <tbody>${p.standards.map((s) => `<tr><td>${rich(s.ref)}</td><td>${X(s.title)}</td></tr>`).join('') || emptyRow(2, NO_ROWS[lang])}</tbody></table>
        <div class="gap"></div>
        ${h2('3', L.s3)}
        <table class="t small split"><tbody>${defs.join('')}</tbody></table>` });
    }

    /* ---------- 4 MAKİNE ---------- */
    {
      const pp = m.panelPhoto ? photoOf(m.panelPhoto) : null;
      const tech = kv(p.machine.tech.map((t) => [X(t.label), X(t.value)]));
      let body = tech;
      if (pp) {
        const s = sizeOf(pp.file);
        const pw = Math.max(26, Math.min(70, (100 * s.w) / s.h));
        body = `<div class="grid2" style="grid-template-columns:1fr ${pw.toFixed(1)}mm;gap:5mm;align-items:start">${tech}<figure><img src="${img(pp.file)}" alt="" style="width:100%;height:${Math.min(100, (pw * s.h) / s.w).toFixed(1)}mm;object-fit:contain"><figcaption><b>${FIG[lang]} 1.</b> ${Xn(pp.caption) || L.figPanel}</figcaption></figure></div>`;
      }
      sections.push({ newPage: true, html: `
        ${h2('4', L.s4)}
        <p>${X(p.machine.desc)}</p>
        ${body}
        ${h3(L.panelTitle)}
        <table class="t split"><thead><tr><th style="width:34mm">${L.panelCols[0]}</th><th>${L.panelCols[1]}</th><th style="width:38mm">${L.panelCols[2]}</th></tr></thead>
          <tbody>${p.machine.panel.map((r) => `<tr><td><b>${rich(r.label)}</b></td><td>${X(r.func)}</td><td>${Xn(r.safety) || '—'}</td></tr>`).join('') || emptyRow(3, NO_ROWS[lang])}</tbody></table>` });
    }

    /* ---------- 5 SINIRLAR ---------- */
    {
      const li = p.limits;
      const LL = L.lim;
      const misuse = li.misuse.length ? `<ul class="ul">${li.misuse.map((x) => `<li>${X(x.text)}</li>`).join('')}</ul>` : ph(L.fill);
      sections.push({ newPage: true, html: `
        ${h2('5', L.s5, L.s5ref)}
        ${h3(L.h51)}${kv([[LL.intendedUse, X(li.intendedUse)], [LL.modes, X(li.modes)], [LL.users, X(li.users)], [LL.misuse, misuse]])}
        ${h3(L.h52)}${kv([[LL.movement, X(li.movement)], [LL.access, X(li.access)], [LL.interfaces, X(li.interfaces)]])}
        ${h3(L.h53)}${kv([[LL.life, X(li.life)], [LL.profile, L.profile(prof.dop, prof.hop, prof.tcycle).replace('{nop}', fmtInt(nop))], [LL.maintenance, X(li.maintenance)]])}
        ${h3(L.h54)}${kv([[LL.environment, X(li.environment)], [LL.phases, X(li.phases)]])}` });
    }

    /* ---------- 6 METODOLOJİ ---------- */
    {
      const flow = L.flow.map((f, i) => `<div class="st${i === 4 ? ' red' : ''}"><b>${f[0]}</b>${f[1]}</div>`).join('<div class="ar">›</div>');
      const scale = (head, letter, arr) => `<table class="t small"><thead><tr><th class="c" style="width:9mm">${letter}</th><th>${head}</th></tr></thead><tbody>${arr.map((x, i) => `<tr><td class="c"><b>${i + 1}</b></td><td>${x}</td></tr>`).join('')}</tbody></table>`;
      let mx = `<tr><th class="ax" rowspan="6"><span class="vert">${L.axL}</span></th></tr>`;
      for (let o = 5; o >= 1; o -= 1) {
        mx += `<tr><th>${o}</th>`;
        for (let s = 1; s <= 5; s += 1) mx += `<td class="${C.riskLevel(o * s)}">${o * s}</td>`;
        mx += '</tr>';
      }
      mx += `<tr><th class="ax"></th><th class="ax"></th>${[1, 2, 3, 4, 5].map((s) => `<th>${s}</th>`).join('')}</tr><tr><th class="ax"></th><th class="ax"></th><th class="ax" colspan="5">${L.axS}</th></tr>`;
      sections.push({ newPage: true, html: `
        ${h2('6', L.s6)}
        ${h3(L.h61)}<div class="flow">${flow}</div><p>${L.p61}</p>
        ${h3(L.h62)}
        <div class="grid2" style="gap:5mm">${scale(L.sevHead, L.sevL, L.sev)}${scale(L.likHead, L.likL, L.lik)}</div>
        <div class="grid2" style="grid-template-columns:auto 1fr;gap:8mm;align-items:center;margin-top:2mm">
          <table class="mx">${mx}</table>
          <table class="t small"><thead><tr><th style="width:24mm">${L.scoreCols[0]}</th><th>${L.scoreCols[1]}</th></tr></thead>
            <tbody>${L.scoreRows.map((r, i) => `<tr><td class="risk r${i + 1}">${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table>
        </div>
        <div class="note">${L.note62}</div>` });

      toc.push({ id: 'sec-6-3', num: '', title: L.h63, sub: true });
      sections.push({ newPage: true, html: `
        <h3 id="sec-6-3" data-keep>${L.h63}</h3><p>${L.p63}</p>
        ${riskGraphSVG(p, L)}
        <table class="t small"><thead><tr><th style="width:14mm" class="c">${L.paramCols[0]}</th><th>${L.paramCols[1]}</th><th>${L.paramCols[2]}</th></tr></thead>
          <tbody>${L.params.map((r) => `<tr><td class="c">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table>
        ${h3(L.h64)}
        <table class="t small"><thead><tr><th class="c">PL</th>${[...'abcde'].map((x) => `<th class="c">${x}</th>`).join('')}</tr></thead>
          <tbody><tr><td class="c"><b>${L.pfh} [1/h]</b></td><td class="c num-cell">10<sup>−5</sup> … &lt;10<sup>−4</sup></td><td class="c num-cell">3·10<sup>−6</sup> … &lt;10<sup>−5</sup></td><td class="c num-cell">10<sup>−6</sup> … &lt;3·10<sup>−6</sup></td><td class="c num-cell">10<sup>−7</sup> … &lt;10<sup>−6</sup></td><td class="c num-cell">10<sup>−8</sup> … &lt;10<sup>−7</sup></td></tr></tbody></table>
        <p class="small">${L.p64}</p>` });
    }

    /* ---------- 7 TEHLİKE NOKTALARI ---------- */
    {
      const pp = m.pointsPhoto;
      let fig = `<div class="ph-empty" style="height:90mm">${L.noPhotos}</div>`;
      if (pp) {
        const s = sizeOf(pp);
        const ar = s.w / s.h;
        const pins = p.points.map((pt) => `<span class="pin" style="left:${pt.x}%;top:${pt.y}%"><span>${esc(pt.no)}</span></span>`).join('');
        fig = `<div class="pin-photo" style="width:min(100%, calc(118mm * ${ar.toFixed(4)}));aspect-ratio:${s.w}/${s.h}"><img src="${img(pp)}" alt="">${pins}</div>`;
      }
      const rel = (pt) => p.hazards.filter((h) => h.points.includes(pt.no)).map((h) => h.id).join(', ') || '—';
      sections.push({ newPage: true, html: `
        ${h2('7', L.s7 + (area ? ` — ${esc(area)}` : ''))}
        <figure>${fig}<figcaption><b>${FIG[lang]} 2.</b> ${L.figPoints}</figcaption></figure>
        <table class="t split" style="margin-top:3mm"><thead><tr><th class="c" style="width:10mm">${L.pointCols[0]}</th><th style="width:52mm">${L.pointCols[1]}</th><th>${L.pointCols[2]}</th><th style="width:24mm">${L.pointCols[3]}</th></tr></thead>
          <tbody>${p.points.map((pt) => `<tr><td class="c"><span class="mk">${esc(pt.no)}</span></td><td>${X(pt.label)}</td><td>${X(pt.desc)}</td><td>${rel(pt)}</td></tr>`).join('') || emptyRow(4, NO_ROWS[lang])}</tbody></table>` });
    }

    /* ---------- 8 RİSK TABLOSU ---------- */
    {
      const RC = L.riskCols;
      const rows = p.hazards.map((hz) => {
        const has = hz.o != null && hz.s != null;
        const R = has ? hz.o * hz.s : null;
        const R2 = has ? hz.o2 * hz.s2 : null;
        const zones = hz.points.slice().sort((a, b) => a - b).map((n) => `<span class="mk">${esc(n)}</span>`).join(' ') || '—';
        const meas = hz.meas.map((x) => {
          const a = x.action ? p.actions.find((y) => y.uid === x.action) : null;
          const st = a && a.status === 'rejected' ? ` <i class="muted">— ${L.actStatus.rejected} (${a.uid})</i>` : a && x.auto ? ` <span class="muted">(${a.uid})</span>` : '';
          return `<span class="${TAGC[x.tag]}">[${L.tags[x.tag]}]</span> ${X(x.text)}${st}`;
        }).join('<br>') || ph(L.fill);
        return `<tr><td class="id">${hz.id}</td><td class="c">${zones}</td><td>${X(hz.type)}</td><td>${X(hz.sit)}</td><td>${X(hz.phase)}</td>
          <td class="c">${has ? hz.o : '—'}</td><td class="c">${has ? hz.s : '—'}</td><td class="risk ${has ? C.riskLevel(R) : ''}">${has ? R : '—'}</td><td>${meas}</td>
          <td class="c">${has ? hz.o2 : '—'}</td><td class="c">${has ? hz.s2 : '—'}</td><td class="risk ${has ? C.riskLevel(R2) : ''}">${has ? R2 : '—'}</td></tr>`;
      }).join('') || emptyRow(12, NO_HAZ[lang]);
      const a = ev.before;
      const b = ev.after;
      const na = (p.notApplicable || []).length ? `${h3(L.na.title)}<table class="t small split"><thead><tr><th style="width:40mm">${L.na.cols[0]}</th><th>${L.na.cols[1]}</th></tr></thead><tbody>${p.notApplicable.map((n) => `<tr><td><b>${esc(n.group)}</b></td><td>${X(n.text)}</td></tr>`).join('')}</tbody></table>` : '';
      sections.push({ newPage: true, html: `
        ${h2('8', L.s8)}
        <table class="t rt split">
          <colgroup><col style="width:9mm"><col style="width:9mm"><col style="width:22mm"><col><col style="width:13mm"><col style="width:5mm"><col style="width:5mm"><col style="width:7mm"><col style="width:52mm"><col style="width:5mm"><col style="width:5mm"><col style="width:7mm"></colgroup>
          <thead><tr><th rowspan="2">${RC.no}</th><th rowspan="2">${RC.zone}</th><th rowspan="2">${RC.type}</th><th rowspan="2">${RC.sit}</th><th rowspan="2">${RC.phase}</th><th colspan="3" class="grp">${RC.init}</th><th rowspan="2">${RC.meas}</th><th colspan="3" class="grp">${RC.res}</th></tr>
            <tr><th>${RC.L}</th><th>${RC.S}</th><th>${RC.R}</th><th>${RC.L}</th><th>${RC.S}</th><th>${RC.R}</th></tr></thead>
          <tbody>${rows}</tbody></table>
        ${h3(L.summary)}
        <table class="t small"><thead><tr><th></th>${L.sumHead.map((x) => `<th class="c">${x}</th>`).join('')}</tr></thead>
          <tbody><tr><th class="rowh">${L.sumRows[0]}</th><td class="c risk r1">${a[0]}</td><td class="c risk r2">${a[1]}</td><td class="c risk r3">${a[2]}</td><td class="c"><b>${p.hazards.length}</b></td></tr>
          <tr><th class="rowh">${L.sumRows[1]}</th><td class="c risk r1">${b[0]}</td><td class="c risk r2">${b[1]}</td><td class="c risk r3">${b[2]}</td><td class="c"><b>${p.hazards.length}</b></td></tr></tbody></table>
        ${na}` });
    }

    /* ---------- 9 GÜVENLİK FONKSİYONLARI ---------- */
    {
      const hzIds = [...new Set(p.sfs.flatMap((sf) => sf.hazards))].filter(hzNo).sort().join(', ');
      const sfRows = p.sfs.map((sf) => `<tr><td><b>${sf.id}</b></td><td><b>${X(sf.name)}:</b> ${X(sf.desc)}</td><td>${X(sf.trigger)}</td><td>${X(sf.safe)}</td><td>${sf.hazards.filter(hzNo).join(', ') || '—'}</td></tr>`).join('') || emptyRow(5, NO_SF[lang]);
      const jRows = p.sfs.map((sf, i) => { const r = evals[i].plr; return `<tr><td><b>${sf.id}</b></td><td><b>S${sf.S}</b> — ${X(sf.just.S)}</td><td><b>F${sf.F}</b> — ${X(sf.just.F)}</td><td><b>P${sf.P}</b> — ${X(sf.just.P)}</td><td class="c">${r ? `<span class="pill pl" style="background:${C.PL_COLOR[r]}">${r}</span>` : '—'}</td></tr>`; }).join('') || emptyRow(5, NO_SF[lang]);
      const notes = p.sfNotes.map((n) => `<div class="note${n.kind === 'warn' ? ' warn' : ''}">${X(n.text)}</div>`).join('');
      sections.push({ newPage: true, html: `
        ${h2('9', L.s9)}
        <p>${L.p9(hzIds)}</p>
        <table class="t split"><thead><tr><th style="width:14mm">${L.sfCols[0]}</th><th>${L.sfCols[1]}</th><th style="width:30mm">${L.sfCols[2]}</th><th style="width:32mm">${L.sfCols[3]}</th><th style="width:16mm">${L.sfCols[4]}</th></tr></thead><tbody>${sfRows}</tbody></table>
        ${h3(L.h9just)}
        <table class="t split"><thead><tr><th style="width:14mm">${L.justCols[0]}</th><th style="width:44mm">${L.justCols[1]}</th><th style="width:44mm">${L.justCols[2]}</th><th>${L.justCols[3]}</th><th style="width:13mm" class="c">${L.justCols[4]}</th></tr></thead><tbody>${jRows}</tbody></table>
        ${notes}` });
    }

    /* ---------- 10 PL DOĞRULAMA ---------- */
    {
      let html = `${h2('10', L.s10)}<p class="small">${L.calc(fmtInt(nop), prof.dop, prof.hop, prof.tcycle * 60)}</p>`;
      if (!p.sfs.length) html += `<p>${ph(NO_SF[lang])}</p>`;
      p.sfs.forEach((sf, i) => {
        const e = evals[i];
        const id = sf.id;
        const CATS = 'B1234';
        const cats = sf.subs.filter((s) => !s.plOverride).map((s) => s.cat).filter((c) => CATS.includes(c));
        const mainCat = cats.length ? cats.reduce((a, b) => (CATS.indexOf(b) < CATS.indexOf(a) ? b : a)) : ((sf.subs[0] || {}).cat || '—');
        const subRows = sf.subs.map((s, j) => {
          const r = e.subs[j];
          const b10 = s.plOverride ? (sf.pfh ? `${L.pfh} ${rich(sf.pfh)}` : `PL ${esc(s.plOverride)} (${L.mfr})`) : C.numOrNull(s.b10d) ? fmtInt(s.b10d) : '—';
          const mt = s.plOverride && r.mttfd == null ? `— (${L.mfr})` : r.mttfdRaw == null ? ph('[…]') : r.capped ? `${fmtInt(r.mttfdRaw)} → <b>${fmtInt(r.mttfd)}</b> (${L.capped})` : `<b>${fmt(r.mttfd, r.mttfd < 10 ? 1 : 0)}</b>`;
          return `<tr><td><b>${L.roles[s.role] || s.role}</b></td><td>${X(s.comp)}</td><td class="num-cell">${b10}</td><td class="num-cell">${mt}</td><td class="num-cell">${C.numOrNull(s.dc) != null ? `${s.dc}&nbsp;%` : '—'}</td></tr>`;
        }).join('') || emptyRow(5, NO_ROWS[lang]);
        const plRows = sf.subs.map((s, j) => {
          const r = e.subs[j];
          const note = [Xn(s.note), !r.pl ? `<span class="tag-o">${L.notCovered}</span>` : ''].filter(Boolean).join(' · ');
          return `<tr><td>${L.roles[s.role] || s.role}</td><td class="c">${esc(s.cat)}</td><td class="c">${r.cls ? L.cls[r.cls] : '—'}</td><td class="c">${s.plOverride ? '—' : L.cls[r.dcCls === 'none' ? 'none' : r.dcCls]}</td><td class="c">${['2', '3', '4'].includes(s.cat) && !s.plOverride ? `${ccf} ${ccf >= 65 ? '✓' : '✗'}` : '—'}</td><td>${note || '—'}</td><td class="c"><b>${r.pl || '—'}</b></td></tr>`;
        }).join('');
        const warns = sf.subs.map((s, j) => (e.subs[j].t10d != null && e.subs[j].t10d < 20 ? `<div class="note warn small">${L.t10dWarn(Xn(s.comp).split(' — ')[0] || L.roles[s.role], fmt(e.subs[j].t10d, 1))}</div>` : '')).join('');
        html += `
          ${h3(`10.${i + 1} ${id} ${X(sf.name)} — ${L.catArch(mainCat)}`)}
          ${sf.subs.length ? sfDiagramSVG(sf, L, lang) : ''}
          <table class="t small split"><thead><tr><th style="width:22mm">${L.subCols[0]}</th><th>${L.subCols[1]}</th><th style="width:28mm">${L.subCols[2]}</th><th style="width:28mm">${L.subCols[3]}</th><th style="width:16mm">${L.subCols[4]}</th></tr></thead><tbody>${subRows}</tbody></table>
          ${warns}
          <table class="t small"><thead><tr><th style="width:22mm">${L.plCols[0]}</th><th class="c">${L.plCols[1]}</th><th class="c">${L.plCols[2]}</th><th class="c">${L.plCols[3]}</th><th class="c">${L.plCols[4]}</th><th>${L.plCols[5]}</th><th class="c" style="width:16mm">${L.plCols[6]}</th></tr></thead>
            <tbody>${plRows}<tr><td colspan="6">${L.combined(id, e.low || '—', e.n, e.pl || '—', e.plr || '—')}${sf.pfh ? ` · ${L.pfh}: ${rich(sf.pfh)}` : ''}</td><td class="c">${e.pl && e.plr ? pill(e.ok, `${e.pl} ${e.ok ? '≥' : '<'} ${e.plr} ${e.ok ? '✓' : '✗'}`) : '—'}</td></tr></tbody></table>`;
      });
      const ccfRows = p.ccf.map((c) => `<tr><td class="c">${esc(c.no)}</td><td>${X(c.measure)}</td><td>${X(c.evidence)}</td><td class="c">${c.max}</td><td class="c">${c.applied ? `<b>${c.max}</b>` : '0'}</td></tr>`).join('');
      html += `
        ${h3(`10.${p.sfs.length + 1} ${L.hCCF}`)}
        <table class="t small split"><thead><tr><th class="c" style="width:9mm">${L.ccfCols[0]}</th><th>${L.ccfCols[1]}</th><th style="width:60mm">${L.ccfCols[2]}</th><th class="c" style="width:13mm">${L.ccfCols[3]}</th><th class="c" style="width:13mm">${L.ccfCols[4]}</th></tr></thead>
          <tbody>${ccfRows}<tr><td colspan="3" class="r"><b>${L.ccfTotal}</b></td><td class="c">${p.ccf.reduce((s, c) => s + c.max, 0)}</td><td class="c">${pill(ccf >= 65, `${ccf} ${ccf >= 65 ? '✓' : '✗'}`)}</td></tr></tbody></table>
        ${h3(`10.${p.sfs.length + 2} ${L.hSys}`)}<p class="small">${X(p.systematic)}</p>`;
      sections.push({ newPage: true, html });
    }

    /* ---------- 11 VALİDASYON ---------- */
    {
      const rows = p.validation.map((v) => `<tr><td class="c">${v.id}</td><td>${refNo(v.ref) || '—'}</td><td>${X(v.step)}</td><td>${X(v.expected)}</td><td class="c">${v.result === 'ok' ? pill(true, L.valOk) : v.result === 'nok' ? pill(false, L.valNok) : L.valEmpty}</td><td>${esc(v.date)}</td></tr>`
        + (Xn(v.note) ? `<tr class="noterow"><td></td><td></td><td colspan="4" class="small"><b>${NOTE[lang]}:</b> ${Xn(v.note)}</td></tr>` : '')).join('') || emptyRow(6, NO_ROWS[lang]);
      sections.push({ newPage: true, html: `
        ${h2('11', L.s11, L.s11ref)}<p>${p.validation.some((v) => v.result) ? L.p11done : L.p11}</p>
        <table class="t small split"><thead><tr><th class="c" style="width:11mm">${L.valCols[0]}</th><th style="width:13mm">${L.valCols[1]}</th><th>${L.valCols[2]}</th><th style="width:52mm">${L.valCols[3]}</th><th class="c" style="width:28mm">${L.valCols[4]}</th><th style="width:18mm">${L.valCols[5]}</th></tr></thead><tbody>${rows}</tbody></table>
        <p class="small muted">${L.valFoot}</p>` });
    }

    /* ---------- 12 ELEKTRİK TESTLERİ ---------- */
    const E = p.elec;
    const lim = E.limits;
    const es = ev.elec;
    const photos = { c: [[], [], []], noise: [], noiseRef: {} };
    let cNo = 0;
    {
      const fmtM = (mm) => (mm ? `${mm.gt ? '&gt; ' : ''}${fmt(mm.n, mm.d)}` : '—');
      const unitOf = (k) => (k === 'rpe' ? 'Ω' : k === 'iso' ? 'MΩ' : 'mA');
      const range = (k) => {
        const s = es[k];
        if (!s.n) return '—';
        if (s.allGt && s.lo.n === s.hi.n) return `${fmtM(s.lo)} ${unitOf(k)} (${L.all})`;
        return s.lo.n === s.hi.n ? `${fmtM(s.lo)} ${unitOf(k)}` : `${fmtM(s.lo)} – ${fmtM(s.hi)} ${unitOf(k)}`;
      };
      const hvU = E.hv.map((r) => parseFloat(String(r.u || '').replace(',', '.'))).filter((x) => !Number.isNaN(x));
      const params = {
        rpe: `${fmt(lim.rpeI, 1)} A · ${lim.rpeT} s · ${L.probe}`,
        iso: `${lim.isoU} V DC · ${lim.isoT} s · ${L.probe}`,
        hv: `${lim.hvU} V AC · ${lim.hvT} s${hvU.length ? ` (${L.measured} ${Math.min(...hvU)}–${Math.max(...hvU)} V)` : ''}`
      };
      const limTxt = { rpe: `≤ ${fmt(lim.rpeMax, 2)} Ω`, iso: `≥ ${fmt(lim.isoMin, 2)} MΩ`, hv: `≤ ${fmt(lim.hvMax, 2)} mA` };
      const crit = { rpe: limTxt.rpe, iso: limTxt.iso, hv: `I ${limTxt.hv}, ${L.breakdown}` };
      const sumRow = (k) => { const s = es[k]; return `<tr><td><b>${L.tests[k]}</b></td><td>${L.clause[k]}</td><td>${params[k]}</td><td>${crit[k]}</td><td class="c">${s.n}</td><td class="num-cell">${s.n ? range(k) : ph(L.noRows)}</td><td class="c">${s.n ? pill(s.pass, s.pass ? L.pass : L.fail) : pill(null, L.open)}</td></tr>`; };
      const ref = {};
      ['rpe', 'iso', 'hv'].forEach((k, ki) => E[k].forEach((r) => {
        if (!r.photo) return;
        ref[r.uid] = `C-${++cNo}`;
        const mm = U.parseNum(r.value);
        const pt = Xn(r.point);
        const label = k === 'rpe' ? 'R<sub>PE</sub>' : k === 'iso' ? 'R<sub>ISO</sub>' : 'HV';
        photos.c[ki].push(`<figure><img src="${img(r.photo)}" alt=""><figcaption><b>${ref[r.uid]}.</b> ${label} ${esc(r.tag)}${pt ? ` · ${pt}` : ''}${r.time ? ` · ${rich(r.time)}` : ''} · <span class="v">${mm ? `${fmtM(mm)} ${unitOf(k)}` : ''}</span></figcaption></figure>`);
      }));
      const detail = (k, title, uCol) => {
        const rows = E[k].map((r, i) => {
          const mm = U.parseNum(r.value);
          const ok = mm ? (k === 'rpe' ? mm.n <= lim.rpeMax : k === 'iso' ? mm.n >= lim.isoMin : mm.n <= lim.hvMax) : null;
          const second = k === 'rpe' ? `${fmt(lim.rpeI, 1)} A` : k === 'iso' ? `${lim.isoU} V` : (r.u ? `${esc(r.u)} V` : '—');
          return `<tr><td class="c">${k === 'rpe' ? esc(r.tag || i + 1) : esc(r.tag)}</td><td class="num-cell">${rich(r.time) || '—'}</td><td>${X(r.point, { ph: false }) || ph(L.define)}</td><td class="c num-cell">${second}</td><td class="c num-cell"><b>${mm ? `${fmtM(mm)} ${unitOf(k)}` : ph('[ ]')}</b></td><td class="c num-cell">${limTxt[k]}</td><td class="c">${ok == null ? '—' : pill(ok, ok ? '✓' : '✗')}</td><td class="c">${ref[r.uid] || '—'}</td></tr>`;
        }).join('') || emptyRow(8, L.noRows);
        return `${h3(title)}<table class="t small split"><thead><tr><th class="c" style="width:10mm">${L.detCols.no}</th><th style="width:18mm">${L.detCols.time}</th><th>${k === 'rpe' ? L.detCols.point : L.detCols.circuit}</th><th class="c" style="width:20mm">${uCol}</th><th class="c" style="width:24mm">${k === 'rpe' ? 'R<sub>PE</sub>' : k === 'iso' ? 'R<sub>ISO</sub>' : 'I<sub>HV</sub>'}</th><th class="c" style="width:20mm">${L.detCols.limit}</th><th class="c" style="width:13mm">${L.detCols.ev}</th><th class="c" style="width:12mm">${L.detCols.photo}</th></tr></thead><tbody>${rows}</tbody></table>`;
      };
      const matrix = () => {
        const iso = new Map(E.iso.map((r) => [r.tag, r]));
        const pairs = E.hv.filter((r) => r.tag && iso.has(r.tag) && (r.value || iso.get(r.tag).value));
        if (!pairs.length) return '';
        const cell = (k, r) => { const mm = U.parseNum(r.value); const ok = mm ? (k === 'iso' ? mm.n >= lim.isoMin : mm.n <= lim.hvMax) : null; return [`<td class="c num-cell"><b>${mm ? fmtM(mm) + (k === 'iso' ? ' MΩ' : ' mA') : '—'}</b></td>`, `<td class="c">${ok == null ? '—' : pill(ok, ok ? '✓' : '✗')}</td>`]; };
        return `${h3(L.h125)}<table class="t small split"><thead><tr><th>${L.matrixCols[0]}</th><th class="c" style="width:26mm">${L.matrixCols[1]} · ${lim.isoU} V DC</th><th class="c" style="width:12mm">${L.matrixCols[2]}</th><th class="c" style="width:26mm">${L.matrixCols[3]} · ${lim.hvU} V AC</th><th class="c" style="width:20mm">${L.matrixCols[4]}</th><th class="c" style="width:12mm">${L.matrixCols[5]}</th></tr></thead><tbody>${
          pairs.map((h) => { const i = iso.get(h.tag); const [a1, a2] = cell('iso', i); const [b1, b2] = cell('hv', h); return `<tr><td>${X(h.point, { ph: false }) || esc(h.tag)}</td>${a1}${a2}${b1}<td class="c num-cell">${h.u ? `${esc(h.u)} V` : '—'}</td>${b2}</tr>`; }).join('')}</tbody></table>`;
      };
      const fnDone = p.validation.some((v) => v.result);
      sections.push({ newPage: true, html: `
        ${h2('12', L.s12, L.s12ref)}
        ${kv([[L.elecKV[0], `${E.date ? esc(E.date) : ph(L.fill)}${E.time ? `, ${esc(E.time)}` : ''}${Xn(E.location) ? ` · ${X(E.location)}` : ''}`], [L.elecKV[1], E.serial || E.calib ? L.instrument(rich(E.instrument), rich(E.serial || '—'), rich(E.calib || '—')) : (E.instrument ? rich(E.instrument) : ph(L.fill))], [L.elecKV[2], X(E.connection)], [L.elecKV[3], E.testedBy ? rich(E.testedBy) : ph(L.fill)]])}
        ${h3(L.h121)}
        <table class="t"><thead><tr><th>${L.elecCols[0]}</th><th style="width:22mm">${L.elecCols[1]}</th><th>${L.elecCols[2]}</th><th style="width:26mm">${L.elecCols[3]}</th><th class="c" style="width:11mm">${L.elecCols[4]}</th><th style="width:28mm">${L.elecCols[5]}</th><th class="c" style="width:19mm">${L.elecCols[6]}</th></tr></thead>
          <tbody>${sumRow('rpe')}${sumRow('iso')}${sumRow('hv')}
          <tr><td>${L.tests.res}</td><td>${L.clause.res}</td><td colspan="4" class="muted">${L.resText}</td><td class="c">${pill(null, L.open)}</td></tr>
          <tr><td>${L.tests.fn}</td><td>${L.clause.fn}</td><td colspan="4" class="muted">${fnDone ? L.fnDone : L.fnText}</td><td class="c">${p.validation.length && p.validation.every((v) => v.result === 'ok') ? pill(true, L.pass) : fnDone ? pill(null, L.seeS11) : pill(null, L.open)}</td></tr></tbody></table>
        ${Xn(E.method) ? `<div class="note small"><b>${L.method}</b> ${X(E.method)}</div>` : ''}
        <div class="note small">${L.elecNote}</div>
        ${detail('rpe', L.h122, 'I<sub>test</sub>')}
        ${detail('iso', L.h123, 'U<sub>ISO</sub>')}
        ${detail('hv', L.h124, L.detCols.u)}
        ${matrix()}` });
    }

    /* ---------- 13 SONUÇ ---------- */
    {
      const a = ev.before;
      const b = ev.after;
      const openActs = p.actions.filter((x) => x.status === 'open').length;
      const hzState = !p.hazards.length ? null : b[2] ? false : (b[1] || openActs) ? 'cond' : true;
      const thLim = ev.thermal.limit;
      const ns = ev.noise;
      const rows = [
        `<tr><td>${L.conclHaz(p.hazards.length)}</td><td>${p.hazards.length ? L.sumText(a, b) : ph(NO_HAZ[lang])}</td><td class="c">${hzState === 'cond' ? pill(null, L.conditional) : hzState == null ? pill(null, L.open) : pill(hzState, hzState ? L.pass : L.fail)}</td></tr>`,
        ...p.sfs.map((sf, i) => { const e = evals[i]; return `<tr><td>${sf.id} ${X(sf.name)}</td><td>${L.conclSF(e.plr || '—', e.pl || '—')}</td><td class="c">${e.pl && e.plr ? pill(e.ok, `${e.pl} ${e.ok ? '≥' : '<'} ${e.plr}`) : '—'}</td></tr>`; }),
        `<tr><td>${L.conclElec}</td><td>${es.n ? (es.fails ? L.elecNok(es.n, es.fails) : L.elecOk(es.n)) : L.elecNone}</td><td class="c">${es.n ? pill(!es.fails, es.fails ? L.fail : L.pass) : pill(null, L.open)}</td></tr>`,
        ns.any ? `<tr><td>${L.ns.conclRow(ev.annex.noise)}</td><td>${L.ns.conclText(fmt(ns.opMax, 1), ns.n, L.ns.exp[ns.cls])}</td><td class="c">${pill(ns.cls !== 'limit' && !ns.invalid, ns.cls !== 'limit' && !ns.invalid ? L.pass : L.fail)}</td></tr>` : '',
        ev.thermal.any ? `<tr><td>${L.th.conclRow.replace(/\bD\)/, `${ev.annex.thermal})`)}</td><td>${ev.thermal.top ? L.th.conclText(fmt(ev.thermal.max, 1), `D-${ev.thermal.top.i + 1}`, fmt(thLim, 0), Xn(p.thermal.limitText)) : '—'}</td><td class="c">${ev.thermal.max != null ? pill(ev.thermal.pass, ev.thermal.pass ? L.pass : L.fail) : pill(null, L.open)}</td></tr>` : ''
      ].join('');
      const failIds = p.sfs.filter((sf, i) => evals[i].pl && evals[i].plr && !evals[i].ok).map((sf) => sf.id).join(', ');
      const acts = p.actions.map((x) => `<tr><td class="c">${x.uid}</td><td>${X(x.text)}</td><td>${refNo(x.ref) || esc(x.ref || '') || '—'}</td><td>${Xn(x.owner)}</td><td>${Xn(x.due)}</td><td class="c">${L.actStatus[x.status] || L.actStatus.open}</td></tr>`).join('') || emptyRow(6, NO_ROWS[lang]);
      const signs = p.signs.map((s) => `<tr><td class="nowrap"><b>${esc(s.code)}</b></td><td>${X(s.meaning)}</td><td>${X(s.location)}</td></tr>`).join('') || emptyRow(3, NO_ROWS[lang]);
      sections.push({ newPage: true, html: `
        ${h2('13', L.s13)}
        <table class="t"><thead><tr><th style="width:52mm">${L.conclCols[0]}</th><th>${L.conclCols[1]}</th><th class="c" style="width:24mm">${L.conclCols[2]}</th></tr></thead><tbody>${rows}</tbody></table>
        <p>${Xn(p.conclusion) || (failIds ? L.conclSfFail(failIds) : L.conclDefault)}</p>
        ${h3(L.h131)}
        <table class="t small split" style="font-size:7pt"><thead><tr><th class="c" style="width:11mm">${L.actCols[0]}</th><th>${L.actCols[1]}</th><th style="width:16mm">${L.actCols[2]}</th><th style="width:22mm">${L.actCols[3]}</th><th style="width:16mm">${L.actCols[4]}</th><th class="c" style="width:15mm">${L.actCols[5]}</th></tr></thead><tbody>${acts}</tbody></table>
        ${h3(L.h132)}
        <table class="t small split" style="font-size:7pt"><thead><tr><th style="width:18mm">${L.signCols[0]}</th><th style="width:50mm">${L.signCols[1]}</th><th>${L.signCols[2]}</th></tr></thead><tbody>${signs}</tbody></table>` });
    }

    /* ---------- EKLER A–C ---------- */
    const grid = (figs) => (figs.length ? `<div class="photo-grid split-grid">${figs.join('')}</div>` : `<p>${ph(L.noPhotos)}</p>`);
    {
      const det = p.photos.filter((x) => x.kinds.includes('detail')).map((x, i) => `<figure><img src="${img(x.file)}" alt=""><figcaption><b>A-${i + 1}.</b> ${Xn(x.caption)}</figcaption></figure>`);
      sections.push({ newPage: true, html: `${h2('A', L.sA, '', 'A')}${det.length ? `<div class="grid2 split-grid photo-2">${det.join('')}</div>` : `<p>${ph(L.noPhotos)}</p>`}` });
      const set = p.photos.filter((x) => x.kinds.includes('setup')).map((x, i) => `<figure><img src="${img(x.file)}" alt=""><figcaption><b>B-${i + 1}.</b> ${Xn(x.caption) || ''}</figcaption></figure>`);
      sections.push({ newPage: true, html: `${h2('B', L.sB, '', 'B')}${grid(set)}` });
      const extra = p.photos.filter((x) => x.kinds.includes('screen')).map((x) => `<figure><img src="${img(x.file)}" alt=""><figcaption><b>C-${++cNo}.</b> ${Xn(x.caption)}</figcaption></figure>`);
      (p.noise.rows || []).forEach((r) => {
        if (!r.photo) return;
        const v = U.parseNum(r.lpa);
        photos.noiseRef[r.no] = `C-${cNo + 1}`;
        photos.noise.push(`<figure><img src="${img(r.photo)}" alt=""><figcaption><b>C-${++cNo}.</b> ${esc(r.no)}${Xn(r.pos) ? ` · ${Xn(r.pos)}` : ''}${r.dist ? ` · ${esc(r.dist)}` : ''} · <span class="v">${v ? `${fmt(v.n, v.d)} dB(A)` : ''}</span></figcaption></figure>`);
      });
      sections.push({ newPage: true, html: `${h2('C', L.sC, '', 'C')}
        ${h3(L.c1)}${grid(photos.c[0])}${h3(L.c2)}${grid(photos.c[1])}${h3(L.c3)}${grid(photos.c[2])}${extra.length ? h3(L.c4) + grid(extra) : ''}${photos.noise.length ? h3(L.c5) + grid(photos.noise) : ''}` });
    }

    /* ---------- EK D TERMOGRAFİ ---------- */
    if (ev.thermal.any) {
      const AX = ev.annex.thermal;
      const LT = L.th;
      const TD = p.thermal;
      const f1 = (v) => (v == null || Number.isNaN(v) ? '—' : fmt(v, 1));
      const imgs = ev.thermal.images;
      const sums = ev.thermal.sums;
      const thLim = ev.thermal.limit;
      const t0 = imgs[0];
      const same = (k) => imgs.every((t) => t[k] === t0[k]);
      const fov = t0.fov && t0.fov[0] ? `${Math.max(...t0.fov)}° × ${Math.min(...t0.fov)}°` : '—';
      const camera = [LT.camera(rich(TD.instrument || t0.device || ''), esc(TD.serial || t0.serial || ''), esc(t0.fw || '')),
        LT.res(Math.max(t0.w, t0.h), Math.min(t0.w, t0.h), fov), t0.range && t0.range[0] != null ? LT.range(...t0.range.map((v) => (v < 0 ? '−' : '') + fmt(Math.abs(v), 0))) : '',
        TD.accuracy ? `${LT.acc} ${esc(TD.accuracy)}` : ''].filter(Boolean).join(' · ');
      const params = same('eps') && same('rtc') && same('amb') ? LT.params(fmt(t0.eps, 2), f1(t0.rtc), f1(t0.amb)) : LT.paramsVar;
      const okPill = (v) => (v == null || thLim == null ? '—' : pill(v <= thLim, v <= thLim ? '✓' : '✗'));
      const sumRows = imgs.map((t, i) => {
        const s = sums[i];
        const top = s.top;
        const where = top ? ` <span class="muted">(${top.name}${Xn(top.m.label) ? ` · ${Xn(top.m.label)}` : ''})</span>` : '';
        return `<tr><td class="c">D-${i + 1}</td><td>${Xn(t.title) || esc(t.file.split('/').pop())}</td><td class="num-cell">${esc(t.time)}</td><td><b class="num-cell">${f1(s.max)} °C</b>${where}</td><td class="c">${okPill(s.max)}</td></tr>`;
      }).join('');
      const blocks = imgs.map((t, i) => {
        const s = sums[i];
        const sc = TH.scale(t);
        const hMm = ((44 * t.h) / t.w).toFixed(1);
        const vis = ctx.vis && ctx.vis(t);
        const rows = s.rows.map((r) => {
          const v = r.val;
          const isRef = r.m.ref;
          const kind = r.m.type === 'hot' ? LT.hot : r.m.type === 'cold' ? LT.cold : '';
          const loc = [kind, Xn(r.m.label)].filter(Boolean).join(' — ') + (isRef ? ` — <i>${LT.refTag}</i>` : '');
          const val = r.m.type === 'area' ? `${f1(v.max)} <span class="muted">${LT.avg} ${f1(v.avg)}</span>` : f1(v.v);
          return `<tr${isRef ? ' class="ref"' : ''}><td><b>${r.name}</b></td><td>${loc || '—'}</td><td class="c num-cell">${isRef ? `(${val})` : `<b>${val}</b>`}</td><td class="c">${isRef ? '—' : okPill(v.max)}</td></tr>`;
        }).join('');
        const visHtml = !vis ? `<div class="ph-empty" style="height:${hMm}mm">${L.noPhotos}</div>`
          : t.crop ? `<div class="th-crop" style="height:${hMm}mm;aspect-ratio:${(vis.w * t.crop.w).toFixed(1)}/${(vis.h * t.crop.h).toFixed(1)}"><img src="${vis.src}" alt="" style="width:${(100 / t.crop.w).toFixed(3)}%;height:${(100 / t.crop.h).toFixed(3)}%;left:${((-100 * t.crop.x) / t.crop.w).toFixed(3)}%;top:${((-100 * t.crop.y) / t.crop.h).toFixed(3)}%"></div>`
            : `<img src="${vis.src}" alt="" style="height:${hMm}mm">`;
        return `<div class="th-blk">
          <div class="th-hd"><b>D-${i + 1}</b><span class="ti">${Xn(t.title)}</span><span class="fi">${esc(t.file.split('/').pop())} · ${esc(t.date)} ${esc(t.time)}</span></div>
          <div class="th-row">
            <figure class="th-ir"><div class="th-pic" style="height:${hMm}mm;aspect-ratio:${t.w}/${t.h}"><img src="${ctx.thermo(t)}" alt="">${TH.overlay(t)}</div><figcaption>${LT.ir}</figcaption></figure>
            <div class="th-scale" style="height:${hMm}mm"><span>${f1(sc.hi)}</span><img src="${ctx.scaleImg()}" alt=""><span>${f1(sc.lo)}</span><em>°C</em></div>
            <figure class="th-vis">${visHtml}<figcaption>${LT.vis}</figcaption></figure>
            <div class="th-side"><table class="t small th-mk"><thead><tr>${LT.mkCols.map((c, k) => `<th${k > 1 ? ' class="c"' : ''}>${c}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
              <div class="th-par">${LT.imgPar(fmt(t.eps, 2), f1(t.rtc), f1(sc.lo), f1(sc.hi), sc.auto)}</div></div>
          </div>
          ${Xn(t.comment) ? `<p class="th-cmt"><b>${LT.cmt}:</b> ${X(t.comment)}</p>` : ''}
        </div>`;
      });
      const hx = (h) => h.replace(/^D\./, `${AX}.`);
      sections.push({ newPage: true, html: `
        ${h2('D', L.sD, '', AX)}
        ${kv([[LT.kv[0], `${TD.date ? esc(TD.date) : ph(L.fill)}${TD.time ? `, ${esc(TD.time)}` : ''}${Xn(TD.location) ? ` · ${X(TD.location)}` : ''}`], [LT.kv[1], camera], [LT.kv[2], params],
          [LT.kv[3], X(TD.condition)], [LT.kv[4], TD.testedBy ? rich(TD.testedBy) : ph(L.fill)], [LT.kv[5], thLim == null ? ph(L.fill) : LT.limitRow(fmt(thLim, 0), Xn(TD.limitText))]])}
        ${Xn(TD.method) ? `<div class="note warn">${X(TD.method)}</div>` : ''}
        <p class="small muted">${LT.evalNote}</p>
        ${h3(hx(LT.h2))}
        <table class="t small th-crit"><thead><tr>${LT.critCols.map((c, k) => `<th${k ? ' class="c"' : ''}>${c}</th>`).join('')}</tr></thead>
          <tbody><tr><td>${LT.critRow}</td>${LIB.thermalThresholds.map((v) => `<td class="c num-cell">${v.label} °C</td>`).join('')}</tr></tbody></table>
        <p class="small muted">${LT.critNote}</p>
        ${h3(hx(LT.h3))}
        <table class="t small split"><thead><tr><th class="c" style="width:11mm">${LT.sumCols[0]}</th><th>${LT.sumCols[1]}</th><th style="width:15mm">${LT.sumCols[2]}</th><th style="width:72mm">${LT.sumCols[3]}</th><th class="c" style="width:11mm">${LT.sumCols[4]}</th></tr></thead><tbody>${sumRows}</tbody></table>
        ${Xn(TD.conclusion) ? `<p>${X(TD.conclusion)}</p>` : ''}
        ${h3(hx(LT.h4))}
        <div class="th-list split-grid">${blocks.join('')}</div>` });
    }

    /* ---------- EK E GÜRÜLTÜ ---------- */
    if (ev.noise.any) {
      const AX = ev.annex.noise;
      const LN = L.ns;
      const G = p.noise;
      const ns = ev.noise;
      const f1 = (v) => (v == null || Number.isNaN(v) ? '—' : fmt(v, 1));
      const dev = [G.instrument ? rich(G.instrument) : ph(L.fill), G.serial ? `${L.instrument('', esc(G.serial), esc(G.calib || '—')).replace(/^ · /, '')}` : ''].filter(Boolean).join(' · ');
      const rows = ns.rows.map((r) => {
        const op = r.op ? ` <span class="opdot" title="${LN.op}">●</span>` : '';
        const photo = photos.noiseRef[r.row.no] || '—';
        return `<tr><td class="c">${esc(r.row.no)}${op}</td><td>${X(r.row.pos, { ph: false }) || '—'}</td><td class="c num-cell">${esc(r.row.dist) || '—'}</td><td class="c num-cell">${r.lpa == null ? '—' : f1(r.lpa)}</td><td class="c num-cell">${r.bg == null ? '—' : f1(r.bg)}</td><td class="c num-cell">${r.K1 == null ? `<span class="tag-o">${LN.invalid}</span>` : r.bg == null ? '—' : f1(-r.K1)}</td><td class="c num-cell"><b>${r.corr == null ? '—' : f1(r.corr)}</b></td><td class="c num-cell">${r.lcpeak == null ? '—' : f1(r.lcpeak)}</td><td class="c">${photo}</td></tr>`;
      }).join('');
      const declOk = ns.cls !== 'limit' && !ns.invalid;
      const lwa = ns.needLWA ? (G.LWA != null ? `L<sub>WA</sub> = ${f1(G.LWA)} dB(A)` : `<span class="tag-o">${LN.lwaNeed}</span>`) : LN.lwaNo;
      const peak = ns.peakMax == null ? LN.notMeasured : ns.needPeak ? `${f1(ns.peakMax)} dB(C)` : `${f1(ns.peakMax)} dB(C) — ${LN.peakNo}`;
      sections.push({ newPage: true, html: `
        ${h2('E', LN.title, '', AX)}
        ${kv([[LN.kv[0], `${G.date ? esc(G.date) : ph(L.fill)}${G.time ? `, ${esc(G.time)}` : ''}${Xn(G.location) ? ` · ${X(G.location)}` : ''}`], [LN.kv[1], dev], [LN.kv[2], X(G.method)], [LN.kv[3], X(G.condition)], [LN.kv[4], G.testedBy ? rich(G.testedBy) : ph(L.fill)], [LN.kv[5], `K = ${f1(ns.K)} dB (EN ISO 4871)`]])}
        ${h3(LN.h1(AX))}
        <table class="t small"><thead><tr><th style="width:52mm">${LN.critCols[0]}</th><th>${LN.critCols[1]}</th></tr></thead><tbody>${LN.crit.map((r) => `<tr><td class="num-cell">${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table>
        <p class="small muted">${LN.bgNote}</p>
        ${h3(LN.h2(AX))}
        <table class="t small split"><thead><tr><th class="c" style="width:12mm">${LN.cols[0]}</th><th>${LN.cols[1]}</th><th class="c" style="width:14mm">${LN.cols[2]}</th><th class="c" style="width:14mm">${LN.cols[3]}<br><span class="u">dB(A)</span></th><th class="c" style="width:15mm">${LN.cols[4]}<br><span class="u">dB(A)</span></th><th class="c" style="width:11mm">${LN.cols[5]}<br><span class="u">dB</span></th><th class="c" style="width:16mm">${LN.cols[6]}<br><span class="u">dB(A)</span></th><th class="c" style="width:15mm">${LN.cols[7]}<br><span class="u">dB(C)</span></th><th class="c" style="width:11mm">${LN.cols[8]}</th></tr></thead><tbody>${rows}</tbody></table>
        ${h3(LN.h3(AX))}
        ${kv([[LN.declRow, `<b>${LN.decl(f1(ns.opMax), f1(ns.K), ns.cls)}</b> ${pill(declOk, declOk ? L.pass : L.fail)}`], [LN.lwaRow, lwa], [LN.peakRow, peak], [LN.expRow, LN.exp[ns.cls]]])}
        ${Xn(G.conclusion) ? `<p>${X(G.conclusion)}</p>` : ''}` });
    }

    sections[sections.length - 1].html += `<p class="end">— ${L.endOfReport} —</p>`;
    // Doldurulacak alan kalmadıysa okuma notundaki "sarı vurgulu alanlar" cümlesi çıkarılır
    if (sections.reduce((n, sec) => n + (sec.html.match(/class="tbd"/g) || []).length, 0) <= 1) {
      sections.forEach((sec) => { sec.html = sec.html.replace(/(<div class="note"><b>[^<]*<\/b>) <span class="tbd">[^<]*<\/span>[^.]*\.\s*/, '$1 '); });
    }
    return { sections, toc, stats };
  }

  /* ---------- Risk grafiği: projedeki SF'lerin S/F/P yolları ---------- */
  function riskGraphSVG(p, L) {
    const COLORS = ['#e2231a', '#1a2540', '#0f766e', '#7c3aed', '#b45309', '#be185d'];
    const yS = { 1: 85, 2: 235 };
    const yF = { '1-1': 50, '1-2': 120, '2-1': 200, '2-2': 270 };
    const groups = {};
    p.sfs.forEach((sf) => { const k = `${sf.S}-${sf.F}-${sf.P}`; (groups[k] = groups[k] || []).push(sf.id); });
    const leaf = (S, F, P) => yF[`${S}-${F}`] + (P === 1 ? -17 : 17);
    let paths = '';
    let notes = '';
    let boxes = '';
    const used = new Set();
    Object.entries(groups).forEach(([k, ids], gi) => {
      const [S, F, P] = k.split('-').map(Number);
      const y = leaf(S, F, P);
      const c = COLORS[gi % COLORS.length];
      paths += `<path d="M30 160 V${yS[S]} H150 V${yF[`${S}-${F}`]} H280 V${y} H420" stroke="${c}" stroke-width="3.6" fill="none"${gi % 2 ? ' stroke-dasharray="7 4"' : ''}/>`;
      notes += `<text x="462" y="${y + 5}" font-size="12" font-weight="700" fill="${c}">◀ ${ids.join(' · ')}  (S${S} · F${F} · P${P} → PLr ${C.PLR_GRAPH[S][F][P]})</text>`;
      used.add(y);
    });
    const leaves = [[1, 1, 1], [1, 1, 2], [1, 2, 1], [1, 2, 2], [2, 1, 1], [2, 1, 2], [2, 2, 1], [2, 2, 2]];
    leaves.forEach(([S, F, P]) => {
      const y = leaf(S, F, P);
      const pl = C.PLR_GRAPH[S][F][P];
      const gi = Object.keys(groups).indexOf(`${S}-${F}-${P}`);
      boxes += `<rect x="420" y="${y - 12}" width="30" height="24" rx="3" fill="${C.PL_COLOR[pl]}"${gi >= 0 ? ` stroke="${COLORS[gi % COLORS.length]}" stroke-width="3"` : ''}/><text x="435" y="${y + 5}" font-size="15" font-weight="700" fill="#fff" text-anchor="middle">${pl}</text>`;
      boxes += `<text x="340" y="${y - 5}" font-size="11" font-weight="700" fill="#1a2540">P${P}</text>`;
    });
    const scaleTop = used.has(33) ? '' : `<text x="462" y="38" font-size="10.5" fill="#64748b">${L.graph.low}</text>`;
    const scaleBot = used.has(287) ? '' : `<text x="462" y="292" font-size="10.5" fill="#64748b">${L.graph.high}</text>`;
    return `<svg class="rg" viewBox="0 0 700 320" width="100%" role="img" aria-label="ISO 13849-1 risk graph">
      <path d="M30 160 V85 H150 M30 160 V235 H150 M150 85 V50 H280 M150 85 V120 H280 M150 235 V200 H280 M150 235 V270 H280 M280 50 V33 H420 M280 50 V67 H420 M280 120 V103 H420 M280 120 V137 H420 M280 200 V183 H420 M280 200 V217 H420 M280 270 V253 H420 M280 270 V287 H420" stroke="#94a3b8" stroke-width="1.6" fill="none"/>
      ${paths}<circle cx="30" cy="160" r="7" fill="#1a2540"/>
      <text x="10" y="150" font-size="11" font-weight="700" fill="#1a2540">${L.graph.start}</text>
      <g font-size="13" font-weight="700" fill="#1a2540"><text x="80" y="79">S1</text><text x="80" y="229">S2</text><text x="205" y="44">F1</text><text x="205" y="114">F2</text><text x="205" y="194">F1</text><text x="205" y="264">F2</text></g>
      ${boxes}${notes}${scaleTop}${scaleBot}</svg>`;
  }

  /* ---------- Güvenlik fonksiyonu blok diyagramı (kategoriye göre tek / çift kanal) ---------- */
  function sfDiagramSVG(sf, L, lang) {
    const subs = sf.subs;
    const n = subs.length;
    const W = 720;
    const left = 10;
    const loadW = 84;
    const gap = 46;
    const colW = (W - left - loadW - 20 - gap * (n - 1)) / n;
    const dual = (s) => ['3', '4'].includes(s.cat);
    const short = (s, ch) => {
      const name = String(s.comp[lang] || s.comp.tr || '').split(' — ')[0].replace(/<[^>]+>/g, '').trim() || (L.roles[s.role] || '');
      const parts = name.split(/,\s*/);
      return esc((ch === 2 && parts[1] ? parts[1] : parts[0]).slice(0, 18));
    };
    const pre = { input: 'I', logic: 'L', output: 'O', other: 'S' };
    const box = (x, y, w, t1, t2) => `<rect x="${x}" y="${y}" width="${w}" height="52" rx="4" fill="#f4f6fa" stroke="#1a2540" stroke-width="1.5"/><text x="${x + w / 2}" y="${y + 22}" font-size="12.5" font-weight="700" fill="#1a2540" text-anchor="middle">${t1}</text><text x="${x + w / 2}" y="${y + 40}" font-size="10.5" fill="#64748b" text-anchor="middle">${t2}</text>`;
    // Ok başları çizgi olarak çizilir (PDF'e de aynı geçer)
    const arrow = (d, mon) => {
      const pts = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
      const cmds = d.match(/[MHV]/g);
      let x = 0;
      let y = 0;
      let px = 0;
      let py = 0;
      let k = 0;
      for (const c of cmds) {
        px = x; py = y;
        if (c === 'M') { x = pts[k++]; y = pts[k++]; px = x; py = y; } else if (c === 'H') x = pts[k++]; else y = pts[k++];
      }
      const ang = Math.atan2(y - py, x - px);
      const s = 6;
      const ax = x - s * Math.cos(ang - 0.45);
      const ay = y - s * Math.sin(ang - 0.45);
      const bx = x - s * Math.cos(ang + 0.45);
      const by = y - s * Math.sin(ang + 0.45);
      const col = mon ? '#e2231a' : '#1a2540';
      return `<path d="${d}" stroke="${col}" stroke-width="${mon ? 1.4 : 1.6}" fill="none"${mon ? ' stroke-dasharray="5 3"' : ''}/><path d="M${x} ${y} L${ax.toFixed(1)} ${ay.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)} Z" fill="${col}"/>`;
    };
    let g = '';
    const ports = [];
    subs.forEach((s, i) => {
      const x = left + i * (colW + gap);
      const p = pre[s.role] || 'S';
      const sub2 = `${L.roles[s.role] || ''} · Kat. ${esc(s.cat)}`;
      if (dual(s)) {
        g += box(x, 30, colW, `${p}1 · ${short(s, 1)}`, sub2) + box(x, 138, colW, `${p}2 · ${short(s, 2)}`, sub2);
        ports.push({ x, w: colW, dual: true, role: s.role });
        if (s.role === 'logic') g += arrow(`M${x + colW * 0.4} 84 V136`, true) + arrow(`M${x + colW * 0.6} 136 V84`, true) + `<text x="${x + colW * 0.6 + 8}" y="114" font-size="10" font-weight="600" fill="#e2231a">c</text>`;
      } else {
        g += box(x, 84, colW, `${p} · ${short(s, 1)}`, sub2);
        ports.push({ x, w: colW, dual: false, role: s.role });
        if (s.cat === '2') g += `<rect x="${x}" y="170" width="${colW}" height="34" rx="4" fill="#fff" stroke="#1a2540" stroke-dasharray="5 3"/><text x="${x + colW / 2}" y="191" font-size="10.5" fill="#1a2540" text-anchor="middle">${L.diag.te}</text>${arrow(`M${x + colW / 2} 170 V138`, true)}`;
      }
    });
    for (let i = 0; i < ports.length - 1; i += 1) {
      const a = ports[i];
      const b = ports[i + 1];
      const x1 = a.x + a.w;
      const x2 = b.x - 2;
      if (a.dual && b.dual) g += arrow(`M${x1} 50 H${x2}`) + arrow(`M${x1} 158 H${x2}`) + arrow(`M${x1} 74 H${x2}`, true) + arrow(`M${x1} 182 H${x2}`, true);
      else if (a.dual) g += arrow(`M${x1} 56 H${x1 + gap / 2} V104 H${x2}`) + arrow(`M${x1} 164 H${x1 + gap / 2} V116 H${x2}`);
      else if (b.dual) g += arrow(`M${x1} 104 H${x1 + gap / 2} V56 H${x2}`) + arrow(`M${x1} 116 H${x1 + gap / 2} V164 H${x2}`);
      else g += arrow(`M${x1} 110 H${x2}`);
      if (b.role === 'output' && a.role === 'logic' && ['2', '3', '4'].includes(subs[i + 1].cat)) {
        const xm = b.x + b.w * 0.3;
        g += b.dual ? arrow(`M${xm} 84 V97 H${x1 + 10} V74 H${x1 + 2}`, true) + arrow(`M${xm} 136 V123 H${x1 + 10} V146 H${x1 + 2}`, true) : arrow(`M${xm} 136 V150 H${x1 - 10} V136`, true);
        g += `<text x="${x1 + 14}" y="114" font-size="10" font-weight="600" fill="#e2231a">EDM</text>`;
      }
    }
    const last = ports[ports.length - 1];
    const lx = W - loadW - 4;
    g += last.dual ? arrow(`M${last.x + last.w} 56 H${lx - 18} V100 H${lx - 2}`) + arrow(`M${last.x + last.w} 164 H${lx - 18} V120 H${lx - 2}`) : arrow(`M${last.x + last.w} 110 H${lx - 2}`);
    g += `<rect x="${lx}" y="70" width="${loadW}" height="80" rx="4" fill="#fdecea" stroke="#e2231a" stroke-width="1.5"/><text x="${lx + loadW / 2}" y="114" font-size="10.5" font-weight="700" fill="#1a2540" text-anchor="middle">${LOAD[lang]}</text>`;
    const legend = `<path d="M10 236 H44" stroke="#e2231a" stroke-width="1.4" stroke-dasharray="5 3"/><text x="52" y="240" font-size="10.5" fill="#64748b">${L.diag.legend}</text>`;
    return `<svg class="sfd" viewBox="0 0 720 248" width="100%" role="img" aria-label="${esc(sf.name.tr)}">${g}${legend}</svg>`;
  }

  return { buildReport, riskGraphSVG, sfDiagramSVG };
});
