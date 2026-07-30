/** Gesetzliche Feiertage – berechnet, ohne externe Pflege, Jahr für Jahr. */

export type Region = { code: string; name: string };
export type Country = { code: string; name: string; regions: Region[] };

export const HOLIDAY_COUNTRIES: Country[] = [
  {
    code: "DE",
    name: "Deutschland",
    regions: [
      { code: "BW", name: "Baden-Württemberg" },
      { code: "BY", name: "Bayern" },
      { code: "BE", name: "Berlin" },
      { code: "BB", name: "Brandenburg" },
      { code: "HB", name: "Bremen" },
      { code: "HH", name: "Hamburg" },
      { code: "HE", name: "Hessen" },
      { code: "MV", name: "Mecklenburg-Vorpommern" },
      { code: "NI", name: "Niedersachsen" },
      { code: "NW", name: "Nordrhein-Westfalen" },
      { code: "RP", name: "Rheinland-Pfalz" },
      { code: "SL", name: "Saarland" },
      { code: "SN", name: "Sachsen" },
      { code: "ST", name: "Sachsen-Anhalt" },
      { code: "SH", name: "Schleswig-Holstein" },
      { code: "TH", name: "Thüringen" },
    ],
  },
  {
    code: "AT",
    name: "Österreich",
    regions: [
      { code: "W", name: "Wien" },
      { code: "NO", name: "Niederösterreich" },
      { code: "OO", name: "Oberösterreich" },
      { code: "S", name: "Salzburg" },
      { code: "T", name: "Tirol" },
      { code: "V", name: "Vorarlberg" },
      { code: "K", name: "Kärnten" },
      { code: "ST", name: "Steiermark" },
      { code: "B", name: "Burgenland" },
    ],
  },
  {
    code: "CH",
    name: "Schweiz",
    regions: [
      { code: "ZH", name: "Zürich" },
      { code: "BE", name: "Bern" },
      { code: "LU", name: "Luzern" },
      { code: "BS", name: "Basel-Stadt" },
      { code: "SG", name: "St. Gallen" },
      { code: "TI", name: "Tessin" },
      { code: "GE", name: "Genf" },
      { code: "VD", name: "Waadt" },
    ],
  },
];

const pad = (n: number) => String(n).padStart(2, "0");
const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Ostersonntag (gregorianisch, Meeus/Jones/Butcher). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

type Rule = { name: string; date: (y: number, easter: Date) => Date; regions?: string[] };

const fixed = (month: number, day: number) => (y: number) => new Date(y, month - 1, day);
const rel = (offset: number) => (_y: number, easter: Date) => addDays(easter, offset);

const DE_RULES: Rule[] = [
  { name: "Neujahr", date: fixed(1, 1) },
  { name: "Heilige Drei Könige", date: fixed(1, 6), regions: ["BW", "BY", "ST"] },
  { name: "Internationaler Frauentag", date: fixed(3, 8), regions: ["BE", "MV"] },
  { name: "Karfreitag", date: rel(-2) },
  { name: "Ostersonntag", date: rel(0), regions: ["BB", "HE"] },
  { name: "Ostermontag", date: rel(1) },
  { name: "Tag der Arbeit", date: fixed(5, 1) },
  { name: "Christi Himmelfahrt", date: rel(39) },
  { name: "Pfingstsonntag", date: rel(49), regions: ["BB", "HE"] },
  { name: "Pfingstmontag", date: rel(50) },
  { name: "Fronleichnam", date: rel(60), regions: ["BW", "BY", "HE", "NW", "RP", "SL"] },
  { name: "Mariä Himmelfahrt", date: fixed(8, 15), regions: ["BY", "SL"] },
  { name: "Weltkindertag", date: fixed(9, 20), regions: ["TH"] },
  { name: "Tag der Deutschen Einheit", date: fixed(10, 3) },
  {
    name: "Reformationstag",
    date: fixed(10, 31),
    regions: ["BB", "HB", "HH", "MV", "NI", "SN", "ST", "SH", "TH"],
  },
  { name: "Allerheiligen", date: fixed(11, 1), regions: ["BW", "BY", "NW", "RP", "SL"] },
  {
    name: "Buß- und Bettag",
    date: (y) => {
      // Mittwoch vor dem 23. November
      const d = new Date(y, 10, 22);
      while (d.getDay() !== 3) d.setDate(d.getDate() - 1);
      return d;
    },
    regions: ["SN"],
  },
  { name: "1. Weihnachtsfeiertag", date: fixed(12, 25) },
  { name: "2. Weihnachtsfeiertag", date: fixed(12, 26) },
];

