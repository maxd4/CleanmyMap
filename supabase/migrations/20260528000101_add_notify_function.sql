-- Create a helper function to emit NOTIFY messages with JSON payload
CREATE OR REPLACE FUNCTION public.notify_gamification(channel text, payload jsonb)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM pg_notify(channel, payload::text);
END;
$function$;
