import type {
  ActionPreparationData,
  ActionWasteBreakdown,
} from "@/lib/actions/types";
import {
  ACTION_DATA_MEASURE_LIMITS,
  type ActionDataQualitySummary,
} from "@/lib/actions/quality/data-quality-types";
import type {
  ActionVolunteerParticipation,
} from "@/lib/actions/volunteer-participation";
import {
  normalizeVolunteerParticipation,
  resolveEffectiveVolunteerUnits,
} from "@/lib/actions/volunteer-participation";
import type {
  ActionWasteMeasurementMethod,
} from "@/lib/waste/measurement";
import type {
  ActionCigaretteButtsMeasurements,
  CigaretteButtsProvenance,
} from "@/lib/waste/cigarette-butts";
import {
  CLEANUP_WORKLOAD_MODEL_VERSION,
  type CleanupWorkload,
} from "./route-cleanup-workload";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";
import type { RouteDataLayers, RouteDataStatus } from "./route-data-status";
import type { RouteGeometry, RouteStop } from "./route-contract";
import type { RoutePlanningMode } from "./route-planning-mode";
import type { RoutePlannerOrigin } from "./route-planner";
import type { RoutePredictionSummary } from "./route-predicted-targets";
import type { RoutePickupPreference } from "./route-pickup-preference";
import type { RouteOperationalBudget } from "./route-operational-budget";
import {
  normalizeActionPreparationData,
  type OperationalRoute,
} from "./route-operational";
import {
  ROUTE_CALIBRATION_CONTEXT_LEGACY_VERSION,
  ROUTE_CALIBRATION_CONTEXT_VERIFIED_VERSION,
  ROUTE_CALIBRATION_CONTEXT_VERSION,
  ROUTE_CLEANUP_DURATION_CONTRACT_VERSION,
  ROUTE_PLANNER_SNAPSHOT_VERSION,
} from "./route-calibration-contract";
import type {
  RouteCalibrationStatus,
  RoutePlannerSnapshotIntegrity,
} from "./route-calibration-contract";
import {
  isRouteCalibrationContext,
  isServerVerifiedPlannerSnapshotContext,
} from "./route-calibration-validation";
export {
  ROUTE_CALIBRATION_CONTEXT_LEGACY_VERSION,
  ROUTE_CALIBRATION_CONTEXT_VERIFIED_VERSION,
  ROUTE_CALIBRATION_CONTEXT_VERSION,
  ROUTE_CALIBRATION_STATUSES,
  ROUTE_CLEANUP_DURATION_CONTRACT_VERSION,
  ROUTE_PLANNER_SNAPSHOT_VERSION,
} from "./route-calibration-contract";
export type {
  RouteCalibrationStatus,
  RoutePlannerSnapshotIntegrity,
} from "./route-calibration-contract";
export {
  isRouteCalibrationContext,
  isServerVerifiedPlannerSnapshotContext,
} from "./route-calibration-validation";
import type { PlannerWeatherContext } from "@/lib/weather/planner-weather";

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

export function buildRouteCalibrationContext(input: {
  generatedAt: string;
  routeEngineVersion: string;
  volunteersExpected: number;
  groupCount: number;
  candidates: readonly RouteCalibrationContextCandidate[];
  plannerSnapshot?: RoutePlannerSnapshot;
}): RouteCalibrationContext {
  return {
    version: ROUTE_CALIBRATION_CONTEXT_VERSION,
    generatedAt: input.generatedAt,
    routeEngineVersion: input.routeEngineVersion,
    cleanupWorkloadVersion: CLEANUP_WORKLOAD_MODEL_VERSION,
    volunteersExpected: input.volunteersExpected,
    groupCount: input.groupCount,
    candidates: input.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      family: candidate.family,
      cleanupWorkload: structuredClone(candidate.cleanupWorkload),
    })),
    ...(input.plannerSnapshot
      ? { plannerSnapshot: structuredClone(input.plannerSnapshot) }
      : {}),
  };
}

