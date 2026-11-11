// Test için sahte GitHub API'si: uygulamanın GitHub modunu gerçek depoya dokunmadan dener.
// Bellekte git nesneleri (blob kimliği gerçek git SHA-1'i), dal başı "yalnız ileri" güncellenir.
// Kullanım: node app/araclar/sahte-github.mjs [port] [--bos] [--acik] [--tohum projects,models]
//   --bos: boş depo · --acik: herkese açık depo (bağlantı reddedilmeli) · anahtar: test-anahtar
// Test kancası: POST /__test/yaz?path=<yol> (gövde = içerik) → dışarıdan commit (Claude'un push'u gibi)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT } from './yukle.mjs';

const args = process.argv.slice(2);
const PORT = +(args.find((a) => /^\d+$/.test(a)) || 8766);
const EMPTY = args.includes('--bos');
const PUBLIC = args.includes('--acik');
const TOKEN = 'test-anahtar';
// --gecikme <ms>: her isteğe gecikme · --hiz <KB/s>: indirme hızı (gerçek ağ koşullarında yükleme süresini ölçmek için)
const DELAY = +(args.includes('--gecikme') ? args[args.indexOf('--gecikme') + 1] : 0);
const KBPS = +(args.includes('--hiz') ? args[args.indexOf('--hiz') + 1] : 0);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const seedDirs = (args[args.indexOf('--tohum') + 1] && args.includes('--tohum') ? args[args.indexOf('--tohum') + 1] : 'projects,models').split(',');

const blobs = new Map();    // sha → Buffer
const trees = new Map();    // sha → Map(path → sha)
const commits = new Map();  // sha → { tree, parents, message, date }
let ref = null;
const log = [];

const blobSha = (buf) => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])).digest('hex');
const randSha = (s) => crypto.createHash('sha1').update(`${s}:${Date.now()}:${Math.random()}`).digest('hex');
function putBlob(buf) { const sha = blobSha(buf); blobs.set(sha, buf); return sha; }
function putTree(map) { const sha = randSha('tree'); trees.set(sha, map); return sha; }
function putCommit(tree, parents, message) { const sha = randSha('commit'); commits.set(sha, { tree, parents, message, date: new Date().toISOString() }); return sha; }

if (!EMPTY) {
  const map = new Map();
  const walk = (abs, rel) => {
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(abs, e.name), r);
      else map.set(r, putBlob(fs.readFileSync(path.join(abs, e.name))));
    }
  };
  for (const d of seedDirs) if (fs.existsSync(path.join(ROOT, d))) walk(path.join(ROOT, d), d);
  ref = putCommit(putTree(map), [], 'İlk aktarım');
  console.log(`tohum: ${map.size} dosya`);
}

function commitFiles(files, message) {
  const base = ref ? new Map(trees.get(commits.get(ref).tree)) : new Map();
  for (const [p, buf] of files) base.set(p, putBlob(buf));
  ref = putCommit(putTree(base), ref ? [ref] : [], message);
  return ref;
}

