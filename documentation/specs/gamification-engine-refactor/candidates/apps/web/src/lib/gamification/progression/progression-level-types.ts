import type { ProgressionRulesVersion, VerifiedContributionFamily } from "./progression-rules";

export type UserProgressionStats = {
  totalActions: number;
  approvedActions: number;
  validatedActions: number;
  verifiedContributions: number;
  verifiedContributionFamilies: VerifiedContributionFamily[];
  qualityAverage: number;
  validationRatio: number;
  diversityTypes: number;
  collectiveEvents: number;
  totalKg: number;
  wasteKnownActions: number;
  wasteCoverageRate: number;
  totalButts: number;
};

type LevelRequirementId =
  | "minVerifiedContributions"
  | "minDiversityTypes"
  | "minCollectiveEvents"
  | "minQualityAverage"
  | "minValidationRatio";

export type LevelRequirementCondition = {
  id: LevelRequirementId;
  current: number;
  required: number;
  met: boolean;
};

export type LevelRequirementAssessment = {
  level: number;
  met: boolean;
  eligible: boolean;
  rulesVersion: ProgressionRulesVersion;
  xp: {
    current: number;
    required: number;
    met: boolean;
  };
  potentialLevel: number;
  currentLevel: number;
  conditions: LevelRequirementCondition[];
  satisfied: LevelRequirementCondition[];
  missing: LevelRequirementCondition[];
  thresholds: {
    minVerifiedContributions: number;
    minDiversityTypes: number;
    minCollectiveEvents: number;
    minQualityAverage: number | null;
    minValidationRatio: number | null;
  };
  current: {
    verifiedContributions: number;
    verifiedContributionFamilies: VerifiedContributionFamily[];
    validatedActions: number;
    diversityTypes: number;
    collectiveEvents: number;
    qualityAverage: number;
    validationRatio: number;
  };
};
