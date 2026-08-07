import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

/**
 * Rückgabe-Adresse der nativen App. Muss in Supabase unter
 * Authentication → URL Configuration → Redirect URLs eingetragen sein und zum
 * intent-filter in android/app/src/main/AndroidManifest.xml passen.
 */
export const NATIVE_REDIRECT_URI = "app.lovable.spesenrechner://oauth-callback";

type Result = { error: Error | null };

/**
 * Google-Anmeldung.
 *
 * Im Web läuft sie über den OAuth-Broker von Lovable (`/~oauth/initiate`) — ein
 * Server-Endpunkt der Lovable-Hosting-Umgebung.
 *
 * In der nativen App gibt es diesen Endpunkt nicht: Der WebView serviert nur die
 * Dateien aus dem Bundle unter https://localhost, der relative Broker-Pfad läuft
 * dort also in ein 404. Deshalb geht der native Weg direkt über Supabase, öffnet
 * den Provider in einem Custom Tab und nimmt das Ergebnis über einen Deep Link
 * entgegen.
 */
export async function signInWithGoogle(): Promise<Result> {
  if (!Capacitor.isNativePlatform()) {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    return { error: result.error ?? null };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: NATIVE_REDIRECT_URI,
      skipBrowserRedirect: true,
    },
  });
  if (error) return { error };
  if (!data.url) return { error: new Error("Keine Authorisierungs-URL erhalten.") };

  const session = waitForCallback();
  await Browser.open({ url: data.url });

  try {
    return { error: await session };
  } finally {
    await Browser.close().catch(() => {
      // Auf Android schließt sich der Custom Tab durch den Deep Link bereits selbst.
    });
  }
}

/**
 * Wartet auf den Deep Link, mit dem Supabase zurück in die App springt, und setzt
 * die Session. Deckt beide Flows ab: PKCE liefert einen `code` im Query-String,
 * der implizite Flow die Tokens im Fragment.
 *
 * Schließt der Nutzer den Custom Tab, endet das Warten sofort — sonst bliebe die
 * Anmeldemaske bis zum Timeout gesperrt.
 */
function waitForCallback(): Promise<Error | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      finish(new Error("Zeitüberschreitung bei der Google-Anmeldung."));
    }, 180_000);

    const handles: Array<{ remove: () => Promise<void> }> = [];
    let done = false;

    const finish = (error: Error | null) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      handles.forEach((h) => void h.remove());
      resolve(error);
    };

    // Der Deep Link schließt den Custom Tab von selbst, `browserFinished` kann also
    // kurz vor der Zustellung von `appUrlOpen` eintreffen. Deshalb erst nach einer
    // Nachfrist als Abbruch werten.
    void Browser.addListener("browserFinished", () => {
      setTimeout(() => finish(new Error("Anmeldung abgebrochen.")), 1500);
    }).then((h) => handles.push(h));

    void App.addListener("appUrlOpen", async ({ url }) => {
      if (!url.startsWith(NATIVE_REDIRECT_URI)) return;

      try {
        const parsed = new URL(url);
        const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ""));

        const providerError =
          parsed.searchParams.get("error_description") ??
          parsed.searchParams.get("error") ??
          fragment.get("error_description") ??
          fragment.get("error");
        if (providerError) return finish(new Error(providerError));

        const code = parsed.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          return finish(error);
        }

        const access_token = fragment.get("access_token");
        const refresh_token = fragment.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          return finish(error);
        }

        finish(new Error("Antwort enthielt weder Code noch Tokens."));
      } catch (e) {
        finish(e instanceof Error ? e : new Error(String(e)));
      }
    }).then((h) => handles.push(h));
  });
}
