import {
  CURRENT_INFINITE_PROGRESSIONS,
  CURRENT_MILESTONES,
} from "./progression-utils";
import type {
  CurrentInfiniteProgressionId,
  GamificationCategory,
  GamificationMilestoneState,
  GamificationXpPolicy,
  MilestoneDefinition,
} from "./progression-types";
import {
  CURRENT_GAMIFICATION_RULES_REVISION,
} from "./progression-types";

export type GamificationCatalogState = "not_started" | "in_progress" | "completed";

type GamificationCatalogTier = {
  id: string;
  title: string;
  threshold: number;
  achieved: boolean;
};

type CatalogTierInput = Omit<GamificationCatalogTier, "achieved">;

export type GamificationCatalogProgressionFact = {
  currentValue: number;
  started: boolean;
  tiers: readonly CatalogTierInput[];
  continuationTitle?: (threshold: number) => string;
};

type GamificationCatalogMilestoneFact = {
  achieved: boolean;
  achievedAt: string | null;
  progressCurrent?: number;
  progressTarget?: number;
  progressPercent?: number;
};

export type GamificationCatalogItem = {
  id: string;
  kind: "progression" | "milestone";
  category: Exclude<GamificationCategory, "NON_GAMIFIED">;
  title: string;
  description: string;
  grantsXp: boolean;
  xpAmountOrPolicy: GamificationXpPolicy;
  applicability: "applicable";
  state: GamificationCatalogState;
  introducedInRulesRevision: number;
  isNewSinceLastRulesMigration: boolean;
  progression?: {
    currentValue: number;
    currentTier: GamificationCatalogTier;
    currentTierAchieved: boolean;
    nextTier: GamificationCatalogTier;
    nextThreshold: number;
    progressPercent: number;
    previousTiers: GamificationCatalogTier[];
  };
  milestone?: {
    achieved: boolean;
    achievedAt: string | null;
    progressCurrent?: number;
    progressTarget?: number;
    progressPercent?: number;
  };
};

export type GamificationCatalogInput = {
  progressions: Partial<
    Record<CurrentInfiniteProgressionId, GamificationCatalogProgressionFact>
  >;
  milestones: Partial<Record<MilestoneDefinition["id"], GamificationCatalogMilestoneFact>>;
  applicableProgressionIds?: readonly CurrentInfiniteProgressionId[];
  applicableMilestoneIds?: readonly MilestoneDefinition["id"][];
  currentAppliedRulesRevision?: number | null;
  lastAcknowledgedRulesRevision?: number | null;
};

export function isMechanicNewSinceLastRulesMigration(
  introducedInRulesRevision: number,
  input: Pick<GamificationCatalogInput, "currentAppliedRulesRevision" | "lastAcknowledgedRulesRevision">,
): boolean {
  const currentApplied = input.currentAppliedRulesRevision ?? CURRENT_GAMIFICATION_RULES_REVISION;
  const lastAcknowledged = input.lastAcknowledgedRulesRevision ?? 0;
  return introducedInRulesRevision === currentApplied && currentApplied > lastAcknowledged;
}

function normalizeTiers(
  tiers: readonly CatalogTierInput[],
  currentValue: number,
  continuationTitle: (threshold: number) => string = (threshold) => `Palier ${threshold}`,
): CatalogTierInput[] {
  const byThreshold = new Map<number, CatalogTierInput>();
  for (const tier of tiers) {
    const threshold = Math.max(0, Math.trunc(tier.threshold));
    if (!byThreshold.has(threshold)) {
      byThreshold.set(threshold, { ...tier, threshold });
    }
  }

  if (![...byThreshold.values()].some((tier) => tier.threshold === 0)) {
    byThreshold.set(0, {
      id: "observateur",
      title: "Observateur",
      threshold: 0,
    });
  }

  const normalized = [...byThreshold.values()].sort(
    (left, right) => left.threshold - right.threshold,
  );
  const lastThreshold = normalized.at(-1)?.threshold ?? 0;
  let nextThreshold = lastThreshold;
  while (nextThreshold <= currentValue) {
    nextThreshold += 5;
    normalized.push({
      id: `tier-${nextThreshold}`,
      title: continuationTitle(nextThreshold),
      threshold: nextThreshold,
    });
  }
  return normalized;
}

