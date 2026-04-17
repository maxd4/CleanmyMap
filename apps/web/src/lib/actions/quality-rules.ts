import type { ActionQualityGrade } from "./quality";

export const ACTION_QUALITY_RULESET_VERSION = "quality-2026.04-v1";

export const ACTION_QUALITY_WEIGHTS = {
  completeness: 0.3,
  coherence: 0.2,
  geoloc: 0.2,
  traceability: 0.15,
  freshness: 0.15,
} as const;

export const ACTION_QUALITY_THRESHOLDS = {
  gradeA: 80,
  gradeB: 60,
} as const;

export function toActionQualityGrade(score: number): ActionQualityGrade {
  if (score >= ACTION_QUALITY_THRESHOLDS.gradeA) {
    return "A";
  }
  if (score >= ACTION_QUALITY_THRESHOLDS.gradeB) {
    return "B";
  }
  return "C";
}
