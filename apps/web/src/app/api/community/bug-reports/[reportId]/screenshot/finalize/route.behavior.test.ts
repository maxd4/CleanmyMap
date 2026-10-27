import { beforeEach, describe, expect, it, vi } from "vitest";

const access = vi.hoisted(() => vi.fn());
const serverClient = vi.hoisted(() => vi.fn(() => ({})));
const finalizeScreenshot = vi.hoisted(() => vi.fn());
const BugReportScreenshotError = vi.hoisted(() => class extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "BugReportScreenshotError";
    this.code = code;
  }
});

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess: access }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: serverClient }));
vi.mock("@/lib/community/bug-report-screenshot", () => ({
  BugReportScreenshotError,
  finalizeBugReportScreenshot: finalizeScreenshot,
}));

import { POST } from "./route";

const attemptId = "22222222-2222-4222-8222-222222222222";
const context = { params: Promise.resolve({ reportId: "feedback-1" }) };
const request = (body: unknown) => new Request("https://cleanmymap.test/api/community/bug-reports/feedback-1/screenshot/finalize", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

describe("POST screenshot finalize boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    access.mockResolvedValue({ ok: true, userId: "owner-1" });
    finalizeScreenshot.mockResolvedValue({ screenshot: { uploadState: "ready" }, alreadyReady: false });
  });

  it("rejects anonymous, malformed, and non-UUID attempts before finalization", async () => {
    access.mockResolvedValueOnce({ ok: false });
    expect((await POST(request({ attemptId }), context)).status).toBe(401);
    for (const body of [{}, { attemptId: "bad" }, { attemptId, extra: "unexpected" }]) {
      expect((await POST(request(body), context)).status).toBe(422);
    }
    expect(finalizeScreenshot).not.toHaveBeenCalled();
  });

  it("finalizes with the server identity and exact attempt", async () => {
    const response = await POST(request({ attemptId }), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", screenshot: { uploadState: "ready" }, alreadyReady: false });
    expect(finalizeScreenshot).toHaveBeenCalledWith({}, { userId: "owner-1", feedbackId: "feedback-1", attemptId });
  });

  it.each([
    ["forbidden", 403],
    ["not_found", 404],
    ["storage_missing", 422],
    ["storage_invalid", 422],
    ["storage_error", 500],
  ] as const)("maps %s without leaking provider details", async (code, status) => {
    const message = code === "storage_missing" || code === "storage_invalid"
      ? "La capture n'est pas un objet image valide."
      : "private provider detail";
    finalizeScreenshot.mockRejectedValueOnce(new BugReportScreenshotError(message, code));
    const response = await POST(request({ attemptId }), context);
    expect(response.status).toBe(status);
    const body = JSON.stringify(await response.json());
    if (code === "storage_missing" || code === "storage_invalid") {
      expect(body).toContain("La capture n'est pas un objet image valide.");
    } else {
      expect(body).not.toContain("private provider detail");
    }
  });
});
