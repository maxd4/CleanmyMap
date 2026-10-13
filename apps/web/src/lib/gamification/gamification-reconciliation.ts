import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCurrentGamificationFacts } from "./gamification-facts-loader";
import { GAMIFICATION_RULES_V1, type GamificationRulesV1 } from "./gamification-rules";
import { loadUserProgressionStats } from "./progression-data";
import { computePotentialLevel } from "./progression-formulas";
import { broadcastGamificationAnnouncement } from "./announcements";
import {
  computeExpectedGamificationState,
  type GamificationFacts,
} from "./gamification-reconstruction";
import {
  buildGamificationReconciliationPlan,
  loadPersistedGamificationEvents,
  type GamificationReconciliationPlan,
  type GamificationReconciliationProfile,
  type PersistedGamificationEvent,
} from "./gamification-reconciliation-plan";
import {
  buildGamificationReconciliationReceipt,
  type GamificationReconciliationReasonCategory,
  type GamificationReconciliationReceipt,
} from "./gamification-reconciliation-receipt";
import {
  loadReconciliationProfile,
} from "./gamification-reconciliation-profile";

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

class GamificationReconciliationConflictError extends Error {
  constructor() {
    super("La réconciliation XP a rencontré une révision concurrente et doit être rejouée.");
    this.name = "GamificationReconciliationConflictError";
  }
}

function persistedEventSnapshot(events: readonly PersistedGamificationEvent[]): Array<Record<string, unknown>> {
  return [...events]
    .sort((left, right) => Number(left.id) - Number(right.id))
    .map((event) => ({
      id: Number(event.id),
      event_type: event.event_type,
      source_table: event.source_table,
      source_id: event.source_id,
      status_phase: event.status_phase,
      weight: Number(event.weight),
      xp_base: Number(event.xp_base),
      xp_awarded: Number(event.xp_awarded),
      occurred_on: event.occurred_on,
      metadata: event.metadata ?? {},
    }));
}

function eventPayload(event: ReturnType<typeof computeExpectedGamificationState>["events"]) {
  return event.map((candidate) => ({
    event_type: candidate.eventType,
    source_table: candidate.sourceTable,
    source_id: candidate.sourceId,
    status_phase: candidate.statusPhase,
    weight: candidate.weight,
    xp_base: candidate.xpBase,
    xp_awarded: candidate.xpAwarded,
    occurred_on: candidate.occurredOn,
    metadata: candidate.metadata,
  }));
}

function sumProjectedEvents(
  legacy: readonly PersistedGamificationEvent[],
  expected: ReturnType<typeof computeExpectedGamificationState>["events"],
): { total: number; pending: number; validated: number } {
  const rows = [
    ...legacy.map((event) => ({ status_phase: event.status_phase, xp_awarded: Number(event.xp_awarded) || 0 })),
    ...expected.map((event) => ({ status_phase: event.statusPhase, xp_awarded: event.xpAwarded })),
  ];
  return rows.reduce(
    (totals, row) => {
      totals.total += row.xp_awarded;
      if (row.status_phase === "pending") totals.pending += row.xp_awarded;
      if (row.status_phase === "validated") totals.validated += row.xp_awarded;
      return totals;
    },
    { total: 0, pending: 0, validated: 0 },
  );
}

function profileUpdate(
  plan: GamificationReconciliationPlan,
  persisted: readonly PersistedGamificationEvent[],
): Record<string, number> {
  const currentIds = new Set(plan.currentPersisted.map((event) => String(event.id)));
  const legacy = persisted.filter((event) => !currentIds.has(String(event.id)));
  const totals = sumProjectedEvents(legacy, plan.expected.events);
  return {
    xp_total: totals.total,
    xp_pending: totals.pending,
    xp_validated: totals.validated,
    current_level: plan.levelAfter ?? 1,
    potential_level: computePotentialLevel(totals.validated),
    current_applied_rules_revision: plan.rulesRevisionAfter,
  };
}

function changedExpectedEvents(
  expected: ReturnType<typeof computeExpectedGamificationState>["events"],
  changes: GamificationReconciliationPlan["eventsToAdd"],
) {
  const ids = new Set(changes.map((change) => change.logicalId));
  return expected.filter((event) => ids.has(event.logicalId));
}

