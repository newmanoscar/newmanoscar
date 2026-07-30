## Ziel

Eine App zur Berechnung von Verpflegungsmehraufwand (Spesen) pro Monat: Tage im Kalender erfassen, Pauschalen frei konfigurieren, Ergebnis in einem Excel-ähnlichen Raster prüfen und als XLSX exportieren. Daten liegen in einem Cloud-Konto mit Login.

## Funktionen

**1. Login & Cloud (Lovable Cloud)**
- E-Mail/Passwort-Registrierung und Login, geschützter Bereich
- Jeder Nutzer sieht nur seine eigenen Daten

**2. Kalender-Monatsansicht (Startseite)**
- Monatsgitter, Tag antippen öffnet einen Dialog
- Tagesstatus: Auswärtstätigkeit, Urlaub, Feiertag, Krankheit, Wochenende, normaler Tag in eigener Arbeitsstätte
- Bei Auswärtstätigkeit: Abwesenheitszeiten (von/bis), Abwesenheitsdauer wird berechnet, Kennzeichen An-/Abreisetag, mehrtägige Reise, Ziel/Land, Notiz
- Gestellte Mahlzeiten je Tag ankreuzen (Frühstück / Mittag / Abendessen) → Kürzung
- Farbcodierung je Status, Summen-Leiste über dem Kalender (Tage je Kategorie, Gesamtbetrag)

**3. Berechnungslogik**
- Urlaub, Feiertag, Krankheit und Tage bis 8 h in der eigenen Arbeitsstätte ergeben 0 € und werden getrennt gezählt
- Pauschale nach Abwesenheitsdauer: Schwelle >8 h und Volltag (24 h), An-/Abreisetag mit eigenem Satz
- Kürzung pro gestellter Mahlzeit als Prozentsatz der Volltagspauschale
- Optional: Dreimonatsfrist-Hinweis bei derselben Einsatzstelle (nur Warnhinweis, keine Sperre)

**4. Einstellungen – frei konfigurierbare Sätze**
- Satz-Profile (z. B. Inland, Ausland X, Firmensatz) mit: Volltagssatz, Satz >8 h, An-/Abreisesatz, Kürzung Frühstück/Mittag/Abend in %, Mindeststundenschwelle
- Ein Profil als Standard; pro Tag oder pro Reise überschreibbar
- Vorbelegung mit gängigen Inlandswerten, jederzeit änderbar

**5. Excel-artiges Tabellenblatt**
- Editierbares Raster des Monats: Zeile pro Tag, Spalten Datum, Wochentag, Status, von, bis, Stunden, Ziel, Fr/Mi/Ab, Satz, Kürzung, Betrag
- Zellnavigation mit Pfeiltasten/Tab/Enter, Inline-Bearbeitung, Kopieren/Einfügen von Zellbereichen, Ausfüllen nach unten
- Berechnete Spalten sind live formelbasiert und schreibgeschützt, Summenzeile unten
- Änderungen im Raster und im Kalender wirken auf dieselben Daten
- Zusätzlich: Jahresübersicht mit Monatssummen

**6. Excel-Export / Import**
- Export des Monats bzw. Jahres als .xlsx mit Formatierung, Summen und Kopfzeile (Name, Zeitraum)
- CSV-Export
- Import einer XLSX/CSV mit Spaltenzuordnung, Vorschau vor Übernahme

## Technisches

- TanStack Start + Tailwind, Datenhaltung über Lovable Cloud (Postgres) mit RLS pro Nutzer
- Tabellen: `profiles`, `rate_profiles` (Sätze), `day_entries` (ein Eintrag pro Nutzer und Datum, unique), `trips` optional für mehrtägige Reisen
- Berechnung in einem gemeinsamen Modul, das Kalender, Raster und Export nutzen
- XLSX über `xlsx`/`exceljs` im Browser; Raster als eigene, leichtgewichtige Grid-Komponente
- Deutschsprachige Oberfläche, Layout mobil und Desktop nutzbar

## Reihenfolge

1. Cloud aktivieren, Auth + Datenbank/RLS
2. Berechnungsmodul + Einstellungen für Sätze
3. Kalender-Monatsansicht mit Tagesdialog
4. Excel-artiges Raster + Summen
5. XLSX/CSV-Export und Import
6. Jahresübersicht und Feinschliff
