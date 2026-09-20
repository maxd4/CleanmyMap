import type {
  ActionPreparationData,
  ActionWasteBreakdown,
} from "@/lib/actions/types";
import type { ActionDataQualitySummary } from "@/lib/actions/quality/data-quality-types";
import type { ActionVolunteerParticipation } from "@/lib/actions/volunteer-participation";
import type { ActionCigaretteButtsMeasurements, CigaretteButtsProvenance } from "@/lib/waste/cigarette-butts";
import type { ActionWasteMeasurementMethod } from "@/lib/waste/measurement";
import type { CleanupWorkload } from "./route-cleanup-workload";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source/types";
import type { RouteDataLayers, RouteDataStatus } from "./route-data-status";
import type { RouteGeometry, RouteStop } from "./route-contract";
import type { RoutePlanningMode } from "./route-planning-mode";
import type { RoutePlannerOrigin } from "./route-planner";
import type { RoutePredictionSummary } from "./route-predicted-targets";
import type { RoutePickupPreference } from "./route-pickup-preference";
import type { RouteOperationalBudget } from "./route-operational-budget";
import type { OperationalRoute } from "./route-operational";
import type { PlannerWeatherContext } from "@/lib/weather/planner-weather";
import {
  ROUTE_CALIBRATION_CONTEXT_LEGACY_VERSION,
  ROUTE_CALIBRATION_CONTEXT_VERIFIED_VERSION,
  ROUTE_CALIBRATION_CONTEXT_VERSION,
  ROUTE_CLEANUP_DURATION_CONTRACT_VERSION,
  ROUTE_PLANNER_SNAPSHOT_VERSION,
  type RouteCalibrationStatus,
  type RoutePlannerSnapshotIntegrity,
} from "./route-calibration-contract";

export type RouteCleanupDurationEstimate = {
  contractVersion: typeof ROUTE_CLEANUP_DURATION_CONTRACT_VERSION;
  minutes: number | null;
  uncertaintyMinutes: number | null;
  modelVersion: string;
  calibrationStatus: RouteCalibrationStatus;
  reason: string;
  provenance: {
    source: "route-calibration";
    contextVersion:
      | typeof ROUTE_CALIBRATION_CONTEXT_VERSION
      | typeof ROUTE_CALIBRATION_CONTEXT_LEGACY_VERSION
      | typeof ROUTE_CALIBRATION_CONTEXT_VERIFIED_VERSION
      | null;
    artifactVersion: string | null;
  };
};

export type RouteCalibrationContextCandidate = {
  candidateId: string;
  family: "observed" | "predicted";
  cleanupWorkload: CleanupWorkload;
};

export type RoutePlannerSnapshotGroup = {
  groupIndex: number;
  volunteerCount: number;
  candidateIds: string[];
  reservedCandidateIds: string[];
  targetCount: number;
  travelDistanceKm: number;
  travelMinutes: number;
  travelBudgetMinutes: number;
  withinBudget: boolean;
  routeGeometry: RouteGeometry;
  operationalBudget: RouteOperationalBudget | null;
};

/**
 * Exact planner output captured for the action handoff. This is evidence of
 * what the planner knew and recommended, not a new calibration model.
 */
export type RoutePlannerSnapshot = {
  version: typeof ROUTE_PLANNER_SNAPSHOT_VERSION;
  generatedAt: string;
  engineVersion: string;
  cleanupWorkloadVersion: CleanupWorkload["modelVersion"];
  modelVersions: {
    planner: string;
    cleanupWorkload: CleanupWorkload["modelVersion"];
    prediction: string | null;
    duration: string | null;
  };
  parameters: {
    origin: RoutePlannerOrigin;
    planningMode: RoutePlanningMode;
    travelBudgetMinutes: number;
    maxStops: number;
    priorityVsTravel: number;
    pickupPreference: RoutePickupPreference;
    effectiveRiskFocus: "all" | "waste" | "cigaretteButts";
    volunteers: number;
    groupCount: number;
  };
  selectedCandidateIds: string[];
  observedCandidateIds: string[];
  predictedCandidateIds: string[];
  selectedStops: RouteStop[];
  distance: {
    totalKm: number;
    travelMinutes: number;
    returnDistanceKm: number;
    returnMinutes: number;
  };
  geometry: RouteGeometry;
  groups: RoutePlannerSnapshotGroup[];
  provenance: {
    dataStatus: RouteDataStatus;
    dataLayers: RouteDataLayers;
    sourceHealth: UnifiedSourceHealth;
    prediction: RoutePredictionSummary | null;
  };
  weatherContext?: PlannerWeatherContext;
};

export type RouteCalibrationContext = {
  version:
    | typeof ROUTE_CALIBRATION_CONTEXT_VERSION
    | typeof ROUTE_CALIBRATION_CONTEXT_LEGACY_VERSION
    | typeof ROUTE_CALIBRATION_CONTEXT_VERIFIED_VERSION;
  generatedAt: string;
  routeEngineVersion: string;
  cleanupWorkloadVersion: CleanupWorkload["modelVersion"];
  volunteersExpected: number;
  groupCount: number;
  candidates: RouteCalibrationContextCandidate[];
  plannerSnapshot?: RoutePlannerSnapshot;
  /** Server-generated integrity metadata; never accepted as client authority. */
  plannerSnapshotIntegrity?: RoutePlannerSnapshotIntegrity;
};