export function buildVerifiedRouteCalibrationContext(input: {
  generatedAt: string;
  routeEngineVersion: string;
  volunteersExpected: number;
  groupCount: number;
  candidates: readonly RouteCalibrationContextCandidate[];
  plannerSnapshot: RoutePlannerSnapshot;
  plannerSnapshotIntegrity: RoutePlannerSnapshotIntegrity;
}): RouteCalibrationContext {
  return {
    ...buildRouteCalibrationContext(input),
    version: ROUTE_CALIBRATION_CONTEXT_VERIFIED_VERSION,
    plannerSnapshotIntegrity: structuredClone(input.plannerSnapshotIntegrity),
  };
}

export function buildRoutePlannerSnapshot(input: {
  generatedAt: string;
  engineVersion: string;
  selectedCandidates: readonly RouteCalibrationContextCandidate[];
  selectedStops: readonly RouteStop[];
  origin: RoutePlannerOrigin;
  planningMode: RoutePlanningMode;
  travelBudgetMinutes: number;
  maxStops: number;
  priorityVsTravel: number;
  pickupPreference: RoutePickupPreference;
  effectiveRiskFocus: "all" | "waste" | "cigaretteButts";
  volunteers: number;
  groupCount: number;
  routeGeometry: RouteGeometry;
  travelDistanceKm: number;
  travelMinutes: number;
  returnDistanceKm: number;
  returnMinutes: number;
  groups: readonly RoutePlannerSnapshotGroup[];
  dataStatus: RouteDataStatus;
  dataLayers: RouteDataLayers;
  sourceHealth: UnifiedSourceHealth;
  prediction: RoutePredictionSummary | null;
  durationModelVersion?: string | null;
  weatherContext?: PlannerWeatherContext;
}): RoutePlannerSnapshot {
  const selectedCandidates = input.selectedCandidates.map((candidate) =>
    structuredClone(candidate),
  );
  const observedCandidateIds = selectedCandidates
    .filter((candidate) => candidate.family === "observed")
    .map((candidate) => candidate.candidateId);
  const predictedCandidateIds = selectedCandidates
    .filter((candidate) => candidate.family === "predicted")
    .map((candidate) => candidate.candidateId);
  const predictionModelVersion = input.prediction?.modelVersion ?? null;

  return {
    version: ROUTE_PLANNER_SNAPSHOT_VERSION,
    generatedAt: input.generatedAt,
    engineVersion: input.engineVersion,
    cleanupWorkloadVersion: CLEANUP_WORKLOAD_MODEL_VERSION,
    modelVersions: {
      planner: input.engineVersion,
      cleanupWorkload: CLEANUP_WORKLOAD_MODEL_VERSION,
      prediction: predictionModelVersion,
      duration: input.durationModelVersion ?? null,
    },
    parameters: {
      origin: structuredClone(input.origin),
      planningMode: structuredClone(input.planningMode),
      travelBudgetMinutes: input.travelBudgetMinutes,
      maxStops: input.maxStops,
      priorityVsTravel: input.priorityVsTravel,
      pickupPreference: input.pickupPreference,
      effectiveRiskFocus: input.effectiveRiskFocus,
      volunteers: input.volunteers,
      groupCount: input.groupCount,
    },
    selectedCandidateIds: selectedCandidates.map((candidate) => candidate.candidateId),
    observedCandidateIds,
    predictedCandidateIds,
    selectedStops: input.selectedStops.map((stop) => structuredClone(stop)),
    distance: {
      totalKm: input.travelDistanceKm,
      travelMinutes: input.travelMinutes,
      returnDistanceKm: input.returnDistanceKm,
      returnMinutes: input.returnMinutes,
    },
    geometry: structuredClone(input.routeGeometry),
    groups: input.groups.map((group) => structuredClone(group)),
    provenance: {
      dataStatus: input.dataStatus,
      dataLayers: structuredClone(input.dataLayers),
      sourceHealth: structuredClone(input.sourceHealth),
      prediction: input.prediction ? structuredClone(input.prediction) : null,
    },
    ...(input.weatherContext
      ? { weatherContext: structuredClone(input.weatherContext) }
      : {}),
  };
}

export function buildCalibrationDataset(
  actions: readonly ApprovedActionForCalibration[],
  options: {
    independentValidationAvailable?: boolean;
    requireVerifiedPlannerProvenance?: boolean;
  } = {},
): RouteCalibrationDataset {
  const entries = actions.map((action) =>
    buildCalibrationDatasetEntry(action, options),
  );
  const samples = entries.flatMap((entry) => (entry.status === "included" ? [entry.sample] : []));
  return {
    entries,
    samples,
    exclusions: entries.flatMap((entry) => (entry.status === "excluded" ? [entry] : [])),
    readiness: assessRouteCalibrationReadiness({
      samples,
      runtimeHistoricalBridgeAvailable: samples.length > 0,
      independentValidationAvailable: options.independentValidationAvailable,
    }),
  };
}

