import { beforeEach, describe, expect, it, vi } from "vitest";

const sendEmailMock = vi.hoisted(() => vi.fn());
const resolveEmailFromMock = vi.hoisted(() => vi.fn());
const resolveEmailReplyToMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/env", () => ({
  env: { CREATOR_INBOX_EMAIL: "creator@cleanmymap.fr" },
}));
vi.mock("@/lib/email-config", () => ({
  resolveContactEmail: () => "contact@cleanmymap.fr",
  resolveEmailFrom: resolveEmailFromMock,
  resolveEmailReplyTo: resolveEmailReplyToMock,
}));
vi.mock("@/lib/services/email", () => ({ sendEmail: sendEmailMock }));

describe("creator inbox email", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    resolveEmailFromMock.mockReturnValue("CleanMyMap <noreply@cleanmymap.fr>");
    resolveEmailReplyToMock.mockReturnValue("contact@cleanmymap.fr");
    sendEmailMock.mockResolvedValue({ id: "email_123", status: "sent" });
  });

  it("forwards an explicit quota policy while preserving actor and metadata", async () => {
    const { sendCreatorInboxEmail } = await import("./creator-inbox-email");

    await expect(
      sendCreatorInboxEmail({
        actorUserId: "user_123",
        quotaPolicy: "none",
        subject: "DSA notification",
        title: "Notification légale",
        intro: "Une notification est disponible.",
        lines: [{ label: "Suivi", value: "report_123" }],
        meta: { source: "legal_content_report", notification: "creator_inbox" },
      }),
    ).resolves.toBe(true);

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user_123",
        quotaPolicy: "none",
        meta: { source: "legal_content_report", notification: "creator_inbox" },
      }),
    );
  });

  it("keeps the default quota policy implicit for existing callers", async () => {
    const { sendCreatorInboxEmail } = await import("./creator-inbox-email");

    await sendCreatorInboxEmail({
      actorUserId: "user_123",
      subject: "Normal notification",
      title: "Notification",
      intro: "Une notification est disponible.",
      lines: [],
    });

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "user_123" }),
    );
    expect(sendEmailMock.mock.calls[0][0]).not.toHaveProperty("quotaPolicy", "none");
  });
});
