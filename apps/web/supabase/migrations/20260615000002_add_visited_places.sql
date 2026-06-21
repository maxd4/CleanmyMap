-- migrations/add_visited_places.sql
ALTER TABLE public.user_badge_totals
ADD COLUMN IF NOT EXISTS places_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS places_level integer GENERATED ALWAYS AS (floor(places_count / 5)) STORED;

CREATE TABLE IF NOT EXISTS public.user_visited_places (
  id uuid PRIMARY KEY default uuid_generate_v4(),
  user_id uuid REFERENCES public.user_badge_totals(user_id) ON DELETE CASCADE,
  place_label text NOT NULL,
  created_at timestamp with time zone default now(),
  UNIQUE(user_id, place_label)
);

ALTER TABLE public.user_visited_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow own access" ON public.user_visited_places
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow own insert" ON public.user_visited_places
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_places_count()
RETURNS trigger AS $$
BEGIN
  UPDATE public.user_badge_totals
  SET places_count = (SELECT count(*) FROM public.user_visited_places WHERE user_id = NEW.user_id)
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_visited_places_insert
AFTER INSERT ON public.user_visited_places
FOR EACH ROW EXECUTE FUNCTION public.update_places_count();
