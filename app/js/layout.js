/* Sayfa motoru: P&PX antetli A4 sayfa, bölümlerin sayfalara akıtılması, içindekiler ve sayfa numaraları.
   Sığmayan tablo satır satır, fotoğraf ızgarası öğe öğe bölünür; data-keep işaretli başlıklar sonraki blokla aynı sayfada kalır.
   Ölçüm, yakınlaştırmasız (zoom 1) görünmeyen bir sahnede yapılır; sayfalar sonra görüntüleyiciye taşınır. */

(function (root) {
  'use strict';

  const SAFE_PX = 6;
  const { esc } = root.RaUtil;

  function makePageFactory(p, lang) {
    const L = root.RA_T[lang];
    const m = p.meta;
    const brand = root.RA_LIB.brands[m.brand] || root.RA_LIB.brands.DOLFIN;
    const left = brand.text
      ? `<span class="lh-name">${esc(brand.name)}</span><span class="lh-sub">${esc(brand.sub || '')}</span>`
      : `<img class="lh-logo" src="${esc(root.RaApp ? root.RaApp.logo(brand.logo) : brand.logo)}" alt="">`;
    return () => {
      const el = document.createElement('section');
      el.className = 'page';
      el.style.setProperty('--brand', brand.accent);
      el.innerHTML = `
        <header class="lh"><div class="lh-brand">${left}</div><div class="lh-right"><div class="lh-model">${esc(String(m.model || '').toLocaleUpperCase(lang === 'tr' ? 'tr' : lang))}</div><div class="lh-doc">${esc(L.hdrTitle)} · ${esc(m.docNo)} · Rev. ${esc(m.rev)}</div></div></header>
        <div class="body"></div>
        <footer class="lf"><div class="lf-co">${esc(brand.footer || m.manufacturer)}</div><div class="lf-mid">${esc(L.uncontrolled)} · ${esc(L.jobPrefix)} ${esc(m.job)}</div><div class="lf-pg"><span class="pgno"></span></div></footer>`;
      return { el, body: el.querySelector('.body') };
    };
  }

  function paginate(stage, sections, makePage) {
    const pages = [];
    let page = null;
    const newPage = () => { page = makePage(); stage.appendChild(page.el); pages.push(page); };
    const bottom = () => {
      const l = page.body.lastElementChild;
      return l ? l.getBoundingClientRect().bottom - page.body.getBoundingClientRect().top : 0;
    };
    const fits = () => bottom() <= page.body.clientHeight - SAFE_PX;
    const moveToNewPage = (els) => {
      const keep = [];
      let l = page.body.lastElementChild;
      while (l && l.hasAttribute('data-keep')) { keep.unshift(l); l.remove(); l = page.body.lastElementChild; }
      if (page.body.children.length) newPage();
      keep.concat(els).forEach((e) => page.body.appendChild(e));
    };
    const splitRows = (container, items, cloneShell) => {
      let cur = container;
      let placed = 0;
      for (const it of items) {
        cur.appendChild(it);
        if (fits()) { placed += 1; continue; }
        it.remove();
        if (placed === 0) {
          const shell = cur.closest('table') || cur;
          shell.remove();
          moveToNewPage([shell]);
          cur.appendChild(it);
          placed = 1;
          continue;
        }
        const next = cloneShell();
        newPage();
        page.body.appendChild(next.shell);
        cur = next.body;
        cur.appendChild(it);
        placed = 1;
      }
    };
    for (const sec of sections) {
      if (sec.cover) {
        const box = document.createElement('div');
        box.innerHTML = sec.html;
        const c = box.firstElementChild;
        stage.appendChild(c);
        pages.push({ el: c, cover: true });
        page = null;
        continue;
      }
      if (!page || (sec.newPage && page.body.children.length)) newPage();
      const tpl = document.createElement('template');
      tpl.innerHTML = sec.html;
      for (const el of [...tpl.content.children]) {
        page.body.appendChild(el);
        if (fits()) continue;
        if (el.matches('table.split') && el.tBodies[0]) {
          const rows = [...el.tBodies[0].rows];
          rows.forEach((r) => r.remove());
          splitRows(el.tBodies[0], rows, () => {
            const t = el.cloneNode(false);
            const cg = el.querySelector('colgroup');
            if (cg) t.appendChild(cg.cloneNode(true));
            if (el.tHead) { const th = el.tHead.cloneNode(true); th.classList.add('cont'); t.appendChild(th); }
            const b = document.createElement('tbody');
            t.appendChild(b);
            return { shell: t, body: b };
          });
        } else if (el.matches('.split-grid')) {
          const items = [...el.children];
          items.forEach((x) => x.remove());
          splitRows(el, items, () => { const g = el.cloneNode(false); return { shell: g, body: g }; });
        } else if (page.body.children.length > 1) {
          el.remove();
          moveToNewPage([el]);
        }
      }
    }
    return pages;
  }

  /**
   * Bir dilde raporu sayfalara böler. stage: görünmeyen ölçüm alanı (zoom 1).
   * Dönüş: { pages: [element], stats, toc: [{id, num, title, sub, page}] }
   */
  function renderLang(p, ev, lang, ctx, stage) {
    const rep = root.RaReport.buildReport(p, ev, lang, ctx);
    stage.replaceChildren();
    const pages = paginate(stage, rep.sections, makePageFactory(p, lang));
    const total = pages.length;
    pages.forEach((pg, i) => {
      const c = pg.el.querySelector('.pgno');
      if (c) c.textContent = `${root.RA_T[lang].pageWord} ${i + 1} / ${total}`;
      pg.el.classList.add('print-sheet');
      pg.el.dataset.page = String(i + 1);
    });
    pages.forEach((pg) => pg.el.querySelectorAll('.cv-pages').forEach((n) => { n.textContent = String(total); }));
    const pageOf = (id) => {
      const n = stage.querySelector(`#${id}`);
      return n ? pages.findIndex((pg) => pg.el.contains(n)) + 1 : '';
    };
    const toc = rep.toc.map((t) => Object.assign({}, t, { page: pageOf(t.id) }));
    const tocEl = stage.querySelector('#toc');
    if (tocEl) tocEl.innerHTML = toc.map((t) => `<li class="${t.sub ? 'sub' : ''}"><a href="#${t.id}"><span class="n">${t.num}</span><span class="ti">${t.title}</span><span class="p">${t.page}</span></a></li>`).join('');
    const els = pages.map((pg) => pg.el);
    stage.replaceChildren();
    return { pages: els, stats: rep.stats, toc };
  }

  /** Birden çok dil tek belgede: kimlikler ve iç bağlantılar dil önekiyle ayrılır */
  function prefixIds(rootEl, pre) {
    rootEl.querySelectorAll('[id]').forEach((n) => { n.id = pre + n.id; });
    rootEl.querySelectorAll("a[href^='#']").forEach((a) => a.setAttribute('href', `#${pre}${a.getAttribute('href').slice(1)}`));
  }

  root.RaLayout = { renderLang, prefixIds, paginate, makePageFactory };
})(typeof self !== 'undefined' ? self : this);
