"use client";

import type { ReactNode } from "react";
import { ArrowLeft, LogIn } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { ErrorMessage } from "@/components/ui/error-message";
import { DEFAULT_DASHBOARD_HREF } from "@/lib/errors/app-errors";
import { buildCurrentInternalRoute, buildSignInRedirectHref } from "@/lib/auth/redirect-url";

type PermissionErrorStateProps = {
  title?: string;
  message?: string;
  signInHref?: string;
  signInLabel?: string;
  dashboardHref?: string;
  dashboardLabel?: string;
  extra?: ReactNode;
  className?: string;
};

export function PermissionErrorState({
  title = "Vous n'avez pas accès à cette page.",
  message = "Connectez-vous avec un compte autorisé ou revenez au tableau de bord.",
  signInHref,
  signInLabel = "Se connecter",
  dashboardHref = DEFAULT_DASHBOARD_HREF,
  dashboardLabel = "Retour au tableau de bord",
  extra,
  className,
}: PermissionErrorStateProps) {
  const currentRoute = buildCurrentInternalRoute(
    typeof window === "undefined" ? "/" : window.location.pathname,
    typeof window === "undefined" ? "" : window.location.search,
    typeof window === "undefined" ? "" : window.location.hash,
  );
  const resolvedSignInHref = signInHref ?? buildSignInRedirectHref(currentRoute);

  return (
    <CmmCard tone="violet" variant="elevated" className={className}>
      <ErrorMessage
        kind="permission"
        title={title}
        message={message}
        actions={
          <>
            <CmmButton href={resolvedSignInHref} tone="primary">
              <LogIn className="h-4 w-4" />
              {signInLabel}
            </CmmButton>
            <CmmButton href={dashboardHref} tone="secondary">
              <ArrowLeft className="h-4 w-4" />
              {dashboardLabel}
            </CmmButton>
            {extra}
          </>
        }
      />
    </CmmCard>
  );
}
