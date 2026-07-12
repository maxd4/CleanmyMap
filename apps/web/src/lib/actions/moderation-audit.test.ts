import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendActionModerationAudit,
  buildActionModerationAuditDetails,
  normalizeModerationReason,
} from "@/lib/actions/moderation-audit";
import { appendAdminOperationAudit } from "@/lib/admin/operation-audit";

vi.mock("@/lib/admin/operation-audit", () => ({
  appendAdminOperationAudit: vi.fn(),
}));

const appendAdminOperationAuditMock = vi.mocked(appendAdminOperationAudit);

describe("action moderation audit", () => {
  beforeEach(() => {
    appendAdminOperationAuditMock.mockReset();
  });

  it("normalizes required moderation reasons", () => {
    expect(normalizeModerationReason("  motif clair  ", { required: true })).toBe(
      "motif clair",
    );
    expect(normalizeModerationReason("abcd", { required: true })).toBeNull();
    expect(normalizeModerationReason("   ", { required: true })).toBeNull();
    expect(normalizeModerationReason(null, { required: true })).toBeNull();
  });

  it("keeps canonical audit details above custom context", () => {
    const details = buildActionModerationAuditDetails({
      operationId: "op-1",
      actorUserId: "admin-1",
      targetActionId: "action-1",
      operation: "correct_impact",
      outcome: "success",
      reason: "Correction justifiee",
      previousValue: { wasteKg: 10 },
      newValue: { wasteKg: 8 },
      targetUserId: "user-1",
      details: {
        operation: "spoofed",
        reason: "spoof",
        previousValue: "spoofed-before",
        newValue: "spoofed-after",
        targetUserId: "spoofed-user",
        source: "admin-panel",
      },
    });

    expect(details).toEqual({
      operation: "correct_impact",
      reason: "Correction justifiee",
      previousValue: { wasteKg: 10 },
      newValue: { wasteKg: 8 },
      targetUserId: "user-1",
      source: "admin-panel",
    });
  });

  it("rejects sensitive operations without a valid reason", () => {
    expect(() =>
      buildActionModerationAuditDetails({
        operationId: "op-1",
        actorUserId: "admin-1",
        targetActionId: "action-1",
        operation: "hide_action",
        outcome: "success",
        reason: "non",
      }),
    ).toThrow("A moderation reason of at least 5 characters is required");
  });

  it("requires a reason for admin participant removals", () => {
    expect(() =>
      buildActionModerationAuditDetails({
        operationId: "op-1",
        actorUserId: "admin-1",
        targetActionId: "action-1",
        operation: "admin_remove_participant",
        outcome: "success",
        targetUserId: "user-1",
      }),
    ).toThrow("A moderation reason of at least 5 characters is required");
  });

  it("appends action moderation audit entries through the existing admin audit store", async () => {
    appendAdminOperationAuditMock.mockResolvedValue(undefined);

    await appendActionModerationAudit({
      operationId: "op-1",
      actorUserId: "admin-1",
      targetActionId: "action-1",
      operation: "admin_review_reject",
      outcome: "error",
      reason: "Dossier incomplet",
      targetUserId: "user-1",
      details: { code: "missing_data" },
    });

    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operationId: "op-1",
        actorUserId: "admin-1",
        operationType: "moderation",
        outcome: "error",
        targetId: "action-1",
        details: {
          code: "missing_data",
          operation: "admin_review_reject",
          reason: "Dossier incomplet",
          targetUserId: "user-1",
        },
      }),
    );
  });
});
