import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const appendContactRequestMock = vi.hoisted(() => vi.fn());
const updateContactRequestStatusMock = vi.hoisted(() => vi.fn());
const sendCreatorInboxEmailMock = vi.hoisted(() => vi.fn());
const verifyRateLimitMock = vi.hoisted(() => vi.fn());
const createServerRateLimitResponseMock = vi.hoisted(() => vi.fn());
const createPublicRateLimitResponseMock = vi.hoisted(() => vi.fn());
const hasHoneypotSignalMock = vi.hoisted(() => vi.fn());
const hasRecentSubmissionMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/community/creator-inbox-email", () => ({
  sendCreatorInboxEmail: sendCreatorInboxEmailMock,
}));

vi.mock("@/lib/contact/contact-requests-store", () => ({
  appendContactRequest: appendContactRequestMock,
  updateContactRequestStatus: updateContactRequestStatusMock,
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

describe("POST /api/contact", () => {
  const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    authMock.mockResolvedValue({ userId: "user_123" });
    hasHoneypotSignalMock.mockReturnValue(false);
    hasRecentSubmissionMock.mockReturnValue(false);
    verifyRateLimitMock.mockResolvedValue({ allowed: true, retryAfter: null });
    createServerRateLimitResponseMock.mockReturnValue(null);
    createPublicRateLimitResponseMock.mockReturnValue(
      new Response("public-rate-limit", { status: 429 }),
    );
    appendContactRequestMock.mockResolvedValue({
      id: "contact_123",
      createdAt: "2026-05-31T09:00:00.000Z",
      submittedByUserId: "user_123",
      submittedByEmail: "alice@example.com",
      requestType: "erasure",
      subject: "Droit à l'effacement",
      message: "Merci de supprimer mon compte.",
      pagePath: "/contact",
      source: "contact_page",
      status: "queued",
      notificationError: null,
    });
    updateContactRequestStatusMock.mockResolvedValue({
      id: "contact_123",
      createdAt: "2026-05-31T09:00:00.000Z",
      submittedByUserId: "user_123",
      submittedByEmail: "alice@example.com",
      requestType: "erasure",
      subject: "Droit à l'effacement",
      message: "Merci de supprimer mon compte.",
      pagePath: "/contact",
      source: "contact_page",
      status: "sent",
      notificationError: null,
    });
    sendCreatorInboxEmailMock.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    consoleWarnSpy.mockRestore();
  });

  it("persists the contact request and sends the notification email", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/contact", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "127.0.0.1",
        },
        body: JSON.stringify({
          requestType: "erasure",
          email: "alice@example.com",
          message: "Merci de supprimer mon compte.",
          honeypot: "",
          submittedAt: Date.now() - 5000,
        }),
      }),
    );

    const body = (await response.json()) as {
      status?: string;
      requestId?: string;
      item?: { id?: string; status?: string };
    };

    expect(response.status).toBe(201);
    expect(body.status).toBe("queued");
    expect(body.requestId).toBe("contact_123");
    expect(body.item?.status).toBe("sent");
    expect(appendContactRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        submittedByUserId: "user_123",
        input: expect.objectContaining({
          submittedByEmail: "alice@example.com",
          requestType: "erasure",
          pagePath: "/contact",
        }),
      }),
    );
    expect(sendCreatorInboxEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user_123",
        replyTo: "alice@example.com",
        subject: "[CleanMyMap] Contact - Droit à l'effacement",
      }),
    );
    expect(updateContactRequestStatusMock).toHaveBeenCalledWith({
      requestId: "contact_123",
      status: "sent",
    });
  });

  it("keeps the contact request if notification sending fails", async () => {
    sendCreatorInboxEmailMock.mockRejectedValueOnce(new Error("Resend unavailable"));

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/contact", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          requestType: "access",
          email: "bob@example.com",
          message: "Je souhaite obtenir une copie de mes données.",
          honeypot: "",
          submittedAt: Date.now() - 5000,
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(appendContactRequestMock).toHaveBeenCalled();
    expect(updateContactRequestStatusMock).toHaveBeenCalledWith({
      requestId: "contact_123",
      status: "failed",
      notificationError: "Resend unavailable",
    });
  });
});
