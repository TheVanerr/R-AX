/* Kütüphane: tehlikeler, güvenlik fonksiyonları, testler, standartlar, işaretler, CCF, teknik veri başlıkları,
   ölçüm kuralları için sınır değer tabloları. Tehlike ve SF metinleri KBN 1B 1500 raporundan derlenmiştir.
   Tarayıcıda RA_LIB, Node’da module.exports. */

(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.RA_LIB = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const LIB = {
 "hazards": [
  {
   "key": "lid_crush",
   "cat": "mech",
   "sf": null,
   "o": 4,
   "s": 3,
   "o2": 2,
   "s2": 3,
   "tr": {
    "type": "Mekanik — ezilme",
    "sit": "Kapak kapanırken operatörün el/parmaklarının kapak alt kenarı ile damlama kanalı/gövde arasında kalması",
    "phase": "Yükleme, boşaltma",
    "meas": [
     [
      0,
      "Gaz amortisörlerle kontrollü, yavaş kapanma"
     ],
     [
      1,
      "Ezilme aralığı ≥ 25 mm veya tutamak ezilme hattından ≥ 100 mm uzakta (EN ISO 13854)"
     ],
     [
      2,
      "W024 etiketi; kılavuzda kapak kullanım talimatı"
     ]
    ]
   },
   "en": {
    "type": "Mechanical — crushing",
    "sit": "Operator's hand/fingers caught between the lower lid edge and the drip channel/frame while the lid closes",
    "phase": "Loading, unloading",
    "meas": [
     [
      0,
      "Controlled, slow closing by gas springs"
     ],
     [
      1,
      "Crushing gap ≥ 25 mm or handle ≥ 100 mm away from the crushing line (EN ISO 13854)"
     ],
     [
      2,
      "W024 label; lid handling instruction in the manual"
     ]
    ]
   },
   "de": {
    "type": "Mechanisch — Quetschen",
    "sit": "Hand/Finger des Bedieners geraten beim Schließen zwischen Deckelunterkante und Tropfrinne/Gehäuse",
    "phase": "Beladen, Entladen",
    "meas": [
     [
      0,
      "Kontrolliertes, langsames Schließen durch Gasdruckfedern"
     ],
     [
      1,
      "Quetschspalt ≥ 25 mm oder Griff ≥ 100 mm von der Quetschlinie (EN ISO 13854)"
     ],
     [
      2,
      "Schild W024; Bedienanweisung Deckel in der Betriebsanleitung"
     ]
    ]
   }
  },
  {
   "key": "gas_spring",
   "cat": "mech",
   "sf": null,
   "o": 3,
   "s": 4,
   "o2": 1,
   "s2": 4,
   "tr": {
    "type": "Mekanik — darbe / ezilme (yerçekimi)",
    "sit": "Gaz amortisörün basınç kaybı veya bağlantı kopması sonucu açık kapağın kontrolsüz düşmesi; baş, omuz, kol darbesi",
    "phase": "Yükleme, bakım",
    "meas": [
     [
      0,
      "Çift gaz amortisör, cıvatalı braket bağlantısı"
     ],
     [
      1,
      "Tek amortisörün kapağı tutabildiğinin doğrulanması; bakımda mekanik dayama pimi"
     ],
     [
      2,
      "6 ayda kontrol, periyodik değişim kılavuza"
     ]
    ]
   },
   "en": {
    "type": "Mechanical — impact / crushing (gravity)",
    "sit": "Uncontrolled fall of the open lid due to gas spring pressure loss or detached mounting; impact to head, shoulder, arm",
    "phase": "Loading, maintenance",
    "meas": [
     [
      0,
      "Two gas springs, bolted bracket mounting"
     ],
     [
      1,
      "Verify that one spring alone holds the lid; mechanical prop pin for maintenance"
     ],
     [
      2,
      "Inspection every 6 months, periodic replacement in the manual"
     ]
    ]
   },
   "de": {
    "type": "Mechanisch — Stoß / Quetschen (Schwerkraft)",
    "sit": "Unkontrolliertes Herabfallen des offenen Deckels durch Druckverlust oder gelöste Befestigung der Gasfeder; Stoß an Kopf, Schulter, Arm",
    "phase": "Beladen, Wartung",
    "meas": [
     [
      0,
      "Zwei Gasdruckfedern, verschraubte Halterungen"
     ],
     [
      1,
      "Nachweis, dass eine Feder allein den Deckel hält; Haltebolzen für die Wartung"
     ],
     [
      2,
      "Prüfung alle 6 Monate, regelmäßiger Austausch lt. Betriebsanleitung"
     ]
    ]
   }
  },
  {
   "key": "hot_spray",
   "cat": "therm",
   "sf": "lid_interlock",
   "o": 4,
   "s": 4,
   "o2": 1,
   "s2": 4,
   "tr": {
    "type": "Termal + kimyasal — sıcak sıvı püskürmesi",
    "sit": "Çevrim sırasında kapağın açılması ile pompa basınçlı sıcak alkali yıkama sıvısının operatörün yüz/gözüne püskürmesi",
    "phase": "Normal çalışma",
    "meas": [
     [
      0,
      "Kapak emniyet kilidi B1 → <b>SF-01</b> pompa M1 enerjisini keser (PL<sub>r</sub> d)"
     ],
     [
      2,
      "KKD: gözlük/yüz siperi, eldiven (M004, M009)"
     ]
    ]
   },
   "en": {
    "type": "Thermal + chemical — hot liquid spray",
    "sit": "Lid opened during the cycle; pressurised hot alkaline wash liquid sprays into the operator's face/eyes",
    "phase": "Normal operation",
    "meas": [
     [
      0,
      "Lid interlock B1 → <b>SF-01</b> de-energises pump M1 (PL<sub>r</sub> d)"
     ],
     [
      2,
      "PPE: goggles/face shield, gloves (M004, M009)"
     ]
    ]
   },
   "de": {
    "type": "Thermisch + chemisch — Heißflüssigkeitsstrahl",
    "sit": "Öffnen des Deckels während des Zyklus; heiße alkalische Waschflüssigkeit unter Pumpendruck trifft Gesicht/Augen des Bedieners",
    "phase": "Normalbetrieb",
    "meas": [
     [
      0,
      "Deckel-Sicherheitsschalter B1 → <b>SF-01</b> schaltet Pumpe M1 ab (PL<sub>r</sub> d)"
     ],
     [
      2,
      "PSA: Schutzbrille/Gesichtsschutz, Handschuhe (M004, M009)"
     ]
    ]
   }
  },
  {
   "key": "rotating_basket",
   "cat": "mech",
   "sf": "lid_interlock",
   "o": 3,
   "s": 4,
   "o2": 1,
   "s2": 4,
   "tr": {
    "type": "Mekanik — çarpma, dolanma, sürüklenme",
    "sit": "Kapak açıkken döner sepetin dönmeye devam etmesi veya başlaması; el/kolun sepete kaptırılması",
    "phase": "Yükleme, arıza giderme",
    "meas": [
     [
      0,
      "<b>SF-01</b> sepet tahriki M2 enerjisini keser"
     ],
     [
      1,
      "Sepet duruş süresi ölçümü; erişim süresinden uzunsa guard locking"
     ]
    ]
   },
   "en": {
    "type": "Mechanical — impact, entanglement, drawing-in",
    "sit": "Rotating basket keeps turning or starts while the lid is open; hand/arm caught by the basket",
    "phase": "Loading, troubleshooting",
    "meas": [
     [
      0,
      "<b>SF-01</b> de-energises basket drive M2"
     ],
     [
      1,
      "Measure basket stopping time; guard locking if longer than access time"
     ]
    ]
   },
   "de": {
    "type": "Mechanisch — Stoß, Erfassen, Einziehen",
    "sit": "Drehkorb läuft bei offenem Deckel nach oder an; Hand/Arm wird vom Korb erfasst",
    "phase": "Beladen, Störungsbeseitigung",
    "meas": [
     [
      0,
      "<b>SF-01</b> schaltet Korbantrieb M2 ab"
     ],
     [
      1,
      "Nachlaufzeit des Korbs messen; bei Überschreitung der Zugriffszeit Zuhaltung"
     ]
    ]
   }
  },
  {
   "key": "unexpected_start",
   "cat": "mech",
   "sf": "restart_prevention",
   "o": 3,
   "s": 4,
   "o2": 1,
   "s2": 4,
   "tr": {
    "type": "Mekanik + termal — beklenmeyen çalışma",
    "sit": "Kapak kapatıldığında veya durdurma sıfırlandığında çevrimin kendiliğinden yeniden başlaması",
    "phase": "Normal çalışma",
    "meas": [
     [
      0,
      "<b>SF-02</b>: izlenen manuel reset + ayrı WASCHEN başlatma komutu (EN ISO 14118)"
     ]
    ]
   },
   "en": {
    "type": "Mechanical + thermal — unexpected start-up",
    "sit": "Cycle restarts by itself when the lid is closed or a stop is reset",
    "phase": "Normal operation",
    "meas": [
     [
      0,
      "<b>SF-02</b>: monitored manual reset + separate WASCHEN start command (EN ISO 14118)"
     ]
    ]
   },
   "de": {
    "type": "Mechanisch + thermisch — unerwarteter Anlauf",
    "sit": "Selbsttätiger Wiederanlauf beim Schließen des Deckels oder Quittieren eines Stopps",
    "phase": "Normalbetrieb",
    "meas": [
     [
      0,
      "<b>SF-02</b>: überwachte manuelle Rückstellung + separater Startbefehl WASCHEN (EN ISO 14118)"
     ]
    ]
   }
  },
  {
   "key": "steam",
   "cat": "therm",
   "sf": null,
   "o": 4,
   "s": 3,
   "o2": 2,
   "s2": 3,
   "tr": {
    "type": "Termal — buhar",
    "sit": "Çevrim sonunda kapak açıldığında kabindeki sıcak buharın operatörün yüzüne yönelmesi",
    "phase": "Boşaltma",
    "meas": [
     [
      0,
      "Üstte buhar egzoz fanı"
     ],
     [
      1,
      "Çevrim sonu tanımlı buhar tahliye süresi; gerekirse zaman gecikmeli kapak kilidi"
     ],
     [
      2,
      "W017; kılavuzda bekleme talimatı"
     ]
    ]
   },
   "en": {
    "type": "Thermal — steam",
    "sit": "Hot steam from the cabin is directed at the operator's face when the lid is opened at the end of the cycle",
    "phase": "Unloading",
    "meas": [
     [
      0,
      "Steam exhaust fan on top"
     ],
     [
      1,
      "Defined steam extraction time at end of cycle; time-delayed lid lock if needed"
     ],
     [
      2,
      "W017; waiting instruction in the manual"
     ]
    ]
   },
   "de": {
    "type": "Thermisch — Dampf",
    "sit": "Beim Öffnen am Zyklusende strömt heißer Dampf aus der Kabine in Richtung Gesicht des Bedieners",
    "phase": "Entladen",
    "meas": [
     [
      0,
      "Dampfabsaugventilator oben"
     ],
     [
      1,
      "Definierte Absaugzeit am Zyklusende; ggf. zeitverzögerte Zuhaltung"
     ],
     [
      2,
      "W017; Warteanweisung in der Betriebsanleitung"
     ]
    ]
   }
  },
  {
   "key": "hot_surface",
   "cat": "therm",
   "sf": null,
   "o": 3,
   "s": 3,
   "o2": 2,
   "s2": 2,
   "tr": {
    "type": "Termal — sıcak yüzey",
    "sit": "Kapak iç sacı, damlama kanalı, sepet ve parçaların ≥ 60 °C olması; temasla yanık",
    "phase": "Boşaltma, temizlik",
    "meas": [
     [
      1,
      "Yüzey sıcaklık ölçümü (EN ISO 13732-1)"
     ],
     [
      2,
      "W017; ısıl eldiven; parça soğuma süresi"
     ]
    ]
   },
   "en": {
    "type": "Thermal — hot surface",
    "sit": "Inner lid sheet, drip channel, basket and parts at ≥ 60 °C; burns on contact",
    "phase": "Unloading, cleaning",
    "meas": [
     [
      1,
      "Surface temperature measurement (EN ISO 13732-1)"
     ],
     [
      2,
      "W017; heat-resistant gloves; part cooling time"
     ]
    ]
   },
   "de": {
    "type": "Thermisch — heiße Oberfläche",
    "sit": "Deckelinnenblech, Tropfrinne, Korb und Teile ≥ 60 °C; Verbrennung bei Berührung",
    "phase": "Entladen, Reinigung",
    "meas": [
     [
      1,
      "Messung der Oberflächentemperatur (EN ISO 13732-1)"
     ],
     [
      2,
      "W017; Hitzeschutzhandschuhe; Abkühlzeit der Teile"
     ]
    ]
   }
  },
  {
   "key": "switch_pinch",
   "cat": "mech",
   "sf": null,
   "o": 2,
   "s": 3,
   "o2": 1,
   "s2": 3,
   "tr": {
    "type": "Mekanik — sıkışma",
    "sit": "Kapak kapanırken aktüatör dili ile kilit kutusu arasında parmak sıkışması",
    "phase": "Normal çalışma",
    "meas": [
     [
      0,
      "Aktüatör kutu içine gömülü, kutu kapak kenarının dışında"
     ],
     [
      1,
      "Aralık kontrolü ≥ 25 mm veya ≤ 4 mm"
     ]
    ]
   },
   "en": {
    "type": "Mechanical — pinching",
    "sit": "Finger pinched between actuator tongue and switch housing as the lid closes",
    "phase": "Normal operation",
    "meas": [
     [
      0,
      "Actuator recessed in the housing, housing outside the lid edge"
     ],
     [
      1,
      "Gap check ≥ 25 mm or ≤ 4 mm"
     ]
    ]
   },
   "de": {
    "type": "Mechanisch — Einklemmen",
    "sit": "Einklemmen des Fingers zwischen Betätiger und Schaltergehäuse beim Schließen",
    "phase": "Normalbetrieb",
    "meas": [
     [
      0,
      "Betätiger im Gehäuse versenkt, Gehäuse außerhalb der Deckelkante"
     ],
     [
      1,
      "Spaltprüfung ≥ 25 mm oder ≤ 4 mm"
     ]
    ]
   }
  },
  {
   "key": "lid_shear",
   "cat": "mech",
   "sf": null,
   "o": 3,
   "s": 3,
   "o2": 1,
   "s2": 3,
   "tr": {
    "type": "Mekanik — makaslama",
    "sit": "Kapak hareketi sırasında kapak çerçevesi ile sağ dikey kılavuz/gövde arasında ve amortisör braketlerinde makaslama",
    "phase": "Normal çalışma, temizlik",
    "meas": [
     [
      1,
      "Makaslama aralığı EN ISO 13854'e göre ≥ 25 mm veya sabit koruyucu"
     ],
     [
      2,
      "W024 etiketi"
     ]
    ]
   },
   "en": {
    "type": "Mechanical — shearing",
    "sit": "Shearing between the lid frame and the right vertical guide/frame and at the gas spring brackets during lid movement",
    "phase": "Normal operation, cleaning",
    "meas": [
     [
      1,
      "Shearing gap ≥ 25 mm per EN ISO 13854 or fixed guard"
     ],
     [
      2,
      "W024 label"
     ]
    ]
   },
   "de": {
    "type": "Mechanisch — Scheren",
    "sit": "Scheren zwischen Deckelrahmen und rechter Vertikalführung/Gehäuse sowie an den Federhalterungen",
    "phase": "Normalbetrieb, Reinigung",
    "meas": [
     [
      1,
      "Scherspalt ≥ 25 mm nach EN ISO 13854 oder feststehende Schutzeinrichtung"
     ],
     [
      2,
      "Schild W024"
     ]
    ]
   }
  },
  {
   "key": "sharp_edge",
   "cat": "mech",
   "sf": null,
   "o": 2,
   "s": 2,
   "o2": 1,
   "s2": 2,
   "tr": {
    "type": "Mekanik — kesilme",
    "sit": "Kapak sac kenarları ve damlama kanalı köşelerinde keskin kenar",
    "phase": "Tüm fazlar",
    "meas": [
     [
      0,
      "Bükümlü sac kenarlar"
     ],
     [
      1,
      "Çapak / keskin kenar son kontrolü"
     ]
    ]
   },
   "en": {
    "type": "Mechanical — cutting",
    "sit": "Sharp edges on lid sheet edges and drip channel corners",
    "phase": "All phases",
    "meas": [
     [
      0,
      "Folded sheet edges"
     ],
     [
      1,
      "Final check for burrs / sharp edges"
     ]
    ]
   },
   "de": {
    "type": "Mechanisch — Schneiden",
    "sit": "Scharfe Kanten an Deckelblechkanten und Ecken der Tropfrinne",
    "phase": "Alle Phasen",
    "meas": [
     [
      0,
      "Gekantete Blechkanten"
     ],
     [
      1,
      "Endkontrolle auf Grate / scharfe Kanten"
     ]
    ]
   }
  },
  {
   "key": "defeat_guard",
   "cat": "misuse",
   "sf": null,
   "o": 3,
   "s": 4,
   "o2": 2,
   "s2": 4,
   "tr": {
    "type": "Öngörülebilir kötüye kullanım — koruyucunun etkisizleştirilmesi",
    "sit": "Operatörün aktüatörü söküp kilide takarak veya köprüleyerek kapak açık çalıştırması",
    "phase": "Normal çalışma, arıza",
    "meas": [
     [
      0,
      "Kodlu aktüatörlü emniyet anahtarı (Tip 2) [teyit]"
     ],
     [
      1,
      "EN ISO 14119 §7 manipülasyon teşviki değerlendirmesi; tek yönlü vida; yedek aktüatör verilmez"
     ],
     [
      2,
      "Kılavuz uyarısı"
     ]
    ]
   },
   "en": {
    "type": "Foreseeable misuse — defeating the guard",
    "sit": "Operator removes the actuator and inserts it into the switch, or bridges it, to run with the lid open",
    "phase": "Normal operation, fault",
    "meas": [
     [
      0,
      "Interlock switch with coded actuator (type 2) [confirm]"
     ],
     [
      1,
      "EN ISO 14119 §7 assessment of motivation to defeat; one-way screws; no spare actuator supplied"
     ],
     [
      2,
      "Warning in the manual"
     ]
    ]
   },
   "de": {
    "type": "Vorhersehbare Fehlanwendung — Manipulation",
    "sit": "Bediener steckt den demontierten Betätiger in den Schalter oder überbrückt ihn, um bei offenem Deckel zu arbeiten",
    "phase": "Normalbetrieb, Störung",
    "meas": [
     [
      0,
      "Sicherheitsschalter mit codiertem Betätiger (Bauart 2) [bestätigen]"
     ],
     [
      1,
      "Bewertung des Manipulationsanreizes nach EN ISO 14119 §7; Einwegschrauben; kein Ersatzbetätiger"
     ],
     [
      2,
      "Warnhinweis in der Betriebsanleitung"
     ]
    ]
   }
  },
  {
   "key": "indirect_contact",
   "cat": "elec",
   "sf": null,
   "o": 2,
   "s": 5,
   "o2": 1,
   "s2": 5,
   "tr": {
    "type": "Elektrik — dolaylı temas",
    "sit": "Yalıtım hatasında kapak/gövde metal kısımlarında tehlikeli dokunma gerilimi",
    "phase": "Tüm fazlar",
    "meas": [
     [
      0,
      "Koruma iletkeni bağlantısı; EN 60204-1 testleri (R<sub>PE</sub>, yalıtım, gerilim dayanım) — Bölüm 12"
     ],
     [
      1,
      "Hareketli kapak için esnek PE köprüsü kontrolü"
     ]
    ]
   },
   "en": {
    "type": "Electrical — indirect contact",
    "sit": "Dangerous touch voltage on metal parts of the lid/frame in case of an insulation fault",
    "phase": "All phases",
    "meas": [
     [
      0,
      "Protective conductor connection; EN 60204-1 tests (R<sub>PE</sub>, insulation, voltage withstand) — Section 12"
     ],
     [
      1,
      "Check the flexible PE bonding strap of the moving lid"
     ]
    ]
   },
   "de": {
    "type": "Elektrisch — indirektes Berühren",
    "sit": "Gefährliche Berührungsspannung an Metallteilen von Deckel/Gehäuse bei Isolationsfehler",
    "phase": "Alle Phasen",
    "meas": [
     [
      0,
      "Schutzleiteranschluss; Prüfungen nach EN 60204-1 (R<sub>PE</sub>, Isolation, Spannungsprüfung) — Abschnitt 12"
     ],
     [
      1,
      "Prüfung der flexiblen PE-Brücke am beweglichen Deckel"
     ]
    ]
   }
  },
  {
   "key": "lid_force",
   "cat": "ergo",
   "sf": null,
   "o": 3,
   "s": 2,
   "o2": 2,
   "s2": 2,
   "tr": {
    "type": "Ergonomik — zorlanma",
    "sit": "Kapak açma kuvveti / tutamak yüksekliği uygunsuzluğu; tekrarlı zorlanma",
    "phase": "Normal çalışma",
    "meas": [
     [
      0,
      "Gaz amortisör destekli açılma"
     ],
     [
      1,
      "Açma/kapama kuvveti ölçümü (EN 1005-3)"
     ]
    ]
   },
   "en": {
    "type": "Ergonomic — strain",
    "sit": "Unsuitable lid opening force / handle height; repetitive strain",
    "phase": "Normal operation",
    "meas": [
     [
      0,
      "Gas-spring-assisted opening"
     ],
     [
      1,
      "Opening/closing force measurement (EN 1005-3)"
     ]
    ]
   },
   "de": {
    "type": "Ergonomisch — Überbeanspruchung",
    "sit": "Ungeeignete Öffnungskraft / Griffhöhe des Deckels; wiederholte Belastung",
    "phase": "Normalbetrieb",
    "meas": [
     [
      0,
      "Gasfederunterstütztes Öffnen"
     ],
     [
      1,
      "Messung der Öffnungs-/Schließkraft (EN 1005-3)"
     ]
    ]
   }
  },
  {
   "key": "emergency",
   "cat": "other",
   "sf": "estop",
   "o": 2,
   "s": 4,
   "o2": 1,
   "s2": 4,
   "tr": {
    "type": "Tümü — acil durum",
    "sit": "Kapak bölgesinde tehlikeli durum anında makinenin hızla durdurulamaması",
    "phase": "Tüm fazlar",
    "meas": [
     [
      0,
      "Panelde NOT-AUS — <b>SF-03</b> (PL<sub>r</sub> c), operatör erişim alanında"
     ]
    ]
   },
   "en": {
    "type": "All — emergency",
    "sit": "The machine cannot be stopped quickly in a hazardous situation at the lid",
    "phase": "All phases",
    "meas": [
     [
      0,
      "NOT-AUS on the panel — <b>SF-03</b> (PL<sub>r</sub> c), within the operator's reach"
     ]
    ]
   },
   "de": {
    "type": "Alle — Notfall",
    "sit": "Maschine kann bei einer Gefahrensituation am Deckel nicht schnell stillgesetzt werden",
    "phase": "Alle Phasen",
    "meas": [
     [
      0,
      "NOT-AUS am Bedienpult — <b>SF-03</b> (PL<sub>r</sub> c), im Greifraum des Bedieners"
     ]
    ]
   }
  },
  {
   "key": "slip",
   "cat": "other",
   "sf": null,
   "o": 3,
   "s": 3,
   "o2": 2,
   "s2": 2,
   "tr": {
    "type": "Kayma, düşme",
    "sit": "Kapaktan / damlama kanalından taşan sıvı ile zeminin kayganlaşması",
    "phase": "Yükleme, boşaltma",
    "meas": [
     [
      0,
      "Damlama kanalı"
     ],
     [
      1,
      "Kanalın tanka geri dönüşünün doğrulanması"
     ],
     [
      2,
      "Kaymaz zemin/ızgara — kullanıcı"
     ]
    ]
   },
   "en": {
    "type": "Slipping, falling",
    "sit": "Floor becomes slippery from liquid dripping off the lid / overflowing the drip channel",
    "phase": "Loading, unloading",
    "meas": [
     [
      0,
      "Drip channel"
     ],
     [
      1,
      "Verify the drip channel return to the tank"
     ],
     [
      2,
      "Anti-slip floor/grating — user"
     ]
    ]
   },
   "de": {
    "type": "Ausrutschen, Stürzen",
    "sit": "Rutschiger Boden durch vom Deckel abtropfende / aus der Tropfrinne überlaufende Flüssigkeit",
    "phase": "Beladen, Entladen",
    "meas": [
     [
      0,
      "Tropfrinne"
     ],
     [
      1,
      "Rückführung der Tropfrinne in den Tank nachweisen"
     ],
     [
      2,
      "Rutschfester Boden/Gitterrost — Betreiber"
     ]
    ]
   }
  },
  {
   "key": "live_parts",
   "cat": "elec",
   "sf": null,
   "o": 2,
   "s": 5,
   "o2": 1,
   "s2": 5,
   "tr": {
    "type": "Elektrik — doğrudan temas",
    "sit": "Elektrik panosu açıkken gerilim altındaki parçalara dokunma",
    "phase": "Bakım, arıza giderme",
    "meas": [
     [
      0,
      "Pano kapağı aletle/anahtarla açılır, iç parçalar IP2X / IPXXB"
     ],
     [
      0,
      "Kilitlenebilir ana şalter (EN 60204-1 §5.3)"
     ],
     [
      2,
      "W012 etiketi; yalnız yetkili elektrikçi"
     ]
    ]
   },
   "en": {
    "type": "Electrical — direct contact",
    "sit": "Touching live parts while the control cabinet is open",
    "phase": "Maintenance, troubleshooting",
    "meas": [
     [
      0,
      "Cabinet door opens only with a tool/key, internal parts IP2X / IPXXB"
     ],
     [
      0,
      "Lockable main switch (EN 60204-1 §5.3)"
     ],
     [
      2,
      "W012 label; authorised electricians only"
     ]
    ]
   },
   "de": {
    "type": "Elektrisch — direktes Berühren",
    "sit": "Berühren aktiver Teile bei geöffnetem Schaltschrank",
    "phase": "Wartung, Störungsbeseitigung",
    "meas": [
     [
      0,
      "Schaltschranktür nur mit Werkzeug/Schlüssel zu öffnen, innen IP2X / IPXXB"
     ],
     [
      0,
      "Abschließbarer Hauptschalter (EN 60204-1 §5.3)"
     ],
     [
      2,
      "Schild W012; nur Elektrofachkräfte"
     ]
    ]
   }
  },
  {
   "key": "heater_dry",
   "cat": "therm",
   "sf": "dry_run",
   "o": 3,
   "s": 4,
   "o2": 1,
   "s2": 4,
   "tr": {
    "type": "Termal — aşırı ısınma / yangın",
    "sit": "Düşük sıvı seviyesinde ısıtıcının kuru çalışması; tank ve çevresinin aşırı ısınması",
    "phase": "Normal çalışma",
    "meas": [
     [
      0,
      "Seviye şalteri ile ısıtıcı kilidi — <b>SF</b> (WASSERMANGEL)"
     ],
     [
      1,
      "Bağımsız emniyet termostatı (STB) ile ısıtıcı devresinin kesilmesi"
     ],
     [
      2,
      "Seviye kontrolü talimatı kılavuzda"
     ]
    ]
   },
   "en": {
    "type": "Thermal — overheating / fire",
    "sit": "Heater running dry at low liquid level; overheating of the tank and surroundings",
    "phase": "Normal operation",
    "meas": [
     [
      0,
      "Heater interlock by level switch — <b>SF</b> (WASSERMANGEL)"
     ],
     [
      1,
      "Independent safety temperature limiter (STB) cutting the heater circuit"
     ],
     [
      2,
      "Level check instruction in the manual"
     ]
    ]
   },
   "de": {
    "type": "Thermisch — Überhitzung / Brand",
    "sit": "Trockenlauf der Heizung bei niedrigem Flüssigkeitsstand; Überhitzung von Tank und Umgebung",
    "phase": "Normalbetrieb",
    "meas": [
     [
      0,
      "Heizungsverriegelung über Niveauschalter — <b>SF</b> (WASSERMANGEL)"
     ],
     [
      1,
      "Unabhängiger Sicherheitstemperaturbegrenzer (STB) im Heizkreis"
     ],
     [
      2,
      "Anweisung zur Niveaukontrolle in der Betriebsanleitung"
     ]
    ]
   }
  },
  {
   "key": "chem_vapour",
   "cat": "chem",
   "sf": null,
   "o": 3,
   "s": 3,
   "o2": 2,
   "s2": 2,
   "tr": {
    "type": "Kimyasal — buhar / aerosol",
    "sit": "Deterjan buharı ve aerosolün solunması, cilt/göz teması",
    "phase": "Normal çalışma, dolum",
    "meas": [
     [
      0,
      "Buhar egzoz fanı, kapalı yıkama kabini"
     ],
     [
      1,
      "Ortam havalandırmasının doğrulanması"
     ],
     [
      2,
      "SDS'e uygun deterjan; M004, M009; W023"
     ]
    ]
   },
   "en": {
    "type": "Chemical — vapour / aerosol",
    "sit": "Inhalation of detergent vapour and aerosol, skin/eye contact",
    "phase": "Normal operation, filling",
    "meas": [
     [
      0,
      "Steam exhaust fan, enclosed washing cabin"
     ],
     [
      1,
      "Verify room ventilation"
     ],
     [
      2,
      "Detergent according to SDS; M004, M009; W023"
     ]
    ]
   },
   "de": {
    "type": "Chemisch — Dampf / Aerosol",
    "sit": "Einatmen von Reinigerdampf und Aerosol, Haut-/Augenkontakt",
    "phase": "Normalbetrieb, Befüllen",
    "meas": [
     [
      0,
      "Dampfabsaugventilator, geschlossene Waschkabine"
     ],
     [
      1,
      "Raumlüftung nachweisen"
     ],
     [
      2,
      "Reiniger gemäß SDB; M004, M009; W023"
     ]
    ]
   }
  },
  {
   "key": "noise",
   "cat": "noise",
   "sf": null,
   "o": 3,
   "s": 2,
   "o2": 2,
   "s2": 2,
   "tr": {
    "type": "Gürültü",
    "sit": "Pompa, fan ve sprey kaynaklı gürültüye uzun süre maruz kalma",
    "phase": "Normal çalışma",
    "meas": [
     [
      1,
      "Gürültü emisyonu ölçümü (EN ISO 11201) ve beyanı"
     ],
     [
      2,
      "≥ 80 dB(A) ise M003 kulak koruyucu"
     ]
    ]
   },
   "en": {
    "type": "Noise",
    "sit": "Long-term exposure to noise from pump, fan and spraying",
    "phase": "Normal operation",
    "meas": [
     [
      1,
      "Noise emission measurement (EN ISO 11201) and declaration"
     ],
     [
      2,
      "M003 hearing protection if ≥ 80 dB(A)"
     ]
    ]
   },
   "de": {
    "type": "Lärm",
    "sit": "Längere Lärmexposition durch Pumpe, Ventilator und Spritzen",
    "phase": "Normalbetrieb",
    "meas": [
     [
      1,
      "Messung und Angabe der Geräuschemission (EN ISO 11201)"
     ],
     [
      2,
      "Gehörschutz M003 bei ≥ 80 dB(A)"
     ]
    ]
   }
  },
  {
   "key": "rotating_drive",
   "cat": "mech",
   "sf": null,
   "o": 2,
   "s": 4,
   "o2": 1,
   "s2": 4,
   "tr": {
    "type": "Mekanik — dolanma",
    "sit": "Pompa/motor kaplini, fan ve tahrik elemanları gibi dönen parçalara erişim",
    "phase": "Bakım, temizlik",
    "meas": [
     [
      0,
      "Sabit koruyucu (aletle sökülür) — EN ISO 14120, EN ISO 13857"
     ],
     [
      2,
      "Bakımda ana şalter kapalı ve kilitli"
     ]
    ]
   },
   "en": {
    "type": "Mechanical — entanglement",
    "sit": "Access to rotating parts such as pump/motor coupling, fan and drive elements",
    "phase": "Maintenance, cleaning",
    "meas": [
     [
      0,
      "Fixed guard (removable only with a tool) — EN ISO 14120, EN ISO 13857"
     ],
     [
      2,
      "Main switch off and locked during maintenance"
     ]
    ]
   },
   "de": {
    "type": "Mechanisch — Erfassen",
    "sit": "Zugang zu rotierenden Teilen wie Pumpen-/Motorkupplung, Ventilator und Antriebselementen",
    "phase": "Wartung, Reinigung",
    "meas": [
     [
      0,
      "Feststehende Schutzeinrichtung (nur mit Werkzeug lösbar) — EN ISO 14120, EN ISO 13857"
     ],
     [
      2,
      "Hauptschalter bei Wartung aus und abgeschlossen"
     ]
    ]
   }
  },
  {
   "key": "leak",
   "cat": "other",
   "sf": null,
   "o": 2,
   "s": 3,
   "o2": 1,
   "s2": 2,
   "tr": {
    "type": "Sıvı sızıntısı / taşma",
    "sit": "Tank taşması veya bağlantı sızıntısı ile sıcak kimyasal sıvının zemine yayılması",
    "phase": "Normal çalışma, dolum",
    "meas": [
     [
      0,
      "Seviye kontrolü ve taşma borusu"
     ],
     [
      1,
      "Toplama tavası / sızdırmazlık kontrolü"
     ],
     [
      2,
      "Dolum talimatı"
     ]
    ]
   },
   "en": {
    "type": "Liquid leakage / overflow",
    "sit": "Hot chemical liquid spreading on the floor due to tank overflow or leaking connections",
    "phase": "Normal operation, filling",
    "meas": [
     [
      0,
      "Level control and overflow pipe"
     ],
     [
      1,
      "Drip tray / leak tightness check"
     ],
     [
      2,
      "Filling instruction"
     ]
    ]
   },
   "de": {
    "type": "Leckage / Überlauf",
    "sit": "Heiße chemische Flüssigkeit gelangt durch Tanküberlauf oder undichte Anschlüsse auf den Boden",
    "phase": "Normalbetrieb, Befüllen",
    "meas": [
     [
      0,
      "Niveauregelung und Überlaufrohr"
     ],
     [
      1,
      "Auffangwanne / Dichtheitsprüfung"
     ],
     [
      2,
      "Befüllanweisung"
     ]
    ]
   }
  },
  {
   "key": "heavy_basket",
   "cat": "ergo",
   "sf": null,
   "o": 3,
   "s": 3,
   "o2": 2,
   "s2": 2,
   "tr": {
    "type": "Ergonomik — yük kaldırma",
    "sit": "Dolu sepetin/parçaların elle kaldırılması ve taşınması",
    "phase": "Yükleme, boşaltma",
    "meas": [
     [
      1,
      "Maks. elle kaldırma ≤ 25 kg (EN 1005-2) veya kaldırma ekipmanı"
     ],
     [
      2,
      "Sepet yükleme ağırlığı kılavuzda"
     ]
    ]
   },
   "en": {
    "type": "Ergonomic — lifting",
    "sit": "Manual lifting and carrying of a loaded basket/parts",
    "phase": "Loading, unloading",
    "meas": [
     [
      1,
      "Max. manual lift ≤ 25 kg (EN 1005-2) or lifting aid"
     ],
     [
      2,
      "Basket load weight stated in the manual"
     ]
    ]
   },
   "de": {
    "type": "Ergonomisch — Heben",
    "sit": "Manuelles Heben und Tragen des beladenen Korbs/der Teile",
    "phase": "Beladen, Entladen",
    "meas": [
     [
      1,
      "Max. manuelles Heben ≤ 25 kg (EN 1005-2) oder Hebehilfe"
     ],
     [
      2,
      "Korbgewicht in der Betriebsanleitung angeben"
     ]
    ]
   }
  }
 ],
 "sfs": [
  {
   "key": "lid_interlock",
   "name": {
    "tr": "Kapak kilitlemesi",
    "en": "Lid interlocking",
    "de": "Deckelverriegelung"
   },
   "desc": {
    "tr": "Kapak açıldığında (emniyet anahtarı B1) tehlikeli hareket ve püskürme kaynaklarının kontaktörleri (K1, K2) enerjisiz bırakılır. Durdurma kategorisi 0 (EN 60204-1 §9.2.2).",
    "en": "When the lid is opened (interlock switch B1), the contactors (K1, K2) of hazardous motion and spray sources are de-energised. Stop category 0 (EN 60204-1 §9.2.2).",
    "de": "Beim Öffnen des Deckels (Sicherheitsschalter B1) werden die Schütze (K1, K2) der gefährlichen Bewegungen und Spritzquellen abgeschaltet. Stoppkategorie 0 (EN 60204-1 §9.2.2)."
   },
   "trigger": {
    "tr": "Kapağın kapalı konumdan ayrılması",
    "en": "Lid leaves the closed position",
    "de": "Deckel verlässt die geschlossene Stellung"
   },
   "safe": {
    "tr": "Pompa / tahrik enerjisiz; püskürme ve hareket yok",
    "en": "Pump / drive de-energised; no spray, no movement",
    "de": "Pumpe / Antrieb energielos; kein Spritzen, keine Bewegung"
   },
   "S": 2,
   "F": 2,
   "P": 1,
   "just": {
    "S": {
     "tr": "Sıcak alkali sıvının yüz/göze püskürmesi kalıcı göz hasarına; hareketli parçaya kaptırma kırığa yol açabilir.",
     "en": "Hot alkaline liquid sprayed into the face/eyes can cause permanent eye damage; being caught by moving parts can cause fractures.",
     "de": "Heiße alkalische Flüssigkeit im Gesicht/Auge kann bleibende Augenschäden, das Erfassen durch bewegte Teile Frakturen verursachen."
    },
    "F": {
     "tr": "Kapak her yükleme/boşaltmada açılır; çevrim aralığı < 15 dk.",
     "en": "The lid is opened at every loading/unloading; cycle interval < 15 min.",
     "de": "Der Deckel wird bei jedem Be-/Entladen geöffnet; Zyklusintervall < 15 min."
    },
    "P": {
     "tr": "Pompa çalışması sesli olarak algılanabilir; kapak manuel ve yavaş açılır; operatör eğitimlidir.",
     "en": "Pump operation is audible; the lid is opened manually and slowly; the operator is trained.",
     "de": "Der Pumpenbetrieb ist hörbar; der Deckel wird manuell und langsam geöffnet; der Bediener ist unterwiesen."
    }
   },
   "subs": [
    {
     "role": "input",
     "comp": {
      "tr": "B1 — ayrı aktüatörlü kodlu emniyet anahtarı, EN ISO 14119 Tip 2, 2×NC zorunlu açılan kontak · [marka / tip]",
      "en": "B1 — interlock switch with separate coded actuator, EN ISO 14119 type 2, 2×NC positive opening · [make / type]",
      "de": "B1 — Sicherheitsschalter mit getrenntem codiertem Betätiger, EN ISO 14119 Bauart 2, 2 Öffner zwangsöffnend · [Hersteller / Typ]"
     },
     "cat": "3",
     "b10d": 2000000,
     "nop": null,
     "mttfd": null,
     "dc": 99,
     "plOverride": "",
     "plCap": "d",
     "note": {
      "tr": "Tek cihaz, mekanik arıza dışlaması (EN ISO 13849-2 Tablo D.8) → maks. PL d",
      "en": "Single device, mechanical fault exclusion (EN ISO 13849-2 Table D.8) → max. PL d",
      "de": "Einzelgerät, mechanischer Fehlerausschluss (EN ISO 13849-2 Tabelle D.8) → max. PL d"
     }
    },
    {
     "role": "logic",
     "comp": {
      "tr": "K0 — emniyet rölesi, Kat. 4 / PL e, izlenen manuel reset · [marka / tip]",
      "en": "K0 — safety relay, Cat. 4 / PL e, monitored manual reset · [make / type]",
      "de": "K0 — Sicherheitsrelais, Kat. 4 / PL e, überwachte manuelle Rückstellung · [Hersteller / Typ]"
     },
     "cat": "4",
     "b10d": null,
     "nop": null,
     "mttfd": null,
     "dc": null,
     "plOverride": "e",
     "plCap": "",
     "note": {
      "tr": "Üretici sertifikası",
      "en": "Manufacturer certificate",
      "de": "Herstellerzertifikat"
     }
    },
    {
     "role": "output",
     "comp": {
      "tr": "K1, K2 — seri bağlı güç kontaktörleri, ayna kontaklı, EDM ile K0'a geri besleme · [tip]",
      "en": "K1, K2 — power contactors in series, mirror contacts, EDM feedback to K0 · [type]",
      "de": "K1, K2 — Leistungsschütze in Reihe, Spiegelkontakte, EDM-Rückführung an K0 · [Typ]"
     },
     "cat": "3",
     "b10d": 1300000,
     "nop": null,
     "mttfd": null,
     "dc": 99,
     "plOverride": "",
     "plCap": "",
     "note": {
      "tr": "Yedekli, EDM izlemeli",
      "en": "Redundant, EDM-monitored",
      "de": "Redundant, EDM-überwacht"
     }
    }
   ],
   "tests": [
    {
     "step": {
      "tr": "Çevrimin her fazında kapağı aç",
      "en": "Open the lid in every phase of the cycle",
      "de": "Deckel in jeder Zyklusphase öffnen"
     },
     "expected": {
      "tr": "Tehlikeli hareket ve püskürme anında durur",
      "en": "Hazardous motion and spraying stop immediately",
      "de": "Gefährliche Bewegung und Spritzen stoppen sofort"
     }
    },
    {
     "step": {
      "tr": "Kapak açılışından tam duruşa kadar süreyi ölç (3 tekrar)",
      "en": "Measure the time from lid opening to standstill (3 repetitions)",
      "de": "Zeit vom Öffnen bis zum Stillstand messen (3 Wiederholungen)"
     },
     "expected": {
      "tr": "t<sub>duruş</sub> < erişim süresi [s]; aksi halde guard locking",
      "en": "t<sub>stop</sub> < access time [s]; otherwise guard locking",
      "de": "t<sub>Nachlauf</sub> < Zugriffszeit [s]; sonst Zuhaltung"
     }
    },
    {
     "step": {
      "tr": "B1 kanal 1 kontağını köprüle (kısa devre simülasyonu), kapağı aç-kapat",
      "en": "Bridge the B1 channel 1 contact (short-circuit simulation), open and close the lid",
      "de": "Kontakt Kanal 1 von B1 überbrücken (Kurzschlusssimulation), Deckel öffnen/schließen"
     },
     "expected": {
      "tr": "K0 hatayı algılar, reset edilemez",
      "en": "K0 detects the fault, cannot be reset",
      "de": "K0 erkennt den Fehler, keine Rückstellung möglich"
     }
    },
    {
     "step": {
      "tr": "Kanal 2 için tekrarla; kanallar arası kısa devre simülasyonu",
      "en": "Repeat for channel 2; simulate a cross-channel short circuit",
      "de": "Für Kanal 2 wiederholen; Querschluss zwischen den Kanälen simulieren"
     },
     "expected": {
      "tr": "K0 hatayı algılar, reset edilemez",
      "en": "K0 detects the fault, cannot be reset",
      "de": "K0 erkennt den Fehler, keine Rückstellung möglich"
     }
    },
    {
     "step": {
      "tr": "K1 ayna kontağını açık tut (kaynamış kontak simülasyonu)",
      "en": "Hold the K1 mirror contact open (welded contact simulation)",
      "de": "Spiegelkontakt K1 offen halten (Simulation verschweißter Kontakt)"
     },
     "expected": {
      "tr": "EDM hatası: K0 yeniden çekmez",
      "en": "EDM fault: K0 does not re-energise",
      "de": "EDM-Fehler: K0 schaltet nicht wieder ein"
     }
    },
    {
     "step": {
      "tr": "Kilit manipülasyon denemesi (tornavida, mıknatıs, yedek aktüatör olmadan)",
      "en": "Attempt to defeat the interlock (screwdriver, magnet, without spare actuator)",
      "de": "Manipulationsversuch (Schraubendreher, Magnet, ohne Ersatzbetätiger)"
     },
     "expected": {
      "tr": "B1 tetiklenmez, kapak açık çalışma yok",
      "en": "B1 is not actuated, no operation with the lid open",
      "de": "B1 wird nicht betätigt, kein Betrieb bei offenem Deckel"
     }
    }
   ]
  },
  {
   "key": "restart_prevention",
   "name": {
    "tr": "Beklenmeyen yeniden başlamanın önlenmesi",
    "en": "Prevention of unexpected start-up",
    "de": "Vermeidung von unerwartetem Anlauf"
   },
   "desc": {
    "tr": "Kapağın kapatılması veya bir durdurmanın sıfırlanması tek başına çevrimi başlatmaz; izlenen manuel reset (düşen kenar) ve ardından ayrı başlatma komutu gerekir (EN ISO 14118 §6).",
    "en": "Closing the lid or resetting a stop does not start the cycle by itself; a monitored manual reset (falling edge) followed by a separate start command is required (EN ISO 14118 §6).",
    "de": "Schließen des Deckels oder Quittieren eines Stopps startet den Zyklus nicht selbsttätig; erforderlich sind eine überwachte manuelle Rückstellung (fallende Flanke) und danach ein separater Startbefehl (EN ISO 14118 §6)."
   },
   "trigger": {
    "tr": "Kapak kapanması / acil stop çözülmesi",
    "en": "Lid closed / E-stop released",
    "de": "Deckel geschlossen / Not-Halt entriegelt"
   },
   "safe": {
    "tr": "Tahrikler enerjisiz kalır",
    "en": "Drives remain de-energised",
    "de": "Antriebe bleiben energielos"
   },
   "S": 2,
   "F": 1,
   "P": 1,
   "just": {
    "S": {
     "tr": "Başlama anında el/kol için hareketli parça veya püskürme kaynaklı ciddi yaralanma.",
     "en": "Serious injury to hand/arm from moving parts or spray at start-up.",
     "de": "Schwere Verletzung von Hand/Arm durch bewegte Teile oder Strahl beim Anlauf."
    },
    "F": {
     "tr": "Beklenmeyen başlama ancak arıza veya hatalı kullanımla oluşur; maruziyet kısadır.",
     "en": "Unexpected start-up only occurs through a fault or incorrect use; exposure is short.",
     "de": "Unerwarteter Anlauf nur durch Fehler oder Fehlbedienung; kurze Exposition."
    },
    "P": {
     "tr": "Kalkış sesle algılanabilir; koruyucu kapalı olduğundan doğrudan erişim sınırlıdır.",
     "en": "Start-up is audible; with the guard closed, direct access is limited.",
     "de": "Anlauf ist hörbar; bei geschlossener Schutzeinrichtung ist der Zugang begrenzt."
    }
   },
   "subs": [
    {
     "role": "logic",
     "comp": {
      "tr": "K0 — izlenen manuel reset (ZURÜCKSETZEN, düşen kenar)",
      "en": "K0 — monitored manual reset (ZURÜCKSETZEN, falling edge)",
      "de": "K0 — überwachte manuelle Rückstellung (ZURÜCKSETZEN, fallende Flanke)"
     },
     "cat": "4",
     "b10d": null,
     "nop": null,
     "mttfd": null,
     "dc": null,
     "plOverride": "e",
     "plCap": "",
     "note": {
      "tr": "Reset butonu arızası tehlikeli başlatma üretmez",
      "en": "A reset button fault does not cause a dangerous start",
      "de": "Fehler des Rückstelltasters erzeugt keinen gefährlichen Anlauf"
     }
    },
    {
     "role": "output",
     "comp": {
      "tr": "K1, K2 — SF-01 ile ortak",
      "en": "K1, K2 — shared with SF-01",
      "de": "K1, K2 — gemeinsam mit SF-01"
     },
     "cat": "3",
     "b10d": 1300000,
     "nop": null,
     "mttfd": null,
     "dc": 99,
     "plOverride": "",
     "plCap": "",
     "note": {
      "tr": "Yedekli, EDM izlemeli",
      "en": "Redundant, EDM-monitored",
      "de": "Redundant, EDM-überwacht"
     }
    }
   ],
   "tests": [
    {
     "step": {
      "tr": "Çevrim sırasında kapağı aç, sonra kapat",
      "en": "Open the lid during the cycle, then close it",
      "de": "Deckel während des Zyklus öffnen, dann schließen"
     },
     "expected": {
      "tr": "Makine kendiliğinden başlamaz",
      "en": "The machine does not start by itself",
      "de": "Maschine startet nicht selbsttätig"
     }
    },
    {
     "step": {
      "tr": "Reset butonunu basılı tutarak kapağı kapat",
      "en": "Close the lid while holding the reset button pressed",
      "de": "Deckel bei gedrücktem Rückstelltaster schließen"
     },
     "expected": {
      "tr": "Reset gerçekleşmez (düşen kenar)",
      "en": "No reset (falling edge)",
      "de": "Keine Rückstellung (fallende Flanke)"
     }
    }
   ]
  },
  {
   "key": "estop",
   "name": {
    "tr": "Acil durdurma",
    "en": "Emergency stop",
    "de": "Not-Halt"
   },
   "desc": {
    "tr": "Acil stop butonuna basıldığında tüm tehlikeli hareket ve püskürme durdurulur, buton kilitli kalır (EN ISO 13850, durdurma kategorisi 0).",
    "en": "When the emergency stop button is pressed, all hazardous motion and spraying are stopped and the button latches (EN ISO 13850, stop category 0).",
    "de": "Bei Betätigung des Not-Halt-Tasters werden alle gefährlichen Bewegungen und das Spritzen gestoppt, der Taster rastet ein (EN ISO 13850, Stoppkategorie 0)."
   },
   "trigger": {
    "tr": "Acil stop butonuna basılması",
    "en": "Emergency stop button pressed",
    "de": "Betätigung des Not-Halt-Tasters"
   },
   "safe": {
    "tr": "Tahrikler enerjisiz; reset gerekli",
    "en": "Drives de-energised; reset required",
    "de": "Antriebe energielos; Rückstellung erforderlich"
   },
   "S": 2,
   "F": 1,
   "P": 1,
   "just": {
    "S": {
     "tr": "Acil durumun kaynağı olan tehlikeler ciddi yaralanmaya yol açabilir.",
     "en": "The hazards causing the emergency can lead to serious injury.",
     "de": "Die den Notfall verursachenden Gefährdungen können zu schweren Verletzungen führen."
    },
    "F": {
     "tr": "Acil durum seyrek oluşur.",
     "en": "Emergencies occur rarely.",
     "de": "Notfälle treten selten auf."
    },
    "P": {
     "tr": "Panel operatörün erişim alanında; tamamlayıcı önlemdir.",
     "en": "The panel is within the operator's reach; complementary measure.",
     "de": "Bedienpult im Greifraum des Bedieners; ergänzende Maßnahme."
    }
   },
   "subs": [
    {
     "role": "input",
     "comp": {
      "tr": "S0 — acil stop, 2×NC zorunlu açılır (IEC 60947-5-5)",
      "en": "S0 — emergency stop, 2×NC positive opening (IEC 60947-5-5)",
      "de": "S0 — Not-Halt, 2 Öffner zwangsöffnend (IEC 60947-5-5)"
     },
     "cat": "3",
     "b10d": 100000,
     "nop": 220,
     "mttfd": null,
     "dc": 99,
     "plOverride": "",
     "plCap": "d",
     "note": {
      "tr": "n<sub>op</sub> = 220/yıl (günde 1 varsayım); mekanik arıza dışlaması → maks. PL d",
      "en": "n<sub>op</sub> = 220/year (1 per day assumed); mechanical fault exclusion → max. PL d",
      "de": "n<sub>op</sub> = 220/Jahr (1× täglich angenommen); mechanischer Fehlerausschluss → max. PL d"
     }
    },
    {
     "role": "logic",
     "comp": {
      "tr": "K0 — emniyet rölesi (ortak)",
      "en": "K0 — safety relay (shared)",
      "de": "K0 — Sicherheitsrelais (gemeinsam)"
     },
     "cat": "4",
     "b10d": null,
     "nop": null,
     "mttfd": null,
     "dc": null,
     "plOverride": "e",
     "plCap": "",
     "note": {
      "tr": "Üretici verisi",
      "en": "Manufacturer data",
      "de": "Herstellerangabe"
     }
    },
    {
     "role": "output",
     "comp": {
      "tr": "K1, K2 — ortak",
      "en": "K1, K2 — shared",
      "de": "K1, K2 — gemeinsam"
     },
     "cat": "3",
     "b10d": 1300000,
     "nop": null,
     "mttfd": null,
     "dc": 99,
     "plOverride": "",
     "plCap": "",
     "note": {
      "tr": "EDM izlemeli",
      "en": "EDM-monitored",
      "de": "EDM-überwacht"
     }
    }
   ],
   "tests": [
    {
     "step": {
      "tr": "Çevrim sırasında acil stop butonuna bas",
      "en": "Press the emergency stop during the cycle",
      "de": "Not-Halt während des Zyklus betätigen"
     },
     "expected": {
      "tr": "Durdurma kat. 0; tahrikler enerjisiz; buton kilitli kalır",
      "en": "Stop category 0; drives de-energised; button latches",
      "de": "Stoppkategorie 0; Antriebe energielos; Taster rastet ein"
     }
    },
    {
     "step": {
      "tr": "Acil stop butonunu çöz",
      "en": "Release the emergency stop",
      "de": "Not-Halt entriegeln"
     },
     "expected": {
      "tr": "Makine başlamaz; reset + start gerekir",
      "en": "The machine does not start; reset + start required",
      "de": "Maschine startet nicht; Rückstellung + Start erforderlich"
     }
    }
   ]
  },
  {
   "key": "guard_locking",
   "name": {
    "tr": "Zaman gecikmeli kapak kilitleme (guard locking)",
    "en": "Time-delayed guard locking",
    "de": "Zeitverzögerte Zuhaltung"
   },
   "desc": {
    "tr": "Çevrim ve tahliye süresi boyunca kapak kilitli tutulur; kilit ancak tehlikeli hareket durduktan ve ayarlı süre dolduktan sonra açılır (EN ISO 14119 §5.7).",
    "en": "The lid is kept locked during the cycle and extraction time; the lock releases only after hazardous motion has stopped and the set time has elapsed (EN ISO 14119 §5.7).",
    "de": "Der Deckel bleibt während Zyklus und Absaugzeit zugehalten; die Zuhaltung öffnet erst nach Stillstand und Ablauf der eingestellten Zeit (EN ISO 14119 §5.7)."
   },
   "trigger": {
    "tr": "Kapak açma talebi",
    "en": "Request to open the lid",
    "de": "Öffnungsanforderung"
   },
   "safe": {
    "tr": "Kapak kilitli; tehlike sona erene kadar açılmaz",
    "en": "Lid locked until the hazard has ceased",
    "de": "Deckel zugehalten bis die Gefährdung beendet ist"
   },
   "S": 2,
   "F": 2,
   "P": 1,
   "just": {
    "S": {
     "tr": "Buhar / sıcak sıvı veya duruşa geçmekte olan parçalar ciddi yaralanmaya yol açabilir.",
     "en": "Steam / hot liquid or run-down parts can cause serious injury.",
     "de": "Dampf / heiße Flüssigkeit oder nachlaufende Teile können schwere Verletzungen verursachen."
    },
    "F": {
     "tr": "Kapak her çevrimde açılır.",
     "en": "The lid is opened every cycle.",
     "de": "Der Deckel wird bei jedem Zyklus geöffnet."
    },
    "P": {
     "tr": "Tehlike algılanabilir, kapak yavaş açılır.",
     "en": "The hazard is perceivable, the lid opens slowly.",
     "de": "Gefährdung wahrnehmbar, Deckel öffnet langsam."
    }
   },
   "subs": [
    {
     "role": "input",
     "comp": {
      "tr": "B2 — kilitlemeli emniyet anahtarı (guard locking), kilit izlemeli · [marka / tip]",
      "en": "B2 — interlock with guard locking, lock monitoring · [make / type]",
      "de": "B2 — Sicherheitsschalter mit Zuhaltung, Zuhaltungsüberwachung · [Hersteller / Typ]"
     },
     "cat": "3",
     "b10d": 2000000,
     "nop": null,
     "mttfd": null,
     "dc": 99,
     "plOverride": "",
     "plCap": "d",
     "note": {
      "tr": "Mekanik arıza dışlaması → maks. PL d",
      "en": "Mechanical fault exclusion → max. PL d",
      "de": "Mechanischer Fehlerausschluss → max. PL d"
     }
    },
    {
     "role": "logic",
     "comp": {
      "tr": "K0 — emniyet rölesi + gecikme modülü · [tip]",
      "en": "K0 — safety relay + delay module · [type]",
      "de": "K0 — Sicherheitsrelais + Verzögerungsmodul · [Typ]"
     },
     "cat": "4",
     "b10d": null,
     "nop": null,
     "mttfd": null,
     "dc": null,
     "plOverride": "e",
     "plCap": "",
     "note": {
      "tr": "Üretici verisi",
      "en": "Manufacturer data",
      "de": "Herstellerangabe"
     }
    }
   ],
   "tests": [
    {
     "step": {
      "tr": "Çevrim sırasında kapağı açmaya çalış",
      "en": "Try to open the lid during the cycle",
      "de": "Versuch, den Deckel während des Zyklus zu öffnen"
     },
     "expected": {
      "tr": "Kapak kilitli kalır",
      "en": "The lid stays locked",
      "de": "Deckel bleibt zugehalten"
     }
    },
    {
     "step": {
      "tr": "Gecikme süresini kronometre ile ölç",
      "en": "Measure the delay time with a stopwatch",
      "de": "Verzögerungszeit mit Stoppuhr messen"
     },
     "expected": {
      "tr": "Ayarlı süre ≥ [s]",
      "en": "Set time ≥ [s]",
      "de": "Eingestellte Zeit ≥ [s]"
     }
    }
   ]
  },
  {
   "key": "overtemp",
   "name": {
    "tr": "Aşırı sıcaklık sınırlaması (ısıtıcı)",
    "en": "Over-temperature limitation (heater)",
    "de": "Übertemperaturbegrenzung (Heizung)"
   },
   "desc": {
    "tr": "Sıvı sıcaklığı ayarlı sınırı aştığında bağımsız emniyet termostatı (STB) ısıtıcı kontaktörünü enerjisiz bırakır; manuel reset gerekir.",
    "en": "When the liquid temperature exceeds the set limit, an independent safety temperature limiter (STB) de-energises the heater contactor; manual reset required.",
    "de": "Überschreitet die Flüssigkeitstemperatur den Grenzwert, schaltet ein unabhängiger Sicherheitstemperaturbegrenzer (STB) das Heizungsschütz ab; manuelle Rückstellung erforderlich."
   },
   "trigger": {
    "tr": "Sıcaklık > sınır değer",
    "en": "Temperature > limit",
    "de": "Temperatur > Grenzwert"
   },
   "safe": {
    "tr": "Isıtıcı enerjisiz",
    "en": "Heater de-energised",
    "de": "Heizung energielos"
   },
   "S": 2,
   "F": 1,
   "P": 1,
   "just": {
    "S": {
     "tr": "Aşırı ısınma yanık veya yangına yol açabilir.",
     "en": "Overheating can cause burns or fire.",
     "de": "Überhitzung kann Verbrennungen oder Brand verursachen."
    },
    "F": {
     "tr": "Termostat arızası seyrek oluşur.",
     "en": "Thermostat failure occurs rarely.",
     "de": "Thermostatausfall tritt selten auf."
    },
    "P": {
     "tr": "Sıcaklık artışı yavaştır ve ekranda görülebilir.",
     "en": "The temperature rise is slow and visible on the display.",
     "de": "Der Temperaturanstieg ist langsam und im Display sichtbar."
    }
   },
   "subs": [
    {
     "role": "input",
     "comp": {
      "tr": "STB — bağımsız emniyet termostatı (EN 60730-2-9) · [tip]",
      "en": "STB — independent safety thermostat (EN 60730-2-9) · [type]",
      "de": "STB — unabhängiger Sicherheitstemperaturbegrenzer (EN 60730-2-9) · [Typ]"
     },
     "cat": "1",
     "b10d": null,
     "nop": null,
     "mttfd": 50,
     "dc": null,
     "plOverride": "",
     "plCap": "",
     "note": {
      "tr": "İyi denenmiş bileşen",
      "en": "Well-tried component",
      "de": "Bewährtes Bauteil"
     }
    },
    {
     "role": "output",
     "comp": {
      "tr": "K3 — ısıtıcı kontaktörü · [tip]",
      "en": "K3 — heater contactor · [type]",
      "de": "K3 — Heizungsschütz · [Typ]"
     },
     "cat": "1",
     "b10d": 1300000,
     "nop": 2000,
     "mttfd": null,
     "dc": null,
     "plOverride": "",
     "plCap": "",
     "note": {
      "tr": "",
      "en": "",
      "de": ""
     }
    }
   ],
   "tests": [
    {
     "step": {
      "tr": "STB sınırını düşür veya sensörü ısıt",
      "en": "Lower the STB limit or heat the sensor",
      "de": "STB-Grenzwert absenken oder Fühler erwärmen"
     },
     "expected": {
      "tr": "Isıtıcı kesilir; manuel reset gerekir",
      "en": "Heater switches off; manual reset required",
      "de": "Heizung schaltet ab; manuelle Rückstellung erforderlich"
     }
    }
   ]
  },
  {
   "key": "dry_run",
   "name": {
    "tr": "Düşük seviyede ısıtıcı kilidi",
    "en": "Low-level heater interlock",
    "de": "Heizungsverriegelung bei Wassermangel"
   },
   "desc": {
    "tr": "Sıvı seviyesi minimumun altına düştüğünde seviye şalteri ısıtıcı kontaktörünü enerjisiz bırakır (WASSERMANGEL).",
    "en": "When the liquid level drops below the minimum, the level switch de-energises the heater contactor (WASSERMANGEL).",
    "de": "Sinkt der Flüssigkeitsstand unter das Minimum, schaltet der Niveauschalter das Heizungsschütz ab (WASSERMANGEL)."
   },
   "trigger": {
    "tr": "Seviye < minimum",
    "en": "Level < minimum",
    "de": "Niveau < Minimum"
   },
   "safe": {
    "tr": "Isıtıcı enerjisiz",
    "en": "Heater de-energised",
    "de": "Heizung energielos"
   },
   "S": 2,
   "F": 1,
   "P": 1,
   "just": {
    "S": {
     "tr": "Kuru çalışma yangına yol açabilir.",
     "en": "Dry running can lead to fire.",
     "de": "Trockenlauf kann zu einem Brand führen."
    },
    "F": {
     "tr": "Düşük seviye seyrek oluşur.",
     "en": "Low level occurs rarely.",
     "de": "Wassermangel tritt selten auf."
    },
    "P": {
     "tr": "Arıza lambası ile uyarı verilir.",
     "en": "A fault lamp gives a warning.",
     "de": "Störungsleuchte warnt."
    }
   },
   "subs": [
    {
     "role": "input",
     "comp": {
      "tr": "Seviye şalteri · [tip]",
      "en": "Level switch · [type]",
      "de": "Niveauschalter · [Typ]"
     },
     "cat": "1",
     "b10d": null,
     "nop": null,
     "mttfd": 50,
     "dc": null,
     "plOverride": "",
     "plCap": "",
     "note": {
      "tr": "",
      "en": "",
      "de": ""
     }
    },
    {
     "role": "output",
     "comp": {
      "tr": "K3 — ısıtıcı kontaktörü (ortak)",
      "en": "K3 — heater contactor (shared)",
      "de": "K3 — Heizungsschütz (gemeinsam)"
     },
     "cat": "1",
     "b10d": 1300000,
     "nop": 2000,
     "mttfd": null,
     "dc": null,
     "plOverride": "",
     "plCap": "",
     "note": {
      "tr": "",
      "en": "",
      "de": ""
     }
    }
   ],
   "tests": [
    {
     "step": {
      "tr": "Tankı minimum seviyenin altına boşalt",
      "en": "Drain the tank below the minimum level",
      "de": "Tank unter das Mindestniveau entleeren"
     },
     "expected": {
      "tr": "Isıtıcı kesilir, WASSERMANGEL lambası yanar",
      "en": "Heater switches off, WASSERMANGEL lamp lights",
      "de": "Heizung aus, Leuchte WASSERMANGEL an"
     }
    }
   ]
  }
 ],
 "hazardTests": [
  {
   "hz": "gas_spring",
   "step": {
    "tr": "Tek gaz amortisör sökülü iken kapağı tam açık konumda bırak",
    "en": "With one gas spring removed, leave the lid fully open",
    "de": "Mit einer ausgebauten Gasdruckfeder den Deckel ganz geöffnet lassen"
   },
   "expected": {
    "tr": "Kapak düşmez / kontrollü iner [kriter]",
    "en": "The lid does not fall / lowers in a controlled way [criterion]",
    "de": "Deckel fällt nicht / senkt sich kontrolliert [Kriterium]"
   }
  },
  {
   "hz": "lid_force",
   "step": {
    "tr": "Kapak açma ve kapama kuvvetini dinamometre ile tutamaktan ölç",
    "en": "Measure the lid opening and closing force at the handle with a force gauge",
    "de": "Öffnungs- und Schließkraft am Griff mit Kraftmesser messen"
   },
   "expected": {
    "tr": "≤ [N] (EN 1005-3)",
    "en": "≤ [N] (EN 1005-3)",
    "de": "≤ [N] (EN 1005-3)"
   }
  },
  {
   "hz": "lid_crush",
   "step": {
    "tr": "Ezilme/makaslama aralıklarını ölç",
    "en": "Measure crushing/shearing gaps",
    "de": "Quetsch-/Scherspalte messen"
   },
   "expected": {
    "tr": "≥ 25 mm (parmak) veya ≤ 4 mm (EN ISO 13854)",
    "en": "≥ 25 mm (finger) or ≤ 4 mm (EN ISO 13854)",
    "de": "≥ 25 mm (Finger) oder ≤ 4 mm (EN ISO 13854)"
   }
  },
  {
   "hz": "hot_surface",
   "step": {
    "tr": "Çevrim sonu erişilebilir yüzey ve tutamak sıcaklığını ölç",
    "en": "Measure accessible surface and handle temperature at the end of the cycle",
    "de": "Temperatur zugänglicher Flächen und des Griffs am Zyklusende messen"
   },
   "expected": {
    "tr": "Tutamak ≤ 48 °C (EN ISO 13732-1, 10 s temas)",
    "en": "Handle ≤ 48 °C (EN ISO 13732-1, 10 s contact)",
    "de": "Griff ≤ 48 °C (EN ISO 13732-1, 10 s Kontakt)"
   }
  }
 ],
 "standards": [
  {
   "ref": "2006/42/AT · (AB) 2023/1230",
   "title": {
    "tr": "Makine Emniyeti Yönetmeliği — Ek I (20.01.2027'den itibaren Makine Tüzüğü)",
    "en": "Machinery Directive — Annex I (Machinery Regulation from 20.01.2027)",
    "de": "Maschinenrichtlinie — Anhang I (ab 20.01.2027 Maschinenverordnung)"
   }
  },
  {
   "ref": "2014/35/AB · 2014/30/AB",
   "title": {
    "tr": "Alçak Gerilim · Elektromanyetik Uyumluluk",
    "en": "Low Voltage · Electromagnetic Compatibility",
    "de": "Niederspannung · EMV"
   }
  },
  {
   "ref": "EN ISO 12100:2010",
   "title": {
    "tr": "Tasarım genel prensipleri — Risk değerlendirmesi ve risk azaltma (Tip A)",
    "en": "General principles for design — Risk assessment and risk reduction (type A)",
    "de": "Allgemeine Gestaltungsleitsätze — Risikobeurteilung und Risikominderung (Typ A)"
   }
  },
  {
   "ref": "EN ISO 13849-1:2023",
   "title": {
    "tr": "Kontrol sistemlerinin güvenlikle ilgili parçaları — Bölüm 1: Tasarım için genel prensipler",
    "en": "Safety-related parts of control systems — Part 1: General principles for design",
    "de": "Sicherheitsbezogene Teile von Steuerungen — Teil 1: Allgemeine Gestaltungsleitsätze"
   }
  },
  {
   "ref": "EN ISO 13849-2:2012",
   "title": {
    "tr": "Kontrol sistemlerinin güvenlikle ilgili parçaları — Bölüm 2: Validasyon",
    "en": "Safety-related parts of control systems — Part 2: Validation",
    "de": "Sicherheitsbezogene Teile von Steuerungen — Teil 2: Validierung"
   }
  },
  {
   "ref": "EN 12921-1:2005+A1:2010",
   "title": {
    "tr": "Endüstriyel parçaların sıvı veya buharla yüzey temizleme makineleri — Genel güvenlik gereklilikleri (Tip C)",
    "en": "Machines for surface cleaning of industrial items using liquids or vapours — Common safety requirements (type C)",
    "de": "Oberflächenreinigung industrieller Erzeugnisse mit Flüssigkeiten oder Dampf — Allgemeine Sicherheitsanforderungen (Typ C)"
   }
  },
  {
   "ref": "EN ISO 14119:2013",
   "title": {
    "tr": "Koruyucularla ilişkili kilitleme tertibatları — Tasarım ve seçim",
    "en": "Interlocking devices associated with guards — Design and selection",
    "de": "Verriegelungseinrichtungen mit trennenden Schutzeinrichtungen — Gestaltung und Auswahl"
   }
  },
  {
   "ref": "EN ISO 14120:2015",
   "title": {
    "tr": "Koruyucular — Sabit ve hareketli koruyucular",
    "en": "Guards — Fixed and movable guards",
    "de": "Trennende Schutzeinrichtungen — feststehend und beweglich"
   }
  },
  {
   "ref": "EN ISO 13854:2019",
   "title": {
    "tr": "İnsan vücudunun ezilmesini önlemek için minimum aralıklar",
    "en": "Minimum gaps to avoid crushing of parts of the human body",
    "de": "Mindestabstände zur Vermeidung des Quetschens von Körperteilen"
   }
  },
  {
   "ref": "EN ISO 13855:2010 · 13857:2019",
   "title": {
    "tr": "Koruyucu donanımların konumlandırılması · Güvenlik mesafeleri",
    "en": "Positioning of safeguards · Safety distances",
    "de": "Anordnung von Schutzeinrichtungen · Sicherheitsabstände"
   }
  },
  {
   "ref": "EN ISO 13850:2015",
   "title": {
    "tr": "Acil durdurma fonksiyonu — Tasarım prensipleri",
    "en": "Emergency stop function — Principles for design",
    "de": "Not-Halt-Funktion — Gestaltungsleitsätze"
   }
  },
  {
   "ref": "EN ISO 14118:2018",
   "title": {
    "tr": "Beklenmeyen çalışmanın önlenmesi",
    "en": "Prevention of unexpected start-up",
    "de": "Vermeidung von unerwartetem Anlauf"
   }
  },
  {
   "ref": "EN ISO 13732-1:2008",
   "title": {
    "tr": "Sıcak yüzeylerle temas — Yanık eşik değerleri",
    "en": "Contact with hot surfaces — Burn threshold values",
    "de": "Kontakt mit heißen Oberflächen — Verbrennungsschwellen"
   }
  },
  {
   "ref": "EN 60204-1:2018",
   "title": {
    "tr": "Makinelerin elektrik donanımı — Genel kurallar (Bölüm 18: Doğrulama)",
    "en": "Electrical equipment of machines — General requirements (Clause 18: Verification)",
    "de": "Elektrische Ausrüstung von Maschinen — Allgemeine Anforderungen (Abschnitt 18: Prüfungen)"
   }
  },
  {
   "ref": "EN 1005-3 · EN ISO 7010",
   "title": {
    "tr": "Makine kullanımı için önerilen kuvvet sınırları · Güvenlik işaretleri",
    "en": "Recommended force limits for machinery operation · Safety signs",
    "de": "Empfohlene Kraftgrenzen bei Maschinenbetätigung · Sicherheitszeichen"
   }
  }
 ],
 "signs": [
  {
   "code": "W001",
   "meaning": {
    "tr": "Genel uyarı",
    "en": "General warning",
    "de": "Allgemeines Warnzeichen"
   }
  },
  {
   "code": "W012",
   "meaning": {
    "tr": "Elektrik tehlikesi",
    "en": "Warning: electricity",
    "de": "Warnung vor elektrischer Spannung"
   }
  },
  {
   "code": "W017",
   "meaning": {
    "tr": "Sıcak yüzey",
    "en": "Warning: hot surface",
    "de": "Warnung vor heißer Oberfläche"
   }
  },
  {
   "code": "W023",
   "meaning": {
    "tr": "Aşındırıcı madde",
    "en": "Warning: corrosive substance",
    "de": "Warnung vor ätzenden Stoffen"
   }
  },
  {
   "code": "W024",
   "meaning": {
    "tr": "El ezilme tehlikesi",
    "en": "Warning: crushing of hands",
    "de": "Warnung vor Handverletzungen"
   }
  },
  {
   "code": "W025",
   "meaning": {
    "tr": "Kapanan hareketli parçalar",
    "en": "Warning: counter-rotating rollers / moving parts",
    "de": "Warnung vor gegenläufigen Rollen / bewegten Teilen"
   }
  },
  {
   "code": "M002",
   "meaning": {
    "tr": "Kullanım kılavuzunu okuyun",
    "en": "Refer to the instruction manual",
    "de": "Gebrauchsanweisung beachten"
   }
  },
  {
   "code": "M003",
   "meaning": {
    "tr": "Kulak koruyucu kullanın",
    "en": "Wear ear protection",
    "de": "Gehörschutz benutzen"
   }
  },
  {
   "code": "M004",
   "meaning": {
    "tr": "Göz koruması kullanın",
    "en": "Wear eye protection",
    "de": "Augenschutz benutzen"
   }
  },
  {
   "code": "M009",
   "meaning": {
    "tr": "Koruyucu eldiven kullanın",
    "en": "Wear protective gloves",
    "de": "Handschutz benutzen"
   }
  },
  {
   "code": "M014",
   "meaning": {
    "tr": "Baş koruması kullanın",
    "en": "Wear head protection",
    "de": "Kopfschutz benutzen"
   }
  }
 ],
 "ccf": [
  {
   "no": "1",
   "max": 15,
   "measure": {
    "tr": "Ayırma / segregasyon — sinyal yollarının fiziksel ayrımı, yeterli açıklık ve yalıtım",
    "en": "Separation / segregation — physical separation of signal paths, clearances and insulation",
    "de": "Trennung — physische Trennung der Signalwege, Abstände und Isolation"
   },
   "evidence": {
    "tr": "Ayrı kablo damarları, ayrı klemens grubu [teyit]",
    "en": "Separate cable cores, separate terminal group [confirm]",
    "de": "Getrennte Adern, separate Klemmengruppe [bestätigen]"
   },
   "applied": true
  },
  {
   "no": "2",
   "max": 20,
   "measure": {
    "tr": "Çeşitlilik — farklı teknoloji / tasarım / fiziksel prensip",
    "en": "Diversity — different technologies / design / physical principles",
    "de": "Diversität — unterschiedliche Technologien / Konstruktion / Prinzipien"
   },
   "evidence": {
    "tr": "Aynı tip kontaktörler → uygulanmadı",
    "en": "Same contactor type → not applied",
    "de": "Gleicher Schütztyp → nicht angewendet"
   },
   "applied": false
  },
  {
   "no": "3.1",
   "max": 15,
   "measure": {
    "tr": "Aşırı gerilim, aşırı akım vb. koruma",
    "en": "Protection against over-voltage, over-current etc.",
    "de": "Schutz gegen Überspannung, Überstrom usw."
   },
   "evidence": {
    "tr": "Kontrol devresi sigortası, bobin bastırıcıları",
    "en": "Control circuit fuse, coil suppressors",
    "de": "Steuerstromsicherung, Spulenbeschaltung"
   },
   "applied": true
  },
  {
   "no": "3.2",
   "max": 5,
   "measure": {
    "tr": "İyi denenmiş bileşenlerin kullanımı",
    "en": "Use of well-tried components",
    "de": "Verwendung bewährter Bauteile"
   },
   "evidence": {
    "tr": "EN ISO 13849-2 Ek D uygun bileşenler",
    "en": "Components according to EN ISO 13849-2 Annex D",
    "de": "Bauteile gemäß EN ISO 13849-2 Anhang D"
   },
   "applied": true
  },
  {
   "no": "4",
   "max": 5,
   "measure": {
    "tr": "Değerlendirme / analiz — tasarımda FMEA",
    "en": "Assessment / analysis — FMEA in design",
    "de": "Bewertung / Analyse — FMEA in der Konstruktion"
   },
   "evidence": {
    "tr": "Bu rapor + devre FMEA'sı [eklenecek]",
    "en": "This report + circuit FMEA [to be attached]",
    "de": "Dieser Bericht + Schaltungs-FMEA [beifügen]"
   },
   "applied": true
  },
  {
   "no": "5",
   "max": 5,
   "measure": {
    "tr": "Yetkinlik / eğitim — tasarımcıların CCF eğitimi",
    "en": "Competence / training — designers trained in CCF",
    "de": "Kompetenz / Schulung — CCF-Schulung der Konstrukteure"
   },
   "evidence": {
    "tr": "Eğitim kaydı [teyit]",
    "en": "Training record [confirm]",
    "de": "Schulungsnachweis [bestätigen]"
   },
   "applied": true
  },
  {
   "no": "6.1",
   "max": 25,
   "measure": {
    "tr": "Çevresel — EMC bağışıklığı",
    "en": "Environmental — EMC immunity",
    "de": "Umwelteinflüsse — EMV-Störfestigkeit"
   },
   "evidence": {
    "tr": "EN 61000-6-2 uyumlu bileşenler",
    "en": "Components compliant with EN 61000-6-2",
    "de": "Bauteile nach EN 61000-6-2"
   },
   "applied": true
  },
  {
   "no": "6.2",
   "max": 10,
   "measure": {
    "tr": "Çevresel — sıcaklık, nem, titreşim, şok",
    "en": "Environmental — temperature, humidity, vibration, shock",
    "de": "Umwelteinflüsse — Temperatur, Feuchte, Vibration, Schock"
   },
   "evidence": {
    "tr": "Bileşenler ortam koşullarına uygun; pano IP54+",
    "en": "Components suit ambient conditions; cabinet IP54+",
    "de": "Bauteile passend zu Umgebungsbedingungen; Schaltschrank IP54+"
   },
   "applied": true
  }
 ],
 "techDefaults": [
  {
   "tr": "Besleme",
   "en": "Supply",
   "de": "Versorgung"
  },
  {
   "tr": "Toplam güç / Akım",
   "en": "Total power / Current",
   "de": "Gesamtleistung / Strom"
  },
  {
   "tr": "Isıtıcı gücü",
   "en": "Heater power",
   "de": "Heizleistung"
  },
  {
   "tr": "Pompa motoru",
   "en": "Pump motor",
   "de": "Pumpenmotor"
  },
  {
   "tr": "Çalışma sıcaklığı",
   "en": "Operating temperature",
   "de": "Betriebstemperatur"
  },
  {
   "tr": "Tank hacmi",
   "en": "Tank volume",
   "de": "Tankvolumen"
  },
  {
   "tr": "Maks. yük",
   "en": "Max. load",
   "de": "Max. Beladung"
  },
  {
   "tr": "Yıkama ortamı",
   "en": "Washing medium",
   "de": "Waschmedium"
  },
  {
   "tr": "Pano koruma sınıfı",
   "en": "Cabinet protection",
   "de": "Schutzart Schaltschrank"
  },
  {
   "tr": "Boyutlar / Ağırlık",
   "en": "Dimensions / Weight",
   "de": "Abmessungen / Gewicht"
  }
 ]
};

  /* ─── Ekler: gürültü standartları ─────────────────────────── */
  LIB.standards.push(
    { ref: "EN ISO 11202:2010", title: { tr: "Akustik — Makinelerin yaydığı gürültü — İş istasyonunda emisyon ses basınç seviyesinin tayini (yerinde yöntem)", en: "Acoustics — Noise emitted by machinery — Determination of emission sound pressure levels at a work station (in situ method)", de: "Akustik — Geräuschabstrahlung von Maschinen — Bestimmung von Emissions-Schalldruckpegeln am Arbeitsplatz (Verfahren vor Ort)" } },
    { ref: "EN ISO 4871:2009", title: { tr: "Akustik — Makinelerin gürültü emisyon değerlerinin beyanı ve doğrulanması", en: "Acoustics — Declaration and verification of noise emission values of machinery", de: "Akustik — Angabe und Nachprüfung von Geräuschemissionswerten von Maschinen" } },
    { ref: "EN ISO 3744:2010 · 3746:2010", title: { tr: "Akustik — Ses basıncı kullanılarak ses gücü seviyesinin tayini", en: "Acoustics — Determination of sound power levels using sound pressure", de: "Akustik — Bestimmung der Schallleistungspegel aus Schalldruckmessungen" } },
    { ref: "2003/10/AT", title: { tr: "Çalışanların gürültüye maruziyeti — eylem ve sınır değerleri (80 / 85 / 87 dB(A))", en: "Exposure of workers to noise — action and limit values (80 / 85 / 87 dB(A))", de: "Lärmexposition von Arbeitnehmern — Auslöse- und Grenzwerte (80 / 85 / 87 dB(A))" } }
  );

  /* ─── Ölçüm kuralları: sınır değerler ────────────────────── */

  /** EN 60204-1:2018 Bölüm 18 — varsayılan test parametreleri ve kabul ölçütleri */
  LIB.elecDefaults = { rpeI: 0.2, rpeT: 5, rpeMax: 0.10, isoU: 500, isoT: 10, isoMin: 1.00, hvU: 1500, hvT: 5, hvMax: 1.50 };

  /** EN ISO 13732-1 — çıplak (kaplamasız) metal yanık eşikleri, °C (1–10 s: Şekil 2 aralığı; ≥ 1 dk: Tablo 1).
      Değerlendirmede aralığın alt sınırı kullanılır. */
  LIB.thermalThresholds = [
    { t: "1 s", lo: 65, hi: 70, label: "65–70" },
    { t: "4 s", lo: 58, hi: 63, label: "≈ 58–63" },
    { t: "10 s", lo: 55, hi: 59, label: "≈ 55–59" },
    { t: "1 dk", lo: 51, hi: 51, label: "51" },
    { t: "10 dk", lo: 48, hi: 48, label: "48" },
    { t: "8 sa", lo: 43, hi: 43, label: "43" }
  ];
  LIB.thermalDefaultLimit = 65;

  /** Gürültü: 2006/42/AT Ek I 1.7.4.2(u) beyan eşikleri ve 2003/10/AT maruziyet eylem değerleri */
  LIB.noiseLimits = {
    declare: 70,      // LpA ≤ 70 dB(A) → "≤ 70 dB(A)" beyanı; üstünde ölçülen değer beyan edilir
    power: 80,        // LpA > 80 dB(A) → ses gücü seviyesi LWA da beyan edilir
    peakPa: 63,       // LpCpeak > 63 Pa (130 dB(C)) → tepe değer beyan edilir
    peakDb: 130,
    lowerAction: 80, upperAction: 85, limit: 87,
    lowerPeak: 135, upperPeak: 137, limitPeak: 140,
    defaultK: 2.5     // EN ISO 11202 derece 2 için tipik belirsizlik (dB)
  };

  /** EN ISO 12100:2010 Tablo B.1 tehlike grupları */
  LIB.hazardGroups = [
    { no: 1, key: "mekanik", tr: "Mekanik", en: "Mechanical", de: "Mechanisch", words: ["mekanik", "mechanical", "mechanisch", "kayma", "slip", "düşme", "ausrutsch", "ezilme", "kesilme"] },
    { no: 2, key: "elektrik", tr: "Elektrik", en: "Electrical", de: "Elektrisch", words: ["elektrik", "electrical", "elektrisch"] },
    { no: 3, key: "termal", tr: "Termal", en: "Thermal", de: "Thermisch", words: ["termal", "thermal", "thermisch", "yangın", "fire"] },
    { no: 4, key: "gurultu", tr: "Gürültü", en: "Noise", de: "Lärm", words: ["gürültü", "noise", "lärm"] },
    { no: 5, key: "titresim", tr: "Titreşim", en: "Vibration", de: "Vibration", words: ["titreşim", "vibration"] },
    { no: 6, key: "radyasyon", tr: "Radyasyon", en: "Radiation", de: "Strahlung", words: ["radyasyon", "radiation", "strahlung", "lazer", "laser", "uv"] },
    { no: 7, key: "madde", tr: "Malzeme / madde", en: "Materials / substances", de: "Materialien / Substanzen", words: ["kimyasal", "chemical", "chemisch", "madde", "substance", "sızıntı", "leak", "buhar / aerosol"] },
    { no: 8, key: "ergonomi", tr: "Ergonomik", en: "Ergonomic", de: "Ergonomisch", words: ["ergonomi", "ergonomic", "ergonomisch", "ağır yük", "heavy"] },
    { no: 9, key: "ortam", tr: "Kullanım ortamı", en: "Environment of use", de: "Einsatzumgebung", words: ["ortam", "environment", "umgebung"] },
    { no: 10, key: "kombinasyon", tr: "Tehlike kombinasyonları", en: "Combinations of hazards", de: "Kombination von Gefährdungen", words: ["kombinasyon", "combination", "kombination", "tümü", "acil durum", "emergency", " + "] }
  ];

  /** Sistematik arızalar — varsayılan metin (proje md'sinde "# Sistematik" yoksa) */
  LIB.systematicDefault = {
    tr: "Güvenlik fonksiyonları donanım (röle) mantığı ile gerçekleştirilmektedir; güvenlikle ilgili yazılım (SRESW/SRASW) bulunmamaktadır [PLC kullanılıyorsa teyit]. Sistematik arızalara karşı EN ISO 13849-1 Ek G önlemleri (enerji kesilmesinde güvenli durum, zorunlu açılan kontaklar, kontaktör ayna kontakları, temel ve iyi denenmiş güvenlik prensipleri) uygulanmıştır.",
    en: "The safety functions are implemented in hardware (relay) logic; there is no safety-related software (SRESW/SRASW) [confirm if a PLC is used]. Measures against systematic failures according to EN ISO 13849-1 Annex G (safe state on loss of power, positive-opening contacts, contactor mirror contacts, basic and well-tried safety principles) have been applied.",
    de: "Die Sicherheitsfunktionen sind in Hardware-(Relais-)Logik realisiert; sicherheitsbezogene Software (SRESW/SRASW) ist nicht vorhanden [bei SPS bestätigen]. Maßnahmen gegen systematische Ausfälle nach EN ISO 13849-1 Anhang G (sicherer Zustand bei Energieausfall, zwangsöffnende Kontakte, Spiegelkontakte der Schütze, grundlegende und bewährte Sicherheitsprinzipien) wurden angewendet."
  };

  /** Markalar: antet ve kapak (P&PX ile aynı renk ve logolar) */
  LIB.brands = {
    DOLFIN: { name: "DOLFIN", sub: "Makine Sanayi", logo: "assets/logos/dolfin.png", accent: "#ff0000", footer: "CNK ELEKTRONİK MAKİNE SAN A.Ş.", text: true },
    ENVA: { name: "ENVA", logo: "assets/logos/enva.svg", accent: "#007938", footer: "Enva Specialist Waste Ltd" },
    VICO: { name: "VICO", logo: "assets/logos/vico.png", accent: "#C41E3A", footer: "vico AB" },
    KSYSTEM: { name: "K.SYSTEM", logo: "assets/logos/ksystem.png", accent: "#1B04AE", footer: "K.SYSTEM GMBH" }
  };
  LIB.preparedLogos = { atlascert: "assets/logos/atlascert.png" };

  /** Ölçüm fotoğrafı adlandırma kuralları (dosya adı → ölçüm satırı) */
  LIB.photoRules = [
    { re: /^PE\s*(\d+)/i, kind: "rpe", tag: (m) => m[1] },
    { re: /^((?:L[123]|N)\s*-\s*(?:L[123]|N|PE))\s+ISO/i, kind: "iso", tag: (m) => m[1].replace(/\s+/g, "").toUpperCase() },
    { re: /^((?:L[123]|N)\s*-\s*(?:L[123]|N|PE))\s+(?:FLASH|HV)/i, kind: "hv", tag: (m) => m[1].replace(/\s+/g, "").toUpperCase() },
    { re: /^(?:GURULTU|GÜRÜLTÜ|NOISE)\s*(\d+)/i, kind: "noise", tag: (m) => m[1] }
  ];

  return LIB;
});
