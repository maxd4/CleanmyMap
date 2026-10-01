import {
  CURRENT_INFINITE_PROGRESSIONS,
  CURRENT_MILESTONES,
  eventFamilyMap,
  gamificationEventRegistry,
} from "./progression-utils";
import type {
  CurrentInfiniteProgressionId,
  CurrentMilestoneId,
  GamificationAwardCategory,
  GamificationBadgeReference,
  GamificationXpPolicy,
  LevelRequirementAssessment,
} from "./progression-types";
import { CURRENT_GAMIFICATION_RULES_REVISION } from "./progression-types";
import type { GamificationCatalogItem, GamificationCatalogState } from "./gamification-catalog";
import type { GamificationLedgerEvent } from "./gamification-summary-loader";
export type { GamificationLedgerEvent } from "./gamification-summary-loader";

export type GamificationSummaryNextLevel = {
  level: number;
  xpRequired: number;
  xpRemaining: number;
  frozen: boolean;
  requirements: LevelRequirementAssessment;
};

type GamificationSummaryTier = {
  id: string;
  label: string;
  threshold: number;
  achieved: boolean;
};

export type GamificationSummaryProgression = {
  id: CurrentInfiniteProgressionId;
  awardCategory: Extract<GamificationAwardCategory, "XP_PROGRESSION">;
  label: string;
  description: string;
  currentValue: number;
  metricLabel: string;
  grantsXp: boolean;
  xpContribution: number;
  currentBadge: GamificationBadgeReference | null;
  nextBadge: GamificationBadgeReference | null;
  currentTier?: GamificationSummaryTier;
  nextTier?: GamificationSummaryTier;
  previousTiers?: GamificationSummaryTier[];
  progressPercent: number;
  state: GamificationCatalogState;
  introducedInRulesRevision: number;
  isNewSinceLastRulesMigration: boolean;
};

export type GamificationSummaryMilestone = {
  id: CurrentMilestoneId;
  awardCategory: Extract<GamificationAwardCategory, "XP_MILESTONE" | "BADGE_ONLY">;
  /** Compatibility alias; use awardCategory in new consumers. */
  category: "XP_MILESTONE" | "BADGE_ONLY";
  label: string;
  description: string;
  grantsXp: boolean;
  xpAmountOrPolicy: GamificationXpPolicy;
  state: GamificationCatalogState;
  xpContribution: number;
  achieved: boolean;
  achievedAt: string | null;
  progressCurrent?: number;
  progressTarget?: number;
  progressPercent?: number;
  introducedInRulesRevision: number;
  isNewSinceLastRulesMigration: boolean;
};

export type GamificationSummary = {
  xpTotal: number;
  currentLevel: number;
  potentialLevel: number;
  nextLevel: GamificationSummaryNextLevel;
  progressions: GamificationSummaryProgression[];
  milestones: GamificationSummaryMilestone[];
  xpReconciliation: {
    progressionXp: number;
    milestoneXp: number;
    compatibilityXp: number;
    total: number;
    isBalanced: boolean;
  };
  rulesMigration: {
    currentAppliedRulesRevision: number;
    lastAcknowledgedRulesRevision: number;
    latestRulesRevision: number;
    hasUnacknowledgedChanges: boolean;
  };
};

type EventClassification =
  | { kind: "progression"; id: CurrentInfiniteProgressionId }
  | { kind: "milestone"; id: CurrentMilestoneId }
  | { kind: "unclassified" };

const PROGRESSION_IDS = new Set<CurrentInfiniteProgressionId>(
  CURRENT_INFINITE_PROGRESSIONS.map((definition) => definition.id),
);
const MILESTONE_IDS = new Set<CurrentMilestoneId>(
  CURRENT_MILESTONES.map((definition) => definition.id),
);

function asFiniteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function classifyEvent(event: GamificationLedgerEvent): EventClassification {
  const metadata = asMetadata(event.metadata);
  const metadataProgressionId = metadata.progressionId;
  if (
    typeof metadataProgressionId === "string" &&
    PROGRESSION_IDS.has(metadataProgressionId as CurrentInfiniteProgressionId)
  ) {
    return { kind: "progression", id: metadataProgressionId as CurrentInfiniteProgressionId };
  }

  const metadataMilestoneId = metadata.milestoneId;
  if (
    typeof metadataMilestoneId === "string" &&
    MILESTONE_IDS.has(metadataMilestoneId as CurrentMilestoneId)
  ) {
    return { kind: "milestone", id: metadataMilestoneId as CurrentMilestoneId };
  }

  const registration = gamificationEventRegistry()[event.event_type];
  if (registration?.classification === "progression") {
    return { kind: "progression", id: registration.progressionId };
  }
  if (registration?.classification === "milestone") {
    return { kind: "milestone", id: registration.milestoneId };
  }

  const family = eventFamilyMap()[event.event_type];
  return family ? { kind: "progression", id: family } : { kind: "unclassified" };
}

function addToMap<K>(map: Map<K, number>, key: K, value: number): void {
  map.set(key, (map.get(key) ?? 0) + value);
}

function badgeReference(
  id: string | undefined,
  title: string | undefined,
): GamificationBadgeReference | null {
  return id && title ? { id, label: title } : null;
}

function tierReference(tier: {
  id: string;
  title: string;
  threshold: number;
  achieved: boolean;
}): GamificationSummaryTier {
  return {
    id: tier.id,
    label: tier.title,
    threshold: tier.threshold,
    achieved: tier.achieved,
  };
}

