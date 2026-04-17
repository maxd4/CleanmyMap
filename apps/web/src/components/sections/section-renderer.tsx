"use client";

import {
  getSectionRubriqueById,
  type FinalizedSectionId,
  type SectionId,
} from "@/lib/sections-registry";
import { CommunitySection } from "@/components/sections/rubriques/community-section";
import {
  ActorsSection,
  GamificationSection,
} from "@/components/sections/rubriques/engagement-sections";
import { AnnuaireSection } from "@/components/sections/rubriques/annuaire-section";
import { ElusSection } from "@/components/sections/rubriques/elus-section";
import {
  ClimateSection,
  CompareSection,
  GuideSection,
  KitSection,
  RecyclingSection,
  RouteSection,
  SandboxSection,
  TrashSpotterSection,
  WeatherSection,
} from "@/components/sections/rubriques/terrain-sections";
import {
  NotFoundSection,
  PendingSection,
  SectionShell,
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
        note={sectionDefinition.pendingNote}
      />
    );
  }

  const finalizedSectionId = sectionDefinition.id as FinalizedSectionId;

  switch (finalizedSectionId) {
    case "community":
      return (
        <SectionShell
          title={{ fr: "Rassemblements & Agenda", en: "Meetups & Agenda" }}
          subtitle={{
            fr: "Coordination des actions collectives, calendrier et inscriptions.",
            en: "Collective actions coordination, calendar and sign-ups.",
          }}
          links={[
            {
              href: "/actions/new",
              label: { fr: "Nouvelle action", en: "New action" },
            },
          ]}
        >
          <CommunitySection />
        </SectionShell>
      );
    case "gamification":
      return (
        <SectionShell
          title={{ fr: "Classement", en: "Leaderboard" }}
          subtitle={{
            fr: "Classement benevole base sur les actions validees.",
            en: "Volunteer ranking based on validated actions.",
          }}
          links={[
            {
              href: "/actions/history",
              label: { fr: "Voir historique", en: "Open history" },
            },
          ]}
        >
          <GamificationSection />
        </SectionShell>
      );
    case "actors":
      return (
        <SectionShell
          title={{ fr: "Partenaires", en: "Partners" }}
          subtitle={{
            fr: "Vue du reseau local et des zones prioritaires.",
            en: "Local partner network and priority areas.",
          }}
          links={[
            {
              href: "/sections/elus",
              label: { fr: "Vue collectivites", en: "Authorities view" },
            },
          ]}
        >
          <ActorsSection />
        </SectionShell>
      );
    case "annuaire":
      return (
        <SectionShell
          title={{ fr: "Annuaire de l'Engagement", en: "Engagement Directory" }}
          subtitle={{
            fr: "Découvrez les top associations, commerces et groupes de paroles locaux.",
            en: "Discover top local associations, businesses, and counseling groups.",
          }}
          links={[
            {
              href: "/actions/new",
              label: { fr: "Rejoindre", en: "Join in" },
            },
          ]}
        >
          <AnnuaireSection />
        </SectionShell>
      );
    case "trash-spotter":
      return (
        <SectionShell
          title={{ fr: "Trash Spotter", en: "Trash Spotter" }}
          subtitle={{
            fr: "Signalement, visualisation et priorisation geolocalisee.",
            en: "Reporting, visualization and geospatial prioritization.",
          }}
          links={[
            {
              href: "/actions/new",
              label: { fr: "Declarer une action", en: "Declare action" },
            },
            {
              href: "/actions/map",
              label: { fr: "Carte complete", en: "Full map" },
            },
          ]}
        >
          <TrashSpotterSection />
        </SectionShell>
      );
    case "route":
      return (
        <SectionShell
          title={{ fr: "Itineraire IA", en: "AI routing" }}
          subtitle={{
            fr: "Preparation d'un plan de passage priorise par impact.",
            en: "Prepare an impact-prioritized route.",
          }}
          links={[
            {
              href: "/actions/map",
              label: { fr: "Verifier sur la carte", en: "Check on map" },
            },
          ]}
        >
          <RouteSection />
        </SectionShell>
      );
    case "recycling":
      return (
        <SectionShell
          title={{ fr: "Seconde vie", en: "Recycling" }}
          subtitle={{
            fr: "Consignes de tri et valorisation terrain.",
            en: "Field sorting and reuse guidance.",
          }}
          links={[
            {
              href: "/reports",
              label: { fr: "Exporter les donnees", en: "Export data" },
            },
          ]}
        >
          <RecyclingSection />
        </SectionShell>
      );
    case "climate":
      return (
        <SectionShell
          title={{ fr: "Climat", en: "Climate" }}
          subtitle={{
            fr: "Indicateurs derives des actions validees.",
            en: "Indicators derived from validated actions.",
          }}
          links={[
            { href: "/reports", label: { fr: "Reporting", en: "Reporting" } },
          ]}
        >
          <ClimateSection />
        </SectionShell>
      );
    case "weather":
      return (
        <SectionShell
          title={{ fr: "Meteo", en: "Weather" }}
          subtitle={{
            fr: "Conditions courantes pour securiser les operations.",
            en: "Current conditions to secure field operations.",
          }}
          links={[
            {
              href: "/actions/new",
              label: { fr: "Planifier une action", en: "Plan action" },
            },
          ]}
        >
          <WeatherSection />
        </SectionShell>
      );
    case "compare":
      return (
        <SectionShell
          title={{ fr: "Comparaison", en: "Comparison" }}
          subtitle={{
            fr: "Comparaison des zones selon les actions geolocalisees.",
            en: "Area comparison from geolocated actions.",
          }}
          links={[{ href: "/actions/map", label: { fr: "Carte", en: "Map" } }]}
        >
          <CompareSection />
        </SectionShell>
      );
    case "guide":
      return (
        <SectionShell
          title={{ fr: "Guide pratique", en: "Practical guide" }}
          subtitle={{
            fr: "Workflow web conseille pour une collecte fiable.",
            en: "Recommended workflow for reliable data collection.",
          }}
          links={[
            { href: "/actions/new", label: { fr: "Commencer", en: "Start" } },
            {
              href: "/actions/history",
              label: { fr: "Verifier", en: "Review" },
            },
          ]}
        >
          <GuideSection />
        </SectionShell>
      );
    case "kit":
      return (
        <SectionShell
          title={{ fr: "Kit terrain", en: "Field kit" }}
          subtitle={{
            fr: "Preparation materiel et checklist operationnelle benevole.",
            en: "Volunteer equipment and operational checklist.",
          }}
          links={[
            {
              href: "/sections/guide",
              label: { fr: "Voir le guide", en: "Open guide" },
            },
          ]}
        >
          <KitSection />
        </SectionShell>
      );
    case "sandbox":
      return (
        <SectionShell
          title={{ fr: "Sandbox", en: "Sandbox" }}
          subtitle={{
            fr: "Zone de verification technique et supervision instantanee.",
            en: "Technical verification and supervision workspace.",
          }}
          links={[
            {
              href: "/dashboard",
              label: {
                fr: "Retour au tableau de bord",
                en: "Back to dashboard",
              },
            },
          ]}
        >
          <SandboxSection />
        </SectionShell>
      );
    case "elus":
      return (
        <SectionShell
          title={{ fr: "Collectivites", en: "Local authorities" }}
          subtitle={{
            fr: "Observatoire municipal: KPI territoriaux et priorisation des zones.",
            en: "Municipal observatory: territorial KPIs and area prioritization.",
          }}
          links={[
            {
              href: "/reports",
              label: { fr: "Acces au reporting", en: "Open reporting" },
            },
          ]}
        >
          <ElusSection />
        </SectionShell>
      );
    default: {
      const exhaustiveCheck: never = finalizedSectionId;
      return <NotFoundSection key={exhaustiveCheck} />;
    }
  }
}
