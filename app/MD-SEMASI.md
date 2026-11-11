# Risk analizi md şeması

Bir risk analizi = bir klasördeki `*.md` dosyaları (`README.md` hariç). Dosyalar ad sırasıyla okunur; **bölümler başlıklarından tanınır**, hangi dosyada durduğu önemli değildir. Tam örnek: [`projects/0326066-KSYSTE-KBN 1B 1500/`](../projects/0326066-KSYSTE-KBN%201B%201500/) (proje) ve [`models/KBN/KBN 1B/`](../models/KBN/KBN%201B/) (model şablonu).

Önerilen dosya düzeni:

| Dosya | Bölümler |
|---|---|
| `00-proje.md` (modelde `00-model.md`) | ön bilgi, `# Kapsam`, `# Revizyonlar`, `# Dağıtım`, `# Standartlar` |
| `01-makine.md` | `# Makine` (+ `## Teknik veriler`, `## Kontrol paneli`), `# Sınırlar` |
| `02-fotograflar.md` | `# Fotoğraflar`, `# Tehlike Noktaları` |
| `03-tehlikeler.md` | `# Tehlikeler` (`## H-01` …, `## Uygulanamaz`) |
| `04-guvenlik.md` | `# Güvenlik Fonksiyonları` (`## SF-01` …, `## Notlar`), `# CCF`, `# Sistematik` |
| `05-validasyon.md` | `# Validasyon` (`## V-01` …) |
| `06-olcumler.md` | `# Elektrik Testleri`, `# Gürültü`, `# Termografi` |
| `07-sonuc.md` | `# Sonuç`, `# Aksiyonlar`, `# İşaretler` |

Kontrol: `node app/araclar/kontrol.mjs "<klasör>"` — tanınmayan bölüm, eksik çeviri, PL < PLr, yüksek artık risk, bulunamayan dosya vb. listelenir.

---

## Yazım kuralları

**Çok dilli metin.** Türkçe her zaman ilk değerdir; EN ve DE iki yoldan eklenir:

```markdown
- faz: Yükleme, boşaltma | Loading, unloading | Beladen, Entladen      ← kısa metin: " | " ile
- durum: Kapak kapanırken el/parmakların sıkışması                     ← uzun metin: alt maddeyle
  - en: Hand/fingers caught while the lid closes
  - de: Hand/Finger geraten beim Schließen zwischen Deckel und Rahmen
```

Paragraflarda `en:` / `de:` ile başlayan paragraf o dilin metnidir. Tablolarda çeviri **devam satırıyla** yazılır: satırın dolu hücrelerinin hepsi `en:` / `de:` ile başlar, boş hücre o dilde Türkçeyi kullanır:

```markdown
| Özellik | Değer |
|---|---|
| Pompa motoru | 2,2 kW · 1,5 bar |
| en: Pump motor | en: 2.2 kW · 1.5 bar |
| de: Pumpenmotor | de: 2,2 kW · 1,5 bar |
```

Çeviri yoksa raporda Türkçe metin çıkar ve Kontrol listesinde "EN çevirisi eksik" uyarısı görünür.

**Satır içi biçim.** `**kalın**`, `*eğik*`, `<b>`, `<sub>`, `<sup>`, `<br>` kullanılabilir. `[doldurulacak]` gibi köşeli parantezli metin raporda sarı "doldurulacak alan" olur; `[K1]` gibi kaynak etiketleri normal kalır. `<!-- yorum -->` rapora girmez. Metinde `|` gerekiyorsa `\|` yazılır.

**Değişkenler (model şablonlarında).** `{{no}}`, `{{musteri}}`, `{{model}}`, `{{tarih}}`, `{{dokuman}}`, `{{rev}}` — birim raporunun bilgisiyle doldurulur. Örnek: `Teknik Dosya — KBN 1B 1500 / {{no}}`.

**Numaralar.** Tehlike `H-01, H-02 …`, güvenlik fonksiyonu `SF-01 …`, validasyon `V-01 …`, aksiyon `A-01 …` — sıralı ve tekrarsız. Başlıktaki numaradan sonraki metin yalnız okumayı kolaylaştırır (`## H-03 · Sıcak sıvı püskürmesi`).

---

## Ön bilgi

