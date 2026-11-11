# CLAUDE.md — R&AX risk analizi deposu

Dolfin (CNK Elektronik Makine San. A.Ş.) endüstriyel parça yıkama makinelerinin risk değerlendirme raporları. Raporlar **md dosyalarında** durur; `app/` içindeki tarayıcı uygulaması onları okur, kurallarla değerlendirir, A4 rapor ve PDF üretir. Kullanıcı raporları uygulamada görür (ana klasördeki **Risk Analizi** kısayolu); md değişince açık rapor kendiliğinden yenilenir.

- md biçimi: [app/MD-SEMASI.md](app/MD-SEMASI.md) — yazmadan önce oku, birebir uy.
- Kurallar ve eşikler: [app/KURALLAR.md](app/KURALLAR.md).
- Tam örnek proje: `projects/0326066-KSYSTE-KBN 1B 1500/` · tam örnek model şablonu: `models/KBN/KBN 1B/`.

## İki depo

| Depo | İçerik | Yerel |
|---|---|---|
| `TheVanerr/R-AX` (herkese açık; uygulama GitHub Pages: https://thevanerr.github.io/R-AX/) | uygulama kodu, belgeler, `_eski/` — müşteri verisi eklenmez | `R&AX/.git` |
| `TheVanerr/riskanalizix-veri` (özel olmalı) | **veritabanı**: `projects/`, `models/` | `R&AX/.veri.git` — çalışma ağacı R&AX kökü, yalnız `projects/` ve `models/` izlenir |

Kullanıcı uygulamayı GitHub modunda kullanır: Ölçümler penceresi ve yeni rapor/proje doğrudan veri deposuna commit atar. Bu yüzden veri düzenlemeden **önce çek, bitince gönder** (komutlar R&AX kökünden):

```
git --git-dir=.veri.git pull --rebase --autostash        # önce: uygulamadan gelen kayıtları al
git --git-dir=.veri.git add -A -f -- projects models ':!*Thumbs.db' ':!*desktop.ini' ':!*.tmp' ':!*~$*'
git --git-dir=.veri.git commit -m "…"                    # sonra: değişikliği kaydet
git --git-dir=.veri.git pull --rebase                    # arada uygulamadan kayıt geldiyse üstüne taşı
git --git-dir=.veri.git push origin main                  # uygulama 15 sn içinde görür
```

`add` için `-f` gerekir: kök `.gitignore` kod deposunu korumak için `projects/` ve `models/` klasörlerini dışlar ve veri deposu da aynı çalışma klasörünü kullanır. `.gitignore`'dan bu satırları silme. Eklemeden önce `add -n` (kuru çalıştırma) ile listeye bak.

Kullanıcı uygulamadan proje / makine raporu silebilir (onay: `TheVanerr/<klasör adı>` tam yazılır; commit "Silindi: <yol>"). Yanlışlıkla silineni geri getirmek için: `git --git-dir=.veri.git pull --rebase`, sonra `git --git-dir=.veri.git log --diff-filter=D --oneline -- "<yol>"` ile silme commit'ini bul, `git --git-dir=.veri.git checkout <commit>^ -- "<yol>"` ile geri al, ekle / commit / gönder.

Göndermeden önce deponun gizli olduğunu doğrula — oturumsuz istek **404** dönmeli (200 = herkese açık, müşteri verisi gönderilmez):
`curl -s -o /dev/null -w "%{http_code}" https://api.github.com/repos/TheVanerr/riskanalizix-veri`

Kod deposu `projects/` ve `models/` klasörlerini `.gitignore` ile dışarıda tutar. Bu yapıdan sonraki ilk kod commit'inde eski veri yolları izlemeden çıkarılmalı: `git rm -r --cached Models "0326066-KSYSTE-KBN 1B 1500 RISK ANALYSIS"` (yalnız kullanıcı commit isterse).

## İş türleri

### A) Proje risk analizi yazmak (`projects/`)

Kullanıcı verir: LVD ölçümleri (R<sub>PE</sub>, yalıtım, gerilim dayanım — değer, saat, nokta), gürültü ölçümleri, termal ölçümler (testo `.bmt` veya değerler), fotoğraflar, elektrik şeması, makine bilgisi / kılavuz.

1. Klasör: `projects/<iş no>-<MÜŞTERİ KISA>-<MODEL>/` (ör. `0326066-KSYSTE-KBN 1B 1500`). Alt klasörler: `foto/` (genel, panel, detay), `kurulum/` (test kurulumu, Ek B), `olcum/` (ölçüm ekranları), `gurultu/`, `termal/` (`.bmt`), `kaynak/` (şema, kılavuz; rapora girmez), `cikti/`.
2. Ölçüm fotoğraflarını adlandırma kuralıyla koy: `PE 1.jpg` …, `L1-L2 ISO.jpg`, `L1-L2 FLASH.jpg`, `GURULTU 1.jpg`. Fotoğraflara bakarak ekrandaki değeri ve saati oku; kullanıcının verdiği değerle çelişirse sor.
3. `.bmt` varsa `node app/araclar/termal-incele.mjs "<klasör>/termal" --cikti <scratchpad>` ile önizlemeleri üret, görüntülere bakıp işaretçileri (alan / nokta / çıplak sac / HS) piksel koordinatıyla yaz.
4. md dosyalarını yaz (`00-proje.md` … `07-sonuc.md`). En yakın model şablonundan veya 0326066'dan başla; makineye göre her satırı yeniden değerlendir, kopyalayıp bırakma.
5. Kontrol et (aşağıda) ve kullanıcıya özetle: klasör, sayfa sayısı, risk dağılımı, PL sonuçları, ölçüm sonuçları, açık noktalar ve emin olmadığın veriler.

### B) Değişiklik isteği

İlgili md'yi düzenle; uygulama kendiliğinden yeniler. Yayınlanmış (`durum: yayın`) raporda içerik değişiyorsa `rev` artır ve `# Revizyonlar` tablosuna satır ekle. Değişikliği üç dilde de yap.

Kullanıcı rapor no, rev, tarih, hazırlayan / kontrol eden / onaylayan (unvanlarıyla) ve projede durumu uygulamanın üst çubuğundan değiştirir. Çubuk bunları ön bilgiye ve `# Revizyonlar` tablosuna yazar; bu yüzden düzenlemeden önce çek. Güncel revizyonun tablo satırı (tarih, hazırlayan, onaylayan) raporda ön bilgiden gelir; ikisini birlikte güncel tut. `<rol> unvan: -` unvanı gizler (MD-SEMASI).

### C) Model şablonu yazmak (`models/<AİLE>/<MODEL>/`)

Ön bilgi `tur: model` (iş no, müşteri, tarih yok). Ölçüme bağlı tehlikelerde (`ölçüm: elektrik | gürültü | termal`) **ölçülen değer yazma** ve `risk:` yazma; kurallar her makinenin ölçümünden yazar. Validasyon sonuçları boş; elektrik / gürültü tablolarında ölçüm noktası açıklamaları var, değerler boş; termografide yöntem, sınır, malzeme var, `## D-x` yok. İş numarası gereken yerde `{{no}}`. Her makinenin raporu `raporlar/<iş no>-<MÜŞTERİ>/rapor.md` (uygulamanın Ölçümler penceresi yazar).

**Şablonu değiştirirken** (içerik, tehlike, SF, ölçüm noktası …) ön bilgideki `sablon rev`'i bir artır (`00` → `01`) ve değişikliği üç dilde yap. Taslak makine raporları değişikliği kendiliğinden alır. Yayınlanmış raporlar (`durum: yayın`) kendi `raporlar/<iş>/sablon/` kopyasını kullanır; bu kopyaya dokunma. Kullanıcı isterse uygulamada **Güncel şablonla yeni revizyon aç** der. Değişiklikten sonra kullanıcıya hangi yayınlanmış raporların eski şablonda kaldığını söyle (`grep -l "durum: yayın" models/<AİLE>/<MODEL>/raporlar/*/rapor.md`).

### D) Standart model makine raporu

Kullanıcı uygulamada yapar (**+ Yeni makine raporu** → Ölçümler → Yayınla). Değerleri Claude'a verirse `raporlar/<iş>/rapor.md` dosyasını Ölçümler penceresinin yazdığı biçimde yaz (`tur: birim`, `sablon rev: <modelin güncel değeri>`; `# Elektrik Testleri`, `# Gürültü`, `# Termografi`, `# Validasyon` yalnız değerlerle) ve fotoğrafları adlandırma kuralıyla alt klasörlere koy. Yayınlama (şablonu `sablon/` klasörüne dondurma) uygulamadan yapılır; elle `sablon/` oluşturma.

## Kusursuz analiz için kontrol listesi

- **Tehlike tanımlama:** EN ISO 12100 Tablo B.1'in on grubunun her biri (mekanik, elektrik, termal, gürültü, titreşim, radyasyon, malzeme/madde, ergonomi, kullanım ortamı, kombinasyon) ya en az bir tehlikeyle ya da `## Uygulanamaz` altında gerekçeyle karşılanır. Yaşam döngüsü fazları: taşıma, kurulum, devreye alma, çalışma, temizlik, bakım, arıza giderme, devreden çıkarma. Öngörülebilir kötüye kullanım (koruyucuyu köprüleme, sıcak yüzeye temas, yanlış kimyasal) ayrıca değerlendirilir. Başlangıç noktası: `app/js/library.js` tehlikeleri.
- **Her tehlike:** tür, tehlikeli durum (kim, hangi parça, nasıl), faz, tehlike noktası, başlangıç ve artık O/Ş, önlemler. Önlem sırası üç adımlı yöntem: tasarım → koruyucu / güvenlik fonksiyonu → kullanım bilgisi. Artık risk hedefi R ≤ 8; 8–12 kalırsa ALARP gerekçesi yaz.
- **Kontrol sistemine dayanan her önlem bir SF'dir:** S/F/P gerekçeli; alt sistemler elektrik şemasından (cihaz tipi, klemens, röle, kontaktör, reset türü); B<sub>10D</sub> / MTTF<sub>D</sub> kaynağı (üretici verisi, EN ISO 13849-1 Ek C [K4]); DC; kategori. Şemayla çelişki varsa `## Notlar` altında `[uyarı]` ile yaz. PL < PL<sub>r</sub> ise bunu gizleme: [Ö] önlem + aksiyon + sonuç cümlesi.
- **CCF** ≥ 65 kanıtlarıyla; **validasyon** her SF için açma / arıza simülasyonu testleri.
- **LVD:** her R<sub>PE</sub> noktasının yeri (fotoğraf B-n), her iletken çiftinin ISO ve HV değeri; ölçütler `R_PE:`, `R_ISO:`, `HV:` alanlarında.
- **Gürültü:** konum, mesafe, yükseklik, çalışma durumu, cihaz, arka plan; operatör konumu satırları; > 80 dB(A) ise L<sub>WA</sub>.
- **Termal:** 304 paslanmaz sacda çıplak yüzey düşük gösterir; ölçüm naylon kaplı bölgelerde yapılır, çıplak sac işaretçisi `Çıplak: evet`. Ölçüt 65 °C (çıplak metal, 1 s).
- **Dil:** `diller: tr, en, de` ise her metin üç dilde (fotoğraf açıklamaları, tablo hücreleri dahil). Sayılar TR/DE virgül, EN nokta.
- **Anlatım (kullanıcı tercihi):** uyarı, etiket ve kılavuz maddeleri tamamlanmış ifadeyle yazılır — "uygulanmıştır", "belirtilmiştir", "beyan edilmiştir" (EN "has been applied / is stated", DE "wurde angebracht / ist angegeben"); geniş zaman ("belirtilir", "uygulanır") kullanılmaz.
- Kesin olmayan bilgiyi uydurma: `[doldurulacak]` bırak (raporda sarı görünür) ve kullanıcıya sor.

## Bittiğinde

```
node app/araclar/kontrol.mjs "projects/<klasör>"        # hata 0 olmalı; uyarıları tek tek değerlendir
node app/araclar/sunucu.mjs                              # görsel kontrol için (arka planda)
node app/araclar/test-tarayici.mjs "projects/<klasör>" <scratchpad> --sayfa 1,11,25 --pdf tr
```

Uygulama kodunu değiştirirsen: `node app/araclar/test-donusum.mjs "_eski/app-v1/ornek_KBN-1B-1500.riskproj.json" "projects/0326066-KSYSTE-KBN 1B 1500"` (0 fark beklenir; 0326066 md'si elle değiştiyse farklar normaldir) ve tarayıcı testi. `app/assets/fonts/fonts.js` ile `logos.js` elle düzenlenmez, `araclar/` betikleriyle üretilir. Commit yalnız kullanıcı isterse.
