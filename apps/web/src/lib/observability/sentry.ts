import { env, isConfigured } from "@/lib/env";
import {
  resolveSentryEnvironment,
  resolveSentryRelease,
} from "./sentry-metadata.mjs";

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
  return resolveSentryRelease({
    SENTRY_RELEASE: env.SENTRY_RELEASE,
    VERCEL_GIT_COMMIT_SHA: process.env["VERCEL_GIT_COMMIT_SHA"],
    GIT_COMMIT_SHA: process.env["GIT_COMMIT_SHA"],
  });
}

export function getSentryEnvironment(): string {
  return resolveSentryEnvironment({
    SENTRY_ENVIRONMENT: env.SENTRY_ENVIRONMENT,
    VERCEL_ENV: process.env["VERCEL_ENV"],
    NODE_ENV: process.env.NODE_ENV,
  });
}