```markdown
---
tur: proje                  # proje | model | birim
no: 0326066                 # iş / proje / seri no
musteri: KSYSTEMS
model: KBN 1B 1500
marka: DOLFIN               # antet ve kapak: DOLFIN | ENVA | VICO | KSYSTEM
uretici: CNK Elektronik Makine San. A.Ş.
marka adi: Dolfin®
marka satiri: Dolfin® Industrial Parts Washing Machines
yil: 2026
dokuman: RA-0326066-01      # yoksa RA-<no>-01
rev: 00
sablon rev: 00              # yalnız model ve birim: şablonun revizyonu (aşağıya bakın)
tarih: 22.10.2026           # rapor tarihi
durum: taslak               # taslak | yayın (kapaktaki damga)
diller: tr, en, de          # rapor ve PDF dilleri
kapak: bant                 # bant (Kırmızı Bant) | ust (Üst Bant) | kose (Köşe Blok)
hazirlayan: Fatih GÜRAL
hazirlayan unvan: Kalite Kontrol Sorumlusu (Makine Mühendisi) | Quality Control Officer (Mechanical Engineer) | Qualitätskontrollverantwortlicher (Maschinenbauingenieur)
kontrol: Sinan EVKAYA
kontrol unvan: …
onay: Sinan EVKAYA
onay unvan: …
hazirlayan logo: atlascert  # kapak altındaki "Prepared by" logosu; istenmezse: yok
---
```

**Kapak bilgileri ve üst çubuk.** `dokuman`, `rev`, `tarih`, `hazirlayan`, `kontrol`, `onay`, unvanlar ve (projede) `durum` uygulamanın üst çubuğundan da değiştirilir. Çubuk değeri, alanın tanımlı olduğu md dosyasına yazar (yoksa projede ön bilgili ilk md'ye, makine raporunda `rapor.md`'ye); var olan satırın yazımı ve satır sonları korunur. Raporlarda daha önce geçmeyen bir kişi girilince unvanı sorulur. `<rol> unvan: -` unvanı gizler; makine raporunda şablondaki başka kişinin unvanının kapakta kalmasını önler. Makine raporunda şablondaki kişi yeniden seçilirse rapordaki ayrı kayıt silinir ve şablon geçerli olur.

Birim raporunda (`tur: birim`) model klasörü varsayılan olarak `../..` kabul edilir (`models/<AİLE>/<MODEL>/raporlar/<iş>/`); farklıysa `temel: <yol>` yazılır.

**Şablon revizyonu ve dondurma.** Model şablonunun ön bilgisindeki `sablon rev`, şablonda her içerik değişikliğinde bir artırılır (`00` → `01`).

- **Taslak birim** (`durum: taslak`) modelin güncel şablonunu kullanır; şablon değişince rapor da kendiliğinden değişir.
- **Yayınla** (uygulamada): şablonun o anki dosyaları (md ve `foto/`; `raporlar/`, `kaynak/`, `README.md` hariç) birim klasörüne `sablon/` olarak kopyalanır; birimin ön bilgisine `durum: yayın`, `rev`, `tarih` ve `sablon rev: <o anki>` yazılır. Rapor artık bu dondurulmuş kopyadan oluşur; şablondaki sonraki değişikliklerden etkilenmez.
- **Güncel şablonla yeni revizyon aç**: `sablon/` silinir, `rev` bir artar, rapor taslağa döner ve güncel şablona bağlanır. Ölçümler ve fotoğraflar korunur.
- `sablon/` elle düzenlenmez. Yayınlanmış raporda düzeltme gerekiyorsa yeni revizyon açılır.

## Bölümler

### `# Kapsam`
Alanlar: `makine tipi`, `kapsam`, `alan`, `kapsam dışı`. Bölüme paragraf yazılırsa Bölüm 1'deki hazır amaç cümlesinin yerine geçer.

### `# Revizyonlar` · `# Dağıtım` · `# Standartlar`
```markdown
| Rev | Tarih | Açıklama | Hazırlayan | Onaylayan |
| No | Alıcı | Format |
| Referans | Başlık |          ← başlık boşsa kütüphanedeki başlık kullanılır
```
**Güncel revizyonun satırı** (ön bilgideki `rev`) tarihini, hazırlayanını ve onaylayanını ön bilgiden alır; kapak ile tablo hep aynı bilgiyi gösterir. Tabloda güncel revizyonun satırı yoksa raporda eklenir: tablo hiç yoksa ve rev 00 ise "İlk yayın", değilse açıklaması `[Revizyon açıklaması]` (sarı, doldurulacak).

