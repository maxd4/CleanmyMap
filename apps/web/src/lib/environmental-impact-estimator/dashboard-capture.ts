import { computeEnvironmentalImpactEstimate } from "./service";
import { loadEnvironmentalImpactProjectSignals } from "./project-signals";
import {
  getEnvironmentalImpactSnapshotDate,
  listEnvironmentalImpactSnapshots,
  upsertEnvironmentalImpactSnapshot,
} from "./snapshot-store";
import { ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION } from "./constants";
import type {
  EnvironmentalImpactDashboardResponse,
  EnvironmentalImpactProjectSignals,
  EnvironmentalImpactSnapshotRecord,
} from "./types";
import type { GitHubRepositoryStats } from "@/lib/github/github-repository-stats";
import { loadGitHubRepositoryStats } from "@/lib/github/github-repository-stats";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type EnvironmentalImpactCaptureResult = EnvironmentalImpactDashboardResponse & {
  status: "ok";
  version: string;
};

async function buildLiveEnvironmentalImpactDashboard(params: {
  userId: string | null;
  generatedAt?: string;
  historyLimit?: number;
  githubRepositoryStats?: GitHubRepositoryStats | Promise<GitHubRepositoryStats | null> | null;
}): Promise<EnvironmentalImpactCaptureResult> {
  const generatedAt = params.generatedAt ?? new Date().toISOString();
  const historyLimit = params.historyLimit ?? 8;
  const supabase = getSupabaseServerClient();
  const githubRepositoryStats =
    params.githubRepositoryStats === undefined
      ? await loadGitHubRepositoryStats("maxd4/CleanmyMap")
      : await params.githubRepositoryStats;

  const signals = await loadEnvironmentalImpactProjectSignals(supabase, {
    userId: params.userId,
    generatedAt,
    githubRepositoryStats,
  });

  const model = computeEnvironmentalImpactEstimate({
    generatedAt,
    site: signals.siteInput,
    user: signals.userInput,
    infrastructure: signals.infrastructureInput,
  });

  const snapshots = await listEnvironmentalImpactSnapshots(historyLimit);

  return {
    status: "ok",
    model,
    signals,
    snapshots,
    version: ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION,
  };
}

export function buildEnvironmentalImpactSnapshot(params: {
  model: EnvironmentalImpactDashboardResponse["model"];
  signals: EnvironmentalImpactProjectSignals;
}): EnvironmentalImpactSnapshotRecord {
  return {
    id: `snapshot-${params.model.generatedAt}`,
    snapshotKey: "cleanmymap-project",
    snapshotDate: getEnvironmentalImpactSnapshotDate(params.model.generatedAt),
    generatedAt: params.model.generatedAt,
    version: params.model.version,
    totalKgCo2eProxy: params.model.infrastructure.totalKgCo2eProxy,
    monthlyKgCo2eProxy: params.model.infrastructure.monthlyKgCo2eProxy,
    annualKgCo2eProxy: params.model.infrastructure.annualKgCo2eProxy,
    siteKgCo2eProxy: params.model.site.totalKgCo2eProxy,
    userKgCo2eProxy: params.model.user.totalKgCo2eProxy,
    confidencePercent: params.model.infrastructure.confidencePercent,
    uncertaintyPercent: params.model.infrastructure.uncertaintyPercent,
    launchedAt: params.signals.launchedAt,
    accountCreatedAt: params.signals.accountCreatedAt,
    model: params.model,
    signals: params.signals,
  };
}

export async function captureEnvironmentalImpactDashboard(params: {
  userId: string | null;
  generatedAt?: string;
  historyLimit?: number;
  githubRepositoryStats?: GitHubRepositoryStats | Promise<GitHubRepositoryStats | null> | null;
}): Promise<EnvironmentalImpactCaptureResult> {
  const dashboard = await buildLiveEnvironmentalImpactDashboard(params);
  const snapshot = buildEnvironmentalImpactSnapshot({
    model: dashboard.model,
    signals: dashboard.signals,
  });

  await upsertEnvironmentalImpactSnapshot(snapshot);

  return {
    ...dashboard,
    snapshots: await listEnvironmentalImpactSnapshots(params.historyLimit ?? 8),
  };
}

export async function loadEnvironmentalImpactDashboard(params: {
  userId: string | null;
  generatedAt?: string;
  historyLimit?: number;
  githubRepositoryStats?: GitHubRepositoryStats | Promise<GitHubRepositoryStats | null> | null;
}): Promise<EnvironmentalImpactCaptureResult> {
  const historyLimit = params.historyLimit ?? 8;
  const snapshots = await listEnvironmentalImpactSnapshots(historyLimit);
  const latestSnapshot = snapshots[0] ?? null;

  if (latestSnapshot) {
    return {
      status: "ok",
      model: latestSnapshot.model,
      signals: latestSnapshot.signals,
      snapshots,
      version: latestSnapshot.version,
    };
  }

  return buildLiveEnvironmentalImpactDashboard(params);
}

export async function loadEnvironmentalImpactDashboardSnapshotOnly(params: {
  historyLimit?: number;
}): Promise<EnvironmentalImpactCaptureResult | null> {
  const historyLimit = params.historyLimit ?? 8;
  const snapshots = await listEnvironmentalImpactSnapshots(historyLimit);
  const latestSnapshot = snapshots[0] ?? null;

  if (!latestSnapshot) {
    return null;
  }

  return {
    status: "ok",
    model: latestSnapshot.model,
    signals: latestSnapshot.signals,
    snapshots,
    version: latestSnapshot.version,
  };
}
