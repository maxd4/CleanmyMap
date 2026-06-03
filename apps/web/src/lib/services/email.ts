import { getResendClient } from "./resend";
import { resolveEmailFrom, resolveEmailReplyTo } from "@/lib/email-config";
import {
  appendServiceEmailEvent,
  countServiceEmailEventsForActorSince,
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
  const sentCount = await countServiceEmailEventsForActorSince({
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

  const resend = getResendClient();

  if (!resend) {
    logWarning("EmailService", "RESEND_API_KEY missing, logging email instead", {
      to: payload.to,
      subject: payload.subject,
      from,
      replyTo,
    });
    await recordEmailEvent({
      actorUserId,
      provider: "mock",
      recipientCount,
      subject: payload.subject,
      status: "mocked",
      messageId: "mock_id",
      meta: payload.meta,
    });
    return { id: "mock_id", status: "mocked" };
  }

  if (!from) {
    logFailure("EmailService", "Missing sender configuration", undefined, {
      to: payload.to,
      subject: payload.subject,
    });
    await recordEmailEvent({
      actorUserId,
      provider: "mock",
      recipientCount,
      subject: payload.subject,
      status: "missing_config",
      messageId: null,
      meta: payload.meta,
    });
    return { id: null, status: "missing_config" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      replyTo,
    });

    if (error) {
      throw error;
    }

    await recordEmailEvent({
      actorUserId,
      provider: "resend",
      recipientCount,
      subject: payload.subject,
      status: "sent",
      messageId: data?.id ?? null,
      meta: payload.meta,
    });

    return { id: data?.id, status: "sent" };
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