Uygulamanın üst çubuğu bu tabloya yazar: yeni rev girilince değişiklik açıklaması sorulur ve satır eklenir (EN / DE açıklama `en:` / `de:` devam satırlarında); tarih ve kişiler değişince güncel revizyonun satırı güncellenir. Tablo yoksa önceki revizyonların satırlarıyla birlikte kurulur.

### `# Makine`
Paragraflar = makine tanımı. `## Teknik veriler` tablosu `| Özellik | Değer |`, `## Kontrol paneli` tablosu `| Etiket | Eleman / Fonksiyon | Güvenlik ilişkisi |`.

### `# Sınırlar`
Alanlar: `kullanım amacı`, `çalışma modları`, `kullanıcılar`, `kötüye kullanım` (her madde alt madde olarak), `hareket alanı`, `erişim`, `arayüzler`, `ömür`, `profil` (`220 gün/yıl · 16 h/gün · 10 dk çevrim aralığı` → n<sub>op</sub> hesaplanır), `bakım`, `ortam`, `fazlar`.

### `# Fotoğraflar`
```markdown
| Dosya | Tür | Açıklama |
| foto/genel-gorunum.jpg | kapak | Genel görünüm |
| foto/kontrol-paneli.jpg | panel | Kontrol paneli (ön görünüş) |
| foto/detay-01.jpg | detay | Kapak üst bölgesi … |        ← Ek A
| kurulum/kurulum-01.jpg | kurulum | R_PE ölçüm noktası 1 … |  ← Ek B
```
Tür: `kapak`, `panel`, `genel`, `detay` (Ek A), `kurulum` (Ek B), `olcum` (Ek C — tabloya bağlanmamış ekran görüntüsü). Bir fotoğrafa birden çok tür virgülle verilebilir.

### `# Tehlike Noktaları`
```markdown
- fotoğraf: kurulum/kurulum-04.jpg
| No | x | y | Konum | Açıklama |
| 1 | 20 | 65,6 | Kapak alt kapanma kenarı | Kapak kapanırken el-parmak ezilmesi |
```
x, y: fotoğraf genişliği / yüksekliğinin yüzdesi (numaralı kırmızı işaretin merkezi).

### `# Tehlikeler`
```markdown
## H-07 · Termal — sıcak yüzey
- anahtar: hot_surface              ← kütüphane anahtarı (isteğe bağlı)
- ölçüm: termal                     ← isteğe bağlı: elektrik | gürültü | termal (kural motoru bu tehlikeye sonuç satırı ekler)
- tür: Termal — sıcak yüzey | Thermal — hot surface | Thermisch — heiße Oberfläche
- durum: Kapak iç sacı ve parçaların ≥ 60 °C olması; temasla yanık
  - en: …
  - de: …
- faz: Boşaltma, temizlik | Unloading, cleaning | Entladen, Reinigung
- nokta: 1, 6                       ← Tehlike Noktaları numaraları
- risk: O3 Ş3 → O2 Ş2               ← önlemden önce → sonra (O olasılık, Ş şiddet, 1–5)
- önlemler:
  - [M] Mevcut önlem (makinede uygulanmış)
  - [Ö] Önerilen / açık önlem → A-04        ← "→ A-xx" aksiyonla bağlar (uygulanmayacaksa raporda belirtilir)
  - [B] Kullanım bilgisi: etiket, kılavuz, KKD

## Uygulanamaz
- Titreşim: Makinede el-kol veya tüm vücut titreşimi oluşturan kaynak yoktur. | No source of hand-arm or whole-body vibration. | Keine Quelle für Hand-Arm- oder Ganzkörpervibration.
- Radyasyon: …
```
`ölçüm:` yazılan tehlikede `risk:` yazılmazsa O/Ş değerleri ölçüm sonucundan alınır (bkz. [KURALLAR.md](KURALLAR.md)).

### `# Güvenlik Fonksiyonları`
```markdown
## SF-01 · Kapak kilitlemesi
- anahtar: lid_interlock
- ad: Kapak kilitlemesi | Lid interlocking | Deckelverriegelung
- tanım: Kapak açıldığında … (EN/DE alt maddeyle)
- tetikleyici: … | … | …
- güvenli durum: … | … | …
- tehlikeler: H-03, H-05
- S: 2 — Sıcak alkali sıvının göze püskürmesi kalıcı hasar yapabilir.   ← S/F/P: değer — gerekçe
  - en: …
- F: 2 — Kapak her yüklemede açılır; çevrim aralığı < 15 dk.
- P: 1 — Pompa sesi duyulur; kapak elle ve yavaş açılır.

### Giriş · Kat. 3
- bileşen: B1 — SICK i14 Lock, çift kanal … | … | …
- kategori: 3
- b10d: 2000000
- dc: 99
- not: G9SB-2 iki kanalı çapraz izler … [K4]
### Mantık · Kat. 4
- bileşen: K0b — Omron G9SB-2002-A …
- kategori: 4
- pl: e                              ← üretici PL'i (Tablo 7 yerine)
### Çıkış · Kat. 1
- bileşen: K1 — pompa kontaktörü …
- kategori: 1
- b10d: 1300000
- nop: 21120                        ← isteğe bağlı (yoksa profil)   · mttfd: 50 · pl sınırı: d

## Notlar
- [uyarı] **Elektrik şeması ile doğrulama:** … (sarı not)
- [bilgi] … (gri not)
```

