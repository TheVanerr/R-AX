/* Kapak tasarımları (A4 dikey, 794 × 1123 px) — P&PX kapaklarının risk raporu uyarlaması:
   Kırmızı Bant (solda dikey bant), Üst Bant (üstte tam genişlik bant), Köşe Blok (köşede kırmızı blok).
   Seçilen tasarım belgenin ön bilgisinde "kapak: bant | ust | kose" olarak durur. */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./texts.js'), require('./util.js'), require('./library.js'));
  else root.RaCovers = factory(root.RA_T, root.RaUtil, root.RA_LIB);
})(typeof self !== 'undefined' ? self : this, function (T, U, LIB) {
  'use strict';

  const { esc, rich } = U;
  const DESIGNS = [
    { id: 'bant', name: 'Kırmızı Bant', hint: 'Solda dikey bant, sağda bilgi listesi' },
    { id: 'ust', name: 'Üst Bant', hint: 'Üstte tam genişlik bant, altta bilgi tablosu' },
    { id: 'kose', name: 'Köşe Blok', hint: 'Köşede kırmızı blok, ortada büyük başlık' }
  ];
  const STANDARD = 'EN ISO 12100 · EN ISO 13849-1 · EN 60204-1';
  const STD_LONG = 'EN ISO 12100:2010 · EN ISO 13849-1:2023 · EN ISO 13849-2:2012 · EN 60204-1:2018';

  /** Uzun model adları alanına sığsın */
  function titleSize(text, sizes) {
    const len = String(text).length;
    if (len <= 10) return sizes[0];
    if (len <= 16) return sizes[1];
    if (len <= 24) return sizes[2];
    if (len <= 34) return sizes[3];
    return sizes[4];
  }

  function info(p, ev, lang, ctx) {
    const L = T[lang];
    const m = p.meta;
    const tx = (o) => (o ? rich(o[lang] || o.tr || '') : '');
    const brand = LIB.brands[m.brand] || LIB.brands.DOLFIN;
    const upper = (s) => String(s || '').toLocaleUpperCase(lang === 'tr' ? 'tr' : lang);
    const st = L.stamp[m.status === 'final' ? 'final' : 'draft'];
    const prepLogo = m.preparedLogo && m.preparedLogo !== 'yok' ? (LIB.preparedLogos[m.preparedLogo] || m.preparedLogo) : null;
    return {
      L, m, brand, upper, st, tx,
      accent: brand.accent,
      logo: ctx.logo ? ctx.logo(brand.logo) : brand.logo,
      prepLogo: prepLogo ? (ctx.logo ? ctx.logo(prepLogo) : prepLogo) : null,
      photo: m.coverPhoto ? ctx.img(m.coverPhoto) : null,
      model: upper(m.model),
      customer: upper(m.customer),
      machine: tx(m.machineType)
    };
  }

  const kicker = (I) => `<div class="cv-kicker">${esc(I.L.cover.kicker)}</div>`;
  const title = (I, sizes) => `<h1 class="cv-title" style="font-size:${titleSize(I.model, sizes)}px">${esc(I.model)}</h1>`;
  const stamp = (I) => `<div class="cv-stamp">${esc(I.st[0])}<span>Rev. ${esc(I.m.rev)} · ${esc(I.st[1])}</span></div>`;
  const logo = (I) => `<img class="cv-logo" src="${esc(I.logo)}" alt="">`;
  const photo = (I, h) => (I.photo ? `<div class="cv-photo" style="height:${h}px"><img src="${esc(I.photo)}" alt=""></div>` : `<div class="cv-photo cv-nophoto" style="height:${h}px"><span>${esc(I.L.noPhotos)}</span></div>`);

  function fields(I) {
    const R = I.L.cover.rows;
    const m = I.m;
    return [
      [R.job, esc(m.job), true],
      [R.customer, esc(m.customer)],
      [R.model, esc(m.model)],
      [R.machine, I.machine],
      [R.docNo, esc(m.docNo)],
      [R.rev, esc(m.rev)],
      [R.date, esc(m.reportDate || '—')],
      [R.pages, '<span class="cv-pages">—</span>']
    ];
  }
  const listRows = (I) => fields(I).map(([k, v, strong]) => `<div class="cv-row"><dt>${esc(k)}</dt><dd${strong ? ' class="strong"' : ''}>${v}</dd></div>`).join('');
  const cells = (I) => fields(I).map(([k, v, strong]) => `<div class="cv-cell"><span>${esc(k)}</span><b${strong ? ' class="strong"' : ''}>${v}</b></div>`).join('');

  function signBoxes(I) {
    const A = I.m.approvals || {};
    const Tt = A.titles || {};
    const box = (label, name, t) => `<div class="cv-sign-box"><span>${esc(label)}</span><b>${esc(name || '')}</b><i>${t ? I.tx(t) : ''}</i></div>`;
    const S = I.L.cover.sign;
    return `<div class="cv-sign">${box(S[0], A.prepared, Tt.prepared)}${box(S[1], A.checked, Tt.checked)}${box(S[2], A.approved, Tt.approved)}</div>`;
  }

  function foot(I) {
    return `<div class="cv-foot"><div class="cv-addr"><b>${esc(I.brand.footer || I.m.manufacturer)}</b>${I.m.brandLine ? `<br>${esc(I.m.brandLine)}` : ''}<br>${esc(I.L.confidential)}</div>${I.prepLogo ? `<img class="cv-prep" src="${esc(I.prepLogo)}" alt="">` : ''}</div>`;
  }

  /* ─── 1. Kırmızı Bant ─────────────────────────────────── */
  function bant(I) {
    return `
      <aside class="cvb-band"><span class="cvb-std">${esc(STANDARD).replace(/ · /g, '<br>')}</span><span class="cvb-mark">${esc(I.L.cover.mark)}</span></aside>
      <div class="cvb-main">
        <div class="cvb-top">${logo(I)}${stamp(I)}</div>
        <div class="cvb-head">
          ${kicker(I)}
          ${title(I, [76, 64, 52, 42, 34])}
          <div class="cv-rule"></div>
          <div class="cv-customer">${esc(I.customer)}</div>
          <div class="cv-machine">${I.machine}</div>
        </div>
        ${photo(I, 236)}
        <dl class="cv-list">${listRows(I)}</dl>
        ${signBoxes(I)}
        ${foot(I)}
      </div>`;
  }

  /* ─── 2. Üst Bant ─────────────────────────────────────── */
  function ust(I) {
    return `
      <section class="cvu-band">
        <span class="cvu-std">${esc(STD_LONG)}</span>
        <span class="cvu-mark">${esc(I.L.cover.mark)}</span>
        <div class="cvu-text">
          ${kicker(I)}
          ${title(I, [84, 70, 56, 46, 36])}
          <div class="cv-customer">${esc(I.customer)}</div>
        </div>
      </section>
      <div class="cvu-logo">${logo(I)}${stamp(I)}</div>
      <section class="cvu-lower">
        <div class="cvu-machine cv-machine">${I.machine}</div>
        <div class="cvu-grid">
          ${photo(I, 252)}
          <div class="cv-cells">${cells(I)}</div>
        </div>
        ${signBoxes(I)}
        ${foot(I)}
      </section>`;
  }

  /* ─── 3. Köşe Blok ────────────────────────────────────── */
  function kose(I) {
    return `
      <div class="cvk-top"></div>
      <div class="cvk-side"></div>
      <div class="cvk-block"><span>${esc(STANDARD).replace(/ · /g, '<br>')}</span><b>${esc(I.L.cover.mark)}</b></div>
      <div class="cvk-logo">${logo(I)}</div>
      <div class="cvk-stamp">${stamp(I)}</div>
      <div class="cvk-head">
        ${kicker(I)}
        ${title(I, [72, 60, 48, 40, 32])}
        <div class="cv-rule"></div>
        <div class="cv-customer">${esc(I.customer)}</div>
        <div class="cv-machine">${I.machine}</div>
      </div>
      <div class="cvk-lower">
        <div class="cvk-grid">
          ${photo(I, 228)}
          <div class="cv-cells cv-cells-2">${cells(I)}</div>
        </div>
        ${signBoxes(I)}
        ${foot(I)}
      </div>`;
  }

  const RENDER = { bant, ust, kose };

  /** Kapak sayfasının HTML'i (sayfa sayısı sayfalama sonrasında .cv-pages içine yazılır) */
  function build(design, p, ev, lang, ctx) {
    const id = RENDER[design] ? design : 'bant';
    const I = info(p, ev, lang, ctx);
    return `<section class="page cover cv cv-${id}" lang="${lang}" style="--cv-accent:${I.accent}">${RENDER[id](I)}</section>`;
  }

  return { DESIGNS, build };
});
