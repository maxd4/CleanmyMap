import type { SupabaseClient } from "@supabase/supabase-js";
import { insertProgressionEvent } from "./progression-data";
import { loadCurrentGamificationFacts } from "./gamification-facts-loader";
import { GAMIFICATION_RULES_V1, type GamificationRulesV1 } from "./gamification-rules";
import {
  computeExpectedGamificationState,
  type GamificationFacts,
} from "./gamification-reconstruction";
import type { ProgressionEventType } from "./progression-types";
import {
  buildGamificationReconciliationPlan,
  loadPersistedGamificationEvents,
  type GamificationReconciliationPlan,
} from "./gamification-reconciliation-plan";

export type GamificationReconciliationResult = {
  inserted: number;
  updated: number;
  removed: number;
  preservedLegacy: number;
  expectedEvents: number;
  expectedBadges: string[];
  plan: GamificationReconciliationPlan;
};

/** Rebuilds CURRENT derived events from canonical facts; LEGACY rows are untouched. */
export async function reconcileUserGamification(
  supabase: SupabaseClient,
  userId: string,
  options: {
    facts?: GamificationFacts;
    rules?: GamificationRulesV1;
    refreshProfile?: boolean;
  } = {},
): Promise<GamificationReconciliationResult> {
  const rules = options.rules ?? GAMIFICATION_RULES_V1;
  const facts = options.facts ?? await loadCurrentGamificationFacts(supabase, userId);
  const expected = computeExpectedGamificationState(userId, facts, rules);
  const persisted = await loadPersistedGamificationEvents(supabase, userId);
  const plan = buildGamificationReconciliationPlan({ userId, rules, expected, persisted });

  let inserted = 0;
  for (const event of expected.events.filter((candidate) =>
    plan.eventsToAdd.some((change) => change.logicalId === candidate.logicalId),
  )) {
    const didInsert = await insertProgressionEvent(supabase, {
      userId,
      eventType: event.eventType as ProgressionEventType,
      sourceTable: event.sourceTable,
      sourceId: event.sourceId,
      statusPhase: event.statusPhase,
      weight: event.weight,
      xpBase: event.xpBase,
      xpAwarded: event.xpAwarded,
      occurredOn: event.occurredOn,
      metadata: event.metadata,
    });
    inserted += Number(didInsert);
  }

  let updated = 0;
  for (const change of plan.eventsToUpdate) {
    const event = expected.events.find((candidate) => candidate.logicalId === change.logicalId);
    if (!event) continue;
    const result = await supabase.from("progression_events").update({
      event_type: event.eventType,
      source_table: event.sourceTable,
      source_id: event.sourceId,
      status_phase: event.statusPhase,
      weight: event.weight,
      xp_base: event.xpBase,
      xp_awarded: event.xpAwarded,
      occurred_on: event.occurredOn,
      metadata: event.metadata,
    }).eq("id", change.id);
    if (result.error) throw new Error(result.error.message);
    updated += 1;
  }

  for (const change of plan.eventsToRemove) {
    const result = await supabase.from("progression_events").delete().eq("id", change.id);
    if (result.error) throw new Error(result.error.message);
  }

  if (options.refreshProfile !== false) {
    const { refreshProgressionProfile } = await import("./progression-tracking");
    await refreshProgressionProfile(supabase, userId, { reconcileLegacyImpact: false });
  }

  return {
    inserted,
    updated,
    removed: plan.eventsToRemove.length,
    preservedLegacy: plan.legacyEventCountPreserved,
    expectedEvents: expected.events.length,
    expectedBadges: expected.expectedBadges,
    plan,
  };
}
