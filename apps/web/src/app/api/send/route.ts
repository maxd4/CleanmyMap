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

type SendAccess = {
  actorUserId: string | null;
  adminActorUserId: string | null;
  operationId: string | null;
};

async function resolveSendAccess(request: Request): Promise<SendAccess | Response> {
  const tokenAuthorized = hasValidLocalTestToken(request);
  const { userId: authenticatedUserId } = await auth();
  if (tokenAuthorized) {
    return { actorUserId: authenticatedUserId, adminActorUserId: null, operationId: null };
  }
  const access = await requireAdminAccess();
  if (!access.ok) return adminAccessErrorJsonResponse(access);
  return {
    actorUserId: access.userId ?? authenticatedUserId,
    adminActorUserId: access.userId,
    operationId: createEmailTestAuditOperationId("send"),
  };
}

async function parseSendPayload(request: Request, access: SendAccess): Promise<
  | { ok: true; value: z.infer<typeof sendSchema> }
  | { ok: false; response: Response }
> {
  let rawPayload: unknown = {};
  try {
    if ((request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
      rawPayload = await request.json();
    }
  } catch {
    if (access.adminActorUserId && access.operationId) {
      await tryAppendEmailTestAudit({ operationId: access.operationId, actorUserId: access.adminActorUserId, route: "send", stage: "validation", code: "invalid_json" });
    }
    return { ok: false, response: NextResponse.json({ error: "Invalid JSON payload" }, { status: 400, headers: EMAIL_PRIVATE_RESPONSE_HEADERS }) };
  }
  const parsed = sendSchema.safeParse(rawPayload);
  if (!parsed.success) {
    if (access.adminActorUserId && access.operationId) {
      await tryAppendEmailTestAudit({ operationId: access.operationId, actorUserId: access.adminActorUserId, route: "send", stage: "validation", code: "invalid_payload" });
    }
    return { ok: false, response: NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten().fieldErrors }, { status: 400, headers: EMAIL_PRIVATE_RESPONSE_HEADERS }) };
  }
  return { ok: true, value: parsed.data };
}

async function recordConfigurationFailure(access: SendAccess): Promise<Response> {
  if (access.adminActorUserId && access.operationId) {
    await tryAppendEmailTestAudit({ operationId: access.operationId, actorUserId: access.adminActorUserId, route: "send", stage: "configuration", code: "email_not_configured" });
  }
  return NextResponse.json({ error: "Resend not configured" }, { status: 503, headers: EMAIL_PRIVATE_RESPONSE_HEADERS });
}

async function deliverSendEmail(params: {
  access: SendAccess;
  to: string | string[];
  from: string;
  replyTo: string;
  subject?: string;
  html?: string;
}): Promise<Response> {
  const { access, to, from, replyTo, subject, html } = params;
  try {
    const result = await sendEmail({
      actorUserId: access.actorUserId,
      from,
      to,
      subject: subject ?? "[CleanMyMap] Test Resend",
      html: html ?? "<p>Test OK depuis <strong>CleanMyMap</strong> via l'API /api/send.</p>",
      replyTo,
    });
    const auditRecorded = access.adminActorUserId && access.operationId
      ? await tryAppendEmailTestAudit({ operationId: access.operationId, actorUserId: access.adminActorUserId, route: "send", stage: "send", recipientCount: Array.isArray(to) ? to.length : 1, deliveryStatus: result.status })
      : true;
    if (access.adminActorUserId && access.operationId && !auditRecorded) {
      return NextResponse.json({ error: "Email sent, but its audit entry is unavailable.", status: "sent_audit_pending" }, { status: 503, headers: EMAIL_PRIVATE_RESPONSE_HEADERS });
    }
    return NextResponse.json({ ok: true, status: result.status, id: result.id ?? null, to }, { headers: EMAIL_PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    const quotaExceeded = isEmailQuotaExceededError(error);
    const recipientCount = Array.isArray(to) ? to.length : 1;
    if (access.adminActorUserId && access.operationId) {
      await tryAppendEmailTestAudit({ operationId: access.operationId, actorUserId: access.adminActorUserId, route: "send", stage: "send", recipientCount, code: quotaExceeded ? "email_quota_exceeded" : "send_failed" });
    }
    console.error("[Resend test] send failed", { recipientCount, code: quotaExceeded ? "email_quota_exceeded" : "send_failed" });
    return NextResponse.json({ error: quotaExceeded ? "Email quota exceeded" : "Resend send failed", details: "Unavailable" }, { status: quotaExceeded ? 429 : 502, headers: EMAIL_PRIVATE_RESPONSE_HEADERS });
  }
}

export async function POST(request: Request) {
  const access = await resolveSendAccess(request);
  if (access instanceof Response) return access;
  const from = resolveEmailFrom();
  const replyTo = resolveContactEmail();
  if (!env.RESEND_API_KEY?.trim() || !from || !replyTo) {
    return recordConfigurationFailure(access);
  }
  const parsed = await parseSendPayload(request, access);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.value;
  const to = payload.to ?? replyTo;
  return deliverSendEmail({ access, to, from, replyTo, subject: payload.subject, html: payload.html });
}
