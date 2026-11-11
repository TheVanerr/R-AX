# Kural motoru

Rapor her açılışta ve md dosyaları her değiştiğinde aynı sırayla kurulur: **md → veri modeli → kurallar → A4 sayfalar → PDF**. Kurallar [`js/rules.js`](js/rules.js), hesaplar [`js/calc.js`](js/calc.js), sınır değer tabloları [`js/library.js`](js/library.js) (en altta) içindedir. Aynı kod komut satırında da çalışır: `node app/araclar/kontrol.mjs "<klasör>"`.

## 1. Risk tahmini (EN ISO 12100)

R = O × Ş (5 × 5). **1–6 düşük** (kabul edilebilir) · **8–12 orta** (ALARP: ek önlem değerlendirilir, kabul gerekçelendirilir) · **15–25 yüksek** (kabul edilemez). Hedef: tüm artık riskler R ≤ 8, kontrol sistemine dayalı önlemlerde PL ≥ PL<sub>r</sub>. Önlem sırası üç adımlı yöntemdir: doğası gereği güvenli tasarım → koruyucu / güvenlik fonksiyonu → kullanım bilgisi.

## 2. Güvenlik fonksiyonları (EN ISO 13849-1)

| Adım | Kural |
|---|---|
| PL<sub>r</sub> | Ek A risk grafiği: S1/S2 → F1/F2 → P1/P2 → a…e |
| n<sub>op</sub> | d<sub>op</sub> · h<sub>op</sub> · 60 / t<sub>çevrim</sub> (dk) |
| MTTF<sub>D</sub> | B<sub>10D</sub> / (0,1 · n<sub>op</sub>); üst sınır Kat. 2–3 için 100 yıl, Kat. 4 için 2500 yıl; T<sub>10D</sub> = B<sub>10D</sub> / n<sub>op</sub> < 20 yıl → değişim uyarısı |
| Sınıflar | MTTF<sub>D</sub> düşük 3–10 · orta 10–30 · yüksek ≥ 30 yıl; DC yok < 60 · düşük 60–90 · orta 90–99 · yüksek ≥ 99 % |
| Alt sistem PL | Tablo 7 (basitleştirilmiş yöntem); üretici PL'i (`pl:`) varsa o; `pl sınırı:` ile sınırlanır |
| Birleşim | §6.1.9 PL<sub>low</sub> kuralı |
| CCF | Kat. 2–4 alt sistem varsa toplam ≥ 65 puan |
| Sonuç | PL ≥ PL<sub>r</sub> → uygun; değilse Kontrol listesinde **hata** ve sonuç cümlesi "kabul edilebilir sayılmaz" |

## 3. Elektrik — EN 60204-1 Bölüm 18 (LVD)

| Test | Varsayılan parametre | Ölçüt |
|---|---|---|
| Koruma iletkeni sürekliliği R<sub>PE</sub> (§18.2.2) | 0,2 A · 5 s | ≤ 0,10 Ω |
| Yalıtım direnci R<sub>ISO</sub> (§18.3) | 500 V DC · 10 s | ≥ 1,00 MΩ |
| Gerilim dayanım HV (§18.4) | 1500 V AC · 5 s | kaçak akım ≤ 1,50 mA, delinme yok |

Parametreler md'de `R_PE:`, `R_ISO:`, `HV:` alanlarıyla değiştirilir. `>599,9` gibi değerler "üzerinde" olarak okunur.

## 4. Gürültü — 2006/42/AT Ek I 1.7.4.2 (u), 2003/10/AT, EN ISO 11202

1. **Arka plan düzeltmesi:** ΔL = L<sub>pA</sub> − arka plan. ΔL ≥ 10 dB → düzeltme yok; 3 ≤ ΔL < 10 dB → K<sub>1</sub> = −10·lg(1 − 10<sup>−0,1·ΔL</sup>) çıkarılır; ΔL < 3 dB → ölçüm geçersiz (hata).
2. **Beyan değeri:** `operatör konumu:` satırlarının (yoksa tüm satırların) en yüksek düzeltilmiş değeri.

