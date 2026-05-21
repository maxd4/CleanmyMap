import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const resendSendMock = vi.hoisted(() => vi.fn());
const getResendClientMock = vi.hoisted(() => vi.fn());
const envMock = vi.hoisted(() => ({
  EMAIL_FROM: "CleanMyMap <contact@mail.cleanmymap.fr>" as string | undefined,
  CONTACT_EMAIL: "contact@cleanmymap.fr" as string | undefined,
}));

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/env", () => ({
  env: envMock,
}));

vi.mock("@/lib/services/resend", () => ({
  getResendClient: getResendClientMock,
}));

describe("POST /api/email/test", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true });
    resendSendMock.mockResolvedValue({ data: { id: "email_123" }, error: null });
    getResendClientMock.mockReturnValue({
      emails: { send: resendSendMock },
    });
    envMock.EMAIL_FROM = "CleanMyMap <contact@mail.cleanmymap.fr>";
    envMock.CONTACT_EMAIL = "contact@cleanmymap.fr";
  });

  it("sends a test email using the configured sender and contact inbox", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/email/test", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          to: "contact@cleanmymap.fr",
          subject: "Hello World",
          html: "<p>Test OK</p>",
        }),
      }),
    );

    const body = (await response.json()) as {
      status?: string;
      id?: string;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("queued");
    expect(body.id).toBe("email_123");
    expect(resendSendMock).toHaveBeenCalledWith({
      from: "CleanMyMap <contact@mail.cleanmymap.fr>",
      to: "contact@cleanmymap.fr",
      subject: "Hello World",
      html: "<p>Test OK</p>",
      replyTo: "contact@cleanmymap.fr",
    });
  });

  it("returns 503 when Resend sender config is missing", async () => {
    const { POST } = await import("./route");
    envMock.EMAIL_FROM = undefined;

    const response = await POST(
      new Request("http://localhost/api/email/test", {
        method: "POST",
      }),
    );

    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(503);
    expect(body.error).toBe("Resend not configured");
  });
});
