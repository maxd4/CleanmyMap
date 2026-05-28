-- migrations/add_badge_totals.sql

CREATE TABLE IF NOT EXISTS public.user_badge_totals (
  user_id uuid PRIMARY KEY,
  waste_kg numeric DEFAULT 0,
  butts integer DEFAULT 0,
  waste_level integer GENERATED ALWAYS AS (floor(waste_kg / 10)) STORED,
  butts_level integer GENERATED ALWAYS AS (floor(butts / 1000)) STORED,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS public.badge_events (
  id uuid PRIMARY KEY default uuid_generate_v4(),
  user_id uuid REFERENCES public.user_badge_totals(user_id),
  family text NOT NULL CHECK (family IN ('waste','butts')),
  delta numeric NOT NULL,
  created_at timestamp with time zone default now()
);

-- Row level security
ALTER TABLE public.user_badge_totals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow own access" ON public.user_badge_totals
  FOR SELECT USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.badge_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow own insert" ON public.badge_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at and recompute levels (if needed)
CREATE OR REPLACE FUNCTION public.update_badge_totals()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_badge_totals_update
BEFORE UPDATE ON public.user_badge_totals
FOR EACH ROW EXECUTE FUNCTION public.update_badge_totals();
