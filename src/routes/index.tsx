import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DayDialog } from "@/components/DayDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  emptyDraft,
  useDeleteEntry,
  useMonthEntries,
  useRateProfiles,
  useSaveEntry,
} from "@/lib/spesen/data";
import type { DayEntryDraft, DayStatus } from "@/lib/spesen/types";
import { STATUS_LABEL, STATUS_SHORT } from "@/lib/spesen/types";
import {
  calcDay,
  daysInMonth,
  eur,
  iso,
  MONTHS,
  rateFor,
  summarize,
  WEEKDAYS,
  weekdayIndex,
} from "@/lib/spesen/calc";
import { holidaysForMonth } from "@/lib/spesen/holidays";
import { useUserProfile } from "@/lib/spesen/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Spesen & Verpflegungsmehraufwand im Kalender berechnen" },
      {
        name: "description",
        content:
          "Reisetage, Urlaub, Feiertage, Krankentage und Bürotage im Monatskalender erfassen – die Verpflegungspauschale wird automatisch berechnet.",
      },
      { property: "og:title", content: "Spesen & Verpflegungsmehraufwand im Kalender berechnen" },
      {
        property: "og:description",
        content:
          "Reisetage, Urlaub, Feiertage, Krankentage und Bürotage im Monatskalender erfassen – die Verpflegungspauschale wird automatisch berechnet.",
      },
    ],
  }),
  component: CalendarPage,
});

const STATUS_STYLE: Record<DayStatus, string> = {
  travel: "bg-accent/25 border-accent",
  vacation: "bg-chart-3/20 border-chart-3/50",
  holiday: "bg-chart-2/20 border-chart-2/50",
  sick: "bg-chart-4/20 border-chart-4/50",
  office: "bg-secondary border-border",
  off: "bg-background border-dashed border-border",
};

function CalendarPage() {
  const { user } = useAuth();
  const today = new Date();
  const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [openDate, setOpenDate] = useState<string | null>(null);

  const { data: rates = [] } = useRateProfiles(user?.id);
  const { data: entries = [], isLoading } = useMonthEntries(user?.id, year, month);
  const { data: profile } = useUserProfile(user?.id);
  const holidays = useMemo(
    () => holidaysForMonth(year, month, profile?.country_code, profile?.region_code),
    [year, month, profile?.country_code, profile?.region_code],
  );
  const save = useSaveEntry(user?.id);
  const remove = useDeleteEntry(user?.id);

  const byDate = useMemo(() => new Map(entries.map((e) => [e.entry_date, e])), [entries]);
  const summary = useMemo(() => summarize(entries, rates), [entries, rates]);

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const leading = weekdayIndex(year, month, 1);
  const total = daysInMonth(year, month);
  const draft: DayEntryDraft | null = openDate
    ? (byDate.get(openDate) ?? emptyDraft(openDate))
    : null;

  return (
    <AppShell>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Vorheriger Monat">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Nächster Monat">
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ml-1"
            onClick={goToday}
            disabled={isCurrentMonth}
          >
            Heute
          </Button>
        </div>
        <h1 className="text-2xl font-bold">
          {MONTHS[month]} <span className="text-muted-foreground">{year}</span>
        </h1>
        <div className="ml-auto rounded-lg bg-primary px-4 py-2 text-primary-foreground">
          <span className="text-xs uppercase tracking-wide opacity-70">Summe</span>{" "}
          <span className="tabular text-lg font-semibold">{eur(summary.total)}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {(["travel", "office", "vacation", "holiday", "sick"] as DayStatus[]).map((s) => (
          <span
            key={s}
            className={cn("rounded-full border px-3 py-1 font-medium", STATUS_STYLE[s])}
          >
            {STATUS_LABEL[s]}: {summary.counts[s] ?? 0}
          </span>
        ))}
        {summary.reduction > 0 && (
          <span className="rounded-full border border-border px-3 py-1 font-medium">
            Kürzung: {eur(summary.reduction)}
          </span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leading }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: total }, (_, i) => {
          const day = i + 1;
          const date = iso(year, month, day);
          const entry = byDate.get(date);
          const holidayName = holidays.get(date);
          const status: DayStatus = entry?.status ?? (holidayName ? "holiday" : "off");
          const amount = entry ? calcDay(entry, rateFor(entry, rates)).amount : 0;
          const isSunday = weekdayIndex(year, month, day) === 6;
          const isToday = date === todayIso;
          return (
            <button
              key={date}
              onClick={() => setOpenDate(date)}
              className={cn(
                "flex min-h-20 flex-col items-start rounded-md border p-1.5 text-left transition-colors hover:ring-2 hover:ring-ring md:min-h-24",
                STATUS_STYLE[status],
                !entry && !holidayName && isSunday && "bg-muted/50",
              )}
            >
              <span
                className={cn(
                  "tabular inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isToday && "bg-today text-today-foreground",
                )}
                aria-current={isToday ? "date" : undefined}
              >
                {day}
              </span>
              {(entry || holidayName) && (
                <span className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                  {holidayName && !entry ? holidayName : STATUS_SHORT[status]}
                </span>
              )}
              {amount > 0 && (
                <span className="tabular mt-auto text-xs font-semibold">{eur(amount)}</span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Lädt Einträge …</p>}

      <DayDialog
        open={!!openDate}
        onOpenChange={(v) => !v && setOpenDate(null)}
        draft={draft}
        rates={rates}
        canDelete={!!(openDate && byDate.has(openDate))}
        onSave={(d) =>
          save.mutate(d, {
            onSuccess: () => {
              setOpenDate(null);
              toast.success("Tag gespeichert");
            },
            onError: (e) => toast.error((e as Error).message),
          })
        }
        onDelete={() =>
          openDate &&
          remove.mutate(openDate, {
            onSuccess: () => {
              setOpenDate(null);
              toast.success("Eintrag gelöscht");
            },
          })
        }
      />
    </AppShell>
  );
}
