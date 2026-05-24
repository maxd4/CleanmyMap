import { env, isConfigured } from "@/lib/env";

export function isSentryEnabled(): boolean {
  return getSentryDsn() !== null;
}

export function getSentryDsn(): string | null {
  const dsn = env.NEXT_PUBLIC_SENTRY_DSN;
  if (!isConfigured(dsn)) {
    return null;
  }

  return dsn!.trim();
}

export function getSentryRelease(): string | null {
  const release =
    env.SENTRY_RELEASE ||
    process.env["VERCEL_GIT_COMMIT_SHA"] ||
    process.env["GIT_COMMIT_SHA"] ||
    process.env["VERCEL_GIT_COMMIT_REF"];

  const normalizedRelease = release?.trim();
  if (!normalizedRelease) {
    return null;
  }

  return normalizedRelease;
}
