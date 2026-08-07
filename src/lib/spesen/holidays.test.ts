import { describe, expect, it } from "vitest";
import { easterSunday, holidaysForMonth, holidaysForYear } from "./holidays";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

describe("Ostersonntag", () => {
  it("trifft die amtlichen Daten", () => {
    expect(iso(easterSunday(2024))).toBe("2024-03-31");
    expect(iso(easterSunday(2025))).toBe("2025-04-20");
    expect(iso(easterSunday(2026))).toBe("2026-04-05");
    expect(iso(easterSunday(2027))).toBe("2027-03-28");
    expect(iso(easterSunday(2030))).toBe("2030-04-21");
  });
});

describe("Bewegliche Feiertage", () => {
  const by = holidaysForYear(2026, "DE", "BY");

  it("leitet sich korrekt von Ostern ab", () => {
    expect(by.get("2026-04-03")).toBe("Karfreitag");
    expect(by.get("2026-04-06")).toBe("Ostermontag");
    expect(by.get("2026-05-14")).toBe("Christi Himmelfahrt");
    expect(by.get("2026-05-25")).toBe("Pfingstmontag");
    expect(by.get("2026-06-04")).toBe("Fronleichnam");
  });

  it("rechnet für jedes Jahr neu", () => {
    const by27 = holidaysForYear(2027, "DE", "BY");
    expect(by27.get("2027-03-26")).toBe("Karfreitag");
    expect(by27.get("2027-05-27")).toBe("Fronleichnam");
  });
});

describe("Bundesweite Feiertage", () => {
  const by = holidaysForYear(2026, "DE", "BY");

  it("gelten überall", () => {
    expect(by.get("2026-01-01")).toBe("Neujahr");
    expect(by.get("2026-05-01")).toBe("Tag der Arbeit");
    expect(by.get("2026-10-03")).toBe("Tag der Deutschen Einheit");
    expect(by.get("2026-12-25")).toBe("1. Weihnachtsfeiertag");
    expect(by.get("2026-12-26")).toBe("2. Weihnachtsfeiertag");
  });
});

describe("Landesspezifische Feiertage", () => {
  const by = holidaysForYear(2026, "DE", "BY");
  const ni = holidaysForYear(2026, "DE", "NI");
  const sn = holidaysForYear(2026, "DE", "SN");

  it("greifen nur im richtigen Bundesland", () => {
    expect(by.has("2026-06-04")).toBe(true); // Fronleichnam
    expect(ni.has("2026-06-04")).toBe(false);
    expect(sn.get("2026-10-31")).toBe("Reformationstag");
    expect(by.has("2026-10-31")).toBe(false);
    expect(by.get("2026-08-15")).toBe("Mariä Himmelfahrt");
    expect(sn.has("2026-08-15")).toBe(false);
    expect(by.get("2026-01-06")).toBe("Heilige Drei Könige");
    expect(ni.has("2026-01-06")).toBe(false);
  });

  it("setzt den Buß- und Bettag auf den Mittwoch vor dem 23. November", () => {
    expect(holidaysForYear(2024, "DE", "SN").get("2024-11-20")).toBe("Buß- und Bettag");
    expect(holidaysForYear(2025, "DE", "SN").get("2025-11-19")).toBe("Buß- und Bettag");
    expect(sn.get("2026-11-18")).toBe("Buß- und Bettag");
    expect(by.has("2026-11-18")).toBe(false);
  });

  it("liefert ohne Landeswahl nur die bundesweiten", () => {
    const ohne = holidaysForYear(2026, "DE", null);
    expect(ohne.get("2026-01-01")).toBe("Neujahr");
    expect(ohne.has("2026-06-04")).toBe(false);
  });
});

describe("Österreich und Schweiz", () => {
  it("bringen ihre eigenen Feiertage mit", () => {
    const at = holidaysForYear(2026, "AT", "W");
    expect(at.get("2026-10-26")).toBe("Nationalfeiertag");
    expect(at.get("2026-12-08")).toBe("Mariä Empfängnis");
    expect(at.get("2026-06-04")).toBe("Fronleichnam");

    const ch = holidaysForYear(2026, "CH", "ZH");
    expect(ch.get("2026-08-01")).toBe("Bundesfeiertag");
    expect(ch.get("2026-01-02")).toBe("Berchtoldstag");
    expect(holidaysForYear(2026, "CH", "TI").has("2026-01-02")).toBe(false);
  });
});

describe("Monatsfilter", () => {
  it("liefert nur die Feiertage des gewählten Monats", () => {
    expect(holidaysForMonth(2026, 11, "DE", "BY").size).toBe(2); // Dezember
    expect(holidaysForMonth(2026, 5, "DE", "BY").size).toBe(1); // Juni: Fronleichnam
    expect(holidaysForMonth(2026, 5, "DE", "NI").size).toBe(0);
  });
});
