ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'DE',
  ADD COLUMN IF NOT EXISTS region_code text,
  ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE public.rate_profiles
  ADD COLUMN IF NOT EXISTS country_code text;

ALTER TABLE public.day_entries
  ADD COLUMN IF NOT EXISTS travel_country text,
  ADD COLUMN IF NOT EXISTS receipt_path text;
