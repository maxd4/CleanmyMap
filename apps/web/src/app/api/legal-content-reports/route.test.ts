import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const botIdMock = vi.hoisted(() => vi.fn());
const appendMock = vi.hoisted(() => vi.fn());
const acknowledgementMock = vi.hoisted(() => vi.fn());
const creatorNotificationMock = vi.hoisted(() => vi.fn());
const verifyRateLimitMock = vi.hoisted(() => vi.fn());
const createServerRateLimitResponseMock = vi.hoisted(() => vi.fn());
const createPublicRateLimitResponseMock = vi.hoisted(() => vi.fn());
const hasHoneypotSignalMock = vi.hoisted(() => vi.fn());
const hasRecentSubmissionMock = vi.hoisted(() => vi.fn());
const logWarningMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/botid/server", () => ({ requireBotIdHuman: botIdMock }));
vi.mock("@/lib/legal-content-report/legal-content-report-store", () => ({
  appendLegalContentReport: appendMock,
}));
vi.mock("@/lib/legal-content-report/legal-content-report-service", () => ({
  sendLegalContentReportAcknowledgement: acknowledgementMock,
  sendLegalContentReportCreatorNotification: creatorNotificationMock,
}));
vi.mock("@/lib/rate-limit/server", () => ({
  createServerRateLimitResponse: createServerRateLimitResponseMock,
  verifyRateLimit: verifyRateLimitMock,
}));
vi.mock("@/lib/security/validation", () => ({
  createPublicRateLimitResponse: createPublicRateLimitResponseMock,
  hasHoneypotSignal: hasHoneypotSignalMock,
  hasRecentSubmission: hasRecentSubmissionMock,
  isPlaceholderHost: () => false,
}));
vi.mock("@/lib/logging/failure-log", () => ({ logWarning: logWarningMock }));

const record = {
  id: "report_123",
  createdAt: "2026-08-27T10:00:00.000Z",
  submittedByUserId: "user_123",
  notifierName: "Alice",
  notifierEmail: "alice@example.com",
  identityExceptionReason: null,
  contentUrl: "https://cleanmymap.fr/content/123",
  contentType: "commentaire",
  contentId: "123",
  allegationReason: "Ce contenu décrit précisément un risque et fournit les éléments utiles.",
  goodFaithConfirmed: true as const,
  status: "open" as const,
  creatorState: "new" as const,
};

function request(payload: Record<string, unknown>) {
  return new Request("http://localhost/api/legal-content-reports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      notifierName: "Alice",
      notifierEmail: "alice@example.com",
      identityException: false,
      identityExceptionReason: "",
      contentUrl: "https://cleanmymap.fr/content/123",
      contentType: "commentaire",
      contentId: "123",
      allegationReason: "Ce contenu décrit précisément un risque et fournit les éléments utiles.",
      goodFaithConfirmed: true,
      honeypot: "",
      submittedAt: Date.now() - 5000,
      ...payload,
    }),
  });
}

describe("POST /api/legal-content-reports", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user_123" });
    botIdMock.mockResolvedValue(null);
    verifyRateLimitMock.mockResolvedValue({ allowed: true, retryAfter: null });
    createServerRateLimitResponseMock.mockReturnValue(null);
    hasHoneypotSignalMock.mockReturnValue(false);
    hasRecentSubmissionMock.mockReturnValue(false);
    createPublicRateLimitResponseMock.mockReturnValue(new Response("rate", { status: 429 }));
    appendMock.mockResolvedValue(record);
    acknowledgementMock.mockResolvedValue({ status: "sent" });
    creatorNotificationMock.mockResolvedValue(true);
  });

  it("validates the report, persists it before notifications and returns a tracking id", async () => {
    const events: string[] = [];
    appendMock.mockImplementation(async () => {
      events.push("persist");
      return record;
    });
    acknowledgementMock.mockImplementation(async () => {
      events.push("ack");
      return { status: "sent" };
    });
    creatorNotificationMock.mockImplementation(async () => {
      events.push("creator");
      return true;
    });
    const { POST } = await import("./route");

    const response = await POST(request({}));
    const body = (await response.json()) as { trackingId?: string; notification?: { acknowledgement?: string } };

    expect(response.status).toBe(201);
    expect(body.trackingId).toBe("report_123");
    expect(body.notification?.acknowledgement).toBe("sent");
    expect(events).toEqual(["persist", "ack", "creator"]);
    expect(appendMock).toHaveBeenCalledWith(expect.objectContaining({ submittedByUserId: "user_123" }));
  });

  it("requires identity outside the directive exception", async () => {
    const { POST } = await import("./route");
    const response = await POST(request({ notifierName: "", notifierEmail: "" }));
    expect(response.status).toBe(400);
    expect(appendMock).not.toHaveBeenCalled();
  });

  it("allows an identity-free report for the explicit exception", async () => {
    appendMock.mockResolvedValueOnce({ ...record, notifierName: null, notifierEmail: null });
    const { POST } = await import("./route");
    const response = await POST(
      request({ identityException: true, notifierName: "", notifierEmail: "" }),
    );
    expect(response.status).toBe(201);
    expect(appendMock).toHaveBeenCalledWith(
      expect.objectContaining({ notifierName: null, notifierEmail: null }),
    );
    expect(acknowledgementMock).not.toHaveBeenCalled();
  });

  it("rejects missing URL, insufficient reason and missing good faith", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      request({ contentUrl: "", allegationReason: "trop court", goodFaithConfirmed: false }),
    );
    expect(response.status).toBe(400);
    expect(appendMock).not.toHaveBeenCalled();
  });

  it("keeps the persisted report when notifications fail", async () => {
    acknowledgementMock.mockRejectedValueOnce(new Error("Resend unavailable"));
    creatorNotificationMock.mockRejectedValueOnce(new Error("Inbox unavailable"));
    const { POST } = await import("./route");
    const response = await POST(request({}));
    const body = (await response.json()) as { trackingId?: string; notification?: { acknowledgement?: string; creatorInbox?: string } };
    expect(response.status).toBe(201);
    expect(body.trackingId).toBe("report_123");
    expect(body.notification).toEqual({ acknowledgement: "failed", creatorInbox: "failed" });
    expect(appendMock).toHaveBeenCalled();
    expect(logWarningMock).toHaveBeenCalledTimes(2);
  });

  it("applies BotID and rate limiting before persistence", async () => {
    botIdMock.mockResolvedValueOnce(new Response("bot", { status: 403 }));
    const { POST } = await import("./route");
    expect((await POST(request({}))).status).toBe(403);
    expect(appendMock).not.toHaveBeenCalled();

    botIdMock.mockResolvedValue(null);
    verifyRateLimitMock.mockResolvedValueOnce({ allowed: false, retryAfter: 20 });
    createServerRateLimitResponseMock.mockReturnValueOnce(new Response("limited", { status: 429 }));
    expect((await POST(request({}))).status).toBe(429);
    expect(appendMock).not.toHaveBeenCalled();
  });
});
