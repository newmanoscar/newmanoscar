# Spesen-Rechner – Build und native Verpackung

Dieses Repository enthält den Quellcode der App „Spesen-Rechner" (Lovable-Projekt
`expense-calculator-pro`, dort „Expense Buddy"). Hier steht, wie der Web-Build und
die nativen Apps für Android und iOS entstehen.

## Voraussetzungen

- Node.js 20 oder neuer, npm
- Für Android: Android Studio (inkl. Android SDK und JDK 21)
- Für iOS: macOS mit Xcode und CocoaPods (`sudo gem install cocoapods`),
  Apple-Developer-Account für die Auslieferung

```sh
npm install
```

## Umgebungsvariablen

`.env` wird bewusst **nicht** mitversioniert. Lege sie nach `.env.example` an und
übernimm die Werte aus dem Lovable-Projekt (Cloud → Supabase) bzw. dem
Supabase-Dashboard:

| Variable | Zweck |
| --- | --- |
| `VITE_SUPABASE_URL` / `SUPABASE_URL` | Projekt-Endpunkt |
| `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` | Öffentlicher Client-Key |
| `VITE_SUPABASE_PROJECT_ID` / `SUPABASE_PROJECT_ID` | Projekt-ID |
| `SUPABASE_SERVICE_ROLE_KEY` | Nur serverseitig, umgeht RLS – niemals committen |

Die `VITE_*`-Werte landen im Client-Bundle; das ist beim Publishable Key so
vorgesehen. Der Service-Role-Key darf ausschließlich serverseitig gesetzt werden.

> **Wichtig:** Die `VITE_*`-Variablen werden **zur Build-Zeit** ins Bundle
> eingesetzt, nicht zur Laufzeit gelesen. Ein Build ohne `.env` läuft ohne Fehler
> durch, die App zeigt dann aber beim Start „Missing Supabase environment
> variable(s)" und kann sich nicht anmelden. `.env` muss also **vor**
> `npm run build:native` bzw. `npm run cap:sync` vorhanden sein — und nach einer
> Änderung an `.env` ist ein erneuter Build plus `cap sync` nötig, sonst steckt im
> nativen Projekt weiter das alte Bundle.

## Zwei Build-Ziele

Das Projekt hat bewusst zwei Vite-Konfigurationen, weil Web und App
unterschiedliche Artefakte brauchen:

| Befehl | Config | Ergebnis | Wofür |
| --- | --- | --- | --- |
| `npm run build` | `vite.config.ts` | `.output/` (Nitro-Worker, SSR) | Lovable-Deployment, Cloudflare |
| `npm run build:native` | `vite.config.native.ts` | `dist/client/` (statisch, mit `index.html`) | Capacitor |

**Warum getrennt?** Der Standard-Build rendert serverseitig und legt einen
Nitro-Worker in `.output/` ab – dort entsteht absichtlich keine `index.html`. Ein
Capacitor-WebView lädt aber lokale Dateien von der Platte und braucht genau die.
`vite.config.native.ts` schaltet deshalb Nitro ab (dadurch schreibt Vite wieder in
`dist/client`, das `webDir` aus `capacitor.config.ts`) und aktiviert den SPA-Modus
von TanStack Start, der eine statische Shell prerendert. Inhaltlich geht dabei
nichts verloren: alle Routen der App stehen ohnehin auf `ssr: false`.

## Android

Das Projekt unter `android/` ist bereits erzeugt und mitversioniert, inklusive der
Kamera-Berechtigungen in `android/app/src/main/AndroidManifest.xml`
(`CAMERA`, `READ_MEDIA_IMAGES`, `READ_EXTERNAL_STORAGE` bis API 32).

```sh
npm run cap:sync        # baut dist/client und kopiert es nach android/
npm run cap:open:android # öffnet Android Studio
# oder in einem Schritt:
npm run android
```

Signiertes Release für den Play Store:

1. Keystore anlegen (einmalig, sicher aufbewahren – ohne ihn sind keine Updates möglich):
   ```sh
   keytool -genkey -v -keystore spesenrechner.keystore \
     -alias spesenrechner -keyalg RSA -keysize 2048 -validity 10000
   ```
2. In Android Studio: *Build → Generate Signed App Bundle / APK → Android App Bundle*,
   den Keystore auswählen, Variante `release`.
3. Das entstandene `.aab` in der Play Console hochladen.

Alternativ auf der Kommandozeile, wenn Signing in `android/app/build.gradle`
konfiguriert ist:

```sh
cd android && ./gradlew bundleRelease
```

App-ID: `app.lovable.spesenrechner` — muss in der Play Console identisch sein und
lässt sich nach der ersten Veröffentlichung nicht mehr ändern.

## iOS

Das `ios/`-Verzeichnis ist hier **nicht** enthalten: `npx cap add ios` führt
`pod install` aus und braucht macOS mit CocoaPods. Auf einem Mac:

```sh
npm install
npm run build:native
npm run cap:add:ios     # einmalig, erzeugt ios/
npm run cap:sync
npm run cap:open:ios    # öffnet Xcode
```

Danach in `ios/App/App/Info.plist` die Berechtigungstexte ergänzen – ohne sie
lehnt Apple die App ab:

```xml
<key>NSCameraUsageDescription</key>
<string>Für das Fotografieren von Belegen zur Spesenabrechnung.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Um Belege aus der Fotogalerie hinzuzufügen.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Um aufgenommene Belege in der Fotogalerie zu speichern.</string>
```

Auslieferung: In Xcode Signing-Team wählen, Schema auf *Any iOS Device (arm64)*,
dann *Product → Archive* und über den Organizer an App Store Connect verteilen.

Das erzeugte `ios/`-Verzeichnis sollte anschließend committet werden – dort liegen
Info.plist, Icons und die Signing-Konfiguration.

## Datenbank

`supabase/migrations/` enthält den Schemastand: Tabellen `profiles`,
`rate_profiles`, `day_entries` samt RLS-Policies sowie die Storage-Policies für den
Bucket `receipts` (Beleg-Fotos, pro Nutzer isoliert über den Ordner-Präfix
`<user_id>/`).

Der Bucket `receipts` selbst wurde über Lovable Cloud angelegt und ist in den
Migrationen nicht enthalten. Bei einem frischen Supabase-Projekt muss er vor dem
ersten Beleg-Upload manuell erstellt werden (privat, nicht öffentlich).

## Bekannte Punkte

- `npm run lint` meldet Prettier-Abweichungen im aus Lovable übernommenen Code
  (z. B. Zeilen über `printWidth: 100`). Der Code ist absichtlich unverändert
  übernommen, damit der Stand byte-identisch zum Lovable-Projekt bleibt.
  `npm run format` würde das bereinigen, erzeugt dann aber einen großen Diff
  gegenüber Lovable.
- `public/favicon.ico` fehlt (Binärdatei, die über die Lovable-Dateiapi nicht als
  Text übertragbar war). `src/routes/__root.tsx` verweist darauf; der fehlende
  Icon-Request läuft ins 404 und beeinträchtigt sonst nichts.
- Die Schriften kommen von Google Fonts. In der nativen App ohne Netzverbindung
  greifen die System-Fallbacks. Wer sie offline braucht, sollte die Fonts lokal
  einbinden.
- Lockfiles (`package-lock.json`, `bun.lock`) sind nicht übernommen und werden beim
  ersten `npm install` neu erzeugt.
