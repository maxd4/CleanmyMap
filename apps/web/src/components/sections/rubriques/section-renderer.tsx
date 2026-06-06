"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import {
  type VisibleFinalizedSectionId,
  type SectionRubriqueDefinition,
} from "@/lib/sections-registry";
import { PendingSection } from "./shared";
import { RouteSection } from "./route";

type SectionRendererProps = {
  section: SectionRubriqueDefinition;
};

const CommunitySection = dynamic(() =>
  import("./community").then((module) => module.CommunitySection),
);
const FeedbackSection = dynamic(() =>
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
  import("./compost-section").then((module) => module.CompostSection),
);
const ClimateSection = dynamic(() =>
  import("./climate-section").then((module) => module.ClimateSection),
);
const CompareSection = dynamic(() =>
  import("./compare-section").then((module) => module.CompareSection),
);
const WeatherSection = dynamic(() =>
  import("./weather-section").then((module) => module.WeatherSection),
);
const JoinFormSection = dynamic(() =>
  import("./rejoindre-un-formulaire-section").then((module) => module.JoinFormSection),
);
const ConnectSection = dynamic(() =>
  import("./connect-section").then((module) => module.ConnectSection),
);

export const FINALIZED_SECTION_RENDERERS = {
  community: () => <CommunitySection />,
  feedback: () => <FeedbackSection />,
  gamification: () => <GamificationSection />,
  actors: () => <ActorsSection />,
  annuaire: () => <AnnuaireSection />,
  "open-data": () => (
    <div className="space-y-12">
      <OpenDataSection />
      <FundingSection />
    </div>
  ),
  funding: () => <FundingSection />,
  "trash-spotter": () => <TrashSpotterSection />,
  route: () => <RouteSection />,
  "rejoindre-un-formulaire": () => <JoinFormSection />,
  recycling: () => <RecyclingSection />,
  compost: () => <CompostSection />,
  climate: () => (
    <div className="space-y-12">
      <ClimateSection />
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
} satisfies Record<VisibleFinalizedSectionId, () => ReactNode>;

export function SectionRenderer({ section }: SectionRendererProps) {
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

  return <>{renderSection()}</>;
}
