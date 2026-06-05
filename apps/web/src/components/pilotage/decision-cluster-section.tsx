"use client";

import { DecisionReadingSection } from "@/components/pilotage/decision-reading-section";
import type { PilotageClusterLink } from "@/components/pilotage/pilotage-cluster-panels";
import type { Locale } from "@/lib/ui/preferences";

export type DecisionClusterSurfaceId = "dashboard" | "pilotage" | "sponsor" | "governance";

type DecisionClusterSectionProps = {
  locale: Locale;
  surfaceId: DecisionClusterSurfaceId;
  className?: string;
};

const SURFACE_VARIANTS: Record<DecisionClusterSurfaceId, "pilotage" | "sponsor" | "governance"> = {
  dashboard: "pilotage",
  pilotage: "pilotage",
  sponsor: "sponsor",
  governance: "governance",
};

const ACTIVE_LINK_BY_SURFACE: Record<DecisionClusterSurfaceId, PilotageClusterLink["id"]> = {
  dashboard: "dashboard",
  pilotage: "pilotage",
  sponsor: "sponsor-portal",
  governance: "elus",
};

function buildDecisionClusterLinks(locale: Locale): PilotageClusterLink[] {
  return [
    {
      id: "dashboard",
      href: "/dashboard",
      label: locale === "fr" ? "Mon espace" : "Dashboard",
      description:
        locale === "fr"
          ? "KPI, profil et actions rapides du quotidien."
          : "KPIs, profile and daily quick actions.",
    },
    {
      id: "pilotage",
      href: "/pilotage",
      label: locale === "fr" ? "Pilotage" : "Pilotage",
      description:
        locale === "fr"
          ? "Synthèse transverse, méthodes et recommandations."
          : "Transverse summary, methods and recommendations.",
    },
    {
      id: "sponsor-portal",
      href: "/sponsor-portal",
      label: locale === "fr" ? "Portail décideur" : "Decision portal",
      description:
        locale === "fr"
          ? "ROI, impact territorial et lecture institutionnelle."
          : "ROI, territorial impact and institutional reading.",
    },
    {
      id: "elus",
      href: "/sections/elus",
      label: locale === "fr" ? "Gouvernance" : "Governance",
      description:
        locale === "fr"
          ? "Priorités, méthode et arbitrage territorial."
          : "Priorities, method and territorial arbitration.",
    },
  ];
}

export function DecisionClusterSection({
  locale,
  surfaceId,
  className,
}: DecisionClusterSectionProps) {
  const links = buildDecisionClusterLinks(locale);
  const variant = SURFACE_VARIANTS[surfaceId];

  return (
    <DecisionReadingSection
      variant={variant}
      eyebrow={locale === "fr" ? "Cluster commun" : "Shared cluster"}
      title={
        locale === "fr"
          ? "Mon espace, Pilotage, Portail décideur et Gouvernance"
          : "Dashboard, pilotage, decision portal and governance"
      }
      description={
        locale === "fr"
          ? "Les quatre surfaces partagent les mêmes repères de lecture: synthèse rapide, arbitrage adapté au rôle, puis bascule vers la bonne page."
          : "The four surfaces share the same reading pattern: quick synthesis, role-aware arbitration, then a jump to the right page."
      }
      links={links}
      activeLinkId={ACTIVE_LINK_BY_SURFACE[surfaceId]}
      className={className}
    />
  );
}
