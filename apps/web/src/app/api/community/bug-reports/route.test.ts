import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const getCurrentUserRoleLabelMock = vi.hoisted(() => vi.fn());
const appendCommunityBugReportMock = vi.hoisted(() => vi.fn());
const updateCommunityBugReportStatusMock = vi.hoisted(() => vi.fn());
const sendCreatorInboxEmailMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const reserveDiscussionMessageSlotMock = vi.hoisted(() => vi.fn());
const verifyRateLimitMock = vi.hoisted(() => vi.fn());
const createServerRateLimitResponseMock = vi.hoisted(() => vi.fn());
const createPublicRateLimitResponseMock = vi.hoisted(() => vi.fn());
const hasHoneypotSignalMock = vi.hoisted(() => vi.fn());
const hasRecentSubmissionMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
  getCurrentUserRoleLabel: getCurrentUserRoleLabelMock,
}));

vi.mock("@/lib/admin/operation-audit", () => ({
  appendAdminOperationAudit: vi.fn(),
}));

vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: () => new Response("unauthorized", { status: 401 }),
}));

vi.mock("@/lib/community/bug-reports-store", () => ({
  appendCommunityBugReport: appendCommunityBugReportMock,
  updateCommunityBugReportStatus: updateCommunityBugReportStatusMock,
}));

vi.mock("@/lib/community/creator-inbox-email", () => ({
  sendCreatorInboxEmail: sendCreatorInboxEmailMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/community/discussion-rate-limit", () => ({
  reserveDiscussionMessageSlot: reserveDiscussionMessageSlotMock,
  toDiscussionRateLimitErrorPayload: vi.fn(),
}));

vi.mock("@/lib/rate-limit/server", () => ({
  createServerRateLimitResponse: createServerRateLimitResponseMock,
  verifyRateLimit: verifyRateLimitMock,
}));

vi.mock("@/lib/security/validation", () => ({
  createPublicRateLimitResponse: createPublicRateLimitResponseMock,
  hasHoneypotSignal: hasHoneypotSignalMock,
  hasRecentSubmission: hasRecentSubmissionMock,
}));

describe("POST /api/community/bug-reports", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    authMock.mockResolvedValue({ userId: "user_123" });
    getCurrentUserIdentityMock.mockResolvedValue({
      userId: "user_123",
      displayName: "Alice",
      email: "alice@example.com",
      role: "benevole",
    });
    getCurrentUserRoleLabelMock.mockResolvedValue("benevole");
    hasHoneypotSignalMock.mockReturnValue(false);
    hasRecentSubmissionMock.mockReturnValue(false);
    verifyRateLimitMock.mockResolvedValue({ allowed: true, retryAfter: null });
    createServerRateLimitResponseMock.mockReturnValue(null);
    createPublicRateLimitResponseMock.mockReturnValue(
      new Response("public-rate-limit", { status: 429 }),
    );
    reserveDiscussionMessageSlotMock.mockResolvedValue({
      allowed: true,
      reason: "ok",
      retryAfterSeconds: null,
      messagesToday: 0,
      remainingToday: 10,
    });
    getSupabaseServerClientMock.mockReturnValue({});
    appendCommunityBugReportMock.mockResolvedValue({
      id: "report_123",
      createdAt: "2026-05-31T08:00:00.000Z",
      submittedByUserId: "user_123",
      submittedByDisplayName: "Alice",
      submittedByEmail: "alice@example.com",
      submittedByRole: "benevole",
      reportType: "bug",
      title: "Carte qui bloque",
      description: "La carte bloque sur mobile.",
      pagePath: "/sections/feedback#bug",
      source: "feedback_section",
      status: "open",
      creatorState: "new",
    });
    sendCreatorInboxEmailMock.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("persists the feedback and sends the creator notification", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/community/bug-reports", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          reportType: "bug",
          title: "Carte qui bloque",
          description: "La carte bloque sur mobile.",
          pagePath: "/sections/feedback#bug",
          source: "feedback_section",
          honeypot: "",
          submittedAt: Date.now(),
        }),
      }),
    );

    const body = (await response.json()) as {
      status?: string;
      requestId?: string;
      item?: { id?: string };
    };

    expect(response.status).toBe(201);
    expect(body.status).toBe("queued");
    expect(body.requestId).toBe("report_123");
    expect(body.item?.id).toBe("report_123");
    expect(reserveDiscussionMessageSlotMock).toHaveBeenCalledWith(
      expect.anything(),
      { userId: "user_123", channel: "bug_report" },
    );
    expect(appendCommunityBugReportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        submittedByUserId: "user_123",
        input: expect.objectContaining({
          reportType: "bug",
          title: "Carte qui bloque",
          description: "La carte bloque sur mobile.",
          pagePath: "/sections/feedback#bug",
          source: "feedback_section",
        }),
      }),
    );
    expect(sendCreatorInboxEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user_123",
        subject: "[CleanMyMap] Nouveau feedback - Bug",
        title: "Nouveau feedback reçu",
      }),
    );
  });

  it("still saves the feedback if creator notification fails", async () => {
    sendCreatorInboxEmailMock.mockRejectedValueOnce(new Error("Resend unavailable"));

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/community/bug-reports", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          reportType: "improvement",
          title: "Amélioration du formulaire",
          description: "Raccourcir la saisie des informations répétitives.",
          pagePath: "/sections/feedback#improvement",
          source: "feedback_section",
          honeypot: "",
          submittedAt: Date.now(),
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(appendCommunityBugReportMock).toHaveBeenCalled();
    expect(sendCreatorInboxEmailMock).toHaveBeenCalled();
  });
});
