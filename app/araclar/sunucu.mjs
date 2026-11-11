// Yerel sunucu (isteğe bağlı): R&AX klasörünü http://localhost:<port>/ adresinde sunar; uygulama klasör izni istemeden açılır.
// Test ve geliştirme için de kullanılır. Kullanım: node app/araclar/sunucu.mjs [port]
// API: GET /__api/list?path=  ·  GET /__api/stat?path=  ·  PUT /__api/write?path=  ·  POST /__api/mkdir?path=
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './yukle.mjs';

const PORT = +(process.argv[2] || process.env.PORT || 8765);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.ttf': 'font/ttf', '.bmt': 'application/octet-stream', '.ico': 'image/x-icon' };

function safe(rel) {
  const abs = path.resolve(ROOT, decodeURIComponent(rel || '').replace(/^\/+/, ''));
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) throw new Error('kök dışı yol');
  return abs;
}
/** Silinebilir yollar: projects/ ve models/ altındaki dosya ve klasörler (kök, projects/, models/ kendisi değil) */
function removable(abs) {
  const rel = path.relative(ROOT, abs).split(path.sep);
  return ['projects', 'models'].includes(rel[0]) && rel.length >= 2 && !rel.includes('..');
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    if (u.pathname.startsWith('/__api/')) {
      const op = u.pathname.slice(7);
      const abs = safe(u.searchParams.get('path'));
      if (op === 'list') {
        const out = fs.existsSync(abs) ? fs.readdirSync(abs, { withFileTypes: true }).map((e) => {
          if (e.isDirectory()) return { name: e.name, kind: 'dir' };
          const st = fs.statSync(path.join(abs, e.name));
          return { name: e.name, kind: 'file', size: st.size, mtime: st.mtimeMs };
        }) : [];
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        return res.end(JSON.stringify(out));
      }
      if (op === 'stat') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); return res.end(JSON.stringify({ exists: fs.existsSync(abs) })); }
      if (op === 'mkdir' && req.method === 'POST') { fs.mkdirSync(abs, { recursive: true }); res.writeHead(200); return res.end(); }
      if (op === 'remove' && req.method === 'POST') {
        if (!removable(abs)) { res.writeHead(403); return res.end('yalnız projects/ ve models/ altı silinebilir'); }
        fs.rmSync(abs, { recursive: true, force: true });
        res.writeHead(200);
        return res.end();
      }
      if (op === 'write' && req.method === 'PUT') {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, Buffer.concat(chunks));
        res.writeHead(200);
        return res.end();
      }
      res.writeHead(400);
      return res.end();
    }
    let abs = safe(u.pathname);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) abs = path.join(abs, 'index.html');
    if (!fs.existsSync(abs)) { res.writeHead(404); return res.end('Bulunamadı'); }
    const st = fs.statSync(abs);
    res.writeHead(200, { 'content-type': TYPES[path.extname(abs).toLowerCase()] || 'application/octet-stream', 'last-modified': st.mtime.toUTCString(), 'cache-control': 'no-store' });
    fs.createReadStream(abs).pipe(res);
  } catch (e) {
    res.writeHead(500);
    res.end(String(e.message));
  }
});
server.listen(PORT, '127.0.0.1', () => console.log(`Risk Analizi: http://localhost:${PORT}/app/  (kök: ${ROOT})`));
