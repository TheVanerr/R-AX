// Node yükleyicisi: bir belge klasörünü (proje / model / birim) okur, modeli kurar, termal dosyaları çözer, kuralları çalıştırır.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
export const RaMd = require('../js/md.js');
export const RaDoc = require('../js/doc.js');
export const RaRules = require('../js/rules.js');
export const RaThermal = require('../js/thermal.js');
export const RaCalc = require('../js/calc.js');

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const toRel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');

function walk(dir, base = '') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory()
    ? (['_eski', 'cikti', 'raporlar', 'kaynak'].includes(e.name) ? [] : walk(path.join(dir, e.name), `${base}${e.name}/`))
    : [`${base}${e.name}`]));
}

function source(absDir) {
  const rel = toRel(absDir);
  const files = fs.readdirSync(absDir).filter((f) => f.toLowerCase().endsWith('.md') && !/^readme/i.test(f)).map((name) => ({ name, text: fs.readFileSync(path.join(absDir, name), 'utf8') }));
  const list = walk(absDir).map((f) => `${rel}/${f}`);
  return { dir: rel, files, list };
}

/** Belgeyi yükler: { p (kural uygulanmış rapor modeli), raw (md modeli), ev (değerlendirme), sources } */
export function loadDoc(dirArg) {
  const abs = path.resolve(dirArg);
  const own = source(abs);
  const peek = RaDoc.peek(own.files);
  const sources = [own];
  if (peek.meta.type === 'birim') {
    // Yayınlanmış makine raporu kendi dondurulmuş şablonunu (sablon/) kullanır
    const frozen = path.join(abs, 'sablon');
    const baseAbs = fs.existsSync(frozen) ? frozen : path.resolve(abs, peek.meta.base || '../..');
    sources.unshift(source(baseAbs));
    own.list = own.list.filter((f) => !f.startsWith(`${own.dir}/sablon/`));
  }
  const raw = RaDoc.build(sources);
  for (const t of raw.thermal.images) {
    try {
      const r = RaThermal.parseBMT(fs.readFileSync(path.join(ROOT, t.file)));
      Object.assign(t, { w: r.w, h: r.h, T: RaThermal.tempsOf(r), eps: r.eps, rtc: r.rtc, amb: r.amb, device: r.device, serial: r.serial, fw: r.firmware, fov: r.fov, range: r.range });
      const tm = RaThermal.bmtTime(t.file.split('/').pop(), r.stamp);
      t.date = tm.date;
      t.time = tm.time;
      if (!t.markers) t.markers = RaThermal.defaultMarkers();
    } catch (e) {
      t.error = e.message;
    }
  }
  const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
  const ev = RaRules.evaluate(raw, { exists });
  const p = RaRules.apply(raw, ev);
  return { p, raw, ev, sources };
}
