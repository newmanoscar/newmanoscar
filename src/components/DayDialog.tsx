import { useEffect, useState } from "react";
import { Camera, ImageIcon, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DayEntryDraft, DayStatus, RateProfile } from "@/lib/spesen/types";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/spesen/types";
import { calcDay, eur, hoursFromTimes, rateFor } from "@/lib/spesen/calc";
import { COUNTRY_RATES } from "@/lib/spesen/countries";
import { deleteReceipt, receiptUrl, uploadReceipt } from "@/lib/spesen/data";
import { pickPhoto } from "@/lib/spesen/photo";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function DayDialog({
  open,
  onOpenChange,
  draft,
  rates,
  onSave,
  onDelete,
  canDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  draft: DayEntryDraft | null;
  rates: RateProfile[];
  onSave: (d: DayEntryDraft) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const [value, setValue] = useState<DayEntryDraft | null>(draft);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();

  useEffect(() => setValue(draft), [draft]);

  useEffect(() => {
    let active = true;
    const path = draft?.receipt_path;
    if (!path) {
      setPreview(null);
      return;
    }
    receiptUrl(path)
      .then((u) => active && setPreview(u))
      .catch(() => active && setPreview(null));
    return () => {
      active = false;
    };
  }, [draft?.receipt_path]);
  if (!value) return null;

  const set = (patch: Partial<DayEntryDraft>) => {
    setValue((v) => {
      if (!v) return v;
      const next = { ...v, ...patch };
      const h = hoursFromTimes(next.start_time, next.end_time);
      if (("start_time" in patch || "end_time" in patch) && h !== null) next.hours = h;
      return next;
    });
  };

  const result = calcDay(value, rateFor(value, rates));
  const isTravel = value.status === "travel";
  const dateLabel = new Date(value.entry_date + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dateLabel}</DialogTitle>
          <DialogDescription>Tagesart, Zeiten und gestellte Mahlzeiten erfassen.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {STATUS_ORDER.map((s) => (
              <Button
                key={s}
                type="button"
                variant={value.status === s ? "default" : "outline"}
                size="sm"
                onClick={() => set({ status: s as DayStatus })}
              >
                {STATUS_LABEL[s]}
              </Button>
            ))}
          </div>

          {isTravel && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="von">Von</Label>
                  <Input
                    id="von"
                    type="time"
                    value={value.start_time ?? ""}
                    onChange={(e) => set({ start_time: e.target.value || null })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bis">Bis</Label>
                  <Input
                    id="bis"
                    type="time"
                    value={value.end_time ?? ""}
                    onChange={(e) => set({ end_time: e.target.value || null })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="std">Stunden</Label>
                  <Input
                    id="std"
                    inputMode="decimal"
                    value={String(value.hours ?? 0)}
                    onChange={(e) =>
                      set({ hours: Number(e.target.value.replace(",", ".")) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ziel">Ziel / Einsatzstelle</Label>
                <Input
                  id="ziel"
                  value={value.destination ?? ""}
                  onChange={(e) => set({ destination: e.target.value || null })}
                  placeholder="z. B. Hamburg, Baustelle Nord"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Reiseland</Label>
                <Select
                  value={value.travel_country ?? "DE"}
                  onValueChange={(v) => set({ travel_country: v === "DE" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {COUNTRY_RATES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Für das Land wird automatisch das passende Satzprofil verwendet, sofern angelegt.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={value.is_arrival}
                    onCheckedChange={(c) => set({ is_arrival: !!c })}
                  />
                  Anreisetag
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={value.is_departure}
                    onCheckedChange={(c) => set({ is_departure: !!c })}
                  />
                  Abreisetag
                </label>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-sm font-medium">Gestellte Mahlzeiten (Kürzung)</p>
                <div className="flex flex-wrap gap-4">
                  {(
                    [
                      ["breakfast", "Frühstück"],
                      ["lunch", "Mittag"],
                      ["dinner", "Abend"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={value[key]}
                        onCheckedChange={(c) => set({ [key]: !!c } as Partial<DayEntryDraft>)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {rates.length > 1 && (
                <div className="space-y-1.5">
                  <Label>Satzprofil</Label>
                  <Select
                    value={value.rate_profile_id ?? "default"}
                    onValueChange={(v) => set({ rate_profile_id: v === "default" ? null : v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Standard</SelectItem>
                      {rates.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notiz">Notiz</Label>
            <Textarea
              id="notiz"
              rows={2}
              value={value.note ?? ""}
              onChange={(e) => set({ note: e.target.value || null })}
            />
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-sm font-medium">Beleg</p>
            {preview ? (
              <div className="flex items-start gap-3">
                <img
                  src={preview}
                  alt="Vorschau des hinterlegten Belegs"
                  className="h-24 w-24 rounded-md border border-border object-cover"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    if (!value.receipt_path) return;
                    setBusy(true);
                    try {
                      await deleteReceipt(value.receipt_path);
                      set({ receipt_path: null });
                      setPreview(null);
                      toast.success("Beleg gelöscht");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Trash2 className="size-4" /> Löschen
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["camera", "Foto aufnehmen", Camera],
                    ["gallery", "Aus Galerie", ImageIcon],
                  ] as const
                ).map(([src, label, Icon]) => (
                  <Button
                    key={src}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy || !user}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const blob = await pickPhoto(src);
                        if (!blob || !user) return;
                        const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
                        const path = await uploadReceipt(user.id, value.entry_date, blob, ext);
                        set({ receipt_path: path });
                        setPreview(URL.createObjectURL(blob));
                        toast.success("Beleg hinzugefügt");
                      } catch (e) {
                        toast.error((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Icon className="size-4" /> {label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
            <div className="text-sm text-muted-foreground">
              {result.reason || "—"}
              {result.reduction > 0 && ` · Kürzung ${eur(result.reduction)}`}
            </div>
            <div className="tabular text-lg font-semibold">{eur(result.amount)}</div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {canDelete ? (
            <Button variant="ghost" onClick={onDelete}>
              Eintrag löschen
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={() => onSave(value)}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
