import type {
  ContributorRecognitionSnapshot,
  GamificationBadgeDefinition,
  LevelRequirementAssessment,
  PersonalTimelineItem,
} from "@/lib/gamification/progression-types";
import type { GamificationSummary } from "@/lib/gamification/gamification-summary";
import type { EngagementStatus } from "@/lib/gamification/engagement-status";

export type MeResponse = {
  status: "ok";
  progression: {
    userId: string;
    xpTotal: number;
    xpValidated: number;
    xpPending: number;
    currentLevel: number;
    potentialLevel: number;
    badges: string[];
    badgeCatalog: readonly GamificationBadgeDefinition[];
    summary: GamificationSummary;
    engagementStatus: EngagementStatus;
    nextLevel: {
      level: number;
      xpRequired: number;
      xpRemaining: number;
      frozen: boolean;
      requirements: LevelRequirementAssessment;
    };
    impact: {
      waterSavedLiters: number;
      co2AvoidedKg: number;
      surfaceCleanedM2: number;
      wasteKnownActions?: number;
      wasteCoverageRate?: number;
    };
    impactMethodology: {
      proxyVersion: string;
      qualityRulesVersion: string;
      scope: string;
      pollutionScoreAverage: number;
      formulas: Array<{
        id: string;
        label: string;
        formula: string;
        interpretation: string;
      }>;
      approximations: string[];
      hypotheses: string[];
      errorMargins: {
        waterSavedLitersPct: number;
        co2AvoidedKgPct: number;
        surfaceCleanedM2Pct: number;
        pollutionScoreMeanPoints: number;
      };
    };
    dynamicRanking: {
      rank: number | null;
      total: number;
      percentile: number | null;
      score: number | null;
    };
    history: {
      timeline: PersonalTimelineItem[];
      mapPoints: PersonalTimelineItem[];
    };
    monthlyMilestone?: {
      targetType: string;
      targetValue: number;
      currentValue: number;
      progressPercent: number;
      label: string;
      unit: string;
    } | null;
    recognition: ContributorRecognitionSnapshot;
    annualRecognition: ContributorRecognitionSnapshot;
    yearToDateImpact: {
      wasteKg: number;
      validatedActions: number;
      wasteKnownActions: number;
      wasteCoverageRate: number;
    };
  };
};