function buildXpContributions(events: readonly GamificationLedgerEvent[]) {
  const progressions = new Map<CurrentInfiniteProgressionId, number>();
  const milestones = new Map<CurrentMilestoneId, number>();
  let total = 0;

  for (const event of events) {
    const xp = asFiniteNumber(event.xp_awarded);
    total += xp;
    const classification = classifyEvent(event);
    if (classification.kind === "progression") {
      addToMap(progressions, classification.id, xp);
    } else if (classification.kind === "milestone") {
      addToMap(milestones, classification.id, xp);
    }
  }

  return { progressions, milestones, total };
}

type CatalogProgressionItem = GamificationCatalogItem & {
  progression: NonNullable<GamificationCatalogItem["progression"]>;
};

function buildSummaryProgression(
  item: CatalogProgressionItem,
  xpContribution: number,
): GamificationSummaryProgression {
  const progression = item.progression;
  return {
    id: item.id as CurrentInfiniteProgressionId,
    awardCategory: "XP_PROGRESSION",
    label: item.title,
    description: item.description,
    currentValue: progression.currentValue,
    metricLabel: CURRENT_INFINITE_PROGRESSIONS.find((definition) => definition.id === item.id)?.metricLabel ?? item.id,
    grantsXp: item.grantsXp,
    xpContribution,
    currentBadge: progression.currentTierAchieved
      ? badgeReference(progression.currentTier.id, progression.currentTier.title)
      : null,
    nextBadge: badgeReference(progression.nextTier.id, progression.nextTier.title),
    currentTier: tierReference(progression.currentTier),
    nextTier: tierReference(progression.nextTier),
    previousTiers: progression.previousTiers.map(tierReference),
    progressPercent: progression.progressPercent,
    state: item.state,
    introducedInRulesRevision: item.introducedInRulesRevision,
    isNewSinceLastRulesMigration: item.isNewSinceLastRulesMigration,
  };
}

type CatalogMilestoneItem = GamificationCatalogItem & {
  milestone: NonNullable<GamificationCatalogItem["milestone"]>;
};

function buildSummaryMilestone(
  item: CatalogMilestoneItem,
  xpContribution: number,
): GamificationSummaryMilestone {
  return {
    id: item.id as CurrentMilestoneId,
    awardCategory: item.awardCategory as "XP_MILESTONE" | "BADGE_ONLY",
    category: item.awardCategory as "XP_MILESTONE" | "BADGE_ONLY",
    label: item.title,
    description: item.description,
    grantsXp: item.grantsXp,
    xpAmountOrPolicy: item.xpAmountOrPolicy,
    state: item.state,
    xpContribution,
    achieved: item.milestone.achieved,
    achievedAt: item.milestone.achievedAt,
    progressCurrent: item.milestone.progressCurrent,
    progressTarget: item.milestone.progressTarget,
    progressPercent: item.milestone.progressPercent,
    introducedInRulesRevision: item.introducedInRulesRevision,
    isNewSinceLastRulesMigration: item.isNewSinceLastRulesMigration,
  };
}

export function buildGamificationSummary(input: {
  catalog: readonly GamificationCatalogItem[];
  events: readonly GamificationLedgerEvent[];
  currentLevel: number;
  potentialLevel: number;
  nextLevel: GamificationSummaryNextLevel;
  rulesMigration?: {
    currentAppliedRulesRevision: number;
    lastAcknowledgedRulesRevision: number;
  };
}): GamificationSummary {
  const contributions = buildXpContributions(input.events);
  const progressions = input.catalog
    .filter((item): item is CatalogProgressionItem => item.kind === "progression" && Boolean(item.progression))
    .map((item) => buildSummaryProgression(item, contributions.progressions.get(item.id as CurrentInfiniteProgressionId) ?? 0));

  const milestones = input.catalog
    .filter((item): item is CatalogMilestoneItem => item.kind === "milestone" && Boolean(item.milestone))
    .map((item) => buildSummaryMilestone(item, contributions.milestones.get(item.id as CurrentMilestoneId) ?? 0));

  const progressionXp = [...contributions.progressions.values()].reduce((sum, value) => sum + value, 0);
  const milestoneXp = [...contributions.milestones.values()].reduce((sum, value) => sum + value, 0);
  const compatibilityXp = contributions.total - progressionXp - milestoneXp;
  const currentAppliedRulesRevision = input.rulesMigration?.currentAppliedRulesRevision ?? CURRENT_GAMIFICATION_RULES_REVISION;
  const lastAcknowledgedRulesRevision = input.rulesMigration?.lastAcknowledgedRulesRevision ?? 0;
  const hasUnacknowledgedChanges = input.catalog.some((item) => item.isNewSinceLastRulesMigration);

  return {
    xpTotal: contributions.total,
    currentLevel: input.currentLevel,
    potentialLevel: input.potentialLevel,
    nextLevel: input.nextLevel,
    progressions,
    milestones,
    xpReconciliation: {
      progressionXp,
      milestoneXp,
      compatibilityXp,
      total: progressionXp + milestoneXp + compatibilityXp,
      isBalanced: Math.abs(progressionXp + milestoneXp + compatibilityXp - contributions.total) < 0.000001,
    },
    rulesMigration: {
      currentAppliedRulesRevision,
      lastAcknowledgedRulesRevision,
      latestRulesRevision: CURRENT_GAMIFICATION_RULES_REVISION,
      hasUnacknowledgedChanges,
    },
  };
}
