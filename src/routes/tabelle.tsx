import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Upload, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  emptyDraft,
  useMonthEntries,
  useRateProfiles,
  useSaveEntries,
} from "@/lib/spesen/data";
import type { DayEntryDraft } from "@/lib/spesen/types";
import { calcDay, daysInMonth, eur, iso, MONTHS, rateFor, WEEKDAYS, weekdayIndex } from "@/lib/spesen/calc";
import { COLS } from "@/lib/spesen/columns";
import { exportCsv, exportMonthXlsx, parseImportFile } from "@/lib/spesen/xlsx";
import { exportMonthPdf } from "@/lib/spesen/pdf";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tabelle")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Excel-Tabelle für Spesen und Verpflegungspauschalen" },
      {
        name: "description",
        content:
          "Alle Tage eines Monats wie in Excel bearbeiten: Tastaturnavigation, Kopieren/Einfügen, Ausfüllen nach unten sowie XLSX- und CSV-Export.",
      },
      { property: "og:title", content: "Excel-Tabelle für Spesen" },
      {
        property: "og:description",
        content: "Monatsdaten im Raster bearbeiten, importieren und exportieren.",
      },
    ],
  }),
  component: TablePage,
});

type Cell = { r: number; c: number };

function TablePage() {
  const { user } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const { data: rates = [] } = useRateProfiles(user?.id);
  const { data: entries = [] } = useMonthEntries(user?.id, year, month);
  const saveAll = useSaveEntries(user?.id);

  const [drafts, setDrafts] = useState<Record<string, DayEntryDraft>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<Cell>({ r: 0, c: 0 });
  const [focus, setFocus] = useState<Cell>({ r: 0, c: 0 });
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dates = useMemo(
    () => Array.from({ length: daysInMonth(year, month) }, (_, i) => iso(year, month, i + 1)),
    [year, month],
  );

  useEffect(() => {
    const map: Record<string, DayEntryDraft> = {};
    for (const d of dates) map[d] = emptyDraft(d);
    for (const e of entries) map[e.entry_date] = { ...map[e.entry_date], ...e };
    setDrafts(map);
    setDirty(new Set());
  }, [entries, dates]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const rows = dates.map((d) => drafts[d]).filter(Boolean);
  const totals = rows.reduce(
    (acc, e) => {
      const r = calcDay(e, rateFor(e, rates));
      acc.amount += r.amount;
      acc.reduction += r.reduction;
      return acc;
    },
    { amount: 0, reduction: 0 },
  );

  const setCell = (r: number, c: number, value: string) => {
    const col = COLS[c];
    if (!col.set) return;
    const date = dates[r];
    setDrafts((prev) => ({ ...prev, [date]: col.set!(prev[date], value) }));
    setDirty((prev) => new Set(prev).add(date));
  };

  const range = () => ({
    r1: Math.min(anchor.r, focus.r),
    r2: Math.max(anchor.r, focus.r),
    c1: Math.min(anchor.c, focus.c),
    c2: Math.max(anchor.c, focus.c),
  });

  const inSelection = (r: number, c: number) => {
    const s = range();
    return r >= s.r1 && r <= s.r2 && c >= s.c1 && c <= s.c2;
  };

  const move = (dr: number, dc: number, extend: boolean) => {
    const r = Math.max(0, Math.min(dates.length - 1, focus.r + dr));
    const c = Math.max(0, Math.min(COLS.length - 1, focus.c + dc));
    setFocus({ r, c });
    if (!extend) setAnchor({ r, c });
  };

  const commitEdit = (next?: { dr: number; dc: number }) => {
    setCell(focus.r, focus.c, editValue);
    setEditing(false);
    if (next) move(next.dr, next.dc, false);
    gridRef.current?.focus();
  };

  const startEdit = (initial?: string) => {
    if (!COLS[focus.c].editable) return;
    setEditValue(initial ?? COLS[focus.c].get(rows[focus.r]));
    setEditing(true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (editing) return;
    const s = range();
    if (e.key === "ArrowDown") return e.preventDefault(), move(1, 0, e.shiftKey);
    if (e.key === "ArrowUp") return e.preventDefault(), move(-1, 0, e.shiftKey);
    if (e.key === "ArrowLeft") return e.preventDefault(), move(0, -1, e.shiftKey);
    if (e.key === "ArrowRight") return e.preventDefault(), move(0, 1, e.shiftKey);
    if (e.key === "Tab") return e.preventDefault(), move(0, e.shiftKey ? -1 : 1, false);
    if (e.key === "Enter") return e.preventDefault(), startEdit();
    if (e.key === "F2") return e.preventDefault(), startEdit();
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      for (let r = s.r1; r <= s.r2; r++) for (let c = s.c1; c <= s.c2; c++) setCell(r, c, "");
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      for (let c = s.c1; c <= s.c2; c++) {
        const v = COLS[c].get(rows[s.r1]);
        for (let r = s.r1 + 1; r <= s.r2; r++) setCell(r, c, v);
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
      e.preventDefault();
      const text = Array.from({ length: s.r2 - s.r1 + 1 }, (_, i) =>
        Array.from({ length: s.c2 - s.c1 + 1 }, (_, j) => COLS[s.c1 + j].get(rows[s.r1 + i])).join("\t"),
      ).join("\n");
      navigator.clipboard.writeText(text);
      toast.success("Kopiert");
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      persist();
      return;
    }
    if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
      e.preventDefault();
      startEdit(e.key);
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    if (editing) return;
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    e.preventDefault();
    const grid = text.replace(/\r/g, "").split("\n").map((l) => l.split("\t"));
    grid.forEach((line, i) =>
      line.forEach((v, j) => {
        const r = focus.r + i;
        const c = focus.c + j;
        if (r < dates.length && c < COLS.length) setCell(r, c, v);
      }),
    );
    toast.success("Eingefügt");
  };

  const persist = () => {
    const list = [...dirty].map((d) => drafts[d]).filter(Boolean);
    if (!list.length) return toast.info("Keine Änderungen");
    saveAll.mutate(list, {
      onSuccess: () => {
        setDirty(new Set());
        toast.success(`${list.length} Tage gespeichert`);
      },
      onError: (err) => toast.error((err as Error).message),
    });
  };

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const exportRows = () =>
    dates.map((date, i) => ({
      date,
      day: i + 1,
      weekday: WEEKDAYS[weekdayIndex(year, month, i + 1)],
      entry: drafts[date],
    }));

  const onImport = async (file: File) => {
    try {
      const imported = await parseImportFile(file);
      const relevant = imported.filter((r) => dates.includes(r.entry_date));
      if (!relevant.length) return toast.error("Keine Zeilen für diesen Monat gefunden");
      setDrafts((prev) => {
        const next = { ...prev };
        for (const r of relevant) next[r.entry_date] = { ...next[r.entry_date], ...r };
        return next;
      });
      setDirty(new Set(relevant.map((r) => r.entry_date)));
      toast.success(`${relevant.length} Zeilen importiert – bitte speichern`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Vorheriger Monat">
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Nächster Monat">
          <ChevronRight className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          {MONTHS[month]} <span className="text-muted-foreground">{year}</span>
        </h1>
        <div className="ml-auto flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
          />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(exportRows(), rates, year, month)}
          >
            <Download className="size-4" /> CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportMonthXlsx(exportRows(), rates, year, month, user?.email ?? "")
            }
          >
            <Download className="size-4" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportMonthPdf(exportRows(), rates, year, month, user?.email ?? "")
            }
          >
            <Download className="size-4" /> PDF
          </Button>
          <Button size="sm" onClick={persist} disabled={saveAll.isPending}>
            <Save className="size-4" /> Speichern{dirty.size ? ` (${dirty.size})` : ""}
          </Button>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Pfeiltasten navigieren · Enter/F2 bearbeiten · Shift+Pfeil markiert · Strg+C/V kopieren &amp;
        einfügen · Strg+D nach unten ausfüllen · Strg+S speichern
      </p>

      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        className="tabular mt-4 overflow-x-auto rounded-lg border border-border outline-none focus:ring-2 focus:ring-ring"
      >
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-secondary">
            <tr>
              <th className="w-24 border-b border-r border-border px-2 py-1.5 text-left font-medium">
                Datum
              </th>
              {COLS.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "border-b border-r border-border px-2 py-1.5 text-left font-medium",
                    col.width,
                  )}
                >
                  {col.label}
                </th>
              ))}
              <th className="border-b border-border px-2 py-1.5 text-right font-medium">Betrag</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry, r) => {
              const res = calcDay(entry, rateFor(entry, rates));
              const weekend = weekdayIndex(year, month, r + 1) === 6;
              return (
                <tr key={entry.entry_date} className={cn(weekend && "bg-muted/40")}>
                  <td className="whitespace-nowrap border-b border-r border-border px-2 py-1">
                    {WEEKDAYS[weekdayIndex(year, month, r + 1)]} {String(r + 1).padStart(2, "0")}.
                    {String(month + 1).padStart(2, "0")}
                  </td>
                  {COLS.map((col, c) => {
                    const active = focus.r === r && focus.c === c;
                    return (
                      <td
                        key={col.key}
                        onMouseDown={(e) => {
                          setFocus({ r, c });
                          if (!e.shiftKey) setAnchor({ r, c });
                          setEditing(false);
                          gridRef.current?.focus();
                        }}
                        onDoubleClick={() => {
                          setFocus({ r, c });
                          setAnchor({ r, c });
                          setEditValue(col.get(entry));
                          setEditing(true);
                        }}
                        className={cn(
                          "cursor-cell border-b border-r border-border px-2 py-1",
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center",
                          inSelection(r, c) && "bg-accent/20",
                          active && "outline outline-2 -outline-offset-2 outline-primary",
                        )}
                      >
                        {active && editing ? (
                          <input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => commitEdit()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                commitEdit({ dr: 1, dc: 0 });
                              } else if (e.key === "Tab") {
                                e.preventDefault();
                                commitEdit({ dr: 0, dc: e.shiftKey ? -1 : 1 });
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                setEditing(false);
                                gridRef.current?.focus();
                              }
                            }}
                            className="w-full bg-transparent outline-none"
                          />
                        ) : (
                          <span className="block truncate">{col.get(entry)}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="border-b border-border px-2 py-1 text-right font-medium">
                    {res.amount ? eur(res.amount) : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-primary font-semibold text-primary-foreground">
              <td className="px-2 py-2" colSpan={COLS.length}>
                Summe {MONTHS[month]} {year} · Kürzung {eur(totals.reduction)}
              </td>
              <td className="px-2 py-2 text-right" colSpan={2}>
                {eur(totals.amount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </AppShell>
  );
}
