import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.spesenrechner",
  appName: "Spesen-Rechner",
  webDir: "dist/client",
  server: {
    androidScheme: "https",
  },
  plugins: {
    Camera: {
      // Berechtigungstexte werden in Info.plist / AndroidManifest gepflegt
    },
  },
};

export default config;
