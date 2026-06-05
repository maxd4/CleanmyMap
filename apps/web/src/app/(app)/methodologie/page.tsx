import type { Metadata } from "next";
import { loadEnvironmentalImpactDashboard } from "@/lib/environmental-impact-estimator/dashboard-capture";
import { loadGitHubRepositoryStats } from "@/lib/github/github-repository-stats";
import { MethodologiePageClient } from "@/components/sections/rubriques/methodologie-page-client";
import type {
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactSnapshotRecord,
} from "@/lib/environmental-impact-estimator/types";
import type { GitHubRepositoryStats } from "@/lib/github/github-repository-stats";

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
  let impactSnapshots: EnvironmentalImpactSnapshotRecord[] = [];
  let githubStats: GitHubRepositoryStats | null = null;
  let impactTotals = {
    monthlyKgCo2eProxy: null as number | null,
    annualKgCo2eProxy: null as number | null,
    totalKgCo2eProxy: null as number | null,
    generatedAt: null as string | null,
  };
  let impactGeneratedAt: string | null = null;
  let impactLaunchedAt: string | null = null;

  try {
    const dashboard = await loadEnvironmentalImpactDashboard({
      userId: null,
      historyLimit: 24,
    });

    freePlanServices = dashboard.model.infrastructure.services;
    impactTotals = {
      monthlyKgCo2eProxy: dashboard.model.infrastructure.monthlyKgCo2eProxy ?? null,
      annualKgCo2eProxy: dashboard.model.infrastructure.annualKgCo2eProxy ?? null,
      totalKgCo2eProxy: dashboard.model.infrastructure.totalKgCo2eProxy ?? null,
      generatedAt: dashboard.model.infrastructure.generatedAt ?? null,
    };
    impactSnapshots = dashboard.snapshots;
    impactGeneratedAt = dashboard.model.infrastructure.generatedAt ?? dashboard.signals.generatedAt;
    impactLaunchedAt = dashboard.model.infrastructure.launchedAt ?? dashboard.signals.launchedAt;
  } catch (error) {
    console.error("[MethodologiePage] Failed to load public impact services", error);
  }

  try {
    githubStats = await loadGitHubRepositoryStats("maxd4/CleanmyMap");
  } catch (error) {
    console.error("[MethodologiePage] Failed to load GitHub repository stats", error);
  }

  return (
    <MethodologiePageClient
      freePlanServices={freePlanServices}
      impactTotals={impactTotals}
      impactSnapshots={impactSnapshots}
      impactGeneratedAt={impactGeneratedAt}
      impactLaunchedAt={impactLaunchedAt}
      githubStats={githubStats}
    />
  );
}
