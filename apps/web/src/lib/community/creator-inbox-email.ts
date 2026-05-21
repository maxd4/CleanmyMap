import { env } from "@/lib/env";
import {
  resolveContactEmail,
  resolveEmailFrom,
  resolveEmailReplyTo,
} from "@/lib/email-config";
import { getResendClient } from "@/lib/services/resend";
import { sendEmail } from "@/lib/services/email";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function resolveCreatorInboxRecipients(extraRecipients: string[] = []): string[] {
  const candidates = [
    env.CREATOR_INBOX_EMAIL,
    resolveContactEmail(),
    ...extraRecipients,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(candidates));
}

export function resolveCreatorReplyTo(): string | undefined {
  return resolveEmailReplyTo();
}

export async function sendCreatorInboxEmail(params: {
  subject: string;
  title: string;
  intro: string;
  lines: Array<{ label: string; value: string }>;
  footer?: string;
  extraRecipients?: string[];
  actorUserId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<boolean> {
  const resend = getResendClient();
  const from = resolveEmailFrom();
  const to = resolveCreatorInboxRecipients(params.extraRecipients);
  if (!resend || !from || to.length === 0) {
    return false;
  }

  const html = [
    `<h2>${escapeHtml(params.title)}</h2>`,
    `<p>${escapeHtml(params.intro)}</p>`,
    `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:16px;">`,
    ...params.lines.map(
      (line) =>
        `<tr><td style="padding:4px 12px 4px 0;font-weight:700;vertical-align:top;">${escapeHtml(line.label)}</td><td style="padding:4px 0;vertical-align:top;">${escapeHtml(line.value)}</td></tr>`,
    ),
    `</table>`,
    params.footer ? `<p style="margin-top:16px;">${escapeHtml(params.footer)}</p>` : "",
  ].join("");

  await sendEmail({
    to,
    from,
    replyTo: resolveCreatorReplyTo(),
    subject: params.subject,
    html,
    actorUserId: params.actorUserId ?? null,
    meta: params.meta ?? {},
  });
  return true;
}
