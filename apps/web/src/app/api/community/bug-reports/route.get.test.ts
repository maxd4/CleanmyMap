import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const listCommunityBugReportsForUserMock = vi.hoisted(() => vi.fn());
const handleApiErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  getCurrentUserActiveRole: vi.fn(),
  getCurrentUserIdentity: vi.fn(),
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
}));
vi.mock("@/lib/admin/audit/operation-audit", () => ({
  appendAdminOperationAudit: vi.fn(),
}));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
}));
vi.mock("@/lib/community/bug-reports-store", () => ({
  appendCommunityBugReport: vi.fn(),
  buildCommunityBugReportHistoryCursor: (cursor: { createdAt: string; id: string }) =>
    `${cursor.createdAt}|${cursor.id}`,
  clampCommunityBugReportsHistoryLimit: (value: number | null | undefined) =>
    value === undefined || value === null || !Number.isFinite(value)
      ? 20
      : Math.min(50, Math.max(1, Math.trunc(value))),
  getCommunityBugReportById: vi.fn(),
  listCommunityBugReportsForUser: listCommunityBugReportsForUserMock,
  parseCommunityBugReportHistoryCursor: (value: string | null | undefined) => {
    if (!value) return null;
    const separatorIndex = value.lastIndexOf("|");
    if (separatorIndex <= 0 || separatorIndex === value.length - 1) return null;
    const createdAt = value.slice(0, separatorIndex);
    const id = value.slice(separatorIndex + 1);
    return Number.isFinite(Date.parse(createdAt)) && id
      ? { createdAt: new Date(createdAt).toISOString(), id }
      : null;
  },
  updateCommunityBugReportStatus: vi.fn(),
}));
vi.mock("@/lib/community/creator-inbox-email", () => ({
  sendCreatorInboxEmail: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(),
}));
vi.mock("@/lib/community/discussion-rate-limit", () => ({
  reserveDiscussionMessageSlot: vi.fn(),
  toDiscussionRateLimitErrorPayload: vi.fn(),
}));
vi.mock("@/lib/rate-limit/server", () => ({
  withServerRateLimit: vi.fn(),
}));
vi.mock("@/lib/security/validation", () => ({
  parseJsonBodyWithSchema: vi.fn(),
  rejectPublicFormAbuse: vi.fn(),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: handleApiErrorMock,
  validationErrorResponse: (details: Record<string, string[]>) =>
    Response.json({ status: "validation_error", details }, { status: 422 }),
}));
vi.mock("@/lib/logging/failure-log", () => ({
  logWarning: vi.fn(),
}));

const records = {
  responded: {
    id: "report-responded",
    title: "Bug traité en réponse privée",
    reportType: "bug" as const,
    createdAt: "2026-08-27T11:00:00.000Z",
    creatorState: "responded" as const,
    submittedByEmail: "private@example.com",
    submittedByRole: "benevole",
    submittedByUserId: "owner-1",
  },
  treated: {
    id: "report-treated",
    title: "Idée traitée",
    reportType: "idea" as const,
    createdAt: "2026-08-27T10:00:00.000Z",
    creatorState: "treated" as const,
    submittedByEmail: null,
    submittedByRole: "benevole",
    submittedByUserId: "owner-1",
  },
  archived: {
    id: "report-archived",
    title: "Ancien retour",
    reportType: "improvement" as const,
    createdAt: "2026-08-27T09:00:00.000Z",
    creatorState: "archived" as const,
    submittedByEmail: "private@example.com",
    submittedByRole: "benevole",
    submittedByUserId: "owner-1",
  },
};

describe("GET /api/community/bug-reports", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "owner-1" });
    handleApiErrorMock.mockImplementation(() =>
      Response.json({ status: "error", error: "safe error" }, { status: 500 }),
    );
    listCommunityBugReportsForUserMock.mockResolvedValue({
      items: [records.responded, records.treated],
      nextCursor: { createdAt: records.treated.createdAt, id: records.treated.id },
      hasMore: true,
    });
  });

  it("refuses anonymous access before reading the store", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    const { GET } = await import("./route");

    const response = await GET(new Request("https://cleanmymap.test/api/community/bug-reports"));

    expect(response.status).toBe(401);
    expect(listCommunityBugReportsForUserMock).not.toHaveBeenCalled();
  });

  it("binds the owner to the server session and returns only the minimal projection", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request(
        "https://cleanmymap.test/api/community/bug-reports?userId=other-user&limit=500",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(listCommunityBugReportsForUserMock).toHaveBeenCalledWith({
      submittedByUserId: "owner-1",
      limit: 50,
      beforeCursor: null,
    });
    expect(body.items).toEqual([
      {
        id: "report-responded",
        title: "Bug traité en réponse privée",
        type: "bug",
        createdAt: records.responded.createdAt,
        status: "responded",
      },
      {
        id: "report-treated",
        title: "Idée traitée",
        type: "idea",
        createdAt: records.treated.createdAt,
        status: "treated",
      },
    ]);
    expect(body.items[0]).not.toHaveProperty("submittedByEmail");
    expect(body.nextCursor).toBe(`${records.treated.createdAt}|${records.treated.id}`);
    expect(body.hasMore).toBe(true);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("passes a stable cursor and preserves the persisted responded, treated and archived states", async () => {
    listCommunityBugReportsForUserMock.mockResolvedValueOnce({
      items: [records.archived],
      nextCursor: null,
      hasMore: false,
    });
    const { GET } = await import("./route");
    const cursor = encodeURIComponent(`${records.treated.createdAt}|${records.treated.id}`);
    const response = await GET(
      new Request(`https://cleanmymap.test/api/community/bug-reports?cursor=${cursor}`),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(listCommunityBugReportsForUserMock).toHaveBeenCalledWith({
      submittedByUserId: "owner-1",
      limit: 20,
      beforeCursor: { createdAt: records.treated.createdAt, id: records.treated.id },
    });
    expect(body.items[0].status).toBe("archived");
    expect(body.hasMore).toBe(false);
  });

  it("returns an empty personal history without inventing deleted feedback", async () => {
    listCommunityBugReportsForUserMock.mockResolvedValueOnce({
      items: [],
      nextCursor: null,
      hasMore: false,
    });
    const { GET } = await import("./route");

    const response = await GET(new Request("https://cleanmymap.test/api/community/bug-reports"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok", items: [], nextCursor: null, hasMore: false });
  });

  it("returns a safe error when personal feedback storage is unavailable", async () => {
    listCommunityBugReportsForUserMock.mockRejectedValueOnce(
      new Error("Persistence unavailable for community_bug_reports"),
    );
    const { GET } = await import("./route");

    const response = await GET(new Request("https://cleanmymap.test/api/community/bug-reports"));

    expect(response.status).toBe(500);
    expect(handleApiErrorMock).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(await response.json())).not.toContain("Persistence unavailable");
  });

  it("rejects malformed cursors without querying another owner's data", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://cleanmymap.test/api/community/bug-reports?cursor=not-a-cursor"),
    );

    expect(response.status).toBe(422);
    expect(listCommunityBugReportsForUserMock).not.toHaveBeenCalled();
  });
});
