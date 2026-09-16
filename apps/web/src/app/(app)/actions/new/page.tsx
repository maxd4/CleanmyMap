import type { Metadata } from "next";
import { ActionCreationShell } from "@/components/actions/action-creation-shell";
import { normalizeActionCreationPanel } from "@/lib/actions/action-creation-routes";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getLocalDevAuthState } from "@/lib/auth/local-dev-auth-state.server";
import { getCurrentUserIdentity } from "@/lib/authz";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const metadata: Metadata = {
  title: "Créer une action - CleanMyMap",
  description:
    "Préparer une action avant terrain ou compléter ses résultats après réalisation. Consultez ensuite les estimations d’impact sur le CO₂ évité et l’eau préservée.",
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
  const from = resolveSingleSearchParam(params?.["from"]);
  const actionId = resolveSingleSearchParam(params?.["actionId"]);
  const panel = normalizeActionCreationPanel(params?.["panel"]);
  const returnUrl = buildActionReturnUrl({ fromEventId, actionId, from, panel });
  const { userId } = await getSafeAuthSession();
  const localDevAuth = await getLocalDevAuthState();

  const isAuthenticated = Boolean(userId);
  const identity = userId ? await getCurrentUserIdentity() : null;
  const pageTemplateV2Enabled = isFeatureEnabled("pageTemplateV2");
  const fallbackActorName = userId ?? "Visiteur";
  const actorNameOptions = Array.from(
    new Set(
      identity?.actorNameOptions && identity.actorNameOptions.length > 0
        ? identity.actorNameOptions
        : [fallbackActorName],
    ),
  );
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
        <ActionCreationShell
          actorNameOptions={actorNameOptions}
          defaultActorName={defaultActorName}
          userMetadata={userMetadata}
          linkedEventId={fromEventId}
          initialEntryPath={from === "planner" || from === "before" ? "before" : undefined}
          initialActionId={actionId ?? null}
          initialPanel={panel}
          localDevAuth={localDevAuth}
          isAuthenticated={isAuthenticated}
          signInHref={buildAuthRedirectHref("/sign-in", returnUrl)}
          signUpHref={buildAuthRedirectHref("/sign-up", returnUrl)}
        />
      </div>
    );
  }

  return (
    <div data-rubrique-report-root className="space-y-4">
      <ActionCreationShell
        actorNameOptions={actorNameOptions}
        defaultActorName={defaultActorName}
        userMetadata={userMetadata}
        linkedEventId={fromEventId}
        initialEntryPath={from === "planner" || from === "before" ? "before" : undefined}
        initialActionId={actionId ?? null}
        initialPanel={panel}
        localDevAuth={localDevAuth}
        isAuthenticated={isAuthenticated}
        signInHref={buildAuthRedirectHref("/sign-in", returnUrl)}
        signUpHref={buildAuthRedirectHref("/sign-up", returnUrl)}
      />
    </div>
  );
}

function buildActionReturnUrl({
  fromEventId,
  actionId,
  from,
  panel,
}: {
  fromEventId?: string;
  actionId?: string;
  from?: string;
  panel: ReturnType<typeof normalizeActionCreationPanel>;
}): string {
  const returnParams = new URLSearchParams();
  if (panel !== "pre-formulaire") returnParams.set("panel", panel);
  if (fromEventId) returnParams.set("fromEventId", fromEventId);
  if (actionId) returnParams.set("actionId", actionId);
  if (from) returnParams.set("from", from);
  const query = returnParams.toString();
  return query ? `/actions/new?${query}` : "/actions/new";
}

function buildAuthRedirectHref(route: "/sign-in" | "/sign-up", returnUrl: string): string {
  return `${route}?redirect_url=${encodeURIComponent(returnUrl)}`;
}
