import type { PollutionScoreReferences } from "./pollution-score";
import type {
  ActionPollutionProjectionCalibration,
  ActionPollutionProjectionPresentation,
  ProjectedPollutionScoreOptions,
} from "./revisit-priority";
import type { ActionDataContract } from "../contracts/contract-model";

export type RepollutionDatasetCompleteness = "complete" | "partial";

export type DerivedPlaceObservation = {
  action: ActionDataContract;
  actionId: string;
  observedAt: string;
  observedAtMs: number;
  latitude: number;
  longitude: number;
  normalizedLabel: string;
  geometryKind: "point" | "polygon";
  historicalScore: number;
  postActionScore: number;
  postActionScoreSource: "measured" | "model_baseline";
};

type LocalRepollutionIntervalStatus =
  | "valid"
  | "rejected"
  | "rapid_repollution";

type LocalRepollutionIntervalRejectionReason =
  | "source_incomplete"
  | "delta_days_too_short"
  | "denominator_unusable"
  | "fraction_out_of_range"
  | "t80_out_of_bounds";

export type LocalRepollutionInterval = {
  previousActionId: string;
  nextActionId: string;
  deltaDays: number;
  previousScore: number;
  nextScore: number;
  postActionScore: number;
  postActionScoreSource: "measured" | "model_baseline";
  fraction: number | null;
  observedT80Days: number | null;
  status: LocalRepollutionIntervalStatus;
  rejectionReason: LocalRepollutionIntervalRejectionReason | null;
};

type LocalRepollutionConfidence =
  | "insufficient"
  | "low"
  | "medium"
  | "high";

export type LocalRepollutionCalibration = {
  derivedPlaceKey: string;
  observationsCount: number;
  validIntervalsCount: number;
  localT80Days: number | null;
  confidence: LocalRepollutionConfidence;
  provenance: "generic" | "local_history";
  sourceCompleteness: RepollutionDatasetCompleteness;
  rejectedIntervals: LocalRepollutionInterval[];
  rapidRepollutionIntervals: LocalRepollutionInterval[];
};

export type DerivedPlaceHistory = {
  derivedPlaceKey: string;
  observations: DerivedPlaceObservation[];
  intervals: LocalRepollutionInterval[];
  calibration: LocalRepollutionCalibration;
};

export type LocalRepollutionExcludedAction = {
  actionId: string;
  reason:
    | "not_action"
    | "not_completed"
    | "data_quality_blocking"
    | "pollution_score_unavailable"
    | "invalid_coordinates"
    | "invalid_observed_at"
    | "missing_label"
    | "unsupported_geometry";
};

export type LocalRepollutionScoreResolver = (
  action: ActionDataContract,
) => number | null;

export type DeriveLocalRepollutionHistoriesOptions = {
  sourceCompleteness: RepollutionDatasetCompleteness;
  pollutionScoreReferences?: PollutionScoreReferences | null;
  historicalScoreResolver?: LocalRepollutionScoreResolver;
};

export type DerivedLocalRepollutionResult = {
  places: DerivedPlaceHistory[];
  excludedActions: LocalRepollutionExcludedAction[];
};

export type LocalProjectionSelection = {
  calibration: ActionPollutionProjectionCalibration | null;
  confidence: LocalRepollutionConfidence;
  localT80Days: number | null;
  provenance: "generic" | "local_history";
};

export type LocalProjectionOptions = ProjectedPollutionScoreOptions & {
  sourceCompleteness: RepollutionDatasetCompleteness;
  localCalibration?: LocalRepollutionCalibration | null;
};

export type LocalProjectionPresentation = ActionPollutionProjectionPresentation &
  LocalProjectionSelection;
