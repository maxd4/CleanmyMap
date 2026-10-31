import { buildElectricityEstimate } from "@/lib/environmental-impact-estimator/services/electricity";
import { buildWaterEstimate } from "@/lib/environmental-impact-estimator/services/water";
import { loadEnvironmentalImpactDashboardSnapshotOnly } from "@/lib/environmental-impact-estimator/dashboard-capture";
import { loadGitHubRepositoryStats } from "@/lib/github/github-repository-stats";
import type {
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactPublicSnapshotPoint,
} from "@/lib/environmental-impact-estimator/types";
import type { GitHubRepositoryStats } from "@/lib/github/github-repository-stats";
import type { PublicLandingActionAggregation } from "@/lib/accueil/action-participant-aggregation";
import { loadLatestPublicImpactSnapshot } from "@/lib/impact/public-impact-snapshot";

export type MethodologiePageData = {
  freePlanServices: EnvironmentalImpactInfrastructureServiceEstimate[];
  impactSnapshots: EnvironmentalImpactPublicSnapshotPoint[];
  impactTotals: {
    monthlyKgCo2eProxy: number | null;
    annualKgCo2eProxy: number | null;
    totalKgCo2eProxy: number | null;
    generatedAt: string | null;
  };
  impactGeneratedAt: string | null;
  impactLaunchedAt: string | null;
  impactTerrainResults: PublicLandingActionAggregation | null;
  impactTerrainGeneratedAt: string | null;
  impactTerrainMethodologyVersion: string | null;
  impactElectricity: ReturnType<typeof buildElectricityEstimate>;
  impactWater: ReturnType<typeof buildWaterEstimate>;
  githubStats: GitHubRepositoryStats | null;
};

function createEmptyMethodologiePageData(): Omit<MethodologiePageData, "githubStats"> {
  return {
    freePlanServices: [],
    impactSnapshots: [],
    impactTotals: {
      monthlyKgCo2eProxy: null,
      annualKgCo2eProxy: null,
      totalKgCo2eProxy: null,
      generatedAt: null,
    },
    impactGeneratedAt: null,
    impactLaunchedAt: null,
    impactTerrainResults: null,
    impactTerrainGeneratedAt: null,
    impactTerrainMethodologyVersion: null,
    impactElectricity: buildElectricityEstimate({ monthlyElectricityKwh: null }, null),
    impactWater: buildWaterEstimate({
      monthlyElectricityKwh: null,
      monthlyDirectWaterConsumptionLiters: null,
      monthlyEvaporatedWaterLiters: null,
    }),
  };
}

async function loadInfrastructureData(
  data: Omit<MethodologiePageData, "githubStats">,
): Promise<void> {
  try {
    const dashboard = await loadEnvironmentalImpactDashboardSnapshotOnly({ historyLimit: 24 });
    if (!dashboard) return;
    data.freePlanServices = dashboard.model.infrastructure.services;
    data.impactTotals = {
      monthlyKgCo2eProxy: dashboard.model.infrastructure.monthlyKgCo2eProxy ?? null,
      annualKgCo2eProxy: dashboard.model.infrastructure.annualKgCo2eProxy ?? null,
      totalKgCo2eProxy: dashboard.model.infrastructure.totalKgCo2eProxy ?? null,
      generatedAt: dashboard.model.infrastructure.generatedAt ?? null,
    };
    data.impactElectricity = dashboard.model.methodology?.electricity ?? data.impactElectricity;
    data.impactWater = dashboard.model.methodology?.water ?? dashboard.model.infrastructure?.water ?? data.impactWater;
    data.impactSnapshots = dashboard.snapshots.map(({ snapshotDate, monthlyKgCo2eProxy }) => ({
      snapshotDate,
      monthlyKgCo2eProxy,
    }));
    data.impactGeneratedAt = dashboard.model.infrastructure.generatedAt ?? dashboard.signals.generatedAt;
    data.impactLaunchedAt = dashboard.model.infrastructure.launchedAt ?? dashboard.signals.launchedAt;
  } catch (error) {
    console.error("[MethodologiePage] Failed to load public impact services", error);
  }
}

async function loadTerrainData(data: Omit<MethodologiePageData, "githubStats">): Promise<void> {
  try {
    const snapshot = await loadLatestPublicImpactSnapshot();
    data.impactTerrainResults = snapshot?.payload.kpis ?? null;
    data.impactTerrainGeneratedAt = snapshot?.generatedAt ?? null;
    data.impactTerrainMethodologyVersion = snapshot?.payload.methodologyVersion ?? null;
  } catch (error) {
    console.error("[MethodologiePage] Failed to load monthly public terrain snapshot", error);
  }
}

export async function loadMethodologiePageData(): Promise<MethodologiePageData> {
  const data = createEmptyMethodologiePageData();
  const githubStatsPromise = loadGitHubRepositoryStats("maxd4/CleanmyMap", {
    revalidateSeconds: 86400,
  }).catch((error) => {
    console.error("[MethodologiePage] Failed to load GitHub repository stats", error);
    return null;
  });
  await Promise.all([loadInfrastructureData(data), loadTerrainData(data)]);
  return { ...data, githubStats: await githubStatsPromise };
}
