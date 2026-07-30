import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Konto erstellt. Du kannst dich jetzt anmelden.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google-Anmeldung fehlgeschlagen.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
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

        <Button variant="outline" className="mt-3 w-full" onClick={google}>
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
