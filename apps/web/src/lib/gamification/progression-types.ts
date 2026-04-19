export type ProgressionStatusPhase = "pending" | "validated" | "rejected";

type ActionDrawing = {
  kind: "polyline" | "polygon";
  coordinates: [number, number][];
};

export type ProgressionEventType =
  | "action_declare_pending"
  | "action_declare_validation"
  | "collective_rsvp_yes_pending"
  | "collective_attendance_confirmed"
  | "spot_create_pending"
  | "spot_validation_bonus"
  | "community_ops_update"
  | "route_recommend_use";

export type ActionRow = {
  id: string;
  created_at: string;
  created_by_clerk_id: string;
  actor_name: string | null;
  action_date: string;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  waste_kg: number;
  cigarette_butts: number;
  volunteers_count: number;
  duration_minutes: number;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  manual_drawing?: ActionDrawing | null;
};

export type SpotRow = {
  id: string;
  created_at: string;
  created_by_clerk_id: string;
  status: "new" | "validated" | "cleaned";
  label: string;
  notes: string | null;
};

export type CommunityEventRow = {
  id: string;
  created_at: string;
  organizer_clerk_id: string;
  description: string | null;
};

export type EventRsvpRow = {
  event_id: string;
  participant_clerk_id: string;
  status: "yes" | "maybe" | "no";
  updated_at: string;
};

export type ProgressionEventRow = {
  event_type: ProgressionEventType;
  status_phase: ProgressionStatusPhase;
  xp_awarded: number;
};

export type UserProgressionStats = {
  totalActions: number;
  approvedActions: number;
  validatedActions: number;
  qualityAverage: number;
  validationRatio: number;
  diversityTypes: number;
  collectiveEvents: number;
};

export type LevelRequirementAssessment = {
  level: number;
  met: boolean;
  missing: string[];
  thresholds: {
    minValidatedActions: number;
    minDiversityTypes: number;
    minCollectiveEvents: number;
    minQualityAverage: number | null;
    minValidationRatio: number | null;
  };
  current: {
    validatedActions: number;
    diversityTypes: number;
    collectiveEvents: number;
    qualityAverage: number;
    validationRatio: number;
  };
};

export type EventInsertParams = {
  userId: string;
  eventType: ProgressionEventType;
  sourceTable: string;
  sourceId: string;
  statusPhase: ProgressionStatusPhase;
  weight: number;
  xpBase: number;
  xpAwarded: number;
  occurredOn: string;
  metadata?: Record<string, unknown>;
};

export type UserLabelSummary = {
  actorName: string;
  associationName: string;
};

export type IndividualLeaderboardItem = {
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

export type CollectiveLeaderboardItem = {
  rank: number;
  associationName: string;
  score: number;
  members: number;
  qualityAverage: number;
  validatedActions: number;
  wasteKg: number;
};

export type PersonalImpactMetrics = {
  waterSavedLiters: number;
  co2AvoidedKg: number;
  surfaceCleanedM2: number;
};

export type PersonalImpactMethodologyFormula = {
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
  errorMargins: {
    waterSavedLitersPct: number;
    co2AvoidedKgPct: number;
    surfaceCleanedM2Pct: number;
    pollutionScoreMeanPoints: number;
  };
};

export type PersonalDynamicRanking = {
  rank: number | null;
  total: number;
  percentile: number | null;
  score: number | null;
};

export type PersonalTimelineItem = {
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
  manualDrawing: ActionDrawing | null;
};

export type PostActionRetentionLoop = {
  summary: string;
  badge: string;
  share: {
    text: string;
    url: string;
  };
  nextActionSuggestion: string;
};
