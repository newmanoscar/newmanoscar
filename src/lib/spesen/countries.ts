/**
 * Auslands-Verpflegungspauschalen (Richtwerte in EUR, Stand BMF-Schreiben).
 * Dienen nur als Vorbelegung – jedes Satzprofil bleibt frei editierbar.
 */
export type CountryRate = {
  code: string;
  name: string;
  full_day: number;
  partial_day: number;
};

export const COUNTRY_RATES: CountryRate[] = [
  { code: "DE", name: "Deutschland", full_day: 28, partial_day: 14 },
  { code: "AT", name: "Österreich", full_day: 40, partial_day: 27 },
  { code: "BE", name: "Belgien", full_day: 59, partial_day: 40 },
  { code: "BG", name: "Bulgarien", full_day: 22, partial_day: 15 },
  { code: "CH", name: "Schweiz", full_day: 64, partial_day: 43 },
  { code: "CZ", name: "Tschechien", full_day: 32, partial_day: 21 },
  { code: "DK", name: "Dänemark", full_day: 58, partial_day: 39 },
  { code: "EE", name: "Estland", full_day: 29, partial_day: 20 },
  { code: "ES", name: "Spanien", full_day: 34, partial_day: 23 },
  { code: "FI", name: "Finnland", full_day: 50, partial_day: 33 },
  { code: "FR", name: "Frankreich", full_day: 53, partial_day: 36 },
  { code: "GB", name: "Vereinigtes Königreich", full_day: 52, partial_day: 35 },
  { code: "GR", name: "Griechenland", full_day: 36, partial_day: 24 },
  { code: "HR", name: "Kroatien", full_day: 35, partial_day: 24 },
  { code: "HU", name: "Ungarn", full_day: 32, partial_day: 21 },
  { code: "IE", name: "Irland", full_day: 58, partial_day: 39 },
  { code: "IT", name: "Italien", full_day: 40, partial_day: 27 },
  { code: "LT", name: "Litauen", full_day: 26, partial_day: 17 },
  { code: "LU", name: "Luxemburg", full_day: 63, partial_day: 42 },
  { code: "LV", name: "Lettland", full_day: 35, partial_day: 24 },
  { code: "NL", name: "Niederlande", full_day: 47, partial_day: 32 },
  { code: "NO", name: "Norwegen", full_day: 80, partial_day: 53 },
  { code: "PL", name: "Polen", full_day: 33, partial_day: 22 },
  { code: "PT", name: "Portugal", full_day: 32, partial_day: 21 },
  { code: "RO", name: "Rumänien", full_day: 32, partial_day: 21 },
  { code: "SE", name: "Schweden", full_day: 66, partial_day: 44 },
  { code: "SI", name: "Slowenien", full_day: 38, partial_day: 25 },
  { code: "SK", name: "Slowakei", full_day: 33, partial_day: 22 },
  { code: "TR", name: "Türkei", full_day: 26, partial_day: 17 },
  { code: "US", name: "USA", full_day: 59, partial_day: 40 },
  { code: "CA", name: "Kanada", full_day: 54, partial_day: 36 },
  { code: "CN", name: "China", full_day: 41, partial_day: 28 },
  { code: "IN", name: "Indien", full_day: 38, partial_day: 25 },
  { code: "JP", name: "Japan", full_day: 52, partial_day: 35 },
  { code: "AE", name: "Ver. Arab. Emirate", full_day: 65, partial_day: 44 },
  { code: "AU", name: "Australien", full_day: 57, partial_day: 38 },
  { code: "BR", name: "Brasilien", full_day: 46, partial_day: 31 },
  { code: "ZA", name: "Südafrika", full_day: 33, partial_day: 22 },
];

export const countryName = (code?: string | null) =>
  COUNTRY_RATES.find((c) => c.code === code)?.name ?? code ?? "";
