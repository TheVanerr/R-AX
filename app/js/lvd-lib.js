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
  const TESTS = [
    { key: 'visual', letter: 'a', clause: '§18.1 a', req: true,
      name: L3('Elektrik donanımının teknik dokümantasyona uygunluğunun doğrulanması (gözle kontrol)', 'Verification that the electrical equipment complies with its technical documentation (visual inspection)', 'Prüfung der Übereinstimmung der elektrischen Ausrüstung mit der technischen Dokumentation (Sichtprüfung)') },
    { key: 'rpe', letter: 'b', clause: '§18.2.2', req: true,
      name: L3('Koruyucu bağlama devresinin sürekliliği (Test 1)', 'Continuity of the protective bonding circuit (Test 1)', 'Durchgängigkeit des Schutzleitersystems (Prüfung 1)') },
    { key: 'loop', letter: 'c', clause: '§18.2.3', req: false,
      name: L3('Otomatik kesme koşulları: hata döngüsü empedansı ve aşırı akım koruma cihazı (Test 2)', 'Conditions for automatic disconnection: fault loop impedance and overcurrent protective device (Test 2)', 'Bedingungen der automatischen Abschaltung: Fehlerschleifenimpedanz und Überstromschutzeinrichtung (Prüfung 2)') },
    { key: 'iso', letter: 'd', clause: '§18.3', req: false,
      name: L3('Yalıtım direnci testi', 'Insulation resistance test', 'Isolationswiderstandsprüfung') },
    { key: 'hv', letter: 'e', clause: '§18.4', req: false,
      name: L3('Gerilim testi', 'Voltage test', 'Spannungsprüfung') },
    { key: 'res', letter: 'f', clause: '§18.5', req: false,
      name: L3('Artık gerilimlere karşı koruma', 'Protection against residual voltages', 'Schutz gegen Restspannungen') },
    { key: 'leak', letter: 'g', clause: '§8.2.6', req: false,
      name: L3('Koruma iletkeni akımı (§8.2.6 gerekliliklerinin doğrulanması)', 'Protective conductor current (verification of the requirements of §8.2.6)', 'Schutzleiterstrom (Prüfung der Anforderungen nach §8.2.6)') },
    { key: 'func', letter: 'h', clause: '§18.6', req: true,
      name: L3('Fonksiyon testleri', 'Functional tests', 'Funktionsprüfungen') }
  ];
  const MEAS = ['rpe', 'loop', 'iso', 'hv', 'res', 'leak'];

  /** Varsayılan test parametreleri ve kabul kriterleri. rpe/iso/hv risk analizindeki elektrik testleriyle aynıdır. */
  const LIMITS = { rpeI: 0.2, rpeT: 5, rpeMax: 0.10, isoU: 500, isoT: 10, isoMin: 1.00, hvU: 1500, hvT: 5, hvMax: 1.50, leakMax: 10, resMax: 60, resT: 5, u0: 230 };
  /** Anlık açma akımı katsayısı (I_a = k · I_n): B, C, D eğrisi */
  const TRIP_K = { B: 5, C: 10, D: 20, K: 14, Z: 3 };

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
      hdrTitle: 'LVD Test Raporu', pageWord: 'Sayfa', uncontrolled: 'Kontrolsüz kopya — çoğaltılamaz', jobPrefix: 'İş No',
      cover: {
        kicker: 'ELEKTRİKSEL GÜVENLİK TEST RAPORU', mark: 'LVD', std: '2014/35/AB<br>EN 60204-1:2018<br>Bölüm 18<br>IEC 61557',
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
      cond: { date: 'Test tarihi / saati', location: 'Test yeri', ambient: 'Ortam koşulları', testedBy: 'Test eden', connection: 'Bağlantı', method: 'Yöntem' },
      devTitle: 'Test cihazları', devCols: ['Cihaz', 'Marka / model', 'Seri no', 'Kalibrasyon', 'Geçerlilik', 'Durum'],
      devNote: 'EN 60204-1 §18.1, §18.2 ve §18.3 testleri için IEC 61557 serisine uygun ölçüm cihazlarının kullanılmasını öngörür.',
      calOk: 'geçerli', calExp: 'süresi dolmuş',
      s5: 'Test Programı ve Sonuç Özeti',
      p5: 'EN 60204-1 §18.1\'e göre makineye özgü bir ürün standardı yoksa doğrulama en az a), b) ve h) maddelerini kapsar; c) – g) maddeleri uygulanabildiği ölçüde yapılır. Testler standartta önerilen sırayla yapılmıştır.',
      progCols: ['Madde', 'Test', 'Kapsam', 'Kabul kriteri', 'Adet', 'Sonuç'], critLabel: 'Kabul kriteri',
      req: 'zorunlu', opt: 'uygulanabilir',
      crit: {
        visual: 'Uygunsuzluk bulunmamalı',
        rpe: (l) => `R<sub>PE</sub> ≤ ${l.rpeMax} Ω (${l.rpeI} A · ${l.rpeT} s)`,
        loop: 'Z<sub>s</sub> · I<sub>a</sub> ≤ U<sub>0</sub>',
        iso: (l) => `R<sub>ISO</sub> ≥ ${l.isoMin} MΩ (${l.isoU} V DC)`,
        hv: (l) => `${l.hvU} V AC · ${l.hvT} s; delinme yok (I ≤ ${l.hvMax} mA)`,
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
      cols: { no: 'No', time: 'Saat', point: 'Ölçüm noktası', circuit: 'Ölçülen devre', itest: 'I<sub>test</sub>', uiso: 'U<sub>ISO</sub>', umeas: 'U<sub>ölçülen</sub>', limit: 'Limit', ev: 'Değ.', photo: 'Foto', device: 'Koruma cihazı', zs: 'Z<sub>s</sub> ölçülen', zsmax: 'Z<sub>s,max</sub>', t: 't', u: 'U', ipe: 'I<sub>PE</sub>' },
      status: { site: 'Kurulum yerinde, makine nihai beslemeye bağlandıktan sonra yapılacaktır.', na: 'Uygulanamaz.', skip: 'Bu revizyonda yapılmamıştır.', none: 'Bu revizyonda ölçüm yapılmamıştır.' },
      s8: 'Fonksiyon Testleri', s8ref: '(EN 60204-1 §18.6)',
      p8: 'Elektrik donanımının fonksiyonları, özellikle güvenlik ve koruma ile ilgili olanlar, denenmiştir.',
      funcCols: ['No', 'Test', 'Beklenen sonuç', 'Sonuç', 'Tarih', 'Not'],
      sfRef: 'Risk analizi',
      s9: 'Sonuç ve Onay',
      conclCols: ['Madde', 'Test', 'Sonuç'],
      verdict: {
        pass: (m) => `<b>${m}</b> makinesinin elektrik donanımı, EN 60204-1:2018 Bölüm 18'e göre yapılan doğrulamada <b>uygun</b> bulunmuştur.`,
        cond: (m, x) => `<b>${m}</b> makinesinin elektrik donanımı yapılan testlerde uygun bulunmuştur; ${x} tamamlanmalıdır.`,
        open: (m, x) => `<b>${m}</b> makinesinin doğrulaması tamamlanmamıştır: ${x} sonucu bekleniyor.`,
        fail: (m, x) => `<b>${m}</b> makinesinin elektrik donanımı <b>uygun bulunmamıştır</b> (${x}). Uygunsuzluklar giderildikten sonra ilgili testler tekrarlanmalıdır (§18.7).`
      },
      signTitle: 'Onay', signCols: ['', 'Ad Soyad', 'Unvan', 'Tarih', 'İmza'],
      pill: { pass: 'UYGUN', fail: 'UYGUN DEĞİL', open: 'AÇIK', na: 'UY', site: 'KURULUMDA', skip: 'YAPILMADI', warn: 'KOŞULLU' },
      sA: 'Ölçüm Ekranları', sB: 'Makine ve Test Kurulumu Fotoğrafları',
      aGroups: { rpe: 'Koruyucu bağlama devresi sürekliliği (R<sub>PE</sub>)', loop: 'Hata döngüsü empedansı (Z<sub>s</sub>)', iso: 'Yalıtım direnci (R<sub>ISO</sub>)', hv: 'Gerilim testi (HV)', res: 'Artık gerilim', leak: 'Koruma iletkeni akımı (I<sub>PE</sub>)' }
    },
    en: {
      dec: '.', fill: '[to be filled]', none: '—',
      hdrTitle: 'LVD Test Report', pageWord: 'Page', uncontrolled: 'Uncontrolled copy — do not reproduce', jobPrefix: 'Job No',
      cover: {
        kicker: 'ELECTRICAL SAFETY TEST REPORT', mark: 'LVD', std: '2014/35/EU<br>EN 60204-1:2018<br>Clause 18<br>IEC 61557',
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
      cond: { date: 'Test date / time', location: 'Test location', ambient: 'Ambient conditions', testedBy: 'Tested by', connection: 'Connection', method: 'Method' },
      devTitle: 'Test equipment', devCols: ['Instrument', 'Brand / model', 'Serial no', 'Calibration', 'Valid until', 'Status'],
      devNote: 'EN 60204-1 §18.1 specifies measuring equipment in accordance with the IEC 61557 series for the tests of §18.2 and §18.3.',
      calOk: 'valid', calExp: 'expired',
      s5: 'Test Programme and Summary of Results',
      p5: 'According to EN 60204-1 §18.1, where there is no dedicated product standard for the machine, the verification shall include at least items a), b) and h); items c) – g) are performed as applicable. The tests have been performed in the sequence recommended by the standard.',
      progCols: ['Item', 'Test', 'Scope', 'Acceptance criterion', 'Qty', 'Result'], critLabel: 'Acceptance criterion',
      req: 'mandatory', opt: 'as applicable',
      crit: {
        visual: 'No non-conformity',
        rpe: (l) => `R<sub>PE</sub> ≤ ${l.rpeMax} Ω (${l.rpeI} A · ${l.rpeT} s)`,
        loop: 'Z<sub>s</sub> · I<sub>a</sub> ≤ U<sub>0</sub>',
        iso: (l) => `R<sub>ISO</sub> ≥ ${l.isoMin} MΩ (${l.isoU} V DC)`,
        hv: (l) => `${l.hvU} V AC · ${l.hvT} s; no breakdown (I ≤ ${l.hvMax} mA)`,
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
      cols: { no: 'No', time: 'Time', point: 'Measuring point', circuit: 'Circuit measured', itest: 'I<sub>test</sub>', uiso: 'U<sub>ISO</sub>', umeas: 'U<sub>measured</sub>', limit: 'Limit', ev: 'Eval.', photo: 'Photo', device: 'Protective device', zs: 'Z<sub>s</sub> measured', zsmax: 'Z<sub>s,max</sub>', t: 't', u: 'U', ipe: 'I<sub>PE</sub>' },
      status: { site: 'To be performed at the place of installation after connection to the final supply.', na: 'Not applicable.', skip: 'Not performed in this revision.', none: 'No measurement in this revision.' },
      s8: 'Functional Tests', s8ref: '(EN 60204-1 §18.6)',
      p8: 'The functions of the electrical equipment, particularly those related to safety and safeguarding, have been tested.',
      funcCols: ['No', 'Test', 'Expected result', 'Result', 'Date', 'Note'],
      sfRef: 'Risk assessment',
      s9: 'Conclusion and Approval',
      conclCols: ['Item', 'Test', 'Result'],
      verdict: {
        pass: (m) => `The electrical equipment of the <b>${m}</b> machine has been found <b>compliant</b> in the verification according to EN 60204-1:2018 Clause 18.`,
        cond: (m, x) => `The electrical equipment of the <b>${m}</b> machine has been found compliant in the tests performed; ${x} shall be completed.`,
        open: (m, x) => `The verification of the <b>${m}</b> machine is not complete: results pending for ${x}.`,
        fail: (m, x) => `The electrical equipment of the <b>${m}</b> machine has been found <b>not compliant</b> (${x}). After the non-conformities have been corrected, the relevant tests shall be repeated (§18.7).`
      },
      signTitle: 'Approval', signCols: ['', 'Name', 'Title', 'Date', 'Signature'],
      pill: { pass: 'PASS', fail: 'FAIL', open: 'OPEN', na: 'N/A', site: 'ON SITE', skip: 'NOT DONE', warn: 'CONDITIONAL' },
      sA: 'Measurement Screens', sB: 'Machine and Test Set-up Photographs',
      aGroups: { rpe: 'Protective bonding continuity (R<sub>PE</sub>)', loop: 'Fault loop impedance (Z<sub>s</sub>)', iso: 'Insulation resistance (R<sub>ISO</sub>)', hv: 'Voltage test (HV)', res: 'Residual voltage', leak: 'Protective conductor current (I<sub>PE</sub>)' }
    },
    de: {
      dec: ',', fill: '[auszufüllen]', none: '—',
      hdrTitle: 'LVD-Prüfbericht', pageWord: 'Seite', uncontrolled: 'Nicht gelenkte Kopie — nicht vervielfältigen', jobPrefix: 'Auftrag',
      cover: {
        kicker: 'PRÜFBERICHT ELEKTRISCHE SICHERHEIT', mark: 'LVD', std: '2014/35/EU<br>EN 60204-1:2018<br>Abschnitt 18<br>IEC 61557',
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
      cond: { date: 'Prüfdatum / Uhrzeit', location: 'Prüfort', ambient: 'Umgebungsbedingungen', testedBy: 'Prüfer', connection: 'Anschluss', method: 'Verfahren' },
      devTitle: 'Prüfmittel', devCols: ['Gerät', 'Marke / Modell', 'Serien-Nr.', 'Kalibrierung', 'Gültig bis', 'Status'],
      devNote: 'EN 60204-1 §18.1 sieht für die Prüfungen nach §18.2 und §18.3 Messgeräte nach der Normenreihe IEC 61557 vor.',
      calOk: 'gültig', calExp: 'abgelaufen',
      s5: 'Prüfprogramm und Ergebnisübersicht',
      p5: 'Nach EN 60204-1 §18.1 umfasst die Prüfung, wenn keine Produktnorm für die Maschine besteht, mindestens die Punkte a), b) und h); die Punkte c) – g) werden soweit anwendbar durchgeführt. Die Prüfungen wurden in der von der Norm empfohlenen Reihenfolge durchgeführt.',
      progCols: ['Punkt', 'Prüfung', 'Umfang', 'Annahmekriterium', 'Anz.', 'Ergebnis'], critLabel: 'Annahmekriterium',
      req: 'verpflichtend', opt: 'soweit anwendbar',
      crit: {
        visual: 'Keine Abweichung',
        rpe: (l) => `R<sub>PE</sub> ≤ ${l.rpeMax} Ω (${l.rpeI} A · ${l.rpeT} s)`,
        loop: 'Z<sub>s</sub> · I<sub>a</sub> ≤ U<sub>0</sub>',
        iso: (l) => `R<sub>ISO</sub> ≥ ${l.isoMin} MΩ (${l.isoU} V DC)`,
        hv: (l) => `${l.hvU} V AC · ${l.hvT} s; kein Durchschlag (I ≤ ${l.hvMax} mA)`,
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
      cols: { no: 'Nr.', time: 'Uhrzeit', point: 'Messpunkt', circuit: 'Gemessener Stromkreis', itest: 'I<sub>Prüf</sub>', uiso: 'U<sub>ISO</sub>', umeas: 'U<sub>gemessen</sub>', limit: 'Grenzwert', ev: 'Bew.', photo: 'Foto', device: 'Schutzeinrichtung', zs: 'Z<sub>s</sub> gemessen', zsmax: 'Z<sub>s,max</sub>', t: 't', u: 'U', ipe: 'I<sub>PE</sub>' },
      status: { site: 'Wird am Aufstellungsort nach Anschluss an die endgültige Versorgung durchgeführt.', na: 'Entfällt.', skip: 'In dieser Revision nicht durchgeführt.', none: 'In dieser Revision keine Messung.' },
      s8: 'Funktionsprüfungen', s8ref: '(EN 60204-1 §18.6)',
      p8: 'Die Funktionen der elektrischen Ausrüstung, insbesondere die sicherheitsbezogenen und schützenden, wurden geprüft.',
      funcCols: ['Nr.', 'Prüfung', 'Erwartetes Ergebnis', 'Ergebnis', 'Datum', 'Hinweis'],
      sfRef: 'Risikobeurteilung',
      s9: 'Ergebnis und Freigabe',
      conclCols: ['Punkt', 'Prüfung', 'Ergebnis'],
      verdict: {
        pass: (m) => `Die elektrische Ausrüstung der Maschine <b>${m}</b> wurde bei der Prüfung nach EN 60204-1:2018 Abschnitt 18 als <b>in Ordnung</b> befunden.`,
        cond: (m, x) => `Die elektrische Ausrüstung der Maschine <b>${m}</b> wurde in den durchgeführten Prüfungen als in Ordnung befunden; ${x} ist abzuschließen.`,
        open: (m, x) => `Die Prüfung der Maschine <b>${m}</b> ist nicht abgeschlossen: Ergebnisse ausstehend für ${x}.`,
        fail: (m, x) => `Die elektrische Ausrüstung der Maschine <b>${m}</b> wurde als <b>nicht in Ordnung</b> befunden (${x}). Nach Beseitigung der Abweichungen sind die betroffenen Prüfungen zu wiederholen (§18.7).`
      },
      signTitle: 'Freigabe', signCols: ['', 'Name', 'Funktion', 'Datum', 'Unterschrift'],
      pill: { pass: 'i.O.', fail: 'n.i.O.', open: 'OFFEN', na: 'ENTF.', site: 'VOR ORT', skip: 'NICHT DURCHGEF.', warn: 'BEDINGT' },
      sA: 'Messanzeigen', sB: 'Fotos der Maschine und des Prüfaufbaus',
      aGroups: { rpe: 'Durchgängigkeit des Schutzleitersystems (R<sub>PE</sub>)', loop: 'Fehlerschleifenimpedanz (Z<sub>s</sub>)', iso: 'Isolationswiderstand (R<sub>ISO</sub>)', hv: 'Spannungsprüfung (HV)', res: 'Restspannung', leak: 'Schutzleiterstrom (I<sub>PE</sub>)' }
    }
  };

  return { L3, TESTS, MEAS, LIMITS, TRIP_K, GROUPS, VISUAL, FUNC, PHOTO_RULES, photoRule, photoName, PHOTO_KINDS, pairText, PAIRS_3N, T };
});
