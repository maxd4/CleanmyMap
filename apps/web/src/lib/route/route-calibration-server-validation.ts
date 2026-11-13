import type { RouteCalibrationContext } from "./route-calibration-types";
import { isServerVerifiedPlannerSnapshotContext } from "./route-calibration-validation";
import { verifyRoutePlannerProofSignature } from "./route-planner-proof";

/** Server-only trust decision for persisted planner evidence. */
export function isCryptographicallyVerifiedPlannerSnapshotContext(
  context: RouteCalibrationContext,
): boolean {
  const snapshot = context.plannerSnapshot;
  const proof = context.plannerSnapshotIntegrity?.proof;
  return Boolean(
    snapshot &&
      proof &&
      isServerVerifiedPlannerSnapshotContext(context) &&
      verifyRoutePlannerProofSignature({ proof, snapshot }).ok,
  );
}
