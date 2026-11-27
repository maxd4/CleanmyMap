import type { loadGamificationUserCounters } from "./counters";
import { ACTION_BALANCE_GEM_CONFIG } from "./action-balance-calculation";
import type { loadActionBalanceSummary } from "./action-balance";
import { CLEAN_ZONES_TIERS, EXPLORER_TIERS, PARTICIPANT_TIERS } from "../badges/families";
import type { loadCleanZoneSourcesForUser } from "../badges/listing";
import type { loadQuizLearningProgression } from "./quiz-learning-progression";
import { MONTHLY_REGULARITY_GEM_CONFIG, type computeMonthlyRegularitySummary } from "./monthly-regularity";
import { buildInfiniteGemGradeCatalog, ORGANISATION_GEM_CONFIG, MODERATION_GEM_CONFIG } from "./gem-progression";
import { PRODUCT_FEEDBACK_THRESHOLDS } from "./gamification-feedback-facts";
import { CURRENT_INFINITE_PROGRESSION_IDS } from "./gamification-contract-types";
import type { GamificationCatalogProgressionFact } from "./gamification-catalog";

export type CatalogProgressionInputs = {
  counters: Awaited<ReturnType<typeof loadGamificationUserCounters>>;
  cleanZoneSources: Awaited<ReturnType<typeof loadCleanZoneSourcesForUser>>;
  learning: Awaited<ReturnType<typeof loadQuizLearningProgression>>;
  regularity: ReturnType<typeof computeMonthlyRegularitySummary>;
  balance: Awaited<ReturnType<typeof loadActionBalanceSummary>>;
  cartographyCount: number;
  productFeedbackCount?: number;
};

export const BASE_CURRENT_PROGRESSION_IDS = CURRENT_INFINITE_PROGRESSION_IDS.filter((id) => id !== "moderation");

const CARTOGRAPHY_TIERS = [
  { id: "premiere-contribution", label: "Première contribution", threshold: 1 },
  { id: "cartographe-5", label: "Cartographe 5", threshold: 5 },
  { id: "cartographe-10", label: "Cartographe 10", threshold: 10 },
  { id: "cartographe-25", label: "Cartographe 25", threshold: 25 },
] as const;

const PRODUCT_FEEDBACK_TIER_LABELS: Record<number, string> = {
  1: "Premier retour",
  5: "Retour engagé",
  10: "Voix du produit",
};

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

function buildPrimaryProgressionFacts({
  counters,
  cleanZoneSources,
  cartographyCount,
  productFeedbackCount,
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
    product_feedback: {
      currentValue: productFeedbackCount ?? 0,
      started: (productFeedbackCount ?? 0) > 0,
      tiers: PRODUCT_FEEDBACK_THRESHOLDS.map((threshold) => ({
        id: `product-feedback-${threshold}`,
        title: PRODUCT_FEEDBACK_TIER_LABELS[threshold] ?? `Retour accepté ${threshold}`,
        threshold,
      })),
      continuationTitle: (threshold: number) => `Retour accepté ${threshold}`,
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

export function buildModerationCatalogFact(currentValue: number): GamificationCatalogProgressionFact {
  return {
    currentValue,
    started: currentValue > 0,
    tiers: progressionTiersFromGemConfig(MODERATION_GEM_CONFIG, currentValue),
  };
}
