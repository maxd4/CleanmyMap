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
  type GamificationReconciliationProfile,
  type GamificationReconciliationPlan,
} from "./gamification-reconciliation-plan";
import {
  buildGamificationReconciliationReceipt,
  persistGamificationReconciliationReceipt,
  type GamificationReconciliationReasonCategory,
  type GamificationReconciliationReceipt,
} from "./gamification-reconciliation-receipt";

export type GamificationReconciliationResult = {
  inserted: number;
  updated: number;
  removed: number;
  preservedLegacy: number;
  expectedEvents: number;
  expectedBadges: string[];
  plan: GamificationReconciliationPlan;
  receipt: GamificationReconciliationReceipt | null;
};

async function loadReconciliationProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<GamificationReconciliationProfile | null> {
  const result = await supabase
    .from("progression_profiles")
    .select("current_level")
    .eq("user_id", userId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data as GamificationReconciliationProfile | null;
}

async function insertExpectedEvents(
  supabase: SupabaseClient,
  userId: string,
  expected: ReturnType<typeof computeExpectedGamificationState>["events"],
  plan: GamificationReconciliationPlan,
): Promise<number> {
  let inserted = 0;
  const idsToAdd = new Set(plan.eventsToAdd.map((change) => change.logicalId));
  for (const event of expected.filter((candidate) => idsToAdd.has(candidate.logicalId))) {
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
  return inserted;
}

async function updateExpectedEvents(
  supabase: SupabaseClient,
  expected: ReturnType<typeof computeExpectedGamificationState>["events"],
  changes: GamificationReconciliationPlan["eventsToUpdate"],
): Promise<number> {
  let updated = 0;
  for (const change of changes) {
    const event = expected.find((candidate) => candidate.logicalId === change.logicalId);
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
  return updated;
}

async function removeCurrentEvents(
  supabase: SupabaseClient,
  changes: GamificationReconciliationPlan["eventsToRemove"],
): Promise<void> {
  for (const change of changes) {
    const result = await supabase.from("progression_events").delete().eq("id", change.id);
    if (result.error) throw new Error(result.error.message);
  }
}

/** Rebuilds CURRENT derived events from canonical facts; LEGACY rows are untouched. */
export async function reconcileUserGamification(
  supabase: SupabaseClient,
  userId: string,
  options: {
    facts?: GamificationFacts;
    rules?: GamificationRulesV1;
    refreshProfile?: boolean;
    persistReceipt?: boolean;
    reasonCategory?: GamificationReconciliationReasonCategory;
  } = {},
): Promise<GamificationReconciliationResult> {
  const rules = options.rules ?? GAMIFICATION_RULES_V1;
  const facts = options.facts ?? await loadCurrentGamificationFacts(supabase, userId);
  const expected = computeExpectedGamificationState(userId, facts, rules);
  const [persisted, profileBefore] = await Promise.all([
    loadPersistedGamificationEvents(supabase, userId),
    options.refreshProfile === false
      ? Promise.resolve(null)
      : loadReconciliationProfile(supabase, userId),
  ]);
  const plan = buildGamificationReconciliationPlan({
    userId,
    rules,
    expected,
    persisted,
    profile: profileBefore,
  });

  const inserted = await insertExpectedEvents(supabase, userId, expected.events, plan);
  const updated = await updateExpectedEvents(supabase, expected.events, plan.eventsToUpdate);
  await removeCurrentEvents(supabase, plan.eventsToRemove);

  if (options.refreshProfile !== false) {
    const { refreshProgressionProfile } = await import("./progression-tracking");
    await refreshProgressionProfile(supabase, userId, { reconcileLegacyImpact: false });
  }

  const profileAfter = options.refreshProfile === false
    ? profileBefore
    : await loadReconciliationProfile(supabase, userId);
  const receiptPlan = profileAfter && profileAfter.current_level !== plan.levelAfter
    ? { ...plan, levelAfter: profileAfter.current_level }
    : plan;
  const receipt = buildGamificationReconciliationReceipt(receiptPlan, {
    reasonCategory: options.reasonCategory,
  });
  if (options.persistReceipt !== false && receipt.hasUserVisibleChanges) {
    await persistGamificationReconciliationReceipt(supabase, receipt);
  }

  return {
    inserted,
    updated,
    removed: plan.eventsToRemove.length,
    preservedLegacy: plan.legacyEventCountPreserved,
    expectedEvents: expected.events.length,
    expectedBadges: expected.expectedBadges,
    plan: receiptPlan,
    receipt: receipt.hasUserVisibleChanges ? receipt : null,
  };
}
