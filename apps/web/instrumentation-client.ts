import * as Sentry from "@sentry/nextjs";
import { initBotId } from "botid/client/core";
import {
  getSentryClientDsn,
  getSentryClientEnvironment,
  getSentryClientRelease,
} from "@/lib/observability/sentry-client";
import { SENTRY_DATA_COLLECTION } from "@/lib/observability/sentry-data-collection";
import { BOT_ID_BASIC_PROTECTED_ROUTES } from "@/lib/botid/protected-routes";

initBotId({ protect: BOT_ID_BASIC_PROTECTED_ROUTES });

const dsn = getSentryClientDsn();

if (dsn) {
  Sentry.init({
    dsn,
    release: getSentryClientRelease() || undefined,
    environment: getSentryClientEnvironment(),
    tracesSampleRate: 0.1,
    dataCollection: SENTRY_DATA_COLLECTION,
    enabled: true,
  });
}

export const onRouterTransitionStart = dsn
  ? Sentry.captureRouterTransitionStart
  : () => {};
