// Build-Konfiguration für die native App (Capacitor).
//
// Der normale Build (vite.config.ts) rendert serverseitig und erzeugt in
// .output/ einen Nitro-Worker – dort gibt es bewusst keine statische
// index.html. Ein Capacitor-WebView lädt aber lokale Dateien und braucht
// genau die. Diese Konfiguration aktiviert deshalb den SPA-Modus von
// TanStack Start: es entsteht eine statische Shell, die den Router im
// Client bootet. Alle Routen der App stehen ohnehin auf `ssr: false`,
// inhaltlich geht dabei also nichts verloren.
//
// Verwendung: npm run build:native  (siehe scripts/stage-native-web.mjs)
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Kein Nitro/Cloudflare-Worker für die native App: ohne Nitro schreibt Vite
  // in seine Standardverzeichnisse dist/client und dist/server – und
  // dist/client ist genau das webDir aus capacitor.config.ts. Der
  // Prerender-Schritt findet dort auch den Server-Build, den er braucht.
  nitro: false,
  tanstackStart: {
    server: { entry: "server" },
    spa: {
      enabled: true,
      prerender: {
        enabled: true,
        outputPath: "/index.html",
      },
    },
  },
  vite: {
    // Der Prerender-Schritt startet intern einen Vite-Preview-Server und
    // übernimmt daraus nur Port und `open`; der Host kommt aus dieser Config.
    // Ohne feste Bindung landet er auf "::" und scheitert in Umgebungen ohne
    // IPv6 (Container, CI).
    preview: { host: "127.0.0.1" },
  },
});
