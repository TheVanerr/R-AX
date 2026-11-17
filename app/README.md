# Risk Analizi — uygulama

Tarayıcıda çalışan, kurulum gerektirmeyen risk analizi görüntüleyici ve rapor motoru. Arayüz ve rapor düzeni P&PX ile aynı temadadır (koyu arayüz, kırmızı antet çizgisi, üç kapak tasarımı, yazdırma penceresiz vektörel PDF).

```
md dosyaları ──► md.js ──► doc.js ──► rules.js ──► report.js + covers.js ──► layout.js ──► pdf-dom.js + pdf.js
 (proje/model)   ayrıştır   veri modeli  kurallar     bölüm HTML'leri / kapak     A4 sayfalar     PDF dosyası
```

## Modüller (`js/`)

| Dosya | Görev |
|---|---|
| `md.js` | md ayrıştırıcı: ön bilgi, başlıklar, alanlar, tablolar, çok dilli değerler |
| `doc.js` | md → veri modeli; bölüm eşleyicileri; birim raporunu model şablonuna bindirme; fotoğraf / .bmt otomatik bağlama; birim md yazımı |
| `library.js` | tehlike, SF, test, standart, işaret, CCF kütüphanesi; ölçüm sınır değerleri; markalar |
| `calc.js` | O×Ş risk, PL<sub>r</sub>, Tablo 7, PL<sub>low</sub>, CCF |
| `rules.js` | ölçüm değerlendirme (LVD, gürültü, termal), otomatik önlem / aksiyon / işaret, kontrol listesi — [KURALLAR.md](KURALLAR.md) |
| `thermal.js` | testo `.bmt` çözücü, sıcaklık matrisi, işaretçiler, palet |
| `texts.js` | raporun sabit metinleri (TR / EN / DE) |
| `report.js` | rapor bölümleri (1–13, Ek A–E), risk grafiği, SF blok diyagramı |
| `covers.js` | kapak tasarımları: Kırmızı Bant, Üst Bant, Köşe Blok |
| `layout.js` | antetli A4 sayfa, sayfalama (tablo / ızgara bölme), içindekiler |
| `pdf.js`, `pdf-dom.js` | P&PX PDF motoru: ekrandaki sayfayı ölçüp vektörel PDF yazar; yazı tipleri gömülür, fotoğraflar JPEG |
| `github.js` | GitHub deposu veritabanı olarak (P&PX yöntemi): ağaç, blob, tek commit'te çok dosya, "yalnız ileri" dal başı; herkese açık depo reddedilir |
| `store.js` | depo arayüzü, üç arka uç: **GitHub** (önerilen; ağaç bellekte, dosyalar kimliğine göre IndexedDB önbelleğinde, yazmalar 0,4 sn toplanıp tek commit, depo 15 sn'de bir denetlenir), **klasör** (File System Access), **HTTP** (yerel sunucu) |
| `app.js` | arayüz: klasör izni, ana ekran, model seçici, görüntüleyici, canlı yenileme, PDF, kapak ve ölçüm stüdyoları. Rapor fotoğrafları beklemeden çizilir (gri yer tutucu), fotoğraflar 12 paralel iner ve yerine oturur; PDF öncesi hepsi tamamlanır. Makine raporu: taslak → **Yayınla** (şablon `sablon/` klasörüne dondurulur) → **Güncel şablonla yeni revizyon**. Üst çubuk (kapak / antet bilgileri): yazarken kapak ve antetler yeniden dizilmeden güncellenir, alandan çıkınca md'ye yazılır (`RaDoc.setFront`, `RaDoc.editRevisions`). Rapor silme: Dosyalar sekmesi → Tehlikeli bölge; düğme `<sahip>/<klasör adı>` harfi harfine yazılınca açılır (yalnız `projects/<ad>` ve `models/…/raporlar/<ad>`; yerel sunucu da yalnız `projects/` ve `models/` altını siler) |
| `lvd-lib.js` | **LVD test raporu** — EN 60204-1 Bölüm 18 yapısı: §18.1 test programı a–h (zorunlu a, b, h) + koruyucu bağlama devresinde gerilim düşümü (≈10 A, EN 60204-1:2006 Tablo 9) + çalışma testi (aktif test: U ±%10, I, cos φ, P, S, Q), test akımı / gerilimi toleransları, gözle kontrol maddeleri G-01…G-25 (madde numaralarıyla), fonksiyon testleri F-01…F-07, varsayılan kabul kriterleri, fotoğraf ad kuralı, rapor metinleri (TR / EN / DE) |
| `lvd.js` | LVD: `lvd.md` ↔ veri modeli (okuma, yazma; tanınmayan bölümler korunur), değerlendirme (durumlar, genel sonuç, kontrol listesi), risk analizinden aktarım (`importRA`: yalnız boş alanlar, fotoğraflar kopyalanır) — [LVD-SEMASI.md](LVD-SEMASI.md) |
| `lvd-report.js` | LVD rapor sayfaları: Kırmızı Bant kapağı, revizyon / içindekiler, 1–9 ve Ek A (ölçüm ekranları), Ek B (makine ve kurulum); sayfalama `RaLayout.paginate` ile |
| `lvd-app.js` | LVD arayüzü: risk analizi ekranının üstünde açılan katman (`#lvd`). Ana ekrana **LVD Testleri** sekmesi, rapor çubuğuna **LVD** düğmesi ekler (risk analizi kodu değişmez). Liste, görüntüleyici, veri penceresi (Genel · Test cihazları · Gözle kontrol · Ölçümler · Fonksiyon testleri · Fotoğraflar), toplu fotoğraf yükleme (ad kuralı, EXIF saati, kurala uymayanı teste atama), PDF, silme. `?lvd=<klasör>` ile doğrudan açılır |

`md.js`, `doc.js`, `library.js`, `calc.js`, `rules.js`, `thermal.js`, `texts.js`, `covers.js`, `report.js`, `lvd-lib.js`, `lvd.js` DOM'a bağlı değildir; Node'da da çalışır.

## Araçlar (`araclar/`)

| Komut | Ne yapar |
|---|---|
| `node app/araclar/kontrol.mjs "<klasör>"` | belgeyi okur, kuralları çalıştırır, özet ve kontrol listesini yazar (`--json`) |
| `node app/araclar/lvd-kontrol.mjs "lvd/<klasör>"` | LVD test raporunu okur, EN 60204-1 §18.1 programına göre değerlendirir, özet ve kontrol listesini yazar (`--json`) |
| `node app/araclar/termal-incele.mjs <klasör> --cikti <klasör>` | `.bmt` dosyalarının min/maks, en sıcak nokta, ızgara değerleri; termal önizleme ve gerçek görüntü |
| `node app/araclar/sunucu.mjs [port]` | R&AX'i `http://localhost:8765/app/` adresinde sunar (izin istemeden açılış, test) |
| `node app/araclar/test-tarayici.mjs "<klasör>" <çıktı> --sayfa 1,2 --pdf tr+en+de --ekran ana,belge,olcum,kapak` | başsız Edge ile ekran görüntüsü ve PDF (sunucu açık olmalı) |
| `node app/araclar/sahte-github.mjs [port] [--bos] [--acik] [--gecikme ms] [--hiz KB/s]` | GitHub API'sini taklit eden test sunucusu (anahtar `test-anahtar`, veriler bellekte); `test-tarayici.mjs … --github http://localhost:8766` ile GitHub modu denenir. Ek test seçenekleri: `--tekrar` (önbellekten ikinci açılış süresi), `--yeni-rapor-test`, `--yukle-test <foto>` (Ölçümler satırına fotoğraf), `--bmt-test <a.bmt,b.bmt>`, `--yayin-test` (yayınla → yeni revizyon; `--cubuk-yenile` ile çubuktan), `--cubuk-test` (üst çubuk: rapor no, unvan, yeni rev, tarih, Esc, durum), `--sil-test` (açık raporu silme penceresiyle siler; gerçek veride kullanmayın), `--model-sil-test`, `--zoom-test` (çubuk, Ctrl + tekerlek imleç sabitliği, sol kenar, kısayollar, sayfaya sığdır), `--eval-sonra <js>` |
| `node app/araclar/test-donusum.mjs <eski.json> "<proje>"` | md'den okunan modeli eski uygulamanın proje dosyasıyla karşılaştırır |
| `node app/araclar/eski-donustur.mjs <eski.json> "<hedef>"` | eski `.riskproj.json` dosyasını md yapısına çevirir |
| `node app/araclar/fontlari-gom.mjs` · `python app/araclar/logolari-gom.py` · `python app/araclar/sembol-font.py` · `python app/araclar/ikon-uret.py` | gömülü yazı tipleri, logolar, sembol yazı tipi, simge |

`kisayol-olustur.cmd`: ana klasördeki **Risk Analizi** kısayolunu yeniden oluşturur (klasör taşınırsa).

## Yazı tipleri ve lisanslar

Carlito ve Selawik (SIL OFL), semboller DejaVu Sans alt kümesi (`assets/fonts/LICENSE-DejaVu.txt`). Rapor ekranda ve PDF'te aynı yazı tipleriyle dizilir; bilgisayarda yüklü yazı tiplerine bağlı değildir.

## LVD test raporu (elektriksel güvenlik)

Risk analizinden ayrı bir rapor türüdür; veriler `lvd/<iş no>-<MÜŞTERİ>-<MODEL>/` klasöründe durur (biçim: [LVD-SEMASI.md](LVD-SEMASI.md)). Risk analizi kodu ve `projects/`, `models/` dosyaları değişmez; LVD modülleri yalnız okur.

- **Açmak:** ana ekranda **LVD Testleri** sekmesi ya da bir risk analizi açıkken üst çubukta **LVD** (bağlı rapor varsa açılır, yoksa o risk analizinden oluşturulur).
- **Rapor no:** `LVD-<makine seri no>-<test sırası>`; `00` fabrika testi, aynı makinenin sonraki testi `01`, `02` … (yeni LVD raporu, klasör adına `-01` eklenir). Numara yeni rapor penceresinde kendiliğinden verilir; başka raporda kullanılan numara kaydedilmez. Dokümandaki düzeltme numarayı değiştirmez, rev artar.
- **Bilgi çubuğu:** görüntüleyicinin üstünde rapor no, rev, tarih, müşteri, hazırlayan / kontrol eden / onaylayan ve durum; değişince lvd.md'ye yazılır, kapak ve antet yenilenir. Rev yalnız artırılır: pencere tarih ve TR / EN / DE açıklama sorar (öntanımlı "Doküman düzeltmesi — test tekrarlanmamıştır"), revizyon tablosuna satır ekler, raporu taslağa döndürür. Raporlarda geçmeyen kişi için unvan sorulur, bilinen kişinin unvanı kendiliğinden gelir.
- **Risk analiziyle bağlantı:** numaraların ortak gövdesi iş no = makine seri no (`RA-0326066-00` ↔ `LVD-0326066-00`). Risk analizi raporu kendisine bağlı LVD raporunu `lvd/` klasöründen bulur; doküman kontrol sayfasında İlgili Dokümanlar tablosu, Bölüm 12 ve 13'te atıf, kontrol listesinde LVD sonucu / numara uyumu çıkar. Atıflar rev'siz yapılır (güncel revizyon geçerlidir).
- **Bağlantı:** `risk analizi: <klasör>`. **Risk analizinden aktar**: makine tipi ve besleme, test tarihi / yeri / test eden / yöntem, cihaz, R<sub>PE</sub> · R<sub>ISO</sub> · HV değerleri ve ölçüm fotoğrafları, genel / panel / kurulum fotoğrafları yalnız boş alanlara kopyalanır. Güvenlik fonksiyonu validasyonu risk analizinde kalır (atıf yapılır).
- **Fotoğraflar:** toplu bırakılır; `PE 1`, `L1-PE ISO`, `L1-PE FLASH`, `KACAK 1`, `ARTIK 1`, `ZS 1`, `ETIKET`, `PANO`, `GENEL`, `KURULUM` adları kendi satırına / türüne bağlanır; ölçüm saati boşsa EXIF çekim saatinden dolar; kurala uymayan ad listeden teste atanır.
- **Değerlendirme:** a–h her biri uygun / uygun değil / açık / yapılmadı / kurulum yerinde / koşullu; genel sonuç ve kontrol listesi sağ panelde ve `lvd-kontrol.mjs` çıktısında.
- **Rapor:** numaralı tablolar ve şekiller (dizinleriyle), her ölçüm tablosunun altında kurallarla değerlendirme cümlesi, ölçülen değer aralığı ve sınırıyla sonuç özeti, geçerlilik ve yasal uyarı, isteğe bağlı imza görselleri (`imza/`).
- **Depo:** GitHub modunda her kayıt bir commit'tir (fotoğraf kopyaları yeniden yüklenmez, depodaki dosya kimliği kullanılır). Kod deposu `.gitignore` ile `lvd/` klasörünü dışlar; LVD verileri veri deposundadır.

## PWA ve GitHub Pages

Uygulama kurulabilir bir PWA'dır: `manifest.webmanifest` (kimlik `./?pwa=dolfin-rax-risk-analizi-44cce8b4-4d1d-4fba-98c4-af3c1b3731f8`, start_url'e göre çözülür → `/R-AX/?pwa=…`; değiştirilirse kurulu uygulamalar ayrı uygulama sayılır), `sw.js` (uygulama kabuğunu ağ önce / önbellek yedek ile tutar; GitHub API, `__api/` ve `projects/` `models/` verileri önbelleğe girmez) ve `assets/pwa/` simgeleri (`python app/araclar/ikon-uret.py` üretir: kalkan içinde 3×3 risk matrisi).

Yayın: `.github/workflows/pages.yml` — `main`'e `app/**` değişikliği gidince `app/` klasörünü (`araclar/`, `*.md`, kısayol betikleri hariç) GitHub Pages'e yükler ve `sw.js` içindeki `__SURUM__` değerini commit kimliğiyle değiştirir (her yayında önbellek yenilenir). Adres: `https://thevanerr.github.io/R-AX/`. Veriler yayına girmez; uygulama gizli veri deposuna kullanıcının kendi anahtarıyla bağlanır. Service worker yalnız https ve localhost'ta çalışır; `file://` kısayolu eskisi gibi açılır.
