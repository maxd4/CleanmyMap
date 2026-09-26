"use client";

import useSWR from "swr";
import { AdminPanelShell } from "@/components/admin/admin-panel-shell";
import {
  StorageErrorState,
  StorageLoadingState,
} from "./storage-usage-panel.async";
import { AsyncPanelRefreshButton } from "@/components/ui/async-panel-controls";
import { StorageUsageDataView } from "./storage-usage-panel.data";
import { swrRecentViewOptions } from "@/lib/swr-config";
import {
  buildStorageUsageViewModel,
  type StorageUsageResponse,
} from "@/lib/dashboard/storage-usage-view-model";
import { fetchJson } from "@/lib/http/fetch-json";

export function StorageUsagePanel() {
  const usage = useSWR<StorageUsageResponse>(
    ["/api/admin/storage-usage"],
    () => fetchJson<StorageUsageResponse>("/api/admin/storage-usage", { method: "GET", cache: "no-store" }),
    swrRecentViewOptions,
  );

  const isLoading = usage.isLoading;
  const isRefreshing = usage.isValidating;
  const hasError = Boolean(usage.error);
  const { chartData, comparisonData } = buildStorageUsageViewModel(usage.data);
  const current = usage.data?.current ?? null;
  const cron = usage.data?.cron ?? null;
  const warnings = usage.data?.warnings ?? [];
  const statusTone =
    current && current.usagePercent >= 100
      ? "text-rose-400"
      : current && current.usagePercent >= 80
        ? "text-amber-300"
        : "text-emerald-300";
  const currentStateLabel =
    current && current.usagePercent >= 100
      ? "Dépassé"
      : current && current.usagePercent >= 80
        ? "Vigilance"
        : "Stable";
  const refresh = () => {
    void usage.mutate();
  };

  return (
    <AdminPanelShell
      title="Stockage Supabase"
      subtitle="Vue quota, consommation, historique mensuel et contribution métier du stockage."
      headerAction={<AsyncPanelRefreshButton isRefreshing={isRefreshing} onRefresh={refresh} />}
    >
      {isLoading ? <StorageLoadingState /> : null}
      {hasError ? <StorageErrorState isRefreshing={isRefreshing} onRetry={refresh} /> : null}
      {!isLoading && !hasError && current ? (
        <StorageUsageDataView
          data={usage.data}
          current={current}
          cron={cron}
          warnings={warnings}
          statusTone={statusTone}
          currentStateLabel={currentStateLabel}
          chartData={chartData}
          comparisonData={comparisonData}
        />
      ) : null}
    </AdminPanelShell>
  );
}
