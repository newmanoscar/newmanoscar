import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { CalendarDays, LogOut, Settings, Sheet as SheetIcon, BarChart3 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Kalender", icon: CalendarDays },
  { to: "/tabelle", label: "Tabelle", icon: SheetIcon },
  { to: "/jahr", label: "Jahr", icon: BarChart3 },
  { to: "/einstellungen", label: "Einstellungen", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Lädt …
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="font-display text-lg font-bold tracking-tight">
            Spesen<span className="text-accent">·</span>Rechner
          </Link>
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  pathname === n.to
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/60",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto md:ml-0"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Abmelden</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-background md:hidden">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className={cn(
              "flex flex-col items-center gap-1 py-2 text-[11px] font-medium",
              pathname === n.to ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <n.icon className="size-5" />
            {/* Feste Vierteilung bei winziger Schrift: lange Beschriftungen wie
                "Einstellungen" muessen abgeschnitten werden statt das Raster zu
                sprengen. */}
            <span className="w-full truncate px-0.5 text-center">{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
