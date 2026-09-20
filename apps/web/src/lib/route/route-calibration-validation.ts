import { CLEANUP_WORKLOAD_MODEL_VERSION, type CleanupWorkload } from "./route-cleanup-workload";
import {
  ROUTE_CALIBRATION_CONTEXT_LEGACY_VERSION,
  ROUTE_CALIBRATION_CONTEXT_VERIFIED_VERSION,
  ROUTE_CALIBRATION_CONTEXT_VERSION,
} from "./route-calibration-contract";
import type {
  RouteCalibrationContext,
  RouteCalibrationContextCandidate,
  RoutePlannerSnapshot,
} from "./route-calibration-types";
import { isRoutePlannerSnapshot as validateRoutePlannerSnapshot } from "./route-planner-snapshot-validation";
import { hashRoutePlannerSnapshot } from "./route-planner-snapshot-hash";
import { ROUTE_PLANNER_PROOF_VERSION } from "./route-planner-proof-contract";

export function isRouteCalibrationContext(value: unknown): value is RouteCalibrationContext {
  if (!value || typeof value !== "object") return false;
  const context = value as Partial<RouteCalibrationContext>;
  return (
    (context.version === ROUTE_CALIBRATION_CONTEXT_VERSION ||
      context.version === ROUTE_CALIBRATION_CONTEXT_LEGACY_VERSION ||
      context.version === ROUTE_CALIBRATION_CONTEXT_VERIFIED_VERSION) &&
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
    context.candidates.every(isRouteCalibrationCandidate) &&
    new Set(context.candidates.map(({ candidateId }) => candidateId)).size ===
      context.candidates.length &&
    (context.plannerSnapshot === undefined ||
      validateRoutePlannerSnapshot(context.plannerSnapshot)) &&
    isCalibrationVersionIntegrityCoherent(context) &&
    (!context.plannerSnapshot ||
      isRouteCalibrationSnapshotConsistent(
        context as RouteCalibrationContext,
        context.plannerSnapshot,
      ))
  );
}

export function isServerVerifiedPlannerSnapshotContext(
  context: RouteCalibrationContext,
): boolean {
  const integrity = context.plannerSnapshotIntegrity;
  return (
    context.version === ROUTE_CALIBRATION_CONTEXT_VERIFIED_VERSION &&
    context.plannerSnapshot !== undefined &&
    validateRoutePlannerSnapshot(context.plannerSnapshot) &&
    integrity?.status === "server_verified" &&
    integrity.proofVersion === ROUTE_PLANNER_PROOF_VERSION &&
    /^[a-f0-9]{64}$/.test(integrity.snapshotHash) &&
    isIsoDate(integrity.verifiedAt) &&
    hashRoutePlannerSnapshot(context.plannerSnapshot) === integrity.snapshotHash
  );
}

function isCalibrationVersionIntegrityCoherent(
  context: Partial<RouteCalibrationContext>,
): boolean {
  if (context.version === ROUTE_CALIBRATION_CONTEXT_VERIFIED_VERSION) {
    const integrity = context.plannerSnapshotIntegrity;
    return Boolean(
      context.plannerSnapshot &&
        integrity &&
        integrity.status === "server_verified" &&
        integrity.proofVersion === ROUTE_PLANNER_PROOF_VERSION &&
        /^[a-f0-9]{64}$/.test(integrity.snapshotHash) &&
        isIsoDate(integrity.verifiedAt),
    );
  }
  return context.plannerSnapshotIntegrity === undefined;
}

function isRouteCalibrationSnapshotConsistent(
  context: Pick<
    RouteCalibrationContext,
    | "generatedAt"
    | "routeEngineVersion"
    | "cleanupWorkloadVersion"
    | "groupCount"
    | "volunteersExpected"
    | "candidates"
  >,
  snapshot: RoutePlannerSnapshot,
): boolean {
  const contextCandidateIds = context.candidates.map(({ candidateId }) => candidateId);
  return (
    context.generatedAt === snapshot.generatedAt &&
    context.routeEngineVersion === snapshot.engineVersion &&
    context.cleanupWorkloadVersion === snapshot.cleanupWorkloadVersion &&
    context.groupCount === snapshot.parameters.groupCount &&
    context.volunteersExpected === snapshot.parameters.volunteers &&
    contextCandidateIds.length === new Set(contextCandidateIds).size &&
    sameStringSet(contextCandidateIds, snapshot.selectedCandidateIds) &&
    context.candidates.every((candidate) =>
      snapshot.selectedCandidateIds.includes(candidate.candidateId) &&
      snapshot.observedCandidateIds.includes(candidate.candidateId) ===
        (candidate.family === "observed") &&
      snapshot.predictedCandidateIds.includes(candidate.candidateId) ===
        (candidate.family === "predicted"),
    )
  );
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function isRouteCalibrationCandidate(
  value: unknown,
): value is RouteCalibrationContextCandidate {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RouteCalibrationContextCandidate>;
  return (
    typeof candidate.candidateId === "string" &&
    (candidate.family === "observed" || candidate.family === "predicted") &&
    isCleanupWorkload(candidate.cleanupWorkload) &&
    candidate.cleanupWorkload.candidateId === candidate.candidateId &&
    candidate.cleanupWorkload.family === candidate.family
  );
}

const CLEANUP_WORKLOAD_VALIDATORS: Record<string, (value: unknown) => boolean> = {
  [CLEANUP_WORKLOAD_MODEL_VERSION]: isCleanupWorkloadV1,
};

function isCleanupWorkload(value: unknown): value is CleanupWorkload {
  if (!value || typeof value !== "object") return false;
  const modelVersion = (value as { modelVersion?: unknown }).modelVersion;
  return typeof modelVersion === "string" &&
    CLEANUP_WORKLOAD_VALIDATORS[modelVersion]?.(value) === true;
}

function isCleanupWorkloadV1(value: unknown): boolean {
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
    (axis.relativePressure === null ||
      (typeof axis.relativePressure === "number" &&
        Number.isFinite(axis.relativePressure) &&
        axis.relativePressure >= 0 &&
        axis.relativePressure <= 100)) &&
    (axis.observedPresence === null || typeof axis.observedPresence === "boolean") &&
    (axis.confidence === null ||
      (typeof axis.confidence === "number" &&
        Number.isFinite(axis.confidence) &&
        axis.confidence >= 0 &&
        axis.confidence <= 1))
  );
}

function isCleanupWorkloadConfidence(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const confidence = value as { ordinaryWaste?: unknown; cigaretteButts?: unknown };
  return [confidence.ordinaryWaste, confidence.cigaretteButts].every(
    (item) => item === null || (
      typeof item === "number" &&
      Number.isFinite(item) &&
      item >= 0 &&
      item <= 1
    ),
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
    (provenance.source === null ||
      provenance.source === "trash_spotter_spots" ||
      provenance.source === "urban-pressure-model") &&
    (provenance.evidenceFamily === null ||
      provenance.evidenceFamily === "observed" ||
      provenance.evidenceFamily === "predicted") &&
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
