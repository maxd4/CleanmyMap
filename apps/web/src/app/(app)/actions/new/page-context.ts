import {
  normalizeActionCreationPanel,
  normalizeActionCreationSection,
  normalizeActionCreationSubsection,
  normalizeActionCreationSpace,
  normalizeActionCreationTab,
  type ActionCreationPanelId,
  type ActionCreationSectionId,
  type ActionCreationSubsectionId,
  type ActionCreationSpace,
  type ActionCreationTab,
} from "@/lib/actions/action-creation-routes";
import { resolveActionResumePhase } from "@/lib/actions/action-resume";
import { buildSignInRedirectHref } from "@/lib/auth/redirect-url";
import { getLocalDevAuthState } from "@/lib/auth/local-dev-auth-state.server";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getCurrentUserIdentity } from "@/lib/authz";
import type { UserIdentity } from "@/lib/authz";
import { isFeatureEnabled } from "@/lib/feature-flags";

export type NewActionPageSearchParams = Record<
  string,
  string | string[] | undefined
>;

type ActionUserMetadata = {
  userId: string;
  activeRole: UserIdentity["activeRole"] | undefined;
  handle: string | undefined;
  username: string | undefined;
  displayName: string;
  email: undefined;
};

export type NewActionPageContext = {
  params?: NewActionPageSearchParams;
  fromEventId?: string;
  actionId?: string;
  initialPanel: ActionCreationPanelId;
  initialSection: ActionCreationSectionId;
  initialSubsection: ActionCreationSubsectionId | undefined;
  initialTab: ActionCreationTab;
  initialSpace: ActionCreationSpace;
  localDevAuth: Awaited<ReturnType<typeof getLocalDevAuthState>>;
  sectionsEnabled: boolean;
  isAuthenticated: boolean;
  actorNameOptions: string[];
  defaultActorName: string;
  userMetadata: ActionUserMetadata;
  signInHref: string;
  signUpHref: string;
  pageTemplateV2Enabled: boolean;
};

export async function resolveNewActionPageContext(
  searchParams?: Promise<NewActionPageSearchParams>,
): Promise<NewActionPageContext> {
  const params = searchParams ? await searchParams : undefined;
  const fromEventId = resolveSingleSearchParam(params?.["fromEventId"]);
  const from = resolveSingleSearchParam(params?.["from"]);
  const actionId = resolveSingleSearchParam(params?.["actionId"]);
  const panel = normalizeActionCreationPanel(params?.["panel"]);
  const section = normalizeActionCreationSection(params?.["section"], { step: params?.["step"], panel, from });
  const subsection = normalizeActionCreationSubsection(params?.["subsection"], { step: params?.["step"], panel });
  const requestedTab = resolveSingleSearchParam(params?.["tab"]);
  const { userId } = await getSafeAuthSession();
  const localDevAuth = await getLocalDevAuthState();
  const isAuthenticated = Boolean(userId);
  const identity = userId ? await getCurrentUserIdentity() : null;
  const actionPhase =
    actionId && !requestedTab
      ? await resolveActionResumePhase({ actionId, userId, identity })
      : null;
  const tab = normalizeActionCreationTab(requestedTab, { actionId, from, actionPhase, panel });
  const initialSpace = normalizeActionCreationSpace(params?.["space"], { actionId, tab });
  const returnUrl = buildActionReturnUrl({ fromEventId, actionId, from, panel, section, tab });
  const pageTemplateV2Enabled = isFeatureEnabled("pageTemplateV2");
  const actionCreationSectionsEnabled = isFeatureEnabled("actionCreationSections");
  const fallbackActorName = userId ?? "Visiteur";
  const actorNameOptions = Array.from(
    new Set(
      identity?.actorNameOptions && identity.actorNameOptions.length > 0
        ? identity.actorNameOptions
        : [fallbackActorName],
    ),
  );

  return {
    params,
    fromEventId,
    actionId,
    initialPanel: panel,
    initialSection: section,
    initialSubsection: subsection,
    initialTab: tab,
    initialSpace,
    localDevAuth,
    sectionsEnabled: actionCreationSectionsEnabled,
    isAuthenticated,
    actorNameOptions,
    defaultActorName: actorNameOptions[0] ?? fallbackActorName,
    userMetadata: buildActionUserMetadata({ userId, identity, fallbackActorName }),
    signInHref: buildSignInRedirectHref(returnUrl),
    signUpHref: buildSignUpRedirectHref(returnUrl),
    pageTemplateV2Enabled,
  };
}

function resolveSingleSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildActionUserMetadata({
  userId,
  identity,
  fallbackActorName,
}: {
  userId: string | null;
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>;
  fallbackActorName: string;
}): ActionUserMetadata {
  return {
    userId: userId ?? "anonymous",
    activeRole: identity?.activeRole,
    handle: identity?.handle,
    username: identity?.username ?? undefined,
    displayName: identity?.displayName ?? fallbackActorName,
    email: undefined,
  };
}

function buildActionReturnUrl({
  fromEventId,
  actionId,
  from,
  panel,
  section,
  tab,
}: {
  fromEventId?: string;
  actionId?: string;
  from?: string;
  panel: ActionCreationPanelId;
  section: ActionCreationSectionId;
  tab: ActionCreationTab;
}): string {
  const returnParams = new URLSearchParams();
  if (panel !== "pre-formulaire") returnParams.set("panel", panel);
  if (section !== "essentiel") returnParams.set("section", section);
  if (tab !== "before") returnParams.set("tab", tab);
  if (fromEventId) returnParams.set("fromEventId", fromEventId);
  if (actionId) returnParams.set("actionId", actionId);
  if (from) returnParams.set("from", from);
  const query = returnParams.toString();
  return query ? `/actions/new?${query}` : "/actions/new";
}

function buildSignUpRedirectHref(returnUrl: string): string {
  return `/sign-up?redirect_url=${encodeURIComponent(returnUrl)}`;
}
