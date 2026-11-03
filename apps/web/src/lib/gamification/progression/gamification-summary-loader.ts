import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProgressionEventType, ProgressionStatusPhase } from "./progression-types";

export type GamificationLedgerEvent = {
  event_type: ProgressionEventType;
  status_phase: ProgressionStatusPhase;
  source_table: string;
  source_id: string;
  xp_awarded: number;
  occurred_on: string | null;
  metadata: Record<string, unknown> | null;
};

export async function loadGamificationLedgerEvents(
  supabase: SupabaseClient,
  userId: string,
): Promise<GamificationLedgerEvent[]> {
  const result = await supabase
    .from("progression_events")
    .select("event_type, status_phase, source_table, source_id, xp_awarded, occurred_on, metadata")
    .eq("user_id", userId)
    .limit(12000);

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []).filter(
    (event): event is GamificationLedgerEvent =>
      Boolean(event) &&
      typeof event.event_type === "string" &&
      typeof event.status_phase === "string" &&
      typeof event.source_table === "string" &&
      typeof event.source_id === "string",
  ).map((event) => ({
    event_type: event.event_type as ProgressionEventType,
    status_phase: event.status_phase as ProgressionStatusPhase,
    source_table: event.source_table,
    source_id: event.source_id,
    xp_awarded: Number(event.xp_awarded) || 0,
    occurred_on: typeof event.occurred_on === "string" ? event.occurred_on : null,
    metadata:
      event.metadata && typeof event.metadata === "object"
        ? (event.metadata as Record<string, unknown>)
        : null,
  }));
}
