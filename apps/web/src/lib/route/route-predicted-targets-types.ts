import { URBAN_PRESSURE_MODEL_SOURCE } from "./route-target-contract";
import type {
  RoutePredictedEvidence,
  RouteRiskFocus,
} from "./route-target-contract";

export type RoutePredictionSummary = {
  status: "available" | "partial" | "unavailable";
  source: typeof URBAN_PRESSURE_MODEL_SOURCE;
  modelVersion: string | null;
  snapshot: RoutePredictedEvidence["snapshot"] | null;
  riskFocus: RouteRiskFocus;
  zonesConsidered: number;
  candidatesConsidered: number;
  admitted: number;
  admittedCandidateIds: string[];
  passedToPlanner: number;
  excludedByPreselection: number;
  excludedByPlannerBudget: number;
  excludedByFinalRoutingBudget: number;
  preselectionExcludedCandidateIds: string[];
  preselectionExclusionReasons: Record<string, "preselection_bound">;
  finalRoutingBudgetExcludedCandidateIds: string[];
  selected: number;
  selectedCandidateIds: string[];
  excludedByCorridor: number;
  deduplicated: number;
  excludedZoneIds?: string[];
  deduplicatedZoneIds?: string[];
  warnings: string[];
};

export type CorridorPoint = { latitude: number; longitude: number };

export type RoutePredictionCorridor = {
  points: readonly CorridorPoint[];
  source: "origin_only" | "ordered_baseline";
};

export type RoutePredictionPoolAudit = {
  effectiveRiskFocus: RouteRiskFocus;
  admittedCandidateIds: string[];
  passedToPlannerCandidateIds: string[];
  excludedByPreselectionCandidateIds: string[];
  excludedByPreselectionReasons: Record<string, "preselection_bound">;
};
