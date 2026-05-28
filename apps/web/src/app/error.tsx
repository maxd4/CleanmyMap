"use client";

import { useEffect } from"react";
import * as Sentry from"@sentry/nextjs";
import { ServerErrorCard } from"@/components/ui/server-error-card";
import { buildSupportHref } from"@/lib/errors/app-errors";
import { isSentryEnabled } from "@/lib/observability/sentry";

export default function Error({
 error,
 reset,
}: {
 error: Error & { digest?: string };
 reset: () => void;
}) {
 const isSentryConfigured = isSentryEnabled();
 const supportHref = buildSupportHref({
  message: error.message,
  code: error.name !== "Error" ? error.name : null,
  referenceCode: error.digest ?? null,
  pagePath: null,
  userId: null,
  sessionId: null,
  source: "runtime_error_page",
 });

 useEffect(() => {
 if (isSentryConfigured) {
 Sentry.captureException(error);
 }
 console.error("[Runtime Error]", error);
 }, [error, isSentryConfigured]);

  return (
  <div className="relative min-h-screen overflow-hidden p-6 font-outfit">
 <div className="relative z-10 flex min-h-screen items-center justify-center">
  <ServerErrorCard
    className="w-full max-w-[42rem]"
    title="Une erreur technique bloque cette page."
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
 </div>

 </div>
 );
}
