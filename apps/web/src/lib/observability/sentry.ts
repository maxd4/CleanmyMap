import { env, isConfigured } from "@/lib/env";

function isTruthyFlag(value: string | boolean | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = typeof value === "string" ? value.trim().toLowerCase() : String(value);
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
