import { env } from "@/lib/env";

function trimToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function resolveEmailFrom(): string | undefined {
  return trimToUndefined(env.EMAIL_FROM) || trimToUndefined(env.RESEND_FROM_EMAIL);
}

export function resolveContactEmail(): string | undefined {
  return (
    trimToUndefined(env.CONTACT_EMAIL) ||
    trimToUndefined(env.RESEND_REPLY_TO) ||
    trimToUndefined(env.CREATOR_INBOX_EMAIL)
  );
}

export function resolvePublicContactEmail(): string | undefined {
  return trimToUndefined(env.NEXT_PUBLIC_CONTACT_EMAIL) || resolveContactEmail();
}

export function resolveEmailReplyTo(): string | undefined {
  return resolveContactEmail();
}
