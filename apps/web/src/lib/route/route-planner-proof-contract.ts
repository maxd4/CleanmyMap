export const ROUTE_PLANNER_PROOF_VERSION = "route-planner-proof-v1" as const;
export const ROUTE_PLANNER_PROOF_TTL_SECONDS = 30 * 60;

export type RoutePlannerProof = {
  proofVersion: typeof ROUTE_PLANNER_PROOF_VERSION;
  snapshotHash: string;
  issuedAt: string;
  expiresAt: string;
  token: string;
};

export function isRoutePlannerProofShape(
  value: unknown,
): value is RoutePlannerProof {
  if (!value || typeof value !== "object") return false;
  const proof = value as Partial<RoutePlannerProof>;
  return (
    proof.proofVersion === ROUTE_PLANNER_PROOF_VERSION &&
    typeof proof.snapshotHash === "string" &&
    /^[a-f0-9]{64}$/.test(proof.snapshotHash) &&
    isIsoDate(proof.issuedAt) &&
    isIsoDate(proof.expiresAt) &&
    Date.parse(proof.expiresAt) > Date.parse(proof.issuedAt) &&
    typeof proof.token === "string" &&
    proof.token.length > 0
  );
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}