export type ApprovedActionForCalibration = {
  id: string;
  status: "pending" | "approved" | "rejected";
  actionDate: string;
  locationLabel: string;
  wasteKg: number | null;
  cigaretteButts: number | null;
  volunteersCount: number | null;
  durationMinutes: number | null;
  preparationData: ActionPreparationData | null | undefined;
  placeType?: string | null;
  wasteMeasurementMethod?: ActionWasteMeasurementMethod | null;
  wasteBreakdown?: ActionWasteBreakdown | null;
  cigaretteButtsMeasurements?: ActionCigaretteButtsMeasurements | null;
  volunteerParticipation?: ActionVolunteerParticipation | null;
  dataQuality?: ActionDataQualitySummary | null;
};

export type RouteCalibrationMeasurementProvenance =
  | "measured"
  | "counted"
  | "derived"
  | "estimated"
  | "unknown"
  | "missing";

export type RouteCalibrationDuration = {
  totalMinutes: number | null;
  definition: "walking_plus_collection_sorting_weighing";
  source: "action.duration_minutes" | "missing";
  components: {
    walkingMinutes: number | null;
    collectionMinutes: number | null;
    sortingMinutes: number | null;
    weighingMinutes: number | null;
  };
};

export type RouteCalibrationOrdinaryWaste = {
  wasteKg: number | null;
  measurementMethod: ActionWasteMeasurementMethod | null;
  provenance: RouteCalibrationMeasurementProvenance;
  breakdown: ActionWasteBreakdown | null;
};

export type RouteCalibrationCigaretteButts = {
  measurements: ActionCigaretteButtsMeasurements | null;
  legacyCount: number | null;
  provenance: CigaretteButtsProvenance | "missing";
};

export type RouteCalibrationVolunteerData = {
  childrenCount: number | null;
  adultCount: number | null;
  retiredCount: number | null;
  participantsCount: number | null;
  effectiveVolunteerUnits: number | null;
  effectiveVolunteerUnitsFormulaVersion: string | null;
};

export type RouteCalibrationQuality = {
  status: "complete" | "partial" | "insufficient";
  ordinaryWasteAvailable: boolean;
  cigaretteButtsAvailable: boolean;
  missing: string[];
  dataQuality: ActionDataQualitySummary | null;
};

export type RouteCalibrationContractVersions = {
  routeCalibration: RouteCalibrationContext["version"];
  plannerSnapshot: RoutePlannerSnapshot["version"] | null;
  operationalRoute: OperationalRoute["version"] | null;
  cleanupWorkload: CleanupWorkload["modelVersion"];
  effectiveVolunteerUnits: string | null;
  cigaretteButtsConversion: string | null;
  dataQuality: string | null;
};

export type RouteCalibrationSample = {
  actionId: string;
  historicalWorkload: RouteCalibrationContextCandidate[];
  volunteersPresent: number | null;
  durationMinutes: number | null;
  wasteKg: number | null;
  cigaretteButts: number | null;
  actionDate: string;
  locationLabel: string;
  plannerSnapshot: RoutePlannerSnapshot | null;
  operationalRoute: OperationalRoute | null;
  placeType: string | null;
  distance: {
    plannerRecommendedKm: number | null;
  operationalRouteKm: number | null;
  };
  duration: RouteCalibrationDuration;
  ordinaryWaste: RouteCalibrationOrdinaryWaste;
  cigaretteButtsMeasurement: RouteCalibrationCigaretteButts;
  volunteers: RouteCalibrationVolunteerData;
  participantsCount: number | null;
  effectiveVolunteerUnits: number | null;
  contractVersions: RouteCalibrationContractVersions;
  quality: RouteCalibrationQuality;
};

export type RouteCalibrationDatasetEntry =
  | { status: "included"; sample: RouteCalibrationSample }
  | {
      status: "excluded";
      actionId: string;
      reason:
        | "not_approved"
        | "missing_historical_context"
        | "invalid_historical_context"
        | "unverified_historical_context"
        | "duration_unavailable";
    };

export type RouteCalibrationDataset = {
  entries: RouteCalibrationDatasetEntry[];
  samples: RouteCalibrationSample[];
  exclusions: Extract<RouteCalibrationDatasetEntry, { status: "excluded" }>[];
  readiness: RouteCalibrationReadiness;
};

export type RouteCalibrationReadinessReason =
  | "no_samples"
  | "ordinary_waste_has_no_coverage"
  | "cigarette_butts_has_no_coverage"
  | "ordinary_waste_has_no_variation"
  | "cigarette_butts_has_no_variation"
  | "place_type_has_no_diversity"
  | "volunteer_composition_has_no_diversity"
  | "planner_snapshot_coverage_insufficient"
  | "workload_has_no_diversity"
  | "workload_and_volunteers_are_not_dissociable"
  | "historical_runtime_bridge_missing"
  | "independent_validation_unavailable";

export type RouteCalibrationReadiness = {
  calibrationStatus: "data_insufficient" | "ready";
  reasons: RouteCalibrationReadinessReason[];
  sampleCount: number;
  axisCoverage: {
    ordinaryWaste: { available: number; total: number; rate: number | null };
    cigaretteButts: { available: number; total: number; rate: number | null };
  };
  diversity: {
    ordinaryWaste: number;
    cigaretteButts: number;
    placeTypes: number;
    volunteerCompositions: number;
    historicalWorkloads: number;
  };
  plannerSnapshotCoverage: { available: number; total: number; rate: number | null };
};

export type ActiveRouteDurationArtifact = {
  artifactVersion: string;
  modelVersion: string;
  calibratedAt: string;
  estimate: (input: {
    context: RouteCalibrationContext;
  }) => { minutes: number; uncertaintyMinutes: number };
};
