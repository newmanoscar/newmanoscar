import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/passwort-neu")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Neues Passwort – Spesen-Rechner" },
      {
        name: "description",
        content: "Vergib ein neues Passwort für deinen Zugang zum Spesen-Rechner.",
      },
    ],
  }),
  component: NewPasswordPage,
});

/**
 * Ziel des Links aus der "Passwort vergessen"-Mail.
 *
 * Supabase hängt das Wiederherstellungs-Token an die URL an; der Client liest es
 * beim Laden selbst aus (`detectSessionInUrl`) und legt damit eine Session an.
 * Es gibt hier also nichts zu entschlüsseln — ist eine Session da, war der Link
 * gültig, und `updateUser` darf das Passwort setzen. Ohne Session war der Link
 * abgelaufen oder schon benutzt.
 */
function NewPasswordPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== repeat) {
      toast.error("Die beiden Passwörter sind nicht gleich.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Passwort geändert. Du bist angemeldet.");
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message);
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

        {loading ? (
          <p className="mt-8 text-sm text-muted-foreground">Einen Moment …</p>
        ) : !user ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Dieser Link ist abgelaufen oder wurde schon benutzt. Fordere auf der Anmeldeseite
              einen neuen an.
            </p>
            <Button className="mt-6 w-full" onClick={() => navigate({ to: "/auth" })}>
              Zur Anmeldung
            </Button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Vergib ein neues Passwort für {user.email}.
            </p>
            <form onSubmit={submit} className="mt-8 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pw">Neues Passwort</Label>
                <Input
                  id="pw"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw2">Passwort wiederholen</Label>
                <Input
                  id="pw2"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                Passwort speichern
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
