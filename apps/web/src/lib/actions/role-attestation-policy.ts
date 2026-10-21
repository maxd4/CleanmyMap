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

function resolvePolicyRejection(input: RoleAttestationPolicyInput, reason: string | null): string | null {
  if (!input.actionFinalized) return "action_not_finalized";
  if (input.participationStatus !== "confirmed") return "confirmed_participation_required";
  if (!input.reviewerAuthorized) return "reviewer_not_authorized";
  if (input.reviewerUserId === input.targetUserId && !input.reviewerIsGlobalAdmin) return "independent_reviewer_required";
  if (!input.hasPlannedAssignment && !reason) return "retrospective_reason_required";
  if (input.decision === "reject" && !reason) return "rejection_reason_required";
  return null;
}

function resolveTerminalPolicyResult(input: RoleAttestationPolicyInput, reason: string | null): RoleAttestationPolicyResult | null {
  const desiredStatus = input.decision === "confirm" ? "confirmed" : "rejected";
  const isIdenticalTerminalRetry = input.currentStatus === desiredStatus
    && input.currentReviewerUserId?.trim() === input.reviewerUserId.trim()
    && (input.currentDecisionReason?.trim() || null) === reason;
  if (isIdenticalTerminalRetry) return { allowed: true, status: desiredStatus };
  if (input.currentStatus && input.currentStatus !== "pending" && !reason) {
    return { allowed: false, status: "denied", reason: "correction_reason_required" };
  }
  return null;
}

export function evaluateRoleAttestationPolicy(input: RoleAttestationPolicyInput): RoleAttestationPolicyResult {
  const reason = input.reason?.trim() || null;
  const rejection = resolvePolicyRejection(input, reason);
  if (rejection) {
    return { allowed: false, status: rejection === "independent_reviewer_required" ? "pending" : "denied", reason: rejection };
  }
  const terminalResult = resolveTerminalPolicyResult(input, reason);
  if (terminalResult) return terminalResult;
  const desiredStatus = input.decision === "confirm" ? "confirmed" : "rejected";
  return { allowed: true, status: desiredStatus };
}
