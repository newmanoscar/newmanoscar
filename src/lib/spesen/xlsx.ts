import * as XLSX from "xlsx";
import type { DayEntry, DayEntryDraft, DayStatus, RateProfile } from "./types";
import { STATUS_LABEL } from "./types";
import { calcDay, daysInMonth, eur, iso, MONTHS, rateFor, WEEKDAYS, weekdayIndex } from "./calc";
import { COUNTRY_RATES } from "./countries";

export type Row = {
  date: string;
  day: number;
  weekday: string;
  entry: DayEntry | DayEntryDraft;
};

const labelToStatus = (v: string): DayStatus => {
  const found = (Object.keys(STATUS_LABEL) as DayStatus[]).find(
    (k) => STATUS_LABEL[k].toLowerCase() === String(v).trim().toLowerCase(),
  );
  return found ?? "office";
};

export function buildSheetData(
  rows: Row[],
  rates: RateProfile[],
): (string | number)[][] {
  const head = [
    "Datum",
    "Tag",
    "Status",
    "Von",
    "Bis",
    "Stunden",
    "Ziel",
    "Land",
    "Anreise",
    "Abreise",
    "Frühstück",
    "Mittag",
    "Abend",
    "Satz",
    "Pauschale",
    "Kürzung",
    "Betrag",
    "Notiz",
  ];
  const body = rows.map((r) => {
    const rate = rateFor(r.entry, rates);
    const res = calcDay(r.entry, rate);
    return [
      r.date,
      r.weekday,
      STATUS_LABEL[r.entry.status],
      r.entry.start_time ?? "",
      r.entry.end_time ?? "",
      r.entry.hours || 0,
      r.entry.destination ?? "",
      // Ohne diese Spalte verliert ein Export-Import-Rundlauf das Reiseland, und
      // Auslandstage würden anschließend mit dem Inlandssatz gerechnet.
      r.entry.travel_country ?? "",
      r.entry.is_arrival ? "x" : "",
      r.entry.is_departure ? "x" : "",
      r.entry.breakfast ? "x" : "",
      r.entry.lunch ? "x" : "",
      r.entry.dinner ? "x" : "",
      rate?.name ?? "",
      res.base,
      res.reduction,
      res.amount,
      r.entry.note ?? "",
    ];
  });
  // Spaltenposition aus der Kopfzeile ableiten, damit eine zusätzliche Spalte die
  // Summenzeile nicht stillschweigend in die falsche Spalte schiebt.
  const betragIdx = head.indexOf("Betrag");
  const total = body.reduce((s, r) => s + Number(r[betragIdx] ?? 0), 0);
  const sum: (string | number)[] = head.map(() => "");
  sum[0] = "Summe";
  sum[betragIdx] = Math.round(total * 100) / 100;
  return [head, ...body, sum];
}