async function applyReconciliationTransaction(
  supabase: SupabaseClient,
  userId: string,
  persisted: readonly PersistedGamificationEvent[],
  plan: GamificationReconciliationPlan,
  receipt: GamificationReconciliationReceipt,
  profileBefore: GamificationReconciliationProfile | null,
  refreshProfile: boolean,
): Promise<{ inserted: number; updated: number; removed: number }> {
  const expectedByLogicalId = new Map(plan.expected.events.map((event) => [event.logicalId, event]));
  const updates = plan.eventsToUpdate.flatMap((change) => {
    const event = expectedByLogicalId.get(change.logicalId);
    if (!event || change.id === undefined) return [];
    return [{
      id: Number(change.id),
      event_type: event.eventType,
      source_table: event.sourceTable,
      source_id: event.sourceId,
      status_phase: event.statusPhase,
      weight: event.weight,
      xp_base: event.xpBase,
      xp_awarded: event.xpAwarded,
      occurred_on: event.occurredOn,
      metadata: event.metadata,
    }];
  });
  const response = await supabase.rpc("apply_gamification_reconciliation", {
    p_user_id: userId,
    p_expected_events: persistedEventSnapshot(persisted),
    p_events_to_add: eventPayload(changedExpectedEvents(plan.expected.events, plan.eventsToAdd)),
    p_events_to_update: updates,
    p_events_to_remove: plan.eventsToRemove
      .map((change) => Number(change.id))
      .filter((id) => Number.isSafeInteger(id)),
    p_expected_profile_updated_at: refreshProfile ? profileBefore?.updated_at ?? null : null,
    p_profile_update: refreshProfile ? profileUpdate(plan, persisted) : null,
    p_receipt: receipt.hasUserVisibleChanges ? receipt : null,
    p_level_up: refreshProfile && (plan.levelAfter ?? 1) > (plan.levelBefore ?? 1)
      ? {
          oldLevel: plan.levelBefore ?? 1,
          newLevel: plan.levelAfter ?? 1,
          reconciliationId: receipt.reconciliationId,
        }
      : null,
  });
  if (response.error) throw new Error(response.error.message);
  const result = response.data as { status?: string; inserted?: number; updated?: number; removed?: number } | null;
  if (result?.status === "conflict") throw new GamificationReconciliationConflictError();
  if (result?.status !== "applied") throw new Error("La RPC de réconciliation XP a renvoyé une réponse invalide.");
  return {
    inserted: Number(result.inserted ?? 0),
    updated: Number(result.updated ?? 0),
    removed: Number(result.removed ?? 0),
  };
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
  const refreshProfile = options.refreshProfile !== false;
  let stableReconciliationId: string | undefined;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const facts = options.facts ?? await loadCurrentGamificationFacts(supabase, userId);
    const expected = computeExpectedGamificationState(userId, facts, rules);
    const [persisted, profileBefore, stats] = await Promise.all([
      loadPersistedGamificationEvents(supabase, userId),
      refreshProfile ? loadReconciliationProfile(supabase, userId) : Promise.resolve(null),
      refreshProfile ? loadUserProgressionStats(supabase, userId) : Promise.resolve(null),
    ]);
    const plan = buildGamificationReconciliationPlan({
      userId,
      rules,
      expected,
      persisted,
      profile: profileBefore,
      stats,
    });
    const receipt = buildGamificationReconciliationReceipt(plan, {
      reasonCategory: options.reasonCategory,
      rules,
      ...(stableReconciliationId ? { reconciliationId: stableReconciliationId } : {}),
    });
    stableReconciliationId ??= receipt.reconciliationId;

    try {
      const applied = await applyReconciliationTransaction(
        supabase,
        userId,
        persisted,
        plan,
        receipt,
        profileBefore,
        refreshProfile,
      );

      if (refreshProfile && (plan.levelAfter ?? 1) > (plan.levelBefore ?? 1)) {
        await broadcastGamificationAnnouncement(supabase, {
          type: "level_up",
          userId,
          previousLevel: plan.levelBefore ?? 1,
          newLevel: plan.levelAfter ?? 1,
          title: "Niveau Supérieur ! 🏆",
          message: `Félicitations ! Vous avez atteint le niveau ${plan.levelAfter}. Votre impact sur CleanMyMap grandit !`,
          icon: "🏆",
          source: "progression-tracking",
          dedupeKey: `level_up:${userId}:${plan.levelAfter}`,
        });
      }

      return {
        ...applied,
        preservedLegacy: plan.legacyEventCountPreserved,
        expectedEvents: expected.events.length,
        expectedBadges: expected.expectedBadges,
        plan,
        receipt: receipt.hasUserVisibleChanges ? receipt : null,
      };
    } catch (error) {
      if (!(error instanceof GamificationReconciliationConflictError) || attempt === 2) throw error;
    }
  }

  throw new Error("La réconciliation XP n'a pas pu converger après trois tentatives.");
}
