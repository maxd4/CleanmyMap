export const PILOTAGE_FORMULA_VERSION = "2026.04.10-v1";

export const PILOTAGE_THRESHOLDS = {
  deltaStablePercent: 3,
  deltaStrongPercent: 15,
  qualityLowScore: 65,
  qualityWarningScore: 78,
  coverageWarningRate: 70,
  backlogCriticalCount: 80,
  backlogWarningCount: 35,
  moderationDelayWarningDays: 7,
  moderationDelayCriticalDays: 14,
  reliabilityHighScore: 75,
  reliabilityMediumScore: 55,
  reliabilityLowSampleFloor: 8,
} as const;

export const PRIORITIZATION_RULESET = {
  version: "ops-priority-2026.04-v1",
  weights: {
    backlog: 0.35,
    quality: 0.25,
    territorial: 0.25,
    coverage: 0.15,
  },
} as const;
