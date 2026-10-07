"use client";

import dynamic from "next/dynamic";
import { AdminPanelShell } from "@/components/admin/admin-panel-shell";
import { useInViewOnce } from "@/components/ui/use-in-view-once";
import { StorageLoadingState } from "./storage-usage-panel.async";

const DeferredStorageUsagePanelComponent = dynamic(
  () =>
    import("./storage-usage-panel").then(
      (module) => module.StorageUsagePanel,
    ),
  {
    ssr: false,
    loading: () => <StorageUsagePanelLoadingState />,
  },
);

function StorageUsagePanelLoadingState() {
  return (
    <AdminPanelShell
      title="Stockage Supabase"
      subtitle="Vue quota, consommation, historique mensuel et contribution métier du stockage."
    >
      <StorageLoadingState />
    </AdminPanelShell>
  );
}

export function DeferredStorageUsagePanel() {
  const { ref, isInView } = useInViewOnce<HTMLDivElement>({
    rootMargin: "320px 0px",
  });

  return (
    <div ref={ref} className="min-h-[720px]">
      {isInView ? (
        <DeferredStorageUsagePanelComponent />
      ) : (
        <StorageUsagePanelLoadingState />
      )}
    </div>
  );
}
