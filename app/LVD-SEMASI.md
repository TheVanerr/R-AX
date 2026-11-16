# LVD test raporu md şeması

Bir LVD (elektriksel güvenlik) test raporu = `lvd/<iş no>-<MÜŞTERİ>-<MODEL>/lvd.md` ve yanındaki fotoğraf klasörleri. Rapor **EN 60204-1:2018 Bölüm 18** (Doğrulama) yapısıyla kurulur; 2014/35/AB güvenlik hedefleri makinelerde 2006/42/AT Ek I 1.5.1 üzerinden uygulanır.

LVD raporları risk analizinden **ayrı** durur: risk analizi kodu ve `projects/`, `models/` dosyaları değişmez. Rapor bir risk analizine bağlanabilir (`risk analizi:`); bağlıysa uygulamadaki **Risk analizinden aktar** makine bilgilerini, elektrik ölçümlerini ve fotoğrafları LVD klasörüne **kopyalar** (yalnız boş alanlar doldurulur).

Uygulamada: ana ekranda **LVD Testleri** sekmesi, risk analizi açıkken üst çubukta **LVD** düğmesi. Kontrol: `node app/araclar/lvd-kontrol.mjs "lvd/<klasör>"`.

## Klasör

```
lvd/0326066-KSYSTE-KBN 1B 1500/
  lvd.md        rapor verisi (uygulamanın veri penceresi yazar; elle de düzenlenebilir)
  olcum/        ölçüm ekranı fotoğrafları (Ek A) — ad kuralıyla satırlara bağlanır
  foto/         genel görünüm (kapak), makine etiketi, pano, gözle kontrol kanıtları (Ek B)
  kurulum/      test kurulumu fotoğrafları (Ek B, önce gelir)
  cikti/        PDF çıktıları
```

## Ön bilgi

```markdown
---
tur: lvd
no: 0326066                         # iş no
musteri: KSYSTEMS
model: KBN 1B 1500
makine seri no: 0326066             # yoksa iş no
yil: 2026
marka: DOLFIN                       # antet ve kapak: DOLFIN | ENVA | VICO | KSYSTEM
uretici: CNK Elektronik Makine San. A.Ş.
marka adi: Dolfin®
dokuman: LVD-0326066-01
rev: 00
tarih: 16.10.2026                   # rapor tarihi
durum: taslak                       # taslak | yayın
diller: tr, en, de
hazirlayan: Fatih GÜRAL
hazirlayan unvan: Kalite Kontrol Sorumlusu | Quality Control Officer | Qualitätskontrollverantwortlicher
kontrol: …  ·  kontrol unvan: …  ·  onay: …  ·  onay unvan: …
hazirlayan logo: atlascert
risk analizi: projects/0326066-KSYSTE-KBN 1B 1500     # bağlı risk analizi (yalnız okunur)
risk analizi no: RA-0326066-01 Rev. 00               # raporda atıf
---
```

Çok dilli yazım risk analiziyle aynıdır (bkz. [MD-SEMASI.md](MD-SEMASI.md)): kısa metin `TR | EN | DE`, uzun metin `- en:` / `- de:` alt maddeleri, tablolarda `en:` / `de:` devam satırları.

## Bölümler

### `# Makine`
```markdown
- makine tipi: Endüstriyel parça yıkama makinesi | Industrial parts washing machine | Industrielle Teilereinigungsanlage
- besleme: 3/N/PE AC 400 V 50 Hz
- anma akımı: 25 A
- kurulu güç: 11 kW
- şebeke: TN-S
- ön koruma: 32 A gG
- kısa devre dayanımı: 6 kA
- koruma sınıfı: I
- ip: IP54
- bağlantı: CEE 32 A 5 kutuplu fiş | CEE 32 A 5-pin plug | CEE-Stecker 32 A 5-polig
```
Paragraf yazılırsa makine tanımı olarak rapora girer.