### `# CCF`
`| No | Puan | Uygulandı | Önlem | Kanıt |` — No 1, 2, 3.1, 3.2, 4, 5, 6.1, 6.2 (EN ISO 13849-1 Ek F). Önlem boşsa kütüphaneden. Uygulandı: `evet` / `hayır`.

### `# Sistematik`
Paragraf (yazılmazsa varsayılan "röle mantığı, yazılım yok" metni).

### `# Validasyon`
```markdown
## V-01 · SF-01
- adım: Çevrimin her fazında kapağı aç | Open the lid in every phase of the cycle | Deckel in jeder Zyklusphase öffnen
- beklenen: Tehlikeli hareket ve püskürme anında durur | … | …
- sonuç: U                         ← U (uygun) | UD (uygun değil) | boş
- tarih: 16.10.2026
- not: … (isteğe bağlı)
```

### `# Elektrik Testleri` (EN 60204-1 Bölüm 18)
```markdown
- tarih: 16.10.2026
- saat: 15:43 – 16:23
- yer: Üretim atölyesi | Production workshop | Fertigungshalle
- cihaz: Sonel PAT-820 elektriksel güvenlik test cihazı
- seri no: … · kalibrasyon: …
- bağlantı: Makine fişi test cihazına bağlı; ölçümler prob–prob yöntemiyle yapılmıştır (Ek B) | … | …
- test eden: Fatih GÜRAL
- yöntem: … (EN/DE alt maddeyle)
- R_PE: 0,2 A · 5 s · ≤ 0,10 Ω       ← test akımı · süre · sınır
- R_ISO: 500 V DC · 10 s · ≥ 1,00 MΩ
- HV: 1500 V AC · 5 s · ≤ 1,50 mA

## Koruma iletkeni sürekliliği (R_PE)
| No | Saat | Değer | Nokta | Fotoğraf |
| 1 | 15:43:14 | 0,06 | Besleme fişinin PE kontağı → Nokta 1: … | olcum/PE 1.jpg |

## Yalıtım direnci (R_ISO)
| Çift | Saat | Değer | Nokta | Fotoğraf |
| L1-L2 | 16:14:29 | >599,9 | L1 – L2 arası (faz – faz) | olcum/L1-L2 ISO.jpg |

## Gerilim dayanım (HV)
| Çift | Saat | U | Değer | Nokta | Fotoğraf |
| L1-L2 | 16:20:30 | 1582 | 0,50 | L1 – L2 arası | olcum/L1-L2 FLASH.jpg |
```
Fotoğraf sütunu boşsa klasördeki adlandırma kuralına uyan dosya kendiliğinden bağlanır (aşağıda).

### `# Gürültü`
```markdown
- tarih: 16.10.2026
- cihaz: UNI-T UT353 ses seviye ölçer
- yöntem: Makinenin ön, yan ve arka yüzlerinden 1,5 m … (EN ISO 11202 esas alınmıştır) | … | …
- çalışma durumu: Yıkama çevrimi; pompa, egzoz fanı ve püskürtme çalışır durumda | … | …
- arka plan: 45,0          ← dB(A), isteğe bağlı (satırda da verilebilir)
- belirsizlik: 2,5        ← K (dB), yoksa 2,5
- lwa: 84,0               ← ses gücü seviyesi (operatör konumu > 80 dB(A) ise gerekir)
- operatör konumu: 1, 2, 3   ← beyan için esas alınan satırlar (yoksa tüm satırlar)
- test eden: Fatih GÜRAL

| No | Konum | Mesafe | LpA | LCpeak | Arka plan | Fotoğraf |
| 1 | Ön yüz (kapak / operatör tarafı) | 1,5 m | 67,4 | | | gurultu/GURULTU 1.jpg |
| | en: Front (lid / operator side) | | | | | |
```

