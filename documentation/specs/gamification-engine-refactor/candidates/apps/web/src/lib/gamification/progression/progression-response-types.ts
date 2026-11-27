import type { ActionDrawing } from "@/lib/actions/types";
import type { OrganizerType } from "@/lib/actions/organizer-type";
import type { EngagementStatus } from "./engagement-status";
import type { GamificationBadgeDefinition } from "./gamification-contract-types";
import type { LevelRequirementAssessment } from "./progression-level-types";

export type UserProgressionResponse = {
  userId: string;
  xpTotal: number;
  xpValidated: number;
  xpPending: number;
  currentLevel: number;
  potentialLevel: number;
  nextLevel: {
    level: number;
    xpRequired: number;
    xpRemaining: number;
    frozen: boolean;
    requirements: LevelRequirementAssessment;
  };
  badges: string[];
  badgeCatalog: readonly GamificationBadgeDefinition[];
  summary: import("./gamification-summary").GamificationSummary;
  engagementStatus: EngagementStatus;
  impact: PersonalImpactMetrics;
  impactMethodology: PersonalImpactMethodology;
  dynamicRanking: PersonalDynamicRanking;
  history: {
    timeline: PersonalTimelineItem[];
    mapPoints: PersonalTimelineItem[];
  };
  monthlyMilestone: MonthlyMilestone;
  recognition: ContributorRecognitionSnapshot;
  annualRecognition: ContributorRecognitionSnapshot;
  yearToDateImpact: {
    wasteKg: number;
    validatedActions: number;
    wasteKnownActions: number;
    wasteCoverageRate: number;
  };
};

export type ContributorRecognitionType =
  | "terrain"
  | "diffusion"
  | "coordination"
  | "mentorat";

export type ContributorRecognitionCard = {
  userId: string;
  actorName: string;
  associationName: string;
  verifiedContributions: number;
  qualityAverage: number;
  topZone: string;
  contributionType: ContributorRecognitionType;
  regularityLabel: string;
  activeMonths: number;
  mentorEligible: boolean;
  lastContributionDate: string;
  highlight: string;
  thanksMessage: string;
  badges: string[];
  score: number;
};

export type ContributorRecognitionSummary = {
  topContributors: ContributorRecognitionCard[];
  currentContributor: ContributorRecognitionCard | null;
};

type ContributorRecognitionSnapshot = {
  currentContributor: ContributorRecognitionCard | null;
};

export type LeaderboardMetric = "level" | "xp" | "badges";

export type IndividualLeaderboardItem = {
  rank: number;
  publicLabel: string;
  level: number;
  xpValidated: number; // May be decimal (0.5 increments)
  badgeTotal: number;
  gradeCount: number;
  oneShotCount: number;
};

export type PublicStructureLeaderboardItem = {
  rank: number;
  publicLabel: string;
  structureType: OrganizerType;
  level: number;
  xpValidated: number;
  badgeTotal: number;
  gradeCount: number;
  oneShotCount: number;
};

type MonthlyMilestone = {
  id: string;
  month: number;
  year: number;
  description: string;
  targetKg: number;
  currentKg: number;
  isCompleted: boolean;
};

export type LeaderboardResponseDto = {
  scope: "individual" | "collective";
  generatedAt: string;
  items: IndividualLeaderboardItem[] | PublicStructureLeaderboardItem[];
  recognition: {
    topContributors: [];
    currentContributor: null;
  };
};

export type PublicLeaderboardItem =
  | IndividualLeaderboardItem
  | PublicStructureLeaderboardItem;

export type PublicLeaderboardResponseDto = {
  scope: "user" | "structure";
  metric: LeaderboardMetric;
  generatedAt: string;
  items: PublicLeaderboardItem[];
};

export type PersonalImpactMetrics = {
  waterSavedLiters: number;
  co2AvoidedKg: number;
  surfaceCleanedM2: number;
  wasteKg: number;
  wasteKnownActions?: number;
  wasteCoverageRate?: number;
  cigaretteButts: number;
};

type PersonalImpactMethodologyFormula = {
  id: "water_saved" | "co2_avoided" | "surface_cleaned" | "pollution_score_mean";
  label: string;
  formula: string;
  interpretation: string;
};

export type PersonalImpactMethodology = {
  proxyVersion: string;
  qualityRulesVersion: string;
  scope: string;
  pollutionScoreAverage: number;
  formulas: PersonalImpactMethodologyFormula[];
  approximations: string[];
  hypotheses: string[];
  sources?: Record<string, string>;
  errorMargins: {
    waterSavedLitersPct: number;
    co2AvoidedKgPct: number;
    surfaceCleanedM2Pct: number;
    pollutionScoreMeanPoints: number;
  };
};

type PersonalDynamicRanking = {
  rank: number | null;
  total: number;
  percentile: number | null;
};

export type PersonalTimelineItem = {
  id: string;
  actionDate: string;
  locationLabel: string;
  status: "pending" | "approved" | "rejected";
  wasteKg: number | null;
  cigaretteButts: number;
  volunteersCount: number;
  durationMinutes: number;
  qualityScore: number;
  qualityGrade: "A" | "B" | "C";
  latitude: number | null;
  longitude: number | null;
  manualDrawing: ActionDrawing | null;
  validatedRoleCodes: string[];
};

export type PostActionRetentionLoop = {
  summary: string;
  badge: string | null;
  xpAwarded: number;
  thanksMessage: string;
  share: {
    text: string;
    url: string;
  };
  nextActionSuggestion: string;
};