function buildCalibrationDatasetEntry(
  action: ApprovedActionForCalibration,
  options: { requireVerifiedPlannerProvenance?: boolean },
): RouteCalibrationDatasetEntry {
  if (action.status !== "approved") {
    return { status: "excluded", actionId: action.id, reason: "not_approved" };
  }

  const context = action.preparationData?.routeCalibrationContext;
  if (!context) {
    return {
      status: "excluded",
      actionId: action.id,
      reason: "missing_historical_context",
    };
  }
  if (!isRouteCalibrationContext(context)) {
    return {
      status: "excluded",
      actionId: action.id,
      reason: "invalid_historical_context",
    };
  }
  const requireVerifiedPlannerProvenance =
    options.requireVerifiedPlannerProvenance ?? true;
  if (
    requireVerifiedPlannerProvenance &&
    !isServerVerifiedPlannerSnapshotContext(context)
  ) {
    return {
      status: "excluded",
      actionId: action.id,
      reason: "unverified_historical_context",
    };
  }

  const plannerSnapshot = context.plannerSnapshot
    ? structuredClone(context.plannerSnapshot)
    : null;
  const preparationData = action.preparationData
    ? normalizeActionPreparationData(action.preparationData)
    : null;
  const operationalRoute = preparationData?.operationalRoute
    ? structuredClone(preparationData.operationalRoute)
    : null;
  const volunteerInput = action.volunteerParticipation ??
    preparationData?.volunteerParticipation ??
    null;
  const normalizedVolunteers = volunteerInput
    ? normalizeVolunteerParticipation(volunteerInput)
    : null;
  const volunteerData = normalizedVolunteers ?? {
    childrenCount: null,
    adultCount: null,
    retiredCount: null,
    participantsCount: null,
    effectiveVolunteerUnits: null,
    effectiveVolunteerUnitsFormulaVersion: null,
  };
  const participantsCount = resolveNullableParticipantsCount(
    normalizedVolunteers,
    action.volunteersCount,
  );
  const effectiveVolunteerUnits = resolveEffectiveVolunteerUnits(normalizedVolunteers);
  const ordinaryWasteProvenance = resolveWasteProvenance(
    action.wasteKg,
    action.wasteMeasurementMethod,
  );
  const cigaretteButtsMeasurements = action.cigaretteButtsMeasurements
    ? structuredClone(action.cigaretteButtsMeasurements)
    : null;
  const cigaretteButtsProvenance = cigaretteButtsMeasurements
    ? resolveCigaretteButtsProvenance(cigaretteButtsMeasurements)
    : action.cigaretteButts === null
      ? "missing"
      : "unknown";
  const durationMinutes = isPlausibleDuration(action.durationMinutes)
    ? action.durationMinutes
    : null;
  const missing = resolveMissingDatasetFields({
    action,
    participantsCount,
    cigaretteButtsMeasurements,
    plannerSnapshot,
    operationalRoute,
  });

  return {
    status: "included",
    sample: {
      actionId: action.id,
      historicalWorkload: context.candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        family: candidate.family,
        cleanupWorkload: structuredClone(candidate.cleanupWorkload),
      })),
      volunteersPresent: participantsCount,
      durationMinutes,
      wasteKg: finiteNonNegativeNullable(action.wasteKg) ? action.wasteKg : null,
      cigaretteButts: finiteNonNegativeNullable(action.cigaretteButts)
        ? action.cigaretteButts
        : cigaretteButtsMeasurements?.cigaretteButtsCount ?? null,
      actionDate: action.actionDate,
      locationLabel: action.locationLabel,
      plannerSnapshot,
      operationalRoute,
      placeType: action.placeType ?? preparationData?.placeType ?? null,
      distance: {
        plannerRecommendedKm: finiteNonNegativeNullable(plannerSnapshot?.distance.totalKm)
          ? plannerSnapshot.distance.totalKm
          : null,
        operationalRouteKm: resolveOperationalRouteDistanceKm(operationalRoute),
      },
      duration: {
        totalMinutes: durationMinutes,
        definition: "walking_plus_collection_sorting_weighing",
        source: durationMinutes === null ? "missing" : "action.duration_minutes",
        components: {
          walkingMinutes: null,
          collectionMinutes: null,
          sortingMinutes: null,
          weighingMinutes: null,
        },
      },
      ordinaryWaste: {
        wasteKg: finiteNonNegativeNullable(action.wasteKg) ? action.wasteKg : null,
        measurementMethod: action.wasteMeasurementMethod ?? null,
        provenance: ordinaryWasteProvenance,
        breakdown: action.wasteBreakdown ? structuredClone(action.wasteBreakdown) : null,
      },
      cigaretteButtsMeasurement: {
        measurements: cigaretteButtsMeasurements,
        legacyCount: cigaretteButtsMeasurements ? null : action.cigaretteButts,
        provenance: cigaretteButtsProvenance,
      },
      volunteers: volunteerData,
      participantsCount,
      effectiveVolunteerUnits,
      contractVersions: {
        routeCalibration: context.version,
        plannerSnapshot: plannerSnapshot?.version ?? null,
        operationalRoute: operationalRoute?.version ?? null,
        cleanupWorkload: context.cleanupWorkloadVersion,
        effectiveVolunteerUnits:
          volunteerData.effectiveVolunteerUnitsFormulaVersion,
        cigaretteButtsConversion:
          cigaretteButtsMeasurements?.cigaretteButtsConversionFormulaVersion ?? null,
        dataQuality: action.dataQuality?.version ?? null,
      },
      quality: {
        status: missing.length === 0
          ? "complete"
          : (finiteNonNegativeNullable(action.wasteKg) ||
              finiteNonNegativeNullable(action.cigaretteButts) ||
              cigaretteButtsMeasurements?.cigaretteButtsCount != null)
            ? "partial"
            : "insufficient",
        ordinaryWasteAvailable: finiteNonNegativeNullable(action.wasteKg),
        cigaretteButtsAvailable:
          finiteNonNegativeNullable(action.cigaretteButts) ||
          cigaretteButtsMeasurements?.cigaretteButtsCount != null,
        missing,
        dataQuality: action.dataQuality ? structuredClone(action.dataQuality) : null,
      },
    },
  };
}

