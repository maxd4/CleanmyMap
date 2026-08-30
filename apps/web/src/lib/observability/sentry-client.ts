import {
  normalizeSentryEnvironment,
  normalizeSentryRelease,
} from "./sentry-metadata.mjs";

export function getSentryClientDsn(): string | null {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  return dsn || null;
}

export function getSentryClientRelease(): string | null {
  return normalizeSentryRelease(process.env.NEXT_PUBLIC_SENTRY_RELEASE);
}

export function getSentryClientEnvironment(): string {
  return normalizeSentryEnvironment(process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT);
}
