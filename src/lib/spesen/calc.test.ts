import { describe, expect, it } from "vitest";
import { calcDay, hoursFromTimes, rateFor, summarize } from "./calc";
import type { DayEntry, DayEntryDraft, RateProfile } from "./types";

/**
 * Prüft die Geldrechnung gegen §9 Abs. 4a EStG: 28 € für den vollen
 * Kalendertag, 14 € bei mehr als acht Stunden sowie am An- und Abreisetag,
 * Kürzung um 20 / 40 / 40 % des Volltagssatzes je gestellter Mahlzeit.
 */
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

const tag = (o: Partial<DayEntryDraft> = {}): DayEntryDraft => ({
  entry_date: "2026-08-03",
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
});

const betrag = (o: Partial<DayEntryDraft>, rates: RateProfile[] = [INLAND]) => {
  const e = tag(o);
  return calcDay(e, rateFor(e, rates)).amount;
};

describe("Tagespauschale Inland", () => {
  it("zahlt 14 € bei mehr als acht Stunden", () => {
    expect(betrag({ hours: 10 })).toBe(14);
    expect(betrag({ hours: 8.5 })).toBe(14);
  });

  it("zahlt nichts bei genau acht Stunden – das Gesetz verlangt MEHR als acht", () => {
    expect(betrag({ hours: 8 })).toBe(0);
  });

  it("zahlt 28 € für den vollen Kalendertag", () => {
    expect(betrag({ hours: 24 })).toBe(28);
  });

  it("zahlt am An- und Abreisetag unabhängig von der Dauer", () => {
    expect(betrag({ hours: 4, is_arrival: true })).toBe(14);
    expect(betrag({ hours: 1, is_departure: true })).toBe(14);
  });

  it("zahlt für andere Tagesarten nichts", () => {
    for (const status of ["vacation", "holiday", "sick", "office", "off"] as const) {
      expect(betrag({ status, hours: 24 })).toBe(0);
    }
  });
});

describe("Mahlzeitenkürzung", () => {
  it("kürzt prozentual vom Volltagssatz, nicht vom Tagesbetrag", () => {
    expect(betrag({ hours: 24, breakfast: true })).toBe(22.4);
    expect(betrag({ hours: 24, lunch: true })).toBe(16.8);
    expect(betrag({ hours: 24, dinner: true })).toBe(16.8);
    expect(betrag({ hours: 9, breakfast: true })).toBe(8.4);
  });

  it("wird bei allen drei Mahlzeiten zu null, nie negativ", () => {
    expect(betrag({ hours: 24, breakfast: true, lunch: true, dinner: true })).toBe(0);
    expect(
      betrag({ hours: 4, is_arrival: true, breakfast: true, lunch: true, dinner: true }),
    ).toBe(0);
  });
});

describe("hoursFromTimes", () => {
  it("rechnet auch über Mitternacht", () => {
    expect(hoursFromTimes("08:00", "20:00")).toBe(12);
    expect(hoursFromTimes("20:00", "08:00")).toBe(12);
    expect(hoursFromTimes("08:00", "16:30")).toBe(8.5);
  });

  it("liest gleiche Uhrzeiten als volle 24 Stunden", () => {
    // Der Zwischentag einer mehrtägigen Reise wird als 08:00-08:00 erfasst.
    // Früher ergab das null Stunden und der Tag fiel komplett aus der Rechnung.
    expect(hoursFromTimes("08:00", "08:00")).toBe(24);
    expect(betrag({ start_time: "08:00", end_time: "08:00" })).toBe(28);
  });

  it("liefert null, solange keine Zeiten gesetzt sind", () => {
    expect(hoursFromTimes(null, "08:00")).toBeNull();
    expect(hoursFromTimes("08:00", null)).toBeNull();
  });
});

describe("Auslandspauschalen", () => {
  it("nutzt den gesetzlichen Satz, wenn kein eigenes Profil angelegt ist", () => {
    expect(betrag({ hours: 24, travel_country: "FR" })).toBe(53);
    expect(betrag({ hours: 10, travel_country: "FR" })).toBe(36);
    expect(betrag({ hours: 24, travel_country: "NO" })).toBe(80);
    expect(betrag({ hours: 24, travel_country: "CH" })).toBe(64);
  });

  it("gibt dem An-/Abreisetag die kleine Auslandspauschale", () => {
    expect(betrag({ hours: 3, travel_country: "FR", is_arrival: true })).toBe(36);
  });

  it("kürzt Mahlzeiten mit dem Landessatz statt mit 28 €", () => {
    expect(betrag({ hours: 24, travel_country: "FR", breakfast: true })).toBe(42.4);
    expect(
      betrag({ hours: 24, travel_country: "FR", breakfast: true, lunch: true, dinner: true }),
    ).toBe(0);
  });

  it("hält die Mindeststundenschwelle auch im Ausland ein", () => {
    expect(betrag({ hours: 8, travel_country: "FR" })).toBe(0);
    expect(betrag({ hours: 8.5, travel_country: "FR" })).toBe(36);
  });

  it("lässt einem eigenen Länderprofil den Vorrang", () => {
    const eigen: RateProfile = {
      ...INLAND,
      id: "r2",
      name: "Frankreich eigen",
      full_day: 60,
      partial_day: 40,
      travel_day: 40,
      is_default: false,
      country_code: "FR",
    };
    expect(betrag({ hours: 24, travel_country: "FR" }, [INLAND, eigen])).toBe(60);
    // Ein fest gewähltes Profil schlägt das Reiseland.
    expect(betrag({ hours: 24, travel_country: "FR", rate_profile_id: "r1" }, [INLAND, eigen])).toBe(28);
  });

  it("fällt bei unbekanntem Land auf den Standard zurück", () => {
    expect(betrag({ hours: 24, travel_country: "XX" })).toBe(28);
  });
});

describe("Monatssumme", () => {
  it("summiert gemischte Tagesarten korrekt", () => {
    const monat = [
      tag({ hours: 10, is_arrival: true }),
      tag({ hours: 24, breakfast: true }),
      tag({ hours: 9, is_departure: true, breakfast: true }),
      tag({ status: "office", hours: 8 }),
    ] as DayEntry[];
    const s = summarize(monat, [INLAND]);
    expect(s.total).toBe(44.8);
    expect(s.reduction).toBe(11.2);
    expect(s.travelDays).toBe(3);
  });
});
