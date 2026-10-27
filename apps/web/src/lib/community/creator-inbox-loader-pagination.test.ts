import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeCreatorInboxHistoricalCursor } from "./creator-inbox-pagination";

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

  it("continues feedback pages after malformed historical dates without omission", async () => {
    const records = [
      feedback("invalid-c", "invalid-c"),
      feedback("invalid-b", "invalid-b"),
      feedback("invalid-a", "invalid-a"),
      feedback("valid", "2026-10-27T13:00:00.000Z"),
      feedback("other-owner", "invalid-z"),
    ];
    listBugReportsMock.mockImplementation(
      async (_limit: number, cursor: { id: string } | null) => {
        const start = cursor ? records.findIndex((record) => record.id === cursor.id) + 1 : 0;
        return records.slice(start, start + 2).filter((record) => record.id !== "other-owner");
      },
    );

    const { loadCreatorInboxPage, parseCreatorInboxPageCursor } = await import(
      "./creator-inbox-loader"
    );
    const seen: string[] = [];
    let cursor: NonNullable<Parameters<typeof loadCreatorInboxPage>[0]>["cursor"] = null;
    for (let pageNumber = 0; pageNumber < 4; pageNumber += 1) {
      const page = await loadCreatorInboxPage({ limit: 1, cursor });
      seen.push(...page.items.map((item) => item.sourceRecordId));
      expect(page.items).toHaveLength(1);
      expect(page.hasMore).toBe(pageNumber < 3);
      cursor = parseCreatorInboxPageCursor(page.nextCursor);
      if (pageNumber === 1) {
        expect(cursor?.feedback).toMatchObject({
          version: 1,
          kind: "historical",
          createdAt: "invalid-b",
          id: "invalid-b",
        });
      }
    }

    expect(seen).toEqual(["invalid-c", "invalid-b", "invalid-a", "valid"]);
    expect(new Set(seen).size).toBe(seen.length);
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

  it("rejects malformed, versioned and oversized public cursors", async () => {
    const { parseCreatorInboxPageCursor } = await import("./creator-inbox-loader");
    expect(parseCreatorInboxPageCursor("not-base64-json")).toBeNull();
    expect(
      parseCreatorInboxPageCursor(
        Buffer.from(JSON.stringify({ version: 2, sources: {} }), "utf8").toString("base64url"),
      ),
    ).toBeNull();
    const historicalFeedback = encodeCreatorInboxHistoricalCursor({
      version: 1,
      kind: "historical",
      createdAt: "invalid-c",
      id: "invalid-c",
    });
    const parsedHistorical = parseCreatorInboxPageCursor(
      Buffer.from(JSON.stringify({
        version: 1,
        sources: {
          feedback: JSON.parse(Buffer.from(historicalFeedback.slice("historic-v1.".length), "base64url").toString("utf8")),
          promotion: null,
          partner: null,
          legal_content_report: null,
          event: null,
        },
      }), "utf8").toString("base64url"),
    );
    expect(parsedHistorical?.feedback).toMatchObject({ version: 1, kind: "historical" });
    expect(
      parseCreatorInboxPageCursor(
        Buffer.from(JSON.stringify({
          version: 1,
          sources: {
            feedback: null,
            promotion: { version: 1, kind: "historical", createdAt: "invalid-c", id: "invalid-c" },
          },
        }), "utf8").toString("base64url"),
      ),
    ).toBeNull();
    expect(
      parseCreatorInboxPageCursor(
        Buffer.from(
          JSON.stringify({
            version: 1,
            sources: {
              feedback: { createdAt: "invalid", id: "feedback-1" },
            },
          }),
          "utf8",
        ).toString("base64url"),
      ),
    ).toBeNull();
    expect(parseCreatorInboxPageCursor("x".repeat(8193))).toBeNull();
    expect(parseCreatorInboxPageCursor(null)).toEqual({
      feedback: null,
      promotion: null,
      partner: null,
      legal_content_report: null,
      event: null,
    });
  });

  it("clamps a zero page size to one item without changing source ownership", async () => {
    listBugReportsMock.mockResolvedValue([feedback("only", "2026-08-27T12:00:00.000Z")]);
    const { loadCreatorInboxPage } = await import("./creator-inbox-loader");

    const page = await loadCreatorInboxPage({ limit: 0 });

    expect(page.items.map((item) => item.sourceRecordId)).toEqual(["only"]);
    expect(page.hasMore).toBe(false);
    expect(listBugReportsMock).toHaveBeenCalledWith(2, null);
  });
});
