import * as Sentry from "@sentry/nextjs";
import { getSentryDsn, getSentryRelease, isSentryEnabled } from "./src/lib/observability/sentry";

export async function register() {
  const dsn = getSentryDsn();
  if (!isSentryEnabled() || !dsn) {
    return;
  }

  Sentry.init({
    dsn,
    release: getSentryRelease() || undefined,
    tracesSampleRate: 0.1,
    debug: false,
    enabled: true,
  });
}
