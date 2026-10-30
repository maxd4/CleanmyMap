import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendAdminOperationAuditMock, auditCalls, getCommunityBugReportByIdMock, getCurrentUserIdentityMock, makeRequest, requireCreatorAccessMock, resetCreatorInboxMocks, updateCommunityBugReportCreatorStateMock, updateCommunityBugReportStatusMock, updateCommunityBugReportStatusTransactionalMock } from "@/__tests__/support/creator-inbox-route";

async function patchFeedbackState(
  action: "mark_treated" | "archive",
  reason = action === "archive" ? "Archivage demandé" : "Traitement terminé",
) {
  const { PATCH } = await import("./route");
  return PATCH(makeRequest({
    source: "feedback",
    itemId: "feedback-1",
    action,
    reason,
  }));
}

async function patchFeedbackArchive(reason = "Archivage demandé") {
  return patchFeedbackState("archive", reason);
}

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

    it.each(["", "nope", "    ", "a".repeat(501)])(
      "rejects an invalid reason before mutation (%s)",
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

    it("passes the administrative reason to the transactional mark_treated mutation without a second audit", async () => {
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
      expect(updateCommunityBugReportStatusTransactionalMock).toHaveBeenCalledWith({
        reportId: "feedback-1",
        status: "treated",
        reason: "Traitement terminé",
        actorUserId: "reviewer-1",
        operationId: expect.any(String),
        expectedStatus: "open",
        expectedCreatorState: "new",
      });
      expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
    });

    it.each(["mark_treated", "archive"] as const)(
      "%s returns 404 for an already audited not_found without appending a second audit",
      async (action) => {
        updateCommunityBugReportStatusTransactionalMock.mockResolvedValueOnce({
          status: "not_found",
          record: null,
          auditPersisted: true,
        });

        const response = await patchFeedbackState(action);

        expect(response.status).toBe(404);
        expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
        expect(await response.text()).not.toContain("SQL");
      },
    );

    it.each(["mark_treated", "archive"] as const)(
      "%s returns 409 for a transactionally audited conflict without appending a second audit",
      async (action) => {
        updateCommunityBugReportStatusTransactionalMock.mockResolvedValueOnce({
          status: "conflict",
          record: null,
          auditPersisted: true,
        });

        const response = await patchFeedbackState(action);

        expect(response.status).toBe(409);
        expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
        expect(await response.text()).not.toContain("person@example.com");
      },
    );

    it.each(["mark_treated", "archive"] as const)(
      "%s accepts an unchanged transaction with its valid record without an extra audit",
      async (action) => {
        updateCommunityBugReportStatusTransactionalMock.mockResolvedValueOnce({
          status: "unchanged",
          record: {
            id: "feedback-1",
            submittedByUserId: "user-1",
            title: "Message title",
            description: "Message content",
            priority: "normal",
            status: action === "mark_treated" ? "treated" : "archived",
            creatorState: action === "mark_treated" ? "treated" : "archived",
          },
          auditPersisted: true,
        });

        const response = await patchFeedbackState(action);

        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ status: "ok", item: { id: "feedback-1" } });
        expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
      },
    );

    it("returns a controlled error for mark_treated when an updated result has no record", async () => {
      updateCommunityBugReportStatusTransactionalMock.mockResolvedValueOnce({
        status: "updated",
        record: null,
        auditPersisted: true,
      });

      const response = await patchFeedbackState("mark_treated");

      expect(response.status).toBe(500);
      expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(auditCalls()[0])).not.toContain("Message content");
      expect(await response.text()).not.toContain("status update did not persist");
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
      const response = await patchFeedbackArchive();

      expect(response.status).toBe(200);
      expect(updateCommunityBugReportStatusTransactionalMock).toHaveBeenCalledTimes(1);
      expect(updateCommunityBugReportStatusTransactionalMock).toHaveBeenCalledWith({
        reportId: "feedback-1",
        status: "archived",
        reason: "Archivage demandé",
        actorUserId: "reviewer-1",
        operationId: expect.any(String),
        expectedStatus: "open",
        expectedCreatorState: "new",
      });
      expect(updateCommunityBugReportStatusMock).not.toHaveBeenCalled();
      expect(updateCommunityBugReportCreatorStateMock).not.toHaveBeenCalled();
      expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
    });

    it("audits feedback archive persistence failure without claiming a partial mutation", async () => {
      const statusError = "status persistence detail";
      updateCommunityBugReportStatusTransactionalMock.mockRejectedValueOnce(new Error(statusError));
      const response = await patchFeedbackArchive();

      expect(response.status).toBe(500);
      expect(updateCommunityBugReportCreatorStateMock).not.toHaveBeenCalled();
      expect(updateCommunityBugReportStatusTransactionalMock).toHaveBeenCalledTimes(1);
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

    it("audits mark_treated persistence failure without exposing the provider error", async () => {
      const statusError = "treated status persistence detail";
      updateCommunityBugReportStatusTransactionalMock.mockRejectedValueOnce(new Error(statusError));

      const response = await patchFeedbackState("mark_treated");

      expect(response.status).toBe(500);
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
      expect(await response.text()).not.toContain(statusError);
    });

    it("does not claim feedback archive success when the canonical mutation returns no record", async () => {
      updateCommunityBugReportStatusTransactionalMock.mockResolvedValueOnce({
        status: "updated",
        record: null,
        auditPersisted: true,
      });
      const response = await patchFeedbackArchive();

      expect(response.status).toBe(500);
      expect(updateCommunityBugReportCreatorStateMock).not.toHaveBeenCalled();
      expect(updateCommunityBugReportStatusTransactionalMock).toHaveBeenCalledTimes(1);
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
