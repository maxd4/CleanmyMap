import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserIdentity } from "@/lib/authz";
import { loadGamificationUserCounters } from "./counters";
import {
  type ActionBalanceRow,
} from "./action-balance-calculation";
import { loadActionBalanceSummary } from "./action-balance";
import { loadCleanZoneSourcesForUser } from "../badges/listing";
import { loadReferralSummary } from "../referrals/referrals";
import { loadQuizLearningProgression } from "./quiz-learning-progression";
import {
  computeMonthlyRegularitySummary,
} from "./monthly-regularity";
import {
  canViewModerationProgression,
  loadResolvedModerationCasesForUser,
} from "./moderation-progression";
import { buildCurrentMilestones, type MilestoneEvent } from "./milestones";
import {
  buildGamificationCatalog,
  milestoneFactsFromStates,
  type GamificationCatalogItem,
} from "./gamification-catalog";
import { loadActionRowsForUser } from "../progression-data";
import {
  loadProductFeedbackFacts,
} from "./gamification-feedback-facts";
import type {
  ActionRow,
  CurrentInfiniteProgressionId,
  ProgressionEventType,
  ProgressionStatusPhase,
} from "./progression-types";
import {
  loadGamificationLedgerEvents,
  type GamificationLedgerEvent,
} from "./gamification-summary-loader";

import { BASE_CURRENT_PROGRESSION_IDS, buildProgressionFacts, buildModerationCatalogFact, type CatalogProgressionInputs } from "./gamification-catalog-progression-facts";
export { buildProgressionFacts, type CatalogProgressionInputs } from "./gamification-catalog-progression-facts";

type CatalogProgressionEvent = MilestoneEvent & { source_table: string };

type GamificationCatalogOptions = {
  actionRows?: ActionRow[];
  progressionEvents?: Promise<readonly GamificationLedgerEvent[]>;
  rulesMigrationState?: GamificationRulesMigrationState | Promise<GamificationRulesMigrationState>;
};

type CatalogLoadedData = CatalogProgressionInputs & {
  referral: Awaited<ReturnType<typeof loadReferralSummary>>;
  eventsResult: readonly GamificationLedgerEvent[];
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>;
  rulesMigrationState: GamificationRulesMigrationState;
};

export type GamificationRulesMigrationState = {
  currentAppliedRulesRevision: number | null;
  lastAcknowledgedRulesRevision: number | null;
};

function asMilestoneEvents(rows: unknown): CatalogProgressionEvent[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter((row): row is CatalogProgressionEvent => {
    if (!row || typeof row !== "object") return false;
    const value = row as Partial<CatalogProgressionEvent>;
    return (
      typeof value.event_type === "string" &&
      typeof value.status_phase === "string" &&
      typeof value.source_id === "string" &&
      typeof value.source_table === "string"
    );
  });
}

function actionRowsAsBalanceRows(rows: readonly ActionRow[]): ActionBalanceRow[] {
  return rows.map((row) => ({
    id: row.id,
    action_date: row.action_date,
    created_at: row.created_at,
    status: row.status,
    notes: row.notes,
  }));
}

async function loadCatalogDependencies(
  supabase: SupabaseClient,
  userId: string,
  options?: GamificationCatalogOptions,
): Promise<CatalogLoadedData> {
  const actionRowsPromise = options?.actionRows
    ? Promise.resolve(options.actionRows)
    : loadActionRowsForUser(supabase, userId);
  const [counters, cleanZoneSources, learning, regularity, balance, cartographyResult, productFeedback, referral, eventsResult, identity, rulesMigrationState] =
    await Promise.all([
      loadGamificationUserCounters(supabase, userId),
      loadCleanZoneSourcesForUser(supabase, userId),
      loadQuizLearningProgression(supabase, userId),
      actionRowsPromise.then((rows) => computeMonthlyRegularitySummary(rows)),
      actionRowsPromise.then((rows) =>
        loadActionBalanceSummary(supabase, userId, {
          actionRows: actionRowsAsBalanceRows(rows),
        }),
      ),
      supabase
        .from("action_geometry_contributions")
        .select("action_id")
        .eq("contributor_clerk_id", userId)
        .eq("validation_state", "accepted")
        .limit(10000),
      loadProductFeedbackFacts(supabase, userId),
      loadReferralSummary(supabase, userId),
      options?.progressionEvents ?? loadGamificationLedgerEvents(supabase, userId),
      getCurrentUserIdentity({ userId }).catch(() => null),
      options?.rulesMigrationState
        ? Promise.resolve(options.rulesMigrationState)
        : loadGamificationRulesMigrationState(supabase, userId),
    ]);
  if (cartographyResult.error) {
    throw new Error(cartographyResult.error.message);
  }
  return {
    counters,
    cleanZoneSources,
    learning,
    regularity,
    balance,
    cartographyCount: new Set(
      (cartographyResult.data ?? [])
        .map((row) => (row as { action_id?: string | null }).action_id)
        .filter((actionId): actionId is string => Boolean(actionId)),
    ).size,
    productFeedbackCount: productFeedback.count,
    referral,
    eventsResult,
    identity,
    rulesMigrationState,
  };
}

