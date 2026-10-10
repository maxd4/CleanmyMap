import type { SupabaseClient } from "@supabase/supabase-js";
import { writeProgressionEventWithPolicy } from "./progression-event-write-policy";
import { clampWeight } from "./progression-utils";
import type { EventInsertParams } from "./progression-types";

export async function insertProgressionEvent(
  supabase: SupabaseClient,
  params: EventInsertParams,
): Promise<boolean> {
  const result = await writeProgressionEventWithPolicy(
    async () =>
      supabase.from("progression_events").insert({
        user_id: params.userId,
        event_type: params.eventType,
        source_table: params.sourceTable,
        source_id: params.sourceId,
        status_phase: params.statusPhase,
        weight: clampWeight(params.weight),
        xp_base: Math.max(0, params.xpBase),
        xp_awarded: Math.max(0, params.xpAwarded),
        occurred_on: params.occurredOn,
        metadata: params.metadata ?? {},
      }),
    { mode: "strict" },
  );
  return !result.duplicate;
}
