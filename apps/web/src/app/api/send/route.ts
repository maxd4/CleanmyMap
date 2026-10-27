import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import {
  createEmailTestAuditOperationId,
  EMAIL_PRIVATE_RESPONSE_HEADERS,
  tryAppendEmailTestAudit,
} from "@/lib/admin/audit/email-test-audit";
import { env } from "@/lib/env";
import { resolveContactEmail, resolveEmailFrom } from "@/lib/email-config";
import {
  isEmailQuotaExceededError,
  sendEmail,
} from "@/lib/services/email";

export const runtime = "nodejs";

const sendSchema = z.object({
  to: z
    .union([
      z.string().email(),
      z.array(z.string().email()).min(1).max(10),
    ])
    .optional(),
  subject: z.string().trim().min(1).max(200).optional(),
  html: z.string().trim().min(1).max(10000).optional(),
});

function hasValidLocalTestToken(request: Request): boolean {
  if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") {
    return false;
  }

  const configuredToken = env.RESEND_TEST_TOKEN?.trim();
  if (!configuredToken) {
    return false;
  }

  const tokenFromHeader = request.headers.get("x-resend-test-token")?.trim();
  return Boolean(tokenFromHeader && tokenFromHeader === configuredToken);
}

export async function POST(request: Request) {
  const tokenAuthorized = hasValidLocalTestToken(request);
  const { userId: authenticatedUserId } = await auth();
  let adminActorUserId: string | null = null;

  if (!tokenAuthorized) {
    const access = await requireAdminAccess();
    if (!access.ok) {
      return adminAccessErrorJsonResponse(access);
    }
    adminActorUserId = access.userId;
  }

  const actorUserId = adminActorUserId ?? authenticatedUserId;
  const operationId = adminActorUserId
    ? createEmailTestAuditOperationId("send")
    : null;

  const from = resolveEmailFrom();
  const replyTo = resolveContactEmail();

  if (!env.RESEND_API_KEY?.trim() || !from || !replyTo) {
    if (adminActorUserId && operationId) {
      await tryAppendEmailTestAudit({
        operationId,
        actorUserId: adminActorUserId,
        route: "send",
        stage: "configuration",
        code: "email_not_configured",
      });
    }
    return NextResponse.json(
      { error: "Resend not configured" },
      { status: 503, headers: EMAIL_PRIVATE_RESPONSE_HEADERS },
    );
  }

  let rawPayload: unknown = {};

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.toLowerCase().includes("application/json")) {
      rawPayload = await request.json();
    }
  } catch {
    if (adminActorUserId && operationId) {
      await tryAppendEmailTestAudit({
        operationId,
        actorUserId: adminActorUserId,
        route: "send",
        stage: "validation",
        code: "invalid_json",
      });
    }
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400, headers: EMAIL_PRIVATE_RESPONSE_HEADERS },
    );
  }

  const parsed = sendSchema.safeParse(rawPayload);

  if (!parsed.success) {
    if (adminActorUserId && operationId) {
      await tryAppendEmailTestAudit({
        operationId,
        actorUserId: adminActorUserId,
        route: "send",
        stage: "validation",
        code: "invalid_payload",
      });
    }
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400, headers: EMAIL_PRIVATE_RESPONSE_HEADERS },
    );
  }

  const payload = parsed.data;
  const to = payload.to ?? replyTo;

  try {
    const result = await sendEmail({
      actorUserId,
      from,
      to,
      subject: payload.subject ?? "[CleanMyMap] Test Resend",
      html:
        payload.html ??
        "<p>Test OK depuis <strong>CleanMyMap</strong> via l'API /api/send.</p>",
      replyTo,
    });

    let auditRecorded = true;
    if (adminActorUserId && operationId) {
      auditRecorded = await tryAppendEmailTestAudit({
        operationId,
        actorUserId: adminActorUserId,
        route: "send",
        stage: "send",
        recipientCount: Array.isArray(to) ? to.length : 1,
        deliveryStatus: result.status,
      });
    }

    if (adminActorUserId && operationId && !auditRecorded) {
      return NextResponse.json(
        { error: "Email sent, but its audit entry is unavailable.", status: "sent_audit_pending" },
        { status: 503, headers: EMAIL_PRIVATE_RESPONSE_HEADERS },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        status: result.status,
        id: result.id ?? null,
        to,
      },
      { headers: EMAIL_PRIVATE_RESPONSE_HEADERS },
    );
  } catch (error) {
    const quotaExceeded = isEmailQuotaExceededError(error);
    const recipientCount = Array.isArray(to) ? to.length : 1;

    if (adminActorUserId && operationId) {
      await tryAppendEmailTestAudit({
        operationId,
        actorUserId: adminActorUserId,
        route: "send",
        stage: "send",
        recipientCount,
        code: quotaExceeded ? "email_quota_exceeded" : "send_failed",
      });
    }

    console.error("[Resend test] send failed", {
      recipientCount,
      code: quotaExceeded ? "email_quota_exceeded" : "send_failed",
    });

    return NextResponse.json(
      {
        error: quotaExceeded ? "Email quota exceeded" : "Resend send failed",
        details: "Unavailable",
      },
      { status: quotaExceeded ? 429 : 502, headers: EMAIL_PRIVATE_RESPONSE_HEADERS },
    );
  }
}