export function assessRouteCalibrationReadiness(input: {
  samples: readonly RouteCalibrationSample[];
  runtimeHistoricalBridgeAvailable?: boolean;
  independentValidationAvailable?: boolean;
}): RouteCalibrationReadiness {
  const sampleCount = input.samples.length;
  const wasteSamples = input.samples.filter((sample) => sample.wasteKg !== null);
  const buttsSamples = input.samples.filter((sample) => sample.cigaretteButts !== null);
  const plannerSnapshotSamples = input.samples.filter(
    (sample) => sample.plannerSnapshot !== null,
  );
  const workloadSignatures = new Set(
    input.samples.map((sample) => JSON.stringify(sample.historicalWorkload)),
  );
  const wasteValues = new Set(wasteSamples.map((sample) => sample.wasteKg));
  const buttsValues = new Set(buttsSamples.map((sample) => sample.cigaretteButts));
  const volunteerValues = new Set(
    input.samples
      .map((sample) => sample.volunteersPresent)
      .filter((value): value is number => value !== null),
  );
  const placeTypes = new Set(
    input.samples
      .map((sample) => sample.placeType)
      .filter((value): value is string => Boolean(value)),
  );
  const volunteerCompositions = new Set(
    input.samples
      .map((sample) => JSON.stringify({
        childrenCount: sample.volunteers.childrenCount,
        adultCount: sample.volunteers.adultCount,
        retiredCount: sample.volunteers.retiredCount,
      }))
      .filter((value) => value !== JSON.stringify({
        childrenCount: null,
        adultCount: null,
        retiredCount: null,
      })),
  );
  const repeatedWorkloadWithDifferentVolunteers = hasRepeatedKeyWithDifferentValue(
    input.samples,
    (sample) => JSON.stringify(sample.historicalWorkload),
    (sample) => String(sample.volunteersPresent),
  );
  const repeatedVolunteersWithDifferentWorkload = hasRepeatedKeyWithDifferentValue(
    input.samples,
    (sample) => String(sample.volunteersPresent),
    (sample) => JSON.stringify(sample.historicalWorkload),
  );
  const reasons: RouteCalibrationReadinessReason[] = [];

  if (sampleCount === 0) reasons.push("no_samples");
  if (wasteSamples.length === 0) {
    reasons.push("ordinary_waste_has_no_coverage");
  } else if (wasteValues.size < 2) {
    reasons.push("ordinary_waste_has_no_variation");
  }
  if (buttsSamples.length === 0) {
    reasons.push("cigarette_butts_has_no_coverage");
  } else if (buttsValues.size < 2) {
    reasons.push("cigarette_butts_has_no_variation");
  }
  if (placeTypes.size < 2) reasons.push("place_type_has_no_diversity");
  if (volunteerCompositions.size < 2) {
    reasons.push("volunteer_composition_has_no_diversity");
  }
  if (workloadSignatures.size < 2) reasons.push("workload_has_no_diversity");
  if (
    !repeatedWorkloadWithDifferentVolunteers ||
    !repeatedVolunteersWithDifferentWorkload ||
    volunteerValues.size < 2
  ) {
    reasons.push("workload_and_volunteers_are_not_dissociable");
  }
  if (!input.runtimeHistoricalBridgeAvailable) {
    reasons.push("historical_runtime_bridge_missing");
  }
  if (plannerSnapshotSamples.length < sampleCount) {
    reasons.push("planner_snapshot_coverage_insufficient");
  }
  if (!input.independentValidationAvailable) {
    reasons.push("independent_validation_unavailable");
  }

  return {
    calibrationStatus: reasons.length === 0 ? "ready" : "data_insufficient",
    reasons,
    sampleCount,
    axisCoverage: {
      ordinaryWaste: coverage(wasteSamples.length, sampleCount),
      cigaretteButts: coverage(buttsSamples.length, sampleCount),
    },
    diversity: {
      ordinaryWaste: wasteValues.size,
      cigaretteButts: buttsValues.size,
      placeTypes: placeTypes.size,
      volunteerCompositions: volunteerCompositions.size,
      historicalWorkloads: workloadSignatures.size,
    },
    plannerSnapshotCoverage: coverage(plannerSnapshotSamples.length, sampleCount),
  };
}