const AT_RULES: Rule[] = [
  { name: "Neujahr", date: fixed(1, 1) },
  { name: "Heilige Drei Könige", date: fixed(1, 6) },
  { name: "Ostermontag", date: rel(1) },
  { name: "Staatsfeiertag", date: fixed(5, 1) },
  { name: "Christi Himmelfahrt", date: rel(39) },
  { name: "Pfingstmontag", date: rel(50) },
  { name: "Fronleichnam", date: rel(60) },
  { name: "Mariä Himmelfahrt", date: fixed(8, 15) },
  { name: "Nationalfeiertag", date: fixed(10, 26) },
  { name: "Allerheiligen", date: fixed(11, 1) },
  { name: "Mariä Empfängnis", date: fixed(12, 8) },
  { name: "Christtag", date: fixed(12, 25) },
  { name: "Stefanitag", date: fixed(12, 26) },
];

const CH_RULES: Rule[] = [
  { name: "Neujahr", date: fixed(1, 1) },
  { name: "Berchtoldstag", date: fixed(1, 2), regions: ["ZH", "BE", "LU", "SG", "VD"] },
  { name: "Karfreitag", date: rel(-2), regions: ["ZH", "BE", "LU", "BS", "SG", "VD", "GE"] },
  { name: "Ostermontag", date: rel(1) },
  { name: "Tag der Arbeit", date: fixed(5, 1), regions: ["ZH", "BS", "TI"] },
  { name: "Auffahrt", date: rel(39) },
  { name: "Pfingstmontag", date: rel(50) },
  { name: "Fronleichnam", date: rel(60), regions: ["LU", "TI"] },
  { name: "Bundesfeiertag", date: fixed(8, 1) },
  { name: "Mariä Himmelfahrt", date: fixed(8, 15), regions: ["LU", "TI"] },
  { name: "Allerheiligen", date: fixed(11, 1), regions: ["LU", "SG", "TI"] },
  { name: "Weihnachten", date: fixed(12, 25) },
  { name: "Stephanstag", date: fixed(12, 26), regions: ["ZH", "BE", "LU", "SG", "TI"] },
];

const RULES: Record<string, Rule[]> = { DE: DE_RULES, AT: AT_RULES, CH: CH_RULES };

/** Feiertage eines Jahres als Map „yyyy-MM-dd“ → Name. */
export function holidaysForYear(
  year: number,
  country: string | null | undefined,
  region: string | null | undefined,
): Map<string, string> {
  const rules = RULES[country ?? "DE"];
  const out = new Map<string, string>();
  if (!rules) return out;
  const easter = easterSunday(year);
  for (const rule of rules) {
    if (rule.regions && !(region && rule.regions.includes(region))) continue;
    out.set(key(rule.date(year, easter)), rule.name);
  }
  return out;
}

export function holidaysForMonth(
  year: number,
  month: number,
  country: string | null | undefined,
  region: string | null | undefined,
): Map<string, string> {
  const prefix = `${year}-${pad(month + 1)}`;
  const all = holidaysForYear(year, country, region);
  return new Map([...all].filter(([d]) => d.startsWith(prefix)));
}

export function regionsFor(country: string | null | undefined): Region[] {
  return HOLIDAY_COUNTRIES.find((c) => c.code === (country ?? "DE"))?.regions ?? [];
}
