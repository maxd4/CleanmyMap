import { beforeEach, describe, expect, it } from "vitest";
import { canUseSupabaseServerPersistenceMock, getCurrentUserIdentityMock, loadCreatorInboxPageMock, makeGetRequest, resetCreatorInboxMocks } from "./route.test.helpers";

describe("GET /api/admin/creator-inbox", () => {
  beforeEach(() => {
    resetCreatorInboxMocks();
  });

    it("returns a bounded page and its continuation cursor for administrators", async () => {
      loadCreatorInboxPageMock.mockResolvedValueOnce({
        items: [{ id: "feedback-1" }],
        count: 1,
        hasMore: true,
        nextCursor: "next-page",
      });
      const { GET } = await import("./route");
      const response = await GET(makeGetRequest("?limit=2"));

      expect(response.status).toBe(200);
      expect(loadCreatorInboxPageMock).toHaveBeenCalledWith({
        limit: 2,
        cursor: {
          feedback: null,
          promotion: null,
          partner: null,
          legal_content_report: null,
          event: null,
        },
      });
      await expect(response.json()).resolves.toMatchObject({
        status: "ok",
        count: 1,
        hasMore: true,
        nextCursor: "next-page",
      });
    });

    it("keeps feedback metrics out of GET responses for non-canonical administrators", async () => {
      getCurrentUserIdentityMock.mockResolvedValueOnce({
        userId: "admin-1",
        role: "admin",
        activeRole: "admin",
      });
      loadCreatorInboxPageMock.mockResolvedValueOnce({
        items: [{ id: "feedback-1" }],
        count: 1,
        hasMore: false,
        nextCursor: null,
        feedbackMetrics: {
          received: 6,
          pendingQualification: 1,
          accepted: 2,
          duplicate: 1,
          rejected: 1,
          shipped: 1,
          period: "all_time",
          scope: "community_bug_reports",
        },
      });

      const { GET } = await import("./route");
      const response = await GET(makeGetRequest());

      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload).toMatchObject({
        status: "ok",
        canQualify: false,
        count: 1,
      });
      expect(payload).not.toHaveProperty("feedbackMetrics");
    });

    it("includes all feedback metrics for the canonical max identity", async () => {
      canUseSupabaseServerPersistenceMock.mockReturnValueOnce(true);
      getCurrentUserIdentityMock.mockResolvedValueOnce({
        userId: "max-owner",
        role: "max",
        activeRole: "max",
      });
      loadCreatorInboxPageMock.mockResolvedValueOnce({
        items: [{ id: "feedback-1" }],
        count: 1,
        hasMore: false,
        nextCursor: null,
        feedbackMetrics: {
          received: 6,
          pendingQualification: 1,
          accepted: 2,
          duplicate: 1,
          rejected: 1,
          shipped: 1,
          period: "all_time",
          scope: "community_bug_reports",
        },
      });

      const { GET } = await import("./route");
      const response = await GET(makeGetRequest());

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        status: "ok",
        canQualify: true,
        feedbackMetrics: {
          received: 6,
          pendingQualification: 1,
          accepted: 2,
          duplicate: 1,
          rejected: 1,
          shipped: 1,
        },
      });
    });

    it("rejects malformed page sizes instead of reading a misleading page", async () => {
      const { GET } = await import("./route");
      const response = await GET(makeGetRequest("?limit=not-a-number"));

      expect(response.status).toBe(400);
      expect(loadCreatorInboxPageMock).not.toHaveBeenCalled();
    });
});
