import * as Sentry from "@sentry/nextjs";
import { initBotId } from "botid/client/core";
import {
  getSentryClientDsn,
  getSentryClientEnvironment,
  getSentryClientRelease,
} from "@/lib/observability/sentry-client";
import { BOT_ID_BASIC_PROTECTED_ROUTES } from "@/lib/botid/protected-routes";

initBotId({ protect: BOT_ID_BASIC_PROTECTED_ROUTES });

const dsn = getSentryClientDsn();

if (dsn) {
  Sentry.init({
    dsn,
    release: getSentryClientRelease() || undefined,
    environment: getSentryClientEnvironment(),
    tracesSampleRate: 0.1,
    enabled: true,
  });
}

export const onRouterTransitionStart = dsn
  ? Sentry.captureRouterTransitionStart
  : () => {};
