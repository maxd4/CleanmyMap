import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  compareCreatorInboxRecordCursors,
  encodeCreatorInboxHistoricalCursor,
  type CreatorInboxRecordCursor,
} from "./creator-inbox-pagination";

const listBugReportsMock = vi.hoisted(() => vi.fn());
const loadMetricsMock = vi.hoisted(() => vi.fn());
const listPromotionRequestsMock = vi.hoisted(() => vi.fn());
const listPartnerRequestsMock = vi.hoisted(() => vi.fn());
const listLegalReportsMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const getClerkServiceMock = vi.hoisted(() => vi.fn());

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
  getClerkService: getClerkServiceMock,
}));

type SourceRecord = { id: string; createdAt: string };

function listLikeCanonicalSource<T extends SourceRecord>(
  records: readonly T[],
  limit: number,
  beforeCursor?: CreatorInboxRecordCursor | null,
): T[] {
  return [...records]
    .filter(
      (record) =>
        !beforeCursor ||
        compareCreatorInboxRecordCursors(record, beforeCursor) < 0,
    )
    .sort((left, right) =>
      compareCreatorInboxRecordCursors(right, left),
    )
    .slice(0, limit);
}

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
    getClerkServiceMock.mockReturnValue({
      resolveUsers: async () => new Map(),
    });
  });

  it("uses a stable source cursor and does not repeat the next page", async () => {
    const first = [
      feedback("newest", "2026-08-27T12:00:00.000Z"),
      feedback("middle", "2026-08-27T11:00:00.000Z"),
      feedback("oldest", "2026-08-27T10:00:00.000Z"),
    ];
    listBugReportsMock.mockImplementation(
      async (limit: number, cursor: CreatorInboxRecordCursor | null) =>
        listLikeCanonicalSource(first, limit, cursor),
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
      feedback("valid", "2026-10-27T13:00:00.000Z"),
      feedback("invalid-c", "invalid-c"),
      feedback("invalid-b", "invalid-b"),
      feedback("invalid-a", "invalid-a"),
    ];
    listBugReportsMock.mockImplementation(
      async (limit: number, cursor: CreatorInboxRecordCursor | null) =>
        listLikeCanonicalSource(records, limit, cursor),
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
          createdAt: "invalid-c",
          id: "invalid-c",
        });
      }
    }

    expect(seen).toEqual(["valid", "invalid-c", "invalid-b", "invalid-a"]);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("keeps equivalent instants in canonical id order across pages", async () => {
    const records = [
      feedback("z", "2026-10-27T10:00:00.000Z"),
      feedback("a", "2026-10-27T12:00:00+02:00"),
    ];
    listBugReportsMock.mockImplementation(
      async (limit: number, cursor: CreatorInboxRecordCursor | null) =>
        listLikeCanonicalSource(records, limit, cursor),
    );

    const { loadCreatorInboxPage, parseCreatorInboxPageCursor } = await import(
      "./creator-inbox-loader"
    );
    const seen: string[] = [];
    let cursor: NonNullable<Parameters<typeof loadCreatorInboxPage>[0]>["cursor"] = null;
    for (let pageNumber = 0; pageNumber < 2; pageNumber += 1) {
      const page = await loadCreatorInboxPage({ limit: 1, cursor });
      seen.push(...page.items.map((item) => item.sourceRecordId));
      cursor = parseCreatorInboxPageCursor(page.nextCursor);
    }

    expect(seen).toEqual(["z", "a"]);
  });

  it("uses descending ids for identical invalid timestamps", async () => {
    const records = [
      feedback("a", "invalid-same"),
      feedback("z", "invalid-same"),
    ];
    listBugReportsMock.mockImplementation(
      async (limit: number, cursor: CreatorInboxRecordCursor | null) =>
        listLikeCanonicalSource(records, limit, cursor),
    );

    const { loadCreatorInboxPage, parseCreatorInboxPageCursor } = await import(
      "./creator-inbox-loader"
    );
    const firstPage = await loadCreatorInboxPage({ limit: 1 });
    const secondPage = await loadCreatorInboxPage({
      limit: 1,
      cursor: parseCreatorInboxPageCursor(firstPage.nextCursor),
    });

    expect([
      ...firstPage.items,
      ...secondPage.items,
    ].map((item) => item.sourceRecordId)).toEqual(["z", "a"]);
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

  it("keeps all five sources in canonical priority for one instant", async () => {
    const createdAt = "2026-10-27T12:00:00.000Z";
    const sourceRecords = {
      feedback: feedback("feedback", createdAt),
      promotion: {
        id: "promotion",
        createdAt,
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
      partner: {
        id: "partner",
        createdAt,
        submittedByUserId: "user-3",
        submittedByEmail: "partner@example.com",
        organizationName: "Partenaire",
        organizationType: "association",
        partnerScope: "local",
        legalIdentity: "Partenaire légal",
        coverage: "local",
        contributionTypes: ["materiel"],
        engagementTypes: [],
        relayActions: "Relais",
        availability: "ponctuelle",
        contactName: "Contact",
        contactChannel: "email",
        contactDetails: "partner@example.com",
        motivation: "Motivation partenaire.",
        publicWebsiteUrl: null,
        publicWebsiteConsent: false,
        status: "pending_admin_review",
        creatorState: "new",
      },
      legal_content_report: {
        id: "legal",
        createdAt,
        submittedByUserId: null,
        notifierName: "Déclarant",
        notifierEmail: "notifier@example.com",
        identityExceptionReason: null,
        contentUrl: "https://example.com/content",
        contentType: "article",
        contentId: "content-1",
        allegationReason: "Motif suffisamment détaillé.",
        goodFaithConfirmed: true,
        status: "open",
        creatorState: "new",
        latestDecision: null,
      },
    };
    listBugReportsMock.mockImplementation((limit, cursor) =>
      Promise.resolve(listLikeCanonicalSource([sourceRecords.feedback], limit, cursor)),
    );
    listPromotionRequestsMock.mockImplementation((limit, cursor) =>
      Promise.resolve(listLikeCanonicalSource([sourceRecords.promotion], limit, cursor)),
    );
    listPartnerRequestsMock.mockImplementation((limit, cursor) =>
      Promise.resolve(listLikeCanonicalSource([sourceRecords.partner], limit, cursor)),
    );
    listLegalReportsMock.mockImplementation((limit, cursor) =>
      Promise.resolve(listLikeCanonicalSource([sourceRecords.legal_content_report], limit, cursor)),
    );
    getSupabaseServerClientMock.mockReturnValue({
      from: () => ({
        select: () => {
          const query = {
            order: () => query,
            or: () => query,
            limit: async () => ({
              data: [{
                id: "event",
                created_at: createdAt,
                organizer_clerk_id: "organizer-1",
                title: "Événement",
                event_date: "2026-11-01",
                location_label: "Paris",
                latitude: null,
                longitude: null,
                location_source: null,
                description: "Description événement.",
              }],
              error: null,
            }),
          };
          return query;
        },
      }),
    });
    getClerkServiceMock.mockReturnValue({
      resolveUsers: async () => new Map([
        ["organizer-1", { userId: "organizer-1", displayName: "Organisateur" }],
      ]),
    });

    const { loadCreatorInboxPage } = await import("./creator-inbox-loader");
    const page = await loadCreatorInboxPage({ limit: 5 });

    expect(page.items.map((item) => item.source)).toEqual([
      "feedback",
      "promotion",
      "partner",
      "legal_content_report",
      "event",
    ]);
    expect(page.items.map((item) => item.sourceRecordId)).toEqual([
      "feedback",
      "promotion",
      "partner",
      "legal",
      "event",
    ]);
    expect(page.hasMore).toBe(false);
  });

  it("is deterministic for source input permutations", async () => {
    const records = [
      feedback("invalid-b", "invalid-b"),
      feedback("valid", "2026-10-27T13:00:00.000Z"),
      feedback("invalid-a", "invalid-a"),
      feedback("invalid-c", "invalid-c"),
    ];
    const permutations = [
      records,
      [...records].reverse(),
      [records[2], records[0], records[3], records[1]],
    ];
    const results: string[][] = [];
    const { loadCreatorInboxPage } = await import("./creator-inbox-loader");
    for (const permutation of permutations) {
      listBugReportsMock.mockImplementation((limit, cursor) =>
        Promise.resolve(listLikeCanonicalSource(permutation, limit, cursor)),
      );
      const page = await loadCreatorInboxPage({ limit: 10 });
      results.push(page.items.map((item) => item.sourceRecordId));
    }

    expect(results).toEqual([
      ["valid", "invalid-c", "invalid-b", "invalid-a"],
      ["valid", "invalid-c", "invalid-b", "invalid-a"],
      ["valid", "invalid-c", "invalid-b", "invalid-a"],
    ]);
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
