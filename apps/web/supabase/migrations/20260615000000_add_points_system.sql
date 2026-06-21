-- migrations/add_points_system.sql
-- Points ledger for gamification system

CREATE TABLE IF NOT EXISTS public.user_points (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points integer DEFAULT 0,
  earned_points integer DEFAULT 0,
  spent_points integer DEFAULT 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS public.points_ledger (
  id uuid PRIMARY KEY default uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'refund')),
  amount integer NOT NULL,
  reason text,
  source_event text,
  source_id text,
  created_at timestamp with time zone default now()
);

CREATE INDEX IF NOT EXISTS idx_user_points ON public.points_ledger (user_id);
CREATE INDEX IF NOT EXISTS idx_created_at ON public.points_ledger (created_at);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow own access" ON public.user_points
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow own read" ON public.user_points
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow own insert" ON public.points_ledger
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow own read" ON public.points_ledger
  FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_user_points_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_points_timestamp
BEFORE UPDATE ON public.user_points
FOR EACH ROW EXECUTE FUNCTION public.update_user_points_timestamp();

CREATE OR REPLACE FUNCTION public.sync_points_on_ledger_insert()
RETURNS trigger AS $$
BEGIN
  UPDATE public.user_points
  SET
    total_points = CASE
      WHEN NEW.transaction_type IN ('earned', 'bonus') THEN total_points + NEW.amount
      WHEN NEW.transaction_type IN ('spent', 'refund') THEN total_points - NEW.amount
      ELSE total_points
    END,
    earned_points = CASE
      WHEN NEW.transaction_type IN ('earned', 'bonus') THEN earned_points + NEW.amount
      ELSE earned_points
    END,
    spent_points = CASE
      WHEN NEW.transaction_type IN ('spent', 'refund') THEN spent_points + NEW.amount
      ELSE spent_points
    END,
    updated_at = now()
  WHERE user_id = NEW.user_id;

  INSERT INTO public.user_points (user_id, total_points, earned_points, spent_points)
  VALUES (NEW.user_id,
    CASE WHEN NEW.transaction_type IN ('earned', 'bonus') THEN NEW.amount ELSE 0 END,
    CASE WHEN NEW.transaction_type IN ('earned', 'bonus') THEN NEW.amount ELSE 0 END,
    CASE WHEN NEW.transaction_type IN ('spent', 'refund') THEN NEW.amount ELSE 0 END
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_points_ledger_insert
AFTER INSERT ON public.points_ledger
FOR EACH ROW EXECUTE FUNCTION public.sync_points_on_ledger_insert();
