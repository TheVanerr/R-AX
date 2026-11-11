/* Termal görüntü (testo IRSoft .bmt): çözümleme, sıcaklık matrisi, işaretçi değerleri, palet.
   .bmt: önde JPEG önizleme, ardından "ToFo" kabı = XML şema + şemadaki sırayla dizilmiş ikili alanlar
   (ham termal matris, gerçek görüntü JPEG, ε, yansıyan sıcaklık, cihaz bilgisi).
   Çözümleme ve hesaplar DOM'a bağlı değildir; çizim (thermoSrc, scaleImg) yalnız tarayıcıda çalışır. */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.RaThermal = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const K0 = 273.15;
  const asciiOf = (b, s, e) => { let t = ''; for (let i = s; i < e; i += 1) t += String.fromCharCode(b[i]); return t; };
  const utf8Of = (b, s, e) => {
    const t = asciiOf(b, s, e);
    try { return decodeURIComponent(escape(t)); } catch (x) { return t; }
  };
  function findBytes(b, str, from) {
    const n = str.length;
    const c0 = str.charCodeAt(0);
    outer: for (let i = from || 0; i <= b.length - n; i += 1) {
      if (b[i] !== c0) continue;
      for (let j = 1; j < n; j += 1) if (b[i + j] !== str.charCodeAt(j)) continue outer;
      return i;
    }
    return -1;
  }

  /** JPEG boyutu (SOF işaretçisinden) */
  function jpegSize(b) {
    for (let i = 2; i + 9 < b.length;) {
      if (b[i] !== 0xff) { i += 1; continue; }
      const m = b[i + 1];
      const len = (b[i + 2] << 8) | b[i + 3];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
      i += 2 + len;
    }
    return null;
  }

  /** testo .bmt dosyasını çözer → { cihaz, ε, RTC, ham matris (Uint16), sıcaklık dönüşümü, gerçek görüntü JPEG } */
  function parseBMT(bytes) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const i0 = findBytes(b, '<ToFo');
    if (i0 < 0) throw new Error('ToFo bloğu bulunamadı — testo .bmt dosyası değil');
    let j = findBytes(b, '</ToFo>', i0) + 7;
    while (b[j] === 10 || b[j] === 13) j += 1;
    const hdr = asciiOf(b, i0, j);
    const xs = +(hdr.match(/<xml size="(\d+)"/) || [])[1];
    const ds = +(hdr.match(/<data size="(\d+)"/) || [])[1];
    if (!xs || !ds) throw new Error('ToFo başlığı okunamadı');
    const xml = asciiOf(b, j, j + xs);
    const d0 = j + xs;
    if (d0 + ds > b.length) throw new Error('Dosya eksik (veri bloğu kısa)');
    const dv = new DataView(b.buffer, b.byteOffset + d0, ds);
    const fields = {};
    const stack = [];
    let pos = 0;
    const attr = (s, k) => {
      const m = s.match(new RegExp(`${k}="([^"]*)"`));
      return m ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : '';
    };
    for (const m of xml.matchAll(/<(\/?)(group|item)\b([^>]*?)\/?>/g)) {
      if (m[2] === 'group') {
        if (m[1]) stack.pop();
        else stack.push(attr(m[3], 'name'));
        continue;
      }
      const size = +attr(m[3], 'size');
      fields[stack.slice(1).concat(attr(m[3], 'name')).join('.')] = { type: attr(m[3], 'type'), off: pos, size };
      pos += size;
    }
    if (pos !== ds) throw new Error('Şema ile veri boyutu uyuşmuyor');
    const u32 = (o) => dv.getUint32(o, true);
    const get = (k) => {
      const f = fields[k];
      if (!f) return null;
      const o = f.off;
      const t = f.type;
      if (t === 'bool') return dv.getUint8(o) !== 0;
      if (t === 'uint8') return dv.getUint8(o);
      if (t === 'uint16') return dv.getUint16(o, true);
      if (t === 'int32') return dv.getInt32(o, true);
      if (t === 'uint32') return u32(o);
      if (t === 'uint64') return u32(o) + u32(o + 4) * 4294967296;
      if (t === 'float' || t.startsWith('Temperature')) return dv.getFloat32(o, true);
      if (t === 'double') return dv.getFloat64(o, true);
      if (t === 'string') return utf8Of(b, d0 + o + 4, d0 + o + 4 + Math.min(u32(o), f.size - 4));
      if (t === 'Version') return [u32(o), u32(o + 4), u32(o + 8)].join('.');
      if (t === 'cvpoint') return [dv.getInt32(o, true), dv.getInt32(o + 4, true)];
      return null;
    };
    const ir = fields['Images.Ir'];
    if (!ir) throw new Error('Termal matris yok');
    const rows = dv.getInt32(ir.off + 4, true);
    const cols = dv.getInt32(ir.off + 8, true);
    const elem = dv.getInt32(ir.off + 20, true);
    if (elem !== 2 || 24 + rows * cols * 2 > ir.size) throw new Error('Desteklenmeyen termal matris biçimi');
    const raw = new Uint16Array(rows * cols);
    let lo = 65535;
    let hi = 0;
    for (let k = 0; k < raw.length; k += 1) {
      const v = dv.getUint16(ir.off + 24 + 2 * k, true);
      raw[k] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    // Ham değer → °C: testo kodlaması −101 … +1001 °C aralığını 16 bite doğrusal yayar. Otomatik ölçekli
    // dosyada ölçek uçları (K) görüntünün min/maks değeridir; kodlama farklıysa bu iki noktadan yeniden hesaplanır.
    let k = 1102 / 65535;
    let off = -101;
    const sMin = get('Scaling.TempMin');
    const sMax = get('Scaling.TempMax');
    if (get('Scaling.Mode') === 'Auto' && hi > lo && sMin && sMax) {
      const k2 = (sMax - sMin) / (hi - lo);
      const off2 = sMin - K0 - lo * k2;
      if (Math.abs(k2 - k) / k > 0.002 || Math.abs(off2 - off) > 0.2) { k = k2; off = off2; }
    }
    const vis = fields['Images.Vis'];
    const visLen = vis ? u32(vis.off) : 0;
    const C = (v) => (v == null ? null : Math.round((v - K0) * 10) / 10);
    return {
      device: get('DeviceInfo.DeviceName') || get('DeviceId') || '',
      serial: get('Serial') == null ? '' : String(get('Serial')),
      firmware: get('DeviceInfo.FirmwareVersion') || '',
      fov: [get('ActiveLens.FovHorizontal'), get('ActiveLens.FovVertical')],
      range: [C(get('ActiveMeasRange.Bottom')), C(get('ActiveMeasRange.Top'))],
      eps: Math.round((get('Environment.EmissivityValue') || 0) * 1000) / 1000,
      rtc: C(get('Environment.ReflectedTemperature')),
      amb: C(get('Environment.Temperature')),
      stamp: get('FileInfo.DateTime'),
      w: cols, h: rows, raw, k, off,
      vis: visLen ? b.slice(d0 + vis.off + 4, d0 + vis.off + 4 + visLen) : null
    };
  }

  /** Dosya adındaki zaman damgası (testo: 2026-10-22-10-46-59.bmt) → { date, time } */
  function bmtTime(name, stamp) {
    const m = String(name || '').match(/(\d{4})-(\d{2})-(\d{2})[-_ T](\d{2})[-_.:](\d{2})[-_.:](\d{2})/);
    if (m) return { date: `${m[3]}.${m[2]}.${m[1]}`, time: `${m[4]}:${m[5]}:${m[6]}` };
    if (!stamp) return { date: '', time: '' };
    const d = new Date(stamp * 1000);
    const p = (n) => String(n).padStart(2, '0');
    return { date: `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`, time: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` };
  }

  /** Çözülmüş dosyadaki ham matristen °C matrisi (Float32Array, satır satır) */
  function tempsOf(r) {
    const T = new Float32Array(r.w * r.h);
    for (let i = 0; i < T.length; i += 1) T[i] = r.off + r.raw[i] * r.k;
    return T;
  }

  function range(img) {
    if (img._range) return img._range;
    const T = img.T;
    let lo = Infinity;
    let hi = -Infinity;
    let il = 0;
    let ih = 0;
    for (let i = 0; i < T.length; i += 1) {
      if (T[i] < lo) { lo = T[i]; il = i; }
      if (T[i] > hi) { hi = T[i]; ih = i; }
    }
    img._range = { lo, hi, lx: il % img.w, ly: Math.floor(il / img.w), hx: ih % img.w, hy: Math.floor(ih / img.w) };
    return img._range;
  }

  /** Görüntüde kullanılan ölçek: elle verilmişse o, değilse görüntünün min/maks değeri (testo "Auto") */
  function scale(img) {
    const r = range(img);
    const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
    const lo = num(img.lo);
    const hi = num(img.hi);
    const l = lo != null ? lo : r.lo;
    return { lo: l, hi: hi != null && hi > l ? hi : r.hi, auto: lo == null && hi == null };
  }

  const clampXY = (img, x, y) => [Math.max(0, Math.min(img.w - 1, Math.round(x))), Math.max(0, Math.min(img.h - 1, Math.round(y)))];

  /** İşaretçi değeri: nokta → piksel; alan → min/maks/ort; sıcak/soğuk nokta → görüntünün maks/min değeri ve konumu */
  function markerValue(img, m) {
    const T = img.T;
    if (m.type === 'hot' || m.type === 'cold') {
      const r = range(img);
      const hot = m.type === 'hot';
      return { v: hot ? r.hi : r.lo, max: hot ? r.hi : r.lo, x: hot ? r.hx : r.lx, y: hot ? r.hy : r.ly };
    }
    if (m.type === 'area') {
      const [x0, y0] = clampXY(img, m.x, m.y);
      const [x1, y1] = clampXY(img, m.x + Math.max(1, m.w) - 1, m.y + Math.max(1, m.h) - 1);
      let mn = Infinity;
      let mx = -Infinity;
      let s = 0;
      let n = 0;
      let px = x0;
      let py = y0;
      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) {
          const v = T[y * img.w + x];
          s += v;
          n += 1;
          if (v < mn) mn = v;
          if (v > mx) { mx = v; px = x; py = y; }
        }
      }
      return { v: mx, max: mx, min: mn, avg: s / n, x: px, y: py };
    }
    const [x, y] = clampXY(img, m.x, m.y);
    const v = T[y * img.w + x];
    return { v, max: v, x, y };
  }

  /** İşaretçi adları: noktalar M1…, alanlar A1…, sıcak nokta HS, soğuk nokta CS (IRSoft düzeni) */
  function markerNames(img) {
    let p = 0;
    let a = 0;
    return img.markers.map((m) => (m.type === 'hot' ? 'HS' : m.type === 'cold' ? 'CS' : m.type === 'area' ? `A${++a}` : `M${++p}`));
  }

  /** Görüntü özeti: geçerli (yüksek emisiviteli yüzey) işaretçilerin en yüksek değeri; çıplak sac (ref) hariç */
  function summary(img) {
    const names = markerNames(img);
    const rows = img.markers.map((m, i) => ({ m, name: names[i], val: markerValue(img, m) }));
    const valid = rows.filter((r) => !r.m.ref);
    const top = valid.reduce((a, r) => (!a || r.val.max > a.val.max ? r : a), null);
    return { rows, max: top ? top.val.max : null, top };
  }

  /* ─── Palet (testo Ironbow benzeri) ─────────────────────────── */
  const STOPS = [[0, [0, 0, 20]], [0.12, [28, 10, 94]], [0.28, [90, 10, 140]], [0.42, [160, 24, 130]], [0.56, [216, 58, 58]], [0.7, [245, 122, 16]], [0.84, [255, 194, 42]], [1, [255, 251, 230]]];
  const LUT = (() => {
    const lut = new Uint8Array(256 * 3);
    for (let i = 0; i < 256; i += 1) {
      const t = i / 255;
      let k = 0;
      while (k < STOPS.length - 2 && t > STOPS[k + 1][0]) k += 1;
      const [t0, c0] = STOPS[k];
      const [t1, c1] = STOPS[k + 1];
      const f = (t - t0) / (t1 - t0);
      for (let c = 0; c < 3; c += 1) lut[i * 3 + c] = Math.round(c0[c] + (c1[c] - c0[c]) * f);
    }
    return lut;
  })();

  /** İşaretçi katmanı (SVG, görüntü piksel koordinatlarında). Etiketler koyu zeminli: PDF'te de okunur. */
  function overlay(img) {
    const names = markerNames(img);
    const W = img.w;
    const H = img.h;
    const fs = Math.max(7, Math.round(W / 24));
    const label = (x, y, t, cls) => {
      const tw = t.length * fs * 0.62 + 3;
      const tx = Math.min(W - tw - 1, x + 3);
      const ty = y - 3 < fs ? y + fs + 2 : y - 3;
      return `<rect x="${tx - 1.5}" y="${ty - fs + 1}" width="${tw}" height="${fs + 1}" rx="1.5" class="tb"/><text x="${tx}" y="${ty}" class="tx ${cls}" font-size="${fs}">${t}</text>`;
    };
    return `<svg class="th-ov" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${img.markers.map((m, i) => {
      const v = markerValue(img, m);
      const cls = m.type === 'hot' ? 'hot' : m.type === 'cold' ? 'cold' : m.ref ? 'ref' : 'ok';
      if (m.type === 'area') {
        const x = Math.round(m.x);
        const y = Math.round(m.y);
        const w = Math.max(1, Math.round(m.w));
        const h = Math.max(1, Math.round(m.h));
        return `<g class="mk ${cls}"><rect x="${x}" y="${y}" width="${w}" height="${h}" class="sh"/><rect x="${x}" y="${y}" width="${w}" height="${h}" class="ln"/>${label(x, y + fs + 1 > H ? y : y + fs + 1, names[i], cls)}</g>`;
      }
      const x = v.x + 0.5;
      const y = v.y + 0.5;
      const r = 4.2;
      const g = 1.4;
      const cross = `M${x - r} ${y}H${x - g}M${x + g} ${y}H${x + r}M${x} ${y - r}V${y - g}M${x} ${y + g}V${y + r}`;
      const tri = m.type === 'hot' ? `<path d="M${x} ${y - 3.2}L${x + 2.8} ${y + 1.8}H${x - 2.8}Z" class="tri"/>` : m.type === 'cold' ? `<path d="M${x} ${y + 3.2}L${x + 2.8} ${y - 1.8}H${x - 2.8}Z" class="tri"/>` : '';
      return `<g class="mk ${cls}"><path d="${cross}" class="sh"/><path d="${cross}" class="ln"/>${tri}${label(x, y, names[i], cls)}</g>`;
    }).join('')}</svg>`;
  }

  /* ─── Tarayıcı: palete göre çizim (önbellekli) ──────────────── */
  const CACHE = new Map();
  function canvasOf(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  /** Termal görüntü → JPEG dataURL (IRSoft gibi yumuşatılmış 3× büyütme) */
  function imageSrc(img) {
    if (typeof document === 'undefined') return '';
    const s = scale(img);
    const key = `${img.file}|${s.lo.toFixed(2)}|${s.hi.toFixed(2)}`;
    if (CACHE.has(key)) return CACHE.get(key);
    const T = img.T;
    const W = img.w;
    const H = img.h;
    const span = Math.max(0.1, s.hi - s.lo);
    const c = canvasOf(W, H);
    const g = c.getContext('2d');
    const id = g.createImageData(W, H);
    for (let i = 0; i < W * H; i += 1) {
      const q = Math.max(0, Math.min(255, Math.round(((T[i] - s.lo) / span) * 255))) * 3;
      id.data[i * 4] = LUT[q];
      id.data[i * 4 + 1] = LUT[q + 1];
      id.data[i * 4 + 2] = LUT[q + 2];
      id.data[i * 4 + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    const big = canvasOf(W * 3, H * 3);
    const gb = big.getContext('2d');
    gb.imageSmoothingEnabled = true;
    gb.imageSmoothingQuality = 'high';
    gb.drawImage(c, 0, 0, big.width, big.height);
    const url = big.toDataURL('image/jpeg', 0.9);
    CACHE.set(key, url);
    return url;
  }

  /** Renk ölçeği çubuğu (dikey, üst = sıcak) → PNG dataURL. CSS gradyanı PDF'e geçmediği için görsel kullanılır. */
  let scaleUrl = null;
  function scaleImg() {
    if (typeof document === 'undefined') return '';
    if (scaleUrl) return scaleUrl;
    const c = canvasOf(8, 256);
    const g = c.getContext('2d');
    const id = g.createImageData(8, 256);
    for (let y = 0; y < 256; y += 1) {
      const q = (255 - y) * 3;
      for (let x = 0; x < 8; x += 1) {
        const o = (y * 8 + x) * 4;
        id.data[o] = LUT[q];
        id.data[o + 1] = LUT[q + 1];
        id.data[o + 2] = LUT[q + 2];
        id.data[o + 3] = 255;
      }
    }
    g.putImageData(id, 0, 0);
    scaleUrl = c.toDataURL('image/png');
    return scaleUrl;
  }

  /** En sıcak noktanın otomatik işaretçisi (yeni görüntü için) */
  const defaultMarkers = () => [{ type: 'hot', x: 0, y: 0, w: 0, h: 0, ref: false, label: { tr: '' } }];

  return { parseBMT, bmtTime, tempsOf, jpegSize, range, scale, markerValue, markerNames, summary, overlay, imageSrc, scaleImg, defaultMarkers };
});
