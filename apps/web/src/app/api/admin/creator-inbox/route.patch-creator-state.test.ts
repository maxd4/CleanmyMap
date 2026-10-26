import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendAdminOperationAuditMock, auditCalls, getCommunityBugReportByIdMock, getCurrentUserIdentityMock, makeRequest, requireCreatorAccessMock, resetCreatorInboxMocks, updateCommunityBugReportCreatorStateMock, updateCommunityBugReportStatusMock } from "@/__tests__/support/creator-inbox-route";

describe("PATCH /api/admin/creator-inbox — creator-state mutations", () => {
  beforeEach(() => {
    resetCreatorInboxMocks();
  });

    it.each(["mark_treated", "responded", "archive"] as const)(
      "rejects %s without a valid reason before mutation",
      async (action) => {
        const { PATCH } = await import("./route");
        const response = await PATCH(
          makeRequest({ source: "feedback", itemId: "feedback-1", action }),
        );

        expect(response.status).toBe(400);
        expect(getCommunityBugReportByIdMock).not.toHaveBeenCalled();
        expect(updateCommunityBugReportStatusMock).not.toHaveBeenCalled();
        expect(updateCommunityBugReportCreatorStateMock).not.toHaveBeenCalled();
        expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
      },
    );

    it.each(["", "nope", "    "])(
      "rejects a short reason before mutation (%s)",
      async (reason) => {
        const { PATCH } = await import("./route");
        const response = await PATCH(
          makeRequest({
            source: "feedback",
            itemId: "feedback-1",
            action: "mark_treated",
            reason,
          }),
        );

        expect(response.status).toBe(400);
        expect(getCommunityBugReportByIdMock).not.toHaveBeenCalled();
        expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
      },
    );

    it("audits feedback mark_treated with one success and canonical targetUserId", async () => {
      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({
          source: "feedback",
          itemId: "feedback-1",
          action: "mark_treated",
          reason: "  Traitement terminé  ",
        }),
      );

      expect(response.status).toBe(200);
      expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
      expect(auditCalls()[0]).toMatchObject({
        actorUserId: "reviewer-1",
        operationType: "admin_operation",
        outcome: "success",
        targetId: "feedback-1",
        details: {
          operation: "creator_inbox_update",
          reason: "Traitement terminé",
          targetUserId: "user-1",
          previousValue: {
            source: "feedback",
            status: "open",
            creatorState: "new",
          },
          newValue: {
            source: "feedback",
            status: "treated",
            creatorState: "treated",
          },
        },
      });
      expect(Object.keys(auditCalls()[0].details)).toEqual([
        "operation",
        "reason",
        "targetUserId",
        "previousValue",
        "newValue",
      ]);
    });

    it("audits promotion and partner creator-state changes without changing source status", async () => {
      const { PATCH } = await import("./route");
      const promotionResponse = await PATCH(
        makeRequest({
          source: "promotion",
          itemId: "promotion-1",
          action: "responded",
          reason: "Réponse enregistrée",
        }),
      );
      expect(promotionResponse.status).toBe(200);
      expect(auditCalls()[0]).toMatchObject({
        operationType: "admin_operation",
        outcome: "success",
        details: {
          previousValue: {
            source: "promotion",
            status: "pending_owner_review",
            creatorState: "pending",
          },
          newValue: {
            source: "promotion",
            status: "pending_owner_review",
            creatorState: "responded",
          },
        },
      });

      vi.clearAllMocks();
      requireCreatorAccessMock.mockResolvedValue({ ok: true, userId: "reviewer-1" });
      getCurrentUserIdentityMock.mockResolvedValue({ userId: "reviewer-1" });
      appendAdminOperationAuditMock.mockResolvedValue(undefined);
      const partnerResponse = await PATCH(
        makeRequest({
          source: "partner",
          itemId: "partner-1",
          action: "archive",
          reason: "Dossier archivé",
        }),
      );
      expect(partnerResponse.status).toBe(200);
      expect(auditCalls()[0]).toMatchObject({
        operationType: "admin_operation",
        outcome: "success",
        details: {
          previousValue: {
            source: "partner",
            status: "pending_admin_review",
            creatorState: "pending",
          },
          newValue: {
            source: "partner",
            status: "pending_admin_review",
            creatorState: "archived",
          },
        },
      });
    });

    it("archives feedback with one canonical status mutation", async () => {
      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({
          source: "feedback",
          itemId: "feedback-1",
          action: "archive",
          reason: "Archivage demandé",
        }),
      );

      expect(response.status).toBe(200);
      expect(updateCommunityBugReportStatusMock).toHaveBeenCalledTimes(1);
      expect(updateCommunityBugReportStatusMock).toHaveBeenCalledWith({
        reportId: "feedback-1",
        status: "archived",
      });
      expect(updateCommunityBugReportCreatorStateMock).not.toHaveBeenCalled();
      expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
      expect(auditCalls()[0]).toMatchObject({
        operationType: "admin_operation",
        outcome: "success",
        details: {
          previousValue: {
            source: "feedback",
            status: "open",
            creatorState: "new",
          },
          newValue: {
            source: "feedback",
            status: "archived",
            creatorState: "archived",
          },
        },
      });
    });

    it("audits feedback archive persistence failure without claiming a partial mutation", async () => {
      const statusError = "status persistence detail";
      updateCommunityBugReportStatusMock.mockRejectedValueOnce(new Error(statusError));
      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({
          source: "feedback",
          itemId: "feedback-1",
          action: "archive",
          reason: "Archivage demandé",
        }),
      );

      expect(response.status).toBe(500);
      expect(updateCommunityBugReportCreatorStateMock).not.toHaveBeenCalled();
      expect(updateCommunityBugReportStatusMock).toHaveBeenCalledTimes(1);
      expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
      expect(auditCalls()[0]).toMatchObject({
        operationType: "admin_operation",
        outcome: "error",
        details: {
          stage: "update",
          partialMutation: false,
        },
      });
      expect(JSON.stringify(auditCalls()[0])).not.toContain(statusError);
    });

    it("does not claim feedback archive success when the canonical mutation returns no record", async () => {
      updateCommunityBugReportStatusMock.mockResolvedValueOnce(null);
      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({
          source: "feedback",
          itemId: "feedback-1",
          action: "archive",
          reason: "Archivage demandé",
        }),
      );

      expect(response.status).toBe(500);
      expect(updateCommunityBugReportCreatorStateMock).not.toHaveBeenCalled();
      expect(updateCommunityBugReportStatusMock).toHaveBeenCalledTimes(1);
      expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
      expect(auditCalls()[0]).toMatchObject({
        operationType: "admin_operation",
        outcome: "error",
        details: {
          operation: "creator_inbox_update",
          reason: "Archivage demandé",
          targetUserId: "user-1",
          stage: "update",
          partialMutation: false,
          previousValue: {
            source: "feedback",
            status: "open",
            creatorState: "new",
          },
          newValue: {
            source: "feedback",
            status: "archived",
            creatorState: "archived",
          },
        },
      });
      expect(JSON.stringify(auditCalls()[0])).not.toContain("Display name");
      expect(JSON.stringify(auditCalls()[0])).not.toContain("person@example.com");
      expect(JSON.stringify(auditCalls()[0])).not.toContain("Message content");
    });


    it("does not let a direct responded action mark feedback answered", async () => {
      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({
          source: "feedback",
          itemId: "feedback-1",
          action: "responded",
          reason: "Réponse prétendue",
        }),
      );

      expect(response.status).toBe(409);
      expect(updateCommunityBugReportCreatorStateMock).not.toHaveBeenCalled();
      expect(auditCalls()[0].details).toMatchObject({
        previousValue: { creatorState: "new" },
        newValue: { creatorState: "new" },
      });
    });
});
