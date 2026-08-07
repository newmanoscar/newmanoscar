import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle } from "@/lib/auth/google";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Anmelden – Spesen & Verpflegungsmehraufwand" },
      {
        name: "description",
        content:
          "Melde dich an, um deine Reisetage, Pauschalen und Excel-Auswertungen sicher zu speichern.",
      },
      { property: "og:title", content: "Anmelden – Spesen-Rechner" },
      {
        property: "og:description",
        content: "Zugang zu deinen gespeicherten Reisetagen und Abrechnungen.",
      },
    ],
  }),
  component: AuthPage,
});

/**
 * Übersetzt die wenig hilfreichen Supabase-Meldungen in etwas, mit dem man etwas
 * anfangen kann. "Invalid login credentials" kommt nämlich auch dann, wenn das
 * Konto existiert, die E-Mail aber noch nicht bestätigt ist.
 */
function loginErrorText(err: Error): string {
  const msg = err.message ?? "";
  if (/email not confirmed/i.test(msg)) {
    return "E-Mail noch nicht bestätigt. Klick den Link in der Bestätigungsmail.";
  }
  if (/invalid login credentials/i.test(msg)) {
    return "Anmeldung fehlgeschlagen. Entweder stimmt das Passwort nicht – oder die E-Mail-Adresse ist noch nicht bestätigt.";
  }
  return msg;
}

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;

        // Verlangt das Projekt eine E-Mail-Bestätigung, liefert signUp zwar einen
        // Nutzer, aber keine Session. Bis der Link angeklickt ist, scheitert die
        // Anmeldung — und Supabase meldet dann irreführend "Invalid login
        // credentials". Deshalb hier klar ansagen, was noch fehlt.
        if (data.session) {
          navigate({ to: "/" });
          return;
        }
        toast.success(
          "Konto erstellt. Bestätige zuerst den Link in der E-Mail an " +
            `${email} – danach kannst du dich anmelden.`,
          { duration: 10000 },
        );
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(loginErrorText(err as Error));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(`Google-Anmeldung fehlgeschlagen: ${error.message}`);
        return;
      }
      // Im Web ist die Seite an dieser Stelle bereits zum Broker weitergeleitet.
      navigate({ to: "/" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-bold">
          Spesen<span className="text-accent">·</span>Rechner
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Verpflegungsmehraufwand erfassen, berechnen und als Excel exportieren.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw">Passwort</Label>
            <Input
              id="pw"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "login" ? "Anmelden" : "Konto erstellen"}
          </Button>
        </form>

        <Button variant="outline" className="mt-3 w-full" onClick={google} disabled={busy}>
          Mit Google anmelden
        </Button>

        <button
          type="button"
          className="mt-6 w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Noch kein Konto? Registrieren" : "Schon ein Konto? Anmelden"}
        </button>
      </div>
    </div>
  );
}
