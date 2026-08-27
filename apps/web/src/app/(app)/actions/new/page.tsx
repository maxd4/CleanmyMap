import type { Metadata } from "next";
import { ActionDeclarationEntryFlow } from "@/components/actions/action-declaration-entry-flow";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getCurrentUserIdentity } from "@/lib/authz";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { isAdminLikeProfile } from "@/lib/profiles";

export const metadata: Metadata = {
  title: "Déclarer une action - CleanMyMap",
  description:
    "Déclarez votre action de nettoyage urbain et累计 votre impact environnemental. Signalez les déchets collectés, calcul automatique CO2 et eau préservée.",
  keywords: [
    "déclarer action",
    "déclaration nettoyage",
    "signalement déchets",
    "impact environnemental",
    "bénévolat propreté",
    "action citoyenne",
    "collecte déchets Paris",
    "écologie",
    "développement durable",
  ],
  alternates: {
    canonical: "/actions/new",
  },
  robots: {
    index: false,
    follow: false,
  },
};

type NewActionPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function resolveSingleSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default async function NewActionPage({
  searchParams,
}: NewActionPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const fromEventId = resolveSingleSearchParam(params?.["fromEventId"]);
  const actionId = resolveSingleSearchParam(params?.["actionId"]);
  const returnUrl = buildActionReturnUrl({ fromEventId, actionId });
  const { userId, clerkReachable } = await getSafeAuthSession();

  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        authUnavailable={!clerkReachable}
        mode="disabled"
        signInHref={buildAuthRedirectHref("/sign-in", returnUrl)}
        signUpHref={buildAuthRedirectHref("/sign-up", returnUrl)}
        title="Connexion requise pour déclarer une action"
        description="Connectez-vous à votre compte CleanMyMap pour remplir et envoyer une déclaration protégée."
      >
        <div aria-hidden="true" />
      </ClerkRequiredGate>
    );
  }

  const isAuthenticated = true;
  const identity = await getCurrentUserIdentity();
  const pageTemplateV2Enabled = isFeatureEnabled("pageTemplateV2");
  const fallbackActorName = userId;
  const isAutoApprovedSubmission = Boolean(identity && isAdminLikeProfile(identity.role));
  const actorNameOptions =
    identity?.actorNameOptions && identity.actorNameOptions.length > 0
      ? identity.actorNameOptions
      : [fallbackActorName];
  const defaultActorName = actorNameOptions[0] ?? fallbackActorName;

  const userMetadata = {
    userId,
    username: identity?.username,
    displayName: identity?.displayName ?? fallbackActorName,
    email: undefined,
  };

  if (pageTemplateV2Enabled) {
    return (
      <div className="space-y-8">
        <ActionDeclarationEntryFlow
          actorNameOptions={actorNameOptions}
          defaultActorName={defaultActorName}
          userMetadata={userMetadata}
          linkedEventId={fromEventId}
          initialActionId={actionId ?? null}
          isAuthenticated={isAuthenticated}
          isAutoApprovedSubmission={isAutoApprovedSubmission}
        />
      </div>
    );
  }

  return (
    <div data-rubrique-report-root className="space-y-4">
      <ActionDeclarationEntryFlow
        actorNameOptions={actorNameOptions}
        defaultActorName={defaultActorName}
        userMetadata={userMetadata}
        linkedEventId={fromEventId}
        initialActionId={actionId ?? null}
        isAuthenticated={isAuthenticated}
        isAutoApprovedSubmission={isAutoApprovedSubmission}
      />
    </div>
  );
}

function buildActionReturnUrl({
  fromEventId,
  actionId,
}: {
  fromEventId?: string;
  actionId?: string;
}): string {
  const returnParams = new URLSearchParams();
  if (fromEventId) returnParams.set("fromEventId", fromEventId);
  if (actionId) returnParams.set("actionId", actionId);
  const query = returnParams.toString();
  return query ? `/actions/new?${query}` : "/actions/new";
}

function buildAuthRedirectHref(route: "/sign-in" | "/sign-up", returnUrl: string): string {
  return `${route}?redirect_url=${encodeURIComponent(returnUrl)}`;
}
