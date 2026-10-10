import type { Metadata } from "next";
import { ActionCreationShell } from "@/components/actions/action-creation-shell";
import {
  resolveNewActionPageContext,
  type NewActionPageSearchParams,
} from "./page-context";

export const metadata: Metadata = {
  title: "Créer une action",
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
    index: true,
    follow: true,
  },
};

type NewActionPageProps = {
  searchParams?: Promise<NewActionPageSearchParams>;
};

export default async function NewActionPage({
  searchParams,
}: NewActionPageProps) {
  const context = await resolveNewActionPageContext(searchParams);

  const actionCreationShell = (
    <ActionCreationShell
      actorNameOptions={context.actorNameOptions}
      defaultActorName={context.defaultActorName}
      userMetadata={context.userMetadata}
      linkedEventId={context.fromEventId}
      initialActionId={context.actionId ?? null}
      initialPanel={context.initialPanel}
      initialSection={context.initialSection}
      initialSubsection={context.initialSubsection}
      initialTab={context.initialTab}
      tabSearchParams={context.params}
      localDevAuth={context.localDevAuth}
      sectionsEnabled={context.sectionsEnabled}
      isAuthenticated={context.isAuthenticated}
      signInHref={context.signInHref}
      signUpHref={context.signUpHref}
    />
  );

  if (context.pageTemplateV2Enabled) {
    return (
      <div className="space-y-8">
        {actionCreationShell}
      </div>
    );
  }

  return (
    <div data-rubrique-report-root className="space-y-4">
      {actionCreationShell}
    </div>
  );
}
