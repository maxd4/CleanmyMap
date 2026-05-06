"use client";

import type { ReactNode } from "react";
import { RefreshCw, LifeBuoy } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { ErrorMessage } from "@/components/ui/error-message";
import { SUPPORT_EMAIL } from "@/lib/errors/app-errors";

type ServerErrorCardProps = {
  title?: string;
  message?: string;
  details?: ReactNode;
  referenceCode?: string;
  retryLabel?: string;
  onRetry?: () => void;
  supportHref?: string;
  supportLabel?: string;
  className?: string;
};

export function ServerErrorCard({
  title = "Une erreur est survenue de notre côté.",
  message = "Le service a rencontré un problème technique. Vous pouvez réessayer immédiatement.",
  details,
  referenceCode,
  retryLabel = "Réessayer",
  onRetry,
  supportHref = `mailto:${SUPPORT_EMAIL}`,
  supportLabel = "Contacter le support",
  className,
}: ServerErrorCardProps) {
  return (
    <CmmCard tone="rose" variant="elevated" className={className}>
      <ErrorMessage
        kind="server"
        title={title}
        message={
          <>
            {message}
            {referenceCode ? (
              <span className="mt-2 block text-xs font-mono uppercase tracking-[0.16em] text-rose-700/80">
                Référence: {referenceCode}
              </span>
            ) : null}
            {details ? <span className="mt-2 block">{details}</span> : null}
          </>
        }
        actions={
          <>
            {onRetry ? (
              <CmmButton tone="primary" onClick={onRetry}>
                <RefreshCw className="h-4 w-4" />
                {retryLabel}
              </CmmButton>
            ) : null}
            <CmmButton href={supportHref} tone="secondary">
              <LifeBuoy className="h-4 w-4" />
              {supportLabel}
            </CmmButton>
          </>
        }
      />
    </CmmCard>
  );
}
