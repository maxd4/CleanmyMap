import * as Sentry from "@sentry/nextjs";
import { initBotId } from "botid/client/core";
import { getSentryDsn, isSentryEnabled } from "@/lib/observability/sentry";
import { BOT_ID_BASIC_PROTECTED_ROUTES } from "@/lib/botid/protected-routes";

initBotId({ protect: BOT_ID_BASIC_PROTECTED_ROUTES });

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
