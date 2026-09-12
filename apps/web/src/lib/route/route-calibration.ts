import type { ActionPreparationData } from "@/lib/actions/types";
import {
  CLEANUP_WORKLOAD_MODEL_VERSION,
  type CleanupWorkload,
} from "./route-cleanup-workload";

export const ROUTE_CLEANUP_DURATION_CONTRACT_VERSION =
  "route-cleanup-duration-v1" as const;
export const ROUTE_CALIBRATION_CONTEXT_VERSION =
  "action-route-calibration-v1" as const;

export const ROUTE_CALIBRATION_STATUSES = [
  "calibrated",
  "data_insufficient",
  "unavailable",
  "excluded",
] as const;

export type RouteCalibrationStatus = (typeof ROUTE_CALIBRATION_STATUSES)[number];

export type RouteCleanupDurationEstimate = {
  contractVersion: typeof ROUTE_CLEANUP_DURATION_CONTRACT_VERSION;
  minutes: number | null;
  uncertaintyMinutes: number | null;
  modelVersion: string;
  calibrationStatus: RouteCalibrationStatus;
  reason: string;
  provenance: {
    source: "route-calibration";
    contextVersion: typeof ROUTE_CALIBRATION_CONTEXT_VERSION | null;
    artifactVersion: string | null;
  };
};

export type RouteCalibrationContextCandidate = {
  candidateId: string;
  family: "observed" | "predicted";
  cleanupWorkload: CleanupWorkload;
};

export type RouteCalibrationContext = {
  version: typeof ROUTE_CALIBRATION_CONTEXT_VERSION;
  generatedAt: string;
  routeEngineVersion: string;
  cleanupWorkloadVersion: CleanupWorkload["modelVersion"];
  volunteersExpected: number;
  groupCount: number;
  candidates: RouteCalibrationContextCandidate[];
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
};

export type RouteCalibrationSample = {
  actionId: string;
  historicalWorkload: RouteCalibrationContextCandidate[];
  volunteersPresent: number;
  durationMinutes: number;
  wasteKg: number;
  cigaretteButts: number;
  actionDate: string;
  locationLabel: string;
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
        | "duration_unavailable";
    };

export type RouteCalibrationDataset = {
  entries: RouteCalibrationDatasetEntry[];
  samples: RouteCalibrationSample[];
  exclusions: Extract<RouteCalibrationDatasetEntry, { status: "excluded" }>[];
  readiness: RouteCalibrationReadiness;
};

export type RouteCalibrationReadinessReason =
  | "ordinary_waste_has_no_variation"
  | "workload_has_no_diversity"
  | "workload_and_volunteers_are_not_dissociable"
  | "historical_runtime_bridge_missing"
  | "independent_validation_unavailable";

export type RouteCalibrationReadiness = {
  calibrationStatus: "data_insufficient" | "ready";
  reasons: RouteCalibrationReadinessReason[];
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
  };
}

export function buildCalibrationDataset(
  actions: readonly ApprovedActionForCalibration[],
  options: { independentValidationAvailable?: boolean } = {},
): RouteCalibrationDataset {
  const entries = actions.map(buildCalibrationDatasetEntry);
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
  if (
    !finitePositive(action.durationMinutes) ||
    !finiteNonNegative(action.volunteersCount) ||
    !finiteNonNegative(action.wasteKg) ||
    !finiteNonNegative(action.cigaretteButts)
  ) {
    return { status: "excluded", actionId: action.id, reason: "duration_unavailable" };
  }

  return {
    status: "included",
    sample: {
      actionId: action.id,
      historicalWorkload: context.candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        family: candidate.family,
        cleanupWorkload: structuredClone(candidate.cleanupWorkload),
      })),
      volunteersPresent: action.volunteersCount,
      durationMinutes: action.durationMinutes,
      wasteKg: action.wasteKg,
      cigaretteButts: action.cigaretteButts,
      actionDate: action.actionDate,
      locationLabel: action.locationLabel,
    },
  };
}