function buildCatalogBaseState(data: CatalogLoadedData) {
  const events = asMilestoneEvents(data.eventsResult).map((event) => ({
    event_type: event.event_type as ProgressionEventType,
    status_phase: event.status_phase as ProgressionStatusPhase,
    source_id: event.source_id,
    xp_awarded: Number(event.xp_awarded) || 0,
    occurred_on: event.occurred_on ?? null,
    metadata: event.metadata ?? null,
  }));
  const milestones = buildCurrentMilestones({
    completeActionsCount: data.counters.completeActionsCount,
    events,
  });
  const progressionFacts = buildProgressionFacts(data);
  return { milestones, progressionFacts };
}

export async function loadGamificationRulesMigrationState(
  supabase: SupabaseClient,
  userId: string,
): Promise<GamificationRulesMigrationState> {
  const result = await supabase
    .from("progression_profiles")
    .select("current_applied_rules_revision, last_acknowledged_rules_revision")
    .eq("user_id", userId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  const row = result.data as {
    current_applied_rules_revision?: number | null;
    last_acknowledged_rules_revision?: number | null;
  } | null;
  const current = Number(row?.current_applied_rules_revision);
  const acknowledged = Number(row?.last_acknowledged_rules_revision);
  const currentAppliedRulesRevision = Number.isFinite(current) && current >= 0
    ? Math.trunc(current)
    : 0;
  return {
    currentAppliedRulesRevision,
    lastAcknowledgedRulesRevision: Number.isFinite(acknowledged) && acknowledged >= 0
      ? Math.min(Math.trunc(acknowledged), currentAppliedRulesRevision)
      : 0,
  };
}

export async function loadGamificationCatalog(
  supabase: SupabaseClient,
  userId: string,
  options?: GamificationCatalogOptions,
): Promise<GamificationCatalogItem[]> {
  const {
    counters,
    cleanZoneSources,
    learning,
    regularity,
    balance,
    cartographyCount,
    productFeedbackCount,
    referral,
    eventsResult,
    identity,
    rulesMigrationState,
  } = await loadCatalogDependencies(supabase, userId, options);

  const { milestones, progressionFacts } = buildCatalogBaseState({
    counters,
    cleanZoneSources,
    learning,
    regularity,
    balance,
    cartographyCount,
    productFeedbackCount,
    referral,
    eventsResult,
    identity,
    rulesMigrationState,
  });

  const moderationApplicable = canViewModerationProgression(identity, userId);
  let applicableProgressionIds: readonly CurrentInfiniteProgressionId[] =
    BASE_CURRENT_PROGRESSION_IDS;
  let applicableMilestoneIds = milestones
    .filter((milestone) => milestone.visibility !== "authorized_moderation")
    .map((milestone) => milestone.id);

  if (moderationApplicable) {
    const resolvedCases = await loadResolvedModerationCasesForUser(supabase, userId);
    progressionFacts.moderation = buildModerationCatalogFact(resolvedCases.length);
    applicableProgressionIds = [...BASE_CURRENT_PROGRESSION_IDS, "moderation"];
    applicableMilestoneIds = milestones.map((milestone) => milestone.id);
  }

  return buildGamificationCatalog({
    progressions: progressionFacts,
    milestones: milestoneFactsFromStates(milestones, referral),
    applicableProgressionIds,
    applicableMilestoneIds,
    currentAppliedRulesRevision: rulesMigrationState.currentAppliedRulesRevision,
    lastAcknowledgedRulesRevision: rulesMigrationState.lastAcknowledgedRulesRevision,
  });
}
