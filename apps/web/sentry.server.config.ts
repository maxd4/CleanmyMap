import * as Sentry from "@sentry/nextjs";
import { getSentryRelease, isSentryEnabled } from "./src/lib/observability/sentry";

if (isSentryEnabled()) {
  Sentry.init({
    dsn: process.env["NEXT_PUBLIC_SENTRY_DSN"] || process.env["SENTRY_DSN"],
    release: getSentryRelease() || undefined,
    tracesSampleRate: 1.0,
    debug: false,
    enabled: Boolean(process.env["NEXT_PUBLIC_SENTRY_DSN"] || process.env["SENTRY_DSN"]),
  });
}
