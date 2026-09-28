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

const BASE_CURRENT_PROGRESSION_IDS = [
  "participation",
  "organisation",
  "exploration",
  "clean_zones",
  "regularity",
  "versatility",
  "learning",
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

function progressionTiersFromLearning(
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

function progressionTiersFromBadgeFamily(
  tiers: readonly { id: string; label: string; threshold: number }[],
) {
  return tiers.map((tier) => ({
    id: tier.id,
    title: tier.label,
    threshold: tier.threshold,
  }));
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

export async function loadGamificationCatalog(
  supabase: SupabaseClient,
  userId: string,
  options?: {
    actionRows?: ActionRow[];
    progressionEvents?: Promise<readonly GamificationLedgerEvent[]>;
  },
): Promise<GamificationCatalogItem[]> {
  const actionRowsPromise = options?.actionRows
    ? Promise.resolve(options.actionRows)
    : loadActionRowsForUser(supabase, userId);
  const progressionEventsPromise =
    options?.progressionEvents ?? loadGamificationLedgerEvents(supabase, userId);
  const [counters, cleanZoneSources, learning, regularity, balance, referral, eventsResult, identity] =
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
      loadReferralSummary(supabase, userId),
      progressionEventsPromise,
      getCurrentUserIdentity({ userId }).catch(() => null),
    ]);

  const events = asMilestoneEvents(eventsResult).map((event) => ({
    event_type: event.event_type as ProgressionEventType,
    status_phase: event.status_phase as ProgressionStatusPhase,
    source_id: event.source_id,
    xp_awarded: Number(event.xp_awarded) || 0,
    occurred_on: event.occurred_on ?? null,
    metadata: event.metadata ?? null,
  }));
  const milestones = buildCurrentMilestones({
    completeActionsCount: counters.completeActionsCount,
    events,
  });

  const progressionFacts: Record<string, GamificationCatalogProgressionFact> = {
    participation: {
      currentValue: counters.participationCount,
      started: counters.participationCount > 0,
      tiers: progressionTiersFromBadgeFamily(PARTICIPANT_TIERS),
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
      tiers: progressionTiersFromBadgeFamily(CLEAN_ZONES_TIERS),
      continuationTitle: continuationTitleFromTiers(CLEAN_ZONES_TIERS),
    },
    regularity: {
      currentValue: regularity.activeMonthsTotal,
      started: regularity.activeMonthsTotal > 0,
      tiers: progressionTiersFromGemConfig(
        MONTHLY_REGULARITY_GEM_CONFIG,
        regularity.activeMonthsTotal,
      ),
    },
    versatility: {
      currentValue: balance.balancedCycles,
      started: balance.totalValidated > 0,
      tiers: progressionTiersFromGemConfig(ACTION_BALANCE_GEM_CONFIG, balance.balancedCycles),
    },
    learning: {
      currentValue: learning.totalCorrectAnswers,
      started: learning.totalCorrectAnswers > 0,
      tiers: progressionTiersFromLearning(learning.tiers),
      continuationTitle: (threshold) => `${threshold} réponses justes`,
    },
  };

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
  });
}
