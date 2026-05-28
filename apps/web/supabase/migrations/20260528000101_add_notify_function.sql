-- Create a helper function to emit NOTIFY messages with JSON payload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'notify_gamification'
  ) THEN
    CREATE OR REPLACE FUNCTION public.notify_gamification(channel text, payload jsonb)
    RETURNS void LANGUAGE plpgsql AS $$
    BEGIN
      PERFORM pg_notify(channel, payload::text);
    END;
    $$;
  END IF;
END$$;
