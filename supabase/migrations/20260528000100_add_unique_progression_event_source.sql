-- Add unique constraint to prevent duplicate progression_events for the same source
-- Ensures (user_id, source_table, source_id) is unique to avoid race-condition duplicates

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'progression_events' AND indexname = 'uq_progression_events_user_source'
  ) THEN
    CREATE UNIQUE INDEX uq_progression_events_user_source
      ON public.progression_events (user_id, source_table, source_id);
  END IF;
END$$;