"use client";

import type { ReactNode } from "react";
import {
  type VisibleFinalizedSectionId,
  type SectionRubriqueDefinition,
} from "@/lib/sections-registry";
import { CommunitySection } from "./community";
import { FeedbackSection } from "./feedback";
import { ActorsSection } from "./actors-section";
import { GamificationSection } from "./gamification";
import { AnnuaireSection } from "./annuaire";
import { ElusSection } from "./elus-section";
import { FundingSection } from "./funding-section";
import { OpenDataSection } from "./open-data-section";
import {
  ClimateSection,
  CompareSection,
  CompostSection,
  RecyclingSection,
  SandboxSection,
  TrashSpotterSection,
  WeatherSection,
  JoinFormSection,
} from "./terrain-sections";
import { ConnectSection } from "./connect-section";
import { PendingSection } from "./shared";
import { RouteSection } from "./route";

type SectionRendererProps = {
  section: SectionRubriqueDefinition;
};

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
  sandbox: () => <SandboxSection />,
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
