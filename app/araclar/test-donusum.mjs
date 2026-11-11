// Gerileme testi: projenin md dosyalarından okunan model, eski .riskproj.json ile alan alan karşılaştırılır.
// Kullanım: node app/araclar/test-donusum.mjs <eski.json> <proje klasörü>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const RaDoc = require('../js/doc.js');

const [jsonPath, dir] = process.argv.slice(2);
const old = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const walk = (d, base = '') => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name), `${base}${e.name}/`) : [`${base}${e.name}`]));
const rel = 'P';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((name) => ({ name, text: fs.readFileSync(path.join(dir, name), 'utf8') }));
const list = walk(dir).map((f) => `${rel}/${f}`);
const p = RaDoc.build([{ dir: rel, files, list }]);

let fails = 0;
let checks = 0;
const eq = (what, a, b) => {
  checks += 1;
  const A = JSON.stringify(a);
  const B = JSON.stringify(b);
  if (A !== B) {
    fails += 1;
    if (fails <= 40) console.log(`✗ ${what}\n   md  : ${A && A.slice(0, 300)}\n   eski: ${B && B.slice(0, 300)}`);
  }
};
const ml = (o) => ({ tr: (o && o.tr) || '', en: (o && o.en) || '', de: (o && o.de) || '' });
const mlx = (o) => { const r = ml(o); if (r.en === r.tr) r.en = r.tr; if (r.de === r.tr) r.de = r.tr; return r; };
const fill = (o) => { const r = ml(o); if (!r.en) r.en = r.tr; if (!r.de) r.de = r.tr; return r; };

// Meta
const m = old.meta;
for (const k of ['job', 'customer', 'model', 'docNo', 'rev', 'reportDate']) eq(`meta.${k}`, p.meta[k], m[k]);
eq('meta.machineType', ml(p.meta.machineType), ml(m.machineType));
eq('meta.scope', ml(p.meta.scope), ml(m.scope));
eq('approvals', [p.meta.approvals.prepared, p.meta.approvals.checked, p.meta.approvals.approved], [m.approvals.prepared, m.approvals.checked, m.approvals.approved]);
eq('approvals.titles.prepared', ml(p.meta.approvals.titles.prepared), ml(m.approvals.titles.prepared));
eq('outOfScope', fill(p.outOfScope), fill(old.outOfScope));
eq('revisions', p.revisions.map((r) => [r.rev, r.date, ml(r.desc), r.by, r.approvedBy]), old.revisions.map((r) => [r.rev, r.date, ml(r.desc), r.by, r.approvedBy]));
eq('distribution', p.distribution.map((d) => [ml(d.to), ml(d.format)]), old.distribution.map((d) => [ml(d.to), ml(d.format)]));
eq('standards', p.standards.map((s) => [s.ref, fill(s.title)]), old.standards.map((s) => [s.ref, fill(s.title)]));
eq('machine.desc', ml(p.machine.desc), ml(old.machine.desc));
eq('machine.tech', p.machine.tech.map((t) => [fill(t.label), fill(t.value)]), old.machine.tech.map((t) => [fill(t.label), fill(t.value)]));
eq('machine.panel', p.machine.panel.map((t) => [t.label, fill(t.func), fill(t.safety)]), old.machine.panel.map((t) => [t.label, fill(t.func), fill(t.safety)]));
for (const k of ['intendedUse', 'modes', 'users', 'movement', 'access', 'interfaces', 'life', 'maintenance', 'environment', 'phases']) eq(`limits.${k}`, fill(p.limits[k]), fill(old.limits[k]));
eq('limits.misuse', p.limits.misuse.map((x) => fill(x.text)), old.limits.misuse.map((x) => fill(x.text)));
eq('limits.profile', p.limits.profile, old.limits.profile);
// Noktalar
eq('points', p.points.map((x) => [x.x, x.y, fill(x.label), fill(x.desc)]), old.points.map((x) => [x.x, x.y, fill(x.label), fill(x.desc)]));
// Tehlikeler
eq('hazard count', p.hazards.length, old.hazards.length);
old.hazards.forEach((h, i) => {
  const n = p.hazards[i];
  if (!n) return;
  const id = `H-${String(i + 1).padStart(2, '0')}`;
  eq(`${id}.id`, n.id, id);
  eq(`${id}.key`, n.key, h.key);
  eq(`${id}.type`, fill(n.type), fill(h.type));
  eq(`${id}.sit`, fill(n.sit), fill(h.sit));
  eq(`${id}.phase`, fill(n.phase), fill(h.phase));
  eq(`${id}.risk`, [n.o, n.s, n.o2, n.s2], [h.o, h.s, h.o2, h.s2]);
  eq(`${id}.points`, n.points, h.points.map((u) => String(old.points.findIndex((x) => x.uid === u) + 1)));
  eq(`${id}.meas`, n.meas.map((x) => [x.tag, fill(x.text)]), h.meas.map((x) => [x.tag, fill(x.text)]));
});
// SF
old.sfs.forEach((s, i) => {
  const n = p.sfs[i];
  const id = `SF-${String(i + 1).padStart(2, '0')}`;
  if (!n) { eq(`${id} yok`, null, id); return; }
  for (const k of ['name', 'desc', 'trigger', 'safe']) eq(`${id}.${k}`, fill(n[k]), fill(s[k]));
  eq(`${id}.SFP`, [n.S, n.F, n.P], [s.S, s.F, s.P]);
  for (const k of ['S', 'F', 'P']) eq(`${id}.just.${k}`, fill(n.just[k]), fill(s.just[k]));
  eq(`${id}.hazards`, n.hazards, s.hazards.map((u) => `H-${String(old.hazards.findIndex((h) => h.uid === u) + 1).padStart(2, '0')}`));
  eq(`${id}.subs`, n.subs.map((x) => [x.role, x.cat, x.b10d, x.nop, x.mttfd, x.dc, x.plOverride, x.plCap, fill(x.comp), fill(x.note)]),
    s.subs.map((x) => [x.role, x.cat, x.b10d == null || x.b10d === '' ? null : +x.b10d, x.nop == null || x.nop === '' ? null : +x.nop, x.mttfd == null || x.mttfd === '' ? null : +x.mttfd, x.dc == null || x.dc === '' ? null : +x.dc, x.plOverride || '', x.plCap || '', fill(x.comp), fill(x.note)]));
});
eq('sfNotes', p.sfNotes.map((x) => [x.kind, fill(x.text)]), old.sfNotes.map((x) => [x.kind, fill(x.text)]));
eq('ccf', p.ccf.map((c) => [c.no, c.max, c.applied, fill(c.measure), fill(c.evidence)]), old.ccf.map((c) => [c.no, c.max, c.applied, fill(c.measure), fill(c.evidence)]));
eq('systematic', fill(p.systematic), fill(old.systematic));
// Validasyon
eq('validation', p.validation.map((v) => [v.ref, fill(v.step), fill(v.expected), v.result, v.date, fill(v.note)]),
  old.validation.map((v) => [old.sfs.findIndex((s) => s.uid === v.ref) >= 0 ? `SF-${String(old.sfs.findIndex((s) => s.uid === v.ref) + 1).padStart(2, '0')}` : `H-${String(old.hazards.findIndex((h) => h.uid === v.ref) + 1).padStart(2, '0')}`, fill(v.step), fill(v.expected), v.result, v.date, fill(v.note)]));