| Operatör konumu L<sub>pA</sub> | Sınıf | Rapora yazılan |
|---|---|---|
| ≤ 70 dB(A) | decl70 | [B] "L<sub>pA</sub> ≤ 70 dB(A)" beyanı |
| 70 – 80 | declare | [B] değer ve K beyanı; kulak koruyucu zorunlu değil |
| 80 – 85 | lower | [B] beyan + kulak koruyucu önerisi, **M003**; L<sub>WA</sub> yoksa [Ö] ölçüm + aksiyon |
| 85 – 87 | upper | [B] beyan + kulak koruyucu zorunlu, **M003**; L<sub>WA</sub> yoksa [Ö] + aksiyon |
| ≥ 87 | limit | [Ö] kaynakta gürültü azaltma + aksiyon, **M003**; sonuç UYGUN DEĞİL |

L<sub>pCpeak</sub> > 130 dB(C) → tepe değer beyanı. Belirsizlik K yazılmazsa 2,5 dB.

## 5. Termal — EN ISO 13732-1 (çıplak metal)

Değerlendirilen değer: tüm görüntülerde **çıplak sac işaretli olmayan** işaretçilerin en yüksek değeri (nokta → piksel, alan → maks., HS → görüntünün maks.).

| Eşik (çıplak metal) | 1 s | 4 s | 10 s | 1 dk | 10 dk | 8 sa |
|---|---|---|---|---|---|---|
| Yanık eşiği °C | 65–70 | ≈ 58–63 | ≈ 55–59 | 51 | 48 | 43 |

| En yüksek değer | Sınıf | Rapora yazılan |
|---|---|---|
| ≤ 55 °C (10 s eşiği) | cool | [M] ölçüm satırı "10 s eşiğinin altında" |
| 55 – sınır (65 °C) | warm | [M] ölçüm satırı + [B] **W017** etiketi ve kılavuz uyarısı |
| > sınır | hot | [Ö] yalıtım / koruyucu + aksiyon, **W017**; sonuç UYGUN DEĞİL |

Sınır md'de `sınır: 65 °C — açıklama` ile değiştirilir.

## 6. Ölçüme bağlı tehlikeler

Tehlikede `ölçüm: elektrik | gürültü | termal` yazılırsa:

- Ölçüm sonucu, önlem sütununa **otomatik satır** olarak eklenir (Türkçe, İngilizce, Almanca; tamamlanmış anlatımla: "yapılmıştır", "beyan edilmiştir", "uygulanmıştır").
- Uygunsuz sonuçta [Ö] önlem, aksiyon listesine aksiyon (Kalite · Sevkiyat öncesi) ve gerekli işaret (W017, M003) eklenir.
- `risk:` yazılmamışsa O/Ş ölçüm sınıfından alınır:

| Ölçüm | Sonuç | Önce → sonra |
|---|---|---|
| elektrik | uygun / uygunsuz / yok | O2 Ş5 → O1 Ş5 · O3 Ş5 → O3 Ş5 · O2 Ş5 → O2 Ş5 |
| gürültü | decl70 · declare · lower · upper · limit · yok | O2Ş2→O1Ş2 · O3Ş2→O2Ş2 · O3Ş3→O2Ş2 · O4Ş3→O2Ş3 · O4Ş4→O3Ş3 · O3Ş2→O3Ş2 |
| termal | cool · warm · hot · yok | O2Ş2→O1Ş2 · O3Ş2→O2Ş2 · O3Ş3→O3Ş3 · O3Ş2→O3Ş2 |

Model şablonlarında ölçüme bağlı tehlikelerde ölçülen değer yazılmaz; değerler her makinenin birim raporundan gelir.

## 7. Kontrol listesi

Uygulamanın sağ panelinde ve `kontrol.mjs` çıktısında: ✗ hata · ! uyarı · · bilgi.

- İş no / müşteri / model eksik; tanınmayan veya iki kez yazılmış bölüm
- Tehlikede tür, durum, risk veya önlem eksik; olmayan noktaya / aksiyona bağlantı; numara tekrarı veya sırasızlık
- SF'de olmayan tehlike, alt sistem yok, S/F/P gerekçesi eksik, **PL < PL<sub>r</sub>**, CCF < 65, T<sub>10D</sub> < 20 yıl
- Validasyon referansı yok / uygun değil sonucu
- **Artık risk** orta (uyarı) veya yüksek (hata)
- Elektrik değeri eksik / ölçüt dışı; gürültü geçersiz, L<sub>WA</sub> gerekli, sınır değer aşımı; termal sınır aşımı, okunamayan .bmt
- Bulunamayan fotoğraf / termal dosya
- EN ISO 12100 Tablo B.1 grubunda tehlike yok ve `## Uygulanamaz` gerekçesi yok
- Ön bilgide seçili dillerde **eksik çeviri**
