"use client";

import { useEffect, useMemo } from "react";
import * as Sentry from "@sentry/nextjs";
import { ServerErrorCard } from "@/components/ui/server-error-card";
import { buildSupportHref } from "@/lib/errors/app-errors";
import { getSentryClientDsn } from "@/lib/observability/sentry-client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isSentryConfigured = getSentryClientDsn() !== null;

  const supportHref = useMemo(() => {
    return buildSupportHref({
      message: error.message,
      code: error.name !== "Error" ? error.name : null,
      referenceCode: error.digest ?? null,
      pagePath: null,
      userId: null,
      sessionId: null,
      source: "global_error_boundary",
    });
  }, [error.digest, error.message, error.name]);

  useEffect(() => {
    if (isSentryConfigured) {
      Sentry.captureException(error);
    }
    console.error("[Global Error]", error);
  }, [error, isSentryConfigured]);

  return (
    <html lang="fr">
      <body className="bg-rose-50">
        <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,rgba(255,245,245,0.98)_0%,rgba(254,242,242,0.96)_56%,rgba(255,247,237,0.92)_100%)] px-4 py-10 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(244,63,94,0.12)_0%,rgba(244,63,94,0.05)_34%,rgba(244,63,94,0)_72%)] blur-[100px]"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(248,113,113,0.12)_0%,rgba(248,113,113,0.04)_34%,rgba(248,113,113,0)_72%)] blur-[100px]"
          />

          <ServerErrorCard
            className="relative z-10 w-full max-w-[42rem]"
            title="Une erreur technique bloque l'application."
            message={
              isSentryConfigured
                ? "Le problème a été signalé automatiquement. Vous pouvez réessayer maintenant ou revenir à l'accueil."
                : "Vous pouvez réessayer maintenant ou revenir à l'accueil."
            }
            referenceCode={error.digest}
            onRetry={() => reset()}
            supportHref={supportHref}
            supportLabel="Contacter le support"
          />
        </main>
      </body>
    </html>
  );
}
