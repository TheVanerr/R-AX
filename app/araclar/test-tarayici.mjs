// Tarayıcı testi: uygulamayı başsız Edge/Chrome'da açar, belgeyi yükler, sayfa görüntüleri ve PDF üretir, konsol hatalarını yazar.
// Kullanım: node app/araclar/test-tarayici.mjs <belge yolu> <çıktı klasörü> [--sayfa 1,2,5] [--pdf tr,en] [--ekran ana|belge|olcum|kapak] [--port 8765]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const docPath = args[0];
const outDir = path.resolve(args[1] || '.');
const pages = (opt('sayfa', '') || '').split(',').filter(Boolean).map(Number);
const pdfLangs = (opt('pdf', '') || '').split(',').filter(Boolean);
const screens = (opt('ekran', 'belge') || '').split(',');
const port = +opt('port', 8765);
const W = +opt('genislik', 1500);
const H = +opt('yukseklik', 950);
fs.mkdirSync(outDir, { recursive: true });

const BROWSERS = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'];
const exe = BROWSERS.find((b) => fs.existsSync(b));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ra-test-'));
const dbgPort = 9300 + Math.floor(Math.random() * 500);
const browser = spawn(exe, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${dbgPort}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function target() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${dbgPort}/json`)).json();
      const pg = list.find((t) => t.type === 'page');
      if (pg) return pg;
    } catch (e) { /* başlıyor */ }
    await sleep(200);
  }
  throw new Error('Tarayıcıya bağlanılamadı');
}
const t = await target();
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
const logs = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.consoleAPICalled') logs.push(`[${m.params.type}] ${m.params.args.map((a) => a.value || a.description || '').join(' ')}`);
  if (m.method === 'Runtime.exceptionThrown') logs.push(`[exception] ${m.params.exceptionDetails.exception ? m.params.exceptionDetails.exception.description : m.params.exceptionDetails.text}`);
  if (m.method === 'Log.entryAdded') logs.push(`[log ${m.params.entry.level}] ${m.params.entry.text} ${m.params.entry.url || ''}`);
});
const cdp = (method, params = {}) => new Promise((resolve, reject) => {
  const i = ++id;
  pending.set(i, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
  ws.send(JSON.stringify({ id: i, method, params }));
});
const evalJs = async (expr, awaitPromise = true) => {
  const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text);
  return r.result.value;
};
const shot = async (file, clip) => {
  const r = await cdp('Page.captureScreenshot', Object.assign({ format: 'png' }, clip ? { clip: Object.assign({ scale: 1 }, clip), captureBeyondViewport: true } : {}));
  fs.writeFileSync(path.join(outDir, file), Buffer.from(r.data, 'base64'));
  console.log('görüntü:', file);
};

try {
  await cdp('Runtime.enable');
  await cdp('Log.enable');
  await cdp('Page.enable');
  await cdp('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
  const baseUrl = opt('url', null) || `http://localhost:${port}/app/index.html`;
  const url = `${baseUrl}${docPath && docPath !== '-' ? `?ac=${encodeURIComponent(docPath)}` : ''}`;
  if (opt('github', null)) {
    // GitHub modu: bağlantı ayarı yazılır, sayfa yeniden açılır (anahtar: sahte sunucunun test anahtarı)
    await cdp('Page.navigate', { url: baseUrl });
    await sleep(1500);
    await evalJs(`localStorage.setItem('ra_ayarlar', JSON.stringify({ mode: 'github', repo: '${opt('depo', 'TheVanerr/riskanalizix-veri')}', token: '${opt('anahtar', 'test-anahtar')}', api: '${opt('github')}' })); 1`);
  }
  if (args.includes('--ayar-sil')) {
    await cdp('Page.navigate', { url: baseUrl });
    await sleep(1000);
    await evalJs("localStorage.removeItem('ra_ayarlar'); 1");
  }
  await cdp('Page.navigate', { url });
  if (screens.includes('ana') || !docPath || docPath === '-') {
    await sleep(2500);
    await shot('ana-ekran.png');
    await evalJs("(() => { const i = document.getElementById('homeComboInput'); i.focus(); i.value = 'kb'; i.dispatchEvent(new Event('input', { bubbles: true })); })()");
    await sleep(500);
    await shot('ana-ekran-kutu.png');
    await evalJs("(() => { const i = document.getElementById('homeComboInput'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); })()");
    await sleep(300);
    await shot('ana-ekran-kutu-tum.png');
    await evalJs("document.querySelector('[data-home-tab=models]').click(); document.activeElement.blur()");
    await sleep(500);
    await shot('ana-ekran-modeller.png');
  }
  if (opt('kapi-test', null)) {
    // Bağlantı ekranı: [api, depo, anahtar] üçlüleriyle formu doldurur, sonucu yazar
    await sleep(1500);
    await shot('baglanti-ekrani.png');
    for (const trio of opt('kapi-test').split(';')) {
      const [api, repo, token] = trio.split('|');
      await evalJs(`(() => { const s = JSON.parse(localStorage.getItem('ra_ayarlar') || '{}'); localStorage.setItem('ra_ayarlar', JSON.stringify(Object.assign(s, { api: '${api}' }))); location.reload(); })()`).catch(() => {});
      await sleep(1500);
      await evalJs(`(() => { document.getElementById('ghRepo').value = '${repo}'; document.getElementById('ghToken').value = '${token}'; document.getElementById('ghForm').requestSubmit(); })()`);
      await sleep(2500);
      console.log(`kapı ${repo} / ${token.slice(0, 6)}…: ${await evalJs("(() => { const g = document.getElementById('gate'); return g.classList.contains('hidden') ? 'BAĞLANDI → ' + (document.getElementById('btnFolder').textContent) : 'HATA: ' + g.querySelector('.gate-error').textContent; })()")}`);
    }
    await shot('baglanti-son.png');
  }
  if (opt('eval', null)) {
    await sleep(1500);
    console.log('eval:', JSON.stringify(await evalJs(opt('eval'))));
  }
  if (docPath && docPath !== '-') {
    const t0 = Date.now();
    for (let i = 0; i < 120; i += 1) {
      const n = await evalJs("document.querySelectorAll('#doc .page').length");
      if (n > 3) break;
      await sleep(500);
    }
    console.log(`belge yüklendi: ${await evalJs("document.querySelectorAll('#doc .page').length")} sayfa, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    // Fotoğraflar rapor çizildikten sonra iner: yer tutucuların hepsi yerine oturana kadar
    for (let i = 0; i < 240; i += 1) {
      const left = await evalJs(`document.querySelectorAll('img[src*="#ra="]').length`);
      if (!left) break;
      if (i === 0) console.log(`  rapor ilk çizildiğinde bekleyen fotoğraf: ${left}`);
      await sleep(250);
    }
    console.log(`tüm fotoğraflar: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    if (args.includes('--tekrar')) {
      // Aynı raporu ikinci kez açma: dosyalar tarayıcı önbelleğinden (IndexedDB) gelir
      await cdp('Page.navigate', { url });
      await sleep(300);
      const t2 = Date.now();
      for (let i = 0; i < 120; i += 1) { if ((await evalJs("document.querySelectorAll('#doc .page').length")) > 3) break; await sleep(100); }
      const tp = Date.now() - t2;
      for (let i = 0; i < 240; i += 1) { if (!(await evalJs(`document.querySelectorAll('img[src*="#ra="]').length`))) break; await sleep(100); }
      console.log(`ikinci açılış: rapor ${(tp / 1000).toFixed(1)} s · tüm fotoğraflar ${((Date.now() - t2) / 1000).toFixed(1)} s`);
    }
    await sleep(800);
    if (screens.includes('belge')) await shot('goruntuleyici.png');
    if (screens.includes('kontrol')) {
      await evalJs("document.querySelector('[data-right=checks]').click()");
      await sleep(300);
      await shot('kontrol.png');
      await evalJs("document.querySelector('[data-right=sum]').click()");
    }
    if (opt('kapak', null)) {
      await evalJs(`(() => { const d = RaApp.state.doc; const box = document.createElement('div'); box.innerHTML = RaCovers.build('${opt('kapak')}', d.p, d.ev, RaApp.state.lang, RaApp.ctx); const pg = box.firstElementChild; pg.dataset.page = '1'; pg.querySelectorAll('.cv-pages').forEach((n) => { n.textContent = String(d.pages); }); const old = document.querySelector('#doc .page[data-page="1"]'); old.replaceWith(pg); })()`);
    }
    if (pages.length) {
      await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: 1240, deviceScaleFactor: 1, mobile: false });
      await sleep(300);
      await evalJs("RaApp.state.zoom = 1; document.getElementById('doc').style.setProperty('--z', 1)");
      await sleep(400);
      for (const n of pages) {
        const r = await evalJs(`(() => { const pg = document.querySelector('#doc .page[data-page="${n}"]'); if (!pg) return null; const wrap = document.getElementById('canvasWrap'); wrap.scrollTop = pg.offsetTop - 10; const b = pg.getBoundingClientRect(); return { x: b.left, y: b.top, width: b.width, height: b.height }; })()`);
        if (!r) { console.log('sayfa yok:', n); continue; }
        await sleep(250);
        const b = await evalJs(`(() => { const b = document.querySelector('#doc .page[data-page="${n}"]').getBoundingClientRect(); return { x: b.left, y: b.top, width: b.width, height: b.height }; })()`);
        await shot(`sayfa-${String(n).padStart(2, '0')}.png`, b);
      }
    }
    if (screens.includes('kapak')) {
      await evalJs("document.getElementById('btnCover').click()");
      await sleep(1200);
      await shot('kapak-studyo.png');
      await evalJs("document.getElementById('csClose').click()");
    }
    if (screens.includes('olcum')) {
      await evalJs("document.getElementById('btnMeasure').click()");
      await sleep(1200);
      await shot('olcum-elektrik.png');
      for (const tb of ['noise', 'thermal', 'files']) {
        await evalJs(`document.querySelector('.ms-tabs [data-tab=${tb}]').click()`);
        await sleep(900);
        await shot(`olcum-${tb}.png`);
      }
      await evalJs("document.getElementById('msClose').click()");
    }
    if (opt('canli-test', null)) {
      const file = path.resolve(opt('canli-test'));
      const orig = fs.readFileSync(file, 'utf8');
      const sig0 = await evalJs('RaApp.state.sig');
      try {
        fs.writeFileSync(file, `${orig}
<!-- canlı yenileme testi -->
`);
        let changed = false;
        for (let i = 0; i < 16 && !changed; i += 1) { await sleep(500); changed = (await evalJs('RaApp.state.sig')) !== sig0; }
        console.log(`canlı yenileme: ${changed ? 'rapor kendiliğinden yenilendi' : 'YENİLENMEDİ'} · bildirim: ${await evalJs("document.getElementById('toast').textContent")}`);
      } finally { fs.writeFileSync(file, orig); }
    }
    if (opt('dis-commit', null)) {
      // Claude'un depoya gönderdiği değişikliği taklit eder: sahte GitHub'a dışarıdan commit
      const gh = opt('github');
      const p0 = opt('dis-commit');
      const orig = await (await fetch(`${gh}/__test/dosya?path=${encodeURIComponent(p0)}`)).text();
      const sig0 = await evalJs('RaApp.state.sig');
      await fetch(`${gh}/__test/yaz?path=${encodeURIComponent(p0)}`, { method: 'POST', body: `${orig}
<!-- dış commit testi -->
` });
      const t1 = Date.now();
      let changed = false;
      for (let i = 0; i < 50 && !changed; i += 1) { await sleep(500); changed = (await evalJs('RaApp.state.sig')) !== sig0; }
      console.log(`dış commit: ${changed ? `rapor ${((Date.now() - t1) / 1000).toFixed(1)} sn sonra kendiliğinden yenilendi` : 'YENİLENMEDİ'} · ${await evalJs("document.getElementById('saveInfo').textContent")}`);
    }
    if (args.includes('--yeni-rapor-test')) {
      await evalJs("document.getElementById('btnNewUnit').click()");
      await sleep(500);
      await evalJs("(() => { const set = (id, v) => { const i = document.getElementById(id); i.value = v; }; set('nuNo', '0426998'); set('nuCu', 'Deneme Ltd'); document.getElementById('nuGo').click(); })()");
      await sleep(4000);
      console.log('yeni rapor:', await evalJs("JSON.stringify({ studio: !document.getElementById('studio').classList.contains('hidden'), baslik: (document.querySelector('.cs-title span') || {}).textContent, belge: RaApp.state.entry && RaApp.state.entry.path, sayfa: document.querySelectorAll('#doc .page').length })"));
      await shot('yeni-rapor-studyo.png');
      await evalJs("document.getElementById('msClose').click()");
    }
    if (args.includes('--kaydet-test')) {
      await evalJs("document.getElementById('btnMeasure').click()");
      await sleep(1000);
      await evalJs("document.querySelector('.ms-tabs [data-tab=noise]').click()");
      await sleep(500);
      await evalJs("(() => { const i = document.querySelector('[data-m=\"noise.rows.1.lpa\"]'); i.value = '78,0'; i.dispatchEvent(new Event('input', { bubbles: true })); })()");
      await evalJs("document.querySelector('.ms-tabs [data-tab=thermal]').click()");
      await sleep(500);
      await evalJs("(() => { const i = document.querySelector('[data-m=\"thermal.images.0.title.tr\"]'); i.value = 'Arka yüz (deneme)'; i.dispatchEvent(new Event('input', { bubbles: true })); })()");
      await evalJs("document.getElementById('msSaveClose').click()");
      await sleep(3500);
      console.log('kaydet sonrası:', await evalJs("document.querySelectorAll('#doc .page').length + ' sayfa · özet: ' + document.getElementById('rightSum').innerText.replace(/\\s+/g, ' ').slice(0, 300)"));
    }
    if (opt('yukle-test', null)) {
      // Ölçümler penceresi: R_PE 1. satırın fotoğraf kutusuna dosya yüklenir → olcum/PE <no>.jpg + rapor.md
      await evalJs("document.getElementById('btnMeasure').click()");
      await sleep(1200);
      const { root: domRoot } = await cdp('DOM.getDocument', { depth: -1 });
      const { nodeId } = await cdp('DOM.querySelector', { nodeId: domRoot.nodeId, selector: 'input[data-up="elec.rpe.0"]' });
      const sig0 = await evalJs('RaApp.state.sig');
      await cdp('DOM.setFileInputFiles', { nodeId, files: [path.resolve(opt('yukle-test'))] });
      let changed = false;
      for (let i = 0; i < 40 && !changed; i += 1) { await sleep(500); changed = (await evalJs('RaApp.state.sig')) !== sig0; }
      await sleep(1500);
      console.log('yükleme:', changed ? 'rapor yenilendi' : 'YENİLENMEDİ', '·', await evalJs(`JSON.stringify({ satir: RaApp.state.doc.raw.elec.rpe[0].photo, studyo: !document.getElementById('studio').classList.contains('hidden'), kucukResim: !!document.querySelector('.ms-up img.thumb'), bildirim: document.getElementById('toast').textContent })`));
      await shot('yukleme-studyo.png');
      if (opt('github', null)) {
        const md = await (await fetch(`${opt('github')}/__test/dosya?path=${encodeURIComponent(`${await evalJs('RaApp.state.entry.path')}/rapor.md`)}`)).text();
        console.log('  rapor.md R_PE satırı:', (md.split('\n').find((l) => /PE 1\.jpg|olcum\/PE/.test(l)) || 'YOK').trim());
        const g = await (await fetch(`${opt('github')}/__test/gunluk`)).json();
        console.log('  son commitler:', g.log.filter((l) => l.startsWith('commit')).slice(-3).join(' | '));
      }
      await evalJs("document.getElementById('msClose') && document.getElementById('msClose').click()");
    }
    if (opt('eval-sonra', null)) console.log('eval-sonra:', JSON.stringify(await evalJs(opt('eval-sonra'))));
    if (args.includes('--zoom-test')) {
      // Yakınlaştırma: çubuk, + düğmesi, Ctrl + tekerlek (imleç noktası sabit), sol kenar, Ctrl − / Ctrl 0, sayfaya sığdır, menü
      const z = () => evalJs("document.getElementById('zoomValue').textContent");
      console.log('zoom · üst menüde eski düğme:', (await evalJs("!!document.querySelector('.topbar #btnZoomIn')")) ? 'VAR' : 'yok', '· rapor alanında çubuk:', (await evalJs("!document.getElementById('zoomFloat').classList.contains('hidden')")) ? 'görünür' : 'GİZLİ');
      await evalJs("document.getElementById('btnFitWidth').click()");
      await sleep(200);
      const steps = [await z()];
      for (let i = 0; i < 3; i += 1) { await evalJs("document.getElementById('btnZoomIn').click()"); await sleep(150); steps.push(await z()); }
      console.log('zoom · + düğmesi:', steps.join(' → '));
      await evalJs("document.getElementById('btnFitWidth').click()");
      await sleep(200);
      await evalJs("document.querySelector('#leftToc [data-page=\"3\"]').click()");
      await sleep(300);
      const pt = await evalJs(`(() => { const w = document.getElementById('canvasWrap').getBoundingClientRect(); const r = document.querySelector('#doc .page[data-page="3"]').getBoundingClientRect(); const x = r.left + r.width * 0.78; const y = Math.min(r.top + 320, w.bottom - 80); return { x, y, fx: (x - r.left) / r.width, fy: (y - r.top) / r.height }; })()`);
      for (let i = 0; i < 4; i += 1) {
        await evalJs(`document.getElementById('canvasWrap').dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, clientX: ${pt.x}, clientY: ${pt.y}, bubbles: true, cancelable: true }))`);
        await sleep(120);
      }
      await sleep(200);
      const after = await evalJs(`(() => { const r = document.querySelector('#doc .page[data-page="3"]').getBoundingClientRect(); return { x: r.left + r.width * ${pt.fx}, y: r.top + r.height * ${pt.fy} }; })()`);
      console.log(`zoom · Ctrl + tekerlek: ${await z()} · imleç noktası kayması: ${Math.round(Math.abs(after.x - pt.x))} px yatay, ${Math.round(Math.abs(after.y - pt.y))} px dikey`);
      await evalJs("(() => { const m = document.getElementById('zoomValue'); m.click(); })()");
      await sleep(250);
      const menuOpen = await evalJs("!document.getElementById('zoomMenu').classList.contains('hidden')");
      await shot('zoom-menu.png');
      await evalJs("document.querySelector('#zoomMenu [data-z=\"3\"]').click()");
      await sleep(300);
      const edge = await evalJs("(() => { const w = document.getElementById('canvasWrap'); w.scrollLeft = 0; const r = w.getBoundingClientRect(); const pg = document.querySelector('#doc .page[data-page=\"3\"]').getBoundingClientRect(); return { yatayKaydirma: w.scrollWidth > w.clientWidth, solKenar: Math.round(pg.left - r.left) }; })()");
      console.log(`zoom · menü: ${menuOpen ? 'açıldı' : 'AÇILMADI'} → ${await z()} · yatay kaydırma: ${edge.yatayKaydirma ? 'var' : 'YOK'} · sayfa sol kenarı alanın ${edge.solKenar >= 0 ? `${edge.solKenar} px içinde (kesilmiyor)` : `${-edge.solKenar} px DIŞINDA (kesiliyor)`}`);
      await shot('zoom-300.png');
      await evalJs("document.dispatchEvent(new KeyboardEvent('keydown', { key: '-', ctrlKey: true, bubbles: true, cancelable: true }))");
      await sleep(150);
      const minus = await z();
      await evalJs("document.dispatchEvent(new KeyboardEvent('keydown', { key: '0', ctrlKey: true, bubbles: true, cancelable: true }))");
      await sleep(150);
      const fit = await z();
      await evalJs("document.getElementById('btnFitPage').click()");
      await sleep(300);
      const pageFit = await evalJs("(() => { const w = document.getElementById('canvasWrap'); const b = document.getElementById('docBanner'); const bh = b.classList.contains('hidden') ? 0 : b.offsetHeight; const wr = w.getBoundingClientRect(); const pg = [...document.querySelectorAll('#doc .page')].find((p) => p.getBoundingClientRect().bottom > wr.top + bh + 20); const r = pg.getBoundingClientRect(); return { sigiyor: r.height <= w.clientHeight - bh, ust: Math.round(r.top - wr.top - bh), alt: Math.round(wr.top + w.clientHeight - r.bottom) }; })()");
      console.log(`zoom · Ctrl −: ${minus} · Ctrl 0: ${fit} · sayfaya sığdır: ${await z()} (${pageFit.sigiyor ? 'sayfa tam görünüyor' : 'SIĞMIYOR'}, üst ${pageFit.ust} px, alt ${pageFit.alt} px)`);
      await shot('zoom-sayfa.png');
      await evalJs("document.getElementById('btnFitWidth').click()");
    }
    if (args.includes('--cubuk-test')) {
      // Üst çubuk: rapor no, yeni onaylayan (unvan sorulur), yeni rev (açıklama sorulur), tarih → kapak, antet, md
      const setField = (k, v, commit) => evalJs(`(() => { const i = document.querySelector('#metaBar [data-mb="${k}"]'); i.focus(); i.value = ${JSON.stringify(v)}; i.dispatchEvent(new Event('input', { bubbles: true })); ${commit ? "i.dispatchEvent(new Event('change', { bubbles: true }));" : ''} return true; })()`);
      const cover = () => evalJs("document.querySelector('#doc .page[data-page=\"1\"]').innerText.replace(/\\s+/g, ' ')");
      const head = () => evalJs("(document.querySelectorAll('#doc .lh-doc')[3] || {}).textContent");
      const waitSaved = async () => { for (let i = 0; i < 60; i += 1) { await sleep(400); const s = await evalJs("document.getElementById('mbState').textContent"); if (/kaydedildi|kaydedilemedi/.test(s)) return s; } return 'ZAMAN AŞIMI'; };
      const resetState = () => evalJs("document.getElementById('mbState').textContent = ''");
      const mdPath = `${docPath}/${opt('cubuk-md', '00-proje.md')}`;
      const md = async () => (opt('github', null) ? (await fetch(`${opt('github')}/__test/dosya?path=${encodeURIComponent(mdPath)}`)).text() : fs.readFileSync(mdPath, 'utf8'));
      await shot('cubuk-once.png', { x: 0, y: 0, width: W, height: 140 });
      // 1) Rapor no: yazarken kapak ve antet değişir, çıkınca kaydedilir
      await setField('docNo', 'RA-0326066-02', false);
      await sleep(300);
      console.log('çubuk · yazarken kapak:', (await cover()).includes('RA-0326066-02') ? 'güncel' : 'ESKİ', '· antet:', await head());
      await resetState();
      await setField('docNo', 'RA-0326066-02', true);
      console.log('çubuk · rapor no kaydı:', await waitSaved(), '·', (/^dokuman: RA-0326066-02$/m.test(await md()) ? 'md güncel' : 'md ESKİ'));
      // 2) Yeni onaylayan: unvan penceresi
      await resetState();
      await setField('approved', 'Ahmet YILMAZ', true);
      await sleep(500);
      const asked = await evalJs("!!document.getElementById('ptGo')");
      await shot('cubuk-unvan.png');
      await evalJs("(() => { document.getElementById('ptT-tr').value = 'Kalite Müdürü'; const en = document.getElementById('ptT-en'); if (en) en.value = 'Quality Manager'; const de = document.getElementById('ptT-de'); if (de) de.value = 'Qualitätsleiter'; document.getElementById('ptGo').click(); })()");
      console.log('çubuk · onaylayan:', asked ? 'unvan soruldu' : 'UNVAN SORULMADI', '·', await waitSaved(), '· kapakta:', /Ahmet YILMAZ.*Kalite Müdürü/.test(await cover()) ? 'ad + unvan' : 'EKSİK', '· md:', /^onay unvan: Kalite Müdürü \| Quality Manager \| Qualitätsleiter$/m.test(await md()) ? 'unvan yazıldı' : 'UNVAN YOK');
      // 3) Yeni rev: açıklama penceresi → revizyon tablosuna satır
      await resetState();
      await setField('rev', '01', true);
      await sleep(500);
      const asked2 = await evalJs("!!document.getElementById('nrGo')");
      await shot('cubuk-rev.png');
      await evalJs("(() => { document.getElementById('nrDesc-tr').value = 'Onaylayan değişti, rapor no güncellendi'; const en = document.getElementById('nrDesc-en'); if (en) en.value = 'Approver changed, report number updated'; document.getElementById('nrGo').click(); })()");
      const saved3 = await waitSaved();
      const revRows = await evalJs("JSON.stringify(RaApp.state.doc.p.revisions.map((r) => [r.rev, r.date, (r.desc.tr || '').slice(0, 24), r.approvedBy]))");
      console.log('çubuk · rev 01:', asked2 ? 'açıklama soruldu' : 'SORULMADI', '·', saved3, '· antet:', await head(), '· tablo:', revRows);
      // 4) Tarih: takvimden seçim (kısa bekleme ile kayıt)
      await resetState();
      await setField('reportDate', '2026-11-09', false);
      console.log('çubuk · tarih:', await waitSaved(), '· md:', (await md()).match(/^tarih: .*$/m)[0], '· kapak:', (await cover()).includes('09.11.2026') ? '09.11.2026' : 'ESKİ');
      const text = await md();
      console.log('  md revizyon satırları:', text.split(/\r?\n/).filter((l) => /^\| (00|01|) +\|/.test(l)).map((l) => l.slice(0, 70)).join(' ⏎ '));
      // 5) Esc: yazılan geri alınır
      await setField('prepared', 'Deneme', false);
      await evalJs("document.querySelector('#metaBar [data-mb=\"prepared\"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))");
      await sleep(300);
      console.log('çubuk · Esc:', await evalJs("document.querySelector('#metaBar [data-mb=\"prepared\"]').value"), '· kapak:', (await cover()).includes('Deneme') ? 'GERİ ALINMADI' : 'geri alındı');
      // 6) Durum: Yayın → yayınlanmış raporda rev artırmadan değişiklik onay ister (Vazgeç → geri alınır)
      await resetState();
      await evalJs(`(() => { const s = document.querySelector('#metaBar [data-mb="status"]'); s.value = 'final'; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      console.log('çubuk · durum:', await waitSaved(), '· damga:', (await cover()).includes('YAYINLANDI') ? 'YAYINLANDI' : 'TASLAK', '·', (await md()).match(/^durum: .*$/m)[0]);
      await setField('checked', 'Fatih GÜRAL', true);
      await sleep(500);
      const conf = await evalJs("!!document.getElementById('cpGo')");
      await evalJs("document.querySelector('.modal [data-x]').click()");
      await sleep(400);
      console.log('çubuk · yayınlanmışta değişiklik:', conf ? 'onay soruldu' : 'SORULMADI', '· vazgeç sonrası:', await evalJs("document.querySelector('#metaBar [data-mb=\"checked\"]').value"));
      // 7) Yayınlanmış raporda yeni rev → taslak
      await resetState();
      await setField('rev', '02', true);
      await sleep(500);
      await evalJs("(() => { document.getElementById('nrDesc-tr').value = 'Deneme revizyonu'; document.getElementById('nrGo').click(); })()");
      console.log('çubuk · rev 02:', await waitSaved(), '·', (await md()).match(/^durum: .*$/m)[0], '· damga:', (await cover()).includes('TASLAK') ? 'TASLAK' : 'YAYINLANDI', '· tablo:', await evalJs("RaApp.state.doc.p.revisions.map((r) => r.rev).join(', ')"));
      await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: 1240, deviceScaleFactor: 1, mobile: false });
      await evalJs("RaApp.state.zoom = 1; document.getElementById('doc').style.setProperty('--z', 1)");
      await sleep(400);
      for (const n of [1, 2]) {
        await evalJs(`(() => { const pg = document.querySelector('#doc .page[data-page="${n}"]'); document.getElementById('canvasWrap').scrollTop = pg.offsetTop - 10; })()`);
        await sleep(300);
        const b = await evalJs(`(() => { const b = document.querySelector('#doc .page[data-page="${n}"]').getBoundingClientRect(); return { x: b.left, y: b.top, width: b.width, height: b.height }; })()`);
        await shot(`cubuk-sayfa-${n}.png`, b);
      }
      await cdp('Emulation.clearDeviceMetricsOverride');
    }
    if (opt('bmt-test', null)) {
      // Termografi sekmesi: virgülle ayrılmış .bmt dosyaları sırayla yüklenir; her biri D-x olarak rapora eklenmeli
      for (const f of opt('bmt-test').split(',')) {
        await evalJs("document.getElementById('btnMeasure').click()");
        await sleep(1000);
        await evalJs("document.querySelector('.ms-tabs [data-tab=thermal]').click()");
        await sleep(400);
        const { root: domRoot } = await cdp('DOM.getDocument', { depth: -1 });
        const { nodeId } = await cdp('DOM.querySelector', { nodeId: domRoot.nodeId, selector: 'input[data-up="bmt"]' });
        const sig0 = await evalJs('RaApp.state.sig');
        await cdp('DOM.setFileInputFiles', { nodeId, files: [path.resolve(f)] });
        let changed = false;
        for (let i = 0; i < 40 && !changed; i += 1) { await sleep(500); changed = (await evalJs('RaApp.state.sig')) !== sig0; }
        await sleep(1200);
        console.log(`.bmt ${path.basename(f)}:`, changed ? 'rapor yenilendi' : 'YENİLENMEDİ', '·', await evalJs("JSON.stringify({ goruntu: RaApp.state.doc.raw.thermal.images.map((t) => t.file.split('/').pop() + (t.T ? ' ✓' : ' ✗')), sekme: (document.querySelector('.ms-tabs .active') || {}).textContent })"));
        await shot('bmt-studyo.png');
        await evalJs("document.getElementById('msClose') && document.getElementById('msClose').click()");
      }
    }
    if (args.includes('--yayin-test')) {
      // Yayınla → şablon makine klasörüne dondurulur; sonra güncel şablonla yeni revizyon → sablon/ silinir, taslak
      const st = () => evalJs("JSON.stringify({ donmus: !!RaApp.state.entry.frozen, durum: RaApp.state.doc.p.meta.status, rev: RaApp.state.doc.p.meta.rev, sablonRev: RaApp.state.doc.p.meta.templateRev, sayfa: document.querySelectorAll('#doc .page').length, serit: document.getElementById('docBanner').innerText.slice(0, 90) })");
      console.log('yayın öncesi:', await st());
      await evalJs("document.querySelector('#docBanner [data-act=publish]').click()");
      await sleep(400);
      await shot('yayinla-pencere.png');
      await evalJs("document.getElementById('pbGo').click()");
      let ok = false;
      for (let i = 0; i < 40 && !ok; i += 1) { await sleep(500); ok = await evalJs('!!RaApp.state.entry.frozen'); }
      await sleep(1500);
      console.log('yayın sonrası:', await st());
      await shot('yayin-sonrasi.png');
      if (opt('github', null)) {
        const g = await (await fetch(`${opt('github')}/__test/gunluk`)).json();
        console.log('  son commit:', g.log.filter((l) => l.startsWith('commit')).slice(-1)[0], '· blob yüklemesi:', g.log.filter((l) => l === 'POST /git/blobs').length);
      }
      if (args.includes('--cubuk-yenile')) {
        // Yayınlanmış makine raporunda çubuktan yeni rev → "güncel şablonla yeni revizyon" penceresi o rev ile açılır
        await evalJs(`(() => { const i = document.querySelector('#metaBar [data-mb="rev"]'); i.focus(); i.value = '05'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); })()`);
        await sleep(500);
        console.log('  çubuktan yeni rev: pencere', await evalJs("document.getElementById('rnRev') ? 'açıldı, rev ' + document.getElementById('rnRev').value : 'AÇILMADI'"));
      } else {
        await evalJs("document.querySelector('#docBanner [data-act=renew]').click()");
        await sleep(400);
      }
      await evalJs("(() => { const d = document.getElementById('rnDesc-tr'); if (d) d.value = 'Şablon güncellendi (test)'; document.getElementById('rnGo').click(); })()");
      ok = false;
      for (let i = 0; i < 40 && !ok; i += 1) { await sleep(500); ok = await evalJs('!RaApp.state.entry.frozen'); }
      await sleep(1500);
      console.log('yeni revizyon:', await st());
      console.log('  revizyon tablosu:', await evalJs("JSON.stringify(RaApp.state.doc.p.revisions.map((r) => [r.rev, r.date, (r.desc.tr || '').slice(0, 30)]))"), '· çubuk rev:', await evalJs("document.querySelector('#metaBar [data-mb=\"rev\"]').value"));
    }
    if (args.includes('--model-sil-test')) {
      // Model sayfası → Dosyalar → makine raporları listesi → "Sil…" (model sayfasında kalınır, liste yenilenir)
      const unitPath = await evalJs('RaApp.state.entry.path');
      const modelPath = await evalJs("RaApp.state.entry.modelPath || ''");
      await evalJs(`RaApp.open(${JSON.stringify(modelPath)})`);
      for (let i = 0; i < 40; i += 1) { await sleep(400); if ((await evalJs('RaApp.state.entry && RaApp.state.entry.kind')) === 'model' && (await evalJs("document.querySelectorAll('#doc .page').length")) > 3) break; }
      await evalJs("document.querySelector('[data-left=files]').click()");
      await sleep(400);
      const rows0 = await evalJs("document.querySelectorAll('#leftFiles [data-del-unit]').length");
      await shot('model-sil-liste.png');
      await evalJs(`document.querySelector('#leftFiles [data-del-unit="${unitPath.replace(/"/g, '\\"')}"]').click()`);
      await sleep(800);
      const phrase = await evalJs("(document.querySelector('.del-phrase') || {}).textContent");
      await evalJs(`(() => { const i = document.getElementById('delIn'); i.value = ${JSON.stringify(phrase || '')}; i.dispatchEvent(new Event('input', { bubbles: true })); document.getElementById('delGo').click(); })()`);
      let done = false;
      for (let i = 0; i < 40 && !done; i += 1) { await sleep(500); done = /silindi/.test(await evalJs("document.getElementById('toast').textContent")); }
      await sleep(600);
      console.log(`model sayfasından silme · liste: ${rows0} rapor → ${await evalJs("document.querySelectorAll('#leftFiles [data-del-unit]').length")} rapor · açık sayfa: ${await evalJs('RaApp.state.entry.kind + " " + RaApp.state.entry.path')} · "${phrase}" · ${done ? 'silindi' : 'SİLİNMEDİ'}`);
      await shot('model-sil-sonra.png');
    }
    if (args.includes('--sil-test')) {
      // Rapor silme: Dosyalar sekmesi → "Raporu sil…" → tam ad yazılmadan düğme kapalı → silinir, ana ekrana dönülür
      const target = await evalJs('RaApp.state.entry.path');
      await evalJs("document.querySelector('[data-left=files]').click()");
      await sleep(300);
      await shot('sil-panel.png');
      await evalJs("document.getElementById('btnDeleteDoc').click()");
      await sleep(800);
      const phrase = await evalJs("(document.querySelector('.del-phrase') || {}).textContent");
      const typeIt = async (v) => evalJs(`(() => { const i = document.getElementById('delIn'); i.value = ${JSON.stringify(v)}; i.dispatchEvent(new Event('input', { bubbles: true })); return document.getElementById('delGo').disabled; })()`);
      const states = [];
      for (const v of ['', phrase.toLowerCase(), phrase.slice(0, -1), `${phrase} `, phrase.split('/').pop()]) states.push(await typeIt(v));
      const okOpen = !(await typeIt(phrase));
      console.log(`silme · yazılacak: "${phrase}" · yanlış yazımlarda düğme kapalı: ${states.every(Boolean) ? 'evet' : `HAYIR ${JSON.stringify(states)}`} · tam yazınca açık: ${okOpen ? 'evet' : 'HAYIR'}`);
      await shot('sil-pencere.png');
      await evalJs("document.getElementById('delGo').click()");
      let home = false;
      for (let i = 0; i < 40 && !home; i += 1) { await sleep(500); home = await evalJs("!document.getElementById('home').classList.contains('hidden')"); }
      await sleep(800);
      const still = await evalJs(`!!document.querySelector('[data-open="${target.replace(/"/g, '\\"')}"]')`);
      console.log('silme · ana ekran:', home ? 'açıldı' : 'AÇILMADI', '· listede:', still ? 'HÂLÂ VAR' : 'yok', '· bildirim:', await evalJs("document.getElementById('toast').textContent"));
      if (opt('github', null)) {
        const r = await fetch(`${opt('github')}/__test/dosya?path=${encodeURIComponent(`${target}/rapor.md`)}`);
        const g = await (await fetch(`${opt('github')}/__test/gunluk`)).json();
        console.log('  depoda rapor.md:', r.status === 404 ? 'yok (silindi)' : `VAR (${r.status})`, '· son commit:', g.log.filter((l) => l.startsWith('commit')).slice(-1)[0]);
      } else console.log('  diskte klasör:', fs.existsSync(path.resolve(target)) ? 'HÂLÂ VAR' : 'yok (silindi)');
      await shot('sil-sonrasi.png');
    }
    for (const lang of pdfLangs) {
      const t1 = Date.now();
      const res = await evalJs(`RaApp.exportPdf(${JSON.stringify(lang.split('+'))}, false).then((r) => r)`);
      console.log(`PDF ${lang}: ${res.name} · ${res.pages} sayfa · ${(res.size / 1048576).toFixed(2)} MB · ${((Date.now() - t1) / 1000).toFixed(1)} s · eksik karakter: ${res.missing.join('') || '—'} · görsel hatası: ${res.failedImages}`);
      await sleep(1500);
    }
  }
} catch (e) {
  console.error('HATA:', e.message);
} finally {
  const errs = logs.filter((l) => /error|exception|warn/i.test(l));
  console.log(`konsol: ${logs.length} satır${errs.length ? `, ${errs.length} hata/uyarı:` : ''}`);
  errs.slice(0, 30).forEach((l) => console.log('  ', l.slice(0, 400)));
  ws.close();
  browser.kill();
  await sleep(300);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* kilitli */ }
}
