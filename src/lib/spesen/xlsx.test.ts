import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildSheetData, parseImportFile } from "./xlsx";
import { calcDay, rateFor } from "./calc";
import type { DayEntry, RateProfile } from "./types";

const INLAND: RateProfile = {
  id: "r1",
  user_id: "u",
  name: "Inland",
  full_day: 28,
  partial_day: 14,
  travel_day: 14,
  min_hours: 8,
  breakfast_pct: 20,
  lunch_pct: 40,
  dinner_pct: 40,
  is_default: true,
  country_code: null,
};

const eintrag = (o: Partial<DayEntry>): DayEntry =>
  ({
    id: "x",
    user_id: "u",
    entry_date: "2026-08-01",
    status: "travel",
    start_time: null,
    end_time: null,
    hours: 0,
    is_arrival: false,
    is_departure: false,
    destination: null,
    breakfast: false,
    lunch: false,
    dinner: false,
    note: null,
    rate_profile_id: null,
    travel_country: null,
    receipt_path: null,
    ...o,
  }) as DayEntry;

const MONAT = [
  eintrag({ entry_date: "2026-08-03", hours: 10, destination: "Hamburg" }),
  eintrag({ entry_date: "2026-08-04", hours: 24, travel_country: "FR", destination: "Paris", breakfast: true }),
  eintrag({ entry_date: "2026-08-05", hours: 6, travel_country: "NO", is_arrival: true }),
  eintrag({ entry_date: "2026-08-06", status: "vacation" }),
  eintrag({ entry_date: "2026-08-07", status: "office", hours: 8 }),
];

const rows = MONAT.map((e, i) => ({ date: e.entry_date, day: i + 3, weekday: "Mo", entry: e }));

/** Schreibt die Tabelle in eine echte XLSX-Datei und liest sie wieder ein. */
async function rundlauf(data: (string | number)[][]) {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Spesen");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return parseImportFile({ arrayBuffer: async () => buf } as unknown as File);
}

describe("Tabellenaufbau", () => {
  const data = buildSheetData(rows, [INLAND]);
  const head = data[0] as string[];

  it("führt das Reiseland als eigene Spalte", () => {
    expect(head).toContain("Land");
  });

  it("setzt die Summe in die Spalte 'Betrag'", () => {
    const betragIdx = head.indexOf("Betrag");
    const erwartet = MONAT.reduce((s, e) => s + calcDay(e, rateFor(e, [INLAND])).amount, 0);
    const sumRow = data[data.length - 1];
    expect(sumRow[0]).toBe("Summe");
    expect(sumRow[betragIdx]).toBe(Math.round(erwartet * 100) / 100);
  });
});

describe("Export und Import", () => {
  it("verliert beim Rundlauf keine Angaben", async () => {
    const zurueck = await rundlauf(buildSheetData(rows, [INLAND]));
    expect(zurueck).toHaveLength(MONAT.length);

    for (const orig of MONAT) {
      const back = zurueck.find((i) => i.entry_date === orig.entry_date)!;
      expect(back.status).toBe(orig.status);
      expect(back.hours).toBe(orig.hours);
      expect(back.travel_country).toBe(orig.travel_country);
      expect(back.destination).toBe(orig.destination);
      expect(back.is_arrival).toBe(orig.is_arrival);
      expect(back.breakfast).toBe(orig.breakfast);
    }
  });

  it("rechnet nach dem Rundlauf dieselben Beträge", async () => {
    const zurueck = await rundlauf(buildSheetData(rows, [INLAND]));
    for (const orig of MONAT) {
      const back = zurueck.find((i) => i.entry_date === orig.entry_date)!;
      expect(calcDay(back, rateFor(back, [INLAND])).amount).toBe(
        calcDay(orig, rateFor(orig, [INLAND])).amount,
      );
    }
  });

  it("erkennt das Reiseland als Code und als Name", async () => {
    const zurueck = await rundlauf([
      ["Datum", "Status", "Stunden", "Land"],
      ["2026-09-01", "Auswärtstätigkeit", "24", "Frankreich"],
      ["2026-09-02", "Auswärtstätigkeit", "24", "NO"],
      ["2026-09-03", "Auswärtstätigkeit", "24", "Deutschland"],
    ]);
    expect(zurueck[0].travel_country).toBe("FR");
    expect(zurueck[1].travel_country).toBe("NO");
    expect(zurueck[2].travel_country).toBeNull();
    expect(calcDay(zurueck[0], rateFor(zurueck[0], [INLAND])).amount).toBe(53);
    expect(calcDay(zurueck[2], rateFor(zurueck[2], [INLAND])).amount).toBe(28);
  });

  it("versteht deutsche und ISO-Datumsformate und überspringt die Summenzeile", async () => {
    const zurueck = await rundlauf([
      ["Datum", "Status", "Stunden"],
      ["01.09.2026", "Auswärtstätigkeit", "10"],
      ["2026-09-02", "Auswärtstätigkeit", "10"],
      ["Summe", "", "28"],
    ]);
    expect(zurueck).toHaveLength(2);
    expect(zurueck[0].entry_date).toBe("2026-09-01");
    expect(zurueck[1].entry_date).toBe("2026-09-02");
  });
});