function buildProgressionItem(
  definition: (typeof CURRENT_INFINITE_PROGRESSIONS)[number],
  fact: GamificationCatalogProgressionFact,
  migrationState: Pick<GamificationCatalogInput, "currentAppliedRulesRevision" | "lastAcknowledgedRulesRevision">,
): GamificationCatalogItem {
  const currentValue = Math.max(0, Math.trunc(Number(fact.currentValue) || 0));
  const tiers = normalizeTiers(fact.tiers, currentValue, fact.continuationTitle);
  const completedTiers = tiers.filter(
    (tier) => tier.threshold > 0 && tier.threshold <= currentValue,
  );
  const currentTierInput = completedTiers.at(-1) ?? tiers[0]!;
  const nextTierInput = tiers.find(
    (tier) => tier.threshold > currentTierInput.threshold && tier.threshold > currentValue,
  ) ?? tiers[tiers.length - 1]!;
  const currentTierAchieved =
    currentTierInput.threshold > 0 && fact.started && currentValue >= currentTierInput.threshold;
  const currentTier: GamificationCatalogTier = {
    ...currentTierInput,
    achieved: currentTierAchieved,
  };
  const nextTier: GamificationCatalogTier = {
    ...nextTierInput,
    achieved: false,
  };
  const span = Math.max(1, nextTier.threshold - currentTier.threshold);
  const progressPercent = Math.round(
    (Math.max(0, Math.min(currentValue - currentTier.threshold, span)) / span) * 100,
  );
  const previousTiers = tiers
    .filter(
      (tier) =>
        tier.threshold > 0 &&
        tier.threshold < currentTier.threshold &&
        tier.threshold <= currentValue,
    )
    .map((tier) => ({ ...tier, achieved: true }));

  return {
    id: definition.id,
    kind: "progression",
    category: definition.category,
    title: definition.label,
    description: definition.description,
    grantsXp: definition.xpPolicy.kind !== "none",
    xpAmountOrPolicy: definition.xpPolicy,
    applicability: "applicable",
    state: fact.started ? "in_progress" : "not_started",
    introducedInRulesRevision: definition.introducedInRulesRevision,
    isNewSinceLastRulesMigration: isMechanicNewSinceLastRulesMigration(
      definition.introducedInRulesRevision,
      migrationState,
    ),
    progression: {
      currentValue,
      currentTier,
      currentTierAchieved,
      nextTier,
      nextThreshold: nextTier.threshold,
      progressPercent,
      previousTiers,
    },
  };
}

function buildMilestoneItem(
  definition: (typeof CURRENT_MILESTONES)[number],
  fact: GamificationCatalogMilestoneFact,
  migrationState: Pick<GamificationCatalogInput, "currentAppliedRulesRevision" | "lastAcknowledgedRulesRevision">,
): GamificationCatalogItem {
  const hasProgress =
    fact.progressCurrent !== undefined && fact.progressTarget !== undefined;
  const state: GamificationCatalogState = fact.achieved
    ? "completed"
    : hasProgress && fact.progressCurrent! > 0
      ? "in_progress"
      : "not_started";

  return {
    id: definition.id,
    kind: "milestone",
    category: definition.category,
    title: definition.label,
    description: definition.description,
    grantsXp: definition.xpPolicy.kind !== "none",
    xpAmountOrPolicy: definition.xpPolicy,
    applicability: "applicable",
    state,
    introducedInRulesRevision: definition.introducedInRulesRevision,
    isNewSinceLastRulesMigration: isMechanicNewSinceLastRulesMigration(
      definition.introducedInRulesRevision,
      migrationState,
    ),
    milestone: {
      achieved: fact.achieved,
      achievedAt: fact.achievedAt,
      ...(hasProgress
        ? {
            progressCurrent: fact.progressCurrent,
            progressTarget: fact.progressTarget,
            progressPercent:
              fact.progressPercent ??
              Math.round(
                (Math.max(0, fact.progressCurrent!) /
                  Math.max(1, fact.progressTarget!)) *
                  100,
              ),
          }
        : {}),
    },
  };
}

export function buildGamificationCatalog(
  input: GamificationCatalogInput,
): GamificationCatalogItem[] {
  const applicableProgressions = new Set(
    input.applicableProgressionIds ?? CURRENT_INFINITE_PROGRESSIONS.map((item) => item.id),
  );
  const applicableMilestones = new Set(
    input.applicableMilestoneIds ?? CURRENT_MILESTONES.map((item) => item.id),
  );
  const catalog: GamificationCatalogItem[] = [];

  for (const definition of CURRENT_INFINITE_PROGRESSIONS) {
    if (!applicableProgressions.has(definition.id)) continue;
    const fact = input.progressions[definition.id];
    if (!fact) {
      throw new Error(`Fait manquant pour la progression CURRENT ${definition.id}.`);
    }
    catalog.push(buildProgressionItem(definition, fact, input));
  }

  for (const definition of CURRENT_MILESTONES) {
    if (!applicableMilestones.has(definition.id)) continue;
    const fact = input.milestones[definition.id];
    if (!fact) {
      throw new Error(`Fait manquant pour le jalon CURRENT ${definition.id}.`);
    }
    catalog.push(buildMilestoneItem(definition, fact, input));
  }

  return catalog;
}

export function milestoneFactsFromStates(
  states: readonly GamificationMilestoneState[],
  referralSummary?: { invitedUsersCount: number },
): GamificationCatalogInput["milestones"] {
  return Object.fromEntries(
    states.map((state) => [
      state.id,
      {
        achieved: state.unlocked,
        achievedAt: state.achievedAt,
        ...(state.id === "parrainage_utile" && referralSummary && !state.unlocked
          ? {
              progressCurrent: Math.min(1, Math.max(0, referralSummary.invitedUsersCount)),
              progressTarget: 1,
            }
          : {}),
      },
    ]),
  );
}