### `# Termografi` (EN ISO 13732-1)
```markdown
- tarih: 22.10.2026 · saat: … · yer: …
- cihaz: testo 860i · seri no: 64978753 · doğruluk: ±3 °C / ±3 %
- test eden: Fatih GÜRAL
- sınır: 65 °C — EN ISO 13732-1, çıplak metal, 1 s temas (yetişkin)
  - en: EN ISO 13732-1, bare metal, 1 s contact (adults)
- durum: Makine çalışma sıcaklığında … (EN/DE)
- yöntem: 304 sacda naylon kaplama … (EN/DE; raporda sarı not)
- sonuç: … (EN/DE)

## D-1 · Arka yüz
- dosya: termal/2026-10-22-10-46-59.bmt
- başlık: Arka yüz | Rear side | Rückseite
- yorum: … (EN/DE)
- ölçek: 20–70            ← isteğe bağlı renk ölçeği (yoksa otomatik)
- kırp: 0,06 0 0,74 0,74   ← isteğe bağlı: gerçek görüntüde x y w h oranları

| İşaret | Tür | x | y | w | h | Çıplak | Etiket |
| A1 | alan | 72 | 48 | 46 | 70 | | Naylon kaplı arka sac — sol bölge |
| M1 | nokta | 139 | 11 | | | | Egzoz fanı gövdesi |
| M2 | nokta | 45 | 100 | | | evet | Çıplak 304 sac (kaplamasız) |   ← çıplak: değerlendirmeye girmez
| HS | sıcak | | | | | | Naylon kaplı arka sac |
```
x, y, w, h: termal görüntü pikseli (testo 860i: 192 × 256). İşaret adları sırayla verilir (M1…, A1…, HS, CS); İşaret sütunu yalnız okumak içindir. `## D-x` yazılmazsa `termal/` klasöründeki her `.bmt` en sıcak nokta (HS) işaretçisiyle eklenir. Koordinatları bulmak için: `node app/araclar/termal-incele.mjs <termal klasörü> --cikti <klasör>`.

### `# Sonuç`
Paragraf (EN/DE ile). Yazılmazsa kurallara göre hazır sonuç cümlesi kullanılır.

### `# Aksiyonlar` · `# İşaretler`
```markdown
| No | Aksiyon | Ref | Sorumlu | Termin | Durum |       ← Durum: açık | kapandı | uygulanmayacak
| A-01 | Çapak / keskin kenar son kontrolü | H-10 | Kalite | Sevkiyat öncesi | açık |

| Kod | Anlam | Konum |                                  ← Anlam boşsa ISO 7010 kütüphanesinden
| W017 | Sıcak yüzey | Yan ve arka tank sacları |
```

### `# Notlar`
Rapora girmez; çalışma notları, veri kaynakları için.

---

## Klasörler ve dosya adları

```
projects/<no>-<MÜŞTERİ>-<MODEL>/        models/<AİLE>/<MODEL>/              (şablon, tur: model)
  00-proje.md … 07-sonuc.md               00-model.md … 07-sonuc.md, foto/
  foto/      genel, panel, detay          raporlar/<no>-<MÜŞTERİ>/          (birim, tur: birim)
  kurulum/   test kurulumu (Ek B)            rapor.md  (ölçümler, validasyon sonuçları)
  olcum/     ölçüm ekranları (Ek C)           olcum/ gurultu/ termal/ kurulum/ cikti/
                                              sablon/  (yayında dondurulan şablon kopyası)
  gurultu/   ses seviye ölçer ekranları
  termal/    testo .bmt
  kaynak/    şema, kılavuz, yerleşim (rapora girmez)
  cikti/     PDF çıktıları
```

Ölçüm fotoğrafı adlandırma kuralı (satıra kendiliğinden bağlanır):

| Dosya adı | Bağlandığı satır |
|---|---|
| `PE 1.jpg` … `PE 5.jpg` | R<sub>PE</sub> ölçüm noktası 1–5 |
| `L1-L2 ISO.jpg`, `N-PE ISO.jpg` … | yalıtım direnci, iletken çifti |
| `L1-L2 FLASH.jpg` (veya `HV`) … | gerilim dayanım, iletken çifti |
| `GURULTU 1.jpg` … | gürültü ölçüm noktası 1 … |
| `*.bmt` (termal/) | termografi görüntüsü |
| `kurulum/*.jpg` | Ek B test kurulumu |
