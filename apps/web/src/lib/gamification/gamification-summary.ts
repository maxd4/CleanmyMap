import {
  CURRENT_INFINITE_PROGRESSIONS,
  CURRENT_MILESTONES,
  eventFamilyMap,
  gamificationEventRegistry,
} from "./progression-utils";
import type {
  CurrentInfiniteProgressionId,
  CurrentMilestoneId,
  GamificationBadgeReference,
  GamificationXpPolicy,
  LevelRequirementAssessment,
} from "./progression-types";
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

export type GamificationSummaryProgression = {
  id: CurrentInfiniteProgressionId;
  label: string;
  description: string;
  currentValue: number;
  metricLabel: string;
  grantsXp: boolean;
  xpContribution: number;
  currentBadge: GamificationBadgeReference | null;
  nextBadge: GamificationBadgeReference | null;
  progressPercent: number;
  state: GamificationCatalogState;
  introducedInRulesRevision: string;
  isNewSinceLastRulesMigration: boolean;
};

export type GamificationSummaryMilestone = {
  id: CurrentMilestoneId;
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
  introducedInRulesRevision: string;
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

export function buildGamificationSummary(input: {
  catalog: readonly GamificationCatalogItem[];
  events: readonly GamificationLedgerEvent[];
  currentLevel: number;
  potentialLevel: number;
  nextLevel: GamificationSummaryNextLevel;
}): GamificationSummary {
  const contributions = buildXpContributions(input.events);
  const progressions = input.catalog
    .filter((item): item is GamificationCatalogItem & { progression: NonNullable<GamificationCatalogItem["progression"]> } => item.kind === "progression" && Boolean(item.progression))
    .map((item) => ({
      id: item.id as CurrentInfiniteProgressionId,
      label: item.title,
      description: item.description,
      currentValue: item.progression.currentValue,
      metricLabel:
        CURRENT_INFINITE_PROGRESSIONS.find((definition) => definition.id === item.id)?.metricLabel ??
        item.id,
      grantsXp: item.grantsXp,
      xpContribution: contributions.progressions.get(item.id as CurrentInfiniteProgressionId) ?? 0,
      currentBadge: item.progression.currentTierAchieved
        ? badgeReference(item.progression.currentTier.id, item.progression.currentTier.title)
        : null,
      nextBadge: badgeReference(item.progression.nextTier.id, item.progression.nextTier.title),
      progressPercent: item.progression.progressPercent,
      state: item.state,
      introducedInRulesRevision: item.introducedInRulesRevision,
      isNewSinceLastRulesMigration: item.isNewSinceLastRulesMigration,
    }));

  const milestones = input.catalog
    .filter((item): item is GamificationCatalogItem & { milestone: NonNullable<GamificationCatalogItem["milestone"]> } => item.kind === "milestone" && Boolean(item.milestone))
    .map((item) => ({
      id: item.id as CurrentMilestoneId,
      category: item.category as "XP_MILESTONE" | "BADGE_ONLY",
      label: item.title,
      description: item.description,
      grantsXp: item.grantsXp,
      xpAmountOrPolicy: item.xpAmountOrPolicy,
      state: item.state,
      xpContribution: contributions.milestones.get(item.id as CurrentMilestoneId) ?? 0,
      achieved: item.milestone.achieved,
      achievedAt: item.milestone.achievedAt,
      progressCurrent: item.milestone.progressCurrent,
      progressTarget: item.milestone.progressTarget,
      progressPercent: item.milestone.progressPercent,
      introducedInRulesRevision: item.introducedInRulesRevision,
      isNewSinceLastRulesMigration: item.isNewSinceLastRulesMigration,
    }));

  const progressionXp = [...contributions.progressions.values()].reduce((sum, value) => sum + value, 0);
  const milestoneXp = [...contributions.milestones.values()].reduce((sum, value) => sum + value, 0);
  const compatibilityXp = contributions.total - progressionXp - milestoneXp;

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
  };
}
