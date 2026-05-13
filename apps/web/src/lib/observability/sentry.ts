import { env, isConfigured } from "@/lib/env";

function isTruthyFlag(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function isSentryEnabled(): boolean {
  return isTruthyFlag(env.NEXT_PUBLIC_SENTRY_ENABLED) && getSentryDsn() !== null;
}

export function getSentryDsn(): string | null {
  const dsn = env.NEXT_PUBLIC_SENTRY_DSN;
  if (!isConfigured(dsn)) {
    return null;
  }

  return dsn!.trim();
}
