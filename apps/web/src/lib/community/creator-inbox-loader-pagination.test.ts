import { beforeEach, describe, expect, it, vi } from "vitest";

const listBugReportsMock = vi.hoisted(() => vi.fn());
const loadMetricsMock = vi.hoisted(() => vi.fn());
const listPromotionRequestsMock = vi.hoisted(() => vi.fn());
const listPartnerRequestsMock = vi.hoisted(() => vi.fn());
const listLegalReportsMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/community/bug-reports-store", () => ({
  listCommunityBugReports: listBugReportsMock,
  loadCommunityBugReportFollowUpMetrics: loadMetricsMock,
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
vi.mock("@/lib/services/clerk", () => ({
  getClerkService: vi.fn(),
}));

function feedback(id: string, createdAt: string) {
  return {
    id,
    createdAt,
    submittedByUserId: "user-1",
    submittedByDisplayName: "Utilisateur",
    submittedByEmail: null,
    submittedByRole: null,
    reportType: "bug" as const,
    title: id,
    description: "Description suffisamment longue.",
    pagePath: "/feedback",
    source: "feedback_section" as const,
    status: "open" as const,
    creatorState: "new" as const,
  };
}

describe("creator inbox server pagination", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    listPromotionRequestsMock.mockResolvedValue([]);
    listPartnerRequestsMock.mockResolvedValue([]);
    listLegalReportsMock.mockResolvedValue([]);
    loadMetricsMock.mockResolvedValue({
      received: 0,
      pendingQualification: 0,
      accepted: 0,
      duplicate: 0,
      rejected: 0,
      shipped: 0,
      period: "all_time",
      scope: "community_bug_reports",
    });
    getSupabaseServerClientMock.mockReturnValue({
      from: () => ({
        select: () => {
          const query = {
            order: () => query,
            or: () => query,
            limit: async () => ({ data: [], error: null }),
          };
          return query;
        },
      }),
    });
  });

  it("uses a stable source cursor and does not repeat the next page", async () => {
    const first = [
      feedback("newest", "2026-08-27T12:00:00.000Z"),
      feedback("middle", "2026-08-27T11:00:00.000Z"),
      feedback("oldest", "2026-08-27T10:00:00.000Z"),
    ];
    listBugReportsMock.mockImplementation(
      async (_limit: number, cursor: { id: string } | null) =>
        cursor?.id === "middle" ? [first[2]] : first,
    );

    const { loadCreatorInboxPage, parseCreatorInboxPageCursor } = await import(
      "./creator-inbox-loader"
    );
    const firstPage = await loadCreatorInboxPage({ limit: 2 });

    expect(firstPage.items.map((item) => item.sourceRecordId)).toEqual([
      "newest",
      "middle",
    ]);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.nextCursor).toBeTruthy();

    const secondPage = await loadCreatorInboxPage({
      limit: 2,
      cursor: parseCreatorInboxPageCursor(firstPage.nextCursor),
    });
    expect(secondPage.items.map((item) => item.sourceRecordId)).toEqual(["oldest"]);
    expect(secondPage.hasMore).toBe(false);
    expect(listBugReportsMock).toHaveBeenLastCalledWith(3, {
      createdAt: "2026-08-27T11:00:00.000Z",
      id: "middle",
    });
  });

  it("orders equal timestamps deterministically by source and record id", async () => {
    listBugReportsMock.mockResolvedValue([feedback("zeta", "2026-08-27T12:00:00.000Z")]);
    listPromotionRequestsMock.mockResolvedValue([
      {
        id: "alpha",
        createdAt: "2026-08-27T12:00:00.000Z",
        submittedByUserId: "user-2",
        submittedByDisplayName: "Utilisateur",
        submittedByEmail: null,
        submittedByRole: "benevole",
        requestedRole: "elu",
        motivation: "Motivation suffisante.",
        status: "pending_owner_review",
        reviewedAt: null,
        reviewedByUserId: null,
        reviewedByRole: null,
        creatorState: "new",
      },
    ]);

    const { loadCreatorInboxPage } = await import("./creator-inbox-loader");
    const page = await loadCreatorInboxPage({ limit: 2 });

    expect(page.items.map((item) => item.source)).toEqual(["feedback", "promotion"]);
  });
});
