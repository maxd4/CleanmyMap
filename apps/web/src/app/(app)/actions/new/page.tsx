import type { Metadata } from "next";
import { ActionDeclarationEntryFlow } from "@/components/actions/action-declaration-entry-flow";
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
  const { userId } = await getSafeAuthSession();
  const isAuthenticated = Boolean(userId);
  const identity = isAuthenticated ? await getCurrentUserIdentity() : null;
  const pageTemplateV2Enabled = isFeatureEnabled("pageTemplateV2");
  const params = searchParams ? await searchParams : undefined;
  const fromEventId = resolveSingleSearchParam(params?.["fromEventId"]);
  const actionId = resolveSingleSearchParam(params?.["actionId"]);
  const mode = resolveSingleSearchParam(params?.["mode"]);
  const initialRecordType = mode === "propre" ? "clean_place" : "action";
  const fallbackActorName = isAuthenticated ? userId ?? "unknown-user" : "Aperçu public";
  const isAutoApprovedSubmission = Boolean(identity && isAdminLikeProfile(identity.role));
  const actorNameOptions =
    identity?.actorNameOptions && identity.actorNameOptions.length > 0
      ? identity.actorNameOptions
      : [fallbackActorName];
  const defaultActorName = actorNameOptions[0] ?? fallbackActorName;

  const userMetadata = {
    userId: userId ?? "public-preview",
    username: identity?.username,
    displayName: identity?.displayName ?? "Aperçu public",
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
          initialRecordType={initialRecordType}
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
        initialRecordType={initialRecordType}
        initialActionId={actionId ?? null}
        isAuthenticated={isAuthenticated}
        isAutoApprovedSubmission={isAutoApprovedSubmission}
      />
    </div>
  );
}
