export type DayStatus = "travel" | "vacation" | "holiday" | "sick" | "office" | "off";

export const STATUS_LABEL: Record<DayStatus, string> = {
  travel: "Auswärtstätigkeit",
  vacation: "Urlaub",
  holiday: "Feiertag",
  sick: "Krank",
  office: "Arbeitsstätte",
  off: "Frei",
};

export const STATUS_SHORT: Record<DayStatus, string> = {
  travel: "Reise",
  vacation: "Urlaub",
  holiday: "Feiertag",
  sick: "Krank",
  office: "Büro",
  off: "Frei",
};

export const STATUS_ORDER: DayStatus[] = [
  "travel",
  "office",
  "vacation",
  "holiday",
  "sick",
  "off",
];

export type RateProfile = {
  id: string;
  user_id: string;
  name: string;
  full_day: number;
  partial_day: number;
  travel_day: number;
  min_hours: number;
  breakfast_pct: number;
  lunch_pct: number;
  dinner_pct: number;
  is_default: boolean;
  country_code: string | null;
};

export type DayEntry = {
  id: string;
  user_id: string;
  entry_date: string; // yyyy-MM-dd
  status: DayStatus;
  start_time: string | null;
  end_time: string | null;
  hours: number;
  is_arrival: boolean;
  is_departure: boolean;
  destination: string | null;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  note: string | null;
  rate_profile_id: string | null;
  travel_country: string | null;
  receipt_path: string | null;
};

export type DayEntryDraft = Omit<DayEntry, "id" | "user_id">;

export type UserProfile = {
  id: string;
  display_name: string | null;
  country_code: string;
  region_code: string | null;
  address: string | null;
};
