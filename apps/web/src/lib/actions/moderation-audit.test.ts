import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendActionModerationAudit,
  buildActionModerationAuditDetails,
  hasPersistedAdministrativeParticipantRejection,
  normalizeModerationReason,
} from "@/lib/actions/moderation-audit";
import {
  appendAdminOperationAudit,
  listAdminOperationAudit,
} from "@/lib/admin/audit/operation-audit";

vi.mock("@/lib/admin/audit/operation-audit", () => ({
  appendAdminOperationAudit: vi.fn(),
  listAdminOperationAudit: vi.fn(),
}));

const appendAdminOperationAuditMock = vi.mocked(appendAdminOperationAudit);
const listAdminOperationAuditMock = vi.mocked(listAdminOperationAudit);

describe("action moderation audit", () => {
  beforeEach(() => {
    appendAdminOperationAuditMock.mockReset();
    listAdminOperationAuditMock.mockReset();
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

  it("accepts only the exact persisted confirmed-to-cancelled administrative transition", async () => {
    listAdminOperationAuditMock.mockResolvedValue([
      {
        operationId: "op-voluntary",
        at: "2026-10-09T14:00:00.000Z",
        actorUserId: "admin-1",
        operationType: "moderation",
        outcome: "success",
        targetId: "action-1",
        targetUserId: "user-1",
        details: {
          operation: "admin_remove_participant",
          participantUserId: "user-1",
          decision: "reject",
          previousValue: { participationStatus: "pending" },
          newValue: { participationStatus: "cancelled" },
        },
      },
      {
        operationId: "op-exact",
        at: "2026-10-09T15:00:00.000Z",
        actorUserId: "admin-1",
        operationType: "moderation",
        outcome: "success",
        targetId: "action-1",
        targetUserId: "user-2",
        details: {
          operation: "admin_remove_participant",
          participantUserId: "user-2",
          decision: "reject",
          previousValue: { participationStatus: "confirmed" },
          newValue: { participationStatus: "cancelled" },
        },
      },
    ]);

    await expect(
      hasPersistedAdministrativeParticipantRejection({
        actionId: "action-1",
        participantUserId: "user-2",
      }),
    ).resolves.toBe(true);
    await expect(
      hasPersistedAdministrativeParticipantRejection({
        actionId: "action-1",
        participantUserId: "user-3",
      }),
    ).resolves.toBe(false);
    expect(listAdminOperationAuditMock).toHaveBeenCalledWith(500, {
      targetId: "action-1",
      operation: "admin_remove_participant",
      outcome: "success",
    });
  });
});