export function assessRouteCalibrationReadiness(input: {
  samples: readonly RouteCalibrationSample[];
  runtimeHistoricalBridgeAvailable?: boolean;
  independentValidationAvailable?: boolean;
}): RouteCalibrationReadiness {
  const workloadSignatures = new Set(
    input.samples.map((sample) => JSON.stringify(sample.historicalWorkload)),
  );
  const wasteValues = new Set(input.samples.map((sample) => sample.wasteKg));
  const volunteerValues = new Set(input.samples.map((sample) => sample.volunteersPresent));
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

  if (wasteValues.size < 2) reasons.push("ordinary_waste_has_no_variation");
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
  if (!input.independentValidationAvailable) {
    reasons.push("independent_validation_unavailable");
  }

  return {
    calibrationStatus: reasons.length === 0 ? "ready" : "data_insufficient",
    reasons,
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

export function isRouteCalibrationContext(value: unknown): value is RouteCalibrationContext {
  if (!value || typeof value !== "object") return false;
  const context = value as Partial<RouteCalibrationContext>;
  return (
    context.version === ROUTE_CALIBRATION_CONTEXT_VERSION &&
    isIsoDate(context.generatedAt) &&
    typeof context.routeEngineVersion === "string" &&
    context.routeEngineVersion.length > 0 &&
    context.cleanupWorkloadVersion === CLEANUP_WORKLOAD_MODEL_VERSION &&
    typeof context.volunteersExpected === "number" &&
    Number.isInteger(context.volunteersExpected) &&
    context.volunteersExpected >= 0 &&
    context.volunteersExpected <= 500 &&
    typeof context.groupCount === "number" &&
    Number.isInteger(context.groupCount) &&
    context.groupCount >= 1 &&
    context.groupCount <= 12 &&
    Array.isArray(context.candidates) &&
    context.candidates.every(isRouteCalibrationCandidate)
  );
}

function isRouteCalibrationCandidate(value: unknown): value is RouteCalibrationContextCandidate {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RouteCalibrationContextCandidate>;
  return (
    typeof candidate.candidateId === "string" &&
    (candidate.family === "observed" || candidate.family === "predicted") &&
    isCleanupWorkload(candidate.cleanupWorkload)
  );
}

function isCleanupWorkload(value: unknown): value is CleanupWorkload {
  if (!value || typeof value !== "object") return false;
  const workload = value as Partial<CleanupWorkload>;
  return (
    workload.modelVersion === CLEANUP_WORKLOAD_MODEL_VERSION &&
    typeof workload.candidateId === "string" &&
    workload.candidateId.length > 0 &&
    (workload.family === "observed" || workload.family === "predicted") &&
    ["relative_estimate", "presence_only", "unavailable", "excluded"].includes(workload.status ?? "") &&
    isCleanupWorkloadAxis(workload.ordinaryWaste) &&
    isCleanupWorkloadAxis(workload.cigaretteButts) &&
    isCleanupWorkloadConfidence(workload.confidence) &&
    isCleanupWorkloadProvenance(workload.provenance) &&
    (workload.exclusionReason === null || typeof workload.exclusionReason === "string")
  );
}

function isCleanupWorkloadAxis(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const axis = value as {
    relativePressure?: unknown;
    observedPresence?: unknown;
    confidence?: unknown;
  };
  return (
    (axis.relativePressure === null || (typeof axis.relativePressure === "number" && axis.relativePressure >= 0 && axis.relativePressure <= 100)) &&
    (axis.observedPresence === null || typeof axis.observedPresence === "boolean") &&
    (axis.confidence === null || (typeof axis.confidence === "number" && axis.confidence >= 0 && axis.confidence <= 1))
  );
}

function isCleanupWorkloadConfidence(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const confidence = value as { ordinaryWaste?: unknown; cigaretteButts?: unknown };
  return [confidence.ordinaryWaste, confidence.cigaretteButts].every(
    (item) => item === null || (typeof item === "number" && item >= 0 && item <= 1),
  );
}

function isCleanupWorkloadProvenance(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const provenance = value as {
    source?: unknown;
    evidenceFamily?: unknown;
    observedAt?: unknown;
    zoneId?: unknown;
    sourceModelVersion?: unknown;
    snapshotId?: unknown;
    sourceProvenance?: unknown;
  };
  return (
    (provenance.source === null || provenance.source === "trash_spotter_spots" || provenance.source === "urban-pressure-model") &&
    (provenance.evidenceFamily === null || provenance.evidenceFamily === "observed" || provenance.evidenceFamily === "predicted") &&
    (provenance.observedAt === null || typeof provenance.observedAt === "string") &&
    (provenance.zoneId === null || typeof provenance.zoneId === "string") &&
    (provenance.sourceModelVersion === null || typeof provenance.sourceModelVersion === "string") &&
    (provenance.snapshotId === null || typeof provenance.snapshotId === "string") &&
    Array.isArray(provenance.sourceProvenance)
  );
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
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

function finitePositive(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function finiteNonNegative(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
