import type {
  LevelRequirementAssessment,
  LevelRequirementCondition,
  UserProgressionStats,
} from "./progression-types";
import { findBadgeDefinition } from "./badge-catalog";
import { PROGRESSION_RULES_V1 } from "./progression-rules";

export {
  PROGRESSION_RULES_V1,
} from "./progression-rules";

export function xpStep(level: number): number {
  return PROGRESSION_RULES_V1.xpStep(level);
}

export function xpRequired(level: number): number {
  return PROGRESSION_RULES_V1.xpRequired(level);
}

export function minVerifiedContributions(level: number): number {
  return PROGRESSION_RULES_V1.minVerifiedContributions(level);
}

export function minDiversityTypes(level: number): number {
  return PROGRESSION_RULES_V1.minDiversityTypes(level);
}

export function minCollectiveEvents(level: number): number {
  return PROGRESSION_RULES_V1.minCollectiveEvents(level);
}

function buildRequirementConditions(
  level: number,
  stats: UserProgressionStats,
): {
  thresholds: LevelRequirementAssessment["thresholds"];
  conditions: LevelRequirementCondition[];
} {
  const thresholds = {
    minVerifiedContributions: PROGRESSION_RULES_V1.minVerifiedContributions(level),
    minDiversityTypes: PROGRESSION_RULES_V1.minDiversityTypes(level),
    minCollectiveEvents: PROGRESSION_RULES_V1.minCollectiveEvents(level),
    minQualityAverage: PROGRESSION_RULES_V1.minQualityAverage(level),
    minValidationRatio: PROGRESSION_RULES_V1.minValidationRatio(level),
  };
  const conditions: LevelRequirementCondition[] = [
    {
      id: "minVerifiedContributions",
      current: stats.verifiedContributions,
      required: thresholds.minVerifiedContributions,
      met: false,
    },
    {
      id: "minDiversityTypes",
      current: stats.diversityTypes,
      required: thresholds.minDiversityTypes,
      met: false,
    },
    {
      id: "minCollectiveEvents",
      current: stats.collectiveEvents,
      required: thresholds.minCollectiveEvents,
      met: false,
    },
  ];

  if (
    thresholds.minQualityAverage !== null &&
    stats.verifiedContributionFamilies.includes("organisation")
  ) {
    conditions.push({
      id: "minQualityAverage",
      current: stats.qualityAverage,
      required: thresholds.minQualityAverage,
      met: false,
    });
  }
  if (
    thresholds.minValidationRatio !== null &&
    stats.verifiedContributionFamilies.includes("organisation")
  ) {
    conditions.push({
      id: "minValidationRatio",
      current: stats.validationRatio,
      required: thresholds.minValidationRatio,
      met: false,
    });
  }

  return { thresholds, conditions };
}

function assessContributionRequirements(
  level: number,
  stats: UserProgressionStats,
): {
  thresholds: LevelRequirementAssessment["thresholds"];
  conditions: LevelRequirementCondition[];
  satisfied: LevelRequirementCondition[];
  missing: LevelRequirementCondition[];
  met: boolean;
} {
  const { thresholds, conditions } = buildRequirementConditions(level, stats);
  const evaluatedConditions = conditions.map((condition) => ({
    ...condition,
    // Keep the current `< threshold` rule as the source of truth.
    met: !(condition.current < condition.required),
  }));
  const satisfied = evaluatedConditions.filter((condition) => condition.met);
  const missing = evaluatedConditions.filter((condition) => !condition.met);

  return {
    thresholds,
    conditions: evaluatedConditions,
    satisfied,
    missing,
    met: missing.length === 0,
  };
}

function computeCurrentLevelFromPotential(
  xpTotal: number,
  stats: UserProgressionStats,
  potentialLevel: number,
): number {
  let current = 1;
  for (let candidate = 2; candidate <= potentialLevel; candidate += 1) {
    if (xpTotal < PROGRESSION_RULES_V1.xpRequired(candidate)) {
      break;
    }
    if (!assessContributionRequirements(candidate, stats).met) {
      break;
    }
    current = candidate;
  }
  return current;
}

