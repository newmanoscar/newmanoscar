import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useRateProfiles, useYearEntries } from "@/lib/spesen/data";
import { calcDay, eur, MONTHS, rateFor } from "@/lib/spesen/calc";
import { exportYearXlsx } from "@/lib/spesen/xlsx";
import { exportYearPdf } from "@/lib/spesen/pdf";
import { STATUS_LABEL } from "@/lib/spesen/types";

export const Route = createFileRoute("/jahr")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Jahresübersicht der Verpflegungsmehraufwendungen" },
      {
        name: "description",
        content:
          "Alle Monate auf einen Blick: Reisetage, Urlaub, Feiertage, Krankentage, Bürotage und die Jahressumme der Spesen als Excel-Export.",
      },
      { property: "og:title", content: "Jahresübersicht Spesen" },
      {
        property: "og:description",
        content: "Monatssummen und Jahressumme der Verpflegungspauschalen exportieren.",
      },
    ],
  }),
  component: YearPage,
});

function YearPage() {
  const { user } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const { data: rates = [] } = useRateProfiles(user?.id);
  const { data: entries = [] } = useYearEntries(user?.id, year);

  const rows = useMemo(
    () =>
      MONTHS.map((name, m) => {
        const list = entries.filter((e) => Number(e.entry_date.slice(5, 7)) === m + 1);
        let amount = 0;
        let reduction = 0;
        const counts: Record<string, number> = {};
        for (const e of list) {
          const r = calcDay(e, rateFor(e, rates));
          amount += r.amount;
          reduction += r.reduction;
          counts[e.status] = (counts[e.status] ?? 0) + 1;
        }
        return { name, amount, reduction, counts };
      }),
    [entries, rates],
  );

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const totalRed = rows.reduce((s, r) => s + r.reduction, 0);
  const statuses = ["travel", "vacation", "holiday", "sick", "office"] as const;

  return (
    <AppShell>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setYear(year - 1)} aria-label="Vorjahr">
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => setYear(year + 1)} aria-label="Folgejahr">
          <ChevronRight className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold">Jahr {year}</h1>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => exportYearXlsx(entries, rates, year, user?.email ?? "")}
        >
          <Download className="size-4" /> Excel
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportYearPdf(entries, rates, year, user?.email ?? "")}
        >
          <Download className="size-4" /> PDF
        </Button>
      </div>

      <div className="tabular mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="border-b border-border px-3 py-2 text-left font-medium">Monat</th>
              {statuses.map((s) => (
                <th key={s} className="border-b border-border px-3 py-2 text-right font-medium">
                  {STATUS_LABEL[s]}
                </th>
              ))}
              <th className="border-b border-border px-3 py-2 text-right font-medium">Kürzung</th>
              <th className="border-b border-border px-3 py-2 text-right font-medium">Betrag</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="hover:bg-muted/50">
                <td className="border-b border-border px-3 py-2 font-medium">{r.name}</td>
                {statuses.map((s) => (
                  <td key={s} className="border-b border-border px-3 py-2 text-right">
                    {r.counts[s] ?? 0}
                  </td>
                ))}
                <td className="border-b border-border px-3 py-2 text-right text-muted-foreground">
                  {r.reduction ? eur(r.reduction) : "–"}
                </td>
                <td className="border-b border-border px-3 py-2 text-right font-semibold">
                  {r.amount ? eur(r.amount) : "–"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-primary font-semibold text-primary-foreground">
              <td className="px-3 py-2">Summe</td>
              {statuses.map((s) => (
                <td key={s} className="px-3 py-2 text-right">
                  {rows.reduce((sum, r) => sum + (r.counts[s] ?? 0), 0)}
                </td>
              ))}
              <td className="px-3 py-2 text-right">{eur(totalRed)}</td>
              <td className="px-3 py-2 text-right">{eur(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </AppShell>
  );
}
