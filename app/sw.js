/* Service worker: uygulama kabuğunu (html, css, js, yazı tipleri, logolar) önbellekte tutar; internet yokken de açılır.
   Ağ önce: yayınlanan yeni sürüm hemen gelir, ağ yoksa önbellekteki sürüm kullanılır.
   Veriler önbelleğe ALINMAZ: GitHub API (başka köken), yerel sunucunun __api/ uçları ve projects/ models/ yolları
   (kapsam dışı) service worker'a hiç uğramaz; depo önbelleği store.js'nin IndexedDB'sindedir.
   SURUM, GitHub Actions'ta commit kimliğiyle değiştirilir; her yayında eski önbellek silinir. */
'use strict';

const SURUM = '__SURUM__';
const ONEK = 'dolfin-rax-44cce8b4-'; // aynı kökende (thevanerr.github.io) başka projelerin önbellekleriyle karışmaz
const CACHE = `${ONEK}${SURUM}`;
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/ui.css',
  'css/rapor.css',
  'assets/fonts/fonts.js',
  'assets/logos/logos.js',
  'assets/logos/dolfin.png',
  'assets/ikon.png',
  'assets/pwa/ikon-192.png',
  'assets/pwa/ikon-512.png',
  'assets/pwa/favicon-32.png',
  'assets/pwa/apple-touch-icon.png',
  'js/md.js', 'js/util.js', 'js/library.js', 'js/calc.js', 'js/thermal.js', 'js/texts.js', 'js/doc.js',
  'js/rules.js', 'js/covers.js', 'js/report.js', 'js/layout.js', 'js/pdf.js', 'js/pdf-dom.js',
  'js/github.js', 'js/store.js', 'js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((p) => new Request(p, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith(ONEK) && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const scope = self.registration.scope;
  if (!req.url.startsWith(scope) || url.pathname.includes('/__api/')) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (hit) return hit;
      if (req.mode === 'navigate') { const shell = await cache.match('index.html'); if (shell) return shell; }
      throw err;
    }
  })());
});
