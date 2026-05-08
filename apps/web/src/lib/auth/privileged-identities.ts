import { env } from "@/lib/env";

function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function getCreatorInboxEmail(): string | null {
  return normalizeEmail(env.CREATOR_INBOX_EMAIL);
}

export function isCreatorInboxEmail(value: string | null | undefined): boolean {
  const creatorInboxEmail = getCreatorInboxEmail();
  if (!creatorInboxEmail) {
    return false;
  }

  return normalizeEmail(value) === creatorInboxEmail;
}