### `# Test Koşulları`
```markdown
- tarih: 16.10.2026
- saat: 15:43 – 16:23
- yer: Üretim atölyesi | Production workshop | Fertigungshalle
- ortam: 22 °C · %45 bağıl nem
- test eden: Fatih GÜRAL
- bağlantı: … (TR | EN | DE)
- yöntem: … (uzunsa - en: / - de: alt maddeleri; raporda not)
- R_PE: 0,2 A · 5 s · ≤ 0,10 Ω            ← test akımı · süre · sınır
- R_ISO: 500 V DC · 10 s · ≥ 1,00 MΩ
- HV: 1500 V AC · 5 s · ≤ 1,50 mA          ← delinme yok; test cihazının kaçak akım sınırı
- kaçak akım: ≤ 10 mA                      ← §8.2.6 eşiği (koruma iletkeni akımı)
- artık gerilim: ≤ 60 V · 5 s              ← §18.5 (fiş uçlarında 1 s)
- U0: 230 V                                ← Test 2 için faz–nötr gerilimi
```
Sınırlar yazılmazsa varsayılanlar kullanılır (risk analizindeki elektrik testleriyle aynı).

### `# Test Cihazları`
```markdown
| Cihaz | Marka / model | Seri no | Kalibrasyon | Geçerlilik |
|---|---|---|---|---|
| Elektriksel güvenlik test cihazı | Sonel PAT-820 | A12345 | 10.03.2026 | 10.03.2027 |
| en: Electrical safety tester | | | | |
```
Geçerlilik test tarihinden önce bitmişse kontrol listesinde **hata**.

### `# Gözle Kontrol` (§18.1 a)
```markdown
| No | Sonuç | Not | Foto |
|---|---|---|---|
| G-01 | U | Etiket kapak arkasında | foto/G-01.jpg |
| G-15 | UY | Koruma iletkeni akımı 1,2 mA | |
```
Sonuç: `U` uygun · `UD` uygun değil · `UY` uygulanamaz · boş (kontrol edilmedi). Madde metinleri ve madde numaraları [js/lvd-lib.js](js/lvd-lib.js) içindedir (G-01 … G-25: dokümantasyon ve işaretleme, besleme ve ayırma, elektrik çarpmasına karşı koruma, koruyucu bağlama devresi, donanımın korunması, kumanda ve acil durdurma, kablolama). Ek madde için `Kontrol` ve `Madde` sütunları yazılır.

### `# Ölçümler`
Her test bir alt başlıktır; `- durum:` yazılabilir: `kurulum yerinde` · `uygulanamaz` · `yapılmadı` (boş: değerler girildikçe değerlendirilir). `- not:` tablonun altında çıkar.
```markdown
## Koruyucu bağlama devresinin sürekliliği (R_PE)          ← §18.2.2 Test 1
| No | Saat | Değer | Nokta | Fotoğraf |
| 1 | 15:43:14 | 0,06 | PE kontağı → Nokta 1: … (B-1) | olcum/PE 1.jpg |

## Hata döngüsü empedansı (Test 2)                          ← §18.2.3
- durum: kurulum yerinde
| No | Saat | Devre | Koruma | Zs | Zs max | Fotoğraf |
| 1 | | L1 – PE, ana şalter çıkışı | C25 | 0,48 | | olcum/ZS 1.jpg |     ← Zs max boşsa U0 / Ia (B 5·In, C 10·In, D 20·In)

## Yalıtım direnci (R_ISO)                                   ← §18.3
| Çift | Saat | Değer | Nokta | Fotoğraf |
| L1-PE | 16:14:55 | >599,9 | L1 – PE arası (faz – koruma iletkeni (PE)) | olcum/L1-PE ISO.jpg |

## Gerilim testi (HV)                                        ← §18.4
| Çift | Saat | U | Değer | Nokta | Fotoğraf |
| L1-PE | 16:20:57 | 1585 | 0,45 | … | olcum/L1-PE FLASH.jpg |

## Artık gerilim                                            ← §18.5
| No | Saat | Süre | Değer | Nokta | Fotoğraf |
| 1 | | 1 | 18 | Fiş uçları — fiş çekildikten sonra | olcum/ARTIK 1.jpg |

## Koruma iletkeni akımı (kaçak akım)                       ← §8.2.6
| No | Saat | Değer | Nokta | Fotoğraf |
| 1 | | 1,2 | Makine çalışır durumda, tüm yükler devrede | olcum/KACAK 1.jpg |
```
Değer biçimi: `0,06`, `>599,9`. Koruma iletkeni akımı 10 mA'i aşarsa sonuç "koşullu" olur; G-15 `U` ise (önlemler uygulanmış) uygun sayılır.

