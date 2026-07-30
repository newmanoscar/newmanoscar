import type { DayEntry, DayEntryDraft, RateProfile } from "./types";

export const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Stunden aus "HH:MM" - "HH:MM"; Übernacht wird als Folgetag gerechnet. */
export function hoursFromTimes(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const p = (s: string) => {
    const [h, m] = s.split(":");
    const hh = parseInt(h ?? "", 10);
    const mm = parseInt(m ?? "0", 10);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return hh * 60 + mm;
  };
  const a = p(start);
  const b = p(end);
  if (a === null || b === null) return null;
  let diff = b - a;
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
}

export type DayResult = {
  base: number;
  reduction: number;
  amount: number;
  reason: string;
};

export function calcDay(
  entry: Pick<
    DayEntryDraft,
    | "status"
    | "hours"
    | "is_arrival"
    | "is_departure"
    | "breakfast"
    | "lunch"
    | "dinner"
    | "start_time"
    | "end_time"
  >,
  rate: RateProfile | undefined,
): DayResult {
  const empty: DayResult = { base: 0, reduction: 0, amount: 0, reason: "" };
  if (!rate) return { ...empty, reason: "Kein Satzprofil" };
  if (entry.status !== "travel") return { ...empty, reason: "Keine Auswärtstätigkeit" };

  const hours = entry.hours || hoursFromTimes(entry.start_time, entry.end_time) || 0;

  let base = 0;
  let reason = "";
  if (entry.is_arrival || entry.is_departure) {
    base = num(rate.travel_day);
    reason = "An-/Abreisetag";
  } else if (hours >= 24) {
    base = num(rate.full_day);
    reason = "Voller Kalendertag (24 h)";
  } else if (hours > num(rate.min_hours)) {
    base = num(rate.partial_day);
    reason = `Abwesenheit über ${num(rate.min_hours)} h`;
  } else {
    return { ...empty, reason: `Abwesenheit bis ${num(rate.min_hours)} h` };
  }

  const full = num(rate.full_day);
  let reduction = 0;
  if (entry.breakfast) reduction += (full * num(rate.breakfast_pct)) / 100;
  if (entry.lunch) reduction += (full * num(rate.lunch_pct)) / 100;
  if (entry.dinner) reduction += (full * num(rate.dinner_pct)) / 100;
  reduction = Math.round(reduction * 100) / 100;

  const amount = Math.max(0, Math.round((base - reduction) * 100) / 100);
  return { base, reduction, amount, reason };
}

export function rateFor(
  entry: { rate_profile_id?: string | null; travel_country?: string | null },
  rates: RateProfile[],
): RateProfile | undefined {
  const explicit = rates.find((r) => r.id === entry.rate_profile_id);
  if (explicit) return explicit;
  if (entry.travel_country) {
    const byCountry = rates.find((r) => r.country_code === entry.travel_country);
    if (byCountry) return byCountry;
  }
  return rates.find((r) => r.is_default) ?? rates[0];
}

export type MonthSummary = {
  total: number;
  reduction: number;
  counts: Record<string, number>;
  travelDays: number;
};

export function summarize(entries: DayEntry[], rates: RateProfile[]): MonthSummary {
  const counts: Record<string, number> = {};
  let total = 0;
  let reduction = 0;
  let travelDays = 0;
  for (const e of entries) {
    counts[e.status] = (counts[e.status] ?? 0) + 1;
    const r = calcDay(e, rateFor(e, rates));
    total += r.amount;
    reduction += r.reduction;
    if (e.status === "travel") travelDays += 1;
  }
  return {
    total: Math.round(total * 100) / 100,
    reduction: Math.round(reduction * 100) / 100,
    counts,
    travelDays,
  };
}

export const eur = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);

export const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

export const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Montag = 0 */
export function weekdayIndex(year: number, month: number, day: number) {
  return (new Date(year, month, day).getDay() + 6) % 7;
}

export const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
