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
  totalKg: number;
  totalButts: number;
}): string[] {
  const badges: string[] = [];

  // Tiers de Niveau
  for (const levelBadge of NON_GAME_BADGE_LEVELS) {
    if (params.currentLevel >= levelBadge.minLevel) {
      badges.push(levelBadge.label);
    }
  }

  // Tiers Mégots
  if (params.totalButts >= 10000) badges.push("Expert Mégots (Or)");
  else if (params.totalButts >= 2000) badges.push("Chasseur de Mégots (Argent)");
  else if (params.totalButts >= 500) badges.push("Ramasseur de Mégots (Bronze)");

  // Tiers Poids (Kg)
  if (params.totalKg >= 500) badges.push("Héros du Nettoyage (Or)");
  else if (params.totalKg >= 100) badges.push("Force de la Nature (Argent)");
  else if (params.totalKg >= 10) badges.push("Bras Armé (Bronze)");

  // Qualité
  if (params.qualityAverage >= 90) badges.push("Sentinelle Exemplaire");
  else if (params.qualityAverage >= 75) badges.push("Données de Qualité");

  // Collectif
  if (params.collectiveEvents >= 10) badges.push("Pilier de Communauté");
  else if (params.collectiveEvents >= 3) badges.push("Esprit d'Équipe");

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