export function estimateRouteCleanupDuration(input: {
  context?: RouteCalibrationContext | null;
  artifact?: ActiveRouteDurationArtifact | null;
}): RouteCleanupDurationEstimate {
  if (!input.context) {
    return unavailableEstimate("missing_historical_context", null);
  }
  if (!input.artifact) {
    return unavailableEstimate("no_active_calibrated_artifact", input.context);
  }
  const result = input.artifact.estimate({ context: input.context });
  return {
    contractVersion: ROUTE_CLEANUP_DURATION_CONTRACT_VERSION,
    minutes: result.minutes,
    uncertaintyMinutes: result.uncertaintyMinutes,
    modelVersion: input.artifact.modelVersion,
    calibrationStatus: "calibrated",
    reason: "active_calibrated_artifact",
    provenance: {
      source: "route-calibration",
      contextVersion: input.context.version,
      artifactVersion: input.artifact.artifactVersion,
    },
  };
}

function unavailableEstimate(
  reason: string,
  context: RouteCalibrationContext | null,
): RouteCleanupDurationEstimate {
  return {
    contractVersion: ROUTE_CLEANUP_DURATION_CONTRACT_VERSION,
    minutes: null,
    uncertaintyMinutes: null,
    modelVersion: ROUTE_CLEANUP_DURATION_CONTRACT_VERSION,
    calibrationStatus: "data_insufficient",
    reason,
    provenance: {
      source: "route-calibration",
      contextVersion: context?.version ?? null,
      artifactVersion: null,
    },
  };
}

export function preserveHistoricalRouteCalibrationContext(
  current: ActionPreparationData | null | undefined,
  incoming: ActionPreparationData | null | undefined,
): ActionPreparationData {
  const currentContext = current?.routeCalibrationContext;
  const next = incoming ?? {};
  if (!currentContext) return next;

  if (
    next.routeCalibrationContext !== undefined &&
    JSON.stringify(next.routeCalibrationContext) !== JSON.stringify(currentContext)
  ) {
    throw new Error("Le contexte historique de calibration ne peut pas être réécrit.");
  }
  return { ...next, routeCalibrationContext: structuredClone(currentContext) };
}

