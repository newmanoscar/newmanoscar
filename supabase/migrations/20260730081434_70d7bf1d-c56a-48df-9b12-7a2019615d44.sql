CREATE TYPE public.day_status AS ENUM ('travel','vacation','holiday','sick','office','off');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.rate_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  full_day numeric(10,2) NOT NULL DEFAULT 28,
  partial_day numeric(10,2) NOT NULL DEFAULT 14,
  travel_day numeric(10,2) NOT NULL DEFAULT 14,
  min_hours numeric(5,2) NOT NULL DEFAULT 8,
  breakfast_pct numeric(5,2) NOT NULL DEFAULT 20,
  lunch_pct numeric(5,2) NOT NULL DEFAULT 40,
  dinner_pct numeric(5,2) NOT NULL DEFAULT 40,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_profiles TO authenticated;
GRANT ALL ON public.rate_profiles TO service_role;
ALTER TABLE public.rate_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rate profiles" ON public.rate_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX rate_profiles_user_idx ON public.rate_profiles(user_id);

CREATE TABLE public.day_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  status public.day_status NOT NULL DEFAULT 'office',
  start_time text,
  end_time text,
  hours numeric(6,2) NOT NULL DEFAULT 0,
  is_arrival boolean NOT NULL DEFAULT false,
  is_departure boolean NOT NULL DEFAULT false,
  destination text,
  breakfast boolean NOT NULL DEFAULT false,
  lunch boolean NOT NULL DEFAULT false,
  dinner boolean NOT NULL DEFAULT false,
  note text,
  rate_profile_id uuid REFERENCES public.rate_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_entries TO authenticated;
GRANT ALL ON public.day_entries TO service_role;
ALTER TABLE public.day_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own day entries" ON public.day_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX day_entries_user_date_idx ON public.day_entries(user_id, entry_date);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER rate_profiles_updated_at BEFORE UPDATE ON public.rate_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER day_entries_updated_at BEFORE UPDATE ON public.day_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.rate_profiles (user_id, name, full_day, partial_day, travel_day, min_hours, breakfast_pct, lunch_pct, dinner_pct, is_default)
  VALUES (NEW.id, 'Inland', 28, 14, 14, 8, 20, 40, 40, true);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