function addBadgeIfEligible(
  badges: string[],
  condition: boolean,
  label: string,
): void {
  if (condition) {
    badges.push(label);
  }
}

function addLevelBadges(badges: string[], currentLevel: number): void {
  const definition = findBadgeDefinition("legacy-level-recognition");
  for (const levelBadge of definition?.legacyThresholds ?? []) {
    if (currentLevel >= levelBadge.minimum) {
      badges.push(levelBadge.label);
    }
  }
}

function legacyLabel(definitionId: string, index: number): string {
  return findBadgeDefinition(definitionId)?.legacyLabels?.[index] ?? definitionId;
}

export function deriveBadges(params: {
  currentLevel: number;
  qualityAverage: number;
  validationRatio: number;
  collectiveEvents: number;
  /** Compatibility inputs retained for the historical leaderboard payload. */
  totalKg: number;
  totalButts: number;
  wasteCoverageRate?: number;
}): string[] {
  const badges: string[] = [];

  addLevelBadges(badges, params.currentLevel);

  // Quality remains a cross-cutting signal and a level requirement, not an
  // infinite badge axis. These fixed recognitions are retained as historical
  // compatibility labels; they never award XP and can be absent when quality
  // changes.
  addBadgeIfEligible(badges, params.qualityAverage >= 90, legacyLabel("legacy-quality-recognition", 0));
  if (params.qualityAverage < 90) {
    addBadgeIfEligible(badges, params.qualityAverage >= 75, legacyLabel("legacy-quality-recognition", 1));
  }

  // Collectif
  if (params.collectiveEvents >= 10) badges.push(legacyLabel("legacy-collective-recognition", 0));
  else if (params.collectiveEvents >= 3) badges.push(legacyLabel("legacy-collective-recognition", 1));

  return badges;
}

export function assessLevelRequirements(
  level: number,
  stats: UserProgressionStats,
  xpTotal: number,
): LevelRequirementAssessment {
  const contributionAssessment = assessContributionRequirements(level, stats);
  const potentialLevel = computePotentialLevel(xpTotal);
  const currentLevel = computeCurrentLevelFromPotential(xpTotal, stats, potentialLevel);
  const requiredXp = PROGRESSION_RULES_V1.xpRequired(level);

  return {
    rulesVersion: PROGRESSION_RULES_V1.version,
    level,
    eligible: xpTotal >= requiredXp && contributionAssessment.met,
    met: contributionAssessment.met,
    xp: {
      current: xpTotal,
      required: requiredXp,
      met: xpTotal >= requiredXp,
    },
    potentialLevel,
    currentLevel,
    conditions: contributionAssessment.conditions,
    satisfied: contributionAssessment.satisfied,
    missing: contributionAssessment.missing,
    thresholds: contributionAssessment.thresholds,
    current: {
      verifiedContributions: stats.verifiedContributions,
      verifiedContributionFamilies: [...stats.verifiedContributionFamilies],
      validatedActions: stats.validatedActions,
      diversityTypes: stats.diversityTypes,
      collectiveEvents: stats.collectiveEvents,
      qualityAverage: Math.round(stats.qualityAverage * 10) / 10,
      validationRatio: Math.round(stats.validationRatio * 1000) / 1000,
    },
  };
}

export function computePotentialLevel(xpTotal: number): number {
  let level = 1;
  while (
    xpTotal >= PROGRESSION_RULES_V1.xpRequired(level + 1) &&
    level < PROGRESSION_RULES_V1.maxLevel
  ) {
    level += 1;
  }
  return level;
}

export function computeCurrentLevel(
  xpTotal: number,
  stats: UserProgressionStats,
): number {
  const potentialLevel = computePotentialLevel(xpTotal);
  return computeCurrentLevelFromPotential(xpTotal, stats, potentialLevel);
}