function resolveNullableParticipantsCount(
  participation: ActionVolunteerParticipation | null,
  legacyVolunteersCount: number | null,
): number | null {
  if (participation?.participantsCount !== null && participation?.participantsCount !== undefined) {
    return finiteNonNegativeNullable(participation.participantsCount)
      ? Math.trunc(participation.participantsCount)
      : null;
  }
  return finiteNonNegativeNullable(legacyVolunteersCount)
    ? Math.trunc(legacyVolunteersCount)
    : null;
}

function resolveWasteProvenance(
  wasteKg: number | null,
  method: ActionWasteMeasurementMethod | null | undefined,
): RouteCalibrationMeasurementProvenance {
  if (!finiteNonNegativeNullable(wasteKg)) return "missing";
  if (method === "estimation_visuelle") return "estimated";
  if (method === "balance_suspendue" || method === "balance_au_sol") {
    return "measured";
  }
  return "unknown";
}

function resolveCigaretteButtsProvenance(
  measurements: ActionCigaretteButtsMeasurements,
): CigaretteButtsProvenance | "missing" {
  if (measurements.cigaretteButtsCount !== null) {
    return measurements.cigaretteButtsCountProvenance;
  }
  if (measurements.cigaretteButtsMassKg !== null) {
    return measurements.cigaretteButtsMassProvenance;
  }
  if (measurements.cigaretteButtsVolumeLiters !== null) {
    return measurements.cigaretteButtsVolumeProvenance;
  }
  return "missing";
}

function resolveOperationalRouteDistanceKm(operationalRoute: OperationalRoute | null): number | null {
  if (!operationalRoute || operationalRoute.routes.length === 0) return null;
  const distances = operationalRoute.routes.map((route) => route.geometry.distanceKm);
  return distances.every((distance) => finiteNonNegativeNullable(distance))
    ? distances.reduce((total, distance) => total + distance, 0)
    : null;
}

function resolveMissingDatasetFields(input: {
  action: ApprovedActionForCalibration;
  participantsCount: number | null;
  cigaretteButtsMeasurements: ActionCigaretteButtsMeasurements | null;
  plannerSnapshot: RoutePlannerSnapshot | null;
  operationalRoute: OperationalRoute | null;
}): string[] {
  const missing: string[] = [];
  if (!finiteNonNegativeNullable(input.action.wasteKg)) missing.push("ordinaryWaste.wasteKg");
  const cigaretteButtsAvailable =
    finiteNonNegativeNullable(input.action.cigaretteButts) ||
    input.cigaretteButtsMeasurements?.cigaretteButtsCount != null;
  if (!cigaretteButtsAvailable) missing.push("cigaretteButts.count");
  if (!isPlausibleDuration(input.action.durationMinutes)) missing.push("durationMinutes");
  if (input.participantsCount === null) missing.push("participantsCount");
  if (!input.plannerSnapshot) missing.push("plannerSnapshot");
  if (!input.operationalRoute) missing.push("operationalRoute");
  if (!input.action.placeType && !input.action.preparationData?.placeType) {
    missing.push("placeType");
  }
  return missing;
}

function coverage(available: number, total: number): {
  available: number;
  total: number;
  rate: number | null;
} {
  return {
    available,
    total,
    rate: total === 0 ? null : available / total,
  };
}

function isPlausibleDuration(value: number | null | undefined): value is number {
  return (
    finiteNonNegativeNullable(value) &&
    value <= ACTION_DATA_MEASURE_LIMITS.durationMinutesMax
  );
}

function hasRepeatedKeyWithDifferentValue<T>(
  samples: readonly T[],
  key: (sample: T) => string,
  value: (sample: T) => number | string,
): boolean {
  const valuesByKey = new Map<string, Set<number | string>>();
  for (const sample of samples) {
    const values = valuesByKey.get(key(sample)) ?? new Set<number | string>();
    values.add(value(sample));
    valuesByKey.set(key(sample), values);
  }
  return [...valuesByKey.values()].some((values) => values.size > 1);
}

function finiteNonNegativeNullable(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
