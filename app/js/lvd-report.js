/* LVD test raporu — bölüm HTML'leri, kapak, antetli sayfalar.
   build(m, ev, lang, ctx) → { sections, toc } (DOM'suz) · render(m, ev, lang, ctx, stage) → { pages, toc } (tarayıcı)
   Sayfalama risk analizinin sayfa motorunu (RaLayout.paginate) kullanır; antet ve kapak metinleri LVD'ye aittir.
   ctx: { img(yol) → src, logo(yol) → src } */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./util.js'), require('./lvd-lib.js'), require('./lvd.js'));
  else root.RaLvdReport = factory(root.RaUtil, root.RA_LVD, root.RaLvd);
})(typeof self !== 'undefined' ? self : this, function (U, LIB, LVD) {
  'use strict';

  const { esc, rich } = U;
  const FIG = { tr: 'Şekil', en: 'Figure', de: 'Bild' };
  const brandsOf = () => ((typeof self !== 'undefined' && self.RA_LIB) || (typeof globalThis !== 'undefined' && globalThis.RA_LIB) || { brands: {}, preparedLogos: {} });
  const brandOf = (m) => { const B = brandsOf().brands || {}; return B[String(m.meta.brand || 'DOLFIN').toUpperCase()] || B.DOLFIN || { name: 'DOLFIN', accent: '#ff0000', footer: m.meta.manufacturer, logo: 'assets/logos/dolfin.png' }; };

  /** Çok dilli metin → HTML; çeviri yoksa Türkçe (önizlemede işaretli) */
  function makeX(lang, stats) {
    const T = LIB.T[lang];
    return (o, opt) => {
      const ph = !opt || opt.ph !== false;
      const empty = ph ? `<span class="tbd">${T.fill}</span>` : '';
      if (o == null) return empty;
      if (typeof o === 'string') return o.trim() ? rich(o) : empty;
      const v = o[lang];
      if (v && String(v).trim()) return rich(v);
      const fb = o.tr || o.en || o.de;
      if (fb && String(fb).trim()) {
        if (lang !== 'tr' && /[a-zçğıöşü]{3}/i.test(fb)) { stats.missing += 1; return `<span class="mt" title="Çeviri eksik">${rich(fb)}</span>`; }
        return rich(fb);
      }
      return empty;
    };
  }
  const titleSize = (text, sizes) => { const n = String(text).length; return n <= 10 ? sizes[0] : n <= 16 ? sizes[1] : n <= 24 ? sizes[2] : n <= 34 ? sizes[3] : sizes[4]; };
  const fmtN = (v, dec) => { if (v == null || Number.isNaN(+v)) return '—'; const n = +v; const s = Number.isInteger(n) ? String(n) : String(+n.toFixed(3)); return s.replace('.', dec); };

  /* ─── Kapak (Kırmızı Bant düzeni, risk analizi kapağıyla aynı CSS) ─── */
  function cover(m, ev, lang, ctx) {
    const T = LIB.T[lang];
    const M = m.meta;
    const brand = brandOf(m);
    const up = (s) => String(s || '').toLocaleUpperCase(lang === 'tr' ? 'tr' : lang);
    const st = T.stamp[M.status === 'final' ? 'final' : 'draft'];
    const X = makeX(lang, { missing: 0 });
    const R = T.cover.rows;
    const prepLogo = M.preparedLogo && M.preparedLogo !== 'yok' ? ((brandsOf().preparedLogos || {})[M.preparedLogo] || M.preparedLogo) : null;
    const coverPhoto = (m.photos.find((p) => p.kind === 'cover') || {}).file || M.coverPhoto || null;
    const photo = coverPhoto ? `<div class="cv-photo" style="height:236px"><img src="${esc(ctx.img(coverPhoto))}" alt=""></div>` : `<div class="cv-photo cv-nophoto" style="height:236px"><span>${esc(T.noPhotos)}</span></div>`;
    const rows = [[R.job, esc(M.job), true], [R.customer, esc(M.customer)], [R.model, esc(M.model)], [R.serial, esc(M.serial || M.job)], [R.docNo, esc(M.docNo)], [R.rev, esc(M.rev)], [R.date, esc(m.cond.date || M.reportDate || '—')], [R.pages, '<span class="cv-pages">—</span>']]
      .map(([k, v, s]) => `<div class="cv-row"><dt>${esc(k)}</dt><dd${s ? ' class="strong"' : ''}>${v || '—'}</dd></div>`).join('');
    const A = M.approvals || {};
    const Tt = A.titles || {};
    const box = (label, name, t) => `<div class="cv-sign-box"><span>${esc(label)}</span><b>${esc(name || '')}</b><i>${t ? X(t, { ph: false }) : ''}</i></div>`;
    const S = T.cover.sign;
    const model = up(M.model);
    return `<section class="page cover cv cv-bant" lang="${lang}" style="--cv-accent:${brand.accent}">
      <aside class="cvb-band"><span class="cvb-std">${T.cover.std}</span><span class="cvb-mark">${esc(T.cover.mark)}</span></aside>
      <div class="cvb-main">
        <div class="cvb-top"><img class="cv-logo" src="${esc(ctx.logo ? ctx.logo(brand.logo) : brand.logo)}" alt=""><div class="cv-stamp">${esc(st[0])}<span>Rev. ${esc(M.rev)} · ${esc(st[1])}</span></div></div>
        <div class="cvb-head">
          <div class="cv-kicker">${esc(T.cover.kicker)}</div>
          <h1 class="cv-title" style="font-size:${titleSize(model, [76, 64, 52, 42, 34])}px">${esc(model)}</h1>
          <div class="cv-rule"></div>
          <div class="cv-customer">${esc(up(M.customer))}</div>
          <div class="cv-machine">${X(m.machine.type, { ph: false })}</div>
        </div>
        ${photo}
        <dl class="cv-list">${rows}</dl>
        <div class="cv-sign">${box(S[0], A.prepared, Tt.prepared)}${box(S[1], A.checked, Tt.checked)}${box(S[2], A.approved, Tt.approved)}</div>
        <div class="cv-foot"><div class="cv-addr"><b>${esc(brand.footer || M.manufacturer)}</b>${M.brandLine ? `<br>${esc(M.brandLine)}` : ''}<br>${esc(T.confidential)}</div>${prepLogo ? `<img class="cv-prep" src="${esc(ctx.logo ? ctx.logo(prepLogo) : prepLogo)}" alt="">` : ''}</div>
      </div>
    </section>`;
  }

  /* ─── Bölümler ─────────────────────────────────────────── */
  function build(m, ev, lang, ctx) {
    const T = LIB.T[lang];
    const stats = { missing: 0 };
    const X = makeX(lang, stats);
    const Xn = (o) => X(o, { ph: false });
    const M = m.meta;
    const Lm = m.limits;
    const dec = T.dec;
    const fmt = (v, d) => U.fmtDec(v, d, dec);
    // Kriter metinlerinde sayılar dile göre biçimlenir
    const Lf = { rpeI: fmtN(Lm.rpeI, dec), rpeT: fmtN(Lm.rpeT, dec), rpeMax: fmt(Lm.rpeMax, 2), isoU: fmtN(Lm.isoU, dec), isoT: fmtN(Lm.isoT, dec), isoMin: fmt(Lm.isoMin, 2), hvU: fmtN(Lm.hvU, dec), hvT: fmtN(Lm.hvT, dec), hvMax: fmt(Lm.hvMax, 2), leakMax: fmtN(Lm.leakMax, dec), resMax: fmtN(Lm.resMax, dec), resT: fmtN(Lm.resT, dec), u0: fmtN(Lm.u0, dec) };
    const ph = (t) => `<span class="tbd">${t}</span>`;
    const pill = (state, txt) => `<span class="pill ${state === 'pass' ? 'ok' : state === 'fail' ? 'bad' : state === 'na' || state === 'none' || state === 'skip' ? 'na' : 'pend'}">${txt}</span>`;
    // Zorunlu test (a, b, h) yapılmamışsa "açık", uygulanabilir test yapılmamışsa "yapılmadı"
    const statePill = (s, req) => ((s === 'none' || s === 'skip') && req ? pill('open', T.pill.open) : pill(s, s === 'none' ? T.pill.skip : T.pill[s] || T.pill.open));
    const resPill = (r) => (r === 'ok' ? pill('pass', T.res.ok) : r === 'nok' ? pill('fail', T.res.nok) : r === 'na' ? pill('na', T.res.na) : '—');
    const toc = [];
    const sections = [];
    let secNo = 0;
    const h2 = (key, title, ref, annex) => {
      const id = `lvd-sec-${key}`;
      const num = annex ? `${T.annex} ${annex}` : String(++secNo);
      toc.push({ id, num, title });
      return `<h2 class="sec" id="${id}" data-keep><span class="num">${num}</span><span class="ti">${title}</span>${ref ? ` <span class="ref">${ref}</span>` : ''}</h2>`;
    };
    const h3 = (t, id) => { if (id) toc.push({ id, num: '', title: t, sub: true }); return `<h3 data-keep${id ? ` id="${id}"` : ''}>${t}</h3>`; };
    const kv = (rows) => `<table class="t kv"><tbody>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</tbody></table>`;
    const img = (f) => (f ? ctx.img(f) : '');
    const libVis = Object.fromEntries(LIB.VISUAL.map((v) => [v.id, v]));
    const libFunc = Object.fromEntries(LIB.FUNC.map((f) => [f.id, f]));
    const tests = ev.tests;

    /* Kapak */
    sections.push({ cover: true, html: cover(m, ev, lang, ctx) });

    /* Doküman kontrol + içindekiler */
    {
      const revs = LVD.revisions(m).map((r) => `<tr><td class="c">${esc(r.rev)}</td><td>${esc(r.date)}</td><td>${X(r.desc)}</td><td>${r.by ? esc(r.by) : ph('[…]')}</td><td>${r.approvedBy ? esc(r.approvedBy) : ph('[…]')}</td></tr>`).join('');
      sections.push({ newPage: true, html: `
        <h3 data-keep>${T.revHist}</h3>
        <table class="t split"><thead><tr><th class="c" style="width:12mm">${T.revCols[0]}</th><th style="width:22mm">${T.revCols[1]}</th><th>${T.revCols[2]}</th><th style="width:34mm">${T.revCols[3]}</th><th style="width:34mm">${T.revCols[4]}</th></tr></thead><tbody>${revs}</tbody></table>
        <h3 class="toc-h" data-keep>${T.contents}</h3>
        <ol class="toc" id="lvd-toc"></ol>` });
    }

    /* 1 Amaç ve kapsam · 2 Standartlar */
    {
      const v = { manufacturer: esc(M.manufacturer || '—'), model: esc(`${M.brandName ? `${M.brandName} ` : ''}${M.model}`), serial: esc(M.serial || M.job || '—'), job: esc(M.job || '—') };
      sections.push({ newPage: true, html: `
        ${h2('1', T.s1)}
        <p>${T.purpose(v)}</p>
        <p>${T.purpose2}</p>
        ${M.riskDoc ? `<div class="note">${T.linked(esc(M.riskDoc))}</div>` : ''}
        <div class="gap"></div>
        ${h2('2', T.s2)}
        <table class="t"><thead><tr><th style="width:48mm">${T.stdCols[0]}</th><th>${T.stdCols[1]}</th></tr></thead><tbody>${T.standards.map(([r, t]) => `<tr><td><b>${esc(r)}</b></td><td>${esc(t)}</td></tr>`).join('')}</tbody></table>` });
    }

    /* 3 Makine ve besleme · 4 Test koşulları ve cihazlar */
    {
      const C = m.machine;
      const Mh = T.mach;
      const val = (s) => (s ? rich(s) : ph(T.fill));
      const opt = (s) => (s ? rich(s) : '—');
      const machRows = [
        [Mh.manufacturer, esc(M.manufacturer || '—')], [Mh.model, esc(`${M.brandName ? `${M.brandName} ` : ''}${M.model}`)], [Mh.serial, `${esc(M.serial || M.job || '—')}${M.year ? ` · ${esc(M.year)}` : ''}`], [Mh.type, X(C.type)],
        [Mh.supply, val(C.supply)], [Mh.current, val(C.current)], [Mh.power, opt(C.power)], [Mh.network, opt(C.network)], [Mh.fuse, opt(C.fuse)], [Mh.sccr, opt(C.sccr)],
        [Mh.protClass, opt(C.protClass)], [Mh.ip, opt(C.ip)], [Mh.connection, Xn(C.connection) || '—']
      ];
      const K = m.cond;
      const Cn = T.cond;
      const condRows = [[Cn.date, `${K.date ? esc(K.date) : ph(T.fill)}${K.time ? `, ${esc(K.time)}` : ''}`], [Cn.location, X(K.location)], [Cn.ambient, opt(K.ambient)], [Cn.testedBy, K.testedBy ? esc(K.testedBy) : ph(T.fill)]];
      if (Xn(K.connection)) condRows.push([Cn.connection, X(K.connection)]);
      const tDate = LVD.toDate(K.date);
      const devRows = m.devices.map((d) => {
        const v = LVD.toDate(d.valid);
        const st = v && tDate ? (v >= tDate ? pill('pass', T.calOk) : pill('fail', T.calExp)) : '—';
        return `<tr><td>${X(d.name)}</td><td>${d.model ? rich(d.model) : '—'}</td><td>${d.serial ? esc(d.serial) : ph(T.fill)}</td><td>${d.calib ? esc(d.calib) : ph(T.fill)}</td><td>${d.valid ? esc(d.valid) : '—'}</td><td class="c">${st}</td></tr>`;
      }).join('') || `<tr><td colspan="6" class="c">${ph(T.fill)}</td></tr>`;
      sections.push({ newPage: true, html: `
        ${h2('3', T.s3)}
        ${Xn(C.desc) ? `<p>${X(C.desc)}</p>` : ''}
        ${kv(machRows)}
        <div class="gap"></div>
        ${h2('4', T.s4)}
        ${kv(condRows)}
        ${Xn(K.method) ? `<div class="note small"><b>${Cn.method}:</b> ${X(K.method)}</div>` : ''}
        ${h3(T.devTitle)}
        <table class="t small"><thead><tr><th>${T.devCols[0]}</th><th style="width:40mm">${T.devCols[1]}</th><th style="width:24mm">${T.devCols[2]}</th><th style="width:22mm">${T.devCols[3]}</th><th style="width:20mm">${T.devCols[4]}</th><th class="c" style="width:20mm">${T.devCols[5]}</th></tr></thead><tbody>${devRows}</tbody></table>
        <p class="small muted">${T.devNote}</p>` });
    }

    /* Ölçüm fotoğraf numaraları (Ek A) */
    const photoRef = {};
    const annexA = {};
    let aNo = 0;
    const unit = { rpe: 'Ω', loop: 'Ω', iso: 'MΩ', hv: 'mA', res: 'V', leak: 'mA' };
    const tag = { rpe: 'R<sub>PE</sub>', loop: 'Z<sub>s</sub>', iso: 'R<sub>ISO</sub>', hv: 'HV', res: 'U', leak: 'I<sub>PE</sub>' };
    const fmtM = (mm) => (mm ? `${mm.gt ? '&gt; ' : mm.lt ? '&lt; ' : ''}${fmt(mm.n, mm.d)}` : '—');
    for (const k of LIB.MEAS) {
      annexA[k] = [];
      tests[k].rows.forEach((x) => {
        if (!x.r.photo) return;
        const ref = `A-${++aNo}`;
        photoRef[`${k}:${x.r.tag}`] = ref;
        const pt = Xn(k === 'loop' ? x.r.circuit : x.r.point);
        annexA[k].push(`<figure><img src="${img(x.r.photo)}" alt=""><figcaption><b>${ref}.</b> ${tag[k]} ${esc(x.r.tag)}${pt ? ` · ${pt}` : ''}${x.r.time ? ` · ${esc(x.r.time)}` : ''}${x.v ? ` · <span class="v">${fmtM(x.v)} ${unit[k]}</span>` : ''}</figcaption></figure>`);
      });
    }

    /* 5 Test programı ve sonuç özeti */
    {
      const count = (t) => (t.key === 'visual' ? `${tests.visual.ok + tests.visual.nok + tests.visual.na} / ${tests.visual.n}` : t.key === 'func' ? `${tests.func.ok + tests.func.nok + tests.func.na} / ${tests.func.n}` : String(tests[t.key].n));
      const crit = (k) => (typeof T.crit[k] === 'function' ? T.crit[k](Lf) : T.crit[k]);
      const rows = LIB.TESTS.map((t) => `<tr><td class="c"><b>${t.letter})</b></td><td>${esc(t.name[lang] || t.name.tr)}<br><span class="muted small">${esc(t.clause)}</span></td><td>${t.req ? `<b>${T.req}</b>` : T.opt}</td><td>${crit(t.key)}</td><td class="c num-cell">${count(t)}</td><td class="c">${statePill(tests[t.key].state, t.req)}</td></tr>`).join('');
      sections.push({ newPage: true, html: `
        ${h2('5', T.s5, '(EN 60204-1 §18.1)')}
        <p>${T.p5}</p>
        <table class="t small"><thead><tr><th class="c" style="width:11mm">${T.progCols[0]}</th><th>${T.progCols[1]}</th><th style="width:22mm">${T.progCols[2]}</th><th style="width:46mm">${T.progCols[3]}</th><th class="c" style="width:13mm">${T.progCols[4]}</th><th class="c" style="width:24mm">${T.progCols[5]}</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="lvd-verdict ${ev.overall}">${verdict()}</div>` });
    }
    function verdict() {
      const names = (list) => list.map((t) => `${t.letter}) ${esc(t.name[lang] || t.name.tr)}`).join('; ');
      const model = esc(M.model);
      if (ev.overall === 'fail') return T.verdict.fail(model, names(ev.fails));
      if (ev.overall === 'open') return T.verdict.open(model, names(ev.blocking));
      if (ev.overall === 'cond') return T.verdict.cond(model, names(ev.conds));
      return T.verdict.pass(model);
    }

    /* 6 Gözle kontrol */
    {
      let g = null;
      const rows = m.visual.map((v) => {
        const lib = libVis[v.id];
        const grp = lib ? lib.g : 'other';
        let head = '';
        if (grp !== g) { g = grp; head = `<tr class="grp"><td colspan="5">${esc((LIB.GROUPS[grp] && (LIB.GROUPS[grp][lang] || LIB.GROUPS[grp].tr)) || (lang === 'tr' ? 'Ek kontroller' : lang === 'de' ? 'Zusätzliche Prüfpunkte' : 'Additional items'))}</td></tr>`; }
        const text = lib ? esc(lib.text[lang] || lib.text.tr) : X(v.text);
        const clause = lib ? lib.clause : v.clause || '—';
        const ref = v.photo ? photoRefB[v.photo] : '';
        const note = [Xn(v.note), ref ? `<span class="muted">(${ref})</span>` : ''].filter(Boolean).join(' ');
        return `${head}<tr><td class="c nowrap"><b>${esc(v.id)}</b></td><td>${text}</td><td class="nowrap small">${esc(clause)}</td><td class="c">${resPill(v.result)}</td><td>${note || '—'}</td></tr>`;
      }).join('');
      sections.push({ newPage: true, html: `
        ${h2('6', T.s6, T.s6ref)}
        <p>${T.p6}</p>
        <table class="t small split lvd-vis"><thead><tr><th class="c" style="width:12mm">${T.visCols[0]}</th><th>${T.visCols[1]}</th><th style="width:22mm">${T.visCols[2]}</th><th class="c" style="width:14mm">${T.visCols[3]}</th><th style="width:40mm">${T.visCols[4]}</th></tr></thead><tbody>${rows}</tbody></table>
        <p class="small muted">${T.legend}</p>` });
    }

    /* 7 Ölçümler */
    {
      const C = T.cols;
      // Koruma iletkeni akımı > 10 mA uygunsuzluk değil, §8.2.6 önlemi gerektirir: "!"
      const okCell = (k, x) => (x.ok == null ? '—' : x.ok ? pill('pass', '✓') : k === 'leak' ? pill('warn', '!') : pill('fail', '✗'));
      const statusNote = (k) => {
        const s = m.meas[k].status;
        const t = s === 'site' ? T.status.site : s === 'na' ? T.status.na : s === 'skip' ? T.status.skip : T.status.none;
        return `<div class="note small">${t}${Xn(m.meas[k].note) ? ` ${X(m.meas[k].note)}` : ''}</div>`;
      };
      const noteOf = (k) => (Xn(m.meas[k].note) && tests[k].rows.length ? `<p class="small muted">${X(m.meas[k].note)}</p>` : '');
      // Değer, fotoğraf ya da saat girilmemiş test "yapılmadı" sayılır: "…ölçülmüştür" paragrafı yazılmaz
      const doneK = (k) => tests[k].n > 0 || !['none', 'na', 'site', 'skip'].includes(tests[k].state);
      const crit = (k) => (typeof T.crit[k] === 'function' ? T.crit[k](Lf) : T.crit[k]);
      const para = (k, p) => (doneK(k) ? `<p>${p}</p>` : '');
      const table = (k, head, cells) => {
        const rows = tests[k].rows;
        if (!doneK(k) || !rows.length) return `${statusNote(k)}<p class="small muted">${T.critLabel}: ${crit(k)}</p>`;
        return `<table class="t small split"><thead><tr>${head.map(([t, w, c]) => `<th${c ? ' class="c"' : ''}${w ? ` style="width:${w}mm"` : ''}>${t}</th>`).join('')}</tr></thead><tbody>${rows.map((x) => `<tr>${cells(x).join('')}</tr>`).join('')}</tbody></table>${noteOf(k)}`;
      };
      const ref = (k, x) => `<td class="c">${photoRef[`${k}:${x.r.tag}`] || '—'}</td>`;
      const valCell = (k, x) => `<td class="c num-cell"><b>${x.v ? `${fmtM(x.v)} ${unit[k]}` : ph('[ ]')}</b></td>`;
      const ptCell = (o) => `<td>${Xn(o) || ph(lang === 'tr' ? '[tanımlanacak]' : lang === 'de' ? '[festzulegen]' : '[to be defined]')}</td>`;
      const t71 = table('rpe', [[C.no, 10, 1], [C.time, 17], [C.point], [C.itest, 16, 1], ['R<sub>PE</sub>', 22, 1], [C.limit, 16, 1], [C.ev, 11, 1], [C.photo, 11, 1]],
        (x) => [`<td class="c">${esc(x.r.tag)}</td>`, `<td class="num-cell">${esc(x.r.time) || '—'}</td>`, ptCell(x.r.point), `<td class="c num-cell">${Lf.rpeI} A</td>`, valCell('rpe', x), `<td class="c num-cell">≤ ${Lf.rpeMax} Ω</td>`, `<td class="c">${okCell('rpe', x)}</td>`, ref('rpe', x)]);
      const t72 = table('loop', [[C.no, 10, 1], [C.time, 17], [C.circuit], [C.device, 22, 1], [C.zs, 22, 1], [C.zsmax, 20, 1], [C.ev, 11, 1], [C.photo, 11, 1]],
        (x) => [`<td class="c">${esc(x.r.tag)}</td>`, `<td class="num-cell">${esc(x.r.time) || '—'}</td>`, ptCell(x.r.circuit), `<td class="c">${esc(x.r.device) || '—'}</td>`, valCell('loop', x), `<td class="c num-cell">${x.lim != null ? `≤ ${fmt(x.lim, 2)} Ω` : '—'}</td>`, `<td class="c">${okCell('loop', x)}</td>`, ref('loop', x)]);
      const t73 = table('iso', [[C.no, 14, 1], [C.time, 17], [C.circuit], [C.uiso, 16, 1], ['R<sub>ISO</sub>', 24, 1], [C.limit, 16, 1], [C.ev, 11, 1], [C.photo, 11, 1]],
        (x) => [`<td class="c nowrap">${esc(x.r.tag)}</td>`, `<td class="num-cell">${esc(x.r.time) || '—'}</td>`, ptCell(x.r.point), `<td class="c num-cell">${Lf.isoU} V</td>`, valCell('iso', x), `<td class="c num-cell">≥ ${Lf.isoMin} MΩ</td>`, `<td class="c">${okCell('iso', x)}</td>`, ref('iso', x)]);
      const t74 = table('hv', [[C.no, 14, 1], [C.time, 17], [C.circuit], [C.umeas, 18, 1], ['I<sub>HV</sub>', 20, 1], [C.limit, 16, 1], [C.ev, 11, 1], [C.photo, 11, 1]],
        (x) => [`<td class="c nowrap">${esc(x.r.tag)}</td>`, `<td class="num-cell">${esc(x.r.time) || '—'}</td>`, ptCell(x.r.point), `<td class="c num-cell">${x.r.u ? `${esc(x.r.u)} V` : `${Lf.hvU} V`}</td>`, valCell('hv', x), `<td class="c num-cell">≤ ${Lf.hvMax} mA</td>`, `<td class="c">${okCell('hv', x)}</td>`, ref('hv', x)]);
      const t75 = table('res', [[C.no, 10, 1], [C.time, 17], [C.point], [C.t, 12, 1], [C.u, 20, 1], [C.limit, 16, 1], [C.ev, 11, 1], [C.photo, 11, 1]],
        (x) => [`<td class="c">${esc(x.r.tag)}</td>`, `<td class="num-cell">${esc(x.r.time) || '—'}</td>`, ptCell(x.r.point), `<td class="c num-cell">${x.r.t ? `${esc(String(x.r.t).replace('.', dec))} s` : '—'}</td>`, valCell('res', x), `<td class="c num-cell">≤ ${Lf.resMax} V</td>`, `<td class="c">${okCell('res', x)}</td>`, ref('res', x)]);
      const t76 = table('leak', [[C.no, 10, 1], [C.time, 17], [C.point], [C.ipe, 20, 1], [C.limit, 16, 1], [C.ev, 11, 1], [C.photo, 11, 1]],
        (x) => [`<td class="c">${esc(x.r.tag)}</td>`, `<td class="num-cell">${esc(x.r.time) || '—'}</td>`, ptCell(x.r.point), valCell('leak', x), `<td class="c num-cell">≤ ${Lf.leakMax} mA</td>`, `<td class="c">${okCell('leak', x)}</td>`, ref('leak', x)]);
      sections.push({ newPage: true, html: `
        ${h2('7', T.s7, T.s7ref)}
        ${h3(`7.1 ${T.h71}`, 'lvd-sec-7-1')}${para('rpe', T.p71(Lf))}${t71}
        ${h3(`7.2 ${T.h72}`, 'lvd-sec-7-2')}${para('loop', T.p72(Lf))}${t72}
        ${h3(`7.3 ${T.h73}`, 'lvd-sec-7-3')}${para('iso', T.p73(Lf))}${t73}
        ${h3(`7.4 ${T.h74}`, 'lvd-sec-7-4')}${para('hv', T.p74(Lf))}${t74}
        ${h3(`7.5 ${T.h75}`, 'lvd-sec-7-5')}${para('res', T.p75(Lf))}${t75}
        ${h3(`7.6 ${T.h76}`, 'lvd-sec-7-6')}${para('leak', T.p76(Lf))}${t76}` });
    }

    /* 8 Fonksiyon testleri */
    {
      const rows = m.func.map((f) => {
        const lib = libFunc[f.id];
        const test = !LVD.isEmptyML(f.test) ? X(f.test) : lib ? esc(lib.test[lang] || lib.test.tr) : ph(T.fill);
        const exp = !LVD.isEmptyML(f.expected) ? X(f.expected) : lib ? esc(lib.expected[lang] || lib.expected.tr) : '—';
        const clause = f.clause || (lib ? lib.clause : '') || f.ref;
        return `<tr><td class="c nowrap"><b>${esc(f.id)}</b>${clause ? `<br><span class="muted small">${esc(clause)}</span>` : ''}</td><td>${test}</td><td>${exp}</td><td class="c">${resPill(f.result)}</td><td class="num-cell">${esc(f.date) || '—'}</td><td>${Xn(f.note) || '—'}</td></tr>`;
      }).join('') || `<tr><td colspan="6" class="c">${ph(T.fill)}</td></tr>`;
      const valNote = M.riskDoc ? `<div class="note small">${lang === 'tr' ? `Güvenlik fonksiyonlarının validasyon testleri (EN ISO 13849-2) <b>${esc(M.riskDoc)}</b> numaralı risk değerlendirme raporunda yer alır.` : lang === 'de' ? `Die Validierungsprüfungen der Sicherheitsfunktionen (EN ISO 13849-2) sind in der Risikobeurteilung <b>${esc(M.riskDoc)}</b> enthalten.` : `The validation tests of the safety functions (EN ISO 13849-2) are contained in risk assessment report <b>${esc(M.riskDoc)}</b>.`}</div>` : '';
      sections.push({ newPage: true, html: `
        ${h2('8', T.s8, T.s8ref)}
        <p>${T.p8}</p>
        <table class="t small split"><thead><tr><th class="c" style="width:17mm">${T.funcCols[0]}</th><th>${T.funcCols[1]}</th><th style="width:52mm">${T.funcCols[2]}</th><th class="c" style="width:14mm">${T.funcCols[3]}</th><th style="width:18mm">${T.funcCols[4]}</th><th style="width:26mm">${T.funcCols[5]}</th></tr></thead><tbody>${rows}</tbody></table>
        ${valNote}` });
    }

    /* 9 Sonuç ve onay */
    {
      const rows = LIB.TESTS.map((t) => `<tr><td class="c"><b>${t.letter})</b> <span class="muted small">${esc(t.clause)}</span></td><td>${esc(t.name[lang] || t.name.tr)}</td><td class="c">${statePill(tests[t.key].state, t.req)}</td></tr>`).join('');
      const A = M.approvals || {};
      const Tt = A.titles || {};
      const S = T.cover.sign;
      const sign = [[S[0], A.prepared, Tt.prepared], [S[1], A.checked, Tt.checked], [S[2], A.approved, Tt.approved]]
        .map(([r, n, t]) => `<tr><td><b>${esc(r)}</b></td><td>${n ? esc(n) : ph('[…]')}</td><td>${t ? Xn(t) : ''}</td><td class="num-cell">${esc(M.reportDate || '')}</td><td style="height:13mm"></td></tr>`).join('');
      sections.push({ newPage: true, html: `
        ${h2('9', T.s9)}
        <table class="t"><thead><tr><th style="width:24mm">${T.conclCols[0]}</th><th>${T.conclCols[1]}</th><th class="c" style="width:28mm">${T.conclCols[2]}</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="lvd-verdict ${ev.overall}">${verdict()}</div>
        ${m.conclusion && !LVD.isEmptyML(m.conclusion) ? `<p>${X(m.conclusion)}</p>` : ''}
        ${h3(T.signTitle)}
        <table class="t lvd-sign"><thead><tr><th style="width:28mm">${T.signCols[0]}</th><th style="width:38mm">${T.signCols[1]}</th><th>${T.signCols[2]}</th><th style="width:22mm">${T.signCols[3]}</th><th style="width:34mm">${T.signCols[4]}</th></tr></thead><tbody>${sign}</tbody></table>` });
    }

    /* Ek A: ölçüm ekranları */
    const grid = (figs) => (figs.length ? `<div class="photo-grid split-grid">${figs.join('')}</div>` : `<p>${ph(T.noPhotos)}</p>`);
    {
      const parts = LIB.MEAS.filter((k) => annexA[k].length).map((k) => `${h3(T.aGroups[k])}${grid(annexA[k])}`).join('');
      sections.push({ newPage: true, html: `${h2('A', T.sA, '', 'A')}${parts || `<p>${ph(T.noPhotos)}</p>`}` });
    }
    /* Ek B: makine, etiket, pano, kurulum, gözle kontrol kanıtları */
    {
      const figs = Object.entries(photoRefB).map(([file, ref]) => {
        const p = m.photos.find((x) => x.file === file);
        const v = m.visual.find((x) => x.photo === file);
        const cap = p ? (Xn(p.caption) || esc(LIB.PHOTO_KINDS[p.kind] ? LIB.PHOTO_KINDS[p.kind][lang] || LIB.PHOTO_KINDS[p.kind].tr : '')) : v ? `${esc(v.id)}${Xn(v.note) ? ` · ${Xn(v.note)}` : ''}` : '';
        return `<figure><img src="${img(file)}" alt=""><figcaption><b>${ref}.</b> ${cap}</figcaption></figure>`;
      });
      sections.push({ newPage: true, html: `${h2('B', T.sB, '', 'B')}${figs.length ? `<div class="grid2 split-grid photo-2">${figs.join('')}</div>` : `<p>${ph(T.noPhotos)}</p>`}` });
    }
    sections[sections.length - 1].html += `<p class="end">— ${T.endOfReport} —</p>`;
    return { sections, toc, stats };
  }

  /* Ek B numaraları: kurulum, genel görünüm, etiket, pano, genel fotoğraflar, sonra gözle kontrol kanıtları — build'den önce hesaplanır */
  let photoRefB = {};
  function refsB(m) {
    // Kurulum fotoğrafları önce: risk analizinden gelen ölçüm noktası açıklamalarındaki (B-1 …) atıflar aynı fotoğrafı gösterir
    const order = { setup: 0, cover: 1, nameplate: 2, panel: 3, general: 4 };
    const files = m.photos.map((p, i) => [p, i]).sort((a, b) => (order[a[0].kind] - order[b[0].kind]) || a[1] - b[1]).map(([p]) => p.file);
    m.visual.forEach((v) => { if (v.photo && !files.includes(v.photo)) files.push(v.photo); });
    const out = {};
    files.forEach((f, i) => { out[f] = `B-${i + 1}`; });
    return out;
  }
  function buildAll(m, ev, lang, ctx) {
    photoRefB = refsB(m);
    return build(m, ev, lang, ctx);
  }

  /* ─── Sayfalar (tarayıcı) ──────────────────────────────── */
  function pageFactory(m, lang, ctx) {
    const T = LIB.T[lang];
    const M = m.meta;
    const brand = brandOf(m);
    const left = brand.text ? `<span class="lh-name">${esc(brand.name)}</span><span class="lh-sub">${esc(brand.sub || '')}</span>` : `<img class="lh-logo" src="${esc(ctx.logo ? ctx.logo(brand.logo) : brand.logo)}" alt="">`;
    return () => {
      const el = document.createElement('section');
      el.className = 'page';
      el.style.setProperty('--brand', brand.accent);
      el.innerHTML = `
        <header class="lh"><div class="lh-brand">${left}</div><div class="lh-right"><div class="lh-model">${esc(String(M.model || '').toLocaleUpperCase(lang === 'tr' ? 'tr' : lang))}</div><div class="lh-doc">${esc(T.hdrTitle)} · ${esc(M.docNo)} · Rev. ${esc(M.rev)}</div></div></header>
        <div class="body"></div>
        <footer class="lf"><div class="lf-co">${esc(brand.footer || M.manufacturer)}</div><div class="lf-mid">${esc(T.uncontrolled)} · ${esc(T.jobPrefix)} ${esc(M.job)}</div><div class="lf-pg"><span class="pgno"></span></div></footer>`;
      return { el, body: el.querySelector('.body') };
    };
  }
  function render(m, ev, lang, ctx, stage) {
    const rep = buildAll(m, ev, lang, ctx);
    stage.replaceChildren();
    const g = typeof self !== 'undefined' ? self : globalThis;
    const pages = g.RaLayout.paginate(stage, rep.sections, pageFactory(m, lang, ctx));
    const total = pages.length;
    pages.forEach((pg, i) => {
      const c = pg.el.querySelector('.pgno');
      if (c) c.textContent = `${LIB.T[lang].pageWord} ${i + 1} / ${total}`;
      pg.el.classList.add('print-sheet');
      pg.el.dataset.page = String(i + 1);
      pg.el.querySelectorAll('.cv-pages').forEach((n) => { n.textContent = String(total); });
    });
    const pageOf = (id) => { const n = stage.querySelector(`#${id}`); return n ? pages.findIndex((pg) => pg.el.contains(n)) + 1 : ''; };
    const toc = rep.toc.map((t) => Object.assign({}, t, { page: pageOf(t.id) }));
    const tocEl = stage.querySelector('#lvd-toc');
    if (tocEl) tocEl.innerHTML = toc.map((t) => `<li class="${t.sub ? 'sub' : ''}"><a href="#${t.id}"><span class="n">${t.num}</span><span class="ti">${t.title}</span><span class="p">${t.page}</span></a></li>`).join('');
    const els = pages.map((pg) => pg.el);
    stage.replaceChildren();
    return { pages: els, toc, stats: rep.stats };
  }

  return { build: buildAll, render, cover };
});
