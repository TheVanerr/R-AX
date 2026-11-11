/* Risk analizi md ayrıştırıcısı.
   Desteklenen md: ön bilgi (--- anahtar: değer ---), # bölüm / ## öğe / ### alt öğe başlıkları,
   "- anahtar: değer" alanları (iç içe), | tablolar |, düz paragraflar, <!-- yorumlar -->.
   Çok dilli metin: "TR | EN | DE" (tek satırda), "- en: …" / "- de: …" alt maddeleri,
   "en: …" ile başlayan paragraflar, tabloda ilk hücresi boş "en: …" devam satırları.
   DOM'a bağlı değildir; tarayıcıda ve Node'da (kontrol aracı) aynı kod çalışır. */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.RaMd = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LANGS = ['tr', 'en', 'de'];
  const TAGS = new Set(['m', 'ö', 'o', 'b', 'uyarı', 'uyari', 'bilgi', 'warn', 'info', 'x', ' ']);

  /** Karşılaştırma anahtarı: küçük harf, Türkçe karakterler sadeleşir, boşluklar tek */
  function norm(s) {
    return String(s == null ? '' : s)
      .replace(/İ/g, 'i').replace(/I/g, 'ı')
      .toLowerCase()
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[âà]/g, 'a').replace(/[îì]/g, 'i').replace(/[ûù]/g, 'u').replace(/ä/g, 'a').replace(/ß/g, 'ss').replace(/é/g, 'e')
      .replace(/[_\-./]+/g, ' ')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** "TR | EN | DE" → {tr, en, de}. Kaçışlı \| bölmez. */
  function splitLangs(text) {
    const raw = String(text == null ? '' : text);
    const parts = [];
    let cur = '';
    for (let i = 0; i < raw.length; i += 1) {
      if (raw[i] === '\\' && raw[i + 1] === '|') { cur += '|'; i += 1; continue; }
      if (raw[i] === '|' && raw[i - 1] === ' ' && raw[i + 1] === ' ') { parts.push(cur.trim()); cur = ''; continue; }
      cur += raw[i];
    }
    parts.push(cur.trim());
    const out = { tr: parts[0] || '' };
    if (parts.length > 1) out.en = parts[1] || '';
    if (parts.length > 2) out.de = parts[2] || '';
    return out;
  }

  /** "en: metin" → ['en', 'metin'] */
  function langPrefix(text) {
    const m = /^(tr|en|de)\s*:\s?([\s\S]*)$/i.exec(String(text || '').trim());
    return m ? [m[1].toLowerCase(), m[2]] : null;
  }

  function mergeLang(ml, lang, text) {
    const t = String(text || '').trim();
    ml[lang] = ml[lang] ? `${ml[lang]}\n\n${t}` : t;
  }

  /** Tablo satırını hücrelere böler; kaçışlı \| hücre ayırmaz */
  function splitRow(line) {
    let s = line.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
    const cells = [];
    let cur = '';
    for (let i = 0; i < s.length; i += 1) {
      if (s[i] === '\\' && s[i + 1] === '|') { cur += '|'; i += 1; continue; }
      if (s[i] === '|') { cells.push(cur.trim()); cur = ''; continue; }
      cur += s[i];
    }
    cells.push(cur.trim());
    return cells;
  }

  const isSeparator = (line) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

  function newNode(title, level, line) {
    return { title, key: norm(title), level, line, text: null, list: [], tables: [], children: [], blocks: [] };
  }

  /** Madde: anahtar/değer ayrımı, etiket ([M] [Ö] [B] [uyarı] …), çok dilli değer */
  function makeItem(raw, line) {
    let text = raw;
    let tag = null;
    const tm = /^\[([^\]]{1,8})\]\s+/.exec(text);
    if (tm && TAGS.has(tm[1].toLowerCase())) {
      tag = tm[1];
      text = text.slice(tm[0].length);
    }
    let key = null;
    let keyRaw = null;
    let valueRaw = text;
    const km = /^([^:|<>\[\]]{1,48}?)\s*:(\s+(.*))?$/.exec(text);
    if (km && !/^(https?|file)$/i.test(km[1]) && !/^\d+$/.test(km[1].trim())) {
      keyRaw = km[1].trim();
      key = norm(keyRaw);
      valueRaw = km[3] != null ? km[3] : '';
    }
    return { raw: text, tag, key, keyRaw, full: splitLangs(text), value: splitLangs(valueRaw), items: [], line };
  }

  /** Alt maddelerden "en:" / "de:" olanları üst maddenin diline taşır */
  function foldLangItems(items) {
    for (const it of items) {
      foldLangItems(it.items);
      const keep = [];
      for (const sub of it.items) {
        const lp = langPrefix(sub.tag ? `[${sub.tag}] ${sub.raw}` : sub.raw);
        if (lp && !sub.items.length) {
          it.value[lp[0]] = lp[1].trim();
          it.full[lp[0]] = lp[1].trim();
        } else keep.push(sub);
      }
      it.items = keep;
    }
  }

  function parse(source) {
    let text = String(source == null ? '' : source).replace(/\r\n?/g, '\n').replace(/^﻿/, '');
    // Yorumlar ayrıştırmaya girmez (satır sayısı korunur)
    text = text.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ''));
    const lines = text.split('\n');
    const front = {};
    const frontKeys = [];
    let i = 0;
    if (lines[0] && lines[0].trim() === '---') {
      for (i = 1; i < lines.length; i += 1) {
        const l = lines[i];
        if (l.trim() === '---') { i += 1; break; }
        const m = /^\s*([^:#][^:]*?)\s*:\s?(.*)$/.exec(l);
        if (!m) continue;
        let v = m[2].replace(/\s+#\s.*$/, '').trim();
        if (/^".*"$/.test(v) || /^'.*'$/.test(v)) v = v.slice(1, -1);
        const k = norm(m[1]);
        front[k] = v;
        frontKeys.push({ key: k, keyRaw: m[1].trim(), value: v });
      }
    }

    const top = newNode('', 0, 0);
    const stack = [top];
    const current = () => stack[stack.length - 1];
    let para = null;
    let list = null;
    let table = null;
    let fence = false;

    const flushPara = () => {
      if (!para) return;
      const node = current();
      const body = para.lines.join('\n').trim();
      if (body) {
        const lp = langPrefix(body);
        if (!node.text) node.text = {};
        if (lp) mergeLang(node.text, lp[0], lp[1].replace(/^\s+/, ''));
        else {
          node.text.tr = node.text.tr ? `${node.text.tr}\n\n${body}` : body;
          node.blocks.push({ type: 'p', text: body });
        }
      }
      para = null;
    };
    const flushList = () => {
      if (!list) return;
      foldLangItems(list.roots);
      current().list.push(...list.roots);
      current().blocks.push({ type: 'list', items: list.roots });
      list = null;
    };
    const flushTable = () => {
      if (!table) return;
      current().tables.push(table);
      current().blocks.push({ type: 'table', table });
      table = null;
    };
    const flushAll = () => { flushPara(); flushList(); flushTable(); };

    for (; i < lines.length; i += 1) {
      const line = lines[i];
      const ln = i + 1;
      if (/^\s*(```|~~~)/.test(line)) { flushAll(); fence = !fence; continue; }
      if (fence) continue;

      const hm = /^(#{1,4})\s+(.*?)\s*#*\s*$/.exec(line);
      if (hm) {
        flushAll();
        const level = hm[1].length;
        while (stack.length > 1 && current().level >= level) stack.pop();
        const node = newNode(hm[2], level, ln);
        current().children.push(node);
        current().blocks.push({ type: 'node', node });
        stack.push(node);
        continue;
      }

      if (/^\s*\|/.test(line)) {
        flushPara(); flushList();
        const cells = splitRow(line);
        if (!table) {
          table = { head: cells, keys: cells.map(norm), rows: [], line: ln };
          continue;
        }
        if (isSeparator(line)) continue;
        // Devam satırı: dolu hücrelerin hepsi "en:" / "de:" ile başlar (boş hücreler o dilde TR'yi kullanır)
        const prev = table.rows[table.rows.length - 1];
        const langCells = cells.map((c) => langPrefix(c));
        if (prev && langCells.some(Boolean) && cells.every((c, k) => !c || langCells[k])) {
          langCells.forEach((lp, k) => { if (lp && prev[k]) prev[k][lp[0]] = lp[1].trim(); });
          continue;
        }
        table.rows.push(cells.map((c) => ({ tr: c })));
        continue;
      }
      if (table) flushTable();

      const lm = /^(\s*)[-*+]\s+(.*)$/.exec(line);
      if (lm) {
        flushPara();
        const indent = lm[1].replace(/\t/g, '    ').length;
        const item = makeItem(lm[2].trim(), ln);
        if (!list) list = { roots: [], stack: [] };
        while (list.stack.length && list.stack[list.stack.length - 1].indent >= indent) list.stack.pop();
        if (list.stack.length) list.stack[list.stack.length - 1].item.items.push(item);
        else list.roots.push(item);
        list.stack.push({ indent, item });
        continue;
      }

      if (!line.trim()) {
        flushPara();
        // Boş satır listeyi bitirmez; bir sonraki satır madde değilse biter
        const next = lines.slice(i + 1).find((l) => l.trim());
        if (list && !(next && /^(\s*)[-*+]\s+/.test(next))) flushList();
        continue;
      }

      // Madde devamı (girintili düz satır)
      if (list && /^\s{2,}\S/.test(line) && list.stack.length) {
        const it = list.stack[list.stack.length - 1].item;
        const joined = `${it.raw} ${line.trim()}`;
        const re = makeItem(it.tag ? `[${it.tag}] ${joined}` : joined, it.line);
        Object.assign(it, { raw: re.raw, key: re.key, keyRaw: re.keyRaw, full: re.full, value: re.value });
        continue;
      }
      flushList();
      if (!para) para = { lines: [] };
      para.lines.push(line);
    }
    flushAll();
    return { front, frontKeys, pre: top, sections: top.children };
  }

  /* ─── Yardımcılar (eşleme kodu için) ─────────────────────────── */

  /** Düğümün alanlarını anahtara göre bulur (ilk eşleşen) */
  function field(node, ...names) {
    if (!node) return null;
    const keys = names.map(norm);
    return node.list.find((it) => it.key && keys.includes(it.key)) || null;
  }

  /** Alt düğüm: başlık anahtarı verilen öneklerden biriyle başlar */
  function child(node, ...names) {
    if (!node) return null;
    const keys = names.map(norm);
    return node.children.find((c) => keys.some((k) => c.key === k || c.key.startsWith(`${k} `))) || null;
  }

  /** Tabloyu sütun anahtarlarıyla nesnelere çevirir: { sütunAnahtarı: {tr,en,de} } */
  function tableObjects(table, aliases) {
    const map = {};
    for (const [canon, names] of Object.entries(aliases || {})) for (const n of names) map[norm(n)] = canon;
    const cols = table.keys.map((k) => map[k] || k);
    return table.rows.map((row) => {
      const o = { _row: row };
      cols.forEach((c, k) => { o[c] = row[k] || { tr: '' }; });
      return o;
    });
  }

  return { parse, norm, splitLangs, langPrefix, splitRow, field, child, tableObjects, LANGS };
});
