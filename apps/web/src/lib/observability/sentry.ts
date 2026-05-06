import { env } from "@/lib/env";

function isTruthyFlag(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function isSentryEnabled(): boolean {
  return isTruthyFlag(env.NEXT_PUBLIC_SENTRY_ENABLED ? "1" : undefined);
}
