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
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type EnvironmentalImpactCaptureResult = EnvironmentalImpactDashboardResponse & {
  status: "ok";
  version: string;
};

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
}): Promise<EnvironmentalImpactCaptureResult> {
  const generatedAt = params.generatedAt ?? new Date().toISOString();
  const historyLimit = params.historyLimit ?? 8;
  const supabase = getSupabaseServerClient();

  const signals = await loadEnvironmentalImpactProjectSignals(supabase, {
    userId: params.userId,
    generatedAt,
  });

  const model = computeEnvironmentalImpactEstimate({
    generatedAt,
    site: signals.siteInput,
    user: signals.userInput,
    infrastructure: signals.infrastructureInput,
  });

  const snapshot = buildEnvironmentalImpactSnapshot({ model, signals });
  await upsertEnvironmentalImpactSnapshot(snapshot);
  const snapshots = await listEnvironmentalImpactSnapshots(historyLimit);

  return {
    status: "ok",
    model,
    signals,
    snapshots,
    version: ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION,
  };
}
