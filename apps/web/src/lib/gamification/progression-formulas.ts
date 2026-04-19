import type {
  LevelRequirementAssessment,
  UserProgressionStats,
} from "./progression-types";

const XP_BASE = 40;
const XP_GROWTH = 1.18;

const NON_GAME_BADGE_LEVELS = [
  { minLevel: 3, label: "Contributeur regulier" },
  { minLevel: 6, label: "Contributeur confirme" },
  { minLevel: 10, label: "Pilier terrain" },
  { minLevel: 14, label: "Referent impact" },
] as const;

export function xpStep(level: number): number {
  if (!Number.isFinite(level) || level < 1) {
    return XP_BASE;
  }
  return Math.round(XP_BASE * XP_GROWTH ** (level - 1));
}

export function xpRequired(level: number): number {
  if (!Number.isFinite(level) || level <= 1) {
    return 0;
  }
  let total = 0;
  for (let current = 1; current < level; current += 1) {
    total += xpStep(current);
  }
  return total;
}

export function minValidatedActions(level: number): number {
  return Math.max(1, Math.floor(1.5 * level));
}

export function minDiversityTypes(level: number): number {
  return Math.min(5, 1 + Math.floor((level - 1) / 3));
}

export function minCollectiveEvents(level: number): number {
  return Math.floor(level / 4);
}

export function deriveBadges(params: {
  currentLevel: number;
  qualityAverage: number;
  validationRatio: number;
  collectiveEvents: number;
}): string[] {
  const badges: string[] = [];

  for (const levelBadge of NON_GAME_BADGE_LEVELS) {
    if (params.currentLevel >= levelBadge.minLevel) {
      badges.push(levelBadge.label);
    }
  }

  if (params.qualityAverage >= 85) {
    badges.push("Qualite terrain elevee");
  }
  if (params.validationRatio >= 0.8) {
    badges.push("Fiabilite des preuves");
  }
  if (params.collectiveEvents >= 4) {
    badges.push("Contribution collective");
  }

  return badges;
}

export function assessLevelRequirements(
  level: number,
  stats: UserProgressionStats,
): LevelRequirementAssessment {
  const thresholds = {
    minValidatedActions: minValidatedActions(level),
    minDiversityTypes: minDiversityTypes(level),
    minCollectiveEvents: minCollectiveEvents(level),
    minQualityAverage: level >= 5 ? 70 : null,
    minValidationRatio: level >= 5 ? 0.6 : null,
  };

  const missing: string[] = [];
  if (stats.validatedActions < thresholds.minValidatedActions) {
    missing.push(
      `Actions validees: ${stats.validatedActions}/${thresholds.minValidatedActions}`,
    );
  }
  if (stats.diversityTypes < thresholds.minDiversityTypes) {
    missing.push(
      `Diversite des contributions: ${stats.diversityTypes}/${thresholds.minDiversityTypes}`,
    );
  }
  if (stats.collectiveEvents < thresholds.minCollectiveEvents) {
    missing.push(
      `Implication collective: ${stats.collectiveEvents}/${thresholds.minCollectiveEvents}`,
    );
  }
  if (
    thresholds.minQualityAverage !== null &&
    stats.qualityAverage < thresholds.minQualityAverage
  ) {
    missing.push(
      `Qualite moyenne: ${Math.round(stats.qualityAverage)}/${thresholds.minQualityAverage}`,
    );
  }
  if (
    thresholds.minValidationRatio !== null &&
    stats.validationRatio < thresholds.minValidationRatio
  ) {
    missing.push(
      `Ratio de validation: ${Math.round(stats.validationRatio * 100)}%/${Math.round(
        thresholds.minValidationRatio * 100,
      )}%`,
    );
  }

  return {
    level,
    met: missing.length === 0,
    missing,
    thresholds,
    current: {
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
  while (xpTotal >= xpRequired(level + 1) && level < 500) {
    level += 1;
  }
  return level;
}

export function computeCurrentLevel(
  xpTotal: number,
  stats: UserProgressionStats,
): number {
  const potentialLevel = computePotentialLevel(xpTotal);
  let current = 1;
  for (let candidate = 2; candidate <= potentialLevel; candidate += 1) {
    if (xpTotal < xpRequired(candidate)) {
      break;
    }
    const assessment = assessLevelRequirements(candidate, stats);
    if (!assessment.met) {
      break;
    }
    current = candidate;
  }
  return current;
}
