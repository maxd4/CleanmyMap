import { describe, expect, it } from "vitest";
import { evaluateRoleAttestationPolicy } from "./role-attestation-policy";

const base = {
  actionFinalized: true,
  participationStatus: "confirmed",
  reviewerAuthorized: true,
  reviewerIsGlobalAdmin: false,
  reviewerUserId: "reviewer-1",
  targetUserId: "volunteer-1",
  hasPlannedAssignment: true,
  decision: "confirm" as const,
  reason: null,
};

describe("role attestation policy", () => {
  it.each([
    ["planned role without final participation", { participationStatus: "pending" }, "confirmed_participation_required"],
    ["action not finalized", { actionFinalized: false }, "action_not_finalized"],
    ["unauthorized reviewer", { reviewerAuthorized: false }, "reviewer_not_authorized"],
  ])("rejects %s", (_label, overrides, reason) => {
    expect(evaluateRoleAttestationPolicy({ ...base, ...overrides })).toMatchObject({ allowed: false, status: "denied", reason });
  });

  it("keeps a self-review pending until an independent reviewer acts", () => {
    expect(evaluateRoleAttestationPolicy({ ...base, reviewerUserId: "volunteer-1" })).toEqual({
      allowed: false,
      status: "pending",
      reason: "independent_reviewer_required",
    });
  });

  it("allows admin self-review but requires an explicit reason for a retrospective role", () => {
    expect(evaluateRoleAttestationPolicy({ ...base, reviewerUserId: "volunteer-1", reviewerIsGlobalAdmin: true })).toEqual({ allowed: true, status: "confirmed" });
    expect(evaluateRoleAttestationPolicy({ ...base, hasPlannedAssignment: false })).toMatchObject({ allowed: false, reason: "retrospective_reason_required" });
    expect(evaluateRoleAttestationPolicy({ ...base, hasPlannedAssignment: false, reason: "Rôle exercé sur le terrain" })).toEqual({ allowed: true, status: "confirmed" });
  });

  it("requires a reason for rejection and corrections", () => {
    expect(evaluateRoleAttestationPolicy({ ...base, decision: "reject" })).toMatchObject({ allowed: false, reason: "rejection_reason_required" });
    expect(evaluateRoleAttestationPolicy({ ...base, currentStatus: "confirmed" })).toMatchObject({ allowed: false, reason: "correction_reason_required" });
    expect(evaluateRoleAttestationPolicy({ ...base, currentStatus: "confirmed", reason: "Correction auditée" })).toEqual({ allowed: true, status: "confirmed" });
  });

  it("allows only a strictly identical terminal retry without a new reason", () => {
    expect(evaluateRoleAttestationPolicy({
      ...base,
      currentStatus: "confirmed",
      currentReviewerUserId: "reviewer-1",
      currentDecisionReason: null,
    })).toEqual({ allowed: true, status: "confirmed" });
    expect(evaluateRoleAttestationPolicy({
      ...base,
      reason: "  Correction auditée  ",
      currentStatus: "confirmed",
      currentReviewerUserId: "reviewer-1",
      currentDecisionReason: "Correction auditée",
    })).toEqual({ allowed: true, status: "confirmed" });
    expect(evaluateRoleAttestationPolicy({
      ...base,
      currentStatus: "confirmed",
      currentReviewerUserId: "reviewer-2",
      currentDecisionReason: null,
    })).toMatchObject({ allowed: false, reason: "correction_reason_required" });
    expect(evaluateRoleAttestationPolicy({
      ...base,
      decision: "reject",
      currentStatus: "confirmed",
      currentReviewerUserId: "reviewer-1",
      currentDecisionReason: null,
    })).toMatchObject({ allowed: false, reason: "rejection_reason_required" });
  });

  it("keeps multiple role decisions independent", () => {
    expect(evaluateRoleAttestationPolicy({ ...base })).toEqual({ allowed: true, status: "confirmed" });
    expect(evaluateRoleAttestationPolicy({ ...base, decision: "reject", reason: "Mission non réalisée" })).toEqual({ allowed: true, status: "rejected" });
  });
});