export function exportMonthXlsx(
  rows: Row[],
  rates: RateProfile[],
  year: number,
  month: number,
  owner: string,
) {
  const data = buildSheetData(rows, rates);
  const header = [[`Verpflegungsmehraufwand ${MONTHS[month]} ${year}`], [owner], []];
  const ws = XLSX.utils.aoa_to_sheet([...header, ...data]);
  ws["!cols"] = [
    { wch: 12 }, { wch: 5 }, { wch: 18 }, { wch: 7 }, { wch: 7 }, { wch: 8 },
    { wch: 18 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 },
    { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 28 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${MONTHS[month]} ${year}`.slice(0, 31));
  XLSX.writeFile(wb, `Spesen_${year}-${String(month + 1).padStart(2, "0")}.xlsx`);
}

export function exportYearXlsx(
  entries: DayEntry[],
  rates: RateProfile[],
  year: number,
  owner: string,
) {
  const head = ["Monat", "Reisetage", "Urlaub", "Feiertag", "Krank", "Arbeitsstätte", "Kürzung", "Betrag"];
  const rows = MONTHS.map((name, m) => {
    const monthEntries = entries.filter((e) => Number(e.entry_date.slice(5, 7)) === m + 1);
    let total = 0;
    let reduction = 0;
    const c: Record<string, number> = {};
    for (const e of monthEntries) {
      const r = calcDay(e, rateFor(e, rates));
      total += r.amount;
      reduction += r.reduction;
      c[e.status] = (c[e.status] ?? 0) + 1;
    }
    return [
      name,
      c.travel ?? 0,
      c.vacation ?? 0,
      c.holiday ?? 0,
      c.sick ?? 0,
      c.office ?? 0,
      Math.round(reduction * 100) / 100,
      Math.round(total * 100) / 100,
    ];
  });
  const sum = [
    "Jahr",
    ...[1, 2, 3, 4, 5, 6, 7].map((i) =>
      Math.round(rows.reduce((s, r) => s + (r[i] as number), 0) * 100) / 100,
    ),
  ];
  const ws = XLSX.utils.aoa_to_sheet([[`Jahresübersicht ${year}`], [owner], [], head, ...rows, sum]);
  ws["!cols"] = Array.from({ length: 8 }, () => ({ wch: 14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Jahr ${year}`);
  XLSX.writeFile(wb, `Spesen_Jahr_${year}.xlsx`);
}

export function exportCsv(rows: Row[], rates: RateProfile[], year: number, month: number) {
  const data = buildSheetData(rows, rates);
  const csv = data
    .map((r) =>
      r
        .map((c) => {
          const s = typeof c === "number" ? String(c).replace(".", ",") : String(c ?? "");
          return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(";"),
    )
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Spesen_${year}-${String(month + 1).padStart(2, "0")}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export type ImportedRow = DayEntryDraft;

/** Liest eine XLSX/CSV-Datei und ordnet Spalten anhand der Kopfzeile zu. */
export async function parseImportFile(file: File): Promise<ImportedRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json<(string | number | Date)[]>(ws, { header: 1, raw: false });
  const headerIdx = aoa.findIndex((r) =>
    r.some((c) => String(c ?? "").trim().toLowerCase() === "datum"),
  );
  if (headerIdx < 0) throw new Error("Keine Kopfzeile mit Spalte „Datum“ gefunden.");
  const header = aoa[headerIdx].map((c) => String(c ?? "").trim().toLowerCase());
  const col = (...names: string[]) => header.findIndex((h) => names.includes(h));
  const idx = {
    date: col("datum"),
    status: col("status"),
    start: col("von"),
    end: col("bis"),
    hours: col("stunden"),
    dest: col("ziel"),
    country: col("land", "reiseland"),
    arr: col("anreise"),
    dep: col("abreise"),
    b: col("frühstück", "fruehstueck"),
    l: col("mittag"),
    d: col("abend"),
    note: col("notiz"),
  };

  const toDate = (v: unknown): string | null => {
    if (v instanceof Date) return iso(v.getFullYear(), v.getMonth(), v.getDate());
    const s = String(v ?? "").trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return null;
  };
  const flag = (v: unknown) => ["x", "ja", "true", "1"].includes(String(v ?? "").trim().toLowerCase());

  const out: ImportedRow[] = [];
  for (const row of aoa.slice(headerIdx + 1)) {
    const date = toDate(row[idx.date]);
    if (!date) continue;
    // Reiseland akzeptiert sowohl den Ländercode ("FR") als auch den Namen
    // ("Frankreich"); Deutschland bleibt als Inland ohne Eintrag.
    const rawCountry = idx.country >= 0 ? String(row[idx.country] ?? "").trim() : "";
    const matched = rawCountry
      ? COUNTRY_RATES.find(
          (c) =>
            c.code.toLowerCase() === rawCountry.toLowerCase() ||
            c.name.toLowerCase() === rawCountry.toLowerCase(),
        )
      : undefined;

    out.push({
      travel_country: matched && matched.code !== "DE" ? matched.code : null,
      receipt_path: null,
      entry_date: date,
      status: idx.status >= 0 ? labelToStatus(String(row[idx.status] ?? "")) : "office",
      start_time: idx.start >= 0 ? String(row[idx.start] ?? "") || null : null,
      end_time: idx.end >= 0 ? String(row[idx.end] ?? "") || null : null,
      hours:
        idx.hours >= 0
          ? Number(String(row[idx.hours] ?? "0").replace(",", ".")) || 0
          : 0,
      is_arrival: idx.arr >= 0 ? flag(row[idx.arr]) : false,
      is_departure: idx.dep >= 0 ? flag(row[idx.dep]) : false,
      destination: idx.dest >= 0 ? String(row[idx.dest] ?? "") || null : null,
      breakfast: idx.b >= 0 ? flag(row[idx.b]) : false,
      lunch: idx.l >= 0 ? flag(row[idx.l]) : false,
      dinner: idx.d >= 0 ? flag(row[idx.d]) : false,
      note: idx.note >= 0 ? String(row[idx.note] ?? "") || null : null,
      rate_profile_id: null,
    });
  }
  return out;
}

export function monthRows(
  year: number,
  month: number,
  entries: DayEntry[],
  make: (date: string) => DayEntryDraft,
): Row[] {
  const map = new Map(entries.map((e) => [e.entry_date, e]));
  return Array.from({ length: daysInMonth(year, month) }, (_, i) => {
    const day = i + 1;
    const date = iso(year, month, day);
    return {
      date,
      day,
      weekday: WEEKDAYS[weekdayIndex(year, month, day)],
      entry: map.get(date) ?? make(date),
    };
  });
}

export { eur };
