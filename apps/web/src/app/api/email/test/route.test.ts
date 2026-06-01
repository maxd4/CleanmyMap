import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const sendEmailMock = vi.hoisted(() => vi.fn());
const envMock = vi.hoisted(() => ({
  RESEND_API_KEY: "re_test_key" as string | undefined,
  EMAIL_FROM: "CleanMyMap <contact@mail.cleanmymap.fr>" as string | undefined,
  CONTACT_EMAIL: "contact@cleanmymap.fr" as string | undefined,
}));

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/http/auth-responses", () => ({
  adminAccessErrorJsonResponse: () => new Response("forbidden", { status: 403 }),
}));

vi.mock("@/lib/env", () => ({
  env: envMock,
}));

vi.mock("@/lib/services/email", () => ({
  sendEmail: sendEmailMock,
}));

describe("POST /api/email/test", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin_1" });
    sendEmailMock.mockResolvedValue({ id: "email_123", status: "sent" });
    envMock.RESEND_API_KEY = "re_test_key";
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
    expect(body.status).toBe("sent");
    expect(body.id).toBe("email_123");
    expect(sendEmailMock).toHaveBeenCalledWith({
      actorUserId: "admin_1",
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
    envMock.RESEND_API_KEY = undefined;

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
