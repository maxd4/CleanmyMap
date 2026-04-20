import { getResendClient } from "./resend";

export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
};

/**
 * Unified Email Service.
 * Centralizes sending logic, error handling and dev-mode mocking.
 */
export async function sendEmail(payload: EmailPayload) {
  const resend = getResendClient();
  const from = payload.from || "CleanMyMap <notifs@cleanmymap.fr>"; // Example domain

  if (!resend) {
    console.warn("[Email Service] No RESEND_API_KEY found. Logging email instead:", {
      ...payload,
      from,
    });
    return { id: "mock_id", status: "mocked" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      replyTo: payload.replyTo,
    });

    if (error) {
      throw error;
    }

    return { id: data?.id, status: "sent" };
  } catch (error) {
    console.error("[Email Service] Failed to send email:", error);
    throw error;
  }
}