### `# Fonksiyon Testleri` (§18.6)
```markdown
| No | Ref | Test | Beklenen | Sonuç | Tarih | Not |
| F-01 | | | | U | 16.10.2026 | |                         ← F-01 … F-07: metin kütüphaneden (Test / Beklenen boşsa)
| F-08 | | Pompa termik açması | Pompa durmalı, uyarı yanmalı | U | 16.10.2026 | |
```
Güvenlik fonksiyonlarının validasyonu (EN ISO 13849-2) risk analizinde kalır; bağlı raporda ona atıf yapılır.

### `# Fotoğraflar`
```markdown
| Dosya | Tür | Açıklama |
| foto/genel-gorunum.jpg | kapak | Genel görünüm |
| foto/ETIKET.jpg | etiket | Makine etiketi |
| foto/kontrol-paneli.jpg | pano | Kontrol paneli |
| kurulum/kurulum-01.jpg | kurulum | R_PE ölçüm noktası 1 … |
```
Tür: `kapak` · `etiket` · `pano` · `kurulum` · `genel`. Ek B sırası: kurulum, kapak, etiket, pano, genel, gözle kontrol kanıtları.

### `# Sonuç` · `# Revizyonlar`
Sonuç paragrafı yazılmazsa kurallara göre hazır cümle kullanılır. Revizyon tablosu risk analiziyle aynıdır (`| Rev | Tarih | Açıklama | Hazırlayan | Onaylayan |`); güncel revizyonun satırı ön bilgiden gelir. Tanınmayan bölümler (`# Notlar` vb.) dosyada olduğu gibi korunur, rapora girmez.

## Fotoğraf ad kuralı

Fotoğraflar uygulamada **Veriler ve fotoğraflar → Fotoğraflar** sekmesine toplu bırakılır; ada göre bağlanır. Ölçüm saati boşsa fotoğrafın çekilme saatinden (EXIF), test tarihi boşsa çekilme tarihinden doldurulur. Kurala uymayan adlar (ör. `IMG_1234.jpg`) genel fotoğraf olur ve listeden bir teste atanır (dosya `olcum/` altına kural adıyla taşınır).

| Dosya adı | Bağlandığı yer |
|---|---|
| `PE 1.jpg` … | R<sub>PE</sub> satırı 1 … |
| `L1-PE ISO.jpg`, `N-PE ISO.jpg` … | yalıtım direnci, iletken çifti |
| `L1-PE FLASH.jpg` (veya `HV`) … | gerilim testi, iletken çifti |
| `KACAK 1.jpg` (`LEAK`, `IPE`) | koruma iletkeni akımı |
| `ARTIK 1.jpg` (`RESIDUAL`) | artık gerilim |
| `ZS 1.jpg` (`LOOP`, `DONGU`) | hata döngüsü empedansı (Test 2) |
| `ETIKET.jpg` · `PANO.jpg` · `GENEL.jpg` · `KURULUM*.jpg` | etiket · pano · kapak · test kurulumu |

## Değerlendirme

| Durum | Anlamı |
|---|---|
| uygun | değerler girilmiş, hepsi kabul kriterinde |
| uygun değil | en az bir değer kriter dışında / gözle kontrol veya fonksiyon testinde UD |
| açık | eksik değer ya da zorunlu test (a, b, h) yapılmamış |
| yapılmadı | uygulanabilir test (c – g) bu revizyonda yapılmamış (sonucu engellemez) |
| kurulum yerinde | Test 2 (§18.2.3) makine nihai beslemeye bağlandıktan sonra yapılacak |
| koşullu | koruma iletkeni akımı > 10 mA (§8.2.6 önlemleri doğrulanmalı) |

Genel sonuç: herhangi bir **uygun değil** → UYGUN DEĞİL · zorunlu test eksik veya değer eksik → AÇIK · kurulum yerinde / koşullu → KOŞULLU · diğer → UYGUN.
