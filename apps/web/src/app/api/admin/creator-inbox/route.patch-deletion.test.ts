import { beforeEach, describe, expect, it } from "vitest";
import { appendAdminOperationAuditMock, auditCalls, deleteCommunityBugReportMock, deletePartnerOnboardingRequestMock, getCommunityBugReportByIdMock, getPartnerOnboardingRequestByIdMock, getPromotionRequestByIdMock, makeRequest, partnerRecord, resetCreatorInboxMocks, updatePartnerOnboardingRequestCreatorStateMock, updatePromotionRequestCreatorStateMock } from "@/__tests__/support/creator-inbox-route";

describe("PATCH /api/admin/creator-inbox — suppression", () => {
  beforeEach(() => {
    resetCreatorInboxMocks();
  });

    it("audits feedback delete success with a minimal before value", async () => {
      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({
          source: "feedback",
          itemId: "feedback-1",
          action: "delete",
          reason: "Suppression confirmée",
        }),
      );

      expect(response.status).toBe(200);
      expect(deleteCommunityBugReportMock).toHaveBeenCalledWith("feedback-1");
      expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
      expect(auditCalls()[0]).toMatchObject({
        operationType: "admin_operation",
        outcome: "success",
        targetId: "feedback-1",
        details: {
          operation: "creator_inbox_update",
          reason: "Suppression confirmée",
          targetUserId: "user-1",
          previousValue: { source: "feedback", creatorState: "new" },
          newValue: { deleted: true },
        },
      });
      expect(Object.keys(auditCalls()[0].details)).toEqual([
        "operation",
        "reason",
        "targetUserId",
        "previousValue",
        "newValue",
      ]);
      expect(JSON.stringify(auditCalls()[0])).not.toContain("Display name");
      expect(JSON.stringify(auditCalls()[0])).not.toContain("person@example.com");
      expect(JSON.stringify(auditCalls()[0])).not.toContain("Message content");
    });

    it("audits partner delete success with a minimal before value", async () => {
      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({
          source: "partner",
          itemId: "partner-1",
          action: "delete",
          reason: "Dossier supprimé",
        }),
      );

      expect(response.status).toBe(200);
      expect(deletePartnerOnboardingRequestMock).toHaveBeenCalledWith("partner-1");
      expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
      expect(auditCalls()[0]).toMatchObject({
        operationType: "admin_operation",
        outcome: "success",
        targetId: "partner-1",
        details: {
          operation: "creator_inbox_update",
          reason: "Dossier supprimé",
          targetUserId: "partner-user-1",
          previousValue: { source: "partner", creatorState: "pending" },
          newValue: { deleted: true },
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

    it.each([
      ["feedback", "feedback-1"],
      ["partner", "partner-1"],
    ] as const)("audits an identified %s delete returning false as a 404", async (source, itemId) => {
      if (source === "feedback") {
        deleteCommunityBugReportMock.mockResolvedValueOnce(false);
      } else {
        deletePartnerOnboardingRequestMock.mockResolvedValueOnce(false);
      }

      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({ source, itemId, action: "delete", reason: "Suppression introuvable" }),
      );

      expect(response.status).toBe(404);
      expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
      expect(auditCalls()[0]).toMatchObject({
        operationType: "admin_operation",
        outcome: "error",
        targetId: itemId,
        details: {
          operation: "creator_inbox_update",
          reason: "Suppression introuvable",
          stage: "delete",
          partialMutation: false,
          previousValue: {
            source,
            creatorState: source === "feedback" ? "new" : "pending",
          },
          newValue: { source },
        },
      });
      expect(JSON.stringify(auditCalls()[0])).not.toContain("Display name");
      expect(JSON.stringify(auditCalls()[0])).not.toContain("person@example.com");
      expect(JSON.stringify(auditCalls()[0])).not.toContain("Message content");
    });

    it.each([
      ["feedback", "feedback-1"],
      ["promotion", "promotion-1"],
      ["partner", "partner-1"],
    ] as const)("audits an identified missing %s item as lookup error", async (source, itemId) => {
      if (source === "feedback") {
        getCommunityBugReportByIdMock.mockResolvedValueOnce(null);
      } else if (source === "promotion") {
        getPromotionRequestByIdMock.mockResolvedValueOnce(null);
      } else {
        getPartnerOnboardingRequestByIdMock.mockResolvedValueOnce(null);
      }

      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({ source, itemId, action: "responded", reason: "Recherche ciblée" }),
      );

      expect(response.status).toBe(404);
      expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
      expect(auditCalls()[0]).toMatchObject({
        operationType: "admin_operation",
        outcome: "error",
        targetId: itemId,
        details: {
          operation: "creator_inbox_update",
          stage: "lookup",
          partialMutation: false,
          previousValue: { source, status: "unknown", creatorState: "unknown" },
          newValue: { source, status: "unknown", creatorState: "unknown" },
        },
      });
    });

    it("keeps accepted partner deletion forbidden and audited without mutation", async () => {
      getPartnerOnboardingRequestByIdMock.mockResolvedValueOnce({
        ...partnerRecord,
        status: "accepted",
        creatorState: "accepted",
      });
      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({
          source: "partner",
          itemId: "partner-1",
          action: "delete",
          reason: "Suppression refusée",
        }),
      );

      expect(response.status).toBe(409);
      expect(deletePartnerOnboardingRequestMock).not.toHaveBeenCalled();
      expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
      expect(auditCalls()[0]).toMatchObject({
        operationType: "admin_operation",
        outcome: "error",
        targetId: "partner-1",
        details: {
          stage: "delete",
          partialMutation: false,
          previousValue: {
            source: "partner",
            status: "accepted",
            creatorState: "accepted",
          },
          newValue: {
            source: "partner",
            status: "accepted",
            creatorState: "accepted",
          },
        },
      });
    });

    it("keeps promotion deletion forbidden and audited without mutation", async () => {
      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({
          source: "promotion",
          itemId: "promotion-1",
          action: "delete",
          reason: "Suppression refusée",
        }),
      );

      expect(response.status).toBe(409);
      expect(getPromotionRequestByIdMock).not.toHaveBeenCalled();
      expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
      expect(auditCalls()[0]).toMatchObject({
        operationType: "admin_operation",
        outcome: "error",
        targetId: "promotion-1",
        details: { stage: "delete", partialMutation: false },
      });
    });

    it.each([
      ["feedback", "feedback-1"],
      ["partner", "partner-1"],
    ] as const)("audits delete persistence failure for %s", async (source, itemId) => {
      if (source === "feedback") {
        deleteCommunityBugReportMock.mockRejectedValueOnce(new Error("delete provider detail"));
      } else {
        deletePartnerOnboardingRequestMock.mockRejectedValueOnce(new Error("delete provider detail"));
      }

      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({ source, itemId, action: "delete", reason: "Suppression échouée" }),
      );

      expect(response.status).toBe(500);
      expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
      expect(auditCalls()[0]).toMatchObject({
        operationType: "admin_operation",
        outcome: "error",
        details: { stage: "delete", partialMutation: false },
      });
      expect(JSON.stringify(auditCalls()[0])).not.toContain("delete provider detail");
    });

    it.each([
      ["feedback", "feedback-1"],
      ["partner", "partner-1"],
    ] as const)("audits lookup failure for %s without raw error data", async (source, itemId) => {
      const lookupError = "private lookup provider detail";
      if (source === "feedback") {
        getCommunityBugReportByIdMock.mockRejectedValueOnce(new Error(lookupError));
      } else {
        getPartnerOnboardingRequestByIdMock.mockRejectedValueOnce(new Error(lookupError));
      }

      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({ source, itemId, action: "delete", reason: "Lookup en erreur" }),
      );

      expect(response.status).toBe(500);
      expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
      expect(auditCalls()[0]).toMatchObject({
        operationType: "admin_operation",
        outcome: "error",
        targetId: itemId,
        details: {
          stage: "lookup",
          partialMutation: false,
          previousValue: { source, status: "unknown", creatorState: "unknown" },
          newValue: { source, status: "unknown", creatorState: "unknown" },
        },
      });
      expect(JSON.stringify(auditCalls()[0])).not.toContain(lookupError);
    });

    it.each([
      ["promotion", "promotion-1"],
      ["partner", "partner-1"],
    ] as const)("audits creator-state update failure for %s", async (source, itemId) => {
      const updateError = "private update provider detail";
      if (source === "promotion") {
        updatePromotionRequestCreatorStateMock.mockRejectedValueOnce(new Error(updateError));
      } else {
        updatePartnerOnboardingRequestCreatorStateMock.mockRejectedValueOnce(new Error(updateError));
      }

      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({
          source,
          itemId,
          action: "responded",
          reason: "Mise à jour en erreur",
        }),
      );

      expect(response.status).toBe(500);
      expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
      expect(auditCalls()[0]).toMatchObject({
        operationType: "admin_operation",
        outcome: "error",
        targetId: itemId,
        details: {
          stage: "update",
          partialMutation: false,
        },
      });
      expect(JSON.stringify(auditCalls()[0])).not.toContain(updateError);
    });
});
