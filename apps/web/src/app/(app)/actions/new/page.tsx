import type { Metadata } from "next";
import { ActionDeclarationEntryFlow } from "@/components/actions/action-declaration-entry-flow";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getCurrentUserIdentity } from "@/lib/authz";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { isAdminLikeProfile } from "@/lib/profiles";

export const metadata: Metadata = {
  title: "Déclarer une action - CleanMyMap",
  description:
    "Déclarez une action de nettoyage urbain, renseignez les résultats terrain et consultez les estimations d’impact sur le CO₂ évité et l’eau préservée.",
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
  const { userId } = await getSafeAuthSession();

  const isAuthenticated = Boolean(userId);
  const identity = userId ? await getCurrentUserIdentity() : null;
  const pageTemplateV2Enabled = isFeatureEnabled("pageTemplateV2");
  const fallbackActorName = userId ?? "Visiteur";
  const isAutoApprovedSubmission = Boolean(identity && isAdminLikeProfile(identity.role));
  const actorNameOptions =
    identity?.actorNameOptions && identity.actorNameOptions.length > 0
      ? identity.actorNameOptions
      : [fallbackActorName];
  const defaultActorName = actorNameOptions[0] ?? fallbackActorName;

  const userMetadata = {
    userId: userId ?? "anonymous",
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
          signInHref={buildAuthRedirectHref("/sign-in", returnUrl)}
          signUpHref={buildAuthRedirectHref("/sign-up", returnUrl)}
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
        signInHref={buildAuthRedirectHref("/sign-in", returnUrl)}
        signUpHref={buildAuthRedirectHref("/sign-up", returnUrl)}
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
