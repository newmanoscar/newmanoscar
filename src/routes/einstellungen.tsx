import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import {
  useDeleteRate,
  useRateProfiles,
  useSaveRate,
  useSaveUserProfile,
  useUserProfile,
} from "@/lib/spesen/data";
import { COUNTRY_RATES } from "@/lib/spesen/countries";
import { HOLIDAY_COUNTRIES, regionsFor } from "@/lib/spesen/holidays";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { RateProfile } from "@/lib/spesen/types";

export const Route = createFileRoute("/einstellungen")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pauschalen und Kürzungssätze konfigurieren" },
      {
        name: "description",
        content:
          "Verpflegungspauschalen frei einstellen: Ganztag, Teiltag, An-/Abreisetag, Mindeststunden und prozentuale Kürzung je Mahlzeit.",
      },
      { property: "og:title", content: "Sätze & Pauschalen einstellen" },
      {
        property: "og:description",
        content: "Eigene Satzprofile für In- und Ausland anlegen und verwalten.",
      },
    ],
  }),
  component: SettingsPage,
});

const FIELDS: { key: keyof RateProfile; label: string; suffix: string }[] = [
  { key: "full_day", label: "Ganztag (≥ 24 h)", suffix: "€" },
  { key: "partial_day", label: "Teiltag (ab Mindeststunden)", suffix: "€" },
  { key: "travel_day", label: "An-/Abreisetag", suffix: "€" },
  { key: "min_hours", label: "Mindeststunden für Teiltag", suffix: "h" },
  { key: "breakfast_pct", label: "Kürzung Frühstück", suffix: "%" },
  { key: "lunch_pct", label: "Kürzung Mittagessen", suffix: "%" },
  { key: "dinner_pct", label: "Kürzung Abendessen", suffix: "%" },
];

function SettingsPage() {
  const { user } = useAuth();
  const { data: rates = [] } = useRateProfiles(user?.id);
  const save = useSaveRate(user?.id);
  const del = useDeleteRate();

  return (
    <AppShell>
      <LocationCard />

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sätze &amp; Pauschalen</h1>
          <p className="text-sm text-muted-foreground">
            Frei konfigurierbar – die Kürzung wird prozentual von der Ganztagspauschale berechnet.
          </p>
        </div>
        <Button
          className="ml-auto"
          onClick={() =>
            save.mutate(
              {
                name: "Neues Profil",
                full_day: 28,
                partial_day: 14,
                travel_day: 14,
                min_hours: 8,
                breakfast_pct: 20,
                lunch_pct: 40,
                dinner_pct: 40,
                country_code: null,
                is_default: rates.length === 0,
              },
              { onSuccess: () => toast.success("Profil angelegt") },
            )
          }
        >
          <Plus className="size-4" /> Profil
        </Button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {rates.map((rate) => (
          <RateCard
            key={rate.id}
            rate={rate}
            onSave={(r) => save.mutate(r, { onSuccess: () => toast.success("Gespeichert") })}
            onDelete={() =>
              del.mutate(rate.id, { onSuccess: () => toast.success("Profil gelöscht") })
            }
          />
        ))}
      </div>
    </AppShell>
  );
}

function LocationCard() {
  const { user } = useAuth();
  const { data: profile } = useUserProfile(user?.id);
  const saveProfile = useSaveUserProfile(user?.id);
  const [country, setCountry] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  const c = country ?? profile?.country_code ?? "DE";
  const r = region ?? profile?.region_code ?? "";
  const a = address ?? profile?.address ?? "";

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-semibold">Standort &amp; Feiertage</h2>
      <p className="text-sm text-muted-foreground">
        Land und Bundesland bestimmen die gesetzlichen Feiertage – automatisch für dieses und alle
        folgenden Jahre.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Land</Label>
          <Select
            value={c}
            onValueChange={(v) => {
              setCountry(v);
              setRegion("");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOLIDAY_COUNTRIES.map((x) => (
                <SelectItem key={x.code} value={x.code}>
                  {x.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Bundesland / Region</Label>
          <Select value={r || "none"} onValueChange={(v) => setRegion(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Bitte wählen" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="none">Nur bundesweite Feiertage</SelectItem>
              {regionsFor(c).map((x) => (
                <SelectItem key={x.code} value={x.code}>
                  {x.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="adresse">Adresse (optional)</Label>
          <Textarea
            id="adresse"
            rows={2}
            value={a}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Straße, PLZ, Ort"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          size="sm"
          onClick={() =>
            saveProfile.mutate(
              { country_code: c, region_code: r || null, address: a || null },
              { onSuccess: () => toast.success("Standort gespeichert") },
            )
          }
        >
          Speichern
        </Button>
      </div>
    </section>
  );
}

function RateCard({
  rate,
  onSave,
  onDelete,
}: {
  rate: RateProfile;
  onSave: (r: Partial<RateProfile> & { id: string }) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<RateProfile>(rate);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="font-display text-base font-semibold"
        />
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Profil löschen">
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={String(f.key)} className="space-y-1.5">
            <Label htmlFor={`${rate.id}-${String(f.key)}`} className="text-xs">
              {f.label} ({f.suffix})
            </Label>
            <Input
              id={`${rate.id}-${String(f.key)}`}
              inputMode="decimal"
              className="tabular"
              value={String(draft[f.key] as number)}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  [f.key]: Number(e.target.value.replace(",", ".")) || 0,
                })
              }
            />
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-1.5">
        <Label>Gilt für Reiseland</Label>
        <Select
          value={draft.country_code ?? "none"}
          onValueChange={(v) => setDraft({ ...draft, country_code: v === "none" ? null : v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="none">Kein Land (Standard/Inland)</SelectItem>
            {COUNTRY_RATES.map((x) => (
              <SelectItem key={x.code} value={x.code}>
                {x.name} · {x.full_day} € / {x.partial_day} €
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Tage mit diesem Reiseland nutzen automatisch dieses Profil.
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={draft.is_default}
            onCheckedChange={(c) => setDraft({ ...draft, is_default: !!c })}
          />
          Standardprofil
        </label>
        <Button size="sm" onClick={() => onSave(draft)}>
          Speichern
        </Button>
      </div>
    </div>
  );
}
