import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const sendEmailMock = vi.hoisted(() => vi.fn());

const envMock = vi.hoisted(() => ({
  RESEND_API_KEY: "re_test_key" as string | undefined,
  EMAIL_FROM: "CleanMyMap <noreply@cleanmymap.fr>" as string | undefined,
  CONTACT_EMAIL: "contact@cleanmymap.fr" as string | undefined,
}));

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/http/auth-responses", () => ({
  adminAccessErrorJsonResponse: () =>
    new Response("forbidden", { status: 403 }),
}));

vi.mock("@/lib/env", () => ({
  env: envMock,
}));

vi.mock("@/lib/services/email", () => ({
  sendEmail: sendEmailMock,
}));

describe("POST /api/email/test", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    requireAdminAccessMock.mockResolvedValue({
      ok: true,
      userId: "admin_123",
    });

    sendEmailMock.mockResolvedValue({
      id: "email_123",
      status: "sent",
    });

    envMock.RESEND_API_KEY = "re_test_key";
    envMock.EMAIL_FROM = "CleanMyMap <noreply@cleanmymap.fr>";
    envMock.CONTACT_EMAIL = "contact@cleanmymap.fr";
  });

  it("rejects a non-admin request", async () => {
    requireAdminAccessMock.mockResolvedValue({ ok: false });

    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/email/test", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(403);
    expect(sendEmailMock).not.toHaveBeenCalled();
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
      actorUserId: "admin_123",
      from: "CleanMyMap <noreply@cleanmymap.fr>",
      to: "contact@cleanmymap.fr",
      subject: "Hello World",
      html: "<p>Test OK</p>",
      replyTo: "contact@cleanmymap.fr",
    });
  });

  it("rejects invalid JSON", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/email/test", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: "{",
      }),
    );

    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid JSON");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("returns 503 when email configuration is missing", async () => {
    envMock.EMAIL_FROM = undefined;
    envMock.CONTACT_EMAIL = undefined;

    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/email/test", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      }),
    );

    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(503);
    expect(body.error).toBe("Resend not configured");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
