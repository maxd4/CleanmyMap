import { getResendClient } from "./resend";
import { resolveEmailFrom, resolveEmailReplyTo } from "@/lib/email-config";

export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  actorUserId?: string | null;
  meta?: Record<string, unknown>;
};

/**
 * Unified Email Service.
 * Centralizes sending logic, error handling and dev-mode mocking.
 */
export async function sendEmail(payload: EmailPayload) {
  const resend = getResendClient();
  const from = payload.from?.trim() || resolveEmailFrom();
  const replyTo = payload.replyTo?.trim() || resolveEmailReplyTo();

  if (!resend) {
    console.warn("[Email Service] No RESEND_API_KEY found. Logging email instead:", {
      to: payload.to,
      subject: payload.subject,
      from,
      replyTo,
    });
    return { id: "mock_id", status: "mocked" };
  }

  if (!from) {
    console.error("[Email Service] Missing sender configuration", {
      to: payload.to,
      subject: payload.subject,
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

    return { id: data?.id, status: "sent" };
  } catch (error) {
    console.error("[Email Service] Failed to send email", {
      to: payload.to,
      subject: payload.subject,
      from,
      replyTo,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
