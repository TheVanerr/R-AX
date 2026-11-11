# R&AX — Risk Analizi

Makine risk değerlendirme raporları (EN ISO 12100, EN ISO 13849-1/-2, EN 60204-1, gürültü, termografi). Raporlar md dosyalarında durur; uygulama onları okur, kurallarla değerlendirir, A4 rapor olarak gösterir ve doğrudan PDF üretir.

## Açmak

Ana klasördeki **Risk Analizi** kısayoluna çift tıklayın (kırmızı RA simgesi). Uygulama Edge'in uygulama penceresinde açılır. Kısayol çalışmazsa (klasör taşındıysa) `app\kisayol-olustur.cmd` dosyasını çalıştırın ya da `app\index.html` dosyasını Chrome / Edge ile açın.

## Veritabanı: GitHub deposu `riskanalizix-veri`

Projeler ve modeller özel (Private) GitHub deposu **TheVanerr/riskanalizix-veri** içinde durur (P&PX'teki `ppx-veri` ile aynı yöntem). Uygulama depoya doğrudan bağlanır; her bilgisayardan erişilir, her kayıt bir commit olarak geçmişte kalır. Bir kez bağlanmak için:

1. **Depo gizli olmalı.** [Depo ayarları](https://github.com/TheVanerr/riskanalizix-veri/settings) → General → en altta *Change repository visibility* → **Private**. Herkese açık depoya uygulama bağlanmaz, Claude da veri göndermez.
2. **Erişim anahtarı oluşturun:** [bu bağlantı](https://github.com/settings/personal-access-tokens/new?name=Risk%20Analizi%20veri&description=riskanalizix-veri%20deposu&contents=write&expires_in=365) ad ve izni (Contents: Read and write) hazır açar. *Repository access* → **Only select repositories** → `riskanalizix-veri` seçin → **Generate token**.
3. Uygulamanın ilk ekranında **Depo** `TheVanerr/riskanalizix-veri` iken anahtarı yapıştırıp **GitHub'a bağlan** deyin. Anahtar yalnız bu tarayıcıda saklanır; başka bilgisayarda bu adımı tekrarlayın.

Ana ekrandaki bağlantı düğmesi (sağ üstte `GitHub: …`) bağlantıyı değiştirir. Alternatif olarak **Bu bilgisayardaki klasörü kullan** ile `R&AX` klasörü seçilebilir (çevrimdışı çalışma); bu modda yapılan değişiklikleri depoya Claude gönderir.

Uygulama depodaki değişiklikleri 15 saniyede bir denetler: Claude'un gönderdiği düzeltme açık rapora kendiliğinden gelir. Ölçümler penceresinde kaydedilenler doğrudan depoya commit olarak gider.

## Kullanmak

1. **Model / proje seçin.** Üstteki kutuya yazın (`KBN`, `0326066`, `LYM` …) veya listeden seçin. Kartlara tıklayarak da açılır.
2. **Raporu inceleyin.** Solda içindekiler, ortada A4 sayfalar, sağda özet (riskler, PL, ölçümler) ve **Kontrol** listesi. TR / EN / DE düğmeleri rapor dilini değiştirir.
3. **PDF İndir.** Diller seçilir; PDF doğrudan İndirilenler'e iner ve belgenin `cikti/` klasörüne de kaydedilir. Yazdırma penceresi açılmaz, sayfalar vektördür, metin aranabilir.
4. **Kapak** düğmesiyle üç tasarımdan biri seçilir (Kırmızı Bant, Üst Bant, Köşe Blok).

md dosyaları değiştiğinde açık rapor birkaç saniye içinde kendiliğinden yenilenir.

## Projeler ve modeller

| Klasör | İçerik | Kim yazar |
|---|---|---|
| `projects/<no>-<MÜŞTERİ>-<MODEL>/` | Projeye özel makinenin tam risk analizi (ör. 0326066) | Claude, verdiğiniz verilerle |
| `models/<AİLE>/<MODEL>/` | Standart modelin şablonu (ör. KBN 1B, LYM 1) | Claude, bir kez |
| `models/<AİLE>/<MODEL>/raporlar/<no>-<MÜŞTERİ>/` | Standart modelden üretilen her makinenin raporu | Uygulama (Ölçümler penceresi) |

**Projede:** Claude'a LVD ölçümlerini (R<sub>PE</sub>, yalıtım, gerilim dayanım), gürültü ve termal ölçümleri, fotoğrafları, elektrik şemasını ve makine bilgisini verin; md dosyalarını Claude yazar, rapor uygulamada hazır olur. Değişiklik için Claude'a söylemeniz yeterli.

**Standart modelde:** model şablonunu bir kez Claude yazar; her makine için ayrı bir makine raporu açılır.

1. Modeli açın → **+ Yeni makine raporu** (iş no, müşteri).
2. **Ölçümler** penceresinde LVD, gürültü ve termal değerlerini girin. Her satırın **Foto** kutusuna tıklayıp o ölçümün fotoğrafını seçin; dosya doğru adla kaydedilir (`PE 1.jpg`, `L1-L2 ISO.jpg` …) ve büyük fotoğraflar 1600 piksele küçültülür. Termografide **+ testo .bmt dosyası ekle**.
3. **Kaydet**. Rapor kurallarla kendiliğinden oluşur: ölçüm sonuçları ilgili tehlikelere yazılır, uygunsuzluklara aksiyon ve işaret eklenir.
4. Rapor bitince üst şeritteki **Yayınla**. Rapor o günkü şablonla dondurulur.

Şablon sonradan değişirse (Claude'a söyleyip güncelletirsiniz, şablon revizyonu artar) taslak makine raporları kendiliğinden güncellenir; yayınlanmış raporlar değişmez. Yayınlanmış bir raporu güncel şablona taşımak için **Güncel şablonla yeni revizyon aç**.

LVD (EN 60204-1 §18) ve termal ölçümler her makinede yapılır. Gürültü beyanı aynı tipteki temsilî makinenin ölçümüne dayanabilir (2006/42/AT Ek I 1.7.4.2 u); yine de her raporda değer girilir. Şablonu henüz yazılmamış modeller (LYM, VDL, ULT …) için model bilgilerini Claude'a verin.

Ölçüm fotoğrafı adları: `PE 1.jpg` … (R<sub>PE</sub>), `L1-L2 ISO.jpg` (yalıtım), `L1-L2 FLASH.jpg` (gerilim dayanım), `GURULTU 1.jpg` (gürültü), testo `*.bmt` (termal). Diğer fotoğraflar test kurulumu (Ek B) sayılır.

**Yakınlaştırma:** rapor alanının sağ alt köşesindeki çubuk: − / oran / + (oran düğmesinde %50–400 hazır oranlar), genişliğe sığdır, sayfaya sığdır. **Ctrl + fare tekerleği** (dokunmatik yüzeyde iki parmak) imlecin altındaki yere doğru yaklaştırır; **Ctrl +**, **Ctrl −**, **Ctrl 0** (genişliğe sığdır) da çalışır. Aralık %25–400; büyütülen sayfa yatay kaydırılır.

**Rapor silme:** raporu açın → soldaki **Dosyalar** sekmesi → en altta **Tehlikeli bölge** → **Raporu sil…**. Model sayfasındaysanız aynı sekmedeki **Makine raporları** listesinde her raporun yanında **Sil…** vardır. GitHub'daki depo silme gibi, düğme ancak raporun tam adı harfi harfine yazılınca açılır: `TheVanerr/<klasör adı>` (ör. `TheVanerr/0426998-DENEME LTD`). Proje ve makine raporu silinebilir; model şablonu uygulamadan silinmez. GitHub modunda silme bir commit olarak gider, dosyalar depo geçmişinde kalır (gerekirse Claude geri getirir).

**Kapak bilgileri:** raporun üstündeki çubukta rapor no, rev, tarih, hazırlayan, kontrol eden, onaylayan ve (projede) durum değiştirilir. Yazarken kapak ve her sayfanın anteti hemen değişir. Alandan çıkınca (Enter / Tab) kayıt yapılır, Esc yazılanı geri alır.

- **Yeni rev:** değişiklik açıklaması sorulur, Doküman kontrol sayfasındaki revizyon tablosuna satır eklenir.
- **Yeni kişi:** daha önce hiçbir raporda geçmeyen bir kişi için kapakta adın altına yazılacak unvan sorulur.
- **Yayınlanmış rapor:** rev artırmadan yapılan değişiklik önce onay ister. Yayınlanmış makine raporunda yeni rev, "güncel şablonla yeni revizyon" olarak açılır.

## Belgeler

- [app/MD-SEMASI.md](app/MD-SEMASI.md) — md dosya yapısı
- [app/KURALLAR.md](app/KURALLAR.md) — ölçüm kuralları ve sınır değerler
- [app/README.md](app/README.md) — uygulamanın yapısı ve araçlar
- `_eski/` — önceki uygulama (`Risk_Analizi_Uygulamasi.html`) ve eski model şablonları
