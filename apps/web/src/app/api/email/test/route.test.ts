import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const sendEmailMock = vi.hoisted(() => vi.fn());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());

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
  isEmailQuotaExceededError: (error: unknown) =>
    error instanceof Error && error.name === "EmailQuotaExceededError",
}));

vi.mock("@/lib/admin/operation-audit", () => ({
  appendAdminOperationAudit: appendAdminOperationAuditMock,
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
    appendAdminOperationAuditMock.mockResolvedValue(undefined);

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
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
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
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock.mock.calls[0]?.[0]).toMatchObject({
      actorUserId: "admin_123",
      operationType: "admin_operation",
      outcome: "success",
      details: {
        operation: "send_test_email",
        route: "email_test",
        stage: "send",
        recipientCount: 1,
        deliveryStatus: "sent",
      },
    });
    expect(
      Object.keys(appendAdminOperationAuditMock.mock.calls[0]?.[0].details ?? {}),
    ).toEqual(["operation", "route", "stage", "recipientCount", "deliveryStatus"]);
  });

  it("audits a send failure without exposing the provider error", async () => {
    sendEmailMock.mockRejectedValueOnce(new Error("raw-resend-provider-error"));

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

    expect(response.status).toBe(502);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    const audit = appendAdminOperationAuditMock.mock.calls[0]?.[0];
    expect(audit).toMatchObject({
      actorUserId: "admin_123",
      operationType: "admin_operation",
      outcome: "error",
      details: {
        operation: "send_test_email",
        route: "email_test",
        stage: "send",
        recipientCount: 1,
        code: "send_failed",
      },
    });
    expect(JSON.stringify(audit)).not.toContain("raw-resend-provider-error");
  });

  it("audits quota rejection with a bounded code", async () => {
    const quotaError = new Error("raw-quota-provider-error");
    quotaError.name = "EmailQuotaExceededError";
    sendEmailMock.mockRejectedValueOnce(quotaError);

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

    expect(response.status).toBe(429);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock.mock.calls[0]?.[0]).toMatchObject({
      outcome: "error",
      details: {
        operation: "send_test_email",
        route: "email_test",
        stage: "send",
        code: "email_quota_exceeded",
      },
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
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock.mock.calls[0]?.[0]).toMatchObject({
      outcome: "error",
      details: {
        operation: "send_test_email",
        route: "email_test",
        stage: "validation",
        code: "invalid_json",
      },
    });
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
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock.mock.calls[0]?.[0]).toMatchObject({
      outcome: "error",
      details: {
        operation: "send_test_email",
        route: "email_test",
        stage: "configuration",
        code: "email_not_configured",
      },
    });
  });

  it("audits an invalid payload before attempting a send", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/email/test", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ to: "not-an-email" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock.mock.calls[0]?.[0]).toMatchObject({
      outcome: "error",
      details: {
        operation: "send_test_email",
        route: "email_test",
        stage: "validation",
        code: "invalid_payload",
      },
    });
  });
});
