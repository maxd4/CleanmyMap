"use client";

import {
  getSectionRubriqueById,
  type FinalizedSectionId,
  type SectionId,
} from "@/lib/sections-registry";
import { CommunitySection } from "@/components/sections/rubriques/community-section";
import { FeedbackSection } from "@/components/sections/rubriques/feedback-section";
import {
  ActorsSection,
  GamificationSection,
} from "@/components/sections/rubriques/engagement-sections";
import { AnnuaireSection } from "@/components/sections/rubriques/annuaire-section";
import { ElusSection } from "@/components/sections/rubriques/elus-section";
import { FundingSection } from "@/components/sections/rubriques/funding-section";
import { OpenDataSection } from "@/components/sections/rubriques/open-data-section";
import {
  ClimateSection,
  CompareSection,
  CompostSection,
  GuideSection,
  RecyclingSection,
  RouteSection,
  SandboxSection,
  TrashSpotterSection,
  WeatherSection,
} from "@/components/sections/rubriques/terrain-sections";
import { ConnectSection } from "@/components/sections/rubriques/connect-section";
import {
  NotFoundSection,
  PendingSection,
  type L10n,
} from "@/components/sections/rubriques/shared";

type SectionRendererProps = {
  sectionId: SectionId;
};

export function SectionRenderer({ sectionId }: SectionRendererProps) {
  const sectionDefinition = getSectionRubriqueById(sectionId) as
    | {
        id: string;
        implementation: "finalized" | "pending";
        label: L10n;
        description: L10n;
        pendingNote?: L10n;
      }
    | undefined;

  if (!sectionDefinition) {
    return <NotFoundSection />;
  }

  if (sectionDefinition.implementation === "pending") {
    return (
      <PendingSection
        label={sectionDefinition.label}
        description={sectionDefinition.description}
        note={sectionDefinition.pendingNote}
      />
    );
  }

  const finalizedSectionId = sectionDefinition.id as FinalizedSectionId;

  switch (finalizedSectionId) {
    case "community":
      return <CommunitySection />;
    case "feedback":
      return <FeedbackSection />;
    case "gamification":
      return <GamificationSection />;
    case "actors":
      return <ActorsSection />;
    case "annuaire":
      return <AnnuaireSection />;
    case "open-data":
      return (
        <div className="space-y-12">
          <OpenDataSection />
          <FundingSection />
        </div>
      );
    case "funding":
      return <FundingSection />;
    case "trash-spotter":
      return <TrashSpotterSection />;
    case "route":
      return <RouteSection />;
    case "recycling":
      return <RecyclingSection />;
    case "compost":
      return <CompostSection />;
    case "climate":
      return (
        <div className="space-y-12">
          <ClimateSection />
          <div className="space-y-6">
            <h3 className="px-4 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">
              Comparaison territoriale intégrée
            </h3>
            <CompareSection />
          </div>
        </div>
      );
    case "weather":
      return <WeatherSection />;
    case "sandbox":
      return <SandboxSection />;
    case "guide":
      return <GuideSection />;
    case "dm":
      return <ConnectSection defaultTab="dm" />;
    case "messagerie":
      return <ConnectSection defaultTab="discussions" />;
    case "elus":
      return <ElusSection />;
    default: {
      const exhaustiveCheck: never = finalizedSectionId;
      return <NotFoundSection key={exhaustiveCheck} />;
    }
  }
}
