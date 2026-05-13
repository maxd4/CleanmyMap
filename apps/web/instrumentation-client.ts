import * as Sentry from "@sentry/nextjs";
import { getSentryDsn, isSentryEnabled } from "@/lib/observability/sentry";

const dsn = getSentryDsn();

if (isSentryEnabled() && dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    enabled: true,
  });
}

export const onRouterTransitionStart = isSentryEnabled()
  ? Sentry.captureRouterTransitionStart
  : () => {};
