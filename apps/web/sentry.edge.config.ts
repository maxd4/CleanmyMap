import * as Sentry from "@sentry/nextjs";
import { getSentryRelease, isSentryEnabled } from "./src/lib/observability/sentry";

if (isSentryEnabled()) {
  Sentry.init({
    dsn: process.env["SENTRY_DSN"],
    release: getSentryRelease() || undefined,
    tracesSampleRate: 0.1,
    enabled: Boolean(process.env["SENTRY_DSN"]),
  });
}
