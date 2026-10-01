export type {
  EventConversionSummary,
  EventReminder,
  EventStaffingSummary,
} from "./engagement/types";

export type QualityLeaderboardRow = {
  actor: string;
  actions: number;
  wasteKg: number | null;
  wasteKgCoverage: {
    knownActions: number;
    totalActions: number;
  };
  avgQuality: number;
  qualityA: number;
  qualityB: number;
  qualityC: number;
  rateA: number;
  weightedScore: number;
};

export type ActorActivityCard = {
  actor: string;
  zone: string;
  actions: number;
  avgActionQuality: number;
};
