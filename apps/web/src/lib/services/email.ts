import { getResendClient } from "./resend";
import { resolveEmailFrom, resolveEmailReplyTo } from "@/lib/email-config";
import {
  appendServiceEmailEvent,
  countServiceEmailRecipientsForActorSince,
} from "@/lib/environmental-impact-estimator/service-email-events-store";
import { logFailure, logWarning } from "@/lib/logging/failure-log";

export const SERVICE_EMAIL_DAILY_LIMIT = 2;

export class EmailQuotaExceededError extends Error {
  readonly code = "email_quota_exceeded";
  readonly status = 429;
  readonly actorUserId: string;
  readonly limit: number;
  readonly remaining: number;

  constructor(params: { actorUserId: string; limit: number; remaining: number }) {
    super("Quota quotidienne d'envoi d'emails atteinte.");
    this.name = "EmailQuotaExceededError";
    this.actorUserId = params.actorUserId;
    this.limit = params.limit;
    this.remaining = params.remaining;
  }
}

export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  actorUserId?: string | null;
  meta?: Record<string, unknown>;
};

function getRecipientCount(to: string | string[]): number {
  return Array.isArray(to) ? to.length : 1;
}

export function isEmailQuotaExceededError(error: unknown): error is EmailQuotaExceededError {
  return error instanceof EmailQuotaExceededError;
}

export async function ensureEmailQuotaAvailable(
  actorUserId: string,
  requiredCount = 1,
): Promise<void> {
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sentCount = await countServiceEmailRecipientsForActorSince({
    actorUserId,
    sinceIso,
    statuses: ["sent"],
  });

  if (sentCount + requiredCount > SERVICE_EMAIL_DAILY_LIMIT) {
    throw new EmailQuotaExceededError({
      actorUserId,
      limit: SERVICE_EMAIL_DAILY_LIMIT,
      remaining: Math.max(0, SERVICE_EMAIL_DAILY_LIMIT - sentCount),
    });
  }
}

async function recordEmailEvent(params: {
  actorUserId: string | null;
  provider: "resend" | "mock";
  recipientCount: number;
  subject: string;
  status: "sent" | "mocked" | "missing_config" | "error";
  messageId: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    await appendServiceEmailEvent({
      at: new Date().toISOString(),
      provider: params.provider,
      actorUserId: params.actorUserId,
      recipientCount: params.recipientCount,
      subject: params.subject,
      status: params.status,
      messageId: params.messageId,
      meta: params.meta,
    });
  } catch (error) {
    logWarning("EmailService", "Failed to record email event", {
      subject: params.subject,
      actorUserId: params.actorUserId,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

async function sendMockEmail(params: {
  actorUserId: string | null;
  recipientCount: number;
  subject: string;
  meta?: Record<string, unknown>;
  from: string | undefined;
  replyTo: string | undefined;
  reason: "missing_resend" | "missing_sender";
}) {
  if (params.reason === "missing_resend") {
    logWarning("EmailService", "RESEND_API_KEY missing, logging email instead", {
      subject: params.subject,
      from: params.from,
      replyTo: params.replyTo,
    });
  } else {
    logFailure("EmailService", "Missing sender configuration", undefined, {
      subject: params.subject,
    });
  }

  await recordEmailEvent({
    actorUserId: params.actorUserId,
    provider: "mock",
    recipientCount: params.recipientCount,
    subject: params.subject,
    status: params.reason === "missing_resend" ? "mocked" : "missing_config",
    messageId: params.reason === "missing_resend" ? "mock_id" : null,
    meta: params.meta,
  });

  return params.reason === "missing_resend"
    ? { id: "mock_id", status: "mocked" as const }
    : { id: null, status: "missing_config" as const };
}

async function sendRealEmail(params: {
  actorUserId: string | null;
  recipientCount: number;
  to: string | string[];
  subject: string;
  html: string;
  from: string;
  replyTo: string | undefined;
  meta?: Record<string, unknown>;
}) {
  const resend = getResendClient();
  if (!resend) {
    return sendMockEmail({
      actorUserId: params.actorUserId,
      recipientCount: params.recipientCount,
      subject: params.subject,
      meta: params.meta,
      from: params.from,
      replyTo: params.replyTo,
      reason: "missing_resend",
    });
  }

  const { data, error } = await resend.emails.send({
    from: params.from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo: params.replyTo,
  });

  if (error) {
    throw error;
  }

  await recordEmailEvent({
    actorUserId: params.actorUserId,
    provider: "resend",
    recipientCount: params.recipientCount,
    subject: params.subject,
    status: "sent",
    messageId: data?.id ?? null,
    meta: params.meta,
  });

  return { id: data?.id, status: "sent" as const };
}

/**
 * Unified Email Service.
 * Centralizes sending logic, error handling and dev-mode mocking.
 */
export async function sendEmail(payload: EmailPayload) {
  const from = payload.from?.trim() || resolveEmailFrom();
  const replyTo = payload.replyTo?.trim() || resolveEmailReplyTo();
  const actorUserId = payload.actorUserId?.trim() || null;
  const recipientCount = getRecipientCount(payload.to);

  if (actorUserId) {
    await ensureEmailQuotaAvailable(actorUserId);
  }

  if (!from) {
    return sendMockEmail({
      actorUserId,
      recipientCount,
      subject: payload.subject,
      meta: payload.meta,
      from,
      replyTo,
      reason: "missing_sender",
    });
  }

  try {
    return await sendRealEmail({
      actorUserId,
      recipientCount,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      from: from!,
      replyTo,
      meta: payload.meta,
    });
  } catch (error) {
    logFailure("EmailService", "Send failed", error, {
      to: payload.to,
      subject: payload.subject,
      from,
      replyTo,
    });
    await recordEmailEvent({
      actorUserId,
      provider: "resend",
      recipientCount,
      subject: payload.subject,
      status: "error",
      messageId: null,
      meta: {
        ...(payload.meta ?? {}),
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
