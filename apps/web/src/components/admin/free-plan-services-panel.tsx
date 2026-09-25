"use client";

import useSWR from "swr";
import { AdminPanelShell } from "@/components/admin/admin-panel-shell";
import {
  FreePlanErrorState,
  FreePlanLoadingState,
  FreePlanRefreshButton,
  FreePlanServicesDataView,
} from "./free-plan-services-panel.async";
import { swrSupervisionOptions } from "@/lib/swr-config";
import type { ServicesPayload } from "@/lib/dashboard/status";
import type {
  EnvironmentalImpactEstimateModel,
  EnvironmentalImpactSnapshotRecord,
  EnvironmentalImpactProjectSignals,
} from "@/lib/environmental-impact-estimator";
import { buildFreePlanServicesPanelModel } from "./free-plan-services-panel.model";

type FreePlanServicesResponse = {
  status: "ok" | "error";
  model: EnvironmentalImpactEstimateModel;
  signals: EnvironmentalImpactProjectSignals;
  snapshots: EnvironmentalImpactSnapshotRecord[];
  focus?: string;
  error?: string;
  details?: string;
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Erreur API (${response.status}) sur ${url}`);
  }
  return (await response.json()) as T;
};

export function FreePlanServicesPanel() {
  const freePlan = useSWR<FreePlanServicesResponse>(
    ["/api/admin/free-plan-services"],
    () => fetcher<FreePlanServicesResponse>("/api/admin/free-plan-services?historyLimit=8"),
    swrSupervisionOptions,
  );
  const servicesHealth = useSWR<ServicesPayload>(
    ["/api/services"],
    () => fetcher<ServicesPayload>("/api/services"),
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
      headerAction={<FreePlanRefreshButton isRefreshing={isRefreshing} onRefresh={refresh} />}
    >
      {isLoading ? <FreePlanLoadingState /> : null}
      {hasError ? <FreePlanErrorState isRefreshing={isRefreshing} onRetry={refresh} /> : null}
      {!isLoading && !hasError ? (
        <FreePlanServicesDataView panelModel={panelModel} serviceHealth={serviceHealth} />
      ) : null}
    </AdminPanelShell>
  );
}
