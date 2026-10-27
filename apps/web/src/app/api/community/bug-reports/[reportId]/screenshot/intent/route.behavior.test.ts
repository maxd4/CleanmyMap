import { beforeEach, describe, expect, it, vi } from "vitest";

const access = vi.hoisted(() => vi.fn());
const serverClient = vi.hoisted(() => vi.fn(() => ({})));
const createIntent = vi.hoisted(() => vi.fn());
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
  createBugReportScreenshotUploadIntent: createIntent,
}));

import { POST } from "./route";

const context = { params: Promise.resolve({ reportId: "feedback-1" }) };
const makeRequest = (body: string, init: RequestInit = {}) => new Request("https://cleanmymap.test/api/community/bug-reports/feedback-1/screenshot/intent", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  ...init,
  body,
});

describe("POST screenshot intent boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    access.mockResolvedValue({ ok: true, userId: "owner-1" });
    createIntent.mockResolvedValue({ feedbackId: "feedback-1", attemptId: "attempt-1", uploadState: "pending", token: "token" });
  });

  it("rejects anonymous and malformed requests before creating a Storage intent", async () => {
    access.mockResolvedValueOnce({ ok: false });
    expect((await POST(makeRequest("{}"), context)).status).toBe(401);
    for (const body of ["not-json", JSON.stringify({}), JSON.stringify({ originalName: "capture.png", mimeType: "image/png", sizeBytes: 0 })]) {
      expect((await POST(makeRequest(body), context)).status).toBe(422);
    }
    expect(createIntent).not.toHaveBeenCalled();
  });

  it("passes the authenticated owner and report id to the real application service", async () => {
    const response = await POST(makeRequest(JSON.stringify({ originalName: " capture.png ", mimeType: "image/png", sizeBytes: 12, width: 800, height: 600 })), context);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ status: "ok", intent: expect.objectContaining({ uploadState: "pending" }) });
    expect(createIntent).toHaveBeenCalledWith({}, {
      originalName: "capture.png", mimeType: "image/png", sizeBytes: 12, width: 800, height: 600,
      userId: "owner-1", feedbackId: "feedback-1",
    });
  });

  it.each([
    ["forbidden", 403],
    ["not_found", 404],
    ["validation", 422],
    ["storage_error", 500],
  ] as const)("does not expose service details for %s", async (code, status) => {
    const message = code === "validation" ? "La capture est invalide." : "private storage detail";
    createIntent.mockRejectedValueOnce(new BugReportScreenshotError(message, code));
    const response = await POST(makeRequest(JSON.stringify({ originalName: "capture.png", mimeType: "image/png", sizeBytes: 12 })), context);
    expect(response.status).toBe(status);
    const body = JSON.stringify(await response.json());
    expect(body).not.toContain(code === "validation" ? "provider secret" : "private storage detail");
  });
});
