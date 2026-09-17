import type { Metadata } from "next";
import { ActionCreationShell } from "@/components/actions/action-creation-shell";
import {
  normalizeActionCreationPanel,
  normalizeActionCreationTab,
} from "@/lib/actions/action-creation-routes";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getLocalDevAuthState } from "@/lib/auth/local-dev-auth-state.server";
import { getCurrentUserIdentity } from "@/lib/authz";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadActionById } from "@/lib/actions/store";

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
  const requestedTab = resolveSingleSearchParam(params?.["tab"]);
  const resumedAction =
    actionId && !requestedTab
      ? await loadActionById(getSupabaseServerClient(), actionId).catch(() => null)
      : null;
  const tab = normalizeActionCreationTab(requestedTab, {
    actionId,
    from,
    actionPhase: resumedAction?.action_phase,
    panel,
  });
  const returnUrl = buildActionReturnUrl({ fromEventId, actionId, from, panel, tab });
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
    handle: identity?.handle,
    username: identity?.username ?? undefined,
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
          initialActionId={actionId ?? null}
          initialPanel={panel}
          initialTab={tab}
          tabSearchParams={params}
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
        initialActionId={actionId ?? null}
        initialPanel={panel}
        initialTab={tab}
        tabSearchParams={params}
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
  tab,
}: {
  fromEventId?: string;
  actionId?: string;
  from?: string;
  panel: ReturnType<typeof normalizeActionCreationPanel>;
  tab: ReturnType<typeof normalizeActionCreationTab>;
}): string {
  const returnParams = new URLSearchParams();
  if (panel !== "pre-formulaire") returnParams.set("panel", panel);
  if (tab !== "before") returnParams.set("tab", tab);
  if (fromEventId) returnParams.set("fromEventId", fromEventId);
  if (actionId) returnParams.set("actionId", actionId);
  if (from) returnParams.set("from", from);
  const query = returnParams.toString();
  return query ? `/actions/new?${query}` : "/actions/new";
}

function buildAuthRedirectHref(route: "/sign-in" | "/sign-up", returnUrl: string): string {
  return `${route}?redirect_url=${encodeURIComponent(returnUrl)}`;
}
