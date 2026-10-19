"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AdminPanelShell } from "@/components/admin/admin-panel-shell";
import { CmmButton } from "@/components/ui/cmm-button";
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

function StorageUsagePanelPrompt({ onOpen }: { onOpen: () => void }) {
  return (
    <AdminPanelShell
      title="Stockage Supabase"
      subtitle="La consommation, l'historique et les détails du stockage sont chargés lorsque vous consultez ce panneau."
    >
      <CmmButton type="button" tone="primary" variant="pill" onClick={onOpen}>
        Consulter l&apos;utilisation du stockage
      </CmmButton>
    </AdminPanelShell>
  );
}

export function DeferredStorageUsagePanel() {
  const [hasOpened, setHasOpened] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  if (!hasOpened) {
    return (
      <StorageUsagePanelPrompt
        onOpen={() => {
          setHasOpened(true);
          setIsOpen(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-[720px] space-y-4">
      {!isOpen ? (
        <StorageUsagePanelPrompt onOpen={() => setIsOpen(true)} />
      ) : null}
      <div hidden={!isOpen}>
        <div className="mb-4 flex justify-end">
          <CmmButton type="button" tone="tertiary" variant="pill" onClick={() => setIsOpen(false)}>
            Masquer l&apos;utilisation du stockage
          </CmmButton>
        </div>
        <DeferredStorageUsagePanelComponent />
      </div>
    </div>
  );
}
