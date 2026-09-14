import { ROUTE_PLANNER_PROOF_VERSION } from "./route-planner-proof-contract";

export const ROUTE_CLEANUP_DURATION_CONTRACT_VERSION =
  "route-cleanup-duration-v1" as const;
export const ROUTE_CALIBRATION_CONTEXT_VERSION =
  "action-route-calibration-v2" as const;
export const ROUTE_CALIBRATION_CONTEXT_VERIFIED_VERSION =
  "action-route-calibration-v3" as const;
export const ROUTE_CALIBRATION_CONTEXT_LEGACY_VERSION =
  "action-route-calibration-v1" as const;
export const ROUTE_PLANNER_SNAPSHOT_VERSION =
  "route-planner-snapshot-v1" as const;

export const ROUTE_CALIBRATION_STATUSES = [
  "calibrated",
  "data_insufficient",
  "unavailable",
  "excluded",
] as const;

export type RouteCalibrationStatus = (typeof ROUTE_CALIBRATION_STATUSES)[number];

export type RoutePlannerSnapshotIntegrity = {
  status: "server_verified";
  proofVersion: typeof ROUTE_PLANNER_PROOF_VERSION;
  snapshotHash: string;
  verifiedAt: string;
};
