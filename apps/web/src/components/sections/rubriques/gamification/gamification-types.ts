import type {
  ContributorRecognitionSnapshot,
  ContributorRecognitionSummary,
} from "@/lib/gamification/progression-types";

export type PersonalHistoryItem = {
  id: string;
  actionDate: string;
  locationLabel: string;
  status: "pending" | "approved" | "rejected";
  wasteKg: number;
  cigaretteButts: number;
  volunteersCount: number;
  durationMinutes: number;
  qualityScore: number;
  qualityGrade: "A" | "B" | "C";
  latitude: number | null;
  longitude: number | null;
  manualDrawing: {
    kind: "polyline" | "polygon";
    coordinates: [number, number][];
  } | null;
};

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
    nextLevel: {
      level: number;
      xpRequired: number;
      xpRemaining: number;
      frozen: boolean;
      requirements: {
        missing: string[];
      };
    };
    impact: {
      waterSavedLiters: number;
      co2AvoidedKg: number;
      surfaceCleanedM2: number;
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
      timeline: PersonalHistoryItem[];
      mapPoints: PersonalHistoryItem[];
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
  };
};

export type IndividualItem = {
  rank: number;
  userId: string;
  actorName: string;
  associationName: string;
  score: number;
  xpValidated: number;
  xpTotal: number;
  currentLevel: number;
  potentialLevel: number;
  qualityAverage: number;
  validatedActions: number;
  wasteKg: number;
  badges: string[];
};

export type CollectiveItem = {
  rank: number;
  associationName: string;
  score: number;
  members: number;
  qualityAverage: number;
  validatedActions: number;
  wasteKg: number;
};

export type LeaderboardResponse = {
  status: "ok";
  scope: "individual" | "collective";
  generatedAt: string;
  items: Array<IndividualItem | CollectiveItem>;
  recognition: ContributorRecognitionSummary;
};
