import { beforeEach, describe, expect, it } from "vitest";
import { getCurrentUserIdentityMock, makeRequest, resetCreatorInboxMocks, updateCommunityBugReportTrackingMock } from "@/__tests__/support/creator-inbox-route";

describe("PATCH /api/admin/creator-inbox — product tracking", () => {
  beforeEach(() => {
    resetCreatorInboxMocks();
  });

    it("allows only the canonical max identity to update product tracking", async () => {
      getCurrentUserIdentityMock.mockResolvedValueOnce({
        userId: "max-owner",
        role: "max",
        activeRole: "max",
      });
      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({
          source: "feedback",
          itemId: "feedback-1",
          action: "update_tracking",
          trackingStatus: "shipped",
          trackingPublicSummary: "Correction livrée.",
          trackingReference: "2026.10",
          trackingShippedOn: "2026-10-16",
        }),
      );

      expect(response.status).toBe(200);
      expect(updateCommunityBugReportTrackingMock).toHaveBeenCalledWith(expect.objectContaining({
        reportId: "feedback-1",
        trackingStatus: "shipped",
        publicSummary: "Correction livrée.",
        shippedOn: "2026-10-16",
        actorUserId: "max-owner",
      }));
    });
});
