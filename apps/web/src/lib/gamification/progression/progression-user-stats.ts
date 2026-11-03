import type { SupabaseClient } from "@supabase/supabase-js";
import { loadGamificationUserCounters } from "./counters";
import type { GamificationLedgerEvent } from "./gamification-summary-loader";
import { loadActionRowsForUser, loadCurrentValidatedActionIdsForUser } from "./progression-action-queries";
import { projectUserProgressionStats } from "./progression-user-stats-projection";
import type { UserProgressionStats } from "./progression-types";

export async function loadUserProgressionStats(
  supabase: SupabaseClient,
  userId: string,
  options: {
    events?: readonly GamificationLedgerEvent[] | Promise<readonly GamificationLedgerEvent[]>;
  } = {},
): Promise<UserProgressionStats> {
  const actionRowsPromise = loadActionRowsForUser(supabase, userId);
  const eventsPromise = options.events
    ? Promise.resolve(options.events)
    : supabase
        .from("progression_events")
        .select("event_type, status_phase, source_table, source_id, xp_awarded")
        .eq("user_id", userId)
        .limit(12000)
        .then((result) => {
          if (result.error) throw new Error(result.error.message);
          return (result.data ?? []) as unknown as readonly GamificationLedgerEvent[];
        });
  const [events, counters, participantResult] = await Promise.all([
    eventsPromise,
    loadGamificationUserCounters(supabase, userId),
    supabase
      .from("action_participants")
      .select("action_id")
      .eq("user_id", userId)
      .eq("participation_status", "confirmed")
      .limit(6000),
  ]);

  const actionRows = await actionRowsPromise;
  const validatedActionIds = await loadCurrentValidatedActionIdsForUser(supabase, userId, {
    actionRows,
  });
  if (participantResult.error) throw new Error(participantResult.error.message);
  const confirmedParticipantActionIds = new Set(
    (participantResult.data ?? [])
      .map((row) => (row as { action_id?: string | null }).action_id)
      .filter((actionId): actionId is string => Boolean(actionId)),
  );

  return projectUserProgressionStats({
    actionRows,
    events,
    counters,
    validatedActionIds,
    confirmedParticipantActionIds,
  });
}
