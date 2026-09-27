"use client";

import type { ReactNode } from "react";
import { Lock, WifiOff } from "lucide-react";
import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import {
  SystemStateAction,
  SystemStateDescription,
  SystemStateIcon,
  SystemStateLayout,
  SystemStateMeta,
  SystemStateTitle,
} from "@/components/ui/system-state";

type ClerkRequiredGateProps = {
  isAuthenticated: boolean;
  authUnavailable?: boolean;
  title?: string;
  description?: string;
  mode?: "blur" | "disabled";
  signInHref?: string;
  signInLabel?: string;
  signUpHref?: string;
  signUpLabel?: string;
  badge?: string;
  stateHeadingLevel?: "h1" | "h2";
  lockedPreview?: ReactNode;
  children: ReactNode;
};

type AuthGateCardProps = Pick<
  ClerkRequiredGateProps,
  | "description"
  | "signInHref"
  | "signInLabel"
  | "signUpHref"
  | "signUpLabel"
  | "stateHeadingLevel"
  | "title"
> & {
  badge: string;
};

function AuthGateCard({
  badge,
  description,
  signInHref,
  signInLabel,
  signUpHref,
  signUpLabel,
  stateHeadingLevel,
  title,
}: AuthGateCardProps) {
  const Heading = stateHeadingLevel ?? "h1";

  return (
    <div data-auth-gate-card="true" className="w-full max-w-xl">
      <CmmCard as="section" variant="elevated" size="sm" className="text-center">
        <div className="flex flex-col items-center gap-3">
          <SystemStateIcon variant="forbidden" className="h-12 w-12">
            <Lock className="h-6 w-6" />
          </SystemStateIcon>
          <p className="cmm-text-caption cmm-text-secondary font-semibold uppercase tracking-[0.18em]">
            {badge}
          </p>
          <Heading className="cmm-text-h3 cmm-text-primary text-balance">{title}</Heading>
          <p className="cmm-text-small cmm-text-secondary max-w-prose text-pretty">
            {description}
          </p>
          <CmmButtonGroup
            className="w-full flex-col items-stretch sm:flex-row sm:items-center sm:justify-center"
          >
            <CmmButton
              href={signInHref}
              tone="critical"
              variant="pill"
              className="w-full font-bold sm:w-auto"
            >
              {signInLabel}
            </CmmButton>
            <CmmButton
              href={signUpHref}
              tone="primary"
              variant="pill"
              className="w-full font-bold sm:w-auto"
            >
              {signUpLabel}
            </CmmButton>
          </CmmButtonGroup>
        </div>
      </CmmCard>
    </div>
  );
}

export function ClerkRequiredGate({
  isAuthenticated,
  authUnavailable = false,
  title = "Connexion requise",
  description = "Connectez-vous ou inscrivez-vous pour accéder à cette fonctionnalité.",
  mode = "blur",
  signInHref = "/sign-in",
  signInLabel = "Se connecter",
  signUpHref = "/sign-up",
  signUpLabel = "S'inscrire",
  badge = "Accès au compte",
  stateHeadingLevel = "h1",
  lockedPreview,
  children,
}: ClerkRequiredGateProps) {
  if (isAuthenticated) {
    return children;
  }

  if (authUnavailable) {
    return (
      <section className="rounded-[2rem] border border-cyan-200/80 bg-white shadow-sm">
        <SystemStateLayout variant="offline" className="mx-auto max-w-2xl">
          <SystemStateIcon variant="offline">
            <WifiOff className="h-7 w-7" />
          </SystemStateIcon>
          <SystemStateMeta variant="offline" label="Authentification indisponible">
            L&apos;état de votre session ne peut pas être vérifié pour le moment.
          </SystemStateMeta>
          <SystemStateTitle variant="offline" headingLevel={stateHeadingLevel}>
            Authentification temporairement indisponible
          </SystemStateTitle>
          <SystemStateDescription variant="offline">
            Le service d&apos;identité ne répond pas. Réessayez dans quelques instants ; votre compte
            n&apos;est pas considéré comme déconnecté.
          </SystemStateDescription>
          <SystemStateAction>
            <CmmButton href={signInHref} tone="primary">
              Réessayer
            </CmmButton>
          </SystemStateAction>
        </SystemStateLayout>
      </section>
    );
  }

  if (mode === "disabled") {
    return (
      <section
        className="cmm-surface cmm-panel relative overflow-hidden"
        data-auth-gate-mode="disabled"
      >
        <div aria-hidden="true" className="pointer-events-none select-none opacity-60">
          {children}
        </div>
        <div className="relative flex justify-center p-3 sm:p-4">
          <AuthGateCard
            badge={badge}
            description={description}
            signInHref={signInHref}
            signInLabel={signInLabel}
            signUpHref={signUpHref}
            signUpLabel={signUpLabel}
            stateHeadingLevel={stateHeadingLevel}
            title={title}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className="cmm-surface cmm-panel relative overflow-hidden"
      data-auth-gate-mode="blur"
    >
      <div aria-hidden="true" className="pointer-events-none select-none blur-sm opacity-55">
        {lockedPreview ?? children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-white/54 p-4 backdrop-blur-sm">
        <AuthGateCard
          badge={badge}
          description={description}
          signInHref={signInHref}
          signInLabel={signInLabel}
          signUpHref={signUpHref}
          signUpLabel={signUpLabel}
          stateHeadingLevel={stateHeadingLevel}
          title={title}
        />
      </div>
    </section>
  );
}
