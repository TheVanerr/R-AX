/* LVD test raporu — standart yapısı ve rapor metinleri (TR / EN / DE).
   Dayanak: EN 60204-1:2018 Bölüm 18 (Doğrulama), 2014/35/AB güvenlik hedefleri (2006/42/AT Ek I 1.5.1).
   - TESTS: §18.1 test programı a–h (sıra standarttaki gibi; a, b, h zorunlu, c–g uygulanabilir olduğunda)
   - VISUAL: §18.1 a) gözle kontrol ve dokümantasyon doğrulaması maddeleri (madde numaralarıyla)
   - FUNC: §18.6 fonksiyon testleri için başlangıç listesi
   - LIMITS: varsayılan test parametreleri ve kabul kriterleri (risk analizindeki elektrik testleriyle aynı)
   - PHOTO_RULES: fotoğraf adından teste / satıra otomatik bağlama
   Risk analizi kodundan bağımsızdır; DOM'a bağlı değildir (Node'da da çalışır). */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.RA_LVD = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const L3 = (tr, en, de) => ({ tr, en, de });

  /* ─── Test programı (EN 60204-1 §18.1) ─────────────────────── */
  // mode: on = aktif test (makine enerjili) · off = pasif test (besleme kesik). extra: §18.1 a–h dışındaki ek test.
  const TESTS = [
    { key: 'visual', letter: 'a', clause: '§18.1 a', req: true, mode: 'off',
      name: L3('Elektrik donanımının teknik dokümantasyona uygunluğunun doğrulanması (gözle kontrol)', 'Verification that the electrical equipment complies with its technical documentation (visual inspection)', 'Prüfung der Übereinstimmung der elektrischen Ausrüstung mit der technischen Dokumentation (Sichtprüfung)') },
    { key: 'rpe', letter: 'b', clause: '§18.2.2', req: true, mode: 'off',
      name: L3('Koruyucu bağlama devresinin sürekliliği (Test 1)', 'Continuity of the protective bonding circuit (Test 1)', 'Durchgängigkeit des Schutzleitersystems (Prüfung 1)') },
    { key: 'vd', letter: 'b', clause: '§18.2.2 · §8.2.2', req: false, mode: 'off',
      name: L3('Koruyucu bağlama devresinde gerilim düşümü (yüksek test akımı)', 'Voltage drop in the protective bonding circuit (high test current)', 'Spannungsfall im Schutzleitersystem (hoher Prüfstrom)') },
    { key: 'loop', letter: 'c', clause: '§18.2.3', req: false, mode: 'on',
      name: L3('Otomatik kesme koşulları: hata döngüsü empedansı ve aşırı akım koruma cihazı (Test 2)', 'Conditions for automatic disconnection: fault loop impedance and overcurrent protective device (Test 2)', 'Bedingungen der automatischen Abschaltung: Fehlerschleifenimpedanz und Überstromschutzeinrichtung (Prüfung 2)') },
    { key: 'iso', letter: 'd', clause: '§18.3', req: false, mode: 'off',
      name: L3('Yalıtım direnci testi', 'Insulation resistance test', 'Isolationswiderstandsprüfung') },
    { key: 'hv', letter: 'e', clause: '§18.4', req: false, mode: 'off',
      name: L3('Gerilim testi (dielektrik dayanım, Hi-Pot)', 'Voltage test (dielectric strength, Hi-Pot)', 'Spannungsprüfung (Spannungsfestigkeit, Hi-Pot)') },
    { key: 'res', letter: 'f', clause: '§18.5', req: false, mode: 'on',
      name: L3('Artık gerilimlere karşı koruma', 'Protection against residual voltages', 'Schutz gegen Restspannungen') },
    { key: 'leak', letter: 'g', clause: '§8.2.6', req: false, mode: 'on',
      name: L3('Koruma iletkeni akımı (§8.2.6 gerekliliklerinin doğrulanması)', 'Protective conductor current (verification of the requirements of §8.2.6)', 'Schutzleiterstrom (Prüfung der Anforderungen nach §8.2.6)') },
    { key: 'func', letter: 'h', clause: '§18.6', req: true, mode: 'on',
      name: L3('Fonksiyon testleri', 'Functional tests', 'Funktionsprüfungen') },
    { key: 'pwr', letter: '+', clause: '§4.3.2 · §16.4', req: false, mode: 'on', extra: true,
      name: L3('Çalışma testi: besleme gerilimi, akım ve güç (aktif test)', 'Operating test: supply voltage, current and power (active test)', 'Betriebsprüfung: Versorgungsspannung, Strom und Leistung (aktive Prüfung)') }
  ];
  const MEAS = ['rpe', 'vd', 'loop', 'iso', 'hv', 'res', 'leak', 'pwr'];

  /**
   * Varsayılan test parametreleri ve kabul kriterleri. rpe/iso/hv risk analizindeki elektrik testleriyle aynıdır.
   * hvTol / isoTol: uygulanan test geriliminin toleransı (V) · uTol: çalışma testinde besleme gerilimi sapması (± %, EN 60204-1 §4.3.2)
   */
  const LIMITS = { rpeI: 0.2, rpeT: 5, rpeMax: 0.10, isoU: 500, isoT: 10, isoMin: 1.00, isoTol: 50, hvU: 1500, hvT: 5, hvMax: 1.50, hvTol: 100, leakMax: 10, resMax: 60, resT: 5, u0: 230, uTol: 10 };
  /** Anlık açma akımı katsayısı (I_a = k · I_n): B, C, D eğrisi */
  const TRIP_K = { B: 5, C: 10, D: 20, K: 14, Z: 3 };
  /**
   * Koruyucu bağlama devresinde en büyük gerilim düşümü, 10 A test akımı için (EN 60204-1:2006 Tablo 9):
   * koruma iletkeni kesiti (mm²) → ΔU (V). Kesit tablodaki değerler arasındaysa bir üst kesitin (daha sıkı) değeri alınır;
   * 1 mm²'den küçük kesit için sınır satırda yazılır.
   */
  const VD_TABLE = [[1.0, 3.3], [1.5, 2.6], [2.5, 1.9], [4.0, 1.4], [6.0, 1.0]];
  function vdLimit(cs, i) {
    const c = +String(cs || '').replace(',', '.').replace(/[^\d.]/g, '');
    if (!c || c < 1.0) return null;
    const row = VD_TABLE.find(([s]) => s >= c - 1e-9) || VD_TABLE[VD_TABLE.length - 1];
    const I = +String(i || '').replace(',', '.').replace(/[^\d.]/g, '');
    return +(row[1] * (I > 0 ? I / 10 : 1)).toFixed(3);
  }

  /* ─── Gözle kontrol (§18.1 a) ──────────────────────────────── */
  const GROUPS = {
    doc: L3('Dokümantasyon ve işaretleme', 'Documentation and marking', 'Dokumentation und Kennzeichnung'),
    supply: L3('Besleme ve ayırma', 'Supply and disconnection', 'Einspeisung und Trennung'),
    shock: L3('Elektrik çarpmasına karşı koruma', 'Protection against electric shock', 'Schutz gegen elektrischen Schlag'),
    pe: L3('Koruyucu bağlama devresi', 'Protective bonding circuit', 'Schutzleitersystem'),
    prot: L3('Donanımın korunması', 'Protection of equipment', 'Schutz der Ausrüstung'),
    ctrl: L3('Kumanda devreleri ve acil durdurma', 'Control circuits and emergency stop', 'Steuerstromkreise und Not-Halt'),
    wiring: L3('İletkenler, kablolar ve kablolama', 'Conductors, cables and wiring', 'Leiter, Kabel und Verdrahtung')
  };
  const VISUAL = [
    { id: 'G-01', g: 'doc', clause: '§16.4', text: L3(
      'Makine etiketinde üretici adı, CE işareti, tip / model, seri no, anma gerilimi, faz sayısı, frekans, tam yük akımı, kısa devre dayanım değeri ve ana doküman no belirtilmiştir.',
      'Supplier name, CE marking, type / model, serial number, rated voltage, number of phases, frequency, full-load current, short-circuit rating and main document number are stated on the nameplate.',
      'Name des Lieferanten, CE-Kennzeichnung, Typ / Modell, Seriennummer, Bemessungsspannung, Phasenzahl, Frequenz, Volllaststrom, Kurzschlussfestigkeit und Hauptdokumentnummer sind auf dem Typschild angegeben.') },
    { id: 'G-02', g: 'doc', clause: '§17 · §18.1 a', text: L3(
      'Elektrik devre şemaları ve teknik dokümantasyon makinedeki donanımla karşılaştırılmış ve uyumlu bulunmuştur.',
      'Circuit diagrams and technical documentation have been compared with the installed equipment and found to match.',
      'Stromlaufpläne und technische Dokumentation wurden mit der installierten Ausrüstung abgeglichen und stimmen überein.') },
    { id: 'G-03', g: 'doc', clause: '§16.2.1', text: L3(
      'Elektrik panosu kapağına elektrik çarpması uyarı işareti (ISO 7010 W012) uygulanmıştır.',
      'The electric shock warning sign (ISO 7010 W012) has been applied to the enclosure door.',
      'Das Warnzeichen „Warnung vor elektrischer Spannung“ (ISO 7010 W012) wurde an der Schaltschranktür angebracht.') },
    { id: 'G-04', g: 'doc', clause: '§16.5 · §13.2.1', text: L3(
      'Bileşenler ve iletkenler, devre şemalarındaki referans işaretleriyle tanıtılmıştır.',
      'Components and conductors have been identified with the reference designations used in the circuit diagrams.',
      'Betriebsmittel und Leiter wurden mit den Referenzkennzeichen der Stromlaufpläne gekennzeichnet.') },
    { id: 'G-05', g: 'doc', clause: '§17.2', text: L3(
      'Elektrik bağlantısı, ön koruma ve bakım bilgileri kullanım kılavuzunda belirtilmiştir.',
      'Electrical connection, upstream protection and maintenance information is stated in the instruction manual.',
      'Elektrischer Anschluss, Vorsicherung und Wartungshinweise sind in der Betriebsanleitung angegeben.') },
    { id: 'G-06', g: 'supply', clause: '§5.3.2 · §5.3.3', text: L3(
      'Uygun tipte bir besleme ayırma cihazı (ana şalter) kullanılmış; ana şalter KAPALI (O) konumunda kilitlenebilir yapılmıştır.',
      'A supply disconnecting device (main switch) of a suitable type has been provided; it can be locked in the OFF (O) position.',
      'Eine Netztrenneinrichtung (Hauptschalter) geeigneter Bauart wurde vorgesehen; sie ist in der AUS-Stellung (O) abschließbar.') },
    { id: 'G-07', g: 'supply', clause: '§5.3.4', text: L3(
      'Ana şalterin kolu kolay erişilebilir yüksekliğe (0,6 – 1,9 m) yerleştirilmiş ve I / O ile işaretlenmiştir.',
      'The operating handle of the main switch has been placed within easy reach (0.6 – 1.9 m) and marked I / O.',
      'Der Betätiger des Hauptschalters wurde leicht erreichbar (0,6 – 1,9 m) angeordnet und mit I / O gekennzeichnet.') },
    { id: 'G-08', g: 'supply', clause: '§5.1 · §5.2', text: L3(
      'Besleme bağlantı terminalleri işaretlenmiş; harici koruma iletkeni terminali "PE" ile tanıtılmıştır.',
      'The supply terminals have been marked; the terminal for the external protective conductor has been identified with "PE".',
      'Die Netzanschlussklemmen wurden gekennzeichnet; die Klemme für den äußeren Schutzleiter wurde mit „PE“ bezeichnet.') },
    { id: 'G-09', g: 'shock', clause: '§6.2.2', text: L3(
      'Gerilimli parçalar muhafaza içine alınmış; pano kapakları anahtar / aletle açılacak veya kilitlenecek şekilde yapılmıştır (iç koruma en az IPXXB).',
      'Live parts have been enclosed; enclosure doors open only with a key / tool or have been interlocked (internal protection at least IPXXB).',
      'Aktive Teile wurden umhüllt; Schaltschranktüren lassen sich nur mit Schlüssel / Werkzeug öffnen oder wurden verriegelt (innen mindestens IPXXB).') },
    { id: 'G-10', g: 'shock', clause: '§11.3 · §4.4', text: L3(
      'Elektrik panosu muhafazası en az IP22 koruma derecesinde ve kullanım ortamına (su / kimyasal sıçraması) uygun seçilmiştir.',
      'The enclosure provides at least IP22 and has been selected for the operating environment (water / chemical splashes).',
      'Das Gehäuse bietet mindestens IP22 und wurde für die Einsatzumgebung (Wasser- / Chemikalienspritzer) ausgewählt.') },
    { id: 'G-11', g: 'shock', clause: '§6.3.3', text: L3(
      'Hata koruması, beslemenin otomatik kesilmesiyle (aşırı akım koruma cihazı / RCD) sağlanmıştır.',
      'Fault protection has been provided by automatic disconnection of supply (overcurrent protective device / RCD).',
      'Der Fehlerschutz wurde durch automatische Abschaltung der Stromversorgung (Überstromschutzeinrichtung / RCD) realisiert.') },
    { id: 'G-12', g: 'pe', clause: '§8.2.1', text: L3(
      'Tüm erişilebilir iletken parçalar (gövde, kapaklar, motorlar, pano) koruyucu bağlama devresine bağlanmıştır.',
      'All exposed conductive parts (frame, covers, motors, enclosure) have been connected to the protective bonding circuit.',
      'Alle berührbaren leitfähigen Teile (Gestell, Abdeckungen, Motoren, Schaltschrank) wurden mit dem Schutzleitersystem verbunden.') },
    { id: 'G-13', g: 'pe', clause: '§8.2.2 · §13.2.2', text: L3(
      'Koruma iletkenleri yeşil-sarı renkte ve faz iletkenlerine göre yeterli kesitte seçilmiştir.',
      'Protective conductors are green-yellow and have been sized adequately relative to the line conductors.',
      'Schutzleiter sind grün-gelb und wurden im Verhältnis zu den Außenleitern ausreichend bemessen.') },
    { id: 'G-14', g: 'pe', clause: '§8.2.3 · §8.2.4', text: L3(
      'PE bağlantı noktaları gevşemeye karşı emniyete alınmış; menteşeli kapak ve kapılar esnek bağlama iletkeniyle bağlanmıştır.',
      'PE connection points have been secured against loosening; hinged doors and covers have been bonded with flexible conductors.',
      'PE-Anschlusspunkte wurden gegen Selbstlockern gesichert; Türen und Klappen wurden mit flexiblen Leitern angeschlossen.') },
    { id: 'G-15', g: 'pe', clause: '§8.2.6', text: L3(
      'Koruma iletkeni akımı 10 mA\'i aşıyorsa §8.2.6 önlemleri ve PE terminali yanında uyarı uygulanmıştır.',
      'Where the protective conductor current exceeds 10 mA, the measures of §8.2.6 and a warning next to the PE terminal have been applied.',
      'Bei Schutzleiterströmen über 10 mA wurden die Maßnahmen nach §8.2.6 und ein Warnhinweis an der PE-Klemme angebracht.') },
    { id: 'G-16', g: 'prot', clause: '§7.2', text: L3(
      'Güç devreleri, kumanda devreleri ve kumanda transformatörü için aşırı akım koruması uygulanmıştır.',
      'Overcurrent protection has been provided for the power circuits, control circuits and the control transformer.',
      'Für Hauptstromkreise, Steuerstromkreise und Steuertransformator wurde ein Überstromschutz vorgesehen.') },
    { id: 'G-17', g: 'prot', clause: '§7.3', text: L3(
      'Motorlar aşırı yüke / aşırı ısınmaya karşı korunmuştur (motor koruma şalteri / termik röle).',
      'Motors have been protected against overload / overheating (motor protection switch / thermal relay).',
      'Motoren wurden gegen Überlast / Übertemperatur geschützt (Motorschutzschalter / Thermorelais).') },
    { id: 'G-18', g: 'prot', clause: '§7.5', text: L3(
      'Makine, besleme kesilip geri geldiğinde kendiliğinden yol almayacak şekilde tasarlanmıştır.',
      'The machine has been designed not to restart automatically after supply interruption and restoration.',
      'Die Maschine wurde so ausgelegt, dass sie nach Unterbrechung und Wiederkehr der Versorgung nicht selbsttätig anläuft.') },
    { id: 'G-19', g: 'ctrl', clause: '§9.1.1', text: L3(
      'Kumanda devreleri kumanda transformatöründen veya PELV / SELV kaynağından beslenmiştir.',
      'Control circuits have been supplied from a control transformer or a PELV / SELV source.',
      'Steuerstromkreise wurden über einen Steuertransformator oder eine PELV- / SELV-Quelle versorgt.') },
    { id: 'G-20', g: 'ctrl', clause: '§10.7 · §9.2.3.4.2', text: L3(
      'Acil durdurma cihazı sarı zemin üzerinde kırmızı tutamaklı ve mandallı yapılmış; kumanda paneline kolay erişilebilir konumda yerleştirilmiştir.',
      'The emergency stop device has a red actuator on a yellow background, latches mechanically and has been placed within easy reach on the control panel.',
      'Die Not-Halt-Einrichtung hat einen roten Betätiger auf gelbem Hintergrund, rastet mechanisch ein und wurde gut erreichbar am Bedienfeld angeordnet.') },
    { id: 'G-21', g: 'ctrl', clause: '§10.2 · §10.3', text: L3(
      'Kumanda elemanları ve gösterge lambaları renk ve işaret kurallarına uygun yapılmıştır.',
      'Actuators and indicator lights have been coloured and marked in accordance with the requirements.',
      'Bedienteile und Leuchtmelder wurden den Anforderungen entsprechend gefärbt und gekennzeichnet.') },
    { id: 'G-22', g: 'wiring', clause: '§12.4', text: L3(
      'İletken ve kablo kesitleri akım taşıma kapasitesine ve koruma cihazlarına göre seçilmiştir.',
      'Conductor and cable cross-sections have been selected for the current-carrying capacity and the protective devices.',
      'Leiter- und Kabelquerschnitte wurden nach Strombelastbarkeit und Schutzeinrichtungen ausgewählt.') },
    { id: 'G-23', g: 'wiring', clause: '§13.2', text: L3(
      'İletkenler tanıtılmış; koruma iletkeni yeşil-sarı, nötr iletkeni açık mavi renkle ayırt edilmiştir.',
      'Conductors have been identified; the protective conductor is green-yellow and the neutral conductor light blue.',
      'Leiter wurden gekennzeichnet; der Schutzleiter ist grün-gelb, der Neutralleiter hellblau.') },
    { id: 'G-24', g: 'wiring', clause: '§13.1 · §13.4', text: L3(
      'Kablo girişleri rakorlu ve gerilme boşaltmalı yapılmış; hareketli ve dış kablolar mekanik hasara karşı korunmuştur.',
      'Cable entries have been made with glands and strain relief; moving and external cables have been protected against mechanical damage.',
      'Kabeleinführungen wurden mit Verschraubungen und Zugentlastung ausgeführt; bewegte und äußere Leitungen wurden gegen mechanische Beschädigung geschützt.') },
    { id: 'G-25', g: 'wiring', clause: '§13.1.1', text: L3(
      'Klemens bağlantıları sıkılmış; her klemens noktasına tek iletken (veya uygun yüksük) bağlanmıştır.',
      'Terminal connections have been tightened; one conductor (or a suitable ferrule) has been connected per terminal point.',
      'Klemmverbindungen wurden festgezogen; je Klemmstelle wurde ein Leiter (oder eine geeignete Aderendhülse) angeschlossen.') }
  ];

  /* ─── Fonksiyon testleri (§18.6) ───────────────────────────── */
  const FUNC = [
    { id: 'F-01', clause: '§5.3', test: L3('Ana şalterin çalışma sırasında KAPALI (O) konuma alınması', 'Main switch turned to OFF (O) during operation', 'Hauptschalter während des Betriebs in AUS-Stellung (O) geschaltet'),
      expected: L3('Tüm güç devreleri enerjisiz kalmalı, makine durmalı', 'All power circuits de-energised, machine stops', 'Alle Hauptstromkreise spannungsfrei, Maschine steht still') },
    { id: 'F-02', clause: '§9.2.3.4.2 · §10.7', test: L3('Acil durdurma butonuna çevrimin farklı fazlarında basılması', 'Emergency stop pressed in different phases of the cycle', 'Not-Halt in verschiedenen Zyklusphasen betätigt'),
      expected: L3('Tehlikeli hareketler ve pompa durmalı; buton serbest bırakılınca makine kendiliğinden yol almamalı', 'Hazardous movements and pump stop; releasing the button does not restart the machine', 'Gefährliche Bewegungen und Pumpe stoppen; Entriegeln führt nicht zum Wiederanlauf') },
    { id: 'F-03', clause: '§9.2.3.2 · §9.2.3.3', test: L3('Çalıştırma ve durdurma kumandalarının denenmesi', 'Start and stop controls tested', 'Start- und Stoppbefehle geprüft'),
      expected: L3('Makine yalnız çalıştırma kumandasıyla başlamalı; durdurma, çalıştırmaya göre öncelikli olmalı', 'Machine starts only by the start control; stop has priority over start', 'Maschine startet nur über den Startbefehl; Stopp hat Vorrang vor Start') },
    { id: 'F-04', clause: '§9.3', test: L3('Koruyucu kilitlemelerin (kapak / kapı) çalışma sırasında açılarak denenmesi', 'Guard interlocks (lid / door) opened during operation', 'Schutzverriegelungen (Deckel / Tür) während des Betriebs geöffnet'),
      expected: L3('Tehlikeli fonksiyonlar durmalı; koruyucu kapatılınca makine kendiliğinden yol almamalı', 'Hazardous functions stop; closing the guard does not restart the machine', 'Gefährliche Funktionen stoppen; Schließen der Schutzeinrichtung führt nicht zum Wiederanlauf') },
    { id: 'F-05', clause: '§7.5', test: L3('Çalışma sırasında beslemenin kesilip yeniden verilmesi', 'Supply interrupted and restored during operation', 'Versorgung während des Betriebs unterbrochen und wiederhergestellt'),
      expected: L3('Makine kendiliğinden yol almamalı; yeniden başlatma için çalıştırma kumandası gerekmeli', 'Machine does not restart automatically; a start command is required', 'Kein selbsttätiger Wiederanlauf; ein Startbefehl ist erforderlich') },
    { id: 'F-06', clause: '§10.3', test: L3('Gösterge lambalarının ve uyarıların denenmesi', 'Indicator lights and warnings tested', 'Leuchtmelder und Warnungen geprüft'),
      expected: L3('Lambalar ve uyarılar makinenin durumunu doğru göstermeli', 'Lights and warnings indicate the machine state correctly', 'Leuchtmelder und Warnungen zeigen den Maschinenzustand richtig an') },
    { id: 'F-07', clause: '§7.8', test: L3('Motor / pompa dönüş yönünün kontrolü', 'Direction of rotation of motor / pump checked', 'Drehrichtung von Motor / Pumpe geprüft'),
      expected: L3('Dönüş yönü işaretli yönle aynı olmalı', 'Direction of rotation matches the marked direction', 'Drehrichtung entspricht der gekennzeichneten Richtung') }
  ];

  /* ─── Fotoğraf adlandırma kuralı ───────────────────────────── */
  // Ölçüm ekranları olcum/ klasörüne, makine fotoğrafları foto/ klasörüne, kurulum fotoğrafları kurulum/ klasörüne gider
  const PAIR = '((?:L[123]|N)\\s*-\\s*(?:L[123]|N|PE))';
  const PHOTO_RULES = [
    { re: /^PE\s*(\d+)\b/i, test: 'rpe', tag: (m) => m[1] },
    { re: new RegExp(`^${PAIR}\\s+ISO\\b`, 'i'), test: 'iso', tag: (m) => m[1].replace(/\s+/g, '').toUpperCase() },
    { re: new RegExp(`^${PAIR}\\s+(?:FLASH|HV)\\b`, 'i'), test: 'hv', tag: (m) => m[1].replace(/\s+/g, '').toUpperCase() },
    { re: /^(?:KACAK|KAÇAK|LEAK|IPE|I-PE)\s*(\d*)/i, test: 'leak', tag: (m) => m[1] || '1' },
    { re: /^(?:ARTIK|ARTİK|RESIDUAL)\s*(\d*)/i, test: 'res', tag: (m) => m[1] || '1' },
    { re: /^(?:ZS|LOOP|DONGU|DÖNGÜ)\s*(\d*)/i, test: 'loop', tag: (m) => m[1] || '1' },
    { re: /^(?:VD|DUSUM|DÜŞÜM|GERILIM DUSUMU|GERİLİM DÜŞÜMÜ|VOLT DROP|VOLTAGE DROP)\s*(\d*)/i, test: 'vd', tag: (m) => m[1] || '1' },
    { re: /^(?:GUC|GÜÇ|POWER|ENERJI|ENERJİ|AKTIF|AKTİF)\s*(\d*)/i, test: 'pwr', tag: (m) => m[1] || '1' },
    { re: /^(?:ETIKET|ETİKET|NAMEPLATE|TYPSCHILD)/i, kind: 'nameplate' },
    { re: /^(?:PANO|PANEL|SCHALTSCHRANK)/i, kind: 'panel' },
    { re: /^(?:GENEL|KAPAK|COVER)/i, kind: 'cover' },
    { re: /^(?:KURULUM|SETUP|CIHAZ|CİHAZ|DEVICE)/i, kind: 'setup' }
  ];
  /** Dosya adı → { test, tag } (ölçüm) | { kind } (fotoğraf türü) | null */
  function photoRule(name) {
    const base = String(name || '').split('/').pop().replace(/\.[^.]+$/, '').trim();
    for (const r of PHOTO_RULES) {
      const m = r.re.exec(base);
      if (!m) continue;
      return r.test ? { test: r.test, tag: r.tag(m) } : { kind: r.kind };
    }
    return null;
  }
  /** Ölçüm fotoğrafının adlandırma kuralına uygun adı (olcum/ altında) */
  function photoName(test, tag) {
    const t = String(tag || '').trim();
    if (test === 'rpe') return `PE ${t}`;
    if (test === 'iso') return `${t} ISO`;
    if (test === 'hv') return `${t} FLASH`;
    if (test === 'leak') return `KACAK ${t}`;
    if (test === 'res') return `ARTIK ${t}`;
    if (test === 'loop') return `ZS ${t}`;
    if (test === 'vd') return `VD ${t}`;
    if (test === 'pwr') return `GUC ${t}`;
    return t || 'foto';
  }
  const PHOTO_KINDS = {
    cover: L3('Genel görünüm', 'General view', 'Gesamtansicht'),
    nameplate: L3('Makine etiketi', 'Nameplate', 'Typschild'),
    panel: L3('Elektrik panosu / kontrol paneli', 'Electrical enclosure / control panel', 'Schaltschrank / Bedienfeld'),
    setup: L3('Test kurulumu', 'Test set-up', 'Prüfaufbau'),
    general: L3('Genel', 'General', 'Allgemein')
  };

  /* ─── İletken çifti açıklaması (R_ISO, HV) ─────────────────── */
  const KIND3 = {
    'faz': L3('faz', 'phase', 'Außenleiter'),
    'nötr': L3('nötr', 'neutral', 'Neutralleiter'),
    'pe': L3('koruma iletkeni (PE)', 'protective conductor (PE)', 'Schutzleiter (PE)')
  };
  const condKind = (c) => (/^L/i.test(c) ? 'faz' : /^N$/i.test(c) ? 'nötr' : 'pe');
  /** "L1-PE" → { tr: "L1 – PE arası (faz – koruma iletkeni (PE))", en, de } */
  function pairText(tag) {
    const [a, b] = String(tag || '').toUpperCase().split('-');
    if (!a || !b) return null;
    const ka = KIND3[condKind(a)];
    const kb = KIND3[condKind(b)];
    return L3(`${a} – ${b} arası (${ka.tr} – ${kb.tr})`, `Between ${a} and ${b} (${ka.en} – ${kb.en})`, `Zwischen ${a} und ${b} (${ka.de} – ${kb.de})`);
  }
  const PAIRS_3N = ['L1-L2', 'L1-L3', 'L2-L3', 'L1-N', 'L2-N', 'L3-N', 'L1-PE', 'L2-PE', 'L3-PE', 'N-PE'];

  /* ─── Rapor metinleri ──────────────────────────────────────── */
  const T = {
    tr: {
      dec: ',', fill: '[doldurulacak]', none: '—',
      hdrTitle: 'Elektriksel Kalite ve Güvenlik Testi', pageWord: 'Sayfa', uncontrolled: 'Kontrolsüz kopya — çoğaltılamaz', jobPrefix: 'İş No',
      cover: {
        kicker: 'ELEKTRİK SİSTEMİ KALİTE VE GÜVENLİK TEST RAPORU', mark: 'LVD', std: '2014/35/AB<br>EN 60204-1:2018<br>Bölüm 18<br>IEC 61557',
        rows: { job: 'İş no', customer: 'Müşteri', model: 'Model', serial: 'Makine seri no', docNo: 'Rapor no', rev: 'Revizyon', date: 'Test tarihi', pages: 'Sayfa sayısı' },
        sign: ['Hazırlayan', 'Kontrol Eden', 'Onaylayan']
      },
      stamp: { draft: ['TASLAK', 'Onay bekliyor'], final: ['YAYINLANDI', 'Onaylı'] },
      confidential: 'Bu doküman üreticinin yazılı izni olmadan çoğaltılamaz ve üçüncü kişilerle paylaşılamaz.',
      noPhotos: '[fotoğraf eklenecek]', annex: 'Ek', contents: 'İçindekiler', endOfReport: 'Rapor sonu',
      revHist: 'Revizyon Geçmişi', revCols: ['Rev.', 'Tarih', 'Açıklama', 'Hazırlayan', 'Onaylayan'],
      firstIssue: 'İlk yayın', revTbd: '[Revizyon açıklaması]',
      s1: 'Amaç ve Kapsam',
      purpose: (v) => `Bu rapor, ${v.manufacturer} tarafından imal edilen <b>${v.model}</b> makinesinin (seri no ${v.serial}, iş no ${v.job}) elektrik donanımının <b>EN 60204-1:2018 Bölüm 18</b>'e göre doğrulanmasını kapsar. Doğrulama; elektrik donanımının teknik dokümantasyona uygunluğunun gözle kontrolünü, koruyucu bağlama devresinin sürekliliğini, yalıtım direnci ve gerilim testlerini, artık gerilim ve koruma iletkeni akımı ölçümlerini ve fonksiyon testlerini içerir.`,
      purpose2: '2006/42/AT Makine Emniyeti Yönetmeliği Ek I madde 1.5.1 uyarınca makinenin elektrik donanımı 2014/35/AB Alçak Gerilim Yönetmeliği\'nin güvenlik hedeflerini karşılamalıdır. Bu rapordaki testler, bu hedeflerin karşılandığını göstermek amacıyla yapılmıştır.',
      linked: (ra) => `Bu rapor, <b>${ra}</b> numaralı risk değerlendirme raporuyla birlikte makinenin teknik dosyasında yer alır.`,
      s2: 'Referans Mevzuat ve Standartlar', stdCols: ['Referans', 'Başlık'],
      standards: [
        ['2014/35/AB', 'Alçak Gerilim Yönetmeliği (LVD)'],
        ['2006/42/AT · Ek I 1.5.1', 'Makine Emniyeti Yönetmeliği — elektrik beslemesinden kaynaklanan tehlikeler'],
        ['EN 60204-1:2018', 'Makinelerde güvenlik — Makinelerin elektrik donanımı — Bölüm 1: Genel kurallar'],
        ['EN 61557-1 / -2 / -3 / -4', 'Düşük gerilim dağıtım sistemlerinde elektrik güvenliği — koruyucu önlemlerin test, ölçme ve izleme cihazları'],
        ['ISO 7010', 'Grafik semboller — Güvenlik renkleri ve güvenlik işaretleri (W012)']
      ],
      s3: 'Makine ve Elektrik Beslemesi',
      mach: { manufacturer: 'Üretici', model: 'Marka / model', serial: 'Seri no / imal yılı', type: 'Makine tipi', supply: 'Besleme (gerilim / faz / frekans)', current: 'Anma akımı (tam yük)', power: 'Kurulu güç', network: 'Şebeke tipi', fuse: 'Ön koruma (sigorta)', sccr: 'Kısa devre dayanımı', protClass: 'Koruma sınıfı', ip: 'Koruma derecesi (IP)', connection: 'Besleme bağlantısı' },
      s4: 'Test Koşulları ve Test Cihazları',
      cond: { date: 'Test tarihi / saati', location: 'Test yeri', temp: 'Ortam sıcaklığı', hum: 'Bağıl nem', ambient: 'Ortam koşulları', testedBy: 'Test eden', connection: 'Bağlantı', method: 'Yöntem' },
      devTitle: 'Test cihazları', devCols: ['Cihaz', 'Marka / model', 'Seri no', 'Kalibrasyon', 'Geçerlilik', 'Durum'],
      devNote: 'EN 60204-1 §18.1, §18.2 ve §18.3 testleri için IEC 61557 serisine uygun ölçüm cihazlarının kullanılmasını öngörür.',
      calOk: 'geçerli', calExp: 'süresi dolmuş',
      s5: 'Test Programı ve Sonuç Özeti',
      p5: 'EN 60204-1 §18.1\'e göre makineye özgü bir ürün standardı yoksa doğrulama en az a), b) ve h) maddelerini kapsar; c) – g) maddeleri uygulanabildiği ölçüde yapılır. Testler standartta önerilen sırayla yapılmıştır.',
      progCols: ['Madde', 'Test', 'Kapsam', 'Kabul kriteri', 'Ölçülen', 'Sonuç'], critLabel: 'Kabul kriteri',
      req: 'zorunlu', opt: 'uygulanabilir', extra: 'ek test', mode: { on: 'aktif test', off: 'pasif test' },
      crit: {
        visual: 'Uygunsuzluk bulunmamalı',
        rpe: (l) => `R<sub>PE</sub> ≤ ${l.rpeMax} Ω (I ≥ ${l.rpeI} A · ${l.rpeT} s)`,
        vd: 'ΔU ≤ ΔU<sub>max</sub> (EN 60204-1:2006 Tablo 9 ya da satırdaki sınır)',
        loop: 'Z<sub>s</sub> · I<sub>a</sub> ≤ U<sub>0</sub>',
        iso: (l) => `R<sub>ISO</sub> ≥ ${l.isoMin} MΩ (${l.isoU} V DC ±${l.isoTol} V)`,
        hv: (l) => `${l.hvU} V AC (±${l.hvTol} V) · ${l.hvT} s; delinme yok (I ≤ ${l.hvMax} mA)`,
        pwr: (l) => `U = U<sub>n</sub> ±${l.uTol} %; I ≤ etiketteki tam yük akımı`,
        res: (l) => `U ≤ ${l.resMax} V, ${l.resT} s içinde`,
        leak: (l) => `I<sub>PE</sub> ≤ ${l.leakMax} mA; aşılırsa §8.2.6 önlemleri`,
        func: 'Tüm fonksiyonlar beklendiği gibi çalışmalı'
      },
      s6: 'Gözle Kontrol ve Dokümantasyon Doğrulaması', s6ref: '(EN 60204-1 §18.1 a)',
      p6: 'Elektrik donanımı, devre şemaları ve teknik dokümantasyonla karşılaştırılarak aşağıdaki maddelere göre kontrol edilmiştir.',
      visCols: ['No', 'Kontrol maddesi', 'Madde', 'Sonuç', 'Not / kanıt'],
      legend: '<b>U</b>: uygun · <b>UD</b>: uygun değil · <b>UY</b>: uygulanamaz',
      res: { ok: 'U', nok: 'UD', na: 'UY', open: '—' },
      s7: 'Ölçüm ve Test Sonuçları', s7ref: '(EN 60204-1 §18.2 – §18.5, §8.2.6)',
      h71: 'Koruyucu bağlama devresinin sürekliliği — Test 1 (§18.2.2)',
      p71: (l) => `Her koruyucu bağlama devresinin direnci, besleme fişinin / PE terminalinin koruma iletkeni kontağı ile ilgili noktalar arasında ${l.rpeI} A test akımıyla, ${l.rpeT} s süreyle ölçülmüştür. Ölçülen direnç, ilgili koruma iletkeninin uzunluğuna, kesitine ve malzemesine göre beklenen aralıkta olmalıdır; kabul kriteri olarak ${l.rpeMax} Ω kullanılmıştır.`,
      h72: 'Otomatik kesme koşulları — Test 2 (§18.2.3)',
      p72: (l) => `Hata döngüsü empedansı Z<sub>s</sub> ölçülmüş ve aşırı akım koruma cihazının açma akımı I<sub>a</sub> ile karşılaştırılmıştır: Z<sub>s</sub> ≤ U<sub>0</sub> / I<sub>a</sub> (U<sub>0</sub> = ${l.u0} V; I<sub>a</sub> anlık açma akımı: B 5 · I<sub>n</sub>, C 10 · I<sub>n</sub>, D 20 · I<sub>n</sub>).`,
      h73: 'Yalıtım direnci (§18.3)',
      p73: (l) => `Yalıtım direnci, güç devresi iletkenleri ile koruyucu bağlama devresi arasında ve iletken çiftleri arasında ${l.isoU} V DC ile ${l.isoT} s süreyle ölçülmüştür. Kabul kriteri: ≥ ${l.isoMin} MΩ.`,
      h74: 'Gerilim testi (§18.4)',
      p74: (l) => `Test gerilimi, tüm devrelerin iletkenleri ile koruyucu bağlama devresi arasında ${l.hvU} V AC (50 Hz) olarak ${l.hvT} s uygulanmıştır. Standart, anma besleme geriliminin iki katı veya 1000 V'tan büyük olanını ve en az 1 s süreyi öngörür. Kabul kriteri: delinme olmaması (test cihazının kaçak akım sınırı ${l.hvMax} mA).`,
      h75: 'Artık gerilimlere karşı koruma (§18.5)',
      p75: (l) => `Besleme kesildikten sonra gerilimli kalabilen erişilebilir parçalarda (fiş uçları, pano içi) gerilim ölçülmüştür. Kabul kriteri: besleme kesildikten sonra ${l.resT} s içinde ≤ ${l.resMax} V (fiş uçlarında 1 s).`,
      h76: 'Koruma iletkeni akımı (§8.2.6)',
      p76: (l) => `Makine çalışır durumdayken koruma iletkeni akımı ölçülmüştür. Akım ${l.leakMax} mA'i aşmıyorsa §8.2.6'daki ek gereklilikler (en az 10 mm² Cu koruma iletkeni, ikinci koruma iletkeni veya koruma iletkeni kopunca otomatik kesme ve uyarı) uygulanmaz.`,
      cols: { no: 'No', time: 'Saat', point: 'Ölçüm noktası', circuit: 'Ölçülen devre', itest: 'I<sub>test</sub>', uiso: 'U<sub>ISO</sub>', umeas: 'U<sub>ölçülen</sub>', limit: 'Limit', ev: 'Değ.', photo: 'Foto', device: 'Koruma cihazı', zs: 'Z<sub>s</sub> ölçülen', zsmax: 'Z<sub>s,max</sub>', t: 't', u: 'U', ipe: 'I<sub>PE</sub>', imeas: 'I<sub>ölçülen</sub>', cs: 'Kesit', du: 'ΔU', i: 'I', state: 'Çalışma durumu', dun: 'Sapma', pf: 'cos φ', p: 'P', s: 'S', q: 'Q' },
      status: { site: 'Kurulum yerinde, makine nihai beslemeye bağlandıktan sonra yapılacaktır.', na: 'Uygulanamaz.', skip: 'Bu revizyonda yapılmamıştır.', none: 'Bu revizyonda ölçüm yapılmamıştır.' },
      s8: 'Fonksiyon Testleri', s8ref: '(EN 60204-1 §18.6)',
      p8: 'Elektrik donanımının fonksiyonları, özellikle güvenlik ve koruma ile ilgili olanlar, denenmiştir.',
      funcCols: ['No', 'Test', 'Beklenen sonuç', 'Sonuç', 'Tarih', 'Not'],
      sfRef: 'Risk analizi',
      s9: 'Sonuç ve Onay',
      conclCols: ['Madde', 'Test', 'Ölçülen değer aralığı', 'Sınır', 'Sonuç'],
      verdict: {
        pass: (m) => `<b>${m}</b> makinesinin elektrik donanımı, EN 60204-1:2018 Bölüm 18'e göre yapılan doğrulamada <b>uygun</b> bulunmuştur.`,
        cond: (m, x) => `<b>${m}</b> makinesinin elektrik donanımı yapılan testlerde uygun bulunmuştur; ${x} tamamlanmalıdır.`,
        open: (m, x) => `<b>${m}</b> makinesinin doğrulaması tamamlanmamıştır: ${x} sonucu bekleniyor.`,
        fail: (m, x) => `<b>${m}</b> makinesinin elektrik donanımı <b>uygun bulunmamıştır</b> (${x}). Uygunsuzluklar giderildikten sonra ilgili testler tekrarlanmalıdır (§18.7).`
      },
      signTitle: 'Onay', signCols: ['', 'Ad Soyad', 'Unvan', 'Tarih', 'İmza'],
      pill: { pass: 'UYGUN', fail: 'UYGUN DEĞİL', open: 'AÇIK', na: 'UY', site: 'KURULUMDA', skip: 'YAPILMADI', warn: 'KOŞULLU' },
      sA: 'Ölçüm Ekranları', sB: 'Makine ve Test Kurulumu Fotoğrafları',
      aGroups: { rpe: 'Koruyucu bağlama devresi sürekliliği (R<sub>PE</sub>)', vd: 'Koruyucu bağlama devresinde gerilim düşümü (ΔU)', loop: 'Hata döngüsü empedansı (Z<sub>s</sub>)', iso: 'Yalıtım direnci (R<sub>ISO</sub>)', hv: 'Gerilim testi (HV)', res: 'Artık gerilim', leak: 'Koruma iletkeni akımı (I<sub>PE</sub>)', pwr: 'Çalışma testi (güç ölçümü)' },
      std60204: 'EN 60204-1:2018 (IEC 60204-1:2016), elle taşınmayan makinelerin ve birlikte çalışan makine gruplarının elektrik, elektronik ve programlanabilir elektronik donanımına, besleme bağlantı noktasından itibaren uygulanmaktadır. Standart, anma besleme gerilimi 1000 V AC ya da 1500 V DC\'yi ve anma frekansı 200 Hz\'i aşmayan donanımları kapsamakta, elektrik donanımının doğrulanmasını Bölüm 18\'de tanımlamaktadır.',
      activePassive: '<b>Aktif test:</b> makine enerjiliyken yapılan testler — çalışma testi (makine en yüksek kapasitede çalışırken gerilim, akım ve güç ölçümü), koruma iletkeni akımı, artık gerilim, Test 2 ve fonksiyon testleri. <b>Pasif test:</b> besleme kesilmişken yapılan testler — gözle kontrol, koruyucu bağlama devresinin sürekliliği ve gerilim düşümü, yalıtım direnci ve gerilim testi.',
      h7vd: 'Koruyucu bağlama devresinde gerilim düşümü — yüksek test akımı (§18.2.2 · §8.2.2)',
      p7vd: () => 'Koruyucu bağlama devresinin akım taşıma yeterliliği, PE terminali ile ilgili noktalar arasında yüksek test akımıyla (≈ 10 A) oluşan gerilim düşümü ölçülerek doğrulanmıştır. Kesit verilmişse sınır EN 60204-1:2006 Tablo 9 değerlerinden (10 A için: 1,0 mm² → 3,3 V · 1,5 mm² → 2,6 V · 2,5 mm² → 1,9 V · 4,0 mm² → 1,4 V · ≥ 6 mm² → 1,0 V) test akımına oranlanarak hesaplanmış, aksi hâlde satırda verilen sınır kullanılmıştır.',
      h7pwr: 'Çalışma testi — besleme gerilimi, akım ve güç (aktif test, §4.3.2 · §16.4)',
      p7pwr: (l) => `Makine enerjilenmiş ve en yüksek kapasitede çalıştırılmıştır; çalışma sırasında besleme gerilimi, akım, güç faktörü ile aktif, görünür ve reaktif güç ölçülmüştür. Besleme gerilimi nominal gerilimle karşılaştırılmıştır (EN 60204-1 §4.3.2: kararlı durumda nominal gerilimin %90 – %110'u; kabul ±${l.uTol} %). Ölçülen en yüksek akım makine etiketindeki tam yük akımıyla karşılaştırılmıştır (§16.4).`,
      un: 'Nominal gerilim',
      evl: {
        what: { rpe: 'R<sub>PE</sub>', vd: 'gerilim düşümü', loop: 'Z<sub>s</sub>', iso: 'R<sub>ISO</sub>', hv: 'kaçak akım', res: 'artık gerilim', leak: 'koruma iletkeni akımı' },
        meas: (n, what, rng) => `${n} ölçümde ${what} ${rng} olarak ölçülmüştür.`,
        allOk: (lim) => `Tüm değerler kabul kriterini (${lim}) sağlamaktadır.`,
        someFail: (f, lim, list) => `${f} ölçüm kabul kriterini (${lim}) sağlamamaktadır: ${list}.`,
        tolFail: (list) => `Uygulanan test akımı / gerilimi tolerans dışındadır: ${list}.`,
        hvOk: 'Test süresince delinme veya atlama kaydedilmemiştir.',
        leakWarn: (lim) => `Koruma iletkeni akımı ${lim} mA'i aşmaktadır; §8.2.6 ek önlemleri ve PE terminali yanında uyarı gereklidir (G-15).`,
        pwr: (parts) => `Çalışma sırasında ${parts.join(', ')} ölçülmüştür.`,
        pwrU: (u, un, du) => `besleme gerilimi ${u} (nominal ${un}, sapma ${du})`,
        pwrI: (i, ir) => `en yüksek akım ${i}${ir ? ` (etiket: ${ir})` : ''}`,
        pwrPf: (v) => `güç faktörü ${v}`,
        pwrP: (p, s, q) => `aktif güç ${p}${s ? `, görünür güç ${s}` : ''}${q ? `, reaktif güç ${q}` : ''}`,
        res: { pass: 'Sonuç: <b>uygun</b>.', fail: 'Sonuç: <b>uygun değil</b>.', warn: 'Sonuç: <b>koşullu</b> (§8.2.6).', open: 'Sonuç: <b>açık</b> (eksik değer).' }
      },
      tab: 'Tablo', fig: 'Şekil', lot: 'Tablolar', lof: 'Şekiller',
      tbl: { mach: 'Makine ve elektrik beslemesi', cond: 'Test koşulları', dev: 'Test cihazları', prog: 'Test programı ve sonuç özeti (EN 60204-1 §18.1)', vis: 'Gözle kontrol ve dokümantasyon doğrulaması', rpe: 'Koruyucu bağlama devresinin sürekliliği — ölçüm sonuçları', vd: 'Gerilim düşümü — ölçüm sonuçları', loop: 'Hata döngüsü empedansı — ölçüm sonuçları', iso: 'Yalıtım direnci — ölçüm sonuçları', hv: 'Gerilim testi — ölçüm sonuçları', res: 'Artık gerilim — ölçüm sonuçları', leak: 'Koruma iletkeni akımı — ölçüm sonuçları', pwr: 'Çalışma testi — ölçülen değerler', func: 'Fonksiyon testleri', sum: 'Sonuç özeti', sign: 'Onay' },
      figA: (g) => `${g} — ölçüm ekranları`, figB: 'Makine, etiket ve test kurulumu fotoğrafları',
      discTitle: 'Geçerlilik ve yasal uyarı',
      disc: [
        'Bu rapor yalnız yukarıda tanımlanan makineyi ve belirtilen koşullarda, test tarihinde yapılan testleri kapsamaktadır. Makinenin tasarımında, bileşenlerinde, elektrik bağlantılarında veya çalışma koşullarında sonradan yapılan değişiklikler raporun geçerliliğini ortadan kaldırabilir.',
        'Titreşim, sıcaklık değişimleri, nem, toz ve kullanım yoğunluğu zamanla elektrik bağlantılarının gevşemesine, iletken yüzeylerin korozyonuna ve yalıtımın yıpranmasına yol açabilir. Ölçüm sonuçları makinenin test anındaki durumunu yansıtmaktadır; sürekli uygunluğun kanıtı olarak kabul edilmemelidir.',
        'Koruyucu bağlama devresinin etkinliği, makinenin bağlandığı tesisin topraklama tesisatına da bağlıdır; tesis topraklaması ayrıca ölçülmeli ve kayıt altına alınmalıdır.',
        'Makinenin kullanım ömrü boyunca iş sağlığı ve güvenliği mevzuatına ve EN 60204-1\'e uygunluğun sürdürülmesi işletenin sorumluluğundadır. Elektriksel güvenlik testlerinin yetkin personel tarafından periyodik olarak (tercihen en az yılda bir) tekrarlanması ve sonuçların kayıt altına alınması önerilmektedir. Elektrik donanımında değişiklik yapıldığında ilgili testler EN 60204-1 §18.7\'ye göre tekrarlanmalıdır.'
      ]
    },
    en: {
      dec: '.', fill: '[to be filled]', none: '—',
      hdrTitle: 'Electrical Quality & Safety Test', pageWord: 'Page', uncontrolled: 'Uncontrolled copy — do not reproduce', jobPrefix: 'Job No',
      cover: {
        kicker: 'ELECTRICAL SYSTEM QUALITY & SAFETY TEST REPORT', mark: 'LVD', std: '2014/35/EU<br>EN 60204-1:2018<br>Clause 18<br>IEC 61557',
        rows: { job: 'Job no', customer: 'Customer', model: 'Model', serial: 'Machine serial no', docNo: 'Report no', rev: 'Revision', date: 'Test date', pages: 'Pages' },
        sign: ['Prepared by', 'Checked by', 'Approved by']
      },
      stamp: { draft: ['DRAFT', 'Pending approval'], final: ['RELEASED', 'Approved'] },
      confidential: "Reproduction or disclosure to third parties without the manufacturer's written consent is prohibited.",
      noPhotos: '[photos to be added]', annex: 'Annex', contents: 'Contents', endOfReport: 'End of report',
      revHist: 'Revision History', revCols: ['Rev.', 'Date', 'Description', 'Prepared by', 'Approved by'],
      firstIssue: 'First issue', revTbd: '[Revision description]',
      s1: 'Purpose and Scope',
      purpose: (v) => `This report covers the verification of the electrical equipment of the <b>${v.model}</b> machine (serial no ${v.serial}, job no ${v.job}) manufactured by ${v.manufacturer} in accordance with <b>EN 60204-1:2018 Clause 18</b>. The verification comprises the visual inspection of the conformity of the electrical equipment with its technical documentation, the continuity of the protective bonding circuit, insulation resistance and voltage tests, residual voltage and protective conductor current measurements and functional tests.`,
      purpose2: 'According to Machinery Directive 2006/42/EC Annex I section 1.5.1, the electrical equipment of the machine shall meet the safety objectives of the Low Voltage Directive 2014/35/EU. The tests in this report have been performed to demonstrate that these objectives are met.',
      linked: (ra) => `This report forms part of the technical file of the machine together with risk assessment report <b>${ra}</b>.`,
      s2: 'Referenced Legislation and Standards', stdCols: ['Reference', 'Title'],
      standards: [
        ['2014/35/EU', 'Low Voltage Directive (LVD)'],
        ['2006/42/EC · Annex I 1.5.1', 'Machinery Directive — hazards from the electricity supply'],
        ['EN 60204-1:2018', 'Safety of machinery — Electrical equipment of machines — Part 1: General requirements'],
        ['EN 61557-1 / -2 / -3 / -4', 'Electrical safety in low voltage distribution systems — equipment for testing, measuring or monitoring of protective measures'],
        ['ISO 7010', 'Graphical symbols — Safety colours and safety signs (W012)']
      ],
      s3: 'Machine and Electrical Supply',
      mach: { manufacturer: 'Manufacturer', model: 'Brand / model', serial: 'Serial no / year', type: 'Machine type', supply: 'Supply (voltage / phases / frequency)', current: 'Rated (full-load) current', power: 'Installed power', network: 'Supply system', fuse: 'Upstream protection (fuse)', sccr: 'Short-circuit rating', protClass: 'Protection class', ip: 'Degree of protection (IP)', connection: 'Supply connection' },
      s4: 'Test Conditions and Test Equipment',
      cond: { date: 'Test date / time', location: 'Test location', temp: 'Ambient temperature', hum: 'Relative humidity', ambient: 'Ambient conditions', testedBy: 'Tested by', connection: 'Connection', method: 'Method' },
      devTitle: 'Test equipment', devCols: ['Instrument', 'Brand / model', 'Serial no', 'Calibration', 'Valid until', 'Status'],
      devNote: 'EN 60204-1 §18.1 specifies measuring equipment in accordance with the IEC 61557 series for the tests of §18.2 and §18.3.',
      calOk: 'valid', calExp: 'expired',
      s5: 'Test Programme and Summary of Results',
      p5: 'According to EN 60204-1 §18.1, where there is no dedicated product standard for the machine, the verification shall include at least items a), b) and h); items c) – g) are performed as applicable. The tests have been performed in the sequence recommended by the standard.',
      progCols: ['Item', 'Test', 'Scope', 'Acceptance criterion', 'Measured', 'Result'], critLabel: 'Acceptance criterion',
      req: 'mandatory', opt: 'as applicable', extra: 'additional test', mode: { on: 'active test', off: 'passive test' },
      crit: {
        visual: 'No non-conformity',
        rpe: (l) => `R<sub>PE</sub> ≤ ${l.rpeMax} Ω (I ≥ ${l.rpeI} A · ${l.rpeT} s)`,
        vd: 'ΔU ≤ ΔU<sub>max</sub> (EN 60204-1:2006 Table 9 or limit stated in the row)',
        loop: 'Z<sub>s</sub> · I<sub>a</sub> ≤ U<sub>0</sub>',
        iso: (l) => `R<sub>ISO</sub> ≥ ${l.isoMin} MΩ (${l.isoU} V DC ±${l.isoTol} V)`,
        hv: (l) => `${l.hvU} V AC (±${l.hvTol} V) · ${l.hvT} s; no breakdown (I ≤ ${l.hvMax} mA)`,
        pwr: (l) => `U = U<sub>n</sub> ±${l.uTol} %; I ≤ full-load current on the nameplate`,
        res: (l) => `U ≤ ${l.resMax} V within ${l.resT} s`,
        leak: (l) => `I<sub>PE</sub> ≤ ${l.leakMax} mA; otherwise measures of §8.2.6`,
        func: 'All functions operate as intended'
      },
      s6: 'Visual Inspection and Verification of Documentation', s6ref: '(EN 60204-1 §18.1 a)',
      p6: 'The electrical equipment has been compared with the circuit diagrams and the technical documentation and inspected against the following items.',
      visCols: ['No', 'Inspection item', 'Clause', 'Result', 'Note / evidence'],
      legend: '<b>C</b>: compliant · <b>NC</b>: not compliant · <b>N/A</b>: not applicable',
      res: { ok: 'C', nok: 'NC', na: 'N/A', open: '—' },
      s7: 'Measurement and Test Results', s7ref: '(EN 60204-1 §18.2 – §18.5, §8.2.6)',
      h71: 'Continuity of the protective bonding circuit — Test 1 (§18.2.2)',
      p71: (l) => `The resistance of each protective bonding circuit has been measured between the protective conductor contact of the supply plug / PE terminal and the relevant points with a test current of ${l.rpeI} A for ${l.rpeT} s. The measured resistance shall be in the expected range for the length, cross-section and material of the related protective conductor; ${l.rpeMax} Ω has been used as the acceptance criterion.`,
      h72: 'Conditions for automatic disconnection — Test 2 (§18.2.3)',
      p72: (l) => `The fault loop impedance Z<sub>s</sub> has been measured and compared with the operating current I<sub>a</sub> of the overcurrent protective device: Z<sub>s</sub> ≤ U<sub>0</sub> / I<sub>a</sub> (U<sub>0</sub> = ${l.u0} V; instantaneous tripping current I<sub>a</sub>: B 5 · I<sub>n</sub>, C 10 · I<sub>n</sub>, D 20 · I<sub>n</sub>).`,
      h73: 'Insulation resistance (§18.3)',
      p73: (l) => `The insulation resistance has been measured between the power circuit conductors and the protective bonding circuit and between conductor pairs at ${l.isoU} V DC for ${l.isoT} s. Acceptance criterion: ≥ ${l.isoMin} MΩ.`,
      h74: 'Voltage test (§18.4)',
      p74: (l) => `The test voltage has been applied between the conductors of all circuits and the protective bonding circuit at ${l.hvU} V AC (50 Hz) for ${l.hvT} s. The standard requires twice the rated supply voltage or 1000 V, whichever is greater, for at least 1 s. Acceptance criterion: no breakdown (leakage current limit of the tester ${l.hvMax} mA).`,
      h75: 'Protection against residual voltages (§18.5)',
      p75: (l) => `The voltage has been measured on accessible parts that may remain live after disconnection of the supply (plug pins, inside the enclosure). Acceptance criterion: ≤ ${l.resMax} V within ${l.resT} s after disconnection (1 s at plug pins).`,
      h76: 'Protective conductor current (§8.2.6)',
      p76: (l) => `The protective conductor current has been measured with the machine in operation. If it does not exceed ${l.leakMax} mA, the additional requirements of §8.2.6 (protective conductor of at least 10 mm² Cu, a second protective conductor or automatic disconnection on loss of the protective conductor, and a warning) do not apply.`,
      cols: { no: 'No', time: 'Time', point: 'Measuring point', circuit: 'Circuit measured', itest: 'I<sub>test</sub>', uiso: 'U<sub>ISO</sub>', umeas: 'U<sub>measured</sub>', limit: 'Limit', ev: 'Eval.', photo: 'Photo', device: 'Protective device', zs: 'Z<sub>s</sub> measured', zsmax: 'Z<sub>s,max</sub>', t: 't', u: 'U', ipe: 'I<sub>PE</sub>', imeas: 'I<sub>measured</sub>', cs: 'Cross-section', du: 'ΔU', i: 'I', state: 'Operating state', dun: 'Deviation', pf: 'cos φ', p: 'P', s: 'S', q: 'Q' },
      status: { site: 'To be performed at the place of installation after connection to the final supply.', na: 'Not applicable.', skip: 'Not performed in this revision.', none: 'No measurement in this revision.' },
      s8: 'Functional Tests', s8ref: '(EN 60204-1 §18.6)',
      p8: 'The functions of the electrical equipment, particularly those related to safety and safeguarding, have been tested.',
      funcCols: ['No', 'Test', 'Expected result', 'Result', 'Date', 'Note'],
      sfRef: 'Risk assessment',
      s9: 'Conclusion and Approval',
      conclCols: ['Item', 'Test', 'Measured value range', 'Limit', 'Result'],
      verdict: {
        pass: (m) => `The electrical equipment of the <b>${m}</b> machine has been found <b>compliant</b> in the verification according to EN 60204-1:2018 Clause 18.`,
        cond: (m, x) => `The electrical equipment of the <b>${m}</b> machine has been found compliant in the tests performed; ${x} shall be completed.`,
        open: (m, x) => `The verification of the <b>${m}</b> machine is not complete: results pending for ${x}.`,
        fail: (m, x) => `The electrical equipment of the <b>${m}</b> machine has been found <b>not compliant</b> (${x}). After the non-conformities have been corrected, the relevant tests shall be repeated (§18.7).`
      },
      signTitle: 'Approval', signCols: ['', 'Name', 'Title', 'Date', 'Signature'],
      pill: { pass: 'PASS', fail: 'FAIL', open: 'OPEN', na: 'N/A', site: 'ON SITE', skip: 'NOT DONE', warn: 'CONDITIONAL' },
      sA: 'Measurement Screens', sB: 'Machine and Test Set-up Photographs',
      aGroups: { rpe: 'Protective bonding continuity (R<sub>PE</sub>)', vd: 'Voltage drop in the protective bonding circuit (ΔU)', loop: 'Fault loop impedance (Z<sub>s</sub>)', iso: 'Insulation resistance (R<sub>ISO</sub>)', hv: 'Voltage test (HV)', res: 'Residual voltage', leak: 'Protective conductor current (I<sub>PE</sub>)', pwr: 'Operating test (power measurement)' },
      std60204: 'EN 60204-1:2018 (IEC 60204-1:2016) applies to the electrical, electronic and programmable electronic equipment and systems of machines not portable by hand while working, including groups of machines working together in a coordinated manner, starting from the point of connection of the supply. It covers equipment with nominal supply voltages not exceeding 1000 V AC or 1500 V DC and nominal supply frequencies not exceeding 200 Hz, and specifies the verification of the electrical equipment in Clause 18.',
      activePassive: '<b>Active test:</b> tests performed with the machine energised — operating test (measurement of voltage, current and power with the machine running at maximum capacity), protective conductor current, residual voltage, Test 2 and functional tests. <b>Passive test:</b> tests performed with the supply disconnected — visual inspection, continuity and voltage drop of the protective bonding circuit, insulation resistance and voltage test.',
      h7vd: 'Voltage drop in the protective bonding circuit — high test current (§18.2.2 · §8.2.2)',
      p7vd: () => 'The current-carrying capability of the protective bonding circuit has been verified by measuring the voltage drop between the PE terminal and the relevant points at a high test current (≈ 10 A). Where the cross-section is given, the limit has been derived from EN 60204-1:2006 Table 9 (for 10 A: 1.0 mm² → 3.3 V · 1.5 mm² → 2.6 V · 2.5 mm² → 1.9 V · 4.0 mm² → 1.4 V · ≥ 6 mm² → 1.0 V) in proportion to the test current; otherwise the limit stated in the row has been used.',
      h7pwr: 'Operating test — supply voltage, current and power (active test, §4.3.2 · §16.4)',
      p7pwr: (l) => `The machine has been energised and operated at maximum capacity; supply voltage, current, power factor and active, apparent and reactive power have been measured during operation. The supply voltage has been compared with the nominal voltage (EN 60204-1 §4.3.2: steady-state voltage 90 % to 110 % of nominal; acceptance ±${l.uTol} %). The maximum measured current has been compared with the full-load current on the nameplate (§16.4).`,
      un: 'Nominal voltage',
      evl: {
        what: { rpe: 'R<sub>PE</sub>', vd: 'the voltage drop', loop: 'Z<sub>s</sub>', iso: 'R<sub>ISO</sub>', hv: 'the leakage current', res: 'the residual voltage', leak: 'the protective conductor current' },
        meas: (n, what, rng) => `In ${n} measurement${n > 1 ? 's' : ''} ${what} was ${rng}.`,
        allOk: (lim) => `All values meet the acceptance criterion (${lim}).`,
        someFail: (f, lim, list) => `${f} measurement${f > 1 ? 's do' : ' does'} not meet the acceptance criterion (${lim}): ${list}.`,
        tolFail: (list) => `The applied test current / voltage is out of tolerance: ${list}.`,
        hvOk: 'No breakdown or flashover was recorded during the test.',
        leakWarn: (lim) => `The protective conductor current exceeds ${lim} mA; the additional measures of §8.2.6 and a warning next to the PE terminal are required (G-15).`,
        pwr: (parts) => `During operation ${parts.join(', ')} were measured.`,
        pwrU: (u, un, du) => `a supply voltage of ${u} (nominal ${un}, deviation ${du})`,
        pwrI: (i, ir) => `a maximum current of ${i}${ir ? ` (nameplate: ${ir})` : ''}`,
        pwrPf: (v) => `a power factor of ${v}`,
        pwrP: (p, s, q) => `an active power of ${p}${s ? `, an apparent power of ${s}` : ''}${q ? `, a reactive power of ${q}` : ''}`,
        res: { pass: 'Result: <b>compliant</b>.', fail: 'Result: <b>not compliant</b>.', warn: 'Result: <b>conditional</b> (§8.2.6).', open: 'Result: <b>open</b> (values missing).' }
      },
      tab: 'Table', fig: 'Figure', lot: 'List of tables', lof: 'List of figures',
      tbl: { mach: 'Machine and electrical supply', cond: 'Test conditions', dev: 'Test equipment', prog: 'Test programme and summary of results (EN 60204-1 §18.1)', vis: 'Visual inspection and verification of documentation', rpe: 'Continuity of the protective bonding circuit — results', vd: 'Voltage drop — results', loop: 'Fault loop impedance — results', iso: 'Insulation resistance — results', hv: 'Voltage test — results', res: 'Residual voltage — results', leak: 'Protective conductor current — results', pwr: 'Operating test — measured values', func: 'Functional tests', sum: 'Summary of results', sign: 'Approval' },
      figA: (g) => `${g} — measurement screens`, figB: 'Machine, nameplate and test set-up photographs',
      discTitle: 'Validity and legal disclaimer',
      disc: [
        'This report applies solely to the machine identified above and covers the tests performed under the stated conditions on the stated test date. Subsequent modifications to the design, components, electrical connections or operating conditions of the machine may invalidate this report.',
        'Vibration, temperature fluctuations, humidity, dust and intensity of use may, over time, cause loosening of electrical connections, corrosion of conductive surfaces and deterioration of insulation. The measurement results reflect the condition of the machine at the time of testing and shall not be regarded as proof of continued compliance.',
        'The effectiveness of the protective bonding circuit also depends on the earthing system of the installation to which the machine is connected; the earthing of the installation shall be measured and documented separately.',
        'Maintaining compliance with occupational health and safety legislation and with EN 60204-1 throughout the service life of the machine is the responsibility of the operator. It is recommended that the electrical safety tests be repeated periodically (preferably at least once a year) by competent personnel and that the results be recorded. When the electrical equipment is modified, the relevant tests shall be repeated in accordance with EN 60204-1 §18.7.'
      ]
    },
    de: {
      dec: ',', fill: '[auszufüllen]', none: '—',
      hdrTitle: 'Elektrische Qualitäts- und Sicherheitsprüfung', pageWord: 'Seite', uncontrolled: 'Nicht gelenkte Kopie — nicht vervielfältigen', jobPrefix: 'Auftrag',
      cover: {
        kicker: 'PRÜFBERICHT QUALITÄT UND SICHERHEIT DER ELEKTRISCHEN ANLAGE', mark: 'LVD', std: '2014/35/EU<br>EN 60204-1:2018<br>Abschnitt 18<br>IEC 61557',
        rows: { job: 'Auftrags-Nr.', customer: 'Kunde', model: 'Modell', serial: 'Maschinen-Serien-Nr.', docNo: 'Bericht-Nr.', rev: 'Revision', date: 'Prüfdatum', pages: 'Seitenzahl' },
        sign: ['Erstellt', 'Geprüft', 'Freigegeben']
      },
      stamp: { draft: ['ENTWURF', 'Freigabe ausstehend'], final: ['FREIGEGEBEN', 'Genehmigt'] },
      confidential: 'Vervielfältigung und Weitergabe an Dritte ohne schriftliche Zustimmung des Herstellers untersagt.',
      noPhotos: '[Fotos ergänzen]', annex: 'Anhang', contents: 'Inhaltsverzeichnis', endOfReport: 'Ende des Berichts',
      revHist: 'Revisionsverlauf', revCols: ['Rev.', 'Datum', 'Beschreibung', 'Erstellt', 'Freigegeben'],
      firstIssue: 'Erstausgabe', revTbd: '[Beschreibung der Revision]',
      s1: 'Zweck und Umfang',
      purpose: (v) => `Dieser Bericht umfasst die Prüfung der elektrischen Ausrüstung der Maschine <b>${v.model}</b> (Serien-Nr. ${v.serial}, Auftrags-Nr. ${v.job}), hergestellt von ${v.manufacturer}, nach <b>EN 60204-1:2018 Abschnitt 18</b>. Die Prüfung umfasst die Sichtprüfung der Übereinstimmung der elektrischen Ausrüstung mit der technischen Dokumentation, die Durchgängigkeit des Schutzleitersystems, Isolationswiderstands- und Spannungsprüfungen, Messungen der Restspannung und des Schutzleiterstroms sowie Funktionsprüfungen.`,
      purpose2: 'Nach Maschinenrichtlinie 2006/42/EG Anhang I Nummer 1.5.1 muss die elektrische Ausrüstung der Maschine die Schutzziele der Niederspannungsrichtlinie 2014/35/EU erfüllen. Die Prüfungen in diesem Bericht wurden durchgeführt, um die Erfüllung dieser Ziele nachzuweisen.',
      linked: (ra) => `Dieser Bericht ist zusammen mit der Risikobeurteilung <b>${ra}</b> Teil der technischen Dokumentation der Maschine.`,
      s2: 'Rechtsvorschriften und Normen', stdCols: ['Referenz', 'Titel'],
      standards: [
        ['2014/35/EU', 'Niederspannungsrichtlinie (LVD)'],
        ['2006/42/EG · Anhang I 1.5.1', 'Maschinenrichtlinie — Gefährdungen durch elektrische Energie'],
        ['EN 60204-1:2018', 'Sicherheit von Maschinen — Elektrische Ausrüstung von Maschinen — Teil 1: Allgemeine Anforderungen'],
        ['EN 61557-1 / -2 / -3 / -4', 'Elektrische Sicherheit in Niederspannungsnetzen — Geräte zum Prüfen, Messen oder Überwachen von Schutzmaßnahmen'],
        ['ISO 7010', 'Graphische Symbole — Sicherheitsfarben und Sicherheitszeichen (W012)']
      ],
      s3: 'Maschine und elektrische Versorgung',
      mach: { manufacturer: 'Hersteller', model: 'Marke / Modell', serial: 'Serien-Nr. / Baujahr', type: 'Maschinenart', supply: 'Versorgung (Spannung / Phasen / Frequenz)', current: 'Bemessungsstrom (Volllast)', power: 'Installierte Leistung', network: 'Netzform', fuse: 'Vorsicherung', sccr: 'Kurzschlussfestigkeit', protClass: 'Schutzklasse', ip: 'Schutzart (IP)', connection: 'Netzanschluss' },
      s4: 'Prüfbedingungen und Prüfmittel',
      cond: { date: 'Prüfdatum / Uhrzeit', location: 'Prüfort', temp: 'Umgebungstemperatur', hum: 'Relative Luftfeuchte', ambient: 'Umgebungsbedingungen', testedBy: 'Prüfer', connection: 'Anschluss', method: 'Verfahren' },
      devTitle: 'Prüfmittel', devCols: ['Gerät', 'Marke / Modell', 'Serien-Nr.', 'Kalibrierung', 'Gültig bis', 'Status'],
      devNote: 'EN 60204-1 §18.1 sieht für die Prüfungen nach §18.2 und §18.3 Messgeräte nach der Normenreihe IEC 61557 vor.',
      calOk: 'gültig', calExp: 'abgelaufen',
      s5: 'Prüfprogramm und Ergebnisübersicht',
      p5: 'Nach EN 60204-1 §18.1 umfasst die Prüfung, wenn keine Produktnorm für die Maschine besteht, mindestens die Punkte a), b) und h); die Punkte c) – g) werden soweit anwendbar durchgeführt. Die Prüfungen wurden in der von der Norm empfohlenen Reihenfolge durchgeführt.',
      progCols: ['Punkt', 'Prüfung', 'Umfang', 'Annahmekriterium', 'Gemessen', 'Ergebnis'], critLabel: 'Annahmekriterium',
      req: 'verpflichtend', opt: 'soweit anwendbar', extra: 'zusätzliche Prüfung', mode: { on: 'aktive Prüfung', off: 'passive Prüfung' },
      crit: {
        visual: 'Keine Abweichung',
        rpe: (l) => `R<sub>PE</sub> ≤ ${l.rpeMax} Ω (I ≥ ${l.rpeI} A · ${l.rpeT} s)`,
        vd: 'ΔU ≤ ΔU<sub>max</sub> (EN 60204-1:2006 Tabelle 9 oder Grenzwert in der Zeile)',
        loop: 'Z<sub>s</sub> · I<sub>a</sub> ≤ U<sub>0</sub>',
        iso: (l) => `R<sub>ISO</sub> ≥ ${l.isoMin} MΩ (${l.isoU} V DC ±${l.isoTol} V)`,
        hv: (l) => `${l.hvU} V AC (±${l.hvTol} V) · ${l.hvT} s; kein Durchschlag (I ≤ ${l.hvMax} mA)`,
        pwr: (l) => `U = U<sub>n</sub> ±${l.uTol} %; I ≤ Volllaststrom laut Typschild`,
        res: (l) => `U ≤ ${l.resMax} V innerhalb ${l.resT} s`,
        leak: (l) => `I<sub>PE</sub> ≤ ${l.leakMax} mA; sonst Maßnahmen nach §8.2.6`,
        func: 'Alle Funktionen arbeiten bestimmungsgemäß'
      },
      s6: 'Sichtprüfung und Prüfung der Dokumentation', s6ref: '(EN 60204-1 §18.1 a)',
      p6: 'Die elektrische Ausrüstung wurde mit den Stromlaufplänen und der technischen Dokumentation abgeglichen und anhand der folgenden Punkte geprüft.',
      visCols: ['Nr.', 'Prüfpunkt', 'Abschnitt', 'Ergebnis', 'Hinweis / Nachweis'],
      legend: '<b>i.O.</b>: in Ordnung · <b>n.i.O.</b>: nicht in Ordnung · <b>entf.</b>: entfällt',
      res: { ok: 'i.O.', nok: 'n.i.O.', na: 'entf.', open: '—' },
      s7: 'Mess- und Prüfergebnisse', s7ref: '(EN 60204-1 §18.2 – §18.5, §8.2.6)',
      h71: 'Durchgängigkeit des Schutzleitersystems — Prüfung 1 (§18.2.2)',
      p71: (l) => `Der Widerstand jedes Schutzleiterkreises wurde zwischen dem Schutzleiterkontakt des Netzsteckers / der PE-Klemme und den jeweiligen Punkten mit einem Prüfstrom von ${l.rpeI} A für ${l.rpeT} s gemessen. Der gemessene Widerstand muss im erwarteten Bereich für Länge, Querschnitt und Werkstoff des zugehörigen Schutzleiters liegen; als Annahmekriterium wurden ${l.rpeMax} Ω verwendet.`,
      h72: 'Bedingungen der automatischen Abschaltung — Prüfung 2 (§18.2.3)',
      p72: (l) => `Die Fehlerschleifenimpedanz Z<sub>s</sub> wurde gemessen und mit dem Abschaltstrom I<sub>a</sub> der Überstromschutzeinrichtung verglichen: Z<sub>s</sub> ≤ U<sub>0</sub> / I<sub>a</sub> (U<sub>0</sub> = ${l.u0} V; unverzögerter Auslösestrom I<sub>a</sub>: B 5 · I<sub>n</sub>, C 10 · I<sub>n</sub>, D 20 · I<sub>n</sub>).`,
      h73: 'Isolationswiderstand (§18.3)',
      p73: (l) => `Der Isolationswiderstand wurde zwischen den Leitern der Hauptstromkreise und dem Schutzleitersystem sowie zwischen Leiterpaaren mit ${l.isoU} V DC für ${l.isoT} s gemessen. Annahmekriterium: ≥ ${l.isoMin} MΩ.`,
      h74: 'Spannungsprüfung (§18.4)',
      p74: (l) => `Die Prüfspannung wurde zwischen den Leitern aller Stromkreise und dem Schutzleitersystem mit ${l.hvU} V AC (50 Hz) für ${l.hvT} s angelegt. Die Norm fordert den größeren Wert aus dem Zweifachen der Bemessungsspannung oder 1000 V für mindestens 1 s. Annahmekriterium: kein Durchschlag (Ableitstromgrenze des Prüfgeräts ${l.hvMax} mA).`,
      h75: 'Schutz gegen Restspannungen (§18.5)',
      p75: (l) => `An berührbaren Teilen, die nach dem Abschalten der Versorgung Spannung führen können (Steckerstifte, im Schaltschrank), wurde die Spannung gemessen. Annahmekriterium: ≤ ${l.resMax} V innerhalb von ${l.resT} s nach dem Abschalten (an Steckerstiften 1 s).`,
      h76: 'Schutzleiterstrom (§8.2.6)',
      p76: (l) => `Der Schutzleiterstrom wurde bei laufender Maschine gemessen. Überschreitet er ${l.leakMax} mA nicht, entfallen die zusätzlichen Anforderungen nach §8.2.6 (Schutzleiter mindestens 10 mm² Cu, zweiter Schutzleiter oder automatische Abschaltung bei Unterbrechung des Schutzleiters sowie Warnhinweis).`,
      cols: { no: 'Nr.', time: 'Uhrzeit', point: 'Messpunkt', circuit: 'Gemessener Stromkreis', itest: 'I<sub>Prüf</sub>', uiso: 'U<sub>ISO</sub>', umeas: 'U<sub>gemessen</sub>', limit: 'Grenzwert', ev: 'Bew.', photo: 'Foto', device: 'Schutzeinrichtung', zs: 'Z<sub>s</sub> gemessen', zsmax: 'Z<sub>s,max</sub>', t: 't', u: 'U', ipe: 'I<sub>PE</sub>', imeas: 'I<sub>gemessen</sub>', cs: 'Querschnitt', du: 'ΔU', i: 'I', state: 'Betriebszustand', dun: 'Abweichung', pf: 'cos φ', p: 'P', s: 'S', q: 'Q' },
      status: { site: 'Wird am Aufstellungsort nach Anschluss an die endgültige Versorgung durchgeführt.', na: 'Entfällt.', skip: 'In dieser Revision nicht durchgeführt.', none: 'In dieser Revision keine Messung.' },
      s8: 'Funktionsprüfungen', s8ref: '(EN 60204-1 §18.6)',
      p8: 'Die Funktionen der elektrischen Ausrüstung, insbesondere die sicherheitsbezogenen und schützenden, wurden geprüft.',
      funcCols: ['Nr.', 'Prüfung', 'Erwartetes Ergebnis', 'Ergebnis', 'Datum', 'Hinweis'],
      sfRef: 'Risikobeurteilung',
      s9: 'Ergebnis und Freigabe',
      conclCols: ['Punkt', 'Prüfung', 'Messwertbereich', 'Grenzwert', 'Ergebnis'],
      verdict: {
        pass: (m) => `Die elektrische Ausrüstung der Maschine <b>${m}</b> wurde bei der Prüfung nach EN 60204-1:2018 Abschnitt 18 als <b>in Ordnung</b> befunden.`,
        cond: (m, x) => `Die elektrische Ausrüstung der Maschine <b>${m}</b> wurde in den durchgeführten Prüfungen als in Ordnung befunden; ${x} ist abzuschließen.`,
        open: (m, x) => `Die Prüfung der Maschine <b>${m}</b> ist nicht abgeschlossen: Ergebnisse ausstehend für ${x}.`,
        fail: (m, x) => `Die elektrische Ausrüstung der Maschine <b>${m}</b> wurde als <b>nicht in Ordnung</b> befunden (${x}). Nach Beseitigung der Abweichungen sind die betroffenen Prüfungen zu wiederholen (§18.7).`
      },
      signTitle: 'Freigabe', signCols: ['', 'Name', 'Funktion', 'Datum', 'Unterschrift'],
      pill: { pass: 'i.O.', fail: 'n.i.O.', open: 'OFFEN', na: 'ENTF.', site: 'VOR ORT', skip: 'NICHT DURCHGEF.', warn: 'BEDINGT' },
      sA: 'Messanzeigen', sB: 'Fotos der Maschine und des Prüfaufbaus',
      aGroups: { rpe: 'Durchgängigkeit des Schutzleitersystems (R<sub>PE</sub>)', vd: 'Spannungsfall im Schutzleitersystem (ΔU)', loop: 'Fehlerschleifenimpedanz (Z<sub>s</sub>)', iso: 'Isolationswiderstand (R<sub>ISO</sub>)', hv: 'Spannungsprüfung (HV)', res: 'Restspannung', leak: 'Schutzleiterstrom (I<sub>PE</sub>)', pwr: 'Betriebsprüfung (Leistungsmessung)' },
      std60204: 'EN 60204-1:2018 (IEC 60204-1:2016) gilt für die elektrische, elektronische und programmierbare elektronische Ausrüstung und Systeme von Maschinen, die während des Betriebs nicht von Hand getragen werden, einschließlich zusammenwirkender Maschinengruppen, beginnend an der Anschlussstelle der Versorgung. Sie erfasst Ausrüstungen mit Bemessungsspannungen bis 1000 V AC bzw. 1500 V DC und Bemessungsfrequenzen bis 200 Hz und legt in Abschnitt 18 die Prüfung der elektrischen Ausrüstung fest.',
      activePassive: '<b>Aktive Prüfung:</b> Prüfungen an der eingeschalteten Maschine — Betriebsprüfung (Messung von Spannung, Strom und Leistung bei maximaler Auslastung), Schutzleiterstrom, Restspannung, Prüfung 2 und Funktionsprüfungen. <b>Passive Prüfung:</b> Prüfungen bei abgeschalteter Versorgung — Sichtprüfung, Durchgängigkeit und Spannungsfall des Schutzleitersystems, Isolationswiderstand und Spannungsprüfung.',
      h7vd: 'Spannungsfall im Schutzleitersystem — hoher Prüfstrom (§18.2.2 · §8.2.2)',
      p7vd: () => 'Die Strombelastbarkeit des Schutzleitersystems wurde durch Messung des Spannungsfalls zwischen der PE-Klemme und den jeweiligen Punkten bei hohem Prüfstrom (≈ 10 A) nachgewiesen. Ist der Querschnitt angegeben, wurde der Grenzwert aus EN 60204-1:2006 Tabelle 9 (für 10 A: 1,0 mm² → 3,3 V · 1,5 mm² → 2,6 V · 2,5 mm² → 1,9 V · 4,0 mm² → 1,4 V · ≥ 6 mm² → 1,0 V) im Verhältnis zum Prüfstrom berechnet; andernfalls wurde der in der Zeile angegebene Grenzwert verwendet.',
      h7pwr: 'Betriebsprüfung — Versorgungsspannung, Strom und Leistung (aktive Prüfung, §4.3.2 · §16.4)',
      p7pwr: (l) => `Die Maschine wurde eingeschaltet und mit maximaler Auslastung betrieben; während des Betriebs wurden Versorgungsspannung, Strom, Leistungsfaktor sowie Wirk-, Schein- und Blindleistung gemessen. Die Versorgungsspannung wurde mit der Nennspannung verglichen (EN 60204-1 §4.3.2: stationäre Spannung 90 % bis 110 % der Nennspannung; Annahme ±${l.uTol} %). Der höchste gemessene Strom wurde mit dem Volllaststrom auf dem Typschild verglichen (§16.4).`,
      un: 'Nennspannung',
      evl: {
        what: { rpe: 'R<sub>PE</sub>', vd: 'der Spannungsfall', loop: 'Z<sub>s</sub>', iso: 'R<sub>ISO</sub>', hv: 'der Ableitstrom', res: 'die Restspannung', leak: 'der Schutzleiterstrom' },
        meas: (n, what, rng) => `Bei ${n} Messung${n > 1 ? 'en' : ''} betrug ${what} ${rng}.`,
        allOk: (lim) => `Alle Werte erfüllen das Annahmekriterium (${lim}).`,
        someFail: (f, lim, list) => `${f} Messung${f > 1 ? 'en erfüllen' : ' erfüllt'} das Annahmekriterium (${lim}) nicht: ${list}.`,
        tolFail: (list) => `Der angelegte Prüfstrom / die Prüfspannung liegt außerhalb der Toleranz: ${list}.`,
        hvOk: 'Während der Prüfung wurde kein Durchschlag oder Überschlag festgestellt.',
        leakWarn: (lim) => `Der Schutzleiterstrom überschreitet ${lim} mA; die zusätzlichen Maßnahmen nach §8.2.6 und ein Warnhinweis an der PE-Klemme sind erforderlich (G-15).`,
        pwr: (parts) => `Während des Betriebs wurden ${parts.join(', ')} gemessen.`,
        pwrU: (u, un, du) => `eine Versorgungsspannung von ${u} (Nenn ${un}, Abweichung ${du})`,
        pwrI: (i, ir) => `ein Höchststrom von ${i}${ir ? ` (Typschild: ${ir})` : ''}`,
        pwrPf: (v) => `ein Leistungsfaktor von ${v}`,
        pwrP: (p, s, q) => `eine Wirkleistung von ${p}${s ? `, eine Scheinleistung von ${s}` : ''}${q ? `, eine Blindleistung von ${q}` : ''}`,
        res: { pass: 'Ergebnis: <b>in Ordnung</b>.', fail: 'Ergebnis: <b>nicht in Ordnung</b>.', warn: 'Ergebnis: <b>bedingt</b> (§8.2.6).', open: 'Ergebnis: <b>offen</b> (Werte fehlen).' }
      },
      tab: 'Tabelle', fig: 'Bild', lot: 'Tabellenverzeichnis', lof: 'Abbildungsverzeichnis',
      tbl: { mach: 'Maschine und elektrische Versorgung', cond: 'Prüfbedingungen', dev: 'Prüfmittel', prog: 'Prüfprogramm und Ergebnisübersicht (EN 60204-1 §18.1)', vis: 'Sichtprüfung und Prüfung der Dokumentation', rpe: 'Durchgängigkeit des Schutzleitersystems — Ergebnisse', vd: 'Spannungsfall — Ergebnisse', loop: 'Fehlerschleifenimpedanz — Ergebnisse', iso: 'Isolationswiderstand — Ergebnisse', hv: 'Spannungsprüfung — Ergebnisse', res: 'Restspannung — Ergebnisse', leak: 'Schutzleiterstrom — Ergebnisse', pwr: 'Betriebsprüfung — Messwerte', func: 'Funktionsprüfungen', sum: 'Ergebnisübersicht', sign: 'Freigabe' },
      figA: (g) => `${g} — Messanzeigen`, figB: 'Fotos der Maschine, des Typschilds und des Prüfaufbaus',
      discTitle: 'Gültigkeit und rechtlicher Hinweis',
      disc: [
        'Dieser Bericht gilt ausschließlich für die oben bezeichnete Maschine und umfasst die unter den angegebenen Bedingungen am angegebenen Prüfdatum durchgeführten Prüfungen. Spätere Änderungen an Konstruktion, Bauteilen, elektrischen Anschlüssen oder Betriebsbedingungen der Maschine können die Gültigkeit dieses Berichts aufheben.',
        'Vibrationen, Temperaturschwankungen, Feuchtigkeit, Staub und Nutzungsintensität können im Laufe der Zeit zum Lockern elektrischer Verbindungen, zur Korrosion leitfähiger Oberflächen und zur Alterung der Isolierung führen. Die Messergebnisse geben den Zustand der Maschine zum Zeitpunkt der Prüfung wieder und sind nicht als Nachweis einer dauerhaften Konformität zu betrachten.',
        'Die Wirksamkeit des Schutzleitersystems hängt auch von der Erdungsanlage des Aufstellungsortes ab, an die die Maschine angeschlossen wird; die Erdung der Anlage ist gesondert zu messen und zu dokumentieren.',
        'Die Aufrechterhaltung der Konformität mit den Arbeitsschutzvorschriften und der EN 60204-1 während der gesamten Lebensdauer der Maschine liegt in der Verantwortung des Betreibers. Es wird empfohlen, die elektrischen Sicherheitsprüfungen regelmäßig (vorzugsweise mindestens einmal jährlich) durch befähigtes Personal zu wiederholen und die Ergebnisse zu dokumentieren. Bei Änderungen an der elektrischen Ausrüstung sind die betroffenen Prüfungen nach EN 60204-1 §18.7 zu wiederholen.'
      ]
    }
  };

  return { L3, TESTS, MEAS, LIMITS, TRIP_K, VD_TABLE, vdLimit, GROUPS, VISUAL, FUNC, PHOTO_RULES, photoRule, photoName, PHOTO_KINDS, pairText, PAIRS_3N, T };
});
