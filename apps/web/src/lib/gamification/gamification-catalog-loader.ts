import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserIdentity } from "@/lib/authz";
import { loadGamificationUserCounters } from "./counters";
import {
  ACTION_BALANCE_GEM_CONFIG,
  type ActionBalanceRow,
} from "./action-balance-calculation";
import { loadActionBalanceSummary } from "./action-balance";
import {
  CLEAN_ZONES_TIERS,
  EXPLORER_TIERS,
  PARTICIPANT_TIERS,
} from "./badges/families";
import { loadCleanZoneSourcesForUser } from "./badges/listing";
import { loadReferralSummary } from "./referrals/referrals";
import { loadQuizLearningProgression } from "./quiz-learning-progression";
import {
  MONTHLY_REGULARITY_GEM_CONFIG,
  computeMonthlyRegularitySummary,
} from "./monthly-regularity";
import {
  buildInfiniteGemGradeCatalog,
  ORGANISATION_GEM_CONFIG,
  MODERATION_GEM_CONFIG,
} from "./gem-progression";
import {
  canViewModerationProgression,
  loadResolvedModerationCasesForUser,
} from "./moderation-progression";
import { buildCurrentMilestones, type MilestoneEvent } from "./milestones";
import {
  buildGamificationCatalog,
  milestoneFactsFromStates,
  type GamificationCatalogItem,
  type GamificationCatalogProgressionFact,
} from "./gamification-catalog";
import { loadActionRowsForUser } from "./progression-data";
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

type CatalogProgressionEvent = MilestoneEvent & { source_table: string };

export type CatalogProgressionInputs = {
  counters: Awaited<ReturnType<typeof loadGamificationUserCounters>>;
  cleanZoneSources: Awaited<ReturnType<typeof loadCleanZoneSourcesForUser>>;
  learning: Awaited<ReturnType<typeof loadQuizLearningProgression>>;
  regularity: ReturnType<typeof computeMonthlyRegularitySummary>;
  balance: Awaited<ReturnType<typeof loadActionBalanceSummary>>;
  cartographyCount: number;
};

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

const BASE_CURRENT_PROGRESSION_IDS = [
  "participation",
  "organisation",
  "exploration",
  "clean_zones",
  "regularity",
  "versatility",
  "learning",
  "cartography",
] as const;

const CARTOGRAPHY_TIERS = [
  { id: "premiere-contribution", label: "Première contribution", threshold: 1 },
  { id: "cartographe-5", label: "Cartographe 5", threshold: 5 },
  { id: "cartographe-10", label: "Cartographe 10", threshold: 10 },
  { id: "cartographe-25", label: "Cartographe 25", threshold: 25 },
] as const;

function progressionTiersFromGemConfig(
  config: Parameters<typeof buildInfiniteGemGradeCatalog>[1],
  currentValue: number,
) {
  return buildInfiniteGemGradeCatalog(currentValue, config).map((grade) => ({
    id: grade.id,
    title: grade.label,
    threshold: grade.threshold,
  }));
}

function progressionTiersFromLabeled(
  tiers: readonly { id: string; label: string; threshold: number }[],
) {
  return tiers.map((tier) => ({
    id: tier.id,
    title: tier.label,
    threshold: tier.threshold,
  }));
}

function progressionTiersFromExplorer() {
  return EXPLORER_TIERS.map((tier) => ({
    id: tier.id,
    title: tier.title,
    threshold: tier.min,
  }));
}

function continuationTitleFromTiers(
  tiers: readonly { title?: string; label?: string }[],
): (threshold: number) => string {
  return () => tiers.at(-1)?.title ?? tiers.at(-1)?.label ?? "Observateur";
}

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

function buildPrimaryProgressionFacts({
  counters,
  cleanZoneSources,
  cartographyCount,
}: CatalogProgressionInputs): Record<string, GamificationCatalogProgressionFact> {
  return {
    participation: {
      currentValue: counters.participationCount,
      started: counters.participationCount > 0,
      tiers: progressionTiersFromLabeled(PARTICIPANT_TIERS),
      continuationTitle: continuationTitleFromTiers(PARTICIPANT_TIERS),
    },
    organisation: {
      currentValue: counters.completeActionsCount,
      started: counters.completeActionsCount > 0,
      tiers: progressionTiersFromGemConfig(ORGANISATION_GEM_CONFIG, counters.completeActionsCount),
    },
    exploration: {
      currentValue: counters.visitedPlacesCount,
      started: counters.visitedPlacesCount > 0,
      tiers: progressionTiersFromExplorer(),
      continuationTitle: continuationTitleFromTiers(EXPLORER_TIERS),
    },
    clean_zones: {
      currentValue: cleanZoneSources.length,
      started: cleanZoneSources.length > 0,
      tiers: progressionTiersFromLabeled(CLEAN_ZONES_TIERS),
      continuationTitle: continuationTitleFromTiers(CLEAN_ZONES_TIERS),
    },
    cartography: {
      currentValue: cartographyCount,
      started: cartographyCount > 0,
      tiers: progressionTiersFromLabeled(CARTOGRAPHY_TIERS),
      continuationTitle: (threshold: number) => `Cartographe ${threshold}`,
    },
  };
}

function buildSecondaryProgressionFacts({
  regularity,
  balance,
}: CatalogProgressionInputs): Record<string, GamificationCatalogProgressionFact> {
  return {
    regularity: {
      currentValue: regularity.activeMonthsTotal,
      started: regularity.activeMonthsTotal > 0,
      tiers: progressionTiersFromGemConfig(MONTHLY_REGULARITY_GEM_CONFIG, regularity.activeMonthsTotal),
    },
    versatility: {
      currentValue: balance.balancedCycles,
      started: balance.totalValidated > 0,
      tiers: progressionTiersFromGemConfig(ACTION_BALANCE_GEM_CONFIG, balance.balancedCycles),
    },
  };
}

export function buildProgressionFacts(
  input: CatalogProgressionInputs,
): Record<string, GamificationCatalogProgressionFact> {
  return {
    ...buildPrimaryProgressionFacts(input),
    ...buildSecondaryProgressionFacts(input),
    learning: {
      currentValue: input.learning.totalCorrectAnswers,
      started: input.learning.totalCorrectAnswers > 0,
      tiers: progressionTiersFromLabeled(input.learning.tiers),
      continuationTitle: (threshold: number) => `${threshold} réponses justes`,
    },
  } satisfies Record<string, GamificationCatalogProgressionFact>;
}

async function loadCatalogDependencies(
  supabase: SupabaseClient,
  userId: string,
  options?: GamificationCatalogOptions,
): Promise<CatalogLoadedData> {
  const actionRowsPromise = options?.actionRows
    ? Promise.resolve(options.actionRows)
    : loadActionRowsForUser(supabase, userId);
  const [counters, cleanZoneSources, learning, regularity, balance, cartographyResult, referral, eventsResult, identity, rulesMigrationState] =
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
    progressionFacts.moderation = {
      currentValue: resolvedCases.length,
      started: resolvedCases.length > 0,
      tiers: progressionTiersFromGemConfig(MODERATION_GEM_CONFIG, resolvedCases.length),
    };
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
