"use client";

import useSWR from "swr";
import { AdminPanelShell } from "@/components/admin/admin-panel-shell";
import {
  FreePlanErrorState,
  FreePlanLoadingState,
  FreePlanServicesDataView,
} from "./free-plan-services-panel.async";
import { AsyncPanelRefreshButton } from "@/components/ui/async-panel-controls";
import { swrSupervisionOptions } from "@/lib/swr-config";
import type { ServicesPayload } from "@/lib/dashboard/status";
import type {
  EnvironmentalImpactEstimateModel,
  EnvironmentalImpactSnapshotRecord,
  EnvironmentalImpactProjectSignals,
} from "@/lib/environmental-impact-estimator";
import { buildFreePlanServicesPanelModel } from "./free-plan-services-panel.model";
import { fetchJson } from "@/lib/http/fetch-json";

type FreePlanServicesResponse = {
  status: "ok" | "error";
  model: EnvironmentalImpactEstimateModel;
  signals: EnvironmentalImpactProjectSignals;
  snapshots: EnvironmentalImpactSnapshotRecord[];
  focus?: string;
  error?: string;
  details?: string;
};

export function FreePlanServicesPanel() {
  const freePlan = useSWR<FreePlanServicesResponse>(
    ["/api/admin/free-plan-services"],
    () => fetchJson<FreePlanServicesResponse>("/api/admin/free-plan-services?historyLimit=8", { method: "GET" }),
    swrSupervisionOptions,
  );
  const servicesHealth = useSWR<ServicesPayload>(
    ["/api/services"],
    () => fetchJson<ServicesPayload>("/api/services", { method: "GET" }),
    swrSupervisionOptions,
  );

  const isLoading = freePlan.isLoading || servicesHealth.isLoading;
  const isRefreshing = freePlan.isValidating || servicesHealth.isValidating;
  const hasError = Boolean(freePlan.error || servicesHealth.error);
  const serviceHealth = servicesHealth.data?.services ?? {};
  const panelModel = buildFreePlanServicesPanelModel({
    services: freePlan.data?.model.infrastructure.services ?? [],
    snapshots: freePlan.data?.snapshots ?? [],
    generatedAt: freePlan.data?.model.generatedAt ?? null,
    serviceHealth,
  });
  const refresh = () => {
    void freePlan.mutate();
    void servicesHealth.mutate();
  };

  return (
    <AdminPanelShell
      title="Plans gratuits surveillés"
      subtitle="Fiche de pilotage des coûts proxy, du quota gratuit et des dérives mensuelles pour Vercel, Supabase, Resend et les autres services externes."
      headerAction={<AsyncPanelRefreshButton isRefreshing={isRefreshing} onRefresh={refresh} />}
    >
      {isLoading ? <FreePlanLoadingState /> : null}
      {hasError ? <FreePlanErrorState isRefreshing={isRefreshing} onRetry={refresh} /> : null}
      {!isLoading && !hasError ? (
        <FreePlanServicesDataView panelModel={panelModel} serviceHealth={serviceHealth} />
      ) : null}
    </AdminPanelShell>
  );
}
