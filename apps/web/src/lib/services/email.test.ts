import { beforeEach, describe, expect, it, vi } from "vitest";

const appendServiceEmailEventMock = vi.hoisted(() => vi.fn());
const countServiceEmailRecipientsForActorSinceMock = vi.hoisted(() => vi.fn());
const getResendClientMock = vi.hoisted(() => vi.fn());
const resolveEmailFromMock = vi.hoisted(() => vi.fn());
const resolveEmailReplyToMock = vi.hoisted(() => vi.fn());

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
  });
});
