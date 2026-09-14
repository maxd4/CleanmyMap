import type { CreateActionPayload } from "@/lib/actions/types";
import {
  buildVerifiedRouteCalibrationContext,
  isRouteCalibrationContext,
} from "./route-calibration";
import { verifyRoutePlannerProof } from "./route-planner-proof";

export class PlannerSnapshotTrustError extends Error {
  constructor(
    public readonly reason:
      | "missing"
      | "invalid_context"
      | "invalid_proof"
      | "expired_proof"
      | "snapshot_mismatch",
  ) {
    super("La preuve du snapshot planner est invalide.");
    this.name = "PlannerSnapshotTrustError";
  }
}

export function promoteVerifiedPlannerContext(
  payload: CreateActionPayload,
  now = new Date(),
): CreateActionPayload {
  const context = payload.preparationData?.routeCalibrationContext ??
    payload.routeCalibrationContext ??
    null;
  if (!context?.plannerSnapshot) return payload;
  if (!isRouteCalibrationContext(context)) {
    throw new PlannerSnapshotTrustError("invalid_context");
  }
  if (!payload.plannerSnapshotProof) {
    throw new PlannerSnapshotTrustError("missing");
  }

  let verification: ReturnType<typeof verifyRoutePlannerProof>;
  try {
    verification = verifyRoutePlannerProof({
      proof: payload.plannerSnapshotProof,
      snapshot: context.plannerSnapshot,
      now,
    });
  } catch {
    throw new PlannerSnapshotTrustError("invalid_proof");
  }
  if (!verification.ok) {
    throw new PlannerSnapshotTrustError(
      verification.reason === "expired"
        ? "expired_proof"
        : verification.reason === "snapshot_mismatch"
          ? "snapshot_mismatch"
          : "invalid_proof",
    );
  }

  const verifiedContext = buildVerifiedRouteCalibrationContext({
    generatedAt: context.generatedAt,
    routeEngineVersion: context.routeEngineVersion,
    volunteersExpected: context.volunteersExpected,
    groupCount: context.groupCount,
    candidates: context.candidates,
    plannerSnapshot: context.plannerSnapshot,
    plannerSnapshotIntegrity: {
      status: "server_verified",
      proofVersion: payload.plannerSnapshotProof.proofVersion,
      snapshotHash: verification.snapshotHash,
      verifiedAt: now.toISOString(),
    },
  });
  return {
    ...payload,
    routeCalibrationContext: verifiedContext,
    plannerSnapshotProof: null,
    preparationData: {
      ...(payload.preparationData ?? {}),
      routeCalibrationContext: verifiedContext,
    },
  };
}
