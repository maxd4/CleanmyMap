import type {
  ParisPressureProvenance,
  ParisPressureSnapshot,
  ParisPressureZone,
} from "@/lib/geo/paris-pressure-contract";
import type {
  ParisPressureRiskConfidence,
  ParisPressureRiskEstimate,
  ParisPressureRiskScore,
} from "@/lib/geo/paris-pressure-risk-contract";
import type {
  VolunteerAdditionalityResult,
  VolunteerSafetyAssessment,
} from "@/lib/geo/volunteer-additionality-contract";

export const URBAN_PRESSURE_MODEL_SOURCE = "urban-pressure-model" as const;

export type RouteRiskFocus = "all" | "waste" | "cigaretteButts";

export type RouteObservedEvidence = {
  family: "observed";
  source: "trash_spotter_spots";
  proof: "validated";
  observedAt: string;
  pollutionPriority?: number;
  volunteerAdditionality?: number | null;
  finalPlannerContribution?: number;
  volunteerAdditionalityConfidence?: number | null;
  additionalityWeight?: number;
  additionality?: VolunteerAdditionalityResult;
};

export type RoutePredictedEvidence = {
  family: "predicted";
  source: typeof URBAN_PRESSURE_MODEL_SOURCE;
  modelVersion: string;
  zoneId: string;
  zoneLabel: string;
  geographicLevel: ParisPressureZone["geographicLevel"];
  centroid: ParisPressureZone["centroid"];
  radiusKm: number;
  areaKm2: number | null;
  distanceToCorridorKm: number;
  planningCorridor: {
    source: "origin_only" | "ordered_baseline";
    pointCount: number;
    isNetworkGeometry: false;
    note: string;
  };
  detourDistanceKm: number;
  detourMinutes: number;
  admission?: {
    nearCorridor: boolean;
    strongOpportunity: boolean;
    reason: "corridor" | "strong_opportunity";
    riskThreshold: number;
    detourLimitMinutes: number;
  };
  riskFocus: RouteRiskFocus;
  dominantRisk: "waste" | "cigaretteButts";
  wasteRisk: number;
  cigaretteButtRisk: number;
  confidence: {
    waste: ParisPressureRiskConfidence;
    cigaretteButts: ParisPressureRiskConfidence;
  };
  contributions: {
    waste: ParisPressureRiskScore["contributions"];
    cigaretteButts: ParisPressureRiskScore["contributions"];
  };
  cleanlinessCorrection: {
    waste: ParisPressureRiskScore["cleanlinessCorrection"];
    cigaretteButts: ParisPressureRiskScore["cleanlinessCorrection"];
  };
  urbanMorphologyPrior: {
    waste: ParisPressureRiskScore["urbanMorphologyPrior"];
    cigaretteButts: ParisPressureRiskScore["urbanMorphologyPrior"];
  };
  snapshot: Pick<
    ParisPressureSnapshot,
    "snapshotId" | "schemaVersion" | "generatedAt" | "refreshedAt"
  >;
  provenance: ParisPressureProvenance[];
  contextProvenance: ParisPressureRiskEstimate["contextProvenance"];
  provenanceGaps: ParisPressureRiskEstimate["provenanceGaps"];
  pollutionPriority?: number;
  volunteerAdditionality?: number | null;
  finalPlannerContribution?: number;
  volunteerAdditionalityConfidence?: number | null;
  additionalityWeight?: number;
  additionality?: VolunteerAdditionalityResult;
};

export type RoutePredictedCandidate = {
  family: "predicted";
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  score: number;
  reason: string;
  evidence: RoutePredictedEvidence;
  pollutionPriority?: number;
  volunteerAdditionality?: number | null;
  finalPlannerContribution?: number;
  volunteerAdditionalityConfidence?: number | null;
  additionalityWeight?: number;
  additionality?: VolunteerAdditionalityResult;
  volunteerSafety?: VolunteerSafetyAssessment;
};

export type RouteTargetEvidence = RouteObservedEvidence | RoutePredictedEvidence;
