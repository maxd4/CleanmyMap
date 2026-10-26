import { beforeEach, describe, expect, it } from "vitest";
import { appendAdminOperationAuditMock, getCurrentUserIdentityMock, makeRequest, qualifyCommunityBugReportMock, resetCreatorInboxMocks } from "@/__tests__/support/creator-inbox-route";

describe("PATCH /api/admin/creator-inbox — qualification", () => {
  beforeEach(() => {
    resetCreatorInboxMocks();
  });

    it("allows only the canonical max identity to qualify feedback", async () => {
      getCurrentUserIdentityMock.mockResolvedValueOnce({
        userId: "max-owner",
        role: "max",
        activeRole: "max",
      });
      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({
          source: "feedback",
          itemId: "550e8400-e29b-41d4-a716-446655440000",
          action: "qualify",
          decision: "accepted",
        }),
      );

      expect(response.status).toBe(200);
      expect(qualifyCommunityBugReportMock).toHaveBeenCalledWith({
        reportId: "550e8400-e29b-41d4-a716-446655440000",
        decision: "accepted",
        reason: null,
        duplicateFeedbackId: null,
        actorUserId: "max-owner",
        operationId: expect.any(String),
      });
      expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
    });


    it("requires a reason and duplicate reference for a duplicate decision", async () => {
      getCurrentUserIdentityMock.mockResolvedValueOnce({
        userId: "max-owner",
        role: "max",
        activeRole: "max",
      });
      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({
          source: "feedback",
          itemId: "550e8400-e29b-41d4-a716-446655440000",
          action: "qualify",
          decision: "duplicate",
          reason: "court",
        }),
      );

      expect(response.status).toBe(400);
      expect(qualifyCommunityBugReportMock).not.toHaveBeenCalled();
    });

    it("returns an explicit error when the transactional qualification fails", async () => {
      getCurrentUserIdentityMock.mockResolvedValueOnce({
        userId: "max-owner",
        role: "max",
        activeRole: "max",
      });
      qualifyCommunityBugReportMock.mockRejectedValueOnce(new Error("database failure"));
      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({
          source: "feedback",
          itemId: "550e8400-e29b-41d4-a716-446655440000",
          action: "qualify",
          decision: "accepted",
        }),
      );

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "Unable to update creator inbox item.",
      });
    });
});
