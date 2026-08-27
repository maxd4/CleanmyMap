import { beforeEach, describe, expect, it, vi } from "vitest";

const listBugReportsMock = vi.hoisted(() => vi.fn());
const listPromotionRequestsMock = vi.hoisted(() => vi.fn());
const listPartnerRequestsMock = vi.hoisted(() => vi.fn());
const listLegalReportsMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/community/bug-reports-store", () => ({
  listCommunityBugReports: listBugReportsMock,
}));
vi.mock("@/lib/admin/promotion-requests-store", () => ({
  listPromotionRequests: listPromotionRequestsMock,
}));
vi.mock("@/lib/partners/onboarding-requests-store", () => ({
  listPartnerOnboardingRequests: listPartnerRequestsMock,
}));
vi.mock("@/lib/legal-content-report/legal-content-report-store", () => ({
  listLegalContentReports: listLegalReportsMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

describe("creator inbox loader legal content integration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    listBugReportsMock.mockResolvedValue([]);
    listPromotionRequestsMock.mockResolvedValue([]);
    listPartnerRequestsMock.mockResolvedValue([]);
    listLegalReportsMock.mockResolvedValue([
      {
        id: "report-1",
        createdAt: "2026-08-27T10:00:00.000Z",
        submittedByUserId: null,
        notifierName: null,
        notifierEmail: null,
        identityExceptionReason: "exception",
        contentUrl: "https://cleanmymap.fr/content/1",
        contentType: "publication",
        contentId: "content-1",
        allegationReason: "Un motif circonstancié est transmis pour examen.",
        goodFaithConfirmed: true,
        status: "open",
        creatorState: "new",
      },
    ]);
    getSupabaseServerClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          order: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    });
  });

  it("includes legal content reports in the existing read loader", async () => {
    const { loadCreatorInboxItems } = await import("./creator-inbox-loader");
    const items = await loadCreatorInboxItems();

    expect(listLegalReportsMock).toHaveBeenCalledWith(200);
    expect(items).toHaveLength(1);
    expect(items[0]?.source).toBe("legal_content_report");
    expect(items[0]?.canReview).toBe(true);
  });
});
