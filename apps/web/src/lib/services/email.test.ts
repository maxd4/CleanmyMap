import { beforeEach, describe, expect, it, vi } from "vitest";

const appendServiceEmailEventMock = vi.hoisted(() => vi.fn());
const countServiceEmailRecipientsForActorSinceMock = vi.hoisted(() => vi.fn());
const getResendClientMock = vi.hoisted(() => vi.fn());
const resolveEmailFromMock = vi.hoisted(() => vi.fn());
const resolveEmailReplyToMock = vi.hoisted(() => vi.fn());
const logFailureMock = vi.hoisted(() => vi.fn());
const logWarningMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/environmental-impact-estimator/service-email-events-store", () => ({
  appendServiceEmailEvent: appendServiceEmailEventMock,
  countServiceEmailRecipientsForActorSince: countServiceEmailRecipientsForActorSinceMock,
}));

vi.mock("@/lib/email-config", () => ({
  resolveEmailFrom: resolveEmailFromMock,
  resolveEmailReplyTo: resolveEmailReplyToMock,
}));

vi.mock("./resend", () => ({
  getResendClient: getResendClientMock,
}));

vi.mock("@/lib/logging/failure-log", () => ({
  logFailure: logFailureMock,
  logWarning: logWarningMock,
}));

describe("email service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    countServiceEmailRecipientsForActorSinceMock.mockResolvedValue(0);
    resolveEmailFromMock.mockReturnValue("CleanMyMap <noreply@cleanmymap.fr>");
    resolveEmailReplyToMock.mockReturnValue("contact@cleanmymap.fr");
    getResendClientMock.mockReturnValue({
      emails: {
        send: vi.fn().mockResolvedValue({ data: { id: "email_123" }, error: null }),
      },
    });
  });

  it("blocks an actor after two sent emails in the daily window", async () => {
    countServiceEmailRecipientsForActorSinceMock.mockResolvedValue(2);

    const { sendEmail, isEmailQuotaExceededError } = await import("./email");
    expect.hasAssertions();

    try {
      await sendEmail({
        actorUserId: "user_123",
        to: "contact@cleanmymap.fr",
        subject: "Test quota",
        html: "<p>Test</p>",
      });
      throw new Error("Expected sendEmail to reject with a quota error");
    } catch (error) {
      expect(isEmailQuotaExceededError(error)).toBe(true);
      expect(error).toMatchObject({
        code: "email_quota_exceeded",
        status: 429,
        actorUserId: "user_123",
        limit: 2,
      });
    }

    expect(getResendClientMock).not.toHaveBeenCalled();
    expect(appendServiceEmailEventMock).not.toHaveBeenCalled();
    expect(countServiceEmailRecipientsForActorSinceMock).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "user_123", statuses: ["sent"] }),
    );
  });

  it("records a sent email event when resend succeeds", async () => {
    const sendMock = vi.fn().mockResolvedValue({
      data: { id: "email_123" },
      error: null,
    });
    getResendClientMock.mockReturnValue({
      emails: {
        send: sendMock,
      },
    });

    const { sendEmail } = await import("./email");
    const result = await sendEmail({
      actorUserId: "user_123",
      to: ["alpha@example.com", "beta@example.com"],
      subject: "Hello",
      html: "<p>Bonjour</p>",
      meta: { source: "test" },
    });

    expect(result).toEqual({ id: "email_123", status: "sent" });
    expect(sendMock).toHaveBeenCalledWith({
      from: "CleanMyMap <noreply@cleanmymap.fr>",
      to: ["alpha@example.com", "beta@example.com"],
      subject: "Hello",
      html: "<p>Bonjour</p>",
      replyTo: "contact@cleanmymap.fr",
    });
    expect(appendServiceEmailEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "resend",
        actorUserId: "user_123",
        recipientCount: 2,
        subject: "Hello",
        status: "sent",
        messageId: "email_123",
        meta: { source: "test" },
      }),
    );
    expect(appendServiceEmailEventMock.mock.calls[0][0]).toMatchObject({
      at: expect.any(String),
    });
    expect(countServiceEmailRecipientsForActorSinceMock).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "user_123", statuses: ["sent"] }),
    );
  });

  it("skips the actor quota only for an explicitly exempt transactional email", async () => {
    countServiceEmailRecipientsForActorSinceMock.mockResolvedValue(2);
    const sendMock = vi.fn().mockResolvedValue({
      data: { id: "email_transactional_123" },
      error: null,
    });
    getResendClientMock.mockReturnValue({ emails: { send: sendMock } });

    const { sendEmail } = await import("./email");
    await expect(
      sendEmail({
        actorUserId: "user_123",
        quotaPolicy: "none",
        to: "creator@cleanmymap.fr",
        subject: "DSA notification",
        html: "<p>Notification</p>",
        meta: { source: "legal_content_report", notification: "creator_inbox" },
      }),
    ).resolves.toEqual({ id: "email_transactional_123", status: "sent" });

    expect(countServiceEmailRecipientsForActorSinceMock).not.toHaveBeenCalled();
    expect(appendServiceEmailEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user_123",
        status: "sent",
        messageId: "email_transactional_123",
        meta: { source: "legal_content_report", notification: "creator_inbox" },
      }),
    );
  });

  it("records a bounded diagnostic for a non-Error provider failure", async () => {
    const providerError = {
      name: "validation_error",
      message: "Invalid sender; Authorization: Bearer secret-token; apiKey=secret-key",
      statusCode: 422,
      status: "error",
      code: "invalid_from",
      headers: { authorization: "secret-header" },
      payload: { html: "private payload" },
    };
    getResendClientMock.mockReturnValue({
      emails: {
        send: vi.fn().mockResolvedValue({ data: null, error: providerError }),
      },
    });

    const { sendEmail } = await import("./email");
    await expect(
      sendEmail({
        to: "recipient@example.com",
        subject: "Provider diagnostic",
        html: "<p>Test</p>",
      }),
    ).rejects.toBe(providerError);

    const event = appendServiceEmailEventMock.mock.calls[0]?.[0];
    expect(event).toMatchObject({
      provider: "resend",
      status: "error",
      messageId: null,
      meta: {
        error:
          "name=validation_error; message=Invalid sender; Authorization: [redacted]; apiKey=[redacted]; statusCode=422; status=error; code=invalid_from",
      },
    });
    expect(JSON.stringify(event)).not.toContain("secret-token");
    expect(JSON.stringify(event)).not.toContain("secret-key");
    expect(JSON.stringify(event)).not.toContain("secret-header");
    expect(JSON.stringify(event)).not.toContain("private payload");
    expect(logFailureMock).toHaveBeenCalledWith(
      "EmailService",
      "Send failed",
      undefined,
      expect.objectContaining({
        reason: expect.stringContaining("validation_error"),
      }),
    );
    expect(JSON.stringify(logFailureMock.mock.calls)).not.toContain("secret-token");
    expect(JSON.stringify(logFailureMock.mock.calls)).not.toContain("private payload");
  });

  it("fails closed to a recorded mock when the provider key is unavailable", async () => {
    getResendClientMock.mockReturnValue(null);
    const { sendEmail } = await import("./email");

    await expect(sendEmail({
      actorUserId: "user_123",
      to: ["one@example.com", "two@example.com"],
      subject: "Provider absent",
      html: "<p>Test</p>",
    })).resolves.toEqual({ id: "mock_id", status: "mocked" });
    expect(appendServiceEmailEventMock).toHaveBeenCalledWith(expect.objectContaining({
      provider: "mock",
      recipientCount: 2,
      status: "mocked",
      messageId: "mock_id",
    }));
  });

  it("records missing sender configuration without attempting the provider", async () => {
    resolveEmailFromMock.mockReturnValue("");
    const { sendEmail } = await import("./email");

    await expect(sendEmail({
      to: "recipient@example.com",
      subject: "Sender absent",
      html: "<p>Test</p>",
    })).resolves.toEqual({ id: null, status: "missing_config" });
    expect(getResendClientMock).not.toHaveBeenCalled();
    expect(appendServiceEmailEventMock).toHaveBeenCalledWith(expect.objectContaining({
      provider: "mock",
      status: "missing_config",
      messageId: null,
    }));
  });

  it("does not turn event-recording failure into a false delivery failure", async () => {
    appendServiceEmailEventMock.mockRejectedValueOnce(new Error("event store unavailable"));
    const { sendEmail } = await import("./email");

    await expect(sendEmail({
      to: "recipient@example.com",
      subject: "Recorded best effort",
      html: "<p>Test</p>",
    })).resolves.toEqual({ id: "email_123", status: "sent" });
    expect(logWarningMock).toHaveBeenCalledWith(
      "EmailService",
      "Failed to record email event",
      expect.objectContaining({ reason: "event store unavailable" }),
    );
  });

  it("redacts string and hostile provider diagnostics while preserving the original rejection", async () => {
    const providerError = "Authorization: Bearer top-secret-token; password=secret-value";
    getResendClientMock.mockReturnValue({
      emails: { send: vi.fn().mockResolvedValue({ data: null, error: providerError }) },
    });
    const { sendEmail, isEmailQuotaExceededError } = await import("./email");

    await expect(sendEmail({ to: "recipient@example.com", subject: "String failure", html: "<p>Test</p>" }))
      .rejects.toBe(providerError);
    const diagnostic = JSON.stringify(appendServiceEmailEventMock.mock.calls[0]?.[0]);
    expect(diagnostic).toContain("Authorization: [redacted]");
    expect(diagnostic).not.toContain("top-secret-token");
    expect(diagnostic).not.toContain("secret-value");
    expect(isEmailQuotaExceededError(new Error("other"))).toBe(false);
  });

  it("handles empty provider responses and non-readable diagnostic fields safely", async () => {
    const { sendEmail, ensureEmailQuotaAvailable } = await import("./email");
    await expect(ensureEmailQuotaAvailable("user_123", 2)).resolves.toBeUndefined();

    getResendClientMock.mockReturnValue({
      emails: { send: vi.fn().mockResolvedValue({ data: null, error: null }) },
    });
    await expect(sendEmail({ to: "recipient@example.com", subject: "No provider id", html: "<p>Test</p>" }))
      .resolves.toEqual({ id: undefined, status: "sent" });

    const unreadable = {} as Record<string, unknown>;
    Object.defineProperties(unreadable, {
      name: { get: () => { throw new Error("unreadable"); } },
      message: { value: "" },
      statusCode: { value: Number.NaN },
      status: { value: {} },
      code: { value: 0 },
    });
    getResendClientMock.mockReturnValue({
      emails: { send: vi.fn().mockResolvedValue({ data: null, error: unreadable }) },
    });
    await expect(sendEmail({ to: "recipient@example.com", subject: "Unreadable failure", html: "<p>Test</p>" }))
      .rejects.toBe(unreadable);
    expect(appendServiceEmailEventMock).toHaveBeenLastCalledWith(expect.objectContaining({
      status: "error",
      meta: { error: "code=0" },
    }));
  });
});
