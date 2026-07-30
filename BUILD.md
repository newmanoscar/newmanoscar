# Spesen-Rechner – Build und native Verpackung

Dieses Repository enthält den Quellcode der App „Spesen-Rechner" (Lovable-Projekt
`expense-calculator-pro`, dort „Expense Buddy"). Hier steht, wie der Web-Build und
die nativen Apps für Android und iOS entstehen.

## Voraussetzungen

- Node.js 20 oder neuer, npm
- Für Android: Android Studio (inkl. Android SDK und JDK 21)

> **Zwei Einstellungen in Android Studio**, an denen dieses Projekt sonst scheitert
> — beide unter *Settings → Build, Execution, Deployment → Build Tools → Gradle*:
>
> - **Distribution: „Gradle wrapper"**. Neuere Studio-Versionen stellen das gern auf
>   eine eigene, aktuellere Gradle-Installation um. Mit Gradle 9 bricht der Sync ab
>   (`Cannot add extension with name 'kotlin'`), weil mehrere Capacitor-Module
>   `kotlin-android` anwenden — was Gradle 8 toleriert und Gradle 9 nicht mehr.
>   Capacitor 8 ist noch nicht Gradle-9-tauglich, deshalb muss der Wrapper mit
>   Gradle 8.14.3 verwendet werden.
> - **Gradle JDK: 21**. Gültig ist 17 bis 24 (AGP 8.12 verlangt mindestens 17,
>   Gradle 8.14.3 höchstens 24). Aktuelle Studio-Versionen liefern JDK 25 mit und
>   wählen es vor — damit verweigert Gradle den Start.
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

### Signiertes Release für den Play Store

Das Signing ist in `android/app/build.gradle` bereits eingerichtet. Die
Zugangsdaten liegen **nicht** im Repo, sondern werden aus
`android/keystore.properties` (gitignoriert) oder aus Umgebungsvariablen gelesen.
Fehlt beides, bleibt der Release-Build unsigniert und Gradle gibt einen Hinweis
aus – `assembleDebug` funktioniert davon unabhängig, ein frischer Klon ist also
ohne Keystore direkt baubar.

1. Keystore anlegen (einmalig, sicher aufbewahren und sichern – **ohne ihn sind
   keine Updates der App mehr möglich**):
   ```sh
   cd android
   keytool -genkey -v -keystore spesenrechner.keystore \
     -alias spesenrechner -keyalg RSA -keysize 2048 -validity 10000
   ```
2. `android/keystore.properties` nach dem Muster von
   `android/keystore.properties.example` anlegen:
   ```properties
   storeFile=spesenrechner.keystore
   storePassword=…
   keyAlias=spesenrechner
   keyPassword=…
   ```
   `storeFile` ist relativ zu `android/` oder absolut.
3. Bauen:
   ```sh
   npm run cap:sync
   cd android && ./gradlew bundleRelease     # -> app/build/outputs/bundle/release/*.aab
   # oder ./gradlew assembleRelease          # -> app/build/outputs/apk/release/*.apk
   ```
   Alternativ in Android Studio: *Build → Generate Signed App Bundle / APK*.
4. Das `.aab` in der Play Console hochladen.

Für CI gehen statt der Datei auch Umgebungsvariablen — die Datei hat Vorrang:
`SPESEN_KEYSTORE_FILE`, `SPESEN_KEYSTORE_PASSWORD`, `SPESEN_KEY_ALIAS`,
`SPESEN_KEY_PASSWORD`.

App-ID: `app.lovable.spesenrechner` — muss in der Play Console identisch sein und
lässt sich nach der ersten Veröffentlichung nicht mehr ändern.

### Versionsnummern

In `android/app/build.gradle` stehen `versionCode 1` und `versionName "1.0"`.
Der `versionCode` muss bei **jedem** Upload in die Play Console erhöht werden,
sonst lehnt sie das Bundle ab; `versionName` ist die für Nutzer sichtbare Version.

### App-Icon und Startbildschirm

Die Icons sind gesetzt und tragen die Markenfarben der App (Navy `#1F2D4A` mit
dem bernsteinfarbenen Punkt aus der Wortmarke „Spesen·Rechner"):

- `mipmap-anydpi-v26/ic_launcher.xml` – Adaptive Icon (Android 8+): Fläche aus
  `@color/ic_launcher_background`, Motiv aus `mipmap-*/ic_launcher_foreground.png`
- `mipmap-*/ic_launcher.png` – Legacy-Icon für Android 7 (minSdk ist 24)
- `drawable/splash.xml` – Startbildschirm als Layer-List (Markenfläche plus
  zentriertes Motiv) statt der früheren `splash.png` pro Bildschirmdichte, damit
  er auf jeder Auflösung und in beiden Orientierungen scharf bleibt
- `public/favicon.ico` – 16/32/48 px für die Web-Version

Zum Ersetzen durch eigene Grafiken bietet sich
[`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets) an: eine
Quelldatei `assets/icon.png` (1024×1024) und `assets/splash.png` hinterlegen, dann
`npx @capacitor/assets generate --android` — das überschreibt die generierten
Dateien.

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
- Das Favicon aus dem Lovable-Projekt war als Binärdatei nicht über die
  Dateiapi übertragbar. `public/favicon.ico` ist deshalb neu erzeugt und zeigt
  jetzt das Icon-Motiv der App statt des Lovable-Standards.
- Die Schriften kommen von Google Fonts. In der nativen App ohne Netzverbindung
  greifen die System-Fallbacks. Wer sie offline braucht, sollte die Fonts lokal
  einbinden.
- Lovable arbeitet mit bun, dieses Repo mit npm: `bun.lock` wurde nicht übernommen,
  stattdessen liegt ein `package-lock.json` bei, damit Release-Builds reproduzierbar
  sind. bun ignoriert `package-lock.json`, es kollidiert also nicht mit dem
  Lovable-Toolchain.
