# Spesen-Rechner

App zur Erfassung und Berechnung von Verpflegungsmehraufwand: Reisetage im
Monatskalender erfassen, Pauschalen frei konfigurieren, das Ergebnis in einem
Excel-ähnlichen Raster prüfen und als XLSX, CSV oder PDF exportieren.

- Live-Vorschau: https://expense-calculator-pro.lovable.app
- Lovable-Editor: https://lovable.dev/projects/42d3e801-c452-4c8a-ad46-a865813cfe1e

## Funktionen

- **Kalender** – Monatsgitter, Tag antippen öffnet den Tagesdialog. Tagesarten:
  Auswärtstätigkeit, Arbeitsstätte, Urlaub, Feiertag, Krank, Frei. Nur der Sonntag
  ist visuell markiert; Samstag ist ein regulärer, frei bespielbarer Tag.
- **Berechnung** – Pauschale nach Abwesenheitsdauer (Volltag ab 24 h, Teiltag über
  der Mindeststundenschwelle, eigener An-/Abreisesatz), Kürzung je gestellter
  Mahlzeit als Prozentsatz der Volltagspauschale.
- **Sätze** – beliebig viele Satzprofile, eines als Standard, optional an ein
  Reiseland gebunden. Auslandspauschalen für rund 38 Länder als Vorbelegung.
- **Feiertage** – automatisch berechnet für Deutschland (alle 16 Bundesländer),
  Österreich und die Schweiz, jahresübergreifend ohne manuelle Pflege.
- **Tabelle** – editierbares Monatsraster mit Tastaturnavigation, Mehrfachauswahl,
  Kopieren/Einfügen, Ausfüllen nach unten (Strg+D) und Speichern (Strg+S).
- **Belege** – Foto per Kamera oder aus der Galerie, Speicherung in privatem
  Cloud-Storage, nur für den jeweiligen Nutzer zugänglich.
- **Export/Import** – XLSX, CSV und PDF für Monat und Jahr; Import von XLSX/CSV
  mit Spaltenerkennung über die Kopfzeile.

## Technik

TanStack Start (React 19, TypeScript), Tailwind CSS 4, shadcn/ui, TanStack Query,
Supabase (Auth, Postgres mit RLS, Storage), Capacitor für die nativen Apps.

## Entwicklung

```sh
npm install
cp .env.example .env   # Werte aus dem Lovable-/Supabase-Projekt eintragen
npm run dev
```

## Build und native Apps

Siehe **[BUILD.md](BUILD.md)** — Web-Build, Android (Projekt liegt unter
`android/`, Play-Store-Signing) und iOS (muss auf macOS erzeugt werden).

Kurzform für Android:

```sh
npm run android   # baut dist/client, synct nach android/, öffnet Android Studio
```

## Lovable

Dieses Repository ist der Export des Lovable-Projekts `expense-calculator-pro`.
Wenn es mit Lovable verbunden ist, synchronisieren sich Commits auf dem verbundenen
Branch zurück in den Editor — die Historie dort also nicht umschreiben (siehe
[AGENTS.md](AGENTS.md)).