// Elektrik
const E = p.elec;
for (const k of ['date', 'time', 'instrument', 'testedBy']) eq(`elec.${k}`, E[k], old.elec[k]);
eq('elec.method', fill(E.method), fill(old.elec.method));
eq('elec.limits', E.limits, old.elec.limits);
for (const k of ['rpe', 'iso', 'hv']) eq(`elec.${k}`, E[k].map((r) => [r.tag, r.time, r.value, r.u, fill(r.point), !!r.photo]), old.elec[k].map((r) => [r.tag, r.time, r.value, r.u, fill(r.point), !!r.photo]));
// Termal
const TH = p.thermal;
for (const k of ['date', 'time', 'instrument', 'serial', 'accuracy', 'testedBy', 'limit']) eq(`thermal.${k}`, TH[k], old.thermal[k]);
for (const k of ['condition', 'method', 'conclusion', 'limitText']) eq(`thermal.${k}`, fill(TH[k]), fill(old.thermal[k]));
eq('thermal.images', TH.images.map((t) => [t.file.split('/').pop(), fill(t.title), fill(t.comment), t.markers.map((mk) => [mk.type, Math.round(mk.x), Math.round(mk.y), Math.round(mk.w), Math.round(mk.h), mk.ref, fill(mk.label)])]),
  old.thermal.images.map((t) => [t.file, fill(t.title), fill(t.comment), t.markers.map((mk) => [mk.type, mk.type === 'hot' || mk.type === 'cold' ? 0 : Math.round(mk.x), mk.type === 'hot' || mk.type === 'cold' ? 0 : Math.round(mk.y), mk.type === 'area' ? Math.round(mk.w) : 0, mk.type === 'area' ? Math.round(mk.h) : 0, !!mk.ref, fill(mk.label)])]));
// Sonuç, aksiyonlar, işaretler
eq('conclusion', fill(p.conclusion), fill(old.conclusion));
eq('actions', p.actions.map((a) => [fill(a.text), fill(typeof a.owner === 'object' ? a.owner : { tr: a.owner }), fill(typeof a.due === 'object' ? a.due : { tr: a.due }), a.status]),
  old.actions.map((a) => [fill(a.text), fill(typeof a.owner === 'object' ? a.owner : { tr: a.owner }), fill(typeof a.due === 'object' ? a.due : { tr: a.due }), a.status]));
eq('signs', p.signs.map((s) => [s.code, fill(s.meaning), fill(s.location)]), old.signs.map((s) => [s.code, fill(s.meaning), fill(s.location)]));
// Fotoğraflar
const oldKinds = old.photos.filter((x) => ['detail', 'setup'].includes(x.kind)).map((x) => [x.kind, fill(x.caption)]);
const newKinds = p.photos.filter((x) => x.kinds.includes('detail') || x.kinds.includes('setup')).map((x) => [x.kinds.includes('detail') ? 'detail' : 'setup', fill(x.caption)]);
eq('photos detail/setup', newKinds.sort((a, b) => a[0].localeCompare(b[0])), oldKinds.sort((a, b) => a[0].localeCompare(b[0])));
eq('noise rows', p.noise.rows.length, 8);
eq('unknown sections', p._unknown, []);

console.log(`\n${checks} kontrol, ${fails} fark`);
process.exit(fails ? 1 : 0);
