import type { SupabaseClient } from "@supabase/supabase-js";
import { loadSpogomiEventForOrganizer, type EventRow } from "./preparation-service";

/**
 * Returns only events that pass the existing organizer authorization check.
 * The service-role read is kept server-side; unauthorized rows never reach a
 * page component or a client component.
 */
export async function listSpogomiEventsForOrganizer(
  supabase: SupabaseClient,
  userId: string,
): Promise<EventRow[]> {
  const result = await supabase
    .from("spogomi_events")
    .select("id")
    .order("starts_at", { ascending: false });
  if (result.error) throw result.error;

  const events = await Promise.all(
    (result.data ?? []).map(async (row) => loadSpogomiEventForOrganizer(supabase, String(row.id), userId)),
  );
  return events.filter((event): event is EventRow => Boolean(event));
}
