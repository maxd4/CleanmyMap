import { beforeEach, describe, expect, it } from "vitest";
import { getCommunityBugReportByIdMock, getCurrentUserIdentityMock, loadCreatorInboxPageMock, makeGetRequest, makeRequest, qualifyCommunityBugReportMock, requireCreatorAccessMock, resetCreatorInboxMocks, updateCommunityBugReportTrackingMock } from "@/__tests__/support/creator-inbox-route";

describe("Creator inbox authorization", () => {
  beforeEach(() => {
    resetCreatorInboxMocks();
  });

    it("refuses creator inbox access when the caller is not an administrator", async () => {
      requireCreatorAccessMock.mockResolvedValueOnce({ ok: false, status: 403 });
      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({
          source: "feedback",
          itemId: "feedback-1",
          action: "mark_treated",
          reason: "Traitement refusé",
        }),
      );

      expect(response.status).toBe(403);
      expect(getCommunityBugReportByIdMock).not.toHaveBeenCalled();
    });

    it.each([
      { role: "admin", activeRole: "admin" },
      { role: "max", activeRole: "max", userId: "other-user" },
    ] as const)("rejects a non-canonical qualification actor: $role/$userId", async (actor) => {
      getCurrentUserIdentityMock.mockResolvedValueOnce({
        userId: actor.userId ?? "admin-user",
        role: actor.role,
        activeRole: actor.activeRole,
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

      expect(response.status).toBe(403);
      expect(qualifyCommunityBugReportMock).not.toHaveBeenCalled();
      expect(getCommunityBugReportByIdMock).not.toHaveBeenCalled();
    });

    it("rejects tracking updates from a non-canonical administrator", async () => {
      getCurrentUserIdentityMock.mockResolvedValueOnce({
        userId: "admin-1",
        role: "admin",
        activeRole: "admin",
      });
      const { PATCH } = await import("./route");
      const response = await PATCH(
        makeRequest({
          source: "feedback",
          itemId: "feedback-1",
          action: "update_tracking",
          trackingStatus: "planned",
        }),
      );

      expect(response.status).toBe(403);
      expect(updateCommunityBugReportTrackingMock).not.toHaveBeenCalled();
    });

    it("refuses paginated inbox reads without administrator access", async () => {
      requireCreatorAccessMock.mockResolvedValueOnce({ ok: false, status: 403 });
      const { GET } = await import("./route");
      const response = await GET(makeGetRequest("?limit=2"));

      expect(response.status).toBe(403);
      expect(loadCreatorInboxPageMock).not.toHaveBeenCalled();
    });
});
