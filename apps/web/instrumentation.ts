import * as Sentry from "@sentry/nextjs";
import {
  getSentryDsn,
  getSentryEnvironment,
  getSentryRelease,
  isSentryEnabled,
} from "./src/lib/observability/sentry";
import { SENTRY_DATA_COLLECTION } from "./src/lib/observability/sentry-data-collection";

export async function register() {
  const dsn = getSentryDsn();
  if (!isSentryEnabled() || !dsn) {
    return;
  }

  Sentry.init({
    dsn,
    release: getSentryRelease() || undefined,
    environment: getSentryEnvironment(),
    tracesSampleRate: 0.1,
    dataCollection: SENTRY_DATA_COLLECTION,
    debug: false,
    enabled: true,
  });
}
