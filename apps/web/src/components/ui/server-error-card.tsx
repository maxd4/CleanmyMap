"use client";

import type { ReactNode } from "react";
import { AlertTriangle, LifeBuoy, RefreshCw } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmIcon } from "@/components/ui/cmm-icon";
import { buildSupportHref } from "@/lib/errors/app-errors";
import {
  SystemStateAction,
  SystemStateDescription,
  SystemStateIcon,
  SystemStateLayout,
  SystemStateMeta,
  SystemStateTitle,
} from "@/components/ui/system-state";

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
  supportHref = buildSupportHref(),
  supportLabel = "Contacter le support",
  className,
}: ServerErrorCardProps) {
  const hasContext = Boolean(referenceCode || details);

  return (
    <SystemStateLayout variant="error" className={className}>
      <SystemStateIcon variant="error">
        <CmmIcon icon={AlertTriangle} size="xl" />
      </SystemStateIcon>

      <SystemStateTitle variant="error">{title}</SystemStateTitle>

      <SystemStateDescription variant="error">{message}</SystemStateDescription>

      {hasContext ? (
        <SystemStateMeta
          variant="error"
          label={referenceCode ? "Référence de suivi" : "Contexte"}
        >
          {referenceCode ? (
            <span className="font-mono text-xs uppercase tracking-[0.16em]">
              {referenceCode}
            </span>
          ) : null}
          {details ? <span className={referenceCode ? "mt-2 block" : undefined}>{details}</span> : null}
        </SystemStateMeta>
      ) : null}

      <SystemStateAction>
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
      </SystemStateAction>
    </SystemStateLayout>
  );
}
