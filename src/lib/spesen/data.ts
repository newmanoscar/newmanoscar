import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DayEntry, DayEntryDraft, RateProfile, UserProfile } from "./types";
import { daysInMonth, iso } from "./calc";

export function useRateProfiles(userId?: string) {
  return useQuery({
    queryKey: ["rate_profiles", userId],
    enabled: !!userId,
    queryFn: async (): Promise<RateProfile[]> => {
      const { data, error } = await supabase
        .from("rate_profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        full_day: Number(r.full_day),
        partial_day: Number(r.partial_day),
        travel_day: Number(r.travel_day),
        min_hours: Number(r.min_hours),
        breakfast_pct: Number(r.breakfast_pct),
        lunch_pct: Number(r.lunch_pct),
        dinner_pct: Number(r.dinner_pct),
      })) as RateProfile[];
    },
  });
}

export function useMonthEntries(userId: string | undefined, year: number, month: number) {
  const from = iso(year, month, 1);
  const to = iso(year, month, daysInMonth(year, month));
  return useQuery({
    queryKey: ["day_entries", userId, from],
    enabled: !!userId,
    queryFn: async (): Promise<DayEntry[]> => {
      const { data, error } = await supabase
        .from("day_entries")
        .select("*")
        .gte("entry_date", from)
        .lte("entry_date", to)
        .order("entry_date");
      if (error) throw error;
      return (data ?? []).map((e) => ({ ...e, hours: Number(e.hours) })) as DayEntry[];
    },
  });
}

export function useYearEntries(userId: string | undefined, year: number) {
  return useQuery({
    queryKey: ["day_entries_year", userId, year],
    enabled: !!userId,
    queryFn: async (): Promise<DayEntry[]> => {
      const { data, error } = await supabase
        .from("day_entries")
        .select("*")
        .gte("entry_date", `${year}-01-01`)
        .lte("entry_date", `${year}-12-31`)
        .order("entry_date");
      if (error) throw error;
      return (data ?? []).map((e) => ({ ...e, hours: Number(e.hours) })) as DayEntry[];
    },
  });
}

export function emptyDraft(date: string): DayEntryDraft {
  return {
    entry_date: date,
    status: "office",
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
  };
}

export function useSaveEntry(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: DayEntryDraft) => {
      if (!userId) throw new Error("Nicht angemeldet");
      const { error } = await supabase
        .from("day_entries")
        .upsert({ ...draft, user_id: userId }, { onConflict: "user_id,entry_date" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["day_entries"] });
      qc.invalidateQueries({ queryKey: ["day_entries_year"] });
    },
  });
}

export function useSaveEntries(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (drafts: DayEntryDraft[]) => {
      if (!userId) throw new Error("Nicht angemeldet");
      if (!drafts.length) return;
      const { error } = await supabase
        .from("day_entries")
        .upsert(
          drafts.map((d) => ({ ...d, user_id: userId })),
          { onConflict: "user_id,entry_date" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["day_entries"] });
      qc.invalidateQueries({ queryKey: ["day_entries_year"] });
    },
  });
}

export function useDeleteEntry(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (date: string) => {
      const { error } = await supabase.from("day_entries").delete().eq("entry_date", date);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["day_entries"] });
      qc.invalidateQueries({ queryKey: ["day_entries_year"] });
    },
  });
}

export function useSaveRate(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rate: Partial<RateProfile> & { id?: string }) => {
      if (!userId) throw new Error("Nicht angemeldet");
      if (rate.is_default) {
        await supabase.from("rate_profiles").update({ is_default: false }).eq("user_id", userId);
      }
      const payload = { ...rate, user_id: userId, name: rate.name ?? "Neues Profil" };
      const { error } = rate.id
        ? await supabase.from("rate_profiles").update(payload).eq("id", rate.id)
        : await supabase.from("rate_profiles").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rate_profiles"] }),
  });
}

export function useDeleteRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rate_profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rate_profiles"] }),
  });
}

/* ---------------- Standort / Profil ---------------- */

export function useUserProfile(userId?: string) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserProfile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, country_code, region_code, address")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as UserProfile) ?? null;
    },
  });
}

export function useSaveUserProfile(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<UserProfile>) => {
      if (!userId) throw new Error("Nicht angemeldet");
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, ...patch }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

/* ---------------- Belege ---------------- */

export async function uploadReceipt(userId: string, date: string, blob: Blob, ext = "jpg") {
  const path = `${userId}/${date}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("receipts")
    .upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: true });
  if (error) throw error;
  return path;
}

export async function receiptUrl(path: string) {
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteReceipt(path: string) {
  await supabase.storage.from("receipts").remove([path]);
}
