import type { DayEntryDraft, DayStatus } from "@/lib/spesen/types";
import { STATUS_LABEL, STATUS_SHORT, STATUS_ORDER } from "@/lib/spesen/types";
import { hoursFromTimes } from "@/lib/spesen/calc";

export type Col = {
  key: string;
  label: string;
  width: string;
  editable: boolean;
  align?: "right" | "center";
  get: (e: DayEntryDraft) => string;
  set?: (e: DayEntryDraft, v: string) => DayEntryDraft;
};

const bool = (v: string) => ["x", "ja", "j", "1", "true"].includes(v.trim().toLowerCase());

export function parseStatus(v: string): DayStatus {
  const s = v.trim().toLowerCase();
  if (!s) return "off";
  const hit = STATUS_ORDER.find(
    (k) =>
      STATUS_LABEL[k].toLowerCase().startsWith(s) ||
      STATUS_SHORT[k].toLowerCase().startsWith(s) ||
      k.startsWith(s),
  );
  return hit ?? "office";
}

const withHours = (e: DayEntryDraft): DayEntryDraft => {
  const h = hoursFromTimes(e.start_time, e.end_time);
  return h === null ? e : { ...e, hours: h };
};

export const COLS: Col[] = [
  {
    key: "status",
    label: "Status",
    width: "w-32",
    editable: true,
    get: (e) => STATUS_LABEL[e.status],
    set: (e, v) => ({ ...e, status: parseStatus(v) }),
  },
  {
    key: "start_time",
    label: "Von",
    width: "w-20",
    editable: true,
    get: (e) => e.start_time ?? "",
    set: (e, v) => withHours({ ...e, start_time: v || null }),
  },
  {
    key: "end_time",
    label: "Bis",
    width: "w-20",
    editable: true,
    get: (e) => e.end_time ?? "",
    set: (e, v) => withHours({ ...e, end_time: v || null }),
  },
  {
    key: "hours",
    label: "Std.",
    width: "w-16",
    editable: true,
    align: "right",
    get: (e) => (e.hours ? String(e.hours) : ""),
    set: (e, v) => ({ ...e, hours: Number(v.replace(",", ".")) || 0 }),
  },
  {
    key: "destination",
    label: "Ziel",
    width: "w-40",
    editable: true,
    get: (e) => e.destination ?? "",
    set: (e, v) => ({ ...e, destination: v || null }),
  },
  {
    key: "is_arrival",
    label: "An",
    width: "w-12",
    editable: true,
    align: "center",
    get: (e) => (e.is_arrival ? "x" : ""),
    set: (e, v) => ({ ...e, is_arrival: bool(v) }),
  },
  {
    key: "is_departure",
    label: "Ab",
    width: "w-12",
    editable: true,
    align: "center",
    get: (e) => (e.is_departure ? "x" : ""),
    set: (e, v) => ({ ...e, is_departure: bool(v) }),
  },
  {
    key: "breakfast",
    label: "Frü",
    width: "w-12",
    editable: true,
    align: "center",
    get: (e) => (e.breakfast ? "x" : ""),
    set: (e, v) => ({ ...e, breakfast: bool(v) }),
  },
  {
    key: "lunch",
    label: "Mit",
    width: "w-12",
    editable: true,
    align: "center",
    get: (e) => (e.lunch ? "x" : ""),
    set: (e, v) => ({ ...e, lunch: bool(v) }),
  },
  {
    key: "dinner",
    label: "Abd",
    width: "w-12",
    editable: true,
    align: "center",
    get: (e) => (e.dinner ? "x" : ""),
    set: (e, v) => ({ ...e, dinner: bool(v) }),
  },
  {
    key: "note",
    label: "Notiz",
    width: "w-44",
    editable: true,
    get: (e) => e.note ?? "",
    set: (e, v) => ({ ...e, note: v || null }),
  },
];