const send = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'Authorization, Content-Type, Accept', 'access-control-allow-methods': 'GET, POST, PUT, PATCH, OPTIONS' });
  res.end(body === undefined ? '' : JSON.stringify(body));
};

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') return send(res, 204);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks);
  if (u.pathname === '/__test/yaz') {
    commitFiles([[u.searchParams.get('path'), raw]], `Dış commit: ${u.searchParams.get('path')}`);
    log.push(`dış commit ${u.searchParams.get('path')}`);
    return send(res, 200, { ref });
  }
  if (u.pathname === '/__test/gunluk') return send(res, 200, { log, ref, files: ref ? trees.get(commits.get(ref).tree).size : 0 });
  if (u.pathname === '/__test/dosya') {
    const sha = ref && trees.get(commits.get(ref).tree).get(u.searchParams.get('path'));
    res.writeHead(sha ? 200 : 404, { 'access-control-allow-origin': '*' });
    return res.end(sha ? blobs.get(sha) : '');
  }
  if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(res, 401, { message: 'Bad credentials' });
  if (DELAY) await wait(DELAY);
  const m = /^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/.exec(u.pathname);
  if (!m) return send(res, 404, { message: 'Not Found' });
  const rest = m[3] || '';
  const body = raw.length ? JSON.parse(raw.toString('utf8')) : null;
  log.push(`${req.method} ${rest || '/'}`);
  if (!rest) return send(res, 200, { full_name: `${m[1]}/${m[2]}`, private: !PUBLIC, default_branch: 'main', permissions: { push: true } });
  if (rest === '/git/ref/heads/main') return ref ? send(res, 200, { object: { sha: ref } }) : send(res, 409, { message: 'Git Repository is empty.' });
  let k = /^\/git\/commits\/(\w+)$/.exec(rest);
  if (k && req.method === 'GET') { const c = commits.get(k[1]); return c ? send(res, 200, { sha: k[1], tree: { sha: c.tree }, committer: { date: c.date } }) : send(res, 404, {}); }
  k = /^\/git\/trees\/(\w+)$/.exec(rest);
  if (k && req.method === 'GET') { const t = trees.get(k[1]); return t ? send(res, 200, { truncated: false, tree: [...t].map(([p, sha]) => ({ path: p, type: 'blob', mode: '100644', sha, size: blobs.get(sha).length })) }) : send(res, 404, {}); }
  k = /^\/git\/blobs\/(\w+)$/.exec(rest);
  if (k && req.method === 'GET') {
    const b = blobs.get(k[1]);
    if (!b) return send(res, 404, {});
    if (KBPS) await wait(b.length / KBPS);
    if (/raw/.test(req.headers.accept || '')) { res.writeHead(200, { 'content-type': 'application/octet-stream', 'access-control-allow-origin': '*' }); return res.end(b); }
    return send(res, 200, { sha: k[1], encoding: 'base64', content: b.toString('base64'), size: b.length });
  }
  if (rest === '/git/blobs' && req.method === 'POST') return send(res, 201, { sha: putBlob(Buffer.from(body.content, body.encoding === 'base64' ? 'base64' : 'utf8')) });
  if (rest === '/git/trees' && req.method === 'POST') {
    const t = new Map(body.base_tree ? trees.get(body.base_tree) : []);
    for (const e of body.tree) {
      if (e.sha === null) t.delete(e.path);
      else if (e.content != null) t.set(e.path, putBlob(Buffer.from(e.content, 'utf8')));
      else t.set(e.path, e.sha);
    }
    return send(res, 201, { sha: putTree(t) });
  }
  if (rest === '/git/commits' && req.method === 'POST') { const sha = putCommit(body.tree, body.parents, body.message); return send(res, 201, { sha, committer: { date: commits.get(sha).date } }); }
  if (rest === '/git/refs/heads/main' && req.method === 'PATCH') {
    const c = commits.get(body.sha);
    if (!c || (ref && !c.parents.includes(ref))) return send(res, 422, { message: 'Update is not a fast forward' });
    ref = body.sha;
    log.push(`commit: ${c.message}`);
    return send(res, 200, { object: { sha: ref } });
  }
  k = /^\/contents\/(.+)$/.exec(rest);
  if (k && req.method === 'PUT') { commitFiles([[decodeURIComponent(k[1]), Buffer.from(body.content || '', 'base64')]], body.message); return send(res, 201, { commit: { sha: ref } }); }
  return send(res, 404, { message: `Not Found: ${req.method} ${rest}` });
}).listen(PORT, '127.0.0.1', () => console.log(`sahte GitHub: http://localhost:${PORT} (anahtar: ${TOKEN}${EMPTY ? ', boş depo' : ''}${PUBLIC ? ', herkese açık' : ''})`));
