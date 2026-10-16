import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActionRequestAccessMock = vi.hoisted(() => vi.fn());
const getBugReportScreenshotMock = vi.hoisted(() => vi.fn());
const deleteBugReportScreenshotMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/action-request-access", () => ({
  requireActionRequestAccess: requireActionRequestAccessMock,
}));
vi.mock("@/lib/community/bug-report-screenshot", () => ({
  BugReportScreenshotError: class BugReportScreenshotError extends Error {},
  getBugReportScreenshot: getBugReportScreenshotMock,
  deleteBugReportScreenshot: deleteBugReportScreenshotMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

const { GET, DELETE } = await import("./route");

describe("community feedback screenshot read boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseServerClientMock.mockReturnValue({});
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "owner-1" });
    getBugReportScreenshotMock.mockResolvedValue({
      feedbackId: "feedback-1",
      originalName: "capture.png",
      signedUrl: "https://signed.test/short-lived",
      signedUrlExpiresAt: "2026-10-16T12:05:00.000Z",
    });
    deleteBugReportScreenshotMock.mockResolvedValue(undefined);
  });

  it("rejects an anonymous read before the storage service is called", async () => {
    requireActionRequestAccessMock.mockResolvedValue({ ok: false, status: 401 });
    const response = await GET(
      new Request("https://cleanmymap.test/api/community/bug-reports/feedback-1/screenshot"),
      { params: Promise.resolve({ reportId: "feedback-1" }) },
    );
    expect(response.status).toBe(401);
    expect(getBugReportScreenshotMock).not.toHaveBeenCalled();
  });

  it("passes the server-resolved identity to the owner/admin reader", async () => {
    const response = await GET(
      new Request("https://cleanmymap.test/api/community/bug-reports/feedback-1/screenshot"),
      { params: Promise.resolve({ reportId: "feedback-1" }) },
    );
    expect(response.status).toBe(200);
    expect(getBugReportScreenshotMock).toHaveBeenCalledWith({}, {
      userId: "owner-1",
      feedbackId: "feedback-1",
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("keeps cleanup owner-scoped and never accepts an owner id from the URL", async () => {
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "owner-1" });
    const response = await DELETE(
      new Request("https://cleanmymap.test/api/community/bug-reports/feedback-1/screenshot?userId=other"),
      { params: Promise.resolve({ reportId: "feedback-1" }) },
    );
    expect(response.status).toBe(200);
    expect(deleteBugReportScreenshotMock).toHaveBeenCalledWith({}, {
      userId: "owner-1",
      feedbackId: "feedback-1",
    });
  });
});
