"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import {
  type VisibleFinalizedSectionId,
  type SectionRubriqueDefinition,
} from "@/lib/sections-registry";
import { PendingSection } from "./shared";
import type { FeedbackSectionProps } from "./feedback-section.shared";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type { PublicSectionInitialData } from "@/lib/sections/public-section-snapshot-contract";

type SectionRendererProps = {
  section: SectionRubriqueDefinition;
  fundingOnParticipeUrl?: string;
  publicInitialData?: PublicSectionInitialData;
};

const CommunitySection = dynamic(() =>
  import("./community").then((module) => module.CommunitySection),
);
const FeedbackSection = dynamic<FeedbackSectionProps>(() =>
  import("./feedback").then((module) => module.FeedbackSection),
);
const ActorsSection = dynamic(() =>
  import("./actors-section").then((module) => module.ActorsSection),
);
const GamificationSection = dynamic(() =>
  import("./gamification").then((module) => module.GamificationSection),
);
const AnnuaireSection = dynamic(() =>
  import("./annuaire").then((module) => module.AnnuaireSection),
);
const ElusSection = dynamic(() =>
  import("./elus-section").then((module) => module.ElusSection),
);
const FundingSection = dynamic(() =>
  import("./funding-section").then((module) => module.FundingSection),
);
const OpenDataSection = dynamic(() =>
  import("./open-data-section").then((module) => module.OpenDataSection),
);
const TrashSpotterSection = dynamic(() =>
  import("./trash-spotter-section").then((module) => module.TrashSpotterSection),
);
const RecyclingSection = dynamic(() =>
  import("./recycling-section").then((module) => module.RecyclingSection),
);
const CompostSection = dynamic(() =>
  import("./compost").then((module) => module.CompostSection),
);
const ClimateSection = dynamic(() =>
  import("./climate").then((module) => module.ClimateSection),
);
const CompareSection = dynamic(() =>
  import("./compare-section").then((module) => module.CompareSection),
);
const WeatherSection = dynamic(() =>
  import("./weather-section").then((module) => module.WeatherSection),
);
const JoinFormSection = dynamic(() =>
  import("./rejoindre-un-formulaire-section").then((module) => module.JoinActionSection),
);
const ConnectSection = dynamic(() =>
  import("./connect-section").then((module) => module.ConnectSection),
);
const RouteSection = dynamic<{ actionId?: string | null }>(() =>
  import("./route").then((module) => ({
    default: (props: { actionId?: string | null }) => (
      <module.RouteSection {...props} />
    ),
  })),
);

function OpenDataFundingLink() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  return (
    <section className="rounded-[2rem] border border-violet-100 bg-white/90 p-6 shadow-[0_18px_54px_-42px_rgba(79,70,229,0.3)]">
      <h2 className="text-2xl font-black tracking-tight text-[#2f1a78]">
        {fr ? "Financement du projet" : "Project funding"}
      </h2>
      <p className="cmm-text-body cmm-text-primary mt-2 max-w-3xl">
        {fr
          ? "Le détail des besoins, contributions et usages du financement est présenté sur la page dédiée."
          : "The dedicated page presents the details of funding needs, contributions and use."}
      </p>
      <Link
        href="/sections/funding"
        className="mt-4 inline-flex min-h-11 items-center rounded-full border border-violet-200 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
      >
        {fr ? "Voir le financement" : "View funding"}
      </Link>
    </section>
  );
}

export const FINALIZED_SECTION_RENDERERS = {
  community: () => <CommunitySection />,
  feedback: () => <FeedbackSection />,
  gamification: () => <GamificationSection />,
  actors: (_fundingOnParticipeUrl, initialData) => (
    <ActorsSection initialData={initialData?.actors} />
  ),
  annuaire: () => <AnnuaireSection />,
  "open-data": () => (
    <div className="space-y-12">
      <OpenDataSection />
      <OpenDataFundingLink />
    </div>
  ),
  funding: (fundingOnParticipeUrl?: string) => (
    <FundingSection onParticipeUrl={fundingOnParticipeUrl} />
  ),
  "trash-spotter": () => <TrashSpotterSection />,
  route: () => <RouteSection />,
  "rejoindre-une-action": () => <JoinFormSection />,
  recycling: (_fundingOnParticipeUrl, initialData) => (
    <RecyclingSection initialData={initialData?.recycling} />
  ),
  compost: () => <CompostSection />,
  climate: (_fundingOnParticipeUrl, initialData) => (
    <div className="space-y-12">
      <ClimateSection initialData={initialData?.climate} />
      <div className="space-y-6">
        <h3 className="px-4 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">
          Comparaison territoriale intégrée
        </h3>
        <CompareSection />
      </div>
    </div>
  ),
  weather: () => <WeatherSection />,
  messagerie: () => <ConnectSection defaultTab="discussions" />,
  elus: () => <ElusSection />,
} satisfies Record<
  VisibleFinalizedSectionId,
  (
    fundingOnParticipeUrl?: string,
    publicInitialData?: PublicSectionInitialData,
  ) => ReactNode
>;

export function SectionRenderer({
  section,
  fundingOnParticipeUrl,
  publicInitialData,
}: SectionRendererProps) {
  if (section.implementation === "pending") {
    return (
      <PendingSection
        label={section.label}
        description={section.description}
        note={section.pendingNote}
      />
    );
  }

  const renderSection =
    FINALIZED_SECTION_RENDERERS[section.id as VisibleFinalizedSectionId];

  const exposeFundingUrl =
    section.id === "funding"
      ? fundingOnParticipeUrl
      : undefined;

  return <>{renderSection(exposeFundingUrl, publicInitialData)}</>;
}
