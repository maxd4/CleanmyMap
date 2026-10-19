import type { ActionRoleAttestationStatus } from "./role-attestations";

export type RoleAttestationPolicyInput = {
  actionFinalized: boolean;
  participationStatus: string | null | undefined;
  reviewerAuthorized: boolean;
  reviewerIsGlobalAdmin: boolean;
  reviewerUserId: string;
  targetUserId: string;
  hasPlannedAssignment: boolean;
  decision: "confirm" | "reject";
  reason: string | null | undefined;
  currentStatus?: ActionRoleAttestationStatus | null;
  currentReviewerUserId?: string | null;
  currentDecisionReason?: string | null;
};

export type RoleAttestationPolicyResult =
  | { allowed: true; status: "confirmed" | "rejected" }
  | { allowed: false; status: "pending" | "denied"; reason: string };

export function evaluateRoleAttestationPolicy(input: RoleAttestationPolicyInput): RoleAttestationPolicyResult {
  const reason = input.reason?.trim() || null;
  if (!input.actionFinalized) return { allowed: false, status: "denied", reason: "action_not_finalized" };
  if (input.participationStatus !== "confirmed") return { allowed: false, status: "denied", reason: "confirmed_participation_required" };
  if (!input.reviewerAuthorized) return { allowed: false, status: "denied", reason: "reviewer_not_authorized" };
  if (input.reviewerUserId === input.targetUserId && !input.reviewerIsGlobalAdmin) {
    return { allowed: false, status: "pending", reason: "independent_reviewer_required" };
  }
  if (!input.hasPlannedAssignment && !reason) return { allowed: false, status: "denied", reason: "retrospective_reason_required" };
  if (input.decision === "reject" && !reason) return { allowed: false, status: "denied", reason: "rejection_reason_required" };
  const desiredStatus = input.decision === "confirm" ? "confirmed" : "rejected";
  const isIdenticalTerminalRetry = input.currentStatus === desiredStatus
    && input.currentReviewerUserId?.trim() === input.reviewerUserId.trim()
    && (input.currentDecisionReason?.trim() || null) === reason;
  if (isIdenticalTerminalRetry) return { allowed: true, status: desiredStatus };
  if (input.currentStatus && input.currentStatus !== "pending" && !reason) {
    return { allowed: false, status: "denied", reason: "correction_reason_required" };
  }
  return { allowed: true, status: desiredStatus };
}
