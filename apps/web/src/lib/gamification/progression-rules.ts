const PROGRESSION_RULES_VERSION = "progression-rules-v1" as const;

export type ProgressionRulesVersion = typeof PROGRESSION_RULES_VERSION;

const VERIFIED_CONTRIBUTION_FAMILIES = [
  "participation",
  "organisation",
  "clean_zones",
  "learning",
  "moderation",
] as const;

export type VerifiedContributionFamily =
  (typeof VERIFIED_CONTRIBUTION_FAMILIES)[number];

export type ProgressionRulesV1 = Readonly<{
  version: ProgressionRulesVersion;
  maxLevel: number;
  xpStep: (level: number) => number;
  xpRequired: (level: number) => number;
  verifiedContributionFamilies: readonly VerifiedContributionFamily[];
  minVerifiedContributions: (level: number) => number;
  minDiversityTypes: (level: number) => number;
  minCollectiveEvents: (level: number) => number;
  minQualityAverage: (level: number) => number | null;
  minValidationRatio: (level: number) => number | null;
}>;

/** CURRENT contract for global user levels. */
export const PROGRESSION_RULES_V1: ProgressionRulesV1 = Object.freeze({
  version: PROGRESSION_RULES_VERSION,
  maxLevel: 500,
  verifiedContributionFamilies: VERIFIED_CONTRIBUTION_FAMILIES,
  xpStep(level: number): number {
    if (!Number.isFinite(level) || level < 1) return 1;
    // Niveau n → nécessite n XP supplémentaires (système simple).
    return Math.floor(level);
  },
  xpRequired(level: number): number {
    if (!Number.isFinite(level) || level <= 1) return 0;
    const n = Math.floor(level) - 1;
    // Cumul requis pour atteindre le niveau `level`: sum(k) pour k=1..n.
    return (n * (n + 1)) / 2;
  },
  minVerifiedContributions(level: number): number {
    return Math.max(1, Math.floor(1.5 * level));
  },
  minDiversityTypes(level: number): number {
    return Math.min(5, 1 + Math.floor((level - 1) / 3));
  },
  minCollectiveEvents(level: number): number {
    return Math.floor(level / 4);
  },
  minQualityAverage(level: number): number | null {
    return level >= 5 ? 70 : null;
  },
  minValidationRatio(level: number): number | null {
    return level >= 5 ? 0.6 : null;
  },
});
