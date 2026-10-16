import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActionRequestAccessMock = vi.hoisted(() => vi.fn());
const finalizeBugReportScreenshotMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/action-request-access", () => ({
  requireActionRequestAccess: requireActionRequestAccessMock,
}));
vi.mock("@/lib/community/bug-report-screenshot", () => ({
  BugReportScreenshotError: class BugReportScreenshotError extends Error {},
  finalizeBugReportScreenshot: finalizeBugReportScreenshotMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

const { POST } = await import("./route");

describe("community feedback screenshot finalize boundary", () => {
  const attemptId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseServerClientMock.mockReturnValue({});
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "owner-1" });
    finalizeBugReportScreenshotMock.mockResolvedValue({
      screenshot: { uploadState: "ready" },
      alreadyReady: false,
    });
  });

  it("passes the server-issued attempt identifier to finalization", async () => {
    const response = await POST(
      new Request("https://cleanmymap.test/api/community/bug-reports/feedback-1/screenshot/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      }),
      { params: Promise.resolve({ reportId: "feedback-1" }) },
    );
    expect(response.status).toBe(200);
    expect(finalizeBugReportScreenshotMock).toHaveBeenCalledWith({}, {
      userId: "owner-1",
      feedbackId: "feedback-1",
      attemptId,
    });
  });

  it("rejects absent or malformed attempt identifiers before finalization", async () => {
    for (const body of [{}, { attemptId: "not-a-uuid" }]) {
      const response = await POST(
        new Request("https://cleanmymap.test/api/community/bug-reports/feedback-1/screenshot/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ reportId: "feedback-1" }) },
      );
      expect(response.status).toBe(422);
    }
    expect(finalizeBugReportScreenshotMock).not.toHaveBeenCalled();
  });
});
