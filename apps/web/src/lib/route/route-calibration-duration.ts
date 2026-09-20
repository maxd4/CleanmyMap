import { ROUTE_CLEANUP_DURATION_CONTRACT_VERSION } from "./route-calibration-contract";
import type {
  ActiveRouteDurationArtifact,
  RouteCalibrationContext,
  RouteCleanupDurationEstimate,
} from "./route-calibration-types";

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
