"use client";

import { useEffect, useMemo } from"react";
import { useAuth } from"@clerk/nextjs";
import { usePathname } from"next/navigation";
import * as Sentry from"@sentry/nextjs";
import { VibrantBackground } from"@/components/ui/vibrant-background";
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
 const { userId, sessionId } = useAuth();
 const pathname = usePathname();

 const supportHref = useMemo(() => {
  return buildSupportHref({
    message: error.message,
    code: error.name !== "Error" ? error.name : null,
    referenceCode: error.digest ?? null,
    pagePath: pathname,
    userId: userId ?? null,
    sessionId: sessionId ?? null,
    source: "runtime_error_page",
  });
 }, [error.digest, error.message, error.name, pathname, sessionId, userId]);

 useEffect(() => {
 if (isSentryConfigured) {
 Sentry.captureException(error);
 }
 console.error("[Runtime Error]", error);
 }, [error, isSentryConfigured]);

 return (
 <div className="relative min-h-screen overflow-hidden p-6 font-outfit">
 <VibrantBackground />
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
