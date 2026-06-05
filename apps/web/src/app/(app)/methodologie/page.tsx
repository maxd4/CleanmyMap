import type { Metadata } from "next";
import { loadEnvironmentalImpactDashboard } from "@/lib/environmental-impact-estimator/dashboard-capture";
import { MethodologiePageClient } from "@/components/sections/rubriques/methodologie-page-client";
import type { EnvironmentalImpactInfrastructureServiceEstimate } from "@/lib/environmental-impact-estimator/types";

export const metadata: Metadata = {
  title: "Méthodologie - Comment nous calculons l'impact | CleanMyMap",
  description:
    "Méthodologie de calcul d'impact environnemental de CleanMyMap. Coefficients CO2, eau, valorisation des déchets. Transparence complète sur les métriques d'action citoyenne.",
  keywords: [
    "méthodologie",
    "calcul impact",
    "CO2 avoided",
    "empreinte carbone",
    "valorisation déchets",
    "impact environnemental",
    "transparence",
    "écologie",
    "développement durable",
  ],
  alternates: {
    canonical: "/methodologie",
  },
};

export const dynamic = "force-dynamic";

export default async function MethodologiePage() {
  let freePlanServices: EnvironmentalImpactInfrastructureServiceEstimate[] = [];

  try {
    const dashboard = await loadEnvironmentalImpactDashboard({
      userId: null,
      historyLimit: 1,
    });

    freePlanServices = dashboard.model.infrastructure.services;
  } catch (error) {
    console.error("[MethodologiePage] Failed to load public impact services", error);
  }

  return (
    <MethodologiePageClient
      freePlanServices={freePlanServices}
      impactTotals={{
        monthlyKgCo2eProxy: dashboard.model.infrastructure.monthlyKgCo2eProxy ?? null,
        annualKgCo2eProxy: dashboard.model.infrastructure.annualKgCo2eProxy ?? null,
        totalKgCo2eProxy: dashboard.model.infrastructure.totalKgCo2eProxy ?? null,
        generatedAt: dashboard.model.infrastructure.generatedAt ?? null,
      }}
    />
  );
}
